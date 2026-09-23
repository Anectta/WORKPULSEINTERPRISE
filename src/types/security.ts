/**
 * WORKPULSE ENTERPRISE — SECURITY & PENTEST
 * Modelagem de Tipos e Contratos Técnicos (Etapa 2)
 */

export type SecuritySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type FindingStatus =
  | 'OPEN'
  | 'NEW'
  | 'TRIAGED'
  | 'CONFIRMED'
  | 'REMEDIATION'
  | 'IN_REMEDIATION'
  | 'FIXED_PENDING_RETEST'
  | 'WAITING_RETEST'
  | 'RETEST'
  | 'VERIFIED'
  | 'RESOLVED'
  | 'REOPENED'
  | 'ACCEPTED_RISK'
  | 'RISK_ACCEPTED'
  | 'FALSE_POSITIVE'
  | 'NOT_REPRODUCIBLE';

export type ExecutionStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'AUTHORIZED'
  | 'QUEUED'
  | 'RUNNING'
  | 'PARTIAL'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export type TargetType =
  | 'ASSET_CI'
  | 'DOMAIN_FQDN'
  | 'IP_ADDRESS'
  | 'CIDR_RANGE'
  | 'WEB_URL'
  | 'API_ENDPOINT';

export type ScanType =
  | 'ASSET_BASELINE'
  | 'NETWORK_PORTS'
  | 'WEB_SECURITY'
  | 'API_SECURITY'
  | 'SSL_TLS'
  | 'VULNERABILITY_CORRELATION';

export type PentestMethodology =
  | 'OWASP_WSTG'
  | 'PTES'
  | 'NIST_800_115'
  | 'BLACK_BOX'
  | 'GREY_BOX'
  | 'WHITE_BOX';

export type EvidenceType =
  | 'HTTP_EXCHANGE'
  | 'PORT_BANNER'
  | 'CONFIG_DUMP'
  | 'AGENT_DIFF'
  | 'SCREENSHOT'
  | 'SYSTEM_LOG';

export type RetestResult =
  | 'FIXED'
  | 'STILL_VULNERABLE'
  | 'PARTIALLY_FIXED'
  | 'NOT_REPRODUCIBLE'
  | 'INCONCLUSIVE'
  | 'RESOLVED'
  | 'PARTIALLY_REMEDIATED';

export interface SecurityVulnerability {
  id: string;
  cveId?: string;
  cweId?: string;
  title: string;
  summary: string;
  baseSeverity: SecuritySeverity;
  baseCvssScore: number;
  cvssVector?: string;
  remediationGuidance: string;
  references?: string[];
  publishedAt?: string;
  updatedAt?: string;
}

