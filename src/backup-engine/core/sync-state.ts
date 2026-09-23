import { UUID } from './domain.js';
import { FileIdentity } from './contracts.js';

/**
 * Representação de uma entrada no estado persistido de sincronização
 */
export interface SyncStateEntry {
  path: string; // Caminho relativo normalizado
  sizeBytes: number;
  modifiedAtMs: number;
  sha256: string;
  identity?: FileIdentity;
  lastSyncedAt: string;
  side: 'A' | 'B' | 'SYNCHRONIZED';
}

/**
 * Snapshot completo do estado de sincronização bidirecional entre dois endpoints
 */
export interface SyncState {
  syncId: UUID;
  sourceAPath: string;
  sourceBPath: string;
  lastSyncTimestamp: string;
  version: number;
  entries: Record<string, SyncStateEntry>;
}

/**
 * Catálogo e persistência de estados de sincronização Two-Way
 */
export interface SyncStateCatalog {
  getSyncState(syncId: UUID): Promise<SyncState | null>;
  saveSyncState(state: SyncState): Promise<void>;
  deleteSyncState(syncId: UUID): Promise<void>;
}

/**
 * Implementação em memória de SyncStateCatalog para testes e sessões ativas
 */
export class InMemorySyncStateCatalog implements SyncStateCatalog {
  private readonly states = new Map<UUID, SyncState>();

  public async getSyncState(syncId: UUID): Promise<SyncState | null> {
    const found = this.states.get(syncId);
    if (!found) return null;
    // Retorna cópia profunda para evitar mutações acidentais
    return JSON.parse(JSON.stringify(found));
  }

  public async saveSyncState(state: SyncState): Promise<void> {
    this.states.set(state.syncId, JSON.parse(JSON.stringify(state)));
  }

  public async deleteSyncState(syncId: UUID): Promise<void> {
    this.states.delete(syncId);
  }
}
