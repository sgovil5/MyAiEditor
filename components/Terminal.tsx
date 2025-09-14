import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import FileSystemManager from '../services/FileSystemManager';

interface TerminalProps {
  onExecuteCommand: (command: string) => Promise<string>;
  isConnected: boolean;
  currentPath?: string;
  initialWorkingDirectory?: string;
  onFileCreated?: () => void; // Callback to refresh file tree
}

interface TerminalLine {
  type: 'command' | 'output' | 'error';
  content: string;
  timestamp: Date;
}

const Terminal: React.FC<TerminalProps> = ({ onExecuteCommand, isConnected, currentPath, initialWorkingDirectory, onFileCreated }) => {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<TerminalLine[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [hasInitializedDirectory, setHasInitializedDirectory] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Set up streaming callback when connected
  useEffect(() => {
    if (isConnected) {
      const streamingCallback = (type: 'stdout' | 'stderr', data: string) => {
        console.log(`Streaming ${type}:`, data);

        // Add streaming output to terminal history in real-time
        const outputLine: TerminalLine = {
          type: type === 'stderr' ? 'error' : 'output',
          content: data,
          timestamp: new Date(),
        };

        setHistory(prev => {
          // Check if the last line is an "Executing..." line and remove it
          const filtered = prev.filter(line => line.content !== 'Executing...');
          return [...filtered, outputLine];
        });

        // Auto-scroll to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 50);
      };

      FileSystemManager.setStreamingCallback(streamingCallback);
    }
  }, [isConnected]);

  // Initialize terminal in the correct working directory
  useEffect(() => {
    if (isConnected && initialWorkingDirectory && !hasInitializedDirectory) {
      console.log(`Initializing terminal in directory: ${initialWorkingDirectory}`);

      // Add a small delay to ensure the SSH connection is fully established
      const initTimer = setTimeout(() => {
        // First, let's just try to verify where we are
        onExecuteCommand('pwd').then((pwdResult) => {
          console.log(`Current working directory before init: ${pwdResult.trim()}`);

          // Now try to change to the correct directory
          const initCommand = `cd "${initialWorkingDirectory}"`;
          return onExecuteCommand(initCommand);
        }).then((result) => {
          console.log(`Terminal cd command result: ${result}`);

          // Verify we're in the right place
          return onExecuteCommand('pwd');
        }).then((finalPwd) => {
          console.log(`Terminal initialized in: ${finalPwd.trim()}`);
          console.log(`Expected: ${initialWorkingDirectory}`);
          setHasInitializedDirectory(true);
        }).catch((error) => {
          console.error('Failed to initialize terminal directory:', error);
          setHasInitializedDirectory(true); // Still mark as initialized to avoid retry loop
        });
      }, 1000); // Increased delay to ensure connection is ready

      return () => clearTimeout(initTimer);
    } else if (!isConnected) {
      // Reset when disconnected
      setHasInitializedDirectory(false);
      setHistory([]); // Clear terminal history on disconnect
    }
  }, [isConnected, initialWorkingDirectory, hasInitializedDirectory, onExecuteCommand]);

  const executeCommand = async () => {
    if (!command.trim() || !isConnected || isExecuting) return;

    const cmd = command.trim();
    setIsExecuting(true);

    // Add command to history
    const commandLine: TerminalLine = {
      type: 'command',
      content: `$ ${cmd}`,
      timestamp: new Date(),
    };

    setHistory(prev => [...prev, commandLine]);
    setCommandHistory(prev => [...prev, cmd]);
    setCommand('');
    setHistoryIndex(-1);

    // Check if this command might create files
    const isFileCreatingCommand = (command: string) => {
      const cmd = command.toLowerCase().trim();
      return (
        cmd.includes('nohup') ||
        cmd.includes(' > ') ||
        cmd.includes(' >> ') ||
        cmd.startsWith('touch ') ||
        cmd.startsWith('cp ') ||
        cmd.startsWith('mv ') ||
        cmd.startsWith('mkdir ') ||
        cmd.includes('curl ') && (cmd.includes(' -o ') || cmd.includes(' > ')) ||
        cmd.includes('wget ') ||
        cmd.includes('echo ') && (cmd.includes(' > ') || cmd.includes(' >> '))
      );
    };

    try {
      const output = await onExecuteCommand(cmd);

      const outputLine: TerminalLine = {
        type: 'output',
        content: output || '(no output)',
        timestamp: new Date(),
      };

      setHistory(prev => [...prev, outputLine]);

      // If this was a file-creating command, trigger refresh
      if (isFileCreatingCommand(cmd) && onFileCreated) {
        console.log(`File-creating command detected: ${cmd}`);
        // Small delay to let the file system settle
        setTimeout(() => {
          onFileCreated();
        }, 500);
      }
    } catch (error) {
      const errorLine: TerminalLine = {
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date(),
      };

      setHistory(prev => [...prev, errorLine]);
    } finally {
      setIsExecuting(false);
      // Auto-scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleKeyPress = (key: string) => {
    if (key === 'Enter') {
      executeCommand();
    }
  };

  const navigateHistory = (direction: 'up' | 'down') => {
    if (commandHistory.length === 0) return;

    let newIndex = historyIndex;

    if (direction === 'up') {
      newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : commandHistory.length - 1;
    } else {
      newIndex = historyIndex > 0 ? historyIndex - 1 : -1;
    }

    setHistoryIndex(newIndex);
    setCommand(newIndex >= 0 ? commandHistory[commandHistory.length - 1 - newIndex] : '');
  };

  const clearTerminal = () => {
    setHistory([]);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString();
  };

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.disconnectedContainer}>
          <Text style={styles.disconnectedText}>Terminal not available</Text>
          <Text style={styles.disconnectedSubtext}>Connect to SSH server to use terminal</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>💻 Terminal</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.clearButton} onPress={clearTerminal}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {currentPath && (
        <View style={styles.pathBar}>
          <Text style={styles.pathText}>📂 {currentPath}</Text>
        </View>
      )}

      {/* Input at the top */}
      <View style={styles.inputContainer}>
        <Text style={styles.prompt}>$</Text>
        <TextInput
          style={styles.input}
          value={command}
          onChangeText={setCommand}
          onSubmitEditing={executeCommand}
          placeholder="Enter command..."
          placeholderTextColor="#666"
          editable={!isExecuting}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="send"
        />
        <View style={styles.inputActions}>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigateHistory('up')}
            disabled={commandHistory.length === 0}
          >
            <Text style={[styles.historyButtonText, commandHistory.length === 0 && styles.disabledText]}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigateHistory('down')}
            disabled={commandHistory.length === 0}
          >
            <Text style={[styles.historyButtonText, commandHistory.length === 0 && styles.disabledText]}>↓</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.executeButton, isExecuting && styles.executingButton]}
            onPress={executeCommand}
            disabled={!command.trim() || isExecuting}
          >
            <Text style={[styles.executeButtonText, (!command.trim() || isExecuting) && styles.disabledText]}>
              {isExecuting ? '⏳' : '▶️'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Output below input */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.output}
        contentContainerStyle={styles.outputContent}
        showsVerticalScrollIndicator={true}
      >
        {history.map((line, index) => (
          <View key={index} style={styles.terminalLine}>
            <Text style={[
              styles.lineText,
              line.type === 'command' && styles.commandText,
              line.type === 'error' && styles.errorText,
              line.type === 'output' && styles.outputText,
            ]}>
              {line.content}
            </Text>
            <Text style={styles.timestamp}>{formatTimestamp(line.timestamp)}</Text>
          </View>
        ))}

        {isExecuting && (
          <View style={styles.terminalLine}>
            <Text style={styles.executingText}>Executing...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  disconnectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  disconnectedText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disconnectedSubtext: {
    color: '#444',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  headerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
  },
  clearButton: {
    backgroundColor: '#666',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pathBar: {
    padding: 8,
    backgroundColor: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  pathText: {
    color: '#87ceeb',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  output: {
    flex: 1,
    backgroundColor: '#000',
  },
  outputContent: {
    padding: 8,
  },
  terminalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  lineText: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 16,
  },
  commandText: {
    color: '#87ceeb',
    fontWeight: 'bold',
  },
  outputText: {
    color: '#fff',
  },
  errorText: {
    color: '#ff6b6b',
  },
  executingText: {
    color: '#ffd93d',
    fontFamily: 'monospace',
    fontSize: 12,
    fontStyle: 'italic',
  },
  timestamp: {
    color: '#666',
    fontSize: 10,
    fontFamily: 'monospace',
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  prompt: {
    color: '#87ceeb',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 14,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#444',
  },
  inputActions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  historyButton: {
    backgroundColor: '#666',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 4,
  },
  historyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  executeButton: {
    backgroundColor: '#16a085',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  executingButton: {
    backgroundColor: '#f39c12',
  },
  executeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledText: {
    color: '#666',
  },
});

export default Terminal;