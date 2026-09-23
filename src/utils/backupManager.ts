/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  WorkPulseBackupPayload, 
  BackupSnapshotItem, 
  AutoBackupConfig, 
  CurrentUser,
  Employee,
  AppClassificationRule,
  SiteBlockRule,
  PCLockPolicy,
  ITAsset,
  SupplierItem,
  EnvironmentRoomItem,
  CustomCategoryItem,
  CustomStatusItem,
  IdleToast
} from '../types';
import { 
  INITIAL_EMPLOYEES, 
  INITIAL_APP_RULES, 
  INITIAL_SITE_BLOCKS, 
  INITIAL_PC_LOCK_POLICIES, 
  SYSTEM_USERS 
} from '../data/mockData';
import { INITIAL_IT_ASSETS } from '../data/initialAssets';
import { INITIAL_SUPPLIERS, INITIAL_ROOMS_ITAM, INITIAL_CATEGORIES, INITIAL_STATUSES } from '../data/auxiliaryData';

export const BACKUP_STORAGE_KEYS = {
  HISTORY: 'wp_auto_backups_history',
  CONFIG: 'wp_auto_backup_config',
  RESTORE_EVENT: 'workpulse:restore_completed',
  AUTO_BACKUP_EVENT: 'workpulse:auto_backup_triggered'
};

export const DEFAULT_AUTO_BACKUP_CONFIG: AutoBackupConfig = {
  enabled: true,
  intervalMinutes: 15,
  maxSnapshots: 10,
  lastBackupTime: undefined,
  lastBackupStatus: 'success',
  backupToCloudApiMock: true
};

function safeParse<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (e) {
    return fallback;
  }
}

/**
 * Simple fast hash function to generate a checksum for payload integrity verification
 */
