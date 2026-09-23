import {
  WifiConnectionStatus,
  WifiScannedNetwork,
  WifiChannelAnalysis,
  WifiChannelRecommendation,
  WifiScoreBreakdown,
  WifiDiagnosticItem,
  WifiBand,
  WifiChannelWidth,
  WifiQualityStatus,
  WifiSpeedAndDualDiagnostic,
  WifiLanDevice
} from '../types/wifiPulse';

/**
 * Calcula o Score técnico do Wi-Fi de 0 a 100 com base em parâmetros reais de RF.
 */
export function calculateWifiScore(
  rssi: number,
  snr: number,
  linkRateMbps: number,
  maxRateMbps: number,
  channelCongestionScore: number, // 0 (livre) a 100 (muito congestionado)
  signalVariance: number // variação em dBm
): WifiScoreBreakdown {
  // 1. RSSI Score (30% weight)
  // Excelente: >= -50 dBm (100)
  // Bom: -50 a -65 dBm (85)
  // Regular: -65 a -75 dBm (60)
  // Ruim: -75 a -82 dBm (35)
  // Crítico: < -82 dBm (15)
  let rssiScore = 100;
  if (rssi >= -50) {
    rssiScore = 100;
  } else if (rssi >= -65) {
    rssiScore = Math.round(100 - (( -50 - rssi) / 15) * 15); // 100 -> 85
  } else if (rssi >= -75) {
    rssiScore = Math.round(85 - (( -65 - rssi) / 10) * 25); // 85 -> 60
  } else if (rssi >= -82) {
    rssiScore = Math.round(60 - (( -75 - rssi) / 7) * 25); // 60 -> 35
  } else {
    rssiScore = Math.max(5, Math.round(35 - (( -82 - rssi) / 10) * 25));
  }

  // 2. SNR Score (25% weight)
  // Excelente: >= 35 dB (100)
  // Bom: 25 a 34 dB (85)
  // Regular: 15 a 24 dB (60)
  // Ruim: 10 a 14 dB (30)
  // Crítico: < 10 dB (10)
  let snrScore = 100;
  if (snr >= 35) {
    snrScore = 100;
  } else if (snr >= 25) {
    snrScore = Math.round(85 + ((snr - 25) / 10) * 15);
  } else if (snr >= 15) {
    snrScore = Math.round(60 + ((snr - 15) / 10) * 25);
  } else if (snr >= 10) {
    snrScore = Math.round(30 + ((snr - 10) / 5) * 30);
  } else {
    snrScore = Math.max(5, Math.round(snr * 3));
  }

  // 3. Interference / Channel Congestion Score (20% weight)
  // channelCongestionScore: 0 a 100 (invertido para nota de saúde)
  const interferenceScore = Math.max(10, Math.min(100, Math.round(100 - channelCongestionScore)));

  // 4. Stability Score (15% weight) - avalia variação/jitter de dBm
  // Variação <= 2 dB: 100
  // Variação <= 5 dB: 85
  // Variação <= 10 dB: 60
  // Variação > 10 dB: 30
  let stabilityScore = 100;
  if (signalVariance <= 2) {
    stabilityScore = 100;
  } else if (signalVariance <= 5) {
    stabilityScore = 85;
  } else if (signalVariance <= 10) {
    stabilityScore = 60;
  } else {
    stabilityScore = 30;
  }

  // 5. Link Rate Score (10% weight)
  const maxPossible = maxRateMbps > 0 ? maxRateMbps : 1200;
  const linkRateScore = Math.min(100, Math.max(15, Math.round((linkRateMbps / maxPossible) * 100)));

  // Ponderação Final
  const totalScore = Math.round(
    rssiScore * 0.30 +
    snrScore * 0.25 +
    interferenceScore * 0.20 +
    stabilityScore * 0.15 +
    linkRateScore * 0.10
  );

  let rating: WifiQualityStatus = 'EXCELENTE';
  if (totalScore >= 90) rating = 'EXCELENTE';
  else if (totalScore >= 75) rating = 'BOM';
  else if (totalScore >= 55) rating = 'REGULAR';
  else if (totalScore >= 35) rating = 'RUIM';
  else rating = 'CRÍTICO';

  const summaryBullets: string[] = [];
  if (rssi >= -60) summaryBullets.push('✓ Nível de sinal (RSSI) excelente');
  else if (rssi >= -72) summaryBullets.push('✓ Nível de sinal adequado para navegação');
  else summaryBullets.push('⚠️ Nível de sinal atenuado (perda de pacotes provável)');

  if (snr >= 25) summaryBullets.push('✓ Relação Sinal/Ruído (SNR) saudável');
  else summaryBullets.push('⚠️ Piso de ruído elevado reduzindo a modulação');

  if (interferenceScore >= 75) summaryBullets.push('✓ Canal com baixa interferência co-canal');
  else summaryBullets.push('⚠️ Canal compartilhado com redes de alta potência');

  if (stabilityScore >= 80) summaryBullets.push('✓ Sinal com estabilidade contínua');
  else summaryBullets.push('⚠️ Flutuações de sinal detectadas (possível reflexão/multipath)');

  return {
    totalScore,
    rating,
    rssiScore,
    rssiWeight: 30,
    snrScore,
    snrWeight: 25,
    interferenceScore,
    interferenceWeight: 20,
    stabilityScore,
    stabilityWeight: 15,
    linkRateScore,
    linkRateWeight: 10,
    summaryBullets
  };
}

