import { HealthStatus, AgentLifecycleState } from '../domain/states.js';
import { EngineProcessManager } from '../engine-bridge/engine-process-manager.js';
import { ControlPlaneClient } from '../control-plane/client-contract.js';
import { ResourceMonitor } from '../telemetry/resource-monitor.js';

export interface HealthReport {
  status: HealthStatus;
  timestamp: string;
  agentState: AgentLifecycleState;
  ipcConnected: boolean;
  controlPlaneConnected: boolean;
  memoryUsagePercent: number;
  cpuUsagePercent: number;
  issues: string[];
}

export class HealthService {
  constructor(
    private readonly getAgentState: () => AgentLifecycleState,
    private readonly processManager: EngineProcessManager,
    private readonly controlPlaneClient: ControlPlaneClient
  ) {}

  public async evaluateHealth(): Promise<HealthReport> {
    const issues: string[] = [];
    const agentState = this.getAgentState();
    const processStatus = this.processManager.getStatus();
    const controlPlaneConnected = this.controlPlaneClient.isConnected();
    const metrics = await ResourceMonitor.sampleMetrics();

    if (!processStatus.ipcConnected) {
      issues.push('IPC_ENGINE_DISCONNECTED');
    }

    if (!controlPlaneConnected) {
      issues.push('CONTROL_PLANE_OFFLINE');
    }

    if (metrics.memoryUsedPercent > 90) {
      issues.push('MEMORY_PRESSURE_HIGH');
    }

    let status: HealthStatus = HealthStatus.HEALTHY;

    if (agentState === AgentLifecycleState.STOPPED_FOR_SAFETY || issues.includes('IPC_ENGINE_DISCONNECTED')) {
      status = HealthStatus.UNHEALTHY;
    } else if (agentState === AgentLifecycleState.RECOVERING) {
      status = HealthStatus.RECOVERING;
    } else if (!controlPlaneConnected) {
      status = HealthStatus.OFFLINE;
    } else if (issues.length > 0) {
      status = HealthStatus.DEGRADED;
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      agentState,
      ipcConnected: processStatus.ipcConnected,
      controlPlaneConnected,
      memoryUsagePercent: metrics.memoryUsedPercent,
      cpuUsagePercent: metrics.cpuUsagePercent,
      issues
    };
  }
}
