import { UUID, ScheduleTriggerType, MissedExecutionPolicy, ConcurrentExecutionPolicy } from '../core/domain.js';
import { ScheduleConfig, SchedulerMetrics } from './types.js';
import { ScheduleEvaluator } from './schedule-evaluator.js';
import { ScheduleStore } from '../persistence/contracts.js';
import { JobQueue } from '../queue/job-queue.js';
import { EventBus } from '../core/contracts.js';
import { EngineError, ErrorCategory } from '../core/errors.js';
import * as crypto from 'node:crypto';

export interface SchedulerOptions {
  store: ScheduleStore;
  queue: JobQueue;
  eventBus?: EventBus;
  maxSleepCapMs?: number; // Padrão: 60_000ms (1 min) para detecção de clock drift
}

export class Scheduler {
  private readonly store: ScheduleStore;
  private readonly queue: JobQueue;
  private readonly eventBus?: EventBus;
  private readonly maxSleepCapMs: number;

  private readonly schedules = new Map<UUID, ScheduleConfig>();
  private activeTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastEvaluationTimeMs = Date.now();

  private readonly metrics: SchedulerMetrics = {
    totalSchedules: 0,
    enabledSchedules: 0,
    triggersTotal: 0,
    missedTriggersTotal: 0,
    manualTriggersTotal: 0,
    startupTriggersTotal: 0,
    clockDriftsDetected: 0
  };

  constructor(options: SchedulerOptions) {
    this.store = options.store;
    this.queue = options.queue;
    this.eventBus = options.eventBus;
    this.maxSleepCapMs = options.maxSleepCapMs ?? 60_000;
  }

  public async initialize(): Promise<void> {
    const list = await this.store.listSchedules();
    for (const s of list) {
      // Recalcula nextRunAt se necessário
      if (s.enabled && !s.nextRunAt) {
        s.nextRunAt = ScheduleEvaluator.getNextRun(s).toISOString();
      }
      this.schedules.set(s.id, s);
    }
    this.updateMetrics();
  }

  /**
   * Inicializa o Scheduler e executa rotinas de Startup:
   * 1. Verifica políticas de runOnStartup
   * 2. Avalia execuções perdidas (MissedExecutionPolicy)
   * 3. Programa o temporizador inteligente até o próximo evento
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastEvaluationTimeMs = Date.now();

    await this.initialize();
    await this.handleStartup();
    this.scheduleNextEvaluation();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.activeTimer) {
      clearTimeout(this.activeTimer);
      this.activeTimer = null;
    }
  }

  // --- Gerenciamento de Agendamentos (CRUD) ---

  public async addSchedule(schedule: Omit<ScheduleConfig, 'createdAt' | 'updatedAt'>): Promise<ScheduleConfig> {
    const nowIso = new Date().toISOString();
    const fullSchedule: ScheduleConfig = {
      ...schedule,
      nextRunAt: schedule.enabled ? ScheduleEvaluator.getNextRun(schedule as ScheduleConfig).toISOString() : undefined,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this.schedules.set(fullSchedule.id, fullSchedule);
    await this.store.saveSchedule(fullSchedule);
    this.updateMetrics();

    if (this.isRunning) {
      this.scheduleNextEvaluation();
    }
    return fullSchedule;
  }

  public async updateSchedule(id: UUID, updates: Partial<ScheduleConfig>): Promise<ScheduleConfig> {
    const existing = this.schedules.get(id);
    if (!existing) {
      throw new EngineError({
        code: 'SCHEDULE_NOT_FOUND',
        message: `Agendamento ${id} não encontrado.`,
        category: ErrorCategory.CONFIGURATION
      });
    }

    const updated: ScheduleConfig = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (updated.enabled) {
      updated.nextRunAt = ScheduleEvaluator.getNextRun(updated).toISOString();
    } else {
      updated.nextRunAt = undefined;
    }

    this.schedules.set(id, updated);
    await this.store.saveSchedule(updated);
    this.updateMetrics();

    if (this.isRunning) {
      this.scheduleNextEvaluation();
    }
    return updated;
  }

  public async removeSchedule(id: UUID): Promise<boolean> {
    const exists = this.schedules.delete(id);
    if (exists) {
      await this.store.deleteSchedule(id);
      this.updateMetrics();
      if (this.isRunning) {
        this.scheduleNextEvaluation();
      }
    }
    return exists;
  }

  public getSchedule(id: UUID): ScheduleConfig | undefined {
    return this.schedules.get(id);
  }

  public listSchedules(): ScheduleConfig[] {
    return Array.from(this.schedules.values());
  }

  public async enableSchedule(id: UUID): Promise<ScheduleConfig> {
    return this.updateSchedule(id, { enabled: true });
  }

  public async disableSchedule(id: UUID): Promise<ScheduleConfig> {
    return this.updateSchedule(id, { enabled: false });
  }

  // --- Disparos Especiais ---

  /**
   * Disparo Manual solicitado pelo usuário ou API
   */
  public async triggerManually(params: {
    jobId: UUID;
    scheduleId?: UUID;
    storageKey?: string;
  }): Promise<void> {
    const schedule = params.scheduleId ? this.schedules.get(params.scheduleId) : undefined;
    const storageKey = params.storageKey || 'DEFAULT_STORAGE';

    this.metrics.triggersTotal++;
    this.metrics.manualTriggersTotal++;

    this.eventBus?.publish({
      type: 'SCHEDULE_TRIGGERED',
      payload: {
        scheduleId: params.scheduleId || crypto.randomUUID(),
        jobId: params.jobId,
        triggerType: ScheduleTriggerType.MANUAL
      }
    });

    await this.queue.enqueue({
      jobId: params.jobId,
      scheduleId: params.scheduleId,
      triggerType: ScheduleTriggerType.MANUAL,
      storageKey,
      concurrentPolicy: schedule?.concurrentPolicy || ConcurrentExecutionPolicy.QUEUE
    });
  }

