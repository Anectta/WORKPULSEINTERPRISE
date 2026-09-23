import React, { useState } from 'react';
import {
  Gauge,
  Wifi,
  Globe,
  Radio,
  Activity,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
  TrendingUp,
  SlidersHorizontal,
  Server,
  Layers
} from 'lucide-react';
import {
  WifiDualTestResult,
  WifiConnectionStatus
} from '../../types/wifiPulse';

interface WifiDualDiagnosticViewProps {
  dualTest: WifiDualTestResult;
  connection: WifiConnectionStatus;
  onRunSpeedTest: () => Promise<void>;
}

export const WifiDualDiagnosticView: React.FC<WifiDualDiagnosticViewProps> = ({
  dualTest,
  connection,
  onRunSpeedTest
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testPhase, setTestPhase] = useState<'IDLE' | 'PING' | 'DOWNLOAD' | 'UPLOAD' | 'ANALYSIS'>('IDLE');
  const [liveSpeed, setLiveSpeed] = useState<number>(dualTest.internet.downloadMbps);

  const handleStartTest = async () => {
    setIsRunning(true);
    setTestPhase('PING');
    setLiveSpeed(0);

    // Simulação interativa do teste em fases reais
    setTimeout(() => {
      setTestPhase('DOWNLOAD');
      let current = 10;
      const interval = setInterval(() => {
        current += Math.floor(Math.random() * 45) + 15;
        if (current >= dualTest.internet.downloadMbps) {
          setLiveSpeed(dualTest.internet.downloadMbps);
          clearInterval(interval);
          setTestPhase('UPLOAD');

          let upCurrent = 5;
          const upInterval = setInterval(() => {
            upCurrent += Math.floor(Math.random() * 30) + 10;
            if (upCurrent >= dualTest.internet.uploadMbps) {
              setLiveSpeed(dualTest.internet.uploadMbps);
              clearInterval(upInterval);
              setTestPhase('ANALYSIS');

              setTimeout(() => {
                setIsRunning(false);
                setTestPhase('IDLE');
                onRunSpeedTest();
              }, 600);
            } else {
              setLiveSpeed(upCurrent);
            }
          }, 100);
        } else {
          setLiveSpeed(current);
        }
      }, 100);
    }, 800);
  };

  const getBottleneckBadge = (bottleneck: string) => {
    if (bottleneck === 'Nenhum (Conexão Perfeita)') {
      return { bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400', icon: CheckCircle2, text: 'Sem Gargalos Detectados' };
    }
    if (bottleneck.includes('Internet') || bottleneck.includes('Provedor')) {
      return { bg: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400', icon: Globe, text: 'Gargalo no Provedor / WAN' };
    }
    if (bottleneck.includes('Wi-Fi') || bottleneck.includes('Sinal')) {
      return { bg: 'bg-orange-500/15 border-orange-500/30 text-orange-600 dark:text-orange-400', icon: Wifi, text: 'Gargalo no Wi-Fi Local (RF)' };
    }
    return { bg: 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400', icon: AlertTriangle, text: 'Gargalo Crítico' };
  };

  const badge = getBottleneckBadge(dualTest.comparison.bottleneck);
  const BadgeIcon = badge.icon;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Gauge className="w-5 h-5 text-rose-500" />
            <span>Diagnóstico Geral: Wi-Fi Local vs Internet (Velocímetro Integrado)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Diferenciação exata de onde reside a lentidão: sinal sem fio, roteador, gateway ou link do provedor ISP.
          </p>
        </div>

        <button
          onClick={handleStartTest}
          disabled={isRunning}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-lg shadow-rose-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
        >
          <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : 'fill-slate-950'}`} />
          <span>{isRunning ? `Testando (${testPhase})...` : 'Iniciar Teste Dual Completo'}</span>
        </button>
      </div>

      {/* Main Dual Diagnosis Verdict Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border flex items-center space-x-1.5 ${badge.bg}`}>
                <BadgeIcon className="w-3.5 h-3.5" />
                <span>{badge.text}</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Latência Wi-Fi: {dualTest.wifi.gatewayPingMs}ms • Latência WAN: {dualTest.internet.pingMs}ms
              </span>
            </div>

            <h3 className="text-2xl font-black text-white">
              {dualTest.comparison.verdict}
            </h3>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {dualTest.comparison.explanation}
            </p>
          </div>

          {/* Ratio Meter Box */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center min-w-[180px] shadow-inner">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Eficiência Wi-Fi / Link
            </span>
            <div className="text-3xl font-black text-cyan-400 font-mono my-1">
              {dualTest.comparison.efficiencyRatio}%
            </div>
            <span className="text-[10px] text-slate-400">
              Aproveitamento de capacidade
            </span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Dual Benchmark Panels: Wi-Fi LAN vs WAN Internet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Wi-Fi Local Telemetry (RF & LAN) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">1. Camada Wi-Fi Local (Host ↔ AP)</h4>
                <span className="text-[10px] text-slate-400">{connection.ssid} • Canal {connection.channel}</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase">
              {dualTest.wifi.quality}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Taxa de Link Físico (Tx)</span>
              <p className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                {dualTest.wifi.linkRateMbps} <span className="text-xs text-slate-400 font-normal">Mbps</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Sinal / Potência (RSSI)</span>
              <p className="text-xl font-black text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">
                {dualTest.wifi.rssiDbm} <span className="text-xs text-slate-400 font-normal">dBm</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Latência até Gateway (Ping)</span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                {dualTest.wifi.gatewayPingMs} <span className="text-xs text-slate-400 font-normal">ms</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Relação Sinal/Ruído (SNR)</span>
              <p className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                {dualTest.wifi.snrDb} <span className="text-xs text-slate-400 font-normal">dB</span>
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs text-slate-600 dark:text-slate-300">
            <p>✓ O enlace sem fio entre o computador e o roteador suporta até {dualTest.wifi.linkRateMbps} Mbps com latência de apenas {dualTest.wifi.gatewayPingMs}ms.</p>
          </div>
        </div>

        {/* Right: Internet WAN & Velocimeter */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">2. Camada Internet WAN (Velocímetro ISP)</h4>
                <span className="text-[10px] text-slate-400">{dualTest.internet.isp} • {dualTest.internet.serverLocation}</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 uppercase">
              {dualTest.internet.ipWan}
            </span>
          </div>

          {/* Velocimeter Display */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Download */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Download Real</span>
              <p className="text-2xl font-black text-rose-500 font-mono mt-0.5">
                {isRunning && testPhase === 'DOWNLOAD' ? liveSpeed : dualTest.internet.downloadMbps} <span className="text-xs text-slate-400 font-normal">Mbps</span>
              </p>
            </div>

            {/* Upload */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Upload Real</span>
              <p className="text-2xl font-black text-amber-500 font-mono mt-0.5">
                {isRunning && testPhase === 'UPLOAD' ? liveSpeed : dualTest.internet.uploadMbps} <span className="text-xs text-slate-400 font-normal">Mbps</span>
              </p>
            </div>

            {/* Ping WAN */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Ping WAN / Internet</span>
              <p className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                {dualTest.internet.pingMs} <span className="text-xs text-slate-400 font-normal">ms</span>
              </p>
            </div>

            {/* Jitter & Loss */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Jitter / Perda</span>
              <p className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                {dualTest.internet.jitterMs}ms <span className="text-xs text-slate-400 font-normal">({dualTest.internet.packetLossPercent}% perda)</span>
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 text-xs text-slate-600 dark:text-slate-300">
            <p>✓ Teste realizado contra servidor regional de alta performance ({dualTest.internet.serverLocation}).</p>
          </div>
        </div>
      </div>
    </div>
  );
};
