import { Router, Request, Response } from "express";
import { readJsonFile, writeJsonFileAtomic } from "./persistence/jsonFileStore";
import fs from "fs";
import path from "path";
import {
  INITIAL_WIFI_CONNECTION,
  INITIAL_SCANNED_NETWORKS,
  INITIAL_LAN_DEVICES,
  INITIAL_SIGNAL_HISTORY,
  INITIAL_HISTORIC_DIAGNOSTICS
} from "../src/data/wifiInitialData";
import {
  calculateWifiScore,
  analyzeChannels,
  recommendBestChannel,
  generateTechnicalDiagnostics,
  analyzeDualWifiAndInternet
} from "../src/utils/wifiAnalysisEngine";
import {
  WifiConnectionStatus,
  WifiScannedNetwork,
  WifiLanDevice,
  WifiHistoricDiagnostic,
  WifiSignalHistoryPoint,
  WifiBand,
  WifiPulseData
} from "../src/types/wifiPulse";

const router = Router();
import { DATA_DIR } from "./persistence/dataDir";
const WIFI_PERSIST_FILE = path.join(DATA_DIR, "wifi_persisted.json");
const MAX_HISTORIC_DIAGNOSTICS = 500;

interface WifiStore {
  currentConnection: WifiConnectionStatus;
  scannedNetworks: WifiScannedNetwork[];
  lanDevices: WifiLanDevice[];
  signalHistory: WifiSignalHistoryPoint[];
  historicDiagnostics: WifiHistoricDiagnostic[];
}

function loadWifiStore(): WifiStore {
  const result = readJsonFile<WifiStore>(WIFI_PERSIST_FILE);
  if (result.status === "ok") {
    const loaded = result.data;
    // Limita o histórico de diagnósticos para o arquivo não crescer indefinidamente
    if (Array.isArray(loaded.historicDiagnostics) && loaded.historicDiagnostics.length > MAX_HISTORIC_DIAGNOSTICS) {
      loaded.historicDiagnostics = loaded.historicDiagnostics.slice(0, MAX_HISTORIC_DIAGNOSTICS);
    }
    return loaded;
  }

  const initialStore: WifiStore = {
    currentConnection: { ...INITIAL_WIFI_CONNECTION },
    scannedNetworks: [...INITIAL_SCANNED_NETWORKS],
    lanDevices: [...INITIAL_LAN_DEVICES],
    signalHistory: [...INITIAL_SIGNAL_HISTORY],
    historicDiagnostics: [...INITIAL_HISTORIC_DIAGNOSTICS]
  };

  try {
    writeJsonFileAtomic(WIFI_PERSIST_FILE, initialStore);
  } catch (e) {
    console.error("Erro ao salvar store inicial do wifi:", e);
  }

  return initialStore;
}

function saveWifiStore(store: WifiStore) {
  try {
    if (store.historicDiagnostics.length > MAX_HISTORIC_DIAGNOSTICS) {
      store.historicDiagnostics = store.historicDiagnostics.slice(0, MAX_HISTORIC_DIAGNOSTICS);
    }
    writeJsonFileAtomic(WIFI_PERSIST_FILE, store);
  } catch (err) {
    console.error("Erro ao salvar wifi_persisted.json:", err);
  }
}

function buildFullWifiData(store: WifiStore): WifiPulseData {
  const ch5g = analyzeChannels(store.scannedNetworks, '5 GHz');
  const ch24 = analyzeChannels(store.scannedNetworks, '2.4 GHz');
  const ch6g = analyzeChannels(store.scannedNetworks, '6 GHz');

  const best5g = recommendBestChannel(ch5g, '5 GHz');
  const best24 = recommendBestChannel(ch24, '2.4 GHz');
  const best6g = recommendBestChannel(ch6g, '6 GHz');

  const currentBandList =
    store.currentConnection.band === '2.4 GHz' ? ch24 :
    store.currentConnection.band === '6 GHz' ? ch6g : ch5g;

  const currentCh = currentBandList.find(c => c.channel === store.currentConnection.channel);
  const congScore = currentCh?.congestionScore || 12;

  const score = calculateWifiScore(
    store.currentConnection.rssi,
    store.currentConnection.snr,
    store.currentConnection.linkRateMbps,
    store.currentConnection.maxRateMbps,
    congScore,
    2.2
  );

  const bestForCurrentBand =
    store.currentConnection.band === '2.4 GHz' ? best24 :
    store.currentConnection.band === '6 GHz' ? best6g : best5g;

  const diagnostics = generateTechnicalDiagnostics(
    store.currentConnection,
    score,
    currentBandList,
    bestForCurrentBand
  );

  const dualTest = analyzeDualWifiAndInternet(store.currentConnection, {
    downloadMbps: 485.0,
    uploadMbps: 290.0,
    pingMs: 14,
    jitterMs: 1.8,
    packetLossPercent: 0,
    serverLocation: 'São Paulo, SP (Claro Brasil / Equinix SP4)',
    ispName: 'Claro Fibra Empresas'
  });

  return {
    currentConnection: store.currentConnection,
    scannedNetworks: store.scannedNetworks,
    channelAnalysis5g: ch5g,
    channelAnalysis24: ch24,
    channelAnalysis6g: ch6g,
    bestChannel5g: best5g,
    bestChannel24: best24,
    bestChannel6g: best6g,
    signalHistory: store.signalHistory.map(h => ({
      time: h.timeFormatted || '12:00',
      rssi: h.rssi,
      snr: h.snr,
      noise: h.noise,
      linkRate: h.linkRate
    })),
    score,
    diagnostics,
    lanDevices: store.lanDevices,
    dualTest,
    history: store.historicDiagnostics
  };
}

