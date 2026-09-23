import React from 'react';
import { 
  BarChart3, 
  Clock, 
  Activity, 
  AlertTriangle, 
  SlidersHorizontal, 
  Ban, 
  Trophy, 
  PieChart, 
  FileSpreadsheet, 
  Webhook, 
  ShieldAlert, 
  BookOpen 
} from 'lucide-react';
import { TabType } from '../components/Sidebar';

export interface ModuleConfig {
  id: TabType;
  menuLabel: string;
  fullName: string;
  category: string;
  description: string;
  gradient: string; // Tailwind gradient classes
  iconName: string;
  primaryActionLabel?: string;
  badge?: string;
  badgeColor?: string;
}

export const SYSTEM_MODULES: Record<TabType, ModuleConfig> = {
  overview: {
    id: 'overview',
    menuLabel: 'Visão Executiva',
    fullName: 'Visão Executiva & Performance ERP',
    category: 'Dashboard Principal',
    description: 'Monitoramento em tempo real da produtividade corporativa, horas ativas e indicadores chave de desempenho.',
    gradient: 'from-blue-600 via-indigo-600 to-purple-600',
    iconName: 'BarChart3',
  },
  agenda_pro: {
    id: 'agenda_pro',
    menuLabel: 'Agenda Pro',
    fullName: 'Agenda Pro & Central de Compromissos e Tarefas',
    category: 'Produtividade & Operações',
    description: 'Gestão executiva de compromissos, tarefas com checklist, alarmes sonoros inteligentes, diretório de clientes e diagnóstico de ocorrências técnicas.',
    gradient: 'from-indigo-600 via-purple-600 to-sky-600',
    iconName: 'CalendarCheck',
    primaryActionLabel: 'Novo Compromisso',
    badge: 'PRO',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30'
  },
  wifi_pulse: {
    id: 'wifi_pulse',
    menuLabel: 'WIFI Pulse',
    fullName: 'WIFI Pulse — Diagnóstico de RF, Analisador de Canais & Velocímetro',
    category: 'Diagnóstico de Rede & Wi-Fi',
    description: 'Análise em tempo real de qualidade Wi-Fi, mapa espectral de canais, score de estabilidade, descoberta de LAN e diagnóstico de gargalos Wi-Fi vs Internet.',
    gradient: 'from-cyan-500 via-teal-500 to-emerald-600',
    iconName: 'Wifi',
    primaryActionLabel: 'Analisar Wi-Fi Agora',
    badge: 'PULSE',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
  },
  velocimetro_netpulse: {
    id: 'velocimetro_netpulse',
    menuLabel: 'Velocímetro Net Pulse',
    fullName: 'Velocímetro Net Pulse — Medidor Multithread de Velocidade, Jitter & Laudo Técnico',
    category: 'Diagnóstico de Rede & Wi-Fi',
    description: 'Testador de velocidade em tempo real com velocímetro 260° cockpit, gráfico de oscilação de taxa, jitter, ping, detecção de ISP e geração de laudo técnico oficial.',
    gradient: 'from-blue-600 via-indigo-600 to-purple-600',
    iconName: 'Gauge',
    primaryActionLabel: 'Iniciar Teste de Banda',
    badge: 'NETPULSE',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/30'
  },
  security_pentest: {
    id: 'security_pentest',
    menuLabel: 'Security & Pentest',
    fullName: 'Security & Pentest — Avaliação de Vulnerabilidades & Defesa Cibernética',
    category: 'Segurança Cibernética & Pentest',
    description: 'Avaliação contínua de segurança, varredura passiva de portas, auditoria SSL/TLS e cabeçalhos HTTP, correlação de CVEs e gestão de remediação vinculada a CIs do CMDB.',
    gradient: 'from-blue-600 via-indigo-600 to-purple-600',
    iconName: 'ShieldCheck',
    primaryActionLabel: 'Novo Security Scan',
    badge: 'SEC-OPS',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/30'
  },
  workday: {
    id: 'workday',
    menuLabel: 'Jornada & Ponto',
    fullName: 'Controle de Jornada & Ponto Eletrônico (REP)',
    category: 'Jornada & Compliance',
    description: 'Gestão de horários, espelho de ponto, portaria 671 MTP e auditoria de presença vs atividade no computador.',
    gradient: 'from-cyan-500 via-blue-600 to-indigo-600',
    iconName: 'Clock',
    primaryActionLabel: 'Exportar Espelho de Ponto',
  },
  activity: {
    id: 'activity',
    menuLabel: 'Monitor de Atividades',
    fullName: 'Monitor de Atividades & Linha do Tempo',
    category: 'Rastreabilidade Operacional',
    description: 'Rastreabilidade segundo a segundo de softwares ativos, sites visitados e engajamento da equipe.',
    gradient: 'from-emerald-500 via-teal-600 to-cyan-600',
    iconName: 'Activity',
  },
  app_classification: {
    id: 'app_classification',
    menuLabel: 'Classificação de Apps',
    fullName: 'Motor de Classificação de Software & URLs',
    category: 'Regras de Produtividade',
    description: 'Categorização inteligente de sistemas entre Produtivo, Improdutivo e Neutro com sugestões via IA.',
    gradient: 'from-indigo-600 via-purple-600 to-pink-600',
    iconName: 'SlidersHorizontal',
  },
  blocking: {
    id: 'blocking',
    menuLabel: 'Bloqueio de Sites & PC',
    fullName: 'Bloqueio de Sites & Políticas de Estação de Trabalho',
    category: 'Segurança & Restrição',
    description: 'Travamento automático pós-expediente e bloqueio de domínios impróprios por departamento.',
    gradient: 'from-rose-600 via-red-600 to-orange-600',
    iconName: 'Ban',
    primaryActionLabel: 'Ver Prévia da Tela de Bloqueio',
  },
  rankings: {
    id: 'rankings',
    menuLabel: 'Rankings & Equipes',
    fullName: 'Rankings de Produtividade & Comparativo Setorial',
    category: 'Performance de Equipes',
    description: 'Score de eficiência por departamento, ranking de colaboradores e distribuição do tempo corporativo.',
    gradient: 'from-yellow-500 via-amber-500 to-orange-500',
    iconName: 'Trophy',
    primaryActionLabel: 'Exportar Ranking',
  },
  gpo_lgpd: {
    id: 'gpo_lgpd',
    menuLabel: 'Agente GPO & LGPD',
    fullName: 'Instalador Silencioso GPO & Compliance LGPD',
    category: 'Implantação & Privacidade',
    description: 'Empacotamento MSI para distribuição em massa via Active Directory, termos LGPD e criptografia.',
    gradient: 'from-red-600 via-rose-600 to-pink-600',
    iconName: 'ShieldAlert',
    primaryActionLabel: 'Baixar Pacote MSI (GPO)',
  },
  knowledge_base: {
    id: 'knowledge_base',
    menuLabel: 'Base de Conhecimento',
    fullName: 'Central de Conhecimento, Manuais & POPs',
    category: 'Governança & Treinamento',
    description: 'Documentação oficial de processos, tutoriais guiados e base de aprendizagem (LMS).',
    gradient: 'from-violet-600 via-purple-600 to-indigo-600',
    iconName: 'BookOpen',
    primaryActionLabel: 'Novo Manual POP',
  },
  user_registration: {
    id: 'user_registration',
    menuLabel: 'Gestão de Usuários',
    fullName: 'Gestão de Usuários & Níveis de Acesso',
    category: 'Segurança & Controle de Acessos',
    description: 'Gestão completa de usuários do sistema, cadastro de administradores e gestores, matriz de acessos e redefinição de credenciais.',
    gradient: 'from-blue-600 via-indigo-600 to-sky-600',
    iconName: 'UserPlus',
    primaryActionLabel: 'Novo Usuário',
  },
  cmdb: {
    id: 'cmdb',
    menuLabel: 'CMDB & Infra TI',
    fullName: 'CMDB — Central de Configuração, Topologia & RMM',
    category: 'Infraestrutura & ITSM',
    description: 'Configuration Management Database com topologia visual, mapeamento de dependências de serviços, análise de impacto e telemetria de agentes.',
    gradient: 'from-blue-600 via-indigo-600 to-cyan-500',
    iconName: 'Network',
    primaryActionLabel: 'Novo CI',
    badge: 'ITIL v4',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/30'
  },
  infra_topology: {
    id: 'infra_topology',
    menuLabel: 'Topologia da Infra',
    fullName: 'Topologia da Infraestrutura & Diagramas de Rede',
    category: 'Infraestrutura & Redes',
    description: 'Mapeamento de ativos físicos, portas, cabeamento estruturado, escaneamento SNMP e gerador automático de diagramas 2D/3D via IA.',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    iconName: 'Network',
    primaryActionLabel: 'Escanear Subnet (SNMP)',
  },
  asset_management: {
    id: 'asset_management',
    menuLabel: 'Gestão Patrimonial',
    fullName: 'Gestão Patrimonial de TI & Inventário de Ativos (ITAM)',
    category: 'Patrimônio & Inventário de TI',
    description: 'Cadastro completo com Tombos/Plaquetas (QR Code), controle de garantia, depreciação financeira e integração direta com a Topologia de Infraestrutura.',
    gradient: 'from-amber-600 via-yellow-600 to-orange-600',
    iconName: 'Box',
    primaryActionLabel: 'Cadastrar Ativo de TI',
  }
};
