import React, { useState } from 'react';
import { Compass, ChevronRight, ChevronLeft, X, CheckCircle2, Sparkles } from 'lucide-react';
import { INITIAL_GUIDED_TOURS } from '../../data/knowledgeData';
import { KBTourStep } from '../../types/knowledge';

interface GuidedTourOverlayProps {
  activeTab: string;
  onFinish: () => void;
}

export const GuidedTourOverlay: React.FC<GuidedTourOverlayProps> = ({
  activeTab,
  onFinish
}) => {
  const steps: KBTourStep[] = INITIAL_GUIDED_TOURS[activeTab] || [
    {
      id: 'tour-generic-1',
      tabId: activeTab,
      elementSelector: 'main',
      title: 'Bem-vindo a esta tela',
      content: 'Acompanhe os dados e tabelas analíticas. Utilize a barra superior para aplicar filtros globais por modelo de trabalho e departamento.',
      position: 'bottom',
      buttonLabel: 'Finalizar'
    }
  ];

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = steps[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-[#141416] border-2 border-emerald-500/80 rounded-2xl p-5 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-bounce-short">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
              Tour Guiado de Aprendizagem
            </span>
            <h4 className="text-xs font-bold text-zinc-100">
              Passo {currentStepIndex + 1} de {steps.length}
            </h4>
          </div>
        </div>

        <button 
          onClick={onFinish}
          className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Fechar Tour"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="space-y-2 mb-4">
        <h3 className="text-sm font-bold text-emerald-300 flex items-center space-x-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{currentStep.title}</span>
        </h3>
        <p className="text-xs text-zinc-300 leading-relaxed font-medium bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
          {currentStep.content}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
        <button
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
          className={`px-3 py-1.5 rounded-lg border flex items-center space-x-1 font-medium transition-all ${
            currentStepIndex === 0
              ? 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
              : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white hover:bg-zinc-700'
          }`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Anterior</span>
        </button>

        <div className="flex items-center space-x-1">
          {steps.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentStepIndex ? 'w-5 bg-emerald-400' : 'w-1.5 bg-zinc-700'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition-all shadow flex items-center space-x-1"
        >
          <span>{currentStepIndex === steps.length - 1 ? 'Concluir' : 'Próximo'}</span>
          {currentStepIndex === steps.length - 1 ? (
            <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

    </div>
  );
};
