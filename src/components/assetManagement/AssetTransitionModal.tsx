import React, { useState } from 'react';
import { 
  X, 
  ArrowRight, 
  Check, 
  Calendar, 
  User, 
  DollarSign, 
  FileText, 
  Building2, 
  Save 
} from 'lucide-react';
import { ITAsset, AssetLifecycleStage, Employee, EnvironmentRoomItem } from '../../types';
import { LIFECYCLE_STAGES, getLifecycleStageConfig } from './lifecycleConfig';

interface AssetTransitionModalProps {
  asset: ITAsset;
  employees: Employee[];
  rooms: EnvironmentRoomItem[];
  onClose: () => void;
  onSaveTransition: (
    assetId: string, 
    newStage: AssetLifecycleStage, 
    date: string, 
    description: string, 
    user: string, 
    cost?: number,
    newAssignedEmployeeId?: string,
    newRoomName?: string
  ) => void;
}

export const AssetTransitionModal: React.FC<AssetTransitionModalProps> = ({
  asset,
  employees,
  rooms,
  onClose,
  onSaveTransition
}) => {
  const currentConfig = getLifecycleStageConfig(asset.lifecycleStage);
  
  // Suggest next stage by default
  const nextStageIndex = LIFECYCLE_STAGES.findIndex(s => s.stage === asset.lifecycleStage);
  const suggestedNextStage = nextStageIndex >= 0 && nextStageIndex < LIFECYCLE_STAGES.length - 1 
    ? LIFECYCLE_STAGES[nextStageIndex + 1].stage 
    : 'utilizacao';

  const [selectedStage, setSelectedStage] = useState<AssetLifecycleStage>(suggestedNextStage);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [user, setUser] = useState<string>('Gestor de TI & Infra');
  const [cost, setCost] = useState<number>(0);
  const [newEmployeeId, setNewEmployeeId] = useState<string>(asset.assignedEmployeeId || '');
  const [newRoom, setNewRoom] = useState<string>(asset.roomName || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Por favor, informe a justificativa ou descrição do evento de transição de ciclo de vida.');
      return;
    }
    onSaveTransition(
      asset.id,
      selectedStage,
      date,
      description,
      user,
      cost > 0 ? cost : undefined,
      newEmployeeId || undefined,
      newRoom || undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ArrowRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Avançar Ciclo de Vida do Ativo
              </h3>
              <p className="text-[11px] text-slate-500">
                Tombo: <strong className="font-mono text-amber-600 dark:text-amber-400">{asset.assetTag}</strong> • {asset.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          
          {/* Current vs Next Stage Preview */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Etapa Atual</span>
              <div className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-slate-200">
                {currentConfig.icon}
                <span>{currentConfig.label}</span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-amber-500 shrink-0" />
            <div className="space-y-0.5 text-right">
              <span className="text-[10px] uppercase font-bold text-amber-500">Nova Etapa</span>
              <div className="flex items-center space-x-1.5 font-black text-amber-600 dark:text-amber-400 justify-end">
                {getLifecycleStageConfig(selectedStage).icon}
                <span>{getLifecycleStageConfig(selectedStage).label}</span>
              </div>
            </div>
          </div>

          {/* Lifecycle Stages Grid Selection */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Selecione a Nova Etapa do Ciclo de Vida:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LIFECYCLE_STAGES.map(st => {
                const isSelected = selectedStage === st.stage;
                const isCurrent = asset.lifecycleStage === st.stage;

                return (
                  <button
                    key={st.stage}
                    type="button"
                    onClick={() => setSelectedStage(st.stage)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30 font-bold'
                        : isCurrent
                        ? 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-500'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className={`p-1 rounded-lg ${isSelected ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        {st.icon}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                      {isCurrent && !isSelected && <span className="text-[9px] font-bold text-slate-400">Atual</span>}
                    </div>
                    <span className="font-extrabold text-[11px] block">{st.shortLabel}</span>
                    <span className="text-[9px] text-slate-400 leading-tight truncate">{st.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Responsible User */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Data do Registro / Evento:
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Técnico / Responsável pelo Registro:
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="Nome do analista ou comissão..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  required
                />
              </div>
            </div>
          </div>

          {/* Optional Transfer Fields */}
          {selectedStage === 'transferencia' && (
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 space-y-2.5">
              <span className="font-bold text-purple-900 dark:text-purple-300 text-[11px] block">
                Dados do Remanejamento / Transferência de Custódia:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Novo Colaborador:</label>
                  <select
                    value={newEmployeeId}
                    onChange={(e) => setNewEmployeeId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                  >
                    <option key="none" value="">Sem colaborador direto</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nova Sala / Local:</label>
                  <select
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                  >
                    <option key="current" value="">Local atual</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Optional Cost (e.g. maintenance, disposal fee, installation service) */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Custo Financeiro Desta Etapa (R$ Opcional):
            </label>
            <div className="relative">
              <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                placeholder="0.00"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
              />
            </div>
            <span className="text-[10px] text-slate-400">
              Custos informados aqui são somados aos custos acumulados de manutenção e histórico financeiro do ativo.
            </span>
          </div>

          {/* Description / Audit Note */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Descrição & Justificativa do Evento (Histórico / Trilha de Auditoria):
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Ex: Equipamento conferido fisicamente na doca, gerado tombo PAT-2026-0001 e encaminhado para bancada técnica para deploy de SO..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-amber-500/40"
              required
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 cursor-pointer flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Confirmar Transição & Registrar no Histórico</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
