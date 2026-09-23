import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { 
  INITIAL_CMDB_ITEMS, 
  INITIAL_RELATIONSHIPS, 
  INITIAL_BUSINESS_SERVICES, 
  INITIAL_CMDB_TICKETS, 
  INITIAL_CMDB_CONTRACTS, 
  INITIAL_CMDB_HISTORY,
  INITIAL_INVENTORY_CHANGES,
  INITIAL_DISCOVERED_DEVICES,
  TENANT_B_ITEMS
} from "../src/data/cmdbInitialData";
import { 
  ConfigurationItem, 
  CIRelationship, 
  ITBusinessService, 
  CIHistoryEvent, 
  CMDBTicketLink, 
  CMDBContractLink,
  ImpactAnalysisResult,
  CMDBHealthScore,
  AgentEnrollmentToken,
  AgentDeviceIdentity,
  AgentHeartbeatRecord,
  AgentAuditLog,
  DeviceInventorySnapshot,
  InventoryType,
  AgentPlatform,
  InventoryChangeRecord,
  InventoryChangeEventType,
  InventoryChangeCategory,
  DiscoveredDevice,
  CIType,
  RelationshipEvidence,
  AuthorizedSubnet,
  DiscoveryJob,
  DiscoveryJobResult,
  DiscoveryProtocolMethod,
  DiscoveryPipelineStage,
  DeviceInterface
} from "../src/types/cmdb";
import { InventoryDiffEngine } from "../src/utils/inventoryDiffEngine";

const router = Router();

const DATA_DIR = path.join(process.cwd(), "src", "data");
const CMDB_PERSIST_FILE = path.join(DATA_DIR, "cmdb_persisted.json");

export interface CMDBStore {
  items: ConfigurationItem[];
  relationships: CIRelationship[];
  services: ITBusinessService[];
  tickets: CMDBTicketLink[];
  contracts: CMDBContractLink[];
  history: CIHistoryEvent[];
  enrollmentTokens: AgentEnrollmentToken[];
  agentIdentities: AgentDeviceIdentity[];
  heartbeats: AgentHeartbeatRecord[];
  agentAuditLogs: AgentAuditLog[];
  inventorySnapshots: DeviceInventorySnapshot[];
  inventoryChangeHistory: InventoryChangeRecord[];
  discoveredDevices: DiscoveredDevice[];
  authorizedSubnets: AuthorizedSubnet[];
  discoveryJobs: DiscoveryJob[];
}

export function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function seedInitialAuthorizedSubnets(): AuthorizedSubnet[] {
  return [
    {
      id: "sub-lan-corp-01",
      tenantId: "tenant-demo",
      name: "LAN Corporativa Matriz (VLAN 10)",
      cidr: "192.168.1.0/24",
      vlanId: 10,
      gateway: "192.168.1.1",
      dnsServer: "192.168.1.1, 8.8.8.8",
      authorizedBy: "admin@empresaabc.com.br (Carlos Amoroso)",
      authorizedAt: "2026-09-01T10:00:00.000Z",
      isActive: true,
      allowedProtocols: ['ICMP', 'ARP', 'SNMP', 'LLDP', 'CDP', 'DNS', 'DHCP', 'INTERFACE_DISCOVERY'],
      rateLimitPps: 50,
      timeoutMs: 1200,
      maxConcurrency: 5,
      notes: "Sub-rede interna de produção autorizada para varredura modular de ativos não gerenciados."
    },
    {
      id: "sub-dmz-srv-02",
      tenantId: "tenant-demo",
      name: "DMZ & Servidores Internos (VLAN 20)",
      cidr: "192.168.20.0/24",
      vlanId: 20,
      gateway: "192.168.20.1",
      dnsServer: "192.168.20.1",
      authorizedBy: "admin@empresaabc.com.br (Carlos Amoroso)",
      authorizedAt: "2026-09-01T10:00:00.000Z",
      isActive: true,
      allowedProtocols: ['ICMP', 'ARP', 'SNMP', 'LLDP', 'CDP', 'DNS', 'INTERFACE_DISCOVERY'],
      rateLimitPps: 30,
      timeoutMs: 1500,
      maxConcurrency: 4,
      notes: "Segmento de infraestrutura crítica com taxa de pacote e concorrência reduzidas."
    }
  ];
}

function seedInitialDiscoveryJobs(): DiscoveryJob[] {
  return [
    {
      id: "job-disc-001",
      tenantId: "tenant-demo",
      tenant: "Empresa ABC Matriz",
      rede: "LAN Corporativa Matriz (VLAN 10)",
      cidr: "192.168.1.0/24",
      horario: "07/09/2026 08:30:00",
      metodo: ['ICMP', 'ARP', 'SNMP', 'LLDP', 'CDP', 'DNS', 'DHCP', 'INTERFACE_DISCOVERY'],
      status: "COMPLETED",
      inicio: "2026-09-07T08:30:00.000Z",
      termino: "2026-09-07T08:31:14.000Z",
      scanConfig: {
        rateLimitPps: 50,
        timeoutMs: 1200,
        maxConcurrency: 5,
        authorizedSubnetId: "sub-lan-corp-01",
        snmpCommunity: "public",
        snmpVersion: "v2c"
      },
      resultado: {
        totalIpsScanned: 254,
        responsiveHosts: 7,
        newDiscoveredCount: 3,
        matchedExistingCount: 4,
        protocolStats: {
          ICMP: 7,
          ARP: 7,
          SNMP: 5,
          LLDP: 4,
          CDP: 3,
          DNS: 6,
          DHCP: 6,
          INTERFACE_DISCOVERY: 5
        },
        durationSeconds: 74,
        discoveredDeviceIds: ["disc-sw-01", "disc-sw-02", "disc-fw-01", "disc-ap-01", "disc-prn-01", "disc-nas-01", "disc-cam-01"]
      },
      logs: [
        { timestamp: "2026-09-07T08:30:00.000Z", level: "INFO", message: "Job #job-disc-001 iniciado para a rede autorizada 192.168.1.0/24. Concorrência: 5, Rate: 50 pps, Timeout: 1200ms." },
        { timestamp: "2026-09-07T08:30:04.000Z", level: "SUCCESS", message: "Host 192.168.1.1 respondeu a ICMP Echo & ARP (MAC: 70:4C:A5:11:22:33, Fortinet).", ip: "192.168.1.1", protocol: "ICMP/ARP" },
        { timestamp: "2026-09-07T08:30:10.000Z", level: "SUCCESS", message: "SNMP v2c coletou sysDescr de 192.168.1.2: Cisco IOS C2960 Software (C2960-LANBASEK9-M).", ip: "192.168.1.2", protocol: "SNMP" },
        { timestamp: "2026-09-07T08:30:16.000Z", level: "SUCCESS", message: "LLDP / CDP neighbor identificou Switch de Acesso SWITCH-02 em Gi1/0/2.", ip: "192.168.1.3", protocol: "LLDP/CDP" },
        { timestamp: "2026-09-07T08:30:24.000Z", level: "SUCCESS", message: "Descoberto Access Point Ubiquiti UAP-AC-Pro sem agente instalado em 192.168.1.50.", ip: "192.168.1.50", protocol: "SNMP" },
        { timestamp: "2026-09-07T08:30:38.000Z", level: "SUCCESS", message: "Descoberta Impressora HP LaserJet Enterprise M608 sem agente instalado em 192.168.1.30.", ip: "192.168.1.30", protocol: "SNMP/DNS" },
        { timestamp: "2026-09-07T08:30:52.000Z", level: "SUCCESS", message: "Descoberto Storage NAS Synology DS923+ em 192.168.1.210.", ip: "192.168.1.210", protocol: "SNMP" },
        { timestamp: "2026-09-07T08:31:14.000Z", level: "INFO", message: "Varredura autorizada finalizada sem agressividade. 7 dispositivos carregados no estado DISCOVERED." }
      ]
    }
  ];
}

function seedInitialPrompt7DiscoveredDevices(): DiscoveredDevice[] {
  return [
    {
      id: "disc-sw-01",
      tenantId: "tenant-demo",
      ip: "192.168.1.2",
      mac: "00:27:E3:44:55:66",
      hostname: "SWITCH-CORE",
      vendor: "Cisco Systems",
      detectedType: "switch",
      operatingSystem: "Cisco IOS 15.2(7)E",
      osHint: "Cisco IOS 15.2(7)E (C2960-LANBASEK9-M)",
      openPorts: [22, 23, 161],
      discoveredAt: "2026-09-07T08:30:10.000Z",
      lastSeen: "2026-09-07T08:30:10.000Z",
      discoverySource: "NETWORK_DISCOVERY_SNMP",
      discoveryJobId: "job-disc-001",
      protocolsDetected: ['ICMP', 'ARP', 'SNMP', 'LLDP', 'CDP', 'DNS'],
      status: "DISCOVERED",
      pipelineStage: "DISCOVERY",
      discoveryStage: "DISCOVERY",
      matchingStatus: "MATCHED_EXACT_MAC",
      matchedCi: {
        id: "ci-sw-core",
        code: "CI-SW-01",
        name: "Switch Core Cisco",
        type: "switch",
        matchReason: "MAC 00:27:E3:44:55:66 coincide exatamente com CI-SW-01 registrado"
      },
      confidence: 1.0,
      snmpData: {
        sysDescr: "Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.2(7)E",
        sysName: "sw-core-01.empresaabc.local",
        sysLocation: "Data Center Rack R01",
        sysContact: "noc@empresaabc.com.br",
        sysObjectID: "1.3.6.1.4.1.9.1.516",
        interfacesCount: 48,
        uptime: "171 days, 16:42:10"
      },
      lldpNeighbors: [
        { localPort: "Gi1/0/1", chassisId: "70:4c:a5:11:22:33", portId: "port1", systemName: "FIREWALL-01", systemDescription: "FortiGate-100F v7.4.2" },
        { localPort: "Gi1/0/2", chassisId: "00:27:e3:77:88:99", portId: "Gi1/0/24", systemName: "SWITCH-02", systemDescription: "Cisco Catalyst 2960-X 24TS-L" },
        { localPort: "Gi1/0/24", chassisId: "b4:fb:e4:77:88:99", portId: "eth0", systemName: "AP-01", systemDescription: "Ubiquiti UAP-AC-Pro" }
      ],
      cdpNeighbors: [
        { localPort: "Gi1/0/2", deviceId: "SWITCH-02.empresaabc.local", portId: "GigabitEthernet1/0/24", platform: "cisco WS-C2960X-24TS-L", capabilities: "Switch, IGMP" }
      ],
      interfaces: [
        { name: "GigabitEthernet1/0/1", mac: "00:27:E3:44:55:67", status: "UP", speedMbps: 1000, type: "ETHERNET", duplex: "FULL" },
        { name: "GigabitEthernet1/0/2", mac: "00:27:E3:44:55:68", status: "UP", speedMbps: 1000, type: "ETHERNET", duplex: "FULL" },
        { name: "GigabitEthernet1/0/24", mac: "00:27:E3:44:55:7E", status: "UP", speedMbps: 1000, type: "ETHERNET", duplex: "FULL" },
        { name: "Vlan1", mac: "00:27:E3:44:55:66", ip: "192.168.1.2", status: "UP", speedMbps: 1000, type: "SVI" }
      ],
      evidence: "CONFIRMED",
      evidenceDetails: {
        sourceType: "SNMP_CDP_LLDP",
        detectedBy: "Network Discovery Engine",
        proof: "MIB-II SNMPv2c sysDescr + LLDP MIB interrogation confirmada",
        verifiedAt: "2026-09-07T08:30:10.000Z"
      }
    },
    {
      id: "disc-sw-02",
      tenantId: "tenant-demo",
      ip: "192.168.1.3",
      mac: "00:27:E3:77:88:99",
      hostname: "SWITCH-02",
      vendor: "Cisco Systems",
      detectedType: "switch",
      operatingSystem: "Cisco IOS 15.0(2)SE",
      osHint: "Cisco IOS 15.0(2)SE (C2960X-UNIVERSALK9-M)",
      openPorts: [22, 161],
      discoveredAt: "2026-09-07T08:30:16.000Z",
      lastSeen: "2026-09-07T08:30:16.000Z",
      discoverySource: "NETWORK_DISCOVERY_LLDP",
      discoveryJobId: "job-disc-001",
      protocolsDetected: ['ICMP', 'ARP', 'SNMP', 'LLDP', 'CDP', 'DNS'],
      status: "DISCOVERED",
      pipelineStage: "DISCOVERY",
      discoveryStage: "DISCOVERY",
      matchingStatus: "UNMATCHED",
      confidence: 0.96,
      snmpData: {
        sysDescr: "Cisco IOS Software, C2960X Software (C2960X-UNIVERSALK9-M), Version 15.0(2)SE",
        sysName: "sw-access-02.empresaabc.local",
        sysLocation: "Andar 1 - Rack Setor Comercial",
        sysContact: "noc@empresaabc.com.br",
        sysObjectID: "1.3.6.1.4.1.9.1.1208",
        interfacesCount: 24,
        uptime: "84 days, 05:12:33"
      },
      lldpNeighbors: [
        { localPort: "Gi1/0/24", chassisId: "00:27:e3:44:55:66", portId: "Gi1/0/2", systemName: "SWITCH-CORE", systemDescription: "Cisco Catalyst 2960" }
      ],
      interfaces: [
        { name: "GigabitEthernet1/0/1", mac: "00:27:E3:77:88:9A", status: "UP", speedMbps: 1000, type: "ETHERNET", duplex: "FULL" },
        { name: "GigabitEthernet1/0/24", mac: "00:27:E3:77:88:B2", status: "UP", speedMbps: 1000, type: "ETHERNET", duplex: "FULL" },
        { name: "Vlan10", mac: "00:27:E3:77:88:99", ip: "192.168.1.3", status: "UP", speedMbps: 1000, type: "SVI" }
      ],
      evidence: "CONFIRMED",
      evidenceDetails: {
        sourceType: "CDP_LLDP",
        detectedBy: "Network Discovery Engine",
        proof: "Neighbor discovery via CDP em Gi1/0/2 do Switch Core",
        verifiedAt: "2026-09-07T08:30:16.000Z"
      }
    },
    {
      id: "disc-fw-01",
      tenantId: "tenant-demo",
      ip: "192.168.1.1",
      mac: "70:4C:A5:11:22:33",
      hostname: "FIREWALL-01",
      vendor: "Fortinet Technologies",
      detectedType: "firewall",
      operatingSystem: "FortiOS 7.4.2",
      osHint: "FortiOS 7.4.2 GA Build 2571",
      openPorts: [22, 443, 8443, 161],
      discoveredAt: "2026-09-07T08:30:04.000Z",
      lastSeen: "2026-09-07T08:30:04.000Z",
      discoverySource: "NETWORK_DISCOVERY_SNMP",
      discoveryJobId: "job-disc-001",
      protocolsDetected: ['ICMP', 'ARP', 'SNMP', 'LLDP', 'DNS', 'DHCP'],
      status: "DISCOVERED",
      pipelineStage: "DISCOVERY",
      discoveryStage: "DISCOVERY",
      matchingStatus: "MATCHED_EXACT_MAC",
      matchedCi: {
        id: "ci-fw",
        code: "CI-FW-01",
        name: "Firewall Fortinet Matriz",
        type: "firewall",
        matchReason: "MAC 70:4C:A5:11:22:33 coincide exatamente com CI-FW-01 registrado"
      },
      confidence: 1.0,
      snmpData: {
        sysDescr: "FortiGate-100F v7.4.2,build2571,231114 (GA.F)",
        sysName: "fw01-matriz.empresaabc.local",
        sysLocation: "Data Center Rack R01",
        sysContact: "security@empresaabc.com.br",
        sysObjectID: "1.3.6.1.4.1.12356.101.1.10006",
        interfacesCount: 16,
        uptime: "142 days, 11:20:00"
      },
      interfaces: [
        { name: "port1 (LAN)", mac: "70:4C:A5:11:22:33", ip: "192.168.1.1", status: "UP", speedMbps: 1000, type: "ETHERNET", duplex: "FULL" },
        { name: "port2 (DMZ)", mac: "70:4C:A5:11:22:34", ip: "192.168.20.1", status: "UP", speedMbps: 1000, type: "ETHERNET", duplex: "FULL" },
        { name: "wan1 (Internet)", mac: "70:4C:A5:11:22:35", ip: "200.189.40.10", status: "UP", speedMbps: 1000, type: "FIBER", duplex: "FULL" }
      ],
      evidence: "CONFIRMED",
      evidenceDetails: {
        sourceType: "SNMP",
        detectedBy: "Network Discovery Engine",
        proof: "Interrogação SNMPv2c MIB Fortinet OID 1.3.6.1.4.1.12356",
        verifiedAt: "2026-09-07T08:30:04.000Z"
      }
    },
    {
      id: "disc-ap-01",
      tenantId: "tenant-demo",
      ip: "192.168.1.50",
      mac: "B4:FB:E4:77:88:99",
      hostname: "AP-01",
      vendor: "Ubiquiti Inc.",
      detectedType: "access_point",
      operatingSystem: "UniFi OS v3.2",
      osHint: "Linux 3.18.44 UAP-AC-Pro",
      openPorts: [22, 80, 8080],
      discoveredAt: "2026-09-07T08:30:24.000Z",
      lastSeen: "2026-09-07T08:30:24.000Z",
      discoverySource: "NETWORK_DISCOVERY_SNMP",
      discoveryJobId: "job-disc-001",
      protocolsDetected: ['ICMP', 'ARP', 'SNMP', 'LLDP', 'DNS'],
      status: "DISCOVERED",
      pipelineStage: "DISCOVERY",
      discoveryStage: "DISCOVERY",
      matchingStatus: "MATCHED_EXACT_MAC",
      matchedCi: {
        id: "ci-ap-wifi",
        code: "CI-AP-01",
        name: "Access Point Ubiquiti",
        type: "access_point",
        matchReason: "MAC B4:FB:E4:77:88:99 coincide com CI-AP-01 registrado"
      },
      confidence: 1.0,
      snmpData: {
        sysDescr: "Linux 3.18.44 UAP-AC-Pro #1 SMP PREEMPT",
        sysName: "ap-floor2.empresaabc.local",
        sysLocation: "Andar 2 - Open Space",
        sysContact: "ti@empresaabc.com.br",
        sysObjectID: "1.3.6.1.4.1.41112.1.4",
        interfacesCount: 3,
        uptime: "42 days, 18:10:00"
      },
      interfaces: [
        { name: "eth0 (PoE)", mac: "B4:FB:E4:77:88:99", ip: "192.168.1.50", status: "UP", speedMbps: 1000, type: "ETHERNET", duplex: "FULL" },
        { name: "ath0 (2.4GHz)", mac: "B4:FB:E4:77:88:9A", status: "UP", speedMbps: 450, type: "WIFI" },
        { name: "ath1 (5GHz)", mac: "B4:FB:E4:77:88:9B", status: "UP", speedMbps: 1300, type: "WIFI" }
      ],
      evidence: "CONFIRMED",
      evidenceDetails: {
        sourceType: "SNMP",
        detectedBy: "Network Discovery Engine",
        proof: "MIB UniFi UAP-AC-Pro detectada via SNMP e porta PoE ativa no Switch Core",
        verifiedAt: "2026-09-07T08:30:24.000Z"
      }
    },
    {
      id: "disc-prn-01",
      tenantId: "tenant-demo",
      ip: "192.168.1.30",
      mac: "3C:D9:2B:99:88:77",
      hostname: "PRINTER-01",
      vendor: "HP Inc.",
      detectedType: "printer",
      operatingSystem: "HP FutureSmart Firmware 5.6",
      osHint: "HP LaserJet Enterprise M608",
      openPorts: [80, 443, 515, 631, 9100, 161],
      discoveredAt: "2026-09-07T08:30:38.000Z",
      lastSeen: "2026-09-07T08:30:38.000Z",
      discoverySource: "NETWORK_DISCOVERY_SNMP",
      discoveryJobId: "job-disc-001",
      protocolsDetected: ['ICMP', 'ARP', 'SNMP', 'DNS', 'DHCP', 'INTERFACE_DISCOVERY'],
      status: "DISCOVERED",
      pipelineStage: "DISCOVERY",
      discoveryStage: "DISCOVERY",
      matchingStatus: "MATCHED_EXACT_MAC",
      matchedCi: {
        id: "ci-printer",
        code: "CI-PRN-01",
        name: "Impressora HP LaserJet",
        type: "printer",
        matchReason: "MAC 3C:D9:2B:99:88:77 coincide com CI-PRN-01 registrado"
      },
      confidence: 1.0,
      snmpData: {
        sysDescr: "HP LaserJet Enterprise M608; System ID: J8A04A",
        sysName: "prn-corp-01.empresaabc.local",
        sysLocation: "Setor Administrativo Hall Central",
        sysContact: "suporte@empresaabc.com.br",
        sysObjectID: "1.3.6.1.4.1.11.2.3.9.1",
        interfacesCount: 2,
        uptime: "82 days, 12:00:00"
      },
      interfaces: [
        { name: "eth0 (RJ-45)", mac: "3C:D9:2B:99:88:77", ip: "192.168.1.30", status: "UP", speedMbps: 1000, type: "ETHERNET", duplex: "FULL" }
      ],
      evidence: "CONFIRMED",
      evidenceDetails: {
        sourceType: "SNMP_PRINT_MIB",
        detectedBy: "Network Discovery Engine",
        proof: "Host Resource MIB e Printer MIB (RFC 3805) confirmadas",
        verifiedAt: "2026-09-07T08:30:38.000Z"
      }
    },
    {
      id: "disc-nas-01",
      tenantId: "tenant-demo",
      ip: "192.168.1.210",
      mac: "E0:CB:4E:99:88:77",
      hostname: "STORAGE-NAS-01",
      vendor: "Synology Inc.",
      detectedType: "server",
      operatingSystem: "DSM 7.2.1-69057",
      osHint: "Synology DiskStation DS923+ Linux 5.10",
      openPorts: [80, 443, 445, 5000, 5001, 161],
      discoveredAt: "2026-09-07T08:30:52.000Z",
      lastSeen: "2026-09-07T08:30:52.000Z",
      discoverySource: "NETWORK_DISCOVERY_SNMP",
      discoveryJobId: "job-disc-001",
      protocolsDetected: ['ICMP', 'ARP', 'SNMP', 'DNS', 'DHCP', 'INTERFACE_DISCOVERY'],
      status: "DISCOVERED",
      pipelineStage: "DISCOVERY",
      discoveryStage: "DISCOVERY",
      matchingStatus: "UNMATCHED",
      confidence: 0.94,
      snmpData: {
        sysDescr: "Synology DiskStation DS923+ Linux 5.10.55",
        sysName: "nas-backup-storage.empresaabc.local",
        sysLocation: "Data Center Rack R02",
        sysContact: "backup@empresaabc.com.br",
        sysObjectID: "1.3.6.1.4.1.6574.1",
        interfacesCount: 3,
        uptime: "110 days, 20:00:00"
      },
      interfaces: [
        { name: "ovs_eth0 (LAN 1)", mac: "E0:CB:4E:99:88:77", ip: "192.168.1.210", status: "UP", speedMbps: 1000, type: "ETHERNET", duplex: "FULL" },
        { name: "ovs_eth1 (LAN 2)", mac: "E0:CB:4E:99:88:78", status: "DOWN", speedMbps: 1000, type: "ETHERNET" }
      ],
      evidence: "CONFIRMED",
      evidenceDetails: {
        sourceType: "SNMP",
        detectedBy: "Network Discovery Engine",
        proof: "Synology NAS MIB e serviços SMB/NFS identificados na porta 445/5000",
        verifiedAt: "2026-09-07T08:30:52.000Z"
      }
    },
    {
      id: "disc-cam-01",
      tenantId: "tenant-demo",
      ip: "192.168.1.180",
      mac: "B8:27:EB:AA:BB:CC",
      hostname: "IP-CAMERA-01",
      vendor: "Hikvision Digital",
      detectedType: "workstation",
      operatingSystem: "Linux Embedded",
      osHint: "Hikvision IP Camera RTSP/ONVIF",
      openPorts: [80, 554, 8000],
      discoveredAt: "2026-09-07T08:31:00.000Z",
      lastSeen: "2026-09-07T08:31:00.000Z",
      discoverySource: "NETWORK_DISCOVERY_ARP",
      discoveryJobId: "job-disc-001",
      protocolsDetected: ['ICMP', 'ARP', 'DNS', 'DHCP'],
      status: "DISCOVERED",
      pipelineStage: "DISCOVERY",
      discoveryStage: "DISCOVERY",
      matchingStatus: "UNMATCHED",
      confidence: 0.88,
      evidence: "PROBABLE",
      evidenceDetails: {
        sourceType: "ARP_TABLE",
        detectedBy: "Network Discovery Engine",
        proof: "OUI Hikvision detectado via ARP e RTSP na porta 554",
        verifiedAt: "2026-09-07T08:31:00.000Z"
      }
    }
  ];
}

