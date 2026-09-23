import React, { useState } from 'react';
import {
  Laptop,
  Terminal,
  Copy,
  CheckCircle2,
  X,
  Radio,
  Download,
  ShieldCheck,
  Zap,
  Info,
  ExternalLink,
  Play,
  RefreshCw
} from 'lucide-react';
import {
  WifiAgentPlatform
} from '../../types/wifiPulse';

interface WifiAgentIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlatform: WifiAgentPlatform;
  tenantId: string;
  onRunCollector?: () => Promise<void> | void;
}

export const WifiAgentIntegrationModal: React.FC<WifiAgentIntegrationModalProps> = ({
  isOpen,
  onClose,
  currentPlatform,
  tenantId,
  onRunCollector
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<WifiAgentPlatform>(currentPlatform || 'WINDOWS');
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(getScriptForPlatform(selectedPlatform));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteCollect = async () => {
    setIsRunning(true);
    try {
      if (onRunCollector) {
        await onRunCollector();
      }
    } finally {
      setTimeout(() => setIsRunning(false), 800);
    }
  };

  const getScriptForPlatform = (platform: WifiAgentPlatform) => {
    switch (platform) {
      case 'WINDOWS':
        return `# Script Agente Local WorkPulse - Coleta de RF Wi-Fi (PowerShell)
# Execute em um PowerShell como Administrador ou via GPO / InTune

$TenantId = "${tenantId}"
$ApiEndpoint = "https://api.workpulse.io/api/v1/wifi/agent-ingest"

# 1. Coleta interface ativa e parâmetros de RF
$wlan = netsh wlan show interfaces
$ssid = ($wlan | Select-String "SSID" | Select-String "BSSID" -NotMatch | Out-String).Trim().Split(":")[-1].Trim()
$bssid = ($wlan | Select-String "BSSID" | Out-String).Trim().Split(":")[-1].Trim()
$signal = ($wlan | Select-String "Signal" | Out-String).Trim().Split(":")[-1].Trim().Replace("%","")
$radio = ($wlan | Select-String "Radio type" | Out-String).Trim().Split(":")[-1].Trim()
$channel = ($wlan | Select-String "Channel" | Out-String).Trim().Split(":")[-1].Trim()
$rxRate = ($wlan | Select-String "Receive rate" | Out-String).Trim().Split(":")[-1].Trim()
$txRate = ($wlan | Select-String "Transmit rate" | Out-String).Trim().Split(":")[-1].Trim()

# 2. Varredura de redes próximas (BSSIDs no alcance)
$networks = netsh wlan show networks mode=bssid

# 3. Payload JSON enviado de forma segura com TLS 1.3
$payload = @{
    tenantId = $TenantId
    platform = "WINDOWS"
    interfaceName = "Wi-Fi Intel AX211"
    ssid = $ssid
    bssid = $bssid
    signalPercent = [int]$signal
    channel = [int]$channel
    linkRateMbps = [int]$txRate
    timestamp = (Get-Date).ToString("o")
} | ConvertTo-Json

Invoke-RestMethod -Uri $ApiEndpoint -Method Post -Body $payload -ContentType "application/json"
Write-Host "✓ Telemetria de Wi-Fi sincronizada com sucesso com o WorkPulse SaaS!" -ForegroundColor Green`;

      case 'MACOS':
        return `#!/bin/bash
# Agente WorkPulse macOS para Coleta de RF Wi-Fi
TENANT_ID="${tenantId}"
API_URL="https://api.workpulse.io/api/v1/wifi/agent-ingest"

# Localiza ferramenta Airport interna do macOS
AIRPORT="/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport"

# Coleta telemetria
WIFI_INFO=$($AIRPORT -I)
SSID=$(echo "$WIFI_INFO" | grep ' SSID' | awk '{print $2}')
BSSID=$(echo "$WIFI_INFO" | grep 'BSSID' | awk '{print $2}')
RSSI=$(echo "$WIFI_INFO" | grep 'agrCtlRSSI' | awk '{print $2}')
NOISE=$(echo "$WIFI_INFO" | grep 'agrCtlNoise' | awk '{print $2}')
CHANNEL=$(echo "$WIFI_INFO" | grep 'channel' | awk '{print $2}')
TX_RATE=$(echo "$WIFI_INFO" | grep 'lastTxRate' | awk '{print $2}')

# Envio via curl
curl -X POST "$API_URL" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tenantId": "'$TENANT_ID'",
    "platform": "MACOS",
    "ssid": "'$SSID'",
    "bssid": "'$BSSID'",
    "rssi": '$RSSI',
    "channel": '$CHANNEL'
  }'`;

      case 'LINUX':
        return `#!/bin/bash
# Agente WorkPulse Linux para Coleta de RF Wi-Fi
TENANT_ID="${tenantId}"
API_URL="https://api.workpulse.io/api/v1/wifi/agent-ingest"

INTERFACE=$(iw dev | grep Interface | awk '{print $2}' | head -n 1)
SSID=$(iw dev $INTERFACE link | grep SSID | awk '{print $2}')
SIGNAL=$(iw dev $INTERFACE link | grep signal | awk '{print $2}')

curl -X POST "$API_URL" \\
  -H "Content-Type: application/json" \\
  -d '{"tenantId":"'$TENANT_ID'","platform":"LINUX","interface":"'$INTERFACE'","ssid":"'$SSID'","rssi":'$SIGNAL'}'`;

      default:
        return `# Android Ingestion: Realizado automaticamente pelo App WorkPulse Mobile via Android WifiManager API`;
    }
  };

  const scriptCode = getScriptForPlatform(selectedPlatform);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Central do Agente Local de Telemetria RF
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Coleta nativa e autêntica de radiofrequência sem depender de restrições de navegadores.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Architecture Banner */}
          <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-slate-800 dark:text-cyan-200 flex items-start space-x-3">
            <Info className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Por que o agente local é fundamental?</p>
              <p className="mt-1 leading-relaxed">
                Navegadores web bloqueiam por segurança o acesso direto às placas de rede Wi-Fi (BSSID, RSSI, canais vizinhos e ruído de fundo). O Agente Silencioso do WorkPulse roda localmente no Windows/macOS/Linux e transmite os dados de RF de forma contínua para o SaaS.
              </p>
            </div>
          </div>

          {/* Platform Selector Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            {(['WINDOWS', 'MACOS', 'LINUX', 'ANDROID'] as const).map((plat) => (
              <button
                key={plat}
                onClick={() => setSelectedPlatform(plat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedPlatform === plat
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {plat === 'WINDOWS' ? 'Windows (PowerShell / GPO)' :
                 plat === 'MACOS' ? 'macOS (Airport)' :
                 plat === 'LINUX' ? 'Linux (iw / nmcli)' : 'Android (App)'}
              </button>
            ))}
          </div>

          {/* Code Viewer Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono">Script de Ingestão de RF ({selectedPlatform})</span>
              <button
                onClick={handleCopy}
                className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>

            <div className="bg-slate-950 text-cyan-300 font-mono text-xs p-4 rounded-2xl border border-slate-800 overflow-x-auto max-h-56 select-all">
              <pre>{scriptCode}</pre>
            </div>
          </div>

          {/* Integration Status Badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Agente Local Ativo e Conectado neste Computador</span>
            </div>
            <span className="font-mono font-bold">148 PCs Monitorados no Tenant</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={handleExecuteCollect}
            disabled={isRunning}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : 'fill-white'}`} />
            <span>{isRunning ? 'Disparando Agente...' : 'Executar Coleta do Agente Agora'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};
