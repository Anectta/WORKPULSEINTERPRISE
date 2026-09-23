import React, { useState, useMemo } from 'react';
import { 
  Compass, 
  Search, 
  Filter, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  AlertTriangle, 
  GitMerge, 
  Split, 
  Layers, 
  Activity, 
  Wifi, 
  Cpu, 
  HardDrive, 
  ShieldAlert, 
  RefreshCw, 
  Sparkles, 
  Laptop, 
  Server, 
  Printer, 
  HelpCircle, 
  Fingerprint, 
  Bell, 
  Clock, 
  ChevronRight, 
  Sliders, 
  Tag, 
  Info,
  Check,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import { 
  InventoryDiscoveredAsset, 
  DiscoveryAlert, 
  DuplicatePair,
  DiscoveryStatus 
} from '../../types/inventoryDiscovery';
import { ITAsset, Employee, EnvironmentRoomItem, CustomCategoryItem } from '../../types';
import { DiscoveredAssetDetailModal } from './DiscoveredAssetDetailModal';
import { DuplicateAnalysisModal } from './DuplicateAnalysisModal';
import { ApproveAssetModal } from './ApproveAssetModal';
import { matchDiscoveredAsset, safeMergeAssets } from '../../utils/assetMatchingEngine';

interface CentralDiscoveryHubProps {
  existingAssets: ITAsset[];
  setExistingAssets: React.Dispatch<React.SetStateAction<ITAsset[]>>;
  discoveredAssets: InventoryDiscoveredAsset[];
  setDiscoveredAssets: React.Dispatch<React.SetStateAction<InventoryDiscoveredAsset[]>>;
  alerts: DiscoveryAlert[];
  setAlerts: React.Dispatch<React.SetStateAction<DiscoveryAlert[]>>;
  employees: Employee[];
  rooms: EnvironmentRoomItem[];
  categories: CustomCategoryItem[];
  onNavigateToTopology?: (nodeId?: string) => void;
}

export type DiscoverySectionTab = 
  | 'new_assets' 
  | 'changed_assets' 
  | 'offline_assets' 
  | 'no_agent' 
  | 'duplicates' 
  | 'alerts';

export const CentralDiscoveryHub: React.FC<CentralDiscoveryHubProps> = ({
  existingAssets,
  setExistingAssets,
  discoveredAssets,
  setDiscoveredAssets,
  alerts,
  setAlerts,
  employees,
  rooms,
  categories,
  onNavigateToTopology
}) => {
  // Active Section Tab
  const [activeSection, setActiveSection] = useState<DiscoverySectionTab>('new_assets');
  
  // Search & Status Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  // Interactive Modals
  const [selectedDetailAsset, setSelectedDetailAsset] = useState<InventoryDiscoveredAsset | null>(null);
  const [selectedApproveAsset, setSelectedApproveAsset] = useState<InventoryDiscoveredAsset | null>(null);
  
  // Duplicate Analysis Modal State
  const [duplicateModalData, setDuplicateModalData] = useState<{
    discovered: InventoryDiscoveredAsset;
    existing: ITAsset;
    similarityPct: number;
  } | null>(null);

  // Real-time Scan Simulation State
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Status Badge Config
  const statusConfig: Record<DiscoveryStatus, { label: string; bg: string; text: string; border: string }> = {
    DISCOVERED: { label: 'DISCOVERED', bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-800' },
    PENDING: { label: 'PENDING', bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800' },
    APPROVED: { label: 'APPROVED', bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-800' },
    REJECTED: { label: 'REJECTED', bg: 'bg-rose-100 dark:bg-rose-950', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-800' },
    MERGED: { label: 'MERGED', bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-800' }
  };

  // Section Counts
  const newAssetsList = useMemo(() => {
    return discoveredAssets.filter(a => !a.hasChanges && a.status !== 'MERGED');
  }, [discoveredAssets]);

  const changedAssetsList = useMemo(() => {
    return discoveredAssets.filter(a => a.hasChanges || (a.changesDetected && a.changesDetected.length > 0));
  }, [discoveredAssets]);

  const offlineAssetsList = useMemo(() => {
    return discoveredAssets.filter(a => a.agentStatus === 'offline' && a.hasAgent);
  }, [discoveredAssets]);

  const noAgentList = useMemo(() => {
    return discoveredAssets.filter(a => !a.hasAgent);
  }, [discoveredAssets]);

  const duplicatesList = useMemo(() => {
    return discoveredAssets.filter(a => a.isDuplicateSuspect && a.status !== 'MERGED');
  }, [discoveredAssets]);

  const openAlertsList = useMemo(() => {
    return alerts.filter(a => a.status === 'OPEN');
  }, [alerts]);

  // Filtered Discovered Assets based on Active Section & Filters
  const displayedAssets = useMemo(() => {
    let baseList: InventoryDiscoveredAsset[] = [];

    switch (activeSection) {
      case 'new_assets':
        baseList = newAssetsList;
        break;
      case 'changed_assets':
        baseList = changedAssetsList;
        break;
      case 'offline_assets':
        baseList = offlineAssetsList;
        break;
      case 'no_agent':
        baseList = noAgentList;
        break;
      case 'duplicates':
        baseList = duplicatesList;
        break;
      default:
        baseList = discoveredAssets;
    }

    return baseList.filter(asset => {
      const matchSearch = 
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.brandModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.os.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.ipAddress.includes(searchTerm) ||
        asset.macAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.serialNumber && asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'all' || asset.status === statusFilter;
      const matchMethod = methodFilter === 'all' || asset.discoveryMethod === methodFilter;

      return matchSearch && matchStatus && matchMethod;
    });
  }, [
    activeSection, 
    newAssetsList, 
    changedAssetsList, 
    offlineAssetsList, 
    noAgentList, 
    duplicatesList, 
    discoveredAssets, 
    searchTerm, 
    statusFilter, 
    methodFilter
  ]);

  // Handle Trigger Real-time Network Scan Simulation
  const handleTriggerScan = () => {
    setIsScanning(true);
    setScanMessage('Executando varredura ARP/SNMP nas subredes autorizadas e sincronizando agentes RMM...');
    
    setTimeout(() => {
      setIsScanning(false);
      setScanMessage('Varredura concluída com sucesso! 7 ativos checados, telemetria sincronizada.');
      setTimeout(() => setScanMessage(null), 5000);
    }, 1800);
  };

  // Handle Approve Discovered Asset
  const handleOpenApproveModal = (asset: InventoryDiscoveredAsset) => {
    setSelectedApproveAsset(asset);
  };

  // Confirm Approval into Base Inventory
  const handleConfirmApproval = (approvedData: {
    assetTag: string;
    name: string;
    category: string;
    assignedEmployeeId?: string;
    assignedEmployeeName?: string;
    assignedDepartment?: string;
    roomId?: string;
    roomName?: string;
    purchaseValue: number;
    acquisitionDate: string;
    warrantyExpiry: string;
  }) => {
    if (!selectedApproveAsset) return;

    const todayStr = new Date().toISOString().split('T')[0];

    // Create New ITAsset in base inventory
    const newITAsset: ITAsset = {
      id: `ast-${Date.now()}`,
      assetTag: approvedData.assetTag,
      name: approvedData.name,
      category: approvedData.category as any,
      brandModel: selectedApproveAsset.brandModel,
      serialNumber: selectedApproveAsset.serialNumber || `SN-${Math.floor(Math.random() * 900000 + 100000)}`,
      status: 'em_uso',
      lifecycleStage: 'utilizacao',
      lifecycleStageDate: todayStr,
      lifecycleNotes: `Ativo aprovado a partir da Central de Descoberta (${selectedApproveAsset.discoveryMethod}).`,
      acquisitionDate: approvedData.acquisitionDate,
      purchaseValue: approvedData.purchaseValue,
      currentValue: approvedData.purchaseValue,
      salvageValue: approvedData.purchaseValue * 0.1,
      warrantyExpiry: approvedData.warrantyExpiry,
      warrantyType: 'On-Site Fabricante',
      warrantySla: 'Next Business Day',
      assignedEmployeeId: approvedData.assignedEmployeeId,
      assignedEmployeeName: approvedData.assignedEmployeeName,
      assignedDepartment: approvedData.assignedDepartment,
      roomId: approvedData.roomId,
      roomName: approvedData.roomName,
      building: 'Sede Corporativa - Torre A',
      floor: '3º Andar',
      quadrantCode: 'Q4',
      macAddress: selectedApproveAsset.macAddress,
      ipAddress: selectedApproveAsset.ipAddress,
      agentStatus: selectedApproveAsset.hasAgent ? 'online' : undefined,
      agentVersion: selectedApproveAsset.agentVersion,
      agentLastPing: 'agora mesmo',
      lifespanMonths: 36,
      history: [
        {
          id: `hist-disc-${Date.now()}`,
          date: todayStr,
          stage: 'utilizacao',
          type: 'instalacao',
          title: 'Aprovação & Cadastro Via Central de Descoberta',
          description: `Ativo descoberto via ${selectedApproveAsset.discoveryMethod} com especificações (${selectedApproveAsset.ram}, ${selectedApproveAsset.disk}) e aprovado para o inventário patrimonial com tombo ${approvedData.assetTag}.`,
          performedBy: 'Administrador de TI'
        }
      ],
      createdAt: new Date().toISOString()
    };

    // Update Existing Assets List
    setExistingAssets(prev => [newITAsset, ...prev]);

    // Update Discovered Asset status to APPROVED
    setDiscoveredAssets(prev => prev.map(a => {
      if (a.id === selectedApproveAsset.id) {
        return {
          ...a,
          status: 'APPROVED',
          matchedAssetId: newITAsset.id,
          matchedAssetTag: newITAsset.assetTag
        };
      }
      return a;
    }));

    setSelectedApproveAsset(null);
    if (selectedDetailAsset?.id === selectedApproveAsset.id) {
      setSelectedDetailAsset(null);
    }
  };

  // Handle Reject Discovered Asset
  const handleRejectAsset = (asset: InventoryDiscoveredAsset) => {
    if (confirm(`Deseja rejeitar o ativo descoberto "${asset.name}"?`)) {
      setDiscoveredAssets(prev => prev.map(a => {
        if (a.id === asset.id) {
          return { ...a, status: 'REJECTED' };
        }
        return a;
      }));
      if (selectedDetailAsset?.id === asset.id) {
        setSelectedDetailAsset(null);
      }
    }
  };

  // Handle Analyze Duplicate
  const handleAnalyzeDuplicate = (discovered: InventoryDiscoveredAsset) => {
    // Find matching target in existing assets or match candidate
    let target = existingAssets.find(a => 
      a.name.toLowerCase() === (discovered.duplicateTargetName || 'pc-023').toLowerCase() ||
      a.serialNumber === discovered.serialNumber ||
      a.macAddress === discovered.macAddress
    );

    if (!target && existingAssets.length > 0) {
      target = existingAssets[0];
    }

    if (target) {
      setDuplicateModalData({
        discovered,
        existing: target,
        similarityPct: discovered.duplicateSimilarityPct || 94
      });
    }
  };

  // Handle Merge Asset: NEVER DELETE existing asset, update existing and set discovered to MERGED
  const handleMergeDuplicate = (discovered: InventoryDiscoveredAsset, existing: ITAsset) => {
    const updatedTarget = safeMergeAssets(existing, discovered, 'Administrador de TI WorkPulse');
    
    // Update existing asset list
    setExistingAssets(prev => prev.map(a => a.id === existing.id ? updatedTarget : a));

    // Update discovered asset status to MERGED
    setDiscoveredAssets(prev => prev.map(a => {
      if (a.id === discovered.id) {
        return {
          ...a,
          status: 'MERGED',
          isDuplicateSuspect: false,
          matchedAssetId: existing.id,
          matchedAssetTag: existing.assetTag,
          notes: `Mesclado ao tombo ${existing.assetTag} (${existing.name}). Dados preservados.`
        };
      }
      return a;
    }));

    // Resolve duplicate alert if open
    setAlerts(prev => prev.map(alt => {
      if (alt.assetId === discovered.id && alt.type === 'DUPLICATE_FOUND') {
        return { ...alt, status: 'RESOLVED' };
      }
      return alt;
    }));

    setDuplicateModalData(null);
  };

  // Handle Keep Separate
  const handleKeepSeparate = (discovered: InventoryDiscoveredAsset) => {
    setDiscoveredAssets(prev => prev.map(a => {
      if (a.id === discovered.id) {
        return {
          ...a,
          isDuplicateSuspect: false,
          notes: 'Marcado para manter separado como ativo independente.'
        };
      }
      return a;
    }));

    setDuplicateModalData(null);
  };

  // Handle Resolve Alert
  const handleResolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'RESOLVED' } : a));
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* HEADER CARD OF CENTRAL DE DESCOBERTA */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center font-bold shadow-lg shadow-purple-600/20 shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Central de Descoberta de Ativos
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px] border border-purple-300 dark:border-purple-800">
                {discoveredAssets.length} Dispositivos Monitorados
              </span>
              {openAlertsList.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[10px] flex items-center space-x-1 border border-rose-300 dark:border-rose-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  <span>{openAlertsList.length} Alertas</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hub unificado de descoberta: Novos Ativos, Variações de Hardware, Detecção de Duplicidades por Matching (UUID &gt; Serial &gt; Service Tag &gt; MAC &gt; Hostname) e Triagem de Agentes.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleTriggerScan}
            disabled={isScanning}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Varrendo Rede...' : 'Executar Varredura Agora'}</span>
          </button>
        </div>
      </div>

      {/* SCAN NOTIFICATION BANNER */}
      {scanMessage && (
        <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center space-x-3 text-xs text-purple-800 dark:text-purple-200 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
          <span className="font-medium">{scanMessage}</span>
        </div>
      )}

      {/* 6 CATEGORY KPI SECTION TABS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* 1. NOVOS ATIVOS */}
        <button
          onClick={() => setActiveSection('new_assets')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
            activeSection === 'new_assets'
              ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 dark:border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">NOVOS ATIVOS</span>
            <span className="w-2 h-2 rounded-full bg-purple-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {newAssetsList.length}
          </p>
          <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-0.5">
            Aguardando aprovação
          </p>
        </button>

        {/* 2. ATIVOS ALTERADOS */}
        <button
          onClick={() => setActiveSection('changed_assets')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
            activeSection === 'changed_assets'
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">ATIVOS ALTERADOS</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {changedAssetsList.length}
          </p>
          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-0.5">
            Drift / RAM / SO detectados
          </p>
        </button>

        {/* 3. ATIVOS OFFLINE */}
        <button
          onClick={() => setActiveSection('offline_assets')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
            activeSection === 'offline_assets'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 dark:border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">ATIVOS OFFLINE</span>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {offlineAssetsList.length}
          </p>
          <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
            Sem heartbeat recente
          </p>
        </button>

        {/* 4. ATIVOS SEM AGENTE */}
        <button
          onClick={() => setActiveSection('no_agent')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
            activeSection === 'no_agent'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 dark:border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">ATIVOS SEM AGENTE</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {noAgentList.length}
          </p>
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
            Varredura SNMP / Rede
          </p>
        </button>

        {/* 5. POSSÍVEIS DUPLICIDADES */}
        <button
          onClick={() => setActiveSection('duplicates')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
            activeSection === 'duplicates'
              ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-500 dark:border-orange-500 ring-2 ring-orange-500/20 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">POSSÍVEIS DUPLICIDADES</span>
            <span className="w-2 h-2 rounded-full bg-orange-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {duplicatesList.length}
          </p>
          <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold mt-0.5">
            Matching &gt; 80% similaridade
          </p>
        </button>

        {/* 6. ALERTAS */}
        <button
          onClick={() => setActiveSection('alerts')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
            activeSection === 'alerts'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 dark:border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">ALERTAS</span>
            {openAlertsList.length > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {openAlertsList.length}
          </p>
          <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">
            Ocorrências pendentes
          </p>
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      {activeSection !== 'alerts' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Hostname, IP, MAC, Serial..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium"
            >
              <option value="all">Todos os Status</option>
              <option value="DISCOVERED">DISCOVERED (Descobertos)</option>
              <option value="PENDING">PENDING (Pendentes)</option>
              <option value="APPROVED">APPROVED (Aprovados)</option>
              <option value="REJECTED">REJECTED (Rejeitados)</option>
              <option value="MERGED">MERGED (Mesclados)</option>
            </select>

            <select
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium"
            >
              <option value="all">Todos os Métodos</option>
              <option value="AGENT">Agente WorkPulse</option>
              <option value="NETWORK_SNMP">Rede / SNMP</option>
              <option value="ARP_PING">Varredura ARP</option>
            </select>
          </div>
        </div>
      )}

      {/* SECTION 1, 2, 3, 4: ASSETS CARDS & LIST */}
      {activeSection !== 'alerts' && activeSection !== 'duplicates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <span>Lista de Dispositivos Descobertos ({displayedAssets.length})</span>
            </h3>
            <span className="text-xs text-slate-400">
              Clique em [VER DETALHES] para inspecionar componentes de hardware
            </span>
          </div>

          {displayedAssets.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <Compass className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                Nenhum dispositivo encontrado nesta categoria
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Tente redefinir os filtros ou executar uma nova varredura de rede.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedAssets.map(asset => {
                const badge = statusConfig[asset.status] || statusConfig.DISCOVERED;

                return (
                  <div 
                    key={asset.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-purple-300 dark:hover:border-purple-800 transition-all flex flex-col justify-between space-y-4 relative group"
                  >
                    <div>
                      {/* CARD TOP ROW: NAME & STATUS BADGE */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                              {asset.name}
                            </h4>
                            {asset.hasAgent ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Agente RMM Ativo" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-amber-500" title="Sem Agente (SNMP)" />
                            )}
                          </div>
                          <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                            {asset.brandModel}
                          </p>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* EXACT SPEC CARD BODY REQUESTED IN PROMPT 8 */}
                      <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5 font-medium text-xs">
                        <div className="text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">Sistema:</span>
                          <span className="font-semibold">{asset.os}</span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">Memória:</span>
                          <span className="font-semibold">{asset.ram}</span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">Armazenamento:</span>
                          <span className="font-semibold">{asset.disk}</span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-slate-400 text-[11px]">Endereço IP:</span>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{asset.ipAddress}</span>
                        </div>
                      </div>

                      {/* DETECTED CHANGES (IF ANY) */}
                      {asset.hasChanges && asset.changesDetected && (
                        <div className="mt-3 p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-[11px] space-y-1">
                          <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center space-x-1">
                            <Activity className="w-3.5 h-3.5 text-blue-600" />
                            <span>{asset.changesDetected.length} Alterações de Hardware:</span>
                          </div>
                          {asset.changesDetected.map((chg, i) => (
                            <p key={i} className="text-blue-700 dark:text-blue-300 text-[10px]">
                              &bull; {chg.fieldLabel}: <span className="line-through text-slate-400">{chg.oldValue}</span> &rarr; <strong>{chg.newValue}</strong>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* CARD ACTION BUTTONS: [APROVAR] [REJEITAR] [VER DETALHES] */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1.5">
                      <button
                        onClick={() => setSelectedDetailAsset(asset)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                        title="Ver especificações detalhadas de hardware e telemetria"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>[VER DETALHES]</span>
                      </button>

                      <div className="flex items-center space-x-1.5">
                        {asset.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleRejectAsset(asset)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-[11px] rounded-lg transition-colors border border-rose-200 dark:border-rose-800 cursor-pointer"
                            title="Rejeitar ativo"
                          >
                            <span>[REJEITAR]</span>
                          </button>
                        )}

                        {asset.status !== 'APPROVED' && asset.status !== 'MERGED' && (
                          <button
                            onClick={() => handleOpenApproveModal(asset)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors flex items-center space-x-1 cursor-pointer"
                            title="Aprovar e gerar tombo no inventário"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>[APROVAR]</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: POSSÍVEIS DUPLICIDADES */}
      {activeSection === 'duplicates' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200">
              <h4 className="font-bold">Algoritmo de Matching e Resolução de Duplicidades:</h4>
              <p className="mt-0.5 text-amber-700 dark:text-amber-300">
                A prioridade de validação segue rigorosamente: <code>UUID &gt; SERIAL &gt; SERVICE TAG &gt; MAC &gt; HOSTNAME + evidências</code>. 
                <strong className="ml-1 underline">Nunca excluímos automaticamente um ativo existente.</strong>
              </p>
            </div>
          </div>

          {duplicatesList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Nenhuma duplicidade pendente
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Todos os ativos descobertos possuem chaves de identificação únicas no inventário.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {duplicatesList.map(item => {
                const targetName = item.duplicateTargetName || 'PC-023';
                const similarity = item.duplicateSimilarityPct || 94;

                return (
                  <div 
                    key={item.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-amber-200 dark:border-amber-900/60 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-extrabold text-[11px] uppercase tracking-wide border border-amber-300 dark:border-amber-800">
                          POSSÍVEL DUPLICIDADE
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs border border-emerald-300 dark:border-emerald-800">
                          Similaridade: {similarity}%
                        </span>
                      </div>

                      {/* EXACT REQUESTED PROMPT 8 STRUCTURE */}
                      <div className="flex items-center space-x-3 text-base font-black text-slate-900 dark:text-slate-100">
                        <span className="text-slate-600 dark:text-slate-400">{targetName}</span>
                        <ArrowRight className="w-4 h-4 text-amber-500" />
                        <span className="text-amber-600 dark:text-amber-400">{item.name}</span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                        {item.brandModel} &bull; {item.os} &bull; {item.ram} &bull; {item.disk} &bull; IP: <span className="font-mono text-blue-600 dark:text-blue-400">{item.ipAddress}</span>
                      </p>
                    </div>

                    {/* REQUESTED ACTION BUTTONS: [MESCLAR] [MANTER SEPARADOS] [ANALISAR] */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleAnalyzeDuplicate(item)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                        title="Abrir comparador visual lado a lado com matriz de divergências"
                      >
                        <Fingerprint className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span>[ANALISAR]</span>
                      </button>

                      <button
                        onClick={() => handleKeepSeparate(item)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                        title="Cadastrar como ativo novo separado, preservando o existente"
                      >
                        <Split className="w-4 h-4 text-slate-500" />
                        <span>[MANTER SEPARADOS]</span>
                      </button>

                      <button
                        onClick={() => {
                          const target = existingAssets.find(a => a.name.toLowerCase() === targetName.toLowerCase()) || existingAssets[0];
                          if (target) handleMergeDuplicate(item, target);
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center space-x-1.5 cursor-pointer"
                        title="Mesclar evidências no ativo existente (não exclui o ativo existente)"
                      >
                        <GitMerge className="w-4 h-4" />
                        <span>[MESCLAR]</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 6: ALERTAS */}
      {activeSection === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <Bell className="w-4 h-4 text-rose-500" />
              <span>Ocorrências e Alertas de Descoberta ({alerts.length})</span>
            </h3>
          </div>

          {alerts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Nenhum alerta pendente
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Todas as ocorrências e divergências de hardware foram tratadas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => {
                const isResolved = alert.status === 'RESOLVED';

                return (
                  <div 
                    key={alert.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      isResolved
                        ? 'opacity-60 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30'
                        : alert.severity === 'critical' || alert.severity === 'high'
                        ? 'border-rose-300 dark:border-rose-900/60 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start space-x-3.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 mt-0.5 ${
                        isResolved
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          : alert.severity === 'critical' || alert.severity === 'high'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}>
                        <ShieldAlert className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            alert.severity === 'critical' || alert.severity === 'high'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}>
                            {alert.severity}
                          </span>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {alert.title}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            &bull; {alert.assetName}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {alert.message}
                        </p>

                        {alert.actionRequired && (
                          <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-1">
                            Ação sugerida: {alert.actionRequired}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {!isResolved ? (
                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Marcar Resolvido</span>
                        </button>
                      ) : (
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs rounded-xl">
                          Resolvido
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: DETALHES DO ATIVO DESCOBERTO */}
      <DiscoveredAssetDetailModal
        asset={selectedDetailAsset}
        onClose={() => setSelectedDetailAsset(null)}
        onApprove={asset => {
          setSelectedDetailAsset(null);
          handleOpenApproveModal(asset);
        }}
        onReject={asset => {
          handleRejectAsset(asset);
        }}
        onAnalyzeDuplicate={asset => {
          setSelectedDetailAsset(null);
          handleAnalyzeDuplicate(asset);
        }}
      />

      {/* MODAL 2: APROVAR ATIVO & GERAR TOMBO */}
      <ApproveAssetModal
        asset={selectedApproveAsset}
        suggestedTag={`PAT-2026-${String(existingAssets.length + 1).padStart(4, '0')}`}
        employees={employees}
        rooms={rooms}
        categories={categories}
        onClose={() => setSelectedApproveAsset(null)}
        onConfirmApprove={handleConfirmApproval}
      />

      {/* MODAL 3: ANÁLISE DE DUPLICIDADE (DIFF VIEWER) */}
      {duplicateModalData && (
        <DuplicateAnalysisModal
          discoveredAsset={duplicateModalData.discovered}
          existingAsset={duplicateModalData.existing}
          similarityPct={duplicateModalData.similarityPct}
          onClose={() => setDuplicateModalData(null)}
          onMerge={handleMergeDuplicate}
          onKeepSeparate={handleKeepSeparate}
        />
      )}
    </div>
  );
};
