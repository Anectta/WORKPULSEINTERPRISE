import { EventEmitter } from 'node:events';
import { AgentLifecycleState } from '../domain/states.js';
import { AgentIdentity, IdentityManager } from '../domain/identity.js';
import { AgentConfig } from '../domain/config.js';
import { ConfigurationManager } from '../config/config-manager.js';
import { AgentStateStore } from '../persistence/state-store.js';
import { SpoolQueue } from '../persistence/spool-queue.js';
import { CommandDeduplicationStore } from '../persistence/deduplication-store.js';
import { EngineProcessManager } from '../engine-bridge/engine-process-manager.js';
import { EngineSupervisor } from '../engine-bridge/engine-supervisor.js';
import { EngineController } from '../engine-bridge/engine-controller.js';
import { ControlPlaneClient } from '../control-plane/client-contract.js';
import { WebSocketControlPlaneClient } from '../control-plane/websocket-client.js';
import { CommandDispatcher } from '../commands/dispatcher.js';
import { HealthService } from '../health/health-service.js';
import { HeartbeatService } from '../health/heartbeat-service.js';
import { TelemetryService } from '../telemetry/telemetry-service.js';

export interface AgentRuntimeOptions {
  dataDir: string;
  agentSecret?: string;
  ipcAuthToken?: string;
  customControlPlaneClient?: ControlPlaneClient;
  embeddedEngineLauncher?: () => Promise<number>;
}

export class AgentRuntime extends EventEmitter {
  private state: AgentLifecycleState = AgentLifecycleState.INITIALIZING;
  private identity!: AgentIdentity;
  private config!: AgentConfig;
  private configManager!: ConfigurationManager;
  private stateStore!: AgentStateStore;
  private spoolQueue!: SpoolQueue;
  private dedupStore!: CommandDeduplicationStore;
  private processManager!: EngineProcessManager;
  private supervisor!: EngineSupervisor;
  private engineController!: EngineController;
  private controlPlaneClient!: ControlPlaneClient;
  private commandDispatcher!: CommandDispatcher;
  private healthService!: HealthService;
  private heartbeatService!: HeartbeatService;
  private telemetryService!: TelemetryService;

  constructor(private readonly options: AgentRuntimeOptions) {
    super();
  }

