import { UUID } from '../core/domain.js';
import { EngineError, ErrorCategory } from '../core/errors.js';

export interface LockInfo {
  jobId: UUID;
  executionId: UUID;
  queueItemId: UUID;
  acquiredAt: string;
}

export class JobExecutionLock {
  private readonly locks = new Map<UUID, LockInfo>();

  /**
   * Verifica se o job já possui uma execução em andamento.
   */
  public isLocked(jobId: UUID): boolean {
    return this.locks.has(jobId);
  }

  public isJobRunning(jobId: UUID): boolean {
    return this.isLocked(jobId);
  }

  /**
   * Tenta adquirir o lock exclusivamente para o job.
   * Retorna true se adquirido com sucesso, ou false caso já esteja ocupado.
   */
  public tryAcquire(jobId: UUID, executionId: UUID, queueItemId: UUID): boolean {
    if (this.locks.has(jobId)) {
      return false;
    }

    this.locks.set(jobId, {
      jobId,
      executionId,
      queueItemId,
      acquiredAt: new Date().toISOString()
    });
    return true;
  }

  /**
   * Adquire o lock ou lança erro estruturado se já bloqueado.
   */
  public acquire(jobId: UUID, executionId: UUID, queueItemId: UUID): void {
    if (!this.tryAcquire(jobId, executionId, queueItemId)) {
      const current = this.locks.get(jobId)!;
      throw new EngineError({
        code: 'JOB_ALREADY_RUNNING',
        message: `Job ${jobId} já está em execução (executionId: ${current.executionId}, iniciado em: ${current.acquiredAt})`,
        category: ErrorCategory.CONFLICT,
        context: { jobId, currentLock: current }
      });
    }
  }

  /**
   * Libera o lock do job.
   */
  public release(jobId: UUID, executionId?: UUID): void {
    const lock = this.locks.get(jobId);
    if (!lock) return;

    if (executionId && lock.executionId !== executionId) {
      // Ignora liberação de outra execução que não é a dona do lock
      return;
    }

    this.locks.delete(jobId);
  }

  public getLock(jobId: UUID): LockInfo | undefined {
    return this.locks.get(jobId);
  }

  public getActiveLocks(): LockInfo[] {
    return Array.from(this.locks.values());
  }

  public clear(): void {
    this.locks.clear();
  }
}
