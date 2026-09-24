import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, 
  Search, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Monitor, 
  Server, 
  Printer, 
  Router as RouterIcon, 
  Shield, 
  Download, 
  ExternalLink, 
  Folder, 
  Copy, 
  Check, 
  Wifi, 
  HardDrive, 
  Radio, 
  Sliders, 
  Activity, 
  ArrowRight,
  Database
} from 'lucide-react';
import { LiveDiscoveredDevice, LiveScanResult, CIType, DiscoveredDevice } from '../../types/cmdb';

interface LiveNetworkScannerTabProps {
  currentTenant: string;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshCis?: () => void;
  onPromoteDevice?: (device: DiscoveredDevice) => void;
}

export const LiveNetworkScannerTab: React.FC<LiveNetworkScannerTabProps> = ({
  currentTenant,
  showToast,
  onRefreshCis,
  onPromoteDevice
}) => {
  // Configurações do Scan
  const [targetRange, setTargetRange] = useState<string>('10.0.0.1-10.0.0.254');
  const [detectedInterfaces, setDetectedInterfaces] = useState<any[]>([]);
  const [concurrency, setConcurrency] = useState<number>(25);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);

  // Resultados
  const [scanResult, setScanResult] = useState<LiveScanResult | null>(null);
  const [devices, setDevices] = useState<LiveDiscoveredDevice[]>([]);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'SMB' | 'RDP' | 'WEB'>('ALL');
  
  // Feedback e Interações
  const [wolSendingMac, setWolSendingMac] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [promotingIp, setPromotingIp] = useState<string | null>(null);

  // 1. Detectar interfaces de rede locais ao montar
  useEffect(() => {
    const fetchInterfaces = async () => {
      try {
        const res = await fetch('/api/v1/cmdb/discovery/interfaces', {
          headers: { 'x-tenant-id': currentTenant }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.interfaces && data.interfaces.length > 0) {
            setDetectedInterfaces(data.interfaces);
            const first = data.interfaces[0];
            if (first.suggestedRange) {
              setTargetRange(`${first.suggestedRange.startIp}-${first.suggestedRange.endIp}`);
            } else if (first.cidr) {
              setTargetRange(first.cidr);
            }
          }
        }
      } catch (e) {
        console.warn('Falha ao detectar interfaces locais:', e);
      }
    };
    fetchInterfaces();
  }, [currentTenant]);

  // 2. Executar Varredura em Tempo Real
  const handleExecuteScan = async () => {
    if (!targetRange.trim()) {
      showToast('Digite uma faixa de IP ou CIDR para escanear.', 'error');
      return;
    }

    setIsScanning(true);
    setScanProgress(10);

    const progressTimer = setInterval(() => {
      setScanProgress(p => (p < 90 ? p + 10 : p));
    }, 400);

    try {
      const res = await fetch('/api/v1/cmdb/discovery/live-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant
        },
        body: JSON.stringify({
          targetRange: targetRange.trim(),
          concurrency
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro na execução da varredura.');
      }

      setScanProgress(100);
      setScanResult(data.result);
      setDevices(data.result.devices || []);
      showToast(data.message || `Varredura concluída. ${data.result.totalOnline} hosts encontrados.`, 'success');
      if (onRefreshCis) onRefreshCis();
    } catch (err: any) {
      showToast(err.message || 'Erro ao executar o escaneamento.', 'error');
    } finally {
      clearInterval(progressTimer);
      setTimeout(() => {
        setIsScanning(false);
      }, 500);
    }
  };

  // 3. Enviar Wake-on-LAN (WOL)
  const handleSendWol = async (mac: string, ip: string) => {
    if (!mac || mac === '00:00:00:00:00:00') {
      showToast(`Não é possível enviar Wake-on-LAN: endereço MAC ausente para ${ip}.`, 'error');
      return;
    }

    setWolSendingMac(mac);
    try {
      const res = await fetch('/api/v1/cmdb/discovery/wol', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant
        },
        body: JSON.stringify({ mac })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao enviar pacote WOL');

      showToast(`⚡ Pacote Magic Packet Wake-on-LAN enviado para ${mac} (${ip})!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao enviar Wake-on-LAN', 'error');
    } finally {
      setWolSendingMac(null);
    }
  };

  // 4. Copiar IP ou Caminho para a Área de Transferência
  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(identifier);
    showToast(`Copiado: ${text}`, 'info');
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // 5. Exportar Resultados em CSV
  const handleExportCsv = () => {
    if (devices.length === 0) {
      showToast('Nenhum dado para exportar. Execute uma varredura primeiro.', 'info');
      return;
    }

    const headers = ['Status', 'IP', 'Hostname', 'MAC', 'Fabricante', 'Tipo', 'Portas Abertas', 'SMB', 'RDP', 'Web', 'SSH', 'Tempo Resposta (ms)', 'Data'];
    const rows = devices.map(d => [
      d.status,
      d.ip,
      `"${d.hostname || ''}"`,
      d.mac,
      `"${d.vendor || ''}"`,
      d.deviceType,
      `"${d.openPorts.join(', ')}"`,
      d.hasSharedFolders ? 'SIM' : 'NAO',
      d.hasRdp ? 'SIM' : 'NAO',
      d.hasWeb ? 'SIM' : 'NAO',
      d.hasSsh ? 'SIM' : 'NAO',
      d.responseTimeMs,
      d.lastSeen
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `varredura_rede_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Relatório CSV da varredura exportado com sucesso!', 'success');
  };

  // 6. Promover Dispositivo para o CMDB com 1 clique
  const handleQuickPromote = async (device: LiveDiscoveredDevice) => {
    setPromotingIp(device.ip);
    try {
      const res = await fetch('/api/v1/cmdb/discovery/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant
        },
        body: JSON.stringify({
          deviceId: `dev-${device.ip.replace(/\./g, '-')}`,
          targetStage: 'CI',
          customCi: {
            asset: `ATV-${device.hostname.toUpperCase().slice(0, 12)}`,
            location: 'Rede Corporativa / Varredura Automática',
            responsible: 'Equipe de Infraestrutura de TI',
            department: 'Tecnologia da Informação'
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao promover para CMDB');

      showToast(`Equipamento ${device.hostname} (${device.ip}) importado e integrado ao CMDB com sucesso!`, 'success');
      if (onRefreshCis) onRefreshCis();
    } catch (err: any) {
      showToast(err.message || 'Erro ao promover dispositivo', 'error');
    } finally {
      setPromotingIp(null);
    }
  };

  // Dispositivos filtrados
  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const matchSearch = searchTerm === '' ||
        d.ip.includes(searchTerm) ||
        d.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.mac.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.vendor.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === 'ONLINE') return d.status === 'ONLINE';
      if (statusFilter === 'SMB') return d.hasSharedFolders;
      if (statusFilter === 'RDP') return d.hasRdp;
      if (statusFilter === 'WEB') return d.hasWeb;

      return true;
    });
  }, [devices, searchTerm, statusFilter]);

  // Ícone por tipo de equipamento
  const getDeviceIcon = (type: CIType) => {
    switch (type) {
      case 'server': return <Server className="w-4 h-4 text-blue-400" />;
      case 'printer': return <Printer className="w-4 h-4 text-orange-400" />;
      case 'router': return <RouterIcon className="w-4 h-4 text-purple-400" />;
      case 'switch': return <Layers className="w-4 h-4 text-emerald-400" />;
      case 'firewall': return <Shield className="w-4 h-4 text-amber-400" />;
      default: return <Monitor className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. BARRA DE CONTROLE DO SCANNER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span>Varredura de Rede em Tempo Real (IP Scanner)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                Nativo & Ultrarrápido
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Varredura de sub-redes locais em segundos, detecção de portas (SMB, RDP, Web, SSH), fabricante via OUI, NetBIOS e Wake-on-LAN integrado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {detectedInterfaces.length > 0 && (
              <button
                onClick={() => {
                  const iface = detectedInterfaces[0];
                  if (iface.suggestedRange) {
                    setTargetRange(`${iface.suggestedRange.startIp}-${iface.suggestedRange.endIp}`);
                  } else if (iface.cidr) {
                    setTargetRange(iface.cidr);
                  }
                  showToast(`Sub-rede local selecionada: ${iface.name} (${iface.ip})`, 'info');
                }}
                className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Detectar automaticamente a faixa de IP da placa de rede local"
              >
                <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                <span>Minha Sub-rede ({detectedInterfaces[0]?.name || 'Local'})</span>
              </button>
            )}

            <button
              onClick={handleExportCsv}
              disabled={devices.length === 0}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Exportar dispositivos encontrados para arquivo CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handleExecuteScan}
              disabled={isScanning}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer ${
                isScanning
                  ? 'bg-amber-700 text-white cursor-not-allowed opacity-90'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-amber-950'
              }`}
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Varrendo ({scanProgress}%)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                  <span>Iniciar Varredura</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Linha de Inputs e Parâmetros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <span>Faixa de IPs / CIDR:</span>
              <span className="text-[10px] text-slate-500 font-normal">(ex: 192.168.1.1-192.168.1.254 ou 10.0.0.0/24)</span>
            </label>
            <input
              type="text"
              value={targetRange}
              onChange={e => setTargetRange(e.target.value)}
              placeholder="10.0.0.1 - 10.0.0.254"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Concorrência de Sockets:</label>
            <select
              value={concurrency}
              onChange={e => setConcurrency(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-200 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
            >
              <option value={10}>10 Threads (Modo Furtivo / Leve)</option>
              <option value={25}>25 Threads (Recomendado / Balanceado)</option>
              <option value={50}>50 Threads (Ultrarrápido / Turbo)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Portas Inspecionadas:</label>
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-400 truncate flex items-center justify-between">
              <span>80, 443, 445 (SMB), 3389 (RDP), 22 (SSH), 9100</span>
              <span className="text-emerald-400 font-bold text-[10px]">6 Essenciais</span>
            </div>
          </div>
        </div>

        {/* Barra de Progresso Animada */}
        {isScanning && (
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div 
              className="bg-amber-400 h-full transition-all duration-300 rounded-full shadow-sm"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* 2. CARDS DE RESUMO E ESTATÍSTICAS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold">Total Escaneados</span>
            <Activity className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-xl font-mono font-extrabold text-white">
            {scanResult ? scanResult.totalScanned : 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {scanResult ? `${scanResult.durationMs}ms de varredura` : 'Pronto para escanear'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold">Dispositivos Online</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-mono font-extrabold text-emerald-400">
            {devices.filter(d => d.status === 'ONLINE').length}
          </div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5">Hosts ativos na rede</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold">Pastas SMB (445)</span>
            <Folder className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-mono font-extrabold text-blue-400">
            {devices.filter(d => d.hasSharedFolders).length}
          </div>
          <div className="text-[10px] text-blue-500/80 mt-0.5">Compartilhamentos ativos</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold">Acesso RDP (3389)</span>
            <Monitor className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-mono font-extrabold text-purple-400">
            {devices.filter(d => d.hasRdp).length}
          </div>
          <div className="text-[10px] text-purple-500/80 mt-0.5">Desktop remoto habilitado</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold">Servidores Web</span>
            <ExternalLink className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-mono font-extrabold text-amber-400">
            {devices.filter(d => d.hasWeb).length}
          </div>
          <div className="text-[10px] text-amber-500/80 mt-0.5">HTTP/HTTPS (Portas 80/443)</div>
        </div>
      </div>

      {/* 3. BARRA DE FILTROS E PESQUISA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: `Todos (${devices.length})` },
            { id: 'ONLINE', label: `Online (${devices.filter(d => d.status === 'ONLINE').length})` },
            { id: 'SMB', label: `Pastas SMB (${devices.filter(d => d.hasSharedFolders).length})` },
            { id: 'RDP', label: `RDP Remoto (${devices.filter(d => d.hasRdp).length})` },
            { id: 'WEB', label: `Web (${devices.filter(d => d.hasWeb).length})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === f.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por IP, Hostname, MAC, Fabricante..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
      </div>

      {/* 4. TABELA DE RESULTADOS DO SCAN EM TEMPO REAL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Status / Latência</th>
                <th className="py-3 px-4">Endereço IP</th>
                <th className="py-3 px-4">Nome do Host (NetBIOS/DNS)</th>
                <th className="py-3 px-4">MAC & Fabricante</th>
                <th className="py-3 px-4">Portas Abertas / Serviços</th>
                <th className="py-3 px-4 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                    {isScanning ? (
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                        <span className="font-bold text-slate-300">Escaneando a rede em segundo plano...</span>
                        <span className="text-xs text-slate-500">Testando conexões e identificando equipamentos</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Zap className="w-8 h-8 text-slate-600" />
                        <span className="font-bold text-slate-400">Nenhum dispositivo encontrado na faixa selecionada.</span>
                        <span className="text-xs text-slate-500">Clique em "Iniciar Varredura" para sondar a sub-rede.</span>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev) => (
                  <tr key={dev.ip} className="hover:bg-slate-800/40 transition-colors">
                    {/* Status / Latency */}
                    <td className="py-3 px-4 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <div>
                          <span className="font-bold text-xs text-white">ONLINE</span>
                          <div className="text-[10px] text-slate-400 font-mono">{dev.responseTimeMs} ms</div>
                        </div>
                      </div>
                    </td>

                    {/* Endereço IP */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{dev.ip}</span>
                        <button
                          onClick={() => handleCopy(dev.ip, `ip-${dev.ip}`)}
                          className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                          title="Copiar IP"
                        >
                          {copiedIp === `ip-${dev.ip}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    {/* Hostname */}
                    <td className="py-3 px-4 font-sans">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-slate-950 border border-slate-800">
                          {getDeviceIcon(dev.deviceType)}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-200 block truncate max-w-[200px]" title={dev.hostname}>
                            {dev.hostname || 'Host Desconhecido'}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">{dev.deviceType}</span>
                        </div>
                      </div>
                    </td>

                    {/* MAC & Fabricante */}
                    <td className="py-3 px-4 font-sans">
                      <div className="space-y-0.5">
                        <div className="font-mono text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
                          <span>{dev.mac !== '00:00:00:00:00:00' ? dev.mac : 'Não resolvido via ARP'}</span>
                        </div>
                        <div className="text-[11px] text-amber-400/90 font-medium truncate max-w-[180px]" title={dev.vendor}>
                          {dev.vendor}
                        </div>
                      </div>
                    </td>

                    {/* Portas / Serviços */}
                    <td className="py-3 px-4 font-sans">
                      <div className="flex flex-wrap gap-1 max-w-[260px]">
                        {dev.openPorts.length === 0 ? (
                          <span className="text-[10px] text-slate-500">Sem portas abertas</span>
                        ) : (
                          dev.openPorts.map(p => (
                            <span
                              key={p}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                p === 445 || p === 139 ? 'bg-blue-950 text-blue-300 border-blue-800' :
                                p === 3389 ? 'bg-purple-950 text-purple-300 border-purple-800' :
                                p === 80 || p === 443 || p === 8080 ? 'bg-amber-950 text-amber-300 border-amber-800' :
                                p === 22 ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                                p === 9100 ? 'bg-orange-950 text-orange-300 border-orange-800' :
                                'bg-slate-950 text-slate-300 border-slate-800'
                              }`}
                              title={dev.services[p] || `Porta TCP ${p}`}
                            >
                              {p} {p === 445 ? 'SMB' : p === 3389 ? 'RDP' : p === 80 ? 'HTTP' : p === 443 ? 'HTTPS' : p === 22 ? 'SSH' : ''}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Ações Rápidas */}
                    <td className="py-3 px-4 font-sans text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Wake-on-LAN */}
                        {dev.mac && dev.mac !== '00:00:00:00:00:00' && (
                          <button
                            onClick={() => handleSendWol(dev.mac, dev.ip)}
                            disabled={wolSendingMac === dev.mac}
                            className="p-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-400 border border-amber-800 transition-colors cursor-pointer disabled:opacity-50"
                            title="Enviar Wake-on-LAN (Ligar computador via rede)"
                          >
                            <Zap className="w-3.5 h-3.5 fill-amber-400" />
                          </button>
                        )}

                        {/* RDP Link */}
                        {dev.hasRdp && (
                          <button
                            onClick={() => handleCopy(`mstsc /v:${dev.ip}`, `rdp-${dev.ip}`)}
                            className="p-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 text-purple-400 border border-purple-800 transition-colors cursor-pointer"
                            title="Copiar comando de conexão RDP (mstsc /v:ip)"
                          >
                            <Monitor className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Pastas Compartilhadas SMB */}
                        {dev.hasSharedFolders && (
                          <button
                            onClick={() => handleCopy(`\\\\${dev.ip}`, `smb-${dev.ip}`)}
                            className="p-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 text-blue-400 border border-blue-800 transition-colors cursor-pointer"
                            title="Copiar caminho de compartilhamento Windows (\\ip)"
                          >
                            <Folder className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Servidor Web */}
                        {dev.hasWeb && (
                          <a
                            href={dev.openPorts.includes(443) ? `https://${dev.ip}` : `http://${dev.ip}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                            title="Abrir página web do dispositivo em nova aba"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Promover para CI do CMDB */}
                        <button
                          onClick={() => handleQuickPromote(dev)}
                          disabled={promotingIp === dev.ip}
                          className="px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                          title="Importar este dispositivo descoberto diretamente como Item de Configuração (CI) no CMDB"
                        >
                          {promotingIp === dev.ip ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Database className="w-3 h-3" />
                          )}
                          <span>CMDB</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
