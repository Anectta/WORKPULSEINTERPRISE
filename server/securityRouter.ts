import { Router, Request, Response } from 'express';
import { SecurityOrchestrator } from './security/securityOrchestrator';
import { PentestControlPlane } from './security/pentestControlPlane';
import { SecurityHealthService } from './security/securityHealth';
import { SecurityTestSuite } from './security/securityTestSuite';
import { SecurityIntegrationBridge } from './security/securityIntegrationBridge';
import { E2EIntegrationSuite } from './security/e2eIntegrationSuite';

const router = Router();

// In-Memory Rate Limiter com Sliding Window
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number = 60, windowMs: number = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  bucket.count++;
  return { allowed: true, remaining: limit - bucket.count };
}

// Middleware de Rate Limiting para APIs sensíveis
function apiRateLimit(limit: number = 60, windowMs: number = 60000) {
  return (req: Request, res: Response, next: () => void) => {
    const clientKey = `${req.ip || '127.0.0.1'}:${req.baseUrl || ''}`;
    const { allowed, remaining } = checkRateLimit(clientKey, limit, windowMs);
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'Limite de requisições excedido. Tente novamente em alguns segundos.',
        errorCode: 'RATE_LIMIT_EXCEEDED'
      });
    }
    next();
  };
}

// Middleware para extrair contexto de autenticação e tenant
function getAuthContext(req: Request) {
  const tenantId = (req.headers['x-tenant-id'] as string) || 'tenant-demo';
  const user = {
    id: (req.headers['x-user-id'] as string) || 'usr-tech-01',
    name: (req.headers['x-user-name'] as string) || 'Carlos Amorim',
    email: (req.headers['x-user-email'] as string) || 'carlos@empresaabc.com.br',
    role: (req.headers['x-user-role'] as string) || 'TECHNICIAN'
  };
  return { tenantId, user };
}

