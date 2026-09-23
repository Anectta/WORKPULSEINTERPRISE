import React from 'react';
import { 
  BarChart3, 
  Clock, 
  Activity, 
  AlertTriangle, 
  SlidersHorizontal, 
  Ban, 
  Trophy, 
  PieChart, 
  FileSpreadsheet, 
  Webhook, 
  ShieldAlert, 
  BookOpen,
  Sparkles,
  ArrowRight,
  Bell,
  BellOff,
  UserPlus,
  Network,
  Box,
  Download,
  Eye,
  CalendarCheck,
  Wifi
} from 'lucide-react';
import { SYSTEM_MODULES, ModuleConfig } from '../data/modulesConfig';
import { TabType } from './Sidebar';
import { WorkModel, Department } from '../types';
import { downloadIndividualPs1, downloadIndividualBat } from '../utils/installerScripts';

interface PageHeaderCardProps {
  activeTab: TabType;
  customTitle?: string;
  customDescription?: string;
  customActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryAction?: React.ReactNode;
  selectedWorkModel?: WorkModel | 'Todos';
  setSelectedWorkModel?: (val: WorkModel | 'Todos') => void;
  selectedDepartment?: Department;
  setSelectedDepartment?: (val: Department) => void;
  isIdleAlertsEnabled?: boolean;
  setIsIdleAlertsEnabled?: (val: boolean) => void;
  idleThresholdMinutes?: number;
  setIdleThresholdMinutes?: (val: number) => void;
  onTriggerTestIdleAlert?: () => void;
  isSimulating?: boolean;
  setIsSimulating?: (val: boolean) => void;
}

