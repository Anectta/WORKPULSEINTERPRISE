export type WifiBand = '2.4 GHz' | '5 GHz' | '6 GHz';
export type WifiChannelWidth = 20 | 40 | 80 | 160 | 320;
export type WifiQualityStatus = 'EXCELENTE' | 'BOM' | 'REGULAR' | 'RUIM' | 'CRÍTICO';
export type WifiCongestionLevel = 'Muito baixo' | 'Baixo' | 'Moderado' | 'Alto' | 'Crítico';
export type WifiAgentPlatform = 'WINDOWS' | 'MACOS' | 'LINUX' | 'ANDROID' | 'Windows' | 'macOS' | 'Linux' | 'Android' | 'Browser (Web)';
export type WifiDeviceType = 'Router' | 'Laptop' | 'Smartphone' | 'Printer' | 'SmartTV' | 'Server' | 'IPCamera' | 'IoT' | 'Workstation' | 'Notebook' | 'Smart TV' | 'Impressora' | 'Access Point' | 'Roteador / Gateway' | 'Câmera IP' | 'Servidor' | 'Outro';
export type WifiDiagnosticSeverity = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAIXO' | 'INFORMATIVO' | 'ok' | 'warning' | 'critical';

export type WifiSubTab =
  | 'dashboard'
  | 'scanner'
  | 'channel_map'
  | 'channel_analysis'
  | 'best_channel'
  | 'realtime_signal'
  | 'quality_score'
  | 'diagnostics'
  | 'devices'
  | 'dual_diagnostic'
  | 'history'
  | 'report';

export interface WifiConnectionStatus {
  ssid: string;
  bssid: string;
  band: WifiBand;
  channel: number;
  frequencyMhz: number;
  channelWidthMhz: WifiChannelWidth;
  rssi: number; // dBm (ex: -48)
  noise: number; // dBm (ex: -92)
  snr: number; // dB (ex: 44)
  linkRateMbps: number; // ex: 866 Mbps
  maxRateMbps: number; // ex: 1200 Mbps
  wifiStandard: string; // 'Wi-Fi 6 (802.11ax)', 'Wi-Fi 5 (802.11ac)', etc.
  security: string; // 'WPA2-Personal', 'WPA3-Personal', etc.
  qualityPercent: number; // 0-100%
  overallStatus: WifiQualityStatus;
  interfaceName: string;
  interfaceDescription: string;
  macAddress: string;
  ipAddress: string;
  subnetMask: string;
  gateway: string;
  dnsServers: string[];
  dhcpServer: string;
  isOnline: boolean;
  agentConnected: boolean;
  agentPlatform: WifiAgentPlatform;
  lastScanTimestamp: string;
}

export interface WifiScannedNetwork {
  id: string;
  ssid: string;
  bssid: string;
  vendor: string;
  band: WifiBand;
  frequencyMhz: number;
  channel: number;
  channelWidthMhz: WifiChannelWidth;
  rssi: number; // dBm
  snr?: number;
  security: string;
  isCurrent: boolean;
  beaconIntervalMs?: number;
  lastSeen: string;
}

export interface WifiChannelAnalysis {
  channel: number;
  band: WifiBand;
  centerFreqMhz: number;
  networksCount: number;
  networks: {
    ssid: string;
    bssid: string;
    rssi: number;
    width: WifiChannelWidth;
    isCurrent: boolean;
  }[];
  maxRssi: number;
  avgRssi: number;
  congestionLevel: WifiCongestionLevel;
  congestionScore: number; // 0 (livre) a 100 (saturado)
  coChannelInterference: number;
  adjacentInterference: number;
  isRecommended: boolean;
  recommendationRank?: number;
  notes?: string;
}

export interface WifiChannelRecommendation {
  band: WifiBand;
  bestChannel: number;
  secondaryChannels: number[];
  congestion: WifiCongestionLevel;
  interference: 'Muito baixa' | 'Baixa' | 'Moderada' | 'Alta' | 'Crítica' | string;
  confidencePercent: number;
  reasoning: string;
  widthRecommendation: WifiChannelWidth;
}

export interface WifiSignalPoint {
  time: string;
  rssi: number;
  snr: number;
  noise?: number;
  linkRate?: number;
}

export interface WifiSignalHistoryPoint {
  timestamp: string;
  timeFormatted: string;
  rssi: number;
  snr: number;
  linkRate: number;
  noise: number;
}

