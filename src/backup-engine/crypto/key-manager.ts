import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { KdfAlgorithm, KdfParameters, KeyDerivationProvider } from './contracts.js';
import { Argon2idKeyDerivationProvider, Pbkdf2KeyDerivationProvider } from './kdf-provider.js';
import { EngineError, ErrorCategory } from '../core/errors.js';

export interface WrappedDekResult {
  wrappedDekHex: string;
  wrappedDekIvHex: string;
  wrappedDekTagHex: string;
}

export interface DerivedKekResult {
  kek: Buffer;
  saltHex: string;
  kdfParams: KdfParameters;
}

/**
 * Gerenciador de Chaves Criptográficas (DEK + KEK)
 * Implementa a arquitetura de envelope seguro (Key Wrapping)
 */
export class KeyManager {
  private readonly argonProvider: KeyDerivationProvider;
  private readonly pbkdf2Provider: KeyDerivationProvider;

  constructor(customArgon?: KeyDerivationProvider, customPbkdf2?: KeyDerivationProvider) {
    this.argonProvider = customArgon ?? new Argon2idKeyDerivationProvider();
    this.pbkdf2Provider = customPbkdf2 ?? new Pbkdf2KeyDerivationProvider();
  }

  /**
   * Gera uma chave de criptografia de dados (DEK) aleatória e única de 256 bits (32 bytes)
   */
  public generateDek(): Buffer {
    return randomBytes(32);
  }

  /**
   * Gera um Salt criptográfico aleatório único (mínimo 32 bytes)
   * NUNCA reaproveita salts nem utiliza senhas/ids estáticos
   */
  public generateSalt(length = 32): Buffer {
    return randomBytes(length);
  }

  /**
   * Deriva a Key Encryption Key (KEK) a partir da senha do usuário
   */
  public async deriveKek(
    password: string,
    algorithm: KdfAlgorithm = 'ARGON2ID',
    salt?: Buffer,
    customParams?: any
  ): Promise<DerivedKekResult> {
    const saltToUse = salt ?? this.generateSalt(32);
    const provider = algorithm === 'ARGON2ID' ? this.argonProvider : this.pbkdf2Provider;

    const { key: kek, actualParams } = await provider.deriveKey(password, saltToUse, customParams);

    return {
      kek,
      saltHex: saltToUse.toString('hex'),
      kdfParams: actualParams
    };
  }

  /**
   * Envolve (protege) a DEK criptografando-a com a KEK via AES-256-GCM autenticado
   */
  public wrapDek(dek: Buffer, kek: Buffer): WrappedDekResult {
    if (dek.length !== 32) {
      throw new EngineError({
        code: 'CRYPTO_INVALID_DEK_LENGTH',
        message: `DEK deve ter exatamente 32 bytes (256 bits). Fornecido: ${dek.length}`,
        category: ErrorCategory.VALIDATION
      });
    }

    if (kek.length !== 32) {
      throw new EngineError({
        code: 'CRYPTO_INVALID_KEK_LENGTH',
        message: `KEK deve ter exatamente 32 bytes (256 bits). Fornecido: ${kek.length}`,
        category: ErrorCategory.VALIDATION
      });
    }

    const iv = randomBytes(12); // GCM standard 96-bit nonce
    const cipher = createCipheriv('aes-256-gcm', kek, iv);

    const wrappedDek = Buffer.concat([cipher.update(dek), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      wrappedDekHex: wrappedDek.toString('hex'),
      wrappedDekIvHex: iv.toString('hex'),
      wrappedDekTagHex: tag.toString('hex')
    };
  }

  /**
   * Desenvolve (descriptografa) a DEK utilizando a KEK e validando a Authentication Tag
   * Rejeita instantaneamente senhas incorretas ou adulterações na chave
   */
  public unwrapDek(
    wrappedDekHex: string,
    kek: Buffer,
    wrappedDekIvHex: string,
    wrappedDekTagHex: string
  ): Buffer {
    if (kek.length !== 32) {
      throw new EngineError({
        code: 'CRYPTO_INVALID_KEK_LENGTH',
        message: `KEK deve ter exatamente 32 bytes (256 bits).`,
        category: ErrorCategory.VALIDATION
      });
    }

    try {
      const wrappedDek = Buffer.from(wrappedDekHex, 'hex');
      const iv = Buffer.from(wrappedDekIvHex, 'hex');
      const tag = Buffer.from(wrappedDekTagHex, 'hex');

      if (iv.length !== 12 || tag.length !== 16) {
        throw new Error('Dimensões inválidas para IV (deve ser 12 bytes) ou Tag (deve ser 16 bytes).');
      }

      const decipher = createDecipheriv('aes-256-gcm', kek, iv);
      decipher.setAuthTag(tag);

      const dek = Buffer.concat([decipher.update(wrappedDek), decipher.final()]);

      if (dek.length !== 32) {
        throw new Error('DEK recuperada com tamanho inválido.');
      }

      return dek;
    } catch (err: any) {
      throw new EngineError({
        code: 'CRYPTO_AUTH_FAILED',
        message: 'Falha de autenticação criptográfica: Senha incorreta ou dados do envelope de chave violados.',
        category: ErrorCategory.SECURITY,
        cause: err
      });
    }
  }

  /**
   * Limpa buffers sensíveis na memória preenchendo-os com zeros (Zeroization)
   */
  public destroyKey(keyBuffer?: Buffer | null): void {
    if (keyBuffer && Buffer.isBuffer(keyBuffer)) {
      keyBuffer.fill(0);
    }
  }
}
