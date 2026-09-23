import React, { useState } from 'react';
import { 
  PersonaView, 
  Employee, 
  DepartmentSummary 
} from '../types';
import { 
  Users, 
  Building2, 
  Target, 
  PieChart, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  Plus, 
  BarChart2, 
  Sliders
} from 'lucide-react';

interface CustomBIAndPersonasProps {
  selectedPersona: PersonaView;
  setSelectedPersona: (p: PersonaView) => void;
  employees: Employee[];
  departmentSummaries: DepartmentSummary[];
}

export const CustomBIAndPersonas: React.FC<CustomBIAndPersonasProps> = ({
  selectedPersona,
  setSelectedPersona,
  employees,
  departmentSummaries
}) => {
  const [customKPIs, setCustomKPIs] = useState([
    { id: 'kpi-1', title: 'Aderência ao Ponto Eletrônico', value: '98.4%', target: '95%', status: 'Excelente' },
    { id: 'kpi-2', title: 'Índice de Licenças Não Utilizadas', value: '3.2%', target: '< 5%', status: 'Ok' },
    { id: 'kpi-3', title: 'Alerta Preventivo de Overtime (RH)', value: '4 Colaboradores', target: '0', status: 'Atenção' }
  ]);

  const [newKpiTitle, setNewKpiTitle] = useState('');
  const [newKpiVal, setNewKpiVal] = useState('');

  const handleAddKpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKpiTitle.trim()) return;
    setCustomKPIs([
      ...customKPIs,
      { id: `kpi-${Date.now()}`, title: newKpiTitle, value: newKpiVal || '85%', target: '80%', status: 'Personalizado' }
    ]);
    setNewKpiTitle('');
    setNewKpiVal('');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Subtab Persona Switcher */}
      <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm text-xs justify-between items-center flex-wrap gap-2">
        <div className="flex items-center space-x-1 flex-wrap">
          {[
            { key: 'BI_GERAL', label: '👁️ Visão Geral BI' },
            { key: 'RH_PEOPLE', label: '👥 RH & People Analytics' },
            { key: 'DIRETORIA', label: '👔 Diretoria Executiva' },
            { key: 'GESTORES', label: '🎯 Gestores & Lideranças' },
            { key: 'TI_COMPLIANCE', label: '🔒 TI & Compliance LGPD' }
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setSelectedPersona(p.key as PersonaView)}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all ${
                selectedPersona === p.key ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-xl">
          Persona Ativa: {selectedPersona}
        </span>
      </div>

      {/* Persona Context View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Painel Estratégico de Indicadores (BI Corporativo)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">KPIs e metas configurados sob medida para tomada de decisão</p>
          </div>
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg">
            3 Indicadores Personalizados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {customKPIs.map((kpi) => (
            <div key={kpi.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">{kpi.title}</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{kpi.value}</span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Meta: {kpi.target}</span>
              </div>
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700 flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400">Status:</span>
                <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {kpi.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Custom KPI Form */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-black text-slate-900 dark:text-white mb-3 uppercase tracking-wider font-mono">Adicionar Novo KPI ao Painel</h4>
          <form onSubmit={handleAddKpi} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Nome do KPI (Ex: Taxa de Absenteísmo)"
              value={newKpiTitle}
              onChange={(e) => setNewKpiTitle(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:outline-none"
              required
            />
            <input
              type="text"
              placeholder="Valor Atual (Ex: 1.2%)"
              value={newKpiVal}
              onChange={(e) => setNewKpiVal(e.target.value)}
              className="w-full sm:w-48 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm shrink-0"
            >
              Criar KPI
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
