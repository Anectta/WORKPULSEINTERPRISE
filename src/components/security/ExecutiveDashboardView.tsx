import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  BarChart3,
  Scale,
  RefreshCw,
  Download,
  Calendar,
  Layers,
  Server,
  ArrowUpRight,
  ExternalLink,
  Target
} from 'lucide-react';
import { ExecutiveDashboardData, SecurityScoreHistory } from '../../types/security';

interface ExecutiveDashboardViewProps {
  onNavigateToReports?: () => void;
  onNavigateToCompliance?: () => void;
  onNavigateToRemediation?: () => void;
  onNavigateToFindings?: () => void;
}

export const ExecutiveDashboardView: React.FC<ExecutiveDashboardViewProps> = ({
  onNavigateToReports,
  onNavigateToCompliance,
  onNavigateToRemediation,
  onNavigateToFindings
}) => {
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/security/executive/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do painel executivo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleGenerateExecutiveReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await fetch('/api/v1/security/reports/executive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: new Date(Date.now() - 30 * 86400000).toISOString(),
          periodEnd: new Date().toISOString()
        })
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Relatório Executivo gerado com sucesso! ID: ${json.data.id}`);
        setTimeout(() => setSuccessMsg(null), 5000);
        if (onNavigateToReports) {
          setTimeout(() => onNavigateToReports(), 1000);
        }
      }
    } catch (err) {
      console.error('Falha ao gerar relatório:', err);
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
        <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Carregando Painel Executivo & Indicadores...</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Calculando Security Score, aderência a frameworks e consolidação de riscos.</p>
      </div>
    );
  }

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (grade === 'B') return 'text-sky-400 border-sky-500/40 bg-sky-500/10';
    if (grade === 'C') return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  return (
    <div className="space-y-6">
      {/* Top Header com Ações Executivas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider font-mono">
            <BarChart3 className="w-4 h-4" />
            Governança & Gestão Estratégica
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">Dashboard Executivo de Segurança Cibernética</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Visão unificada de postura de segurança, cálculo de scores ponderados, progresso de remediação e conformidade.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-refresh-exec"
            onClick={loadDashboardData}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-bold flex items-center gap-2 transition-colors border border-slate-200/80 dark:border-slate-700 shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>

          <button
            id="btn-gen-exec-rep"
            onClick={handleGenerateExecutiveReport}
            disabled={generatingReport}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            {generatingReport ? 'Compilando...' : 'Emitir Relatório Executivo'}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid Principal de Scores Executivos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Security Score Oficial */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 font-mono">Security Score Corporativo</span>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{data.securityScore}</span>
                <span className="text-xs text-slate-400 font-medium">/ 100</span>
                <div className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  Nota {data.securityScoreGrade}
                </div>
              </div>
            </div>

            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Tendência do Período:</span>
            <div className="flex items-center gap-1 font-bold">
              {data.riskTrend === 'IMPROVING' ? (
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> Melhoria Contínua
                </span>
              ) : data.riskTrend === 'STABLE' ? (
                <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Minus className="w-4 h-4" /> Estável
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" /> Atenção Necessária
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Risco Global & Postura */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 font-mono">Risk Score Global</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{data.overallRiskScore}</span>
                <span className="text-xs text-slate-400 font-medium">/ 100</span>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-red-200/80">
                  {data.overallRiskScore < 25 ? 'BAIXO' : data.overallRiskScore < 50 ? 'MODERADO' : 'CRÍTICO'}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Vulnerabilidades Ativas:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {data.findingsMetrics.critical} Críticas • {data.findingsMetrics.high} Altas
            </span>
          </div>
        </div>

        {/* Card 3: Eficácia de Remediação & SLAs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fix Rate & Cumprimento de SLA</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold text-emerald-400">{data.remediationMetrics.fixRatePct}%</span>
                <span className="text-xs text-slate-400">resolvidos</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Tempo Médio (MTTR):</span>
            <span className="font-semibold text-white">
              {data.remediationMetrics.mttrDays} dias • {data.remediationMetrics.slaCompliantCount} no prazo
            </span>
          </div>
        </div>
      </div>

      {/* Fatores Detalhados do Security Score & Histórico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Composição Ponderada dos Fatores */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-rose-400" />
            Composição Ponderada do Security Score
          </h3>

          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Vulnerabilidades Neutralizadas (Peso 35%)</span>
                <span className="font-semibold text-white">{data.scoreFactors.vulnerabilityScore}/100</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${data.scoreFactors.vulnerabilityScore}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Aderência e Eficácia de Remediação (Peso 20%)</span>
                <span className="font-semibold text-white">{data.scoreFactors.remediationScore}/100</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${data.scoreFactors.remediationScore}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Conformidade com Frameworks (Peso 20%)</span>
                <span className="font-semibold text-white">{data.scoreFactors.complianceScore}/100</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-sky-500 rounded-full" style={{ width: `${data.scoreFactors.complianceScore}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Proteção de Ativos Críticos DMZ (Peso 15%)</span>
                <span className="font-semibold text-white">{data.scoreFactors.criticalAssetProtection}/100</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${data.scoreFactors.criticalAssetProtection}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Aderência aos SLAs de Resolução (Peso 10%)</span>
                <span className="font-semibold text-white">{data.scoreFactors.slaScore}/100</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${data.scoreFactors.slaScore}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Histórico Recente do Security Score */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-sky-400" />
              Evolução Temporal do Score
            </h3>

            <div className="space-y-3">
              {data.recentScoreHistory.map((item, idx) => (
                <div key={item.id || idx} className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {new Date(item.timestamp).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.note || 'Avaliação periódica'}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-bold text-white">Score: {item.score}/100</div>
                      <div className="text-[10px] text-rose-400">Risco: {item.riskScore}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getGradeColor(item.grade)}`}>
                      {item.grade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Última atualização: {new Date(data.calculatedAt).toLocaleTimeString('pt-BR')}</span>
            <span className="text-slate-300">Auditoria criptográfica ativa</span>
          </div>
        </div>
      </div>

      {/* Aderência a Frameworks de Conformidade */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              Conformidade Estratégica por Framework (Gap Analysis)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Percentual calculado com base nos controles auditados, evidências vinculadas e achados mitigados.
            </p>
          </div>
          {onNavigateToCompliance && (
            <button
              onClick={onNavigateToCompliance}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
            >
              Ver Detalhes dos Controles <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {data.complianceMetrics.frameworkScores.map(f => (
            <div key={f.code} className="bg-slate-800/40 border border-slate-800 rounded-lg p-3.5">
              <div className="text-xs font-semibold text-slate-300 truncate" title={f.framework}>
                {f.framework}
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold text-white">{f.compliantPct}%</span>
                <span className="text-[10px] text-slate-400">{f.passed}/{f.total} controles</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    f.compliantPct >= 80 ? 'bg-emerald-500' : f.compliantPct >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${f.compliantPct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabelas de Prioridades Executivas: Top Riscos & Top Ativos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Riscos Corporativos */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Principais Riscos Corporativos Ativos
            </h3>
            {onNavigateToFindings && (
              <button
                onClick={onNavigateToFindings}
                className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1"
              >
                Ver todos <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {data.topRisks.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhum risco de severidade Alta ou Crítica ativo no momento.</p>
            ) : (
              data.topRisks.map(risk => (
                <div key={risk.id} className="bg-slate-800/30 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        risk.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        risk.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {risk.severity}
                      </span>
                      <span className="text-xs font-bold text-white">{risk.code}</span>
                    </div>
                    <div className="text-xs text-slate-300 font-medium truncate max-w-xs">{risk.title}</div>
                    <div className="text-[11px] text-slate-400">Alvo: {risk.affectedAsset}</div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-400">Risco {risk.riskScore}</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">Status: {risk.remediationStatus}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Ativos Mais Expostos */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              Ativos com Maior Concentração de Risco (CMDB)
            </h3>
            {onNavigateToRemediation && (
              <button
                onClick={onNavigateToRemediation}
                className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1"
              >
                Planos <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {data.topVulnerableAssets.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhum ativo crítico com achados registrados.</p>
            ) : (
              data.topVulnerableAssets.map(asset => (
                <div key={asset.assetId} className="bg-slate-800/30 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{asset.assetName}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        asset.criticality === 'CRITICA' ? 'bg-rose-500/20 text-rose-400' : 'bg-sky-500/20 text-sky-400'
                      }`}>
                        {asset.criticality}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">CI CMDB: {asset.ciId || 'Não vinculado'}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-white">{asset.findingsCount} achados</div>
                    <div className="text-[10px] text-rose-400 font-semibold">Risco Ponderado: {asset.riskScore}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
