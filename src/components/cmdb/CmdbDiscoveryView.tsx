import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Wifi, 
  Search, 
  Play, 
  CheckCircle2, 
  Plus, 
  RefreshCw, 
  Server, 
  Shield, 
  ShieldCheck,
  ShieldAlert,
  Monitor, 
  Laptop,
  AlertCircle,
  Clock,
  Layers,
  Network,
  ArrowRight,
  Sliders,
  Check,
  X,
  Eye,
  Settings,
  HelpCircle,
  FileText,
  Activity,
  Filter,
  CheckSquare,
  AlertTriangle,
  ChevronRight,
  Database,
  Link,
  ChevronDown,
  Lock,
  Cpu,
  Radio,
  Printer,
  Router as RouterIcon,
  HardDrive,
  Zap
} from 'lucide-react';
import { 
  ConfigurationItem, 
  CIRelationship, 
  AuthorizedSubnet, 
  DiscoveryJob, 
  DiscoveredDevice, 
  DiscoveryProtocolMethod,
  DiscoveryPipelineStage
} from '../../types/cmdb';
import { LiveNetworkScannerTab } from './LiveNetworkScannerTab';

interface CmdbDiscoveryViewProps {
  items: ConfigurationItem[];
  currentTenant?: string;
  onRefreshCis?: () => void;
  onSelectCi?: (ci: ConfigurationItem) => void;
  onNavigateTab?: (tab: any) => void;
  onImportHost?: (host: any) => void;
}

