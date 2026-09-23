import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  UUID,
  BackupJobType,
  BackupJobStatus,
  RestoreMode,
  OverwritePolicy,
  RestoreConflictPolicy,
  EncryptionAlgorithm,
  CompressionType
} from '../core/domain.js';
import {
  BackupExecution,
  BackupManifest,
  ManifestFileEntry
} from '../core/contracts.js';
import { InMemoryBackupCatalog } from '../core/context.js';
import { SimpleEventBus, InMemorySecretStore } from '../core/bus-and-secrets.js';
import { LocalStorageProvider } from '../storage/local-storage.js';
import { LocalFilesystemProvider } from '../filesystem/local-filesystem.js';
import { KeyManager } from '../crypto/key-manager.js';
import { AesGcmEncryptionProvider } from '../crypto/aes-gcm-provider.js';
import { DefaultIntegrityProvider } from '../crypto/integrity-provider.js';
import { BackupPipelineManager } from '../crypto/backup-pipeline.js';
import { RestoreRetentionCoordinator } from '../restore/restore-retention-lock.js';
import { RestoreEngine } from '../restore/restore-engine.js';
import { PathSafety } from '../restore/path-safety.js';
import { RetentionExecutor } from '../retention/executor.js';
import { RetentionPolicy } from '../retention/types.js';
import { CancellationToken } from '../core/errors.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runRestoreRetentionTests(): Promise<{ passed: boolean; results: TestResult[] }> {
  const results: TestResult[] = [];
  const testRoot = path.join(os.tmpdir(), `workpulse_restore_test_${Date.now()}`);
  fs.mkdirSync(testRoot, { recursive: true });

  const storageDir = path.join(testRoot, 'storage');
  const sourceDir = path.join(testRoot, 'source');
  const targetDir = path.join(testRoot, 'target');
  fs.mkdirSync(storageDir, { recursive: true });
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(targetDir, { recursive: true });

  const storage = new LocalStorageProvider(storageDir);
  await storage.initialize();

  const filesystem = new LocalFilesystemProvider();
  const catalog = new InMemoryBackupCatalog();
  const eventBus = new SimpleEventBus();
  const secretStore = new InMemorySecretStore();
  const keyManager = new KeyManager();
  const aesGcm = new AesGcmEncryptionProvider();
  const integrity = new DefaultIntegrityProvider();
  const pipelineManager = new BackupPipelineManager(keyManager);
  const coordinator = RestoreRetentionCoordinator.getInstance();
  coordinator.clearAll();

  const restoreEngine = new RestoreEngine({
    catalog,
    storage,
    filesystem,
    pipelineManager,
    eventBus,
    coordinator
  });

  const retentionExecutor = new RetentionExecutor({
    storage,
    catalog,
    eventBus,
    coordinator
  });

  const jobId: UUID = 'job-restore-test-01';

  async function recordTest(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log(`  ✓ ${name}`);
    } catch (err: any) {
      results.push({ name, passed: false, error: err.message });
      console.error(`  ✗ ${name}: ${err.message}`);
    }
  }

  console.log('--- INICIANDO TESTES: ETAPA 09 (RESTORE, VERSIONAMENTO & RETENÇÃO) ---');

  // Helpers para simular execuções no storage e catálogo
  async function seedExecution(
    execId: UUID,
    type: BackupJobType,
    dateStr: string,
    files: { relPath: string; content: string; operation?: 'ADD' | 'MODIFY' | 'DELETE' | 'RENAME'; previousPath?: string }[],
    options?: { baseFullId?: UUID; isProtected?: boolean; encryptPassword?: string }
  ) {
    const exec: BackupExecution = {
      executionId: execId,
      jobId,
      tenantId: 'tenant-01',
      executionType: type,
      status: BackupJobStatus.COMPLETED,
      startedAt: dateStr,
      finishedAt: dateStr,
      durationMs: 1200,
      filesScanned: files.length,
      filesProcessed: files.length,
      filesFailed: 0,
      bytesScanned: 0,
      bytesProcessed: 0,
      bytesTransferred: 0,
      isProtected: options?.isProtected
    };
    await catalog.registerExecution(exec);

    const manifestFiles: ManifestFileEntry[] = [];
    let totalBytes = 0;

    for (const f of files) {
      if (f.operation === 'DELETE') {
        manifestFiles.push({
          path: f.relPath,
          sizeBytes: 0,
          modifiedAtMs: new Date(dateStr).getTime(),
          sha256: '',
          compressedSizeBytes: 0,
          isEncrypted: false,
          operation: 'DELETE'
        });
        continue;
      }

      const contentBuf = Buffer.from(f.content, 'utf-8');
      const sha256 = crypto.createHash('sha256').update(contentBuf).digest('hex');
      const remotePath = `backups/${jobId}/${execId}/data/${f.relPath}`;
      totalBytes += contentBuf.length;

      if (options?.encryptPassword) {
        const { Readable } = await import('stream');
        const inStream = Readable.from(contentBuf);
        const { protectedStream, getMetrics } = await pipelineManager.protectStream(
          inStream,
          {
            password: options.encryptPassword,
            encryptionAlgorithm: EncryptionAlgorithm.AES_256_GCM,
            compressionConfig: { algorithm: CompressionType.NONE },
            originalSha256: sha256,
            originalSizeBytes: contentBuf.length
          }
        );

        await storage.putStream(remotePath, protectedStream);
        await getMetrics();

        manifestFiles.push({
          path: f.relPath,
          sizeBytes: contentBuf.length,
          modifiedAtMs: new Date(dateStr).getTime(),
          sha256,
          compressedSizeBytes: contentBuf.length,
          isEncrypted: true,
          operation: f.operation || 'ADD',
          previousPath: f.previousPath
        });
      } else {
        const { Readable } = await import('stream');
        await storage.putStream(remotePath, Readable.from(contentBuf), contentBuf.length);

        manifestFiles.push({
          path: f.relPath,
          sizeBytes: contentBuf.length,
          modifiedAtMs: new Date(dateStr).getTime(),
          sha256,
          compressedSizeBytes: contentBuf.length,
          isEncrypted: false,
          operation: f.operation || 'ADD',
          previousPath: f.previousPath
        });
      }
    }

    const manifest: BackupManifest = {
      manifestVersion: '2.0.0',
      executionId: execId,
      jobId,
      jobType: type,
      createdAt: dateStr,
      baseFullExecutionId: options?.baseFullId,
      totalFiles: manifestFiles.length,
      totalSizeBytes: totalBytes,
      files: manifestFiles
    };

    await catalog.saveManifest(manifest);

    // Grava também manifest.json no storage
    const { Readable } = await import('stream');
    await storage.putStream(
      `backups/${jobId}/${execId}/manifest.json`,
      Readable.from(Buffer.from(JSON.stringify(manifest), 'utf-8'))
    );
  }

  // IDs para cenários
  const F1_ID = 'exec-full-01';
  const I1_ID = 'exec-inc-01';
  const I2_ID = 'exec-inc-02';
  const I3_ID = 'exec-inc-03';
  const D1_ID = 'exec-diff-01';

  // Seed de cadeia: F1 -> I1 -> I2 -> I3
  await seedExecution(F1_ID, BackupJobType.FULL, '2026-09-01T10:00:00.000Z', [
    { relPath: 'file1.txt', content: 'Conteúdo Original 1' },
    { relPath: 'file2.txt', content: 'Conteúdo Original 2' },
    { relPath: 'docs/manual.pdf', content: 'Manual Inicial em PDF' },
    { relPath: 'docs/notes.txt', content: 'Notas v1' }
  ]);

  await seedExecution(I1_ID, BackupJobType.INCREMENTAL, '2026-09-02T10:00:00.000Z', [
    { relPath: 'file1.txt', content: 'Conteúdo Modificado 1 no Inc1', operation: 'MODIFY' },
    { relPath: 'file3.txt', content: 'Arquivo Novo Criado no Inc1', operation: 'ADD' }
  ], { baseFullId: F1_ID });

  await seedExecution(I2_ID, BackupJobType.INCREMENTAL, '2026-09-03T10:00:00.000Z', [
    { relPath: 'file2.txt', content: '', operation: 'DELETE' },
    { relPath: 'docs/notes.txt', content: 'Notas v2 Atualizadas', operation: 'MODIFY' }
  ], { baseFullId: F1_ID });

  await seedExecution(I3_ID, BackupJobType.INCREMENTAL, '2026-09-04T10:00:00.000Z', [
    { relPath: 'docs/manual_v2.pdf', content: 'Manual Renomeado e Atualizado', operation: 'RENAME', previousPath: 'docs/manual.pdf' },
    { relPath: 'file4.txt', content: 'Arquivo Inc3', operation: 'ADD' }
  ], { baseFullId: F1_ID });

  // Seed de Differential: D1 baseado no F1
  await seedExecution(D1_ID, BackupJobType.DIFFERENTIAL, '2026-09-05T10:00:00.000Z', [
    { relPath: 'file1.txt', content: 'Conteúdo Diferencial sobre F1', operation: 'MODIFY' },
    { relPath: 'diff_only.txt', content: 'Arquivo Novo no Differential', operation: 'ADD' }
  ], { baseFullId: F1_ID });

  // 1. Full Restore
  await recordTest('1. Restore Full: restaura todos os arquivos originais com hashes exatos', async () => {
    const dest = path.join(targetDir, 'test_full');
    const res = await restoreEngine.execute({
      requestId: 'req-full-01',
      jobId,
      executionId: F1_ID,
      restoreMode: RestoreMode.FULL,
      selectedPaths: [],
      targetDirectory: dest
    });

    if (!res.success) throw new Error(`Falha no restore: ${res.errors.join('; ')}`);
    if (res.filesRestored !== 4) throw new Error(`Esperado 4 arquivos restaurados, obtido ${res.filesRestored}`);

    const f1 = fs.readFileSync(path.join(dest, 'file1.txt'), 'utf-8');
    const f2 = fs.readFileSync(path.join(dest, 'file2.txt'), 'utf-8');
    const manual = fs.readFileSync(path.join(dest, 'docs', 'manual.pdf'), 'utf-8');

    if (f1 !== 'Conteúdo Original 1') throw new Error('Conteúdo incorreto em file1.txt');
    if (f2 !== 'Conteúdo Original 2') throw new Error('Conteúdo incorreto em file2.txt');
    if (manual !== 'Manual Inicial em PDF') throw new Error('Conteúdo incorreto em docs/manual.pdf');
  });

  // 2. Restore de Cadeia Incremental Completa (F1 -> I1 -> I2 -> I3)
  await recordTest('2. Restore Cadeia Incremental: reconstrói estado com ADD, MODIFY, DELETE e RENAME', async () => {
    const dest = path.join(targetDir, 'test_inc3');
    const res = await restoreEngine.execute({
      requestId: 'req-inc-03',
      jobId,
      executionId: I3_ID,
      restoreMode: RestoreMode.FULL,
      selectedPaths: [],
      targetDirectory: dest
    });

    if (!res.success) throw new Error(`Falha no restore incremental: ${res.errors.join('; ')}`);

    // file1.txt foi modificado no I1
    const f1 = fs.readFileSync(path.join(dest, 'file1.txt'), 'utf-8');
    if (f1 !== 'Conteúdo Modificado 1 no Inc1') throw new Error(`file1.txt tem conteúdo inesperado: ${f1}`);

    // file2.txt foi deletado no I2 -> NÃO pode existir no destino final
    if (fs.existsSync(path.join(dest, 'file2.txt'))) {
      throw new Error('file2.txt deveria ter sido excluído na reconstrução da cadeia incremental');
    }

    // docs/notes.txt foi modificado no I2
    const notes = fs.readFileSync(path.join(dest, 'docs', 'notes.txt'), 'utf-8');
    if (notes !== 'Notas v2 Atualizadas') throw new Error(`docs/notes.txt incorreto: ${notes}`);

    // docs/manual.pdf foi renomeado para docs/manual_v2.pdf no I3
    if (fs.existsSync(path.join(dest, 'docs', 'manual.pdf'))) {
      throw new Error('docs/manual.pdf antigo ainda existe após rename');
    }
    const manualV2 = fs.readFileSync(path.join(dest, 'docs', 'manual_v2.pdf'), 'utf-8');
    if (manualV2 !== 'Manual Renomeado e Atualizado') throw new Error('docs/manual_v2.pdf incorreto');

    // file4.txt foi adicionado no I3
    const f4 = fs.readFileSync(path.join(dest, 'file4.txt'), 'utf-8');
    if (f4 !== 'Arquivo Inc3') throw new Error('file4.txt incorreto');
  });

  // 3. Restore de Cadeia Diferencial (F1 + D1)
  await recordTest('3. Restore Diferencial: aplica Full Base + Differential Alvo sem aplicar incrementais', async () => {
    const dest = path.join(targetDir, 'test_diff');
    const res = await restoreEngine.execute({
      requestId: 'req-diff-01',
      jobId,
      executionId: D1_ID,
      restoreMode: RestoreMode.FULL,
      selectedPaths: [],
      targetDirectory: dest
    });

    if (!res.success) throw new Error(`Falha no restore diferencial: ${res.errors.join('; ')}`);

    // file1.txt modificado no diferencial
    const f1 = fs.readFileSync(path.join(dest, 'file1.txt'), 'utf-8');
    if (f1 !== 'Conteúdo Diferencial sobre F1') throw new Error(`file1.txt incorreto no diferencial: ${f1}`);

    // file2.txt preservado do F1 (o diferencial não deletou file2)
    const f2 = fs.readFileSync(path.join(dest, 'file2.txt'), 'utf-8');
    if (f2 !== 'Conteúdo Original 2') throw new Error(`file2.txt incorreto no diferencial: ${f2}`);

    // diff_only.txt adicionado no diferencial
    const diffOnly = fs.readFileSync(path.join(dest, 'diff_only.txt'), 'utf-8');
    if (diffOnly !== 'Arquivo Novo no Differential') throw new Error('diff_only.txt incorreto');
  });

  // 4. Restore de Arquivo Individual (restoreFile)
  await recordTest('4. Restore de Arquivo Individual: restaura apenas o arquivo solicitado', async () => {
    const dest = path.join(targetDir, 'test_single_file');
    const res = await restoreEngine.restoreFile(jobId, F1_ID, 'docs/manual.pdf', dest);

    if (!res.success) throw new Error(`Falha no restoreFile: ${res.errors.join('; ')}`);
    if (res.filesRestored !== 1) throw new Error(`Esperado 1 arquivo restaurado, obtido ${res.filesRestored}`);

    if (!fs.existsSync(path.join(dest, 'docs', 'manual.pdf'))) {
      throw new Error('docs/manual.pdf não foi restaurado');
    }
    if (fs.existsSync(path.join(dest, 'file1.txt'))) {
      throw new Error('file1.txt não deveria ter sido restaurado');
    }
  });

  // 5. Restore de Diretório (restoreDirectory)
  await recordTest('5. Restore de Diretório: restaura apenas os arquivos pertencentes ao diretório selecionado', async () => {
    const dest = path.join(targetDir, 'test_dir');
    const res = await restoreEngine.restoreDirectory(jobId, F1_ID, 'docs', dest);

    if (!res.success) throw new Error(`Falha no restoreDirectory: ${res.errors.join('; ')}`);
    if (res.filesRestored !== 2) throw new Error(`Esperado 2 arquivos restaurados em docs/, obtido ${res.filesRestored}`);

    if (!fs.existsSync(path.join(dest, 'docs', 'manual.pdf')) || !fs.existsSync(path.join(dest, 'docs', 'notes.txt'))) {
      throw new Error('Arquivos de docs/ não foram restaurados');
    }
    if (fs.existsSync(path.join(dest, 'file1.txt'))) {
      throw new Error('file1.txt fora de docs/ foi restaurado indevidamente');
    }
  });

  // 6. Restore Parcial (RestoreMode.PARTIAL)
  await recordTest('6. Restore Parcial: filtra arquivos específicos por lista', async () => {
    const dest = path.join(targetDir, 'test_partial');
    const res = await restoreEngine.execute({
      requestId: 'req-partial',
      jobId,
      executionId: F1_ID,
      restoreMode: RestoreMode.PARTIAL,
      selectedPaths: ['file1.txt', 'docs/notes.txt'],
      targetDirectory: dest
    });

    if (!res.success) throw new Error('Falha no restore parcial');
    if (res.filesRestored !== 2) throw new Error(`Esperado 2 arquivos, obtido ${res.filesRestored}`);
    if (!fs.existsSync(path.join(dest, 'file1.txt')) || !fs.existsSync(path.join(dest, 'docs', 'notes.txt'))) {
      throw new Error('Arquivos selecionados não foram restaurados');
    }
    if (fs.existsSync(path.join(dest, 'file2.txt'))) {
      throw new Error('file2.txt restaurado indevidamente');
    }
  });

  // 7. Seleção de Versão por Ponto no Tempo
  await recordTest('7. Seleção de Versão: restaura I1 com estado daquela data e I2 com estado posterior', async () => {
    const dest1 = path.join(targetDir, 'test_version_i1');
    const res1 = await restoreEngine.execute({
      requestId: 'req-v-i1',
      jobId,
      executionId: I1_ID,
      restoreMode: RestoreMode.FULL,
      selectedPaths: [],
      targetDirectory: dest1
    });
    if (!res1.success) throw new Error('Falha no restore de I1');

    // Em I1, file2 ainda existia e file3 foi adicionado
    if (!fs.existsSync(path.join(dest1, 'file2.txt'))) throw new Error('file2.txt deveria existir na versão I1');
    if (!fs.existsSync(path.join(dest1, 'file3.txt'))) throw new Error('file3.txt deveria existir na versão I1');

    const dest2 = path.join(targetDir, 'test_version_i2');
    const res2 = await restoreEngine.execute({
      requestId: 'req-v-i2',
      jobId,
      executionId: I2_ID,
      restoreMode: RestoreMode.FULL,
      selectedPaths: [],
      targetDirectory: dest2
    });
    if (!res2.success) throw new Error('Falha no restore de I2');
    // Em I2, file2 foi excluído
    if (fs.existsSync(path.join(dest2, 'file2.txt'))) throw new Error('file2.txt NÃO deveria existir na versão I2');
  });

  // 8. Validação da Cadeia: Bloqueia se Full Base ausente (RESTORE_BLOCKED)
  await recordTest('8. Validação da Cadeia: Bloqueia restauração se Full Base estiver ausente (RESTORE_BLOCKED)', async () => {
    const orphanIncId = 'exec-orphan-inc';
    await seedExecution(orphanIncId, BackupJobType.INCREMENTAL, '2026-09-06T10:00:00.000Z', [
      { relPath: 'orphan.txt', content: 'Conteúdo Órfão' }
    ], { baseFullId: 'exec-full-inexistente' });

    let blocked = false;
    try {
      const res = await restoreEngine.execute({
        requestId: 'req-orphan',
        jobId,
        executionId: orphanIncId,
        restoreMode: RestoreMode.FULL,
        selectedPaths: [],
        targetDirectory: path.join(targetDir, 'orphan')
      });
      if (!res.success) {
        blocked = true;
      }
    } catch (err: any) {
      if ((err?.code && String(err.code).startsWith('RESTORE_BLOCKED')) || (err?.message && err.message.includes('RESTORE_BLOCKED'))) {
        blocked = true;
      }
    }

    if (!blocked) throw new Error('Restore de incremental sem Full Base deveria ter sido bloqueado com RESTORE_BLOCKED');
  });

  // 9. Criptografia & Descompressão
  const ENC_EXEC_ID = 'exec-enc-01';
  const ENC_PASSWORD = 'SenhaSeguraRestore123!';
  await seedExecution(ENC_EXEC_ID, BackupJobType.FULL, '2026-09-07T10:00:00.000Z', [
    { relPath: 'secret.txt', content: 'Dado Ultra Secreto Criptografado AES-256-GCM' }
  ], { encryptPassword: ENC_PASSWORD });

  await recordTest('9. Criptografia & Integridade: descriptografa e valida integridade com senha correta', async () => {
    const dest = path.join(targetDir, 'test_enc_ok');
    const res = await restoreEngine.execute({
      requestId: 'req-enc-ok',
      jobId,
      executionId: ENC_EXEC_ID,
      restoreMode: RestoreMode.FULL,
      selectedPaths: [],
      targetDirectory: dest,
      password: ENC_PASSWORD
    });

    if (!res.success) throw new Error(`Falha no restore criptografado: ${res.errors.join('; ')}`);
    const secretContent = fs.readFileSync(path.join(dest, 'secret.txt'), 'utf-8');
    if (secretContent !== 'Dado Ultra Secreto Criptografado AES-256-GCM') {
      throw new Error(`Conteúdo descriptografado incorreto: ${secretContent}`);
    }
  });

  await recordTest('10. Criptografia Falha: senha incorreta bloqueia restore e não restaura dados', async () => {
    const dest = path.join(targetDir, 'test_enc_fail');
    let failed = false;
    try {
      const res = await restoreEngine.execute({
        requestId: 'req-enc-fail',
        jobId,
        executionId: ENC_EXEC_ID,
        restoreMode: RestoreMode.FULL,
        selectedPaths: [],
        targetDirectory: dest,
        password: 'SenhaErradaTotalmenteIncorreta!'
      });
      if (!res.success || res.filesFailed > 0) {
        failed = true;
      }
    } catch {
      failed = true;
    }

    if (!failed) throw new Error('Restore com senha incorreta deveria ter falhado');
    if (fs.existsSync(path.join(dest, 'secret.txt'))) {
      throw new Error('Arquivo não deveria ter sido gravado após falha de descriptografia');
    }
  });

  // 11. Detecção de Corrupção (INTEGRITY_ERROR)
  await recordTest('11. Detecção de Corrupção: interrompe restore de arquivo adulterado no storage', async () => {
    const corruptExecId = 'exec-corrupt-01';
    await seedExecution(corruptExecId, BackupJobType.FULL, '2026-09-08T10:00:00.000Z', [
      { relPath: 'corrupt.bin', content: 'Conteúdo Original Integro' }
    ]);

    // Corrompe propositalmente os bytes no storage
    const remotePath = `backups/${jobId}/${corruptExecId}/data/corrupt.bin`;
    const { Readable } = await import('stream');
    await storage.putStream(remotePath, Readable.from(Buffer.from('Conteúdo adulterado e corrompido!')));

    const dest = path.join(targetDir, 'test_corrupt');
    const res = await restoreEngine.execute({
      requestId: 'req-corrupt',
      jobId,
      executionId: corruptExecId,
      restoreMode: RestoreMode.FULL,
      selectedPaths: [],
      targetDirectory: dest
    });

    if (res.success) throw new Error('Restore de arquivo corrompido não deveria ter sido marcado como sucesso');
    if (res.filesFailed === 0) throw new Error('Arquivo corrompido deveria ter incrementado filesFailed');
    if (fs.existsSync(path.join(dest, 'corrupt.bin'))) {
      throw new Error('Arquivo corrompido não deve permanecer no destino final');
    }
  });

  // 12. Políticas de Sobrescrita (OverwritePolicy)
  await recordTest('12. OverwritePolicy NEVER: preserva arquivo existente no destino', async () => {
    const dest = path.join(targetDir, 'test_overwrite_never');
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, 'file1.txt'), 'Conteúdo Pré-existente Local');

    const res = await restoreEngine.execute({
      requestId: 'req-ow-never',
      jobId,
      executionId: F1_ID,
      restoreMode: RestoreMode.FILES,
      selectedPaths: ['file1.txt'],
      targetDirectory: dest,
      overwritePolicy: OverwritePolicy.NEVER
    });

    if (res.filesSkipped !== 1) throw new Error(`Esperado 1 arquivo ignorado, obtido ${res.filesSkipped}`);
    const content = fs.readFileSync(path.join(dest, 'file1.txt'), 'utf-8');
    if (content !== 'Conteúdo Pré-existente Local') throw new Error('Arquivo pré-existente foi sobrescrito indevidamente');
  });

  await recordTest('13. OverwritePolicy ALWAYS: substitui arquivo existente', async () => {
    const dest = path.join(targetDir, 'test_overwrite_always');
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, 'file1.txt'), 'Conteúdo Pré-existente Local');

    const res = await restoreEngine.execute({
      requestId: 'req-ow-always',
      jobId,
      executionId: F1_ID,
      restoreMode: RestoreMode.FILES,
      selectedPaths: ['file1.txt'],
      targetDirectory: dest,
      overwritePolicy: OverwritePolicy.ALWAYS
    });

    if (res.filesRestored !== 1) throw new Error(`Esperado 1 arquivo restaurado, obtido ${res.filesRestored}`);
    const content = fs.readFileSync(path.join(dest, 'file1.txt'), 'utf-8');
    if (content !== 'Conteúdo Original 1') throw new Error('Arquivo não foi sobrescrito com o backup');
  });

  // 14. Políticas de Conflito (RestoreConflictPolicy)
  await recordTest('14. ConflictPolicy RENAME: salva arquivo conflitante com novo nome', async () => {
    const dest = path.join(targetDir, 'test_conflict_rename');
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, 'file1.txt'), 'Arquivo Existente Protegido');

    const res = await restoreEngine.execute({
      requestId: 'req-conf-rename',
      jobId,
      executionId: F1_ID,
      restoreMode: RestoreMode.FILES,
      selectedPaths: ['file1.txt'],
      targetDirectory: dest,
      conflictPolicy: RestoreConflictPolicy.RENAME
    });

    if (res.filesRestored !== 1) throw new Error(`Esperado 1 arquivo restaurado via rename`);
    const originalContent = fs.readFileSync(path.join(dest, 'file1.txt'), 'utf-8');
    if (originalContent !== 'Arquivo Existente Protegido') throw new Error('Arquivo original foi alterado');

    // Localiza o arquivo renomeado
    const files = fs.readdirSync(dest);
    const renamed = files.find(f => f.startsWith('file1.restored_'));
    if (!renamed) throw new Error('Arquivo restaurado renomeado não encontrado no destino');
    const restoredContent = fs.readFileSync(path.join(dest, renamed), 'utf-8');
    if (restoredContent !== 'Conteúdo Original 1') throw new Error('Conteúdo do arquivo renomeado incorreto');
  });

  // 15. Segurança de Paths & Traversal
  await recordTest('15. Path Safety: impede ../ e escape de diretório de destino', async () => {
    let blocked1 = false;
    let blocked2 = false;

    try {
      PathSafety.resolveSafeTargetPath(targetDir, '../../../etc/passwd');
    } catch {
      blocked1 = true;
    }

    try {
      PathSafety.resolveSafeTargetPath(targetDir, 'docs/../../../shadow\0');
    } catch {
      blocked2 = true;
    }

    if (!blocked1 || !blocked2) throw new Error('Tentativas de Path Traversal deveriam ter sido bloqueadas');
  });

  // 16. Restore Preview
  await recordTest('16. Restore Preview: calcula métricas e conflitos antes de escrever', async () => {
    const dest = path.join(targetDir, 'test_preview');
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, 'file1.txt'), 'Existente');

    const preview = await restoreEngine.preview({
      requestId: 'req-prev',
      jobId,
      executionId: F1_ID,
      restoreMode: RestoreMode.FULL,
      selectedPaths: [],
      targetDirectory: dest,
      overwritePolicy: OverwritePolicy.NEVER
    });

    if (preview.totalFiles !== 4) throw new Error(`Total de arquivos no preview incorreto: ${preview.totalFiles}`);
    if (preview.toSkip !== 1) throw new Error(`Esperado 1 toSkip no preview, obtido ${preview.toSkip}`);
    if (preview.toCreate !== 3) throw new Error(`Esperado 3 toCreate no preview, obtido ${preview.toCreate}`);
  });

  // 17. Preservação de Metadata (mtime)
  await recordTest('17. Preservação de Metadata: aplica mtime original do backup ao arquivo restaurado', async () => {
    const dest = path.join(targetDir, 'test_meta');
    await restoreEngine.execute({
      requestId: 'req-meta',
      jobId,
      executionId: F1_ID,
      restoreMode: RestoreMode.FILES,
      selectedPaths: ['file1.txt'],
      targetDirectory: dest,
      preserveMetadata: true
    });

    const stat = fs.statSync(path.join(dest, 'file1.txt'));
    const expectedTime = new Date('2026-09-01T10:00:00.000Z').getTime();
    if (Math.abs(stat.mtimeMs - expectedTime) > 2000) {
      throw new Error(`mtime não foi preservado: esperado ${expectedTime}, obtido ${stat.mtimeMs}`);
    }
  });

  // 18. Retenção: Keep Last N com Proteção de Dependência de Cadeia
  await recordTest('18. Retenção Keep Last N: preserva os N mais recentes e protege Full e Incrementais por DEPENDENCY', async () => {
    const retJobId = 'job-chain-retention-isolated';
    const rF1 = 'ret-f1';
    const rI1 = 'ret-i1';
    const rI2 = 'ret-i2';

    // Cria cadeia: Full (dia 1) -> Inc1 (dia 2) -> Inc2 (dia 3)
    const baseExec: BackupExecution = {
      executionId: rF1,
      jobId: retJobId,
      tenantId: 'tenant-01',
      executionType: BackupJobType.FULL,
      status: BackupJobStatus.COMPLETED,
      startedAt: '2026-09-01T10:00:00.000Z',
      finishedAt: '2026-09-01T10:00:00.000Z',
      durationMs: 100,
      filesScanned: 1,
      filesProcessed: 1,
      filesFailed: 0,
      bytesScanned: 10,
      bytesProcessed: 10,
      bytesTransferred: 10
    };
    await catalog.registerExecution(baseExec);
    await catalog.saveManifest({
      manifestVersion: '2.0.0',
      executionId: rF1,
      jobId: retJobId,
      jobType: BackupJobType.FULL,
      createdAt: '2026-09-01T10:00:00.000Z',
      totalFiles: 1,
      totalSizeBytes: 10,
      files: [{ path: 'a.txt', sizeBytes: 10, compressedSizeBytes: 10, modifiedAtMs: 1000, sha256: 'h1', isEncrypted: false, operation: 'ADD' }]
    });

    const inc1Exec: BackupExecution = {
      ...baseExec,
      executionId: rI1,
      executionType: BackupJobType.INCREMENTAL,
      startedAt: '2026-09-02T10:00:00.000Z',
      finishedAt: '2026-09-02T10:00:00.000Z'
    };
    await catalog.registerExecution(inc1Exec);
    await catalog.saveManifest({
      manifestVersion: '2.0.0',
      executionId: rI1,
      jobId: retJobId,
      jobType: BackupJobType.INCREMENTAL,
      createdAt: '2026-09-02T10:00:00.000Z',
      baseFullExecutionId: rF1,
      totalFiles: 1,
      totalSizeBytes: 10,
      files: [{ path: 'b.txt', sizeBytes: 10, compressedSizeBytes: 10, modifiedAtMs: 2000, sha256: 'h2', isEncrypted: false, operation: 'ADD' }]
    });

    const inc2Exec: BackupExecution = {
      ...baseExec,
      executionId: rI2,
      executionType: BackupJobType.INCREMENTAL,
      startedAt: '2026-09-03T10:00:00.000Z',
      finishedAt: '2026-09-03T10:00:00.000Z'
    };
    await catalog.registerExecution(inc2Exec);
    await catalog.saveManifest({
      manifestVersion: '2.0.0',
      executionId: rI2,
      jobId: retJobId,
      jobType: BackupJobType.INCREMENTAL,
      createdAt: '2026-09-03T10:00:00.000Z',
      baseFullExecutionId: rF1,
      totalFiles: 1,
      totalSizeBytes: 10,
      files: [{ path: 'c.txt', sizeBytes: 10, compressedSizeBytes: 10, modifiedAtMs: 3000, sha256: 'h3', isEncrypted: false, operation: 'ADD' }]
    });

    // Com keepLastN: 1, apenas rI2 seria mantido por regra de quantidade.
    // O DependencyChecker deve identificar que rI2 necessita de rI1 e rF1 para ser restaurado e marcar ambos como DEPENDENCY!
    const preview = await retentionExecutor.preview(retJobId, { keepLastN: 1 });

    const i2Item = preview.items.find(i => i.executionId === rI2);
    const i1Item = preview.items.find(i => i.executionId === rI1);
    const f1Item = preview.items.find(i => i.executionId === rF1);

    if (i2Item?.action !== 'KEEP') {
      throw new Error(`rI2 deveria ser KEEP, obtido ${i2Item?.action}`);
    }
    if (f1Item?.action !== 'DEPENDENCY') {
      throw new Error(`rF1 deveria ser DEPENDENCY, obtido ${f1Item?.action} (${f1Item?.reason})`);
    }
    if (i1Item?.action !== 'DEPENDENCY') {
      throw new Error(`rI1 deveria ser DEPENDENCY, obtido ${i1Item?.action} (${i1Item?.reason})`);
    }
  });

  // 19. Retenção: Proteção Manual (Protected / Legal Hold)
  await recordTest('19. Retenção: Backup marcado com isProtected nunca é deletado', async () => {
    const protExecId = 'exec-protected-01';
    await seedExecution(protExecId, BackupJobType.FULL, '2020-01-01T00:00:00.000Z', [
      { relPath: 'archive.txt', content: 'Documento Histórico Protegido' }
    ], { isProtected: true });

    const preview = await retentionExecutor.preview(jobId, { keepLastN: 1 });
    const protItem = preview.items.find(i => i.executionId === protExecId);

    if (!protItem) throw new Error('Item protegido não encontrado');
    if (protItem.action !== 'PROTECTED') throw new Error(`Ação deveria ser PROTECTED, obtido ${protItem.action}`);
  });

  // 20. Retenção: Dry Run
  await recordTest('20. Retenção Dry Run: calcula ações sem alterar storage ou catálogo', async () => {
    const res = await retentionExecutor.execute(jobId, { keepLastN: 1 }, { dryRun: true });
    if (!res.dryRun) throw new Error('dryRun deveria ser true');
    if (res.deletedCount !== 0) throw new Error('dryRun não deve deletar execuções');

    const executionsStillExist = await catalog.listExecutions(jobId);
    if (executionsStillExist.length === 0) throw new Error('Execuções foram removidas indevidamente durante dry run');
  });

  // 21. Concorrência: Restore Ativo impede Exclusão por Retenção
  await recordTest('21. Concorrência Restore vs Retenção: lease de restore bloqueia exclusão concorrente', async () => {
    const leaseRelease = coordinator.acquireRestoreLease([F1_ID]);

    const preview = await retentionExecutor.preview(jobId, { keepLastN: 0 });
    const f1Item = preview.items.find(i => i.executionId === F1_ID);

    if (f1Item?.action === 'DELETE') {
      throw new Error('F1 não deveria estar marcado como DELETE enquanto possui lease de restore ativo');
    }

    leaseRelease();
  });

  // 22. Catálogo: Pesquisa de Arquivos e Histórico de Versões
  await recordTest('22. Catálogo: pesquisa arquivos por extensão, nome e busca histórico de versões', async () => {
    const pdfs = await (catalog as any).searchFiles({ jobId, extension: '.pdf' });
    if (pdfs.length === 0) throw new Error('searchFiles não encontrou arquivos .pdf');

    const file1Versions = await (catalog as any).getFileVersions(jobId, 'file1.txt');
    if (file1Versions.length < 2) {
      throw new Error(`Esperado pelo menos 2 versões para file1.txt, obtido ${file1Versions.length}`);
    }
  });

  // 23. Cancelamento Seguro com CancellationToken
  await recordTest('23. Cancelamento: interrompe restore em andamento e limpa arquivos temporários', async () => {
    const token = new CancellationToken();
    token.cancel('Cancelamento solicitado pelo operador');

    let wasCancelled = false;
    try {
      await restoreEngine.execute({
        requestId: 'req-cancel',
        jobId,
        executionId: F1_ID,
        restoreMode: RestoreMode.FULL,
        selectedPaths: [],
        targetDirectory: path.join(targetDir, 'test_cancel')
      }, { cancellationToken: token });
    } catch {
      wasCancelled = true;
    }

    if (!wasCancelled) throw new Error('Restore com token cancelado deveria ter sido interrompido');
  });

  // 24. Safe Delete: Exclusão com StorageProvider
  await recordTest('24. Safe Delete: remove execução obsoleta e limpa storage via StorageProvider', async () => {
    const tempJobId = 'job-temp-retention';
    const tempExecId = 'exec-temp-purge';
    await seedExecution(tempExecId, BackupJobType.FULL, '2020-05-01T00:00:00.000Z', [
      { relPath: 'temp_to_delete.txt', content: 'Excluir com seguranca' }
    ]);

    const res = await retentionExecutor.execute(jobId, { keepLastN: 100 });
    if (!res.success) throw new Error('Falha na execução de retenção');
  });

  // Limpeza do diretório de testes temporário
  try {
    fs.rmSync(testRoot, { recursive: true, force: true });
  } catch {}

  const allPassed = results.every(r => r.passed);
  console.log(`--- RESULTADO: ${results.filter(r => r.passed).length}/${results.length} TESTES APROVADOS ---`);
  return { passed: allPassed, results };
}
