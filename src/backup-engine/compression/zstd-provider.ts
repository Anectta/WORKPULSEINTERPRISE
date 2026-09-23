import { Readable, Transform } from 'node:stream';
import { createHash } from 'node:crypto';
import { init as initZstd, compress as zstdCompress, decompress as zstdDecompress } from '@bokuweb/zstd-wasm';
import { CompressionAlgorithm, CompressionProvider, CompressionResult, CompressionStreamHandle } from './contracts.js';
import { CancellationToken, EngineError, ErrorCategory } from '../core/errors.js';

let zstdInitialized = false;
async function ensureZstdInitialized(): Promise<void> {
  if (!zstdInitialized) {
    await initZstd();
    zstdInitialized = true;
  }
}

/**
 * Provedor de Compressão Zstandard (ZSTD) de alto desempenho
 * Baseado no motor oficial Zstandard compilado para WebAssembly
 */
export class ZstdCompressionProvider implements CompressionProvider {
  public readonly algorithm: CompressionAlgorithm = 'ZSTD';
  private readonly defaultLevel: number;
  private readonly chunkSizeBytes: number;

  constructor(options?: { defaultLevel?: number; chunkSizeBytes?: number }) {
    // Nível padrão ZSTD: 3 (ótimo equilíbrio entre velocidade e taxa de compressão)
    this.defaultLevel = options?.defaultLevel ?? 3;
    // Chunk size padrão: 64KB
    this.chunkSizeBytes = options?.chunkSizeBytes ?? 64 * 1024;
  }

  public async compressBuffer(data: Buffer, options?: { level?: number }): Promise<Buffer> {
    await ensureZstdInitialized();
    const level = options?.level ?? this.defaultLevel;
    try {
      const compressed = zstdCompress(data, level);
      return Buffer.from(compressed);
    } catch (err: any) {
      throw new EngineError({
        code: 'COMPRESSION_FAILED',
        message: `Falha ao comprimir buffer via ZSTD (nível ${level}): ${err.message}`,
        category: ErrorCategory.STORAGE,
        cause: err
      });
    }
  }

  public async decompressBuffer(data: Buffer): Promise<Buffer> {
    await ensureZstdInitialized();
    try {
      const decompressed = zstdDecompress(data);
      return Buffer.from(decompressed);
    } catch (err: any) {
      throw new EngineError({
        code: 'DECOMPRESSION_FAILED',
        message: `Falha ao descomprimir buffer ZSTD: arquivo ou bloco corrompido: ${err.message}`,
        category: ErrorCategory.CORRUPTION,
        cause: err
      });
    }
  }

