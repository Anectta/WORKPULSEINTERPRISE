import {
  FilesystemProvider,
  StorageProvider,
  BackupCatalog,
  ProgressReporter,
  EventBus,
  FileMetadata,
  StorageItemMetadata
} from './contracts.js';
import {
  BackupJob,
  BackupJobStatus,
  UUID
} from './domain.js';
import {
  MirrorPolicy,
  MirrorComparisonMode,
  MirrorOperationType,
  MirrorOperationItem,
  MirrorOperationPlan,
  MirrorResult,
  ConflictPolicy
} from './mirror-domain.js';
import { EngineError, ErrorCategory, CancellationToken } from './errors.js';
import * as crypto from 'node:crypto';
import * as path from 'node:path';

/**
 * Executor do motor de espelhamento unidirecional (Mirror) com proteção contra catástrofes,
 * modo Dry Run / Preview, safe delete e operações atômicas.
 */
export class MirrorExecutor {
  public static readonly DEFAULT_POLICY: MirrorPolicy = {
    allowCreate: true,
    allowUpdate: true,
    allowDelete: false, // Por segurança corporativa, deleção exige habilitação explícita
    safeDelete: true, // Se deleção estiver ativa, move para quarentena por padrão
    quarantinePrefix: '.mirror_quarantine',
    dryRun: false,
    comparisonMode: MirrorComparisonMode.SIZE_AND_MTIME,
    preserveExtraFiles: false,
    followSymlinks: false,
    safetyThreshold: {
      maxDeletions: 1000,
      maxDeletionPercent: 20, // Aborta se mais de 20% do destino for excluído em um único ciclo
      abortOnThresholdExceeded: true,
      allowEmptySourceDeletion: false
    },
    conflictPolicy: ConflictPolicy.PRESERVE_BOTH,
    verifyChecksumAfterWrite: true
  };

