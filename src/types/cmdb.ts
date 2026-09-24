export type CITypeGroup = 'hardware' | 'software' | 'infraestrutura' | 'negocio';

// PROMPT 5: Tipos de Configuration Item
export type CIType =
  | 'workstation'
  | 'notebook'
  | 'server'
  | 'smartphone'
  | 'tablet'
  | 'printer'
  | 'switch'
  | 'router'
  | 'firewall'
  | 'access_point'
  | 'virtual_machine'
  | 'other';

// PROMPT 5: Tipos de Evidência de Relacionamento
export type RelationshipEvidence = 'CONFIRMED' | 'PROBABLE' | 'UNKNOWN';

export type CIStatus = 
  | 'operacional' 
  | 'atencao' 
  | 'indisponivel' 
  | 'manutencao' 
  | 'aposentado' 
  | 'desconhecido';

export type CILayer = 
  | 'todas'
  | 'borda'
  | 'core'
  | 'datacenter'
  | 'acesso'
  | 'aplicacao'
  | 'servico'
  | 'nuvem';

export type CIRelationshipType = 
  | 'CONECTADO_A'
  | 'DEPENDE_DE'
  | 'HOSPEDA'
  | 'UTILIZA'
  | 'INSTALADO_EM'
  | 'PERTENCE_A'
  | 'PROTEGIDO_POR'
  | 'FORNECE'
  | 'E_PARTE_DE'
  | 'SUPORTA'
  | 'AFETA'
  | 'E_DEPENDENCIA_DE'
  | 'SUBSTITUI'
  | 'ESTA_CONECTADO_A';

export interface DynamicAttributeDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select';
  options?: string[];
  unit?: string;
  required?: boolean;
  defaultValue?: any;
}

export interface CITypeMetadata {
  id: string;
  name: string;
  group: CITypeGroup;
  iconName: string;
  color: string;
  defaultLayer: CILayer;
  attributeDefinitions: DynamicAttributeDefinition[];
}

export interface CITelemetry {
  cpuUsagePct: number;
  ramUsagePct: number;
  diskUsagePct: number;
  temperatureC?: number;
  uptimeHours: number;
  lastHeartbeat: string;
  isOnline: boolean;
  agentVersion?: string;
  latencyMs?: number;
}

export interface ConfigurationItem {
  id: string;
  code: string; // e.g. "SRV-001", "FW-001"
  name: string;
  nome?: string; // PROMPT 5: nome
  typeGroup: CITypeGroup;
  typeId: string; // "servidor", "firewall", "switch", "desktop", etc.
  tipo?: CIType;  // PROMPT 5: tipo (workstation, notebook, server, smartphone, tablet, printer, switch, router, firewall, access_point, virtual_machine, other)
  typeName: string; // Display name
  
  // Multi-tenant & Organization
  tenantId: string;
  tenant?: string; // PROMPT 5: tenant
  tenantName?: string;
  clientId: string;
  clientName: string;
  unit: string; // e.g. "Matriz", "Filial SP", "Datacenter"
  location: string; // e.g. "Data Center / Rack R01"
  localizacao?: string; // PROMPT 5: localização
  
  // Responsible & Ownership
  responsible: string;
  usuarioResponsavel?: string; // PROMPT 5: usuário responsável
  responsibleEmail?: string;
  department?: string;
  departamento?: string; // PROMPT 5: departamento
  
  // Technical & Network
  status: CIStatus;
  manufacturer: string;
  fabricante?: string; // PROMPT 5: fabricante
  model: string;
  modelo?: string; // PROMPT 5: modelo
  serialNumber: string;
  serial?: string; // PROMPT 5: serial
  assetTag: string; // Patrimônio PAT-2026-XXXX
  asset?: string; // PROMPT 5: asset
  hostname: string;
  ipAddress: string;
  macAddress?: string;
  operatingSystem?: string;
  
  // Lifecycle & Dates
  acquisitionDate?: string;
  installationDate?: string;
  warrantyExpiry?: string;
  notes?: string;
  criticality: 'critica' | 'alta' | 'media' | 'baixa';
  layer: CILayer;
  
