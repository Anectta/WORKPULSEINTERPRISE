import {
  WifiConnectionStatus,
  WifiScannedNetwork,
  WifiLanDevice,
  WifiHistoricDiagnostic,
  WifiSignalHistoryPoint,
  WifiPulseData,
  WifiChannelAnalysis,
  WifiChannelRecommendation,
  WifiScoreBreakdown,
  WifiDiagnosticItem
} from '../types/wifiPulse';

import {
  calculateWifiScore,
  analyzeChannels,
  recommendBestChannel,
  generateTechnicalDiagnostics
} from '../utils/wifiAnalysisEngine';

export const INITIAL_WIFI_CONNECTION: WifiConnectionStatus = {
  ssid: 'WorkPulse-Corporate-5G',
  bssid: '74:83:C2:88:91:A4',
  band: '5 GHz',
  channel: 36,
  frequencyMhz: 5180,
  channelWidthMhz: 80,
  rssi: -48,
  noise: -92,
  snr: 44,
  linkRateMbps: 866,
  maxRateMbps: 1200,
  wifiStandard: 'Wi-Fi 6 (802.11ax)',
  security: 'WPA2/WPA3 Enterprise (802.1X)',
  qualityPercent: 94,
  overallStatus: 'EXCELENTE',
  interfaceName: 'Wi-Fi (Intel(R) Wi-Fi 6 AX201 160MHz)',
  interfaceDescription: 'Intel Corporation Wi-Fi 6 AX201 160MHz Wireless Network Adapter',
  macAddress: '00:1A:2B:3C:4D:5F',
  ipAddress: '192.168.1.142',
  subnetMask: '255.255.255.0',
  gateway: '192.168.1.1',
  dnsServers: ['192.168.1.1', '1.1.1.1', '8.8.8.8'],
  dhcpServer: '192.168.1.1',
  isOnline: true,
  agentConnected: true,
  agentPlatform: 'Windows',
  lastScanTimestamp: new Date().toISOString()
};

