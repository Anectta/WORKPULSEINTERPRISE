import os from 'os';
import net from 'net';
import dgram from 'dgram';
import dns from 'dns';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface LiveDiscoveredDevice {
  ip: string;
  hostname: string;
  mac: string;
  vendor: string;
  status: 'ONLINE' | 'OFFLINE';
  responseTimeMs: number;
  openPorts: number[];
  services: { [port: number]: string };
  deviceType: 'workstation' | 'server' | 'switch' | 'router' | 'firewall' | 'printer' | 'other';
  hasSharedFolders: boolean;
  hasRdp: boolean;
  hasWeb: boolean;
  hasSsh: boolean;
  ttl?: number;
  lastSeen: string;
}

export interface NetworkInterfaceInfo {
  name: string;
  ip: string;
  netmask: string;
  family: string;
  mac: string;
  cidr: string;
  suggestedRange: {
    startIp: string;
    endIp: string;
    totalIps: number;
  };
}

export interface LiveScanResult {
  scanId: string;
  targetRange: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalScanned: number;
  totalOnline: number;
  devices: LiveDiscoveredDevice[];
}

// Base local de prefixos IEEE OUI mais comuns no mercado corporativo
const OUI_DATABASE: { [prefix: string]: string } = {
  // Apple
  '00:03:93': 'Apple Inc.', '00:05:02': 'Apple Inc.', '00:0A:27': 'Apple Inc.',
  '00:0A:95': 'Apple Inc.', '00:10:FA': 'Apple Inc.', '00:11:24': 'Apple Inc.',
  '00:14:51': 'Apple Inc.', '00:17:F2': 'Apple Inc.', '00:1B:63': 'Apple Inc.',
  '00:1E:52': 'Apple Inc.', '00:26:08': 'Apple Inc.', 'AC:BC:32': 'Apple Inc.',
  'F0:18:98': 'Apple Inc.', 'F4:F9:51': 'Apple Inc.', '3C:06:30': 'Apple Inc.',
  '70:3E:AC': 'Apple Inc.', 'A4:83:E7': 'Apple Inc.', '88:66:5A': 'Apple Inc.',

  // Dell
  '00:14:22': 'Dell Inc.', '00:15:C5': 'Dell Inc.', '00:18:8B': 'Dell Inc.',
  '00:1A:A0': 'Dell Inc.', '00:1E:4F': 'Dell Inc.', '00:21:70': 'Dell Inc.',
  '00:22:19': 'Dell Inc.', '00:24:E8': 'Dell Inc.', '18:03:73': 'Dell Inc.',
  '24:B6:FD': 'Dell Inc.', '74:86:7A': 'Dell Inc.', 'B8:2A:72': 'Dell Inc.',
  'E4:54:E8': 'Dell Inc.', 'F8:DB:88': 'Dell Inc.', '00:B0:D0': 'Dell Inc.',

  // HP / Hewlett Packard
  '00:0E:7F': 'Hewlett Packard Enterprise', '00:17:A4': 'Hewlett Packard Enterprise',
  '00:1B:78': 'Hewlett Packard Enterprise', '00:24:81': 'HP Inc.',
  '00:26:55': 'HP Inc.', '10:1F:74': 'HP Inc.', '3C:D9:2B': 'HP Inc.',
  '9C:8E:99': 'HP Inc.', 'C8:D3:FF': 'HP Inc.', '00:80:5F': 'HP Inc.',

  // Lenovo
  '00:1B:77': 'Lenovo Mobile', '00:21:5E': 'Lenovo', '00:26:B9': 'Lenovo',
  '40:B0:34': 'Lenovo', '54:EE:75': 'Lenovo', '60:99:D1': 'Lenovo',
  '8C:16:45': 'Lenovo', 'E8:6A:64': 'Lenovo', 'F8:75:A4': 'Lenovo',

  // Cisco / Meraki
  '00:00:0C': 'Cisco Systems', '00:01:42': 'Cisco Systems', '00:01:43': 'Cisco Systems',
  '00:04:4D': 'Cisco Systems', '00:1A:A1': 'Cisco Systems', '00:27:E3': 'Cisco Systems',
  '70:81:05': 'Cisco Systems', 'AC:A0:16': 'Cisco Systems', 'E4:C7:22': 'Cisco Meraki',

  // Fortinet
  '70:4C:A5': 'Fortinet Technologies', '00:09:0F': 'Fortinet Technologies',
  '04:D5:90': 'Fortinet Technologies', '90:6C:AC': 'Fortinet Technologies',

  // Ubiquiti / UniFi
  '00:27:22': 'Ubiquiti Networks', '04:18:D6': 'Ubiquiti Networks',
  '24:A4:3C': 'Ubiquiti Networks', '68:D7:9A': 'Ubiquiti Networks',
  '74:83:C2': 'Ubiquiti Networks', 'B4:FB:E4': 'Ubiquiti Networks',
  'E0:63:DA': 'Ubiquiti Networks', 'F6:92:BF': 'Ubiquiti Networks',

  // MikroTik
  '00:0C:42': 'MikroTik', '48:8F:5A': 'MikroTik', '6C:3B:6B': 'MikroTik',
  'B8:69:F4': 'MikroTik', 'C4:AD:34': 'MikroTik', 'D4:CA:6D': 'MikroTik',

  // TP-Link
  '00:27:19': 'TP-Link Corporation', '14:CC:20': 'TP-Link Corporation',
  '50:C7:BF': 'TP-Link Corporation', '60:32:B1': 'TP-Link Corporation',
  '70:4F:57': 'TP-Link Corporation', 'AC:84:C6': 'TP-Link Corporation',

  // Intel (NICs)
  '00:02:B3': 'Intel Corporate', '00:03:47': 'Intel Corporate',
  '00:04:23': 'Intel Corporate', '00:15:00': 'Intel Corporate',
  '00:1B:21': 'Intel Corporate', '00:1E:67': 'Intel Corporate',
  '34:17:EB': 'Intel Corporate', '68:05:CA': 'Intel Corporate',

  // Virtualization
  '00:50:56': 'VMware Inc.', '00:0C:29': 'VMware Inc.', '00:05:69': 'VMware Inc.',
  '08:00:27': 'Oracle VirtualBox', '00:15:5D': 'Microsoft Hyper-V',

  // Storage / NAS
  '00:11:32': 'Synology Inc.', '00:08:9B': 'QNAP Systems Inc.',
  '24:5E:BE': 'QNAP Systems Inc.',

  // Impressoras
  '00:00:85': 'Canon Inc.', '00:1E:8F': 'Canon Inc.', '18:0C:AC': 'Canon Inc.',
  '00:00:48': 'Seiko Epson', '00:26:AB': 'Seiko Epson',
  '00:00:AA': 'Xerox Corporation', '00:00:07': 'Xerox Corporation',
  '00:80:77': 'Brother Industries', '30:05:5C': 'Brother Industries',

  // IoT / Mini PCs
  'B8:27:EB': 'Raspberry Pi Foundation', 'DC:A6:32': 'Raspberry Pi Foundation',
  'E4:5F:01': 'Raspberry Pi Foundation', '28:CD:C1': 'Raspberry Pi Foundation',
  '24:6F:28': 'Espressif Inc (ESP32/ESP8266)', '30:AE:A4': 'Espressif Inc',
};

