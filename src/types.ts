export type WorkModel = 'Presencial' | 'Home Office' | 'Híbrido';

export type Department = 
  | 'Engenharia' 
  | 'Vendas' 
  | 'RH & Pessoas' 
  | 'Atendimento & Suporte' 
  | 'Marketing' 
  | 'Financeiro & Jurídico'
  | 'Todas as Áreas';

export type AppCategory = 'Produtivo' | 'Improdutivo' | 'Neutro';

export type StationStatus = 'Ativo' | 'Ocioso' | 'Ausente' | 'Fora do Expediente' | 'Estação Bloqueada';

export interface Employee {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  department: Department;
  workModel: WorkModel;
  status: StationStatus;
  computerHost: string;
  ipAddress: string;
  currentApp: string;
  currentDomain?: string;
  productivityScore: number; // 0 - 100%
  workedHoursToday: number; // e.g. 7.5
  productiveHoursToday: number;
  unproductiveHoursToday: number;
  neutralHoursToday: number;
  idleHoursToday: number;
  scheduleStart: string; // e.g. "08:00"
  scheduleEnd: string; // e.g. "17:00"
  punchInTime?: string; // e.g. "07:58"
  punchOutTime?: string; // e.g. "17:05"
  overtimeMinutes: number;
  pcLockEnabled: boolean;
  pcLockStatus: 'Desbloqueado' | 'Bloqueado Pós-Expediente' | 'Restrição Fim de Semana';
  agentVersion: string;
}

export interface ActivityLog {
  id: string;
  employeeId: string;
  employeeName: string;
  department: Department;
  workModel: WorkModel;
  appName: string;
  windowTitle: string;
  domain?: string;
  category: AppCategory;
  durationMinutes: number;
  timestamp: string;
  pcHost: string;
}

export interface AppClassificationRule {
  id: string;
  appName: string;
  processName?: string;
  domainPattern?: string;
  category: AppCategory;
  groupName: string;
  targetDepartment: Department;
  description?: string;
  isAiSuggested?: boolean;
  createdAt?: string;
}

export interface SiteBlockRule {
  id: string;
  title: string;
  categoryGroup: string;
  domainPattern: string;
  blockedDepartments: Department[];
  workModels: WorkModel[];
  action: 'Bloqueio Total' | 'Aviso com Justificativa' | 'Alerta ao Gestor';
  active: boolean;
}

export interface PCLockPolicy {
  id: string;
  name: string;
  targetDepartment: Department;
  workModelTarget: 'Todos' | 'Home Office' | 'Presencial';
  cutoffTime: string; // e.g. "18:00"
  gracePeriodMinutes: number; // e.g. 15
  autoLockAfterCutoff: boolean;
  blockWeekendUse: boolean;
  lockMessage: string;
  active: boolean;
}

export interface TimecardRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: Department;
  date: string;
  pontoPunchIn: string;
  pontoPunchOut: string;
  pontoTotalHours: number;
  agentActiveWorkedHours: number;
  agentProductiveHours: number;
  agentIdleHours: number;
  correlationPct: number; // Correlation between punch clock & real computer activity
  systemSource: 'Ahgora' | 'TOTVS Carol' | 'Ponto Secullum' | 'Senior X' | 'Manual';
  hasAnomaly: boolean;
  anomalyReason?: string;
}

export interface DepartmentSummary {
  department: Department;
  totalEmployees: number;
  avgProductivityScore: number;
  productiveHoursPct: number;
  idleHoursPct: number;
  unproductiveHoursPct: number;
  topApp: string;
}

export interface IdleToast {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  role: string;
  department: Department;
  workModel: WorkModel;
  computerHost: string;
  idleMinutes: number;
  thresholdMinutes: number;
  lastApp: string;
  timestamp: string;
  severity: 'alerta' | 'critico';
  acknowledged?: boolean;
  createdTimeMs?: number;
  lastUpdatedMs?: number;
  occurrenceCount?: number;
  isGrouped?: boolean;
  eventsHistory?: { timestamp: string; idleMinutes: number; lastApp: string }[];
}

export interface IdleThresholdConfig {
  thresholdMinutes: number; // e.g., 15
  autoNotifyAgent: boolean;
  soundAlert: boolean;
  enabledDepartments: Department[];
}

export type PersonaView = 'BI_GERAL' | 'RH_PEOPLE' | 'DIRETORIA' | 'GESTORES' | 'TI_COMPLIANCE';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  accessLevel: string; // e.g. 'ADMIN_GERAL' | 'DIRETORIA' | 'GESTOR' | 'RH' | 'COLABORADOR'
  avatar: string;
  department: string;
  loginTime: string;
  ipAddress: string;
  computerHost: string;
  status: 'Ativo' | 'Ausente' | 'Ocioso' | 'Inativo';
  password?: string;
}

export interface SupplierItem {
  id: string;
  name: string;
  cnpj?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  category?: string;
  rating?: number;
}

