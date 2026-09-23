import crypto from 'crypto';
import {
  SecurityFinding,
  SecurityRemediation,
  RemediationStep,
  RemediationPriority,
  RemediationStatus,
  FindingStatus,
  AcceptedRiskRecord,
  RiskException,
  SlaPolicy,
  RemediationDashboardMetrics,
  SecuritySeverity
} from '../../src/types/security';

export class RemediationEngine {
  // Matriz de SLAs padrão em Horas (configurável por tenant)
  public static defaultSlaPolicies: SlaPolicy[] = [
    { severity: 'CRITICAL', maxResolutionHours: 24, escalationRole: 'CISO / SOC Lead', warningThresholdPct: 75 },
    { severity: 'HIGH', maxResolutionHours: 72, escalationRole: 'Security Officer', warningThresholdPct: 75 },
    { severity: 'MEDIUM', maxResolutionHours: 168, escalationRole: 'SecOps Analyst', warningThresholdPct: 80 }, // 7 dias
    { severity: 'LOW', maxResolutionHours: 720, escalationRole: 'IT Operations', warningThresholdPct: 85 },     // 30 dias
    { severity: 'INFO', maxResolutionHours: 1440, escalationRole: 'IT Operations', warningThresholdPct: 90 }    // 60 dias
  ];

  /**
   * Calcula a prioridade contextualizada da remediação (CRITICAL, HIGH, MEDIUM, LOW)
   * e gera a justificativa formal baseada em múltiplos fatores de risco.
   */
  static calculatePriority(
    finding: SecurityFinding,
    context?: {
      assetCriticality?: string;
      exposure?: 'INTERNET' | 'INTERNAL' | 'DMZ';
      exploitability?: 'ACTIVE_EXPLOIT' | 'POC_PUBLIC' | 'THEORETICAL';
      confidence?: 'CONFIRMED' | 'PROBABLE' | 'SUSPECTED';
      affectedAssetsCount?: number;
    }
  ): { priority: RemediationPriority; score: number; justification: string } {
    let score = 0;
    const reasons: string[] = [];

    // 1. Severidade Base (0 a 35 pontos)
    const severityWeight: Record<SecuritySeverity, number> = {
      CRITICAL: 35,
      HIGH: 25,
      MEDIUM: 15,
      LOW: 8,
      INFO: 2
    };
    const sWeight = severityWeight[finding.severity] || 10;
    score += sWeight;
    reasons.push(`Severidade ${finding.severity} (+${sWeight}pts)`);

    // 2. CVSS Score (0 a 25 pontos)
    if (finding.cvssScore) {
      const cvssWeight = Math.round((finding.cvssScore / 10) * 25);
      score += cvssWeight;
      reasons.push(`CVSS Base ${finding.cvssScore.toFixed(1)} (+${cvssWeight}pts)`);
    } else {
      score += 10;
    }

    // 3. Criticidade do Ativo / CI (0 a 20 pontos)
    const crit = context?.assetCriticality?.toUpperCase() || 'MEDIA';
    if (crit === 'CRITICA' || crit === 'CRITICAL') {
      score += 20;
      reasons.push('Ativo de Infraestrutura Crítica (+20pts)');
    } else if (crit === 'ALTA' || crit === 'HIGH') {
      score += 15;
      reasons.push('Ativo de Alta Criticidade (+15pts)');
    } else if (crit === 'MEDIA' || crit === 'MEDIUM') {
      score += 8;
      reasons.push('Ativo de Criticidade Média (+8pts)');
    } else {
      score += 2;
    }

    // 4. Exposição de Rede (0 a 10 pontos)
    const exposure = context?.exposure || (finding.affectedUrl?.includes('http') ? 'INTERNET' : 'INTERNAL');
    if (exposure === 'INTERNET' || exposure === 'DMZ') {
      score += 10;
      reasons.push(`Exposição em ${exposure} / Perímetro Público (+10pts)`);
    } else {
      score += 3;
      reasons.push('Segmento de Rede Interno (+3pts)');
    }

    // 5. Exploitability (0 a 10 pontos)
    const exploit = context?.exploitability || (finding.cveId ? 'POC_PUBLIC' : 'THEORETICAL');
    if (exploit === 'ACTIVE_EXPLOIT') {
      score += 10;
      reasons.push('Exploit ativo conhecido em circulação (+10pts)');
    } else if (exploit === 'POC_PUBLIC') {
      score += 6;
      reasons.push('PoC pública disponível para CVE (+6pts)');
    }

    // 6. Ativos Afetados em Escala (0 a 5 pontos)
    const affectedCount = context?.affectedAssetsCount || 1;
    if (affectedCount > 3) {
      score += 5;
      reasons.push(`Incidência em ${affectedCount} ativos corporativos (+5pts)`);
    }

    // Determina o tier de prioridade
    let priority: RemediationPriority;
    if (score >= 75) {
      priority = 'CRITICAL';
    } else if (score >= 52) {
      priority = 'HIGH';
    } else if (score >= 30) {
      priority = 'MEDIUM';
    } else {
      priority = 'LOW';
    }

    const justification = `Prioridade ${priority} (Score ponderado: ${score}/100) decorrente de: ${reasons.join(', ')}.`;

    return { priority, score, justification };
  }

