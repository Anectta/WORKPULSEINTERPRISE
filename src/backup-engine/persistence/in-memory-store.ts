import { UUID } from '../core/domain.js';
import { ScheduleConfig } from '../scheduler/types.js';
import { QueueItem } from '../queue/types.js';
import { ScheduleStore, QueueStore, ExecutionHistoryStore, PersistedExecutionRecord } from './contracts.js';

export class InMemoryScheduleStore implements ScheduleStore {
  private readonly schedules = new Map<UUID, ScheduleConfig>();

  public async saveSchedule(schedule: ScheduleConfig): Promise<void> {
    this.schedules.set(schedule.id, JSON.parse(JSON.stringify(schedule)));
  }

  public async getSchedule(id: UUID): Promise<ScheduleConfig | null> {
    const s = this.schedules.get(id);
    return s ? JSON.parse(JSON.stringify(s)) : null;
  }

  public async listSchedules(): Promise<ScheduleConfig[]> {
    return Array.from(this.schedules.values()).map(s => JSON.parse(JSON.stringify(s)));
  }

  public async deleteSchedule(id: UUID): Promise<void> {
    this.schedules.delete(id);
  }
}

export class InMemoryQueueStore implements QueueStore {
  private readonly items = new Map<UUID, Omit<QueueItem, 'cancellationToken'>>();

  public async saveQueueItem(item: QueueItem): Promise<void> {
    const copy: Omit<QueueItem, 'cancellationToken'> = {
      id: item.id,
      jobId: item.jobId,
      scheduleId: item.scheduleId,
      triggerType: item.triggerType,
      priority: item.priority,
      effectivePriority: item.effectivePriority,
      status: item.status,
      enqueuedAt: item.enqueuedAt,
      startedAt: item.startedAt,
      finishedAt: item.finishedAt,
      attemptCount: item.attemptCount,
      maxAttempts: item.maxAttempts,
      nextRetryAt: item.nextRetryAt,
      lastError: item.lastError,
      executionId: item.executionId,
      storageKey: item.storageKey,
      agingBoost: item.agingBoost,
      idempotencyKey: item.idempotencyKey,
      concurrentPolicy: item.concurrentPolicy
    };
    this.items.set(item.id, JSON.parse(JSON.stringify(copy)));
  }

  public async getQueueItem(id: UUID): Promise<Omit<QueueItem, 'cancellationToken'> | null> {
    const it = this.items.get(id);
    return it ? JSON.parse(JSON.stringify(it)) : null;
  }

  public async listQueueItems(): Promise<Array<Omit<QueueItem, 'cancellationToken'>>> {
    return Array.from(this.items.values()).map(i => JSON.parse(JSON.stringify(i)));
  }

  public async deleteQueueItem(id: UUID): Promise<void> {
    this.items.delete(id);
  }

  public async clearCompletedOrCancelled(): Promise<number> {
    let removed = 0;
    for (const [id, item] of this.items.entries()) {
      if (['COMPLETED', 'FAILED', 'CANCELLED', 'SKIPPED'].includes(item.status)) {
        this.items.delete(id);
        removed++;
      }
    }
    return removed;
  }
}

export class InMemoryExecutionHistoryStore implements ExecutionHistoryStore {
  private readonly records: PersistedExecutionRecord[] = [];

  public async recordExecution(execution: PersistedExecutionRecord): Promise<void> {
    this.records.push(JSON.parse(JSON.stringify(execution)));
  }

  public async listExecutions(jobId?: UUID): Promise<PersistedExecutionRecord[]> {
    if (!jobId) return [...this.records];
    return this.records.filter(r => r.jobId === jobId);
  }
}
