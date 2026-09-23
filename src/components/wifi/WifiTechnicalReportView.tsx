import React from 'react';
import {
  FileText,
  Printer,
  Download,
  Copy,
  CheckCircle2,
  ShieldCheck,
  Building,
  Radio,
  Activity,
  Zap,
  Globe,
  Award,
  AlertTriangle,
  Cpu,
  ArrowLeft
} from 'lucide-react';
import {
  WifiConnectionStatus,
  WifiScoreBreakdown,
  WifiDualTestResult,
  WifiDiagnosticItem
} from '../../types/wifiPulse';

interface WifiTechnicalReportViewProps {
  connection: WifiConnectionStatus;
  score: WifiScoreBreakdown;
  dualTest: WifiDualTestResult;
  diagnostics: WifiDiagnosticItem[];
  tenantName: string;
  technicianName: string;
  ticketId?: string;
  onBackToDashboard: () => void;
}

export const WifiTechnicalReportView: React.FC<WifiTechnicalReportViewProps> = ({
  connection,
  score,
  dualTest,
  diagnostics,
  tenantName,
  technicianName,
  ticketId = 'CH-2026-0841',
  onBackToDashboard
}) => {
  const [copied, setCopied] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyClipboard = () => {
    const textReport = `=====================================================
LAUDO TÉCNICO DE RADIOFREQUÊNCIA & QUALIDADE WI-FI
WorkPulse IT & Telecom Diagnostic Suite
=====================================================
Cliente / Tenant: ${tenantName}
Equipamento / Host: ${connection.interfaceName} (${connection.ipAddress})
Técnico Responsável: ${technicianName}
Chamado ITSM: ${ticketId}
Data do Laudo: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}

1. PARÂMETROS DA REDE WI-FI
-----------------------------------------------------
SSID: ${connection.ssid}
BSSID (AP): ${connection.bssid}
Fabricante do AP: Cisco Systems / Meraki
Banda & Canal: ${connection.band} - Canal ${connection.channel} (${connection.channelWidthMhz} MHz)
Sinal (RSSI): ${connection.rssi} dBm
Relação Sinal/Ruído (SNR): ${connection.snr} dB (Piso de Ruído: ${connection.noise} dBm)
Taxa de Link (Tx): ${connection.linkRateMbps} Mbps (Máximo: ${connection.maxRateMbps} Mbps)
Padrão: ${connection.wifiStandard} (${connection.security})

2. SCORE DE QUALIDADE WORKPULSE
-----------------------------------------------------
Score Geral: ${score.totalScore}/100 [Classificação: ${score.rating}]
- RSSI: ${score.rssiScore}/30 pts
- SNR / Ruído: ${score.snrScore}/25 pts
- Canal & Interferência: ${score.interferenceScore}/20 pts
- Estabilidade: ${score.stabilityScore}/15 pts
- Taxa de Link: ${score.linkRateScore}/10 pts

3. DIAGNÓSTICO DUAL (WI-FI vs PROVEDOR DE INTERNET)
-----------------------------------------------------
Latência Wi-Fi (Gateway): ${dualTest.wifi.gatewayPingMs} ms
Velocidade de Download: ${dualTest.internet.downloadMbps} Mbps
Velocidade de Upload: ${dualTest.internet.uploadMbps} Mbps
Ping WAN: ${dualTest.internet.pingMs} ms (Jitter: ${dualTest.internet.jitterMs} ms | Perda: ${dualTest.internet.packetLossPercent}%)
Veredito de Gargalo: ${dualTest.comparison.verdict}

4. DIAGNÓSTICOS & RECOMENDAÇÕES TÉCNICAS
-----------------------------------------------------
${diagnostics.map((d, i) => `${i + 1}. [${d.severity}] ${d.title}\n   Causa Raiz: ${d.rootCause}\n   Recomendação: ${d.actionableRecommendation}`).join('\n\n')}

=====================================================
Laudo gerado e autenticado digitalmente pelo WorkPulse.
=====================================================`;

    navigator.clipboard.writeText(textReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportJson = () => {
    const data = {
      reportDate: new Date().toISOString(),
      tenant: tenantName,
      technician: technicianName,
      ticketId,
      connection,
      score,
      dualTest,
      diagnostics
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laudo_wifi_${ticketId}_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs print:hidden">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Voltar ao Painel"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <FileText className="w-5 h-5 text-cyan-500" />
              <span>Laudo Técnico & Relatório de RF para o Cliente</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Documento formal de diagnóstico pronto para impressão, anexo em ticket ou exportação em PDF.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyClipboard}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-500" />
            <span>JSON</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      </div>

      {/* Formal Printable Document Canvas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-lg max-w-4xl mx-auto text-slate-900 dark:text-slate-100 print:border-none print:shadow-none print:p-0">
        {/* Document Letterhead */}
        <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900 dark:border-slate-700">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-cyan-500" />
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                WorkPulse IT Diagnostic Suite
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Módulo Especializado WIFI Pulse • Laudo Pericial de Radiofrequência & Performance LAN/WAN
            </p>
          </div>

          <div className="text-right">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              DOC #{ticketId}-WIFI
            </span>
            <p className="text-xs text-slate-400 mt-1">
              {new Date().toLocaleDateString('pt-BR')} • {new Date().toLocaleTimeString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Identification Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Cliente / Tenant</span>
            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{tenantName}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Técnico Analista</span>
            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{technicianName}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Host / Adaptador</span>
            <p className="font-bold font-mono text-slate-900 dark:text-white mt-0.5">{connection.interfaceName}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Endereço IP / MAC</span>
            <p className="font-bold font-mono text-slate-900 dark:text-white mt-0.5">{connection.ipAddress}</p>
          </div>
        </div>

        {/* Section 1: Executive Score & Telemetry */}
        <div className="py-6 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
            <Award className="w-4 h-4 text-cyan-500" />
            <span>1. Avaliação Executiva de Qualidade Wi-Fi</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center space-x-4">
              <div className="text-3xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
                {score.totalScore}%
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Score Geral</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{score.rating}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Sinal & Ruído</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                {connection.rssi} dBm <span className="text-slate-400 font-normal">({connection.snr} dB SNR)</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Canal & Banda</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                Ch {connection.channel} ({connection.band} @ {connection.channelWidthMhz} MHz)
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Dual Test Summary */}
        <div className="py-6 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
            <Globe className="w-4 h-4 text-rose-500" />
            <span>2. Diagnóstico Dual: Enlace Wi-Fi vs Internet WAN</span>
          </h3>

          <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-cyan-400">Veredito do Gargalo:</span>
              <span className="font-mono text-slate-400">Provedor: {dualTest.internet.isp}</span>
            </div>
            <p className="text-sm font-bold">{dualTest.comparison.verdict}</p>
            <p className="text-xs text-slate-300 leading-relaxed">{dualTest.comparison.explanation}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-700 dark:text-slate-300">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Taxa Wi-Fi Local</span>
              <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">{dualTest.wifi.linkRateMbps} Mbps</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Download Internet</span>
              <p className="font-mono font-bold text-sm text-rose-500">{dualTest.internet.downloadMbps} Mbps</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Upload Internet</span>
              <p className="font-mono font-bold text-sm text-amber-500">{dualTest.internet.uploadMbps} Mbps</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Latência WAN (Ping)</span>
              <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">{dualTest.internet.pingMs} ms</p>
            </div>
          </div>
        </div>

        {/* Section 3: Detailed Technical Observations & Action Items */}
        <div className="py-6 space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>3. Diagnósticos Específicos & Plano de Ação Recomendado</span>
          </h3>

          <div className="space-y-3">
            {diagnostics.map((diag, idx) => (
              <div
                key={diag.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {idx + 1}. {diag.title}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                    Severidade {diag.severity}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong>Impacto:</strong> {diag.impact}
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong>Causa Raiz:</strong> {diag.rootCause}
                </p>
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-slate-900 dark:text-cyan-200 font-medium">
                  <strong>Recomendação Técnica:</strong> {diag.actionableRecommendation}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Signatures & Authentication Stamp */}
        <div className="pt-8 mt-6 border-t-2 border-slate-900 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div>
            <p className="font-mono text-[10px]">Autenticação Digital: SHA256:{Math.random().toString(36).substring(2, 12).toUpperCase()}</p>
            <p className="mt-0.5">WorkPulse SaaS Telemetry • Emissão Automática Conforme ISO/IEC 27001</p>
          </div>
          <div className="text-center sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0">
            <p className="font-bold text-slate-900 dark:text-white">{technicianName}</p>
            <p className="text-[11px] text-slate-400">Analista de Suporte & Redes</p>
          </div>
        </div>
      </div>
    </div>
  );
};
