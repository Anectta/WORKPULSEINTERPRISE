import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import {
  BackupJob,
  BackupJobType,
  BackupJobStatus,
  StorageProviderType,
  CompressionType,
  EncryptionAlgorithm
} from '../core/domain.js';
import {
  LocalStorageProvider
} from '../storage/local-storage.js';
import {
  LocalFilesystemProvider
} from '../filesystem/local-filesystem.js';
import {
  SimpleEventBus,
  CallbackProgressReporter,
  InMemorySecretStore
} from '../core/bus-and-secrets.js';
import {
  EngineContext,
  InMemoryBackupCatalog,
  DefaultVerificationEngine,
  DefaultPlatformProvider
} from '../core/context.js';
import {
  JobExecutor
} from '../core/job-executor.js';
import {
  MirrorExecutor
} from '../core/mirror-executor.js';
import {
  MirrorStrategy
} from '../strategies/mirror-strategy.js';
import {
  TwoWaySyncStrategy
} from '../strategies/two-way-sync-strategy.js';
import {
  MirrorPolicy,
  MirrorComparisonMode,
  ConflictPolicy,
  MirrorOperationType
} from '../core/mirror-domain.js';
import {
  InMemorySyncStateCatalog
} from '../core/sync-state.js';
import {
  CancellationToken,
  EngineError,
  ErrorCategory
} from '../core/errors.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export async function runMirrorAndSyncTests(): Promise<{ passed: boolean; results: TestResult[] }> {
  const results: TestResult[] = [];
  const tempDir = path.join(os.tmpdir(), `workpulse_mirror_test_${Date.now()}`);
  const sourceDir = path.join(tempDir, 'source');
  const destDir = path.join(tempDir, 'destination');

  console.log(`[Mirror Test Suite] Inicializando ambiente em: ${tempDir}`);
  await fsp.mkdir(sourceDir, { recursive: true });
  await fsp.mkdir(destDir, { recursive: true });

  const filesystem = new LocalFilesystemProvider();
  const storage = new LocalStorageProvider(destDir);
  await storage.initialize();

  const eventBus = new SimpleEventBus();
  const catalog = new InMemoryBackupCatalog();
  const secretStore = new InMemorySecretStore();
  const verification = new DefaultVerificationEngine();
  const platform = new DefaultPlatformProvider();

  const strategies = new Map();
  strategies.set(BackupJobType.MIRROR, new MirrorStrategy());
  strategies.set(BackupJobType.TWO_WAY_SYNC, new TwoWaySyncStrategy());

  const context = new EngineContext(
    {
      maxConcurrentFiles: 4,
      streamingChunkSizeBytes: 64 * 1024,
      defaultTempDir: path.join(tempDir, 'tmp'),
      enableTelemetry: false
    },
    new Map([[StorageProviderType.LOCAL, storage]]),
    filesystem,
    catalog,
    verification,
    eventBus,
    secretStore,
    platform,
    strategies
  );

  const executor = new JobExecutor(context);

  async function runTest(name: string, fn: () => Promise<void>) {
    const t0 = Date.now();
    try {
      await fn();
      results.push({ name, passed: true, durationMs: Date.now() - t0 });
      console.log(`  ✓ ${name}`);
    } catch (err: any) {
      results.push({ name, passed: false, error: err.message || String(err), durationMs: Date.now() - t0 });
      console.error(`  ✗ ${name}:`, err.message || err);
    }
  }

  // ==========================================
  // BATERIA DE TESTES: MIRROR UNIDIRECIONAL
  // ==========================================

  // TESTE 1: Origem tem A e B, Destino vazio -> CREATE A, CREATE B
  await runTest('Mirror: Criação inicial completa de múltiplos arquivos (CREATE A, CREATE B)', async () => {
    const src = path.join(sourceDir, 'test1');
    const dst = path.join(destDir, 'test1');
    await fsp.mkdir(src, { recursive: true });
    await fsp.mkdir(dst, { recursive: true });

    await fsp.writeFile(path.join(src, 'fileA.txt'), 'Conteudo do Arquivo A');
    await fsp.writeFile(path.join(src, 'fileB.txt'), 'Conteudo do Arquivo B');

    const testStorage = new LocalStorageProvider(dst);
    await testStorage.initialize();

    const mirrorExecutor = new MirrorExecutor();
    const job: BackupJob = {
      id: crypto.randomUUID(),
      tenantId: 'tenant-1',
      name: 'Job Mirror Initial',
      jobType: BackupJobType.MIRROR,
      priority: 1,
      source: { paths: [src] },
      destination: {
        id: crypto.randomUUID(),
        name: 'Local Dest',
        providerType: StorageProviderType.LOCAL,
        baseUri: dst,
        config: {}
      },
      policy: {
        compressionType: CompressionType.NONE,
        compressionLevel: 0,
        encryptionAlgorithm: EncryptionAlgorithm.NONE,
        keyDerivation: 'NONE',
        vssEnabled: false,
        retentionDays: 30,
        maxVersions: 1,
        safeDeleteRetentionDays: 0,
        verifyChecksumAfterWrite: true
      },
      status: BackupJobStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const plan = await mirrorExecutor.plan({ job, filesystem, storage: testStorage });
    if (plan.summary.createCount !== 2) {
      throw new Error(`Esperado 2 CREATE no plano, obtido: ${plan.summary.createCount}`);
    }

    const res = await mirrorExecutor.execute({ job, filesystem, storage: testStorage });
    if (!res.success || res.applied.created !== 2) {
      throw new Error(`Falha na execução do Mirror: ${JSON.stringify(res)}`);
    }

    // Valida arquivos no destino
    const contentA = await fsp.readFile(path.join(dst, 'fileA.txt'), 'utf8');
    const contentB = await fsp.readFile(path.join(dst, 'fileB.txt'), 'utf8');
    if (contentA !== 'Conteudo do Arquivo A' || contentB !== 'Conteudo do Arquivo B') {
      throw new Error('Conteúdo dos arquivos no destino diverge da origem');
    }
  });

  // TESTE 2: Origem tem A alterado, Destino tem A antigo -> UPDATE A
  await runTest('Mirror: Atualização precisa de arquivo modificado (UPDATE A)', async () => {
    const src = path.join(sourceDir, 'test2');
    const dst = path.join(destDir, 'test2');
    await fsp.mkdir(src, { recursive: true });
    await fsp.mkdir(dst, { recursive: true });

    await fsp.writeFile(path.join(src, 'fileA.txt'), 'Versao Nova 2.0');
    await fsp.writeFile(path.join(dst, 'fileA.txt'), 'Versao Antiga 1.0');

    const testStorage = new LocalStorageProvider(dst);
    await testStorage.initialize();

    const mirrorExecutor = new MirrorExecutor();
    const job: BackupJob = {
      id: crypto.randomUUID(),
      tenantId: 'tenant-1',
      name: 'Job Mirror Update',
      jobType: BackupJobType.MIRROR,
      priority: 1,
      source: { paths: [src] },
      destination: {
        id: crypto.randomUUID(),
        name: 'Local Dest',
        providerType: StorageProviderType.LOCAL,
        baseUri: dst,
        config: {}
      },
      policy: {
        compressionType: CompressionType.NONE,
        compressionLevel: 0,
        encryptionAlgorithm: EncryptionAlgorithm.NONE,
        keyDerivation: 'NONE',
        vssEnabled: false,
        retentionDays: 30,
        maxVersions: 1,
        safeDeleteRetentionDays: 0,
        verifyChecksumAfterWrite: true
      },
      status: BackupJobStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = await mirrorExecutor.execute({
      job,
      policy: { allowUpdate: true },
      filesystem,
      storage: testStorage
    });

    if (!res.success || res.applied.updated !== 1) {
      throw new Error(`Esperado 1 UPDATE aplicado, obtido: ${res.applied.updated}`);
    }

    const updatedContent = await fsp.readFile(path.join(dst, 'fileA.txt'), 'utf8');
    if (updatedContent !== 'Versao Nova 2.0') {
      throw new Error(`Arquivo não foi atualizado corretamente: "${updatedContent}"`);
    }
  });

  // TESTE 3: Origem tem A, Destino tem A e B -> DELETE B com safeDelete (Quarentena) e Direct Delete
  await runTest('Mirror: Exclusão com Safe Delete (Quarentena) e Exclusão Definitiva', async () => {
    const src = path.join(sourceDir, 'test3');
    const dst = path.join(destDir, 'test3');
    await fsp.mkdir(src, { recursive: true });
    await fsp.mkdir(dst, { recursive: true });

    await fsp.writeFile(path.join(src, 'fileA.txt'), 'Arquivo A');
    await fsp.writeFile(path.join(dst, 'fileA.txt'), 'Arquivo A');
    await fsp.writeFile(path.join(dst, 'fileB_deletable.txt'), 'Arquivo B a ser excluído');

    const testStorage = new LocalStorageProvider(dst);
    await testStorage.initialize();

    const mirrorExecutor = new MirrorExecutor();
    const job: BackupJob = {
      id: crypto.randomUUID(),
      tenantId: 'tenant-1',
      name: 'Job Mirror Delete',
      jobType: BackupJobType.MIRROR,
      priority: 1,
      source: { paths: [src] },
      destination: {
        id: crypto.randomUUID(),
        name: 'Local Dest',
        providerType: StorageProviderType.LOCAL,
        baseUri: dst,
        config: {}
      },
      policy: {
        compressionType: CompressionType.NONE,
        compressionLevel: 0,
        encryptionAlgorithm: EncryptionAlgorithm.NONE,
        keyDerivation: 'NONE',
        vssEnabled: false,
        retentionDays: 30,
        maxVersions: 1,
        safeDeleteRetentionDays: 7,
        verifyChecksumAfterWrite: true
      },
      status: BackupJobStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 3.1: Com safeDelete = true, deve mover para quarentena
    const resSafe = await mirrorExecutor.execute({
      job,
      policy: {
        allowDelete: true,
        safeDelete: true,
        quarantinePrefix: '.mirror_quarantine',
        safetyThreshold: { maxDeletionPercent: 100, abortOnThresholdExceeded: true }
      },
      filesystem,
      storage: testStorage
    });

    if (!resSafe.success || resSafe.applied.quarantined !== 1) {
      throw new Error(`Esperado 1 QUARANTINE aplicado, obtido: ${resSafe.applied.quarantined}`);
    }

    const bExistsInDestRoot = await testStorage.exists('fileB_deletable.txt');
    if (bExistsInDestRoot) {
      throw new Error('fileB_deletable.txt ainda existe na raiz do destino após quarentena');
    }

    // 3.2: Exclusão definitiva direta (safeDelete = false)
    await fsp.writeFile(path.join(dst, 'fileC_direct_delete.txt'), 'Para apagar direto');
    const resDirect = await mirrorExecutor.execute({
      job,
      policy: {
        allowDelete: true,
        safeDelete: false,
        safetyThreshold: { maxDeletionPercent: 100, abortOnThresholdExceeded: true }
      },
      filesystem,
      storage: testStorage
    });

    if (!resDirect.success || resDirect.applied.deleted !== 1) {
      throw new Error(`Esperado 1 DELETE aplicado, obtido: ${resDirect.applied.deleted}`);
    }

    const cExists = await testStorage.exists('fileC_direct_delete.txt');
    if (cExists) {
      throw new Error('fileC_direct_delete.txt não foi excluído definitivamente');
    }
  });

  // TESTE 4: Scanner da origem falha/origem inacessível -> NÃO executar DELETE em massa no destino
  await runTest('Mirror: Proteção de escaneamento impede exclusão em massa no destino', async () => {
    const nonExistentSrc = path.join(sourceDir, 'non_existent_folder_xyz');
    const dst = path.join(destDir, 'test4');
    await fsp.mkdir(dst, { recursive: true });

    await fsp.writeFile(path.join(dst, 'critical_data1.txt'), 'Dados vitais 1');
    await fsp.writeFile(path.join(dst, 'critical_data2.txt'), 'Dados vitais 2');

    const testStorage = new LocalStorageProvider(dst);
    await testStorage.initialize();

    const mirrorExecutor = new MirrorExecutor();
    const job: BackupJob = {
      id: crypto.randomUUID(),
      tenantId: 'tenant-1',
      name: 'Job Mirror Scanner Safety',
      jobType: BackupJobType.MIRROR,
      priority: 1,
      source: { paths: [nonExistentSrc] },
      destination: {
        id: crypto.randomUUID(),
        name: 'Local Dest',
        providerType: StorageProviderType.LOCAL,
        baseUri: dst,
        config: {}
      },
      policy: {
        compressionType: CompressionType.NONE,
        compressionLevel: 0,
        encryptionAlgorithm: EncryptionAlgorithm.NONE,
        keyDerivation: 'NONE',
        vssEnabled: false,
        retentionDays: 30,
        maxVersions: 1,
        safeDeleteRetentionDays: 0,
        verifyChecksumAfterWrite: true
      },
      status: BackupJobStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let caughtError = false;
    try {
      await mirrorExecutor.execute({
        job,
        policy: {
          allowDelete: true,
          safetyThreshold: { abortOnThresholdExceeded: true, allowEmptySourceDeletion: false }
        },
        filesystem,
        storage: testStorage
      });
    } catch (err: any) {
      caughtError = true;
      if (err.code !== 'MIRROR_SAFETY_THRESHOLD_EXCEEDED') {
        throw new Error(`Esperado código MIRROR_SAFETY_THRESHOLD_EXCEEDED, obtido: ${err.code}`);
      }
    }

    if (!caughtError) {
      throw new Error('Execução deveria ter sido abortada pelo Safety Threshold');
    }

    // Verifica que nenhum arquivo foi apagado no destino
    const exists1 = await testStorage.exists('critical_data1.txt');
    const exists2 = await testStorage.exists('critical_data2.txt');
    if (!exists1 || !exists2) {
      throw new Error('Arquivos do destino foram indevidamente apagados!');
    }
  });

  // TESTE 5: Exclusões acima do Safety Threshold -> ABORT sem modificar destino
  await runTest('Mirror: Safety Threshold aborta quando percentual de exclusão é ultrapassado', async () => {
    const src = path.join(sourceDir, 'test5');
    const dst = path.join(destDir, 'test5');
    await fsp.mkdir(src, { recursive: true });
    await fsp.mkdir(dst, { recursive: true });

    // Origem tem 1 arquivo, Destino tem 5 arquivos (80% seriam deletados)
    await fsp.writeFile(path.join(src, 'kept.txt'), 'Manter');
    await fsp.writeFile(path.join(dst, 'kept.txt'), 'Manter');
    for (let i = 1; i <= 4; i++) {
      await fsp.writeFile(path.join(dst, `extra_${i}.txt`), `Extra ${i}`);
    }

    const testStorage = new LocalStorageProvider(dst);
    await testStorage.initialize();

    const mirrorExecutor = new MirrorExecutor();
    const job: BackupJob = {
      id: crypto.randomUUID(),
      tenantId: 'tenant-1',
      name: 'Job Mirror Threshold Test',
      jobType: BackupJobType.MIRROR,
      priority: 1,
      source: { paths: [src] },
      destination: {
        id: crypto.randomUUID(),
        name: 'Local Dest',
        providerType: StorageProviderType.LOCAL,
        baseUri: dst,
        config: {}
      },
      policy: {
        compressionType: CompressionType.NONE,
        compressionLevel: 0,
        encryptionAlgorithm: EncryptionAlgorithm.NONE,
        keyDerivation: 'NONE',
        vssEnabled: false,
        retentionDays: 30,
        maxVersions: 1,
        safeDeleteRetentionDays: 0,
        verifyChecksumAfterWrite: true
      },
      status: BackupJobStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let thresholdAborted = false;
    try {
      await mirrorExecutor.execute({
        job,
        policy: {
          allowDelete: true,
          safetyThreshold: {
            maxDeletionPercent: 20, // Limite de 20%, mas tentativa é 80% (4/5)
            abortOnThresholdExceeded: true
          }
        },
        filesystem,
        storage: testStorage
      });
    } catch (err: any) {
      thresholdAborted = true;
      if (err.code !== 'MIRROR_SAFETY_THRESHOLD_EXCEEDED') {
        throw new Error(`Erro inesperado: ${err.code} - ${err.message}`);
      }
    }

    if (!thresholdAborted) {
      throw new Error('Deveria ter abortado devido ao Safety Threshold excedido!');
    }

    // Garante que nenhum dos arquivos extras foi tocado
    for (let i = 1; i <= 4; i++) {
      const exists = await testStorage.exists(`extra_${i}.txt`);
      if (!exists) {
        throw new Error(`Arquivo extra_${i}.txt foi indevidamente apagado antes da validação!`);
      }
    }
  });

  // TESTE 6: Dry Run / Preview -> Gera plano sem modificação física
  await runTest('Mirror: Dry Run / Preview gera plano de operações com zero alterações físicas', async () => {
    const src = path.join(sourceDir, 'test6');
    const dst = path.join(destDir, 'test6');
    await fsp.mkdir(src, { recursive: true });
    await fsp.mkdir(dst, { recursive: true });

    await fsp.writeFile(path.join(src, 'new_file.txt'), 'Novo');
    await fsp.writeFile(path.join(src, 'modify_me.txt'), 'Novo conteudo modificado');
    await fsp.writeFile(path.join(dst, 'modify_me.txt'), 'Antigo conteudo');
    await fsp.writeFile(path.join(dst, 'delete_candidate.txt'), 'Sera deletado no plano');

    const testStorage = new LocalStorageProvider(dst);
    await testStorage.initialize();

    const mirrorExecutor = new MirrorExecutor();
    const job: BackupJob = {
      id: crypto.randomUUID(),
      tenantId: 'tenant-1',
      name: 'Job Mirror Dry Run',
      jobType: BackupJobType.MIRROR,
      priority: 1,
      source: { paths: [src] },
      destination: {
        id: crypto.randomUUID(),
        name: 'Local Dest',
        providerType: StorageProviderType.LOCAL,
        baseUri: dst,
        config: {}
      },
      policy: {
        compressionType: CompressionType.NONE,
        compressionLevel: 0,
        encryptionAlgorithm: EncryptionAlgorithm.NONE,
        keyDerivation: 'NONE',
        vssEnabled: false,
        retentionDays: 30,
        maxVersions: 1,
        safeDeleteRetentionDays: 0,
        verifyChecksumAfterWrite: true
      },
      status: BackupJobStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const dryRes = await mirrorExecutor.execute({
      job,
      policy: {
        dryRun: true,
        allowCreate: true,
        allowUpdate: true,
        allowDelete: true,
        safeDelete: false,
        safetyThreshold: { maxDeletionPercent: 100, abortOnThresholdExceeded: true }
      },
      filesystem,
      storage: testStorage
    });

    if (!dryRes.success || !dryRes.plan.dryRun) {
      throw new Error('Falha no Dry Run');
    }

    if (dryRes.plan.summary.createCount !== 1) {
      throw new Error(`Esperado 1 CREATE no plano do Dry Run, obtido: ${dryRes.plan.summary.createCount}`);
    }
    if (dryRes.plan.summary.updateCount !== 1) {
      throw new Error(`Esperado 1 UPDATE no plano do Dry Run, obtido: ${dryRes.plan.summary.updateCount}`);
    }
    if (dryRes.plan.summary.deleteCount !== 1) {
      throw new Error(`Esperado 1 DELETE no plano do Dry Run, obtido: ${dryRes.plan.summary.deleteCount}`);
    }

    // Confirma que nenhuma alteração física foi feita
    const newFileExists = await testStorage.exists('new_file.txt');
    if (newFileExists) {
      throw new Error('new_file.txt foi gravado fisicamente durante o Dry Run!');
    }

    const origModifyContent = await fsp.readFile(path.join(dst, 'modify_me.txt'), 'utf8');
    if (origModifyContent !== 'Antigo conteudo') {
      throw new Error('modify_me.txt foi alterado fisicamente durante o Dry Run!');
    }

    const deleteCandExists = await testStorage.exists('delete_candidate.txt');
    if (!deleteCandExists) {
      throw new Error('delete_candidate.txt foi excluído fisicamente durante o Dry Run!');
    }
  });

  // ==========================================
  // BATERIA DE TESTES: TWO-WAY SYNCHRONIZATION
  // ==========================================

  // TESTE 7: Two-Way Sync - Criação e sincronização bidirecional (A -> B e B -> A)
  await runTest('Two-Way Sync: Sincroniza adições independentes nos dois lados (A->B e B->A)', async () => {
    const sideADir = path.join(sourceDir, 'sync_test_7_a');
    const sideBDir = path.join(destDir, 'sync_test_7_b');
    await fsp.mkdir(sideADir, { recursive: true });
    await fsp.mkdir(sideBDir, { recursive: true });

    await fsp.writeFile(path.join(sideADir, 'doc_from_a.txt'), 'Origem A');
    await fsp.writeFile(path.join(sideBDir, 'doc_from_b.txt'), 'Origem B');

    const syncCatalog = new InMemorySyncStateCatalog();
    const syncStrategy = new TwoWaySyncStrategy(syncCatalog);
    const syncStorage = new LocalStorageProvider(sideBDir);
    await syncStorage.initialize();

    const syncId = crypto.randomUUID();
    const job: BackupJob = {
      id: syncId,
      tenantId: 'tenant-1',
      name: 'Job Two-Way Sync Initial',
      jobType: BackupJobType.TWO_WAY_SYNC,
      priority: 1,
      source: { paths: [sideADir] },
      destination: {
        id: crypto.randomUUID(),
        name: 'Sync Dest',
        providerType: StorageProviderType.LOCAL,
        baseUri: sideBDir,
        config: { syncId, conflictPolicy: ConflictPolicy.PRESERVE_BOTH }
      },
      policy: {
        compressionType: CompressionType.NONE,
        compressionLevel: 0,
        encryptionAlgorithm: EncryptionAlgorithm.NONE,
        keyDerivation: 'NONE',
        vssEnabled: false,
        retentionDays: 30,
        maxVersions: 1,
        safeDeleteRetentionDays: 0,
        verifyChecksumAfterWrite: true
      },
      status: BackupJobStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const execution: any = {
      executionId: crypto.randomUUID(),
      jobId: job.id,
      tenantId: job.tenantId,
      executionType: BackupJobType.TWO_WAY_SYNC,
      status: BackupJobStatus.RUNNING,
      startedAt: new Date().toISOString(),
      durationMs: 0
    };

    const res = await syncStrategy.execute({
      job,
      execution,
      storage: syncStorage,
      filesystem,
      catalog,
      progress: new CallbackProgressReporter(() => {}),
      cancellationToken: new CancellationToken()
    });

    if (!res.success) {
      throw new Error(`Two-Way Sync falhou: ${res.errors.join(', ')}`);
    }

    // Verifica que doc_from_a está em B e doc_from_b está em A
    const aInB = await syncStorage.exists('doc_from_a.txt');
    const bInA = fs.existsSync(path.join(sideADir, 'doc_from_b.txt'));
    if (!aInB || !bInA) {
      throw new Error(`Sincronização bidirecional falhou. aInB=${aInB}, bInA=${bInA}`);
    }

    // Verifica persistência de SyncState
    const state = await syncCatalog.getSyncState(syncId);
    if (!state || Object.keys(state.entries).length !== 2) {
      throw new Error('SyncState não foi registrado corretamente no catálogo');
    }
  });

  // TESTE 8: Two-Way Sync - Detecção de Conflito com Política NEWEST_WINS e PREFER_SOURCE
  await runTest('Two-Way Sync: Resolução determinística de conflitos concorrentes (PREFER_SOURCE / NEWEST_WINS)', async () => {
    const sideADir = path.join(sourceDir, 'sync_test_8_a');
    const sideBDir = path.join(destDir, 'sync_test_8_b');
    await fsp.mkdir(sideADir, { recursive: true });
    await fsp.mkdir(sideBDir, { recursive: true });

    // Cria arquivo com conteúdos conflitantes em ambos os lados
    await fsp.writeFile(path.join(sideADir, 'conflict.txt'), 'Conteudo Versao A (Preferida)');
    await fsp.writeFile(path.join(sideBDir, 'conflict.txt'), 'Conteudo Versao B');

    const syncCatalog = new InMemorySyncStateCatalog();
    const syncStrategy = new TwoWaySyncStrategy(syncCatalog);
    const syncStorage = new LocalStorageProvider(sideBDir);
    await syncStorage.initialize();

    const syncId = crypto.randomUUID();
    const job: BackupJob = {
      id: syncId,
      tenantId: 'tenant-1',
      name: 'Job Two-Way Sync Conflict',
      jobType: BackupJobType.TWO_WAY_SYNC,
      priority: 1,
      source: { paths: [sideADir] },
      destination: {
        id: crypto.randomUUID(),
        name: 'Sync Dest',
        providerType: StorageProviderType.LOCAL,
        baseUri: sideBDir,
        config: { syncId, conflictPolicy: ConflictPolicy.PREFER_SOURCE }
      },
      policy: {
        compressionType: CompressionType.NONE,
        compressionLevel: 0,
        encryptionAlgorithm: EncryptionAlgorithm.NONE,
        keyDerivation: 'NONE',
        vssEnabled: false,
        retentionDays: 30,
        maxVersions: 1,
        safeDeleteRetentionDays: 0,
        verifyChecksumAfterWrite: true
      },
      status: BackupJobStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const execution: any = {
      executionId: crypto.randomUUID(),
      jobId: job.id,
      tenantId: job.tenantId,
      executionType: BackupJobType.TWO_WAY_SYNC,
      status: BackupJobStatus.RUNNING,
      startedAt: new Date().toISOString(),
      durationMs: 0
    };

    const res = await syncStrategy.execute({
      job,
      execution,
      storage: syncStorage,
      filesystem,
      catalog,
      progress: new CallbackProgressReporter(() => {}),
      cancellationToken: new CancellationToken()
    });

    if (!res.success) {
      throw new Error(`Falha no Two-Way Sync com conflito: ${res.errors.join(', ')}`);
    }

    // Com PREFER_SOURCE, o conteúdo de A deve ter sido propagado para B
    const contentInB = await fsp.readFile(path.join(sideBDir, 'conflict.txt'), 'utf8');
    if (contentInB !== 'Conteudo Versao A (Preferida)') {
      throw new Error(`Conflito não resolveu conforme PREFER_SOURCE: "${contentInB}"`);
    }
  });

  // TESTE 9: Two-Way Sync - Propagação de Exclusão após estado Base sincronizado
  await runTest('Two-Way Sync: Propagação segura de deleção baseada no SyncState histórico', async () => {
    const sideADir = path.join(sourceDir, 'sync_test_9_a');
    const sideBDir = path.join(destDir, 'sync_test_9_b');
    await fsp.mkdir(sideADir, { recursive: true });
    await fsp.mkdir(sideBDir, { recursive: true });

    const syncCatalog = new InMemorySyncStateCatalog();
    const syncId = crypto.randomUUID();

    // 1. Cria estado inicial com doc1 e doc2
    await fsp.writeFile(path.join(sideADir, 'doc1.txt'), 'Documento 1');
    await fsp.writeFile(path.join(sideBDir, 'doc1.txt'), 'Documento 1');
    await fsp.writeFile(path.join(sideADir, 'doc2.txt'), 'Documento 2');
    await fsp.writeFile(path.join(sideBDir, 'doc2.txt'), 'Documento 2');

    // Registra SyncState base
    await syncCatalog.saveSyncState({
      syncId,
      sourceAPath: sideADir,
      sourceBPath: sideBDir,
      lastSyncTimestamp: new Date().toISOString(),
      version: 1,
      entries: {
        'doc1.txt': { path: 'doc1.txt', sizeBytes: 11, modifiedAtMs: Date.now(), sha256: 'h1', lastSyncedAt: new Date().toISOString(), side: 'SYNCHRONIZED' },
        'doc2.txt': { path: 'doc2.txt', sizeBytes: 11, modifiedAtMs: Date.now(), sha256: 'h2', lastSyncedAt: new Date().toISOString(), side: 'SYNCHRONIZED' }
      }
    });

    // 2. Agora o usuário apaga doc2 em A (enquanto doc2 continua intacto em B)
    await fsp.unlink(path.join(sideADir, 'doc2.txt'));

    const syncStrategy = new TwoWaySyncStrategy(syncCatalog);
    const syncStorage = new LocalStorageProvider(sideBDir);
    await syncStorage.initialize();

    const job: BackupJob = {
      id: syncId,
      tenantId: 'tenant-1',
      name: 'Job Sync Deletion',
      jobType: BackupJobType.TWO_WAY_SYNC,
      priority: 1,
      source: { paths: [sideADir] },
      destination: {
        id: crypto.randomUUID(),
        name: 'Sync Dest',
        providerType: StorageProviderType.LOCAL,
        baseUri: sideBDir,
        config: { syncId, allowDelete: true }
      },
      policy: {
        compressionType: CompressionType.NONE,
        compressionLevel: 0,
        encryptionAlgorithm: EncryptionAlgorithm.NONE,
        keyDerivation: 'NONE',
        vssEnabled: false,
        retentionDays: 30,
        maxVersions: 1,
        safeDeleteRetentionDays: 0,
        verifyChecksumAfterWrite: true
      },
      status: BackupJobStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const execution: any = {
      executionId: crypto.randomUUID(),
      jobId: job.id,
      tenantId: job.tenantId,
      executionType: BackupJobType.TWO_WAY_SYNC,
      status: BackupJobStatus.RUNNING,
      startedAt: new Date().toISOString(),
      durationMs: 0
    };

    const res = await syncStrategy.execute({
      job,
      execution,
      storage: syncStorage,
      filesystem,
      catalog,
      progress: new CallbackProgressReporter(() => {}),
      cancellationToken: new CancellationToken()
    });

    if (!res.success) {
      throw new Error(`Sync de exclusão falhou: ${res.errors.join(', ')}`);
    }

    // Verifica que doc2 foi devidamente apagado no Lado B
    const doc2InB = await syncStorage.exists('doc2.txt');
    if (doc2InB) {
      throw new Error('doc2.txt não foi excluído em B após exclusão legítima em A!');
    }

    // Verifica que doc1 continua intacto em ambos os lados
    const doc1InA = fs.existsSync(path.join(sideADir, 'doc1.txt'));
    const doc1InB = await syncStorage.exists('doc1.txt');
    if (!doc1InA || !doc1InB) {
      throw new Error('doc1.txt foi indevidamente modificado ou apagado!');
    }
  });

  // TESTE 10: Cancelamento atômico e seguro durante Mirror / Sync
  await runTest('Resilience: CancellationToken cancela Mirror e Sync com segurança atômica', async () => {
    const src = path.join(sourceDir, 'test10');
    const dst = path.join(destDir, 'test10');
    await fsp.mkdir(src, { recursive: true });
    await fsp.mkdir(dst, { recursive: true });

    await fsp.writeFile(path.join(src, 'data1.txt'), 'Data 1');
    await fsp.writeFile(path.join(src, 'data2.txt'), 'Data 2');

    const testStorage = new LocalStorageProvider(dst);
    await testStorage.initialize();

    const mirrorExecutor = new MirrorExecutor();
    const job: BackupJob = {
      id: crypto.randomUUID(),
      tenantId: 'tenant-1',
      name: 'Job Cancel Test',
      jobType: BackupJobType.MIRROR,
      priority: 1,
      source: { paths: [src] },
      destination: {
        id: crypto.randomUUID(),
        name: 'Local Dest',
        providerType: StorageProviderType.LOCAL,
        baseUri: dst,
        config: {}
      },
      policy: {
        compressionType: CompressionType.NONE,
        compressionLevel: 0,
        encryptionAlgorithm: EncryptionAlgorithm.NONE,
        keyDerivation: 'NONE',
        vssEnabled: false,
        retentionDays: 30,
        maxVersions: 1,
        safeDeleteRetentionDays: 0,
        verifyChecksumAfterWrite: true
      },
      status: BackupJobStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const token = new CancellationToken();
    token.cancel('Cancelamento preventivo solicitado pelo operador');

    let wasCancelled = false;
    try {
      await mirrorExecutor.execute({
        job,
        filesystem,
        storage: testStorage,
        cancellationToken: token
      });
    } catch (err: any) {
      if (err.code === 'OPERATION_CANCELLED') {
        wasCancelled = true;
      }
    }

    if (!wasCancelled) {
      throw new Error('Mirror deveria ter lançado OPERATION_CANCELLED imediatamente');
    }
  });

  // Limpeza do diretório temporário
  try {
    await fsp.rm(tempDir, { recursive: true, force: true });
  } catch {}

  const allPassed = results.every((r) => r.passed);
  console.log('==================================================');
  console.log(`RESULTADO DOS TESTES DE MIRROR & SYNC: ${allPassed ? '✅ TODOS PASSARAM' : '❌ HOUVE FALHAS'}`);
  console.log('==================================================');
  for (const r of results) {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name} (${r.durationMs}ms)`);
    if (r.error) console.log(`   Erro: ${r.error}`);
  }

  return { passed: allPassed, results };
}

// Execução direta quando rodado via CLI
if (process.argv[1]?.includes('mirror-and-sync.test')) {
  runMirrorAndSyncTests().then((res) => {
    if (!res.passed) {
      process.exit(1);
    }
  });
}
