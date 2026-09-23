import { UUID, BackupJobType } from '../core/domain.js';

export interface RetentionPolicy {
  keepLastN?: number;
  keepDaily?: number;
  keepWeekly?: number;
  keepMonthly?: number;
  keepYearly?: number;
  keepForDays?: number;
  keepForMonths?: number;
}

export type RetentionActionType = 'KEEP' | 'DELETE' | 'PROTECTED' | 'DEPENDENCY';

export interface RetentionPreviewItem {
  executionId: UUID;
  jobId: UUID;
  executionType: BackupJobType;
  startedAt: string;
  action: RetentionActionType;
  reason: string;
  dependentExecutionIds: UUID[];
  isProtected: boolean;
  sizeBytes: number;
}

export interface RetentionPreview {
  jobId: UUID;
  totalScanned: number;
  toKeep: number;
  toDelete: number;
  protectedCount: number;
  dependencyProtectedCount: number;
  items: RetentionPreviewItem[];
}

export interface RetentionResult {
  success: boolean;
  jobId: UUID;
  dryRun: boolean;
  scannedCount: number;
  keptCount: number;
  deletedCount: number;
  freedBytes: number;
  deletedExecutionIds: UUID[];
  errors: string[];
}
