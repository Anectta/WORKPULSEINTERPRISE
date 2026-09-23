import { 
  KBArticle, 
  KBFaq, 
  KBTutorial, 
  KBContextHelp, 
  KBVersionRecord, 
  KBUserProgress, 
  KBRolePermission, 
  KBDatabaseTableDoc,
  KBTourStep
} from '../types/knowledge';

export const INITIAL_KB_ARTICLES: KBArticle[] = [
  {
    id: 'art-001',
    title: 'Guia Completo: Configuração de Limite de Ociosidade & Alertas Toasts',
    slug: 'configuracao-ociosidade-alertas-toasts',
    moduleId: 'Ociosidade',
    moduleName: 'Controle de Ociosidade',
    description: 'Aprenda a calibrar a janela de tolerância de inatividade (10m a 120m) e ativar exceções individuais por funcionário.',
    objective: 'Garantir a detecção precisa de pausas e ausências sem gerar falsos positivos em cargos de reuniões virtuais.',
    operationalFlow: '1. O Agente Silencioso monitora teclado/mouse no SO -> 2. Quando o tempo sem entrada excede o limite (ex: 15m) -> 3. Um evento de ociosidade é transmitido -> 4. A plataforma agrupa eventos em janela de 10m e exibe um Toast visual.',
    prerequisites: [
      'Permissão de Administrador ou Gestor de Equipe',
      'Agente Corporativo WorkPulse v2.4.1+ instalado na estação'
    ],
    examples: [
      'Ajustar o limite de ociosidade para 30 min em equipes de Suporte Técnico',
      'Criar uma exceção de alerta individual para o Analista sênior durante treinamento'
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: 'Acessar o Painel de Ociosidade',
        detail: 'Clique na aba "4. Controle de Ociosidade" no menu lateral esquerdo ou no ícone de sino do topo.',
        tip: 'Você também pode alterar a tolerância direto pelo seletor rápido no topo da Navbar.'
      },
      {
        stepNumber: 2,
        title: 'Definir o Limite Geral de Tolerância',
        detail: 'Selecione a minutagem desejada: 10m, 15m, 20m, 30m, 60m (1 hora) ou 120m (2 horas).',
        tip: '15 minutos é o padrão recomendado pela ISO 27001 para estações administrativas.'
      },
      {
        stepNumber: 3,
        title: 'Ativar Exceções Individuais',
        detail: 'Caso um funcionário específico precise ser monitorado com alerta mesmo se o alerta geral estiver pausado, clique no botão "Ativar Exceção" ao lado do nome do funcionário.',
        tip: 'Exceções ativas ignoram a pausa global do sistema.'
      }
    ],
    commonErrors: [
      {
        error: 'Toasts não estão aparecendo na tela',
        code: 'ERR_TOAST_DISABLED',
        solution: 'Verifique se o seletor "Alertas Gerais" na barra superior está no status ATIVADO e se o navegador não está bloqueando notificações pop-up.'
      },
      {
        error: 'Contagem de ociosidade não reseta após mexer o mouse',
        code: 'ERR_AGENT_HOOK_TIMEOUT',
        solution: 'Reinicie o serviço "WorkPulseAgentService" nas ferramentas do Windows (services.msc) ou atualize a versão do agente.'
      }
    ],
    videos: [
      {
        title: 'Vídeo Tutorial: Controle e Calibração de Ociosidade',
        url: 'https://youtube.com/watch?v=demo_ociosidade',
        duration: '03:45'
      }
    ],
    faqs: [
      {
        question: 'O que acontece quando o alerta de ociosidade dispara?',
        answer: 'Um Toast visual é exibido no topo do painel agrupando os minutos de inatividade, o último app utilizado e a estação correspondente.'
      },
      {
        question: 'A ociosidade desconecta o funcionário da máquina?',
        answer: 'Não. Para bloqueio físico de tela, utilize o módulo "6. Bloqueio de Sites & PC (Bloqueio Pós-Expediente)".'
      }
    ],
    files: [
      {
        name: 'Manual_Politica_Ociosidade_WorkPulse.pdf',
        size: '1.2 MB',
        url: '#'
      }
    ],
    externalLinks: [
      {
        label: 'Documentação do Agente de Ociosidade',
        url: 'https://docs.workpulse.com/agent/idle'
      }
    ],
    tags: ['Ociosidade', 'Toast', 'Alertas', 'Tolerância', 'Exceção Individual'],
    targetRoles: ['Administrador', 'Gestor', 'Supervisor'],
    version: '2.1.0',
    updatedAt: '2026-08-07',
    author: 'Equipe de Suporte Técnico WorkPulse',
    viewsCount: 1420,
    helpfulCount: 389,
    unhelpfulCount: 12
  },
  {
    id: 'art-002',
    title: 'Bloqueio de Sites & Bloqueio Físico de Estação Pós-Expediente',
    slug: 'bloqueio-sites-estacao-pos-expediente',
    moduleId: 'Bloqueios',
    moduleName: 'Bloqueio de Sites & PC',
    description: 'Passo a passo para implementar políticas de trava de tela para evitar horas extras indevidas e proibir sites improdutivos.',
    objective: 'Garantir compliance trabalhista (restringindo acesso pós-jornada) e proteger a rede corporativa contra vazamento de dados.',
    operationalFlow: '1. Define-se a regra de bloqueio (Departamentos + Modelo de Trabalho + Horário de Corte) -> 2. O servidor envia via Webhook para a estação -> 3. O driver do Agente bloqueia os domínios via filtro WFP/Hosts ou exibe a tela de trava do Windows.',
    prerequisites: [
      'Perfil de Administrador de TI ou Compliance LGPD',
      'Politica de PC Lock associada ao departamento do colaborador'
    ],
    examples: [
      'Bloquear redes sociais (facebook.com, instagram.com, tiktok.com) no departamento Comercial',
      'Travar a estação dos funcionários de Home Office a partir das 18:15 com tolerância de 15m'
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: 'Abrir o Módulo de Bloqueios',
        detail: 'Acesse "6. Bloqueio de Sites & PC" no menu lateral.',
        tip: 'Verifique a contagem de regras ativas no badge ao lado do nome do menu.'
      },
      {
        stepNumber: 2,
        title: 'Criar uma Nova Regra de Bloqueio Web',
        detail: 'Clique em "+ Nova Regra de Bloqueio", informe o título, padrão do domínio (ex: *tiktok.com) e selecione os departamentos afetados.',
        tip: 'Você pode escolher entre "Bloqueio Total", "Aviso com Justificativa" ou "Alerta ao Gestor".'
      },
      {
        stepNumber: 3,
        title: 'Configurar Política de Trava Física (PC Lock)',
        detail: 'No painel "Trava de Tela Pós-Expediente", ajuste o horário de corte (ex: 18:00), a tolerância (ex: 15 min) e personalize a mensagem que o funcionário verá na tela.',
        tip: 'A opção "Bloquear Acesso aos Finais de Semana" impede qualquer logon aos sábados e domingos.'
      }
    ],
    commonErrors: [
      {
        error: 'O site bloqueado continua abrindo no Chrome',
        code: 'ERR_DNS_CACHE_FLUSH',
        solution: 'O navegador pode estar usando cache DNS ou DoH (DNS over HTTPS). Execute `ipconfig /flushdns` no prompt da estação.'
      },
      {
        error: 'Funcionário precisa fazer hora extra e a tela travou',
        code: 'ERR_OVERTIME_NOT_APPROVED',
        solution: 'O gestor deve liberar o acesso emergencial na aba "Jornada & Ponto" clicando em "Autorizar Hora Extra".'
      }
    ],
    videos: [
      {
        title: 'Configurando Trava Automática de Tela Pós-Expediente',
        url: 'https://youtube.com/watch?v=demo_pc_lock',
        duration: '04:10'
      }
    ],
    faqs: [
      {
        question: 'O bloqueio funciona se o computador estiver offline sem internet?',
        answer: 'Sim! As políticas de trava são armazenadas localmente em cache criptografado pelo agente.'
      }
    ],
    files: [
      {
        name: 'Modelo_Politica_Uso_Equipamentos_Corporativos.docx',
        size: '850 KB',
        url: '#'
      }
    ],
    externalLinks: [
      {
        label: 'Compliance Trabalhista e Horas Extras',
        url: 'https://docs.workpulse.com/compliance/overtime'
      }
    ],
    tags: ['Bloqueio', 'PC Lock', 'Pós-Expediente', 'Domínios', 'LGPD'],
    targetRoles: ['Administrador', 'Gestor'],
    version: '1.8.5',
    updatedAt: '2026-08-06',
    author: 'Engenharia de Segurança WorkPulse',
    viewsCount: 2105,
    helpfulCount: 612,
    unhelpfulCount: 8
  },
  {
    id: 'art-003',
    title: 'Integração de Ponto Eletrônico ERP (Ahgora, TOTVS Carol, Secullum & Senior X)',
    slug: 'integracao-ponto-eletronico-erp',
    moduleId: 'Integracoes',
    moduleName: 'API & Integrações ERP',
    description: 'Como sincronizar batidas de ponto reais dos sistemas corporativos e correlacionar com o tempo de atividade do computador.',
    objective: 'Cruzar o horário oficial do relógio de ponto com o uso real da estação para identificar divergências e ausências não justificadas.',
    operationalFlow: '1. O conector ERP busca os espelhos de ponto via API OAuth/Token REST -> 2. O WorkPulse compara os horários de punch com a timeline do agente -> 3. Um índice de correlação (%) e anomalias são gerados.',
    prerequisites: [
      'Chave API de Integração com o ERP (Protheus, RM, Ahgora ou Senior)',
      'Credenciais de Admin cadastradas na aba 10. API & Integrações ERP'
    ],
    examples: [
      'Sincronizar espelho de ponto do TOTVS Carol HCM a cada 1 hora',
      'Detectar anomalia quando o ponto foi batido às 08:00 mas o PC só foi ligado às 09:30'
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: 'Conectar o Provedor no Painel de Integrações',
        detail: 'Acesse "10. API & Integrações ERP" e clique no botão do seu sistema (ex: TOTVS Carol ou Ahgora).',
        tip: 'Tenha em mãos a AppKey, Tenant ID e URL do webservice.'
      },
      {
        stepNumber: 2,
        title: 'Executar Teste de Conectividade API',
        detail: 'Clique em "Testar Endpoint". Se o resultado for 200 OK, a sincronização do feed automático estará pronta.',
        tip: 'Em caso de erro HTTP 403, revise se o token possui permissão de leitura de marcações.'
      },
      {
        stepNumber: 3,
        title: 'Visualizar Relatório de Correlação de Jornada',
        detail: 'Acesse "2. Jornada & Ponto" para ver o percentual de correlação (%) entre as batidas registradas e a atividade do PC.',
        tip: 'Registros com anomalia serão destacados em vermelho com o motivo correspondente.'
      }
    ],
    commonErrors: [
      {
        error: 'HTTP 401 Unauthorized na sincronização TOTVS',
        code: 'ERR_TOTVS_AUTH_FAILED',
        solution: 'Sua AppKey ou Token de serviço expirou. Gere uma nova chave no portal do desenvolvedor da TOTVS.'
      },
      {
        error: 'Ponto batido sem atividade de computador associada',
        code: 'ERR_PUNCH_NO_AGENT_DATA',
        solution: 'Verifique se o agente corporativo está instalado no computador do colaborador correspondente.'
      }
    ],
    videos: [
      {
        title: 'Tutorial de Integração TOTVS e Ahgora no WorkPulse',
        url: 'https://youtube.com/watch?v=demo_erp_sync',
        duration: '05:20'
      }
    ],
    faqs: [
      {
        question: 'O WorkPulse substitui o relógio de ponto homologado pela Portaria 671 MTP?',
        answer: 'Não. O WorkPulse atua como uma camada de BI e auditoria, consumindo os dados do seu relógio de ponto oficial.'
      }
    ],
    files: [
      {
        name: 'Especificacao_API_Webhooks_WorkPulse.json',
        size: '145 KB',
        url: '#'
      }
    ],
    externalLinks: [
      {
        label: 'Documentação da API REST WorkPulse',
        url: 'https://docs.workpulse.com/api/v1'
      }
    ],
    tags: ['TOTVS', 'Ahgora', 'Ponto Eletrônico', 'ERP', 'API', 'Anomalia'],
    targetRoles: ['Administrador', 'Gestor', 'Supervisor'],
    version: '3.0.1',
    updatedAt: '2026-08-07',
    author: 'Equipe de Engenharia de Integrações',
    viewsCount: 1890,
    helpfulCount: 520,
    unhelpfulCount: 5
  },
  {
    id: 'art-004',
    title: 'Implantação em Massa do Agente Silencioso via GPO Active Directory',
    slug: 'implantacao-agente-silencioso-gpo',
    moduleId: 'GPO_LGPD',
    moduleName: 'Agente GPO & LGPD',
    description: 'Procedimento para distribuir o instalador `.msi` do Agente Corporativo em lote em todas as estações do domínio Windows.',
    objective: 'Instalar e manter o agente atualizado de forma 100% transparente para os usuários finais.',
    operationalFlow: '1. Download do instalador `.msi` com chave do Tenant -> 2. Configuração de Política de Grupo (GPO) no Windows Server Domain Controller -> 3. Instalação automática no boot da estação.',
    prerequisites: [
      'Acesso como Administrador do Domínio Windows Server (Active Directory)',
      'Pacote `WorkPulseAgent_v2.4.msi` baixado no painel'
    ],
    examples: [
      'Implantar o agente em 500 computadores da unidade matriz sem intervenção manual',
      'Configurar atualização silenciosa via canal de telemetria'
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: 'Baixar o Instalador Silencioso MSI',
        detail: 'Na aba "11. Agente GPO & LGPD", clique em "Baixar Pacote MSI com Tenant ID Embutido".',
        tip: 'O token de autenticação da empresa é configurado automaticamente no arquivo `.msi`.'
      },
      {
        stepNumber: 2,
        title: 'Criar a Regra de GPO no Windows Server',
        detail: 'No Server Manager, abra o `gpmc.msc` (Group Policy Management), crie uma nova GPO chamada "WorkPulse-Agent-Deploy" e vincule à OU desejada.',
        tip: 'Marque a opção "Assigned" em Computer Configuration -> Software Settings -> Software Installation.'
      },
      {
        stepNumber: 3,
        title: 'Validar Conexão dos Agentes',
        detail: 'Após o próximo reinício dos computadores, verifique na lista de estações o status "Ativo" e o endereço IP registrado.',
        tip: 'Se a máquina não aparecer, rode `gpupdate /force` no CMD da estação para acelerar a instalação.'
      }
    ],
    commonErrors: [
      {
        error: 'Erro 1603 durante instalação por GPO',
        code: 'ERR_MSI_PERMISSION_DENIED',
        solution: 'Certifique-se de que a pasta compartilhada onde o `.msi` está salvo possui permissão de leitura para "Domain Computers".'
      }
    ],
    videos: [
      {
        title: 'Vídeo: Como Implantar via GPO em 10 Minutos',
        url: 'https://youtube.com/watch?v=demo_gpo_deploy',
        duration: '06:15'
      }
    ],
    faqs: [
      {
        question: 'O agente consome muito recurso de CPU ou memória?',
        answer: 'Não. O Agente WorkPulse foi projetado em C++ / Rust nativo, consumindo menos de 0.8% de CPU e 25MB de RAM.'
      }
    ],
    files: [
      {
        name: 'WorkPulseAgent_GPO_Deployment_Script.ps1',
        size: '12 KB',
        url: '#'
      }
    ],
    externalLinks: [
      {
        label: 'Guia do Agente no Windows Defender & Antivírus',
        url: 'https://docs.workpulse.com/antivirus-whitelisting'
      }
    ],
    tags: ['GPO', 'Active Directory', 'MSI', 'Instalação Silenciosa', 'LGPD'],
    targetRoles: ['Administrador'],
    version: '2.4.0',
    updatedAt: '2026-08-05',
    author: 'Segurança & TI Corp',
    viewsCount: 3100,
    helpfulCount: 940,
    unhelpfulCount: 15
  }
];

