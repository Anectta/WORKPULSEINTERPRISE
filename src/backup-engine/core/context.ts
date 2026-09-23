import {
  StorageProvider,
  FilesystemProvider,
  BackupCatalog,
  VerificationEngine,
  EventBus,
  SecretStore,
  PlatformProvider,
  BackupManifest,
  BackupStrategy
} from './contracts.js';
import { UUID, BackupExecution, BackupJob } from './domain.js';
import { EngineError, ErrorCategory } from './errors.js';
import * as crypto from 'node:crypto';

export interface EngineConfiguration {
  maxConcurrentFiles: number;
  streamingChunkSizeBytes: number;
  defaultTempDir: string;
  enableTelemetry: boolean;
}

export class EngineContext {
  constructor(
    public readonly config: EngineConfiguration,
    public readonly storageProviders: Map<string, StorageProvider>,
    public readonly filesystem: FilesystemProvider,
    public readonly catalog: BackupCatalog,
    public readonly verification: VerificationEngine,
    public readonly eventBus: EventBus,
    public readonly secretStore: SecretStore,
    public readonly platform: PlatformProvider,
    public readonly strategies: Map<string, BackupStrategy>
  ) {}
}

export class InMemoryBackupCatalog implements BackupCatalog {
  private readonly manifests = new Map<UUID, BackupManifest>();
  private readonly executions = new Map<UUID, BackupExecution[]>();

  public async saveManifest(manifest: BackupManifest): Promise<void> {
    this.manifests.set(manifest.executionId, manifest);
  }

  public async getManifest(executionId: UUID): Promise<BackupManifest | null> {
    return this.manifests.get(executionId) ?? null;
  }

  public async registerExecution(execution: BackupExecution): Promise<void> {
    const list = this.executions.get(execution.jobId) || [];
    list.push(execution);
    this.executions.set(execution.jobId, list);
  }

  public async listExecutions(jobId: UUID): Promise<BackupExecution[]> {
    return this.executions.get(jobId) || [];
  }

  public async findLatestSuccessfulExecution(jobId: UUID, type?: string): Promise<BackupExecution | null> {
    const list = this.executions.get(jobId) || [];
    const filtered = list.filter((e) => e.status === 'COMPLETED' && (!type || e.executionType === type));
    if (filtered.length === 0) return null;
    return filtered.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  }

  public async getLatestValidFullExecution(jobId: UUID): Promise<BackupExecution | null> {
    return this.findLatestSuccessfulExecution(jobId, 'FULL');
  }

  public async getLatestValidExecutionInChain(jobId: UUID, baseFullExecutionId?: UUID): Promise<BackupExecution | null> {
    const list = this.executions.get(jobId) || [];
    const validExecutions = list.filter((e) => e.status === 'COMPLETED');
    if (validExecutions.length === 0) return null;

    if (!baseFullExecutionId) {
      // Retorna a mais recente válida geral do job
      return validExecutions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
    }

    // Filtra execuções que pertencem à cadeia do baseFullExecutionId
    const chainExecs: BackupExecution[] = [];
    for (const exec of validExecutions) {
      if (exec.executionId === baseFullExecutionId) {
        chainExecs.push(exec);
      } else {
        const manifest = this.manifests.get(exec.executionId);
        if (manifest && manifest.baseFullExecutionId === baseFullExecutionId) {
          chainExecs.push(exec);
        }
      }
    }

    if (chainExecs.length === 0) return null;
    return chainExecs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  }

  public async getChainExecutions(jobId: UUID, baseFullExecutionId: UUID): Promise<BackupExecution[]> {
    const list = this.executions.get(jobId) || [];
    const result: BackupExecution[] = [];
    for (const exec of list) {
      if (exec.executionId === baseFullExecutionId) {
        result.push(exec);
      } else {
        const manifest = this.manifests.get(exec.executionId);
        if (manifest && manifest.baseFullExecutionId === baseFullExecutionId) {
          result.push(exec);
        }
      }
    }
    return result.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  }

  public async consolidateEffectiveManifest(jobId: UUID, targetExecutionId: UUID): Promise<BackupManifest | null> {
    const targetManifest = this.manifests.get(targetExecutionId);
    if (!targetManifest) return null;

    if (!targetManifest.baseFullExecutionId || targetManifest.executionId === targetManifest.baseFullExecutionId) {
      return targetManifest;
    }

    // Replay da cadeia desde o Full Base até targetExecutionId
    const chainExecutions = await this.getChainExecutions(jobId, targetManifest.baseFullExecutionId);
    const effectiveFiles = new Map<string, any>();

    for (const exec of chainExecutions) {
      const m = this.manifests.get(exec.executionId);
      if (!m) continue;

      // 1. Processa arquivos do manifesto
      for (const f of m.files) {
        if (f.operation === 'DELETE') {
          effectiveFiles.delete(f.path);
        } else if (f.operation === 'RENAME') {
          if (f.previousPath) {
            effectiveFiles.delete(f.previousPath);
          }
          effectiveFiles.set(f.path, f);
        } else {
          effectiveFiles.set(f.path, f);
        }
      }

      // 2. Processa deletedFiles explicitados
      if (m.deletedFiles) {
        for (const d of m.deletedFiles) {
          effectiveFiles.delete(d);
        }
      }

      if (exec.executionId === targetExecutionId) {
        break; // Atingiu o ponto alvo
      }
    }

    const filesArray = Array.from(effectiveFiles.values());
    const totalSizeBytes = filesArray.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);

