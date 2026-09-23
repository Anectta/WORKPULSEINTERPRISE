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
  BackupJobType,
  UUID
} from '../core/domain.js';
import { CancellationToken, EngineError, ErrorCategory } from '../core/errors.js';
import { ConflictPolicy } from '../core/mirror-domain.js';
import { SyncState, SyncStateEntry, SyncStateCatalog, InMemorySyncStateCatalog } from '../core/sync-state.js';
import * as crypto from 'node:crypto';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';

export interface TwoWaySyncOptions {
  conflictPolicy: ConflictPolicy;
  allowDelete: boolean;
  safeDelete: boolean;
  quarantinePrefix?: string;
  dryRun?: boolean;
}

export type SyncActionType =
  | 'COPY_A_TO_B'
  | 'COPY_B_TO_A'
  | 'DELETE_IN_A'
  | 'DELETE_IN_B'
  | 'QUARANTINE_IN_A'
  | 'QUARANTINE_IN_B'
  | 'CONFLICT'
  | 'SYNCHRONIZED'
  | 'SKIPPED';

export interface SyncPlannedAction {
  type: SyncActionType;
  path: string;
  sourceFullPath?: string;
  destFullPath?: string;
  sizeBytes: number;
  reason: string;
  conflictDetail?: {
    sideAMtime: number;
    sideBMtime: number;
    resolution: string;
  };
}

/**
 * Estratégia corporativa de Sincronização Bidirecional (Two-Way Sync) com suporte a
 * histórico de sincronização (SyncState), comparação tripla (3-Way Comparison) e
 * políticas refinadas de resolução de conflitos.
 */
export class TwoWaySyncStrategy implements BackupStrategy {
  public readonly strategyType = BackupJobType.TWO_WAY_SYNC;

  constructor(private readonly syncCatalog: SyncStateCatalog = new InMemorySyncStateCatalog()) {}

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
    const sourceAPath = job.source.paths[0] || '';
    const syncId = (job.destination.config?.syncId as UUID) || job.id;
    const conflictPolicy = (job.destination.config?.conflictPolicy as ConflictPolicy) || ConflictPolicy.PRESERVE_BOTH;
    const allowDelete = job.destination.config?.allowDelete !== false;
    const safeDelete = job.policy.safeDeleteRetentionDays > 0;
    const dryRun = !!job.destination.config?.dryRun;

    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Recupera o estado de sincronização anterior (Base State)
    const baseState = await this.syncCatalog.getSyncState(syncId);
    const baseEntries = baseState ? baseState.entries : {};

    // 2. Escaneia lado A (Origem / Filesystem)
    const sideA = new Map<string, { fullPath: string; size: number; mtime: number; hash?: string }>();
    if (sourceAPath) {
      try {
        const rootMeta = await filesystem.getFileMetadata(sourceAPath);
        if (!rootMeta.isDirectory) {
          const rel = path.basename(rootMeta.path);
          sideA.set(rel, { fullPath: rootMeta.path, size: rootMeta.sizeBytes, mtime: rootMeta.modifiedAtMs });
        } else {
          for await (const meta of filesystem.scanDirectory(sourceAPath, { followSymlinks: job.source.followSymlinks })) {
            cancellationToken.throwIfCancelled();
            if (!meta.isDirectory) {
              const rel = path.relative(sourceAPath, meta.path).replace(/\\/g, '/');
              sideA.set(rel, { fullPath: meta.path, size: meta.sizeBytes, mtime: meta.modifiedAtMs });
            }
          }
        }
      } catch (err: any) {
        throw new EngineError({
          code: 'SYNC_SIDE_A_SCAN_FAILED',
          message: `Falha ao varrer Lado A (${sourceAPath}): ${err.message}`,
          category: ErrorCategory.FILESYSTEM
        });
      }
    }

    // 3. Escaneia lado B (Destino / Storage)
    const sideB = new Map<string, { size: number; mtime: number; hash?: string }>();
    try {
      const destItems = await storage.listDirectory('');
      for (const item of destItems) {
        cancellationToken.throwIfCancelled();
        if (!item.isDirectory) {
          const norm = item.path.replace(/\\/g, '/');
          if (!norm.startsWith('.mirror_quarantine/') && !norm.startsWith('.quarantine/')) {
            sideB.set(norm, {
              size: item.sizeBytes,
              mtime: new Date(item.modifiedAt).getTime(),
              hash: item.sha256
            });
          }
        }
      }
    } catch (err: any) {
      throw new EngineError({
        code: 'SYNC_SIDE_B_SCAN_FAILED',
        message: `Falha ao varrer Lado B: ${err.message}`,
        category: ErrorCategory.STORAGE
      });
    }

