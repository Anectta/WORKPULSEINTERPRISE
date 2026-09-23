import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Radio,
  Layers,
  SlidersHorizontal,
  Sparkles,
  Activity,
  Award,
  AlertTriangle,
  Smartphone,
  Gauge,
  History,
  FileText,
  RefreshCw,
  Laptop,
  CheckCircle2,
  Building,
  ShieldCheck,
  ChevronRight,
  Play,
  Share2
} from 'lucide-react';

// Subviews
import { WifiDashboardView } from './WifiDashboardView';
import { WifiScannerView } from './WifiScannerView';
import { WifiChannelMapView } from './WifiChannelMapView';
import { WifiChannelAnalysisView } from './WifiChannelAnalysisView';
import { WifiBestChannelView } from './WifiBestChannelView';
import { WifiRealtimeSignalView } from './WifiRealtimeSignalView';
import { WifiQualityScoreView } from './WifiQualityScoreView';
import { WifiDiagnosticsView } from './WifiDiagnosticsView';
import { WifiDevicesView } from './WifiDevicesView';
import { WifiDualDiagnosticView } from './WifiDualDiagnosticView';
import { WifiHistoryView } from './WifiHistoryView';
import { WifiTechnicalReportView } from './WifiTechnicalReportView';

// Modals
import { WifiAgentIntegrationModal } from './WifiAgentIntegrationModal';
import { WifiAttachToTicketModal } from './WifiAttachToTicketModal';

// Types & Initial Data
import {
  WifiPulseData,
  WifiSubTab,
  WifiDiagnosticHistoryRecord,
  WifiScannedNetwork,
  WifiBand
} from '../../types/wifiPulse';
import { INITIAL_WIFI_DATA } from '../../data/wifiInitialData';
import { CurrentUser } from '../../types';

interface WifiPulseModuleProps {
  currentUser?: CurrentUser;
}