export const INITIAL_SCANNED_NETWORKS: WifiScannedNetwork[] = [
  {
    id: 'net-1',
    ssid: 'WorkPulse-Corporate-5G',
    bssid: '74:83:C2:88:91:A4',
    vendor: 'Ubiquiti Networks (UniFi U6 Pro)',
    band: '5 GHz',
    frequencyMhz: 5180,
    channel: 36,
    channelWidthMhz: 80,
    rssi: -48,
    snr: 44,
    security: 'WPA3 Enterprise / WPA2',
    isCurrent: true,
    beaconIntervalMs: 100,
    lastSeen: 'Agora'
  },
  {
    id: 'net-2',
    ssid: 'WorkPulse-Corporate-2G',
    bssid: '74:83:C2:88:91:A5',
    vendor: 'Ubiquiti Networks (UniFi U6 Pro)',
    band: '2.4 GHz',
    frequencyMhz: 2412,
    channel: 1,
    channelWidthMhz: 20,
    rssi: -45,
    snr: 47,
    security: 'WPA2-Enterprise',
    isCurrent: false,
    beaconIntervalMs: 100,
    lastSeen: 'Há 5s'
  },
  {
    id: 'net-3',
    ssid: 'WorkPulse-Guest-Visitantes',
    bssid: '74:83:C2:88:91:A6',
    vendor: 'Ubiquiti Networks (UniFi U6 Pro)',
    band: '5 GHz',
    frequencyMhz: 5180,
    channel: 36,
    channelWidthMhz: 80,
    rssi: -49,
    snr: 43,
    security: 'Portal Captivo / WPA2',
    isCurrent: false,
    beaconIntervalMs: 100,
    lastSeen: 'Há 2s'
  },
  {
    id: 'net-4',
    ssid: 'CISCO-ENG-CORP',
    bssid: '00:27:0D:33:9A:10',
    vendor: 'Cisco Systems (Catalyst 9120)',
    band: '5 GHz',
    frequencyMhz: 5500,
    channel: 100,
    channelWidthMhz: 80,
    rssi: -62,
    snr: 30,
    security: 'WPA3 Enterprise',
    isCurrent: false,
    beaconIntervalMs: 100,
    lastSeen: 'Há 8s'
  },
  {
    id: 'net-5',
    ssid: 'ARUBA-GUEST-SECURE',
    bssid: '20:4C:03:44:E1:8B',
    vendor: 'Aruba / HPE (AP-515)',
    band: '5 GHz',
    frequencyMhz: 5240,
    channel: 48,
    channelWidthMhz: 40,
    rssi: -67,
    snr: 25,
    security: 'WPA2-Personal',
    isCurrent: false,
    beaconIntervalMs: 100,
    lastSeen: 'Há 12s'
  },
  {
    id: 'net-6',
    ssid: 'TP-Link_Omada_Floor2',
    bssid: '50:D4:F7:99:A2:3C',
    vendor: 'TP-Link Technologies (EAP660 HD)',
    band: '5 GHz',
    frequencyMhz: 5745,
    channel: 149,
    channelWidthMhz: 80,
    rssi: -71,
    snr: 21,
    security: 'WPA2/WPA3-Personal',
    isCurrent: false,
    beaconIntervalMs: 100,
    lastSeen: 'Há 4s'
  },
  {
    id: 'net-7',
    ssid: 'Vizinho-Sala-302',
    bssid: '98:48:27:12:33:EE',
    vendor: 'Intelbras S/A',
    band: '2.4 GHz',
    frequencyMhz: 2437,
    channel: 6,
    channelWidthMhz: 20,
    rssi: -74,
    snr: 18,
    security: 'WPA2-Personal',
    isCurrent: false,
    beaconIntervalMs: 100,
    lastSeen: 'Há 15s'
  },
  {
    id: 'net-8',
    ssid: 'CLARO_WIFI_5G_EXT',
    bssid: 'C4:41:1E:82:77:4B',
    vendor: 'Huawei Technologies Co., Ltd.',
    band: '5 GHz',
    frequencyMhz: 5200,
    channel: 40,
    channelWidthMhz: 80,
    rssi: -79,
    snr: 13,
    security: 'WPA2-Personal',
    isCurrent: false,
    beaconIntervalMs: 100,
    lastSeen: 'Há 22s'
  },
  {
    id: 'net-9',
    ssid: 'VIVO-FIBRA-2.4G-SALA4',
    bssid: '68:FF:7B:19:8C:30',
    vendor: 'MitraStar Technology',
    band: '2.4 GHz',
    frequencyMhz: 2412,
    channel: 1,
    channelWidthMhz: 20,
    rssi: -76,
    snr: 16,
    security: 'WPA2-Personal',
    isCurrent: false,
    beaconIntervalMs: 100,
    lastSeen: 'Há 18s'
  },
  {
    id: 'net-10',
    ssid: 'WorkPulse-Ultra-6G',
    bssid: '74:83:C2:88:91:A7',
    vendor: 'Ubiquiti Networks (UniFi U7 Pro)',
    band: '6 GHz',
    frequencyMhz: 6115,
    channel: 33,
    channelWidthMhz: 160,
    rssi: -52,
    snr: 40,
    security: 'WPA3-SAE Enterprise',
    isCurrent: false,
    beaconIntervalMs: 100,
    lastSeen: 'Agora'
  }
];

