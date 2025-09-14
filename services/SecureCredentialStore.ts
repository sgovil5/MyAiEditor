import * as SecureStore from 'expo-secure-store';

export interface SSHCredentials {
  id: string;
  name: string;
  host: string;
  port: string;
  username: string;
  password?: string;
  privateKey?: string;
  initialPath?: string;
  createdAt: Date;
  lastUsed?: Date;
}

class SecureCredentialStore {
  private static readonly CREDENTIALS_KEY = 'ssh_credentials';
  private static readonly ACTIVE_CONNECTION_KEY = 'active_ssh_connection';

  /**
   * Save SSH credentials securely to device keystore
   */
  async saveCredentials(credentials: Omit<SSHCredentials, 'id' | 'createdAt'>): Promise<string> {
    try {
      const credentialsWithId: SSHCredentials = {
        ...credentials,
        id: this.generateId(),
        createdAt: new Date(),
      };

      // Store sensitive data (password/key) separately for security
      if (credentials.password) {
        await SecureStore.setItemAsync(
          `ssh_password_${credentialsWithId.id}`,
          credentials.password
        );
      }

      if (credentials.privateKey) {
        await SecureStore.setItemAsync(
          `ssh_key_${credentialsWithId.id}`,
          credentials.privateKey
        );
      }

      // Store non-sensitive metadata
      const existingCredentials = await this.getAllCredentials();
      const updatedCredentials = [...existingCredentials, {
        ...credentialsWithId,
        password: undefined, // Don't store password in metadata
        privateKey: undefined, // Don't store key in metadata
      }];

      await SecureStore.setItemAsync(
        SecureCredentialStore.CREDENTIALS_KEY,
        JSON.stringify(updatedCredentials)
      );

      console.log(`Saved SSH credentials for ${credentials.host}`);
      return credentialsWithId.id;
    } catch (error) {
      console.error('Error saving SSH credentials:', error);
      throw new Error('Failed to save SSH credentials');
    }
  }

  /**
   * Get all saved credential metadata (without passwords/keys)
   */
  async getAllCredentials(): Promise<SSHCredentials[]> {
    try {
      const stored = await SecureStore.getItemAsync(SecureCredentialStore.CREDENTIALS_KEY);
      if (!stored) return [];

      const credentials = JSON.parse(stored) as SSHCredentials[];
      return credentials.map(cred => ({
        ...cred,
        createdAt: new Date(cred.createdAt),
        lastUsed: cred.lastUsed ? new Date(cred.lastUsed) : undefined,
      }));
    } catch (error) {
      console.error('Error loading SSH credentials:', error);
      return [];
    }
  }

  /**
   * Get full credentials including sensitive data
   */
  async getCredentials(id: string): Promise<SSHCredentials | null> {
    try {
      const allCredentials = await this.getAllCredentials();
      const credential = allCredentials.find(cred => cred.id === id);

      if (!credential) return null;

      // Load sensitive data separately
      const password = await SecureStore.getItemAsync(`ssh_password_${id}`);
      const privateKey = await SecureStore.getItemAsync(`ssh_key_${id}`);

      return {
        ...credential,
        password: password || undefined,
        privateKey: privateKey || undefined,
      };
    } catch (error) {
      console.error('Error loading SSH credential:', error);
      return null;
    }
  }

  /**
   * Update last used timestamp for a credential
   */
  async updateLastUsed(id: string): Promise<void> {
    try {
      const credentials = await this.getAllCredentials();
      const updatedCredentials = credentials.map(cred =>
        cred.id === id ? { ...cred, lastUsed: new Date() } : cred
      );

      await SecureStore.setItemAsync(
        SecureCredentialStore.CREDENTIALS_KEY,
        JSON.stringify(updatedCredentials)
      );
    } catch (error) {
      console.error('Error updating last used:', error);
    }
  }

  /**
   * Delete SSH credentials
   */
  async deleteCredentials(id: string): Promise<void> {
    try {
      const credentials = await this.getAllCredentials();
      const filteredCredentials = credentials.filter(cred => cred.id !== id);

      await SecureStore.setItemAsync(
        SecureCredentialStore.CREDENTIALS_KEY,
        JSON.stringify(filteredCredentials)
      );

      // Delete sensitive data
      await SecureStore.deleteItemAsync(`ssh_password_${id}`).catch(() => {});
      await SecureStore.deleteItemAsync(`ssh_key_${id}`).catch(() => {});

      console.log(`Deleted SSH credentials: ${id}`);
    } catch (error) {
      console.error('Error deleting SSH credentials:', error);
      throw new Error('Failed to delete SSH credentials');
    }
  }

  /**
   * Save active connection info
   */
  async setActiveConnection(credentialId: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(
        SecureCredentialStore.ACTIVE_CONNECTION_KEY,
        credentialId
      );
    } catch (error) {
      console.error('Error saving active connection:', error);
    }
  }

  /**
   * Get active connection info
   */
  async getActiveConnection(): Promise<SSHCredentials | null> {
    try {
      const activeId = await SecureStore.getItemAsync(
        SecureCredentialStore.ACTIVE_CONNECTION_KEY
      );
      if (!activeId) return null;

      return await this.getCredentials(activeId);
    } catch (error) {
      console.error('Error loading active connection:', error);
      return null;
    }
  }

  /**
   * Clear active connection
   */
  async clearActiveConnection(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SecureCredentialStore.ACTIVE_CONNECTION_KEY);
    } catch (error) {
      console.error('Error clearing active connection:', error);
    }
  }

  /**
   * Get or create credentials for NVIDIA OCI server
   */
  async getOrCreateDefaultServerCredentials(): Promise<SSHCredentials> {
    const credentials = await this.getAllCredentials();
    const nvidiaCredential = credentials.find(cred =>
      cred.host === 'ssh.nvidia-oci.saturnenterprise.io' &&
      cred.username === 'w-siqim-sc2-68efdcc59f1e49919d7b53423b35bc37'
    );

    if (nvidiaCredential) {
      return await this.getCredentials(nvidiaCredential.id) || nvidiaCredential;
    }

    // Create new NVIDIA OCI server credential with private key
    const newId = await this.saveCredentials({
      name: 'NVIDIA OCI Server',
      host: 'ssh.nvidia-oci.saturnenterprise.io',
      port: '22',
      username: 'w-siqim-sc2-68efdcc59f1e49919d7b53423b35bc37',
      privateKey: `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACB/2lM06lz3YSr2NhZBREQBZoKSOM6muTYcBaSAwHrUjgAAAJhtZv0EbWb9
BAAAAAtzc2gtZWQyNTUxOQAAACB/2lM06lz3YSr2NhZBREQBZoKSOM6muTYcBaSAwHrUjg
AAAEAlViWavMFxkbX5kyUDVMMsaWAS1ZF0so8ao7bIo+WtVn/aUzTqXPdhKvY2FkFERAFm
gpI4zqa5NhwFpIDAetSOAAAAFHNpcWkubWlhb0BnYXRlY2guZWR1AQ==
-----END OPENSSH PRIVATE KEY-----`,
      initialPath: '/home/jovyan/shared/siqimiao1/sc/workspace/projects/HEPTv2/src',
    });

    return await this.getCredentials(newId) as SSHCredentials;
  }

  private generateId(): string {
    return `ssh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default new SecureCredentialStore();