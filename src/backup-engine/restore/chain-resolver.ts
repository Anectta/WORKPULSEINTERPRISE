import { UUID, BackupJobType } from '../core/domain.js';
import { BackupCatalog, BackupExecution, BackupManifest, ManifestFileEntry, StorageProvider } from '../core/contracts.js';
import { EngineError, ErrorCategory } from '../core/errors.js';

export interface ResolvedChainResult {
  jobId: UUID;
  targetExecutionId: UUID;
  targetManifest: BackupManifest;
  chainExecutions: BackupExecution[];
  effectiveFiles: Map<string, { entry: ManifestFileEntry; sourceExecutionId: UUID }>;
}

export class RestoreChainResolver {
  /**
   * Valida rigorosamente e reconstrói a cadeia de backup necessária para o restore de uma versão.
   * Suporta FULL, INCREMENTAL (cadeia completa desde o Full) e DIFFERENTIAL (Base Full + Differential alvo).
   */
  public static async resolveAndValidateChain(
    catalog: BackupCatalog,
    storage: StorageProvider,
    jobId: UUID,
    targetExecutionId: UUID
  ): Promise<ResolvedChainResult> {
    // 1. Localiza a execução alvo no catálogo
    const executions = await catalog.listExecutions(jobId);
    const targetExecution = executions.find(e => e.executionId === targetExecutionId);
    if (!targetExecution) {
      throw new EngineError({
        code: 'RESTORE_BLOCKED_VERSION_NOT_FOUND',
        message: `A versão de execução "${targetExecutionId}" não foi encontrada no catálogo do job "${jobId}".`,
        category: ErrorCategory.VALIDATION
      });
    }

    // 2. Obtém o manifesto da execução alvo
    const targetManifest = await catalog.getManifest(targetExecutionId);
    if (!targetManifest) {
      throw new EngineError({
        code: 'RESTORE_BLOCKED_MANIFEST_MISSING',
        message: `O manifesto da execução "${targetExecutionId}" está ausente no catálogo.`,
        category: ErrorCategory.CORRUPTION
      });
    }

    const chainExecutions: BackupExecution[] = [];

    // 3. Resolução da cadeia com base no tipo de backup
    if (targetExecution.executionType === BackupJobType.FULL) {
      // FULL simples
      chainExecutions.push(targetExecution);
    } else if (targetExecution.executionType === BackupJobType.INCREMENTAL) {
      // INCREMENTAL: exige o Full Base e todas as etapas intermediárias da cadeia
      const baseFullId = targetManifest.baseFullExecutionId;
      if (!baseFullId) {
        throw new EngineError({
          code: 'RESTORE_BLOCKED_ORPHAN_INCREMENTAL',
          message: `O backup incremental "${targetExecutionId}" não possui referência para o Full Base.`,
          category: ErrorCategory.VALIDATION
        });
      }

      const baseFullExec = executions.find(e => e.executionId === baseFullId);
      if (!baseFullExec) {
        throw new EngineError({
          code: 'RESTORE_BLOCKED_BASE_FULL_MISSING',
          message: `O Full Base "${baseFullId}" necessário para o incremental "${targetExecutionId}" não existe mais no catálogo.`,
          category: ErrorCategory.CORRUPTION
        });
      }

      // Obtém todas as execuções da cadeia até a execução alvo
      const allChainExecs = await catalog.getChainExecutions(jobId, baseFullId);
      const targetIndex = allChainExecs.findIndex(e => e.executionId === targetExecutionId);
      if (targetIndex === -1) {
        throw new EngineError({
          code: 'RESTORE_BLOCKED_CHAIN_BROKEN',
          message: `A execução alvo "${targetExecutionId}" não foi encontrada na sequência da cadeia do Full Base "${baseFullId}".`,
          category: ErrorCategory.CORRUPTION
        });
      }

      // Inclui desde o Full Base até o targetIndex (inclusive)
      for (let i = 0; i <= targetIndex; i++) {
        chainExecutions.push(allChainExecs[i]);
      }
    } else if (targetExecution.executionType === BackupJobType.DIFFERENTIAL) {
      // DIFFERENTIAL: conforme especificação (Seção 8), aplica Full Base + Differential Alvo
      const baseFullId = targetManifest.baseFullExecutionId;
      if (!baseFullId) {
        throw new EngineError({
          code: 'RESTORE_BLOCKED_ORPHAN_DIFFERENTIAL',
          message: `O backup diferencial "${targetExecutionId}" não possui referência para o Full Base.`,
          category: ErrorCategory.VALIDATION
        });
      }

      const baseFullExec = executions.find(e => e.executionId === baseFullId);
      if (!baseFullExec) {
        throw new EngineError({
          code: 'RESTORE_BLOCKED_BASE_FULL_MISSING',
          message: `O Full Base "${baseFullId}" necessário para o diferencial "${targetExecutionId}" não existe mais no catálogo.`,
          category: ErrorCategory.CORRUPTION
        });
      }

      chainExecutions.push(baseFullExec);
      chainExecutions.push(targetExecution);
    } else {
      // Para Mirror / Sync ou outros tipos
      chainExecutions.push(targetExecution);
    }

    // 4. Validação de integridade de dependências da cadeia
    for (const exec of chainExecutions) {
      const manifest = await catalog.getManifest(exec.executionId);
      if (!manifest) {
        throw new EngineError({
          code: 'RESTORE_BLOCKED_INTERMEDIATE_MANIFEST_MISSING',
          message: `A execução intermediária "${exec.executionId}" (${exec.executionType}) na cadeia não possui manifesto válido. Restore bloqueado.`,
          category: ErrorCategory.CORRUPTION
        });
      }

      // Verifica no storage se a pasta da execução existe
      const remotePrefix = `backups/${jobId}/${exec.executionId}`;
      const exists = await storage.exists(remotePrefix);
      if (!exists) {
        // Tenta checar subdiretório manifest ou data
        const manifestExists = await storage.exists(`${remotePrefix}/manifest.json`);
        if (!manifestExists) {
          throw new EngineError({
            code: 'RESTORE_BLOCKED_STORAGE_OBJECT_MISSING',
            message: `Os dados da execução "${exec.executionId}" na cadeia não foram encontrados no storage. Restore bloqueado.`,
            category: ErrorCategory.STORAGE
          });
        }
      }
    }

    // 5. Reconstrução do mapa de arquivos efetivos
    const effectiveFiles = new Map<string, { entry: ManifestFileEntry; sourceExecutionId: UUID }>();

    for (const exec of chainExecutions) {
      const m = await catalog.getManifest(exec.executionId);
      if (!m) continue;

      for (const file of m.files) {
        if (file.operation === 'DELETE') {
          effectiveFiles.delete(file.path);
        } else if (file.operation === 'RENAME') {
          if (file.previousPath) {
            effectiveFiles.delete(file.previousPath);
          }
          effectiveFiles.set(file.path, { entry: file, sourceExecutionId: exec.executionId });
        } else {
          effectiveFiles.set(file.path, { entry: file, sourceExecutionId: exec.executionId });
        }
      }

      if (m.deletedFiles) {
        for (const del of m.deletedFiles) {
          effectiveFiles.delete(del);
        }
      }
    }

    return {
      jobId,
      targetExecutionId,
      targetManifest,
      chainExecutions,
      effectiveFiles
    };
  }
}
