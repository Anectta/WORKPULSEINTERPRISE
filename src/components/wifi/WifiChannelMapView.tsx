import React, { useState, useMemo } from 'react';
import {
  Layers,
  Radio,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Activity
} from 'lucide-react';
import {
  WifiScannedNetwork,
  WifiBand
} from '../../types/wifiPulse';

interface WifiChannelMapViewProps {
  networks: WifiScannedNetwork[];
  isScanning: boolean;
  onScanNow: () => void;
}

const NETWORK_COLORS = [
  '#06b6d4', // cyan (destaque)
  '#a855f7', // purple
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ec4899', // pink
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#e11d48'  // rose
];

export const WifiChannelMapView: React.FC<WifiChannelMapViewProps> = ({
  networks,
  isScanning,
  onScanNow
}) => {
  const [selectedBand, setSelectedBand] = useState<WifiBand>('5 GHz');
  const [hoveredNetworkId, setHoveredNetworkId] = useState<string | null>(null);

  const filteredNetworks = useMemo(() => {
    return networks.filter(n => n.band === selectedBand);
  }, [networks, selectedBand]);

  // Canais exibidos no eixo X de acordo com a banda
  const channelRange = useMemo(() => {
    if (selectedBand === '2.4 GHz') {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    } else if (selectedBand === '5 GHz') {
      return [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165];
    } else {
      // 6 GHz
      return [1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49, 53, 57, 61, 65, 69, 73, 77, 81, 85, 89, 93];
    }
  }, [selectedBand]);

  // Dimensões do SVG do espectro
  const svgWidth = 900;
  const svgHeight = 360;
  const paddingLeft = 55;
  const paddingRight = 40;
  const paddingTop = 30;
  const paddingBottom = 45;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Escala Y: -100 dBm (base) a -20 dBm (topo)
  const minRssi = -100;
  const maxRssi = -20;

  const getY = (rssi: number) => {
    const clamped = Math.max(minRssi, Math.min(maxRssi, rssi));
    const ratio = (clamped - minRssi) / (maxRssi - minRssi);
    return paddingTop + chartHeight * (1 - ratio);
  };

  // Mapeia canal para coordenada X
  const getXForChannel = (ch: number) => {
    const idx = channelRange.indexOf(ch);
    if (idx === -1) {
      // Interpolação aproximada
      const first = channelRange[0];
      const last = channelRange[channelRange.length - 1];
      const ratio = (ch - first) / (last - first);
      return paddingLeft + chartWidth * Math.max(0, Math.min(1, ratio));
    }
    return paddingLeft + (idx / (channelRange.length - 1)) * chartWidth;
  };

  // Largura da curva do canal em pixels de acordo com MHz
  const getBellCurveWidth = (widthMhz: number) => {
    if (selectedBand === '2.4 GHz') {
      // 20 MHz ocupa aprox 4 canais
      const step = chartWidth / (channelRange.length - 1);
      return step * 4;
    } else {
      // 5 GHz: 20MHz = 1 passo, 40MHz = 2 passos, 80MHz = 4 passos, 160MHz = 8 passos
      const step = chartWidth / (channelRange.length - 1);
      if (widthMhz === 160) return step * 7.5;
      if (widthMhz === 80) return step * 3.8;
      if (widthMhz === 40) return step * 1.9;
      return step * 1.1;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-purple-500" />
            <span>Mapa Espectral de Canais (Análise de Frequência)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Visualização de densidade espectral, curvas de potência (dBm) e sobreposição de canais adjacentes.
          </p>
        </div>

        {/* Band Selector Buttons */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSelectedBand('5 GHz')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedBand === '5 GHz'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400'
              }`}
            >
              5 GHz (UNII 1-3)
            </button>
            <button
              onClick={() => setSelectedBand('2.4 GHz')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedBand === '2.4 GHz'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-purple-600 dark:hover:text-purple-400'
              }`}
            >
              2.4 GHz (ISM)
            </button>
            <button
              onClick={() => setSelectedBand('6 GHz')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedBand === '6 GHz'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              6 GHz (Wi-Fi 6E/7)
            </button>
          </div>

          <button
            onClick={onScanNow}
            disabled={isScanning}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Atualizar Espectro"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main SVG Spectral Chart Canvas */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl text-white relative overflow-hidden">
        {/* Spectral Header & Axis Legend */}
        <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-200">Espectrograma de Radiofrequência — Banda {selectedBand}</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] font-mono">
            <span>Eixo Y: Potência (dBm)</span>
            <span>•</span>
            <span>Eixo X: Canais ({channelRange[0]} a {channelRange[channelRange.length - 1]})</span>
          </div>
        </div>

        {/* Responsive SVG Container */}
        <div className="w-full overflow-x-auto pt-4">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto min-w-[720px] select-none font-sans"
          >
            {/* Grid Lines Y (dBm) */}
            {[-20, -40, -60, -80, -100].map((dbm) => {
              const y = getY(dbm);
              return (
                <g key={dbm}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray={dbm === -100 ? '0' : '4 4'}
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

            {/* Grid Lines X (Canais) */}
            {channelRange.map((ch, idx) => {
              const x = getXForChannel(ch);
              return (
                <g key={ch}>
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={paddingTop + chartHeight}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={paddingTop + chartHeight + 18}
                    textAnchor="middle"
                    fill={ch === 1 || ch === 6 || ch === 11 || ch === 36 || ch === 149 ? '#38bdf8' : '#94a3b8'}
                    fontSize="10"
                    fontWeight={ch === 1 || ch === 6 || ch === 11 || ch === 36 || ch === 149 ? 'bold' : 'normal'}
                    fontFamily="monospace"
                  >
                    {ch}
                  </text>
                </g>
              );
            })}

            {/* Base Noise Floor Level Indicator */}
            <line
              x1={paddingLeft}
              y1={getY(-92)}
              x2={svgWidth - paddingRight}
              y2={getY(-92)}
              stroke="#ef4444"
              strokeWidth="1.2"
              strokeDasharray="6 6"
            />
            <text
              x={svgWidth - paddingRight - 10}
              y={getY(-92) - 4}
              textAnchor="end"
              fill="#ef4444"
              fontSize="9"
              fontFamily="monospace"
            >
              Piso de Ruído (-92 dBm)
            </text>

            {/* Spectral Bell Curves for each network */}
            {filteredNetworks.map((net, idx) => {
              const centerX = getXForChannel(net.channel);
              const topY = getY(net.rssi);
              const baseY = getY(-100);
              const curveHalfWidth = getBellCurveWidth(net.channelWidthMhz) / 2;
              const isCurrent = net.isCurrent;
              const isHovered = hoveredNetworkId === net.id;
              const color = isCurrent ? '#06b6d4' : NETWORK_COLORS[idx % NETWORK_COLORS.length];

              const xLeft = Math.max(paddingLeft, centerX - curveHalfWidth);
              const xRight = Math.min(svgWidth - paddingRight, centerX + curveHalfWidth);

              // SVG Path da Curva Senoidal / Sino Parabólico de Espectro
              const pathData = `
                M ${xLeft} ${baseY}
                C ${centerX - curveHalfWidth * 0.5} ${baseY},
                  ${centerX - curveHalfWidth * 0.3} ${topY},
                  ${centerX} ${topY}
                C ${centerX + curveHalfWidth * 0.3} ${topY},
                  ${centerX + curveHalfWidth * 0.5} ${baseY},
                  ${xRight} ${baseY}
                Z
              `;

              return (
                <g
                  key={net.id}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredNetworkId(net.id)}
                  onMouseLeave={() => setHoveredNetworkId(null)}
                >
                  {/* Filled Gradient Spectral Envelope */}
                  <path
                    d={pathData}
                    fill={color}
                    fillOpacity={isCurrent ? 0.35 : isHovered ? 0.45 : 0.18}
                    stroke={color}
                    strokeWidth={isCurrent ? 3 : isHovered ? 2.5 : 1.5}
                  />

                  {/* Top Apex Node Marker */}
                  <circle
                    cx={centerX}
                    cy={topY}
                    r={isCurrent ? 5 : 3.5}
                    fill={color}
                    stroke="#020617"
                    strokeWidth="1.5"
                  />

                  {/* SSID Label at Top of Bell Curve */}
                  <text
                    x={centerX}
                    y={topY - 8}
                    textAnchor="middle"
                    fill={isCurrent ? '#38bdf8' : '#e2e8f0'}
                    fontSize={isCurrent ? '11' : '10'}
                    fontWeight={isCurrent ? 'bold' : '600'}
                  >
                    {net.ssid} ({net.rssi} dBm)
                  </text>

                  {/* Width Badge */}
                  <text
                    x={centerX}
                    y={topY + 14}
                    textAnchor="middle"
                    fill={color}
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {net.channelWidthMhz} MHz
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Bottom Legend */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-400">Redes Ativas na Banda:</span>
            <span className="font-mono text-cyan-400 font-bold">{filteredNetworks.length} redes mapeadas</span>
          </div>

          <div className="flex items-center space-x-4 flex-wrap gap-y-2">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-cyan-400 ring-2 ring-cyan-500/40" />
              <span className="font-bold text-cyan-300">Conexão Atual (WorkPulse-Corporate-5G)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-slate-400">Redes Concorrentes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Spectrum Technical Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Largura de Canal Atual (80 MHz)</span>
          </span>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Operando nos canais agrupados 36 a 48 (5180-5240 MHz). Excelente vazão para transferências locais.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <Info className="w-4 h-4 text-cyan-500" />
            <span>Proteção contra DFS</span>
          </span>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Canais UNII-1 (36 a 48) não exigem Dynamic Frequency Selection, evitando quedas por radares meteorológicos.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <SlidersHorizontal className="w-4 h-4 text-purple-500" />
            <span>Isolamento Espectral</span>
          </span>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Diferença de potência superior a 20 dBm em relação às redes vizinhas mais próximas.
          </p>
        </div>
      </div>
    </div>
  );
};
