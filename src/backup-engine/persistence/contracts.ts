import { UUID, BackupJobStatus, JobPriority, ScheduleTriggerType } from '../core/domain.js';
import { ScheduleConfig } from '../scheduler/types.js';
import { QueueItem } from '../queue/types.js';

export interface PersistedScheduleRecord {
  schedule: ScheduleConfig;
  updatedAt: string;
}

export interface PersistedQueueItemRecord {
  item: Omit<QueueItem, 'cancellationToken'>;
  updatedAt: string;
}

export interface PersistedExecutionRecord {
  executionId: UUID;
  jobId: UUID;
  status: BackupJobStatus;
  startedAt: string;
  finishedAt?: string;
  durationMs: number;
  attemptCount: number;
  errorSummary?: string;
  updatedAt: string;
}

export interface ScheduleStore {
  saveSchedule(schedule: ScheduleConfig): Promise<void>;
  getSchedule(id: UUID): Promise<ScheduleConfig | null>;
  listSchedules(): Promise<ScheduleConfig[]>;
  deleteSchedule(id: UUID): Promise<void>;
}

export interface QueueStore {
  saveQueueItem(item: QueueItem): Promise<void>;
  getQueueItem(id: UUID): Promise<Omit<QueueItem, 'cancellationToken'> | null>;
  listQueueItems(): Promise<Array<Omit<QueueItem, 'cancellationToken'>>>;
  deleteQueueItem(id: UUID): Promise<void>;
  clearCompletedOrCancelled(): Promise<number>;
}

export interface ExecutionHistoryStore {
  recordExecution(execution: PersistedExecutionRecord): Promise<void>;
  listExecutions(jobId?: UUID): Promise<PersistedExecutionRecord[]>;
}
