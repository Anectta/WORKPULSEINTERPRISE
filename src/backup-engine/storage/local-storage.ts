import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { Readable, pipeline, Transform } from 'node:stream';
import { promisify } from 'node:util';
import * as crypto from 'node:crypto';
import { StorageProvider, StorageItemMetadata, PutStreamOptions, GetStreamOptions } from '../core/contracts.js';
import { StorageCapabilities, LOCAL_STORAGE_CAPABILITIES } from './capabilities.js';
import { StoragePathNormalizer } from './path-normalizer.js';
import { EngineError, ErrorCategory } from '../core/errors.js';

const streamPipeline = promisify(pipeline);

export class LocalStorageProvider implements StorageProvider {
  private readonly rootDirectory: string;

  constructor(rootDirectory: string) {
    this.rootDirectory = path.resolve(rootDirectory);
  }

  public capabilities(): StorageCapabilities {
    return { ...LOCAL_STORAGE_CAPABILITIES };
  }

  private resolveSafePath(relativePath: string): string {
    const normalized = StoragePathNormalizer.normalizeRelativePath(relativePath);
    const resolved = path.resolve(this.rootDirectory, normalized);
    if (!resolved.startsWith(this.rootDirectory)) {
      throw new EngineError({
        code: 'SECURITY_PATH_TRAVERSAL',
        message: `Acesso negado: o caminho "${relativePath}" tenta ultrapassar o diretório raiz do storage.`,
        category: ErrorCategory.STORAGE,
        context: { relativePath, rootDirectory: this.rootDirectory }
      });
    }
    return resolved;
  }

  public async initialize(): Promise<void> {
    try {
      await fsp.mkdir(this.rootDirectory, { recursive: true });
    } catch (err) {
      throw new EngineError({
        code: 'STORAGE_INIT_FAILED',
        message: `Falha ao inicializar o diretório raiz de armazenamento local em: ${this.rootDirectory}`,
        category: ErrorCategory.STORAGE,
        cause: err
      });
    }
  }

  public async connect(): Promise<void> {
    await this.initialize();
  }

  public async disconnect(): Promise<void> {
    await this.close();
  }

