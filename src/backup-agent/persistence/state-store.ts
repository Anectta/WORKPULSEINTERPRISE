import * as path from 'node:path';
import { AtomicFileStore } from './file-store.js';
import { AgentLifecycleState } from '../domain/states.js';

export interface PersistentAgentState {
  lifecycleState: AgentLifecycleState;
  lastStateChange: string;
  enginePid?: number;
  lastConfigSyncAt?: string;
  configVersion: number;
  crashRecoveryCount: number;
  lastCrashAt?: string;
  activeJobsCount: number;
}

export class AgentStateStore {
  private readonly stateFilePath: string;

  constructor(dataDir: string) {
    this.stateFilePath = path.join(dataDir, 'agent-state.json');
  }

  public async loadState(): Promise<PersistentAgentState> {
    const loaded = await AtomicFileStore.readJson<PersistentAgentState>(this.stateFilePath);
    if (loaded) return loaded;

    return {
      lifecycleState: AgentLifecycleState.INITIALIZING,
      lastStateChange: new Date().toISOString(),
      configVersion: 1,
      crashRecoveryCount: 0,
      activeJobsCount: 0
    };
  }

  public async saveState(state: PersistentAgentState): Promise<void> {
    state.lastStateChange = new Date().toISOString();
    await AtomicFileStore.writeJsonAtomic(this.stateFilePath, state);
  }
}
