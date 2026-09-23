import { FilesystemProvider, FileMetadata, BackupManifest, ManifestFileEntry } from '../core/contracts.js';
import { ChangeSet, ChangeItem, ChangeOperationType } from '../core/change-set.js';
import { BackupSource } from '../core/domain.js';
import { CancellationToken } from '../core/errors.js';
import * as path from 'node:path';

export interface ChangeDetectorOptions {
  detectRenames?: boolean;
  verifyContentHashOnSuspect?: boolean;
}

export class ChangeDetector {
  constructor(
    private readonly filesystem: FilesystemProvider,
    private readonly options: ChangeDetectorOptions = { detectRenames: true, verifyContentHashOnSuspect: true }
  ) {}

  public isPathExcluded(relativePath: string, source: BackupSource): boolean {
    const norm = relativePath.replace(/\\/g, '/');

    if (source.excludePatterns && source.excludePatterns.length > 0) {
      for (const pattern of source.excludePatterns) {
        if (this.matchGlob(norm, pattern)) {
          return true;
        }
      }
    }

    if (source.includePatterns && source.includePatterns.length > 0) {
      let matched = false;
      for (const pattern of source.includePatterns) {
        if (this.matchGlob(norm, pattern)) {
          matched = true;
          break;
        }
      }
      if (!matched) return true;
    }

    return false;
  }

  private matchGlob(targetPath: string, pattern: string): boolean {
    const cleanPattern = pattern.replace(/\\/g, '/');
    if (cleanPattern === '*' || cleanPattern === '**/*') return true;
    
    if (cleanPattern.startsWith('*.')) {
      const ext = cleanPattern.slice(1);
      return targetPath.endsWith(ext);
    }
    if (cleanPattern.endsWith('/*')) {
      const dirPrefix = cleanPattern.slice(0, -2);
      return targetPath.startsWith(dirPrefix + '/') || targetPath === dirPrefix;
    }
    return targetPath === cleanPattern || targetPath.includes(cleanPattern);
  }

