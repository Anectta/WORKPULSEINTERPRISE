import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

/**
 * Utilitário de persistência atômica segura no disco
 * Garante que falhas no meio da escrita não corrompam o arquivo original
 */
export class AtomicFileStore {
  public static async writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    const tmpPath = `${filePath}.${crypto.randomUUID()}.tmp`;
    const jsonStr = JSON.stringify(data, null, 2);
    await fs.writeFile(tmpPath, jsonStr, { encoding: 'utf-8', mode: 0o600 });
    await fs.rename(tmpPath, filePath);
  }

  public static async readJson<T>(filePath: string): Promise<T | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  public static async removeFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {}
  }
}
