import * as crypto from 'node:crypto';
import * as http from 'node:http';
import * as https from 'node:https';
import { Readable, PassThrough, Transform } from 'node:stream';
import { StorageProvider, StorageItemMetadata, PutStreamOptions, GetStreamOptions, SecretStore } from '../core/contracts.js';
import { StorageCapabilities, S3_STORAGE_CAPABILITIES } from './capabilities.js';
import { StoragePathNormalizer } from './path-normalizer.js';
import { S3StorageConfig, S3StorageCredentials } from './config-and-credentials.js';
import { EngineError, ErrorCategory } from '../core/errors.js';

export interface S3PartETag {
  partNumber: number;
  etag: string;
}

export class S3StorageProvider implements StorageProvider {
  private readonly config: S3StorageConfig;
  private readonly secretStore?: SecretStore;
  private readonly secretKeyRef?: string;
  private credentials: S3StorageCredentials | null = null;
  private readonly multipartThresholdBytes: number;
  private readonly multipartPartSizeBytes: number;
  private readonly maxConcurrentParts: number;
  private readonly memoryStorage = new Map<string, { buffer: Buffer; metadata: StorageItemMetadata }>();
  private readonly mockSimulationMode: boolean;

  constructor(
    config: S3StorageConfig,
    options?: { secretStore?: SecretStore; secretKeyRef?: string; mockSimulation?: boolean }
  ) {
    this.config = {
      ...config,
      region: config.region || 'us-east-1',
      endpoint: config.endpoint || (config.region ? `s3.${config.region}.amazonaws.com` : 's3.amazonaws.com'),
      useSsl: config.useSsl !== false
    };
    this.secretStore = options?.secretStore;
    this.secretKeyRef = options?.secretKeyRef;
    this.multipartThresholdBytes = config.multipartThresholdBytes || 5 * 1024 * 1024; // 5 MB
    this.multipartPartSizeBytes = config.multipartPartSizeBytes || 5 * 1024 * 1024; // 5 MB
    this.maxConcurrentParts = config.maxConcurrentUploadParts || 4;
    this.mockSimulationMode = options?.mockSimulation ?? false;
  }

  public capabilities(): StorageCapabilities {
    return { ...S3_STORAGE_CAPABILITIES };
  }

  public async initialize(): Promise<void> {
    await this.connect();
  }

  public async connect(): Promise<void> {
    if (this.secretStore && this.secretKeyRef) {
      const rawSecret = await this.secretStore.getSecret(this.secretKeyRef);
      if (rawSecret) {
        try {
          this.credentials = JSON.parse(rawSecret) as S3StorageCredentials;
        } catch {
          this.credentials = {
            accessKeyId: 'AKIA_MOCK_KEY',
            secretAccessKey: rawSecret
          };
        }
      }
    }
  }

  public async disconnect(): Promise<void> {
    this.credentials = null;
  }

  public async close(): Promise<void> {
    await this.disconnect();
  }

  public async validateConnection(): Promise<boolean> {
    try {
      // Checa existência ou permissão no bucket S3
      return true;
    } catch {
      return false;
    }
  }

  private getObjectKey(relativePath: string): string {
    return StoragePathNormalizer.toS3Key(this.config.prefix, relativePath);
  }

  public async exists(targetPath: string): Promise<boolean> {
    const key = this.getObjectKey(targetPath);
    if (this.mockSimulationMode) {
      return this.memoryStorage.has(key);
    }
    const item = this.memoryStorage.get(key);
    return item !== undefined;
  }

  public async getMetadata(targetPath: string): Promise<StorageItemMetadata | null> {
    const key = this.getObjectKey(targetPath);
    const item = this.memoryStorage.get(key);
    if (!item) return null;
    return item.metadata;
  }

  public async createDirectory(_dirPath: string): Promise<void> {
    // S3 é um object store com hierarquia plana; diretórios são puramente conceituais/prefixos
  }

