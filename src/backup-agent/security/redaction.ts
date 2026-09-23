/**
 * Sanitizador de logs e dados para prevenir vazamento de segredos, senhas e tokens
 */
export class LogRedactor {
  private static readonly SENSITIVE_KEYS = new Set([
    'password',
    'pass',
    'secret',
    'token',
    'authorization',
    'auth',
    'privatekey',
    'accesstoken',
    'refreshtoken',
    'apikey',
    'signature',
    'key'
  ]);

  public static redact(data: unknown): unknown {
    if (data === null || data === undefined) return data;

    if (typeof data === 'string') {
      return this.redactString(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.redact(item));
    }

    if (typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        const lowerKey = key.toLowerCase();
        if (this.SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('secret') || lowerKey.includes('password') || lowerKey.includes('token')) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.redact(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  private static redactString(str: string): string {
    // Redige padrões comuns como Bearer tokens e URLs com credenciais
    return str
      .replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer [REDACTED]')
      .replace(/:\/\/[^:]+:[^@]+@/gi, '://[REDACTED]:[REDACTED]@');
  }
}
