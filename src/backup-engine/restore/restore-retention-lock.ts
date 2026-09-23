import { UUID } from '../core/domain.js';
import { EngineError, ErrorCategory } from '../core/errors.js';

export class RestoreRetentionCoordinator {
  private static instance: RestoreRetentionCoordinator;

  // executionId -> count de restores ativos usando esta execução
  private activeRestoreLeases = new Map<UUID, number>();

  // executionId -> retention job ID que está excluindo esta execução
  private activeRetentionDeletes = new Map<UUID, UUID>();

  public static getInstance(): RestoreRetentionCoordinator {
    if (!this.instance) {
      this.instance = new RestoreRetentionCoordinator();
    }
    return this.instance;
  }

  /**
   * Adquire lease de leitura para uma lista de execuções requeridas pelo Restore.
   * Impede que a retenção remova qualquer uma dessas execuções enquanto o restore estiver ativo.
   */
  public acquireRestoreLease(executionIds: UUID[]): () => void {
    // 1. Verifica se alguma execução está sendo deletada no momento
    for (const id of executionIds) {
      if (this.activeRetentionDeletes.has(id)) {
        throw new EngineError({
          code: 'RESTORE_BLOCKED_CONCURRENCY',
          message: `A execução ${id} está atualmente sendo processada para expiração/exclusão pelo processo de retenção.`,
          category: ErrorCategory.CONFLICT
        });
      }
    }

    // 2. Incrementa leases
    for (const id of executionIds) {
      const current = this.activeRestoreLeases.get(id) || 0;
      this.activeRestoreLeases.set(id, current + 1);
    }

    let released = false;
    return () => {
      if (released) return;
      released = true;
      for (const id of executionIds) {
        const count = this.activeRestoreLeases.get(id) || 0;
        if (count <= 1) {
          this.activeRestoreLeases.delete(id);
        } else {
          this.activeRestoreLeases.set(id, count - 1);
        }
      }
    };
  }

  /**
   * Verifica se uma execução possui lease ativo de Restore.
   */
  public isExecutionLockedByRestore(executionId: UUID): boolean {
    return (this.activeRestoreLeases.get(executionId) || 0) > 0;
  }

  /**
   * Tenta adquirir lock de exclusão para retenção.
   * Se a execução estiver sob lease de restore, retorna false.
   */
  public tryAcquireRetentionDeleteLock(retentionRunId: UUID, executionId: UUID): boolean {
    if (this.isExecutionLockedByRestore(executionId)) {
      return false;
    }
    if (this.activeRetentionDeletes.has(executionId) && this.activeRetentionDeletes.get(executionId) !== retentionRunId) {
      return false;
    }
    this.activeRetentionDeletes.set(executionId, retentionRunId);
    return true;
  }

  public releaseRetentionDeleteLock(retentionRunId: UUID, executionId: UUID): void {
    if (this.activeRetentionDeletes.get(executionId) === retentionRunId) {
      this.activeRetentionDeletes.delete(executionId);
    }
  }

  public clearAll(): void {
    this.activeRestoreLeases.clear;
    this.activeRetentionDeletes.clear();
  }
}
