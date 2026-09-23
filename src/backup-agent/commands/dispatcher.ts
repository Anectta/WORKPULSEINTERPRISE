import { EventEmitter } from 'node:events';
import { RemoteCommand, CommandResult, CommandExecutionStatus } from '../domain/commands.js';
import { CommandAuthenticator } from '../security/command-authenticator.js';
import { CommandDeduplicationStore } from '../persistence/deduplication-store.js';
import { EngineController } from '../engine-bridge/engine-controller.js';
import { ControlPlaneClient } from '../control-plane/client-contract.js';

export class CommandDispatcher extends EventEmitter {
  constructor(
    private readonly expectedAgentId: string,
    private readonly agentSecret: string,
    private readonly dedupStore: CommandDeduplicationStore,
    private readonly engineController: EngineController,
    private readonly controlPlaneClient?: ControlPlaneClient
  ) {
    super();
  }

  public async dispatch(command: RemoteCommand): Promise<CommandResult> {
    this.emit('command_received', { commandId: command.commandId, type: command.commandType });

    // 1. Verificação de Idempotência: já foi executado antes?
    const cachedResult = await this.dedupStore.get(command.commandId);
    if (cachedResult) {
      this.emit('command_duplicate', { commandId: command.commandId, status: cachedResult.status });
      // Retorna imediatamente o resultado anterior sem reexecutar
      return cachedResult;
    }

    // 2. Autenticação & Validação Estrita do Comando (Target, Expiração, Assinatura HMAC, Whitelist)
    const validation = CommandAuthenticator.validateCommand(
      command,
      this.expectedAgentId,
      this.agentSecret
    );

    if (!validation.valid) {
      const rejectedResult: CommandResult = {
        commandId: command.commandId,
        targetAgentId: command.targetAgentId,
        commandType: command.commandType,
        status: CommandExecutionStatus.REJECTED,
        error: `[${validation.errorCode}] ${validation.errorMessage}`,
        completedAt: new Date().toISOString()
      };

      await this.dedupStore.save(rejectedResult);
      if (this.controlPlaneClient) {
        await this.controlPlaneClient.sendCommandResult(rejectedResult);
      }
      this.emit('command_rejected', rejectedResult);
      return rejectedResult;
    }

    // 3. Encaminhamento Seguro ao EngineController
    this.emit('command_started', { commandId: command.commandId, type: command.commandType });
    try {
      const engineOutput = await this.engineController.executeCommand(
        command.commandType,
        command.parameters as Record<string, unknown>
      );

      const successResult: CommandResult = {
        commandId: command.commandId,
        targetAgentId: command.targetAgentId,
        commandType: command.commandType,
        status: CommandExecutionStatus.SUCCESS,
        resultPayload: engineOutput,
        completedAt: new Date().toISOString()
      };

      await this.dedupStore.save(successResult);
      if (this.controlPlaneClient) {
        await this.controlPlaneClient.sendCommandResult(successResult);
      }
      this.emit('command_completed', successResult);
      return successResult;
    } catch (err: any) {
      const failedResult: CommandResult = {
        commandId: command.commandId,
        targetAgentId: command.targetAgentId,
        commandType: command.commandType,
        status: CommandExecutionStatus.FAILED,
        error: err?.message || 'Falha desconhecida na execução do comando pelo Engine.',
        completedAt: new Date().toISOString()
      };

      await this.dedupStore.save(failedResult);
      if (this.controlPlaneClient) {
        await this.controlPlaneClient.sendCommandResult(failedResult);
      }
      this.emit('command_failed', failedResult);
      return failedResult;
    }
  }
}
