import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Server, 
  ExternalLink, 
  Radio, 
  Zap, 
  Lock, 
  FileText,
  Activity,
  ArrowRight
} from 'lucide-react';
import { SecurityDashboardMetrics, SecurityScan } from '../../types/security';

interface SecurityDashboardViewProps {
  metrics: SecurityDashboardMetrics | null;
  loading: boolean;
  onOpenScanRunner: () => void;
  onOpenNewScope: () => void;
  onSelectScan: (scanId: string) => void;
  onNavigateTab: (tab: 'scans' | 'findings' | 'scopes' | 'audit') => void;
  onSelectCI?: (ciId: string) => void;
}

export const SecurityDashboardView: React.FC<SecurityDashboardViewProps> = ({
  metrics,
  loading,
  onOpenScanRunner,
  onOpenNewScope,
  onSelectScan,
  onNavigateTab,
  onSelectCI
}) => {
  if (loading || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Carregando métricas do Security Engine...</p>
      </div>
    );
  }

  const { overallRiskScore, findingsBySeverity, findingsByStatus, topVulnerableCIs, recentScans } = metrics;

  // Cor do score de risco
  const getRiskColor = (score: number) => {
    if (score >= 70) return { text: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30', label: 'CRÍTICO' };
    if (score >= 40) return { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'MODERADO' };
    return { text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'CONTROLADO' };
  };

  const riskMeta = getRiskColor(overallRiskScore);

  return (
    <div className="space-y-6">
      {/* Top Banner & Ações de Disparo */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                <Radio className="w-3 h-3 animate-pulse text-rose-500" />
                SECURITY ENGINE OPERACIONAL
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Ambiente Controlado & Autorizado (RFC 1918 / Perímetro)</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Postura de Segurança Cibernética & Avaliação de Riscos
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
              Monitoramento ativo de vulnerabilidades, auditoria passiva de portas e cabeçalhos de segurança, e correlação contínua com os Configuration Items (CIs) do CMDB.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button
              id="btn-open-new-scope"
              onClick={onOpenNewScope}
              className="flex-1 lg:flex-none px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              Termo de Escopo
            </button>
            <button
              id="btn-open-scan-runner"
              onClick={onOpenScanRunner}
              className="flex-1 lg:flex-none px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              Executar Security Scan
            </button>
          </div>
        </div>
      </div>

      {/* Grid de KPIs Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Risk Score */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Score de Risco Global</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${riskMeta.bg} ${riskMeta.text} ${riskMeta.border} border`}>
              {riskMeta.label}
            </span>
          </div>
          <div className="my-4 flex items-baseline gap-3">
            <span className={`text-4xl font-extrabold tracking-tight ${riskMeta.text}`}>
              {overallRiskScore}
            </span>
            <span className="text-xs text-slate-500">/ 100 máx</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${overallRiskScore >= 70 ? 'bg-rose-500' : overallRiskScore >= 40 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
              style={{ width: `${overallRiskScore}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Ponderado por criticidade do CI e exposição em rede
          </p>
        </div>

        {/* Severidade das Vulnerabilidades */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Achados por Severidade</span>
            <button 
              onClick={() => onNavigateTab('findings')} 
              className="text-[11px] text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 my-3">
            <div className="bg-rose-950/30 border border-rose-800/40 rounded-lg p-2 text-center">
              <span className="text-xs text-rose-400 block font-medium">Críticas</span>
              <span className="text-xl font-bold text-rose-300">{findingsBySeverity.critical}</span>
            </div>
            <div className="bg-orange-950/30 border border-orange-800/40 rounded-lg p-2 text-center">
              <span className="text-xs text-orange-400 block font-medium">Altas</span>
              <span className="text-xl font-bold text-orange-300">{findingsBySeverity.high}</span>
            </div>
            <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-2 text-center">
              <span className="text-xs text-amber-400 block font-medium">Médias</span>
              <span className="text-xl font-bold text-amber-300">{findingsBySeverity.medium}</span>
            </div>
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Baixas: {findingsBySeverity.low}</span>
            <span>Informativas: {findingsBySeverity.info}</span>
          </div>
        </div>

        {/* Status do Pipeline de Remediação */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Remediação & Tickets</span>
            <span className="text-[11px] text-slate-500 font-medium">{findingsByStatus.resolved} resolvidas</span>
          </div>
          <div className="space-y-2.5 my-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Novas / Pendentes:
              </span>
              <span className="font-bold text-slate-200">{findingsByStatus.open}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Em Correção (ITSM):
              </span>
              <span className="font-bold text-slate-200">{findingsByStatus.inRemediation}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Aguardando Reteste:
              </span>
              <span className="font-bold text-slate-200">{findingsByStatus.waitingRetest}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">Integração nativa com chamados de suporte</p>
        </div>

        {/* Ativos sob Escopo */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Superfície de Ataque</span>
            <Lock className="w-4 h-4 text-slate-500" />
          </div>
          <div className="my-3 space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{metrics.monitoredAssetsCount}</span>
              <span className="text-xs text-slate-400">ativos mapeados</span>
            </div>
            <div className="text-xs text-rose-400 flex items-center gap-1 font-medium">
              <span>{metrics.criticalAssetsCount} ativos de criticidade máxima</span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('scopes')}
            className="w-full py-1.5 text-xs text-center text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded border border-slate-700/60 transition-colors"
          >
            Gerenciar Escopos Autorizados
          </button>
        </div>
      </div>

      {/* Seção Principal: Top CIs Vulneráveis & Scans Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top CIs Vulneráveis (CMDB) */}
        <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">Top Ativos de Risco (CMDB & Infra)</h3>
            </div>
            <span className="text-xs text-slate-500">Prioridade de Remediação</span>
          </div>

          <div className="space-y-3 flex-1">
            {topVulnerableCIs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                Nenhum ativo com vulnerabilidades ativas pendentes.
              </div>
            ) : (
              topVulnerableCIs.map((ci) => (
                <div 
                  key={ci.ciId}
                  className="bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 rounded-lg p-3 transition-colors flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{ci.ciName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                        {ci.ciId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>Tipo: {ci.ciType}</span>
                      <span>•</span>
                      <span className="text-rose-400 font-medium">{ci.findingCount} achados abertos</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-bold text-rose-400">Risco {ci.riskScore}</div>
                      <div className="text-[10px] text-slate-500">{ci.criticality}</div>
                    </div>
                    <button
                      onClick={() => onSelectCI?.(ci.ciId)}
                      title="Ver vulnerabilidades deste CI"
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Histórico de Scans Recentes */}
        <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">Execuções Recentes do Security Engine</h3>
            </div>
            <button 
              onClick={() => onNavigateTab('scans')} 
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Ver todos os scans
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {recentScans.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                Nenhum scan executado ainda. Clique em "Executar Security Scan" para iniciar.
              </div>
            ) : (
              recentScans.map((scan) => (
                <div 
                  key={scan.id}
                  onClick={() => onSelectScan(scan.id)}
                  className="bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 hover:border-slate-700 rounded-lg p-3 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{scan.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {scan.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>Tipo: {scan.scanType}</span>
                      <span>•</span>
                      <span>{new Date(scan.createdAt).toLocaleDateString('pt-BR')} às {new Date(scan.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      {scan.findingsCountSummary && (
                        <>
                          {scan.findingsCountSummary.high > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {scan.findingsCountSummary.high} Altas
                            </span>
                          )}
                          {scan.findingsCountSummary.medium > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {scan.findingsCountSummary.medium} Médias
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      scan.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      scan.status === 'RUNNING' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse' :
                      scan.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                      'bg-slate-700 text-slate-300 border-slate-600'
                    }`}>
                      {scan.status === 'COMPLETED' ? 'CONCLUÍDO' : scan.status === 'RUNNING' ? 'EM EXECUÇÃO' : scan.status}
                    </span>
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
