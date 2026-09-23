import React from 'react';
import { 
  Server, 
  Shield, 
  Network, 
  Monitor, 
  Laptop, 
  Printer, 
  Database, 
  Box, 
  Wifi, 
  Lock, 
  Globe, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight,
  TrendingUp,
  FileCheck2,
  AlertOctagon,
  HardDrive,
  Cpu,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { ConfigurationItem, CIRelationship, ITBusinessService, CMDBHealthScore } from '../../types/cmdb';

interface CmdbOverviewDashboardProps {
  items: ConfigurationItem[];
  relationships: CIRelationship[];
  services: ITBusinessService[];
  health: CMDBHealthScore;
  onNavigateTab: (tab: string) => void;
  onSelectCi: (ci: ConfigurationItem) => void;
  onOpenImpact: (ci: ConfigurationItem) => void;
}

export const CmdbOverviewDashboard: React.FC<CmdbOverviewDashboardProps> = ({
  items,
  relationships,
  services,
  health,
  onNavigateTab,
  onSelectCi,
  onOpenImpact
}) => {
  const total = items.length;
  const online = items.filter(i => i.status === 'operacional' || i.telemetry?.isOnline).length;
  const offline = items.filter(i => i.status === 'indisponivel' || i.telemetry?.isOnline === false).length;
  const inAlert = items.filter(i => i.status === 'atencao').length;

  const computers = items.filter(i => i.typeId === 'computador' || i.typeId === 'notebook').length;
  const servers = items.filter(i => i.typeId === 'servidor').length;
  const networkDevices = items.filter(i => i.typeId === 'switch' || i.typeId === 'firewall' || i.typeId === 'access_point' || i.typeId === 'link_internet' || i.typeId === 'vpn').length;
  const printers = items.filter(i => i.typeId === 'impressora').length;
  const databases = items.filter(i => i.typeId === 'banco_de_dados').length;

  // Critical alerts list
  const criticalItems = items.filter(i => i.status === 'indisponivel' || i.status === 'atencao' || (i.telemetry && i.telemetry.cpuUsagePct > 70));

  // Find orphaned CIs
  const connectedIds = new Set<string>();
  relationships.forEach(r => {
    connectedIds.add(r.sourceCiId);
    connectedIds.add(r.targetCiId);
  });
  const orphans = items.filter(i => !connectedIds.has(i.id));

  return (
    <div className="space-y-6">
      
      {/* 1. HEALTH SCORE BANNER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs relative overflow-hidden">
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {/* Score Ring */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-20 h-20 -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="#e2e8f0"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="#2563eb"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - health.overallScore / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-slate-900 dark:text-white">{health.overallScore}%</span>
                <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400">Grau {health.grade}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Saúde Geral da CMDB (Configuration Quality Score)</h2>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                  ITIL v4 Compliant
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-2xl leading-relaxed">
                Métrica consolidada de integridade da infraestrutura baseada em relacionamentos na topologia, atribuição de responsáveis, compliance de contratos de SLA e monitoramento ativo via telemetria.
              </p>
            </div>
          </div>

          {/* Submetrics Bars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto text-xs">
            <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 min-w-[130px]">
              <div className="text-slate-500 dark:text-slate-400 font-bold text-xs mb-1">Topologia Conectada</div>
              <div className="font-extrabold text-slate-900 dark:text-white text-base">{health.metrics.relationshipsPct}%</div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${health.metrics.relationshipsPct}%` }} />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 min-w-[130px]">
              <div className="text-slate-500 dark:text-slate-400 font-bold text-xs mb-1">Responsáveis</div>
              <div className="font-extrabold text-slate-900 dark:text-white text-base">{health.metrics.assignedOwnersPct}%</div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${health.metrics.assignedOwnersPct}%` }} />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 min-w-[130px]">
              <div className="text-slate-500 dark:text-slate-400 font-bold text-xs mb-1">Contratos Vinculados</div>
              <div className="font-extrabold text-slate-900 dark:text-white text-base">{health.metrics.contractsLinkedPct}%</div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${health.metrics.contractsLinkedPct}%` }} />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 min-w-[130px]">
              <div className="text-slate-500 dark:text-slate-400 font-bold text-xs mb-1">Monitoramento RMM</div>
              <div className="font-extrabold text-slate-900 dark:text-white text-base">{health.metrics.activeMonitoringPct}%</div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-teal-500 h-full rounded-full" style={{ width: `${health.metrics.activeMonitoringPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PRIMARY METRICS COUNTER TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Total CIs */}
        <div 
          onClick={() => onNavigateTab('itens')}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 p-5 rounded-3xl cursor-pointer transition-all shadow-xs hover:shadow-sm group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 dark:text-slate-400 text-xs font-extrabold tracking-wider font-mono">Total de CIs</span>
            <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">{total}</div>
          <div className="text-xs font-medium text-slate-400 mt-1">Itens de configuração</div>
        </div>

        {/* Online Status */}
        <div 
          onClick={() => onNavigateTab('topologia')}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500 p-5 rounded-3xl cursor-pointer transition-all shadow-xs hover:shadow-sm group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 dark:text-slate-400 text-xs font-extrabold tracking-wider font-mono">Operacionais</span>
            <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{online}</div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1">{Math.round((online / total) * 100)}% de disponibilidade</div>
        </div>

        {/* Offline Status */}
        <div 
          onClick={() => onNavigateTab('topologia')}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-red-500 p-5 rounded-3xl cursor-pointer transition-all shadow-xs hover:shadow-sm group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 dark:text-slate-400 text-xs font-extrabold tracking-wider font-mono">Indisponíveis</span>
            <div className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="text-3xl font-black text-red-600 dark:text-red-400">{offline}</div>
          <div className="text-xs text-red-700 dark:text-red-400 font-bold mt-1">{Math.round((offline / total) * 100)}% sem comunicação</div>
        </div>

        {/* Computadores */}
        <div 
          onClick={() => onNavigateTab('itens')}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-cyan-500 p-5 rounded-3xl cursor-pointer transition-all shadow-xs hover:shadow-sm group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 dark:text-slate-400 text-xs font-extrabold tracking-wider font-mono">Estações & Laptops</span>
            <div className="w-7 h-7 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Monitor className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">{computers}</div>
          <div className="text-xs font-medium text-slate-400 mt-1">Windows & macOS</div>
        </div>

        {/* Servidores & Banco */}
        <div 
          onClick={() => onNavigateTab('itens')}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 p-5 rounded-3xl cursor-pointer transition-all shadow-xs hover:shadow-sm group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 dark:text-slate-400 text-xs font-extrabold tracking-wider font-mono">Servidores & DB</span>
            <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Server className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">{servers + databases}</div>
          <div className="text-xs font-medium text-slate-400 mt-1">Datacenter & Cloud</div>
        </div>

        {/* Serviços de Negócio */}
        <div 
          onClick={() => onNavigateTab('servicos')}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-500 p-5 rounded-3xl cursor-pointer transition-all shadow-xs hover:shadow-sm group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 dark:text-slate-400 text-xs font-extrabold tracking-wider font-mono">Serviços de Negócio</span>
            <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Box className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">{services.length}</div>
          <div className="text-xs text-purple-700 dark:text-purple-400 font-bold mt-1">100% mapeados</div>
        </div>

      </div>

      {/* 3. SPLIT SECTION: CRITICAL ALERTS & QUICK ACCESS TO TOPOLOGY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Incidentes e Alertas Ativos */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Alertas e Anomalias em Tempo Real</h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {criticalItems.length} equipamento(s) requerem atenção
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800/40">
            {criticalItems.map(item => (
              <div 
                key={item.id} 
                className="p-4 flex items-center justify-between hover:bg-white dark:hover:bg-slate-800 transition-colors gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                    item.status === 'indisponivel' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-amber-50 border-amber-200 text-amber-600'
                  }`}>
                    {item.status === 'indisponivel' ? <XCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-blue-700 dark:text-blue-400 font-bold">
                        {item.code}
                      </span>
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200/80">
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 font-medium">
                      <span>IP: <strong className="text-slate-800 dark:text-slate-200 font-mono">{item.ipAddress}</strong></span>
                      <span>•</span>
                      <span>Local: {item.location}</span>
                      <span>•</span>
                      <span>Resp: {item.responsible}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onOpenImpact(item)}
                    className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-full text-xs font-bold transition-colors cursor-pointer"
                  >
                    Ver Impacto
                  </button>
                  <button
                    onClick={() => onSelectCi(item)}
                    className="px-3.5 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-full text-xs font-bold transition-colors cursor-pointer"
                  >
                    Raio-X
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Recommendations from Health Engine */}
          <div className="pt-2">
            <div className="text-xs font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2.5 font-mono">
              RECOMENDAÇÕES DA CENTRAL DE GOVERNANÇA
            </div>
            <div className="space-y-2">
              {health.recommendations.map(rec => (
                <div key={rec.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs gap-3">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{rec.title}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-0.5">{rec.description}</div>
                  </div>
                  <button
                    onClick={() => onNavigateTab('topologia')}
                    className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-full font-bold shrink-0 cursor-pointer"
                  >
                    {rec.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Topologia Preview Card & Quick Actions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Gêmeo Digital de Redes</h3>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div 
              onClick={() => onNavigateTab('topologia')}
              className="bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.01] space-y-3 group"
            >
              <div className="h-36 bg-gradient-to-br from-blue-900/90 via-slate-900 to-indigo-950 rounded-xl border border-blue-900/50 flex items-center justify-center relative overflow-hidden shadow-xs">
                <div 
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)',
                    backgroundSize: '16px 16px'
                  }}
                />
                <div className="relative z-10 text-center">
                  <Network className="w-10 h-10 text-blue-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-bold text-white text-xs">Topologia Ativa • {items.length} CIs</p>
                  <p className="text-[10px] text-blue-200 mt-0.5">Clique para abrir o canvas interativo</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>{relationships.length} Relacionamentos mapeados</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold group-hover:underline flex items-center gap-1">
                  Abrir Mapa <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Quick Actions List */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => onNavigateTab('impacto')}
                className="w-full py-2.5 px-4 bg-red-50/80 hover:bg-red-100/80 dark:bg-red-950/30 dark:hover:bg-red-950/50 border border-red-200/80 dark:border-red-900/50 text-red-700 dark:text-red-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>Simulador de Análise de Impacto</span>
              </button>

              <button
                onClick={() => onNavigateTab('servicos')}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <Box className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Catálogo de Serviços de Negócio</span>
              </button>

              <button
                onClick={() => onNavigateTab('discovery')}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Descoberta de Rede & Varredura SNMP</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 text-center font-medium">
            WorkPulse ITSM CMDB • Multi-Tenant Isolado
          </div>
        </div>

      </div>

    </div>
  );
};