export const INITIAL_KB_FAQS: KBFaq[] = [
  {
    id: 'faq-101',
    question: 'Como alterar o tempo tolerado de ociosidade para a minha equipe?',
    answer: 'Acesse a barra superior (Navbar) ou a aba "Controle de Ociosidade" e utilize o menu suspenso de minutagem (10, 15, 20, 30, 60 ou 120 minutos). A alteração é aplicada imediatamente para as regras de alerta na tela.',
    moduleId: 'Ociosidade',
    category: 'Configurações de Alertas',
    tags: ['ociosidade', 'tempo', 'tolerancia', 'alerta'],
    views: 890
  },
  {
    id: 'faq-102',
    question: 'Por que um funcionário em Home Office aparece como "Estação Bloqueada"?',
    answer: 'A estação entra no estado "Estação Bloqueada" quando a política de Trava de Tela Pós-Expediente (PC Lock) atinge o horário limite de jornada configurado (ex: 18:00 + 15m tolerância) ou por restrição de final de semana.',
    moduleId: 'Bloqueios',
    category: 'Segurança & Compliance',
    errorCodes: ['ERR_PC_LOCKED'],
    tags: ['bloqueio', 'trava de tela', 'home office', 'fim de expediente'],
    views: 1240
  },
  {
    id: 'faq-103',
    question: 'O WorkPulse grava teclas digitadas (keylogger) ou tira fotos da webcam?',
    answer: 'NÃO. O WorkPulse atua em estrita conformidade com a LGPD (Lei Geral de Proteção de Dados). O sistema monitora apenas metadados de executáveis ativos, domínios acessados na web e contagem de inatividade de entrada sem capturar conteúdo sensível, teclas ou imagens.',
    moduleId: 'GPO_LGPD',
    category: 'LGPD & Privacidade',
    tags: ['lgpd', 'privacidade', 'keylogger', 'webcam', 'segurança'],
    views: 3410
  },
  {
    id: 'faq-104',
    question: 'Como funciona a classificação automática de aplicativos por Inteligência Artificial?',
    answer: 'A IA do WorkPulse analisa o título da janela e o domínio web acessado e sugere a categoria adequada (Produtivo, Improdutivo ou Neutro). Você pode aprovar ou reclassificar regras na aba "5. Classificação de Apps".',
    moduleId: 'Classificacao',
    category: 'Inteligência Artificial',
    tags: ['ia', 'classificação', 'produtivo', 'improdutivo'],
    views: 780
  },
  {
    id: 'faq-105',
    question: 'O que significa o erro HTTP 403 ao testar o webhook da API TOTVS?',
    answer: 'Indica falta de autorização no Webservice do ERP. Verifique se a AppKey informada no modal de integração possui a role de leitura de batidas de ponto ativada no Portal Protheus / RM.',
    moduleId: 'Integracoes',
    category: 'APIs & Webhooks',
    errorCodes: ['ERR_TOTVS_AUTH_403', 'HTTP_403'],
    tags: ['totvs', 'api', '403', 'erro', 'webhook'],
    views: 530
  },
  {
    id: 'faq-106',
    question: 'Como funciona a integração quando o relógio de ponto é no padrão REP (Portaria 671 MTP)?',
    answer: 'O WorkPulse suporta todos os modelos de REP (REP-C, REP-A e REP-P) previstos na Portaria 671 MTP. A integração ocorre via ingestão automática de Arquivos AFD/AFDT (.txt) por pasta monitorada/SFTP, ou via API REST/SDKs dos fabricantes (Control iD, Henry, Dimep, Secullum, Ahgora, Senior). O sistema lê as marcações (linhas Tipo 3) do AFD e cruza o horário fiscal do ponto com a atividade real do computador.',
    moduleId: 'Integracoes',
    category: 'Ponto & Legislação (REP)',
    tags: ['rep', 'portaria 671', 'afd', 'afdt', 'relógio de ponto', 'rep-c', 'rep-p', 'ponto eletrônico'],
    views: 940
  }
];

