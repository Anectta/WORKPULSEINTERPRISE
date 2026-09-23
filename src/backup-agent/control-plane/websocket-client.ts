import WebSocket from 'ws';
import { EventEmitter } from 'node:events';
import { ControlPlaneClient } from './client-contract.js';
import { ReconnectStrategy } from './reconnect-strategy.js';
import { RemoteCommand, CommandResult } from '../domain/commands.js';
import { SpoolQueue } from '../persistence/spool-queue.js';
import { AgentIdentity } from '../domain/identity.js';

export interface WebSocketClientOptions {
  url: string;
  identity: AgentIdentity;
  agentSecret: string;
  spoolQueue: SpoolQueue;
  baseDelayMs?: number;
  maxDelayMs?: number;
  pingIntervalMs?: number;
}

export class WebSocketControlPlaneClient extends EventEmitter implements ControlPlaneClient {
  private ws: WebSocket | null = null;
  private isExplicitDisconnect = false;
  private isConnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private readonly reconnectStrategy: ReconnectStrategy;
  private commandHandler?: (command: RemoteCommand) => Promise<void>;

  constructor(private readonly options: WebSocketClientOptions) {
    super();

    this.reconnectStrategy = new ReconnectStrategy({
      baseDelayMs: options.baseDelayMs || 1000,
      maxDelayMs: options.maxDelayMs || 30000,
      jitterFactor: 0.2
    });
  }

  public async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitDisconnect = false;
    this.isConnecting = true;

    return new Promise((resolve) => {
      try {
        const headers = {
          'x-agent-id': this.options.identity.agentId,
          'x-installation-id': this.options.identity.installationId,
          'x-machine-id': this.options.identity.machineId,
          'x-agent-version': this.options.identity.agentVersion,
          'authorization': `Bearer ${this.options.agentSecret}`
        };

        const ws = new WebSocket(this.options.url, { headers });
        this.ws = ws;

        ws.on('open', async () => {
          this.isConnecting = false;
          this.reconnectStrategy.reset();
          this.startHeartbeat();
          this.emit('connected');

          // Descarrega itens pendentes acumulados no spool offline
          await this.flushOfflineSpool();
          resolve();
        });

        ws.on('message', async (data: WebSocket.RawData) => {
          try {
            const rawStr = data.toString('utf-8');
            const message = JSON.parse(rawStr);

            if (message.type === 'COMMAND' && this.commandHandler) {
              await this.commandHandler(message.command);
            }
          } catch (err: any) {
            this.emit('error', new Error(`Erro ao processar mensagem do Control Plane: ${err.message}`));
          }
        });

        ws.on('close', () => {
          this.stopHeartbeat();
          this.ws = null;
          this.emit('disconnected');
          this.scheduleReconnect();
        });

        ws.on('error', (err) => {
          this.emit('error', err);
          if (this.isConnecting) {
            this.isConnecting = false;
            this.scheduleReconnect();
            resolve();
          }
        });
      } catch (err) {
        this.isConnecting = false;
        this.scheduleReconnect();
        resolve();
      }
    });
  }

  public async disconnect(): Promise<void> {
    this.isExplicitDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public async sendHeartbeat(payload: unknown): Promise<void> {
    await this.sendEnvelope('HEARTBEAT', payload, false);
  }

  public async sendEvent(action: string, payload: unknown): Promise<void> {
    await this.sendEnvelope('EVENT', { action, payload }, true);
  }

  public async sendTelemetry(metrics: unknown): Promise<void> {
    await this.sendEnvelope('TELEMETRY', metrics, true);
  }

  public async sendCommandResult(result: CommandResult): Promise<void> {
    await this.sendEnvelope('COMMAND_RESULT', result, true);
  }

  public onCommand(handler: (command: RemoteCommand) => Promise<void>): void {
    this.commandHandler = handler;
  }

  private async sendEnvelope(type: 'HEARTBEAT' | 'EVENT' | 'TELEMETRY' | 'COMMAND_RESULT', data: unknown, spoolIfOffline: boolean): Promise<void> {
    const envelope = {
      protocolVersion: '1.0.0',
      agentId: this.options.identity.agentId,
      type,
      timestamp: new Date().toISOString(),
      payload: data
    };

    if (this.isConnected()) {
      try {
        this.ws?.send(JSON.stringify(envelope));
        return;
      } catch {}
    }

    // Se offline ou falhou a transmissão em tempo real, enfileira no spool persistente em disco
    if (spoolIfOffline) {
      await this.options.spoolQueue.enqueue(type === 'HEARTBEAT' ? 'EVENT' : type, data);
    }
  }

  private async flushOfflineSpool(): Promise<void> {
    if (!this.isConnected()) return;

    try {
      while (this.isConnected()) {
        const batch = await this.options.spoolQueue.peek(50);
        if (batch.length === 0) break;

        const ackIds: string[] = [];
        for (const item of batch) {
          if (!this.isConnected()) break;

          const envelope = {
            protocolVersion: '1.0.0',
            agentId: this.options.identity.agentId,
            type: item.type,
            timestamp: item.createdAt,
            payload: item.payload,
            isReplayedFromSpool: true
          };

          try {
            this.ws?.send(JSON.stringify(envelope));
            ackIds.push(item.id);
          } catch {
            break;
          }
        }

        if (ackIds.length > 0) {
          await this.options.spoolQueue.acknowledge(ackIds);
        } else {
          break;
        }
      }
    } catch (err: any) {
      this.emit('error', new Error(`Falha ao descarregar spool offline: ${err.message}`));
    }
  }

  private scheduleReconnect(): void {
    if (this.isExplicitDisconnect || this.reconnectTimer) return;

    const delay = this.reconnectStrategy.getNextDelay();
    this.emit('reconnecting', { attempt: this.reconnectStrategy.getAttemptCount(), delayMs: delay });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (!this.isExplicitDisconnect) {
        await this.connect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    const interval = this.options.pingIntervalMs || 25000;
    this.pingTimer = setInterval(() => {
      if (this.isConnected()) {
        try {
          this.ws?.ping();
        } catch {}
      }
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}
