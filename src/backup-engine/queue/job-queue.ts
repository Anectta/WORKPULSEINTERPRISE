import { UUID, BackupJobStatus, JobPriority, ScheduleTriggerType, ConcurrentExecutionPolicy } from '../core/domain.js';
import { QueueItem, QueueConfig, DEFAULT_QUEUE_CONFIG } from './types.js';
import { QueueStore } from '../persistence/contracts.js';
import { PriorityManager } from './priority-manager.js';
import { JobExecutionLock } from './job-execution-lock.js';
import { EventBus } from '../core/contracts.js';
import { CancellationToken, EngineError, ErrorCategory } from '../core/errors.js';
import * as crypto from 'node:crypto';

export class JobQueue {
  private readonly items = new Map<UUID, QueueItem>();
  private readonly priorityManager: PriorityManager;

  constructor(
    private readonly store: QueueStore,
    private readonly lock: JobExecutionLock,
    private readonly eventBus?: EventBus,
    private readonly config: QueueConfig = DEFAULT_QUEUE_CONFIG
  ) {
    this.priorityManager = new PriorityManager(config.agingIntervalMs, config.agingBoostAmount);
  }

  public async initialize(): Promise<void> {
    const persisted = await this.store.listQueueItems();
    for (const p of persisted) {
      const item: QueueItem = {
        ...p,
        cancellationToken: new CancellationToken()
      };
      this.items.set(item.id, item);
    }
  }

  /**
   * Enfileira um novo job ou recupera existente respeitando idempotência e política de concorrência.
   */
  public async enqueue(params: {
    jobId: UUID;
    scheduleId?: UUID;
    triggerType: ScheduleTriggerType;
    priority?: JobPriority;
    storageKey: string;
    maxAttempts?: number;
    idempotencyKey?: string;
    concurrentPolicy?: ConcurrentExecutionPolicy;
  }): Promise<{ item: QueueItem; enqueued: boolean; reason?: string }> {
    const concurrentPolicy = params.concurrentPolicy || ConcurrentExecutionPolicy.QUEUE;
    const priority = params.priority || JobPriority.NORMAL;

    // 1. Verificação de Idempotência
    if (params.idempotencyKey) {
      for (const existing of this.items.values()) {
        if (
          existing.idempotencyKey === params.idempotencyKey &&
          ['PENDING', 'QUEUED', 'RUNNING', 'WAITING_RETRY', 'RETRYING'].includes(existing.status)
        ) {
          return { item: existing, enqueued: false, reason: 'IDEMPOTENT_DUPLICATE_IGNORED' };
        }
      }
    }

    // 2. Prevenção de Execução Concorrente Conflitante
    const isRunning = this.lock.isJobRunning(params.jobId);
    if (isRunning) {
      if (concurrentPolicy === ConcurrentExecutionPolicy.SKIP) {
        this.eventBus?.publish({
          type: 'JOB_SKIPPED',
          payload: { jobId: params.jobId, reason: 'Job já está em execução (política SKIP)' }
        });
        const skippedItem: QueueItem = {
          id: crypto.randomUUID(),
          jobId: params.jobId,
          scheduleId: params.scheduleId,
          triggerType: params.triggerType,
          priority,
          status: BackupJobStatus.SKIPPED,
          enqueuedAt: new Date().toISOString(),
          attemptCount: 0,
          maxAttempts: params.maxAttempts || 3,
          storageKey: params.storageKey,
          agingBoost: 0,
          idempotencyKey: params.idempotencyKey,
          concurrentPolicy
        };
        await this.store.saveQueueItem(skippedItem);
        return { item: skippedItem, enqueued: false, reason: 'JOB_RUNNING_SKIPPED' };
      }

      if (concurrentPolicy === ConcurrentExecutionPolicy.REPLACE) {
        // Sinaliza cancelamento para a execução atual
        const currentLock = this.lock.getLock(params.jobId);
        if (currentLock) {
          const runningItem = this.items.get(currentLock.queueItemId);
          if (runningItem?.cancellationToken) {
            runningItem.cancellationToken.cancel('Substituído por novo disparo (política REPLACE)');
          }
        }
      }
    }

    // 3. Criação do item na fila
    const queueItemId = crypto.randomUUID();
    const item: QueueItem = {
      id: queueItemId,
      jobId: params.jobId,
      scheduleId: params.scheduleId,
      triggerType: params.triggerType,
      priority,
      effectivePriority: priority,
      status: BackupJobStatus.QUEUED,
      enqueuedAt: new Date().toISOString(),
      attemptCount: 0,
      maxAttempts: params.maxAttempts || 3,
      cancellationToken: new CancellationToken(),
      storageKey: params.storageKey,
      agingBoost: 0,
      idempotencyKey: params.idempotencyKey,
      concurrentPolicy
    };

    this.items.set(queueItemId, item);
    await this.store.saveQueueItem(item);

    this.eventBus?.publish({
      type: 'JOB_QUEUED',
      payload: {
        queueItemId,
        jobId: params.jobId,
        priority: item.priority,
        triggerType: item.triggerType
      }
    });

    return { item, enqueued: true };
  }

