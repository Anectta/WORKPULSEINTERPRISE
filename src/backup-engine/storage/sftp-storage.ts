import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { Readable, pipeline, Transform, PassThrough } from 'node:stream';
import { promisify } from 'node:util';
import { Client as SshClient, SFTPWrapper, Stats as SftpStats } from 'ssh2';
import { StorageProvider, StorageItemMetadata, PutStreamOptions, GetStreamOptions } from '../core/contracts.js';
import { StorageCapabilities, SFTP_STORAGE_CAPABILITIES } from './capabilities.js';
import { StoragePathNormalizer } from './path-normalizer.js';
import { SftpStorageConfig, SftpStorageCredentials } from './config-and-credentials.js';
import { SecretStore } from '../core/contracts.js';
import { EngineError, ErrorCategory } from '../core/errors.js';

const streamPipeline = promisify(pipeline);

export class SftpStorageProvider implements StorageProvider {
  private readonly config: SftpStorageConfig;
  private readonly secretStore?: SecretStore;
  private readonly secretKeyRef?: string;
  private resolvedCredentials: SftpStorageCredentials | null = null;
  private remoteBasePath: string;
  private connected: boolean = false;
  private readonly isSimulationMode: boolean;
  private sshClient: SshClient | null = null;
  private sftpWrapper: SFTPWrapper | null = null;

  constructor(
    config: SftpStorageConfig,
    options?: { secretStore?: SecretStore; secretKeyRef?: string; localSimulationPath?: string }
  ) {
    this.config = config;
    this.secretStore = options?.secretStore;
    this.secretKeyRef = options?.secretKeyRef;

    if (options?.localSimulationPath) {
      this.isSimulationMode = true;
      this.remoteBasePath = path.resolve(options.localSimulationPath);
    } else {
      this.isSimulationMode = false;
      const cleanBase = config.remoteBasePath ? StoragePathNormalizer.normalizeRelativePath(config.remoteBasePath) : '';
      this.remoteBasePath = cleanBase ? (cleanBase.startsWith('/') ? cleanBase : `/${cleanBase}`) : '/var/sftp/backups';
    }
  }

  public capabilities(): StorageCapabilities {
    return { ...SFTP_STORAGE_CAPABILITIES };
  }

  public isLocalSimulation(): boolean {
    return this.isSimulationMode;
  }

  public getSshClient(): SshClient | null {
    return this.sshClient;
  }

  public getSftpWrapper(): SFTPWrapper | null {
    return this.sftpWrapper;
  }

  public async initialize(): Promise<void> {
    await this.connect();
  }

  public async connect(): Promise<void> {
    // 1. Resolve credenciais do SecretStore se houver
    if (this.secretStore && this.secretKeyRef) {
      const rawSecret = await this.secretStore.getSecret(this.secretKeyRef);
      if (rawSecret) {
        try {
          this.resolvedCredentials = JSON.parse(rawSecret) as SftpStorageCredentials;
        } catch {
          this.resolvedCredentials = { username: 'backup-user', password: rawSecret };
        }
      }
    }

    // 2. Modo Simulação Local (testes e CI/CD offline)
    if (this.isSimulationMode) {
      try {
        await fsp.mkdir(this.remoteBasePath, { recursive: true });
        this.connected = true;
        return;
      } catch (err) {
        throw new EngineError({
          code: 'SFTP_CONNECTION_FAILED',
          message: `Falha ao inicializar caminho de simulação SFTP: ${this.remoteBasePath}`,
          category: ErrorCategory.STORAGE,
          cause: err,
          retryable: true
        });
      }
    }

    // 3. Conexão Real via SSH2 Client
    return new Promise<void>((resolve, reject) => {
      const client = new SshClient();
      this.sshClient = client;

      client.on('ready', () => {
        client.sftp((err, sftp) => {
          if (err) {
            client.end();
            return reject(
              new EngineError({
                code: 'SFTP_SUBSYSTEM_FAILED',
                message: `Falha ao iniciar subsistema SFTP no servidor SSH "${this.config.host}"`,
                category: ErrorCategory.STORAGE,
                cause: err
              })
            );
          }
          this.sftpWrapper = sftp;
          this.connected = true;
          resolve();
        });
      });

      client.on('error', (err) => {
        this.connected = false;
        reject(
          new EngineError({
            code: 'SFTP_CONNECTION_FAILED',
            message: `Falha ao conectar via SSH/SFTP em "${this.config.host}:${this.config.port || 22}"`,
            category: ErrorCategory.STORAGE,
            cause: err,
            retryable: true
          })
        );
      });

      const connectConfig: any = {
        host: this.config.host,
        port: this.config.port || 22,
        username: this.resolvedCredentials?.username || 'root',
        readyTimeout: this.config.connectionTimeoutMs || 20000
      };

      if (this.resolvedCredentials?.password) {
        connectConfig.password = this.resolvedCredentials.password;
      }
      if (this.resolvedCredentials?.privateKey) {
        connectConfig.privateKey = this.resolvedCredentials.privateKey;
      }
      if (this.resolvedCredentials?.passphrase) {
        connectConfig.passphrase = this.resolvedCredentials.passphrase;
      }

      client.connect(connectConfig);
    });
  }

