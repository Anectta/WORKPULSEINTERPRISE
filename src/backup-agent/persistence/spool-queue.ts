import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { AtomicFileStore } from './file-store.js';

export interface SpoolItem<T = unknown> {
  id: string;
  type: 'EVENT' | 'TELEMETRY' | 'COMMAND_RESULT';
  createdAt: string;
  attempts: number;
  payload: T;
}

export class SpoolQueue {
  private readonly spoolFilePath: string;
  private items: SpoolItem[] = [];
  private isLoaded = false;
  private readonly maxCapacity: number;

  constructor(dataDir: string, maxCapacity: number = 5000) {
    this.spoolFilePath = path.join(dataDir, 'spool-queue.json');
    this.maxCapacity = maxCapacity;
  }

  public async init(): Promise<void> {
    if (this.isLoaded) return;
    const loaded = await AtomicFileStore.readJson<SpoolItem[]>(this.spoolFilePath);
    if (loaded && Array.isArray(loaded)) {
      this.items = loaded;
    } else {
      this.items = [];
    }
    this.isLoaded = true;
  }

  public async enqueue(type: 'EVENT' | 'TELEMETRY' | 'COMMAND_RESULT', payload: unknown): Promise<SpoolItem> {
    await this.init();

    // Se atingir capacidade máxima, descarta itens de telemetria mais antigos preservando eventos e resultados de comandos
    if (this.items.length >= this.maxCapacity) {
      const telemetryIdx = this.items.findIndex(i => i.type === 'TELEMETRY');
      if (telemetryIdx !== -1) {
        this.items.splice(telemetryIdx, 1);
      } else {
        this.items.shift(); // descarta o mais antigo
      }
    }

    const item: SpoolItem = {
      id: crypto.randomUUID(),
      type,
      createdAt: new Date().toISOString(),
      attempts: 0,
      payload
    };

    this.items.push(item);
    await this.flushToDisk();
    return item;
  }

  public async peek(batchSize: number = 50): Promise<SpoolItem[]> {
    await this.init();
    return this.items.slice(0, batchSize);
  }

  public async acknowledge(ids: string[]): Promise<void> {
    await this.init();
    const idSet = new Set(ids);
    this.items = this.items.filter(i => !idSet.has(i.id));
    await this.flushToDisk();
  }

  public async incrementAttempts(id: string): Promise<void> {
    await this.init();
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.attempts++;
      await this.flushToDisk();
    }
  }

  public size(): number {
    return this.items.length;
  }

  public async clear(): Promise<void> {
    this.items = [];
    await this.flushToDisk();
  }

  private async flushToDisk(): Promise<void> {
    await AtomicFileStore.writeJsonAtomic(this.spoolFilePath, this.items);
  }
}
