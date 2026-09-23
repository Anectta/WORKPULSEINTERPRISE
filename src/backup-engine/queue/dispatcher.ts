import { UUID, BackupJob, BackupJobStatus } from '../core/domain.js';
import { QueueItem, QueueConfig, QueueMetrics, DEFAULT_QUEUE_CONFIG } from './types.js';
import { JobQueue } from './job-queue.js';
import { JobExecutionLock } from './job-execution-lock.js';
import { JobExecutor } from '../core/job-executor.js';
import { SmartRetryManager } from '../retry/smart-retry.js';
import { EventBus, ProgressReporter } from '../core/contracts.js';
import { ExecutionHistoryStore } from '../persistence/contracts.js';
import * as crypto from 'node:crypto';

export interface DispatcherOptions {
  queue: JobQueue;
  lock: JobExecutionLock;
  executor: JobExecutor;
  jobLookup: (jobId: UUID) => Promise<BackupJob | null>;
  eventBus?: EventBus;
  historyStore?: ExecutionHistoryStore;
  config?: Partial<QueueConfig>;
  retryManager?: SmartRetryManager;
}

export class ExecutionDispatcher {
  private readonly queue: JobQueue;
  private readonly lock: JobExecutionLock;
  private readonly executor: JobExecutor;
  private readonly jobLookup: (jobId: UUID) => Promise<BackupJob | null>;
  private readonly eventBus?: EventBus;
  private readonly historyStore?: ExecutionHistoryStore;
  private readonly config: QueueConfig;
  private readonly retryManager: SmartRetryManager;

  private activeGlobalCount = 0;
  private readonly activePerStorage = new Map<string, number>();
  private readonly activePerJob = new Map<UUID, number>();
  private isRunning = false;
  private dispatchScheduled = false;

  private readonly metrics: QueueMetrics = {
    jobsTotal: 0,
    jobsRunning: 0,
    jobsQueued: 0,
    jobsCompleted: 0,
    jobsFailed: 0,
    jobsCancelled: 0,
    jobsRetried: 0,
    jobsInterrupted: 0,
    jobsSkipped: 0,
    totalQueueWaitTimeMs: 0,
    totalExecutionTimeMs: 0,
    retryCount: 0,
    activePerStorage: {}
  };

