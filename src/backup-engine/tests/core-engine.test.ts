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
  BaseFullBackupStrategy
} from '../strategies/base-full-strategy.js';
import {
  IncrementalBackupStrategy
} from '../strategies/incremental-strategy.js';
import {
  DifferentialBackupStrategy
} from '../strategies/differential-strategy.js';
import {
  ChangeDetector
} from '../core/change-detector.js';
import {
  ChangeOperationType
} from '../core/change-set.js';
import {
  CancellationToken,
  RetryPolicy,
  EngineError,
  ErrorCategory
} from '../core/errors.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export async function runCoreEngineTests(): Promise<{ passed: boolean; results: TestResult[] }> {
  const results: TestResult[] = [];
  const tempDir = path.join(os.tmpdir(), `workpulse_backup_test_${Date.now()}`);
  const sourceDir = path.join(tempDir, 'source');
  const storageDir = path.join(tempDir, 'storage');

  console.log(`[Test Suite] Inicializando ambiente temporário em: ${tempDir}`);
  await fsp.mkdir(sourceDir, { recursive: true });
  await fsp.mkdir(storageDir, { recursive: true });

  // Criar arquivos de teste na origem
  await fsp.writeFile(path.join(sourceDir, 'doc1.txt'), 'Conteúdo do documento 1 para backup corporativo.');
  await fsp.writeFile(path.join(sourceDir, 'database.db'), Buffer.alloc(1024 * 64, 0x42)); // 64 KB de dados
  await fsp.mkdir(path.join(sourceDir, 'subdir'), { recursive: true });
  await fsp.writeFile(path.join(sourceDir, 'subdir', 'nested.json'), JSON.stringify({ key: 'value', active: true }));

  async function test(name: string, fn: () => Promise<void>) {
    const start = Date.now();
    try {
      await fn();
      results.push({ name, passed: true, durationMs: Date.now() - start });
      console.log(`  ✓ ${name}`);
    } catch (err: any) {
      results.push({ name, passed: false, error: err?.message || String(err), durationMs: Date.now() - start });
      console.error(`  ✗ ${name} (Erro: ${err?.message})`);
    }
  }

  // 1. Testes de Domínio e Invariantes
  await test('Domain: Instanciação de BackupJob e BackupPolicy com tipagem estrita', async () => {
    const job: BackupJob = {
      id: crypto.randomUUID(),
      tenantId: 'tenant-test-123',
      name: 'Job de Teste Unitário',
      jobType: BackupJobType.FULL,
      priority: 1,
      source: { paths: [sourceDir] },
      destination: {
        id: crypto.randomUUID(),
        name: 'Storage Local',
        providerType: StorageProviderType.LOCAL,
        baseUri: storageDir,
        config: {}
      },
      policy: {
        compressionType: CompressionType.NONE,
        compressionLevel: 0,
        encryptionAlgorithm: EncryptionAlgorithm.NONE,
        keyDerivation: 'NONE',
        vssEnabled: false,
        retentionDays: 7,
        maxVersions: 3,
        safeDeleteRetentionDays: 15,
        verifyChecksumAfterWrite: true
      },
      status: BackupJobStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!job.id || job.jobType !== 'FULL') {
      throw new Error('Falha na validação do domínio do BackupJob.');
    }
  });

  // 2. Testes do LocalStorageProvider
  const storage = new LocalStorageProvider(storageDir);
  await storage.initialize();

  await test('Storage: LocalStorageProvider grava, lê, verifica existência e lista arquivos', async () => {
    const testContent = Buffer.from('Dados de teste para storage provider');
    const stream = fs.createReadStream(path.join(sourceDir, 'doc1.txt'));
    await storage.putStream('test_folder/doc1.txt', stream, testContent.length);

    const exists = await storage.exists('test_folder/doc1.txt');
    if (!exists) throw new Error('Arquivo gravado não encontrado no storage.');

    const meta = await storage.getMetadata('test_folder/doc1.txt');
    if (!meta || meta.sizeBytes === 0) throw new Error('Metadados inválidos do storage.');

    const list = await storage.listDirectory('test_folder');
    if (list.length === 0) throw new Error('Falha na listagem de diretório do storage.');
  });

  await test('Storage: Proteção contra Path Traversal em caminhos de escrita e leitura', async () => {
    try {
      await storage.exists('../../etc/passwd');
      throw new Error('Deveria ter lançado erro de SECURITY_PATH_TRAVERSAL.');
    } catch (err: any) {
      if (!err.message.includes('ultrapassar o diretório raiz')) {
        throw err;
      }
    }
  });

  // 3. Testes do LocalFilesystemProvider
  const fsProvider = new LocalFilesystemProvider();
  await test('Filesystem: Varredura de diretório recursiva e cálculo de SHA-256', async () => {
    const scanned: string[] = [];
    for await (const file of fsProvider.scanDirectory(sourceDir)) {
      if (!file.isDirectory) {
        scanned.push(file.name);
      }
    }
    if (!scanned.includes('doc1.txt') || !scanned.includes('nested.json')) {
      throw new Error('Varredura incompleta do filesystem.');
    }

    const hash = await fsProvider.calculateHash(path.join(sourceDir, 'doc1.txt'));
    if (!hash || hash.length !== 64) {
      throw new Error('Cálculo de SHA-256 inválido.');
    }
  });

  // 4. Testes de EventBus e SecretStore
  await test('Core: EventBus publica e notifica assinantes com tipagem estrita', async () => {
    const eventBus = new SimpleEventBus();
    let eventReceived = false;
    const unsub = eventBus.subscribe((evt) => {
      if (evt.type === 'JOB_PAUSED') {
        eventReceived = true;
      }
    });

    eventBus.publish({ type: 'JOB_PAUSED', payload: { executionId: 'exec-123' } });
    unsub();
    if (!eventReceived) throw new Error('EventBus não entregou o evento.');
  });

  await test('Core: SecretStore armazena e recupera chaves em memória com segurança', async () => {
    const secrets = new InMemorySecretStore();
    await secrets.setSecret('s3_access_key', 'AKIA_TEST_KEY_123');
    const val = await secrets.getSecret('s3_access_key');
    if (val !== 'AKIA_TEST_KEY_123') throw new Error('Valor incorreto recuperado do SecretStore.');
  });

  // 5. Testes de RetryPolicy e CancellationToken
  await test('Resilience: RetryPolicy calcula backoff exponencial e categoriza erros', async () => {
    const policy = new RetryPolicy(3, 100, 2);
    const delay1 = policy.getDelay(1);
    const delay2 = policy.getDelay(2);
    if (delay2 <= delay1) throw new Error('Backoff exponencial não funcionou corretamente.');

    const retryableErr = new EngineError({
      code: 'NET_TIMEOUT',
      message: 'Timeout',
      category: ErrorCategory.NETWORK,
      retryable: true
    });
    if (!policy.isRetryable(retryableErr)) throw new Error('Erro de rede deveria ser retryable.');
  });

  await test('Resilience: CancellationToken interrompe execução de forma atômica', async () => {
    const token = new CancellationToken();
    let callbackCalled = false;
    token.onCancelled(() => {
      callbackCalled = true;
    });
    token.cancel('Cancelado para teste');

    if (!token.isCancelled || !callbackCalled) {
      throw new Error('CancellationToken não acionou listeners.');
    }
  });

  // 6. Teste de Execução Completa via JobExecutor
  await test('JobExecutor: Execução de Job FULL com catálogo, manifesto e integridade', async () => {
    const eventBus = new SimpleEventBus();
    const catalog = new InMemoryBackupCatalog();
    const verification = new DefaultVerificationEngine();
    const secretStore = new InMemorySecretStore();
    const platform = new DefaultPlatformProvider();
    const storageMap = new Map<string, any>([[StorageProviderType.LOCAL, storage]]);
    const strategies = new Map<string, any>([[BackupJobType.FULL, new BaseFullBackupStrategy()]]);

    const context = new EngineContext(
      { maxConcurrentFiles: 4, streamingChunkSizeBytes: 64 * 1024, defaultTempDir: tempDir, enableTelemetry: true },
      storageMap,
      fsProvider,
      catalog,
      verification,
      eventBus,
      secretStore,
      platform,
      strategies
    );

    const job: BackupJob = {
      id: crypto.randomUUID(),
      tenantId: 'tenant-demo',
      name: 'Backup Completo Documentos',
      jobType: BackupJobType.FULL,
      priority: 1,
      source: { paths: [sourceDir] },
      destination: {
        id: crypto.randomUUID(),
        name: 'Storage Local Teste',
        providerType: StorageProviderType.LOCAL,
        baseUri: storageDir,
        config: {}
      },
      policy: {
        compressionType: CompressionType.NONE,
        compressionLevel: 0,
        encryptionAlgorithm: EncryptionAlgorithm.NONE,
        keyDerivation: 'NONE',
        vssEnabled: false,
        retentionDays: 30,
        maxVersions: 5,
        safeDeleteRetentionDays: 30,
        verifyChecksumAfterWrite: true
      },
      status: BackupJobStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let progressCalls = 0;
    const progressReporter = new CallbackProgressReporter((_p) => {
      progressCalls++;
    });

    const executor = new JobExecutor(context);
    const result = await executor.executeJob(job, progressReporter);

    if (!result.success || result.status !== BackupJobStatus.COMPLETED) {
      throw new Error(`Execução falhou: ${result.errors.join(', ')}`);
    }

    if (result.metrics.filesProcessed !== 3) {
      throw new Error(`Esperado 3 arquivos processados, obteve ${result.metrics.filesProcessed}`);
    }

    const manifest = await catalog.getManifest(result.executionId);
    if (!manifest) throw new Error('Manifesto não gravado no catálogo.');

    const isManifestValid = await verification.verifyManifest(manifest);
    if (!isManifestValid) throw new Error('Validação de integridade do manifesto falhou.');
  });

  await test('ChangeDetector: Detecta ADD, MODIFY, DELETE, RENAME e UNCHANGED', async () => {
    const changeSourceDir = path.join(tempDir, 'change_source');
    await fsp.mkdir(changeSourceDir, { recursive: true });

    await fsp.writeFile(path.join(changeSourceDir, 'fileA.txt'), 'Conteúdo original A');
    await fsp.writeFile(path.join(changeSourceDir, 'fileB.txt'), 'Conteúdo original B');
    await fsp.writeFile(path.join(changeSourceDir, 'fileC.txt'), 'Conteúdo original C');

    const fsProvider = new LocalFilesystemProvider();
    const detector = new ChangeDetector(fsProvider, { detectRenames: true });

    // 1. Snapshot Inicial (sem baseManifest)
    const initialChanges = await detector.detectChanges({
      source: { paths: [changeSourceDir] }
    });

    if (initialChanges.added.length !== 3) {
      throw new Error(`Esperado 3 arquivos ADD, obteve ${initialChanges.added.length}`);
    }

    // Criar manifesto sintético para simular backup anterior
    const baseManifest = {
      manifestVersion: '2.0.0',
      executionId: crypto.randomUUID(),
      jobId: crypto.randomUUID(),
      jobType: 'FULL',
      createdAt: new Date().toISOString(),
      totalFiles: 3,
      totalSizeBytes: 300,
      files: [
        { path: 'fileA.txt', sizeBytes: 20, modifiedAtMs: Date.now() - 10000, sha256: await fsProvider.calculateHash(path.join(changeSourceDir, 'fileA.txt')), compressedSizeBytes: 20, isEncrypted: false },
        { path: 'fileB.txt', sizeBytes: 20, modifiedAtMs: Date.now() - 10000, sha256: await fsProvider.calculateHash(path.join(changeSourceDir, 'fileB.txt')), compressedSizeBytes: 20, isEncrypted: false },
        { path: 'fileC.txt', sizeBytes: 20, modifiedAtMs: Date.now() - 10000, sha256: await fsProvider.calculateHash(path.join(changeSourceDir, 'fileC.txt')), compressedSizeBytes: 20, isEncrypted: false }
      ]
    };

    // 2. Realizar alterações no filesystem: Modificar A, Criar D, Deletar C, Renomear B -> B_renamed.txt
    await fsp.writeFile(path.join(changeSourceDir, 'fileA.txt'), 'Conteúdo MODIFICADO de A com mais bytes!');
    await fsp.writeFile(path.join(changeSourceDir, 'fileD.txt'), 'Novo arquivo D');
    await fsp.unlink(path.join(changeSourceDir, 'fileC.txt'));
    await fsp.rename(path.join(changeSourceDir, 'fileB.txt'), path.join(changeSourceDir, 'fileB_renamed.txt'));

    const detected = await detector.detectChanges({
      source: { paths: [changeSourceDir] },
      baseManifest
    });

    if (!detected.modified.some((m) => m.path === 'fileA.txt')) {
      throw new Error('Falha ao detectar MODIFY em fileA.txt');
    }
    if (!detected.added.some((a) => a.path === 'fileD.txt')) {
      throw new Error('Falha ao detectar ADD em fileD.txt');
    }
    if (!detected.deleted.some((d) => d.path === 'fileC.txt')) {
      throw new Error('Falha ao detectar DELETE em fileC.txt');
    }
    if (!detected.renamed.some((r) => r.path === 'fileB_renamed.txt' && r.previousPath === 'fileB.txt')) {
      throw new Error('Falha ao detectar RENAME em fileB.txt -> fileB_renamed.txt');
    }
  });

  await test('Incremental Backup: Executa cadeia FULL -> INC1 -> INC2 com validação de relação', async () => {
    const incSourceDir = path.join(tempDir, 'inc_source');
    const incStorageDir = path.join(tempDir, 'inc_storage');
    await fsp.mkdir(incSourceDir, { recursive: true });
    await fsp.mkdir(incStorageDir, { recursive: true });

    // Passo 1: Estado inicial com 3 arquivos: A, B, C
    await fsp.writeFile(path.join(incSourceDir, 'A.txt'), 'Arquivo A');
    await fsp.writeFile(path.join(incSourceDir, 'B.txt'), 'Arquivo B');
    await fsp.writeFile(path.join(incSourceDir, 'C.txt'), 'Arquivo C');

    const storage = new LocalStorageProvider(incStorageDir);
    const filesystem = new LocalFilesystemProvider();
    const catalog = new InMemoryBackupCatalog();
    const verification = new DefaultVerificationEngine();
    const eventBus = new SimpleEventBus();
    const secretStore = new InMemorySecretStore();
    const platform = new DefaultPlatformProvider();

    const strategies = new Map();
    strategies.set(BackupJobType.FULL, new BaseFullBackupStrategy());
    strategies.set(BackupJobType.INCREMENTAL, new IncrementalBackupStrategy());
    strategies.set(BackupJobType.DIFFERENTIAL, new DifferentialBackupStrategy());

    const context = new EngineContext(
      { maxConcurrentFiles: 4, streamingChunkSizeBytes: 64 * 1024, defaultTempDir: os.tmpdir(), enableTelemetry: true },
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
    const jobId = crypto.randomUUID();

    const jobTemplate: BackupJob = {
      id: jobId,
      tenantId: 'tenant-enterprise',
      name: 'Job de Backup Incremental',
      jobType: BackupJobType.FULL,
      priority: 1,
      source: { paths: [incSourceDir] },
      destination: {
        id: crypto.randomUUID(),
        name: 'Storage Local',
        providerType: StorageProviderType.LOCAL,
        baseUri: incStorageDir,
        config: {}
      },
      policy: {
        compressionType: CompressionType.NONE,
        compressionLevel: 0,
        encryptionAlgorithm: EncryptionAlgorithm.NONE,
        keyDerivation: 'NONE',
        vssEnabled: false,
        retentionDays: 30,
        maxVersions: 10,
        safeDeleteRetentionDays: 30,
        verifyChecksumAfterWrite: true
      },
      status: BackupJobStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Execução FULL
    const fullResult = await executor.executeJob({ ...jobTemplate, jobType: BackupJobType.FULL });
    if (!fullResult.success || fullResult.metrics.filesProcessed !== 3) {
      throw new Error('Falha na execução do Full Base');
    }

    const fullManifest = await catalog.getManifest(fullResult.executionId);
    if (!fullManifest || fullManifest.sequence !== 0 || fullManifest.chainId !== fullResult.executionId) {
      throw new Error('Manifesto do Full não contém metadados de cadeia corretos');
    }

    // Passo 2: Alteração: A modificado, D criado
    await new Promise((r) => setTimeout(r, 1100)); // Garantir mtime delta
    await fsp.writeFile(path.join(incSourceDir, 'A.txt'), 'Arquivo A MODIFICADO!');
    await fsp.writeFile(path.join(incSourceDir, 'D.txt'), 'Arquivo D NOVO');

    // 2. Execução INCREMENTAL 1
    const inc1Result = await executor.executeJob({ ...jobTemplate, jobType: BackupJobType.INCREMENTAL });
    if (!inc1Result.success) {
      throw new Error(`Falha no Incremental 1: ${inc1Result.errors.join(', ')}`);
    }
    if (inc1Result.metrics.filesProcessed !== 2) {
      throw new Error(`Esperado 2 arquivos processados no Inc 1 (A e D), obteve ${inc1Result.metrics.filesProcessed}`);
    }

    const inc1Manifest = await catalog.getManifest(inc1Result.executionId);
    if (!inc1Manifest || inc1Manifest.sequence !== 1 || inc1Manifest.parentExecutionId !== fullResult.executionId) {
      throw new Error('Manifesto do Inc 1 com relacionamento de cadeia inválido');
    }

    // Passo 3: Alteração: B modificado, C removido, E criado
    await new Promise((r) => setTimeout(r, 1100));
    await fsp.writeFile(path.join(incSourceDir, 'B.txt'), 'Arquivo B MODIFICADO!');
    await fsp.unlink(path.join(incSourceDir, 'C.txt'));
    await fsp.writeFile(path.join(incSourceDir, 'E.txt'), 'Arquivo E NOVO');

    // 3. Execução INCREMENTAL 2
    const inc2Result = await executor.executeJob({ ...jobTemplate, jobType: BackupJobType.INCREMENTAL });
    if (!inc2Result.success) {
      throw new Error(`Falha no Incremental 2: ${inc2Result.errors.join(', ')}`);
    }
    if (inc2Result.metrics.filesProcessed !== 2) {
      throw new Error(`Esperado 2 arquivos transferidos no Inc 2 (B e E), obteve ${inc2Result.metrics.filesProcessed}`);
    }

    const inc2Manifest = await catalog.getManifest(inc2Result.executionId);
    if (!inc2Manifest || inc2Manifest.sequence !== 2 || inc2Manifest.parentExecutionId !== inc1Result.executionId) {
      throw new Error('Manifesto do Inc 2 não aponta para o Inc 1 como pai direto');
    }
    if (!inc2Manifest.deletedFiles?.includes('C.txt')) {
      throw new Error('Inc 2 não registrou a deleção de C.txt no manifesto');
    }

    // Validar integridade dos arquivos no Storage Provider
    const isStoredA = await storage.exists(`backups/${jobId}/${inc1Result.executionId}/data/A.txt`);
    const isStoredE = await storage.exists(`backups/${jobId}/${inc2Result.executionId}/data/E.txt`);
    if (!isStoredA || !isStoredE) {
      throw new Error('Arquivos do Incremental não foram gravados no Storage remoto.');
    }
  });

  await test('Differential Backup: Compara SEMPRE contra o Full acumulando alterações', async () => {
    const diffSourceDir = path.join(tempDir, 'diff_source');
    const diffStorageDir = path.join(tempDir, 'diff_storage');
    await fsp.mkdir(diffSourceDir, { recursive: true });
    await fsp.mkdir(diffStorageDir, { recursive: true });

    await fsp.writeFile(path.join(diffSourceDir, 'A.txt'), 'Conteúdo original A');
    await fsp.writeFile(path.join(diffSourceDir, 'B.txt'), 'Conteúdo original B');
    await fsp.writeFile(path.join(diffSourceDir, 'C.txt'), 'Conteúdo original C');

    const storage = new LocalStorageProvider(diffStorageDir);
    const filesystem = new LocalFilesystemProvider();
    const catalog = new InMemoryBackupCatalog();
    const verification = new DefaultVerificationEngine();
    const eventBus = new SimpleEventBus();
    const secretStore = new InMemorySecretStore();
    const platform = new DefaultPlatformProvider();

    const strategies = new Map();
    strategies.set(BackupJobType.FULL, new BaseFullBackupStrategy());
    strategies.set(BackupJobType.DIFFERENTIAL, new DifferentialBackupStrategy());

    const context = new EngineContext(
      { maxConcurrentFiles: 4, streamingChunkSizeBytes: 64 * 1024, defaultTempDir: os.tmpdir(), enableTelemetry: true },
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
    const jobId = crypto.randomUUID();

    const jobTemplate: BackupJob = {
      id: jobId,
      tenantId: 'tenant-enterprise',
      name: 'Job Differential',
      jobType: BackupJobType.FULL,
      priority: 1,
      source: { paths: [diffSourceDir] },
      destination: {
        id: crypto.randomUUID(),
        name: 'Storage Local',
        providerType: StorageProviderType.LOCAL,
        baseUri: diffStorageDir,
        config: {}
      },
      policy: {
        compressionType: CompressionType.NONE,
        compressionLevel: 0,
        encryptionAlgorithm: EncryptionAlgorithm.NONE,
        keyDerivation: 'NONE',
        vssEnabled: false,
        retentionDays: 30,
        maxVersions: 10,
        safeDeleteRetentionDays: 30,
        verifyChecksumAfterWrite: true
      },
      status: BackupJobStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Executa FULL Base (A, B, C)
    const fullResult = await executor.executeJob({ ...jobTemplate, jobType: BackupJobType.FULL });
    if (!fullResult.success) throw new Error('Falha no Full base do Differential');

    // 2. Alteração 1: A modificado, D criado
    await new Promise((r) => setTimeout(r, 1100));
    await fsp.writeFile(path.join(diffSourceDir, 'A.txt'), 'Arquivo A MODIFICADO 1!');
    await fsp.writeFile(path.join(diffSourceDir, 'D.txt'), 'Arquivo D NOVO 1');

    // Executa Differential 1 -> Esperado: A e D
    const diff1Result = await executor.executeJob({ ...jobTemplate, jobType: BackupJobType.DIFFERENTIAL });
    if (!diff1Result.success || diff1Result.metrics.filesProcessed !== 2) {
      throw new Error(`Esperado 2 arquivos no Diff 1 (A e D), obteve ${diff1Result.metrics.filesProcessed}`);
    }

    // 3. Alteração 2: B modificado, E criado (sem alterar D nem A novamente)
    await new Promise((r) => setTimeout(r, 1100));
    await fsp.writeFile(path.join(diffSourceDir, 'B.txt'), 'Arquivo B MODIFICADO 2!');
    await fsp.writeFile(path.join(diffSourceDir, 'E.txt'), 'Arquivo E NOVO 2');

    // Executa Differential 2 -> Esperado: A, B, D e E (pois acumula TODAS as mudanças desde o FULL)
    const diff2Result = await executor.executeJob({ ...jobTemplate, jobType: BackupJobType.DIFFERENTIAL });
    if (!diff2Result.success) throw new Error('Falha no Diff 2');

    const diff2Manifest = await catalog.getManifest(diff2Result.executionId);
    if (!diff2Manifest) throw new Error('Manifesto do Diff 2 não encontrado');

    // O Diff 2 deve conter A, B, D e E
    const transferredPaths = diff2Manifest.files.map((f) => f.path);
    if (!transferredPaths.includes('A.txt') || !transferredPaths.includes('B.txt') || !transferredPaths.includes('D.txt') || !transferredPaths.includes('E.txt')) {
      throw new Error(`Diff 2 não acumulou todas as alterações desde o Full. Contém: ${transferredPaths.join(', ')}`);
    }

    // Valida que o pai direto do Diff 2 continua sendo o FULL base
    if (diff2Manifest.parentExecutionId !== fullResult.executionId) {
      throw new Error('Diff 2 deveria ter o Full base como parentExecutionId');
    }
  });

  await test('Resilience & Chain Recovery: Job Incremental recusa executar sem Full e se recupera após falhas', async () => {
    const failSourceDir = path.join(tempDir, 'fail_source');
    const failStorageDir = path.join(tempDir, 'fail_storage');
    await fsp.mkdir(failSourceDir, { recursive: true });
    await fsp.mkdir(failStorageDir, { recursive: true });

    await fsp.writeFile(path.join(failSourceDir, 'data.txt'), 'Dados');

    const storage = new LocalStorageProvider(failStorageDir);
    const filesystem = new LocalFilesystemProvider();
    const catalog = new InMemoryBackupCatalog();
    const verification = new DefaultVerificationEngine();
    const eventBus = new SimpleEventBus();
    const secretStore = new InMemorySecretStore();
    const platform = new DefaultPlatformProvider();

    const strategies = new Map();
    strategies.set(BackupJobType.FULL, new BaseFullBackupStrategy());
    strategies.set(BackupJobType.INCREMENTAL, new IncrementalBackupStrategy());

    const context = new EngineContext(
      { maxConcurrentFiles: 4, streamingChunkSizeBytes: 64 * 1024, defaultTempDir: os.tmpdir(), enableTelemetry: true },
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
    const jobId = crypto.randomUUID();

    const orphanIncJob: BackupJob = {
      id: jobId,
      tenantId: 'tenant-demo',
      name: 'Orphan Inc Job',
      jobType: BackupJobType.INCREMENTAL,
      priority: 1,
      source: { paths: [failSourceDir] },
      destination: {
        id: crypto.randomUUID(),
        name: 'Storage Local',
        providerType: StorageProviderType.LOCAL,
        baseUri: failStorageDir,
        config: {}
      },
      policy: {
        compressionType: CompressionType.NONE,
        compressionLevel: 0,
        encryptionAlgorithm: EncryptionAlgorithm.NONE,
        keyDerivation: 'NONE',
        vssEnabled: false,
        retentionDays: 30,
        maxVersions: 5,
        safeDeleteRetentionDays: 30,
        verifyChecksumAfterWrite: true
      },
      status: BackupJobStatus.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Deve falhar com erro CHAIN_BASE_FULL_MISSING quando não há Full prévio
    let failedProperly = false;
    try {
      await executor.executeJob(orphanIncJob);
    } catch (err: any) {
      if (err.code === 'CHAIN_BASE_FULL_MISSING') {
        failedProperly = true;
      }
    }
    if (!failedProperly) {
      throw new Error('Incremental deveria ter lançado CHAIN_BASE_FULL_MISSING');
    }

    // 2. Cria Full válido
    const fullResult = await executor.executeJob({ ...orphanIncJob, jobType: BackupJobType.FULL });
    if (!fullResult.success) throw new Error('Falha ao criar Full de base');

    // 3. Simula registro de uma execução FALHA no catálogo
    const failedExecId = crypto.randomUUID();
    await catalog.registerExecution({
      executionId: failedExecId,
      jobId,
      tenantId: 'tenant-demo',
      executionType: BackupJobType.INCREMENTAL,
      status: BackupJobStatus.FAILED,
      startedAt: new Date(Date.now() + 5000).toISOString(),
      durationMs: 100,
      filesScanned: 0,
      filesProcessed: 0,
      filesFailed: 1,
      bytesScanned: 0,
      bytesProcessed: 0,
      bytesTransferred: 0,
      errorSummary: 'Erro simulado de rede'
    });

    // 4. Próximo Incremental deve ignorar a execução FAILED e usar o último válido (Full)
    await new Promise((r) => setTimeout(r, 1100));
    await fsp.writeFile(path.join(failSourceDir, 'novo.txt'), 'Novo');

    const recoveredIncResult = await executor.executeJob(orphanIncJob);
    if (!recoveredIncResult.success) {
      throw new Error(`Falha na recuperação da cadeia: ${recoveredIncResult.errors.join(', ')}`);
    }

    const recoveredManifest = await catalog.getManifest(recoveredIncResult.executionId);
    if (!recoveredManifest || recoveredManifest.parentExecutionId !== fullResult.executionId) {
      throw new Error('Incremental recuperado deveria ter apontado para o último Full válido como pai');
    }
  });

  // Limpeza
  try {
    await fsp.rm(tempDir, { recursive: true, force: true });
  } catch {}

  const allPassed = results.every((r) => r.passed);
  return { passed: allPassed, results };
}

// Auto-execução ao rodar diretamente via CLI
if (process.argv[1]?.includes('core-engine.test')) {
  runCoreEngineTests().then(({ passed, results }) => {
    console.log('\n==================================================');
    console.log(`RESULTADO DOS TESTES DO CORE BACKUP ENGINE: ${passed ? '✅ TODOS PASSARAM' : '❌ HOUVE FALHAS'}`);
    console.log('==================================================');
    for (const r of results) {
      console.log(`${r.passed ? '✅' : '❌'} ${r.name} (${r.durationMs}ms)`);
      if (r.error) {
        console.error(`   Detalhe do erro: ${r.error}`);
      }
    }
    if (!passed) {
      process.exit(1);
    }
  }).catch((err) => {
    console.error('Erro fatal executando suite de testes:', err);
    process.exit(1);
  });
}