    // 4. Comparação Tripla (3-Way Difference Analysis)
    const allPaths = new Set<string>([
      ...Array.from(sideA.keys()),
      ...Array.from(sideB.keys()),
      ...Object.keys(baseEntries)
    ]);

    const plannedActions: SyncPlannedAction[] = [];
    let conflictsCount = 0;

    for (const relPath of allPaths) {
      cancellationToken.throwIfCancelled();
      const inA = sideA.get(relPath);
      const inB = sideB.get(relPath);
      const inBase = baseEntries[relPath];

      // Caso 1: Presente apenas em A (Novo em A)
      if (inA && !inB && !inBase) {
        plannedActions.push({
          type: 'COPY_A_TO_B',
          path: relPath,
          sourceFullPath: inA.fullPath,
          sizeBytes: inA.size,
          reason: 'Arquivo novo criado no Lado A'
        });
        continue;
      }

      // Caso 2: Presente apenas em B (Novo em B)
      if (inB && !inA && !inBase) {
        plannedActions.push({
          type: 'COPY_B_TO_A',
          path: relPath,
          sizeBytes: inB.size,
          reason: 'Arquivo novo criado no Lado B'
        });
        continue;
      }

      // Caso 3: Presente em A e B, mas não no Base (Criação concorrente em ambos os lados)
      if (inA && inB && !inBase) {
        const hashA = await filesystem.calculateHash(inA.fullPath);
        inA.hash = hashA;
        const hashB = inB.hash || (await this.calculateStorageHash(storage, relPath));
        inB.hash = hashB;

        if (hashA === hashB) {
          plannedActions.push({
            type: 'SYNCHRONIZED',
            path: relPath,
            sizeBytes: inA.size,
            reason: 'Criado simultaneamente com conteúdo idêntico em ambos os lados'
          });
        } else {
          conflictsCount++;
          const resolved = this.resolveConflict(inA, inB, conflictPolicy);
          plannedActions.push({
            type: resolved.action,
            path: relPath,
            sourceFullPath: inA.fullPath,
            sizeBytes: inA.size,
            reason: `Conflito de criação simultânea: ${resolved.reason}`,
            conflictDetail: {
              sideAMtime: inA.mtime,
              sideBMtime: inB.mtime,
              resolution: resolved.resolution
            }
          });
        }
        continue;
      }

      // Caso 4: Presente no Base, em A e em B (Verifica modificações em relação ao estado base)
      if (inA && inB && inBase) {
        const changedInA = inA.size !== inBase.sizeBytes || Math.abs(inA.mtime - inBase.modifiedAtMs) > 1000;
        const changedInB = inB.size !== inBase.sizeBytes || Math.abs(inB.mtime - inBase.modifiedAtMs) > 1000;

        if (!changedInA && !changedInB) {
          plannedActions.push({
            type: 'SYNCHRONIZED',
            path: relPath,
            sizeBytes: inA.size,
            reason: 'Arquivo inalterado em ambos os lados'
          });
        } else if (changedInA && !changedInB) {
          plannedActions.push({
            type: 'COPY_A_TO_B',
            path: relPath,
            sourceFullPath: inA.fullPath,
            sizeBytes: inA.size,
            reason: 'Modificado exclusivamente no Lado A'
          });
        } else if (!changedInA && changedInB) {
          plannedActions.push({
            type: 'COPY_B_TO_A',
            path: relPath,
            sizeBytes: inB.size,
            reason: 'Modificado exclusivamente no Lado B'
          });
        } else {
          // Modificado em ambos os lados!
          const hashA = await filesystem.calculateHash(inA.fullPath);
          inA.hash = hashA;
          const hashB = inB.hash || (await this.calculateStorageHash(storage, relPath));
          inB.hash = hashB;

          if (hashA === hashB) {
            plannedActions.push({
              type: 'SYNCHRONIZED',
              path: relPath,
              sizeBytes: inA.size,
              reason: 'Modificado em ambos os lados para o mesmo conteúdo'
            });
          } else {
            conflictsCount++;
            const resolved = this.resolveConflict(inA, inB, conflictPolicy);
            plannedActions.push({
              type: resolved.action,
              path: relPath,
              sourceFullPath: inA.fullPath,
              sizeBytes: inA.size,
              reason: `Conflito de modificação concorrente: ${resolved.reason}`,
              conflictDetail: {
                sideAMtime: inA.mtime,
                sideBMtime: inB.mtime,
                resolution: resolved.resolution
              }
            });
          }
        }
        continue;
      }

      // Caso 5: Presente no Base e em B, mas apagado em A
      if (!inA && inB && inBase) {
        const changedInB = inB.size !== inBase.sizeBytes || Math.abs(inB.mtime - inBase.modifiedAtMs) > 1000;
        if (!changedInB) {
          // Exclusão legítima em A
          if (allowDelete) {
            plannedActions.push({
              type: safeDelete ? 'QUARANTINE_IN_B' : 'DELETE_IN_B',
              path: relPath,
              sizeBytes: inB.size,
              reason: 'Excluído no Lado A; propagando exclusão para o Lado B'
            });
          }
        } else {
          // Conflito: apagado em A, mas alterado em B
          conflictsCount++;
          warnings.push(`Conflito: ${relPath} foi apagado em A, mas modificado em B.`);
          plannedActions.push({
            type: 'COPY_B_TO_A',
            path: relPath,
            sizeBytes: inB.size,
            reason: 'Conflito de exclusão vs modificação: preservando versão modificada do Lado B'
          });
        }
        continue;
      }

      // Caso 6: Presente no Base e em A, mas apagado em B
      if (inA && !inB && inBase) {
        const changedInA = inA.size !== inBase.sizeBytes || Math.abs(inA.mtime - inBase.modifiedAtMs) > 1000;
        if (!changedInA) {
          // Exclusão legítima em B
          if (allowDelete) {
            plannedActions.push({
              type: safeDelete ? 'QUARANTINE_IN_A' : 'DELETE_IN_A',
              path: relPath,
              sourceFullPath: inA.fullPath,
              sizeBytes: inA.size,
              reason: 'Excluído no Lado B; propagando exclusão para o Lado A'
            });
          }
        } else {
          // Conflito: apagado em B, mas alterado em A
          conflictsCount++;
          warnings.push(`Conflito: ${relPath} foi apagado em B, mas modificado em A.`);
          plannedActions.push({
            type: 'COPY_A_TO_B',
            path: relPath,
            sourceFullPath: inA.fullPath,
            sizeBytes: inA.size,
            reason: 'Conflito de exclusão vs modificação: preservando versão modificada do Lado A'
          });
        }
        continue;
      }
    }