/**
 * Agrupa redes escaneadas por canal e calcula congestionamento e sobreposição.
 */
export function analyzeChannels(
  scannedNetworks: WifiScannedNetwork[],
  band: WifiBand
): WifiChannelAnalysis[] {
  const filtered = scannedNetworks.filter(n => n.band === band);

  let standardChannels: number[] = [];
  if (band === '2.4 GHz') {
    standardChannels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  } else if (band === '5 GHz') {
    standardChannels = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165];
  } else {
    // 6 GHz
    standardChannels = [1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49, 53, 57, 61, 65, 69, 73, 77, 81, 85, 89, 93];
  }

  const result: WifiChannelAnalysis[] = standardChannels.map(ch => {
    const centerFreq = band === '2.4 GHz' 
      ? 2407 + ch * 5 
      : band === '5 GHz'
      ? 5000 + ch * 5
      : 5950 + ch * 5;

    // Redes operando diretamente neste canal
    const networksOnChannel = filtered.filter(n => n.channel === ch);
    
    // Interferência adjacente (especialmente em 2.4GHz)
    let adjacentCount = 0;
    if (band === '2.4 GHz') {
      const adjacentNetworks = filtered.filter(n => n.channel !== ch && Math.abs(n.channel - ch) <= 4);
      adjacentCount = adjacentNetworks.length;
    }

    const maxRssi = networksOnChannel.length > 0 
      ? Math.max(...networksOnChannel.map(n => n.rssi)) 
      : -100;

    const avgRssi = networksOnChannel.length > 0
      ? Math.round(networksOnChannel.reduce((acc, n) => acc + n.rssi, 0) / networksOnChannel.length)
      : -100;

    // Cálculo do Congestion Score (0 a 100)
    // Redes fortes pesam mais que redes fracas
    let powerWeight = 0;
    networksOnChannel.forEach(n => {
      if (n.rssi >= -60) powerWeight += 35;
      else if (n.rssi >= -75) powerWeight += 20;
      else powerWeight += 8;
    });

    // Penalidade por adjacente em 2.4GHz
    if (band === '2.4 GHz') {
      powerWeight += adjacentCount * 8;
    }

    const congestionScore = Math.min(100, powerWeight);

    let congestionLevel: WifiChannelAnalysis['congestionLevel'] = 'Muito baixo';
    if (congestionScore > 75) congestionLevel = 'Crítico';
    else if (congestionScore > 50) congestionLevel = 'Alto';
    else if (congestionScore > 25) congestionLevel = 'Moderado';
    else if (congestionScore > 10) congestionLevel = 'Baixo';
    else congestionLevel = 'Muito baixo';

    return {
      channel: ch,
      band,
      centerFreqMhz: centerFreq,
      networksCount: networksOnChannel.length,
      networks: networksOnChannel.map(n => ({
        ssid: n.ssid,
        bssid: n.bssid,
        rssi: n.rssi,
        width: n.channelWidthMhz,
        isCurrent: n.isCurrent
      })),
      maxRssi,
      avgRssi,
      congestionLevel,
      congestionScore,
      coChannelInterference: networksOnChannel.length,
      adjacentInterference: adjacentCount,
      isRecommended: false
    };
  });

  return result;
}

/**
 * Calcula o melhor canal matemático para a banda selecionada.
 * NÃO apenas seleciona o canal com menos redes; pondera RSSI, largura, sobreposição e canais limpos.
 */
