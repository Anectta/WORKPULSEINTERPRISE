import crypto from 'crypto';
import { SecurityFinding, SecuritySeverity, SecurityEvidence } from '../../src/types/security';

export interface RawFindingInput {
  tenantId: string;
  scanId?: string;
  pentestId?: string;
  vulnerabilityId?: string;
  linkedAssetId?: string;
  linkedCiId?: string;
  targetId?: string;
  title: string;
  category: string;
  severity: SecuritySeverity;
  cvssScore?: number;
  cvssVector?: string;
  cveId?: string;
  cweId?: string;
  affectedService?: string;
  affectedUrl?: string;
  description: string;
  impact: string;
  recommendation: string;
  evidence: {
    title: string;
    evidenceType: 'HTTP_EXCHANGE' | 'PORT_BANNER' | 'CONFIG_DUMP' | 'AGENT_DIFF' | 'SCREENSHOT' | 'SYSTEM_LOG';
    rawPayload: string;
  };
  createdBy: string;
}

export class FindingProcessor {
  /**
   * Gera fingerprint determinístico para evitar duplicatas em múltiplos scans
   */
  static generateFingerprint(input: RawFindingInput): string {
    const raw = [
      input.tenantId,
      input.linkedCiId || input.linkedAssetId || 'global',
      input.affectedUrl || input.affectedService || input.title,
      input.category,
      input.cveId || input.title.trim().toLowerCase()
    ].join('|');

    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Sanitiza payload de evidência para não armazenar tokens, credenciais ou dados sensíveis
   */
  static sanitizePayload(payload: string): string {
    if (!payload) return '';
    return payload
      .replace(/(Authorization:\s*Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1[REDACTED_BEARER_TOKEN]')
      .replace(/(Cookie:\s*)[^\r\n]+/gi, '$1[REDACTED_SESSION_COOKIES]')
      .replace(/(password|passwd|secret|api_key|token)["']?\s*[:=]\s*["']?[^"',\s}]+/gi, '$1: "[REDACTED_CREDENTIAL]"');
  }

  /**
   * Processa o input bruto, normaliza, sanitiza a evidência e calcula a contribuição ao risco
   */
  static processFinding(
    input: RawFindingInput,
    existingFindings: SecurityFinding[],
    codeSequence: number
  ): { finding: SecurityFinding; evidence: SecurityEvidence; isDuplicate: boolean } {
    const fingerprint = this.generateFingerprint(input);
    const sanitizedRaw = this.sanitizePayload(input.evidence.rawPayload);
    const payloadHash = crypto.createHash('sha256').update(sanitizedRaw).digest('hex');

    // Checagem de duplicata
    const existing = existingFindings.find(f => {
      if (f.tenantId !== input.tenantId) return false;
      const fFingerprint = crypto.createHash('sha256').update([
        f.tenantId,
        f.linkedCiId || f.linkedAssetId || 'global',
        f.affectedUrl || f.affectedService || f.title,
        f.category,
        f.cveId || f.title.trim().toLowerCase()
      ].join('|')).digest('hex');
      return fFingerprint === fingerprint && f.status !== 'RESOLVED' && f.status !== 'FALSE_POSITIVE';
    });

    const cvss = input.cvssScore ?? (
      input.severity === 'CRITICAL' ? 9.5 :
      input.severity === 'HIGH' ? 7.8 :
      input.severity === 'MEDIUM' ? 5.4 :
      input.severity === 'LOW' ? 2.5 : 0.0
    );

    // Contribuição individual de risco
    const severityWeight =
      input.severity === 'CRITICAL' ? 1.5 :
      input.severity === 'HIGH' ? 1.0 :
      input.severity === 'MEDIUM' ? 0.6 :
      input.severity === 'LOW' ? 0.2 : 0.05;

    const riskContribution = parseFloat((cvss * severityWeight).toFixed(2));

    const findingId = existing ? existing.id : crypto.randomUUID();
    const evidenceId = crypto.randomUUID();

    const finding: SecurityFinding = {
      id: findingId,
      tenantId: input.tenantId,
      code: existing ? existing.code : `SEC-FND-${String(codeSequence).padStart(5, '0')}`,
      scanId: input.scanId,
      pentestId: input.pentestId,
      vulnerabilityId: input.vulnerabilityId,
      linkedAssetId: input.linkedAssetId,
      linkedCiId: input.linkedCiId,
      targetId: input.targetId,
      title: input.title,
      category: input.category,
      severity: input.severity,
      cvssScore: cvss,
      cvssVector: input.cvssVector,
      cveId: input.cveId,
      cweId: input.cweId,
      affectedService: input.affectedService,
      affectedUrl: input.affectedUrl,
      description: input.description,
      impact: input.impact,
      recommendation: input.recommendation,
      status: existing ? existing.status : 'NEW',
      assignedToUserId: existing?.assignedToUserId,
      assignedToName: existing?.assignedToName,
      remediationDeadline: existing?.remediationDeadline,
      resolvedAt: existing?.resolvedAt,
      ticketLinkId: existing?.ticketLinkId,
      riskScoreContribution: riskContribution,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: input.createdBy
    };

    const evidence: SecurityEvidence = {
      id: evidenceId,
      findingId: finding.id,
      tenantId: input.tenantId,
      title: input.evidence.title,
      evidenceType: input.evidence.evidenceType,
      rawPayload: sanitizedRaw,
      payloadSha256: payloadHash,
      sanitizedSensitiveData: true,
      collectedAt: new Date().toISOString(),
      collectedBy: 'SecurityEngine/2.0'
    };

    return {
      finding,
      evidence,
      isDuplicate: !!existing
    };
  }

  /**
   * Cálculo de Risk Score Ponderado da Infraestrutura (0 a 100)
   */
  static calculateInfrastructureRiskScore(
    activeFindings: SecurityFinding[],
    layer: string = 'datacenter',
    criticality: string = 'alta',
    hasFirewallOrIps: boolean = true
  ): number {
    if (!activeFindings || activeFindings.length === 0) return 0;

    const layerWeight =
      layer === 'borda' ? 1.4 :
      layer === 'dmz' ? 1.2 :
      layer === 'datacenter' ? 1.0 : 0.7;

    const critWeight =
      criticality === 'critica' ? 1.3 :
      criticality === 'alta' ? 1.1 :
      criticality === 'media' ? 1.0 : 0.8;

    const controlFactor = hasFirewallOrIps ? 0.20 : 0.0;

    let scoreSum = 0;
    for (const f of activeFindings) {
      if (f.status === 'RESOLVED' || f.status === 'FALSE_POSITIVE' || f.status === 'RISK_ACCEPTED') {
        continue;
      }
      scoreSum += f.riskScoreContribution * layerWeight * critWeight;
    }

    const finalScore = Math.min(100, Math.round(scoreSum * (1 - controlFactor)));
    return finalScore;
  }
}
