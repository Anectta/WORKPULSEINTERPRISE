import React, { useState, useEffect } from 'react';
import { 
  Employee, 
  DepartmentSummary 
} from '../types';
import { 
  Trophy, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Home, 
  Laptop, 
  Users, 
  Zap, 
  AlertTriangle,
  Download,
  FileSpreadsheet
} from 'lucide-react';

interface ProductivityRankingsProps {
  employees: Employee[];
  departmentSummaries: DepartmentSummary[];
  exportTrigger?: number;
}

export const ProductivityRankings: React.FC<ProductivityRankingsProps> = ({
  employees,
  departmentSummaries,
  exportTrigger
}) => {
  const [rankingType, setRankingType] = useState<'individual' | 'department' | 'workModel'>('individual');

  // Sorted employees by productivity score
  const sortedEmployees = [...employees].sort((a, b) => b.productivityScore - a.productivityScore);

  const handleExportCsv = () => {
    const headers = ['Posicao', 'Colaborador', 'Cargo', 'Departamento', 'Modelo_Trabalho', 'Horas_Ativas_Hoje', 'Score_Produtividade', 'Status'];
    const rows = sortedEmployees.map((emp, index) => [
      `#${index + 1}`,
      `"${emp.name}"`,
      `"${emp.role}"`,
      `"${emp.department}"`,
      `"${emp.workModel}"`,
      `${emp.productiveHoursToday}h`,
      `${emp.productivityScore}%`,
      `"${emp.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `workpulse_ranking_produtividade_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (exportTrigger && exportTrigger > 0) {
      handleExportCsv();
    }
  }, [exportTrigger]);

  return (
    <div className="space-y-6 font-sans">
      {/* Subtab Toggle */}
      <div className="flex bg-white dark:bg-slate-900 p-2 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs text-xs justify-between items-center flex-wrap gap-2">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setRankingType('individual')}
            className={`px-4 py-2 rounded-full font-bold transition-all flex items-center space-x-2 text-xs cursor-pointer ${
              rankingType === 'individual' 
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs font-bold' 
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold'
            }`}
          >
            <span>🏆 Ranking Individual</span>
          </button>
          <button
            onClick={() => setRankingType('department')}
            className={`px-4 py-2 rounded-full font-bold transition-all flex items-center space-x-2 text-xs cursor-pointer ${
              rankingType === 'department' 
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs font-bold' 
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold'
            }`}
          >
            <span>🏢 Ranking por Departamento</span>
          </button>
          <button
            onClick={() => setRankingType('workModel')}
            className={`px-4 py-2 rounded-full font-bold transition-all flex items-center space-x-2 text-xs cursor-pointer ${
              rankingType === 'workModel' 
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs font-bold' 
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold'
            }`}
          >
            <span>💻 Comparativo Híbrido</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3.5 py-1.5 rounded-full flex items-center">
            <Trophy className="w-3.5 h-3.5 mr-1.5 text-amber-600 dark:text-amber-400" />
            Métrica Algorítmica Unificada
          </span>

          <button
            onClick={handleExportCsv}
            className="px-4 py-1.5 rounded-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1.5 transition-colors shadow-xs text-xs cursor-pointer"
            title="Exportar Ranking Geral em CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {rankingType === 'individual' ? (
        <div className="space-y-6">
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sortedEmployees.slice(0, 3).map((emp, idx) => {
              const medals = ['🥇 1º Lugar', '🥈 2º Lugar', '🥉 3º Lugar'];
              const borders = [
                'border-amber-300 dark:border-amber-700 bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/40 dark:to-slate-900',
                'border-slate-300 dark:border-slate-700 bg-gradient-to-b from-slate-100 to-white dark:from-slate-800/60 dark:to-slate-900',
                'border-amber-200 dark:border-amber-800 bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900'
              ];

              return (
                <div key={emp.id} className={`p-6 rounded-3xl border ${borders[idx]} text-slate-900 dark:text-white space-y-3 relative overflow-hidden shadow-xs`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                      {medals[idx]}
                    </span>
                    <span className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{emp.productivityScore}%</span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <img src={emp.avatar} alt={emp.name} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">{emp.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{emp.role}</p>
                      <span className="text-[10px] text-blue-700 dark:text-blue-400 font-bold block">{emp.department}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span>Horas Ativas: <strong className="text-slate-900 dark:text-white">{emp.productiveHoursToday}h</strong></span>
                    <span>Modelo: <strong className="text-slate-900 dark:text-white">{emp.workModel}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full List Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Classificação Geral de Colaboradores</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ordenado pelo índice do algoritmo de engajamento</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="p-3 rounded-l-xl">Posição</th>
                    <th className="p-3">Colaborador</th>
                    <th className="p-3">Departamento</th>
                    <th className="p-3">Modelo</th>
                    <th className="p-3">Horas Ativas</th>
                    <th className="p-3">Score Produtividade</th>
                    <th className="p-3 rounded-r-xl text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {sortedEmployees.map((emp, rank) => (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="p-3 font-mono font-black text-slate-900 dark:text-white">#{rank + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{emp.role}</div>
                      </td>
                      <td className="p-3 font-bold text-blue-700 dark:text-blue-400">{emp.department}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{emp.workModel}</td>
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{emp.productiveHoursToday}h</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black border ${
                          emp.productivityScore >= 80 
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' 
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        }`}>
                          {emp.productivityScore}%
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : rankingType === 'department' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departmentSummaries.map((dept) => (
            <div key={dept.department} className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900 dark:text-white text-sm">{dept.department}</span>
                <span className="text-xl font-black text-blue-700 dark:text-blue-400 font-mono">{dept.avgProductivityScore}%</span>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full" 
                  style={{ width: `${dept.avgProductivityScore}%` }}
                ></div>
              </div>

              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 font-medium pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span>Equipe Ativa:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{dept.employeeCount} Colaboradores</span>
                </div>
                <div className="flex justify-between">
                  <span>Horas Produtivas Acumuladas:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{dept.totalProductiveHours.toFixed(1)}h</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { model: 'Home Office', score: 88, hours: '6.8h', count: 3, icon: Home, color: 'blue' },
            { model: 'Presencial', score: 81, hours: '6.0h', count: 2, icon: Building2, color: 'slate' },
            { model: 'Híbrido', score: 89, hours: '6.3h', count: 3, icon: Laptop, color: 'emerald' },
          ].map((item) => (
            <div key={item.model} className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <item.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-black text-slate-900 dark:text-white text-sm">{item.model}</span>
                </div>
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{item.score}%</span>
              </div>

              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 font-medium pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span>Média Horas Ativas:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{item.hours}/dia</span>
                </div>
                <div className="flex justify-between">
                  <span>Total de Colaboradores:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{item.count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