  public async disconnect(): Promise<void> {
    if (this.sftpWrapper) {
      this.sftpWrapper.end();
      this.sftpWrapper = null;
    }
    if (this.sshClient) {
      this.sshClient.end();
      this.sshClient = null;
    }
    this.connected = false;
    this.resolvedCredentials = null;
  }

  public async close(): Promise<void> {
    await this.disconnect();
  }

  public async validateConnection(): Promise<boolean> {
    if (!this.connected) return false;

    if (this.isSimulationMode) {
      try {
        await fsp.access(this.remoteBasePath, fs.constants.R_OK | fs.constants.W_OK);
        return true;
      } catch {
        return false;
      }
    }

    if (!this.sftpWrapper) return false;

    return new Promise<boolean>((resolve) => {
      this.sftpWrapper!.realpath('.', (err) => {
        resolve(!err);
      });
    });
  }

  private resolveSafePath(relativePath: string): string {
    const normalized = StoragePathNormalizer.normalizeRelativePath(relativePath);
    if (this.isSimulationMode) {
      const resolved = path.resolve(this.remoteBasePath, normalized);
      if (!resolved.startsWith(this.remoteBasePath)) {
        throw new EngineError({
          code: 'SECURITY_PATH_TRAVERSAL',
          message: `Acesso negado: o caminho SFTP "${relativePath}" tenta ultrapassar o diretório base remoto.`,
          category: ErrorCategory.STORAGE,
          context: { relativePath, remoteBasePath: this.remoteBasePath }
        });
      }
      return resolved;
    }

    // Caminho UNIX no servidor remoto SFTP
    const cleanRelative = normalized.replace(/^(\.\.(\/|\\|$))+/, '');
    const cleanBase = this.remoteBasePath.endsWith('/') ? this.remoteBasePath : `${this.remoteBasePath}/`;
    return `${cleanBase}${cleanRelative}`;
  }

  public async exists(targetPath: string): Promise<boolean> {
    const remotePath = this.resolveSafePath(targetPath);

    if (this.isSimulationMode) {
      try {
        await fsp.access(remotePath, fs.constants.F_OK);
        return true;
      } catch {
        return false;
      }
    }

    if (!this.sftpWrapper) return false;

    return new Promise<boolean>((resolve) => {
      this.sftpWrapper!.stat(remotePath, (err) => {
        resolve(!err);
      });
    });
  }

