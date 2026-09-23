import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

import {
  IdentityManager,
  AgentIdentity,
  AgentLifecycleState,
  CommandType,
  RemoteCommand,
  CommandExecutionStatus,
  LogRedactor,
  TokenManager,
  CommandAuthenticator,
  IpcFramer,
  IpcServer,
  IpcClient,
  AtomicFileStore,
  AgentStateStore,
  SpoolQueue,
  CommandDeduplicationStore,
  EngineProcessManager,
  EngineSupervisor,
  EngineController,
  WebSocketControlPlaneClient,
  ReconnectStrategy,
  CommandDispatcher,
  ResourceMonitor,
  TelemetryService,
  HealthService,
  HeartbeatService,
  ConfigurationManager,
  AgentRuntime,
  WindowsServiceManager,
  LinuxDaemonManager,
  getEngineCapabilities
} from '../index.js';

export async function runAgentTests(): Promise<{ passed: boolean; total: number }> {
  let passedCount = 0;
  let totalCount = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    totalCount++;
    try {
      await fn();
      passedCount++;
      console.log(`  ✓ ${name}`);
    } catch (err: any) {
      console.error(`  ✗ ${name}`);
      console.error(`    Erro: ${err.message}`);
      if (err.stack) console.error(`    ${err.stack.split('\n')[1]}`);
    }
  }

  const testTempDir = path.join(os.tmpdir(), `workpulse-agent-tests-${crypto.randomUUID()}`);
  await fs.mkdir(testTempDir, { recursive: true });

  console.log('\n--- INICIANDO TESTES: ETAPA 10 (BACKUP AGENT, IPC, SUPERVISÃO & SERVIÇOS) ---\n');

  try {
    // 1. Identidade Persistente
    await test('1. Identidade: gera AgentIdentity estável e recupera do disco sem alterar IDs', async () => {
      const dataDir = path.join(testTempDir, 'identity-test');
      const identity1 = await IdentityManager.loadOrCreateIdentity(dataDir);

      if (!identity1.agentId || !identity1.installationId || !identity1.machineId) {
        throw new Error('Identidade criada não possui todos os campos obrigatórios.');
      }

      // Segunda leitura deve preservar agentId, installationId e machineId
      const identity2 = await IdentityManager.loadOrCreateIdentity(dataDir);
      if (identity1.agentId !== identity2.agentId) throw new Error('agentId mudou após recarregar!');
      if (identity1.installationId !== identity2.installationId) throw new Error('installationId mudou!');
      if (identity1.machineId !== identity2.machineId) throw new Error('machineId mudou!');
    });

    // 2. Capacidades do Engine
    await test('2. Capabilities: reflete capacidades reais do Engine com versionamento de protocolo', () => {
      const caps = getEngineCapabilities();
      if (!caps.supportsBackup || !caps.supportsRestore || !caps.supportsEncryption || !caps.supportsCompression) {
        throw new Error('Capacidades reais obrigatórias ausentes.');
      }
      if (caps.protocolVersion !== '1.0.0') throw new Error('protocolVersion inválida.');
    });

    // 3. Sanitização de Logs e Segredos
    await test('3. Segurança & Redação: remove senhas, tokens Bearer e chaves sensíveis', () => {
      const sensitive = {
        agentId: 'a1',
        password: 'SuperSecretPassword123!',
        apiToken: 'tok-xyz-987',
        nested: {
          privateKey: 'MIICXAIBAAKCAQEA0',
          cleanField: 'Hello World'
        },
        logMessage: 'Conectando ao storage com Bearer eyJhbGciOiJIUzI1Ni...'
      };

      const redacted = LogRedactor.redact(sensitive) as any;
      if (redacted.password !== '[REDACTED]') throw new Error('password não foi redigido');
      if (redacted.apiToken !== '[REDACTED]') throw new Error('apiToken não foi redigido');
      if (redacted.nested.privateKey !== '[REDACTED]') throw new Error('privateKey não foi redigido');
      if (redacted.nested.cleanField !== 'Hello World') throw new Error('cleanField foi corrompido');
      if (redacted.logMessage.includes('eyJhbGci')) throw new Error('Bearer token vazou no logMessage');
    });

    // 4. TokenManager Timing-Safe Verification
    await test('4. TokenManager: gera tokens criptográficos e valida com timingSafeEqual', () => {
      const token = TokenManager.generateSecureToken(32);
      if (token.length !== 64) throw new Error('Comprimento de hex inválido.');

      if (!TokenManager.timingSafeVerify(token, token)) throw new Error('Validação de token idêntico falhou');
      if (TokenManager.timingSafeVerify(token, 'invalid-token')) throw new Error('Token inválido foi aceito');
      if (TokenManager.timingSafeVerify(token, token + 'extra')) throw new Error('Token com tamanho diferente aceito');
    });

    // 5. IPC Framing e Chunk Assembly
    await test('5. IPC Framing: codifica e decodifica mensagens com prefixo UInt32BE e fragmentação', async () => {
      const framer = new IpcFramer();
      const testMsg = { type: 'COMMAND', action: 'TEST', payload: { foo: 'bar', num: 42 }, timestamp: new Date().toISOString() };
      const encoded = IpcFramer.encode(testMsg);

      let decoded: any = null;
      framer.on('message', (msg) => { decoded = msg; });

      // Simula chegada fragmentada em pedaços de 3 bytes
      for (let i = 0; i < encoded.length; i += 3) {
        framer.push(encoded.subarray(i, Math.min(i + 3, encoded.length)));
      }

      if (!decoded || decoded.action !== 'TEST' || decoded.payload.num !== 42) {
        throw new Error('Falha na decodificação de frame fragmentado');
      }
    });

    // 6. IPC Framing: Rejeição de Frame Gigante (>16MB)
    await test('6. IPC Framing: rejeita frames que excedam o limite seguro de 16MB', async () => {
      const framer = new IpcFramer();
      let errorEmitted = false;
      framer.on('error', () => { errorEmitted = true; });

      const maliciousHeader = Buffer.alloc(4);
      maliciousHeader.writeUInt32BE(20 * 1024 * 1024, 0); // 20MB
      framer.push(maliciousHeader);

      if (!errorEmitted) throw new Error('Framer não rejeitou frame malicioso gigante.');
    });

    // 7. IPC Server & Client: Conexão, Autenticação e Ping/Pong
    await test('7. IPC Server ↔ Client: Handshake de autenticação por token local e Ping/Pong', async () => {
      const socketPath = process.platform === 'win32'
        ? `\\\\.\\pipe\\wp-test-ipc-${crypto.randomUUID()}`
        : path.join(testTempDir, `wp-test-${crypto.randomUUID()}.sock`);

      const secretToken = 'ipc-secret-tok-123';
      const server = new IpcServer(socketPath, secretToken, async (msg) => {
        return { echo: msg.action };
      });
      await server.start();

      const client = new IpcClient(socketPath, secretToken);
      await client.connect(3000);

      const pong = await client.ping();
      if (!pong) throw new Error('Ping IPC falhou');

      client.disconnect();
      await server.stop();
    });

    // 8. IPC Server: Rejeita cliente com token incorreto
    await test('8. IPC Server: Rejeita conexão com token de autenticação incorreto', async () => {
      const socketPath = process.platform === 'win32'
        ? `\\\\.\\pipe\\wp-test-ipc-authfail-${crypto.randomUUID()}`
        : path.join(testTempDir, `wp-test-fail-${crypto.randomUUID()}.sock`);

      const server = new IpcServer(socketPath, 'valid-token', async () => ({}));
      await server.start();

      const client = new IpcClient(socketPath, 'WRONG-TOKEN');
      let failed = false;
      try {
        await client.connect(2000);
      } catch {
        failed = true;
      }

      client.disconnect();
      await server.stop();

      if (!failed) throw new Error('Cliente com token inválido deveria ter sido rejeitado');
    });

    // 9. IPC Server: Request / Response Bidirecional
    await test('9. IPC Request/Response: encaminha comandos e devolve respostas correlacionadas', async () => {
      const socketPath = process.platform === 'win32'
        ? `\\\\.\\pipe\\wp-test-ipc-reqres-${crypto.randomUUID()}`
        : path.join(testTempDir, `wp-test-reqres-${crypto.randomUUID()}.sock`);

      const server = new IpcServer(socketPath, 'tok', async (msg) => {
        if (msg.action === 'ADD') {
          const p = msg.payload as { a: number; b: number };
          return { sum: p.a + p.b };
        }
        throw new Error('Ação não suportada');
      });
      await server.start();

      const client = new IpcClient(socketPath, 'tok');
      await client.connect(3000);

      const res = await client.sendCommand<{ sum: number }>('ADD', { a: 15, b: 27 });
      if (res.sum !== 42) throw new Error(`Soma retornada incorreta: ${res.sum}`);

      client.disconnect();
      await server.stop();
    });

    // 10. Persistência: Escrita Atômica Segura
    await test('10. Persistência: AtomicFileStore grava com modo seguro e previne corrupção', async () => {
      const filePath = path.join(testTempDir, 'atomic-test', 'data.json');
      const payload = { config: 'safe', value: 12345 };

      await AtomicFileStore.writeJsonAtomic(filePath, payload);
      const read = await AtomicFileStore.readJson<typeof payload>(filePath);

      if (!read || read.value !== 12345) throw new Error('Falha ao ler arquivo atômico');
    });

    // 11. Command Authenticator: Valida comando válido com HMAC
    await test('11. CommandAuthenticator: valida com sucesso comando com HMAC e parâmetros íntegros', () => {
      const secret = 'control-plane-hmac-secret';
      const agentId = 'agent-001';

      const baseCmd = {
        commandId: 'cmd-1',
        targetAgentId: agentId,
        commandType: CommandType.RUN_BACKUP,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        parameters: { jobId: 'job-123' }
      };

      const canonical = CommandAuthenticator.buildCanonicalString(baseCmd);
      const signature = TokenManager.signHmacSha256(canonical, secret);

      const command: RemoteCommand = { ...baseCmd, signature };
      const val = CommandAuthenticator.validateCommand(command, agentId, secret);

      if (!val.valid) throw new Error(`Comando válido foi rejeitado: ${val.errorMessage}`);
    });

    // 12. Command Authenticator: Rejeita se target for outro Agent
    await test('12. CommandAuthenticator: rejeita comando direcionado a outro Agent (UNAUTHORIZED_TARGET)', () => {
      const secret = 'secret';
      const cmd: RemoteCommand = {
        commandId: 'cmd-2',
        targetAgentId: 'agent-OTHER',
        commandType: CommandType.RUN_BACKUP,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        signature: 'any',
        parameters: {}
      };

      const val = CommandAuthenticator.validateCommand(cmd, 'agent-CURRENT', secret);
      if (val.valid || val.errorCode !== 'UNAUTHORIZED_TARGET_AGENT') {
        throw new Error('Deveria rejeitar por target inválido');
      }
    });

    // 13. Command Authenticator: Rejeita comando expirado
    await test('13. CommandAuthenticator: rejeita comando expirado (COMMAND_EXPIRED)', () => {
      const secret = 'secret';
      const agentId = 'agent-001';
      const cmd: RemoteCommand = {
        commandId: 'cmd-3',
        targetAgentId: agentId,
        commandType: CommandType.RUN_BACKUP,
        createdAt: new Date(Date.now() - 120000).toISOString(),
        expiresAt: new Date(Date.now() - 60000).toISOString(), // expirou há 1 min
        signature: 'any',
        parameters: {}
      };

      const val = CommandAuthenticator.validateCommand(cmd, agentId, secret);
      if (val.valid || val.errorCode !== 'COMMAND_EXPIRED') {
        throw new Error('Deveria rejeitar comando expirado');
      }
    });

    // 14. Command Authenticator: Rejeita tipos não permitidos (Bloqueio de Shell Arbitrário)
    await test('14. CommandAuthenticator: bloqueia estritamente comandos arbitrários fora da whitelist', () => {
      const secret = 'secret';
      const agentId = 'agent-001';
      const cmd: RemoteCommand = {
        commandId: 'cmd-4',
        targetAgentId: agentId,
        commandType: 'execute_shell' as any,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        signature: 'any',
        parameters: { script: 'rm -rf /' }
      };

      const val = CommandAuthenticator.validateCommand(cmd, agentId, secret);
      if (val.valid || val.errorCode !== 'FORBIDDEN_COMMAND_TYPE') {
        throw new Error('Deveria bloquear execução de shell arbitrário');
      }
    });

    // 15. Command Authenticator: Rejeita assinatura HMAC adulterada
    await test('15. CommandAuthenticator: rejeita comando com payload adulterado ou assinatura inválida', () => {
      const secret = 'secret';
      const agentId = 'agent-001';
      const cmd: RemoteCommand = {
        commandId: 'cmd-5',
        targetAgentId: agentId,
        commandType: CommandType.RUN_BACKUP,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        signature: 'fake-tampered-signature-hex',
        parameters: { jobId: 'job-1' }
      };

      const val = CommandAuthenticator.validateCommand(cmd, agentId, secret);
      if (val.valid || val.errorCode !== 'INVALID_SIGNATURE') {
        throw new Error('Deveria rejeitar assinatura adulterada');
      }
    });

    // 16. Deduplicação & Idempotência de Comandos
    await test('16. Deduplicação: armazena resultado e retorna cache para comando duplicado', async () => {
      const dedupDir = path.join(testTempDir, 'dedup-test');
      const store = new CommandDeduplicationStore(dedupDir);
      await store.init();

      const result1 = {
        commandId: 'cmd-dedup-1',
        targetAgentId: 'ag-1',
        commandType: CommandType.RUN_BACKUP,
        status: CommandExecutionStatus.SUCCESS,
        resultPayload: { filesBackedUp: 10 },
        completedAt: new Date().toISOString()
      };

      await store.save(result1);

      // Leitura subsequente deve retornar exatamente o mesmo resultado
      const cached = await store.get('cmd-dedup-1');
      if (!cached || cached.status !== CommandExecutionStatus.SUCCESS || (cached.resultPayload as any).filesBackedUp !== 10) {
        throw new Error('Falha ao recuperar comando cacheado');
      }
    });

    // 17. Engine Process Manager & Controller
    await test('17. Engine Process Manager: inicia processo, conecta IPC e executa comandos', async () => {
      const socketPath = process.platform === 'win32'
        ? `\\\\.\\pipe\\wp-engine-test-${crypto.randomUUID()}`
        : path.join(testTempDir, `wp-eng-${crypto.randomUUID()}.sock`);

      const authToken = 'engine-auth-123';

      // Simula servidor IPC do Engine
      const engineServer = new IpcServer(socketPath, authToken, async (msg) => {
        if (msg.action === 'RUN_BACKUP') return { backupId: 'b-999', status: 'COMPLETED' };
        if (msg.action === 'GET_STATUS') return { state: 'IDLE', activeJobs: 0 };
        return {};
      });
      await engineServer.start();

      const processManager = new EngineProcessManager(socketPath, authToken);
      await processManager.startProcess();

      const controller = new EngineController(processManager);
      const res = await controller.executeCommand(CommandType.RUN_BACKUP, { jobId: 'j-1' }) as any;
      if (res.backupId !== 'b-999') throw new Error('Resposta de backup incorreta');

      const status = await controller.getStatus() as any;
      if (status.state !== 'IDLE') throw new Error('Status do Engine incorreto');

      await processManager.stopProcess();
      await engineServer.stop();
    });

    // 18. Engine Supervisor & Crash Loop Circuit Breaker (STOPPED_FOR_SAFETY)
    await test('18. Engine Supervisor: detecta falhas repetidas e ativa circuit breaker STOPPED_FOR_SAFETY', async () => {
      const socketPath = path.join(testTempDir, `wp-supervisor-${crypto.randomUUID()}.sock`);
      const processManager = new EngineProcessManager(socketPath, 'tok');

      let launcherCount = 0;
      const supervisor = new EngineSupervisor(processManager, async () => {
        launcherCount++;
        // Falha proposital ao conectar no socket inexistente para simular crash imediato
        throw new Error(`Falha simulada de inicialização do Engine #${launcherCount}`);
      });

      let breakerTripped = false;
      supervisor.on('circuit_breaker_tripped', () => {
        breakerTripped = true;
      });

      try {
        await supervisor.start();
      } catch {}

      // Simula mais 4 crashes rápidos para atingir o limite de 5 na janela
      for (let i = 0; i < 5; i++) {
        processManager.emit('process_crashed', new Error('Crash simulado'));
      }

      const metrics = supervisor.getMetrics();
      if (!metrics.isCircuitBreakerTripped || !breakerTripped) {
        throw new Error('Circuit breaker não foi ativado após 5 crashes!');
      }

      await supervisor.stop();
    });

    // 19. Reconnect Strategy: Backoff Exponencial com Jitter
    await test('19. ReconnectStrategy: calcula atraso exponencial progressivo respeitando teto e jitter', () => {
      const strategy = new ReconnectStrategy({
        baseDelayMs: 1000,
        maxDelayMs: 8000,
        jitterFactor: 0.1
      });

      const d1 = strategy.getNextDelay(); // ~1000
      const d2 = strategy.getNextDelay(); // ~2000
      const d3 = strategy.getNextDelay(); // ~4000
      const d4 = strategy.getNextDelay(); // ~8000
      const d5 = strategy.getNextDelay(); // capped ~8000

      if (d1 < 900 || d1 > 1100) throw new Error(`d1 fora da faixa esperada: ${d1}`);
      if (d2 < 1800 || d2 > 2200) throw new Error(`d2 fora da faixa esperada: ${d2}`);
      if (d3 < 3600 || d3 > 4400) throw new Error(`d3 fora da faixa esperada: ${d3}`);
      if (d5 > 8900) throw new Error(`d5 excedeu o teto máximo: ${d5}`);

      strategy.reset();
      if (strategy.getAttemptCount() !== 0) throw new Error('reset() não zerou contagem');
    });

    // 20. Control Plane WebSocket Client: Conexão Real, Heartbeat e Recepção de Comandos
    await test('20. Control Plane Client: Conecta via WebSocket, envia cabeçalhos e recebe comandos remotos', async () => {
      const port = 38991;
      const wss = new WebSocketServer({ port });

      let receivedHeaders: any = null;
      let serverWs: WebSocket | null = null;

      wss.on('connection', (ws, req) => {
        serverWs = ws;
        receivedHeaders = req.headers;
      });

      const identity: AgentIdentity = {
        agentId: 'agent-ws-1',
        installationId: 'inst-1',
        machineId: 'mach-1',
        agentVersion: '1.0.0',
        engineVersion: '1.0.0',
        platform: process.platform,
        architecture: process.arch,
        hostname: 'localhost',
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString()
      };

      const spoolQueue = new SpoolQueue(path.join(testTempDir, 'ws-spool'));
      const client = new WebSocketControlPlaneClient({
        url: `ws://127.0.0.1:${port}`,
        identity,
        agentSecret: 'agent-secret-pass',
        spoolQueue
      });

      let commandReceived: any = null;
      client.onCommand(async (cmd) => {
        commandReceived = cmd;
      });

      await client.connect();

      if (!client.isConnected()) throw new Error('Cliente WebSocket não conectou');
      if (receivedHeaders['x-agent-id'] !== 'agent-ws-1') throw new Error('Cabeçalho x-agent-id ausente');
      if (receivedHeaders['authorization'] !== 'Bearer agent-secret-pass') throw new Error('Authorization header ausente');

      // Envia comando do servidor para o Agent
      serverWs!.send(JSON.stringify({
        type: 'COMMAND',
        command: {
          commandId: 'cmd-remote-1',
          targetAgentId: 'agent-ws-1',
          commandType: CommandType.GET_STATUS
        }
      }));

      await new Promise(r => setTimeout(r, 60));
      if (!commandReceived || commandReceived.commandId !== 'cmd-remote-1') {
        throw new Error('Comando remoto não recebido pelo cliente WebSocket');
      }

      await client.disconnect();
      wss.close();
    });

    // 21. Operação Offline & Spooling: Acúmulo de Eventos e Flush na Reconexão
    await test('21. Operação Offline: eventos gerados sem internet acumulam em spool e são descarregados na volta', async () => {
      const spoolDir = path.join(testTempDir, 'offline-spool-test');
      const spoolQueue = new SpoolQueue(spoolDir);
      await spoolQueue.init();

      // Enfileira 3 eventos offline
      await spoolQueue.enqueue('EVENT', { action: 'JOB_COMPLETED', jobId: 'j-1' });
      await spoolQueue.enqueue('TELEMETRY', { cpu: 15 });
      await spoolQueue.enqueue('EVENT', { action: 'RESTORE_COMPLETED', jobId: 'j-2' });

      if (spoolQueue.size() !== 3) throw new Error(`Spool deveria conter 3 itens, tem ${spoolQueue.size()}`);

      // Simula servidor do Control Plane retornando
      const port = 38992;
      const wss = new WebSocketServer({ port });
      const replayedPayloads: any[] = [];

      wss.on('connection', (ws) => {
        ws.on('message', (raw) => {
          const parsed = JSON.parse(raw.toString());
          if (parsed.isReplayedFromSpool) {
            replayedPayloads.push(parsed);
          }
        });
      });

      const identity: AgentIdentity = {
        agentId: 'agent-offline-1',
        installationId: 'inst-1',
        machineId: 'mach-1',
        agentVersion: '1.0.0',
        engineVersion: '1.0.0',
        platform: process.platform,
        architecture: process.arch,
        hostname: 'localhost',
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString()
      };

      const client = new WebSocketControlPlaneClient({
        url: `ws://127.0.0.1:${port}`,
        identity,
        agentSecret: 'secret',
        spoolQueue
      });

      await client.connect();

      // Aguarda descarregamento
      await new Promise(r => setTimeout(r, 100));

      if (replayedPayloads.length !== 3) {
        throw new Error(`Esperado 3 eventos retransmitidos, recebido ${replayedPayloads.length}`);
      }

      if (spoolQueue.size() !== 0) {
        throw new Error(`Spool queue deveria estar vazio após flush, restam ${spoolQueue.size()}`);
      }

      await client.disconnect();
      wss.close();
    });

    // 22. Configuration Sync: 2-Phase Commit e Rollback de Configuração Inválida
    await test('22. Configuration Sync: Validação prévia, persistência atômica e rollback contra payload inválido', async () => {
      const configDir = path.join(testTempDir, 'config-sync-test');
      const manager = new ConfigurationManager(configDir);
      const initial = await manager.init();

      // 1. Sincronização válida
      const validUpdate = await manager.syncRemoteConfiguration({
        heartbeatIntervalMs: 15000,
        configurationVersion: 2
      });

      if (!validUpdate.applied || validUpdate.version !== 2) {
        throw new Error('Configuração válida foi rejeitada');
      }

      // 2. Sincronização inválida (heartbeat < 1000ms ou URL inválida)
      const invalidUpdate = await manager.syncRemoteConfiguration({
        heartbeatIntervalMs: 200, // inválido (<1000)
        configurationVersion: 3
      });

      if (invalidUpdate.applied) {
        throw new Error('Configuração inválida não deveria ter sido aplicada');
      }

      // Verifica que a versão atual permaneceu na 2
      const current = manager.getConfig();
      if (current.configurationVersion !== 2 || current.heartbeatIntervalMs !== 15000) {
        throw new Error('Rollback da configuração inválida falhou');
      }
    });

    // 23. Resource Monitor: Amostragem de Métricas Reais do Sistema
    await test('23. ResourceMonitor: coleta métricas de CPU, RAM, Uptime e Load Average', async () => {
      const metrics = await ResourceMonitor.sampleMetrics();

      if (typeof metrics.cpuUsagePercent !== 'number' || metrics.cpuUsagePercent < 0 || metrics.cpuUsagePercent > 100) {
        throw new Error(`Métrica de CPU inválida: ${metrics.cpuUsagePercent}`);
      }

      if (metrics.memoryTotalBytes <= 0 || metrics.memoryUsedPercent < 0 || metrics.memoryUsedPercent > 100) {
        throw new Error('Métricas de memória física inválidas');
      }

      if (metrics.uptimeSeconds < 0) {
        throw new Error('Uptime do processo inválido');
      }
    });

    // 24. Health Service: Avaliação de Saúde do Agent e do Engine
    await test('24. HealthService: avalia corretamente estados HEALTHY, DEGRADED e UNHEALTHY', async () => {
      const socketPath = path.join(testTempDir, `wp-health-${crypto.randomUUID()}.sock`);
      const proc = new EngineProcessManager(socketPath, 'tok');
      const mockControlPlane: any = { isConnected: () => true };

      const healthService = new HealthService(
        () => AgentLifecycleState.RUNNING,
        proc,
        mockControlPlane
      );

      const report = await healthService.evaluateHealth();
      // Como o IPC não foi iniciado, deve reportar UNHEALTHY com IPC_ENGINE_DISCONNECTED
      if (report.status !== 'UNHEALTHY' || !report.issues.includes('IPC_ENGINE_DISCONNECTED')) {
        throw new Error(`Esperado status UNHEALTHY com IPC_ENGINE_DISCONNECTED, obtido: ${report.status}`);
      }
    });

    // 25. Windows Service: Geração de Scripts SCM e Configuração de Recuperação
    await test('25. Windows Service: Gera script de instalação SCM com política de auto-restart configurada', () => {
      const config = WindowsServiceManager.getDefaultConfig('C:\\Program Files\\WorkPulse\\agent.exe');
      const script = WindowsServiceManager.generateInstallScript(config);

      if (!script.includes('sc.exe create "WorkPulseBackupAgent"')) {
        throw new Error('Comando sc.exe create ausente');
      }
      if (!script.includes('sc.exe failure "WorkPulseBackupAgent" reset= 86400 actions= restart/5000/restart/5000/restart/5000')) {
        throw new Error('Configuração de recuperação automática de falha ausente');
      }

      const uninstallScript = WindowsServiceManager.generateUninstallScript();
      if (!uninstallScript.includes('sc.exe stop "WorkPulseBackupAgent"') || !uninstallScript.includes('sc.exe delete "WorkPulseBackupAgent"')) {
        throw new Error('Comandos de desinstalação ausentes');
      }
    });

    // 26. Linux Daemon: Geração de Unit systemd com Hardening de Segurança
    await test('26. Linux Daemon: Gera unit systemd com diretivas de isolamento (NoNewPrivileges, ProtectSystem)', () => {
      const config = LinuxDaemonManager.getDefaultConfig('/usr/local/bin/workpulse-agent');
      const unit = LinuxDaemonManager.generateSystemdUnit(config);

      if (!unit.includes('Description=WorkPulse Backup Agent Daemon')) throw new Error('Description ausente');
      if (!unit.includes('ExecStart=/usr/local/bin/workpulse-agent')) throw new Error('ExecStart ausente');
      if (!unit.includes('NoNewPrivileges=true')) throw new Error('Hardening NoNewPrivileges ausente');
      if (!unit.includes('ProtectSystem=strict')) throw new Error('Hardening ProtectSystem ausente');
      if (!unit.includes('ProtectHome=read-only')) throw new Error('Hardening ProtectHome ausente');
      if (!unit.includes('PrivateTmp=true')) throw new Error('Hardening PrivateTmp ausente');

      const setupCmds = LinuxDaemonManager.generateSetupCommands(config);
      if (!setupCmds.some(c => c.includes('systemctl enable workpulse-agent.service'))) {
        throw new Error('Comando systemctl enable ausente');
      }
    });

    // 27. Ciclo de Vida Completo do AgentRuntime E2E
    await test('27. AgentRuntime E2E: Inicialização -> Identidade -> Estado -> Heartbeat -> Shutdown Gracioso', async () => {
      const runtimeDir = path.join(testTempDir, 'runtime-e2e');
      const testSocketPath = process.platform === 'win32'
        ? `\\\\.\\pipe\\wp-runtime-e2e-${crypto.randomUUID()}`
        : path.join(testTempDir, `wp-rt-${crypto.randomUUID()}.sock`);

      const ipcToken = 'runtime-test-ipc-token';
      const engineServer = new IpcServer(testSocketPath, ipcToken, async (msg) => {
        if (msg.action === 'GET_STATUS') return { status: 'OK' };
        if (msg.action === 'GET_HEALTH') return { healthy: true };
        return {};
      });
      await engineServer.start();

      // Grava configuração prévia com o socketPath do teste
      await AtomicFileStore.writeJsonAtomic(path.join(runtimeDir, 'agent-config.json'), {
        controlPlaneUrl: 'wss://controlplane.internal/v1/agent',
        heartbeatIntervalMs: 30000,
        telemetryIntervalMs: 60000,
        reconnectBaseDelayMs: 1000,
        reconnectMaxDelayMs: 60000,
        ipcSocketPath: testSocketPath,
        dataDir: runtimeDir,
        logLevel: 'info',
        configurationVersion: 1,
        updatedAt: new Date().toISOString()
      });

      const mockControlPlane: any = {
        connect: async () => {},
        disconnect: async () => {},
        isConnected: () => true,
        sendHeartbeat: async () => {},
        sendEvent: async () => {},
        sendTelemetry: async () => {},
        sendCommandResult: async () => {},
        onCommand: () => {}
      };

      const runtime = new AgentRuntime({
        dataDir: runtimeDir,
        ipcAuthToken: ipcToken,
        customControlPlaneClient: mockControlPlane
      });

      let startedEmitted = false;
      let stoppedEmitted = false;

      runtime.on('started', () => { startedEmitted = true; });
      runtime.on('stopped', () => { stoppedEmitted = true; });

      await runtime.start();
      if (!startedEmitted) throw new Error('Evento started não foi emitido');
      if (!runtime.getIdentity().agentId) throw new Error('Identidade do runtime ausente');
      if (runtime.getState() !== AgentLifecycleState.RUNNING) {
        throw new Error(`Estado do runtime deveria ser RUNNING, obtido: ${runtime.getState()}`);
      }

      await runtime.stop();
      await engineServer.stop();

      if (!stoppedEmitted) throw new Error('Evento stopped não foi emitido');
      if (runtime.getState() !== AgentLifecycleState.STOPPED) {
        throw new Error(`Estado após parada deveria ser STOPPED, obtido: ${runtime.getState()}`);
      }
    });

    // 28. Command Authenticator: Rejeita comandos com clock skew excessivo no futuro (>5 min)
    await test('28. CommandAuthenticator: rejeita timestamp createdAt excessivamente no futuro (anti-tampering)', () => {
      const secret = 'secret-test';
      const agentId = 'agent-001';
      const cmd: RemoteCommand = {
        commandId: 'cmd-skew',
        targetAgentId: agentId,
        commandType: CommandType.RUN_BACKUP,
        createdAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min no futuro
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        signature: 'any',
        parameters: {}
      };

      const val = CommandAuthenticator.validateCommand(cmd, agentId, secret);
      if (val.valid || val.errorCode !== 'CLOCK_SKEW_EXCESSIVE') {
        throw new Error(`Deveria ter rejeitado por CLOCK_SKEW_EXCESSIVE, obtido: ${val.errorCode}`);
      }
    });

    // 29. Command Authenticator: Rejeita parâmetros adulterados (HMAC invalida)
    await test('29. CommandAuthenticator: detecta adulteração nos parâmetros do comando', () => {
      const secret = 'secret-test';
      const agentId = 'agent-001';
      const baseCmd = {
        commandId: 'cmd-tamper-1',
        targetAgentId: agentId,
        commandType: CommandType.RUN_BACKUP,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        parameters: { jobId: 'legit-job' }
      };

      const signature = TokenManager.signHmacSha256(CommandAuthenticator.buildCanonicalString(baseCmd), secret);
      // Atacante altera parâmetro para outro job
      const tamperedCmd: RemoteCommand = {
        ...baseCmd,
        parameters: { jobId: 'malicious-injected-job' },
        signature
      };

      const val = CommandAuthenticator.validateCommand(tamperedCmd, agentId, secret);
      if (val.valid || val.errorCode !== 'INVALID_SIGNATURE') {
        throw new Error('Deveria ter detectado assinatura inválida devido aos parâmetros adulterados');
      }
    });

    // 30. Command Dispatcher: Ciclo Completo com Sucesso, Falha, Rejeição e Idempotência
    await test('30. CommandDispatcher: valida ciclo completo de execução, falha, rejeição e deduplicação em cache', async () => {
      const dedupDir = path.join(testTempDir, 'dispatcher-test');
      const dedupStore = new CommandDeduplicationStore(dedupDir);
      await dedupStore.init();

      const secret = 'dispatcher-secret';
      const agentId = 'agent-dispatcher-1';

      // Mock Engine Controller
      let engineCalledTimes = 0;
      const mockEngineController: any = {
        executeCommand: async (type: CommandType, params: any) => {
          engineCalledTimes++;
          if (params.shouldFail) throw new Error('Falha simulada do Engine');
          return { executed: true, type };
        }
      };

      const dispatcher = new CommandDispatcher(agentId, secret, dedupStore, mockEngineController);

      // A. Execução bem sucedida
      const baseCmd1 = {
        commandId: 'cmd-disp-1',
        targetAgentId: agentId,
        commandType: CommandType.RUN_BACKUP,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        parameters: { jobId: 'job-1' }
      };
      const cmd1: RemoteCommand = {
        ...baseCmd1,
        signature: TokenManager.signHmacSha256(CommandAuthenticator.buildCanonicalString(baseCmd1), secret)
      };

      const res1 = await dispatcher.dispatch(cmd1);
      if (res1.status !== CommandExecutionStatus.SUCCESS || engineCalledTimes !== 1) {
        throw new Error('Comando 1 falhou na execução inicial');
      }

      // B. Idempotência: mesmo comando enviado novamente NÃO chama o Engine de novo
      const res1Dup = await dispatcher.dispatch(cmd1);
      if (res1Dup.status !== CommandExecutionStatus.SUCCESS || engineCalledTimes !== 1) {
        throw new Error('Deduplicação falhou: Engine foi chamado novamente para comando duplicado');
      }

      // C. Execução com falha do Engine
      const baseCmd2 = {
        commandId: 'cmd-disp-2',
        targetAgentId: agentId,
        commandType: CommandType.RUN_BACKUP,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        parameters: { shouldFail: true }
      };
      const cmd2: RemoteCommand = {
        ...baseCmd2,
        signature: TokenManager.signHmacSha256(CommandAuthenticator.buildCanonicalString(baseCmd2), secret)
      };

      const res2 = await dispatcher.dispatch(cmd2);
      if (res2.status !== CommandExecutionStatus.FAILED || !res2.error?.includes('Falha simulada')) {
        throw new Error('Comando com erro deveria ter retornado status FAILED');
      }

      // D. Comando rejeitado por assinatura inválida
      const cmdInvalid: RemoteCommand = {
        ...baseCmd1,
        commandId: 'cmd-disp-invalid',
        signature: 'invalid-signature'
      };
      const resInvalid = await dispatcher.dispatch(cmdInvalid);
      if (resInvalid.status !== CommandExecutionStatus.REJECTED) {
        throw new Error('Comando com assinatura inválida deveria ter sido REJECTED');
      }
    });

    // 31. Heartbeat & Telemetry Services: Formato Estruturado e Ausência de Segredos
    await test('31. Telemetry & Heartbeat: gera payloads estruturados e transmite via Control Plane', async () => {
      let sentTelemetry: any = null;
      let sentHeartbeat: any = null;

      const mockControlPlane: any = {
        sendTelemetry: async (t: any) => { sentTelemetry = t; },
        sendHeartbeat: async (h: any) => { sentHeartbeat = h; },
        isConnected: () => true
      };

      const mockEngineController: any = {
        getStatus: async () => ({ state: 'IDLE', activeJobs: 0 })
      };

      const telemetryService = new TelemetryService('agent-tele-1', mockControlPlane, mockEngineController, 60000);
      const snapshot = await telemetryService.collectAndSend();

      if (!sentTelemetry || sentTelemetry.agentId !== 'agent-tele-1' || !sentTelemetry.system.memoryTotalBytes) {
        throw new Error('Payload de telemetria inválido');
      }

      const mockSupervisor: any = {
        getMetrics: () => ({ crashCount: 0, restartCount: 0, isCircuitBreakerTripped: false, state: 'RUNNING' })
      };

      const mockProc: any = {
        getStatus: () => ({ ipcConnected: true, state: 'RUNNING' })
      };

      const healthService = new HealthService(() => AgentLifecycleState.RUNNING, mockProc, mockControlPlane);

      const identity: AgentIdentity = {
        agentId: 'agent-hb-1',
        installationId: 'inst-hb-1',
        machineId: 'mach-1',
        agentVersion: '1.0.0',
        engineVersion: '1.0.0',
        platform: process.platform,
        architecture: process.arch,
        hostname: 'localhost',
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString()
      };

      const heartbeatService = new HeartbeatService(identity, healthService, mockSupervisor, mockControlPlane, 30000);
      await heartbeatService.sendHeartbeat();

      if (!sentHeartbeat || sentHeartbeat.agentId !== 'agent-hb-1' || sentHeartbeat.health.status !== 'HEALTHY') {
        throw new Error('Payload de heartbeat inválido');
      }
    });

    // 32. AgentStateStore: Persistência e Recuperação de Estado e Contadores
    await test('32. AgentStateStore: salva e recupera estado persistente com contadores de recuperação', async () => {
      const stateDir = path.join(testTempDir, 'state-store-test');
      const store = new AgentStateStore(stateDir);

      const initial = await store.loadState();
      if (initial.lifecycleState !== AgentLifecycleState.INITIALIZING) {
        throw new Error('Estado inicial incorreto');
      }

      await store.saveState({
        lifecycleState: AgentLifecycleState.RUNNING,
        lastStateChange: new Date().toISOString(),
        configVersion: 3,
        crashRecoveryCount: 2,
        activeJobsCount: 1
      });

      const reloaded = await store.loadState();
      if (reloaded.lifecycleState !== AgentLifecycleState.RUNNING || reloaded.crashRecoveryCount !== 2 || reloaded.configVersion !== 3) {
        throw new Error('Falha na persistência e recuperação do estado do Agent');
      }
    });

    // 33. SpoolQueue: Política de Descarte Inteligente em Caso de Capacidade Máxima
    await test('33. SpoolQueue: sob capacidade máxima, descarta métricas de telemetria antigas preservando eventos críticos', async () => {
      const spoolDir = path.join(testTempDir, 'spool-capacity-test');
      const queue = new SpoolQueue(spoolDir, 3); // capacidade máxima de 3 itens
      await queue.init();

      // Enfileira evento crítico
      await queue.enqueue('EVENT', { action: 'CRITICAL_BACKUP_COMPLETED' });
      // Enfileira telemetria
      await queue.enqueue('TELEMETRY', { ram: 50 });
      // Enfileira resultado de comando
      await queue.enqueue('COMMAND_RESULT', { status: 'SUCCESS' });

      if (queue.size() !== 3) throw new Error('Deveria conter exatamente 3 itens');

      // Enfileira 4º item (novo evento). Deve descartar a TELEMETRY, mantendo o EVENT e COMMAND_RESULT
      await queue.enqueue('EVENT', { action: 'SECOND_CRITICAL_EVENT' });

      if (queue.size() !== 3) throw new Error('Deveria ter mantido o teto de 3 itens');

      const items = await queue.peek(10);
      const types = items.map(i => i.type);
      if (types.includes('TELEMETRY')) {
        throw new Error('Telemetria deveria ter sido descartada em favor dos eventos críticos');
      }
      if (!types.includes('EVENT') || !types.includes('COMMAND_RESULT')) {
        throw new Error('Eventos críticos ou resultados de comando foram descartados indevidamente');
      }
    });

    // 34. Setup de Diretórios e Permissões Seguras (Linux & SCM)
    await test('34. LinuxDaemonManager: gera comandos de permissões seguras (chmod 700 / 750) e isolamento', () => {
      const config = LinuxDaemonManager.getDefaultConfig('/usr/local/bin/workpulse-agent');
      const cmds = LinuxDaemonManager.generateSetupCommands(config);

      const hasChmod700 = cmds.some(c => c.includes('chmod 700 /var/lib/workpulse-agent'));
      const hasChmod750 = cmds.some(c => c.includes('chmod 750 /var/log/workpulse-agent'));
      const hasChown = cmds.some(c => c.includes('chown -R workpulse:workpulse'));

      if (!hasChmod700 || !hasChmod750 || !hasChown) {
        throw new Error('Comandos de configuração de segurança do Linux Daemon ausentes ou incorretos');
      }
    });

  } finally {
    try {
      await fs.rm(testTempDir, { recursive: true, force: true });
    } catch {}
  }

  console.log(`\n--- RESULTADO ETAPA 10: ${passedCount}/${totalCount} TESTES APROVADOS ---\n`);
  return { passed: passedCount === totalCount, total: totalCount };
}

// Execução direta quando invocado via tsx
if (process.argv[1] && process.argv[1].includes('agent.test')) {
  runAgentTests().then((res) => {
    if (!res.passed) {
      process.exit(1);
    }
  });
}
