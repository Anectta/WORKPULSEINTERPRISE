import { Readable } from 'node:stream';
import { StorageCapabilities } from '../storage/capabilities.js';
import { UUID, BackupJob, BackupExecution, BackupResult, RestoreRequest, RestoreResult } from './domain.js';
import { CancellationToken } from './errors.js';

export type { BackupJob, BackupExecution, BackupResult };
export { CancellationToken };

export interface FileMetadata {
  path: string;
  name: string;
  sizeBytes: number;
  modifiedAtMs: number;
  createdAtMs?: number;
  accessedAtMs?: number;
  isDirectory: boolean;
  isSymlink: boolean;
  isHidden: boolean;
  isSystem: boolean;
  permissionsMode?: number;
  identity: FileIdentity;
}

export interface FileIdentity {
  uniqueIdentifier: string; // e.g. inode-device on Unix, FileIndex-VolumeId on Windows, or path-hash
  volumeId?: string;
  inodeOrIndex?: string;
  checksumSha256?: string;
}

export interface StorageItemMetadata {
  path: string;
  sizeBytes: number;
  modifiedAt: string;
  isDirectory: boolean;
  sha256?: string;
  metadata?: Record<string, string>;
}

export interface PutStreamOptions {
  sizeHintBytes?: number;
  metadata?: Record<string, string>;
  onProgress?: (bytesWritten: number) => void;
}

export interface GetStreamOptions {
  start?: number;
  end?: number;
}

export interface StorageProvider {
  capabilities(): StorageCapabilities;
  initialize(): Promise<void>;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  validateConnection?(): Promise<boolean>;
  exists(path: string): Promise<boolean>;
  getMetadata(path: string): Promise<StorageItemMetadata | null>;
  createDirectory(path: string): Promise<void>;
  putStream(path: string, stream: Readable, optionsOrSizeHint?: number | PutStreamOptions): Promise<number>;
  getStream(path: string, options?: GetStreamOptions): Promise<Readable>;
  rename(sourcePath: string, destPath: string): Promise<void>;
  copy?(sourcePath: string, destPath: string): Promise<void>;
  delete(path: string): Promise<void>;
  listDirectory(prefix: string): Promise<StorageItemMetadata[]>;
  close(): Promise<void>;
}

export interface FilesystemProvider {
  scanDirectory(rootPath: string, options?: { recursive?: boolean; followSymlinks?: boolean }): AsyncIterable<FileMetadata>;
  getFileMetadata(filePath: string): Promise<FileMetadata>;
  openReadStream(filePath: string, options?: { start?: number; end?: number }): Promise<Readable>;
  calculateHash(filePath: string): Promise<string>;
}

export interface ProgressReport {
  executionId: UUID;
  phase: 'SCANNING' | 'COMPARING' | 'PROCESSING' | 'TRANSFERRING' | 'VERIFYING' | 'FINALIZING';
  filesScanned: number;
  filesProcessed: number;
  filesTotal: number;
  bytesScanned: number;
  bytesProcessed: number;
  bytesTotal: number;
  currentFilePath?: string;
  percentComplete: number;
  speedBytesPerSec: number;
  estimatedTimeRemainingSec: number;
}

export interface ProgressReporter {
  report(progress: ProgressReport): void;
}

export type EngineEvent =
  | { type: 'JOB_CREATED'; payload: { job: BackupJob } }
  | { type: 'JOB_STARTED'; payload: { execution: BackupExecution } }
  | { type: 'JOB_PAUSED'; payload: { executionId: UUID } }
  | { type: 'JOB_RESUMED'; payload: { executionId: UUID } }
  | { type: 'JOB_PROGRESS'; payload: ProgressReport }
  | { type: 'JOB_COMPLETED'; payload: { result: BackupResult } }
  | { type: 'JOB_FAILED'; payload: { executionId: UUID; error: string } }
  | { type: 'JOB_CANCELLED'; payload: { executionId: UUID; reason?: string } }
  | { type: 'JOB_QUEUED'; payload: { queueItemId: UUID; jobId: UUID; priority: number; triggerType: string } }
  | { type: 'SCHEDULE_TRIGGERED'; payload: { scheduleId: UUID; jobId: UUID; triggerType: string } }
  | { type: 'JOB_RETRY_SCHEDULED'; payload: { queueItemId: UUID; jobId: UUID; attempt: number; nextRetryAt: string; reason: string } }
  | { type: 'JOB_RETRY_STARTED'; payload: { queueItemId: UUID; jobId: UUID; attempt: number } }
  | { type: 'JOB_SKIPPED'; payload: { jobId: UUID; reason: string } }
  | { type: 'JOB_INTERRUPTED'; payload: { executionId: UUID; jobId: UUID; reason: string } }
  | { type: 'FILE_STARTED'; payload: { executionId: UUID; filePath: string; size: number } }
  | { type: 'FILE_COMPLETED'; payload: { executionId: UUID; filePath: string; sha256: string } }
  | { type: 'STORAGE_WARNING'; payload: { message: string; context?: unknown } }
  | { type: 'RESTORE_STARTED'; payload: { requestId: UUID; jobId: UUID; executionId: UUID } }
  | { type: 'RESTORE_PREVIEW_GENERATED'; payload: { requestId: UUID; totalFiles: number; totalBytes: number } }
  | { type: 'RESTORE_FILE_STARTED'; payload: { requestId: UUID; filePath: string; size: number } }
  | { type: 'RESTORE_FILE_COMPLETED'; payload: { requestId: UUID; filePath: string; sha256: string } }
  | { type: 'RESTORE_COMPLETED'; payload: { requestId: UUID; filesRestored: number; bytesRestored: number } }
  | { type: 'RESTORE_FAILED'; payload: { requestId: UUID; error: string } }
  | { type: 'RESTORE_CANCELLED'; payload: { requestId: UUID; reason?: string } }
  | { type: 'RETENTION_STARTED'; payload: { jobId: UUID; policy: any } }
  | { type: 'RETENTION_PREVIEW_GENERATED'; payload: { jobId: UUID; toDeleteCount: number; toKeepCount: number } }
  | { type: 'RETENTION_DELETE_STARTED'; payload: { jobId: UUID; executionId: UUID } }
  | { type: 'RETENTION_DELETE_COMPLETED'; payload: { jobId: UUID; executionId: UUID } }
  | { type: 'RETENTION_COMPLETED'; payload: { jobId: UUID; deletedCount: number; keptCount: number } }
  | { type: 'RETENTION_FAILED'; payload: { jobId: UUID; error: string } };

