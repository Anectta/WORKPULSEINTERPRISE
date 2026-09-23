import { StorageProvider, SecretStore } from '../core/contracts.js';
import { BackupDestination, StorageProviderType } from '../core/domain.js';
import { LocalStorageProvider } from './local-storage.js';
import { SmbStorageProvider } from './smb-storage.js';
import { SftpStorageProvider } from './sftp-storage.js';
import { S3StorageProvider } from './s3-storage.js';
import {
  StorageConfig,
  LocalStorageConfig,
  SmbStorageConfig,
  SftpStorageConfig,
  S3StorageConfig,
  StorageConfigValidator
} from './config-and-credentials.js';
import { EngineError, ErrorCategory } from '../core/errors.js';

export class StorageProviderFactory {
  /**
   * Instancia o StorageProvider apropriado a partir de um BackupDestination de domínio.
   */
  public static createProvider(
    destination: BackupDestination,
    options?: { secretStore?: SecretStore }
  ): StorageProvider {
    const providerType = destination.providerType;
    const config = (destination.config || {}) as Record<string, any>;

    switch (providerType) {
      case StorageProviderType.LOCAL: {
        const baseDir = destination.baseUri || config.baseDirectory || './backup_storage';
        return new LocalStorageProvider(baseDir);
      }

      case StorageProviderType.SMB: {
        const smbConfig: SmbStorageConfig = {
          type: StorageProviderType.SMB,
          server: config.server || 'smb-server',
          share: config.share || 'backups',
          basePath: config.basePath || destination.baseUri,
          domain: config.domain,
          port: config.port
        };
        StorageConfigValidator.validate(smbConfig);
        return new SmbStorageProvider(smbConfig, {
          secretStore: options?.secretStore,
          secretKeyRef: destination.secretKeyRef,
          localMountPath: config.localMountPath
        });
      }

      case StorageProviderType.SFTP: {
        const sftpConfig: SftpStorageConfig = {
          type: StorageProviderType.SFTP,
          host: config.host || 'sftp.example.com',
          port: config.port || 22,
          remoteBasePath: config.remoteBasePath || destination.baseUri,
          hostKeyPolicy: config.hostKeyPolicy || 'strict'
        };
        StorageConfigValidator.validate(sftpConfig);
        return new SftpStorageProvider(sftpConfig, {
          secretStore: options?.secretStore,
          secretKeyRef: destination.secretKeyRef,
          localSimulationPath: config.localSimulationPath
        });
      }

      case StorageProviderType.S3: {
        const s3Config: S3StorageConfig = {
          type: StorageProviderType.S3,
          bucket: config.bucket || destination.baseUri || 'backup-bucket',
          region: config.region || 'us-east-1',
          endpoint: config.endpoint,
          prefix: config.prefix,
          multipartThresholdBytes: config.multipartThresholdBytes,
          multipartPartSizeBytes: config.multipartPartSizeBytes,
          maxConcurrentUploadParts: config.maxConcurrentUploadParts
        };
        StorageConfigValidator.validate(s3Config);
        return new S3StorageProvider(s3Config, {
          secretStore: options?.secretStore,
          secretKeyRef: destination.secretKeyRef,
          mockSimulation: config.mockSimulation
        });
      }

      default:
        throw new EngineError({
          code: 'STORAGE_UNKNOWN_PROVIDER_TYPE',
          message: `Provedor de armazenamento não suportado: "${providerType}"`,
          category: ErrorCategory.CONFIGURATION
        });
    }
  }

  /**
   * Instancia o StorageProvider a partir de um objeto de configuração tipado.
   */
  public static createFromConfig(
    config: StorageConfig,
    options?: { secretStore?: SecretStore; secretKeyRef?: string }
  ): StorageProvider {
    StorageConfigValidator.validate(config);

    switch (config.type) {
      case StorageProviderType.LOCAL:
        return new LocalStorageProvider((config as LocalStorageConfig).baseDirectory);

      case StorageProviderType.SMB:
        return new SmbStorageProvider(config as SmbStorageConfig, {
          secretStore: options?.secretStore,
          secretKeyRef: options?.secretKeyRef
        });

      case StorageProviderType.SFTP:
        return new SftpStorageProvider(config as SftpStorageConfig, {
          secretStore: options?.secretStore,
          secretKeyRef: options?.secretKeyRef
        });

      case StorageProviderType.S3:
        return new S3StorageProvider(config as S3StorageConfig, {
          secretStore: options?.secretStore,
          secretKeyRef: options?.secretKeyRef
        });

      default:
        throw new EngineError({
          code: 'STORAGE_UNKNOWN_PROVIDER_TYPE',
          message: `Tipo de configuração de armazenamento desconhecido`,
          category: ErrorCategory.CONFIGURATION
        });
    }
  }
}