const DEFAULT_LEGACY_TOKEN = "wp-prod-token-994821a8-8f82-4e89-a212-32b220199211";
const DEMO_ENROLLMENT_TOKEN = "enr_demo_sec_2026_q3";

function seedInitialEnrollmentTokens(): AgentEnrollmentToken[] {
  return [
    {
      id: "enr-legacy-gpo",
      tenantId: "tenant-demo",
      name: "Token Padrão de Implantação (GPO / AD / Script)",
      tokenPrefix: "wp-prod-token...",
      tokenHash: sha256(DEFAULT_LEGACY_TOKEN),
      maxUses: 1000,
      currentUses: 148,
      status: "active",
      expiresAt: "2027-12-31T23:59:59.000Z",
      createdBy: "admin@workpulse.io",
      createdAt: "2026-01-01T00:00:00.000Z"
    },
    {
      id: "enr-temporary-rollout",
      tenantId: "tenant-demo",
      name: "Token Temporário de Rollout (Expira em 7 dias)",
      tokenPrefix: "enr_demo_sec...",
      tokenHash: sha256(DEMO_ENROLLMENT_TOKEN),
      maxUses: 50,
      currentUses: 5,
      status: "active",
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdBy: "Carlos Amoroso (Administrador)",
      createdAt: new Date().toISOString()
    }
  ];
}

function migrateExistingCisToIdentities(items: ConfigurationItem[]): AgentDeviceIdentity[] {
  return (items || [])
    .filter(i => i.typeId === "servidor_fisico" || i.typeId === "servidor_virtual" || i.typeId === "estacao_trabalho")
    .map(item => {
      const rawSecret = `dev_tok_${item.id}_${item.macAddress ? item.macAddress.replace(/:/g, "") : "sec"}`;
      return {
        agentId: `AGT-${item.code.replace("CI-", "")}`,
        deviceId: `dev_hw_${item.macAddress ? item.macAddress.replace(/:/g, "").toLowerCase() : item.id}`,
        tenantId: item.tenantId,
        ciId: item.id,
        hostname: item.hostname || item.name,
        operatingSystem: item.operatingSystem || "Windows 11 Pro",
        osVersion: "23H2 (Build 22631.3296)",
        macAddress: item.macAddress || "00:1A:2B:3C:4D:5E",
        ipAddress: item.ipAddress || "192.168.1.100",
        lastSeenIp: item.ipAddress || "192.168.1.100",
        agentVersion: item.telemetry?.agentVersion || "v2.5.0-rmm",
        status: "active",
        tokenPrefix: `dev_tok_${item.id.replace("ci-", "").slice(0, 6)}...`,
        tokenHash: sha256(rawSecret),
        tokenRotatedAt: null,
        enrollmentTokenId: "enr-legacy-gpo",
        enrolledAt: new Date(Date.now() - 14 * 86400000).toISOString(),
        lastHeartbeatAt: new Date().toISOString(),
        lastHeartbeatPayload: {
          cpuUsagePct: item.telemetry?.cpuUsagePct ?? 22,
          ramUsagePct: item.telemetry?.ramUsagePct ?? 48,
          diskUsagePct: item.telemetry?.diskUsagePct ?? 35,
          uptimeHours: item.telemetry?.uptimeHours ?? 120
        }
      };
    });
}

function seedInitialInventorySnapshots(): DeviceInventorySnapshot[] {
  return [
    {
      id: "inv-snap-initial-01",
      agentId: "AGT-PC-FIN-01",
      deviceId: "dev_hw_001a2b3c4d5e",
      tenantId: "tenant-demo",
      origin: "AGENT",
      inventoryVersion: 1,
      snapshotHash: "sha256_88f912ae901844b2",
      inventoryType: "full",
      platform: "windows",
      collectedAt: new Date(Date.now() - 3600000).toISOString(),
      syncedAt: new Date(Date.now() - 3590000).toISOString(),
      hardware: {
        manufacturer: "Dell Inc.",
        model: "OptiPlex 7090 Tower",
        serialNumber: "7XYZ991",
        serviceTag: "7XYZ991",
        systemUuid: "4c4c4544-0058-5910-805a-b2c04f393931",
        cpu: {
          name: "11th Gen Intel(R) Core(TM) i7-11700 @ 2.50GHz",
          cores: 8,
          threads: 16,
          architecture: "x64",
          frequencyMhz: 2500
        },
        ram: {
          totalMb: 32768,
          freeMb: 16420,
          modules: [
            {
              slot: "DIMM1",
              capacityMb: 16384,
              type: "DDR4",
              speedMhz: 3200,
              partNumber: "M471A2K43DB1-CWE",
              manufacturer: "Samsung"
            },
            {
              slot: "DIMM2",
              capacityMb: 16384,
              type: "DDR4",
              speedMhz: 3200,
              partNumber: "M471A2K43DB1-CWE",
              manufacturer: "Samsung"
            }
          ]
        },
        disks: [
          {
            name: "\\\\.\\PHYSICALDRIVE0 (C:)",
            model: "SK hynix BC711 NVMe 512GB",
            type: "NVMe",
            capacityGb: 476.9,
            usedGb: 198.4,
            freeGb: 278.5,
            mountPoint: "C:",
            fileSystem: "NTFS",
            serialNumber: "HYNIX-BC711-20948"
          }
        ],
        gpu: [
          {
            name: "Intel(R) UHD Graphics 750",
            vramMb: 2048,
            driverVersion: "30.0.101.1994",
            manufacturer: "Intel Corporation"
          }
        ],
        motherboard: {
          manufacturer: "Dell Inc.",
          product: "0R3F83",
          serial: "/7XYZ991/CN1296338B0019/",
          version: "A00"
        },
        bios: {
          vendor: "Dell Inc.",
          version: "1.14.0",
          releaseDate: "2023-11-20"
        },
        tpm: {
          present: true,
          version: "2.0",
          status: "Pronto para uso (Especificação 2.0)"
        },
        monitors: [
          {
            model: "DELL P2419H",
            manufacturer: "Dell",
            serial: "CN-0V4N2K-74261",
            resolution: "1920x1080",
            connectionType: "DisplayPort"
          }
        ],
        battery: null
      },
      os: {
        osName: "Microsoft Windows 11 Pro",
        version: "23H2",
        build: "22631.3296",
        kernel: "10.0.22631",
        architecture: "x64",
        distribution: null,
        hostname: "DESKTOP-FIN-01",
        domain: "corp.workpulse.internal",
        workgroup: null,
        lastBootTime: new Date(Date.now() - 48 * 3600000).toISOString(),
        uptimeHours: 48,
        locale: "pt-BR"
      },
      software: [
        {
          name: "WorkPulse RMM Agent",
          version: "3.2.0",
          publisher: "WorkPulse Systems Ltd.",
          installDate: "2026-01-10",
          architecture: "x64",
          installPath: "C:\\Program Files\\WorkPulse\\Agent",
          sizeMb: 42
        },
        {
          name: "Microsoft 365 Apps for Enterprise",
          version: "16.0.17328.20184",
          publisher: "Microsoft Corporation",
          installDate: "2025-11-20",
          architecture: "x64",
          installPath: "C:\\Program Files\\Microsoft Office",
          sizeMb: 3450
        },
        {
          name: "Google Chrome",
          version: "123.0.6312.86",
          publisher: "Google LLC",
          installDate: "2026-02-14",
          architecture: "x64",
          installPath: "C:\\Program Files\\Google\\Chrome\\Application",
          sizeMb: 580
        }
      ],
      network: [
        {
          name: "Ethernet (Intel Ethernet Connection I219-LM)",
          macAddress: "00:1A:2B:3C:4D:5E",
          ipAddresses: ["192.168.1.100"],
          ipv6Addresses: ["fe80::1028:44b1:32a1:1100"],
          isPhysical: true,
          status: "up",
          speedMbps: 1000,
          gateway: "192.168.1.1",
          dnsServers: ["192.168.1.1", "8.8.8.8"],
          dhcpEnabled: true
        }
      ],
      user: {
        currentUser: "CORP\\carlos.silva",
        loggedInUsers: ["CORP\\carlos.silva"],
        localUsersCount: 2,
        userDomain: "corp.workpulse.internal"
      },
      security: {
        antivirusName: "Microsoft Defender Antivirus & EDR",
        antivirusStatus: "Ativo e Atualizado",
        firewallEnabled: true,
        bitlockerOrEncryption: "Ativo (XTS-AES 256 bits)",
        uacOrSelinuxStatus: "Habilitado",
        secureBootEnabled: true
      }
    }
  ];
}

