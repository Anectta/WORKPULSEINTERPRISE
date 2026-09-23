export interface AgentConfig {
  agentId?: string;
  controlPlaneUrl: string;
  heartbeatIntervalMs: number;
  telemetryIntervalMs: number;
  reconnectBaseDelayMs: number;
  reconnectMaxDelayMs: number;
  ipcSocketPath: string;
  dataDir: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  configurationVersion: number;
  updatedAt: string;
  checksum?: string;
}

export interface AgentSecrets {
  agentSecret: string;
  ipcAuthToken: string;
}

export function getDefaultAgentConfig(dataDir: string): AgentConfig {
  const isWin = process.platform === 'win32';
  const defaultIpcPath = isWin
    ? '\\\\.\\pipe\\workpulse-backup-engine-default'
    : '/tmp/workpulse-engine.sock';

  return {
    controlPlaneUrl: 'wss://controlplane.workpulse.internal/v1/agent',
    heartbeatIntervalMs: 30_000,
    telemetryIntervalMs: 60_000,
    reconnectBaseDelayMs: 1_000,
    reconnectMaxDelayMs: 60_000,
    ipcSocketPath: defaultIpcPath,
    dataDir,
    logLevel: 'info',
    configurationVersion: 1,
    updatedAt: new Date().toISOString()
  };
}
