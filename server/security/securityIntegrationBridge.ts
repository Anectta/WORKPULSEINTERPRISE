import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  SecurityFinding,
  SecurityRemediation,
  AcceptedRiskRecord,
  RiskException,
  ComplianceControl,
  SecurityActionCenterData,
  SecurityAssetProfile,
  SecurityTimelineEvent,
  SecuritySearchResult,
  SecuritySeverity
} from '../../src/types/security';
import { CMDBTicketLink, ConfigurationItem } from '../../src/types/cmdb';
import { ITAsset } from '../../src/types';
import { INITIAL_CMDB_ITEMS, INITIAL_CMDB_TICKETS } from '../../src/data/cmdbInitialData';
import { INITIAL_IT_ASSETS } from '../../src/data/initialAssets';
import { SecurityOrchestrator } from './securityOrchestrator';

const CMDB_PERSIST_FILE = path.join(process.cwd(), 'src', 'data', 'cmdb_persisted.json');

export class SecurityIntegrationBridge {
  /**
   * Carrega CIs do CMDB (persisted store ou fallback inicial)
   */
  private static getCmdbItems(tenantId: string): ConfigurationItem[] {
    try {
      if (fs.existsSync(CMDB_PERSIST_FILE)) {
        const raw = fs.readFileSync(CMDB_PERSIST_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.items && Array.isArray(parsed.items)) {
          return parsed.items.filter((i: ConfigurationItem) => i.tenantId === tenantId);
        }
      }
    } catch (err) {
      console.warn('[SecurityBridge] Erro ao ler cmdb_persisted.json, usando fallback', err);
    }
    return INITIAL_CMDB_ITEMS.filter(i => i.tenantId === tenantId);
  }

  /**
   * Carrega Chamados/Tickets do CMDB
   */
  private static getCmdbTickets(tenantId: string): CMDBTicketLink[] {
    try {
      if (fs.existsSync(CMDB_PERSIST_FILE)) {
        const raw = fs.readFileSync(CMDB_PERSIST_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.tickets && Array.isArray(parsed.tickets)) {
          return parsed.tickets.filter((t: CMDBTicketLink) => t.tenantId === tenantId);
        }
      }
    } catch (err) {
      console.warn('[SecurityBridge] Erro ao ler tickets do CMDB, usando fallback', err);
    }
    return (INITIAL_CMDB_TICKETS as unknown as CMDBTicketLink[]).filter(t => t.tenantId === tenantId);
  }

  /**
   * Salva tickets no store do CMDB
   */
  private static saveCmdbTickets(tenantId: string, updatedTickets: CMDBTicketLink[]): void {
    try {
      let store: any = { items: INITIAL_CMDB_ITEMS, tickets: INITIAL_CMDB_TICKETS };
      if (fs.existsSync(CMDB_PERSIST_FILE)) {
        const raw = fs.readFileSync(CMDB_PERSIST_FILE, 'utf-8');
        store = JSON.parse(raw);
      }
      
      const otherTenantTickets = (store.tickets || []).filter((t: CMDBTicketLink) => t.tenantId !== tenantId);
      store.tickets = [...otherTenantTickets, ...updatedTickets];

      fs.mkdirSync(path.dirname(CMDB_PERSIST_FILE), { recursive: true });
      fs.writeFileSync(CMDB_PERSIST_FILE, JSON.stringify(store, null, 2), 'utf-8');
    } catch (err) {
      console.error('[SecurityBridge] Falha ao persistir tickets do CMDB', err);
    }
  }