export function recommendBestChannel(
  channelsAnalysis: WifiChannelAnalysis[],
  band: WifiBand
): WifiChannelRecommendation {
  if (channelsAnalysis.length === 0) {
    return {
      band,
      bestChannel: band === '2.4 GHz' ? 1 : 36,
      secondaryChannels: band === '2.4 GHz' ? [6, 11] : [44, 149],
      congestion: 'Muito baixo',
      interference: 'Muito baixa',
      confidencePercent: 95,
      reasoning: 'Canal padrão recomendado com baixo ruído de fundo.',
      widthRecommendation: band === '2.4 GHz' ? 20 : 80
    };
  }

  // Em 2.4GHz, restringimos a avaliação aos canais não-sobrepostos padrão 1, 6 e 11
  let candidates = channelsAnalysis;
  if (band === '2.4 GHz') {
    candidates = channelsAnalysis.filter(c => [1, 6, 11].includes(c.channel));
  } else if (band === '5 GHz') {
    // Em 5GHz, preferimos canais UNII-1 (36, 40, 44, 48) e UNII-3 (149, 153, 157, 161) para evitar DFS se possível
    candidates = channelsAnalysis.filter(c => [36, 40, 44, 48, 149, 153, 157, 161].includes(c.channel));
    if (candidates.length === 0) candidates = channelsAnalysis;
  }

  // Ordena pelo menor congestionScore e menor maxRssi
  const sorted = [...candidates].sort((a, b) => {
    if (a.congestionScore !== b.congestionScore) {
      return a.congestionScore - b.congestionScore;
    }
    return a.maxRssi - b.maxRssi;
  });

  const best = sorted[0] || channelsAnalysis[0];
  const second = sorted[1]?.channel || (best.channel === 1 ? 6 : 1);
  const third = sorted[2]?.channel || (best.channel === 6 ? 11 : 6);

  // Marcar recomendado no array
  channelsAnalysis.forEach(c => {
    c.isRecommended = c.channel === best.channel;
  });

  let interferenceLabel: WifiChannelRecommendation['interference'] = 'Muito baixa';
  if (best.congestionScore > 60) interferenceLabel = 'Alta';
  else if (best.congestionScore > 35) interferenceLabel = 'Moderada';
  else if (best.congestionScore > 15) interferenceLabel = 'Baixa';

  const confidence = Math.max(82, 100 - best.congestionScore);

  let reasoning = '';
  if (band === '2.4 GHz') {
    reasoning = `O Canal ${best.channel} apresentou o menor índice de interferência mútua (${best.networksCount} redes ativas com sinal máximo de ${best.maxRssi > -100 ? best.maxRssi + ' dBm' : 'nenhum'}) e menor poluição nos canais adjacentes.`;
  } else if (band === '5 GHz') {
    reasoning = `O Canal ${best.channel} (UNII-1) opera com espectro limpo, ideal para largura de 80 MHz, sem risco de interferência radar (DFS) e com sinal concorrente insignificante.`;
  } else {
    reasoning = `O Canal ${best.channel} de 6 GHz (Wi-Fi 6E/7) oferece canal de 160/320 MHz totalmente desimpedido e livre de legados 2.4/5GHz.`;
  }

  return {
    band,
    bestChannel: best.channel,
    secondaryChannels: [second, third],
    congestion: best.congestionLevel,
    interference: interferenceLabel,
    confidencePercent: confidence,
    reasoning,
    widthRecommendation: band === '2.4 GHz' ? 20 : 80
  };
}

/**
 * Gera os diagnósticos técnicos automáticos e acionáveis.
 */
