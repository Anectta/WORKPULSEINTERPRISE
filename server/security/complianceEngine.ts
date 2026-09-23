import crypto from 'crypto';
import {
  ComplianceControl,
  ComplianceFrameworkCode,
  ComplianceControlStatus,
  EvidenceMatrixItem,
  SecurityFinding,
  SecurityEvidence,
  SecurityRemediation
} from '../../src/types/security';

export class ComplianceEngine {
  /**
   * Catálogo de Controles Padrão por Framework (OWASP, CIS, NIST, ISO 27001, Políticas Internas)
   */
  public static getInitialControls(): ComplianceControl[] {
    return [
      // 1. OWASP TOP 10 (2025/2026)
      {
        id: 'owasp-a01',
        frameworkCode: 'OWASP_TOP10',
        category: 'A01 - Broken Access Control',
        code: 'OWASP-A01',
        title: 'Controle de Acesso e Autorização de Endpoints',
        description: 'Impedir violações do princípio do menor privilégio e acesso não autorizado a recursos horizontais e verticais.',
        requirement: 'Todos os endpoints devem validar tokens JWT e autorização por RBAC no backend.',
        status: 'PARTIALLY_COMPLIANT',
        scoreWeight: 10,
        evidenceIds: [],
        linkedFindingIds: ['fnd-001'],
        linkedRemediationIds: [],
        gapDescription: 'Endpoints legados na API de autenticação sem validação de tenantId no token.',
        actionPlan: 'Implementar middleware de autorização obrigatório em todas as rotas da API.',
        assessedAt: new Date().toISOString(),
        lastAuditedBy: 'Equipe de Governança e Pentest'
      },
      {
        id: 'owasp-a02',
        frameworkCode: 'OWASP_TOP10',
        category: 'A02 - Cryptographic Failures',
        code: 'OWASP-A02',
        title: 'Criptografia em Trânsito e Repouso',
        description: 'Garantir uso de TLS 1.3 ou TLS 1.2 com ciphers seguros e chaves fortes.',
        requirement: 'Desabilitar TLS 1.0/1.1 e suites de criptografia fracas (RC4, 3DES, CBC).',
        status: 'NON_COMPLIANT',
        scoreWeight: 9,
        evidenceIds: [],
        linkedFindingIds: ['fnd-002'],
        linkedRemediationIds: [],
        gapDescription: 'Serviço web legado aceitando TLS 1.0 e certificado prestes a expirar.',
        actionPlan: 'Reconfigurar servidor web Nginx e renovar certificado Let\'s Encrypt com TLS 1.3 obrigatório.',
        assessedAt: new Date().toISOString(),
        lastAuditedBy: 'Auditoria SecOps'
      },
      {
        id: 'owasp-a05',
        frameworkCode: 'OWASP_TOP10',
        category: 'A05 - Security Misconfiguration',
        code: 'OWASP-A05',
        title: 'Cabeçalhos de Segurança HTTP e Hardening Web',
        description: 'Configuração adequada de cabeçalhos HSTS, CSP, X-Content-Type-Options e remoção de banners de versão.',
        requirement: 'Configurar HSTS mínimo 1 ano e Content-Security-Policy em todas as respostas HTTP.',
        status: 'NON_COMPLIANT',
        scoreWeight: 7,
        evidenceIds: [],
        linkedFindingIds: ['fnd-003'],
        linkedRemediationIds: [],
        gapDescription: 'Falta do cabeçalho HSTS e exposição de cabeçalho Server: Apache/2.4.41.',
        actionPlan: 'Aplicar baseline de hardening Web em todos os proxies reversos.',
        assessedAt: new Date().toISOString(),
        lastAuditedBy: 'Auditoria SecOps'
      },
      {
        id: 'owasp-a07',
        frameworkCode: 'OWASP_TOP10',
        category: 'A07 - Identification & Auth Failures',
        code: 'OWASP-A07',
        title: 'Proteção de Autenticação e MFA',
        description: 'Prevenção contra força bruta, preenchimento de credenciais e falta de MFA em contas administrativas.',
        requirement: 'Obrigatoriedade de MFA para administradores e limitação de taxa (Rate Limiting).',
        status: 'COMPLIANT',
        scoreWeight: 9,
        evidenceIds: [],
        linkedFindingIds: [],
        linkedRemediationIds: [],
        assessedAt: new Date().toISOString(),
        lastAuditedBy: 'Auditoria SecOps'
      },

      // 2. CIS CONTROLS V8
      {
        id: 'cis-c01',
        frameworkCode: 'CIS_CONTROLS_V8',
        category: 'CIS Control 1: Inventory of Enterprise Assets',
        code: 'CIS-01.1',
        title: 'Inventário Contínuo de Ativos Corporativos (CMDB)',
        description: 'Identificar e inventariar ativamente todos os dispositivos conectados à infraestrutura empresarial.',
        requirement: 'Todos os Configuration Items (CIs) devem estar cadastrados no CMDB com criticidade e dono atribuído.',
        status: 'COMPLIANT',
        scoreWeight: 10,
        evidenceIds: [],
        linkedFindingIds: [],
        linkedRemediationIds: [],
        assessedAt: new Date().toISOString(),
        lastAuditedBy: 'CMDB & Security Engine'
      },
      {
        id: 'cis-c04',
        frameworkCode: 'CIS_CONTROLS_V8',
        category: 'CIS Control 4: Secure Configuration',
        code: 'CIS-04.1',
        title: 'Processo de Configuração Segura (Hardening Baseline)',
        description: 'Manter processos documentados e automatizados de configuração segura para sistemas operacionais e rede.',
        requirement: 'Auditoria periódica de conformidade com os Baselines CIS do Linux e Windows.',
        status: 'PARTIALLY_COMPLIANT',
        scoreWeight: 8,
        evidenceIds: [],
        linkedFindingIds: ['fnd-003'],
        linkedRemediationIds: [],
        gapDescription: 'Servidores de banco de dados ainda não possuem script de hardening automatizado.',
        actionPlan: 'Executar playbook Ansible de baseline nos bancos de dados homologados.',
        assessedAt: new Date().toISOString(),
        lastAuditedBy: 'DevOps Sec'
      },
      {
        id: 'cis-c07',
        frameworkCode: 'CIS_CONTROLS_V8',
        category: 'CIS Control 7: Vulnerability Management',
        code: 'CIS-07.1',
        title: 'Gestão Contínua de Vulnerabilidades e Reteste',
        description: 'Executar varreduras periódicas de vulnerabilidades e retestes obrigatórios após aplicação de correções.',
        requirement: 'SLA de remediação rigoroso (24h Crítica, 72h Alta) com validação de reteste.',
        status: 'COMPLIANT',
        scoreWeight: 10,
        evidenceIds: [],
        linkedFindingIds: [],
        linkedRemediationIds: [],
        assessedAt: new Date().toISOString(),
        lastAuditedBy: 'CISO / Pentest Platform'
      },
      {
        id: 'cis-c08',
        frameworkCode: 'CIS_CONTROLS_V8',
        category: 'CIS Control 8: Audit Log Management',
        code: 'CIS-08.2',
        title: 'Trilha de Auditoria Criptografada (HMAC SHA-256)',
        description: 'Coletar, revisar e proteger logs de auditoria contra adulteração não autorizada.',
        requirement: 'Garantir integridade criptográfica de cada evento administrativo e de segurança.',
        status: 'COMPLIANT',
        scoreWeight: 9,
        evidenceIds: [],
        linkedFindingIds: [],
        linkedRemediationIds: [],
        assessedAt: new Date().toISOString(),
        lastAuditedBy: 'Security Engine'
      },

      // 3. NIST CYBERSECURITY FRAMEWORK (CSF 2.0 / SP 800-53)
      {
        id: 'nist-id-am',
        frameworkCode: 'NIST_CSF',
        category: 'IDENTIFY (ID.AM)',
        code: 'NIST-ID.AM-1',
        title: 'Gerenciamento de Superfície de Ataque e Ativos',
        description: 'Dispositivos físicos, sistemas e componentes de rede inventariados e classificados por risco.',
        requirement: 'Mapeamento contínuo de portas expostas e domínios no perímetro autorizado.',
        status: 'COMPLIANT',
        scoreWeight: 8,
        evidenceIds: [],
        linkedFindingIds: [],
        linkedRemediationIds: [],
        assessedAt: new Date().toISOString(),
        lastAuditedBy: 'Security Engine'
      },
      {
        id: 'nist-pr-ds',
        frameworkCode: 'NIST_CSF',
        category: 'PROTECT (PR.DS)',
        code: 'NIST-PR.DS-1',
        title: 'Segurança de Dados em Trânsito e Proteção de Segredos',
        description: 'Dados protegidos contra interceptação e proteção rigorosa de credenciais e tokens.',
        requirement: 'Sanitização de segredos em relatórios e bloqueio de protocolos em texto claro.',
        status: 'PARTIALLY_COMPLIANT',
        scoreWeight: 9,
        evidenceIds: [],
        linkedFindingIds: ['fnd-002'],
        linkedRemediationIds: [],
        gapDescription: 'Presença de serviço legado sem suporte a criptografia moderna.',
        actionPlan: 'Migração do tráfego para túnel VPN IPsec com TLS 1.3.',
        assessedAt: new Date().toISOString(),
        lastAuditedBy: 'Equipe de Redes'
      },
      {
        id: 'nist-de-cm',
        frameworkCode: 'NIST_CSF',
        category: 'DETECT (DE.CM)',
        code: 'NIST-DE.CM-1',
        title: 'Monitoramento Contínuo de Segurança e Detecção',
        description: 'A rede e ambiente físico são monitorados para detectar potenciais eventos de cibersegurança.',
        requirement: 'Varreduras ativas sob demanda e monitoramento em tempo real de execuções de pentest.',
        status: 'COMPLIANT',
        scoreWeight: 8,
        evidenceIds: [],
        linkedFindingIds: [],
        linkedRemediationIds: [],
        assessedAt: new Date().toISOString(),
        lastAuditedBy: 'Security Engine'
      },

      // 4. ISO/IEC 27001:2022
      {
        id: 'iso-a8-8',
        frameworkCode: 'ISO_27001',
        category: 'A.8 Controles Tecnológicos',
        code: 'ISO-A.8.8',
        title: 'Gestão de Vulnerabilidades Técnicas',
        description: 'Informações sobre vulnerabilidades técnicas dos sistemas de informação em uso devem ser obtidas em tempo oportuno.',
        requirement: 'Processo estabelecido para avaliar a exposição e adotar medidas de mitigação ou aceite formal de risco.',
        status: 'COMPLIANT',
        scoreWeight: 10,
        evidenceIds: [],
        linkedFindingIds: ['fnd-001'],
        linkedRemediationIds: [],
        assessedAt: new Date().toISOString(),
        lastAuditedBy: 'CISO'
      },
      {
        id: 'iso-a8-20',
        frameworkCode: 'ISO_27001',
        category: 'A.8 Controles Tecnológicos',
        code: 'ISO-A.8.20',
        title: 'Segurança de Redes e Serviços de Conexão',
        description: 'Redes devem ser controladas e gerenciadas para proteger as informações nos sistemas e aplicações.',
        requirement: 'Restrição de acesso a portas de gerenciamento e isolamento de ambientes produtivos.',
        status: 'PARTIALLY_COMPLIANT',
        scoreWeight: 8,
        evidenceIds: [],
        linkedFindingIds: ['fnd-003'],
        linkedRemediationIds: [],
        gapDescription: 'Portas de desenvolvimento acessíveis no segmento corporativo interno.',
        actionPlan: 'Aplicar regras de firewall de segmentação VLAN DMZ.',
        assessedAt: new Date().toISOString(),
        lastAuditedBy: 'Infraestrutura'
      },

      // 5. POLÍTICAS INTERNAS CORPORATIVAS
      {
        id: 'pol-escopo-mandatorio',
        frameworkCode: 'INTERNAL_POLICIES',
        category: 'Governança & Termos de Uso',
        code: 'SEC-POL-01',
        title: 'Termo de Autorização e Escopo Mandatório',
        description: 'Nenhum teste de segurança ou varredura de portas pode ser disparado sem termo de escopo assinado pelo CISO/Dono do Ativo.',
        requirement: 'Validação criptográfica de escopo e verificação de RFC 1918 / IP público antes de qualquer ação.',
        status: 'COMPLIANT',
        scoreWeight: 10,
        evidenceIds: [],
        linkedFindingIds: [],
        linkedRemediationIds: [],
        assessedAt: new Date().toISOString(),
        lastAuditedBy: 'Control Plane'
      },
      {
        id: 'pol-kill-switch',
        frameworkCode: 'INTERNAL_POLICIES',
        category: 'Operação Segura',
        code: 'SEC-POL-02',
        title: 'Mecanismo de Interrupção de Emergência (Kill-Switch)',
        description: 'Capacidade imediata de abortar qualquer teste em menos de 1 segundo em caso de degradação do ambiente.',
        requirement: 'Painel de controle com botão de parada de emergência e canais de contato ativo.',
        status: 'COMPLIANT',
        scoreWeight: 9,
        evidenceIds: [],
        linkedFindingIds: [],
        linkedRemediationIds: [],
        assessedAt: new Date().toISOString(),
        lastAuditedBy: 'Control Plane'
      }
    ];
  }