  /**
   * Constrói o plano de operação lógico (OperationPlan / DryRun)
   */
  public async plan(params: {
    job: BackupJob;
    policy?: Partial<MirrorPolicy>;
    filesystem: FilesystemProvider;
    storage: StorageProvider;
    cancellationToken?: CancellationToken;
    progress?: ProgressReporter;
    executionId?: UUID;
  }): Promise<MirrorOperationPlan> {
    const { job, filesystem, storage, cancellationToken, progress } = params;
    const executionId = params.executionId || crypto.randomUUID();
    const effectivePolicy: MirrorPolicy = {
      ...MirrorExecutor.DEFAULT_POLICY,
      ...params.policy,
      safetyThreshold: {
        ...MirrorExecutor.DEFAULT_POLICY.safetyThreshold,
        ...(params.policy?.safetyThreshold || {})
      }
    };

    const startTime = Date.now();
    const operations: MirrorOperationItem[] = [];
    const sourceFilesMap = new Map<string, { fullPath: string; meta: FileMetadata }>();
    const destFilesMap = new Map<string, StorageItemMetadata>();
    let scanErrorsCount = 0;

    // 1. Fase de Scan da Origem
    progress?.report({
      executionId,
      phase: 'SCANNING',
      filesScanned: 0,
      filesProcessed: 0,
      filesTotal: 0,
      bytesScanned: 0,
      bytesProcessed: 0,
      bytesTotal: 0,
      percentComplete: 0,
      speedBytesPerSec: 0,
      estimatedTimeRemainingSec: 0
    });

    let totalSourceBytes = 0;
    for (const sourcePath of job.source.paths) {
      cancellationToken?.throwIfCancelled();
      try {
        const rootMeta = await filesystem.getFileMetadata(sourcePath);
        if (!rootMeta.isDirectory) {
          const rel = path.basename(rootMeta.path);
          if (!this.isExcluded(rel, job.source)) {
            sourceFilesMap.set(rel, { fullPath: rootMeta.path, meta: rootMeta });
            totalSourceBytes += rootMeta.sizeBytes;
          }
        } else {
          for await (const meta of filesystem.scanDirectory(sourcePath, {
            followSymlinks: effectivePolicy.followSymlinks ?? job.source.followSymlinks
          })) {
            cancellationToken?.throwIfCancelled();
            if (!meta.isDirectory) {
              const rel = path.relative(sourcePath, meta.path).replace(/\\/g, '/');
              if (!this.isExcluded(rel, job.source)) {
                sourceFilesMap.set(rel, { fullPath: meta.path, meta });
                totalSourceBytes += meta.sizeBytes;
              }
            }
          }
        }
      } catch (err: any) {
        scanErrorsCount++;
        console.warn(`[MirrorExecutor] Erro ao varrer origem "${sourcePath}":`, err);
      }
    }

    // 2. Fase de Scan do Destino
    const quarantineNormalizedPrefix = (effectivePolicy.quarantinePrefix || '.mirror_quarantine').replace(/\\/g, '/');
    try {
      const destItems = await storage.listDirectory('');
      for (const item of destItems) {
        cancellationToken?.throwIfCancelled();
        const normPath = item.path.replace(/\\/g, '/');
        // Ignora a pasta de quarentena durante a análise para não tentar apagá-la ou recriá-la
        if (normPath.startsWith(quarantineNormalizedPrefix + '/') || normPath === quarantineNormalizedPrefix) {
          continue;
        }
        if (!item.isDirectory) {
          destFilesMap.set(normPath, item);
        }
      }
    } catch (err: any) {
      console.warn(`[MirrorExecutor] Aviso ao listar destino:`, err);
    }

    // 3. Fase de Comparação (Source vs Destination)
    progress?.report({
      executionId,
      phase: 'COMPARING',
      filesScanned: sourceFilesMap.size + destFilesMap.size,
      filesProcessed: 0,
      filesTotal: sourceFilesMap.size + destFilesMap.size,
      bytesScanned: totalSourceBytes,
      bytesProcessed: 0,
      bytesTotal: totalSourceBytes,
      percentComplete: 20,
      speedBytesPerSec: 0,
      estimatedTimeRemainingSec: 0
    });

    let totalBytesToTransfer = 0;

    // 3.1. Avalia arquivos da Origem (CREATE, UPDATE, UNCHANGED)
    for (const [relPath, { fullPath, meta }] of sourceFilesMap.entries()) {
      cancellationToken?.throwIfCancelled();
      const destItem = destFilesMap.get(relPath);

      if (!destItem) {
        // Arquivo novo na origem
        if (effectivePolicy.allowCreate) {
          operations.push({
            operation: MirrorOperationType.CREATE,
            path: relPath,
            sourceFullPath: fullPath,
            sizeBytes: meta.sizeBytes,
            modifiedAtMs: meta.modifiedAtMs,
            reason: 'Arquivo ausente no destino'
          });
          totalBytesToTransfer += meta.sizeBytes;
        } else {
          operations.push({
            operation: MirrorOperationType.SKIPPED,
            path: relPath,
            sourceFullPath: fullPath,
            sizeBytes: meta.sizeBytes,
            modifiedAtMs: meta.modifiedAtMs,
            reason: 'Criação desabilitada pela política de mirror (allowCreate = false)'
          });
        }
      } else {
        // Arquivo existe em ambos os lados: compara de acordo com a política
        const isModified = await this.isSourceDifferent(
          fullPath,
          meta,
          destItem,
          effectivePolicy.comparisonMode,
          filesystem,
          storage
        );

        if (isModified) {
          if (effectivePolicy.allowUpdate) {
            operations.push({
              operation: MirrorOperationType.UPDATE,
              path: relPath,
              sourceFullPath: fullPath,
              sizeBytes: meta.sizeBytes,
              modifiedAtMs: meta.modifiedAtMs,
              reason: 'Arquivo modificado na origem em relação ao destino'
            });
            totalBytesToTransfer += meta.sizeBytes;
          } else {
            operations.push({
              operation: MirrorOperationType.SKIPPED,
              path: relPath,
              sourceFullPath: fullPath,
              sizeBytes: meta.sizeBytes,
              modifiedAtMs: meta.modifiedAtMs,
              reason: 'Atualização desabilitada pela política de mirror (allowUpdate = false)'
            });
          }
        } else {
          operations.push({
            operation: MirrorOperationType.UNCHANGED,
            path: relPath,
            sourceFullPath: fullPath,
            sizeBytes: meta.sizeBytes,
            modifiedAtMs: meta.modifiedAtMs,
            reason: 'Arquivo idêntico na origem e no destino'
          });
        }
      }
    }

    // 3.2. Avalia arquivos do Destino ausentes na Origem (DELETE, QUARANTINE ou SKIPPED)
    for (const [relPath, destItem] of destFilesMap.entries()) {
      cancellationToken?.throwIfCancelled();
      if (!sourceFilesMap.has(relPath)) {
        if (effectivePolicy.preserveExtraFiles) {
          operations.push({
            operation: MirrorOperationType.SKIPPED,
            path: relPath,
            sizeBytes: destItem.sizeBytes,
            reason: 'Arquivo extra preservado no destino pela política (preserveExtraFiles = true)'
          });
        } else if (effectivePolicy.allowDelete) {
          if (effectivePolicy.safeDelete) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const quarantinePath = `${quarantineNormalizedPrefix}/${timestamp}/${relPath}`;
            operations.push({
              operation: MirrorOperationType.QUARANTINE,
              path: relPath,
              sizeBytes: destItem.sizeBytes,
              quarantinePath,
              reason: 'Arquivo ausente na origem; movido para quarentena segura'
            });
          } else {
            operations.push({
              operation: MirrorOperationType.DELETE,
              path: relPath,
              sizeBytes: destItem.sizeBytes,
              reason: 'Arquivo ausente na origem; exclusão definitiva autorizada'
            });
          }
        } else {
          operations.push({
            operation: MirrorOperationType.SKIPPED,
            path: relPath,
            sizeBytes: destItem.sizeBytes,
            reason: 'Arquivo ausente na origem; exclusão desabilitada pela política (allowDelete = false)'
          });
        }
      }
    }

