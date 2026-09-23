import { CompressionConfig, CompressionProvider } from './contracts.js';
import { ZstdCompressionProvider } from './zstd-provider.js';
import { ZipCompressionProvider } from './zip-provider.js';
import { NoopCompressionProvider } from './noop-provider.js';

/**
 * Fábrica para resolução e instanciação de provedores de compressão
 */
export class CompressionProviderFactory {
  public static getProvider(config?: CompressionConfig): CompressionProvider {
    const algorithm = config?.algorithm ?? 'NONE';

    switch (algorithm) {
      case 'ZSTD':
        return new ZstdCompressionProvider({
          defaultLevel: config?.level ?? 3,
          chunkSizeBytes: config?.chunkSize ?? 64 * 1024
        });

      case 'ZIP':
      case 'DEFLATE':
        return new ZipCompressionProvider(algorithm, config?.level ?? 6);

      case 'NONE':
      default:
        return new NoopCompressionProvider();
    }
  }
}