export interface CustomCategoryItem {
  id: string;
  code: string;
  name: string;
  iconName?: string;
  color?: string;
  lifespanMonthsDefault?: number;
}

export interface CustomStatusItem {
  id: string;
  code: string;
  label: string;
  colorBg?: string;
  colorText?: string;
  description?: string;
}

export interface EnvironmentRoomItem {
  id: string;
  name: string;
  quadrantCode: string;
  floor?: string;
  building?: string;
  category: 'datacenter' | 'office' | 'meeting' | 'support' | 'reception' | 'other';
  notes?: string;
}

export type AssetCategory = 
  | 'hardware_server' 
  | 'hardware_network' 
  | 'hardware_workstation' 
  | 'hardware_monitor' 
  | 'hardware_peripheral' 
  | 'hardware_printer' 
  | 'software_license' 
  | 'mobile_tablet' 
  | 'rack_ups' 
  | 'other'
  | string;

export type AssetStatus = 'em_uso' | 'em_estoque' | 'em_manutencao' | 'descartado' | 'reservado' | string;

// Ciclo de vida do ativo: Compra → entrada → instalação → utilização → manutenção → transferência → substituição → descarte
export type AssetLifecycleStage = 
  | 'compra'
  | 'entrada'
  | 'instalacao'
  | 'utilizacao'
  | 'manutencao'
  | 'transferencia'
  | 'substituicao'
  | 'descarte';

export type AssetContractType = 
  | 'Aquisicao_Direta' 
  | 'Locacao_Leasing' 
  | 'Suporte_SLA' 
  | 'Garantia_Estendida' 
  | 'Comodato' 
  | 'Outro';

export interface AssetHistoryEvent {
  id: string;
  date: string; // YYYY-MM-DD or ISO
  stage?: AssetLifecycleStage;
  fromStage?: AssetLifecycleStage;
  toStage?: AssetLifecycleStage;
  type: 'compra' | 'entrada' | 'instalacao' | 'utilizacao' | 'manutencao' | 'transferencia' | 'substituicao' | 'descarte' | 'auditoria' | 'financeiro' | 'aquisicao' | 'transicao_ciclo' | 'termo';
  title: string;
  description: string;
  user?: string;
  performedBy?: string;
  cost?: number;
  location?: string;
  responsible?: string;
}

export interface AssetMaintenanceRecord {
  id: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  type: 'preventiva' | 'corretiva' | 'upgrade' | 'garantia_fabricante';
  title: string;
  description: string;
  openDate: string; // YYYY-MM-DD
  closeDate?: string;
  status: 'aberta' | 'em_andamento' | 'aguardando_pecas' | 'concluida' | 'cancelada';
  technician: string;
  supplierOrService?: string;
  cost: number;
  partsReplaced?: string;
  invoiceNumber?: string;
  notes?: string;
}

export interface ITAsset {
  id: string;
  assetTag: string; // Tombo / Plaqueta (ex: PAT-2026-0001)
  name: string; // ex: Servidor Dell PowerEdge R750
  category: AssetCategory;
  brandModel: string; // ex: Dell PowerEdge R750
  serialNumber: string; // ex: SN-994820194
  status: AssetStatus;

  // Ciclo de vida do ativo
  lifecycleStage?: AssetLifecycleStage;
  lifecycleStageDate?: string;
  lifecycleNotes?: string;

  // Informações Administrativas & Fornecedor
  supplier?: string; // ex: Dell Brasil
  supplierCnpj?: string;
  supplierContact?: string;
  supplierEmail?: string;
  supplierPhone?: string;
  invoiceNumber?: string; // NF-12345

  // Contrato
  contractNumber?: string; // CTR-2024-DELL-09
  contractType?: AssetContractType;
  contractStartDate?: string;
  contractEndDate?: string;
  contractMonthlyCost?: number;
  contractNotes?: string;

  // Garantia
  warrantyExpiry: string; // YYYY-MM-DD
  warrantyType?: 'On-Site Fabricante' | 'Balcão / Carry-in' | 'SLA 4h 24x7' | 'Garantia Estendida' | 'Nenhuma';
  warrantySla?: string;
  warrantySlaHours?: number;
  warrantyNotes?: string;

  // Informações Financeiras & Valores
  acquisitionDate: string; // YYYY-MM-DD
  purchaseValue: number; // R$
  currentValue?: number; // R$ (Valor Residual com Depreciação)
  salvageValue?: number; // Valor residual final
  totalMaintenanceCost?: number; // Custo acumulado de manutenções
  insuranceValue?: number;
  insurancePolicy?: string;
  lifespanMonths?: number; // Meses de vida útil para depreciação (default 36 ou 60)

  // Localização
  roomId?: string; // Vinculado a ambiente/sala
  roomName?: string;
  building?: string; // Edifício / Prédio
  floor?: string; // Andar / Pavimento
  locationDetails?: string; // ex: Rack R01 - Posição 42U
  quadrantCode?: string; // Q1..Q6
  linkedTopologyNodeId?: string; // Vinculado ao nó da topologia 2D/3D

