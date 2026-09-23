import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  FileText, 
  Terminal, 
  RefreshCw, 
  Ticket, 
  AlertTriangle,
  Lock,
  Tag,
  Share2,
  Wrench,
  ShieldCheck,
  Calendar,
  User,
  ArrowRight,
  Sparkles,
  Info,
  Sliders,
  Play
} from 'lucide-react';
import { 
  SecurityFinding, 
  SecurityEvidence, 
  SecurityRetest, 
  FindingStatus,
  SecurityRemediation,
  AcceptedRiskRecord,
  RetestComparison
} from '../../types/security';

interface FindingDetailModalProps {
  findingId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const FindingDetailModal: React.FC<FindingDetailModalProps> = ({
  findingId,
  onClose,
  onUpdated
}) => {
  const [data, setData] = useState<{
    finding: SecurityFinding;
    evidence: SecurityEvidence[];
    retests: SecurityRetest[];
    remediation?: SecurityRemediation | null;
    acceptedRisk?: AcceptedRiskRecord | null;
    retestComparisons?: RetestComparison[];
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newStatus, setNewStatus] = useState<FindingStatus>('IN_REMEDIATION');
  const [justification, setJustification] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Ticket & Remediation Creation Form
  const [showCreateTicketForm, setShowCreateTicketForm] = useState(false);
  const [ticketOwnerName, setTicketOwnerName] = useState('Equipe DevOps & Infra');
  const [ticketOwnerEmail, setTicketOwnerEmail] = useState('devops@empresaabc.com.br');
  const [ticketDueDate, setTicketDueDate] = useState('');
  const [ticketCreating, setTicketCreating] = useState(false);

  // Retest Controls
  const [showRetestConfig, setShowRetestConfig] = useState(false);
  const [retestNotes, setRetestNotes] = useState('Validação técnica pós-aplicação de patch e ajuste de hardening.');
  const [simulatedOutcome, setSimulatedOutcome] = useState<'FIXED' | 'STILL_VULNERABLE' | 'PARTIALLY_FIXED'>('FIXED');
  const [retestRunning, setRetestRunning] = useState(false);
  const [latestComparison, setLatestComparison] = useState<RetestComparison | null>(null);
  const [retestSuccessMessage, setRetestSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!findingId) return;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/security/findings/${findingId}`);
        const resJson = await res.json();
        if (resJson.success) {
          setData(resJson.data);
          setNewStatus(resJson.data.finding.status);
          if (resJson.data.retestComparisons && resJson.data.retestComparisons.length > 0) {
            setLatestComparison(resJson.data.retestComparisons[0]);
          }
        } else {
          setError(resJson.error || 'Erro ao carregar detalhes.');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [findingId]);

  if (!findingId) return null;

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/v1/security/findings/${data.finding.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, justification })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setData(prev => prev ? { ...prev, finding: resJson.data } : null);
        setJustification('');
        onUpdated();
      } else {
        alert(resJson.error || 'Não foi possível alterar status.');
      }
    } catch (err: any) {
      alert(`Falha ao alterar status: ${err.message}`);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleCreateTicketAndPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setTicketCreating(true);
    try {
      const res = await fetch(`/api/v1/security/findings/${data.finding.id}/create-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: ticketOwnerName,
          ownerEmail: ticketOwnerEmail,
          dueDate: ticketDueDate ? new Date(ticketDueDate).toISOString() : undefined
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setData(prev => prev ? {
          ...prev,
          finding: resJson.data.finding,
          remediation: resJson.data.remediation
        } : null);
        setShowCreateTicketForm(false);
        onUpdated();
      } else {
        alert(resJson.error || 'Erro ao criar chamado e plano.');
      }
    } catch (err: any) {
      alert(`Erro ao criar ticket: ${err.message}`);
    } finally {
      setTicketCreating(false);
    }
  };

  const handleRunRetest = async () => {
    if (!data) return;
    setRetestRunning(true);
    setRetestSuccessMessage(null);
    try {
      const res = await fetch(`/api/v1/security/findings/${data.finding.id}/retest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technicalNotes: retestNotes,
          simulatedOutcome
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setData(prev => prev ? {
          ...prev,
          finding: resJson.data.finding,
          retests: [resJson.data.retest, ...(prev.retests || [])],
          evidence: [resJson.data.newEvidence, ...(prev.evidence || [])],
          retestComparisons: [resJson.data.comparison, ...(prev.retestComparisons || [])]
        } : null);
        setLatestComparison(resJson.data.comparison);
        setRetestSuccessMessage(`Reteste concluído: ${resJson.data.comparison.summary}`);
        setShowRetestConfig(false);
        onUpdated();
      } else {
        alert(`Falha no reteste: ${resJson.error}`);
      }
    } catch (err: any) {
      alert(`Erro no reteste: ${err.message}`);
    } finally {
      setRetestRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">
                  {data?.finding.code || 'SEC-FND-DETALHES'}
                </span>
                {data?.finding.cveId && (
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                    {data.finding.cveId}
                  </span>
                )}
                {data?.finding.remediationPriority && (
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                    Prioridade Calculada: {data.finding.remediationPriority}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                {data?.finding.title || 'Carregando detalhes da vulnerabilidade...'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <div className="w-8 h-8 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
              <p className="text-xs">Carregando ciclo de remediação e evidências...</p>
            </div>
          ) : error || !data ? (
            <div className="p-4 bg-rose-950/30 border border-rose-800/40 rounded-lg text-rose-300 text-xs">
              {error || 'Não foi possível carregar os dados desta vulnerabilidade.'}
            </div>
          ) : (
            <>
              {retestSuccessMessage && (
                <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/50 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  {retestSuccessMessage}
                </div>
              )}

              {/* CARD: Banner de Risco Aceito Formal se existir */}
              {(data.finding.status === 'ACCEPTED_RISK' || data.acceptedRisk) && (
                <div className="p-4 bg-indigo-950/30 border border-indigo-900/60 rounded-xl space-y-2 text-xs text-indigo-300">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-indigo-400" />
                      Status Formal: Risco Aceito (ACCEPTED_RISK)
                    </span>
                    <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                      Válido até: {data.acceptedRisk ? new Date(data.acceptedRisk.validUntil).toLocaleDateString('pt-BR') : 'Revisão Trimestral'}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {data.acceptedRisk?.justification || data.finding.riskAcceptanceJustification || 'Risco aceito com aprovação formal do CISO Corporativo.'}
                  </p>
                  {data.acceptedRisk?.compensatoryControls && data.acceptedRisk.compensatoryControls.length > 0 && (
                    <div className="pt-1">
                      <strong className="text-white block text-[11px] mb-1">Controles Compensatórios:</strong>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                        {data.acceptedRisk.compensatoryControls.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Grid de Metadados e Severidade */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Severidade & CVSS</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                    data.finding.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                    data.finding.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
                    data.finding.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                    'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  }`}>
                    {data.finding.severity} (CVSS {data.finding.cvssScore})
                  </span>
                </div>

                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Status no Ciclo</span>
                  <span className="text-xs font-bold text-slate-200">
                    {data.finding.status === 'IN_REMEDIATION' ? 'Em Remediação (Plano Ativo)' :
                     data.finding.status === 'WAITING_RETEST' ? 'Aguardando Reteste' :
                     data.finding.status === 'RESOLVED' ? 'Resolvida e Fechada' :
                     data.finding.status === 'ACCEPTED_RISK' ? 'Risco Aceito Formal' :
                     data.finding.status === 'NEW' ? 'Nova / Aberta' : data.finding.status}
                  </span>
                </div>

                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Ativo / CI CMDB</span>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {data.finding.linkedCiId || 'Global / Não associado'}
                  </span>
                </div>

                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Chamado ITSM / Remediação</span>
                  {data.finding.ticketLinkId ? (
                    <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                      <Ticket className="w-3.5 h-3.5" />
                      {data.finding.ticketLinkId}
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowCreateTicketForm(true)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-bold underline"
                    >
                      + Criar Plano & Chamado
                    </button>
                  )}
                </div>
              </div>

              {/* CARD: Plano de Remediação Vinculado */}
              {data.remediation && (
                <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">Plano de Remediação Ativo</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        Status: {data.remediation.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      SLA: <strong className="text-slate-200">{new Date(data.remediation.dueDate).toLocaleDateString('pt-BR')}</strong>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-300 block">Etapas do Plano:</span>
                    {data.remediation.steps.map((s, idx) => (
                      <div key={s.id} className="flex items-center justify-between text-xs bg-slate-950/40 p-2 rounded border border-slate-800/60">
                        <span className={s.status === 'COMPLETED' ? 'line-through text-emerald-400/80' : 'text-slate-300'}>
                          {idx + 1}. {s.description}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          s.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {s.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FORM: Criar Chamado & Plano de Remediação */}
              {showCreateTicketForm && (
                <form onSubmit={handleCreateTicketAndPlan} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 text-xs">
                  <h4 className="font-bold text-white flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-rose-400" />
                    Gerar Ticket ITSM e Plano Estruturado de Remediação
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Responsável / Squad:</label>
                      <input
                        type="text"
                        value={ticketOwnerName}
                        onChange={e => setTicketOwnerName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">E-mail do Responsável:</label>
                      <input
                        type="email"
                        value={ticketOwnerEmail}
                        onChange={e => setTicketOwnerEmail(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Data Limite de Resolução (SLA Customizado):</label>
                    <input
                      type="date"
                      value={ticketDueDate}
                      onChange={e => setTicketDueDate(e.target.value)}
                      className="w-full sm:w-60 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateTicketForm(false)}
                      className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={ticketCreating}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold disabled:opacity-50"
                    >
                      {ticketCreating ? 'Gerando Plano...' : 'Confirmar e Abrir Ticket'}
                    </button>
                  </div>
                </form>
              )}

              {/* Descrição & Impacto */}
              <div className="space-y-4 text-xs">
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Descrição Técnica</h3>
                  <p className="text-slate-300 leading-relaxed bg-slate-800/30 p-3.5 rounded-lg border border-slate-800">
                    {data.finding.description}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1.5">Impacto no Negócio</h3>
                  <p className="text-slate-300 leading-relaxed bg-rose-950/10 p-3.5 rounded-lg border border-rose-900/30">
                    {data.finding.impact}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5">Recomendação de Hardening</h3>
                  <p className="text-slate-300 leading-relaxed bg-emerald-950/10 p-3.5 rounded-lg border border-emerald-900/30">
                    {data.finding.recommendation}
                  </p>
                </div>
              </div>

              {/* CARD: Comparação Antes x Depois do Reteste */}
              {latestComparison && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-purple-400" />
                      Validação Técnica: Comparação Antes × Depois
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      latestComparison.retestResult === 'FIXED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      latestComparison.retestResult === 'STILL_VULNERABLE' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                      'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {latestComparison.retestResult}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Antes */}
                    <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-1.5">
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Estado Anterior (Antes da Correção)</span>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Status: <strong className="text-slate-200">{latestComparison.beforeState.status}</strong></span>
                        <span>Score: <strong className="text-rose-400">{latestComparison.beforeState.riskScore.toFixed(1)}</strong></span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded overflow-hidden text-ellipsis">
                        {latestComparison.beforeState.evidenceSummary}
                      </div>
                    </div>

                    {/* Depois */}
                    <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-1.5">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Estado Atual (Pós-Reteste)</span>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Status: <strong className="text-slate-200">{latestComparison.afterState.status}</strong></span>
                        <span>Score: <strong className="text-emerald-400">{latestComparison.afterState.riskScore.toFixed(1)}</strong></span>
                        <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-1.5 rounded">
                          Δ {latestComparison.riskScoreDelta.toFixed(1)}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded overflow-hidden text-ellipsis">
                        {latestComparison.afterState.evidenceSummary}
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    {latestComparison.summary}
                  </p>
                </div>
              )}

              {/* Evidências Coletadas com SHA-256 */}
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-400" />
                  Evidências Técnicas com Hash de Integridade
                </h3>
                {data.evidence.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Nenhum payload de evidência técnica anexado.</p>
                ) : (
                  <div className="space-y-3">
                    {data.evidence.map((evi) => (
                      <div key={evi.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-bold text-slate-200">{evi.title}</span>
                          <span className="font-mono text-[10px] text-slate-500">SHA-256: {evi.payloadSha256.substring(0, 16)}...</span>
                        </div>
                        <pre className="text-[11px] font-mono text-slate-300 bg-slate-900 p-3 rounded overflow-x-auto whitespace-pre-wrap max-h-48 border border-slate-800/60">
                          {evi.rawPayload}
                        </pre>
                        <span className="text-[10px] text-slate-500 block">
                          Coletado por {evi.collectedBy} em {new Date(evi.collectedAt).toLocaleString('pt-BR')} (Sanitizado)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ações de Governança & Reteste */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                {/* Alteração de Status */}
                <form onSubmit={handleUpdateStatus} className="bg-slate-800/40 border border-slate-800 rounded-lg p-4 space-y-3">
                  <h4 className="text-xs font-bold text-white tracking-tight">Alterar Status & Transição de Ciclo</h4>
                  <div className="space-y-2">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as FindingStatus)}
                      className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2 focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="OPEN">Aberta (Não iniciada)</option>
                      <option value="TRIAGED">Triada (Aguardando Atribuição)</option>
                      <option value="IN_REMEDIATION">Em Remediação (Plano Ativo)</option>
                      <option value="FIXED_PENDING_RETEST">Correção Aplicada (Aguardando Reteste)</option>
                      <option value="WAITING_RETEST">Aguardando Reteste de Validação</option>
                      <option value="ACCEPTED_RISK">Risco Aceito Formal (ACCEPTED_RISK)</option>
                      <option value="FALSE_POSITIVE">Falso Positivo Justificado</option>
                      <option value="RESOLVED">Resolvida (Verificada)</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Justificativa da transição (obrigatória)..."
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-2 focus:ring-1 focus:ring-rose-500"
                      required
                    />

                    <button
                      type="submit"
                      disabled={statusUpdating}
                      className="w-full py-1.5 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                    >
                      {statusUpdating ? 'Validando Regras...' : 'Salvar Transição de Status'}
                    </button>
                  </div>
                </form>

                {/* Reteste Controlado */}
                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white tracking-tight">Reteste Técnico de Segurança</h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Executa reteste pontual contra o alvo, recalcula o score de risco e gera comparação Antes × Depois.
                    </p>
                  </div>

                  {showRetestConfig ? (
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="block text-slate-400 text-[11px]">Condição do Alvo no Reteste:</label>
                        <select
                          value={simulatedOutcome}
                          onChange={e => setSimulatedOutcome(e.target.value as any)}
                          className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white"
                        >
                          <option value="FIXED">Corrigido (Patch aplicado com sucesso)</option>
                          <option value="STILL_VULNERABLE">Ainda Vulnerável (Falha reaberta)</option>
                          <option value="PARTIALLY_FIXED">Parcialmente Corrigido</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[11px]">Notas do Operador:</label>
                        <input
                          type="text"
                          value={retestNotes}
                          onChange={e => setRetestNotes(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowRetestConfig(false)}
                          className="flex-1 py-1 bg-slate-800 text-slate-300 rounded text-xs"
                        >
                          Voltar
                        </button>
                        <button
                          type="button"
                          onClick={handleRunRetest}
                          disabled={retestRunning}
                          className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                        >
                          {retestRunning ? 'Executando...' : 'Iniciar Reteste'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowRetestConfig(true)}
                      className="w-full py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Configurar & Executar Reteste
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
