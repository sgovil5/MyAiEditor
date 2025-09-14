// Local File System implementation using Expo File System
import * as FileSystem from 'expo-file-system/legacy';
import { FileSystemInterface, FileItem } from './FileSystemInterface';

class LocalFileSystem implements FileSystemInterface {
  private currentPath: string;

  constructor() {
    this.currentPath = FileSystem.documentDirectory || '/';
  }

  getCurrentPath(): string {
    return this.currentPath;
  }

  async listDirectory(path?: string): Promise<FileItem[]> {
    const targetPath = path || this.currentPath;

    try {
      const files = await FileSystem.readDirectoryAsync(targetPath);
      const fileItems: FileItem[] = [];

      for (const fileName of files) {
        const fullPath = `${targetPath}${targetPath.endsWith('/') ? '' : '/'}${fileName}`;

        try {
          const info = await FileSystem.getInfoAsync(fullPath);

          fileItems.push({
            name: fileName,
            path: fullPath,
            isFile: !info.isDirectory,
            isDirectory: info.isDirectory || false,
            size: info.size,
            modifiedDate: info.modificationTime ? new Date(info.modificationTime * 1000) : undefined,
          });
        } catch (statError) {
          // If we can't stat the file, still include it as unknown type
          fileItems.push({
            name: fileName,
            path: fullPath,
            isFile: true,
            isDirectory: false,
          });
        }
      }

      return fileItems.sort((a, b) => {
        // Directories first, then files, alphabetically
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

    } catch (error) {
      console.error('Error listing local directory:', error);
      throw new Error(`Failed to list directory: ${targetPath}`);
    }
  }

  async changeDirectory(path: string): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) {
        throw new Error(`Directory does not exist: ${path}`);
      }
      if (!info.isDirectory) {
        throw new Error(`Path is not a directory: ${path}`);
      }

      this.currentPath = path;
    } catch (error) {
      console.error('Error changing directory:', error);
      throw error;
    }
  }

  async readFile(filePath: string): Promise<string> {
    try {
      const content = await FileSystem.readAsStringAsync(filePath);
      return content;
    } catch (error) {
      console.error('Error reading local file:', error);
      throw new Error(`Failed to read file: ${filePath}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await FileSystem.writeAsStringAsync(filePath, content);
    } catch (error) {
      console.error('Error writing local file:', error);
      throw new Error(`Failed to write file: ${filePath}`);
    }
  }

  isConnected(): boolean {
    return true; // Local file system is always "connected"
  }

  getConnectionInfo(): { connected: boolean; source: 'local' | 'remote'; details?: any } {
    return {
      connected: true,
      source: 'local',
      details: {
        documentDirectory: FileSystem.documentDirectory,
        cacheDirectory: FileSystem.cacheDirectory,
        currentPath: this.currentPath,
      },
    };
  }
}

export default new LocalFileSystem();