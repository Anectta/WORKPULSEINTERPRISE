/**
 * Suíte de integridade da plataforma (auditoria 2026-11-20).
 * Cobre as correções de autenticação, persistência, contratos de API e mapeamentos
 * que não tinham nenhum teste antes.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readJsonFile, writeJsonFileAtomic } from '../../server/persistence/jsonFileStore';
import { apiAuthentication } from '../../server/authMiddleware';
import { ComplianceEngine } from '../../server/security/complianceEngine';
import { SecurityOrchestrator } from '../../server/security/securityOrchestrator';
import { revokeCompromisedEnrollmentTokens, sha256 } from '../../server/cmdbRouter';
import { assetToRow, rowToAsset } from '../../src/services/supabase/assets.service';
import { computeCollectionDelta } from '../../src/hooks/useSupabaseCollectionSync';
import { stripPasswords } from '../../src/utils/userSanitizer';
import { dataFile } from '../../server/persistence/dataDir';

export interface IntegrityCheckResult {
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Executa o middleware de autenticação com req/res simulados. */
async function runAuth(method: string, routePath: string, headers: Record<string, string> = {}) {
  let nextCalled = false;
  let statusCode = 200;
  const req: any = { method, path: routePath, headers };
  const res: any = {
    status(code: number) { statusCode = code; return this; },
    json() { return this; }
  };
  await apiAuthentication(req, res, () => { nextCalled = true; });
  return { nextCalled, statusCode, req };
}