export const INITIAL_LAN_DEVICES: WifiLanDevice[] = [
  {
    id: 'dev-1',
    name: 'UniFi Gateway Ultra (Router/Firewall)',
    hostname: 'unifi-gateway-01.local',
    ip: '192.168.1.1',
    mac: '74:83:C2:11:22:33',
    vendor: 'Ubiquiti Inc.',
    deviceType: 'Router',
    status: 'ONLINE',
    latencyMs: 1,
    lastActive: 'Agora',
    discoveryMethod: 'ARP',
    isGateway: true
  },
  {
    id: 'dev-2',
    name: 'AP-UniFi-U6-Pro-Andar3',
    hostname: 'ap-unifi-u6-p3.local',
    ip: '192.168.1.10',
    mac: '74:83:C2:88:91:A4',
    vendor: 'Ubiquiti Inc.',
    deviceType: 'Router',
    status: 'ONLINE',
    latencyMs: 2,
    lastActive: 'Agora',
    discoveryMethod: 'SSDP'
  },
  {
    id: 'dev-3',
    name: 'PC-023-CARLOS (Estação Atual)',
    hostname: 'PC-023-CARLOS.corp',
    ip: '192.168.1.142',
    mac: '00:1A:2B:3C:4D:5F',
    vendor: 'Dell Inc.',
    deviceType: 'Laptop',
    status: 'ONLINE',
    latencyMs: 2,
    lastActive: 'Agora',
    discoveryMethod: 'mDNS',
    isThisDevice: true,
    isCurrentDevice: true
  },
  {
    id: 'dev-4',
    name: 'HP-LaserJet-M428fdw',
    hostname: 'printer-hp-m428.corp',
    ip: '192.168.1.55',
    mac: '10:E7:C6:44:33:22',
    vendor: 'HP Inc.',
    deviceType: 'Printer',
    status: 'ONLINE',
    latencyMs: 4,
    lastActive: 'Há 1 min',
    discoveryMethod: 'mDNS'
  },
  {
    id: 'dev-5',
    name: 'iPhone-15-Pro-Diretoria',
    hostname: 'iphone15-diretoria.local',
    ip: '192.168.1.178',
    mac: 'F0:18:98:77:88:99',
    vendor: 'Apple Inc.',
    deviceType: 'Smartphone',
    status: 'ONLINE',
    latencyMs: 8,
    lastActive: 'Há 3 min',
    discoveryMethod: 'DHCP'
  },
  {
    id: 'dev-6',
    name: 'Samsung-Galaxy-S24-Ultra',
    hostname: 'galaxy-s24-suporte.local',
    ip: '192.168.1.182',
    mac: '90:B6:86:12:44:66',
    vendor: 'Samsung Electronics',
    deviceType: 'Smartphone',
    status: 'ONLINE',
    latencyMs: 7,
    lastActive: 'Há 4 min',
    discoveryMethod: 'ARP'
  },
  {
    id: 'dev-7',
    name: 'SmartTV-Samsung-Sala-Reuniao-A',
    hostname: 'smarttv-reuniao-a.local',
    ip: '192.168.1.90',
    mac: '64:1C:67:33:22:11',
    vendor: 'Samsung Electronics',
    deviceType: 'SmartTV',
    status: 'ONLINE',
    latencyMs: 12,
    lastActive: 'Há 2 min',
    discoveryMethod: 'SSDP'
  },
  {
    id: 'dev-8',
    name: 'CAM-IP-Hikvision-Corredor-01',
    hostname: 'cam-corredor-01.sec',
    ip: '192.168.1.60',
    mac: '48:EA:63:99:88:77',
    vendor: 'Hangzhou Hikvision',
    deviceType: 'IPCamera',
    status: 'ONLINE',
    latencyMs: 3,
    lastActive: 'Há 10s',
    discoveryMethod: 'ICMP'
  },
  {
    id: 'dev-9',
    name: 'Servidor-NAS-Synology-DS920',
    hostname: 'nas-synology-storage.corp',
    ip: '192.168.1.200',
    mac: '00:11:32:88:44:11',
    vendor: 'Synology Inc.',
    deviceType: 'Server',
    status: 'ONLINE',
    latencyMs: 1,
    lastActive: 'Agora',
    discoveryMethod: 'SNMP'
  }
];

export const INITIAL_SIGNAL_HISTORY: WifiSignalHistoryPoint[] = [
  { timestamp: new Date(Date.now() - 300000).toISOString(), timeFormatted: '14:25', rssi: -50, snr: 42, linkRate: 866, noise: -92 },
  { timestamp: new Date(Date.now() - 240000).toISOString(), timeFormatted: '14:26', rssi: -49, snr: 43, linkRate: 866, noise: -92 },
  { timestamp: new Date(Date.now() - 180000).toISOString(), timeFormatted: '14:27', rssi: -48, snr: 44, linkRate: 866, noise: -92 },
  { timestamp: new Date(Date.now() - 120000).toISOString(), timeFormatted: '14:28', rssi: -51, snr: 41, linkRate: 780, noise: -92 },
  { timestamp: new Date(Date.now() - 60000).toISOString(), timeFormatted: '14:29', rssi: -48, snr: 44, linkRate: 866, noise: -92 },
  { timestamp: new Date().toISOString(), timeFormatted: '14:30', rssi: -48, snr: 44, linkRate: 866, noise: -92 }
];

export const INITIAL_CHANNEL_ANALYSIS_5G: WifiChannelAnalysis[] = analyzeChannels(INITIAL_SCANNED_NETWORKS, '5 GHz');
export const INITIAL_CHANNEL_ANALYSIS_24: WifiChannelAnalysis[] = analyzeChannels(INITIAL_SCANNED_NETWORKS, '2.4 GHz');
export const INITIAL_CHANNEL_ANALYSIS_6G: WifiChannelAnalysis[] = analyzeChannels(INITIAL_SCANNED_NETWORKS, '6 GHz');

