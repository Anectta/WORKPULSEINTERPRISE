import { RemoteCommand, ALLOWED_COMMAND_TYPES } from '../domain/commands.js';
import { TokenManager } from './token-manager.js';

export interface CommandAuthValidationResult {
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export class CommandAuthenticator {
  private static readonly MAX_ALLOWED_FUTURE_SKEW_MS = 5 * 60 * 1000; // 5 minutos

  public static validateCommand(
    command: RemoteCommand,
    expectedAgentId: string,
    secret: string
  ): CommandAuthValidationResult {
    // 1. Validação de Target Agent
    if (!command.targetAgentId || command.targetAgentId !== expectedAgentId) {
      return {
        valid: false,
        errorCode: 'UNAUTHORIZED_TARGET_AGENT',
        errorMessage: `Comando endereçado para o Agent "${command.targetAgentId}", mas este Agent é "${expectedAgentId}".`
      };
    }

    // 2. Validação da Whitelist Estrita de Comandos
    if (!command.commandType || !ALLOWED_COMMAND_TYPES.has(command.commandType)) {
      return {
        valid: false,
        errorCode: 'FORBIDDEN_COMMAND_TYPE',
        errorMessage: `Tipo de comando não autorizado: "${command.commandType}". Execução remota arbitrária é bloqueada por segurança.`
      };
    }

    // 3. Validação de Expiração e Replay
    const now = Date.now();
    const createdTime = new Date(command.createdAt).getTime();
    const expiresTime = new Date(command.expiresAt).getTime();

    if (isNaN(createdTime) || isNaN(expiresTime)) {
      return {
        valid: false,
        errorCode: 'INVALID_TIMESTAMP',
        errorMessage: 'As datas createdAt ou expiresAt do comando são inválidas.'
      };
    }

    // Bloqueia comandos com timestamp no futuro excessivo (relógio desajustado ou manipulação)
    if (createdTime > now + this.MAX_ALLOWED_FUTURE_SKEW_MS) {
      return {
        valid: false,
        errorCode: 'CLOCK_SKEW_EXCESSIVE',
        errorMessage: 'Comando rejeitado: createdAt está excessivamente no futuro.'
      };
    }

    // Bloqueia comandos expirados
    if (now > expiresTime) {
      return {
        valid: false,
        errorCode: 'COMMAND_EXPIRED',
        errorMessage: `Comando expirado em ${command.expiresAt} (horário atual: ${new Date(now).toISOString()}).`
      };
    }

    // 4. Validação da Assinatura HMAC-SHA256
    const payloadToSign = this.buildCanonicalString(command);
    const expectedSignature = TokenManager.signHmacSha256(payloadToSign, secret);

    if (!TokenManager.timingSafeVerify(command.signature, expectedSignature)) {
      return {
        valid: false,
        errorCode: 'INVALID_SIGNATURE',
        errorMessage: 'Assinatura digital do comando é inválida ou foi adulterada.'
      };
    }

    return { valid: true };
  }

  public static buildCanonicalString(command: Omit<RemoteCommand, 'signature'>): string {
    const paramsJson = JSON.stringify(command.parameters || {});
    return `${command.commandId}|${command.targetAgentId}|${command.commandType}|${command.createdAt}|${command.expiresAt}|${paramsJson}`;
  }
}
