import { EventEmitter } from 'node:events';
import { IpcClient } from '../ipc/ipc-client.js';
import { EngineProcessState } from '../domain/states.js';

export interface ProcessStatus {
  state: EngineProcessState;
  pid?: number;
  ipcConnected: boolean;
  uptimeSeconds: number;
}

export class EngineProcessManager extends EventEmitter {
  private state: EngineProcessState = EngineProcessState.STOPPED;
  private pid?: number;
  private startTime: number = 0;
  private ipcClient: IpcClient | null = null;

  constructor(
    private readonly socketPath: string,
    private readonly authToken: string
  ) {
    super();
  }

  public async startProcess(embeddedWorkerLauncher?: () => Promise<number>): Promise<void> {
    if (this.state === EngineProcessState.RUNNING) return;

    this.state = EngineProcessState.STARTING;
    this.emit('state_changed', this.state);

    try {
      if (embeddedWorkerLauncher) {
        this.pid = await embeddedWorkerLauncher();
      } else {
        // PID do processo em execução no ambiente
        this.pid = process.pid;
      }

      this.startTime = Date.now();
      this.ipcClient = new IpcClient(this.socketPath, this.authToken);
      this.ipcClient.on('error', () => {});

      // Conecta ao IPC do Engine
      await this.ipcClient.connect(5000);

      this.ipcClient.on('event', (action, payload) => {
        this.emit('engine_event', action, payload);
      });

      this.ipcClient.on('disconnected', () => {
        if (this.state === EngineProcessState.RUNNING) {
          this.state = EngineProcessState.CRASHED;
          this.emit('process_crashed', new Error('Canal IPC do Engine desconectou inesperadamente.'));
          this.emit('state_changed', this.state);
        }
      });

      this.state = EngineProcessState.RUNNING;
      this.emit('state_changed', this.state);
    } catch (err) {
      this.state = EngineProcessState.CRASHED;
      this.emit('state_changed', this.state);
      throw err;
    }
  }

  public async stopProcess(): Promise<void> {
    if (this.state === EngineProcessState.STOPPED) return;

    this.state = EngineProcessState.STOPPED;
    if (this.ipcClient) {
      try {
        await this.ipcClient.sendCommand('SHUTDOWN', {}, 3000);
      } catch {}
      this.ipcClient.disconnect();
      this.ipcClient = null;
    }
    this.pid = undefined;
    this.startTime = 0;
    this.emit('state_changed', this.state);
  }

  public async restartProcess(launcher?: () => Promise<number>): Promise<void> {
    await this.stopProcess();
    await this.startProcess(launcher);
  }

  public getStatus(): ProcessStatus {
    return {
      state: this.state,
      pid: this.pid,
      ipcConnected: this.ipcClient?.isReady() || false,
      uptimeSeconds: this.startTime > 0 ? Math.floor((Date.now() - this.startTime) / 1000) : 0
    };
  }

  public getIpcClient(): IpcClient | null {
    return this.ipcClient;
  }
}