export const INITIAL_KB_TUTORIALS: KBTutorial[] = [
  {
    id: 'tut-201',
    title: 'Trilha de Treinamento: Gestão Eficiente de Ociosidade e Alertas',
    description: 'Aprenda a identificar gargalos operacionais, configurar janelas de exceção e analisar os toasters de ociosidade em tempo real.',
    moduleId: 'Ociosidade',
    estimatedMinutes: 5,
    stepsCount: 4,
    completedByUsersPct: 92,
    steps: [
      {
        step: 1,
        title: 'Entendendo a Ociosidade',
        content: 'A ociosidade é registrada quando o sistema não detecta nenhuma interação de teclado ou mouse no tempo configurado.'
      },
      {
        step: 2,
        title: 'Configurando o Limite Rápido',
        content: 'Altere o limite para 15 minutos na barra superior. Esse valor servirá de gatilho para os alertas corporativos.'
      },
      {
        step: 3,
        title: 'Visualizando a Central de Toast Alerts',
        content: 'Clique no ícone de Sino no topo. O painel lateral exibirá as notificações agrupadas dos últimos 10 minutos.'
      },
      {
        step: 4,
        title: 'Ativando Exceção Individual',
        content: 'Para colaboradores com rotinas especiais de reunião ou treinamento, ative a marcação "Exceção Individual".'
      }
    ]
  },
  {
    id: 'tut-202',
    title: 'Guia Prático: Criação de Regras de Bloqueio de Sites e Trava de PC',
    description: 'Aprenda a restringir domínios nocivos e prevenir passivos trabalhistas com o encerramento automático da estação.',
    moduleId: 'Bloqueios',
    estimatedMinutes: 7,
    stepsCount: 3,
    completedByUsersPct: 88,
    steps: [
      {
        step: 1,
        title: 'Criando Regra de Domínio',
        content: 'Na aba de Bloqueio, insira o domínio (ex: tiktok.com) e selecione os departamentos afetados.'
      },
      {
        step: 2,
        title: 'Ajustando Tolerância de Pós-Expediente',
        content: 'Defina o horário de corte (ex: 18:00) e a carência de encerramento (15 minutos).'
      },
      {
        step: 3,
        title: 'Personalizando Mensagem na Estação',
        content: 'Insira a mensagem oficial que será exibida para o colaborador ao travar a estação.'
      }
    ]
  }
];