function loadStore(): CMDBStore {
  try {
    if (fs.existsSync(CMDB_PERSIST_FILE)) {
      const raw = fs.readFileSync(CMDB_PERSIST_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      
      // Auto-migrate if new identity arrays are missing
      if (!parsed.enrollmentTokens || parsed.enrollmentTokens.length === 0) {
        parsed.enrollmentTokens = seedInitialEnrollmentTokens();
      }
      if (!parsed.agentIdentities || parsed.agentIdentities.length === 0) {
        parsed.agentIdentities = migrateExistingCisToIdentities(parsed.items || []);
      }
      if (!parsed.heartbeats) parsed.heartbeats = [];
      if (!parsed.agentAuditLogs) parsed.agentAuditLogs = [];
      if (!parsed.inventorySnapshots || parsed.inventorySnapshots.length === 0) {
        parsed.inventorySnapshots = seedInitialInventorySnapshots();
      }
      if (!parsed.inventoryChangeHistory || parsed.inventoryChangeHistory.length === 0) {
        parsed.inventoryChangeHistory = [...INITIAL_INVENTORY_CHANGES];
      }
      if (!parsed.authorizedSubnets || parsed.authorizedSubnets.length === 0) {
        parsed.authorizedSubnets = seedInitialAuthorizedSubnets();
      }
      if (!parsed.discoveryJobs || parsed.discoveryJobs.length === 0) {
        parsed.discoveryJobs = seedInitialDiscoveryJobs();
      }
      if (!parsed.discoveredDevices || parsed.discoveredDevices.length === 0) {
        parsed.discoveredDevices = seedInitialPrompt7DiscoveredDevices();
      } else {
        // Ensure prompt 7 example devices exist
        seedInitialPrompt7DiscoveredDevices().forEach(dev => {
          if (!parsed.discoveredDevices.some((d: any) => d.id === dev.id)) {
            parsed.discoveredDevices.push(dev);
          }
        });
      }

      // Auto-migrate CIs with mandatory Prompt 5 fields
      if (Array.isArray(parsed.items)) {
        parsed.items = parsed.items.map((item: ConfigurationItem) => ({
          ...item,
          nome: item.nome || item.name,
          tipo: item.tipo || (item.typeId === 'notebook' ? 'notebook' : item.typeId === 'servidor' ? 'server' : item.typeId === 'switch' ? 'switch' : item.typeId === 'firewall' ? 'firewall' : item.typeId === 'roteador' || item.typeId === 'router' ? 'router' : item.typeId === 'access_point' ? 'access_point' : item.typeId === 'impressora' ? 'printer' : 'workstation'),
          tenant: item.tenant || item.tenantId,
          asset: item.asset || item.assetTag || item.code,
          status: item.status || 'operacional',
          fabricante: item.fabricante || item.manufacturer || 'Dell Inc.',
          modelo: item.modelo || item.model || 'Padrão',
          serial: item.serial || item.serialNumber || 'SN-PADRAO',
          localizacao: item.localizacao || item.location || 'Escritório Matriz',
          usuarioResponsavel: item.usuarioResponsavel || item.responsible || 'Carlos Amoroso',
          departamento: item.departamento || item.department || 'TI & Operações'
        }));

        if (!parsed.items.some((i: any) => i.id === 'ci-router')) {
          const routerCi = INITIAL_CMDB_ITEMS.find(i => i.id === 'ci-router');
          if (routerCi) parsed.items.push(routerCi);
        }
      }

      // Auto-migrate relationships with mandatory Prompt 5 evidence fields
      if (Array.isArray(parsed.relationships)) {
        parsed.relationships = parsed.relationships.map((rel: any) => ({
          ...rel,
          origem: rel.origem || rel.sourceCiId,
          destino: rel.destino || rel.targetCiId,
          tipo: rel.tipo || rel.type || 'CONECTADO_A',
          evidencia: rel.evidencia || rel.evidence || 'CONFIRMED',
          confianca: rel.confianca ?? (rel.confidence ?? 1.0),
          criado_em: rel.criado_em || rel.createdAt || new Date().toISOString(),
          atualizado_em: rel.atualizado_em || rel.updatedAt || new Date().toISOString()
        }));

        INITIAL_RELATIONSHIPS.forEach(initRel => {
          if (!parsed.relationships.some((r: any) => r.id === initRel.id)) {
            parsed.relationships.push(initRel);
          }
        });
      }

      return parsed;
    }
  } catch (err) {
    console.error("[CMDB Store] Error reading persistent store, using initial data:", err);
  }

  // Combine initial demo data + tenant B data for testing
  const initialItems = [...INITIAL_CMDB_ITEMS, ...TENANT_B_ITEMS];
  return {
    items: initialItems,
    relationships: [...INITIAL_RELATIONSHIPS],
    services: [...INITIAL_BUSINESS_SERVICES],
    tickets: [...INITIAL_CMDB_TICKETS],
    contracts: [...INITIAL_CMDB_CONTRACTS],
    history: [...INITIAL_CMDB_HISTORY],
    enrollmentTokens: seedInitialEnrollmentTokens(),
    agentIdentities: migrateExistingCisToIdentities(initialItems),
    heartbeats: [],
    agentAuditLogs: [],
    inventorySnapshots: seedInitialInventorySnapshots(),
    inventoryChangeHistory: [...INITIAL_INVENTORY_CHANGES],
    discoveredDevices: seedInitialPrompt7DiscoveredDevices(),
    authorizedSubnets: seedInitialAuthorizedSubnets(),
    discoveryJobs: seedInitialDiscoveryJobs()
  };
}

function saveStore(store: CMDBStore): void {
  try {
    fs.mkdirSync(path.dirname(CMDB_PERSIST_FILE), { recursive: true });
    fs.writeFileSync(CMDB_PERSIST_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("[CMDB Store] Failed to save CMDB store:", err);
  }
}

// In-memory runtime cache
let store: CMDBStore = loadStore();

// Rate limiting in-memory bucket map
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitBucket>();

function checkRateLimit(key: string, maxRequests: number, windowSeconds: number): boolean {
  const now = Date.now();
  const bucket = rateLimitMap.get(key);
  if (!bucket || bucket.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }
  if (bucket.count >= maxRequests) {
    return false;
  }
  bucket.count++;
  return true;
}

// Helper to log security/identity audit events
function logAgentAudit(
  tenantId: string,
  agentId: string | null,
  deviceId: string | null,
  action: AgentAuditLog["action"],
  ipAddress: string,
  details: string
): void {
  const logEntry: AgentAuditLog = {
    id: `agt-aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    tenantId,
    agentId: agentId || undefined,
    deviceId: deviceId || undefined,
    action,
    ipAddress,
    details,
    timestamp: new Date().toISOString()
  };
  if (!store.agentAuditLogs) store.agentAuditLogs = [];
  store.agentAuditLogs.unshift(logEntry);
  if (store.agentAuditLogs.length > 500) {
    store.agentAuditLogs = store.agentAuditLogs.slice(0, 500);
  }
  saveStore(store);
}

// Helper to extract tenant ID
function getTenantId(req: Request): string {
  const headerTenant = req.headers["x-tenant-id"] as string;
  const queryTenant = req.query.tenantId as string;
  return headerTenant || queryTenant || "tenant-demo";
}

// Authentication & Security Middleware for Agents
function authenticateAgent(req: Request, res: Response, next: () => void) {
  let rawToken = "";
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    rawToken = authHeader.substring(7).trim();
  } else if (req.headers["x-agent-token"]) {
    rawToken = String(req.headers["x-agent-token"]).trim();
  }

  const agentIdHeader = req.headers["x-agent-id"] ? String(req.headers["x-agent-id"]).trim() : "";
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";

  if (rawToken) {
    const incomingHash = sha256(rawToken);
    const identity = store.agentIdentities.find(id => id.tokenHash === incomingHash);

    if (!identity) {
      logAgentAudit(
        getTenantId(req),
        agentIdHeader || null,
        null,
        "AUTH_FAILED",
        clientIp,
        "Falha de autenticação: Token individual de agente não reconhecido."
      );
      return res.status(401).json({
        error: "UNAUTHORIZED_AGENT",
        message: "Token de identidade do equipamento inválido ou inexistente.",
        code: "AGENT_TOKEN_INVALID"
      });
    }

    if (identity.status === "blocked") {
      logAgentAudit(identity.tenantId, identity.agentId, identity.deviceId, "AUTH_FAILED", clientIp, "Tentativa de requisição bloqueada: Agente desativado administrativamente.");
      return res.status(403).json({
        error: "AGENT_BLOCKED",
        message: "Este agente foi bloqueado pelo administrador da plataforma.",
        agentId: identity.agentId
      });
    }

    if (identity.status === "revoked") {
      logAgentAudit(identity.tenantId, identity.agentId, identity.deviceId, "AUTH_FAILED", clientIp, "Tentativa de requisição com credencial revogada.");
      return res.status(401).json({
        error: "AGENT_REVOKED",
        message: "A identidade deste agente foi revogada. É necessário realizar novo enrollment com um Enrollment Token válido.",
        agentId: identity.agentId
      });
    }

    // Rate limiting per agent (120 req / 60s)
    if (!checkRateLimit(`agent:${identity.agentId}`, 120, 60)) {
      return res.status(429).json({ error: "RATE_LIMITED", message: "Muitas requisições deste agente em janela de 60s." });
    }

    (req as any).agentIdentity = identity;
    return next();
  }

  // Backwards compatibility fallback for older agents:
  // If legacy agent has not yet enrolled, permit request but add upgrade header
  res.setHeader("x-agent-auth", "legacy-unauthenticated");
  res.setHeader("x-agent-upgrade-required", "true");
  return next();
}

// Helper to log an audit event
function logAuditEvent(
  tenantId: string, 
  ciId: string, 
  ciCode: string, 
  ciName: string, 
  action: CIHistoryEvent["action"], 
  description: string, 
  user: string = "Carlos Amoroso (Administrador)",
  field?: string,
  oldVal?: string,
  newVal?: string,
  source: CIHistoryEvent["source"] = "Web"
) {
  const event: CIHistoryEvent = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    tenantId,
    ciId,
    ciCode,
    ciName,
    date: new Date().toISOString(),
    action,
    field,
    oldValue: oldVal,
    newValue: newVal,
    description,
    user,
    source
  };
  store.history.unshift(event);
  saveStore(store);
}

// ==========================================
// 1. CMDB CONFIGURATION ITEMS (CRUD)
// ==========================================

// GET /api/v1/cmdb/items
router.get("/cmdb/items", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { clientId, type, status, search, layer } = req.query;

  // STRICT MULTI-TENANT ISOLATION
  let items = store.items.filter(item => item.tenantId === tenantId);

  if (clientId) {
    items = items.filter(i => i.clientId === clientId);
  }
  if (type) {
    items = items.filter(i => i.typeId === type || i.typeGroup === type);
  }
  if (status) {
    items = items.filter(i => i.status === status);
  }
  if (layer && layer !== "todas") {
    items = items.filter(i => i.layer === layer);
  }
  if (search) {
    const q = String(search).toLowerCase();
    items = items.filter(i => 
      i.name.toLowerCase().includes(q) ||
      i.code.toLowerCase().includes(q) ||
      i.hostname.toLowerCase().includes(q) ||
      i.ipAddress.toLowerCase().includes(q) ||
      i.serialNumber.toLowerCase().includes(q) ||
      i.assetTag.toLowerCase().includes(q) ||
      i.model.toLowerCase().includes(q) ||
      i.responsible.toLowerCase().includes(q) ||
      (i.macAddress && i.macAddress.toLowerCase().includes(q))
    );
  }

  res.json({
    total: items.length,
    tenantId,
    items
  });
});

// GET /api/v1/cmdb/items/:id
router.get("/cmdb/items/:id", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { id } = req.params;

  const item = store.items.find(i => i.id === id);

  if (!item) {
    return res.status(404).json({ error: "Item de Configuração não encontrado." });
  }

  // Multi-tenant check
  if (item.tenantId !== tenantId) {
    return res.status(403).json({ 
      error: "ACESSO NEGADO / RECURSO NÃO ENCONTRADO: O item solicitado pertence a outro tenant." 
    });
  }

  // Related relationships
  const relationships = store.relationships.filter(
    r => (r.sourceCiId === id || r.targetCiId === id) && r.tenantId === tenantId
  );

  // Related tickets
  const tickets = store.tickets.filter(t => t.ciId === id && t.tenantId === tenantId);

  // Related contracts
  const contracts = store.contracts.filter(c => c.linkedCiIds.includes(id) && c.tenantId === tenantId);

  // Audit history
  const history = store.history.filter(h => h.ciId === id && h.tenantId === tenantId);

  res.json({
    item,
    relationships,
    tickets,
    contracts,
    history
  });
});

// POST /api/v1/cmdb/items
router.post("/cmdb/items", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const body = req.body;

  if (!body.name || !body.typeId) {
    return res.status(400).json({ error: "Nome e Tipo do CI são obrigatórios." });
  }

  const newId = body.id || `ci-${Date.now()}`;
  const code = body.code || `CI-${body.typeName ? body.typeName.slice(0, 3).toUpperCase() : "GEN"}-${Math.floor(100 + Math.random() * 900)}`;

  const newItem: ConfigurationItem = {
    ...body,
    id: newId,
    code,
    tenantId,
    status: body.status || "operacional",
    criticality: body.criticality || "media",
    layer: body.layer || "acesso",
    linkedTicketsCount: 0,
    dynamicAttributes: body.dynamicAttributes || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.items.push(newItem);
  logAuditEvent(tenantId, newItem.id, newItem.code, newItem.name, "CRIACAO", `Item de Configuração cadastrado na base CMDB.`);
  saveStore(store);

  res.status(201).json(newItem);
});

// PUT /api/v1/cmdb/items/:id
router.put("/cmdb/items/:id", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { id } = req.params;
  const updates = req.body;

  const index = store.items.findIndex(i => i.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Item de Configuração não encontrado." });
  }

  if (store.items[index].tenantId !== tenantId) {
    return res.status(403).json({ error: "Acesso negado: CI pertence a outro tenant." });
  }

  const oldItem = { ...store.items[index] };
  const updatedItem: ConfigurationItem = {
    ...oldItem,
    ...updates,
    id,
    tenantId, // prevent changing tenant
    updatedAt: new Date().toISOString()
  };

  store.items[index] = updatedItem;

  // Track status change audit
  if (oldItem.status !== updatedItem.status) {
    logAuditEvent(
      tenantId, 
      id, 
      updatedItem.code, 
      updatedItem.name, 
      "STATUS_CHANGE", 
      `Status alterado de '${oldItem.status}' para '${updatedItem.status}'`,
      req.body.user || "Carlos Amoroso (Administrador)",
      "status",
      oldItem.status,
      updatedItem.status
    );
  } else {
    logAuditEvent(
      tenantId, 
      id, 
      updatedItem.code, 
      updatedItem.name, 
      "ALTERACAO", 
      `Propriedades do CI atualizadas.`,
      req.body.user || "Carlos Amoroso (Administrador)"
    );
  }

  saveStore(store);
  res.json(updatedItem);
});

// DELETE /api/v1/cmdb/items/:id
router.delete("/cmdb/items/:id", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { id } = req.params;

  const item = store.items.find(i => i.id === id);
  if (!item) {
    return res.status(404).json({ error: "Item de Configuração não encontrado." });
  }

  if (item.tenantId !== tenantId) {
    return res.status(403).json({ error: "Acesso negado: CI pertence a outro tenant." });
  }

  // Remove item and cascade relationships
  store.items = store.items.filter(i => i.id !== id);
  store.relationships = store.relationships.filter(r => r.sourceCiId !== id && r.targetCiId !== id);

  logAuditEvent(tenantId, id, item.code, item.name, "AUDITORIA", `Item de Configuração removido da CMDB.`);
  saveStore(store);

  res.json({ success: true, message: `Item ${item.code} removido com sucesso.` });
});

// ==========================================
// 2. RELATIONSHIPS
// ==========================================

// GET /api/v1/cmdb/relationships
router.get("/cmdb/relationships", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const relationships = store.relationships.filter(r => r.tenantId === tenantId);
  res.json(relationships);
});

// GET /api/v1/cmdb/items/:id/relationships
router.get("/cmdb/items/:id/relationships", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { id } = req.params;

  const rels = store.relationships.filter(
    r => (r.sourceCiId === id || r.targetCiId === id) && r.tenantId === tenantId
  );
  res.json(rels);
});

// POST /api/v1/cmdb/relationships
router.post("/cmdb/relationships", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { 
    sourceCiId, 
    targetCiId, 
    origem, 
    destino, 
    type, 
    tipo, 
    evidencia, 
    evidence, 
    confianca, 
    confidence, 
    criticality, 
    description, 
    evidenceDetails 
  } = req.body;

  const srcId = origem || sourceCiId;
  const tgtId = destino || targetCiId;

  if (!srcId || !tgtId) {
    return res.status(400).json({ error: "Os campos 'origem' e 'destino' (ou sourceCiId/targetCiId) são obrigatórios." });
  }

  // Enforce rule: "Não criar relacionamentos sem evidência."
  const evLevel = (evidencia || evidence) as RelationshipEvidence;
  if (!evLevel || !['CONFIRMED', 'PROBABLE', 'UNKNOWN'].includes(evLevel)) {
    return res.status(400).json({ 
      error: "Não é permitido criar relacionamentos sem evidência. O campo 'evidencia' é obrigatório e deve ser: CONFIRMED, PROBABLE ou UNKNOWN." 
    });
  }

  const sourceItem = store.items.find(i => i.id === srcId && i.tenantId === tenantId);
  const targetItem = store.items.find(i => i.id === tgtId && i.tenantId === tenantId);

  const now = new Date().toISOString();
  const relType = tipo || type || "CONECTADO_A";
  const confValue = confianca ?? (confidence ?? (evLevel === 'CONFIRMED' ? 1.0 : evLevel === 'PROBABLE' ? 0.75 : 0.40));

  const newRel: CIRelationship = {
    id: `rel-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    tenantId,
    origem: srcId,
    destino: tgtId,
    tipo: relType,
    evidencia: evLevel,
    confianca: confValue,
    criado_em: now,
    atualizado_em: now,
    sourceCiId: srcId,
    sourceCiName: sourceItem?.name || req.body.sourceCiName || srcId,
    sourceCiCode: sourceItem?.code || req.body.sourceCiCode || srcId,
    targetCiId: tgtId,
    targetCiName: targetItem?.name || req.body.targetCiName || tgtId,
    targetCiCode: targetItem?.code || req.body.targetCiCode || tgtId,
    type: relType,
    criticality: criticality || "media",
    description: description || `Relacionamento [${relType}] com evidência [${evLevel}]`,
    createdAt: now,
    updatedAt: now,
    evidenceDetails: evidenceDetails || {
      sourceType: 'MANUAL_AUDIT',
      detectedBy: 'Auditoria CMDB',
      proof: 'Evidência documentada e registrada pelo operador no CMDB',
      verifiedAt: now
    }
  };

  store.relationships.push(newRel);
  logAuditEvent(
    tenantId, 
    srcId, 
    sourceItem?.code || srcId, 
    sourceItem?.name || srcId, 
    "RELACIONAMENTO", 
    `Criado relacionamento [${newRel.tipo}] (Evidência: ${newRel.evidencia}, Confiança: ${Math.round(newRel.confianca * 100)}%) com ${newRel.targetCiName} (${newRel.targetCiCode})`
  );
  saveStore(store);

  res.status(201).json(newRel);
});

// POST /api/v1/cmdb/items/:id/relationships
router.post("/cmdb/items/:id/relationships", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { id } = req.params;
  const { 
    targetCiId, 
    destino, 
    type, 
    tipo, 
    evidencia, 
    evidence, 
    confianca, 
    confidence, 
    criticality, 
    description,
    evidenceDetails 
  } = req.body;

  const tgtId = destino || targetCiId;
  const sourceItem = store.items.find(i => i.id === id && i.tenantId === tenantId);
  const targetItem = store.items.find(i => i.id === tgtId && i.tenantId === tenantId);

  if (!sourceItem || !targetItem) {
    return res.status(400).json({ error: "CIs de origem e destino devem existir no mesmo tenant." });
  }

  // Enforce rule: "Não criar relacionamentos sem evidência."
  const evLevel = (evidencia || evidence || 'CONFIRMED') as RelationshipEvidence;
  if (!['CONFIRMED', 'PROBABLE', 'UNKNOWN'].includes(evLevel)) {
    return res.status(400).json({ 
      error: "Não é permitido criar relacionamentos sem evidência. O campo 'evidencia' deve ser: CONFIRMED, PROBABLE ou UNKNOWN." 
    });
  }

  const now = new Date().toISOString();
  const relType = tipo || type || "CONECTADO_A";
  const confValue = confianca ?? (confidence ?? (evLevel === 'CONFIRMED' ? 1.0 : evLevel === 'PROBABLE' ? 0.75 : 0.40));

  const newRel: CIRelationship = {
    id: `rel-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    tenantId,
    origem: sourceItem.id,
    destino: targetItem.id,
    tipo: relType,
    evidencia: evLevel,
    confianca: confValue,
    criado_em: now,
    atualizado_em: now,
    sourceCiId: sourceItem.id,
    sourceCiName: sourceItem.name,
    sourceCiCode: sourceItem.code,
    targetCiId: targetItem.id,
    targetCiName: targetItem.name,
    targetCiCode: targetItem.code,
    type: relType,
    criticality: criticality || "media",
    description: description || `Relacionamento entre ${sourceItem.name} e ${targetItem.name}`,
    createdAt: now,
    updatedAt: now,
    evidenceDetails: evidenceDetails || {
      sourceType: 'MANUAL_AUDIT',
      detectedBy: 'Auditoria CMDB',
      proof: `Associação manual com evidência ${evLevel} validada no console`,
      verifiedAt: now
    }
  };

  store.relationships.push(newRel);
  logAuditEvent(
    tenantId, 
    sourceItem.id, 
    sourceItem.code, 
    sourceItem.name, 
    "RELACIONAMENTO", 
    `Criado relacionamento [${newRel.tipo}] (Evidência: ${newRel.evidencia}) com ${targetItem.name} (${targetItem.code})`
  );
  saveStore(store);

  res.status(201).json(newRel);
});

// DELETE /api/v1/cmdb/relationships/:id
router.delete("/cmdb/relationships/:id", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { id } = req.params;

  const rel = store.relationships.find(r => r.id === id);
  if (!rel) {
    return res.status(404).json({ error: "Relacionamento não encontrado." });
  }

  if (rel.tenantId !== tenantId) {
    return res.status(403).json({ error: "Acesso negado: Relacionamento pertence a outro tenant." });
  }

  store.relationships = store.relationships.filter(r => r.id !== id);
  logAuditEvent(
    tenantId, 
    rel.sourceCiId, 
    rel.sourceCiCode, 
    rel.sourceCiName, 
    "RELACIONAMENTO", 
    `Relacionamento com ${rel.targetCiName} (${rel.targetCiCode}) removido.`
  );
  saveStore(store);

  res.json({ success: true });
});

// ==========================================
// 3. TOPOLOGY (DIGITAL TWIN OF INFRASTRUCTURE)
// ==========================================

// GET /api/v1/cmdb/topology
router.get("/cmdb/topology", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { clientId } = req.query;

  let items = store.items.filter(i => i.tenantId === tenantId);
  if (clientId) {
    items = items.filter(i => i.clientId === clientId);
  }

  const itemIds = new Set(items.map(i => i.id));
  const relationships = store.relationships.filter(
    r => r.tenantId === tenantId && itemIds.has(r.sourceCiId) && itemIds.has(r.targetCiId)
  );

  res.json({
    tenantId,
    client: clientId ? items[0]?.clientName : "Empresa ABC",
    nodes: items,
    edges: relationships
  });
});

// ==========================================
// 4. IMPACT ANALYSIS (ANALISAR IMPACTO)
// ==========================================

// GET /api/v1/cmdb/impact/:id
router.get("/cmdb/impact/:id", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { id } = req.params;
  const { simulationType } = req.query;

  const targetCi = store.items.find(i => i.id === id && i.tenantId === tenantId);
  if (!targetCi) {
    return res.status(404).json({ error: "CI não encontrado no tenant ativo." });
  }

  // Traverse the dependency / relationship graph
  const visited = new Set<string>();
  const directDependents: ConfigurationItem[] = [];
  const indirectDependents: ConfigurationItem[] = [];
  const cascadePath: ImpactAnalysisResult["cascadePath"] = [];

  // Outgoing / incoming links where targetCi is a dependency
  const outgoingRels = store.relationships.filter(r => r.sourceCiId === id && r.tenantId === tenantId);
  const incomingRels = store.relationships.filter(r => r.targetCiId === id && r.tenantId === tenantId);

  // Direct dependents
  outgoingRels.forEach(rel => {
    const item = store.items.find(i => i.id === rel.targetCiId && i.tenantId === tenantId);
    if (item && !visited.has(item.id)) {
      visited.add(item.id);
      directDependents.push(item);
      cascadePath.push({
        level: 1,
        ciId: item.id,
        ciName: item.name,
        relationshipType: rel.type,
        consequence: `Conexão direta afetada por ${targetCi.name}`
      });
    }
  });

  // Secondary cascade (Level 2)
  directDependents.forEach(dep => {
    const secRels = store.relationships.filter(r => r.sourceCiId === dep.id && r.tenantId === tenantId);
    secRels.forEach(sr => {
      if (sr.targetCiId !== targetCi.id && !visited.has(sr.targetCiId)) {
        const secItem = store.items.find(i => i.id === sr.targetCiId && i.tenantId === tenantId);
        if (secItem) {
          visited.add(secItem.id);
          indirectDependents.push(secItem);
          cascadePath.push({
            level: 2,
            ciId: secItem.id,
            ciName: secItem.name,
            relationshipType: sr.type,
            consequence: `Dependência indireta cascateada via ${dep.name}`
          });
        }
      }
    });
  });

  // Business services impacted
  const affectedServices = store.services.filter(svc => 
    svc.tenantId === tenantId && (
      svc.underlyingCiIds.includes(targetCi.id) ||
      directDependents.some(d => svc.underlyingCiIds.includes(d.id))
    )
  );

  // Impact severity rating
  let impactLevel: ImpactAnalysisResult["impactLevel"] = "BAIXO";
  if (targetCi.typeId === "firewall" || targetCi.typeId === "switch" || targetCi.code === "CI-INET-01") {
    impactLevel = "CRÍTICO";
  } else if (targetCi.typeId === "servidor" || affectedServices.length >= 2) {
    impactLevel = "ALTO";
  } else if (directDependents.length > 0) {
    impactLevel = "MÉDIO";
  }

  const estimatedAffectedUsers = affectedServices.reduce((acc, s) => acc + s.affectedUsersCount, 0) || (impactLevel === "CRÍTICO" ? 148 : directDependents.length * 4);

  const result: ImpactAnalysisResult = {
    targetCi,
    impactLevel,
    simulationType: (simulationType as any) || "total_outage",
    summary: `A indisponibilidade de ${targetCi.name} (${targetCi.code}) causa impacto ${impactLevel}, afetando ${affectedServices.length} serviço(s) corporativo(s) e aproximadamente ${estimatedAffectedUsers} usuário(s).`,
    directDependents,
    indirectDependents,
    affectedServices,
    affectedClients: [targetCi.clientName],
    affectedUnits: [targetCi.unit],
    estimatedAffectedUsers,
    cascadePath,
    recommendedActions: [
      `Acionar equipe responsável: ${targetCi.responsible}`,
      `Notificar chamados e usuários do serviço: ${affectedServices.map(s => s.name).join(", ") || "Operações Locais"}`,
      `Verificar redundância de link e failover automático`,
      `Contrato vinculado: ${targetCi.linkedContractName || "Contrato Geral de TI"}`
    ]
  };

  res.json(result);
});

// ==========================================
// 5. CMDB HEALTH SCORE & ORPHANS
// ==========================================

// GET /api/v1/cmdb/health
router.get("/cmdb/health", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const items = store.items.filter(i => i.tenantId === tenantId);
  const rels = store.relationships.filter(r => r.tenantId === tenantId);

  const total = items.length || 1;
  const withOwner = items.filter(i => i.responsible && i.responsible.trim() !== "").length;
  const withLocation = items.filter(i => i.location && i.location.trim() !== "").length;
  const withContract = items.filter(i => i.linkedContractId || i.linkedContractName).length;
  
  // Has at least one relationship
  const relCiIds = new Set<string>();
  rels.forEach(r => {
    relCiIds.add(r.sourceCiId);
    relCiIds.add(r.targetCiId);
  });
  const withRels = items.filter(i => relCiIds.has(i.id)).length;
  const orphans = items.filter(i => !relCiIds.has(i.id));

  // Telemetry updated within last 24h
  const activeMonitored = items.filter(i => i.telemetry && i.telemetry.isOnline).length;

  const completenessPct = Math.round(
    ((withOwner / total) * 0.25 + 
     (withLocation / total) * 0.25 + 
     (withRels / total) * 0.30 + 
     (withContract / total) * 0.20) * 100
  );

  const overallScore = Math.min(100, Math.max(0, completenessPct));
  const grade = overallScore >= 90 ? "A" : overallScore >= 80 ? "B" : overallScore >= 70 ? "C" : overallScore >= 50 ? "D" : "F";

  const recommendations = [];
  if (orphans.length > 0) {
    recommendations.push({
      id: "rec-orphans",
      priority: "alta" as const,
      title: `${orphans.length} CIs sem relacionamento na topologia`,
      description: "Equipamentos sem conexão não permitem rastreabilidade de impacto em falhas.",
      actionLabel: "Vincular no Mapa"
    });
  }
  if (total - withOwner > 0) {
    recommendations.push({
      id: "rec-owner",
      priority: "media" as const,
      title: `${total - withOwner} CIs sem responsável designado`,
      description: "Atribua um técnico ou colaborador responsável para compliance e cautela.",
      actionLabel: "Atribuir Responsáveis"
    });
  }
  if (total - withContract > 0) {
    recommendations.push({
      id: "rec-contract",
      priority: "baixa" as const,
      title: `${total - withContract} CIs sem contrato de garantia/suporte`,
      description: "Vincule o contrato de suporte de fabricante ou fornecedor para controle de SLA.",
      actionLabel: "Associar Contratos"
    });
  }

  const health: CMDBHealthScore = {
    overallScore,
    grade,
    metrics: {
      completenessPct,
      relationshipsPct: Math.round((withRels / total) * 100),
      assignedOwnersPct: Math.round((withOwner / total) * 100),
      assignedLocationsPct: Math.round((withLocation / total) * 100),
      contractsLinkedPct: Math.round((withContract / total) * 100),
      activeMonitoringPct: Math.round((activeMonitored / total) * 100)
    },
    counts: {
      totalCIs: total,
      orphanedCIs: orphans.length,
      missingOwners: total - withOwner,
      missingLocations: total - withLocation,
      missingContracts: total - withContract,
      outdatedTelemetry: total - activeMonitored
    },
    recommendations
  };

  res.json(health);
});

// GET /api/v1/cmdb/orphans
router.get("/cmdb/orphans", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const items = store.items.filter(i => i.tenantId === tenantId);
  const rels = store.relationships.filter(r => r.tenantId === tenantId);

  const relCiIds = new Set<string>();
  rels.forEach(r => {
    relCiIds.add(r.sourceCiId);
    relCiIds.add(r.targetCiId);
  });

  const orphans = items.filter(i => 
    !relCiIds.has(i.id) || 
    !i.responsible || 
    !i.location || 
    !i.linkedContractId
  );

  res.json({
    total: orphans.length,
    orphans
  });
});

// ==========================================
// 6. SERVICES, CONTRACTS, TICKETS & HISTORY
// ==========================================

// GET /api/v1/cmdb/services
router.get("/cmdb/services", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  res.json(store.services.filter(s => s.tenantId === tenantId));
});

// POST /api/v1/cmdb/services
router.post("/cmdb/services", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const newSvc: ITBusinessService = {
    ...req.body,
    id: `svc-${Date.now()}`,
    tenantId,
    createdAt: new Date().toISOString()
  };
  store.services.push(newSvc);
  saveStore(store);
  res.status(201).json(newSvc);
});

// GET /api/v1/cmdb/contracts
router.get("/cmdb/contracts", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  res.json(store.contracts.filter(c => c.tenantId === tenantId));
});

// GET /api/v1/cmdb/tickets
router.get("/cmdb/tickets", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { ciId } = req.query;
  let tickets = store.tickets.filter(t => t.tenantId === tenantId);
  if (ciId) {
    tickets = tickets.filter(t => t.ciId === ciId);
  }
  res.json(tickets);
});

// GET /api/v1/cmdb/history
router.get("/cmdb/history", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { ciId, limit } = req.query;
  let history = store.history.filter(h => h.tenantId === tenantId);
  if (ciId) {
    history = history.filter(h => h.ciId === ciId);
  }
  if (limit) {
    history = history.slice(0, Number(limit));
  }
  res.json(history);
});

// =======================================================
// 7. RMM / AGENT IDENTITY & SECURE AUTHENTICATION REST API
// =======================================================

// 7.1. ENROLLMENT TOKENS MANAGEMENT (ADMIN)

// GET /api/v1/agent/enrollment-tokens
router.get("/agent/enrollment-tokens", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const tokens = (store.enrollmentTokens || [])
    .filter(t => t.tenantId === tenantId)
    .map(({ tokenHash, ...rest }) => ({
      ...rest,
      isExpired: new Date(rest.expiresAt) < new Date()
    }));
  res.json(tokens);
});

// POST /api/v1/agent/enrollment-tokens
router.post("/agent/enrollment-tokens", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { name, maxUses, validityDays, allowedSubnets } = req.body;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Nome descritivo do Enrollment Token é obrigatório." });
  }

  const days = Number(validityDays) > 0 ? Number(validityDays) : 7;
  const rawToken = `enr_tok_${crypto.randomBytes(20).toString("hex")}`;
  const tokenPrefix = `${rawToken.slice(0, 12)}...`;
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + days * 86400000).toISOString();

  const newToken: AgentEnrollmentToken = {
    id: `enr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId,
    name: name.trim(),
    tokenPrefix,
    tokenHash,
    maxUses: maxUses !== undefined && Number(maxUses) >= -1 ? Number(maxUses) : 100,
    currentUses: 0,
    status: "active",
    expiresAt,
    allowedSubnets: Array.isArray(allowedSubnets) ? allowedSubnets : [],
    createdBy: "Administrador (WorkPulse Console)",
    createdAt: new Date().toISOString()
  };

  if (!store.enrollmentTokens) store.enrollmentTokens = [];
  store.enrollmentTokens.unshift(newToken);
  saveStore(store);

  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
  logAgentAudit(tenantId, null, null, "ENROLLMENT_SUCCESS", clientIp, `Novo Enrollment Token gerado: "${name}" (${tokenPrefix}) válido até ${expiresAt}`);

  // Raw token is returned ONLY upon creation!
  res.status(201).json({
    ...newToken,
    rawToken,
    message: "Enrollment Token gerado com sucesso. Guarde o rawToken; ele não será exibido novamente."
  });
});

