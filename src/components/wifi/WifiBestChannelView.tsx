import React from 'react';
import {
  SlidersHorizontal,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  Radio,
  Info,
  RefreshCw,
  Zap
} from 'lucide-react';
import {
  WifiChannelRecommendation,
  WifiConnectionStatus,
  WifiBand
} from '../../types/wifiPulse';

interface WifiBestChannelViewProps {
  best5g: WifiChannelRecommendation;
  best24: WifiChannelRecommendation;
  best6g: WifiChannelRecommendation;
  currentConnection: WifiConnectionStatus;
  isScanning: boolean;
  onScanNow: () => void;
  onApplyBestChannel?: (channel: number, band: WifiBand) => void;
}

export const WifiBestChannelView: React.FC<WifiBestChannelViewProps> = ({
  best5g,
  best24,
  best6g,
  currentConnection,
  isScanning,
  onScanNow,
  onApplyBestChannel
}) => {
  const currentIsBest = currentConnection.channel === (
    currentConnection.band === '5 GHz' ? best5g.bestChannel :
    currentConnection.band === '2.4 GHz' ? best24.bestChannel :
    best6g.bestChannel
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Recomendação Inteligente do Melhor Canal Wi-Fi</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Algoritmo de radiofrequência que pondera RSSI concorrente, largura de banda e isolamento de canais adjacentes.
          </p>
        </div>

        <button
          onClick={onScanNow}
          disabled={isScanning}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Recalculando...' : 'Recalcular Canais'}</span>
        </button>
      </div>

      {/* Current Channel Assessment Hero */}
      <div className={`rounded-2xl p-5 border shadow-sm transition-all ${
        currentIsBest
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black ${
              currentIsBest ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
            }`}>
              {currentIsBest ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-bold text-base">
                {currentIsBest
                  ? `Sua rede (${currentConnection.ssid}) já está operando no canal ideal!`
                  : `Oportunidade de otimização: Canal atual (${currentConnection.channel}) pode ser melhorado.`}
              </h3>
              <p className="text-xs opacity-90 mt-0.5">
                Canal Atual: <strong>Ch {currentConnection.channel} ({currentConnection.band})</strong> • Link Rate: {currentConnection.linkRateMbps} Mbps
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono font-bold">
            <span className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
              Confiança do Cálculo: {best5g.confidencePercent}%
            </span>
          </div>
        </div>
      </div>

      {/* 3 Dedicated Recommendation Cards: 5 GHz, 2.4 GHz, 6 GHz */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 5 GHz Recommendation Card (Primary) */}
        <div className="bg-white dark:bg-slate-900 border-2 border-cyan-500/40 rounded-2xl p-5 shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-wider bg-cyan-500 text-slate-950">
            Recomendação Principal
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                <Radio className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Banda 5 GHz</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ideal para alta velocidade e videoconferência</p>
              </div>
            </div>

            {/* Big Channel Number */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Melhor Canal Calculado</span>
              <div className="text-4xl font-black text-cyan-600 dark:text-cyan-400 font-mono my-1">
                Canal {best5g.bestChannel}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-300 font-medium">
                Largura sugerida: <strong>{best5g.widthRecommendation} MHz</strong> (UNII-1)
              </span>
            </div>

            {/* Metrics Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Nível de Congestionamento:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{best5g.congestion}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Interferência Co-Canal:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{best5g.interference}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Canais Alternativos:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {best5g.secondaryChannels.join(', ')}
                </span>
              </div>
            </div>

            {/* Reasoning Text */}
            <div className="p-3 rounded-xl bg-cyan-500/5 dark:bg-cyan-950/20 border border-cyan-500/20 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <p><strong>Por que este canal?</strong> {best5g.reasoning}</p>
            </div>

            {/* Apply Button */}
            <button
              onClick={() => onApplyBestChannel && onApplyBestChannel(best5g.bestChannel, '5 GHz')}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Aplicar Canal {best5g.bestChannel} (5 GHz)</span>
            </button>
          </div>
        </div>

        {/* 2.4 GHz Recommendation Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <Layers className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Banda 2.4 GHz</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Maior alcance / Dispositivos legados e IoT</p>
              </div>
            </div>

            {/* Big Channel Number */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Melhor Canal Não Sobreposto</span>
              <div className="text-4xl font-black text-purple-600 dark:text-purple-400 font-mono my-1">
                Canal {best24.bestChannel}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-300 font-medium">
                Largura sugerida: <strong>20 MHz</strong> (Evite 40 MHz em 2.4G)
              </span>
            </div>

            {/* Metrics Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Nível de Congestionamento:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{best24.congestion}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Interferência Co-Canal:</span>
                <span className="font-bold text-teal-600 dark:text-teal-400">{best24.interference}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Canais Alternativos:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {best24.secondaryChannels.join(', ')}
                </span>
              </div>
            </div>

            {/* Reasoning Text */}
            <div className="p-3 rounded-xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/20 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <p><strong>Por que este canal?</strong> {best24.reasoning}</p>
            </div>

            {/* Apply Button */}
            <button
              onClick={() => onApplyBestChannel && onApplyBestChannel(best24.bestChannel, '2.4 GHz')}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Aplicar Canal {best24.bestChannel} (2.4 GHz)</span>
            </button>
          </div>
        </div>

        {/* 6 GHz Recommendation Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Cpu className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">Banda 6 GHz (Wi-Fi 6E/7)</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ultra capacidade e zero interferência legada</p>
              </div>
            </div>

            {/* Big Channel Number */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Melhor Canal PSC</span>
              <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono my-1">
                Canal {best6g.bestChannel}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-300 font-medium">
                Largura sugerida: <strong>{best6g.widthRecommendation} MHz</strong> (PSC)
              </span>
            </div>

            {/* Metrics Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Nível de Congestionamento:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{best6g.congestion}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Interferência Co-Canal:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{best6g.interference}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Canais Alternativos:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {best6g.secondaryChannels.join(', ')}
                </span>
              </div>
            </div>

            {/* Reasoning Text */}
            <div className="p-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <p><strong>Por que este canal?</strong> {best6g.reasoning}</p>
            </div>

            {/* Apply Button */}
            <button
              onClick={() => onApplyBestChannel && onApplyBestChannel(best6g.bestChannel, '6 GHz')}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Aplicar Canal {best6g.bestChannel} (6 GHz)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