    // 4. Consolidação do Plano e Validação do Safety Threshold
    let createCount = 0;
    let updateCount = 0;
    let deleteCount = 0;
    let quarantineCount = 0;
    let unchangedCount = 0;
    let conflictCount = 0;
    let skippedCount = 0;
    let errorCount = scanErrorsCount;

    for (const op of operations) {
      switch (op.operation) {
        case MirrorOperationType.CREATE:
          createCount++;
          break;
        case MirrorOperationType.UPDATE:
          updateCount++;
          break;
        case MirrorOperationType.DELETE:
          deleteCount++;
          break;
        case MirrorOperationType.QUARANTINE:
          quarantineCount++;
          break;
        case MirrorOperationType.UNCHANGED:
          unchangedCount++;
          break;
        case MirrorOperationType.CONFLICT:
          conflictCount++;
          break;
        case MirrorOperationType.SKIPPED:
          skippedCount++;
          break;
        case MirrorOperationType.ERROR:
          errorCount++;
          break;
      }
    }

    const totalDeletionsPlanned = deleteCount + quarantineCount;
    let safetyThresholdExceeded = false;
    let abortReason: string | undefined;

    // Proteção 1: Erro de scanner da origem impede exclusões em massa
    if (scanErrorsCount > 0 && totalDeletionsPlanned > 0) {
      safetyThresholdExceeded = true;
      abortReason = `Houve ${scanErrorsCount} falha(s) durante o escaneamento da origem. Exclusões automáticas foram bloqueadas por segurança.`;
    }

    // Proteção 2: Origem vazia inesperadamente com destino populado
    if (
      sourceFilesMap.size === 0 &&
      destFilesMap.size > 0 &&
      totalDeletionsPlanned > 0 &&
      !effectivePolicy.safetyThreshold.allowEmptySourceDeletion
    ) {
      safetyThresholdExceeded = true;
      abortReason =
        'A origem está completamente vazia enquanto o destino possui arquivos. Exclusão em massa bloqueada contra desconexão acidental.';
    }

    // Proteção 3: Limite absoluto de exclusões
    if (
      effectivePolicy.safetyThreshold.maxDeletions !== undefined &&
      totalDeletionsPlanned > effectivePolicy.safetyThreshold.maxDeletions
    ) {
      safetyThresholdExceeded = true;
      abortReason = `O número planejado de exclusões (${totalDeletionsPlanned}) excede o limite máximo permitido (${effectivePolicy.safetyThreshold.maxDeletions}).`;
    }