export const PageHeaderCard: React.FC<PageHeaderCardProps> = ({
  activeTab,
  customTitle,
  customDescription,
  customActionLabel,
  onPrimaryAction,
  secondaryAction,
  selectedWorkModel,
  setSelectedWorkModel,
  selectedDepartment,
  setSelectedDepartment,
  isIdleAlertsEnabled,
  setIsIdleAlertsEnabled,
  idleThresholdMinutes,
  setIdleThresholdMinutes,
  onTriggerTestIdleAlert,
  isSimulating,
  setIsSimulating
}) => {
  const mod: ModuleConfig = SYSTEM_MODULES[activeTab] || SYSTEM_MODULES.overview;

  const renderIcon = (iconName: string, className: string = "w-6 h-6") => {
    switch (iconName) {
      case 'BarChart3': return <BarChart3 className={className} />;
      case 'Clock': return <Clock className={className} />;
      case 'Activity': return <Activity className={className} />;
      case 'AlertTriangle': return <AlertTriangle className={className} />;
      case 'SlidersHorizontal': return <SlidersHorizontal className={className} />;
      case 'Ban': return <Ban className={className} />;
      case 'Trophy': return <Trophy className={className} />;
      case 'PieChart': return <PieChart className={className} />;
      case 'FileSpreadsheet': return <FileSpreadsheet className={className} />;
      case 'Webhook': return <Webhook className={className} />;
      case 'ShieldAlert': return <ShieldAlert className={className} />;
      case 'BookOpen': return <BookOpen className={className} />;
      case 'UserPlus': return <UserPlus className={className} />;
      case 'Network': return <Network className={className} />;
      case 'Box': return <Box className={className} />;
      case 'CalendarCheck': return <CalendarCheck className={className} />;
      case 'Wifi': return <Wifi className={className} />;
      default: return <BarChart3 className={className} />;
    }
  };

  return (
    <>
      <div className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs ${activeTab === 'overview' ? 'mb-4' : 'mb-6'} transition-all hover:shadow-sm`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Left Side: Gradient Icon & Title */}
          <div className="flex items-start sm:items-center space-x-4">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0`}>
              {renderIcon(mod.iconName, "w-6 h-6 text-white")}
            </div>

            <div>
              {mod.badge && (
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${mod.badgeColor}`}>
                    {mod.badge}
                  </span>
                </div>
              )}

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {customTitle || mod.fullName}
              </h1>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-3xl leading-relaxed">
                {customDescription || mod.description}
              </p>
            </div>
          </div>

          {/* Right Side: Primary & Secondary Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
            {secondaryAction}

            {activeTab === 'activity' ? (
              <div className="flex items-center space-x-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 p-1.5 sm:p-2 rounded-2xl text-xs flex-wrap shadow-2xs">
                <div className="flex items-center space-x-1.5 pr-2.5 sm:pr-3 border-r border-slate-200 dark:border-slate-700">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300 font-bold whitespace-nowrap">Limite Ociosidade:</span>
                  {setIdleThresholdMinutes ? (
                    <select
                      value={idleThresholdMinutes}
                      onChange={(e) => setIdleThresholdMinutes(Number(e.target.value))}
                      className="bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-400 font-mono font-bold rounded-lg px-2 py-1 focus:outline-none cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      <option value={10}>10 min</option>
                      <option value={15}>15 min</option>
                      <option value={20}>20 min</option>
                      <option value={30}>30 min</option>
                      <option value={60}>60 min</option>
                    </select>
                  ) : (
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{idleThresholdMinutes} min</span>
                  )}
                </div>

                {onPrimaryAction && (
                  <button
                    onClick={onPrimaryAction}
                    className="px-3.5 py-1.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-amber-400 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer border border-slate-800 dark:border-slate-600"
                    title="Ajustar limites de tolerância e regras de disparo de alertas de ociosidade"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="whitespace-nowrap">Ajustar Limites de Alerta</span>
                  </button>
                )}

                {onTriggerTestIdleAlert && (
                  <button
                    onClick={onTriggerTestIdleAlert}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    Simular Alerta
                  </button>
                )}
              </div>
            ) : activeTab === 'gpo_lgpd' ? (
              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                <button
                  onClick={downloadIndividualPs1}
                  className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="Baixar script PowerShell de instalação rápida em computador avulso (.ps1)"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Instalador Individual (.ps1)</span>
                </button>

                <button
                  onClick={downloadIndividualBat}
                  className="flex items-center space-x-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer border border-slate-700/50"
                  title="Baixar executável batch (.bat) de 1-clique"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar 1-Clique (.BAT)</span>
                </button>

                {onPrimaryAction && (customActionLabel || mod.primaryActionLabel) && (
                  <button
                    onClick={onPrimaryAction}
                    className={`px-3.5 py-2 bg-gradient-to-r ${mod.gradient} hover:opacity-95 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer`}
                    title="Baixar pacote completo MSI para Active Directory GPO"
                  >
                    <Download className="w-4 h-4" />
                    <span>{customActionLabel || mod.primaryActionLabel}</span>
                  </button>
                )}
              </div>
            ) : activeTab === 'blocking' ? (
              onPrimaryAction && (
                <button
                  onClick={onPrimaryAction}
                  className="flex items-center space-x-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 border border-slate-700/50"
                  title="Visualizar tela de bloqueio corporativa exibida ao colaborador"
                >
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>Ver Prévia da Tela de Bloqueio</span>
                </button>
              )
            ) : (
              onPrimaryAction && (customActionLabel || mod.primaryActionLabel) && (
                <button
                  onClick={onPrimaryAction}
                  className={`px-4 py-2.5 bg-gradient-to-r ${mod.gradient} hover:opacity-95 text-white font-bold text-xs rounded-xl flex items-center space-x-2 shadow-sm shadow-blue-500/20 active:scale-95 transition-all`}
                >
                  <span>{customActionLabel || mod.primaryActionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Standalone Filter Toolbar Box Below Header Card - Rendered in Visão Executiva */}
      {activeTab === 'overview' && selectedWorkModel !== undefined && setSelectedWorkModel && selectedDepartment !== undefined && setSelectedDepartment && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl px-6 py-3.5 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-3 flex-wrap">
            <span className="text-xs font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider font-mono">FILTROS:</span>

            {/* Work Model Filter Pills */}
            <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/90 rounded-full p-1 border border-slate-200/60 dark:border-slate-700 text-xs shadow-2xs">
              {(['Todos', 'Home Office', 'Presencial', 'Híbrido'] as const).map((model) => (
                <button
                  key={model}
                  onClick={() => setSelectedWorkModel(model)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    selectedWorkModel === model
                      ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
                >
                  {model}
                </button>
              ))}
            </div>

            {/* Department Select */}
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value as Department)}
              className="bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-2xl px-4 py-2 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="Todas as Áreas">Todas as Áreas</option>
              <option value="Engenharia">Engenharia</option>
              <option value="Vendas">Vendas</option>
              <option value="RH & Pessoas">RH & Pessoas</option>
              <option value="Atendimento & Suporte">Atendimento & Suporte</option>
              <option value="Marketing">Marketing</option>
              <option value="Financeiro & Jurídico">Financeiro & Jurídico</option>
            </select>
          </div>

          {/* Quick Simulation & Idle Alert Controls */}
          <div className="flex items-center space-x-2.5 text-xs flex-wrap">
            {setIsIdleAlertsEnabled && (
              <button
                onClick={() => setIsIdleAlertsEnabled(!isIdleAlertsEnabled)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1.5 transition-all border shadow-2xs cursor-pointer ${
                  isIdleAlertsEnabled
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800 hover:bg-emerald-100'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800 hover:bg-amber-100'
                }`}
              >
                {isIdleAlertsEnabled ? (
                  <>
                    <Bell className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Alertas: ATIVOS</span>
                  </>
                ) : (
                  <>
                    <BellOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Alertas: PAUSADOS</span>
                  </>
                )}
              </button>
            )}

            {setIdleThresholdMinutes && idleThresholdMinutes !== undefined && (
              <div className="flex items-center space-x-1.5 bg-amber-50 dark:bg-amber-950/60 px-3.5 py-1.5 rounded-full border border-amber-200/80 dark:border-amber-800 text-amber-700 dark:text-amber-300 shadow-2xs font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs text-amber-700 dark:text-amber-300 font-bold hidden sm:inline">Tolerância Ociosidade:</span>
                <select
                  value={idleThresholdMinutes}
                  onChange={(e) => setIdleThresholdMinutes(Number(e.target.value))}
                  className="bg-transparent text-amber-800 dark:text-amber-300 font-mono font-bold focus:outline-none cursor-pointer text-xs"
                >
                  <option value={10}>10 min</option>
                  <option value={15}>15 min</option>
                  <option value={20}>20 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>
            )}

            {onTriggerTestIdleAlert && (
              <button
                onClick={onTriggerTestIdleAlert}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800 hover:bg-amber-100 shadow-2xs transition-all flex items-center space-x-1 cursor-pointer"
              >
                <span>⚡ Testar Toast</span>
              </button>
            )}

            {setIsSimulating && (
              <button 
                onClick={() => setIsSimulating(!isSimulating)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border shadow-2xs flex items-center space-x-1.5 cursor-pointer ${
                  isSimulating 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800 hover:bg-emerald-100' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                <span>{isSimulating ? 'Ao Vivo' : 'Pausado'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