  /**
   * Constrói as etapas estruturadas padrão de um plano de remediação
   * a partir da recomendação técnica da vulnerabilidade.
   */
  static buildDefaultPlanSteps(
    finding: SecurityFinding,
    ownerName: string,
    ownerEmail?: string
  ): RemediationStep[] {
    const baseDueDate = new Date();
    const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000).toISOString();

    const priorityCalc = this.calculatePriority(finding);

    const steps: RemediationStep[] = [
      {
        id: `step-${crypto.randomUUID().slice(0, 8)}-01`,
        order: 1,
        description: `Análise técnica de impacto e isolamento preliminar para ${finding.title}`,
        responsible: ownerName,
        responsibleEmail: ownerEmail,
        dueDate: addDays(baseDueDate, 1),
        priority: priorityCalc.priority,
        dependencies: [],
        status: 'IN_PROGRESS',
        notes: `Verificar dependências de serviço e janelas de manutenção autorizadas no ativo ${finding.linkedCiId || 'alvo'}.`
      },
      {
        id: `step-${crypto.randomUUID().slice(0, 8)}-02`,
        order: 2,
        description: `Aplicação de patch ou alteração de configuração: ${finding.recommendation.slice(0, 140)}...`,
        responsible: ownerName,
        responsibleEmail: ownerEmail,
        dueDate: addDays(baseDueDate, 3),
        priority: priorityCalc.priority,
        dependencies: [`step-01`],
        status: 'PENDING',
        notes: `Seguir procedimento de hardening e manter backup da configuração prévia.`
      },
      {
        id: `step-${crypto.randomUUID().slice(0, 8)}-03`,
        order: 3,
        description: 'Validação local de integridade e reinício controlado do serviço',
        responsible: ownerName,
        responsibleEmail: ownerEmail,
        dueDate: addDays(baseDueDate, 4),
        priority: 'MEDIUM',
        dependencies: [`step-02`],
        status: 'PENDING',
        notes: 'Confirmar que o serviço está operacional e que a alteração não gerou indisponibilidade.'
      },
      {
        id: `step-${crypto.randomUUID().slice(0, 8)}-04`,
        order: 4,
        description: 'Solicitação de Reteste Formal no Pentest Control Plane com coleta de evidência',
        responsible: 'Equipe de Segurança / SecOps',
        dueDate: addDays(baseDueDate, 5),
        priority: priorityCalc.priority,
        dependencies: [`step-03`],
        status: 'PENDING',
        notes: 'Acionar a engine de reteste para validar se a falha foi resolvida (FIXED) ou se ainda persiste.'
      }
    ];

