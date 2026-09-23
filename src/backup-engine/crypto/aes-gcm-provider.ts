import { Readable, Transform, PassThrough } from 'node:stream';
import { randomBytes, createCipheriv, createDecipheriv, createHash, createHmac } from 'node:crypto';
import {
  EncryptedContainerHeader,
  EncryptedStreamHandle,
  EncryptionAlgorithm,
  EncryptionProvider,
  PipelineIntegrityMetrics
} from './contracts.js';
import { CancellationToken, EngineError, ErrorCategory } from '../core/errors.js';

export const WPBK_MAGIC = 'WPBK';
export const WPBK_VERSION = 1;

/**
 * Provedor de Criptografia Autenticada AES-256-GCM
 * Formato de container versionado com streaming por chunks, nonces únicos e detecção de violação/truncamento
 */
export class AesGcmEncryptionProvider implements EncryptionProvider {
  public readonly algorithm: EncryptionAlgorithm = 'AES_256_GCM';
  private readonly defaultChunkSize: number;

  constructor(defaultChunkSize = 64 * 1024) {
    this.defaultChunkSize = defaultChunkSize;
  }

  public async encryptStream(
    input: Readable,
    dek: Buffer,
    headerMetadata: Omit<EncryptedContainerHeader, 'magic' | 'formatVersion' | 'wrappedDekHex' | 'wrappedDekIvHex' | 'wrappedDekTagHex'>,
    wrappedDekInfo: { wrappedDekHex: string; wrappedDekIvHex: string; wrappedDekTagHex: string },
    options?: { cancellationToken?: CancellationToken }
  ): Promise<EncryptedStreamHandle> {
    if (dek.length !== 32) {
      throw new EngineError({
        code: 'CRYPTO_INVALID_KEY_LENGTH',
        message: 'A chave DEK para AES-256-GCM deve possuir exatamente 32 bytes.',
        category: ErrorCategory.VALIDATION
      });
    }

    const token = options?.cancellationToken;
    const chunkSize = headerMetadata.chunkSizeBytes || this.defaultChunkSize;

    const fullHeader: EncryptedContainerHeader = {
      magic: WPBK_MAGIC,
      formatVersion: WPBK_VERSION,
      algorithm: 'AES_256_GCM',
      keyId: headerMetadata.keyId,
      kdf: headerMetadata.kdf,
      saltHex: headerMetadata.saltHex,
      wrappedDekHex: wrappedDekInfo.wrappedDekHex,
      wrappedDekIvHex: wrappedDekInfo.wrappedDekIvHex,
      wrappedDekTagHex: wrappedDekInfo.wrappedDekTagHex,
      chunkSizeBytes: chunkSize,
      originalSizeBytes: headerMetadata.originalSizeBytes,
      originalSha256: headerMetadata.originalSha256,
      compressedSizeBytes: headerMetadata.compressedSizeBytes,
      compressedSha256: headerMetadata.compressedSha256,
      compressionAlgorithm: headerMetadata.compressionAlgorithm,
      compressionLevel: headerMetadata.compressionLevel,
      createdAt: headerMetadata.createdAt || new Date().toISOString()
    };

    let resolveHeader!: (h: EncryptedContainerHeader) => void;
    let rejectHeader!: (err: Error) => void;
    const headerPromise = new Promise<EncryptedContainerHeader>((resolve, reject) => {
      resolveHeader = resolve;
      rejectHeader = reject;
    });
    headerPromise.catch(() => {});

    let resolveMetrics!: (m: PipelineIntegrityMetrics) => void;
    let rejectMetrics!: (err: Error) => void;
    const metricsPromise = new Promise<PipelineIntegrityMetrics>((resolve, reject) => {
      resolveMetrics = resolve;
      rejectMetrics = reject;
    });
    metricsPromise.catch(() => {});

    const encryptedHasher = createHash('sha256');
    let totalEncryptedBytes = 0;
    let totalChunksCount = 0;

    let bufferAcc = Buffer.alloc(0);
    let chunkIndex = 0;
    let headerEmitted = false;

    const emitHeaderBlock = (transform: Transform): void => {
      const headerJson = JSON.stringify(fullHeader);
      const headerBuf = Buffer.from(headerJson, 'utf8');

      // Proteção do cabeçalho com tag HMAC-SHA256 usando a DEK
      const headerTag = createHmac('sha256', dek).update(headerBuf).digest().subarray(0, 16);

      // Estrutura do Header Container:
      // [4 bytes MAGIC ('WPBK')] [2 bytes VERSION (1)] [4 bytes uint32 headerLen] [headerBuf] [16 bytes headerTag]
      const prefix = Buffer.alloc(10);
      prefix.write(WPBK_MAGIC, 0, 4, 'ascii');
      prefix.writeUInt16BE(WPBK_VERSION, 4);
      prefix.writeUInt32BE(headerBuf.length, 6);

      const fullHeaderBytes = Buffer.concat([prefix, headerBuf, headerTag]);
      encryptedHasher.update(fullHeaderBytes);
      totalEncryptedBytes += fullHeaderBytes.length;

      transform.push(fullHeaderBytes);
      headerEmitted = true;
      resolveHeader(fullHeader);
    };

    const encryptAndPushChunk = (transform: Transform, plainChunk: Buffer, isLast: boolean): void => {
      // Nonce criptográfico aleatório único de 12 bytes para cada chunk (GCM 96 bits)
      const chunkIv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', dek, chunkIv);

      // Dados adicionais autenticados (AAD): index e flag isLast
      const aad = Buffer.alloc(5);
      aad.writeUInt32BE(chunkIndex, 0);
      aad.writeUInt8(isLast ? 1 : 0, 4);
      cipher.setAAD(aad);

      const cipherText = Buffer.concat([cipher.update(plainChunk), cipher.final()]);
      const authTag = cipher.getAuthTag(); // 16 bytes

      // Estrutura do Chunk:
      // [4 bytes chunkIndex] [1 byte isLast] [4 bytes cipherTextLength] [12 bytes chunkIv] [16 bytes authTag] [cipherText]
      const chunkHeader = Buffer.alloc(4 + 1 + 4 + 12 + 16);
      chunkHeader.writeUInt32BE(chunkIndex, 0);
      chunkHeader.writeUInt8(isLast ? 1 : 0, 4);
      chunkHeader.writeUInt32BE(cipherText.length, 5);
      chunkIv.copy(chunkHeader, 9);
      authTag.copy(chunkHeader, 21);

      const chunkFrame = Buffer.concat([chunkHeader, cipherText]);
      encryptedHasher.update(chunkFrame);
      totalEncryptedBytes += chunkFrame.length;
      totalChunksCount++;
      chunkIndex++;

      transform.push(chunkFrame);
    };

    const transform = new Transform({
      transform(data: Buffer, _enc, callback) {
        if (token?.isCancelled) {
          callback(token.toEngineError());
          return;
        }

        try {
          if (!headerEmitted) {
            emitHeaderBlock(transform);
          }

          bufferAcc = Buffer.concat([bufferAcc, data]);

          while (bufferAcc.length >= chunkSize) {
            const chunkSlice = bufferAcc.subarray(0, chunkSize);
            bufferAcc = bufferAcc.subarray(chunkSize);
            encryptAndPushChunk(transform, chunkSlice, false);
          }

          callback();
        } catch (err: any) {
          callback(err);
        }
      },

      flush(callback) {
        if (token?.isCancelled) {
          callback(token.toEngineError());
          return;
        }

        try {
          if (!headerEmitted) {
            emitHeaderBlock(transform);
          }

          // Se sobrar buffer ou se o arquivo for vazio (0 bytes), emite como último chunk
          encryptAndPushChunk(transform, bufferAcc, true);
          bufferAcc = Buffer.alloc(0);

          const finalEncryptedHash = encryptedHasher.digest('hex');
          resolveMetrics({
            originalSha256: fullHeader.originalSha256,
            compressedSha256: fullHeader.compressedSha256,
            encryptedSha256: finalEncryptedHash,
            totalChunks: totalChunksCount,
            totalEncryptedSizeBytes: totalEncryptedBytes
          });

          callback();
        } catch (err: any) {
          rejectMetrics(err);
          callback(err);
        }
      }
    });

    const safeOutput = new PassThrough();
    let pendingError: Error | null = null;

    transform.on('error', (err) => {
      pendingError = err;
      rejectHeader(err);
      rejectMetrics(err);
      if (safeOutput.listenerCount('error') > 0) {
        safeOutput.destroy(err);
      }
    });

    safeOutput.on('newListener', (event) => {
      if (event === 'error' && pendingError) {
        process.nextTick(() => safeOutput.destroy(pendingError!));
      }
    });

    input.on('error', (err) => {
      rejectHeader(err);
      rejectMetrics(err);
      transform.destroy(err);
    });

    input.pipe(transform).pipe(safeOutput);

    return {
      stream: safeOutput,
      getHeader: () => headerPromise,
      getMetrics: () => metricsPromise
    };
  }

