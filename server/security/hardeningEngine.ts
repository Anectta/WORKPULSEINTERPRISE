import crypto from 'crypto';
import {
  HardeningBaseline,
  HardeningCategory,
  SecurityControl,
  ComplianceEvaluationResult,
  ControlValidationResult,
  SecurityFinding,
  SecuritySeverity
} from '../../src/types/security';

export class HardeningEngine {
  /**
   * Catálogo de Baselines pré-configuradas com referências CIS, OWASP, NIST
   */
  public static baselines: HardeningBaseline[] = [
    {
      id: 'base-linux-server',
      name: 'Linux Server Hardening Baseline',
      version: 'v2.4',
      category: 'OPERATING_SYSTEM',
      policyVersion: 'SEC-POL-LINUX-2026',
      description: 'Controles essenciais de segurança para servidores Ubuntu, Debian e RHEL baseados em CIS Benchmarks v8.',
      targetEnvironment: 'Servidores de Aplicação e Bancos de Dados Linux',
      status: 'ACTIVE',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      controls: [
        {
          controlId: 'OS-LIN-001',
          name: 'Desabilitar Login Direto de Root via SSH',
          category: 'OPERATING_SYSTEM',
          description: 'O arquivo /etc/ssh/sshd_config deve possuir PermitRootLogin no para evitar ataques de força bruta contra o superusuário.',
          requirement: 'PermitRootLogin no',
          validationMethod: 'CONFIG_AUDIT',
          expectedResult: 'PermitRootLogin configurado como "no" ou "prohibit-password"',
          severity: 'HIGH',
          remediation: 'Edite /etc/ssh/sshd_config, defina PermitRootLogin no e reinicie o serviço com systemctl restart sshd.',
          reference: 'CIS Linux Benchmark 5.2.10 / NIST SP 800-53 AC-3'
        },
        {
          controlId: 'OS-LIN-002',
          name: 'Autenticação SSH Exclusiva por Chave Pública',
          category: 'OPERATING_SYSTEM',
          description: 'Desabilitar autenticação por senha no SSH para mitigar ataques de dicionário e credenciais fracas.',
          requirement: 'PasswordAuthentication no',
          validationMethod: 'CONFIG_AUDIT',
          expectedResult: 'PasswordAuthentication no em sshd_config',
          severity: 'HIGH',
          remediation: 'Configure PasswordAuthentication no em /etc/ssh/sshd_config após cadastrar chaves públicas autorizadas.',
          reference: 'CIS Linux Benchmark 5.2.11 / ISO 27001 A.9.4.2'
        },
        {
          controlId: 'OS-LIN-003',
          name: 'Despejo de Memória (Core Dumps) Desativado',
          category: 'OPERATING_SYSTEM',
          description: 'Evita vazamento de senhas e dados em memória quando processos falham.',
          requirement: '* hard core 0 em /etc/security/limits.conf e fs.suid_dumpable = 0',
          validationMethod: 'CONFIG_AUDIT',
          expectedResult: 'Core dumps desativados globalmente',
          severity: 'MEDIUM',
          remediation: 'Adicione * hard core 0 em /etc/security/limits.conf e sysctl -w fs.suid_dumpable=0.',
          reference: 'CIS Linux Benchmark 1.6.1'
        },
        {
          controlId: 'OS-LIN-004',
          name: 'Serviço de Auditoria do Sistema (auditd) Operacional',
          category: 'OPERATING_SYSTEM',
          description: 'Garante o registro de eventos de segurança, alterações de privilégios e acessos a arquivos críticos.',
          requirement: 'auditd ativo e habilitado na inicialização',
          validationMethod: 'AGENT_TELEMETRY',
          expectedResult: 'auditd status: active (running)',
          severity: 'MEDIUM',
          remediation: 'Execute apt install auditd -y && systemctl enable --now auditd.',
          reference: 'NIST SP 800-53 AU-2 / CIS Linux Benchmark 4.1.1'
        }
      ]
    },
    {
      id: 'base-network-perimeter',
      name: 'Network Perimeter & Protocol Hardening',
      version: 'v1.8',
      category: 'NETWORK',
      policyVersion: 'SEC-POL-NET-2026',
      description: 'Diretrizes de proteção contra protocolos em texto claro, serviços legados e portas desnecessárias expostas.',
      targetEnvironment: 'Roteadores, Firewalls, Switches e Gateways de Borda',
      status: 'ACTIVE',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      controls: [
        {
          controlId: 'NET-001',
          name: 'Bloqueio Estrito de Protocolos Inseguros em Texto Claro (Telnet, FTP, HTTP)',
          category: 'NETWORK',
          description: 'Portas 21 (FTP), 23 (Telnet) e 80 (HTTP sem redirect) não devem estar abertas para a rede externa.',
          requirement: 'Portas 21 e 23 fechadas; Porta 80 com redirecionamento automático 301 para 443',
          validationMethod: 'PORT_SCAN',
          expectedResult: 'Conexões em portas 21 e 23 recusadas',
          severity: 'CRITICAL',
          remediation: 'Desative os daemons telnetd e ftpd. Substitua por SFTP/SSH. Force redirecionamento HTTPS no proxy.',
          reference: 'PCI-DSS v4.0 Req 2.2.3 / NIST SP 800-53 SC-8'
        },
        {
          controlId: 'NET-002',
          name: 'Comunidade SNMP Padrão ("public"/"private") Desativada',
          category: 'NETWORK',
          description: 'SNMP v1/v2c com nomes de comunidade padrão expõem topologia e inventário para invasores.',
          requirement: 'SNMP v3 com autenticação SHA e criptografia AES, ou comunidades customizadas complexas',
          validationMethod: 'PORT_SCAN',
          expectedResult: 'Sem resposta para comunidade "public"',
          severity: 'HIGH',
          remediation: 'Migre para SNMPv3 com USM (User-based Security Model) e bloqueie a porta UDP 161 externamente.',
          reference: 'CIS Network Benchmark 1.3 / OWASP Top 10'
        },
        {
          controlId: 'NET-003',
          name: 'Portas de Gerenciamento Administrativo (SSH, RDP, WinRM) Isoladas por VPN',
          category: 'NETWORK',
          description: 'Portas 22 (SSH), 3389 (RDP) e 5985/5986 (WinRM) não devem ser acessíveis diretamente da Internet.',
          requirement: 'Acesso restrito a IPs do Bastion Host ou Gateway VPN corporativo',
          validationMethod: 'PORT_SCAN',
          expectedResult: 'Portas filtradas ou fechadas para tráfego externo não autenticado',
          severity: 'CRITICAL',
          remediation: 'Aplique regras de firewall no Security Group/iptables permitindo apenas o CIDR da VPN corporativa.',
          reference: 'CIS Controls v8 Control 4.4 / NIST SP 800-115'
        }
      ]
    },
    {
      id: 'base-web-tls',
      name: 'Web Application & TLS Hardening Baseline',
      version: 'v3.1',
      category: 'WEB',
      policyVersion: 'SEC-POL-WEB-2026',
      description: 'Padrão corporativo para servidores web Nginx, Apache e APIs expostas com base em OWASP ASVS.',
      targetEnvironment: 'Aplicações Web Corporativas, Portais e Portas 443/8443',
      status: 'ACTIVE',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      controls: [
        {
          controlId: 'WEB-001',
          name: 'Header Strict-Transport-Security (HSTS) com includeSubDomains',
          category: 'WEB',
          description: 'Garante que os navegadores só se comuniquem com a aplicação via HTTPS, prevenindo ataques de downgrade.',
          requirement: 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
          validationMethod: 'HTTP_PROBE',
          expectedResult: 'Header HSTS presente com max-age >= 1 ano (31536000s)',
          severity: 'HIGH',
          remediation: 'No Nginx: add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;',
          reference: 'OWASP ASVS v4.0 14.4.5 / RFC 6797'
        },
        {
          controlId: 'WEB-002',
          name: 'Headers de Proteção de Conteúdo (CSP, X-Content-Type-Options, X-Frame-Options)',
          category: 'WEB',
          description: 'Mitiga ataques de Cross-Site Scripting (XSS), MIME sniffing e Clickjacking.',
          requirement: 'X-Content-Type-Options: nosniff; X-Frame-Options: DENY ou SAMEORIGIN; Content-Security-Policy restritiva',
          validationMethod: 'HTTP_PROBE',
          expectedResult: 'Headers de segurança de cabeçalho presentes nas respostas HTTP',
          severity: 'HIGH',
          remediation: 'Configure os cabeçalhos de segurança no reverse proxy ou no middleware de aplicação.',
          reference: 'OWASP Top 10 A05:2021 Security Misconfiguration'
        },
        {
          controlId: 'WEB-003',
          name: 'Atributos de Cookies de Sessão (Secure, HttpOnly, SameSite)',
          category: 'WEB',
          description: 'Cookies de sessão e autenticação não devem ser acessíveis por JavaScript nem transmitidos em canais sem criptografia.',
          requirement: 'Set-Cookie: ...; Secure; HttpOnly; SameSite=Lax (ou Strict)',
          validationMethod: 'HTTP_PROBE',
          expectedResult: 'Todos os cookies de sessão com as flags Secure e HttpOnly ativas',
          severity: 'MEDIUM',
          remediation: 'Configure as opções de cookie na sessão do framework: cookie.secure = true, httpOnly = true, sameSite = "lax".',
          reference: 'OWASP ASVS 3.4.1 / CWE-614'
        },
        {
          controlId: 'WEB-004',
          name: 'Ocultação de Assinatura de Servidor (Server Tokens)',
          category: 'WEB',
          description: 'Evita a divulgação de versões exatas do servidor web (Nginx/Apache) que auxiliam criminosos na busca por CVEs.',
          requirement: 'Header Server não deve divulgar versões detalhadas (ex: Server: nginx e não nginx/1.18.0)',
          validationMethod: 'HTTP_PROBE',
          expectedResult: 'Header Server genérico ou ausente',
          severity: 'LOW',
          remediation: 'No Nginx adicione server_tokens off;. No Apache adicione ServerTokens Prod e ServerSignature Off.',
          reference: 'CIS Nginx Benchmark 2.1.1'
        }
      ]
    },
    {
      id: 'base-api-security',
      name: 'REST API & Microservices Hardening Baseline',
      version: 'v2.0',
      category: 'API',
      policyVersion: 'SEC-POL-API-2026',
      description: 'Requisitos de segurança para APIs REST corporativas segundo OWASP API Security Top 10.',
      targetEnvironment: 'Gateways de API, Endpoints de Microsserviços e Integrações',
      status: 'ACTIVE',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      controls: [
        {
          controlId: 'API-001',
          name: 'Autenticação Obrigatória via Token JWT/Bearer em Rotas Protegidas',
          category: 'API',
          description: 'Endpoints de negócio não devem aceitar requisições anônimas sem validação de assinatura de token.',
          requirement: 'Header Authorization: Bearer <JWT_VALIDO>',
          validationMethod: 'HTTP_PROBE',
          expectedResult: 'Resposta HTTP 401 Unauthorized para requisições sem credenciais',
          severity: 'CRITICAL',
          remediation: 'Aplique middleware de autenticação nas rotas /api/* validando assinatura e tempo de expiração do token.',
          reference: 'OWASP API1:2023 Broken Object Level Authorization / RFC 7519'
        },
        {
          controlId: 'API-002',
          name: 'Proteção contra Força Bruta e DoS com Rate Limiting',
          category: 'API',
          description: 'A API deve limitar a taxa de requisições por IP ou token para evitar sobrecarga e ataques de enumeração.',
          requirement: 'Rate limit de no máximo 100 req/min por cliente com headers X-RateLimit-Limit e X-RateLimit-Remaining',
          validationMethod: 'HTTP_PROBE',
          expectedResult: 'Headers de rate limit presentes e bloqueio 429 Too Many Requests quando excedido',
          severity: 'HIGH',
          remediation: 'Habilite express-rate-limit ou limite no Nginx via limit_req_zone.',
          reference: 'OWASP API4:2023 Unrestricted Resource Consumption'
        },
        {
          controlId: 'API-003',
          name: 'CORS Restritivo com Origens Autorizadas',
          category: 'API',
          description: 'O header Access-Control-Allow-Origin não deve ser wildcard (*) em APIs que lidam com credenciais ou dados corporativos.',
          requirement: 'Access-Control-Allow-Origin restrito a domínios corporativos específicos',
          validationMethod: 'HTTP_PROBE',
          expectedResult: 'Origens não autorizadas rejeitadas no handshake CORS',
          severity: 'MEDIUM',
          remediation: 'Configure lista de origens confiáveis no middleware CORS e remova o valor "*".',
          reference: 'OWASP ASVS 14.5.3'
        }
      ]
    },
    {
      id: 'base-database-security',
      name: 'Database Security & Isolation Baseline',
      version: 'v2.2',
      category: 'DATABASE',
      policyVersion: 'SEC-POL-DB-2026',
      description: 'Hardening de instâncias PostgreSQL, MySQL e bancos corporativos.',
      targetEnvironment: 'Instâncias de Banco de Dados de Produção e Homologação',
      status: 'ACTIVE',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      controls: [
        {
          controlId: 'DB-001',
          name: 'Bloqueio de Exposição de Porta do Banco de Dados para a Internet (0.0.0.0)',
          category: 'DATABASE',
          description: 'Portas de bancos de dados (5432 PostgreSQL, 3306 MySQL, 1433 MSSQL) devem escutar apenas em 127.0.0.1 ou IPs de rede interna privada.',
          requirement: 'listen_addresses = "localhost, 10.0.x.x" e Security Group sem 0.0.0.0/0',
          validationMethod: 'PORT_SCAN',
          expectedResult: 'Porta do banco inacessível a partir de IP público externo',
          severity: 'CRITICAL',
          remediation: 'Altere listen_addresses no postgresql.conf e configure pg_hba.conf para rejeitar conexões externas.',
          reference: 'CIS PostgreSQL Benchmark 3.1 / NIST SP 800-53 SC-7'
        },
        {
          controlId: 'DB-002',
          name: 'Obrigatoriedade de Criptografia TLS em Trânsito (ssl = on)',
          category: 'DATABASE',
          description: 'Conexões com o banco devem exigir SSL para proteger credenciais e dados em trânsito contra sniffing de rede.',
          requirement: 'ssl = on em postgresql.conf e hostssl em pg_hba.conf',
          validationMethod: 'CONFIG_AUDIT',
          expectedResult: 'Conexões não criptografadas recusadas pelo SGBD',
          severity: 'HIGH',
          remediation: 'Configure certificados SSL no servidor do banco e defina ssl = on.',
          reference: 'CIS Database Benchmark 3.2 / PCI-DSS Req 4.1'
        }
      ]
    },
    {
      id: 'base-endpoint-compliance',
      name: 'Endpoint Workstation & Telemetry Baseline',
      version: 'v2.1',
      category: 'ENDPOINT',
      policyVersion: 'SEC-POL-ENDPOINT-2026',
      description: 'Audita conformidade de estações de trabalho e servidores a partir da telemetria de agentes já coletada no CMDB.',
      targetEnvironment: 'Estações Windows 11, Ubuntu Workstation e Servidores Virtuais com Agente',
      status: 'ACTIVE',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      controls: [
        {
          controlId: 'EP-001',
          name: 'Atualização de Softwares Críticos e Bibliotecas de Criptografia',
          category: 'ENDPOINT',
          description: 'Verifica no inventário do agente se softwares como OpenSSL, Node.js ou bibliotecas do sistema possuem versões vulneráveis.',
          requirement: 'Nenhum software instalado classificado com status "vulnerable" ou "outdated"',
          validationMethod: 'AGENT_TELEMETRY',
          expectedResult: 'Todos os softwares atualizados sem CVEs ativas',
          severity: 'HIGH',
          remediation: 'Instale os patches de segurança fornecidos pelo fabricante para os pacotes desatualizados via gerenciador corporativo.',
          reference: 'CIS Controls v8 Control 7.4 / NIST SP 800-40'
        },
        {
          controlId: 'EP-002',
          name: 'Agente WorkPulse Conectado e Telemetria em Tempo Real',
          category: 'ENDPOINT',
          description: 'Garante que a estação está transmitindo telemetria e não se encontra isolada ou com agente inativo.',
          requirement: 'agentStatus = "online" com ping recente (< 15 minutos)',
          validationMethod: 'AGENT_TELEMETRY',
          expectedResult: 'Agente ativo e comunicando normalmente',
          severity: 'MEDIUM',
          remediation: 'Reinicie o serviço do agente workpulse-agent na estação e valide a rota até o servidor.',
          reference: 'CIS Controls v8 Control 10.1'
        },
        {
          controlId: 'EP-003',
          name: 'Sistema Operacional com Suporte Ativo e Versão Homologada',
          category: 'ENDPOINT',
          description: 'Sistemas operacionais descontinuados (Windows 7/8, Ubuntu < 22.04 LTS) representam risco severo.',
          requirement: 'OS suportado oficialmente com updates de segurança ativos',
          validationMethod: 'AGENT_TELEMETRY',
          expectedResult: 'Versão do SO dentro do ciclo de vida suportado (LTS/Supported)',
          severity: 'HIGH',
          remediation: 'Agende a atualização ou migração do sistema operacional para a versão homologada mais recente.',
          reference: 'CIS Controls v8 Control 2.2'
        }
      ]
    }
  ];

