// WebSocket SSH Service - Real SSH connections via proxy server
import { io, Socket } from 'socket.io-client';
import { FileSystemInterface, FileItem } from './FileSystemInterface';
import { SSHCredentials } from './SecureCredentialStore';

class WebSocketSSHService implements FileSystemInterface {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private currentPath: string = '/';
  private connectionInfo: any = null;
  private readonly serverUrl: string;

  constructor(serverUrl?: string) {
    // Auto-detect server URL for different environments
    if (serverUrl) {
      this.serverUrl = serverUrl;
    } else {
      // Use local IP for Expo development
      this.serverUrl = 'http://10.189.47.166:3001';
    }
  }

  /**
   * Connect to SSH server via WebSocket proxy
   */
  async connect(credentials: SSHCredentials): Promise<boolean> {
    try {
      console.log(`🔌 Initializing WebSocket connection to ${this.serverUrl}`);
      console.log(`🔑 Connecting with credentials:`, {
        host: credentials.host,
        port: credentials.port,
        username: credentials.username,
        hasPassword: !!credentials.password,
        hasPrivateKey: !!credentials.privateKey,
        initialPath: credentials.initialPath
      });

      // Initialize Socket.IO connection to proxy server
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
      });

      console.log(`Connecting to SSH proxy server at ${this.serverUrl}`);

      // Set up socket event handlers
      this.setupSocketHandlers();

      // Wait for socket connection to proxy server
      await this.waitForSocketConnection();

      console.log('Connected to SSH proxy server, attempting SSH connection...');

      // Attempt SSH connection via proxy
      const sshConnected = await this.connectSSH(credentials);

      if (sshConnected) {
        this.connected = true;
        this.currentPath = credentials.initialPath || `/home/${credentials.username}`;
        this.connectionInfo = {
          host: credentials.host,
          username: credentials.username,
          currentPath: this.currentPath,
        };

        console.log(`SSH connected successfully to ${credentials.host}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('WebSocket SSH connection error:', error);
      this.cleanup();
      throw error;
    }
  }

  private streamingCallback: ((type: 'stdout' | 'stderr', data: string) => void) | null = null;

  setStreamingCallback(callback: (type: 'stdout' | 'stderr', data: string) => void): void {
    this.streamingCallback = callback;
  }

  private setupSocketHandlers(): void {
    if (!this.socket) return;

    // Handle real-time command output
    this.socket.on('ssh:command:output', (data: { type: 'stdout' | 'stderr', data: string }) => {
      if (this.streamingCallback) {
        this.streamingCallback(data.type, data.data);
      }
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to SSH proxy server');
      console.log('🔗 Socket ID:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from SSH proxy server:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      console.error('❌ Error type:', error.type);
      console.error('❌ Error description:', error.description);
      console.error('❌ Full error:', JSON.stringify(error));
    });

    this.socket.on('ssh:connected', () => {
      console.log('✅ SSH connection established via proxy');
    });

    this.socket.on('ssh:disconnected', () => {
      console.log('❌ SSH connection closed via proxy');
      this.connected = false;
    });

    this.socket.on('ssh:error', (error: string) => {
      console.error('❌ SSH error via proxy:', error);
    });
  }

  private waitForSocketConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'));
        return;
      }

      if (this.socket.connected) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Socket connection timeout'));
      }, 10000);

      this.socket.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket.once('connect_error', (error: Error) => {
        clearTimeout(timeout);
        reject(new Error(`Socket connection failed: ${error.message}`));
      });
    });
  }

  private connectSSH(credentials: SSHCredentials): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('SSH connection timeout'));
      }, 30000);

      // Listen for SSH connection result
      this.socket.once('ssh:connect:success', () => {
        clearTimeout(timeout);
        resolve(true);
      });

      this.socket.once('ssh:connect:error', (error: string) => {
        clearTimeout(timeout);
        reject(new Error(`SSH connection failed: ${error}`));
      });

      // Send SSH connection request
      this.socket.emit('ssh:connect', credentials);
    });
  }

  /**
   * List directory contents
   */
  async listDirectory(path?: string): Promise<FileItem[]> {
    if (!this.connected || !this.socket) {
      throw new Error('SSH not connected');
    }

    const targetPath = path || this.currentPath;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('List directory timeout'));
      }, 15000);

      this.socket!.once('ssh:listDir:success', (files: FileItem[]) => {
        clearTimeout(timeout);
        resolve(files);
      });

      this.socket!.once('ssh:listDir:error', (error: string) => {
        clearTimeout(timeout);
        reject(new Error(error));
      });

      this.socket!.emit('ssh:listDir', { path: targetPath });
    });
  }

  /**
   * Read file contents
   */
  async readFile(filePath: string): Promise<string> {
    if (!this.connected || !this.socket) {
      throw new Error('SSH not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Read file timeout'));
      }, 20000);

      this.socket!.once('ssh:readFile:success', (data: { filePath: string; content: string }) => {
        clearTimeout(timeout);
        resolve(data.content);
      });

      this.socket!.once('ssh:readFile:error', (error: string) => {
        clearTimeout(timeout);
        reject(new Error(error));
      });

      this.socket!.emit('ssh:readFile', { filePath });
    });
  }

  /**
   * Write file contents
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    if (!this.connected || !this.socket) {
      throw new Error('SSH not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Write file timeout'));
      }, 20000);

      this.socket!.once('ssh:writeFile:success', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket!.once('ssh:writeFile:error', (error: string) => {
        clearTimeout(timeout);
        reject(new Error(error));
      });

      this.socket!.emit('ssh:writeFile', { filePath, content });
    });
  }

  /**
   * Execute command on remote server
   */
  async executeCommand(command: string): Promise<string> {
    if (!this.connected || !this.socket) {
      throw new Error('SSH not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Execute command timeout'));
      }, 30000);

      this.socket!.once('ssh:executeCommand:success', (result: any) => {
        clearTimeout(timeout);
        resolve(result.stdout || '');
      });

      this.socket!.once('ssh:executeCommand:error', (error: string) => {
        clearTimeout(timeout);
        reject(new Error(error));
      });

      this.socket!.emit('ssh:executeCommand', { command });
    });
  }

  /**
   * Change directory
   */
  async changeDirectory(path: string): Promise<void> {
    // Validate directory exists by trying to list it
    await this.listDirectory(path);
    this.currentPath = path;
    if (this.connectionInfo) {
      this.connectionInfo.currentPath = path;
    }
  }

  /**
   * Get current path
   */
  getCurrentPath(): string {
    return this.currentPath;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.socket?.connected === true;
  }

  /**
   * Get connection info
   */
  getConnectionInfo(): { connected: boolean; source: 'local' | 'remote'; details?: any } {
    return {
      connected: this.connected,
      source: 'remote',
      details: this.connectionInfo,
    };
  }

  /**
   * Disconnect from SSH server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.socket && this.connected) {
        // Send disconnect request to proxy
        this.socket.emit('ssh:disconnect');

        // Wait for confirmation or timeout
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 5000);

          this.socket!.once('ssh:disconnect:success', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }

      this.cleanup();
      console.log('SSH disconnected via WebSocket proxy');
    } catch (error) {
      console.error('Error disconnecting SSH:', error);
      this.cleanup();
    }
  }

  private cleanup(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.currentPath = '/';
    this.connectionInfo = null;
  }
}

export default WebSocketSSHService;