export const CONTEXTUAL_HELP_MAP: Record<string, KBContextHelp> = {
  overview: {
    tabId: 'overview',
    tabTitle: '1. Real-time Dashboard',
    objective: 'Fornecer uma visão executiva consolidada da produtividade, presença e distribuição das equipes em tempo real.',
    description: 'O Dashboard Real-time apresenta os principais KPIs operacionais: Score Mapeado de Produtividade, Horas Trabalhadas, Porcentagem de Ociosidade, Evolução de 7 Dias e Comparativo entre modelos de trabalho (Home Office vs Presencial).',
    howToUse: 'Utilize os filtros superiores da Navbar para alternar entre "Home Office", "Presencial" ou selecionar um Departamento específico. Clique em qualquer card de colaborador para inspecionar sua timeline de atividades.',
    videoUrl: 'https://youtube.com/watch?v=demo_overview',
    stepByStep: [
      'Selecione a área desejada no filtro de departamento.',
      'Analise a curva gráfica de produtividade por hora.',
      'Verifique os indicadores de scores mais altos e estações ociosas.',
      'Clique em "Relatório IA" para obter um resumo analítico gerado via Gemini.'
    ],
    commonErrors: [
      {
        error: 'Gráfico de tendência de 7 dias zerado',
        fix: 'Certifique-se de que os colaboradores possuem dados de atividade registrados nos últimos dias.'
      }
    ],
    relatedArticleId: 'art-001',
    faqList: [
      {
        question: 'Como é calculado o Score de Produtividade Média?',
        answer: 'É a média ponderada do tempo gasto em aplicativos e domínios classificados como "Produtivos" em relação ao tempo total ativo na jornada.'
      }
    ]
  },
  workday: {
    tabId: 'workday',
    tabTitle: '2. Jornada & Ponto',
    objective: 'Sincronizar batidas de ponto eletrônico oficial com a atividade real capturada nas estações de trabalho.',
    description: 'Tela de conciliação de jornada que cruza o espelho de ponto do ERP (TOTVS, Ahgora, Senior) com a timeline do agente para apontar anomalias e correlacionar presenças.',
    howToUse: 'Verifique a coluna "Correlação Ponto x Agente". Registros com anomalias de horário exibem um badge de atenção indicando a divergência.',
    stepByStep: [
      'Selecione o funcionário desejado na tabela.',
      'Compare a hora de Punch In (Ponto) com o primeiro evento ativo do computador.',
      'Em caso de anomalia, clique no badge para ver a justificativa registrada.',
      'Ajuste as regras de Trava de Tela Pós-Expediente no painel lateral de políticas.'
    ],
    commonErrors: [
      {
        error: 'Sincronização do ponto atrasada',
        fix: 'Verifique se o token de integração do ERP na aba 10 está ativo e sem erro HTTP 403.'
      }
    ],
    relatedArticleId: 'art-003',
    faqList: [
      {
        question: 'O que é a taxa de Correlação (%)?',
        answer: 'Indica a sobreposição entre o tempo em que o ponto esteve aberto e o tempo em que o computador realmente esteve ligado e em uso.'
      }
    ]
  },
  activity: {
    tabId: 'activity',
    tabTitle: '3. Monitor de Atividades',
    objective: 'Detalhar minuto a minuto cada aplicativo, aba do navegador e arquivo aberto pelo colaborador selecionado.',
    description: 'Oferece uma auditoria minuciosa da linha do tempo do computador. Exibe títulos das janelas, duração exata e categoria atribuída (Produtivo, Improdutivo, Neutro).',
    howToUse: 'Clique no perfil de um funcionário para carregar seus registros de atividade do dia. Utilize a busca por palavras-chave para filtrar executáveis específicos.',
    stepByStep: [
      'Escolha um colaborador na lista lateral.',
      'Inspecione os blocos coloridos da timeline.',
      'Filtre por categoria: Produtivo (Verde), Improdutivo (Vermelho), Neutro (Cinza).',
      'Ative a Exceção Individual de Alerta de Ociosidade no perfil caso necessário.'
    ],
    commonErrors: [
      {
        error: 'Título do site aparece como "Desconhecido"',
        fix: 'Certifique-se de que a extensão oficial do navegador WorkPulse está ativa no Chrome/Edge do colaborador.'
      }
    ],
    relatedArticleId: 'art-001',
    faqList: [
      {
        question: 'O WorkPulse lê mensagens privadas de chat?',
        answer: 'Não. Somente o nome do aplicativo e o título da janela (metadados) são registrados.'
      }
    ]
  },
  idle: {
    tabId: 'idle',
    tabTitle: '4. Controle de Ociosidade',
    objective: 'Monitorar períodos de inatividade e calibrar os limites de alertas visuais (Toasts) na tela.',
    description: 'Exibe todas as estações que atingiram a minutagem de inatividade definida. Permite alternar a minutagem global (10m a 120m) e definir exceções individuais por funcionário.',
    howToUse: 'Ajuste o limite na barra superior de seleção de tempo e acompanhe a formação dos alertas visuais no drawer lateral.',
    stepByStep: [
      'Escolha a minutagem de tolerância desejada (ex: 15 min).',
      'Monitore a lista de funcionários com status "Ocioso".',
      'Abra a Central de Alertas para verificar Toasts acumulados.',
      'Clique em "Ativar Exceção Individual" para forçar alertas mesmo com o sistema geral pausado.'
    ],
    commonErrors: [
      {
        error: 'Status de ociosidade não atualiza no painel',
        fix: 'Verifique se a simulação ao vivo ou o agente em nuvem estão ativos na barra superior.'
      }
    ],
    relatedArticleId: 'art-001',
    faqList: [
      {
        question: 'Como funciona a janela de agrupamento de 10 minutos?',
        answer: 'Alertas recebidos do mesmo funcionário em uma janela de 10 minutos são consolidados em um único Toast para evitar spam na tela do gestor.'
      }
    ]
  },
  app_classification: {
    tabId: 'app_classification',
    tabTitle: '5. Classificação de Apps',
    objective: 'Classificar executáveis e domínios web em Produtivo, Improdutivo ou Neutro por grupo e departamento.',
    description: 'Central de mapeamento e categorização de softwares. Conta com sugestão inteligente via IA para rotular novos aplicativos identificados na rede.',
    howToUse: 'Navegue pelas regras ativas ou adicione uma nova regra inserindo o nome do programa (ex: `excel.exe`) e escolhendo o departamento alvo.',
    stepByStep: [
      'Clique em "+ Adicionar Regra".',
      'Informe o nome do app ou padrão de domínio (ex: `*figma.com`).',
      'Selecione a categoria: Produtivo, Improdutivo ou Neutro.',
      'Associe a regra a um departamento ou a todas as áreas.'
    ],
    commonErrors: [
      {
        error: 'O app classificado continua como "Neutro" no histórico anterior',
        fix: 'A reclassificação afeta os novos registros gerados. Para reprocessar histórico, solicite na aba de BI.'
      }
    ],
    relatedArticleId: 'art-001',
    faqList: [
      {
        question: 'O mesmo app pode ser produtivo para Vendas e improdutivo para Engenharia?',
        answer: 'Sim! As regras de classificação suportam direcionamento exclusivo por departamento.'
      }
    ]
  },
  blocking: {
    tabId: 'blocking',
    tabTitle: '6. Bloqueio de Sites & PC',
    objective: 'Gerenciar bloqueio de domínios nocivos e definir horários de encerramento automático da estação (Trava Pós-Expediente).',
    description: 'Central de controle de segurança e disciplina de jornada. Impede acesso a domínios improdutivos e aciona a tela de bloqueio do Windows fora do horário contratual.',
    howToUse: 'Ative ou desative regras de domínio na lista e configure a política de PC Lock ajustando o horário de corte e a carência em minutos.',
    stepByStep: [
      'Adicione regras de bloqueio web selecionando o tipo de ação.',
      'Defina o horário limite de uso da estação (ex: 18:00).',
      'Ajuste o tempo de carência antes do bloqueio efetivo (ex: 15m).',
      'Personalize a mensagem oficial exibida na tela do computador.'
    ],
    commonErrors: [
      {
        error: 'ERR_DNS_CACHE_FLUSH',
        fix: 'Se o site bloqueado continuar abrindo, limpe o cache DNS do navegador do colaborador.'
      }
    ],
    relatedArticleId: 'art-002',
    faqList: [
      {
        question: 'O bloqueio físico desliga o computador?',
        answer: 'Não. O agente aciona a tela de bloqueio do SO (Lock Workstation) e impede novo logon até o próximo expediente ou liberação manual.'
      }
    ]
  },
  rankings: {
    tabId: 'rankings',
    tabTitle: '7. Rankings & Departamentos',
    objective: 'Comparar a eficiência produtiva de equipes e destacar colaboradores referências da organização.',
    description: 'Exibe o ranking dos setores com maior score de produtividade, menor taxa de ociosidade e comparativo por líder direto.',
    howToUse: 'Filtre por departamento para identificar a posição relativa de cada equipe e analisar os fatores que influenciam a performance.',
    stepByStep: [
      'Selecione o departamento no filtro.',
      'Inspecione o Top 5 de colaboradores com maior engajamento.',
      'Verifique as equipes que necessitam de apoio ou reequilíbrio de carga.'
    ],
    commonErrors: [],
    relatedArticleId: 'art-001',
    faqList: []
  },
  reports: {
    tabId: 'reports',
    tabTitle: '9. Relatórios & Power BI',
    objective: 'Exportar dados analíticos em formatos CSV/PDF e integrar dashboards ao Microsoft Power BI ou Google Looker Studio.',
    description: 'Módulo de extração de relatórios consolidados e conectores OData/REST para alimentação de ferramentas externas de Business Intelligence.',
    howToUse: 'Selecione o período de exportação, o formato desejado (PDF/Excel) ou copie o token de conexão OData para o Power BI.',
    stepByStep: [
      'Escolha o tipo de relatório desejado.',
      'Defina o intervalo de datas.',
      'Clique em "Exportar PDF" ou "Copiar Link OData".'
    ],
    commonErrors: [],
    relatedArticleId: 'art-003',
    faqList: []
  },
  integrations: {
    tabId: 'integrations',
    tabTitle: '10. API & Integrações ERP',
    objective: 'Gerenciar chaves de API, webhooks e conexões nativas com ERPs corporativos como TOTVS Protheus/RM, Ahgora e SAP.',
    description: 'Painel de controle técnico para integração de sistemas. Permite testar endpoints REST, gerar API Keys e verificar status dos serviços em nuvem.',
    howToUse: 'Clique no botão do seu ERP para configurar o servidor de sincronização e execute testes de conectividade.',
    stepByStep: [
      'Selecione o conector ERP.',
      'Preencha a AppKey, Tenant ID e URL.',
      'Clique em "Testar Endpoint" para confirmar o status 200 OK.'
    ],
    commonErrors: [
      {
        error: 'HTTP 403 Forbidden',
        fix: 'A chave de API informada não possui permissão de leitura de registros no ERP.'
      }
    ],
    relatedArticleId: 'art-003',
    faqList: []
  },
  gpo_lgpd: {
    tabId: 'gpo_lgpd',
    tabTitle: '11. Agente GPO & LGPD',
    objective: 'Gerenciar o deployment em lote do Agente Corporativo e assegurar a conformidade total com a Lei Geral de Proteção de Dados.',
    description: 'Central de distribuição do pacote `.msi` para Active Directory (GPO), auditoria de criptografia AES-256 e termos de privacidade para os colaboradores.',
    howToUse: 'Faça o download do arquivo MSI contendo a chave da empresa e siga o guia de implantação do Active Directory.',
    stepByStep: [
      'Baixe o pacote MSI do agente com a Tenant Key.',
      'Abra o Group Policy Management no Windows Server.',
      'Vincule a política às estações de trabalho desejadas.'
    ],
    commonErrors: [
      {
        error: 'ERR_MSI_PERMISSION_DENIED',
        fix: 'A pasta de compartilhamento da rede precisa de permissão de leitura para "Domain Computers".'
      }
    ],
    relatedArticleId: 'art-004',
    faqList: []
  },
  knowledge_base: {
    tabId: 'knowledge_base',
    tabTitle: '12. Central de Ajuda & Conhecimento',
    objective: 'Oferecer autoatendimento completo, documentação de módulos, FAQ, tutoriais interativos e assistente de IA.',
    description: 'Ambiente Multi-Tenant completo para aprendizado, treinamento de equipes, consulta de manuais operacionais e autoatendimento inteligente.',
    howToUse: 'Utilize a barra de pesquisa inteligente para encontrar artigos por palavra-chave, código de erro ou módulo, ou consulte a IA assistente.',
    stepByStep: [
      'Digite a dúvida na Pesquisa Inteligente.',
      'Explore os artigos categorizados por módulo.',
      'Inicie um Tour Guiado para aprender os recursos da tela.',
      'Consulte a IA treinada exclusivamente na base de conhecimento.'
    ],
    commonErrors: [],
    relatedArticleId: 'art-001',
    faqList: []
  }
};

