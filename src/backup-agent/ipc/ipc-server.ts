import * as net from 'node:net';
import * as fs from 'node:fs';
import { EventEmitter } from 'node:events';
import { IpcFramer } from './framing.js';
import { IpcMessage } from './contracts.js';
import { TokenManager } from '../security/token-manager.js';

export type IpcRequestHandler = (message: IpcMessage) => Promise<unknown>;

export class IpcServer extends EventEmitter {
  private server: net.Server | null = null;
  private readonly authenticatedSockets = new Set<net.Socket>();
  private isListening = false;

  constructor(
    private readonly socketPath: string,
    private readonly authToken: string,
    private readonly requestHandler: IpcRequestHandler
  ) {
    super();
  }

  public async start(): Promise<void> {
    if (this.isListening) return;

    // No Linux/Unix, remove arquivo de socket antigo órfão se existir
    if (process.platform !== 'win32') {
      try {
        if (fs.existsSync(this.socketPath)) {
          fs.unlinkSync(this.socketPath);
        }
      } catch {}
    }

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => this.handleConnection(socket));

      this.server.on('error', (err) => {
        this.emit('error', err);
        if (!this.isListening) reject(err);
      });

      this.server.listen(this.socketPath, () => {
        this.isListening = true;

        // No Linux/Unix, restringe permissão do socket exclusivamente ao proprietário (0600)
        if (process.platform !== 'win32') {
          try {
            fs.chmodSync(this.socketPath, 0o600);
          } catch {}
        }

        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    if (!this.server) return;

    for (const socket of this.authenticatedSockets) {
      try { socket.destroy(); } catch {}
    }
    this.authenticatedSockets.clear();

    return new Promise((resolve) => {
      this.server?.close(() => {
        this.isListening = false;
        if (process.platform !== 'win32') {
          try {
            if (fs.existsSync(this.socketPath)) fs.unlinkSync(this.socketPath);
          } catch {}
        }
        resolve();
      });
    });
  }

  public broadcastEvent(action: string, payload: unknown): void {
    const eventMsg: IpcMessage = {
      type: 'EVENT',
      action,
      payload,
      timestamp: new Date().toISOString()
    };

    const encoded = IpcFramer.encode(eventMsg);
    for (const socket of this.authenticatedSockets) {
      try {
        socket.write(encoded);
      } catch {}
    }
  }

  private handleConnection(socket: net.Socket): void {
    const framer = new IpcFramer();

    // Timeout de 5 segundos para autenticação inicial do handshake
    const authTimeout = setTimeout(() => {
      if (!this.authenticatedSockets.has(socket)) {
        const errorMsg: IpcMessage = {
          type: 'AUTH_FAILED',
          error: 'TIMEOUT_AUTHENTICATION_REQUIRED',
          timestamp: new Date().toISOString()
        };
        socket.write(IpcFramer.encode(errorMsg));
        socket.destroy();
      }
    }, 5000);

    framer.on('message', async (message: IpcMessage) => {
      // 1. Handshake de Autenticação
      if (!this.authenticatedSockets.has(socket)) {
        if (message.type === 'AUTH' && message.token && TokenManager.timingSafeVerify(message.token, this.authToken)) {
          clearTimeout(authTimeout);
          this.authenticatedSockets.add(socket);
          const okMsg: IpcMessage = {
            type: 'AUTH_OK',
            timestamp: new Date().toISOString()
          };
          socket.write(IpcFramer.encode(okMsg));
          this.emit('client_authenticated', socket);
          return;
        } else {
          clearTimeout(authTimeout);
          const failMsg: IpcMessage = {
            type: 'AUTH_FAILED',
            error: 'INVALID_IPC_AUTH_TOKEN',
            timestamp: new Date().toISOString()
          };
          socket.write(IpcFramer.encode(failMsg));
          socket.destroy();
          return;
        }
      }

      // 2. Ping / Pong
      if (message.type === 'PING') {
        const pongMsg: IpcMessage = {
          type: 'PONG',
          requestId: message.requestId,
          timestamp: new Date().toISOString()
        };
        socket.write(IpcFramer.encode(pongMsg));
        return;
      }

      // 3. Comandos / Requisições
      if (message.type === 'COMMAND') {
        try {
          const result = await this.requestHandler(message);
          const respMsg: IpcMessage = {
            type: 'RESPONSE',
            requestId: message.requestId,
            action: message.action,
            payload: result,
            timestamp: new Date().toISOString()
          };
          socket.write(IpcFramer.encode(respMsg));
        } catch (err: any) {
          const errResp: IpcMessage = {
            type: 'RESPONSE',
            requestId: message.requestId,
            action: message.action,
            error: err?.message || 'Erro interno no processamento IPC',
            timestamp: new Date().toISOString()
          };
          socket.write(IpcFramer.encode(errResp));
        }
      }
    });

    framer.on('error', (err) => {
      this.emit('client_error', err);
      socket.destroy();
    });

    socket.on('data', (chunk) => framer.push(chunk));

    socket.on('close', () => {
      clearTimeout(authTimeout);
      this.authenticatedSockets.delete(socket);
    });

    socket.on('error', () => {
      clearTimeout(authTimeout);
      this.authenticatedSockets.delete(socket);
    });
  }
}
