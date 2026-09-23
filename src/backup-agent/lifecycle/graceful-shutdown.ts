import { AgentRuntime } from './agent-runtime.js';

export class GracefulShutdownManager {
  private static isShuttingDown = false;

  public static register(runtime: AgentRuntime): void {
    const handleSignal = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      try {
        await runtime.stop();
      } catch {}
      process.exit(0);
    };

    process.once('SIGINT', () => handleSignal('SIGINT'));
    process.once('SIGTERM', () => handleSignal('SIGTERM'));

    // Captura exceções não tratadas para garantir log de auditoria antes do encerramento
    process.on('uncaughtException', async () => {
      try {
        await runtime.stop();
      } catch {}
      process.exit(1);
    });
  }
}