export async function runPlatformIntegrityTests(): Promise<{ passed: boolean; results: IntegrityCheckResult[] }> {
  const results: IntegrityCheckResult[] = [];

  const runTest = async (id: string, name: string, fn: () => Promise<void> | void) => {
    const start = Date.now();
    try {
      await fn();
      results.push({ id, name, passed: true, durationMs: Date.now() - start });
      console.log(`  ✓ [${id}] ${name}`);
    } catch (err: any) {
      results.push({ id, name, passed: false, durationMs: Date.now() - start, error: err.message });
      console.error(`  ✗ [${id}] ${name} FALHOU: ${err.message}`);
    }
  };

  // ---------------------------------------------------------------- persistência
  await runTest('PI-01', 'Gravação atômica preserva a versão anterior em .bak e não deixa .tmp', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-pi-'));
    const file = path.join(dir, 'store.json');
    writeJsonFileAtomic(file, { v: 1 });
    writeJsonFileAtomic(file, { v: 2 });
    const r = readJsonFile<{ v: number }>(file);
    assert(r.status === 'ok' && r.data.v === 2, 'deveria ler a versão 2');
    assert(JSON.parse(fs.readFileSync(`${file}.bak`, 'utf-8')).v === 1, '.bak deveria conter a versão 1');
    assert(!fs.readdirSync(dir).some(f => f.endsWith('.tmp')), 'não deveria sobrar .tmp');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  await runTest('PI-02', 'JSON truncado é recuperado do .bak; corrompido sem .bak vai para quarentena', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-pi-'));
    const file = path.join(dir, 'store.json');
    writeJsonFileAtomic(file, { v: 1 });
    writeJsonFileAtomic(file, { v: 2 });
    fs.writeFileSync(file, '{"v": 3, "trunc');
    const recovered = readJsonFile<{ v: number }>(file);
    assert(recovered.status === 'ok' && recovered.source === 'backup' && recovered.data.v === 1, 'deveria recuperar do .bak');
    fs.writeFileSync(`${file}.bak`, 'lixo');
    const corrupt = readJsonFile(file);
    assert(corrupt.status === 'corrupt', 'deveria reportar corrupção');
    assert(fs.readdirSync(dir).some(f => f.includes('.corrupt-')), 'arquivo corrompido deveria ir para quarentena');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  await runTest('PI-03', 'Testes usam diretório de dados isolado (nunca src/data)', () => {
    const resolved = path.resolve(dataFile('security_persisted.json'));
    assert(!resolved.startsWith(path.resolve(process.cwd(), 'src', 'data')), `dados de teste apontam para ${resolved}`);
  });

  // ---------------------------------------------------------------- autenticação
  await runTest('PI-04', 'API recusa requisição sem sessão', async () => {
    const r = await runAuth('GET', '/v1/cmdb/items');
    assert(!r.nextCalled && (r.statusCode === 401 || r.statusCode === 503), `esperado 401/503, obtido ${r.statusCode}`);
  });

  await runTest('PI-05', 'Cabeçalho x-user-role forjado não concede acesso', async () => {
    const r = await runAuth('GET', '/v1/security/findings', { 'x-user-role': 'ADMIN', 'x-tenant-id': 'tenant-demo' });
    assert(!r.nextCalled, 'cabeçalho forjado não deveria passar');
  });

  await runTest('PI-06', 'Token de agente opaco não é tratado como sessão de usuário', async () => {
    const r = await runAuth('GET', '/v1/cmdb/items', { authorization: 'Bearer wp-agent-token-opaco-123456' });
    assert(!r.nextCalled && !r.req.authUser, 'token opaco não deveria autenticar usuário');
  });

  await runTest('PI-07', 'Rotas públicas declaradas seguem liberadas (health, ingestão de agentes, link compartilhado)', async () => {
    for (const [method, p] of [['GET', '/health'], ['POST', '/v1/agent/heartbeat'], ['GET', '/v1/security/reports/share/abc123']]) {
      const r = await runAuth(method, p);
      assert(r.nextCalled, `${method} ${p} deveria ser público`);
    }
    const blocked = await runAuth('GET', '/health/database');
    assert(!blocked.nextCalled, '/health/database expõe detalhes e deveria exigir sessão');
  });

  await runTest('PI-08', 'Enrollment tokens vazados são revogados ao carregar o store', () => {
    const leakedHash = '245e6650e1100707f43e51dd189cd83eab4514b72b282225cf59b3f6f81a9fef';
    const tokens: any[] = [
      { id: 'a', tokenHash: leakedHash, status: 'active' },
      { id: 'b', tokenHash: sha256('token-legitimo-gerado-pelo-admin'), status: 'active' }
    ];
    const out = revokeCompromisedEnrollmentTokens(tokens);
    assert(out[0].status === 'revoked', 'token vazado deveria ser revogado');
    assert(out[1].status === 'active', 'token legítimo deveria continuar ativo');
  });

  // ---------------------------------------------------------------- contratos
  await runTest('PI-09', 'Contrato de compliance: resumo e matriz no formato consumido pela UI', () => {
    const controls = ComplianceEngine.getInitialControls();
    const summary = ComplianceEngine.calculateFrameworkCompliance(controls);
    assert(Array.isArray(summary.frameworkScores) && summary.frameworkScores.length > 0, 'frameworkScores deveria ser lista');
    for (const f of summary.frameworkScores as any[]) {
      for (const k of ['code', 'framework', 'compliancePct', 'totalControls', 'compliantCount', 'partiallyCompliantCount', 'nonCompliantCount']) {
        assert(f[k] !== undefined, `campo ${k} ausente no resumo de ${f.code}`);
      }
    }
    const matrix = ComplianceEngine.buildEvidenceMatrix(controls, [], [], []) as any[];
    assert(matrix.length === controls.length, 'matriz deveria ter um item por controle');
    assert(matrix.every(m => Array.isArray(m.linkedFindings) && typeof m.controlTitle === 'string'), 'itens da matriz sem linkedFindings/controlTitle');
  });

  await runTest('PI-10', 'Achados de pentest ingeridos pelo orquestrador persistem no arquivo', () => {
    const before = SecurityOrchestrator.listFindings('tenant-demo').length;
    SecurityOrchestrator.ingestPentestResults('pnt-integrity-test', [{
      rawFinding: {
        tenantId: 'tenant-demo',
        title: 'Cabeçalho HSTS ausente (teste de integridade)',
        description: 'Teste automatizado',
        severity: 'MEDIUM',
        category: 'CONFIGURATION',
        targetValue: 'https://exemplo.interno',
        affectedAsset: 'exemplo.interno'
      }
    }]);
    assert(SecurityOrchestrator.listFindings('tenant-demo').length >= before, 'listagem não deveria diminuir');
    const onDisk = readJsonFile<any>(dataFile('security_persisted.json'));
    assert(onDisk.status === 'ok', 'arquivo de segurança deveria ser legível');
    assert(onDisk.data.findings.some((f: any) => f.pentestId === 'pnt-integrity-test'), 'achado do pentest deveria estar gravado');
    assert(Array.isArray(onDisk.data.pentestProjects), 'chaves do Control Plane deveriam ser preservadas');
  });

  // ---------------------------------------------------------------- mapeamentos do front
  await runTest('PI-11', 'Mapeamento de ativos preserva todos os campos e converte datas vazias em null', () => {
    const asset: any = {
      id: 'ast-1', assetTag: 'TMB-1', name: 'Notebook', category: 'Notebook', brandModel: 'X', serialNumber: 'SN1',
      status: 'em_uso', lifecycleStage: 'utilizacao', acquisitionDate: '', warrantyExpiry: '', purchaseValue: 5000,
      roomName: 'Sala 2', macAddress: 'AA:BB:CC:DD:EE:FF', ipAddress: '10.0.0.5', custodyTermSigned: true,
      contractNumber: 'CT-9', history: [{ id: 'h1' }], maintenances: []
    };
    const row = assetToRow(asset);
    assert(row.purchase_date === null && row.warranty_expiry === null, 'datas vazias deveriam virar null');
    const back = rowToAsset({ ...row, created_at: '2026-01-01' });
    for (const k of ['roomName', 'macAddress', 'ipAddress', 'custodyTermSigned', 'contractNumber', 'purchaseValue']) {
      assert(JSON.stringify((back as any)[k]) === JSON.stringify(asset[k]), `campo ${k} perdido no ida e volta`);
    }
    assert(!('history' in (row.custom_fields as object)), 'history não deveria ser duplicado em custom_fields');
  });

  await runTest('PI-12', 'Sincronização detecta inclusões, alterações e exclusões', () => {
    const baseline = new Map([['1', JSON.stringify({ id: '1', v: 'a' })], ['2', JSON.stringify({ id: '2', v: 'b' })]]);
    const { changed, removedIds } = computeCollectionDelta(baseline, [{ id: '1', v: 'a' }, { id: '2', v: 'B' }, { id: '3', v: 'c' }]);
    assert(changed.map(c => c.id).sort().join(',') === '2,3', `alterados incorretos: ${changed.map(c => c.id)}`);
    assert(removedIds.length === 0, 'nada deveria ser excluído');
    const second = computeCollectionDelta(baseline, [{ id: '1', v: 'a' }]);
    assert(second.removedIds.join(',') === '2' && second.changed.length === 0, 'exclusão do item 2 não detectada');
  });

  await runTest('PI-13', 'Senhas nunca são gravadas em listas de usuários', () => {
    const out = stripPasswords([{ id: 'u1', name: 'A', password: 'segredo' }] as any[]);
    assert(out.length === 1 && !('password' in out[0]), 'campo password deveria ser removido');
  });

  const passed = results.every(r => r.passed);
  return { passed, results };
}
