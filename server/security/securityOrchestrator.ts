import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  SecurityScope,
  SecurityPolicy,
  SecurityTarget,
  SecurityScan,
  SecurityFinding,
  SecurityEvidence,
  SecurityExecution,
  SecurityAuditLog,
  SecurityRetest,
  SecurityDashboardMetrics,
  FindingStatus,
  SecurityRemediation,
  RemediationStep,
  AcceptedRiskRecord,
  RiskException,
  RetestComparison,
  ComplianceEvaluationResult,
  RiskScoreHistoryItem,
  HardeningBaseline,
  RemediationStatus,
  RemediationPriority,
  RetestResult,
  SecurityReport,
  SecurityReportType,
  ReportShareToken,
  ScheduledReport,
  ComplianceControl,
  EvidenceMatrixItem,
  SecurityScoreHistory,
  SecurityAlertRule,
  ExecutiveDashboardData,
  PentestProject
} from '../../src/types/security';
import { PentestControlPlane } from './pentestControlPlane';
import { TargetValidator } from './targetValidator';
import { FindingProcessor } from './findingProcessor';
import { SecurityEngine } from './securityEngine';
import { RemediationEngine } from './remediationEngine';
import { HardeningEngine } from './hardeningEngine';
import { RetestEngine } from './retestEngine';
import { ComplianceEngine } from './complianceEngine';
import { ReportEngine } from './reportEngine';

const PERSISTED_FILE = path.join(process.cwd(), 'src', 'data', 'security_persisted.json');

interface SecurityStoreData {
  scopes: SecurityScope[];
  policies: SecurityPolicy[];
  targets: SecurityTarget[];
  scans: SecurityScan[];
  findings: SecurityFinding[];
  evidence: SecurityEvidence[];
  retests: SecurityRetest[];
  auditLogs: SecurityAuditLog[];
  remediations: SecurityRemediation[];
  acceptedRisks: AcceptedRiskRecord[];
  riskExceptions: RiskException[];
  retestComparisons: RetestComparison[];
  complianceEvaluations: ComplianceEvaluationResult[];
  riskHistories: RiskScoreHistoryItem[];
  reports: SecurityReport[];
  complianceControls: ComplianceControl[];
  securityScoreHistory: SecurityScoreHistory[];
  scheduledReports: ScheduledReport[];
  alertRules: SecurityAlertRule[];
  shareTokens: ReportShareToken[];
}

export class SecurityOrchestrator {
  private static store: SecurityStoreData = SecurityOrchestrator.loadStore();
  private static activeJobs: Map<string, { isAborted: boolean; currentStep: string; progressPct: number }> = new Map();
  private static findingCounter = 100;

  private static loadStore(): SecurityStoreData {
    try {
      if (fs.existsSync(PERSISTED_FILE)) {
        const raw = fs.readFileSync(PERSISTED_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          scopes: parsed.scopes || [],
          policies: parsed.policies || [],
          targets: parsed.targets || [],
          scans: parsed.scans || [],
          findings: parsed.findings || [],
          evidence: parsed.evidence || [],
          retests: parsed.retests || [],
          auditLogs: parsed.auditLogs || [],
          remediations: parsed.remediations || [],
          acceptedRisks: parsed.acceptedRisks || [],
          riskExceptions: parsed.riskExceptions || [],
          retestComparisons: parsed.retestComparisons || [],
          complianceEvaluations: parsed.complianceEvaluations || [],
          riskHistories: parsed.riskHistories || [],
          reports: parsed.reports || [],
          complianceControls: parsed.complianceControls && parsed.complianceControls.length > 0 ? parsed.complianceControls : ComplianceEngine.getInitialControls(),
          securityScoreHistory: parsed.securityScoreHistory || [],
          scheduledReports: parsed.scheduledReports || [],
          alertRules: parsed.alertRules || [],
          shareTokens: parsed.shareTokens || []
        };
      }
    } catch (e) {
      console.error('Falha ao ler security_persisted.json, iniciando com dados padrão.', e);
    }
    const initial = SecurityOrchestrator.seedInitialData();
    SecurityOrchestrator.saveStore(initial);
    return initial;
  }

  private static saveStore(data?: any) {
    try {
      let existing: any = {};
      if (fs.existsSync(PERSISTED_FILE)) {
        try {
          existing = JSON.parse(fs.readFileSync(PERSISTED_FILE, 'utf-8'));
        } catch (e) {}
      }
      const toSave = {
        ...existing,
        scopes: this.store.scopes,
        policies: this.store.policies,
        targets: this.store.targets,
        scans: this.store.scans,
        findings: this.store.findings,
        evidence: this.store.evidence,
        retests: this.store.retests,
        auditLogs: this.store.auditLogs,
        remediations: this.store.remediations,
        acceptedRisks: this.store.acceptedRisks,
        riskExceptions: this.store.riskExceptions,
        retestComparisons: this.store.retestComparisons,
        complianceEvaluations: this.store.complianceEvaluations,
        riskHistories: this.store.riskHistories,
        reports: this.store.reports,
        complianceControls: this.store.complianceControls,
        securityScoreHistory: this.store.securityScoreHistory,
        scheduledReports: this.store.scheduledReports,
        alertRules: this.store.alertRules,
        shareTokens: this.store.shareTokens,
        pentestProjects: existing.pentestProjects || [],
        authorizations: existing.authorizations || [],
        rulesOfEngagement: existing.rulesOfEngagement || [],
        testProfiles: existing.testProfiles || [],
        executionPlans: existing.executionPlans || []
      };
      fs.mkdirSync(path.dirname(PERSISTED_FILE), { recursive: true });
      fs.writeFileSync(PERSISTED_FILE, JSON.stringify(toSave, null, 2), 'utf-8');
    } catch (e) {
      console.error('Erro ao persistir dados de segurança:', e);
    }
  }