export const INITIAL_KB_VERSIONS: KBVersionRecord[] = [
  {
    id: 'ver-001',
    articleId: 'art-001',
    articleTitle: 'Guia Completo: Configuração de Limite de Ociosidade & Alertas Toasts',
    version: '2.1.0',
    changeLog: 'Adicionadas instruções para seleção de minutagens de 60m (1h) e 120m (2h) e marcação de exceção individual.',
    author: 'Carlos Eduardo (Admin)',
    date: '2026-08-07 09:10'
  },
  {
    id: 'ver-002',
    articleId: 'art-002',
    articleTitle: 'Bloqueio de Sites & Bloqueio Físico de Estação Pós-Expediente',
    version: '1.8.5',
    changeLog: 'Inclusão da política de carência de encerramento e bloqueio emergencial nos finais de semana.',
    author: 'Juliana Costa (TI)',
    date: '2026-08-06 14:30'
  },
  {
    id: 'ver-003',
    articleId: 'art-003',
    articleTitle: 'Integração de Ponto Eletrônico ERP (Ahgora, TOTVS Carol, Secullum & Senior X)',
    version: '3.0.1',
    changeLog: 'Suporte estendido para conectores TOTVS Carol HCM e TOTVS Protheus com validação OAuth2.',
    author: 'Roberto Farias (Engenharia)',
    date: '2026-08-05 11:20'
  }
];

