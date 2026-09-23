import { EventEmitter } from 'node:events';
import { ResourceMonitor, SystemResourceMetrics } from './resource-monitor.js';
import { ControlPlaneClient } from '../control-plane/client-contract.js';
import { EngineController } from '../engine-bridge/engine-controller.js';

export interface TelemetrySnapshot {
  timestamp: string;
  agentId: string;
  system: SystemResourceMetrics;
  engineStatus: unknown;
}

export class TelemetryService extends EventEmitter {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly agentId: string,
    private readonly controlPlaneClient: ControlPlaneClient,
    private readonly engineController: EngineController,
    private readonly intervalMs: number = 60_000
  ) {
    super();
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.timer = setInterval(async () => {
      try {
        await this.collectAndSend();
      } catch (err: any) {
        this.emit('error', err);
      }
    }, this.intervalMs);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async collectAndSend(): Promise<TelemetrySnapshot> {
    const system = await ResourceMonitor.sampleMetrics();
    let engineStatus: unknown = null;
    try {
      engineStatus = await this.engineController.getStatus();
    } catch {
      engineStatus = { status: 'UNREACHABLE' };
    }

    const snapshot: TelemetrySnapshot = {
      timestamp: new Date().toISOString(),
      agentId: this.agentId,
      system,
      engineStatus
    };

    await this.controlPlaneClient.sendTelemetry(snapshot);
    this.emit('telemetry_sent', snapshot);
    return snapshot;
  }
}