export interface EventBus {
  publish(event: EngineEvent): void;
  subscribe(listener: (event: EngineEvent) => void): () => void;
}

export interface SecretStore {
  getSecret(key: string): Promise<string | null>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;
}

export interface PlatformProvider {
  getPlatformName(): 'WINDOWS' | 'LINUX' | 'MACOS';
  getFileIdentity(filePath: string): Promise<FileIdentity>;
  createSnapshotIfSupported(volumeRoot: string): Promise<{ snapshotPath: string; release: () => Promise<void> } | null>;
}

export interface ManifestFileEntry {
  path: string;
  sizeBytes: number;
  modifiedAtMs: number;
  sha256: string;
  compressedSizeBytes: number;
  compressedSha256?: string;
  isEncrypted: boolean;
  encryptedSizeBytes?: number;
  encryptedSha256?: string;
  keyId?: string;
  compressionAlgorithm?: string;
  encryptionAlgorithm?: string;
  operation?: 'ADD' | 'MODIFY' | 'DELETE' | 'RENAME';
  previousPath?: string;
  previousSha256?: string;
}

export interface BackupManifest {
  manifestVersion: string;
  formatVersion?: number;
  executionId: UUID;
  jobId: UUID;
  jobType: string;
  createdAt: string;
  chainId?: UUID;
  baseFullExecutionId?: UUID;
  parentExecutionId?: UUID;
  sequence?: number;
  totalFiles: number;
  totalSizeBytes: number;
  totalCompressedSizeBytes?: number;
  totalEncryptedSizeBytes?: number;
  compressionAlgorithm?: string;
  compressionLevel?: number;
  encryptionAlgorithm?: string;
  keyId?: string;
  kdfAlgorithm?: string;
  kdfParameters?: Record<string, unknown>;
  saltHex?: string;
  hashAlgorithm?: string;
  files: ManifestFileEntry[];
  deletedFiles?: string[];
  manifestSha256?: string;
}

export interface BackupFileVersion {
  executionId: UUID;
  jobId: UUID;
  path: string;
  sizeBytes: number;
  modifiedAtMs: number;
  sha256: string;
  backupDate: string;
  isEncrypted: boolean;
}

export interface CatalogSearchQuery {
  jobId?: UUID;
  pathPattern?: string;
  extension?: string;
  sha256?: string;
  fromDate?: string;
  toDate?: string;
  executionType?: string;
}

export interface BackupCatalog {
  saveManifest(manifest: BackupManifest): Promise<void>;
  getManifest(executionId: UUID): Promise<BackupManifest | null>;
  registerExecution(execution: BackupExecution): Promise<void>;
  listExecutions(jobId: UUID): Promise<BackupExecution[]>;
  removeExecution?(jobId: UUID, executionId: UUID): Promise<void>;
  findLatestSuccessfulExecution(jobId: UUID, type?: string): Promise<BackupExecution | null>;
  getLatestValidFullExecution(jobId: UUID): Promise<BackupExecution | null>;
  getLatestValidExecutionInChain(jobId: UUID, baseFullExecutionId?: UUID): Promise<BackupExecution | null>;
  getChainExecutions(jobId: UUID, baseFullExecutionId: UUID): Promise<BackupExecution[]>;
  consolidateEffectiveManifest(jobId: UUID, targetExecutionId: UUID): Promise<BackupManifest | null>;
  searchFiles?(query: CatalogSearchQuery): Promise<BackupFileVersion[]>;
  getFileVersions?(jobId: UUID, relativePath: string): Promise<BackupFileVersion[]>;
}

export interface VerificationEngine {
  verifyFileIntegrity(storage: StorageProvider, remotePath: string, expectedSha256: string, expectedSize: number): Promise<boolean>;
  verifyManifest(manifest: BackupManifest): Promise<boolean>;
}

export interface BackupStrategy {
  readonly strategyType: string;
  execute(params: {
    job: BackupJob;
    execution: BackupExecution;
    storage: StorageProvider;
    filesystem: FilesystemProvider;
    catalog: BackupCatalog;
    progress: ProgressReporter;
    cancellationToken: CancellationToken;
  }): Promise<BackupResult>;
}
