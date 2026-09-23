import { UUID, BackupJobType, BackupJobStatus } from './domain.js';
import { FileIdentity } from './contracts.js';

/**
 * Tipos de operações do ChangeSet
 */
export enum ChangeOperationType {
  ADD = 'ADD',
  MODIFY = 'MODIFY',
  DELETE = 'DELETE',
  RENAME = 'RENAME',
  UNCHANGED = 'UNCHANGED'
}

/**
 * Item individual no ChangeSet
 */
export interface ChangeItem {
  operation: ChangeOperationType;
  path: string; // Caminho relativo normalizado (ex: docs/file.txt)
  fullSourcePath?: string; // Caminho absoluto no filesystem de origem (quando aplicável)
  previousPath?: string; // Caminho anterior quando operation === RENAME
  sizeBytes: number;
  modifiedAtMs: number;
  fileIdentity?: FileIdentity;
  sha256?: string;
  previousSha256?: string;
  isExcludedByFilter?: boolean;
}

/**
 * Conjunto de alterações detectadas entre o estado atual e uma base
 */
export interface ChangeSet {
  baseExecutionId?: UUID;
  baseJobType?: BackupJobType | string;
  totalScanned: number;
  added: ChangeItem[];
  modified: ChangeItem[];
  deleted: ChangeItem[];
  renamed: ChangeItem[];
  unchangedCount: number;
  totalBytesToTransfer: number;
}

/**
 * Estado da cadeia de backups para controle de integridade e dependências
 */
export interface BackupChainNode {
  chainId: UUID;
  baseFullBackupId: UUID;
  backupId: UUID;
  executionId: UUID;
  parentBackupId?: UUID;
  backupType: BackupJobType | string;
  sequence: number; // 0 para Full, 1 para Inc 1, 2 para Inc 2...
  createdAt: string;
  status: BackupJobStatus;
  integrityVerified: boolean;
  manifestHash?: string;
}

export interface BackupChain {
  chainId: UUID;
  jobId: UUID;
  baseFullExecutionId: UUID;
  nodes: BackupChainNode[];
  latestValidExecutionId: UUID;
  isValid: boolean;
}
