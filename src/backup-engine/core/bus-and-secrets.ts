import { EventBus, EngineEvent, ProgressReporter, ProgressReport, SecretStore } from './contracts.js';
import { EngineError, ErrorCategory } from './errors.js';

export class SimpleEventBus implements EventBus {
  private readonly listeners: Array<(event: EngineEvent) => void> = [];

  public publish(event: EngineEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[EventBus] Erro no listener:', err);
      }
    }
  }

  public subscribe(listener: (event: EngineEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
  }
}

export class CallbackProgressReporter implements ProgressReporter {
  constructor(private readonly onProgress: (report: ProgressReport) => void) {}

  public report(progress: ProgressReport): void {
    try {
      this.onProgress(progress);
    } catch (err) {
      console.error('[ProgressReporter] Erro ao reportar progresso:', err);
    }
  }
}

export class InMemorySecretStore implements SecretStore {
  private readonly secrets = new Map<string, string>();

  public async getSecret(key: string): Promise<string | null> {
    return this.secrets.get(key) ?? null;
  }

  public async setSecret(key: string, value: string): Promise<void> {
    if (!key || !value) {
      throw new EngineError({
        code: 'SECRET_INVALID_INPUT',
        message: 'Chave ou valor de segredo inválido.',
        category: ErrorCategory.CONFIGURATION
      });
    }
    this.secrets.set(key, value);
  }

  public async deleteSecret(key: string): Promise<void> {
    this.secrets.delete(key);
  }
}
