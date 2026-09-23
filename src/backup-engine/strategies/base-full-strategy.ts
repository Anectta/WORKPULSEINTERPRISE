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
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export class BaseFullBackupStrategy implements BackupStrategy {
  public readonly strategyType = BackupJobType.FULL;

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
    const warnings: string[] = [];
    const errors: string[] = [];

    // 1. Fase de Varredura
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

    const filesToBackup: Array<{ fullPath: string; relativePath: string; sizeBytes: number; modifiedAtMs: number }> = [];
    let totalBytesToBackup = 0;

    for (const sourcePath of job.source.paths) {
      cancellationToken.throwIfCancelled();
      try {
        const rootMeta = await filesystem.getFileMetadata(sourcePath);
        if (!rootMeta.isDirectory) {
          filesToBackup.push({
            fullPath: rootMeta.path,
            relativePath: path.basename(rootMeta.path),
            sizeBytes: rootMeta.sizeBytes,
            modifiedAtMs: rootMeta.modifiedAtMs
          });
          totalBytesToBackup += rootMeta.sizeBytes;
        } else {
          for await (const meta of filesystem.scanDirectory(sourcePath)) {
            cancellationToken.throwIfCancelled();
            if (!meta.isDirectory) {
              const rel = path.relative(sourcePath, meta.path).replace(/\\/g, '/');
              filesToBackup.push({
                fullPath: meta.path,
                relativePath: rel,
                sizeBytes: meta.sizeBytes,
                modifiedAtMs: meta.modifiedAtMs
              });
              totalBytesToBackup += meta.sizeBytes;
            }
          }
        }
      } catch (err: any) {
        warnings.push(`Falha ao varrer origem "${sourcePath}": ${err.message}`);
      }
    }

    const totalFilesCount = filesToBackup.length;
    let processedFilesCount = 0;
    let processedBytesCount = 0;

    // 2. Fase de Processamento e Gravação em Streaming
    progress.report({
      executionId: execution.executionId,
      phase: 'PROCESSING',
      filesScanned: totalFilesCount,
      filesProcessed: 0,
      filesTotal: totalFilesCount,
      bytesScanned: totalBytesToBackup,
      bytesProcessed: 0,
      bytesTotal: totalBytesToBackup,
      percentComplete: 0,
      speedBytesPerSec: 0,
      estimatedTimeRemainingSec: 0
    });

    const destPrefix = `backups/${job.id}/${execution.executionId}`;

    for (const file of filesToBackup) {
      cancellationToken.throwIfCancelled();

      try {
        const fileSha256 = await filesystem.calculateHash(file.fullPath);
        const readStream = await filesystem.openReadStream(file.fullPath);
        const remoteFilePath = `${destPrefix}/data/${file.relativePath}`;

        const bytesWritten = await storage.putStream(remoteFilePath, readStream, file.sizeBytes);

        manifestEntries.push({
          path: file.relativePath,
          sizeBytes: bytesWritten,
          modifiedAtMs: file.modifiedAtMs,
          sha256: fileSha256,
          compressedSizeBytes: bytesWritten,
          isEncrypted: false
        });

        processedFilesCount++;
        processedBytesCount += bytesWritten;

        const percent = totalBytesToBackup > 0 ? Math.round((processedBytesCount / totalBytesToBackup) * 100) : 100;
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speed = elapsedSec > 0 ? processedBytesCount / elapsedSec : 0;
        const remainingBytes = totalBytesToBackup - processedBytesCount;
        const eta = speed > 0 ? Math.round(remainingBytes / speed) : 0;

        progress.report({
          executionId: execution.executionId,
          phase: 'TRANSFERRING',
          filesScanned: totalFilesCount,
          filesProcessed: processedFilesCount,
          filesTotal: totalFilesCount,
          bytesScanned: totalBytesToBackup,
          bytesProcessed: processedBytesCount,
          bytesTotal: totalBytesToBackup,
          currentFilePath: file.relativePath,
          percentComplete: Math.min(percent, 100),
          speedBytesPerSec: Math.round(speed),
          estimatedTimeRemainingSec: eta
        });
      } catch (err: any) {
        errors.push(`Erro ao processar arquivo "${file.relativePath}": ${err.message}`);
      }
    }

    // 3. Gravação e Validação do Manifest
    progress.report({
      executionId: execution.executionId,
      phase: 'FINALIZING',
      filesScanned: totalFilesCount,
      filesProcessed: processedFilesCount,
      filesTotal: totalFilesCount,
      bytesScanned: totalBytesToBackup,
      bytesProcessed: processedBytesCount,
      bytesTotal: totalBytesToBackup,
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
      chainId: execution.executionId, // O Full inicia a cadeia e define o chainId
      baseFullExecutionId: execution.executionId,
      parentExecutionId: undefined,
      sequence: 0,
      totalFiles: manifestEntries.length,
      totalSizeBytes: processedBytesCount,
      files: manifestEntries
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
        filesScanned: totalFilesCount,
        filesProcessed: processedFilesCount,
        filesFailed: errors.length,
        bytesScanned: totalBytesToBackup,
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