  /**
   * Disparo por Restabelecimento de Conectividade de Rede
   */
  public async triggerNetworkAvailable(): Promise<void> {
    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled) continue;

      this.metrics.triggersTotal++;
      this.eventBus?.publish({
        type: 'SCHEDULE_TRIGGERED',
        payload: {
          scheduleId: schedule.id,
          jobId: schedule.jobId,
          triggerType: ScheduleTriggerType.NETWORK_AVAILABLE
        }
      });

      await this.queue.enqueue({
        jobId: schedule.jobId,
        scheduleId: schedule.id,
        triggerType: ScheduleTriggerType.NETWORK_AVAILABLE,
        storageKey: 'NETWORK_STORAGE',
        concurrentPolicy: schedule.concurrentPolicy || ConcurrentExecutionPolicy.QUEUE,
        idempotencyKey: `net_avail_${schedule.id}_${new Date().toISOString().substring(0, 16)}`
      });
    }
  }

  // --- Rotina de Inicialização e Missed Jobs ---

  private async handleStartup(): Promise<void> {
    const now = new Date();

    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled) continue;

      // 1. Política runOnStartup
      if (schedule.runOnStartup) {
        this.metrics.startupTriggersTotal++;
        this.metrics.triggersTotal++;

        this.eventBus?.publish({
          type: 'SCHEDULE_TRIGGERED',
          payload: {
            scheduleId: schedule.id,
            jobId: schedule.jobId,
            triggerType: ScheduleTriggerType.STARTUP
          }
        });

        await this.queue.enqueue({
          jobId: schedule.jobId,
          scheduleId: schedule.id,
          triggerType: ScheduleTriggerType.STARTUP,
          storageKey: 'DEFAULT_STORAGE',
          concurrentPolicy: schedule.concurrentPolicy || ConcurrentExecutionPolicy.QUEUE,
          idempotencyKey: `startup_${schedule.id}_${now.toISOString().substring(0, 10)}`
        });
      }

      // 2. Avaliação de Execuções Perdidas (Missed Jobs)
      const evaluation = ScheduleEvaluator.evaluate(schedule, now);

      if (evaluation.isMissed) {
        this.metrics.missedTriggersTotal++;

        if (evaluation.shouldRunImmediately) {
          this.metrics.triggersTotal++;
          this.eventBus?.publish({
            type: 'SCHEDULE_TRIGGERED',
            payload: {
              scheduleId: schedule.id,
              jobId: schedule.jobId,
              triggerType: ScheduleTriggerType.SCHEDULED
            }
          });

          await this.queue.enqueue({
            jobId: schedule.jobId,
            scheduleId: schedule.id,
            triggerType: ScheduleTriggerType.SCHEDULED,
            storageKey: 'DEFAULT_STORAGE',
            concurrentPolicy: schedule.concurrentPolicy || ConcurrentExecutionPolicy.QUEUE,
            idempotencyKey: `missed_${schedule.id}_${evaluation.missedScheduledTime}`
          });
        }
      }

      // Atualiza o próximo disparo
      schedule.nextRunAt = evaluation.nextRunAt;
      schedule.lastScheduledAt = now.toISOString();
      await this.store.saveSchedule(schedule);
    }
  }

  // --- Temporizador Preciso sem Polling Excessivo ---

  public scheduleNextEvaluation(): void {
    if (!this.isRunning) return;

    if (this.activeTimer) {
      clearTimeout(this.activeTimer);
      this.activeTimer = null;
    }

    const nowMs = Date.now();
    let soonestWakeupMs = nowMs + this.maxSleepCapMs;

    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled || !schedule.nextRunAt) continue;

      const targetMs = new Date(schedule.nextRunAt).getTime();
      if (targetMs < soonestWakeupMs) {
        soonestWakeupMs = targetMs;
      }
    }

    // Calcula tempo de espera seguro (mínimo de 10ms para evitar loop zero)
    const delayMs = Math.max(10, Math.min(soonestWakeupMs - nowMs, this.maxSleepCapMs));

    this.activeTimer = setTimeout(async () => {
      await this.evaluateSchedules();
    }, delayMs);
  }

  /**
   * Avalia schedules quando o timer acorda ou quando chamado explicitamente.
   */
  public async evaluateSchedules(currentTime: Date = new Date()): Promise<number> {
    const nowMs = currentTime.getTime();

    // Detecção de salto no relógio do sistema (Clock Drift > 5 minutos para trás ou para frente)
    const expectedElapsed = nowMs - this.lastEvaluationTimeMs;
    if (expectedElapsed < -5000 || expectedElapsed > 3600000) {
      this.metrics.clockDriftsDetected++;
      // Recalcula todos os próximos agendamentos baseados no novo horário
      for (const s of this.schedules.values()) {
        if (s.enabled) {
          s.nextRunAt = ScheduleEvaluator.getNextRun(s, currentTime).toISOString();
        }
      }
    }
    this.lastEvaluationTimeMs = nowMs;

    let triggeredCount = 0;

    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled || !schedule.nextRunAt) continue;

      const nextRunMs = new Date(schedule.nextRunAt).getTime();

      // Se o horário programado chegou ou passou
      if (nextRunMs <= nowMs) {
        triggeredCount++;
        this.metrics.triggersTotal++;

        const scheduledTimeStr = schedule.nextRunAt;
        const idempotencyKey = `sched_${schedule.id}_${scheduledTimeStr}`;

        this.eventBus?.publish({
          type: 'SCHEDULE_TRIGGERED',
          payload: {
            scheduleId: schedule.id,
            jobId: schedule.jobId,
            triggerType: ScheduleTriggerType.SCHEDULED
          }
        });

        // Coloca na fila sem executar o backup diretamente
        await this.queue.enqueue({
          jobId: schedule.jobId,
          scheduleId: schedule.id,
          triggerType: ScheduleTriggerType.SCHEDULED,
          storageKey: 'DEFAULT_STORAGE',
          concurrentPolicy: schedule.concurrentPolicy || ConcurrentExecutionPolicy.QUEUE,
          idempotencyKey
        });

        schedule.lastRunAt = currentTime.toISOString();
        schedule.lastScheduledAt = scheduledTimeStr;
        schedule.nextRunAt = ScheduleEvaluator.getNextRun(schedule, currentTime).toISOString();
        schedule.updatedAt = currentTime.toISOString();

        await this.store.saveSchedule(schedule);
      }
    }

    if (this.isRunning) {
      this.scheduleNextEvaluation();
    }

    return triggeredCount;
  }

  private updateMetrics(): void {
    this.metrics.totalSchedules = this.schedules.size;
    let enabled = 0;
    for (const s of this.schedules.values()) {
      if (s.enabled) enabled++;
    }
    this.metrics.enabledSchedules = enabled;
  }

  public getMetrics(): Readonly<SchedulerMetrics> {
    return { ...this.metrics };
  }
}