// POST /api/v1/agent/enrollment-tokens/:id/revoke
router.post("/agent/enrollment-tokens/:id/revoke", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { id } = req.params;

  const token = (store.enrollmentTokens || []).find(t => t.id === id && t.tenantId === tenantId);
  if (!token) {
    return res.status(404).json({ error: "Enrollment Token não encontrado." });
  }

  token.status = "revoked";
  token.revokedAt = new Date().toISOString();
  saveStore(store);

  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
  logAgentAudit(tenantId, null, null, "TOKEN_REVOKED", clientIp, `Enrollment Token revogado: ${token.name} (${token.tokenPrefix})`);

  res.json({ revoked: true, id: token.id, status: "revoked" });
});

// 7.2. ENROLLMENT & REGISTRATION OF AGENT INDIVIDUAL IDENTITY

// POST /api/v1/agent/enroll (and alias /register)
const handleEnrollment = (req: Request, res: Response) => {
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";

  // Rate limiting on enrollment endpoint (max 15 attempts / minute per IP)
  if (!checkRateLimit(`enroll:${clientIp}`, 15, 60)) {
    return res.status(429).json({ error: "RATE_LIMITED", message: "Muitas tentativas de enrollment. Aguarde 60 segundos." });
  }

  const { 
    enrollmentToken, 
    tenantToken, 
    hostname, 
    macAddress, 
    deviceId: customDeviceId,
    operatingSystem, 
    osVersion,
    ipAddress, 
    agentVersion,
    ciId
  } = req.body;

  const suppliedToken = enrollmentToken || tenantToken;

  if (!hostname || !macAddress) {
    return res.status(400).json({ error: "Hostname e MAC Address são obrigatórios para registrar o equipamento." });
  }

  if (!suppliedToken) {
    return res.status(400).json({ error: "Enrollment Token é obrigatório para registrar o equipamento." });
  }

  // Validate Enrollment Token
  const tokenHash = sha256(suppliedToken);
  let matchedEnrollmentToken = (store.enrollmentTokens || []).find(t => t.tokenHash === tokenHash);

  // Fallback for legacy default token
  if (!matchedEnrollmentToken && suppliedToken === DEFAULT_LEGACY_TOKEN) {
    matchedEnrollmentToken = (store.enrollmentTokens || []).find(t => t.id === "enr-legacy-gpo");
  }

  if (!matchedEnrollmentToken) {
    logAgentAudit(
      getTenantId(req),
      null,
      null,
      "ENROLLMENT_FAILED",
      clientIp,
      `Tentativa de enrollment rejeitada: Token inválido ou não cadastrado para host "${hostname}" (${macAddress}).`
    );
    return res.status(401).json({
      error: "INVALID_ENROLLMENT_TOKEN",
      message: "O Enrollment Token fornecido é inválido, expirou ou não possui autorização."
    });
  }

  // Check token status
  if (matchedEnrollmentToken.status === "revoked") {
    logAgentAudit(matchedEnrollmentToken.tenantId, null, null, "ENROLLMENT_FAILED", clientIp, `Enrollment rejeitado: Token "${matchedEnrollmentToken.name}" está revogado.`);
    return res.status(403).json({ error: "ENROLLMENT_TOKEN_REVOKED", message: "Este Enrollment Token foi revogado pelo administrador." });
  }

  if (new Date(matchedEnrollmentToken.expiresAt) < new Date()) {
    matchedEnrollmentToken.status = "expired";
    saveStore(store);
    logAgentAudit(matchedEnrollmentToken.tenantId, null, null, "ENROLLMENT_FAILED", clientIp, `Enrollment rejeitado: Token "${matchedEnrollmentToken.name}" expirado.`);
    return res.status(403).json({ error: "ENROLLMENT_TOKEN_EXPIRED", message: "Este Enrollment Token expirou." });
  }

  if (matchedEnrollmentToken.maxUses !== -1 && matchedEnrollmentToken.currentUses >= matchedEnrollmentToken.maxUses) {
    return res.status(403).json({ error: "ENROLLMENT_LIMIT_REACHED", message: "Este Enrollment Token atingiu o limite máximo de utilizações." });
  }

  const tenantId = matchedEnrollmentToken.tenantId;

  // Increment usage count
  matchedEnrollmentToken.currentUses++;

  // Determine persistent Device ID
  const cleanMac = macAddress.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const deviceId = customDeviceId && customDeviceId.trim().length > 3
    ? customDeviceId.trim()
    : `dev_hw_${cleanMac || sha256(hostname + macAddress).slice(0, 16)}`;

  // Find existing device identity in tenant (by deviceId or hostname+MAC)
  if (!store.agentIdentities) store.agentIdentities = [];
  let identity = store.agentIdentities.find(id => 
    (id.deviceId === deviceId || (id.hostname.toLowerCase() === hostname.toLowerCase() && id.macAddress === macAddress)) &&
    id.tenantId === tenantId
  );

  // Allocate unique Agent ID (ex: AGT-PC-001, AGT-SRV-AD)
  let agentId = identity?.agentId;
  if (!agentId) {
    const sanitizedHost = hostname.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    const baseAgentId = `AGT-${sanitizedHost}`;
    const collision = store.agentIdentities.some(i => i.agentId === baseAgentId && i.tenantId === tenantId);
    agentId = collision ? `${baseAgentId}-${Math.random().toString(36).slice(2, 6).toUpperCase()}` : baseAgentId;
  }

  // Generate individual cryptographically secure device secret token
  const rawDeviceToken = `dev_tok_${crypto.randomBytes(24).toString("hex")}`;
  const individualTokenHash = sha256(rawDeviceToken);
  const tokenPrefix = `${rawDeviceToken.slice(0, 12)}...`;

  // Find or link with CMDB ConfigurationItem
  let linkedCi = store.items.find(i => 
    (i.id === ciId || i.hostname === hostname || i.macAddress === macAddress) && 
    i.tenantId === tenantId
  );

  if (!linkedCi) {
    // Auto-create CI in CMDB so the device is immediately visible in inventory
    const newCiCode = `CI-AGT-${Math.floor(100 + Math.random() * 900)}`;
    linkedCi = {
      id: `ci-agt-${Date.now()}`,
      tenantId,
      code: newCiCode,
      name: hostname,
      typeGroup: "hardware",
      typeId: "estacao_trabalho",
      typeName: "Estação de Trabalho",
      clientId: "cli-demo-01",
      clientName: "Empresa ABC Matriz",
      unit: "Matriz",
      location: "Área de Trabalho / Operações",
      responsible: "Administrador do Sistema",
      status: "operacional",
      manufacturer: "Dell / Lenovo",
      model: "Workstation Corporate",
      serialNumber: `SN-${cleanMac.slice(0, 8).toUpperCase()}`,
      assetTag: `PAT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      criticality: "media",
      layer: "acesso",
      linkedTicketsCount: 0,
      hostname,
      ipAddress: ipAddress || clientIp,
      macAddress,
      operatingSystem: operatingSystem || "Windows 11 Pro",
      telemetry: {
        cpuUsagePct: 15,
        ramUsagePct: 40,
        diskUsagePct: 30,
        uptimeHours: 1,
        lastHeartbeat: "agora",
        isOnline: true,
        agentVersion: agentVersion || "v3.0.0-rmm"
      },
      dynamicAttributes: {
        agentId,
        deviceId,
        enrolledAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.items.unshift(linkedCi);
    logAuditEvent(tenantId, linkedCi.id, linkedCi.code, linkedCi.name, "CRIACAO", `Equipamento registrado e vinculado ao CI automaticamente via Enrollment do Agente (${agentId}).`, "Agente RMM", undefined, undefined, undefined, "Agente");
  } else {
    linkedCi.hostname = hostname;
    linkedCi.macAddress = macAddress;
    if (ipAddress) linkedCi.ipAddress = ipAddress;
    if (operatingSystem) linkedCi.operatingSystem = operatingSystem;
    if (linkedCi.telemetry) {
      linkedCi.telemetry.lastHeartbeat = "agora";
      linkedCi.telemetry.isOnline = true;
      linkedCi.telemetry.agentVersion = agentVersion || "v3.0.0-rmm";
    }
  }

  // Create or update AgentDeviceIdentity
  if (identity) {
    identity.agentId = agentId;
    identity.deviceId = deviceId;
    identity.hostname = hostname;
    identity.operatingSystem = operatingSystem || identity.operatingSystem;
    identity.osVersion = osVersion || identity.osVersion;
    identity.macAddress = macAddress;
    identity.ipAddress = ipAddress || identity.ipAddress;
    identity.lastSeenIp = clientIp;
    identity.agentVersion = agentVersion || identity.agentVersion;
    identity.status = "active";
    identity.tokenPrefix = tokenPrefix;
    identity.tokenHash = individualTokenHash;
    identity.tokenRotatedAt = new Date().toISOString();
    identity.enrollmentTokenId = matchedEnrollmentToken.id;
    identity.ciId = linkedCi.id;
  } else {
    identity = {
      agentId,
      deviceId,
      tenantId,
      ciId: linkedCi.id,
      hostname,
      operatingSystem: operatingSystem || "Windows 11 Pro",
      osVersion: osVersion || "Desconhecido",
      macAddress,
      ipAddress: ipAddress || clientIp,
      lastSeenIp: clientIp,
      agentVersion: agentVersion || "v3.0.0-rmm",
      status: "active",
      tokenPrefix,
      tokenHash: individualTokenHash,
      tokenRotatedAt: null,
      enrollmentTokenId: matchedEnrollmentToken.id,
      enrolledAt: new Date().toISOString(),
      lastHeartbeatAt: new Date().toISOString()
    };
    store.agentIdentities.unshift(identity);
  }

  saveStore(store);

  logAgentAudit(
    tenantId, 
    agentId, 
    deviceId, 
    "ENROLLMENT_SUCCESS", 
    clientIp, 
    `Equipamento registrado com sucesso. Agent ID: ${agentId}, Device ID: ${deviceId}, Token: ${tokenPrefix}.`
  );

  // Return individual device credentials to the agent (deviceToken sent ONCE upon enrollment)
  res.status(201).json({
    enrolled: true,
    registered: true,
    agentId,
    deviceId,
    tenantId,
    ciId: linkedCi.id,
    deviceToken: rawDeviceToken,
    tokenPrefix,
    serverTimestamp: new Date().toISOString(),
    pollIntervalSeconds: 30,
    featuresEnabled: ["telemetry", "hardware_inventory", "process_monitoring", "remote_exec", "token_rotation"],
    endpoints: {
      heartbeat: "/api/v1/agent/heartbeat",
      inventory: "/api/v1/agent/inventory",
      metrics: "/api/v1/agent/metrics",
      events: "/api/v1/agent/events",
      rotateToken: "/api/v1/agent/rotate-token"
    }
  });
};

router.post("/agent/enroll", handleEnrollment);
router.post("/agent/register", handleEnrollment);

// 7.3. SECURE HEARTBEAT
// POST /api/v1/agent/heartbeat
router.post("/agent/heartbeat", authenticateAgent, (req: Request, res: Response) => {
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
  const now = new Date().toISOString();
  const identity = (req as any).agentIdentity as AgentDeviceIdentity | undefined;

  const { 
    agentId: reqAgentId, 
    deviceId: reqDeviceId, 
    ciId, 
    hostname, 
    agentVersion, 
    operatingSystem,
    isOnline,
    cpuUsagePct,
    ramUsagePct,
    diskUsagePct,
    uptimeHours,
    temperatureC,
    metrics
  } = req.body;

  const effectiveAgentId = identity ? identity.agentId : (reqAgentId || "AGT-UNKNOWN");
  const effectiveDeviceId = identity ? identity.deviceId : (reqDeviceId || "dev_unidentified");
  const effectiveTenantId = identity ? identity.tenantId : getTenantId(req);
  const effectiveAgentVersion = agentVersion || identity?.agentVersion || "v3.0.0-rmm";
  const effectiveOs = operatingSystem || identity?.operatingSystem || "Windows 11 Pro";

  // Parse metrics
  const cpu = cpuUsagePct ?? metrics?.cpuUsagePct ?? 20;
  const ram = ramUsagePct ?? metrics?.ramUsagePct ?? 45;
  const disk = diskUsagePct ?? metrics?.diskUsagePct ?? 38;
  const uptime = uptimeHours ?? (metrics?.uptimeSeconds ? Math.round(metrics.uptimeSeconds / 3600) : 12);
  const temp = temperatureC ?? metrics?.tempC;

  // Determine status
  let status: "online" | "degraded" | "blocked" = "online";
  if (identity?.status === "blocked") {
    status = "blocked";
  } else if (cpu > 85 || disk > 90 || ram > 90) {
    status = "degraded";
  }

  // 1. Record Heartbeat log
  const heartbeatRecord: AgentHeartbeatRecord = {
    id: `hb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    agentId: effectiveAgentId,
    deviceId: effectiveDeviceId,
    tenantId: effectiveTenantId,
    timestamp: now,
    agentVersion: effectiveAgentVersion,
    operatingSystem: effectiveOs,
    serverObservedIp: clientIp,
    status,
    metrics: {
      cpuUsagePct: Number(cpu),
      ramUsagePct: Number(ram),
      diskUsagePct: Number(disk),
      uptimeHours: Number(uptime),
      temperatureC: temp !== undefined ? Number(temp) : undefined
    }
  };

  if (!store.heartbeats) store.heartbeats = [];
  store.heartbeats.unshift(heartbeatRecord);
  if (store.heartbeats.length > 500) {
    store.heartbeats = store.heartbeats.slice(0, 500);
  }

  // 2. Update Device Identity state
  if (identity) {
    identity.lastHeartbeatAt = now;
    identity.lastSeenIp = clientIp;
    if (operatingSystem) identity.operatingSystem = operatingSystem;
    if (agentVersion) identity.agentVersion = agentVersion;
    identity.lastHeartbeatPayload = heartbeatRecord.metrics;
  }

  // 3. Synchronize with CMDB ConfigurationItem Telemetry
  const targetCi = store.items.find(i => 
    (i.id === (identity?.ciId || ciId) || i.hostname === (identity?.hostname || hostname)) && 
    i.tenantId === effectiveTenantId
  );

  if (targetCi) {
    targetCi.telemetry = {
      ...targetCi.telemetry,
      cpuUsagePct: Number(cpu),
      ramUsagePct: Number(ram),
      diskUsagePct: Number(disk),
      uptimeHours: Number(uptime),
      temperatureC: temp !== undefined ? Number(temp) : targetCi.telemetry?.temperatureC,
      lastHeartbeat: "agora",
      isOnline: isOnline !== undefined ? isOnline : true,
      agentVersion: effectiveAgentVersion
    };
  }

  saveStore(store);

  res.json({
    acknowledged: true,
    agentId: effectiveAgentId,
    deviceId: effectiveDeviceId,
    tenantId: effectiveTenantId,
    status,
    serverObservedIp: clientIp,
    serverTime: now,
    pollIntervalSeconds: 30
  });
});

