import dns from 'dns/promises';
import { TargetType } from '../../src/types/security';

export interface TargetValidationResult {
  isValid: boolean;
  resolvedIp?: string;
  error?: string;
  isPrivate: boolean;
  normalizedUrl?: string;
  hostname?: string;
  port?: number;
}

// Prefixos e redes reservadas / proibidas (Loopback, Link-Local, Cloud Metadata, Multicast)
const STRICT_DENIED_PREFIXES = [
  '127.',           // Loopback (127.0.0.0/8)
  '169.254.169.',   // AWS/GCP/Azure Cloud Metadata (169.254.169.254)
  '169.254.',       // Link-Local (RFC 3927)
  '0.',             // Current network
  '224.',           // Multicast
  '240.',           // Reserved
  '::1',            // IPv6 Loopback
  'fe80:',          // IPv6 Link-local
  'fc00:',          // IPv6 Unique Local
];

// Redes privadas RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
function isRfc1918PrivateIp(ip: string): boolean {
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  const parts = ip.split('.').map(p => parseInt(p, 10));
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

/**
 * TargetValidator — Serviço dedicado com proteção estrita contra SSRF
 */
export class TargetValidator {
  /**
   * Valida sintaticamente e resolve via DNS um alvo para garantir conformidade
   */
  static async validateTarget(
    targetValue: string,
    targetType: TargetType,
    authorizedCidrs: string[] = ['192.168.1.0/24', '10.0.0.0/24']
  ): Promise<TargetValidationResult> {
    const trimmed = (targetValue || '').trim();
    if (!trimmed) {
      return { isValid: false, isPrivate: false, error: 'O valor do alvo não pode estar vazio.' };
    }

    try {
      let hostname = trimmed;
      let port = 80;
      let protocol = 'http:';
      let normalizedUrl: string | undefined;

      if (targetType === 'WEB_URL' || targetType === 'API_ENDPOINT') {
        // Validação sintática de URL
        let parsedUrl: URL;
        try {
          parsedUrl = new URL(trimmed);
        } catch {
          return { isValid: false, isPrivate: false, error: `URL inválida: '${trimmed}'. Deve iniciar com http:// ou https://.` };
        }

        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          return {
            isValid: false,
            isPrivate: false,
            error: `Protocolo proibido '${parsedUrl.protocol}'. Apenas HTTP e HTTPS são permitidos.`
          };
        }

        // Rejeitar credenciais na URL (ex: http://user:pass@host)
        if (parsedUrl.username || parsedUrl.password) {
          return {
            isValid: false,
            isPrivate: false,
            error: 'Inclusão de credenciais na URL (username/password) é expressamente proibida por segurança.'
          };
        }

        hostname = parsedUrl.hostname;
        protocol = parsedUrl.protocol;
        port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : (protocol === 'https:' ? 443 : 80);
        normalizedUrl = parsedUrl.toString();
      } else if (targetType === 'IP_ADDRESS') {
        hostname = trimmed;
      } else if (targetType === 'DOMAIN_FQDN') {
        hostname = trimmed.toLowerCase();
      }

      // Bloqueio de localhost e strings suspeitas
      if (hostname.toLowerCase() === 'localhost' || hostname.toLowerCase().endsWith('.localhost')) {
        return {
          isValid: false,
          isPrivate: true,
          error: 'Bloqueio Anti-SSRF: Alvos apontando para localhost são estritamente proibidos.'
        };
      }

      // Resolução DNS segura para inspecionar o IP real de destino
      let resolvedIp = hostname;
      const isDirectIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);

      if (!isDirectIp) {
        try {
          const lookup = await dns.lookup(hostname, { family: 4 });
          resolvedIp = lookup.address;
        } catch (dnsErr: any) {
          return {
            isValid: false,
            isPrivate: false,
            error: `Falha na resolução de nomes DNS para '${hostname}': ${dnsErr.message}`
          };
        }
      }

      // Validação do IP contra lista estrita de negação (Loopback, Link-Local, Cloud Metadata)
      for (const prefix of STRICT_DENIED_PREFIXES) {
        if (resolvedIp.startsWith(prefix) || resolvedIp === prefix) {
          return {
            isValid: false,
            resolvedIp,
            isPrivate: true,
            error: `Bloqueio Anti-SSRF: O IP de destino '${resolvedIp}' pertence a um intervalo restrito/proibido (${prefix}).`
          };
        }
      }

      const isPrivate = isRfc1918PrivateIp(resolvedIp);

      // Se for IP privado (RFC 1918), valida se pertence a uma sub-rede corporativa autorizada
      if (isPrivate) {
        const isAuthorized = this.checkSubnetAuthorization(resolvedIp, authorizedCidrs);
        if (!isAuthorized) {
          return {
            isValid: false,
            resolvedIp,
            isPrivate: true,
            error: `Bloqueio de Escopo: O IP privado '${resolvedIp}' não pertence a nenhuma das sub-redes autorizadas deste tenant (${authorizedCidrs.join(', ')}).`
          };
        }
      }

      return {
        isValid: true,
        resolvedIp,
        isPrivate,
        normalizedUrl,
        hostname,
        port
      };
    } catch (err: any) {
      return {
        isValid: false,
        isPrivate: false,
        error: `Erro ao validar alvo de segurança: ${err.message}`
      };
    }
  }

  /**
   * Checa se o IP está contido em uma das sub-redes autorizadas (ex: 192.168.1.0/24)
   */
  private static checkSubnetAuthorization(ip: string, authorizedCidrs: string[]): boolean {
    const ipToNum = (dotIp: string) => {
      return dotIp.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    };

    const targetNum = ipToNum(ip);

    for (const cidr of authorizedCidrs) {
      const [net, maskStr] = cidr.split('/');
      const maskBits = parseInt(maskStr || '32', 10);
      const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
      const netNum = ipToNum(net);

      if ((targetNum & mask) === (netNum & mask)) {
        return true;
      }
    }

    return false;
  }
}
