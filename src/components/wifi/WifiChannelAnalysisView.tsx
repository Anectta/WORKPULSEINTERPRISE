import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Radio,
  Layers,
  Cpu,
  RefreshCw,
  Info,
  ShieldCheck,
  AlertCircle,
  Zap
} from 'lucide-react';
import {
  WifiChannelAnalysis,
  WifiBand,
  WifiCongestionLevel
} from '../../types/wifiPulse';

interface WifiChannelAnalysisViewProps {
  channels5g: WifiChannelAnalysis[];
  channels24: WifiChannelAnalysis[];
  channels6g: WifiChannelAnalysis[];
  currentChannel: number;
  currentBand: WifiBand;
  isScanning: boolean;
  onScanNow: () => void;
  onApplyChannel?: (channel: number, band: WifiBand) => void;
}

export const WifiChannelAnalysisView: React.FC<WifiChannelAnalysisViewProps> = ({
  channels5g,
  channels24,
  channels6g,
  currentChannel,
  currentBand,
  isScanning,
  onScanNow,
  onApplyChannel
}) => {
  const [selectedBand, setSelectedBand] = useState<WifiBand>(currentBand || '5 GHz');

  const activeChannels = selectedBand === '5 GHz' 
    ? channels5g 
    : selectedBand === '2.4 GHz' 
    ? channels24 
    : channels6g;

  const getCongestionBadge = (level: WifiCongestionLevel) => {
    switch (level) {
      case 'Muito baixo':
        return { bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', label: 'Muito Baixo' };
      case 'Baixo':
        return { bg: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30', label: 'Baixo' };
      case 'Moderado':
        return { bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30', label: 'Moderado' };
      case 'Alto':
        return { bg: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30', label: 'Alto' };
      default:
        return { bg: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30', label: 'Crítico' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-500" />
            <span>Análise Detalhada de Ocupação & Congestionamento de Canais</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Métricas de interferência co-canal e sobreposição espectral calculadas para cada frequência regulatória.
          </p>
        </div>

        <button
          onClick={onScanNow}
          disabled={isScanning}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Analisando...' : 'Reavaliar Canais'}</span>
        </button>
      </div>

      {/* Band Selector Bar */}
      <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
        <button
          onClick={() => setSelectedBand('5 GHz')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
            selectedBand === '5 GHz'
              ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-cyan-500" />
          <span>Banda 5 GHz ({channels5g.length} canais)</span>
        </button>
        <button
          onClick={() => setSelectedBand('2.4 GHz')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
            selectedBand === '2.4 GHz'
              ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-purple-500" />
          <span>Banda 2.4 GHz ({channels24.length} canais)</span>
        </button>
        <button
          onClick={() => setSelectedBand('6 GHz')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
            selectedBand === '6 GHz'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-emerald-500" />
          <span>Banda 6 GHz ({channels6g.length} canais)</span>
        </button>
      </div>

      {/* Channels Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Canal</th>
                <th className="py-3 px-4">Frequência Central</th>
                <th className="py-3 px-4">Redes Detectadas</th>
                <th className="py-3 px-4">Sinal Concorrente Mais Forte</th>
                <th className="py-3 px-4">Nível de Congestionamento</th>
                <th className="py-3 px-4">Interferência Co-canal</th>
                <th className="py-3 px-4">SSIDs Mapeados</th>
                <th className="py-3 px-4 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeChannels.map(ch => {
                const isCurrent = ch.channel === currentChannel && selectedBand === currentBand;
                const badge = getCongestionBadge(ch.congestionLevel);

                return (
                  <tr
                    key={ch.channel}
                    className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
                      isCurrent ? 'bg-cyan-500/5 dark:bg-cyan-950/20' : ''
                    }`}
                  >
                    {/* Channel */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                          Canal {ch.channel}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-400/30 uppercase">
                            Atual
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Freq */}
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                      {ch.centerFreqMhz} MHz
                    </td>

                    {/* Networks count */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-xs ${
                        ch.networksCount === 0
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          : ch.networksCount <= 2
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                      }`}>
                        {ch.networksCount} {ch.networksCount === 1 ? 'rede' : 'redes'}
                      </span>
                    </td>

                    {/* Max RSSI */}
                    <td className="py-3 px-4 font-mono font-bold">
                      {ch.maxRssi > -100 ? (
                        <span className={ch.maxRssi >= -60 ? 'text-emerald-500' : 'text-slate-400'}>
                          {ch.maxRssi} dBm
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </td>

                    {/* Congestion Meter */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              ch.congestionScore <= 20 ? 'bg-emerald-500' :
                              ch.congestionScore <= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.max(5, ch.congestionScore)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Co-channel details */}
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {ch.coChannelInterference === 0 ? (
                        <span className="text-emerald-500 font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Livre</span>
                        </span>
                      ) : (
                        <span className="text-amber-500 font-mono">
                          {ch.coChannelInterference} concorrentes
                        </span>
                      )}
                    </td>

                    {/* Mapped SSIDs */}
                    <td className="py-3 px-4">
                      {ch.networks.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {ch.networks.map((n, idx) => (
                            <span
                              key={idx}
                              className={`px-1.5 py-0.5 rounded text-[10px] truncate max-w-[100px] ${
                                n.isCurrent
                                  ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-400/30'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                              }`}
                              title={n.ssid}
                            >
                              {n.ssid}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Nenhuma rede detectada</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      {isCurrent ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-400/30">
                          Em Uso
                        </span>
                      ) : (
                        <button
                          onClick={() => onApplyChannel && onApplyChannel(ch.channel, selectedBand)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-cyan-600 hover:text-white dark:bg-slate-800 dark:hover:bg-cyan-500 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center space-x-1 cursor-pointer mx-auto"
                        >
                          <Zap className="w-3 h-3 text-cyan-500 group-hover:text-white" />
                          <span>Aplicar</span>
                        </button>
                      )}
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