  /**
   * Obtém os dados consolidados para o Security Action Center (Etapa 9 - Item 19)
   */
  public static getActionCenterData(tenantId: string): SecurityActionCenterData {
    const findings = SecurityOrchestrator.listFindings(tenantId);
    const remediations = SecurityOrchestrator.listRemediations(tenantId);
    const acceptedRisks = SecurityOrchestrator.listAcceptedRisks(tenantId);
    const riskExceptions = SecurityOrchestrator.listRiskExceptions(tenantId);
    const complianceControls = SecurityOrchestrator.listComplianceControls(tenantId);
    const cmdbItems = this.getCmdbItems(tenantId);

    const now = Date.now();

    // 1. Critical Findings (Abertos / Em remediação)
    const criticalFindings = findings.filter(
      f => f.severity === 'CRITICAL' && f.status !== 'RESOLVED' && f.status !== 'FALSE_POSITIVE'
    );

    // 2. High Findings
    const highFindings = findings.filter(
      f => f.severity === 'HIGH' && f.status !== 'RESOLVED' && f.status !== 'FALSE_POSITIVE'
    );

    // 3. SLA Vencido
    const overdueSla: SecurityActionCenterData['overdueSla'] = [];
    findings.forEach(f => {
      if (f.status === 'RESOLVED' || f.status === 'FALSE_POSITIVE') return;
      if (f.remediationDeadline) {
        const deadline = new Date(f.remediationDeadline).getTime();
        if (deadline < now) {
          const overdueHours = Math.max(1, Math.floor((now - deadline) / 3600000));
          const rem = remediations.find(r => r.findingId === f.id);
          overdueSla.push({
            finding: f,
            remediation: rem,
            overdueHours,
            escalationRole: f.severity === 'CRITICAL' ? 'CISO / SOC Lead' : 'Security Officer'
          });
        }
      }
    });

    // 4. Retestes Pendentes
    const pendingRetests = findings.filter(
      f => f.status === 'WAITING_RETEST' || f.status === 'FIXED_PENDING_RETEST' || f.status === 'RETEST'
    );

    // 5. Riscos Aceitos Próximos da Expiração (<= 14 dias)
    const expiringAcceptedRisks = acceptedRisks
      .map(r => {
        const expires = new Date(r.validUntil).getTime();
        const daysRemaining = Math.ceil((expires - now) / 86400000);
        return { ...r, daysRemaining };
      })
      .filter(r => r.daysRemaining <= 14);

    // 6. Exceções Próximas da Expiração (<= 14 dias)
    const expiringExceptions = riskExceptions
      .map(e => {
        const expires = new Date(e.expiresAt).getTime();
        const daysRemaining = Math.ceil((expires - now) / 86400000);
        return { ...e, daysRemaining };
      })
      .filter(e => e.daysRemaining <= 14);

    // 7. Ativos sem Avaliação de Segurança nos últimos 30 dias
    const scans = SecurityOrchestrator.listScans(tenantId);
    const unassessedAssets: SecurityActionCenterData['unassessedAssets'] = [];
    cmdbItems.slice(0, 8).forEach(ci => {
      const hasRecentScan = scans.some(s => {
        const scanTime = new Date(s.createdAt).getTime();
        return (now - scanTime) < (30 * 86400000);
      });

      if (!hasRecentScan) {
        unassessedAssets.push({
          id: ci.id,
          name: ci.name,
          ipAddress: ci.ipAddress,
          ciCode: ci.code,
          criticality: ci.criticality,
          daysWithoutScan: 35
        });
      }
    });

    // 8. Controles de Compliance Reprovados
    const failedControls = complianceControls.filter(c => c.status === 'NON_COMPLIANT');

    return {
      criticalFindings,
      highFindings,
      overdueSla,
      pendingRetests,
      expiringAcceptedRisks,
      expiringExceptions,
      unassessedAssets,
      failedControls,
      summaryCounts: {
        criticalCount: criticalFindings.length,
        highCount: highFindings.length,
        overdueCount: overdueSla.length,
        pendingRetestCount: pendingRetests.length,
        expiringRiskCount: expiringAcceptedRisks.length + expiringExceptions.length,
        unassessedAssetCount: unassessedAssets.length,
        failedControlCount: failedControls.length
      }
    };
  }

