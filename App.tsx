import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, Text, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import CodeEditor from './components/CodeEditor';
import FileTree from './components/FileTree';
import SSHConnection from './components/SSHConnection';
import Terminal from './components/Terminal';
import FileSystemManager from './services/FileSystemManager';
import SecureCredentialStore from './services/SecureCredentialStore';

export default function App() {
  const [code, setCode] = useState('// Welcome to MyAiEditor!\n// Choose "Local Files" or "SSH Server" to start editing');
  const [loadedFileContent, setLoadedFileContent] = useState<string>('// Welcome to MyAiEditor!\n// Choose "Local Files" or "SSH Server" to start editing');
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [projectUri, setProjectUri] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [showFileTree, setShowFileTree] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [currentDirectory, setCurrentDirectory] = useState<string | null>(null);
  const [directoryHistory, setDirectoryHistory] = useState<string[]>([]);

  // SSH related state
  const [showSSHModal, setShowSSHModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);

  // Initialize connection info on app start
  useEffect(() => {
    updateConnectionInfo();
  }, []);

  const updateConnectionInfo = () => {
    const info = FileSystemManager.getConnectionInfo();
    setConnectionInfo(info);
  };

  const openLocalFolder = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // For demo purposes, we'll use the app's document directory
        // since Expo doesn't support true folder picking
        const appDirectory = FileSystem.documentDirectory;
        setProjectUri(appDirectory!);
        FileSystemManager.switchToLocal();
        updateConnectionInfo();
        await loadFileTree();
        setShowFileTree(true);
        Alert.alert('Success', 'Using app document directory for demo. You can create files here!');
      }
    } catch (error) {
      console.error('Error picking folder:', error);
      Alert.alert('Error', 'Failed to open folder');
    }
  };

  const handleSSHConnect = async (credentials: any) => {
    setIsConnecting(true);

    try {
      console.log('Starting SSH connection process...');

      // Save credentials securely before connecting
      const credentialId = await SecureCredentialStore.saveCredentials({
        name: `${credentials.username}@${credentials.host}`,
        host: credentials.host,
        port: credentials.port,
        username: credentials.username,
        password: credentials.password,
        privateKey: credentials.privateKey,
        initialPath: credentials.initialPath,
      });

      console.log('Credentials saved, attempting connection...');
      const connected = await FileSystemManager.connectToRemote(credentials);

      if (connected) {
        console.log('Connection successful, updating state...');
        // Update last used timestamp
        await SecureCredentialStore.updateLastUsed(credentialId);
        await SecureCredentialStore.setActiveConnection(credentialId);

        updateConnectionInfo();
        // Set initial directory and clear history when first connecting
        const initialDir = credentials.initialPath || `/home/${credentials.username}`;
        console.log(`Setting initial directory to: ${initialDir}`);
        setCurrentDirectory(initialDir);
        setDirectoryHistory([]);
        await loadFileTree(initialDir);
        setShowFileTree(true);
        setShowSSHModal(false);
        Alert.alert('Success', `Connected to ${credentials.host}!`);
      } else {
        console.log('Connection returned false');
        Alert.alert('Connection Failed', 'Could not connect to SSH server. Please verify your credentials.');
      }
    } catch (error) {
      console.error('SSH connection error:', error);
      Alert.alert('Connection Failed', `SSH connection failed: ${error.message || 'Network or authentication error'}`);
    } finally {
      console.log('SSH connection process completed, resetting connecting state');
      setIsConnecting(false);
    }
  };

  const disconnectSSH = async () => {
    try {
      await FileSystemManager.disconnectFromRemote();
      await SecureCredentialStore.clearActiveConnection();
      updateConnectionInfo();
      setShowFileTree(false);
      setShowTerminal(false);
      setFiles([]);
      setCurrentFile(null);
      setCurrentDirectory(null);
      setDirectoryHistory([]);
      setCode('// Welcome to MyAiEditor!\n// Choose "Local Files" or "SSH Server" to start editing');
      Alert.alert('Disconnected', 'SSH connection closed');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const loadFileTree = async (uri?: string) => {
    try {
      // Check FileSystemManager directly instead of relying on React state
      const currentInfo = FileSystemManager.getConnectionInfo();

      if (currentInfo.source === 'local') {
        // Local file system - use specific directory or create sample files
        const targetUri = uri || currentDirectory || FileSystem.documentDirectory!;
        setCurrentDirectory(targetUri);
        const items = await FileSystem.readDirectoryAsync(targetUri);
        const fileItems = await Promise.all(
          items.map(async (item) => {
            const itemPath = `${targetUri}${item}`;
            const info = await FileSystem.getInfoAsync(itemPath);
            return {
              name: item,
              path: itemPath,
              isFile: () => !info.isDirectory,
              isDirectory: () => info.isDirectory || false,
            };
          })
        );
        setFiles(fileItems);

        // Create sample files if directory is empty
        if (fileItems.length === 0) {
          await createSampleFiles(targetUri);
          loadFileTree(targetUri); // Reload after creating files
        }
      } else {
        // Remote file system - use FileSystemManager
        const targetPath = uri || currentDirectory;
        const items = await FileSystemManager.listDirectory(targetPath);
        const fileItems = items.map(item => ({
          ...item,
          isFile: () => item.isFile,
          isDirectory: () => item.isDirectory,
        }));
        setFiles(fileItems);
        if (targetPath) {
          setCurrentDirectory(targetPath);
        }
      }
    } catch (error) {
      console.error('Error reading directory:', error);
      Alert.alert('Error', 'Failed to read directory contents');
    }
  };

  const openFile = async (fileUri: string, fileName: string) => {
    try {
      const content = await FileSystemManager.readFile(fileUri);
      setCode(content);
      setLoadedFileContent(content); // Track the loaded file content separately
      setCurrentFile(fileUri);
      console.log(`Opened file: ${fileName}`);
    } catch (error) {
      console.error('Error reading file:', error);
      Alert.alert('Error', 'Failed to read file');
    }
  };

  const navigateToDirectory = async (directoryPath: string, directoryName: string) => {
    try {
      console.log(`Navigating to directory: ${directoryName} at path: ${directoryPath}`);
      console.log(`Current directory before navigation: ${currentDirectory}`);
      console.log(`Current history length: ${directoryHistory.length}`);

      // Add current directory to history before navigating
      if (currentDirectory && currentDirectory !== directoryPath) {
        console.log(`Adding to history: ${currentDirectory}`);
        setDirectoryHistory(prev => {
          const newHistory = [...prev, currentDirectory];
          console.log(`New history:`, newHistory);
          return newHistory;
        });
      }

      await loadFileTree(directoryPath);
    } catch (error) {
      console.error('Error navigating to directory:', error);
      Alert.alert('Error', 'Failed to navigate to directory');
    }
  };

  const navigateBack = async () => {
    try {
      if (directoryHistory.length > 0) {
        const previousDirectory = directoryHistory[directoryHistory.length - 1];
        setDirectoryHistory(prev => prev.slice(0, -1));
        await loadFileTree(previousDirectory);
      }
    } catch (error) {
      console.error('Error navigating back:', error);
      Alert.alert('Error', 'Failed to navigate back');
    }
  };

  const saveFile = async () => {
    if (!currentFile) {
      Alert.alert('No File', 'No file is currently open');
      return;
    }

    try {
      await FileSystemManager.writeFile(currentFile, code);
      const isRemote = connectionInfo?.source === 'remote';
      Alert.alert('Success', `${isRemote ? 'Remote' : 'Local'} file saved successfully!`);
    } catch (error) {
      console.error('Error saving file:', error);
      Alert.alert('Error', 'Failed to save file');
    }
  };

  const handleFileCreated = () => {
    console.log('File creation detected, refreshing file tree');
    // Refresh the file tree to show newly created files
    loadFileTree();
  };

  const executeCommand = async (command: string): Promise<string> => {
    try {
      if (connectionInfo?.source !== 'remote') {
        throw new Error('Terminal commands are only available when connected to SSH server');
      }

      console.log(`[App] Executing command: ${command}`);
      console.log(`[App] Current directory: ${currentDirectory}`);

      const result = await FileSystemManager.executeCommand(command);
      console.log(`[App] Command result: ${result}`);

      return result;
    } catch (error) {
      console.error('Error executing command:', error);
      throw error;
    }
  };

  const createSampleFiles = async (directory: string) => {
    const sampleFiles = [
      {
        name: 'welcome.js',
        content: `// Welcome to MyAiEditor!
// This is a sample JavaScript file

class Calculator {
    constructor() {
        this.result = 0;
    }

    add(a, b) {
        this.result = a + b;
        return this.result;
    }

    subtract(a, b) {
        this.result = a - b;
        return this.result;
    }

    multiply(a, b) {
        this.result = a * b;
        return this.result;
    }

    divide(a, b) {
        if (b === 0) {
            throw new Error('Cannot divide by zero');
        }
        this.result = a / b;
        return this.result;
    }
}

// Example usage
const calc = new Calculator();
console.log('5 + 3 =', calc.add(5, 3));
console.log('10 - 4 =', calc.subtract(10, 4));

export default Calculator;`
      },
      {
        name: 'README.md',
        content: `# MyAiEditor Sample Project

Welcome to MyAiEditor! This mobile code editor brings desktop-class editing to your Android device.

## Features

- **Syntax Highlighting**: Support for JavaScript, TypeScript, JSON, CSS, and Markdown
- **Real-time Editing**: Changes are reflected immediately as you type
- **File Management**: Browse and edit multiple files seamlessly
- **Save Functionality**: Changes are saved back to the original files

## Getting Started

1. Tap on any file in the file tree to start editing
2. Make your changes in the editor
3. Tap "Save File" to save your changes
4. Create new files by editing this project!

## Try It Out

- Edit the **welcome.js** file to add new calculator methods
- Modify this README to add your own notes
- Create new files and experiment with different file types

Happy coding on mobile! 🎉`
      },
      {
        name: 'config.json',
        content: `{
  "app": {
    "name": "MyAiEditor",
    "version": "1.0.0",
    "description": "Mobile code editor for Android"
  },
  "editor": {
    "theme": "monokai",
    "fontSize": 14,
    "tabSize": 2,
    "wordWrap": true,
    "syntaxHighlighting": true
  },
  "supportedLanguages": [
    "javascript",
    "typescript",
    "json",
    "markdown",
    "css"
  ]
}`
      }
    ];

    try {
      for (const file of sampleFiles) {
        const filePath = `${directory}${file.name}`;
        await FileSystem.writeAsStringAsync(filePath, file.content);
      }
      console.log('Sample files created successfully');
    } catch (error) {
      console.error('Error creating sample files:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.header}
        contentContainerStyle={styles.headerContent}
      >
        {connectionInfo?.source !== 'remote' ? (
          <TouchableOpacity style={styles.button} onPress={openLocalFolder}>
            <Text style={styles.buttonText}>📁 Local Files</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.button, styles.disconnectButton]} onPress={disconnectSSH}>
            <Text style={styles.buttonText}>🔌 Disconnect</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.sshButton]}
          onPress={() => setShowSSHModal(true)}
          disabled={connectionInfo?.source === 'remote'}
        >
          <Text style={[styles.buttonText, connectionInfo?.source === 'remote' && styles.disabledText]}>
            🖥️ SSH Server
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={saveFile}
          disabled={!currentFile}
        >
          <Text style={[styles.buttonText, !currentFile && styles.disabledText]}>
            💾 Save
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => setShowFileTree(!showFileTree)}
          disabled={!connectionInfo?.connected}
        >
          <Text style={[styles.buttonText, !connectionInfo?.connected && styles.disabledText]}>
            {showFileTree ? '📋 Hide' : '📋 Files'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.terminalButton]}
          onPress={() => setShowTerminal(!showTerminal)}
          disabled={connectionInfo?.source !== 'remote'}
        >
          <Text style={[styles.buttonText, connectionInfo?.source !== 'remote' && styles.disabledText]}>
            {showTerminal ? '💻 Hide' : '💻 Terminal'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Connection Status Bar */}
      {connectionInfo?.source === 'remote' && connectionInfo?.connected && (
        <View style={styles.connectionBar}>
          <Text style={styles.connectionText}>
            🌐 Connected to {connectionInfo.details?.host}
          </Text>
          <Text style={styles.connectionPath}>
            📂 {connectionInfo.details?.currentPath}
          </Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Left Sidebar - Files */}
        {showFileTree && (
          <View style={styles.sidebar}>
            <FileTree
              files={files}
              onFilePress={openFile}
              onDirectoryPress={navigateToDirectory}
              onBackPress={navigateBack}
              currentPath={currentDirectory}
              canGoBack={directoryHistory.length > 0}
            />
          </View>
        )}

        {/* Main Content Area */}
        <View style={[styles.mainContent, showFileTree && styles.mainContentWithSidebar]}>
          {/* Editor Section */}
          <View style={[styles.editorContainer, showTerminal && styles.editorWithTerminal]}>
            {currentFile && (
              <View style={styles.currentFileBar}>
                <Text style={styles.currentFile}>
                  {connectionInfo?.source === 'remote' ? '🌐' : '📁'} {currentFile.split('/').pop()}
                </Text>
                {connectionInfo?.source === 'remote' && (
                  <Text style={styles.remoteIndicator}>REMOTE</Text>
                )}
              </View>
            )}
            <CodeEditor
              initialCode={loadedFileContent}
              onCodeChange={setCode}
              fileName={currentFile ? currentFile.split('/').pop() : undefined}
            />
          </View>

          {/* Terminal Section */}
          {showTerminal && (
            <View style={styles.terminalContainer}>
              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
                enabled={true}
              >
                <Terminal
                  onExecuteCommand={executeCommand}
                  isConnected={connectionInfo?.source === 'remote' && connectionInfo?.connected}
                  currentPath={currentDirectory}
                  initialWorkingDirectory={currentDirectory}
                  onFileCreated={handleFileCreated}
                />
              </KeyboardAvoidingView>
            </View>
          )}
        </View>
      </View>

      {/* SSH Connection Modal */}
      <SSHConnection
        visible={showSSHModal}
        onClose={() => setShowSSHModal(false)}
        onConnect={handleSSHConnect}
        connecting={isConnecting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  header: {
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    maxHeight: 60,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  button: {
    backgroundColor: '#0078d4',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#16a085',
  },
  sshButton: {
    backgroundColor: '#8e44ad',
  },
  terminalButton: {
    backgroundColor: '#2c3e50',
  },
  disconnectButton: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
  },
  disabledText: {
    color: '#666',
  },
  connectionBar: {
    backgroundColor: '#8e44ad',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  connectionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  connectionPath: {
    color: '#ddd',
    fontSize: 10,
    marginTop: 2,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 250,
    backgroundColor: '#252525',
    borderRightWidth: 1,
    borderRightColor: '#444',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  mainContentWithSidebar: {
    flex: 1,
  },
  editorContainer: {
    flex: 1,
  },
  editorWithTerminal: {
    flex: 0.65,
  },
  terminalContainer: {
    flex: 0.35,
    borderTopWidth: 1,
    borderTopColor: '#444',
    backgroundColor: '#1a1a1a',
  },
  currentFileBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  currentFile: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  remoteIndicator: {
    backgroundColor: '#8e44ad',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
});