  public async detectChanges(params: {
    source: BackupSource;
    baseManifest?: BackupManifest | null;
    cancellationToken?: CancellationToken;
    onProgress?: (scanned: number, currentPath: string) => void;
  }): Promise<ChangeSet> {
    const { source, baseManifest, cancellationToken, onProgress } = params;

    const baseFilesMap = new Map<string, ManifestFileEntry>();
    if (baseManifest && baseManifest.files) {
      for (const f of baseManifest.files) {
        // Ignora entradas de DELETE no manifesto base se houverem
        if (f.operation !== 'DELETE') {
          baseFilesMap.set(f.path, f);
        }
      }
    }

    const currentFiles = new Map<string, { fullPath: string; meta: FileMetadata }>();
    let totalScanned = 0;

    // 1. Varre todas as origens configuradas
    for (const srcPath of source.paths) {
      cancellationToken?.throwIfCancelled();
      try {
        const rootMeta = await this.filesystem.getFileMetadata(srcPath);
        if (!rootMeta.isDirectory) {
          const rel = path.basename(rootMeta.path);
          totalScanned++;
          onProgress?.(totalScanned, rel);
          if (!this.isPathExcluded(rel, source)) {
            currentFiles.set(rel, { fullPath: rootMeta.path, meta: rootMeta });
          }
        } else {
          for await (const meta of this.filesystem.scanDirectory(srcPath, { followSymlinks: source.followSymlinks })) {
            cancellationToken?.throwIfCancelled();
            if (!meta.isDirectory) {
              const rel = path.relative(srcPath, meta.path).replace(/\\/g, '/');
              totalScanned++;
              if (totalScanned % 20 === 0) {
                onProgress?.(totalScanned, rel);
              }
              if (!this.isPathExcluded(rel, source)) {
                currentFiles.set(rel, { fullPath: meta.path, meta });
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[ChangeDetector] Aviso ao varrer origem "${srcPath}":`, err);
      }
    }

    const added: ChangeItem[] = [];
    const modified: ChangeItem[] = [];
    const deleted: ChangeItem[] = [];
    const renamed: ChangeItem[] = [];
    let unchangedCount = 0;
    let totalBytesToTransfer = 0;

    const processedCurrentKeys = new Set<string>();

    // 2. Identifica ADD, MODIFY, RENAME e UNCHANGED
    for (const [relPath, { fullPath, meta }] of currentFiles.entries()) {
      cancellationToken?.throwIfCancelled();
      processedCurrentKeys.add(relPath);

      const baseEntry = baseFilesMap.get(relPath);

      if (!baseEntry) {
        let renameMatched = false;

        if (this.options.detectRenames && baseManifest && baseManifest.files) {
          for (const candidateBase of baseManifest.files) {
            if (candidateBase.operation === 'DELETE') continue;
            // Se o arquivo base não existe mais no filesystem atual e tem tamanho compatível
            if (!currentFiles.has(candidateBase.path) && candidateBase.sizeBytes === meta.sizeBytes) {
              let currentHash = meta.identity?.checksumSha256;
              if (!currentHash) {
                currentHash = await this.filesystem.calculateHash(fullPath);
              }

              if (currentHash === candidateBase.sha256) {
                renamed.push({
                  operation: ChangeOperationType.RENAME,
                  path: relPath,
                  fullSourcePath: fullPath,
                  previousPath: candidateBase.path,
                  sizeBytes: meta.sizeBytes,
                  modifiedAtMs: meta.modifiedAtMs,
                  fileIdentity: meta.identity,
                  sha256: currentHash,
                  previousSha256: candidateBase.sha256
                });
                renameMatched = true;
                totalBytesToTransfer += meta.sizeBytes;
                break;
              }
            }
          }
        }

        if (!renameMatched) {
          added.push({
            operation: ChangeOperationType.ADD,
            path: relPath,
            fullSourcePath: fullPath,
            sizeBytes: meta.sizeBytes,
            modifiedAtMs: meta.modifiedAtMs,
            fileIdentity: meta.identity
          });
          totalBytesToTransfer += meta.sizeBytes;
        }
      } else {
        const sizeChanged = baseEntry.sizeBytes !== meta.sizeBytes;
        const mtimeChanged = Math.abs(baseEntry.modifiedAtMs - meta.modifiedAtMs) > 1000;

        if (sizeChanged || mtimeChanged) {
          modified.push({
            operation: ChangeOperationType.MODIFY,
            path: relPath,
            fullSourcePath: fullPath,
            sizeBytes: meta.sizeBytes,
            modifiedAtMs: meta.modifiedAtMs,
            fileIdentity: meta.identity,
            previousSha256: baseEntry.sha256
          });
          totalBytesToTransfer += meta.sizeBytes;
        } else {
          unchangedCount++;
        }
      }
    }

    // 3. Identifica DELETE
    if (baseManifest && baseManifest.files) {
      for (const baseEntry of baseManifest.files) {
        if (baseEntry.operation === 'DELETE') continue;
        if (!processedCurrentKeys.has(baseEntry.path)) {
          const isRenamed = renamed.some((r) => r.previousPath === baseEntry.path);
          if (isRenamed) {
            continue;
          }

          const isFilterExcluded = this.isPathExcluded(baseEntry.path, source);
          if (isFilterExcluded) {
            continue;
          }

          deleted.push({
            operation: ChangeOperationType.DELETE,
            path: baseEntry.path,
            sizeBytes: baseEntry.sizeBytes,
            modifiedAtMs: baseEntry.modifiedAtMs,
            previousSha256: baseEntry.sha256
          });
        }
      }
    }

    return {
      baseExecutionId: baseManifest?.executionId,
      baseJobType: baseManifest?.jobType,
      totalScanned,
      added,
      modified,
      deleted,
      renamed,
      unchangedCount,
      totalBytesToTransfer
    };
  }
}