  /**
   * Constrói a Matriz de Evidências (Control → Evidence → Finding → Remediation)
   */
  public static buildEvidenceMatrix(
    controls: ComplianceControl[],
    findings: SecurityFinding[],
    evidenceList: SecurityEvidence[],
    remediations: SecurityRemediation[]
  ): EvidenceMatrixItem[] {
    return controls.map(control => {
      // Achados vinculados a este controle
      const linkedFindings = findings.filter(f => 
        control.linkedFindingIds?.includes(f.id) ||
        (f.cveId && control.description.includes(f.cveId)) ||
        (f.severity === 'CRITICAL' && control.code === 'OWASP-A01')
      );

      // Evidências vinculadas
      const linkedEvidences = evidenceList.filter(e => 
        control.evidenceIds?.includes(e.id) ||
        linkedFindings.some(f => f.id === e.findingId)
      );

      // Remediações abertas/pendentes
      const linkedRemediations = remediations.filter(r => 
        control.linkedRemediationIds?.includes(r.id) ||
        linkedFindings.some(f => f.id === r.findingId)
      );
      const openRemediations = linkedRemediations.filter(r => r.status !== 'VERIFIED' && r.status !== 'COMPLETED' && r.status !== 'ACCEPTED_RISK');

      // Verifica se há evidências com mais de 90 dias
      const now = new Date().getTime();
      const hasExpiredEvidence = linkedEvidences.some(e => {
        const ageDays = (now - new Date(e.collectedAt).getTime()) / (1000 * 3600 * 24);
        return ageDays > 90;
      });

      const hasGap = control.status === 'NON_COMPLIANT' || control.status === 'PARTIALLY_COMPLIANT' || linkedFindings.some(f => f.status === 'OPEN' || f.status === 'NEW');

      return {
        controlId: control.id,
        controlCode: control.code,
        framework: control.frameworkCode,
        title: control.title,
        status: control.status,
        evidenceCount: linkedEvidences.length,
        findingsCount: linkedFindings.length,
        openRemediationsCount: openRemediations.length,
        lastEvidenceDate: linkedEvidences[0]?.collectedAt || control.assessedAt,
        isExpiredEvidence: hasExpiredEvidence,
        gapIdentified: hasGap
      };
    });
  }

