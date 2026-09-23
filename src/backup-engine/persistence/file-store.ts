import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { UUID } from '../core/domain.js';
import { ScheduleConfig } from '../scheduler/types.js';
import { QueueItem } from '../queue/types.js';
import { ScheduleStore, QueueStore, ExecutionHistoryStore, PersistedExecutionRecord } from './contracts.js';
import { EngineError, ErrorCategory } from '../core/errors.js';

export class FilePersistenceStore implements ScheduleStore, QueueStore, ExecutionHistoryStore {
  private readonly schedulesFile: string;
  private readonly queueFile: string;
  private readonly executionsFile: string;
  private initialized = false;

  constructor(private readonly baseDirectory: string) {
    this.schedulesFile = path.join(baseDirectory, 'schedules.json');
    this.queueFile = path.join(baseDirectory, 'queue.json');
    this.executionsFile = path.join(baseDirectory, 'executions.json');
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    await fs.mkdir(this.baseDirectory, { recursive: true });

    // Garante existência dos arquivos base se não existirem
    await this.ensureFile(this.schedulesFile, '[]');
    await this.ensureFile(this.queueFile, '[]');
    await this.ensureFile(this.executionsFile, '[]');

    this.initialized = true;
  }

  private async ensureFile(filePath: string, defaultContent: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      await this.atomicWrite(filePath, defaultContent);
    }
  }

  private async atomicWrite(filePath: string, content: string): Promise<void> {
    const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
    await fs.writeFile(tmpPath, content, { encoding: 'utf8', flag: 'w' });
    await fs.rename(tmpPath, filePath);
  }

  private async readJson<T>(filePath: string): Promise<T> {
    await this.initialize();
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data) as T;
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return [] as unknown as T;
      }
      throw new EngineError({
        code: 'PERSISTENCE_READ_FAILED',
        message: `Falha ao ler arquivo de persistência: ${filePath}`,
        category: ErrorCategory.STORAGE,
        cause: err
      });
    }
  }

  // --- ScheduleStore ---

  public async saveSchedule(schedule: ScheduleConfig): Promise<void> {
    const schedules = await this.readJson<ScheduleConfig[]>(this.schedulesFile);
    const index = schedules.findIndex(s => s.id === schedule.id);
    if (index >= 0) {
      schedules[index] = schedule;
    } else {
      schedules.push(schedule);
    }
    await this.atomicWrite(this.schedulesFile, JSON.stringify(schedules, null, 2));
  }

  public async getSchedule(id: UUID): Promise<ScheduleConfig | null> {
    const schedules = await this.readJson<ScheduleConfig[]>(this.schedulesFile);
    return schedules.find(s => s.id === id) ?? null;
  }

  public async listSchedules(): Promise<ScheduleConfig[]> {
    return this.readJson<ScheduleConfig[]>(this.schedulesFile);
  }

  public async deleteSchedule(id: UUID): Promise<void> {
    const schedules = await this.readJson<ScheduleConfig[]>(this.schedulesFile);
    const filtered = schedules.filter(s => s.id !== id);
    await this.atomicWrite(this.schedulesFile, JSON.stringify(filtered, null, 2));
  }

  // --- QueueStore ---

  public async saveQueueItem(item: QueueItem): Promise<void> {
    const items = await this.readJson<Array<Omit<QueueItem, 'cancellationToken'>>>(this.queueFile);
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

    const index = items.findIndex(i => i.id === item.id);
    if (index >= 0) {
      items[index] = copy;
    } else {
      items.push(copy);
    }
    await this.atomicWrite(this.queueFile, JSON.stringify(items, null, 2));
  }

  public async getQueueItem(id: UUID): Promise<Omit<QueueItem, 'cancellationToken'> | null> {
    const items = await this.readJson<Array<Omit<QueueItem, 'cancellationToken'>>>(this.queueFile);
    return items.find(i => i.id === id) ?? null;
  }

  public async listQueueItems(): Promise<Array<Omit<QueueItem, 'cancellationToken'>>> {
    return this.readJson<Array<Omit<QueueItem, 'cancellationToken'>>>(this.queueFile);
  }

  public async deleteQueueItem(id: UUID): Promise<void> {
    const items = await this.readJson<Array<Omit<QueueItem, 'cancellationToken'>>>(this.queueFile);
    const filtered = items.filter(i => i.id !== id);
    await this.atomicWrite(this.queueFile, JSON.stringify(filtered, null, 2));
  }

  public async clearCompletedOrCancelled(): Promise<number> {
    const items = await this.readJson<Array<Omit<QueueItem, 'cancellationToken'>>>(this.queueFile);
    const keep = items.filter(i => !['COMPLETED', 'FAILED', 'CANCELLED', 'SKIPPED'].includes(i.status));
    const removed = items.length - keep.length;
    await this.atomicWrite(this.queueFile, JSON.stringify(keep, null, 2));
    return removed;
  }

  // --- ExecutionHistoryStore ---

  public async recordExecution(execution: PersistedExecutionRecord): Promise<void> {
    const execs = await this.readJson<PersistedExecutionRecord[]>(this.executionsFile);
    const idx = execs.findIndex(e => e.executionId === execution.executionId);
    if (idx >= 0) {
      execs[idx] = execution;
    } else {
      execs.push(execution);
    }
    await this.atomicWrite(this.executionsFile, JSON.stringify(execs, null, 2));
  }

  public async listExecutions(jobId?: UUID): Promise<PersistedExecutionRecord[]> {
    const execs = await this.readJson<PersistedExecutionRecord[]>(this.executionsFile);
    if (!jobId) return execs;
    return execs.filter(e => e.jobId === jobId);
  }
}