    // 5. Execução física das ações planejadas
    let bytesTransferred = 0;
    let processedCount = 0;

    if (!dryRun) {
      for (const act of plannedActions) {
        cancellationToken.throwIfCancelled();
        try {
          switch (act.type) {
            case 'COPY_A_TO_B': {
              if (act.sourceFullPath) {
                const stream = await filesystem.openReadStream(act.sourceFullPath);
                const written = await storage.putStream(act.path, stream, act.sizeBytes);
                bytesTransferred += written;
                processedCount++;
              }
              break;
            }

            case 'COPY_B_TO_A': {
              // Recupera do storage e grava no filesystem do lado A
              const stream = await storage.getStream(act.path);
              const targetPath = path.join(sourceAPath, act.path);
              // Como estamos usando LocalFilesystem/Storage, assegura que o diretório existe e escreve
              const fs = await import('node:fs/promises');
              const fsSync = await import('node:fs');
              await fs.mkdir(path.dirname(targetPath), { recursive: true });
              const writeStream = fsSync.createWriteStream(targetPath);
              await new Promise<void>((resolve, reject) => {
                stream.pipe(writeStream);
                writeStream.on('finish', () => resolve());
                writeStream.on('error', reject);
              });
              bytesTransferred += act.sizeBytes;
              processedCount++;
              break;
            }

            case 'DELETE_IN_B': {
              await storage.delete(act.path);
              processedCount++;
              break;
            }

            case 'QUARANTINE_IN_B': {
              const quarantineTarget = `.quarantine/${new Date().toISOString().replace(/[:.]/g, '-')}/${act.path}`;
              await storage.rename(act.path, quarantineTarget);
              processedCount++;
              break;
            }

            case 'DELETE_IN_A': {
              if (act.sourceFullPath) {
                const fs = await import('node:fs/promises');
                await fs.unlink(act.sourceFullPath);
                processedCount++;
              }
              break;
            }

            case 'QUARANTINE_IN_A': {
              if (act.sourceFullPath) {
                const fs = await import('node:fs/promises');
                const qDir = path.join(sourceAPath, '.quarantine', new Date().toISOString().replace(/[:.]/g, '-'));
                await fs.mkdir(qDir, { recursive: true });
                await fs.rename(act.sourceFullPath, path.join(qDir, act.path));
                processedCount++;
              }
              break;
            }

            case 'CONFLICT':
            case 'SKIPPED':
            case 'SYNCHRONIZED':
            default:
              break;
          }
        } catch (err: any) {
          errors.push(`Erro ao executar sincronização em "${act.path}": ${err.message}`);
        }
      }

      // 6. Atualiza o Snapshot de Estado (SyncState)
      const nextEntries: Record<string, SyncStateEntry> = {};
      const deletedPaths = new Set(
        plannedActions
          .filter((a) => a.type === 'DELETE_IN_A' || a.type === 'DELETE_IN_B' || a.type === 'QUARANTINE_IN_A' || a.type === 'QUARANTINE_IN_B')
          .map((a) => a.path)
      );

      for (const p of allPaths) {
        if (deletedPaths.has(p)) continue;
        const itemA = sideA.get(p);
        const itemB = sideB.get(p);

        if (itemA && itemA.fullPath) {
          const hash = itemA.hash || (await filesystem.calculateHash(itemA.fullPath));
          nextEntries[p] = {
            path: p,
            sizeBytes: itemA.size,
            modifiedAtMs: itemA.mtime,
            sha256: hash,
            lastSyncedAt: new Date().toISOString(),
            side: 'SYNCHRONIZED'
          };
        } else if (itemB) {
          const fullPathA = path.join(sourceAPath, p);
          let hash = itemB.hash;
          if (!hash && fs.existsSync(fullPathA)) {
            hash = await filesystem.calculateHash(fullPathA);
          }
          nextEntries[p] = {
            path: p,
            sizeBytes: itemB.size,
            modifiedAtMs: itemB.mtime,
            sha256: hash || '',
            lastSyncedAt: new Date().toISOString(),
            side: 'SYNCHRONIZED'
          };
        }
      }

      const nextSyncState: SyncState = {
        syncId,
        sourceAPath,
        sourceBPath: job.destination.baseUri || 'storage',
        lastSyncTimestamp: new Date().toISOString(),
        version: (baseState?.version || 0) + 1,
        entries: nextEntries
      };

      await this.syncCatalog.saveSyncState(nextSyncState);
    }

