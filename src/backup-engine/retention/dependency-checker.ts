import { UUID, BackupJobType } from '../core/domain.js';
import { BackupCatalog } from '../core/contracts.js';
import { RetentionPreviewItem } from './types.js';
import { RestoreRetentionCoordinator } from '../restore/restore-retention-lock.js';

export class RetentionDependencyChecker {
  /**
   * Executa a análise profunda de dependências da cadeia de backup e de locks de concorrência.
   * Transiciona itens marcados preliminarmente como DELETE para DEPENDENCY se forem necessários por qualquer
   * execução preservada (KEEP ou PROTECTED).
   */
  public static async applyDependencyProtection(
    catalog: BackupCatalog,
    items: RetentionPreviewItem[],
    coordinator: RestoreRetentionCoordinator = RestoreRetentionCoordinator.getInstance()
  ): Promise<RetentionPreviewItem[]> {
    const result = [...items];
    const itemsMap = new Map<UUID, RetentionPreviewItem>();
    for (const it of result) {
      itemsMap.set(it.executionId, it);
    }

    // 1. Verificação de Locks de Concorrência com Restore Ativo
    for (const item of result) {
      if (item.action === 'DELETE' && coordinator.isExecutionLockedByRestore(item.executionId)) {
        item.action = 'DEPENDENCY';
        item.reason = 'Preservado: execução atualmente em leitura por operação de Restore ativa.';
      }
    }

    // Carrega manifestos de todas as execuções para mapear relacionamentos de cadeia
    const manifests = new Map<UUID, any>();
    for (const item of result) {
      const m = await catalog.getManifest(item.executionId);
      if (m) manifests.set(item.executionId, m);
    }

    // Conjunto de execuções ativas que precisam ser preservadas (KEEP, PROTECTED ou DEPENDENCY)
    let changed = true;
    while (changed) {
      changed = false;

      const preservedIds = new Set<UUID>();
      for (const item of result) {
        if (item.action === 'KEEP' || item.action === 'PROTECTED' || item.action === 'DEPENDENCY') {
          preservedIds.add(item.executionId);
        }
      }

      for (const item of result) {
        if (item.action !== 'DELETE') continue;

        // Caso A: Se for um backup FULL
        if (item.executionType === BackupJobType.FULL) {
          const dependentIds: UUID[] = [];

          for (const presId of preservedIds) {
            const presManifest = manifests.get(presId);
            if (presManifest && presManifest.baseFullExecutionId === item.executionId) {
              dependentIds.push(presId);
            }
          }

          if (dependentIds.length > 0) {
            item.action = 'DEPENDENCY';
            item.dependentExecutionIds = dependentIds;
            item.reason = `Preservado por dependência: Full Base necessário para ${dependentIds.length} backups ativos na cadeia.`;
            changed = true;
            break;
          }
        }

        // Caso B: Se for um backup INCREMENTAL
        if (item.executionType === BackupJobType.INCREMENTAL) {
          const itemManifest = manifests.get(item.executionId);
          if (!itemManifest || !itemManifest.baseFullExecutionId) continue;

          const baseFullId = itemManifest.baseFullExecutionId;
          const chainExecs = await catalog.getChainExecutions(item.jobId, baseFullId);
          const currentIndex = chainExecs.findIndex(e => e.executionId === item.executionId);

          if (currentIndex !== -1) {
            // Verifica se existe algum incremental posterior nesta cadeia que está preservado
            const laterPreserved = chainExecs
              .slice(currentIndex + 1)
              .filter(e => preservedIds.has(e.executionId));

            if (laterPreserved.length > 0) {
              item.action = 'DEPENDENCY';
              item.dependentExecutionIds = laterPreserved.map(e => e.executionId);
              item.reason = `Preservado por dependência: Incremental intermediário necessário para reconstruir backups posteriores na cadeia.`;
              changed = true;
              break;
            }
          }
        }
      }
    }

    return result;
  }
}