// Verificador de RBAC Zero-Trust
function requireRoles(allowedRoles: string[]) {
  return (req: Request, res: Response, next: () => void) => {
    const { user } = getAuthContext(req);
    const normalizedRole = (user.role || 'SECURITY_VIEWER').toUpperCase();
    
    // ADMIN e CISO possuem acesso total
    if (normalizedRole === 'ADMIN' || normalizedRole === 'SECURITY_ADMIN' || normalizedRole === 'CISO') {
      return next();
    }
    
    // Mapeamentos comuns
    const roleAliases: Record<string, string[]> = {
      'SECURITY_OPERATOR': ['OPERATOR', 'TECHNICIAN', 'SECURITY_ANALYST', 'ANALYST'],
      'SECURITY_ANALYST': ['ANALYST', 'TECHNICIAN', 'SECURITY_OPERATOR'],
      'SECURITY_MANAGER': ['MANAGER', 'CISO', 'ADMIN', 'SECURITY_ADMIN'],
      'SECURITY_VIEWER': ['VIEWER', 'AUDITOR', 'TECHNICIAN', 'ANALYST', 'MANAGER', 'OPERATOR']
    };

    const isMatch = allowedRoles.some(allowed => {
      const upperAllowed = allowed.toUpperCase();
      if (normalizedRole === upperAllowed) return true;
      const aliases = roleAliases[upperAllowed] || [];
      return aliases.includes(normalizedRole);
    });

    if (isMatch) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Acesso negado: Perfil '${user.role}' não possui permissão para esta operação de segurança (Exige: ${allowedRoles.join(', ')}).`,
      errorCode: 'RBAC_FORBIDDEN'
    });
  };
}

// =========================================================================
// 0. OBSERVABILIDADE, SAÚDE & SUÍTE DE TESTES (ETAPA 8)
// =========================================================================

// Health Check Dedicado do Módulo de Segurança
router.get('/security/health', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const health = SecurityHealthService.getHealth(tenantId);
    res.json({ success: true, data: health });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Execução Automatizada da Suíte de Testes de Segurança (16 Verificações)
router.get('/security/test-suite/run', async (req: Request, res: Response) => {
  try {
    const report = await SecurityTestSuite.runAllTests();
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. Dashboard Metrics
router.get('/security/dashboard/metrics', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const metrics = SecurityOrchestrator.getDashboardMetrics(tenantId);
    res.json({ success: true, data: metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Scopes
router.get('/security/scopes', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const scopes = SecurityOrchestrator.listScopes(tenantId);
    res.json({ success: true, data: scopes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Targets
router.get('/security/targets', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const scopeId = req.query.scopeId as string | undefined;
    const targets = SecurityOrchestrator.listTargets(tenantId, scopeId);
    res.json({ success: true, data: targets });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Scans
router.get('/security/scans', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const scans = SecurityOrchestrator.listScans(tenantId);
    res.json({ success: true, data: scans });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/security/scans/:id', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const scanInfo = SecurityOrchestrator.getScanById(tenantId, req.params.id);
    if (!scanInfo.scan) {
      return res.status(404).json({ success: false, error: 'Scan não encontrado.' });
    }
    res.json({ success: true, data: scanInfo });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/security/scans', async (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const { title, scanType, scopeId, targetValue, targetType, linkedCiId } = req.body;

    if (!scopeId || !targetValue || !scanType) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios ausentes: scopeId, targetValue, scanType.'
      });
    }

    const result = await SecurityOrchestrator.startScan(
      tenantId,
      { title, scanType, scopeId, targetValue, targetType: targetType || 'WEB_URL', linkedCiId },
      user
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.status(201).json({ success: true, data: result.scan });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/security/scans/:id/abort', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const aborted = SecurityOrchestrator.abortScan(tenantId, req.params.id, user);
    if (!aborted) {
      return res.status(404).json({ success: false, error: 'Scan não encontrado ou já concluído.' });
    }
    res.json({ success: true, message: 'Execução de scan abortada com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Findings
router.get('/security/findings', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const { severity, status, ciId, search } = req.query as Record<string, string>;
    const findings = SecurityOrchestrator.listFindings(tenantId, { severity, status, ciId, search });
    res.json({ success: true, data: findings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/security/findings/:id', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const details = SecurityOrchestrator.getFindingById(tenantId, req.params.id);
    if (!details) {
      return res.status(404).json({ success: false, error: 'Vulnerabilidade não encontrada.' });
    }
    res.json({ success: true, data: details });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/security/findings/:id/status', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const { status, justification } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Novo status obrigatório.' });
    }

    const updated = SecurityOrchestrator.updateFindingStatus(tenantId, req.params.id, status, justification || '', user);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Vulnerabilidade não encontrada.' });
    }

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/security/findings/:id/create-ticket', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const { ownerName, ownerEmail, dueDate, priority } = req.body;
    const result = SecurityOrchestrator.createTicketForFinding(tenantId, req.params.id, user, {
      ownerName,
      ownerEmail,
      dueDate,
      priority
    });
    if (!result) {
      return res.status(404).json({ success: false, error: 'Vulnerabilidade não encontrada.' });
    }
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/security/findings/:id/retest', async (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const { technicalNotes, simulatedOutcome } = req.body;
    const result = await SecurityOrchestrator.executeRetest(
      tenantId,
      req.params.id,
      technicalNotes || 'Reteste executado via console.',
      user,
      simulatedOutcome
    );
    if (!result) {
      return res.status(404).json({ success: false, error: 'Vulnerabilidade não encontrada.' });
    }
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Audit Trail
router.get('/security/audit', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const logs = SecurityOrchestrator.listAuditLogs(tenantId);
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 7. PENTEST CONTROL PLANE & EXECUTION ROUTES
// ==========================================

// Listar Projetos de Pentest
router.get('/security/pentest/projects', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const projects = PentestControlPlane.listProjects(tenantId);
    res.json({ success: true, data: projects });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Detalhes do Projeto de Pentest
router.get('/security/pentest/projects/:id', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const details = PentestControlPlane.getProjectById(tenantId, req.params.id);
    if (!details) {
      return res.status(404).json({ success: false, error: 'Projeto de Pentest não encontrado.' });
    }
    res.json({ success: true, data: details });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Criar Projeto de Pentest
router.post('/security/pentest/projects', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const { name, description, objective, methodology, scopeId, authorizationId, roeId, testProfileId, targetIds } = req.body;

    if (!name || !scopeId) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes: name e scopeId.' });
    }

    const project = PentestControlPlane.createProject(
      tenantId,
      { name, description, objective, methodology, scopeId, authorizationId, roeId, testProfileId, targetIds },
      user,
      req.ip || '127.0.0.1'
    );

    res.status(201).json({ success: true, data: project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Submeter para Aprovação (DRAFT -> PENDING_APPROVAL)
router.post('/security/pentest/projects/:id/submit-approval', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const result = PentestControlPlane.submitForApproval(tenantId, req.params.id, user, req.ip || '127.0.0.1');
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result.project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Aprovar Projeto (PENDING_APPROVAL -> APPROVED)
router.post('/security/pentest/projects/:id/approve', requireRoles(['SECURITY_MANAGER', 'SECURITY_ADMIN', 'CISO', 'ADMIN', 'MANAGER']), (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const { justification } = req.body;
    const result = PentestControlPlane.approveProject(tenantId, req.params.id, justification, user, req.ip || '127.0.0.1');
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result.project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Rejeitar Projeto (PENDING_APPROVAL -> DRAFT)
router.post('/security/pentest/projects/:id/reject', requireRoles(['SECURITY_MANAGER', 'SECURITY_ADMIN', 'CISO', 'ADMIN', 'MANAGER']), (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const { justification } = req.body;
    const result = PentestControlPlane.rejectProject(tenantId, req.params.id, justification, user, req.ip || '127.0.0.1');
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result.project });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Disparar Execução Controlada de Pentest
router.post('/security/pentest/projects/:id/launch', apiRateLimit(10, 60000), requireRoles(['SECURITY_OPERATOR', 'SECURITY_MANAGER', 'SECURITY_ADMIN', 'CISO', 'ADMIN', 'TECHNICIAN']), async (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const result = await PentestControlPlane.launchPentest(tenantId, req.params.id, user, req.ip || '127.0.0.1');
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: { executionId: result.executionId } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Kill Switch: Interromper Execução (Graceful Stop)
router.post('/security/pentest/projects/:id/stop', requireRoles(['SECURITY_OPERATOR', 'SECURITY_MANAGER', 'SECURITY_ADMIN', 'CISO', 'ADMIN', 'TECHNICIAN']), (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const { reason } = req.body;
    const stopped = PentestControlPlane.stopExecution(tenantId, req.params.id, reason, user, req.ip || '127.0.0.1');
    res.json({ success: stopped, message: 'Comando de parada (Kill Switch) enviado com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Kill Switch: PARADA DE EMERGÊNCIA (EMERGENCY STOP)
router.post('/security/pentest/projects/:id/emergency-stop', requireRoles(['SECURITY_OPERATOR', 'SECURITY_MANAGER', 'SECURITY_ADMIN', 'CISO', 'ADMIN', 'TECHNICIAN']), (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const { reason } = req.body;
    const stopped = PentestControlPlane.emergencyStop(tenantId, req.params.id, reason || 'EMERGENCY STOP disparado pelo operador SecOps', user, req.ip || '127.0.0.1');
    res.json({ success: stopped, message: 'PARADA DE EMERGÊNCIA EXECUTADA. Conexões finalizadas.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Monitoramento em Tempo Real (Execution Monitor)
router.get('/security/pentest/projects/:id/execution-state', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const state = PentestControlPlane.getExecutionState(tenantId, req.params.id);
    res.json({ success: true, data: state });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Perfis de Teste
router.get('/security/pentest/profiles', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const profiles = PentestControlPlane.listProfiles(tenantId);
    res.json({ success: true, data: profiles });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Rules of Engagement (RoE)
router.get('/security/pentest/roe', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const roes = PentestControlPlane.listRoEs(tenantId);
    res.json({ success: true, data: roes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Autorizações Formais de Pentest
router.get('/security/pentest/authorizations', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const auths = PentestControlPlane.listAuthorizations(tenantId);
    res.json({ success: true, data: auths });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 8. REMEDIAÇÃO, HARDENING E RETESTE (ETAPA 6)
// ==========================================

// Listar Planos de Remediação
router.get('/security/remediations', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const { status, priority } = req.query as Record<string, string>;
    const list = SecurityOrchestrator.listRemediations(tenantId, { status, priority });
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Obter Detalhes da Remediação por ID
router.get('/security/remediations/:id', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const rem = SecurityOrchestrator.getRemediationById(tenantId, req.params.id);
    if (!rem) return res.status(404).json({ success: false, error: 'Remediação não encontrada.' });
    res.json({ success: true, data: rem });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Atualizar Etapa do Plano de Remediação
router.patch('/security/remediations/:id/steps/:stepId', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const updated = SecurityOrchestrator.updateRemediationStep(tenantId, req.params.id, req.params.stepId, req.body, user);
    if (!updated) return res.status(404).json({ success: false, error: 'Etapa ou remediação não encontrada.' });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Atualizar Status da Remediação com Justificativa
router.patch('/security/remediations/:id/status', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const { status, justification } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'Status obrigatório.' });
    const updated = SecurityOrchestrator.updateRemediationStatus(tenantId, req.params.id, status, justification || '', user);
    if (!updated) return res.status(404).json({ success: false, error: 'Remediação não encontrada.' });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Métricas Consolidadas do Dashboard de Remediação & SLA
router.get('/security/remediation-metrics', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const metrics = SecurityOrchestrator.getRemediationDashboardMetrics(tenantId);
    res.json({ success: true, data: metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Listar Riscos Aceitos
router.get('/security/accepted-risks', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const list = SecurityOrchestrator.listAcceptedRisks(tenantId);
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Registrar Risco Aceito Formalmente
router.post('/security/accepted-risks', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const { findingId, justification, businessImpactJustification, validUntil, reviewDate, compensatoryControls, approvedByRole } = req.body;
    if (!findingId || !justification || !validUntil) {
      return res.status(400).json({ success: false, error: 'findingId, justification e validUntil são obrigatórios.' });
    }
    const record = SecurityOrchestrator.createAcceptedRisk(
      tenantId,
      findingId,
      { justification, businessImpactJustification, validUntil, reviewDate, compensatoryControls, approvedByRole },
      user
    );
    res.status(201).json({ success: true, data: record });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Listar Exceções de Risco
router.get('/security/risk-exceptions', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const list = SecurityOrchestrator.listRiskExceptions(tenantId);
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cadastrar Exceção de Risco
router.post('/security/risk-exceptions', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const { findingId, scopeDescription, justification, compensatingControls, validUntil, reviewFrequencyMonths } = req.body;
    if (!findingId || !justification || !validUntil) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes.' });
    }
    const exception = SecurityOrchestrator.createRiskException(
      tenantId,
      findingId,
      { scopeDescription, justification, compensatingControls, validUntil, reviewFrequencyMonths },
      user
    );
    res.status(201).json({ success: true, data: exception });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Baselines de Hardening
router.get('/security/baselines', (req: Request, res: Response) => {
  try {
    const baselines = SecurityOrchestrator.listBaselines();
    res.json({ success: true, data: baselines });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/security/baselines/:id', (req: Request, res: Response) => {
  try {
    const baseline = SecurityOrchestrator.getBaselineById(req.params.id);
    if (!baseline) return res.status(404).json({ success: false, error: 'Baseline não encontrada.' });
    res.json({ success: true, data: baseline });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Executar Avaliação de Conformidade / Hardening
router.post('/security/compliance/evaluate', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const { baselineId, targetId, assetData } = req.body;
    if (!baselineId || !targetId) {
      return res.status(400).json({ success: false, error: 'baselineId e targetId são obrigatórios.' });
    }
    const evaluation = SecurityOrchestrator.evaluateCompliance(tenantId, baselineId, targetId, user, assetData);
    res.json({ success: true, data: evaluation });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Listar Histórico de Avaliações de Conformidade
router.get('/security/compliance/evaluations', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const list = SecurityOrchestrator.listComplianceEvaluations(tenantId);
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Histórico de Comparações Antes x Depois de Retestes
router.get('/security/retests/comparisons', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const { findingId } = req.query as { findingId?: string };
    const comps = SecurityOrchestrator.getRetestComparisons(tenantId, findingId);
    res.json({ success: true, data: comps });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =========================================================================
 * ETAPA 7: RELATÓRIOS, COMPLIANCE, INDICADORES E GESTÃO EXECUTIVA
 * ========================================================================= */

// 1. Dashboard Executivo Consolidado
router.get('/security/executive/dashboard', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const data = SecurityOrchestrator.getExecutiveDashboardData(tenantId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Histórico de Security Score e Tendências
router.get('/security/score/history', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const history = SecurityOrchestrator.getSecurityScoreHistory(tenantId);
    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Cálculo Atual do Security Score e Grade
router.get('/security/score/calculate', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const score = SecurityOrchestrator.calculateSecurityScore(tenantId);
    res.json({ success: true, data: score });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Listar Relatórios de Segurança
router.get('/security/reports', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const { type, status } = req.query as { type?: any; status?: string };
    const reports = SecurityOrchestrator.listReports(tenantId, { type, status });
    res.json({ success: true, data: reports });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Obter Relatório por ID
router.get('/security/reports/:id', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const report = SecurityOrchestrator.getReportById(tenantId, req.params.id);
    if (!report) return res.status(404).json({ success: false, error: 'Relatório não encontrado.' });
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Gerar Relatório Oficial de Pentest (8 seções estruturadas)
router.post('/security/reports/pentest', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const { projectId, confidentiality } = req.body;
    const report = SecurityOrchestrator.generatePentestReport(
      tenantId,
      projectId || 'pnt-proj-01',
      user,
      confidentiality || 'CONFIDENTIAL'
    );
    res.status(201).json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Gerar Relatório Executivo Estratégico
router.post('/security/reports/executive', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const { periodStart, periodEnd } = req.body;
    const report = SecurityOrchestrator.generateExecutiveReport(
      tenantId,
      {
        start: periodStart || new Date(Date.now() - 30 * 86400000).toISOString(),
        end: periodEnd || new Date().toISOString()
      },
      user
    );
    res.status(201).json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Criar Relatório Customizado (Vulnerabilidade, Remediação, Compliance, etc.)
router.post('/security/reports/custom', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const report = SecurityOrchestrator.createCustomReport(tenantId, req.body, user);
    res.status(201).json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Excluir Relatório
router.delete('/security/reports/:id', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const success = SecurityOrchestrator.deleteReport(tenantId, req.params.id, user);
    if (!success) return res.status(404).json({ success: false, error: 'Relatório não encontrado.' });
    res.json({ success: true, message: 'Relatório excluído com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Exportação Multi-formato (JSON, CSV, HTML/PDF Nativo)
router.get('/security/reports/:id/export', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const format = ((req.query.format as string) || 'JSON').toUpperCase() as 'JSON' | 'CSV' | 'HTML';
    const exported = SecurityOrchestrator.exportReport(tenantId, req.params.id, format);

    res.setHeader('Content-Type', exported.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    res.send(exported.content);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Gerar Token de Compartilhamento Seguro
router.post('/security/reports/:id/share', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const { recipientName, recipientEmail, expiresInDays, permissions } = req.body;
    if (!recipientName || !recipientEmail) {
      return res.status(400).json({ success: false, error: 'recipientName e recipientEmail são obrigatórios.' });
    }
    const token = SecurityOrchestrator.createReportShareToken(
      tenantId,
      req.params.id,
      { recipientName, recipientEmail, expiresInDays, permissions },
      user
    );
    res.status(201).json({ success: true, data: token });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. Acesso a Relatório Compartilhado via Token (Sanitizado)
router.get('/security/reports/share/:token', (req: Request, res: Response) => {
  try {
    const sharedData = SecurityOrchestrator.getSharedReport(req.params.token);
    if (!sharedData) return res.status(404).json({ success: false, error: 'Link de compartilhamento inválido ou expirado.' });
    res.json({ success: true, data: sharedData });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 13. Revogar Token de Compartilhamento
router.post('/security/reports/share/:id/revoke', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const success = SecurityOrchestrator.revokeShareToken(tenantId, req.params.id, user);
    if (!success) return res.status(404).json({ success: false, error: 'Token não encontrado.' });
    res.json({ success: true, message: 'Token de compartilhamento revogado com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 14. Compliance: Listar Controles
router.get('/security/compliance/controls', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const controls = SecurityOrchestrator.listComplianceControls(tenantId);
    res.json({ success: true, data: controls });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 15. Compliance: Atualizar Controle (Gap Analysis & Action Plan)
router.patch('/security/compliance/controls/:id', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const updated = SecurityOrchestrator.updateComplianceControl(tenantId, req.params.id, req.body, user);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 16. Compliance: Matriz de Evidências (Control -> Evidence -> Finding -> Remediation)
router.get('/security/compliance/matrix', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const matrix = SecurityOrchestrator.getEvidenceMatrix(tenantId);
    res.json({ success: true, data: matrix });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 17. Compliance: Resumo por Framework
router.get('/security/compliance/summary', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const summary = SecurityOrchestrator.getComplianceFrameworkSummary(tenantId);
    res.json({ success: true, data: summary });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 18. Relatórios Agendados: Listar
router.get('/security/scheduled-reports', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const list = SecurityOrchestrator.listScheduledReports(tenantId);
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 19. Relatórios Agendados: Criar
router.post('/security/scheduled-reports', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const scheduled = SecurityOrchestrator.createScheduledReport(tenantId, req.body, user);
    res.status(201).json({ success: true, data: scheduled });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 20. Relatórios Agendados: Excluir
router.delete('/security/scheduled-reports/:id', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const success = SecurityOrchestrator.deleteScheduledReport(tenantId, req.params.id, user);
    if (!success) return res.status(404).json({ success: false, error: 'Agendamento não encontrado.' });
    res.json({ success: true, message: 'Agendamento removido.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 21. Regras de Alerta: Listar
router.get('/security/alerts/rules', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const rules = SecurityOrchestrator.listAlertRules(tenantId);
    res.json({ success: true, data: rules });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 22. Regras de Alerta: Atualizar
router.patch('/security/alerts/rules/:id', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const updated = SecurityOrchestrator.updateAlertRule(tenantId, req.params.id, req.body, user);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// 23. ETAPA 9: INTEGRAÇÃO GERAL, QA, ACTION CENTER & E2E GO-LIVE
// =========================================================================

// 23.1. Central de Ações de Segurança (Security Action Center)
router.get('/security/action-center', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const data = SecurityIntegrationBridge.getActionCenterData(tenantId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 23.2. Perfil Unificado de Segurança do Ativo (Asset Profile) com Timeline Consolidada
router.get('/security/assets/:assetId/profile', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const profile = SecurityIntegrationBridge.getAssetSecurityProfile(tenantId, req.params.assetId);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Ativo ou CI não localizado.' });
    }
    res.json({ success: true, data: profile });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 23.3. Abertura de Chamado Técnico / Remediação vinculado ao Finding
router.post('/security/findings/:id/ticket', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const result = SecurityIntegrationBridge.createTicketForFinding(
      tenantId,
      req.params.id,
      req.body,
      user
    );
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 23.4. Resolução de Chamado no CMDB com Proteção Zero-Trust (Regra 8)
router.post('/security/tickets/:id/resolve', (req: Request, res: Response) => {
  try {
    const { tenantId, user } = getAuthContext(req);
    const result = SecurityIntegrationBridge.resolveTicket(
      tenantId,
      req.params.id,
      req.body.resolutionNotes || 'Remediação aplicada',
      user
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 23.5. Busca Global Unificada de Entidades de Segurança
router.get('/security/search', (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const query = String(req.query.q || '');
    const results = SecurityIntegrationBridge.searchSecurityEntities(tenantId, query);
    res.json({ success: true, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 23.6. Execução Automatizada da Suíte End-to-End e Auditoria Multi-Tenant de Go-Live
router.get('/security/e2e/run', async (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthContext(req);
    const report = await E2EIntegrationSuite.runFullE2ETestSuite(tenantId);
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