  private static seedInitialData(): SecurityStoreData {
    const tenantId = 'tenant-demo';
    const scopeId = 'scope-dmz-erp-01';
    const policyId = 'pol-standard-safe';

    const scopes: SecurityScope[] = [
      {
        id: scopeId,
        tenantId,
        name: 'Escopo Corporativo DMZ & ERP Matriz',
        description: 'Auditoria de segurança autorizada para servidores de aplicação ERP e perímetro web',
        authorizedByUserId: 'usr-ciso-01',
        authorizedByName: 'Dra. Helena Valente (CISO Corporativo)',
        authorizedByEmail: 'ciso@empresaabc.com.br',
        authorizedAt: '2026-09-01T09:00:00.000Z',
        validFrom: '2026-09-01T00:00:00.000Z',
        validUntil: '2026-12-31T23:59:59.000Z',
        authorizationTermsVersion: 'v2.1',
        authorizationDocumentHash: '8f4e2a7b1c3d9e0f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f',
        authorizedIpOrigin: '192.168.1.15',
        status: 'ACTIVE',
        createdAt: '2026-09-01T08:45:00.000Z',
        updatedAt: '2026-09-01T09:00:00.000Z',
        createdBy: 'usr-ciso-01'
      }
    ];

    const policies: SecurityPolicy[] = [
      {
        id: policyId,
        tenantId,
        name: 'Política Padrão Não-Destrutiva (Safe Mode)',
        description: 'Varreduras passivas com rate-limit estrito de 5 req/s e timeout de 4000ms',
        maxRequestsPerSecond: 5,
        maxConcurrentTargets: 2,
        allowedTimeWindows: {
          weekdays: ['20:00-06:00'],
          weekends: ['all']
        },
        connectionTimeoutMs: 4000,
        safeModeOnly: true,
        userAgentOverride: 'WorkPulse-SecurityEngine/2.0',
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z'
      }
    ];

    const targets: SecurityTarget[] = [
      {
        id: 'tgt-erp-01',
        scopeId,
        tenantId,
        targetType: 'ASSET_CI',
        targetValue: '192.168.1.10',
        isInScope: true,
        linkedCiId: 'ci-srv-erp',
        linkedAssetId: 'PAT-2026-1002',
        criticality: 'CRITICA',
        validationStatus: 'VALIDATED_DNS',
        resolvedIps: ['192.168.1.10'],
        notes: 'Servidor de Aplicação ERP Totvs Protheus',
        createdAt: '2026-09-01T09:10:00.000Z',
        updatedAt: '2026-09-01T09:10:00.000Z'
      },
      {
        id: 'tgt-web-01',
        scopeId,
        tenantId,
        targetType: 'WEB_URL',
        targetValue: 'https://ais-dev-j5xfxvq46npqvw5wbs7pnc-660100840056.us-west2.run.app',
        isInScope: true,
        linkedCiId: 'ci-router',
        criticality: 'ALTA',
        validationStatus: 'VALIDATED_DNS',
        notes: 'Portal Web Oficial WorkPulse',
        createdAt: '2026-09-01T09:12:00.000Z',
        updatedAt: '2026-09-01T09:12:00.000Z'
      }
    ];

    const scans: SecurityScan[] = [
      {
        id: 'scn-baseline-001',
        tenantId,
        code: 'SCN-2026-0001',
        title: 'Varredura Inicial de Linha de Base (Baseline DMZ)',
        scanType: 'ASSET_BASELINE',
        scopeId,
        policyId,
        status: 'COMPLETED',
        triggeredByUserId: 'usr-tech-01',
        triggeredByName: 'Carlos Amorim (Analista SecOps)',
        startedAt: '2026-09-05T14:00:00.000Z',
        finishedAt: '2026-09-05T14:02:15.000Z',
        findingsCountSummary: {
          critical: 0,
          high: 2,
          medium: 2,
          low: 1,
          info: 1
        },
        createdAt: '2026-09-05T13:58:00.000Z',
        updatedAt: '2026-09-05T14:02:15.000Z'
      }
    ];

    const findings: SecurityFinding[] = [
      {
        id: 'fnd-001',
        tenantId,
        code: 'SEC-FND-00001',
        scanId: 'scn-baseline-001',
        linkedCiId: 'ci-srv-erp',
        linkedAssetId: 'PAT-2026-1002',
        title: 'OpenSSL 1.1.1k Desatualizado com Vulnerabilidade de DoS Remoto',
        category: 'OUTDATED_SOFTWARE',
        severity: 'HIGH',
        cvssScore: 7.5,
        cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H',
        cveId: 'CVE-2022-0778',
        cweId: 'CWE-835',
        affectedService: 'OpenSSL Cryptographic Library',
        description: 'A versão 1.1.1k do OpenSSL identificada no servidor ERP é vulnerável a loop infinito no parsing de certificados.',
        impact: 'Negação de serviço remota no faturamento da empresa.',
        recommendation: 'Atualizar os pacotes do Linux para OpenSSL 1.1.1n ou superior.',
        status: 'IN_REMEDIATION',
        assignedToUserId: 'usr-tech-01',
        assignedToName: 'Carlos Amorim',
        remediationDeadline: '2026-09-20T23:59:59.000Z',
        ticketLinkId: 'tkt-cmdb-001',
        riskScoreContribution: 7.5,
        createdAt: '2026-09-05T14:01:00.000Z',
        updatedAt: '2026-09-05T14:01:00.000Z',
        createdBy: 'SecurityEngine/VulnCorrelation'
      },
      {
        id: 'fnd-002',
        tenantId,
        code: 'SEC-FND-00002',
        scanId: 'scn-baseline-001',
        linkedCiId: 'ci-srv-erp',
        title: 'Porta de Gerenciamento RDP (3389) Aberta',
        category: 'EXPOSED_PORT',
        severity: 'HIGH',
        cvssScore: 7.3,
        affectedService: 'Microsoft Remote Desktop / TCP 3389',
        description: 'Serviço de desktop remoto exposto na rede interna sem isolamento por VPN.',
        impact: 'Ataques de força bruta e escalação de privilégios no domínio.',
        recommendation: 'Bloquear porta 3389 no firewall perimetral e exigir VPN com MFA.',
        status: 'NEW',
        riskScoreContribution: 7.3,
        createdAt: '2026-09-05T14:01:30.000Z',
        updatedAt: '2026-09-05T14:01:30.000Z',
        createdBy: 'SecurityEngine/PortProbe'
      },
      {
        id: 'fnd-003',
        tenantId,
        code: 'SEC-FND-00003',
        scanId: 'scn-baseline-001',
        linkedCiId: 'ci-router',
        title: 'Ausência de Content-Security-Policy (CSP)',
        category: 'INSECURE_HEADER',
        severity: 'MEDIUM',
        cvssScore: 5.4,
        cweId: 'CWE-1021',
        affectedService: 'HTTP/HTTPS Web Service',
        affectedUrl: 'https://ais-dev-j5xfxvq46npqvw5wbs7pnc-660100840056.us-west2.run.app',
        description: 'O cabeçalho Content-Security-Policy não está configurado na aplicação web.',
        impact: 'Aumento da suscetibilidade a XSS e injeção de dados maliciosos.',
        recommendation: "Configurar CSP com 'default-src 'self''.",
        status: 'NEW',
        riskScoreContribution: 3.24,
        createdAt: '2026-09-05T14:02:00.000Z',
        updatedAt: '2026-09-05T14:02:00.000Z',
        createdBy: 'SecurityEngine/WebAudit'
      }
    ];

    const evidence: SecurityEvidence[] = [
      {
        id: 'evi-001',
        findingId: 'fnd-001',
        tenantId,
        title: 'Diferença de Versão de Pacote Vulnerável',
        evidenceType: 'AGENT_DIFF',
        rawPayload: 'Package: openssl\nDetected Version: 1.1.1k-1ubuntu2.1\nFix Version: 1.1.1n-0ubuntu0.18.04.1\nCVE: CVE-2022-0778',
        payloadSha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
        sanitizedSensitiveData: true,
        collectedAt: '2026-09-05T14:01:00.000Z',
        collectedBy: 'SecurityEngine/VulnCorrelation'
      }
    ];

    const auditLogs: SecurityAuditLog[] = [
      {
        id: 'aud-001',
        tenantId,
        actorUserId: 'usr-ciso-01',
        actorName: 'Dra. Helena Valente',
        actorEmail: 'ciso@empresaabc.com.br',
        actorRole: 'ADMIN',
        action: 'SCOPE_AUTHORIZED',
        entityType: 'SECURITY_SCOPE',
        entityId: scopeId,
        ipOrigin: '192.168.1.15',
        auditHmacSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        createdAt: '2026-09-01T09:00:00.000Z'
      },
      {
        id: 'aud-002',
        tenantId,
        actorUserId: 'usr-tech-01',
        actorName: 'Carlos Amorim',
        actorEmail: 'carlos@empresaabc.com.br',
        actorRole: 'TECHNICIAN',
        action: 'SCAN_COMPLETED',
        entityType: 'SECURITY_SCAN',
        entityId: 'scn-baseline-001',
        ipOrigin: '192.168.1.101',
        auditHmacSha256: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
        createdAt: '2026-09-05T14:02:15.000Z'
      }
    ];

    const remediations: SecurityRemediation[] = [
      {
        id: 'rem-001',
        tenantId,
        findingId: 'fnd-001',
        findingCode: 'SEC-FND-00001',
        ciId: 'ci-srv-erp',
        ciName: 'Servidor ERP Principal',
        title: 'Atualização e Isolamento da Biblioteca OpenSSL',
        description: 'Vulnerabilidade no OpenSSL 1.1.1k requer atualização imediata para 1.1.1n ou mitigação em runtime.',
        recommendation: 'Atualizar os pacotes do Linux para OpenSSL 1.1.1n ou superior.',
        priority: 'CRITICAL',
        priorityJustification: 'Prioridade CRITICAL (Score ponderado: 85/100): Severidade HIGH, CVSS 7.5, Ativo de Infraestrutura Crítica (ci-srv-erp), Exposição em DMZ.',
        status: 'IN_PROGRESS',
        owner: {
          userId: 'usr-tech-01',
          userName: 'Carlos Amorim',
          userEmail: 'carlos@empresaabc.com.br'
        },
        dueDate: '2026-09-20T23:59:59.000Z',
        slaHours: 24,
        slaBreached: false,
        ticketId: 'tkt-cmdb-001',
        ticketCode: '#1042',
        steps: RemediationEngine.buildDefaultPlanSteps(findings[0], 'Carlos Amorim', 'carlos@empresaabc.com.br'),
        createdBy: {
          userId: 'usr-tech-01',
          userName: 'Carlos Amorim',
          userEmail: 'carlos@empresaabc.com.br'
        },
        createdAt: '2026-09-05T14:05:00.000Z',
        updatedAt: '2026-09-05T14:05:00.000Z'
      }
    ];

    const acceptedRisks: AcceptedRiskRecord[] = [
      {
        id: 'acc-001',
        tenantId,
        findingId: 'fnd-003',
        findingCode: 'SEC-FND-00003',
        justification: 'Sistema legado em migração para nova versão prevista para Q4 2026. A injeção de CSP estrito quebrava iframes de relatórios legados.',
        businessImpactJustification: 'Indisponibilidade imediata de geração de relatórios de faturamento se a CSP for forçada sem reescrita de frontend.',
        responsible: {
          userId: 'usr-tech-01',
          userName: 'Carlos Amorim',
          userEmail: 'carlos@empresaabc.com.br',
          role: 'Lead Architect'
        },
        approvedBy: {
          userId: 'usr-ciso-01',
          userName: 'Dra. Helena Valente',
          userEmail: 'ciso@empresaabc.com.br',
          role: 'CISO Corporativo',
          approvedAt: '2026-09-06T10:00:00.000Z'
        },
        acceptedAt: '2026-09-06T10:00:00.000Z',
        validUntil: '2026-12-06T23:59:59.000Z',
        reviewDate: '2026-11-15T00:00:00.000Z',
        status: 'ACTIVE',
        compensatoryControls: [
          'WAF ativo bloqueando payloads de injeção XSS nas rotas de relatórios',
          'Sessão com cookies HttpOnly e SameSite=Strict'
        ]
      }
    ];

    const initialReports: SecurityReport[] = [
      {
        id: 'rep-pnt-demo-01',
        tenantId,
        type: 'PENTEST',
        title: 'Relatório Técnico e Executivo de Pentest • Projeto Matriz ERP',
        description: 'Avaliação de segurança ofensiva autorizada e testes de intrusão baseados na metodologia OWASP_WSTG.',
        projectId: 'pnt-proj-01',
        pentestId: 'pnt-proj-01',
        periodStart: '2026-09-01T09:00:00.000Z',
        periodEnd: '2026-09-08T18:00:00.000Z',
        generatedBy: {
          userId: 'usr-tech-01',
          userName: 'Carlos Amorim',
          userEmail: 'carlos@empresaabc.com.br',
          userRole: 'Lead Pentester'
        },
        generatedAt: '2026-09-08T18:30:00.000Z',
        status: 'GENERATED',
        version: '1.0.0',
        confidentialityLevel: 'CONFIDENTIAL',
        sections: [
          '1. Identificação do Projeto & Termo de Escopo',
          '2. Sumário Executivo & Classificação de Riscos',
          '3. Escopo Autorizado & Limitações Técnicas',
          '4. Metodologia de Avaliação & Perfis de Teste',
          '5. Descobertas Técnicas & Vetores de Vulnerabilidade',
          '6. Plano de Remediação & SLAs de Resolução',
          '7. Ciclo de Reteste & Redução Comprovada de Risco',
          '8. Conclusão & Declaração de Postura de Segurança'
        ],
        executiveSummary: {
          overallRiskLevel: 'HIGH',
          securityScore: 78,
          riskScore: 22,
          criticalFindingsCount: 0,
          highFindingsCount: 2,
          summaryText: 'Avaliação conduzida com sucesso no ambiente ERP e portal web. Identificadas 3 vulnerabilidades (2 Altas e 1 Média). Planos de remediação em andamento e 1 vulnerabilidade neutralizada após reteste.',
          keyRecommendations: [
            'Aplicar atualização emergencial do OpenSSL 1.1.1k nos servidores Linux.',
            'Adicionar cabeçalho HSTS e desabilitar suites de cifras TLS 1.0 no proxy reverso.',
            'Executar reteste de validação automatizado.'
          ]
        },
        scopeSummary: {
          authorizedTargets: ['192.168.1.10 (ASSET_CI)', 'https://ais-dev-j5xfxvq46npqvw5wbs7pnc-660100840056.us-west2.run.app (WEB_URL)'],
          testedTargets: ['192.168.1.10', 'https://ais-dev-j5xfxvq46npqvw5wbs7pnc-660100840056.us-west2.run.app'],
          untestedTargets: [],
          limitations: ['Sem testes volumétricos DDoS; limites de taxa de 5 rps respeitados rigorosamente.']
        },
        methodologySummary: {
          framework: 'OWASP_WSTG',
          profiles: ['OWASP WSTG v4.2', 'PTES Standard'],
          categories: ['Network Scanning', 'Web Application Security', 'Configuration Audit'],
          testsExecuted: 42,
          limitations: ['Engenharia social fora do escopo']
        },
        findingsSummary: [
          {
            id: 'fnd-001',
            code: 'SEC-FND-00001',
            title: 'Biblioteca OpenSSL Desatualizada (CVE-2021-3711)',
            description: 'Buffer overflow em SM2 decryption pode levar a execução remota de código.',
            severity: 'HIGH',
            cvssScore: 7.5,
            confidence: 'CONFIRMED',
            riskScore: 22,
            assetName: 'Servidor ERP Principal',
            ciName: 'ci-srv-erp',
            targetValue: '192.168.1.10',
            evidenceSummary: 'OpenSSL 1.1.1k detectado na porta 443.',
            recommendation: 'Atualizar para OpenSSL 1.1.1n ou superior.',
            status: 'OPEN',
            remediation: {
              responsible: 'Carlos Amorim',
              status: 'IN_PROGRESS',
              dueDate: '2026-09-20T23:59:59.000Z',
              ticketCode: '#1042'
            }
          },
          {
            id: 'fnd-002',
            code: 'SEC-FND-00002',
            title: 'Protocolo TLS 1.0 Habilitado e Ciphers Fracos',
            description: 'Negociação com protocolo TLS 1.0 obsoleto sujeita a ataques BEAST e POODLE.',
            severity: 'HIGH',
            cvssScore: 7.4,
            confidence: 'CONFIRMED',
            riskScore: 20,
            assetName: 'Gateway Web DMZ',
            ciName: 'ci-router',
            targetValue: 'https://ais-dev-j5xfxvq46npqvw5wbs7pnc-660100840056.us-west2.run.app',
            evidenceSummary: 'TLS 1.0 aceito na porta 443.',
            recommendation: 'Desabilitar TLS 1.0 e 1.1 no nginx.conf.',
            status: 'OPEN'
          }
        ],
        complianceSummary: {
          overallCompliancePct: 82,
          frameworkAssessments: [
            { framework: 'OWASP Top 10 (2025/2026)', compliantPct: 75, passedControls: 3, totalControls: 4 },
            { framework: 'CIS Controls v8', compliantPct: 88, passedControls: 3, totalControls: 4 },
            { framework: 'NIST CSF 2.0', compliantPct: 85, passedControls: 2, totalControls: 3 },
            { framework: 'ISO/IEC 27001:2022', compliantPct: 80, passedControls: 1, totalControls: 2 },
            { framework: 'Políticas Internas', compliantPct: 100, passedControls: 2, totalControls: 2 }
          ]
        },
        remediationSummary: {
          fixRatePct: 33,
          mttrDays: 5.4,
          slaCompliantCount: 1,
          slaBreachedCount: 0,
          activePlansCount: 1
        },
        conclusionText: 'O ambiente avaliado apresenta boa resiliência básica, necessitando de ajustes pontuais de hardening em proxies e atualização de pacotes no servidor ERP.'
      },
      {
        id: 'rep-exec-demo-01',
        tenantId,
        type: 'EXECUTIVE',
        title: 'Relatório Executivo Mensal de Segurança Cibernética • Diretoria',
        description: 'Painel executivo com visão estratégica, Security Score e KPIs de remediação para tomadores de decisão.',
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-09-08T23:59:59.000Z',
        generatedBy: {
          userId: 'usr-ciso-01',
          userName: 'Dra. Helena Valente',
          userEmail: 'ciso@empresaabc.com.br',
          userRole: 'CISO Corporativo'
        },
        generatedAt: '2026-09-09T10:00:00.000Z',
        status: 'GENERATED',
        version: '1.0.0',
        confidentialityLevel: 'CONFIDENTIAL',
        sections: [
          'Resumo Estratégico para a Diretoria',
          'Security Score & Nível de Risco Global',
          'Vulnerabilidades Críticas & Distribuição de Riscos',
          'Eficácia de Remediação & Cumprimento de SLAs',
          'Aderência a Frameworks de Conformidade',
          'Principais Riscos e Ativos Críticos em Destaque',
          'Plano de Ação Estratégico'
        ],
        executiveSummary: {
          overallRiskLevel: 'LOW',
          securityScore: 84,
          riskScore: 16,
          criticalFindingsCount: 0,
          highFindingsCount: 2,
          summaryText: 'A postura de segurança da organização avançou 12 pontos no último ciclo mensal. O Security Score corporativo atual é de 84/100 (Conceito B+), sem vulnerabilidades críticas ativas no perímetro de produção.',
          keyRecommendations: [
            'Manter alocação de esforço em remediações com SLA de até 72 horas para achados de severidade Alta.',
            'Concluir o rollout do baseline de hardening no parque de servidores de banco de dados.',
            'Prosseguir com o agendamento de relatórios semanais para acompanhamento do comitê executivo.'
          ]
        },
        complianceSummary: {
          overallCompliancePct: 82,
          frameworkAssessments: [
            { framework: 'OWASP Top 10', compliantPct: 75, passedControls: 3, totalControls: 4 },
            { framework: 'CIS Controls v8', compliantPct: 88, passedControls: 3, totalControls: 4 },
            { framework: 'NIST CSF', compliantPct: 85, passedControls: 2, totalControls: 3 }
          ]
        },
        remediationSummary: {
          fixRatePct: 40,
          mttrDays: 4.8,
          slaCompliantCount: 2,
          slaBreachedCount: 0,
          activePlansCount: 1
        },
        conclusionText: 'A governança integrada entre Pentest, ITSM e CMDB reduz significativamente a probabilidade de incidentes de alto impacto.'
      }
    ];

    const initialScoreHistory: SecurityScoreHistory[] = [
      {
        id: 'ssh-01',
        tenantId,
        timestamp: '2026-09-03T00:00:00.000Z',
        score: 72,
        grade: 'C',
        factors: { vulnerabilityScore: 65, remediationScore: 60, complianceScore: 75, criticalAssetProtection: 80, slaScore: 80 },
        riskScore: 28,
        note: 'Varredura inicial de baseline executada'
      },
      {
        id: 'ssh-02',
        tenantId,
        timestamp: '2026-09-05T00:00:00.000Z',
        score: 76,
        grade: 'C',
        factors: { vulnerabilityScore: 70, remediationScore: 70, complianceScore: 78, criticalAssetProtection: 82, slaScore: 80 },
        riskScore: 24,
        note: 'Abertura de tickets de remediação e triagem'
      },
      {
        id: 'ssh-03',
        tenantId,
        timestamp: '2026-09-07T00:00:00.000Z',
        score: 80,
        grade: 'B',
        factors: { vulnerabilityScore: 75, remediationScore: 78, complianceScore: 80, criticalAssetProtection: 85, slaScore: 85 },
        riskScore: 20,
        note: 'Primeiro reteste validado com sucesso'
      },
      {
        id: 'ssh-04',
        tenantId,
        timestamp: '2026-09-10T00:00:00.000Z',
        score: 84,
        grade: 'B',
        factors: { vulnerabilityScore: 80, remediationScore: 85, complianceScore: 84, criticalAssetProtection: 88, slaScore: 90 },
        riskScore: 16,
        note: 'Consolidação de baselines de hardening e auditoria'
      }
    ];

    const initialScheduledReports: ScheduledReport[] = [
      {
        id: 'sch-01',
        tenantId,
        type: 'EXECUTIVE',
        title: 'Boletim Semanal Executivo de Riscos e Segurança',
        frequency: 'WEEKLY',
        recipients: ['diretoria@empresaabc.com.br', 'ciso@empresaabc.com.br'],
        format: 'PDF',
        sections: ['Resumo Estratégico', 'Security Score', 'Vulnerabilidades Críticas', 'Cumprimento de SLAs'],
        status: 'ACTIVE',
        lastRunAt: '2026-09-08T08:00:00.000Z',
        nextRunAt: '2026-09-15T08:00:00.000Z',
        createdAt: '2026-09-01T08:00:00.000Z'
      },
      {
        id: 'sch-02',
        tenantId,
        type: 'COMPLIANCE',
        title: 'Auditoria Mensal de Gaps e Conformidade CIS/NIST',
        frequency: 'MONTHLY',
        recipients: ['compliance@empresaabc.com.br', 'auditoria@empresaabc.com.br'],
        format: 'CSV',
        sections: ['Matriz de Evidências', 'Controles Não Conformes', 'Planos de Ação'],
        status: 'ACTIVE',
        lastRunAt: '2026-09-01T08:00:00.000Z',
        nextRunAt: '2026-10-01T08:00:00.000Z',
        createdAt: '2026-09-01T08:00:00.000Z'
      }
    ];

    const initialAlertRules: SecurityAlertRule[] = [
      {
        id: 'alt-01',
        tenantId,
        type: 'CRITICAL_FINDING',
        name: 'Detecção de Nova Vulnerabilidade Crítica (CVSS >= 9.0)',
        thresholdValue: 9.0,
        severity: 'CRITICAL',
        enabled: true,
        recipients: ['secops-alerts@empresaabc.com.br', 'ciso@empresaabc.com.br'],
        lastTriggeredAt: '2026-09-05T14:02:15.000Z'
      },
      {
        id: 'alt-02',
        tenantId,
        type: 'RISK_SCORE_THRESHOLD',
        name: 'Alerta de Risco Global Acima do Limite Aceitável (> 40)',
        thresholdValue: 40,
        severity: 'HIGH',
        enabled: true,
        recipients: ['ciso@empresaabc.com.br']
      },
      {
        id: 'alt-03',
        tenantId,
        type: 'SLA_BREACH',
        name: 'Alerta de SLA de Remediação Prestes a Vencer ou Vencido',
        thresholdValue: 24,
        severity: 'HIGH',
        enabled: true,
        recipients: ['devops-lead@empresaabc.com.br', 'secops@empresaabc.com.br']
      },
      {
        id: 'alt-04',
        tenantId,
        type: 'EXCEPTION_EXPIRING',
        name: 'Aceite de Risco / Exceção Próxima do Vencimento (15 dias)',
        thresholdValue: 15,
        severity: 'WARNING',
        enabled: true,
        recipients: ['ciso@empresaabc.com.br']
      }
    ];

    return {
      scopes,
      policies,
      targets,
      scans,
      findings,
      evidence,
      retests: [],
      auditLogs,
      remediations,
      acceptedRisks,
      riskExceptions: [],
      retestComparisons: [],
      complianceEvaluations: [],
      riskHistories: [],
      reports: initialReports,
      complianceControls: ComplianceEngine.getInitialControls(),
      securityScoreHistory: initialScoreHistory,
      scheduledReports: initialScheduledReports,
      alertRules: initialAlertRules,
      shareTokens: []
    };
  }

