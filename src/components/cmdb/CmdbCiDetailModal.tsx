import React, { useState, useEffect } from 'react';
import { 
  X, 
  Server, 
  Shield, 
  Network, 
  Monitor, 
  Laptop, 
  Printer, 
  Database, 
  Box, 
  Wifi, 
  Lock, 
  Globe, 
  Activity, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User, 
  MapPin, 
  Calendar, 
  Cpu, 
  HardDrive, 
  Thermometer, 
  Share2, 
  ExternalLink,
  Zap,
  Tag,
  ShieldCheck,
  QrCode,
  History,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Search,
  Filter
} from 'lucide-react';
import { 
  ConfigurationItem, 
  CIRelationship, 
  CMDBTicketLink, 
  CMDBContractLink, 
  CIHistoryEvent,
  InventoryChangeRecord,
  InventoryChangeCategory,
  InventoryChangeEventType
} from '../../types/cmdb';
import { INITIAL_INVENTORY_CHANGES } from '../../data/cmdbInitialData';

interface CmdbCiDetailModalProps {
  ci: ConfigurationItem | null;
  onClose: () => void;
  relationships: CIRelationship[];
  tickets: CMDBTicketLink[];
  contracts: CMDBContractLink[];
  history: CIHistoryEvent[];
  onOpenImpactAnalysis: (ci: ConfigurationItem) => void;
  onOpenTicketDetails?: (ticket: CMDBTicketLink) => void;
}

