import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  LayoutDashboard, 
  Zap, 
  AlertTriangle, 
  FileText, 
  History, 
  CheckCircle2,
  RefreshCw,
  Plus,
  Crosshair,
  Activity,
  Wrench,
  ShieldCheck,
  BarChart3,
  Scale
} from 'lucide-react';
import { 
  SecurityDashboardMetrics, 
  SecurityScan, 
  SecurityFinding, 
  SecurityScope, 
  SecurityTarget,
  SecurityAuditLog,
  PentestProject
} from '../../types/security';
import { ExecutiveDashboardView } from './ExecutiveDashboardView';
import { SecurityReportsView } from './SecurityReportsView';
import { ComplianceAssessmentView } from './ComplianceAssessmentView';
import { SecurityDashboardView } from './SecurityDashboardView';
import { SecurityScansView } from './SecurityScansView';
import { SecurityFindingsView } from './SecurityFindingsView';
import { SecurityScopesView } from './SecurityScopesView';
import { SecurityAuditView } from './SecurityAuditView';
import { SecurityScanRunnerModal } from './SecurityScanRunnerModal';
import { PentestProjectsView } from './PentestProjectsView';
import { NewPentestProjectModal } from './NewPentestProjectModal';
import { PentestExecutionMonitorView } from './PentestExecutionMonitorView';
import { PentestApprovalModal } from './PentestApprovalModal';
import { PentestDetailsModal } from './PentestDetailsModal';
import { RemediationDashboardView } from './RemediationDashboardView';
import { HardeningBaselinesView } from './HardeningBaselinesView';
import { FindingDetailModal } from './FindingDetailModal';
import { SecurityObservabilityView } from './SecurityObservabilityView';

type SecuritySubTab = 'executive' | 'dashboard' | 'pentest' | 'monitor' | 'scans' | 'findings' | 'remediation' | 'hardening' | 'compliance' | 'reports' | 'scopes' | 'audit' | 'observability';

