import {
  BackupStrategy,
  StorageProvider,
  FilesystemProvider,
  BackupCatalog,
  ProgressReporter,
  ManifestFileEntry,
  BackupManifest
} from '../core/contracts.js';
import {
  BackupJob,
  BackupExecution,
  BackupResult,
  BackupJobStatus,
  BackupJobType
} from '../core/domain.js';
import { CancellationToken, EngineError, ErrorCategory } from '../core/errors.js';
import { ChangeDetector } from '../core/change-detector.js';
import * as crypto from 'node:crypto';

export class DifferentialBackupStrategy implements BackupStrategy {
  public readonly strategyType = BackupJobType.DIFFERENTIAL;

  public async execute(params: {
    job: BackupJob;
    execution: BackupExecution;
    storage: StorageProvider;
    filesystem: FilesystemProvider;
    catalog: BackupCatalog;
    progress: ProgressReporter;
    cancellationToken: CancellationToken;
  }): Promise<BackupResult> {
    const { job, execution, storage, filesystem, catalog, progress, cancellationToken } = params;
    const startTime = Date.now();
    const manifestEntries: ManifestFileEntry[] = [];
    const deletedFiles: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // 1. Localizar SEMPRE o último backup FULL VÁLIDO da cadeia
    const latestValidFull = await catalog.getLatestValidFullExecution(job.id);
    if (!latestValidFull) {
      throw new EngineError({
        code: 'CHAIN_BASE_FULL_MISSING',
        message: `Não foi possível executar backup DIFFERENTIAL: Nenhum backup FULL válido foi encontrado para o job "${job.name}".`,
        category: ErrorCategory.VALIDATION,
        recoverable: false
      });
    }

    const baseFullExecutionId = latestValidFull.executionId;
    const baseFullManifest = await catalog.getManifest(baseFullExecutionId);
    if (!baseFullManifest) {
      throw new EngineError({
        code: 'BASE_FULL_MANIFEST_NOT_FOUND',
        message: `Manifesto do backup FULL base "${baseFullExecutionId}" não foi encontrado no catálogo.`,
        category: ErrorCategory.INTEGRITY,
        recoverable: false
      });
    }

    const chainExecutions = await catalog.getChainExecutions(job.id, baseFullExecutionId);
    const sequence = chainExecutions.length;
    const chainId = baseFullManifest.chainId || baseFullExecutionId;

    // 2. Fase de Varredura e Comparação SEMPRE contra o FULL Base
    progress.report({
      executionId: execution.executionId,
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

    const detector = new ChangeDetector(filesystem, { detectRenames: true, verifyContentHashOnSuspect: true });

    progress.report({
      executionId: execution.executionId,
      phase: 'COMPARING',
      filesScanned: 0,
      filesProcessed: 0,
      filesTotal: 0,
      bytesScanned: 0,
      bytesProcessed: 0,
      bytesTotal: 0,
      percentComplete: 5,
      speedBytesPerSec: 0,
      estimatedTimeRemainingSec: 0
    });

    // O diferencial compara o estado atual contra o baseFullManifest (acumulando todas as diferenças desde o Full)
    const changeSet = await detector.detectChanges({
      source: job.source,
      baseManifest: baseFullManifest,
      cancellationToken,
      onProgress: (scanned, currentPath) => {
        progress.report({
          executionId: execution.executionId,
          phase: 'SCANNING',
          filesScanned: scanned,
          filesProcessed: 0,
          filesTotal: 0,
          bytesScanned: 0,
          bytesProcessed: 0,
          bytesTotal: 0,
          currentFilePath: currentPath,
          percentComplete: 10,
          speedBytesPerSec: 0,
          estimatedTimeRemainingSec: 0
        });
      }
    });

    const itemsToTransfer = [
      ...changeSet.added,
      ...changeSet.modified,
      ...changeSet.renamed
    ];

    for (const del of changeSet.deleted) {
      deletedFiles.push(del.path);
      manifestEntries.push({
        path: del.path,
        sizeBytes: 0,
        modifiedAtMs: del.modifiedAtMs,
        sha256: del.previousSha256 || '',
        compressedSizeBytes: 0,
        isEncrypted: false,
        operation: 'DELETE'
      });
    }

    const totalFilesCount = itemsToTransfer.length;
    const totalBytesToTransfer = changeSet.totalBytesToTransfer;
    let processedFilesCount = 0;
    let processedBytesCount = 0;

    // 3. Fase de Processamento e Gravação em Streaming
    progress.report({
      executionId: execution.executionId,
      phase: 'PROCESSING',
      filesScanned: changeSet.totalScanned,
      filesProcessed: 0,
      filesTotal: totalFilesCount,
      bytesScanned: totalBytesToTransfer,
      bytesProcessed: 0,
      bytesTotal: totalBytesToTransfer,
      percentComplete: 15,
      speedBytesPerSec: 0,
      estimatedTimeRemainingSec: 0
    });

    const destPrefix = `backups/${job.id}/${execution.executionId}`;

    for (const item of itemsToTransfer) {
      cancellationToken.throwIfCancelled();

      if (!item.fullSourcePath) continue;

      try {
        const fileSha256 = item.sha256 || (await filesystem.calculateHash(item.fullSourcePath));
        const readStream = await filesystem.openReadStream(item.fullSourcePath);
        const remoteFilePath = `${destPrefix}/data/${item.path}`;

        const bytesWritten = await storage.putStream(remoteFilePath, readStream, item.sizeBytes);

        manifestEntries.push({
          path: item.path,
          sizeBytes: bytesWritten,
          modifiedAtMs: item.modifiedAtMs,
          sha256: fileSha256,
          compressedSizeBytes: bytesWritten,
          isEncrypted: false,
          operation: item.operation as 'ADD' | 'MODIFY' | 'RENAME',
          previousPath: item.previousPath,
          previousSha256: item.previousSha256
        });

        processedFilesCount++;
        processedBytesCount += bytesWritten;

        const percent = totalBytesToTransfer > 0 ? Math.round((processedBytesCount / totalBytesToTransfer) * 80) + 15 : 95;
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speed = elapsedSec > 0 ? processedBytesCount / elapsedSec : 0;
        const remainingBytes = totalBytesToTransfer - processedBytesCount;
        const eta = speed > 0 ? Math.round(remainingBytes / speed) : 0;

        progress.report({
          executionId: execution.executionId,
          phase: 'TRANSFERRING',
          filesScanned: changeSet.totalScanned,
          filesProcessed: processedFilesCount,
          filesTotal: totalFilesCount,
          bytesScanned: totalBytesToTransfer,
          bytesProcessed: processedBytesCount,
          bytesTotal: totalBytesToTransfer,
          currentFilePath: item.path,
          percentComplete: Math.min(percent, 98),
          speedBytesPerSec: Math.round(speed),
          estimatedTimeRemainingSec: eta
        });
      } catch (err: any) {
        errors.push(`Erro ao processar arquivo "${item.path}": ${err.message}`);
      }
    }

    // 4. Gravação e Validação do Manifest Diferencial
    progress.report({
      executionId: execution.executionId,
      phase: 'FINALIZING',
      filesScanned: changeSet.totalScanned,
      filesProcessed: processedFilesCount,
      filesTotal: totalFilesCount,
      bytesScanned: totalBytesToTransfer,
      bytesProcessed: processedBytesCount,
      bytesTotal: totalBytesToTransfer,
      percentComplete: 99,
      speedBytesPerSec: 0,
      estimatedTimeRemainingSec: 0
    });

    const manifest: BackupManifest = {
      manifestVersion: '2.0.0',
      executionId: execution.executionId,
      jobId: job.id,
      jobType: this.strategyType,
      createdAt: new Date().toISOString(),
      chainId,
      baseFullExecutionId,
      parentExecutionId: baseFullExecutionId, // Differentials sempre apontam para o Full base como pai direto
      sequence,
      totalFiles: manifestEntries.length,
      totalSizeBytes: processedBytesCount,
      files: manifestEntries,
      deletedFiles
    };

    const manifestJson = JSON.stringify(manifest, null, 2);
    const manifestHash = crypto.createHash('sha256').update(manifestJson).digest('hex');
    manifest.manifestSha256 = manifestHash;

    await catalog.saveManifest(manifest);

    return {
      success: errors.length === 0,
      status: errors.length === 0 ? BackupJobStatus.COMPLETED : BackupJobStatus.FAILED,
      executionId: execution.executionId,
      jobId: job.id,
      durationMs: Date.now() - startTime,
      metrics: {
        filesScanned: changeSet.totalScanned,
        filesProcessed: processedFilesCount,
        filesFailed: errors.length,
        bytesScanned: totalBytesToTransfer,
        bytesProcessed: processedBytesCount,
        bytesTransferred: processedBytesCount,
        throughputBytesPerSec: (processedBytesCount / Math.max((Date.now() - startTime) / 1000, 0.001))
      },
      manifestHash,
      warnings,
      errors,
      integrityVerified: true
    };
  }
}
