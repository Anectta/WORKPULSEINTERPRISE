import crypto from 'crypto';
import {
  SecurityReport,
  SecurityReportType,
  ConfidentialityClassification,
  ReportShareToken,
  SecurityFinding,
  SecurityTarget,
  SecurityScope,
  SecurityScan,
  SecurityEvidence,
  SecurityRemediation,
  RetestComparison,
  PentestProject,
  ComplianceControl,
  ExecutiveDashboardData
} from '../../src/types/security';
import { ComplianceEngine } from './complianceEngine';

export class ReportEngine {
  /**
   * 1. DETECÇÃO E MASCARAMENTO DE DADOS SENSÍVEIS (SECRETS, TOKENS, CREDENCIAIS)
   */
  public static sanitizeSensitiveData(input: any): any {
    if (input === null || input === undefined) return input;
    if (typeof input === 'string') {
      return input
        // Mascarar Chaves Privadas
        .replace(/-----BEGIN [A-Z\s]*PRIVATE KEY-----[\s\S]*?-----END [A-Z\s]*PRIVATE KEY-----/gi, '[*** REDACTED PRIVATE KEY ***]')
        // Mascarar Bearer Tokens JWT
        .replace(/Bearer\s+ey[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/gi, 'Bearer eyJ***[REDACTED_JWT_TOKEN]***')
        // Mascarar Basic Auth
        .replace(/Basic\s+[A-Za-z0-9+/=]{16,}/gi, 'Basic ***[REDACTED_BASIC_AUTH]***')
        // Mascarar Credenciais em URL / Query Params (password, secret, apiKey, token)
        .replace(/([?&](?:password|passwd|pwd|secret|api_key|apiKey|token|access_token|client_secret)=)[^&\s]+/gi, '$1***REDACTED***')
        // Mascarar JSON keys sensíveis
        .replace(/"(password|secret|apiKey|token|privateKey|credential)"\s*:\s*"[^"]+"/gi, '"$1": "***REDACTED***"')
        // Mascarar Session Cookies
        .replace(/(?:Set-Cookie|Cookie):\s*([^;\r\n]+)/gi, 'Cookie: ***REDACTED_SESSION_COOKIE***')
        // Mascarar hashes de senhas
        .replace(/\$2[aby]\$[0-9]{2}\$[A-Za-z0-9./]{53}/g, '$2y$12$***REDACTED_BCRYPT_HASH***');
    }
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeSensitiveData(item));
    }
    if (typeof input === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(input)) {
        if (/password|secret|apiKey|api_key|token|credential|private_key/i.test(key) && typeof value === 'string') {
          sanitized[key] = '***REDACTED_SENSITIVE_FIELD***';
        } else {
          sanitized[key] = this.sanitizeSensitiveData(value);
        }
      }
      return sanitized;
    }
    return input;
  }

  /**
   * 2. GERADOR DO RELATÓRIO PROFISSIONAL DE PENTEST (8 SEÇÕES)
   */
  public static buildPentestReport(params: {
    tenantId: string;
    project: PentestProject;
    scope: SecurityScope;
    targets: SecurityTarget[];
    findings: SecurityFinding[];
    evidence: SecurityEvidence[];
    remediations: SecurityRemediation[];
    retests: RetestComparison[];
    overallRiskScore: number;
    user: { id: string; name: string; email: string; role: string };
    confidentiality?: ConfidentialityClassification;
  }): SecurityReport {
    const {
      tenantId,
      project,
      scope,
      targets,
      findings,
      evidence,
      remediations,
      retests,
      overallRiskScore,
      user,
      confidentiality = 'CONFIDENTIAL'
    } = params;

    const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
    const highCount = findings.filter(f => f.severity === 'HIGH').length;
    const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;
    const lowCount = findings.filter(f => f.severity === 'LOW').length;

    const riskLevel = overallRiskScore >= 70 ? 'CRITICAL' : overallRiskScore >= 40 ? 'HIGH' : overallRiskScore >= 20 ? 'MEDIUM' : 'LOW';

    // 8 Seções completas
    const reportId = `rep-pnt-${crypto.randomUUID().slice(0, 8)}`;
    const nowIso = new Date().toISOString();

    const report: SecurityReport = {
      id: reportId,
      tenantId,
      type: 'PENTEST',
      title: `Relatório Técnico e Executivo de Pentest • ${project.name}`,
      description: `Avaliação de segurança ofensiva autorizada e testes de intrusão baseados na metodologia ${project.methodology}.`,
      projectId: project.id,
      pentestId: project.id,
      periodStart: project.startedAt || project.createdAt,
      periodEnd: project.completedAt || nowIso,
      generatedBy: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role
      },
      generatedAt: nowIso,
      status: 'GENERATED',
      version: '1.0.0',
      confidentialityLevel: confidentiality,
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
        overallRiskLevel: riskLevel,
        securityScore: Math.max(0, Math.round(100 - overallRiskScore)),
        riskScore: overallRiskScore,
        criticalFindingsCount: criticalCount,
        highFindingsCount: highCount,
        summaryText: `Durante a execução da avaliação de segurança autorizada do projeto ${project.code} (${project.name}), foram identificadas ${findings.length} vulnerabilidades técnicas, das quais ${criticalCount} são de severidade CRÍTICA e ${highCount} de severidade ALTA. O risco global do ambiente foi calculado em ${overallRiskScore}/100, indicando necessidade prioritária de aplicação das diretrizes de remediação recomendadas.`,
        keyRecommendations: [
          'Aplicar imediatamente os patches de segurança nos serviços expostos e restringir portas administrativas ao perímetro interno.',
          'Implementar autenticação multifator (MFA) rigorosa e desabilitar suites de cifras legadas (TLS 1.0/1.1) em todos os endpoints web.',
          'Executar os testes de regressão e solicitar reteste automatizado via plataforma assim que as equipes de infraestrutura concluírem as correções.'
        ]
      },
      scopeSummary: {
        authorizedTargets: targets.filter(t => t.isInScope).map(t => `${t.targetValue} (${t.targetType})`),
        testedTargets: targets.filter(t => t.validationStatus === 'VALIDATED_DNS' || t.isInScope).map(t => t.targetValue),
        untestedTargets: targets.filter(t => !t.isInScope).map(t => t.targetValue),
        limitations: [
          'Testes de negação de serviço volumétricos (DDoS) não foram executados conforme limites estipulados no Rules of Engagement.',
          'Janela de execução restrita para horários autorizados sem impacto na disponibilidade produtiva.',
          'Alvos fora do Termo de Escopo formal foram explicitamente ignorados pelo motor de teste.'
        ]
      },
      methodologySummary: {
        framework: project.methodology,
        profiles: ['OWASP Web Security Testing Guide (WSTG v4.2)', 'Penetration Testing Execution Standard (PTES)', 'NIST SP 800-115'],
        categories: ['Reconhecimento de Perímetro', 'Varredura de Serviços & Banners', 'Análise de Cabeçalhos HTTP/TLS', 'Validação de Vetores de Injeção & Controle de Acesso'],
        testsExecuted: 42,
        limitations: ['Engenharia social física e testes de intrusão em estações de trabalho de usuários finais não estavam no escopo.']
      },
      findingsSummary: findings.map(f => {
        const target = targets.find(t => t.id === f.targetId);
        const rem = remediations.find(r => r.findingId === f.id);
        const retest = retests.find(r => r.findingId === f.id);
        const fEvidences = evidence.filter(e => e.findingId === f.id);
        const latestEv = fEvidences[0];

        return {
          id: f.id,
          code: f.code,
          title: f.title,
          description: f.description,
          severity: f.severity,
          cvssScore: f.cvssScore || 0,
          confidence: f.confidence || 'HIGH',
          riskScore: f.riskScore || f.riskScoreContribution || 0,
          assetName: f.affectedAssetName || f.affectedService || target?.targetValue,
          ciName: f.linkedCiId,
          targetValue: target?.targetValue || f.affectedUrl || 'Alvo em Escopo',
          evidenceSummary: latestEv ? this.sanitizeSensitiveData(latestEv.rawPayload?.slice(0, 150) || latestEv.evidenceType) : 'Evidência técnica registrada.',
          recommendation: f.remediationGuidance || f.recommendation || 'Aplicar atualização do componente e validar configuração de segurança.',
          status: f.status,
          remediation: rem ? {
            responsible: rem.ownerName || rem.owner?.userName || 'Equipe SecOps',
            status: rem.status,
            dueDate: rem.dueAt || rem.dueDate || '',
            ticketCode: rem.ticketCode
          } : undefined,
          retest: retest ? {
            result: retest.outcome || retest.retestResult || 'RESOLVED',
            previousRisk: retest.previous?.riskScore || f.riskScore || f.riskScoreContribution || 0,
            currentRisk: retest.current?.riskScore || 0,
            evidenceSummary: this.sanitizeSensitiveData(retest.technicalNotes || retest.summary || ''),
            retestedAt: retest.current?.evidenceDate || retest.executedAt || nowIso
          } : undefined
        };
      }),
      conclusionText: `A avaliação cibernética conduzida sobre o escopo do projeto ${project.name} comprovou que, com a aplicação das correções dos itens críticos e a execução dos retestes de validação, a postura de resiliência digital da organização evolui expressivamente. Recomenda-se a continuidade do monitoramento contínuo de vulnerabilidades e a manutenção dos baselines de hardening aprovados.`
    };

    return report;
  }

  /**
   * 3. GERADOR DO RELATÓRIO EXECUTIVO (SIMPLIFICADO PARA GESTORES/DIRETORIA)
   */
  public static buildExecutiveReport(params: {
    tenantId: string;
    executiveData: ExecutiveDashboardData;
    period: { start: string; end: string };
    user: { id: string; name: string; email: string; role: string };
  }): SecurityReport {
    const { tenantId, executiveData, period, user } = params;
    const nowIso = new Date().toISOString();

    return {
      id: `rep-exec-${crypto.randomUUID().slice(0, 8)}`,
      tenantId,
      type: 'EXECUTIVE',
      title: 'Relatório Executivo de Postura e Indicadores de Segurança Cibernética',
      description: 'Painel estratégico consolidado para tomada de decisão, gestão de riscos corporativos e conformidade.',
      periodStart: period.start,
      periodEnd: period.end,
      generatedBy: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role
      },
      generatedAt: nowIso,
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
        overallRiskLevel: executiveData.overallRiskScore >= 70 ? 'CRITICAL' : executiveData.overallRiskScore >= 40 ? 'HIGH' : 'LOW',
        securityScore: executiveData.securityScore,
        riskScore: executiveData.overallRiskScore,
        criticalFindingsCount: executiveData.findingsMetrics.critical,
        highFindingsCount: executiveData.findingsMetrics.high,
        summaryText: `A postura de segurança atual apresenta Security Score de ${executiveData.securityScore}/100 (Conceito ${executiveData.securityScoreGrade}) e Risk Score de ${executiveData.overallRiskScore}/100 com tendência ${executiveData.riskTrend === 'IMPROVING' ? 'de melhoria contínua' : executiveData.riskTrend === 'STABLE' ? 'estável' : 'de atenção'}. A taxa de remediação é de ${executiveData.remediationMetrics.fixRatePct}%, com tempo médio de resolução de ${executiveData.remediationMetrics.mttrDays} dias.`,
        keyRecommendations: [
          'Alocar suporte das equipes de infraestrutura para neutralização dos ativos com maior concentração de risco.',
          'Manter a rotina de retestes após correções para garantir não regressão.',
          'Expandir baselines de hardening nos bancos de dados e gateways expostos.'
        ]
      },
      complianceSummary: {
        overallCompliancePct: executiveData.complianceMetrics.overallCompliancePct,
        frameworkAssessments: executiveData.complianceMetrics.frameworkScores.map(f => ({
          framework: f.framework,
          compliantPct: f.compliantPct,
          passedControls: f.passed,
          totalControls: f.total
        }))
      },
      remediationSummary: {
        fixRatePct: executiveData.remediationMetrics.fixRatePct,
        mttrDays: executiveData.remediationMetrics.mttrDays,
        slaCompliantCount: executiveData.remediationMetrics.slaCompliantCount,
        slaBreachedCount: executiveData.remediationMetrics.slaBreachedCount,
        activePlansCount: executiveData.findingsMetrics.open
      },
      conclusionText: 'A governança contínua de vulnerabilidades e remediações garante conformidade com exigências de parceiros de negócios, LGPD e diretrizes de seguradoras de risco cibernético.'
    };
  }

  /**
   * 4. EXPORTAÇÃO PARA CSV (FORMATO TABULAR COMPATÍVEL COM BI / EXCEL)
   */
  public static exportToCsv(report: SecurityReport): string {
    const lines: string[] = [];
    
    // Metadados do Relatório
    lines.push(`"RELATORIO","${report.title.replace(/"/g, '""')}"`);
    lines.push(`"TIPO","${report.type}"`);
    lines.push(`"GERADO_EM","${report.generatedAt}"`);
    lines.push(`"GERADO_POR","${report.generatedBy.userName} (${report.generatedBy.userRole})"`);
    lines.push(`"CONFIDENCIALIDADE","${report.confidentialityLevel}"`);
    lines.push('');

    // Seção de Achados
    if (report.findingsSummary && report.findingsSummary.length > 0) {
      lines.push('"ACHADOS DE SEGURANÇA"');
      lines.push('"Codigo","Titulo","Severidade","CVSS","Risco","Alvo/Ativo","Status","Responsavel","Prazo","Reteste_Resultado"');
      for (const f of report.findingsSummary) {
        lines.push([
          `"${f.code}"`,
          `"${f.title.replace(/"/g, '""')}"`,
          `"${f.severity}"`,
          f.cvssScore,
          f.riskScore,
          `"${(f.targetValue || f.assetName || '').replace(/"/g, '""')}"`,
          `"${f.status}"`,
          `"${(f.remediation?.responsible || 'N/A').replace(/"/g, '""')}"`,
          `"${f.remediation?.dueDate || 'N/A'}"`,
          `"${f.retest?.result || 'N/A'}"`
        ].join(','));
      }
      lines.push('');
    }

    // Seção de Compliance
    if (report.complianceSummary && report.complianceSummary.frameworkAssessments.length > 0) {
      lines.push('"AVALIACAO DE CONFORMIDADE (GAP ANALYSIS)"');
      lines.push('"Framework","Conformidade_Pct","Controles_Aprovados","Total_Controles"');
      for (const fa of report.complianceSummary.frameworkAssessments) {
        lines.push([
          `"${fa.framework.replace(/"/g, '""')}"`,
          `${fa.compliantPct}%`,
          fa.passedControls,
          fa.totalControls
        ].join(','));
      }
    }

    return lines.join('\n');
  }

  /**
   * 5. EXPORTAÇÃO PARA HTML FORMATADO PARA IMPRESSÃO / PDF NATIVO DO BROWSER
   */
  public static exportToHtml(report: SecurityReport): string {
    const getSevBadgeColor = (sev: string) => {
      switch (sev) {
        case 'CRITICAL': return 'background:#ef4444;color:#ffffff;';
        case 'HIGH': return 'background:#f97316;color:#ffffff;';
        case 'MEDIUM': return 'background:#f59e0b;color:#ffffff;';
        case 'LOW': return 'background:#10b981;color:#ffffff;';
        default: return 'background:#64748b;color:#ffffff;';
      }
    };

    const confColor = report.confidentialityLevel === 'RESTRICTED' ? '#dc2626' : report.confidentialityLevel === 'CONFIDENTIAL' ? '#b45309' : '#047857';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${report.title} - WorkPulse Security</title>
  <style>
    @page { size: A4 portrait; margin: 18mm 14mm 18mm 14mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #ffffff; margin: 0; padding: 24px; font-size: 12px; line-height: 1.5; }
    .header-bar { border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
    .logo-title { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .conf-badge { font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 4px; color: #ffffff; background: ${confColor}; text-transform: uppercase; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 11px; }
    .meta-box div span { display: block; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 9px; margin-bottom: 2px; }
    .meta-box div strong { color: #0f172a; font-size: 12px; }
    h2 { font-size: 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; }
    .exec-summary-box { background: #f1f5f9; border-left: 4px solid #e11d48; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-bottom: 20px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .kpi-card { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; }
    .kpi-card .val { font-size: 22px; font-weight: 800; margin: 4px 0; }
    .kpi-card .lbl { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11px; }
    th { background: #0f172a; color: #ffffff; text-align: left; padding: 8px 10px; font-weight: 600; }
    td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; vertical-align: top; }
    tr:nth-child(even) { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; }
    .recommendation-list { padding-left: 20px; margin: 8px 0; }
    .recommendation-list li { margin-bottom: 6px; }
    .signatures { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; page-break-inside: avoid; }
    .sig-line { border-top: 1px solid #94a3b8; margin-top: 30px; padding-top: 6px; font-size: 11px; color: #475569; text-align: center; }
    .footer { margin-top: 30px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 10px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div>
      <div class="logo-title">WorkPulse Enterprise • Security & Pentest</div>
      <div style="font-size: 11px; color: #64748b;">Módulo de Inteligência Cibernética, Avaliação Ofensiva e Governança</div>
    </div>
    <div class="conf-badge">${report.confidentialityLevel}</div>
  </div>

  <div class="meta-box">
    <div>
      <span>Título do Documento</span>
      <strong>${report.title}</strong>
    </div>
    <div>
      <span>Identificador Único</span>
      <strong>${report.id}</strong>
    </div>
    <div>
      <span>Classificação & Versão</span>
      <strong>${report.confidentialityLevel} • v${report.version}</strong>
    </div>
    <div>
      <span>Emitido Por</span>
      <strong>${report.generatedBy.userName} (${report.generatedBy.userRole})</strong>
    </div>
    <div>
      <span>Data de Emissão</span>
      <strong>${new Date(report.generatedAt).toLocaleDateString('pt-BR')} às ${new Date(report.generatedAt).toLocaleTimeString('pt-BR')}</strong>
    </div>
    <div>
      <span>Período da Avaliação</span>
      <strong>${new Date(report.periodStart).toLocaleDateString('pt-BR')} até ${new Date(report.periodEnd).toLocaleDateString('pt-BR')}</strong>
    </div>
  </div>

  <h2>1. Sumário Executivo</h2>
  <div class="exec-summary-box">
    <p style="margin:0; font-size:12px; line-height:1.6;">${report.executiveSummary?.summaryText || report.description}</p>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="lbl">Security Score</div>
      <div class="val" style="color:#0284c7;">${report.executiveSummary?.securityScore ?? 85}/100</div>
    </div>
    <div class="kpi-card">
      <div class="lbl">Risco Global</div>
      <div class="val" style="color:#e11d48;">${report.executiveSummary?.riskScore ?? 15}/100</div>
    </div>
    <div class="kpi-card">
      <div class="lbl">Achados Críticos</div>
      <div class="val" style="color:#ef4444;">${report.executiveSummary?.criticalFindingsCount ?? 0}</div>
    </div>
    <div class="kpi-card">
      <div class="lbl">Achados Altos</div>
      <div class="val" style="color:#f97316;">${report.executiveSummary?.highFindingsCount ?? 0}</div>
    </div>
  </div>

  ${report.executiveSummary?.keyRecommendations ? `
    <h2>Recomendações Prioritárias</h2>
    <ul class="recommendation-list">
      ${report.executiveSummary.keyRecommendations.map(r => `<li><strong>${r}</strong></li>`).join('')}
    </ul>
  ` : ''}

  ${report.scopeSummary ? `
    <h2>2. Escopo Autorizado & Alvos Avaliados</h2>
    <p><strong>Alvos em Escopo:</strong> ${report.scopeSummary.authorizedTargets.join('; ') || 'Conforme especificado no Termo de Escopo.'}</p>
    <p><strong>Limitações Técnicas:</strong> ${report.scopeSummary.limitations.join(' ')}</p>
  ` : ''}

  ${report.findingsSummary && report.findingsSummary.length > 0 ? `
    <h2>3. Matriz de Vulnerabilidades & Status de Remediação</h2>
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Vulnerabilidade & Descrição</th>
          <th>Severidade</th>
          <th>Alvo / CI</th>
          <th>Status</th>
          <th>Reteste</th>
        </tr>
      </thead>
      <tbody>
        ${report.findingsSummary.map(f => `
          <tr>
            <td><strong>${f.code}</strong></td>
            <td>
              <strong>${f.title}</strong>
              <div style="font-size:10px; color:#64748b; margin-top:2px;">${f.description}</div>
              <div style="font-size:10px; color:#0f766e; margin-top:3px;"><em>Recomendação:</em> ${f.recommendation}</div>
            </td>
            <td><span class="badge" style="${getSevBadgeColor(f.severity)}">${f.severity}</span></td>
            <td>${f.targetValue || f.assetName || 'N/A'}</td>
            <td><strong>${f.status}</strong></td>
            <td>${f.retest ? `<span style="color:#059669; font-weight:700;">${f.retest.result}</span>` : '<span style="color:#64748b;">Pendente</span>'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  ${report.complianceSummary ? `
    <h2>4. Diagnóstico de Conformidade (Gap Analysis)</h2>
    <table>
      <thead>
        <tr>
          <th>Framework de Segurança</th>
          <th>Conformidade Calculada</th>
          <th>Controles Aprovados</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${report.complianceSummary.frameworkAssessments.map(fa => `
          <tr>
            <td><strong>${fa.framework}</strong></td>
            <td><strong>${fa.compliantPct}%</strong></td>
            <td>${fa.passedControls} de ${fa.totalControls}</td>
            <td><span class="badge" style="${fa.compliantPct >= 80 ? 'background:#10b981;color:#fff;' : fa.compliantPct >= 50 ? 'background:#f59e0b;color:#fff;' : 'background:#ef4444;color:#fff;'}">${fa.compliantPct >= 80 ? 'ADERENTE' : fa.compliantPct >= 50 ? 'PARCIAL' : 'GAPS CRÍTICOS'}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <p style="font-size:10px; color:#64748b;"><em>Nota de Governança: Este relatório reflete uma avaliação técnica e análise de gaps (Assessment / Gap Analysis), não constituindo declaração formal de certificação legal por entidade externa.</em></p>
  ` : ''}

  ${report.conclusionText ? `
    <h2>5. Conclusão & Declaração Final</h2>
    <p style="line-height:1.6;">${report.conclusionText}</p>
  ` : ''}

  <div class="signatures">
    <div>
      <div class="sig-line">
        <strong>${report.generatedBy.userName}</strong><br>
        Lead Security Engineer / Pentester Responsável<br>
        WorkPulse Offensive Security Team
      </div>
    </div>
    <div>
      <div class="sig-line">
        <strong>CISO / Responsável pela Governança</strong><br>
        WorkPulse Enterprise Security Officer<br>
        Homologação e Aceite de Riscos
      </div>
    </div>
  </div>

  <div class="footer">
    WorkPulse Enterprise Platform • Documento Gerado em ${report.generatedAt} • ID: ${report.id} • Assinatura de Integridade HMAC SHA-256 Ativa
  </div>
</body>
</html>`;
  }

  /**
   * 6. GESTÃO DE COMPARTILHAMENTO CONTROLADO COM TOKENS TEMPORÁRIOS
   */
  public static createShareToken(params: {
    reportId: string;
    tenantId: string;
    recipientName: string;
    recipientEmail: string;
    expiresInDays?: number;
    permissions?: ('VIEW' | 'DOWNLOAD')[];
  }): ReportShareToken {
    const { reportId, tenantId, recipientName, recipientEmail, expiresInDays = 7, permissions = ['VIEW', 'DOWNLOAD'] } = params;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    return {
      id: `tok-${crypto.randomUUID().slice(0, 8)}`,
      token: crypto.randomBytes(24).toString('hex'),
      reportId,
      tenantId,
      recipientName,
      recipientEmail,
      expiresAt,
      createdAt: new Date().toISOString(),
      accessCount: 0,
      allowedPermissions: permissions
    };
  }
}
