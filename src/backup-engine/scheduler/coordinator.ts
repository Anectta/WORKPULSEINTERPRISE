import { UUID, BackupJob, BackupJobStatus, StorageProviderType } from '../core/domain.js';
import { Scheduler } from './scheduler.js';
import { JobQueue } from '../queue/job-queue.js';
import { JobExecutionLock } from '../queue/job-execution-lock.js';
import { ExecutionDispatcher } from '../queue/dispatcher.js';
import { JobExecutor } from '../core/job-executor.js';
import { EventBus } from '../core/contracts.js';
import { ScheduleStore, QueueStore, ExecutionHistoryStore } from '../persistence/contracts.js';
import { InMemoryScheduleStore, InMemoryQueueStore, InMemoryExecutionHistoryStore } from '../persistence/in-memory-store.js';
import { CrashRecoveryManager, RecoveryReport } from '../persistence/crash-recovery.js';
import { QueueConfig, DEFAULT_QUEUE_CONFIG, QueueMetrics } from '../queue/types.js';
import { SchedulerMetrics } from './types.js';
import { SmartRetryManager } from '../retry/smart-retry.js';

export interface SchedulerCoordinatorOptions {
  executor: JobExecutor;
  jobLookup: (jobId: UUID) => Promise<BackupJob | null>;
  eventBus?: EventBus;
  scheduleStore?: ScheduleStore;
  queueStore?: QueueStore;
  historyStore?: ExecutionHistoryStore;
  queueConfig?: Partial<QueueConfig>;
  retryManager?: SmartRetryManager;
  autoRecoverInterrupted?: boolean;
}

export class BackupSchedulerCoordinator {
  public readonly scheduler: Scheduler;
  public readonly queue: JobQueue;
  public readonly lock: JobExecutionLock;
  public readonly dispatcher: ExecutionDispatcher;
  public readonly scheduleStore: ScheduleStore;
  public readonly queueStore: QueueStore;
  public readonly historyStore: ExecutionHistoryStore;

  private isStarted = false;

  constructor(private readonly options: SchedulerCoordinatorOptions) {
    this.scheduleStore = options.scheduleStore || new InMemoryScheduleStore();
    this.queueStore = options.queueStore || new InMemoryQueueStore();
    this.historyStore = options.historyStore || new InMemoryExecutionHistoryStore();
    this.lock = new JobExecutionLock();

    this.queue = new JobQueue(
      this.queueStore,
      this.lock,
      options.eventBus,
      { ...DEFAULT_QUEUE_CONFIG, ...options.queueConfig }
    );

    this.dispatcher = new ExecutionDispatcher({
      queue: this.queue,
      lock: this.lock,
      executor: options.executor,
      jobLookup: options.jobLookup,
      eventBus: options.eventBus,
      historyStore: this.historyStore,
      config: options.queueConfig,
      retryManager: options.retryManager
    });

    this.scheduler = new Scheduler({
      store: this.scheduleStore,
      queue: this.queue,
      eventBus: options.eventBus
    });
  }

  /**
   * Inicializa o subsistema com recuperação de crash e disparo de startup.
   */
  public async start(): Promise<RecoveryReport> {
    if (this.isStarted) {
      return { recoveredCount: 0, interruptedJobIds: [], reEnqueuedCount: 0 };
    }

    // 1. Inicializa fila a partir do armazenamento
    await this.queue.initialize();

    // 2. Executa Crash Recovery antes de despachar qualquer nova tarefa
    const recoveryReport = await CrashRecoveryManager.recover({
      queueStore: this.queueStore,
      queue: this.queue,
      lock: this.lock,
      eventBus: this.options.eventBus,
      historyStore: this.historyStore,
      autoReEnqueueInterrupted: this.options.autoRecoverInterrupted ?? true
    });

    // 3. Inicia o despachante de concorrência
    this.dispatcher.start();

    // 4. Inicia o agendador e executa rotinas de startup/missed
    await this.scheduler.start();

    this.isStarted = true;
    return recoveryReport;
  }

  public stop(): void {
    this.scheduler.stop();
    this.dispatcher.stop();
    this.lock.clear();
    this.isStarted = false;
  }

  public getQueueMetrics(): Readonly<QueueMetrics> {
    return this.dispatcher.getMetrics();
  }

  public getSchedulerMetrics(): Readonly<SchedulerMetrics> {
    return this.scheduler.getMetrics();
  }
}
