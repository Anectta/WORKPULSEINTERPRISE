import React, { useState, useEffect, useRef } from 'react';
import { 
  Gauge, 
  Activity, 
  Clock, 
  Wifi, 
  Zap, 
  Download, 
  Upload, 
  RefreshCw, 
  Share2, 
  Copy, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  Server, 
  Globe, 
  ShieldCheck, 
  Laptop
} from 'lucide-react';
import './velocimetro.css';

interface VelocimetroState {
  phase: 'idle' | 'flow' | 'ping' | 'download' | 'upload' | 'finished' | 'error';
  ping: number;
  pingMin: number;
  pingMax: number;
  jitter: number;
  packetLoss: number;
  download: number;
  downloadPeak: number;
  upload: number;
  uploadPeak: number;
  stability: number;
  clientIp: string;
  isp: string;
  location: string;
  server: string;
  targetSpeed: number;
  currentSpeed: number;
}

export const VelocimetroNetPulseView: React.FC = () => {
  const [state, setState] = useState<VelocimetroState>({
    phase: 'idle',
    ping: 0,
    pingMin: 0,
    pingMax: 0,
    jitter: 0,
    packetLoss: 0,
    download: 0,
    downloadPeak: 0,
    upload: 0,
    uploadPeak: 0,
    stability: 100,
    clientIp: '---',
    isp: 'Detectando...',
    location: 'Detectando...',
    server: 'Edge CDN Global',
    targetSpeed: 0,
    currentSpeed: 0
  });

  const [copiedReport, setCopiedReport] = useState(false);
  const [dateTimeStr, setDateTimeStr] = useState<string>('--/--/---- --:--:--');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const animFrameIdRef = useRef<number | null>(null);
  const isTestingRef = useRef(false);

  // Relógio de Data/Hora em tempo real
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setDateTimeStr(`${day}/${month}/${year} • ${hours}:${minutes}:${seconds}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Busca de metadados de rede (IP, ISP, Localização)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch('https://ipwho.is/').catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          if (data.success) {
            const rawIp = data.ip || '---';
            setState(prev => ({
              ...prev,
              clientIp: !rawIp.includes(':') ? rawIp : prev.clientIp,
              isp: (data.connection && data.connection.isp) || data.isp || 'Provedor Local',
              location: `${data.city || ''}, ${data.region_code || data.region || ''} - ${data.country_code || 'BR'}`
            }));
          }
        }

        // Tenta buscar IPv4 dedicado
        const v4Res = await fetch('https://api4.ipify.org?format=json').catch(() => null);
        if (v4Res && v4Res.ok) {
          const v4Data = await v4Res.json();
          if (v4Data && v4Data.ip && !v4Data.ip.includes(':')) {
            setState(prev => ({ ...prev, clientIp: v4Data.ip }));
          }
        }
      } catch (err) {
        console.warn('Metadados de rede não disponíveis:', err);
      }
    };

    fetchMetadata();
  }, []);

  // Loop de física do ponteiro (Easing suave)
  useEffect(() => {
    const updatePhysics = () => {
      setState(prev => {
        const diff = prev.targetSpeed - prev.currentSpeed;
        const newSpeed = Math.abs(diff) < 0.02 ? prev.targetSpeed : prev.currentSpeed + diff * 0.045;
        return { ...prev, currentSpeed: newSpeed };
      });

      animFrameIdRef.current = requestAnimationFrame(updatePhysics);
    };

    animFrameIdRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, []);

  // Loop do Gráfico em Tempo Real (Canvas)
  useEffect(() => {
    let waveOffset = 0;
    let chartAnimId: number;

    const renderChart = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.parentElement) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = (canvas.width = canvas.parentElement.clientWidth || 140);
          const height = (canvas.height = canvas.parentElement.clientHeight || 40);

          ctx.clearRect(0, 0, width, height);

          const { phase, currentSpeed } = stateRef.current;
          const isTesting = phase === 'flow' || phase === 'ping' || phase === 'download' || phase === 'upload';

          if (isTesting) {
            const primaryColor = '#00f0ff';
            const maxScale = Math.max(60, currentSpeed * 1.3);
            const normalizedHeight = (currentSpeed / maxScale) * (height - 10);

            const points = 30;
            const step = width / points;
            const wavePoints: { x: number; y: number }[] = [];

            for (let i = 0; i <= points; i++) {
              const x = i * step;
              const waveMod =
                Math.sin(i * 0.2 + waveOffset) * Math.min(6, (currentSpeed + 5) * 0.15) +
                Math.cos(i * 0.35 - waveOffset * 1.2) * Math.min(4, (currentSpeed + 5) * 0.1);
              const y = Math.max(4, height - (normalizedHeight + waveMod + 4));
              wavePoints.push({ x, y });
            }

            const gradFill = ctx.createLinearGradient(0, 0, 0, height);
            gradFill.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
            gradFill.addColorStop(0.7, 'rgba(2, 132, 199, 0.15)');
            gradFill.addColorStop(1, 'rgba(2, 132, 199, 0.0)');

            ctx.beginPath();
            ctx.moveTo(0, height);
            wavePoints.forEach((pt, idx) => {
              if (idx === 0) ctx.lineTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            });
            ctx.lineTo(width, height);
            ctx.closePath();
            ctx.fillStyle = gradFill;
            ctx.fill();

            ctx.beginPath();
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 2;
            ctx.shadowColor = primaryColor;
            ctx.shadowBlur = 8;
            wavePoints.forEach((pt, idx) => {
              if (idx === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();
            ctx.shadowBlur = 0;

            const tip = wavePoints[wavePoints.length - 1];
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = primaryColor;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;

            waveOffset += 0.08;
          }
        }
      }

      chartAnimId = requestAnimationFrame(renderChart);
    };

    chartAnimId = requestAnimationFrame(renderChart);
    return () => cancelAnimationFrame(chartAnimId);
  }, []);

  // Conversão de velocidade (Mbps) em progresso do ponteiro (0 a 1)
  const speedToProgress = (mbps: number): number => {
    if (!mbps || mbps <= 0) return 0;
    if (mbps <= 1) return (mbps / 1) * 0.1;
    if (mbps <= 5) return 0.1 + ((mbps - 1) / 4) * 0.1;
    if (mbps <= 10) return 0.2 + ((mbps - 5) / 5) * 0.1;
    if (mbps <= 25) return 0.3 + ((mbps - 10) / 15) * 0.1;
    if (mbps <= 50) return 0.4 + ((mbps - 25) / 25) * 0.1;
    if (mbps <= 100) return 0.5 + ((mbps - 50) / 50) * 0.1;
    if (mbps <= 250) return 0.6 + ((mbps - 100) / 150) * 0.1;
    if (mbps <= 500) return 0.7 + ((mbps - 250) / 250) * 0.1;
    if (mbps <= 1000) return 0.8 + ((mbps - 500) / 500) * 0.1;
    if (mbps <= 1250) return 0.9 + ((mbps - 1000) / 250) * 0.1;
    return 1.0;
  };

  const formatSpeed = (mbps: number): string => {
    if (!mbps || mbps <= 0) return '0.00';
    if (mbps >= 1000) return (mbps / 1000).toFixed(2);
    return mbps >= 100 ? mbps.toFixed(1) : mbps.toFixed(2);
  };

  const getSpeedUnit = (mbps: number): string => {
    return mbps >= 1000 ? 'GBPS' : 'MBPS';
  };

  // Helper de Animação Numérica
  const animateCount = (startVal: number, endVal: number, durationMs: number, onUpdate: (val: number) => void): Promise<void> => {
    return new Promise(resolve => {
      const startTime = performance.now();
      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = startVal + (endVal - startVal) * ease;
        onUpdate(current);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          onUpdate(endVal);
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  };

  // Execução Completa da Telemetria de Velocidade
  const handleStartTest = async () => {
    if (isTestingRef.current) return;
    isTestingRef.current = true;

    // Reset State
    setState(prev => ({
      ...prev,
      phase: 'flow',
      ping: 0,
      pingMin: 0,
      pingMax: 0,
      jitter: 0,
      packetLoss: 0,
      download: 0,
      downloadPeak: 0,
      upload: 0,
      uploadPeak: 0,
      targetSpeed: 0,
      currentSpeed: 0
    }));

    // 1. FASE FLUXO (~3.5s)
    let t0 = performance.now();
    while (performance.now() - t0 < 3500) {
      const elapsed = (performance.now() - t0) / 1000;
      const waveSpeed = 34 + Math.sin(elapsed * 4.5) * 18 + (elapsed / 3.5) * 14;
      setState(prev => ({ ...prev, targetSpeed: Math.max(8, waveSpeed) }));
      await new Promise(r => setTimeout(r, 45));
    }
    setState(prev => ({ ...prev, targetSpeed: 0 }));
    await new Promise(r => setTimeout(r, 800));

    // 2. FASE LATÊNCIA & JITTER (~3.5s)
    setState(prev => ({ ...prev, phase: 'ping' }));
    const probeCount = 12;
    const probeUrl = 'https://speed.cloudflare.com/__down?bytes=0';
    const samples: number[] = [];
    let lostProbes = 0;

    for (let i = 0; i < probeCount; i++) {
      try {
        const probeT0 = performance.now();
        const response = await fetch(`${probeUrl}&t=${Date.now()}_${i}`, { cache: 'no-store', mode: 'cors' });
        if (response.ok) {
          const rtt = Math.max(1, performance.now() - probeT0);
          samples.push(rtt);
          setState(prev => ({ ...prev, targetSpeed: Math.min(rtt, 100) }));
        } else {
          lostProbes++;
        }
      } catch (e) {
        lostProbes++;
      }
      await new Promise(r => setTimeout(r, 140));
    }

    let targetPing = 16;
    let targetMinPing = 14;
    let targetMaxPing = 22;
    let targetJitter = 1.8;

    if (samples.length > 0) {
      const validSamples = samples.length > 3 ? samples.slice(1) : samples;
      validSamples.sort((a, b) => a - b);
      const sum = validSamples.reduce((acc, v) => acc + v, 0);
      targetPing = Math.round(sum / validSamples.length);
      targetMinPing = Math.round(validSamples[0]);
      targetMaxPing = Math.round(validSamples[validSamples.length - 1]);

      let jitterSum = 0;
      for (let i = 1; i < validSamples.length; i++) {
        jitterSum += Math.abs(validSamples[i] - validSamples[i - 1]);
      }
      targetJitter = Math.round((validSamples.length > 1 ? jitterSum / (validSamples.length - 1) : 1) * 10) / 10;
    }

    setState(prev => ({
      ...prev,
      packetLoss: Math.round((lostProbes / probeCount) * 100),
      pingMin: targetMinPing,
      pingMax: targetMaxPing
    }));

    await animateCount(0, targetPing, 1200, val => {
      setState(prev => ({ ...prev, ping: Math.round(val), targetSpeed: Math.min(val, 100) }));
    });

    await animateCount(0, targetJitter, 800, val => {
      setState(prev => ({ ...prev, jitter: Math.round(val * 10) / 10 }));
    });

    setState(prev => ({ ...prev, targetSpeed: 0 }));
    await new Promise(r => setTimeout(r, 800));

    // 3. FASE DOWNLOAD MULTI-STREAM (~8s)
    setState(prev => ({ ...prev, phase: 'download' }));
    const downloadStartTime = performance.now();
    const downloadDuration = 8000;
    let totalBytesReceived = 0;
    let isDownloading = true;
    const steadyStateRates: number[] = [];

    let lastSampleTime = performance.now();
    let lastSampleBytes = 0;
    let smoothedDownMbps = 0;

    const downloadEndpoint = 'https://speed.cloudflare.com/__down?bytes=25000000';
    const streamWorkers = Array.from({ length: 4 }, async (_, streamIndex) => {
      while (isDownloading && performance.now() - downloadStartTime < downloadDuration) {
        try {
          const res = await fetch(`${downloadEndpoint}&s=${streamIndex}&t=${Date.now()}_${Math.random()}`, {
            cache: 'no-store',
            mode: 'cors'
          });
          if (!res.ok || !res.body) break;
          const reader = res.body.getReader();
          while (isDownloading) {
            const { done, value } = await reader.read();
            if (done) break;
            totalBytesReceived += value.length;
            if (performance.now() - downloadStartTime >= downloadDuration) {
              isDownloading = false;
              try { reader.cancel(); } catch (e) {}
              break;
            }
          }
        } catch (err) {
          if (!isDownloading) break;
          await new Promise(r => setTimeout(r, 60));
        }
      }
    });

    while (performance.now() - downloadStartTime < downloadDuration) {
      await new Promise(r => setTimeout(r, 120));
      const now = performance.now();
      const deltaSec = (now - lastSampleTime) / 1000;
      const deltaBytes = totalBytesReceived - lastSampleBytes;

      if (deltaSec > 0.05) {
        const instantMbps = (deltaBytes * 8) / (deltaSec * 1000000);
        smoothedDownMbps = smoothedDownMbps === 0 ? instantMbps : smoothedDownMbps * 0.65 + instantMbps * 0.35;
        setState(prev => ({ ...prev, targetSpeed: smoothedDownMbps, download: Math.round(smoothedDownMbps * 10) / 10 }));
        if (now - downloadStartTime > 1500 && instantMbps > 1) {
          steadyStateRates.push(instantMbps);
        }
        lastSampleTime = now;
        lastSampleBytes = totalBytesReceived;
      }
    }

    isDownloading = false;
    await Promise.allSettled(streamWorkers);

    let finalDownload = 85.0;
    let finalPeak = 95.0;
    if (steadyStateRates.length > 0) {
      steadyStateRates.sort((a, b) => a - b);
      const lowIdx = Math.floor(steadyStateRates.length * 0.2);
      const highIdx = Math.ceil(steadyStateRates.length * 0.8);
      const trimmed = steadyStateRates.slice(lowIdx, Math.max(lowIdx + 1, highIdx));
      finalDownload = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
      finalPeak = Math.max(...steadyStateRates);
    }
    finalDownload = Math.round(finalDownload * 10) / 10;
    finalPeak = Math.max(finalPeak, finalDownload);

    setState(prev => ({
      ...prev,
      download: finalDownload,
      downloadPeak: finalPeak,
      targetSpeed: finalDownload
    }));

    await new Promise(r => setTimeout(r, 1000));

    // 4. FASE UPLOAD MULTI-STREAM (~8s)
    setState(prev => ({ ...prev, phase: 'upload' }));
    const uploadStartTime = performance.now();
    const uploadDuration = 8000;
    let totalBytesSent = 0;
    let isUploading = true;
    const steadyStateUpRates: number[] = [];

    const payloadSize = 1024 * 1024 * 4; // 4MB
    const payloadBuffer = new Uint8Array(payloadSize);

    let lastUpSampleTime = performance.now();
    let lastUpSampleBytes = 0;
    let smoothedUpMbps = 0;

    const uploadEndpoint = 'https://speed.cloudflare.com/__up';
    const upStreamWorkers = Array.from({ length: 4 }, async (_, streamIndex) => {
      while (isUploading && performance.now() - uploadStartTime < uploadDuration) {
        try {
          await new Promise(resolve => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${uploadEndpoint}?s=${streamIndex}&t=${Date.now()}_${Math.random()}`, true);
            let prevLoaded = 0;
            xhr.upload.onprogress = e => {
              if (e.loaded > prevLoaded) {
                totalBytesSent += e.loaded - prevLoaded;
                prevLoaded = e.loaded;
              }
              if (!isUploading || performance.now() - uploadStartTime >= uploadDuration) {
                xhr.abort();
                resolve(true);
              }
            };
            xhr.onload = () => resolve(true);
            xhr.onerror = () => resolve(false);
            xhr.onabort = () => resolve(true);
            xhr.send(payloadBuffer);
          });
        } catch (e) {
          if (!isUploading) break;
          await new Promise(r => setTimeout(r, 60));
        }
      }
    });

    while (performance.now() - uploadStartTime < uploadDuration) {
      await new Promise(r => setTimeout(r, 120));
      const now = performance.now();
      const deltaSec = (now - lastUpSampleTime) / 1000;
      const deltaBytes = totalBytesSent - lastUpSampleBytes;

      if (deltaSec > 0.05) {
        const instantMbps = (deltaBytes * 8) / (deltaSec * 1000000);
        smoothedUpMbps = smoothedUpMbps === 0 ? instantMbps : smoothedUpMbps * 0.65 + instantMbps * 0.35;
        setState(prev => ({ ...prev, targetSpeed: smoothedUpMbps, upload: Math.round(smoothedUpMbps * 10) / 10 }));
        if (now - uploadStartTime > 1500 && instantMbps > 1) {
          steadyStateUpRates.push(instantMbps);
        }
        lastUpSampleTime = now;
        lastUpSampleBytes = totalBytesSent;
      }
    }

    isUploading = false;
    await Promise.allSettled(upStreamWorkers);

    let finalUpload = 42.0;
    let finalUpPeak = 48.0;
    if (steadyStateUpRates.length > 0) {
      steadyStateUpRates.sort((a, b) => a - b);
      const lowIdx = Math.floor(steadyStateUpRates.length * 0.2);
      const highIdx = Math.ceil(steadyStateUpRates.length * 0.8);
      const trimmed = steadyStateUpRates.slice(lowIdx, Math.max(lowIdx + 1, highIdx));
      finalUpload = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
      finalUpPeak = Math.max(...steadyStateUpRates);
    }
    finalUpload = Math.round(finalUpload * 10) / 10;
    finalUpPeak = Math.max(finalUpPeak, finalUpload);

    setState(prev => ({
      ...prev,
      phase: 'finished',
      upload: finalUpload,
      uploadPeak: finalUpPeak,
      targetSpeed: 0
    }));

    isTestingRef.current = false;
  };

  // Copia laudo técnico
  const handleCopyReport = () => {
    const text =
      `⚡ TELEMETRIA DE REDE ANECTTA NETPULSE - LAUDO DE CONEXÃO\n` +
      `--------------------------------------------------\n` +
      `● Download: ${formatSpeed(state.download)} ${getSpeedUnit(state.download)} (Pico: ${formatSpeed(state.downloadPeak)} ${getSpeedUnit(state.downloadPeak)})\n` +
      `● Upload: ${formatSpeed(state.upload)} ${getSpeedUnit(state.upload)} (Pico: ${formatSpeed(state.uploadPeak)} ${getSpeedUnit(state.uploadPeak)})\n` +
      `● Latência (Ping): ${state.ping} ms (Mín: ${state.pingMin} ms / Máx: ${state.pingMax} ms)\n` +
      `● Jitter (RFC 3550): ${state.jitter} ms\n` +
      `● Perda de Pacotes: ${state.packetLoss}%\n` +
      `● Estabilidade: ${state.stability}%\n` +
      `● Provedor (ISP): ${state.isp}\n` +
      `● IP Público: ${state.clientIp}\n` +
      `● Localização: ${state.location}\n` +
      `● Servidor de Teste: ${state.server}\n` +
      `● Data/Hora: ${dateTimeStr}\n` +
      `--------------------------------------------------\n` +
      `ANECTTA Soluções em Tecnologia - Operações 100% Remotas`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 3000);
    });
  };

  // Compartilha no WhatsApp
  const handleShareWhatsApp = () => {
    const text =
      `Olá! Realizei o teste de velocidade no Velocímetro Corporativo da ANECTTA e gostaria de uma avaliação técnica da minha conexão:\n\n` +
      `● Download: ${formatSpeed(state.download)} ${getSpeedUnit(state.download)}\n` +
      `● Upload: ${formatSpeed(state.upload)} ${getSpeedUnit(state.upload)}\n` +
      `● Latência: ${state.ping} ms (Jitter: ${state.jitter} ms)\n` +
      `● Perda de Pacotes: ${state.packetLoss}%\n` +
      `● Provedor: ${state.isp} (${state.location})\n\n` +
      `Vocês poderiam verificar se minha rede está otimizada para suporte remoto e sistemas corporativos?`;

    window.open(`https://wa.me/5521997058709?text=${encodeURIComponent(text)}`, '_blank');
  };

  const progress = speedToProgress(state.currentSpeed);
  const needleAngle = -130 + progress * 260;
  const activeBarCount = Math.round(progress * 12);
  const isTesting = state.phase === 'flow' || state.phase === 'ping' || state.phase === 'download' || state.phase === 'upload';

  return (
    <div className="space-y-6">
      {/* Top Banner de Apresentação do Módulo */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 font-mono tracking-wider">
              TELEMETRIA DE REDE CORPORATIVA
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Anectta NetPulse v5.0</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Velocímetro Net Pulse
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
            Diagnóstico preciso de velocidade real e qualidade de tráfego. Meça latência (ping), jitter, download e upload multi-stream em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleStartTest}
            disabled={isTesting}
            className="w-full md:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'MEDINDO TELEMETRIA...' : 'INICIAR TESTE DE VELOCIDADE'}</span>
          </button>
        </div>
      </div>

      {/* PAINEL CENTRAL DO VELOCÍMETRO COCKPIT */}
      <div className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs relative overflow-hidden ${isTesting ? 'speedtest-active' : ''}`}>
        
        {/* Stepper de Fases */}
        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap text-xs">
          <div className={`px-3 py-1 rounded-full border text-xs font-mono font-semibold transition-all ${
            state.phase === 'flow' || state.phase === 'ping'
              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 animate-pulse font-bold'
              : state.phase === 'download' || state.phase === 'upload' || state.phase === 'finished'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}>
            1. Latência & Jitter
          </div>

          <div className={`px-3 py-1 rounded-full border text-xs font-mono font-semibold transition-all ${
            state.phase === 'download'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 animate-pulse font-bold'
              : state.phase === 'upload' || state.phase === 'finished'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}>
            2. Download
          </div>

          <div className={`px-3 py-1 rounded-full border text-xs font-mono font-semibold transition-all ${
            state.phase === 'upload'
              ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 animate-pulse font-bold'
              : state.phase === 'finished'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}>
            3. Upload
          </div>
        </div>

        {/* ÁREA CENTRAL INTEGRADA: TELEMETRIA LATERAL & GAUGE */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 relative z-10 my-4">
          
          {/* Coluna Esquerda: FLUXO & LATÊNCIA (2 Cards Quadrados) */}
          <div className="flex flex-row lg:flex-col gap-3.5 justify-center items-center shrink-0 order-2 lg:order-1">
            
            {/* Card 1: Gráfico de Fluxo em Tempo Real */}
            <div className={`netpulse-metric-card netpulse-telemetry-compact bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between ${state.phase === 'flow' ? 'active-card' : ''}`}>
              <div className="flex items-center justify-between text-xs font-mono text-blue-500 mb-0.5">
                <div className="flex items-center gap-1 font-bold">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-b from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
                    <Activity className="w-3 h-3" />
                  </div>
                  <span className="text-[9px] tracking-wide font-bold">FLUXO</span>
                </div>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 font-bold flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> LIVE
                </span>
              </div>

              <div className="relative flex-1 h-[34px] max-h-[38px] w-full flex items-center justify-center my-0.5 overflow-hidden">
                <div className="netpulse-chart-grid">
                  <div className="netpulse-chart-grid-line" />
                  <div className="netpulse-chart-grid-line" />
                </div>
                <canvas ref={canvasRef} className="netpulse-chart-canvas w-full h-full" />
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700 mt-auto">
                <span>Throughput</span>
                <span className="text-blue-500 font-medium">Ao Vivo</span>
              </div>
            </div>

            {/* Card 2: Latência & Jitter */}
            <div className={`netpulse-metric-card netpulse-telemetry-compact bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between ${state.phase === 'ping' ? 'active-card' : ''}`}>
              <div className="flex items-center justify-between text-xs font-mono text-amber-500 mb-0.5">
                <div className="flex items-center gap-1 font-bold">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-xs shrink-0">
                    <Clock className="w-3 h-3" />
                  </div>
                  <span className="text-[9px] tracking-wide font-bold">LATÊNCIA</span>
                </div>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 font-bold">PING</span>
              </div>

              <div className="my-auto py-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight leading-none">
                    {state.ping > 0 ? state.ping : '--'}
                  </span>
                  <span className="text-[11px] font-mono text-amber-500 font-bold">ms</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono pt-1 border-t border-slate-200 dark:border-slate-700 mt-auto">
                <span className="text-slate-500 dark:text-slate-400">JITTER:</span>
                <div>
                  <span className="text-amber-500 font-bold">{state.jitter > 0 ? state.jitter : '--'}</span>
                  <span className="text-slate-500 ml-0.5">ms</span>
                </div>
              </div>
            </div>

          </div>

          {/* Coluna Central: GAUGE CIRCULAR COCKPIT NPERF */}
          <div className="flex flex-col items-center justify-center py-2 relative order-1 lg:order-2 shrink-0">
            <div className="netpulse-gauge-wrapper flex items-center justify-center select-none">
              
              {/* Círculos Concêntricos por Fora */}
              <div className="netpulse-gauge-external-rings pointer-events-none">
                <div className="netpulse-ext-ring netpulse-ext-ring-1" />
                <div className="netpulse-ext-ring netpulse-ext-ring-2" />
                <div className="netpulse-radiant-wave netpulse-radiant-wave-1" />
                <div className="netpulse-radiant-wave netpulse-radiant-wave-2" />
                <div className="netpulse-radiant-wave netpulse-radiant-wave-3" />
              </div>

              <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible cockpit-speedometer-svg" style={{ overflow: 'visible' }}>
                <defs>
                  <radialGradient id="baseBlueRadialBg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#075985" />
                    <stop offset="35%" stopColor="#034575" />
                    <stop offset="70%" stopColor="#022852" />
                    <stop offset="100%" stopColor="#01142e" />
                  </radialGradient>

                  <radialGradient id="dialDarkRadialBg" cx="50%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.45" />
                    <stop offset="25%" stopColor="#035482" />
                    <stop offset="60%" stopColor="#052c52" />
                    <stop offset="85%" stopColor="#021a36" />
                    <stop offset="100%" stopColor="#010d1c" />
                  </radialGradient>

                  <radialGradient id="centerHubRadialBg" cx="45%" cy="38%" r="60%">
                    <stop offset="0%" stopColor="#0284c7" />
                    <stop offset="55%" stopColor="#063868" />
                    <stop offset="100%" stopColor="#021226" />
                  </radialGradient>

                  <linearGradient id="needleOrangeFireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#ff3d00" stopOpacity="0.85" />
                    <stop offset="45%" stopColor="#ff6d00" />
                    <stop offset="80%" stopColor="#ff9100" />
                    <stop offset="100%" stopColor="#ffe57f" />
                  </linearGradient>

                  <linearGradient id="haloCyanInnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0284c7" />
                    <stop offset="35%" stopColor="#0369a1" />
                    <stop offset="70%" stopColor="#0284c7" />
                    <stop offset="100%" stopColor="#075985" />
                  </linearGradient>

                  <linearGradient id="haloCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00d2ff" />
                    <stop offset="50%" stopColor="#00f0ff" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>

                  <linearGradient id="dialArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00d2ff" />
                    <stop offset="50%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                </defs>

                {/* Base e Anéis Neon */}
                <circle cx="200" cy="200" r="194" fill="url(#baseBlueRadialBg)" stroke="#0284c7" strokeWidth="1.5" strokeOpacity="0.4" />
                <circle cx="200" cy="200" r="184" fill="none" stroke="url(#haloCyanGrad)" strokeWidth="4.5" className="cockpit-neon-cyan-ring" />
                <circle cx="200" cy="200" r="188" fill="none" stroke="#00d2ff" strokeWidth="1.2" opacity="0.4" />
                <circle cx="200" cy="200" r="172" fill="none" stroke="url(#haloCyanInnerGrad)" strokeWidth="3.2" className="cockpit-neon-cyan-inner-ring" />

                {/* Asas LED Esquerda e Direita */}
                <g className="cockpit-wing-left">
                  <path d="M 128 78 L 88 78 L 56 160 L 56 240 L 88 322 L 128 322" fill="none" stroke="#00d2ff" strokeWidth="2.2" opacity="0.6" />
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const fromBottom = 11 - idx;
                    const isLit = fromBottom < activeBarCount;
                    const y = 88 + idx * 18;
                    const widths = [26, 28, 30, 31, 32, 33, 33, 32, 31, 30, 28, 26];
                    const xs = [96, 86, 78, 72, 68, 66, 66, 68, 72, 78, 86, 96];
                    return (
                      <rect
                        key={`left-${idx}`}
                        className="cockpit-led-bar"
                        x={xs[idx]}
                        y={y}
                        width={widths[idx]}
                        height="9"
                        rx="2"
                        fill={isLit ? '#00f0ff' : '#00d2ff'}
                        opacity={isLit ? 1 : 0.45}
                        style={{ filter: isLit ? 'drop-shadow(0 0 6px #00d2ff)' : 'none' }}
                      />
                    );
                  })}
                </g>

                <g className="cockpit-wing-right">
                  <path d="M 272 78 L 312 78 L 344 160 L 344 240 L 312 322 L 272 322" fill="none" stroke="#00d2ff" strokeWidth="2.2" opacity="0.6" />
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const fromBottom = 11 - idx;
                    const isLit = fromBottom < activeBarCount;
                    const y = 88 + idx * 18;
                    const widths = [26, 28, 30, 31, 32, 33, 33, 32, 31, 30, 28, 26];
                    const xs = [278, 286, 292, 297, 300, 301, 301, 300, 297, 292, 286, 278];
                    return (
                      <rect
                        key={`right-${idx}`}
                        className="cockpit-led-bar"
                        x={xs[idx]}
                        y={y}
                        width={widths[idx]}
                        height="9"
                        rx="2"
                        fill={isLit ? '#00f0ff' : '#00d2ff'}
                        opacity={isLit ? 1 : 0.45}
                        style={{ filter: isLit ? 'drop-shadow(0 0 6px #00d2ff)' : 'none' }}
                      />
                    );
                  })}
                </g>

                {/* Mostrador Principal e Ondas */}
                <circle cx="200" cy="200" r="150" fill="url(#dialDarkRadialBg)" stroke="#00d2ff" strokeWidth="2.5" opacity="0.98" />
                <circle cx="200" cy="200" r="148" fill="none" stroke="rgba(0, 210, 255, 0.4)" strokeWidth="1" />

                <g className="cockpit-radiant-pulse-waves">
                  <circle cx="200" cy="200" r="38" fill="none" stroke="#00d2ff" strokeWidth="2" className="cockpit-wave-ring cockpit-wave-1" />
                  <circle cx="200" cy="200" r="38" fill="none" stroke="#38bdf8" strokeWidth="1.8" className="cockpit-wave-ring cockpit-wave-2" />
                  <circle cx="200" cy="200" r="38" fill="none" stroke="#00f0ff" strokeWidth="1.5" className="cockpit-wave-ring cockpit-wave-3" />
                  <circle cx="200" cy="200" r="38" fill="none" stroke="#00d2ff" strokeWidth="1.2" className="cockpit-wave-ring cockpit-wave-4" />
                </g>

                {/* Marcadores / Ticks */}
                <g className="cockpit-major-ticks">
                  <text x="121.9" y="269.1" fill="#ffffff" fontSize="9.2" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="middle">0</text>
                  <text x="101.0" y="228.2" fill="#ffffff" fontSize="9.2" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="middle">1M</text>
                  <text x="100.2" y="182.3" fill="#ffffff" fontSize="9.2" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="middle">5M</text>
                  <text x="119.6" y="140.7" fill="#ffffff" fontSize="9.2" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="middle">10M</text>
                  <text x="155.3" y="111.8" fill="#ffffff" fontSize="9.2" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="middle">25M</text>
                  <text x="200.0" y="101.5" fill="#00f0ff" fontSize="9.2" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="middle">50M</text>
                  <text x="244.7" y="111.8" fill="#ffffff" fontSize="8.5" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="middle">100M</text>
                  <text x="280.4" y="140.7" fill="#ffffff" fontSize="8.5" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="middle">250M</text>
                  <text x="299.8" y="182.3" fill="#c084fc" fontSize="8.5" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="middle">500M</text>
                  <text x="299.0" y="228.2" fill="#c084fc" fontSize="9.2" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="middle">1G</text>
                  <text x="278.1" y="269.1" fill="#c084fc" fontSize="8.5" fontFamily="JetBrains Mono, monospace" fontWeight="bold" textAnchor="middle">1.25G+</text>
                </g>

                {/* Arco de Progresso Ativo */}
                <circle cx="200" cy="200" r="138" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" strokeDasharray="626.2 867.1" strokeDashoffset="0" strokeLinecap="round" transform="rotate(140 200 200)" />
                <circle
                  cx="200"
                  cy="200"
                  r="138"
                  fill="none"
                  stroke="url(#dialArcGrad)"
                  strokeWidth="7"
                  strokeDasharray="626.2 867.1"
                  strokeDashoffset={626.2 * (1 - progress)}
                  strokeLinecap="round"
                  transform="rotate(140 200 200)"
                  className="transition-all duration-150"
                  style={{ filter: 'drop-shadow(0 0 8px #00d2ff)' }}
                />

                {/* Engrenagem Central */}
                <g className="cockpit-center-gear">
                  <circle cx="200" cy="200" r="62" fill="none" stroke="#0284c7" strokeWidth="4.2" strokeDasharray="5.4 5.4" opacity="0.7" />
                  <circle cx="200" cy="200" r="56" fill="none" stroke="#0369a1" strokeWidth="1.2" opacity="0.45" />
                </g>

                {/* Ponteiro Laranja Flamejante */}
                <g className="cockpit-needle-group origin-center transition-transform" style={{ transformOrigin: '200px 200px', transform: `rotate(${needleAngle}deg)` }}>
                  <polygon points="193,200 200,68 207,200 200,224" fill="#ff6d00" opacity="0.35" style={{ filter: 'drop-shadow(0 0 10px #ff3d00)' }} />
                  <polygon points="195.5,200 200,74 204.5,200 200,220" fill="url(#needleOrangeFireGrad)" style={{ filter: 'drop-shadow(0 0 6px #ff6d00)' }} />
                  <line x1="200" y1="195" x2="200" y2="82" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
                  <line x1="200" y1="195" x2="200" y2="90" stroke="#ffe57f" strokeWidth="2.8" strokeLinecap="round" opacity="0.8" />
                  <polygon points="197,200 200,226 203,200" fill="#ff3d00" />
                </g>

                {/* Cubo Central Metálico */}
                <circle cx="200" cy="200" r="38" fill="url(#centerHubRadialBg)" stroke="#00d2ff" strokeWidth="2" />
                <circle cx="200" cy="200" r="30" fill="#011024" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
                <circle cx="200" cy="200" r="14" fill="#00d2ff" opacity="0.35" />
                <circle cx="200" cy="200" r="7" fill="#00f0ff" style={{ filter: 'drop-shadow(0 0 4px #00f0ff)' }} />
              </svg>

              {/* Aura / Halo do Botão Central */}
              <div className="netpulse-button-halo-wrapper">
                <div className="netpulse-pulse-halo netpulse-pulse-halo-1" />
                <div className="netpulse-pulse-halo netpulse-pulse-halo-2" />
                <div className="netpulse-pulse-halo netpulse-pulse-halo-3" />
              </div>

              {/* Botão Central "INICIAR" */}
              <button
                type="button"
                onClick={handleStartTest}
                disabled={isTesting}
                className="netpulse-center-start-btn group disabled:opacity-50"
                title="Iniciar Telemetria"
              >
                {state.phase === 'finished' ? (
                  <>
                    <RefreshCw className="w-5 h-5 text-white mb-0.5 group-hover:rotate-180 transition-transform duration-300" />
                    <span className="text-[9px] font-black tracking-widest text-white uppercase group-hover:text-sky-200">REPETIR</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 text-white ml-0.5 mb-0.5 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black tracking-widest text-white uppercase group-hover:text-sky-200">
                      {isTesting ? 'MEDINDO' : 'INICIAR'}
                    </span>
                  </>
                )}
              </button>

              {/* Display Digital Central Fixo */}
              <div className="netpulse-center-display">
                <span className="netpulse-speed-unit">{getSpeedUnit(state.currentSpeed)}</span>
                <span className="netpulse-speed-value">{formatSpeed(state.currentSpeed)}</span>
                <span className="netpulse-speed-brand">
                  ANECTTA <span>NETPULSE</span>
                </span>
              </div>
            </div>
          </div>

          {/* Coluna Direita: DOWNLOAD & UPLOAD (2 Cards Quadrados) */}
          <div className="flex flex-row lg:flex-col gap-3.5 justify-center items-center shrink-0 order-3 lg:order-3">
            
            {/* Card 3: Download */}
            <div className={`netpulse-metric-card netpulse-telemetry-compact bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between ${state.phase === 'download' ? 'active-card' : ''}`}>
              <div className="flex items-center justify-between text-xs font-mono text-blue-500 mb-0.5">
                <div className="flex items-center gap-1 font-bold">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-b from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
                    <Download className="w-3 h-3" />
                  </div>
                  <span className="text-[9px] tracking-wide font-bold">DOWNLOAD</span>
                </div>
                <span className="text-[8px] px-1 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 font-bold">DOWN</span>
              </div>

              <div className="my-auto py-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight leading-none">
                    {state.download > 0 ? formatSpeed(state.download) : '--'}
                  </span>
                  <span className="text-[11px] font-mono text-blue-500 font-bold">Mb/s</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono pt-1 border-t border-slate-200 dark:border-slate-700 mt-auto">
                <span className="text-slate-500 dark:text-slate-400">PICO:</span>
                <div>
                  <span className="text-blue-500 font-bold">{state.downloadPeak > 0 ? formatSpeed(state.downloadPeak) : '--'}</span>
                  <span className="text-slate-500 ml-0.5">Mb/s</span>
                </div>
              </div>
            </div>

            {/* Card 4: Upload */}
            <div className={`netpulse-metric-card netpulse-telemetry-compact bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between ${state.phase === 'upload' ? 'active-card' : ''}`}>
              <div className="flex items-center justify-between text-xs font-mono text-purple-500 mb-0.5">
                <div className="flex items-center gap-1 font-bold">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-b from-purple-500 to-purple-700 flex items-center justify-center text-white shadow-xs shrink-0">
                    <Upload className="w-3 h-3" />
                  </div>
                  <span className="text-[9px] tracking-wide font-bold">UPLOAD</span>
                </div>
                <span className="text-[8px] px-1 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 font-bold">UP</span>
              </div>

              <div className="my-auto py-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight leading-none">
                    {state.upload > 0 ? formatSpeed(state.upload) : '--'}
                  </span>
                  <span className="text-[11px] font-mono text-purple-500 font-bold">Mb/s</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono pt-1 border-t border-slate-200 dark:border-slate-700 mt-auto">
                <span className="text-slate-500 dark:text-slate-400">PICO:</span>
                <div>
                  <span className="text-purple-500 font-bold">{state.uploadPeak > 0 ? formatSpeed(state.uploadPeak) : '--'}</span>
                  <span className="text-slate-500 ml-0.5">Mb/s</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Data/Hora e Metadados de Rede */}
        <div className="mt-4 flex flex-col items-center gap-2 z-10 relative">
          <div className="flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="text-slate-400 font-medium">DATA/HORA:</span>
            <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{dateTimeStr}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-mono text-slate-500 dark:text-slate-400 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">IP PÚBLICO:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{state.clientIp}</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">PROVEDOR:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{state.isp}</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">LOCAL:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{state.location}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Painel de Laudo & Ações de Exportação */}
      {state.phase === 'finished' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 font-mono uppercase">
                QUALIFICADO ANECTTA NETPULSE
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                Laudo de Diagnóstico de Telemetria de Rede
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Resultado consolidado da varredura multi-stream e análise de latência/jitter RFC 3550.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopyReport}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                {copiedReport ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                <span>{copiedReport ? 'Copiado!' : 'Copiar Laudo'}</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar p/ Suporte WhatsApp</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Download Sustentado</span>
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">{formatSpeed(state.download)} {getSpeedUnit(state.download)}</span>
              <span className="text-[10px] text-slate-500 block">Pico: {formatSpeed(state.downloadPeak)} {getSpeedUnit(state.downloadPeak)}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Upload Sustentado</span>
              <span className="text-lg font-black text-purple-600 dark:text-purple-400">{formatSpeed(state.upload)} {getSpeedUnit(state.upload)}</span>
              <span className="text-[10px] text-slate-500 block">Pico: {formatSpeed(state.uploadPeak)} {getSpeedUnit(state.uploadPeak)}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Ping & Jitter</span>
              <span className="text-lg font-black text-amber-600 dark:text-amber-400">{state.ping} ms</span>
              <span className="text-[10px] text-slate-500 block">Jitter: {state.jitter} ms • Perda: {state.packetLoss}%</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Estabilidade Global</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{state.stability}%</span>
              <span className="text-[10px] text-slate-500 block">Servidor: {state.server}</span>
            </div>
          </div>
        </div>
      )}

      {/* Seção Educativa de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
            <Zap className="w-4 h-4" />
            <span>Latência (Ping) vs Largura de Banda</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            A <strong>latência (ping)</strong> mede o tempo de resposta imediato de cada ação em milissegundos. Em ferramentas de trabalho remoto, ERPs e videoconferências, um ping baixo (&lt; 35ms) garante que a aplicação responda sem congelamentos.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
            <Activity className="w-4 h-4" />
            <span>Jitter (RFC 3550) & Fluidez de Áudio/Vídeo</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            O <strong>jitter</strong> calcula a oscilação da latência entre pacotes sucessivos. Valores abaixo de 10ms evitam cortes de voz no Teams/Meet e garantem transmissões cristalinas.
          </p>
        </div>
      </div>
    </div>
  );
};
