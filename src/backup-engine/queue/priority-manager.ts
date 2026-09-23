import { QueueItem } from './types.js';
import { JobPriority } from '../core/domain.js';

export class PriorityManager {
  constructor(
    private readonly agingIntervalMs: number = 30000,
    private readonly agingBoostAmount: number = 1
  ) {}

  /**
   * Atualiza o aging boost de todos os itens aguardando na fila.
   * Evita a starvation permanente de jobs de menor prioridade.
   */
  public applyAging(items: QueueItem[], currentTime: Date = new Date()): void {
    const nowMs = currentTime.getTime();

    for (const item of items) {
      if (item.status !== 'QUEUED' && item.status !== 'PENDING') continue;

      const waitTimeMs = nowMs - new Date(item.enqueuedAt).getTime();
      const periodsWaited = Math.floor(waitTimeMs / this.agingIntervalMs);

      if (periodsWaited > 0) {
        // Boost incremental de prioridade
        item.agingBoost = periodsWaited * this.agingBoostAmount;
        // Prioridade efetiva não pode ser menor que 1 (CRITICAL)
        item.effectivePriority = Math.max(1, item.priority - item.agingBoost);
      } else {
        item.effectivePriority = item.priority;
      }
    }
  }

  /**
   * Ordena a fila respeitando:
   * 1. Prioridade Efetiva (1 = CRITICAL vem antes de 4 = LOW)
   * 2. Ordem de Enfileiramento FIFO (timestamp enqueuedAt)
   */
  public sortQueue(items: QueueItem[], currentTime: Date = new Date()): QueueItem[] {
    this.applyAging(items, currentTime);

    return [...items].sort((a, b) => {
      const pA = a.effectivePriority ?? a.priority;
      const pB = b.effectivePriority ?? b.priority;

      if (pA !== pB) {
        return pA - pB; // Menor valor numérico = Maior prioridade
      }

      // Desempate FIFO
      return new Date(a.enqueuedAt).getTime() - new Date(b.enqueuedAt).getTime();
    });
  }
}
