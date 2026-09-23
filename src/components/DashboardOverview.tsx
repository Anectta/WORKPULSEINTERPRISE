import React, { useMemo } from 'react';
import { 
  Employee, 
  DepartmentSummary 
} from '../types';
import { 
  TrendingUp, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  PauseCircle, 
  Lock, 
  Building2, 
  Home, 
  Laptop,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Calendar,
  Activity,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';

interface DashboardOverviewProps {
  employees: Employee[];
  departmentSummaries: DepartmentSummary[];
  onSelectEmployee: (emp: Employee) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[190px] text-white">
        <p className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-slate-400 font-normal">7d Trend</span>
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-sm"></span>
            Produtividade Média:
          </span>
          <span className="font-mono font-bold text-emerald-400 text-sm">{data.score}%</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
            Inatividade Média:
          </span>
          <span className="font-mono text-amber-300">{data.idle}%</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-slate-400 pt-1 border-t border-slate-800 text-[11px]">
          <span>Meta Operacional:</span>
          <span className="font-mono text-slate-300">{data.target}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  employees,
  departmentSummaries,
  onSelectEmployee
}) => {
  // Calculations
  const totalActive = employees.length;
  const avgScore = Math.round(
    employees.reduce((acc, curr) => acc + curr.productivityScore, 0) / (employees.length || 1)
  );

  const totalProductiveHours = employees.reduce((acc, curr) => acc + curr.productiveHoursToday, 0).toFixed(1);
  const totalIdleHours = employees.reduce((acc, curr) => acc + curr.idleHoursToday, 0).toFixed(1);
  const totalUnproductiveHours = employees.reduce((acc, curr) => acc + curr.unproductiveHoursToday, 0).toFixed(1);

  const idleEmployees = employees.filter(e => e.status === 'Ocioso');
  const lockedEmployees = employees.filter(e => e.pcLockStatus === 'Bloqueado Pós-Expediente');

  // Generate historical 7-day productivity trend
  const last7DaysData = useMemo(() => {
    const today = new Date();
    const variations = [-5, -2, -6, 2, -1, 3, 0];
    
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - idx));
      
      const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const dateFormatted = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const label = idx === 6 ? `Hoje (${dateFormatted})` : `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dateFormatted}`;
      
      const rawScore = avgScore + variations[idx];
      const score = Math.max(45, Math.min(98, rawScore));
      
      return {
        date: label,
        score: score,
        target: 80,
        idle: Math.max(3, Math.round((100 - score) * 0.55)),
      };
    });
  }, [avgScore]);

  return (
    <div className="space-y-6 font-sans">

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Score Global */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider font-mono">
              ÍNDICE DE PRODUTIVIDADE
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100/80 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{avgScore}%</span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200/80 dark:border-emerald-800 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> +3.4% vs ontem
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 my-3 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${avgScore}%` }}
            ></div>
          </div>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Calculado com base no tempo de uso ativo de software</p>
        </div>

        {/* Card 2: Horas Produtivas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider font-mono">
              HORAS PRODUTIVAS HOJE
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100/80 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{totalProductiveHours}h</span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700">
              Meta: {(employees.length * 8)}h
            </span>
          </div>
          <div className="flex gap-1.5 my-3">
            <div className="h-1.5 flex-1 bg-emerald-500 rounded-full"></div>
            <div className="h-1.5 flex-1 bg-emerald-500 rounded-full"></div>
            <div className="h-1.5 flex-1 bg-emerald-500 rounded-full"></div>
            <div className="h-1.5 flex-1 bg-emerald-500 rounded-full"></div>
          </div>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">VS Code, Salesforce, SAP, Teams, Figma</p>
        </div>

        {/* Card 3: Horas Ociosas / Inatividade */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider font-mono">
              TEMPO OCIOSO ACUMULADO
            </span>
            <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-100/80 dark:border-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <PauseCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{totalIdleHours}h</span>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-200/80 dark:border-amber-800">
              {idleEmployees.length} Ociosos
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full my-3 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: '22%' }}></div>
          </div>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Inatividade de mouse/teclado &gt; 15 min</p>
        </div>

        {/* Card 4: Estações Bloqueadas Pós-Expediente */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider font-mono">
              TRAVA DE TELA PÓS-18H
            </span>
            <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-100/80 dark:border-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{lockedEmployees.length}</span>
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-3 py-1 rounded-full border border-purple-200/80 dark:border-purple-800">
              Bloqueio Ativo
            </span>
          </div>
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-100 dark:border-slate-700 my-2">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">Segurança CLT</span>
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
          </div>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Conformidade com a jornada registrada</p>
        </div>
      </div>

      {/* Recharts: 7-Day Historical Productivity Trend Line Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center space-x-2.5">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Evolução de Produtividade Média (7 Dias)</h3>
              <span className="text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Histórico Operacional
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-400 font-medium mt-1">
              Tendência temporal do índice de produtividade para os {employees.length} colaboradores selecionados
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-bold">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 shadow-xs"></span>
              <span className="text-slate-700 dark:text-slate-300">Score Real</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-4 h-0.5 bg-slate-400"></span>
              <span className="text-slate-400">Meta (80%)</span>
            </div>
          </div>
        </div>

        <div className="h-[280px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={last7DaysData}
              margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
              />
              <YAxis 
                domain={[0, 100]} 
                stroke="#64748b" 
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
                unit="%"
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={80} 
                stroke="#64748b" 
                strokeDasharray="4 4" 
                label={{ value: 'Meta 80%', fill: '#94a3b8', fontSize: 10, fontWeight: 700, position: 'insideTopRight' }} 
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#3b82f6" 
                strokeWidth={3.5} 
                dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#ffffff' }} 
                activeDot={{ r: 8, fill: '#60a5fa', stroke: '#ffffff', strokeWidth: 2 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium gap-2">
          <div className="flex items-center space-x-2">
            <span>Média no Período:</span>
            <span className="font-mono font-black text-blue-700 dark:text-blue-400 text-sm">
              {Math.round(last7DaysData.reduce((acc, d) => acc + d.score, 0) / 7)}%
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span>Variação Semanal:</span>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              {last7DaysData[6].score - last7DaysData[0].score >= 0 ? '+' : ''}
              {(last7DaysData[6].score - last7DaysData[0].score)}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Atualizado automaticamente em tempo real com base no fluxo de dados dos agentes
          </p>
        </div>
      </div>

      {/* Hourly Distribution Curve & Work Model Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Distribution Curve */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">Atividade por Faixa Horária</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Distribuição de engajamento ao longo do turno corporativo</p>
            </div>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              Hoje (08:00 - 18:00)
            </span>
          </div>

          <div className="space-y-3.5 mt-4">
            {[
              { time: '08:00 - 10:00', prod: 88, idle: 6, unprod: 6 },
              { time: '10:00 - 12:00', prod: 94, idle: 3, unprod: 3 },
              { time: '12:00 - 13:00 (Almoço)', prod: 30, idle: 60, unprod: 10 },
              { time: '13:00 - 15:00', prod: 89, idle: 5, unprod: 6 },
              { time: '15:00 - 17:00', prod: 82, idle: 8, unprod: 10 },
              { time: '17:00 - 18:00', prod: 72, idle: 18, unprod: 10 },
            ].map((slot, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-800 dark:text-slate-200 font-bold">
                  <span>{slot.time}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">{slot.prod}% Produtivo | {slot.idle}% Ocioso</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full flex overflow-hidden border border-slate-200 dark:border-slate-700 p-0.5">
                  <div className="bg-blue-600 h-full rounded-l-full transition-all" style={{ width: `${slot.prod}%` }} title="Produtivo"></div>
                  <div className="bg-amber-400 h-full transition-all" style={{ width: `${slot.idle}%` }} title="Ocioso"></div>
                  <div className="bg-rose-500 h-full rounded-r-full transition-all" style={{ width: `${slot.unprod}%` }} title="Improdutivo"></div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center space-x-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-blue-600"></span>
              <span>Produtivo</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-amber-400"></span>
              <span>Ocioso</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-rose-500"></span>
              <span>Improdutivo</span>
            </div>
          </div>
        </div>

        {/* Work Model Comparison */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-base mb-1">Análise por Modelo de Trabalho</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-5">Eficiência por formato de trabalho</p>

            <div className="space-y-3.5">
              {/* Home Office */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
                      <Home className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Home Office</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">3 Colaboradores</span>
                    </div>
                  </div>
                  <span className="text-sm font-black text-blue-700 dark:text-blue-400">88%</span>
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex justify-between">
                  <span>Média Ativa: 6.8h/dia</span>
                  <span>Ociosidade: 0.4h</span>
                </div>
              </div>

              {/* Presencial */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Presencial (Sede)</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">2 Colaboradores</span>
                    </div>
                  </div>
                  <span className="text-sm font-black text-slate-700 dark:text-slate-300">81%</span>
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex justify-between">
                  <span>Média Ativa: 6.0h/dia</span>
                  <span>Ociosidade: 0.3h</span>
                </div>
              </div>

              {/* Híbrido */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Trabalho Híbrido</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">3 Colaboradores</span>
                    </div>
                  </div>
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">89%</span>
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex justify-between">
                  <span>Média Ativa: 6.3h/dia</span>
                  <span>Ociosidade: 0.2h</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span>Score Comparativo</span>
            <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              Híbrido +8% vs Média
            </span>
          </div>
        </div>
      </div>

      {/* Live Grid of Workstations */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-base">Estações de Trabalho Monitoradas</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status em tempo real das máquinas e aplicações ativas</p>
          </div>
          <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-xl font-bold">
            {employees.length} Estações Conectadas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {employees.map((emp) => {
            const isIdle = emp.status === 'Ocioso';
            const isLocked = emp.pcLockStatus === 'Bloqueado Pós-Expediente';
            
            return (
              <div 
                key={emp.id}
                onClick={() => onSelectEmployee(emp)}
                className={`p-4 rounded-2xl transition-all cursor-pointer relative ${
                  isLocked 
                    ? 'bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 hover:border-purple-400 shadow-sm' 
                    : isIdle 
                    ? 'bg-rose-50/50 dark:bg-rose-950/30 border-2 border-red-500 ring-2 ring-red-400/60 shadow-md shadow-red-200/50 animate-pulse hover:border-red-600' 
                    : 'bg-slate-50/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 shadow-sm'
                }`}
              >
                {/* Visual Alert Indicator for Idle employees */}
                {isIdle && (
                  <div className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600 border border-white dark:border-slate-900"></span>
                  </div>
                )}

                <div className="flex items-center space-x-3 mb-3">
                  <div className="relative">
                    <img 
                      src={emp.avatar} 
                      alt={emp.name} 
                      className={`w-10 h-10 rounded-xl object-cover ring-2 shrink-0 ${
                        isIdle ? 'ring-red-400' : 'ring-slate-200 dark:ring-slate-700'
                      }`}
                    />
                    {isIdle && (
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center text-[8px] text-white font-black" title="Colaborador Ocioso">
                        !
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">{emp.name}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">{emp.role}</p>
                    <span className="text-[10px] text-blue-700 dark:text-blue-400 font-bold block">{emp.department}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Status:</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      isLocked 
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800' 
                        : isIdle 
                        ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800 font-black' 
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    }`}>
                      {emp.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Software:</span>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]" title={emp.currentApp}>
                      {emp.currentApp}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Modelo:</span>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{emp.workModel}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Score:</span>
                    <span className={`text-xs font-mono font-black ${
                      emp.productivityScore >= 80 ? 'text-emerald-700 dark:text-emerald-400' : emp.productivityScore >= 60 ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'
                    }`}>
                      {emp.productivityScore}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