  /**
   * Log de auditoria criptográfico imutável
   */
  static recordAudit(
    tenantId: string,
    user: { id: string; name: string; email: string; role: string },
    action: string,
    entityType: string,
    entityId: string,
    ipOrigin: string = '127.0.0.1',
    previousState?: any,
    newState?: any
  ) {
    const rawHmac = `${tenantId}|${user.id}|${action}|${entityType}|${entityId}|${new Date().toISOString()}`;
    const hmac = crypto.createHmac('sha256', process.env.SECURITY_AUDIT_HMAC_SECRET || 'workpulse-secret-audit-key')
      .update(rawHmac)
      .digest('hex');

    const log: SecurityAuditLog = {
      id: crypto.randomUUID(),
      tenantId,
      actorUserId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      actorRole: user.role,
      action,
      entityType,
      entityId,
      ipOrigin,
      previousState,
      newState,
      auditHmacSha256: hmac,
      createdAt: new Date().toISOString()
    };

    this.store.auditLogs.unshift(log);
    this.saveStore();
  }

  // --- MÉTODOS DE CONSULTA ---

  static getDashboardMetrics(tenantId: string): SecurityDashboardMetrics {
    const findings = this.store.findings.filter(f => f.tenantId === tenantId);
    const scans = this.store.scans.filter(s => s.tenantId === tenantId);

    const counts = {
      critical: findings.filter(f => f.severity === 'CRITICAL' && f.status !== 'RESOLVED').length,
      high: findings.filter(f => f.severity === 'HIGH' && f.status !== 'RESOLVED').length,
      medium: findings.filter(f => f.severity === 'MEDIUM' && f.status !== 'RESOLVED').length,
      low: findings.filter(f => f.severity === 'LOW' && f.status !== 'RESOLVED').length,
      info: findings.filter(f => f.severity === 'INFO' && f.status !== 'RESOLVED').length
    };

    const statusCounts = {
      open: findings.filter(f => f.status === 'NEW' || f.status === 'CONFIRMED').length,
      inRemediation: findings.filter(f => f.status === 'IN_REMEDIATION').length,
      waitingRetest: findings.filter(f => f.status === 'WAITING_RETEST').length,
      resolved: findings.filter(f => f.status === 'RESOLVED').length
    };

    const overallRiskScore = FindingProcessor.calculateInfrastructureRiskScore(findings, 'datacenter', 'alta', true);

    // Agrupar por CI para Top CIs vulneráveis
    const ciMap = new Map<string, { count: number; highest: any; score: number }>();
    findings.forEach(f => {
      if (!f.linkedCiId || f.status === 'RESOLVED') return;
      const cur = ciMap.get(f.linkedCiId) || { count: 0, highest: f.severity, score: 0 };
      cur.count++;
      cur.score += f.riskScoreContribution;
      ciMap.set(f.linkedCiId, cur);
    });

    const topVulnerableCIs = Array.from(ciMap.entries()).map(([ciId, val]) => ({
      ciId,
      ciName: ciId === 'ci-srv-erp' ? 'Servidor de Aplicação ERP Totvs' : ciId === 'ci-router' ? 'Roteador de Borda BGP' : ciId,
      ciType: ciId.includes('srv') ? 'Servidor' : 'Roteador',
      criticality: 'CRITICA',
      findingCount: val.count,
      highestSeverity: val.highest,
      riskScore: Math.min(100, Math.round(val.score * 1.3))
    }));

    return {
      overallRiskScore,
      monitoredAssetsCount: 14,
      criticalAssetsCount: 4,
      findingsBySeverity: counts,
      findingsByStatus: statusCounts,
      recentScans: scans.slice(0, 5),
      topVulnerableCIs
    };
  }

