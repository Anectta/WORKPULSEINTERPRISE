import { UUID, RestoreMode, OverwritePolicy, RestoreConflictPolicy, SymlinkPolicy } from '../core/domain.js';

export type RestorePlanAction = 'CREATE' | 'OVERWRITE' | 'SKIP' | 'RENAME' | 'ERROR';

export interface RestorePreviewItem {
  relativePath: string;
  sourceExecutionId: UUID;
  targetFullPath: string;
  sizeBytes: number;
  expectedSha256: string;
  isEncrypted: boolean;
  compressionAlgorithm?: string;
  action: RestorePlanAction;
  reason?: string;
  conflictExists: boolean;
  existingSizeBytes?: number;
  existingModifiedAtMs?: number;
  backupModifiedAtMs?: number;
}

export interface RestorePreview {
  requestId: UUID;
  jobId: UUID;
  executionId: UUID;
  targetDirectory: string;
  totalFiles: number;
  totalBytes: number;
  toCreate: number;
  toOverwrite: number;
  toSkip: number;
  toRename: number;
  errors: string[];
  items: RestorePreviewItem[];
}

export interface RestorePlan {
  requestId: UUID;
  jobId: UUID;
  executionId: UUID;
  targetDirectory: string;
  items: RestorePreviewItem[];
  validated: boolean;
}

export interface RestoreProgressReport {
  requestId: UUID;
  phase: 'VALIDATING' | 'PLANNING' | 'DOWNLOADING' | 'VERIFYING' | 'WRITING' | 'COMPLETED' | 'FAILED';
  filesProcessed: number;
  filesTotal: number;
  bytesProcessed: number;
  bytesTotal: number;
  currentFilePath?: string;
  percentComplete: number;
  speedBytesPerSec: number;
  estimatedTimeRemainingSec: number;
}
