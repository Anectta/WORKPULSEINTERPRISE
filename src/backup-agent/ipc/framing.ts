import { EventEmitter } from 'node:events';

/**
 * Codificador e Decodificador de Framing com prefixo de tamanho de 4 bytes (UInt32BE).
 * Protege contra fragmentação de rede/socket e payloads maliciosos gigantes (>16MB).
 */
export class IpcFramer extends EventEmitter {
  private static readonly MAX_FRAME_SIZE = 16 * 1024 * 1024; // 16 MB
  private buffer: Buffer = Buffer.alloc(0);

  public static encode(message: unknown): Buffer {
    const json = JSON.stringify(message);
    const payload = Buffer.from(json, 'utf-8');
    const header = Buffer.alloc(4);
    header.writeUInt32BE(payload.length, 0);
    return Buffer.concat([header, payload]);
  }

  public push(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= 4) {
      const frameLength = this.buffer.readUInt32BE(0);

      if (frameLength > IpcFramer.MAX_FRAME_SIZE) {
        this.emit('error', new Error(`Frame IPC excede o limite máximo seguro de ${IpcFramer.MAX_FRAME_SIZE} bytes: ${frameLength}`));
        this.buffer = Buffer.alloc(0);
        return;
      }

      if (this.buffer.length < 4 + frameLength) {
        // Aguarda os próximos bytes chegarem pelo socket
        break;
      }

      const payloadBuf = this.buffer.subarray(4, 4 + frameLength);
      this.buffer = this.buffer.subarray(4 + frameLength);

      try {
        const jsonStr = payloadBuf.toString('utf-8');
        const parsed = JSON.parse(jsonStr);
        this.emit('message', parsed);
      } catch (err) {
        this.emit('error', new Error(`Falha ao decodificar JSON do frame IPC: ${(err as Error).message}`));
      }
    }
  }

  public reset(): void {
    this.buffer = Buffer.alloc(0);
  }
}
