import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Share2,
  Trash2,
  Eye,
  Plus,
  Printer,
  Calendar,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  Copy,
  ExternalLink,
  ChevronRight,
  Send,
  X,
  FileSpreadsheet,
  FileCode,
  Sparkles
} from 'lucide-react';
import {
  SecurityReport,
  SecurityReportType,
  ConfidentialityClassification,
  ReportShareToken,
  ScheduledReport
} from '../../types/security';

export const SecurityReportsView: React.FC = () => {
  const [reports, setReports] = useState<SecurityReport[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [activeTab, setActiveTab] = useState<'reports' | 'generator' | 'scheduled' | 'sharing'>('reports');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal de Visualização de Relatório
  const [selectedReport, setSelectedReport] = useState<SecurityReport | null>(null);

  // Modal de Compartilhamento Seguro
  const [sharingReport, setSharingReport] = useState<SecurityReport | null>(null);
  const [shareRecipientName, setShareRecipientName] = useState('');
  const [shareRecipientEmail, setShareRecipientEmail] = useState('');
  const [shareExpiresInDays, setShareExpiresInDays] = useState(7);
  const [generatedShareToken, setGeneratedShareToken] = useState<ReportShareToken | null>(null);

  // Formulário do Gerador
  const [genType, setGenType] = useState<SecurityReportType>('PENTEST');
  const [genTitle, setGenTitle] = useState('');
  const [genConfidentiality, setGenConfidentiality] = useState<ConfidentialityClassification>('CONFIDENTIAL');
  const [genGenerating, setGenGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Formulário de Agendamento
  const [schTitle, setSchTitle] = useState('');
  const [schType, setSchType] = useState<SecurityReportType>('EXECUTIVE');
  const [schFreq, setSchFreq] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [schRecipients, setSchRecipients] = useState('');
  const [schFormat, setSchFormat] = useState<'PDF' | 'CSV' | 'JSON'>('PDF');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([
        fetch('/api/v1/security/reports').then(r => r.json()),
        fetch('/api/v1/security/scheduled-reports').then(r => r.json())
      ]);
      if (rRes.success) setReports(rRes.data);
      if (sRes.success) setScheduledReports(sRes.data);
    } catch (err) {
      console.error('Erro ao carregar relatórios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenGenerating(true);
    try {
      let endpoint = '/api/v1/security/reports/custom';
      let payload: any = {
        type: genType,
        title: genTitle || `Relatório de Segurança • ${genType}`,
        confidentialityLevel: genConfidentiality
      };

      if (genType === 'PENTEST') {
        endpoint = '/api/v1/security/reports/pentest';
        payload = {
          projectId: 'pnt-proj-01',
          confidentiality: genConfidentiality
        };
      } else if (genType === 'EXECUTIVE') {
        endpoint = '/api/v1/security/reports/executive';
        payload = {
          periodStart: new Date(Date.now() - 30 * 86400000).toISOString(),
          periodEnd: new Date().toISOString()
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        showToast('Relatório gerado com sucesso!');
        loadData();
        setActiveTab('reports');
        setSelectedReport(json.data);
      }
    } catch (err) {
      console.error('Falha ao gerar relatório:', err);
    } finally {
      setGenGenerating(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este relatório? Esta ação é registrada na trilha de auditoria.')) return;
    try {
      const res = await fetch(`/api/v1/security/reports/${reportId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Relatório excluído com sucesso.');
        loadData();
        if (selectedReport?.id === reportId) setSelectedReport(null);
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const handleExport = (reportId: string, format: 'JSON' | 'CSV' | 'HTML') => {
    window.open(`/api/v1/security/reports/${reportId}/export?format=${format}`, '_blank');
  };

  const handleCreateShareToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharingReport) return;
    try {
      const res = await fetch(`/api/v1/security/reports/${sharingReport.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: shareRecipientName,
          recipientEmail: shareRecipientEmail,
          expiresInDays: shareExpiresInDays,
          permissions: ['VIEW', 'DOWNLOAD']
        })
      });
      const json = await res.json();
      if (json.success) {
        setGeneratedShareToken(json.data);
        showToast('Link seguro gerado com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao gerar token de compartilhamento:', err);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const recipientsList = schRecipients.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch('/api/v1/security/scheduled-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: schTitle || `Agendamento ${schType}`,
          type: schType,
          frequency: schFreq,
          recipients: recipientsList,
          format: schFormat
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast('Agendamento criado com sucesso!');
        setSchTitle('');
        setSchRecipients('');
        loadData();
      }
    } catch (err) {
      console.error('Erro ao criar agendamento:', err);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/security/scheduled-reports/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Agendamento removido.');
        loadData();
      }
    } catch (err) {
      console.error('Erro ao remover agendamento:', err);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesType = typeFilter === 'ALL' || r.type === typeFilter;
    const matchesSearch = searchTerm === '' ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.generatedBy.userName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getConfBadge = (level: ConfidentialityClassification) => {
    switch (level) {
      case 'RESTRICTED':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'CONFIDENTIAL':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'INTERNAL':
        return 'bg-sky-500/20 text-sky-400 border border-sky-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider">
            <FileText className="w-4 h-4" />
            Central de Documentação & Relatórios
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Relatórios Oficiais de Segurança Cibernética</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Emissão de relatórios técnicos de pentest (8 seções), sumários executivos, auditoria de compliance e exportação nos formatos JSON, CSV e PDF.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-tab-rep-list"
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'reports' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Relatórios Emitidos ({reports.length})
          </button>

          <button
            id="btn-tab-rep-gen"
            onClick={() => setActiveTab('generator')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'generator' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Gerar Novo Relatório
          </button>

          <button
            id="btn-tab-rep-sch"
            onClick={() => setActiveTab('scheduled')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'scheduled' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Agendamentos ({scheduledReports.length})
          </button>
        </div>
      </div>

      {/* ABA 1: LISTAGEM DE RELATÓRIOS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Barra de Busca e Filtros */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por título, ID ou autor..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                <Filter className="w-3.5 h-3.5" /> Tipo:
              </span>
              {['ALL', 'PENTEST', 'EXECUTIVE', 'VULNERABILITY', 'COMPLIANCE', 'REMEDIATION'].map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                    typeFilter === t ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t === 'ALL' ? 'Todos' : t}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Relatórios */}
          <div className="space-y-3">
            {filteredReports.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-xs">
                Nenhum relatório encontrado para os filtros selecionados.
              </div>
            ) : (
              filteredReports.map(rep => (
                <div
                  key={rep.id}
                  className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 rounded-xl p-4 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getConfBadge(rep.confidentialityLevel)}`}>
                        {rep.confidentialityLevel}
                      </span>
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-700">
                        {rep.type}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{rep.id}</span>
                      <span className="text-[10px] text-slate-400">v{rep.version}</span>
                    </div>

                    <h4 className="text-sm font-bold text-white">{rep.title}</h4>
                    <p className="text-xs text-slate-400 max-w-2xl line-clamp-1">{rep.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <span>Emitido por: <strong className="text-slate-200">{rep.generatedBy.userName}</strong> ({rep.generatedBy.userRole})</span>
                      <span>Data: {new Date(rep.generatedAt).toLocaleDateString('pt-BR')} às {new Date(rep.generatedAt).toLocaleTimeString('pt-BR')}</span>
                      {rep.executiveSummary && (
                        <span>Security Score: <strong className="text-sky-400">{rep.executiveSummary.securityScore}/100</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                    <button
                      id={`btn-view-${rep.id}`}
                      onClick={() => setSelectedReport(rep)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
                      title="Visualizar Relatório Completo"
                    >
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                      Visualizar
                    </button>

                    <button
                      id={`btn-export-html-${rep.id}`}
                      onClick={() => handleExport(rep.id, 'HTML')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
                      title="Imprimir ou Salvar em PDF nativo"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-400" />
                      Imprimir / PDF
                    </button>

                    <button
                      id={`btn-export-csv-${rep.id}`}
                      onClick={() => handleExport(rep.id, 'CSV')}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                      title="Exportar CSV (BI / Planilhas)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                    </button>

                    <button
                      id={`btn-export-json-${rep.id}`}
                      onClick={() => handleExport(rep.id, 'JSON')}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                      title="Exportar JSON Sanitizado"
                    >
                      <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    </button>

                    <button
                      id={`btn-share-${rep.id}`}
                      onClick={() => {
                        setSharingReport(rep);
                        setGeneratedShareToken(null);
                      }}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                      title="Compartilhamento Seguro com Token"
                    >
                      <Share2 className="w-3.5 h-3.5 text-purple-400" />
                    </button>

                    <button
                      id={`btn-delete-${rep.id}`}
                      onClick={() => handleDeleteReport(rep.id)}
                      className="p-1.5 bg-slate-800/80 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700 transition-colors"
                      title="Excluir Relatório"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ABA 2: GERADOR DE RELATÓRIO */}
      {activeTab === 'generator' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="text-base font-bold text-white">Compilar Relatório Oficial de Segurança</h3>
              <p className="text-xs text-slate-400">
                Selecione o tipo de relatório desejado. Todos os dados sensíveis serão sanitizados automaticamente pelo motor.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateReport} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Relatório</label>
              <select
                value={genType}
                onChange={e => setGenType(e.target.value as SecurityReportType)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="PENTEST">Relatório Oficial de Pentest (8 Seções Completas)</option>
                <option value="EXECUTIVE">Relatório Executivo Estratégico (Diretoria & Riscos)</option>
                <option value="VULNERABILITY">Relatório Técnico de Vulnerabilidades & CIs</option>
                <option value="REMEDIATION">Relatório de Remediação, SLAs e Retestes</option>
                <option value="COMPLIANCE">Relatório de Conformidade & Gap Analysis (OWASP/CIS/NIST)</option>
                <option value="SECURITY_OVERVIEW">Visão Geral Consolidada de Segurança</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Título Personalizado</label>
              <input
                type="text"
                value={genTitle}
                onChange={e => setGenTitle(e.target.value)}
                placeholder="Ex: Avaliação Perimetral e Auditoria de Segurança Q3 2026"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Classificação de Confidencialidade</label>
              <select
                value={genConfidentiality}
                onChange={e => setGenConfidentiality(e.target.value as ConfidentialityClassification)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="CONFIDENTIAL">CONFIDENCIAL (Acesso interno restrito às equipes técnicas e C-level)</option>
                <option value="RESTRICTED">RESTRITO (Alto sigilo / Auditoria externa)</option>
                <option value="INTERNAL">INTERNO (Disponível para colaboradores autorizados)</option>
                <option value="PUBLIC">PÚBLICO (Versão higienizada sem detalhes técnicos de infraestrutura)</option>
              </select>
            </div>

            {genType === 'PENTEST' && (
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-4 text-xs text-slate-300 space-y-2">
                <span className="font-bold text-rose-400 block">Estrutura das 8 Seções do Relatório de Pentest:</span>
                <ol className="list-decimal pl-5 space-y-1 text-slate-400">
                  <li>Identificação do Projeto & Termo de Escopo</li>
                  <li>Sumário Executivo & Classificação de Riscos</li>
                  <li>Escopo Autorizado & Limitações Técnicas</li>
                  <li>Metodologia de Avaliação (OWASP WSTG v4.2 / PTES)</li>
                  <li>Descobertas Técnicas & Vetores de Vulnerabilidade</li>
                  <li>Plano de Remediação & SLAs de Resolução</li>
                  <li>Ciclo de Reteste & Redução Comprovada de Risco</li>
                  <li>Conclusão & Declaração de Postura de Segurança</li>
                </ol>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={genGenerating}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                {genGenerating ? 'Gerando Documento...' : 'Gerar e Compilar Relatório'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABA 3: RELATÓRIOS AGENDADOS */}
      {activeTab === 'scheduled' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Lista de Agendamentos */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" />
                Agendamentos Ativos
              </h3>

              <div className="space-y-3">
                {scheduledReports.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Nenhum envio periódico agendado.</p>
                ) : (
                  scheduledReports.map(sch => (
                    <div key={sch.id} className="bg-slate-800/40 border border-slate-800 rounded-lg p-3.5 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{sch.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-semibold">
                              {sch.frequency}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">Formato: {sch.format} • Tipo: {sch.type}</div>
                        </div>

                        <button
                          onClick={() => handleDeleteSchedule(sch.id)}
                          className="text-slate-400 hover:text-rose-400 p-1"
                          title="Excluir Agendamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        <span>Destinatários: </span>
                        <span className="text-slate-300 font-mono">{sch.recipients.join(', ')}</span>
                      </div>

                      <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
                        <span>Próxima execução: {new Date(sch.nextRunAt).toLocaleDateString('pt-BR')}</span>
                        <span className="text-emerald-400 font-semibold">Ativo</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Novo Agendamento */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <Plus className="w-4 h-4 text-rose-400" />
                Criar Novo Agendamento Automático
              </h3>

              <form onSubmit={handleCreateSchedule} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Título do Agendamento</label>
                  <input
                    type="text"
                    value={schTitle}
                    onChange={e => setSchTitle(e.target.value)}
                    placeholder="Ex: Boletim Semanal Executivo"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo</label>
                    <select
                      value={schType}
                      onChange={e => setSchType(e.target.value as SecurityReportType)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="EXECUTIVE">Executivo</option>
                      <option value="PENTEST">Pentest</option>
                      <option value="COMPLIANCE">Compliance</option>
                      <option value="REMEDIATION">Remediação</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Frequência</label>
                    <select
                      value={schFreq}
                      onChange={e => setSchFreq(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="DAILY">Diário</option>
                      <option value="WEEKLY">Semanal</option>
                      <option value="MONTHLY">Mensal</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Formato</label>
                  <select
                    value={schFormat}
                    onChange={e => setSchFormat(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="PDF">PDF (Relatório Formal com Assinatura)</option>
                    <option value="CSV">CSV (Planilha / Dados Brutos)</option>
                    <option value="JSON">JSON (Integração SIEM / API)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Destinatários (separados por vírgula)</label>
                  <input
                    type="text"
                    value={schRecipients}
                    onChange={e => setSchRecipients(e.target.value)}
                    placeholder="diretoria@empresa.com, ciso@empresa.com"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Salvar Agendamento
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZADOR DETALHADO DE RELATÓRIO */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-rose-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{selectedReport.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getConfBadge(selectedReport.confidentialityLevel)}`}>
                      {selectedReport.confidentialityLevel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">ID: {selectedReport.id} • v{selectedReport.version}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport(selectedReport.id, 'HTML')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  Imprimir / PDF
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Conteúdo Estruturado */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300 leading-relaxed">
              {/* Box de Metadados e Sumário */}
              <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tipo</span>
                  <strong className="text-white">{selectedReport.type}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Data de Emissão</span>
                  <strong className="text-white">{new Date(selectedReport.generatedAt).toLocaleDateString('pt-BR')}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Emitido Por</span>
                  <strong className="text-white">{selectedReport.generatedBy.userName}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Security Score</span>
                  <strong className="text-sky-400">{selectedReport.executiveSummary?.securityScore || 85}/100</strong>
                </div>
              </div>

              {/* 1. Sumário Executivo */}
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider text-rose-400 border-b border-slate-800 pb-1.5 mb-2">
                  1. Sumário Executivo & Diagnóstico
                </h4>
                <p className="text-slate-300">
                  {selectedReport.executiveSummary?.summaryText || selectedReport.description}
                </p>

                {selectedReport.executiveSummary?.keyRecommendations && (
                  <div className="mt-3 bg-slate-800/30 p-3 rounded-lg border border-slate-800">
                    <span className="font-semibold text-slate-200 block mb-1">Recomendações Prioritárias:</span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-400">
                      {selectedReport.executiveSummary.keyRecommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 2. Escopo & Limitações */}
              {selectedReport.scopeSummary && (
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider text-rose-400 border-b border-slate-800 pb-1.5 mb-2">
                    2. Escopo Autorizado & Alvos Avaliados
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <strong className="text-slate-200">Alvos em Escopo: </strong>
                      <span className="text-slate-400">{selectedReport.scopeSummary.authorizedTargets.join(', ')}</span>
                    </div>
                    {selectedReport.scopeSummary.limitations.length > 0 && (
                      <div>
                        <strong className="text-slate-200">Limitações Técnicas: </strong>
                        <span className="text-slate-400">{selectedReport.scopeSummary.limitations.join(' ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Achados Técnicos */}
              {selectedReport.findingsSummary && selectedReport.findingsSummary.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider text-rose-400 border-b border-slate-800 pb-1.5 mb-2">
                    3. Descobertas Técnicas & Vulnerabilidades ({selectedReport.findingsSummary.length})
                  </h4>

                  <div className="space-y-2.5 mt-3">
                    {selectedReport.findingsSummary.map(f => (
                      <div key={f.id} className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400 font-bold">{f.code}</span>
                            <strong className="text-white">{f.title}</strong>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            f.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                            f.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {f.severity} (CVSS {f.cvssScore})
                          </span>
                        </div>

                        <p className="text-slate-400 text-[11px]">{f.description}</p>
                        {f.recommendation && (
                          <div className="text-[11px] text-emerald-400">
                            <strong>Recomendação: </strong>{f.recommendation}
                          </div>
                        )}
                        {f.retest && (
                          <div className="text-[11px] text-sky-400">
                            <strong>Resultado do Reteste: </strong>{f.retest.result} (Risco recalculado: {f.retest.currentRisk})
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Conclusão */}
              {selectedReport.conclusionText && (
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider text-rose-400 border-b border-slate-800 pb-1.5 mb-2">
                    4. Declaração Conclusiva
                  </h4>
                  <p className="text-slate-300 italic">{selectedReport.conclusionText}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
              <span>Classificação: {selectedReport.confidentialityLevel} • Assinatura HMAC ativa</span>
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COMPARTILHAMENTO SEGURO */}
      {sharingReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Compartilhamento Seguro de Relatório</h3>
              </div>
              <button onClick={() => setSharingReport(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Gere um link temporário com expiração e token de acesso auditado para compartilhar: <strong className="text-white">{sharingReport.title}</strong>
            </p>

            {!generatedShareToken ? (
              <form onSubmit={handleCreateShareToken} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Destinatário</label>
                  <input
                    type="text"
                    value={shareRecipientName}
                    onChange={e => setShareRecipientName(e.target.value)}
                    placeholder="Ex: Ana Silva (Auditoria Externa)"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail do Destinatário</label>
                  <input
                    type="email"
                    value={shareRecipientEmail}
                    onChange={e => setShareRecipientEmail(e.target.value)}
                    placeholder="ana.silva@auditoria.com"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Validade do Link</label>
                  <select
                    value={shareExpiresInDays}
                    onChange={e => setShareExpiresInDays(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value={1}>1 dia (24 horas)</option>
                    <option value={7}>7 dias (Padrão)</option>
                    <option value={15}>15 dias</option>
                    <option value={30}>30 dias</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSharingReport(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Gerar Link Auditado
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-xs text-purple-300">
                  Link seguro gerado com sucesso! Válido até {new Date(generatedShareToken.expiresAt).toLocaleDateString('pt-BR')}.
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-slate-300 truncate">
                    {window.location.origin}/api/v1/security/reports/share/{generatedShareToken.token}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/v1/security/reports/share/${generatedShareToken.token}`);
                      showToast('Link copiado para a área de transferência!');
                    }}
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded shrink-0"
                    title="Copiar Link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[11px] text-slate-400">
                  Destinado a: <strong className="text-white">{generatedShareToken.recipientName}</strong> ({generatedShareToken.recipientEmail})
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setSharingReport(null)}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
