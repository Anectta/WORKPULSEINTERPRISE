import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';

import {
  BackupJob,
  BackupJobType,
  BackupJobStatus,
  JobPriority,
  ScheduleTriggerType,
  ConcurrentExecutionPolicy,
  MissedExecutionPolicy,
  StorageProviderType,
  CompressionType,
  EncryptionAlgorithm
} from '../core/domain.js';
import { ScheduleConfig } from '../scheduler/types.js';
import { ScheduleEvaluator } from '../scheduler/schedule-evaluator.js';
import { Scheduler } from '../scheduler/scheduler.js';
import { JobQueue } from '../queue/job-queue.js';
import { JobExecutionLock } from '../queue/job-execution-lock.js';
import { PriorityManager } from '../queue/priority-manager.js';
import { ExecutionDispatcher } from '../queue/dispatcher.js';
import { ErrorClassifier } from '../retry/classifier.js';
import { SmartRetryManager } from '../retry/smart-retry.js';
import { InMemoryScheduleStore, InMemoryQueueStore, InMemoryExecutionHistoryStore } from '../persistence/in-memory-store.js';
import { FilePersistenceStore } from '../persistence/file-store.js';
import { CrashRecoveryManager } from '../persistence/crash-recovery.js';
import { BackupSchedulerCoordinator } from '../scheduler/coordinator.js';
import { EngineError, ErrorCategory, CancellationToken } from '../core/errors.js';
import { EventBus, EngineEvent } from '../core/contracts.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export async function runSchedulerQueueRetryTests(): Promise<{ passed: boolean; results: TestResult[] }> {
  const results: TestResult[] = [];

  async function test(name: string, fn: () => Promise<void> | void) {
    const start = Date.now();
    try {
      await fn();
      results.push({ name, passed: true, durationMs: Date.now() - start });
      console.log(`  ✓ ${name}`);
    } catch (err: any) {
      results.push({ name, passed: false, error: err?.message || String(err), durationMs: Date.now() - start });
      console.error(`  ✗ ${name} — ${err?.message || err}`);
    }
  }

  // Simple mock event bus
  class MockEventBus implements EventBus {
    public events: EngineEvent[] = [];
    publish(event: EngineEvent): void {
      this.events.push(event);
    }
    subscribe(): () => void {
      return () => {};
    }
  }

  // Mock executor
  function createMockExecutor(onExecute?: (job: BackupJob, token?: CancellationToken) => Promise<void>) {
    return {
      executeJob: async (job: BackupJob, _reporter?: any, token?: CancellationToken) => {
        if (onExecute) {
          await onExecute(job, token);
        }
        return {
          executionId: crypto.randomUUID(),
          jobId: job.id,
          status: BackupJobStatus.COMPLETED,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          bytesTransferred: 1024,
          filesCount: 1,
          strategy: job.jobType
        };
      }
    } as any;
  }

  function createSampleJob(id: string = crypto.randomUUID(), name: string = 'Test Job'): BackupJob {
    return {
      id,
      tenantId: 'tenant-01',
      name,
      jobType: BackupJobType.FULL,
      priority: 5,
      source: { paths: ['/tmp/source'] },
      destination: { id: 'dest-01', name: 'Local Dest', providerType: StorageProviderType.LOCAL, baseUri: '/tmp/dest', config: {} },
      policy: {
        compressionType: CompressionType.NONE,
        compressionLevel: 0,
        encryptionAlgorithm: EncryptionAlgorithm.NONE,
        keyDerivation: 'NONE',
        vssEnabled: false,
        retentionDays: 30,
        maxVersions: 10,
        safeDeleteRetentionDays: 7,
        verifyChecksumAfterWrite: true
      },
      status: BackupJobStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  console.log('\n--- INICIANDO TESTES: ETAPA 08 (SCHEDULER, QUEUE, RETRY & CONCURRENCY) ---\n');

  // 1. Schedule Interval
  await test('1. Schedule Evaluator: tipo INTERVAL calcula próximo horário corretamente', () => {
    const baseDate = new Date('2026-09-11T12:00:00Z');
    const schedule: ScheduleConfig = {
      id: crypto.randomUUID(),
      jobId: crypto.randomUUID(),
      enabled: true,
      type: 'INTERVAL',
      timezone: 'UTC',
      intervalSeconds: 3600, // 1 hour
      missedPolicy: MissedExecutionPolicy.SKIP,
      createdAt: baseDate.toISOString(),
      updatedAt: baseDate.toISOString()
    };
    const next = ScheduleEvaluator.getNextRun(schedule, baseDate);
    if (next.toISOString() !== '2026-09-11T13:00:00.000Z') {
      throw new Error(`Próximo horário incorreto: ${next.toISOString()}`);
    }
  });

  // 2. Schedule Daily
  await test('2. Schedule Evaluator: tipo DAILY calcula horário fixo HH:mm', () => {
    const baseDate = new Date('2026-09-11T10:00:00Z');
    const schedule: ScheduleConfig = {
      id: crypto.randomUUID(),
      jobId: crypto.randomUUID(),
      enabled: true,
      type: 'DAILY',
      timezone: 'UTC',
      dailyTime: '14:30',
      missedPolicy: MissedExecutionPolicy.SKIP,
      createdAt: baseDate.toISOString(),
      updatedAt: baseDate.toISOString()
    };
    const next = ScheduleEvaluator.getNextRun(schedule, baseDate);
    if (next.toISOString() !== '2026-09-11T14:30:00.000Z') {
      throw new Error(`Esperado 2026-09-11T14:30:00.000Z, obtido ${next.toISOString()}`);
    }
  });

  // 3. Schedule Specific Days of Week
  await test('3. Schedule Evaluator: tipo DAYS_OF_WEEK (ex: Segundas e Sextas)', () => {
    // 2026-09-11 é Sexta-feira (day 5)
    const baseDate = new Date('2026-09-11T16:00:00Z');
    const schedule: ScheduleConfig = {
      id: crypto.randomUUID(),
      jobId: crypto.randomUUID(),
      enabled: true,
      type: 'DAYS_OF_WEEK',
      timezone: 'UTC',
      dailyTime: '08:00',
      daysOfWeek: [1, 5], // Seg (1), Sex (5)
      missedPolicy: MissedExecutionPolicy.SKIP,
      createdAt: baseDate.toISOString(),
      updatedAt: baseDate.toISOString()
    };
    // Como 16:00 já passou de 08:00 na sexta, o próximo deve ser na segunda-feira 2026-09-14T08:00:00Z
    const next = ScheduleEvaluator.getNextRun(schedule, baseDate);
    if (next.toISOString() !== '2026-09-14T08:00:00.000Z') {
      throw new Error(`Esperado 2026-09-14T08:00:00.000Z, obtido ${next.toISOString()}`);
    }
  });

  // 4. Schedule Weekly
  await test('4. Schedule Evaluator: tipo WEEKLY (Domingo às 03:00)', () => {
    const baseDate = new Date('2026-09-11T12:00:00Z'); // Sexta-feira
    const schedule: ScheduleConfig = {
      id: crypto.randomUUID(),
      jobId: crypto.randomUUID(),
      enabled: true,
      type: 'WEEKLY',
      timezone: 'UTC',
      dailyTime: '03:00',
      daysOfWeek: [0], // Domingo
      missedPolicy: MissedExecutionPolicy.SKIP,
      createdAt: baseDate.toISOString(),
      updatedAt: baseDate.toISOString()
    };
    const next = ScheduleEvaluator.getNextRun(schedule, baseDate);
    if (next.toISOString() !== '2026-09-13T03:00:00.000Z') {
      throw new Error(`Esperado Domingo 2026-09-13T03:00:00.000Z, obtido ${next.toISOString()}`);
    }
  });

  // 5. Schedule Monthly
  await test('5. Schedule Evaluator: tipo MONTHLY (Dia 1 às 02:00)', () => {
    const baseDate = new Date('2026-09-11T12:00:00Z');
    const schedule: ScheduleConfig = {
      id: crypto.randomUUID(),
      jobId: crypto.randomUUID(),
      enabled: true,
      type: 'MONTHLY',
      timezone: 'UTC',
      dailyTime: '02:00',
      dayOfMonth: 1,
      missedPolicy: MissedExecutionPolicy.SKIP,
      createdAt: baseDate.toISOString(),
      updatedAt: baseDate.toISOString()
    };
    const next = ScheduleEvaluator.getNextRun(schedule, baseDate);
    if (next.toISOString() !== '2026-10-01T02:00:00.000Z') {
      throw new Error(`Esperado 2026-10-01T02:00:00.000Z, obtido ${next.toISOString()}`);
    }
  });

  // 6. Schedule Cron
  await test('6. Schedule Evaluator: tipo CRON ("0 2 * * *")', () => {
    const baseDate = new Date('2026-09-11T01:00:00Z');
    const schedule: ScheduleConfig = {
      id: crypto.randomUUID(),
      jobId: crypto.randomUUID(),
      enabled: true,
      type: 'CRON',
      timezone: 'UTC',
      cronExpression: '0 2 * * *',
      missedPolicy: MissedExecutionPolicy.SKIP,
      createdAt: baseDate.toISOString(),
      updatedAt: baseDate.toISOString()
    };
    const next = ScheduleEvaluator.getNextRun(schedule, baseDate);
    if (next.toISOString() !== '2026-09-11T02:00:00.000Z') {
      throw new Error(`Esperado 2026-09-11T02:00:00.000Z, obtido ${next.toISOString()}`);
    }
  });

  // 7. Timezone Conversion (America/Sao_Paulo)
  await test('7. Timezone Aware: preserva e calcula timezone explicitamente (America/Sao_Paulo = UTC-3)', () => {
    const baseDate = new Date('2026-09-11T12:00:00Z'); // 09:00 em SP
    const schedule: ScheduleConfig = {
      id: crypto.randomUUID(),
      jobId: crypto.randomUUID(),
      enabled: true,
      type: 'DAILY',
      timezone: 'America/Sao_Paulo',
      dailyTime: '15:00', // 15:00 em SP = 18:00 UTC
      missedPolicy: MissedExecutionPolicy.SKIP,
      createdAt: baseDate.toISOString(),
      updatedAt: baseDate.toISOString()
    };
    const next = ScheduleEvaluator.getNextRun(schedule, baseDate);
    if (next.toISOString() !== '2026-09-11T18:00:00.000Z') {
      throw new Error(`Esperado 2026-09-11T18:00:00.000Z UTC, obtido ${next.toISOString()}`);
    }
  });

  // 8. Trigger Manual
  await test('8. Scheduler: Trigger Manual enfileira job com tipo MANUAL e evento emitido', async () => {
    const store = new InMemoryScheduleStore();
    const queueStore = new InMemoryQueueStore();
    const lock = new JobExecutionLock();
    const eventBus = new MockEventBus();
    const queue = new JobQueue(queueStore, lock, eventBus);
    const scheduler = new Scheduler({ store, queue, eventBus });

    const jobId = crypto.randomUUID();
    await scheduler.triggerManually({ jobId, storageKey: 'LOCAL' });

    const items = queue.getAllItems();
    if (items.length !== 1 || items[0].triggerType !== ScheduleTriggerType.MANUAL) {
      throw new Error('Job manual não foi enfileirado corretamente');
    }
    const evt = eventBus.events.find(e => e.type === 'SCHEDULE_TRIGGERED');
    if (!evt || (evt.payload as any).triggerType !== ScheduleTriggerType.MANUAL) {
      throw new Error('Evento SCHEDULE_TRIGGERED não foi publicado');
    }
  });

  // 9. Trigger Startup
  await test('9. Scheduler: runOnStartup executa jobs marcados durante inicialização do Scheduler', async () => {
    const store = new InMemoryScheduleStore();
    const queueStore = new InMemoryQueueStore();
    const lock = new JobExecutionLock();
    const eventBus = new MockEventBus();
    const queue = new JobQueue(queueStore, lock, eventBus);
    const scheduler = new Scheduler({ store, queue, eventBus });

    const jobId = crypto.randomUUID();
    await store.saveSchedule({
      id: crypto.randomUUID(),
      jobId,
      enabled: true,
      type: 'DAILY',
      timezone: 'UTC',
      dailyTime: '23:59',
      runOnStartup: true,
      missedPolicy: MissedExecutionPolicy.SKIP,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await scheduler.start();
    scheduler.stop();

    const items = queue.getAllItems();
    const startupItem = items.find(i => i.triggerType === ScheduleTriggerType.STARTUP);
    if (!startupItem) {
      throw new Error('Item de startup não foi gerado');
    }
  });

  // 10. Trigger Network Available
  await test('10. Scheduler: triggerNetworkAvailable enfileira jobs com conectividade restabelecida', async () => {
    const store = new InMemoryScheduleStore();
    const queueStore = new InMemoryQueueStore();
    const lock = new JobExecutionLock();
    const queue = new JobQueue(queueStore, lock);
    const scheduler = new Scheduler({ store, queue });

    const jobId = crypto.randomUUID();
    await scheduler.addSchedule({
      id: crypto.randomUUID(),
      jobId,
      enabled: true,
      type: 'DAILY',
      timezone: 'UTC',
      dailyTime: '22:00',
      missedPolicy: MissedExecutionPolicy.SKIP
    });

    await scheduler.triggerNetworkAvailable();
    const items = queue.getAllItems();
    const netItem = items.find(i => i.triggerType === ScheduleTriggerType.NETWORK_AVAILABLE);
    if (!netItem) {
      throw new Error('Item de network available não foi enfileirado');
    }
  });

  // 11. Missed policy: SKIP
  await test('11. Missed Execution Policy: SKIP não dispara execução atrasada', () => {
    const now = new Date('2026-09-11T10:00:00Z');
    const schedule: ScheduleConfig = {
      id: crypto.randomUUID(),
      jobId: crypto.randomUUID(),
      enabled: true,
      type: 'DAILY',
      timezone: 'UTC',
      dailyTime: '02:00',
      lastRunAt: '2026-09-09T02:00:00Z', // Ficou 2 dias desligado
      missedPolicy: MissedExecutionPolicy.SKIP,
      createdAt: '2026-09-09T00:00:00Z',
      updatedAt: '2026-09-09T00:00:00Z'
    };

    const res = ScheduleEvaluator.evaluate(schedule, now);
    if (!res.isMissed || res.shouldRunImmediately) {
      throw new Error('Política SKIP não deveria marcar para rodar imediatamente');
    }
  });

  // 12. Missed policy: RUN_IMMEDIATELY
  await test('12. Missed Execution Policy: RUN_IMMEDIATELY marca disparo imediato', () => {
    const now = new Date('2026-09-11T10:00:00Z');
    const schedule: ScheduleConfig = {
      id: crypto.randomUUID(),
      jobId: crypto.randomUUID(),
      enabled: true,
      type: 'DAILY',
      timezone: 'UTC',
      dailyTime: '02:00',
      lastRunAt: '2026-09-09T02:00:00Z',
      missedPolicy: MissedExecutionPolicy.RUN_IMMEDIATELY,
      createdAt: '2026-09-09T00:00:00Z',
      updatedAt: '2026-09-09T00:00:00Z'
    };

    const res = ScheduleEvaluator.evaluate(schedule, now);
    if (!res.isMissed || !res.shouldRunImmediately) {
      throw new Error('Política RUN_IMMEDIATELY deveria sinalizar disparo imediato');
    }
  });

  // 13. Priority Queue: CRITICAL (1) processado antes de LOW (4)
  await test('13. Fila de Prioridades: CRITICAL (1) sai antes de LOW (4) independente da ordem', async () => {
    const queueStore = new InMemoryQueueStore();
    const lock = new JobExecutionLock();
    const queue = new JobQueue(queueStore, lock);

    const jobLow = crypto.randomUUID();
    const jobCritical = crypto.randomUUID();

    // Enfileira LOW primeiro
    await queue.enqueue({
      jobId: jobLow,
      triggerType: ScheduleTriggerType.MANUAL,
      priority: JobPriority.LOW,
      storageKey: 'LOCAL'
    });

    // Enfileira CRITICAL depois
    await queue.enqueue({
      jobId: jobCritical,
      triggerType: ScheduleTriggerType.MANUAL,
      priority: JobPriority.CRITICAL,
      storageKey: 'LOCAL'
    });

    const eligible = queue.getEligibleCandidates();
    if (eligible[0].jobId !== jobCritical) {
      throw new Error(`Primeiro item deveria ser CRITICAL (${jobCritical}), obtido ${eligible[0].jobId}`);
    }
    if (eligible[1].jobId !== jobLow) {
      throw new Error('Segundo item deveria ser LOW');
    }
  });

  // 14. Aging / Starvation Avoidance
  await test('14. Aging / Anti-Starvation: job LOW ganha boost dinâmico após tempo de espera', () => {
    const priorityManager = new PriorityManager(1000, 1); // aging cada 1 segundo = +1 boost
    const now = new Date();
    const past = new Date(now.getTime() - 4000); // esperou 4 segundos

    const items: any[] = [
      {
        id: '1',
        jobId: 'job-low',
        priority: JobPriority.LOW, // 4
        status: BackupJobStatus.QUEUED,
        enqueuedAt: past.toISOString(),
        agingBoost: 0
      }
    ];

    priorityManager.applyAging(items, now);
    if (items[0].agingBoost < 3 || items[0].effectivePriority > 1) {
      throw new Error(`Aging não elevou a prioridade: boost=${items[0].agingBoost}, eff=${items[0].effectivePriority}`);
    }
  });

  // 15. Bounded Global Concurrency
  await test('15. Concorrência Global Limitada: nunca ultrapassa maxGlobalConcurrency', async () => {
    const queueStore = new InMemoryQueueStore();
    const lock = new JobExecutionLock();
    const queue = new JobQueue(queueStore, lock);

    let activeRunning = 0;
    let maxSeenRunning = 0;

    const executor = createMockExecutor(async () => {
      activeRunning++;
      maxSeenRunning = Math.max(maxSeenRunning, activeRunning);
      await new Promise(r => setTimeout(r, 60));
      activeRunning--;
    });

    const jobs = new Map<string, BackupJob>();
    for (let i = 0; i < 5; i++) {
      const j = createSampleJob(`job-${i}`);
      jobs.set(j.id, j);
      await queue.enqueue({
        jobId: j.id,
        triggerType: ScheduleTriggerType.MANUAL,
        storageKey: `STORAGE-${i}`,
        priority: JobPriority.NORMAL
      });
    }

    const dispatcher = new ExecutionDispatcher({
      queue,
      lock,
      executor,
      jobLookup: async id => jobs.get(id) ?? null,
      config: { maxGlobalConcurrency: 2, maxPerStorage: 2, maxPerJob: 1 }
    });

    dispatcher.start();
    await dispatcher.dispatch();

    // Espera esvaziar
    await new Promise(r => setTimeout(r, 250));
    dispatcher.stop();

    if (maxSeenRunning > 2) {
      throw new Error(`Concorrência máxima ultrapassada: ${maxSeenRunning} > 2`);
    }
    const metrics = dispatcher.getMetrics();
    if (metrics.jobsCompleted !== 5) {
      throw new Error(`Esperado 5 jobs completos, obtido ${metrics.jobsCompleted}`);
    }
  });

  // 16. Bounded Concurrency per Storage
  await test('16. Concorrência Limitada por Storage: respeita maxPerStorage por destino', async () => {
    const queueStore = new InMemoryQueueStore();
    const lock = new JobExecutionLock();
    const queue = new JobQueue(queueStore, lock);

    let activePerStorage1 = 0;
    let maxSeenStorage1 = 0;

    const executor = createMockExecutor(async job => {
      if (job.destination.baseUri === 'SAME_STORAGE') {
        activePerStorage1++;
        maxSeenStorage1 = Math.max(maxSeenStorage1, activePerStorage1);
        await new Promise(r => setTimeout(r, 60));
        activePerStorage1--;
      }
    });

    const jobs = new Map<string, BackupJob>();
    for (let i = 0; i < 3; i++) {
      const j = createSampleJob(`smb-job-${i}`);
      j.destination.baseUri = 'SAME_STORAGE';
      jobs.set(j.id, j);
      await queue.enqueue({
        jobId: j.id,
        triggerType: ScheduleTriggerType.MANUAL,
        storageKey: 'SAME_STORAGE',
        priority: JobPriority.NORMAL
      });
    }

    const dispatcher = new ExecutionDispatcher({
      queue,
      lock,
      executor,
      jobLookup: async id => jobs.get(id) ?? null,
      config: { maxGlobalConcurrency: 4, maxPerStorage: 1, maxPerJob: 1 }
    });

    dispatcher.start();
    await dispatcher.dispatch();

    await new Promise(r => setTimeout(r, 250));
    dispatcher.stop();

    if (maxSeenStorage1 > 1) {
      throw new Error(`Concorrência por storage violada: ${maxSeenStorage1} > 1`);
    }
  });

  // 17. Single Execution per Job (Lock exclusivity)
  await test('17. Job Lock Exclusivo: impede execução concorrente do mesmo job', () => {
    const lock = new JobExecutionLock();
    const jobId = crypto.randomUUID();

    const acquired1 = lock.tryAcquire(jobId, crypto.randomUUID(), crypto.randomUUID());
    if (!acquired1) throw new Error('Deveria ter adquirido lock 1');

    const acquired2 = lock.tryAcquire(jobId, crypto.randomUUID(), crypto.randomUUID());
    if (acquired2) throw new Error('Não deveria adquirir segundo lock para o mesmo job');

    lock.release(jobId);
    const acquired3 = lock.tryAcquire(jobId, crypto.randomUUID(), crypto.randomUUID());
    if (!acquired3) throw new Error('Deveria ter adquirido lock após liberação');
  });

  // 18. Duplicate Policy: SKIP
  await test('18. Política SKIP em Execução Duplicada: marca SKIPPED se já em andamento', async () => {
    const queueStore = new InMemoryQueueStore();
    const lock = new JobExecutionLock();
    const queue = new JobQueue(queueStore, lock);
    const jobId = crypto.randomUUID();

    // Simula job rodando
    lock.acquire(jobId, crypto.randomUUID(), crypto.randomUUID());

    const result = await queue.enqueue({
      jobId,
      triggerType: ScheduleTriggerType.SCHEDULED,
      storageKey: 'LOCAL',
      concurrentPolicy: ConcurrentExecutionPolicy.SKIP
    });

    if (result.enqueued || result.item.status !== BackupJobStatus.SKIPPED) {
      throw new Error(`Esperado status SKIPPED, obtido ${result.item.status}`);
    }
  });

  // 19. Duplicate Policy: QUEUE
  await test('19. Política QUEUE em Execução Duplicada: aguarda na fila até lock ser liberado', async () => {
    const queueStore = new InMemoryQueueStore();
    const lock = new JobExecutionLock();
    const queue = new JobQueue(queueStore, lock);
    const jobId = crypto.randomUUID();

    const execId1 = crypto.randomUUID();
    lock.acquire(jobId, execId1, crypto.randomUUID());

    const result = await queue.enqueue({
      jobId,
      triggerType: ScheduleTriggerType.SCHEDULED,
      storageKey: 'LOCAL',
      concurrentPolicy: ConcurrentExecutionPolicy.QUEUE
    });

    if (!result.enqueued || result.item.status !== BackupJobStatus.QUEUED) {
      throw new Error('Item deveria ser colocado na fila');
    }
  });

  // 20. Duplicate Policy: REPLACE
  await test('20. Política REPLACE em Execução Duplicada: cancela execução atual', async () => {
    const queueStore = new InMemoryQueueStore();
    const lock = new JobExecutionLock();
    const queue = new JobQueue(queueStore, lock);
    const jobId = crypto.randomUUID();

    // Enfileira item 1
    const { item: item1 } = await queue.enqueue({
      jobId,
      triggerType: ScheduleTriggerType.SCHEDULED,
      storageKey: 'LOCAL',
      concurrentPolicy: ConcurrentExecutionPolicy.REPLACE
    });

    item1.status = BackupJobStatus.RUNNING;
    lock.acquire(jobId, crypto.randomUUID(), item1.id);

    // Enfileira item 2 com REPLACE
    await queue.enqueue({
      jobId,
      triggerType: ScheduleTriggerType.SCHEDULED,
      storageKey: 'LOCAL',
      concurrentPolicy: ConcurrentExecutionPolicy.REPLACE
    });

    if (!item1.cancellationToken?.isCancelled) {
      throw new Error('Execução anterior deveria ter sido sinalizada para cancelamento');
    }
  });

  // 21. Smart Retry: Transient error retry vs Permanent failure
  await test('21. Classificador de Erros: distingue transitórios (retry) de permanentes (fatal)', () => {
    // Transitórios
    const timeoutErr = new EngineError({ code: 'ETIMEDOUT', message: 'Timeout', category: ErrorCategory.NETWORK });
    const resetErr = new EngineError({ code: 'ECONNRESET', message: 'Reset', category: ErrorCategory.NETWORK });
    const s3Unavailable = new EngineError({ code: 'S3_SERVICE_UNAVAILABLE', message: 'S3 503', category: ErrorCategory.STORAGE });

    if (!ErrorClassifier.classify(timeoutErr).retryable) throw new Error('ETIMEDOUT deveria ser retryable');
    if (!ErrorClassifier.classify(resetErr).retryable) throw new Error('ECONNRESET deveria ser retryable');
    if (!ErrorClassifier.classify(s3Unavailable).retryable) throw new Error('S3 503 deveria ser retryable');

    // Permanentes
    const authErr = new EngineError({ code: 'AUTH_FAILED', message: 'Invalid password', category: ErrorCategory.PERMISSION });
    const configErr = new EngineError({ code: 'INVALID_CONFIG', message: 'Bad param', category: ErrorCategory.CONFIGURATION });
    const corruptErr = new EngineError({ code: 'CORRUPTED', message: 'Corrupt', category: ErrorCategory.INTEGRITY });

    if (ErrorClassifier.classify(authErr).retryable) throw new Error('AUTH_FAILED não deveria ser retryable');
    if (ErrorClassifier.classify(configErr).retryable) throw new Error('CONFIGURATION não deveria ser retryable');
    if (ErrorClassifier.classify(corruptErr).retryable) throw new Error('INTEGRITY não deveria ser retryable');
  });

  // 22. Exponential Backoff & Jitter
  await test('22. Backoff Exponencial e Jitter: cálculo progressivo e limitado pelo teto', () => {
    const retry = new SmartRetryManager({
      maxAttempts: 4,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      jitterFactor: 0.2,
      useFullJitter: false
    });

    const d1 = retry.calculateDelay(1);
    const d2 = retry.calculateDelay(2);
    const d3 = retry.calculateDelay(3);
    const d10 = retry.calculateDelay(10); // Deve ser capped em 10000

    if (d2 <= d1 * 1.5) {
      throw new Error(`Backoff não multiplicou: d1=${d1}, d2=${d2}`);
    }
    if (d10 > 12000) {
      throw new Error(`Backoff ultrapassou o teto: d10=${d10}`);
    }
  });

  // 23. Max Attempts Exhaustion
  await test('23. Esgotamento de Tentativas: para de retentar e marca FAILED', async () => {
    const queueStore = new InMemoryQueueStore();
    const lock = new JobExecutionLock();
    const queue = new JobQueue(queueStore, lock);

    const executor = createMockExecutor(async () => {
      throw new EngineError({ code: 'ETIMEDOUT', message: 'Falha de rede simulada', category: ErrorCategory.NETWORK });
    });

    const job = createSampleJob();
    const { item } = await queue.enqueue({
      jobId: job.id,
      triggerType: ScheduleTriggerType.MANUAL,
      storageKey: 'LOCAL',
      maxAttempts: 1 // Apenas 1 tentativa
    });

    const retryManager = new SmartRetryManager({
      maxAttempts: 1,
      initialDelayMs: 10,
      maxDelayMs: 50,
      backoffMultiplier: 1.5,
      jitterFactor: 0.1,
      useFullJitter: false
    });

    const dispatcher = new ExecutionDispatcher({
      queue,
      lock,
      executor,
      jobLookup: async () => job,
      retryManager
    });

    dispatcher.start();
    await dispatcher.dispatch();
    await new Promise(r => setTimeout(r, 60));
    dispatcher.stop();

    const updated = queue.getItem(item.id);
    if (updated?.status !== BackupJobStatus.FAILED) {
      throw new Error(`Esperado status FAILED, obtido ${updated?.status}`);
    }
  });

  // 24. Cancellation
  await test('24. Cancelamento: cancela job na fila ou em execução através do token', async () => {
    const queueStore = new InMemoryQueueStore();
    const lock = new JobExecutionLock();
    const queue = new JobQueue(queueStore, lock);

    const { item } = await queue.enqueue({
      jobId: crypto.randomUUID(),
      triggerType: ScheduleTriggerType.MANUAL,
      storageKey: 'LOCAL'
    });

    await queue.cancel(item.id, 'Cancelado no teste');
    const updated = queue.getItem(item.id);
    if (updated?.status !== BackupJobStatus.CANCELLED) {
      throw new Error(`Esperado CANCELLED, obtido ${updated?.status}`);
    }
  });

  // 25. Pause & Resume
  await test('25. Pausa e Retomada: transiciona status seguramente', async () => {
    const queueStore = new InMemoryQueueStore();
    const lock = new JobExecutionLock();
    const queue = new JobQueue(queueStore, lock);

    const { item } = await queue.enqueue({
      jobId: crypto.randomUUID(),
      triggerType: ScheduleTriggerType.MANUAL,
      storageKey: 'LOCAL'
    });

    item.status = BackupJobStatus.RUNNING;
    await queue.pause(item.id);
    if (queue.getItem(item.id)?.status !== BackupJobStatus.PAUSED) {
      throw new Error('Deveria estar PAUSED');
    }

    await queue.resume(item.id);
    if (queue.getItem(item.id)?.status !== BackupJobStatus.RUNNING) {
      throw new Error('Deveria estar RUNNING');
    }
  });

  // 26. Crash Recovery: RUNNING marcado como INTERRUPTED
  await test('26. Recuperação de Falhas (Crash Recovery): itens RUNNING são marcados como INTERRUPTED', async () => {
    const queueStore = new InMemoryQueueStore();
    const lock = new JobExecutionLock();
    const eventBus = new MockEventBus();
    const queue = new JobQueue(queueStore, lock, eventBus);

    const jobId = crypto.randomUUID();
    // Simula item gravado no disco que estava RUNNING quando processo caiu
    await queueStore.saveQueueItem({
      id: crypto.randomUUID(),
      jobId,
      triggerType: ScheduleTriggerType.SCHEDULED,
      priority: JobPriority.NORMAL,
      status: BackupJobStatus.RUNNING,
      enqueuedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      attemptCount: 1,
      maxAttempts: 3,
      storageKey: 'LOCAL',
      agingBoost: 0,
      concurrentPolicy: ConcurrentExecutionPolicy.QUEUE
    });

    const report = await CrashRecoveryManager.recover({
      queueStore,
      queue,
      lock,
      eventBus,
      autoReEnqueueInterrupted: false
    });

    if (report.recoveredCount !== 1) {
      throw new Error(`Esperado 1 item recuperado, obtido ${report.recoveredCount}`);
    }

    const items = await queueStore.listQueueItems();
    if (items[0].status !== BackupJobStatus.INTERRUPTED) {
      throw new Error(`Esperado status INTERRUPTED (NUNCA COMPLETED), obtido ${items[0].status}`);
    }
  });

  // 27. Atomic File Persistence Across Reload
  await test('27. Persistência em Disco Atômica: salva e recarrega fila e agendamentos', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'backup-test-store-'));
    try {
      const fileStore = new FilePersistenceStore(tempDir);
      await fileStore.initialize();

      const scheduleId = crypto.randomUUID();
      const jobId = crypto.randomUUID();

      await fileStore.saveSchedule({
        id: scheduleId,
        jobId,
        enabled: true,
        type: 'DAILY',
        timezone: 'America/Sao_Paulo',
        dailyTime: '02:00',
        missedPolicy: MissedExecutionPolicy.SKIP,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Recarrega em nova instância
      const reloadedStore = new FilePersistenceStore(tempDir);
      const retrieved = await reloadedStore.getSchedule(scheduleId);

      if (!retrieved || retrieved.timezone !== 'America/Sao_Paulo') {
        throw new Error('Falha ao recarregar agendamento persistido do arquivo');
      }
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  // 28. End-to-end Coordinator Lifecycle
  await test('28. Coordenador Completo E2E: Ciclo de vida integrado (Start -> Enqueue -> Run -> Metrics -> Stop)', async () => {
    const job = createSampleJob();
    const executor = createMockExecutor();
    const coordinator = new BackupSchedulerCoordinator({
      executor,
      jobLookup: async id => (id === job.id ? job : null)
    });

    await coordinator.start();

    // Agenda um job manual
    await coordinator.scheduler.triggerManually({ jobId: job.id, storageKey: 'LOCAL' });

    // Espera despacho
    await new Promise(r => setTimeout(r, 100));

    const metrics = coordinator.getQueueMetrics();
    coordinator.stop();

    if (metrics.jobsCompleted < 1) {
      throw new Error(`Job E2E não completou no coordenador: completed=${metrics.jobsCompleted}`);
    }
  });

  const passedCount = results.filter(r => r.passed).length;
  console.log(`\n--- RESULTADO: ${passedCount}/${results.length} TESTES APROVADOS ---\n`);

  return {
    passed: passedCount === results.length,
    results
  };
}