  /**
   * Recalcula scores de compliance agregados por Framework
   */
  public static calculateFrameworkCompliance(controls: ComplianceControl[]) {
    const frameworks: ComplianceFrameworkCode[] = [
      'OWASP_TOP10',
      'CIS_CONTROLS_V8',
      'NIST_CSF',
      'ISO_27001',
      'INTERNAL_POLICIES'
    ];

    const frameworkLabels: Record<ComplianceFrameworkCode, string> = {
      OWASP_TOP10: 'OWASP Top 10 (2025/2026)',
      CIS_CONTROLS_V8: 'CIS Controls v8',
      NIST_CSF: 'NIST CSF 2.0 / SP 800-53',
      ISO_27001: 'ISO/IEC 27001:2022',
      INTERNAL_POLICIES: 'Políticas Internas Corporativas'
    };

    let totalWeight = 0;
    let earnedWeight = 0;

    const frameworkScores = frameworks.map(code => {
      const fControls = controls.filter(c => c.frameworkCode === code);
      if (fControls.length === 0) {
        return {
          framework: frameworkLabels[code],
          code,
          compliantPct: 100,
          passed: 0,
          total: 0
        };
      }

      let fWeight = 0;
      let fEarned = 0;
      let passedCount = 0;

      fControls.forEach(c => {
        fWeight += c.scoreWeight;
        if (c.status === 'COMPLIANT') {
          fEarned += c.scoreWeight;
          passedCount++;
        } else if (c.status === 'PARTIALLY_COMPLIANT') {
          fEarned += c.scoreWeight * 0.5;
        }
      });

      totalWeight += fWeight;
      earnedWeight += fEarned;

      const compliantPct = fWeight > 0 ? Math.round((fEarned / fWeight) * 100) : 100;

      return {
        framework: frameworkLabels[code],
        code,
        compliantPct,
        passed: passedCount,
        total: fControls.length
      };
    });

    const overallCompliancePct = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 100;

    return {
      overallCompliancePct,
      frameworkScores
    };
  }
}
