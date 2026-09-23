import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Server,
  Globe,
  Database,
  Network,
  Cpu,
  Terminal,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sliders
} from 'lucide-react';
import {
  HardeningBaseline,
  HardeningCategory,
  ComplianceEvaluationResult,
  SecurityTarget,
  SecurityFinding
} from '../../types/security';

interface HardeningBaselinesViewProps {
  onOpenFinding?: (findingId: string) => void;
}

export const HardeningBaselinesView: React.FC<HardeningBaselinesViewProps> = ({
  onOpenFinding
}) => {
  const [baselines, setBaselines] = useState<HardeningBaseline[]>([]);
  const [targets, setTargets] = useState<SecurityTarget[]>([]);
  const [evaluations, setEvaluations] = useState<ComplianceEvaluationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [expandedBaselineId, setExpandedBaselineId] = useState<string | null>('base-linux-server');

  // Modal de Execução de Avaliação
  const [evaluatingBaseline, setEvaluatingBaseline] = useState<HardeningBaseline | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<ComplianceEvaluationResult | null>(null);
  const [generatedFindings, setGeneratedFindings] = useState<Array<Partial<SecurityFinding>>>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, tRes, eRes] = await Promise.all([
        fetch('/api/v1/security/baselines').then(r => r.json()),
        fetch('/api/v1/security/targets').then(r => r.json()),
        fetch('/api/v1/security/compliance/evaluations').then(r => r.json())
      ]);

      if (bRes.success) setBaselines(bRes.data);
      if (tRes.success) {
        setTargets(tRes.data);
        if (tRes.data.length > 0) setSelectedTargetId(tRes.data[0].id);
      }
      if (eRes.success) setEvaluations(eRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados de hardening:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingBaseline || !selectedTargetId) return;

    setEvaluating(true);
    setEvaluationResult(null);
    setGeneratedFindings([]);
    try {
      const res = await fetch('/api/v1/security/compliance/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baselineId: evaluatingBaseline.id,
          targetId: selectedTargetId,
          // Envia dados de ativo simulando telemetria de agente já coletada
          assetData: {
            agentStatus: 'online',
            agentVersion: 'v4.2.1',
            operatingSystem: 'Ubuntu 22.04.4 LTS',
            installedSoftwares: [
              { name: 'openssl', version: '1.1.1k', status: 'vulnerable' },
              { name: 'nodejs', version: '18.19.0', status: 'outdated' },
              { name: 'nginx', version: '1.24.0', status: 'healthy' }
            ]
          }
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setEvaluationResult(resJson.data.result);
        setGeneratedFindings(resJson.data.generatedFindings || []);
        loadData();
      } else {
        alert(`Erro: ${resJson.error}`);
      }
    } catch (err: any) {
      alert(`Falha na avaliação: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  const getCategoryIcon = (category: HardeningCategory) => {
    switch (category) {
      case 'OPERATING_SYSTEM': return <Server className="w-4 h-4 text-emerald-400" />;
      case 'NETWORK': return <Network className="w-4 h-4 text-blue-400" />;
      case 'WEB': return <Globe className="w-4 h-4 text-purple-400" />;
      case 'API': return <Sliders className="w-4 h-4 text-amber-400" />;
      case 'DATABASE': return <Database className="w-4 h-4 text-cyan-400" />;
      case 'ENDPOINT': return <Cpu className="w-4 h-4 text-rose-400" />;
      default: return <Shield className="w-4 h-4 text-slate-400" />;
    }
  };

  const filteredBaselines = baselines.filter(b => {
    if (activeCategory !== 'ALL' && b.category !== activeCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 p-5 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/40">
              Hardening & Security Baselines
            </span>
            <span className="text-xs text-slate-400">
              CIS Benchmarks • OWASP ASVS • NIST SP 800-53
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Catálogo de Baselines & Auditoria de Conformidade
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Padrões técnicos de configuração segura para Sistemas Operacionais, Redes, Servidores Web, APIs, Bancos de Dados e Endpoints.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Baselines
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 text-xs">
        {['ALL', 'OPERATING_SYSTEM', 'NETWORK', 'WEB', 'API', 'DATABASE', 'ENDPOINT'].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
              activeCategory === cat
                ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300 shadow-sm'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat === 'ALL' ? 'Todas as Categorias' : cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Baselines Accordion List */}
      <div className="space-y-4">
        {filteredBaselines.map(baseline => {
          const isExpanded = expandedBaselineId === baseline.id;
          return (
            <div
              key={baseline.id}
              className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden transition-all"
            >
              {/* Header Bar */}
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/40">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    {getCategoryIcon(baseline.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{baseline.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {baseline.version}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                        {baseline.policyVersion}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{baseline.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => {
                      setEvaluatingBaseline(baseline);
                      setEvaluationResult(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Avaliar Alvo
                  </button>

                  <button
                    onClick={() => setExpandedBaselineId(isExpanded ? null : baseline.id)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Controls List (Expanded) */}
              {isExpanded && (
                <div className="p-5 space-y-4 bg-slate-950/30">
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/60 pb-2">
                    <span className="font-semibold text-slate-300">
                      Controles de Conformidade Obrigatórios ({baseline.controls.length})
                    </span>
                    <span>Ambiente Alvo: <strong className="text-slate-300">{baseline.targetEnvironment}</strong></span>
                  </div>

                  <div className="space-y-3">
                    {baseline.controls.map(control => (
                      <div
                        key={control.controlId}
                        className="bg-slate-900/90 border border-slate-800/80 p-4 rounded-lg space-y-2.5 text-xs hover:border-slate-700 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                              {control.controlId}
                            </span>
                            <span className="font-bold text-white text-sm">{control.name}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              Validação: {control.validationMethod}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                              control.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                              control.severity === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                              'bg-blue-950 text-blue-300 border border-blue-800'
                            }`}>
                              {control.severity}
                            </span>
                          </div>
                        </div>

                        <p className="text-slate-300 leading-relaxed">{control.description}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2.5 rounded border border-slate-800/50">
                          <div>
                            <span className="text-slate-400 font-medium">Requisito Técnico:</span>
                            <p className="text-emerald-300 font-mono mt-0.5">{control.requirement}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium">Resultado Esperado:</span>
                            <p className="text-slate-300 mt-0.5">{control.expectedResult}</p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] pt-1 text-slate-400">
                          <span><strong>Como Remediar:</strong> {control.remediation}</span>
                          <span className="font-mono text-slate-500 whitespace-nowrap">{control.reference}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: Avaliar Conformidade de Alvo */}
      {evaluatingBaseline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Avaliação de Conformidade</h3>
                  <span className="text-xs text-slate-400">{evaluatingBaseline.name}</span>
                </div>
              </div>
              <button
                onClick={() => setEvaluatingBaseline(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {!evaluationResult ? (
                <form onSubmit={handleRunEvaluation} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Selecione o Ativo / Target para Auditoria:
                    </label>
                    <select
                      value={selectedTargetId}
                      onChange={e => setSelectedTargetId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 text-xs"
                      required
                    >
                      {targets.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.targetValue} ({t.ciName || t.targetType})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1">
                    <strong className="text-white block">Escopo da Verificação:</strong>
                    <p>Serão executados probes direcionados nas portas, cabeçalhos HTTP/TLS e dados de telemetria cadastrados.</p>
                    <p className="text-slate-400">Controles com falha (FAIL) gerarão automaticamente Findings na base de segurança.</p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={evaluating}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {evaluating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Auditorando Controles...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Iniciar Avaliação Técnica
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {/* Result Header */}
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400">Índice Geral de Conformidade:</span>
                      <div className="text-3xl font-bold text-white mt-1 flex items-baseline gap-2">
                        <span className={evaluationResult.overallCompliancePct >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
                          {evaluationResult.overallCompliancePct}%
                        </span>
                        <span className="text-xs text-slate-400 font-normal">
                          ({evaluationResult.passedControls} de {evaluationResult.totalControls} conformes)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div className="text-center px-3 py-1 bg-emerald-950/40 border border-emerald-800/40 rounded">
                        <span className="block font-bold text-emerald-400">{evaluationResult.passedControls}</span>
                        <span className="text-[10px] text-emerald-400/80">PASS</span>
                      </div>
                      <div className="text-center px-3 py-1 bg-rose-950/40 border border-rose-800/40 rounded">
                        <span className="block font-bold text-rose-400">{evaluationResult.failedControls}</span>
                        <span className="text-[10px] text-rose-400/80">FAIL</span>
                      </div>
                      <div className="text-center px-3 py-1 bg-amber-950/40 border border-amber-800/40 rounded">
                        <span className="block font-bold text-amber-400">{evaluationResult.warningControls}</span>
                        <span className="text-[10px] text-amber-400/80">WARN</span>
                      </div>
                    </div>
                  </div>

                  {/* Findings gerados */}
                  {generatedFindings.length > 0 && (
                    <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-lg text-xs space-y-2">
                      <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                        <ShieldAlert className="w-4 h-4" />
                        {generatedFindings.length} Vulnerabilidade(s) / Finding(s) gerados automaticamente:
                      </div>
                      <div className="space-y-1">
                        {generatedFindings.map(f => (
                          <div key={f.id} className="flex items-center justify-between text-slate-300 pl-2">
                            <span>• {f.title} ({f.severity})</span>
                            {f.id && onOpenFinding && (
                              <button
                                onClick={() => {
                                  setEvaluatingBaseline(null);
                                  onOpenFinding(f.id!);
                                }}
                                className="text-rose-400 hover:text-rose-300 underline font-medium text-[11px]"
                              >
                                Ver e Remediar
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lista de Controles Avaliados */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Detalhamento dos Controles</h4>
                    {evaluationResult.controlResults.map(cr => (
                      <div
                        key={cr.controlId}
                        className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {cr.status === 'PASS' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                            {cr.status === 'FAIL' && <XCircle className="w-4 h-4 text-rose-400" />}
                            {cr.status === 'WARNING' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                            <span className="font-bold text-white">{cr.controlName}</span>
                            <span className="font-mono text-[10px] text-slate-400">({cr.controlId})</span>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                            cr.status === 'PASS' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            cr.status === 'FAIL' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                            'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}>
                            {cr.status}
                          </span>
                        </div>

                        <p className="text-slate-400 text-[11px]">{cr.details}</p>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Valor constatado: {cr.actualValue}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setEvaluationResult(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Nova Avaliação
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
