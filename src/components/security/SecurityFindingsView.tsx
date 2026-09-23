import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  ExternalLink, 
  Ticket, 
  CheckCircle2, 
  AlertTriangle, 
  Server, 
  Clock, 
  Radio, 
  ArrowUpDown,
  RefreshCw
} from 'lucide-react';
import { SecurityFinding, SecuritySeverity, FindingStatus } from '../../types/security';
import { FindingDetailModal } from './FindingDetailModal';

interface SecurityFindingsViewProps {
  findings: SecurityFinding[];
  loading: boolean;
  onRefresh: () => void;
  selectedFindingId?: string | null;
  onSelectFinding: (findingId: string) => void;
}

export const SecurityFindingsView: React.FC<SecurityFindingsViewProps> = ({
  findings,
  loading,
  onRefresh,
  selectedFindingId,
  onSelectFinding
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeModalId, setActiveModalId] = useState<string | null>(null);

  const filtered = findings.filter(f => {
    const matchesSearch = f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          f.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (f.cveId && f.cveId.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (f.linkedCiId && f.linkedCiId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSeverity = severityFilter === 'ALL' || f.severity === severityFilter;
    const matchesStatus = statusFilter === 'ALL' || f.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const getSeverityBadge = (sev: SecuritySeverity, cvss?: number) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">CRÍTICA ({cvss || 9.5})</span>;
      case 'HIGH':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40">ALTA ({cvss || 7.5})</span>;
      case 'MEDIUM':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">MÉDIA ({cvss || 5.0})</span>;
      case 'LOW':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">BAIXA ({cvss || 2.5})</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600">INFO</span>;
    }
  };

  const getStatusBadge = (st: FindingStatus) => {
    switch (st) {
      case 'RESOLVED':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">RESOLVIDA</span>;
      case 'IN_REMEDIATION':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">EM CORREÇÃO</span>;
      case 'WAITING_RETEST':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">RETESTE</span>;
      case 'RISK_ACCEPTED':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600">RISCO ACEITO</span>;
      case 'FALSE_POSITIVE':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">FALSO POSITIVO</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">NOVA</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Inventário de Vulnerabilidades & Achados</h2>
          <p className="text-xs text-slate-400">Correlação contínua com CVEs, auditoria de headers e gestão de remediação com CMDB</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onRefresh}
            title="Atualizar lista de achados"
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por CVE, código, título ou CI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500 flex-1 md:flex-none"
          >
            <option value="ALL">Todas as Severidades</option>
            <option value="CRITICAL">Crítica</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Média</option>
            <option value="LOW">Baixa</option>
            <option value="INFO">Informativa</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500 flex-1 md:flex-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="NEW">Nova</option>
            <option value="IN_REMEDIATION">Em Correção</option>
            <option value="WAITING_RETEST">Aguardando Reteste</option>
            <option value="RESOLVED">Resolvida</option>
            <option value="RISK_ACCEPTED">Risco Aceito</option>
          </select>
        </div>
      </div>

      {/* Tabela Corporativa de Vulnerabilidades */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Código / CVE</th>
                <th className="py-3 px-4 font-semibold">Título da Vulnerabilidade</th>
                <th className="py-3 px-4 font-semibold">CI Vinculado</th>
                <th className="py-3 px-4 font-semibold">Severidade</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Nenhuma vulnerabilidade encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-300 whitespace-nowrap">
                      <div>{item.code}</div>
                      {item.cveId && (
                        <span className="text-[10px] text-amber-400 font-normal">
                          {item.cveId}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-white max-w-md truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-md">
                        {item.affectedService || item.category}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.linkedCiId ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">
                          <Server className="w-3 h-3 text-slate-400" />
                          {item.linkedCiId}
                        </span>
                      ) : (
                        <span className="text-slate-600">Não associado</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {getSeverityBadge(item.severity, item.cvssScore)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setActiveModalId(item.id)}
                        className="px-3 py-1 text-xs font-semibold text-rose-400 hover:text-white bg-rose-950/30 hover:bg-rose-900/50 border border-rose-800/40 rounded transition-colors inline-flex items-center gap-1.5"
                      >
                        Detalhes & Evidência
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes da Vulnerabilidade */}
      {activeModalId && (
        <FindingDetailModal
          findingId={activeModalId}
          onClose={() => setActiveModalId(null)}
          onUpdated={onRefresh}
        />
      )}
    </div>
  );
};