export const INITIAL_KB_USER_PROGRESS: KBUserProgress[] = [
  {
    userId: 'usr-101',
    userName: 'Mariana Lima',
    userRole: 'Gestor',
    department: 'Atendimento & Suporte',
    completedArticlesCount: 14,
    completedTutorialsCount: 4,
    score: 95,
    lastActivity: 'Hoje às 08:45'
  },
  {
    userId: 'usr-102',
    userName: 'Carlos Mendes',
    userRole: 'Supervisor',
    department: 'Vendas',
    completedArticlesCount: 10,
    completedTutorialsCount: 3,
    score: 82,
    lastActivity: 'Ontem às 17:10'
  },
  {
    userId: 'usr-103',
    userName: 'Fernanda Oliveira',
    userRole: 'Operador',
    department: 'Engenharia',
    completedArticlesCount: 8,
    completedTutorialsCount: 2,
    score: 74,
    lastActivity: 'Há 2 dias'
  }
];

export const INITIAL_KB_ROLE_PERMISSIONS: KBRolePermission[] = [
  {
    role: 'Administrador Geral',
    canRead: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    allowedModules: ['Dashboard', 'Jornada', 'Atividades', 'Ociosidade', 'Classificacao', 'Bloqueios', 'Rankings', 'GPO_LGPD', 'Gestao_Usuarios', 'Topologia_Infra', 'Gestao_Patrimonial', 'Base_Conhecimento'],
    description: 'Acesso irrestrito a todos os módulos, políticas de segurança, configurações de telemetria e gerenciamento de POPs.'
  },
  {
    role: 'Gestor de TI & Segurança',
    canRead: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    allowedModules: ['Dashboard', 'Atividades', 'Classificacao', 'Bloqueios', 'GPO_LGPD', 'Gestao_Usuarios', 'Topologia_Infra', 'Gestao_Patrimonial', 'Base_Conhecimento'],
    description: 'Gerenciamento de infraestrutura, implantação de agente silencioso MSI, inventário SNMP e regras de restrição de PC.'
  },
  {
    role: 'Gestor de RH & DP',
    canRead: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    allowedModules: ['Dashboard', 'Jornada', 'Rankings', 'GPO_LGPD', 'Base_Conhecimento'],
    description: 'Acesso a espelhos de ponto eletrônico (REP), conciliação com ERP de RH e auditoria de conformidade trabalhista.'
  },
  {
    role: 'Supervisor Operacional',
    canRead: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    allowedModules: ['Dashboard', 'Jornada', 'Atividades', 'Ociosidade', 'Rankings', 'Base_Conhecimento'],
    description: 'Acompanhamento em tempo real de equipes, scores de produtividade e análise de pausas/ociosidade.'
  },
  {
    role: 'Auditor de Compliance (DPO / LGPD)',
    canRead: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    allowedModules: ['Dashboard', 'Jornada', 'GPO_LGPD', 'Base_Conhecimento'],
    description: 'Auditoria de termos de consentimento, anonimização de dados e relatórios de conformidade regulatória.'
  },
  {
    role: 'Analista de Suporte TI',
    canRead: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    allowedModules: ['Atividades', 'GPO_LGPD', 'Topologia_Infra', 'Gestao_Patrimonial', 'Base_Conhecimento'],
    description: 'Diagnóstico remoto de estações de trabalho, verificação de conectividade de agentes e gestão de ativos físicos.'
  },
  {
    role: 'Colaborador / Operador',
    canRead: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    allowedModules: ['Dashboard', 'Jornada', 'Base_Conhecimento'],
    description: 'Acesso a manuais do usuário, política de privacidade LGPD e registro de dúvidas nos POPs.'
  }
];

