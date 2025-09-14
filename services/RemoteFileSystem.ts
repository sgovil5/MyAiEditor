// Remote File System implementation using WebSocket SSH Proxy
import { FileSystemInterface, FileItem } from './FileSystemInterface';
import WebSocketSSHService from './WebSocketSSHService';

class RemoteFileSystem implements FileSystemInterface {
  private sshService = new WebSocketSSHService();

  getCurrentPath(): string {
    return this.sshService.getCurrentPath();
  }

  async listDirectory(path?: string): Promise<FileItem[]> {
    if (!this.sshService.isConnected()) {
      throw new Error('Not connected to remote server');
    }

    try {
      return await this.sshService.listDirectory(path);
    } catch (error) {
      console.error('Error listing remote directory:', error);
      throw new Error(`Failed to list remote directory: ${path || this.getCurrentPath()}`);
    }
  }

  async changeDirectory(path: string): Promise<void> {
    if (!this.sshService.isConnected()) {
      throw new Error('Not connected to remote server');
    }

    try {
      await this.sshService.changeDirectory(path);
    } catch (error) {
      console.error('Error changing remote directory:', error);
      throw error;
    }
  }

  async readFile(filePath: string): Promise<string> {
    if (!this.sshService.isConnected()) {
      throw new Error('Not connected to remote server');
    }

    try {
      return await this.sshService.readFile(filePath);
    } catch (error) {
      console.error('Error reading remote file:', error);
      throw new Error(`Failed to read remote file: ${filePath}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    if (!this.sshService.isConnected()) {
      throw new Error('Not connected to remote server');
    }

    try {
      await this.sshService.writeFile(filePath, content);
    } catch (error) {
      console.error('Error writing remote file:', error);
      throw new Error(`Failed to write remote file: ${filePath}`);
    }
  }

  isConnected(): boolean {
    return this.sshService.isConnected();
  }

  getConnectionInfo(): { connected: boolean; source: 'local' | 'remote'; details?: any } {
    return this.sshService.getConnectionInfo();
  }

  // Additional SSH-specific methods (not in base interface)
  async connect(credentials: any): Promise<boolean> {
    return await this.sshService.connect(credentials);
  }

  async disconnect(): Promise<void> {
    return await this.sshService.disconnect();
  }

  async executeCommand(command: string): Promise<string> {
    if (!this.sshService.isConnected()) {
      throw new Error('Not connected to remote server');
    }
    return await this.sshService.executeCommand(command);
  }

  setStreamingCallback(callback: (type: 'stdout' | 'stderr', data: string) => void): void {
    this.sshService.setStreamingCallback(callback);
  }
}

export default new RemoteFileSystem();