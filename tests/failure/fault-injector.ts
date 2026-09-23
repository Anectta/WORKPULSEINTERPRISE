import { EventEmitter } from 'events';

export type FaultType =
  | 'ABRUPT_STREAM_ABORT'
  | 'CORRUPT_BYTES_IN_TRANSIT'
  | 'INJECT_STORAGE_FULL'
  | 'SIMULATE_PROCESS_CRASH'
  | 'SIMULATE_NETWORK_DROP'
  | 'SIMULATE_CORRUPT_MANIFEST';

export interface FaultRule {
  faultType: FaultType;
  targetPath?: string;
  triggerAfterBytes?: number;
  triggerAfterCalls?: number;
  active: boolean;
}

/**
 * Injetor de falhas controlado para testes de resiliência e recuperação do Backup Engine.
 */
export class FaultInjector extends EventEmitter {
  private rules: Map<string, FaultRule> = new Map();
  private callCounters: Map<string, number> = new Map();
  private bytesCounters: Map<string, number> = new Map();

  public addRule(id: string, rule: FaultRule): void {
    this.rules.set(id, rule);
    this.callCounters.set(id, 0);
    this.bytesCounters.set(id, 0);
  }

  public removeRule(id: string): void {
    this.rules.delete(id);
    this.callCounters.delete(id);
    this.bytesCounters.delete(id);
  }

  public clearRules(): void {
    this.rules.clear();
    this.callCounters.clear();
    this.bytesCounters.clear();
  }

  /**
   * Avalia se uma falha deve ser disparada em uma chamada específica.
   */
  public shouldTriggerCallFault(id: string): boolean {
    const rule = this.rules.get(id);
    if (!rule || !rule.active) return false;

    const current = (this.callCounters.get(id) || 0) + 1;
    this.callCounters.set(id, current);

    if (rule.triggerAfterCalls !== undefined && current >= rule.triggerAfterCalls) {
      this.emit('fault_triggered', { id, faultType: rule.faultType, calls: current });
      return true;
    }
    return false;
  }

  /**
   * Avalia se uma falha deve ser disparada por volume de bytes transferidos.
   */
  public shouldTriggerByteFault(id: string, newBytes: number): boolean {
    const rule = this.rules.get(id);
    if (!rule || !rule.active) return false;

    const current = (this.bytesCounters.get(id) || 0) + newBytes;
    this.bytesCounters.set(id, current);

    if (rule.triggerAfterBytes !== undefined && current >= rule.triggerAfterBytes) {
      this.emit('fault_triggered', { id, faultType: rule.faultType, bytes: current });
      return true;
    }
    return false;
  }

  /**
   * Corrompe deterministicamente um buffer alterando bytes específicos.
   */
  public static corruptBuffer(buffer: Buffer, byteOffset: number = 0): Buffer {
    const copy = Buffer.from(buffer);
    if (copy.length > 0) {
      const targetIndex = Math.min(byteOffset, copy.length - 1);
      // Inverte os bits do byte para garantir alteração de hash e quebra de AEAD
      copy[targetIndex] = copy[targetIndex] ^ 0xff;
    }
    return copy;
  }
}
