import React, { useState } from 'react';
import { 
  Employee, 
  ActivityLog, 
  AppCategory 
} from '../types';
import { 
  Activity, 
  Search, 
  Filter, 
  Laptop, 
  Globe, 
  Clock, 
  UserCheck, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Bell,
  Zap,
  Send,
  SlidersHorizontal
} from 'lucide-react';

interface ActivityMonitoringProps {
  employees: Employee[];
  activityLogs: ActivityLog[];
  selectedEmployee: Employee | null;
  onSelectEmployee: (emp: Employee) => void;
  idleThresholdMinutes?: number;
  setIdleThresholdMinutes?: (mins: number) => void;
  onTriggerTestAlert?: () => void;
  onOpenIdleAlertsDrawer?: () => void;
  isIdleView?: boolean;
  individualAlertOverrides?: Record<string, boolean>;
  onToggleIndividualAlertOverride?: (employeeId: string) => void;
}

export const ActivityMonitoring: React.FC<ActivityMonitoringProps> = ({
  employees,
  activityLogs,
  selectedEmployee,
  onSelectEmployee,
  idleThresholdMinutes = 15,
  setIdleThresholdMinutes,
  onTriggerTestAlert,
  onOpenIdleAlertsDrawer,
  isIdleView = false,
  individualAlertOverrides = {},
  onToggleIndividualAlertOverride
}) => {
  const [filterCategory, setFilterCategory] = useState<AppCategory | 'Todas'>('Todas');
  const [localSearch, setLocalSearch] = useState('');

  const currentEmployee = selectedEmployee || employees[0];
  const idleEmployees = employees.filter(e => e.status === 'Ocioso');

  // Filter logs
  const filteredLogs = activityLogs.filter(log => {
    const matchesCategory = filterCategory === 'Todas' || log.category === filterCategory;
    const matchesSearch = 
      log.employeeName.toLowerCase().includes(localSearch.toLowerCase()) ||
      log.appName.toLowerCase().includes(localSearch.toLowerCase()) ||
      log.pcHost.toLowerCase().includes(localSearch.toLowerCase()) ||
      (log.domain && log.domain.toLowerCase().includes(localSearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Selector & Filter Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 rounded-3xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por programa, site ou PC..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 font-medium"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mr-2 uppercase font-mono">Categoria:</span>
          {['Todas', 'Produtivo', 'Improdutivo', 'Neutro', 'Ocioso'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterCategory === cat
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Employee Grid & Logs Table Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee Cards list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Colaboradores Monitorados</h3>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full font-bold border border-slate-200 dark:border-slate-700">
              {employees.length} Total
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {employees.map((emp) => {
              const isSelected = currentEmployee.id === emp.id;
              const isIdle = emp.status === 'Ocioso';
              const alertDisabled = individualAlertOverrides[emp.id] === false;

              return (
                <div
                  key={emp.id}
                  onClick={() => onSelectEmployee(emp)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected 
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-600 ring-1 ring-blue-400' 
                      : 'bg-slate-50/60 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <img src={emp.avatar} alt={emp.name} className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{emp.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{emp.role}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isIdle 
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' 
                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    }`}>
                      {emp.status}
                    </span>

                    {onToggleIndividualAlertOverride && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleIndividualAlertOverride(emp.id);
                        }}
                        className={`p-1 rounded-full border transition-all ${
                          alertDisabled 
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' 
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        }`}
                        title={alertDisabled ? "Alertas Silenciados para este usuário" : "Alertas Ativos para este usuário"}
                      >
                        <Bell className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Logs Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Linha do Tempo Detalhada: {currentEmployee.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Registros capturados pelo Agente Silencioso sem keylogger</p>
            </div>
            <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-xl border border-blue-200 dark:border-blue-800">
              {currentEmployee.pcHostName}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="p-3 rounded-l-xl">Horário</th>
                  <th className="p-3">Software / Processo</th>
                  <th className="p-3">Título da Janela</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3 rounded-r-xl text-right">Duração</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">{log.timestamp}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{log.appName}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={log.windowTitle}>
                      {log.windowTitle}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                        log.category === 'Produtivo'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : log.category === 'Ocioso'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : log.category === 'Improdutivo'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">{log.durationMinutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