export interface WifiScoreBreakdown {
  totalScore: number; // 0 - 100
  rating: WifiQualityStatus;
  rssiScore: number;
  rssiWeight: number; // 30%
  snrScore: number;
  snrWeight: number; // 25%
  interferenceScore: number;
  interferenceWeight: number; // 20%
  stabilityScore: number;
  stabilityWeight: number; // 15%
  linkRateScore: number;
  linkRateWeight: number; // 10%
  summaryBullets: string[];
}

export interface WifiDiagnosticItem {
  id: string;
  category: string;
  severity?: WifiDiagnosticSeverity;
  status?: 'ok' | 'warning' | 'critical';
  title: string;
  metricName?: string;
  metricValue?: string;
  impact: string;
  rootCause?: string;
  description: string;
  recommendation?: string;
  actionableRecommendation?: string;
}

export interface WifiLanDevice {
  id: string;
  name?: string;
  hostname?: string;
  ip: string;
  mac: string;
  vendor: string;
  deviceType: WifiDeviceType;
  status: 'ONLINE' | 'OFFLINE' | 'Online' | 'Offline';
  latencyMs?: number;
  lastSeen?: string;
  lastActive?: string;
  discoveryMethod?: string;
  isGateway?: boolean;
  isThisDevice?: boolean;
  isCurrentDevice?: boolean;
}

export interface WifiSpeedAndDualDiagnostic {
  wifi: {
    rssi?: number;
    rssiDbm?: number;
    snr?: number;
    snrDb?: number;
    linkRateMbps: number;
    qualityPercent?: number;
    gatewayPingMs?: number;
    channel: number;
    band: string;
    quality?: string;
  };
  internet: {
    downloadMbps: number;
    uploadMbps: number;
    pingMs: number;
    jitterMs: number;
    packetLossPercent: number;
    serverLocation: string;
    ispName?: string;
    isp?: string;
    ipWan?: string;
  };
  conclusion?: string;
  bottleneck?: 'Nenhum (Conexão Ideal)' | 'Wi-Fi (Sinal ou Canal)' | 'Internet (Provedor WAN)' | 'Misto (Wi-Fi + Link WAN)' | string;
  diagnosisBullets?: string[];
  testedAt?: string;
  comparison?: {
    verdict: string;
    bottleneck: string;
    efficiencyRatio: number;
    explanation: string;
  };
}

export type WifiDualTestResult = WifiSpeedAndDualDiagnostic;

export interface WifiHistoricDiagnostic {
  id: string;
  tenantId?: string;
  userId?: string;
  userName?: string;
  assetId?: string;
  assetTag?: string;
  deviceName?: string;
  ticketId?: string;
  ticketCode?: string;
  ssid: string;
  bssid: string;
  band: string;
  channel: number;
  channelWidthMhz?: number;
  rssi: number;
  snr: number;
  score: number;
  rating?: WifiQualityStatus;
  bottleneck?: string;
  recommendation?: string;
  timestamp: string;
  beforeVsAfterTag?: 'Antes' | 'Depois' | 'Padrão';
  downloadMbps?: number;
  uploadMbps?: number;
  notes?: string;
  fullData?: {
    connection: WifiConnectionStatus;
    scoreBreakdown: WifiScoreBreakdown;
    dualTest?: WifiSpeedAndDualDiagnostic;
  };
}

export type WifiDiagnosticHistoryRecord = WifiHistoricDiagnostic;

export interface WifiReportPayload {
  reportId: string;
  clientName: string;
  deviceName: string;
  technician: string;
  date: string;
  connection: WifiConnectionStatus;
  networksScannedCount: number;
  channelAnalysis: WifiChannelAnalysis[];
  bestChannel: WifiChannelRecommendation;
  diagnostics: WifiDiagnosticItem[];
  dualTest?: WifiSpeedAndDualDiagnostic;
  score: WifiScoreBreakdown;
  conclusion: string;
  recommendation: string;
}

export interface WifiPulseData {
  currentConnection: WifiConnectionStatus;
  scannedNetworks: WifiScannedNetwork[];
  channelAnalysis5g: WifiChannelAnalysis[];
  channelAnalysis24: WifiChannelAnalysis[];
  channelAnalysis6g: WifiChannelAnalysis[];
  bestChannel5g: WifiChannelRecommendation;
  bestChannel24: WifiChannelRecommendation;
  bestChannel6g: WifiChannelRecommendation;
  signalHistory: WifiSignalPoint[];
  score: WifiScoreBreakdown;
  diagnostics: WifiDiagnosticItem[];
  lanDevices: WifiLanDevice[];
  dualTest: WifiDualTestResult;
  history: WifiDiagnosticHistoryRecord[];
}