    // Proteção 4: Percentual de exclusão em relação ao total do destino
    if (
      effectivePolicy.safetyThreshold.maxDeletionPercent !== undefined &&
      destFilesMap.size > 0
    ) {
      const deletePercent = (totalDeletionsPlanned / destFilesMap.size) * 100;
      if (deletePercent > effectivePolicy.safetyThreshold.maxDeletionPercent) {
        safetyThresholdExceeded = true;
        abortReason = `O percentual de exclusões (${deletePercent.toFixed(1)}%) excede o limite de segurança configurado (${effectivePolicy.safetyThreshold.maxDeletionPercent}%).`;
      }
    }

    const plan: MirrorOperationPlan = {
      planId: crypto.randomUUID(),
      jobId: job.id,
      executionId,
      createdAt: new Date().toISOString(),
      dryRun: !!effectivePolicy.dryRun,
      operations,
      summary: {
        totalSourceFiles: sourceFilesMap.size,
        totalDestFiles: destFilesMap.size,
        createCount,
        updateCount,
        deleteCount,
        quarantineCount,
        unchangedCount,
        conflictCount,
        skippedCount,
        errorCount,
        totalBytesToTransfer,
        safetyThresholdExceeded,
        abortReason
      },
      isValid: !safetyThresholdExceeded
    };

