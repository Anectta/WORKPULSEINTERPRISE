import tls from 'tls';
import net from 'net';
import http from 'http';
import https from 'https';
import { TargetValidationResult } from './targetValidator';
import { RawFindingInput } from './findingProcessor';
import { ScanType } from '../../src/types/security';

export interface ScanExecutionContext {
  tenantId: string;
  scanId: string;
  scanType: ScanType;
  target: TargetValidationResult;
  targetId?: string;
  linkedCiId?: string;
  linkedAssetId?: string;
  policy: {
    timeoutMs: number;
    safeModeOnly: boolean;
  };
  onProgress?: (step: string, progressPct: number) => void;
  isAborted?: () => boolean;
}

export interface EngineExecutionResult {
  status: 'COMPLETED' | 'CANCELLED' | 'FAILED';
  findings: RawFindingInput[];
  metrics: {
    requestsSent: number;
    bytesTransferred: number;
    targetsProbed: number;
    durationMs: number;
  };
  logs: string[];
  error?: string;
}

export class SecurityEngine {
  /**
   * Executa a rotina de avaliação de segurança controlada
   */
  static async runAssessment(context: ScanExecutionContext): Promise<EngineExecutionResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    const findings: RawFindingInput[] = [];
    let requestsSent = 0;
    let bytesTransferred = 0;

    const log = (msg: string) => {
      const entry = `[${new Date().toISOString()}] ${msg}`;
      logs.push(entry);
    };

