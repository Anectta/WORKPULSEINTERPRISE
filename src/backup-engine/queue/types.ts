import { UUID, BackupJobStatus, JobPriority, ScheduleTriggerType, ConcurrentExecutionPolicy } from '../core/domain.js';
import { CancellationToken } from '../core/errors.js';

export interface QueueItem {
  id: UUID;
  jobId: UUID;
  scheduleId?: UUID;
  triggerType: ScheduleTriggerType;
  priority: JobPriority;
  effectivePriority?: number; // Calculado pelo PriorityManager (Priority - agingBoost)
  status: BackupJobStatus;
  enqueuedAt: string;
  startedAt?: string;
  finishedAt?: string;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt?: string;
  lastError?: string;
  cancellationToken?: CancellationToken;
  executionId?: UUID;
  storageKey: string; // Ex: 'LOCAL', 'SMB:share-1', 'S3:bucket-prod' para concorrência por destino
  agingBoost: number; // Boost dinâmico para evitar starvation
  idempotencyKey?: string;
  concurrentPolicy: ConcurrentExecutionPolicy;
}

export interface QueueConfig {
  maxGlobalConcurrency: number;
  maxPerStorage: number;
  maxPerJob: number;
  agingIntervalMs: number;
  agingBoostAmount: number;
}

export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxGlobalConcurrency: 2,
  maxPerStorage: 1,
  maxPerJob: 1,
  agingIntervalMs: 30000,
  agingBoostAmount: 1
};

export interface QueueMetrics {
  jobsTotal: number;
  jobsRunning: number;
  jobsQueued: number;
  jobsCompleted: number;
  jobsFailed: number;
  jobsCancelled: number;
  jobsRetried: number;
  jobsInterrupted: number;
  jobsSkipped: number;
  totalQueueWaitTimeMs: number;
  totalExecutionTimeMs: number;
  retryCount: number;
  activePerStorage: Record<string, number>;
}