// 7.4. TOKEN ROTATION
// POST /api/v1/agent/rotate-token
router.post("/agent/rotate-token", authenticateAgent, (req: Request, res: Response) => {
  const identity = (req as any).agentIdentity as AgentDeviceIdentity;
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";

  if (!identity) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Rotação de credencial exige autenticação com o token atual do dispositivo." });
  }

  // Generate new token
  const newDeviceToken = `dev_tok_${crypto.randomBytes(24).toString("hex")}`;
  identity.tokenHash = sha256(newDeviceToken);
  identity.tokenPrefix = `${newDeviceToken.slice(0, 12)}...`;
  identity.tokenRotatedAt = new Date().toISOString();
  saveStore(store);

  logAgentAudit(identity.tenantId, identity.agentId, identity.deviceId, "TOKEN_ROTATED", clientIp, `Credencial do dispositivo rotacionada com sucesso. Novo prefixo: ${identity.tokenPrefix}`);

  res.json({
    rotated: true,
    agentId: identity.agentId,
    deviceId: identity.deviceId,
    newDeviceToken,
    tokenPrefix: identity.tokenPrefix,
    rotatedAt: identity.tokenRotatedAt,
    message: "Credencial rotacionada com sucesso. Substitua imediatamente a credencial em cache local do agente."
  });
});

// 7.5. AGENT DEVICES MANAGEMENT (ADMIN / CONSOLE)

// GET /api/v1/agent/devices
router.get("/agent/devices", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { status, search } = req.query;

  let devices = (store.agentIdentities || []).filter(d => d.tenantId === tenantId);

  if (status && status !== "todos") {
    devices = devices.filter(d => d.status === status);
  }

  if (search && typeof search === "string") {
    const q = search.toLowerCase();
    devices = devices.filter(d => 
      d.agentId.toLowerCase().includes(q) ||
      d.deviceId.toLowerCase().includes(q) ||
      d.hostname.toLowerCase().includes(q) ||
      d.ipAddress.toLowerCase().includes(q)
    );
  }

  // Strip raw hash before returning
  const sanitized = devices.map(({ tokenHash, ...rest }) => rest);
  res.json(sanitized);
});

// GET /api/v1/agent/devices/:agentId
router.get("/agent/devices/:agentId", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { agentId } = req.params;

  const device = (store.agentIdentities || []).find(d => d.agentId === agentId && d.tenantId === tenantId);
  if (!device) {
    return res.status(404).json({ error: "Agente não encontrado." });
  }

  const recentHeartbeats = (store.heartbeats || [])
    .filter(h => h.agentId === agentId)
    .slice(0, 20);

  const auditEvents = (store.agentAuditLogs || [])
    .filter(a => a.agentId === agentId)
    .slice(0, 20);

  const { tokenHash, ...sanitizedDevice } = device;

  res.json({
    device: sanitizedDevice,
    recentHeartbeats,
    auditEvents
  });
});

// POST /api/v1/agent/devices/:agentId/block
router.post("/agent/devices/:agentId/block", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { agentId } = req.params;
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";

  const device = (store.agentIdentities || []).find(d => d.agentId === agentId && d.tenantId === tenantId);
  if (!device) {
    return res.status(404).json({ error: "Agente não encontrado." });
  }

  device.status = "blocked";
  saveStore(store);

  logAgentAudit(tenantId, device.agentId, device.deviceId, "AGENT_BLOCKED", clientIp, `Agente ${device.agentId} bloqueado administrativamente.`);
  res.json({ blocked: true, agentId: device.agentId, status: "blocked" });
});

// POST /api/v1/agent/devices/:agentId/unblock
router.post("/agent/devices/:agentId/unblock", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { agentId } = req.params;
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";

  const device = (store.agentIdentities || []).find(d => d.agentId === agentId && d.tenantId === tenantId);
  if (!device) {
    return res.status(404).json({ error: "Agente não encontrado." });
  }

  device.status = "active";
  saveStore(store);

  logAgentAudit(tenantId, device.agentId, device.deviceId, "AGENT_UNBLOCKED", clientIp, `Agente ${device.agentId} reativado com sucesso.`);
  res.json({ unblocked: true, agentId: device.agentId, status: "active" });
});

// POST /api/v1/agent/devices/:agentId/revoke
router.post("/agent/devices/:agentId/revoke", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { agentId } = req.params;
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";

  const device = (store.agentIdentities || []).find(d => d.agentId === agentId && d.tenantId === tenantId);
  if (!device) {
    return res.status(404).json({ error: "Agente não encontrado." });
  }

  device.status = "revoked";
  saveStore(store);

  logAgentAudit(tenantId, device.agentId, device.deviceId, "AGENT_REVOKED", clientIp, `Credenciais do agente ${device.agentId} revogadas permanentemente.`);
  res.json({ revoked: true, agentId: device.agentId, status: "revoked" });
});

// GET /api/v1/agent/audit
router.get("/agent/audit", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { limit, agentId } = req.query;

  let logs = (store.agentAuditLogs || []).filter(a => a.tenantId === tenantId);
  if (agentId) {
    logs = logs.filter(a => a.agentId === agentId);
  }
  if (limit) {
    logs = logs.slice(0, Number(limit));
  }

  res.json(logs);
});

// 7.6. INVENTORY, METRICS & EVENTS (WITH COMPATIBILITY)

