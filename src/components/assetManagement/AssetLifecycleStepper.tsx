import React from 'react';
import { ChevronRight, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ITAsset, AssetLifecycleStage } from '../../types';
import { LIFECYCLE_STAGES, getLifecycleStageConfig } from './lifecycleConfig';

interface AssetLifecycleStepperProps {
  assets: ITAsset[];
  selectedStageFilter?: string;
  onSelectStageFilter: (stage: string) => void;
  onQuickTransition?: (asset: ITAsset) => void;
}

export const AssetLifecycleStepper: React.FC<AssetLifecycleStepperProps> = ({
  assets,
  selectedStageFilter = 'all',
  onSelectStageFilter
}) => {
  // Count assets per stage
  const countsByStage = React.useMemo(() => {
    const counts: Record<AssetLifecycleStage, number> = {
      compra: 0,
      entrada: 0,
      instalacao: 0,
      utilizacao: 0,
      manutencao: 0,
      transferencia: 0,
      substituicao: 0,
      descarte: 0
    };

    assets.forEach(a => {
      const stage = a.lifecycleStage || 'utilizacao';
      if (counts[stage] !== undefined) {
        counts[stage]++;
      }
    });

    return counts;
  }, [assets]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Pipeline do Ciclo de Vida do Ativo de TI
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">
            (Compra → Entrada → Instalação → Utilização → Manutenção → Transferência → Substituição → Descarte)
          </span>
        </div>

        {selectedStageFilter !== 'all' && (
          <button
            onClick={() => onSelectStageFilter('all')}
            className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center space-x-1"
          >
            <span>Limpar filtro ({selectedStageFilter})</span>
          </button>
        )}
      </div>

      {/* 8 STAGES STEPPER PIPELINE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {LIFECYCLE_STAGES.map((step, idx) => {
          const isFilterSelected = selectedStageFilter === step.stage;
          const count = countsByStage[step.stage] || 0;

          return (
            <div key={step.stage} className="relative flex flex-col">
              <button
                onClick={() => onSelectStageFilter(isFilterSelected ? 'all' : step.stage)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer h-full flex flex-col justify-between ${
                  isFilterSelected
                    ? 'border-amber-500 bg-amber-500/15 shadow-md shadow-amber-500/10 ring-2 ring-amber-500/40'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${step.bgLight} ${step.textLight} ${step.bgDark} ${step.textDark}`}>
                    {step.icon}
                  </span>
                  <span className={`text-xs font-mono font-black px-1.5 py-0.5 rounded-full ${count > 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                    {count}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 block leading-tight">
                    {step.label}
                  </span>
                  <p className="text-[9px] text-slate-400 leading-tight mt-0.5 line-clamp-2">
                    {step.description}
                  </p>
                </div>
              </button>

              {/* Arrow separator on desktop */}
              {idx < LIFECYCLE_STAGES.length - 1 && (
                <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none text-slate-300 dark:text-slate-700">
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const SingleAssetLifecycleProgress: React.FC<{ currentStage?: AssetLifecycleStage }> = ({ currentStage = 'utilizacao' }) => {
  const currentIndex = LIFECYCLE_STAGES.findIndex(s => s.stage === currentStage);

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        <span>Etapa {currentIndex + 1} de 8</span>
        <span className="text-amber-600 dark:text-amber-400 font-extrabold">{getLifecycleStageConfig(currentStage).label}</span>
      </div>

      <div className="grid grid-cols-8 gap-1">
        {LIFECYCLE_STAGES.map((s, i) => {
          const isPassed = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div key={s.stage} className="flex flex-col items-center space-y-1">
              <div 
                className={`h-2 w-full rounded-full transition-all ${
                  isCurrent 
                    ? 'bg-amber-500 ring-2 ring-amber-500/40 animate-pulse' 
                    : isPassed 
                    ? 'bg-emerald-500' 
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
                title={`${s.label}: ${s.description}`}
              />
              <span className={`text-[8px] font-bold text-center truncate max-w-full ${isCurrent ? 'text-amber-600 dark:text-amber-400 font-black' : isPassed ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>
                {s.shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