export const KB_DATABASE_SCHEMAS: KBDatabaseTableDoc[] = [
  {
    tableName: 'kb_articles',
    description: 'Tabela principal de artigos da Central de Conhecimento com suporte a Multi-Tenant e busca vetorial.',
    columns: [
      { name: 'id', type: 'UUID', isPk: true, nullable: false, desc: 'Identificador único do artigo' },
      { name: 'tenant_id', type: 'UUID', isFk: true, nullable: false, desc: 'Isolamento Multi-Tenant da empresa' },
      { name: 'title', type: 'VARCHAR(255)', nullable: false, desc: 'Título oficial do artigo' },
      { name: 'slug', type: 'VARCHAR(255)', nullable: false, desc: 'Slug URL amigável' },
      { name: 'module_id', type: 'VARCHAR(50)', nullable: false, desc: 'Código do módulo do sistema' },
      { name: 'description', type: 'TEXT', nullable: false, desc: 'Resumo executivo' },
      { name: 'operational_flow', type: 'TEXT', nullable: true, desc: 'Descrição do fluxo operacional' },
      { name: 'content_json', type: 'JSONB', nullable: false, desc: 'Passo a passo, requisitos, erros e arquivos' },
      { name: 'embedding', type: 'VECTOR(1536)', nullable: true, desc: 'Vetor de busca semântica para IA Assistant' },
      { name: 'version', type: 'VARCHAR(20)', nullable: false, desc: 'Número da versão atual' },
      { name: 'author_id', type: 'UUID', isFk: true, nullable: false, desc: 'ID do usuário criador' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, desc: 'Data de criação' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, desc: 'Última modificação' }
    ],
    indexes: [
      'idx_kb_articles_tenant_module (tenant_id, module_id)',
      'idx_kb_articles_slug (tenant_id, slug)',
      'idx_kb_articles_fts USING gin(to_tsvector(\'portuguese\', title || \' \' || description))'
    ],
    relationships: [
      'kb_articles.tenant_id -> tenants.id (CASCADE)',
      'kb_articles.id <- kb_article_versions.article_id (CASCADE)'
    ]
  },
  {
    tableName: 'kb_faqs',
    description: 'Banco de dados de perguntas e respostas frequentes e códigos de erros conhecidos.',
    columns: [
      { name: 'id', type: 'UUID', isPk: true, nullable: false, desc: 'Chave primária do FAQ' },
      { name: 'tenant_id', type: 'UUID', isFk: true, nullable: false, desc: 'Tenant Multi-Empresa' },
      { name: 'question', type: 'TEXT', nullable: false, desc: 'Pergunta do usuário' },
      { name: 'answer', type: 'TEXT', nullable: false, desc: 'Resposta oficial da base' },
      { name: 'module_id', type: 'VARCHAR(50)', nullable: false, desc: 'Módulo de origem' },
      { name: 'error_codes', type: 'TEXT[]', nullable: true, desc: 'Códigos de erros associados' },
      { name: 'views_count', type: 'INT', nullable: false, desc: 'Contador de acessos' }
    ],
    indexes: [
      'idx_kb_faqs_tenant_module (tenant_id, module_id)',
      'idx_kb_faqs_error_codes USING gin(error_codes)'
    ],
    relationships: [
      'kb_faqs.tenant_id -> tenants.id (CASCADE)'
    ]
  },
  {
    tableName: 'kb_tours',
    description: 'Armazena as rotas e passos do Tour Guiado interativo para onboarding de usuários nas telas.',
    columns: [
      { name: 'id', type: 'UUID', isPk: true, nullable: false, desc: 'ID do Tour' },
      { name: 'tenant_id', type: 'UUID', isFk: true, nullable: false, desc: 'Tenant ID' },
      { name: 'tab_id', type: 'VARCHAR(50)', nullable: false, desc: 'Identificador da tela/aba' },
      { name: 'tour_title', type: 'VARCHAR(150)', nullable: false, desc: 'Nome do treinamento' },
      { name: 'steps_json', type: 'JSONB', nullable: false, desc: 'Array de passos, seletores CSS e dicas' }
    ],
    indexes: [
      'idx_kb_tours_tab (tenant_id, tab_id)'
    ],
    relationships: [
      'kb_tours.tenant_id -> tenants.id (CASCADE)'
    ]
  },
  {
    tableName: 'kb_user_progress',
    description: 'Acompanhamento LMS de leitura de artigos e conclusão de treinamentos pelos funcionários.',
    columns: [
      { name: 'id', type: 'UUID', isPk: true, nullable: false, desc: 'ID do registro' },
      { name: 'tenant_id', type: 'UUID', isFk: true, nullable: false, desc: 'Tenant' },
      { name: 'user_id', type: 'UUID', isFk: true, nullable: false, desc: 'ID do Usuário' },
      { name: 'completed_article_ids', type: 'UUID[]', nullable: true, desc: 'Artigos concluídos' },
      { name: 'completed_tutorial_ids', type: 'UUID[]', nullable: true, desc: 'Tutoriais concluídos' },
      { name: 'score_points', type: 'INT', nullable: false, desc: 'Pontuação no LMS' }
    ],
    indexes: [
      'idx_kb_progress_user (tenant_id, user_id)'
    ],
    relationships: [
      'kb_user_progress.user_id -> users.id (CASCADE)'
    ]
  }
];