export const SecurityModule: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<SecuritySubTab>('executive');
  const [metrics, setMetrics] = useState<SecurityDashboardMetrics | null>(null);
  const [scans, setScans] = useState<SecurityScan[]>([]);
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [scopes, setScopes] = useState<SecurityScope[]>([]);
  const [targets, setTargets] = useState<SecurityTarget[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);

  const [loading, setLoading] = useState(false);
  const [isScanRunnerOpen, setIsScanRunnerOpen] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  // Estados do Pentest Control Plane
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [activePentestProjectId, setActivePentestProjectId] = useState<string | null>(null);
  const [projectToApprove, setProjectToApprove] = useState<PentestProject | null>(null);
  const [projectDetailsId, setProjectDetailsId] = useState<string | null>(null);
  const [pentestReloadTrigger, setPentestReloadTrigger] = useState(0);

  // Carregar dados gerais
  const loadData = async () => {
    setLoading(true);
    try {
      const [mRes, sRes, fRes, scRes, tRes, aRes] = await Promise.all([
        fetch('/api/v1/security/dashboard/metrics').then(r => r.json()),
        fetch('/api/v1/security/scans').then(r => r.json()),
        fetch('/api/v1/security/findings').then(r => r.json()),
        fetch('/api/v1/security/scopes').then(r => r.json()),
        fetch('/api/v1/security/targets').then(r => r.json()),
        fetch('/api/v1/security/audit').then(r => r.json())
      ]);

      if (mRes.success) setMetrics(mRes.data);
      if (sRes.success) setScans(sRes.data);
      if (fRes.success) setFindings(fRes.data);
      if (scRes.success) setScopes(scRes.data);
      if (tRes.success) setTargets(tRes.data);
      if (aRes.success) setAuditLogs(aRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados do Security Module:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleScanLaunched = (newScanId: string) => {
    setSelectedScanId(newScanId);
    setCurrentTab('scans');
    loadData();
  };

  const handleSelectCIFromDashboard = (ciId: string) => {
    setCurrentTab('findings');
  };

  const handleOpenMonitor = (projectId: string) => {
    setActivePentestProjectId(projectId);
    setCurrentTab('monitor');
  };

  const handlePentestCreated = (projectId: string) => {
    setPentestReloadTrigger(prev => prev + 1);
    setCurrentTab('pentest');
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navegação Corporativa */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            id="tab-sec-executive"
            onClick={() => setCurrentTab('executive')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              currentTab === 'executive'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            Dashboard Executivo
          </button>

          <button
            id="tab-sec-dashboard"
            onClick={() => setCurrentTab('dashboard')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              currentTab === 'dashboard'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            Visão Geral & Riscos
          </button>

          <button
            id="tab-sec-pentest"
            onClick={() => setCurrentTab('pentest')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              currentTab === 'pentest'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <Crosshair className="w-4 h-4 text-purple-500 dark:text-purple-400" />
            Pentest Control Plane
          </button>

          {activePentestProjectId && (
            <button
              id="tab-sec-monitor"
              onClick={() => setCurrentTab('monitor')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                currentTab === 'monitor'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
              }`}
            >
              <Activity className="w-4 h-4 animate-pulse text-emerald-500" />
              Monitor em Tempo Real
            </button>
          )}

          <button
            id="tab-sec-scans"
            onClick={() => setCurrentTab('scans')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              currentTab === 'scans'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            Security Scans ({scans.length})
          </button>

          <button
            id="tab-sec-findings"
            onClick={() => setCurrentTab('findings')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              currentTab === 'findings'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Vulnerabilidades ({findings.length})
          </button>

          <button
            id="tab-sec-remediation"
            onClick={() => setCurrentTab('remediation')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              currentTab === 'remediation'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <Wrench className="w-4 h-4 text-emerald-500" />
            Remediação & SLAs
          </button>

          <button
            id="tab-sec-hardening"
            onClick={() => setCurrentTab('hardening')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              currentTab === 'hardening'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Hardening & Baselines
          </button>

          <button
            id="tab-sec-compliance"
            onClick={() => setCurrentTab('compliance')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              currentTab === 'compliance'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <Scale className="w-4 h-4 text-amber-500" />
            Compliance & GRC
          </button>

          <button
            id="tab-sec-reports"
            onClick={() => setCurrentTab('reports')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              currentTab === 'reports'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <FileText className="w-4 h-4 text-sky-500" />
            Relatórios & Exportação
          </button>

          <button
            id="tab-sec-scopes"
            onClick={() => setCurrentTab('scopes')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              currentTab === 'scopes'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <FileText className="w-4 h-4 text-slate-500" />
            Escopos & Consentimento
          </button>

          <button
            id="tab-sec-audit"
            onClick={() => setCurrentTab('audit')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              currentTab === 'audit'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <History className="w-4 h-4 text-slate-500" />
            Trilha de Auditoria (HMAC)
          </button>

          <button
            id="tab-sec-observability"
            onClick={() => setCurrentTab('observability')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              currentTab === 'observability'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Hardening & Observabilidade
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Recarregar dados"
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Novo Pentest
          </button>

          <button
            onClick={() => setIsScanRunnerOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            Novo Scan
          </button>
        </div>
      </div>

      {/* Conteúdo da Aba Selecionada */}
      {currentTab === 'executive' && (
        <ExecutiveDashboardView
          onNavigateToReports={() => setCurrentTab('reports')}
          onNavigateToCompliance={() => setCurrentTab('compliance')}
          onNavigateToRemediation={() => setCurrentTab('remediation')}
          onNavigateToFindings={() => setCurrentTab('findings')}
        />
      )}
      {currentTab === 'dashboard' && (
        <SecurityDashboardView
          metrics={metrics}
          loading={loading}
          onOpenScanRunner={() => setIsScanRunnerOpen(true)}
          onOpenNewScope={() => setCurrentTab('scopes')}
          onSelectScan={(scanId) => {
            setSelectedScanId(scanId);
            setCurrentTab('scans');
          }}
          onNavigateTab={(tab) => {
            if (tab === 'pentest' || tab === 'scans' || tab === 'findings' || tab === 'scopes' || tab === 'audit') {
              setCurrentTab(tab);
            }
          }}
          onSelectCI={handleSelectCIFromDashboard}
        />
      )}

      {currentTab === 'pentest' && (
        <PentestProjectsView
          onOpenNewProject={() => setIsNewProjectModalOpen(true)}
          onOpenMonitor={handleOpenMonitor}
          onOpenDetails={(id) => setProjectDetailsId(id)}
          onApproveProject={(p) => setProjectToApprove(p)}
          onLaunchProject={handleOpenMonitor}
          reloadTrigger={pentestReloadTrigger}
        />
      )}

      {currentTab === 'monitor' && (
        activePentestProjectId ? (
          <PentestExecutionMonitorView
            projectId={activePentestProjectId}
            onBack={() => setCurrentTab('pentest')}
            onViewFindings={() => setCurrentTab('findings')}
          />
        ) : (
          <div className="p-12 text-center text-slate-400 text-sm">
            Nenhum projeto de pentest selecionado para monitoramento.{' '}
            <button onClick={() => setCurrentTab('pentest')} className="text-rose-400 underline">
              Ver Projetos
            </button>
          </div>
        )
      )}

      {currentTab === 'scans' && (
        <SecurityScansView
          scans={scans}
          loading={loading}
          onRefresh={loadData}
          onOpenScanRunner={() => setIsScanRunnerOpen(true)}
          selectedScanId={selectedScanId}
          onSelectScan={(id) => setSelectedScanId(id)}
          onViewScanFindings={(scanId) => {
            setCurrentTab('findings');
          }}
        />
      )}

      {currentTab === 'findings' && (
        <SecurityFindingsView
          findings={findings}
          loading={loading}
          onRefresh={loadData}
          selectedFindingId={selectedFindingId}
          onSelectFinding={(id) => setSelectedFindingId(id)}
        />
      )}

      {currentTab === 'remediation' && (
        <RemediationDashboardView
          onOpenFinding={(findingId) => setSelectedFindingId(findingId)}
          onRequestRetest={(findingId) => setSelectedFindingId(findingId)}
        />
      )}

      {currentTab === 'hardening' && (
        <HardeningBaselinesView
          onOpenFinding={(findingId) => setSelectedFindingId(findingId)}
        />
      )}

      {currentTab === 'compliance' && (
        <ComplianceAssessmentView />
      )}

      {currentTab === 'reports' && (
        <SecurityReportsView />
      )}

      {currentTab === 'scopes' && (
        <SecurityScopesView
          scopes={scopes}
          targets={targets}
          loading={loading}
          onRefresh={loadData}
          onOpenNewScopeModal={() => alert('Termo de Autorização registrado via CISO Corporativo. Para novos escopos entre em contato com a Governança.')}
        />
      )}

      {currentTab === 'audit' && (
        <SecurityAuditView
          logs={auditLogs}
          loading={loading}
          onRefresh={loadData}
        />
      )}

      {currentTab === 'observability' && (
        <SecurityObservabilityView />
      )}

      {/* Modal de Detalhes da Vulnerabilidade com Reteste & Ciclo de Remediação */}
      {selectedFindingId && (
        <FindingDetailModal
          findingId={selectedFindingId}
          onClose={() => setSelectedFindingId(null)}
          onUpdated={loadData}
        />
      )}

      {/* Modais do Módulo */}
      <SecurityScanRunnerModal
        isOpen={isScanRunnerOpen}
        onClose={() => setIsScanRunnerOpen(false)}
        scopes={scopes}
        onScanLaunched={handleScanLaunched}
      />

      <NewPentestProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onSuccess={handlePentestCreated}
      />

      <PentestApprovalModal
        isOpen={!!projectToApprove}
        project={projectToApprove}
        onClose={() => setProjectToApprove(null)}
        onSuccess={() => {
          setPentestReloadTrigger(prev => prev + 1);
          loadData();
        }}
      />

      <PentestDetailsModal
        isOpen={!!projectDetailsId}
        projectId={projectDetailsId}
        onClose={() => setProjectDetailsId(null)}
      />
    </div>
  );
};
