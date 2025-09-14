// File System Interface - Source-agnostic abstraction for local and remote files
// Provides unified interface for both local file system (RNFS) and remote SSH operations

export interface FileItem {
  name: string;
  path: string;
  isFile: boolean;
  isDirectory: boolean;
  size?: number;
  modifiedDate?: Date;
}

export interface FileSystemInterface {
  // Directory operations
  getCurrentPath(): string;
  listDirectory(path?: string): Promise<FileItem[]>;
  changeDirectory(path: string): Promise<void>;

  // File operations
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;

  // Connection/state operations
  isConnected(): boolean;
  getConnectionInfo(): { connected: boolean; source: 'local' | 'remote'; details?: any };
}

export type FileSystemSource = 'local' | 'remote';