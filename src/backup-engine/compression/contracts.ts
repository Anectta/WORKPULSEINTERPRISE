import { Readable } from 'node:stream';
import { CancellationToken } from '../core/errors.js';

/**
 * Algoritmos de compressão suportados pelo Backup Engine
 */
export type CompressionAlgorithm = 'ZSTD' | 'ZIP' | 'DEFLATE' | 'NONE';

/**
 * Configuração do provedor de compressão
 */
export interface CompressionConfig {
  algorithm: CompressionAlgorithm;
  level?: number; // Ex: 1-22 para ZSTD, 1-9 para ZIP/DEFLATE
  chunkSize?: number; // Tamanho de bloco para streaming (default: 64KB)
}

/**
 * Resultado detalhado de uma operação de compressão
 */
export interface CompressionResult {
  algorithm: CompressionAlgorithm;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatio: number; // Ex: 0.45 significa que o arquivo comprimido tem 45% do tamanho original
  durationMs: number;
  originalSha256: string;
  compressedSha256: string;
}

/**
 * Resultado de um fluxo de compressão por streaming
 */
export interface CompressionStreamHandle {
  stream: Readable;
  getResult(): Promise<CompressionResult>;
}

/**
 * Interface abstrata do Provedor de Compressão
 * Equivalente a: trait CompressionProvider
 */
export interface CompressionProvider {
  readonly algorithm: CompressionAlgorithm;

  /**
   * Comprime um fluxo de dados de forma assíncrona com backpressure e baixo consumo de memória
   */
  compressStream(
    input: Readable,
    options?: { level?: number; cancellationToken?: CancellationToken }
  ): Promise<CompressionStreamHandle>;

  /**
   * Descomprime um fluxo de dados de forma assíncrona
   */
  decompressStream(
    input: Readable,
    options?: { cancellationToken?: CancellationToken }
  ): Promise<Readable>;

  /**
   * Comprime um buffer em memória (útil para blocos e metadados pequenos)
   */
  compressBuffer(data: Buffer, options?: { level?: number }): Promise<Buffer>;

  /**
   * Descomprime um buffer em memória
   */
  decompressBuffer(data: Buffer): Promise<Buffer>;
}
