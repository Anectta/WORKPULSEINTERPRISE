import {
  BackupJob,
  BackupExecution,
  BackupResult,
  BackupJobStatus
} from './domain.js';
import {
  BackupStrategy,
  ProgressReporter,
  ProgressReport,
  StorageProvider,
  FilesystemProvider,
  BackupCatalog
} from './contracts.js';
import { EngineContext } from './context.js';
import { EngineError, ErrorCategory, CancellationToken, RetryPolicy } from './errors.js';
import * as crypto from 'node:crypto';

export class JobExecutor {
  constructor(private readonly context: EngineContext) {}

  public async executeJob(
    job: BackupJob,
    progressReporter?: ProgressReporter,
    cancellationToken?: CancellationToken
  ): Promise<BackupResult> {
    const token = cancellationToken || new CancellationToken();
    const executionId = crypto.randomUUID();
    const startTime = Date.now();

    const execution: BackupExecution = {
      executionId,
      jobId: job.id,
      tenantId: job.tenantId,
      executionType: job.jobType,
      status: BackupJobStatus.RUNNING,
      startedAt: new Date().toISOString(),
      durationMs: 0,
      filesScanned: 0,
      filesProcessed: 0,
      filesFailed: 0,
      bytesScanned: 0,
      bytesProcessed: 0,
      bytesTransferred: 0
    };

    // Publicar início da execução
    this.context.eventBus.publish({
      type: 'JOB_STARTED',
      payload: { execution }
    });

    const strategy = this.context.strategies.get(job.jobType);
    if (!strategy) {
      const err = new EngineError({
        code: 'STRATEGY_NOT_FOUND',
        message: `Nenhuma estratégia de backup registrada para o tipo: ${job.jobType}`,
        category: ErrorCategory.CONFIGURATION
      });

      this.context.eventBus.publish({
        type: 'JOB_FAILED',
        payload: { executionId, error: err.message }
      });

      throw err;
    }

    const storage = this.context.storageProviders.get(job.destination.providerType);
    if (!storage) {
      throw new EngineError({
        code: 'STORAGE_PROVIDER_NOT_FOUND',
        message: `Provedor de armazenamento "${job.destination.providerType}" não registrado no EngineContext.`,
        category: ErrorCategory.STORAGE
      });
    }

    const internalProgress: ProgressReporter = {
      report: (report: ProgressReport) => {
        execution.filesScanned = report.filesScanned;
        execution.filesProcessed = report.filesProcessed;
        execution.bytesScanned = report.bytesScanned;
        execution.bytesProcessed = report.bytesProcessed;
        execution.bytesTransferred = report.bytesProcessed;

        this.context.eventBus.publish({
          type: 'JOB_PROGRESS',
          payload: report
        });

        if (progressReporter) {
          progressReporter.report(report);
        }
      }
    };

    try {
      token.throwIfCancelled();

      // Executar a estratégia correspondente
      const result = await strategy.execute({
        job,
        execution,
        storage,
        filesystem: this.context.filesystem,
        catalog: this.context.catalog,
        progress: internalProgress,
        cancellationToken: token
      });

      execution.status = result.status;
      execution.finishedAt = new Date().toISOString();
      execution.durationMs = Date.now() - startTime;
      execution.manifestHash = result.manifestHash;
      execution.filesScanned = result.metrics.filesScanned;
      execution.filesProcessed = result.metrics.filesProcessed;
      execution.filesFailed = result.metrics.filesFailed;
      execution.bytesScanned = result.metrics.bytesScanned;
      execution.bytesProcessed = result.metrics.bytesProcessed;
      execution.bytesTransferred = result.metrics.bytesTransferred;

      // Registra a execução no catálogo
      await this.context.catalog.registerExecution(execution);

      this.context.eventBus.publish({
        type: 'JOB_COMPLETED',
        payload: { result }
      });

      return result;
    } catch (err: any) {
      const isCancelled = token.isCancelled;
      execution.status = isCancelled ? BackupJobStatus.CANCELLED : BackupJobStatus.FAILED;
      execution.finishedAt = new Date().toISOString();
      execution.durationMs = Date.now() - startTime;
      execution.errorSummary = err?.message || 'Erro desconhecido durante a execução do Job';

      // Registra a execução falha/cancelada no catálogo (para histórico e não ser usada como base)
      await this.context.catalog.registerExecution(execution);

      if (isCancelled) {
        this.context.eventBus.publish({
          type: 'JOB_CANCELLED',
          payload: { executionId, reason: token.reason }
        });
      } else {
        this.context.eventBus.publish({
          type: 'JOB_FAILED',
          payload: { executionId, error: execution.errorSummary }
        });
      }

      throw err;
    }
  }
}