export function generateTechnicalDiagnostics(
  connection: WifiConnectionStatus,
  score: WifiScoreBreakdown,
  channelAnalysis: WifiChannelAnalysis[],
  bestChannel: WifiChannelRecommendation
): WifiDiagnosticItem[] {
  const items: WifiDiagnosticItem[] = [];

  // 1. Diagnóstico de Sinal (RSSI)
  if (connection.rssi < -75) {
    items.push({
      id: 'diag-rssi-crit',
      category: 'Sinal',
      status: 'critical',
      title: 'Sinal Wi-Fi Fraco (Atenuação Severa)',
      metricName: 'RSSI',
      metricValue: `${connection.rssi} dBm`,
      impact: 'Alto',
      description: 'O sinal recebido está abaixo do limiar operacional recomendado (-70 dBm). Ocorre redução drástica da modulação MCS e descarte de pacotes.',
      recommendation: 'Aproxime o equipamento do Access Point ou avalie a instalação de um novo ponto de acesso / repetidor mesh na área de trabalho.'
    });
  } else if (connection.rssi < -67) {
    items.push({
      id: 'diag-rssi-warn',
      category: 'Sinal',
      status: 'warning',
      title: 'Sinal Wi-Fi Moderado',
      metricName: 'RSSI',
      metricValue: `${connection.rssi} dBm`,
      impact: 'Médio',
      description: 'Sinal funcional para tarefas rotineiras, porém pode sofrer instabilidade em chamadas de vídeo ou downloads pesados.',
      recommendation: 'Verifique obstáculos físicos como paredes densas ou superfícies metálicas entre o notebook e a antena do AP.'
    });
  } else {
    items.push({
      id: 'diag-rssi-ok',
      category: 'Sinal',
      status: 'ok',
      title: 'Sinal Wi-Fi Excelente',
      metricName: 'RSSI',
      metricValue: `${connection.rssi} dBm`,
      impact: 'Baixo',
      description: 'Excelente intensidade de radiofrequência, permitindo as taxas máximas de transmissão da interface.',
      recommendation: 'Nenhuma ação de sinal necessária.'
    });
  }

  // 2. Diagnóstico de Canal & Congestionamento
  const currentChAnalysis = channelAnalysis.find(c => c.channel === connection.channel);
  if (currentChAnalysis && currentChAnalysis.congestionScore > 50) {
    items.push({
      id: 'diag-chan-cong',
      category: 'Canal',
      status: 'warning',
      title: `Canal ${connection.channel} Congestionado`,
      metricName: 'Redes no Canal',
      metricValue: `${currentChAnalysis.networksCount} redes`,
      impact: 'Médio',
      description: `O canal atual (${connection.channel}) compartilha espectro com múltiplas redes de terceiros de alta intensidade, causando colisões de quadros 802.11.`,
      recommendation: `Recomenda-se alterar o canal do Access Point para o Canal ${bestChannel.bestChannel} (${bestChannel.band}), que possui menor ocupação.`
    });
  } else {
    items.push({
      id: 'diag-chan-ok',
      category: 'Canal',
      status: 'ok',
      title: `Canal ${connection.channel} Otimizado`,
      metricName: 'Canal Atual',
      metricValue: `Ch ${connection.channel} (${connection.band})`,
      impact: 'Baixo',
      description: 'O canal atual opera com espectro desimpedido e baixa concorrência co-canal.',
      recommendation: 'Mantenha a configuração atual de canal.'
    });
  }

  // 3. Diagnóstico de Banda & Largura
  if (connection.band === '2.4 GHz' && connection.rssi >= -70) {
    items.push({
      id: 'diag-band-24',
      category: 'Interferência',
      status: 'warning',
      title: 'Conectado em Banda 2.4 GHz',
      metricName: 'Banda RF',
      metricValue: '2.4 GHz',
      impact: 'Médio',
      description: 'A banda 2.4 GHz possui apenas 3 canais não sobrepostos (1, 6, 11) e sofre com interferência de Bluetooth, fornos micro-ondas e telefones sem fio.',
      recommendation: 'Conecte o equipamento à rede de 5 GHz ou 6 GHz do Access Point para obter maior vazão e menor latência.'
    });
  }

  // 4. Diagnóstico de Relação Sinal/Ruído (SNR)
  if (connection.snr < 20) {
    items.push({
      id: 'diag-snr-warn',
      category: 'Interferência',
      status: 'warning',
      title: 'Piso de Ruído Elevado (Baixo SNR)',
      metricName: 'SNR',
      metricValue: `${connection.snr} dB`,
      impact: 'Médio',
      description: 'A diferença entre o sinal útil e o ruído eletromagnético do ambiente está baixa, forçando retransmissões de pacotes.',
      recommendation: 'Afaste o Access Point de fontes emissoras eletromagnéticas (motores, reatores de lâmpadas, nobreaks de alta potência).'
    });
  }

  // 5. Diagnóstico de Link Rate e Hardware
  if (connection.linkRateMbps < 100) {
    items.push({
      id: 'diag-link-low',
      category: 'Hardware',
      status: 'warning',
      title: 'Taxa de Negociação (Link Rate) Reduzida',
      metricName: 'Link Rate',
      metricValue: `${connection.linkRateMbps} Mbps`,
      impact: 'Alto',
      description: `A placa de rede (${connection.interfaceName}) negociou apenas ${connection.linkRateMbps} Mbps com o ponto de acesso, limitando a velocidade de internet contratada.`,
      recommendation: 'Atualize os drivers da interface Wi-Fi e verifique se a largura do canal no Access Point está configurada para pelo menos 40 ou 80 MHz.'
    });
  }

  return items;
}