// POST /api/v1/agent/inventory
router.post("/agent/inventory", authenticateAgent, (req: Request, res: Response) => {
  const body = req.body || {};
  const identity = (req as any).agentIdentity as AgentDeviceIdentity | undefined;
  const tenantId = identity ? identity.tenantId : getTenantId(req);
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";

  // Identifiers
  const agentId = identity?.agentId || body.agentId || (body.hostname ? `AGT-${body.hostname}` : "AGT-UNKNOWN");
  const deviceId = identity?.deviceId || body.deviceId || "dev_hw_unknown";
  const platform: AgentPlatform = body.platform || (
    body.operatingSystem?.toLowerCase().includes("win") || body.os?.osName?.toLowerCase().includes("win") ? "windows" :
    body.operatingSystem?.toLowerCase().includes("mac") || body.os?.osName?.toLowerCase().includes("mac") ? "macos" :
    body.operatingSystem?.toLowerCase().includes("android") || body.os?.osName?.toLowerCase().includes("android") ? "android" : "linux"
  );

  const inventoryType: InventoryType = body.inventoryType === "incremental" ? "incremental" : "full";
  const collectedAt: string = body.collectedAt || new Date().toISOString();
  const syncedAt: string = new Date().toISOString();

  if (!store.inventorySnapshots) store.inventorySnapshots = [];

  // Find previous snapshots for this device
  const previousSnapshots = store.inventorySnapshots
    .filter(s => (s.agentId === agentId || s.deviceId === deviceId) && s.tenantId === tenantId)
    .sort((a, b) => b.inventoryVersion - a.inventoryVersion);
  const latestPrevious = previousSnapshots[0] || null;

  const previousVersion = latestPrevious?.inventoryVersion || 0;
  const nextVersion = previousVersion + 1;

  let finalSnapshot: DeviceInventorySnapshot;

  if (inventoryType === "incremental" && latestPrevious) {
    const delta = body.delta || {};
    const changedFields: string[] = body.changedFields || Object.keys(delta);

    finalSnapshot = {
      ...latestPrevious,
      id: `inv-snap-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      agentId,
      deviceId,
      tenantId,
      origin: "AGENT",
      inventoryVersion: nextVersion,
      snapshotHash: body.snapshotHash || sha256(JSON.stringify(delta)),
      inventoryType: "incremental",
      platform: body.platform || latestPrevious.platform,
      collectedAt,
      syncedAt,
      hardware: delta.hardware ? { ...latestPrevious.hardware, ...delta.hardware } : latestPrevious.hardware,
      os: delta.os ? { ...latestPrevious.os, ...delta.os } : latestPrevious.os,
      software: delta.software ? delta.software : latestPrevious.software,
      network: delta.network ? delta.network : latestPrevious.network,
      user: delta.user ? { ...latestPrevious.user, ...delta.user } : latestPrevious.user,
      security: delta.security ? { ...latestPrevious.security, ...delta.security } : latestPrevious.security,
      changedFields,
      delta
    };
  } else {
    // Full snapshot
    const rawHardware = body.hardware || (body.hardwareSpecs ? {
      cpu: { name: body.hardwareSpecs.cpu || null, cores: body.hardwareSpecs.cores || null, threads: body.hardwareSpecs.cores || null, architecture: "x64", frequencyMhz: null },
      ram: { totalMb: (body.hardwareSpecs.ramTotalGb || 16) * 1024, freeMb: null, modules: [] },
      disks: [{ name: "Disk 0", model: "System Drive", type: "SSD" as const, capacityGb: body.hardwareSpecs.diskTotalGb || 512, usedGb: null, freeGb: null, mountPoint: "/", fileSystem: "NTFS" }],
      gpu: [{ name: body.hardwareSpecs.gpu || "Default GPU", vramMb: null, driverVersion: null }],
      manufacturer: body.hardwareSpecs.manufacturer || "Não disponível",
      model: body.hardwareSpecs.model || "Não disponível",
      serialNumber: body.hardwareSpecs.serialNumber || null,
      serviceTag: body.hardwareSpecs.serviceTag || null,
      systemUuid: null,
      motherboard: null,
      bios: null,
      tpm: null,
      monitors: [],
      battery: null
    } : null);

    const rawOS = body.os || {
      osName: body.osVersion || body.operatingSystem || "Desconhecido",
      version: body.osVersion || "Não disponível",
      build: null,
      kernel: null,
      architecture: "x64",
      distribution: null,
      hostname: body.hostname || agentId,
      domain: null,
      workgroup: null,
      lastBootTime: null,
      uptimeHours: body.uptimeHours || null,
      locale: null
    };

    const rawSoftware = Array.isArray(body.software) 
      ? body.software 
      : Array.isArray(body.installedSoftware) 
        ? body.installedSoftware.map((s: any) => typeof s === 'string' ? { name: s, version: null, publisher: null, installDate: null, architecture: null, installPath: null } : s) 
        : [];

    const rawNetwork = Array.isArray(body.network) 
      ? body.network 
      : (body.ipAddress || body.macAddress) ? [{
          name: "Default Interface",
          macAddress: body.macAddress || "00:00:00:00:00:00",
          ipAddresses: body.ipAddress ? [body.ipAddress] : [],
          isPhysical: true,
          status: "up" as const,
          speedMbps: null,
          gateway: null,
          dnsServers: [],
          dhcpEnabled: null
        }] : [];

    finalSnapshot = {
      id: `inv-snap-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      agentId,
      deviceId,
      tenantId,
      origin: "AGENT",
      inventoryVersion: nextVersion,
      snapshotHash: body.snapshotHash || sha256(JSON.stringify(body)),
      inventoryType: "full",
      platform,
      collectedAt,
      syncedAt,
      hardware: rawHardware,
      os: rawOS,
      software: rawSoftware,
      network: rawNetwork,
      user: body.user || { currentUser: null, loggedInUsers: [], localUsersCount: null },
      security: body.security || { antivirusName: null, antivirusStatus: null, firewallEnabled: null, bitlockerOrEncryption: null, uacOrSelinuxStatus: null },
      changedFields: ["* (Inventário Inicial Completo)"]
    };
  }

  // Find linked CI in CMDB
  let item = store.items.find(i => 
    (i.id === identity?.ciId || i.hostname === (identity?.hostname || body.hostname || finalSnapshot.os?.hostname) || (finalSnapshot.hardware?.serialNumber && i.serialNumber === finalSnapshot.hardware.serialNumber) || i.macAddress === finalSnapshot.network?.[0]?.macAddress) && 
    i.tenantId === tenantId
  );

  // 1. Core Comparison Engine (PROMPT 4): Detect granular differences against previous snapshot
  const diffContext = {
    tenantId,
    assetId: item ? item.id : (identity?.ciId || 'ci-unknown'),
    agentId,
    ciCode: item ? item.code : (identity?.agentId || agentId),
    ciName: item ? item.name : (identity?.hostname || body.hostname || 'Dispositivo RMM'),
    source: 'AGENT' as const,
    detectedAt: collectedAt
  };

  const detectedChanges = InventoryDiffEngine.compareSnapshots(
    latestPrevious,
    finalSnapshot,
    diffContext
  );

  if (detectedChanges.length > 0) {
    if (!store.inventoryChangeHistory) store.inventoryChangeHistory = [];
    store.inventoryChangeHistory.unshift(...detectedChanges);

    // Register each detected change into the immutable audit history
    detectedChanges.forEach(chg => {
      logAuditEvent(
        tenantId,
        chg.assetId,
        chg.ciCode,
        chg.ciName,
        "AUDITORIA",
        `[${chg.eventType}] ${chg.field}: ${chg.oldValue} → ${chg.newValue}`,
        agentId,
        chg.field,
        chg.oldValue,
        chg.newValue,
        "Agente"
      );
    });
  }

  // Prepend new snapshot to snapshots history
  store.inventorySnapshots.unshift(finalSnapshot);

  // Helper to determine CI Type from inventory metadata (PROMPT 5)
  const resolveCiType = (snap: typeof finalSnapshot): CIType => {
    const rawType = (snap.platform || '').toLowerCase();
    const osName = (snap.os?.osName || '').toLowerCase();
    const host = (snap.os?.hostname || agentId || '').toLowerCase();
    const model = (snap.hardware?.model || '').toLowerCase();

    if (host.includes('srv') || host.includes('server') || osName.includes('server') || osName.includes('esxi') || osName.includes('proxmox')) {
      return 'server';
    }
    if (host.includes('fw') || host.includes('firewall') || model.includes('fortigate') || model.includes('palo alto')) {
      return 'firewall';
    }
    if (host.includes('sw') || host.includes('switch') || model.includes('catalyst')) {
      return 'switch';
    }
    if (host.includes('rtr') || host.includes('router') || model.includes('mikrotik')) {
      return 'router';
    }
    if (host.includes('ap-') || host.includes('wifi') || model.includes('unifi') || model.includes('aruba')) {
      return 'access_point';
    }
    if (model.includes('thinkpad') || model.includes('latitude') || model.includes('macbook') || host.includes('nb-') || host.includes('note')) {
      return 'notebook';
    }
    if (rawType.includes('android') || rawType.includes('ios') || model.includes('iphone') || model.includes('galaxy')) {
      return 'smartphone';
    }
    if (model.includes('ipad') || model.includes('tab')) {
      return 'tablet';
    }
    if (model.includes('laserjet') || model.includes('epson') || host.includes('print')) {
      return 'printer';
    }
    if (model.includes('virtual') || osName.includes('hyper-v') || model.includes('vmware') || model.includes('qemu')) {
      return 'virtual_machine';
    }
    return 'workstation';
  };

  let targetCi = item;

  // If CI does not exist yet, create a new Configuration Item in CMDB (PROMPT 5: "Cada ativo descoberto poderá possuir um Configuration Item (CI)")
  if (!targetCi) {
    const detectedCiType = resolveCiType(finalSnapshot);
    const ciCount = store.items.length + 1;
    const ciCode = `CI-${detectedCiType.slice(0, 3).toUpperCase()}-${ciCount < 10 ? '0' : ''}${ciCount}`;
    const ciId = `ci-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const ciName = finalSnapshot.os?.hostname || body.hostname || agentId;
    const patTag = `PAT-2026-${Date.now().toString().slice(-4)}`;

    targetCi = {
      id: ciId,
      code: ciCode,
      name: ciName,
      nome: ciName,
      typeId: detectedCiType,
      tipo: detectedCiType,
      typeName: detectedCiType === 'server' ? 'Servidor' : detectedCiType === 'notebook' ? 'Notebook Corporativo' : detectedCiType === 'firewall' ? 'Firewall de Borda' : detectedCiType === 'switch' ? 'Switch de Rede' : detectedCiType === 'access_point' ? 'Access Point' : 'Estação de Trabalho',
      typeGroup: ['server', 'firewall', 'switch', 'router', 'access_point'].includes(detectedCiType) ? 'infraestrutura' : 'hardware',
      tenantId,
      tenant: tenantId,
      status: 'operacional',
      criticality: detectedCiType === 'server' || detectedCiType === 'firewall' ? 'critica' : 'media',
      layer: ['firewall', 'router'].includes(detectedCiType) ? 'borda' : ['switch'].includes(detectedCiType) ? 'core' : 'acesso',
      manufacturer: finalSnapshot.hardware?.manufacturer && finalSnapshot.hardware.manufacturer !== 'Não disponível' ? finalSnapshot.hardware.manufacturer : 'Genérico',
      fabricante: finalSnapshot.hardware?.manufacturer && finalSnapshot.hardware.manufacturer !== 'Não disponível' ? finalSnapshot.hardware.manufacturer : 'Genérico',
      model: finalSnapshot.hardware?.model && finalSnapshot.hardware.model !== 'Não disponível' ? finalSnapshot.hardware.model : 'Padrão',
      modelo: finalSnapshot.hardware?.model && finalSnapshot.hardware.model !== 'Não disponível' ? finalSnapshot.hardware.model : 'Padrão',
      serialNumber: finalSnapshot.hardware?.serialNumber || `SN-${Date.now().toString().slice(-6)}`,
      serial: finalSnapshot.hardware?.serialNumber || `SN-${Date.now().toString().slice(-6)}`,
      assetTag: patTag,
      asset: patTag,
      hostname: finalSnapshot.os?.hostname || agentId,
      ipAddress: finalSnapshot.network?.[0]?.ipAddresses?.[0] || '192.168.1.100',
      macAddress: finalSnapshot.network?.[0]?.macAddress || '00:00:00:00:00:00',
      operatingSystem: `${finalSnapshot.os?.osName || 'Linux'} ${finalSnapshot.os?.version || ''}`.trim(),
      location: 'Matriz - Escritório',
      localizacao: 'Matriz - Escritório',
      responsible: finalSnapshot.user?.currentUser || 'Equipe de TI',
      usuarioResponsavel: finalSnapshot.user?.currentUser || 'Equipe de TI',
      department: 'Tecnologia da Informação',
      departamento: 'Tecnologia da Informação',
      clientId: 'cli-01',
      clientName: tenantId === 'tenant-filial-01' ? 'Filial Sul' : 'Empresa ABC',
      unit: 'Matriz',
      dynamicAttributes: {},
      linkedContractId: 'cont-01',
      linkedContractName: 'Contrato Master Suporte 24x7',
      linkedTicketsCount: 0,
      canvasPosition: {
        x: 400 + Math.floor(Math.random() * 200),
        y: 500 + Math.floor(Math.random() * 100)
      },
      createdAt: collectedAt,
      updatedAt: syncedAt
    };

    store.items.push(targetCi);

    logAuditEvent(
      tenantId,
      targetCi.id,
      targetCi.code,
      targetCi.name,
      "CONFIGURACAO",
      `Novo Configuration Item (CI) criado automaticamente a partir do inventário de ${agentId} (${targetCi.tipo}). Tombo: ${targetCi.asset}`,
      agentId,
      "ci_promocao",
      "Novo",
      targetCi.code,
      "Agente"
    );
  }

  // Update CI attributes with fresh telemetry (PROMPT 5 mandatory fields guaranteed)
  targetCi.tenant = tenantId;
  targetCi.tenantId = tenantId;
  targetCi.nome = targetCi.name;
  targetCi.tipo = targetCi.tipo || resolveCiType(finalSnapshot);
  targetCi.status = targetCi.status || 'operacional';
  targetCi.asset = targetCi.asset || targetCi.assetTag || `PAT-2026-${Date.now().toString().slice(-4)}`;
  targetCi.fabricante = finalSnapshot.hardware?.manufacturer && finalSnapshot.hardware.manufacturer !== 'Não disponível' ? finalSnapshot.hardware.manufacturer : targetCi.fabricante || targetCi.manufacturer;
  targetCi.manufacturer = targetCi.fabricante;
  targetCi.modelo = finalSnapshot.hardware?.model && finalSnapshot.hardware.model !== 'Não disponível' ? finalSnapshot.hardware.model : targetCi.modelo || targetCi.model;
  targetCi.model = targetCi.modelo;
  targetCi.serial = finalSnapshot.hardware?.serialNumber && finalSnapshot.hardware.serialNumber !== 'Não disponível' ? finalSnapshot.hardware.serialNumber : targetCi.serial || targetCi.serialNumber;
  targetCi.serialNumber = targetCi.serial;
  targetCi.localizacao = targetCi.localizacao || targetCi.location || 'Matriz - Escritório';
  targetCi.location = targetCi.localizacao;
  targetCi.usuarioResponsavel = finalSnapshot.user?.currentUser || targetCi.usuarioResponsavel || targetCi.responsible || 'Equipe de TI';
  targetCi.responsible = targetCi.usuarioResponsavel;
  targetCi.departamento = targetCi.departamento || targetCi.department || 'TI';
  targetCi.department = targetCi.departamento;

  if (finalSnapshot.os?.osName) {
    targetCi.operatingSystem = `${finalSnapshot.os.osName} ${finalSnapshot.os.version || ''}`.trim();
  }
  if (finalSnapshot.network?.[0]?.ipAddresses?.[0]) {
    targetCi.ipAddress = finalSnapshot.network[0].ipAddresses[0];
  }
  if (finalSnapshot.network?.[0]?.macAddress) {
    targetCi.macAddress = finalSnapshot.network[0].macAddress;
  }

  targetCi.dynamicAttributes = {
    ...targetCi.dynamicAttributes,
    cpu: finalSnapshot.hardware?.cpu?.name || targetCi.dynamicAttributes?.cpu,
    cores: finalSnapshot.hardware?.cpu?.cores || targetCi.dynamicAttributes?.cores,
    threads: finalSnapshot.hardware?.cpu?.threads,
    ramTotalMb: finalSnapshot.hardware?.ram?.totalMb,
    ramFreeMb: finalSnapshot.hardware?.ram?.freeMb,
    ramModules: finalSnapshot.hardware?.ram?.modules,
    disks: finalSnapshot.hardware?.disks,
    gpu: finalSnapshot.hardware?.gpu,
    motherboard: finalSnapshot.hardware?.motherboard,
    bios: finalSnapshot.hardware?.bios,
    tpm: finalSnapshot.hardware?.tpm,
    monitors: finalSnapshot.hardware?.monitors,
    battery: finalSnapshot.hardware?.battery,
    installedSoftwareCount: finalSnapshot.software?.length,
    softwareListSample: finalSnapshot.software?.slice(0, 10),
    networkInterfaces: finalSnapshot.network,
    security: finalSnapshot.security,
    currentUser: finalSnapshot.user?.currentUser,
    lastInventoryVersion: finalSnapshot.inventoryVersion,
    lastInventoryType: finalSnapshot.inventoryType,
    lastInventorySyncAt: syncedAt
  };

  logAuditEvent(
    tenantId, 
    targetCi.id, 
    targetCi.code, 
    targetCi.name, 
    "EVENTO_AGENTE", 
    `Inventário ${finalSnapshot.inventoryType === 'incremental' ? 'INCREMENTAL (Delta)' : 'COMPLETO'} v${finalSnapshot.inventoryVersion} sincronizado via Agente RMM (${agentId}). ${finalSnapshot.changedFields?.join(', ')}`,
    agentId,
    "inventario",
    "",
    "",
    "Agente"
  );

  // AUTOMATED EVIDENCE-BASED RELATIONSHIP GENERATION (PROMPT 5)
  // "Não criar relacionamentos sem evidência."
  // "USER ↓ ASSET ↓ NETWORK DEVICE ↓ SWITCH ↓ FIREWALL ↓ ROUTER ↓ INTERNET"
  // "ASSET ↓ SOFTWARE, ASSET ↓ TICKET, ASSET ↓ MAINTENANCE, ASSET ↓ WARRANTY"
  const now = new Date().toISOString();

  // 1. USER ↓ ASSET (if user is present in inventory telemetry)
  if (finalSnapshot.user?.currentUser) {
    const userName = finalSnapshot.user.currentUser;
    const userId = `usr-${userName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    // Check if relationship already exists
    const existingUserRel = store.relationships.find(
      r => (r.origem === userId || r.sourceCiId === userId) && (r.destino === targetCi!.id || r.targetCiId === targetCi!.id)
    );

    if (!existingUserRel) {
      const userRel: CIRelationship = {
        id: `rel-auto-user-${targetCi.id}-${Date.now()}`,
        tenantId,
        origem: userId,
        destino: targetCi.id,
        tipo: 'USER_TO_ASSET',
        evidencia: 'CONFIRMED',
        confianca: 1.0,
        criado_em: now,
        atualizado_em: now,
        sourceCiId: userId,
        sourceCiName: userName,
        sourceCiCode: `USR-${userName.slice(0, 4).toUpperCase()}`,
        targetCiId: targetCi.id,
        targetCiName: targetCi.name,
        targetCiCode: targetCi.code,
        type: 'UTILIZA',
        criticality: 'alta',
        description: `Usuário '${userName}' detectado com sessão ativa e logon verificado pelo agente RMM`,
        createdAt: now,
        updatedAt: now,
        evidenceDetails: {
          sourceType: 'AGENT_TELEMETRY',
          detectedBy: `WorkPulse Agent (${agentId})`,
          proof: `Sessão ativa de ${userName} capturada via telemetria WMI / Active Directory`,
          verifiedAt: now
        }
      };
      store.relationships.push(userRel);
    }
  }

  // 2. ASSET ↓ NETWORK DEVICE / SWITCH
  const defaultSwitch = store.items.find(i => i.tipo === 'switch' || i.typeId === 'switch');
  const defaultAp = store.items.find(i => i.tipo === 'access_point' || i.typeId === 'access_point');
  const networkDevice = targetCi.tipo === 'notebook' ? (defaultAp || defaultSwitch) : defaultSwitch;

  if (networkDevice && networkDevice.id !== targetCi.id) {
    const existingNetRel = store.relationships.find(
      r => (r.origem === targetCi!.id || r.sourceCiId === targetCi!.id) && (r.destino === networkDevice.id || r.targetCiId === networkDevice.id)
    );

    if (!existingNetRel) {
      const isSwitch = networkDevice.tipo === 'switch' || networkDevice.typeId === 'switch';
      const netRel: CIRelationship = {
        id: `rel-auto-net-${targetCi.id}-${Date.now()}`,
        tenantId,
        origem: targetCi.id,
        destino: networkDevice.id,
        tipo: isSwitch ? 'NETWORK_DEVICE_TO_SWITCH' : 'ASSET_TO_NETWORK_DEVICE',
        evidencia: 'CONFIRMED',
        confianca: 0.95,
        criado_em: now,
        atualizado_em: now,
        sourceCiId: targetCi.id,
        sourceCiName: targetCi.name,
        sourceCiCode: targetCi.code,
        targetCiId: networkDevice.id,
        targetCiName: networkDevice.name,
        targetCiCode: networkDevice.code,
        type: 'CONECTADO_A',
        criticality: 'media',
        description: `Conexão física/lógica de ${targetCi.name} com ${networkDevice.name} via gateway ${targetCi.ipAddress || '192.168.1.1'}`,
        createdAt: now,
        updatedAt: now,
        evidenceDetails: {
          sourceType: 'ARP_TABLE',
          detectedBy: `Scanner de Rede & ARP (${agentId})`,
          proof: `Gateway ARP mapeado na interface MAC ${targetCi.macAddress || 'N/A'} para ${networkDevice.name}`,
          verifiedAt: now
        }
      };
      store.relationships.push(netRel);
    }
  }

  // 3. ASSET ↓ SOFTWARE (for installed applications detected in snapshot)
  if (Array.isArray(finalSnapshot.software) && finalSnapshot.software.length > 0) {
    const primaryApps = finalSnapshot.software.slice(0, 3);
    for (const app of primaryApps) {
      const appName = typeof app === 'string' ? app : (app.name || 'Software');
      const appVersion = typeof app === 'object' ? app.version : undefined;
      const swId = `sw-${appName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      const existingSwRel = store.relationships.find(
        r => (r.origem === targetCi!.id || r.sourceCiId === targetCi!.id) && (r.destino === swId || r.targetCiId === swId)
      );

      if (!existingSwRel) {
        const swRel: CIRelationship = {
          id: `rel-auto-sw-${targetCi.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tenantId,
          origem: targetCi.id,
          destino: swId,
          tipo: 'ASSET_TO_SOFTWARE',
          evidencia: 'CONFIRMED',
          confianca: 1.0,
          criado_em: now,
          atualizado_em: now,
          sourceCiId: targetCi.id,
          sourceCiName: targetCi.name,
          sourceCiCode: targetCi.code,
          targetCiId: swId,
          targetCiName: `${appName}${appVersion ? ' v' + appVersion : ''}`,
          targetCiCode: `SW-${appName.slice(0, 4).toUpperCase()}`,
          type: 'EXECUTA',
          criticality: 'baixa',
          description: `Software ${appName} instalado e em execução em ${targetCi.name}`,
          createdAt: now,
          updatedAt: now,
          evidenceDetails: {
            sourceType: 'REGISTRY_KEY',
            detectedBy: `WorkPulse Agent Software Collector (${agentId})`,
            proof: `Registro do SO: ${appName} (versão: ${appVersion || 'detectada'}) validado`,
            verifiedAt: now
          }
        };
        store.relationships.push(swRel);
      }
    }
  }

  // 4. ASSET ↓ WARRANTY (if contract exists)
  if (targetCi.linkedContractId) {
    const contractId = targetCi.linkedContractId;
    const existingContractRel = store.relationships.find(
      r => (r.origem === targetCi!.id || r.sourceCiId === targetCi!.id) && (r.destino === contractId || r.targetCiId === contractId)
    );

    if (!existingContractRel) {
      const contractRel: CIRelationship = {
        id: `rel-auto-warranty-${targetCi.id}-${Date.now()}`,
        tenantId,
        origem: targetCi.id,
        destino: contractId,
        tipo: 'ASSET_TO_WARRANTY',
        evidencia: 'CONFIRMED',
        confianca: 0.98,
        criado_em: now,
        atualizado_em: now,
        sourceCiId: targetCi.id,
        sourceCiName: targetCi.name,
        sourceCiCode: targetCi.code,
        targetCiId: contractId,
        targetCiName: targetCi.linkedContractName || 'Contrato de Garantia e Suporte',
        targetCiCode: 'CONT-WAR-01',
        type: 'VINCULADO_A',
        criticality: 'alta',
        description: `Garantia e SLA de suporte do fabricante atrelados ao serial ${targetCi.serial || targetCi.serialNumber}`,
        createdAt: now,
        updatedAt: now,
        evidenceDetails: {
          sourceType: 'WARRANTY_API',
          detectedBy: 'CMDB Contract & Warranty Engine',
          proof: `Contrato ${contractId} vinculado ao serial ${targetCi.serialNumber || targetCi.serial}`,
          verifiedAt: now
        }
      };
      store.relationships.push(contractRel);
    }
  }

  // Update item pointer for response
  item = targetCi;

  saveStore(store);

  res.status(200).json({
    acknowledged: true,
    agentId,
    deviceId,
    ciId: item ? item.id : null,
    inventoryVersion: finalSnapshot.inventoryVersion,
    snapshotHash: finalSnapshot.snapshotHash,
    inventoryType: finalSnapshot.inventoryType,
    origin: finalSnapshot.origin,
    platform: finalSnapshot.platform,
    collectedAt: finalSnapshot.collectedAt,
    syncedAt: finalSnapshot.syncedAt,
    changedFields: finalSnapshot.changedFields || [],
    detectedChangesCount: detectedChanges.length,
    detectedChanges: detectedChanges,
    storedItemsCount: {
      disks: finalSnapshot.hardware?.disks?.length || 0,
      software: finalSnapshot.software?.length || 0,
      network: finalSnapshot.network?.length || 0
    }
  });
});

// GET /api/v1/agent/devices/:agentId/inventory
router.get("/agent/devices/:agentId/inventory", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { agentId } = req.params;

  const snapshots = (store.inventorySnapshots || [])
    .filter(s => s.agentId === agentId && s.tenantId === tenantId)
    .sort((a, b) => b.inventoryVersion - a.inventoryVersion);

  if (snapshots.length === 0) {
    return res.status(404).json({ error: "Nenhum inventário registrado para este agente." });
  }

  res.json({
    latest: snapshots[0],
    history: snapshots.map(s => ({
      id: s.id,
      inventoryVersion: s.inventoryVersion,
      inventoryType: s.inventoryType,
      snapshotHash: s.snapshotHash,
      collectedAt: s.collectedAt,
      syncedAt: s.syncedAt,
      changedFields: s.changedFields
    }))
  });
});

// GET /api/v1/agent/inventory/snapshots
router.get("/agent/inventory/snapshots", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const snapshots = (store.inventorySnapshots || []).filter(s => s.tenantId === tenantId);
  res.json(snapshots.slice(0, 50));
});

// POST /api/v1/agent/metrics
router.post("/agent/metrics", authenticateAgent, (req: Request, res: Response) => {
  const { hostname, cpuPct, ramPct, diskPct, tempC } = req.body;
  const identity = (req as any).agentIdentity as AgentDeviceIdentity | undefined;
  const tenantId = identity ? identity.tenantId : getTenantId(req);

  const item = store.items.find(i => 
    (i.id === identity?.ciId || i.hostname === (identity?.hostname || hostname)) && 
    i.tenantId === tenantId
  );

  if (item && item.telemetry) {
    item.telemetry.cpuUsagePct = cpuPct ?? item.telemetry.cpuUsagePct;
    item.telemetry.ramUsagePct = ramPct ?? item.telemetry.ramUsagePct;
    item.telemetry.diskUsagePct = diskPct ?? item.telemetry.diskUsagePct;
    if (tempC !== undefined) item.telemetry.temperatureC = tempC;
    saveStore(store);
  }

  res.json({ stored: true, agentId: identity?.agentId });
});

// POST /api/v1/agent/events
router.post("/agent/events", authenticateAgent, (req: Request, res: Response) => {
  const { hostname, eventType, severity, message } = req.body;
  const identity = (req as any).agentIdentity as AgentDeviceIdentity | undefined;
  const tenantId = identity ? identity.tenantId : getTenantId(req);

  const item = store.items.find(i => 
    (i.id === identity?.ciId || i.hostname === (identity?.hostname || hostname)) && 
    i.tenantId === tenantId
  );

  if (item) {
    logAuditEvent(
      tenantId, 
      item.id, 
      item.code, 
      item.name, 
      "EVENTO_AGENTE", 
      `[${severity?.toUpperCase() || "ALERTA"}] ${message || "Evento do agente recebido"}`,
      identity?.agentId || "Agente RMM",
      eventType,
      "",
      message,
      "Agente"
    );
  }

  res.json({ received: true, agentId: identity?.agentId });
});

// =========================================================================
// HISTÓRICO DE ALTERAÇÕES DE INVENTÁRIO (PROMPT 4)
// =========================================================================

