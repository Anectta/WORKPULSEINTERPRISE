import React from 'react';
import { 
  HelpCircle, 
  X, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  ChevronRight, 
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { CONTEXTUAL_HELP_MAP } from '../../data/knowledgeData';
import { KBContextHelp } from '../../types/knowledge';

interface ContextualHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onOpenKnowledgeBase: (articleId?: string) => void;
  onStartGuidedTour: () => void;
}

export const ContextualHelpModal: React.FC<ContextualHelpModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  onOpenKnowledgeBase,
  onStartGuidedTour
}) => {
  if (!isOpen) return null;

  const currentHelp: KBContextHelp = CONTEXTUAL_HELP_MAP[activeTab] || {
    tabId: activeTab,
    tabTitle: 'Ajuda Contextual da Tela',
    objective: 'Orientar o uso correto dos recursos disponíveis nesta visualização.',
    description: 'Acompanhe os guias operacionais e tire dúvidas sobre os botões e filtros da tela ativa.',
    howToUse: 'Utilize os filtros superiores e consulte as tabelas analíticas correspondentes.',
    stepByStep: ['Selecione os filtros desejados.', 'Analise as tabelas e gráficos.', 'Exporte os relatórios.'],
    commonErrors: [],
    faqList: []
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg h-full bg-[#121214] border-l border-zinc-800 text-white flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">Ajuda Contextual</span>
                <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded font-semibold">
                  Tela Ativa
                </span>
              </div>
              <h2 className="text-base font-bold text-white">{currentHelp.tabTitle}</h2>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Objective Box */}
          <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4" />
              <span>Objetivo desta Tela</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-medium">
              {currentHelp.objective}
            </p>
          </div>

          {/* Quick Guided Tour Button */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-300">Tour Guiado da Tela</h4>
                <p className="text-[11px] text-zinc-400">Aprenda a usar cada botão em um passo a passo interativo</p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onStartGuidedTour();
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md flex items-center space-x-1 shrink-0"
            >
              <span>Iniciar Tour</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* How to Use & Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Descrição & Funcionamento</h3>
            <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
              {currentHelp.description}
            </p>
          </div>

          {/* Step by Step List */}
          {currentHelp.stepByStep && currentHelp.stepByStep.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Passo a Passo Recomendado</span>
              </h3>
              <div className="space-y-2">
                {currentHelp.stepByStep.map((step, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-zinc-300 font-medium leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Common Errors & Fixes */}
          {currentHelp.commonErrors && currentHelp.commonErrors.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Erros Comuns & Como Resolver</span>
              </h3>
              <div className="space-y-2">
                {currentHelp.commonErrors.map((err, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-xs">
                    <div className="font-semibold text-amber-300 flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span>{err.error}</span>
                    </div>
                    <p className="text-zinc-300 pl-3 text-[11px] leading-relaxed">{err.fix}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related FAQs */}
          {currentHelp.faqList && currentHelp.faqList.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Dúvidas Frequentes desta Tela</h3>
              <div className="space-y-2">
                {currentHelp.faqList.map((faq, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1 text-xs">
                    <p className="font-semibold text-zinc-200">❓ {faq.question}</p>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center space-x-2 text-zinc-400 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Precisa de suporte avançado?</span>
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenKnowledgeBase(currentHelp.relatedArticleId);
            }}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow flex items-center space-x-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Abrir Central de Conhecimento</span>
            <ExternalLink className="w-3 h-3 ml-1" />
          </button>
        </div>

      </div>
    </div>
  );
};
