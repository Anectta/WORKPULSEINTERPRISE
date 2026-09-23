import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IdleToast } from '../types';
import { 
  AlertTriangle, 
  Clock, 
  Search, 
  Bell, 
  X, 
  Check, 
  Send, 
  ShieldAlert, 
  Monitor,
  UserCheck,
  Layers,
  History,
  BellOff,
  PauseCircle,
  Sliders,
  SlidersHorizontal,
  CheckCircle2,
  ChevronDown,
  RotateCcw
} from 'lucide-react';

interface IdleToastNotificationsProps {
  toasts: IdleToast[];
  onDismiss: (id: string) => void;
  onInvestigate: (employeeId: string) => void;
  onNotifyEmployee: (toast: IdleToast) => void;
  onClearAll: () => void;
  onDisableAlert?: (employeeId: string, toastId: string) => void;
  onPauseAlert?: (employeeId: string, toastId: string, durationMinutes: number) => void;
  onAlterThreshold?: (employeeId: string, toastId: string, newThresholdMinutes: number) => void;
}

export const IdleToastNotifications: React.FC<IdleToastNotificationsProps> = ({
  toasts,
  onDismiss,
  onInvestigate,
  onNotifyEmployee,
  onClearAll,
  onDisableAlert,
  onPauseAlert,
  onAlterThreshold
}) => {
  // Sub-panel state for active expanded action (pausar or alterar)
  const [activePanel, setActivePanel] = useState<{ toastId: string; type: 'pausar' | 'alterar' } | null>(null);
  const [customThresholdInput, setCustomThresholdInput] = useState<string>('');

  // Show up to 3 floating toasts concurrently in the bottom-right corner
  const visibleToasts = toasts.slice(0, 3);

  const handlePauseSelect = (toast: IdleToast, mins: number) => {
    if (onPauseAlert) {
      onPauseAlert(toast.employeeId, toast.id, mins);
    } else {
      onDismiss(toast.id);
      alert(`⏸️ Alerta pausado por ${mins} minutos para ${toast.employeeName}.`);
    }
    setActivePanel(null);
  };

  const handleDisableSelect = (toast: IdleToast) => {
    if (onDisableAlert) {
      onDisableAlert(toast.employeeId, toast.id);
    } else {
      onDismiss(toast.id);
      alert(`🛑 Monitoramento de alertas desativado para ${toast.employeeName}.`);
    }
    setActivePanel(null);
  };

  const handleAlterSelect = (toast: IdleToast, newMins: number) => {
    if (onAlterThreshold) {
      onAlterThreshold(toast.employeeId, toast.id, newMins);
    } else {
      toast.thresholdMinutes = newMins;
      alert(`✏️ Limite de inatividade alterado para ${newMins} min.`);
    }
    setActivePanel(null);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-3 max-w-md w-full pointer-events-none px-2 sm:px-0">
      <AnimatePresence>
        {visibleToasts.map((toast) => {
          const isCritical = toast.severity === 'critico' || toast.idleMinutes >= 30;
          const count = toast.occurrenceCount || 1;
          const isGrouped = count > 1 || toast.isGrouped;
          const isPausarOpen = activePanel?.toastId === toast.id && activePanel?.type === 'pausar';
          const isAlterarOpen = activePanel?.toastId === toast.id && activePanel?.type === 'alterar';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`pointer-events-auto rounded-xl border p-4 shadow-2xl backdrop-blur-md transition-all ${
                isCritical 
                  ? 'bg-[#181214] border-red-500/40 shadow-red-950/30' 
                  : 'bg-[#181714] border-amber-500/40 shadow-amber-950/30'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                <div className="flex items-center space-x-2">
                  <span className={`p-1 rounded flex items-center justify-center ${
                    isCritical ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {isCritical ? <ShieldAlert className="w-4 h-4 animate-pulse" /> : <AlertTriangle className="w-4 h-4" />}
                  </span>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${
                    isCritical ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {isCritical ? 'Inatividade Crítica Excedida' : 'Alerta de Ociosidade'}
                  </span>

                  {isGrouped && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                      <Layers className="w-3 h-3 text-amber-400" />
                      <span>{count}x Consolidado</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-zinc-500 font-mono">{toast.timestamp}</span>
                  <button
                    onClick={() => onDismiss(toast.id)}
                    className="text-zinc-500 hover:text-white p-1 rounded transition-colors"
                    title="Descartar alerta"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Employee info */}
              <div className="flex items-center space-x-3 my-3">
                <img
                  src={toast.employeeAvatar}
                  alt={toast.employeeName}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-amber-500/30"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-white truncate">{toast.employeeName}</h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                      {toast.department}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate">{toast.role}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center">
                    <Monitor className="w-3 h-3 mr-1 text-zinc-400" />
                    <span>Estação: <strong className="text-zinc-300 font-mono">{toast.computerHost}</strong></span>
                  </p>
                </div>
              </div>

              {/* Idle Metrics Box */}
              <div className="bg-zinc-900/80 rounded-lg p-2.5 border border-zinc-800 flex items-center justify-between mb-2">
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-medium">Tempo de Ociosidade</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className={`text-base font-bold font-mono ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>
                      {toast.idleMinutes} min
                    </span>
                    <button 
                      onClick={() => {
                        setActivePanel(prev => prev?.toastId === toast.id && prev?.type === 'alterar' ? null : { toastId: toast.id, type: 'alterar' });
                        setCustomThresholdInput(String(toast.thresholdMinutes));
                      }}
                      className="text-[10px] text-zinc-400 hover:text-amber-300 underline font-medium cursor-pointer transition-colors"
                      title="Clique para alterar o limite"
                    >
                      (limite: {toast.thresholdMinutes} min)
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block uppercase font-medium">Último App Ativo</span>
                  <span className="text-xs font-medium text-zinc-200 truncate max-w-[130px] block" title={toast.lastApp}>
                    {toast.lastApp}
                  </span>
                </div>
              </div>

              {/* Consolidated Summary Banner */}
              {isGrouped && (
                <div className="mb-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-[11px] text-amber-300 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span><strong>Resumo Consolidado:</strong> {count} alertas agrupados nos últimos 10 min.</span>
                  </span>
                  <span className="font-mono text-[10px] text-amber-400/80 font-semibold pl-1">
                    Janela 10m
                  </span>
                </div>
              )}

              {/* Management Controls Bar: Desativar, Pausar, Alterar */}
              <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                <button
                  onClick={() => handleDisableSelect(toast)}
                  className="flex items-center justify-center space-x-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 py-1.5 px-2 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                  title="Desativar alertas para este colaborador/estação"
                >
                  <BellOff className="w-3 h-3 text-red-400" />
                  <span>Desativar</span>
                </button>

                <button
                  onClick={() => setActivePanel(prev => prev?.toastId === toast.id && prev?.type === 'pausar' ? null : { toastId: toast.id, type: 'pausar' })}
                  className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-md text-[11px] font-medium transition-colors border cursor-pointer ${
                    isPausarOpen
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                      : 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-800/60'
                  }`}
                  title="Pausar alertas temporariamente"
                >
                  <PauseCircle className="w-3 h-3" />
                  <span>Pausar</span>
                </button>

                <button
                  onClick={() => {
                    setActivePanel(prev => prev?.toastId === toast.id && prev?.type === 'alterar' ? null : { toastId: toast.id, type: 'alterar' });
                    setCustomThresholdInput(String(toast.thresholdMinutes));
                  }}
                  className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-md text-[11px] font-medium transition-colors border cursor-pointer ${
                    isAlterarOpen
                      ? 'bg-blue-500 text-white border-blue-400 font-bold'
                      : 'bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border-blue-800/60'
                  }`}
                  title="Alterar o limite de tempo tolerado"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Alterar</span>
                </button>
              </div>

              {/* Inline Sub-panel for PAUSAR */}
              {isPausarOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 p-2.5 bg-zinc-900/90 border border-amber-500/40 rounded-lg text-xs space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] text-amber-300 font-semibold">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>Pausar alertas por quanto tempo?</span>
                    </span>
                    <button 
                      onClick={() => setActivePanel(null)} 
                      className="text-zinc-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {[15, 30, 60, 120].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => handlePauseSelect(toast, mins)}
                        className="bg-zinc-800 hover:bg-amber-600 hover:text-zinc-950 text-zinc-200 border border-zinc-700 hover:border-amber-500 py-1 px-1.5 rounded text-[10px] font-bold transition-all text-center"
                      >
                        {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Inline Sub-panel for ALTERAR */}
              {isAlterarOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 p-2.5 bg-zinc-900/90 border border-blue-500/40 rounded-lg text-xs space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] text-blue-300 font-semibold">
                    <span className="flex items-center space-x-1">
                      <Sliders className="w-3 h-3 text-blue-400" />
                      <span>Definir novo limite de inatividade:</span>
                    </span>
                    <button 
                      onClick={() => setActivePanel(null)} 
                      className="text-zinc-500 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  
                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[15, 30, 45, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => handleAlterSelect(toast, mins)}
                        className={`py-1 px-2 rounded text-[10px] font-bold border transition-all ${
                          toast.thresholdMinutes === mins
                            ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>

                  {/* Manual Input */}
                  <div className="flex items-center space-x-2 pt-1.5 border-t border-zinc-800">
                    <input
                      type="number"
                      min="5"
                      max="480"
                      value={customThresholdInput}
                      onChange={(e) => setCustomThresholdInput(e.target.value)}
                      placeholder="Minutos..."
                      className="w-24 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <span className="text-[10px] text-zinc-400">minutos</span>
                    <button
                      onClick={() => {
                        const val = parseInt(customThresholdInput, 10);
                        if (val && val >= 1) handleAlterSelect(toast, val);
                      }}
                      className="ml-auto bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] px-2.5 py-1 rounded transition-colors"
                    >
                      Salvar
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/80">
                <button
                  onClick={() => onNotifyEmployee(toast)}
                  className="flex-1 flex items-center justify-center space-x-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border border-zinc-700/60"
                  title="Enviar mensagem direta de atenção no PC"
                >
                  <Send className="w-3 h-3 text-amber-400" />
                  <span>Notificar PC</span>
                </button>

                <button
                  onClick={() => onInvestigate(toast.employeeId)}
                  className="flex-1 flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-md text-xs font-semibold shadow transition-colors"
                >
                  <Search className="w-3 h-3" />
                  <span>Investigar</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