export const INITIAL_BEST_CHANNELS = {
  '5 GHz': recommendBestChannel(INITIAL_CHANNEL_ANALYSIS_5G, '5 GHz'),
  '2.4 GHz': recommendBestChannel(INITIAL_CHANNEL_ANALYSIS_24, '2.4 GHz'),
  '6 GHz': recommendBestChannel(INITIAL_CHANNEL_ANALYSIS_6G, '6 GHz')
};

export const INITIAL_WIFI_SCORE: WifiScoreBreakdown = calculateWifiScore(
  INITIAL_WIFI_CONNECTION.rssi,
  INITIAL_WIFI_CONNECTION.snr,
  INITIAL_WIFI_CONNECTION.linkRateMbps,
  INITIAL_WIFI_CONNECTION.maxRateMbps,
  12, // Baixo congestionamento no canal 36
  2.1 // Baixa variação de sinal
);

export const INITIAL_DIAGNOSTICS: WifiDiagnosticItem[] = generateTechnicalDiagnostics(
  INITIAL_WIFI_CONNECTION,
  INITIAL_WIFI_SCORE,
  INITIAL_CHANNEL_ANALYSIS_5G,
  INITIAL_BEST_CHANNELS['5 GHz']
);

export const INITIAL_HISTORIC_DIAGNOSTICS: WifiHistoricDiagnostic[] = [
  {
    id: 'wifi-diag-101',
    tenantId: 'tenant-demo',
    userId: 'usr-101',
    userName: 'Carlos Amoroso (TI)',
    assetId: 'CI-PC-023',
    assetTag: 'TMB-2026-0023',
    deviceName: 'PC-023-CARLOS (Dell Latitude 5420)',
    ticketId: 'tkt-1042',
    ticketCode: '#1042',
    ssid: 'WorkPulse-Corporate-2G',
    bssid: '74:83:C2:88:91:A5',
    band: '2.4 GHz',
    channel: 6,
    rssi: -78,
    snr: 14,
    score: 42,
    rating: 'RUIM',
    bottleneck: 'Wi-Fi (Sinal ou Canal)',
    recommendation: 'Trocar para a rede 5 GHz do AP ou aproximar o notebook do corredor.',
    timestamp: '2026-09-05T10:14:00.000Z',
    beforeVsAfterTag: 'Antes'
  },
  {
    id: 'wifi-diag-102',
    tenantId: 'tenant-demo',
    userId: 'usr-101',
    userName: 'Carlos Amoroso (TI)',
    assetId: 'CI-PC-023',
    assetTag: 'TMB-2026-0023',
    deviceName: 'PC-023-CARLOS (Dell Latitude 5420)',
    ticketId: 'tkt-1042',
    ticketCode: '#1042',
    ssid: 'WorkPulse-Corporate-5G',
    bssid: '74:83:C2:88:91:A4',
    band: '5 GHz',
    channel: 36,
    rssi: -48,
    snr: 44,
    score: 94,
    rating: 'EXCELENTE',
    bottleneck: 'Nenhum (Conexão Ideal)',
    recommendation: 'Migração para 5 GHz concluída com sucesso. Ganho de +52 pontos no Score Wi-Fi e vazão de 866 Mbps.',
    timestamp: '2026-09-05T10:35:00.000Z',
    beforeVsAfterTag: 'Depois'
  },
  {
    id: 'wifi-diag-103',
    tenantId: 'tenant-demo',
    userId: 'usr-102',
    userName: 'Mariana Silva (Suporte N2)',
    assetId: 'CI-NB-014',
    assetTag: 'TMB-2026-0014',
    deviceName: 'NB-014-MARIANA (MacBook Pro M2)',
    ticketId: 'tkt-1088',
    ticketCode: '#1088',
    ssid: 'WorkPulse-Corporate-5G',
    bssid: '74:83:C2:88:91:A4',
    band: '5 GHz',
    channel: 36,
    rssi: -52,
    snr: 40,
    score: 91,
    rating: 'EXCELENTE',
    bottleneck: 'Nenhum (Conexão Ideal)',
    recommendation: 'Conexão estável e dentro de parâmetros ideais.',
    timestamp: '2026-09-06T15:20:00.000Z',
    beforeVsAfterTag: 'Padrão'
  }
];

export const LOCAL_AGENT_SCRIPTS = {
  windows: `# WorkPulse WIFI Pulse - Coletor do Agente Local (PowerShell)
$interfaces = netsh wlan show interfaces
$networks = netsh wlan show networks mode=bssid
$ipConfig = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null }
Write-Output "Telemetria Wi-Fi coletada com sucesso pelo Agente Windows."`,
  macos: `#!/bin/bash
AIRPORT="/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport"
$AIRPORT -I`,
  linux: `#!/bin/bash
iw dev | awk '$1=="Interface"{print $2}'`,
  android: `// WorkPulse Android Agent Collector Snippet`
};

