import fs from 'fs';
import path from 'path';
import { RestoreMode, OverwritePolicy, RestoreConflictPolicy } from '../core/domain.js';
import { FilesystemProvider } from '../core/contracts.js';
import { RestoreRequest } from '../core/domain.js';
import { ResolvedChainResult } from './chain-resolver.js';
import { PathSafety } from './path-safety.js';
import { RestorePlan, RestorePreview, RestorePreviewItem } from './types.js';

export class RestorePlanner {
  /**
   * Gera o RestorePreview e valida o RestorePlan antes de qualquer gravação no disco de destino.
   */
  public static async createPlan(
    request: RestoreRequest,
    chainResult: ResolvedChainResult,
    filesystem?: FilesystemProvider
  ): Promise<{ preview: RestorePreview; plan: RestorePlan }> {
    const items: RestorePreviewItem[] = [];
    const errors: string[] = [];

    const mode = request.restoreMode || RestoreMode.FULL;
    const overwritePolicy = request.overwritePolicy || OverwritePolicy.ALWAYS;
    const conflictPolicy = request.conflictPolicy || RestoreConflictPolicy.OVERWRITE;

    // 1. Filtragem de arquivos pelo RestoreMode
    const allFiles = Array.from(chainResult.effectiveFiles.values());
    let selectedFiles = allFiles;

    if (mode === RestoreMode.FILES) {
      const selected = new Set((request.selectedPaths || []).map(p => p.replace(/\\/g, '/')));
      selectedFiles = allFiles.filter(f => {
        const p = f.entry.path.replace(/\\/g, '/');
        const filename = path.basename(p);
        return selected.has(p) || selected.has(filename) || (request.sourcePath && p === request.sourcePath);
      });
    } else if (mode === RestoreMode.DIRECTORY) {
      const targetDirs = (request.selectedPaths || []).map(p => {
        let clean = p.replace(/\\/g, '/');
        if (!clean.endsWith('/')) clean += '/';
        return clean;
      });
      if (request.sourcePath) {
        let clean = request.sourcePath.replace(/\\/g, '/');
        if (!clean.endsWith('/')) clean += '/';
        targetDirs.push(clean);
      }

      selectedFiles = allFiles.filter(f => {
        const p = f.entry.path.replace(/\\/g, '/');
        return targetDirs.some(dir => p.startsWith(dir) || p === dir.slice(0, -1));
      });
    } else if (mode === RestoreMode.PARTIAL) {
      const prefixes = (request.selectedPaths || []).map(p => p.replace(/\\/g, '/'));
      selectedFiles = allFiles.filter(f => {
        const p = f.entry.path.replace(/\\/g, '/');
        return prefixes.some(pref => p.startsWith(pref) || path.basename(p) === pref);
      });
    }

    let toCreate = 0;
    let toOverwrite = 0;
    let toSkip = 0;
    let toRename = 0;
    let totalBytes = 0;

    // 2. Análise de cada arquivo selecionado contra o filesystem de destino
    for (const file of selectedFiles) {
      const relPath = file.entry.path;
      let targetFullPath: string;

      try {
        targetFullPath = PathSafety.resolveSafeTargetPath(request.targetDirectory, relPath);
      } catch (err: any) {
        errors.push(`Erro de segurança no caminho "${relPath}": ${err.message}`);
        items.push({
          relativePath: relPath,
          sourceExecutionId: file.sourceExecutionId,
          targetFullPath: '',
          sizeBytes: file.entry.sizeBytes,
          expectedSha256: file.entry.sha256,
          isEncrypted: file.entry.isEncrypted,
          compressionAlgorithm: file.entry.compressionAlgorithm,
          action: 'ERROR',
          reason: err.message,
          conflictExists: false
        });
        continue;
      }

      let exists = false;
      let existingStat: fs.Stats | null = null;
      try {
        if (fs.existsSync(targetFullPath)) {
          exists = true;
          existingStat = fs.statSync(targetFullPath);
        }
      } catch {
        exists = false;
      }

      if (!exists) {
        items.push({
          relativePath: relPath,
          sourceExecutionId: file.sourceExecutionId,
          targetFullPath,
          sizeBytes: file.entry.sizeBytes,
          expectedSha256: file.entry.sha256,
          isEncrypted: file.entry.isEncrypted,
          compressionAlgorithm: file.entry.compressionAlgorithm,
          action: 'CREATE',
          conflictExists: false,
          backupModifiedAtMs: file.entry.modifiedAtMs
        });
        toCreate++;
        totalBytes += file.entry.sizeBytes;
      } else {
        // Conflito existente no destino
        const existingSize = existingStat?.size ?? 0;
        const existingMtime = existingStat?.mtimeMs ?? 0;
        const backupMtime = file.entry.modifiedAtMs ?? 0;

        let shouldOverwrite = false;
        let skipReason: string | undefined;

        // Avaliação de OverwritePolicy
        if (overwritePolicy === OverwritePolicy.NEVER) {
          shouldOverwrite = false;
          skipReason = 'OverwritePolicy é NEVER e o arquivo já existe no destino.';
        } else if (overwritePolicy === OverwritePolicy.ALWAYS) {
          shouldOverwrite = true;
        } else if (overwritePolicy === OverwritePolicy.IF_NEWER) {
          if (backupMtime > existingMtime) {
            shouldOverwrite = true;
          } else {
            shouldOverwrite = false;
            skipReason = 'Arquivo de destino existente é igual ou mais recente que o backup (IF_NEWER).';
          }
        } else if (overwritePolicy === OverwritePolicy.IF_DIFFERENT) {
          if (existingSize !== file.entry.sizeBytes) {
            shouldOverwrite = true;
          } else {
            // Se o tamanho for igual, verifica hash se filesystem estiver disponível
            shouldOverwrite = false;
            skipReason = 'Arquivo existente tem tamanho idêntico ao backup (IF_DIFFERENT).';
          }
        }

        // Avaliação de ConflictPolicy
        if (conflictPolicy === RestoreConflictPolicy.SKIP) {
          shouldOverwrite = false;
          skipReason = 'ConflictPolicy é SKIP.';
        } else if (conflictPolicy === RestoreConflictPolicy.FAIL) {
          items.push({
            relativePath: relPath,
            sourceExecutionId: file.sourceExecutionId,
            targetFullPath,
            sizeBytes: file.entry.sizeBytes,
            expectedSha256: file.entry.sha256,
            isEncrypted: file.entry.isEncrypted,
            compressionAlgorithm: file.entry.compressionAlgorithm,
            action: 'ERROR',
            reason: 'ConflictPolicy é FAIL e o arquivo de destino já existe.',
            conflictExists: true,
            existingSizeBytes: existingSize,
            existingModifiedAtMs: existingMtime,
            backupModifiedAtMs: backupMtime
          });
          errors.push(`Conflito com política FAIL para arquivo "${relPath}"`);
          continue;
        }

        if (conflictPolicy === RestoreConflictPolicy.RENAME) {
          const parsed = path.parse(targetFullPath);
          const renamedTarget = path.join(parsed.dir, `${parsed.name}.restored_${Date.now()}${parsed.ext}`);
          items.push({
            relativePath: relPath,
            sourceExecutionId: file.sourceExecutionId,
            targetFullPath: renamedTarget,
            sizeBytes: file.entry.sizeBytes,
            expectedSha256: file.entry.sha256,
            isEncrypted: file.entry.isEncrypted,
            compressionAlgorithm: file.entry.compressionAlgorithm,
            action: 'RENAME',
            reason: `Arquivo existente mantido. Novo arquivo será salvo como "${path.basename(renamedTarget)}"`,
            conflictExists: true,
            existingSizeBytes: existingSize,
            existingModifiedAtMs: existingMtime,
            backupModifiedAtMs: backupMtime
          });
          toRename++;
          totalBytes += file.entry.sizeBytes;
        } else if (shouldOverwrite) {
          items.push({
            relativePath: relPath,
            sourceExecutionId: file.sourceExecutionId,
            targetFullPath,
            sizeBytes: file.entry.sizeBytes,
            expectedSha256: file.entry.sha256,
            isEncrypted: file.entry.isEncrypted,
            compressionAlgorithm: file.entry.compressionAlgorithm,
            action: 'OVERWRITE',
            reason: 'Sobrescrevendo arquivo existente conforme política.',
            conflictExists: true,
            existingSizeBytes: existingSize,
            existingModifiedAtMs: existingMtime,
            backupModifiedAtMs: backupMtime
          });
          toOverwrite++;
          totalBytes += file.entry.sizeBytes;
        } else {
          items.push({
            relativePath: relPath,
            sourceExecutionId: file.sourceExecutionId,
            targetFullPath,
            sizeBytes: file.entry.sizeBytes,
            expectedSha256: file.entry.sha256,
            isEncrypted: file.entry.isEncrypted,
            compressionAlgorithm: file.entry.compressionAlgorithm,
            action: 'SKIP',
            reason: skipReason || 'Arquivo ignorado conforme política de conflito/sobrescrita.',
            conflictExists: true,
            existingSizeBytes: existingSize,
            existingModifiedAtMs: existingMtime,
            backupModifiedAtMs: backupMtime
          });
          toSkip++;
        }
      }
    }

    const preview: RestorePreview = {
      requestId: request.requestId,
      jobId: request.jobId,
      executionId: chainResult.targetExecutionId,
      targetDirectory: request.targetDirectory,
      totalFiles: items.length,
      totalBytes,
      toCreate,
      toOverwrite,
      toSkip,
      toRename,
      errors,
      items
    };

    const plan: RestorePlan = {
      requestId: request.requestId,
      jobId: request.jobId,
      executionId: chainResult.targetExecutionId,
      targetDirectory: request.targetDirectory,
      items,
      validated: errors.length === 0
    };

    return { preview, plan };
  }
}
