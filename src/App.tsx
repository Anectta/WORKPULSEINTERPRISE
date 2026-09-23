/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Employee, 
  ActivityLog, 
  AppClassificationRule, 
  SiteBlockRule, 
  PCLockPolicy, 
  TimecardRecord, 
  WorkModel, 
  Department, 
  PersonaView,
  AppCategory,
  IdleToast,
  CurrentUser
} from './types';
import { 
  INITIAL_EMPLOYEES, 
  INITIAL_ACTIVITY_LOGS, 
  INITIAL_APP_RULES, 
  INITIAL_SITE_BLOCKS, 
  INITIAL_PC_LOCK_POLICIES, 
  INITIAL_TIMECARD_RECORDS, 
  DEPARTMENT_SUMMARIES,
  SYSTEM_USERS
} from './data/mockData';

import { Sidebar, TabType } from './components/Sidebar';
import { PageHeaderCard } from './components/PageHeaderCard';
import { DashboardOverview } from './components/DashboardOverview';
import { WorkdayTimeline } from './components/WorkdayTimeline';
import { ActivityMonitoring } from './components/ActivityMonitoring';
import { AppClassificationEngine } from './components/AppClassificationEngine';
import { SiteAndStationBlocking } from './components/SiteAndStationBlocking';
import { ProductivityRankings } from './components/ProductivityRankings';
import { LgpdAndAgentInstaller } from './components/LgpdAndAgentInstaller';
import { IdleToastNotifications } from './components/IdleToastNotifications';
import { IdleAlertsDrawer } from './components/IdleAlertsDrawer';
import { HelpCenterModule } from './components/knowledge/HelpCenterModule';
import { ContextualHelpModal } from './components/knowledge/ContextualHelpModal';
import { GuidedTourOverlay } from './components/knowledge/GuidedTourOverlay';
import { UserRegistration } from './components/UserRegistration';
import { InfraTopology } from './components/InfraTopology';
import { AssetManagement } from './components/AssetManagement';
import { CmdbModule } from './components/cmdb/CmdbModule';
import { AgendaProModule } from './components/AgendaProModule';
import { WifiPulseModule } from './components/wifi/WifiPulseModule';
import { VelocimetroNetPulseView } from './components/velocimetro/VelocimetroNetPulseView';
import { SecurityModule } from './components/security/SecurityModule';
import { SilentAgentFleetModal } from './components/SilentAgentFleetModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { INITIAL_IT_ASSETS } from './data/initialAssets';
import { INITIAL_SUPPLIERS, INITIAL_ROOMS_ITAM, INITIAL_CATEGORIES, INITIAL_STATUSES } from './data/auxiliaryData';
import { SupplierItem, EnvironmentRoomItem, CustomCategoryItem, CustomStatusItem, ITAsset } from './types';
import { generateBackupPayload, saveLocalSnapshot, getAutoBackupConfig } from './utils/backupManager';
import { Activity, Search } from 'lucide-react';

function safeGetJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    return JSON.parse(saved) as T;
  } catch (err) {
    console.warn(`[WorkPulse SafeStorage] Error parsing ${key}, falling back to initial data`, err);
    return fallback;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const saved = localStorage.getItem('wp_activeTab') as any;
      if (saved === 'custom_bi' || saved === 'idle' || saved === 'reports' || saved === 'integrations') return 'overview';
      return (saved as TabType) || 'overview';
    } catch {
      return 'overview';
    }
  });

  // Core Data State with localStorage Persistence
  const [employees, setEmployees] = useState<Employee[]>(() => safeGetJson('wp_employees', INITIAL_EMPLOYEES));
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(INITIAL_ACTIVITY_LOGS);
  const [appRules, setAppRules] = useState<AppClassificationRule[]>(() => safeGetJson('wp_appRules', INITIAL_APP_RULES));
  const [siteBlocks, setSiteBlocks] = useState<SiteBlockRule[]>(() => safeGetJson('wp_siteBlocks', INITIAL_SITE_BLOCKS));
  const [pcLockPolicies, setPcLockPolicies] = useState<PCLockPolicy[]>(() => safeGetJson('wp_pcLockPolicies', INITIAL_PC_LOCK_POLICIES));
  const [timecardRecords, setTimecardRecords] = useState<TimecardRecord[]>(INITIAL_TIMECARD_RECORDS);
  const [assets, setAssets] = useState<ITAsset[]>(() => safeGetJson('wp_assets', INITIAL_IT_ASSETS));

  const [suppliers, setSuppliers] = useState<SupplierItem[]>(() => safeGetJson('wp_suppliers', INITIAL_SUPPLIERS));
  const [auxRooms, setAuxRooms] = useState<EnvironmentRoomItem[]>(() => safeGetJson('wp_aux_rooms', INITIAL_ROOMS_ITAM));
  const [customCategories, setCustomCategories] = useState<CustomCategoryItem[]>(() => safeGetJson('wp_custom_categories', INITIAL_CATEGORIES));
  const [customStatuses, setCustomStatuses] = useState<CustomStatusItem[]>(() => safeGetJson('wp_custom_statuses', INITIAL_STATUSES));

  useEffect(() => {
    localStorage.setItem('wp_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('wp_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('wp_aux_rooms', JSON.stringify(auxRooms));
  }, [auxRooms]);

  useEffect(() => {
    localStorage.setItem('wp_custom_categories', JSON.stringify(customCategories));
  }, [customCategories]);

  useEffect(() => {
    localStorage.setItem('wp_custom_statuses', JSON.stringify(customStatuses));
  }, [customStatuses]);

  // Idle Toasts & Alert Configuration State with localStorage Persistence
  const [idleThresholdMinutes, setIdleThresholdMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('wp_idleThresholdMinutes');
    return saved ? Number(saved) : 15;
  });
  const [isIdleAlertsEnabled, setIsIdleAlertsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('wp_isIdleAlertsEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [individualAlertOverrides, setIndividualAlertOverrides] = useState<Record<string, boolean>>(() => {
    return safeGetJson('wp_individualAlertOverrides', { 'emp-104': true });
  });
  const [employeePausedUntil, setEmployeePausedUntil] = useState<Record<string, number>>(() => {
    return safeGetJson('wp_employeePausedUntil', {});
  });
  const [isIdleDrawerOpen, setIsIdleDrawerOpen] = useState<boolean>(false);
  const [snmpScanTrigger, setSnmpScanTrigger] = useState<number>(0);
  const [kbCreateArticleTrigger, setKbCreateArticleTrigger] = useState<number>(0);
  const [appClassificationModalTrigger, setAppClassificationModalTrigger] = useState<number>(0);
  const [rankingsExportTrigger, setRankingsExportTrigger] = useState<number>(0);
  const [userCreateModalTrigger, setUserCreateModalTrigger] = useState<number>(0);
  const [assetCreateModalTrigger, setAssetCreateModalTrigger] = useState<number>(0);
  const [agendaCreateEventTrigger, setAgendaCreateEventTrigger] = useState<number>(0);
  const [showBlockPreviewModal, setShowBlockPreviewModal] = useState<boolean>(false);

  const handleToggleIndividualAlertOverride = (employeeId: string) => {
    setIndividualAlertOverrides(prev => ({
      ...prev,
      [employeeId]: !prev[employeeId]
    }));
  };

  const [idleToasts, setIdleToasts] = useState<IdleToast[]>(() => {
    return safeGetJson('wp_idleToasts', [
      {
        id: 'toast-init-1',
        employeeId: 'emp-104',
        employeeName: 'Lucas Gabriel Rocha',
        employeeAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        role: 'Analista de Suporte N2',
        department: 'Atendimento & Suporte',
        workModel: 'Home Office',
        computerHost: 'SUP-WIN10-099',
        idleMinutes: 18,
        thresholdMinutes: 15,
        lastApp: 'Google Chrome (youtube.com)',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        severity: 'alerta',
        createdTimeMs: Date.now() - 2 * 60 * 1000,
        lastUpdatedMs: Date.now() - 2 * 60 * 1000,
        occurrenceCount: 1,
        isGrouped: false,
        eventsHistory: [{
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          idleMinutes: 18,
          lastApp: 'Google Chrome (youtube.com)'
        }]
      }
    ]);
  });

  // System Users State with localStorage Persistence
  const [systemUsers, setSystemUsers] = useState<CurrentUser[]>(() => {
    const saved = localStorage.getItem('wp_users_list_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return SYSTEM_USERS.map((u, idx) => ({
      ...u,
      password: u.password || (idx === 0 ? 'Admin@WorkPulse2026!' : `WorkPulse@${2026 + idx}`)
    }));
  });

  // Active Logged In User State
  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => {
    return safeGetJson('wp_currentUser', systemUsers[0] || SYSTEM_USERS[0]);
  });

  // Global Filters State with localStorage Persistence
  const [selectedWorkModel, setSelectedWorkModel] = useState<WorkModel | 'Todos'>(() => {
    return (localStorage.getItem('wp_selectedWorkModel') as any) || 'Todos';
  });
  const [selectedDepartment, setSelectedDepartment] = useState<Department>(() => {
    return (localStorage.getItem('wp_selectedDepartment') as any) || 'Todas as Áreas';
  });
  const [selectedPersona, setSelectedPersona] = useState<PersonaView>(() => {
    return (localStorage.getItem('wp_selectedPersona') as any) || 'BI_GERAL';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(INITIAL_EMPLOYEES[0]);

  // Simulation & Modal State with localStorage Persistence
  const [isSimulating, setIsSimulating] = useState<boolean>(() => {
    const saved = localStorage.getItem('wp_isSimulating');
    return saved !== null ? saved === 'true' : true;
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('wp_isDarkMode');
    return saved !== null ? saved === 'true' : false;
  });
  const [isContextHelpOpen, setIsContextHelpOpen] = useState<boolean>(false);
  const [isGuidedTourActive, setIsGuidedTourActive] = useState<boolean>(false);
  const [isSilentAgentFleetModalOpen, setIsSilentAgentFleetModalOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [selectedKbArticleId, setSelectedKbArticleId] = useState<string | undefined>(undefined);
  const [pendingNavigateEmployee, setPendingNavigateEmployee] = useState<Employee | null>(null);

  // Background Auto-Backup Periodic Worker & Live Restore Listener
  useEffect(() => {
    const checkAndRunAutoBackup = () => {
      try {
        const config = getAutoBackupConfig();
        if (!config.enabled) return;

        const now = Date.now();
        const intervalMs = (config.intervalMinutes || 15) * 60 * 1000;
        if (now - (config.lastBackupTimestamp || 0) >= intervalMs) {
          const payload = generateBackupPayload(currentUser);
          saveLocalSnapshot(payload, 'automatic', `Snapshot Automático (${new Date().toLocaleTimeString('pt-BR')})`);
        }
      } catch (err) {
        console.warn('[WorkPulse AutoBackup] Non-blocking backup note:', err);
      }
    };

    // Run initial auto-backup after 5s
    const initTimer = setTimeout(checkAndRunAutoBackup, 5000);
    // Recurring periodic check every minute
    const intervalTimer = setInterval(checkAndRunAutoBackup, 60000);

    // Custom Event Listener for dynamic restore from LocalStorage
    const handleRestoreEvent = (event: any) => {
      console.log('[WorkPulse] Restore completed event received, synchronizing React state...', event?.detail);
      setEmployees(safeGetJson('wp_employees', INITIAL_EMPLOYEES));
      setAppRules(safeGetJson('wp_appRules', INITIAL_APP_RULES));
      setSiteBlocks(safeGetJson('wp_siteBlocks', INITIAL_SITE_BLOCKS));
      setPcLockPolicies(safeGetJson('wp_pcLockPolicies', INITIAL_PC_LOCK_POLICIES));
      setAssets(safeGetJson('wp_assets', INITIAL_IT_ASSETS));
      setSuppliers(safeGetJson('wp_suppliers', INITIAL_SUPPLIERS));
      setAuxRooms(safeGetJson('wp_aux_rooms', INITIAL_ROOMS_ITAM));
      setCustomCategories(safeGetJson('wp_custom_categories', INITIAL_CATEGORIES));
      setCustomStatuses(safeGetJson('wp_custom_statuses', INITIAL_STATUSES));
      
      const savedThreshold = localStorage.getItem('wp_idleThresholdMinutes');
      if (savedThreshold) setIdleThresholdMinutes(Number(savedThreshold));
      
      const savedIdleAlerts = localStorage.getItem('wp_isIdleAlertsEnabled');
      if (savedIdleAlerts !== null) setIsIdleAlertsEnabled(savedIdleAlerts === 'true');
      
      setIndividualAlertOverrides(safeGetJson('wp_individualAlertOverrides', {}));
      
      const savedUsers = localStorage.getItem('wp_users_list_v1');
      if (savedUsers) {
        try {
          const parsed = JSON.parse(savedUsers);
          if (Array.isArray(parsed) && parsed.length > 0) setSystemUsers(parsed);
        } catch (e) {}
      }
    };

    window.addEventListener('workpulse:restore_completed', handleRestoreEvent);

    return () => {
      clearTimeout(initTimer);
      clearInterval(intervalTimer);
      window.removeEventListener('workpulse:restore_completed', handleRestoreEvent);
    };
  }, [currentUser]);

  // Sync state to localStorage on changes
  useEffect(() => {
    localStorage.setItem('wp_isDarkMode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  useEffect(() => {
    localStorage.setItem('wp_activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('wp_idleThresholdMinutes', String(idleThresholdMinutes));
  }, [idleThresholdMinutes]);

  useEffect(() => {
    localStorage.setItem('wp_isIdleAlertsEnabled', String(isIdleAlertsEnabled));
  }, [isIdleAlertsEnabled]);

  useEffect(() => {
    localStorage.setItem('wp_individualAlertOverrides', JSON.stringify(individualAlertOverrides));
  }, [individualAlertOverrides]);

  useEffect(() => {
    localStorage.setItem('wp_employeePausedUntil', JSON.stringify(employeePausedUntil));
  }, [employeePausedUntil]);

  useEffect(() => {
    localStorage.setItem('wp_idleToasts', JSON.stringify(idleToasts));
  }, [idleToasts]);

  useEffect(() => {
    localStorage.setItem('wp_selectedWorkModel', selectedWorkModel);
  }, [selectedWorkModel]);

  useEffect(() => {
    localStorage.setItem('wp_selectedDepartment', selectedDepartment);
  }, [selectedDepartment]);

  useEffect(() => {
    localStorage.setItem('wp_selectedPersona', selectedPersona);
  }, [selectedPersona]);

  useEffect(() => {
    localStorage.setItem('wp_appRules', JSON.stringify(appRules));
  }, [appRules]);

  useEffect(() => {
    localStorage.setItem('wp_siteBlocks', JSON.stringify(siteBlocks));
  }, [siteBlocks]);

  useEffect(() => {
    localStorage.setItem('wp_pcLockPolicies', JSON.stringify(pcLockPolicies));
  }, [pcLockPolicies]);

  useEffect(() => {
    localStorage.setItem('wp_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('wp_isSimulating', String(isSimulating));
  }, [isSimulating]);

  useEffect(() => {
    localStorage.setItem('wp_currentUser', JSON.stringify(currentUser));
  }, [currentUser]);

  // Filtered employees based on search & model & dept
  const filteredEmployees = employees.filter(e => {
    const matchesModel = selectedWorkModel === 'Todos' || e.workModel === selectedWorkModel;
    const matchesDept = selectedDepartment === 'Todas as Áreas' || e.department === selectedDepartment;
    const matchesSearch = 
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.computerHost.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.currentApp.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesModel && matchesDept && matchesSearch;
  });

  // Function to create or consolidate idle toasts (10-minute grouping window)
  const triggerIdleToastForEmployee = (emp: Employee, customMinutes?: number) => {
    // Check if employee alerts are currently paused
    const pausedUntil = employeePausedUntil[emp.id] || 0;
    if (Date.now() < pausedUntil) return;

    const isIndividualActive = individualAlertOverrides[emp.id] === true;
    const isGloballyActive = isIdleAlertsEnabled;

    // Skip if not custom test trigger, and neither globally enabled nor individually overridden
    if (!customMinutes && !isGloballyActive && !isIndividualActive) return;

    const idleMins = customMinutes || Math.floor(idleThresholdMinutes + Math.random() * 20 + 2);
    const nowMs = Date.now();
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const appInfo = `${emp.currentApp} ${emp.currentDomain ? `(${emp.currentDomain})` : ''}`;

    const TEN_MINUTES_MS = 10 * 60 * 1000;

    setIdleToasts(prev => {
      const existingIndex = prev.findIndex(t => t.employeeId === emp.id);

      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        const lastTime = existing.lastUpdatedMs || existing.createdTimeMs || 0;
        const timeDiff = nowMs - lastTime;

        // Group into a single consolidated summary if within the 10-minute window
        if (timeDiff <= TEN_MINUTES_MS) {
          const newCount = (existing.occurrenceCount || 1) + 1;
          const maxIdleMins = Math.max(existing.idleMinutes, idleMins);
          const currentHistory = existing.eventsHistory || [
            { timestamp: existing.timestamp, idleMinutes: existing.idleMinutes, lastApp: existing.lastApp }
          ];

          const consolidatedToast: IdleToast = {
            ...existing,
            idleMinutes: maxIdleMins,
            lastApp: appInfo,
            timestamp: nowStr,
            lastUpdatedMs: nowMs,
            occurrenceCount: newCount,
            isGrouped: true,
            severity: maxIdleMins >= 30 ? 'critico' : 'alerta',
            eventsHistory: [
              ...currentHistory,
              { timestamp: nowStr, idleMinutes: idleMins, lastApp: appInfo }
            ]
          };

          const remaining = prev.filter((_, idx) => idx !== existingIndex);
          return [consolidatedToast, ...remaining];
        }
      }

      // New toast if outside window or no previous toast
      const newToast: IdleToast = {
        id: `toast-${nowMs}-${Math.random().toString(36).substring(2, 6)}`,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeAvatar: emp.avatar,
        role: emp.role,
        department: emp.department,
        workModel: emp.workModel,
        computerHost: emp.computerHost,
        idleMinutes: idleMins,
        thresholdMinutes: idleThresholdMinutes,
        lastApp: appInfo,
        timestamp: nowStr,
        createdTimeMs: nowMs,
        lastUpdatedMs: nowMs,
        occurrenceCount: 1,
        isGrouped: false,
        severity: idleMins >= 30 ? 'critico' : 'alerta',
        eventsHistory: [{ timestamp: nowStr, idleMinutes: idleMins, lastApp: appInfo }]
      };

      return [newToast, ...prev.filter(t => t.employeeId !== emp.id)];
    });
  };

  // Real-time live activity simulation effect (app changes + idle toast triggers)
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      // 15% chance to simulate an idle alert threshold breach for a random employee
      if (Math.random() < 0.15) {
        const eligible = employees.filter(e => e.status !== 'Estação Bloqueada');
        if (eligible.length > 0) {
          const randomEmp = eligible[Math.floor(Math.random() * eligible.length)];
          triggerIdleToastForEmployee(randomEmp);
        }
      }

      setEmployees(prev => {
        return prev.map(emp => {
          if (emp.status === 'Estação Bloqueada') return emp;

          // 25% chance to cycle app or score slightly
          const shouldUpdate = Math.random() < 0.25;
          if (!shouldUpdate) return emp;

          const apps = ['Visual Studio Code', 'Salesforce CRM', 'TOTVS Carol HCM', 'Microsoft Teams', 'Canva Pro', 'SAP GUI', 'Zendesk', 'Google Chrome'];
          const randomApp = apps[Math.floor(Math.random() * apps.length)];

          return {
            ...emp,
            currentApp: randomApp,
            productivityScore: Math.max(40, Math.min(99, emp.productivityScore + (Math.random() > 0.5 ? 1 : -1)))
          };
        });
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isSimulating, employees, idleThresholdMinutes]);

  // Toast Handlers
  const handleDismissToast = (id: string) => {
    setIdleToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleClearAllToasts = () => {
    setIdleToasts([]);
  };

  const handleInvestigateEmployee = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    if (emp) {
      setPendingNavigateEmployee(emp);
    }
  };

  const handleNotifyEmployee = (toast: IdleToast) => {
    alert(`⚡ Notificação de atenção enviada com sucesso para o agente corporativo na estação ${toast.computerHost} (${toast.employeeName}).`);
  };

  const handleDisableAlert = (employeeId: string, toastId: string) => {
    setIndividualAlertOverrides(prev => ({ ...prev, [employeeId]: false }));
    setIdleToasts(prev => prev.filter(t => t.id !== toastId));
    const emp = employees.find(e => e.id === employeeId);
    alert(`🛑 Monitoramento de alertas desativado para ${emp?.name || 'o colaborador'}.`);
  };

  const handlePauseAlert = (employeeId: string, toastId: string, durationMinutes: number) => {
    const until = Date.now() + durationMinutes * 60 * 1000;
    setEmployeePausedUntil(prev => ({ ...prev, [employeeId]: until }));
    setIdleToasts(prev => prev.filter(t => t.id !== toastId));
    const emp = employees.find(e => e.id === employeeId);
    const label = durationMinutes < 60 ? `${durationMinutes} minutos` : `${durationMinutes / 60} hora(s)`;
    alert(`⏸️ Alertas de ociosidade pausados por ${label} para ${emp?.name || 'o colaborador'}.`);
  };

  const handleAlterThreshold = (employeeId: string, toastId: string, newThresholdMinutes: number) => {
    setIdleThresholdMinutes(newThresholdMinutes);
    setIdleToasts(prev => prev.map(t => t.employeeId === employeeId ? { ...t, thresholdMinutes: newThresholdMinutes } : t));
    const emp = employees.find(e => e.id === employeeId);
    alert(`✏️ Limite de inatividade de ${emp?.name || 'colaborador'} alterado para ${newThresholdMinutes} min.`);
  };

  const handleTriggerTestIdleAlert = () => {
    // Pick an employee (or Lucas Rocha or a random active one)
    const target = employees.find(e => e.status === 'Ocioso') || employees[0];
    triggerIdleToastForEmployee(target, idleThresholdMinutes + 8);
  };

  // Other Handlers
  const handleToggleBlock = (id: string) => {
    setSiteBlocks(prev => prev.map(b => b.id === id ? { ...b, active: !b.active } : b));
  };

  const handleAddBlockRule = (newRule: SiteBlockRule) => {
    setSiteBlocks(prev => [newRule, ...prev]);
  };

  const handleTogglePcLockPolicy = (id: string) => {
    setPcLockPolicies(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const handleUpdateLockMessage = (id: string, newMessage: string) => {
    setPcLockPolicies(prev => prev.map(p => p.id === id ? { ...p, lockMessage: newMessage } : p));
  };

  const handleAddAppRule = (newRule: AppClassificationRule) => {
    setAppRules(prev => [newRule, ...prev]);
  };

  const handleDeleteAppRule = (id: string) => {
    setAppRules(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateAppRuleCategory = (id: string, category: AppCategory) => {
    setAppRules(prev => prev.map(r => r.id === id ? { ...r, category } : r));
  };

  const handleUpdateAppRule = (updatedRule: AppClassificationRule) => {
    setAppRules(prev => prev.map(r => r.id === updatedRule.id ? updatedRule : r));
  };

  const handleResetAppRules = () => {
    setAppRules(INITIAL_APP_RULES);
  };

  const idleEmployeesCount = filteredEmployees.filter(e => e.status === 'Ocioso').length;
  const activeBlocksCount = siteBlocks.filter(b => b.active).length;

  const handleTabPrimaryAction = () => {
    switch (activeTab) {
      case 'agenda_pro':
        setAgendaCreateEventTrigger(prev => prev + 1);
        break;
      case 'velocimetro_netpulse': {
        const btn = document.getElementById('btn-start-speedtest');
        if (btn) btn.click();
        break;
      }
      case 'security_pentest': {
        const btn = document.getElementById('btn-new-scan-top');
        if (btn) btn.click();
        break;
      }
      case 'workday': {
        const headers = ['Colaborador', 'Departamento', 'Sistema_REP', 'Horario_Ponto', 'Horas_Ativas_PC', 'Correlacao_Score', 'Anomalia_Detectada', 'Tipo_Anomalia'];
        const rows = timecardRecords.map(rec => [
          `"${rec.employeeName}"`,
          `"${rec.department}"`,
          `"${rec.sourceSystem}"`,
          `"${rec.clockIn} - ${rec.clockOut}"`,
          `${rec.activePCHours}h`,
          `${rec.correlationScore}%`,
          rec.anomalyDetected ? 'SIM' : 'NAO',
          `"${rec.anomalyType || 'N/A'}"`
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `workpulse_espelho_ponto_consolidado_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        break;
      }
      case 'activity':
        setIsIdleDrawerOpen(true);
        break;
      case 'app_classification':
        setAppClassificationModalTrigger(prev => prev + 1);
        break;
      case 'blocking':
        setShowBlockPreviewModal(true);
        break;
      case 'rankings':
        setRankingsExportTrigger(prev => prev + 1);
        break;
      case 'gpo_lgpd': {
        const gpoScript = `# WORKPULSE GPO DEPLOYMENT SCRIPT\n$Server = "https://app.workpulse.io"\n$Token = "wp-prod-token-994821a8-8f82-4e89-a212-32b220199211"\nmsiexec.exe /i "\\\\srv-dc01\\deploy\\WorkPulseAgent.msi" /qn TENANT_TOKEN=$Token SERVER_URL=$Server`;
        const blob = new Blob([gpoScript], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Install_WorkPulseAgent_GPO.ps1';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        break;
      }
      case 'infra_topology':
        setSnmpScanTrigger(prev => prev + 1);
        break;
      case 'knowledge_base':
        setKbCreateArticleTrigger(prev => prev + 1);
        break;
      case 'user_registration':
        setUserCreateModalTrigger(prev => prev + 1);
        break;
      case 'asset_management':
        setAssetCreateModalTrigger(prev => prev + 1);
        break;
      default:
        break;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200 ${
      isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900'
    }`}>
      {/* Main Content Layout */}
      <div className="flex-1 max-w-[1700px] w-full mx-auto flex flex-col lg:flex-row min-h-0">
        {/* Sidebar with Integrated User Profile & System Status */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          idleCount={idleEmployeesCount}
          blockedCount={activeBlocksCount}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          availableUsers={systemUsers}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          idleAlertCount={idleToasts.length}
          onOpenIdleAlertsDrawer={() => setIsIdleDrawerOpen(true)}
          onOpenSilentAgentModal={() => setIsSilentAgentFleetModalOpen(true)}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
        />

        {/* Tab Content Viewport */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {/* Universal Page Header Card Banner */}
          {activeTab !== 'asset_management' && activeTab !== 'cmdb' && (
            <PageHeaderCard
              activeTab={activeTab}
              onPrimaryAction={handleTabPrimaryAction}
              selectedWorkModel={selectedWorkModel}
              setSelectedWorkModel={setSelectedWorkModel}
              selectedDepartment={selectedDepartment}
              setSelectedDepartment={setSelectedDepartment}
              isIdleAlertsEnabled={isIdleAlertsEnabled}
              setIsIdleAlertsEnabled={setIsIdleAlertsEnabled}
              idleThresholdMinutes={idleThresholdMinutes}
              setIdleThresholdMinutes={setIdleThresholdMinutes}
              onTriggerTestIdleAlert={handleTriggerTestIdleAlert}
              isSimulating={isSimulating}
              setIsSimulating={setIsSimulating}
            />
          )}
          {activeTab === 'overview' && (
            <DashboardOverview
              employees={filteredEmployees}
              departmentSummaries={DEPARTMENT_SUMMARIES}
              onSelectEmployee={(emp) => setPendingNavigateEmployee(emp)}
            />
          )}

          {activeTab === 'agenda_pro' && (
            <AgendaProModule
              currentUser={currentUser}
              openCreateEventTrigger={agendaCreateEventTrigger}
            />
          )}

          {activeTab === 'wifi_pulse' && (
            <WifiPulseModule
              currentUser={currentUser}
            />
          )}

          {activeTab === 'velocimetro_netpulse' && (
            <VelocimetroNetPulseView />
          )}

          {activeTab === 'security_pentest' && (
            <SecurityModule />
          )}

          {activeTab === 'workday' && (
            <WorkdayTimeline
              employees={filteredEmployees}
              timecardRecords={timecardRecords}
              pcLockPolicies={pcLockPolicies}
              onTogglePcLockPolicy={handleTogglePcLockPolicy}
              onUpdateLockMessage={handleUpdateLockMessage}
            />
          )}

          {activeTab === 'activity' ? (
            <ActivityMonitoring
              employees={filteredEmployees}
              activityLogs={activityLogs}
              selectedEmployee={selectedEmployee}
              onSelectEmployee={setSelectedEmployee}
              idleThresholdMinutes={idleThresholdMinutes}
              setIdleThresholdMinutes={setIdleThresholdMinutes}
              onTriggerTestAlert={handleTriggerTestIdleAlert}
              onOpenIdleAlertsDrawer={() => setIsIdleDrawerOpen(true)}
              isIdleView={false}
              individualAlertOverrides={individualAlertOverrides}
              onToggleIndividualAlertOverride={handleToggleIndividualAlertOverride}
            />
          ) : null}

          {activeTab === 'app_classification' && (
            <AppClassificationEngine
              rules={appRules}
              onAddRule={handleAddAppRule}
              onDeleteRule={handleDeleteAppRule}
              onUpdateRuleCategory={handleUpdateAppRuleCategory}
              onUpdateRule={handleUpdateAppRule}
              onResetRules={handleResetAppRules}
              openModalTrigger={appClassificationModalTrigger}
            />
          )}

          {activeTab === 'blocking' && (
            <SiteAndStationBlocking
              siteBlocks={siteBlocks}
              onToggleBlock={handleToggleBlock}
              onAddBlockRule={handleAddBlockRule}
              showPreviewModal={showBlockPreviewModal}
              setShowPreviewModal={setShowBlockPreviewModal}
            />
          )}

          {activeTab === 'rankings' && (
            <ProductivityRankings
              employees={filteredEmployees}
              departmentSummaries={DEPARTMENT_SUMMARIES}
              exportTrigger={rankingsExportTrigger}
            />
          )}

          {activeTab === 'gpo_lgpd' && (
            <LgpdAndAgentInstaller />
          )}

          {activeTab === 'knowledge_base' && (
            <HelpCenterModule
              initialArticleId={selectedKbArticleId}
              onStartTour={() => setIsGuidedTourActive(true)}
              openCreateModalTrigger={kbCreateArticleTrigger}
            />
          )}

          {activeTab === 'user_registration' && (
            <UserRegistration
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              availableUsers={systemUsers}
              openCreateModalTrigger={userCreateModalTrigger}
              onOpenBackupModal={() => setIsBackupModalOpen(true)}
              onUpdateUsersList={(updated) => {
                setSystemUsers(updated);
                localStorage.setItem('wp_users_list_v1', JSON.stringify(updated));
              }}
            />
          )}

          {activeTab === 'cmdb' && (
            <CmdbModule />
          )}

          {activeTab === 'infra_topology' && (
            <InfraTopology
              currentUser={currentUser}
              assets={assets}
              onOpenKnowledgeBase={(articleId) => {
                setSelectedKbArticleId(articleId);
                setActiveTab('knowledge_base');
              }}
              onNavigateToAssetManagement={() => setActiveTab('asset_management')}
              snmpScanTrigger={snmpScanTrigger}
            />
          )}

          {activeTab === 'asset_management' && (
            <AssetManagement
              assets={assets}
              setAssets={setAssets}
              employees={employees}
              setEmployees={setEmployees}
              suppliers={suppliers}
              setSuppliers={setSuppliers}
              rooms={auxRooms}
              setRooms={setAuxRooms}
              categories={customCategories}
              setCategories={setCustomCategories}
              statuses={customStatuses}
              setStatuses={setCustomStatuses}
              onNavigateToTopology={() => setActiveTab('infra_topology')}
              openAddModalTrigger={assetCreateModalTrigger}
            />
          )}
        </main>
      </div>

      {/* Floating Toast Notifications */}
      <IdleToastNotifications
        toasts={idleToasts}
        onDismiss={handleDismissToast}
        onInvestigate={handleInvestigateEmployee}
        onNotifyEmployee={handleNotifyEmployee}
        onClearAll={handleClearAllToasts}
        onDisableAlert={handleDisableAlert}
        onPauseAlert={handlePauseAlert}
        onAlterThreshold={handleAlterThreshold}
      />

      {/* Contextual Help Modal */}
      <ContextualHelpModal
        isOpen={isContextHelpOpen}
        onClose={() => setIsContextHelpOpen(false)}
        activeTab={activeTab}
        onOpenKnowledgeBase={(articleId) => {
          setSelectedKbArticleId(articleId);
          setActiveTab('knowledge_base');
        }}
        onStartGuidedTour={() => setIsGuidedTourActive(true)}
      />

      {/* Interactive Guided Tour Overlay */}
      {isGuidedTourActive && (
        <GuidedTourOverlay
          activeTab={activeTab}
          onFinish={() => setIsGuidedTourActive(false)}
        />
      )}

      {/* Idle Alerts History Drawer */}
      <IdleAlertsDrawer
        isOpen={isIdleDrawerOpen}
        onClose={() => setIsIdleDrawerOpen(false)}
        toasts={idleToasts}
        thresholdMinutes={idleThresholdMinutes}
        setThresholdMinutes={setIdleThresholdMinutes}
        isIdleAlertsEnabled={isIdleAlertsEnabled}
        setIsIdleAlertsEnabled={setIsIdleAlertsEnabled}
        employees={employees}
        individualAlertOverrides={individualAlertOverrides}
        onToggleIndividualAlertOverride={handleToggleIndividualAlertOverride}
        onDismissToast={handleDismissToast}
        onClearAll={handleClearAllToasts}
        onInvestigate={handleInvestigateEmployee}
        onNotifyEmployee={handleNotifyEmployee}
        onTriggerTestAlert={handleTriggerTestIdleAlert}
        onDisableAlert={handleDisableAlert}
        onPauseAlert={handlePauseAlert}
        onAlterThreshold={handleAlterThreshold}
      />

      {/* Silent Agent Fleet & Monitoring Modal (148 PCs) */}
      <SilentAgentFleetModal
        isOpen={isSilentAgentFleetModalOpen}
        onClose={() => setIsSilentAgentFleetModalOpen(false)}
        employees={employees}
        onNavigateToTab={setActiveTab}
        onSelectEmployee={(emp) => setPendingNavigateEmployee(emp)}
      />

      {/* Backup & System Restoration Central Modal */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        currentUser={currentUser}
        onRestoreSuccess={() => {
          console.log('[WorkPulse] Backup restore callback triggered');
        }}
      />

      {/* Confirmation Modal for Activity Monitor Navigation */}
      {pendingNavigateEmployee && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 font-sans"
          onClick={() => setPendingNavigateEmployee(null)}
        >
          <div 
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3.5">
              <div className="relative shrink-0">
                <img
                  src={pendingNavigateEmployee.avatar}
                  alt={pendingNavigateEmployee.name}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500/40"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                  <Activity className="w-2.5 h-2.5" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {pendingNavigateEmployee.name}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {pendingNavigateEmployee.role} • {pendingNavigateEmployee.department}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              Deseja ir para o <strong>Monitor de Atividades</strong> de <strong>{pendingNavigateEmployee.name}</strong>?
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setPendingNavigateEmployee(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={() => {
                  setSelectedEmployee(pendingNavigateEmployee);
                  setActiveTab('activity');
                  setPendingNavigateEmployee(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Sim</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