/**
 * Cruza dados de Wi-Fi e Internet (Velocímetro) para identificar se o gargalo é Wi-Fi ou WAN.
 */
export function analyzeDualWifiAndInternet(
  wifi: WifiConnectionStatus,
  internet: {
    downloadMbps: number;
    uploadMbps: number;
    pingMs: number;
    jitterMs: number;
    packetLossPercent: number;
    serverLocation: string;
    ispName: string;
  }
): WifiSpeedAndDualDiagnostic {
  let bottleneck: WifiSpeedAndDualDiagnostic['bottleneck'] = 'Nenhum (Conexão Ideal)';
  let conclusion = '';
  const diagnosisBullets: string[] = [];

  const isWifiWeak = wifi.rssi < -72 || wifi.linkRateMbps < 100 || wifi.qualityPercent < 60;
  const isInternetSlow = internet.downloadMbps < 30 || internet.pingMs > 80 || internet.packetLossPercent > 2;

  if (isWifiWeak && !isInternetSlow) {
    bottleneck = 'Wi-Fi (Sinal ou Canal)';
    conclusion = 'A qualidade do sinal e modulação Wi-Fi é o principal gargalo limitando o desempenho da conexão.';
    diagnosisBullets.push(`⚠️ Sinal Wi-Fi atenuado (${wifi.rssi} dBm) com Link Rate de apenas ${wifi.linkRateMbps} Mbps.`);
    diagnosisBullets.push(`✓ O link de internet da operadora (${internet.ispName}) responde com latência aceitável (${internet.pingMs} ms).`);
    diagnosisBullets.push('💡 Ação: Otimizar o posicionamento do Access Point ou trocar de canal.');
  } else if (!isWifiWeak && isInternetSlow) {
    bottleneck = 'Internet (Provedor WAN)';
    conclusion = 'O enlace Wi-Fi local está excelente, porém o link do provedor de internet WAN apresenta degradação de velocidade ou alta latência.';
    diagnosisBullets.push(`✓ Wi-Fi local operando com excelente modulação (${wifi.linkRateMbps} Mbps, RSSI ${wifi.rssi} dBm).`);
    diagnosisBullets.push(`⚠️ Velocidade de download da operadora reduzida (${internet.downloadMbps} Mbps) com ping de ${internet.pingMs} ms.`);
    diagnosisBullets.push('💡 Ação: Acionar o provedor de internet (ISP) ou verificar consumo no gateway de borda.');
  } else if (isWifiWeak && isInternetSlow) {
    bottleneck = 'Misto (Wi-Fi + Link WAN)';
    conclusion = 'Identificada degradação simultânea no sinal Wi-Fi local e na conexão de internet do provedor.';
    diagnosisBullets.push('⚠️ Atenuação acentuada de sinal Wi-Fi no equipamento do colaborador.');
    diagnosisBullets.push('⚠️ Provedor de internet com perda de pacotes e latência elevada.');
    diagnosisBullets.push('💡 Ação: Corrigir primeiro a cobertura Wi-Fi local antes de abrir chamado no provedor.');
  } else {
    bottleneck = 'Nenhum (Conexão Ideal)';
    conclusion = 'Não foram identificados sinais de que o Wi-Fi ou a internet estejam limitando a conexão. Desempenho excelente em ambas as camadas.';
    diagnosisBullets.push('✓ Wi-Fi excelente com alta largura de banda e sinal estável.');
    diagnosisBullets.push('✓ Link de internet com banda plena, baixa latência e zero perda de pacotes.');
    diagnosisBullets.push('✓ Parâmetros de rede homologados para operações críticas e videoconferências.');
  }

  return {
    wifi: {
      rssi: wifi.rssi,
      snr: wifi.snr,
      linkRateMbps: wifi.linkRateMbps,
      qualityPercent: wifi.qualityPercent,
      channel: wifi.channel,
      band: wifi.band
    },
    internet,
    conclusion,
    bottleneck,
    diagnosisBullets,
    testedAt: new Date().toISOString()
  };
}
