import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Search, 
  Filter, 
  ShieldCheck, 
  Key, 
  Edit3, 
  Trash2, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Mail, 
  Building2, 
  Laptop, 
  Wifi, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ShieldAlert, 
  Clock, 
  Lock, 
  Check, 
  Users, 
  LayoutGrid, 
  List,
  MoreVertical,
  UserX,
  FileCode2,
  Download,
  Copy,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Code2,
  Server,
  Layers,
  Shield,
  Activity,
  Globe,
  LogOut,
  AlertTriangle,
  FileText,
  FolderTree,
  Monitor,
  Terminal,
  Cpu,
  Plus,
  PlusCircle,
  X,
  Briefcase,
  Tag,
  AlertCircle,
  Database
} from 'lucide-react';
import { CurrentUser, Department } from '../types';

interface UserRegistrationProps {
  currentUser: CurrentUser;
  setCurrentUser: (user: CurrentUser) => void;
  availableUsers: CurrentUser[];
  onUpdateUsersList?: (users: CurrentUser[]) => void;
  openCreateModalTrigger?: number;
  onOpenBackupModal?: () => void;
}

// Operational Roles definitions (WorkPulse System Access Levels)
export interface OperationalRole {
  id: string;
  label: string;
  badgeColor: string;
  description: string;
}

export const OPERATIONAL_ROLES: OperationalRole[] = [
  { id: 'ADMIN_GERAL', label: 'Admin Geral', badgeColor: 'bg-purple-600 text-white', description: 'Acesso total e irrestrito a todos os módulos, configurações de segurança e APIs' },
  { id: 'DIRETORIA', label: 'Diretoria', badgeColor: 'bg-indigo-600 text-white', description: 'Visão executiva estratégica, BI de performance, rankings e relatórios consolidados' },
  { id: 'RH_PEOPLE', label: 'RH & Pessoas', badgeColor: 'bg-rose-600 text-white', description: 'Gestão de jornada de trabalho, espelho de ponto eletrônico (REP), frequências e colaboradores' },
  { id: 'GESTORES', label: 'Gestores de Equipe', badgeColor: 'bg-emerald-600 text-white', description: 'Supervisão da equipe, acompanhamento de atividades, ociosidade e aprovação de horas' },
  { id: 'TI_COMPLIANCE', label: 'TI & Compliance', badgeColor: 'bg-amber-600 text-white', description: 'Gestão de regras de bloqueio GPO, agente silencioso, LGPD, auditoria e integrações API' },
  { id: 'COLABORADOR', label: 'Colaborador', badgeColor: 'bg-slate-700 text-white', description: 'Acesso ao espelho de ponto pessoal, métricas próprias e base de conhecimento POP' },
];

export const ACTIONS_LIST = [
  { key: 'VER', label: 'VER', desc: 'Visualizar dados e relatórios' },
  { key: 'CRIAR', label: 'CRIAR', desc: 'Cadastrar novos registros' },
  { key: 'EDITAR', label: 'EDITAR', desc: 'Modificar registros existentes' },
  { key: 'EXCLUIR', label: 'EXCLUIR', desc: 'Deletar dados do sistema' },
  { key: 'APROVAR', label: 'APROVAR', desc: 'Aprovar solicitações e horas' },
  { key: 'EXPORTAR', label: 'EXPORTAR', desc: 'Baixar relatórios CSV/PDF' },
  { key: 'AUDITAR', label: 'AUDITAR', desc: 'Consultar logs de auditoria' },
] as const;

export interface OperationalModule {
  id: string;
  name: string;
  category: string;
  endpointRoute: string;
}

export const OPERATIONAL_MODULES: OperationalModule[] = [
  { id: 'overview', name: 'Visão Geral Executiva', category: 'Dashboard & Indicadores', endpointRoute: '/api/v1/dashboard/metrics' },
  { id: 'realtime', name: 'Tempo Real & Ocorrências', category: 'Rastreabilidade Operacional', endpointRoute: '/api/v1/activity/realtime' },
  { id: 'employees', name: 'Colaboradores & Ponto (REP)', category: 'Jornada & Compliance', endpointRoute: '/api/v1/hr/employees-timecards' },
  { id: 'departments', name: 'Setores & Departamentos', category: 'Estrutura Organizacional', endpointRoute: '/api/v1/organization/departments' },
  { id: 'reports', name: 'Relatórios & BI', category: 'BI & Controladoria', endpointRoute: '/api/v1/reports/export' },
  { id: 'rankings', name: 'Rankings & Produtividade', category: 'Performance de Equipes', endpointRoute: '/api/v1/productivity/rankings' },
  { id: 'blocking', name: 'Bloqueio de Sites & PC', category: 'Segurança & Restrição', endpointRoute: '/api/v1/security/site-blocks' },
  { id: 'integrations', name: 'Integrações & API', category: 'Conectividade & APIs', endpointRoute: '/api/v1/integrations/webhooks' },
  { id: 'gpo_lgpd', name: 'Implantação GPO & LGPD', category: 'Implantação & Privacidade', endpointRoute: '/api/v1/compliance/gpo-lgpd' },
  { id: 'device_inventory', name: 'Inventário de Hardwares & SNMP', category: 'Infraestrutura & TI', endpointRoute: '/api/v1/network/devices-inventory' },
  { id: 'asset_management', name: 'Gestão Patrimonial de TI & Ativos (ITAM)', category: 'Patrimônio & ITAM', endpointRoute: '/api/v1/assets/itam' },
  { id: 'app_classification', name: 'Motor de Classificação de Softwares', category: 'Regras de Produtividade', endpointRoute: '/api/v1/productivity/classifications' },
  { id: 'knowledge_base', name: 'Base de Conhecimento & POP', category: 'Governança & Treinamento', endpointRoute: '/api/v1/knowledge/articles' },
  { id: 'user_management', name: 'Gestão de Usuários & Níveis de Acesso', category: 'Segurança & Acessos', endpointRoute: '/api/v1/users' },
];

// Initial matrix permissions state helper
const buildInitialMatrix = () => {
  const matrix: Record<string, Record<string, Record<string, boolean>>> = {};

  OPERATIONAL_ROLES.forEach(role => {
    matrix[role.id] = {};
    OPERATIONAL_MODULES.forEach(mod => {
      const isSystemAdmin = role.id === 'ADMIN_GERAL';
      const isDirector = role.id === 'DIRETORIA';
      const isRH = role.id === 'RH_PEOPLE';
      const isManager = role.id === 'GESTORES';
      const isTI = role.id === 'TI_COMPLIANCE';
      const isUser = role.id === 'COLABORADOR';

      let ver = true;
      let criar = isSystemAdmin || isTI || (isRH && ['employees', 'departments', 'knowledge_base', 'user_management'].includes(mod.id)) || (isManager && ['app_classification', 'rankings', 'knowledge_base'].includes(mod.id));
      let editar = isSystemAdmin || isTI || (isRH && ['employees', 'departments', 'user_management'].includes(mod.id)) || (isManager && ['app_classification', 'knowledge_base'].includes(mod.id));
      let excluir = isSystemAdmin || (isTI && ['blocking', 'gpo_lgpd', 'device_inventory', 'asset_management', 'app_classification'].includes(mod.id));
      let aprovar = isSystemAdmin || (isDirector && ['overview', 'employees', 'reports', 'rankings'].includes(mod.id)) || (isRH && ['employees', 'rankings'].includes(mod.id)) || (isManager && ['employees'].includes(mod.id));
      let exportar = !isUser;
      let auditar = isSystemAdmin || (isDirector && ['gpo_lgpd', 'user_management', 'reports'].includes(mod.id)) || (isRH && ['employees', 'gpo_lgpd'].includes(mod.id)) || isTI;

      if (isUser) {
        ver = ['overview', 'employees', 'knowledge_base'].includes(mod.id);
        criar = false;
        editar = false;
        excluir = false;
        aprovar = false;
        exportar = false;
        auditar = false;
      }

      matrix[role.id][mod.id] = {
        VER: ver,
        CRIAR: criar,
        EDITAR: editar,
        EXCLUIR: excluir,
        APROVAR: aprovar,
        EXPORTAR: exportar,
        AUDITAR: auditar,
      };
    });
  });

  return matrix;
};