  public async getMetadata(targetPath: string): Promise<StorageItemMetadata | null> {
    const remotePath = this.resolveSafePath(targetPath);

    if (this.isSimulationMode) {
      try {
        const stats = await fsp.stat(remotePath);
        return {
          path: StoragePathNormalizer.normalizeRelativePath(targetPath),
          sizeBytes: stats.size,
          modifiedAt: stats.mtime.toISOString(),
          isDirectory: stats.isDirectory()
        };
      } catch (err: any) {
        if (err?.code === 'ENOENT') return null;
        throw new EngineError({
          code: 'SFTP_METADATA_FAILED',
          message: `Erro ao obter atributos SFTP do arquivo: ${targetPath}`,
          category: ErrorCategory.STORAGE,
          cause: err,
          retryable: true
        });
      }
    }

    if (!this.sftpWrapper) return null;

    return new Promise<StorageItemMetadata | null>((resolve, reject) => {
      this.sftpWrapper!.stat(remotePath, (err, stats: SftpStats) => {
        if (err) {
          if ((err as any).code === 2 || err.message?.includes('No such file')) {
            return resolve(null);
          }
          return reject(
            new EngineError({
              code: 'SFTP_METADATA_FAILED',
              message: `Erro ao obter atributos SFTP do arquivo remoto: ${targetPath}`,
              category: ErrorCategory.STORAGE,
              cause: err,
              retryable: true
            })
          );
        }

        resolve({
          path: StoragePathNormalizer.normalizeRelativePath(targetPath),
          sizeBytes: stats.size,
          modifiedAt: new Date(stats.mtime * 1000).toISOString(),
          isDirectory: stats.isDirectory()
        });
      });
    });
  }

  public async createDirectory(dirPath: string): Promise<void> {
    const remotePath = this.resolveSafePath(dirPath);

    if (this.isSimulationMode) {
      try {
        await fsp.mkdir(remotePath, { recursive: true });
        return;
      } catch (err) {
        throw new EngineError({
          code: 'SFTP_MKDIR_FAILED',
          message: `Não foi possível criar diretório remoto via SFTP: ${dirPath}`,
          category: ErrorCategory.STORAGE,
          cause: err,
          retryable: true
        });
      }
    }

    if (!this.sftpWrapper) {
      throw new EngineError({
        code: 'SFTP_NOT_CONNECTED',
        message: 'Cliente SFTP não está conectado',
        category: ErrorCategory.STORAGE
      });
    }

    return new Promise<void>((resolve, reject) => {
      this.sftpWrapper!.mkdir(remotePath, (err) => {
        if (err && (err as any).code !== 4 /* SSH_FX_FAILURE / already exists */) {
          return reject(
            new EngineError({
              code: 'SFTP_MKDIR_FAILED',
              message: `Falha ao criar diretório remoto SFTP: ${remotePath}`,
              category: ErrorCategory.STORAGE,
              cause: err
            })
          );
        }
        resolve();
      });
    });
  }