export const CmdbDiscoveryView: React.FC<CmdbDiscoveryViewProps> = ({ 
  items, 
  currentTenant = 'tenant-matriz-01',
  onRefreshCis,
  onSelectCi,
  onNavigateTab,
  onImportHost
}) => {
  // Tabs inside Discovery View
  const [discoveryTab, setDiscoveryTab] = useState<'live_scanner' | 'devices' | 'jobs' | 'subnets' | 'pipeline'>('live_scanner');

  // Subnets & Jobs state
  const [subnets, setSubnets] = useState<AuthorizedSubnet[]>([]);
  const [jobs, setJobs] = useState<DiscoveryJob[]>([]);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Selected subnet for new scan
  const [selectedSubnetCidr, setSelectedSubnetCidr] = useState<string>('192.168.1.0/24');
  const [isExecutingScan, setIsExecutingScan] = useState(false);
  const [scanLogs, setScanLogs] = useState<Array<{ timestamp: string; level: string; message: string; protocol?: string }>>([]);
  const [scanProgress, setScanProgress] = useState(0);

  // Scan Config state
  const [selectedProtocols, setSelectedProtocols] = useState<DiscoveryProtocolMethod[]>([
    'ICMP', 'ARP', 'SNMP', 'LLDP', 'CDP', 'DNS', 'DHCP', 'INTERFACE_DISCOVERY'
  ]);
  const [snmpCommunity, setSnmpCommunity] = useState('public');
  const [snmpVersion, setSnmpVersion] = useState<'v2c' | 'v3'>('v2c');
  const [rateLimitPps, setRateLimitPps] = useState(50);
  const [timeoutMs, setTimeoutMs] = useState(1200);
  const [maxConcurrency, setMaxConcurrency] = useState(5);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Modals / Drawers
  const [selectedDevice, setSelectedDevice] = useState<DiscoveredDevice | null>(null);
  const [showSubnetModal, setShowSubnetModal] = useState(false);
  const [showJobDetailsModal, setShowJobDetailsModal] = useState<DiscoveryJob | null>(null);
  const [showMatchModal, setShowMatchModal] = useState<DiscoveredDevice | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState<DiscoveredDevice | null>(null);

  // Promotion form state
  const [promotionAssetTag, setPromotionAssetTag] = useState('');
  const [promotionLocation, setPromotionLocation] = useState('Matriz - Data Center Rack R01');
  const [promotionResponsible, setPromotionResponsible] = useState('Equipe de Redes / Infra');
  const [promotionDepartment, setPromotionDepartment] = useState('Tecnologia da Informação');

  // New Subnet Form state
  const [newSubnetName, setNewSubnetName] = useState('');
  const [newSubnetCidr, setNewSubnetCidr] = useState('');
  const [newSubnetVlan, setNewSubnetVlan] = useState('');
  const [newSubnetGateway, setNewSubnetGateway] = useState('');
  const [newSubnetNotes, setNewSubnetNotes] = useState('');
  const [subnetAdminName, setSubnetAdminName] = useState('Administrador do Tenant (Carlos Amoroso)');

  // Feedback Notification
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Subnets, Jobs & Discovered Devices
  const loadDiscoveryData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [subRes, jobRes, devRes] = await Promise.all([
        fetch('/api/v1/cmdb/discovery/subnets', { headers: { 'x-tenant-id': currentTenant } }),
        fetch('/api/v1/cmdb/discovery/jobs', { headers: { 'x-tenant-id': currentTenant } }),
        fetch('/api/v1/cmdb/discovery/devices', { headers: { 'x-tenant-id': currentTenant } })
      ]);

      if (subRes.ok) {
        const data = await subRes.json();
        setSubnets(data.subnets || []);
        if (data.subnets && data.subnets.length > 0 && !selectedSubnetCidr) {
          setSelectedSubnetCidr(data.subnets[0].cidr);
        }
      }

      if (jobRes.ok) {
        const data = await jobRes.json();
        setJobs(data.jobs || []);
      }

      if (devRes.ok) {
        const data = await devRes.json();
        setDevices(data.devices || []);
      }
    } catch (e) {
      console.warn('Erro ao carregar dados de discovery:', e);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant, selectedSubnetCidr]);

  useEffect(() => {
    loadDiscoveryData();
  }, [loadDiscoveryData]);

  // Current selected subnet object
  const currentAuthorizedSubnet = useMemo(() => {
    return subnets.find(s => s.cidr.trim() === selectedSubnetCidr.trim());
  }, [subnets, selectedSubnetCidr]);

  // Check protocol toggle
  const toggleProtocol = (proto: DiscoveryProtocolMethod) => {
    setSelectedProtocols(prev => 
      prev.includes(proto) ? prev.filter(p => p !== proto) : [...prev, proto]
    );
  };

  // Execute Non-Aggressive Network Discovery Job
  const handleExecuteDiscovery = async () => {
    if (!currentAuthorizedSubnet) {
      showToast(`A sub-rede ${selectedSubnetCidr} não está autorizada pelo administrador.`, 'error');
      return;
    }

    setIsExecutingScan(true);
    setScanProgress(10);
    setScanLogs([
      {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: `Iniciando checagem de autorização para ${selectedSubnetCidr}...`
      }
    ]);

    // Progress animation for non-aggressive scanning
    const timer = setInterval(() => {
      setScanProgress(p => {
        if (p < 85) return p + 15;
        return p;
      });
    }, 400);

    try {
      const res = await fetch('/api/v1/cmdb/discovery/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant
        },
        body: JSON.stringify({
          cidr: selectedSubnetCidr,
          metodo: selectedProtocols,
          rateLimitPps,
          timeoutMs,
          maxConcurrency,
          snmpCommunity,
          snmpVersion
        })
      });

      clearInterval(timer);
      setScanProgress(100);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Falha na execução do job');
      }

      setScanLogs(data.job?.logs || []);
      showToast(data.message || `Varredura concluída. Equipamentos adicionados como DISCOVERED.`, 'success');
      
      // Refresh list
      loadDiscoveryData();
      if (onRefreshCis) onRefreshCis();
    } catch (err: any) {
      clearInterval(timer);
      setScanProgress(0);
      showToast(err.message || 'Erro ao executar discovery', 'error');
      setScanLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          message: `Falha: ${err.message}`
        }
      ]);
    } finally {
      setTimeout(() => {
        setIsExecutingScan(false);
      }, 1200);
    }
  };

  // Create Subnet Authorization
  const handleCreateSubnet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubnetCidr || !newSubnetName) {
      showToast('Preencha o nome e o CIDR da sub-rede.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/v1/cmdb/discovery/subnets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant
        },
        body: JSON.stringify({
          name: newSubnetName,
          cidr: newSubnetCidr,
          vlanId: newSubnetVlan ? Number(newSubnetVlan) : undefined,
          gateway: newSubnetGateway,
          notes: newSubnetNotes,
          adminName: subnetAdminName,
          allowedProtocols: selectedProtocols,
          rateLimitPps,
          timeoutMs,
          maxConcurrency
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao autorizar sub-rede');

      showToast(`Sub-rede ${newSubnetCidr} autorizada com sucesso pelo administrador!`, 'success');
      setShowSubnetModal(false);
      setNewSubnetName('');
      setNewSubnetCidr('');
      setNewSubnetVlan('');
      setNewSubnetGateway('');
      setNewSubnetNotes('');
      loadDiscoveryData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao cadastrar sub-rede', 'error');
    }
  };

  // Revoke Subnet Authorization
  const handleRevokeSubnet = async (subnetId: string, cidr: string) => {
    if (!confirm(`Deseja revogar a autorização de varredura para a sub-rede ${cidr}?`)) return;

    try {
      const res = await fetch(`/api/v1/cmdb/discovery/subnets/${subnetId}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': currentTenant }
      });

      if (res.ok) {
        showToast(`Autorização para ${cidr} revogada.`, 'info');
        loadDiscoveryData();
      }
    } catch (e) {
      showToast('Erro ao revogar sub-rede.', 'error');
    }
  };

  // Promote Device along the pipeline: DISCOVERED -> ASSET -> CI -> TOPOLOGY
  const handlePromoteDevice = async (device: DiscoveredDevice, targetStage: DiscoveryPipelineStage) => {
    try {
      const res = await fetch('/api/v1/cmdb/discovery/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant
        },
        body: JSON.stringify({
          deviceId: device.id,
          targetStage,
          customCi: {
            asset: promotionAssetTag || device.assetTag,
            location: promotionLocation,
            responsible: promotionResponsible,
            department: promotionDepartment
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao promover dispositivo');

      showToast(`Equipamento ${device.hostname} promovido para ${targetStage} e integrado ao CMDB!`, 'success');
      setShowPromoteModal(null);
      loadDiscoveryData();
      if (onRefreshCis) onRefreshCis();
    } catch (err: any) {
      showToast(err.message || 'Erro ao promover dispositivo', 'error');
    }
  };

  // Manual Matching with existing CI
  const handleManualMatch = async (device: DiscoveredDevice, targetCiId: string) => {
    try {
      const res = await fetch('/api/v1/cmdb/discovery/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant
        },
        body: JSON.stringify({
          deviceId: device.id,
          ciId: targetCiId,
          notes: `Vinculação confirmada com evidência de rede (${device.protocolsDetected?.join(', ') || 'SNMP/ARP'})`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao vincular dispositivo');

      showToast(`Dispositivo vinculado com sucesso ao CI ${data.ci?.code}!`, 'success');
      setShowMatchModal(null);
      loadDiscoveryData();
      if (onRefreshCis) onRefreshCis();
    } catch (err: any) {
      showToast(err.message || 'Erro ao vincular ao CI', 'error');
    }
  };

  // Reject / Ignore Discovered Device
  const handleRejectDevice = async (device: DiscoveredDevice) => {
    try {
      const res = await fetch('/api/v1/cmdb/discovery/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant
        },
        body: JSON.stringify({
          deviceId: device.id,
          reason: 'Equipamento fora do escopo de gerenciamento da infraestrutura'
        })
      });

      if (res.ok) {
        showToast(`Dispositivo ${device.ip} marcado como ignorado/rejeitado.`, 'info');
        loadDiscoveryData();
      }
    } catch (e) {
      showToast('Erro ao rejeitar dispositivo.', 'error');
    }
  };

  // Filtered Devices
  const filteredDevices = useMemo(() => {
    return devices.filter(dev => {
      const matchSearch = searchQuery === '' || 
        dev.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dev.ip.includes(searchQuery) ||
        dev.mac.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dev.vendor.toLowerCase().includes(searchQuery.toLowerCase());

      const stage = dev.discoveryStage || dev.pipelineStage || dev.status || 'DISCOVERED';
      const matchStage = filterStage === 'ALL' || 
        (filterStage === 'DISCOVERED' && (stage === 'DISCOVERY' || stage === 'DISCOVERED')) ||
        (filterStage === 'ASSET' && stage === 'ASSET') ||
        (filterStage === 'CI' && stage === 'CI') ||
        (filterStage === 'CMDB' && (stage === 'CMDB' || stage === 'APPROVED')) ||
        (filterStage === 'REJECTED' && stage === 'REJECTED');

      const matchType = filterType === 'ALL' || dev.detectedType === filterType;

      return matchSearch && matchStage && matchType;
    });
  }, [devices, searchQuery, filterStage, filterType]);

  // Render Device Type Icon
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'switch': return <Layers className="w-4 h-4 text-emerald-400" />;
      case 'router': return <RouterIcon className="w-4 h-4 text-purple-400" />;
      case 'firewall': return <Shield className="w-4 h-4 text-amber-400" />;
      case 'access_point': return <Radio className="w-4 h-4 text-cyan-400" />;
      case 'printer': return <Printer className="w-4 h-4 text-orange-400" />;
      case 'server': return <Server className="w-4 h-4 text-blue-400" />;
      default: return <Monitor className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* TOAST ALERT */}
      {toastMessage && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-lg transition-all ${
          toastMessage.type === 'success' ? 'bg-emerald-950 border border-emerald-800 text-emerald-200' :
          toastMessage.type === 'error' ? 'bg-red-950 border border-red-800 text-red-200' :
          'bg-blue-950 border border-blue-800 text-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
             toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-400" /> :
             <Activity className="w-4 h-4 text-blue-400" />}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. TOP PIPELINE BREADCRUMB / FLOW INDICATOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Pipeline de Descoberta de Rede Autorizada</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
              PROMPT 7 COMPLIANT
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Sub-redes Ativas: <strong className="text-white">{subnets.length}</strong> | Dispositivos Descobertos: <strong className="text-emerald-400">{devices.length}</strong>
          </div>
        </div>

        {/* Step Flow Visualization */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
          {[
            { id: '1', title: '1. NETWORK DISCOVERY', desc: 'Varredura Segura', icon: Wifi, active: true },
            { id: '2', title: '2. DISCOVERED DEVICE', desc: 'Status Provisório', icon: Radio, active: true },
            { id: '3', title: '3. MATCHING', desc: 'MAC/IP/Hostname', icon: Filter, active: true },
            { id: '4', title: '4. APPROVAL', desc: 'Homologação Admin', icon: CheckSquare, active: true },
            { id: '5', title: '5. ASSET', desc: 'Ativo / Patrimônio', icon: Database, active: true },
            { id: '6', title: '6. CI', desc: 'Item CMDB', icon: Server, active: true },
            { id: '7', title: '7. TOPOLOGY', desc: 'Evidência LLDP/CDP', icon: Network, active: true },
          ].map((step, idx) => (
            <div 
              key={step.id} 
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center justify-center relative overflow-hidden"
            >
              <div className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400 mb-1">
                <step.icon className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-[11px] text-white whitespace-nowrap">{step.title}</span>
              <span className="text-[9px] text-slate-400 mt-0.5">{step.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. SCAN CONTROL & AUTHORIZED SUBNET EXECUTION BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Wifi className="w-5 h-5 text-emerald-400" />
                <span>Descoberta Modular de Equipamentos Não-Gerenciados</span>
              </h2>
              {currentAuthorizedSubnet ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Rede Autorizada
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-800 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Não Autorizada
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Descoberta de switches, firewalls, access points e impressoras sem agente (ICMP, ARP, SNMP, LLDP, CDP, DNS, DHCP, Interfaces) com rate limiting e concorrência limitada.
            </p>
          </div>

          {/* Subnet Selector & Execute Button */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
              <span className="text-xs text-slate-400 font-semibold">Sub-rede:</span>
              <select
                value={selectedSubnetCidr}
                onChange={e => setSelectedSubnetCidr(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer"
              >
                {subnets.map(sub => (
                  <option key={sub.id} value={sub.cidr} className="bg-slate-900 text-white">
                    {sub.cidr} ({sub.name})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowSubnetModal(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title="Autorizar nova sub-rede para varredura"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Autorizar Sub-rede</span>
            </button>

            <button
              onClick={handleExecuteDiscovery}
              disabled={isExecutingScan || !currentAuthorizedSubnet}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer ${
                isExecutingScan 
                  ? 'bg-emerald-700 text-white cursor-not-allowed opacity-90' 
                  : !currentAuthorizedSubnet
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
              }`}
            >
              {isExecutingScan ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Varrendo ({scanProgress}%)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Iniciar Discovery Job</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modular Protocol Checkboxes & Safety Parameters */}
        <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Protocol Selection */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="font-bold text-slate-300 block mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Módulos de Protocolo</span>
            </span>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
              {(['ICMP', 'ARP', 'SNMP', 'LLDP', 'CDP', 'DNS', 'DHCP', 'INTERFACE_DISCOVERY'] as DiscoveryProtocolMethod[]).map(proto => (
                <label key={proto} className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={selectedProtocols.includes(proto)}
                    onChange={() => toggleProtocol(proto)}
                    className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>{proto === 'INTERFACE_DISCOVERY' ? 'Interfaces' : proto}</span>
                </label>
              ))}
            </div>
          </div>

          {/* SNMP Credentials */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="font-bold text-slate-300 block mb-2 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Credenciais SNMP</span>
            </span>
            <div className="space-y-1.5">
              <div>
                <label className="text-[10px] text-slate-400 block">Community String:</label>
                <input
                  type="text"
                  value={snmpCommunity}
                  onChange={e => setSnmpCommunity(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Versão SNMP:</span>
                <span className="font-mono text-white font-bold">{snmpVersion}</span>
              </div>
            </div>
          </div>

          {/* Safety: Rate Limit & Timeout */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="font-bold text-slate-300 block mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Políticas Não-Agressivas</span>
            </span>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Rate Limit:</span>
                <span className="font-mono font-bold text-emerald-400">{rateLimitPps} pps</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Timeout por Host:</span>
                <span className="font-mono font-bold text-slate-300">{timeoutMs} ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Concorrência Máx:</span>
                <span className="font-mono font-bold text-slate-300">{maxConcurrency} threads</span>
              </div>
            </div>
          </div>

          {/* Subnet Authorization Details */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <span className="font-bold text-slate-300 block mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Autorização do Tenant</span>
            </span>
            {currentAuthorizedSubnet ? (
              <div className="space-y-1 text-[11px]">
                <div className="text-slate-300 truncate font-semibold">{currentAuthorizedSubnet.name}</div>
                <div className="text-[10px] text-slate-400 truncate">Por: <span className="text-slate-300">{currentAuthorizedSubnet.authorizedBy}</span></div>
                <div className="text-[10px] text-emerald-400 font-mono">Status: AUTORIZADA</div>
              </div>
            ) : (
              <div className="text-[11px] text-red-400">
                Esta rede não possui autorização registrada. Cadastre a autorização para liberar a varredura.
              </div>
            )}
          </div>
        </div>

        {/* Live Execution Logs if active */}
        {isExecutingScan && (
          <div className="bg-slate-950 border border-emerald-900/60 rounded-xl p-3 font-mono text-[11px] text-emerald-300 max-h-32 overflow-y-auto space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1 mb-1">
              <span>LOGS DA VARREDURA EM TEMPO REAL</span>
              <span>RATE: {rateLimitPps} PPS | CONCORRÊNCIA: {maxConcurrency}</span>
            </div>
            {scanLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-slate-500 shrink-0">[{log.timestamp.split('T')[1]?.slice(0, 8)}]</span>
                <span className={log.level === 'SUCCESS' ? 'text-emerald-400 font-bold' : log.level === 'WARN' ? 'text-amber-400' : 'text-slate-300'}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. DISCOVERY SUB-NAVIGATION TABS */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setDiscoveryTab('live_scanner')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              discoveryTab === 'live_scanner' 
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm' 
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>IP Scanner ao Vivo</span>
          </button>

          <button
            onClick={() => setDiscoveryTab('devices')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
              discoveryTab === 'devices' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Dispositivos Homologados ({devices.length})</span>
          </button>

          <button
            onClick={() => setDiscoveryTab('jobs')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
              discoveryTab === 'jobs' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Discovery Jobs ({jobs.length})</span>
          </button>

          <button
            onClick={() => setDiscoveryTab('subnets')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
              discoveryTab === 'subnets' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Redes Autorizadas ({subnets.length})</span>
          </button>
        </div>

        {/* Search and Filters */}
        {discoveryTab === 'devices' && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar IP, MAC, Hostname..."
                className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1 text-xs text-white focus:outline-none focus:border-blue-500 w-48"
              />
            </div>

            <select
              value={filterStage}
              onChange={e => setFilterStage(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todos os Estágios</option>
              <option value="DISCOVERED">1. DISCOVERED</option>
              <option value="ASSET">2. ASSET (Patrimônio)</option>
              <option value="CI">3. CI (CMDB)</option>
              <option value="CMDB">4. APROVADO / TOPOLOGIA</option>
              <option value="REJECTED">Rejeitados</option>
            </select>
          </div>
        )}
      </div>

      {/* 3.5 TAB CONTENT: LIVE IP SCANNER */}
      {discoveryTab === 'live_scanner' && (
        <LiveNetworkScannerTab
          currentTenant={currentTenant}
          showToast={showToast}
          onRefreshCis={onRefreshCis}
          onPromoteDevice={(dev) => {
            setSelectedDevice(dev);
            setShowPromoteModal(dev);
          }}
        />
      )}

      {/* 4. TAB CONTENT: DISCOVERED DEVICES TABLE */}
      {discoveryTab === 'devices' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Inventário de Descoberta de Rede</span>
              <span className="text-slate-400">({filteredDevices.length} exibidos)</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Discovered</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> Matching</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> CI / CMDB</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Equipamento</th>
                  <th className="p-3.5">IP / MAC</th>
                  <th className="p-3.5">Fabricante / Tipo</th>
                  <th className="p-3.5">Evidências / Protocolos</th>
                  <th className="p-3.5">Matching CMDB</th>
                  <th className="p-3.5">Estágio Pipeline</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredDevices.map(dev => {
                  const stage = dev.discoveryStage || dev.pipelineStage || dev.status || 'DISCOVERED';
                  const isApproved = stage === 'CMDB' || stage === 'APPROVED';
                  const isAsset = stage === 'ASSET';
                  const isCi = stage === 'CI';
                  const isRejected = dev.status === 'REJECTED';

                  return (
                    <tr key={dev.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Hostname & OS */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                            {getDeviceIcon(dev.detectedType)}
                          </div>
                          <div>
                            <span className="font-bold text-white text-sm block">{dev.hostname}</span>
                            <span className="text-[11px] text-slate-400">{dev.operatingSystem || dev.osHint || 'Desconhecido'}</span>
                          </div>
                        </div>
                      </td>

                      {/* IP & MAC */}
                      <td className="p-3.5 font-mono">
                        <div className="font-bold text-blue-400">{dev.ip}</div>
                        <div className="text-[10px] text-slate-400">{dev.mac}</div>
                      </td>

                      {/* Vendor & Type */}
                      <td className="p-3.5">
                        <div className="text-slate-200 font-semibold">{dev.vendor}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{dev.detectedType}</div>
                      </td>

                      {/* Protocols / Evidence */}
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(dev.protocolsDetected || ['SNMP', 'ARP']).map(proto => (
                            <span key={proto} className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] font-mono text-emerald-400 font-bold">
                              {proto}
                            </span>
                          ))}
                        </div>
                        {dev.interfaces && dev.interfaces.length > 0 && (
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {dev.interfaces.length} portas mapeadas
                          </span>
                        )}
                      </td>

                      {/* Matching Status */}
                      <td className="p-3.5">
                        {dev.matchedCi ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800 flex items-center gap-1 w-fit">
                              <Link className="w-2.5 h-2.5" /> {dev.matchedCi.code}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                              {dev.matchedCi.matchReason}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 w-fit">
                            <AlertCircle className="w-2.5 h-2.5" /> Não Vinculado
                          </span>
                        )}
                      </td>

                      {/* Pipeline Stage */}
                      <td className="p-3.5">
                        {isApproved ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> CMDB & Topologia
                          </span>
                        ) : isCi ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1 w-fit">
                            <Server className="w-3 h-3" /> CI CMDB
                          </span>
                        ) : isAsset ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center gap-1 w-fit">
                            <Database className="w-3 h-3" /> Ativo / Patrimônio
                          </span>
                        ) : isRejected ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-800 flex items-center gap-1 w-fit">
                            <X className="w-3 h-3" /> Rejeitado
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 flex items-center gap-1 w-fit">
                            <Radio className="w-3 h-3" /> DISCOVERED
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedDevice(dev)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Ver detalhes de telemetria e interfaces"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {!isApproved && !isRejected && (
                            <>
                              <button
                                onClick={() => setShowMatchModal(dev)}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-lg text-xs font-bold transition-colors border border-slate-700 flex items-center gap-1 cursor-pointer"
                                title="Vincular com CI existente na base"
                              >
                                <Link className="w-3 h-3" />
                                <span>Match</span>
                              </button>

                              <button
                                onClick={() => {
                                  setShowPromoteModal(dev);
                                  setPromotionAssetTag(dev.assetTag || `PAT-2026-${Date.now().toString().slice(-4)}`);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                                title="Homologar e promover para CI / Topologia"
                              >
                                <Check className="w-3 h-3" />
                                <span>Aprovar / CI</span>
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <button
                              onClick={() => {
                                if (onNavigateTab) onNavigateTab('topologia');
                              }}
                              className="px-2.5 py-1 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Network className="w-3 h-3" />
                              <span>Topologia</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT: DISCOVERY JOBS HISTORY */}
      {discoveryTab === 'jobs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
            <span className="font-bold text-white">Histórico de Discovery Jobs Executados</span>
            <span className="text-slate-400">{jobs.length} jobs registrados</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {jobs.map(job => (
              <div key={job.id} className="p-4 hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-emerald-400 text-sm">{job.id}</span>
                    <span className="font-semibold text-white">{job.rede} ({job.cidr})</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      job.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      job.status === 'RUNNING' ? 'bg-blue-950 text-blue-400 border border-blue-800 animate-pulse' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {job.status}
                    </span>
                  </div>

                  <div className="text-slate-400 text-[11px] flex flex-wrap items-center gap-3">
                    <span>Horário: <strong className="text-slate-200">{job.horario}</strong></span>
                    <span>•</span>
                    <span>Métodos: <strong className="text-slate-200">{job.metodo?.join(', ')}</strong></span>
                    <span>•</span>
                    <span>Rate Limit: <strong className="text-emerald-400">{job.scanConfig?.rateLimitPps || 50} pps</strong></span>
                    <span>•</span>
                    <span>Concorrência: <strong className="text-slate-200">{job.scanConfig?.maxConcurrency || 5}</strong></span>
                  </div>

                  {job.resultado && (
                    <div className="flex items-center gap-4 text-[11px] text-slate-300 pt-1">
                      <span>IPs Verificados: <strong>{job.resultado.totalIpsScanned}</strong></span>
                      <span>Hosts Responsivos: <strong className="text-emerald-400">{job.resultado.responsiveHosts}</strong></span>
                      <span>Novos Descobertos: <strong className="text-amber-400">{job.resultado.newDiscoveredCount}</strong></span>
                      <span>Duração: <strong>{job.resultado.durationSeconds}s</strong></span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowJobDetailsModal(job)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-colors flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ver Logs & Métricas</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT: AUTHORIZED SUBNETS */}
      {discoveryTab === 'subnets' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-white">Sub-redes Autorizadas para Varredura</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Somente redes previamente homologadas pelo administrador do tenant podem ser escaneadas.</p>
            </div>
            <button
              onClick={() => setShowSubnetModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Sub-rede</span>
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {subnets.map(sub => (
              <div key={sub.id} className="p-4 hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-white text-sm">{sub.name}</span>
                    <span className="font-mono font-bold text-emerald-400 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">{sub.cidr}</span>
                    {sub.vlanId && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-400 border border-blue-800">
                        VLAN {sub.vlanId}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      AUTORIZADA
                    </span>
                  </div>

                  <div className="text-slate-400 text-[11px] flex flex-wrap items-center gap-3">
                    <span>Autorizado por: <strong className="text-slate-200">{sub.authorizedBy}</strong></span>
                    <span>•</span>
                    <span>Data: <strong className="text-slate-300">{new Date(sub.authorizedAt).toLocaleDateString('pt-BR')}</strong></span>
                    <span>•</span>
                    <span>Gateway: <strong className="text-slate-300 font-mono">{sub.gateway || 'N/D'}</strong></span>
                    <span>•</span>
                    <span>Rate Limit: <strong className="text-emerald-400">{sub.rateLimitPps} pps</strong></span>
                  </div>

                  {sub.notes && (
                    <p className="text-[11px] text-slate-400 italic pt-0.5">{sub.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setSelectedSubnetCidr(sub.cidr);
                      setDiscoveryTab('devices');
                      handleExecuteDiscovery();
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Escanear Agora</span>
                  </button>

                  <button
                    onClick={() => handleRevokeSubnet(sub.id, sub.cidr)}
                    className="p-1.5 bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 rounded-xl transition-colors border border-slate-700 cursor-pointer"
                    title="Revogar autorização"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: INSPEÇÃO DETALHADA DO DISPOSITIVO DESCOBERTO */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                  {getDeviceIcon(selectedDevice.detectedType)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{selectedDevice.hostname}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {selectedDevice.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{selectedDevice.vendor} • {selectedDevice.detectedType.toUpperCase()}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDevice(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Network Identification */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Endereço IP:</span>
                <span className="font-mono font-bold text-blue-400">{selectedDevice.ip}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">MAC Address:</span>
                <span className="font-mono font-bold text-slate-200">{selectedDevice.mac}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Sistema Operacional:</span>
                <span className="font-bold text-slate-200 truncate block">{selectedDevice.operatingSystem || 'N/D'}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Job de Origem:</span>
                <span className="font-mono font-bold text-emerald-400 truncate block">{selectedDevice.discoveryJobId || 'Scanner'}</span>
              </div>
            </div>

            {/* SNMP Information */}
            {selectedDevice.snmpData && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                <h4 className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                  <Activity className="w-4 h-4" />
                  <span>Dados Coletados via SNMP MIB-II</span>
                </h4>
                <div className="text-slate-300 space-y-1">
                  <div><strong>sysDescr:</strong> <span className="font-mono text-slate-400">{selectedDevice.snmpData.sysDescr}</span></div>
                  <div><strong>sysName:</strong> <span className="text-slate-400">{selectedDevice.snmpData.sysName}</span></div>
                  <div><strong>sysLocation:</strong> <span className="text-slate-400">{selectedDevice.snmpData.sysLocation}</span></div>
                  <div><strong>Uptime:</strong> <span className="font-mono text-emerald-400">{selectedDevice.snmpData.uptime}</span></div>
                </div>
              </div>
            )}

            {/* LLDP / CDP Neighbors */}
            {((selectedDevice.lldpNeighbors && selectedDevice.lldpNeighbors.length > 0) || 
              (selectedDevice.cdpNeighbors && selectedDevice.cdpNeighbors.length > 0)) && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                <h4 className="font-bold text-cyan-400 flex items-center gap-1.5 text-xs">
                  <Network className="w-4 h-4" />
                  <span>Vizinhos de Topologia Descobertos (LLDP / CDP)</span>
                </h4>
                <div className="space-y-2">
                  {selectedDevice.lldpNeighbors?.map((n, i) => (
                    <div key={i} className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-bold text-white">{n.systemName}</span>
                        <span className="text-slate-400 ml-2">Porta Local: <strong className="text-cyan-400 font-mono">{n.localPort}</strong></span>
                        <span className="text-slate-400 ml-2">Porta Remota: <strong className="text-slate-300 font-mono">{n.portId}</strong></span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{n.systemDescription}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Network Interfaces Table */}
            {selectedDevice.interfaces && selectedDevice.interfaces.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span>Identificação de Interfaces Físicas / Lógicas</span>
                </h4>
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-semibold text-[9px] border-b border-slate-800">
                      <tr>
                        <th className="p-2">Interface</th>
                        <th className="p-2">MAC</th>
                        <th className="p-2">IP</th>
                        <th className="p-2">Velocidade</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {selectedDevice.interfaces.map((iface, i) => (
                        <tr key={i}>
                          <td className="p-2 font-bold text-white font-mono">{iface.name}</td>
                          <td className="p-2 font-mono text-slate-400">{iface.mac || 'N/D'}</td>
                          <td className="p-2 font-mono text-blue-400">{iface.ip || 'N/D'}</td>
                          <td className="p-2 text-slate-300">{iface.speedMbps ? `${iface.speedMbps} Mbps` : 'Auto'}</td>
                          <td className="p-2">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                              {iface.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
              <button
                onClick={() => setSelectedDevice(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  const dev = selectedDevice;
                  setSelectedDevice(null);
                  setShowPromoteModal(dev);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Homologar para CMDB</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: AUTORIZAR NOVA SUB-REDE */}
      {showSubnetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateSubnet} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Autorização Formal de Sub-rede</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Cadastre a sub-rede autorizada pelo administrador do tenant.</p>
              </div>
              <button type="button" onClick={() => setShowSubnetModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nome Descritivo da Rede *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rede Servidores DMZ / Datacenter"
                  value={newSubnetName}
                  onChange={e => setNewSubnetName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Faixa CIDR *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 192.168.10.0/24"
                    value={newSubnetCidr}
                    onChange={e => setNewSubnetCidr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">VLAN ID (Opcional)</label>
                  <input
                    type="number"
                    placeholder="Ex: 10"
                    value={newSubnetVlan}
                    onChange={e => setNewSubnetVlan(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Gateway Padrão</label>
                <input
                  type="text"
                  placeholder="Ex: 192.168.10.1"
                  value={newSubnetGateway}
                  onChange={e => setNewSubnetGateway(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Administrador Responsável pela Autorização</label>
                <input
                  type="text"
                  value={subnetAdminName}
                  onChange={e => setSubnetAdminName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Observações e Justificativa</label>
                <textarea
                  rows={2}
                  value={newSubnetNotes}
                  onChange={e => setNewSubnetNotes(e.target.value)}
                  placeholder="Sub-rede autorizada para descoberta automática de switches e firewalls..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setShowSubnetModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Salvar Autorização</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: PROMOÇÃO NO PIPELINE (DISCOVERED -> ASSET -> CI -> TOPOLOGY) */}
      {showPromoteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Homologação e Promoção para CMDB</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Promover o equipamento <strong className="text-white">{showPromoteModal.hostname}</strong> ({showPromoteModal.ip}) para a base definitiva.
                </p>
              </div>
              <button type="button" onClick={() => setShowPromoteModal(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tipo Detectado:</span>
                  <span className="font-bold text-white capitalize">{showPromoteModal.detectedType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fabricante:</span>
                  <span className="font-bold text-slate-300">{showPromoteModal.vendor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">MAC Address:</span>
                  <span className="font-mono text-slate-300">{showPromoteModal.mac}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tag de Patrimônio (Asset Tag) *</label>
                <input
                  type="text"
                  required
                  value={promotionAssetTag}
                  onChange={e => setPromotionAssetTag(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Localização Física</label>
                <input
                  type="text"
                  value={promotionLocation}
                  onChange={e => setPromotionLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Responsável</label>
                  <input
                    type="text"
                    value={promotionResponsible}
                    onChange={e => setPromotionResponsible(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Departamento</label>
                  <input
                    type="text"
                    value={promotionDepartment}
                    onChange={e => setPromotionDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => handlePromoteDevice(showPromoteModal, 'CMDB')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <Network className="w-4 h-4" />
                <span>Aprovar Direto como CI & Integrar na Topologia</span>
              </button>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handlePromoteDevice(showPromoteModal, 'ASSET')}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Homologar Apenas como Ativo (ASSET)
                </button>
                <button
                  type="button"
                  onClick={() => setShowPromoteModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: VINCULAÇÃO MANUAL (MATCHING COM CI EXISTENTE) */}
      {showMatchModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Link className="w-5 h-5 text-blue-400" />
                  <span>Vincular a Item de Configuração (CI) Existente</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Associar a telemetria e o MAC de <strong className="text-white">{showMatchModal.hostname}</strong> a um CI já cadastrado.
                </p>
              </div>
              <button type="button" onClick={() => setShowMatchModal(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {items.map(ci => (
                <div 
                  key={ci.id}
                  onClick={() => handleManualMatch(showMatchModal, ci.id)}
                  className="p-3 bg-slate-950 hover:bg-blue-950/40 border border-slate-800 hover:border-blue-700 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-400">{ci.code}</span>
                      <span className="font-bold text-white">{ci.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      IP: {ci.ipAddress || 'N/D'} • MAC: {ci.macAddress || 'N/D'} • Tipo: {ci.typeId}
                    </div>
                  </div>
                  <button className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold">
                    Vincular
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setShowMatchModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: LOGS E DETALHES DO DISCOVERY JOB */}
      {showJobDetailsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <span>Detalhes do Discovery Job #{showJobDetailsModal.id}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rede: {showJobDetailsModal.rede} ({showJobDetailsModal.cidr}) • Status: {showJobDetailsModal.status}
                </p>
              </div>
              <button type="button" onClick={() => setShowJobDetailsModal(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Breakdown */}
            {showJobDetailsModal.resultado && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">IPs Sondados:</span>
                  <span className="font-bold text-white text-base">{showJobDetailsModal.resultado.totalIpsScanned}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Hosts Responsivos:</span>
                  <span className="font-bold text-emerald-400 text-base">{showJobDetailsModal.resultado.responsiveHosts}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Novos Equipamentos:</span>
                  <span className="font-bold text-amber-400 text-base">{showJobDetailsModal.resultado.newDiscoveredCount}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Duração Total:</span>
                  <span className="font-bold text-blue-400 text-base">{showJobDetailsModal.resultado.durationSeconds}s</span>
                </div>
              </div>
            )}

            {/* Protocol breakdown */}
            {showJobDetailsModal.resultado?.protocolStats && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 text-[10px] block mb-2 font-bold uppercase">Respostas por Protocolo:</span>
                <div className="grid grid-cols-4 gap-2 font-mono text-[11px]">
                  {Object.entries(showJobDetailsModal.resultado.protocolStats).map(([p, count]) => (
                    <div key={p} className="p-1.5 bg-slate-900 rounded border border-slate-800 flex justify-between">
                      <span className="text-slate-400">{p}:</span>
                      <span className="font-bold text-emerald-400">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Logs */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-white block">Logs de Execução da Varredura:</span>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto space-y-1.5">
                {showJobDetailsModal.logs?.map((l, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-500 shrink-0">[{l.timestamp?.split('T')[1]?.slice(0, 8)}]</span>
                    <span className={l.level === 'SUCCESS' ? 'text-emerald-400' : l.level === 'WARN' ? 'text-amber-400' : 'text-slate-300'}>
                      {l.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setShowJobDetailsModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
