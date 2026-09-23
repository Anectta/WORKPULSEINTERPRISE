import { ITAsset } from '../types';

export type DiscoveryStatus = 'DISCOVERED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'MERGED';

export type MatchingPriority = 'UUID' | 'SERIAL' | 'SERVICE_TAG' | 'MAC' | 'HOSTNAME_EVIDENCE';

export type DiscoveryMethod = 'AGENT' | 'NETWORK_SNMP' | 'ARP_PING' | 'WMI' | 'SSH' | 'DHCP' | 'MANUAL';

export interface DiscoveredHardwareChange {
  id: string;
  field: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  detectedAt: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface InventoryDiscoveredAsset {
  id: string;
  name: string; // ex: PC-023, PC-023-NOVO, SRV-APP-01
  brandModel: string; // ex: Dell Latitude 5420
  os: string; // ex: Windows 11 Pro 64-bit
  ram: string; // ex: 16 GB RAM
  ramBytes?: number;
  disk: string; // ex: SSD 512 GB
  diskBytes?: number;
  ipAddress: string; // ex: 192.168.1.25
  macAddress: string; // ex: 00:1A:2B:3C:4D:5E
  uuid: string; // ex: 4C4C4544-004A-5A10-8058-CAC04F543232
  serialNumber: string; // ex: SN-DELL-948201
  serviceTag?: string; // ex: 8XYZ123
  cpu?: string; // ex: Intel Core i7-1185G7 @ 3.00GHz
  category?: string; // ex: hardware_workstation, hardware_server, hardware_printer
  status: DiscoveryStatus;
  discoveryMethod: DiscoveryMethod;
  hasAgent: boolean;
  agentVersion?: string;
  agentStatus?: 'online' | 'offline';
  lastSeen: string;
  discoveredAt: string;
  assignedUser?: string;
  assignedDepartment?: string;
  location?: string;
  
  // Matching & Duplication
  matchedAssetId?: string;
  matchedAssetTag?: string;
  matchingPriorityUsed?: MatchingPriority;
  matchingConfidence?: number; // 0 - 100%
  matchingReason?: string;
  isDuplicateSuspect?: boolean;
  duplicatePairId?: string;
  duplicateTargetName?: string;
  duplicateTargetId?: string;
  duplicateSimilarityPct?: number; // ex: 94%

  // Alterações detectadas (Ativos Alterados)
  hasChanges?: boolean;
  changesDetected?: DiscoveredHardwareChange[];

  // Telemetria adicional
  telemetry?: {
    cpuUsagePct: number;
    ramUsagePct: number;
    diskUsagePct: number;
    uptimeHours: number;
    latencyMs?: number;
  };

  // Interfaces de Rede
  networkInterfaces?: Array<{
    name: string;
    ip: string;
    mac: string;
    type: 'Ethernet' | 'Wi-Fi' | 'Virtual';
    speedMbps?: number;
  }>;

  notes?: string;
}

export interface DiscoveryAlert {
  id: string;
  assetId?: string;
  assetName: string;
  assetTag?: string;
  type: 
    | 'CRITICAL_HARDWARE_DRIFT' 
    | 'RAM_CHANGED' 
    | 'DISK_CHANGED' 
    | 'ASSET_OFFLINE' 
    | 'UNAPPROVED_NEW_DEVICE' 
    | 'DUPLICATE_FOUND' 
    | 'NO_AGENT_DETECTED' 
    | 'IP_CONFLICT';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  actionRequired?: string;
}

export interface DuplicatePair {
  id: string;
  sourceAsset: InventoryDiscoveredAsset;
  targetAsset: ITAsset | InventoryDiscoveredAsset;
  similarityPct: number; // ex: 94
  matchedPriorities: MatchingPriority[];
  matchSummary: string;
  differences: Array<{
    field: string;
    label: string;
    sourceVal: string;
    targetVal: string;
    isIdentical: boolean;
  }>;
  status: 'PENDING' | 'MERGED' | 'KEPT_SEPARATE';
  resolvedAt?: string;
  resolutionNote?: string;
}
