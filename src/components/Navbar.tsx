import React, { useState } from 'react';
import { 
  Bell, 
  BellOff, 
  Clock, 
  Calendar,
  Moon,
  Sun,
  BarChart3, 
  Activity, 
  AlertTriangle, 
  SlidersHorizontal, 
  Ban, 
  Trophy, 
  PieChart, 
  FileSpreadsheet, 
  Webhook, 
  ShieldAlert, 
  ShieldCheck,
  BookOpen,
  ChevronDown,
  UserCheck,
  Laptop,
  Wifi,
  Check,
  Settings,
  LogOut,
  UserPlus,
  Database
} from 'lucide-react';
import { WorkModel, Department, PersonaView, CurrentUser } from '../types';
import { TabType } from './Sidebar';
import { SYSTEM_MODULES, ModuleConfig } from '../data/modulesConfig';

interface NavbarProps {
  activeTab: TabType;
  selectedWorkModel: WorkModel | 'Todos';
  setSelectedWorkModel: (val: WorkModel | 'Todos') => void;
  selectedDepartment: Department;
  setSelectedDepartment: (val: Department) => void;
  selectedPersona: PersonaView;
  setSelectedPersona: (val: PersonaView) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  isSimulating: boolean;
  setIsSimulating: (val: boolean) => void;
  idleAlertCount: number;
  idleThresholdMinutes: number;
  setIdleThresholdMinutes: (val: number) => void;
  isIdleAlertsEnabled: boolean;
  setIsIdleAlertsEnabled: (val: boolean) => void;
  onOpenIdleAlertsDrawer: () => void;
  onTriggerTestIdleAlert: () => void;
  onOpenContextHelp?: () => void;
  currentUser: CurrentUser;
  setCurrentUser: (user: CurrentUser) => void;
  availableUsers: CurrentUser[];
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  onOpenSilentAgentModal?: () => void;
  onOpenBackupModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  selectedWorkModel,
  setSelectedWorkModel,
  selectedDepartment,
  setSelectedDepartment,
  selectedPersona,
  setSelectedPersona,
  searchQuery,
  setSearchQuery,
  isSimulating,
  setIsSimulating,
  idleAlertCount,
  idleThresholdMinutes,
  setIdleThresholdMinutes,
  isIdleAlertsEnabled,
  setIsIdleAlertsEnabled,
  onOpenIdleAlertsDrawer,
  onTriggerTestIdleAlert,
  onOpenContextHelp,
  currentUser,
  setCurrentUser,
  availableUsers,
  isDarkMode,
  setIsDarkMode,
  onOpenSilentAgentModal,
  onOpenBackupModal
}) => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 sticky top-0 z-30 shadow-sm font-sans transition-colors duration-200">
      {/* Main Topbar Row */}
      <div className="px-5 py-2.5 flex items-center justify-end gap-3">

        {/* Right Info Badges & User Selector */}
        <div className="flex items-center space-x-2.5 justify-end flex-wrap">
          
          {/* Agente Silencioso Badge */}
          <button
            onClick={onOpenSilentAgentModal}
            className="hidden sm:flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-emerald-500/50 px-3 py-1.5 rounded-2xl shadow-2xs text-xs transition-all cursor-pointer group active:scale-[0.98]"
            title="Central do Agente Silencioso - 148 PCs Conectados • Clique para gerenciar frotas e telemetria"
          >
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-slate-100 group-hover:text-white text-[11px] transition-colors">Agente Silencioso</span>
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
              className="flex items-center space-x-2 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/90 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/90 dark:border-blue-800/80 px-3 py-1.5 rounded-2xl shadow-2xs text-xs transition-all cursor-pointer group active:scale-[0.98]"
              title="Central de Backup & Restauração de Configurações do WorkPulse"
            >
              <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-slate-800 dark:text-slate-100 text-[11px] group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                Backup & Restore
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Auto-backup ativo no navegador" />
            </button>
          )}

          {/* Current Date & Clock Badge */}
          <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 px-2.5 py-1.5 rounded-2xl shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Qua, 07 Ago 2026 • 20:32</span>
          </div>

          {/* Dark Mode Toggle Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-2xl border transition-all shadow-2xs cursor-pointer active:scale-95 ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
                : 'bg-slate-100/80 hover:bg-slate-200/80 text-indigo-600 border-slate-200/90'
            }`}
            title={isDarkMode ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          {/* Notifications Bell with Red Badge 2 */}
          <button
            onClick={onOpenIdleAlertsDrawer}
            className="relative p-2 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 transition-all shadow-2xs cursor-pointer"
            title="Alertas de Ociosidade"
          >
            <Bell className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white font-extrabold text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs border-2 border-white dark:border-slate-900">
              {idleAlertCount > 0 ? idleAlertCount : 2}
            </span>
          </button>

          {/* Dynamic User Profile Access Card & Switcher Popover */}
          <div className="relative">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="bg-slate-100/80 hover:bg-slate-200/90 border border-slate-200/90 rounded-2xl px-3 py-1.5 flex items-center space-x-2.5 shadow-2xs cursor-pointer transition-all active:scale-98 group"
              title="Sessão Ativa do Usuário - Clique para ver detalhes e trocar conta"
            >
              <div className="relative shrink-0">
                {currentUser.avatar ? (
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.name} 
                    className="w-7 h-7 rounded-xl object-cover border border-slate-200 shadow-xs"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {currentUser.name.charAt(0)}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
              </div>

              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors flex items-center gap-1">
                  {currentUser.name}
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isProfileDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
                </span>
                <span className="text-[10px] font-black text-blue-600 tracking-wide uppercase leading-tight font-mono">
                  {currentUser.accessLevel}
                </span>
              </div>
            </button>

            {/* Interactive Profile & User Switcher Popover */}
            {isProfileDropdownOpen && (
              <>
                {/* Backdrop overlay for quick dismissal */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsProfileDropdownOpen(false)} 
                />

                <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 p-4 font-sans divide-y divide-slate-100 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
                  
                  {/* Active User Header Banner */}
                  <div className="pb-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
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
                          className="w-11 h-11 rounded-2xl object-cover border-2 border-blue-500/30 shadow-sm"
                        />
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-slate-900 truncate">
                          {currentUser.name}
                        </h4>
                        <p className="text-xs text-slate-500 truncate font-medium">
                          {currentUser.email}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                            {currentUser.accessLevel}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {currentUser.department}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Session Diagnostics Box */}
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 text-[11px] space-y-1.5">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center space-x-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Horário do Login:</span>
                        </span>
                        <span className="font-bold font-mono text-slate-800">{currentUser.loginTime}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center space-x-1 font-medium">
                          <Laptop className="w-3.5 h-3.5 text-slate-400" />
                          <span>Estação / Host:</span>
                        </span>
                        <span className="font-bold font-mono text-slate-800">{currentUser.computerHost}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center space-x-1 font-medium">
                          <Wifi className="w-3.5 h-3.5 text-slate-400" />
                          <span>Endereço IP:</span>
                        </span>
                        <span className="font-bold font-mono text-slate-800">{currentUser.ipAddress}</span>
                      </div>
                    </div>
                  </div>

                  {/* User Switcher / Accounts List */}
                  <div className="py-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                      <span>Trocar Usuário (Simular Acesso)</span>
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    </div>

                    <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                      {availableUsers.map((user) => {
                        const isActive = user.id === currentUser.id;
                        return (
                          <button
                            key={user.id}
                            onClick={() => {
                              setCurrentUser(user);
                              setIsProfileDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all ${
                              isActive 
                                ? 'bg-blue-50/90 text-blue-900 border border-blue-200 font-bold' 
                                : 'hover:bg-slate-100/80 text-slate-700 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <img 
                                src={user.avatar} 
                                alt={user.name} 
                                className="w-8 h-8 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate text-[12px] leading-tight">
                                  {user.name}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
                                  {user.role}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0 pl-2">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black font-mono border ${
                                isActive 
                                  ? 'bg-blue-600 text-white border-blue-600' 
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {user.accessLevel}
                              </span>
                              {isActive && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-2.5 space-y-2 text-xs">
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        if (onOpenBackupModal) onOpenBackupModal();
                      }}
                      className="w-full py-2 px-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold rounded-xl text-center transition-colors flex items-center justify-center space-x-1.5 text-[11px] border border-blue-200/80 dark:border-blue-800/80 cursor-pointer shadow-2xs"
                    >
                      <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Backup Automático & Restauração JSON</span>
                    </button>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                        }}
                        className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-center transition-colors flex items-center justify-center space-x-1 text-[11px]"
                      >
                        <Settings className="w-3 h-3 text-slate-500" />
                        <span>Perfil & Permissões</span>
                      </button>

                      <button
                        onClick={() => {
                          setCurrentUser(availableUsers[0]);
                          setIsProfileDropdownOpen(false);
                        }}
                        className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-center transition-colors flex items-center space-x-1 text-[11px] border border-red-200/80"
                      >
                        <LogOut className="w-3 h-3 text-red-600" />
                        <span>Reiniciar Sessão</span>
                      </button>
                    </div>
                  </div>

                </div>
              </>
            )}
          </div>
        </div>

      </div>

    </header>
  );
};
