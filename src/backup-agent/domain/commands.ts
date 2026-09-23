export enum CommandType {
  RUN_BACKUP = 'RunBackup',
  RUN_RESTORE = 'RunRestore',
  RUN_MIRROR = 'RunMirror',
  PAUSE_JOB = 'PauseJob',
  RESUME_JOB = 'ResumeJob',
  CANCEL_JOB = 'CancelJob',
  VERIFY_BACKUP = 'VerifyBackup',
  RUN_RETENTION = 'RunRetention',
  SYNC_CONFIGURATION = 'SyncConfiguration',
  GET_STATUS = 'GetStatus',
  GET_HEALTH = 'GetHealth',
  RESTART_ENGINE = 'RestartEngine'
}

export const ALLOWED_COMMAND_TYPES = new Set<string>(Object.values(CommandType));

export interface RemoteCommand<T = Record<string, unknown>> {
  commandId: string;
  targetAgentId: string;
  commandType: CommandType;
  createdAt: string;
  expiresAt: string;
  signature: string; // HMAC-SHA256
  parameters: T;
}

export enum CommandExecutionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
  SKIPPED = 'SKIPPED'
}

export interface CommandResult {
  commandId: string;
  targetAgentId: string;
  commandType: CommandType;
  status: CommandExecutionStatus;
  executionId?: string;
  resultPayload?: unknown;
  error?: string;
  completedAt: string;
}
