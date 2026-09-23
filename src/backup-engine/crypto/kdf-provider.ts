import { pbkdf2 } from 'node:crypto';
import { promisify } from 'node:util';
import { argon2id } from 'hash-wasm';
import {
  Argon2idParams,
  KdfAlgorithm,
  KdfParameters,
  KeyDerivationProvider,
  Pbkdf2Params
} from './contracts.js';
import { EngineError, ErrorCategory } from '../core/errors.js';

const pbkdf2Async = promisify(pbkdf2);

/**
 * Provedor Argon2id (Recomendado para Produção: Resistente a ataques via GPU/ASIC e Side-Channel)
 */
export class Argon2idKeyDerivationProvider implements KeyDerivationProvider {
  public readonly algorithm: KdfAlgorithm = 'ARGON2ID';

  private readonly defaultParams: Argon2idParams = {
    memoryCost: 16384, // 16 MB em KB (equilíbrio entre robustez criptográfica e execução em container)
    timeCost: 3,       // 3 iterações
    parallelism: 1,    // 1 thread
    outputLength: 32   // 256 bits para chave AES-256
  };

  constructor(customDefaults?: Partial<Argon2idParams>) {
    if (customDefaults) {
      this.defaultParams = { ...this.defaultParams, ...customDefaults };
    }
  }

  public async deriveKey(
    password: string,
    salt: Buffer,
    customParams?: Partial<Argon2idParams>
  ): Promise<{ key: Buffer; actualParams: KdfParameters }> {
    if (!password || password.trim().length === 0) {
      throw new EngineError({
        code: 'CRYPTO_INVALID_PASSWORD',
        message: 'A senha para derivação de chave não pode ser vazia.',
        category: ErrorCategory.VALIDATION
      });
    }

    if (!salt || salt.length < 16) {
      throw new EngineError({
        code: 'CRYPTO_INVALID_SALT',
        message: `Salt criptográfico inválido: deve possuir no mínimo 16 bytes. Tamanho fornecido: ${salt?.length ?? 0}`,
        category: ErrorCategory.VALIDATION
      });
    }

    const params: Argon2idParams = {
      memoryCost: customParams?.memoryCost ?? this.defaultParams.memoryCost,
      timeCost: customParams?.timeCost ?? this.defaultParams.timeCost,
      parallelism: customParams?.parallelism ?? this.defaultParams.parallelism,
      outputLength: customParams?.outputLength ?? this.defaultParams.outputLength
    };

    try {
      const derivedBinary = await argon2id({
        password,
        salt: new Uint8Array(salt),
        parallelism: params.parallelism,
        iterations: params.timeCost,
        memorySize: params.memoryCost,
        hashLength: params.outputLength,
        outputType: 'binary'
      });

      return {
        key: Buffer.from(derivedBinary),
        actualParams: {
          type: 'ARGON2ID',
          params
        }
      };
    } catch (err: any) {
      throw new EngineError({
        code: 'KDF_DERIVATION_FAILED',
        message: `Falha ao derivar chave criptográfica com Argon2id: ${err.message}`,
        category: ErrorCategory.SECURITY,
        cause: err
      });
    }
  }
}

/**
 * Provedor PBKDF2 (Padrão de Alta Compatibilidade)
 */
export class Pbkdf2KeyDerivationProvider implements KeyDerivationProvider {
  public readonly algorithm: KdfAlgorithm = 'PBKDF2';

  private readonly defaultParams: Pbkdf2Params = {
    iterations: 100000,
    hashAlgorithm: 'sha256',
    outputLength: 32
  };

  constructor(customDefaults?: Partial<Pbkdf2Params>) {
    if (customDefaults) {
      this.defaultParams = { ...this.defaultParams, ...customDefaults };
    }
  }

  public async deriveKey(
    password: string,
    salt: Buffer,
    customParams?: Partial<Pbkdf2Params>
  ): Promise<{ key: Buffer; actualParams: KdfParameters }> {
    if (!password || password.trim().length === 0) {
      throw new EngineError({
        code: 'CRYPTO_INVALID_PASSWORD',
        message: 'A senha para derivação de chave não pode ser vazia.',
        category: ErrorCategory.VALIDATION
      });
    }

    if (!salt || salt.length < 16) {
      throw new EngineError({
        code: 'CRYPTO_INVALID_SALT',
        message: `Salt criptográfico inválido: deve possuir no mínimo 16 bytes. Tamanho fornecido: ${salt?.length ?? 0}`,
        category: ErrorCategory.VALIDATION
      });
    }

    const params: Pbkdf2Params = {
      iterations: customParams?.iterations ?? this.defaultParams.iterations,
      hashAlgorithm: customParams?.hashAlgorithm ?? this.defaultParams.hashAlgorithm,
      outputLength: customParams?.outputLength ?? this.defaultParams.outputLength
    };

    try {
      const derivedKey = await pbkdf2Async(
        password,
        salt,
        params.iterations,
        params.outputLength,
        params.hashAlgorithm
      );

      return {
        key: derivedKey,
        actualParams: {
          type: 'PBKDF2',
          params
        }
      };
    } catch (err: any) {
      throw new EngineError({
        code: 'KDF_DERIVATION_FAILED',
        message: `Falha ao derivar chave com PBKDF2: ${err.message}`,
        category: ErrorCategory.SECURITY,
        cause: err
      });
    }
  }
}