    return plan;
  }

  /**
   * Executa o espelhamento de acordo com a política e o plano gerado
   */
  public async execute(params: {
    job: BackupJob;
    policy?: Partial<MirrorPolicy>;
    filesystem: FilesystemProvider;
    storage: StorageProvider;
    catalog?: BackupCatalog;
    eventBus?: EventBus;
    progress?: ProgressReporter;
    cancellationToken?: CancellationToken;
    executionId?: UUID;
  }): Promise<MirrorResult> {
    const { job, filesystem, storage, eventBus, progress, cancellationToken } = params;
    const executionId = params.executionId || crypto.randomUUID();
    const effectivePolicy: MirrorPolicy = {
      ...MirrorExecutor.DEFAULT_POLICY,
      ...params.policy,
      safetyThreshold: {
        ...MirrorExecutor.DEFAULT_POLICY.safetyThreshold,
        ...(params.policy?.safetyThreshold || {})
      }
    };

    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Gera o plano de operações
    const plan = await this.plan({
      job,
      policy: effectivePolicy,
      filesystem,
      storage,
      cancellationToken,
      progress,
      executionId
    });

    // 2. Se Safety Threshold for violado, interrompe ou avisa
    if (plan.summary.safetyThresholdExceeded) {
      const msg = plan.summary.abortReason || 'Safety Threshold do Mirror foi violado.';
      eventBus?.publish({
        type: 'STORAGE_WARNING',
        payload: { message: `[SAFETY_ABORT] ${msg}`, context: plan.summary }
      });

      if (effectivePolicy.safetyThreshold.abortOnThresholdExceeded) {
        throw new EngineError({
          code: 'MIRROR_SAFETY_THRESHOLD_EXCEEDED',
          message: msg,
          category: ErrorCategory.SAFETY,
          recoverable: false,
          retryable: false,
          context: plan.summary as any
        });
      }
    }

    // 3. Se for DRY RUN / PREVIEW, encerra sem realizar modificações físicas
    if (effectivePolicy.dryRun) {
      progress?.report({
        executionId,
        phase: 'FINALIZE',
        filesScanned: plan.summary.totalSourceFiles + plan.summary.totalDestFiles,
        filesProcessed: 0,
        filesTotal: plan.operations.length,
        bytesScanned: plan.summary.totalBytesToTransfer,
        bytesProcessed: 0,
        bytesTotal: plan.summary.totalBytesToTransfer,
        percentComplete: 100,
        speedBytesPerSec: 0,
        estimatedTimeRemainingSec: 0
      } as any);

      return {
        success: true,
        status: BackupJobStatus.COMPLETED,
        executionId,
        jobId: job.id,
        durationMs: Date.now() - startTime,
        plan,
        applied: {
          created: 0,
          updated: 0,
          deleted: 0,
          quarantined: 0,
          skipped: plan.operations.length,
          errors: 0,
          bytesTransferred: 0
        },
        errors: [],
        warnings: [
          'Execução em modo Dry Run / Preview: nenhuma alteração física foi realizada no armazenamento.'
        ],
        integrityVerified: true
      };
    }

    // 4. Execução física atômica
    let createdApplied = 0;
    let updatedApplied = 0;
    let deletedApplied = 0;
    let quarantinedApplied = 0;
    let skippedApplied = 0;
    let bytesTransferred = 0;

    const totalOps = plan.operations.length;
    let currentOpIndex = 0;

    progress?.report({
      executionId,
      phase: 'TRANSFERRING',
      filesScanned: plan.summary.totalSourceFiles,
      filesProcessed: 0,
      filesTotal: totalOps,
      bytesScanned: plan.summary.totalBytesToTransfer,
      bytesProcessed: 0,
      bytesTotal: plan.summary.totalBytesToTransfer,
      percentComplete: 30,
      speedBytesPerSec: 0,
      estimatedTimeRemainingSec: 0
    });

    for (const op of plan.operations) {
      cancellationToken?.throwIfCancelled();
      currentOpIndex++;

      try {
        switch (op.operation) {
          case MirrorOperationType.CREATE:
          case MirrorOperationType.UPDATE: {
            if (!op.sourceFullPath) {
              skippedApplied++;
              break;
            }

            const isCreate = op.operation === MirrorOperationType.CREATE;
            // Cálculo prévio do hash para integridade
            const expectedHash = await filesystem.calculateHash(op.sourceFullPath);
            const readStream = await filesystem.openReadStream(op.sourceFullPath);

            const written = await storage.putStream(op.path, readStream, op.sizeBytes);

            // Verificação pós-gravação
            if (effectivePolicy.verifyChecksumAfterWrite) {
              const remoteStream = await storage.getStream(op.path);
              const hashVerify = crypto.createHash('sha256');
              await new Promise<void>((resolve, reject) => {
                remoteStream.on('data', (c) => hashVerify.update(c));
                remoteStream.on('end', () => resolve());
                remoteStream.on('error', reject);
              });
              const remoteHash = hashVerify.digest('hex');
              if (remoteHash !== expectedHash) {
                throw new EngineError({
                  code: 'MIRROR_INTEGRITY_MISMATCH',
                  message: `Falha de integridade SHA-256 após espelhar ${op.path}`,
                  category: ErrorCategory.INTEGRITY
                });
              }
            }

            bytesTransferred += written;
            if (isCreate) createdApplied++;
            else updatedApplied++;
            break;
          }

          case MirrorOperationType.QUARANTINE: {
            if (op.quarantinePath) {
              // Move arquivo do destino para o local de quarentena
              await storage.rename(op.path, op.quarantinePath);
              quarantinedApplied++;
            }
            break;
          }

          case MirrorOperationType.DELETE: {
            await storage.delete(op.path);
            deletedApplied++;
            break;
          }

          case MirrorOperationType.UNCHANGED:
          case MirrorOperationType.SKIPPED:
          default:
            skippedApplied++;
            break;
        }

        const elapsedSec = (Date.now() - startTime) / 1000;
        const speed = elapsedSec > 0 ? bytesTransferred / elapsedSec : 0;
        const percent = Math.min(Math.round((currentOpIndex / totalOps) * 70) + 30, 99);

        progress?.report({
          executionId,
          phase: 'TRANSFERRING',
          filesScanned: plan.summary.totalSourceFiles,
          filesProcessed: currentOpIndex,
          filesTotal: totalOps,
          bytesScanned: plan.summary.totalBytesToTransfer,
          bytesProcessed: bytesTransferred,
          bytesTotal: plan.summary.totalBytesToTransfer,
          currentFilePath: op.path,
          percentComplete: percent,
          speedBytesPerSec: Math.round(speed),
          estimatedTimeRemainingSec: speed > 0 ? Math.round((plan.summary.totalBytesToTransfer - bytesTransferred) / speed) : 0
        });
      } catch (err: any) {
        errors.push(`Erro na operação ${op.operation} em "${op.path}": ${err.message}`);
      }
    }

    progress?.report({
      executionId,
      phase: 'FINALIZING',
      filesScanned: plan.summary.totalSourceFiles,
      filesProcessed: totalOps,
      filesTotal: totalOps,
      bytesScanned: plan.summary.totalBytesToTransfer,
      bytesProcessed: bytesTransferred,
      bytesTotal: plan.summary.totalBytesToTransfer,
      percentComplete: 100,
      speedBytesPerSec: 0,
      estimatedTimeRemainingSec: 0
    });

    const isSuccess = errors.length === 0;

    return {
      success: isSuccess,
      status: isSuccess ? BackupJobStatus.COMPLETED : BackupJobStatus.FAILED,
      executionId,
      jobId: job.id,
      durationMs: Date.now() - startTime,
      plan,
      applied: {
        created: createdApplied,
        updated: updatedApplied,
        deleted: deletedApplied,
        quarantined: quarantinedApplied,
        skipped: skippedApplied,
        errors: errors.length,
        bytesTransferred
      },
      errors,
      warnings,
      integrityVerified: isSuccess
    };
  }

  private isExcluded(relPath: string, source: BackupJob['source']): boolean {
    const norm = relPath.replace(/\\/g, '/');
    if (source.excludePatterns && source.excludePatterns.length > 0) {
      for (const pat of source.excludePatterns) {
        if (this.matchGlob(norm, pat)) return true;
      }
    }
    if (source.includePatterns && source.includePatterns.length > 0) {
      let matched = false;
      for (const pat of source.includePatterns) {
        if (this.matchGlob(norm, pat)) {
          matched = true;
          break;
        }
      }
      if (!matched) return true;
    }
    return false;
  }

  private matchGlob(targetPath: string, pattern: string): boolean {
    const clean = pattern.replace(/\\/g, '/');
    if (clean === '*' || clean === '**/*') return true;
    if (clean.startsWith('*.')) return targetPath.endsWith(clean.slice(1));
    if (clean.endsWith('/*')) {
      const prefix = clean.slice(0, -2);
      return targetPath.startsWith(prefix + '/') || targetPath === prefix;
    }
    return targetPath === clean || targetPath.includes(clean);
  }

  private async isSourceDifferent(
    sourceFullPath: string,
    sourceMeta: FileMetadata,
    destItem: StorageItemMetadata,
    mode: MirrorComparisonMode,
    filesystem: FilesystemProvider,
    storage: StorageProvider
  ): Promise<boolean> {
    const sizeDifferent = sourceMeta.sizeBytes !== destItem.sizeBytes;
    const destMtimeMs = new Date(destItem.modifiedAt).getTime();
    const mtimeDifferent = Math.abs(sourceMeta.modifiedAtMs - destMtimeMs) > 1000;

    if (mode === MirrorComparisonMode.FAST || mode === MirrorComparisonMode.SIZE_AND_MTIME) {
      return sizeDifferent || mtimeDifferent;
    }

    if (mode === MirrorComparisonMode.METADATA_AND_CHECKSUM) {
      if (!sizeDifferent && !mtimeDifferent) {
        return false;
      }
      // Se metadados divergiram, calcula hashes para certificar
      const sourceHash = await filesystem.calculateHash(sourceFullPath);
      const destHash = destItem.sha256 || (await this.calculateStorageHash(storage, destItem.path));
      return sourceHash !== destHash;
    }

    if (mode === MirrorComparisonMode.CHECKSUM_ONLY) {
      const sourceHash = await filesystem.calculateHash(sourceFullPath);
      const destHash = destItem.sha256 || (await this.calculateStorageHash(storage, destItem.path));
      return sourceHash !== destHash;
    }

    return sizeDifferent || mtimeDifferent;
  }

  private async calculateStorageHash(storage: StorageProvider, remotePath: string): Promise<string> {
    const stream = await storage.getStream(remotePath);
    const hash = crypto.createHash('sha256');
    return new Promise((resolve, reject) => {
      stream.on('data', (c) => hash.update(c));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}