  constructor(options: DispatcherOptions) {
    this.queue = options.queue;
    this.lock = options.lock;
    this.executor = options.executor;
    this.jobLookup = options.jobLookup;
    this.eventBus = options.eventBus;
    this.historyStore = options.historyStore;
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...options.config };
    this.retryManager = options.retryManager || new SmartRetryManager();
  }

  public start(): void {
    this.isRunning = true;
    this.scheduleDispatch();
  }

  public stop(): void {
    this.isRunning = false;
  }

  public scheduleDispatch(): void {
    if (this.dispatchScheduled) return;
    this.dispatchScheduled = true;
    setImmediate(async () => {
      this.dispatchScheduled = false;
      await this.dispatch();
    });
  }

  /**
   * Ciclo principal de despacho com limites estritos de concorrência global, por storage e por job.
   */
  public async dispatch(): Promise<number> {
    if (!this.isRunning) return 0;

    let dispatchedCount = 0;
    const eligible = this.queue.getEligibleCandidates();

    for (const item of eligible) {
      // 1. Limite global de concorrência
      if (this.activeGlobalCount >= this.config.maxGlobalConcurrency) {
        break;
      }

      // 2. Limite por storage/destino
      const currentStorageCount = this.activePerStorage.get(item.storageKey) || 0;
      if (currentStorageCount >= this.config.maxPerStorage) {
        continue;
      }

      // 3. Limite por job
      const currentJobCount = this.activePerJob.get(item.jobId) || 0;
      if (currentJobCount >= this.config.maxPerJob) {
        continue;
      }

      // 4. Tentativa de lock exclusivo para o job
      const executionId = crypto.randomUUID();
      const lockAcquired = this.lock.tryAcquire(item.jobId, executionId, item.id);
      if (!lockAcquired) {
        continue;
      }

      // Dispara job de forma assíncrona controlada
      this.activeGlobalCount++;
      this.activePerStorage.set(item.storageKey, currentStorageCount + 1);
      this.activePerJob.set(item.jobId, currentJobCount + 1);
      dispatchedCount++;

      // Atualiza métricas
      this.metrics.jobsRunning = this.activeGlobalCount;
      this.metrics.activePerStorage[item.storageKey] = this.activePerStorage.get(item.storageKey) || 0;

      // Executa o processamento do item sem bloquear o loop
      this.runItem(item, executionId).catch(err => {
        console.error('[ExecutionDispatcher] Erro não tratado em runItem:', err);
      });
    }

    return dispatchedCount;
  }

  private async runItem(item: QueueItem, executionId: UUID): Promise<void> {
    const startTime = Date.now();
    const waitTimeMs = startTime - new Date(item.enqueuedAt).getTime();
    this.metrics.totalQueueWaitTimeMs += waitTimeMs;

    item.status = BackupJobStatus.RUNNING;
    item.startedAt = new Date().toISOString();
    item.executionId = executionId;
    item.attemptCount++;
    await this.queue.updateItem(item);

    try {
      const job = await this.jobLookup(item.jobId);
      if (!job) {
        throw new Error(`Job ${item.jobId} não encontrado no repositório de jobs.`);
      }

      if (item.cancellationToken?.isCancelled) {
        throw item.cancellationToken.toEngineError();
      }

      // Executa o job através do JobExecutor preservado
      const result = await this.executor.executeJob(job, undefined, item.cancellationToken);

      // Sucesso na execução
      item.status = BackupJobStatus.COMPLETED;
      item.finishedAt = new Date().toISOString();
      await this.queue.updateItem(item);

      const durationMs = Date.now() - startTime;
      this.metrics.jobsCompleted++;
      this.metrics.totalExecutionTimeMs += durationMs;

      await this.historyStore?.recordExecution({
        executionId,
        jobId: item.jobId,
        status: BackupJobStatus.COMPLETED,
        startedAt: item.startedAt,
        finishedAt: item.finishedAt,
        durationMs,
        attemptCount: item.attemptCount,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      const isCancelled = item.cancellationToken?.isCancelled;
      const durationMs = Date.now() - startTime;

      if (isCancelled) {
        item.status = BackupJobStatus.CANCELLED;
        item.finishedAt = new Date().toISOString();
        item.lastError = err?.message || 'Cancelado pelo usuário';
        await this.queue.updateItem(item);
        this.metrics.jobsCancelled++;
      } else {
        // Avalia elegibilidade para retry
        const retryDecision = this.retryManager.shouldRetry(err, item.attemptCount);

        if (retryDecision.retry) {
          item.status = BackupJobStatus.WAITING_RETRY;
          const retryDelayMs = retryDecision.delayMs;
          const nextRetryAt = new Date(Date.now() + retryDelayMs).toISOString();
          item.nextRetryAt = nextRetryAt;
          item.lastError = err?.message || String(err);
          await this.queue.updateItem(item);

          this.metrics.jobsRetried++;
          this.metrics.retryCount++;

          this.eventBus?.publish({
            type: 'JOB_RETRY_SCHEDULED',
            payload: {
              queueItemId: item.id,
              jobId: item.jobId,
              attempt: item.attemptCount,
              nextRetryAt,
              reason: retryDecision.classification.reason
            }
          });

          // Agenda timer pontual para re-despacho no momento do retry
          setTimeout(() => {
            this.scheduleDispatch();
          }, Math.max(10, retryDelayMs));
        } else {
          // Erro fatal ou esgotamento de tentativas
          item.status = BackupJobStatus.FAILED;
          item.finishedAt = new Date().toISOString();
          item.lastError = err?.message || String(err);
          await this.queue.updateItem(item);
          this.metrics.jobsFailed++;
        }
      }

      await this.historyStore?.recordExecution({
        executionId,
        jobId: item.jobId,
        status: item.status,
        startedAt: item.startedAt,
        finishedAt: item.finishedAt,
        durationMs,
        attemptCount: item.attemptCount,
        errorSummary: item.lastError,
        updatedAt: new Date().toISOString()
      });
    } finally {
      // Libera locks e slots de concorrência
      this.lock.release(item.jobId, executionId);
      this.activeGlobalCount = Math.max(0, this.activeGlobalCount - 1);

      const storageCount = this.activePerStorage.get(item.storageKey) || 1;
      this.activePerStorage.set(item.storageKey, Math.max(0, storageCount - 1));

      const jobCount = this.activePerJob.get(item.jobId) || 1;
      this.activePerJob.set(item.jobId, Math.max(0, jobCount - 1));

      this.metrics.jobsRunning = this.activeGlobalCount;

      // Despacha próximos itens que estavam aguardando vaga
      this.scheduleDispatch();
    }
  }

  public getActiveGlobalCount(): number {
    return this.activeGlobalCount;
  }

  public getActivePerStorageCount(storageKey: string): number {
    return this.activePerStorage.get(storageKey) || 0;
  }

  public getMetrics(): Readonly<QueueMetrics> {
    return { ...this.metrics };
  }
}