    return {
      manifestVersion: '2.0.0',
      executionId: targetManifest.executionId,
      jobId: targetManifest.jobId,
      jobType: targetManifest.jobType,
      createdAt: targetManifest.createdAt,
      chainId: targetManifest.chainId,
      baseFullExecutionId: targetManifest.baseFullExecutionId,
      parentExecutionId: targetManifest.parentExecutionId,
      sequence: targetManifest.sequence,
      totalFiles: filesArray.length,
      totalSizeBytes,
      files: filesArray
    };
  }

  public async removeExecution(jobId: UUID, executionId: UUID): Promise<void> {
    const list = this.executions.get(jobId) || [];
    const filtered = list.filter(e => e.executionId !== executionId);
    this.executions.set(jobId, filtered);
    this.manifests.delete(executionId);
  }

  public async searchFiles(query: import('./contracts.js').CatalogSearchQuery): Promise<import('./contracts.js').BackupFileVersion[]> {
    const results: import('./contracts.js').BackupFileVersion[] = [];

    for (const [jobId, execList] of this.executions.entries()) {
      if (query.jobId && query.jobId !== jobId) continue;

      for (const exec of execList) {
        if (query.executionType && exec.executionType !== query.executionType) continue;
        if (query.fromDate && new Date(exec.startedAt) < new Date(query.fromDate)) continue;
        if (query.toDate && new Date(exec.startedAt) > new Date(query.toDate)) continue;

        const manifest = this.manifests.get(exec.executionId);
        if (!manifest) continue;

        for (const file of manifest.files) {
          if (file.operation === 'DELETE') continue;

          if (query.sha256 && file.sha256 !== query.sha256) continue;
          if (query.extension && !file.path.endsWith(query.extension)) continue;
          if (query.pathPattern) {
            const pattern = query.pathPattern.toLowerCase();
            if (!file.path.toLowerCase().includes(pattern)) continue;
          }

          results.push({
            executionId: exec.executionId,
            jobId,
            path: file.path,
            sizeBytes: file.sizeBytes,
            modifiedAtMs: file.modifiedAtMs,
            sha256: file.sha256,
            backupDate: exec.startedAt,
            isEncrypted: Boolean(file.isEncrypted)
          });
        }
      }
    }

    return results;
  }

  public async getFileVersions(jobId: UUID, relativePath: string): Promise<import('./contracts.js').BackupFileVersion[]> {
    const cleanTarget = relativePath.replace(/\\/g, '/');
    const all = await this.searchFiles({ jobId });
    return all.filter(f => f.path.replace(/\\/g, '/') === cleanTarget);
  }
}

export class DefaultVerificationEngine implements VerificationEngine {
  public async verifyFileIntegrity(
    storage: StorageProvider,
    remotePath: string,
    expectedSha256: string,
    expectedSize: number
  ): Promise<boolean> {
    const meta = await storage.getMetadata(remotePath);
    if (!meta) return false;
    if (meta.sizeBytes !== expectedSize) return false;

    const stream = await storage.getStream(remotePath);
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => {
        const calculated = hash.digest('hex');
        resolve(calculated === expectedSha256);
      });
      stream.on('error', (err) => reject(err));
    });
  }

  public async verifyManifest(manifest: BackupManifest): Promise<boolean> {
    if (!manifest.files || !Array.isArray(manifest.files)) return false;
    if (manifest.files.length !== manifest.totalFiles) return false;
    const computedTotalBytes = manifest.files.reduce((acc, f) => acc + f.sizeBytes, 0);
    return computedTotalBytes === manifest.totalSizeBytes;
  }
}

export class DefaultPlatformProvider implements PlatformProvider {
  public getPlatformName(): 'WINDOWS' | 'LINUX' | 'MACOS' {
    if (process.platform === 'win32') return 'WINDOWS';
    if (process.platform === 'darwin') return 'MACOS';
    return 'LINUX';
  }

  public async getFileIdentity(filePath: string): Promise<{ uniqueIdentifier: string }> {
    return {
      uniqueIdentifier: `${process.platform}-${filePath}`
    };
  }

  public async createSnapshotIfSupported(_volumeRoot: string): Promise<{ snapshotPath: string; release: () => Promise<void> } | null> {
    // VSS / LVM snapshots serão implementados na etapa de Platform & OS
    return null;
  }
}
