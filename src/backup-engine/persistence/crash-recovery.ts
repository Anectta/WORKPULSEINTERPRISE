import { UUID, BackupJobStatus } from '../core/domain.js';
import { QueueStore, ExecutionHistoryStore } from './contracts.js';
import { JobQueue } from '../queue/job-queue.js';
import { JobExecutionLock } from '../queue/job-execution-lock.js';
import { EventBus } from '../core/contracts.js';

export interface RecoveryReport {
  recoveredCount: number;
  interruptedJobIds: UUID[];
  reEnqueuedCount: number;
}

export class CrashRecoveryManager {
  /**
   * Executado durante a inicialização do Engine.
   * Analisa itens persistidos que estavam em execução antes de queda inesperada do processo.
   */
  public static async recover(params: {
    queueStore: QueueStore;
    queue: JobQueue;
    lock: JobExecutionLock;
    eventBus?: EventBus;
    historyStore?: ExecutionHistoryStore;
    autoReEnqueueInterrupted?: boolean;
  }): Promise<RecoveryReport> {
    const report: RecoveryReport = {
      recoveredCount: 0,
      interruptedJobIds: [],
      reEnqueuedCount: 0
    };

    // 1. Limpa qualquer lock residual na memória
    params.lock.clear();

    // 2. Lê itens persistidos
    const persistedItems = await params.queueStore.listQueueItems();

    for (const item of persistedItems) {
      if (item.status === BackupJobStatus.RUNNING || item.status === BackupJobStatus.RETRYING) {
        report.recoveredCount++;
        report.interruptedJobIds.push(item.jobId);

        // NUNCA marcar como COMPLETED. Sempre INTERRUPTED.
        item.status = BackupJobStatus.INTERRUPTED;
        item.finishedAt = new Date().toISOString();
        item.lastError = 'Execução interrompida por desligamento abrupto ou crash do processo.';

        params.eventBus?.publish({
          type: 'JOB_INTERRUPTED',
          payload: {
            executionId: item.executionId || item.id,
            jobId: item.jobId,
            reason: item.lastError
          }
        });

        await params.historyStore?.recordExecution({
          executionId: item.executionId || item.id,
          jobId: item.jobId,
          status: BackupJobStatus.INTERRUPTED,
          startedAt: item.startedAt || item.enqueuedAt,
          finishedAt: item.finishedAt,
          durationMs: 0,
          attemptCount: item.attemptCount,
          errorSummary: item.lastError,
          updatedAt: new Date().toISOString()
        });

        // 3. Re-enfileiramento seguro se houver tentativas restantes
        if (params.autoReEnqueueInterrupted && item.attemptCount < item.maxAttempts) {
          item.status = BackupJobStatus.QUEUED;
          item.lastError = 'Reenfileirado automaticamente após recuperação de crash.';
          report.reEnqueuedCount++;
        }

        await params.queueStore.saveQueueItem(item as any);
      }
    }

    // Recarrega a fila em memória com os estados atualizados
    await params.queue.initialize();

    return report;
  }
}
