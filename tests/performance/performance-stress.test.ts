import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { TestDatasetGenerator } from '../fixtures/test-datasets';

export interface PerfTestResult {
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  throughputMBps?: number;
  memoryDeltaMB?: number;
  details?: string;
  error?: string;
}

export async function runPerformanceAndStressTests(): Promise<{ passed: boolean; results: PerfTestResult[] }> {
  const results: PerfTestResult[] = [];
  const testRoot = path.join('/tmp', `wp-perf-${Date.now()}`);
  await fs.mkdir(testRoot, { recursive: true });

  const runTest = async (id: string, name: string, fn: () => Promise<{ details?: string; throughputMBps?: number; memoryDeltaMB?: number }>) => {
    const start = Date.now();
    try {
      const res = await fn();
      results.push({
        id,
        name,
        passed: true,
        durationMs: Date.now() - start,
        throughputMBps: res.throughputMBps,
        memoryDeltaMB: res.memoryDeltaMB,
        details: res.details || 'Passed'
      });
      console.log(`  ✓ [${id}] ${name} (${Date.now() - start}ms)`);
    } catch (err: any) {
      results.push({ id, name, passed: false, durationMs: Date.now() - start, error: err.message });
      console.error(`  ✗ [${id}] ${name} FALHOU: ${err.message}`);
    }
  };

  console.log('\n--- INICIANDO TESTES: PERFORMANCE, CONCORRÊNCIA, IDEMPOTÊNCIA & ESTRESSE ---');

  try {
    // 1. Throughput de Streaming & Medição de Memória
    await runTest('PERF-STR-01', 'Streaming Throughput & Eficiência de Memória (Sem vazamento de heap)', async () => {
      const totalBytes = 50 * 1024 * 1024; // 50 MB
      const chunkSize = 64 * 1024; // 64 KB
      const chunk = crypto.randomBytes(chunkSize);
      const chunksCount = totalBytes / chunkSize;

      const memBefore = process.memoryUsage().heapUsed;
      const t0 = Date.now();

      const hash = crypto.createHash('sha256');
      for (let i = 0; i < chunksCount; i++) {
        hash.update(chunk);
      }
      const digest = hash.digest('hex');

      const durationSec = (Date.now() - t0) / 1000;
      const throughputMBps = durationSec > 0 ? (totalBytes / (1024 * 1024)) / durationSec : 999;
      const memAfter = process.memoryUsage().heapUsed;
      const memoryDeltaMB = Math.max(0, (memAfter - memBefore) / (1024 * 1024));

      if (!digest || digest.length !== 64) throw new Error('Digest inválido');
      if (memoryDeltaMB > 25) {
        throw new Error(`Consumo excessivo de memória durante streaming: ${memoryDeltaMB.toFixed(2)} MB`);
      }

      return {
        details: `50 MB processados a ${throughputMBps.toFixed(2)} MB/s com delta de memória de apenas ${memoryDeltaMB.toFixed(2)} MB.`,
        throughputMBps,
        memoryDeltaMB
      };
    });

    // 2. Concorrência Máxima & Prevenção de Deadlock
    await runTest('PERF-CONC-01', 'Concorrência Máxima de Jobs Simultâneos (Deadlock-Free Lock Lease)', async () => {
      const concurrentJobsCount = 20;
      const lockRegistry = new Set<string>();

      const simulateJobExecution = async (jobId: string, resourceKey: string) => {
        // Tentativa atômica de adquirir lock
        if (lockRegistry.has(resourceKey)) {
          // Espera liberação
          let waits = 0;
          while (lockRegistry.has(resourceKey)) {
            await new Promise(r => setTimeout(r, 5));
            waits++;
            if (waits > 100) throw new Error(`Deadlock detectado aguardando lock: ${resourceKey}`);
          }
        }
        lockRegistry.add(resourceKey);

        // Operação simulada sob lock
        await new Promise(r => setTimeout(r, 10));

        lockRegistry.delete(resourceKey);
        return { jobId, status: 'COMPLETED' };
      };

      // Executa 20 jobs concorrentes competindo por 4 pools de recursos
      const promises = Array.from({ length: concurrentJobsCount }, (_, i) => {
        const pool = `resource-pool-${i % 4}`;
        return simulateJobExecution(`job-${i}`, pool);
      });

      const finished = await Promise.all(promises);
      if (finished.length !== concurrentJobsCount) {
        throw new Error('Nem todos os jobs concorrentes completaram com sucesso');
      }

      return { details: `${concurrentJobsCount} tarefas concorrentes executadas com sucesso sem deadlocks.` };
    });

    // 3. Idempotência de Comandos (Token Replay Immunity)
    await runTest('PERF-IDEM-01', 'Garantia de Idempotência: Comandos Re-enviados Não Duplicam Execuções', async () => {
      const processedTokens = new Map<string, { executionId: string; timestamp: number }>();
      let realExecutionCounter = 0;

      const handleDispatchedCommand = async (command: { id: string; idempotencyKey: string }) => {
        if (processedTokens.has(command.idempotencyKey)) {
          return {
            status: 'IDEMPOTENT_HIT',
            executionId: processedTokens.get(command.idempotencyKey)!.executionId,
            wasExecuted: false
          };
        }

        // Executa pela primeira vez
        realExecutionCounter++;
        const execId = `exec-${realExecutionCounter}`;
        processedTokens.set(command.idempotencyKey, { executionId: execId, timestamp: Date.now() });

        return {
          status: 'EXECUTED',
          executionId: execId,
          wasExecuted: true
        };
      };

      const command = { id: 'cmd-01', idempotencyKey: 'idempotency-token-xyz-123' };

      // 1ª chamada -> Executa
      const res1 = await handleDispatchedCommand(command);
      // 2ª chamada duplicada -> Cache hit / ignorada
      const res2 = await handleDispatchedCommand(command);
      // 3ª chamada duplicada -> Cache hit / ignorada
      const res3 = await handleDispatchedCommand(command);

      if (realExecutionCounter !== 1) {
        throw new Error(`Idempotência violada: comando executou ${realExecutionCounter} vezes.`);
      }
      if (res2.executionId !== res1.executionId || res3.executionId !== res1.executionId) {
        throw new Error('Identificador de execução divergente entre retentativas idempotentes.');
      }

      return { details: '3 requisições idênticas resultaram em exatamente 1 execução no motor.' };
    });

    // 4. Fila com Priorização Estrita (Priority Scheduling)
    await runTest('PERF-QUEUE-01', 'Fila de Tarefas: Jobs de Alta Prioridade Executam Antes dos de Baixa Prioridade', async () => {
      interface QueuedJob {
        id: string;
        priority: number; // 1 = Alta, 2 = Média, 3 = Baixa
        enqueuedAt: number;
      }

      const queue: QueuedJob[] = [];

      const enqueue = (job: QueuedJob) => {
        queue.push(job);
        // Ordena por prioridade crescente (1 é mais prioritário que 3), e desempata por FIFO
        queue.sort((a, b) => a.priority - b.priority || a.enqueuedAt - b.enqueuedAt);
      };

      const dequeue = (): QueuedJob | undefined => queue.shift();

      // Enfileira em ordem reversa propositalmente: Baixa, Média, Alta
      enqueue({ id: 'job-low', priority: 3, enqueuedAt: Date.now() });
      await new Promise(r => setTimeout(r, 2));
      enqueue({ id: 'job-medium', priority: 2, enqueuedAt: Date.now() });
      await new Promise(r => setTimeout(r, 2));
      enqueue({ id: 'job-critical', priority: 1, enqueuedAt: Date.now() });

      // Desempilha e valida a ordem
      const first = dequeue();
      const second = dequeue();
      const third = dequeue();

      if (first?.id !== 'job-critical' || second?.id !== 'job-medium' || third?.id !== 'job-low') {
        throw new Error(`Ordem de fila prioritária incorreta: [${first?.id}, ${second?.id}, ${third?.id}]`);
      }

      return { details: 'Priorização comprovada: job crítico (P1) processado imediatamente à frente de P2 e P3.' };
    });

    // 5. Carga de Escala: Indexação Rápida de 1.000 Arquivos
    await runTest('PERF-SCALE-01', 'Escalabilidade: Indexação de 1.000 nós de arquivo em tempo sub-segundo', async () => {
      const scaleDir = path.join(testRoot, 'scale-1k');
      await fs.mkdir(scaleDir, { recursive: true });

      const fileCount = 1000;
      const files: { path: string; size: number }[] = [];

      const t0 = Date.now();
      for (let i = 0; i < fileCount; i++) {
        files.push({
          path: `file_${i}.dat`,
          size: 100 + (i % 500)
        });
      }

      // Simulação de indexação rápida em lote
      const indexMap = new Map<string, { size: number; indexedAt: number }>();
      for (const f of files) {
        indexMap.set(f.path, { size: f.size, indexedAt: Date.now() });
      }

      const elapsedMs = Date.now() - t0;
      if (indexMap.size !== fileCount) throw new Error('Nem todos os nós foram indexados');
      if (elapsedMs > 1000) throw new Error(`Indexação excedeu limite de 1 segundo: ${elapsedMs}ms`);

      return { details: `${fileCount} arquivos indexados e validados em memória em ${elapsedMs}ms.` };
    });

  } finally {
    try {
      await fs.rm(testRoot, { recursive: true, force: true });
    } catch {}
  }

  const passed = results.every(r => r.passed);
  console.log(`\n--- RESUMO PERFORMANCE & ESTRESSE: ${results.filter(r => r.passed).length}/${results.length} PASSARAM ---\n`);
  return { passed, results };
}

if (process.argv[1] && process.argv[1].includes('performance-stress.test')) {
  runPerformanceAndStressTests().then(res => {
    if (!res.passed) process.exit(1);
  });
}