// Portas prioritárias para escaneamento rápido
export const PROBE_PORTS = [
  { port: 80, name: 'HTTP' },
  { port: 443, name: 'HTTPS' },
  { port: 445, name: 'SMB / Compartilhamento' },
  { port: 139, name: 'NetBIOS-SSN' },
  { port: 3389, name: 'RDP (Desktop Remoto)' },
  { port: 22, name: 'SSH' },
  { port: 23, name: 'Telnet' },
  { port: 8080, name: 'HTTP-Alt' },
  { port: 8443, name: 'HTTPS-Alt' },
  { port: 9100, name: 'Impressora RAW' },
  { port: 53, name: 'DNS' },
  { port: 5900, name: 'VNC' }
];

export class NetworkScannerService {
  /**
   * Obtém as interfaces de rede locais ativas na máquina
   */
  static getLocalNetworkInterfaces(): NetworkInterfaceInfo[] {
    const interfaces = os.networkInterfaces();
    const result: NetworkInterfaceInfo[] = [];

    for (const [name, netList] of Object.entries(interfaces)) {
      if (!netList) continue;
      for (const net of netList) {
        // Ignora loopback e IPv6 para varredura básica de sub-rede IPv4
        if (net.internal || net.family !== 'IPv4') continue;

        const cidr = this.calculateCidr(net.address, net.netmask);
        const range = this.calculateSubnetRange(net.address, net.netmask);

        result.push({
          name,
          ip: net.address,
          netmask: net.netmask,
          family: net.family,
          mac: net.mac,
          cidr,
          suggestedRange: range
        });
      }
    }

    return result;
  }