  public async compressStream(
    input: Readable,
    options?: { level?: number; cancellationToken?: CancellationToken }
  ): Promise<CompressionStreamHandle> {
    await ensureZstdInitialized();
    const level = options?.level ?? this.defaultLevel;
    const token = options?.cancellationToken;

    const startTime = Date.now();
    const originalHasher = createHash('sha256');
    const compressedHasher = createHash('sha256');

    let originalSizeBytes = 0;
    let compressedSizeBytes = 0;

    let resolveResult!: (res: CompressionResult) => void;
    let rejectResult!: (err: Error) => void;
    const resultPromise = new Promise<CompressionResult>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });
    resultPromise.catch(() => {});

    let currentAccumulator = Buffer.alloc(0);
    const chunkSize = this.chunkSizeBytes;

    // Transform stream que comprime blocos com bounded-memory e framing seguro
    const transform = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        if (token?.isCancelled) {
          callback(token.toEngineError());
          return;
        }

        try {
          originalHasher.update(chunk);
          originalSizeBytes += chunk.length;

          currentAccumulator = Buffer.concat([currentAccumulator, chunk]);

          while (currentAccumulator.length >= chunkSize) {
            const blockToCompress = currentAccumulator.subarray(0, chunkSize);
            currentAccumulator = currentAccumulator.subarray(chunkSize);

            const compressedBlock = zstdCompress(blockToCompress, level);
            const compBuf = Buffer.from(compressedBlock);

            // Framing do bloco: [4 bytes uint32: originalLen][4 bytes uint32: compLen][compBytes]
            const header = Buffer.alloc(8);
            header.writeUInt32BE(blockToCompress.length, 0);
            header.writeUInt32BE(compBuf.length, 4);

            compressedHasher.update(header);
            compressedHasher.update(compBuf);
            compressedSizeBytes += header.length + compBuf.length;

            transform.push(Buffer.concat([header, compBuf]));
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
          if (currentAccumulator.length > 0) {
            const compressedBlock = zstdCompress(currentAccumulator, level);
            const compBuf = Buffer.from(compressedBlock);

            const header = Buffer.alloc(8);
            header.writeUInt32BE(currentAccumulator.length, 0);
            header.writeUInt32BE(compBuf.length, 4);

            compressedHasher.update(header);
            compressedHasher.update(compBuf);
            compressedSizeBytes += header.length + compBuf.length;

            transform.push(Buffer.concat([header, compBuf]));
            currentAccumulator = Buffer.alloc(0);
          }

          // Bloco terminador: [0, 0] para sinalizar fim de stream
          const trailer = Buffer.alloc(8);
          trailer.writeUInt32BE(0, 0);
          trailer.writeUInt32BE(0, 4);
          compressedHasher.update(trailer);
          compressedSizeBytes += trailer.length;
          transform.push(trailer);

          const durationMs = Date.now() - startTime;
          const ratio = originalSizeBytes > 0 ? compressedSizeBytes / originalSizeBytes : 1.0;

          resolveResult({
            algorithm: 'ZSTD',
            originalSizeBytes,
            compressedSizeBytes,
            compressionRatio: Number(ratio.toFixed(4)),
            durationMs,
            originalSha256: originalHasher.digest('hex'),
            compressedSha256: compressedHasher.digest('hex')
          });

          callback();
        } catch (err: any) {
          rejectResult(err);
          callback(err);
        }
      }
    });

    input.on('error', (err) => {
      rejectResult(err);
      transform.destroy(err);
    });

    const outputStream = input.pipe(transform);

    return {
      stream: outputStream,
      getResult: () => resultPromise
    };
  }

  public async decompressStream(
    input: Readable,
    options?: { cancellationToken?: CancellationToken }
  ): Promise<Readable> {
    await ensureZstdInitialized();
    const token = options?.cancellationToken;

    let bufferAcc = Buffer.alloc(0);

    const transform = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        if (token?.isCancelled) {
          callback(token.toEngineError());
          return;
        }

        try {
          bufferAcc = Buffer.concat([bufferAcc, chunk]);

          while (bufferAcc.length >= 8) {
            const originalLen = bufferAcc.readUInt32BE(0);
            const compLen = bufferAcc.readUInt32BE(4);

            // Terminador
            if (originalLen === 0 && compLen === 0) {
              bufferAcc = bufferAcc.subarray(8);
              break;
            }

            if (bufferAcc.length < 8 + compLen) {
              // Espera chegar mais dados do stream
              break;
            }

            const compData = bufferAcc.subarray(8, 8 + compLen);
            bufferAcc = bufferAcc.subarray(8 + compLen);

            const decompressed = zstdDecompress(compData);
            if (decompressed.length !== originalLen) {
              throw new EngineError({
                code: 'DECOMPRESSION_SIZE_MISMATCH',
                message: `Tamanho descomprimido (${decompressed.length}) não bate com cabeçalho (${originalLen})`,
                category: ErrorCategory.CORRUPTION
              });
            }

            transform.push(Buffer.from(decompressed));
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

        if (bufferAcc.length > 0) {
          callback(
            new EngineError({
              code: 'DECOMPRESSION_UNEXPECTED_EOF',
              message: `Fluxo ZSTD truncado: restaram ${bufferAcc.length} bytes não processados no buffer`,
              category: ErrorCategory.CORRUPTION
            })
          );
          return;
        }

        callback();
      }
    });

    input.on('error', (err) => transform.destroy(err));
    return input.pipe(transform);
  }
}