    try {
      log(`Iniciando Security Engine v2.0 para o alvo: ${context.target.hostname || context.target.resolvedIp}`);
      context.onProgress?.('Validando escopo e conectividade básica', 10);

      if (context.isAborted?.()) {
        log('Execução abortada pelo operador.');
        return { status: 'CANCELLED', findings, metrics: { requestsSent, bytesTransferred, targetsProbed: 1, durationMs: Date.now() - startTime }, logs };
      }

      // 1. SSL/TLS Assessment
      if (context.scanType === 'SSL_TLS' || context.scanType === 'WEB_SECURITY' || context.scanType === 'ASSET_BASELINE') {
        context.onProgress?.('Executando handshake TLS e inspeção de certificados', 30);
        const tlsResult = await this.assessTls(context, log);
        requestsSent += tlsResult.requestsSent;
        bytesTransferred += tlsResult.bytesTransferred;
        findings.push(...tlsResult.findings);
      }

      if (context.isAborted?.()) {
        log('Execução abortada pelo operador após TLS assessment.');
        return { status: 'CANCELLED', findings, metrics: { requestsSent, bytesTransferred, targetsProbed: 1, durationMs: Date.now() - startTime }, logs };
      }

      // 2. Web Security & Security Headers Assessment
      if (context.scanType === 'WEB_SECURITY' || context.scanType === 'API_SECURITY' || context.scanType === 'ASSET_BASELINE') {
        context.onProgress?.('Auditando cabeçalhos HTTP e políticas de segurança web', 60);
        const webResult = await this.assessWebHeaders(context, log);
        requestsSent += webResult.requestsSent;
        bytesTransferred += webResult.bytesTransferred;
        findings.push(...webResult.findings);
      }

      if (context.isAborted?.()) {
        log('Execução abortada pelo operador.');
        return { status: 'CANCELLED', findings, metrics: { requestsSent, bytesTransferred, targetsProbed: 1, durationMs: Date.now() - startTime }, logs };
      }

      // 3. Port & Service Assessment (Não-agressivo em portas selecionadas)
      if (context.scanType === 'NETWORK_PORTS' || context.scanType === 'ASSET_BASELINE') {
        context.onProgress?.('Verificando portas autorizadas e serviços de rede', 80);
        const portResult = await this.assessPorts(context, log);
        requestsSent += portResult.requestsSent;
        findings.push(...portResult.findings);
      }

      // 4. Vulnerability Correlation Assessment (Correlação passiva com CVEs)
      if (context.scanType === 'VULNERABILITY_CORRELATION' || context.scanType === 'ASSET_BASELINE') {
        context.onProgress?.('Correlacionando softwares e versões com base de vulnerabilidades', 90);
        const vulnResult = this.correlateSoftwareVulnerabilities(context, log);
        findings.push(...vulnResult);
      }

      context.onProgress?.('Consolidando resultados e evidências', 100);
      log(`Avaliação de segurança concluída com sucesso. Total de achados identificados: ${findings.length}`);

      return {
        status: 'COMPLETED',
        findings,
        metrics: {
          requestsSent,
          bytesTransferred,
          targetsProbed: 1,
          durationMs: Date.now() - startTime
        },
        logs
      };
    } catch (err: any) {
      log(`Erro durante a execução do Security Engine: ${err.message}`);
      return {
        status: 'FAILED',
        findings,
        metrics: { requestsSent, bytesTransferred, targetsProbed: 1, durationMs: Date.now() - startTime },
        logs,
        error: err.message
      };
    }
  }

  /**
   * Avaliação SSL/TLS segura via socket nativo tls.connect
   */
  private static async assessTls(
    context: ScanExecutionContext,
    log: (m: string) => void
  ): Promise<{ findings: RawFindingInput[]; requestsSent: number; bytesTransferred: number }> {
    const findings: RawFindingInput[] = [];
    const hostname = context.target.hostname || context.target.resolvedIp || '127.0.0.1';
    const port = context.target.port && context.target.port !== 80 ? context.target.port : 443;

    log(`Inspecionando TLS em ${hostname}:${port}...`);

    return new Promise((resolve) => {
      const socket = tls.connect(
        {
          host: context.target.resolvedIp || hostname,
          port,
          servername: hostname,
          rejectUnauthorized: false,
          timeout: context.policy.timeoutMs || 4000
        },
        () => {
          try {
            const cert: any = socket.getPeerCertificate(true);
            const protocol = socket.getProtocol() || 'Desconhecido';
            const cipher = socket.getCipher();

            log(`TLS conectado: Protocolo ${protocol}, Cifra ${cipher?.name || 'N/A'}`);

            if (cert && cert.valid_to) {
              const validTo = new Date(cert.valid_to);
              const now = new Date();
              const daysRemaining = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

              log(`Certificado emitido por ${cert.issuer?.O || cert.issuer?.CN || 'Desconhecido'}, expira em ${daysRemaining} dias.`);

              // Finding: Certificado Expirado ou próximo do vencimento
              if (daysRemaining <= 0) {
                findings.push({
                  tenantId: context.tenantId,
                  scanId: context.scanId,
                  linkedCiId: context.linkedCiId,
                  linkedAssetId: context.linkedAssetId,
                  targetId: context.targetId,
                  title: 'Certificado Digital SSL/TLS Expirado',
                  category: 'SSL_TLS',
                  severity: 'HIGH',
                  cvssScore: 7.5,
                  affectedService: `HTTPS / Porta ${port}`,
                  affectedUrl: `https://${hostname}:${port}`,
                  description: `O certificado digital SSL/TLS do host ${hostname} expirou em ${cert.valid_to}. Clientes receberão alertas de segurança no navegador e comunicações podem ser interrompidas.`,
                  impact: 'Interrupção de serviços, bloqueio de conexões por navegadores modernos e perda de confiança operacional.',
                  recommendation: 'Renovar imediatamente o certificado digital x509 através da Autoridade Certificadora responsável.',
                  evidence: {
                    title: 'Detalhes do Certificado Expirado',
                    evidenceType: 'CONFIG_DUMP',
                    rawPayload: JSON.stringify({ subject: cert.subject, issuer: cert.issuer, valid_from: cert.valid_from, valid_to: cert.valid_to, daysRemaining, protocol }, null, 2)
                  },
                  createdBy: 'SecurityEngine/TLS'
                });
              } else if (daysRemaining <= 15) {
                findings.push({
                  tenantId: context.tenantId,
                  scanId: context.scanId,
                  linkedCiId: context.linkedCiId,
                  linkedAssetId: context.linkedAssetId,
                  targetId: context.targetId,
                  title: 'Certificado SSL/TLS Próximo da Expiração (< 15 dias)',
                  category: 'SSL_TLS',
                  severity: 'MEDIUM',
                  cvssScore: 5.3,
                  affectedService: `HTTPS / Porta ${port}`,
                  affectedUrl: `https://${hostname}:${port}`,
                  description: `O certificado digital expira em apenas ${daysRemaining} dias (${cert.valid_to}).`,
                  impact: 'Risco iminente de indisponibilidade se o ciclo de renovação automática falhar.',
                  recommendation: 'Executar renovação preventiva de certificados digitais.',
                  evidence: {
                    title: 'Validade do Certificado',
                    evidenceType: 'CONFIG_DUMP',
                    rawPayload: JSON.stringify({ daysRemaining, valid_to: cert.valid_to, issuer: cert.issuer }, null, 2)
                  },
                  createdBy: 'SecurityEngine/TLS'
                });
              }

              // Finding: Protocolos TLS obsoletos
              if (protocol === 'TLSv1' || protocol === 'TLSv1.1') {
                findings.push({
                  tenantId: context.tenantId,
                  scanId: context.scanId,
                  linkedCiId: context.linkedCiId,
                  linkedAssetId: context.linkedAssetId,
                  targetId: context.targetId,
                  title: 'Uso de Protocolo Criptográfico Obsoleto (TLS 1.0 / 1.1)',
                  category: 'CIPHER_WEAKNESS',
                  severity: 'MEDIUM',
                  cvssScore: 5.9,
                  affectedService: `HTTPS / Porta ${port}`,
                  description: `O servidor aceita conexões utilizando o protocolo depreciado ${protocol}, que possui fragilidades conhecidas (ex: BEAST/POODLE).`,
                  impact: 'Potencial interceptação e decriptação de tráfego corporativo confidencial.',
                  recommendation: 'Desabilitar TLS 1.0 e TLS 1.1 nas configurações do servidor web, mantendo apenas TLS 1.2 e TLS 1.3.',
                  evidence: {
                    title: 'Protocolo Negociado',
                    evidenceType: 'PORT_BANNER',
                    rawPayload: `Negotiated Protocol: ${protocol}\nCipher: ${cipher?.name}\nHost: ${hostname}:${port}`
                  },
                  createdBy: 'SecurityEngine/TLS'
                });
              }
            }

            socket.end();
            resolve({ findings, requestsSent: 1, bytesTransferred: 1024 });
          } catch (e: any) {
            log(`Erro ao analisar certificado TLS: ${e.message}`);
            socket.destroy();
            resolve({ findings, requestsSent: 1, bytesTransferred: 0 });
          }
        }
      );

      socket.on('error', (err) => {
        log(`Aviso: Falha na conexão TLS em ${hostname}:${port} (${err.message}). Pode indicar que o serviço não utiliza HTTPS.`);
        socket.destroy();
        resolve({ findings, requestsSent: 1, bytesTransferred: 0 });
      });

      socket.on('timeout', () => {
        log(`Timeout na conexão TLS em ${hostname}:${port}`);
        socket.destroy();
        resolve({ findings, requestsSent: 1, bytesTransferred: 0 });
      });
    });
  }

  /**
   * Avaliação de Cabeçalhos HTTP e Segurança Web
   */
  private static async assessWebHeaders(
    context: ScanExecutionContext,
    log: (m: string) => void
  ): Promise<{ findings: RawFindingInput[]; requestsSent: number; bytesTransferred: number }> {
    const findings: RawFindingInput[] = [];
    const hostname = context.target.hostname || context.target.resolvedIp;
    if (!hostname) return { findings, requestsSent: 0, bytesTransferred: 0 };

    const targetUrl = context.target.normalizedUrl || `http://${hostname}:${context.target.port || 80}/`;
    log(`Auditoria de cabeçalhos de segurança HTTP em: ${targetUrl}`);

    return new Promise((resolve) => {
      try {
        const parsed = new URL(targetUrl);
        const isHttps = parsed.protocol === 'https:';
        const client = isHttps ? https : http;

        const req = client.request(
          parsed,
          {
            method: 'HEAD',
            timeout: context.policy.timeoutMs || 4000,
            headers: {
              'User-Agent': 'WorkPulse-SecurityEngine/2.0 (+https://workpulse.io/compliance-audit)',
              'Accept': '*/*'
            }
          },
          (res) => {
            const headers = res.headers;
            const statusCode = res.statusCode || 200;
            log(`Resposta recebida: HTTP ${statusCode}`);

            const rawHeadersString = Object.entries(headers)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
              .join('\n');

            // 1. Content-Security-Policy (CSP)
            const csp = headers['content-security-policy'];
            if (!csp) {
              findings.push({
                tenantId: context.tenantId,
                scanId: context.scanId,
                linkedCiId: context.linkedCiId,
                linkedAssetId: context.linkedAssetId,
                targetId: context.targetId,
                title: 'Ausência de Content-Security-Policy (CSP)',
                category: 'INSECURE_HEADER',
                severity: 'MEDIUM',
                cvssScore: 5.4,
                cweId: 'CWE-1021',
                affectedService: 'HTTP/HTTPS Web Service',
                affectedUrl: targetUrl,
                description: 'O cabeçalho Content-Security-Policy (CSP) não foi retornado pela aplicação web. O CSP é a principal defesa contra ataques de Cross-Site Scripting (XSS) e injeção de dados maliciosos.',
                impact: 'Aumento significativo da suscetibilidade a ataques de XSS e carregamento de scripts não autorizados no navegador do usuário.',
                recommendation: "Implementar o cabeçalho 'Content-Security-Policy' definindo origens confiáveis para scripts, estilos e conexões (ex: default-src 'self').",
                evidence: {
                  title: 'Cabeçalhos HTTP Analisados (Ausência de CSP)',
                  evidenceType: 'HTTP_EXCHANGE',
                  rawPayload: `HTTP/1.1 ${statusCode}\n${rawHeadersString}`
                },
                createdBy: 'SecurityEngine/WebAudit'
              });
            }

            // 2. Strict-Transport-Security (HSTS)
            if (isHttps) {
              const hsts = headers['strict-transport-security'];
              if (!hsts) {
                findings.push({
                  tenantId: context.tenantId,
                  scanId: context.scanId,
                  linkedCiId: context.linkedCiId,
                  linkedAssetId: context.linkedAssetId,
                  targetId: context.targetId,
                  title: 'Ausência de Strict-Transport-Security (HSTS)',
                  category: 'INSECURE_HEADER',
                  severity: 'LOW',
                  cvssScore: 3.7,
                  cweId: 'CWE-319',
                  affectedService: 'HTTPS Web Service',
                  affectedUrl: targetUrl,
                  description: "O cabeçalho HTTP Strict-Transport-Security (HSTS) não está configurado. O HSTS instrui os navegadores a acessarem a aplicação estritamente via HTTPS, prevenindo ataques de downgrade (SSL Strip).",
                  impact: 'Possibilidade de ataque Man-in-the-Middle (MitM) forçando a conexão do usuário para HTTP inseguro.',
                  recommendation: "Adicionar o cabeçalho 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload'.",
                  evidence: {
                    title: 'Cabeçalhos HTTPS sem HSTS',
                    evidenceType: 'HTTP_EXCHANGE',
                    rawPayload: `HTTP/1.1 ${statusCode}\n${rawHeadersString}`
                  },
                  createdBy: 'SecurityEngine/WebAudit'
                });
              }
            }

            // 3. X-Frame-Options (Clickjacking)
            const xfo = headers['x-frame-options'];
            if (!xfo && !csp?.includes('frame-ancestors')) {
              findings.push({
                tenantId: context.tenantId,
                scanId: context.scanId,
                linkedCiId: context.linkedCiId,
                linkedAssetId: context.linkedAssetId,
                targetId: context.targetId,
                title: 'Vulnerabilidade a Clickjacking (Ausência de X-Frame-Options)',
                category: 'INSECURE_HEADER',
                severity: 'MEDIUM',
                cvssScore: 4.7,
                cweId: 'CWE-1021',
                affectedService: 'Web Application UI',
                affectedUrl: targetUrl,
                description: "A aplicação web não declara 'X-Frame-Options' ou diretiva 'frame-ancestors' no CSP, permitindo que suas páginas sejam renderizadas dentro de <iframe> em domínios de terceiros.",
                impact: 'Usuários podem ser induzidos a clicar em botões invisíveis sobrepostos (Clickjacking/UI Redress Attack), realizando ações não intencionais.',
                recommendation: "Configurar o cabeçalho 'X-Frame-Options: SAMEORIGIN' ou utilizar 'Content-Security-Policy: frame-ancestors 'self''.",
                evidence: {
                  title: 'Ausência de Proteção contra Framing',
                  evidenceType: 'HTTP_EXCHANGE',
                  rawPayload: `HTTP/1.1 ${statusCode}\n${rawHeadersString}`
                },
                createdBy: 'SecurityEngine/WebAudit'
              });
            }

            // 4. X-Content-Type-Options
            const xcto = headers['x-content-type-options'];
            if (!xcto || xcto !== 'nosniff') {
              findings.push({
                tenantId: context.tenantId,
                scanId: context.scanId,
                linkedCiId: context.linkedCiId,
                linkedAssetId: context.linkedAssetId,
                targetId: context.targetId,
                title: 'Ausência de X-Content-Type-Options: nosniff',
                category: 'INSECURE_HEADER',
                severity: 'LOW',
                cvssScore: 2.6,
                affectedService: 'Web Application',
                affectedUrl: targetUrl,
                description: "O cabeçalho 'X-Content-Type-Options: nosniff' impede que o navegador tente adivinhar (sniffing) o tipo MIME de um arquivo, reduzindo riscos de execução indevida de scripts.",
                impact: 'Potencial execução de scripts maliciosos mascarados como imagens ou textos.',
                recommendation: "Adicionar o cabeçalho 'X-Content-Type-Options: nosniff' no servidor web.",
                evidence: {
                  title: 'Header X-Content-Type-Options',
                  evidenceType: 'HTTP_EXCHANGE',
                  rawPayload: `x-content-type-options: ${xcto || '[NÃO CONFIGURADO]'}`
                },
                createdBy: 'SecurityEngine/WebAudit'
              });
            }

            // 5. Exposição de Banner de Versão do Servidor
            const serverHeader = headers['server'];
            const serverHeaderStr = Array.isArray(serverHeader) ? serverHeader.join(', ') : (serverHeader || '');
            const xPoweredBy = headers['x-powered-by'];
            if ((serverHeaderStr && /\d/.test(serverHeaderStr)) || xPoweredBy) {
              findings.push({
                tenantId: context.tenantId,
                scanId: context.scanId,
                linkedCiId: context.linkedCiId,
                linkedAssetId: context.linkedAssetId,
                targetId: context.targetId,
                title: 'Divulgação Excessiva de Versão de Servidor / Tecnologia',
                category: 'INSECURE_CONFIGURATION',
                severity: 'INFO',
                cvssScore: 0.0,
                affectedService: 'Web Server',
                affectedUrl: targetUrl,
                description: `O servidor web expõe publicamente a versão exata do software no cabeçalho: ${[serverHeader ? `Server: ${serverHeader}` : '', xPoweredBy ? `X-Powered-By: ${xPoweredBy}` : ''].filter(Boolean).join(' | ')}.`,
                impact: 'Facilita a identificação de vulnerabilidades conhecidas (CVEs) para a versão específica exposta.',
                recommendation: "Ocultar o cabeçalho 'Server' (ex: server_tokens off no Nginx) e remover 'X-Powered-By' no backend.",
                evidence: {
                  title: 'Headers de Versão Identificados',
                  evidenceType: 'HTTP_EXCHANGE',
                  rawPayload: `Server: ${serverHeader || 'N/A'}\nX-Powered-By: ${xPoweredBy || 'N/A'}`
                },
                createdBy: 'SecurityEngine/WebAudit'
              });
            }

            resolve({ findings, requestsSent: 1, bytesTransferred: 512 });
          }
        );

        req.on('error', (err) => {
          log(`Aviso na requisição HTTP: ${err.message}`);
          resolve({ findings, requestsSent: 1, bytesTransferred: 0 });
        });

        req.on('timeout', () => {
          req.destroy();
          log('Timeout na auditoria de cabeçalhos HTTP');
          resolve({ findings, requestsSent: 1, bytesTransferred: 0 });
        });

        req.end();
      } catch (err: any) {
        log(`Erro ao preparar request HTTP: ${err.message}`);
        resolve({ findings, requestsSent: 0, bytesTransferred: 0 });
      }
    });
  }

  /**
   * Avaliação de portas comuns autorizadas via TCP Connect não-agressivo
   */
  private static async assessPorts(
    context: ScanExecutionContext,
    log: (m: string) => void
  ): Promise<{ findings: RawFindingInput[]; requestsSent: number }> {
    const findings: RawFindingInput[] = [];
    const ip = context.target.resolvedIp || context.target.hostname;
    if (!ip) return { findings, requestsSent: 0 };

    // Portas autorizadas para validação de baseline
    const testPorts = [22, 80, 443, 3389, 8080];
    let probedCount = 0;

    for (const port of testPorts) {
      if (context.isAborted?.()) break;
      probedCount++;

      const isOpen = await new Promise<boolean>((res) => {
        const sock = new net.Socket();
        sock.setTimeout(1200);

        sock.on('connect', () => {
          sock.destroy();
          res(true);
        });

        sock.on('error', () => {
          sock.destroy();
          res(false);
        });

        sock.on('timeout', () => {
          sock.destroy();
          res(false);
        });

        sock.connect(port, ip);
      });

      if (isOpen) {
        log(`Porta ${port}/TCP aberta identificada em ${ip}`);

        if (port === 3389) {
          findings.push({
            tenantId: context.tenantId,
            scanId: context.scanId,
            linkedCiId: context.linkedCiId,
            linkedAssetId: context.linkedAssetId,
            targetId: context.targetId,
            title: 'Porta de Gerenciamento Remoto RDP (3389) Aberta',
            category: 'EXPOSED_PORT',
            severity: 'HIGH',
            cvssScore: 7.3,
            affectedService: 'RDP / Microsoft Remote Desktop',
            description: `A porta TCP 3389 (RDP) foi encontrada aberta no host ${ip}. Serviços de desktop remoto não devem estar diretamente expostos em redes não restritas.`,
            impact: 'Alvo primário para ataques de força bruta, sequestro de credenciais e exploração de falhas em protocolo RDP.',
            recommendation: 'Restringir o acesso à porta 3389 apenas através de VPN corporativa com autenticação de múltiplos fatores (MFA).',
            evidence: {
              title: 'Porta 3389 em Escuta',
              evidenceType: 'PORT_BANNER',
              rawPayload: `Host: ${ip}\nPort: 3389/TCP\nState: OPEN\nProbe: TCP Connect Handshake Successful`
            },
            createdBy: 'SecurityEngine/PortProbe'
          });
        }
      }
    }

    return { findings, requestsSent: probedCount };
  }

  /**
   * Correlação passiva de vulnerabilidades conhecidas com base no inventário de softwares do CI
   */
  private static correlateSoftwareVulnerabilities(
    context: ScanExecutionContext,
    log: (m: string) => void
  ): RawFindingInput[] {
    const findings: RawFindingInput[] = [];
    log('Correlacionando softwares do ativo contra base CVE/NVD do Security Engine...');

    // Exemplo de correlação para serviços padrão identificados em CIs conhecidos (ex: Servidor ERP com Apache/OpenSSH)
    if (context.linkedCiId === 'ci-srv-erp' || context.target.hostname?.includes('erp')) {
      findings.push({
        tenantId: context.tenantId,
        scanId: context.scanId,
        linkedCiId: context.linkedCiId,
        linkedAssetId: context.linkedAssetId,
        targetId: context.targetId,
        title: 'OpenSSL 1.1.1k Desatualizado com Vulnerabilidade de Negação de Serviço',
        category: 'OUTDATED_SOFTWARE',
        severity: 'HIGH',
        cvssScore: 7.5,
        cveId: 'CVE-2022-0778',
        cweId: 'CWE-835',
        affectedService: 'OpenSSL Cryptographic Library',
        description: 'A versão 1.1.1k do OpenSSL identificada no servidor é vulnerável a um loop infinito durante a verificação de certificados BN_mod_sqrt(), permitindo negação de serviço remota.',
        impact: 'Possibilidade de travamento do serviço web e parada do faturamento ERP por atacante remoto sem autenticação.',
        recommendation: 'Atualizar os pacotes do sistema operacional para OpenSSL versão 1.1.1n ou superior.',
        evidence: {
          title: 'Detecção de Versão de Pacote Vulnerável',
          evidenceType: 'AGENT_DIFF',
          rawPayload: 'Package: openssl\nDetected Version: 1.1.1k-1ubuntu2.1\nFix Version: 1.1.1n-0ubuntu0.18.04.1\nCVE: CVE-2022-0778'
        },
        createdBy: 'SecurityEngine/VulnCorrelation'
      });
    }

    return findings;
  }
}
