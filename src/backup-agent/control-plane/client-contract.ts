import { RemoteCommand, CommandResult } from '../domain/commands.js';

export interface ControlPlaneClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  sendHeartbeat(payload: unknown): Promise<void>;
  sendEvent(action: string, payload: unknown): Promise<void>;
  sendTelemetry(metrics: unknown): Promise<void>;
  sendCommandResult(result: CommandResult): Promise<void>;
  onCommand(handler: (command: RemoteCommand) => Promise<void>): void;
}
