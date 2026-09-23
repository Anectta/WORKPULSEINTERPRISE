export type KBModuleId = 
  | 'Dashboard' 
  | 'Jornada' 
  | 'Atividades' 
  | 'Ociosidade' 
  | 'Classificacao' 
  | 'Bloqueios' 
  | 'Rankings' 
  | 'BI_Personas' 
  | 'Relatorios' 
  | 'Integracoes' 
  | 'GPO_LGPD'
  | 'Gestao_Usuarios'
  | 'Topologia_Infra'
  | 'Gestao_Patrimonial'
  | 'Base_Conhecimento';

export interface KBArticleStep {
  stepNumber: number;
  title: string;
  detail: string;
  tip?: string;
}

export interface KBCommonError {
  error: string;
  code?: string;
  solution: string;
}

export interface KBVideo {
  title: string;
  url: string;
  duration: string;
}

export interface KBFaqItem {
  question: string;
  answer: string;
}

export interface KBAttachment {
  name: string;
  size: string;
  url: string;
}

export interface KBExternalLink {
  label: string;
  url: string;
}

export interface KBArticle {
  id: string;
  title: string;
  slug: string;
  moduleId: KBModuleId;
  moduleName: string;
  description: string;
  objective: string;
  operationalFlow: string;
  prerequisites: string[];
  examples: string[];
  stepByStep: KBArticleStep[];
  commonErrors: KBCommonError[];
  videos: KBVideo[];
  faqs: KBFaqItem[];
  files: KBAttachment[];
  externalLinks: KBExternalLink[];
  tags: string[];
  targetRoles: string[];
  version: string;
  updatedAt: string;
  author: string;
  viewsCount: number;
  helpfulCount: number;
  unhelpfulCount: number;
}

export interface KBFaq {
  id: string;
  question: string;
  answer: string;
  moduleId: KBModuleId;
  category: string;
  errorCodes?: string[];
  tags: string[];
  views: number;
}

export interface KBTutorialStep {
  step: number;
  title: string;
  content: string;
  fieldHighlight?: string;
}

export interface KBTutorial {
  id: string;
  title: string;
  description: string;
  moduleId: KBModuleId;
  estimatedMinutes: number;
  stepsCount: number;
  steps: KBTutorialStep[];
  completedByUsersPct: number;
}

export interface KBTourStep {
  id: string;
  tabId: string;
  elementSelector: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  buttonLabel?: string;
}

export interface KBContextHelp {
  tabId: string;
  tabTitle: string;
  objective: string;
  description: string;
  howToUse: string;
  videoUrl?: string;
  stepByStep: string[];
  commonErrors: { error: string; fix: string }[];
  relatedArticleId?: string;
  faqList: { question: string; answer: string }[];
}

export interface KBVersionRecord {
  id: string;
  articleId: string;
  articleTitle: string;
  version: string;
  changeLog: string;
  author: string;
  date: string;
}

export interface KBUserProgress {
  userId: string;
  userName: string;
  userRole: string;
  department: string;
  completedArticlesCount: number;
  completedTutorialsCount: number;
  score: number;
  lastActivity: string;
}

export type KBUserRole = 
  | 'Administrador Geral' 
  | 'Gestor de TI & Segurança' 
  | 'Gestor de RH & DP' 
  | 'Supervisor Operacional' 
  | 'Auditor de Compliance (DPO / LGPD)' 
  | 'Analista de Suporte TI' 
  | 'Colaborador / Operador';

export interface KBRolePermission {
  role: KBUserRole;
  canRead: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  allowedModules: KBModuleId[];
  description: string;
}

export interface KBDatabaseColumn {
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
  nullable: boolean;
  desc: string;
}

export interface KBDatabaseTableDoc {
  tableName: string;
  description: string;
  columns: KBDatabaseColumn[];
  indexes: string[];
  relationships: string[];
}

export interface KBAiMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  groundedArticles?: { id: string; title: string; slug: string }[];
}