  /**
   * Obtém os itens prontos para execução, ordenados por prioridade e tempo de espera.
   */
  public getEligibleCandidates(currentTime: Date = new Date()): QueueItem[] {
    const candidates: QueueItem[] = [];
    const nowMs = currentTime.getTime();

    for (const item of this.items.values()) {
      if (item.status === BackupJobStatus.QUEUED || item.status === BackupJobStatus.PENDING) {
        candidates.push(item);
      } else if (item.status === BackupJobStatus.WAITING_RETRY && item.nextRetryAt) {
        if (new Date(item.nextRetryAt).getTime() <= nowMs) {
          item.status = BackupJobStatus.QUEUED;
          candidates.push(item);
        }
      }
    }

    return this.priorityManager.sortQueue(candidates, currentTime);
  }

  public async cancel(queueItemId: UUID, reason: string = 'Cancelado pelo usuário'): Promise<boolean> {
    const item = this.items.get(queueItemId);
    if (!item) return false;

    if (['COMPLETED', 'FAILED', 'CANCELLED', 'SKIPPED'].includes(item.status)) {
      return false;
    }

    if (item.status === BackupJobStatus.RUNNING) {
      item.cancellationToken?.cancel(reason);
    } else {
      item.status = BackupJobStatus.CANCELLED;
      item.finishedAt = new Date().toISOString();
      await this.store.saveQueueItem(item);
      this.eventBus?.publish({
        type: 'JOB_CANCELLED',
        payload: { executionId: item.executionId || queueItemId, reason }
      });
    }

    return true;
  }

  public async pause(queueItemId: UUID): Promise<boolean> {
    const item = this.items.get(queueItemId);
    if (!item || item.status !== BackupJobStatus.RUNNING) return false;

    item.status = BackupJobStatus.PAUSED;
    await this.store.saveQueueItem(item);
    this.eventBus?.publish({
      type: 'JOB_PAUSED',
      payload: { executionId: item.executionId || queueItemId }
    });
    return true;
  }

  public async resume(queueItemId: UUID): Promise<boolean> {
    const item = this.items.get(queueItemId);
    if (!item || item.status !== BackupJobStatus.PAUSED) return false;

    item.status = BackupJobStatus.RUNNING;
    await this.store.saveQueueItem(item);
    this.eventBus?.publish({
      type: 'JOB_RESUMED',
      payload: { executionId: item.executionId || queueItemId }
    });
    return true;
  }

  public getItem(id: UUID): QueueItem | undefined {
    return this.items.get(id);
  }

  public getAllItems(): QueueItem[] {
    return Array.from(this.items.values());
  }

  public async updateItem(item: QueueItem): Promise<void> {
    this.items.set(item.id, item);
    await this.store.saveQueueItem(item);
  }

  public async deleteItem(id: UUID): Promise<void> {
    this.items.delete(id);
    await this.store.deleteQueueItem(id);
  }
}