  public async start(): Promise<void> {
    if (this.state === AgentLifecycleState.RUNNING || this.state === AgentLifecycleState.STARTING) {
      return;
    }

    this.transitionState(AgentLifecycleState.STARTING);

    // 1. Carrega ou Gera Identidade Única Persistente
    this.identity = await IdentityManager.loadOrCreateIdentity(this.options.dataDir);

    // 2. Inicializa Gerenciador de Configuração
    this.configManager = new ConfigurationManager(this.options.dataDir);
    this.config = await this.configManager.init();

    // 3. Inicializa Persistência de Estado, Spool e Deduplicação
    this.stateStore = new AgentStateStore(this.options.dataDir);
    this.spoolQueue = new SpoolQueue(this.options.dataDir);
    await this.spoolQueue.init();

    this.dedupStore = new CommandDeduplicationStore(this.options.dataDir);
    await this.dedupStore.init();

    // 4. Inicializa Sub-subsistema de Processo e Supervisão do Engine
    const ipcToken = this.options.ipcAuthToken || 'default-ipc-token-secret-12345';
    this.processManager = new EngineProcessManager(this.config.ipcSocketPath, ipcToken);
    this.supervisor = new EngineSupervisor(this.processManager, this.options.embeddedEngineLauncher);
    this.engineController = new EngineController(this.processManager);

    this.supervisor.on('circuit_breaker_tripped', (event) => {
      this.transitionState(AgentLifecycleState.STOPPED_FOR_SAFETY);
      this.emit('engine_circuit_breaker', event);
    });

    // 5. Inicializa Cliente do Control Plane
    const agentSecret = this.options.agentSecret || 'default-agent-hmac-secret-67890';
    if (this.options.customControlPlaneClient) {
      this.controlPlaneClient = this.options.customControlPlaneClient;
    } else {
      this.controlPlaneClient = new WebSocketControlPlaneClient({
        url: this.config.controlPlaneUrl,
        identity: this.identity,
        agentSecret,
        spoolQueue: this.spoolQueue,
        baseDelayMs: this.config.reconnectBaseDelayMs,
        maxDelayMs: this.config.reconnectMaxDelayMs
      });
    }

    // 6. Inicializa Despachador de Comandos Remotos
    this.commandDispatcher = new CommandDispatcher(
      this.identity.agentId,
      agentSecret,
      this.dedupStore,
      this.engineController,
      this.controlPlaneClient
    );

    this.controlPlaneClient.onCommand(async (cmd) => {
      await this.commandDispatcher.dispatch(cmd);
    });

    // 7. Inicializa Serviços de Diagnóstico, Heartbeat e Telemetria
    this.healthService = new HealthService(
      () => this.state,
      this.processManager,
      this.controlPlaneClient
    );

    this.heartbeatService = new HeartbeatService(
      this.identity,
      this.healthService,
      this.supervisor,
      this.controlPlaneClient,
      this.config.heartbeatIntervalMs
    );

    this.telemetryService = new TelemetryService(
      this.identity.agentId,
      this.controlPlaneClient,
      this.engineController,
      this.config.telemetryIntervalMs
    );

    // 8. Inicia Supervisão do Engine e Serviços
    try {
      await this.supervisor.start();
    } catch {
      // Falha inicial de IPC não impede o Agent de continuar e tentar recuperar
      this.transitionState(AgentLifecycleState.DEGRADED);
    }

    this.heartbeatService.start();
    this.telemetryService.start();

    // Inicia conexão do Control Plane (outbound)
    await this.controlPlaneClient.connect();

    if (this.state !== AgentLifecycleState.DEGRADED && this.state !== AgentLifecycleState.STOPPED_FOR_SAFETY) {
      this.transitionState(AgentLifecycleState.RUNNING);
    }

    await this.saveStateSnapshot();
    this.emit('started', { agentId: this.identity.agentId, state: this.state });
  }

  public async stop(): Promise<void> {
    if (this.state === AgentLifecycleState.STOPPED || this.state === AgentLifecycleState.STOPPING) {
      return;
    }

    this.transitionState(AgentLifecycleState.STOPPING);

    // 1. Para serviços periódicos
    this.heartbeatService?.stop();
    this.telemetryService?.stop();

    // 2. Para supervisor e processo do Engine
    if (this.supervisor) {
      await this.supervisor.stop();
    }

    // 3. Desconecta do Control Plane
    if (this.controlPlaneClient) {
      await this.controlPlaneClient.disconnect();
    }

    this.transitionState(AgentLifecycleState.STOPPED);
    await this.saveStateSnapshot();
    this.emit('stopped');
  }

  public getState(): AgentLifecycleState {
    return this.state;
  }

  public getIdentity(): AgentIdentity {
    return this.identity;
  }

  public getConfig(): AgentConfig {
    return this.configManager.getConfig();
  }

  public getHealthService(): HealthService {
    return this.healthService;
  }

  public getEngineController(): EngineController {
    return this.engineController;
  }

  public getSupervisor(): EngineSupervisor {
    return this.supervisor;
  }

  public getCommandDispatcher(): CommandDispatcher {
    return this.commandDispatcher;
  }

  public getControlPlaneClient(): ControlPlaneClient {
    return this.controlPlaneClient;
  }

  public getSpoolQueue(): SpoolQueue {
    return this.spoolQueue;
  }

  public getConfigManager(): ConfigurationManager {
    return this.configManager;
  }

  private transitionState(newState: AgentLifecycleState): void {
    const oldState = this.state;
    this.state = newState;
    this.emit('state_changed', { oldState, newState });
  }

  private async saveStateSnapshot(): Promise<void> {
    if (this.stateStore) {
      await this.stateStore.saveState({
        lifecycleState: this.state,
        lastStateChange: new Date().toISOString(),
        configVersion: this.config?.configurationVersion || 1,
        crashRecoveryCount: this.supervisor?.getMetrics().crashCount || 0,
        activeJobsCount: 0
      });
    }
  }
}
