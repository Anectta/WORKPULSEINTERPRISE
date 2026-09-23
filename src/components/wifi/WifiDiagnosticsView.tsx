import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Info,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Wrench,
  Cpu,
  Radio,
  SlidersHorizontal,
  RefreshCw,
  ExternalLink,
  Zap
} from 'lucide-react';
import {
  WifiDiagnosticItem,
  WifiDiagnosticSeverity,
  WifiBand
} from '../../types/wifiPulse';

interface WifiDiagnosticsViewProps {
  diagnostics: WifiDiagnosticItem[];
  isScanning: boolean;
  onScanNow: () => void;
  onNavigateTab: (tab: string) => void;
  onApplyChannel?: (channel: number, band: WifiBand) => void;
}

export const WifiDiagnosticsView: React.FC<WifiDiagnosticsViewProps> = ({
  diagnostics,
  isScanning,
  onScanNow,
  onNavigateTab,
  onApplyChannel
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  const getSeverityBadge = (severity: WifiDiagnosticSeverity) => {
    switch (severity) {
      case 'CRITICO':
        return { bg: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30', label: 'Crítico' };
      case 'ALTO':
        return { bg: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30', label: 'Alto' };
      case 'MEDIO':
        return { bg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30', label: 'Médio' };
      case 'BAIXO':
        return { bg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30', label: 'Baixo' };
      default:
        return { bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', label: 'Informativo' };
    }
  };

  const filteredDiagnostics = selectedCategory === 'Todas'
    ? diagnostics
    : diagnostics.filter(d => d.category === selectedCategory);

  const categories = ['Todas', ...Array.from(new Set(diagnostics.map(d => d.category)))];

  const criticalCount = diagnostics.filter(d => d.severity === 'CRITICO' || d.severity === 'ALTO').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>Diagnósticos Identificados & Recomendações Técnicas</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mapeamento de interferências, distorções de SNR, congestionamento e parâmetros de canal.
          </p>
        </div>

        <button
          onClick={onScanNow}
          disabled={isScanning}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Reanalisando...' : 'Reavaliar Problemas'}</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {cat}
            {cat === 'Todas' && ` (${diagnostics.length})`}
          </button>
        ))}
      </div>

      {/* Diagnostics List */}
      <div className="space-y-4">
        {filteredDiagnostics.map((item) => {
          const badge = getSeverityBadge(item.severity);

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-all hover:shadow-md space-y-4"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl border ${badge.bg}`}>
                    {item.severity === 'CRITICO' || item.severity === 'ALTO' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : item.severity === 'MEDIO' ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {item.title}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Categoria: {item.category}
                    </span>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${badge.bg}`}>
                  Severidade {badge.label}
                </span>
              </div>

              {/* Technical Description & Impact Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Description & Impact */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div>
                    <span className="font-bold text-slate-400 uppercase text-[10px]">Descrição Técnica</span>
                    <p className="text-slate-700 dark:text-slate-200 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 uppercase text-[10px]">Impacto na Experiência</span>
                    <p className="text-slate-700 dark:text-slate-200 mt-0.5 leading-relaxed">
                      {item.impact}
                    </p>
                  </div>
                </div>

                {/* Root Cause & Actionable Recommendation */}
                <div className="p-3 rounded-xl bg-cyan-500/5 dark:bg-cyan-950/20 border border-cyan-500/20 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400 uppercase text-[10px]">Causa Raiz Provável</span>
                      <p className="text-slate-800 dark:text-slate-200 mt-0.5 font-medium leading-relaxed">
                        {item.rootCause}
                      </p>
                    </div>
                    <div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[10px]">Ação Corretiva Recomendada</span>
                      <p className="text-slate-900 dark:text-slate-100 font-bold mt-0.5 leading-relaxed">
                        {item.actionableRecommendation}
                      </p>
                    </div>
                  </div>

                  {/* Direct Action Trigger */}
                  <div className="pt-2 flex items-center gap-2">
                    {item.category === 'Canal & Interferência' ? (
                      <button
                        onClick={() => onNavigateTab('best_channel')}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Ver Recomendação de Canal</span>
                      </button>
                    ) : item.category === 'Internet vs Wi-Fi' ? (
                      <button
                        onClick={() => onNavigateTab('dual_diagnostic')}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-xs"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Abrir Teste Dual (WAN/LAN)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onNavigateTab('realtime_signal')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-xs"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Monitorar Sinal Contínuo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredDiagnostics.length === 0 && (
          <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
            Nenhum diagnóstico registrado para esta categoria.
          </div>
        )}
      </div>
    </div>
  );
};