  static listScopes(tenantId: string) {
    return this.store.scopes.filter(s => s.tenantId === tenantId);
  }

  static listTargets(tenantId: string, scopeId?: string) {
    return this.store.targets.filter(t => t.tenantId === tenantId && (!scopeId || t.scopeId === scopeId));
  }

  static listScans(tenantId: string) {
    return this.store.scans.filter(s => s.tenantId === tenantId);
  }

  static getScanById(tenantId: string, scanId: string) {
    const scan = this.store.scans.find(s => s.tenantId === tenantId && s.id === scanId);
    const activeJob = this.activeJobs.get(scanId);
    return {
      scan,
      activeJob: activeJob ? { isRunning: true, progressPct: activeJob.progressPct, currentStep: activeJob.currentStep } : null
    };
  }

  static listFindings(tenantId: string, filters?: { severity?: string; status?: string; ciId?: string; search?: string }) {
    let list = this.store.findings.filter(f => f.tenantId === tenantId);
    if (filters?.severity) list = list.filter(f => f.severity === filters.severity);
    if (filters?.status) list = list.filter(f => f.status === filters.status);
    if (filters?.ciId) list = list.filter(f => f.linkedCiId === filters.ciId);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(f => f.title.toLowerCase().includes(q) || f.code.toLowerCase().includes(q) || f.affectedService?.toLowerCase().includes(q));
    }
    return list;
  }

  static getFindingById(tenantId: string, id: string) {
    const finding = this.store.findings.find(f => f.tenantId === tenantId && f.id === id);
    if (!finding) return null;
    const evidence = this.store.evidence.filter(e => e.tenantId === tenantId && e.findingId === id);
    const retests = this.store.retests.filter(r => r.tenantId === tenantId && r.findingId === id);
    const remediation = this.store.remediations?.find(r => r.tenantId === tenantId && r.findingId === id) || null;
    const acceptedRisk = this.store.acceptedRisks?.find(a => a.tenantId === tenantId && a.findingId === id) || null;
    const retestComparisons = this.store.retestComparisons?.filter(c => c.tenantId === tenantId && c.findingId === id) || [];
    return { finding, evidence, retests, remediation, acceptedRisk, retestComparisons };
  }

  static listAuditLogs(tenantId: string) {
    return this.store.auditLogs.filter(a => a.tenantId === tenantId).slice(0, 50);
  }

  // --- MÉTODOS DE AÇÃO & EXECUÇÃO ---

  /**
   * Dispara um novo Security Scan assíncrono com validação rigorosa de escopo e proteção anti-SSRF
   */
  static async startScan(
    tenantId: string,
    data: {
      title: string;
      scanType: any;
      scopeId: string;
      targetValue: string;
      targetType: any;
      linkedCiId?: string;
    },
    user: { id: string; name: string; email: string; role: string }
  ): Promise<{ success: boolean; scan?: SecurityScan; error?: string }> {
    // 1. Validação de Escopo
    const scope = this.store.scopes.find(s => s.tenantId === tenantId && s.id === data.scopeId);
    if (!scope) {
      return { success: false, error: 'Escopo não encontrado.' };
    }

    if (scope.status !== 'ACTIVE') {
      return { success: false, error: `O escopo selecionado não está ativo (status atual: ${scope.status}). A execução foi bloqueada.` };
    }

    // Verificar se o termo não expirou
    if (new Date(scope.validUntil).getTime() < Date.now()) {
      return { success: false, error: 'O termo de autorização formal deste escopo expirou. A execução foi bloqueada.' };
    }

    // 2. Validação Anti-SSRF do Target
    const validation = await TargetValidator.validateTarget(
      data.targetValue,
      data.targetType,
      ['192.168.1.0/24', '10.0.0.0/24', '172.16.0.0/24']
    );

    if (!validation.isValid) {
      this.recordAudit(tenantId, user, 'SCAN_REJECTED_SSRF', 'SECURITY_TARGET', data.targetValue, '127.0.0.1', null, { error: validation.error });
      return { success: false, error: validation.error };
    }

    const scanId = `scn-${Date.now().toString(36)}`;
    const code = `SCN-2026-${String(this.store.scans.length + 1).padStart(4, '0')}`;

    const newScan: SecurityScan = {
      id: scanId,
      tenantId,
      code,
      title: data.title || `Scan ${data.scanType} em ${data.targetValue}`,
      scanType: data.scanType,
      scopeId: data.scopeId,
      policyId: 'pol-standard-safe',
      status: 'RUNNING',
      triggeredByUserId: user.id,
      triggeredByName: user.name,
      startedAt: new Date().toISOString(),
      findingsCountSummary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.store.scans.unshift(newScan);
    this.saveStore();

    this.recordAudit(tenantId, user, 'SCAN_LAUNCHED', 'SECURITY_SCAN', scanId, '127.0.0.1', null, { target: data.targetValue, scanType: data.scanType });

    // Iniciar execução assíncrona desacoplada do request HTTP
    this.activeJobs.set(scanId, { isAborted: false, currentStep: 'Iniciando Security Engine...', progressPct: 5 });

    (async () => {
      try {
        const job = this.activeJobs.get(scanId);

        const result = await SecurityEngine.runAssessment({
          tenantId,
          scanId,
          scanType: data.scanType,
          target: validation,
          linkedCiId: data.linkedCiId,
          policy: { timeoutMs: 4000, safeModeOnly: true },
          onProgress: (step, pct) => {
            if (job) {
              job.currentStep = step;
              job.progressPct = pct;
            }
          },
          isAborted: () => job?.isAborted || false
        });

        const targetScan = this.store.scans.find(s => s.id === scanId);
        if (targetScan) {
          targetScan.finishedAt = new Date().toISOString();
          targetScan.status = result.status;
          targetScan.updatedAt = new Date().toISOString();

          // Processar e persistir findings
          let crit = 0, hi = 0, med = 0, lo = 0, inf = 0;

          for (const rawFinding of result.findings) {
            this.findingCounter++;
            const processed = FindingProcessor.processFinding(rawFinding, this.store.findings, this.findingCounter);

            if (!processed.isDuplicate) {
              this.store.findings.unshift(processed.finding);
            }
            this.store.evidence.unshift(processed.evidence);

            if (processed.finding.severity === 'CRITICAL') crit++;
            else if (processed.finding.severity === 'HIGH') hi++;
            else if (processed.finding.severity === 'MEDIUM') med++;
            else if (processed.finding.severity === 'LOW') lo++;
            else inf++;
          }

          targetScan.findingsCountSummary = { critical: crit, high: hi, medium: med, low: lo, info: inf };
        }

        this.saveStore();
        this.recordAudit(tenantId, user, `SCAN_${result.status}`, 'SECURITY_SCAN', scanId, '127.0.0.1', null, { findingsCount: result.findings.length });
      } catch (err: any) {
        const targetScan = this.store.scans.find(s => s.id === scanId);
        if (targetScan) {
          targetScan.status = 'FAILED';
          targetScan.errorLog = err.message;
          targetScan.finishedAt = new Date().toISOString();
        }
        this.saveStore();
      } finally {
        this.activeJobs.delete(scanId);
      }
    })();

    return { success: true, scan: newScan };
  }

  /**
   * Cancela imediatamente uma execução ativa
   */
  static abortScan(tenantId: string, scanId: string, user: { id: string; name: string; email: string; role: string }): boolean {
    const job = this.activeJobs.get(scanId);
    if (job) {
      job.isAborted = true;
    }

    const scan = this.store.scans.find(s => s.tenantId === tenantId && s.id === scanId);
    if (scan) {
      scan.status = 'CANCELLED';
      scan.finishedAt = new Date().toISOString();
      scan.updatedAt = new Date().toISOString();
      this.saveStore();
      this.recordAudit(tenantId, user, 'SCAN_ABORTED', 'SECURITY_SCAN', scanId);
      return true;
    }
    return false;
  }

  /**
   * Altera status de um finding com validação estrita de ciclo de vida e justificativa
   */
  static updateFindingStatus(
    tenantId: string,
    findingId: string,
    newStatus: FindingStatus,
    justification: string,
    user: { id: string; name: string; email: string; role: string }
  ) {
    const finding = this.store.findings.find(f => f.tenantId === tenantId && f.id === findingId);
    if (!finding) return null;

    const transitionCheck = RemediationEngine.validateLifecycleTransition(finding.status, newStatus);
    if (!transitionCheck.valid) {
      throw new Error(transitionCheck.reason || 'Transição de ciclo de vida inválida.');
    }

    const prev = finding.status;
    finding.status = newStatus;
    finding.updatedAt = new Date().toISOString();
    if (newStatus === 'RESOLVED' || newStatus === 'VERIFIED') {
      finding.resolvedAt = new Date().toISOString();
    }

    // Se houver plano de remediação vinculado, sincroniza status
    const rem = this.store.remediations.find(r => r.tenantId === tenantId && r.findingId === findingId);
    if (rem) {
      if (newStatus === 'RESOLVED' || newStatus === 'VERIFIED') {
        rem.status = 'COMPLETED';
      } else if (newStatus === 'IN_REMEDIATION' || newStatus === 'REMEDIATION') {
        rem.status = 'IN_PROGRESS';
      } else if (newStatus === 'FIXED_PENDING_RETEST' || newStatus === 'WAITING_RETEST') {
        rem.status = 'WAITING_RETEST';
      } else if (newStatus === 'ACCEPTED_RISK') {
        rem.status = 'ACCEPTED_RISK';
      }
      rem.updatedAt = new Date().toISOString();
    }

    this.saveStore();
    this.recordAudit(tenantId, user, 'FINDING_STATUS_CHANGED', 'SECURITY_FINDING', findingId, '127.0.0.1', { prevStatus: prev }, { newStatus, justification });
    return finding;
  }

  /**
   * Cria ticket de TI vinculado à vulnerabilidade e instancia plano estruturado de remediação
   */
  static createTicketForFinding(
    tenantId: string,
    findingId: string,
    user: { id: string; name: string; email: string; role: string },
    options?: { ownerName?: string; ownerEmail?: string; dueDate?: string; priority?: RemediationPriority }
  ) {
    const finding = this.store.findings.find(f => f.tenantId === tenantId && f.id === findingId);
    if (!finding) return null;

    const ticketId = `tkt-sec-${Date.now().toString(36)}`;
    const ticketCode = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const ownerName = options?.ownerName || user.name;
    const ownerEmail = options?.ownerEmail || user.email;

    const sla = RemediationEngine.calculateSla(finding.severity);
    const dueDate = options?.dueDate || sla.dueDate;

    finding.ticketLinkId = ticketId;
    finding.status = 'IN_REMEDIATION';
    finding.assignedToUserId = user.id;
    finding.assignedToName = ownerName;
    finding.remediationDeadline = dueDate;
    finding.updatedAt = new Date().toISOString();

    // Cria ou atualiza plano estruturado de remediação
    let remediation = this.store.remediations.find(r => r.tenantId === tenantId && r.findingId === findingId);
    if (!remediation) {
      const priorityCalc = RemediationEngine.calculatePriority(finding);
      remediation = {
        id: `rem-${crypto.randomUUID().slice(0, 8)}`,
        tenantId,
        findingId,
        findingCode: finding.code,
        ciId: finding.linkedCiId,
        ciName: finding.affectedService || 'Ativo de Infraestrutura',
        title: `Remediação: ${finding.title}`,
        description: finding.description,
        recommendation: finding.recommendation,
        priority: options?.priority || priorityCalc.priority,
        priorityJustification: priorityCalc.justification,
        status: 'IN_PROGRESS',
        owner: {
          userId: user.id,
          userName: ownerName,
          userEmail: ownerEmail
        },
        dueDate,
        slaHours: sla.slaHours,
        slaBreached: false,
        ticketId,
        ticketCode,
        steps: RemediationEngine.buildDefaultPlanSteps(finding, ownerName, ownerEmail),
        createdBy: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.store.remediations.unshift(remediation);
    } else {
      remediation.ticketId = ticketId;
      remediation.ticketCode = ticketCode;
      remediation.status = 'IN_PROGRESS';
      remediation.updatedAt = new Date().toISOString();
    }

    this.saveStore();
    this.recordAudit(tenantId, user, 'TICKET_CREATED_FOR_FINDING', 'SECURITY_FINDING', findingId, '127.0.0.1', null, { ticketId, ticketCode, remediationId: remediation.id });
    return { ticketId, ticketCode, finding, remediation };
  }

  /**
   * Executa reteste formal com comparação Antes x Depois, evidência criptográfica e recálculo de risco
   */
  static async executeRetest(
    tenantId: string,
    findingId: string,
    technicalNotes: string,
    user: { id: string; name: string; email: string; role: string },
    simulatedOutcome?: RetestResult
  ) {
    const finding = this.store.findings.find(f => f.tenantId === tenantId && f.id === findingId);
    if (!finding) throw new Error(`Vulnerabilidade ${findingId} não encontrada.`);

    const previousEvidence = this.store.evidence.filter(e => e.findingId === findingId);
    const target = this.store.targets.find(t => t.id === finding.targetId || (finding.linkedCiId && (t.linkedCiId === finding.linkedCiId || t.ciId === finding.linkedCiId)));
    const scope = target ? this.store.scopes.find(s => s.id === target.scopeId) : undefined;

    const result = await RetestEngine.executeRetest(
      {
        tenantId,
        findingId,
        technicalNotes,
        simulatedOutcome,
        user
      },
      {
        finding,
        previousEvidence,
        target,
        scope
      }
    );

    // Registra reteste, nova evidência, comparação e histórico de risco
    this.store.retests.unshift(result.retest);
    this.store.evidence.unshift(result.newEvidence);
    this.store.retestComparisons.unshift(result.comparison);
    this.store.riskHistories.unshift(result.newRiskHistory);

    // Sincroniza plano de remediação se existir
    const rem = this.store.remediations.find(r => r.tenantId === tenantId && r.findingId === findingId);
    if (rem) {
      if (result.retest.result === 'FIXED') {
        rem.status = 'COMPLETED';
        rem.steps.forEach(s => { s.status = 'COMPLETED'; });
      } else if (result.retest.result === 'STILL_VULNERABLE') {
        rem.status = 'IN_PROGRESS';
        const pendingStep = rem.steps.find(s => s.status !== 'COMPLETED');
        if (pendingStep) pendingStep.status = 'IN_PROGRESS';
      }
      rem.updatedAt = new Date().toISOString();
    }

    this.saveStore();
    this.recordAudit(
      tenantId,
      user,
      'RETEST_EXECUTED',
      'SECURITY_FINDING',
      findingId,
      '127.0.0.1',
      { prevStatus: result.comparison.previous.status, prevRisk: result.comparison.previous.riskScore },
      {
        retestCode: result.retest.retestCode,
        outcome: result.retest.result,
        newStatus: result.updatedFinding.status,
        newRisk: result.updatedFinding.riskScoreContribution
      }
    );

    return {
      retest: result.retest,
      comparison: result.comparison,
      finding: result.updatedFinding,
      newEvidence: result.newEvidence
    };
  }

  // ==========================================
  // MÉTODOS DE GESTÃO DE REMEDIAÇÃO & SLA
  // ==========================================

  static listRemediations(tenantId: string, filters?: { status?: string; priority?: string }) {
    let list = this.store.remediations.filter(r => r.tenantId === tenantId);
    const now = Date.now();
    // Atualiza verificação de breach de SLA
    list.forEach(r => {
      if (r.status !== 'COMPLETED' && r.status !== 'VERIFIED') {
        r.slaBreached = new Date(r.dueDate).getTime() < now;
      }
    });

    if (filters?.status) {
      list = list.filter(r => r.status === filters.status);
    }
    if (filters?.priority) {
      list = list.filter(r => r.priority === filters.priority);
    }
    return list;
  }

  static getRemediationById(tenantId: string, id: string) {
    return this.store.remediations.find(r => r.tenantId === tenantId && r.id === id) || null;
  }

  static updateRemediationStep(
    tenantId: string,
    remediationId: string,
    stepId: string,
    updates: Partial<RemediationStep>,
    user: { id: string; name: string; email: string; role: string }
  ) {
    const rem = this.store.remediations.find(r => r.tenantId === tenantId && r.id === remediationId);
    if (!rem) return null;

    const step = rem.steps.find(s => s.id === stepId);
    if (!step) return null;

    Object.assign(step, updates);
    rem.updatedAt = new Date().toISOString();

    // Se todos os steps foram completados, move remediação para WAITING_RETEST
    const allCompleted = rem.steps.every(s => s.status === 'COMPLETED');
    if (allCompleted && rem.status !== 'COMPLETED') {
      rem.status = 'WAITING_RETEST';
      const finding = this.store.findings.find(f => f.id === rem.findingId);
      if (finding) {
        finding.status = 'FIXED_PENDING_RETEST';
        finding.updatedAt = new Date().toISOString();
      }
    }

    this.saveStore();
    this.recordAudit(tenantId, user, 'REMEDIATION_STEP_UPDATED', 'SECURITY_REMEDIATION', remediationId, '127.0.0.1', null, { stepId, updates });
    return rem;
  }

  static updateRemediationStatus(
    tenantId: string,
    remediationId: string,
    status: RemediationStatus,
    justification: string,
    user: { id: string; name: string; email: string; role: string }
  ) {
    const rem = this.store.remediations.find(r => r.tenantId === tenantId && r.id === remediationId);
    if (!rem) return null;

    const prev = rem.status;
    rem.status = status;
    rem.updatedAt = new Date().toISOString();

    // Sincroniza finding
    const finding = this.store.findings.find(f => f.id === rem.findingId);
    if (finding) {
      if (status === 'COMPLETED' || status === 'VERIFIED') {
        finding.status = 'RESOLVED';
        finding.resolvedAt = new Date().toISOString();
      } else if (status === 'WAITING_RETEST') {
        finding.status = 'FIXED_PENDING_RETEST';
      } else if (status === 'IN_PROGRESS') {
        finding.status = 'IN_REMEDIATION';
      } else if (status === 'ACCEPTED_RISK') {
        finding.status = 'ACCEPTED_RISK';
      }
      finding.updatedAt = new Date().toISOString();
    }

    this.saveStore();
    this.recordAudit(tenantId, user, 'REMEDIATION_STATUS_CHANGED', 'SECURITY_REMEDIATION', remediationId, '127.0.0.1', { prev }, { status, justification });
    return rem;
  }

  // ==========================================
  // MÉTODOS DE RISCO ACEITO & EXCEÇÕES
  // ==========================================

  static createAcceptedRisk(
    tenantId: string,
    findingId: string,
    data: {
      justification: string;
      businessImpactJustification: string;
      validUntil: string;
      reviewDate?: string;
      compensatoryControls: string[];
      approvedByRole?: string;
    },
    user: { id: string; name: string; email: string; role: string }
  ) {
    const finding = this.store.findings.find(f => f.tenantId === tenantId && f.id === findingId);
    if (!finding) throw new Error(`Vulnerabilidade ${findingId} não encontrada.`);

    const acceptedRecord: AcceptedRiskRecord = {
      id: `acc-${crypto.randomUUID().slice(0, 8)}`,
      tenantId,
      findingId,
      findingCode: finding.code,
      justification: data.justification,
      businessImpactJustification: data.businessImpactJustification,
      responsible: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        role: user.role
      },
      approvedBy: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        role: data.approvedByRole || 'CISO / Comitê de Segurança',
        approvedAt: new Date().toISOString()
      },
      acceptedAt: new Date().toISOString(),
      validUntil: data.validUntil,
      reviewDate: data.reviewDate || data.validUntil,
      status: 'ACTIVE',
      compensatoryControls: data.compensatoryControls || []
    };

    this.store.acceptedRisks.unshift(acceptedRecord);

    // Atualiza status do Finding sem excluí-lo
    finding.status = 'ACCEPTED_RISK';
    finding.updatedAt = new Date().toISOString();

    const rem = this.store.remediations.find(r => r.tenantId === tenantId && r.findingId === findingId);
    if (rem) {
      rem.status = 'ACCEPTED_RISK';
      rem.updatedAt = new Date().toISOString();
    }

    this.saveStore();
    this.recordAudit(tenantId, user, 'RISK_ACCEPTED', 'SECURITY_FINDING', findingId, '127.0.0.1', null, { acceptedRecordId: acceptedRecord.id, validUntil: data.validUntil });
    return acceptedRecord;
  }

  static listAcceptedRisks(tenantId: string) {
    return this.store.acceptedRisks.filter(a => a.tenantId === tenantId);
  }

  static createRiskException(
    tenantId: string,
    findingId: string,
    data: {
      scopeDescription: string;
      justification: string;
      compensatingControls: string[];
      validUntil: string;
      reviewFrequencyMonths?: number;
    },
    user: { id: string; name: string; email: string; role: string }
  ) {
    const finding = this.store.findings.find(f => f.tenantId === tenantId && f.id === findingId);
    if (!finding) throw new Error(`Vulnerabilidade ${findingId} não encontrada.`);

    const exception: RiskException = {
      id: `exc-${crypto.randomUUID().slice(0, 8)}`,
      tenantId,
      findingId,
      findingCode: finding.code,
      justification: data.justification,
      responsible: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email
      },
      approvedBy: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        role: user.role,
        approvedAt: new Date().toISOString()
      },
      startDate: new Date().toISOString(),
      expiresAt: data.validUntil,
      compensatoryControls: Array.isArray(data.compensatingControls) ? data.compensatingControls.join('; ') : String(data.compensatingControls || ''),
      notes: data.scopeDescription,
      status: 'ACTIVE'
    };

    this.store.riskExceptions.unshift(exception);
    this.saveStore();
    this.recordAudit(tenantId, user, 'RISK_EXCEPTION_CREATED', 'RISK_EXCEPTION', exception.id, '127.0.0.1', null, { findingId });
    return exception;
  }

  static listRiskExceptions(tenantId: string) {
    return this.store.riskExceptions.filter(e => e.tenantId === tenantId);
  }

  // ==========================================
  // MÉTODOS DE HARDENING & COMPLIANCE
  // ==========================================

  static listBaselines(): HardeningBaseline[] {
    return HardeningEngine.baselines;
  }

  static getBaselineById(id: string): HardeningBaseline | null {
    return HardeningEngine.baselines.find(b => b.id === id) || null;
  }

  static evaluateCompliance(
    tenantId: string,
    baselineId: string,
    targetId: string,
    user: { id: string; name: string; email: string; role: string },
    assetData?: any
  ) {
    const baseline = this.getBaselineById(baselineId);
    if (!baseline) throw new Error(`Baseline ${baselineId} não encontrada.`);

    const target = this.store.targets.find(t => t.tenantId === tenantId && t.id === targetId);
    const targetObj = target ? {
      id: target.id,
      value: target.targetValue,
      targetType: target.targetType,
      ciId: target.linkedCiId || target.ciId,
      ciName: target.ciName || target.targetValue,
      assetData
    } : {
      id: targetId,
      value: targetId,
      targetType: 'HOSTNAME',
      assetData
    };

    const evaluation = HardeningEngine.evaluateTargetAgainstBaseline(tenantId, targetObj, baseline);

    // Registra a avaliação
    this.store.complianceEvaluations.unshift(evaluation.result);

    // Insere eventuais findings gerados a partir de falhas de hardening
    for (const rawFnd of evaluation.generatedFindings) {
      const exists = this.store.findings.find(f => f.tenantId === tenantId && f.title === rawFnd.title && f.linkedCiId === rawFnd.linkedCiId);
      if (!exists && rawFnd.id && rawFnd.title) {
        this.store.findings.unshift(rawFnd as SecurityFinding);
      }
    }

    this.saveStore();
    this.recordAudit(tenantId, user, 'COMPLIANCE_EVALUATED', 'HARDENING_BASELINE', baselineId, '127.0.0.1', null, {
      compliancePct: evaluation.result.overallCompliancePct,
      failedControls: evaluation.result.failedControls
    });

    return evaluation;
  }

  static listComplianceEvaluations(tenantId: string) {
    return this.store.complianceEvaluations.filter(c => c.tenantId === tenantId);
  }

  static getRetestComparisons(tenantId: string, findingId?: string) {
    let comps = this.store.retestComparisons;
    if (findingId) {
      comps = comps.filter(c => c.findingId === findingId);
    }
    return comps;
  }

  static getRemediationDashboardMetrics(tenantId: string) {
    return RemediationEngine.calculateDashboardMetrics(
      tenantId,
      this.store.findings,
      this.store.remediations,
      this.store.acceptedRisks
    );
  }

  /* =========================================================================
   * ETAPA 7: RELATÓRIOS, COMPLIANCE, INDICADORES E GESTÃO EXECUTIVA
   * ========================================================================= */

  /**
   * Listar relatórios do tenant
   */
  static listReports(tenantId: string, filter?: { type?: SecurityReportType; status?: string }): SecurityReport[] {
    let list = this.store.reports.filter(r => r.tenantId === tenantId);
    if (filter?.type) {
      list = list.filter(r => r.type === filter.type);
    }
    if (filter?.status) {
      list = list.filter(r => r.status === filter.status);
    }
    return list;
  }

  /**
   * Obter relatório por ID
   */
  static getReportById(tenantId: string, reportId: string): SecurityReport | null {
    return this.store.reports.find(r => r.tenantId === tenantId && r.id === reportId) || null;
  }

  /**
   * Gerador dinâmico de Relatório de Pentest
   */
  static generatePentestReport(
    tenantId: string,
    projectId: string,
    user: { id: string; name: string; email: string; role: string },
    confidentiality: any = 'CONFIDENTIAL'
  ): SecurityReport {
    // Buscar projeto de pentest ou gerar mock estruturado caso ainda não esteja no store
    const targets = this.store.targets.filter(t => t.tenantId === tenantId);
    const findings = this.store.findings.filter(f => f.tenantId === tenantId);
    const evidence = this.store.evidence.filter(e => e.tenantId === tenantId);
    const remediations = this.store.remediations.filter(r => r.tenantId === tenantId);
    const retests = this.store.retestComparisons;
    const scopes = this.store.scopes.filter(s => s.tenantId === tenantId);

    const project: PentestProject = {
      id: projectId,
      tenantId,
      code: 'PNT-2026-001',
      name: 'Avaliação Perimetral e Aplicação Corporativa',
      description: 'Pentest em conformidade com escopo autorizado e metodologia OWASP WSTG.',
      objective: 'Identificar e validar vulnerabilidades cibernéticas em conformidade com o escopo autorizado.',
      methodology: 'OWASP_WSTG' as const,
      status: 'RUNNING' as const,
      scopeId: scopes[0]?.id || 'scope-default',
      targetIds: targets.map(t => t.id),
      createdBy: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const scope = scopes[0] || {
      id: 'scope-default',
      tenantId,
      name: 'Escopo Geral Corporativo',
      authorizedByUserId: user.id,
      authorizedByName: user.name,
      authorizedByEmail: user.email,
      authorizedAt: new Date().toISOString(),
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + 90 * 86400000).toISOString(),
      authorizationTermsVersion: 'v2.0',
      authorizationDocumentHash: 'mock-hash',
      authorizedIpOrigin: '127.0.0.1',
      status: 'ACTIVE' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.id
    };

    const overallRisk = findings.length > 0
      ? Math.round(findings.reduce((acc, f) => acc + (f.riskScore || f.riskScoreContribution || 0), 0) / findings.length)
      : 15;

    const report = ReportEngine.buildPentestReport({
      tenantId,
      project,
      scope,
      targets,
      findings,
      evidence,
      remediations,
      retests,
      overallRiskScore: overallRisk,
      user,
      confidentiality
    });

    this.store.reports.unshift(report);
    this.saveStore();

    this.recordAudit(tenantId, user, 'REPORT_GENERATED', 'SECURITY_REPORT', report.id, '127.0.0.1', null, {
      type: report.type,
      title: report.title
    });

    return report;
  }

  /**
   * Gerador dinâmico de Relatório Executivo
   */
  static generateExecutiveReport(
    tenantId: string,
    period: { start: string; end: string },
    user: { id: string; name: string; email: string; role: string }
  ): SecurityReport {
    const executiveData = this.getExecutiveDashboardData(tenantId);
    const report = ReportEngine.buildExecutiveReport({
      tenantId,
      executiveData,
      period,
      user
    });

    this.store.reports.unshift(report);
    this.saveStore();

    this.recordAudit(tenantId, user, 'REPORT_GENERATED', 'SECURITY_REPORT', report.id, '127.0.0.1', null, {
      type: report.type,
      title: report.title
    });

    return report;
  }

  /**
   * Gerador genérico para outros tipos de relatórios (Vulnerabilidade, Remediação, Compliance, etc.)
   */
  static createCustomReport(
    tenantId: string,
    reportData: Partial<SecurityReport>,
    user: { id: string; name: string; email: string; role: string }
  ): SecurityReport {
    const nowIso = new Date().toISOString();
    const id = `rep-${(reportData.type || 'gen').toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`;

    const findings = this.store.findings.filter(f => f.tenantId === tenantId);
    const remediations = this.store.remediations.filter(r => r.tenantId === tenantId);
    const targets = this.store.targets.filter(t => t.tenantId === tenantId);

    const report: SecurityReport = {
      id,
      tenantId,
      type: reportData.type || 'SECURITY_OVERVIEW',
      title: reportData.title || `Relatório de Segurança • ${reportData.type}`,
      description: reportData.description || 'Relatório emitido pela plataforma WorkPulse Security.',
      periodStart: reportData.periodStart || new Date(Date.now() - 30 * 86400000).toISOString(),
      periodEnd: reportData.periodEnd || nowIso,
      generatedBy: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role
      },
      generatedAt: nowIso,
      status: 'GENERATED',
      version: '1.0.0',
      confidentialityLevel: reportData.confidentialityLevel || 'CONFIDENTIAL',
      sections: reportData.sections || ['Identificação', 'Sumário Executivo', 'Achados & Riscos', 'Conclusão'],
      executiveSummary: reportData.executiveSummary || {
        overallRiskLevel: 'LOW',
        securityScore: 85,
        riskScore: 15,
        criticalFindingsCount: findings.filter(f => f.severity === 'CRITICAL').length,
        highFindingsCount: findings.filter(f => f.severity === 'HIGH').length,
        summaryText: 'Relatório compilado automaticamente consolidando os dados técnicos de segurança do ambiente.',
        keyRecommendations: ['Acompanhar prazos de remediação', 'Realizar retestes periódicos']
      },
      findingsSummary: reportData.findingsSummary || findings.map(f => ({
        id: f.id,
        code: f.code,
        title: f.title,
        description: f.description,
        severity: f.severity,
        cvssScore: f.cvssScore || 0,
        confidence: f.confidence || 'HIGH',
        riskScore: f.riskScore || f.riskScoreContribution || 0,
        assetName: f.affectedAssetName || f.affectedService,
        ciName: f.linkedCiId,
        targetValue: f.affectedUrl || 'Alvo Corporativo',
        evidenceSummary: 'Evidência técnica registrada no repositório.',
        recommendation: f.remediationGuidance || f.recommendation || 'Aplicar atualização e seguir baseline de hardening.',
        status: f.status
      })),
      conclusionText: reportData.conclusionText || 'Recomenda-se manter o ciclo de governança e monitoramento contínuo.',
      ...reportData
    };

    this.store.reports.unshift(report);
    this.saveStore();

    this.recordAudit(tenantId, user, 'REPORT_CREATED', 'SECURITY_REPORT', report.id, '127.0.0.1', null, {
      type: report.type,
      title: report.title
    });

    return report;
  }

  /**
   * Exclusão de relatório
   */
  static deleteReport(tenantId: string, reportId: string, user: { id: string; name: string; email: string; role: string }): boolean {
    const idx = this.store.reports.findIndex(r => r.tenantId === tenantId && r.id === reportId);
    if (idx === -1) return false;

    this.store.reports.splice(idx, 1);
    this.saveStore();

    this.recordAudit(tenantId, user, 'REPORT_DELETED', 'SECURITY_REPORT', reportId, '127.0.0.1');
    return true;
  }

  /**
   * Exportar relatório nos formatos suportados (JSON, CSV, HTML/PDF)
   */
  static exportReport(tenantId: string, reportId: string, format: 'JSON' | 'CSV' | 'HTML'): { content: string; contentType: string; filename: string } {
    const report = this.getReportById(tenantId, reportId);
    if (!report) throw new Error(`Relatório ${reportId} não encontrado.`);

    const sanitizedReport = ReportEngine.sanitizeSensitiveData(report);
    const safeTitle = report.title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);

    if (format === 'JSON') {
      return {
        content: JSON.stringify(sanitizedReport, null, 2),
        contentType: 'application/json',
        filename: `${safeTitle}-${report.id}.json`
      };
    } else if (format === 'CSV') {
      return {
        content: ReportEngine.exportToCsv(sanitizedReport),
        contentType: 'text/csv; charset=utf-8',
        filename: `${safeTitle}-${report.id}.csv`
      };
    } else {
      return {
        content: ReportEngine.exportToHtml(sanitizedReport),
        contentType: 'text/html; charset=utf-8',
        filename: `${safeTitle}-${report.id}.html`
      };
    }
  }

  /**
   * Compartilhamento seguro: Gerar token temporário com expiração e permissões
   */
  static createReportShareToken(
    tenantId: string,
    reportId: string,
    params: { recipientName: string; recipientEmail: string; expiresInDays?: number; permissions?: ('VIEW' | 'DOWNLOAD')[] },
    user: { id: string; name: string; email: string; role: string }
  ): ReportShareToken {
    const report = this.getReportById(tenantId, reportId);
    if (!report) throw new Error(`Relatório ${reportId} não encontrado.`);

    const shareToken = ReportEngine.createShareToken({
      reportId,
      tenantId,
      recipientName: params.recipientName,
      recipientEmail: params.recipientEmail,
      expiresInDays: params.expiresInDays,
      permissions: params.permissions
    });

    this.store.shareTokens.push(shareToken);
    this.saveStore();

    this.recordAudit(tenantId, user, 'SHARE_TOKEN_CREATED', 'REPORT_SHARE_TOKEN', shareToken.id, '127.0.0.1', null, {
      recipientEmail: params.recipientEmail,
      expiresAt: shareToken.expiresAt
    });

    return shareToken;
  }

  /**
   * Acesso público/controlado via token de compartilhamento
   */
  static getSharedReport(tokenString: string): { report: SecurityReport; permissions: string[]; recipientName: string } | null {
    const token = this.store.shareTokens.find(t => t.token === tokenString);
    if (!token) return null;

    if (token.isRevoked) {
      throw new Error('Este link de compartilhamento foi revogado pelo administrador.');
    }

    if (new Date(token.expiresAt).getTime() < Date.now()) {
      throw new Error('Este link de compartilhamento expirou.');
    }

    token.accessCount = (token.accessCount || 0) + 1;
    token.lastAccessedAt = new Date().toISOString();
    this.saveStore();

    const report = this.store.reports.find(r => r.id === token.reportId);
    if (!report) return null;

    const sanitizedReport = ReportEngine.sanitizeSensitiveData(report);

    return {
      report: sanitizedReport,
      permissions: token.allowedPermissions,
      recipientName: token.recipientName
    };
  }

  /**
   * Revogar token de compartilhamento
   */
  static revokeShareToken(tenantId: string, tokenId: string, user: { id: string; name: string; email: string; role: string }): boolean {
    const token = this.store.shareTokens.find(t => t.tenantId === tenantId && t.id === tokenId);
    if (!token) return false;

    token.isRevoked = true;
    this.saveStore();

    this.recordAudit(tenantId, user, 'SHARE_TOKEN_REVOKED', 'REPORT_SHARE_TOKEN', tokenId, '127.0.0.1');
    return true;
  }

  /**
   * Listar controles de compliance
   */
  static listComplianceControls(tenantId: string): ComplianceControl[] {
    return this.store.complianceControls || [];
  }

  /**
   * Atualizar status e dados de controle de compliance
   */
  static updateComplianceControl(
    tenantId: string,
    controlId: string,
    patch: Partial<ComplianceControl>,
    user: { id: string; name: string; email: string; role: string }
  ): ComplianceControl {
    const control = this.store.complianceControls.find(c => c.id === controlId);
    if (!control) throw new Error(`Controle ${controlId} não encontrado.`);

    const previous = { ...control };
    Object.assign(control, patch);
    control.assessedAt = new Date().toISOString();
    control.lastAuditedBy = user.name;

    this.saveStore();

    this.recordAudit(tenantId, user, 'COMPLIANCE_CONTROL_UPDATED', 'COMPLIANCE_CONTROL', controlId, '127.0.0.1', previous, patch);
    return control;
  }

  /**
   * Matriz de Evidências (Control -> Evidence -> Finding -> Remediation)
   */
  static getEvidenceMatrix(tenantId: string): EvidenceMatrixItem[] {
    const findings = this.store.findings.filter(f => f.tenantId === tenantId);
    const evidence = this.store.evidence.filter(e => e.tenantId === tenantId);
    const remediations = this.store.remediations.filter(r => r.tenantId === tenantId);
    const controls = this.store.complianceControls || [];

    return ComplianceEngine.buildEvidenceMatrix(controls, findings, evidence, remediations);
  }

  /**
   * Resumo de conformidade por Framework (OWASP, CIS, NIST, ISO 27001, Políticas Internas)
   */
  static getComplianceFrameworkSummary(tenantId: string) {
    const controls = this.store.complianceControls || [];
    return ComplianceEngine.calculateFrameworkCompliance(controls);
  }

  /**
   * Cálculo oficial do Security Score e Grade
   */
  static calculateSecurityScore(tenantId: string): {
    score: number;
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    factors: {
      vulnerabilityScore: number;
      remediationScore: number;
      complianceScore: number;
      criticalAssetProtection: number;
      slaScore: number;
    };
    overallRiskScore: number;
  } {
    const findings = this.store.findings.filter(f => f.tenantId === tenantId);
    const remediations = this.store.remediations.filter(r => r.tenantId === tenantId);
    const targets = this.store.targets.filter(t => t.tenantId === tenantId);
    const compliance = this.getComplianceFrameworkSummary(tenantId);

    // 1. Fator Vulnerabilidade (0-100)
    let vulnPenalty = 0;
    findings.forEach(f => {
      if (f.status === 'RESOLVED' || f.status === 'VERIFIED') return;
      if (f.severity === 'CRITICAL') vulnPenalty += 18;
      else if (f.severity === 'HIGH') vulnPenalty += 8;
      else if (f.severity === 'MEDIUM') vulnPenalty += 3;
      else vulnPenalty += 1;
    });
    const vulnerabilityScore = Math.max(0, Math.min(100, 100 - vulnPenalty));

    // 2. Fator Remediação (0-100)
    const resolvedRemediations = remediations.filter(r => r.status === 'VERIFIED' || r.status === 'COMPLETED').length;
    const fixRate = remediations.length > 0 ? (resolvedRemediations / remediations.length) * 100 : 80;
    const remediationScore = Math.round(fixRate);

    // 3. Fator Compliance (0-100)
    const complianceScore = compliance.overallCompliancePct;

    // 4. Proteção de Ativos Críticos (0-100)
    const criticalTargets = targets.filter(t => t.criticality === 'CRITICA');
    const criticalFindingsOnCriticalTargets = findings.filter(f => 
      (f.status === 'OPEN' || f.status === 'NEW') && 
      targets.some(t => t.id === f.targetId && t.criticality === 'CRITICA')
    ).length;
    const criticalAssetProtection = criticalTargets.length > 0 
      ? Math.max(0, 100 - (criticalFindingsOnCriticalTargets * 25))
      : 95;

    // 5. Cumprimento de SLA (0-100)
    const breachedCount = remediations.filter(r => r.slaBreached && r.status !== 'VERIFIED').length;
    const slaScore = Math.max(0, 100 - (breachedCount * 20));

    // Ponderação oficial
    const weightedScore = Math.round(
      (vulnerabilityScore * 0.35) +
      (remediationScore * 0.20) +
      (complianceScore * 0.20) +
      (criticalAssetProtection * 0.15) +
      (slaScore * 0.10)
    );

    const score = Math.max(0, Math.min(100, weightedScore));

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (score >= 95) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 55) grade = 'C';
    else if (score >= 40) grade = 'D';
    else grade = 'F';

    const overallRiskScore = Math.max(0, Math.min(100, 100 - score));

    return {
      score,
      grade,
      factors: {
        vulnerabilityScore,
        remediationScore,
        complianceScore,
        criticalAssetProtection,
        slaScore
      },
      overallRiskScore
    };
  }

  /**
   * Histórico de Security Score
   */
  static getSecurityScoreHistory(tenantId: string): SecurityScoreHistory[] {
    return this.store.securityScoreHistory.filter(h => h.tenantId === tenantId);
  }

  /**
   * Dashboard Executivo Consolidado
   */
  static getExecutiveDashboardData(tenantId: string): ExecutiveDashboardData {
    const findings = this.store.findings.filter(f => f.tenantId === tenantId);
    const remediations = this.store.remediations.filter(r => r.tenantId === tenantId);
    const targets = this.store.targets.filter(t => t.tenantId === tenantId);
    const acceptedRisks = this.store.acceptedRisks.filter(a => a.tenantId === tenantId);
    const scoreData = this.calculateSecurityScore(tenantId);
    const complianceSummary = this.getComplianceFrameworkSummary(tenantId);

    // Contagens de Achados
    const critical = findings.filter(f => f.severity === 'CRITICAL' && f.status !== 'RESOLVED' && f.status !== 'VERIFIED').length;
    const high = findings.filter(f => f.severity === 'HIGH' && f.status !== 'RESOLVED' && f.status !== 'VERIFIED').length;
    const medium = findings.filter(f => f.severity === 'MEDIUM' && f.status !== 'RESOLVED' && f.status !== 'VERIFIED').length;
    const low = findings.filter(f => f.severity === 'LOW' && f.status !== 'RESOLVED' && f.status !== 'VERIFIED').length;
    const open = findings.filter(f => f.status === 'OPEN' || f.status === 'NEW' || f.status === 'IN_REMEDIATION').length;
    const resolved = findings.filter(f => f.status === 'RESOLVED' || f.status === 'VERIFIED').length;

    // Métricas de Remediação
    const totalRemediations = remediations.length;
    const resolvedRem = remediations.filter(r => r.status === 'VERIFIED' || r.status === 'COMPLETED').length;
    const fixRatePct = totalRemediations > 0 ? Math.round((resolvedRem / totalRemediations) * 100) : 50;
    const slaCompliantCount = remediations.filter(r => !r.slaBreached).length;
    const slaBreachedCount = remediations.filter(r => r.slaBreached).length;

    // Tendência de Risco (compara com histórico recente)
    const history = this.getSecurityScoreHistory(tenantId);
    let riskTrend: 'IMPROVING' | 'STABLE' | 'DEGRADING' = 'STABLE';
    if (history.length >= 2) {
      const prev = history[history.length - 2].score;
      if (scoreData.score > prev + 2) riskTrend = 'IMPROVING';
      else if (scoreData.score < prev - 2) riskTrend = 'DEGRADING';
    }

    // Top Ativos com Maior Risco
    const topVulnerableAssets = targets.map(tgt => {
      const assetFindings = findings.filter(f => f.targetId === tgt.id || f.affectedAssetName === tgt.targetValue || f.affectedService === tgt.targetValue);
      const riskScore = assetFindings.reduce((sum, f) => sum + (f.riskScore || f.riskScoreContribution || 0), 0);
      return {
        assetId: tgt.id,
        assetName: tgt.targetValue,
        ciId: tgt.linkedCiId,
        criticality: tgt.criticality,
        findingsCount: assetFindings.length,
        riskScore
      };
    }).sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);

    // Top Riscos
    const topRisks = findings
      .filter(f => f.status !== 'RESOLVED' && f.status !== 'VERIFIED')
      .sort((a, b) => (b.riskScore || b.riskScoreContribution || 0) - (a.riskScore || a.riskScoreContribution || 0))
      .slice(0, 5)
      .map(f => ({
        id: f.id,
        code: f.code,
        title: f.title,
        severity: f.severity,
        riskScore: f.riskScore || f.riskScoreContribution || 0,
        affectedAsset: f.affectedAssetName || f.affectedService || 'Perímetro Corporativo',
        remediationStatus: f.status
      }));

    const topCriticalRisks = topRisks.map(r => ({
      findingId: r.id,
      code: r.code,
      title: r.title,
      severity: r.severity,
      ciName: r.affectedAsset,
      riskScore: r.riskScore,
      slaStatus: 'ON_TRACK'
    }));

    const topCriticalAssets = topVulnerableAssets.map(a => ({
      ciId: a.ciId || a.assetId,
      ciName: a.assetName,
      ciType: 'INFRASTRUCTURE',
      riskScore: a.riskScore,
      criticalFindingsCount: a.findingsCount,
      exposure: a.criticality
    }));

    const pentestProjects = PentestControlPlane.listProjects(tenantId);

    return {
      securityScore: scoreData.score,
      securityScoreGrade: scoreData.grade,
      overallRiskScore: scoreData.overallRiskScore,
      riskTrend,
      riskDelta: 0,
      scoreFactors: scoreData.factors,
      findingsMetrics: {
        total: findings.length,
        critical,
        high,
        medium,
        low,
        open,
        fixed: resolved,
        resolved,
        acceptedRisksCount: acceptedRisks.length
      },
      remediationMetrics: {
        fixRatePct,
        mttrDays: 4.8,
        slaCompliantCount,
        slaBreachedCount,
        totalRemediations,
        resolvedRemediations: resolvedRem
      },
      pentestMetrics: {
        totalProjects: pentestProjects.length,
        runningExecutions: pentestProjects.filter(p => p.status === 'RUNNING').length,
        testedTargets: targets.length,
        retestedFindings: this.store.retestComparisons.length,
        confirmedFindings: critical + high
      },
      complianceMetrics: complianceSummary,
      topCriticalRisks,
      topCriticalAssets,
      topVulnerableAssets,
      topRisks,
      recentScoreHistory: history,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Relatórios Agendados
   */
  static listScheduledReports(tenantId: string): ScheduledReport[] {
    return this.store.scheduledReports.filter(s => s.tenantId === tenantId);
  }

  static createScheduledReport(
    tenantId: string,
    data: Partial<ScheduledReport>,
    user: { id: string; name: string; email: string; role: string }
  ): ScheduledReport {
    const id = `sch-${crypto.randomUUID().slice(0, 8)}`;
    const newScheduled: ScheduledReport = {
      id,
      tenantId,
      type: data.type || 'EXECUTIVE',
      title: data.title || 'Relatório Agendado',
      frequency: data.frequency || 'WEEKLY',
      recipients: data.recipients || [user.email],
      format: data.format || 'PDF',
      sections: data.sections || ['Sumário Executivo', 'Security Score', 'Vulnerabilidades'],
      status: 'ACTIVE',
      nextRunAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString()
    };

    this.store.scheduledReports.push(newScheduled);
    this.saveStore();

    this.recordAudit(tenantId, user, 'SCHEDULED_REPORT_CREATED', 'SCHEDULED_REPORT', id, '127.0.0.1', null, {
      frequency: newScheduled.frequency,
      recipients: newScheduled.recipients
    });

    return newScheduled;
  }

  static deleteScheduledReport(tenantId: string, id: string, user: { id: string; name: string; email: string; role: string }): boolean {
    const idx = this.store.scheduledReports.findIndex(s => s.tenantId === tenantId && s.id === id);
    if (idx === -1) return false;

    this.store.scheduledReports.splice(idx, 1);
    this.saveStore();

    this.recordAudit(tenantId, user, 'SCHEDULED_REPORT_DELETED', 'SCHEDULED_REPORT', id, '127.0.0.1');
    return true;
  }

  /**
   * Regras de Alerta
   */
  static listAlertRules(tenantId: string): SecurityAlertRule[] {
    return this.store.alertRules.filter(a => a.tenantId === tenantId);
  }

  static updateAlertRule(
    tenantId: string,
    id: string,
    patch: Partial<SecurityAlertRule>,
    user: { id: string; name: string; email: string; role: string }
  ): SecurityAlertRule {
    const rule = this.store.alertRules.find(a => a.tenantId === tenantId && a.id === id);
    if (!rule) throw new Error(`Regra de alerta ${id} não encontrada.`);

    const previous = { ...rule };
    Object.assign(rule, patch);
    this.saveStore();

    this.recordAudit(tenantId, user, 'ALERT_RULE_UPDATED', 'SECURITY_ALERT_RULE', id, '127.0.0.1', previous, patch);
    return rule;
  }
}

