import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { createHash } from 'crypto';
import {
  UUID,
  RestoreMode,
  OverwritePolicy,
  RestoreConflictPolicy
} from '../core/domain.js';
import {
  BackupCatalog,
  StorageProvider,
  FilesystemProvider,
  EventBus,
  CancellationToken
} from '../core/contracts.js';
import { EngineError, ErrorCategory } from '../core/errors.js';
import { BackupPipelineManager } from '../crypto/backup-pipeline.js';
import { RestoreRequest, RestoreResult } from '../core/domain.js';
import { RestoreChainResolver } from './chain-resolver.js';
import { RestorePlanner } from './planner.js';
import { RestorePreview, RestorePlan } from './types.js';
import { RestoreRetentionCoordinator } from './restore-retention-lock.js';

export interface RestoreEngineOptions {
  catalog: BackupCatalog;
  storage: StorageProvider;
  filesystem?: FilesystemProvider;
  pipelineManager?: BackupPipelineManager;
  eventBus?: EventBus;
  coordinator?: RestoreRetentionCoordinator;
}

export class RestoreEngine {
  private catalog: BackupCatalog;
  private storage: StorageProvider;
  private filesystem?: FilesystemProvider;
  private pipelineManager?: BackupPipelineManager;
  private eventBus?: EventBus;
  private coordinator: RestoreRetentionCoordinator;

  constructor(options: RestoreEngineOptions) {
    this.catalog = options.catalog;
    this.storage = options.storage;
    this.filesystem = options.filesystem;
    this.pipelineManager = options.pipelineManager;
    this.eventBus = options.eventBus;
    this.coordinator = options.coordinator || RestoreRetentionCoordinator.getInstance();
  }

  /**
   * Gera o RestorePreview antes da execução de operações de restauração.
   */
  public async preview(request: RestoreRequest): Promise<RestorePreview> {
    const executionId = request.executionId || request.versionId;
    if (!executionId) {
      throw new EngineError({
        code: 'RESTORE_MISSING_EXECUTION_ID',
        message: 'O executionId/versionId é obrigatório para gerar o preview de restauração.',
        category: ErrorCategory.VALIDATION
      });
    }

    const chainResult = await RestoreChainResolver.resolveAndValidateChain(
      this.catalog,
      this.storage,
      request.jobId,
      executionId
    );

    const { preview } = await RestorePlanner.createPlan(request, chainResult, this.filesystem);

    this.eventBus?.publish({
      type: 'RESTORE_PREVIEW_GENERATED',
      payload: {
        requestId: request.requestId,
        totalFiles: preview.totalFiles,
        totalBytes: preview.totalBytes
      }
    });

    return preview;
  }

