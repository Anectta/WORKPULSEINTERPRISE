import { SecretStore } from '../core/contracts.js';

export class InMemorySecretStore implements SecretStore {
  private readonly secrets = new Map<string, string>();

  public async getSecret(key: string): Promise<string | null> {
    return this.secrets.get(key) ?? null;
  }

  public async setSecret(key: string, value: string): Promise<void> {
    this.secrets.set(key, value);
  }

  public async deleteSecret(key: string): Promise<void> {
    this.secrets.delete(key);
  }
}