// 1. GET /api/wifi/status - Estado completo
router.get("/status", (req: Request, res: Response) => {
  const store = loadWifiStore();
  const data = buildFullWifiData(store);
  res.json({
    status: "success",
    data,
    timestamp: new Date().toISOString()
  });
});

// 2. POST /api/wifi/scan - Executa varredura de RF
router.post("/scan", (req: Request, res: Response) => {
  const store = loadWifiStore();
  store.currentConnection.lastScanTimestamp = new Date().toISOString();

  // Flutuação natural de telemetria
  const jitter = (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 2);
  const newRssi = Math.min(-38, Math.max(-82, store.currentConnection.rssi + jitter));
  store.currentConnection.rssi = newRssi;
  store.currentConnection.snr = Math.abs(newRssi - store.currentConnection.noise);

  // Adiciona ao histórico contínuo
  const now = new Date();
  const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  store.signalHistory.push({
    timestamp: now.toISOString(),
    timeFormatted,
    rssi: newRssi,
    snr: store.currentConnection.snr,
    linkRate: store.currentConnection.linkRateMbps,
    noise: store.currentConnection.noise
  });

  if (store.signalHistory.length > 50) {
    store.signalHistory = store.signalHistory.slice(store.signalHistory.length - 50);
  }

  saveWifiStore(store);
  const data = buildFullWifiData(store);

  res.json({
    status: "success",
    simulated: true,
    message: "Simulação: leitura de sinal atualizada. O servidor não acessa o rádio Wi-Fi da estação.",
    data
  });
});

// 3. POST /api/wifi/switch-network - Conecta ou migra para outra rede Wi-Fi escaneada
router.post("/switch-network", (req: Request, res: Response) => {
  const store = loadWifiStore();
  const { networkId, ssid, band, channel, rssi, security } = req.body;

  let target = store.scannedNetworks.find(n => n.id === networkId);
  if (!target && ssid) {
    target = store.scannedNetworks.find(n => n.ssid === ssid);
  }

  if (target) {
    store.scannedNetworks.forEach(n => {
      n.isCurrent = n.id === target!.id;
    });

    store.currentConnection = {
      ...store.currentConnection,
      ssid: target.ssid,
      bssid: target.bssid,
      band: target.band,
      channel: target.channel,
      frequencyMhz: target.frequencyMhz,
      channelWidthMhz: target.channelWidthMhz,
      rssi: target.rssi,
      snr: target.snr || Math.abs(target.rssi - -92),
      security: target.security,
      linkRateMbps: target.band === '6 GHz' ? 1200 : target.band === '5 GHz' ? 866 : 144,
      maxRateMbps: target.band === '6 GHz' ? 2400 : target.band === '5 GHz' ? 1200 : 300,
      wifiStandard: target.band === '6 GHz' ? 'Wi-Fi 6E (802.11ax)' : target.band === '5 GHz' ? 'Wi-Fi 6 (802.11ax)' : 'Wi-Fi 4 (802.11n)',
      lastScanTimestamp: new Date().toISOString()
    };
  } else if (ssid && band && channel) {
    store.currentConnection.ssid = ssid;
    store.currentConnection.band = band;
    store.currentConnection.channel = Number(channel);
    store.currentConnection.rssi = Number(rssi || -55);
    store.currentConnection.snr = Math.abs(store.currentConnection.rssi - -92);
    if (security) store.currentConnection.security = security;
  }

  saveWifiStore(store);
  const data = buildFullWifiData(store);

  res.json({
    status: "success",
    simulated: true,
    message: `Simulação: rede ${store.currentConnection.ssid} selecionada no painel. Nenhuma conexão real foi alterada.`,
    data
  });
});

// 4. POST /api/wifi/switch-channel - Aplica canal recomendado
router.post("/switch-channel", (req: Request, res: Response) => {
  const store = loadWifiStore();
  const { channel, band } = req.body;

  if (channel) {
    store.currentConnection.channel = Number(channel);
    if (band) store.currentConnection.band = band;

    // Sem melhoria fictícia de sinal: a troca de canal não é aplicada a nenhum equipamento real
    store.currentConnection.lastScanTimestamp = new Date().toISOString();
  }

  saveWifiStore(store);
  const data = buildFullWifiData(store);

  res.json({
    status: "success",
    simulated: true,
    message: `Simulação: canal ${store.currentConnection.channel} (${store.currentConnection.band}) registrado no painel. O roteador não foi reconfigurado.`,
    data
  });
});

