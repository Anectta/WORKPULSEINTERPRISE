import { InventoryDiscoveredAsset, DiscoveryAlert, DuplicatePair } from '../types/inventoryDiscovery';

export const INITIAL_DISCOVERED_ASSETS: InventoryDiscoveredAsset[] = [
  // 1. Novo Ativo Principal (do Prompt 8)
  {
    id: 'disc-023-new',
    name: 'PC-023-NOVO',
    brandModel: 'Dell Latitude 5420',
    os: 'Windows 11 Pro 64-bit',
    ram: '16 GB RAM',
    ramBytes: 17179869184,
    disk: 'SSD 512 GB',
    diskBytes: 512000000000,
    ipAddress: '192.168.1.25',
    macAddress: '00:1A:2B:3C:4D:5E',
    uuid: '4C4C4544-004A-5A10-8058-CAC04F543232',
    serialNumber: 'SN-DELL-948201',
    serviceTag: '8XYZ123',
    cpu: '11th Gen Intel(R) Core(TM) i5-1145G7 @ 2.60GHz (8 CPUs)',
    category: 'hardware_workstation',
    status: 'DISCOVERED',
    discoveryMethod: 'AGENT',
    hasAgent: true,
    agentVersion: 'v4.2.1-lts',
    agentStatus: 'online',
    lastSeen: 'há 1 min',
    discoveredAt: '2026-09-07T08:30:00Z',
    assignedUser: 'Lucas Ribeiro (Desenvolvimento)',
    assignedDepartment: 'Engenharia',
    location: 'Torre A - 3º Andar (Q4)',
    isDuplicateSuspect: true,
    duplicateTargetName: 'PC-023',
    duplicateSimilarityPct: 94,
    matchingPriorityUsed: 'HOSTNAME_EVIDENCE',
    matchingConfidence: 94,
    matchingReason: 'Forte correlação com ativo existente PC-023 (Mesmo Modelo Dell Latitude 5420, IP 192.168.1.25 e MAC).',
    telemetry: {
      cpuUsagePct: 18,
      ramUsagePct: 42,
      diskUsagePct: 58,
      uptimeHours: 36,
      latencyMs: 4
    },
    networkInterfaces: [
      { name: 'Ethernet Intel I219-LM', ip: '192.168.1.25', mac: '00:1A:2B:3C:4D:5E', type: 'Ethernet', speedMbps: 1000 },
      { name: 'Intel Wi-Fi 6 AX201', ip: '10.0.10.45', mac: '00:1A:2B:3C:4D:5F', type: 'Wi-Fi', speedMbps: 866 }
    ],
    notes: 'Agente WorkPulse instalado silenciosamente via GPO. Hardware validado.'
  },

  // 2. Novo Ativo - Estação Design (Descoberta via Agente)
  {
    id: 'disc-102',
    name: 'WS-DESIGN-04',
    brandModel: 'Dell Precision 3660 Tower',
    os: 'Windows 11 Enterprise',
    ram: '64 GB RAM',
    ramBytes: 68719476736,
    disk: 'SSD NVMe 2 TB',
    diskBytes: 2000000000000,
    ipAddress: '192.168.1.52',
    macAddress: '3C:52:82:11:9A:04',
    uuid: 'E9F1A2B3-78C9-4A55-9B21-001A2B3C4D04',
    serialNumber: 'SN-DELL-PR3660-8812',
    serviceTag: '9KLP441',
    cpu: 'Intel Core i9-13900K @ 3.00GHz (24 cores / 32 threads)',
    category: 'hardware_workstation',
    status: 'DISCOVERED',
    discoveryMethod: 'AGENT',
    hasAgent: true,
    agentVersion: 'v4.2.1-lts',
    agentStatus: 'online',
    lastSeen: 'há 30 seg',
    discoveredAt: '2026-09-07T07:15:00Z',
    assignedUser: 'Mariana Costa (Design UI/UX)',
    assignedDepartment: 'Marketing',
    location: 'Torre A - 2º Andar (Design Lab)',
    telemetry: {
      cpuUsagePct: 24,
      ramUsagePct: 55,
      diskUsagePct: 32,
      uptimeHours: 14,
      latencyMs: 3
    },
    networkInterfaces: [
      { name: 'Realtek PCIe 2.5GbE', ip: '192.168.1.52', mac: '3C:52:82:11:9A:04', type: 'Ethernet', speedMbps: 2500 }
    ]
  },

  // 3. Novo Ativo - Servidor Linux (Descoberta de Rede SNMP/SSH)
  {
    id: 'disc-103',
    name: 'SRV-APP-DOCKER-02',
    brandModel: 'Dell PowerEdge R650xs',
    os: 'Ubuntu 22.04.4 LTS (Linux 5.15)',
    ram: '128 GB RAM',
    ramBytes: 137438953472,
    disk: 'SSD Enterprise 4 TB RAID-10',
    diskBytes: 4000000000000,
    ipAddress: '192.168.1.18',
    macAddress: '14:18:77:22:BB:18',
    uuid: '88AA11CC-44EE-55FF-9911-223344556677',
    serialNumber: 'SN-DELL-PE-R650-9941',
    serviceTag: '7HGF332',
    cpu: 'Dual Intel Xeon Silver 4314 @ 2.40GHz (32 Cores)',
    category: 'hardware_server',
    status: 'PENDING',
    discoveryMethod: 'NETWORK_SNMP',
    hasAgent: false,
    agentStatus: 'offline',
    lastSeen: 'há 5 min',
    discoveredAt: '2026-09-06T19:20:00Z',
    location: 'Data Center - Rack R02',
    telemetry: {
      cpuUsagePct: 12,
      ramUsagePct: 38,
      diskUsagePct: 41,
      uptimeHours: 720,
      latencyMs: 1
    },
    notes: 'Descoberto pelo Network Discovery Scanner na Subrede 192.168.1.0/24. Porta SNMP 161 e SSH 22 respondendo.'
  },

  // 4. Ativo Alterado - Upgrade de Hardware Detectado
  {
    id: 'disc-changed-01',
    name: 'DESK-FIN-08',
    brandModel: 'HP ProDesk 400 G7',
    os: 'Windows 11 Pro (Atualizado de Windows 10)',
    ram: '32 GB RAM (Upgrade de 16 GB)',
    ramBytes: 34359738368,
    disk: 'SSD 1 TB NVMe (Upgrade de 512 GB)',
    diskBytes: 1000000000000,
    ipAddress: '192.168.1.72',
    macAddress: '70:85:C2:55:01:72',
    uuid: '48504649-0072-4007-8822-CCBB44556677',
    serialNumber: 'SN-HP-PD400-7210',
    serviceTag: 'HP-CZ4491',
    cpu: 'Intel Core i5-10500 @ 3.10GHz',
    category: 'hardware_workstation',
    status: 'DISCOVERED',
    discoveryMethod: 'AGENT',
    hasAgent: true,
    agentVersion: 'v4.2.1-lts',
    agentStatus: 'online',
    lastSeen: 'há 2 min',
    discoveredAt: '2026-09-07T09:10:00Z',
    assignedUser: 'Camila Ferreira (Controladoria)',
    assignedDepartment: 'Financeiro & Jurídico',
    hasChanges: true,
    changesDetected: [
      {
        id: 'chg-01',
        field: 'ram',
        fieldLabel: 'Memória RAM',
        oldValue: '16 GB DDR4',
        newValue: '32 GB DDR4 (2x 16GB)',
        detectedAt: '2026-09-07T09:10:00Z',
        severity: 'info'
      },
      {
        id: 'chg-02',
        field: 'disk',
        fieldLabel: 'Armazenamento Secundário',
        oldValue: 'SSD 512 GB SATA',
        newValue: 'SSD NVMe Kingston 1TB',
        detectedAt: '2026-09-07T09:10:00Z',
        severity: 'info'
      },
      {
        id: 'chg-03',
        field: 'os',
        fieldLabel: 'Sistema Operacional',
        oldValue: 'Windows 10 Pro 21H2',
        newValue: 'Windows 11 Pro 23H2 (Build 22631)',
        detectedAt: '2026-09-07T09:10:00Z',
        severity: 'warning'
      }
    ],
    telemetry: {
      cpuUsagePct: 15,
      ramUsagePct: 28,
      diskUsagePct: 45,
      uptimeHours: 8,
      latencyMs: 5
    }
  },

  // 5. Ativo Offline - Alerta de Comunicação
  {
    id: 'disc-offline-01',
    name: 'NOTE-EXEC-05',
    brandModel: 'Lenovo ThinkPad T14s Gen 3',
    os: 'Windows 11 Pro 64-bit',
    ram: '16 GB RAM',
    disk: 'SSD 512 GB',
    ipAddress: '192.168.1.44',
    macAddress: '54:E1:AD:99:31:44',
    uuid: '4C454E4F-0044-5566-7788-99AABBCCDDEE',
    serialNumber: 'SN-LEN-TP14-8841',
    serviceTag: 'PF3X892',
    cpu: 'AMD Ryzen 7 PRO 6850U @ 2.70GHz',
    category: 'hardware_workstation',
    status: 'PENDING',
    discoveryMethod: 'AGENT',
    hasAgent: true,
    agentVersion: 'v4.1.8',
    agentStatus: 'offline',
    lastSeen: 'há 4 dias (03/09/2026 18:42)',
    discoveredAt: '2026-08-15T10:00:00Z',
    assignedUser: 'Roberto Drummond (Diretoria Executiva)',
    assignedDepartment: 'Todas as Áreas',
    location: 'Remoto / Viagem',
    notes: 'Agente WorkPulse não reporta telemetria nem heartbeat há mais de 96 horas.'
  },

  // 6. Ativo Sem Agente - Impressora de Rede
  {
    id: 'disc-noagent-01',
    name: 'PRINTER-FIN-01',
    brandModel: 'HP LaserJet Enterprise M608dn',
    os: 'HP FutureSmart Firmware v5.7',
    ram: '1 GB RAM',
    disk: 'eMMC 16 GB',
    ipAddress: '192.168.1.210',
    macAddress: '00:68:EB:44:A1:D2',
    uuid: '48505052-0210-4400-9900-112233445566',
    serialNumber: 'SN-HP-LJ608-5521',
    serviceTag: 'HP-M608-210',
    category: 'hardware_printer',
    status: 'DISCOVERED',
    discoveryMethod: 'NETWORK_SNMP',
    hasAgent: false,
    agentStatus: 'offline',
    lastSeen: 'há 10 min',
    discoveredAt: '2026-09-07T06:00:00Z',
    location: 'Torre A - 1º Andar (Sala Financeiro)',
    notes: 'Identificado via SNMP v2c e porta RAW 9100. Dispositivo gerenciado por rede (sem agente suportado).'
  },

  // 7. Ativo Sem Agente - Ponto de Acesso Wi-Fi
  {
    id: 'disc-noagent-02',
    name: 'AP-WIFI-FLOOR2',
    brandModel: 'Ubiquiti UniFi U6 Pro AP',
    os: 'UniFi OS v3.2.12',
    ram: '512 MB RAM',
    disk: 'Flash 256 MB',
    ipAddress: '192.168.1.220',
    macAddress: '74:83:C2:88:19:EA',
    uuid: '554E4946-0220-4455-8899-AABBCCDDEEFF',
    serialNumber: 'SN-UBNT-U6PRO-9912',
    category: 'hardware_network',
    status: 'DISCOVERED',
    discoveryMethod: 'NETWORK_SNMP',
    hasAgent: false,
    agentStatus: 'offline',
    lastSeen: 'há 4 min',
    discoveredAt: '2026-09-07T06:05:00Z',
    location: 'Torre A - 2º Andar (Teto Central)'
  }
];