  public async validateConnection(): Promise<boolean> {
    try {
      await fsp.access(this.rootDirectory, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  public async exists(targetPath: string): Promise<boolean> {
    const fullPath = this.resolveSafePath(targetPath);
    try {
      await fsp.access(fullPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  public async getMetadata(targetPath: string): Promise<StorageItemMetadata | null> {
    const fullPath = this.resolveSafePath(targetPath);
    try {
      const stats = await fsp.stat(fullPath);
      return {
        path: StoragePathNormalizer.normalizeRelativePath(targetPath),
        sizeBytes: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        isDirectory: stats.isDirectory()
      };
    } catch (err: any) {
      if (err?.code === 'ENOENT') return null;
      throw new EngineError({
        code: 'STORAGE_METADATA_FAILED',
        message: `Erro ao obter metadados do arquivo: ${targetPath}`,
        category: ErrorCategory.STORAGE,
        cause: err
      });
    }
  }

  public async createDirectory(dirPath: string): Promise<void> {
    const fullPath = this.resolveSafePath(dirPath);
    try {
      await fsp.mkdir(fullPath, { recursive: true });
    } catch (err) {
      throw new EngineError({
        code: 'STORAGE_MKDIR_FAILED',
        message: `Não foi possível criar o diretório: ${dirPath}`,
        category: ErrorCategory.STORAGE,
        cause: err
      });
    }
  }

  public async putStream(
    targetPath: string,
    stream: Readable,
    optionsOrSizeHint?: number | PutStreamOptions
  ): Promise<number> {
    const fullPath = this.resolveSafePath(targetPath);
    const parentDir = path.dirname(fullPath);
    await fsp.mkdir(parentDir, { recursive: true });

    const options: PutStreamOptions =
      typeof optionsOrSizeHint === 'number'
        ? { sizeHintBytes: optionsOrSizeHint }
        : optionsOrSizeHint || {};

    // Gravação atômica via arquivo temporário
    const tempPath = `${fullPath}.tmp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const writeStream = fs.createWriteStream(tempPath);

    let bytesWritten = 0;
    const trackingTransform = new Transform({
      transform(chunk, _encoding, callback) {
        bytesWritten += chunk.length;
        if (options.onProgress) {
          options.onProgress(bytesWritten);
        }
        callback(null, chunk);
      }
    });

    try {
      await streamPipeline(stream, trackingTransform, writeStream);
      const stats = await fsp.stat(tempPath);
      await fsp.rename(tempPath, fullPath);
      return stats.size;
    } catch (err) {
      // Limpeza de arquivo temporário caso haja falha
      try {
        await fsp.unlink(tempPath);
      } catch {}
      throw new EngineError({
        code: 'STORAGE_WRITE_FAILED',
        message: `Falha ao gravar arquivo em streaming: ${targetPath}`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
      });
    }
  }

  public async getStream(targetPath: string, options?: GetStreamOptions): Promise<Readable> {
    const fullPath = this.resolveSafePath(targetPath);
    try {
      await fsp.access(fullPath, fs.constants.R_OK);
      const streamOptions: { start?: number; end?: number } = {};
      if (options?.start !== undefined) streamOptions.start = options.start;
      if (options?.end !== undefined) streamOptions.end = options.end;
      return fs.createReadStream(fullPath, streamOptions);
    } catch (err) {
      throw new EngineError({
        code: 'STORAGE_READ_FAILED',
        message: `Não foi possível abrir o arquivo para leitura: ${targetPath}`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
      });
    }
  }

  public async rename(sourcePath: string, destPath: string): Promise<void> {
    const fullSource = this.resolveSafePath(sourcePath);
    const fullDest = this.resolveSafePath(destPath);
    try {
      await fsp.mkdir(path.dirname(fullDest), { recursive: true });
      await fsp.rename(fullSource, fullDest);
    } catch (err) {
      throw new EngineError({
        code: 'STORAGE_RENAME_FAILED',
        message: `Erro ao renomear "${sourcePath}" para "${destPath}"`,
        category: ErrorCategory.STORAGE,
        cause: err
      });
    }
  }

  public async copy(sourcePath: string, destPath: string): Promise<void> {
    const fullSource = this.resolveSafePath(sourcePath);
    const fullDest = this.resolveSafePath(destPath);
    try {
      await fsp.mkdir(path.dirname(fullDest), { recursive: true });
      await fsp.copyFile(fullSource, fullDest);
    } catch (err) {
      throw new EngineError({
        code: 'STORAGE_COPY_FAILED',
        message: `Erro ao copiar "${sourcePath}" para "${destPath}"`,
        category: ErrorCategory.STORAGE,
        cause: err
      });
    }
  }

  public async delete(targetPath: string): Promise<void> {
    const fullPath = this.resolveSafePath(targetPath);
    try {
      const stats = await fsp.stat(fullPath);
      if (stats.isDirectory()) {
        await fsp.rm(fullPath, { recursive: true, force: true });
      } else {
        await fsp.unlink(fullPath);
      }
    } catch (err: any) {
      if (err?.code === 'ENOENT') return;
      throw new EngineError({
        code: 'STORAGE_DELETE_FAILED',
        message: `Erro ao excluir recurso: ${targetPath}`,
        category: ErrorCategory.STORAGE,
        cause: err
      });
    }
  }

  public async listDirectory(prefix: string): Promise<StorageItemMetadata[]> {
    const fullPath = this.resolveSafePath(prefix);
    try {
      const exists = await this.exists(prefix);
      if (!exists) return [];
      const entries = await fsp.readdir(fullPath, { withFileTypes: true });
      const results: StorageItemMetadata[] = [];
      for (const entry of entries) {
        const itemFullPath = path.join(fullPath, entry.name);
        const stats = await fsp.stat(itemFullPath);
        results.push({
          path: StoragePathNormalizer.join(prefix, entry.name),
          sizeBytes: stats.size,
          modifiedAt: stats.mtime.toISOString(),
          isDirectory: entry.isDirectory()
        });
      }
      return results;
    } catch (err) {
      throw new EngineError({
        code: 'STORAGE_LIST_FAILED',
        message: `Falha ao listar diretório: ${prefix}`,
        category: ErrorCategory.STORAGE,
        cause: err
      });
    }
  }

  public async close(): Promise<void> {
    // No-op para filesystem local
  }
}
