import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { AgentConfig, getDefaultAgentConfig } from '../domain/config.js';
import { AtomicFileStore } from '../persistence/file-store.js';

export interface ConfigSyncResult {
  applied: boolean;
  version: number;
  checksum: string;
  error?: string;
}

export class ConfigurationManager extends EventEmitter {
  private readonly configFilePath: string;
  private currentConfig: AgentConfig;
  private isLoaded = false;

  constructor(private readonly dataDir: string) {
    super();
    this.configFilePath = path.join(dataDir, 'agent-config.json');
    this.currentConfig = getDefaultAgentConfig(dataDir);
  }

  public async init(): Promise<AgentConfig> {
    if (this.isLoaded) return this.currentConfig;

    const loaded = await AtomicFileStore.readJson<AgentConfig>(this.configFilePath);
    if (loaded && this.validateConfig(loaded).valid) {
      this.currentConfig = loaded;
    } else {
      await this.persistConfig(this.currentConfig);
    }
    this.isLoaded = true;
    return this.currentConfig;
  }

  public getConfig(): AgentConfig {
    return { ...this.currentConfig };
  }

  /**
   * Sincronização em 2 fases:
   * 1. Validate
   * 2. Persist to Disk (.tmp -> rename)
   * 3. Commit in Memory
   * 4. Apply & Notify
   */
  public async syncRemoteConfiguration(newConfigRaw: Partial<AgentConfig>): Promise<ConfigSyncResult> {
    await this.init();

    // 1. Validação Semântica
    const candidate: AgentConfig = {
      ...this.currentConfig,
      ...newConfigRaw,
      updatedAt: new Date().toISOString()
    };

    const validation = this.validateConfig(candidate);
    if (!validation.valid) {
      this.emit('sync_rejected', { reason: validation.reason });
      return {
        applied: false,
        version: this.currentConfig.configurationVersion,
        checksum: this.currentConfig.checksum || '',
        error: `Configuração rejeitada: ${validation.reason}`
      };
    }

    // Calcula checksum SHA256 da nova configuração
    const canonicalJson = JSON.stringify(candidate);
    const checksum = crypto.createHash('sha256').update(canonicalJson).digest('hex');
    candidate.checksum = checksum;

    try {
      // 2. Persistência Atômica no Disco
      await this.persistConfig(candidate);

      // 3. Commit
      const oldVersion = this.currentConfig.configurationVersion;
      this.currentConfig = candidate;

      // 4. Emissão de evento de aplicação
      this.emit('config_updated', {
        oldVersion,
        newVersion: candidate.configurationVersion,
        checksum
      });

      return {
        applied: true,
        version: candidate.configurationVersion,
        checksum
      };
    } catch (err: any) {
      this.emit('sync_failed', { error: err.message });
      return {
        applied: false,
        version: this.currentConfig.configurationVersion,
        checksum: this.currentConfig.checksum || '',
        error: `Falha ao persistir configuração: ${err.message}`
      };
    }
  }

  private validateConfig(config: AgentConfig): { valid: boolean; reason?: string } {
    if (typeof config.heartbeatIntervalMs !== 'number' || config.heartbeatIntervalMs < 1000) {
      return { valid: false, reason: 'heartbeatIntervalMs deve ser número >= 1000ms' };
    }

    if (typeof config.telemetryIntervalMs !== 'number' || config.telemetryIntervalMs < 5000) {
      return { valid: false, reason: 'telemetryIntervalMs deve ser número >= 5000ms' };
    }

    if (!config.controlPlaneUrl || !config.controlPlaneUrl.startsWith('ws')) {
      return { valid: false, reason: 'controlPlaneUrl inválida (deve iniciar com ws:// ou wss://)' };
    }

    if (typeof config.configurationVersion !== 'number' || config.configurationVersion < 1) {
      return { valid: false, reason: 'configurationVersion deve ser inteiro >= 1' };
    }

    return { valid: true };
  }

  private async persistConfig(config: AgentConfig): Promise<void> {
    await AtomicFileStore.writeJsonAtomic(this.configFilePath, config);
  }
}