export const WifiPulseModule: React.FC<WifiPulseModuleProps> = ({
  currentUser
}) => {
  const [activeSubTab, setActiveSubTab] = useState<WifiSubTab>('dashboard');
  const [wifiData, setWifiData] = useState<WifiPulseData>(INITIAL_WIFI_DATA);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isExecutingAgent, setIsExecutingAgent] = useState<boolean>(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState<boolean>(false);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState<boolean>(false);
  const [attachedTicketId, setAttachedTicketId] = useState<string>('CH-2026-0841');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Carrega dados da API /api/wifi/status
  useEffect(() => {
    fetchWifiData();
  }, []);

  const fetchWifiData = async () => {
    try {
      const res = await fetch('/api/wifi/status');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          setWifiData(json.data);
        }
      }
    } catch (err) {
      console.warn('API /api/wifi/status offline ou em fallback local:', err);
    }
  };

  const showNotification = (text: string, type: 'success' | 'info' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // 1. Ação de Varredura RF em Tempo Real
  const handleScanNow = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/wifi/scan', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          setWifiData(json.data);
          showNotification('✓ Varredura espectral e medição de RF atualizadas com sucesso!');
          return;
        }
      }
    } catch (err) {
      console.warn('Scan fallback:', err);
    } finally {
      setTimeout(() => {
        setIsScanning(false);
      }, 600);
    }
  };

  // 2. Ação de Conexão / Migração para outra rede do Scanner
  const handleSwitchNetwork = async (network: WifiScannedNetwork) => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/wifi/switch-network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ networkId: network.id, ssid: network.ssid })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          setWifiData(json.data);
          showNotification(`✓ Conectado com sucesso a ${network.ssid} (${network.band}, Canal ${network.channel})!`);
          return;
        }
      }
    } catch (err) {
      console.warn('Switch network fallback:', err);
    } finally {
      setTimeout(() => setIsScanning(false), 500);
    }
  };

  // 3. Ação de Aplicação do Canal Recomendado
  const handleApplyBestChannel = async (channel: number, band: WifiBand) => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/wifi/switch-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, band })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          setWifiData(json.data);
          showNotification(`✓ Canal ${channel} (${band}) aplicado com sucesso! Score e isolamento otimizados.`);
          return;
        }
      }
    } catch (err) {
      console.warn('Apply channel fallback:', err);
    } finally {
      setTimeout(() => setIsScanning(false), 500);
    }
  };

  // 4. Ação de Varredura ARP de Dispositivos LAN
  const handleRunArpScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/wifi/arp-scan', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          setWifiData(json.data);
          showNotification(`✓ Varredura ARP concluída! ${json.data.lanDevices?.length || 0} dispositivos mapeados.`);
          return;
        }
      }
    } catch (err) {
      console.warn('ARP scan fallback:', err);
    } finally {
      setTimeout(() => setIsScanning(false), 600);
    }
  };

  // 5. Ação de Teste Dual (Velocímetro Wi-Fi vs Internet WAN)
  const handleRunSpeedTest = async () => {
    try {
      const res = await fetch('/api/wifi/dual-test', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          setWifiData(prev => ({
            ...prev,
            dualTest: json.data
          }));
          showNotification('✓ Teste de velocidade Dual concluído com veredito técnico!');
        }
      }
    } catch (err) {
      console.warn('Speedtest error:', err);
    }
  };

  // 6. Ação de Executar Coleta do Agente Local
  const handleRunLocalAgentCollect = async () => {
    setIsExecutingAgent(true);
    try {
      const res = await fetch('/api/wifi/agent-collect', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          setWifiData(json.data);
          showNotification('✓ Agente Local executou coleta de RF em nível de driver com sucesso!');
        }
      }
    } catch (err) {
      console.warn('Agent collect error:', err);
    } finally {
      setTimeout(() => setIsExecutingAgent(false), 800);
    }
  };

  // 7. Ação de Salvar no Histórico (com tag Antes ou Depois)
  const handleSaveToHistory = async (tag: 'Antes' | 'Depois' | 'Padrão' = 'Depois') => {
    try {
      const res = await fetch('/api/wifi/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: attachedTicketId,
          ticketCode: `#${attachedTicketId.replace(/\D/g, '') || '1042'}`,
          beforeVsAfterTag: tag,
          score: wifiData.score.totalScore,
          bottleneck: wifiData.dualTest?.comparison?.bottleneck || 'Nenhum (Conexão Ideal)',
          recommendation: `Medição ${tag.toLowerCase()} registrada com Score ${wifiData.score.totalScore}% e RSSI ${wifiData.currentConnection.rssi} dBm.`
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.data) {
          setWifiData(json.data);
          showNotification(`✓ Medição salva no histórico com a marcação "${tag}"!`);
        }
      }
    } catch (err) {
      console.warn('Save history error:', err);
    }
  };

  const handleAttachSuccess = (ticketId: string) => {
    setAttachedTicketId(ticketId);
    showNotification(`✓ Laudo técnico de Wi-Fi anexado com sucesso ao chamado ${ticketId}!`);
  };

  const handleViewReportFromHistory = (rec: WifiDiagnosticHistoryRecord) => {
    if (rec.ticketId) setAttachedTicketId(rec.ticketId);
    setActiveSubTab('report');
  };

  interface SubTabItem {
    id: WifiSubTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    count?: number;
    highlight?: boolean;
  }

  // Definição das 12 Abas Nativas
  const SUB_TABS: SubTabItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Wifi, badge: `${wifiData.score.totalScore}%` },
    { id: 'scanner', label: 'Scanner', icon: Radio, count: wifiData.scannedNetworks.length },
    { id: 'channel_map', label: 'Mapa Espectral', icon: Layers },
    { id: 'channel_analysis', label: 'Análise de Canais', icon: SlidersHorizontal },
    { id: 'best_channel', label: 'Melhor Canal', icon: Sparkles, highlight: true },
    { id: 'realtime_signal', label: 'Sinal Contínuo', icon: Activity },
    { id: 'quality_score', label: 'Quality Score', icon: Award },
    { id: 'diagnostics', label: 'Diagnósticos', icon: AlertTriangle, count: wifiData.diagnostics.length },
    { id: 'devices', label: 'Dispositivos LAN', icon: Smartphone, count: wifiData.lanDevices.length },
    { id: 'dual_diagnostic', label: 'Wi-Fi vs Internet', icon: Gauge },
    { id: 'history', label: 'Histórico & Comparativo', icon: History },
    { id: 'report', label: 'Laudo Técnico', icon: FileText }
  ];

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-12">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notification.text}</span>
        </div>
      )}

      {/* Top Main Module Header with Live Action Buttons */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 shrink-0">
              <Wifi className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  WIFI Pulse
                </h1>
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
                  Módulo Nativo de Diagnóstico RF
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                Analisador de Radiofrequência, Espectro, Ocupação de Canais e Teste Dual Wi-Fi vs WAN.
              </p>
            </div>
          </div>
        </div>

        {/* Global Quick Action Execution Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Action 1: Scan Now */}
          <button
            onClick={handleScanNow}
            disabled={isScanning}
            className="px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center space-x-2 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Executar Varredura de RF agora"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Varrendo Espectro...' : 'Escanear Redes'}</span>
          </button>

          {/* Action 2: Run Local Agent */}
          <button
            onClick={handleRunLocalAgentCollect}
            disabled={isExecutingAgent}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center space-x-2 border border-slate-200/80 dark:border-slate-700 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Coleta direta do Agente Local"
          >
            <Laptop className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${isExecutingAgent ? 'animate-pulse' : ''}`} />
            <span>{isExecutingAgent ? 'Lendo Driver...' : 'Coleta Agente'}</span>
          </button>

          {/* Action 3: Dual Speedtest */}
          <button
            onClick={() => {
              setActiveSubTab('dual_diagnostic');
              handleRunSpeedTest();
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center space-x-2 shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Executar teste de velocidade e gargalos"
          >
            <Gauge className="w-4 h-4" />
            <span>Teste Dual (WAN/LAN)</span>
          </button>

          {/* Action 4: Attach to Ticket Modal */}
          <button
            onClick={() => setIsAttachModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center space-x-2 transition-all hover:opacity-90 active:scale-95 cursor-pointer shadow-xs"
          >
            <Share2 className="w-4 h-4 text-cyan-400 dark:text-cyan-600" />
            <span>Anexar a Chamado</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs Grid */}
      <div className="bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none">
        <div className="flex items-center space-x-1 min-w-max">
          {SUB_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as WifiSubTab)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-xs border border-slate-200/60 dark:border-slate-700/60'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>

                {/* Badges */}
                {tab.badge && (
                  <span className={`px-1.5 py-0.2 text-[10px] font-black rounded-md ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {tab.badge}
                  </span>
                )}

                {tab.count !== undefined && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {tab.count}
                  </span>
                )}

                {tab.highlight && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Sub-Views Rendering */}
      {activeSubTab === 'dashboard' && (
        <WifiDashboardView
          connection={wifiData.currentConnection}
          score={wifiData.score}
          isScanning={isScanning}
          onScanNow={handleScanNow}
          onNavigateTab={(tab) => setActiveSubTab(tab as WifiSubTab)}
          onOpenAgentModal={() => setIsAgentModalOpen(true)}
          onOpenAttachModal={() => setIsAttachModalOpen(true)}
        />
      )}

      {activeSubTab === 'scanner' && (
        <WifiScannerView
          networks={wifiData.scannedNetworks}
          isScanning={isScanning}
          onScanNow={handleScanNow}
          onSwitchNetwork={handleSwitchNetwork}
        />
      )}

      {activeSubTab === 'channel_map' && (
        <WifiChannelMapView
          networks={wifiData.scannedNetworks}
          currentChannel={wifiData.currentConnection.channel}
          currentBand={wifiData.currentConnection.band}
          isScanning={isScanning}
          onScanNow={handleScanNow}
        />
      )}

      {activeSubTab === 'channel_analysis' && (
        <WifiChannelAnalysisView
          channels5g={wifiData.channelAnalysis5g}
          channels24={wifiData.channelAnalysis24}
          channels6g={wifiData.channelAnalysis6g}
          currentChannel={wifiData.currentConnection.channel}
          currentBand={wifiData.currentConnection.band}
          isScanning={isScanning}
          onScanNow={handleScanNow}
          onApplyChannel={handleApplyBestChannel}
        />
      )}

      {activeSubTab === 'best_channel' && (
        <WifiBestChannelView
          best5g={wifiData.bestChannel5g}
          best24={wifiData.bestChannel24}
          best6g={wifiData.bestChannel6g}
          currentConnection={wifiData.currentConnection}
          isScanning={isScanning}
          onScanNow={handleScanNow}
          onApplyBestChannel={handleApplyBestChannel}
        />
      )}

      {activeSubTab === 'realtime_signal' && (
        <WifiRealtimeSignalView
          signalHistory={wifiData.signalHistory}
          currentConnection={wifiData.currentConnection}
          isScanning={isScanning}
          onScanNow={handleScanNow}
        />
      )}

      {activeSubTab === 'quality_score' && (
        <WifiQualityScoreView
          score={wifiData.score}
          connection={wifiData.currentConnection}
        />
      )}

      {activeSubTab === 'diagnostics' && (
        <WifiDiagnosticsView
          diagnostics={wifiData.diagnostics}
          isScanning={isScanning}
          onScanNow={handleScanNow}
          onNavigateTab={(tab) => setActiveSubTab(tab as WifiSubTab)}
          onApplyChannel={handleApplyBestChannel}
        />
      )}

      {activeSubTab === 'devices' && (
        <WifiDevicesView
          devices={wifiData.lanDevices}
          isScanning={isScanning}
          onScanNow={handleRunArpScan}
        />
      )}

      {activeSubTab === 'dual_diagnostic' && (
        <WifiDualDiagnosticView
          dualTest={wifiData.dualTest}
          connection={wifiData.currentConnection}
          onRunSpeedTest={handleRunSpeedTest}
        />
      )}

      {activeSubTab === 'history' && (
        <WifiHistoryView
          historyRecords={wifiData.history}
          onViewReport={handleViewReportFromHistory}
          onSaveCurrentMeasurement={handleSaveToHistory}
        />
      )}

      {activeSubTab === 'report' && (
        <WifiTechnicalReportView
          connection={wifiData.currentConnection}
          score={wifiData.score}
          dualTest={wifiData.dualTest}
          diagnostics={wifiData.diagnostics}
          tenantName={currentUser?.tenantName || 'Matriz Corporativa - WorkPulse Enterprise'}
          technicianName={currentUser?.name || 'Guilherme Silva (Analista Sênior)'}
          ticketId={attachedTicketId}
          onBackToDashboard={() => setActiveSubTab('dashboard')}
        />
      )}

      {/* Agent Modal */}
      <WifiAgentIntegrationModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        currentPlatform={wifiData.currentConnection.agentPlatform}
        tenantId={currentUser?.tenantId || 'tenant_matriz_001'}
        onRunCollector={handleRunLocalAgentCollect}
      />

      {/* Attach To Ticket Modal */}
      <WifiAttachToTicketModal
        isOpen={isAttachModalOpen}
        onClose={() => setIsAttachModalOpen(false)}
        connection={wifiData.currentConnection}
        score={wifiData.score}
        onAttachSuccess={handleAttachSuccess}
      />
    </div>
  );
};
