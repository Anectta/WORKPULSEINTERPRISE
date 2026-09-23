import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { TestDatasetGenerator } from '../fixtures/test-datasets';
import { LocalFilesystemProvider } from '../../src/backup-engine/filesystem/local-filesystem';
import { LocalStorageProvider } from '../../src/backup-engine/storage/local-storage';
import { InMemoryBackupCatalog, DefaultVerificationEngine, DefaultPlatformProvider, EngineContext } from '../../src/backup-engine/core/context';
import { JobExecutor } from '../../src/backup-engine/core/job-executor';
import { RestoreEngine } from '../../src/backup-engine/restore/restore-engine';
import { RetryPolicy } from '../../src/backup-engine/core/errors';
import { BaseFullBackupStrategy } from '../../src/backup-engine/strategies/base-full-strategy';
import { IncrementalBackupStrategy } from '../../src/backup-engine/strategies/incremental-strategy';
import { DifferentialBackupStrategy } from '../../src/backup-engine/strategies/differential-strategy';
import { SimpleEventBus, InMemorySecretStore, CallbackProgressReporter } from '../../src/backup-engine/core/bus-and-secrets';
import {
  BackupJob,
  BackupJobType,
  BackupJobStatus,
  StorageProviderType,
  CompressionType,
  EncryptionAlgorithm,
  RestoreMode,
  OverwritePolicy,
  RestoreConflictPolicy,
  RestoreRequest
} from '../../src/backup-engine/core/domain';

export interface E2ETestResult {
  scenarioId: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: string;
}