// 5. POST /api/wifi/dual-test - Executa teste de velocidade
router.post("/dual-test", (req: Request, res: Response) => {
  const store = loadWifiStore();
  const { internet } = req.body || {};

  const internetData = internet || {
    downloadMbps: Number((450 + Math.random() * 50).toFixed(1)),
    uploadMbps: Number((270 + Math.random() * 30).toFixed(1)),
    pingMs: Math.floor(12 + Math.random() * 5),
    jitterMs: Number((1.2 + Math.random() * 0.8).toFixed(1)),
    packetLossPercent: 0,
    serverLocation: "São Paulo, SP (Claro Brasil / Equinix SP4)",
    ispName: "Claro Fibra Empresas"
  };

  const dualResult = analyzeDualWifiAndInternet(store.currentConnection, internetData);

  res.json({
    status: "success",
    simulated: !internet,
    data: dualResult
  });
});

// 6. POST /api/wifi/arp-scan - Varredura ARP de dispositivos na rede
router.post("/arp-scan", (req: Request, res: Response) => {
  const store = loadWifiStore();

  // Atualiza latências e status dos dispositivos
  store.lanDevices = store.lanDevices.map(d => ({
    ...d,
    latencyMs: d.isGateway ? 1 : Math.floor(Math.random() * 6) + 2,
    lastActive: 'Agora'
  }));

  saveWifiStore(store);
  const data = buildFullWifiData(store);

  res.json({
    status: "success",
    simulated: true,
    message: `Simulação: lista de ${store.lanDevices.length} dispositivos atualizada (sem varredura ARP real).`,
    data
  });
});

// 7. POST /api/wifi/agent-collect - Coleta do agente local
router.post("/agent-collect", (req: Request, res: Response) => {
  const store = loadWifiStore();

  store.currentConnection.agentConnected = true;
  store.currentConnection.lastScanTimestamp = new Date().toISOString();
  store.currentConnection.qualityPercent = Math.min(100, Math.max(80, store.currentConnection.qualityPercent));

  saveWifiStore(store);
  const data = buildFullWifiData(store);

  res.json({
    status: "success",
    simulated: true,
    message: "Simulação: nenhum agente local coletou dados desta estação.",
    data
  });
});

// 8. POST /api/wifi/history - Salva medição no histórico
router.post("/history", (req: Request, res: Response) => {
  const store = loadWifiStore();
  const body = req.body || {};

  const newDiag: WifiHistoricDiagnostic = {
    id: `wifi-diag-${Date.now()}`,
    tenantId: body.tenantId || 'tenant-demo',
    userId: body.userId || 'usr-101',
    userName: body.userName || 'Técnico WorkPulse',
    assetId: body.assetId || 'CI-PC-023',
    assetTag: body.assetTag || 'TMB-2026-0023',
    deviceName: body.deviceName || store.currentConnection.interfaceDescription,
    ticketId: body.ticketId || 'CH-2026-0841',
    ticketCode: body.ticketCode || '#1041',
    ssid: store.currentConnection.ssid,
    bssid: store.currentConnection.bssid,
    band: store.currentConnection.band,
    channel: store.currentConnection.channel,
    rssi: store.currentConnection.rssi,
    snr: store.currentConnection.snr,
    score: body.score || store.currentConnection.qualityPercent,
    rating: store.currentConnection.overallStatus,
    bottleneck: body.bottleneck || 'Nenhum (Conexão Ideal)',
    recommendation: body.recommendation || 'Diagnóstico executado e validado.',
    timestamp: new Date().toISOString(),
    beforeVsAfterTag: body.beforeVsAfterTag || 'Depois'
  };

  store.historicDiagnostics.unshift(newDiag);
  saveWifiStore(store);
  const data = buildFullWifiData(store);

  res.json({
    status: "success",
    message: "Diagnóstico salvo no histórico com sucesso.",
    data,
    diagnostic: newDiag
  });
});

// 9. GET /api/wifi/networks
router.get("/networks", (req: Request, res: Response) => {
  const store = loadWifiStore();
  const band = req.query.band as WifiBand | undefined;
  let list = store.scannedNetworks;
  if (band) {
    list = list.filter(n => n.band === band);
  }
  res.json({
    status: "success",
    networks: list,
    total: list.length
  });
});

// 10. GET /api/wifi/history
router.get("/history", (req: Request, res: Response) => {
  const store = loadWifiStore();
  res.json({
    status: "success",
    history: store.historicDiagnostics,
    total: store.historicDiagnostics.length
  });
});

export default router;
