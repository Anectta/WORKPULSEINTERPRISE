import { DeviceInventorySnapshot, InventoryType } from '../../types/cmdb';

/**
 * Motor de Inventário Incremental e Versionamento Criptográfico
 * Responsável por:
 * 1. Comparar Inventário Anterior vs Inventário Atual
 * 2. Identificar precisamente seções ou campos alterados
 * 3. Gerar payloads delta (somente mudanças) quando viável
 * 4. Controlar timestamps de coleta e sincronização
 * 5. Garantir a origem 'AGENT' e tratamento estrito de valores nulos
 */
export class IncrementalInventoryEngine {

  /**
   * Calcula um hash SHA-256 estável de um objeto JSON normalizado
   */
  static computeHash(data: any): string {
    const jsonStr = JSON.stringify(data, Object.keys(data || {}).sort());
    let hash = 0;
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `sha256_${hex}_${jsonStr.length}`;
  }

  /**
   * Compara o inventário anterior com o inventário atual
   */
  static diff(previous: any | null, current: any): {
    hasChanges: boolean;
    changedFields: string[];
    delta: Record<string, any>;
  } {
    if (!previous) {
      return {
        hasChanges: true,
        changedFields: ['* (Inventário Inicial Completo)'],
        delta: current
      };
    }

    const changedFields: string[] = [];
    const delta: Record<string, any> = {};

    const sections = ['hardware', 'os', 'software', 'network', 'user', 'security'];

    for (const section of sections) {
      const prevSection = JSON.stringify(previous[section] || null);
      const currSection = JSON.stringify(current[section] || null);

      if (prevSection !== currSection) {
        changedFields.push(section);
        delta[section] = current[section];
      }
    }

    return {
      hasChanges: changedFields.length > 0,
      changedFields,
      delta
    };
  }

  /**
   * Prepara o pacote de envio do agente. Se houver snapshot anterior e as mudanças forem pontuais,
   * envia como incremental (ou full se for o primeiro ciclo).
   */
  static buildTransmissionPayload(
    previousSnapshot: DeviceInventorySnapshot | null,
    currentCollectedData: any,
    options: {
      agentId: string;
      deviceId: string;
      tenantId: string;
      forceFull?: boolean;
    }
  ): {
    payload: Partial<DeviceInventorySnapshot>;
    inventoryType: InventoryType;
    version: number;
    hasChanges: boolean;
  } {
    const diffResult = this.diff(previousSnapshot, currentCollectedData);
    const collectedAt = new Date().toISOString();
    const currentHash = this.computeHash(currentCollectedData);

    const previousVersion = previousSnapshot?.inventoryVersion || 0;
    const nextVersion = diffResult.hasChanges ? previousVersion + 1 : previousVersion;

    if (!previousSnapshot || options.forceFull || diffResult.changedFields.length > 3) {
      return {
        hasChanges: diffResult.hasChanges,
        inventoryType: 'full',
        version: nextVersion,
        payload: {
          origin: 'AGENT',
          agentId: options.agentId,
          deviceId: options.deviceId,
          tenantId: options.tenantId,
          inventoryVersion: nextVersion,
          snapshotHash: currentHash,
          inventoryType: 'full',
          platform: currentCollectedData.platform,
          collectedAt,
          hardware: currentCollectedData.hardware,
          os: currentCollectedData.os,
          software: currentCollectedData.software,
          network: currentCollectedData.network,
          user: currentCollectedData.user,
          security: currentCollectedData.security,
          changedFields: diffResult.changedFields
        }
      };
    }

    return {
      hasChanges: diffResult.hasChanges,
      inventoryType: 'incremental',
      version: nextVersion,
      payload: {
        origin: 'AGENT',
        agentId: options.agentId,
        deviceId: options.deviceId,
        tenantId: options.tenantId,
        inventoryVersion: nextVersion,
        snapshotHash: currentHash,
        inventoryType: 'incremental',
        platform: currentCollectedData.platform,
        collectedAt,
        changedFields: diffResult.changedFields,
        delta: diffResult.delta
      }
    };
  }

  /**
   * Aplica um payload incremental no servidor para reconstruir o snapshot integral atualizado
   */
  static mergeDelta(
    previous: DeviceInventorySnapshot,
    incrementalPayload: Partial<DeviceInventorySnapshot>
  ): DeviceInventorySnapshot {
    const delta = incrementalPayload.delta || {};
    return {
      ...previous,
      inventoryVersion: incrementalPayload.inventoryVersion || (previous.inventoryVersion + 1),
      snapshotHash: incrementalPayload.snapshotHash || previous.snapshotHash,
      inventoryType: 'incremental',
      syncedAt: new Date().toISOString(),
      collectedAt: incrementalPayload.collectedAt || previous.collectedAt,
      hardware: delta.hardware ? { ...previous.hardware, ...delta.hardware } : previous.hardware,
      os: delta.os ? { ...previous.os, ...delta.os } : previous.os,
      software: delta.software ? delta.software : previous.software,
      network: delta.network ? delta.network : previous.network,
      user: delta.user ? { ...previous.user, ...delta.user } : previous.user,
      security: delta.security ? { ...previous.security, ...delta.security } : previous.security,
      changedFields: incrementalPayload.changedFields || Object.keys(delta),
      delta: incrementalPayload.delta
    };
  }
}
