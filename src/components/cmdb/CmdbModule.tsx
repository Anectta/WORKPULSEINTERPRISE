import React, { useState, useEffect, useCallback } from 'react';
import { 
  Network, 
  Layers, 
  Activity, 
  Share2, 
  AlertOctagon, 
  Box, 
  History, 
  Wifi, 
  FileSpreadsheet, 
  FileText, 
  Terminal, 
  RefreshCw, 
  Building2, 
  CheckCircle2, 
  ShieldCheck,
  Plus
} from 'lucide-react';
import { ConfigurationItem, CIRelationship, ITBusinessService, CMDBContractLink, CIHistoryEvent, CMDBHealthScore } from '../../types/cmdb';
import { 
  INITIAL_CMDB_ITEMS, 
  INITIAL_RELATIONSHIPS, 
  INITIAL_BUSINESS_SERVICES, 
  INITIAL_CMDB_CONTRACTS, 
  INITIAL_CMDB_HISTORY 
} from '../../data/cmdbInitialData';

import { CmdbOverviewDashboard } from './CmdbOverviewDashboard';
import { CmdbTopologyView } from './CmdbTopologyView';
import { CmdbCiListView } from './CmdbCiListView';
import { CmdbRelationshipsView } from './CmdbRelationshipsView';
import { CmdbDependenciesView } from './CmdbDependenciesView';
import { CmdbImpactAnalysisView } from './CmdbImpactAnalysisView';
import { CmdbServicesView } from './CmdbServicesView';
import { CmdbHistoryView } from './CmdbHistoryView';
import { CmdbDiscoveryView } from './CmdbDiscoveryView';
import { CmdbImportExportView } from './CmdbImportExportView';
import { CmdbReportsView } from './CmdbReportsView';
import { CmdbCiDetailModal } from './CmdbCiDetailModal';
import { CmdbAgentApiModal } from './CmdbAgentApiModal';

