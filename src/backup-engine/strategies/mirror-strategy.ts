import {
  BackupStrategy,
  StorageProvider,
  FilesystemProvider,
  BackupCatalog,
  ProgressReporter,
  BackupManifest
} from '../core/contracts.js';
import {
  BackupJob,
  BackupExecution,
  BackupResult,
  BackupJobStatus,
  BackupJobType
} from '../core/domain.js';
import { CancellationToken } from '../core/errors.js';
import { MirrorExecutor } from '../core/mirror-executor.js';
import { MirrorPolicy } from '../core/mirror-domain.js';
import * as crypto from 'node:crypto';

/**
 * Estratégia de Espelhamento Unidirecional (Mirror) integrada ao catálogo e barramento do engine
 */
export class MirrorStrategy implements BackupStrategy {
  public readonly strategyType = BackupJobType.MIRROR;
  private readonly mirrorExecutor: MirrorExecutor;

  constructor() {
    this.mirrorExecutor = new MirrorExecutor();
  }

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

    // Extrai a política de mirror configurada no job (se houver no destination.config ou policy)
    const rawPolicy = (job.destination.config?.mirrorPolicy || {}) as Partial<MirrorPolicy>;
    const mirrorPolicy: Partial<MirrorPolicy> = {
      ...rawPolicy,
      safeDelete: job.policy?.safeDeleteRetentionDays > 0,
      verifyChecksumAfterWrite: job.policy?.verifyChecksumAfterWrite ?? true
    };

    const mirrorResult = await this.mirrorExecutor.execute({
      job,
      policy: mirrorPolicy,
      filesystem,
      storage,
      catalog,
      progress,
      cancellationToken,
      executionId: execution.executionId
    });

    // Registra manifesto simplificado do estado espelhado no catálogo
    const manifestEntries = mirrorResult.plan.operations
      .filter((op) => op.operation === 'CREATE' || op.operation === 'UPDATE' || op.operation === 'UNCHANGED')
      .map((op) => ({
        path: op.path,
        sizeBytes: op.sizeBytes,
        modifiedAtMs: op.modifiedAtMs || Date.now(),
        sha256: op.sourceSha256 || '',
        compressedSizeBytes: op.sizeBytes,
        isEncrypted: false,
        operation: op.operation as any
      }));

    const manifest: BackupManifest = {
      manifestVersion: '2.0.0',
      executionId: execution.executionId,
      jobId: job.id,
      jobType: this.strategyType,
      createdAt: new Date().toISOString(),
      chainId: execution.executionId,
      totalFiles: manifestEntries.length,
      totalSizeBytes: mirrorResult.applied.bytesTransferred,
      files: manifestEntries
    };

    const manifestJson = JSON.stringify(manifest, null, 2);
    const manifestHash = crypto.createHash('sha256').update(manifestJson).digest('hex');
    manifest.manifestSha256 = manifestHash;
    await catalog.saveManifest(manifest);

    return {
      success: mirrorResult.success,
      status: mirrorResult.status,
      executionId: execution.executionId,
      jobId: job.id,
      durationMs: Date.now() - startTime,
      metrics: {
        filesScanned: mirrorResult.plan.summary.totalSourceFiles + mirrorResult.plan.summary.totalDestFiles,
        filesProcessed: mirrorResult.applied.created + mirrorResult.applied.updated + mirrorResult.applied.deleted + mirrorResult.applied.quarantined,
        filesFailed: mirrorResult.errors.length,
        bytesScanned: mirrorResult.plan.summary.totalBytesToTransfer,
        bytesProcessed: mirrorResult.applied.bytesTransferred,
        bytesTransferred: mirrorResult.applied.bytesTransferred,
        throughputBytesPerSec:
          mirrorResult.applied.bytesTransferred / Math.max((Date.now() - startTime) / 1000, 0.001)
      },
      manifestHash,
      warnings: mirrorResult.warnings,
      errors: mirrorResult.errors,
      integrityVerified: mirrorResult.integrityVerified
    };
  }
}
