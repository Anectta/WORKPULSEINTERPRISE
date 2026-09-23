import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Search, 
  Filter, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  ArrowRight,
  Square,
  RefreshCw,
  Server,
  FileSearch,
  ChevronRight
} from 'lucide-react';
import { SecurityScan } from '../../types/security';

interface SecurityScansViewProps {
  scans: SecurityScan[];
  loading: boolean;
  onRefresh: () => void;
  onOpenScanRunner: () => void;
  selectedScanId?: string | null;
  onSelectScan: (scanId: string) => void;
  onViewScanFindings: (scanId: string) => void;
}

export const SecurityScansView: React.FC<SecurityScansViewProps> = ({
  scans,
  loading,
  onRefresh,
  onOpenScanRunner,
  selectedScanId,
  onSelectScan,
  onViewScanFindings
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeScanDetail, setActiveScanDetail] = useState<{ scan: SecurityScan; activeJob?: any } | null>(null);
  const [aborting, setAborting] = useState(false);

  // Carregar detalhes do scan selecionado
  useEffect(() => {
    if (!selectedScanId) {
      if (scans.length > 0 && !activeScanDetail) {
        onSelectScan(scans[0].id);
      }
      return;
    }

    let intervalId: any;

    const fetchScanDetail = async () => {
      try {
        const res = await fetch(`/api/v1/security/scans/${selectedScanId}`);
        const data = await res.json();
        if (data.success) {
          setActiveScanDetail(data.data);
          // Se o scan estiver em execução, poll a cada 2 segundos
          if (data.data.scan?.status === 'RUNNING' && !intervalId) {
            intervalId = setInterval(fetchScanDetail, 2000);
          } else if (data.data.scan?.status !== 'RUNNING' && intervalId) {
            clearInterval(intervalId);
            onRefresh();
          }
        }
      } catch (err) {
        console.error('Erro ao buscar detalhes do scan:', err);
      }
    };

    fetchScanDetail();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [selectedScanId, scans]);

  const handleAbort = async (scanId: string) => {
    if (!confirm('Deseja realmente abortar este scan em andamento? O Security Engine será interrompido de forma segura.')) return;
    setAborting(true);
    try {
      const res = await fetch(`/api/v1/security/scans/${scanId}/abort`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        onRefresh();
        // Atualizar estado local
        if (activeScanDetail?.scan) {
          setActiveScanDetail({
            ...activeScanDetail,
            scan: { ...activeScanDetail.scan, status: 'CANCELLED' },
            activeJob: null
          });
        }
      }
    } catch (err) {
      console.error('Erro ao abortar scan:', err);
    } finally {
      setAborting(false);
    }
  };

  const filteredScans = scans.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Execuções de Security Scan</h2>
          <p className="text-xs text-slate-400">Histórico de varreduras, progresso em tempo real e consolidação de evidências</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onRefresh}
            title="Atualizar lista de scans"
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            id="btn-new-scan-top"
            onClick={onOpenScanRunner}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Novo Security Scan
          </button>
        </div>
      </div>

      {/* Grid Principal: Lista à esquerda, Detalhe à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Esquerdo: Lista */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por código ou título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="ALL">Todos os Status</option>
              <option value="COMPLETED">Concluído</option>
              <option value="RUNNING">Em Execução</option>
              <option value="CANCELLED">Cancelado</option>
              <option value="FAILED">Falha</option>
            </select>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[600px] pr-1">
            {filteredScans.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500">
                Nenhuma execução encontrada para os filtros aplicados.
              </div>
            ) : (
              filteredScans.map((scan) => {
                const isSelected = selectedScanId === scan.id;
                return (
                  <div
                    key={scan.id}
                    onClick={() => onSelectScan(scan.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-rose-950/20 border-rose-500/50 shadow-sm' 
                        : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-mono font-bold text-slate-300">
                        {scan.code}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        scan.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                        scan.status === 'RUNNING' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse' :
                        scan.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                        'bg-slate-700/60 text-slate-400 border-slate-600'
                      }`}>
                        {scan.status === 'COMPLETED' ? 'CONCLUÍDO' : scan.status === 'RUNNING' ? 'EXECUTANDO...' : scan.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white mb-1.5 truncate">
                      {scan.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{scan.scanType}</span>
                      <span>{new Date(scan.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Painel Direito: Detalhes da Execução Ativa / Concluída */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 flex flex-col space-y-6">
          {!activeScanDetail?.scan ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs">
              <FileSearch className="w-8 h-8 mb-2 text-slate-600" />
              Selecione uma execução à esquerda para visualizar o relatório detalhado.
            </div>
          ) : (
            <>
              {/* Top Banner do Scan */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/50">
                      {activeScanDetail.scan.code}
                    </span>
                    <span className="text-xs text-slate-400">
                      Tipo: <strong>{activeScanDetail.scan.scanType}</strong>
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {activeScanDetail.scan.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Disparado por {activeScanDetail.scan.triggeredByName} em {new Date(activeScanDetail.scan.startedAt).toLocaleString('pt-BR')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {activeScanDetail.scan.status === 'RUNNING' && (
                    <button
                      onClick={() => handleAbort(activeScanDetail.scan.id)}
                      disabled={aborting}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      {aborting ? 'Abortando...' : 'Interromper'}
                    </button>
                  )}
                  <button
                    onClick={() => onViewScanFindings(activeScanDetail.scan.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    Ver Achados <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Status de Execução Ativa */}
              {activeScanDetail.scan.status === 'RUNNING' && activeScanDetail.activeJob && (
                <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-800/40 space-y-3">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-blue-300 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                      {activeScanDetail.activeJob.currentStep || 'Executando avaliação...'}
                    </span>
                    <span className="font-mono text-blue-300">{activeScanDetail.activeJob.progressPct || 10}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{ width: `${activeScanDetail.activeJob.progressPct || 10}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    O Security Engine está executando verificações controladas via Express & Node sockets.
                  </p>
                </div>
              )}

              {/* Resumo de Vulnerabilidades Encontradas */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Resumo de Vulnerabilidades Identificadas
                </h4>
                <div className="grid grid-cols-5 gap-2">
                  <div className="bg-rose-950/20 border border-rose-800/30 rounded-lg p-3 text-center">
                    <span className="text-[11px] text-rose-400 block font-medium">Crítica</span>
                    <span className="text-xl font-bold text-rose-200">
                      {activeScanDetail.scan.findingsCountSummary?.critical || 0}
                    </span>
                  </div>
                  <div className="bg-orange-950/20 border border-orange-800/30 rounded-lg p-3 text-center">
                    <span className="text-[11px] text-orange-400 block font-medium">Alta</span>
                    <span className="text-xl font-bold text-orange-200">
                      {activeScanDetail.scan.findingsCountSummary?.high || 0}
                    </span>
                  </div>
                  <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-3 text-center">
                    <span className="text-[11px] text-amber-400 block font-medium">Média</span>
                    <span className="text-xl font-bold text-amber-200">
                      {activeScanDetail.scan.findingsCountSummary?.medium || 0}
                    </span>
                  </div>
                  <div className="bg-blue-950/20 border border-blue-800/30 rounded-lg p-3 text-center">
                    <span className="text-[11px] text-blue-400 block font-medium">Baixa</span>
                    <span className="text-xl font-bold text-blue-200">
                      {activeScanDetail.scan.findingsCountSummary?.low || 0}
                    </span>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3 text-center">
                    <span className="text-[11px] text-slate-400 block font-medium">Info</span>
                    <span className="text-xl font-bold text-slate-300">
                      {activeScanDetail.scan.findingsCountSummary?.info || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metadados Técnicos de Execução */}
              <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-700/50">
                  <span className="text-slate-400">Início da Execução:</span>
                  <span className="text-slate-200 font-mono">
                    {new Date(activeScanDetail.scan.startedAt).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/50">
                  <span className="text-slate-400">Término da Execução:</span>
                  <span className="text-slate-200 font-mono">
                    {activeScanDetail.scan.finishedAt ? new Date(activeScanDetail.scan.finishedAt).toLocaleString('pt-BR') : 'Em andamento...'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/50">
                  <span className="text-slate-400">ID do Escopo Autorizado:</span>
                  <span className="text-slate-200 font-mono">{activeScanDetail.scan.scopeId}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Política Aplicada:</span>
                  <span className="text-slate-200">Rate Limit 5 req/s (Safe Mode Only)</span>
                </div>
              </div>

              {/* Botão para Acessar Achados */}
              <button
                onClick={() => onViewScanFindings(activeScanDetail.scan.id)}
                className="w-full py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Explorar Todas as Vulnerabilidades Deste Scan
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