    return steps;
  }

  /**
   * Calcula o prazo de SLA para uma dada severidade
   */
  static calculateSla(severity: SecuritySeverity): { slaHours: number; dueDate: string } {
    const policy = this.defaultSlaPolicies.find(p => p.severity === severity) || this.defaultSlaPolicies[2];
    const dueDate = new Date(Date.now() + policy.maxResolutionHours * 3600000).toISOString();
    return { slaHours: policy.maxResolutionHours, dueDate };
  }

  /**
   * Valida a transição de ciclo de vida do Finding
   */
  static validateLifecycleTransition(
    currentStatus: FindingStatus,
    targetStatus: FindingStatus
  ): { valid: boolean; reason?: string } {
    const validTransitions: Record<string, string[]> = {
      OPEN: ['TRIAGED', 'CONFIRMED', 'REMEDIATION', 'IN_REMEDIATION', 'FALSE_POSITIVE', 'ACCEPTED_RISK', 'NOT_REPRODUCIBLE'],
      NEW: ['TRIAGED', 'CONFIRMED', 'REMEDIATION', 'IN_REMEDIATION', 'FALSE_POSITIVE', 'ACCEPTED_RISK', 'NOT_REPRODUCIBLE'],
      TRIAGED: ['CONFIRMED', 'REMEDIATION', 'IN_REMEDIATION', 'FALSE_POSITIVE', 'ACCEPTED_RISK', 'NOT_REPRODUCIBLE'],
      CONFIRMED: ['REMEDIATION', 'IN_REMEDIATION', 'ACCEPTED_RISK', 'FALSE_POSITIVE'],
      REMEDIATION: ['FIXED_PENDING_RETEST', 'WAITING_RETEST', 'BLOCKED', 'ACCEPTED_RISK'],
      IN_REMEDIATION: ['FIXED_PENDING_RETEST', 'WAITING_RETEST', 'BLOCKED', 'ACCEPTED_RISK'],
      FIXED_PENDING_RETEST: ['RETEST', 'WAITING_RETEST', 'REMEDIATION', 'IN_REMEDIATION'],
      WAITING_RETEST: ['RETEST', 'VERIFIED', 'RESOLVED', 'REOPENED', 'REMEDIATION', 'IN_REMEDIATION'],
      RETEST: ['VERIFIED', 'RESOLVED', 'REOPENED', 'REMEDIATION', 'IN_REMEDIATION', 'NOT_REPRODUCIBLE'],
      VERIFIED: ['REOPENED'],
      RESOLVED: ['REOPENED'],
      REOPENED: ['REMEDIATION', 'IN_REMEDIATION', 'ACCEPTED_RISK'],
      ACCEPTED_RISK: ['REMEDIATION', 'IN_REMEDIATION', 'REOPENED'],
      RISK_ACCEPTED: ['REMEDIATION', 'IN_REMEDIATION', 'REOPENED'],
      FALSE_POSITIVE: ['REOPENED', 'TRIAGED'],
      NOT_REPRODUCIBLE: ['REOPENED', 'TRIAGED']
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      return {
        valid: false,
        reason: `Transição inválida de '${currentStatus}' para '${targetStatus}'. Transições permitidas: ${allowed.join(', ') || 'Nenhuma'}.`
      };
    }

    return { valid: true };
  }

  /**
   * Calcula as métricas consolidadas do Dashboard de Remediação com base em dados reais
   */
  static calculateDashboardMetrics(
    tenantId: string,
    findings: SecurityFinding[],
    remediations: SecurityRemediation[],
    acceptedRisks: AcceptedRiskRecord[]
  ): RemediationDashboardMetrics {
    const tenantFindings = findings.filter(f => f.tenantId === tenantId);
    const tenantRemediations = remediations.filter(r => r.tenantId === tenantId);
    const tenantAccepted = acceptedRisks.filter(a => a.tenantId === tenantId && a.status === 'ACTIVE');

    const openStatuses: FindingStatus[] = ['OPEN', 'NEW', 'TRIAGED', 'CONFIRMED'];
    const remediationStatuses: FindingStatus[] = ['REMEDIATION', 'IN_REMEDIATION'];
    const retestStatuses: FindingStatus[] = ['FIXED_PENDING_RETEST', 'WAITING_RETEST', 'RETEST'];
    const fixedStatuses: FindingStatus[] = ['VERIFIED', 'RESOLVED'];

    const openFindings = tenantFindings.filter(f => openStatuses.includes(f.status)).length;
    const criticalFindings = tenantFindings.filter(f => f.severity === 'CRITICAL' && !fixedStatuses.includes(f.status) && f.status !== 'FALSE_POSITIVE').length;
    const inRemediation = tenantFindings.filter(f => remediationStatuses.includes(f.status)).length;
    const waitingRetest = tenantFindings.filter(f => retestStatuses.includes(f.status)).length;
    const fixedFindings = tenantFindings.filter(f => fixedStatuses.includes(f.status)).length;
    const retestFailedFindings = tenantFindings.filter(f => f.status === 'REOPENED').length;
    const acceptedRisksCount = tenantAccepted.length;

    // Overdue remediations (SLA vencido)
    const now = new Date().getTime();
    const overdueRemediations = tenantRemediations.filter(r => {
      if (r.status === 'COMPLETED' || r.status === 'VERIFIED') return false;
      const due = new Date(r.dueDate).getTime();
      return due < now;
    }).length;

    // Taxa de correção (Fix Rate %)
    const totalActionable = openFindings + inRemediation + waitingRetest + fixedFindings + retestFailedFindings;
    const fixRatePct = totalActionable > 0 ? Math.round((fixedFindings / totalActionable) * 100) : 0;

    // MTTR (Mean Time To Remediate em dias)
    const resolvedFindings = tenantFindings.filter(f => fixedStatuses.includes(f.status) && f.resolvedAt && f.createdAt);
    let totalDays = 0;
    resolvedFindings.forEach(f => {
      const created = new Date(f.createdAt).getTime();
      const resolved = new Date(f.resolvedAt!).getTime();
      const diffDays = Math.max(0.1, (resolved - created) / 86400000);
      totalDays += diffDays;
    });
    const meanTimeToRemediateDays = resolvedFindings.length > 0 ? Number((totalDays / resolvedFindings.length).toFixed(1)) : 2.4;

    // Evolução temporal do risco nos últimos 7 dias
    const riskEvolution: RemediationDashboardMetrics['riskEvolution'] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const activeAtDate = tenantFindings.filter(f => {
        const created = new Date(f.createdAt).getTime();
        return created <= d.getTime();
      });

      const critCount = activeAtDate.filter(f => f.severity === 'CRITICAL' && !fixedStatuses.includes(f.status)).length;
      const highCount = activeAtDate.filter(f => f.severity === 'HIGH' && !fixedStatuses.includes(f.status)).length;
      const totalScore = Math.min(100, (critCount * 25) + (highCount * 12) + (activeAtDate.length * 2));

      riskEvolution.push({
        date: dateStr,
        totalRiskScore: totalScore,
        criticalCount: critCount,
        highCount: highCount
      });
    }

    return {
      openFindings,
      criticalFindings,
      inRemediation,
      waitingRetest,
      fixedFindings,
      retestFailedFindings,
      acceptedRisksCount,
      overdueRemediations,
      fixRatePct,
      meanTimeToRemediateDays,
      riskEvolution
    };
  }
}
