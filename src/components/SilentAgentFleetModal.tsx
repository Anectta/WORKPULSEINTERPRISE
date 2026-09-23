import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  X, 
  Search, 
  Download, 
  Terminal, 
  Copy, 
  Check, 
  RefreshCw, 
  Radio, 
  Laptop, 
  Activity, 
  Lock, 
  Unlock, 
  Sliders, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Wifi, 
  FileSpreadsheet, 
  ChevronRight,
  ExternalLink,
  Cpu,
  HardDrive,
  Clock,
  Server,
  Key,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Employee } from '../types';
import { TabType } from './Sidebar';

export interface StationAgentData {
  id: string;
  hostname: string;
  employeeName: string;
  department: string;
  ip: string;
  mac: string;
  agentVersion: string;
  status: 'Online' | 'Ocioso' | 'Alerta' | 'Offline';
  cpuUsage: string;
  ramUsage: string;
  lastPing: string;
  os: string;
  isLocked: boolean;
  policySync: 'Atualizado' | 'Pendente';
  pingMs?: number;
}

interface SilentAgentFleetModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onNavigateToTab?: (tab: TabType) => void;
  onSelectEmployee?: (emp: Employee) => void;
}

export const SilentAgentFleetModal: React.FC<SilentAgentFleetModalProps> = ({
  isOpen,
  onClose,
  employees,
  onNavigateToTab,
  onSelectEmployee
}) => {
  const [activeTab, setActiveTab] = useState<'stations' | 'deploy' | 'settings' | 'telemetry'>('stations');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Online' | 'Ocioso' | 'Alerta' | 'Offline'>('Todos');
  const [departmentFilter, setDepartmentFilter] = useState('Todos');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fleet configuration state
  const [heartbeatInterval, setHeartbeatInterval] = useState('5');
  const [isStealthMode, setIsStealthMode] = useState(true);
  const [isAfterHoursLockEnabled, setIsAfterHoursLockEnabled] = useState(true);
  const [isOfflineBufferEnabled, setIsOfflineBufferEnabled] = useState(true);
  const [idleThreshold, setIdleThreshold] = useState('15');

  // Generate 148 Stations fleet based on employees and mock fleet data
  const [stations, setStations] = useState<StationAgentData[]>(() => {
    const departments = ['Engenharia', 'Desenvolvimento', 'Financeiro', 'Marketing', 'Comercial', 'Recursos Humanos', 'Diretoria'];
    const generated: StationAgentData[] = [];
    
    // First map from actual employees
    employees.forEach((emp, index) => {
      generated.push({
        id: `station-${index + 1}`,
        hostname: emp.pcHostName || `PC-${emp.department.substring(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
        employeeName: emp.name,
        department: emp.department,
        ip: `192.168.1.${10 + index}`,
        mac: `00:1A:2B:3C:${String(index + 10).padStart(2, '0')}:${String((index * 7) % 90 + 10).padStart(2, '0')}`,
        agentVersion: index === 3 ? 'v2.4.7' : 'v2.4.8',
        status: emp.status === 'Ocioso' ? 'Ocioso' : index === 3 ? 'Alerta' : 'Online',
        cpuUsage: `${(0.1 + (index % 5) * 0.1).toFixed(1)}%`,
        ramUsage: `${14 + (index % 6) * 2} MB`,
        lastPing: 'há 2 seg',
        os: 'Windows 11 Pro 23H2 (x64)',
        isLocked: false,
        policySync: index === 3 ? 'Pendente' : 'Atualizado',
        pingMs: 8 + (index % 7) * 2
      });
    });

    // Expand to 148 PCs total for enterprise fleet representation
    const namesList = [
      'Lucas Andrade', 'Juliana Rocha', 'Bruno Castro', 'Fernanda Lima', 'Thiago Mendes',
      'Camila Duarte', 'Rodrigo Barros', 'Patrícia Farias', 'Marcelo Vieira', 'Tatiane Ramos',
      'Diego Nogueira', 'Vanessa Borges', 'Felipe Guimarães', 'Sabrina Neves', 'Alexandre Pires',
      'Renata Silveira', 'Danilo Fonseca', 'Mariana Peixoto', 'Gustavo Meireles', 'Aline Prado'
    ];

    while (generated.length < 148) {
      const idx = generated.length + 1;
      const dept = departments[idx % departments.length];
      const name = namesList[idx % namesList.length] + ` (Estação ${idx})`;
      const isIdle = idx % 28 === 0;
      const isAlert = idx === 42 || idx === 115;
      
      generated.push({
        id: `station-${idx}`,
        hostname: `PC-${dept.substring(0, 3).toUpperCase()}-${String(idx).padStart(3, '0')}`,
        employeeName: name,
        department: dept,
        ip: `192.168.${Math.floor(idx / 50) + 1}.${(idx % 240) + 10}`,
        mac: `00:1A:2B:${String((idx * 3) % 90 + 10).padStart(2, '0')}:${String((idx * 5) % 90 + 10).padStart(2, '0')}:${String((idx * 7) % 90 + 10).padStart(2, '0')}`,
        agentVersion: isAlert ? 'v2.4.7' : 'v2.4.8',
        status: isIdle ? 'Ocioso' : isAlert ? 'Alerta' : 'Online',
        cpuUsage: `${(0.1 + (idx % 4) * 0.1).toFixed(1)}%`,
        ramUsage: `${15 + (idx % 8) * 1.5} MB`,
        lastPing: `há ${(idx % 5) + 1} seg`,
        os: idx % 12 === 0 ? 'macOS Sonoma (M2/M3)' : idx % 25 === 0 ? 'Ubuntu 24.04 LTS' : 'Windows 11 Pro (x64)',
        isLocked: false,
        policySync: isAlert ? 'Pendente' : 'Atualizado',
        pingMs: 7 + (idx % 12)
      });
    }

    return generated;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    showToast('Copiado para a área de transferência!');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handlePingStation = (id: string, hostname: string) => {
    setPingingId(id);
    setTimeout(() => {
      setPingingId(null);
      const randomMs = Math.floor(Math.random() * 8) + 6;
      setStations(prev => prev.map(s => s.id === id ? { ...s, pingMs: randomMs, lastPing: 'agora mesmo' } : s));
      showToast(`Ping em ${hostname} concluído: ${randomMs}ms (Latência Excelente • Conectado via TLS 1.3)`);
    }, 700);
  };

  const handleForceSyncStation = (id: string, hostname: string) => {
    setSyncingId(id);
    setTimeout(() => {
      setSyncingId(null);
      setStations(prev => prev.map(s => s.id === id ? { ...s, policySync: 'Atualizado', status: s.status === 'Alerta' ? 'Online' : s.status } : s));
      showToast(`Políticas de segurança sincronizadas com sucesso em ${hostname}!`);
    }, 800);
  };

  const handleToggleLockStation = (id: string, hostname: string) => {
    setStations(prev => prev.map(s => {
      if (s.id === id) {
        const nextState = !s.isLocked;
        showToast(nextState 
          ? `Estação ${hostname} bloqueada remotamente pelo administrador.`
          : `Estação ${hostname} desbloqueada com sucesso.`
        );
        return { ...s, isLocked: nextState };
      }
      return s;
    }));
  };

  const handleDownloadMsi = () => {
    const blob = new Blob([
      "WorkPulse Silent Agent MSI Installer Package\nVersion: 2.4.8-LTS\nArchitecture: x64/ARM64\nTarget: Active Directory / GPO / Intune\nToken: WP-CORP-TOKEN-994821-SEC\nEncryption: TLS 1.3 End-to-End"
    ], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "WorkPulse_SilentAgent_v2.4.8_x64.msi";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Download do pacote MSI silencioso iniciado com sucesso!');
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Hostname', 'Colaborador', 'Departamento', 'IP', 'MAC', 'Versao_Agente', 'Status', 'CPU', 'RAM', 'Sincronizacao'];
    const rows = stations.map(s => [
      s.id,
      s.hostname,
      `"${s.employeeName}"`,
      `"${s.department}"`,
      s.ip,
      s.mac,
      s.agentVersion,
      s.status,
      s.cpuUsage,
      s.ramUsage,
      s.policySync
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventario_agente_silencioso_148pcs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exportação de 148 estações para CSV gerada com sucesso!');
  };

  // Filtered stations
  const filteredStations = useMemo(() => {
    return stations.filter(s => {
      const matchSearch = 
        s.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.department.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = statusFilter === 'Todos' || s.status === statusFilter;
      const matchDept = departmentFilter === 'Todos' || s.department === departmentFilter;

      return matchSearch && matchStatus && matchDept;
    });
  }, [stations, searchQuery, statusFilter, departmentFilter]);

  const onlineCount = stations.filter(s => s.status === 'Online').length;
  const idleCount = stations.filter(s => s.status === 'Ocioso').length;
  const alertCount = stations.filter(s => s.status === 'Alerta').length;

  const corporateToken = "wp-corp-sec-994821a8-8f82-4e89-a212-32b220199211";
  const powershellCommand = `irm https://get.workpulse.corp/agent.ps1 | iex -Token "${corporateToken}" -Silent`;
  const gpoCommand = `msiexec.exe /i "\\\\srv-dc01\\deploy\\WorkPulse_Agent_v2.4.8.msi" /qn TOKEN="${corporateToken}" SERVER="https://app.workpulse.corp" ALLUSERS=1`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 animate-fadeIn overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl text-slate-900 dark:text-slate-100 relative overflow-hidden">
        
        {/* Toast Notification Banner inside Modal */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white dark:bg-blue-600 px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 dark:border-blue-400 flex items-center space-x-2 text-xs font-bold animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Top Header Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-500/10 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap">
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Central do Agente Silencioso
                </h2>
                <span className="flex items-center text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                  148 PCs Conectados & Ativos
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  v2.4.8-LTS
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Telemetria em tempo real, monitoramento de processos sem keylogger, compliance LGPD e gestão centralizada de frotas.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-center">
            <button
              onClick={handleExportCsv}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
              title="Exportar inventário de 148 computadores"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline">Exportar CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar Central"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Stats Overview Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:px-6 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">Estações Online</span>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{onlineCount} PCs</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <Laptop className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">Ociosidade Detectada</span>
              <div className="text-lg font-black text-amber-600 dark:text-amber-400">{idleCount} PCs</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">Consumo Médio</span>
              <div className="text-lg font-black text-blue-600 dark:text-blue-400">0.2% CPU / 16MB</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">Segurança & LGPD</span>
              <div className="text-lg font-black text-purple-600 dark:text-purple-400">100% Blindado</div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-2 overflow-x-auto">
          {[
            { key: 'stations', label: `🖥️ Estações Ativas (${stations.length})` },
            { key: 'deploy', label: '📥 Implantação & GPO' },
            { key: 'settings', label: '⚙️ Políticas de Telemetria' },
            { key: 'telemetry', label: '📊 Saúde & Logs da Frota' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-3 px-3.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === tab.key
                  ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Main Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* TAB 1: STATIONS FLEET */}
          {activeTab === 'stations' && (
            <div className="space-y-4">
              {/* Filter Controls Bar */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                {/* Search */}
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por PC, Colaborador, IP ou Setor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                {/* Status Badges Filter */}
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-400 uppercase font-mono mr-1">Status:</span>
                  {(['Todos', 'Online', 'Ocioso', 'Alerta'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === st
                          ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {st === 'Online' && '🟢 '}
                      {st === 'Ocioso' && '🟡 '}
                      {st === 'Alerta' && '🔴 '}
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stations Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3 pl-4">Estação / Hostname</th>
                        <th className="p-3">Colaborador / Setor</th>
                        <th className="p-3">IP & Rede</th>
                        <th className="p-3">Agente / Recurso</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Último Ping</th>
                        <th className="p-3 text-right pr-4">Ações Remotas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {filteredStations.slice(0, 15).map(st => (
                        <tr key={st.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-3 pl-4">
                            <div className="flex items-center space-x-2">
                              <Laptop className={`w-4 h-4 ${st.isLocked ? 'text-rose-500' : 'text-emerald-500'}`} />
                              <div>
                                <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                                  <span>{st.hostname}</span>
                                  {st.isLocked && (
                                    <span className="text-[9px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-1 py-0.2 rounded font-bold">
                                      TRAVADO
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">{st.os}</div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="font-bold text-slate-900 dark:text-white">{st.employeeName}</div>
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">{st.department}</div>
                          </td>

                          <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            <div>{st.ip}</div>
                            <div className="text-[10px] text-slate-400">{st.mac}</div>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center space-x-1 font-mono text-slate-800 dark:text-slate-200">
                              <span className="font-bold">{st.agentVersion}</span>
                              <span className="text-[10px] text-slate-400">({st.cpuUsage} CPU)</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{st.ramUsage} RAM</div>
                          </td>

                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              st.status === 'Online'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : st.status === 'Ocioso'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                                st.status === 'Online' ? 'bg-emerald-500' : st.status === 'Ocioso' ? 'bg-amber-500' : 'bg-rose-500'
                              }`} />
                              {st.status}
                            </span>
                          </td>

                          <td className="p-3 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                            {st.pingMs ? `${st.pingMs}ms (${st.lastPing})` : st.lastPing}
                          </td>

                          <td className="p-3 text-right pr-4">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* Ping Button */}
                              <button
                                onClick={() => handlePingStation(st.id, st.hostname)}
                                disabled={pingingId === st.id}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                                title="Testar Ping / Latência"
                              >
                                <Radio className={`w-3.5 h-3.5 ${pingingId === st.id ? 'animate-spin text-emerald-500' : ''}`} />
                              </button>

                              {/* Force Policy Sync */}
                              <button
                                onClick={() => handleForceSyncStation(st.id, st.hostname)}
                                disabled={syncingId === st.id}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-all cursor-pointer"
                                title="Forçar Sincronização de Políticas"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${syncingId === st.id ? 'animate-spin' : ''}`} />
                              </button>

                              {/* Lock / Unlock Screen */}
                              <button
                                onClick={() => handleToggleLockStation(st.id, st.hostname)}
                                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                  st.isLocked 
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}
                                title={st.isLocked ? "Desbloquear Estação" : "Bloquear Estação Remotamente"}
                              >
                                {st.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              </button>

                              {/* View Activity */}
                              {onNavigateToTab && (
                                <button
                                  onClick={() => {
                                    const matchEmp = employees.find(e => e.name.toLowerCase().includes(st.employeeName.split(' ')[0].toLowerCase()));
                                    if (matchEmp && onSelectEmployee) {
                                      onSelectEmployee(matchEmp);
                                    }
                                    onClose();
                                    onNavigateToTab('activity');
                                  }}
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 transition-all cursor-pointer"
                                  title="Ver Linha do Tempo & Logs no Painel"
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer Count */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span>Exibindo <strong>{Math.min(15, filteredStations.length)}</strong> de <strong>{filteredStations.length}</strong> computadores filtrados (Total da Frota: <strong>148 PCs</strong>)</span>
                  <button
                    onClick={handleExportCsv}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center cursor-pointer"
                  >
                    <span>Baixar Lista Completa com 148 Máquinas (.CSV)</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DEPLOY & INSTALLATION */}
          {activeTab === 'deploy' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* MSI Silent Package */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Instalador MSI Silencioso (GPO / AD)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Pacote oficial para implantação corporativa em massa via Active Directory / SCCM / Intune</p>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1 font-mono">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Versão:</span>
                    <strong className="text-slate-900 dark:text-white">v2.4.8-LTS (Build 2026.08)</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Arquitetura:</span>
                    <strong className="text-slate-900 dark:text-white">Windows x64 / ARM64 Nativo</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Tamanho:</span>
                    <strong className="text-slate-900 dark:text-white">12.4 MB</strong>
                  </div>
                </div>

                <button
                  onClick={handleDownloadMsi}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Pacote MSI (WorkPulse_v2.4.8.msi)</span>
                </button>
              </div>

              {/* PowerShell 1-Click Command */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Comando PowerShell (1-Click)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Execute no Terminal / PowerShell como Administrador para registro instantâneo</p>
                  </div>
                </div>

                <div className="relative">
                  <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-slate-800">
                    {powershellCommand}
                  </pre>
                  <button
                    onClick={() => handleCopy(powershellCommand, 'ps_cmd')}
                    className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                    title="Copiar Comando"
                  >
                    {copiedKey === 'ps_cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Token Corporativo Embutido</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">Validade: 30 dias</span>
                </div>
              </div>

              {/* GPO Script Line */}
              <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase font-mono tracking-wider">
                    Linha de Comando para Script de Inicialização GPO (Active Directory)
                  </h4>
                  <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                    Startup Script
                  </span>
                </div>

                <div className="relative">
                  <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-slate-800">
                    {gpoCommand}
                  </pre>
                  <button
                    onClick={() => handleCopy(gpoCommand, 'gpo_cmd')}
                    className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                    title="Copiar Comando GPO"
                  >
                    {copiedKey === 'gpo_cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FLEET SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  <span>Políticas Globais de Telemetria & Proteção</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Stealth Mode */}
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Modo 100% Silencioso (Stealth)</div>
                      <div className="text-[11px] text-slate-500">Oculta qualquer ícone na barra de tarefas para operação invisível</div>
                    </div>
                    <button
                      onClick={() => {
                        setIsStealthMode(!isStealthMode);
                        showToast(`Modo Silencioso ${!isStealthMode ? 'Ativado' : 'Desativado'}`);
                      }}
                      className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                        isStealthMode ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                      }`}
                    >
                      <span className="bg-white w-4 h-4 rounded-full shadow-md" />
                    </button>
                  </div>

                  {/* After Hours PC Lock */}
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Bloqueio Forçado Pós-Expediente</div>
                      <div className="text-[11px] text-slate-500">Bloqueia a estação fora da jornada cadastrada no RH / CLT</div>
                    </div>
                    <button
                      onClick={() => {
                        setIsAfterHoursLockEnabled(!isAfterHoursLockEnabled);
                        showToast(`Bloqueio Pós-Expediente ${!isAfterHoursLockEnabled ? 'Ativado' : 'Desativado'}`);
                      }}
                      className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                        isAfterHoursLockEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                      }`}
                    >
                      <span className="bg-white w-4 h-4 rounded-full shadow-md" />
                    </button>
                  </div>

                  {/* Heartbeat Interval */}
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-900 dark:text-white">Frequência de Heartbeat / Ping:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono">{heartbeatInterval} segundos</span>
                    </div>
                    <select
                      value={heartbeatInterval}
                      onChange={(e) => {
                        setHeartbeatInterval(e.target.value);
                        showToast(`Frequência ajustada para ${e.target.value}s em todas as 148 estações`);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                    >
                      <option value="5">A cada 5 segundos (Tempo Real - Alta Precisão)</option>
                      <option value="15">A cada 15 segundos (Recomendado Corporativo)</option>
                      <option value="30">A cada 30 segundos (Econômico)</option>
                      <option value="60">A cada 60 segundos (Baixa Largura de Banda)</option>
                    </select>
                  </div>

                  {/* Offline Buffer */}
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Buffer Criptografado Offline (72h)</div>
                      <div className="text-[11px] text-slate-500">Armazena logs se a internet cair e sincroniza no retorno</div>
                    </div>
                    <button
                      onClick={() => {
                        setIsOfflineBufferEnabled(!isOfflineBufferEnabled);
                        showToast(`Buffer Offline ${!isOfflineBufferEnabled ? 'Ativado' : 'Desativado'}`);
                      }}
                      className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                        isOfflineBufferEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                      }`}
                    >
                      <span className="bg-white w-4 h-4 rounded-full shadow-md" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TELEMETRY & HEALTH */}
          {activeTab === 'telemetry' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Uptime da Frota</span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">99.94%</div>
                  <p className="text-[11px] text-slate-500">Média de disponibilidade contínua dos agentes locais.</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Eventos Processados Hoje</span>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400">1.482.910</div>
                  <p className="text-[11px] text-slate-500">Alternâncias de janelas, pings de atividade e bloqueios web.</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Bloqueios Efetuados</span>
                  <div className="text-2xl font-black text-purple-600 dark:text-purple-400">48 Bloqueios</div>
                  <p className="text-[11px] text-slate-500">Tentativas de acesso a domínios proibidos neutralizadas.</p>
                </div>
              </div>

              {/* Version distribution */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">Distribuição de Versões do Agente</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">146 em v2.4.8 (98.6%) • 2 em v2.4.7 (1.4%)</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: '98.6%' }} title="v2.4.8 (146 PCs)" />
                  <div className="bg-amber-500 h-full" style={{ width: '1.4%' }} title="v2.4.7 (2 PCs)" />
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span>Todas as estações conectam-se usando TLS 1.3 com criptografia AES-256-GCM.</span>
                  <button
                    onClick={() => {
                      setStations(prev => prev.map(s => ({ ...s, agentVersion: 'v2.4.8', status: s.status === 'Alerta' ? 'Online' : s.status })));
                      showToast('Comando de atualização remota via GPO enviado para todas as máquinas!');
                    }}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    Atualizar Máquinas Desatualizadas Agora
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-4 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Agente Silencioso certificado para conformidade com a LGPD (Lei 13.709/2018).</span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            {onNavigateToTab && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToTab('gpo_lgpd');
                }}
                className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <span>Módulo Completo LGPD & GPO</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Concluir & Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
