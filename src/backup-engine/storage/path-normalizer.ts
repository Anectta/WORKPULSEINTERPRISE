import * as path from 'node:path';
import { EngineError, ErrorCategory } from '../core/errors.js';

export class StoragePathNormalizer {
  /**
   * Normaliza um caminho relativo para armazenamento interno.
   * Converte barras invertidas para barras normais '/', remove barras duplicadas,
   * normaliza Unicode (NFC), remove prefixos '.' ou '/' e previne path traversal ('..').
   */
  public static normalizeRelativePath(inputPath: string): string {
    if (!inputPath || typeof inputPath !== 'string') {
      return '';
    }

    // Normalização Unicode NFC
    let normalized = inputPath.normalize('NFC');

    // Substitui todas as barras invertidas por barras normais
    normalized = normalized.replace(/\\/g, '/');

    // Remove barras no início e no fim
    normalized = normalized.replace(/^\/+|\/+$/g, '');

    // Divide em segmentos e checa traversal
    const segments = normalized.split('/').filter((s) => s.length > 0 && s !== '.');

    for (const seg of segments) {
      if (seg === '..' || seg.includes('%2e%2e') || seg.includes('%2E%2E')) {
        throw new EngineError({
          code: 'SECURITY_PATH_TRAVERSAL',
          message: `Acesso negado: o caminho "${inputPath}" tenta ultrapassar o diretório raiz do storage (Path Traversal).`,
          category: ErrorCategory.STORAGE,
          context: { inputPath }
        });
      }
    }

    return segments.join('/');
  }

  /**
   * Concatena um prefixo base e um subcaminho garantindo segurança e sem barras duplicadas.
   */
  public static join(base: string, subPath: string): string {
    const normBase = this.normalizeRelativePath(base);
    const normSub = this.normalizeRelativePath(subPath);

    if (!normBase) return normSub;
    if (!normSub) return normBase;

    return `${normBase}/${normSub}`;
  }

  /**
   * Normaliza uma chave de objeto S3 garantindo que não tenha barra inicial
   */
  public static toS3Key(prefix: string | undefined, relativePath: string): string {
    const cleanPath = this.normalizeRelativePath(relativePath);
    if (!prefix) return cleanPath;
    const cleanPrefix = this.normalizeRelativePath(prefix);
    if (!cleanPrefix) return cleanPath;
    return `${cleanPrefix}/${cleanPath}`;
  }

  /**
   * Normaliza caminho SMB (suporta Windows UNC e POSIX)
   */
  public static toSmbPath(server: string, share: string, basePath?: string, relativePath?: string): string {
    const cleanServer = server.replace(/^[\\/]+|[\\/]+$/g, '');
    const cleanShare = share.replace(/^[\\/]+|[\\/]+$/g, '');
    const parts = [cleanServer, cleanShare];

    if (basePath) {
      const cleanBase = this.normalizeRelativePath(basePath);
      if (cleanBase) parts.push(cleanBase);
    }
    if (relativePath) {
      const cleanRel = this.normalizeRelativePath(relativePath);
      if (cleanRel) parts.push(cleanRel);
    }

    return `//${parts.join('/')}`;
  }
}