export interface SecurityScope {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  authorizedByUserId: string;
  authorizedByName: string;
  authorizedByEmail: string;
  authorizedAt: string;
  validFrom: string;
  validUntil: string;
  authorizationTermsVersion: string;
  authorizationDocumentHash: string; // SHA-256
  authorizedIpOrigin: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface SecurityPolicy {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  maxRequestsPerSecond: number;
  maxConcurrentTargets: number;
  allowedTimeWindows: {
    weekdays: string[];
    weekends: string[];
  };
  connectionTimeoutMs: number;
  safeModeOnly: boolean;
  userAgentOverride?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityTarget {
  id: string;
  scopeId: string;
  tenantId: string;
  targetType: TargetType;
  targetValue: string;
  isInScope: boolean; // TRUE = in-scope, FALSE = out-of-scope
  linkedAssetId?: string;
  linkedCiId?: string;
  ciId?: string;
  ciName?: string;
  criticality: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA';
  validationStatus: 'PENDING' | 'VALIDATED_DNS' | 'REJECTED_SSRF';
  resolvedIps?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityScan {
  id: string;
  tenantId: string;
  code: string; // Ex: SCN-2026-0089
  title: string;
  scanType: ScanType;
  scopeId: string;
  policyId: string;
  status: ExecutionStatus;
  triggeredByUserId: string;
  triggeredByName: string;
  scheduledFor?: string;
  startedAt?: string;
  finishedAt?: string;
  findingsCountSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  errorLog?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityPentest {
  id: string;
  tenantId: string;
  code: string; // Ex: PNT-2026-0012
  title: string;
  objective: string;
  methodology: PentestMethodology;
  scopeId: string;
  policyId: string;
  leadPentesterId: string;
  leadPentesterName: string;
  status: ExecutionStatus;
  startDate: string;
  endDate: string;
  authorizationToken: string;
  executiveSummary?: string;
  conclusion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityExecution {
  id: string;
  tenantId: string;
  scanId?: string;
  pentestId?: string;
  engineWorkerId?: string;
  status: ExecutionStatus;
  progressPct: number;
  currentTarget?: string;
  currentModule?: string;
  heartbeatAt?: string;
  startedAt?: string;
  completedAt?: string;
  metrics: {
    requestsSent: number;
    bytesTransferred: number;
    targetsProbed: number;
  };
  errorMessage?: string;
  createdAt: string;
}

export interface SecurityFinding {
  id: string;
  tenantId: string;
  code: string; // Ex: SEC-FND-00431
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
  affectedAssetName?: string;
  confidence?: 'CONFIRMED' | 'HIGH' | 'MEDIUM' | 'LOW';
  riskScore?: number;
  description: string;
  impact: string;
  recommendation: string;
  remediationGuidance?: string;
  status: FindingStatus;
  assignedToUserId?: string;
  assignedToName?: string;
  remediationDeadline?: string;
  resolvedAt?: string;
  ticketLinkId?: string;
  incidentId?: string;
  riskScoreContribution: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface SecurityEvidence {
  id: string;
  findingId: string;
  tenantId: string;
  title: string;
  evidenceType: EvidenceType;
  rawPayload?: string;
  storagePath?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
  payloadSha256: string;
  sanitizedSensitiveData: boolean;
  collectedAt: string;
  collectedBy: string;
}

export interface SecurityRetest {
  id: string;
  findingId: string;
  tenantId: string;
  retestCode: string; // Ex: RET-00431-01
  requestedByUserId: string;
  requestedByName: string;
  executedByType: 'AUTOMATED_ENGINE' | 'MANUAL_ANALYST';
  executedByName: string;
  previousStatus: FindingStatus;
  resultingStatus: FindingStatus;
  result: RetestResult;
  retestEvidenceId?: string;
  technicalNotes: string;
  executedAt: string;
}

export interface SecurityAuditLog {
  id: string;
  tenantId: string;
  actorUserId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  ipOrigin: string;
  userAgent?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  auditHmacSha256: string;
  createdAt: string;
}

export interface SecurityDashboardMetrics {
  overallRiskScore: number; // 0 a 100
  monitoredAssetsCount: number;
  criticalAssetsCount: number;
  findingsBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  findingsByStatus: {
    open: number;
    inRemediation: number;
    waitingRetest: number;
    resolved: number;
  };
  recentScans: SecurityScan[];
  topVulnerableCIs: Array<{
    ciId: string;
    ciName: string;
    ciType: string;
    criticality: string;
    findingCount: number;
    highestSeverity: SecuritySeverity;
    riskScore: number;
  }>;
}

// ==========================================
// ETAPA 5: PENTEST CONTROL PLANE & RUNNER TYPES
// ==========================================

export type PentestProjectStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export type PentestAuthStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'REVOKED';

export type TestProfileCode =
  | 'SAFE'
  | 'STANDARD'
  | 'WEB'
  | 'API'
  | 'NETWORK'
  | 'CONFIGURATION'
  | 'CUSTOM';

export interface EmergencyContact {
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface RulesOfEngagement {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  allowedHoursWindow: {
    start: string; // Ex: '20:00'
    end: string;   // Ex: '06:00'
  };
  allowedDays: string[]; // ['MONDAY', 'TUESDAY', ...]
  maxImpactLevel: 'LOW' | 'CONTROLLED' | 'MEDIUM' | 'HIGH';
  maxSpeedRps: number; // Ex: 5
  maxRequestsTotal: number; // Ex: 5000
  maxConcurrency: number; // Ex: 2
  allowedTestCategories: string[];
  forbiddenTestTypes: string[];
  manualApprovalRequired: boolean;
  emergencyContacts: EmergencyContact[];
  abortProcedure: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestProfile {
  id: string;
  tenantId: string;
  code: TestProfileCode;
  name: string;
  description: string;
  categories: string[];
  enabledTests: string[];
  blockedTests: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  expectedImpact: string;
  limits: {
    maxRps: number;
    timeoutMs: number;
    maxConcurrency: number;
  };
  applicablePolicyId?: string;
  createdAt: string;
}

export interface PentestAuthorization {
  id: string;
  tenantId: string;
  projectId?: string;
  scopeId: string;
  authorizedByUserId: string;
  authorizedByName: string;
  authorizedByEmail: string;
  authorizedByRole: string;
  responsibleOrganization: string;
  authorizedFrom: string;
  authorizedUntil: string;
  authorizedTargets: string[];
  restrictions: string[];
  notes?: string;
  documentEvidenceHash: string; // SHA-256
  status: PentestAuthStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionPlan {
  id: string; // pentest_execution_id, Ex: 'pex-2026-0089'
  tenantId: string;
  projectId: string;
  scopeId: string;
  authorizationId: string;
  roeId: string;
  testProfileId: string;
  targetIds: string[];
  executionWindow: {
    start: string;
    end: string;
  };
  engine: string;
  runner: 'LOCAL_ISOLATED' | 'CONTAINER_WORKER' | 'REMOTE_AGENT';
  priorities: string[];
  limits: {
    maxRps: number;
    timeoutMs: number;
    maxConcurrency: number;
    maxTotalRequests: number;
  };
  allowedParameters: Record<string, any>;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: {
    userId: string;
    userName: string;
    userEmail: string;
    approvedAt: string;
    justification: string;
    ipOrigin: string;
  };
  createdAt: string;
}

export interface PentestProject {
  id: string;
  tenantId: string;
  code: string; // Ex: PNT-2026-0001
  name: string;
  description: string;
  objective: string;
  methodology: PentestMethodology;
  status: PentestProjectStatus;
  scopeId: string;
  authorizationId?: string;
  roeId?: string;
  testProfileId?: string;
  currentExecutionId?: string;
  targetIds: string[];
  createdBy: {
    userId: string;
    userName: string;
    userEmail: string;
  };
  approvedBy?: {
    userId: string;
    userName: string;
    userEmail: string;
    approvedAt: string;
    justification: string;
    ipOrigin: string;
  };
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LiveExecutionLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';
  message: string;
  category?: string;
  target?: string;
}

export interface PentestExecutionState {
  executionId: string;
  projectId: string;
  status: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'EMERGENCY_STOPPED';
  currentTarget?: string;
  currentStep: string;
  currentTestCategory: string;
  progressPct: number;
  testsExecuted: number;
  testsTotal: number;
  findingsCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  errors: string[];
  warnings: string[];
  throughputRps: number;
  startedAt?: string;
  durationSeconds: number;
  runnerId: string;
  engineName: string;
  killSwitchTriggered: boolean;
  killSwitchReason?: string;
  liveLogs: LiveExecutionLog[];
}

// ==========================================
// ETAPA 6: REMEDIAÇÃO, HARDENING E RETESTE
// ==========================================

export type RemediationStatus =
  | 'OPEN'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'WAITING_RETEST'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'ACCEPTED_RISK';

export type RemediationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface RemediationStep {
  id: string;
  order: number;
  description: string;
  responsible: string;
  responsibleEmail?: string;
  dueDate: string;
  priority: RemediationPriority;
  dependencies: string[]; // step IDs
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  evidence?: string;
  notes?: string;
  completedAt?: string;
}

export interface SecurityRemediation {
  id: string;
  tenantId: string;
  findingId: string;
  findingCode: string;
  assetId?: string;
  ciId?: string;
  ciName?: string;
  title: string;
  description: string;
  recommendation: string;
  priority: RemediationPriority;
  priorityJustification: string;
  status: RemediationStatus;
  owner: {
    userId: string;
    userName: string;
    userEmail: string;
  };
  ownerName?: string;
  dueDate: string;
  dueAt?: string;
  slaHours: number;
  slaBreached: boolean;
  ticketId?: string;
  ticketCode?: string;
  steps: RemediationStep[];
  createdBy: {
    userId: string;
    userName: string;
    userEmail: string;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  verifiedAt?: string;
}

export interface AcceptedRiskRecord {
  id: string;
  tenantId: string;
  findingId: string;
  findingCode: string;
  justification: string;
  businessImpactJustification: string;
  responsible: {
    userId: string;
    userName: string;
    userEmail: string;
    role: string;
  };
  approvedBy: {
    userId: string;
    userName: string;
    userEmail: string;
    role: string;
    approvedAt: string;
  };
  acceptedAt: string;
  validUntil: string;
  reviewDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  compensatoryControls: string[];
  auditLogId?: string;
}

export interface RiskException {
  id: string;
  tenantId: string;
  findingId: string;
  findingCode: string;
  justification: string;
  responsible: {
    userId: string;
    userName: string;
    userEmail: string;
  };
  approvedBy: {
    userId: string;
    userName: string;
    userEmail: string;
    role: string;
    approvedAt: string;
  };
  startDate: string;
  expiresAt: string;
  compensatoryControls: string;
  notes?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVIEW_REQUIRED';
}

export type HardeningCategory =
  | 'OPERATING_SYSTEM'
  | 'NETWORK'
  | 'WEB'
  | 'API'
  | 'DATABASE'
  | 'ENDPOINT';

export type ControlValidationResult =
  | 'PASS'
  | 'FAIL'
  | 'WARNING'
  | 'NOT_APPLICABLE'
  | 'UNKNOWN';

export interface SecurityControl {
  controlId: string;
  name: string;
  category: HardeningCategory;
  description: string;
  requirement: string;
  validationMethod: 'AGENT_TELEMETRY' | 'HTTP_PROBE' | 'PORT_SCAN' | 'CONFIG_AUDIT' | 'SSL_HANDSHAKE';
  expectedResult: string;
  severity: SecuritySeverity;
  remediation: string;
  reference: string; // Ex: 'CIS Benchmark v8', 'OWASP ASVS v4.0', 'NIST SP 800-53'
}

export interface HardeningBaseline {
  id: string;
  name: string;
  version: string;
  category: HardeningCategory;
  policyVersion: string;
  description: string;
  targetEnvironment: string;
  controls: SecurityControl[];
  status: 'ACTIVE' | 'DRAFT' | 'DEPRECATED';
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceEvaluationResult {
  id: string;
  tenantId: string;
  baselineId: string;
  baselineName: string;
  targetId: string;
  ciId?: string;
  ciName?: string;
  evaluatedAt: string;
  overallCompliancePct: number;
  totalControls: number;
  passedControls: number;
  failedControls: number;
  warningControls: number;
  controlResults: Array<{
    controlId: string;
    controlName: string;
    category: HardeningCategory;
    status: ControlValidationResult;
    actualValue: string;
    expectedValue: string;
    details: string;
    findingIdGenerated?: string;
  }>;
}

export interface RetestComparison {
  id?: string;
  tenantId?: string;
  retestId: string;
  retestCode: string;
  findingId: string;
  executedAt: string;
  executedBy: string;
  outcome: RetestResult;
  previous: {
    status: FindingStatus;
    severity: SecuritySeverity;
    riskScore: number;
    evidencePayload: string;
    evidenceDate: string;
  };
  current: {
    status: FindingStatus;
    severity: SecuritySeverity;
    riskScore: number;
    evidencePayload: string;
    evidenceDate: string;
  };
  riskDelta: number; // e.g. -45 points
  technicalNotes: string;
  summary: string;
  // Campos de compatibilidade para renderização na UI
  retestResult?: RetestResult;
  beforeState?: {
    status: FindingStatus;
    riskScore: number;
    evidenceSummary: string;
  };
  afterState?: {
    status: FindingStatus;
    riskScore: number;
    evidenceSummary: string;
  };
  riskScoreDelta?: number;
}

export interface RiskScoreHistoryItem {
  id: string;
  findingId: string;
  timestamp: string;
  score: number;
  severity: SecuritySeverity;
  factorBreakdown: {
    baseCvss: number;
    criticalityMultiplier: number;
    exposureFactor: number;
    remediationDiscount: number;
  };
  triggerReason: string;
}

export interface SlaPolicy {
  severity: SecuritySeverity;
  maxResolutionHours: number;
  escalationRole: string;
  warningThresholdPct: number;
}

export interface RemediationDashboardMetrics {
  openFindings: number;
  criticalFindings: number;
  inRemediation: number;
  waitingRetest: number;
  fixedFindings: number;
  retestFailedFindings: number;
  acceptedRisksCount: number;
  overdueRemediations: number;
  fixRatePct: number;
  meanTimeToRemediateDays: number;
  riskEvolution: Array<{
    date: string;
    totalRiskScore: number;
    criticalCount: number;
    highCount: number;
  }>;
}

// ==========================================
// ETAPA 7: RELATÓRIOS, COMPLIANCE & EXECUTIVO
// ==========================================

export type SecurityReportType =
  | 'SECURITY_OVERVIEW'
  | 'PENTEST'
  | 'VULNERABILITY'
  | 'REMEDIATION'
  | 'ASSET_SECURITY'
  | 'COMPLIANCE'
  | 'EXECUTIVE'
  | 'INCIDENT_SECURITY';

export type ConfidentialityClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

export interface ReportShareToken {
  id: string;
  token: string;
  reportId: string;
  tenantId: string;
  recipientName: string;
  recipientEmail: string;
  expiresAt: string;
  createdAt: string;
  revokedAt?: string;
  isRevoked?: boolean;
  lastAccessedAt?: string;
  accessCount: number;
  allowedPermissions: ('VIEW' | 'DOWNLOAD')[];
}

export interface SecurityReport {
  id: string;
  tenantId: string;
  type: SecurityReportType;
  title: string;
  description: string;
  projectId?: string;
  pentestId?: string;
  scanId?: string;
  periodStart: string;
  periodEnd: string;
  generatedBy: {
    userId: string;
    userName: string;
    userEmail: string;
    userRole: string;
  };
  generatedAt: string;
  status: 'DRAFT' | 'GENERATING' | 'GENERATED' | 'ARCHIVED';
  version: string;
  confidentialityLevel: ConfidentialityClassification;
  sections: string[];
  shareTokens?: ReportShareToken[];
  executiveSummary?: {
    overallRiskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CONTROLLED';
    securityScore: number;
    riskScore: number;
    criticalFindingsCount: number;
    highFindingsCount: number;
    summaryText: string;
    keyRecommendations: string[];
  };
  scopeSummary?: {
    authorizedTargets: string[];
    testedTargets: string[];
    untestedTargets: string[];
    limitations: string[];
  };
  methodologySummary?: {
    framework: string;
    profiles: string[];
    categories: string[];
    testsExecuted: number;
    limitations: string[];
  };
  findingsSummary?: Array<{
    id: string;
    code: string;
    title: string;
    description: string;
    severity: SecuritySeverity;
    cvssScore: number;
    confidence: string;
    riskScore: number;
    assetName?: string;
    ciName?: string;
    targetValue: string;
    evidenceSummary: string;
    recommendation: string;
    status: FindingStatus;
    remediation?: {
      responsible: string;
      status: string;
      dueDate: string;
      ticketCode?: string;
    };
    retest?: {
      result: RetestResult;
      previousRisk: number;
      currentRisk: number;
      evidenceSummary: string;
      retestedAt: string;
    };
  }>;
  complianceSummary?: {
    overallCompliancePct: number;
    frameworkAssessments: Array<{
      framework: string;
      compliantPct: number;
      passedControls: number;
      totalControls: number;
    }>;
  };
  remediationSummary?: {
    fixRatePct: number;
    mttrDays: number;
    slaCompliantCount: number;
    slaBreachedCount: number;
    activePlansCount: number;
  };
  conclusionText?: string;
  meta?: Record<string, any>;
}

export interface ScheduledReport {
  id: string;
  tenantId: string;
  type: SecurityReportType;
  title: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  cronExpression?: string;
  recipients: string[];
  format: 'PDF' | 'CSV' | 'JSON';
  sections: string[];
  status: 'ACTIVE' | 'PAUSED';
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
}

export type ComplianceFrameworkCode =
  | 'OWASP_TOP10'
  | 'CIS_CONTROLS_V8'
  | 'NIST_CSF'
  | 'ISO_27001'
  | 'INTERNAL_POLICIES';

export type ComplianceControlStatus =
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'PARTIALLY_COMPLIANT'
  | 'NOT_ASSESSED'
  | 'NOT_APPLICABLE';

export type ComplianceStatus = ComplianceControlStatus;

export interface ComplianceFrameworkSummary {
  code: string;
  framework: string;
  compliancePct: number;
  totalControls: number;
  compliantCount: number;
  partiallyCompliantCount: number;
  nonCompliantCount: number;
}

export interface ComplianceControl {
  id: string;
  frameworkCode: ComplianceFrameworkCode;
  category: string;
  code: string;
  title: string;
  description: string;
  requirement: string;
  status: ComplianceControlStatus;
  scoreWeight: number;
  evidenceIds: string[];
  evidenceCount?: number;
  linkedFindingIds: string[];
  linkedRemediationIds: string[];
  gapDescription?: string;
  actionPlan?: string;
  targetResolutionDate?: string;
  assessedAt?: string;
  lastAuditedBy?: string;
}

export interface EvidenceMatrixItem {
  controlId: string;
  controlCode: string;
  framework: ComplianceFrameworkCode;
  title: string;
  status: ComplianceControlStatus;
  evidenceCount: number;
  findingsCount: number;
  openRemediationsCount: number;
  lastEvidenceDate?: string;
  isExpiredEvidence: boolean;
  gapIdentified: boolean;
  // Campos de compatibilidade para renderização na UI
  controlTitle?: string;
  linkedFindings?: Array<{
    id: string;
    code: string;
    title: string;
    severity: SecuritySeverity;
  }>;
  hasRecentEvidence?: boolean;
  gapDescription?: string;
  actionPlan?: string;
}

export interface SecurityScoreHistory {
  id: string;
  tenantId: string;
  timestamp: string;
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  factors: {
    vulnerabilityScore: number;
    remediationScore: number;
    complianceScore: number;
    criticalAssetProtection: number;
    slaScore: number;
  };
  riskScore: number;
  note?: string;
}

export interface SecurityAlertRule {
  id: string;
  tenantId: string;
  type:
    | 'CRITICAL_FINDING'
    | 'RISK_SCORE_THRESHOLD'
    | 'SECURITY_SCORE_DROP'
    | 'SLA_BREACH'
    | 'COMPLIANCE_GAP'
    | 'UNASSESSED_ASSET'
    | 'EXCEPTION_EXPIRING';
  name: string;
  thresholdValue?: number;
  severity: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
  enabled: boolean;
  recipients: string[];
  lastTriggeredAt?: string;
}

export interface ExecutiveDashboardData {
  securityScore: number;
  securityScoreGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  overallRiskScore: number;
  riskTrend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
  riskDelta: number;
  scoreFactors: {
    vulnerabilityScore: number;
    remediationScore: number;
    complianceScore: number;
    criticalAssetProtection: number;
    slaScore: number;
  };
  findingsMetrics: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    open: number;
    fixed: number;
    resolved?: number;
    acceptedRisksCount?: number;
  };
  remediationMetrics: {
    fixRatePct: number;
    mttrDays: number;
    slaCompliantCount: number;
    slaBreachedCount: number;
    totalRemediations?: number;
    resolvedRemediations?: number;
  };
  pentestMetrics: {
    totalProjects: number;
    runningExecutions: number;
    testedTargets: number;
    retestedFindings: number;
    confirmedFindings: number;
  };
  complianceMetrics: {
    overallCompliancePct: number;
    frameworkScores: Array<{
      framework: string;
      code: string;
      compliantPct: number;
      passed: number;
      total: number;
    }>;
  };
  topCriticalRisks: Array<{
    findingId: string;
    code: string;
    title: string;
    severity: SecuritySeverity;
    ciName: string;
    riskScore: number;
    slaStatus: string;
  }>;
  topCriticalAssets: Array<{
    ciId: string;
    ciName: string;
    ciType: string;
    riskScore: number;
    criticalFindingsCount: number;
    exposure: string;
  }>;
  topRisks: Array<{
    id: string;
    code: string;
    title: string;
    severity: SecuritySeverity;
    affectedAsset: string;
    riskScore: number;
    remediationStatus: string;
  }>;
  topVulnerableAssets: Array<{
    assetId: string;
    assetName: string;
    ciId?: string;
    criticality: string;
    findingsCount: number;
    riskScore: number;
  }>;
  recentScoreHistory: SecurityScoreHistory[];
  calculatedAt: string;
  securityPostureByEnvironment?: Array<{
    environment: string;
    riskScore: number;
    assetsCount: number;
    compliancePct: number;
    openCriticals: number;
  }>;
  riskEvolutionTimeline?: Array<{
    date: string;
    riskScore: number;
    securityScore: number;
    openCriticals: number;
    fixedCount: number;
  }>;
}

// ==========================================
// ETAPA 9: INTEGRAÇÃO GERAL, QA & ACTION CENTER TYPES
// ==========================================

export interface SecurityActionCenterData {
  criticalFindings: SecurityFinding[];
  highFindings: SecurityFinding[];
  overdueSla: Array<{
    finding: SecurityFinding;
    remediation?: SecurityRemediation;
    overdueHours: number;
    escalationRole: string;
  }>;
  pendingRetests: SecurityFinding[];
  expiringAcceptedRisks: Array<AcceptedRiskRecord & { daysRemaining: number }>;
  expiringExceptions: Array<RiskException & { daysRemaining: number }>;
  unassessedAssets: Array<{
    id: string;
    name: string;
    ipAddress?: string;
    ciCode?: string;
    criticality: string;
    daysWithoutScan: number;
  }>;
  failedControls: ComplianceControl[];
  summaryCounts: {
    criticalCount: number;
    highCount: number;
    overdueCount: number;
    pendingRetestCount: number;
    expiringRiskCount: number;
    unassessedAssetCount: number;
    failedControlCount: number;
  };
}

export interface SecurityTimelineEvent {
  id: string;
  date: string;
  type: 
    | 'ASSET_DISCOVERY' 
    | 'AGENT_ENROLLED' 
    | 'SECURITY_SCAN' 
    | 'FINDING_DETECTED' 
    | 'TICKET_CREATED' 
    | 'REMEDIATION_PLANNED' 
    | 'INCIDENT_RECORDED' 
    | 'RETEST_EXECUTED' 
    | 'RISK_ACCEPTED' 
    | 'FINDING_RESOLVED' 
    | 'STATUS_CHANGE';
  title: string;
  description: string;
  actor: string;
  severity?: SecuritySeverity;
  metadata?: Record<string, unknown>;
}

export interface SecurityAssetProfile {
  identification: {
    assetId: string;
    ciId?: string;
    ciCode?: string;
    hostname: string;
    ipAddress: string;
    macAddress?: string;
    operatingSystem: string;
    osVersion?: string;
    responsible: string;
    location: string;
    unit: string;
    clientName: string;
    category: string;
    criticality: string;
    agentStatus: string;
    linkedTopologyNodeId?: string;
  };
  security: {
    securityScore: number;
    riskScore: number;
    activeFindingsCount: number;
    criticalFindingsCount: number;
    findings: SecurityFinding[];
    vulnerabilitiesCount: number;
    lastScanDate?: string;
    lastPentestDate?: string;
    lastRetestDate?: string;
    compliancePct: number;
  };
  operations: {
    tickets: Array<{
      id: string;
      code: string;
      title: string;
      status: string;
      priority: string;
      assignedTo: string;
      createdAt: string;
      findingCode?: string;
    }>;
    incidents: Array<{
      id: string;
      code: string;
      title: string;
      severity: string;
      status: string;
      date: string;
      resolutionNotes?: string;
    }>;
    remediations: SecurityRemediation[];
  };
  timeline: {
    events: SecurityTimelineEvent[];
  };
}

export interface SecuritySearchResult {
  id: string;
  type: 'ASSET' | 'CI' | 'TARGET' | 'FINDING' | 'VULNERABILITY' | 'PENTEST' | 'SCAN' | 'TICKET' | 'REMEDIATION' | 'REPORT';
  code?: string;
  title: string;
  subtitle: string;
  severity?: SecuritySeverity;
  status?: string;
  targetTab: string;
  metadata?: Record<string, unknown>;
}

export interface E2EIntegrationStepResult {
  stepNumber: number;
  stepId: string;
  name: string;
  moduleIntegration: string;
  passed: boolean;
  durationMs: number;
  details: string;
  evidence: string;
}

export interface E2EIntegrationReport {
  suiteName: string;
  executedAt: string;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  successRatePct: number;
  durationMs: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  steps: E2EIntegrationStepResult[];
  multiTenantAudit: {
    crossTenantAttemptBlocked: boolean;
    tenantAId: string;
    tenantBId: string;
    testsPassed: number;
    testsTotal: number;
  };
  regressionAudit: {
    inventoryOk: boolean;
    cmdbOk: boolean;
    topologyOk: boolean;
    agentOk: boolean;
    ticketsOk: boolean;
    incidentsOk: boolean;
    reportsOk: boolean;
    allPassed: boolean;
  };
  certification: string;
}



