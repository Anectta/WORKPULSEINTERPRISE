import React, { useState, useMemo } from 'react';
import {
  Activity,
  Radio,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Zap,
  CheckCircle2
} from 'lucide-react';
import {
  WifiSignalPoint,
  WifiConnectionStatus
} from '../../types/wifiPulse';

interface WifiRealtimeSignalViewProps {
  signalHistory: WifiSignalPoint[];
  currentConnection: WifiConnectionStatus;
  isScanning: boolean;
  onScanNow: () => void;
}

export const WifiRealtimeSignalView: React.FC<WifiRealtimeSignalViewProps> = ({
  signalHistory,
  currentConnection,
  isScanning,
  onScanNow
}) => {
  const [selectedInterval, setSelectedInterval] = useState<'30s' | '1m' | '5m' | '15m' | '30m'>('5m');

  // Filtra histórico conforme intervalo selecionado
  const points = useMemo(() => {
    const total = signalHistory.length;
    let take = total;
    if (selectedInterval === '30s') take = Math.min(10, total);
    else if (selectedInterval === '1m') take = Math.min(20, total);
    else if (selectedInterval === '5m') take = Math.min(60, total);
    else if (selectedInterval === '15m') take = Math.min(120, total);
    else take = total;

    return signalHistory.slice(-take);
  }, [signalHistory, selectedInterval]);

  // Cálculos estatísticos
  const stats = useMemo(() => {
    if (points.length === 0) {
      return { current: currentConnection.rssi, min: currentConnection.rssi, max: currentConnection.rssi, avg: currentConnection.rssi, variation: 0 };
    }
    const rssis = points.map(p => p.rssi);
    const min = Math.min(...rssis);
    const max = Math.max(...rssis);
    const avg = Math.round(rssis.reduce((a, b) => a + b, 0) / rssis.length);
    const variation = max - min;
    const current = rssis[rssis.length - 1];

    return { current, min, max, avg, variation };
  }, [points, currentConnection]);

  // Dimensões do gráfico SVG
  const svgWidth = 800;
  const svgHeight = 280;
  const paddingLeft = 50;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const minDbm = -90;
  const maxDbm = -30;

  const getY = (rssi: number) => {
    const clamped = Math.max(minDbm, Math.min(maxDbm, rssi));
    const ratio = (clamped - minDbm) / (maxDbm - minDbm);
    return paddingTop + chartHeight * (1 - ratio);
  };

  const getX = (index: number) => {
    if (points.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (points.length - 1)) * chartWidth;
  };

  // Gerar SVG Polyline path
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(p.rssi).toFixed(1)}`)
      .join(' ');
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const bottomY = paddingTop + chartHeight;
    const firstX = getX(0).toFixed(1);
    const lastX = getX(points.length - 1).toFixed(1);
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [points, linePath]);

  return (
    <div className="space-y-6">
      {/* Top Header & Interval Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-amber-500" />
            <span>Sinal Wi-Fi em Tempo Real (Evolução Temporal)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitoramento contínuo de oscilações de sinal (Jitter de RF) e atenuação por obstáculos.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Interval Pills */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {(['30s', '1m', '5m', '15m', '30m'] as const).map((inter) => (
              <button
                key={inter}
                onClick={() => setSelectedInterval(inter)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedInterval === inter
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {inter}
              </button>
            ))}
          </div>

          <button
            onClick={onScanNow}
            disabled={isScanning}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Coletar Amostra"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 5 Real-Time Statistical Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Current */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400">Sinal Atual</span>
          <p className="text-2xl font-black text-amber-500 font-mono mt-1">
            {stats.current} <span className="text-xs text-slate-400 font-normal">dBm</span>
          </p>
          <span className="text-[10px] text-slate-400">Última leitura</span>
        </div>

        {/* Max (Melhor) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400">Pico Máximo</span>
          <p className="text-2xl font-black text-emerald-500 font-mono mt-1">
            {stats.max} <span className="text-xs text-slate-400 font-normal">dBm</span>
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Melhor intensidade</span>
        </div>

        {/* Min (Pior) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400">Pico Mínimo</span>
          <p className="text-2xl font-black text-red-500 font-mono mt-1">
            {stats.min} <span className="text-xs text-slate-400 font-normal">dBm</span>
          </p>
          <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold">Maior atenuação</span>
        </div>

        {/* Avg */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400">Média (Período)</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
            {stats.avg} <span className="text-xs text-slate-400 font-normal">dBm</span>
          </p>
          <span className="text-[10px] text-slate-400">Nível médio de RF</span>
        </div>

        {/* Variation */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-slate-400">Variação (Jitter)</span>
          <p className={`text-2xl font-black font-mono mt-1 ${stats.variation <= 5 ? 'text-emerald-500' : stats.variation <= 10 ? 'text-amber-500' : 'text-red-500'}`}>
            ±{stats.variation} <span className="text-xs text-slate-400 font-normal">dB</span>
          </p>
          <span className="text-[10px] font-bold">
            {stats.variation <= 5 ? '✓ Alta Estabilidade' : stats.variation <= 10 ? '⚠️ Oscilação Leve' : '❌ Instabilidade Alta'}
          </span>
        </div>
      </div>

      {/* SVG Timeline Chart */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl text-white">
        <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="font-bold text-slate-200">
              Telemetria Contínua de Sinal RSSI ({currentConnection.ssid} • BSSID {currentConnection.bssid})
            </span>
          </div>
          <div className="text-[11px] font-mono text-cyan-400">
            Amostras: {points.length} pontos coletados
          </div>
        </div>

        <div className="w-full overflow-x-auto pt-4">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto select-none font-sans min-w-[650px]">
            <defs>
              <linearGradient id="signalAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines (dBm) */}
            {[-30, -45, -60, -75, -90].map((dbm) => {
              const y = getY(dbm);
              return (
                <g key={dbm}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray={dbm === -90 ? '0' : '4 4'}
                    strokeWidth="1"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {dbm} dBm
                  </text>
                </g>
              );
            })}

            {/* Threshold Line (-65 dBm Limiar de Qualidade) */}
            <line
              x1={paddingLeft}
              y1={getY(-65)}
              x2={svgWidth - paddingRight}
              y2={getY(-65)}
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="3 3"
              strokeOpacity="0.6"
            />
            <text
              x={svgWidth - paddingRight - 10}
              y={getY(-65) - 4}
              textAnchor="end"
              fill="#10b981"
              fontSize="9"
              fontFamily="monospace"
            >
              Limiar Recomendado (-65 dBm)
            </text>

            {/* Filled Area */}
            {areaPath && (
              <path d={areaPath} fill="url(#signalAreaGrad)" />
            )}

            {/* Signal Polyline */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Nodes */}
            {points.map((p, idx) => {
              const x = getX(idx);
              const y = getY(p.rssi);
              const isLast = idx === points.length - 1;

              return (
                <g key={idx}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isLast ? 5 : 3}
                    fill={isLast ? '#38bdf8' : '#f59e0b'}
                    stroke="#020617"
                    strokeWidth="1.5"
                  />
                  {/* Timestamp at bottom on selective nodes */}
                  {(idx === 0 || idx === Math.floor(points.length / 2) || isLast) && (
                    <text
                      x={x}
                      y={paddingTop + chartHeight + 18}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {p.timestamp}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Stability Assessment Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-start space-x-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">
            Diagnóstico de Estabilidade de Radiofrequência
          </h4>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            A variação de sinal registrada no período ({stats.variation} dB) indica que o canal de RF está estável e não há fontes transitórias severas de atenuação (como pessoas bloqueando o campo direto do Access Point ou movimentação brusca do equipamento).
          </p>
        </div>
      </div>
    </div>
  );
};
