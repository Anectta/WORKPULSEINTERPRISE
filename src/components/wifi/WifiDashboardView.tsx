import React from 'react';
import {
  Wifi,
  Radio,
  Activity,
  Zap,
  ShieldCheck,
  Cpu,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
  Gauge,
  History,
  FileText,
  Smartphone,
  ExternalLink,
  Laptop
} from 'lucide-react';
import {
  WifiConnectionStatus,
  WifiScoreBreakdown,
  WifiQualityStatus
} from '../../types/wifiPulse';

interface WifiDashboardViewProps {
  connection: WifiConnectionStatus;
  score: WifiScoreBreakdown;
  isScanning: boolean;
  onScanNow: () => void;
  onNavigateTab: (tabId: string) => void;
  onOpenAgentModal: () => void;
  onOpenAttachModal: () => void;
}

export const WifiDashboardView: React.FC<WifiDashboardViewProps> = ({
  connection,
  score,
  isScanning,
  onScanNow,
  onNavigateTab,
  onOpenAgentModal,
  onOpenAttachModal
}) => {
  const getScoreBadge = (status: WifiQualityStatus) => {
    switch (status) {
      case 'EXCELENTE':
        return { bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400', label: 'Excelente' };
      case 'BOM':
        return { bg: 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400', label: 'Bom' };
      case 'REGULAR':
        return { bg: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400', label: 'Regular' };
      case 'RUIM':
        return { bg: 'bg-orange-500/15 border-orange-500/30 text-orange-600 dark:text-orange-400', label: 'Ruim' };
      default:
        return { bg: 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400', label: 'Crítico' };
    }
  };

  const badge = getScoreBadge(score.rating);

  return (
    <div className="space-y-6">
      {/* Top Telemetry Hero Banner */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left Hero: Connection Identity */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-800 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                <span>Interface Conectada</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold">
                {connection.interfaceName}
              </span>
              <button
                onClick={onOpenAgentModal}
                className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 flex items-center space-x-1.5 transition-colors"
                title="Status do Agente Local"
              >
                <Laptop className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Agente {connection.agentPlatform} Ativo</span>
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-white font-black shadow-md shadow-cyan-500/20 shrink-0">
                <Wifi className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center space-x-3">
                  <span>{connection.ssid}</span>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                    {connection.bssid}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center space-x-2">
                  <span>{connection.wifiStandard}</span>
                  <span>•</span>
                  <span>{connection.security}</span>
                  <span>•</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">{connection.band} (Canal {connection.channel} @ {connection.channelWidthMhz} MHz)</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right Hero: Score Badge & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            {/* Score Ring Display */}
            <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-4 flex items-center space-x-4 min-w-[200px] shadow-xs">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200 dark:text-slate-700"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={score.totalScore >= 75 ? 'text-emerald-500' : score.totalScore >= 50 ? 'text-amber-500' : 'text-red-500'}
                    strokeDasharray={`${score.totalScore}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute font-black text-sm text-slate-900 dark:text-white font-mono">
                  {score.totalScore}%
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Qualidade Wi-Fi</span>
                <div className={`mt-0.5 inline-block px-2 py-0.5 rounded text-[11px] font-black border ${badge.bg}`}>
                  {badge.label}
                </div>
              </div>
            </div>

            {/* Scan Button */}
            <button
              onClick={onScanNow}
              disabled={isScanning}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Varrendo Espectro...' : 'Analisar Agora'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Essential Real-Time RF Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* RSSI Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Nível de Sinal (RSSI)</span>
            <Radio className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {connection.rssi} <span className="text-sm font-normal text-slate-500">dBm</span>
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              connection.rssi >= -60 ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' :
              connection.rssi >= -75 ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' :
              'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
            }`}>
              {connection.rssi >= -60 ? 'Excelente' : connection.rssi >= -75 ? 'Adequado' : 'Atenuado'}
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${connection.rssi >= -60 ? 'bg-emerald-500' : connection.rssi >= -75 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(100, Math.max(10, ((connection.rssi + 100) / 70) * 100))}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Ideal: superior a -65 dBm para baixa perda.
          </p>
        </div>

        {/* SNR Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Relação Sinal/Ruído (SNR)</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {connection.snr} <span className="text-sm font-normal text-slate-500">dB</span>
            </span>
            <span className="text-xs font-mono text-slate-400">
              Piso: {connection.noise} dBm
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${connection.snr >= 25 ? 'bg-emerald-500' : connection.snr >= 15 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(100, (connection.snr / 50) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            {connection.snr >= 25 ? '✓ Baixo piso de ruído no ambiente' : '⚠️ Ruído eletromagnético interferindo'}
          </p>
        </div>

        {/* Link Rate Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Taxa de Link (Tx/Rx)</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {connection.linkRateMbps} <span className="text-sm font-normal text-slate-500">Mbps</span>
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
              Max {connection.maxRateMbps}M
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{ width: `${Math.min(100, (connection.linkRateMbps / connection.maxRateMbps) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Modulação MCS ativa no adaptador.
          </p>
        </div>

        {/* Channel & Width Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Canal & Espectro</span>
            <Cpu className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              Ch {connection.channel}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              {connection.channelWidthMhz} MHz
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Freq: {connection.frequencyMhz} MHz</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Sem DFS</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Banda de 5 GHz UNII-1 desimpedida.
          </p>
        </div>
      </div>

      {/* Quick Diagnostics & Summary Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quick Checklist */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Diagnóstico Rápido da Conexão</span>
            </h3>
            <button
              onClick={() => onNavigateTab('diagnostics')}
              className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center space-x-1"
            >
              <span>Ver Diagnóstico Detalhado</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {score.summaryBullets.map((bullet, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
              >
                <span className="font-bold">{bullet}</span>
              </div>
            ))}
          </div>

          {/* Network Parameters Info Row */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">IP do Equipamento</span>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{connection.ipAddress}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Gateway / Roteador</span>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{connection.gateway}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Endereço MAC</span>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{connection.macAddress}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">DNS Primário</span>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{connection.dnsServers[0] || '192.168.1.1'}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Ticket / ITSM Quick Attachment Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 font-mono">
                ITSM & Chamados
              </span>
              <span className="text-xs text-slate-400 font-mono">WorkPulse ITSM</span>
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base">
              Vincular Diagnóstico ao Chamado
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Anexe o laudo técnico de Wi-Fi, o Score de {score.totalScore}% e a telemetria de RF diretamente ao ticket de suporte técnico ou ordem de serviço.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <button
              onClick={onOpenAttachModal}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Anexar Laudo ao Chamado</span>
            </button>
            <button
              onClick={() => onNavigateTab('report')}
              className="w-full py-2 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Gerar Relatório Técnico Completo</span>
            </button>
          </div>
        </div>
      </div>

      {/* 8 Fast Navigation Quick-Action Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Módulos & Ferramentas de Análise Wi-Fi
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => onNavigateTab('scanner')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 dark:hover:border-cyan-500 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Radio className="w-4 h-4" />
            </div>
            <p className="font-bold text-xs text-slate-900 dark:text-white">Redes Próximas</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">10 redes ativas</p>
          </button>

          <button
            onClick={() => onNavigateTab('channel_map')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
            <p className="font-bold text-xs text-slate-900 dark:text-white">Mapa Espectral</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Gráfico de canais</p>
          </button>

          <button
            onClick={() => onNavigateTab('best_channel')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <p className="font-bold text-xs text-slate-900 dark:text-white">Melhor Canal</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Cálculo de RF</p>
          </button>

          <button
            onClick={() => onNavigateTab('realtime_signal')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
            <p className="font-bold text-xs text-slate-900 dark:text-white">Sinal Contínuo</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Evolução temporal</p>
          </button>

          <button
            onClick={() => onNavigateTab('devices')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Smartphone className="w-4 h-4" />
            </div>
            <p className="font-bold text-xs text-slate-900 dark:text-white">Dispositivos LAN</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Descoberta local</p>
          </button>

          <button
            onClick={() => onNavigateTab('dual_diagnostic')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500 dark:hover:border-rose-500 hover:shadow-md transition-all text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Gauge className="w-4 h-4" />
            </div>
            <p className="font-bold text-xs text-slate-900 dark:text-white">Wi-Fi + Velocímetro</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Gargalo Wi-Fi vs WAN</p>
          </button>
        </div>
      </div>
    </div>
  );
};