  /**
   * Converte IP e Máscara em notação CIDR
   */
  static calculateCidr(ip: string, netmask: string): string {
    const maskParts = netmask.split('.').map(Number);
    let cidrBits = 0;
    for (const part of maskParts) {
      cidrBits += (part.toString(2).match(/1/g) || []).length;
    }
    const ipParts = ip.split('.').map(Number);
    // Mascara o IP para obter o endereço de rede
    const netParts = ipParts.map((p, i) => p & maskParts[i]);
    return `${netParts.join('.')}/${cidrBits}`;
  }

  /**
   * Calcula faixa inicial e final para uma sub-rede
   */
  static calculateSubnetRange(ip: string, netmask: string): { startIp: string; endIp: string; totalIps: number } {
    const ipParts = ip.split('.').map(Number);
    const maskParts = netmask.split('.').map(Number);

    const netParts = ipParts.map((p, i) => p & maskParts[i]);
    const broadcastParts = ipParts.map((p, i) => p | (~maskParts[i] & 255));

    // Primeiro IP utilizável: netParts + 1
    const startParts = [...netParts];
    startParts[3] += 1;

    // Último IP utilizável: broadcastParts - 1
    const endParts = [...broadcastParts];
    endParts[3] -= 1;

    // Total de IPs calculados
    const ipToInt = (parts: number[]) => ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
    const total = Math.max(0, ipToInt(endParts) - ipToInt(startParts) + 1);

    return {
      startIp: startParts.join('.'),
      endIp: endParts.join('.'),
      totalIps: Math.min(total, 512) // Limite seguro padrão
    };
  }

