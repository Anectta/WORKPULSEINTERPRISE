import * as path from 'node:path';
import { AtomicFileStore } from './file-store.js';
import { CommandResult } from '../domain/commands.js';

interface StoredCommandEntry {
  commandId: string;
  result: CommandResult;
  timestamp: string;
}

export class CommandDeduplicationStore {
  private readonly storeFilePath: string;
  private entries = new Map<string, StoredCommandEntry>();
  private isLoaded = false;
  private readonly ttlMs: number;

  constructor(dataDir: string, ttlMs: number = 7 * 24 * 60 * 60 * 1000) { // 7 dias padrão
    this.storeFilePath = path.join(dataDir, 'command-dedup.json');
    this.ttlMs = ttlMs;
  }

  public async init(): Promise<void> {
    if (this.isLoaded) return;
    const loaded = await AtomicFileStore.readJson<StoredCommandEntry[]>(this.storeFilePath);
    if (loaded && Array.isArray(loaded)) {
      const now = Date.now();
      for (const entry of loaded) {
        if (now - new Date(entry.timestamp).getTime() < this.ttlMs) {
          this.entries.set(entry.commandId, entry);
        }
      }
    }
    this.isLoaded = true;
  }

  public async get(commandId: string): Promise<CommandResult | null> {
    await this.init();
    const entry = this.entries.get(commandId);
    if (!entry) return null;

    if (Date.now() - new Date(entry.timestamp).getTime() > this.ttlMs) {
      this.entries.delete(commandId);
      await this.persist();
      return null;
    }

    return entry.result;
  }

  public async save(result: CommandResult): Promise<void> {
    await this.init();
    this.entries.set(result.commandId, {
      commandId: result.commandId,
      result,
      timestamp: new Date().toISOString()
    });
    await this.persist();
  }

  private async persist(): Promise<void> {
    const list = Array.from(this.entries.values());
    await AtomicFileStore.writeJsonAtomic(this.storeFilePath, list);
  }
}
