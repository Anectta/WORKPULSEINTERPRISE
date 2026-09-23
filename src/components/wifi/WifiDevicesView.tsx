import React, { useState } from 'react';
import {
  Smartphone,
  Laptop,
  Printer,
  Tv,
  Server,
  Camera,
  Cpu,
  Search,
  RefreshCw,
  Router,
  Wifi,
  Radio,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building
} from 'lucide-react';
import {
  WifiLanDevice,
  WifiDeviceType
} from '../../types/wifiPulse';

interface WifiDevicesViewProps {
  devices: WifiLanDevice[];
  isScanning: boolean;
  onScanNow: () => void;
}

export const WifiDevicesView: React.FC<WifiDevicesViewProps> = ({
  devices,
  isScanning,
  onScanNow
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('Todos');

  const getDeviceIcon = (type: WifiDeviceType) => {
    switch (type) {
      case 'Router':
        return <Router className="w-4 h-4 text-cyan-500" />;
      case 'Laptop':
        return <Laptop className="w-4 h-4 text-blue-500" />;
      case 'Smartphone':
        return <Smartphone className="w-4 h-4 text-emerald-500" />;
      case 'Printer':
        return <Printer className="w-4 h-4 text-amber-500" />;
      case 'SmartTV':
        return <Tv className="w-4 h-4 text-purple-500" />;
      case 'Server':
        return <Server className="w-4 h-4 text-indigo-500" />;
      case 'IPCamera':
        return <Camera className="w-4 h-4 text-rose-500" />;
      default:
        return <Cpu className="w-4 h-4 text-slate-500" />;
    }
  };

  const filteredDevices = devices.filter(dev => {
    const matchQuery =
      dev.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dev.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dev.mac.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dev.vendor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = selectedType === 'Todos' || dev.deviceType === selectedType;
    return matchQuery && matchType;
  });

  const types = ['Todos', ...Array.from(new Set(devices.map(d => d.deviceType)))];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-blue-500" />
            <span>Descoberta de Dispositivos na Rede Local (LAN / Sub-rede)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mapeamento ativo via ARP, mDNS, SSDP e consulta OUI de fabricantes.
          </p>
        </div>

        <button
          onClick={onScanNow}
          disabled={isScanning}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Varrendo Sub-rede...' : 'Varredura ARP Completa'}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total de Hosts</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
            {devices.length}
          </p>
          <span className="text-[10px] text-slate-400">Dispositivos detectados</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Hosts Online</span>
          <p className="text-2xl font-black text-emerald-500 font-mono mt-1">
            {devices.filter(d => d.status === 'ONLINE').length}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Respondendo ao ping</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Computadores / PCs</span>
          <p className="text-2xl font-black text-blue-500 font-mono mt-1">
            {devices.filter(d => d.deviceType === 'Laptop' || d.deviceType === 'Server').length}
          </p>
          <span className="text-[10px] text-slate-400">Workstations e servidores</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400">Móbile & IoT</span>
          <p className="text-2xl font-black text-purple-500 font-mono mt-1">
            {devices.filter(d => d.deviceType === 'Smartphone' || d.deviceType === 'IoT' || d.deviceType === 'SmartTV' || d.deviceType === 'Printer').length}
          </p>
          <span className="text-[10px] text-slate-400">Dispositivos sem fio</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por Hostname, IP (192.168.1.x), MAC ou Fabricante..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedType === t
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Dispositivo / Hostname</th>
                <th className="py-3 px-4">Endereço IP</th>
                <th className="py-3 px-4">Endereço MAC</th>
                <th className="py-3 px-4">Fabricante (NIC)</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Latência LAN</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-200">
              {filteredDevices.map((dev) => {
                const isGateway = dev.isGateway;
                const isThisHost = dev.isThisDevice;

                return (
                  <tr
                    key={dev.id}
                    className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
                      isThisHost ? 'bg-cyan-500/5 dark:bg-cyan-950/20' : isGateway ? 'bg-purple-500/5 dark:bg-purple-950/20' : ''
                    }`}
                  >
                    {/* Hostname */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          {getDeviceIcon(dev.deviceType)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {dev.hostname}
                            </span>
                            {isThisHost && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-400/30 uppercase">
                                Este Host
                              </span>
                            )}
                            {isGateway && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-400/30 uppercase">
                                Gateway / AP
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">Visto às {dev.lastSeen}</span>
                        </div>
                      </div>
                    </td>

                    {/* IP */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {dev.ip}
                    </td>

                    {/* MAC */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {dev.mac}
                    </td>

                    {/* Vendor */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px]">{dev.vendor}</span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {dev.deviceType}
                      </span>
                    </td>

                    {/* Latency */}
                    <td className="py-3 px-4 font-mono font-bold">
                      <span className={dev.latencyMs <= 5 ? 'text-emerald-500' : dev.latencyMs <= 20 ? 'text-amber-500' : 'text-red-500'}>
                        {dev.latencyMs} ms
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Online</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
