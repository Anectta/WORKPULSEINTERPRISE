import { EngineError, ErrorCategory } from '../core/errors.js';

export interface ErrorClassification {
  retryable: boolean;
  reason: string;
  category: ErrorCategory;
  suggestedDelayMs?: number;
}

export class ErrorClassifier {
  /**
   * Códigos de erro de rede e I/O que são inerentemente temporários e elegíveis a retry.
   */
  private static readonly TRANSIENT_ERROR_CODES = new Set<string>([
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'EPIPE',
    'ENOTFOUND',
    'EAI_AGAIN',
    'EBUSY',
    'EAGAIN',
    'EMFILE',
    'ENFILE',
    'NETWORK_TIMEOUT',
    'SOCKET_TIMEOUT',
    'RATE_LIMIT_EXCEEDED',
    'STORAGE_RATE_LIMITED',
    'STORAGE_SERVICE_UNAVAILABLE',
    'STORAGE_TIMEOUT',
    'STORAGE_TEMPORARY_ERROR',
    'S3_SERVICE_UNAVAILABLE',
    'S3_SLOW_DOWN',
    'S3_REQUEST_TIMEOUT',
    'SMB_LOCK_CONFLICT_TEMPORARY',
    'SFTP_CONNECTION_LOST',
    'SFTP_HANDSHAKE_TIMEOUT'
  ]);

  /**
   * Códigos e categorias que JAMAIS devem ser repetidos automaticamente (erros permanentes).
   */
  private static readonly PERMANENT_ERROR_CATEGORIES = new Set<ErrorCategory>([
    ErrorCategory.PERMISSION,
    ErrorCategory.VALIDATION,
    ErrorCategory.CONFIGURATION,
    ErrorCategory.INTEGRITY,
    ErrorCategory.CORRUPTION,
    ErrorCategory.SECURITY,
    ErrorCategory.CANCELLATION
  ]);

  public static classify(error: unknown): ErrorClassification {
    if (!error) {
      return {
        retryable: false,
        reason: 'Erro nulo ou indefinido',
        category: ErrorCategory.INTERNAL
      };
    }

    // Caso seja uma instância de EngineError
    if (error instanceof EngineError) {
      // 1. Verificação explícita de categorias permanentes
      if (this.PERMANENT_ERROR_CATEGORIES.has(error.category)) {
        return {
          retryable: false,
          reason: `Categoria não-recuperável: ${error.category} (${error.code})`,
          category: error.category
        };
      }

      // 2. Se a flag retryable do EngineError foi explicitamente marcada
      if (error.retryable) {
        return {
          retryable: true,
          reason: `EngineError marcado como recuperável: ${error.code}`,
          category: error.category
        };
      }

      // 3. Verifica por código conhecido
      if (this.TRANSIENT_ERROR_CODES.has(error.code)) {
        return {
          retryable: true,
          reason: `Código transitório reconhecido: ${error.code}`,
          category: error.category
        };
      }

      // 4. Categorias transitórias padrão se não proibidas
      if (error.category === ErrorCategory.NETWORK || error.category === ErrorCategory.STORAGE) {
        // Se a mensagem indicar permissão ou credencial, rejeita
        const lowerMsg = (error.message || '').toLowerCase();
        if (
          lowerMsg.includes('access denied') ||
          lowerMsg.includes('permission denied') ||
          lowerMsg.includes('invalid credentials') ||
          lowerMsg.includes('authentication failed') ||
          lowerMsg.includes('no such file or directory')
        ) {
          return {
            retryable: false,
            reason: `Erro permanente em storage/network: ${error.message}`,
            category: error.category
          };
        }

        return {
          retryable: true,
          reason: `Falha temporária em ${error.category}`,
          category: error.category
        };
      }

      return {
        retryable: false,
        reason: `Erro não classificado como transitório: ${error.code}`,
        category: error.category
      };
    }

    // Erros genéricos do Node.js (Error, NodeJS.ErrnoException)
    const errObj = error as { code?: string; message?: string; name?: string };
    const code = errObj.code || '';
    const message = (errObj.message || '').toLowerCase();

    if (code && this.TRANSIENT_ERROR_CODES.has(code)) {
      return {
        retryable: true,
        reason: `Node.js Errno transitório: ${code}`,
        category: ErrorCategory.NETWORK
      };
    }

    // Verificação semântica da mensagem
    if (
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('temporarily unavailable') ||
      message.includes('slowdown') ||
      message.includes('too many requests')
    ) {
      return {
        retryable: true,
        reason: `Mensagem de erro transitória: ${errObj.message}`,
        category: ErrorCategory.NETWORK
      };
    }

    if (
      message.includes('permission denied') ||
      message.includes('eacces') ||
      message.includes('eperm') ||
      message.includes('invalid password') ||
      message.includes('checksum mismatch') ||
      message.includes('corrupt')
    ) {
      return {
        retryable: false,
        reason: `Erro fatal/permanente detectado: ${errObj.message}`,
        category: ErrorCategory.PERMISSION
      };
    }

    return {
      retryable: false,
      reason: `Erro genérico não-recuperável: ${errObj.message || 'desconhecido'}`,
      category: ErrorCategory.INTERNAL
    };
  }
}