export const CmdbCiDetailModal: React.FC<CmdbCiDetailModalProps> = ({
  ci,
  onClose,
  relationships,
  tickets,
  contracts,
  history,
  onOpenImpactAnalysis,
  onOpenTicketDetails
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'specs' | 'relationships' | 'tickets' | 'contracts' | 'telemetry' | 'changes' | 'history'>('changes');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [changeCategoryFilter, setChangeCategoryFilter] = useState<'todos' | 'hardware' | 'software' | 'sistema operacional' | 'rede' | 'usuário' | 'segurança'>('todos');
  const [changeSearch, setChangeSearch] = useState<string>('');
  const [itemChanges, setItemChanges] = useState<InventoryChangeRecord[]>([]);
  const [isLoadingChanges, setIsLoadingChanges] = useState<boolean>(false);
  const [isSimulatingChange, setIsSimulatingChange] = useState<boolean>(false);
  const [simulationToast, setSimulationToast] = useState<string | null>(null);

  const fetchItemChanges = async () => {
    if (!ci) return;
    setIsLoadingChanges(true);
    try {
      const res = await fetch(`/api/v1/cmdb/items/${ci.id}/changes`);
      if (res.ok) {
        const data = await res.json();
        if (data.changes && Array.isArray(data.changes) && data.changes.length > 0) {
          setItemChanges(data.changes);
          setIsLoadingChanges(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Could not fetch changes from API, using fallback data:', err);
    }

    // Fallback to initial inventory changes (matching CI id, code, or general demo set)
    const fallback = INITIAL_INVENTORY_CHANGES.filter(
      c => c.assetId === ci.id || c.asset_id === ci.id || c.ciCode === ci.code || c.ciCode === 'CI-NB-01'
    );
    setItemChanges(fallback.length > 0 ? fallback : INITIAL_INVENTORY_CHANGES);
    setIsLoadingChanges(false);
  };

  useEffect(() => {
    if (ci) {
      fetchItemChanges();
    }
  }, [ci?.id]);

  const handleSimulateChange = async (type: 'ram' | 'software' | 'os' | 'network' | 'security') => {
    if (!ci) return;
    setIsSimulatingChange(true);
    try {
      let deltaPayload: any = {};
      let label = '';
      if (type === 'ram') {
        deltaPayload = {
          hardware: {
            ram: { totalMb: 16384, freeMb: 8192 }
          }
        };
        label = 'RAM: 8 GB → 16 GB [HARDWARE_CHANGED]';
      } else if (type === 'software') {
        deltaPayload = {
          software: [
            { name: 'Chrome', version: '141', publisher: 'Google LLC' },
            { name: 'SentinelOne Agent', version: 'v23.3.4', publisher: 'SentinelOne' }
          ]
        };
        label = 'Chrome: 140 → 141 [SOFTWARE_UPDATED]';
      } else if (type === 'os') {
        deltaPayload = {
          os: {
            osName: 'Windows 11 Pro',
            version: '23H2',
            build: '22631.3296'
          }
        };
        label = 'Windows: 10 → 11 [OS_CHANGED]';
      } else if (type === 'network') {
        deltaPayload = {
          network: [
            { name: 'Wi-Fi 6E', ipAddresses: ['192.168.1.101'], macAddress: ci.macAddress || 'F0:2F:74:12:34:56' }
          ]
        };
        label = 'Rede: IP 192.168.1.95 → 192.168.1.101 [NETWORK_CHANGED]';
      } else if (type === 'security') {
        deltaPayload = {
          security: {
            bitlockerOrEncryption: 'Ativo (AES-XTS 256)',
            antivirusName: 'SentinelOne EDR',
            firewallEnabled: true
          }
        };
        label = 'Segurança: BitLocker Ativado [SECURITY_CHANGED]';
      }

      const res = await fetch('/api/v1/agent/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-ID': ci.hostname || ci.code,
          'X-Tenant-ID': ci.tenantId || 'tenant-demo'
        },
        body: JSON.stringify({
          agentId: ci.hostname || ci.code,
          inventoryType: 'incremental',
          delta: deltaPayload,
          collectedAt: new Date().toISOString()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSimulationToast(`Alteração gravada no histórico de auditoria: ${label}`);
        setTimeout(() => setSimulationToast(null), 4500);
        await fetchItemChanges();
      }
    } catch (err) {
      console.error('Erro ao simular alteração:', err);
    } finally {
      setIsSimulatingChange(false);
    }
  };

  const formatDateHeader = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return isoString;
    }
  };

  const getEventTypeBadgeStyle = (eventType: InventoryChangeEventType) => {
    switch (eventType) {
      case 'HARDWARE_CHANGED':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/80';
      case 'SOFTWARE_UPDATED':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80';
      case 'SOFTWARE_INSTALLED':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80';
      case 'SOFTWARE_REMOVED':
        return 'bg-rose-950/80 text-rose-300 border-rose-800/80';
      case 'OS_CHANGED':
        return 'bg-purple-950/80 text-purple-300 border-purple-800/80';
      case 'NETWORK_CHANGED':
        return 'bg-blue-950/80 text-blue-300 border-blue-800/80';
      case 'USER_CHANGED':
        return 'bg-violet-950/80 text-violet-300 border-violet-800/80';
      case 'IDENTITY_CHANGED':
        return 'bg-pink-950/80 text-pink-300 border-pink-800/80';
      case 'SECURITY_CHANGED':
        return 'bg-teal-950/80 text-teal-300 border-teal-800/80';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  const filteredChanges = itemChanges.filter(chg => {
    if (changeCategoryFilter !== 'todos') {
      if (chg.category.toLowerCase() !== changeCategoryFilter.toLowerCase()) {
        return false;
      }
    }
    if (changeSearch.trim() !== '') {
      const q = changeSearch.toLowerCase();
      const matchField = (chg.field || '').toLowerCase().includes(q);
      const matchOld = (chg.oldValue || chg.old_value || '').toLowerCase().includes(q);
      const matchNew = (chg.newValue || chg.new_value || '').toLowerCase().includes(q);
      const matchType = (chg.eventType || chg.event_type || '').toLowerCase().includes(q);
      if (!matchField && !matchOld && !matchNew && !matchType) {
        return false;
      }
    }
    return true;
  });

  const getCategoryCount = (cat: string) => {
    if (cat === 'todos') return itemChanges.length;
    return itemChanges.filter(c => c.category.toLowerCase() === cat.toLowerCase()).length;
  };

  if (!ci) return null;

  const renderTypeIcon = (typeId: string) => {
    switch (typeId) {
      case 'servidor': return <Server className="w-5 h-5 text-indigo-400" />;
      case 'firewall': return <Shield className="w-5 h-5 text-rose-400" />;
      case 'switch': return <Network className="w-5 h-5 text-emerald-400" />;
      case 'computador': return <Monitor className="w-5 h-5 text-blue-400" />;
      case 'notebook': return <Laptop className="w-5 h-5 text-cyan-400" />;
      case 'impressora': return <Printer className="w-5 h-5 text-teal-400" />;
      case 'banco_de_dados': return <Database className="w-5 h-5 text-blue-500" />;
      case 'access_point': return <Wifi className="w-5 h-5 text-amber-400" />;
      case 'vpn': return <Lock className="w-5 h-5 text-indigo-400" />;
      case 'link_internet': return <Globe className="w-5 h-5 text-green-400" />;
      default: return <Box className="w-5 h-5 text-slate-400" />;
    }
  };

  const statusBadge = (status: ConfigurationItem['status']) => {
    switch (status) {
      case 'operacional':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Operacional</span>;
      case 'atencao':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30"><span className="w-2 h-2 rounded-full bg-amber-400" /> Atenção</span>;
      case 'indisponivel':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30"><span className="w-2 h-2 rounded-full bg-red-400 animate-ping" /> Indisponível</span>;
      case 'manutencao':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">Manutenção</span>;
      case 'aposentado':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">Aposentado</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-400">Desconhecido</span>;
    }
  };

  const criticalityBadge = (crit: ConfigurationItem['criticality']) => {
    switch (crit) {
      case 'critica':
        return <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase bg-red-950 text-red-400 border border-red-800">Crítica</span>;
      case 'alta':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-orange-950 text-orange-400 border border-orange-800">Alta</span>;
      case 'media':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium uppercase bg-amber-950 text-amber-400 border border-amber-800">Média</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium uppercase bg-slate-800 text-slate-400 border border-slate-700">Baixa</span>;
    }
  };

  const ciRelationships = relationships.filter(r => r.sourceCiId === ci.id || r.targetCiId === ci.id);
  const ciTickets = tickets.filter(t => t.ciId === ci.id);
  const ciContracts = contracts.filter(c => c.linkedCiIds.includes(ci.id));
  const ciHistory = history.filter(h => h.ciId === ci.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 shadow-sm">
              {renderTypeIcon(ci.typeId)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black text-white tracking-tight">{ci.name}</h2>
                <span className="font-mono text-xs px-2 py-0.5 bg-blue-950/80 text-blue-300 border border-blue-800 rounded-md font-bold">
                  {ci.code}
                </span>
                {statusBadge(ci.status)}
                {criticalityBadge(ci.criticality)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                <span>{ci.typeName}</span>
                <span>•</span>
                <span>Cliente: <strong className="text-slate-200">{ci.clientName} ({ci.unit})</strong></span>
                <span>•</span>
                <span>IP: <strong className="text-slate-200 font-mono">{ci.ipAddress || 'N/A'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenImpactAnalysis(ci)}
              className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-white border border-red-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Executar análise de dependência e simulação de indisponibilidade em cascata"
            >
              <Zap className="w-3.5 h-3.5 text-red-400" />
              <span>Analisar Impacto</span>
            </button>

            <button
              onClick={() => setShowQrModal(!showQrModal)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Gerar Etiqueta de Patrimônio / QR Code"
            >
              <QrCode className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* QR Code Popup */}
        {showQrModal && (
          <div className="p-4 bg-slate-950/90 border-b border-blue-900/60 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-white p-1 rounded-lg flex items-center justify-center shrink-0">
                <QrCode className="w-14 h-14 text-slate-950" />
              </div>
              <div>
                <div className="font-bold text-white text-sm">Etiqueta de Patrimônio CMDB</div>
                <div className="font-mono text-blue-400 font-black">{ci.assetTag || 'PAT-2026-XXXX'}</div>
                <div className="text-slate-400 text-[11px] mt-0.5">Escaneie com a câmera para acesso instantâneo ao histórico e chamados do ativo.</div>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs"
            >
              Imprimir Etiqueta
            </button>
          </div>
        )}

        {/* Sub-tabs Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800 bg-slate-900/50 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('specs')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'specs'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Especificações & Atributos
          </button>
          <button
            onClick={() => setActiveSubTab('relationships')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'relationships'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Relacionamentos</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {ciRelationships.length}
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('tickets')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'tickets'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Chamados Relacionados</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {ciTickets.length}
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('contracts')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'contracts'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Contratos & SLA</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {ciContracts.length}
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('telemetry')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'telemetry'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Monitoramento / RMM</span>
            {ci.telemetry?.isOnline && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('changes')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'changes'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>Histórico de Alterações</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono font-bold">
              {itemChanges.length}
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'history'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Auditoria Geral</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {ciHistory.length}
            </span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          
          {/* Toast de Simulação / Detecção */}
          {simulationToast && (
            <div className="p-3 bg-indigo-950/90 border border-indigo-500/80 rounded-xl text-xs font-bold text-indigo-200 flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span>{simulationToast}</span>
              </div>
              <button onClick={() => setSimulationToast(null)} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          
          {/* TAB 1: SPECS & ATTRIBUTES */}
          {activeSubTab === 'specs' && (
            <div className="space-y-6">
              {/* Basic Hardware & Network Grid */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span>Identificação & Localização</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-xs">Patrimônio / Tombo</div>
                    <div className="font-mono font-bold text-slate-200 mt-0.5">{ci.assetTag || 'N/A'}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-xs">Fabricante & Modelo</div>
                    <div className="font-semibold text-slate-200 mt-0.5">{ci.manufacturer} {ci.model}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-xs">Número de Série</div>
                    <div className="font-mono text-slate-200 mt-0.5">{ci.serialNumber || 'N/A'}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-xs">Hostname</div>
                    <div className="font-mono text-slate-200 mt-0.5">{ci.hostname || 'N/A'}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-xs">Endereço IP</div>
                    <div className="font-mono text-blue-400 font-bold mt-0.5">{ci.ipAddress || 'DHCP Dinâmico'}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-xs">MAC Address</div>
                    <div className="font-mono text-slate-300 mt-0.5">{ci.macAddress || 'N/A'}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-xs">Sistema Operacional</div>
                    <div className="font-medium text-slate-200 mt-0.5">{ci.operatingSystem || 'N/A'}</div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-xs">Localização Física</div>
                    <div className="font-medium text-slate-200 mt-0.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>{ci.location || 'Não especificada'}</span>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-xs">Responsável / Cautela</div>
                    <div className="font-medium text-slate-200 mt-0.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{ci.responsible || 'Sem responsável'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Attributes by CI Type */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-400" />
                  <span>Atributos Dinâmicos de {ci.typeName}</span>
                </h3>
                {Object.keys(ci.dynamicAttributes || {}).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(ci.dynamicAttributes).map(([key, val]) => {
                      let displayVal = 'Não disponível';
                      if (val !== null && val !== undefined) {
                        if (typeof val === 'boolean') displayVal = val ? 'Sim' : 'Não';
                        else if (Array.isArray(val)) displayVal = `${val.length} itens registrados`;
                        else if (typeof val === 'object') displayVal = Object.keys(val).length > 0 ? `${Object.keys(val).length} propriedades` : 'Vazio';
                        else displayVal = String(val);
                      }
                      return (
                        <div key={key} className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <div className="text-slate-500 text-xs capitalize truncate">
                            {key.replace(/([A-Z])/g, ' $1')}
                          </div>
                          <div className="font-bold text-slate-200 mt-0.5 truncate text-xs">
                            {displayVal}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-500 text-xs text-center">
                    Nenhum atributo dinâmico cadastrado para este tipo de CI.
                  </div>
                )}
              </div>

              {/* Notes */}
              {ci.notes && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Observações Técnicas</div>
                  <p className="text-slate-300 text-xs leading-relaxed">{ci.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RELATIONSHIPS */}
          {activeSubTab === 'relationships' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Conexões físicas, lógicas e dependências diretas de <strong className="text-white">{ci.name}</strong> na topologia.
                </p>
                <button
                  onClick={() => onOpenImpactAnalysis(ci)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Simular Cascata de Impacto
                </button>
              </div>

              {ciRelationships.length > 0 ? (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  {ciRelationships.map(rel => {
                    const isSource = rel.sourceCiId === ci.id;
                    const otherName = isSource ? rel.targetCiName : rel.sourceCiName;
                    const otherCode = isSource ? rel.targetCiCode : rel.sourceCiCode;

                    return (
                      <div key={rel.id} className="p-3.5 flex items-center justify-between hover:bg-slate-900/60 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800 flex items-center justify-center text-blue-400">
                            <Share2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{otherName}</span>
                              <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{otherCode}</span>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                                {rel.type.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{rel.description}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            rel.criticality === 'critica' ? 'bg-red-950 text-red-400 border-red-800' :
                            rel.criticality === 'alta' ? 'bg-orange-950 text-orange-400 border-orange-800' :
                            'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            Criticidade: {rel.criticality.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-500">
                  <AlertTriangle className="w-8 h-8 text-amber-500/60 mx-auto mb-2" />
                  <p className="text-xs">Este CI é um <strong>CI Órfão</strong> — não possui nenhum relacionamento ou cabo mapeado.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TICKETS (CHAMADOS) */}
          {activeSubTab === 'tickets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Histórico de chamados de suporte técnico vinculados a este equipamento.
                </p>
              </div>

              {ciTickets.length > 0 ? (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  {ciTickets.map(ticket => (
                    <div key={ticket.id} className="p-4 hover:bg-slate-900/60 transition-colors flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-blue-400">{ticket.ticketNumber}</span>
                          <span className="text-sm font-bold text-white">{ticket.title}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            ticket.status === 'resolvido' || ticket.status === 'fechado' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                            ticket.status === 'em_atendimento' ? 'bg-blue-950 text-blue-300 border-blue-800' :
                            'bg-amber-950 text-amber-400 border-amber-800'
                          }`}>
                            {ticket.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-3">
                          <span>Solicitante: <strong className="text-slate-200">{ticket.requester}</strong></span>
                          <span>•</span>
                          <span>Técnico: <strong className="text-slate-200">{ticket.assignedTechnician}</strong></span>
                          <span>•</span>
                          <span>Aberto em: {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-md border ${
                          ticket.priority === 'alta' || ticket.priority === 'urgente' ? 'bg-red-950 text-red-400 border-red-800' :
                          'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {ticket.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-500 text-xs">
                  Nenhum chamado pendente ou recente registrado para este item de configuração.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CONTRACTS & SLA */}
          {activeSubTab === 'contracts' && (
            <div className="space-y-4">
              {ciContracts.length > 0 ? (
                ciContracts.map(contract => (
                  <div key={contract.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-400" />
                          <h4 className="font-bold text-white text-sm">{contract.name}</h4>
                        </div>
                        <p className="font-mono text-xs text-blue-400 mt-0.5">{contract.contractCode}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        SLA: {contract.slaHours} Horas On-Site
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-900 p-3 rounded-lg border border-slate-800">
                      <div>
                        <div className="text-slate-500">Fornecedor / Parceiro</div>
                        <div className="font-semibold text-slate-200 mt-0.5">{contract.supplier}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Vigência</div>
                        <div className="font-medium text-slate-200 mt-0.5">
                          {contract.startDate} até {contract.endDate}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Custo Mensal Suporte</div>
                        <div className="font-mono font-bold text-emerald-400 mt-0.5">
                          {contract.monthlyCost > 0 ? `R$ ${contract.monthlyCost.toFixed(2)}` : 'Incluso na garantia'}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400">
                      <strong>Cobertura Contratual:</strong> {contract.coverage}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-500 text-xs">
                  Nenhum contrato formal de fornecedor ou SLA vinculado diretamente a este ativo.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TELEMETRY / RMM */}
          {activeSubTab === 'telemetry' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Status do Agente Silencioso</div>
                  <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Conectado em tempo real via REST API</span>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="text-slate-400">Último Heartbeat:</div>
                  <div className="font-mono text-emerald-400 font-bold">{ci.telemetry?.lastHeartbeat || 'há instantes'}</div>
                </div>
              </div>

              {/* Gauges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                  <Cpu className="w-6 h-6 text-blue-400 mx-auto mb-1.5" />
                  <div className="text-xs text-slate-400">Consumo de CPU</div>
                  <div className="text-2xl font-black text-white mt-1">{ci.telemetry?.cpuUsagePct || 24}%</div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all"
                      style={{ width: `${ci.telemetry?.cpuUsagePct || 24}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                  <Activity className="w-6 h-6 text-indigo-400 mx-auto mb-1.5" />
                  <div className="text-xs text-slate-400">Memória RAM</div>
                  <div className="text-2xl font-black text-white mt-1">{ci.telemetry?.ramUsagePct || 52}%</div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full rounded-full transition-all"
                      style={{ width: `${ci.telemetry?.ramUsagePct || 52}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                  <HardDrive className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                  <div className="text-xs text-slate-400">Uso de Disco</div>
                  <div className="text-2xl font-black text-white mt-1">{ci.telemetry?.diskUsagePct || 40}%</div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${ci.telemetry?.diskUsagePct || 40}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Extra Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Uptime Total:</span>
                  <span className="font-mono text-slate-200 font-bold">{ci.telemetry?.uptimeHours || 120} horas contínuas</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Versão do Agente:</span>
                  <span className="font-mono text-blue-400 font-bold">{ci.telemetry?.agentVersion || 'v2.5.0-lts'}</span>
                </div>
              </div>

              {/* RMM Automated Modular Inventory Section */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Inventário de Hardware & SO (Origem: AGENT)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                      Versão: v{ci.dynamicAttributes?.lastInventoryVersion || 1} ({ci.dynamicAttributes?.lastInventoryType === 'incremental' ? 'Delta Incremental' : 'Full Completo'})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Sincronizado: {ci.dynamicAttributes?.lastInventorySyncAt ? new Date(ci.dynamicAttributes.lastInventorySyncAt).toLocaleString('pt-BR') : 'Tempo real'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-500">Processador (CPU)</div>
                    <div className="font-semibold text-slate-200 truncate mt-0.5">
                      {ci.dynamicAttributes?.cpu || 'Não disponível'}
                    </div>
                    {ci.dynamicAttributes?.cores && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {ci.dynamicAttributes.cores} Núcleos {ci.dynamicAttributes?.threads ? `• ${ci.dynamicAttributes.threads} Threads` : ''}
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-500">Memória Física (RAM)</div>
                    <div className="font-semibold text-slate-200 mt-0.5">
                      {ci.dynamicAttributes?.ramTotalMb ? `${Math.round(ci.dynamicAttributes.ramTotalMb / 1024)} GB Total` : 'Não disponível'}
                    </div>
                    {Array.isArray(ci.dynamicAttributes?.ramModules) && ci.dynamicAttributes.ramModules.length > 0 && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {ci.dynamicAttributes.ramModules.length} módulos instalados ({ci.dynamicAttributes.ramModules.map((m: any) => m.type || 'RAM').join(', ')})
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-500">Unidades de Disco / Storage</div>
                    <div className="font-semibold text-slate-200 mt-0.5">
                      {Array.isArray(ci.dynamicAttributes?.disks) && ci.dynamicAttributes.disks.length > 0
                        ? `${ci.dynamicAttributes.disks.length} unidade(s) (${ci.dynamicAttributes.disks[0].capacityGb} GB ${ci.dynamicAttributes.disks[0].type || ''})`
                        : 'Não disponível'}
                    </div>
                    {Array.isArray(ci.dynamicAttributes?.disks) && ci.dynamicAttributes.disks.length > 0 && ci.dynamicAttributes.disks[0].mountPoint && (
                      <div className="text-[10px] text-emerald-400 mt-0.5">
                        {ci.dynamicAttributes.disks[0].mountPoint} ({ci.dynamicAttributes.disks[0].fileSystem || 'NTFS'}) • {ci.dynamicAttributes.disks[0].freeGb} GB livres
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-500">Placa Gráfica (GPU)</div>
                    <div className="font-semibold text-slate-200 truncate mt-0.5">
                      {Array.isArray(ci.dynamicAttributes?.gpu) && ci.dynamicAttributes.gpu.length > 0
                        ? ci.dynamicAttributes.gpu[0].name
                        : 'GPU Padrão Integrada'}
                    </div>
                  </div>

                  <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-500">Segurança & Criptografia</div>
                    <div className="font-semibold text-slate-200 truncate mt-0.5">
                      {ci.dynamicAttributes?.security?.bitlockerOrEncryption || 'Ativo'}
                    </div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">
                      {ci.dynamicAttributes?.security?.antivirusName || 'Defender / EDR Ativo'}
                    </div>
                  </div>

                  <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-500">Softwares & Pacotes</div>
                    <div className="font-semibold text-slate-200 mt-0.5">
                      {ci.dynamicAttributes?.installedSoftwareCount ? `${ci.dynamicAttributes.installedSoftwareCount} programas` : 'Não disponível'}
                    </div>
                    <div className="text-[10px] text-blue-400 mt-0.5 truncate">
                      {ci.dynamicAttributes?.currentUser ? `Sessão: ${ci.dynamicAttributes.currentUser}` : 'Inventariado via RMM'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5.5: HISTÓRICO DE ALTERAÇÕES (DETECÇÃO & AUDITORIA DE MUDANÇAS) */}
          {activeSubTab === 'changes' && (
            <div className="space-y-4">
              {/* Header Banner */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      HISTÓRICO DE ALTERAÇÕES
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/80">
                      Comparação Contínua Ativa
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Cada nova coleta é comparada com a anterior. O sistema não sobrescreve; gera eventos de auditoria imutáveis.
                  </p>
                </div>

                {/* Simulation & Refresh Action Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchItemChanges()}
                    disabled={isLoadingChanges}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Recarregar alterações do backend"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingChanges ? 'animate-spin' : ''}`} />
                    <span>Recarregar</span>
                  </button>

                  <div className="relative group">
                    <button
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                      <span>+ Simular Nova Coleta</span>
                    </button>
                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-30 hidden group-hover:block animate-in fade-in zoom-in-95">
                      <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 border-b border-slate-800/80 mb-1">
                        Cenários de Teste (RMM)
                      </div>
                      <button
                        onClick={() => handleSimulateChange('ram')}
                        disabled={isSimulatingChange}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer"
                      >
                        <span>RAM: 8 GB → 16 GB</span>
                        <span className="text-[10px] text-amber-400 font-mono">HARDWARE</span>
                      </button>
                      <button
                        onClick={() => handleSimulateChange('software')}
                        disabled={isSimulatingChange}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer"
                      >
                        <span>Chrome: 140 → 141</span>
                        <span className="text-[10px] text-cyan-400 font-mono">SOFTWARE</span>
                      </button>
                      <button
                        onClick={() => handleSimulateChange('os')}
                        disabled={isSimulatingChange}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer"
                      >
                        <span>Windows: 10 → 11</span>
                        <span className="text-[10px] text-purple-400 font-mono">SO</span>
                      </button>
                      <button
                        onClick={() => handleSimulateChange('network')}
                        disabled={isSimulatingChange}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer"
                      >
                        <span>IP: 192.168.1.95 → .101</span>
                        <span className="text-[10px] text-blue-400 font-mono">REDE</span>
                      </button>
                      <button
                        onClick={() => handleSimulateChange('security')}
                        disabled={isSimulatingChange}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer"
                      >
                        <span>BitLocker: Ativado</span>
                        <span className="text-[10px] text-teal-400 font-mono">SEGURANÇA</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* FILTROS EXIGIDOS NO PROMPT 4: hardware, software, sistema operacional, rede, usuário, segurança */}
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'hardware', label: 'Hardware' },
                  { id: 'software', label: 'Software' },
                  { id: 'sistema operacional', label: 'Sistema Operacional' },
                  { id: 'rede', label: 'Rede' },
                  { id: 'usuário', label: 'Usuário' },
                  { id: 'segurança', label: 'Segurança' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setChangeCategoryFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      changeCategoryFilter === tab.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      changeCategoryFilter === tab.id ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-900 text-slate-500'
                    }`}>
                      {getCategoryCount(tab.id)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filtrar por campo, valor antigo ou novo (ex: RAM, Chrome, 16 GB, Windows)..."
                  value={changeSearch}
                  onChange={(e) => setChangeSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* LISTA FORMATADA DO HISTÓRICO DE ALTERAÇÕES */}
              <div className="space-y-3">
                {filteredChanges.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredChanges.map((chg) => (
                      <div
                        key={chg.id}
                        className="bg-slate-950 p-4 rounded-2xl border border-slate-800/90 hover:border-indigo-500/40 transition-all space-y-2.5 group"
                      >
                        {/* Header: Date + Event Type Badge */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-xs font-mono font-bold text-slate-300">
                              {formatDateHeader(chg.detectedAt || chg.detected_at)}
                            </span>
                          </div>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${getEventTypeBadgeStyle(chg.eventType || chg.event_type)}`}>
                            {chg.eventType || chg.event_type}
                          </span>
                        </div>

                        {/* Field Name (Ex: RAM, Chrome, Windows) */}
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span className="text-slate-100 font-black text-sm">{chg.field}</span>
                          <span className="text-[10px] text-slate-500 font-mono capitalize">{chg.category}</span>
                        </div>

                        {/* Old Value → New Value (Ex: 8 GB → 16 GB, 140 → 141, 10 → 11) */}
                        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-slate-500 font-mono">Valor anterior</div>
                            <div className="text-xs font-mono font-semibold text-rose-300 line-through truncate mt-0.5">
                              {chg.oldValue || chg.old_value || 'Não definido'}
                            </div>
                          </div>

                          <div className="shrink-0 px-2 text-slate-500 font-bold flex items-center justify-center">
                            <ArrowRight className="w-4 h-4 text-indigo-400" />
                          </div>

                          <div className="flex-1 min-w-0 text-right">
                            <div className="text-[10px] text-slate-500 font-mono">Novo valor</div>
                            <div className="text-xs font-mono font-black text-emerald-300 truncate mt-0.5">
                              {chg.newValue || chg.new_value || 'Não definido'}
                            </div>
                          </div>
                        </div>

                        {/* Footer metadata: tenant_id, asset_id, agent_id, source */}
                        <div className="pt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 font-mono border-t border-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>Agente:</span>
                            <span className="text-slate-300 font-semibold">{chg.agentId || chg.agent_id}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Origem: {chg.source || 'AGENT'}</span>
                            <span>•</span>
                            <span className="text-emerald-500 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Imutável
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-500 text-xs space-y-2">
                    <History className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                    <div className="text-slate-300 font-bold">Nenhuma alteração encontrada para este filtro.</div>
                    <div className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Todas as alterações detectadas entre coletas de inventário (RAM, Softwares, SO, Rede, Usuário, Segurança) aparecem automaticamente aqui.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: AUDIT HISTORY */}
          {activeSubTab === 'history' && (
            <div className="space-y-3">
              {ciHistory.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {ciHistory.map(event => (
                    <div key={event.id} className="relative group">
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-slate-900" />
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="font-bold text-slate-200 uppercase text-[10px] tracking-wider bg-slate-900 px-1.5 py-0.5 rounded">
                            {event.action}
                          </span>
                          <span className="font-mono text-[11px]">{new Date(event.date).toLocaleString('pt-BR')}</span>
                        </div>
                        <p className="text-slate-300 font-medium">{event.description}</p>
                        <div className="text-slate-500 text-[11px] pt-1 flex items-center gap-2">
                          <span>Origem: {event.source}</span>
                          <span>•</span>
                          <span>Usuário: {event.user}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-500 text-xs">
                  Nenhum evento histórico recente registrado para este item.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            Tenant: {ci.tenantId} • ID: {ci.id}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