export const CmdbModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('visao-geral');
  const [currentTenant, setCurrentTenant] = useState<string>('tenant-demo');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Core Data state
  const [items, setItems] = useState<ConfigurationItem[]>(INITIAL_CMDB_ITEMS);
  const [relationships, setRelationships] = useState<CIRelationship[]>(INITIAL_RELATIONSHIPS);
  const [services, setServices] = useState<ITBusinessService[]>(INITIAL_BUSINESS_SERVICES);
  const [contracts, setContracts] = useState<CMDBContractLink[]>(INITIAL_CMDB_CONTRACTS);
  const [history, setHistory] = useState<CIHistoryEvent[]>(INITIAL_CMDB_HISTORY);

  // Selected CI for detail modal
  const [selectedCi, setSelectedCi] = useState<ConfigurationItem | null>(null);
  const [impactCi, setImpactCi] = useState<ConfigurationItem | null>(null);

  // RMM Agent Modal
  const [isAgentApiModalOpen, setIsAgentApiModalOpen] = useState(false);

  // Compute Health Score dynamically
  const healthScore: CMDBHealthScore = React.useMemo(() => {
    const total = items.length;
    if (total === 0) return { overallScore: 0, grade: 'C', metrics: { relationshipsPct: 0, assignedOwnersPct: 0, contractsLinkedPct: 0, activeMonitoringPct: 0 }, recommendations: [] };

    const withRel = items.filter(i => relationships.some(r => r.sourceCiId === i.id || r.targetCiId === i.id)).length;
    const withOwner = items.filter(i => i.responsible && i.responsible.trim().length > 0).length;
    const withContract = items.filter(i => i.linkedContractId).length;
    const withMonitoring = items.filter(i => i.telemetry && i.telemetry.isOnline !== undefined).length;

    const relPct = Math.round((withRel / total) * 100);
    const ownerPct = Math.round((withOwner / total) * 100);
    const contractPct = Math.round((withContract / total) * 100);
    const monPct = Math.round((withMonitoring / total) * 100);

    const overall = Math.round((relPct * 0.35) + (ownerPct * 0.25) + (contractPct * 0.2) + (monPct * 0.2));
    const grade = overall >= 90 ? 'A' : overall >= 75 ? 'B' : overall >= 60 ? 'C' : 'D';

    return {
      overallScore: overall,
      grade,
      metrics: {
        relationshipsPct: relPct,
        assignedOwnersPct: ownerPct,
        contractsLinkedPct: contractPct,
        activeMonitoringPct: monPct
      },
      recommendations: [
        {
          id: 'rec-1',
          title: 'Vincular CIs Órfãos',
          description: `${total - withRel} equipamento(s) não possuem conexões de topologia mapeadas.`,
          severity: 'medium',
          actionLabel: 'Ver Topologia'
        },
        {
          id: 'rec-2',
          title: 'Associar Contratos de Garantia',
          description: `${total - withContract} equipamento(s) sem contrato de SLA ou garantia associados.`,
          severity: 'low',
          actionLabel: 'Vincular Contratos'
        }
      ]
    };
  }, [items, relationships]);

  // Fetch data from backend API with fallback
  const fetchCmdbData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/cmdb/items?tenantId=${currentTenant}`, {
        headers: { 'x-tenant-id': currentTenant }
      });
      if (res.ok) {
        const data = await res.json();
        const itemList = Array.isArray(data) ? data : (data.items || []);
        if (itemList.length > 0) {
          setItems(itemList);
        }
      }

      const relRes = await fetch(`/api/v1/cmdb/relationships?tenantId=${currentTenant}`, {
        headers: { 'x-tenant-id': currentTenant }
      });
      if (relRes.ok) {
        const data = await relRes.json();
        const relList = Array.isArray(data) ? data : (data.relationships || []);
        if (relList.length > 0) {
          setRelationships(relList);
        }
      }
    } catch (e) {
      console.warn('CMDB API fallback to local state:', e);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant]);

  useEffect(() => {
    fetchCmdbData();
  }, [fetchCmdbData]);

  // CRUD Handlers
  const handleCreateCi = async (newItem: Partial<ConfigurationItem>) => {
    const fullItem: ConfigurationItem = {
      id: `ci-${Date.now()}`,
      tenantId: currentTenant,
      code: `CI-${items.length + 1 < 10 ? '0' : ''}${items.length + 1}`,
      name: newItem.name || 'Novo Item',
      typeId: newItem.typeId || 'computador',
      typeGroup: newItem.typeGroup || 'hardware',
      typeName: newItem.typeName || 'Computador Desktop',
      status: newItem.status || 'operacional',
      criticality: newItem.criticality || 'media',
      layer: newItem.layer || 'acesso',
      manufacturer: newItem.manufacturer || 'Fabricante',
      model: newItem.model || 'Modelo Genérico',
      serialNumber: newItem.serialNumber || '',
      assetTag: newItem.assetTag || `PAT-${Date.now().toString().slice(-4)}`,
      hostname: newItem.hostname || '',
      ipAddress: newItem.ipAddress || '',
      macAddress: newItem.macAddress || '',
      operatingSystem: newItem.operatingSystem || 'Windows 11 Pro',
      location: newItem.location || 'Matriz - Escritório',
      responsible: newItem.responsible || 'Carlos Amoroso',
      department: newItem.department || 'TI',
      clientId: 'cli-01',
      clientName: currentTenant === 'tenant-filial-01' ? 'Filial Sul' : 'Empresa ABC',
      unit: 'Matriz',
      dynamicAttributes: newItem.dynamicAttributes || {},
      linkedContractId: 'cont-01',
      linkedContractName: 'Contrato Master Suporte 24x7',
      linkedTicketsCount: 0,
      canvasPosition: {
        x: 400 + Math.floor(Math.random() * 200),
        y: 450 + Math.floor(Math.random() * 100)
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setItems(prev => [fullItem, ...prev]);

    // Add audit log
    const auditEvent: CIHistoryEvent = {
      id: `hist-${Date.now()}`,
      tenantId: currentTenant,
      ciId: fullItem.id,
      ciName: fullItem.name,
      ciCode: fullItem.code,
      action: 'CRIACAO',
      description: `Item de configuração ${fullItem.name} criado manualmente no portal CMDB.`,
      user: 'Carlos Amoroso (Admin)',
      date: new Date().toISOString(),
      source: 'Web'
    };
    setHistory(prev => [auditEvent, ...prev]);

    // Sync to backend if available
    try {
      await fetch('/api/v1/cmdb/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': currentTenant },
        body: JSON.stringify(fullItem)
      });
    } catch (e) {
      console.warn('Backend sync failed:', e);
    }
  };

  const handleUpdateCi = async (id: string, updates: Partial<ConfigurationItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item));
    if (selectedCi && selectedCi.id === id) {
      setSelectedCi(prev => prev ? { ...prev, ...updates } : null);
    }

    try {
      await fetch(`/api/v1/cmdb/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': currentTenant },
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.warn('Backend sync failed:', e);
    }
  };

  const handleDeleteCi = async (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    setRelationships(prev => prev.filter(r => r.sourceCiId !== id && r.targetCiId !== id));

    try {
      await fetch(`/api/v1/cmdb/items/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': currentTenant }
      });
    } catch (e) {
      console.warn('Backend sync failed:', e);
    }
  };

  const handleCreateRelationship = async (newRel: Partial<CIRelationship>) => {
    const now = new Date().toISOString();
    const rel: CIRelationship = {
      id: `rel-${Date.now()}`,
      tenantId: currentTenant,
      origem: newRel.origem || newRel.sourceCiId || '',
      destino: newRel.destino || newRel.targetCiId || '',
      tipo: newRel.tipo || (newRel.type ? String(newRel.type) : 'CONECTADO_A'),
      evidencia: newRel.evidencia || 'CONFIRMED',
      confianca: newRel.confianca ?? (newRel.confidence ?? 1.0),
      criado_em: now,
      atualizado_em: now,
      sourceCiId: newRel.sourceCiId || newRel.origem || '',
      sourceCiName: newRel.sourceCiName || '',
      sourceCiCode: newRel.sourceCiCode || '',
      targetCiId: newRel.targetCiId || newRel.destino || '',
      targetCiName: newRel.targetCiName || '',
      targetCiCode: newRel.targetCiCode || '',
      type: newRel.type || newRel.tipo || 'CONECTADO_A',
      criticality: newRel.criticality || 'alta',
      description: newRel.description || 'Conexão mapeada com evidência',
      createdAt: now,
      updatedAt: now,
      evidenceDetails: newRel.evidenceDetails || {
        sourceType: 'MANUAL_AUDIT',
        detectedBy: 'Carlos Amoroso (Administrador)',
        proof: 'Validação e registro de topologia manual no CMDB',
        verifiedAt: now
      }
    };

    setRelationships(prev => [rel, ...prev]);

    try {
      await fetch('/api/v1/cmdb/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': currentTenant },
        body: JSON.stringify(rel)
      });
    } catch (e) {
      console.warn('Backend sync failed:', e);
    }
  };

  const handleDeleteRelationship = async (id: string) => {
    setRelationships(prev => prev.filter(r => r.id !== id));
    try {
      await fetch(`/api/v1/cmdb/relationships/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': currentTenant }
      });
    } catch (e) {
      console.warn('Backend sync failed:', e);
    }
  };

  const handleCreateService = (newSvc: Partial<ITBusinessService>) => {
    const svc: ITBusinessService = {
      id: `srv-${Date.now()}`,
      tenantId: currentTenant,
      name: newSvc.name || 'Serviço Novo',
      code: newSvc.code || `SVC-${services.length + 1}`,
      category: newSvc.category || 'Negócio',
      status: 'operacional',
      slaHours: newSvc.slaHours || 4,
      slaTargetPct: newSvc.slaTargetPct || 99.5,
      affectedUsersCount: newSvc.affectedUsersCount || 10,
      description: newSvc.description || '',
      owner: newSvc.owner || 'Carlos Amoroso',
      clientId: 'cli-01',
      clientName: currentTenant === 'tenant-filial-01' ? 'Filial Sul' : 'Empresa ABC',
      underlyingCiIds: items.slice(0, 3).map(i => i.id),
      createdAt: new Date().toISOString()
    };
    setServices(prev => [svc, ...prev]);
  };

  const handleImportDiscoveredHost = (host: any) => {
    handleCreateCi({
      name: host.hostname,
      ipAddress: host.ip,
      macAddress: host.mac,
      manufacturer: host.vendor,
      model: host.detectedType,
      typeId: host.detectedType.toLowerCase().includes('switch') ? 'switch' : 
              host.detectedType.toLowerCase().includes('firewall') ? 'firewall' : 'servidor',
      typeName: host.detectedType,
      operatingSystem: host.osHint,
      location: 'Matriz - Descoberto na Rede'
    });
    alert(`Dispositivo ${host.hostname} (${host.ip}) cadastrado como CI com sucesso!`);
  };

  const handleImportBulk = (importedItems: Partial<ConfigurationItem>[]) => {
    importedItems.forEach(item => {
      handleCreateCi(item);
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      
      {/* 1. MASTER HEADER: TITLE, TENANT ISOLATION SELECTOR, AGENT API BUTTON */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">CMDB & Central de Infraestrutura</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800">
                  ITSM Enterprise
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                Configuration Management Database • Topologia, Dependências, Gêmeo Digital & Telemetria
              </p>
            </div>
          </div>
        </div>

        {/* Tenant selector & Quick Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap justify-between md:justify-end">
          
          {/* Multi-tenant selector */}
          <div className="flex items-center gap-2 bg-slate-100/90 dark:bg-slate-800 px-3.5 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
            <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold hidden sm:inline">Cliente / Tenant:</span>
            <select
              value={currentTenant}
              onChange={e => setCurrentTenant(e.target.value)}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none cursor-pointer"
            >
              <option value="tenant-demo" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Empresa ABC (Matriz)</option>
              <option value="tenant-filial-01" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">Filial Sul (POA)</option>
              <option value="tenant-tech" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">TechConsult Cloud</option>
            </select>
          </div>

          {/* Refresh Data */}
          <button
            onClick={fetchCmdbData}
            disabled={isLoading}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
            title="Recarregar dados da CMDB"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* RMM Agent API documentation / tester */}
          <button
            onClick={() => setIsAgentApiModalOpen(true)}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-800 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">API do Agente RMM</span>
          </button>

        </div>

      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        
        <button
          onClick={() => setActiveTab('visao-geral')}
          className={`px-4 py-2 rounded-full font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-2xs ${
            activeTab === 'visao-geral' 
              ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs' 
              : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Visão Geral & Saúde</span>
        </button>

        <button
          onClick={() => setActiveTab('topologia')}
          className={`px-4 py-2 rounded-full font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-2xs ${
            activeTab === 'topologia' 
              ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs' 
              : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <Network className="w-4 h-4 text-blue-500" />
          <span>Topologia Interativa (2D/3D)</span>
        </button>

        <button
          onClick={() => setActiveTab('itens')}
          className={`px-4 py-2 rounded-full font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-2xs ${
            activeTab === 'itens' 
              ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs' 
              : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Itens de Configuração ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('relacionamentos')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'relacionamentos' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Share2 className="w-4 h-4 text-blue-400" />
          <span>Relacionamentos ({relationships.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('dependencias')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'dependencias' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Network className="w-4 h-4 text-emerald-400" />
          <span>Árvore de Dependências</span>
        </button>

        <button
          onClick={() => {
            setImpactCi(null);
            setActiveTab('impacto');
          }}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'impacto' 
              ? 'bg-red-600 text-white shadow-sm' 
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <AlertOctagon className="w-4 h-4 text-red-400" />
          <span>Análise de Impacto</span>
        </button>

        <button
          onClick={() => setActiveTab('servicos')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'servicos' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Box className="w-4 h-4 text-purple-400" />
          <span>Serviços de Negócio</span>
        </button>

        <button
          onClick={() => setActiveTab('historico')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'historico' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <History className="w-4 h-4 text-slate-300" />
          <span>Auditoria & Histórico</span>
        </button>

        <button
          onClick={() => setActiveTab('discovery')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'discovery' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Wifi className="w-4 h-4 text-teal-400" />
          <span>Descoberta de Rede</span>
        </button>

        <button
          onClick={() => setActiveTab('import-export')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'import-export' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Importar / Exportar</span>
        </button>

        <button
          onClick={() => setActiveTab('relatorios')}
          className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'relatorios' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-400" />
          <span>Relatórios</span>
        </button>

      </div>

      {/* 3. TAB CONTENT */}
      {activeTab === 'visao-geral' && (
        <CmdbOverviewDashboard
          items={items}
          relationships={relationships}
          services={services}
          health={healthScore}
          onNavigateTab={setActiveTab}
          onSelectCi={setSelectedCi}
          onOpenImpact={ci => {
            setImpactCi(ci);
            setActiveTab('impacto');
          }}
        />
      )}

      {activeTab === 'topologia' && (
        <CmdbTopologyView
          items={items}
          relationships={relationships}
          onSelectCi={setSelectedCi}
          onCreateCi={handleCreateCi}
          onUpdateCi={handleUpdateCi}
          onDeleteCi={handleDeleteCi}
          onCreateRelationship={handleCreateRelationship}
          onDeleteRelationship={handleDeleteRelationship}
          onUpdateItemPosition={(id, pos) => {
            setItems(prev => prev.map(i => i.id === id ? { ...i, canvasPosition: pos, topologyPosition: pos } : i));
          }}
        />
      )}

      {activeTab === 'itens' && (
        <CmdbCiListView
          items={items}
          onSelectCi={setSelectedCi}
          onOpenImpact={ci => {
            setImpactCi(ci);
            setActiveTab('impacto');
          }}
          onCreateCi={handleCreateCi}
          onUpdateCi={handleUpdateCi}
          onDeleteCi={handleDeleteCi}
        />
      )}

      {activeTab === 'relacionamentos' && (
        <CmdbRelationshipsView
          items={items}
          relationships={relationships}
          onCreateRelationship={handleCreateRelationship}
          onDeleteRelationship={handleDeleteRelationship}
          onSelectCi={setSelectedCi}
        />
      )}

      {activeTab === 'dependencias' && (
        <CmdbDependenciesView
          items={items}
          relationships={relationships}
          services={services}
          onSelectCi={setSelectedCi}
        />
      )}

      {activeTab === 'impacto' && (
        <CmdbImpactAnalysisView
          items={items}
          relationships={relationships}
          services={services}
          contracts={contracts}
          initialSelectedCi={impactCi}
          onSelectCi={setSelectedCi}
        />
      )}

      {activeTab === 'servicos' && (
        <CmdbServicesView
          services={services}
          items={items}
          onCreateService={handleCreateService}
          onSelectCi={setSelectedCi}
        />
      )}

      {activeTab === 'historico' && (
        <CmdbHistoryView
          history={history}
        />
      )}

      {activeTab === 'discovery' && (
        <CmdbDiscoveryView
          items={items}
          currentTenant={currentTenant}
          onRefreshCis={fetchCmdbData}
          onSelectCi={setSelectedCi}
          onNavigateTab={setActiveTab}
          onImportHost={handleImportDiscoveredHost}
        />
      )}

      {activeTab === 'import-export' && (
        <CmdbImportExportView
          items={items}
          relationships={relationships}
          onImportBulk={handleImportBulk}
        />
      )}

      {activeTab === 'relatorios' && (
        <CmdbReportsView
          items={items}
          relationships={relationships}
          services={services}
          health={healthScore}
        />
      )}

      {/* 4. MODALS */}
      {selectedCi && (
        <CmdbCiDetailModal
          item={selectedCi}
          relationships={relationships}
          allItems={items}
          onClose={() => setSelectedCi(null)}
          onOpenImpact={ci => {
            setSelectedCi(null);
            setImpactCi(ci);
            setActiveTab('impacto');
          }}
        />
      )}

      {isAgentApiModalOpen && (
        <CmdbAgentApiModal
          tenantId={currentTenant}
          onClose={() => setIsAgentApiModalOpen(false)}
          onRefreshData={fetchCmdbData}
        />
      )}

    </div>
  );
};
