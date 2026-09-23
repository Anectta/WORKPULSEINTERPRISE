import { EventEmitter } from 'node:events';
import { EngineProcessManager } from './engine-process-manager.js';
import { CommandType } from '../domain/commands.js';

export interface EngineExecutionResult {
  success: boolean;
  action: string;
  payload?: unknown;
  error?: string;
}

export class EngineController extends EventEmitter {
  constructor(private readonly processManager: EngineProcessManager) {
    super();

    this.processManager.on('engine_event', (action, payload) => {
      this.emit('event', action, payload);
    });
  }

  public async executeCommand(commandType: CommandType, parameters: Record<string, unknown>): Promise<unknown> {
    const ipcClient = this.processManager.getIpcClient();
    if (!ipcClient || !ipcClient.isReady()) {
      throw new Error(`Engine não está acessível via IPC para executar "${commandType}".`);
    }

    switch (commandType) {
      case CommandType.RUN_BACKUP:
        return await ipcClient.sendCommand('RUN_BACKUP', parameters);

      case CommandType.RUN_RESTORE:
        return await ipcClient.sendCommand('RUN_RESTORE', parameters);

      case CommandType.RUN_MIRROR:
        return await ipcClient.sendCommand('RUN_MIRROR', parameters);

      case CommandType.PAUSE_JOB:
        return await ipcClient.sendCommand('PAUSE_JOB', parameters);

      case CommandType.RESUME_JOB:
        return await ipcClient.sendCommand('RESUME_JOB', parameters);

      case CommandType.CANCEL_JOB:
        return await ipcClient.sendCommand('CANCEL_JOB', parameters);

      case CommandType.VERIFY_BACKUP:
        return await ipcClient.sendCommand('VERIFY_BACKUP', parameters);

      case CommandType.RUN_RETENTION:
        return await ipcClient.sendCommand('RUN_RETENTION', parameters);

      case CommandType.GET_STATUS:
        return await ipcClient.sendCommand('GET_STATUS', parameters);

      case CommandType.GET_HEALTH:
        return await ipcClient.sendCommand('GET_HEALTH', parameters);

      case CommandType.RESTART_ENGINE:
        await this.processManager.restartProcess();
        return { restarted: true };

      default:
        throw new Error(`Comando não implementado pelo EngineController: "${commandType}"`);
    }
  }

  public async getStatus(): Promise<unknown> {
    const ipcClient = this.processManager.getIpcClient();
    if (!ipcClient || !ipcClient.isReady()) {
      return {
        status: 'DISCONNECTED',
        process: this.processManager.getStatus()
      };
    }
    return await ipcClient.sendCommand('GET_STATUS', {});
  }

  public async getHealth(): Promise<unknown> {
    const ipcClient = this.processManager.getIpcClient();
    if (!ipcClient || !ipcClient.isReady()) {
      return {
        healthy: false,
        reason: 'IPC_DISCONNECTED'
      };
    }
    return await ipcClient.sendCommand('GET_HEALTH', {});
  }
}
