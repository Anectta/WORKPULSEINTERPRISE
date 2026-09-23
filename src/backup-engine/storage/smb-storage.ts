import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { Readable, pipeline, Transform } from 'node:stream';
import { promisify } from 'node:util';
import { StorageProvider, StorageItemMetadata, PutStreamOptions, GetStreamOptions } from '../core/contracts.js';
import { StorageCapabilities, SMB_STORAGE_CAPABILITIES } from './capabilities.js';
import { StoragePathNormalizer } from './path-normalizer.js';
import { SmbStorageConfig, SmbStorageCredentials } from './config-and-credentials.js';
import { SecretStore } from '../core/contracts.js';
import { EngineError, ErrorCategory } from '../core/errors.js';

const streamPipeline = promisify(pipeline);

export class SmbStorageProvider implements StorageProvider {
  private readonly config: SmbStorageConfig;
  private readonly secretStore?: SecretStore;
  private readonly secretKeyRef?: string;
  private resolvedCredentials: SmbStorageCredentials | null = null;
  private shareBasePath: string;
  private connected: boolean = false;

  constructor(
    config: SmbStorageConfig,
    options?: { secretStore?: SecretStore; secretKeyRef?: string; localMountPath?: string }
  ) {
    this.config = config;
    this.secretStore = options?.secretStore;
    this.secretKeyRef = options?.secretKeyRef;

    if (options?.localMountPath) {
      this.shareBasePath = path.resolve(options.localMountPath);
    } else {
      // Formato UNC: \\server\share\basePath ou caminho POSIX montado
      const isWindows = process.platform === 'win32';
      const cleanServer = config.server.replace(/^[\\/]+|[\\/]+$/g, '');
      const cleanShare = config.share.replace(/^[\\/]+|[\\/]+$/g, '');
      const cleanBase = config.basePath ? StoragePathNormalizer.normalizeRelativePath(config.basePath) : '';

      if (isWindows) {
        this.shareBasePath = `\\\\${cleanServer}\\${cleanShare}${cleanBase ? '\\' + cleanBase.replace(/\//g, '\\') : ''}`;
      } else {
        // No Linux/Unix, compartilhamentos SMB são acessados via ponto de montagem (/mnt/smb/share ou /var/run/smb/...)
        this.shareBasePath = path.join('/mnt', 'smb', cleanServer, cleanShare, cleanBase);
      }
    }
  }

  public capabilities(): StorageCapabilities {
    return { ...SMB_STORAGE_CAPABILITIES };
  }

  public async initialize(): Promise<void> {
    await this.connect();
  }

  public async connect(): Promise<void> {
    // 1. Carrega credenciais com segurança a partir do SecretStore se configurado
    if (this.secretStore && this.secretKeyRef) {
      const rawSecret = await this.secretStore.getSecret(this.secretKeyRef);
      if (rawSecret) {
        try {
          this.resolvedCredentials = JSON.parse(rawSecret) as SmbStorageCredentials;
        } catch {
          this.resolvedCredentials = { password: rawSecret };
        }
      }
    }

    // 2. Valida / cria o diretório base do compartilhamento SMB
    try {
      await fsp.mkdir(this.shareBasePath, { recursive: true });
      this.connected = true;
    } catch (err) {
      throw new EngineError({
        code: 'SMB_CONNECTION_FAILED',
        message: `Falha ao conectar ou acessar compartilhamento SMB em "${this.config.server}/${this.config.share}"`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
      });
    }
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
    this.resolvedCredentials = null;
  }

  public async close(): Promise<void> {
    await this.disconnect();
  }

  public async validateConnection(): Promise<boolean> {
    try {
      await fsp.access(this.shareBasePath, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  private resolveSafePath(relativePath: string): string {
    const normalized = StoragePathNormalizer.normalizeRelativePath(relativePath);
    const resolved = path.resolve(this.shareBasePath, normalized);
    if (!resolved.startsWith(this.shareBasePath)) {
      throw new EngineError({
        code: 'SECURITY_PATH_TRAVERSAL',
        message: `Acesso negado: o caminho SMB "${relativePath}" tenta ultrapassar a raiz do compartilhamento.`,
        category: ErrorCategory.STORAGE,
        context: { relativePath, shareBasePath: this.shareBasePath }
      });
    }
    return resolved;
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
        code: 'SMB_METADATA_FAILED',
        message: `Erro ao obter metadados do recurso SMB: ${targetPath}`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
      });
    }
  }

  public async createDirectory(dirPath: string): Promise<void> {
    const fullPath = this.resolveSafePath(dirPath);
    try {
      await fsp.mkdir(fullPath, { recursive: true });
    } catch (err) {
      throw new EngineError({
        code: 'SMB_MKDIR_FAILED',
        message: `Não foi possível criar o diretório no compartilhamento SMB: ${dirPath}`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
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
      try {
        await fsp.unlink(tempPath);
      } catch {}
      throw new EngineError({
        code: 'SMB_WRITE_FAILED',
        message: `Falha ao transmitir arquivo para o compartilhamento SMB: ${targetPath}`,
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
        code: 'SMB_READ_FAILED',
        message: `Falha ao ler arquivo do compartilhamento SMB: ${targetPath}`,
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
        code: 'SMB_RENAME_FAILED',
        message: `Erro ao renomear arquivo SMB "${sourcePath}" para "${destPath}"`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
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
        code: 'SMB_COPY_FAILED',
        message: `Erro ao copiar arquivo no SMB "${sourcePath}" para "${destPath}"`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
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
        code: 'SMB_DELETE_FAILED',
        message: `Erro ao excluir arquivo SMB: ${targetPath}`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
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
        code: 'SMB_LIST_FAILED',
        message: `Falha ao listar diretório SMB: ${prefix}`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
      });
    }
  }
}