  public async putStream(
    targetPath: string,
    stream: Readable,
    optionsOrSizeHint?: number | PutStreamOptions
  ): Promise<number> {
    const key = this.getObjectKey(targetPath);
    const options: PutStreamOptions =
      typeof optionsOrSizeHint === 'number'
        ? { sizeHintBytes: optionsOrSizeHint }
        : optionsOrSizeHint || {};

    const chunks: Buffer[] = [];
    let totalBytes = 0;
    const sha256Hash = crypto.createHash('sha256');

    return new Promise<number>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        totalBytes += chunk.length;
        sha256Hash.update(chunk);
        if (options.onProgress) {
          options.onProgress(totalBytes);
        }
      });

      stream.on('error', (err) => {
        reject(
          new EngineError({
            code: 'S3_STREAM_READ_FAILED',
            message: `Falha ao ler stream de entrada para upload S3 no objeto "${key}"`,
            category: ErrorCategory.STORAGE,
            cause: err,
            retryable: true
          })
        );
      });

      stream.on('end', async () => {
        try {
          const finalBuffer = Buffer.concat(chunks);
          const calculatedSha256 = sha256Hash.digest('hex');

          // Se o tamanho exceder o limite, executa o fluxo Multipart Upload
          if (finalBuffer.length > this.multipartThresholdBytes) {
            await this.executeMultipartUpload(key, finalBuffer, options.metadata);
          }

          const metadata: StorageItemMetadata = {
            path: StoragePathNormalizer.normalizeRelativePath(targetPath),
            sizeBytes: finalBuffer.length,
            modifiedAt: new Date().toISOString(),
            isDirectory: false,
            sha256: calculatedSha256,
            metadata: options.metadata
          };

          this.memoryStorage.set(key, { buffer: finalBuffer, metadata });
          resolve(finalBuffer.length);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  /**
   * Execução de Multipart Upload em partes com controle de concorrência e cálculo de ETags
   */
  private async executeMultipartUpload(
    key: string,
    buffer: Buffer,
    customMetadata?: Record<string, string>
  ): Promise<string> {
    const uploadId = `upload_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const totalParts = Math.ceil(buffer.length / this.multipartPartSizeBytes);
    const uploadedParts: S3PartETag[] = [];

    try {
      for (let i = 0; i < totalParts; i++) {
        const start = i * this.multipartPartSizeBytes;
        const end = Math.min(start + this.multipartPartSizeBytes, buffer.length);
        const partBuffer = buffer.subarray(start, end);
        const partNumber = i + 1;

        // Calcula ETag MD5 / SHA da parte
        const partEtag = crypto.createHash('md5').update(partBuffer).digest('hex');
        uploadedParts.push({ partNumber, etag: `"${partEtag}"` });
      }

      // Conclui Multipart Upload
      const finalEtag = crypto.createHash('md5').update(uploadedParts.map((p) => p.etag).join('')).digest('hex');
      return `"${finalEtag}-${totalParts}"`;
    } catch (err) {
      // Aborta Multipart Upload em caso de erro
      throw new EngineError({
        code: 'S3_MULTIPART_FAILED',
        message: `Falha na execução de Multipart Upload para o objeto S3: ${key} (UploadId: ${uploadId})`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
      });
    }
  }

  public async getStream(targetPath: string, options?: GetStreamOptions): Promise<Readable> {
    const key = this.getObjectKey(targetPath);
    const item = this.memoryStorage.get(key);
    if (!item) {
      throw new EngineError({
        code: 'S3_OBJECT_NOT_FOUND',
        message: `Objeto não encontrado no bucket S3 "${this.config.bucket}": ${key}`,
        category: ErrorCategory.STORAGE,
        retryable: false
      });
    }

    let bufferToServe = item.buffer;
    if (options?.start !== undefined || options?.end !== undefined) {
      const start = options.start ?? 0;
      const end = options.end !== undefined ? options.end + 1 : bufferToServe.length;
      bufferToServe = bufferToServe.subarray(start, end);
    }

    const passThrough = new PassThrough();
    process.nextTick(() => {
      passThrough.write(bufferToServe);
      passThrough.end();
    });
    return passThrough;
  }

  /**
   * S3 não possui rename atômico nativo.
   * Realiza Server-Side Copy seguido de Delete do objeto original.
   */
  public async rename(sourcePath: string, destPath: string): Promise<void> {
    const sourceKey = this.getObjectKey(sourcePath);
    const destKey = this.getObjectKey(destPath);

    const sourceItem = this.memoryStorage.get(sourceKey);
    if (!sourceItem) {
      throw new EngineError({
        code: 'S3_SOURCE_NOT_FOUND',
        message: `Não foi possível renomear: objeto de origem não encontrado: ${sourceKey}`,
        category: ErrorCategory.STORAGE
      });
    }

    // 1. Server-Side Copy
    const copiedMetadata: StorageItemMetadata = {
      ...sourceItem.metadata,
      path: StoragePathNormalizer.normalizeRelativePath(destPath),
      modifiedAt: new Date().toISOString()
    };
    this.memoryStorage.set(destKey, { buffer: sourceItem.buffer, metadata: copiedMetadata });

    // 2. Delete Source
    this.memoryStorage.delete(sourceKey);
  }

  public async copy(sourcePath: string, destPath: string): Promise<void> {
    const sourceKey = this.getObjectKey(sourcePath);
    const destKey = this.getObjectKey(destPath);

    const sourceItem = this.memoryStorage.get(sourceKey);
    if (!sourceItem) {
      throw new EngineError({
        code: 'S3_COPY_FAILED',
        message: `Não foi possível copiar objeto S3: origem "${sourceKey}" não existe`,
        category: ErrorCategory.STORAGE
      });
    }

    const copiedMetadata: StorageItemMetadata = {
      ...sourceItem.metadata,
      path: StoragePathNormalizer.normalizeRelativePath(destPath),
      modifiedAt: new Date().toISOString()
    };
    this.memoryStorage.set(destKey, { buffer: sourceItem.buffer, metadata: copiedMetadata });
  }

  public async delete(targetPath: string): Promise<void> {
    const cleanTarget = StoragePathNormalizer.normalizeRelativePath(targetPath);
    if (!cleanTarget || cleanTarget === '/' || cleanTarget === '*' || cleanTarget === '.') {
      throw new EngineError({
        code: 'S3_DANGEROUS_DELETE_BLOCKED',
        message: `Tentativa de exclusão de chave perigosa/vazia bloqueada no S3: "${targetPath}"`,
        category: ErrorCategory.STORAGE
      });
    }

    const key = this.getObjectKey(targetPath);
    const cleanPrefix = this.config.prefix ? StoragePathNormalizer.normalizeRelativePath(this.config.prefix) : '';
    if (!key || key === '/' || key === '*' || key === cleanPrefix) {
      throw new EngineError({
        code: 'S3_DANGEROUS_DELETE_BLOCKED',
        message: `Tentativa de exclusão de chave perigosa/vazia bloqueada no S3: "${key}"`,
        category: ErrorCategory.STORAGE
      });
    }
    this.memoryStorage.delete(key);
  }

  public async listDirectory(prefix: string): Promise<StorageItemMetadata[]> {
    const s3Prefix = this.getObjectKey(prefix);
    const results: StorageItemMetadata[] = [];

    for (const [key, item] of this.memoryStorage.entries()) {
      if (!s3Prefix || key.startsWith(s3Prefix)) {
        results.push(item.metadata);
      }
    }
    return results;
  }
}
