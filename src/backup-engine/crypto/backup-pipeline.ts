import { Readable, PassThrough, Transform } from 'node:stream';
import { createHash } from 'node:crypto';
import { CompressionConfig, CompressionProvider } from '../compression/contracts.js';
import { CompressionProviderFactory } from '../compression/factory.js';
import {
  EncryptedContainerHeader,
  EncryptionAlgorithm,
  KdfAlgorithm,
  PipelineIntegrityMetrics
} from './contracts.js';
import { KeyManager } from './key-manager.js';
import { AesGcmEncryptionProvider } from './aes-gcm-provider.js';
import { DefaultIntegrityProvider } from './integrity-provider.js';
import { CancellationToken, EngineError, ErrorCategory } from '../core/errors.js';

export interface ProtectPipelineOptions {
  password?: string;
  keyId?: string;
  kdfAlgorithm?: KdfAlgorithm;
  kdfParams?: any;
  compressionConfig?: CompressionConfig;
  encryptionAlgorithm?: EncryptionAlgorithm;
  originalSizeBytes?: number;
  originalSha256?: string;
  cancellationToken?: CancellationToken;
}

export interface ProtectPipelineResult {
  protectedStream: Readable;
  getHeader(): Promise<EncryptedContainerHeader | null>;
  getMetrics(): Promise<PipelineIntegrityMetrics>;
}

export interface RestorePipelineResult {
  restoredStream: Readable;
  header: EncryptedContainerHeader | null;
  verifyOriginalIntegrity(): Promise<{ verified: boolean; originalSha256: string; restoredSha256: string }>;
}

/**
 * Orquestrador do Pipeline Criptográfico e de Compressão do Backup Engine
 * Executa a sequência padrão: Original -> Hash -> Compressão -> Criptografia -> Hash Protegido
 * E o inverso no Restore: Storage -> Decrypt -> Decompress -> Hash -> Destino
 */
export class BackupPipelineManager {
  private readonly keyManager: KeyManager;
  private readonly aesGcmProvider: AesGcmEncryptionProvider;
  private readonly integrityProvider: DefaultIntegrityProvider;

  constructor(keyManager?: KeyManager) {
    this.keyManager = keyManager ?? new KeyManager();
    this.aesGcmProvider = new AesGcmEncryptionProvider();
    this.integrityProvider = new DefaultIntegrityProvider();
  }

