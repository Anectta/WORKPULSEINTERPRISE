import * as net from 'node:net';
import * as crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { IpcFramer } from './framing.js';
import { IpcMessage } from './contracts.js';

export class IpcClient extends EventEmitter {
  private socket: net.Socket | null = null;
  private isConnected = false;
  private isAuthenticated = false;
  private readonly pendingRequests = new Map<string, {
    resolve: (val: any) => void;
    reject: (err: Error) => void;
    timer: NodeJS.Timeout;
  }>();

  constructor(
    private readonly socketPath: string,
    private readonly authToken: string
  ) {
    super();
  }

  public async connect(timeoutMs: number = 5000): Promise<void> {
    if (this.isConnected && this.isAuthenticated) return;

    return new Promise((resolve, reject) => {
      const socket = net.connect(this.socketPath);
      const framer = new IpcFramer();

      const connectionTimeout = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Timeout de ${timeoutMs}ms ao conectar no IPC socket "${this.socketPath}".`));
      }, timeoutMs);

      socket.on('connect', () => {
        this.socket = socket;
        this.isConnected = true;

        // Envia frame AUTH
        const authMsg: IpcMessage = {
          type: 'AUTH',
          token: this.authToken,
          timestamp: new Date().toISOString()
        };
        socket.write(IpcFramer.encode(authMsg));
      });

      framer.on('message', (msg: IpcMessage) => {
        if (msg.type === 'AUTH_OK') {
          clearTimeout(connectionTimeout);
          this.isAuthenticated = true;
          this.emit('authenticated');
          resolve();
          return;
        }

        if (msg.type === 'AUTH_FAILED') {
          clearTimeout(connectionTimeout);
          socket.destroy();
          reject(new Error(`Autenticação IPC falhou: ${msg.error || 'Token rejeitado'}`));
          return;
        }

        if (msg.type === 'RESPONSE' && msg.requestId) {
          const pending = this.pendingRequests.get(msg.requestId);
          if (pending) {
            clearTimeout(pending.timer);
            this.pendingRequests.delete(msg.requestId);
            if (msg.error) {
              pending.reject(new Error(msg.error));
            } else {
              pending.resolve(msg.payload);
            }
          }
          return;
        }

        if (msg.type === 'PONG' && msg.requestId) {
          const pending = this.pendingRequests.get(msg.requestId);
          if (pending) {
            clearTimeout(pending.timer);
            this.pendingRequests.delete(msg.requestId);
            pending.resolve(true);
          }
          return;
        }

        if (msg.type === 'EVENT') {
          this.emit('event', msg.action, msg.payload);
          return;
        }
      });

      framer.on('error', (err) => {
        if (this.listenerCount('error') > 0) {
          this.emit('error', err);
        }
      });

      socket.on('data', (chunk) => framer.push(chunk));

      socket.on('close', () => {
        clearTimeout(connectionTimeout);
        this.isConnected = false;
        this.isAuthenticated = false;
        this.socket = null;
        this.cleanupPending(new Error('Conexão IPC encerrada pelo servidor.'));
        this.emit('disconnected');
      });

      socket.on('error', (err) => {
        clearTimeout(connectionTimeout);
        if (this.listenerCount('error') > 0) {
          this.emit('error', err);
        }
        if (!this.isConnected) {
          reject(err);
        }
      });
    });
  }

  public async sendCommand<T = unknown>(action: string, payload?: unknown, timeoutMs: number = 30000): Promise<T> {
    if (!this.socket || !this.isAuthenticated) {
      throw new Error('Canal IPC não está conectado e autenticado.');
    }

    const requestId = crypto.randomUUID();
    const msg: IpcMessage = {
      type: 'COMMAND',
      requestId,
      action,
      payload,
      timestamp: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Timeout IPC de ${timeoutMs}ms aguardando resposta para ação "${action}".`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timer });
      this.socket?.write(IpcFramer.encode(msg));
    });
  }

  public async ping(timeoutMs: number = 2000): Promise<boolean> {
    if (!this.socket || !this.isAuthenticated) return false;

    const requestId = crypto.randomUUID();
    const msg: IpcMessage = {
      type: 'PING',
      requestId,
      timestamp: new Date().toISOString()
    };

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        resolve(false);
      }, timeoutMs);

      this.pendingRequests.set(requestId, {
        resolve: () => resolve(true),
        reject: () => resolve(false),
        timer
      });

      this.socket?.write(IpcFramer.encode(msg));
    });
  }

  public disconnect(): void {
    if (this.socket) {
      try { this.socket.destroy(); } catch {}
      this.socket = null;
    }
    this.isConnected = false;
    this.isAuthenticated = false;
    this.cleanupPending(new Error('Canal IPC desconectado pelo cliente.'));
  }

  public isReady(): boolean {
    return this.isConnected && this.isAuthenticated;
  }

  private cleanupPending(err: Error): void {
    for (const [, req] of this.pendingRequests) {
      clearTimeout(req.timer);
      req.reject(err);
    }
    this.pendingRequests.clear();
  }
}
