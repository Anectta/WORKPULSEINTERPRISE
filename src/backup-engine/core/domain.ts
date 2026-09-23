import { describe, it } from 'node:test';

/**
 * Domain Models & Invariant Types for Backup & Recovery Engine
 */

export type UUID = string;

export enum BackupJobType {
  FULL = 'FULL',
  INCREMENTAL = 'INCREMENTAL',
  DIFFERENTIAL = 'DIFFERENTIAL',
  MIRROR = 'MIRROR',
  TWO_WAY_SYNC = 'TWO_WAY_SYNC'
}

export enum BackupJobStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  RETRYING = 'RETRYING',
  WAITING_RETRY = 'WAITING_RETRY',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  SKIPPED = 'SKIPPED',
  INTERRUPTED = 'INTERRUPTED'
}

export enum JobPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4
}

export enum ConcurrentExecutionPolicy {
  SKIP = 'SKIP',
  QUEUE = 'QUEUE',
  REPLACE = 'REPLACE',
  ALLOW = 'ALLOW'
}

export enum MissedExecutionPolicy {
  SKIP = 'SKIP',
  RUN_IMMEDIATELY = 'RUN_IMMEDIATELY',
  RUN_NEXT_SCHEDULED_TIME = 'RUN_NEXT_SCHEDULED_TIME'
}

export enum ScheduleTriggerType {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
  STARTUP = 'STARTUP',
  NETWORK_AVAILABLE = 'NETWORK_AVAILABLE'
}

export enum StorageProviderType {
  LOCAL = 'LOCAL',
  SMB = 'SMB',
  SFTP = 'SFTP',
  S3 = 'S3'
}

export enum CompressionType {
  NONE = 'NONE',
  ZSTD = 'ZSTD',
  ZIP = 'ZIP'
}

export enum EncryptionAlgorithm {
  NONE = 'NONE',
  AES_256_GCM = 'AES_256_GCM'
}

export interface BackupSource {
  paths: string[];
  includePatterns?: string[];
  excludePatterns?: string[];
  followSymlinks?: boolean;
  maxFileSizeBytes?: number;
}

export interface BackupDestination {
  id: UUID;
  name: string;
  providerType: StorageProviderType;
  baseUri: string;
  config: Record<string, unknown>;
  secretKeyRef?: string;
}

export interface BackupPolicy {
  compressionType: CompressionType;
  compressionLevel: number;
  encryptionAlgorithm: EncryptionAlgorithm;
  keyDerivation: 'ARGON2ID' | 'PBKDF2' | 'NONE';
  vssEnabled: boolean;
  retentionDays: number;
  maxVersions: number;
  safeDeleteRetentionDays: number;
  verifyChecksumAfterWrite: boolean;
}

export interface BackupJob {
  id: UUID;
  tenantId: string;
  name: string;
  description?: string;
  jobType: BackupJobType;
  priority: number; // 1 (Highest) to 10 (Lowest)
  source: BackupSource;
  destination: BackupDestination;
  policy: BackupPolicy;
  status: BackupJobStatus;
  createdAt: string;
  updatedAt: string;
  lastExecutionId?: UUID;
  nextScheduledRun?: string;
}

export interface BackupExecution {
  executionId: UUID;
  jobId: UUID;
  tenantId: string;
  executionType: BackupJobType;
  status: BackupJobStatus;
  startedAt: string;
  finishedAt?: string;
  durationMs: number;
  filesScanned: number;
  filesProcessed: number;
  filesFailed: number;
  bytesScanned: number;
  bytesProcessed: number;
  bytesTransferred: number;
  manifestHash?: string;
  errorSummary?: string;
  isProtected?: boolean;
}

export enum RestoreMode {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  FILES = 'FILES',
  DIRECTORY = 'DIRECTORY'
}

export enum OverwritePolicy {
  NEVER = 'NEVER',
  ALWAYS = 'ALWAYS',
  IF_NEWER = 'IF_NEWER',
  IF_DIFFERENT = 'IF_DIFFERENT'
}

export enum RestoreConflictPolicy {
  SKIP = 'SKIP',
  OVERWRITE = 'OVERWRITE',
  RENAME = 'RENAME',
  FAIL = 'FAIL'
}

export enum SymlinkPolicy {
  IGNORE = 'IGNORE',
  COPY = 'COPY',
  PRESERVE = 'PRESERVE'
}

export interface RestoreRequest {
  requestId: UUID;
  jobId: UUID;
  executionId?: UUID;
  versionId?: UUID;
  pointInTime?: string;
  restoreMode?: RestoreMode;
  selectedPaths: string[];
  sourcePath?: string;
  destinationPath?: string;
  targetDirectory: string;
  overwriteStrategy?: 'OVERWRITE_ALWAYS' | 'PRESERVE_NEWER' | 'RENAME_CONFLICT' | 'NEVER_OVERWRITE';
  overwritePolicy?: OverwritePolicy;
  conflictPolicy?: RestoreConflictPolicy;
  symlinkPolicy?: SymlinkPolicy;
  restorePermissions?: boolean;
  preserveMetadata?: boolean;
  verifyIntegrity?: boolean;
  verifyAfterRestore?: boolean;
  password?: string;
}

export interface BackupResult {
  success: boolean;
  status: BackupJobStatus;
  executionId: UUID;
  jobId: UUID;
  durationMs: number;
  metrics: {
    filesScanned: number;
    filesProcessed: number;
    filesFailed: number;
    bytesScanned: number;
    bytesProcessed: number;
    bytesTransferred: number;
    throughputBytesPerSec: number;
  };
  manifestHash?: string;
  warnings?: string[];
  errors: string[];
  integrityVerified?: boolean;
}

export interface RestoreResult {
  success: boolean;
  requestId: UUID;
  jobId?: UUID;
  executionId?: UUID;
  targetDirectory?: string;
  durationMs: number;
  filesRestored: number;
  filesSkipped?: number;
  filesFailed: number;
  bytesRestored: number;
  errors: string[];
  integrityPassed: boolean;
}
