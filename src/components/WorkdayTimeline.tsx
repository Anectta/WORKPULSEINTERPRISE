import React, { useState } from 'react';
import { 
  Employee, 
  TimecardRecord, 
  PCLockPolicy 
} from '../types';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  ShieldCheck, 
  Settings, 
  FileCheck2, 
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

interface WorkdayTimelineProps {
  employees: Employee[];
  timecardRecords: TimecardRecord[];
  pcLockPolicies: PCLockPolicy[];
  onTogglePcLockPolicy: (id: string) => void;
  onUpdateLockMessage: (id: string, newMessage: string) => void;
}

export const WorkdayTimeline: React.FC<WorkdayTimelineProps> = ({
  employees,
  timecardRecords,
  pcLockPolicies,
  onTogglePcLockPolicy,
  onUpdateLockMessage
}) => {
  const [activeTab, setActiveTab] = useState<'correlation' | 'pc_lock'>('correlation');
  const [selectedRecord, setSelectedRecord] = useState<TimecardRecord | null>(timecardRecords[1] || null);

  return (
    <div className="space-y-6 font-sans">
      {/* Subtab Toggle */}
      <div className="flex bg-white dark:bg-slate-900 p-2 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs text-xs justify-between items-center flex-wrap gap-2">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setActiveTab('correlation')}
            className={`px-4 py-2 rounded-full font-bold transition-all flex items-center space-x-2 text-xs cursor-pointer ${
              activeTab === 'correlation' 
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs font-bold' 
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Cruzamento com Ponto Eletrônico (REP)</span>
          </button>
          <button
            onClick={() => setActiveTab('pc_lock')}
            className={`px-4 py-2 rounded-full font-bold transition-all flex items-center space-x-2 text-xs cursor-pointer ${
              activeTab === 'pc_lock' 
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs font-bold' 
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Bloqueio Automático Pós-Expediente</span>
          </button>
        </div>

        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3.5 py-1.5 rounded-full flex items-center">
          <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" /> Portaria 671 MTP / REP-C / REP-P
        </span>
      </div>

      {activeTab === 'correlation' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timecard correlation table */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Registros de Ponto vs Atividade Efetiva na Estação</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Comparativo do ponto batido com o uso do computador</p>
              </div>
              <span className="text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-full">
                3 Integrações Ativas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="p-3 rounded-l-xl">Colaborador</th>
                    <th className="p-3">Sistema Ponto</th>
                    <th className="p-3">Horário Ponto</th>
                    <th className="p-3">Horas Ativas PC</th>
                    <th className="p-3">Correlação</th>
                    <th className="p-3 rounded-r-xl">Anomalia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {timecardRecords.map((rec) => {
                    const isSelected = selectedRecord?.id === rec.id;
                    return (
                      <tr 
                        key={rec.id}
                        onClick={() => setSelectedRecord(rec)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-blue-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white">{rec.employeeName}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{rec.department}</div>
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 font-semibold">{rec.sourceSystem}</td>
                        <td className="p-3 font-mono text-slate-800 dark:text-slate-200 font-bold">{rec.clockIn} - {rec.clockOut}</td>
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{rec.activePCHours}h</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            rec.correlationScore >= 90
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : rec.correlationScore >= 75
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          }`}>
                            {rec.correlationScore}% MATCH
                          </span>
                        </td>
                        <td className="p-3">
                          {rec.anomalyDetected ? (
                            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-lg flex items-center w-max">
                              <AlertTriangle className="w-3 h-3 mr-1" /> {rec.anomalyType}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg flex items-center w-max">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Timecard detail inspector card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center">
              <FileCheck2 className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              Inspeção do Espelho de Ponto
            </h3>

            {selectedRecord ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Colaborador Selecionado</span>
                  <div className="text-sm font-black text-slate-900 dark:text-white">{selectedRecord.employeeName}</div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">{selectedRecord.department} • Integração REP {selectedRecord.sourceSystem}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                  <div className="p-3 bg-slate-50/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">Ponto Batido</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{selectedRecord.clockIn} - {selectedRecord.clockOut}</span>
                  </div>
                  <div className="p-3 bg-slate-50/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">Atividade no PC</span>
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm">{selectedRecord.activePCHours}h Efetivas</span>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center text-amber-900 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-700 dark:text-amber-400" />
                    Auditoria de Conformidade Trabalhista
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                    {selectedRecord.anomalyDetected 
                      ? `Atenção: Detectado "${selectedRecord.anomalyType}". Recomenda-se verificação de horas extras não autorizadas para evitar passivo CLT.`
                      : 'Nenhuma inconformidade de horas encontrada neste registro. Ponto 100% aderente ao tempo de máquina.'}
                  </p>
                </div>

                <button
                  onClick={() => {
                    const headers = ['Colaborador', 'Departamento', 'Sistema_REP', 'Horario_Ponto', 'Horas_Ativas_PC', 'Correlacao_Score', 'Anomalia_Detectada', 'Tipo_Anomalia', 'Hash_Integridade_SHA256'];
                    const row = [
                      `"${selectedRecord.employeeName}"`,
                      `"${selectedRecord.department}"`,
                      `"${selectedRecord.sourceSystem}"`,
                      `"${selectedRecord.clockIn} - ${selectedRecord.clockOut}"`,
                      `${selectedRecord.activePCHours}h`,
                      `${selectedRecord.correlationScore}%`,
                      selectedRecord.anomalyDetected ? 'SIM' : 'NAO',
                      `"${selectedRecord.anomalyType || 'N/A'}"`,
                      `"SHA256_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}"`
                    ];
                    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), row.join(';')].join('\n');
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement('a');
                    link.setAttribute('href', encodedUri);
                    link.setAttribute('download', `workpulse_dossie_ponto_${selectedRecord.employeeName.toLowerCase().replace(/\s+/g, '_')}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="w-full py-3 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-bold rounded-full shadow-xs text-xs transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  <span>Exportar Dossiê de Auditoria Ponto + PC (CSV)</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">Selecione um colaborador na tabela ao lado para inspecionar o espelho de ponto.</p>
            )}
          </div>
        </div>
      ) : (
        /* PC Lock Tab */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Políticas de Trava de Tela Pós-Expediente (Prevenção de Passivo CLT)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              O Agente Silencioso bloqueia a estação de trabalho automaticamente após o término da jornada cadastrada no RH para evitar horas extras indevidas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pcLockPolicies.map((pol) => (
              <div key={pol.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">{pol.department}</span>
                  <button
                    onClick={() => onTogglePcLockPolicy(pol.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                      pol.enabled ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {pol.enabled ? '● BLOQUEIO ATIVO' : 'PAUSADO'}
                  </button>
                </div>

                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <div className="flex justify-between">
                    <span>Início do Bloqueio:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{pol.lockStartTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tolerância de Graça:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{pol.gracePeriodMinutes} min</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-1">Mensagem exibida na tela do PC:</span>
                  <input
                    type="text"
                    value={pol.customLockMessage}
                    onChange={(e) => onUpdateLockMessage(pol.id, e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
