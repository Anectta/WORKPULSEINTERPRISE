import crypto from 'crypto';
import { UUID, BackupJobType } from '../core/domain.js';
import { BackupCatalog, StorageProvider, EventBus, CancellationToken } from '../core/contracts.js';
import { RetentionPolicy, RetentionPreview, RetentionResult } from './types.js';
import { RetentionEvaluator } from './evaluator.js';
import { RetentionDependencyChecker } from './dependency-checker.js';
import { RestoreRetentionCoordinator } from '../restore/restore-retention-lock.js';

export interface RetentionExecutorOptions {
  storage: StorageProvider;
  catalog: BackupCatalog;
  eventBus?: EventBus;
  coordinator?: RestoreRetentionCoordinator;
}

export class RetentionExecutor {
  private storage: StorageProvider;
  private catalog: BackupCatalog;
  private eventBus?: EventBus;
  private coordinator: RestoreRetentionCoordinator;

  constructor(options: RetentionExecutorOptions) {
    this.storage = options.storage;
    this.catalog = options.catalog;
    this.eventBus = options.eventBus;
    this.coordinator = options.coordinator || RestoreRetentionCoordinator.getInstance();
  }

  /**
   * Gera o preview de retenção (identifica o que será mantido, protegido ou excluído).
   */
  public async preview(jobId: UUID, policy: RetentionPolicy): Promise<RetentionPreview> {
    const executions = await this.catalog.listExecutions(jobId);

    const preliminary = RetentionEvaluator.evaluatePolicy(executions, policy);
    const finalized = await RetentionDependencyChecker.applyDependencyProtection(
      this.catalog,
      preliminary,
      this.coordinator
    );

    let toKeep = 0;
    let toDelete = 0;
    let protectedCount = 0;
    let dependencyProtectedCount = 0;

    for (const it of finalized) {
      if (it.action === 'KEEP') toKeep++;
      else if (it.action === 'DELETE') toDelete++;
      else if (it.action === 'PROTECTED') protectedCount++;
      else if (it.action === 'DEPENDENCY') dependencyProtectedCount++;
    }

    const preview: RetentionPreview = {
      jobId,
      totalScanned: finalized.length,
      toKeep: toKeep + protectedCount + dependencyProtectedCount,
      toDelete,
      protectedCount,
      dependencyProtectedCount,
      items: finalized
    };

    this.eventBus?.publish({
      type: 'RETENTION_PREVIEW_GENERATED',
      payload: {
        jobId,
        toDeleteCount: toDelete,
        toKeepCount: preview.toKeep
      }
    });

    return preview;
  }

  /**
   * Executa a limpeza segura de retenção respeitando dryRun, dependências e locks de concorrência.
   */
  public async execute(
    jobId: UUID,
    policy: RetentionPolicy,
    options?: { dryRun?: boolean; cancellationToken?: CancellationToken }
  ): Promise<RetentionResult> {
    const runId = crypto.randomUUID();
    const isDryRun = options?.dryRun ?? false;
    const token = options?.cancellationToken;

    this.eventBus?.publish({
      type: 'RETENTION_STARTED',
      payload: { jobId, policy }
    });

    try {
      token?.throwIfCancelled();

      // 1. Gera o preview final validado
      const preview = await this.preview(jobId, policy);

      if (isDryRun) {
        return {
          success: true,
          jobId,
          dryRun: true,
          scannedCount: preview.totalScanned,
          keptCount: preview.toKeep,
          deletedCount: 0,
          freedBytes: preview.items.filter(i => i.action === 'DELETE').reduce((acc, i) => acc + i.sizeBytes, 0),
          deletedExecutionIds: [],
          errors: []
        };
      }

      // 2. Ordenação Segura de Exclusão (Dependentes primeiro, Full por último)
      const deleteCandidates = preview.items.filter(i => i.action === 'DELETE');

      deleteCandidates.sort((a, b) => {
        // INCREMENTAL e DIFFERENTIAL antes de FULL
        if (a.executionType !== BackupJobType.FULL && b.executionType === BackupJobType.FULL) return -1;
        if (a.executionType === BackupJobType.FULL && b.executionType !== BackupJobType.FULL) return 1;
        // Do mais novo para o mais antigo entre incrementais
        return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      });

      const deletedExecutionIds: UUID[] = [];
      const errors: string[] = [];
      let freedBytes = 0;

      // 3. Exclusão Segura através da abstração do StorageProvider
      for (const item of deleteCandidates) {
        token?.throwIfCancelled();

        // Tenta adquirir lock exclusivo contra Restore concorrente
        const acquired = this.coordinator.tryAcquireRetentionDeleteLock(runId, item.executionId);
        if (!acquired) {
          errors.push(`Execução "${item.executionId}" não pôde ser excluída: em uso ativo por Restore concorrente.`);
          continue;
        }

        try {
          this.eventBus?.publish({
            type: 'RETENTION_DELETE_STARTED',
            payload: { jobId, executionId: item.executionId }
          });

          const remotePrefix = `backups/${jobId}/${item.executionId}`;

          // Limpa recursivamente os objetos do storage
          await this.deleteRemoteDirectoryRecursively(remotePrefix);

          // Atualização do Catálogo (remove manifesto e execução)
          if ((this.catalog as any).removeExecution) {
            await (this.catalog as any).removeExecution(jobId, item.executionId);
          }

          deletedExecutionIds.push(item.executionId);
          freedBytes += item.sizeBytes;

          this.eventBus?.publish({
            type: 'RETENTION_DELETE_COMPLETED',
            payload: { jobId, executionId: item.executionId }
          });
        } catch (delErr: any) {
          errors.push(`Falha ao remover execução "${item.executionId}" do storage: ${delErr.message}`);
        } finally {
          this.coordinator.releaseRetentionDeleteLock(runId, item.executionId);
        }
      }

      const success = errors.length === 0;

      this.eventBus?.publish({
        type: 'RETENTION_COMPLETED',
        payload: {
          jobId,
          deletedCount: deletedExecutionIds.length,
          keptCount: preview.toKeep
        }
      });

      return {
        success,
        jobId,
        dryRun: false,
        scannedCount: preview.totalScanned,
        keptCount: preview.totalScanned - deletedExecutionIds.length,
        deletedCount: deletedExecutionIds.length,
        freedBytes,
        deletedExecutionIds,
        errors
      };
    } catch (err: any) {
      this.eventBus?.publish({
        type: 'RETENTION_FAILED',
        payload: {
          jobId,
          error: err.message
        }
      });
      throw err;
    }
  }

  /**
   * Deleta recursivamente os arquivos do storage usando a abstração StorageProvider (sem chamadas a fs direto).
   */
  private async deleteRemoteDirectoryRecursively(prefix: string): Promise<void> {
    try {
      const items = await this.storage.listDirectory(prefix);
      for (const item of items) {
        if (item.isDirectory) {
          await this.deleteRemoteDirectoryRecursively(item.path);
        } else {
          await this.storage.delete(item.path);
        }
      }
      // Deleta o próprio prefixo / diretório
      await this.storage.delete(prefix);
    } catch {
      // Se não existir ou já tiver sido deletado
    }
  }
}