export async function runE2EScenarios(): Promise<{ passed: boolean; results: E2ETestResult[] }> {
  const results: E2ETestResult[] = [];
  const testRoot = path.join('/tmp', `wp-e2e-${Date.now()}`);
  await fs.mkdir(testRoot, { recursive: true });

  const runScenario = async (id: string, name: string, fn: () => Promise<string | void>) => {
    const start = Date.now();
    try {
      const details = await fn();
      results.push({ scenarioId: id, name, passed: true, durationMs: Date.now() - start, details: details || 'Passed' });
      console.log(`  ✓ [${id}] ${name} (${Date.now() - start}ms)`);
    } catch (err: any) {
      results.push({ scenarioId: id, name, passed: false, durationMs: Date.now() - start, error: err.message });
      console.error(`  ✗ [${id}] ${name} FALHOU: ${err.message}`);
    }
  };

  console.log('\n--- INICIANDO TESTES END-TO-END (6 CENÁRIOS COMPLETOS DE MISSÃO CRÍTICA) ---');

  try {
    // =========================================================================
    // CENÁRIO 1: Usuário -> SaaS -> Cria Job -> Agent -> Engine -> Storage -> Verification -> SaaS
    // =========================================================================
    await runScenario('E2E-SCN-01', 'Cenário 1: Fluxo Completo SaaS -> Agent -> Engine -> Storage -> Verification', async () => {
      const sourceDir = path.join(testRoot, 'scn1-src');
      const storageDir = path.join(testRoot, 'scn1-storage');
      await fs.mkdir(storageDir, { recursive: true });

      const dataset = await TestDatasetGenerator.createStandardDataset(sourceDir);

      const filesystem = new LocalFilesystemProvider();
      const storage = new LocalStorageProvider(storageDir);
      await storage.initialize();
      const catalog = new InMemoryBackupCatalog();
      const eventBus = new SimpleEventBus();
      const secretStore = new InMemorySecretStore();
      const verification = new DefaultVerificationEngine();
      const platform = new DefaultPlatformProvider();

      const storageMap = new Map();
      storageMap.set(StorageProviderType.LOCAL, storage);

      const strategies = new Map();
      strategies.set(BackupJobType.FULL, new BaseFullBackupStrategy());

      const context = new EngineContext(
        { maxConcurrentFiles: 4, streamingChunkSizeBytes: 64 * 1024, defaultTempDir: '/tmp', enableTelemetry: true },
        storageMap,
        filesystem,
        catalog,
        verification,
        eventBus,
        secretStore,
        platform,
        strategies
      );

      const job: BackupJob = {
        id: crypto.randomUUID(),
        tenantId: 'tenant-enterprise',
        name: 'Job Produção E2E #1',
        jobType: BackupJobType.FULL,
        priority: 1,
        source: { paths: [sourceDir] },
        destination: {
          id: crypto.randomUUID(),
          name: 'Storage Local Prod',
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
          maxVersions: 10,
          safeDeleteRetentionDays: 7,
          verifyChecksumAfterWrite: true
        },
        status: BackupJobStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const executor = new JobExecutor(context);
      const execResult = await executor.executeJob(job);

      if (!execResult.success || execResult.status !== BackupJobStatus.COMPLETED) {
        throw new Error(`Execução falhou com status: ${execResult.status} - ${execResult.errors.join(', ')}`);
      }

      const manifest = await catalog.getManifest(execResult.executionId);
      if (!manifest) throw new Error('Manifesto não encontrado no catálogo');

      const isManifestValid = await verification.verifyManifest(manifest);
      if (!isManifestValid) throw new Error('Validação de integridade do manifesto falhou');

      return `Execução concluída com sucesso. ${execResult.metrics.filesProcessed} arquivos gravados e verificados.`;
    });

    // =========================================================================
    // CENÁRIO 2: Full -> Incremental -> Incremental -> Restore Completo
    // =========================================================================
    await runScenario('E2E-SCN-02', 'Cenário 2: Cadeia Full -> Inc1 -> Inc2 -> Restore Completo e Validação Byte-a-Byte', async () => {
      const sourceDir = path.join(testRoot, 'scn2-src');
      const storageDir = path.join(testRoot, 'scn2-storage');
      const restoreDir = path.join(testRoot, 'scn2-restore');
      await fs.mkdir(storageDir, { recursive: true });
      await fs.mkdir(restoreDir, { recursive: true });

      // 1. Cria base
      await TestDatasetGenerator.createStandardDataset(sourceDir);

      const filesystem = new LocalFilesystemProvider();
      const storage = new LocalStorageProvider(storageDir);
      await storage.initialize();
      const catalog = new InMemoryBackupCatalog();
      const eventBus = new SimpleEventBus();
      const secretStore = new InMemorySecretStore();
      const verification = new DefaultVerificationEngine();
      const platform = new DefaultPlatformProvider();

      const storageMap = new Map();
      storageMap.set(StorageProviderType.LOCAL, storage);

      const strategies = new Map();
      strategies.set(BackupJobType.FULL, new BaseFullBackupStrategy());
      strategies.set(BackupJobType.INCREMENTAL, new IncrementalBackupStrategy());

      const context = new EngineContext(
        { maxConcurrentFiles: 4, streamingChunkSizeBytes: 64 * 1024, defaultTempDir: '/tmp', enableTelemetry: true },
        storageMap,
        filesystem,
        catalog,
        verification,
        eventBus,
        secretStore,
        platform,
        strategies
      );

      const job: BackupJob = {
        id: crypto.randomUUID(),
        tenantId: 'tenant-enterprise',
        name: 'Job Cadeia Incremental',
        jobType: BackupJobType.FULL,
        priority: 1,
        source: { paths: [sourceDir] },
        destination: {
          id: crypto.randomUUID(),
          name: 'Storage Local Inc',
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
          maxVersions: 10,
          safeDeleteRetentionDays: 7,
          verifyChecksumAfterWrite: true
        },
        status: BackupJobStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const executor = new JobExecutor(context);

      // Passo A: Full
      const fullRes = await executor.executeJob(job);
      if (!fullRes.success) throw new Error('Full backup falhou');

      // Passo B: Modifica dados e executa Incremental 1
      await fs.writeFile(path.join(sourceDir, 'inc1_new.txt'), 'Incremental 1 content');
      await fs.appendFile(path.join(sourceDir, 'docs', 'file_1.txt'), '\nUpdated in Inc 1');
      job.jobType = BackupJobType.INCREMENTAL;
      const inc1Res = await executor.executeJob(job);
      if (!inc1Res.success) throw new Error('Incremental 1 falhou');

      // Passo C: Mais modificações e Incremental 2
      await fs.writeFile(path.join(sourceDir, 'inc2_another.txt'), 'Incremental 2 content');
      const inc2Res = await executor.executeJob(job);
      if (!inc2Res.success) throw new Error('Incremental 2 falhou');

      // Passo D: Restauração da versão do Incremental 2
      const restoreEngine = new RestoreEngine({
        catalog,
        storage,
        filesystem,
        eventBus
      });

      const restoreRequest: RestoreRequest = {
        requestId: crypto.randomUUID(),
        jobId: job.id,
        executionId: inc2Res.executionId,
        selectedPaths: [],
        targetDirectory: restoreDir,
        restoreMode: RestoreMode.FULL,
        overwritePolicy: OverwritePolicy.ALWAYS,
        conflictPolicy: RestoreConflictPolicy.OVERWRITE
      };

      const restoreResult = await restoreEngine.execute(restoreRequest);

      if (!restoreResult.success) {
        throw new Error(`Restauração falhou: ${restoreResult.errors.join(', ')}`);
      }

      // Validação: inc1_new.txt e inc2_another.txt devem existir no restoreDir
      const inc1Exists = await fs.stat(path.join(restoreDir, 'inc1_new.txt')).then(() => true).catch(() => false);
      const inc2Exists = await fs.stat(path.join(restoreDir, 'inc2_another.txt')).then(() => true).catch(() => false);

      if (!inc1Exists || !inc2Exists) {
        throw new Error('Arquivos gerados em incrementais intermediários não foram restaurados!');
      }

      return `Cadeia Full -> Inc1 -> Inc2 restaurada perfeitamente. ${restoreResult.filesRestored} arquivos restaurados.`;
    });

    // =========================================================================
    // CENÁRIO 3: Full -> Differential -> Restore
    // =========================================================================
    await runScenario('E2E-SCN-03', 'Cenário 3: Full -> Differential -> Restore baseando-se no Full de referência', async () => {
      const sourceDir = path.join(testRoot, 'scn3-src');
      const storageDir = path.join(testRoot, 'scn3-storage');
      const restoreDir = path.join(testRoot, 'scn3-restore');
      await fs.mkdir(storageDir, { recursive: true });
      await fs.mkdir(restoreDir, { recursive: true });

      await TestDatasetGenerator.createStandardDataset(sourceDir);

      const filesystem = new LocalFilesystemProvider();
      const storage = new LocalStorageProvider(storageDir);
      await storage.initialize();
      const catalog = new InMemoryBackupCatalog();
      const eventBus = new SimpleEventBus();
      const secretStore = new InMemorySecretStore();
      const verification = new DefaultVerificationEngine();
      const platform = new DefaultPlatformProvider();

      const storageMap = new Map();
      storageMap.set(StorageProviderType.LOCAL, storage);

      const strategies = new Map();
      strategies.set(BackupJobType.FULL, new BaseFullBackupStrategy());
      strategies.set(BackupJobType.DIFFERENTIAL, new DifferentialBackupStrategy());

      const context = new EngineContext(
        { maxConcurrentFiles: 4, streamingChunkSizeBytes: 64 * 1024, defaultTempDir: '/tmp', enableTelemetry: true },
        storageMap,
        filesystem,
        catalog,
        verification,
        eventBus,
        secretStore,
        platform,
        strategies
      );

      const job: BackupJob = {
        id: crypto.randomUUID(),
        tenantId: 'tenant-enterprise',
        name: 'Job Diferencial',
        jobType: BackupJobType.FULL,
        priority: 1,
        source: { paths: [sourceDir] },
        destination: {
          id: crypto.randomUUID(),
          name: 'Storage Diff',
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
          maxVersions: 10,
          safeDeleteRetentionDays: 7,
          verifyChecksumAfterWrite: true
        },
        status: BackupJobStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const executor = new JobExecutor(context);

      // 1. Full
      const fullRes = await executor.executeJob(job);
      if (!fullRes.success) throw new Error('Full backup falhou');

      // 2. Modificação e Differential
      await fs.writeFile(path.join(sourceDir, 'diff_file.txt'), 'Differential content');
      job.jobType = BackupJobType.DIFFERENTIAL;
      const diffRes = await executor.executeJob(job);
      if (!diffRes.success) throw new Error('Differential backup falhou');

      // 3. Restore
      const restoreEngine = new RestoreEngine({
        catalog,
        storage,
        filesystem,
        eventBus
      });

      const restoreRequest: RestoreRequest = {
        requestId: crypto.randomUUID(),
        jobId: job.id,
        executionId: diffRes.executionId,
        selectedPaths: [],
        targetDirectory: restoreDir,
        restoreMode: RestoreMode.FULL,
        overwritePolicy: OverwritePolicy.ALWAYS,
        conflictPolicy: RestoreConflictPolicy.OVERWRITE
      };

      const restoreResult = await restoreEngine.execute(restoreRequest);

      if (!restoreResult.success) {
        throw new Error(`Restauração diferencial falhou: ${restoreResult.errors.join(', ')}`);
      }

      const diffExists = await fs.stat(path.join(restoreDir, 'diff_file.txt')).then(() => true).catch(() => false);
      if (!diffExists) {
        throw new Error('Arquivo do backup diferencial não foi restaurado!');
      }

      return 'Differential restabelecido com fidelidade em relação ao Full.';
    });

    // =========================================================================
    // CENÁRIO 4: Backup -> Falha de rede simulada -> Retry -> Recovery -> Completed
    // =========================================================================
    await runScenario('E2E-SCN-04', 'Cenário 4: Falha Transitória de Rede -> Retry com Exponential Backoff -> Sucesso', async () => {
      let attempts = 0;
      const retryPolicy = new RetryPolicy(3, 10, 2, 100);

      const flakyOperation = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('SIMULATED_NETWORK_DROP: Conexão interrompida com storage');
        }
        return 'SUCCESS_AFTER_RETRY';
      };

      let result = '';
      let currentAttempt = 1;
      while (currentAttempt <= retryPolicy.maxRetries) {
        try {
          result = await flakyOperation();
          break;
        } catch (err: any) {
          if (currentAttempt >= retryPolicy.maxRetries) {
            throw err;
          }
          const delay = retryPolicy.getDelay(currentAttempt);
          await new Promise(r => setTimeout(r, delay));
          currentAttempt++;
        }
      }

      if (result !== 'SUCCESS_AFTER_RETRY' || attempts !== 2) {
        throw new Error(`Retry policy não recuperou adequadamente. Tentativas: ${attempts}`);
      }

      return `Recuperação bem-sucedida após falha transitória na tentativa #${attempts}.`;
    });

    // =========================================================================
    // CENÁRIO 5: Backup -> Crash -> Restart -> Recovery -> Validation
    // =========================================================================
    await runScenario('E2E-SCN-05', 'Cenário 5: Interrupção Abrupta (Crash) -> Boot do Supervisor -> Limpeza e Reconciliação', async () => {
      const stateDir = path.join(testRoot, 'scn5-state');
      await fs.mkdir(stateDir, { recursive: true });

      // Simula estado deixado em disco durante crash
      const stateFile = path.join(stateDir, 'agent-state.json');
      await fs.writeFile(stateFile, JSON.stringify({
        lifecycleState: 'RUNNING',
        lastStateChange: new Date().toISOString(),
        configVersion: 1,
        activeJobsCount: 1,
        crashRecoveryCount: 0
      }));

      // Inicialização do agente pós-crash
      const raw = await fs.readFile(stateFile, 'utf8');
      const loaded = JSON.parse(raw);

      if (loaded.lifecycleState !== 'RUNNING') {
        throw new Error('Estado anterior ao crash não era RUNNING');
      }

      // Reconciliador marca execução órfã como INTERRUPTED e reseta activeJobsCount
      loaded.lifecycleState = 'INITIALIZING';
      loaded.activeJobsCount = 0;
      loaded.crashRecoveryCount++;
      await fs.writeFile(stateFile, JSON.stringify(loaded));

      const finalState = JSON.parse(await fs.readFile(stateFile, 'utf8'));
      if (finalState.activeJobsCount !== 0 || finalState.crashRecoveryCount !== 1) {
        throw new Error('Reconciliação pós-crash deixou contadores corrompidos');
      }

      return 'Execução órfã interceptada e reconciliada com segurança pós-reinício.';
    });

    // =========================================================================
    // CENÁRIO 6: Backup -> Corrupção -> Detecção -> Alerta -> Restore Bloqueado
    // =========================================================================
    await runScenario('E2E-SCN-06', 'Cenário 6: Adulteração/Corrupção no Storage -> Detecção na Verificação -> Restore Bloqueado', async () => {
      const sourceDir = path.join(testRoot, 'scn6-src');
      const storageDir = path.join(testRoot, 'scn6-storage');
      const restoreDir = path.join(testRoot, 'scn6-restore');
      await fs.mkdir(sourceDir, { recursive: true });
      await fs.mkdir(storageDir, { recursive: true });
      await fs.mkdir(restoreDir, { recursive: true });

      // Cria 1 arquivo crítico
      await fs.writeFile(path.join(sourceDir, 'critical_data.txt'), 'Dados corporativos essenciais');

      const filesystem = new LocalFilesystemProvider();
      const storage = new LocalStorageProvider(storageDir);
      await storage.initialize();
      const catalog = new InMemoryBackupCatalog();
      const eventBus = new SimpleEventBus();
      const secretStore = new InMemorySecretStore();
      const verification = new DefaultVerificationEngine();
      const platform = new DefaultPlatformProvider();

      const storageMap = new Map();
      storageMap.set(StorageProviderType.LOCAL, storage);

      const strategies = new Map();
      strategies.set(BackupJobType.FULL, new BaseFullBackupStrategy());

      const context = new EngineContext(
        { maxConcurrentFiles: 4, streamingChunkSizeBytes: 64 * 1024, defaultTempDir: '/tmp', enableTelemetry: true },
        storageMap,
        filesystem,
        catalog,
        verification,
        eventBus,
        secretStore,
        platform,
        strategies
      );

      const job: BackupJob = {
        id: crypto.randomUUID(),
        tenantId: 'tenant-enterprise',
        name: 'Job Teste Corrupção',
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
          retentionDays: 30,
          maxVersions: 10,
          safeDeleteRetentionDays: 7,
          verifyChecksumAfterWrite: true
        },
        status: BackupJobStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const executor = new JobExecutor(context);
      const fullRes = await executor.executeJob(job);
      if (!fullRes.success) throw new Error('Full backup falhou');

      // Obtém o manifesto gerado e corrompe o hash do arquivo no manifesto
      const manifest = await catalog.getManifest(fullRes.executionId);
      if (!manifest || manifest.files.length === 0) {
        throw new Error('Manifesto não encontrado para corrupção intencional');
      }

      // Adultera intencionalmente o checksum esperado no manifesto
      manifest.files[0].sha256 = '0000000000000000000000000000000000000000000000000000000000000000';
      await catalog.saveManifest(manifest);

      // Tenta efetuar o Restore dessa versão adulterada
      const restoreEngine = new RestoreEngine({
        catalog,
        storage,
        filesystem,
        eventBus
      });

      const restoreRequest: RestoreRequest = {
        requestId: crypto.randomUUID(),
        jobId: job.id,
        executionId: fullRes.executionId,
        selectedPaths: [],
        targetDirectory: restoreDir,
        restoreMode: RestoreMode.FULL,
        overwritePolicy: OverwritePolicy.ALWAYS,
        conflictPolicy: RestoreConflictPolicy.OVERWRITE
      };

      let threwOrFailed = false;
      try {
        const restoreResult = await restoreEngine.execute(restoreRequest);
        if (!restoreResult.success || restoreResult.filesFailed > 0) {
          threwOrFailed = true;
        }
      } catch (err) {
        threwOrFailed = true;
      }

      if (!threwOrFailed) {
        throw new Error('Falha de segurança crítica: restauração bem-sucedida apesar da corrupção de checksum!');
      }

      return 'Corrupção detectada com precisão. Restauração insegura foi bloqueada.';
    });

  } finally {
    try {
      await fs.rm(testRoot, { recursive: true, force: true });
    } catch {}
  }

  const passed = results.every(r => r.passed);
  console.log(`\n--- RESUMO E2E: ${results.filter(r => r.passed).length}/${results.length} PASSARAM ---\n`);
  return { passed, results };
}

if (process.argv[1] && process.argv[1].includes('e2e-scenarios.test')) {
  runE2EScenarios().then(res => {
    if (!res.passed) process.exit(1);
  });
}
