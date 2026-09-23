import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Activity,
  Server,
  Database,
  Lock,
  Zap,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Clock,
  KeyRound,
  FileCode2,
  Radio,
  FileCheck2,
  Terminal,
  Copy,
  Check
} from 'lucide-react';
import { SecuritySystemHealth } from '../../../server/security/securityHealth';
import { SecurityTestSuiteReport } from '../../../server/security/securityTestSuite';

export const SecurityObservabilityView: React.FC = () => {
  const [health, setHealth] = useState<SecuritySystemHealth | null>(null);
  const [testReport, setTestReport] = useState<SecurityTestSuiteReport | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [runningTests, setRunningTests] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Carregar saúde do sistema
  const loadHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch('/api/v1/security/health');
      const data = await res.json();
      if (data.success) {
        setHealth(data.data);
      }
    } catch (err) {
      console.error('Erro ao buscar health de segurança:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  // Executar a Suíte de Testes Automatizada
  const runSecurityTests = async () => {
    setRunningTests(true);
    try {
      const res = await fetch('/api/v1/security/test-suite/run');
      const data = await res.json();
      if (data.success) {
        setTestReport(data.data);
      }
    } catch (err) {
      console.error('Erro ao executar suíte de testes de segurança:', err);
    } finally {
      setRunningTests(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Hardening & Observabilidade */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Produção & Hardening (Etapa 8)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Zero Trust Architecture
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-rose-500" />
            Observabilidade, Saúde do Sistema & Auditoria de Produção
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Monitoramento em tempo real do Security Engine, Runner isolado, filas de execução, integridade criptográfica e conformidade RLS para Supabase/Vercel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-refresh-health"
            onClick={loadHealth}
            disabled={loadingHealth}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
            Atualizar Status
          </button>

          <button
            id="btn-run-security-suite"
            onClick={runSecurityTests}
            disabled={runningTests}
            className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 rounded-lg shadow-sm transition-all flex items-center gap-2 shadow-rose-950/40"
          >
            <Play className={`w-3.5 h-3.5 ${runningTests ? 'animate-spin' : ''}`} />
            {runningTests ? 'Executando 16 Verificações...' : 'Executar Suíte de Testes (16 Checks)'}
          </button>
        </div>
      </div>

      {/* Cards de Status de Componentes Críticos */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Security Engine */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Security Engine</h3>
                  <p className="text-xs text-slate-400">Validação & Safe-Mode</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {health.components.securityEngine.status}
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              {health.components.securityEngine.message}
            </p>
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Anti-SSRF: <b className="text-emerald-400">ENFORCED</b></span>
              <span>Timeout: <b className="text-slate-200">{health.components.securityEngine.details?.timeoutMs}ms</b></span>
            </div>
          </div>

          {/* Pentest Runner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Isolated Runner</h3>
                  <p className="text-xs text-slate-400">Execução Controlada</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {health.components.pentestRunner.status}
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              {health.components.pentestRunner.message}
            </p>
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Kill Switch: <b className="text-emerald-400">ATIVO (&lt; 1s)</b></span>
              <span>Processos Ativos: <b className="text-slate-200">{health.metrics.runningPentests}</b></span>
            </div>
          </div>

          {/* Execution Queue */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Execution Queue</h3>
                  <p className="text-xs text-slate-400">Fila e Agendamento</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {health.components.executionQueue.status}
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              {health.components.executionQueue.message}
            </p>
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Fila Pendente: <b className="text-slate-200">{health.components.executionQueue.details?.queuedCount}</b></span>
              <span>Dead Letter: <b className="text-slate-200">0</b></span>
            </div>
          </div>

          {/* Database & Multi-Tenancy */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Banco & RLS Multi-Tenant</h3>
                  <p className="text-xs text-slate-400">Supabase PostgreSQL Ready</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {health.components.database.status}
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              {health.components.database.message}
            </p>
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Isolamento: <b className="text-indigo-400">tenant_id estrito</b></span>
              <span>Latência: <b className="text-slate-200">{health.components.database.latencyMs}ms</b></span>
            </div>
          </div>

          {/* Storage & Cryptographic Evidence */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Evidências & Storage Privado</h3>
                  <p className="text-xs text-slate-400">SHA-256 Hashes Imutáveis</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {health.components.storage.status}
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              {health.components.storage.message}
            </p>
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Acesso: <b className="text-purple-400">STRICT_PRIVATE</b></span>
              <span>Links Assinados: <b className="text-slate-200">Expiráveis</b></span>
            </div>
          </div>

          {/* API Gateway & Security Headers */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">API Gateway & RBAC</h3>
                  <p className="text-xs text-slate-400">Headers, Rate-Limit & RBAC</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {health.components.apiGateway.status}
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              {health.components.apiGateway.message}
            </p>
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Rate Limiting: <b className="text-emerald-400">ENFORCED</b></span>
              <span>Uptime: <b className="text-slate-200">{formatUptime(health.uptimeSeconds)}</b></span>
            </div>
          </div>
        </div>
      )}

      {/* Resultados da Suíte de Testes Automatizada (16 Verificações) */}
      {testReport && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Relatório da Suíte de Testes de Produção (16 Requisitos)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Executado em {new Date(testReport.executedAt).toLocaleString()} • Duração: {testReport.durationMs}ms
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                testReport.overallStatus === 'PASSED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {testReport.passedCount} / {testReport.totalTests} PASSARAM ({testReport.successRatePct}%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {testReport.testCases.map((tc) => (
              <div
                key={tc.id}
                className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      {tc.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-white truncate">
                        {tc.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      {tc.durationMs}ms
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 pl-6 mb-2">
                    {tc.details}
                  </p>
                </div>

                {tc.evidence && (
                  <div className="pl-6 pt-1.5 border-t border-slate-800/60 text-[11px] font-mono text-slate-400 truncate">
                    <span className="text-slate-400">Evidência: </span>
                    <span className="text-slate-300">{tc.evidence}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 bg-emerald-950/30 border border-emerald-900/40 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><b>Conformidade Regulatória:</b> {testReport.complianceDeclaration}</span>
          </div>
        </div>
      )}

      {/* Matriz Zero-Trust & Fluxo de Arquitetura de Produção */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-4 h-4 text-rose-400" />
          Fluxo de Arquitetura Zero-Trust de Ponta a Ponta
        </h3>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto whitespace-nowrap leading-relaxed">
          <div className="text-rose-400 mb-1"># Zero-Trust Pipeline Validado (Etapa 8):</div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded">Usuário</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded">Frontend WorkPulse</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded">Auth Context</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded">RBAC Check</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded">Tenant Validation</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded">API Gateway</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded">Orchestrator</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded">Policy & Scope Guard</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded">Target Anti-SSRF</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">Isolated Runner</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-800 rounded">Finding & SHA-256 Hash</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-800 rounded">HMAC Audit Log</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-4">
            <h4 className="text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              Matriz de Papéis RBAC
            </h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• <b className="text-slate-200">Viewer:</b> Leitura de métricas e relatórios</li>
              <li>• <b className="text-slate-200">Analyst:</b> Triagem de findings e remediações</li>
              <li>• <b className="text-slate-200">Operator:</b> Execução e retestes aprovados</li>
              <li>• <b className="text-slate-200">Manager:</b> Aprovação de pentest e aceites</li>
              <li>• <b className="text-slate-200">Admin:</b> Configurações críticas e governança</li>
            </ul>
          </div>

          <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-4">
            <h4 className="text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Proteções Ativas
            </h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• <b className="text-emerald-400">Anti-SSRF:</b> Bloqueio de loopback e metadata</li>
              <li>• <b className="text-emerald-400">Rate Limiting:</b> 60 req/min por rota</li>
              <li>• <b className="text-emerald-400">Kill Switch:</b> Parada emergencial imediata</li>
              <li>• <b className="text-emerald-400">Sanitização:</b> Redação de segredos e tokens</li>
              <li>• <b className="text-emerald-400">Headers:</b> CSP, X-Content-Type, Referrer</li>
            </ul>
          </div>

          <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-4">
            <h4 className="text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5 text-sky-400" />
              Preparação para Produção
            </h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• <b className="text-sky-400">Supabase DDL:</b> Script RLS pronto</li>
              <li>• <b className="text-sky-400">Vercel:</b> Rotas serverless compatíveis</li>
              <li>• <b className="text-sky-400">Multi-Tenancy:</b> 100% de tabelas com tenant_id</li>
              <li>• <b className="text-sky-400">Append-Only:</b> Trigger de imutabilidade de audit</li>
              <li>• <b className="text-sky-400">Zero Trust:</b> Nenhum input do client é cego</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