  // Responsável
  assignedEmployeeId?: string; // Vinculado a colaborador
  assignedEmployeeName?: string;
  assignedDepartment?: string;
  custodyTermSigned?: boolean; // Termo de cautela/responsabilidade assinado
  custodyTermDate?: string;

  // Conectividade de Rede
  macAddress?: string;
  ipAddress?: string;

  // Histórico do Ativo (Auditoria / Linha do Tempo)
  history?: AssetHistoryEvent[];

  // Manutenções
  maintenances?: AssetMaintenanceRecord[];

  // Propriedades Adicionais de Sistema e Fabricante
  tenant?: string; // ex: 'WorkPulse Matriz', 'WorkPulse Tech Hub', 'WorkPulse Logística'
  unit?: string; // Unidade / Filial / Edifício
  operatingSystem?: string; // ex: 'Windows 11 Pro', 'Ubuntu Linux', 'macOS Sonoma'
  osVersion?: string; // ex: 'Windows 11 Pro 23H2', 'Ubuntu 22.04.4 LTS', 'macOS 14.5'
  manufacturer?: string; // ex: 'Dell', 'Lenovo', 'Apple', 'Cisco', 'HP', 'Mikrotik'
  hasAgent?: boolean;

  // Softwares Instalados
  installedSoftwares?: Array<{
    name: string;
    version: string;
    status: 'updated' | 'outdated' | 'vulnerable';
    license?: string;
    category?: string;
  }>;

  // Alterações de Hardware & Alertas
  hardwareChanges?: Array<{
    id: string;
    field: string;
    fieldLabel: string;
    oldValue: string;
    newValue: string;
    detectedAt: string;
    severity: 'info' | 'warning' | 'critical';
  }>;
  activeAlertsCount?: number;

  notes?: string;
  agentStatus?: 'online' | 'offline'; // Status de conexão do agente em tempo real
  agentLastPing?: string; // ex: 'há 10 seg', 'há 2 min', 'há 45 min'
  agentVersion?: string; // ex: 'v4.2.1-lts'
  createdAt: string;
}

export interface WorkPulseBackupPayload {
  version: string;
  system: 'WorkPulse Enterprise';
  timestamp: string;
  exportedBy?: {
    id: string;
    name: string;
    email: string;
    accessLevel: string;
  };
  checksum: string;
  stats: {
    employeesCount: number;
    appRulesCount: number;
    siteBlocksCount: number;
    pcLockPoliciesCount: number;
    assetsCount: number;
    suppliersCount: number;
    roomsCount: number;
    categoriesCount: number;
    statusesCount: number;
    systemUsersCount: number;
    departmentsCount: number;
    topologyNodesCount: number;
    topologyLinksCount: number;
    idleSettingsIncluded: boolean;
  };
  data: {
    employees: Employee[];
    appRules: AppClassificationRule[];
    siteBlocks: SiteBlockRule[];
    pcLockPolicies: PCLockPolicy[];
    assets: ITAsset[];
    suppliers: SupplierItem[];
    auxRooms: EnvironmentRoomItem[];
    customCategories: CustomCategoryItem[];
    customStatuses: CustomStatusItem[];
    systemUsers: CurrentUser[];
    rbacMatrix?: any;
    departments?: any[];
    topology?: {
      nodes?: any[];
      rooms?: any[];
      wings?: any[];
      links?: any[];
      stationStandards?: any[];
      accessories?: any[];
    };
    agenda?: {
      events?: any[];
      contacts?: any[];
      tasks?: any[];
      occurrences?: any[];
    };
    idleAlertConfig?: {
      idleThresholdMinutes: number;
      isIdleAlertsEnabled: boolean;
      individualAlertOverrides: Record<string, boolean>;
      idleToasts?: IdleToast[];
    };
    integrations?: {
      totvsEnv?: string;
      totvsTenant?: string;
      totvsAppKey?: string;
    };
    preferences?: {
      isDarkMode?: boolean;
      selectedWorkModel?: WorkModel | 'Todos';
      selectedDepartment?: Department;
      selectedPersona?: PersonaView;
      isSimulating?: boolean;
      activeTab?: string;
    };
  };
}

export interface BackupSnapshotItem {
  id: string;
  timestamp: string;
  label: string;
  type: 'automatic' | 'manual' | 'pre_restore';
  sizeBytes: number;
  recordsCount: number;
  payload: WorkPulseBackupPayload;
}

export interface AutoBackupConfig {
  enabled: boolean;
  intervalMinutes: number; // 5, 15, 30, 60
  maxSnapshots: number; // 5, 10, 20
  lastBackupTime?: string;
  lastBackupTimestamp?: number;
  lastBackupStatus?: 'success' | 'warning' | 'error';
  backupToCloudApiMock?: boolean;
}