  // Dynamic Attributes & Specs
  dynamicAttributes: Record<string, any>;
  
  // Links to other modules
  linkedAssetId?: string;
  linkedContractId?: string;
  linkedContractName?: string;
  linkedTicketsCount: number;
  
  // Telemetry (RMM / Agent)
  telemetry?: CITelemetry;
  
  // Coordinates for visual topology canvas
  canvasPosition?: {
    x: number;
    y: number;
    group?: string; // e.g. 'internet', 'firewall', 'switch', 'wifi', 'servers', 'workstations', 'printers', 'vpn'
  };

  createdAt: string;
  updatedAt: string;
}

export interface CIRelationship {
  id: string;
  tenantId: string;
  
  // PROMPT 5 & 6: Cada relacionamento deverá possuir:
  // origem, destino, tipo, evidência, confiança, criado_em, atualizado_em
  origem: string;      // ID do item de origem (CI, Usuário, Software, etc.)
  destino: string;     // ID do item de destino (CI, Switch, etc.)
  tipo: string;        // Tipo da relação (ex: 'USER_TO_ASSET', 'ASSET_TO_NETWORK_DEVICE', 'NETWORK_DEVICE_TO_SWITCH', 'SWITCH_TO_FIREWALL', 'FIREWALL_TO_ROUTER', 'ROUTER_TO_INTERNET', 'ASSET_TO_SOFTWARE', 'ASSET_TO_TICKET', 'ASSET_TO_MAINTENANCE', 'ASSET_TO_WARRANTY', etc.)
  evidencia: RelationshipEvidence; // 'CONFIRMED' | 'PROBABLE' | 'UNKNOWN'
  confianca: number;   // 0.0 - 1.0 (ex: 1.0 = 100%, 0.8 = 80%)
  criado_em: string;   // Data de criação ISO
  atualizado_em: string; // Data de atualização ISO

  // Prompt 6: connection_type, confidence, evidence_source (LLDP, CDP, ARP, SNMP, AGENT, MANUAL)
  connection_type?: string;
  confidence?: number;
  evidence_source?: 'LLDP' | 'CDP' | 'ARP' | 'SNMP' | 'AGENT' | 'MANUAL' | string;
  isManual?: boolean;
  manualLocked?: boolean; // Preservar conexões manuais existentes

  // Compatibilidade com a visualização existente:
  sourceCiId: string;
  sourceCiName: string;
  sourceCiCode: string;
  targetCiId: string;
  targetCiName: string;
  targetCiCode: string;
  type: CIRelationshipType | string;
  evidence?: RelationshipEvidence;
  criticality: 'critica' | 'alta' | 'media' | 'baixa';
  description?: string;
  createdAt?: string;
  updatedAt?: string;

  // Detalhes técnicos da evidência
  evidenceDetails?: {
    sourceType: 'AGENT_TELEMETRY' | 'CDP_LLDP' | 'ARP_TABLE' | 'MAC_TABLE' | 'DHCP_LEASE' | 'REGISTRY_KEY' | 'TICKET_SYSTEM' | 'WARRANTY_API' | 'MANUAL_AUDIT' | string;
    collectorName?: string;
    detectedValue?: string;
    detectedBy?: string;
    proof?: string;
    verifiedAt: string;
    explanation?: string;
  };
}

export type DiscoveryPipelineStage = 'DISCOVERY' | 'ASSET' | 'CI' | 'CMDB';

export type DiscoveryProtocolMethod = 'ICMP' | 'ARP' | 'SNMP' | 'LLDP' | 'CDP' | 'DNS' | 'DHCP' | 'INTERFACE_DISCOVERY';

export interface DeviceInterface {
  name: string;
  mac: string;
  ip?: string;
  speedMbps?: number;
  status: 'UP' | 'DOWN';
  type: 'ETHERNET' | 'WIFI' | 'VLAN' | 'FIBER' | 'LOOPBACK' | 'SVI';
  duplex?: 'FULL' | 'HALF';
}