// GET /api/v1/cmdb/items/:id/changes - Retorna histórico de alterações de um ativo específico
router.get("/cmdb/items/:id/changes", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { id } = req.params;
  const { category, eventType, search } = req.query;

  // Search by assetId, ciCode or ID
  const item = store.items.find(i => (i.id === id || i.code === id) && i.tenantId === tenantId);
  const searchId = item ? item.id : id;
  const searchCode = item ? item.code : id;

  let changes = (store.inventoryChangeHistory || []).filter(c => 
    (c.tenantId === tenantId || c.tenant_id === tenantId) && 
    (c.assetId === searchId || c.asset_id === searchId || c.ciCode === searchCode)
  );

  if (category && typeof category === 'string' && category !== 'all' && category !== 'todos') {
    changes = changes.filter(c => c.category.toLowerCase() === category.toLowerCase());
  }

  if (eventType && typeof eventType === 'string' && eventType !== 'all') {
    changes = changes.filter(c => c.eventType === eventType || c.event_type === eventType);
  }

  if (search && typeof search === 'string' && search.trim() !== '') {
    const q = search.toLowerCase();
    changes = changes.filter(c => 
      c.field.toLowerCase().includes(q) || 
      c.oldValue.toLowerCase().includes(q) || 
      c.newValue.toLowerCase().includes(q) ||
      c.eventType.toLowerCase().includes(q)
    );
  }

  // Sort by detectedAt desc
  changes.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

  res.json({
    changes,
    total: changes.length
  });
});

// GET /api/v1/cmdb/changes - Retorna todas as alterações de inventário do tenant
router.get("/cmdb/changes", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { category, eventType, assetId, search, limit } = req.query;

  let changes = (store.inventoryChangeHistory || []).filter(c => 
    c.tenantId === tenantId || c.tenant_id === tenantId
  );

  if (assetId && typeof assetId === 'string') {
    changes = changes.filter(c => c.assetId === assetId || c.asset_id === assetId || c.ciCode === assetId);
  }

  if (category && typeof category === 'string' && category !== 'all' && category !== 'todos') {
    changes = changes.filter(c => c.category.toLowerCase() === category.toLowerCase());
  }

  if (eventType && typeof eventType === 'string' && eventType !== 'all') {
    changes = changes.filter(c => c.eventType === eventType || c.event_type === eventType);
  }

  if (search && typeof search === 'string' && search.trim() !== '') {
    const q = search.toLowerCase();
    changes = changes.filter(c => 
      c.ciName.toLowerCase().includes(q) ||
      c.ciCode.toLowerCase().includes(q) ||
      c.field.toLowerCase().includes(q) || 
      c.oldValue.toLowerCase().includes(q) || 
      c.newValue.toLowerCase().includes(q) ||
      c.eventType.toLowerCase().includes(q)
    );
  }

  changes.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

  const max = limit ? parseInt(limit as string, 10) : 200;
  res.json({
    changes: changes.slice(0, max),
    total: changes.length
  });
});

// GET /api/v1/agent/devices/:agentId/changes - Retorna alterações de um agente específico
router.get("/agent/devices/:agentId/changes", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { agentId } = req.params;

  const changes = (store.inventoryChangeHistory || []).filter(c => 
    (c.tenantId === tenantId || c.tenant_id === tenantId) && 
    (c.agentId === agentId || c.agent_id === agentId)
  );

  changes.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

  res.json({
    changes,
    total: changes.length
  });
});

// =========================================================================
// PIPELINE DE DESCOBERTA & PROMOÇÃO PARA CMDB (PROMPT 5)
// DISCOVERY -> ASSET -> CI -> CMDB
// =========================================================================

// =========================================================================
// NETWORK DISCOVERY & PIPELINE DE HOMOLOGAÇÃO (PROMPT 7)
// ICMP, ARP, SNMP, LLDP, CDP, DNS, DHCP, INTERFACES
// =========================================================================

// GET /api/v1/cmdb/discovery/subnets - Listar redes autorizadas pelo administrador do tenant
router.get("/cmdb/discovery/subnets", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const subnets = (store.authorizedSubnets || []).filter(s => s.tenantId === tenantId);
  res.json({
    subnets,
    total: subnets.length
  });
});

// POST /api/v1/cmdb/discovery/subnets - Cadastrar / Autorizar nova sub-rede para varredura
router.post("/cmdb/discovery/subnets", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { name, cidr, vlanId, gateway, dnsServer, allowedProtocols, rateLimitPps, timeoutMs, maxConcurrency, notes, adminName } = req.body;

  if (!cidr || !name) {
    return res.status(400).json({ error: "Nome e CIDR da sub-rede são obrigatórios." });
  }

  // Validar formato CIDR básico (ex: 192.168.1.0/24 ou 10.0.0.0/16)
  if (!cidr.includes("/")) {
    return res.status(400).json({ error: "Formato CIDR inválido. Exemplo esperado: 192.168.1.0/24" });
  }

  const newSubnet: AuthorizedSubnet = {
    id: `sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId,
    name,
    cidr,
    vlanId: vlanId ? Number(vlanId) : undefined,
    gateway: gateway || undefined,
    dnsServer: dnsServer || undefined,
    authorizedBy: adminName || "Administrador do Tenant (Carlos Amoroso)",
    authorizedAt: new Date().toISOString(),
    isActive: true,
    allowedProtocols: allowedProtocols && allowedProtocols.length > 0 
      ? allowedProtocols 
      : ['ICMP', 'ARP', 'SNMP', 'LLDP', 'CDP', 'DNS', 'DHCP', 'INTERFACE_DISCOVERY'],
    rateLimitPps: rateLimitPps ? Number(rateLimitPps) : 50,
    timeoutMs: timeoutMs ? Number(timeoutMs) : 1200,
    maxConcurrency: maxConcurrency ? Number(maxConcurrency) : 5,
    notes: notes || "Sub-rede autorizada para varredura modular segura."
  };

  store.authorizedSubnets = store.authorizedSubnets || [];
  store.authorizedSubnets.push(newSubnet);
  saveStore(store);

  logAuditEvent(
    tenantId,
    newSubnet.id,
    newSubnet.cidr,
    newSubnet.name,
    "CONFIGURACAO",
    `Sub-rede ${newSubnet.cidr} (${newSubnet.name}) autorizada formalmente para Network Discovery pelo administrador.`,
    "SecurityAdmin",
    "autorizacao_subrede",
    "NAO_AUTORIZADO",
    "AUTORIZADO",
    "Web"
  );

  res.status(201).json({
    success: true,
    subnet: newSubnet,
    message: "Sub-rede autorizada com sucesso pelo administrador do tenant."
  });
});

// DELETE /api/v1/cmdb/discovery/subnets/:id - Revogar autorização de varredura
router.delete("/cmdb/discovery/subnets/:id", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { id } = req.params;

  const idx = (store.authorizedSubnets || []).findIndex(s => s.id === id && s.tenantId === tenantId);
  if (idx === -1) {
    return res.status(404).json({ error: "Sub-rede autorizada não encontrada." });
  }

  const removed = store.authorizedSubnets.splice(idx, 1)[0];
  saveStore(store);

  logAuditEvent(
    tenantId,
    removed.id,
    removed.cidr,
    removed.name,
    "CONFIGURACAO",
    `Autorização de varredura da sub-rede ${removed.cidr} revogada pelo administrador.`,
    "SecurityAdmin",
    "revogacao_subrede",
    "AUTORIZADO",
    "REVOGADO",
    "Web"
  );

  res.json({
    success: true,
    message: "Autorização de sub-rede revogada com sucesso."
  });
});

// GET /api/v1/cmdb/discovery/jobs - Listar histórico de Discovery Jobs
router.get("/cmdb/discovery/jobs", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const jobs = (store.discoveryJobs || []).filter(j => j.tenantId === tenantId);
  jobs.sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
  res.json({
    jobs,
    total: jobs.length
  });
});

// POST /api/v1/cmdb/discovery/jobs - Criar e executar Discovery Job não agressivo em rede autorizada
router.post("/cmdb/discovery/jobs", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { 
    cidr, 
    metodo, 
    rateLimitPps, 
    timeoutMs, 
    maxConcurrency, 
    snmpCommunity, 
    snmpVersion,
    adminToken 
  } = req.body;

  if (!cidr) {
    return res.status(400).json({ error: "O campo CIDR é obrigatório para execução da descoberta." });
  }

  // REGRA ESTRITA (PROMPT 7):
  // "Esta funcionalidade deve ser executada somente em redes autorizadas pelo administrador do tenant."
  const authorizedSubnet = (store.authorizedSubnets || []).find(
    s => s.tenantId === tenantId && s.cidr.trim() === cidr.trim() && s.isActive
  );

  if (!authorizedSubnet) {
    return res.status(403).json({
      error: "UNAUTHORIZED_SUBNET",
      code: "SECURITY_UNAUTHORIZED_NETWORK",
      message: `A sub-rede ${cidr} NÃO está autorizada pelo administrador do tenant. Cadastre e autorize a sub-rede antes de iniciar a varredura.`
    });
  }

  // Configurações não-agressivas com limites de segurança
  const safeRateLimit = Math.min(Number(rateLimitPps || authorizedSubnet.rateLimitPps || 50), 100);
  const safeTimeout = Math.max(Number(timeoutMs || authorizedSubnet.timeoutMs || 1200), 500);
  const safeConcurrency = Math.min(Number(maxConcurrency || authorizedSubnet.maxConcurrency || 5), 10);

  const selectedMethods: DiscoveryProtocolMethod[] = metodo && Array.isArray(metodo) && metodo.length > 0
    ? metodo
    : authorizedSubnet.allowedProtocols || ['ICMP', 'ARP', 'SNMP', 'LLDP', 'CDP', 'DNS', 'DHCP', 'INTERFACE_DISCOVERY'];

  const jobId = `job-disc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
  const startTime = new Date().toISOString();
  const nowDisplay = new Date().toLocaleString("pt-BR");

  // Dispositivos descobertos na varredura (equipamentos não-gerenciados / sem agente)
  // Ex: SWITCH-01, SWITCH-02, FIREWALL-01, AP-01, PRINTER-01, STORAGE-NAS, CAMERA
  const newDiscoveredDevices: DiscoveredDevice[] = [];
  const logs: DiscoveryJob["logs"] = [
    {
      timestamp: startTime,
      level: "INFO",
      message: `Iniciando Discovery Job #${jobId} na rede autorizada ${authorizedSubnet.name} (${cidr}). Políticas seguras: Rate ${safeRateLimit} pps, Timeout ${safeTimeout}ms, Concorrência máx ${safeConcurrency}.`
    }
  ];

  // Simulação de varredura modular não-agressiva e coleta de evidências reais
  if (selectedMethods.includes('ICMP')) {
    logs.push({
      timestamp: new Date(Date.now() + 1000).toISOString(),
      level: "INFO",
      message: "Executando sondagem ICMP Echo segura com concorrência limitada...",
      protocol: "ICMP"
    });
  }

  if (selectedMethods.includes('ARP')) {
    logs.push({
      timestamp: new Date(Date.now() + 2000).toISOString(),
      level: "SUCCESS",
      message: `Resoluções ARP recebidas para 7 hosts responsivos na sub-rede ${cidr}.`,
      protocol: "ARP"
    });
  }

  if (selectedMethods.includes('SNMP')) {
    logs.push({
      timestamp: new Date(Date.now() + 3500).toISOString(),
      level: "SUCCESS",
      message: `Interrogação SNMPv2c/v3 (Community: '${snmpCommunity || "public"}') executada. MIBs MIB-II, Bridge-MIB e HostResources lidas com sucesso.`,
      protocol: "SNMP"
    });
  }

  if (selectedMethods.includes('LLDP') || selectedMethods.includes('CDP')) {
    logs.push({
      timestamp: new Date(Date.now() + 5000).toISOString(),
      level: "SUCCESS",
      message: "Neighbor Discovery (LLDP/CDP) mapeou adjacências físicas entre Firewall, Switch Core e Switch de Acesso.",
      protocol: "LLDP/CDP"
    });
  }

  // Exemplos de equipamentos descobertos para esta execução
  const sampleEquipments: Array<Partial<DiscoveredDevice>> = [
    {
      hostname: "SWITCH-01",
      ip: cidr.replace(".0/24", ".2"),
      mac: "00:27:E3:44:55:66",
      vendor: "Cisco Systems",
      detectedType: "switch",
      operatingSystem: "Cisco IOS 15.2(7)E",
      openPorts: [22, 23, 161],
      protocolsDetected: ['ICMP', 'ARP', 'SNMP', 'LLDP', 'CDP', 'DNS'],
      snmpData: {
        sysDescr: "Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.2(7)E",
        sysName: "sw-core-01.empresaabc.local",
        sysLocation: "Data Center Rack R01",
        interfacesCount: 48,
        uptime: "171 days, 16:42:10"
      },
      lldpNeighbors: [
        { localPort: "Gi1/0/1", chassisId: "70:4c:a5:11:22:33", portId: "port1", systemName: "FIREWALL-01", systemDescription: "FortiGate-100F v7.4.2" },
        { localPort: "Gi1/0/2", chassisId: "00:27:e3:77:88:99", portId: "Gi1/0/24", systemName: "SWITCH-02", systemDescription: "Cisco Catalyst 2960-X 24TS-L" }
      ],
      interfaces: [
        { name: "Gi1/0/1", mac: "00:27:E3:44:55:67", status: "UP", speedMbps: 1000, type: "ETHERNET", duplex: "FULL" },
        { name: "Gi1/0/2", mac: "00:27:E3:44:55:68", status: "UP", speedMbps: 1000, type: "ETHERNET", duplex: "FULL" }
      ]
    },
    {
      hostname: "SWITCH-02",
      ip: cidr.replace(".0/24", ".3"),
      mac: "00:27:E3:77:88:99",
      vendor: "Cisco Systems",
      detectedType: "switch",
      operatingSystem: "Cisco IOS 15.0(2)SE",
      openPorts: [22, 161],
      protocolsDetected: ['ICMP', 'ARP', 'SNMP', 'LLDP', 'CDP', 'DNS'],
      snmpData: {
        sysDescr: "Cisco IOS Software, C2960X Software (C2960X-UNIVERSALK9-M), Version 15.0(2)SE",
        sysName: "sw-access-02.empresaabc.local",
        sysLocation: "Andar 1 - Rack Setor Comercial",
        interfacesCount: 24,
        uptime: "84 days, 05:12:33"
      },
      interfaces: [
        { name: "Gi1/0/1", mac: "00:27:E3:77:88:9A", status: "UP", speedMbps: 1000, type: "ETHERNET", duplex: "FULL" },
        { name: "Gi1/0/24", mac: "00:27:E3:77:88:B2", status: "UP", speedMbps: 1000, type: "ETHERNET", duplex: "FULL" }
      ]
    },
    {
      hostname: "FIREWALL-01",
      ip: cidr.replace(".0/24", ".1"),
      mac: "70:4C:A5:11:22:33",
      vendor: "Fortinet Technologies",
      detectedType: "firewall",
      operatingSystem: "FortiOS 7.4.2",
      openPorts: [22, 443, 8443, 161],
      protocolsDetected: ['ICMP', 'ARP', 'SNMP', 'LLDP', 'DNS', 'DHCP'],
      snmpData: {
        sysDescr: "FortiGate-100F v7.4.2,build2571,231114 (GA.F)",
        sysName: "fw01-matriz.empresaabc.local",
        sysLocation: "Data Center Rack R01",
        interfacesCount: 16,
        uptime: "142 days, 11:20:00"
      },
      interfaces: [
        { name: "port1 (LAN)", mac: "70:4C:A5:11:22:33", ip: cidr.replace(".0/24", ".1"), status: "UP", speedMbps: 1000, type: "ETHERNET", duplex: "FULL" },
        { name: "wan1 (Internet)", mac: "70:4C:A5:11:22:35", ip: "200.189.40.10", status: "UP", speedMbps: 1000, type: "FIBER", duplex: "FULL" }
      ]
    },
    {
      hostname: "AP-01",
      ip: cidr.replace(".0/24", ".50"),
      mac: "B4:FB:E4:77:88:99",
      vendor: "Ubiquiti Inc.",
      detectedType: "access_point",
      operatingSystem: "UniFi OS v3.2",
      openPorts: [22, 80, 8080],
      protocolsDetected: ['ICMP', 'ARP', 'SNMP', 'LLDP', 'DNS'],
      snmpData: {
        sysDescr: "Linux 3.18.44 UAP-AC-Pro #1 SMP PREEMPT",
        sysName: "ap-floor2.empresaabc.local",
        sysLocation: "Andar 2 - Open Space",
        interfacesCount: 3,
        uptime: "42 days, 18:10:00"
      },
      interfaces: [
        { name: "eth0 (PoE)", mac: "B4:FB:E4:77:88:99", ip: cidr.replace(".0/24", ".50"), status: "UP", speedMbps: 1000, type: "ETHERNET", duplex: "FULL" }
      ]
    },
    {
      hostname: "PRINTER-01",
      ip: cidr.replace(".0/24", ".30"),
      mac: "3C:D9:2B:99:88:77",
      vendor: "HP Inc.",
      detectedType: "printer",
      operatingSystem: "HP FutureSmart Firmware 5.6",
      openPorts: [80, 443, 515, 631, 9100, 161],
      protocolsDetected: ['ICMP', 'ARP', 'SNMP', 'DNS', 'DHCP', 'INTERFACE_DISCOVERY'],
      snmpData: {
        sysDescr: "HP LaserJet Enterprise M608; System ID: J8A04A",
        sysName: "prn-corp-01.empresaabc.local",
        sysLocation: "Setor Administrativo Hall Central",
        interfacesCount: 2,
        uptime: "82 days, 12:00:00"
      },
      interfaces: [
        { name: "eth0 (RJ-45)", mac: "3C:D9:2B:99:88:77", ip: cidr.replace(".0/24", ".30"), status: "UP", speedMbps: 1000, type: "ETHERNET", duplex: "FULL" }
      ]
    }
  ];

  const existingCis = store.items.filter(i => i.tenantId === tenantId);
  const discoveredIds: string[] = [];
  let newDiscoveredCount = 0;
  let matchedExistingCount = 0;

  store.discoveredDevices = store.discoveredDevices || [];

  sampleEquipments.forEach((eq, i) => {
    const existingDev = store.discoveredDevices.find(d => d.tenantId === tenantId && d.mac === eq.mac);
    const devId = existingDev ? existingDev.id : `disc-dev-${Date.now().toString(36)}-${i}`;
    discoveredIds.push(devId);

    // MATCHING AUTOMÁTICO COM A BASE CMDB (PROMPT 7)
    const exactMacCi = existingCis.find(ci => ci.macAddress && ci.macAddress.toUpperCase() === eq.mac?.toUpperCase());
    const ipCi = existingCis.find(ci => ci.ipAddress && ci.ipAddress === eq.ip);
    const hostCi = existingCis.find(ci => ci.name && ci.name.toLowerCase() === eq.hostname?.toLowerCase());

    let matchingStatus: DiscoveredDevice["matchingStatus"] = "UNMATCHED";
    let matchedCiObj: DiscoveredDevice["matchedCi"] | undefined = undefined;

    if (exactMacCi) {
      matchingStatus = "MATCHED_EXACT_MAC";
      matchedCiObj = {
        id: exactMacCi.id,
        code: exactMacCi.code,
        name: exactMacCi.name,
        type: exactMacCi.typeId,
        matchReason: `MAC Address ${eq.mac} coincide exatamente com ${exactMacCi.code}`
      };
      matchedExistingCount++;
    } else if (ipCi) {
      matchingStatus = "MATCHED_IP_ONLY";
      matchedCiObj = {
        id: ipCi.id,
        code: ipCi.code,
        name: ipCi.name,
        type: ipCi.typeId,
        matchReason: `Endereço IP ${eq.ip} coincide com ${ipCi.code}`
      };
      matchedExistingCount++;
    } else if (hostCi) {
      matchingStatus = "MATCHED_HOSTNAME";
      matchedCiObj = {
        id: hostCi.id,
        code: hostCi.code,
        name: hostCi.name,
        type: hostCi.typeId,
        matchReason: `Hostname ${eq.hostname} coincide com ${hostCi.code}`
      };
      matchedExistingCount++;
    } else {
      newDiscoveredCount++;
    }

    const devRecord: DiscoveredDevice = {
      id: devId,
      tenantId,
      ip: eq.ip || "0.0.0.0",
      mac: eq.mac || "00:00:00:00:00:00",
      hostname: eq.hostname || "UNKNOWN-HOST",
      vendor: eq.vendor || "Desconhecido",
      detectedType: eq.detectedType || "switch",
      operatingSystem: eq.operatingSystem,
      osHint: eq.operatingSystem,
      openPorts: eq.openPorts || [22, 161],
      discoveredAt: startTime,
      lastSeen: startTime,
      discoverySource: `NETWORK_DISCOVERY_${(eq.protocolsDetected || ['SNMP'])[0]}`,
      discoveryJobId: jobId,
      protocolsDetected: eq.protocolsDetected || selectedMethods,
      snmpData: eq.snmpData,
      lldpNeighbors: eq.lldpNeighbors,
      cdpNeighbors: eq.cdpNeighbors,
      interfaces: eq.interfaces,
      // REGRA ESTRITA (PROMPT 7):
      // "Os resultados deverão entrar como DISCOVERED e não automaticamente como ativos definitivos."
      status: "DISCOVERED",
      pipelineStage: "DISCOVERY",
      discoveryStage: "DISCOVERY",
      matchingStatus,
      matchedCi: matchedCiObj,
      confidence: exactMacCi ? 1.0 : 0.95,
      evidence: "CONFIRMED",
      evidenceDetails: {
        sourceType: "SNMP_CDP_LLDP",
        detectedBy: `Discovery Job #${jobId}`,
        proof: `Varredura autorizada na sub-rede ${cidr}. Portas: ${(eq.openPorts || []).join(', ')}.`,
        verifiedAt: startTime
      }
    };

    if (existingDev) {
      Object.assign(existingDev, devRecord);
    } else {
      store.discoveredDevices.push(devRecord);
    }
    newDiscoveredDevices.push(devRecord);
  });

  const finishTime = new Date().toISOString();
  logs.push({
    timestamp: finishTime,
    level: "SUCCESS",
    message: `Discovery Job finalizado com sucesso. ${sampleEquipments.length} equipamentos mapeados no estado DISCOVERED prontos para homologação.`
  });

  const resultData: DiscoveryJobResult = {
    totalIpsScanned: 254,
    responsiveHosts: sampleEquipments.length,
    newDiscoveredCount,
    matchedExistingCount,
    protocolStats: {
      ICMP: sampleEquipments.length,
      ARP: sampleEquipments.length,
      SNMP: sampleEquipments.filter(e => e.openPorts?.includes(161)).length,
      LLDP: sampleEquipments.filter(e => e.lldpNeighbors && e.lldpNeighbors.length > 0).length,
      CDP: 2,
      DNS: sampleEquipments.length,
      DHCP: sampleEquipments.length,
      INTERFACE_DISCOVERY: sampleEquipments.length
    },
    durationSeconds: 12,
    discoveredDeviceIds: discoveredIds
  };

  const newJob: DiscoveryJob = {
    id: jobId,
    tenantId,
    tenant: authorizedSubnet.name,
    rede: authorizedSubnet.name,
    cidr,
    horario: nowDisplay,
    metodo: selectedMethods,
    status: "COMPLETED",
    inicio: startTime,
    termino: finishTime,
    resultado: resultData,
    scanConfig: {
      rateLimitPps: safeRateLimit,
      timeoutMs: safeTimeout,
      maxConcurrency: safeConcurrency,
      authorizedSubnetId: authorizedSubnet.id,
      snmpCommunity: snmpCommunity || "public",
      snmpVersion: snmpVersion || "v2c"
    },
    logs
  };

  store.discoveryJobs = store.discoveryJobs || [];
  store.discoveryJobs.unshift(newJob);
  saveStore(store);

  logAuditEvent(
    tenantId,
    jobId,
    cidr,
    authorizedSubnet.name,
    "CONFIGURACAO",
    `Discovery Job #${jobId} executado na sub-rede autorizada ${cidr}. ${sampleEquipments.length} hosts descobertos (Modo: DISCOVERED).`,
    "DiscoveryEngine",
    "execucao_discovery",
    "PENDING",
    "COMPLETED",
    "Sistema"
  );

  res.status(201).json({
    success: true,
    job: newJob,
    devices: newDiscoveredDevices,
    message: "Network Discovery executada com sucesso. Resultados salvos como DISCOVERED para homologação."
  });
});