export const INITIAL_GUIDED_TOURS: Record<string, KBTourStep[]> = {
  overview: [
    {
      id: 'tour-ov-1',
      tabId: 'overview',
      elementSelector: '#navbar-workmodel-filter',
      title: 'Filtro por Modelo de Trabalho',
      content: 'Alterne rapidamente entre Home Office, Presencial e Híbrido para analisar o desempenho de cada modalidade.',
      position: 'bottom',
      buttonLabel: 'Próximo'
    },
    {
      id: 'tour-ov-2',
      tabId: 'overview',
      elementSelector: '#kpi-productivity-score',
      title: 'Score Mapeado de Produtividade',
      content: 'Exibe a pontuação média da equipe calculada a partir do tempo gasto em aplicativos classificados.',
      position: 'bottom',
      buttonLabel: 'Próximo'
    },
    {
      id: 'tour-ov-3',
      tabId: 'overview',
      elementSelector: '#recharts-productivity-trend',
      title: 'Histórico 7D no Recharts',
      content: 'Acompanhe a linha de tendência dos últimos 7 dias comparada com a meta estabelecida de 80%.',
      position: 'top',
      buttonLabel: 'Entendi!'
    }
  ],
  idle: [
    {
      id: 'tour-id-1',
      tabId: 'idle',
      elementSelector: '#navbar-idle-selector',
      title: 'Seletor Rápido de Tolerância',
      content: 'Ajuste a minutagem de inatividade desejada (de 10 min até 120 min) diretamente na barra superior.',
      position: 'bottom',
      buttonLabel: 'Próximo'
    },
    {
      id: 'tour-id-2',
      tabId: 'idle',
      elementSelector: '#individual-override-btn',
      title: 'Exceção Individual por Colaborador',
      content: 'Ative alertas individuais para colaboradores específicos, mesmo se o sistema de alertas estiver pausado.',
      position: 'top',
      buttonLabel: 'Concluir Tour'
    }
  ]
};
