import React, { useState } from 'react';
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
  ChevronRight,
  ChevronDown,
  Zap,
  ShieldCheck,
  UserPlus,
  Network,
  Box,
  Sun,
  Moon,
  Bell,
  Check,
  Settings,
  LogOut,
  Laptop,
  Wifi,
  Gauge,
  UserCheck,
  Database,
  CalendarCheck
} from 'lucide-react';
import { SYSTEM_MODULES, ModuleConfig } from '../data/modulesConfig';
import { CurrentUser } from '../types';

export type TabType = 
  | 'overview' 
  | 'agenda_pro'
  | 'wifi_pulse'
  | 'velocimetro_netpulse'
  | 'security_pentest'
  | 'workday' 
  | 'activity' 
  | 'app_classification' 
  | 'blocking' 
  | 'rankings' 
  | 'gpo_lgpd'
  | 'knowledge_base'
  | 'user_registration'
  | 'cmdb'
  | 'infra_topology'
  | 'asset_management';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  idleCount: number;
  blockedCount: number;
  currentUser?: CurrentUser;
  setCurrentUser?: (user: CurrentUser) => void;
  availableUsers?: CurrentUser[];
  isDarkMode?: boolean;
  setIsDarkMode?: (val: boolean) => void;
  idleAlertCount?: number;
  onOpenIdleAlertsDrawer?: () => void;
  onOpenSilentAgentModal?: () => void;
  onOpenBackupModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  idleCount,
  blockedCount,
  currentUser,
  setCurrentUser,
  availableUsers = [],
  isDarkMode = false,
  setIsDarkMode,
  idleAlertCount = 2,
  onOpenIdleAlertsDrawer,
  onOpenSilentAgentModal,
  onOpenBackupModal
}) => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const renderIcon = (iconName: string, className: string = "w-4 h-4 text-white") => {
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
      case 'ShieldCheck': return <ShieldCheck className={className} />;
      case 'BookOpen': return <BookOpen className={className} />;
      case 'UserPlus': return <UserPlus className={className} />;
      case 'Network': return <Network className={className} />;
      case 'Box': return <Box className={className} />;
      case 'CalendarCheck': return <CalendarCheck className={className} />;
      case 'Wifi': return <Wifi className={className} />;
      case 'Gauge': return <Gauge className={className} />;
      default: return <BarChart3 className={className} />;
    }
  };

  const moduleList = Object.values(SYSTEM_MODULES);

  return (
    <aside className="w-full lg:w-72 bg-slate-950 border-r border-slate-800/80 p-4 shrink-0 flex flex-col justify-between text-slate-300">
      <div className="space-y-4">
        {/* BRAND LOGO TOP WITH BLUE/PURPLE GRADIENT EMBLEM */}
        <div className="px-2 pt-2 pb-1 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20 shrink-0">
            <Zap className="w-5 h-5 fill-white text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-lg tracking-tight text-white">WorkPulse</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">ERP</span>
            </div>
            <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              Corporate Intelligence Platform
            </p>
          </div>
        </div>

        {/* SYSTEM STATUS & USER DISPLAY SECTION (BELOW LOGO) */}
        <div className="space-y-2 pb-3 border-b border-slate-800/80">
          {/* User Profile Card & Switcher Popover */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="w-full bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-xl p-2.5 flex items-center justify-between shadow-2xs cursor-pointer transition-all group text-left"
                title="Sessão Ativa do Usuário - Clique para ver detalhes e trocar conta"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="relative shrink-0">
                    {currentUser.avatar ? (
                      <img 
                        src={currentUser.avatar} 
                        alt={currentUser.name} 
                        className="w-7 h-7 rounded-lg object-cover border border-slate-700 shadow-xs"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        {currentUser.name.charAt(0)}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-slate-950 animate-pulse" />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-100 truncate leading-tight group-hover:text-blue-400 transition-colors">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] font-black text-blue-400 tracking-wider uppercase leading-tight font-mono">
                      {currentUser.accessLevel}
                    </span>
                  </div>
                </div>

                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isProfileDropdownOpen ? 'rotate-180 text-blue-400' : ''}`} />
              </button>

              {/* User Switcher Dropdown Modal/Popover */}
              {isProfileDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsProfileDropdownOpen(false)} 
                  />

                  <div className="absolute left-0 top-full mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-4 font-sans divide-y divide-slate-800 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                    {/* Active User Header */}
                    <div className="pb-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Sessão Conectada Ao Vivo</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">
                          ID: {currentUser.id}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="relative shrink-0">
                          <img 
                            src={currentUser.avatar} 
                            alt={currentUser.name} 
                            className="w-11 h-11 rounded-2xl object-cover border-2 border-blue-500/40 shadow-sm"
                          />
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-black text-white truncate">
                            {currentUser.name}
                          </h4>
                          <p className="text-xs text-slate-400 truncate font-medium">
                            {currentUser.email}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-950/60 text-blue-400 border border-blue-800 font-mono">
                              {currentUser.accessLevel}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              {currentUser.department}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Session Diagnostics */}
                      <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800 text-[11px] space-y-1.5">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="flex items-center space-x-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>Horário do Login:</span>
                          </span>
                          <span className="font-bold font-mono text-slate-200">{currentUser.loginTime}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="flex items-center space-x-1 font-medium">
                            <Laptop className="w-3.5 h-3.5 text-slate-500" />
                            <span>Estação / Host:</span>
                          </span>
                          <span className="font-bold font-mono text-slate-200">{currentUser.computerHost}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="flex items-center space-x-1 font-medium">
                            <Wifi className="w-3.5 h-3.5 text-slate-500" />
                            <span>Endereço IP:</span>
                          </span>
                          <span className="font-bold font-mono text-slate-200">{currentUser.ipAddress}</span>
                        </div>
                      </div>
                    </div>

                    {/* Switcher */}
                    <div className="py-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                        <span>Trocar Usuário (Simular)</span>
                        <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                      </div>

                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {availableUsers.map((user) => {
                          const isActive = user.id === currentUser.id;
                          return (
                            <button
                              key={user.id}
                              onClick={() => {
                                setCurrentUser?.(user);
                                setIsProfileDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all ${
                                isActive 
                                  ? 'bg-blue-950/80 text-blue-200 border border-blue-800 font-bold' 
                                  : 'hover:bg-slate-800/80 text-slate-300 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <img 
                                  src={user.avatar} 
                                  alt={user.name} 
                                  className="w-7 h-7 rounded-lg object-cover shrink-0 border border-slate-700"
                                />
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-200 truncate text-[12px] leading-tight">
                                    {user.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                                    {user.role}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-1.5 shrink-0 pl-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black font-mono border ${
                                  isActive 
                                    ? 'bg-blue-600 text-white border-blue-600' 
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}>
                                  {user.accessLevel}
                                </span>
                                {isActive && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2.5 space-y-2 text-xs">
                      {onOpenBackupModal && (
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            onOpenBackupModal();
                          }}
                          className="w-full py-1.5 px-2 bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 font-bold rounded-xl text-center transition-colors flex items-center justify-center space-x-1.5 text-[11px] border border-blue-800 cursor-pointer shadow-2xs"
                        >
                          <Database className="w-3.5 h-3.5 text-blue-400" />
                          <span>Backup & Restauração JSON</span>
                        </button>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-center transition-colors flex items-center justify-center space-x-1 text-[11px]"
                        >
                          <Settings className="w-3 h-3 text-slate-400" />
                          <span>Perfil & Acessos</span>
                        </button>

                        <button
                          onClick={() => {
                            if (availableUsers[0]) setCurrentUser?.(availableUsers[0]);
                            setIsProfileDropdownOpen(false);
                          }}
                          className="py-1.5 px-3 bg-red-950/60 hover:bg-red-900/60 text-red-300 font-bold rounded-xl text-center transition-colors flex items-center space-x-1 text-[11px] border border-red-800"
                        >
                          <LogOut className="w-3 h-3 text-red-400" />
                          <span>Reiniciar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Quick System Action Buttons: Agente Silencioso & Backup */}
          <div className="space-y-1.5">
            {/* Agente Silencioso Badge (Interactive Fleet Modal Trigger) */}
            <button
              onClick={onOpenSilentAgentModal || (() => setActiveTab('gpo_lgpd'))}
              className="w-full flex items-center justify-between bg-slate-900/95 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 px-3 py-1.5 rounded-xl shadow-2xs transition-all cursor-pointer group active:scale-[0.98]"
              title="Central do Agente Silencioso - 148 PCs Conectados • Clique para gerenciar frotas, gerar instalador GPO e ver telemetria"
            >
              <div className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-slate-200 group-hover:text-white text-[11px] transition-colors">Agente Silencioso</span>
              </div>
              <span className="flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/20 group-hover:bg-emerald-500/30 px-1.5 py-0.5 rounded-md border border-emerald-500/30 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                148 PCs
              </span>
            </button>

            {/* Backup & Restauração Button */}
            {onOpenBackupModal && (
              <button
                onClick={onOpenBackupModal}
                className="w-full flex items-center justify-between bg-blue-950/40 hover:bg-blue-900/50 border border-blue-900/60 hover:border-blue-500/50 px-3 py-1.5 rounded-xl shadow-2xs transition-all cursor-pointer group active:scale-[0.98]"
                title="Central de Backup & Restauração de Configurações do WorkPulse"
              >
                <div className="flex items-center space-x-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-slate-200 group-hover:text-white text-[11px] transition-colors">Backup & Restore</span>
                </div>
                <span className="flex items-center text-[9px] font-extrabold text-blue-300 bg-blue-500/20 px-1.5 py-0.5 rounded-md border border-blue-400/30">
                  AUTO ON
                </span>
              </button>
            )}
          </div>

          {/* Date/Time + Dark Mode + Notifications Row */}
          <div className="flex items-center gap-1.5">
            {/* Clock and Date */}
            <div className="flex-1 min-w-0 flex items-center space-x-1.5 text-[11px] text-slate-300 font-medium bg-slate-900/90 border border-slate-800/90 px-2.5 py-1.5 rounded-xl shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">Qua, 07 Ago 2026 • 20:32</span>
            </div>

            {/* Dark Mode Toggle */}
            {setIsDarkMode && (
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                  isDarkMode
                    ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-slate-800'
                    : 'bg-slate-900 hover:bg-slate-800 text-indigo-400 border-slate-800'
                }`}
                title={isDarkMode ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-400" />
                )}
              </button>
            )}

            {/* Notifications Bell with Badge */}
            {onOpenIdleAlertsDrawer && (
              <button
                onClick={onOpenIdleAlertsDrawer}
                className="relative p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-all cursor-pointer shrink-0"
                title="Alertas de Ociosidade"
              >
                <Bell className="w-4 h-4 text-slate-300" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white font-extrabold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs border border-slate-950">
                  {idleAlertCount > 0 ? idleAlertCount : 2}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* NAVIGATION SECTION HEADER */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Navegação Principal & Módulos
          </div>

          {/* MENU LIST WITH GRADIENT ICON SQUARES */}
          <nav className="space-y-1">
            {moduleList.map((mod) => {
              const isActive = activeTab === mod.id;

              // Dynamic badges
              const currentBadge = mod.badge;
              const currentBadgeColor = mod.badgeColor;

              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveTab(mod.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                    isActive
                      ? 'bg-slate-800/90 text-white shadow-sm ring-1 ring-slate-700/80 border-l-4 border-blue-500 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Vibrant Gradient Color Icon Square */}
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${mod.gradient} flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105 ${isActive ? 'scale-105 ring-2 ring-white/20' : 'opacity-85'}`}>
                      {renderIcon(mod.iconName, "w-3.5 h-3.5 text-white")}
                    </div>

                    <span className="truncate">{mod.menuLabel}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

    </aside>
  );
};