export const INITIAL_WIFI_DATA: WifiPulseData = {
  currentConnection: INITIAL_WIFI_CONNECTION,
  scannedNetworks: INITIAL_SCANNED_NETWORKS,
  channelAnalysis5g: INITIAL_CHANNEL_ANALYSIS_5G,
  channelAnalysis24: INITIAL_CHANNEL_ANALYSIS_24,
  channelAnalysis6g: INITIAL_CHANNEL_ANALYSIS_6G,
  bestChannel5g: INITIAL_BEST_CHANNELS['5 GHz'],
  bestChannel24: INITIAL_BEST_CHANNELS['2.4 GHz'],
  bestChannel6g: INITIAL_BEST_CHANNELS['6 GHz'],
  signalHistory: [
    { time: '14:25', rssi: -50, snr: 42, noise: -92, linkRate: 866 },
    { time: '14:26', rssi: -49, snr: 43, noise: -92, linkRate: 866 },
    { time: '14:27', rssi: -48, snr: 44, noise: -92, linkRate: 866 },
    { time: '14:28', rssi: -51, snr: 41, noise: -92, linkRate: 780 },
    { time: '14:29', rssi: -48, snr: 44, noise: -92, linkRate: 866 },
    { time: '14:30', rssi: -48, snr: 44, noise: -92, linkRate: 866 }
  ],
  score: INITIAL_WIFI_SCORE,
  diagnostics: INITIAL_DIAGNOSTICS,
  lanDevices: INITIAL_LAN_DEVICES,
  dualTest: {
    wifi: {
      rssiDbm: -48,
      snrDb: 44,
      linkRateMbps: 866,
      gatewayPingMs: 2,
      channel: 36,
      band: '5 GHz',
      quality: 'Excelente (94%)'
    },
    internet: {
      downloadMbps: 485,
      uploadMbps: 290,
      pingMs: 14,
      jitterMs: 1.8,
      packetLossPercent: 0,
      serverLocation: 'São Paulo, SP (Claro Brasil / Equinix SP4)',
      isp: 'Claro Fibra Empresas',
      ipWan: '177.18.240.58'
    },
    comparison: {
      verdict: 'Desempenho Excelente em Todas as Camadas',
      bottleneck: 'Nenhum (Conexão Perfeita)',
      efficiencyRatio: 96,
      explanation: 'Tanto o link Wi-Fi local (-48 dBm, 866 Mbps) quanto a conexão de internet com o provedor (485 Mbps / 14ms) estão operando com estabilidade e capacidade máxima.'
    }
  },
  history: [
    {
      id: 'wifi-diag-101',
      timestamp: 'Hoje às 10:14',
      ssid: 'WorkPulse-Corporate-2G',
      bssid: '74:83:C2:88:91:A5',
      band: '2.4 GHz',
      channel: 6,
      channelWidthMhz: 20,
      rssi: -78,
      snr: 14,
      score: 42,
      downloadMbps: 38,
      uploadMbps: 18,
      ticketId: 'CH-2026-0841',
      notes: 'Medição inicial na sala de reuniões. Rede 2.4 GHz saturada com alta atenuação de paredes.'
    },
    {
      id: 'wifi-diag-102',
      timestamp: 'Hoje às 10:35',
      ssid: 'WorkPulse-Corporate-5G',
      bssid: '74:83:C2:88:91:A4',
      band: '5 GHz',
      channel: 36,
      channelWidthMhz: 80,
      rssi: -48,
      snr: 44,
      score: 94,
      downloadMbps: 485,
      uploadMbps: 290,
      ticketId: 'CH-2026-0841',
      notes: 'Pós-migração para 5 GHz no Canal 36. Ganho de +52 pts no score e vazão de 485 Mbps.'
    },
    {
      id: 'wifi-diag-103',
      timestamp: 'Ontem às 15:20',
      ssid: 'WorkPulse-Corporate-5G',
      bssid: '74:83:C2:88:91:A4',
      band: '5 GHz',
      channel: 36,
      channelWidthMhz: 80,
      rssi: -52,
      snr: 40,
      score: 91,
      downloadMbps: 460,
      uploadMbps: 280,
      ticketId: 'CH-2026-0839',
      notes: 'Auditoria periódica de estabilidade no setor financeiro.'
    }
  ]
};
