import React, { useState } from 'react';
import { IdleToast, Employee } from '../types';
import { 
  Bell, 
  BellOff,
  X, 
  Trash2, 
  Search, 
  AlertTriangle, 
  Clock, 
  Send, 
  Monitor, 
  CheckCircle2, 
  Filter,
  Check,
  Layers,
  History,
  UserCheck,
  Users,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

interface IdleAlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  toasts: IdleToast[];
  thresholdMinutes: number;
  setThresholdMinutes: (mins: number) => void;
  isIdleAlertsEnabled: boolean;
  setIsIdleAlertsEnabled: (val: boolean) => void;
  employees?: Employee[];
  individualAlertOverrides?: Record<string, boolean>;
  onToggleIndividualAlertOverride?: (employeeId: string) => void;
  onDismissToast: (id: string) => void;
  onClearAll: () => void;
  onInvestigate: (employeeId: string) => void;
  onNotifyEmployee: (toast: IdleToast) => void;
  onTriggerTestAlert: () => void;
  onDisableAlert?: (employeeId: string, toastId: string) => void;
  onPauseAlert?: (employeeId: string, toastId: string, durationMinutes: number) => void;
  onAlterThreshold?: (employeeId: string, toastId: string, newThresholdMinutes: number) => void;
}

export const IdleAlertsDrawer: React.FC<IdleAlertsDrawerProps> = ({
  isOpen,
  onClose,
  toasts,
  thresholdMinutes,
  setThresholdMinutes,
  isIdleAlertsEnabled,
  setIsIdleAlertsEnabled,
  employees = [],
  individualAlertOverrides = {},
  onToggleIndividualAlertOverride,
  onDismissToast,
  onClearAll,
  onInvestigate,
  onNotifyEmployee,
  onTriggerTestAlert,
  onDisableAlert,
  onPauseAlert,
  onAlterThreshold
}) => {
  const [filter, setFilter] = useState<'todos' | 'criticos' | 'alertas'>('todos');
  const [notifiedToasts, setNotifiedToasts] = useState<Record<string, boolean>>({});
  const [activeItemPanel, setActiveItemPanel] = useState<{ toastId: string; type: 'pausar' | 'alterar' } | null>(null);

  if (!isOpen) return null;

  const filteredToasts = toasts.filter(t => {
    if (filter === 'criticos') return t.severity === 'critico' || t.idleMinutes >= 30;
    if (filter === 'alertas') return t.severity === 'alerta' && t.idleMinutes < 30;
    return true;
  });

  const handleSendNotice = (toast: IdleToast) => {
    onNotifyEmployee(toast);
    setNotifiedToasts(prev => ({ ...prev, [toast.id]: true }));
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 font-sans"
      onClick={onClose}
    >
      {/* Centered Square Display Card */}
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Notification Icon */}
        <div className="p-4 sm:p-5 border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="relative p-2.5 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 rounded-2xl text-amber-600 dark:text-amber-400">
              <Bell className="w-5 h-5" />
              {toasts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs border-2 border-white dark:border-slate-900">
                  {toasts.length}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">Central de Notificações</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {toasts.length} {toasts.length === 1 ? 'alerta' : 'alertas'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Ocorrências e alertas de inatividade em tempo real</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="p-3.5 bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800/80 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                id="toggleIdleAlerts"
                checked={isIdleAlertsEnabled}
                onChange={(e) => setIsIdleAlertsEnabled(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Alertas Globais Ativos
              </span>
            </label>

            <button
              onClick={onTriggerTestAlert}
              className="text-[10px] font-bold text-blue-700 dark:text-blue-300 hover:text-blue-800 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-blue-500" />
              <span>+ Simular Alerta</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Tolerância:</span>
            <div className="flex items-center space-x-1">
              {[10, 15, 30].map(mins => (
                <button
                  key={mins}
                  onClick={() => setThresholdMinutes(mins)}
                  className={`px-2 py-0.5 rounded-lg font-bold border transition-all text-[10px] cursor-pointer ${
                    thresholdMinutes === mins
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts Scrollable Feed */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 min-h-[160px]">
          {filteredToasts.length === 0 ? (
            <div className="text-center py-10 space-y-2 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 opacity-90" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhum alerta pendente</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Todos os colaboradores estão ativos dentro da tolerância.</p>
            </div>
          ) : (
            filteredToasts.map(toast => {
              const isPausarOpen = activeItemPanel?.toastId === toast.id && activeItemPanel?.type === 'pausar';
              const isAlterarOpen = activeItemPanel?.toastId === toast.id && activeItemPanel?.type === 'alterar';

              return (
                <div
                  key={toast.id}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 shadow-xs space-y-2 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img 
                        src={toast.employeeAvatar || (toast as any).avatar} 
                        alt={toast.employeeName} 
                        className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0" 
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">{toast.employeeName}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{toast.department} • {toast.workModel}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border shrink-0 inline-block ${
                        toast.severity === 'critico' 
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' 
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      }`}>
                        {toast.idleMinutes} min inativo
                      </span>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">limite: {toast.thresholdMinutes}m</p>
                    </div>
                  </div>

                  {/* Quick Action Buttons Row: Desativar | Pausar | Alterar */}
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    <button
                      onClick={() => {
                        if (onDisableAlert) onDisableAlert(toast.employeeId, toast.id);
                        else onDismissToast(toast.id);
                      }}
                      className="px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold transition-colors cursor-pointer text-center"
                      title="Desativar monitoramento para este colaborador"
                    >
                      🛑 Desativar
                    </button>

                    <button
                      onClick={() => setActiveItemPanel(prev => prev?.toastId === toast.id && prev?.type === 'pausar' ? null : { toastId: toast.id, type: 'pausar' })}
                      className="px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold transition-colors cursor-pointer text-center"
                      title="Pausar alertas temporariamente"
                    >
                      ⏸️ Pausar
                    </button>

                    <button
                      onClick={() => setActiveItemPanel(prev => prev?.toastId === toast.id && prev?.type === 'alterar' ? null : { toastId: toast.id, type: 'alterar' })}
                      className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold transition-colors cursor-pointer text-center"
                      title="Alterar limite de tempo"
                    >
                      ✏️ Alterar
                    </button>
                  </div>

                  {/* Inline Pausar Panel */}
                  {isPausarOpen && (
                    <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-amber-300 dark:border-amber-700 text-[10px] space-y-1.5">
                      <p className="font-bold text-amber-800 dark:text-amber-300">Pausar alertas deste colaborador por:</p>
                      <div className="grid grid-cols-4 gap-1">
                        {[15, 30, 60, 120].map(m => (
                          <button
                            key={m}
                            onClick={() => {
                              if (onPauseAlert) onPauseAlert(toast.employeeId, toast.id, m);
                              else onDismissToast(toast.id);
                              setActiveItemPanel(null);
                            }}
                            className="py-1 bg-white dark:bg-slate-800 hover:bg-amber-500 hover:text-white font-bold rounded border border-slate-200 dark:border-slate-700 text-center"
                          >
                            {m < 60 ? `${m}m` : `${m/60}h`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inline Alterar Panel */}
                  {isAlterarOpen && (
                    <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-blue-300 dark:border-blue-700 text-[10px] space-y-1.5">
                      <p className="font-bold text-blue-800 dark:text-blue-300">Alterar limite tolerado:</p>
                      <div className="grid grid-cols-4 gap-1">
                        {[15, 30, 45, 60].map(m => (
                          <button
                            key={m}
                            onClick={() => {
                              if (onAlterThreshold) onAlterThreshold(toast.employeeId, toast.id, m);
                              else toast.thresholdMinutes = m;
                              setActiveItemPanel(null);
                            }}
                            className="py-1 bg-white dark:bg-slate-800 hover:bg-blue-600 hover:text-white font-bold rounded border border-slate-200 dark:border-slate-700 text-center"
                          >
                            {m}m
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] font-bold">
                    <button
                      onClick={() => handleSendNotice(toast)}
                      disabled={notifiedToasts[toast.id]}
                      className="text-blue-700 dark:text-blue-300 hover:text-blue-800 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[10px]"
                    >
                      {notifiedToasts[toast.id] ? '✓ Notificado' : 'Notificar Colaborador'}
                    </button>

                    <button
                      onClick={() => onDismissToast(toast.id)}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer text-[10px]"
                    >
                      Dispensar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex justify-between items-center text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{toasts.length} Alertas Ativos</span>
          <div className="flex items-center space-x-2">
            {toasts.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-rose-600 dark:text-rose-400 font-bold hover:underline text-[11px] cursor-pointer"
              >
                Limpar Todos
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-[11px] transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