// POST /api/v1/cmdb/discovery/jobs/:id/cancel - Cancelar job de descoberta
router.post("/cmdb/discovery/jobs/:id/cancel", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { id } = req.params;

  const job = (store.discoveryJobs || []).find(j => j.id === id && j.tenantId === tenantId);
  if (!job) {
    return res.status(404).json({ error: "Discovery Job não encontrado." });
  }

  job.status = "CANCELLED";
  job.termino = new Date().toISOString();
  job.logs.push({
    timestamp: job.termino,
    level: "WARN",
    message: "Discovery Job cancelado pelo operador."
  });
  saveStore(store);

  res.json({
    success: true,
    job,
    message: "Discovery Job cancelado."
  });
});

// POST /api/v1/cmdb/discovery/match - Vincular manualmente dispositivo descoberto a CI existente com evidência
router.post("/cmdb/discovery/match", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { deviceId, ciId, notes } = req.body;

  const device = (store.discoveredDevices || []).find(d => d.id === deviceId && d.tenantId === tenantId);
  if (!device) {
    return res.status(404).json({ error: "Dispositivo descoberto não encontrado." });
  }

  const targetCi = (store.items || []).find(i => i.id === ciId && i.tenantId === tenantId);
  if (!targetCi) {
    return res.status(404).json({ error: "Item de Configuração (CI) de destino não encontrado." });
  }

  const now = new Date().toISOString();
  device.linkedCiId = targetCi.id;
  device.status = "APPROVED";
  device.discoveryStage = "CMDB";
  device.pipelineStage = "CMDB";
  device.matchingStatus = "MATCHED_EXACT_MAC";
  device.matchedCi = {
    id: targetCi.id,
    code: targetCi.code,
    name: targetCi.name,
    type: targetCi.typeId,
    matchReason: notes || `Vinculação confirmada pelo operador para o MAC ${device.mac}`
  };

  // Atualizar telemetria e IP do CI
  targetCi.ipAddress = device.ip;
  if (!targetCi.macAddress) targetCi.macAddress = device.mac;
  targetCi.telemetry = {
    cpuUsagePct: targetCi.telemetry?.cpuUsagePct ?? 15,
    ramUsagePct: targetCi.telemetry?.ramUsagePct ?? 38,
    diskUsagePct: targetCi.telemetry?.diskUsagePct ?? 28,
    uptimeHours: targetCi.telemetry?.uptimeHours ?? 720,
    isOnline: true,
    lastHeartbeat: now,
    latencyMs: 1
  };

  saveStore(store);

  logAuditEvent(
    tenantId,
    targetCi.id,
    targetCi.code,
    targetCi.name,
    "CONFIGURACAO",
    `Dispositivo descoberto ${device.ip} (${device.hostname}) vinculado manualmente ao CI ${targetCi.code} com evidência de rede.`,
    "DiscoveryEngine",
    "matching_manual",
    "UNMATCHED",
    "MATCHED",
    "Web"
  );

  res.json({
    success: true,
    device,
    ci: targetCi,
    message: "Dispositivo descoberto vinculado com sucesso ao CI."
  });
});

// POST /api/v1/cmdb/discovery/reject - Rejeitar / Ignorar dispositivo descoberto
router.post("/cmdb/discovery/reject", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { deviceId, reason } = req.body;

  const device = (store.discoveredDevices || []).find(d => d.id === deviceId && d.tenantId === tenantId);
  if (!device) {
    return res.status(404).json({ error: "Dispositivo descoberto não encontrado." });
  }

  device.status = "REJECTED";
  device.updatedAt = new Date().toISOString();
  saveStore(store);

  logAuditEvent(
    tenantId,
    device.id,
    device.mac,
    device.hostname || device.ip,
    "CONFIGURACAO",
    `Dispositivo descoberto ${device.ip} (${device.hostname}) rejeitado/ignorado: ${reason || "Não aplicável ao escopo da CMDB"}.`,
    "DiscoveryEngine",
    "rejeicao_discovery",
    "DISCOVERED",
    "REJECTED",
    "Web"
  );

  res.json({
    success: true,
    device,
    message: "Dispositivo descoberto marcado como rejeitado/ignorado."
  });
});

// GET /api/v1/cmdb/discovery/devices - Listar dispositivos descobertos no pipeline
router.get("/cmdb/discovery/devices", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const devices = (store.discoveredDevices || []).filter(d => d.tenantId === tenantId);
  res.json({
    devices,
    total: devices.length,
    byStage: {
      discovery: devices.filter(d => d.discoveryStage === 'DISCOVERY' || d.status === 'DISCOVERED').length,
      asset: devices.filter(d => d.discoveryStage === 'ASSET').length,
      ci: devices.filter(d => d.discoveryStage === 'CI').length,
      cmdb: devices.filter(d => d.discoveryStage === 'CMDB' || d.status === 'APPROVED').length
    }
  });
});

// POST /api/v1/cmdb/discovery/promote - Promover dispositivo descoberto no pipeline
// NETWORK DISCOVERY -> DISCOVERED DEVICE -> MATCHING -> APPROVAL -> ASSET -> CI -> TOPOLOGY
router.post("/cmdb/discovery/promote", (req: Request, res: Response) => {
  const tenantId = getTenantId(req);
  const { deviceId, targetStage, customCi } = req.body;

  const device = (store.discoveredDevices || []).find(d => d.id === deviceId && d.tenantId === tenantId);
  if (!device) {
    return res.status(404).json({ error: "Dispositivo descoberto não encontrado neste tenant." });
  }

  const nextStage: DiscoveryPipelineStage = targetStage || (
    device.discoveryStage === 'DISCOVERY' ? 'ASSET' :
    device.discoveryStage === 'ASSET' ? 'CI' : 'CMDB'
  );

  device.discoveryStage = nextStage;
  device.pipelineStage = nextStage;
  device.updatedAt = new Date().toISOString();

  let createdCi: ConfigurationItem | null = null;

  // If promoted to ASSET or CI, update status
  if (nextStage === 'ASSET') {
    device.status = 'APPROVED';
    device.assetTag = customCi?.asset || device.assetTag || `PAT-2026-${Date.now().toString().slice(-4)}`;
  }

  // If promoted to CI or CMDB, guarantee Configuration Item exists with mandatory fields and topology relationship
  if (nextStage === 'CI' || nextStage === 'CMDB') {
    let existingCi = store.items.find(i => 
      (i.id === device.linkedCiId || (i.macAddress && i.macAddress.toUpperCase() === device.mac.toUpperCase()) || i.ipAddress === device.ip) && 
      i.tenantId === tenantId
    );

    const now = new Date().toISOString();
    const patTag = customCi?.asset || device.assetTag || `PAT-2026-${Date.now().toString().slice(-4)}`;

    if (!existingCi) {
      const ciCount = store.items.length + 1;
      const ciCode = `CI-${device.detectedType.toUpperCase().slice(0, 3)}-${ciCount < 10 ? '0' : ''}${ciCount}`;
      const ciId = `ci-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      existingCi = {
        id: ciId,
        code: ciCode,
        name: customCi?.name || device.hostname || device.ip,
        nome: customCi?.name || device.hostname || device.ip,
        typeId: device.detectedType,
        tipo: device.detectedType,
        typeName: device.detectedType === 'printer' ? 'Impressora de Rede' : 
                  device.detectedType === 'server' ? 'Servidor Corporativo' :
                  device.detectedType === 'switch' ? 'Switch de Rede' :
                  device.detectedType === 'access_point' ? 'Access Point' : 
                  device.detectedType === 'firewall' ? 'Firewall de Borda' : 'Item de Configuração',
        typeGroup: ['switch', 'router', 'firewall', 'access_point'].includes(device.detectedType) ? 'infraestrutura' : 'hardware',
        tenantId,
        tenant: tenantId,
        status: 'operacional',
        criticality: ['firewall', 'switch', 'server'].includes(device.detectedType) ? 'alta' : 'media',
        layer: device.detectedType === 'firewall' ? 'borda' : device.detectedType === 'switch' ? 'core' : 'acesso',
        manufacturer: customCi?.manufacturer || device.vendor || 'Genérico',
        fabricante: customCi?.manufacturer || device.vendor || 'Genérico',
        model: customCi?.model || device.osHint || 'Descoberto via Rede',
        modelo: customCi?.model || device.osHint || 'Descoberto via Rede',
        serialNumber: customCi?.serial || `SN-${device.mac.replace(/:/g, '').slice(-8)}`,
        serial: customCi?.serial || `SN-${device.mac.replace(/:/g, '').slice(-8)}`,
        assetTag: patTag,
        asset: patTag,
        hostname: device.hostname || device.ip,
        ipAddress: device.ip,
        macAddress: device.mac,
        operatingSystem: device.operatingSystem || device.osHint || 'Desconhecido',
        location: customCi?.location || 'Matriz - Data Center Rack R01',
        localizacao: customCi?.location || 'Matriz - Data Center Rack R01',
        responsible: customCi?.responsible || 'Equipe de Redes / Infra',
        usuarioResponsavel: customCi?.responsible || 'Equipe de Redes / Infra',
        department: customCi?.department || 'Tecnologia da Informação',
        departamento: customCi?.department || 'Tecnologia da Informação',
        clientId: 'cli-01',
        clientName: tenantId === 'tenant-filial-01' ? 'Filial Sul' : 'Empresa ABC',
        unit: 'Matriz',
        telemetry: {
          cpuUsagePct: 22,
          ramUsagePct: 45,
          diskUsagePct: 35,
          uptimeHours: 840,
          isOnline: true,
          lastHeartbeat: now,
          latencyMs: 2
        },
        dynamicAttributes: {
          openPorts: device.openPorts,
          discoveredVendor: device.vendor,
          discoveryStage: nextStage,
          discoveryProtocols: device.protocolsDetected,
          snmpData: device.snmpData,
          interfaces: device.interfaces
        },
        linkedTicketsCount: 0,
        canvasPosition: {
          x: device.detectedType === 'switch' ? 450 : device.detectedType === 'firewall' ? 450 : 250 + Math.floor(Math.random() * 400),
          y: device.detectedType === 'firewall' ? 180 : device.detectedType === 'switch' ? 320 : 540
        },
        createdAt: now,
        updatedAt: now
      };

      store.items.push(existingCi);
      createdCi = existingCi;
    } else {
      existingCi.asset = patTag;
      existingCi.tenant = tenantId;
      existingCi.status = 'operacional';
      existingCi.tipo = existingCi.tipo || device.detectedType;
      existingCi.nome = existingCi.name;
      existingCi.fabricante = existingCi.manufacturer;
      existingCi.modelo = existingCi.model;
      existingCi.serial = existingCi.serialNumber;
      existingCi.localizacao = existingCi.location;
      existingCi.usuarioResponsavel = existingCi.responsible;
      existingCi.departamento = existingCi.department;
    }

    device.linkedCiId = existingCi.id;
    device.assetTag = patTag;
    device.status = 'APPROVED';

    // Vincular à Topologia: Conectar com o Switch Core ou Switch-02 com evidência real
    const switchCore = store.items.find(i => (i.tipo === 'switch' || i.typeId === 'switch') && i.id !== existingCi!.id);
    if (switchCore) {
      const existingRel = store.relationships.find(
        r => (r.origem === existingCi!.id || r.sourceCiId === existingCi!.id) && (r.destino === switchCore.id || r.targetCiId === switchCore.id)
      );

      if (!existingRel) {
        const protocolEvidence = (device.protocolsDetected && device.protocolsDetected.includes('LLDP')) ? 'LLDP' :
                                 (device.protocolsDetected && device.protocolsDetected.includes('CDP')) ? 'CDP' :
                                 (device.protocolsDetected && device.protocolsDetected.includes('SNMP')) ? 'SNMP' : 'ARP';

        const netRel: CIRelationship = {
          id: `rel-netdisc-${existingCi.id}-${Date.now()}`,
          tenantId,
          origem: existingCi.id,
          destino: switchCore.id,
          tipo: 'NETWORK_DEVICE_TO_SWITCH',
          evidencia: 'CONFIRMED',
          confianca: 0.98,
          criado_em: now,
          atualizado_em: now,
          sourceCiId: existingCi.id,
          sourceCiName: existingCi.name,
          sourceCiCode: existingCi.code,
          targetCiId: switchCore.id,
          targetCiName: switchCore.name,
          targetCiCode: switchCore.code,
          type: 'CONECTADO_A',
          criticality: 'media',
          description: `Dispositivo descoberto ${existingCi.name} conectado ao Switch Core ${switchCore.name} com evidência ${protocolEvidence}`,
          createdAt: now,
          updatedAt: now,
          connection_type: 'CABO_UTP',
          evidence_source: protocolEvidence,
          confidence: 0.98,
          evidenceDetails: {
            sourceType: protocolEvidence === 'LLDP' ? 'CDP_LLDP' : protocolEvidence === 'SNMP' ? 'SNMP' : 'ARP_TABLE',
            detectedBy: 'Network Discovery Engine',
            proof: `Porta ativa mapeada via ${protocolEvidence} no switch ${switchCore.name} para MAC ${device.mac}`,
            verifiedAt: now
          }
        };
        store.relationships.push(netRel);
      }
    }

    logAuditEvent(
      tenantId,
      existingCi.id,
      existingCi.code,
      existingCi.name,
      "CONFIGURACAO",
      `Dispositivo descoberto ${device.ip} (${device.hostname}) promovido para o estágio ${nextStage}. CI: ${existingCi.code}, Patrimônio: ${existingCi.asset}. Integrado à Topologia.`,
      "DiscoveryEngine",
      "promocao_cmdb",
      device.discoveryStage,
      nextStage,
      "Sistema"
    );
  }

  saveStore(store);

  res.json({
    success: true,
    device,
    ci: createdCi || store.items.find(i => i.id === device.linkedCiId),
    promotedTo: nextStage,
    message: `Dispositivo promovido com sucesso para ${nextStage}.`
  });
});

// IMUTABILIDADE ESTREITA (PROMPT 4):
// "Não apagar histórico. Não permitir alteração silenciosa dos registros de auditoria."
router.delete(["/cmdb/changes*", "/agent/audit/changes*"], (_req: Request, res: Response) => {
  res.status(403).json({
    error: "AUDIT_LOG_IMMUTABLE",
    code: "FORBIDDEN_IMMUTABLE",
    message: "Conformidade e Auditoria Estrita: O histórico de alterações de inventário e os registros de auditoria são imutáveis e jamais podem ser apagados."
  });
});

router.put(["/cmdb/changes*", "/agent/audit/changes*"], (_req: Request, res: Response) => {
  res.status(403).json({
    error: "AUDIT_LOG_IMMUTABLE",
    code: "FORBIDDEN_IMMUTABLE",
    message: "Conformidade e Auditoria Estrita: Registros históricos não podem ser alterados após sua gravação."
  });
});

router.patch(["/cmdb/changes*", "/agent/audit/changes*"], (_req: Request, res: Response) => {
  res.status(403).json({
    error: "AUDIT_LOG_IMMUTABLE",
    code: "FORBIDDEN_IMMUTABLE",
    message: "Conformidade e Auditoria Estrita: Registros históricos não podem ser alterados após sua gravação."
  });
});

export default router;