export const INITIAL_DISCOVERY_ALERTS: DiscoveryAlert[] = [
  {
    id: 'alt-01',
    assetId: 'disc-023-new',
    assetName: 'PC-023-NOVO',
    type: 'DUPLICATE_FOUND',
    severity: 'high',
    title: 'Provável Ativo Duplicado (94% similaridade)',
    message: 'O ativo descoberto "PC-023-NOVO" possui 94% de similaridade com o tombo existente "PC-023". Requer validação humana para Mesclar ou Manter Separado.',
    timestamp: '2026-09-07T08:30:00Z',
    status: 'OPEN',
    actionRequired: 'Analisar comparação e escolher [MESCLAR] ou [MANTER SEPARADOS]'
  },
  {
    id: 'alt-02',
    assetId: 'disc-changed-01',
    assetName: 'DESK-FIN-08',
    assetTag: 'PAT-2026-0008',
    type: 'RAM_CHANGED',
    severity: 'medium',
    title: 'Alteração de Hardware Não Homologada',
    message: 'Memória RAM expandida de 16 GB para 32 GB e novo SSD NVMe de 1 TB detectado pelo agente RMM.',
    timestamp: '2026-09-07T09:10:00Z',
    status: 'OPEN',
    actionRequired: 'Atualizar ficha patrimonial e termo de responsabilidade'
  },
  {
    id: 'alt-03',
    assetId: 'disc-offline-01',
    assetName: 'NOTE-EXEC-05',
    assetTag: 'PAT-2026-0014',
    type: 'ASSET_OFFLINE',
    severity: 'high',
    title: 'Estação Executiva Sem Comunicação (> 96h)',
    message: 'O notebook do usuário Roberto Drummond não envia telemetria há mais de 4 dias. Verifique se o equipamento foi desligado ou está em trânsito.',
    timestamp: '2026-09-07T06:00:00Z',
    status: 'OPEN',
    actionRequired: 'Contatar o colaborador ou gestor da área'
  },
  {
    id: 'alt-04',
    assetId: 'disc-103',
    assetName: 'SRV-APP-DOCKER-02',
    type: 'UNAPPROVED_NEW_DEVICE',
    severity: 'critical',
    title: 'Novo Servidor Descoberto na Subrede de Produção',
    message: 'Host Linux 192.168.1.18 respondendo a portas 22 e 161 sem cadastro prévio no inventário.',
    timestamp: '2026-09-06T19:20:00Z',
    status: 'OPEN',
    actionRequired: 'Aprovar novo ativo e vincular responsável'
  }
];
