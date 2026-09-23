import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface FixtureManifest {
  rootDir: string;
  files: {
    relativePath: string;
    size: number;
    sha256: string;
    isUnicode?: boolean;
    isEmpty?: boolean;
    isLarge?: boolean;
  }[];
}

/**
 * Gerador determinístico de fixtures de arquivos para testes do Backup Engine e Agent.
 */
export class TestDatasetGenerator {
  /**
   * Gera um conjunto controlado de arquivos de teste para validações de backup e restore.
   */
  public static async createStandardDataset(baseDir: string): Promise<FixtureManifest> {
    await fs.mkdir(baseDir, { recursive: true });

    const manifest: FixtureManifest = {
      rootDir: baseDir,
      files: []
    };

    // 1. Arquivo vazio
    const emptyPath = 'empty.txt';
    await fs.writeFile(path.join(baseDir, emptyPath), Buffer.alloc(0));
    manifest.files.push({
      relativePath: emptyPath,
      size: 0,
      sha256: crypto.createHash('sha256').update(Buffer.alloc(0)).digest('hex'),
      isEmpty: true
    });

    // 2. Arquivos normais de texto com conteúdo determinístico
    for (let i = 1; i <= 3; i++) {
      const rel = `docs/file_${i}.txt`;
      const fullPath = path.join(baseDir, rel);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      const content = Buffer.from(`Deterministic Test Document #${i} - WorkPulse Enterprise Backup Engine\nTimestamp: 2026-09-11T00:00:00Z\nLine 3 of data content.`);
      await fs.writeFile(fullPath, content);
      manifest.files.push({
        relativePath: rel,
        size: content.length,
        sha256: crypto.createHash('sha256').update(content).digest('hex')
      });
    }

    // 3. Arquivo com caracteres especiais e Unicode internacional
    const unicodeRel = 'internacional/ação_relatório_日本語_файл_🚀.txt';
    const unicodeFullPath = path.join(baseDir, unicodeRel);
    await fs.mkdir(path.dirname(unicodeFullPath), { recursive: true });
    const unicodeContent = Buffer.from('Relatório de Auditoria LGPD & WorkPulse Infraestrutura: 100% íntegro 🔒 🚀 日本語データ');
    await fs.writeFile(unicodeFullPath, unicodeContent);
    manifest.files.push({
      relativePath: unicodeRel,
      size: unicodeContent.length,
      sha256: crypto.createHash('sha256').update(unicodeContent).digest('hex'),
      isUnicode: true
    });

    // 4. Estrutura profunda de diretórios
    const deepRel = 'level1/level2/level3/level4/level5/deeply_nested.json';
    const deepFullPath = path.join(baseDir, deepRel);
    await fs.mkdir(path.dirname(deepFullPath), { recursive: true });
    const deepContent = Buffer.from(JSON.stringify({ nested: true, level: 5, status: 'VERIFIED' }));
    await fs.writeFile(deepFullPath, deepContent);
    manifest.files.push({
      relativePath: deepRel,
      size: deepContent.length,
      sha256: crypto.createHash('sha256').update(deepContent).digest('hex')
    });

    // 5. Arquivo binário pseudo-aleatório controlado (1 MB)
    const largeRel = 'binary/pseudo_random_1mb.bin';
    const largeFullPath = path.join(baseDir, largeRel);
    await fs.mkdir(path.dirname(largeFullPath), { recursive: true });
    const largeBuffer = Buffer.alloc(1024 * 1024);
    for (let i = 0; i < largeBuffer.length; i += 4) {
      largeBuffer.writeUInt32BE((i * 1664525 + 1013904223) >>> 0, i);
    }
    await fs.writeFile(largeFullPath, largeBuffer);
    manifest.files.push({
      relativePath: largeRel,
      size: largeBuffer.length,
      sha256: crypto.createHash('sha256').update(largeBuffer).digest('hex'),
      isLarge: true
    });

    return manifest;
  }

  /**
   * Modifica incrementalmente o dataset (adiciona 1, modifica 1, remove 1)
   */
  public static async applyModifications(baseDir: string): Promise<{
    added: string;
    modified: string;
    deleted: string;
  }> {
    // Adição
    const addedRel = 'docs/new_incremental_file.txt';
    const addedPath = path.join(baseDir, addedRel);
    await fs.writeFile(addedPath, Buffer.from('New file added during incremental cycle'));

    // Modificação
    const modRel = 'docs/file_1.txt';
    const modPath = path.join(baseDir, modRel);
    await fs.appendFile(modPath, Buffer.from('\n[EDITED]: Additional audit line appended for modification detection.'));

    // Remoção
    const delRel = 'empty.txt';
    const delPath = path.join(baseDir, delRel);
    await fs.unlink(delPath);

    return {
      added: addedRel,
      modified: modRel,
      deleted: delRel
    };
  }
}
