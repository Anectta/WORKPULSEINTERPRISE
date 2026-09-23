import { EventEmitter } from 'node:events';
import { EngineProcessManager } from './engine-process-manager.js';
import { EngineProcessState } from '../domain/states.js';

export interface SupervisorMetrics {
  crashCount: number;
  lastCrashAt?: string;
  restartCount: number;
  lastRestartAt?: string;
  isCircuitBreakerTripped: boolean;
  state: EngineProcessState;
}

export class EngineSupervisor extends EventEmitter {
  private static readonly MAX_CRASHES_WINDOW_MS = 60_000; // 1 minuto
  private static readonly MAX_CRASH_COUNT = 5;

  private crashTimestamps: number[] = [];
  private restartCount: number = 0;
  private lastRestartAt?: string;
  private isCircuitBreakerTripped: boolean = false;
  private recoveryTimer: NodeJS.Timeout | null = null;
  private isSupervising: boolean = false;

  constructor(
    private readonly processManager: EngineProcessManager,
    private readonly launcher?: () => Promise<number>
  ) {
    super();

    this.processManager.on('process_crashed', (err) => {
      this.handleProcessCrash(err);
    });
  }

  public async start(): Promise<void> {
    this.isSupervising = true;
    this.isCircuitBreakerTripped = false;
    await this.processManager.startProcess(this.launcher);
  }

  public async stop(): Promise<void> {
    this.isSupervising = false;
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
    await this.processManager.stopProcess();
  }

  public getMetrics(): SupervisorMetrics {
    const status = this.processManager.getStatus();
    return {
      crashCount: this.crashTimestamps.length,
      lastCrashAt: this.crashTimestamps.length > 0 ? new Date(this.crashTimestamps[this.crashTimestamps.length - 1]).toISOString() : undefined,
      restartCount: this.restartCount,
      lastRestartAt: this.lastRestartAt,
      isCircuitBreakerTripped: this.isCircuitBreakerTripped,
      state: this.isCircuitBreakerTripped ? EngineProcessState.STOPPED_FOR_SAFETY : status.state
    };
  }

  public resetCircuitBreaker(): void {
    this.isCircuitBreakerTripped = false;
    this.crashTimestamps = [];
  }

  private async handleProcessCrash(err: Error): Promise<void> {
    if (!this.isSupervising) return;

    const now = Date.now();
    this.crashTimestamps.push(now);
    // Remove crashes fora da janela de 60 segundos
    this.crashTimestamps = this.crashTimestamps.filter(t => now - t <= EngineSupervisor.MAX_CRASHES_WINDOW_MS);

    this.emit('crash_detected', {
      error: err.message,
      crashCount: this.crashTimestamps.length,
      timestamp: new Date(now).toISOString()
    });

    // Verificação de Crash-Loop: Se crasheou mais de 5 vezes na janela de 60s
    if (this.crashTimestamps.length >= EngineSupervisor.MAX_CRASH_COUNT) {
      this.isCircuitBreakerTripped = true;
      this.emit('circuit_breaker_tripped', {
        reason: `Engine encerrou ${this.crashTimestamps.length} vezes em ${EngineSupervisor.MAX_CRASHES_WINDOW_MS / 1000}s. Proteção STOPPED_FOR_SAFETY ativada.`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Calcula backoff exponencial com base no número recente de falhas (1s, 2s, 4s, 8s, 16s)
    const backoffDelayMs = Math.min(1000 * Math.pow(2, this.crashTimestamps.length - 1), 16000);

    this.emit('restarting', { delayMs: backoffDelayMs });

    this.recoveryTimer = setTimeout(async () => {
      if (!this.isSupervising || this.isCircuitBreakerTripped) return;
      try {
        this.restartCount++;
        this.lastRestartAt = new Date().toISOString();
        await this.processManager.startProcess(this.launcher);
        this.emit('restarted', { restartCount: this.restartCount });
      } catch (restartErr: any) {
        this.handleProcessCrash(restartErr);
      }
    }, backoffDelayMs);
  }
}
