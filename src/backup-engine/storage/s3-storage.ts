import * as crypto from 'node:crypto';
import { Readable, PassThrough } from 'node:stream';
import {
  S3Client,
  HeadBucketCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import {
  StorageProvider,
  StorageItemMetadata,
  PutStreamOptions,
  GetStreamOptions,
  SecretStore
} from '../core/contracts.js';
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
  private s3Client: S3Client | null = null;
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
      endpoint: config.endpoint,
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

  public getClient(): S3Client | null {
    return this.s3Client;
  }

  public isMockSimulation(): boolean {
    return this.mockSimulationMode;
  }

  public async initialize(): Promise<void> {
    await this.connect();
  }

  public async connect(): Promise<void> {
    // 1. Carregar credenciais via SecretStore se disponível
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

    // 2. Inicializar S3Client se não for modo simulação pura
    if (!this.mockSimulationMode) {
      const clientConfig: any = {
        region: this.config.region || 'us-east-1',
        forcePathStyle: this.config.forcePathStyle ?? false
      };

      if (this.config.endpoint) {
        const proto = this.config.useSsl ? 'https://' : 'http://';
        clientConfig.endpoint = this.config.endpoint.startsWith('http')
          ? this.config.endpoint
          : `${proto}${this.config.endpoint}`;
      }

      if (this.credentials?.accessKeyId && this.credentials?.secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: this.credentials.accessKeyId,
          secretAccessKey: this.credentials.secretAccessKey,
          sessionToken: this.credentials.sessionToken
        };
      }

      this.s3Client = new S3Client(clientConfig);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.s3Client) {
      this.s3Client.destroy();
      this.s3Client = null;
    }
    this.credentials = null;
  }

  public async close(): Promise<void> {
    await this.disconnect();
  }

  public async validateConnection(): Promise<boolean> {
    if (this.mockSimulationMode) {
      return true;
    }
    if (!this.s3Client) {
      return false;
    }
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.config.bucket }));
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
    if (this.mockSimulationMode || !this.s3Client) {
      return this.memoryStorage.has(key);
    }

    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key
        })
      );
      return true;
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw new EngineError({
        code: 'S3_CHECK_EXISTS_FAILED',
        message: `Erro ao verificar existência do objeto S3 "${key}" no bucket "${this.config.bucket}"`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
      });
    }
  }

  public async getMetadata(targetPath: string): Promise<StorageItemMetadata | null> {
    const key = this.getObjectKey(targetPath);
    if (this.mockSimulationMode || !this.s3Client) {
      const item = this.memoryStorage.get(key);
      if (!item) return null;
      return item.metadata;
    }

    try {
      const response = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key
        })
      );

      return {
        path: StoragePathNormalizer.normalizeRelativePath(targetPath),
        sizeBytes: response.ContentLength ?? 0,
        modifiedAt: response.LastModified ? response.LastModified.toISOString() : new Date().toISOString(),
        isDirectory: false,
        sha256: response.Metadata?.['sha256'],
        metadata: response.Metadata
      };
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw new EngineError({
        code: 'S3_GET_METADATA_FAILED',
        message: `Falha ao obter metadados do objeto S3 "${key}"`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
      });
    }
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

    // Modo de Simulação In-Memory para Testes Unitários Isolados
    if (this.mockSimulationMode || !this.s3Client) {
      return this.putStreamMock(targetPath, key, stream, options);
    }

    // Modo Produção Oficial AWS S3 / MinIO / Ceph
    let bytesUploaded = 0;
    const progressPassThrough = new PassThrough();
    progressPassThrough.on('data', (chunk: Buffer) => {
      bytesUploaded += chunk.length;
      if (options.onProgress) {
        options.onProgress(bytesUploaded);
      }
    });
    stream.pipe(progressPassThrough);

    const parallelUpload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.config.bucket,
        Key: key,
        Body: progressPassThrough,
        Metadata: options.metadata
      },
      queueSize: this.maxConcurrentParts,
      partSize: this.multipartPartSizeBytes,
      leavePartsOnError: false
    });

    try {
      await parallelUpload.done();
      return bytesUploaded;
    } catch (err: any) {
      throw new EngineError({
        code: 'S3_UPLOAD_FAILED',
        message: `Falha no upload streaming para o objeto S3: ${key}`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
      });
    }
  }

  private async putStreamMock(
    targetPath: string,
    key: string,
    stream: Readable,
    options: PutStreamOptions
  ): Promise<number> {
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

          if (finalBuffer.length > this.multipartThresholdBytes) {
            await this.executeMultipartUploadMock(key, finalBuffer);
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

  private async executeMultipartUploadMock(key: string, buffer: Buffer): Promise<string> {
    const uploadId = `upload_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const totalParts = Math.ceil(buffer.length / this.multipartPartSizeBytes);
    const uploadedParts: S3PartETag[] = [];

    try {
      for (let i = 0; i < totalParts; i++) {
        const start = i * this.multipartPartSizeBytes;
        const end = Math.min(start + this.multipartPartSizeBytes, buffer.length);
        const partBuffer = buffer.subarray(start, end);
        const partNumber = i + 1;
        const partEtag = crypto.createHash('md5').update(partBuffer).digest('hex');
        uploadedParts.push({ partNumber, etag: `"${partEtag}"` });
      }

      const finalEtag = crypto.createHash('md5').update(uploadedParts.map((p) => p.etag).join('')).digest('hex');
      return `"${finalEtag}-${totalParts}"`;
    } catch (err) {
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

    if (this.mockSimulationMode || !this.s3Client) {
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

    try {
      const getParams: any = {
        Bucket: this.config.bucket,
        Key: key
      };

      if (options?.start !== undefined || options?.end !== undefined) {
        const start = options.start ?? 0;
        const end = options.end !== undefined ? options.end : '';
        getParams.Range = `bytes=${start}-${end}`;
      }

      const response = await this.s3Client.send(new GetObjectCommand(getParams));
      if (!response.Body) {
        throw new Error('Corpo do objeto S3 retornado vazio pelo servidor');
      }

      return response.Body as Readable;
    } catch (err: any) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        throw new EngineError({
          code: 'S3_OBJECT_NOT_FOUND',
          message: `Objeto não encontrado no bucket S3 "${this.config.bucket}": ${key}`,
          category: ErrorCategory.STORAGE,
          retryable: false
        });
      }
      throw new EngineError({
        code: 'S3_GET_STREAM_FAILED',
        message: `Falha ao obter stream de leitura do objeto S3 "${key}"`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
      });
    }
  }

  public async copy(sourcePath: string, destPath: string): Promise<void> {
    const sourceKey = this.getObjectKey(sourcePath);
    const destKey = this.getObjectKey(destPath);

    if (this.mockSimulationMode || !this.s3Client) {
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
      return;
    }

    try {
      await this.s3Client.send(
        new CopyObjectCommand({
          Bucket: this.config.bucket,
          CopySource: encodeURI(`${this.config.bucket}/${sourceKey}`),
          Key: destKey
        })
      );
    } catch (err: any) {
      throw new EngineError({
        code: 'S3_COPY_FAILED',
        message: `Não foi possível copiar objeto S3 de "${sourceKey}" para "${destKey}"`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
      });
    }
  }

  public async rename(sourcePath: string, destPath: string): Promise<void> {
    const sourceKey = this.getObjectKey(sourcePath);
    const destKey = this.getObjectKey(destPath);

    if (this.mockSimulationMode || !this.s3Client) {
      const sourceItem = this.memoryStorage.get(sourceKey);
      if (!sourceItem) {
        throw new EngineError({
          code: 'S3_SOURCE_NOT_FOUND',
          message: `Não foi possível renomear: objeto de origem não encontrado: ${sourceKey}`,
          category: ErrorCategory.STORAGE
        });
      }

      const copiedMetadata: StorageItemMetadata = {
        ...sourceItem.metadata,
        path: StoragePathNormalizer.normalizeRelativePath(destPath),
        modifiedAt: new Date().toISOString()
      };
      this.memoryStorage.set(destKey, { buffer: sourceItem.buffer, metadata: copiedMetadata });
      this.memoryStorage.delete(sourceKey);
      return;
    }

    // Server-Side Copy seguido de exclusão da origem
    await this.copy(sourcePath, destPath);
    await this.delete(sourcePath);
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

    if (this.mockSimulationMode || !this.s3Client) {
      this.memoryStorage.delete(key);
      return;
    }

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: key
        })
      );
    } catch (err: any) {
      throw new EngineError({
        code: 'S3_DELETE_FAILED',
        message: `Falha ao excluir objeto S3: "${key}"`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
      });
    }
  }

  public async listDirectory(prefix: string): Promise<StorageItemMetadata[]> {
    const s3Prefix = this.getObjectKey(prefix);

    if (this.mockSimulationMode || !this.s3Client) {
      const results: StorageItemMetadata[] = [];
      for (const [key, item] of this.memoryStorage.entries()) {
        if (!s3Prefix || key.startsWith(s3Prefix)) {
          results.push(item.metadata);
        }
      }
      return results;
    }

    const results: StorageItemMetadata[] = [];
    let continuationToken: string | undefined;

    try {
      do {
        const response = await this.s3Client.send(
          new ListObjectsV2Command({
            Bucket: this.config.bucket,
            Prefix: s3Prefix,
            ContinuationToken: continuationToken
          })
        );

        if (response.Contents) {
          for (const item of response.Contents) {
            if (!item.Key) continue;
            results.push({
              path: item.Key,
              sizeBytes: item.Size ?? 0,
              modifiedAt: item.LastModified ? item.LastModified.toISOString() : new Date().toISOString(),
              isDirectory: item.Key.endsWith('/'),
              metadata: {
                etag: item.ETag?.replace(/"/g, '') || ''
              }
            });
          }
        }
        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return results;
    } catch (err: any) {
      throw new EngineError({
        code: 'S3_LIST_FAILED',
        message: `Falha ao listar objetos no bucket S3 com prefixo "${s3Prefix}"`,
        category: ErrorCategory.STORAGE,
        cause: err,
        retryable: true
      });
    }
  }
}