// API Endpoints Spec List (WorkPulse Endpoints)
export const API_ROUTES_SPEC = [
  { method: 'GET', path: '/api/v1/dashboard/metrics', summary: 'Obter indicadores e métricas consolidadas de produtividade', auth: 'Bearer Token (JWT)', scope: 'overview:read' },
  { method: 'GET', path: '/api/v1/activity/realtime', summary: 'Consultar linha do tempo de aplicativos, sites e ocorrências em tempo real', auth: 'Bearer Token (JWT)', scope: 'realtime:read' },
  { method: 'GET', path: '/api/v1/hr/employees-timecards', summary: 'Listar registros de ponto eletrônico (REP) e espelho de jornada', auth: 'Bearer Token (JWT)', scope: 'employees:read' },
  { method: 'POST', path: '/api/v1/hr/employees-timecards/punch', summary: 'Registrar marcação de ponto com geolocalização e IP', auth: 'Bearer Token (JWT)', scope: 'employees:write' },
  { method: 'GET', path: '/api/v1/organization/departments', summary: 'Estrutura organizacional de centros de custo e setores corporativos', auth: 'Bearer Token (JWT)', scope: 'departments:read' },
  { method: 'GET', path: '/api/v1/productivity/classifications', summary: 'Listar regras de classificação de produtividade de softwares', auth: 'Bearer Token (JWT)', scope: 'classification:read' },
  { method: 'POST', path: '/api/v1/productivity/classifications', summary: 'Cadastrar e classificar regras de software (Produtivo/Improdutivo)', auth: 'Bearer Token (JWT)', scope: 'classification:write' },
  { method: 'GET', path: '/api/v1/security/site-blocks', summary: 'Consultar URLs, categorias e PCs bloqueados via política GPO', auth: 'Bearer Token (JWT)', scope: 'security:read' },
  { method: 'POST', path: '/api/v1/security/site-blocks', summary: 'Adicionar nova regra de restrição de site ou estação', auth: 'Bearer Token (JWT)', scope: 'security:write' },
  { method: 'GET', path: '/api/v1/network/devices-inventory', summary: 'Listar inventário de hardwares e varredura SNMP na sub-rede', auth: 'Bearer Token (JWT)', scope: 'inventory:read' },
  { method: 'GET', path: '/api/v1/reports/powerbi', summary: 'Endpoint OData para sincronização automatizada no Power BI Desktop', auth: 'Bearer Token (JWT)', scope: 'reports:export' },
  { method: 'GET', path: '/api/v1/integrations/webhooks', summary: 'Listar webhooks e chaves de integração ERP (TOTVS, SAP, Senior)', auth: 'Bearer Token (JWT)', scope: 'integrations:admin' },
  { method: 'GET', path: '/api/v1/compliance/gpo-lgpd', summary: 'Status de implantação do agente silencioso e consentimentos LGPD', auth: 'Bearer Token (JWT)', scope: 'compliance:read' },
  { method: 'GET', path: '/api/v1/knowledge/articles', summary: 'Artigos, tutoriais e procedimentos operacionais padrão (POP)', auth: 'Bearer Token (JWT)', scope: 'knowledge:read' },
  { method: 'GET', path: '/api/v1/users', summary: 'Listar usuários e administradores cadastrados no sistema', auth: 'Bearer Token (JWT)', scope: 'users:read' },
  { method: 'POST', path: '/api/v1/users', summary: 'Cadastrar novo usuário e vincular perfil de acesso RBAC', auth: 'Bearer Token (JWT)', scope: 'users:write' },
  { method: 'GET', path: '/api/v1/rbac/matrix', summary: 'Obter matriz de permissões vigentes (13 Módulos x 7 Ações x 6 Perfis)', auth: 'Bearer Token (JWT)', scope: 'rbac:read' },
  { method: 'POST', path: '/api/v1/rbac/matrix', summary: 'Atualizar permissões granulares de um perfil de acesso', auth: 'Bearer Token (JWT)', scope: 'rbac:write' },
  { method: 'DELETE', path: '/api/v1/sessions/:id', summary: 'Encerrar e revogar token de sessão ativa de usuário', auth: 'Bearer Token (JWT)', scope: 'security:admin' },
  { method: 'GET', path: '/api/v1/audit/logs', summary: 'Consultar trilha de auditoria e alterações de permissões RBAC', auth: 'Bearer Token (JWT)', scope: 'audit:read' },
];

// Initial Active Sessions Data
const INITIAL_ACTIVE_SESSIONS = [
  { id: 'sess-101', userId: 'usr-1', userName: 'Carlos Eduardo Silva', userEmail: 'carlos.silva@workpulse.com.br', role: 'ADMIN_GERAL', host: 'PC-DEV-WIN11-01', ip: '192.168.1.25', os: 'Windows 11 Enterprise (23H2)', client: 'WorkPulse Desktop Agent v4.2', loginTime: 'Hoje às 08:00:14', lastActivity: 'Agora mesmo', status: 'Ativa', tokenHash: 'jwt_e8f2...91a2' },
  { id: 'sess-102', userId: 'usr-2', userName: 'Ana Beatriz Souza', userEmail: 'ana.souza@workpulse.com.br', role: 'GESTORES', host: 'PC-ENG-WIN11-04', ip: '192.168.1.42', os: 'Windows 11 Pro', client: 'Chrome 127.0 (Web Client)', loginTime: 'Hoje às 08:12:05', lastActivity: 'Há 1 min', status: 'Ativa', tokenHash: 'jwt_72b1...33d8' },
  { id: 'sess-103', userId: 'usr-3', userName: 'Roberto Almeida', userEmail: 'roberto.almeida@workpulse.com.br', role: 'TI_COMPLIANCE', host: 'PC-TI-LINUX-02', ip: '192.168.1.18', os: 'Ubuntu Linux 24.04 LTS', client: 'WorkPulse Agent daemon v4.2', loginTime: 'Hoje às 07:45:00', lastActivity: 'Há 3 min', status: 'Ativa', tokenHash: 'jwt_94c3...11f0' },
  { id: 'sess-104', userId: 'usr-4', userName: 'Mariana Lima', userEmail: 'mariana.lima@workpulse.com.br', role: 'RH_PEOPLE', host: 'PC-RH-WIN11-02', ip: '192.168.1.88', os: 'Windows 11 Pro', client: 'Edge 126.0 (Web Client)', loginTime: 'Hoje às 08:30:10', lastActivity: 'Há 12 min', status: 'Ociosa', tokenHash: 'jwt_41a8...99e2' },
  { id: 'sess-105', userId: 'usr-5', userName: 'Lucas Ferreira', userEmail: 'lucas.ferreira@workpulse.com.br', role: 'COLABORADOR', host: 'PC-SUP-WIN10-15', ip: '192.168.1.112', os: 'Windows 10 Enterprise', client: 'WorkPulse Desktop Agent v4.1', loginTime: 'Hoje às 08:05:40', lastActivity: 'Há 2 min', status: 'Ativa', tokenHash: 'jwt_33d7...88a1' },
  { id: 'sess-106', userId: 'usr-6', userName: 'Fernanda Oliveira', userEmail: 'fernanda.oliveira@workpulse.com.br', role: 'DIRETORIA', host: 'MAC-EXEC-M3', ip: '192.168.1.05', os: 'macOS Sonoma 14.5', client: 'Safari 17.5 (Web Client)', loginTime: 'Hoje às 09:10:00', lastActivity: 'Há 5 min', status: 'Ativa', tokenHash: 'jwt_12f9...66c4' },
];

// Initial Audit Trail Logs Data
const INITIAL_AUDIT_LOGS = [
  { id: 'log-501', timestamp: '09/08/2026 20:38:12', actorName: 'Carlos Eduardo Silva', actorRole: 'ADMIN_GERAL', action: 'Alteração de Perfil RBAC', target: 'Módulo de Ponto REP [Aprovação]', ip: '192.168.1.25', severity: 'Alta', status: 'Sucesso', details: 'Permissão APROVAR concedida para perfil GESTORES' },
  { id: 'log-502', timestamp: '09/08/2026 20:15:45', actorName: 'Roberto Almeida', actorRole: 'TI_COMPLIANCE', action: 'Nova Regra de Bloqueio GPO', target: 'Dominio: facebook.com', ip: '192.168.1.18', severity: 'Média', status: 'Sucesso', details: 'URL adicionada à lista negra do grupo Engenharia' },
  { id: 'log-503', timestamp: '09/08/2026 19:42:00', actorName: 'Sistema WorkPulse (Auto)', actorRole: 'SISTEMA', action: 'Exportação de Relatório OData', target: 'Endpoint Power BI Desktop', ip: '10.0.0.4', severity: 'Informativa', status: 'Sucesso', details: 'Sincronização agendada de indicadores executivos' },
  { id: 'log-504', timestamp: '09/08/2026 18:30:11', actorName: 'Carlos Eduardo Silva', actorRole: 'ADMIN_GERAL', action: 'Redefinição de Senha', target: 'Usuário: Mariana Lima (RH)', ip: '192.168.1.25', severity: 'Alta', status: 'Sucesso', details: 'Senha temporária gerada e enviada por e-mail' },
  { id: 'log-505', timestamp: '09/08/2026 17:11:02', actorName: 'Tentativa Anônima', actorRole: 'DESCONHECIDO', action: 'Falha de Autenticação API', target: 'Endpoint /api/v1/users', ip: '187.45.122.9', severity: 'Crítica', status: 'Falha', details: 'Token JWT expirado ou assinatura inválida bloqueada' },
  { id: 'log-506', timestamp: '09/08/2026 16:05:22', actorName: 'Ana Beatriz Souza', actorRole: 'GESTORES', action: 'Cadastro de Novo Colaborador', target: 'Usuário: Felipe Santos', ip: '192.168.1.42', severity: 'Média', status: 'Sucesso', details: 'Cadastrado no setor Engenharia com perfil COLABORADOR' },
];

// Department Model for Organizational Structure
export interface DepartmentItem {
  id: string;
  name: string;
  manager: string;
  totalUsers?: number;
  defaultRole: string;
  hostPrefix: string;
  securityLevel: string;
  status: 'Ativo' | 'Inativo';
  costCenter?: string;
  description?: string;
  createdAt?: string;
}