export interface AuthorizedSubnet {
  id: string;
  tenantId: string;
  name: string; // Ex: "LAN Corporativa Matriz"
  cidr: string; // Ex: "192.168.1.0/24"
  vlanId?: number;
  gateway?: string;
  dnsServer?: string;
  authorizedBy: string;
  authorizedAt: string;
  isActive: boolean;
  allowedProtocols: DiscoveryProtocolMethod[];
  rateLimitPps: number;
  timeoutMs: number;
  maxConcurrency: number;
  notes?: string;
}

export interface DiscoveryJob {
  id: string;
  tenantId: string;
  tenant: string;
  rede: string;
  cidr: string;
  horario: string;
  metodo: DiscoveryProtocolMethod[];
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  inicio: string;
  termino?: string;
  resultado?: DiscoveryJobResult;
  scanConfig: {
    rateLimitPps: number;
    timeoutMs: number;
    maxConcurrency: number;
    authorizedSubnetId?: string;
    snmpCommunity?: string;
    snmpVersion?: 'v2c' | 'v3';
  };
  logs: Array<{
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
    message: string;
    ip?: string;
    protocol?: string;
  }>;
}

export interface DiscoveryJobResult {
  totalIpsScanned: number;
  responsiveHosts: number;
  newDiscoveredCount: number;
  matchedExistingCount: number;
  protocolStats: Record<string, number>;
  durationSeconds: number;
  discoveredDeviceIds: string[];
}