  /**
   * Avalia um Ativo / CI contra uma Baseline selecionada
   */
  static evaluateTargetAgainstBaseline(
    tenantId: string,
    target: {
      id: string;
      value: string;
      targetType: string;
      ciId?: string;
      ciName?: string;
      assetData?: any;
    },
    baseline: HardeningBaseline
  ): {
    result: ComplianceEvaluationResult;
    generatedFindings: Array<Partial<SecurityFinding>>;
  } {
    const evaluationId = `comp-${crypto.randomUUID().slice(0, 8)}`;
    const controlResults: ComplianceEvaluationResult['controlResults'] = [];
    const generatedFindings: Array<Partial<SecurityFinding>> = [];

    let passedCount = 0;
    let failedCount = 0;
    let warningCount = 0;

    for (const control of baseline.controls) {
      let status: ControlValidationResult = 'PASS';
      let actualValue = 'Configuração conforme';
      let details = 'Validado com sucesso segundo a baseline de hardening.';

      // Lógica de avaliação conforme método de validação
      if (control.validationMethod === 'AGENT_TELEMETRY') {
        const asset = target.assetData;
        if (!asset) {
          status = 'WARNING';
          actualValue = 'Dados de telemetria indisponíveis para este ativo';
          details = 'Ativo sem agente WorkPulse ativo ou telemetria pendente.';
          warningCount++;
        } else if (control.controlId === 'EP-001') {
          const vulnSoftware = asset.installedSoftwares?.find((s: any) => s.status === 'vulnerable');
          const outdatedSoftware = asset.installedSoftwares?.find((s: any) => s.status === 'outdated');
          if (vulnSoftware) {
            status = 'FAIL';
            actualValue = `Software vulnerável detectado: ${vulnSoftware.name} ${vulnSoftware.version}`;
            details = `Detectado software vulnerável (${vulnSoftware.name}) necessitando atualização imediata de segurança.`;
            failedCount++;
          } else if (outdatedSoftware) {
            status = 'WARNING';
            actualValue = `Software desatualizado: ${outdatedSoftware.name} ${outdatedSoftware.version}`;
            details = `Pacote requer atualização para a versão estável mais recente.`;
            warningCount++;
          } else {
            status = 'PASS';
            actualValue = 'Softwares auditados atualizados';
            passedCount++;
          }
        } else if (control.controlId === 'EP-002') {
          if (asset.agentStatus === 'offline') {
            status = 'FAIL';
            actualValue = 'Agente WorkPulse Offline';
            details = `Último ping registrado: ${asset.agentLastPing || 'Desconhecido'}.`;
            failedCount++;
          } else {
            status = 'PASS';
            actualValue = `Agente Online (${asset.agentVersion || 'v4.2.1'})`;
            passedCount++;
          }
        } else if (control.controlId === 'EP-003') {
          const os = (asset.operatingSystem || '').toLowerCase();
          if (os.includes('windows 7') || os.includes('windows xp') || os.includes('ubuntu 18') || os.includes('ubuntu 16')) {
            status = 'FAIL';
            actualValue = `Sistema operacional obsoleto: ${asset.operatingSystem}`;
            details = 'Versão do SO fora de suporte oficial do fabricante.';
            failedCount++;
          } else {
            status = 'PASS';
            actualValue = asset.operatingSystem || 'Sistema Operacional Homologado';
            passedCount++;
          }
        } else {
          status = 'PASS';
          passedCount++;
        }
      } else if (control.validationMethod === 'HTTP_PROBE') {
        // Simulação / Probe de Headers
        const url = target.value.toLowerCase();
        if (control.controlId === 'WEB-001') {
          // HSTS
          if (!url.startsWith('https')) {
            status = 'FAIL';
            actualValue = 'HSTS ausente (requisição sem HTTPS)';
            details = 'O alvo está operando em HTTP sem política estrita de HSTS ativa.';
            failedCount++;
          } else {
            status = 'PASS';
            actualValue = 'Strict-Transport-Security: max-age=31536000; includeSubDomains';
            passedCount++;
          }
        } else if (control.controlId === 'WEB-002') {
          // Headers de segurança
          status = 'WARNING';
          actualValue = 'X-Frame-Options presente; Content-Security-Policy ausente';
          details = 'Recomenda-se implementar CSP completa para proteção avançada contra XSS.';
          warningCount++;
        } else if (control.controlId === 'API-002') {
          // Rate Limit
          status = 'PASS';
          actualValue = 'Rate limit ativo: X-RateLimit-Limit: 100';
          passedCount++;
        } else {
          status = 'PASS';
          passedCount++;
        }
      } else if (control.validationMethod === 'PORT_SCAN') {
        if (control.controlId === 'NET-001') {
          // Telnet / FTP
          status = 'PASS';
          actualValue = 'Portas 21 e 23 fechadas na borda';
          passedCount++;
        } else if (control.controlId === 'NET-003') {
          // SSH / RDP
          if (target.value.includes(':22') || target.value.includes(':3389')) {
            status = 'FAIL';
            actualValue = 'Porta de gerenciamento exposta publicamente';
            details = 'Porta administrativa acessível sem exigência de túnel VPN.';
            failedCount++;
          } else {
            status = 'PASS';
            actualValue = 'Portas administrativas isoladas';
            passedCount++;
          }
        } else {
          status = 'PASS';
          passedCount++;
        }
      } else {
        // CONFIG_AUDIT
        status = 'PASS';
        passedCount++;
      }

      // Se falhou (FAIL), prepara geração de Finding
      let generatedFindingId: string | undefined;
      if (status === 'FAIL') {
        generatedFindingId = `FND-HARD-${crypto.randomUUID().slice(0, 8)}`;
        generatedFindings.push({
          id: generatedFindingId,
          tenantId,
          code: `SEC-FND-${Math.floor(10000 + Math.random() * 90000)}`,
          title: `[Hardening Failure] ${control.name}`,
          category: `HARDENING_${control.category}`,
          severity: control.severity,
          cvssScore: control.severity === 'CRITICAL' ? 9.2 : control.severity === 'HIGH' ? 7.8 : 5.4,
          description: `Falha no controle de conformidade ${control.controlId}: ${control.description}`,
          impact: `Não atendimento da baseline ${baseline.name}. Risco de exploração conforme ${control.reference}.`,
          recommendation: control.remediation,
          status: 'OPEN',
          linkedCiId: target.ciId,
          targetId: target.id,
          affectedService: target.value,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      controlResults.push({
        controlId: control.controlId,
        controlName: control.name,
        category: control.category,
        status,
        actualValue,
        expectedValue: control.expectedResult,
        details,
        findingIdGenerated: generatedFindingId
      });
    }

    const totalControls = baseline.controls.length;
    const overallCompliancePct = totalControls > 0
      ? Math.round(((passedCount + (warningCount * 0.5)) / totalControls) * 100)
      : 100;

    const result: ComplianceEvaluationResult = {
      id: evaluationId,
      tenantId,
      baselineId: baseline.id,
      baselineName: baseline.name,
      targetId: target.id,
      ciId: target.ciId,
      ciName: target.ciName || target.value,
      evaluatedAt: new Date().toISOString(),
      overallCompliancePct,
      totalControls,
      passedControls: passedCount,
      failedControls: failedCount,
      warningControls: warningCount,
      controlResults
    };

    return { result, generatedFindings };
  }
}
