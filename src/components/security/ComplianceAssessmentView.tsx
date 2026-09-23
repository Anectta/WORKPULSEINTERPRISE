import React, { useState, useEffect } from 'react';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  Shield,
  Search,
  Filter,
  Download,
  Edit3,
  Calendar,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Info,
  Clock,
  ExternalLink,
  ChevronRight,
  X
} from 'lucide-react';
import {
  ComplianceControl,
  EvidenceMatrixItem,
  ComplianceFrameworkSummary,
  ComplianceStatus
} from '../../types/security';

export const ComplianceAssessmentView: React.FC = () => {
  const [controls, setControls] = useState<ComplianceControl[]>([]);
  const [evidenceMatrix, setEvidenceMatrix] = useState<EvidenceMatrixItem[]>([]);
  const [summaries, setSummaries] = useState<ComplianceFrameworkSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'matrix' | 'controls' | 'gaps'>('matrix');

  // Modal de Edição de Plano de Ação / Gap
  const [editingControl, setEditingControl] = useState<ComplianceControl | null>(null);
  const [editStatus, setEditStatus] = useState<ComplianceStatus>('PARTIALLY_COMPLIANT');
  const [editGap, setEditGap] = useState('');
  const [editActionPlan, setEditActionPlan] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadComplianceData = async () => {
    setLoading(true);
    try {
      const [cRes, mRes, sRes] = await Promise.all([
        fetch('/api/v1/security/compliance/controls').then(r => r.json()),
        fetch('/api/v1/security/compliance/matrix').then(r => r.json()),
        fetch('/api/v1/security/compliance/summary').then(r => r.json())
      ]);

      if (cRes.success) setControls(cRes.data);
      if (mRes.success) setEvidenceMatrix(mRes.data);
      if (sRes.success) setSummaries(sRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados de conformidade:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplianceData();
  }, []);

  const handleOpenEditModal = (control: ComplianceControl) => {
    setEditingControl(control);
    setEditStatus(control.status);
    setEditGap(control.gapDescription || '');
    setEditActionPlan(control.actionPlan || '');
    setEditTargetDate(control.targetResolutionDate || '');
  };

  const handleSaveControl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingControl) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/v1/security/compliance/controls/${editingControl.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          gapDescription: editGap,
          actionPlan: editActionPlan,
          targetResolutionDate: editTargetDate
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Controle ${editingControl.code} atualizado com sucesso!`);
        setEditingControl(null);
        loadComplianceData();
      }
    } catch (err) {
      console.error('Erro ao salvar controle:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Código', 'Framework', 'Título', 'Status', 'Evidências', 'Gaps', 'Plano de Ação'];
    const rows = controls.map(c => [
      c.code,
      c.framework,
      `"${c.title.replace(/"/g, '""')}"`,
      c.status,
      c.evidenceCount,
      `"${(c.gapDescription || '').replace(/"/g, '""')}"`,
      `"${(c.actionPlan || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `compliance_gap_analysis_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Matriz de Compliance exportada com sucesso!');
  };

  // Filtros
  const filteredMatrix = evidenceMatrix.filter(item => {
    const matchesFramework = selectedFramework === 'ALL' || item.framework.toLowerCase().includes(selectedFramework.toLowerCase());
    const matchesStatus = selectedStatus === 'ALL' || item.status === selectedStatus;
    const matchesSearch = searchTerm === '' ||
      item.controlCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.controlTitle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFramework && matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: ComplianceStatus) => {
    switch (status) {
      case 'COMPLIANT':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'PARTIALLY_COMPLIANT':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'NON_COMPLIANT':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border border-slate-600';
    }
  };

  const getStatusLabel = (status: ComplianceStatus) => {
    switch (status) {
      case 'COMPLIANT': return 'Conforme';
      case 'PARTIALLY_COMPLIANT': return 'Parcial';
      case 'NON_COMPLIANT': return 'Não Conforme';
      default: return 'Não Aplicável';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
            <Scale className="w-4 h-4" />
            Governança, Riscos & Conformidade (GRC)
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Matriz de Compliance & Auditoria de Evidências</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Mapeamento contínuo entre controles de segurança, evidências técnicas, vulnerabilidades detectadas e planos de ação.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadComplianceData}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Exportar Matriz (CSV)
          </button>
        </div>
      </div>

      {/* Nota de Governança & Isenção Legal */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 text-xs text-slate-300 flex items-start gap-3">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block font-semibold mb-0.5">Nota de Governança & Conformidade Técnica</strong>
          <span>
            Os indicadores desta matriz representam o diagnóstico interno de alinhamento aos controles técnicos com base em verificações automatizadas e evidências de testes. Não constituem certificação formal de órgãos certificadores independentes (ex: ISO/IEC acreditada ou auditoria AICPA SOC).
          </span>
        </div>
      </div>

      {/* Sumário por Framework */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {summaries.map(sum => (
          <div
            key={sum.code}
            onClick={() => setSelectedFramework(selectedFramework === sum.code ? 'ALL' : sum.code)}
            className={`cursor-pointer bg-slate-900/60 border rounded-xl p-4 transition-all ${
              selectedFramework === sum.code ? 'border-amber-500 bg-amber-500/5' : 'border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-slate-200 truncate">{sum.framework}</span>
              <span className="text-[10px] text-slate-400">{sum.totalControls} contr.</span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-extrabold text-white">{sum.compliancePct}%</span>
              <span className="text-[11px] text-slate-400">aderente</span>
            </div>

            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  sum.compliancePct >= 80 ? 'bg-emerald-500' : sum.compliancePct >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${sum.compliancePct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800">
              <span className="text-emerald-400 font-semibold">{sum.compliantCount} conf.</span>
              <span className="text-amber-400 font-semibold">{sum.partiallyCompliantCount} parc.</span>
              <span className="text-rose-400 font-semibold">{sum.nonCompliantCount} gaps</span>
            </div>
          </div>
        ))}
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por código ou título do controle..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          {['ALL', 'COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT'].map(s => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                selectedStatus === s ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {s === 'ALL' ? 'Todos' : s === 'COMPLIANT' ? 'Conformes' : s === 'PARTIALLY_COMPLIANT' ? 'Parciais' : 'Com Gaps'}
            </button>
          ))}
        </div>
      </div>

      {/* TABELA: MATRIZ DE EVIDÊNCIAS & CONTROLES */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 border-b border-slate-800 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              <tr>
                <th className="py-3 px-4">Controle / Framework</th>
                <th className="py-3 px-4">Status & Aderência</th>
                <th className="py-3 px-4">Vulnerabilidades Relacionadas</th>
                <th className="py-3 px-4">Evidências Técnicas</th>
                <th className="py-3 px-4">Gap Identificado / Plano de Ação</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredMatrix.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                    Nenhum controle localizado para os critérios aplicados.
                  </td>
                </tr>
              ) : (
                filteredMatrix.map(item => {
                  const fullControl = controls.find(c => c.id === item.controlId);
                  return (
                    <tr key={item.controlId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400">{item.controlCode}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {item.framework}
                          </span>
                        </div>
                        <div className="font-semibold text-white max-w-xs">{item.controlTitle}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 space-y-1">
                        {item.linkedFindings.length === 0 ? (
                          <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Nenhum achado
                          </span>
                        ) : (
                          item.linkedFindings.map(f => (
                            <div key={f.id} className="flex items-center gap-1.5 text-[11px]">
                              <span className={`px-1 rounded text-[9px] font-bold ${
                                f.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                                f.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {f.severity}
                              </span>
                              <span className="text-slate-300 font-mono text-[10px]">{f.code}</span>
                            </div>
                          ))
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <FileCheck className="w-3.5 h-3.5 text-sky-400" />
                          <span className="font-semibold text-white">{item.evidenceCount}</span>
                          <span className="text-slate-400 text-[10px]">arquivos</span>
                        </div>
                        {item.hasRecentEvidence ? (
                          <span className="text-[10px] text-emerald-400 font-medium">Recente (&lt; 90d)</span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-medium">Desatualizada</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs space-y-0.5">
                        {item.gapIdentified ? (
                          <>
                            <div className="text-[11px] text-rose-300 font-medium line-clamp-1" title={item.gapDescription}>
                              ⚠️ {item.gapDescription}
                            </div>
                            {item.actionPlan && (
                              <div className="text-[10px] text-slate-400 line-clamp-1" title={item.actionPlan}>
                                🎯 Plano: {item.actionPlan}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400">Controle atendido sem gaps</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {fullControl && (
                          <button
                            onClick={() => handleOpenEditModal(fullControl)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium border border-slate-700 transition-colors inline-flex items-center gap-1"
                            title="Editar Plano de Ação"
                          >
                            <Edit3 className="w-3 h-3 text-amber-400" />
                            Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: EDITAR CONTROLE & PLANO DE AÇÃO */}
      {editingControl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-amber-400 font-bold text-xs">{editingControl.code}</span>
                  <h3 className="text-sm font-bold text-white">{editingControl.title}</h3>
                </div>
                <span className="text-[11px] text-slate-400">{editingControl.framework}</span>
              </div>
              <button onClick={() => setEditingControl(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveControl} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Status de Conformidade</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as ComplianceStatus)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="COMPLIANT">Conforme (Totalmente atendido e evidenciado)</option>
                  <option value="PARTIALLY_COMPLIANT">Parcialmente Conforme (Gaps identificados ou remediação em curso)</option>
                  <option value="NON_COMPLIANT">Não Conforme (Vulnerabilidade ativa sem mitigação)</option>
                  <option value="NOT_APPLICABLE">Não Aplicável ao Ambiente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição do Gap / Desvio</label>
                <textarea
                  value={editGap}
                  onChange={e => setEditGap(e.target.value)}
                  rows={2}
                  placeholder="Descreva o que falta para conformidade total..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Plano de Ação / Mitigação</label>
                <textarea
                  value={editActionPlan}
                  onChange={e => setEditActionPlan(e.target.value)}
                  rows={2}
                  placeholder="Ações corretivas, controles compensatórios e responsáveis..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Data Limite de Resolução</label>
                <input
                  type="date"
                  value={editTargetDate ? editTargetDate.slice(0, 10) : ''}
                  onChange={e => setEditTargetDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingControl(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold"
                >
                  {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