export interface DiscoveredDevice {
  id: string;
  tenantId: string;
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
  detectedType: CIType;
  osHint?: string;
  operatingSystem?: string;
  openPorts: number[];
  discoveredAt: string;
  lastSeen?: string;
  discoverySource?: string;
  discoveryJobId?: string;
  protocolsDetected?: DiscoveryProtocolMethod[];
  snmpData?: {
    sysDescr?: string;
    sysName?: string;
    sysLocation?: string;
    sysContact?: string;
    sysObjectID?: string;
    interfacesCount?: number;
    uptime?: string;
  };
  lldpNeighbors?: Array<{
    localPort: string;
    chassisId: string;
    portId: string;
    systemName: string;
    systemDescription?: string;
  }>;
  cdpNeighbors?: Array<{
    localPort: string;
    deviceId: string;
    portId: string;
    platform: string;
    capabilities?: string;
  }>;
  interfaces?: DeviceInterface[];
  dnsPtr?: string;
  dhcpLease?: {
    mac: string;
    ip: string;
    leaseExpires?: string;
    hostName?: string;
  };
  linkedCiId?: string;
  assetTag?: string;
  updatedAt?: string;
  evidenceDetails?: {
    sourceType?: string;
    detectedBy?: string;
    proof?: string;
    verifiedAt?: string;
  };
  status?: 'DISCOVERED' | 'DISCOVERY' | 'ASSET' | 'CI' | 'CMDB' | 'APPROVED' | 'REJECTED';
  pipelineStage?: DiscoveryPipelineStage;
  discoveryStage?: DiscoveryPipelineStage;
  matchingStatus?: 'UNMATCHED' | 'MATCHED_EXACT_MAC' | 'MATCHED_IP_ONLY' | 'MATCHED_HOSTNAME' | 'DUPLICATE_SUSPECT';
  matchedCi?: {
    id: string;
    code: string;
    name: string;
    type: string;
    matchReason: string;
  };
  confidence?: number;
  evidence?: RelationshipEvidence;
  suggestedDepartment?: string;
  suggestedLocation?: string;
  suggestedUser?: string;
  assetId?: string;
  ciId?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface ITBusinessService {
  id: string;
  tenantId: string;
  clientId: string;
  clientName: string;
  name: string;
  code: string; // e.g. "SRV-ERP-01"
  category: 'Negócio' | 'Infraestrutura' | 'Suporte' | 'Segurança';
  status: 'operacional' | 'atencao' | 'degradado' | 'indisponivel';
  slaHours: number;
  slaTargetPct: number;
  owner: string;
  affectedUsersCount: number;
  description: string;
  underlyingCiIds: string[];
  createdAt: string;
}

export interface CIHistoryEvent {
  id: string;
  tenantId: string;
  ciId: string;
  ciName: string;
  ciCode: string;
  date: string;
  action: 'CRIACAO' | 'ALTERACAO' | 'STATUS_CHANGE' | 'RELACIONAMENTO' | 'MANUTENCAO' | 'CHAMADO' | 'EVENTO_AGENTE' | 'AUDITORIA' | 'CONFIGURACAO';
  field?: string;
  oldValue?: string;
  newValue?: string;
  description: string;
  user: string;
  source: 'Web' | 'Agente' | 'API' | 'SNMP' | 'Sistema';
}

export interface CMDBTicketLink {
  id: string;
  ticketNumber: string;
  tenantId: string;
  ciId: string;
  ciCode: string;
  ciName: string;
  title: string;
  priority: 'urgente' | 'alta' | 'media' | 'baixa';
  status: 'aberto' | 'em_atendimento' | 'aguardando' | 'resolvido' | 'fechado';
  requester: string;
  assignedTechnician: string;
  createdAt: string;
  slaLimit: string;
  slaBreached: boolean;
}

export interface CMDBContractLink {
  id: string;
  contractCode: string;
  tenantId: string;
  name: string;
  supplier: string;
  startDate: string;
  endDate: string;
  slaHours: number;
  coverage: string;
  monthlyCost: number;
  linkedCiIds: string[];
}

export interface CMDBHealthScore {
  overallScore: number; // 0 - 100%
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  metrics: {
    completenessPct: number;
    relationshipsPct: number;
    assignedOwnersPct: number;
    assignedLocationsPct: number;
    contractsLinkedPct: number;
    activeMonitoringPct: number;
  };
  counts: {
    totalCIs: number;
    orphanedCIs: number;
    missingOwners: number;
    missingLocations: number;
    missingContracts: number;
    outdatedTelemetry: number;
  };
  recommendations: Array<{
    id: string;
    priority: 'alta' | 'media' | 'baixa';
    title: string;
    description: string;
    actionLabel: string;
  }>;
}

export interface ImpactAnalysisResult {
  targetCi: ConfigurationItem;
  impactLevel: 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO';
  simulationType: 'total_outage' | 'degraded_performance' | 'security_breach';
  summary: string;
  directDependents: ConfigurationItem[];
  indirectDependents: ConfigurationItem[];
  affectedServices: ITBusinessService[];
  affectedClients: string[];
  affectedUnits: string[];
  estimatedAffectedUsers: number;
  cascadePath: Array<{
    level: number;
    ciId: string;
    ciName: string;
    relationshipType: string;
    consequence: string;
  }>;
  recommendedActions: string[];
}

export type CMDBSubTab = 
  | 'overview'
  | 'cis'
  | 'assets'
  | 'services'
  | 'relationships'
  | 'topology'
  | 'dependencies'
  | 'history'
  | 'discovery'
  | 'import'
  | 'reports'
  | 'impact';

// =======================================================
// AGENT IDENTITY & AUTHENTICATION TYPES (ITIL / RMM)
// =======================================================

export interface AgentEnrollmentToken {
  id: string;
  tenantId: string;
  name: string;
  tokenPrefix: string;
  tokenHash: string; // SHA-256 hash, raw token is never stored permanently
  maxUses: number; // -1 for unlimited
  currentUses: number;
  status: 'active' | 'revoked' | 'expired';
  expiresAt: string;
  allowedSubnets?: string[];
  createdBy: string;
  createdAt: string;
  revokedAt?: string | null;
}

export interface AgentDeviceIdentity {
  agentId: string;
  deviceId: string; // Hardware UUID or persistent device identifier
  tenantId: string;
  ciId?: string;
  hostname: string;
  operatingSystem: string;
  osVersion?: string;
  macAddress: string;
  ipAddress: string;
  lastSeenIp?: string; // IP observed directly by the server
  agentVersion: string;
  status: 'active' | 'blocked' | 'revoked' | 'pending';
  tokenPrefix: string;
  tokenHash: string; // SHA-256 of individual device token
  tokenRotatedAt?: string | null;
  enrollmentTokenId?: string;
  enrolledAt: string;
  lastHeartbeatAt?: string | null;
  lastHeartbeatPayload?: any;
}

export interface AgentHeartbeatRecord {
  id: string;
  agentId: string;
  deviceId: string;
  tenantId: string;
  timestamp: string;
  agentVersion: string;
  operatingSystem: string;
  serverObservedIp: string;
  status: 'online' | 'degraded' | 'blocked';
  metrics?: {
    cpuUsagePct?: number;
    ramUsagePct?: number;
    diskUsagePct?: number;
    uptimeHours?: number;
    temperatureC?: number;
  };
}

export interface AgentAuditLog {
  id: string;
  tenantId: string;
  agentId?: string;
  deviceId?: string;
  action: 
    | 'ENROLLMENT_SUCCESS' 
    | 'ENROLLMENT_FAILED' 
    | 'AUTH_SUCCESS' 
    | 'AUTH_FAILED' 
    | 'TOKEN_ROTATED' 
    | 'AGENT_BLOCKED' 
    | 'AGENT_UNBLOCKED' 
    | 'AGENT_REVOKED' 
    | 'TOKEN_REVOKED';
  ipAddress: string;
  details: string;
  timestamp: string;
}

// =======================================================
// MULTIPLATFORM AUTOMATED INVENTORY & MODULAR COLLECTORS
// =======================================================

export type AgentPlatform = 'windows' | 'linux' | 'macos' | 'android';
export type InventoryType = 'full' | 'incremental';

// 1. Hardware Collector
export interface RamModule {
  slot: string;
  capacityMb: number | null;
  type: string | null; // DDR4, DDR5, LPDDR4X, etc.
  speedMhz: number | null;
  partNumber: string | null;
  manufacturer?: string | null;
}

export interface DiskDrive {
  name: string;
  model: string | null;
  type: 'SSD' | 'HDD' | 'NVMe' | 'eMMC' | 'UFS' | 'Virtual' | 'Não disponível' | null;
  capacityGb: number | null;
  usedGb: number | null;
  freeGb: number | null;
  mountPoint: string | null;
  fileSystem: string | null;
  serialNumber?: string | null;
}

export interface GpuDevice {
  name: string | null;
  vramMb: number | null;
  driverVersion: string | null;
  manufacturer?: string | null;
}

export interface MonitorDevice {
  model: string | null;
  manufacturer: string | null;
  serial: string | null;
  resolution: string | null;
  connectionType?: string | null;
}

export interface HardwareInventory {
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  serviceTag: string | null;
  systemUuid: string | null;
  cpu: {
    name: string | null;
    cores: number | null;
    threads: number | null;
    architecture: string | null;
    frequencyMhz: number | null;
  };
  ram: {
    totalMb: number | null;
    freeMb: number | null;
    modules: RamModule[];
  };
  disks: DiskDrive[];
  gpu: GpuDevice[];
  motherboard: {
    manufacturer: string | null;
    product: string | null;
    serial: string | null;
    version: string | null;
  } | null;
  bios: {
    vendor: string | null;
    version: string | null;
    releaseDate: string | null;
  } | null;
  tpm: {
    present: boolean | null;
    version: string | null;
    status: string | null;
  } | null;
  monitors: MonitorDevice[];
  battery: {
    present: boolean | null;
    healthPct: number | null;
    levelPct: number | null;
    isCharging: boolean | null;
  } | null;
}

// 2. OS Collector
export interface OperatingSystemInventory {
  osName: string;
  version: string;
  build: string | null;
  kernel: string | null;
  architecture: string;
  distribution: string | null;
  hostname: string;
  domain: string | null;
  workgroup: string | null;
  lastBootTime: string | null;
  uptimeHours: number | null;
  locale: string | null;
}

// 3. Software Collector
export interface InstalledSoftwareItem {
  name: string;
  version: string | null;
  publisher: string | null;
  installDate: string | null;
  architecture: string | null;
  installPath: string | null;
  sizeMb?: number | null;
}

// 4. Network Collector
export interface NetworkInterfaceInventory {
  name: string;
  macAddress: string;
  ipAddresses: string[];
  ipv6Addresses?: string[];
  isPhysical: boolean;
  status: 'up' | 'down' | 'unknown';
  speedMbps: number | null;
  gateway: string | null;
  dnsServers: string[];
  dhcpEnabled: boolean | null;
}

// 5. User Collector
export interface UserInventory {
  currentUser: string | null;
  loggedInUsers: string[];
  localUsersCount: number | null;
  userDomain?: string | null;
}

// 6. Security Collector
export interface SecurityInventory {
  antivirusName: string | null;
  antivirusStatus: string | null; // Ativo e Atualizado, etc.
  firewallEnabled: boolean | null;
  bitlockerOrEncryption: string | null; // Ativo (XTS-AES), Desativado, Não disponível
  uacOrSelinuxStatus: string | null; // Habilitado / Enforcing / Permissive
  secureBootEnabled?: boolean | null;
}

// Complete Device Inventory Snapshot
export interface DeviceInventorySnapshot {
  id: string;
  agentId: string;
  deviceId: string;
  tenantId: string;
  origin: 'AGENT';
  inventoryVersion: number;
  snapshotHash: string;
  inventoryType: InventoryType; // 'full' | 'incremental'
  platform: AgentPlatform;
  collectedAt: string; // Timestamp da coleta local no equipamento
  syncedAt: string;    // Timestamp do processamento no servidor
  hardware: HardwareInventory;
  os: OperatingSystemInventory;
  software: InstalledSoftwareItem[];
  network: NetworkInterfaceInventory[];
  user: UserInventory;
  security: SecurityInventory;
  changedFields?: string[]; // Campos modificados se incremental
  delta?: Record<string, any>; // Valores específicos modificados
}

// 7. Inventory Change Detection & Historic Tracking (PROMPT 4)
export type InventoryChangeEventType =
  | 'HARDWARE_CHANGED'
  | 'SOFTWARE_INSTALLED'
  | 'SOFTWARE_REMOVED'
  | 'SOFTWARE_UPDATED'
  | 'OS_CHANGED'
  | 'NETWORK_CHANGED'
  | 'USER_CHANGED'
  | 'IDENTITY_CHANGED'
  | 'SECURITY_CHANGED';

export type InventoryChangeCategory =
  | 'hardware'
  | 'software'
  | 'sistema operacional'
  | 'rede'
  | 'usuário'
  | 'segurança';

export interface InventoryChangeRecord {
  id: string;
  tenantId: string;
  tenant_id: string; // compatibility with prompt schema
  assetId: string;
  asset_id: string; // compatibility with prompt schema
  agentId: string;
  agent_id: string; // compatibility with prompt schema
  ciCode: string;
  ciName: string;
  eventType: InventoryChangeEventType;
  event_type: InventoryChangeEventType; // compatibility with prompt schema
  category: InventoryChangeCategory;
  field: string;
  oldValue: string;
  old_value: string; // compatibility with prompt schema
  newValue: string;
  new_value: string; // compatibility with prompt schema
  detectedAt: string;
  detected_at: string; // compatibility with prompt schema
  source: 'AGENT' | 'Agente RMM' | 'Sistema';
  metadata?: Record<string, any>;
}

export interface LiveDiscoveredDevice {
  ip: string;
  hostname: string;
  mac: string;
  vendor: string;
  status: 'ONLINE' | 'OFFLINE';
  responseTimeMs: number;
  openPorts: number[];
  services: { [port: number]: string };
  deviceType: CIType;
  hasSharedFolders: boolean;
  hasRdp: boolean;
  hasWeb: boolean;
  hasSsh: boolean;
  ttl?: number;
  lastSeen: string;
}

export interface LiveScanResult {
  scanId: string;
  targetRange: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalScanned: number;
  totalOnline: number;
  devices: LiveDiscoveredDevice[];
}


