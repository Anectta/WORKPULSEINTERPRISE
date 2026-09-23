import { UUID, BackupJobStatus } from './domain.js';

/**
 * Modos de comparação entre origem e destino no Mirror
 */
export enum MirrorComparisonMode {
  FAST = 'FAST', // Tamanho e timestamp (tolerância de 1s)
  SIZE_AND_MTIME = 'SIZE_AND_MTIME', // Padrão corporativo rápido e confiável
  METADATA_AND_CHECKSUM = 'METADATA_AND_CHECKSUM', // Se metadados divergirem, valida SHA-256
  CHECKSUM_ONLY = 'CHECKSUM_ONLY' // Sempre calcula e compara SHA-256
}

/**
 * Políticas para resolução de conflitos (utilizado em Two-Way Sync e Mirror)
 */
export enum ConflictPolicy {
  MANUAL = 'MANUAL', // Reporta sem alterar nenhum lado
  PREFER_SOURCE = 'PREFER_SOURCE', // Origem (Side A) prevalece
  PREFER_DESTINATION = 'PREFER_DESTINATION', // Destino (Side B) prevalece
  NEWEST_WINS = 'NEWEST_WINS', // Versão com modifiedAt mais recente prevalece
  PRESERVE_BOTH = 'PRESERVE_BOTH' // Renomeia o conflito preservando ambos
}

/**
 * Regras de proteção contra exclusões catastróficas (Safety Threshold)
 */
export interface MirrorSafetyThreshold {
  /** Quantidade máxima absoluta de exclusões permitidas em uma única execução */
  maxDeletions?: number;
  /** Percentual máximo de exclusões em relação ao total de arquivos do destino (ex: 20 = 20%) */
  maxDeletionPercent?: number;
  /** Percentual máximo de alterações totais (Create + Update + Delete) */
  maxTotalChangesPercent?: number;
  /** Se true, aborta a execução caso o threshold seja ultrapassado. Se false, pula apenas as exclusões */
  abortOnThresholdExceeded: boolean;
  /** Se false e a origem estiver vazia mas o destino tiver arquivos, impede deleção em massa */
  allowEmptySourceDeletion?: boolean;
}

/**
 * Política completa de espelhamento unidirecional (Mirror)
 */
export interface MirrorPolicy {
  /** Permite copiar arquivos novos da origem para o destino */
  allowCreate: boolean;
  /** Permite atualizar arquivos modificados no destino */
  allowUpdate: boolean;
  /** Permite remover arquivos ausentes na origem do destino */
  allowDelete: boolean;
  /** Se true, move arquivos a serem excluídos para a quarentena em vez de unlink direto */
  safeDelete: boolean;
  /** Prefixo/diretório de quarentena no destino (padrão: '.mirror_quarantine') */
  quarantinePrefix?: string;
  /** Modo de simulação lógica sem nenhuma alteração física em disco */
  dryRun: boolean;
  /** Estratégia de comparação de arquivos */
  comparisonMode: MirrorComparisonMode;
  /** Se true, preserva arquivos extras no destino mesmo com allowDelete ativado */
  preserveExtraFiles: boolean;
  /** Se true, segue links simbólicos ao escanear a origem */
  followSymlinks?: boolean;
  /** Configuração do Safety Threshold */
  safetyThreshold: MirrorSafetyThreshold;
  /** Política de resolução de conflitos */
  conflictPolicy: ConflictPolicy;
  /** Valida SHA-256 e tamanho imediatamente após a gravação */
  verifyChecksumAfterWrite: boolean;
}

/**
 * Tipos de operações no plano de execução do Mirror
 */
export enum MirrorOperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  QUARANTINE = 'QUARANTINE',
  UNCHANGED = 'UNCHANGED',
  CONFLICT = 'CONFLICT',
  SKIPPED = 'SKIPPED',
  ERROR = 'ERROR'
}

/**
 * Item individual planejado para execução no Mirror
 */
export interface MirrorOperationItem {
  operation: MirrorOperationType;
  path: string; // Caminho relativo normalizado (ex: docs/financeiro.xlsx)
  sourceFullPath?: string;
  destFullPath?: string;
  sizeBytes: number;
  modifiedAtMs?: number;
  sourceSha256?: string;
  destSha256?: string;
  reason?: string;
  quarantinePath?: string;
  conflictDetail?: {
    sourceMtimeMs: number;
    destMtimeMs: number;
    sourceSizeBytes: number;
    destSizeBytes: number;
    resolution?: string;
  };
}

/**
 * Sumário estatístico do plano de operação do Mirror
 */
export interface MirrorPlanSummary {
  totalSourceFiles: number;
  totalDestFiles: number;
  createCount: number;
  updateCount: number;
  deleteCount: number;
  quarantineCount: number;
  unchangedCount: number;
  conflictCount: number;
  skippedCount: number;
  errorCount: number;
  totalBytesToTransfer: number;
  safetyThresholdExceeded: boolean;
  abortReason?: string;
}

/**
 * Plano de Operação completo gerado antes de qualquer alteração física
 */
export interface MirrorOperationPlan {
  planId: UUID;
  jobId: UUID;
  executionId: UUID;
  createdAt: string;
  dryRun: boolean;
  operations: MirrorOperationItem[];
  summary: MirrorPlanSummary;
  isValid: boolean;
}

/**
 * Resultado da execução do Mirror
 */
export interface MirrorResult {
  success: boolean;
  status: BackupJobStatus;
  executionId: UUID;
  jobId: UUID;
  durationMs: number;
  plan: MirrorOperationPlan;
  applied: {
    created: number;
    updated: number;
    deleted: number;
    quarantined: number;
    skipped: number;
    errors: number;
    bytesTransferred: number;
  };
  errors: string[];
  warnings: string[];
  integrityVerified: boolean;
}