// Departments Structure Data
export const INITIAL_DEPARTMENTS: DepartmentItem[] = [
  { id: 'dept-1', name: 'Engenharia & TI', manager: 'Carlos Eduardo Silva', totalUsers: 14, defaultRole: 'COLABORADOR', hostPrefix: 'PC-DEV-', securityLevel: 'Máximo (AES-256 + TLS 1.3)', status: 'Ativo', costCenter: 'CC-1010', description: 'Desenvolvimento de software, infraestrutura em nuvem, DevOps e suporte de TI' },
  { id: 'dept-2', name: 'Vendas & Comercial', manager: 'Ana Beatriz Souza', totalUsers: 12, defaultRole: 'COLABORADOR', hostPrefix: 'PC-VEN-', securityLevel: 'Padrão Corporativo', status: 'Ativo', costCenter: 'CC-2010', description: 'Prospecção, vendas B2B, account managers e relacionamento' },
  { id: 'dept-3', name: 'RH & Pessoas', manager: 'Mariana Lima', totalUsers: 6, defaultRole: 'RH_PEOPLE', hostPrefix: 'PC-RH-', securityLevel: 'Restrito (LGPD Nível 3)', status: 'Ativo', costCenter: 'CC-3010', description: 'Recrutamento, departamento pessoal, gestão de jornada e benefícios' },
  { id: 'dept-4', name: 'Atendimento & Suporte', manager: 'Lucas Ferreira', totalUsers: 10, defaultRole: 'COLABORADOR', hostPrefix: 'PC-SUP-', securityLevel: 'Padrão Corporativo', status: 'Ativo', costCenter: 'CC-4010', description: 'Atendimento N1/N2/N3 aos clientes finais e suporte operacional' },
  { id: 'dept-5', name: 'Marketing & Mídia', manager: 'Julia Mendes', totalUsers: 5, defaultRole: 'COLABORADOR', hostPrefix: 'PC-MKT-', securityLevel: 'Padrão Corporativo', status: 'Ativo', costCenter: 'CC-5010', description: 'Design, campanhas de tráfego, branding e conteúdo' },
  { id: 'dept-6', name: 'Financeiro & Jurídico', manager: 'Fernanda Oliveira', totalUsers: 3, defaultRole: 'DIRETORIA', hostPrefix: 'PC-FIN-', securityLevel: 'Máximo (Auditoria Contínua)', status: 'Ativo', costCenter: 'CC-6010', description: 'Contabilidade, controladoria, compliance fiscal e assessoria jurídica' },
];

