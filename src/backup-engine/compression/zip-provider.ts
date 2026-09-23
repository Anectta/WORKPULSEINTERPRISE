import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { createDeflate, createInflate, deflateSync, inflateSync } from 'node:zlib';
import { CompressionAlgorithm, CompressionProvider, CompressionResult, CompressionStreamHandle } from './contracts.js';
import { CancellationToken, EngineError, ErrorCategory } from '../core/errors.js';

/**
 * Provedor de Compressão compatível com ZIP / DEFLATE
 * Utiliza o motor zlib nativo do Node.js para desempenho máximo e baixo uso de memória
 */
export class ZipCompressionProvider implements CompressionProvider {
  public readonly algorithm: CompressionAlgorithm;
  private readonly defaultLevel: number;

  constructor(algorithm: 'ZIP' | 'DEFLATE' = 'DEFLATE', defaultLevel = 6) {
    this.algorithm = algorithm;
    this.defaultLevel = defaultLevel;
  }

  public async compressBuffer(data: Buffer, options?: { level?: number }): Promise<Buffer> {
    const level = options?.level ?? this.defaultLevel;
    try {
      return deflateSync(data, { level });
    } catch (err: any) {
      throw new EngineError({
        code: 'COMPRESSION_FAILED',
        message: `Falha ao comprimir buffer via ${this.algorithm}: ${err.message}`,
        category: ErrorCategory.STORAGE,
        cause: err
      });
    }
  }

  public async decompressBuffer(data: Buffer): Promise<Buffer> {
    try {
      return inflateSync(data);
    } catch (err: any) {
      throw new EngineError({
        code: 'DECOMPRESSION_FAILED',
        message: `Falha ao descomprimir buffer ${this.algorithm} (dados corrompidos): ${err.message}`,
        category: ErrorCategory.CORRUPTION,
        cause: err
      });
    }
  }

  public async compressStream(
    input: Readable,
    options?: { level?: number; cancellationToken?: CancellationToken }
  ): Promise<CompressionStreamHandle> {
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

    const deflateStream = createDeflate({ level });

    input.on('data', (chunk: Buffer) => {
      if (token?.isCancelled) {
        const err = token.toEngineError();
        deflateStream.destroy(err);
        rejectResult(err);
        return;
      }
      originalHasher.update(chunk);
      originalSizeBytes += chunk.length;
    });

    deflateStream.on('data', (chunk: Buffer) => {
      compressedHasher.update(chunk);
      compressedSizeBytes += chunk.length;
    });

    deflateStream.on('end', () => {
      const durationMs = Date.now() - startTime;
      const ratio = originalSizeBytes > 0 ? compressedSizeBytes / originalSizeBytes : 1.0;

      resolveResult({
        algorithm: this.algorithm,
        originalSizeBytes,
        compressedSizeBytes,
        compressionRatio: Number(ratio.toFixed(4)),
        durationMs,
        originalSha256: originalHasher.digest('hex'),
        compressedSha256: compressedHasher.digest('hex')
      });
    });

    deflateStream.on('error', (err) => {
      rejectResult(err);
    });

    input.on('error', (err) => {
      deflateStream.destroy(err);
      rejectResult(err);
    });

    return {
      stream: input.pipe(deflateStream),
      getResult: () => resultPromise
    };
  }

  public async decompressStream(
    input: Readable,
    options?: { cancellationToken?: CancellationToken }
  ): Promise<Readable> {
    const token = options?.cancellationToken;
    const inflateStream = createInflate();

    input.on('data', () => {
      if (token?.isCancelled) {
        inflateStream.destroy(token.toEngineError());
      }
    });

    input.on('error', (err) => inflateStream.destroy(err));
    inflateStream.on('error', (err) => {
      inflateStream.destroy(
        new EngineError({
          code: 'DECOMPRESSION_FAILED',
          message: `Erro ao inflar stream comprimido (${this.algorithm}): ${err.message}`,
          category: ErrorCategory.CORRUPTION,
          cause: err
        })
      );
    });

    return input.pipe(inflateStream);
  }
}
