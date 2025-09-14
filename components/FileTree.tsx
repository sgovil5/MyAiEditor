import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

interface FileItem {
  name: string;
  path: string;
  isFile: () => boolean;
  isDirectory: () => boolean;
}

interface FileTreeProps {
  files: FileItem[];
  onFilePress: (fileUri: string, fileName: string) => void;
  onDirectoryPress?: (directoryPath: string, directoryName: string) => void;
  onBackPress?: () => void;
  currentPath?: string;
  canGoBack?: boolean;
}

const FileTree: React.FC<FileTreeProps> = ({ files, onFilePress, onDirectoryPress, onBackPress, currentPath, canGoBack }) => {
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return '📄';
      case 'ts':
      case 'tsx':
        return '📘';
      case 'json':
        return '⚙️';
      case 'md':
        return '📝';
      case 'html':
      case 'htm':
        return '🌐';
      case 'css':
        return '🎨';
      case 'py':
        return '🐍';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return '🖼️';
      default:
        return '📄';
    }
  };

  const isEditableFile = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const editableExtensions = [
      'js', 'jsx', 'ts', 'tsx', 'json', 'md', 'txt',
      'html', 'htm', 'css', 'xml', 'yaml', 'yml', 'py'
    ];
    return editableExtensions.includes(ext || '');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerText}>📁 Project Files</Text>
          {canGoBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
              <Text style={styles.backButtonText}>⬅️ Back</Text>
            </TouchableOpacity>
          )}
        </View>
        {currentPath && (
          <Text style={styles.currentPath}>{currentPath}</Text>
        )}
      </View>

      {files.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.fileItem,
            item.isDirectory() && styles.directory,
            item.isFile() && !isEditableFile(item.name) ? styles.disabled : null
          ]}
          onPress={() => {
            if (item.isFile() && isEditableFile(item.name)) {
              onFilePress(item.path, item.name);
            } else if (item.isDirectory() && onDirectoryPress) {
              onDirectoryPress(item.path, item.name);
            }
          }}
          disabled={item.isFile() && !isEditableFile(item.name)}
        >
          <Text style={styles.fileIcon}>
            {item.isDirectory() ? '📁' : getFileIcon(item.name)}
          </Text>
          <Text style={[
            styles.fileName,
            item.isDirectory() && styles.directoryName,
            (item.isFile() && !isEditableFile(item.name)) && styles.disabledText
          ]}>
            {item.name}
          </Text>
        </TouchableOpacity>
      ))}

      {files.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No files found</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 12,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
  },
  backButton: {
    backgroundColor: '#0078d4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  currentPath: {
    color: '#87ceeb',
    fontSize: 10,
    marginTop: 4,
    fontStyle: 'italic',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  directory: {
    backgroundColor: '#2a2a2a',
  },
  disabled: {
    opacity: 0.5,
  },
  fileIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
  },
  fileName: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
  },
  directoryName: {
    color: '#87ceeb',
    fontWeight: '500',
  },
  disabledText: {
    color: '#666',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 12,
  },
});

export default FileTree;