function generateChecksum(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `WP-${hex}-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Builds a comprehensive backup payload from the current browser state
 */
export function generateBackupPayload(currentUser?: CurrentUser): WorkPulseBackupPayload {
  const employees: Employee[] = safeParse('wp_employees', INITIAL_EMPLOYEES);
  const appRules: AppClassificationRule[] = safeParse('wp_appRules', INITIAL_APP_RULES);
  const siteBlocks: SiteBlockRule[] = safeParse('wp_siteBlocks', INITIAL_SITE_BLOCKS);
  const pcLockPolicies: PCLockPolicy[] = safeParse('wp_pcLockPolicies', INITIAL_PC_LOCK_POLICIES);
  const assets: ITAsset[] = safeParse('wp_assets', INITIAL_IT_ASSETS);
  const suppliers: SupplierItem[] = safeParse('wp_suppliers', INITIAL_SUPPLIERS);
  const auxRooms: EnvironmentRoomItem[] = safeParse('wp_aux_rooms', INITIAL_ROOMS_ITAM);
  const customCategories: CustomCategoryItem[] = safeParse('wp_custom_categories', INITIAL_CATEGORIES);
  const customStatuses: CustomStatusItem[] = safeParse('wp_custom_statuses', INITIAL_STATUSES);
  const systemUsers: CurrentUser[] = safeParse('wp_users_list_v1', SYSTEM_USERS);
  
  const rbacMatrix = safeParse('wp_rbac_matrix_v2', safeParse('wp_rbac_matrix_v1', null));
  const departments = safeParse('applet_workpulse_departments', null);

  // Network Topology
  const topoNodes = safeParse('applet_infra_topology_nodes', []);
  const topoRooms = safeParse('applet_infra_topology_rooms', []);
  const topoWings = safeParse('applet_infra_topology_wings', []);
  const topoLinks = safeParse('applet_infra_topology_links', []);
  const topoStandards = safeParse('applet_infra_topology_station_standards', []);
  const topoAccessories = safeParse('applet_infra_topology_accessories', []);

  // Idle Alert Config
  const idleThreshold = Number(localStorage.getItem('wp_idleThresholdMinutes') || 15);
  const isIdleEnabled = localStorage.getItem('wp_isIdleAlertsEnabled') !== 'false';
  const alertOverrides = safeParse<Record<string, boolean>>('wp_individualAlertOverrides', {});
  const idleToasts = safeParse<IdleToast[]>('wp_idleToasts', []);

  // Integrations & Preferences
  const totvsEnv = localStorage.getItem('wp_totvs_env') || 'rm';
  const totvsTenant = localStorage.getItem('wp_totvs_tenant') || 'empresa-suporte-br';
  const totvsAppKey = localStorage.getItem('wp_totvs_appkey') || 'totvs_live_pk_88319x02';

  const isDarkMode = localStorage.getItem('wp_isDarkMode') === 'true';
  const selectedWorkModel = (localStorage.getItem('wp_selectedWorkModel') as any) || 'Todos';
  const selectedDepartment = (localStorage.getItem('wp_selectedDepartment') as any) || 'Todas as Áreas';
  const selectedPersona = (localStorage.getItem('wp_selectedPersona') as any) || 'BI_GERAL';
  const isSimulating = localStorage.getItem('wp_isSimulating') !== 'false';
  const activeTab = localStorage.getItem('wp_activeTab') || 'overview';

  const rawData = {
    employees,
    appRules,
    siteBlocks,
    pcLockPolicies,
    assets,
    suppliers,
    auxRooms,
    customCategories,
    customStatuses,
    systemUsers,
    rbacMatrix,
    departments,
    topology: {
      nodes: topoNodes,
      rooms: topoRooms,
      wings: topoWings,
      links: topoLinks,
      stationStandards: topoStandards,
      accessories: topoAccessories
    },
    agenda: {
      events: safeParse('applet_agenda_pro_events', safeParse('standalone_agenda_events', [])),
      contacts: safeParse('applet_agenda_pro_contacts', safeParse('standalone_agenda_contacts', [])),
      tasks: safeParse('applet_agenda_pro_tasks', safeParse('standalone_agenda_tasks', [])),
      occurrences: safeParse('applet_agenda_pro_occurrences', safeParse('standalone_agenda_occurrences', []))
    },
    idleAlertConfig: {
      idleThresholdMinutes: idleThreshold,
      isIdleAlertsEnabled: isIdleEnabled,
      individualAlertOverrides: alertOverrides,
      idleToasts
    },
    integrations: {
      totvsEnv,
      totvsTenant,
      totvsAppKey
    },
    preferences: {
      isDarkMode,
      selectedWorkModel,
      selectedDepartment,
      selectedPersona,
      isSimulating,
      activeTab
    }
  };

  const serialized = JSON.stringify(rawData);
  const checksum = generateChecksum(serialized);

  const payload: WorkPulseBackupPayload = {
    version: '2.6.0',
    system: 'WorkPulse Enterprise',
    timestamp: new Date().toISOString(),
    exportedBy: currentUser ? {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      accessLevel: currentUser.accessLevel
    } : undefined,
    checksum,
    stats: {
      employeesCount: employees.length,
      appRulesCount: appRules.length,
      siteBlocksCount: siteBlocks.length,
      pcLockPoliciesCount: pcLockPolicies.length,
      assetsCount: assets.length,
      suppliersCount: suppliers.length,
      roomsCount: auxRooms.length,
      categoriesCount: customCategories.length,
      statusesCount: customStatuses.length,
      systemUsersCount: systemUsers.length,
      departmentsCount: Array.isArray(departments) ? departments.length : 6,
      topologyNodesCount: Array.isArray(topoNodes) ? topoNodes.length : 0,
      topologyLinksCount: Array.isArray(topoLinks) ? topoLinks.length : 0,
      idleSettingsIncluded: true
    },
    data: rawData
  };

  return payload;
}

/**
 * Downloads a backup as formatted JSON file
 */
export function downloadBackupAsJson(payload: WorkPulseBackupPayload, filename?: string): void {
  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const d = new Date(payload.timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  const defaultFilename = `workpulse_backup_completo_${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Saves a snapshot into the local snapshot history
 */
export function saveLocalSnapshot(
  payload: WorkPulseBackupPayload, 
  type: 'automatic' | 'manual' | 'pre_restore' = 'automatic', 
  customLabel?: string
): BackupSnapshotItem {
  const config = getAutoBackupConfig();
  const history = getLocalSnapshots();

  const serialized = JSON.stringify(payload);
  const sizeBytes = new Blob([serialized]).size;
  const recordsTotal = 
    payload.stats.employeesCount + 
    payload.stats.appRulesCount + 
    payload.stats.siteBlocksCount + 
    payload.stats.assetsCount + 
    payload.stats.systemUsersCount +
    payload.stats.topologyNodesCount;

  let label = customLabel;
  if (!label) {
    if (type === 'automatic') {
      label = `Backup Automático Programado (${config.intervalMinutes} min)`;
    } else if (type === 'pre_restore') {
      label = 'Ponto de Segurança Pré-Restauração';
    } else {
      label = 'Snapshot Manual do Administrador';
    }
  }

  const snapshot: BackupSnapshotItem = {
    id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: payload.timestamp,
    label,
    type,
    sizeBytes,
    recordsCount: recordsTotal,
    payload
  };

  // Prepend and enforce max retention limit
  const updatedHistory = [snapshot, ...history].slice(0, config.maxSnapshots || 10);
  
  try {
    localStorage.setItem(BACKUP_STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
    
    // Update config with last backup metadata
    const updatedConfig: AutoBackupConfig = {
      ...config,
      lastBackupTime: payload.timestamp,
      lastBackupStatus: 'success'
    };
    localStorage.setItem(BACKUP_STORAGE_KEYS.CONFIG, JSON.stringify(updatedConfig));
  } catch (err) {
    console.error('[WorkPulse BackupManager] LocalStorage quota exceeded or error saving snapshot', err);
    // If quota exceeded, try dropping half of older snapshots and retry
    if (history.length > 2) {
      const reduced = [snapshot, ...history.slice(0, 3)];
      localStorage.setItem(BACKUP_STORAGE_KEYS.HISTORY, JSON.stringify(reduced));
    }
  }

  return snapshot;
}

/**
 * Returns all local backup snapshots
 */
export function getLocalSnapshots(): BackupSnapshotItem[] {
  return safeParse<BackupSnapshotItem[]>(BACKUP_STORAGE_KEYS.HISTORY, []);
}

/**
 * Deletes a single snapshot by ID
 */
export function deleteLocalSnapshot(id: string): void {
  const history = getLocalSnapshots();
  const filtered = history.filter(s => s.id !== id);
  localStorage.setItem(BACKUP_STORAGE_KEYS.HISTORY, JSON.stringify(filtered));
}

/**
 * Clears all snapshots history
 */
export function clearAllSnapshots(): void {
  localStorage.removeItem(BACKUP_STORAGE_KEYS.HISTORY);
}

/**
 * Returns auto backup configuration
 */
export function getAutoBackupConfig(): AutoBackupConfig {
  return safeParse<AutoBackupConfig>(BACKUP_STORAGE_KEYS.CONFIG, DEFAULT_AUTO_BACKUP_CONFIG);
}

/**
 * Updates auto backup configuration
 */
export function updateAutoBackupConfig(newConfig: Partial<AutoBackupConfig>): AutoBackupConfig {
  const current = getAutoBackupConfig();
  const updated = { ...current, ...newConfig };
  localStorage.setItem(BACKUP_STORAGE_KEYS.CONFIG, JSON.stringify(updated));
  return updated;
}

/**
 * Validates a parsed JSON object to verify if it represents a valid WorkPulse backup
 */
export function validateBackupPayload(parsed: any): { 
  isValid: boolean; 
  errors: string[]; 
  payload?: WorkPulseBackupPayload; 
} {
  const errors: string[] = [];

  if (!parsed || typeof parsed !== 'object') {
    return { isValid: false, errors: ['O arquivo fornecido não é um JSON válido.'] };
  }

  // Check core signature
  if (parsed.system !== 'WorkPulse Enterprise' && !parsed.data) {
    errors.push('Assinatura do WorkPulse Enterprise ausente ou formato não reconhecido.');
  }

  if (!parsed.data || typeof parsed.data !== 'object') {
    errors.push('Objeto de dados (data payload) não encontrado no arquivo.');
  }

  const d = parsed.data || {};
  if (!d.employees && !d.appRules && !d.assets && !d.systemUsers) {
    errors.push('O arquivo de backup não contém entidades fundamentais (colaboradores, regras, patrimônio ou usuários).');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Normalize stats if missing
  const stats = parsed.stats || {
    employeesCount: Array.isArray(d.employees) ? d.employees.length : 0,
    appRulesCount: Array.isArray(d.appRules) ? d.appRules.length : 0,
    siteBlocksCount: Array.isArray(d.siteBlocks) ? d.siteBlocks.length : 0,
    pcLockPoliciesCount: Array.isArray(d.pcLockPolicies) ? d.pcLockPolicies.length : 0,
    assetsCount: Array.isArray(d.assets) ? d.assets.length : 0,
    suppliersCount: Array.isArray(d.suppliers) ? d.suppliers.length : 0,
    roomsCount: Array.isArray(d.auxRooms) ? d.auxRooms.length : 0,
    categoriesCount: Array.isArray(d.customCategories) ? d.customCategories.length : 0,
    statusesCount: Array.isArray(d.customStatuses) ? d.customStatuses.length : 0,
    systemUsersCount: Array.isArray(d.systemUsers) ? d.systemUsers.length : 0,
    departmentsCount: 6,
    topologyNodesCount: Array.isArray(d.topology?.nodes) ? d.topology.nodes.length : 0,
    topologyLinksCount: Array.isArray(d.topology?.links) ? d.topology.links.length : 0,
    idleSettingsIncluded: Boolean(d.idleAlertConfig)
  };

  const validPayload: WorkPulseBackupPayload = {
    version: parsed.version || '2.6.0',
    system: 'WorkPulse Enterprise',
    timestamp: parsed.timestamp || new Date().toISOString(),
    exportedBy: parsed.exportedBy,
    checksum: parsed.checksum || 'IMPORTED-BACKUP',
    stats,
    data: d
  };

  return { isValid: true, errors: [], payload: validPayload };
}

/**
 * Restores all system configurations from a WorkPulseBackupPayload
 */
export function restoreBackupPayload(
  payload: WorkPulseBackupPayload, 
  createSafetyRollback: boolean = true,
  currentUser?: CurrentUser
): boolean {
  try {
    // 1. Create a safety rollback snapshot of current state first
    if (createSafetyRollback) {
      const currentPayload = generateBackupPayload(currentUser);
      saveLocalSnapshot(currentPayload, 'pre_restore', 'Snapshot de Segurança Pré-Restauração');
    }

    const { data } = payload;

    // 2. Overwrite core entities in localStorage
    if (Array.isArray(data.employees)) {
      localStorage.setItem('wp_employees', JSON.stringify(data.employees));
    }
    if (Array.isArray(data.appRules)) {
      localStorage.setItem('wp_appRules', JSON.stringify(data.appRules));
    }
    if (Array.isArray(data.siteBlocks)) {
      localStorage.setItem('wp_siteBlocks', JSON.stringify(data.siteBlocks));
    }
    if (Array.isArray(data.pcLockPolicies)) {
      localStorage.setItem('wp_pcLockPolicies', JSON.stringify(data.pcLockPolicies));
    }
    if (Array.isArray(data.assets)) {
      localStorage.setItem('wp_assets', JSON.stringify(data.assets));
    }
    if (Array.isArray(data.suppliers)) {
      localStorage.setItem('wp_suppliers', JSON.stringify(data.suppliers));
    }
    if (Array.isArray(data.auxRooms)) {
      localStorage.setItem('wp_aux_rooms', JSON.stringify(data.auxRooms));
    }
    if (Array.isArray(data.customCategories)) {
      localStorage.setItem('wp_custom_categories', JSON.stringify(data.customCategories));
    }
    if (Array.isArray(data.customStatuses)) {
      localStorage.setItem('wp_custom_statuses', JSON.stringify(data.customStatuses));
    }
    if (Array.isArray(data.systemUsers)) {
      localStorage.setItem('wp_users_list_v1', JSON.stringify(data.systemUsers));
      if (data.systemUsers.length > 0) {
        localStorage.setItem('wp_currentUser', JSON.stringify(data.systemUsers[0]));
      }
    }
    if (data.rbacMatrix) {
      localStorage.setItem('wp_rbac_matrix_v2', JSON.stringify(data.rbacMatrix));
      localStorage.setItem('wp_rbac_matrix_v1', JSON.stringify(data.rbacMatrix));
    }
    if (data.departments) {
      localStorage.setItem('applet_workpulse_departments', JSON.stringify(data.departments));
    }

    // 3. Topology
    if (data.topology) {
      if (Array.isArray(data.topology.nodes)) {
        localStorage.setItem('applet_infra_topology_nodes', JSON.stringify(data.topology.nodes));
      }
      if (Array.isArray(data.topology.rooms)) {
        localStorage.setItem('applet_infra_topology_rooms', JSON.stringify(data.topology.rooms));
      }
      if (Array.isArray(data.topology.wings)) {
        localStorage.setItem('applet_infra_topology_wings', JSON.stringify(data.topology.wings));
      }
      if (Array.isArray(data.topology.links)) {
        localStorage.setItem('applet_infra_topology_links', JSON.stringify(data.topology.links));
      }
      if (Array.isArray(data.topology.stationStandards)) {
        localStorage.setItem('applet_infra_topology_station_standards', JSON.stringify(data.topology.stationStandards));
      }
      if (Array.isArray(data.topology.accessories)) {
        localStorage.setItem('applet_infra_topology_accessories', JSON.stringify(data.topology.accessories));
      }
    }

    // 4. Agenda Pro Data
    if (data.agenda) {
      if (Array.isArray(data.agenda.events)) {
        localStorage.setItem('applet_agenda_pro_events', JSON.stringify(data.agenda.events));
        localStorage.setItem('standalone_agenda_events', JSON.stringify(data.agenda.events));
      }
      if (Array.isArray(data.agenda.contacts)) {
        localStorage.setItem('applet_agenda_pro_contacts', JSON.stringify(data.agenda.contacts));
        localStorage.setItem('standalone_agenda_contacts', JSON.stringify(data.agenda.contacts));
      }
      if (Array.isArray(data.agenda.tasks)) {
        localStorage.setItem('applet_agenda_pro_tasks', JSON.stringify(data.agenda.tasks));
        localStorage.setItem('standalone_agenda_tasks', JSON.stringify(data.agenda.tasks));
      }
      if (Array.isArray(data.agenda.occurrences)) {
        localStorage.setItem('applet_agenda_pro_occurrences', JSON.stringify(data.agenda.occurrences));
        localStorage.setItem('standalone_agenda_occurrences', JSON.stringify(data.agenda.occurrences));
      }
    }

    // 5. Idle Alerts
    if (data.idleAlertConfig) {
      if (data.idleAlertConfig.idleThresholdMinutes !== undefined) {
        localStorage.setItem('wp_idleThresholdMinutes', String(data.idleAlertConfig.idleThresholdMinutes));
      }
      if (data.idleAlertConfig.isIdleAlertsEnabled !== undefined) {
        localStorage.setItem('wp_isIdleAlertsEnabled', String(data.idleAlertConfig.isIdleAlertsEnabled));
      }
      if (data.idleAlertConfig.individualAlertOverrides) {
        localStorage.setItem('wp_individualAlertOverrides', JSON.stringify(data.idleAlertConfig.individualAlertOverrides));
      }
      if (data.idleAlertConfig.idleToasts) {
        localStorage.setItem('wp_idleToasts', JSON.stringify(data.idleAlertConfig.idleToasts));
      }
    }

    // 5. Integrations & Preferences
    if (data.integrations) {
      if (data.integrations.totvsEnv) localStorage.setItem('wp_totvs_env', data.integrations.totvsEnv);
      if (data.integrations.totvsTenant) localStorage.setItem('wp_totvs_tenant', data.integrations.totvsTenant);
      if (data.integrations.totvsAppKey) localStorage.setItem('wp_totvs_appkey', data.integrations.totvsAppKey);
    }

    if (data.preferences) {
      if (data.preferences.isDarkMode !== undefined) {
        localStorage.setItem('wp_isDarkMode', String(data.preferences.isDarkMode));
        if (data.preferences.isDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      if (data.preferences.selectedWorkModel) localStorage.setItem('wp_selectedWorkModel', data.preferences.selectedWorkModel);
      if (data.preferences.selectedDepartment) localStorage.setItem('wp_selectedDepartment', data.preferences.selectedDepartment);
      if (data.preferences.selectedPersona) localStorage.setItem('wp_selectedPersona', data.preferences.selectedPersona);
      if (data.preferences.isSimulating !== undefined) localStorage.setItem('wp_isSimulating', String(data.preferences.isSimulating));
    }

    // Dispatch global custom event for instant seamless state sync
    window.dispatchEvent(new CustomEvent(BACKUP_STORAGE_KEYS.RESTORE_EVENT, {
      detail: { payload, timestamp: Date.now() }
    }));

    return true;
  } catch (err) {
    console.error('[WorkPulse BackupManager] Error during restore:', err);
    return false;
  }
}

/**
 * Resets all settings to original factory / seed defaults
 */
export function resetToFactoryDefaults(createSafetyRollback: boolean = true, currentUser?: CurrentUser): boolean {
  try {
    if (createSafetyRollback) {
      const currentPayload = generateBackupPayload(currentUser);
      saveLocalSnapshot(currentPayload, 'pre_restore', 'Snapshot Pré-Reset de Fábrica');
    }

    localStorage.setItem('wp_employees', JSON.stringify(INITIAL_EMPLOYEES));
    localStorage.setItem('wp_appRules', JSON.stringify(INITIAL_APP_RULES));
    localStorage.setItem('wp_siteBlocks', JSON.stringify(INITIAL_SITE_BLOCKS));
    localStorage.setItem('wp_pcLockPolicies', JSON.stringify(INITIAL_PC_LOCK_POLICIES));
    localStorage.setItem('wp_assets', JSON.stringify(INITIAL_IT_ASSETS));
    localStorage.setItem('wp_suppliers', JSON.stringify(INITIAL_SUPPLIERS));
    localStorage.setItem('wp_aux_rooms', JSON.stringify(INITIAL_ROOMS_ITAM));
    localStorage.setItem('wp_custom_categories', JSON.stringify(INITIAL_CATEGORIES));
    localStorage.setItem('wp_custom_statuses', JSON.stringify(INITIAL_STATUSES));
    localStorage.setItem('wp_users_list_v1', JSON.stringify(SYSTEM_USERS));
    localStorage.setItem('wp_currentUser', JSON.stringify(SYSTEM_USERS[0]));
    localStorage.setItem('wp_idleThresholdMinutes', '15');
    localStorage.setItem('wp_isIdleAlertsEnabled', 'true');
    localStorage.setItem('wp_individualAlertOverrides', JSON.stringify({ 'emp-104': true }));
    localStorage.setItem('wp_selectedWorkModel', 'Todos');
    localStorage.setItem('wp_selectedDepartment', 'Todas as Áreas');
    localStorage.setItem('wp_selectedPersona', 'BI_GERAL');

    window.dispatchEvent(new CustomEvent(BACKUP_STORAGE_KEYS.RESTORE_EVENT, {
      detail: { isFactoryReset: true, timestamp: Date.now() }
    }));

    return true;
  } catch (err) {
    console.error('[WorkPulse Reset Error]', err);
    return false;
  }
}

/**
 * Calculate LocalStorage estimated size and usage
 */
export function getStorageUsageEstimate(): { usedKb: number; itemsCount: number; snapshotsCount: number } {
  let totalLength = 0;
  let itemsCount = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('wp_') || key.startsWith('applet_'))) {
      const value = localStorage.getItem(key) || '';
      totalLength += key.length + value.length;
      itemsCount++;
    }
  }
  const usedKb = Math.round((totalLength * 2) / 1024); // 2 bytes per char
  const snapshots = getLocalSnapshots();
  return { usedKb, itemsCount, snapshotsCount: snapshots.length };
}
