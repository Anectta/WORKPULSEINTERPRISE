import { EventEmitter } from 'node:events';
import { HealthService } from './health-service.js';
import { ControlPlaneClient } from '../control-plane/client-contract.js';
import { AgentIdentity } from '../domain/identity.js';
import { EngineSupervisor } from '../engine-bridge/engine-supervisor.js';

export interface HeartbeatPayload {
  agentId: string;
  installationId: string;
  timestamp: string;
  agentVersion: string;
  engineVersion: string;
  health: unknown;
  supervisor: unknown;
}

export class HeartbeatService extends EventEmitter {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly identity: AgentIdentity,
    private readonly healthService: HealthService,
    private readonly supervisor: EngineSupervisor,
    private readonly controlPlaneClient: ControlPlaneClient,
    private readonly intervalMs: number = 30_000
  ) {
    super();
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.timer = setInterval(async () => {
      try {
        await this.sendHeartbeat();
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

  public async sendHeartbeat(): Promise<HeartbeatPayload> {
    const health = await this.healthService.evaluateHealth();
    const supervisor = this.supervisor.getMetrics();

    const payload: HeartbeatPayload = {
      agentId: this.identity.agentId,
      installationId: this.identity.installationId,
      timestamp: new Date().toISOString(),
      agentVersion: this.identity.agentVersion,
      engineVersion: this.identity.engineVersion,
      health,
      supervisor
    };

    await this.controlPlaneClient.sendHeartbeat(payload);
    this.emit('heartbeat_sent', payload);
    return payload;
  }
}