  /**
   * Pipeline de Proteção (Backup)
   */
  public async protectStream(
    input: Readable,
    options: ProtectPipelineOptions
  ): Promise<ProtectPipelineResult> {
    const token = options.cancellationToken;
    const compression = CompressionProviderFactory.getProvider(options.compressionConfig);
    const encryptionEnabled = (options.encryptionAlgorithm ?? 'AES_256_GCM') === 'AES_256_GCM' && !!options.password;

    // 1. Leitura por stream com cálculo do Hash Original em tempo real
    const originalHasher = createHash('sha256');
    let originalSizeBytes = 0;

    const originalHashStream = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        if (token?.isCancelled) {
          callback(token.toEngineError());
          return;
        }
        originalHasher.update(chunk);
        originalSizeBytes += chunk.length;
        callback(null, chunk);
      }
    });
    originalHashStream.on('error', () => {});
    const hookedInput = input.pipe(originalHashStream);

    // 2. Compressão
    const compHandle = await compression.compressStream(hookedInput, {
      level: options.compressionConfig?.level,
      cancellationToken: token
    });

    // Se criptografia não for solicitada, retorna fluxo comprimido com métricas
    if (!encryptionEnabled) {
      let resolveMetrics!: (m: PipelineIntegrityMetrics) => void;
      const metricsPromise = new Promise<PipelineIntegrityMetrics>((resolve) => {
        resolveMetrics = resolve;
      });

      const encryptedHasher = createHash('sha256');
      let protectedBytes = 0;

      const passthrough = new PassThrough();
      compHandle.stream.on('data', (c: Buffer) => {
        encryptedHasher.update(c);
        protectedBytes += c.length;
      });
      compHandle.stream.on('end', async () => {
        const compRes = await compHandle.getResult();
        resolveMetrics({
          originalSha256: compRes.originalSha256,
          compressedSha256: compRes.compressedSha256,
          encryptedSha256: encryptedHasher.digest('hex'),
          totalChunks: 1,
          totalEncryptedSizeBytes: protectedBytes
        });
      });

      return {
        protectedStream: compHandle.stream.pipe(passthrough),
        getHeader: async () => null,
        getMetrics: () => metricsPromise
      };
    }

    // 3. Derivação de Chaves (KEK + DEK)
    const kdfAlgo = options.kdfAlgorithm ?? 'ARGON2ID';
    const { kek, saltHex, kdfParams } = await this.keyManager.deriveKek(
      options.password!,
      kdfAlgo,
      undefined,
      options.kdfParams
    );

    const dek = this.keyManager.generateDek();
    const wrappedDekInfo = this.keyManager.wrapDek(dek, kek);

    // 4. Criptografia AES-256-GCM em streaming por chunks
    const keyId = options.keyId ?? crypto.randomUUID();

    const encHandle = await this.aesGcmProvider.encryptStream(
      compHandle.stream,
      dek,
      {
        algorithm: 'AES_256_GCM',
        keyId,
        kdf: kdfParams,
        saltHex,
        chunkSizeBytes: options.compressionConfig?.chunkSize ?? 64 * 1024,
        originalSizeBytes: options.originalSizeBytes ?? 0,
        originalSha256: options.originalSha256 || '',
        compressionAlgorithm: options.compressionConfig?.algorithm ?? 'NONE',
        compressionLevel: options.compressionConfig?.level,
        createdAt: new Date().toISOString()
      },
      wrappedDekInfo,
      { cancellationToken: token }
    );

    // Destrói buffers das chaves em memória assim que o setup inicial do cipher estiver pronto
    // (Nota: o cipher interno do node já importou os bytes necessários)
    this.keyManager.destroyKey(kek);

    return {
      protectedStream: encHandle.stream,
      getHeader: () => encHandle.getHeader(),
      getMetrics: async () => {
        const compRes = await compHandle.getResult();
        const metrics = await encHandle.getMetrics();
        // Vincula o hash original medido
        metrics.originalSha256 = compRes.originalSha256;
        metrics.compressedSha256 = compRes.compressedSha256;
        return metrics;
      }
    };
  }

  /**
   * Pipeline de Restauração (Restore)
   */
  public async restoreStream(
    protectedStream: Readable,
    passwordOrKek?: string | Buffer,
    options?: { cancellationToken?: CancellationToken }
  ): Promise<RestorePipelineResult> {
    const token = options?.cancellationToken;

    const { header, payloadStream } = await this.aesGcmProvider.extractHeader(protectedStream);

    if (!passwordOrKek) {
      throw new EngineError({
        code: 'CRYPTO_PASSWORD_REQUIRED',
        message: 'O arquivo está protegido com criptografia AES-256-GCM. Uma senha ou chave é obrigatória para restaurar.',
        category: ErrorCategory.VALIDATION
      });
    }

    // Deriva a KEK e desenrola a DEK
    let kek: Buffer;
    if (typeof passwordOrKek === 'string') {
      const kdfAlgo = header.kdf.type;
      const salt = Buffer.from(header.saltHex, 'hex');
      const kdfParams = header.kdf.params;
      const derived = await this.keyManager.deriveKek(passwordOrKek, kdfAlgo, salt, kdfParams);
      kek = derived.kek;
    } else {
      kek = passwordOrKek;
    }

    const dek = this.keyManager.unwrapDek(
      header.wrappedDekHex,
      kek,
      header.wrappedDekIvHex,
      header.wrappedDekTagHex
    );

    // Descriptografia em streaming por blocos com AEAD
    const decryptedStream = this.aesGcmProvider.decryptChunks(
      payloadStream,
      dek,
      { cancellationToken: token }
    );

    // Descompressão
    const compProvider = CompressionProviderFactory.getProvider({
      algorithm: header.compressionAlgorithm ?? 'NONE'
    });
    const decompressedStream = await compProvider.decompressStream(decryptedStream, {
      cancellationToken: token
    });

    // Hash final para verificação de integridade ponta a ponta
    const finalHasher = createHash('sha256');
    const finalStream = new PassThrough();

    decompressedStream.on('data', (c: Buffer) => finalHasher.update(c));
    decompressedStream.pipe(finalStream);

    return {
      restoredStream: finalStream,
      header,
      verifyOriginalIntegrity: async () => {
        if (!finalStream.readableEnded) {
          await new Promise((resolve, reject) => {
            finalStream.once('end', resolve);
            finalStream.once('error', reject);
          });
        }
        const actualSha256 = finalHasher.digest('hex');
        const expected = header.originalSha256;
        const passed = !expected || this.integrityProvider.verifySha256(expected, actualSha256);

        if (!passed) {
          throw new EngineError({
            code: 'INTEGRITY_CHECKSUM_MISMATCH',
            message: `Falha na verificação de integridade da restauração: esperado ${expected}, obtido ${actualSha256}`,
            category: ErrorCategory.CORRUPTION
          });
        }

        return {
          verified: passed,
          originalSha256: expected,
          restoredSha256: actualSha256
        };
      }
    };
  }
}
