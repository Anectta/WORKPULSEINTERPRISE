import { StorageProviderType } from '../core/domain.js';
import { EngineError, ErrorCategory } from '../core/errors.js';

export interface BaseStorageConfig {
  type: StorageProviderType;
  connectionTimeoutMs?: number;
  operationTimeoutMs?: number;
  maxRetries?: number;
}

export interface LocalStorageConfig extends BaseStorageConfig {
  type: StorageProviderType.LOCAL;
  baseDirectory: string;
}

export interface SmbStorageConfig extends BaseStorageConfig {
  type: StorageProviderType.SMB;
  server: string;
  share: string;
  basePath?: string;
  port?: number;
  domain?: string;
  workgroup?: string;
}

export interface SmbStorageCredentials {
  username?: string;
  password?: string;
  domain?: string;
}

export interface SftpStorageConfig extends BaseStorageConfig {
  type: StorageProviderType.SFTP;
  host: string;
  port?: number;
  remoteBasePath?: string;
  hostKeyPolicy?: 'strict' | 'accept_new' | 'insecure_ignore';
  knownHostsPath?: string;
}

export interface SftpStorageCredentials {
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

export interface S3StorageConfig extends BaseStorageConfig {
  type: StorageProviderType.S3;
  bucket: string;
  region?: string;
  endpoint?: string;
  prefix?: string;
  forcePathStyle?: boolean;
  useSsl?: boolean;
  multipartThresholdBytes?: number;
  multipartPartSizeBytes?: number;
  maxConcurrentUploadParts?: number;
}

export interface S3StorageCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export type StorageConfig =
  | LocalStorageConfig
  | SmbStorageConfig
  | SftpStorageConfig
  | S3StorageConfig;

export class StorageConfigValidator {
  public static validate(config: StorageConfig): void {
    if (!config || !config.type) {
      throw new EngineError({
        code: 'STORAGE_INVALID_CONFIG',
        message: 'A configuração de armazenamento deve especificar o tipo do provedor.',
        category: ErrorCategory.CONFIGURATION
      });
    }

    switch (config.type) {
      case StorageProviderType.LOCAL: {
        const local = config as LocalStorageConfig;
        if (!local.baseDirectory || typeof local.baseDirectory !== 'string') {
          throw new EngineError({
            code: 'STORAGE_INVALID_CONFIG',
            message: 'LocalStorage requer um "baseDirectory" válido.',
            category: ErrorCategory.CONFIGURATION
          });
        }
        break;
      }
      case StorageProviderType.SMB: {
        const smb = config as SmbStorageConfig;
        if (!smb.server || !smb.share) {
          throw new EngineError({
            code: 'STORAGE_INVALID_CONFIG',
            message: 'SmbStorage requer "server" e "share" válidos.',
            category: ErrorCategory.CONFIGURATION
          });
        }
        break;
      }
      case StorageProviderType.SFTP: {
        const sftp = config as SftpStorageConfig;
        if (!sftp.host) {
          throw new EngineError({
            code: 'STORAGE_INVALID_CONFIG',
            message: 'SftpStorage requer um "host" válido.',
            category: ErrorCategory.CONFIGURATION
          });
        }
        break;
      }
      case StorageProviderType.S3: {
        const s3 = config as S3StorageConfig;
        if (!s3.bucket) {
          throw new EngineError({
            code: 'STORAGE_INVALID_CONFIG',
            message: 'S3Storage requer um nome de "bucket" válido.',
            category: ErrorCategory.CONFIGURATION
          });
        }
        break;
      }
    }
  }
}