  public async putStream(
    targetPath: string,
    stream: Readable,
    optionsOrSizeHint?: number | PutStreamOptions
  ): Promise<number> {
    const remotePath = this.resolveSafePath(targetPath);
    const options: PutStreamOptions =
      typeof optionsOrSizeHint === 'number'
        ? { sizeHintBytes: optionsOrSizeHint }
        : optionsOrSizeHint || {};

    // 1. Modo Simulação Local
    if (this.isSimulationMode) {
      const parentDir = path.dirname(remotePath);
      await fsp.mkdir(parentDir, { recursive: true });

      const tempPath = `${remotePath}.sftp_tmp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
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
        await fsp.rename(tempPath, remotePath);
        return stats.size;
      } catch (err) {
        try {
          await fsp.unlink(tempPath);
        } catch {}
        throw new EngineError({
          code: 'SFTP_WRITE_FAILED',
          message: `Falha na transmissão SFTP para o caminho: ${targetPath}`,
          category: ErrorCategory.STORAGE,
          cause: err,
          retryable: true
        });
      }
    }

    // 2. Modo SFTP Real
    if (!this.sftpWrapper) {
      throw new EngineError({
        code: 'SFTP_NOT_CONNECTED',
        message: 'Cliente SFTP não conectado',
        category: ErrorCategory.STORAGE
      });
    }

    const tempRemotePath = `${remotePath}.sftp_tmp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const remoteWriteStream = this.sftpWrapper.createWriteStream(tempRemotePath);

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
      await streamPipeline(stream, trackingTransform, remoteWriteStream);

      // Rename atômico remoto
      await new Promise<void>((resolve, reject) => {
        this.sftpWrapper!.rename(tempRemotePath, remotePath, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      return bytesWritten;
    } catch (err) {
      try {
        this.sftpWrapper.unlink(tempRemotePath, () => {});
      } catch {}
      throw new EngineError({
        code: 'SFTP_WRITE_FAILED',
        message: `Falha ao transferir arquivo para SFTP remoto: ${targetPath}`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
      });
    }
  }

  public async getStream(targetPath: string, options?: GetStreamOptions): Promise<Readable> {
    const remotePath = this.resolveSafePath(targetPath);

    if (this.isSimulationMode) {
      try {
        await fsp.access(remotePath, fs.constants.R_OK);
        const streamOptions: { start?: number; end?: number } = {};
        if (options?.start !== undefined) streamOptions.start = options.start;
        if (options?.end !== undefined) streamOptions.end = options.end;
        return fs.createReadStream(remotePath, streamOptions);
      } catch (err) {
        throw new EngineError({
          code: 'SFTP_READ_FAILED',
          message: `Falha ao ler arquivo via SFTP: ${targetPath}`,
          category: ErrorCategory.STORAGE,
          cause: err,
          retryable: true
        });
      }
    }

    if (!this.sftpWrapper) {
      throw new EngineError({
        code: 'SFTP_NOT_CONNECTED',
        message: 'Cliente SFTP não está conectado',
        category: ErrorCategory.STORAGE
      });
    }

    const sftpStreamOptions: any = {};
    if (options?.start !== undefined) sftpStreamOptions.start = options.start;
    if (options?.end !== undefined) sftpStreamOptions.end = options.end;

    return this.sftpWrapper.createReadStream(remotePath, sftpStreamOptions) as unknown as Readable;
  }

  public async rename(sourcePath: string, destPath: string): Promise<void> {
    const fullSource = this.resolveSafePath(sourcePath);
    const fullDest = this.resolveSafePath(destPath);

    if (this.isSimulationMode) {
      try {
        await fsp.mkdir(path.dirname(fullDest), { recursive: true });
        await fsp.rename(fullSource, fullDest);
        return;
      } catch (err) {
        throw new EngineError({
          code: 'SFTP_RENAME_FAILED',
          message: `Erro ao renomear arquivo SFTP "${sourcePath}" para "${destPath}"`,
          category: ErrorCategory.STORAGE,
          cause: err,
          retryable: true
        });
      }
    }

    if (!this.sftpWrapper) {
      throw new EngineError({
        code: 'SFTP_NOT_CONNECTED',
        message: 'Cliente SFTP não conectado',
        category: ErrorCategory.STORAGE
      });
    }

    return new Promise<void>((resolve, reject) => {
      this.sftpWrapper!.rename(fullSource, fullDest, (err) => {
        if (err) {
          return reject(
            new EngineError({
              code: 'SFTP_RENAME_FAILED',
              message: `Erro ao renomear arquivo remoto via SFTP de "${sourcePath}" para "${destPath}"`,
              category: ErrorCategory.STORAGE,
              cause: err,
              retryable: true
            })
          );
        }
        resolve();
      });
    });
  }

  public async copy(sourcePath: string, destPath: string): Promise<void> {
    const fullSource = this.resolveSafePath(sourcePath);
    const fullDest = this.resolveSafePath(destPath);

    if (this.isSimulationMode) {
      try {
        await fsp.mkdir(path.dirname(fullDest), { recursive: true });
        await fsp.copyFile(fullSource, fullDest);
        return;
      } catch (err) {
        throw new EngineError({
          code: 'SFTP_COPY_FAILED',
          message: `Erro ao copiar arquivo via SFTP "${sourcePath}" para "${destPath}"`,
          category: ErrorCategory.STORAGE,
          cause: err,
          retryable: true
        });
      }
    }

    if (!this.sftpWrapper) {
      throw new EngineError({
        code: 'SFTP_NOT_CONNECTED',
        message: 'Cliente SFTP não conectado',
        category: ErrorCategory.STORAGE
      });
    }

    const readStream = this.sftpWrapper.createReadStream(fullSource);
    const writeStream = this.sftpWrapper.createWriteStream(fullDest);

    try {
      await streamPipeline(readStream as unknown as Readable, writeStream);
    } catch (err) {
      throw new EngineError({
        code: 'SFTP_COPY_FAILED',
        message: `Erro ao copiar arquivo remoto SFTP de "${sourcePath}" para "${destPath}"`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
      });
    }
  }

  public async delete(targetPath: string): Promise<void> {
    const fullPath = this.resolveSafePath(targetPath);

    if (this.isSimulationMode) {
      try {
        const stats = await fsp.stat(fullPath);
        if (stats.isDirectory()) {
          await fsp.rm(fullPath, { recursive: true, force: true });
        } else {
          await fsp.unlink(fullPath);
        }
        return;
      } catch (err: any) {
        if (err?.code === 'ENOENT') return;
        throw new EngineError({
          code: 'SFTP_DELETE_FAILED',
          message: `Erro ao excluir arquivo via SFTP: ${targetPath}`,
          category: ErrorCategory.STORAGE,
          cause: err,
          retryable: true
        });
      }
    }

    if (!this.sftpWrapper) {
      throw new EngineError({
        code: 'SFTP_NOT_CONNECTED',
        message: 'Cliente SFTP não conectado',
        category: ErrorCategory.STORAGE
      });
    }

    return new Promise<void>((resolve, reject) => {
      this.sftpWrapper!.stat(fullPath, (statErr, stats) => {
        if (statErr) {
          return resolve(); // Já não existe
        }
        if (stats.isDirectory()) {
          this.sftpWrapper!.rmdir(fullPath, (rmErr) => {
            if (rmErr) return reject(rmErr);
            resolve();
          });
        } else {
          this.sftpWrapper!.unlink(fullPath, (unErr) => {
            if (unErr) return reject(unErr);
            resolve();
          });
        }
      });
    });
  }

  public async listDirectory(prefix: string): Promise<StorageItemMetadata[]> {
    const fullPath = this.resolveSafePath(prefix);

    if (this.isSimulationMode) {
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
          code: 'SFTP_LIST_FAILED',
          message: `Falha ao listar diretório via SFTP: ${prefix}`,
          category: ErrorCategory.STORAGE,
          cause: err,
          retryable: true
        });
      }
    }

    if (!this.sftpWrapper) {
      throw new EngineError({
        code: 'SFTP_NOT_CONNECTED',
        message: 'Cliente SFTP não conectado',
        category: ErrorCategory.STORAGE
      });
    }

    return new Promise<StorageItemMetadata[]>((resolve, reject) => {
      this.sftpWrapper!.readdir(fullPath, (err, list) => {
        if (err) {
          return reject(
            new EngineError({
              code: 'SFTP_LIST_FAILED',
              message: `Falha ao listar diretório remoto SFTP: ${prefix}`,
              category: ErrorCategory.STORAGE,
              cause: err,
              retryable: true
            })
          );
        }

        const results: StorageItemMetadata[] = list.map((item) => ({
          path: StoragePathNormalizer.join(prefix, item.filename),
          sizeBytes: item.attrs.size,
          modifiedAt: new Date(item.attrs.mtime * 1000).toISOString(),
          isDirectory: (item.attrs.mode & 0o040000) === 0o040000
        }));

        resolve(results);
      });
    });
  }
}
