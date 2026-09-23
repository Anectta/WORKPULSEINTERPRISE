import React, { useState } from 'react';
import {
  Radio,
  Search,
  Filter,
  ArrowUpDown,
  Lock,
  Wifi,
  CheckCircle2,
  RefreshCw,
  Building,
  Info,
  Shield,
  Layers,
  Cpu,
  Zap,
  ArrowRight
} from 'lucide-react';
import {
  WifiScannedNetwork,
  WifiBand
} from '../../types/wifiPulse';

interface WifiScannerViewProps {
  networks: WifiScannedNetwork[];
  isScanning: boolean;
  onScanNow: () => void;
  onSwitchNetwork?: (network: WifiScannedNetwork) => void;
}

export const WifiScannerView: React.FC<WifiScannerViewProps> = ({
  networks,
  isScanning,
  onScanNow,
  onSwitchNetwork
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBand, setSelectedBand] = useState<WifiBand | 'Todas'>('Todas');
  const [sortBy, setSortBy] = useState<'rssi' | 'channel' | 'ssid' | 'width'>('rssi');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredNetworks = networks
    .filter(net => {
      const matchQuery =
        net.ssid.toLowerCase().includes(searchQuery.toLowerCase()) ||
        net.bssid.toLowerCase().includes(searchQuery.toLowerCase()) ||
        net.vendor.toLowerCase().includes(searchQuery.toLowerCase());
      const matchBand = selectedBand === 'Todas' || net.band === selectedBand;
      return matchQuery && matchBand;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'rssi') {
        comparison = a.rssi - b.rssi;
      } else if (sortBy === 'channel') {
        comparison = a.channel - b.channel;
      } else if (sortBy === 'ssid') {
        comparison = a.ssid.localeCompare(b.ssid);
      } else if (sortBy === 'width') {
        comparison = a.channelWidthMhz - b.channelWidthMhz;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const getRssiColor = (rssi: number) => {
    if (rssi >= -55) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (rssi >= -67) return 'text-teal-500 bg-teal-500/10 border-teal-500/20';
    if (rssi >= -75) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-red-500 bg-red-500/10 border-red-500/20';
  };

  const counts = {
    all: networks.length,
    b24: networks.filter(n => n.band === '2.4 GHz').length,
    b5: networks.filter(n => n.band === '5 GHz').length,
    b6: networks.filter(n => n.band === '6 GHz').length
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Radio className="w-5 h-5 text-cyan-500" />
            <span>Scanner de Redes Wi-Fi Próximas</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Varredura 802.11 em tempo real com identificação de BSSID, fabricante de AP, largura de canal e comutação direta.
          </p>
        </div>

        <button
          onClick={onScanNow}
          disabled={isScanning}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Atualizando Varredura...' : 'Atualizar Varredura'}</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por SSID, BSSID (MAC) ou Fabricante (Cisco, Ubiquiti, Aruba)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Band Filters Pills */}
        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setSelectedBand('Todas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedBand === 'Todas'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Todas ({counts.all})
          </button>
          <button
            onClick={() => setSelectedBand('5 GHz')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedBand === '5 GHz'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            5 GHz ({counts.b5})
          </button>
          <button
            onClick={() => setSelectedBand('2.4 GHz')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedBand === '2.4 GHz'
                ? 'bg-purple-500 text-white font-black shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            2.4 GHz ({counts.b24})
          </button>
          <button
            onClick={() => setSelectedBand('6 GHz')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedBand === '6 GHz'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            6 GHz ({counts.b6})
          </button>
        </div>
      </div>

      {/* Networks Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => { setSortBy('ssid'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  <div className="flex items-center space-x-1">
                    <span>SSID / Rede</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">BSSID (MAC)</th>
                <th className="py-3 px-4">Fabricante (AP)</th>
                <th className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => { setSortBy('channel'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  <div className="flex items-center space-x-1">
                    <span>Banda & Canal</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Largura</th>
                <th className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white" onClick={() => { setSortBy('rssi'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                  <div className="flex items-center space-x-1">
                    <span>Sinal (RSSI)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Segurança</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredNetworks.map(net => {
                const isCurrent = net.isCurrent;
                const rssiStyle = getRssiColor(net.rssi);

                return (
                  <tr
                    key={net.id}
                    className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
                      isCurrent ? 'bg-cyan-500/5 dark:bg-cyan-950/20' : ''
                    }`}
                  >
                    {/* SSID */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isCurrent 
                            ? 'bg-cyan-500 text-slate-950 font-black' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          <Wifi className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {net.ssid}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-400/30 uppercase">
                                Conectado
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {net.frequencyMhz} MHz
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* BSSID */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {net.bssid}
                    </td>

                    {/* Vendor */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5 text-slate-800 dark:text-slate-300">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[160px]">{net.vendor}</span>
                      </div>
                    </td>

                    {/* Band & Channel */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          net.band === '5 GHz'
                            ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                            : net.band === '2.4 GHz'
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        }`}>
                          {net.band}
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          Ch {net.channel}
                        </span>
                      </div>
                    </td>

                    {/* Channel Width */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-400">
                      {net.channelWidthMhz} MHz
                    </td>

                    {/* RSSI Signal */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded-md font-mono font-black text-xs border ${rssiStyle}`}>
                          {net.rssi} dBm
                        </span>
                        <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${net.rssi >= -60 ? 'bg-emerald-500' : net.rssi >= -75 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, Math.max(10, ((net.rssi + 100) / 70) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Security */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-300">
                        <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px] text-[11px]">{net.security}</span>
                      </div>
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-4 text-center">
                      {isCurrent ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center justify-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Ativa</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => onSwitchNetwork && onSwitchNetwork(net)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-cyan-600 hover:text-white dark:bg-slate-800 dark:hover:bg-cyan-500 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center space-x-1 cursor-pointer mx-auto"
                          title="Analisar ou Conectar a esta Rede"
                        >
                          <Zap className="w-3 h-3 text-cyan-500 group-hover:text-white" />
                          <span>Analisar</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredNetworks.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nenhuma rede encontrada para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
