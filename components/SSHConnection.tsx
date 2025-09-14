import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView } from 'react-native';

interface SSHCredentials {
  host: string;
  port: string;
  username: string;
  password?: string;
  privateKey?: string;
  initialPath?: string;
}

interface SSHConnectionProps {
  visible: boolean;
  onClose: () => void;
  onConnect: (credentials: SSHCredentials) => void;
  connecting: boolean;
}

const SSHConnection: React.FC<SSHConnectionProps> = ({
  visible,
  onClose,
  onConnect,
  connecting
}) => {
  const [credentials, setCredentials] = useState<SSHCredentials>({
    host: '',
    port: '22',
    username: '',
    password: '',
    initialPath: '',
  });
  const [authMethod, setAuthMethod] = useState<'password' | 'key'>('password');

  const loadHardcodedCredentials = () => {
    setCredentials({
      host: 'ssh.nvidia-oci.saturnenterprise.io',
      port: '22',
      username: 'w-siqim-sc2-68efdcc59f1e49919d7b53423b35bc37',
      password: '',
      privateKey: `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACB/2lM06lz3YSr2NhZBREQBZoKSOM6muTYcBaSAwHrUjgAAAJhtZv0EbWb9
BAAAAAtzc2gtZWQyNTUxOQAAACB/2lM06lz3YSr2NhZBREQBZoKSOM6muTYcBaSAwHrUjg
AAAEAlViWavMFxkbX5kyUDVMMsaWAS1ZF0so8ao7bIo+WtVn/aUzTqXPdhKvY2FkFERAFm
gpI4zqa5NhwFpIDAetSOAAAAFHNpcWkubWlhb0BnYXRlY2guZWR1AQ==
-----END OPENSSH PRIVATE KEY-----`,
      initialPath: '/home/jovyan/shared/siqimiao1/sc/workspace/projects/HEPTv2/src',
    });
    setAuthMethod('key');
  };

  const handleConnect = () => {
    if (!credentials.host || !credentials.username) {
      Alert.alert('Error', 'Please fill in host and username');
      return;
    }

    if (authMethod === 'password' && !credentials.password) {
      Alert.alert('Error', 'Please enter password');
      return;
    }

    if (authMethod === 'key' && !credentials.privateKey) {
      Alert.alert('Error', 'Please enter private key');
      return;
    }

    onConnect(credentials);
  };

  const resetForm = () => {
    setCredentials({
      host: '',
      port: '22',
      username: '',
      password: '',
      initialPath: '',
    });
    setAuthMethod('password');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Connect to SSH Server</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              onClose();
              resetForm();
            }}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickConnectSection}>
          <TouchableOpacity
            style={styles.quickConnectButton}
            onPress={loadHardcodedCredentials}
          >
            <Text style={styles.quickConnectText}>🚀 Quick Connect to NVIDIA OCI Server</Text>
            <Text style={styles.quickConnectSubtext}>ssh.nvidia-oci.saturnenterprise.io • w-siqim-sc2-68efdcc59f1e49919d7b53423b35bc37</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Host *</Text>
            <TextInput
              style={styles.input}
              value={credentials.host}
              onChangeText={(text) =>
                setCredentials(prev => ({ ...prev, host: text }))
              }
              placeholder="192.168.1.100 or example.com"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.label}>Username *</Text>
              <TextInput
                style={styles.input}
                value={credentials.username}
                onChangeText={(text) =>
                  setCredentials(prev => ({ ...prev, username: text }))
                }
                placeholder="root, ubuntu, etc."
                placeholderTextColor="#666"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
              <Text style={styles.label}>Port</Text>
              <TextInput
                style={styles.input}
                value={credentials.port}
                onChangeText={(text) =>
                  setCredentials(prev => ({ ...prev, port: text }))
                }
                placeholder="22"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Initial Path (Optional)</Text>
            <TextInput
              style={styles.input}
              value={credentials.initialPath}
              onChangeText={(text) =>
                setCredentials(prev => ({ ...prev, initialPath: text }))
              }
              placeholder="/home/username, /var/www, /opt/project"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>
              Leave empty to start in the user's home directory
            </Text>
          </View>

          <View style={styles.authMethodContainer}>
            <Text style={styles.label}>Authentication Method</Text>
            <View style={styles.authButtons}>
              <TouchableOpacity
                style={[
                  styles.authButton,
                  authMethod === 'password' && styles.authButtonActive
                ]}
                onPress={() => setAuthMethod('password')}
              >
                <Text style={[
                  styles.authButtonText,
                  authMethod === 'password' && styles.authButtonTextActive
                ]}>
                  Password
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.authButton,
                  authMethod === 'key' && styles.authButtonActive
                ]}
                onPress={() => setAuthMethod('key')}
              >
                <Text style={[
                  styles.authButtonText,
                  authMethod === 'key' && styles.authButtonTextActive
                ]}>
                  Private Key
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {authMethod === 'password' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                value={credentials.password}
                onChangeText={(text) =>
                  setCredentials(prev => ({ ...prev, password: text }))
                }
                placeholder="Enter password"
                placeholderTextColor="#666"
                secureTextEntry
              />
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Private Key</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={credentials.privateKey || ''}
                onChangeText={(text) =>
                  setCredentials(prev => ({ ...prev, privateKey: text }))
                }
                placeholder="Paste your private key here..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
              />
              <Text style={styles.hint}>
                Paste the content of your private key file (e.g., ~/.ssh/id_rsa)
              </Text>
            </View>
          )}

          <View style={styles.exampleSection}>
            <Text style={styles.exampleTitle}>💡 Quick Test Examples:</Text>
            <Text style={styles.exampleText}>
              • Local VM: 192.168.1.100, ubuntu, /home/ubuntu/projects
            </Text>
            <Text style={styles.exampleText}>
              • VPS: your-server.com, root, /var/www/html
            </Text>
            <Text style={styles.exampleText}>
              • Raspberry Pi: raspberrypi.local, pi, /home/pi/code
            </Text>
            <Text style={styles.exampleText}>
              • Development: dev.example.com, developer, /opt/app
            </Text>
            <Text style={styles.exampleNote}>
              Common paths: /home/user, /var/www, /opt, /srv, /root
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.connectButton,
              connecting && styles.connectButtonDisabled
            ]}
            onPress={handleConnect}
            disabled={connecting}
          >
            <Text style={styles.connectButtonText}>
              {connecting ? 'Connecting...' : 'Connect to Server'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  quickConnectSection: {
    padding: 20,
    backgroundColor: '#252525',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  quickConnectButton: {
    backgroundColor: '#0078d4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickConnectText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickConnectSubtext: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
  form: {
    padding: 20,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2d2d2d',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  authMethodContainer: {
    marginBottom: 20,
  },
  authButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  authButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#2d2d2d',
    borderWidth: 1,
    borderColor: '#444',
    marginRight: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  authButtonActive: {
    backgroundColor: '#0078d4',
    borderColor: '#0078d4',
  },
  authButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  authButtonTextActive: {
    fontWeight: 'bold',
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  exampleSection: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
  },
  exampleTitle: {
    color: '#87ceeb',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  exampleText: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 4,
  },
  exampleNote: {
    color: '#87ceeb',
    fontSize: 11,
    marginTop: 5,
    fontStyle: 'italic',
  },
  connectButton: {
    backgroundColor: '#16a085',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  connectButtonDisabled: {
    backgroundColor: '#666',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SSHConnection;