import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { FilesystemProvider, FileMetadata, FileIdentity } from '../core/contracts.js';
import { EngineError, ErrorCategory } from '../core/errors.js';

export class LocalFilesystemProvider implements FilesystemProvider {
  public async *scanDirectory(
    rootPath: string,
    options: { recursive?: boolean; followSymlinks?: boolean } = {}
  ): AsyncIterable<FileMetadata> {
    const resolvedRoot = path.resolve(rootPath);
    const recursive = options.recursive ?? true;

    async function* walk(currentDir: string): AsyncIterable<FileMetadata> {
      let dirEntries: fs.Dirent[];
      try {
        dirEntries = await fsp.readdir(currentDir, { withFileTypes: true });
      } catch (err) {
        throw new EngineError({
          code: 'FS_READDIR_FAILED',
          message: `Falha ao ler diretório de origem: ${currentDir}`,
          category: ErrorCategory.FILESYSTEM,
          cause: err
        });
      }

      for (const entry of dirEntries) {
        const fullEntryPath = path.join(currentDir, entry.name);
        try {
          const stats = await fsp.lstat(fullEntryPath);
          const isSymlink = stats.isSymbolicLink();
          const isDirectory = stats.isDirectory();
          const isHidden = entry.name.startsWith('.') || (process.platform === 'win32' && entry.name.startsWith('~$'));

          const identity: FileIdentity = {
            uniqueIdentifier: `${stats.dev}-${stats.ino || entry.name}`,
            volumeId: String(stats.dev),
            inodeOrIndex: String(stats.ino)
          };

          const meta: FileMetadata = {
            path: fullEntryPath,
            name: entry.name,
            sizeBytes: stats.size,
            modifiedAtMs: stats.mtimeMs,
            createdAtMs: stats.birthtimeMs,
            accessedAtMs: stats.atimeMs,
            isDirectory,
            isSymlink,
            isHidden,
            isSystem: false,
            permissionsMode: stats.mode,
            identity
          };

          yield meta;

          if (isDirectory && recursive && (!isSymlink || options.followSymlinks)) {
            yield* walk(fullEntryPath);
          }
        } catch (itemErr) {
          console.warn(`[FilesystemProvider] Aviso ao ler item ${fullEntryPath}:`, itemErr);
        }
      }
    }

    yield* walk(resolvedRoot);
  }

  public async getFileMetadata(filePath: string): Promise<FileMetadata> {
    const resolved = path.resolve(filePath);
    try {
      const stats = await fsp.stat(resolved);
      const identity: FileIdentity = {
        uniqueIdentifier: `${stats.dev}-${stats.ino || path.basename(resolved)}`,
        volumeId: String(stats.dev),
        inodeOrIndex: String(stats.ino)
      };

      return {
        path: resolved,
        name: path.basename(resolved),
        sizeBytes: stats.size,
        modifiedAtMs: stats.mtimeMs,
        createdAtMs: stats.birthtimeMs,
        accessedAtMs: stats.atimeMs,
        isDirectory: stats.isDirectory(),
        isSymlink: stats.isSymbolicLink(),
        isHidden: path.basename(resolved).startsWith('.'),
        isSystem: false,
        permissionsMode: stats.mode,
        identity
      };
    } catch (err) {
      throw new EngineError({
        code: 'FS_STAT_FAILED',
        message: `Não foi possível obter metadados do arquivo: ${filePath}`,
        category: ErrorCategory.FILESYSTEM,
        cause: err
      });
    }
  }

  public async openReadStream(filePath: string, options?: { start?: number; end?: number }): Promise<Readable> {
    const resolved = path.resolve(filePath);
    try {
      await fsp.access(resolved, fs.constants.R_OK);
      return fs.createReadStream(resolved, options);
    } catch (err) {
      throw new EngineError({
        code: 'FS_OPEN_STREAM_FAILED',
        message: `Falha ao abrir stream de leitura para: ${filePath}`,
        category: ErrorCategory.FILESYSTEM,
        cause: err,
        retryable: true
      });
    }
  }

  public async calculateHash(filePath: string): Promise<string> {
    const resolved = path.resolve(filePath);
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(resolved);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) =>
        reject(
          new EngineError({
            code: 'FS_HASH_CALC_FAILED',
            message: `Erro ao calcular hash SHA-256 de ${filePath}`,
            category: ErrorCategory.INTEGRITY,
            cause: err
          })
        )
      );
    });
  }
}