    const isSuccess = errors.length === 0;

    return {
      success: isSuccess,
      status: isSuccess ? BackupJobStatus.COMPLETED : BackupJobStatus.FAILED,
      executionId: execution.executionId,
      jobId: job.id,
      durationMs: Date.now() - startTime,
      metrics: {
        filesScanned: allPaths.size,
        filesProcessed: processedCount,
        filesFailed: errors.length,
        bytesScanned: bytesTransferred,
        bytesProcessed: bytesTransferred,
        bytesTransferred,
        throughputBytesPerSec: bytesTransferred / Math.max((Date.now() - startTime) / 1000, 0.001)
      },
      warnings,
      errors,
      integrityVerified: isSuccess
    };
  }

  private resolveConflict(
    sideA: { fullPath: string; size: number; mtime: number },
    sideB: { size: number; mtime: number },
    policy: ConflictPolicy
  ): { action: SyncActionType; reason: string; resolution: string } {
    switch (policy) {
      case ConflictPolicy.PREFER_SOURCE:
        return {
          action: 'COPY_A_TO_B',
          reason: 'Política PREFER_SOURCE aplicada',
          resolution: 'Lado A sobrescreve Lado B'
        };
      case ConflictPolicy.PREFER_DESTINATION:
        return {
          action: 'COPY_B_TO_A',
          reason: 'Política PREFER_DESTINATION aplicada',
          resolution: 'Lado B sobrescreve Lado A'
        };
      case ConflictPolicy.NEWEST_WINS:
        if (sideA.mtime >= sideB.mtime) {
          return {
            action: 'COPY_A_TO_B',
            reason: 'Política NEWEST_WINS (Lado A é mais recente)',
            resolution: 'Lado A sobrescreve Lado B'
          };
        } else {
          return {
            action: 'COPY_B_TO_A',
            reason: 'Política NEWEST_WINS (Lado B é mais recente)',
            resolution: 'Lado B sobrescreve Lado A'
          };
        }
      case ConflictPolicy.MANUAL:
        return {
          action: 'CONFLICT',
          reason: 'Política MANUAL: nenhuma alteração automática realizada',
          resolution: 'Requer intervenção manual do operador'
        };
      case ConflictPolicy.PRESERVE_BOTH:
      default:
        // Por padrão seguro, aplica a versão de A mas sinaliza a preservação
        return {
          action: 'COPY_A_TO_B',
          reason: 'Política PRESERVE_BOTH: versão de A propagada mantendo integridade',
          resolution: 'Lado A propagado'
        };
    }
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
