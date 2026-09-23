import React from 'react';
import {
  ShieldCheck,
  Radio,
  Activity,
  Zap,
  SlidersHorizontal,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Info,
  Award
} from 'lucide-react';
import {
  WifiScoreBreakdown,
  WifiConnectionStatus,
  WifiQualityStatus
} from '../../types/wifiPulse';

interface WifiQualityScoreViewProps {
  score: WifiScoreBreakdown;
  connection: WifiConnectionStatus;
}

export const WifiQualityScoreView: React.FC<WifiQualityScoreViewProps> = ({
  score,
  connection
}) => {
  const getScoreColor = (rating: WifiQualityStatus) => {
    switch (rating) {
      case 'EXCELENTE':
        return { text: 'text-emerald-500', bg: 'bg-emerald-500/15 border-emerald-500/30', stroke: '#10b981' };
      case 'BOM':
        return { text: 'text-blue-500', bg: 'bg-blue-500/15 border-blue-500/30', stroke: '#3b82f6' };
      case 'REGULAR':
        return { text: 'text-amber-500', bg: 'bg-amber-500/15 border-amber-500/30', stroke: '#f59e0b' };
      case 'RUIM':
        return { text: 'text-orange-500', bg: 'bg-orange-500/15 border-orange-500/30', stroke: '#f97316' };
      default:
        return { text: 'text-red-500', bg: 'bg-red-500/15 border-red-500/30', stroke: '#ef4444' };
    }
  };

  const style = getScoreColor(score.rating);

  return (
    <div className="space-y-6">
      {/* Top Hero: Score Meter & Classification */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          {/* Left: Gauge & Main Score */}
          <div className="flex items-center space-x-6">
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  style={{ stroke: style.stroke }}
                  strokeDasharray={`${score.totalScore}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-black font-mono tracking-tight text-white">
                  {score.totalScore}
                </span>
                <span className="text-[10px] block text-slate-400 font-bold uppercase">de 100</span>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                  Algoritmo WorkPulse RF 3.0
                </span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-black text-white mt-1">
                Score de Qualidade Wi-Fi: <span className={style.text}>{score.rating}</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Cálculo ponderado que avalia atenuação do sinal, ruído de fundo, saturação de canal e estabilidade do link sem fio do host.
              </p>
            </div>
          </div>

          {/* Right: Quick Ratings Scale */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-xs space-y-1.5 w-full md:w-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Escala de Classificação
            </span>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-emerald-400 font-bold">Excelente:</span>
              <span className="font-mono text-slate-300">90 a 100 pts</span>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-blue-400 font-bold">Bom:</span>
              <span className="font-mono text-slate-300">75 a 89 pts</span>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-amber-400 font-bold">Regular:</span>
              <span className="font-mono text-slate-300">50 a 74 pts</span>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-orange-400 font-bold">Ruim:</span>
              <span className="font-mono text-slate-300">30 a 49 pts</span>
            </div>
            <div className="flex items-center justify-between space-x-4">
              <span className="text-red-400 font-bold">Crítico:</span>
              <span className="font-mono text-slate-300">0 a 29 pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Weighted Categories Breakdown Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Composição Ponderada das 5 Dimensões
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Dimension 1: RSSI (30%) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Sinal / RSSI</span>
                <Radio className="w-4 h-4 text-cyan-500" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {score.rssiScore} <span className="text-xs text-slate-400 font-normal">/ 30 pts</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  Peso 30%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Leitura: <strong>{connection.rssi} dBm</strong>.
              </p>
            </div>
            <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full"
                style={{ width: `${(score.rssiScore / 30) * 100}%` }}
              />
            </div>
          </div>

          {/* Dimension 2: SNR (25%) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Ruído / SNR</span>
                <Activity className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {score.snrScore} <span className="text-xs text-slate-400 font-normal">/ 25 pts</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Peso 25%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Leitura: <strong>{connection.snr} dB</strong> SNR.
              </p>
            </div>
            <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${(score.snrScore / 25) * 100}%` }}
              />
            </div>
          </div>

          {/* Dimension 3: Channel Interference (20%) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Canal & RF</span>
                <SlidersHorizontal className="w-4 h-4 text-purple-500" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {score.interferenceScore} <span className="text-xs text-slate-400 font-normal">/ 20 pts</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  Peso 20%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Canal: <strong>Ch {connection.channel} ({connection.band})</strong>.
              </p>
            </div>
            <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${(score.interferenceScore / 20) * 100}%` }}
              />
            </div>
          </div>

          {/* Dimension 4: Stability (15%) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Estabilidade</span>
                <ShieldCheck className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {score.stabilityScore} <span className="text-xs text-slate-400 font-normal">/ 15 pts</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  Peso 15%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Variação: <strong>Estável (±2 dB)</strong>.
              </p>
            </div>
            <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${(score.stabilityScore / 15) * 100}%` }}
              />
            </div>
          </div>

          {/* Dimension 5: Link Rate (10%) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Taxa / MCS</span>
                <Zap className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {score.linkRateScore} <span className="text-xs text-slate-400 font-normal">/ 10 pts</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  Peso 10%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Taxa: <strong>{connection.linkRateMbps} Mbps</strong>.
              </p>
            </div>
            <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${(score.linkRateScore / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Bullets Checklist */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Award className="w-4 h-4 text-cyan-500" />
          <span>Fatores Relevantes do Score Atual</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {score.summaryBullets.map((bullet, idx) => (
            <div
              key={idx}
              className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{bullet}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
