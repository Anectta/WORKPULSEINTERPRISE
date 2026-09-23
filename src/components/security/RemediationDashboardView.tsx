import React, { useState, useEffect } from 'react';
import {
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  User,
  Ticket,
  ExternalLink,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw,
  FileText,
  Lock,
  ArrowUpRight,
  Sparkles,
  Info,
  Layers,
  Activity
} from 'lucide-react';
import {
  SecurityRemediation,
  RemediationStep,
  AcceptedRiskRecord,
  RemediationDashboardMetrics,
  RemediationPriority,
  RemediationStatus,
  FindingStatus,
  SecurityFinding
} from '../../types/security';

interface RemediationDashboardViewProps {
  onOpenFinding: (findingId: string) => void;
  onRequestRetest?: (findingId: string) => void;
}

export const RemediationDashboardView: React.FC<RemediationDashboardViewProps> = ({
  onOpenFinding,
  onRequestRetest
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'plans' | 'accepted_risks' | 'sla_policies'>('plans');
  const [metrics, setMetrics] = useState<RemediationDashboardMetrics | null>(null);
  const [remediations, setRemediations] = useState<SecurityRemediation[]>([]);
  const [acceptedRisks, setAcceptedRisks] = useState<AcceptedRiskRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Modal para expandir passos de uma remediação
  const [selectedRemediation, setSelectedRemediation] = useState<SecurityRemediation | null>(null);
  const [updatingStepId, setUpdatingStepId] = useState<string | null>(null);

  // Modal para cadastrar novo Risco Aceito
  const [isAcceptRiskModalOpen, setIsAcceptRiskModalOpen] = useState(false);
  const [findingsForRisk, setFindingsForRisk] = useState<SecurityFinding[]>([]);
  const [riskFindingId, setRiskFindingId] = useState('');
  const [riskJustification, setRiskJustification] = useState('');
  const [riskBusinessImpact, setRiskBusinessImpact] = useState('');
  const [riskValidUntil, setRiskValidUntil] = useState('');
  const [riskControls, setRiskControls] = useState('');
  const [savingRisk, setSavingRisk] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [mRes, rRes, aRes, fRes] = await Promise.all([
        fetch('/api/v1/security/remediation-metrics').then(r => r.json()),
        fetch('/api/v1/security/remediations').then(r => r.json()),
        fetch('/api/v1/security/accepted-risks').then(r => r.json()),
        fetch('/api/v1/security/findings').then(r => r.json())
      ]);

      if (mRes.success) setMetrics(mRes.data);
      if (rRes.success) setRemediations(rRes.data);
      if (aRes.success) setAcceptedRisks(aRes.data);
      if (fRes.success) setFindingsForRisk(fRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados de remediação:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleToggleStep = async (remediationId: string, step: RemediationStep) => {
    setUpdatingStepId(step.id);
    const newStatus = step.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    try {
      const res = await fetch(`/api/v1/security/remediations/${remediationId}/steps/${step.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setSelectedRemediation(resJson.data);
        setRemediations(prev => prev.map(r => r.id === remediationId ? resJson.data : r));
        loadAll();
      }
    } catch (err: any) {
      alert(`Falha ao atualizar etapa: ${err.message}`);
    } finally {
      setUpdatingStepId(null);
    }
  };

  const handleSaveAcceptedRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riskFindingId || !riskJustification || !riskValidUntil) {
      alert('Por favor, preencha os campos obrigatórios.');
      return;
    }
    setSavingRisk(true);
    try {
      const res = await fetch('/api/v1/security/accepted-risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findingId: riskFindingId,
          justification: riskJustification,
          businessImpactJustification: riskBusinessImpact,
          validUntil: new Date(riskValidUntil).toISOString(),
          compensatoryControls: riskControls.split('\n').filter(c => c.trim().length > 0)
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setIsAcceptRiskModalOpen(false);
        setRiskFindingId('');
        setRiskJustification('');
        setRiskBusinessImpact('');
        setRiskControls('');
        loadAll();
      } else {
        alert(resJson.error || 'Erro ao registrar risco aceito.');
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setSavingRisk(false);
    }
  };

  const filteredRemediations = remediations.filter(r => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && r.priority !== priorityFilter) return false;
    return true;
  });

  const getPriorityBadge = (p: RemediationPriority) => {
    switch (p) {
      case 'CRITICAL':
        return <span className="text-xs px-2 py-0.5 rounded font-bold font-mono bg-rose-950/60 text-rose-300 border border-rose-800/40">CRITICAL</span>;
      case 'HIGH':
        return <span className="text-xs px-2 py-0.5 rounded font-bold font-mono bg-amber-950/60 text-amber-300 border border-amber-800/40">HIGH</span>;
      case 'MEDIUM':
        return <span className="text-xs px-2 py-0.5 rounded font-bold font-mono bg-blue-950/60 text-blue-300 border border-blue-800/40">MEDIUM</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded font-bold font-mono bg-slate-800 text-slate-300 border border-slate-700">LOW</span>;
    }
  };

  const getStatusBadge = (s: RemediationStatus) => {
    switch (s) {
      case 'COMPLETED':
      case 'VERIFIED':
        return <span className="text-xs px-2 py-0.5 rounded font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Corrigido</span>;
      case 'WAITING_RETEST':
        return <span className="text-xs px-2 py-0.5 rounded font-bold bg-purple-950/60 text-purple-300 border border-purple-800/40 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Aguardando Reteste</span>;
      case 'IN_PROGRESS':
        return <span className="text-xs px-2 py-0.5 rounded font-bold bg-amber-950/60 text-amber-300 border border-amber-800/40 flex items-center gap-1"><Wrench className="w-3 h-3" /> Em Tratamento</span>;
      case 'ACCEPTED_RISK':
        return <span className="text-xs px-2 py-0.5 rounded font-bold bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Risco Aceito</span>;
      case 'BLOCKED':
        return <span className="text-xs px-2 py-0.5 rounded font-bold bg-rose-950/60 text-rose-300 border border-rose-800/40 flex items-center gap-1"><XCircle className="w-3 h-3" /> Bloqueado</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300 border border-slate-700">{s}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 bg-rose-950/30 px-2 py-0.5 rounded border border-rose-800/40">
              Etapa 6: Ciclo Completo de Remediação
            </span>
            <span className="text-xs text-slate-400">
              SLA Governance & Hardening Verification
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-rose-500" />
            Remediation & Hardening Control Plane
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Orquestração do ciclo Finding → Risk → Remediation → Hardening → Retest → Evidence → Risk Recalculation → Closure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAll}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          <button
            onClick={() => setIsAcceptRiskModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            Registrar Risco Aceito
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Em Tratamento</span>
            <Wrench className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {metrics?.inRemediation ?? 0}
          </div>
          <span className="text-[10px] text-amber-400/80">Com tickets ativos</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Aguardando Reteste</span>
            <RefreshCw className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 mt-1">
            {metrics?.waitingRetest ?? 0}
          </div>
          <span className="text-[10px] text-slate-400">Correção pendente de prova</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Taxa de Resolução</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {metrics?.fixRatePct ?? 0}%
          </div>
          <span className="text-[10px] text-emerald-400/80">{metrics?.fixedFindings ?? 0} falhas fechadas</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">MTTR Médio</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {metrics?.meanTimeToRemediateDays ?? 0}d
          </div>
          <span className="text-[10px] text-slate-400">Tempo médio de correção</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">SLA Vencido</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            {metrics?.overdueRemediations ?? 0}
          </div>
          <span className="text-[10px] text-rose-400/80">Atrasos de resolução</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Riscos Aceitos</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            {metrics?.acceptedRisksCount ?? 0}
          </div>
          <span className="text-[10px] text-slate-400">Visíveis sem expurgo</span>
        </div>
      </div>

      {/* Subtabs Switcher */}
      <div className="flex border-b border-slate-800 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveSubTab('plans')}
          className={`pb-3 transition-colors relative ${
            activeSubTab === 'plans'
              ? 'text-rose-400 font-semibold border-b-2 border-rose-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Planos de Remediação & Tarefas ({remediations.length})
        </button>

        <button
          onClick={() => setActiveSubTab('accepted_risks')}
          className={`pb-3 transition-colors relative ${
            activeSubTab === 'accepted_risks'
              ? 'text-indigo-400 font-semibold border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Riscos Aceitos & Exceções ({acceptedRisks.length})
        </button>

        <button
          onClick={() => setActiveSubTab('sla_policies')}
          className={`pb-3 transition-colors relative ${
            activeSubTab === 'sla_policies'
              ? 'text-rose-400 font-semibold border-b-2 border-rose-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Governança de SLA & Escalation
        </button>
      </div>

      {/* TAB 1: PLANOS DE REMEDIAÇÃO */}
      {activeSubTab === 'plans' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filtros:</span>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value="ALL">Todos os Status</option>
                <option value="IN_PROGRESS">Em Tratamento</option>
                <option value="WAITING_RETEST">Aguardando Reteste</option>
                <option value="COMPLETED">Corrigidos</option>
                <option value="ACCEPTED_RISK">Risco Aceito</option>
              </select>

              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value="ALL">Todas as Prioridades</option>
                <option value="CRITICAL">Crítica</option>
                <option value="HIGH">Alta</option>
                <option value="MEDIUM">Média</option>
                <option value="LOW">Baixa</option>
              </select>
            </div>

            <span className="text-xs text-slate-400">
              Exibindo {filteredRemediations.length} de {remediations.length} planos
            </span>
          </div>

          {/* Cards List */}
          <div className="space-y-3">
            {filteredRemediations.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/40 border border-slate-800/60 rounded-xl text-slate-400">
                <ShieldCheck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-medium">Nenhum plano de remediação encontrado para os filtros selecionados.</p>
                <p className="text-xs text-slate-500 mt-1">Gere planos a partir de vulnerabilidades identificadas na aba Findings.</p>
              </div>
            ) : (
              filteredRemediations.map(rem => {
                const completedSteps = rem.steps.filter(s => s.status === 'COMPLETED').length;
                const totalSteps = rem.steps.length;
                const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
                const isOverdue = rem.slaBreached;

                return (
                  <div
                    key={rem.id}
                    className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors p-5 rounded-xl space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {getPriorityBadge(rem.priority)}
                        <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                          {rem.findingCode}
                        </span>
                        {rem.ticketCode && (
                          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40 flex items-center gap-1">
                            <Ticket className="w-3 h-3" />
                            {rem.ticketCode}
                          </span>
                        )}
                        {getStatusBadge(rem.status)}
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          Prazo SLA: {new Date(rem.dueDate).toLocaleDateString('pt-BR')} ({rem.slaHours}h)
                          {isOverdue && <span className="text-[10px] bg-rose-950 px-1.5 py-0.2 rounded border border-rose-800">ATRASADO</span>}
                        </span>

                        <button
                          onClick={() => setSelectedRemediation(rem)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition-colors"
                        >
                          Ver Etapas ({completedSteps}/{totalSteps})
                        </button>

                        <button
                          onClick={() => onOpenFinding(rem.findingId)}
                          className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-800/40 rounded text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          Ver Finding <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white">{rem.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {rem.recommendation}
                      </p>
                    </div>

                    {/* Justificativa de prioridade */}
                    {rem.priorityJustification && (
                      <div className="text-[11px] bg-slate-950/60 p-2 rounded border border-slate-800/60 text-slate-300 flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span><strong className="text-slate-200">Justificativa de Prioridade:</strong> {rem.priorityJustification}</span>
                      </div>
                    )}

                    {/* Progress Bar and Responsible */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-300 font-medium">{rem.owner.userName}</span>
                        <span className="text-slate-500">({rem.owner.userEmail})</span>
                        {rem.ciName && (
                          <span className="text-slate-400 ml-2">
                            • Ativo CI: <strong className="text-slate-300">{rem.ciName}</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-48">
                        <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              progressPct === 100 ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-300">{progressPct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RISCOS ACEITOS */}
      {activeSubTab === 'accepted_risks' && (
        <div className="space-y-4">
          <div className="bg-indigo-950/20 border border-indigo-900/40 p-4 rounded-xl text-xs text-indigo-300 flex items-start gap-3">
            <Lock className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block text-sm">Governança de Risco Aceito Formal (ACCEPTED_RISK)</strong>
              Vulnerabilidades com justificativa técnica ou de negócio aceitas pela liderança de segurança corporativa permanecem ativas na base de auditoria para controle de validade e renovação periódica. Nenhuma vulnerabilidade é expurgada sem validação.
            </div>
          </div>

          <div className="space-y-3">
            {acceptedRisks.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/40 border border-slate-800/60 rounded-xl text-slate-400">
                <ShieldCheck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-medium">Nenhum risco aceito registrado formalmente no momento.</p>
              </div>
            ) : (
              acceptedRisks.map(acc => (
                <div
                  key={acc.id}
                  className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-800/40">
                        {acc.findingCode}
                      </span>
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Aprovado por CISO
                      </span>
                      <span className="text-xs text-slate-400">
                        Válido até: <strong className="text-slate-200">{new Date(acc.validUntil).toLocaleDateString('pt-BR')}</strong>
                      </span>
                    </div>

                    <button
                      onClick={() => onOpenFinding(acc.findingId)}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
                    >
                      Ver Detalhes do Finding <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium block mb-1">Justificativa Técnica:</span>
                      <p className="text-slate-200 bg-slate-950/60 p-2.5 rounded border border-slate-800/60 leading-relaxed">
                        {acc.justification}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block mb-1">Impacto de Negócio / Impedimento:</span>
                      <p className="text-slate-200 bg-slate-950/60 p-2.5 rounded border border-slate-800/60 leading-relaxed">
                        {acc.businessImpactJustification}
                      </p>
                    </div>
                  </div>

                  {acc.compensatoryControls && acc.compensatoryControls.length > 0 && (
                    <div className="text-xs pt-1">
                      <span className="text-slate-400 font-medium block mb-1">Controles Compensatórios Estabelecidos:</span>
                      <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                        {acc.compensatoryControls.map((ctrl, idx) => (
                          <li key={idx}>{ctrl}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <span>
                      Solicitado por: <strong className="text-slate-300">{acc.responsible.userName}</strong> ({acc.responsible.role})
                    </span>
                    <span>
                      Aprovador: <strong className="text-indigo-300">{acc.approvedBy.userName}</strong> ({acc.approvedBy.role}) em {new Date(acc.approvedBy.approvedAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SLA POLICIES */}
      {activeSubTab === 'sla_policies' && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Matriz de Resolução de SLAs por Severidade</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Padrões regulatórios baseados em NIST SP 800-40 e ISO 27001 para contenção de vulnerabilidades.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] font-mono tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Severidade</th>
                    <th className="py-2.5 px-3">Tempo Máximo de Resolução (SLA)</th>
                    <th className="py-2.5 px-3">Alerta Prévio (Warning)</th>
                    <th className="py-2.5 px-3">Papel de Escalação Imediata</th>
                    <th className="py-2.5 px-3">Ação Compulsória</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-bold text-rose-400">CRITICAL</td>
                    <td className="py-3 px-3 font-mono font-bold">24 Horas (1 dia)</td>
                    <td className="py-3 px-3">Após 18h (75%)</td>
                    <td className="py-3 px-3">CISO / SOC Lead</td>
                    <td className="py-3 px-3">Isolamento perimetral ou patch emergencial de contenção</td>
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-bold text-amber-400">HIGH</td>
                    <td className="py-3 px-3 font-mono font-bold">72 Horas (3 dias)</td>
                    <td className="py-3 px-3">Após 54h (75%)</td>
                    <td className="py-3 px-3">Security Officer / DevOps Lead</td>
                    <td className="py-3 px-3">Plano de remediação com homologação em staging</td>
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-bold text-blue-400">MEDIUM</td>
                    <td className="py-3 px-3 font-mono font-bold">168 Horas (7 dias)</td>
                    <td className="py-3 px-3">Após 134h (80%)</td>
                    <td className="py-3 px-3">SecOps Analyst</td>
                    <td className="py-3 px-3">Inclusão na sprint de sustentação quinzenal</td>
                  </tr>
                  <tr className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-bold text-slate-300">LOW</td>
                    <td className="py-3 px-3 font-mono font-bold">720 Horas (30 dias)</td>
                    <td className="py-3 px-3">Após 612h (85%)</td>
                    <td className="py-3 px-3">IT Operations</td>
                    <td className="py-3 px-3">Ciclo mensal de atualização de pacotes e hardening</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Passos Estruturados da Remediação */}
      {selectedRemediation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-rose-500" />
                <div>
                  <h3 className="text-sm font-bold text-white">Etapas do Plano de Remediação</h3>
                  <span className="text-xs text-slate-400">{selectedRemediation.findingCode} • {selectedRemediation.title}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedRemediation(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded border border-slate-800">
                <strong className="text-white block mb-1">Recomendação Técnica:</strong>
                {selectedRemediation.recommendation}
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Checklist Operacional</h4>
                {selectedRemediation.steps.map((step, idx) => {
                  const isDone = step.status === 'COMPLETED';
                  const isUpdating = updatingStepId === step.id;

                  return (
                    <div
                      key={step.id}
                      className={`p-3.5 rounded-lg border transition-all text-xs flex items-start gap-3 ${
                        isDone
                          ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200'
                          : 'bg-slate-800/60 border-slate-700 text-slate-200'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleStep(selectedRemediation.id, step)}
                        disabled={isUpdating}
                        className={`mt-0.5 p-1 rounded transition-colors ${
                          isDone
                            ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold ${isDone ? 'line-through text-emerald-300/80' : 'text-white'}`}>
                            {idx + 1}. {step.description}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            Prazo: {new Date(step.dueDate).toLocaleDateString('pt-BR')}
                          </span>
                        </div>

                        {step.notes && (
                          <p className="text-[11px] text-slate-400 mt-1">{step.notes}</p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                          <span>Responsável: <strong className="text-slate-300">{step.responsible}</strong></span>
                          <span>Status: <strong className={isDone ? 'text-emerald-400' : 'text-amber-400'}>{step.status}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
              <button
                onClick={() => setSelectedRemediation(null)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Concluir Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cadastrar Risco Aceito */}
      {isAcceptRiskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Registrar Risco Aceito Formalmente</h3>
              </div>
              <button
                onClick={() => setIsAcceptRiskModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSaveAcceptedRisk} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Selecione a Vulnerabilidade / Finding:</label>
                <select
                  value={riskFindingId}
                  onChange={e => setRiskFindingId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value="">Selecione...</option>
                  {findingsForRisk
                    .filter(f => f.status !== 'RESOLVED' && f.status !== 'VERIFIED')
                    .map(f => (
                      <option key={f.id} value={f.id}>
                        {f.code} - {f.title} ({f.severity})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Justificativa Técnica do Risco:</label>
                <textarea
                  value={riskJustification}
                  onChange={e => setRiskJustification(e.target.value)}
                  placeholder="Explique o motivo técnico que impede a correção imediata (ex: dependência legada, migração em andamento)..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 h-20 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Impacto de Negócio:</label>
                <textarea
                  value={riskBusinessImpact}
                  onChange={e => setRiskBusinessImpact(e.target.value)}
                  placeholder="Qual o impacto operacional caso o sistema fosse desligado ou forçado a aplicar a correção?"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 h-16 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Válido Até (Data Limite de Revisão Compulsória):</label>
                <input
                  type="date"
                  value={riskValidUntil}
                  onChange={e => setRiskValidUntil(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Controles Compensatórios (1 por linha):</label>
                <textarea
                  value={riskControls}
                  onChange={e => setRiskControls(e.target.value)}
                  placeholder="Ex: WAF ativo com regras específicas&#10;Isolamento de segmento de rede&#10;Monitoramento reforçado no SIEM"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 h-20 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAcceptRiskModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingRisk}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {savingRisk ? 'Registrando...' : 'Confirmar Risco Aceito'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