export const UserRegistration: React.FC<UserRegistrationProps> = ({
  currentUser,
  setCurrentUser,
  availableUsers,
  onUpdateUsersList,
  openCreateModalTrigger,
  onOpenBackupModal
}) => {
  // Main Sub-Tab Navigation State
  const [activeSubTab, setActiveSubTab] = useState<'users_list' | 'active_sessions' | 'rbac_matrix' | 'audit_logs' | 'departments' | 'api_endpoints'>('users_list');

  // Departments CRUD State with LocalStorage Persistence
  const [departments, setDepartments] = useState<DepartmentItem[]>(() => {
    const saved = localStorage.getItem('applet_workpulse_departments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading departments from localStorage:', e);
      }
    }
    return INITIAL_DEPARTMENTS;
  });

  // Department Filters & UI View Mode State
  const [deptSearch, setDeptSearch] = useState('');
  const [deptStatusFilter, setDeptStatusFilter] = useState<'Todos' | 'Ativo' | 'Inativo'>('Todos');
  const [deptSecurityFilter, setDeptSecurityFilter] = useState<string>('Todos');
  const [deptViewMode, setDeptViewMode] = useState<'table' | 'cards'>('table');

  // Department Modals State
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [deletingDept, setDeletingDept] = useState<DepartmentItem | null>(null);
  const [deptFormData, setDeptFormData] = useState({
    name: '',
    manager: '',
    defaultRole: 'COLABORADOR',
    hostPrefix: 'PC-',
    securityLevel: 'Padrão Corporativo',
    status: 'Ativo' as 'Ativo' | 'Inativo',
    costCenter: '',
    description: ''
  });

  // Active Sessions State
  const [activeSessions, setActiveSessions] = useState(INITIAL_ACTIVE_SESSIONS);
  const [sessionSearch, setSessionSearch] = useState('');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<string>('Todas');

  // RBAC Matrix State
  const [selectedRole, setSelectedRole] = useState<string>('GESTORES');
  const [rbacSubView, setRbacSubView] = useState<'matrix' | 'endpoints'>('matrix');
  const [permissionsMatrix, setPermissionsMatrix] = useState(() => {
    const defaultMatrix = buildInitialMatrix();
    const saved = localStorage.getItem('wp_rbac_matrix_v2') || localStorage.getItem('wp_rbac_matrix_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        OPERATIONAL_ROLES.forEach(role => {
          if (!parsed[role.id]) parsed[role.id] = defaultMatrix[role.id] || {};
          OPERATIONAL_MODULES.forEach(mod => {
            if (!parsed[role.id][mod.id]) {
              parsed[role.id][mod.id] = defaultMatrix[role.id]?.[mod.id] || {
                VER: true, CRIAR: false, EDITAR: false, EXCLUIR: false, APROVAR: false, EXPORTAR: false, AUDITAR: false
              };
            }
          });
        });
        return parsed;
      } catch (e) {
        console.error('Error loading RBAC matrix:', e);
      }
    }
    return defaultMatrix;
  });

  useEffect(() => {
    localStorage.setItem('wp_rbac_matrix_v2', JSON.stringify(permissionsMatrix));
  }, [permissionsMatrix]);

  // Modal OpenAPI Export State
  const [isOpenApiModalOpen, setIsOpenApiModalOpen] = useState(false);

  // Local list state for live CRUD operations
  const [usersList, setUsersList] = useState<CurrentUser[]>(() => {
    const saved = localStorage.getItem('wp_users_list_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return availableUsers.map((u, idx) => ({
      ...u,
      password: u.password || (idx === 0 ? 'Admin@WorkPulse2026!' : `WorkPulse@${2026 + idx}`)
    }));
  });

  useEffect(() => {
    localStorage.setItem('wp_users_list_v1', JSON.stringify(usersList));
  }, [usersList]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccessFilter, setSelectedAccessFilter] = useState<string>('Todos');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<Department | 'Todas as Áreas'>('Todas as Áreas');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Multi-selection & Batch Actions State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBatchDeptModalOpen, setIsBatchDeptModalOpen] = useState(false);
  const [targetBatchDepartment, setTargetBatchDepartment] = useState<Department>('Engenharia');
  const [isBatchRoleModalOpen, setIsBatchRoleModalOpen] = useState(false);
  const [targetBatchRole, setTargetBatchRole] = useState<string>('COLABORADOR');

  // Multi-selection handlers
  const handleSelectUser = (id: string) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredUsers.map(u => u.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedUserIds.includes(id));

    if (allSelected) {
      setSelectedUserIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedUserIds, ...filteredIds]));
      setSelectedUserIds(combined);
    }
  };

  const handleClearSelection = () => {
    setSelectedUserIds([]);
  };

  const handleBatchDeactivate = () => {
    if (selectedUserIds.length === 0) return;

    const usersToDeactivate = selectedUserIds.filter(id => id !== currentUser.id);
    const hadSelf = selectedUserIds.includes(currentUser.id);

    if (usersToDeactivate.length === 0) {
      showToast('Sua própria conta ativa não pode ser desativada.');
      return;
    }

    if (confirm(`Tem certeza que deseja desativar ${usersToDeactivate.length} usuário(s) selecionado(s)?`)) {
      const updated = usersList.map(u => {
        if (usersToDeactivate.includes(u.id)) {
          return { ...u, status: 'Inativo' as const };
        }
        return u;
      });

      setUsersList(updated);
      if (onUpdateUsersList) onUpdateUsersList(updated);

      const newLog = {
        id: `log-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toLocaleString('pt-BR'),
        actorName: currentUser.name,
        actorRole: currentUser.accessLevel,
        action: 'Desativação de Usuários em Massa',
        target: `${usersToDeactivate.length} usuários selecionados`,
        ip: currentUser.ipAddress || '192.168.1.25',
        severity: 'Alta',
        status: 'Sucesso',
        details: `Desativação em lote efetuada por ${currentUser.name}`
      };
      setAuditLogs(prev => [newLog, ...prev]);

      showToast(
        `${usersToDeactivate.length} usuário(s) desativado(s) com sucesso.` +
        (hadSelf ? ' (Sua própria conta foi preservada)' : '')
      );
      setSelectedUserIds([]);
    }
  };

  const handleBatchActivate = () => {
    if (selectedUserIds.length === 0) return;

    if (confirm(`Deseja reativar ${selectedUserIds.length} usuário(s) selecionado(s)?`)) {
      const updated = usersList.map(u => {
        if (selectedUserIds.includes(u.id)) {
          return { ...u, status: 'Ativo' as const };
        }
        return u;
      });

      setUsersList(updated);
      if (onUpdateUsersList) onUpdateUsersList(updated);

      showToast(`${selectedUserIds.length} usuário(s) reativado(s) com sucesso.`);
      setSelectedUserIds([]);
    }
  };

  const handleApplyBatchDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;

    const updated = usersList.map(u => {
      if (selectedUserIds.includes(u.id)) {
        return { ...u, department: targetBatchDepartment };
      }
      return u;
    });

    setUsersList(updated);
    if (onUpdateUsersList) onUpdateUsersList(updated);

    if (selectedUserIds.includes(currentUser.id)) {
      setCurrentUser({
        ...currentUser,
        department: targetBatchDepartment
      });
    }

    const newLog = {
      id: `log-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString('pt-BR'),
      actorName: currentUser.name,
      actorRole: currentUser.accessLevel,
      action: 'Alteração de Departamento em Massa',
      target: `${selectedUserIds.length} usuários -> ${targetBatchDepartment}`,
      ip: currentUser.ipAddress || '192.168.1.25',
      severity: 'Média',
      status: 'Sucesso',
      details: `Departamento alterado para "${targetBatchDepartment}" em lote`
    };
    setAuditLogs(prev => [newLog, ...prev]);

    showToast(`Departamento de ${selectedUserIds.length} usuário(s) alterado para "${targetBatchDepartment}".`);
    setSelectedUserIds([]);
    setIsBatchDeptModalOpen(false);
  };

  const handleApplyBatchRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;

    const updated = usersList.map(u => {
      if (selectedUserIds.includes(u.id)) {
        return { ...u, accessLevel: targetBatchRole };
      }
      return u;
    });

    setUsersList(updated);
    if (onUpdateUsersList) onUpdateUsersList(updated);

    if (selectedUserIds.includes(currentUser.id)) {
      setCurrentUser({
        ...currentUser,
        accessLevel: targetBatchRole
      });
    }

    const newLog = {
      id: `log-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString('pt-BR'),
      actorName: currentUser.name,
      actorRole: currentUser.accessLevel,
      action: 'Alteração de Perfil RBAC em Massa',
      target: `${selectedUserIds.length} usuários -> ${targetBatchRole}`,
      ip: currentUser.ipAddress || '192.168.1.25',
      severity: 'Alta',
      status: 'Sucesso',
      details: `Perfil de acesso alterado para "${targetBatchRole}" em lote`
    };
    setAuditLogs(prev => [newLog, ...prev]);

    showToast(`Perfil RBAC de ${selectedUserIds.length} usuário(s) alterado para "${targetBatchRole}".`);
    setSelectedUserIds([]);
    setIsBatchRoleModalOpen(false);
  };

  const handleBatchDelete = () => {
    if (selectedUserIds.length === 0) return;

    const usersToDelete = selectedUserIds.filter(id => id !== currentUser.id);
    const hadSelf = selectedUserIds.includes(currentUser.id);

    if (usersToDelete.length === 0) {
      showToast('Sua própria conta ativa não pode ser excluída.');
      return;
    }

    if (confirm(`ATENÇÃO: Tem certeza que deseja remover PERMANENTEMENTE ${usersToDelete.length} usuário(s) selecionado(s)?`)) {
      const updated = usersList.filter(u => !usersToDelete.includes(u.id));
      setUsersList(updated);
      if (onUpdateUsersList) onUpdateUsersList(updated);

      showToast(
        `${usersToDelete.length} usuário(s) removido(s) do sistema.` +
        (hadSelf ? ' (Sua própria conta foi preservada)' : '')
      );
      setSelectedUserIds([]);
    }
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CurrentUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Password reset modal / Toast state
  const [resetPassUser, setResetPassUser] = useState<CurrentUser | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    accessLevel: 'COLABORADOR',
    department: 'Engenharia' as Department,
    password: '',
    computerHost: '',
    ipAddress: '',
    avatar: ''
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleTogglePermission = (roleId: string, moduleId: string, actionKey: string) => {
    setPermissionsMatrix((prev: any) => {
      const updated = {
        ...prev,
        [roleId]: {
          ...prev[roleId],
          [moduleId]: {
            ...prev[roleId][moduleId],
            [actionKey]: !prev[roleId][moduleId][actionKey]
          }
        }
      };
      localStorage.setItem('wp_rbac_matrix_v1', JSON.stringify(updated));
      return updated;
    });

    const roleName = OPERATIONAL_ROLES.find(r => r.id === roleId)?.label;
    const modName = OPERATIONAL_MODULES.find(m => m.id === moduleId)?.name;
    showToast(`Permissão "${actionKey}" alterada para [${roleName}] no módulo [${modName}].`);
  };

  const handleToggleAllForRole = (roleId: string, enable: boolean) => {
    setPermissionsMatrix((prev: any) => {
      const updated = { ...prev };
      updated[roleId] = {};
      OPERATIONAL_MODULES.forEach(mod => {
        updated[roleId][mod.id] = {
          VER: enable,
          CRIAR: enable,
          EDITAR: enable,
          EXCLUIR: enable,
          APROVAR: enable,
          EXPORTAR: enable,
          AUDITAR: enable,
        };
      });
      localStorage.setItem('wp_rbac_matrix_v1', JSON.stringify(updated));
      return updated;
    });
    const roleName = OPERATIONAL_ROLES.find(r => r.id === roleId)?.label;
    showToast(enable ? `Todas as permissões concedidas para ${roleName}.` : `Todas as permissões revogadas para ${roleName}.`);
  };

  const handleTerminateSession = (sessionId: string, userName: string) => {
    if (confirm(`Desconectar e revogar a sessão ativa de "${userName}"?`)) {
      setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
      showToast(`Sessão de "${userName}" foi encerrada e o token JWT foi revogado.`);
      
      // Log to audit
      const newLog = {
        id: `log-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toLocaleString('pt-BR'),
        actorName: currentUser.name,
        actorRole: currentUser.accessLevel,
        action: 'Revogação de Sessão Ativa',
        target: `Usuário: ${userName}`,
        ip: currentUser.ipAddress || '192.168.1.25',
        severity: 'Alta',
        status: 'Sucesso',
        details: 'Sessão encerrada manualmente pelo gestor de TI'
      };
      setAuditLogs(prev => [newLog, ...prev]);
    }
  };

  const handleTerminateAllIdleSessions = () => {
    const idleCount = activeSessions.filter(s => s.status === 'Ociosa').length;
    if (idleCount === 0) {
      showToast('Nenhuma sessão ociosa encontrada no momento.');
      return;
    }
    if (confirm(`Deseja encerrar todas as ${idleCount} sessões ociosas?`)) {
      setActiveSessions(prev => prev.filter(s => s.status !== 'Ociosa'));
      showToast(`${idleCount} sessões ociosas foram desconectadas com sucesso.`);
    }
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'Analista de Operações',
      accessLevel: 'COLABORADOR',
      department: 'Engenharia',
      password: 'WorkPulse@' + Math.floor(1000 + Math.random() * 9000),
      computerHost: 'PC-WIN11-' + Math.floor(100 + Math.random() * 900),
      ipAddress: '192.168.1.' + Math.floor(10 + Math.random() * 200),
      avatar: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=150`
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (openCreateModalTrigger && openCreateModalTrigger > 0) {
      handleOpenAddModal();
    }
  }, [openCreateModalTrigger]);

  const handleOpenEditModal = (user: CurrentUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      accessLevel: user.accessLevel,
      department: (user.department as Department) || 'Engenharia',
      password: user.password || 'WorkPulse@2026',
      computerHost: user.computerHost,
      ipAddress: user.ipAddress,
      avatar: user.avatar
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      alert('Por favor, preencha o Nome e o E-mail corporativo.');
      return;
    }

    if (editingUser) {
      const updated = usersList.map(u => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            name: formData.name,
            email: formData.email,
            role: formData.role,
            accessLevel: formData.accessLevel,
            department: formData.department,
            computerHost: formData.computerHost,
            ipAddress: formData.ipAddress,
            avatar: formData.avatar || u.avatar,
            password: formData.password || u.password || 'WorkPulse@2026'
          };
        }
        return u;
      });
      setUsersList(updated);
      if (onUpdateUsersList) onUpdateUsersList(updated);
      
      if (editingUser.id === currentUser.id) {
        setCurrentUser({
          ...currentUser,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          accessLevel: formData.accessLevel,
          department: formData.department,
          password: formData.password || currentUser.password || 'WorkPulse@2026'
        });
      }

      showToast(`Usuário "${formData.name}" atualizado com sucesso!`);
    } else {
      const newUser: CurrentUser = {
        id: `usr-${Date.now().toString().slice(-4)}`,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        accessLevel: formData.accessLevel,
        department: formData.department,
        avatar: formData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        loginTime: 'Recém Cadastrado',
        ipAddress: formData.ipAddress || '192.168.1.150',
        computerHost: formData.computerHost || 'WIN11-NEW-STATION',
        status: 'Ativo',
        password: formData.password || 'WorkPulse@2026'
      };
      const updated = [newUser, ...usersList];
      setUsersList(updated);
      if (onUpdateUsersList) onUpdateUsersList(updated);
      showToast(`Novo usuário "${formData.name}" cadastrado com sucesso!`);
    }

    setIsModalOpen(false);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (userId === currentUser.id) {
      alert('Você não pode excluir o usuário conectado no momento.');
      return;
    }
    if (confirm(`Tem certeza que deseja remover o usuário "${userName}" do sistema WorkPulse?`)) {
      const updated = usersList.filter(u => u.id !== userId);
      setUsersList(updated);
      if (onUpdateUsersList) onUpdateUsersList(updated);
      showToast(`Usuário "${userName}" removido.`);
    }
  };

  const handleGenerateNewPassword = (user: CurrentUser) => {
    const newPass = `WP#${Math.floor(100000 + Math.random() * 900000)}!`;
    setResetPassUser(user);
    setGeneratedPassword(newPass);
  };

  // --- DEPARTMENTS CRUD HANDLERS ---
  const handleOpenAddDept = () => {
    setEditingDept(null);
    setDeptFormData({
      name: '',
      manager: currentUser.name || '',
      defaultRole: 'COLABORADOR',
      hostPrefix: 'PC-',
      securityLevel: 'Padrão Corporativo',
      status: 'Ativo',
      costCenter: '',
      description: ''
    });
    setIsAddDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept: DepartmentItem) => {
    setEditingDept(dept);
    setDeptFormData({
      name: dept.name,
      manager: dept.manager,
      defaultRole: dept.defaultRole,
      hostPrefix: dept.hostPrefix,
      securityLevel: dept.securityLevel,
      status: dept.status,
      costCenter: dept.costCenter || '',
      description: dept.description || ''
    });
    setIsAddDeptModalOpen(true);
  };

  const handleSaveDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptFormData.name.trim()) {
      showToast('O nome do departamento é obrigatório.');
      return;
    }

    if (editingDept) {
      const updated = departments.map(d => {
        if (d.id === editingDept.id) {
          return {
            ...d,
            ...deptFormData,
            name: deptFormData.name.trim(),
            manager: deptFormData.manager.trim() || 'Não atribuído',
            hostPrefix: deptFormData.hostPrefix.trim() || 'PC-',
            costCenter: deptFormData.costCenter.trim() || undefined,
            description: deptFormData.description.trim() || undefined,
          };
        }
        return d;
      });
      setDepartments(updated);
      localStorage.setItem('applet_workpulse_departments', JSON.stringify(updated));

      const auditLog = {
        id: `log-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toLocaleString('pt-BR'),
        actorName: currentUser.name,
        actorRole: currentUser.accessLevel,
        action: 'Edição de Departamento',
        target: `Departamento: ${deptFormData.name}`,
        ip: currentUser.ipAddress || '192.168.1.25',
        severity: 'Média',
        status: 'Sucesso',
        details: `Dados do setor "${deptFormData.name}" atualizados (Gestor: ${deptFormData.manager}, Segurança: ${deptFormData.securityLevel})`
      };
      setAuditLogs(prev => [auditLog, ...prev]);
      showToast(`Departamento "${deptFormData.name}" atualizado com sucesso!`);
    } else {
      const newDept: DepartmentItem = {
        id: `dept-${Date.now().toString().slice(-4)}`,
        name: deptFormData.name.trim(),
        manager: deptFormData.manager.trim() || 'Não atribuído',
        totalUsers: 0,
        defaultRole: deptFormData.defaultRole,
        hostPrefix: deptFormData.hostPrefix.trim() || 'PC-',
        securityLevel: deptFormData.securityLevel,
        status: deptFormData.status,
        costCenter: deptFormData.costCenter.trim() || undefined,
        description: deptFormData.description.trim() || undefined,
        createdAt: new Date().toLocaleDateString('pt-BR')
      };
      const updated = [newDept, ...departments];
      setDepartments(updated);
      localStorage.setItem('applet_workpulse_departments', JSON.stringify(updated));

      const auditLog = {
        id: `log-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toLocaleString('pt-BR'),
        actorName: currentUser.name,
        actorRole: currentUser.accessLevel,
        action: 'Cadastro de Departamento',
        target: `Departamento: ${newDept.name}`,
        ip: currentUser.ipAddress || '192.168.1.25',
        severity: 'Média',
        status: 'Sucesso',
        details: `Novo departamento "${newDept.name}" cadastrado com perfil padrão ${newDept.defaultRole}`
      };
      setAuditLogs(prev => [auditLog, ...prev]);
      showToast(`Novo departamento "${newDept.name}" cadastrado com sucesso!`);
    }

    setIsAddDeptModalOpen(false);
  };

  const handleToggleDeptStatus = (dept: DepartmentItem) => {
    const newStatus = dept.status === 'Ativo' ? 'Inativo' : 'Ativo';
    const updated = departments.map(d => d.id === dept.id ? { ...d, status: newStatus } : d);
    setDepartments(updated);
    localStorage.setItem('applet_workpulse_departments', JSON.stringify(updated));

    const auditLog = {
      id: `log-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString('pt-BR'),
      actorName: currentUser.name,
      actorRole: currentUser.accessLevel,
      action: newStatus === 'Ativo' ? 'Ativação de Departamento' : 'Inativação de Departamento',
      target: `Departamento: ${dept.name}`,
      ip: currentUser.ipAddress || '192.168.1.25',
      severity: 'Baixa',
      status: 'Sucesso',
      details: `Status do departamento "${dept.name}" alterado para ${newStatus}`
    };
    setAuditLogs(prev => [auditLog, ...prev]);
    showToast(`Departamento "${dept.name}" agora está ${newStatus}.`);
  };

  const handleConfirmDeleteDept = () => {
    if (!deletingDept) return;
    const deptToDelete = deletingDept;
    const updated = departments.filter(d => d.id !== deptToDelete.id);
    setDepartments(updated);
    localStorage.setItem('applet_workpulse_departments', JSON.stringify(updated));

    const auditLog = {
      id: `log-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleString('pt-BR'),
      actorName: currentUser.name,
      actorRole: currentUser.accessLevel,
      action: 'Exclusão de Departamento',
      target: `Departamento: ${deptToDelete.name}`,
      ip: currentUser.ipAddress || '192.168.1.25',
      severity: 'Alta',
      status: 'Sucesso',
      details: `Departamento "${deptToDelete.name}" removido da estrutura organizacional`
    };
    setAuditLogs(prev => [auditLog, ...prev]);
    showToast(`Departamento "${deptToDelete.name}" excluído com sucesso.`);
    setDeletingDept(null);
  };

  const getDeptUserCount = (deptName: string) => {
    return usersList.filter(u => {
      const uDept = u.department ? u.department.toLowerCase().trim() : '';
      const dName = deptName.toLowerCase().trim();
      return uDept === dName || uDept.includes(dName) || dName.includes(uDept);
    }).length;
  };

  const filteredDepartments = departments.filter(d => {
    const matchesSearch = 
      d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
      d.manager.toLowerCase().includes(deptSearch.toLowerCase()) ||
      d.hostPrefix.toLowerCase().includes(deptSearch.toLowerCase()) ||
      (d.costCenter && d.costCenter.toLowerCase().includes(deptSearch.toLowerCase())) ||
      (d.description && d.description.toLowerCase().includes(deptSearch.toLowerCase()));

    const matchesStatus = deptStatusFilter === 'Todos' || d.status === deptStatusFilter;
    const matchesSecurity = deptSecurityFilter === 'Todos' || d.securityLevel === deptSecurityFilter;

    return matchesSearch && matchesStatus && matchesSecurity;
  });

  const handleExportDeptsCSV = () => {
    const headers = ['ID', 'Nome', 'Gestor', 'Colaboradores Ativos', 'Perfil RBAC Padrao', 'Prefixo Host PC', 'Nivel de Seguranca', 'Centro de Custo', 'Status'];
    const rows = filteredDepartments.map(d => [
      d.id,
      `"${d.name}"`,
      `"${d.manager}"`,
      getDeptUserCount(d.name),
      `"${d.defaultRole}"`,
      `"${d.hostPrefix}"`,
      `"${d.securityLevel}"`,
      `"${d.costCenter || '-'}"`,
      `"${d.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `workpulse_departamentos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Tabela de departamentos exportada em formato CSV!');
  };

  const filteredUsers = usersList.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.computerHost.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAccess = selectedAccessFilter === 'Todos' || u.accessLevel === selectedAccessFilter;
    const matchesDept = selectedDeptFilter === 'Todas as Áreas' || u.department === selectedDeptFilter;

    return matchesSearch && matchesAccess && matchesDept;
  });

  const filteredActiveSessions = activeSessions.filter(s => 
    s.userName.toLowerCase().includes(sessionSearch.toLowerCase()) ||
    s.userEmail.toLowerCase().includes(sessionSearch.toLowerCase()) ||
    s.host.toLowerCase().includes(sessionSearch.toLowerCase()) ||
    s.ip.includes(sessionSearch)
  );

  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.actorName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.target.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.ip.includes(auditSearch);

    const matchesSeverity = auditSeverityFilter === 'Todas' || log.severity === auditSeverityFilter;
    return matchesSearch && matchesSeverity;
  });

  const getAccessBadgeStyle = (level: string) => {
    switch (level) {
      case 'ADMIN_GERAL':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800 font-black';
      case 'DIRETORIA':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800 font-bold';
      case 'RH_PEOPLE':
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800 font-bold';
      case 'GESTORES':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 font-bold';
      case 'TI_COMPLIANCE':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-medium';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Crítica':
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800';
      case 'Alta':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
      case 'Média':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  // Generate OpenAPI JSON Spec String
  const openApiSpecJson = JSON.stringify(
    {
      openapi: '3.0.3',
      info: {
        title: 'WorkPulse ERP - Security & RBAC API Specification',
        version: '4.2.0',
        description: 'Contrato OpenAPI de Endpoints do ERP WorkPulse com suporte a matriz RBAC granular por papéis operacionais.'
      },
      servers: [{ url: 'https://api.workpulse.internal/v1', description: 'Ambiente de Produção Interno' }],
      paths: API_ROUTES_SPEC.reduce((acc: any, route) => {
        if (!acc[route.path]) acc[route.path] = {};
        acc[route.path][route.method.toLowerCase()] = {
          summary: route.summary,
          security: [{ BearerAuth: [] }],
          x_rbac_required_scope: route.scope,
          responses: {
            '200': { description: 'Operação realizada com sucesso' },
            '401': { description: 'Token de autenticação ausente ou inválido' },
            '403': { description: 'Acesso negado pela Matriz RBAC' }
          }
        };
        return acc;
      }, {})
    },
    null,
    2
  );

  return (
    <div className="space-y-6 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* TOP NAVIGATION SUB-TABS BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-2 shadow-xs flex items-center justify-between flex-wrap gap-2 transition-colors duration-200">
        <div className="flex items-center space-x-1.5 flex-wrap">
          <button
            onClick={() => setActiveSubTab('users_list')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'users_list'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Diretório de Usuários ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('active_sessions')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'active_sessions'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Sessões Ativas ({activeSessions.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('rbac_matrix');
              setRbacSubView('matrix');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'rbac_matrix' && rbacSubView === 'matrix'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Controle de Acesso</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit_logs')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'audit_logs'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Trilha de Auditoria ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('departments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'departments'
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Departamentos ({departments.length})</span>
          </button>
        </div>

        {onOpenBackupModal && (
          <button
            onClick={onOpenBackupModal}
            className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/90 dark:border-blue-800/80 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            title="Abrir Central de Backup & Restauração"
          >
            <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Backup & Restauração</span>
          </button>
        )}
      </div>

      {/* VIEW 1: USERS LIST (DIRECTORY) */}
      {activeSubTab === 'users_list' && (
        <>
          {/* FILTER & TOOLBAR BOX */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome, e-mail, cargo ou computador..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Controls Right */}
              <div className="flex items-center space-x-2 flex-wrap">
                
                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      viewMode === 'table' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                    }`}
                    title="Visualização em Tabela"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      viewMode === 'grid' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                    }`}
                    title="Visualização em Cards"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>

                {/* Primary Action: Novo Usuário */}
                <button
                  onClick={handleOpenAddModal}
                  className="px-4 py-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-bold text-xs rounded-full shadow-xs transition-all flex items-center space-x-2 active:scale-98 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-white" />
                  <span>Novo Usuário</span>
                </button>

              </div>
            </div>

            {/* Dropdown Filters Row */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono mr-1">Filtros:</span>

              {/* Access Level Selector */}
              <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Perfil:</span>
                <select
                  value={selectedAccessFilter}
                  onChange={(e) => setSelectedAccessFilter(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer text-xs"
                >
                  <option value="Todos" className="dark:bg-slate-900">Todos os Perfis</option>
                  <option value="ADMIN_GERAL" className="dark:bg-slate-900">ADMIN_GERAL</option>
                  <option value="DIRETORIA" className="dark:bg-slate-900">DIRETORIA</option>
                  <option value="RH_PEOPLE" className="dark:bg-slate-900">RH_PEOPLE</option>
                  <option value="GESTORES" className="dark:bg-slate-900">GESTORES</option>
                  <option value="COLABORADOR" className="dark:bg-slate-900">COLABORADOR</option>
                  <option value="TI_COMPLIANCE" className="dark:bg-slate-900">TI_COMPLIANCE</option>
                </select>
              </div>

              {/* Department Selector */}
              <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Área:</span>
                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value as any)}
                  className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer text-xs"
                >
                  <option value="Todas as Áreas" className="dark:bg-slate-900">Todas as Áreas</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name} className="dark:bg-slate-900">
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {(searchTerm || selectedAccessFilter !== 'Todos' || selectedDeptFilter !== 'Todas as Áreas') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedAccessFilter('Todos');
                    setSelectedDeptFilter('Todas as Áreas');
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  Limpar Filtros
                </button>
              )}

              {selectedUserIds.length > 0 && (
                <button
                  onClick={handleClearSelection}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 hover:bg-blue-200 transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <span>{selectedUserIds.length} selecionado(s)</span>
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}

              <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-400 font-medium">
                Exibindo <strong>{filteredUsers.length}</strong> de <strong>{usersList.length}</strong> usuários
              </span>
            </div>
          </div>

          {/* MAIN USERS CONTENT VIEW */}
          {viewMode === 'table' ? (
            /* TABLE VIEW */
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.includes(u.id))}
                          onChange={handleSelectAllFiltered}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          title="Selecionar / Desmarcar todos visíveis"
                        />
                      </th>
                      <th className="py-3 px-4">Usuário / E-mail</th>
                      <th className="py-3 px-4">Nível de Acesso</th>
                      <th className="py-3 px-4">Departamento</th>
                      <th className="py-3 px-4">Estação / IP Fixo</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200 font-medium">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <UserX className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="font-semibold text-sm">Nenhum usuário encontrado com os filtros aplicados.</p>
                          <p className="text-xs text-slate-400">Tente ajustar a busca ou limpar os filtros.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const isSelf = user.id === currentUser.id;
                        const isSelected = selectedUserIds.includes(user.id);
                        return (
                          <tr key={user.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                            isSelected 
                              ? 'bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-l-blue-600 dark:border-l-blue-500' 
                              : isSelf 
                                ? 'bg-blue-50/30 dark:bg-blue-950/20' 
                                : ''
                          }`}>
                            
                            {/* Selection Checkbox */}
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectUser(user.id)}
                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>

                            {/* Avatar & User Details */}
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="relative shrink-0">
                                  <img 
                                    src={user.avatar} 
                                    alt={user.name} 
                                    className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
                                  />
                                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                                    user.status === 'Inativo' ? 'bg-slate-400' : 'bg-emerald-500'
                                  }`} />
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                                    <span>{user.name}</span>
                                    {isSelf && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                        VOCÊ
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{user.email} • <span className="text-slate-400">{user.role}</span></div>
                                </div>
                              </div>
                            </td>

                            {/* RBAC Access Level */}
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono tracking-wide border ${getAccessBadgeStyle(user.accessLevel)}`}>
                                {user.accessLevel}
                              </span>
                            </td>

                            {/* Department */}
                            <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                              {user.department}
                            </td>

                            {/* Host / IP */}
                            <td className="py-3 px-4">
                              <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300 font-semibold">{user.computerHost}</div>
                              <div className="text-[10px] font-mono text-slate-400">{user.ipAddress}</div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4 text-center">
                              {user.status === 'Inativo' ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  <span>Inativo</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>Ativo</span>
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                
                                <button
                                  onClick={() => handleOpenEditModal(user)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                                  title="Editar Usuário"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {!isSelf && (
                                  <button
                                    onClick={() => handleDeleteUser(user.id, user.name)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                                    title="Excluir Usuário"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* GRID CARDS VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => {
                const isSelf = user.id === currentUser.id;
                const isSelected = selectedUserIds.includes(user.id);
                return (
                  <div 
                    key={user.id} 
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-xs transition-all hover:shadow-md space-y-3 relative ${
                      isSelected
                        ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20'
                        : isSelf
                          ? 'border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20'
                          : 'border-slate-200/90 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectUser(user.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0 mt-0.5"
                        />
                        <img 
                          src={user.avatar} 
                          alt={user.name} 
                          className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug flex items-center gap-1.5">
                            <span>{user.name}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                VOCÊ
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{user.role}</p>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${getAccessBadgeStyle(user.accessLevel)}`}>
                        {user.accessLevel}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-200/80 dark:border-slate-700/80 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400 font-medium">E-mail:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{user.email}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400 font-medium">Departamento:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{user.department}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400 font-medium">Host / IP:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{user.computerHost} ({user.ipAddress})</span>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Conectado</span>
                      </span>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* VIEW 2: ACTIVE SESSIONS & CONNECTED STATIONS TABLE */}
      {activeSubTab === 'active_sessions' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  <span>SESSÕES ATIVAS EM TEMPO REAL</span>
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mt-1">
                  Dispositivos Conectados & Tokens JWT Ativos ({activeSessions.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Monitoramento contínuo de estações de trabalho e clientes agent/web em tempo real.
                </p>
              </div>
            </div>

            {/* Filter Input */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                placeholder="Filtrar por nome, host, IP ou e-mail..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* ACTIVE SESSIONS TABLE */}
            <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                    <tr>
                      <th className="py-3.5 px-4">Usuário / Perfil</th>
                      <th className="py-3.5 px-4">Host Estação / IP</th>
                      <th className="py-3.5 px-4">Sistema Operacional & Agente</th>
                      <th className="py-3.5 px-4">Login / Última Atividade</th>
                      <th className="py-3.5 px-4 text-center">Status Sessão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200 font-medium">
                    {filteredActiveSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{session.userName}</div>
                          <div className="text-[10px] text-slate-400">{session.userEmail} • <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{session.role}</span></div>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{session.host}</div>
                          <div className="text-[10px] text-slate-400">{session.ip}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 dark:text-slate-200 font-medium">{session.os}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{session.client}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 dark:text-slate-200">{session.loginTime}</div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{session.lastActivity}</div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            session.status === 'Ativa'
                              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                          }`}>
                            {session.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* VIEW 3: MATRIZ RBAC */}
      {activeSubTab === 'rbac_matrix' && (
        <div className="space-y-6">

          {/* SUB-NAV CONTAINER CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>MATRIZ DE SEGURANÇA & CONTROLADORIA RBAC</span>
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mt-1">
                  Controle de Acesso
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Controle de acesso granular baseado em papéis operacionais e privilégios específicos do sistema WorkPulse.
                </p>
              </div>
            </div>

            {/* ROLE SELECTION BAR */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center gap-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono shrink-0 flex items-center space-x-1.5">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>SELECIONAR PAPEL OPERACIONAL:</span>
              </span>

              <div className="flex items-center space-x-1.5 flex-wrap">
                {OPERATIONAL_ROLES.map((role) => {
                  const isSelected = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {role.label}
                    </button>
                  );
                })}
              </div>

              <div className="ml-auto flex items-center space-x-2">
                <button
                  onClick={() => handleToggleAllForRole(selectedRole, true)}
                  className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                  title="Conceder todas as permissões para este papel"
                >
                  Marcar Todos
                </button>
                <button
                  onClick={() => handleToggleAllForRole(selectedRole, false)}
                  className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                  title="Revogar todas as permissões deste papel"
                >
                  Desmarcar Todos
                </button>
              </div>
            </div>

            {/* ROLE DESCRIPTION BANNER */}
            {selectedRole && (
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">Perfil Ativo:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${OPERATIONAL_ROLES.find(r => r.id === selectedRole)?.badgeColor}`}>
                    {OPERATIONAL_ROLES.find(r => r.id === selectedRole)?.label}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    — {OPERATIONAL_ROLES.find(r => r.id === selectedRole)?.description}
                  </span>
                </div>
              </div>
            )}

            {/* RBAC MATRIX TABLE */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-3.5 px-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                        MÓDULOS OPERACIONAIS ({OPERATIONAL_MODULES.length})
                      </th>
                      {ACTIONS_LIST.map((action) => (
                        <th key={action.key} className="py-3.5 px-4 text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                          {action.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                    {OPERATIONAL_MODULES.map((mod) => (
                      <tr key={mod.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        
                        {/* Module Name */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {mod.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Route: {mod.endpointRoute}
                          </div>
                        </td>

                        {/* Actions Columns */}
                        {ACTIONS_LIST.map((action) => {
                          const isAllowed = permissionsMatrix[selectedRole]?.[mod.id]?.[action.key] ?? false;
                          return (
                            <td key={action.key} className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleTogglePermission(selectedRole, mod.id, action.key)}
                                className={`w-7 h-7 rounded-xl inline-flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                                  isAllowed
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs hover:bg-emerald-200'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-500'
                                }`}
                                title={`Clique para ${isAllowed ? 'REVOGAR' : 'PERMITIR'} ${action.label} em ${mod.name}`}
                              >
                                {isAllowed ? (
                                  <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-300 stroke-[3]" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                                )}
                              </button>
                            </td>
                          );
                        })}

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* VIEW 4: AUDIT TRAIL LOGS TABLE */}
      {activeSubTab === 'audit_logs' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>TRILHA DE AUDITORIA & REGISTROS LGPD</span>
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mt-1">
                  Logs de Eventos de Segurança & Alterações de Permissão
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Rastreabilidade completa das ações executadas por administradores, gestores e chamadas de API do sistema.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => showToast('Logs de auditoria exportados em formato CSV.')}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Buscar por ator, ação, alvo ou IP..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Criticidade:</span>
                <select
                  value={auditSeverityFilter}
                  onChange={(e) => setAuditSeverityFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                >
                  <option value="Todas">Todas</option>
                  <option value="Crítica">Crítica</option>
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Informativa">Informativa</option>
                </select>
              </div>
            </div>

            {/* AUDIT TABLE */}
            <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                    <tr>
                      <th className="py-3.5 px-4">Data / Hora</th>
                      <th className="py-3.5 px-4">Ator / Perfil</th>
                      <th className="py-3.5 px-4">Ação de Segurança</th>
                      <th className="py-3.5 px-4">Recurso / Alvo</th>
                      <th className="py-3.5 px-4">IP Origem</th>
                      <th className="py-3.5 px-4 text-center">Criticidade</th>
                      <th className="py-3.5 px-4 text-center">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200 font-medium">
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {log.timestamp}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{log.actorName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{log.actorRole}</div>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {log.action}
                          <div className="text-[10px] text-slate-400 font-normal">{log.details}</div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {log.target}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                          {log.ip}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getSeverityBadge(log.severity)}`}>
                            {log.severity}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            log.status === 'Sucesso'
                              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* VIEW 5: DEPARTMENTS & TEAMS STRUCTURE TABLE & CRUD */}
      {activeSubTab === 'departments' && (
        <div className="space-y-4">
          {/* MAIN DEPARTMENTS CONTAINER */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            
            {/* HEADER & ACTION BUTTONS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                  <FolderTree className="w-3.5 h-3.5" />
                  <span>ESTRUTURA ORGANIZACIONAL & DEPARTAMENTOS</span>
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mt-1">
                  Gestão de Departamentos, Centros de Custo e Perfis ({departments.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Cadastro, edição e controle de setores corporativos, gestores responsáveis, prefixos de estações e regras de segurança.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={handleExportDeptsCSV}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
                  title="Exportar Departamentos em CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar CSV</span>
                </button>

                <button
                  onClick={handleOpenAddDept}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Departamento</span>
                </button>
              </div>
            </div>

            {/* SEARCH & FILTERS BAR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              <div className="flex items-center space-x-2 flex-1 flex-wrap gap-y-2">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={deptSearch}
                    onChange={(e) => setDeptSearch(e.target.value)}
                    placeholder="Buscar por nome, gestor, prefixo host ou CC..."
                    className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                  {deptSearch && (
                    <button
                      onClick={() => setDeptSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                  <Filter className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Status:</span>
                  <select
                    value={deptStatusFilter}
                    onChange={(e) => setDeptStatusFilter(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="Todos" className="dark:bg-slate-900">Todos</option>
                    <option value="Ativo" className="dark:bg-slate-900">Ativos</option>
                    <option value="Inativo" className="dark:bg-slate-900">Inativos</option>
                  </select>
                </div>

                {/* Security Level Filter */}
                <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                  <Shield className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Segurança:</span>
                  <select
                    value={deptSecurityFilter}
                    onChange={(e) => setDeptSecurityFilter(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="Todos" className="dark:bg-slate-900">Todos os Níveis</option>
                    <option value="Padrão Corporativo" className="dark:bg-slate-900">Padrão Corporativo</option>
                    <option value="Restrito (LGPD Nível 3)" className="dark:bg-slate-900">Restrito (LGPD Nível 3)</option>
                    <option value="Máximo (AES-256 + TLS 1.3)" className="dark:bg-slate-900">Máximo (AES-256 + TLS 1.3)</option>
                    <option value="Máximo (Auditoria Contínua)" className="dark:bg-slate-900">Máximo (Auditoria Contínua)</option>
                  </select>
                </div>

                {(deptSearch || deptStatusFilter !== 'Todos' || deptSecurityFilter !== 'Todos') && (
                  <button
                    onClick={() => {
                      setDeptSearch('');
                      setDeptStatusFilter('Todos');
                      setDeptSecurityFilter('Todos');
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>

              {/* View Mode Toggle (Table / Grid) */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start md:self-auto">
                <button
                  onClick={() => setDeptViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    deptViewMode === 'table'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Visualização em Tabela"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeptViewMode('cards')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    deptViewMode === 'cards'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Visualização em Grade"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* VIEW MODE 1: DEPARTMENTS TABLE */}
            {deptViewMode === 'table' ? (
              <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                      <tr>
                        <th className="py-3.5 px-4">Departamento / Centro de Custo</th>
                        <th className="py-3.5 px-4">Gestor Responsável</th>
                        <th className="py-3.5 px-4 text-center">Colaboradores</th>
                        <th className="py-3.5 px-4">Perfil RBAC Padrão</th>
                        <th className="py-3.5 px-4 font-mono">Prefixo Host PC</th>
                        <th className="py-3.5 px-4">Nível de Segurança</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200 font-medium">
                      {filteredDepartments.map((dept) => {
                        const userCount = getDeptUserCount(dept.name);
                        return (
                          <tr key={dept.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5">
                                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
                                  <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <Building2 className="w-3.5 h-3.5" />
                                  </div>
                                  <span>{dept.name}</span>
                                  {dept.costCenter && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                                      {dept.costCenter}
                                    </span>
                                  )}
                                </div>
                                {dept.description && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                    {dept.description}
                                  </p>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                  {dept.manager.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {dept.manager}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold rounded-lg border border-blue-200 dark:border-blue-800 font-mono text-xs">
                                <Users className="w-3 h-3 text-blue-500" />
                                <span>{userCount} {userCount === 1 ? 'membro' : 'membros'}</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getAccessBadgeStyle(dept.defaultRole)}`}>
                                {dept.defaultRole}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300 font-bold">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-[11px]">
                                {dept.hostPrefix}*
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-1.5">
                                <Shield className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                                  {dept.securityLevel}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleToggleDeptStatus(dept)}
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                                  dept.status === 'Ativo'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-200'
                                }`}
                                title="Clique para alternar status"
                              >
                                {dept.status}
                              </button>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  onClick={() => handleOpenEditDept(dept)}
                                  className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 rounded-lg transition-all cursor-pointer"
                                  title="Editar Departamento"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => setDeletingDept(dept)}
                                  className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 rounded-lg transition-all cursor-pointer"
                                  title="Excluir Departamento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredDepartments.length === 0 && (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                      <FolderTree className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Nenhum departamento encontrado
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Tente ajustar os termos de busca ou filtros de status para visualizar os setores.
                    </p>
                    <button
                      onClick={handleOpenAddDept}
                      className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-indigo-700 transition-all cursor-pointer"
                    >
                      Cadastrar Novo Departamento
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* VIEW MODE 2: CARDS GRID */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDepartments.map((dept) => {
                  const userCount = getDeptUserCount(dept.name);
                  return (
                    <div
                      key={dept.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                              {dept.name}
                            </h4>
                            {dept.costCenter && (
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                {dept.costCenter}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleDeptStatus(dept)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            dept.status === 'Ativo'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}
                        >
                          {dept.status}
                        </button>
                      </div>

                      {dept.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {dept.description}
                        </p>
                      )}

                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="text-slate-400 text-[11px]">Gestor:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{dept.manager}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="text-slate-400 text-[11px]">Membros Alocados:</span>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{userCount} usuários</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="text-slate-400 text-[11px]">Perfil RBAC:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getAccessBadgeStyle(dept.defaultRole)}`}>
                            {dept.defaultRole}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="text-slate-400 text-[11px]">Prefixo Host:</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{dept.hostPrefix}*</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="text-slate-400 text-[11px]">Segurança:</span>
                          <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 truncate max-w-[160px]">{dept.securityLevel}</span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => handleOpenEditDept(dept)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => setDeletingDept(dept)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-600 dark:hover:text-rose-400 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      )}

      {/* CREATE / EDIT USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingUser ? 'Editar Cadastro de Usuário' : 'Cadastrar Novo Usuário'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Defina o perfil de acesso e os dados de identificação corporativa
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="p-5 space-y-4 text-xs">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Carlos Eduardo Silva"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail Corporativo *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Ex: carlos.silva@workpulse.com.br"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cargo / Função
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Ex: Analista de Sistemas Sr."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Departamento
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value as Department })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name} className="dark:bg-slate-900">
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nível de Acesso (Perfil RBAC)
                  </label>
                  <select
                    value={formData.accessLevel}
                    onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-blue-700 dark:text-blue-400 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="COLABORADOR" className="dark:bg-slate-900">COLABORADOR (Padrão)</option>
                    <option value="GESTORES" className="dark:bg-slate-900">GESTORES (Supervisão de Equipe)</option>
                    <option value="RH_PEOPLE" className="dark:bg-slate-900">RH_PEOPLE (Ponto & Pessoas)</option>
                    <option value="DIRETORIA" className="dark:bg-slate-900">DIRETORIA (Executivo)</option>
                    <option value="TI_COMPLIANCE" className="dark:bg-slate-900">TI_COMPLIANCE (Auditoria TI)</option>
                    <option value="ADMIN_GERAL" className="dark:bg-slate-900">ADMIN_GERAL (Acesso Total)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Ex: WorkPulse@2026"
                      className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome da Estação (Host)
                  </label>
                  <input
                    type="text"
                    value={formData.computerHost}
                    onChange={(e) => setFormData({ ...formData, computerHost: e.target.value })}
                    placeholder="Ex: DEV-WIN11-042"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Endereço IP
                  </label>
                  <input
                    type="text"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    placeholder="Ex: 192.168.1.105"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Foto do Perfil (URL do Avatar)
                </label>
                <input
                  type="text"
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>{editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* PASSWORD RESET CONFIRMATION MODAL */}
      {resetPassUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
                <Key className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Redefinição de Senha
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Para o usuário: <strong>{resetPassUser.name}</strong>
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Nova Senha Temporária Gerada:</span>
              <div className="text-lg font-mono font-black text-amber-700 dark:text-amber-400 tracking-wider bg-amber-50 dark:bg-amber-950/80 py-2 rounded-lg border border-amber-200/80 dark:border-amber-800">
                {generatedPassword}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                O usuário precisará alterar esta senha no próximo login.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedPassword);
                  if (resetPassUser) {
                    const updated = usersList.map(u => 
                      u.id === resetPassUser.id ? { ...u, password: generatedPassword } : u
                    );
                    setUsersList(updated);
                    localStorage.setItem('wp_users_list_v1', JSON.stringify(updated));
                    if (onUpdateUsersList) onUpdateUsersList(updated);
                  }
                  showToast('Nova senha copiada e atualizada para o usuário com sucesso!');
                  setResetPassUser(null);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 text-white" />
                <span>Copiar & Concluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING BATCH ACTIONS MENU BAR */}
      {selectedUserIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 dark:bg-slate-950/95 text-white p-3 px-5 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-center justify-between gap-3 max-w-3xl w-[92vw] sm:w-auto animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="flex items-center space-x-2.5">
            <span className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/30 shrink-0">
              {selectedUserIds.length}
            </span>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-slate-100">
                {selectedUserIds.length === 1 ? '1 usuário selecionado' : `${selectedUserIds.length} usuários selecionados`}
              </p>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-700 mx-1 hidden sm:block" />

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 flex-wrap">
            {/* Desativar */}
            <button
              onClick={handleBatchDeactivate}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Desativar usuários selecionados"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Desativar</span>
            </button>

            {/* Ativar */}
            <button
              onClick={handleBatchActivate}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Reativar usuários selecionados"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Ativar</span>
            </button>

            {/* Alterar Departamento */}
            <button
              onClick={() => setIsBatchDeptModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Alterar departamento em massa"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Departamento</span>
            </button>

            {/* Alterar Perfil RBAC */}
            <button
              onClick={() => setIsBatchRoleModalOpen(true)}
              className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Alterar perfil de acesso (RBAC)"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Perfil RBAC</span>
            </button>

            {/* Excluir em Massa */}
            <button
              onClick={handleBatchDelete}
              className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-xl transition-all cursor-pointer"
              title="Excluir selecionados"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Limpar Seleção */}
            <button
              onClick={handleClearSelection}
              className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Cancelar seleção"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* BATCH CHANGE DEPARTMENT MODAL */}
      {isBatchDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Alterar Departamento em Massa
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Definir nova área para <strong>{selectedUserIds.length}</strong> usuário(s) selecionado(s)
                </p>
              </div>
            </div>

            <form onSubmit={handleApplyBatchDepartment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Selecione o Novo Departamento:
                </label>
                <select
                  value={targetBatchDepartment}
                  onChange={(e) => setTargetBatchDepartment(e.target.value as Department)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBatchDeptModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>Aplicar Alteração</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH CHANGE RBAC ROLE MODAL */}
      {isBatchRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Alterar Perfil RBAC em Massa
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Atualizar nível de acesso de <strong>{selectedUserIds.length}</strong> usuário(s) selecionado(s)
                </p>
              </div>
            </div>

            <form onSubmit={handleApplyBatchRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Selecione o Novo Perfil de Acesso:
                </label>
                <select
                  value={targetBatchRole}
                  onChange={(e) => setTargetBatchRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="COLABORADOR">COLABORADOR (Acesso Básico)</option>
                  <option value="GESTORES">GESTORES (Equipe & Ponto)</option>
                  <option value="RH_PEOPLE">RH_PEOPLE (Ponto & Pessoas)</option>
                  <option value="TI_COMPLIANCE">TI_COMPLIANCE (Segurança & GPO)</option>
                  <option value="DIRETORIA">DIRETORIA (BI Executive)</option>
                  <option value="ADMIN_GERAL">ADMIN_GERAL (Acesso Total)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBatchRoleModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>Aplicar Novo Perfil</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT DEPARTMENT MODAL */}
      {isAddDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black">
                    {editingDept ? 'Editar Departamento' : 'Cadastrar Novo Departamento'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingDept ? 'Atualize as informações do setor' : 'Defina os parâmetros do setor e regras de segurança'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddDeptModalOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveDept} className="p-5 space-y-4 font-sans text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Departamento *
                  </label>
                  <input
                    type="text"
                    required
                    value={deptFormData.name}
                    onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                    placeholder="Ex: Controladoria & Fiscal"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Centro de Custo
                  </label>
                  <input
                    type="text"
                    value={deptFormData.costCenter}
                    onChange={(e) => setDeptFormData({ ...deptFormData, costCenter: e.target.value })}
                    placeholder="Ex: CC-4020"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Gestor Responsável *
                  </label>
                  <input
                    type="text"
                    required
                    value={deptFormData.manager}
                    onChange={(e) => setDeptFormData({ ...deptFormData, manager: e.target.value })}
                    placeholder="Ex: Amanda Guimarães"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Prefixo Host PC (Estações) *
                  </label>
                  <input
                    type="text"
                    required
                    value={deptFormData.hostPrefix}
                    onChange={(e) => setDeptFormData({ ...deptFormData, hostPrefix: e.target.value.toUpperCase() })}
                    placeholder="Ex: FIN-WIN11-"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Perfil RBAC Padrão
                  </label>
                  <select
                    value={deptFormData.defaultRole}
                    onChange={(e) => setDeptFormData({ ...deptFormData, defaultRole: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-blue-700 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="COLABORADOR">COLABORADOR</option>
                    <option value="GESTORES">GESTORES</option>
                    <option value="RH_PEOPLE">RH_PEOPLE</option>
                    <option value="TI_COMPLIANCE">TI_COMPLIANCE</option>
                    <option value="DIRETORIA">DIRETORIA</option>
                    <option value="ADMIN_GERAL">ADMIN_GERAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Operacional
                  </label>
                  <select
                    value={deptFormData.status}
                    onChange={(e) => setDeptFormData({ ...deptFormData, status: e.target.value as 'Ativo' | 'Inativo' })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-emerald-700 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Ativo">Ativo (Operação Normal)</option>
                    <option value="Inativo">Inativo (Bloqueado)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nível de Segurança / Criptografia
                </label>
                <select
                  value={deptFormData.securityLevel}
                  onChange={(e) => setDeptFormData({ ...deptFormData, securityLevel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Padrão Corporativo">Padrão Corporativo</option>
                  <option value="Restrito (LGPD Nível 3)">Restrito (LGPD Nível 3)</option>
                  <option value="Máximo (AES-256 + TLS 1.3)">Máximo (AES-256 + TLS 1.3)</option>
                  <option value="Máximo (Auditoria Contínua)">Máximo (Auditoria Contínua)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição & Atribuições da Área
                </label>
                <textarea
                  rows={2}
                  value={deptFormData.description}
                  onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
                  placeholder="Ex: Responsável por conciliação bancária, fechamentos contábeis e relatórios fiscais."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddDeptModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>{editingDept ? 'Salvar Alterações' : 'Criar Departamento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE DEPARTMENT CONFIRMATION MODAL */}
      {deletingDept && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 font-sans animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Excluir Departamento
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tem certeza que deseja remover o departamento <strong>"{deletingDept.name}"</strong>?
                </p>
              </div>
            </div>

            {getDeptUserCount(deletingDept.name) > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-800 dark:text-amber-300 text-xs">
                <strong>Atenção:</strong> Existem <strong>{getDeptUserCount(deletingDept.name)} colaboradores</strong> vinculados a este setor. Ao excluir, seus registros de departamento serão mantidos como histórico, mas não será mais possível selecionar esta área para novos usuários.
              </div>
            )}

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeletingDept(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDept}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-white" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