  /**
   * Executa a restauração completa, parcial, de arquivos ou diretórios conforme especificado no RestoreRequest.
   */
  public async execute(
    request: RestoreRequest,
    options?: { cancellationToken?: CancellationToken }
  ): Promise<RestoreResult> {
    const startTime = Date.now();
    const token = options?.cancellationToken;
    const executionId = request.executionId || request.versionId;

    if (!executionId) {
      throw new EngineError({
        code: 'RESTORE_MISSING_EXECUTION_ID',
        message: 'O executionId/versionId é obrigatório para executar a restauração.',
        category: ErrorCategory.VALIDATION
      });
    }

    // 1. Resolução e validação estrita da cadeia de backup
    const chainResult = await RestoreChainResolver.resolveAndValidateChain(
      this.catalog,
      this.storage,
      request.jobId,
      executionId
    );

    // 2. Adquire Lease de Concorrência para proteger a cadeia contra exclusão por retenção
    const chainExecIds = chainResult.chainExecutions.map(e => e.executionId);
    const releaseLease = this.coordinator.acquireRestoreLease(chainExecIds);

    const tempFilesCreated: string[] = [];

    try {
      token?.throwIfCancelled();

      // 3. Planejamento da Restauração
      const { preview, plan } = await RestorePlanner.createPlan(request, chainResult, this.filesystem);

      this.eventBus?.publish({
        type: 'RESTORE_STARTED',
        payload: {
          requestId: request.requestId,
          jobId: request.jobId,
          executionId
        }
      });

      // Cria diretório raiz de destino se não existir
      if (!fs.existsSync(request.targetDirectory)) {
        fs.mkdirSync(request.targetDirectory, { recursive: true });
      }

      let filesRestored = 0;
      let filesSkipped = 0;
      let filesFailed = 0;
      let bytesRestored = 0;
      const errors: string[] = [...preview.errors];

      // 4. Execução dos Itens do Plano
      for (const item of plan.items) {
        token?.throwIfCancelled();

        if (item.action === 'SKIP') {
          filesSkipped++;
          continue;
        }

        if (item.action === 'ERROR') {
          filesFailed++;
          errors.push(`Falha no item "${item.relativePath}": ${item.reason}`);
          continue;
        }

        this.eventBus?.publish({
          type: 'RESTORE_FILE_STARTED',
          payload: {
            requestId: request.requestId,
            filePath: item.relativePath,
            size: item.sizeBytes
          }
        });

        const targetDir = path.dirname(item.targetFullPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Restauração Atômica: grava em arquivo temporário com UUID
        const tempPath = `${item.targetFullPath}.tmp_${crypto.randomUUID()}`;
        tempFilesCreated.push(tempPath);

        try {
          const remotePath = `backups/${request.jobId}/${item.sourceExecutionId}/data/${item.relativePath}`;
          const storageStream = await this.storage.getStream(remotePath);

          if (item.isEncrypted) {
            if (!this.pipelineManager) {
              throw new EngineError({
                code: 'PIPELINE_MANAGER_REQUIRED',
                message: 'BackupPipelineManager não configurado para descriptografar arquivo protegido.',
                category: ErrorCategory.CONFIGURATION
              });
            }

            const restoreRes = await this.pipelineManager.restoreStream(
              storageStream,
              request.password,
              { cancellationToken: token }
            );

            const fileWriteStream = createWriteStream(tempPath);
            await pipeline(restoreRes.restoredStream, fileWriteStream);

            // Validação de integridade do pipeline
            await restoreRes.verifyOriginalIntegrity();
          } else {
            // Arquivo não criptografado: streaming direto com cálculo do SHA-256
            const hasher = createHash('sha256');
            const fileWriteStream = createWriteStream(tempPath);

            storageStream.on('data', (chunk: Buffer) => hasher.update(chunk));
            await pipeline(storageStream, fileWriteStream);

            const calculatedSha256 = hasher.digest('hex');
            if (item.expectedSha256 && calculatedSha256 !== item.expectedSha256) {
              throw new EngineError({
                code: 'INTEGRITY_CHECKSUM_MISMATCH',
                message: `Corrupção detectada no arquivo "${item.relativePath}": esperado ${item.expectedSha256}, obtido ${calculatedSha256}`,
                category: ErrorCategory.CORRUPTION
              });
            }
          }

          // Renomeação atômica do arquivo temporário para o destino final
          fs.renameSync(tempPath, item.targetFullPath);
          const index = tempFilesCreated.indexOf(tempPath);
          if (index !== -1) tempFilesCreated.splice(index, 1);

          // Preservação de metadata (mtime) quando solicitado
          if ((request.preserveMetadata || request.restorePermissions) && item.backupModifiedAtMs) {
            try {
              const mtimeDate = new Date(item.backupModifiedAtMs);
              fs.utimesSync(item.targetFullPath, mtimeDate, mtimeDate);
            } catch {
              // Ignore metadata failure on restricted platforms
            }
          }

          filesRestored++;
          bytesRestored += item.sizeBytes;

          this.eventBus?.publish({
            type: 'RESTORE_FILE_COMPLETED',
            payload: {
              requestId: request.requestId,
              filePath: item.relativePath,
              sha256: item.expectedSha256
            }
          });
        } catch (fileErr: any) {
          filesFailed++;
          errors.push(`Erro ao restaurar "${item.relativePath}": ${fileErr.message}`);
          if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch {}
          }
        }
      }

      const durationMs = Date.now() - startTime;
      const success = filesFailed === 0;

      const result: RestoreResult = {
        success,
        requestId: request.requestId,
        jobId: request.jobId,
        executionId,
        targetDirectory: request.targetDirectory,
        durationMs,
        filesRestored,
        filesSkipped,
        filesFailed,
        bytesRestored,
        errors,
        integrityPassed: errors.length === 0
      };

      if (success) {
        this.eventBus?.publish({
          type: 'RESTORE_COMPLETED',
          payload: {
            requestId: request.requestId,
            filesRestored,
            bytesRestored
          }
        });
      } else {
        this.eventBus?.publish({
          type: 'RESTORE_FAILED',
          payload: {
            requestId: request.requestId,
            error: errors.join('; ')
          }
        });
      }

      return result;
    } catch (err: any) {
      // Limpeza de arquivos temporários em caso de falha ou cancelamento
      for (const t of tempFilesCreated) {
        if (fs.existsSync(t)) {
          try { fs.unlinkSync(t); } catch {}
        }
      }

      if (token?.isCancelled) {
        this.eventBus?.publish({
          type: 'RESTORE_CANCELLED',
          payload: {
            requestId: request.requestId,
            reason: 'Operação cancelada pelo usuário ou token.'
          }
        });
      } else {
        this.eventBus?.publish({
          type: 'RESTORE_FAILED',
          payload: {
            requestId: request.requestId,
            error: err.message
          }
        });
      }

      throw err;
    } finally {
      // Libera Lease de Concorrência
      releaseLease();
    }
  }

  /**
   * Atalho para restauração de um arquivo individual específico.
   */
  public async restoreFile(
    jobId: UUID,
    executionId: UUID,
    relativeFilePath: string,
    targetDirectory: string,
    options?: Partial<RestoreRequest>
  ): Promise<RestoreResult> {
    const request: RestoreRequest = {
      requestId: crypto.randomUUID(),
      jobId,
      executionId,
      restoreMode: RestoreMode.FILES,
      selectedPaths: [relativeFilePath],
      targetDirectory,
      overwritePolicy: options?.overwritePolicy || OverwritePolicy.ALWAYS,
      conflictPolicy: options?.conflictPolicy || RestoreConflictPolicy.OVERWRITE,
      preserveMetadata: options?.preserveMetadata ?? true,
      verifyIntegrity: options?.verifyIntegrity ?? true,
      password: options?.password,
      ...options
    };

    return this.execute(request);
  }

  /**
   * Atalho para restauração de um diretório específico.
   */
  public async restoreDirectory(
    jobId: UUID,
    executionId: UUID,
    relativeDirPath: string,
    targetDirectory: string,
    options?: Partial<RestoreRequest>
  ): Promise<RestoreResult> {
    const request: RestoreRequest = {
      requestId: crypto.randomUUID(),
      jobId,
      executionId,
      restoreMode: RestoreMode.DIRECTORY,
      selectedPaths: [relativeDirPath],
      targetDirectory,
      overwritePolicy: options?.overwritePolicy || OverwritePolicy.ALWAYS,
      conflictPolicy: options?.conflictPolicy || RestoreConflictPolicy.OVERWRITE,
      preserveMetadata: options?.preserveMetadata ?? true,
      verifyIntegrity: options?.verifyIntegrity ?? true,
      password: options?.password,
      ...options
    };

    return this.execute(request);
  }
}