  /**
   * Extrai o cabeçalho WPBK de um stream sem esgotar o payload subsequente
   */
  public async extractHeader(input: Readable): Promise<{ header: EncryptedContainerHeader; payloadStream: Readable }> {
    return new Promise((resolve, reject) => {
      let bufferAcc = Buffer.alloc(0);
      let parsedHeader: EncryptedContainerHeader | null = null;
      const payloadStream = new PassThrough();

      const onData = (chunk: Buffer) => {
        if (!parsedHeader) {
          bufferAcc = Buffer.concat([bufferAcc, chunk]);
          if (bufferAcc.length < 10) return;

          const magic = bufferAcc.toString('ascii', 0, 4);
          if (magic !== WPBK_MAGIC) {
            cleanup();
            reject(
              new EngineError({
                code: 'CRYPTO_INVALID_MAGIC',
                message: `Formato de backup inválido ou corrompido: magic esperado "${WPBK_MAGIC}", encontrado "${magic}".`,
                category: ErrorCategory.CORRUPTION
              })
            );
            return;
          }

          const version = bufferAcc.readUInt16BE(4);
          if (version !== WPBK_VERSION) {
            cleanup();
            reject(
              new EngineError({
                code: 'CRYPTO_UNSUPPORTED_VERSION',
                message: `Versão do formato de backup não suportada: versão ${version}.`,
                category: ErrorCategory.CORRUPTION
              })
            );
            return;
          }

          const headerLen = bufferAcc.readUInt32BE(6);
          const totalHeaderSize = 10 + headerLen + 16;
          if (bufferAcc.length < totalHeaderSize) return;

          const headerBuf = bufferAcc.subarray(10, 10 + headerLen);

          try {
            parsedHeader = JSON.parse(headerBuf.toString('utf8'));
          } catch (err: any) {
            cleanup();
            reject(
              new EngineError({
                code: 'CRYPTO_CORRUPTED_HEADER',
                message: `Cabeçalho JSON corrompido: ${err.message}`,
                category: ErrorCategory.CORRUPTION
              })
            );
            return;
          }

          const remaining = bufferAcc.subarray(totalHeaderSize);
          bufferAcc = Buffer.alloc(0);

          cleanup();

          if (remaining.length > 0) {
            payloadStream.write(remaining);
          }
          input.pipe(payloadStream);

          resolve({ header: parsedHeader!, payloadStream });
        }
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const onEnd = () => {
        if (!parsedHeader) {
          cleanup();
          reject(
            new EngineError({
              code: 'CRYPTO_TRUNCATED_STREAM',
              message: 'Stream terminou antes de completar o cabeçalho WPBK.',
              category: ErrorCategory.CORRUPTION
            })
          );
        }
      };

      const cleanup = () => {
        input.removeListener('data', onData);
        input.removeListener('error', onError);
        input.removeListener('end', onEnd);
      };

      input.on('data', onData);
      input.on('error', onError);
      input.on('end', onEnd);
    });
  }

  /**
   * Descriptografa apenas os blocos (payloadStream) usando a DEK informada
   */
  public decryptChunks(
    payloadStream: Readable,
    dek: Buffer,
    options?: { cancellationToken?: CancellationToken }
  ): Readable {
    if (dek.length !== 32) {
      throw new EngineError({
        code: 'CRYPTO_INVALID_KEY_LENGTH',
        message: 'A chave DEK para AES-256-GCM deve possuir exatamente 32 bytes.',
        category: ErrorCategory.VALIDATION
      });
    }

    const token = options?.cancellationToken;
    let bufferAcc = Buffer.alloc(0);
    let expectedNextChunkIndex = 0;
    let receivedLastChunk = false;

    const transform = new Transform({
      transform(data: Buffer, _enc, callback) {
        if (token?.isCancelled) {
          callback(token.toEngineError());
          return;
        }

        try {
          bufferAcc = Buffer.concat([bufferAcc, data]);

          const CHUNK_HEADER_SIZE = 4 + 1 + 4 + 12 + 16; // 37 bytes
          while (bufferAcc.length >= CHUNK_HEADER_SIZE) {
            const chunkIndex = bufferAcc.readUInt32BE(0);
            const isLast = bufferAcc.readUInt8(4) === 1;
            const cipherTextLen = bufferAcc.readUInt32BE(5);
            const chunkIv = bufferAcc.subarray(9, 21);
            const authTag = bufferAcc.subarray(21, 37);

            const totalChunkSize = CHUNK_HEADER_SIZE + cipherTextLen;
            if (bufferAcc.length < totalChunkSize) {
              break;
            }

            if (chunkIndex !== expectedNextChunkIndex) {
              throw new EngineError({
                code: 'CRYPTO_CHUNK_OUT_OF_ORDER',
                message: `Corrupção na sequência de blocos: esperado chunk #${expectedNextChunkIndex}, recebido chunk #${chunkIndex}.`,
                category: ErrorCategory.CORRUPTION
              });
            }

            const cipherText = bufferAcc.subarray(CHUNK_HEADER_SIZE, totalChunkSize);
            bufferAcc = bufferAcc.subarray(totalChunkSize);

            const decipher = createDecipheriv('aes-256-gcm', dek, chunkIv);
            const aad = Buffer.alloc(5);
            aad.writeUInt32BE(chunkIndex, 0);
            aad.writeUInt8(isLast ? 1 : 0, 4);
            decipher.setAAD(aad);
            decipher.setAuthTag(authTag);

            let plainChunk: Buffer;
            try {
              plainChunk = Buffer.concat([decipher.update(cipherText), decipher.final()]);
            } catch (err: any) {
              throw new EngineError({
                code: 'CRYPTO_TAMPERED_CHUNK',
                message: `Falha de autenticação no bloco #${chunkIndex}: dados corrompidos ou alterados (AEAD tag mismatch).`,
                category: ErrorCategory.CORRUPTION,
                cause: err
              });
            }

            transform.push(plainChunk);
            expectedNextChunkIndex++;

            if (isLast) {
              receivedLastChunk = true;
              break;
            }
          }

          callback();
        } catch (err: any) {
          callback(err);
        }
      },

      flush(callback) {
        if (token?.isCancelled) {
          callback(token.toEngineError());
          return;
        }

        if (!receivedLastChunk) {
          callback(
            new EngineError({
              code: 'CRYPTO_TRUNCATED_STREAM',
              message: 'Arquivo de backup incompleto ou truncado: o bloco final de terminação não foi recebido.',
              category: ErrorCategory.CORRUPTION
            })
          );
          return;
        }

        if (bufferAcc.length > 0) {
          callback(
            new EngineError({
              code: 'CRYPTO_CORRUPTED_TRAILING_BYTES',
              message: `Arquivo contém bytes espúrios não autenticados após o término (${bufferAcc.length} bytes).`,
              category: ErrorCategory.CORRUPTION
            })
          );
          return;
        }

        callback();
      }
    });

    const safeOutput = new PassThrough();
    let pendingError: Error | null = null;

    transform.on('error', (err) => {
      pendingError = err;
      if (safeOutput.listenerCount('error') > 0) {
        safeOutput.destroy(err);
      }
    });

    safeOutput.on('newListener', (event) => {
      if (event === 'error' && pendingError) {
        process.nextTick(() => safeOutput.destroy(pendingError!));
      }
    });

    payloadStream.on('error', (err) => {
      transform.destroy(err);
    });

    payloadStream.pipe(transform).pipe(safeOutput);
    return safeOutput;
  }

  /**
   * Descriptografa um container completo (header + chunks) usando a DEK
   */
  public async decryptStream(
    input: Readable,
    dek: Buffer,
    options?: { cancellationToken?: CancellationToken }
  ): Promise<{ stream: Readable; header: EncryptedContainerHeader }> {
    const { header, payloadStream } = await this.extractHeader(input);
    const stream = this.decryptChunks(payloadStream, dek, options);

    return {
      stream,
      header
    };
  }
}
