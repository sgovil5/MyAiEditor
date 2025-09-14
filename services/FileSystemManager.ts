// File System Manager - Unified interface for local and remote file operations
import { FileSystemInterface, FileItem, FileSystemSource } from './FileSystemInterface';
import LocalFileSystem from './LocalFileSystem';
import RemoteFileSystem from './RemoteFileSystem';
import { SSHCredentials } from './SecureCredentialStore';

class FileSystemManager {
  private currentFileSystem: FileSystemSource = 'local';
  private localFS = LocalFileSystem;
  private remoteFS = RemoteFileSystem;

  /**
   * Get current file system source
   */
  getCurrentSource(): FileSystemSource {
    return this.currentFileSystem;
  }

  /**
   * Switch to local file system
   */
  switchToLocal(): void {
    this.currentFileSystem = 'local';
  }

  /**
   * Switch to remote file system (must be connected first)
   */
  switchToRemote(): void {
    if (!this.remoteFS.isConnected()) {
      throw new Error('Cannot switch to remote file system: not connected');
    }
    this.currentFileSystem = 'remote';
  }

  /**
   * Get current active file system implementation
   */
  private getCurrentFS(): FileSystemInterface {
    return this.currentFileSystem === 'local' ? this.localFS : this.remoteFS;
  }

  /**
   * Connect to remote SSH server
   */
  async connectToRemote(credentials: SSHCredentials): Promise<boolean> {
    const success = await this.remoteFS.connect(credentials);
    if (success) {
      this.currentFileSystem = 'remote';
    }
    return success;
  }

  /**
   * Disconnect from remote server and switch to local
   */
  async disconnectFromRemote(): Promise<void> {
    await this.remoteFS.disconnect();
    this.currentFileSystem = 'local';
  }

  // Unified file system operations (delegate to current FS)

  getCurrentPath(): string {
    return this.getCurrentFS().getCurrentPath();
  }

  async listDirectory(path?: string): Promise<FileItem[]> {
    return await this.getCurrentFS().listDirectory(path);
  }

  async changeDirectory(path: string): Promise<void> {
    return await this.getCurrentFS().changeDirectory(path);
  }

  async readFile(filePath: string): Promise<string> {
    return await this.getCurrentFS().readFile(filePath);
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    return await this.getCurrentFS().writeFile(filePath, content);
  }

  isConnected(): boolean {
    return this.getCurrentFS().isConnected();
  }

  getConnectionInfo(): { connected: boolean; source: FileSystemSource; details?: any } {
    const info = this.getCurrentFS().getConnectionInfo();
    return {
      ...info,
      source: this.currentFileSystem,
    };
  }

  /**
   * Check if remote connection is available
   */
  isRemoteConnected(): boolean {
    return this.remoteFS.isConnected();
  }

  /**
   * Get status for both local and remote systems
   */
  getFullStatus(): {
    current: FileSystemSource;
    local: { connected: boolean; details?: any };
    remote: { connected: boolean; details?: any };
  } {
    return {
      current: this.currentFileSystem,
      local: this.localFS.getConnectionInfo(),
      remote: this.remoteFS.getConnectionInfo(),
    };
  }

  /**
   * Execute command on remote server (only available in remote mode)
   */
  async executeCommand(command: string): Promise<string> {
    if (this.currentFileSystem !== 'remote') {
      throw new Error('Command execution only available in remote mode');
    }
    return await this.remoteFS.executeCommand(command);
  }

  /**
   * Set callback for streaming command output (remote only)
   */
  setStreamingCallback(callback: (type: 'stdout' | 'stderr', data: string) => void): void {
    if (this.currentFileSystem === 'remote') {
      this.remoteFS.setStreamingCallback(callback);
    }
  }

  /**
   * Create new file in current file system
   */
  async createFile(filePath: string, content: string = ''): Promise<void> {
    await this.writeFile(filePath, content);
  }

  /**
   * Check if a path exists in current file system
   */
  async pathExists(path: string): Promise<boolean> {
    try {
      if (this.currentFileSystem === 'local') {
        const files = await this.listDirectory();
        return files.some(file => file.path === path);
      } else {
        // For remote, try to list the parent directory and check if the path exists
        const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
        const fileName = path.substring(path.lastIndexOf('/') + 1);
        const files = await this.listDirectory(parentPath);
        return files.some(file => file.name === fileName);
      }
    } catch {
      return false;
    }
  }
}

export default new FileSystemManager();