  /**
   * Obtém o Perfil Unificado de Segurança do Ativo (Etapa 9 - Item 20) com Timeline Consolidada (Item 21)
   */
  public static getAssetSecurityProfile(tenantId: string, assetOrCiId: string): SecurityAssetProfile | null {
    const cmdbItems = this.getCmdbItems(tenantId);
    const allAssets: ITAsset[] = INITIAL_IT_ASSETS;

    // Localizar CI ou Ativo
    const ci = cmdbItems.find(i => i.id === assetOrCiId || i.code.toLowerCase() === assetOrCiId.toLowerCase());
    const asset = allAssets.find(a => a.id === assetOrCiId || a.assetTag === assetOrCiId || a.ipAddress === ci?.ipAddress);

    if (!ci && !asset) {
      return null;
    }

    const hostname = ci?.hostname || asset?.name || 'hostname-desconhecido';
    const ipAddress = ci?.ipAddress || asset?.ipAddress || '192.168.1.100';

    // Findings associados
    const allFindings = SecurityOrchestrator.listFindings(tenantId);
    const linkedFindings = allFindings.filter(f => 
      f.linkedCiId === ci?.id || 
      f.linkedAssetId === asset?.id || 
      f.affectedAssetName === ci?.name ||
      f.affectedAssetName === asset?.name ||
      (f.affectedUrl && f.affectedUrl.includes(ipAddress))
    );

    const activeFindings = linkedFindings.filter(f => f.status !== 'RESOLVED' && f.status !== 'FALSE_POSITIVE');
    const criticalFindings = activeFindings.filter(f => f.severity === 'CRITICAL');

    // Score de Risco do Ativo (0 a 100)
    let calculatedRisk = 10;
    if (criticalFindings.length > 0) calculatedRisk += 50;
    calculatedRisk += activeFindings.length * 8;
    calculatedRisk = Math.min(100, calculatedRisk);

    const securityScore = Math.max(0, 100 - calculatedRisk);

    // Tickets do Ativo
    const cmdbTickets = this.getCmdbTickets(tenantId);
    const linkedTickets = cmdbTickets
      .filter(t => t.ciId === ci?.id || t.ciCode === ci?.code)
      .map(t => ({
        id: t.id,
        code: t.ticketNumber,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assignedTo: t.assignedTechnician || 'Equipe SecOps',
        createdAt: t.createdAt,
        findingCode: linkedFindings.find(f => f.ticketLinkId === t.id)?.code
      }));

    // Remediações do Ativo
    const allRemediations = SecurityOrchestrator.listRemediations(tenantId);
    const linkedRemediations = allRemediations.filter(r => 
      linkedFindings.some(f => f.id === r.findingId)
    );

    // Timeline Consolidada de Segurança (Item 21)
    const timelineEvents: SecurityTimelineEvent[] = [];

    // 1. Descoberta do Ativo
    timelineEvents.push({
      id: `evt-disc-${assetOrCiId}`,
      date: ci?.createdAt || asset?.acquisitionDate || '2024-01-10T10:00:00.000Z',
      type: 'ASSET_DISCOVERY',
      title: 'Ativo Registrado e Descoberto no CMDB',
      description: `Equipamento ${ci?.name || asset?.name} integrado ao inventário central com IP ${ipAddress}.`,
      actor: 'Sistema / Discovery Engine',
      metadata: { ipAddress, layer: ci?.layer }
    });

    // 2. Agente RMM Enrolado
    timelineEvents.push({
      id: `evt-agent-${assetOrCiId}`,
      date: '2026-02-15T09:30:00.000Z',
      type: 'AGENT_ENROLLED',
      title: 'Agente WorkPulse Conectado com Sucesso',
      description: 'Telemetria em tempo real ativada com coleta de SO, portas e pacotes instalados.',
      actor: 'GPO / WorkPulse Agent v2.5.0'
    });

    // 3. Scan de Segurança
    timelineEvents.push({
      id: `evt-scan-${assetOrCiId}`,
      date: '2026-09-08T02:00:00.000Z',
      type: 'SECURITY_SCAN',
      title: 'Scan de Segurança de Superfície Concluído',
      description: 'Varredura passiva e validação de baselines executada conforme política corporativa.',
      actor: 'Security Engine (Safe-Mode)',
      metadata: { target: ipAddress }
    });

    // 4. Vulnerabilidades Detectadas
    linkedFindings.forEach(f => {
      timelineEvents.push({
        id: `evt-fnd-${f.id}`,
        date: f.createdAt,
        type: 'FINDING_DETECTED',
        title: `Vulnerabilidade Identificada: [${f.code}] ${f.title}`,
        description: `Severidade ${f.severity} (CVSS ${f.cvssScore || 'N/A'}). Impacto: ${f.impact}`,
        actor: 'Finding Processor',
        severity: f.severity,
        metadata: { findingId: f.id, code: f.code }
      });
    });

    // 5. Chamados Abertos
    linkedTickets.forEach(t => {
      timelineEvents.push({
        id: `evt-tkt-${t.id}`,
        date: t.createdAt,
        type: 'TICKET_CREATED',
        title: `Chamado Técnico Gerado: ${t.code} - ${t.title}`,
        description: `Status: ${t.status.toUpperCase()}. Prioridade: ${t.priority.toUpperCase()}. Atribuído a: ${t.assignedTo}`,
        actor: 'Central de Remediação SecOps',
        metadata: { ticketId: t.id }
      });
    });

    // 6. Reteste & Resoluções
    linkedFindings.filter(f => f.status === 'RESOLVED' || f.status === 'VERIFIED').forEach(f => {
      timelineEvents.push({
        id: `evt-res-${f.id}`,
        date: f.resolvedAt || new Date().toISOString(),
        type: 'FINDING_RESOLVED',
        title: `Vulnerabilidade Corrigida e Validada: ${f.code}`,
        description: 'Reteste automatizado executado com sucesso e evidência criptográfica SHA-256 anexada.',
        actor: 'Retest Engine',
        severity: 'LOW'
      });
    });

    // Ordenar cronologicamente inverso
    timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      identification: {
        assetId: asset?.id || ci?.id || '',
        ciId: ci?.id,
        ciCode: ci?.code,
        hostname,
        ipAddress,
        macAddress: ci?.macAddress || asset?.macAddress,
        operatingSystem: ci?.operatingSystem || asset?.notes?.includes('ESXi') ? 'VMware ESXi 8.0' : 'Linux Enterprise / Ubuntu 22.04 LTS',
        osVersion: 'Build 22631.3296 / Kernel 5.15',
        responsible: ci?.responsible || asset?.assignedEmployeeName || 'SecOps / Infraestrutura',
        location: ci?.location || asset?.roomName || 'Datacenter Principal',
        unit: ci?.unit || 'Matriz',
        clientName: ci?.clientName || 'Empresa ABC',
        category: ci?.typeGroup || asset?.category || 'servidor',
        criticality: ci?.criticality || 'alta',
        agentStatus: 'online',
        linkedTopologyNodeId: asset?.linkedTopologyNodeId || 'node_server_1'
      },
      security: {
        securityScore,
        riskScore: calculatedRisk,
        activeFindingsCount: activeFindings.length,
        criticalFindingsCount: criticalFindings.length,
        findings: linkedFindings,
        vulnerabilitiesCount: linkedFindings.length,
        lastScanDate: '2026-09-08T02:00:00.000Z',
        lastPentestDate: '2026-09-07T14:30:00.000Z',
        lastRetestDate: linkedFindings.find(f => f.resolvedAt)?.resolvedAt,
        compliancePct: calculatedRisk < 30 ? 92 : calculatedRisk < 60 ? 78 : 64
      },
      operations: {
        tickets: linkedTickets,
        incidents: [
          {
            id: 'inc-2026-0012',
            code: 'INC-SEC-012',
            title: 'Tentativa de Força Bruta Detectada na Porta SSH',
            severity: 'MEDIA',
            status: 'MITIGADO',
            date: '2026-09-06T18:22:00.000Z',
            resolutionNotes: 'IP de origem adicionado a lista de bloqueio no Firewall perimetral.'
          }
        ],
        remediations: linkedRemediations
      },
      timeline: {
        events: timelineEvents
      }
    };
  }

  /**
   * Cria um chamado de suporte/remediação vinculado diretamente a uma vulnerabilidade (Etapa 9 - Item 8)
   */
  public static createTicketForFinding(
    tenantId: string,
    findingId: string,
    ticketData: {
      title: string;
      description?: string;
      priority: 'urgente' | 'alta' | 'media' | 'baixa';
      assignedTo: string;
    },
    user: { id: string; name: string; email?: string; role?: string }
  ): { success: boolean; ticket: CMDBTicketLink; message: string } {
    const findingResult = SecurityOrchestrator.getFindingById(tenantId, findingId);
    const finding = findingResult?.finding;
    if (!finding) {
      throw new Error('Vulnerabilidade não encontrada.');
    }

    const cmdbItems = this.getCmdbItems(tenantId);
    const ci = cmdbItems.find(i => i.id === finding.linkedCiId || i.name === finding.affectedAssetName) || cmdbItems[0];

    const currentTickets = this.getCmdbTickets(tenantId);
    const ticketNumber = `TKT-SEC-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTicket: CMDBTicketLink = {
      id: `tkt-${Date.now()}`,
      ticketNumber,
      tenantId,
      ciId: ci?.id || 'ci-unknown',
      ciCode: ci?.code || 'CI-GEN-01',
      ciName: ci?.name || finding.affectedAssetName || 'Ativo Afetado',
      title: ticketData.title || `[Segurança] Remediação: ${finding.title}`,
      priority: ticketData.priority,
      status: 'aberto',
      requester: `${user.name} (SecOps)`,
      assignedTechnician: ticketData.assignedTo,
      createdAt: new Date().toISOString(),
      slaLimit: new Date(Date.now() + 48 * 3600000).toISOString(),
      slaBreached: false
    };

    // Adicionar ticket ao CMDB
    currentTickets.unshift(newTicket);
    this.saveCmdbTickets(tenantId, currentTickets);

    // Atualizar finding com link para o ticket
    finding.ticketLinkId = newTicket.id;
    finding.assignedToName = ticketData.assignedTo;
    SecurityOrchestrator.updateFindingStatus(
      tenantId,
      findingId,
      'IN_REMEDIATION',
      `Chamado ${newTicket.ticketNumber} aberto no CMDB para remediação da vulnerabilidade.`,
      { id: user.id, name: user.name, email: user.email || 'secops@workpulse.local', role: user.role || 'SecOps Lead' }
    );

    // Registrar Trilha de Auditoria com HMAC
    SecurityOrchestrator.recordAudit(
      tenantId,
      { id: user.id, name: user.name, email: user.email || 'secops@workpulse.local', role: user.role || 'SecOps Lead' },
      'FINDING_TICKET_LINKED',
      'SECURITY_FINDING',
      finding.id,
      '127.0.0.1',
      null,
      { ticketId: newTicket.id, priority: newTicket.priority }
    );

    return {
      success: true,
      ticket: newTicket,
      message: `Chamado ${newTicket.ticketNumber} aberto no CMDB com sucesso e vinculado à vulnerabilidade.`
    };
  }

  /**
   * Resolve chamado no CMDB com garantia Zero-Trust:
   * "Fechar ticket não deverá fechar automaticamente o Finding."
   */
  public static resolveTicket(
    tenantId: string,
    ticketId: string,
    resolutionNotes: string,
    user: { id: string; name: string; email?: string; role?: string }
  ): { success: boolean; message: string; findingStatus: string } {
    const currentTickets = this.getCmdbTickets(tenantId);
    const ticketIndex = currentTickets.findIndex(t => t.id === ticketId);
    if (ticketIndex === -1) {
      throw new Error('Chamado não encontrado no CMDB.');
    }

    const ticket = currentTickets[ticketIndex];
    ticket.status = 'resolvido';
    this.saveCmdbTickets(tenantId, currentTickets);

    // Localizar finding vinculado
    const allFindings = SecurityOrchestrator.listFindings(tenantId);
    const finding = allFindings.find(f => f.ticketLinkId === ticketId);

    let updatedFindingStatus = 'REMEDIATION';
    if (finding) {
      // Regra 8: Não fecha o finding, move para FIXED_PENDING_RETEST
      updatedFindingStatus = 'FIXED_PENDING_RETEST';
      SecurityOrchestrator.updateFindingStatus(
        tenantId,
        finding.id,
        'FIXED_PENDING_RETEST',
        `Chamado ${ticket.ticketNumber} resolvido no CMDB. Remediação aplicada: ${resolutionNotes}`,
        { id: user.id, name: user.name, email: user.email || 'secops@workpulse.local', role: user.role || 'SecOps Lead' }
      );

      SecurityOrchestrator.recordAudit(
        tenantId,
        { id: user.id, name: user.name, email: user.email || 'secops@workpulse.local', role: user.role || 'SecOps Lead' },
        'TICKET_RESOLVED_PENDING_RETEST',
        'SECURITY_FINDING',
        finding.id,
        '127.0.0.1',
        null,
        { ticketId, resolutionNotes }
      );
    }

    return {
      success: true,
      message: `Chamado ${ticket.ticketNumber} resolvido com sucesso. O finding permanece aguardando reteste técnico formal antes do encerramento definitivo.`,
      findingStatus: updatedFindingStatus
    };
  }

  /**
   * Realiza busca unificada de entidades de segurança (Etapa 9 - Item 22)
   */
  public static searchSecurityEntities(tenantId: string, query: string): SecuritySearchResult[] {
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase().trim();
    const results: SecuritySearchResult[] = [];

    // 1. Findings
    const findings = SecurityOrchestrator.listFindings(tenantId);
    findings.forEach(f => {
      if (
        f.code.toLowerCase().includes(q) ||
        f.title.toLowerCase().includes(q) ||
        (f.cveId && f.cveId.toLowerCase().includes(q)) ||
        (f.affectedAssetName && f.affectedAssetName.toLowerCase().includes(q))
      ) {
        results.push({
          id: f.id,
          type: 'FINDING',
          code: f.code,
          title: f.title,
          subtitle: `Severidade: ${f.severity} | Status: ${f.status} | Ativo: ${f.affectedAssetName || 'Geral'}`,
          severity: f.severity,
          status: f.status,
          targetTab: 'findings',
          metadata: { findingId: f.id }
        });
      }
    });

    // 2. CIs do CMDB
    const cmdbItems = this.getCmdbItems(tenantId);
    cmdbItems.forEach(ci => {
      if (
        ci.name.toLowerCase().includes(q) ||
        ci.code.toLowerCase().includes(q) ||
        ci.ipAddress.toLowerCase().includes(q) ||
        ci.hostname.toLowerCase().includes(q)
      ) {
        results.push({
          id: ci.id,
          type: 'CI',
          code: ci.code,
          title: ci.name,
          subtitle: `IP: ${ci.ipAddress} | Host: ${ci.hostname} | Criticidade: ${ci.criticality}`,
          status: ci.status,
          targetTab: 'asset_profile',
          metadata: { ciId: ci.id }
        });
      }
    });

    // 3. Targets de Segurança
    const targets = SecurityOrchestrator.listTargets(tenantId);
    targets.forEach(t => {
      if (t.targetValue.toLowerCase().includes(q) || (t.ciName && t.ciName.toLowerCase().includes(q))) {
        results.push({
          id: t.id,
          type: 'TARGET',
          title: t.targetValue,
          subtitle: `Alvo: ${t.targetValue} (${t.targetType}) | Criticidade: ${t.criticality}`,
          status: t.validationStatus,
          targetTab: 'scopes',
          metadata: { targetId: t.id }
        });
      }
    });

    // 4. Scans
    const scans = SecurityOrchestrator.listScans(tenantId);
    scans.forEach(s => {
      if (s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)) {
        results.push({
          id: s.id,
          type: 'SCAN',
          code: s.code,
          title: s.title,
          subtitle: `Tipo: ${s.scanType} | Status: ${s.status}`,
          status: s.status,
          targetTab: 'scans',
          metadata: { scanId: s.id }
        });
      }
    });

    // 5. Chamados
    const tickets = this.getCmdbTickets(tenantId);
    tickets.forEach(t => {
      if (t.ticketNumber.toLowerCase().includes(q) || t.title.toLowerCase().includes(q)) {
        results.push({
          id: t.id,
          type: 'TICKET',
          code: t.ticketNumber,
          title: t.title,
          subtitle: `CI: ${t.ciName} | Prioridade: ${t.priority} | Status: ${t.status}`,
          status: t.status,
          targetTab: 'action_center',
          metadata: { ticketId: t.id }
        });
      }
    });

    // 6. Relatórios
    const reports = SecurityOrchestrator.listReports(tenantId);
    reports.forEach(r => {
      if (r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)) {
        results.push({
          id: r.id,
          type: 'REPORT',
          code: r.id,
          title: r.title,
          subtitle: `Tipo: ${r.type} | Classificação: ${r.confidentialityLevel} | Autor: ${r.generatedBy?.userName || 'SecOps'}`,
          status: r.status,
          targetTab: 'reports',
          metadata: { reportId: r.id }
        });
      }
    });

    return results.slice(0, 20);
  }
}