  /**
   * Lê a tabela ARP local do sistema operacional
   */
  static async getArpTable(): Promise<Map<string, string>> {
    const arpMap = new Map<string, string>();
    try {
      const isWindows = process.platform === 'win32';
      const cmd = isWindows ? 'arp -a' : 'cat /proc/net/arp 2>/dev/null || arp -an 2>/dev/null';
      const { stdout } = await execAsync(cmd, { timeout: 3000 });

      const lines = stdout.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Expressão para pegar IP e MAC Address (compatível com Windows e Linux)
        const match = trimmed.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([0-9a-fA-F:-]{11,17})/);
        if (match) {
          const ip = match[1];
          let mac = match[2].toUpperCase().replace(/-/g, ':');
          // Formata MAC com dois dígitos por octeto
          mac = mac.split(':').map(part => part.padStart(2, '0')).join(':');
          if (mac !== '00:00:00:00:00:00' && mac !== 'FF:FF:FF:FF:FF:FF') {
            arpMap.set(ip, mac);
          }
        }
      }
    } catch {}

    // Adiciona interfaces locais ao arpMap
    try {
      const localInterfaces = this.getLocalNetworkInterfaces();
      for (const iface of localInterfaces) {
        if (iface.ip && iface.mac && iface.mac !== '00:00:00:00:00:00') {
          arpMap.set(iface.ip, iface.mac.toUpperCase());
        }
      }
    } catch {}

    return arpMap;
  }

  /**
   * Identifica o fabricante a partir do MAC Address
   */
  static getVendorFromMac(mac: string): string {
    if (!mac || mac === '00:00:00:00:00:00') return 'Desconhecido';
    const prefix = mac.slice(0, 8).toUpperCase();
    return OUI_DATABASE[prefix] || 'Dispositivo de Rede Genérico';
  }

  /**
   * Envia uma consulta NetBIOS Name Service (porta 137 UDP) para obter o nome NetBIOS real do host
   */
  static async resolveNetbiosName(ip: string, timeoutMs = 800): Promise<string | null> {
    return new Promise((resolve) => {
      let socket: dgram.Socket | null = null;
      let timer: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        if (socket) {
          try {
            socket.close();
          } catch {}
          socket = null;
        }
      };

      timer = setTimeout(() => {
        cleanup();
        resolve(null);
      }, timeoutMs);

      try {
        socket = dgram.createSocket('udp4');
        socket.on('error', () => {
          cleanup();
          resolve(null);
        });

        socket.on('message', (msg) => {
          try {
            // Decodifica cabeçalho NetBIOS NBSTAT
            if (msg.length >= 57) {
              const numNames = msg[56];
              let offset = 57;
              for (let i = 0; i < numNames && offset + 18 <= msg.length; i++) {
                const nameBuffer = msg.slice(offset, offset + 15);
                const nameType = msg[offset + 15];
                const flags = msg.readUInt16BE(offset + 16);
                const isGroup = (flags & 0x8000) !== 0;

                // Tipo 0x00 e não grupo = Nome do Computador (Workstation / Host)
                if (nameType === 0x00 && !isGroup) {
                  const hostname = nameBuffer.toString('latin1').trim();
                  if (hostname) {
                    cleanup();
                    return resolve(hostname);
                  }
                }
                offset += 18;
              }
            }
          } catch {}
          cleanup();
          resolve(null);
        });

        // Constrói pacote de consulta de status NetBIOS Node
        const query = Buffer.from([
          0x13, 0x37, // Transaction ID
          0x00, 0x00, // Flags (Standard Query)
          0x00, 0x01, // Questions: 1
          0x00, 0x00, // Answer RRs: 0
          0x00, 0x00, // Authority RRs: 0
          0x00, 0x00, // Additional RRs: 0
          0x20, // Comprimento do nome codificado
          // Codificação NetBIOS para "*" (32 bytes)
          0x43, 0x4B, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
          0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
          0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
          0x00, // Null terminator
          0x00, 0x21, // Type: NBSTAT (0x0021)
          0x00, 0x01  // Class: IN (0x0001)
        ]);

        socket.send(query, 0, query.length, 137, ip);
      } catch {
        cleanup();
        resolve(null);
      }
    });
  }

  /**
   * Testa uma única porta TCP com timeout curto
   */
  static testPort(ip: string, port: number, timeoutMs = 600): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let isResolved = false;

      const finish = (result: boolean) => {
        if (!isResolved) {
          isResolved = true;
          socket.destroy();
          resolve(result);
        }
      };

      socket.setTimeout(timeoutMs);
      socket.once('connect', () => finish(true));
      socket.once('timeout', () => finish(false));
      socket.once('error', () => finish(false));

      try {
        socket.connect(port, ip);
      } catch {
        finish(false);
      }
    });
  }

  /**
   * Sonda um host individual: portas, NetBIOS, DNS reverso e classificação
   */
  static async probeHost(
    ip: string,
    arpMap: Map<string, string>,
    portsToScan = PROBE_PORTS
  ): Promise<LiveDiscoveredDevice | null> {
    const startTime = Date.now();
    const openPorts: number[] = [];
    const services: { [port: number]: string } = {};

    // 1. Testa portas em paralelo
    const portChecks = portsToScan.map(async (p) => {
      const isOpen = await this.testPort(ip, p.port, 700);
      if (isOpen) {
        openPorts.push(p.port);
        services[p.port] = p.name;
      }
    });

    await Promise.all(portChecks);

    const macFromArp = arpMap.get(ip) || '';
    const isOnline = openPorts.length > 0 || !!macFromArp;

    // Se nenhuma porta respondeu e não está na tabela ARP, considera OFFLINE
    if (!isOnline) {
      return null;
    }

    const responseTimeMs = Math.max(1, Date.now() - startTime);

    // 2. Resolução de Identidade: NetBIOS ou DNS Reverso
    let resolvedHostname = '';
    const [netbiosName, dnsNames] = await Promise.all([
      this.resolveNetbiosName(ip, 700).catch(() => null),
      dns.promises.reverse(ip).catch(() => [] as string[])
    ]);

    if (netbiosName) {
      resolvedHostname = netbiosName;
    } else if (dnsNames && dnsNames.length > 0) {
      resolvedHostname = dnsNames[0];
    } else {
      try {
        const localIps = this.getLocalNetworkInterfaces().map(i => i.ip);
        if (localIps.includes(ip)) {
          resolvedHostname = os.hostname();
        }
      } catch {}
    }

    const vendor = this.getVendorFromMac(macFromArp);

    // 3. Classificação de tipo de equipamento
    let deviceType: LiveDiscoveredDevice['deviceType'] = 'other';
    const hasSharedFolders = openPorts.includes(445) || openPorts.includes(139);
    const hasRdp = openPorts.includes(3389);
    const hasWeb = openPorts.includes(80) || openPorts.includes(443) || openPorts.includes(8080);
    const hasSsh = openPorts.includes(22);

    if (openPorts.includes(9100) || vendor.toLowerCase().includes('canon') || vendor.toLowerCase().includes('epson') || vendor.toLowerCase().includes('xerox')) {
      deviceType = 'printer';
    } else if (vendor.toLowerCase().includes('fortinet')) {
      deviceType = 'firewall';
    } else if (vendor.toLowerCase().includes('cisco') || vendor.toLowerCase().includes('mikrotik') || vendor.toLowerCase().includes('ubiquiti') || openPorts.includes(53)) {
      deviceType = 'router';
    } else if (hasRdp && hasSharedFolders) {
      deviceType = 'workstation';
    } else if (hasWeb && (hasSsh || hasSharedFolders)) {
      deviceType = 'server';
    } else if (hasSsh || hasWeb) {
      deviceType = 'server';
    } else if (hasSharedFolders) {
      deviceType = 'workstation';
    } else {
      deviceType = 'workstation';
    }

    return {
      ip,
      hostname: resolvedHostname || `Host-${ip.split('.').slice(2).join('-')}`,
      mac: macFromArp || '00:00:00:00:00:00',
      vendor,
      status: 'ONLINE',
      responseTimeMs,
      openPorts: openPorts.sort((a, b) => a - b),
      services,
      deviceType,
      hasSharedFolders,
      hasRdp,
      hasWeb,
      hasSsh,
      lastSeen: new Date().toISOString()
    };
  }

  /**
   * Converte uma faixa em formato CIDR (ex: 192.168.1.0/24) ou Intervalo (192.168.1.1-192.168.1.254) em lista de IPs
   */
  static generateIpList(inputRange: string, maxLimit = 512): string[] {
    const ips: string[] = [];
    const trimmed = inputRange.trim();

    // 1. Notação CIDR (ex: 192.168.1.0/24)
    if (trimmed.includes('/')) {
      const [baseIp, maskStr] = trimmed.split('/');
      const bits = parseInt(maskStr, 10);
      if (isNaN(bits) || bits < 16 || bits > 32) {
        throw new Error(`Prefixo CIDR inválido: /${maskStr}. Permitido entre /16 e /32.`);
      }

      const ipParts = baseIp.split('.').map(Number);
      const ipNum = ((ipParts[0] << 24) >>> 0) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
      const mask = bits === 32 ? 0xFFFFFFFF : ((0xFFFFFFFF << (32 - bits)) >>> 0);
      const network = (ipNum & mask) >>> 0;
      const count = Math.min(Math.pow(2, 32 - bits), maxLimit);

      // Gera os IPs (pula o endereço de rede se > 2 hosts)
      const startOffset = bits <= 30 ? 1 : 0;
      const endOffset = bits <= 30 ? count - 1 : count;

      for (let i = startOffset; i < endOffset; i++) {
        const current = (network + i) >>> 0;
        const p1 = (current >>> 24) & 255;
        const p2 = (current >>> 16) & 255;
        const p3 = (current >>> 8) & 255;
        const p4 = current & 255;
        ips.push(`${p1}.${p2}.${p3}.${p4}`);
      }
      return ips;
    }

    // 2. Notação de Intervalo (ex: 192.168.1.1 - 192.168.1.254 ou 192.168.1.10-50)
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-').map(s => s.trim());
      const startIp = parts[0];
      let endIp = parts[1];

      if (!endIp.includes('.')) {
        // Formato abreviado ex: 192.168.1.1 - 50
        const prefix = startIp.split('.').slice(0, 3).join('.');
        endIp = `${prefix}.${endIp}`;
      }

      const ipToInt = (ip: string) => {
        const p = ip.split('.').map(Number);
        return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
      };

      const intToIp = (val: number) => {
        return [(val >>> 24) & 255, (val >>> 16) & 255, (val >>> 8) & 255, val & 255].join('.');
      };

      const start = ipToInt(startIp);
      const end = ipToInt(endIp);

      if (end < start) {
        throw new Error('O IP final do intervalo deve ser maior ou igual ao IP inicial.');
      }

      const total = Math.min(end - start + 1, maxLimit);
      for (let i = 0; i < total; i++) {
        ips.push(intToIp(start + i));
      }
      return ips;
    }

    // 3. IP único
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(trimmed)) {
      return [trimmed];
    }

    throw new Error('Formato de endereço inválido. Utilize notação CIDR (ex: 192.168.1.0/24) ou Intervalo (ex: 192.168.1.1 - 192.168.1.254).');
  }

  /**
   * Executa varredura concorrente completa na faixa de IPs fornecida
   */
  static async executeLiveScan(
    targetRange: string,
    options: {
      concurrency?: number;
      ports?: typeof PROBE_PORTS;
      onProgress?: (scanned: number, total: number, found: LiveDiscoveredDevice | null) => void;
    } = {}
  ): Promise<LiveScanResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    const scanId = `scan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const ips = this.generateIpList(targetRange);
    const arpMap = await this.getArpTable();
    const devices: LiveDiscoveredDevice[] = [];

    const concurrency = Math.min(options.concurrency || 20, 50);
    const total = ips.length;
    let index = 0;

    // Função de worker para processar fila de IPs com controle de concorrência
    const worker = async () => {
      while (index < ips.length) {
        const currentIp = ips[index++];
        try {
          const device = await this.probeHost(currentIp, arpMap, options.ports || PROBE_PORTS);
          if (device) {
            devices.push(device);
          }
          if (options.onProgress) {
            options.onProgress(index, total, device);
          }
        } catch {
          // Ignora falhas pontuais de host
        }
      }
    };

    // Lança workers paralelos
    const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
    await Promise.all(workers);

    // Ordena os dispositivos encontrados por endereço IP
    devices.sort((a, b) => {
      const numA = a.ip.split('.').map(Number).reduce((acc, oct) => (acc << 8) + oct, 0);
      const numB = b.ip.split('.').map(Number).reduce((acc, oct) => (acc << 8) + oct, 0);
      return numA - numB;
    });

    const completedAt = new Date().toISOString();
    return {
      scanId,
      targetRange,
      startedAt,
      completedAt,
      durationMs: Date.now() - startTime,
      totalScanned: total,
      totalOnline: devices.length,
      devices
    };
  }

  /**
   * Dispara pacote Magic Packet para Wake-on-LAN (WOL)
   */
  static sendWakeOnLan(
    macAddress: string,
    broadcastAddress = '255.255.255.255',
    port = 9
  ): Promise<{ success: boolean; message: string; mac: string; broadcast: string }> {
    return new Promise((resolve, reject) => {
      const cleanMac = macAddress.replace(/[^0-9A-Fa-f]/g, '');
      if (cleanMac.length !== 12) {
        return reject(new Error(`Endereço MAC inválido para Wake-on-LAN: "${macAddress}". Esperado 12 caracteres hexadecimais.`));
      }

      // Constrói o Magic Packet de 102 bytes:
      // 6 bytes de 0xFF seguidos por 16 repetições do MAC Address alvo
      const magicPacket = Buffer.alloc(102);
      magicPacket.fill(0xFF, 0, 6);

      const macBytes = Buffer.from(cleanMac, 'hex');
      for (let i = 0; i < 16; i++) {
        macBytes.copy(magicPacket, 6 + i * 6, 0, 6);
      }

      const client = dgram.createSocket('udp4');
      client.once('error', (err) => {
        try { client.close(); } catch {}
        reject(err);
      });

      client.bind(0, () => {
        try {
          client.setBroadcast(true);
          client.send(magicPacket, 0, magicPacket.length, port, broadcastAddress, (err) => {
            try { client.close(); } catch {}
            if (err) return reject(err);
            resolve({
              success: true,
              message: `Magic Packet WOL enviado com sucesso para ${macAddress} via broadcast ${broadcastAddress}:${port}.`,
              mac: macAddress,
              broadcast: `${broadcastAddress}:${port}`
            });
          });
        } catch (e) {
          try { client.close(); } catch {}
          reject(e);
        }
      });
    });
  }
}
