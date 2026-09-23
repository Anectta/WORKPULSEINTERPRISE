import { Readable, PassThrough } from 'node:stream';
import { createHash } from 'node:crypto';
import { CompressionAlgorithm, CompressionProvider, CompressionResult, CompressionStreamHandle } from './contracts.js';
import { CancellationToken } from '../core/errors.js';

/**
 * Provedor de compressão nula (Pass-Through) para quando compressão estiver desabilitada
 */
export class NoopCompressionProvider implements CompressionProvider {
  public readonly algorithm: CompressionAlgorithm = 'NONE';

  public async compressBuffer(data: Buffer): Promise<Buffer> {
    return Buffer.from(data);
  }

  public async decompressBuffer(data: Buffer): Promise<Buffer> {
    return Buffer.from(data);
  }

  public async compressStream(
    input: Readable,
    options?: { cancellationToken?: CancellationToken }
  ): Promise<CompressionStreamHandle> {
    const token = options?.cancellationToken;
    const startTime = Date.now();
    const hasher = createHash('sha256');

    let sizeBytes = 0;

    let resolveResult!: (res: CompressionResult) => void;
    let rejectResult!: (err: Error) => void;
    const resultPromise = new Promise<CompressionResult>((resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    });
    resultPromise.catch(() => {});

    const pass = new PassThrough();

    input.on('data', (chunk: Buffer) => {
      if (token?.isCancelled) {
        const err = token.toEngineError();
        pass.destroy(err);
        rejectResult(err);
        return;
      }
      hasher.update(chunk);
      sizeBytes += chunk.length;
    });

    input.on('end', () => {
      const hash = hasher.digest('hex');
      resolveResult({
        algorithm: 'NONE',
        originalSizeBytes: sizeBytes,
        compressedSizeBytes: sizeBytes,
        compressionRatio: 1.0,
        durationMs: Date.now() - startTime,
        originalSha256: hash,
        compressedSha256: hash
      });
    });

    input.on('error', (err) => {
      pass.destroy(err);
      rejectResult(err);
    });

    return {
      stream: input.pipe(pass),
      getResult: () => resultPromise
    };
  }

  public async decompressStream(input: Readable): Promise<Readable> {
    const pass = new PassThrough();
    return input.pipe(pass);
  }
}
