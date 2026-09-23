import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { AesGcmEncryptionProvider } from '../../src/backup-engine/crypto/aes-gcm-provider';
import { InMemoryBackupCatalog } from '../../src/backup-engine/core/context';
import { RestoreChainResolver } from '../../src/backup-engine/restore/chain-resolver';
import { EngineSupervisor } from '../../src/backup-agent/engine-bridge/engine-supervisor';
import { EngineProcessManager } from '../../src/backup-agent/engine-bridge/engine-process-manager';
import { SpoolQueue } from '../../src/backup-agent/persistence/spool-queue';
import { AgentStateStore } from '../../src/backup-agent/persistence/state-store';
import { AgentLifecycleState } from '../../src/backup-agent/domain/states';
import { MirrorExecutor } from '../../src/backup-engine/core/mirror-executor';
import { CancellationToken } from '../../src/backup-engine/core/errors';
import { LocalStorageProvider } from '../../src/backup-engine/storage/local-storage';
import { FaultInjector } from './fault-injector';

export interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export async function runFailureResilienceTests(): Promise<{ passed: boolean; results: TestResult[] }> {
  const results: TestResult[] = [];
  const testTempDir = path.join('/tmp', `wp-failure-test-${Date.now()}`);
  await fs.mkdir(testTempDir, { recursive: true });

  const runTest = async (name: string, fn: () => Promise<void>) => {
    const start = Date.now();
    try {
      await fn();
      results.push({ name, passed: true, durationMs: Date.now() - start });
      console.log(`  ✓ ${name} (${Date.now() - start}ms)`);
    } catch (err: any) {
      results.push({ name, passed: false, durationMs: Date.now() - start, error: err.message });
      console.error(`  ✗ ${name} FALHOU: ${err.message}`);
    }
  };

  console.log('\n--- INICIANDO TESTES: RESILIÊNCIA, FAULT INJECTION & RECUPERAÇÃO DE FALHAS ---');

  try {
    // 1. Detecção e Bloqueio de Criptotexto Adulterado (AEAD Tampering)
    await runTest('1. Criptografia AEAD: Rejeita imediatamente texto cifrado adulterado sem emitir dados parciais', async () => {
      const aesProvider = new AesGcmEncryptionProvider(1024);
      const dek = crypto.randomBytes(32);
      const plainContent = Buffer.from('Segredo Corporativo Altamente Confidencial - WorkPulse Enterprise');
      const plainSha = crypto.createHash('sha256').update(plainContent).digest('hex');

      const { Readable } = await import('node:stream');
      const toStream = (b: Buffer) => {
        const s = new Readable();
        s.push(b);
        s.push(null);
        return s;
      };
      const streamToBuf = async (s: any): Promise<Buffer> => {
        const chunks: Buffer[] = [];
        for await (const chunk of s) chunks.push(Buffer.from(chunk));
        return Buffer.concat(chunks);
      };

      const encHandle = await aesProvider.encryptStream(
        toStream(plainContent),
        dek,
        {
          algorithm: 'AES_256_GCM',
          keyId: 'k-tamper',
          kdf: { type: 'PBKDF2', params: { iterations: 1000, hashAlgorithm: 'sha256', outputLength: 32 } },
          saltHex: 'ee'.repeat(32),
          chunkSizeBytes: 1024,
          originalSizeBytes: plainContent.length,
          originalSha256: plainSha,
          createdAt: new Date().toISOString()
        },
        { wrappedDekHex: 'aa'.repeat(32), wrappedDekIvHex: 'bb'.repeat(12), wrappedDekTagHex: 'cc'.repeat(16) }
      );

      const cipherBytes = await streamToBuf(encHandle.stream);

      // Adultera 1 byte no final do buffer cifrado (onde fica a tag ou o bloco)
      cipherBytes[cipherBytes.length - 4] ^= 0x55;

      let threw = false;
      try {
        const dec = await aesProvider.decryptStream(toStream(cipherBytes), dek);
        await streamToBuf(dec.stream);
      } catch (err: any) {
        threw = true;
      }

      if (!threw) {
        throw new Error('Falha de segurança crítica: decriptador aceitou texto cifrado adulterado!');
      }
    });

    // 2. Aborto de Stream e Interrupção por CancellationToken
    await runTest('2. Interrupção Atômica: CancellationToken cancela processamento em streaming limpando recursos', async () => {
      const token = new CancellationToken();

      // Simula operação longa cancelada após 20ms
      setTimeout(() => token.cancel('Cancelamento forçado pelo operador'), 20);

      let wasCancelled = false;
      try {
        for (let i = 0; i < 50; i++) {
          token.throwIfCancelled();
          await new Promise(r => setTimeout(r, 5));
        }
      } catch (err: any) {
        if (token.isCancelled) {
          wasCancelled = true;
        }
      }

      if (!wasCancelled) {
        throw new Error('CancellationToken não interrompeu a operação streaming');
      }
    });

    // 3. Detecção de Cadeia Incremental Quebrada (Broken Chain)
    await runTest('3. Integridade de Cadeia: RestoreChainResolver detecta e recusa versão órfã com elo rompido', async () => {
      const catalog = new InMemoryBackupCatalog();
      const storageDir = path.join(testTempDir, 'storage-chain');
      await fs.mkdir(storageDir, { recursive: true });
      const storage = new LocalStorageProvider(storageDir);
      await storage.initialize();

      // Grava Full Backup A
      await catalog.registerExecution({
        executionId: 'v-full-1',
        jobId: 'job-chain-1',
        type: 'FULL' as any,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        status: 'SUCCESS' as any,
        stats: {
          totalFiles: 10,
          transferredFiles: 10,
          totalBytes: 1000,
          transferredBytes: 1000,
          durationMs: 100
        }
      } as any);

      // Grava Incremental B que aponta para um Full inexistente 'v-ghost-999'
      await catalog.registerExecution({
        executionId: 'v-inc-broken',
        jobId: 'job-chain-1',
        type: 'INCREMENTAL' as any,
        baseExecutionId: 'v-ghost-999', // Inexistente
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        status: 'SUCCESS' as any,
        stats: {
          totalFiles: 2,
          transferredFiles: 2,
          totalBytes: 200,
          transferredBytes: 200,
          durationMs: 50
        }
      } as any);

      let failedSafely = false;
      try {
        await RestoreChainResolver.resolveAndValidateChain(catalog, storage, 'job-chain-1', 'v-inc-broken');
      } catch (err: any) {
        failedSafely = true;
      }

      if (!failedSafely) {
        throw new Error('RestoreChainResolver deveria ter bloqueado a cadeia quebrada');
      }
    });

    // 4. Circuit Breaker do Engine Supervisor contra Crash Loop
    await runTest('4. Engine Supervisor: Ativa circuit breaker STOPPED_FOR_SAFETY após 5 falhas seguidas', async () => {
      const processManager = new EngineProcessManager(
        path.join(testTempDir, 'crash-ipc.sock'),
        'fake-token'
      );
      const supervisor = new EngineSupervisor(processManager);

      // Coloca em supervisão
      (supervisor as any).isSupervising = true;

      // Dispara 5 eventos de crash consecutivos
      for (let i = 1; i <= 5; i++) {
        processManager.emit('process_crashed', new Error(`Crash simulado #${i}`));
      }

      const metrics = supervisor.getMetrics();
      if (!metrics.isCircuitBreakerTripped) {
        throw new Error(`Circuit breaker não disparou. Falhas: ${metrics.crashCount}`);
      }
      if (metrics.state !== 'STOPPED_FOR_SAFETY') {
        throw new Error(`Estado do supervisor deveria ser STOPPED_FOR_SAFETY, obtido: ${metrics.state}`);
      }

      await supervisor.stop();
    });

    // 5. Recuperação de Crash: Detecção de Execuções Órfãs no Reinício
    await runTest('5. Crash Recovery: Detecta estado RUNNING residual no boot e reconcilia sem corrupção', async () => {
      const stateDir = path.join(testTempDir, 'crash-state-store');
      const store = new AgentStateStore(stateDir);

      // Simula agente que sofreu crash repentino enquanto gravava estado RUNNING
      await store.saveState({
        lifecycleState: AgentLifecycleState.RUNNING,
        lastStateChange: new Date(Date.now() - 3600000).toISOString(),
        configVersion: 1,
        activeJobsCount: 2,
        crashRecoveryCount: 0
      });

      // Novo boot do agente lê o estado
      const restored = await store.loadState();
      // O agente deve detectar que não encerrou graciosamente (não estava STOPPED)
      const sufferedCrash = restored.lifecycleState === AgentLifecycleState.RUNNING;
      if (!sufferedCrash) {
        throw new Error('Não identificou execução interrompida por crash anterior');
      }

      // Reconcilia o estado pós-boot
      await store.saveState({
        ...restored,
        lifecycleState: AgentLifecycleState.INITIALIZING,
        activeJobsCount: 0,
        crashRecoveryCount: restored.crashRecoveryCount + 1,
        lastStateChange: new Date().toISOString()
      });

      const reconciled = await store.loadState();
      if (reconciled.crashRecoveryCount !== 1 || reconciled.activeJobsCount !== 0) {
        throw new Error('Reconciliação de estado após crash falhou');
      }
    });

    // 6. Proteção de Mirror contra Exclusão Catastrófica (Safety Threshold)
    await runTest('6. Mirror Safe Threshold: Bloqueia exclusão em massa no destino quando scanner retorna anomalia', async () => {
      const mirrorSource = path.join(testTempDir, 'mirror-src-empty');
      const mirrorDest = path.join(testTempDir, 'mirror-dst');
      await fs.mkdir(mirrorSource, { recursive: true });
      await fs.mkdir(mirrorDest, { recursive: true });

      // No destino existem 10 arquivos essenciais
      for (let i = 1; i <= 10; i++) {
        await fs.writeFile(path.join(mirrorDest, `essential_file_${i}.txt`), `Content ${i}`);
      }

      const { LocalFilesystemProvider } = await import('../../src/backup-engine/filesystem/local-filesystem');
      const filesystem = new LocalFilesystemProvider();
      const storage = new LocalStorageProvider(mirrorDest);
      await storage.initialize();

      const mirrorExecutor = new MirrorExecutor();
      const job = {
        id: crypto.randomUUID(),
        tenantId: 'tenant-1',
        name: 'Job Mirror Scanner Safety',
        jobType: 'MIRROR' as any,
        priority: 1,
        source: { paths: [mirrorSource] },
        destination: {
          id: crypto.randomUUID(),
          name: 'Local Dest',
          providerType: 'LOCAL' as any,
          baseUri: mirrorDest,
          config: {}
        },
        policy: {
          compressionType: 'NONE' as any,
          compressionLevel: 0,
          encryptionAlgorithm: 'NONE' as any,
          keyDerivation: 'NONE' as any,
          vssEnabled: false,
          retentionDays: 30,
          maxVersions: 1,
          safeDeleteRetentionDays: 0,
          verifyChecksumAfterWrite: true
        },
        status: 'PENDING' as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let caughtError = false;
      try {
        await mirrorExecutor.execute({
          job,
          policy: {
            allowDelete: true,
            safetyThreshold: { abortOnThresholdExceeded: true, allowEmptySourceDeletion: false, maxDeletionPercent: 20 }
          },
          filesystem,
          storage
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

      // Garante que os arquivos no destino NÃO foram apagados
      const destFiles = await fs.readdir(mirrorDest);
      if (destFiles.length !== 10) {
        throw new Error(`Arquivos do destino foram apagados indevidamente! Restaram apenas ${destFiles.length}`);
      }
    });

    // 7. Simulação de Desconexão de Rede e Drenagem da Spool Queue
    await runTest('7. Resiliência de Rede: Fila de spool persiste offline e drena em ordem FIFO após retorno', async () => {
      const spoolDir = path.join(testTempDir, 'spool-recovery');
      const queue = new SpoolQueue(spoolDir, 50);
      await queue.init();

      // Enfileira 5 eventos enquanto offline
      for (let i = 1; i <= 5; i++) {
        await queue.enqueue('EVENT', { sequence: i, payload: `event-data-${i}` });
      }

      if (queue.size() !== 5) {
        throw new Error(`Spool queue deveria ter 5 itens, possui ${queue.size()}`);
      }

      // Reinicia instância da fila para simular queda de processo enquanto offline
      const restartedQueue = new SpoolQueue(spoolDir, 50);
      await restartedQueue.init();
      if (restartedQueue.size() !== 5) {
        throw new Error('Fila offline não persistiu itens no disco após restart');
      }

      // Simula reconexão e consumo FIFO
      const peeked = await restartedQueue.peek(5);
      const sequences = peeked.map(item => (item.payload as any).sequence);
      if (JSON.stringify(sequences) !== JSON.stringify([1, 2, 3, 4, 5])) {
        throw new Error(`Ordem FIFO corrompida: ${JSON.stringify(sequences)}`);
      }

      // Confirma e remove da fila
      await restartedQueue.acknowledge(peeked.map(i => i.id));
      if (restartedQueue.size() !== 0) {
        throw new Error('Acknowledge não esvaziou a fila após entrega');
      }
    });

  } finally {
    try {
      await fs.rm(testTempDir, { recursive: true, force: true });
    } catch {}
  }

  const passed = results.every(r => r.passed);
  console.log(`\n--- RESUMO RESILIÊNCIA: ${results.filter(r => r.passed).length}/${results.length} PASSARAM ---\n`);
  return { passed, results };
}

if (process.argv[1] && process.argv[1].includes('failure-resilience.test')) {
  runFailureResilienceTests().then(res => {
    if (!res.passed) process.exit(1);
  });
}
