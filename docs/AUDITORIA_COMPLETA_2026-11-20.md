# Auditoria Técnica Completa — WorkPulse Enterprise (ANECTTA WORK PULSE)

**Data:** 20/11/2026  **Tipo:** auditoria somente leitura (nenhum código foi alterado)  **Base:** branch `main`, commit `a24d51c`

---

## 1. Escopo e método

- **Projeto examinado:** 332 arquivos versionados (cerca de 4 MB de fonte): front-end React 19 + Vite, servidor Express (`server.ts` + 3 routers + 13 módulos de segurança), Supabase (5 arquivos SQL e 5 serviços), motor e agente de backup, testes, CI e documentação.
- **Etapa 1, auditoria por agentes:** 15 frentes leram integralmente os arquivos do seu módulo e seguiram os fluxos interface → lógica → serviço → banco/API. A execução foi interrompida pelo limite de uso da conta, e as frentes concluídas foram preservadas.
- **Etapa 2, auditoria direta:** as frentes restantes (scanner de rede, backend e UI de segurança, WiFi, Velocímetro/Agenda, Conhecimento, backup, testes, documentação e as varreduras de contrato de API, código morto e estabilidade) foram examinadas diretamente, com verificação dirigida das áreas de risco.
- **Verificação:** os achados críticos e os principais achados de alta gravidade foram conferidos linha a linha no código atual. Todos os conferidos se confirmaram, e nenhum foi refutado. Cada achado traz o seu estado de verificação.
- **Linha de base:** `npx tsc --noEmit` retorna 0 erros, **mas isso não tem valor para o front-end.** O pacote `@types/react` não está instalado, então todo o JSX é tipado como `any` e props obrigatórias faltando passam sem erro (ver seção 3, item 14).

## 2. Resumo executivo

O WorkPulse tem interface ampla e bem acabada, mas **boa parte do que a interface promete não está implementada de ponta a ponta**. Há quatro problemas estruturais:

1. **Não há segurança real.** O login é feito no navegador, com a senha mestre dentro do código; a sessão pode ser forjada; o servidor não autentica nenhuma rota; e o RBAC do servidor confia em cabeçalhos enviados pelo próprio cliente. Qualquer pessoa que alcance a porta 3000 controla CMDB, scanner de rede, pentests e arquivos de dados.
2. **Os dados não persistem de forma confiável.** As edições da interface (colaboradores, regras, bloqueios, ativos) nunca são gravadas no Supabase e são sobrescritas pelo banco no login seguinte. O mapeamento de ativos descarta a maioria dos campos. No servidor, dois módulos gravam o mesmo arquivo JSON com caches separados e apagam o trabalho um do outro (achados de pentest, tickets).
3. **Muitas funcionalidades são simuladas.** WiFi Pulse inteiro, descoberta SNMP, Discovery Jobs, Central de Descoberta, Frota de Agentes, hardening, dashboards, auditoria e sessões ativas usam `Math.random`, `setTimeout` ou dados fixos, e os resultados são apresentados como reais.
4. **Há quebras de integração que derrubam telas.** Componentes recebem props com nomes errados (ativos, CMDB, termo de custódia, manutenção). A aba Compliance quebra por contrato incompatível com o servidor. Não existe ErrorBoundary, então um erro em qualquer tela deixa a aplicação inteira em branco.

Além disso, **não existe aplicação desktop**: `docs/desktop.md` descreve um empacotamento Tauri que não está no repositório. O motor de backup corporativo (~70 arquivos, bem construído) e o agente de backup **não estão ligados ao produto**.

**Números:** 399 registros de achados (28 críticos, 124 altos, 167 médios, 80 baixos) em 28 módulos e varreduras, com sobreposição, porque o mesmo problema sistêmico aparece sob a ótica de cada módulo. Em torno de 33 problemas consolidados respondem pela maior parte do risco (seção 3).

## 3. Problemas consolidados (deduplicados)

| # | Problema | Onde (principal) | Gravidade |
|---|---|---|---|
| 1 | Login só no cliente, senha mestre no bundle, sessão forjável via localStorage e sem expiração | `src/components/auth/LoginPage.tsx:35-77`, `src/App.tsx:85-99`, `src/services/sessionSecurity.ts` | CRÍTICA |
| 2 | Senha mestre e senhas de usuários em texto puro no código, no localStorage e nos backups exportados | `src/data/mockData.ts:25`, `src/App.tsx:326-345`, `src/utils/backupManager.ts:85`, `src/components/UserRegistration.tsx:332-339` | CRÍTICA |
| 3 | API Express inteira sem autenticação, exposta em 0.0.0.0:3000 (CMDB, agentes, scanner, WOL, topologia, segurança, WiFi) | `server.ts:33-41,266`, `server/cmdbRouter.ts` (rotas /cmdb e /agent) | CRÍTICA |
| 4 | RBAC e tenant definidos por cabeçalhos do cliente (`x-user-role`, `x-tenant-id`); só 6 de 70 rotas de segurança têm checagem | `server/securityRouter.ts:47-93`, `server/cmdbRouter.ts:905-909` | CRÍTICA |
| 5 | Agentes sem token são aceitos (fallback "legacy"); tokens de enrollment fixos no código e no bundle do front; re-enrollment permite sequestrar a identidade de outro agente | `server/cmdbRouter.ts:496-519,971-975,1850-1853`, `src/utils/installerScripts.ts:1` | CRÍTICA |
| 6 | Persistência Supabase unidirecional: operações por item importadas e nunca chamadas; edições sobrescritas no login seguinte; restore de backup desfeito | `src/App.tsx:10-13,188-239,691-725` | CRÍTICA |
| 7 | Erro de leitura do Supabase tratado como tabela vazia, o que provoca semeadura de dados mock e simulados no banco | `src/App.tsx:196-226`, `src/services/supabase/*.service.ts` | ALTA |
| 8 | Mapeamento `ITAsset` ↔ `it_assets` descarta a maioria dos campos e lê colunas inexistentes | `src/services/supabase/assets.service.ts:8-64` | CRÍTICA |
| 9 | Trigger `handle_new_user` cria todo usuário como ADMIN_GERAL e aceita o nível enviado pelo cliente; confirma e-mails em massa | `supabase/SEED_E_TRIGGERS_PRODUCAO.sql:7-44` (repetido em `MIGRATION_UNICA_COMPLETA.sql`) | CRÍTICA |
| 10 | RLS permissiva: qualquer autenticado tem CRUD total em todas as tabelas, inclusive `system_users`; `current_tenant_id()` lê `user_metadata` (alterável pelo usuário) | `supabase/migrations/20260924000000_core_business_tables.sql:276-334`, `20260911000000_backup_platform_control_plane.sql` | CRÍTICA |
| 11 | Dois gravadores no mesmo JSON com caches separados: achados de pentest apagados pelo orquestrador; tickets da ponte de segurança apagados pelo CMDB | `server/security/pentestControlPlane.ts:773-775`, `securityOrchestrator.ts:114-151`, `securityIntegrationBridge.ts:64-80` | CRÍTICA |
| 12 | Persistência do CMDB não atômica; JSON corrompido faz recarregar o seed, que sobrescreve os dados reais | `server/cmdbRouter.ts:736-851` | CRÍTICA |
| 13 | Deploy Vercel publica só o SPA: todas as rotas `/api/*` deixam de existir; `npm start` sem `NODE_ENV=production` sobe o Vite em modo dev; `dist/server.cjs` e o sourcemap ficam públicos | `vercel.json`, `package.json`, `server.ts:251-264` | CRÍTICA |
| 14 | `@types/react` ausente: o lint aprova props obrigatórias faltando ou com nomes errados | `package.json` | ALTA |
| 15 | Contratos de props quebrados na Gestão de Ativos: Transferência derruba o app; O.S. não salva; termo de custódia não confirma; botões do Raio-X lançam TypeError; transição perde justificativa, custo, colaborador e sala | `src/components/AssetManagement.tsx:1340-1360` e modais em `src/components/assetManagement/` | CRÍTICA/ALTA |
| 16 | Aba Compliance & GRC quebra a aplicação: `summaries.map` sobre objeto e `item.linkedFindings` inexistente | `src/components/security/ComplianceAssessmentView.tsx:58-66,223,333` × `server/security/complianceEngine.ts:285-406` | CRÍTICA |
| 17 | Nenhum ErrorBoundary: qualquer exceção de renderização derruba o sistema inteiro (também em Rankings por Departamento e no JSON corrompido da Agenda) | `src/App.tsx` e todo o projeto | ALTA |
| 18 | Aprovação de pentest pela interface sempre 403; sem segregação de funções; risco aceito autoaprovado | `src/components/security/PentestApprovalModal.tsx:33-39`, `server/securityRouter.ts:381`, `pentestControlPlane.ts` | ALTA |
| 19 | Pentest pode atingir qualquer IP público; escopo e RoE ignorados pelo runner; sub-redes autorizadas fixas; DNS rebinding; kill switch não interrompe testes em andamento | `server/security/targetValidator.ts:43-163`, `pentestRunner.ts` | ALTA |
| 20 | Suítes de teste executáveis por GET anônimo e por `npm test` alteram dados reais e acionam o kill switch de um pentest | `server/securityRouter.ts:112,1029`, `securityTestSuite.ts:236`, `scripts/runTests.ts:27-35` | ALTA |
| 21 | Live scan e WOL anônimos aceitam faixas públicas (o servidor vira scanner de portas); varredura truncada em 512 IPs sem aviso | `server/cmdbRouter.ts:3124-3199`, `server/networkScannerService.ts:488-561` | ALTA |
| 22 | RBAC de níveis de acesso só exibido, nunca aplicado; troca de usuário pela Sidebar sem senha | `src/components/Sidebar.tsx:268,339`, `src/components/UserRegistration.tsx` | ALTA |
| 23 | Módulo WiFi Pulse inteiramente simulado (varredura, troca de rede/canal, ARP, velocidade, "coleta em nível de kernel") | `server/wifiRouter.ts:159-330` | ALTA |
| 24 | Descoberta simulada: SNMP/LLDP da Topologia, Discovery Jobs do CMDB, "Executar Varredura" da Central de Descoberta; motor de matching nunca executado; [MESCLAR] pode mesclar no ativo errado | `src/components/InfraTopology.tsx`, `server/cmdbRouter.ts` (jobs), `src/components/assetManagement/CentralDiscoveryHub.tsx:768-822` | CRÍTICA/ALTA |
| 25 | Instaladores do agente quebrados: .BAT sempre aborta; `agent_service.ps1` corrompido; one-liner baixa rota inexistente; Linux/macOS sem daemon; Frota de Agentes simulada | `src/utils/installerScripts.ts`, `src/components/LgpdAndAgentInstaller.tsx`, `src/components/SilentAgentFleetModal.tsx` | ALTA |
| 26 | Regras de produtividade, bloqueio de sites e trava de PC existem só no front; nenhuma política chega a um agente; simulação aleatória ligada por padrão e rotulada "Ao Vivo" | `src/components/AppClassificationEngine.tsx`, `src/components/SiteAndStationBlocking.tsx`, `src/App.tsx` | ALTA |
| 27 | Tabelas auxiliares, Agenda Pro, usuários e auditoria só no localStorage; 31 das 36 tabelas SQL nunca usadas pelo código | `src/components/AuxiliaryTablesManager.tsx`, `src/components/AgendaProModule.tsx`, `supabase/MIGRATION_UNICA_COMPLETA.sql` | ALTA |
| 28 | Dados de runtime gravados em `src/data` (versionado); em dev, salvar a topologia recarrega a tela; servidor sem handler de `unhandledRejection` | `server.ts:208`, `server/cmdbRouter.ts:50`, `server/wifiRouter.ts:29`, `server/security/*` | ALTA |
| 29 | Motor de backup e agente de backup desconectados do produto; SMB ignora credenciais; suíte do agente nunca roda | `src/backup-engine/`, `src/backup-agent/` | ALTA |
| 30 | Aplicação desktop (Tauri) documentada, mas inexistente | `docs/desktop.md` | ALTA |
| 31 | LGPD: fluxo de consentimento inexistente; IP do usuário enviado a terceiros (ipwho.is, ipify); dados pessoais e senhas em localStorage; fotos de terceiros em cadastros gerados | `src/components/LgpdAndAgentInstaller.tsx`, `src/components/velocimetro/VelocimetroNetPulseView.tsx:96-111` | ALTA |
| 32 | Seis componentes órfãos (~107 KB, inclusive a Navbar) e Central de Ajuda descrevendo a Navbar inexistente; rotas de IA e cerca de 25 rotas do servidor sem consumidor; dependências e lockfiles sem uso | vários (seção 6, Transversal) | MÉDIA |
| 33 | Ausência de testes para front-end, Supabase, CMDB e WiFi; os testes existentes não pegariam nenhum dos bugs críticos acima | `scripts/runTests.ts`, `.github/workflows/ci.yml` | MÉDIA |

## 4. Prioridades de correção

**P0 — imediato (segurança e perda de dados)**
1. Remover a senha mestre do código e trocá-la (já está exposta no histórico do git). Implementar login real via Supabase Auth com verificação no servidor e expiração de sessão (itens 1, 2).
2. Criar um middleware de autenticação no Express que valide o JWT do Supabase e derive tenant e papel do token, nunca de cabeçalhos. Aplicar em todas as rotas, remover o fallback "legacy" e os tokens fixos, e rotacionar os tokens de enrollment (itens 3, 4, 5).
3. Corrigir o trigger `handle_new_user` (nível padrão mínimo, ignorar `access_level` do cliente), restringir a RLS por papel e tenant e não usar `user_metadata` para tenant (itens 9, 10).
4. Persistência Supabase bidirecional: chamar upsert/delete por item nos handlers, não tratar erro como tabela vazia, nunca semear mock em produção, completar o mapeamento de ativos e a migração das colunas (itens 6, 7, 8).
5. Servidor: um único dono por arquivo de dados com gravação atômica (arquivo temporário + rename), sem recarregar o seed por cima de dados reais. Mover os dados para fora de `src/` ou, de preferência, para o Supabase (itens 11, 12, 28).
6. Bloquear as suítes de teste em produção e isolar os testes em diretório temporário (item 20). Restringir live scan, WOL e pentest a sub-redes cadastradas e autenticadas (itens 19, 21).

**P1 — curto prazo (funcionalidades quebradas)**
7. Instalar `@types/react` e `@types/react-dom`, ativar `strict` gradualmente e corrigir todos os contratos de props apontados (itens 14, 15).
8. Corrigir o contrato da aba Compliance e adicionar ErrorBoundary por módulo (itens 16, 17).
9. Corrigir o fluxo de aprovação de pentest com papéis reais e segregação de funções (item 18).
10. Definir a estratégia de deploy (servidor Node persistente em vez de Vercel estático) e corrigir `npm start` e a exposição de `dist/server.cjs` (item 13).
11. Aplicar os níveis de acesso na interface e no servidor e remover a troca de usuário sem senha (item 22).

**P2 — médio prazo (simulações e integrações)**
12. Para cada funcionalidade simulada (WiFi, descoberta SNMP, Discovery Jobs, Frota de Agentes, hardening, dashboards, auditoria), implementar de verdade ou rotular claramente como demonstração e esconder em produção (itens 23, 24, 26).
13. Corrigir os instaladores do agente e criar as rotas que eles consomem (item 25).
14. Decidir o destino do motor e do agente de backup: integrar (rotas, UI, control plane WebSocket) ou remover do produto (item 29).
15. Migrar tabelas auxiliares, Agenda, usuários e auditoria para o Supabase (item 27). Implementar consentimento LGPD e revisar envios a terceiros (item 31).

**P3 — manutenção**
16. Remover componentes órfãos e dependências não usadas, unificar lockfile e documentação raiz/`docs`, e corrigir ou remover `docs/desktop.md` (itens 30, 32).
17. Criar testes de integração do front, das rotas Express e do Supabase e colocá-los no CI (item 33).

## 5. Módulos afetados

| Módulo | Forma de exame | Crítica | Alta | Média | Baixa | Total |
|---|---|---:|---:|---:|---:|---:|
| Núcleo, autenticação e sessão | Agente (leitura integral) | 3 | 12 | 8 | 4 | 27 |
| Servidor Express, configuração e deploy | Agente (leitura integral) | 2 | 6 | 11 | 6 | 25 |
| Banco de dados Supabase (schema, RLS, seeds, serviços) | Agente (leitura integral) | 3 | 4 | 8 | 8 | 23 |
| Produtividade (dashboard, timeline, classificação, bloqueios, rankings, ociosidade) | Agente (leitura integral) | 2 | 10 | 9 | 4 | 25 |
| LGPD, instalador de agente e coletores | Agente (leitura integral) | 1 | 8 | 14 | 2 | 25 |
| Cadastro de usuários e tabelas auxiliares | Agente (leitura integral) | 3 | 7 | 4 | 7 | 21 |
| Gestão de ativos — núcleo e ciclo de vida | Agente (leitura integral) | 3 | 11 | 11 | 4 | 29 |
| Gestão de ativos — modais e visões | Agente (leitura integral) | 1 | 6 | 15 | 7 | 29 |
| Gestão de ativos — descoberta e deduplicação | Agente (leitura integral) | 1 | 7 | 10 | 6 | 24 |
| Topologia de infraestrutura (linhas 1–4800) | Agente (leitura integral) | 1 | 5 | 11 | 6 | 23 |
| Topologia de infraestrutura (linhas 4700–9457) | Agente (leitura integral) | 0 | 3 | 8 | 4 | 15 |
| CMDB — interface principal | Agente (leitura integral) | 1 | 8 | 13 | 3 | 25 |
| CMDB — backend (cmdbRouter) | Agente (leitura integral) | 4 | 11 | 11 | 2 | 28 |
| CMDB — scanner de rede e dados | Manual (verificação dirigida) | 0 | 1 | 1 | 1 | 3 |
| Segurança/Pentest — router, orquestrador, validador | Manual (verificação dirigida) | 1 | 3 | 2 | 0 | 6 |
| Segurança/Pentest — control plane, runner, compliance, remediação | Agente (leitura integral) | 1 | 6 | 11 | 4 | 22 |
| Segurança/Pentest — relatórios, ponte de integração, suítes | Manual (verificação dirigida) | 0 | 1 | 0 | 1 | 2 |
| Segurança/Pentest — interface (dashboards, compliance, remediação) | Agente (leitura integral) | 1 | 6 | 8 | 6 | 21 |
| WiFi Pulse | Manual (verificação dirigida) | 0 | 1 | 1 | 1 | 3 |
| Velocímetro NetPulse e Agenda Pro | Manual (verificação dirigida) | 0 | 0 | 2 | 0 | 2 |
| Central de conhecimento e RBAC | Manual (verificação dirigida) | 0 | 2 | 1 | 0 | 3 |
| Motor de backup | Manual (verificação dirigida) | 0 | 1 | 1 | 1 | 3 |
| Agente de backup | Manual (verificação dirigida) | 0 | 1 | 1 | 0 | 2 |
| Testes, runner e CI | Manual (verificação dirigida) | 0 | 1 | 3 | 1 | 5 |
| Documentação e tooling | Manual (verificação dirigida) | 0 | 1 | 1 | 0 | 2 |
| Transversal — contrato de API | Manual (mapeamento completo de rotas) | 0 | 0 | 0 | 1 | 1 |
| Transversal — código morto e dependências | Manual (grafo de imports) | 0 | 0 | 1 | 1 | 2 |
| Transversal — desempenho e estabilidade | Manual (verificação dirigida) | 0 | 2 | 1 | 0 | 3 |
| **Total (com sobreposições entre módulos)** | | **28** | **124** | **167** | **80** | **399** |

## 6. Detalhamento por módulo

Cada achado traz arquivo, localização, descrição, impacto, gravidade e o estado da verificação. Um mesmo problema sistêmico pode aparecer em mais de um módulo, sob a ótica de cada um. A seção 3 consolida esses casos.

### 6.1 Núcleo, autenticação e sessão

_Forma de exame: Agente (leitura integral) — 27 achados._

> **Estado do módulo:** A fatia S01 cobre o núcleo da aplicação: App.tsx (roteamento das 16 abas, estado global, sincronização com o Supabase, simulação e backup automático), Sidebar/PageHeaderCard, a tela de login e a revogação de sessão. As 16 abas declaradas em TabType/SYSTEM_MODULES têm renderização correspondente no App e as props passadas aos filhos batem com as interfaces. A autenticação, porém, existe só no cliente: LoginPage compara e-mail e senha com valores fixos no bundle, monta uma sessão falsa e a grava no localStorage. Qualquer pessoa consegue forjar essa sessão pelo DevTools, e ela não expira. A função "Deslogar de Todos os PCs" só tem efeito no navegador local; os outros computadores continuam logados. A integração com o Supabase é de mão única: as funções de upsert/delete por item são importadas mas nunca chamadas. As edições feitas na interface ficam apenas no localStorage e são sobrescritas pelos dados do banco a cada recarga ou evento de autenticação, o que causa perda de dados. Quando a leitura falha (RLS sem sessão autenticada, URL placeholder), o resultado é tratado como tabela vazia e o App grava dados mock ou simulados no banco. A simulação começa ligada por padrão, altera aleatoriamente os dados dos colaboradores e persiste essas alterações. Os alertas de ociosidade são gerados por Math.random. O backup automático roda a cada minuto, ignorando o intervalo configurado, e com 10 snapshots o histórico cobre só uns 10 minutos. A lista de usuários usa duas chaves de localStorage incompatíveis (v1/v2), então usuários cadastrados se perdem ao recarregar e não entram nos backups. A senha mestre fica em texto puro no bundle, no localStorage e nos backups. Por fim, o pacote @types/react não está instalado: o "tsc 0 erros" é um falso positivo e esconde bugs reais, como a exportação do Espelho de Ponto, que lê campos inexistentes e gera "undefined".

#### A-001 · [CRÍTICA] Autenticação apenas no cliente com senha mestre fixa no bundle e sessão forjável
- **Arquivo:** `src/components/auth/LoginPage.tsx`
- **Localização:** LoginPage.tsx:35-77 (handleSubmit); App.tsx:85-99 (inicializador de authSession) e 856-870 (fallback de onLoginSuccess); sessionSecurity.ts:42-57 (isSessionGloballyValid); mockData.ts:12-27 (SYSTEM_USERS)
- **Categoria:** Segurança
- **Descrição:** O login compara e-mail e senha com literais no código do front (`cleanEmail === 'anectta@anectta.com.br' && password === '***'`). Em seguida monta um objeto de sessão falso (`access_token: 'wp-master-anectta-token-' + now`) e o grava em localStorage 'wp_auth_local_session'. Na carga, o App aceita qualquer objeto nessa chave cujo user.email seja o e-mail mestre e cujo created_at_epoch/issued_at seja posterior ao baseline. Nenhum servidor valida a sessão, e o expires_at (30 dias) nunca é conferido. O ramo else de onLoginSuccess (App.tsx:860-869) chega a criar uma sessão mestre sem credencial nenhuma. O signIn real do Supabase é disparado em segundo plano e o resultado é ignorado (`signIn(...).catch(() => {})`).
- **Impacto:** Qualquer pessoa com acesso ao navegador ou ao bundle JS lê a senha mestre ou forja a sessão pelo DevTools e ganha acesso total de administrador a todos os módulos. A sessão também nunca expira.
- **Evidência:** LoginPage.tsx:35 `if (cleanEmail === 'anectta@anectta.com.br' && password === '***')`; :60 `localStorage.setItem('wp_auth_local_session', JSON.stringify(masterSession))`; App.tsx:90 `if (parsed?.user?.email === 'anectta@anectta.com.br' && isSessionGloballyValid(parsed)) return parsed as Session;`; sessionSecurity.ts:49-53 confere só o timestamp, sem assinatura nem expiração. Basta gravar `{user:{email:'anectta@anectta.com.br'},created_at_epoch:Date.now()}` nessa chave.
- **Verificação:** CONFIRMADO (conferido manualmente)

#### A-002 · [CRÍTICA] Senha mestre em texto puro persistida no localStorage e incluída nos backups
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:326-333 (grava SYSTEM_USERS em wp_users_list_v2) e 345 (grava SYSTEM_USERS[0] em wp_currentUser); mockData.ts:25 (password); backupManager.ts:85 (generateBackupPayload lê wp_users_list_v2); UserRegistration.tsx:332-339 (senhas padrão gravadas em wp_users_list_v1)
- **Categoria:** Segurança
- **Descrição:** SYSTEM_USERS[0] traz o campo `password` com a senha mestre. A cada inicialização o App grava esse array em 'wp_users_list_v2' e, se não houver usuário salvo, grava também em 'wp_currentUser'. generateBackupPayload lê 'wp_users_list_v2' sem remover o campo password, então todo snapshot automático, toda exportação JSON e todo backup carregam a senha em claro. A Gestão de Usuários também grava senhas padrão em texto puro em 'wp_users_list_v1'.
- **Impacto:** A credencial do administrador vaza em qualquer backup exportado ou compartilhado e fica legível no armazenamento do navegador. Somado ao achado anterior, isso compromete o sistema inteiro.
- **Evidência:** mockData.ts:25 `password: '***'`; App.tsx:330 `localStorage.setItem('wp_users_list_v2', JSON.stringify(SYSTEM_USERS));`; backupManager.ts:85 `const systemUsers = safeParse('wp_users_list_v2', SYSTEM_USERS);` (grep por 'password' no backupManager não retorna nada, ou seja, não há sanitização).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-003 · [CRÍTICA] Edições da UI nunca são gravadas no Supabase e são sobrescritas pelo banco (perda de dados)
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:10-13 (imports sem uso de upsertEmployee/deleteEmployee/upsertAppRule/deleteAppRule/upsertSiteBlock/deleteSiteBlock/upsertAsset/deleteAsset); 188-239 (loadSupabaseData + efeito em [authSession]); 691-725 (handlers de regras e bloqueios); 1054-1064 (setAssets/setEmployees repassados ao AssetManagement); 403-430 (restore)
- **Categoria:** Banco de dados
- **Descrição:** As operações por item dos serviços Supabase são importadas mas nunca chamadas (o grep confirma uso zero). Adicionar, excluir, alternar ou resetar regras de apps, bloqueios de sites, ativos e colaboradores altera só o estado React e o localStorage. loadSupabaseData só grava em lote quando a tabela está vazia (seed). Quando a tabela tem dados, substitui o estado e o localStorage pelo conteúdo do banco. O efeito roda a cada mudança de identidade de authSession: login, INITIAL_SESSION (o callback recria o objeto a partir do localStorage), SIGNED_IN do signIn em segundo plano e TOKEN_REFRESHED a cada hora. O restore de backup também só grava no localStorage.
- **Impacto:** Toda alteração feita na interface se perde na próxima recarga, no próximo login ou na renovação do token. Registros excluídos voltam a aparecer. Restaurações de backup são desfeitas pelo banco. O banco não reflete o que o usuário vê, e cada estação mantém dados divergentes.
- **Evidência:** App.tsx:10 `import { fetchEmployees, upsertEmployees, upsertEmployee, deleteEmployee }`, mas upsertEmployee e deleteEmployee não aparecem em nenhum outro ponto do repositório; :196-198 `if (sbEmployees.length > 0) { setEmployees(sbEmployees); localStorage.setItem('wp_employees', ...)`; :711-713 `handleDeleteAppRule = (id) => setAppRules(prev => prev.filter(...))`, sem nenhuma chamada a deleteAppRule; :235-239 `useEffect(() => { if (authSession) loadSupabaseData(); }, [authSession, loadSupabaseData]);`.
- **Verificação:** CONFIRMADO (conferido manualmente)

#### A-004 · [ALTA] Erro de leitura tratado como tabela vazia: dados mock ou simulados gravados no banco
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:196-226 (ramos else de seed); employees.service.ts:73-76; appRules.service.ts:38-41; siteBlocks.service.ts:35-38; assets.service.ts:71-74; supabaseClient.ts:14-34 (isSupabaseConfigured nunca usado); LoginPage.tsx:37 (signIn não aguardado)
- **Categoria:** Banco de dados
- **Descrição:** Os fetch* devolvem [] tanto em erro quanto com tabela vazia. Com RLS 'TO authenticated', uma consulta feita como anon devolve [] sem erro. Isso acontece logo após o login, porque o signIn real roda em segundo plano sem await e loadSupabaseData dispara antes de ele terminar. Também acontece quando a conta não existe no Supabase Auth ou quando o .env falta e o client aponta para 'https://placeholder.supabase.co'. Nesses casos o App conclui que a tabela está vazia e faz upsert em massa dos dados do localStorage ou de INITIAL_* (colaboradores fictícios, já alterados pela simulação). isSupabaseConfigured() não é consultado antes das chamadas.
- **Impacto:** Dados fictícios ou aleatórios podem ser semeados no banco de produção, e estações diferentes podem semear conjuntos diferentes. Quando a gravação falha, só sai um console.error e o usuário acredita que está conectado ao banco.
- **Evidência:** employees.service.ts:73-76 `if (error) { console.error(...); return []; }`; App.tsx:199-204 `} else { // Supabase table is empty — seed it ... await upsertEmployees(localEmployees);`; migrations/20260924000000_core_business_tables.sql:282-286 `FOR SELECT TO authenticated USING (true)`; supabaseClient.ts:25 `supabaseUrl \|\| 'https://placeholder.supabase.co'`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-005 · [ALTA] Mapeamento ITAsset ↔ it_assets descarta a maior parte dos campos
- **Arquivo:** `src/services/supabase/assets.service.ts`
- **Localização:** assets.service.ts:8-38 (rowToAsset) e 40-64 (assetToRow); migration 20260924000000_core_business_tables.sql:152-180
- **Categoria:** Banco de dados
- **Descrição:** ITAsset (types.ts:279-386) tem cerca de 60 campos, mas assetToRow grava uns 20 e sempre envia `custom_fields: {}`. Ficam de fora building, floor, ipAddress, macAddress, contract*, warrantyType/Sla, lifespanMonths, installedSoftwares, linkedTopologyNodeId, quadrantCode, roomName, tenant, operatingSystem, entre outros. rowToAsset ainda lê colunas que não existem na tabela (lifecycle_stage_date, supplier_cnpj, supplier_contact, supplier_email, supplier_phone), que voltam sempre como undefined. Como loadSupabaseData substitui os ativos locais pelos do banco, a versão empobrecida passa a valer. As colunas DATE (purchase_date, warranty_expiry) recebem strings vazias quando o campo está em branco, o que pode fazer o lote inteiro falhar.
- **Impacto:** Depois da primeira sincronização, os ativos perdem localização, rede, contrato, garantia e vínculo com a topologia. Isso quebra a integração Patrimônio ↔ Topologia ↔ CMDB.
- **Evidência:** assets.service.ts:62 `custom_fields: {},`; :21 `supplierCnpj: (row.supplier_cnpj as string) \|\| undefined` (a coluna não existe na DDL); a DDL do it_assets (linhas 152-180) não tem ip_address, mac_address, building, floor nem contract_*.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-006 · [ALTA] "Deslogar de Todos os PCs" não desconecta outros computadores
- **Arquivo:** `src/services/sessionSecurity.ts`
- **Localização:** sessionSecurity.ts:7 (GLOBAL_REVOCATION_BASELINE), 29-37, 66-109 (forceGlobalSignOut), 114-157; App.tsx:827-832, 143-175
- **Categoria:** Segurança
- **Descrição:** A época de revogação é gravada só no localStorage local, e o BroadcastChannel e o evento 'storage' alcançam apenas abas do mesmo navegador e da mesma origem. Os outros PCs validam a sessão local (forjada) contra o próprio localStorage e contra a constante fixa GLOBAL_REVOCATION_BASELINE. Revogar de verdade exige editar essa constante e publicar um novo bundle. signOut({scope:'global'}) invalida só tokens do Supabase, mas o portão do App é a sessão local, e o callback de onAuthStateChange(null) recai para a sessão local válida (App.tsx:129-136). O passo 4 faz `update system_users set status='Revoked'` depois do signOut, ou seja, já como anon, e a RLS 'TO authenticated' bloqueia. Além disso, nenhum código lê esse status. O comentário da constante diz 14:40Z, mas o valor equivale a 17:40Z.
- **Impacto:** O administrador acredita ter encerrado todas as sessões (por exemplo, após vazamento de credencial), mas as outras estações continuam com acesso total. É uma falsa sensação de segurança.
- **Evidência:** sessionSecurity.ts:71 `localStorage.setItem(LOCAL_REVOCATION_KEY, String(newEpoch));` (escopo local); :85 `await supabase.auth.signOut({ scope: 'global' });` vem antes de :92-95 `.from('system_users').update({ status: 'Revoked' ...})`; App.tsx:133-135 restaura a sessão local quando o Supabase emite null.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-007 · [ALTA] onAuthStateChange aceita qualquer sessão Supabase sem validar e-mail ou revogação
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:125-128; LoginPage.tsx:37; App.tsx:809-825 (handleSignOut)
- **Categoria:** Segurança
- **Descrição:** Quando o Supabase emite uma sessão (INITIAL_SESSION restaurada de 'sb-*-auth-token', SIGNED_IN ou TOKEN_REFRESHED), o App faz setAuthSession(session) sem aplicar a regra de conta única nem isSessionGloballyValid. Qualquer usuário autenticado no projeto Supabase (por exemplo, criado via signUp com a anon key pública, se o cadastro estiver aberto) entra no sistema. Há também uma corrida: o signIn em segundo plano do LoginPage não é aguardado. Se o usuário sair antes de ele terminar, o SIGNED_IN posterior reautentica a interface sem credenciais. O heartbeat e o listener de foco só verificam a chave local, não a sessão Supabase em uso.
- **Impacto:** A restrição de acesso ao e-mail mestre pode ser contornada, e o logout pode ser desfeito sozinho.
- **Evidência:** App.tsx:126-127 `if (session) { setAuthSession(session); }`, sem conferir e-mail nem época; LoginPage.tsx:37 `signIn(cleanEmail, password).catch(() => {});` sem await.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-008 · [ALTA] Exportar Espelho de Ponto usa campos inexistentes (CSV cheio de 'undefined')
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:745-765 (case 'workday' de handleTabPrimaryAction); WorkdayTimeline.tsx:113-195; types.ts:97-113; mockData.ts:415-431
- **Categoria:** Bug / código incompleto
- **Descrição:** A exportação lê rec.sourceSystem, clockIn, clockOut, activePCHours, correlationScore, anomalyDetected e anomalyType. TimecardRecord e os dados mock usam systemSource, pontoPunchIn, pontoPunchOut, agentActiveWorkedHours, correlationPct, hasAnomaly e anomalyReason. A tela WorkdayTimeline repete o mesmo erro na tabela, no painel de detalhes e na exportação individual. O tsc não acusa porque os tipos do React estão ausentes (ver achado sobre @types/react).
- **Impacto:** O Espelho de Ponto, apresentado como compliance com a Portaria 671, é exportado com 'undefined' em todas as colunas e a anomalia sempre como 'NAO'. A tela de Jornada também mostra campos vazios.
- **Evidência:** App.tsx:750-755 `` `"${rec.sourceSystem}"`, `"${rec.clockIn} - ${rec.clockOut}"`, `${rec.activePCHours}h`, `${rec.correlationScore}%`, rec.anomalyDetected ? 'SIM' : 'NAO' ``; types.ts:103-112 define `pontoPunchIn`, `correlationPct`, `systemSource`, `hasAnomaly`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-009 · [ALTA] @types/react e @types/react-dom ausentes: 'tsc 0 erros' é falso positivo
- **Arquivo:** `package.json`
- **Localização:** package.json devDependencies; tsconfig.json (sem strict/noImplicitAny); node_modules/@types (sem react)
- **Categoria:** Estabilidade
- **Descrição:** O React 19 não traz declarações de tipo, e @types/react e @types/react-dom não estão no package.json nem em node_modules/@types. Sem noImplicitAny, o módulo 'react' vira `any`: useState, React.FC e as props JSX deixam de ser verificados. O script `lint` (tsc --noEmit) passa sem erros mesmo com acessos a propriedades inexistentes.
- **Impacto:** A rede de segurança de tipos está desligada em todo o front. Bugs de contrato entre módulos (campos renomeados, props erradas) chegam à produção sem aviso, como o do Espelho de Ponto.
- **Evidência:** `Test-Path node_modules/@types/react` retorna False; `npx tsc --noEmit` dá EXIT=0 e 0 linhas, mesmo com App.tsx:750 acessando `rec.sourceSystem`, que não existe em TimecardRecord (types.ts:97-113).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-010 · [ALTA] Backup automático roda a cada minuto, ignora o intervalo e pode estourar a cota do localStorage
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:380-400 (checkAndRunAutoBackup), 266-508 (useEffects com localStorage.setItem sem try/catch); backupManager.ts:39-44, 225-287
- **Categoria:** Estabilidade
- **Descrição:** O App compara `now - config.lastBackupTimestamp >= intervalMs`, mas saveLocalSnapshot só atualiza lastBackupTime (string) e nunca lastBackupTimestamp (o grep confirma que nada grava esse campo). Resultado: um snapshot completo a cada 60 s, mais um 5 s após cada mudança de currentUser. Com maxSnapshots=10, o histórico cobre só uns 10 minutos, e um estado corrompido substitui todos os pontos bons em pouco tempo. Cada snapshot inclui colaboradores, ativos e topologia inteiros no localStorage. Os vários `localStorage.setItem` dentro de useEffect não têm try/catch, e não existe ErrorBoundary no projeto: um QuotaExceededError derruba a árvore React.
- **Impacto:** A configuração de intervalo (5/15/30/60 min) não tem efeito, a restauração pontual fica praticamente inútil e há risco de tela branca quando o armazenamento enche.
- **Evidência:** App.tsx:388 `if (now - (config.lastBackupTimestamp \|\| 0) >= intervalMs)`; backupManager.ts:271-275 `updatedConfig = { ...config, lastBackupTime: payload.timestamp, lastBackupStatus: 'success' }` (sem lastBackupTimestamp); App.tsx:400 `setInterval(checkAndRunAutoBackup, 60000)`; o grep por ErrorBoundary/componentDidCatch não retorna nada.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-011 · [ALTA] Lista de usuários dividida entre chaves v1 e v2: cadastros perdidos e fora do backup
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:326-333 (remove wp_users_list_v1 a cada carga), 423-429 (restore lê v1), 1027-1030 (onUpdateUsersList grava v1); UserRegistration.tsx:324-340; backupManager.ts:85 (lê v2), 438 (restore grava v1), 562-563
- **Categoria:** Bug / código incompleto
- **Descrição:** A Gestão de Usuários e o callback onUpdateUsersList persistem em 'wp_users_list_v1'. O inicializador de systemUsers no App apaga 'wp_users_list_v1' e sobrescreve 'wp_users_list_v2' com SYSTEM_USERS sempre que a aplicação monta. O gerador de backup lê v2, enquanto o restore grava v1.
- **Impacto:** Todo usuário criado ou editado some ao recarregar a página. Os backups nunca contêm os usuários reais, e uma restauração de usuários dura só até a próxima recarga.
- **Evidência:** App.tsx:329-330 `localStorage.removeItem('wp_users_list_v1'); localStorage.setItem('wp_users_list_v2', JSON.stringify(SYSTEM_USERS));`; App.tsx:1029 `localStorage.setItem('wp_users_list_v1', JSON.stringify(updated));`; backupManager.ts:85 `safeParse('wp_users_list_v2', SYSTEM_USERS)`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-012 · [ALTA] Usuários cadastrados na Gestão de Usuários não conseguem fazer login
- **Arquivo:** `src/components/auth/LoginPage.tsx`
- **Localização:** LoginPage.tsx:35, 79-80; sessionSecurity.ts:46; App.tsx:90, 341
- **Categoria:** Falha de integração
- **Descrição:** A tela de Gestão de Usuários cria contas com senha e nível de acesso. Só que o LoginPage rejeita qualquer combinação diferente da conta mestre ('Any other account has been eliminated'), e isSessionGloballyValid e o App rejeitam sessões de outros e-mails. O signUp do auth.service é importado e nunca usado, e não existe tabela de usuários consultada no login.
- **Impacto:** O fluxo de cadastro de usuários e administradores promete algo que o sistema não faz: nenhuma conta criada consegue entrar.
- **Evidência:** LoginPage.tsx:79-80 `// Any other account has been eliminated  setError('Credenciais inválidas...')`; sessionSecurity.ts:46 `if (session.user.email !== 'anectta@anectta.com.br') return false;`
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-013 · [ALTA] Níveis de acesso não aplicados e troca de usuário sem autenticação
- **Arquivo:** `src/components/Sidebar.tsx`
- **Localização:** Sidebar.tsx:255-306 ('Trocar Usuário (Simular)'), 469-496 (menu sem filtro por permissão); App.tsx:884-900; Navbar.tsx:280-333
- **Categoria:** Regra de negócio
- **Descrição:** Nenhum ponto do código restringe abas ou ações por accessLevel. O único uso de `accessLevel ===` está num filtro de listagem do UserRegistration. O Sidebar exibe todos os módulos para qualquer currentUser e oferece trocar de identidade com um clique, sem senha. O novo currentUser fica persistido em wp_currentUser.
- **Impacto:** A matriz RBAC configurada na Gestão de Usuários é só cosmética. Qualquer sessão se passa por qualquer usuário e acessa monitoramento de funcionários, bloqueios e instalação de agentes (dados sensíveis da LGPD).
- **Evidência:** Sidebar.tsx:267-269 `onClick={() => { setCurrentUser?.(user); ...}}`; :469 `moduleList.map((mod) => ...` sem verificação de permissão; o grep por `accessLevel\s*(===\|!==)` em src/ retorna só UserRegistration.tsx:981.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-014 · [ALTA] Simulação ligada por padrão altera e persiste dados de colaboradores e gera alertas aleatórios
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:364-367 (isSimulating padrão true), 523-601 (triggerIdleToastForEmployee), 603-638 (efeito de simulação), 498-500 (persistência de employees)
- **Categoria:** UI não implementada
- **Descrição:** Com isSimulating=true por padrão, a cada 5 s o App escolhe colaboradores com Math.random, troca currentApp, varia productivityScore e, com 15% de chance, cria alertas de ociosidade com minutos aleatórios. O PageHeaderCard rotula isso como 'Ao Vivo'. As alterações vão para o localStorage 'wp_employees' e daí para os backups e para o seed do Supabase. activityLogs e timecardRecords são sempre os mocks iniciais.
- **Impacto:** Dashboards, rankings e alertas mostram dados fabricados como se fossem telemetria real. O dado aleatório contamina a base persistida e os backups. Decisões sobre colaboradores (produtividade, ociosidade) podem se basear em números falsos.
- **Evidência:** App.tsx:366 `return saved !== null ? saved === 'true' : true;`; :609 `if (Math.random() < 0.15) {`; :534 `const idleMins = customMinutes \|\| Math.floor(idleThresholdMinutes + Math.random() * 20 + 2);`; :631 `productivityScore: Math.max(40, Math.min(99, emp.productivityScore + (Math.random() > 0.5 ? 1 : -1)))`; PageHeaderCard.tsx:343 `{isSimulating ? 'Ao Vivo' : 'Pausado'}`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-015 · [ALTA] Tabelas do banco sem uso: activity_logs, timecard_records, pc_lock_policies, suppliers, system_users
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:254 (activityLogs = INITIAL_ACTIVITY_LOGS), 257 (pcLockPolicies via localStorage), 258 (timecardRecords = INITIAL_TIMECARD_RECORDS), 261-264 (suppliers, salas, categorias, status via localStorage)
- **Categoria:** Desconectado
- **Descrição:** A migration core_business_tables cria activity_logs, pc_lock_policies, suppliers, timecard_records e system_users com RLS, mas não há serviço nem chamada no front para essas tabelas. setActivityLogs e setTimecardRecords nunca são usados. Políticas de bloqueio de PC e fornecedores ficam só no localStorage, e system_users só é tocada pelo update de revogação, que de qualquer forma falha.
- **Impacto:** Os módulos Jornada & Ponto, Monitor de Atividades, Bloqueio de Estação e Fornecedores nunca persistem nem compartilham dados entre estações, apesar de o schema existir.
- **Evidência:** App.tsx:254 `useState<ActivityLog[]>(INITIAL_ACTIVITY_LOGS)`; :258 `useState<TimecardRecord[]>(INITIAL_TIMECARD_RECORDS)`; só existem 5 arquivos em src/services/supabase (employees, appRules, siteBlocks, assets, auth).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-016 · [MÉDIA] "Desativar alerta" individual não tem efeito com alertas globais ativos
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:528-532 (triggerIdleToastForEmployee), 660-665 (handleDisableAlert)
- **Categoria:** Regra de negócio
- **Descrição:** handleDisableAlert grava individualAlertOverrides[id]=false e avisa que o monitoramento foi desativado. Mas o gatilho só descarta o alerta quando o global e o individual estão ambos desligados (`!isGloballyActive && !isIndividualActive`). Com o global ligado, que é o padrão, o colaborador continua gerando alertas.
- **Impacto:** O gestor desativa os alertas de um colaborador, recebe confirmação e os alertas continuam aparecendo.
- **Evidência:** App.tsx:528-532 `const isIndividualActive = individualAlertOverrides[emp.id] === true; ... if (!customMinutes && !isGloballyActive && !isIndividualActive) return;`; :661-664 `setIndividualAlertOverrides(prev => ({ ...prev, [employeeId]: false })); ... alert('🛑 Monitoramento de alertas desativado ...')`
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-017 · [MÉDIA] "Alterar limite" de um colaborador muda o limite global de todos
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:676-681 (handleAlterThreshold)
- **Categoria:** Regra de negócio
- **Descrição:** A ação recebe employeeId e informa que o limite daquele colaborador foi alterado, mas chama setIdleThresholdMinutes(newThresholdMinutes), que é o estado global. Não existe limite por colaborador no modelo.
- **Impacto:** Mudar o limite de uma pessoa muda o de toda a empresa sem aviso, e a mensagem exibida é enganosa.
- **Evidência:** App.tsx:677 `setIdleThresholdMinutes(newThresholdMinutes);` e :680 `alert(`✏️ Limite de inatividade de ${emp?.name ...} alterado ...`)`
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-018 · [MÉDIA] "Notificar colaborador" só exibe alert(), nada é enviado
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:656-658 (handleNotifyEmployee)
- **Categoria:** UI não implementada
- **Descrição:** O handler usado pelo toast e pelo drawer de ociosidade não chama nenhum serviço, agente ou API. Só mostra um alert dizendo que a notificação foi 'enviada com sucesso'.
- **Impacto:** O gestor acredita que avisou o colaborador, mas nada chegou à estação.
- **Evidência:** App.tsx:657 `alert(`⚡ Notificação de atenção enviada com sucesso para o agente corporativo na estação ${toast.computerHost} ...`);`
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-019 · [MÉDIA] Botões de ação primária do cabeçalho sem efeito em várias abas
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:730-807 (handleTabPrimaryAction), 905 (cabeçalho oculto em asset_management/cmdb/velocimetro); modulesConfig.ts:61, 73, 175; SecurityModule.tsx:381-386; SecurityScansView.tsx:130
- **Categoria:** UI não implementada
- **Descrição:** (a) wifi_pulse tem primaryActionLabel 'Analisar Wi-Fi Agora', o botão aparece no PageHeaderCard, mas o switch não tem case 'wifi_pulse' e cai no default sem ação. (b) security_pentest procura #btn-new-scan-top, que só existe no SecurityScansView, renderizado apenas quando currentTab==='scans'; na subaba padrão 'executive' o clique não faz nada. (c) o case 'velocimetro_netpulse' nunca é alcançado e o 'Novo CI' do cmdb nunca é exibido, porque o cabeçalho fica oculto nessas abas. Clicar via document.getElementById também é um acoplamento frágil.
- **Impacto:** Botões visíveis no cabeçalho não fazem nada, o que passa a impressão de sistema quebrado.
- **Evidência:** modulesConfig.ts:61 `primaryActionLabel: 'Analisar Wi-Fi Agora'`, mas não existe case 'wifi_pulse' em App.tsx:731-806; App.tsx:741 `document.getElementById('btn-new-scan-top')`; SecurityModule.tsx:381 `{currentTab === 'scans' && (<SecurityScansView`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-020 · [MÉDIA] "Baixar Pacote MSI (GPO)" gera um .ps1 com token de tenant fixo e caminho UNC fictício
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:779-791 (case 'gpo_lgpd'); LgpdAndAgentInstaller.tsx:31-32
- **Categoria:** Segurança
- **Descrição:** O botão rotulado 'Baixar Pacote MSI (GPO)' gera, na verdade, um script PowerShell de texto com `$Token = "wp-prod-token-***"` fixo no código e `msiexec /i \\srv-dc01\deploy\WorkPulseAgent.msi`, um caminho que não é produzido em lugar nenhum. O mesmo token aparece fixo em LgpdAndAgentInstaller.
- **Impacto:** Não existe MSI. Se o token for real, ele está exposto no bundle para qualquer pessoa; se não for, a implantação via GPO não funciona.
- **Evidência:** App.tsx:780 `const gpoScript = `# WORKPULSE GPO DEPLOYMENT SCRIPT\n$Server = "https://app.workpulse.io"\n$Token = "***"\nmsiexec.exe /i "\\\\srv-dc01\\deploy\\WorkPulseAgent.msi" ...`; :785 `a.download = 'Install_WorkPulseAgent_GPO.ps1';`
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-021 · [MÉDIA] Filtros globais aplicados em outras abas sem controle visível; resumos departamentais estáticos
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:511-520 (filteredEmployees), 926 e 1003 (DEPARTMENT_SUMMARIES), 954, 964, 1002; PageHeaderCard.tsx:243
- **Categoria:** Regra de negócio
- **Descrição:** Os filtros de modelo de trabalho e departamento só aparecem na Visão Executiva (PageHeaderCard.tsx:243, `activeTab === 'overview'`), mas filteredEmployees, persistido no localStorage, também alimenta Jornada, Monitor de Atividades e Rankings. Essas telas ficam filtradas sem indicação nem forma de limpar o filtro. DEPARTMENT_SUMMARIES é um mock estático que não é recalculado a partir dos colaboradores nem dos filtros.
- **Impacto:** Rankings e relatórios saem parciais sem o usuário perceber, e os números por departamento não batem com a lista de colaboradores.
- **Evidência:** PageHeaderCard.tsx:243 `{activeTab === 'overview' && selectedWorkModel !== undefined && ...`; App.tsx:1002-1003 `employees={filteredEmployees} departmentSummaries={DEPARTMENT_SUMMARIES}`; mockData.ts:467 `export const DEPARTMENT_SUMMARIES: DepartmentSummary[] = [`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-022 · [MÉDIA] Ajuda Contextual inacessível e Navbar órfão
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:357-360 (selectedPersona/searchQuery sem UI), 372 (isContextHelpOpen), 1088-1097 (ContextualHelpModal); src/components/Navbar.tsx (arquivo inteiro)
- **Categoria:** Desconectado
- **Descrição:** isContextHelpOpen nunca recebe true: não há setIsContextHelpOpen(true) em src, e o gatilho onOpenContextHelp só existia no Navbar, que não é importado em lugar nenhum. O modal de ajuda contextual nunca aparece. selectedPersona é persistido mas não tem controle na interface nem efeito, e searchQuery fica fixo em '', sem campo de busca. A base de conhecimento (knowledgeData.ts:36, 355, 476) orienta o usuário a usar 'o seletor no topo da Navbar', que não existe mais.
- **Impacto:** A ajuda contextual e a busca global não funcionam, e a documentação interna aponta para controles que já não existem.
- **Evidência:** O grep por `setIsContextHelpOpen(true` não retorna nada; o grep por `Navbar` mostra o componente só em Navbar.tsx e em textos de knowledgeData.ts/AiKnowledgeAssistant.tsx; App.tsx:360 `const [searchQuery, setSearchQuery] = useState<string>('');`, e setSearchQuery não é usado.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-023 · [MÉDIA] Intervalo de simulação recriado a cada tick e regravação de todos os colaboradores a cada 5 s
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:604-638 (deps [isSimulating, employees, idleThresholdMinutes]), 498-500, 188-239
- **Categoria:** Desempenho
- **Descrição:** O efeito de simulação depende de `employees`, e o próprio intervalo altera employees a cada ciclo. Com isso o setInterval é destruído e recriado continuamente, e o estado de 'pausa'/'override' fica numa closure velha até a próxima mudança. Cada alteração serializa a lista inteira para o localStorage, e o filtro filteredEmployees é recalculado sem memo a cada render. loadSupabaseData roda mais de uma vez por sessão (login, INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED), com 4 consultas cada.
- **Impacto:** Uso contínuo de CPU e de I/O de armazenamento, re-renderização da árvore inteira a cada 5 s e consultas redundantes ao banco.
- **Evidência:** App.tsx:638 `}, [isSimulating, employees, idleThresholdMinutes]);` junto com :617 `setEmployees(prev => prev.map(...))` dentro do mesmo intervalo; :499 `localStorage.setItem('wp_employees', JSON.stringify(employees));`
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-024 · [BAIXA] Indicadores fixos ou fictícios na Sidebar e na sessão
- **Arquivo:** `src/components/Sidebar.tsx`
- **Localização:** Sidebar.tsx:84 e 454 (badge padrão 2), 325-331 ('Perfil & Acessos' sem ação), 396 ('148 PCs'), 412 ('AUTO ON'), 423 (relógio fixo), 473-474 (badges calculados e não renderizados); LoginPage.tsx:70-71 (IP/host fixos); Navbar.tsx:138, 166
- **Categoria:** UI não implementada
- **Descrição:** O relógio mostra sempre 'Qua, 07 Ago 2026 • 20:32'. O contador de PCs é fixo em 148. 'AUTO ON' aparece mesmo com o backup desligado. O sino mostra 2 quando há zero alertas (`idleAlertCount > 0 ? idleAlertCount : 2`). O botão 'Perfil & Acessos' só fecha o menu. currentBadge e currentBadgeColor são calculados e nunca exibidos. IP '192.168.1.100' e host 'ADM-ANECTTA-MASTER' aparecem como 'Sessão Conectada Ao Vivo'. O rodapé do login fala em 'criptografia de ponta a ponta', o que não existe.
- **Impacto:** O usuário vê informações falsas sobre data, alertas, frota de agentes e sessão.
- **Evidência:** Sidebar.tsx:423 `<span className="truncate">Qua, 07 Ago 2026 • 20:32</span>`; :454 `{idleAlertCount > 0 ? idleAlertCount : 2}`; :396 `148 PCs`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-025 · [BAIXA] Animação infinita em todos os ícones lucide
- **Arquivo:** `src/index.css`
- **Localização:** index.css:10-24
- **Categoria:** Desempenho
- **Descrição:** A regra global `svg.lucide { animation: iconPulse 2s ease-in-out infinite; }` anima com transform/opacity todos os ícones da interface (centenas por tela), sem respeitar prefers-reduced-motion. A exceção cobre só o Recharts.
- **Impacto:** Repinturas e composição contínuas (CPU/GPU) em desktops modestos e desconforto para usuários sensíveis a movimento.
- **Evidência:** index.css:21-24 `svg.lucide { animation: iconPulse 2s ease-in-out infinite; transform-origin: center; }`
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-026 · [BAIXA] Código morto, imports sem uso e lógica duplicada no núcleo
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:10-13 (8 funções importadas sem uso), 838-850 (tela 'Verificando sessão...' inalcançável: authSession nunca é undefined), 857-870 (fallback de sessão sem credencial), 101-117 (early-return redundante); auth.service.ts:32-72 (signUp/getSession/getCurrentUser sem uso; signUp importado em LoginPage sem uso); supabaseClient.ts:14-21 e 39-74 (isSupabaseConfigured/testSupabaseConnection sem uso); modulesConfig.ts:1-15 (React e ícones importados sem uso); Navbar.tsx (componente inteiro sem uso); PageHeaderCard.tsx:76-97 e Sidebar.tsx:93-116 (renderIcon duplicado)
- **Categoria:** Duplicado / obsoleto
- **Descrição:** Há vários trechos sem uso ou inalcançáveis, além de duplicação: o renderIcon do PageHeaderCard não trata 'ShieldCheck' nem 'Gauge', então o cabeçalho de Security & Pentest mostra o ícone padrão BarChart3. Existem 4 botões 'Sair' simultâneos (cartão do perfil, menu, rodapé da Sidebar e PageHeaderCard). O dropdown de perfil está duplicado entre Sidebar e Navbar.
- **Impacto:** Custo de manutenção maior, confusão sobre qual caminho de código vale e ícone errado no cabeçalho de segurança.
- **Evidência:** App.tsx:85 `useState<Session \| null \| undefined>(() => { ... return null; })`, que nunca devolve undefined, enquanto :839 testa `if (authSession === undefined)`; PageHeaderCard.tsx:77-96 não tem `case 'ShieldCheck'` (modulesConfig.ts:84 usa `iconName: 'ShieldCheck'`).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-027 · [BAIXA] Aba restaurada sem validação e possível crash no 'Testar Toast' com lista vazia
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:241-249 (activeTab), 683-688 (handleTriggerTestIdleAlert), 361 (selectedEmployee inicial)
- **Categoria:** Estabilidade
- **Descrição:** activeTab é lido do localStorage e convertido para TabType sem checar se a aba existe. Fora a lista fixa de legados, um valor desconhecido deixa o main vazio, só com o cabeçalho de fallback. handleTriggerTestIdleAlert usa `employees.find(...) \|\| employees[0]`: com a lista vazia (os colaboradores podem ser editados no AssetManagement), `emp.id` lança TypeError. selectedEmployee começa como INITIAL_EMPLOYEES[0] mesmo depois de carregar os dados reais.
- **Impacto:** Tela em branco depois de remover módulos e erro em tempo de execução em caso de borda.
- **Evidência:** App.tsx:245 `return (saved as TabType) \|\| 'overview';`; :685-686 `const target = employees.find(e => e.status === 'Ocioso') \|\| employees[0]; triggerIdleToastForEmployee(target, ...)` → :525 `employeePausedUntil[emp.id]`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

### 6.2 Servidor Express, configuração e deploy

_Forma de exame: Agente (leitura integral) — 25 achados._

> **Estado do módulo:** O servidor Express (server.ts) é um BFF monolítico: monta cmdbRouter e securityRouter em /api/v1 e wifiRouter em /api/wifi e /api/v1/wifi. Também expõe health checks, duas rotas Gemini, a persistência de topologia em arquivo e um feed Power BI. Não há nenhuma camada de autenticação ou autorização. O servidor escuta em 0.0.0.0, e todas as rotas, inclusive varredura de rede, Wake-on-LAN, gravação de topologia e consumo do Gemini, ficam abertas a qualquer cliente da rede. O securityRouter apenas confia em cabeçalhos x-user-role/x-tenant-id enviados pelo próprio cliente. Toda a "base de dados" do servidor são arquivos JSON em process.cwd()/src/data, gravados de forma síncrona e não atômica. Esses arquivos não vão para o dist, ficam versionados no git, e parte deles é escrita por dois módulos com caches independentes, o que causa perda de atualizações (lost update). O Supabase nunca é usado pelo servidor: o health check "database" devolve HEALTHY fixo. O deploy está quebrado em dois pontos. No Vercel, o vercel.json publica só o SPA e todas as rotas /api/* retornam 404, deixando inoperantes CMDB, Security, WiFi e Topologia. No modo Node, o script start não define NODE_ENV=production, então o bundle de produção sobe o Vite em modo dev. Quando NODE_ENV=production, o express.static entrega publicamente dist/server.cjs e o sourcemap com o código-fonte completo do servidor. As rotas de IA (/api/ai/insights e /api/ai/classify-app) existem, mas nenhum componente as chama; a UI só exibe um selo "IA Gemini" manual e a ajuda manda clicar num botão "Relatório IA" que não existe. O feed Power BI devolve números fixos e aponta para uma rota CSV inexistente. Rotas /api inexistentes caem no fallback do SPA e devolvem index.html com status 200. O .env.example documenta cerca de 30 variáveis, das quais a maioria nunca é lida. O segredo HMAC da auditoria tem nome divergente entre código, CI e documentação, de modo que o código sempre usa uma chave fixa embutida no fonte. O package.json tem vite duplicado, dependências sem uso e um script clean incompatível com Windows. A CSP é praticamente nula (unsafe-inline, unsafe-eval, http:, frame-ancestors *) e contradiz o X-Frame-Options do vercel.json.

#### A-028 · [CRÍTICA] API Express inteira sem autenticação/autorização e exposta em 0.0.0.0
- **Arquivo:** `server.ts`
- **Localização:** server.ts linhas 33-41 (montagem dos routers sem middleware de auth), 117 (/api/ai/insights), 166 (/api/ai/classify-app), 210-232 (/api/topology GET/POST), 235 (/api/export/powerbi-feed), 266 (app.listen em 0.0.0.0); server/securityRouter.ts 47-56 (getAuthContext); server/cmdbRouter.ts 905-909 (getTenantId), 3124 (/cmdb/discovery/live-scan), 3190 (/cmdb/discovery/wol)
- **Categoria:** Segurança
- **Descrição:** O server.ts não registra nenhum middleware de autenticação (JWT do Supabase, sessão, API key) antes dos routers e das rotas próprias. SUPABASE_JWT_SECRET e SESSION_SECRET, documentados, nunca são lidos. O securityRouter monta a identidade a partir de cabeçalhos enviados pelo próprio cliente (x-user-role, x-user-id, x-tenant-id), com padrão 'TECHNICIAN'/'tenant-demo'. O cmdbRouter aceita o tenant por cabeçalho ou query string. O servidor escuta em 0.0.0.0.
- **Impacto:** Qualquer pessoa na mesma rede (ou na internet, se publicado) pode: disparar varreduras de rede e Wake-on-LAN; ler e alterar CIs do CMDB, achados de segurança e topologia; enviar o cabeçalho x-user-role: ADMIN e passar por todo o RBAC; trocar de tenant pelo cabeçalho; consumir a cota paga do Gemini. A revogação global de sessão feita no front não protege a API.
- **Evidência:** server.ts:36-41 `app.use("/api/v1", cmdbRouter); ... app.use("/api/v1", securityRouter);` sem middleware prévio; server.ts:266 `app.listen(PORT, "0.0.0.0", ...)`; securityRouter.ts:48-53 `const tenantId = (req.headers['x-tenant-id'] as string) \|\| 'tenant-demo'; ... role: (req.headers['x-user-role'] as string) \|\| 'TECHNICIAN'`; securityRouter.ts:65 ADMIN/CISO recebem acesso total; cmdbRouter.ts:3124 `router.post("/cmdb/discovery/live-scan", async (req, res) => { const tenantId = getTenantId(req); ...` sem authenticateAgent nem checagem de papel. Grep por process.env no projeto: SUPABASE_JWT_SECRET/SESSION_SECRET não são lidos em nenhum lugar.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-029 · [CRÍTICA] Deploy Vercel publica só o SPA: todas as rotas /api/* ficam inexistentes
- **Arquivo:** `vercel.json`
- **Localização:** vercel.json linhas 3-5 (framework/buildCommand/outputDirectory) e 37-42 (rewrites); README.md linhas 36-37 e 78; DEPLOYMENT.md linhas 27-39
- **Categoria:** Falha de integração
- **Descrição:** O vercel.json usa framework 'vite' com buildCommand 'vite build' e outputDirectory 'dist'. Não existe diretório api/ nem configuração de função serverless para o server.ts. O rewrite exclui /api/, então essas rotas caem em 404. O README afirma que a 'API / BFF Gateway (Node.js/Express)' roda no Vercel e marca o Vercel como '✅ Deployed'. Além disso, o modelo de persistência em arquivo (src/data/*.json) e as operações de rede (varredura, WOL) são incompatíveis com funções serverless efêmeras.
- **Impacto:** No ambiente de produção documentado (Vercel), CMDB, Security & Pentest, WIFI Pulse, Topologia de Infra, health checks, feed Power BI e as rotas de IA ficam totalmente inoperantes. Toda chamada fetch('/api/...') falha.
- **Evidência:** vercel.json:4 `"buildCommand": "vite build"`; vercel.json:39 `"source": "/((?!api/).*)"` reescreve apenas o que não é api/; `ls` na raiz não mostra diretório api/; README.md:37 `\| **Control Plane** \| API / BFF Gateway (Node.js/Express) \| **SIM** \|`.
- **Verificação:** CONFIRMADO (conferido manualmente)

#### A-030 · [ALTA] Produção serve publicamente dist/server.cjs e o sourcemap com todo o código do servidor
- **Arquivo:** `server.ts`
- **Localização:** server.ts linhas 259-263 (express.static(dist)); package.json linha 8 (script build com --sourcemap --outfile=dist/server.cjs)
- **Categoria:** Segurança
- **Descrição:** O build gera o bundle do servidor e o sourcemap dentro de dist/, a mesma pasta que o Express publica com express.static(distPath) quando NODE_ENV=production. O sourcemap gerado contém sourcesContent de 25 arquivos-fonte do servidor.
- **Impacto:** Qualquer visitante pode baixar GET /server.cjs e GET /server.cjs.map e obter o código-fonte completo do backend: lógica de RBAC por cabeçalhos, segredos de fallback embutidos (por exemplo a chave HMAC padrão de auditoria), caminhos internos e regras anti-SSRF. Isso facilita a exploração das demais falhas.
- **Evidência:** package.json:8 `esbuild server.ts --bundle ... --sourcemap --outfile=dist/server.cjs`; server.ts:259-260 `const distPath = path.join(process.cwd(), "dist"); app.use(express.static(distPath));`. Verificação somente leitura do dist/server.cjs.map local: `sources 25 hasContent 25`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-031 · [ALTA] npm start não define NODE_ENV=production: o bundle de produção sobe o Vite em modo dev
- **Arquivo:** `server.ts`
- **Localização:** server.ts linhas 12 (dotenv.config) e 252-264 (startServer); package.json linhas 7 e 9; .env.example linha 14; .env local (NODE_ENV="development")
- **Categoria:** Bug / código incompleto
- **Descrição:** O modo de execução depende só de process.env.NODE_ENV. O script start ('node dist/server.cjs') não define a variável. O .env local traz NODE_ENV="development", e sem .env o valor fica undefined. Nos dois casos o servidor 'de produção' chama createViteServer, compila e serve src/ em tempo real, e o dist nunca é usado. No sentido inverso, o .env.example traz NODE_ENV="production": quem copiar o template para .env faz o `npm run dev` servir um dist possivelmente inexistente ou desatualizado. O bundle também importa o 'vite' estaticamente (require("vite") na linha 28 do dist/server.cjs), então o Vite é carregado mesmo em produção.
- **Impacto:** Em produção: inicialização lenta, alto uso de CPU e memória, dependência das fontes e do vite.config no servidor. O Vite dev, escutando em 0.0.0.0, entrega o código-fonte e arquivos de src/ (inclusive src/data/*.json com logs de auditoria e hashes de tokens de agentes) a qualquer cliente da rede. Em dev, o comportamento muda silenciosamente conforme o .env.
- **Evidência:** server.ts:252 `if (process.env.NODE_ENV !== "production") { const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });`; package.json:9 `"start": "node dist/server.cjs"`; .env.example:14 `NODE_ENV="production"`; .env local contém `NODE_ENV="development"` (valor não sensível).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-032 · [ALTA] Persistência em arquivos JSON em src/data: depende do cwd, fica fora do dist, não é atômica e reaplica a carga inicial se o arquivo corromper
- **Arquivo:** `server.ts`
- **Localização:** server.ts linha 208 (TOPOLOGY_FILE_PATH) e 222-232; server/cmdbRouter.ts 50-51, 844-854; server/wifiRouter.ts 29-75; server/security/securityOrchestrator.ts 48, 106-155; server/security/pentestControlPlane.ts 21, 36-82; server/security/securityIntegrationBridge.ts 22, 64-80
- **Categoria:** Banco de dados
- **Descrição:** Todo o estado do servidor (CMDB, Security, WiFi, Topologia) é gravado com fs.writeFileSync direto em process.cwd()/src/data, sem arquivo temporário com rename, sem lock e sem backup. O build não copia esses arquivos para o dist, então o servidor só funciona se for iniciado a partir da raiz do repositório e grava na própria árvore de código-fonte. Quando a leitura falha (JSON truncado por uma queda no meio da gravação), securityOrchestrator e wifiRouter regravam a carga inicial (seed) por cima do arquivo.
- **Impacto:** Uma queda ou kill durante a gravação deixa o JSON truncado. No próximo boot, os dados de segurança (achados, auditoria, relatórios) ou de WiFi são substituídos pela carga inicial: perda total e silenciosa. Em container com sistema de arquivos somente leitura ou cwd diferente, as gravações falham apenas com console.error e os dados vivem só em memória. POST /api/topology devolve 500.
- **Evidência:** server.ts:208 `path.join(process.cwd(), "src", "data", "topology_saved.json")`; dist/server.cjs mantém `join(process.cwd(), "src", "data")` (linhas 3123, 7342, 8389, 11437, 14462, 16327); securityOrchestrator.ts:106-111 `catch (e) { console.error('Falha ao ler security_persisted.json...'); } const initial = SecurityOrchestrator.seedInitialData(); SecurityOrchestrator.saveStore(initial);`; wifiRouter.ts:46-60 grava initialStore após erro de leitura; cmdbRouter.ts:847 `fs.writeFileSync(CMDB_PERSIST_FILE, JSON.stringify(store, null, 2))`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-033 · [ALTA] Perda de atualização em cmdb_persisted.json: dois módulos gravam o mesmo arquivo com caches independentes
- **Arquivo:** `server/security/securityIntegrationBridge.ts`
- **Localização:** securityIntegrationBridge.ts 64-80 (saveCmdbTickets), 405-427 (criação de ticket), 469-477 (resolveTicket); server/cmdbRouter.ts 844-854 (saveStore e cache em memória carregado uma única vez), 1705-1712 (GET /cmdb/tickets)
- **Categoria:** Banco de dados
- **Descrição:** O cmdbRouter carrega o store uma única vez (`let store = loadStore()`), lê sempre da memória e, a cada mutação, regrava o arquivo inteiro. O SecurityIntegrationBridge (montado no mesmo processo pelo securityRouter) lê o arquivo do disco, adiciona ou resolve tickets e regrava o arquivo, sem atualizar o cache do cmdbRouter. Se o arquivo não existir, ele grava um store parcial contendo apenas {items, tickets}.
- **Impacto:** Chamados abertos a partir de uma vulnerabilidade (POST /security/findings/:id/ticket) não aparecem em GET /api/v1/cmdb/tickets até reiniciar o servidor. Pior: a próxima gravação qualquer do CMDB (heartbeat de agente, edição de CI, live scan) sobrescreve o arquivo com o cache antigo e apaga esses tickets e suas resoluções. O vínculo achado → chamado fica órfão.
- **Evidência:** cmdbRouter.ts:854 `let store: CMDBStore = loadStore();` (sem outra recarga; grep por `loadStore()` só acha 736/854); cmdbRouter.ts:1708 `let tickets = store.tickets.filter(...)`; securityIntegrationBridge.ts:66-76 `let store: any = { items: INITIAL_CMDB_ITEMS, tickets: INITIAL_CMDB_TICKETS }; if (fs.existsSync(...)) store = JSON.parse(raw); ... store.tickets = [...]; fs.writeFileSync(CMDB_PERSIST_FILE, ...)`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-034 · [ALTA] Segredo HMAC da auditoria com nome divergente: o código sempre usa a chave fixa do fonte
- **Arquivo:** `server/security/securityOrchestrator.ts`
- **Localização:** securityOrchestrator.ts linha 780 (recordAudit); .env.example linha 54; .github/workflows/ci.yml (step de testes); ENVIRONMENT.md linha 28; DEPLOYMENT.md linha 36
- **Categoria:** Segurança
- **Descrição:** O código lê process.env.SECURITY_AUDIT_HMAC_SECRET, com fallback para a string fixa 'workpulse-secret-audit-key'. O .env.example, o ENVIRONMENT.md, o DEPLOYMENT.md e o CI documentam e definem SECURITY_HMAC_SECRET, que nunca é lida. Mesmo seguindo a documentação, o HMAC da trilha de auditoria 'imutável' é calculado com a chave pública embutida no código.
- **Impacto:** Qualquer pessoa com acesso ao código (que também vaza pelo dist/server.cjs.map) pode forjar ou recalcular HMACs válidos e adulterar a trilha de auditoria sem detecção. A garantia de integridade anunciada no README e no health check é falsa.
- **Evidência:** securityOrchestrator.ts:780 `crypto.createHmac('sha256', process.env.SECURITY_AUDIT_HMAC_SECRET \|\| 'workpulse-secret-audit-key')`; ci.yml: `env: SECURITY_HMAC_SECRET: "ci-test-hmac..."`; .env.example:54 `SECURITY_HMAC_SECRET=...`; grep de process.env no projeto não encontra SECURITY_HMAC_SECRET.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-035 · [ALTA] Feed Power BI simulado com números fixos e datasetUrl para rota inexistente
- **Arquivo:** `server.ts`
- **Localização:** server.ts linhas 234-249 (/api/export/powerbi-feed); src/components/AutomatedReportsAndExport.tsx linha 20; src/components/ApiAndIntegrations.tsx linhas 52-65
- **Categoria:** UI não implementada
- **Descrição:** O endpoint, apresentado como feed ao vivo para o Power BI, devolve um objeto literal fixo (148 colaboradores, 81,4% de produtividade, empresa 'WorkPulse Enterprise Corp'). Não consulta Supabase nem nenhum store. O datasetUrl aponta para /api/export/download-csv, que não existe em nenhum router. A tela de Relatórios divulga como endpoint do Power BI uma URL fixa de um ambiente de desenvolvimento do AI Studio (ais-dev-...run.app), e não o servidor da empresa.
- **Impacto:** Dashboards de BI conectados a esse feed mostram indicadores falsos e imutáveis, e decisões gerenciais podem ser tomadas sobre dados fictícios. A importação do dataset CSV falha: em produção o fallback do SPA devolve HTML. Os clientes copiam uma URL de terceiro (AI Studio) em vez da URL da própria instância.
- **Evidência:** server.ts:235-248 `res.json({ ..., companyName: "WorkPulse Enterprise Corp", totalEmployeesTracked: 148, metricsSummary: { avgProductivityPct: 81.4, ... }, datasetUrl: "/api/export/download-csv" })`; grep por 'download-csv' só encontra server.ts:247; AutomatedReportsAndExport.tsx:20 `const powerBiEndpoint = 'https://ais-dev-j5xfxvq46npqvw5wbs7pnc-660100840056.us-west2.run.app/api/export/powerbi-feed';`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-036 · [MÉDIA] Rotas de IA Gemini sem nenhum consumidor; UI anuncia funções de IA inexistentes
- **Arquivo:** `server.ts`
- **Localização:** server.ts linhas 116-163 (/api/ai/insights) e 165-205 (/api/ai/classify-app); src/components/AppClassificationEngine.tsx 465-472; src/data/knowledgeData.ts linha 482
- **Categoria:** Desconectado
- **Descrição:** Nenhum arquivo em src/ chama /api/ai/insights ou /api/ai/classify-app (grep por 'api/ai/', 'insights' e 'classify' em src/ não encontra chamadas). Na classificação de apps, o selo 'IA Gemini' reflete apenas o campo isAiSuggested marcado manualmente no formulário e persistido no Supabase. A ajuda contextual do Dashboard manda o usuário 'Clicar em "Relatório IA"', botão que não existe em nenhum componente. As duas rotas também têm contratos incoerentes: o fallback sem chave devolve {appName, category, reason, confidence: 0.85}, enquanto o caminho Gemini devolve {category, defaultGroup, reason}. O insights usa métricas fixas ('78%', '1,420h') quando o corpo não as traz.
- **Impacto:** Funcionalidade de IA anunciada (relatório executivo e classificação automática) inexistente para o usuário. O usuário segue instruções da base de conhecimento que levam a um botão inexistente. As rotas continuam expostas, sem autenticação, consumindo cota se chamadas por terceiros.
- **Evidência:** Grep `api/ai/\|classify-app\|insights` em src/: zero chamadas; AppClassificationEngine.tsx:88 `const [isAiSuggested, setIsAiSuggested] = useState(false);` (flag manual); knowledgeData.ts:482 `'Clique em "Relatório IA" para obter um resumo analítico gerado via Gemini.'`; grep 'Relatório IA' em src/components: sem resultados; server.ts:134 `${metrics?.productivity \|\| '78%'}`; server.ts:180 `confidence: 0.85`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-037 · [MÉDIA] Prompt injection, saída do Gemini sem validação e ausência de limite de uso nas rotas de IA
- **Arquivo:** `server.ts`
- **Localização:** server.ts linhas 126-150 (insights), 169-201 (classify-app)
- **Categoria:** Segurança
- **Descrição:** Os campos persona, department, period, metrics.*, appName e domain do corpo da requisição são interpolados diretamente no prompt, sem sanitização nem limite de tamanho (body aceita até 10 MB). Em classify-app, a resposta do modelo é repassada ao cliente com JSON.parse(response.text) sem validar se category está entre os valores permitidos. Não há rate limit nem autenticação.
- **Impacto:** Um atacante pode instruir o modelo a devolver categorias arbitrárias ou conteúdo enganoso no relatório executivo, além de gerar custo ilimitado na conta Gemini. Um JSON malformado do modelo gera 500.
- **Evidência:** server.ts:184-186 `Classifique ... para o departamento de ${department \|\| 'Geral'}:\nNome: ${appName}\nDomínio/URL: ${domain \|\| 'N/A'}`; server.ts:201 `res.json(JSON.parse(response.text \|\| '{}'));`; server.ts:33 `app.use(express.json({ limit: '10mb' }));`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-038 · [MÉDIA] Rotas /api inexistentes devolvem index.html com status 200 (sem 404 para a API)
- **Arquivo:** `server.ts`
- **Localização:** server.ts linhas 252-263 (Vite appType 'spa' em dev; app.get('*') em produção)
- **Categoria:** Falha de integração
- **Descrição:** Não há handler 404 para o prefixo /api antes do fallback do SPA. Em produção, app.get('*') devolve dist/index.html para qualquer GET não roteado, inclusive /api/export/download-csv e todas as rotas do catálogo do item seguinte. Em dev, o middleware do Vite com appType 'spa' faz o mesmo fallback HTML.
- **Impacto:** O front recebe HTML com status 200 em vez de 404. O `res.json()` dos componentes lança 'Unexpected token <', o que esconde a causa real (rota inexistente) e dificulta o diagnóstico de integrações quebradas.
- **Evidência:** server.ts:261-263 `app.get("*", (req, res) => { res.sendFile(path.join(distPath, "index.html")); });`; server.ts:255 `appType: "spa"`; nenhum `app.use('/api', ...404)` no arquivo.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-039 · [MÉDIA] Catálogo de API na UI e API.md listam rotas que o servidor não implementa
- **Arquivo:** `src/components/UserRegistration.tsx`
- **Localização:** src/components/UserRegistration.tsx linhas 102-117 (OPERATIONAL_MODULES.endpointRoute) e 167-188 (API_ROUTES_SPEC); API.md linhas 17, 25, 43, 51, 52
- **Categoria:** Falha de integração
- **Descrição:** A tela de Usuários/RBAC apresenta como 'API Endpoints Spec' 20 rotas com 'Bearer Token (JWT)', como /api/v1/dashboard/metrics, /api/v1/users, /api/v1/rbac/matrix, /api/v1/sessions/:id, /api/v1/audit/logs e /api/v1/hr/employees-timecards/punch. Nenhuma existe nos routers (cmdbRouter só tem /cmdb/* e /agent/*, securityRouter só /security/*). O API.md documenta: POST /api/v1/security/scopes (inexistente); /security/observability/metrics (inexistente); /security/tests/run (a rota real é /security/test-suite/run); POST /security/e2e/run (a real é GET); /security/pentest/executions/:id/emergency-stop (a real é /security/pentest/projects/:id/emergency-stop). Também afirma que todas as rotas exigem Bearer JWT, o que não acontece.
- **Impacto:** Integradores (TOTVS, ERP, Power BI) e administradores configuram integrações contra endpoints inexistentes. A matriz RBAC exibida não corresponde a nenhuma aplicação de permissões no backend, o que dá falsa sensação de controle de acesso.
- **Evidência:** UserRegistration.tsx:168 `{ method: 'GET', path: '/api/v1/dashboard/metrics', ..., auth: 'Bearer Token (JWT)' }`; lista completa de rotas extraída de cmdbRouter.ts/securityRouter.ts não contém dashboard/users/rbac/sessions/audit/logs; securityRouter.ts:112 `router.get('/security/test-suite/run'`, :437 `'/security/pentest/projects/:id/emergency-stop'`, :1029 `router.get('/security/e2e/run'`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-040 · [MÉDIA] Health checks devolvem HEALTHY fixo; /api/health/database não testa banco algum
- **Arquivo:** `server/security/securityHealth.ts`
- **Localização:** securityHealth.ts linhas 54-127 (status literais), 92-103 (dbHealth); server.ts linhas 64-114
- **Categoria:** Estabilidade
- **Descrição:** O SecurityHealthService monta todos os componentes com status 'HEALTHY' literal. A única variação é a fila, com DEGRADED se houver mais de 10 itens agendados, e o runner tem um ternário cujos dois ramos dão 'HEALTHY'. O 'database' não faz nenhuma consulta ao Supabase nem verifica leitura e gravação do JSON; a 'latência' é o tempo de cálculo das métricas em memória. OPERATIONS.md e API.md afirmam que /api/health/database verifica a conectividade PostgreSQL/Supabase. Tudo usa só o tenant 'tenant-demo'. Os detalhes (rbacEnforced: true, antiSsrfProtection etc.) são expostos sem autenticação.
- **Impacto:** Monitoramento e orquestradores (load balancer, smoke test do DEPLOYMENT.md) nunca detectam falha de banco, de disco ou de Supabase: incidentes passam despercebidos. Os dados de health declaram controles (RBAC, rate limit) que não existem na API principal.
- **Evidência:** securityHealth.ts:68 `status: runningProjects.length > 0 ? 'HEALTHY' : 'HEALTHY'`; :93-96 `status: 'HEALTHY', ... message: 'Persistência atômica ativa com integridade referencial e HMAC auditável.'`; :124 `rbacEnforced: true`; OPERATIONS.md:8 `/api/health/database: Conectividade do PostgreSQL / Supabase.`
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-041 · [MÉDIA] /api/topology aceita qualquer corpo sem validação; autosave 'último a gravar vence' e toast de sucesso mesmo com erro
- **Arquivo:** `server.ts`
- **Localização:** server.ts linhas 210-232; src/components/InfraTopology.tsx 87 (import estático do JSON), 1318-1363 (load e autosave), 1575-1595 (handleSaveLayout)
- **Categoria:** Regra de negócio
- **Descrição:** O POST /api/topology grava req.body integralmente (até 10 MB) sem schema, sem auth, sem versão e sem controle de concorrência. Cada navegador aberto na Topologia autosalva todo o seu estado 2 s após qualquer mudança. O estado inicial vem do localStorage do navegador ou do JSON embutido no bundle no momento do build. Se o GET demorar ou falhar, a versão local antiga sobrescreve a do servidor. handleSaveLayout chama res.json() sem checar res.ok, e um 500 do servidor ({error}) mostra o toast 'salvos e publicados com sucesso no servidor!'.
- **Impacto:** Edições simultâneas de dois usuários se sobrescrevem silenciosamente. Um navegador com cache antigo pode reverter a topologia publicada. O usuário recebe confirmação de sucesso quando a gravação falhou. Qualquer cliente pode apagar a topologia enviando {}.
- **Evidência:** server.ts:224-226 `const topologyData = req.body; ... fs.writeFileSync(TOPOLOGY_FILE_PATH, JSON.stringify(topologyData, null, 2))`; InfraTopology.tsx:1354-1361 autosave com setTimeout 2000 sem tratamento de resposta; InfraTopology.tsx:1588-1590 `.then(res => res.json()).then(() => { showToast('Layout, ambientes, alas e inventário salvos e publicados com sucesso no servidor!'); })`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-042 · [MÉDIA] Variáveis de ambiente documentadas mas não usadas, usadas mas não documentadas, e PORT ignorada
- **Arquivo:** `.env.example`
- **Localização:** .env.example linhas 16-97; server.ts linha 15 (PORT fixa); vite.config.ts 17-19 (DISABLE_HMR); src/lib/supabaseClient.ts 4-12; DEPLOYMENT.md 30-38; ENVIRONMENT.md 20-33
- **Categoria:** Desconectado
- **Descrição:** Grep de process.env/import.meta.env no projeto (exceto node_modules) acha apenas GEMINI_API_KEY, NODE_ENV, SECURITY_AUDIT_HMAC_SECRET, DISABLE_HMR, VITE_SUPABASE_URL/ANON_KEY e SUPABASE_URL/ANON_KEY. Nunca lidas: PORT (fixa em 3000), APP_URL, SESSION_SECRET, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, DATABASE_URL, AGENT_REGISTRATION_SECRET, AGENT_TOKEN_SECRET, AGENT_WS_ENDPOINT, SECURITY_HMAC_SECRET, REPORT_SIGNING_KEY, todas as BACKUP_* e BACKUP_S3/SMB/SFTP_*, SOC_ALERT_WEBHOOK_URL e LOG_LEVEL. O ENVIRONMENT.md ainda lista como obrigatórias REDIS_URL, SECURITY_ENGINE_URL, SECURITY_ENGINE_API_KEY, SECURITY_RUNNER_AUTH_TOKEN e SECURITY_SAFE_MODE, também inexistentes no código. DISABLE_HMR é usada e não documentada. O DEPLOYMENT.md manda configurar no Vercel só SUPABASE_URL/SUPABASE_ANON_KEY (sem prefixo VITE_). O fallback para process.env no supabaseClient não funciona no navegador, então o front cai em 'https://placeholder.supabase.co'.
- **Impacto:** Operadores configuram segredos que não têm efeito e acreditam ter recursos ativos (assinatura de relatórios, JWT, webhook SOC, Redis) que não existem. Seguir o DEPLOYMENT.md deixa o front sem Supabase (login e cadastros inoperantes). Mudar PORT não muda a porta.
- **Evidência:** server.ts:15 `const PORT = 3000;`; .env.example:16 `PORT=3000`; supabaseClient.ts:6 `(typeof process !== 'undefined' ? process.env?.SUPABASE_URL : '')`; supabaseClient.ts:25 `supabaseUrl \|\| 'https://placeholder.supabase.co'`; DEPLOYMENT.md:32-33 `- SUPABASE_URL - SUPABASE_ANON_KEY`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-043 · [MÉDIA] CSP praticamente nula, frame-ancestors * e cabeçalhos inconsistentes entre Express e Vercel
- **Arquivo:** `server.ts`
- **Localização:** server.ts linhas 20-31; vercel.json linhas 6-35
- **Categoria:** Segurança
- **Descrição:** A CSP do Express permite 'unsafe-inline', 'unsafe-eval', qualquer origem http:/https:, data: e blob: em default-src, e frame-ancestors *. Ela vale igualmente em produção, embora as exceções só sejam necessárias para o Vite dev. Não há X-Frame-Options nem HSTS no Express. O vercel.json faz o oposto: X-Frame-Options SAMEORIGIN e HSTS sem CSP. O X-XSS-Protection está obsoleto.
- **Impacto:** A CSP não mitiga XSS nem carregamento de scripts de terceiros. frame-ancestors * permite embutir o painel administrativo em qualquer site (clickjacking contra ações como aprovar pentest e bloquear agente). Política de segurança diferente conforme o modo de deploy.
- **Evidência:** server.ts:28 `"default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; connect-src 'self' https: http: ws: wss:; frame-ancestors *;"`; vercel.json:15-16 `"key": "X-Frame-Options", "value": "SAMEORIGIN"`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-044 · [MÉDIA] Dados de runtime (auditoria, e-mails, IPs, tokens) versionados no git
- **Arquivo:** `src/data/security_persisted.json`
- **Localização:** src/data/security_persisted.json, src/data/cmdb_persisted.json, src/data/wifi_persisted.json, src/data/topology_saved.json; .gitignore (sem regra para src/data/*_persisted.json)
- **Categoria:** Segurança
- **Descrição:** Os arquivos que o servidor reescreve em tempo de execução estão rastreados pelo git (git ls-files) e mudam junto com commits de funcionalidade: são alterados nos commits a24d51c, 76c3d6d e 841132b. security_persisted.json (cerca de 450 KB) contém 256 auditLogs com actorEmail e ipOrigin, além de um shareToken de relatório (já expirado). cmdb_persisted.json contém agentIdentities com tokenHash, enrollmentTokens e dispositivos descobertos com IP e MAC.
- **Impacto:** Dados pessoais e operacionais (LGPD) e material de autenticação de agentes ficam permanentemente no histórico do repositório. Commits misturam código e estado, com conflitos de merge e risco de publicar dados reais de clientes no GitHub.
- **Evidência:** `git ls-files src/data` lista cmdb_persisted.json, security_persisted.json, topology_saved.json, wifi_persisted.json; `git log -- src/data/security_persisted.json src/data/cmdb_persisted.json` mostra a24d51c, 76c3d6d, 841132b; chaves do JSON: auditLogs:256, shareTokens:1 (campo token presente, valor omitido), cmdb tokenHash x4.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-045 · [MÉDIA] Bundle front-end único de cerca de 4,9 MB sem code splitting
- **Arquivo:** `vite.config.ts`
- **Localização:** vite.config.ts linhas 6-21 (sem build.rollupOptions/manualChunks); src/**/*.tsx (nenhum React.lazy ou import dinâmico)
- **Categoria:** Desempenho
- **Descrição:** Todas as 16 abas (CMDB, Security, WiFi, Topologia, Asset Management etc.) entram num único chunk. O build local existente tem dist/assets/index-*.js com 4.948.741 bytes. Não há React.lazy/import() em nenhum .tsx e o vite.config não define divisão de chunks.
- **Impacto:** Carregamento inicial lento, sobretudo em rede corporativa ou VPN. Qualquer alteração invalida o cache do bundle inteiro.
- **Evidência:** `ls -la dist/assets`: `4948741 index-DNrKHzie.js`; grep `React.lazy\|lazy\(\|import\(` em src/*.tsx: 0 ocorrências.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-046 · [MÉDIA] E/S síncrona de arquivos JSON grandes a cada requisição bloqueia o event loop
- **Arquivo:** `server/security/securityOrchestrator.ts`
- **Localização:** securityOrchestrator.ts 114-155 (saveStore: lê, faz parse e regrava o arquivo inteiro); pentestControlPlane.ts 36-82 (getStoreData/saveStoreData leem do disco a cada chamada); server/cmdbRouter.ts 844-848; server.ts 212-226
- **Categoria:** Desempenho
- **Descrição:** Cada mutação de segurança faz readFileSync, JSON.parse, JSON.stringify e writeFileSync de cerca de 450 KB. O PentestControlPlane relê o arquivo inteiro a cada consulta. Tudo é síncrono no único thread do Node, e o body pode ter até 10 MB.
- **Impacto:** Latência crescente com o volume de auditoria e scans, e travamento de todas as requisições (inclusive heartbeats de agentes) durante gravações. Torna-se DoS trivial por ser sem autenticação.
- **Evidência:** securityOrchestrator.ts:117-119 `if (fs.existsSync(PERSISTED_FILE)) { existing = JSON.parse(fs.readFileSync(PERSISTED_FILE, 'utf-8')); }` seguido de writeFileSync (151); `wc -c src/data/security_persisted.json` = 453033.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-047 · [BAIXA] Vazamento de detalhes internos de erro nas respostas HTTP
- **Arquivo:** `server.ts`
- **Localização:** server.ts linhas 158-161, 203, 230
- **Categoria:** Segurança
- **Descrição:** Os handlers devolvem error.message bruto ao cliente: erros do SDK Gemini (podem conter detalhes de projeto/chave/quota) e erros de fs (contêm o caminho absoluto do servidor, por exemplo EACCES em C:\...\src\data\topology_saved.json).
- **Impacto:** Exposição da estrutura interna do servidor e da configuração do provedor de IA a clientes não autenticados.
- **Evidência:** server.ts:160 `details: error.message`; :203 `res.status(500).json({ error: error.message });`; :230 `res.status(500).json({ error: error.message });`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-048 · [BAIXA] package.json: vite duplicado, dependências de build em dependencies, pacotes sem uso e dois lockfiles
- **Arquivo:** `package.json`
- **Localização:** package.json linhas 2-3, 16-48; bun.lock e package-lock.json na raiz
- **Categoria:** Duplicado / obsoleto
- **Descrição:** O 'vite' ^6.2.3 aparece em dependencies e em devDependencies. @vitejs/plugin-react, @tailwindcss/vite e @types/ws (só build/tipos) estão em dependencies. fflate e fzstd não são importados em nenhum arquivo. autoprefixer não é usado (não há postcss.config e o Tailwind v4 usa o plugin Vite). O pacote se chama 'react-example' versão 0.0.0. Coexistem bun.lock e package-lock.json; o CI usa `npm ci \|\| npm install`, que mascara divergências do lock.
- **Impacto:** Instalação de produção maior e mais lenta, superfície de dependências desnecessária, resoluções divergentes entre bun e npm e identificação incorreta do pacote.
- **Evidência:** package.json:36 e :48 `"vite": "^6.2.3"`; grep 'fflate\|fzstd' só encontra package.json e lockfiles; grep 'autoprefixer' só encontra package.json; package.json:2 `"name": "react-example"`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-049 · [BAIXA] Scripts clean e preview inadequados
- **Arquivo:** `package.json`
- **Localização:** package.json linhas 10-11
- **Categoria:** Bug / código incompleto
- **Descrição:** 'clean' usa `rm -rf`, indisponível no cmd.exe, que é o shell padrão do npm no Windows (plataforma deste projeto). O script também remove 'server.js', artefato que não existe mais: o build gera dist/server.cjs. 'preview' (vite preview) serve só o SPA estático, sem o Express: todas as chamadas /api falham, e ainda publica dist/server.cjs e o .map.
- **Impacto:** `npm run clean` falha no Windows. `npm run preview` dá uma visão quebrada da aplicação e expõe o bundle do servidor.
- **Evidência:** package.json:11 `"clean": "rm -rf dist server.js"`; package.json:8 o build gera `--outfile=dist/server.cjs`; package.json:10 `"preview": "vite preview"`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-050 · [BAIXA] Resíduos do Google AI Studio e assets duplicados
- **Arquivo:** `metadata.json`
- **Localização:** metadata.json (arquivo inteiro); server.ts linhas 51-55 (User-Agent 'aistudio-build'); vite.config.ts linhas 15-19 (comentário DISABLE_HMR com 'modifyâfile' corrompido); public/anectta-avatar.png, public/anectta-logo.jpg, public/anectta-logo.png
- **Categoria:** Duplicado / obsoleto
- **Descrição:** O metadata.json (requestFramePermissions/majorCapabilities) só serve à plataforma AI Studio. O cliente Gemini envia User-Agent 'aistudio-build'. O vite.config tem comentário de ambiente AI Studio com encoding corrompido. Em public/, os três arquivos de imagem são o mesmo JPEG (sha256 idêntico, assinatura FF D8 FF E0): os .png são JPEG com extensão errada. Só anectta-logo.png é referenciado (App.tsx, Sidebar.tsx, LoginPage.tsx, mockData.ts).
- **Impacto:** Ruído de manutenção, cerca de 500 KB de assets redundantes copiados para o dist e Content-Type incorreto (image/png para conteúdo JPEG).
- **Evidência:** server.ts:53 `'User-Agent': 'aistudio-build'`; vite.config.ts:16 `// Do not modifyâfile watching is disabled`; `sha256sum public/*` → os três arquivos com `dafe152ad53f2eac...`; `od` de anectta-logo.jpg: `ff d8 ff e0`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-051 · [BAIXA] Inicialização sem tratamento de erro e sem desligamento gracioso
- **Arquivo:** `server.ts`
- **Localização:** server.ts linhas 251-271
- **Categoria:** Estabilidade
- **Descrição:** startServer() é chamada sem .catch. Uma falha em createViteServer vira rejeição não tratada, e erros de app.listen (por exemplo EADDRINUSE na porta fixa 3000) não têm handler. Não há tratamento de SIGTERM/SIGINT para concluir gravações dos stores JSON antes de encerrar.
- **Impacto:** Falhas de boot com mensagens pouco claras. Um encerramento durante writeFileSync pode deixar JSON truncado, o que leva ao reseed descrito no achado de persistência.
- **Evidência:** server.ts:271 `startServer();` sem catch; server.ts:266 `app.listen(PORT, "0.0.0.0", () => {...})` sem `.on('error')`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-052 · [BAIXA] tsconfig permissivo: sem strict, sem include/exclude
- **Arquivo:** `tsconfig.json`
- **Localização:** tsconfig.json linhas 2-25
- **Categoria:** Duplicado / obsoleto
- **Descrição:** Sem 'strict' e sem 'noImplicitAny', com allowJs ativo e sem include/exclude explícitos. O `tsc --noEmit` (script lint, usado como gate no CI) passa com 0 erros, mas deixa passar null/undefined e any implícitos. Por isso há casts como `(import.meta as any).env` no supabaseClient, em vez de tipar com vite/client.
- **Impacto:** O gate de qualidade do CI tem baixo poder de detecção, e bugs de nulidade e contrato entre módulos só aparecem em tempo de execução.
- **Evidência:** tsconfig.json não contém 'strict'; supabaseClient.ts:5 `(import.meta as any).env?.VITE_SUPABASE_URL`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

### 6.3 Banco de dados Supabase (schema, RLS, seeds, serviços)

_Forma de exame: Agente (leitura integral) — 23 achados._

> **Estado do módulo:** A fatia de banco Supabase tem um schema extenso, com 36 tabelas: 10 de negócio, 15 de Security/Pentest e 11 de Backup. Na prática, o código usa muito pouco desse schema. Só 4 tabelas são lidas pelo front (employees, app_classification_rules, site_block_rules e it_assets, todas em App.tsx/loadSupabaseData), e system_users aparece apenas num UPDATE que não tem efeito. O servidor Express, o backup-engine e o módulo de segurança não têm nenhum cliente de banco: a persistência real fica em localStorage e em arquivos *_persisted.json. Mesmo nas 4 tabelas usadas, a integração só funciona em uma direção. Os services de upsert/delete individuais são importados mas nunca chamados, então nenhuma criação, edição ou exclusão feita na UI chega ao Supabase. Pior: a cada login ou renovação de token o estado remoto antigo sobrescreve o localStorage, o que causa perda de dados. A segurança do banco tem problemas graves. O trigger handle_new_user cria todo novo usuário do Auth como ADMIN_GERAL e aceita access_level vindo de metadados controlados pelo próprio usuário. Além disso, todas as tabelas de negócio têm RLS 'USING (true)' para qualquer autenticado, inclusive system_users, o que permite escalada de privilégio. Por fim, current_tenant_id() aceita tenant_id de user_metadata, que é editável pelo usuário. O DDL está triplicado (migrations/, MIGRATION_UNICA_COMPLETA.sql e server/security/supabase_schema_rls.sql), e as migrations não são idempotentes. A documentação de migração omite a migration core e o trigger/seed. Os seeds trazem valores incompatíveis com o domínio do front (pc_lock_status, 'Geral' em vez de 'Todas as Áreas', categorias e salas inexistentes). O mapeamento de ativos (assets.service) descarta a maioria dos campos do ITAsset. Os scripts de verificação têm credenciais embutidas e criam conta ADMIN_GERAL via signUp. O health check de banco do servidor é fixo em HEALTHY e nunca consulta o Supabase. Prioridades: (1) desligar ou corrigir o trigger e as políticas RLS permissivas; (2) ligar os upserts/deletes da UI e parar de sobrescrever o estado local; (3) consolidar o schema numa única fonte de migrations; (4) decidir se as tabelas de Security/Backup serão integradas ou removidas.

#### A-053 · [CRÍTICA] Edições da UI nunca são gravadas no Supabase e são sobrescritas pelo estado remoto (perda de dados)
- **Arquivo:** `src/App.tsx`
- **Localização:** Imports nas linhas 10-13 (upsertEmployee, deleteEmployee, upsertAppRule, deleteAppRule, upsertSiteBlock, deleteSiteBlock, upsertAsset, deleteAsset); loadSupabaseData nas linhas 188-239; handlers locais nas linhas 691-725; persistência local nas linhas 487-499; AuxiliaryTablesManager.tsx linhas 205-239; AssetManagement.tsx linhas 220-464
- **Categoria:** Falha de integração
- **Descrição:** Os services de escrita individual são importados, mas não há nenhuma chamada a eles no projeto (grep confirma só as linhas de import). Todos os handlers (adicionar/excluir regra, alternar bloqueio, CRUD de colaboradores e ativos) só alteram o estado React e o localStorage. Já o loadSupabaseData, quando a tabela remota não está vazia, faz setEmployees/setAppRules/setSiteBlocks/setAssets com os dados remotos e regrava o localStorage. Esse carregamento roda sempre que authSession muda, e o onAuthStateChange chama setAuthSession em todo evento, inclusive TOKEN_REFRESHED.
- **Impacto:** Qualquer cadastro, edição ou exclusão de colaboradores, regras de classificação, bloqueios de site e ativos se perde no próximo login ou renovação de token (cerca de 1 h): os dados voltam ao conteúdo antigo do Supabase. Usuários em PCs diferentes veem dados divergentes, e o Supabase nunca reflete a operação real.
- **Evidência:** App.tsx:10 `import { fetchEmployees, upsertEmployees, upsertEmployee, deleteEmployee }` sem nenhum uso de upsertEmployee/deleteEmployee. App.tsx:196-198 `if (sbEmployees.length > 0) { setEmployees(sbEmployees); localStorage.setItem('wp_employees', JSON.stringify(sbEmployees)); }`. App.tsx:711-713 `handleDeleteAppRule = (id) => { setAppRules(prev => prev.filter(r => r.id !== id)); }` sem chamada ao service. App.tsx:125-127 `onAuthStateChange((session) => { if (session) { setAuthSession(session);` e 235-239 `useEffect(() => { if (authSession) loadSupabaseData(); }, [authSession, ...])`.
- **Verificação:** CONFIRMADO (conferido manualmente)

#### A-054 · [CRÍTICA] Trigger handle_new_user cria todo usuário como ADMIN_GERAL e aceita nível de acesso vindo do cliente
- **Arquivo:** `supabase/SEED_E_TRIGGERS_PRODUCAO.sql`
- **Localização:** Linhas 7-44 (handle_new_user, on_auth_user_created, UPDATE auth.users); cópias em supabase/MIGRATION_UNICA_COMPLETA.sql linhas 1202-1239 e scripts/generate_complete_seed.cjs linhas 234-271
- **Categoria:** Segurança
- **Descrição:** O trigger AFTER INSERT em auth.users insere em system_users com access_level = COALESCE(raw_user_meta_data->>'access_level', 'ADMIN_GERAL') e role padrão 'Administrador do Sistema'. raw_user_meta_data é o campo options.data do signUp, enviado pelo próprio cliente. Assim, qualquer conta nova é ADMIN_GERAL por padrão, e qualquer pessoa pode escolher o próprio nível. O script ainda confirma em massa todos os e-mails pendentes (UPDATE auth.users SET email_confirmed_at = NOW()), anulando a verificação de e-mail. E o ON CONFLICT (email) DO UPDATE SET auth_user_id religa um registro system_users pré-existente (com o nível dele) ao novo usuário do Auth que tiver o mesmo e-mail.
- **Impacto:** A anon key é pública no bundle Vite. Se o signup do Supabase estiver habilitado (padrão do projeto), qualquer pessoa pode criar uma conta autenticada marcada como ADMIN_GERAL e, com as políticas USING(true), ler e alterar todos os dados de colaboradores, ativos, regras e usuários do sistema. A confirmação em massa também valida contas criadas por terceiros.
- **Evidência:** Linha 23: `COALESCE(NEW.raw_user_meta_data->>'role', 'Administrador do Sistema'),`; linha 24: `COALESCE(NEW.raw_user_meta_data->>'access_level', 'ADMIN_GERAL'),`; linhas 29-31: `ON CONFLICT (email) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id`; linhas 42-44: `UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;`. A exploração depende de o signup estar habilitado no painel do Supabase (não verificável no código).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-055 · [CRÍTICA] RLS permissiva: qualquer autenticado tem CRUD total em todas as tabelas de negócio, incluindo system_users
- **Arquivo:** `supabase/migrations/20260924000000_core_business_tables.sql`
- **Localização:** Linhas 276-334 (20 políticas); mesmas políticas em supabase/MIGRATION_UNICA_COMPLETA.sql linhas 281-359
- **Categoria:** Segurança
- **Descrição:** As 10 tabelas (system_users, employees, activity_logs, app_classification_rules, site_block_rules, pc_lock_policies, it_assets, suppliers, network_speed_tests, timecard_records) têm política 'FOR ALL TO authenticated USING (true) WITH CHECK (true)'. Não há checagem de papel, de dono do registro nem de tenant. Em system_users, isso permite a qualquer usuário alterar o próprio access_level (ou o de outros) para ADMIN_GERAL e excluir usuários. A função get_current_user_role() é definida, mas não é usada em nenhuma política, e a matriz de papéis de DATABASE.md não está implementada. As políticas de leitura 'authenticated_read_*' são redundantes, porque FOR ALL já inclui SELECT.
- **Impacto:** Escalada de privilégio e destruição ou adulteração de dados por qualquer conta autenticada (inclusive as criadas via signup ou pelo script de verificação). Não existe segregação entre RH, gestores e colaboradores (dados LGPD de produtividade e ponto expostos a todos).
- **Evidência:** Linhas 279-280: `CREATE POLICY "authenticated_write_system_users" ON public.system_users FOR ALL TO authenticated USING (true) WITH CHECK (true);`. O comentário da linha 275 admite: `-- Políticas: usuários autenticados podem ler e escrever (multi-tenant futuro: adicionar tenant_id)`. grep de `get_current_user_role()` encontra só as 3 definições, nenhum uso.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-056 · [ALTA] Isolamento multi-tenant contornável: current_tenant_id() lê tenant_id de user_metadata
- **Arquivo:** `supabase/migrations/20260911000000_backup_platform_control_plane.sql`
- **Localização:** Linhas 270-279 (current_tenant_id) e políticas nas linhas 282-348; cópia em supabase/MIGRATION_UNICA_COMPLETA.sql linhas 1104-1194; get_current_tenant_id em 20260910000000_security_pentest_production.sql linhas 342-350
- **Categoria:** Segurança
- **Descrição:** current_tenant_id() faz COALESCE de request.jwt.claim.tenant_id (GUC legado), app_metadata.tenant_id e, por último, user_metadata.tenant_id. O user_metadata pode ser alterado pelo próprio usuário via supabase.auth.updateUser({data:{tenant_id:...}}), então quem não tem app_metadata.tenant_id pode escolher o tenant e passar nas políticas das 11 tabelas de backup. Há ainda duas funções divergentes para a mesma finalidade (get_current_tenant_id, do módulo de segurança, sem user_metadata; current_tenant_id, do backup, com user_metadata). Nada no projeto preenche app_metadata.tenant_id: não há hook nem trigger, e handle_new_user não define tenant. Logo, usuários legítimos não acessariam nenhuma linha. Os identificadores também divergem: o seed usa 'tenant-default' e os stores JSON do módulo de segurança usam 'tenant-demo'. A condição `OR current_user = 'service_role'` é redundante, porque service_role já ignora RLS.
- **Impacto:** Se as tabelas de backup forem conectadas ao front, qualquer autenticado sem tenant em app_metadata pode ler e alterar jobs, destinos (incluindo base_uri e secret_key_ref) e comandos de agentes de outro tenant. Ao mesmo tempo, usuários corretos ficam sem acesso por falta de provisionamento de tenant.
- **Evidência:** Linha 276: `(current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'tenant_id')`. Linhas 282-285: `USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')`. Contagem: 567 ocorrências de `"tenantId": "tenant-demo"` em src/data/security_persisted.json e cmdb_persisted.json, contra `'tenant-default'` no seed (MIGRATION_UNICA linhas 1326-1334).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-057 · [ALTA] 31 das 36 tabelas nunca são usadas pelo código (Security, Backup e parte do core)
- **Arquivo:** `supabase/MIGRATION_UNICA_COMPLETA.sql`
- **Localização:** Tabelas de Security nas linhas 420-707, de Backup nas linhas 846-1054, e activity_logs/pc_lock_policies/suppliers/network_speed_tests/timecard_records nas linhas 78-259
- **Categoria:** Desconectado
- **Descrição:** Os únicos acessos via supabase.from() no código são employees, app_classification_rules, site_block_rules e it_assets (services), mais system_users (sessionSecurity) e security_scopes (testSupabaseConnection, função não usada). server.ts, server/*, src/backup-engine e src/backup-agent não importam o Supabase, e o package.json não tem driver de banco (pg, prisma, knex ou sqlite). As 15 tabelas de Security e as 11 de Backup, além de activity_logs, pc_lock_policies, suppliers, network_speed_tests e timecard_records, não são lidas nem gravadas. O front usa INITIAL_ACTIVITY_LOGS, INITIAL_TIMECARD_RECORDS e localStorage (wp_pcLockPolicies, wp_suppliers), e o módulo de segurança persiste em src/data/security_persisted.json. Mesmo assim, a documentação marca essas tabelas como 'Produção'.
- **Impacto:** O schema 'de produção' não reflete a operação real. Auditoria WORM, HMAC, isolamento por tenant e SLA de remediação existem só no papel. Os dados de ponto, logs de atividade, políticas de bloqueio e fornecedores ficam presos ao navegador ou a arquivos JSON locais, sem backup central nem consistência entre máquinas.
- **Evidência:** grep `\.from\(['\"]` em src/ e server/ retorna apenas os 4 services, sessionSecurity.ts:93 (system_users) e supabaseClient.ts:53 (security_scopes). App.tsx:254 `useState<ActivityLog[]>(INITIAL_ACTIVITY_LOGS)`; App.tsx:258 `useState<TimecardRecord[]>(INITIAL_TIMECARD_RECORDS)`. docs/database.md linhas 19-33 marcam todas como `Produção`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-058 · [ALTA] Login 'master' cria sessão falsa; acesso ao Supabase depende de signIn em segundo plano sem tratamento
- **Arquivo:** `src/components/auth/LoginPage.tsx`
- **Localização:** Linhas 35-75 (handleSubmit); App.tsx linhas 85-99, 125-141 e 188-239
- **Categoria:** Falha de integração
- **Descrição:** O login compara e-mail e senha fixos no código (senha mascarada aqui como ***), dispara `signIn(...).catch(() => {})` sem aguardar e grava em localStorage uma sessão fabricada ('wp-master-anectta-token-...'). Essa sessão não é a sessão do supabase-js (outra chave de storage), então as consultas usam o JWT real só se o signIn em segundo plano der certo. Logo após o login, loadSupabaseData roda como anon: a RLS 'TO authenticated' devolve [] sem erro, o app trata isso como 'tabela vazia' e tenta upsert de mocks, que falha por RLS. Se o usuário não existir em auth.users, ou a senha do Auth for diferente, o app nunca usa o Supabase e o erro é engolido.
- **Impacto:** A integração com o banco é não determinística (condição de corrida) e falha em silêncio. O usuário trabalha só com dados locais sem saber. A credencial fixa no bundle do front também é exposta a qualquer pessoa com acesso ao JS.
- **Evidência:** LoginPage.tsx:35 `if (cleanEmail === 'anectta@anectta.com.br' && password === '***')`; :37 `signIn(cleanEmail, password).catch(() => {});`; :41 `access_token: 'wp-master-anectta-token-' + now`; :60 `localStorage.setItem('wp_auth_local_session', ...)`. App.tsx:199-204: no ramo else de sbEmployees vazio, chama upsertEmployees(localEmployees) sem checar o retorno.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-059 · [ALTA] Script de verificação com credencial fixa cria conta ADMIN_GERAL via signUp
- **Arquivo:** `scripts/verify_authenticated.cjs`
- **Localização:** Linhas 24-47
- **Categoria:** Segurança
- **Descrição:** O script, versionado no git, tem e-mail e senha fixos (audit.tester@workpulse.com.br / ***). Se o login falha, ele faz supabase.auth.signUp com metadata access_level 'ADMIN_GERAL', o que, via trigger handle_new_user, cria em system_users um administrador com senha conhecida no repositório. Com as políticas USING(true), essa conta tem leitura e escrita totais.
- **Impacto:** Se o script tiver sido executado contra o projeto real, existe uma conta administradora com credencial pública no histórico do git, um backdoor persistente.
- **Evidência:** Linhas 24-25: `const email = 'audit.tester@workpulse.com.br'; const password = '***';`. Linhas 31-38: `supabase.auth.signUp({ email, password, options: { data: { ... access_level: 'ADMIN_GERAL' } } })`. Não é possível confirmar pelo código se o script já foi executado.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-060 · [MÉDIA] Semeadura automática de dados fictícios (mocks) no Supabase e seeds 'de produção' com pessoas fictícias
- **Arquivo:** `src/App.tsx`
- **Localização:** Linhas 199-226 (ramos else do loadSupabaseData); supabase/SEED_E_TRIGGERS_PRODUCAO.sql linhas 46-140; services fetch* (employees.service.ts:73-76, appRules.service.ts:38-41, siteBlocks.service.ts:35-38, assets.service.ts:71-74)
- **Categoria:** Regra de negócio
- **Descrição:** Os fetch* devolvem [] tanto quando a tabela está vazia quanto em erro (rede, RLS, tabela inexistente). Nesse caso o App faz upsert do conteúdo local, que é INITIAL_EMPLOYEES/INITIAL_APP_RULES/INITIAL_SITE_BLOCKS/INITIAL_IT_ASSETS (dados de demonstração) se o localStorage estiver vazio. O arquivo 'SEED_E_TRIGGERS_PRODUCAO.sql' também insere 10 colaboradores fictícios (nomes, e-mails, IPs e avatares do Unsplash), ativos e fornecedores fictícios no banco de produção. Isso contradiz o commit 421213e ('eliminate legacy mock accounts').
- **Impacto:** O banco de produção é poluído com colaboradores e ativos inexistentes, que entram nos rankings, KPIs e relatórios de produtividade. Não há como distinguir falha de leitura de tabela vazia.
- **Evidência:** App.tsx:200-204: `// Supabase table is empty — seed it with current localStorage/mock data` / `const localEmployees = safeGetJson('wp_employees', INITIAL_EMPLOYEES); ... await upsertEmployees(localEmployees);`. employees.service.ts:73-76: `if (error) { console.error(...); return []; }`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-061 · [MÉDIA] assets.service descarta a maior parte dos campos do ITAsset e lê colunas inexistentes
- **Arquivo:** `src/services/supabase/assets.service.ts`
- **Localização:** rowToAsset (linhas 8-38) e assetToRow (linhas 40-64)
- **Categoria:** Banco de dados
- **Descrição:** O comentário diz que os campos extras vão para custom_fields, mas assetToRow sempre grava `custom_fields: {}` e rowToAsset nunca lê custom_fields. Ficam fora do round-trip mais de 40 campos do ITAsset (contrato, garantia, localização detalhada, rede MAC/IP, softwares instalados, alterações de hardware, departamento, termo de custódia, agente etc.). rowToAsset lê lifecycle_stage_date, lifecycle_notes, supplier_cnpj, supplier_contact, supplier_email e supplier_phone, colunas que não existem em it_assets e por isso voltam sempre undefined. A coluna `location` existe e é semeada, mas nunca é lida nem gravada (locationDetails não é mapeado). depreciation_method e depreciation_rate nunca são usadas. Datas ausentes viram '' na leitura e voltam como '' para colunas DATE, o que faria o PostgREST rejeitar o lote inteiro.
- **Impacto:** Quando os dados vêm do Supabase (tabela não vazia), o App substitui os ativos locais ricos por versões empobrecidas e regrava o localStorage, perdendo definitivamente contratos, garantias, softwares e vínculos de topologia do inventário ITAM.
- **Evidência:** Linha 62: `custom_fields: {},`; linha 18: `lifecycleStageDate: (row.lifecycle_stage_date as string) \|\| undefined,` (coluna ausente no CREATE TABLE it_assets, MIGRATION_UNICA linhas 157-185); linha 26: `warrantyExpiry: (row.warranty_expiry as string) \|\| '',` combinada com a linha 53 `warranty_expiry: a.warrantyExpiry` (coluna DATE). types.ts linhas 279-383 listam os campos não mapeados.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-062 · [MÉDIA] Seeds com valores fora do domínio do front (status de bloqueio, departamento 'Geral', categorias e salas inexistentes)
- **Arquivo:** `supabase/SEED_E_TRIGGERS_PRODUCAO.sql`
- **Localização:** Linhas 57 e 63 (pc_lock_status); 77-79 e 86-89 ('Geral'); 106-113 (category e room_id); mesmos dados em MIGRATION_UNICA_COMPLETA.sql linhas 1249-1309 e scripts/generate_complete_seed.cjs
- **Categoria:** Banco de dados
- **Descrição:** (a) pc_lock_status 'Bloqueado (Ociosidade)' e 'Bloqueado (Horário de Almoço)' não pertencem ao tipo Employee.pcLockStatus ('Desbloqueado' \| 'Bloqueado Pós-Expediente' \| 'Restrição Fim de Semana'). (b) target_department e blocked_departments usam 'Geral', mas o tipo Department e os mocks do front usam 'Todas as Áreas', que também é o DEFAULT da coluna. (c) As categorias 'hardware_notebook', 'hardware_desktop' e 'hardware_storage' não existem em INITIAL_CATEGORIES (auxiliaryData.ts:144-153). (d) Os room_id 'room_ho', 'room_sales', 'room_rh' e 'room_ti_stock' não existem em INITIAL_ROOMS_ITAM (existem room_office e room_stock). Nenhuma coluna tem CHECK para esses domínios.
- **Impacto:** Os KPIs de estações bloqueadas no Dashboard deixam de contar os colaboradores seedados como bloqueados. As regras 'globais' com 'Geral' não casam com a lógica baseada em 'Todas as Áreas'. Os ativos aparecem sem categoria ou sala resolvida.
- **Evidência:** Seed linha 57: `'Bloqueado (Ociosidade)'`; DashboardOverview.tsx:90 `employees.filter(e => e.pcLockStatus === 'Bloqueado Pós-Expediente')`. Seed linha 86: `'["Geral"]'::jsonb`, contra mockData.ts:361 `blockedDepartments: ['Todas as Áreas']`. Seed linha 107: `'hardware_notebook'` e `'room_ho'`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-063 · [MÉDIA] Tabelas com RLS habilitado e nenhuma política (deny-all)
- **Arquivo:** `supabase/migrations/20260910000000_security_pentest_production.sql`
- **Localização:** ENABLE RLS nas linhas 325-339; políticas só nas linhas 365-398 (repetido em MIGRATION_UNICA linhas 729-811 e server/security/supabase_schema_rls.sql linhas 325-405)
- **Categoria:** Banco de dados
- **Descrição:** security_policies, pentest_executions, pentest_execution_logs, security_scans, accepted_risks, retest_comparisons e report_share_tokens têm RLS habilitado, mas nenhuma CREATE POLICY. Para anon e authenticated, qualquer SELECT, INSERT, UPDATE ou DELETE é negado.
- **Impacto:** Execuções de pentest, logs de execução, scans, riscos aceitos, retestes e tokens de compartilhamento de relatório ficam inacessíveis a qualquer cliente que não seja service_role. Na prática, sem backend com service role, essas partes do módulo não podem ser integradas ao banco.
- **Evidência:** Políticas criadas só para scopes, targets, projects, findings, evidences, remediations, reports e security_audit_logs (linhas 365-398). `ALTER TABLE public.report_share_tokens ENABLE ROW LEVEL SECURITY;` (linha 338) sem política correspondente.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-064 · [MÉDIA] Migrations não idempotentes, conflito com o script único e roteiro de migração incompleto
- **Arquivo:** `docs/migration.md`
- **Localização:** docs/migration.md linhas 41-50; migrations/20260924000000_core_business_tables.sql linhas 276-366; migrations/20260910000000_security_pentest_production.sql linhas 365-398; migrations/20260911000000_backup_platform_control_plane.sql linhas 282-348; DATABASE.md linhas 37-38
- **Categoria:** Banco de dados
- **Descrição:** O roteiro de deploy manda aplicar só 20260910 e 20260911. Ele omite 20260924_core_business_tables (que cria as 4 tabelas usadas pelo front) e o trigger/seed, que existem só em SEED_E_TRIGGERS_PRODUCAO.sql e MIGRATION_UNICA_COMPLETA.sql, fora de migrations/. DATABASE.md cita só uma migration. Os arquivos em migrations/ usam CREATE POLICY e CREATE TRIGGER sem DROP IF EXISTS. Se o banco foi criado com MIGRATION_UNICA_COMPLETA.sql via SQL Editor (como o próprio arquivo instrui), um `supabase db push` posterior reaplica as migrations (o histórico de supabase_migrations estará vazio) e falha com 'policy ... already exists'.
- **Impacto:** Seguindo a documentação, o ambiente fica sem as tabelas de negócio: os services retornam [] e o App tenta semear mocks sem sucesso. A coexistência dos dois caminhos de criação impede o uso do fluxo oficial de migrations.
- **Evidência:** migration.md:49-50 lista apenas `20260910000000_security_pentest_production.sql` e `20260911000000_backup_platform_control_plane.sql`. core_business_tables.sql:276 `CREATE POLICY "authenticated_read_system_users" ON public.system_users` sem DROP prévio; :347 `CREATE TRIGGER trg_system_users_updated_at` sem DROP prévio. MIGRATION_UNICA linha 3: `EXECUTE APENAS ESTE ARQUIVO UMA VEZ NO SQL EDITOR`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-065 · [MÉDIA] Schema DDL triplicado e seed quadruplicado (risco de divergência)
- **Arquivo:** `server/security/supabase_schema_rls.sql`
- **Localização:** Arquivo inteiro (linhas 1-426) é cópia de supabase/migrations/20260910000000_security_pentest_production.sql; MIGRATION_UNICA_COMPLETA.sql linhas 1-1335 concatena as 3 migrations e o seed; seed também em SEED_E_TRIGGERS_PRODUCAO.sql e no gerador scripts/generate_complete_seed.cjs
- **Categoria:** Duplicado / obsoleto
- **Descrição:** O DDL de Security existe idêntico em 3 lugares (server/security/supabase_schema_rls.sql, migrations/20260910 e MIGRATION_UNICA). O DDL core e o de backup existem em 2 lugares, e o seed com o trigger em 3 (gerador, SEED_E_TRIGGERS e MIGRATION_UNICA). As cópias já divergem nos DROP IF EXISTS: em MIGRATION_UNICA eles foram inseridos por fix_sql e nas migrations não. O arquivo em server/security não é referenciado por nenhum código.
- **Impacto:** Qualquer correção (por exemplo nas políticas RLS ou no trigger) tem de ser replicada manualmente em 3 ou 4 arquivos. Esquecer uma cópia reintroduz a falha conforme o arquivo usado para provisionar.
- **Evidência:** server/security/supabase_schema_rls.sql:16-34 é igual a migrations/20260910...:16-34 e a MIGRATION_UNICA:420-438. MIGRATION_UNICA:281 `DROP POLICY IF EXISTS "authenticated_read_system_users"` não existe em core_business_tables.sql:276.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-066 · [MÉDIA] forceGlobalSignOut atualiza system_users depois de revogar a sessão (UPDATE sem efeito)
- **Arquivo:** `src/services/sessionSecurity.ts`
- **Localização:** forceGlobalSignOut, linhas 83-96
- **Categoria:** Falha de integração
- **Descrição:** Primeiro chama supabase.auth.signOut({scope:'global'}), que remove a sessão do cliente, e só depois faz UPDATE em system_users. Sem JWT, a requisição vai como anon, e a RLS de system_users só tem políticas TO authenticated: o UPDATE afeta 0 linhas sem erro. O supabase-js não lança exceção, então o try/catch nunca captura nada. O status 'Revoked' também não pertence ao domínio documentado (Ativo \| Ausente \| Ocioso \| Inativo) e nada no código lê esse campo para bloquear acesso.
- **Impacto:** A 'revogação global' nunca fica registrada no banco. Outras máquinas não são bloqueadas por esse mecanismo, e a auditoria não tem rastro do evento.
- **Evidência:** Linha 85: `await supabase.auth.signOut({ scope: 'global' });`, seguida das linhas 92-95 `await supabase.from('system_users').update({ status: 'Revoked', ... }).eq('email', 'anectta@anectta.com.br');` sem verificação de `error`. Comentário do schema na linha 27 de core_business_tables.sql: `-- Ativo \| Ausente \| Ocioso \| Inativo`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-067 · [MÉDIA] Health check de banco é fixo em HEALTHY e nunca consulta o Supabase
- **Arquivo:** `server/security/securityHealth.ts`
- **Localização:** Linhas 91-103 (dbHealth); exposto por server.ts linhas 64-75 (/api/health/database)
- **Categoria:** UI não implementada
- **Descrição:** O componente 'database' do health é montado com status 'HEALTHY' literal e a mensagem 'Persistência atômica ativa com integridade referencial e HMAC auditável'. A latência é só o tempo de cálculo local. Nenhuma conexão com o Supabase é testada, e testSupabaseConnection (src/lib/supabaseClient.ts) existe mas não é chamada em lugar nenhum.
- **Impacto:** O monitoramento e a UI informam 'banco UP' mesmo com o Supabase fora do ar, mal configurado ou com tabelas ausentes, escondendo a falha de integração descrita nos outros achados.
- **Evidência:** securityHealth.ts:93-96: `const dbHealth: ComponentHealth = { status: 'HEALTHY', latencyMs: dbLatency, message: 'Persistência atômica ativa com integridade referencial e HMAC auditável.',`; :98 `storeType: 'Persistent JSON Store + Supabase Schema Ready'`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-068 · [BAIXA] fix_sql duplicado (.js quebrado em ESM) e não idempotente
- **Arquivo:** `scripts/fix_sql.js`
- **Localização:** Arquivo inteiro (linhas 1-18), idêntico a scripts/fix_sql.cjs; efeito em MIGRATION_UNICA_COMPLETA.sql linhas 827-828 e 1080-1081
- **Categoria:** Duplicado / obsoleto
- **Descrição:** fix_sql.js é cópia exata de fix_sql.cjs, mas o package.json declara "type": "module", então `require` falha em .js (ReferenceError: require is not defined in ES module scope). O script também reescreve a migration no lugar e não é idempotente: insere um DROP antes de todo CREATE POLICY/TRIGGER mesmo quando já existe um. O resultado já aparece no arquivo, com linhas DROP TRIGGER duplicadas.
- **Impacto:** Há um script obsoleto que não executa, e cada nova execução do .cjs acumula DROPs duplicados no arquivo de migration (ruído, sem efeito funcional).
- **Evidência:** fix_sql.js:1 `const fs = require('fs');` com package.json:5 `"type": "module"`. MIGRATION_UNICA:827-828: `DROP TRIGGER IF EXISTS trg_prevent_audit_update_delete ON public.security_audit_logs;` repetido duas vezes; o mesmo nas linhas 1080-1081.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-069 · [BAIXA] Relacionamentos sem FK e domínios sem CHECK
- **Arquivo:** `supabase/migrations/20260924000000_core_business_tables.sql`
- **Localização:** it_assets linhas 152-180 (assigned_employee_id, supplier, room_id); system_users linhas 14-31; backup_jobs.last_execution_id e backup_restore_requests.execution_id (migration 20260911, linhas 64 e 121); security_targets/security_findings linked_asset_id/linked_ci_id (migration 20260910)
- **Categoria:** Banco de dados
- **Descrição:** it_assets.assigned_employee_id não tem FK para employees. supplier é texto livre sem FK para suppliers (e o seed usa nomes diferentes dos de suppliers.name, por exemplo 'Dell Computers Brasil' contra 'Dell Computers Brasil Ltda'). room_id não tem tabela de salas. system_users não tem vínculo com employees, e auth_user_id não é UNIQUE. backup_jobs.last_execution_id e backup_restore_requests.execution_id não referenciam backup_executions. linked_asset_id não referencia it_assets. Colunas de domínio (status, category, work_model, action, pc_lock_status, access_level) são VARCHAR sem CHECK.
- **Impacto:** Permite registros órfãos (ativo atribuído a colaborador excluído, fornecedor inexistente) e valores fora do domínio, como os do seed. Isso enfraquece a integridade e os relatórios.
- **Evidência:** core_business_tables.sql:162 `supplier VARCHAR(255),`; :167 `assigned_employee_id VARCHAR(64),`; :16 `auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,` sem UNIQUE. Seed: supplier 'Dell Computers Brasil' (SEED linha 106) contra suppliers 'Dell Computers Brasil Ltda' (linha 120).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-070 · [BAIXA] Triggers de updated_at ausentes em várias tabelas que têm a coluna
- **Arquivo:** `supabase/migrations/20260924000000_core_business_tables.sql`
- **Localização:** Linhas 347-366 (triggers só em 7 tabelas); timecard_records linhas 235-254; tabelas de Security e Backup com updated_at (security_scopes, security_policies, security_targets, pentest_projects, security_findings, security_remediations, backup_agents, backup_destinations, backup_jobs, backup_restore_requests)
- **Categoria:** Banco de dados
- **Descrição:** handle_updated_at() é aplicada a system_users, employees, app_classification_rules, site_block_rules, pc_lock_policies, it_assets e suppliers. timecard_records e todas as tabelas de Security e Backup com coluna updated_at não têm trigger.
- **Impacto:** updated_at fica congelado na data de criação, o que quebra ordenações e sincronizações incrementais e a auditoria de quando o registro mudou.
- **Evidência:** Lista de CREATE TRIGGER nas linhas 347-366 sem timecard_records. As migrations 20260910 e 20260911 não têm nenhum trigger de updated_at.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-071 · [BAIXA] Colunas de FK sem índice
- **Arquivo:** `supabase/migrations/20260910000000_security_pentest_production.sql`
- **Localização:** Índices nas linhas 309-318; migration 20260911 linhas 226-235; core linhas 182-183
- **Categoria:** Desempenho
- **Descrição:** Não há índice em pentest_executions.project_id, pentest_execution_logs.execution_id, security_remediations.finding_id, accepted_risks.finding_id, retest_comparisons.finding_id, security_scans.scope_id, backup_jobs.destination_id/assigned_agent_id, backup_snapshots.job_id, backup_restore_executions.request_id e it_assets.assigned_employee_id. Com ON DELETE CASCADE ou RESTRICT, cada exclusão no pai exige varredura completa do filho.
- **Impacto:** Junções e exclusões em cascata degradam com o volume (logs de execução e telemetria crescem rápido). O impacto atual é baixo porque as tabelas não são usadas.
- **Evidência:** Índices criados nas linhas 309-318 não incluem `pentest_execution_logs(execution_id)` nem `pentest_executions(project_id)`, embora a linha 118 declare `execution_id ... REFERENCES public.pentest_executions(id) ON DELETE CASCADE`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-072 · [BAIXA] Funções SECURITY DEFINER sem search_path fixo
- **Arquivo:** `supabase/SEED_E_TRIGGERS_PRODUCAO.sql`
- **Localização:** handle_new_user nas linhas 7-34; get_current_tenant_id e get_current_user_role (migration 20260910, linhas 342-362); current_tenant_id (migration 20260911, linhas 270-279)
- **Categoria:** Segurança
- **Descrição:** As funções são SECURITY DEFINER e não declaram `SET search_path = ''` ou `public`. handle_new_user roda com privilégios do dono, disparada por inserts em auth.users. É a recomendação padrão do linter do Supabase (function_search_path_mutable).
- **Impacto:** Abre espaço para sequestro de objetos via search_path caso algum papel consiga criar objetos num schema anterior no caminho. Risco baixo num Supabase padrão, mas é má prática em função privilegiada.
- **Evidência:** SEED linha 34: `$$ LANGUAGE plpgsql SECURITY DEFINER;` sem cláusula SET search_path. Padrão igual nas linhas 350, 362 (20260910) e 279 (20260911).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-073 · [BAIXA] Funções e imports de auth/Supabase sem uso
- **Arquivo:** `src/services/supabase/auth.service.ts`
- **Localização:** AuthState (linhas 4-8), signUp (32-58), getSession (64-67), getCurrentUser (69-72); src/lib/supabaseClient.ts testSupabaseConnection (39-74); src/components/auth/LoginPage.tsx linhas 2-3 (signUp, UserPlus)
- **Categoria:** Desconectado
- **Descrição:** signUp, getSession, getCurrentUser e AuthState não são usados por nenhum componente. LoginPage importa signUp e o ícone UserPlus mas não tem fluxo de cadastro. testSupabaseConnection não é chamada; o health real do servidor é fixo. Junto com as 8 funções de escrita individual (achado principal), metade da superfície dos services é código morto.
- **Impacto:** Confunde a manutenção (parece existir fluxo de cadastro e verificação de conexão) e mantém no bundle um caminho de signUp que, combinado com o trigger, cria administradores.
- **Evidência:** grep de `getSession\|getCurrentUser\|AuthState\|testSupabaseConnection` em src/ retorna só as definições. grep de `signUp\(` retorna só auth.service.ts:38.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-074 · [BAIXA] Documentação de banco descreve recursos inexistentes
- **Arquivo:** `docs/database.md`
- **Localização:** Linhas 6-11 e 17-33; DATABASE.md linhas 23-31
- **Categoria:** Duplicado / obsoleto
- **Descrição:** docs/database.md afirma que todas as tabelas têm tenant_id e RLS 100%, mas as 10 tabelas core não têm tenant_id e usam USING(true). Cita índices que não existem (idx_security_scopes_tenant, idx_security_targets_scope, idx_security_scans_tenant, idx_sec_audit_tenant; os reais são idx_sec_targets_tenant_scope e idx_sec_audit_tenant_created, e não há índice em security_scopes nem em security_scans) e marca todas como 'Produção'. DATABASE.md descreve uma matriz de permissões por papel (SECURITY_ADMIN/OPERATOR/AUDITOR/VIEWER) que nenhuma política implementa.
- **Impacto:** Gera falsa sensação de conformidade (LGPD, ISO 27001, SOC 2) e orienta mal quem for operar ou auditar o banco.
- **Evidência:** docs/database.md:8 `Chave de Segregação Multi-Tenant (tenant_id VARCHAR(64) NOT NULL)`; :30 `security_scopes \| tenant_id \| ATIVO \| idx_security_scopes_tenant`. Não há CREATE INDEX com esse nome em nenhum .sql.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-075 · [BAIXA] check_tables.cjs consulta como anon e reporta contagens enganosas, imprimindo PII
- **Arquivo:** `scripts/check_tables.cjs`
- **Localização:** Linhas 17-20 e 46-76
- **Categoria:** Bug / código incompleto
- **Descrição:** O script cria o cliente com a anon key e não autentica. Como todas as políticas core são TO authenticated e as de tenant dependem de claims, as SELECTs voltam vazias sem erro e o relatório mostra 'Registros: 0' com ✅, como se as tabelas estivessem vazias. Quando há dados visíveis, imprime no console nome e e-mail de todos os system_users.
- **Impacto:** A 'auditoria de dados' produz diagnóstico falso (tabelas vazias quando na verdade estão bloqueadas pela RLS) e expõe dados pessoais em logs.
- **Evidência:** Linha 18: `const key = env.VITE_SUPABASE_ANON_KEY \|\| env.SUPABASE_ANON_KEY;` sem signIn. Linha 74: `users?.forEach(u => console.log(`  👤 ${u.name...} \| Email: ${u.email...}`))`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

### 6.4 Produtividade (dashboard, timeline, classificação, bloqueios, rankings, ociosidade)

_Forma de exame: Agente (leitura integral) — 25 achados._

> **Estado do módulo:** A fatia de produtividade (dashboard, timeline/ponto, monitor de atividade, classificação de apps, bloqueios, rankings, ociosidade, relatórios/BI/integrações) é, na prática, uma camada de apresentação alimentada por dados mock (src/data/mockData.ts) e por uma simulação aleatória. Essa simulação fica ligada por padrão e aparece na interface com o rótulo "Ao Vivo". Nenhuma métrica de produtividade é calculada: productivityScore e as horas são campos estáticos que a simulação altera em ±1 de forma aleatória. As regras de classificação de apps não são aplicadas a nenhum log ou score. Tendência de 7 dias, distribuição horária, comparativo por modelo de trabalho e resumos por departamento estão fixos no código. Bloqueios de sites e travas de PC pós-expediente existem só no front (estado React + localStorage); nenhuma rota do servidor ou do agente distribui essas políticas às estações. A integração com o Supabase serve apenas para carregar e semear os dados: upsertAppRule, deleteAppRule, upsertSiteBlock, deleteSiteBlock, upsertEmployee e deleteEmployee são importados e nunca chamados. Por isso as edições feitas na interface são sobrescritas pelo banco no login seguinte, e dados mock/simulados podem acabar gravados no banco. As tabelas activity_logs, timecard_records e pc_lock_policies existem nas migrations, mas nenhum serviço as lê. Os endpoints /api/ai/insights e /api/ai/classify-app não têm nenhum consumidor no front. Há defeitos concretos de execução: a aba "Ranking por Departamento" derruba a aplicação inteira (toFixed em campo inexistente, sem ErrorBoundary). A tela de Ponto/Trava (WorkdayTimeline) lê campos que não existem nos tipos e mostra apenas valores vazios. A exportação CSV do ranking sai truncada por causa do '#' em data URI. Esses erros passam pelo "tsc --noEmit" porque o projeto não tem @types/react: React.FC vira any e a checagem das props dos componentes fica desativada, então "0 erros de tipo" não garante nada. Na lógica de alertas de ociosidade, "Desativar" não silencia o colaborador quando o alerta global está ativo, e "Alterar limite" de um colaborador altera o limite global. Três componentes (ApiAndIntegrations, AutomatedReportsAndExport, CustomBIAndPersonas) estão órfãos, removidos do roteamento. O mockData.ts traz a senha do administrador em texto claro, que também é gravada no localStorage.

#### A-076 · [CRÍTICA] Senha do administrador em texto claro no código e persistida no localStorage
- **Arquivo:** `src/data/mockData.ts`
- **Localização:** mockData.ts:12-27 (SYSTEM_USERS, campo password linha 25); consumo em src/App.tsx:326-348 (wp_users_list_v2 e wp_currentUser)
- **Categoria:** Segurança
- **Descrição:** O único usuário administrador do sistema (anectta@anectta.com.br, ADMIN_GERAL) está declarado no bundle do front com a senha em texto claro. Na inicialização, o App grava SYSTEM_USERS inteiro (com a senha) em localStorage 'wp_users_list_v2' e o primeiro usuário em 'wp_currentUser'.
- **Impacto:** Qualquer pessoa com acesso ao bundle JS (DevTools, arquivos da aplicação desktop) ou ao localStorage obtém a credencial de administrador geral. A senha também entra nos snapshots de backup que leem o localStorage.
- **Evidência:** mockData.ts:25 `password: '***'` dentro de SYSTEM_USERS (accessLevel 'ADMIN_GERAL'); App.tsx:330 `localStorage.setItem('wp_users_list_v2', JSON.stringify(SYSTEM_USERS));` e App.tsx:345 `localStorage.setItem('wp_currentUser', JSON.stringify(SYSTEM_USERS[0]));`. A mesma senha literal é comparada em src/components/auth/LoginPage.tsx:35.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-077 · [CRÍTICA] Edições de regras, bloqueios e colaboradores nunca vão para o Supabase e são sobrescritas no login seguinte
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:10-13 (imports não usados), 188-239 (loadSupabaseData), 691-725 (handlers handleToggleBlock, handleAddBlockRule, handleAddAppRule, handleDeleteAppRule, handleUpdateAppRuleCategory, handleUpdateAppRule, handleResetAppRules), 486-500 (persistência só em localStorage)
- **Categoria:** Falha de integração
- **Descrição:** Os handlers de mutação alteram apenas o estado React e o localStorage. As funções de escrita dos serviços (upsertAppRule, deleteAppRule, upsertSiteBlock, deleteSiteBlock, upsertEmployee, deleteEmployee, upsertAsset, deleteAsset) são importadas e nunca chamadas. Com sessão ativa, loadSupabaseData faz setAppRules/setSiteBlocks/setEmployees com o conteúdo do banco sempre que ele não está vazio, o que descarta as alterações locais.
- **Impacto:** Regras de classificação criadas, editadas ou excluídas, bloqueios criados ou desativados e mudanças de colaboradores se perdem a cada novo login ou recarga com sessão. Regras excluídas reaparecem. Cada máquina/usuário passa a ter uma visão diferente dos dados.
- **Evidência:** App.tsx:11 `import { fetchAppRules, upsertAppRules, upsertAppRule, deleteAppRule } ...`. Grep por 'upsertAppRule(' / 'deleteAppRule(' / 'upsertSiteBlock(' em App.tsx só encontra os imports. App.tsx:206-208 `if (sbAppRules.length > 0) { setAppRules(sbAppRules); localStorage.setItem('wp_appRules', ...)`. App.tsx:708 `setAppRules(prev => [newRule, ...prev]);` não tem chamada ao serviço.
- **Verificação:** CONFIRMADO (conferido manualmente)

#### A-078 · [ALTA] Seed automático grava dados mock/simulados no banco e pode sobrescrever registros reais quando o fetch falha
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:196-226 (loadSupabaseData, ramos else); src/services/supabase/employees.service.ts:68-78, appRules.service.ts:33-43, siteBlocks.service.ts:30-40
- **Categoria:** Banco de dados
- **Descrição:** Quando o fetch retorna lista vazia, o App faz upsert do conteúdo do localStorage, cujo padrão são INITIAL_EMPLOYEES, INITIAL_APP_RULES e INITIAL_SITE_BLOCKS (dados fictícios, já alterados pela simulação aleatória). Os serviços também devolvem [] em caso de erro (rede, RLS de SELECT, timeout). Assim, uma falha transitória de leitura é tratada como 'tabela vazia', e o upsert com onConflict:'id' sobrescreve as linhas existentes com a cópia local desatualizada.
- **Impacto:** Colaboradores fictícios (ex.: 'Lucas Gabriel Rocha', score 54) e scores aleatórios entram na tabela employees de produção. Em falha de leitura, dados reais do banco podem ser substituídos por versões antigas do localStorage.
- **Evidência:** employees.service.ts:73-76 `if (error) { console.error(...); return []; }`; App.tsx:199-204 `} else { // Supabase table is empty — seed it with current localStorage/mock data ... await upsertEmployees(localEmployees);`; upsert usa `{ onConflict: 'id' }` (employees.service.ts:95).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-079 · [ALTA] Simulação aleatória ligada por padrão e rotulada 'Ao Vivo' altera colaboradores e gera alertas de ociosidade falsos
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:364-367 (isSimulating padrão true), 603-638 (efeito de simulação), 534 (idleMins aleatório); src/components/PageHeaderCard.tsx:333-344
- **Categoria:** UI não implementada
- **Descrição:** Com isSimulating=true por padrão, a cada 5 s o App troca currentApp por um app aleatório, altera productivityScore em ±1 e, com 15% de chance, dispara um alerta de ociosidade para um colaborador aleatório, com minutos de inatividade também aleatórios. O botão que liga e desliga isso aparece como 'Ao Vivo'. Os dados alterados são gravados em localStorage 'wp_employees' e se misturam aos dados vindos do Supabase.
- **Impacto:** Gestores veem scores, apps em uso e alertas de ociosidade inventados, apresentados como monitoramento em tempo real. Isso pode embasar decisões disciplinares erradas (risco trabalhista/LGPD). Os dados aleatórios ainda podem ser semeados no banco (ver achado de seed).
- **Evidência:** App.tsx:366 `return saved !== null ? saved === 'true' : true;`; App.tsx:609-613 `if (Math.random() < 0.15) { ... triggerIdleToastForEmployee(randomEmp); }`; App.tsx:631 `productivityScore: Math.max(40, Math.min(99, emp.productivityScore + (Math.random() > 0.5 ? 1 : -1)))`; PageHeaderCard.tsx:343 `{isSimulating ? 'Ao Vivo' : 'Pausado'}`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-080 · [ALTA] Aba 'Ranking por Departamento' derruba a aplicação (toFixed em campo inexistente)
- **Arquivo:** `src/components/ProductivityRankings.tsx`
- **Localização:** ProductivityRankings.tsx:213-241 (bloco rankingType === 'department'), linhas 232 e 236
- **Categoria:** Bug / código incompleto
- **Descrição:** O componente lê dept.employeeCount e dept.totalProductiveHours, que não existem em DepartmentSummary (os campos reais são totalEmployees, productiveHoursPct etc.). dept.totalProductiveHours é undefined, e a chamada .toFixed(1) lança TypeError no render. Não existe ErrorBoundary no projeto.
- **Impacto:** Ao clicar em 'Ranking por Departamento', a árvore React inteira é desmontada (tela em branco) até a página ser recarregada. A funcionalidade fica inacessível.
- **Evidência:** Linha 236 `{dept.totalProductiveHours.toFixed(1)}h`; linha 232 `{dept.employeeCount} Colaboradores`; types.ts:115-123 DepartmentSummary = { department, totalEmployees, avgProductivityScore, productiveHoursPct, idleHoursPct, unproductiveHoursPct, topApp }. Grep 'ErrorBoundary\|componentDidCatch' em src não encontra nada.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-081 · [ALTA] WorkdayTimeline e a exportação de ponto usam campos inexistentes: tabela, inspetor, CSV e políticas de trava mostram vazio/undefined
- **Arquivo:** `src/components/WorkdayTimeline.tsx`
- **Localização:** WorkdayTimeline.tsx:113-135, 158-180, 186-196 (TimecardRecord); 231-258 (PCLockPolicy); src/App.tsx:745-766 (ação primária da aba workday)
- **Categoria:** Bug / código incompleto
- **Descrição:** A tela lê rec.sourceSystem, clockIn, clockOut, activePCHours, correlationScore, anomalyDetected e anomalyType, mas TimecardRecord define systemSource, pontoPunchIn, pontoPunchOut, agentActiveWorkedHours, correlationPct, hasAnomaly e anomalyReason. As políticas de trava leem pol.department, enabled, lockStartTime e customLockMessage, mas PCLockPolicy define targetDepartment, active, cutoffTime e lockMessage.
- **Impacto:** Toda a correlação Ponto x PC aparece vazia ('undefined - undefined', 'undefined% MATCH'). A anomalia sempre aparece como 'Normal', mesmo no registro com hasAnomaly=true. O botão de trava mostra sempre 'PAUSADO' (pol.enabled undefined) mesmo com a política ativa. O campo de mensagem fica não controlado (value undefined) e não reflete a mensagem salva. Os CSVs de dossiê e de espelho consolidado são exportados com 'undefined'.
- **Evidência:** Linha 113 `{rec.sourceSystem}` vs types.ts:110 `systemSource`; linha 128 `rec.anomalyDetected` vs types.ts:111 `hasAnomaly`; linha 235 `pol.enabled ?` vs types.ts:94 `active`; linha 257 `value={pol.customLockMessage}` vs types.ts:93 `lockMessage`; App.tsx:750-754 usa os mesmos nomes errados.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-082 · [ALTA] Sem @types/react, a checagem das props dos componentes fica desativada e o 'tsc 0 erros' não garante nada
- **Arquivo:** `package.json`
- **Localização:** package.json (dependências: react ^19.0.1 sem @types/react / @types/react-dom); tsconfig.json (sem strict/noImplicitAny)
- **Categoria:** Estabilidade
- **Descrição:** node_modules/@types não contém react nem react-dom, e o pacote react 19 não traz .d.ts. Sem noImplicitAny, 'react' é resolvido como any, então React.FC<Props> vira any e todas as props dos componentes ficam tipadas como any. Rodei 'tsc --noEmit' localmente (somente leitura): saída vazia e exit 0, embora WorkdayTimeline acesse rec.sourceSystem, que não existe em TimecardRecord.
- **Impacto:** Erros de contrato entre componentes e tipos (vários confirmados nesta fatia: WorkdayTimeline, ProductivityRankings, ActivityMonitoring) passam despercebidos e chegam à execução como telas vazias ou crashes. A linha de base de qualidade é ilusória.
- **Evidência:** `ls node_modules/@types/` lista express, node, ws, d3-*, mas não react; `grep @types package.json` → apenas @types/ws, @types/express, @types/node, @types/ssh2. tsc --noEmit exit=0 com 0 linhas de saída, apesar de WorkdayTimeline.tsx:113 `rec.sourceSystem`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-083 · [ALTA] Regras de classificação de apps não são aplicadas a nada; score de produtividade não é calculado
- **Arquivo:** `src/components/AppClassificationEngine.tsx`
- **Localização:** AppClassificationEngine.tsx:520 (texto 'Regras sincronizadas instantaneamente com o agente local'); src/App.tsx:255, 980 (appRules só é passado a este componente); src/data/mockData.ts:256-353
- **Categoria:** Desconectado
- **Descrição:** appRules é consumido apenas pela própria tela de cadastro e pelo backup. Nenhum código cruza regras com activityLogs ou employees, e a categoria dos logs vem fixa no mock. productivityScore não é derivado das horas produtivas/trabalhadas em nenhum ponto: é um valor armazenado que só muda pela simulação aleatória. O mock contradiz as regras: o log 'Instagram' aparece como Produtivo, mas a regra rule-6 diz Improdutivo para 'Todas as Áreas'; o log de YouTube aparece como Improdutivo, mas a rule-7 diz Neutro.
- **Impacto:** O 'Motor de Classificação' é decorativo. Mudar uma categoria não afeta score, ranking, dashboard nem alertas, o que contraria o que a interface promete ('Soma como tempo ativo focado', 'Gera alertas de distração', 'Não penaliza o score').
- **Evidência:** Grep 'appRules' em src: só aparece em App.tsx (estado/localStorage/props do engine) e em backupManager.ts. mockData.ts:318-321 log-5 Instagram `category: 'Produtivo'` vs mockData.ts:348 rule-6 Instagram `category: 'Improdutivo'`. Nenhum cálculo do tipo `productiveHoursToday /` existe em src.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-084 · [ALTA] Bloqueio de sites e trava de PC pós-expediente existem só no front; nenhuma política chega ao agente
- **Arquivo:** `src/components/SiteAndStationBlocking.tsx`
- **Localização:** SiteAndStationBlocking.tsx:44-62 (handleCreateRule), 159 ('Ativas no agente local em todas as estações'), 217-255 (prévia com dados fixos); src/components/WorkdayTimeline.tsx:221-224; src/App.tsx:691-705
- **Categoria:** UI não implementada
- **Descrição:** Criar ou alternar bloqueios e políticas de trava altera apenas o estado React e o localStorage. Nenhuma rota do servidor (cmdbRouter, securityRouter, wifiRouter) nem código de agente em src/backup-agent lê site_block_rules ou pc_lock_policies. As únicas ocorrências de 'block' no cmdbRouter tratam do bloqueio administrativo do próprio agente. A tela também não permite excluir nem editar uma regra, força blockedDepartments=['Todas as Áreas'] e todos os modelos de trabalho, e não valida os domínios. A prévia do bloqueio usa valores fixos (facebook.com, PC-ENG-001, WP-BLK-882910).
- **Impacto:** O gestor acredita que sites estão bloqueados e que estações travam após o expediente ('Prevenção de Passivo CLT'), mas nada é aplicado nas máquinas. Isso gera risco de compliance e falsa sensação de controle.
- **Evidência:** SiteAndStationBlocking.tsx:53-54 `blockedDepartments: ['Todas as Áreas'], workModels: ['Presencial', 'Home Office', 'Híbrido']`; linha 159 `Ativas no agente local em todas as estações corporativas`; grep 'block\|lockPolic\|classif' em server/cmdbRouter.ts → só /agent/devices/:agentId/block (linhas 2260-2293).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-085 · [ALTA] Endpoints /api/ai/insights e /api/ai/classify-app sem consumidor; contrato de resposta inconsistente
- **Arquivo:** `server.ts`
- **Localização:** server.ts:117-163 (/api/ai/insights), 166-205 (/api/ai/classify-app); src/components/AppClassificationEngine.tsx:88, 466-469 (isAiSuggested / badge 'IA Gemini')
- **Categoria:** Desconectado
- **Descrição:** Nenhum arquivo do front chama /api/ai/insights nem /api/ai/classify-app. O AppClassificationEngine exibe o badge 'IA Gemini' para regras com isAiSuggested, mas nenhum fluxo de UI define isAiSuggested=true: setIsAiSuggested só é chamado em resetForm(false) e openEditModal(valor existente). O contrato do classify-app também diverge do modelo de regra: o ramo Gemini devolve {category, defaultGroup, reason}, o fallback devolve {appName, category, reason, confidence}, e AppClassificationRule usa groupName. Os valores de defaultGroup ('Gestão/ERP', 'Entretenimento') não coincidem com COMMON_GROUPS do front.
- **Impacto:** A funcionalidade de IA anunciada (classificação sugerida e insights executivos) é inalcançável. Um futuro consumidor teria de tratar dois formatos de resposta diferentes.
- **Evidência:** Grep '/api/ai\|classify-app' fora de node_modules só encontra server.ts:117 e server.ts:166. server.ts:176-181 fallback `{ appName, category, reason, confidence: 0.85 }` vs prompt server.ts:188-191 `category, defaultGroup, reason`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-086 · [ALTA] Dashboard e Rankings exibem métricas fabricadas/fixas como se fossem históricas e em tempo real
- **Arquivo:** `src/components/DashboardOverview.tsx`
- **Localização:** DashboardOverview.tsx:93-115 (tendência 7 dias), 136 ('+3.4% vs ontem'), 190 (barra 22%), 237 ('Score Real'), 302-303, 322-329 (faixa horária), 366-433 (modelo de trabalho); ProductivityRankings.tsx:244-248 (comparativo híbrido); mockData.ts:467-474 (DEPARTMENT_SUMMARIES)
- **Categoria:** UI não implementada
- **Descrição:** A tendência de 7 dias é gerada a partir do score médio atual somado a um vetor fixo [-5,-2,-6,2,-1,3,0], mas aparece como 'Score Real' / 'Histórico Operacional' e 'Atualizado automaticamente em tempo real'. Variação diária, distribuição por faixa horária, cards por modelo de trabalho (3/2/3 colaboradores, 88%/81%/89%) e 'Híbrido +8% vs Média' estão fixos no código e ignoram filtros e dados. O ranking por modelo repete os mesmos números fixos. O ranking por departamento usa DEPARTMENT_SUMMARIES estático (ex.: 42 colaboradores em Engenharia), sem relação com employees nem com filtros. A prop departmentSummaries do Dashboard nem é usada. O badge 'Variação Semanal' fica verde mesmo quando o valor é negativo.
- **Impacto:** Indicadores executivos enganosos: diretoria e RH tomam decisões com base em números que não refletem nenhuma medição. Não existe armazenamento de histórico (a tabela employees só tem colunas *_today, sem data) que permita calcular uma tendência real.
- **Evidência:** DashboardOverview.tsx:95 `const variations = [-5, -2, -6, 2, -1, 3, 0];`; linha 136 `+3.4% vs ontem`; linha 190 `style={{ width: '22%' }}`; linha 376 `3 Colaboradores`; ProductivityRankings.tsx:245 `{ model: 'Home Office', score: 88, hours: '6.8h', count: 3 ...}`; migration employees: `productive_hours_today NUMERIC(5,2)` sem coluna de data.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-087 · [ALTA] 'Desativar' alerta individual não é respeitado quando o alerta global está ativo
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:295-297, 311-316 (override), 528-532 (triggerIdleToastForEmployee), 660-665 (handleDisableAlert); src/components/ActivityMonitoring.tsx:122, 151-166; src/components/IdleAlertsDrawer.tsx:246-255; src/components/IdleToastNotifications.tsx:81-89
- **Categoria:** Regra de negócio
- **Descrição:** handleDisableAlert grava individualAlertOverrides[emp]=false e avisa 'Monitoramento de alertas desativado'. Porém triggerIdleToastForEmployee só usa o override como habilitação forçada (=== true) e só bloqueia o alerta quando o global está desligado e o override não é true. Com o global ligado (padrão), um override false é ignorado. Além disso, o sino do ActivityMonitoring alterna !prev[id] (undefined→true→false), então o primeiro clique não silencia nada: só muda de 'não definido' para 'forçado'.
- **Impacto:** O gestor desativa os alertas de um colaborador e continua recebendo alertas dele. A interface afirma o contrário, o que fere a confiança e possíveis acordos de privacidade/LGPD.
- **Evidência:** App.tsx:528-532 `const isIndividualActive = individualAlertOverrides[emp.id] === true; const isGloballyActive = isIdleAlertsEnabled; if (!customMinutes && !isGloballyActive && !isIndividualActive) return;` — não existe verificação de `=== false`. App.tsx:661 `setIndividualAlertOverrides(prev => ({ ...prev, [employeeId]: false }));`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-088 · [MÉDIA] Endpoints de IA e de feed BI sem autenticação, com prompt injection e feed estático com URL inexistente
- **Arquivo:** `server.ts`
- **Localização:** server.ts:117-163, 166-205, 235-249
- **Categoria:** Segurança
- **Descrição:** /api/ai/insights e /api/ai/classify-app não exigem autenticação nem limite de taxa e interpolam campos do body (persona, department, appName, domain) diretamente no prompt. O classify-app faz JSON.parse da saída do modelo sem validação e devolve 500 com error.message. /api/export/powerbi-feed, apresentado como feed para Power BI, devolve números fixos (148 colaboradores, 81.4%) e aponta datasetUrl para '/api/export/download-csv', rota que não existe.
- **Impacto:** Qualquer cliente que alcance a porta 3000 pode consumir a cota/custo da chave Gemini e manipular o prompt. O feed BI entrega dados falsos a relatórios externos e a URL de dataset retorna 404.
- **Evidência:** server.ts:126 `const { department, persona, metrics, period } = req.body;` sem verificação de token; server.ts:201 `res.json(JSON.parse(response.text \|\| '{}'));`; server.ts:239-247 valores literais e `datasetUrl: "/api/export/download-csv"`; grep 'download-csv' só encontra server.ts:247.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-089 · [MÉDIA] Tabelas activity_logs, timecard_records e pc_lock_policies criadas, mas sem serviço de leitura ou escrita
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:254 (activityLogs = INITIAL_ACTIVITY_LOGS), 257 (pcLockPolicies só localStorage), 258 (timecardRecords = INITIAL_TIMECARD_RECORDS; setTimecardRecords nunca usado); supabase/migrations/20260924000000_core_business_tables.sql:73-88, 133-147, 235-254
- **Categoria:** Banco de dados
- **Descrição:** As migrations criam activity_logs, pc_lock_policies e timecard_records, mas src/services/supabase não tem serviços para elas. O App mantém logs de atividade e registros de ponto como constantes mock (setActivityLogs e setTimecardRecords nunca são chamados). As políticas de trava ficam só no localStorage. O badge 'Portaria 671 / 3 Integrações Ativas' não corresponde a nenhuma integração REP.
- **Impacto:** O Monitor de Atividade e o cruzamento Ponto x PC nunca exibem dados reais. As políticas de trava não são compartilhadas entre instalações/usuários e o schema do banco fica sem uso.
- **Evidência:** Grep 'pcLock\|activity_log\|timecard' em src/services e server só encontra os arquivos SQL; App.tsx:258 `const [timecardRecords, setTimecardRecords] = useState<TimecardRecord[]>(INITIAL_TIMECARD_RECORDS);` — o grep por setTimecardRecords só encontra a declaração.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-090 · [MÉDIA] 'Alterar limite' de um colaborador altera o limite global de ociosidade
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:676-681 (handleAlterThreshold); src/components/IdleToastNotifications.tsx:91-99, 375-435; src/components/IdleAlertsDrawer.tsx:297-316
- **Categoria:** Regra de negócio
- **Descrição:** Os painéis por alerta/colaborador oferecem 'Alterar limite tolerado' e a mensagem cita o nome do colaborador, mas o handler chama setIdleThresholdMinutes(newThreshold), que é o limite global usado para todos. Não existe limite por colaborador no modelo.
- **Impacto:** Ajustar a tolerância de uma pessoa muda silenciosamente a regra da empresa inteira, gerando alertas a mais ou a menos para todos.
- **Evidência:** App.tsx:677 `setIdleThresholdMinutes(newThresholdMinutes);` seguido de App.tsx:680 `alert(`✏️ Limite de inatividade de ${emp?.name \|\| 'colaborador'} alterado para ...`)`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-091 · [MÉDIA] Monitor de Atividade: logs não filtrados pelo colaborador, host inexistente e filtro 'Ocioso' sem efeito
- **Arquivo:** `src/components/ActivityMonitoring.tsx`
- **Localização:** ActivityMonitoring.tsx:58-70 (filteredLogs), 91 (filtro 'Ocioso'), 178-185 (título e host), 211
- **Categoria:** Bug / código incompleto
- **Descrição:** O título diz 'Linha do Tempo Detalhada: {nome do selecionado}', mas filteredLogs não filtra por employeeId e mostra os logs de todos. O host do PC é lido de currentEmployee.pcHostName (o campo real é computerHost), então aparece vazio. A pílula 'Ocioso' filtra por log.category === 'Ocioso', valor que não existe em AppCategory, e sempre devolve lista vazia. selectedEmployee começa como INITIAL_EMPLOYEES[0] (mock) mesmo quando os colaboradores vêm do Supabase.
- **Impacto:** Quem investiga um colaborador vê atividades de outras pessoas atribuídas a ele, o que é um risco de interpretação errada e de exposição indevida de dados (LGPD). O host não aparece e um filtro não funciona.
- **Evidência:** Linhas 62-70: filtro só por categoria e busca, sem `log.employeeId === currentEmployee.id`; linha 184 `{currentEmployee.pcHostName}` vs types.ts:25 `computerHost`; types.ts:12 `AppCategory = 'Produtivo' \| 'Improdutivo' \| 'Neutro'`; App.tsx:361 `useState<Employee \| null>(INITIAL_EMPLOYEES[0])`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-092 · [MÉDIA] Exportação CSV do ranking sai truncada (caractere '#' em data URI via encodeURI)
- **Arquivo:** `src/components/ProductivityRankings.tsx`
- **Localização:** ProductivityRankings.tsx:37-58 (handleExportCsv, linha 40 `#${index + 1}` e linha 51 encodeURI); mesmo padrão de data URI + encodeURI em AppClassificationEngine.tsx:197-198, WorkdayTimeline.tsx:198-199, App.tsx:757-758
- **Categoria:** Bug / código incompleto
- **Descrição:** Os CSVs são montados como 'data:text/csv,...' e passados por encodeURI, que não codifica '#'. Num data URI, '#' inicia o fragmento e o conteúdo a partir dele é descartado. No ranking, toda linha começa com '#1', '#2' etc. Nos demais exports, qualquer '#' em nome, descrição ou domínio também trunca o arquivo.
- **Impacto:** O CSV do ranking (também acionado pelo botão principal do cabeçalho da aba) sai só com a linha de cabeçalho. Os outros exports podem sair incompletos sem nenhum aviso.
- **Evidência:** Linha 40 `` `#${index + 1}` ``; linha 50-51 `const csvContent = 'data:text/csv;charset=utf-8,﻿' + ...; const encodedUri = encodeURI(csvContent);` — encodeURI preserva '#'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-093 · [MÉDIA] Dossiê de auditoria de ponto exporta 'hash SHA256' falso gerado com Math.random
- **Arquivo:** `src/components/WorkdayTimeline.tsx`
- **Localização:** WorkdayTimeline.tsx:186-196 (coluna Hash_Integridade_SHA256), 67-69 (badge 'Portaria 671 MTP / REP-C / REP-P'), 81-83 ('3 Integrações Ativas')
- **Categoria:** Regra de negócio
- **Descrição:** O CSV 'Dossiê de Auditoria Ponto + PC' inclui uma coluna de hash de integridade SHA-256 que é só 'SHA256_' + Math.random() + Date.now(), sem relação com o conteúdo. A tela também afirma conformidade com a Portaria 671 e '3 Integrações Ativas', mas não há integração REP (ver achado das tabelas sem uso).
- **Impacto:** O documento se apresenta como prova de integridade para fins trabalhistas sem ter nenhum valor criptográfico. Usado numa auditoria ou processo, pode ser contestado e expor a empresa.
- **Evidência:** Linha 196 `` `"SHA256_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}"` ``; linha 82 `3 Integrações Ativas` literal.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-094 · [MÉDIA] Central de notificações: 'Notificar colaborador' é só um alert() e o filtro de severidade não tem controle na interface
- **Arquivo:** `src/components/IdleAlertsDrawer.tsx`
- **Localização:** IdleAlertsDrawer.tsx:72-87 (filter sem setter na UI), 318-325 ('✓ Notificado'); src/App.tsx:656-658 (handleNotifyEmployee); src/components/IdleToastNotifications.tsx:439-446 ('Notificar PC')
- **Categoria:** UI não implementada
- **Descrição:** handleNotifyEmployee só mostra alert('Notificação ... enviada com sucesso') e não chama backend nem agente. A gaveta marca o item como '✓ Notificado'. O estado filter ('todos' \| 'criticos' \| 'alertas') é declarado, mas setFilter nunca é usado, então não há como filtrar. As props employees, individualAlertOverrides, onToggleIndividualAlertOverride e onInvestigate são recebidas e ignoradas.
- **Impacto:** O gestor acredita ter avisado o colaborador e nada chega à estação. Funções prometidas pela interface não existem.
- **Evidência:** App.tsx:657 `alert(`⚡ Notificação de atenção enviada com sucesso para o agente corporativo ...`)`; IdleAlertsDrawer.tsx:72 `const [filter, setFilter] = useState(...)` — grep por 'setFilter' só encontra a declaração.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-095 · [MÉDIA] Histórico de alertas cresce sem limite no localStorage e o efeito de simulação é recriado a cada tick
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:541-574 (consolidação com eventsHistory), 470-472 (persistência wp_idleToasts), 498-500 (wp_employees), 604-638 (efeito com deps [isSimulating, employees, idleThresholdMinutes])
- **Categoria:** Desempenho
- **Descrição:** Cada novo evento dentro da janela de 10 min é anexado a eventsHistory e lastUpdatedMs é atualizado, o que estende a janela indefinidamente. Com a simulação (15% a cada 5 s), o mesmo colaborador volta antes de 10 min e o array cresce sem teto, sendo regravado inteiro no localStorage a cada mudança. O efeito da simulação depende de employees, que muda a cada tick, então o setInterval é destruído e recriado a cada 5 s, com serialização de employees em localStorage na mesma frequência.
- **Impacto:** Uso crescente de memória e do localStorage (cota ~5 MB). Uma exceção de cota em setItem não é tratada nesses efeitos e pode quebrar o render. Alertas antigos reaparecem após recarregar como 'Alertas em Tempo Real'.
- **Evidência:** App.tsx:562 `lastUpdatedMs: nowMs,` e 566-569 `eventsHistory: [...currentHistory, { timestamp: nowStr, ... }]` sem corte; App.tsx:471 `localStorage.setItem('wp_idleToasts', JSON.stringify(idleToasts));` sem try/catch; App.tsx:638 `}, [isSimulating, employees, idleThresholdMinutes]);`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-096 · [MÉDIA] 'Restaurar Padrões' apaga regras personalizadas sem confirmação; edição sobrescreve a data de criação
- **Arquivo:** `src/components/AppClassificationEngine.tsx`
- **Localização:** AppClassificationEngine.tsx:260-270 (botão Restaurar Padrões), 139-152 (handleSaveRule em edição); src/App.tsx:723-725
- **Categoria:** Bug / código incompleto
- **Descrição:** O botão 'Restaurar Padrões' chama onResetRules direto, sem modal de confirmação, e substitui todas as regras por INITIAL_APP_RULES. Na edição, createdAt é sobrescrito com a data atual em formato pt-BR, e a data original de criação se perde. A exclusão, por outro lado, tem modal de confirmação.
- **Impacto:** Um clique acidental elimina o catálogo customizado (sem cópia no Supabase, ver achado de persistência). A auditoria de quando a regra foi criada fica comprometida.
- **Evidência:** Linha 263 `onClick={onResetRules}`; App.tsx:724 `setAppRules(INITIAL_APP_RULES);`; linha 151 `createdAt: new Date().toLocaleDateString('pt-BR')` dentro do ramo `if (editingRuleId)`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-097 · [BAIXA] Componentes órfãos de relatórios, BI e integrações, com funcionalidades simuladas e chave em localStorage
- **Arquivo:** `src/components/ApiAndIntegrations.tsx`
- **Localização:** ApiAndIntegrations.tsx (inteiro; 26-50 chave TOTVS no localStorage; 67-74 teste OAuth2 com setTimeout); AutomatedReportsAndExport.tsx (inteiro; 20 URL Cloud Run de dev; 28-31 envio de e-mail falso; 33-50 CSV fixo); CustomBIAndPersonas.tsx (inteiro; KPIs fixos e não persistidos); src/App.tsx:244
- **Categoria:** Duplicado / obsoleto
- **Descrição:** ApiAndIntegrations, AutomatedReportsAndExport e CustomBIAndPersonas não são importados em lugar nenhum. App.tsx redireciona as antigas abas 'custom_bi', 'reports' e 'integrations' para 'overview'. Internamente são simulações: o teste de conexão TOTVS é um setTimeout que sempre retorna 'sucesso, 128 colaboradores sincronizados'; o envio de e-mail só mostra uma mensagem; o CSV 'completo' é um texto fixo de 6 linhas; o endpoint Power BI aponta para uma URL de dev do Cloud Run (ais-dev-...run.app); a AppKey TOTVS (padrão 'totvs_live_pk_***') é guardada em texto claro no localStorage. O estado selectedPersona do App só é persistido e não é consumido (Navbar também não é renderizado).
- **Impacto:** Código morto que aumenta a manutenção e confunde futuras reativações. Se reativados, entregariam integrações falsas e exporiam credenciais no localStorage.
- **Evidência:** Grep 'ApiAndIntegrations\|AutomatedReportsAndExport\|CustomBIAndPersonas' só encontra as próprias declarações; App.tsx:244 `if (saved === 'custom_bi' \|\| saved === 'idle' \|\| saved === 'reports' \|\| saved === 'integrations') return 'overview';`; ApiAndIntegrations.tsx:70-73 `setTimeout(() => { ... setTotvsStatus('✅ Conexão estabelecida com sucesso ...') }, 1200);`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-098 · [BAIXA] Props, estados e imports sem uso nos componentes de produtividade
- **Arquivo:** `src/components/ActivityMonitoring.tsx`
- **Localização:** ActivityMonitoring.tsx:47-51, 59 (idleThresholdMinutes, setIdleThresholdMinutes, onTriggerTestAlert, onOpenIdleAlertsDrawer, isIdleView, idleEmployees sem uso); DashboardOverview.tsx:76 (departmentSummaries sem uso); WorkdayTimeline.tsx:29 (employees sem uso); IdleAlertsDrawer.tsx:60-65; dezenas de ícones lucide importados e não usados nos 11 componentes
- **Categoria:** Duplicado / obsoleto
- **Descrição:** Várias props passadas pelo App são ignoradas pelos componentes (ex.: o App passa idleThresholdMinutes e handlers de teste ao ActivityMonitoring, que não os exibe). Há muitos imports mortos de ícones.
- **Impacto:** Indica funcionalidades planejadas e não concluídas (controles de ociosidade no monitor de atividade) e dificulta a manutenção.
- **Evidência:** ActivityMonitoring.tsx:59 `const idleEmployees = employees.filter(...)` nunca é referenciado; DashboardOverview.tsx:76 `departmentSummaries,` não aparece no JSX.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-099 · [BAIXA] Possíveis crashes quando a lista de colaboradores fica vazia
- **Arquivo:** `src/App.tsx`
- **Localização:** App.tsx:683-688 (handleTriggerTestIdleAlert); src/components/ActivityMonitoring.tsx:58, 120, 179
- **Categoria:** Estabilidade
- **Descrição:** handleTriggerTestIdleAlert usa `employees.find(...) \|\| employees[0]`. Com employees vazio (ex.: 'wp_employees' = [] no localStorage), target fica undefined e triggerIdleToastForEmployee acessa emp.id, o que gera TypeError. No ActivityMonitoring, se selectedEmployee for null e os filtros zerarem a lista, currentEmployee.id e currentEmployee.name quebram o render.
- **Impacto:** Clicar em 'Testar Toast' / '+ Simular Alerta', ou abrir o Monitor de Atividade em base vazia, pode derrubar a aplicação (não há ErrorBoundary).
- **Evidência:** App.tsx:685-686 `const target = employees.find(e => e.status === 'Ocioso') \|\| employees[0]; triggerIdleToastForEmployee(target, ...)`; App.tsx:525 `employeePausedUntil[emp.id]`; ActivityMonitoring.tsx:58 `const currentEmployee = selectedEmployee \|\| employees[0];`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-100 · [BAIXA] Exportações CSV sem neutralizar fórmulas (CSV injection)
- **Arquivo:** `src/components/AppClassificationEngine.tsx`
- **Localização:** AppClassificationEngine.tsx:183-205; ProductivityRankings.tsx:37-58; WorkdayTimeline.tsx:186-205; src/App.tsx:745-766
- **Categoria:** Segurança
- **Descrição:** Campos digitados pelo usuário ou vindos do banco (nome do software, descrição, domínio, nome do colaborador) são gravados no CSV só com escape de aspas. Valores iniciados por '=', '+', '-' ou '@' não são neutralizados.
- **Impacto:** Uma regra cadastrada com nome malicioso (ex.: começando com '=') pode executar fórmulas quando o CSV for aberto no Excel por outro gestor.
- **Evidência:** AppClassificationEngine.tsx:187 `` `"${r.appName.replace(/"/g, '""')}"` `` — sem prefixo de neutralização.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

### 6.5 LGPD, instalador de agente e coletores

_Forma de exame: Agente (leitura integral) — 25 achados._

> **Estado do módulo:** A fatia S05 (LGPD, instalador do agente, frota de agentes silenciosos e coletores por SO) é quase toda demonstrativa. Só o contrato de API do lado do servidor (/api/v1/agent/enroll, /heartbeat, /inventory em server/cmdbRouter.ts) existe de fato. A aba gpo_lgpd (LgpdAndAgentInstaller) gera scripts obsoletos e quebrados. O script PowerShell individual tem o envio comentado (Invoke-RestMethod para /api/itam/register, rota que não existe) e mesmo assim imprime "SUCESSO". O one-liner e o .BAT baixam /agent/install.ps1, que não existe; a SPA devolve index.html no lugar. O .BAT sempre aborta por causa de um parêntese dentro do bloco if, e o script Linux/macOS só grava um config.json. A versão mais nova em src/utils/installerScripts.ts chama o enroll real, mas tem três falhas: grava agent_service.ps1 corrompido (here-string expansível com variáveis expandidas na instalação), nunca registra serviço nem tarefa, e usa por padrão window.location.origin (provavelmente http://localhost:3000). A versão Unix dessa camada nem é usada. O token de enrollment padrão fica embutido no bundle do frontend e o servidor o aceita (1000 usos, validade até 2027): qualquer pessoa com acesso à SPA consegue registrar dispositivos e obter credenciais de agente. A Central do Agente Silencioso (SilentAgentFleetModal) é 100% simulada: 148 estações geradas com nomes fictícios; ping, sincronização, bloqueio e atualização feitos com setTimeout/Math.random; KPIs fixos no código; "MSI" que é um arquivo de texto; comandos de implantação com domínios fictícios e sintaxe inválida. Políticas como modo stealth e intervalo de heartbeat não são persistidas nem enviadas. Os endpoints reais /api/v1/agent/devices/:id/block\|unblock existem e são ignorados. Os coletores em TypeScript (Windows, Linux, macOS, Android) devolvem inventário fixo no código e servem só de amostra no CmdbAgentApiModal; collectAll, diff, buildTransmissionPayload e mergeDelta nunca são chamados. O computeHash ignora todo o conteúdo aninhado. Os scripts nativos gerados têm falhas reais: cache incremental inútil (o timestamp entra no hash), arrays de 1 elemento serializados como objeto no PowerShell, JSON inválido no macOS, dados coletados e descartados no Linux, e o Kotlin do Android nem envia dados. Não existe fluxo de consentimento LGPD: nada é capturado, persistido, nem tem tabela ou endpoint, e o endpoint /api/v1/compliance/gpo-lgpd citado no catálogo de API não existe. A interface ainda afirma coisas sem base ("100% Blindado", "certificado LGPD", "TLS 1.3/AES-256") e traz um modo stealth ligado por padrão, o que contradiz a transparência que ela mesma promete. Prioridades: revogar e remover o token embutido, corrigir ou desativar os instaladores quebrados, rotular a frota como demonstração ou ligá-la à API real, e implementar o registro de consentimento LGPD.

#### A-101 · [CRÍTICA] Token de enrollment de produção embutido no bundle do frontend e aceito pelo servidor
- **Arquivo:** `src/utils/installerScripts.ts`
- **Localização:** installerScripts.ts:1 (DEFAULT_TENANT_TOKEN); LgpdAndAgentInstaller.tsx:31 (useState inicial do tenantToken); server/cmdbRouter.ts:496 (DEFAULT_LEGACY_TOKEN), 501-513 (seed enr-legacy-gpo), 1851-1853 (fallback no handleEnrollment)
- **Categoria:** Segurança
- **Descrição:** O mesmo token de enrollment (wp-prod-token-9948***) está fixo em dois arquivos do frontend e é enviado a qualquer navegador que carregue a SPA. No servidor ele é aceito de propósito como 'token legado', com maxUses 1000 e validade até 2027-12-31. Ele também aparece em texto claro nos scripts baixados (comentários, echo do .BAT, querystring do one-liner).
- **Impacto:** Quem consegue abrir a aplicação ou recebe um .BAT/.PS1 gerado consegue registrar quantos dispositivos quiser no tenant-demo. Cada registro cria CIs no CMDB (store.items) e recebe deviceToken válido para enviar heartbeat e inventário falsos. Isso polui o inventário e a telemetria e abre um vetor de persistência.
- **Evidência:** installerScripts.ts:1 `export const DEFAULT_TENANT_TOKEN = 'wp-prod-token-9948***'`; cmdbRouter.ts:496 `const DEFAULT_LEGACY_TOKEN = "wp-prod-token-9948***"`; cmdbRouter.ts:507-510 `maxUses: 1000 ... expiresAt: "2027-12-31T23:59:59.000Z"`; cmdbRouter.ts:1851 `if (!matchedEnrollmentToken && suppliedToken === DEFAULT_LEGACY_TOKEN)`. LgpdAndAgentInstaller.tsx:134 `echo Token: ${tenantToken}`.
- **Verificação:** CONFIRMADO (conferido manualmente)

#### A-102 · [ALTA] Instalador individual da aba LGPD/GPO não registra nada, mas anuncia sucesso
- **Arquivo:** `src/components/LgpdAndAgentInstaller.tsx`
- **Localização:** LgpdAndAgentInstaller.tsx:51-118 (individualPsScript), 99-107 (ServiceScript), 109-116 (envio comentado)
- **Categoria:** UI não implementada
- **Descrição:** O script PowerShell montado na tela coleta o hardware e monta $Payload, mas a única chamada de rede está comentada e aponta para /api/itam/register, rota que não existe no servidor (a real é /api/v1/agent/enroll). Em seguida imprime '[SUCESSO] Computador registrado com sucesso!'. O 'serviço' é um loop vazio de Start-Sleep gravado em arquivo, sem New-Service nem Register-ScheduledTask. Além disso, a variável individualPsScript nunca é exibida nem baixada pela UI (só batchScript, oneLinerCommand, gpoScript e unixScript são usados no JSX).
- **Impacto:** Nenhum computador instalado por esta tela aparece no CMDB/ITAM, mas o operador recebe mensagens de sucesso e conclui que a frota está monitorada. Isso compromete inventário, telemetria e compliance.
- **Evidência:** Linha 112: `# Invoke-RestMethod -Uri "\$ServerUrl/api/itam/register" ...` (comentado); linha 113: `Write-Host ">>> [SUCESSO] Computador ... registrado com sucesso!"`; linhas 101-106: `while(\$true) { # Telemetria ... Start-Sleep -Seconds 30 }`. O grep por 'itam/register' no servidor não retorna nada.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-103 · [ALTA] One-liner e .BAT baixam /agent/install.ps1, rota inexistente (a SPA devolve HTML)
- **Arquivo:** `src/components/LgpdAndAgentInstaller.tsx`
- **Localização:** LgpdAndAgentInstaller.tsx:121 (oneLinerCommand), 146 (batch); installerScripts.ts:149 (oneLinerCommand), 172 (batch); server.ts:253-263 (fallback SPA)
- **Categoria:** Falha de integração
- **Descrição:** Os dois geradores montam `Invoke-Expression (New-Object Net.WebClient).DownloadString('<server>/agent/install.ps1?token=...&dept=...')`. Nenhuma rota /agent/install.ps1 existe no Express. Com Vite em appType 'spa' (dev) ou `app.get('*')` servindo index.html (produção), a resposta é o HTML da SPA, e o Invoke-Expression falha ao interpretá-lo como PowerShell.
- **Impacto:** O método 'Comando Único no Terminal PowerShell' e o 'Instalador 1-Clique (.BAT)' nunca instalam o agente. São justamente os métodos destacados como 'Mais Fácil' e 'Instantâneo'.
- **Evidência:** Linha 121: `DownloadString('${serverUrl}/agent/install.ps1?token=${tenantToken}&dept=...')`; o grep por 'install.ps1' em server/ e server.ts não acha rotas; server.ts:255 `appType: "spa"` e 261-262 `app.get("*", ... sendFile(index.html))`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-104 · [ALTA] Arquivo .BAT sempre aborta: parêntese dentro do bloco IF e '%' do URL-encode expandido como parâmetro
- **Arquivo:** `src/utils/installerScripts.ts`
- **Localização:** installerScripts.ts:165-169 e 149/172; LgpdAndAgentInstaller.tsx:139-143 e 121/146
- **Categoria:** Bug / código incompleto
- **Descrição:** (1) Dentro de `if %errorLevel% neq 0 ( ... )`, a linha `echo [ERRO] ... (Botao direito - Executar como Administrador)` tem um ')' sem escape. O cmd.exe fecha o bloco IF nesse ponto, e as linhas seguintes `pause` e `exit /b 1` passam a rodar incondicionalmente, até como administrador. (2) O departamento passa por encodeURIComponent (ex.: 'TI%20%2F%20Infraestrutura'). Num .bat, '%2' é expandido como o 2º argumento do batch (vazio), o que corrompe a URL para algo como 'TI0F0Infraestrutura'. (3) O oneLinerCommand, que já contém aspas duplas, é colocado dentro de outro `-Command "..."`, criando aspas aninhadas sem escape.
- **Impacto:** O instalador .BAT baixado pelo cabeçalho (PageHeaderCard) e pela aba LGPD termina com erro em todas as execuções. Mesmo corrigido o IF, ele enviaria parâmetros corrompidos.
- **Evidência:** installerScripts.ts:165-169: `if %errorLevel% neq 0 (` / `echo [ERRO] Execute este arquivo como ADMINISTRADOR (Botao direito - Executar como Administrador)` / `pause` / `exit /b 1` / `)`; linha 149: `&dept=${encodeURIComponent(department)}` inserido no .bat da linha 172. É a armadilha clássica do cmd: um ')' não escapado com ^ encerra o bloco.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-105 · [ALTA] agent_service.ps1 gerado corrompido (here-string expansível) e nunca registrado como serviço
- **Arquivo:** `src/utils/installerScripts.ts`
- **Localização:** installerScripts.ts:102-140 (ServiceScript), 142; LgpdAndAgentInstaller.tsx:101-107
- **Categoria:** Bug / código incompleto
- **Descrição:** O conteúdo do serviço fica num here-string expansível do PowerShell (@" ... "@). O autor tentou escapar as variáveis com `\$`, mas num template literal JS `\$` vira apenas `$`, e o escape do PowerShell seria a crase. Resultado: na instalação, o PowerShell expande $Identity, $true, $Disk, $Cpu, $HbPayload etc. com os valores daquele momento (vazios ou objetos), e o agent_service.ps1 sai com linhas como ` = Get-Content  -Raw` e `while(True)`. Além disso, nenhum serviço, tarefa agendada ou chave Run é criado para executar o arquivo, apesar da mensagem 'Configurando servico em segundo plano'.
- **Impacto:** Mesmo quando o enrollment funciona, o heartbeat periódico nunca é enviado. O dispositivo aparece registrado mas sem telemetria, e a mensagem final 'Agente individual ativo' é falsa.
- **Evidência:** installerScripts.ts:102 `$ServiceScript = @"`; 104 `\$Identity = Get-Content \$IdentityFile -Raw \| ConvertFrom-Json` (vira `$Identity` dentro de @"..."@); 109 `while(\$true)`; 140 `Set-Content -Path "$InstallDir\\agent_service.ps1" ...`. Não há New-Service, sc.exe nem Register-ScheduledTask em nenhum dos dois arquivos.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-106 · [ALTA] Instaladores Linux/macOS não instalam daemon; a versão funcional não é usada e falha no macOS
- **Arquivo:** `src/components/LgpdAndAgentInstaller.tsx`
- **Localização:** LgpdAndAgentInstaller.tsx:164-182 (unixScript usado na aba mac_linux); installerScripts.ts:190-238 (getUnixScript, sem referências)
- **Categoria:** Bug / código incompleto
- **Descrição:** O script exibido e baixado na aba 'Linux & macOS (Daemon)' só cria /opt/workpulse/agent/config.json e imprime 'Agente daemon registrado e iniciado com sucesso!'. Não há coleta, chamada HTTP nem unit systemd/launchd. A versão em installerScripts.getUnixScript faz o enroll, mas não é importada em lugar nenhum e tem defeitos: a cadeia `ip link show \| awk ... \| head -n 1 \|\| ifconfig ...` nunca cai no fallback, porque o status do pipeline é o do head; no macOS (sem `ip`) o MAC fica vazio e o servidor responde 400. A resposta HTTP, mesmo de erro, é gravada sem verificação como agent_identity.json, e como o arquivo passa a existir, o enroll nunca é tentado de novo. Também não cria daemon nem heartbeat.
- **Impacto:** Estações Linux/macOS nunca entram no inventário nem enviam telemetria, embora a UI diga 'compatível com Ubuntu, Debian, RedHat, macOS e CentOS'.
- **Evidência:** LgpdAndAgentInstaller.tsx:181-182: `echo ">>> Coletando Hardware..."` / `echo ">>> Agente daemon registrado e iniciado com sucesso!"`; installerScripts.ts:211 `MAC=$(ip link show \| awk ... \| head -n 1 \|\| ifconfig ...)`; 228-233 `RESPONSE=$(curl -s ...)` / `echo "$RESPONSE" > "$IDENTITY_FILE"`; cmdbRouter.ts:1838 retorna 400 sem macAddress. O grep por getUnixScript só encontra a definição.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-107 · [ALTA] Central do Agente Silencioso inteiramente simulada (frota, ações remotas e KPIs)
- **Arquivo:** `src/components/SilentAgentFleetModal.tsx`
- **Localização:** SilentAgentFleetModal.tsx:84-145 (geração de 148 estações), 161-192 (ping/sync/lock), 286 ('148 PCs Conectados'), 343, 353, 767-804 (KPIs fixos e 'Atualizar Máquinas')
- **Categoria:** UI não implementada
- **Descrição:** A lista de estações combina funcionários reais com estações fictícias (namesList com nomes inventados) até completar 148. IP, MAC, CPU, RAM, versão e status são calculados a partir do índice. Ping usa setTimeout + Math.random. 'Forçar sincronização' e 'Bloquear estação' só mudam o estado local. 'Atualizar máquinas desatualizadas' muda a versão no estado e exibe 'Comando ... enviado para todas as máquinas!'. Uptime 99.94%, 1.482.910 eventos, 48 bloqueios, '100% Blindado' e '146 em v2.4.8' são literais. A API real de dispositivos (/api/v1/agent/devices, /block, /unblock), já usada pelo CmdbAgentApiModal, é ignorada.
- **Impacto:** Gestores tomam decisões com base em uma frota inexistente. Bloqueios remotos e pings não acontecem. O CSV 'inventário de 148 computadores' exporta dados fictícios, incluindo nomes de pessoas inventadas, como se fossem reais.
- **Evidência:** Linha 118: `while (generated.length < 148) {`; 165: `const randomMs = Math.floor(Math.random() * 8) + 6;`; 180-191: handleToggleLockStation só chama setStations/showToast; 798-799: `setStations(prev => prev.map(s => ({ ...s, agentVersion: 'v2.4.8' ...` + toast 'Comando de atualização remota via GPO enviado'. Nenhum fetch no arquivo.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-108 · [ALTA] Comandos de implantação e 'pacote MSI' da Central são falsos ou inválidos
- **Arquivo:** `src/components/SilentAgentFleetModal.tsx`
- **Localização:** SilentAgentFleetModal.tsx:194-207 (handleDownloadMsi), 255-257 (corporateToken, powershellCommand, gpoCommand), 636-638
- **Categoria:** UI não implementada
- **Descrição:** 'Baixar Pacote MSI' gera um Blob de texto com extensão .msi, que não é um instalador Windows. O texto inclui um token fixo, e o toast diz que o download começou. O comando PowerShell `irm https://get.workpulse.corp/agent.ps1 \| iex -Token "..." -Silent` usa um domínio fictício e parâmetros que Invoke-Expression não tem (-Token, -Silent). O gpoCommand aponta para \\srv-dc01\deploy\WorkPulse_Agent_v2.4.8.msi e https://app.workpulse.corp. O token 'wp-corp-sec-...' não é reconhecido pelo servidor, e a 'Validade: 30 dias' é texto fixo. Não há nenhum projeto de MSI no repositório (nenhum .msi/.wxs/.nsi/.iss).
- **Impacto:** Administradores que tentarem implantar via GPO/Intune com esses artefatos terão falha total. O arquivo .msi baixado é inválido e gera erro no msiexec.
- **Evidência:** Linha 196: `"WorkPulse Silent Agent MSI Installer Package\nVersion: 2.4.8-LTS ... Token: WP-CORP-TOKEN-..."` com download `WorkPulse_SilentAgent_v2.4.8_x64.msi`; linha 256: `irm https://get.workpulse.corp/agent.ps1 \| iex -Token "${corporateToken}" -Silent`; o Glob **/*.{msi,wxs,nsi,iss} não retorna nada.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-109 · [ALTA] Fluxo de consentimento/ciência LGPD inexistente; endpoint de compliance documentado não existe
- **Arquivo:** `src/components/LgpdAndAgentInstaller.tsx`
- **Localização:** LgpdAndAgentInstaller.tsx:602-625 (cards LGPD estáticos); SilentAgentFleetModal.tsx:79, 680-695 (modo Stealth padrão true), 816; src/components/UserRegistration.tsx:180
- **Categoria:** Regra de negócio
- **Descrição:** O módulo 'GPO & LGPD' mostra só três cards de texto ('Termo de Transparência', 'Sem keylogger', 'Criptografia'). Nenhum componente notifica o colaborador, captura aceite ou ciência, versiona termos ou grava registros, e não existe tabela de consentimento no SQL nem rota no servidor (o grep por consent/consentimento em server/ e supabase/ não acha nada relevante). O catálogo de API em UserRegistration.tsx documenta GET /api/v1/compliance/gpo-lgpd ('consentimentos LGPD'), que não existe no servidor. A Central traz o 'Modo 100% Silencioso (Stealth)' ligado por padrão para 'operação invisível', em contradição direta com a notificação clara ao colaborador prometida no card.
- **Impacto:** A empresa não tem prova de ciência ou base legal do monitoramento (LGPD art. 6º VI e art. 9º, transparência). Isso expõe a organização a risco trabalhista e regulatório, enquanto a UI garante 'certificado para conformidade com a LGPD'.
- **Evidência:** LgpdAndAgentInstaller.tsx:621-622 `📜 Termo de Transparência` / `Notificação clara ao colaborador...` (só texto); SilentAgentFleetModal.tsx:79 `useState(true)` para isStealthMode e 683 'Oculta qualquer ícone ... para operação invisível'; UserRegistration.tsx:180 `path: '/api/v1/compliance/gpo-lgpd'`; o grep por 'gpo-lgpd\|compliance/gpo' em server.ts e server/ não acha nada.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-110 · [MÉDIA] Script GPO depende de MSI inexistente e usa propriedades divergentes entre versões
- **Arquivo:** `src/utils/installerScripts.ts`
- **Localização:** installerScripts.ts:181-188 (getGpoScript), 248-250 (downloadMsiGpoPackage, sem uso); LgpdAndAgentInstaller.tsx:155-161
- **Categoria:** Falha de integração
- **Descrição:** Os scripts GPO chamam msiexec sobre \\domain.local\SYSVOL\Installers\WorkPulseAgent-v4.2.1.msi, um pacote que o projeto não produz. A versão da tela usa a propriedade TENANT_TOKEN; a de installerScripts usa ENROLLMENT_TOKEN. Nenhum MSI existe para interpretar qualquer uma delas. As versões citadas também divergem (v4.2.1 aqui, v2.4.8 na Central, v3.0.0-rmm no enroll). O script sempre imprime 'instalado com sucesso' sem verificar o código de saída do msiexec.
- **Impacto:** A distribuição em massa via AD/GPO, apresentada como método oficial, não tem artefato instalável e reporta sucesso falso.
- **Evidência:** LgpdAndAgentInstaller.tsx:160 `TENANT_TOKEN=...`; installerScripts.ts:187 `ENROLLMENT_TOKEN=...`; installerScripts.ts:188 `Write-Host "... instalado com sucesso via GPO!"` logo após `Start-Process ... -Wait` sem checar o ExitCode.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-111 · [MÉDIA] Alegações de segurança/LGPD sem respaldo (TLS 1.3, AES-256, '100% Blindado'); URL padrão em HTTP
- **Arquivo:** `src/utils/installerScripts.ts`
- **Localização:** installerScripts.ts:2 (DEFAULT_SERVER_URL); LgpdAndAgentInstaller.tsx:616-617; SilentAgentFleetModal.tsx:167, 353, 795, 816; server.ts:266
- **Categoria:** Segurança
- **Descrição:** A UI afirma 'TLS 1.3 e criptografia AES-256 no banco', 'Conectado via TLS 1.3', '100% Blindado' e 'certificado para conformidade com a LGPD'. Os scripts gerados, porém, usam como servidor `window.location.origin` (fallback 'http://localhost:3000'), e o servidor Express escuta em HTTP puro (app.listen em 0.0.0.0:3000). Enrollment token e deviceToken trafegam em texto claro sempre que o painel é acessado por HTTP.
- **Impacto:** Afirmações de conformidade enganosas e possível interceptação de credenciais de agentes na rede local.
- **Evidência:** installerScripts.ts:2 `export const DEFAULT_SERVER_URL = window?.location?.origin \|\| 'http://localhost:3000';`; server.ts:266 `app.listen(PORT, "0.0.0.0", ...)` sem HTTPS; SilentAgentFleetModal.tsx:167 'Latência Excelente • Conectado via TLS 1.3' num ping simulado.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-112 · [MÉDIA] URL do servidor nos instaladores aponta para localhost ou domínios fictícios
- **Arquivo:** `src/utils/installerScripts.ts`
- **Localização:** installerScripts.ts:2, 240-246 (downloads com parâmetros padrão); LgpdAndAgentInstaller.tsx:32; SilentAgentFleetModal.tsx:256-257
- **Categoria:** Falha de integração
- **Descrição:** Os downloads do cabeçalho (downloadIndividualPs1/Bat) usam sempre os padrões: o servidor é a origem do navegador do administrador, quase sempre http://localhost:3000 em uso local. Executado em outro PC, o script tenta se registrar no localhost da própria máquina. A aba LGPD vem pré-preenchida com https://app.workpulse.io, e a Central com get.workpulse.corp e app.workpulse.corp, hosts que não são o servidor da aplicação. Não existe configuração central da URL pública do servidor.
- **Impacto:** Os scripts baixados falham silenciosamente ou registram a máquina num host errado, e cada tela gera instaladores para destinos diferentes.
- **Evidência:** installerScripts.ts:240-241 `downloadFile(getIndividualPsScript(), ...)` sem argumentos; LgpdAndAgentInstaller.tsx:32 `useState('https://app.workpulse.io')`; SilentAgentFleetModal.tsx:257 `SERVER="https://app.workpulse.corp"`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-113 · [MÉDIA] Entradas da UI interpoladas sem escape em scripts PowerShell/Bash/Batch/JSON
- **Arquivo:** `src/components/LgpdAndAgentInstaller.tsx`
- **Localização:** LgpdAndAgentInstaller.tsx:54-63, 94-95, 121, 134-135, 168-177; installerScripts.ts:22-31, 149, 160-161, 187, 201-202
- **Categoria:** Segurança
- **Descrição:** tenantToken, serverUrl e roomLocation (texto livre) e department são inseridos diretamente em strings PowerShell entre aspas duplas (expansíveis), em comandos cmd e em JSON/heredoc. Um valor com `$(...)` em 'Ambiente / Sala Alvo' vira código executado como Administrador em cada PC onde o script rodar. Aspas ou '&' quebram a sintaxe.
- **Impacto:** Um operador mal-intencionado (ou um valor colado por engano) pode gerar instaladores que executam comandos arbitrários com privilégio elevado em toda a frota, ou scripts que simplesmente não rodam.
- **Evidência:** LgpdAndAgentInstaller.tsx:95 `Location = "${roomLocation}"` dentro de hashtable PowerShell (string expansível); 336-342: input livre `onChange={(e) => setRoomLocation(e.target.value)}`; nenhuma função de escape no arquivo.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-114 · [MÉDIA] Credenciais expostas: token em querystring/console e deviceToken legível por usuários comuns
- **Arquivo:** `src/utils/installerScripts.ts`
- **Localização:** installerScripts.ts:22, 35-38, 91-92, 149, 160; LgpdAndAgentInstaller.tsx:54, 121, 134
- **Categoria:** Segurança
- **Descrição:** O enrollment token vai na querystring (?token=), que fica registrada em logs de proxy e servidor, é impresso com echo no console e fica em comentários dos scripts. O deviceToken individual é gravado em %ProgramData%\WorkPulse\Agent\agent_identity.json. O comentário afirma 'Restrito a Administradores e SYSTEM', mas nenhum ACL (icacls/Set-Acl) é aplicado, e por padrão subpastas de ProgramData herdam leitura para o grupo Users.
- **Impacto:** Qualquer usuário local pode ler o deviceToken e se passar pelo agente (heartbeat e inventário falsos), além de vazar o token de enrollment em logs.
- **Evidência:** installerScripts.ts:35 `# 1. Cria Diretorio Seguro de Execucao (Restrito a Administradores e SYSTEM)` seguido só de `New-Item -ItemType Directory`; 92 `$DeviceIdentity \| ConvertTo-Json \| Set-Content -Path $IdentityFile`; 160 `echo Enrollment Token: ${tenantToken}`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-115 · [MÉDIA] Dados reais coletados pelo instalador não são enviados; servidor cria CI com dados fictícios
- **Arquivo:** `src/utils/installerScripts.ts`
- **Localização:** installerScripts.ts:14-18 e 69-76 (EnrollPayload); server/cmdbRouter.ts:1925-1969 (auto-criação do CI)
- **Categoria:** Regra de negócio
- **Descrição:** O instalador recebe department/roomLocation e coleta serial da BIOS, fabricante, modelo, CPU, RAM e disco, mas o EnrollPayload envia só hostname, MAC, IP, SO e versão. Department e local aparecem apenas em comentários. Ao criar o CI, o servidor preenche manufacturer 'Dell / Lenovo', model 'Workstation Corporate', serial derivado do MAC, clientName 'Empresa ABC Matriz' e assetTag aleatório.
- **Impacto:** O ITAM/CMDB passa a ter ativos com patrimônio, fabricante, cliente e serial fictícios, o que inviabiliza auditoria patrimonial.
- **Evidência:** installerScripts.ts:69-76 `$EnrollPayload = @{ enrollmentToken, hostname, macAddress, ipAddress, operatingSystem, agentVersion }`; cmdbRouter.ts:1937 `clientName: "Empresa ABC Matriz"`, 1942 `manufacturer: "Dell / Lenovo"`, 1944 `serialNumber: \`SN-${cleanMac...}\``.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-116 · [MÉDIA] 'Testar Coleta de Hardware' exibe dados fixos como se fossem do PC local
- **Arquivo:** `src/components/LgpdAndAgentInstaller.tsx`
- **Localização:** LgpdAndAgentInstaller.tsx:200-238 (handleSimulateScan), 437-512
- **Categoria:** UI não implementada
- **Descrição:** O botão encadeia setTimeout com logs fixos (i7-13700H, 32 GB, serial SN-889421A-BR, IP 192.168.10.142) e termina com '✅ Agente local sincronizado e ativo em segundo plano!' e 'Gerando registro automático no módulo de Gestão de Ativos (ITAM)...'. Nenhum registro é criado. O texto da seção diz 'como os dados chegam na Gestão de Ativos e na Topologia'.
- **Impacto:** Engana o usuário sobre a capacidade de coleta e sobre a integração com ITAM e Topologia.
- **Evidência:** Linhas 206-217: array de logs literais; 224-234: `setCollectedData({ hostname: "DESKTOP-FIN-08", ... status: "Online • Monitoramento Ativo" })`; nenhum fetch.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-117 · [MÉDIA] Políticas da frota (stealth, bloqueio pós-expediente, heartbeat, buffer offline) não são persistidas nem aplicadas
- **Arquivo:** `src/components/SilentAgentFleetModal.tsx`
- **Localização:** SilentAgentFleetModal.tsx:77-82, 670-759
- **Categoria:** UI não implementada
- **Descrição:** Os toggles e o select só mudam o useState local e exibem toasts como 'Frequência ajustada para Xs em todas as 148 estações'. Nada vai para servidor, Supabase ou agente. O intervalo do agente real está fixo em 30 s no script (installerScripts.ts:137) e em pollIntervalSeconds: 30 no servidor. O estado idleThreshold/setIdleThreshold é declarado e nunca usado na UI.
- **Impacto:** Configurações de compliance e jornada (bloqueio fora do expediente CLT) parecem aplicadas, mas não têm efeito e somem ao recarregar.
- **Evidência:** Linhas 725-727: `setHeartbeatInterval(e.target.value); showToast(\`Frequência ajustada para ${e.target.value}s em todas as 148 estações\`)`; linha 82: `const [idleThreshold, setIdleThreshold] = useState('15');` sem outras referências.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-118 · [MÉDIA] Frota congelada no primeiro render, campo inexistente pcHostName e vínculo com funcionário por substring do primeiro nome
- **Arquivo:** `src/components/SilentAgentFleetModal.tsx`
- **Localização:** SilentAgentFleetModal.tsx:85-108 (inicializador do useState), 93, 96-97, 535-541; App.tsx:1132-1138
- **Categoria:** Estabilidade
- **Descrição:** (1) As estações são calculadas no inicializador do useState. Como o modal fica sempre montado em App.tsx (só retorna null quando fechado), funcionários carregados depois (Supabase/localStorage) nunca são refletidos. (2) O código usa `emp.pcHostName`, que não existe na interface Employee (o campo é computerHost), então o hostname real nunca é exibido. IP e MAC são sintéticos mesmo havendo emp.ipAddress. (3) 'Ver Linha do Tempo' associa a estação ao funcionário com `e.name.includes(primeiroNome)`, o que abre a linha do tempo de outra pessoa com o mesmo primeiro nome; nas estações fictícias pode associar a um funcionário real.
- **Impacto:** Dados de frota desatualizados e incorretos, e navegação para a atividade do colaborador errado, com risco de exposição indevida de dados pessoais de monitoramento.
- **Evidência:** Linha 93: `hostname: emp.pcHostName \|\| \`PC-...\``; src/types.ts:25 `computerHost: string;` (não há pcHostName em Employee); linha 536: `employees.find(e => e.name.toLowerCase().includes(st.employeeName.split(' ')[0].toLowerCase()))`; App.tsx:1132-1135 monta o modal sempre com `employees={employees}`. Obs.: a linha de base informa que tsc passa; a divergência de campo foi constatada lendo src/types.ts.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-119 · [MÉDIA] IncrementalInventoryEngine.computeHash ignora conteúdo aninhado e não é SHA-256
- **Arquivo:** `src/utils/agentCollectors/IncrementalEngine.ts`
- **Localização:** IncrementalEngine.ts:17-27 (computeHash); uso em src/components/cmdb/CmdbAgentApiModal.tsx:264
- **Categoria:** Bug / código incompleto
- **Descrição:** `JSON.stringify(data, Object.keys(data).sort())` passa um array como replacer, e esse array funciona como lista de permissão em todos os níveis. Propriedades aninhadas cujo nome não seja uma chave de primeiro nível são descartadas, e objetos como hardware.ram ou os itens de software viram '{}'. O 'hash' é um acumulador de 32 bits estilo djb2 rotulado 'sha256_'. O snapshotHash gerado é enviado ao servidor (CmdbAgentApiModal) e armazenado como hash do snapshot.
- **Impacto:** Snapshots com conteúdo diferente recebem o mesmo hash, o que invalida a detecção de mudança e a verificação de integridade do inventário, e o rótulo engana quem audita.
- **Evidência:** Linha 18: `const jsonStr = JSON.stringify(data, Object.keys(data \|\| {}).sort());`; linhas 20-26: `hash = ((hash << 5) - hash) + char; ... return \`sha256_${hex}_${jsonStr.length}\``; servidor (cmdbRouter.ts:2377) grava `snapshotHash: body.snapshotHash \|\| ...`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-120 · [MÉDIA] Coletores TypeScript retornam inventário fixo no código; motor incremental desconectado
- **Arquivo:** `src/utils/agentCollectors/WindowsCollector.ts`
- **Localização:** WindowsCollector.ts:20-243; LinuxCollector.ts:20-234; MacOSCollector.ts:20-235; AndroidCollector.ts:25-225; IncrementalEngine.ts:32-163 (diff, buildTransmissionPayload, mergeDelta); collectAll() em todos os adapters
- **Categoria:** Desconectado
- **Descrição:** Todas as classes *HardwareCollector/*OSCollector/*SoftwareCollector/*NetworkCollector/*UserCollector/*SecurityCollector devolvem literais (ex.: Dell Latitude 5540, usuário CORP\mariana.silva, 'Ativo e Atualizado'). Rodam no navegador e não coletam nada do SO. Os comentários dizem 'via ActivityManager', 'Android ID permitido' etc. collectAll(), diff(), buildTransmissionPayload() e mergeDelta() não têm nenhuma chamada no projeto; só getPlatformAdapter, *.collect() e computeHash são usados (CmdbAgentApiModal), como payload de exemplo.
- **Impacto:** A arquitetura 'modular por SO' não existe: o motor incremental nunca roda, e quem integrar collectAll() vai persistir dados fictícios como se viessem do dispositivo.
- **Evidência:** WindowsCollector.ts:22-27 `manufacturer: "Dell Inc.", model: "Latitude 5540", serialNumber: "8XYZ992"`; o grep por 'collectAll\(\|buildTransmissionPayload\|mergeDelta' só encontra as definições.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-121 · [MÉDIA] Cache incremental dos coletores nativos nunca evita reenvio (timestamp no hash) e Linux grava cache mesmo em falha
- **Arquivo:** `src/utils/agentCollectors/WindowsCollector.ts`
- **Localização:** WindowsCollector.ts:353, 399-426; LinuxCollector.ts:287, 309-355; MacOSCollector.ts:294-326 (sem cache)
- **Categoria:** Desempenho
- **Descrição:** O hash de comparação é calculado sobre o payload completo, que inclui collectedAt (Get-Date / date -u) e uptimeHours, valores que mudam a cada execução. A condição 'Nenhuma alteração detectada' nunca é satisfeita. No Linux, `curl -s` sem `-f` nem checagem de status grava o hash e imprime 'sincronizado com sucesso' mesmo com 401/500. O macOS nem tem cache.
- **Impacto:** Cada ciclo envia o inventário completo (pior em frotas grandes). O servidor incrementa inventoryVersion a cada envio, gerando snapshots redundantes, e falhas de sincronização ficam invisíveis.
- **Evidência:** WindowsCollector.ts:402 `collectedAt = (Get-Date).ToString("o")` dentro de $Snapshot, hasheado na 414; LinuxCollector.ts:313 `"collectedAt": "$(date -u ...)"` e 338 `CURRENT_HASH=$(echo "$PAYLOAD" \| sha256sum ...)`; 348-355 `curl -s -X POST ...` seguido de `echo "$CURRENT_HASH" > "$CACHE_FILE"`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-122 · [MÉDIA] Coletor nativo Windows: arrays de 1 elemento viram objeto e há valores fixos/erros de nulo
- **Arquivo:** `src/utils/agentCollectors/WindowsCollector.ts`
- **Localização:** WindowsCollector.ts:286-306 ($ramModules, $disks), 290/304/319 (tipos fixos), 361-382 ($Software, $Network), 378 (DefaultIPGateway[0])
- **Categoria:** Bug / código incompleto
- **Descrição:** $Network, $disks e $ramModules recebem a saída de ForEach-Object. Com um único adaptador IPEnabled, um único disco ou um único pente de RAM (casos comuns), o PowerShell devolve um hashtable em vez de array, e o ConvertTo-Json serializa como objeto. O servidor só aceita network quando é array (Array.isArray) e descarta a rede, e a UI do CI também filtra disks com Array.isArray. O tipo de memória é sempre 'DDR5', o de disco sempre 'SSD' e a arquitetura sempre 'x64'. `$_.DefaultIPGateway[0]` em adaptador sem gateway indexa $null e gera erro.
- **Impacto:** Em máquinas típicas (1 NIC, 1 disco) o inventário chega sem rede e com discos e RAM mal tipados, o que corrompe dados do CMDB.
- **Evidência:** WindowsCollector.ts:373 `$Network = Get-CimInstance ... \| ForEach-Object { @{ ... } }` (sem @(...)); 290 `type = "DDR5"`; 304 `type = "SSD"`; servidor cmdbRouter.ts:2431 `const rawNetwork = Array.isArray(body.network) ? body.network : ...`; CmdbCiDetailModal.tsx:869 `Array.isArray(ci.dynamicAttributes?.disks)`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-123 · [MÉDIA] Coletores nativos Linux/macOS/Android incompletos (dados descartados, JSON inválido, sem envio)
- **Arquivo:** `src/utils/agentCollectors/LinuxCollector.ts`
- **Localização:** LinuxCollector.ts:289-296 (DISKS_JSON/NETWORKS_JSON), 309-335; MacOSCollector.ts:273-275, 294-320; AndroidCollector.ts:251-326
- **Categoria:** Bug / código incompleto
- **Descrição:** Linux: DISKS_JSON (lsblk) e NETWORKS_JSON (ip -j addr) são coletados e nunca entram no PAYLOAD, e o JSON é montado por interpolação sem escape (aspas em DMI ou em nome de CPU quebram o JSON; `free` ausente gera `"totalMb": ,`). macOS: `awk -F'"machine_model" : "' '{print $2}'` imprime uma linha vazia para cada linha do JSON do system_profiler, então MODEL e SERIAL ficam com quebras de linha, o que torna o JSON enviado inválido (caractere de controle dentro da string). Android: o código Kotlin gerado ignora os parâmetros serverUrl/token (não interpolados), não envia nada ao servidor, fixa healthPct=98 e não coleta software nem rede.
- **Impacto:** O inventário de servidores Linux chega sem discos e rede; no macOS o POST tende a ser rejeitado pelo parser JSON do Express; no Android o 'coletor' não sincroniza nada.
- **Evidência:** LinuxCollector.ts:292 `DISKS_JSON="$(lsblk -b -J ...)"` e 296 `NETWORKS_JSON=...`, sem uso entre 309-333; MacOSCollector.ts:274 `MODEL="$(echo "$SP_HARDWARE" \| awk -F'"machine_model" : "' '{print $2}' \| cut -d'"' -f1)"`; AndroidCollector.ts:251 recebe (serverUrl, token) mas o template 252-326 não os usa e não tem chamada HTTP; linha 310 `battery.put("healthPct", 98)`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-124 · [BAIXA] Código duplicado e obsoleto entre LgpdAndAgentInstaller e installerScripts; exports, imports e estado sem uso
- **Arquivo:** `src/components/LgpdAndAgentInstaller.tsx`
- **Localização:** LgpdAndAgentInstaller.tsx:2-26 (imports Lock, FileText, Layers, AlertCircle, ExternalLink, QrCode, Box, Radio, Clock sem uso), 33 (employeeName sem uso), 51-118 (individualPsScript não renderizado), 190-198 (downloadFile duplicado); installerScripts.ts:4-12, 190-238 (getUnixScript sem uso), 248-250 (downloadMsiGpoPackage sem uso); SilentAgentFleetModal.tsx:2-31 (Activity, Zap, AlertTriangle, Wifi, HardDrive, Server, Key, Layers sem uso)
- **Categoria:** Duplicado / obsoleto
- **Descrição:** A tela da aba gpo_lgpd mantém sua própria cópia dos scripts (versão antiga, com /api/itam/register, TENANT_TOKEN e C:\Program Files), enquanto installerScripts.ts tem a versão mais nova com enroll e heartbeat, usada só pelo PageHeaderCard. Há downloadFile duplicado, exports nunca importados, imports e estado mortos.
- **Impacto:** Correções feitas em um lugar não chegam ao outro, e os usuários recebem instaladores diferentes conforme o botão clicado.
- **Evidência:** PageHeaderCard.tsx:31 importa só downloadIndividualPs1/downloadIndividualBat; o grep não acha getUnixScript nem downloadMsiGpoPackage fora da definição; LgpdAndAgentInstaller.tsx:33 `const [employeeName, setEmployeeName] = useState('')` sem outras referências.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-125 · [BAIXA] Downloads sem revogar object URL e CSV da frota gerado via data URI sem escape
- **Arquivo:** `src/components/SilentAgentFleetModal.tsx`
- **Localização:** SilentAgentFleetModal.tsx:209-233 (handleExportCsv), 232 e 559/564 ('148' fixo); LgpdAndAgentInstaller.tsx:190-198; installerScripts.ts:4-12
- **Categoria:** Estabilidade
- **Descrição:** downloadFile cria URL.createObjectURL e nunca chama revokeObjectURL. O CSV é montado como data:URI com encodeURI: um '#' em nomes ou departamentos trunca o arquivo, e campos como hostname e MAC não são escapados. As mensagens fixam '148 estações' mesmo quando a contagem real é outra (ex.: mais de 148 funcionários).
- **Impacto:** Pequeno vazamento de memória a cada download e CSV potencialmente truncado ou com contagem incorreta.
- **Evidência:** LgpdAndAgentInstaller.tsx:193 `element.href = URL.createObjectURL(file);` sem revoke; SilentAgentFleetModal.tsx:224-225 `'data:text/csv;charset=utf-8,' + ...` / `encodeURI(csvContent)`; 232 `'Exportação de 148 estações para CSV gerada com sucesso!'`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

### 6.6 Cadastro de usuários e tabelas auxiliares

_Forma de exame: Agente (leitura integral) — 21 achados._

> **Estado do módulo:** A fatia S06 tem duas telas grandes: UserRegistration.tsx, com o diretório de usuários, sessões ativas, matriz RBAC, trilha de auditoria e departamentos, e AuxiliaryTablesManager.tsx, um modal aberto pela Gestão de Ativos para fornecedores, salas, colaboradores, categorias e status. Os dados iniciais vêm de auxiliaryData.ts. Todo o CRUD dessas telas acontece apenas no estado React e no localStorage. Nenhuma operação chama o Supabase nem o servidor Express, embora existam as tabelas public.system_users e public.suppliers e as funções upsertEmployee/deleteEmployee (que o App importa e nunca usa). O cadastro de usuários se perde a cada recarga, porque o App.tsx apaga a chave 'wp_users_list_v1' ao iniciar. O cadastro de colaboradores é sobrescrito pelo Supabase no próximo login. Senhas ficam em texto puro no localStorage, aparecem no formulário de edição e não são usadas em nenhuma autenticação real. A matriz RBAC é só visual: grava no localStorage, não é consultada por nenhum outro módulo e não corresponde às abas reais do App, e qualquer usuário pode mudar o próprio perfil para ADMIN_GERAL. Sessões ativas e trilha de auditoria são dados fictícios fixos no código. A revogação de sessão e a redefinição de senha têm funções prontas, mas nenhum botão as chama, e 'Exportar CSV' da auditoria só mostra um toast. A exclusão de fornecedores, salas, categorias, status, colaboradores e departamentos não verifica vínculos com ativos ou usuários. Além disso, o formulário de edição de ativos ignora as categorias, os status e os fornecedores cadastrados, o que contradiz o texto da própria tela. Existem dois cadastros de departamentos desconectados: o tipo fixo Department e a lista DepartmentItem em localStorage, com nomes diferentes. Isso quebra filtros e contagens. O cadastro também inventa dados: telemetria de produtividade para novos colaboradores, IPs e hostnames aleatórios e fotos de banco de imagens de pessoas reais. Não existe campo de CPF nem validação de CNPJ, de e-mail duplicado ou de IP. Os principais riscos são perda de dados, credenciais expostas, RBAC sem efeito real e falta de integridade referencial.

#### A-126 · [CRÍTICA] Cadastro de usuários do sistema perdido a cada recarga (App apaga wp_users_list_v1)
- **Arquivo:** `src/components/UserRegistration.tsx`
- **Localização:** UserRegistration.tsx:324-340 (useState usersList + useEffect), 690-753 (handleSaveUser); App.tsx:326-333 (inicializador systemUsers), 1027-1030 (onUpdateUsersList); utils/backupManager.ts:85, 437-438
- **Categoria:** Falha de integração
- **Descrição:** O UserRegistration salva usuários em localStorage 'wp_users_list_v1' e avisa o App por onUpdateUsersList. Mas o inicializador de systemUsers no App.tsx executa localStorage.removeItem('wp_users_list_v1') e devolve sempre SYSTEM_USERS a cada carga da aplicação. O backup lê 'wp_users_list_v2', que o App reescreve sempre com SYSTEM_USERS. A restauração grava em v1, chave que o App apaga na próxima carga. Nada é gravado na tabela public.system_users do Supabase.
- **Impacto:** Todo usuário criado, editado, desativado ou excluído some ao recarregar a aplicação. O backup nunca contém os usuários cadastrados e a restauração dura só até a próxima recarga. O administrador acha que o cadastro foi salvo, mas ele não persiste.
- **Evidência:** App.tsx:328-332: "localStorage.removeItem('wp_users_list_v1'); localStorage.setItem('wp_users_list_v2', JSON.stringify(SYSTEM_USERS)); ... return SYSTEM_USERS;". UserRegistration.tsx:325: "localStorage.getItem('wp_users_list_v1')" e 339: "localStorage.setItem('wp_users_list_v1', ...)". backupManager.ts:85: "safeParse('wp_users_list_v2', SYSTEM_USERS)". Não há nenhum .from('system_users') no fluxo de cadastro: a única ocorrência em src/ é sessionSecurity.ts:93, para revogação.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-127 · [CRÍTICA] Colaboradores do modal auxiliar nunca chegam ao Supabase e são sobrescritos no login
- **Arquivo:** `src/components/AuxiliaryTablesManager.tsx`
- **Localização:** AuxiliaryTablesManager.tsx:200-241 (handleSaveEmployee, handleDeleteEmployee); App.tsx:10 (import não usado de upsertEmployee/deleteEmployee), 188-205 (loadSupabaseData), 498-500
- **Categoria:** Falha de integração
- **Descrição:** O CRUD de colaboradores só chama setEmployees, e o App persiste o resultado apenas em localStorage 'wp_employees'. upsertEmployee e deleteEmployee existem em employees.service.ts e são importados no App, mas nunca são chamados. Em cada login, loadSupabaseData substitui o estado local pelos dados do Supabase sempre que a tabela tem linhas.
- **Impacto:** Colaboradores criados ou editados localmente desaparecem no login seguinte, e os excluídos voltam. Cada PC fica com uma base diferente, e as alterações locais são perdidas.
- **Evidência:** App.tsx:10: "import { fetchEmployees, upsertEmployees, upsertEmployee, deleteEmployee }". Grep mostra que upsertEmployee/deleteEmployee só aparecem nesse import. App.tsx:196-198: "if (sbEmployees.length > 0) { setEmployees(sbEmployees); localStorage.setItem('wp_employees', ...)". AuxiliaryTablesManager.tsx:232: "setEmployees(prev => [newEmp, ...prev]);" e 239: "setEmployees(prev => prev.filter(emp => emp.id !== id));".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-128 · [CRÍTICA] Senhas em texto puro no localStorage, exibidas no formulário e incluídas em backup
- **Arquivo:** `src/components/UserRegistration.tsx`
- **Localização:** UserRegistration.tsx:332-340 (senhas padrão injetadas e persistidas), 658 (senha aleatória fraca), 673-688 (handleOpenEditModal carrega a senha armazenada), 710/726/744 (fallback fixo), 768-772 (geração com Math.random), 2369-2392 (campo com botão mostrar senha), 2493-2497; App.tsx:507 (wp_currentUser); data/mockData.ts:25; utils/backupManager.ts:85
- **Categoria:** Segurança
- **Descrição:** O objeto CurrentUser guarda o campo password, que é gravado sem hash em 'wp_users_list_v1' e, pelo setCurrentUser, em 'wp_currentUser'. Na carga, o componente atribui senhas fixas previsíveis aos usuários sem senha ('Admin@WorkPulse2026!' e 'WorkPulse@<ano>'). O modal de edição preenche o campo com a senha armazenada e tem botão para exibi-la. Novas senhas têm só 4 dígitos aleatórios ('WorkPulse@' + Math.floor(1000 + Math.random()*9000)), geradas por Math.random, que não é criptográfico. A senha da conta administrativa vem de SYSTEM_USERS (mockData.ts:25, valor '***'), entra no estado e vai para o backup sem redação.
- **Impacto:** Qualquer pessoa com acesso à estação, ao DevTools ou a um arquivo de backup lê as credenciais. Se a senha embutida for a mesma do login real do Supabase, a conta administrativa fica comprometida. Isso viola a LGPD e boas práticas de segurança.
- **Evidência:** UserRegistration.tsx:334: "password: u.password \|\| (idx === 0 ? 'Admin@***' : `WorkPulse@${2026 + idx}`)" (valor mascarado). Linha 681: "password: user.password \|\| 'WorkPulse@***'". Linha 2374: "type={showPassword ? 'text' : 'password'} value={formData.password}". mockData.ts:25: "password: '***'". App.tsx:507: "localStorage.setItem('wp_currentUser', JSON.stringify(currentUser))".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-129 · [ALTA] Matriz RBAC e perfis de acesso não são aplicados em lugar nenhum (escalada trivial)
- **Arquivo:** `src/components/UserRegistration.tsx`
- **Localização:** UserRegistration.tsx:102-117 (OPERATIONAL_MODULES), 292-318 e 573-614 (permissionsMatrix e toggles), 479-517 (handleApplyBatchRole com o próprio usuário), 718-728 (auto-edição de accessLevel); Navbar.tsx:288-296
- **Categoria:** Segurança
- **Descrição:** A matriz de permissões fica só em localStorage ('wp_rbac_matrix_v1/v2') e não é lida por nenhum outro componente: o grep por accessLevel ===, hasPermission ou permissionsMatrix fora deste arquivo não retorna nada. Os ids dos módulos (realtime, employees, departments, reports, integrations, device_inventory, user_management) não correspondem às abas reais do App (workday, activity, cmdb, infra_topology, wifi_pulse, security_pentest etc.). Qualquer usuário que abre a aba pode mudar o próprio perfil para ADMIN_GERAL, rebaixar a si mesmo ou rebaixar o último administrador, porque não há proteção. Desativar um usuário (status 'Inativo') não tem efeito: o Navbar continua listando todos os availableUsers para 'Trocar Usuário' sem filtrar por status e sem pedir senha.
- **Impacto:** O controle de acesso é decorativo. Perfis COLABORADOR ou GESTORES têm, na prática, acesso total, e os administradores tomam decisões de segurança achando que as restrições valem.
- **Evidência:** UserRegistration.tsx:317: "localStorage.setItem('wp_rbac_matrix_v2', ...)" é o único destino da matriz. Linhas 493-497: "if (selectedUserIds.includes(currentUser.id)) { setCurrentUser({ ...currentUser, accessLevel: targetBatchRole }) }". Navbar.tsx:288-294: "availableUsers.map((user) => ... onClick={() => { setCurrentUser(user); ...". O grep por 'accessLevel\s*(===\|!==\|==)\|hasPermission\|canAccess\|permissionsMatrix' em src/, excluindo UserRegistration, não retornou nada.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-130 · [ALTA] Sessões Ativas fictícias; revogação de sessão sem botão e sem integração
- **Arquivo:** `src/components/UserRegistration.tsx`
- **Localização:** UserRegistration.tsx:191-198 (INITIAL_ACTIVE_SESSIONS), 281, 616-648 (handleTerminateSession, handleTerminateAllIdleSessions), 1520-1606 (aba Sessões Ativas)
- **Categoria:** UI não implementada
- **Descrição:** A aba 'Sessões Ativas em Tempo Real' mostra 6 sessões fixas no código, com pessoas, IPs e hashes JWT inventados. As funções de revogação existem, mas nenhum elemento da interface as chama: a tabela não tem coluna de ações. Elas também só filtrariam o array local, sem chamar sessionSecurity.ts ou o Supabase.
- **Impacto:** O administrador vê dispositivos e tokens que não existem e não consegue revogar sessões reais. A tela passa uma falsa sensação de monitoramento.
- **Evidência:** Linha 192: "{ id: 'sess-101', userId: 'usr-1', userName: 'Carlos Eduardo Silva', ... tokenHash: 'jwt_e8f2...91a2' }". O grep por handleTerminateSession/handleTerminateAllIdleSessions só encontra as definições (616 e 638), sem nenhuma chamada. Linha 619: "showToast(`Sessão de \"${userName}\" foi encerrada e o token JWT foi revogado.`)", mas nada é revogado.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-131 · [ALTA] Trilha de auditoria fictícia, volátil, incompleta e com exportação simulada
- **Arquivo:** `src/components/UserRegistration.tsx`
- **Localização:** UserRegistration.tsx:201-208 (INITIAL_AUDIT_LOGS), 285 (useState), 573-592 (toggle RBAC sem log), 690-766 (criar, editar e excluir usuário sem log), 420-437 e 519-541 (ativar e excluir em lote sem log), 1775-1781 (Exportar CSV)
- **Categoria:** UI não implementada
- **Descrição:** A auditoria começa com 6 registros inventados e vive só em useState: não é persistida nem salva no backup, e é reiniciada sempre que o componente é desmontado, por exemplo ao trocar de aba. Ações sensíveis não geram registro: criação, edição e exclusão individual de usuário, troca de senha, ativação e exclusão em lote, e alteração de permissão na matriz RBAC. O próprio seed mostra um log de 'Alteração de Perfil RBAC'. O botão 'Exportar CSV' só exibe um toast.
- **Impacto:** Não há rastreabilidade real para LGPD ou compliance. Os registros apresentados como evidência de auditoria são falsos e somem ao trocar de aba, e o usuário acha que exportou um arquivo que não foi gerado.
- **Evidência:** Linha 285: "const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);". Linha 1776: "onClick={() => showToast('Logs de auditoria exportados em formato CSV.')}". handleDeleteUser (755-766) e handleBatchDelete (519-541) não chamam setAuditLogs.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-132 · [ALTA] Exclusão e edição de tabelas auxiliares e colaboradores sem integridade referencial
- **Arquivo:** `src/components/AuxiliaryTablesManager.tsx`
- **Localização:** AuxiliaryTablesManager.tsx:99-103 (fornecedor), 129-133 (sala), 138-164 (categoria: edição do código e exclusão), 169-195 (status: edição do código e exclusão), 237-241 (colaborador); UserRegistration.tsx:903-925 (departamento); supabase/migrations/20260924000000_core_business_tables.sql:152-180
- **Categoria:** Banco de dados
- **Descrição:** A exclusão usa só confirm() e filter, sem verificar se algum ativo usa o roomId, o código de categoria ou status, o assignedEmployeeId ou o nome do fornecedor. Também é possível mudar o 'code' de uma categoria ou status existente, o que deixa órfãos os ativos que usam o código antigo. Renomear um colaborador ou fornecedor não atualiza os nomes copiados nos ativos (assignedEmployeeName, supplier). No banco, it_assets.room_id, assigned_employee_id, supplier, category e status são VARCHAR livres, sem FOREIGN KEY. No UserRegistration, o próprio modal diz que os usuários continuam vinculados ao departamento excluído.
- **Impacto:** Ativos ficam apontando para salas, categorias, status ou colaboradores inexistentes. Isso afeta dashboards, topologia e relatórios, além do histórico patrimonial, e cria inconsistências que não se recuperam sem correção manual.
- **Evidência:** AuxiliaryTablesManager.tsx:131: "setRooms(prev => prev.filter(r => r.id !== id));". Linha 145: "{ ...c, ...editingCategory, code }" permite trocar o código. AssetEditModal.tsx:582-583 grava "assignedEmployeeId: empId, assignedEmployeeName: emp ? `${emp.name} (${emp.department})`". SQL: "room_id VARCHAR(64)", "assigned_employee_id VARCHAR(64)", "supplier VARCHAR(255)", sem REFERENCES.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-133 · [ALTA] Tabelas auxiliares só no localStorage; as tabelas do Supabase existem mas não são usadas
- **Arquivo:** `src/components/AuxiliaryTablesManager.tsx`
- **Localização:** AuxiliaryTablesManager.tsx:77-195; App.tsx:261-284; UserRegistration.tsx:247-257, 828/860/885/908 (departamentos); supabase/migrations/20260924000000_core_business_tables.sql:14-31 (system_users), 188-199 (suppliers)
- **Categoria:** Banco de dados
- **Descrição:** Fornecedores, salas, categorias e status são guardados só nas chaves 'wp_suppliers', 'wp_aux_rooms', 'wp_custom_categories' e 'wp_custom_statuses' do localStorage. Departamentos ficam em 'applet_workpulse_departments' e a matriz RBAC em 'wp_rbac_matrix_v2'. A migração cria public.suppliers e public.system_users, mas nenhum serviço em src/services lê ou grava nelas. Não existem tabelas para salas, categorias, status, departamentos, RBAC ou auditoria de usuários. O schema também não é compatível com o front: system_users.id é UUID, enquanto o front gera 'usr-1234'.
- **Impacto:** Cada estação tem seu próprio cadastro e não há fonte única de verdade. Os dados se perdem ao limpar o navegador ou trocar de PC, e uma futura sincronização com o banco vai falhar por incompatibilidade de tipos.
- **Evidência:** App.tsx:271: "localStorage.setItem('wp_suppliers', JSON.stringify(suppliers));". Grep "from\('(system_users\|suppliers\|departments\|..." em todo o projeto: só scripts/check_tables.cjs:69 e sessionSecurity.ts:93. SQL: "id UUID PRIMARY KEY DEFAULT uuid_generate_v4()" em system_users.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-134 · [ALTA] Formulário de edição de ativos ignora categorias, status e fornecedores cadastrados
- **Arquivo:** `src/components/AuxiliaryTablesManager.tsx`
- **Localização:** AuxiliaryTablesManager.tsx:629-631 (texto do rodapé); assetManagement/AssetEditModal.tsx:35-51 (props recebidas e não usadas), 254-264 (status fixo), 272-286 (categoria fixa), 338-344 (fornecedor em texto livre)
- **Categoria:** Falha de integração
- **Descrição:** O rodapé do modal diz que os itens cadastrados 'ficam disponíveis instantaneamente nos selects do formulário de Ativos'. O AssetEditModal recebe suppliers, rooms, categories e statuses, mas não usa nenhuma dessas props. Os selects de status e categoria têm opções fixas e o fornecedor é texto livre. A opção 'hardware_peripheral' (cat-5 do seed) também não está no select fixo.
- **Impacto:** Categorias e status personalizados não podem ser escolhidos na edição de um ativo. Um ativo com categoria personalizada ou 'hardware_peripheral' aparece no select com a primeira opção ('Servidor Hardware') e pode ser gravado errado. O cadastro de fornecedores fica sem uso prático.
- **Evidência:** AuxiliaryTablesManager.tsx:630: "Todos os itens cadastrados aqui ficam disponíveis instantaneamente nos selects do formulário de Ativos.". O grep em AssetEditModal.tsx por suppliers/categories/statuses/rooms só encontra as linhas 35-38 e 48-51, que são declaração e desestruturação. As linhas 277-285 listam opções fixas sem hardware_peripheral.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-135 · [ALTA] Cadastro gera dados fictícios: telemetria de produtividade, IP/host aleatórios e fotos de terceiros
- **Arquivo:** `src/components/AuxiliaryTablesManager.tsx`
- **Localização:** AuxiliaryTablesManager.tsx:207-231 (newEmp); UserRegistration.tsx:650-665 (handleOpenAddModal), 739-744
- **Categoria:** Regra de negócio
- **Descrição:** Um colaborador novo já nasce com productivityScore 85, 8h trabalhadas, 7,2h produtivas, currentApp 'Sistema ERP', agentVersion '4.2.1-lts', IP fixo '192.168.1.100' (igual para todos) e uma foto de banco de imagens de uma pessoa real. O e-mail é gerado no domínio fictício '@empresa.com.br'. No cadastro de usuário, hostname e IP são aleatórios, e o avatar usa uma URL do Unsplash com ID numérico gerado ao acaso, que quase certamente não existe.
- **Impacto:** Rankings, dashboards e relatórios de produtividade passam a mostrar métricas que não vieram de nenhum agente. IPs duplicados afetam correlação de rede e bloqueios, e a foto associa a imagem de outra pessoa a um colaborador real.
- **Evidência:** AuxiliaryTablesManager.tsx:217-222: "ipAddress: editingEmployee.ipAddress \|\| '192.168.1.100', currentApp: 'Sistema ERP', productivityScore: 85, workedHoursToday: 8.0, productiveHoursToday: 7.2". UserRegistration.tsx:660-661: "ipAddress: '192.168.1.' + Math.floor(10 + Math.random() * 200), avatar: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=150`".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-136 · [MÉDIA] Dois cadastros de departamento desconectados e vínculo por nome em texto livre
- **Arquivo:** `src/components/UserRegistration.tsx`
- **Localização:** UserRegistration.tsx:226-233 (INITIAL_DEPARTMENTS), 343 e 982 (filtro por igualdade), 349 e 559 (padrão 'Engenharia'), 927-933 (getDeptUserCount), 2335-2345 e 2615-2625 (selects); AuxiliaryTablesManager.tsx:887-898; types.ts:3-10
- **Categoria:** Falha de integração
- **Descrição:** Usuários do sistema usam a lista DepartmentItem, com nomes como 'Engenharia & TI', 'Vendas & Comercial' e 'Marketing & Mídia'. Colaboradores, regras e o tipo Department usam outra lista fixa ('Engenharia', 'Vendas', 'Marketing'). O formulário e o modal de lote começam com 'Engenharia', valor que não existe nas opções: a tela mostra a primeira opção, mas grava 'Engenharia'. O filtro 'Área' compara com igualdade estrita e não encontra esses usuários. Já getDeptUserCount compara por substring, então um usuário sem departamento ('') entra na contagem de todos os setores. Renomear um departamento não atualiza os usuários, e nomes duplicados são aceitos.
- **Impacto:** Filtros e contagens se contradizem e os usuários acabam gravados num departamento diferente do que aparecia na tela. Departamentos criados no cadastro de usuários não ficam disponíveis para colaboradores, regras de bloqueio ou rankings.
- **Evidência:** Linha 349: "useState<Department>('Engenharia')" com o select de opções departments.map(dept.name). Linha 982: "u.department === selectedDeptFilter". Linha 931: "return uDept === dName \|\| uDept.includes(dName) \|\| dName.includes(uDept);", e ''.includes é sempre true. AuxiliaryTablesManager.tsx:892-897 tem opções fixas 'Engenharia', 'Vendas', 'Marketing' etc.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-137 · [MÉDIA] Validação de cadastro ausente: e-mail duplicado, CNPJ, IP, hostname e códigos únicos
- **Arquivo:** `src/components/UserRegistration.tsx`
- **Localização:** UserRegistration.tsx:690-753 (handleSaveUser); AuxiliaryTablesManager.tsx:77-97 (fornecedor), 138-158 (categoria), 169-189 (status), 200-235 (colaborador)
- **Categoria:** Regra de negócio
- **Descrição:** handleSaveUser só confere se nome e e-mail estão preenchidos e não procura e-mail repetido. O banco tem system_users.email UNIQUE, o que quebraria uma futura sincronização. Fornecedores aceitam qualquer CNPJ, sem dígito verificador, sem máscara e sem checar duplicidade, e a coluna no banco é VARCHAR(18). IP e hostname são texto livre, sem formato e sem unicidade. O código de categoria ou status é gerado com remoção de caracteres não ASCII ('Câmeras' vira 'cmeras'), pode ficar vazio e não é checado contra duplicidade. A vida útil aceita 0 ou valores negativos. Não existe campo de CPF em nenhum dos cadastros.
- **Impacto:** O cadastro aceita usuários e colaboradores duplicados, CNPJs inválidos e códigos de categoria ou status repetidos ou vazios. Como os ativos usam o code como chave lógica, a classificação fica ambígua.
- **Evidência:** UserRegistration.tsx:692: "if (!formData.name \|\| !formData.email) {" é a única validação. AuxiliaryTablesManager.tsx:142: "editingCategory.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')". Linha 1003: "lifespanMonthsDefault: Number(e.target.value)", sem mínimo.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-138 · [MÉDIA] Senha cadastrada não serve para autenticação e redefinição de senha não tem botão
- **Arquivo:** `src/components/UserRegistration.tsx`
- **Localização:** UserRegistration.tsx:549-550, 768-772 (handleGenerateNewPassword), 2460-2511 (modal de redefinição), 2369-2392 (campo Senha de Acesso)
- **Categoria:** Desconectado
- **Descrição:** O campo 'Senha de Acesso' só grava no objeto local. Não há chamada a signUp ou admin.createUser do Supabase, e o login (auth.service.ts, signInWithPassword) não consulta essa lista. handleGenerateNewPassword nunca é chamada, então o modal 'Redefinição de Senha' nunca abre. O modal ainda diz que 'O usuário precisará alterar esta senha no próximo login', o que não está implementado.
- **Impacto:** Usuários cadastrados não conseguem entrar com a senha definida e o administrador não tem como redefinir senhas, embora a interface prometa as duas coisas.
- **Evidência:** O grep por handleGenerateNewPassword só encontra a definição na linha 768. O grep por '.password' fora deste arquivo não mostra uso em autenticação. auth.service.ts:16 usa supabase.auth.signInWithPassword, sem relação com wp_users_list.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-139 · [MÉDIA] Dados pessoais sem proteção LGPD (localStorage em claro, backup e imagens externas)
- **Arquivo:** `src/components/UserRegistration.tsx`
- **Localização:** UserRegistration.tsx:247-257, 324-340; AuxiliaryTablesManager.tsx:210-211; App.tsx:261-284, 498-500; utils/backupManager.ts:76-88
- **Categoria:** Segurança
- **Descrição:** Nome, e-mail, IP, hostname, departamento e senha de usuários e colaboradores ficam em localStorage sem criptografia e entram no payload de backup. Não há registro de consentimento, finalidade, retenção nem anonimização na exclusão: o colaborador excluído continua nos backups. Os avatares padrão são carregados de images.unsplash.com, o que faz requisições externas a cada exibição e associa fotos de terceiros a colaboradores. A trilha 'LGPD' da interface é fictícia (ver o achado da auditoria).
- **Impacto:** Há risco de não conformidade com a LGPD (arts. 6, 37 e 46): dados pessoais ficam expostos na estação e em arquivos de backup, sem registro das operações de tratamento.
- **Evidência:** AuxiliaryTablesManager.tsx:211: "avatar: editingEmployee.avatar \|\| `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150`". backupManager.ts:76 e 85 leem 'wp_employees' e 'wp_users_list_v2' para o backup, sem filtrar campos.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-140 · [BAIXA] Rotas de API e especificação OpenAPI exibidas não existem no servidor (código morto)
- **Arquivo:** `src/components/UserRegistration.tsx`
- **Localização:** UserRegistration.tsx:103-116 (endpointRoute), 167-188 (API_ROUTES_SPEC), 244 ('api_endpoints'), 291 (rbacSubView 'endpoints'), 321 (isOpenApiModalOpen), 1036-1062 (openApiSpecJson), 1714-1716
- **Categoria:** Desconectado
- **Descrição:** A matriz mostra 'Route: /api/v1/...' para cada módulo, e API_ROUTES_SPEC descreve 20 endpoints com escopos JWT. Nenhum existe em server.ts ou server/*.ts: o grep por /users, /rbac, /sessions, /audit/logs, /organization/departments e /hr/employees não acha nada. openApiSpecJson é recalculado a cada render e nunca é exibido. isOpenApiModalOpen, a sub-aba 'api_endpoints' e rbacSubView 'endpoints' não têm interface. O texto fala em '13 Módulos' e a lista tem 14.
- **Impacto:** A documentação de contrato é enganosa para integradores, há processamento desnecessário a cada render e o código morto atrapalha a manutenção.
- **Evidência:** Linha 1715: "Route: {mod.endpointRoute}". Linha 184: "(13 Módulos x 7 Ações x 6 Perfis)", mas OPERATIONAL_MODULES tem 14 itens (103-116). O grep em server.ts e server/**/*.ts só encontrou '/security/dashboard/metrics'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-141 · [BAIXA] Geração de IDs com só 4 dígitos do timestamp (colisão de chaves)
- **Arquivo:** `src/components/UserRegistration.tsx`
- **Localização:** UserRegistration.tsx:399, 461, 501, 623, 733, 846, 863, 888, 911
- **Categoria:** Estabilidade
- **Descrição:** IDs de usuários, departamentos e logs usam Date.now().toString().slice(-4), ou seja, só 10.000 valores possíveis, que se repetem a cada 10 segundos. Usuários com o mesmo id são editados ou excluídos juntos (map/filter por id), e logs com o mesmo id geram chaves React duplicadas.
- **Impacto:** Há chance pequena, mas real, de um usuário ou departamento ser sobrescrito ou excluído por engano, além de avisos e problemas de renderização.
- **Evidência:** Linha 733: "id: `usr-${Date.now().toString().slice(-4)}`". Linha 846: "id: `dept-${Date.now().toString().slice(-4)}`".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-142 · [BAIXA] Exportação CSV de departamentos frágil (encodeURI, aspas sem escape, injeção de fórmula)
- **Arquivo:** `src/components/UserRegistration.tsx`
- **Localização:** UserRegistration.tsx:949-972 (handleExportDeptsCSV)
- **Categoria:** Bug / código incompleto
- **Descrição:** Os valores vão entre aspas sem escapar aspas internas. O conteúdo vai para uma data URI via encodeURI, que não codifica '#': um '#' em nome, gestor ou centro de custo corta o arquivo. Valores que começam com '=', '+', '-' ou '@' não são neutralizados contra injeção de fórmula no Excel. A contagem 'Colaboradores Ativos' herda o erro de getDeptUserCount e conta usuários inativos.
- **Impacto:** O CSV pode sair corrompido, truncado ou executar fórmulas ao ser aberto no Excel.
- **Evidência:** Linha 953: "`\"${d.name}\"`". Linhas 963-964: "const csvContent = 'data:text/csv;charset=utf-8,﻿' + ...; const encodedUri = encodeURI(csvContent);".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-143 · [BAIXA] Modal 'Novo Usuário' reabre sozinho ao voltar para a aba
- **Arquivo:** `src/components/UserRegistration.tsx`
- **Localização:** UserRegistration.tsx:667-671; App.tsx:306, 798-799
- **Categoria:** Bug / código incompleto
- **Descrição:** O useEffect abre o modal sempre que openCreateModalTrigger > 0. O App só incrementa o gatilho e nunca o zera. Depois de usar o atalho de criação uma vez, toda nova montagem do componente (trocar de aba e voltar) executa o effect com valor > 0 e abre o modal sem ação do usuário.
- **Impacto:** O modal de cadastro aparece inesperadamente, o que confunde o usuário e pode levar a cadastros indevidos.
- **Evidência:** Linhas 667-670: "useEffect(() => { if (openCreateModalTrigger && openCreateModalTrigger > 0) { handleOpenAddModal(); } }, [openCreateModalTrigger]);". App.tsx:799: "setUserCreateModalTrigger(prev => prev + 1);".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-144 · [BAIXA] Formulários auxiliares incompletos e visualização em cards inconsistente
- **Arquivo:** `src/components/AuxiliaryTablesManager.tsx`
- **Localização:** AuxiliaryTablesManager.tsx:767-840 (sala sem campo category), 661-746 (fornecedor sem rating), 974-1024 (categoria sem iconName/color), 1045-1095 (status sem cores); UserRegistration.tsx:1494-1509 (card sempre 'Conectado', sem excluir)
- **Categoria:** UI não implementada
- **Descrição:** Os tipos têm campos que nenhum formulário permite editar: EnvironmentRoomItem.category (salas novas sempre ficam 'office'), SupplierItem.rating (sempre 5), CustomCategoryItem.iconName/color e CustomStatusItem.colorBg/colorText. No UserRegistration, a visualização em cards mostra 'Conectado' fixo mesmo para usuários Inativos e não tem botão de exclusão, ao contrário da tabela.
- **Impacto:** Dados ficam com valores padrão incorretos e a interface mostra status errado.
- **Evidência:** AuxiliaryTablesManager.tsx:121: "category: (editingRoom.category as any) \|\| 'office'", sem select correspondente no formulário. UserRegistration.tsx:1496-1498: "<span ...>Conectado</span>" sem condição de status.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-145 · [BAIXA] Código duplicado e obsoleto: matriz RBAC duplicada, gravação dupla de chave, imports não usados
- **Arquivo:** `src/components/UserRegistration.tsx`
- **Localização:** UserRegistration.tsx:2-56 (cerca de 26 ícones importados sem uso), 76-83 (OPERATIONAL_ROLES), 316-318 x 585/609 (gravação em v2 e v1); knowledge/OperationalRbacMatrix.tsx:45-61; AuxiliaryTablesManager.tsx:2-24
- **Categoria:** Duplicado / obsoleto
- **Descrição:** OPERATIONAL_ROLES e uma segunda matriz de módulos (OPERATIONAL_MODULES_13, com ids 'mod-1'...'mod-13' e rotas diferentes) estão duplicadas em knowledge/OperationalRbacMatrix.tsx, então há duas matrizes RBAC divergentes. A matriz é gravada em 'wp_rbac_matrix_v1' dentro dos handlers e em 'wp_rbac_matrix_v2' no effect. OPERATIONAL_MODULES inclui 'integrations' e 'reports', abas que o App descarta como legadas (App.tsx:244). UserRegistration importa cerca de 26 ícones sem uso (Wifi, RefreshCw, Sparkles, Clock, Lock, Copy, Server, Globe, Cpu, Tag, Mail, Laptop...). AuxiliaryTablesManager importa sem usar Sparkles, ExternalLink, Shield, Briefcase, Laptop, MapPin, Save e Check.
- **Impacto:** Manutenção mais difícil, risco de as duas matrizes divergirem e bundle maior.
- **Evidência:** Linha 585: "localStorage.setItem('wp_rbac_matrix_v1', JSON.stringify(updated));" e linha 317: "localStorage.setItem('wp_rbac_matrix_v2', ...)". O grep de '<Wifi\|<Sparkles\|<Clock\|...' em UserRegistration.tsx não retornou nada. O grep de 8 ícones em AuxiliaryTablesManager.tsx retornou 8 ocorrências, todas no import.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-146 · [BAIXA] Seed de fornecedores com empresas e contatos reais usado como base inicial e de reset
- **Arquivo:** `src/data/auxiliaryData.ts`
- **Localização:** auxiliaryData.ts:3-84 (INITIAL_SUPPLIERS); App.tsx:261; utils/backupManager.ts:558
- **Categoria:** Regra de negócio
- **Descrição:** INITIAL_SUPPLIERS traz nomes de empresas reais (Dell, Cisco, Fortinet, HPE, Lenovo, Schneider, HP, Microsoft) com CNPJ, nome de contato, e-mail e telefone. Esses dados entram como base padrão quando o localStorage está vazio e são regravados no reset do backupManager. Não foi possível confirmar se CNPJs e contatos são reais ou corretos. INITIAL_ROOMS_ITAM, INITIAL_CATEGORIES e INITIAL_STATUSES também servem como dados de produção.
- **Impacto:** Um cliente novo começa com fornecedores e contatos que podem estar errados e se misturam aos dados reais. Também há risco de expor dados de terceiros.
- **Evidência:** auxiliaryData.ts:5-12: "name: 'Dell Computers Brasil Ltda', cnpj: '72.381.189/0001-10', contactName: 'Carlos Silveira', email: 'vendas.corporativas@dell.com'". App.tsx:261: "safeGetJson('wp_suppliers', INITIAL_SUPPLIERS)".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

### 6.7 Gestão de ativos — núcleo e ciclo de vida

_Forma de exame: Agente (leitura integral) — 29 achados._

> **Estado do módulo:** O módulo ITAM (AssetManagement + dashboard + ciclo de vida) existe só na interface. Todo o estado mora em React/localStorage, no App.tsx (wp_assets) e no AssetManagement (descoberta/alertas). Cadastro, edição, exclusão, transição de ciclo e manutenção alteram apenas o estado local. O assets.service só é usado para ler e para semear a tabela uma vez: upsertAsset e deleteAsset são importados no App.tsx e nunca chamados. Quando a tabela it_assets já tem dados, cada login sobrescreve o estado local com o conteúdo do Supabase, que está desatualizado e truncado, porque assetToRow descarta dezenas de campos (IP, MAC, sala, contrato, vida útil, agente etc.). Isso causa perda real de dados. Quase todas as integrações entre AssetManagement e os modais/views filhos estão quebradas por nomes de props divergentes: Stepper, TransitionModal, DetailModal, MaintenanceModal, CustodyTermModal e ContractsView. Isso passa despercebido porque @types/react não está instalado, então o tsc não verifica props JSX. Na prática: o filtro por etapa não funciona; ao escolher "Transferência", o app inteiro derruba, porque não há ErrorBoundary; não se cria nem se edita O.S.; o termo de cautela não pode ser confirmado; e a justificativa da transição se perde. A máquina de estados do ciclo de vida não tem nenhuma regra: qualquer etapa vai para qualquer outra, o descarte é reversível e o status só é sincronizado em 4 das 8 etapas. A depreciação é calculada só no momento do salvamento e ignora o valor residual; os valores do seed são estáticos e divergem do cálculo linear, então os KPIs financeiros ficam errados. Boa parte do dashboard é simulada: catálogo de softwares, feed de drift, mapa de topologia, SO inferido por palavra-chave, mínimo fixo de 3 "ativos alterados", textos de severidade e conformidade fixos, e status de agente estático vindo do mock. Os dados mock (INITIAL_IT_ASSETS e descoberta) são o estado padrão em produção e são semeados no Supabase, com referências órfãs a colaboradores removidos. O servidor de segurança também usa esse mock como fonte de ativos. Não existe integração real entre ITAM e CMDB; o CMDB gera tags PAT-2026 aleatórias, independentes do gerador sequencial do ITAM.

#### A-147 · [CRÍTICA] Persistência Supabase unidirecional: criar/editar/excluir ativo nunca é gravado e é sobrescrito no próximo login
- **Arquivo:** `src/App.tsx`
- **Localização:** src/App.tsx linhas 13 (import), 188-239 (loadSupabaseData), 259-268; src/components/AssetManagement.tsx handleSaveAsset (199-296), handleSaveTransition (299-345), handleSaveMaintenance (370-406), handleConfirmCustodyTerm (420-445), handleDeleteAsset (462-466)
- **Categoria:** Banco de dados
- **Descrição:** O App importa fetchAssets, upsertAssets, upsertAsset e deleteAsset, mas só usa fetchAssets e upsertAssets (este apenas para semear a tabela quando está vazia). Todas as mutações do módulo chamam somente setAssets, que persiste em localStorage('wp_assets'). No login seguinte, se it_assets tiver linhas, setAssets(sbAssets) e localStorage.setItem('wp_assets', sbAssets) sobrescrevem tudo o que foi feito localmente.
- **Impacto:** Perda silenciosa de todo cadastro, edição, transição, O.S. e termo feitos após a primeira carga. Ativos excluídos reaparecem. Cada PC vê um inventário diferente até o próximo login.
- **Evidência:** App.tsx:13 `import { fetchAssets, upsertAssets, upsertAsset, deleteAsset }`. O Grep não encontra nenhum outro uso de upsertAsset/deleteAsset no projeto. App.tsx:220-222 `if (sbAssets.length > 0) { setAssets(sbAssets); localStorage.setItem('wp_assets', JSON.stringify(sbAssets)); }`. AssetManagement.tsx:464 `setAssets(prev => prev.filter(a => a.id !== id))` sem chamada ao serviço.
- **Verificação:** CONFIRMADO (conferido manualmente)

#### A-148 · [CRÍTICA] Mapeamento assets.service descarta a maior parte dos campos do ITAsset e lê colunas inexistentes
- **Arquivo:** `src/services/supabase/assets.service.ts`
- **Localização:** assetToRow (linhas 40-64), rowToAsset (linhas 8-38); schema supabase/migrations/20260924000000_core_business_tables.sql linhas 152-180 (idêntico em supabase/MIGRATION_UNICA_COMPLETA.sql 157-185)
- **Categoria:** Banco de dados
- **Descrição:** assetToRow grava só cerca de 20 campos e fixa custom_fields como {}. Não grava roomName, building, floor, quadrantCode, linkedTopologyNodeId, macAddress, ipAddress, lifespanMonths, salvageValue, contractNumber/Type/datas/custo, warrantyType/Sla, custodyTermSigned/Date, assignedDepartment, agentStatus/Version, supplierCnpj/Contact/Email, insurance etc. rowToAsset lê lifecycle_stage_date, lifecycle_notes, supplier_cnpj, supplier_contact, supplier_email e supplier_phone, colunas que não existem na tabela it_assets, e ignora a coluna location.
- **Impacto:** No primeiro login os ativos são semeados truncados. A partir do segundo, o App carrega essas linhas truncadas e regrava o localStorage. IP, MAC, sala, contratos, vida útil (a depreciação volta para 36 meses), termo de cautela, vínculo com a topologia e agente se perdem de forma permanente. As telas de contratos, topologia e depreciação passam a mostrar dados vazios ou padrão.
- **Evidência:** assetToRow retorna apenas id, asset_tag, name, category, brand_model, serial_number, status, lifecycle_stage, supplier, invoice_number, purchase_date, warranty_expiry, assigned_to, assigned_employee_id, room_id, notes, purchase_price, current_value, history, maintenance_records e `custom_fields: {}`. O CREATE TABLE não tem lifecycle_stage_date nem supplier_cnpj.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-149 · [CRÍTICA] Selecionar a etapa 'Transferência' derruba o app (TransitionModal sem employees/rooms)
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** AssetManagement.tsx linhas 1351-1357; AssetTransitionModal.tsx linhas 16-19, 198-229 (employees.map / rooms.map)
- **Categoria:** Estabilidade
- **Descrição:** AssetTransitionModal declara employees e rooms como obrigatórios e chama employees.map e rooms.map quando selectedStage === 'transferencia'. O AssetManagement renderiza o modal só com asset, onClose e onSaveTransition. O projeto não tem nenhum ErrorBoundary.
- **Impacto:** Ao clicar em 'Transferência' no modal de transição, ocorre um TypeError durante o render (undefined.map). Sem ErrorBoundary, o React desmonta a árvore inteira e o usuário fica com a tela em branco. A etapa 6 do ciclo de vida não pode ser executada pela UI.
- **Evidência:** AssetManagement.tsx:1352-1356 `<AssetTransitionModal asset={selectedTransitionAsset} onClose={...} onSaveTransition={handleSaveTransition} />`. AssetTransitionModal.tsx:212 `{employees.map(emp => (` e :226 `{rooms.map(r => (`. Grep por ErrorBoundary/componentDidCatch em src não retornou nada.
- **Verificação:** CONFIRMADO (conferido manualmente)

#### A-150 · [ALTA] Assinatura de onSaveTransition divergente: justificativa, data, custo, novo colaborador e nova sala são perdidos
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** handleSaveTransition (linhas 299-345) x AssetTransitionModal.tsx linhas 21-30 e 62-71
- **Categoria:** Falha de integração
- **Descrição:** O modal chama onSaveTransition(assetId, stage, date, description, user, cost, newEmployeeId, newRoom). O handler do pai espera (assetId, toStage, notes, reason, technician). Assim, notes recebe a data, reason recebe a justificativa e technician recebe o usuário. Custo, colaborador e sala são descartados, e a data do evento é sempre a de hoje. lifecycleStageDate e lifecycleNotes também não são atualizados.
- **Impacto:** O histórico de auditoria registra a data no lugar da justificativa (description = notes = '2026-11-19'). Transferências não trocam o responsável nem o local, custos de transição não são contabilizados e eventos retroativos ficam com a data errada.
- **Evidência:** Modal: `onSaveTransition(asset.id, selectedStage, date, description, user, cost > 0 ? cost : undefined, newEmployeeId \|\| undefined, newRoom \|\| undefined)`. Pai: `(assetId, toStage, notes?, reason?, technician?)`, com `description: notes \|\| ...` e `date: todayStr`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-151 · [ALTA] Ordens de Serviço não podem ser criadas nem editadas (props do MaintenanceModal com nomes errados)
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** AssetManagement.tsx linhas 1373-1385; AssetMaintenanceModal.tsx linhas 5-18, 51-70
- **Categoria:** Falha de integração
- **Descrição:** O pai passa recordToEdit e onSave. O modal espera maintenanceToEdit e onSaveMaintenance. No submit, onSaveMaintenance é undefined e lança TypeError antes de onClose. Na edição, o formulário abre vazio e, se salvasse, geraria um novo id (maint-Date.now()), duplicando a O.S.
- **Impacto:** A funcionalidade principal de manutenção (nova O.S. pela aba Manutenções ou pelo Raio-X) fica inoperante: o botão salvar não faz nada além de um erro no console. A edição de O.S. existente também não funciona.
- **Evidência:** AssetManagement.tsx:1377 `recordToEdit={maintenanceToEdit}` e :1383 `onSave={handleSaveMaintenance}`. AssetMaintenanceModal.tsx:8 `maintenanceToEdit?:`, :10 `onSaveMaintenance:`, :69 `onSaveMaintenance(record);`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-152 · [ALTA] Botões Editar, Imprimir plaqueta e Nova manutenção do Raio-X lançam TypeError (props divergentes)
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** AssetManagement.tsx linhas 1331-1346; AssetDetailModal.tsx linhas 30-38, 111, 125, 595, 652, 662
- **Categoria:** Falha de integração
- **Descrição:** AssetDetailModal exige onEdit, onOpenTagPrint e onOpenNewMaintenance. O pai passa onOpenEdit, onOpenMaintenance e onNavigateToTopology (este último inexistente na interface) e não passa onOpenTagPrint.
- **Impacto:** No Raio-X do ativo, os botões de editar (2x), imprimir plaqueta (2x) e abrir nova manutenção chamam funções undefined e não fazem nada. O fluxo detalhe → ação fica quebrado.
- **Evidência:** AssetDetailModal.tsx:125 `onClick={() => onEdit(asset)}`, :111 `onOpenTagPrint(asset)`, :595 `onOpenNewMaintenance(asset)`. AssetManagement.tsx:1337 `onOpenMaintenance={...}`, :1342 `onOpenEdit={...}`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-153 · [ALTA] Termo de responsabilidade nunca pode ser confirmado (onConfirmTerm x onConfirmSigned)
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** AssetManagement.tsx linhas 420-445 (handleConfirmCustodyTerm) e 1362-1368; AssetCustodyTermModal.tsx linhas 8, 180-182
- **Categoria:** UI não implementada
- **Descrição:** O pai passa onConfirmTerm={handleConfirmCustodyTerm}. O modal só reconhece onConfirmSigned (opcional) e só exibe o botão de confirmação quando ele existe.
- **Impacto:** O botão de confirmar assinatura nunca aparece, e handleConfirmCustodyTerm é código morto. custodyTermSigned, custodyTermDate e o evento 'termo' no histórico só podem ser alterados pela edição genérica. A conformidade de cautela (LGPD/patrimônio) fica sem fluxo próprio.
- **Evidência:** AssetManagement.tsx:1366 `onConfirmTerm={handleConfirmCustodyTerm}`. AssetCustodyTermModal.tsx:180 `{onConfirmSigned && !asset.custodyTermSigned && (`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-154 · [ALTA] Stepper do ciclo de vida recebe props com nomes errados: filtro por etapa quebrado e clique gera TypeError
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** AssetManagement.tsx linhas 826-830; AssetLifecycleStepper.tsx linhas 6-17, 54-61, 73
- **Categoria:** Bug / código incompleto
- **Descrição:** O pai passa selectedStage e onSelectStage. O componente lê selectedStageFilter (padrão 'all') e onSelectStageFilter (obrigatório). Ao clicar em uma etapa, chama onSelectStageFilter(...), que é undefined. O realce da etapa selecionada e o botão 'Limpar filtro' nunca aparecem.
- **Impacto:** O pipeline de 8 etapas exibido na aba Inventário parece interativo, mas não filtra nada e gera erro no console a cada clique.
- **Evidência:** AssetManagement.tsx:828-829 `selectedStage={lifecycleFilter} onSelectStage={setLifecycleFilter}`. AssetLifecycleStepper.tsx:9 `onSelectStageFilter: (stage: string) => void;` e :73 `onClick={() => onSelectStageFilter(isFilterSelected ? 'all' : step.stage)}`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-155 · [ALTA] @types/react ausente: tsc não valida props JSX, o que mascara todas as quebras de contrato entre componentes
- **Arquivo:** `package.json`
- **Localização:** package.json (dependências); tsconfig.json; node_modules/@types/react inexistente
- **Categoria:** Estabilidade
- **Descrição:** O package.json não declara @types/react nem @types/react-dom, e node_modules/@types/react não existe. Sem essas declarações, os elementos JSX ficam efetivamente sem tipo. Por isso 'npx tsc --noEmit' passa com 0 erros, mesmo com props obrigatórias ausentes ou com nomes errados (Stepper, TransitionModal, DetailModal, MaintenanceModal, CustodyTermModal, ContractsView, Kanban).
- **Impacto:** A verificação de tipos dá uma falsa sensação de segurança, e as regressões de integração entre componentes só aparecem em produção.
- **Evidência:** Test-Path node_modules/@types/react = False. O Select-String no package.json mostra apenas @types/ws, @types/express, @types/node e @types/ssh2. Vários usos de props inexistentes/ausentes compilam sem erro.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-156 · [ALTA] Máquina de estados do ciclo de vida sem regras: transições arbitrárias, descarte reversível, status inconsistente
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** handleSaveTransition linhas 299-345; AssetTransitionModal.tsx linhas 129-157; AssetEditModal.tsx linhas 62, 235-236
- **Categoria:** Regra de negócio
- **Descrição:** (1) Qualquer etapa pode ir para qualquer outra, inclusive descarte → utilização e compra → descarte, e a mesma etapa pode ser repetida, porque o modal lista as 8 etapas sem bloqueio e o handler não valida. (2) O status só é sincronizado para descarte, manutenção, utilização e entrada. Compra, instalação, transferência e substituição mantêm o status anterior: um ativo 'descartado' movido para 'compra' continua 'descartado', e um 'em_manutencao' transferido continua em manutenção. (3) O descarte não zera currentValue, não desvincula o colaborador e não exige laudo. (4) O AssetEditModal permite trocar lifecycleStage diretamente, sem evento de histórico e sem sincronizar o status. (5) O padrão de etapa é inconsistente: o Edit usa 'compra' quando falta etapa, enquanto o resto do módulo assume 'utilizacao'. Assim, editar um ativo vindo do Supabase com lifecycle_stage nulo o move silenciosamente para 'compra'.
- **Impacto:** O inventário pode ficar em estados impossíveis (ativo baixado em uso, valor contábil de item descartado somado ao patrimônio), e a trilha de auditoria fica incompleta. Isso compromete a baixa patrimonial e os relatórios.
- **Evidência:** handleSaveTransition: `if (toStage === 'descarte') newStatus = 'descartado'; else if (toStage === 'manutencao') ...; else if (toStage === 'utilizacao') ...; else if (toStage === 'entrada') newStatus = 'em_estoque';`, sem validação de origem. AssetEditModal.tsx:62 `lifecycleStage: asset.lifecycleStage \|\| 'compra'` x AssetManagement.tsx:481/938 `asset.lifecycleStage \|\| 'utilizacao'`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-157 · [ALTA] Depreciação calculada só ao salvar, ignora valor residual e diverge dos valores do seed: KPIs financeiros incorretos
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** handleSaveAsset linhas 205-216; KPIs linhas 498-500, 649-655; aba financeira linhas 1222-1241; src/data/initialAssets.ts (currentValue fixo em todos os itens)
- **Categoria:** Regra de negócio
- **Descrição:** currentValue só é recalculado quando o ativo é salvo pelo modal; com o passar do tempo, nada o atualiza. A fórmula (purchase/lifespan * meses) ignora salvageValue, então pode chegar a zero abaixo do residual. A tabela da aba 'Depreciação Contábil' mostra Depreciação/Mês calculada, mas o Valor Residual vem do currentValue armazenado, e as duas colunas não batem. Os currentValue do seed são constantes arbitrárias. O dashboard soma `Number(a.currentValue) \|\| 0`, enquanto o header usa `currentValue ?? purchaseValue`. O card 'Patrimônio Contábil' exibe o valor de compra.
- **Impacto:** Os valores 'Valor Contábil Líquido', 'Depreciação Acumulada' e '% amortizado' ficam errados e desatualizados para a contabilidade e a tomada de decisão. Exemplo: ast-101 (R$ 48.500, 60 meses, aquisição 2024-02) deveria valer cerca de R$ 21.8 mil em 11/2026 pelo método linear do próprio código, mas exibe R$ 38.800.
- **Evidência:** AssetManagement.tsx:214-215 `const monthlyDep = purchaseVal / lifespan; residualVal = Math.max(0, purchaseVal - (monthlyDep * Math.max(0, diffMonths)));`. :1226 `const resVal = asset.currentValue ?? pVal;`. initialAssets.ts:16-18 `purchaseValue: 48500.00, currentValue: 38800.00, salvageValue: 5000.00`. AssetDashboardView.tsx:852-854 'Patrimônio Contábil' exibe totalPurchaseValue.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-158 · [ALTA] Dashboard de ativos com indicadores, gráficos e textos simulados ou fixos no código
- **Arquivo:** `src/components/assetManagement/AssetDashboardView.tsx`
- **Localização:** FLEET_SOFTWARE_CATALOG linhas 176-187; alteredAssetsCount linha 381; outdatedSoftwareFleetCount 407-409; recentChangesFeed 518-587; getAssetOS 97-139; getAssetTenant/getAssetUnit 141-162 e 245-263; textos fixos 877, 946, 968, 993, 1037, 1156, 1202, 1244, 1300, 1360, 1394-1395, 1458-1459; mini topologia 1484-1535
- **Categoria:** UI não implementada
- **Descrição:** O KPI 'Ativos Alterados' usa Math.max(..., 3), com mínimo fixo de 3. 'Softwares Desatualizados' e 'Softwares Instalados' vêm de um catálogo constante. O feed 'Alterações Recentes (Drift)' é uma lista fixa cujas tags apontam para ativos errados (PAT-2026-0012, servidor descartado, aparece como 'PC-012'; PAT-2026-0009, switch, aparece como 'SRV-DB-PROD'). O SO é inferido por palavras-chave, com padrão 'Windows 11' e servidores ESXi classificados como 'Ubuntu'. Os tenants e unidades são inventados ('WorkPulse Logística', 'Filial Rio de Janeiro'). Há rótulos fixos: '2 Críticos • 3 Altos', '87.4% da frota atualizada', 'Ping < 5 min (Latência ~4ms)', 'Maior concentração: Dell Technologies'. O mapa de topologia é estático (FortiGate 192.168.1.1, '18 Estações Ativas', '3 APs Ubiquiti').
- **Impacto:** O gestor vê indicadores que parecem telemetria real, mas são fictícios ou não refletem o inventário, e pode decidir com base neles (patches, drift, severidades).
- **Evidência:** Linha 381 `return Math.max(fromInventory, fromDiscovery, 3); // Minimum 3 verified in initial baseline`. Linha 993 `2 Críticos • 3 Altos`. Linha 1037 `87.4% da frota atualizada`. Linhas 565-566 `assetName: 'PC-012', assetTag: 'PAT-2026-0012'`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-159 · [ALTA] Dados mock (INITIAL_IT_ASSETS e descoberta) usados como estado padrão em produção e semeados no Supabase, com referências órfãs
- **Arquivo:** `src/data/initialAssets.ts`
- **Localização:** initialAssets.ts (13 ativos); App.tsx linhas 224-225, 259, 409; AssetManagement.tsx linhas 120-142 (INITIAL_DISCOVERED_ASSETS/INITIAL_DISCOVERY_ALERTS); src/utils/backupManager.ts 80, 557
- **Categoria:** Banco de dados
- **Descrição:** Na falta de localStorage, o estado inicial é o mock, e com it_assets vazia o mock é gravado no banco (upsertAssets). O mock referencia colaboradores inexistentes: assignedEmployeeId 'usr-admin-01' (ast-102, ast-103) e 'usr-dir-02' (ast-108) não existem em INITIAL_EMPLOYEES, depois que o commit recente eliminou as contas legadas. Há MAC duplicado: '00:1A:2B:3C:4D:5E' em ast-101 (servidor) e ast-023 (PC). Os fornecedores reais aparecem com CNPJ e e-mail. A Central de Descoberta também inicia com ativos e alertas fictícios persistidos em localStorage.
- **Impacto:** A instalação de produção nasce com 13 ativos e cerca de R$ 300 mil de patrimônio fictício no banco, misturados aos reais, além de vínculos quebrados de responsável. A deduplicação por MAC da descoberta pode associar o equipamento errado.
- **Evidência:** App.tsx:224-225 `const localAssets = safeGetJson('wp_assets', INITIAL_IT_ASSETS); if (localAssets.length > 0) await upsertAssets(localAssets);`. initialAssets.ts:152 `assignedEmployeeId: 'usr-admin-01'` e :558 `'usr-dir-02'`. O Grep mostra que esses ids só existem em initialAssets.ts e security_persisted.json. initialAssets.ts:45 e :863 `macAddress: '00:1A:2B:3C:4D:5E'`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-160 · [ALTA] Servidor de segurança usa o mock INITIAL_IT_ASSETS como fonte de ativos
- **Arquivo:** `server/security/securityIntegrationBridge.ts`
- **Localização:** linha 19 (import) e getAssetSecurityProfile linhas 195-208
- **Categoria:** Falha de integração
- **Descrição:** O perfil unificado de segurança do ativo busca o ativo no array estático do front, não no inventário real (Supabase/localStorage), e usa '192.168.1.100' como IP padrão.
- **Impacto:** Ativos cadastrados de verdade não têm perfil de segurança (retorno null quando não há CI correspondente), e os ativos fictícios do seed aparecem correlacionados a findings. A integração ITAM ↔ Segurança fica enganosa.
- **Evidência:** `const allAssets: ITAsset[] = INITIAL_IT_ASSETS;` e `const ipAddress = ci?.ipAddress \|\| asset?.ipAddress \|\| '192.168.1.100';`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-161 · [MÉDIA] Filtro de etapa da tabela não reage (lifecycleFilter fora das dependências do useMemo)
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** filteredAssets useMemo, linhas 469-495
- **Categoria:** Bug / código incompleto
- **Descrição:** O filtro usa lifecycleFilter (linha 481), mas a lista de dependências do useMemo não o inclui. Mudar o select 'Todas as 8 Etapas' não recalcula a lista até que outra dependência mude (busca, categoria etc.).
- **Impacto:** A tabela de inventário mostra resultados desatualizados ou incoerentes com o filtro de etapa selecionado. Somado ao bug do Stepper, o filtro por ciclo de vida fica praticamente inutilizável.
- **Evidência:** Linha 481 `const matchLifecycle = lifecycleFilter === 'all' \|\| ...`. Linha 495 `}, [assets, searchTerm, categoryFilter, statusFilter, sortBy, sortOrder]);`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-162 · [MÉDIA] AssetContractsView recebe onOpenAssetDetail, mas usa onOpenDetail (TypeError ao abrir detalhe)
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** AssetManagement.tsx linhas 1160-1166; AssetContractsView.tsx linhas 17-25, 197
- **Categoria:** Falha de integração
- **Descrição:** O pai passa onOpenAssetDetail. O componente desestrutura e chama onOpenDetail, que fica undefined.
- **Impacto:** Na aba Contratos & Fornecedores, o botão de abrir o detalhe do ativo não funciona e gera erro.
- **Evidência:** AssetManagement.tsx:1163 `onOpenAssetDetail={(asset) => setSelectedDetailAsset(asset)}`. AssetContractsView.tsx:197 `onClick={() => onOpenDetail(asset)}`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-163 · [MÉDIA] Critérios de 'Garantias vencendo < 90 dias' divergentes entre header/aba e dashboard; garantias já vencidas somem da lista
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** AssetManagement.tsx expiringWarranties linhas 507-517; AssetDashboardView.tsx linhas 318-322 e 398-404
- **Categoria:** Regra de negócio
- **Descrição:** O header e a aba 'Alertas de Garantia' contam apenas expDate >= hoje e <= 90 dias, então garantias já vencidas não aparecem em lugar nenhum. O dashboard conta exp <= 90 dias, incluindo vencidas e ativos descartados. Nenhum dos dois exclui ativos com status 'descartado'.
- **Impacto:** Os dois cards de garantia mostram números diferentes para o mesmo indicador. Com o seed, em 19/11/2026 o header mostra 1 e o dashboard mostra 4. Ativos em uso com garantia vencida (ex.: ast-106, ast-107) não geram alerta de renovação.
- **Evidência:** AssetManagement.tsx:515 `return expDate >= today && expDate <= in90Days;`. AssetDashboardView.tsx:402 `return !isNaN(exp.getTime()) && exp <= ninetyDaysFromNow;`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-164 · [MÉDIA] Cobertura de agentes pode passar de 100% (numerador e denominador com universos diferentes)
- **Arquivo:** `src/components/assetManagement/AssetDashboardView.tsx`
- **Localização:** agentCoveragePct linhas 366-370
- **Categoria:** Regra de negócio
- **Descrição:** O numerador conta todos os ativos com agente online (inclusive switches, nobreaks, impressoras, monitores e APs), mas o denominador inclui só workstations e servidores.
- **Impacto:** Com o seed, há 9 ativos online contra 6 compatíveis, e o card exibe '150% Cobertura'. É um KPI matematicamente inválido.
- **Evidência:** `const compatible = filteredAssets.filter(a => a.category === 'hardware_workstation' \|\| a.category === 'hardware_server').length; return Math.round((agentsOnlineCount / compatible) * 100);`, com agentsOnlineCount calculado sobre todos os filteredAssets.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-165 · [MÉDIA] Status de agente (online/offline, último ping, versão) é estático e vem do mock
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** AssetManagement.tsx linhas 1010-1027; AssetDashboardView.tsx linhas 358-364, 384-389; src/data/initialAssets.ts (agentStatus/agentLastPing em todos os itens)
- **Categoria:** UI não implementada
- **Descrição:** agentStatus e agentLastPing ('há 12 seg') são strings fixas do seed. Fora do seed, agentStatus só é definido na aprovação de ativo descoberto (CentralDiscoveryHub.tsx:254, assetMatchingEngine.ts:337). Nenhum fluxo atualiza heartbeat a partir do agente real.
- **Impacto:** Os cards 'Agentes Online/Offline', o filtro 'Apenas Agentes Online' e os badges da tabela não refletem o estado real dos agentes.
- **Evidência:** initialAssets.ts:50-51 `agentStatus: 'online', agentLastPing: 'há 12 seg'`. O Grep por `agentStatus\s*:` fora de src/data encontrou só CentralDiscoveryHub.tsx:254, assetMatchingEngine.ts:337 e HardeningBaselinesView.tsx:95.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-166 · [MÉDIA] Sem integração ITAM ↔ CMDB; o CMDB gera tags PAT-2026 aleatórias independentes do gerador do ITAM
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** AssetManagement.tsx handleGenerateNextTag linhas 186-196 (nenhuma chamada a /api); server/cmdbRouter.ts linhas 1945, 2636, 3884, 3895
- **Categoria:** Falha de integração
- **Descrição:** Nenhum arquivo do ITAM chama a API /api/v1 do CMDB (Grep por cmdb, /api/ e fetch( retornou vazio). O ITAM gera tags sequenciais PAT-AAAA-NNNN a partir do estado local, enquanto o CMDB no servidor gera `PAT-2026-${Math.floor(1000 + Math.random()*9000)}` ou `PAT-2026-${Date.now().slice(-4)}`.
- **Impacto:** O mesmo equipamento recebe tombos diferentes nos dois módulos, com risco de colisão de tags (inclusive a UNIQUE asset_tag no banco). Não há reconciliação entre CI e ativo patrimonial.
- **Evidência:** cmdbRouter.ts:1945 `assetTag: \`PAT-2026-${Math.floor(1000 + Math.random() * 9000)}\``. AssetManagement.tsx:190 `a.assetTag.match(/PAT-\d+-(\d+)/)`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-167 · [MÉDIA] Modal 'Cadastrar Novo Ativo' reabre sozinho toda vez que a aba é montada
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** AssetManagement.tsx linhas 447-459; App.tsx linhas 307, 802, 1051-1067
- **Categoria:** Bug / código incompleto
- **Descrição:** assetCreateModalTrigger no App só é incrementado e nunca volta a zero. Como AssetManagement é desmontado e remontado a cada troca de aba (renderização condicional), o useEffect com `openAddModalTrigger > 0` dispara de novo no mount.
- **Impacto:** Depois de usar uma vez o atalho global de novo ativo, toda volta à aba Gestão de Ativos abre o formulário de cadastro sem pedido do usuário.
- **Evidência:** AssetManagement.tsx:448 `if (openAddModalTrigger && openAddModalTrigger > 0) { setEditingAsset({...}) }`. App.tsx:802 `setAssetCreateModalTrigger(prev => prev + 1);` e :1051 `{activeTab === 'asset_management' && (<AssetManagement ...`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-168 · [MÉDIA] Plaqueta com 'QR Code' é só um ícone e 'Imprimir' imprime a página inteira
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** linhas 1390-1459
- **Categoria:** UI não implementada
- **Descrição:** O QR exibido é o ícone <QrCode> do lucide, sem codificar a tag (o próprio comentário diz 'SVG SIMULATED BARCODE & QR'). O botão 'Imprimir Plaqueta (Etiqueta Térmica)' chama window.print() sem CSS de impressão, o que imprime a aplicação inteira.
- **Impacto:** A plaqueta física não pode ser lida por leitor de QR/código de barras, e a impressão em etiqueta térmica não funciona como prometido.
- **Evidência:** Linha 1434 `{/* SVG SIMULATED BARCODE & QR */}`, linha 1436 `<QrCode className="w-12 h-12 text-slate-950" />`, linha 1449 `onClick={() => window.print()}`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-169 · [MÉDIA] Manutenção não altera o status/ciclo do ativo, não acumula custo e duplica eventos de histórico
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** handleSaveMaintenance linhas 370-406; handleCompleteMaintenance 409-417
- **Categoria:** Regra de negócio
- **Descrição:** Abrir uma O.S. não muda o status para em_manutencao nem a etapa para 'manutencao'. Concluir não devolve o ativo para em_uso. totalMaintenanceCost não é atualizado. Cada salvar ou concluir acrescenta um novo evento de histórico 'O.S. Manutenção', inclusive em edições da mesma O.S.
- **Impacto:** O inventário mostra ativos 'Em Uso' com O.S. aberta, o custo total de manutenção (TCO) fica desatualizado e o histórico fica poluído com eventos repetidos.
- **Evidência:** handleSaveMaintenance só atualiza `maintenances` e `history: [historyItem, ...]`, sem tocar em status, lifecycleStage ou totalMaintenanceCost. handleCompleteMaintenance chama handleSaveMaintenance, que gera mais um evento.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-170 · [MÉDIA] Exclusão física de ativo patrimonial sem baixa nem trilha de auditoria
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** handleDeleteAsset linhas 462-466; botão linhas 1107-1113
- **Categoria:** Regra de negócio
- **Descrição:** O botão de lixeira remove o ativo do array após um confirm(), sem exigir a etapa 'descarte', sem registrar quem excluiu e sem soft-delete. Como não chama deleteAsset, o ativo reaparece após o login (ver achado de persistência).
- **Impacto:** Patrimônio pode sumir do inventário sem registro de baixa (problema para contabilidade e auditoria) ou reaparecer de forma inconsistente.
- **Evidência:** `if (confirm('Tem certeza ...')) { setAssets(prev => prev.filter(a => a.id !== id)); }`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-171 · [MÉDIA] Esquema it_assets: RLS totalmente permissiva, sem FKs e unicidade de tombo não validada no front
- **Arquivo:** `supabase/migrations/20260924000000_core_business_tables.sql`
- **Localização:** CREATE TABLE it_assets linhas 152-180; policies linhas 312-316; AssetEditModal.tsx (sem verificação de tag duplicada)
- **Categoria:** Banco de dados
- **Descrição:** A política 'authenticated_write_it_assets' é FOR ALL TO authenticated USING (true) WITH CHECK (true): qualquer usuário autenticado altera ou apaga todo o inventário, sem papel nem tenant. assigned_employee_id e room_id não têm REFERENCES. asset_tag é UNIQUE, mas o front permite editar a tag livremente sem checar duplicidade (AssetEditModal não recebe a lista de ativos).
- **Impacto:** Risco de alteração indevida do patrimônio por qualquer conta. Vínculos órfãos não detectados. Um tombo duplicado faz o upsert em lote falhar inteiro.
- **Evidência:** `CREATE POLICY "authenticated_write_it_assets" ON public.it_assets FOR ALL TO authenticated USING (true) WITH CHECK (true);`. `assigned_employee_id VARCHAR(64),` sem FK. Grep por 'duplic\|já existe\|unique' no AssetEditModal sem resultado.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-172 · [BAIXA] Filtros e badges com categorias/status fixos no código: ignoram cadastros auxiliares e omitem categorias existentes
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** AssetManagement.tsx linhas 861-890 (selects), 936-937 (fallbacks), 471-477 (busca); AssetDashboardView.tsx linhas 731-763
- **Categoria:** Bug / código incompleto
- **Descrição:** Os selects de categoria e status são fixos e não usam categories/statuses do AuxiliaryTablesManager. O filtro da tabela não tem 'hardware_peripheral', e o do dashboard não tem peripheral, mobile_tablet nem other. Um status customizado aparece com o badge 'Em Estoque' (fallback statusConfig.em_estoque) e uma categoria customizada como 'Outros'. O placeholder da busca promete 'Fornecedor, Contrato', mas a busca não consulta supplier nem contractNumber.
- **Impacto:** Ativos de categorias/status cadastrados pelo usuário não podem ser filtrados e são exibidos com rótulo enganoso, e a busca não encontra o que promete.
- **Evidência:** Linha 937 `const statInfo = statusConfig[asset.status] \|\| statusConfig.em_estoque;`. Linha 841 `placeholder="Buscar por Tombo, Nome, Fornecedor, Contrato ou Colaborador..."`. As linhas 866-876 não têm `hardware_peripheral`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-173 · [BAIXA] Navegações e callbacks do dashboard ignorados ou não usados (aba da descoberta, nó da topologia, seleção de ativo)
- **Arquivo:** `src/components/assetManagement/AssetDashboardView.tsx`
- **Localização:** AssetDashboardView.tsx linhas 902, 930, 952, 974, 1414 (tabKey), 1475, 1541 (onClick={onNavigateToTopology}), 202 (onSelectAsset nunca chamado), 195-196, 355, 591 (variáveis sem uso); AssetManagement.tsx 795-797; App.tsx 1065
- **Categoria:** Desconectado
- **Descrição:** Os cards passam tabKey ('new_assets', 'changed_assets', 'no_agent', 'alerts'), mas o pai ignora o parâmetro e o CentralDiscoveryHub não aceita aba inicial. onNavigateToTopology é passado direto como onClick (recebe o MouseEvent como nodeId), e o App ignora o nodeId, então linkedTopologyNodeId nunca focaliza o nó. onSelectAsset, categories, statuses, totalCurrentValue e STATUS_COLORS não são usados.
- **Impacto:** Os cards de drill-down levam todos à mesma tela genérica, sem o recorte prometido, e a navegação para o nó do ativo na topologia não existe.
- **Evidência:** AssetManagement.tsx:795-797 `onNavigateToDiscovery={(tabKey) => { setActiveSubTab('discovery_hub'); }}`. App.tsx:1065 `onNavigateToTopology={() => setActiveTab('infra_topology')}`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-174 · [BAIXA] Código redundante e props/imports não usados no ciclo de vida (Kanban, Stepper, lifecycleConfig); rótulo duplicado '1. 1. Compra'
- **Arquivo:** `src/components/assetManagement/lifecycleConfig.tsx`
- **Localização:** lifecycleConfig.tsx linhas 15-34 (stage/id/key, stepNumber/step/order, color/badgeColor duplicados); AssetLifecycleKanban.tsx linhas 2-14, 17-21 x AssetManagement.tsx 1134-1135; AssetLifecycleStepper.tsx linha 10; AssetManagement.tsx linhas 855 e 988-989
- **Categoria:** Duplicado / obsoleto
- **Descrição:** Cada etapa repete o mesmo identificador em 3 campos e a ordem em 3 campos. O Kanban recebe onOpenCustodyTerm e onOpenEdit do pai, mas não os declara nem usa, e importa ícones e AssetLifecycleStage sem uso. Os textos 'Automatizadas' e 'Avançar para a próxima etapa' não correspondem a nenhuma automação. onQuickTransition do Stepper nunca é usado. Como label já contém o número ('1. Compra'), a tabela e o select exibem '1. 1. Compra'.
- **Impacto:** Manutenção mais difícil, risco de divergência entre campos duplicados e rótulos duplicados na UI.
- **Evidência:** lifecycleConfig.tsx:38-45 `stage: 'compra', id: 'compra', key: 'compra', label: '1. Compra', ... stepNumber: 1, step: 1, order: 1`. AssetManagement.tsx:855 `{stage.step}. {stage.label}`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-175 · [BAIXA] useMemo do dashboard invalidado a cada render (Date criado no corpo do componente)
- **Arquivo:** `src/components/assetManagement/AssetDashboardView.tsx`
- **Localização:** linhas 292-293, 350, 404
- **Categoria:** Desempenho
- **Descrição:** ninetyDaysFromNow é um novo objeto Date a cada render e aparece nas dependências de filteredAssets e expiringWarrantiesCount. Assim, esses memos e os que dependem de filteredAssets (gráficos) são recalculados sempre.
- **Impacto:** Recalcula filtros e gráficos (com getAssetOS/getAssetTenant por item) a cada render. O impacto é baixo com poucos ativos, mas cresce com inventários grandes.
- **Evidência:** `const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);` e a lista de dependências `[..., ninetyDaysFromNow, discoveryAlerts, discoveredAssets]`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

### 6.8 Gestão de ativos — modais e visões

_Forma de exame: Agente (leitura integral) — 29 achados._

> **Estado do módulo:** A fatia S08 (modais e visões de Gestão de Ativos) tem a interface completa, mas a integração com o componente pai src/components/AssetManagement.tsx está quebrada em 5 dos 7 pontos de montagem. Os nomes de props que o pai passa não batem com os que os filhos esperam: AssetMaintenanceModal (onSave/recordToEdit contra onSaveMaintenance/maintenanceToEdit), AssetDetailModal (onOpenEdit/onOpenMaintenance contra onEdit/onOpenNewMaintenance/onOpenTagPrint), AssetCustodyTermModal (onConfirmTerm contra onConfirmSigned), AssetContractsView (onOpenAssetDetail contra onOpenDetail) e AssetTransitionModal (sem employees/rooms e com assinatura de callback divergente). Na prática não se cria nem edita ordem de manutenção pelo modal, os botões Editar, Plaqueta e Nova OS do detalhe lançam TypeError, o termo de cautela nunca pode ser marcado como assinado pelo próprio termo, e a transição grava a data no lugar da justificativa e descarta custo, novo colaborador e nova sala. Além disso, ao selecionar "Transferência" (que já vem pré-selecionada para ativos em "Manutenção"), a transição derruba a aplicação inteira, porque não existe ErrorBoundary. O "npx tsc --noEmit" passa sem erros só porque o @types/react não está instalado nem declarado: o JSX fica sem checagem de tipos e todas essas divergências passam despercebidas. Funcionam de verdade: o AssetEditModal (criar e editar, só no estado local), o histórico manual do detalhe, a listagem e a conclusão de manutenção na AssetMaintenanceView, a aprovação de ativo descoberto (ApproveAssetModal) e a impressão do termo via window.print. A persistência é só localStorage. O Supabase recebe os ativos uma única vez (seed, quando a tabela está vazia), e o mapeamento assetToRow descarta contrato, custódia, garantia, localização, rede e vida útil. Nos logins seguintes o snapshot do Supabase sobrescreve o estado local, o que apaga as edições. O termo de custódia é um documento só impresso, sem assinatura digital nem arquivamento, e preenche dados fictícios quando faltam informações. As regras de negócio são fracas: aprovação sem identificação nem autorização do aprovador, colaborador atribuído automaticamente ao primeiro da lista por um bug de comparação, tombo sugerido sem garantia de unicidade, ciclo de vida sem máquina de estados (um ativo descartado pode voltar a uso), status e etapa alteráveis pela edição sem deixar registro na trilha de auditoria, custo acumulado de manutenção e valor residual nunca recalculados, e números de série fictícios gerados ao acaso.

#### A-176 · [CRÍTICA] Edições de ativos (contratos, custódia, manutenções, histórico) não chegam ao Supabase e são sobrescritas no login seguinte
- **Arquivo:** `src/services/supabase/assets.service.ts`
- **Localização:** assetToRow nas linhas 40-64; uso em src/App.tsx 220-226 (único upsertAssets), 259 e 266-268; schema em supabase/MIGRATION_UNICA_COMPLETA.sql 157-185
- **Categoria:** Banco de dados
- **Descrição:** Todos os modais da fatia alteram apenas o estado React do pai (setAssets), que é espelhado no localStorage 'wp_assets'. upsertAsset e deleteAsset nunca são chamados. upsertAssets só roda para semear o Supabase quando a tabela está vazia. Quando já há dados, loadSupabaseData faz setAssets(sbAssets) e sobrescreve o localStorage com o snapshot do banco. Além disso, assetToRow não grava contractNumber, contractType, contractStart/EndDate, contractMonthlyCost, custodyTermSigned/Date, warrantyType/Sla, lifespanMonths, salvageValue, supplierCnpj/Contact, roomName, building, floor, locationDetails, ip/mac nem assignedDepartment. custom_fields é sempre gravado como {}, e a tabela it_assets não tem colunas para esses campos.
- **Impacto:** Com o Supabase configurado e a tabela populada, toda O.S., transição, termo assinado, contrato e edição feita nesta fatia some no próximo login ou carregamento de sessão. Mesmo os dados semeados perdem todo o bloco contratual e de custódia (perda de dados patrimoniais e da trilha de auditoria).
- **Evidência:** App.tsx: 'if (sbAssets.length > 0) { setAssets(sbAssets); localStorage.setItem(\'wp_assets\', JSON.stringify(sbAssets)); } else { ... await upsertAssets(localAssets); }'. Grep 'upsertAsset(\|deleteAsset(' em src: só a definição. assetToRow: '... purchase_price: a.purchaseValue, current_value: a.currentValue, history: ..., maintenance_records: ..., custom_fields: {}'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-177 · [ALTA] AssetMaintenanceModal: props com nomes diferentes dos passados pelo pai; não dá para salvar nem editar O.S.
- **Arquivo:** `src/components/assetManagement/AssetMaintenanceModal.tsx`
- **Localização:** Props nas linhas 5-11 e 13-19; chamada onSaveMaintenance(record) na linha 69; montagem no pai em src/components/AssetManagement.tsx 1374-1384
- **Categoria:** Falha de integração
- **Descrição:** O componente espera as props 'maintenanceToEdit' e 'onSaveMaintenance', mas o pai passa 'recordToEdit' e 'onSave'. Com isso onSaveMaintenance chega undefined, e o modal de edição abre vazio, como se fosse uma O.S. nova.
- **Impacto:** Clicar em 'Salvar Ordem de Manutenção' lança TypeError (onSaveMaintenance is not a function): nada é salvo e o modal não fecha. Não é possível abrir nem editar O.S. pela tela de Manutenções nem pelo detalhe do ativo. O botão 'Editar Ordem' abre o formulário em branco. handleSaveMaintenance só é alcançado pelo botão 'Concluir' da listagem.
- **Evidência:** Filho: 'maintenanceToEdit?: AssetMaintenanceRecord; onClose: () => void; onSaveMaintenance: (record: AssetMaintenanceRecord) => void;' e 'onSaveMaintenance(record); onClose();'. Pai: '<AssetMaintenanceModal assets={assets} initialAsset={maintenanceInitialAsset} recordToEdit={maintenanceToEdit} ... onSave={handleSaveMaintenance} />'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-178 · [ALTA] AssetDetailModal: Editar, Imprimir Plaqueta e Abrir O.S. chamam callbacks inexistentes
- **Arquivo:** `src/components/assetManagement/AssetDetailModal.tsx`
- **Localização:** Props nas linhas 30-39 e 41-50; onOpenTagPrint nas linhas 111 e 652; onEdit nas linhas 125 e 662; onOpenNewMaintenance na linha 595; montagem no pai em src/components/AssetManagement.tsx 1331-1346
- **Categoria:** Falha de integração
- **Descrição:** O modal espera 'onEdit', 'onOpenTagPrint' e 'onOpenNewMaintenance'. O pai passa 'onOpenEdit', 'onOpenMaintenance' e 'onNavigateToTopology', e não passa nada para a plaqueta. As três funções chegam undefined. 'onNavigateToTopology' é ignorado: o modal não tem link para a topologia, embora importe o ícone ExternalLink.
- **Impacto:** Os botões 'Editar Ativo' (header e rodapé), 'Imprimir Plaqueta QR' (header e rodapé) e 'Abrir Ordem de Manutenção' lançam TypeError e não fazem nada. O 'raio-X' do ativo não consegue editar, imprimir plaqueta nem abrir O.S.
- **Evidência:** Filho: 'onEdit: (asset: ITAsset) => void; onOpenTagPrint: ...; onOpenNewMaintenance: ...' e 'onClick={() => onEdit(asset)}'. Pai: '<AssetDetailModal ... onOpenMaintenance={(asset) => {...}} onOpenEdit={(asset) => setEditingAsset(asset)} onAddHistoryEvent={handleAddHistoryEvent} onNavigateToTopology={onNavigateToTopology} />'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-179 · [ALTA] AssetTransitionModal derruba a aplicação ao selecionar 'Transferência' (employees/rooms não são passados)
- **Arquivo:** `src/components/assetManagement/AssetTransitionModal.tsx`
- **Localização:** employees.map na linha 212; rooms.map na linha 226; etapa sugerida nas linhas 43-48; montagem no pai em src/components/AssetManagement.tsx 1351-1357
- **Categoria:** Estabilidade
- **Descrição:** O pai monta o modal sem as props obrigatórias 'employees' e 'rooms', e o filho não define valor padrão para elas. Quando selectedStage === 'transferencia', o bloco de transferência chama employees.map(...) sobre undefined. Para ativos na etapa 'manutencao', 'transferencia' é a etapa sugerida por padrão, então o erro acontece já na abertura do modal.
- **Impacto:** O erro acontece durante a renderização e o projeto não tem ErrorBoundary (nenhuma ocorrência em src/). O React desmonta a árvore inteira e a aplicação fica em branco até recarregar. A transferência de custódia fica inutilizável.
- **Evidência:** Pai: '<AssetTransitionModal asset={selectedTransitionAsset} onClose={...} onSaveTransition={handleSaveTransition} />' (sem employees/rooms). Filho: '{employees.map(emp => (<option ...' e '{rooms.map(r => (...'. Grep de ErrorBoundary/componentDidCatch em src: nenhum resultado.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-180 · [ALTA] Assinatura de onSaveTransition diverge do handler do pai: justificativa, data, custo, colaborador e sala se perdem
- **Arquivo:** `src/components/assetManagement/AssetTransitionModal.tsx`
- **Localização:** Contrato nas linhas 21-30; chamada nas linhas 62-71; handler do pai em src/components/AssetManagement.tsx 299-345
- **Categoria:** Falha de integração
- **Descrição:** O filho chama onSaveTransition(assetId, stage, date, description, user, cost, newEmployeeId, newRoom). O pai implementa handleSaveTransition(assetId, toStage, notes?, reason?, technician?). Assim a data entra como 'notes' e vira a descrição do evento; a justificativa entra como 'reason' e só seria usada se notes fosse vazio, o que nunca acontece; a data escolhida é ignorada (o pai usa todayStr); custo, novo colaborador e nova sala são descartados.
- **Impacto:** A trilha de auditoria grava '2026-11-19' em vez da justificativa digitada, que é obrigatória. Uma 'transferência' não troca o colaborador nem a sala do ativo. O custo informado (que a UI promete somar ao histórico financeiro) é perdido.
- **Evidência:** Filho: 'onSaveTransition(asset.id, selectedStage, date, description, user, cost > 0 ? cost : undefined, newEmployeeId \|\| undefined, newRoom \|\| undefined)'. Pai: 'const handleSaveTransition = (assetId, toStage, notes?, reason?, technician?) => {... description: notes \|\| `Ativo avançou no ciclo de vida (${reason \|\| ...})`, ... date: todayStr'. Não há tratamento de cost/employee/room.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-181 · [ALTA] Termo de cautela: botão 'Marcar como Termo Assinado' nunca aparece (onConfirmTerm em vez de onConfirmSigned)
- **Arquivo:** `src/components/assetManagement/AssetCustodyTermModal.tsx`
- **Localização:** Prop na linha 8; condição na linha 180; montagem no pai em src/components/AssetManagement.tsx 1362-1368; handler morto em 420-445
- **Categoria:** Falha de integração
- **Descrição:** O modal só exibe o botão de confirmação quando 'onConfirmSigned' está definido. O pai passa a prop 'onConfirmTerm', então o botão nunca é renderizado. Com isso handleConfirmCustodyTerm, que gravaria custodyTermSigned, custodyTermDate e o evento 'termo' no histórico, nunca é chamado.
- **Impacto:** O fluxo formal de assinatura do termo fica inoperante. O único jeito de marcar o termo como assinado é o checkbox do AssetEditModal, que não grava data nem histórico. O KPI 'Termos de Cautela Assinados' não reflete o fluxo previsto.
- **Evidência:** Filho: '{onConfirmSigned && !asset.custodyTermSigned && (<button onClick={() => onConfirmSigned(asset.id)}...'. Pai: '<AssetCustodyTermModal asset={selectedCustodyAsset} onClose={...} onConfirmTerm={handleConfirmCustodyTerm} />'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-182 · [ALTA] @types/react ausente: 'tsc --noEmit' com 0 erros não valida props JSX
- **Arquivo:** `package.json`
- **Localização:** Dependências (linha 32 'react', linha 47 'typescript'); node_modules/@types sem react/react-dom
- **Categoria:** Estabilidade
- **Descrição:** O projeto usa React 19, que não traz declarações de tipo próprias, e não declara nem instala @types/react ou @types/react-dom. Sem isso, React.FC e o JSX ficam tipados como any, e o compilador não detecta props faltantes ou com nome errado.
- **Impacto:** Todas as divergências de props acima (manutenção, detalhe, termo, contratos, transição) passam pelo 'tsc' sem erro. A linha de base '0 erros' dá uma falsa sensação de segurança e outros módulos podem ter o mesmo problema sem detecção.
- **Evidência:** Test-Path node_modules/@types/react = False; node_modules/react não contém *.d.ts; package.json não tem '@types/react'. Mesmo assim o 'npx tsc --noEmit' terminou sem saída, apesar de props obrigatórias como onOpenDetail não serem passadas.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-183 · [MÉDIA] AssetContractsView: botão 'Ver Detalhes' chama onOpenDetail, mas o pai passa onOpenAssetDetail
- **Arquivo:** `src/components/assetManagement/AssetContractsView.tsx`
- **Localização:** Props nas linhas 17-27; botão nas linhas 196-202; montagem no pai em src/components/AssetManagement.tsx 1160-1166
- **Categoria:** Falha de integração
- **Descrição:** A view declara a prop 'onOpenDetail', e o pai passa 'onOpenAssetDetail'. O handler chega undefined.
- **Impacto:** O ícone de olho em cada contrato lança TypeError e não abre o detalhe do ativo.
- **Evidência:** Filho: 'onOpenDetail: (asset: ITAsset) => void;' e 'onClick={() => onOpenDetail(asset)}'. Pai: '<AssetContractsView assets={assets} onOpenAssetDetail={(asset) => setSelectedDetailAsset(asset)} onOpenCustodyTerm={...} />'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-184 · [MÉDIA] Aprovação atribui o primeiro colaborador da lista por comparação invertida; sala pré-selecionada sem escolha
- **Arquivo:** `src/components/assetManagement/ApproveAssetModal.tsx`
- **Localização:** Linhas 55-58 (selectedEmpId) e 58 (selectedRoomId)
- **Categoria:** Regra de negócio
- **Descrição:** A busca automática do colaborador verifica se o nome do empregado contém o assignedUser descoberto, quando deveria ser o contrário. Nos dados de descoberta o assignedUser vem como 'Lucas Ribeiro (Desenvolvimento)', que nunca está contido em 'Lucas Ribeiro', então o casamento falha. Quando assignedUser é vazio (servidor, impressora, rede), includes('') retorna true e o primeiro colaborador é atribuído. A sala também vem pré-selecionada com rooms[0].
- **Impacto:** Ativos sem usuário são vinculados silenciosamente ao primeiro colaborador e à primeira sala. Isso gera custódia indevida (e um termo de cautela em nome errado) quando o aprovador não percebe.
- **Evidência:** 'employees.find(e => e.name.toLowerCase().includes((asset.assignedUser \|\| \'\').toLowerCase()))?.id' e 'useState(rooms[0]?.id \|\| \'\')'. Em src/data/initialDiscoveryAssets.ts: "assignedUser: 'Lucas Ribeiro (Desenvolvimento)'".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-185 · [MÉDIA] Tombo patrimonial sem garantia de unicidade e com dois algoritmos diferentes
- **Arquivo:** `src/components/assetManagement/ApproveAssetModal.tsx`
- **Localização:** Linha 52 (valor padrão 'PAT-2026-0025'); CentralDiscoveryHub.tsx linha 957; AssetManagement.tsx handleGenerateNextTag 186-196; AssetEditModal.tsx 195-209
- **Categoria:** Regra de negócio
- **Descrição:** Na aprovação, o tombo sugerido é `PAT-2026-${existingAssets.length + 1}`, com ano fixo e baseado na contagem de ativos. No cadastro manual é max(número)+1 com o ano corrente. Os dois campos são editáveis, e nenhum fluxo verifica se o tombo já existe.
- **Impacto:** Depois de exclusões ou com numeração não sequencial, a aprovação sugere um tombo já usado. Em 2027 continua sugerindo 'PAT-2026'. Tombos duplicados quebram a identificação física, e a coluna asset_tag é UNIQUE no banco, então o seed/upsert em lote falha inteiro.
- **Evidência:** CentralDiscoveryHub: 'suggestedTag={`PAT-2026-${String(existingAssets.length + 1).padStart(4, \'0\')}`}'. AssetManagement: 'Math.max(...existingNumbers) + 1'. Schema: 'asset_tag VARCHAR(64) NOT NULL UNIQUE'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-186 · [MÉDIA] Aprovação grava dados fictícios e ignora o cadastro auxiliar de categorias
- **Arquivo:** `src/components/assetManagement/ApproveAssetModal.tsx`
- **Localização:** Linhas 20-21/42 (prop categories não usada), 59 (purchaseValue 6500), 60 (acquisitionDate sem input), 164-170 (categorias fixas); CentralDiscoveryHub.tsx 240 e 249-251
- **Categoria:** Bug / código incompleto
- **Descrição:** A data de aquisição tem estado, mas nenhum campo no formulário, então é sempre a data de hoje. O valor de compra começa em R$ 6.500 inventado. A lista de categorias é fixa e ignora a prop 'categories'. No pai, a aprovação grava building 'Sede Corporativa - Torre A', floor '3º Andar' e quadrantCode 'Q4' fixos, ignorando a sala escolhida (que tem building, floor e quadrantCode próprios).
- **Impacto:** Patrimônio aprovado com data de aquisição, valor e localização incorretos. Isso afeta depreciação, contratos, garantia e o termo de custódia. Categorias criadas no gerenciador auxiliar não podem ser usadas.
- **Evidência:** 'const [acquisitionDate, setAcquisitionDate] = useState(todayStr);' (sem input correspondente); 'const [purchaseValue, setPurchaseValue] = useState(6500);'. No pai: "building: 'Sede Corporativa - Torre A', floor: '3º Andar', quadrantCode: 'Q4'".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-187 · [MÉDIA] Aprovação sem identificação nem autorização do aprovador
- **Arquivo:** `src/components/assetManagement/CentralDiscoveryHub.tsx`
- **Localização:** handleConfirmApproval nas linhas 208-292 (performedBy na linha 266); ApproveAssetModal.tsx 63-81
- **Categoria:** Segurança
- **Descrição:** A efetivação no inventário não verifica papel nem permissão de quem aprova e grava o executor fixo 'Administrador de TI'. Não há segregação (quem descobre aprova) nem registro do usuário autenticado. Em App.tsx não foi encontrada restrição por nível de acesso para a aba asset_management.
- **Impacto:** Qualquer usuário com acesso à aba incorpora ativos ao patrimônio, e a auditoria não mostra quem aprovou.
- **Evidência:** "performedBy: 'Administrador de TI'"; não há referência a sessão ou usuário no fluxo; App.tsx linha 1051 renderiza '<AssetManagement' só com base em activeTab.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-188 · [MÉDIA] Termo de custódia simulado: sem assinatura nem arquivamento, data muda a cada impressão, dados fictícios
- **Arquivo:** `src/components/assetManagement/AssetCustodyTermModal.tsx`
- **Localização:** Linhas 16-24 (currentDate e window.print), 77 (registro), 89, 93, 97, 130, 134 (fallbacks), 101, 63 (container com rolagem)
- **Categoria:** UI não implementada
- **Descrição:** O 'termo' é só a impressão do modal (window.print). Não gera documento persistido, não coleta assinatura (nem digital nem upload do termo assinado) e não versiona. A 'Data de Entrega' é sempre a data atual, e não custodyTermDate nem a data de atribuição. O 'Registro' muda com o ano corrente. Quando faltam dados, imprime valores inventados: 'Tecnologia da Informação & Engenharia', 'Sede Principal', 'NF-INTERNA', 'Dell/Cisco/Lenovo'. O termo pode ser emitido para ativo sem colaborador. Também não existe CSS de impressão no projeto (nenhum @media print), e o corpo fica num container com max-h-[90vh] e rolagem.
- **Impacto:** Documento com valor jurídico e trabalhista sai com dados falsos e data de entrega incorreta. Não há prova de assinatura armazenada. A reimpressão gera um documento diferente do original. A impressão pode incluir a aplicação ao fundo e cortar o conteúdo.
- **Evidência:** 'const currentDate = new Date().toLocaleDateString(...)'; 'Registro: TR-{asset.assetTag}-{new Date().getFullYear()}'; "{asset.supplier \|\| 'Dell/Cisco/Lenovo'}"; "{asset.invoiceNumber \|\| 'NF-INTERNA'}"; 'const handlePrint = () => { window.print(); };'. Grep '@media print\|print:' em src/**/*.css: nenhum resultado.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-189 · [MÉDIA] Reatribuir colaborador na edição mantém termo 'assinado' e o departamento antigo
- **Arquivo:** `src/components/assetManagement/AssetEditModal.tsx`
- **Localização:** Select de colaborador nas linhas 575-592; checkbox nas linhas 595-606; estado inicial na linha 83
- **Categoria:** Regra de negócio
- **Descrição:** Ao trocar o colaborador titular, o formulário atualiza só assignedEmployeeId e assignedEmployeeName (no formato 'Nome (Departamento)'). custodyTermSigned continua true e assignedDepartment continua com o valor antigo, porque não é atualizado. O checkbox marca o termo como assinado sem gravar custodyTermDate e sem registrar evento no histórico. Na aprovação o nome é gravado sem o departamento, o que deixa o formato de assignedEmployeeName inconsistente entre os fluxos.
- **Impacto:** O novo custodiante aparece como tendo assinado um termo que nunca assinou. O termo impresso mostra o nome novo com o departamento do custodiante anterior. Buscas e relatórios por nome ficam inconsistentes.
- **Evidência:** 'setFormData(p => ({ ...p, assignedEmployeeId: empId, assignedEmployeeName: emp ? `${emp.name} (${emp.department})` : \'\' }))'. Não há atualização de assignedDepartment nem de custodyTermSigned. ApproveAssetModal linha 73: 'assignedEmployeeName: emp?.name'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-190 · [MÉDIA] AssetEditModal ignora fornecedores, salas, categorias, status e o gerenciador auxiliar
- **Arquivo:** `src/components/assetManagement/AssetEditModal.tsx`
- **Localização:** Props nas linhas 35-39 e 47-53 (não usadas); categoria fixa nas linhas 272-286; status fixo nas linhas 254-264; sala em texto livre nas linhas 641-649; roomId na linha 84
- **Categoria:** Desconectado
- **Descrição:** As props suppliers, rooms, categories, statuses e onOpenAuxiliaryManager são recebidas e nunca usadas. Categoria e status são listas fixas. Fornecedor e sala são campos de texto livre, e o roomId original nunca é atualizado, o que deixa roomId e roomName divergentes. Pelo gatilho openAddModalTrigger, o pai pré-preenche category/status com categories[0].code e statuses[0].code, que podem não existir nas opções fixas.
- **Impacto:** O cadastro auxiliar (fornecedores, salas, categorias e status personalizados) não tem efeito no cadastro de ativos. O vínculo com a sala (FK lógica room_id) fica inconsistente. O select pode exibir uma opção diferente do valor realmente salvo.
- **Evidência:** Desestruturação: 'suppliers, rooms, categories, statuses, onOpenAuxiliaryManager,'. No JSX só aparece 'employees.map'. Sala: '<input type="text" value={formData.roomName \|\| \'\'} ...'. Pai linhas 449-457: "category: categories[0]?.code \|\| 'hardware_workstation', status: statuses[0]?.code \|\| 'em_estoque'".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-191 · [MÉDIA] Campos de garantia/SLA editados não são os exibidos; valores fora do tipo declarado
- **Arquivo:** `src/components/assetManagement/AssetEditModal.tsx`
- **Localização:** Linhas 70-71 e 538-556; AssetDetailModal.tsx linhas 383 e 387; src/types.ts 311-313; quadrantCode e insurancePolicy nas linhas 68 e 88
- **Categoria:** Bug / código incompleto
- **Descrição:** A edição altera warrantySlaHours (número), mas o detalhe exibe warrantySla (texto), com fallback 'NBD (Next Business Day)'. warrantyType é texto livre com padrão 'On-Site 3 Anos (Fabricante)', valor fora da união declarada em ITAsset.warrantyType. quadrantCode está no estado sem campo correspondente. insurancePolicy é editado e nunca exibido.
- **Impacto:** O SLA cadastrado nunca aparece no detalhe, que mostra um 'NBD' fictício. Dados de garantia ficam fora do domínio esperado por filtros e relatórios.
- **Evidência:** Edit: "warrantyType: asset.warrantyType \|\| 'On-Site 3 Anos (Fabricante)', warrantySlaHours: asset.warrantySlaHours ?? 24". Detail: "{asset.warrantySla \|\| 'NBD (Next Business Day)'}". types.ts: "warrantyType?: 'On-Site Fabricante' \| 'Balcão / Carry-in' \| 'SLA 4h 24x7' \| 'Garantia Estendida' \| 'Nenhuma';".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-192 · [MÉDIA] Edição altera etapa do ciclo de vida e status sem registrar na trilha de auditoria
- **Arquivo:** `src/components/assetManagement/AssetEditModal.tsx`
- **Localização:** Selects nas linhas 234-264; handleSaveAsset (atualização) em src/components/AssetManagement.tsx 218-235
- **Categoria:** Regra de negócio
- **Descrição:** O formulário de edição permite trocar lifecycleStage e status livremente e de forma independente: por exemplo, etapa 'descarte' com status 'em_uso'. Isso contorna o AssetTransitionModal. Na atualização, handleSaveAsset faz só um merge ({...a, ...assetData}) e não cria evento de histórico nem para essa troca nem para mudanças de valor, colaborador, contrato ou custódia.
- **Impacto:** A auditoria patrimonial fica incompleta (mudanças críticas sem registro) e o estado do ativo fica incoerente entre status e etapa.
- **Evidência:** '<select value={formData.lifecycleStage \|\| \'compra\'} onChange={(e) => setFormData(p => ({ ...p, lifecycleStage: ... }))}' e o select de status. No pai: 'const updated: ITAsset = { ...a, ...assetData, assetTag, purchaseValue: purchaseVal, currentValue: ... }', sem history.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-193 · [MÉDIA] Número de série fictício gerado ao acaso ao criar ativo
- **Arquivo:** `src/components/assetManagement/AssetEditModal.tsx`
- **Localização:** Linha 60; AssetManagement.tsx linha 244; CentralDiscoveryHub.tsx linha 232
- **Categoria:** Regra de negócio
- **Descrição:** Quando o S/N não é informado, os três fluxos inventam 'SN-' seguido de 6 dígitos aleatórios e gravam como se fosse o número de série real.
- **Impacto:** Dados de identificação falsos no patrimônio e no termo de custódia, com possibilidade de colisão. O S/N real deixa de ser exigido.
- **Evidência:** 'serialNumber: asset.serialNumber \|\| `SN-${Math.floor(Math.random() * 900000 + 100000)}`'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-194 · [MÉDIA] Ciclo de vida sem máquina de estados; ativo descartado pode voltar a 'Utilização'
- **Arquivo:** `src/components/assetManagement/AssetTransitionModal.tsx`
- **Localização:** Linhas 43-48 (etapa sugerida) e 129-137 (qualquer etapa selecionável)
- **Categoria:** Regra de negócio
- **Descrição:** Todas as 8 etapas podem ser escolhidas a partir de qualquer etapa, inclusive a etapa atual (transição vazia) e a saída de 'descarte'. Para um ativo em 'descarte' (último índice), o modal sugere 'utilizacao' por padrão. Não há validação de pré-requisitos, como ter custodiante ao entrar em 'utilizacao' ou liberar a custódia no descarte.
- **Impacto:** Um bem já baixado pode ser reativado com um clique, e o histórico registra transições incoerentes. Isso compromete o controle patrimonial e contábil.
- **Evidência:** 'const suggestedNextStage = nextStageIndex >= 0 && nextStageIndex < LIFECYCLE_STAGES.length - 1 ? LIFECYCLE_STAGES[nextStageIndex + 1].stage : \'utilizacao\';' e 'onClick={() => setSelectedStage(st.stage)}' sem restrição.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-195 · [MÉDIA] Trilha de auditoria manual com autor em texto livre e data retroativa
- **Arquivo:** `src/components/assetManagement/AssetDetailModal.tsx`
- **Localização:** Linhas 55-57, 68-86 e 484-501; AssetTransitionModal.tsx linhas 51 e 185-192; AssetManagement.tsx 348-367
- **Categoria:** Segurança
- **Descrição:** Os eventos manuais de histórico e de transição recebem o responsável num campo de texto livre (padrões 'Analista de TI' e 'Gestor de TI & Infra') e a data num campo editável, sem vínculo com o usuário autenticado. Os eventos são sempre inseridos no topo, sem ordenar por data.
- **Impacto:** Qualquer usuário pode registrar eventos em nome de outra pessoa e com data passada. A trilha não serve como evidência de auditoria, e a linha do tempo fica fora de ordem cronológica.
- **Evidência:** "const [newHistUser, setNewHistUser] = useState<string>('Analista de TI');"; '<input type="date" value={newHistDate} ...'; no pai: 'history: [newEvent, ...(a.history \|\| [])]'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-196 · [MÉDIA] Manutenção não altera o ativo: custo acumulado estático, status não muda, histórico duplicado
- **Arquivo:** `src/components/assetManagement/AssetMaintenanceView.tsx`
- **Localização:** Conclusão na linha 256; handlers do pai em AssetManagement.tsx 370-417; AssetDetailModal.tsx linha 422
- **Categoria:** Regra de negócio
- **Descrição:** handleSaveMaintenance e handleCompleteMaintenance só atualizam o array maintenances e acrescentam um item de histórico a cada gravação, inclusive em edições e conclusões. Não recalculam totalMaintenanceCost (usado no detalhe e presente apenas nos dados semente), não mudam status/lifecycle para 'em_manutencao' na abertura e não voltam para 'em_uso' na conclusão.
- **Impacto:** O 'Custo Total de Manutenções' do detalhe nunca muda. O ativo continua 'Em Uso' durante o reparo. O histórico acumula entradas repetidas da mesma O.S.
- **Evidência:** Grep 'totalMaintenanceCost' em src: só AssetDetailModal.tsx:422, types.ts e initialAssets.ts. handleSaveMaintenance: 'const updated: ITAsset = { ...a, maintenances: updatedMaintenances, history: [historyItem, ...(a.history \|\| [])] };'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-197 · [MÉDIA] Depreciação: valor residual só é recalculado ao salvar e ignora o valor de sucata
- **Arquivo:** `src/components/assetManagement/AssetDetailModal.tsx`
- **Localização:** Linhas 410-416 e 434-437; AssetManagement.tsx 205-216 e 1222-1226
- **Categoria:** Regra de negócio
- **Descrição:** currentValue é calculado só no momento do save do formulário de edição. O detalhe e o relatório financeiro exibem esse valor congelado como 'Valor Residual Atual'. A fórmula linear usa purchase/lifespan e limita o residual a 0, sem considerar salvageValue, embora o texto da tela cite o valor residual de sucata. Ativos aprovados pela descoberta recebem currentValue = purchaseValue.
- **Impacto:** O valor contábil fica superestimado e desatualizado (um ativo nunca editado não deprecia), o que distorce relatórios financeiros e a baixa patrimonial.
- **Evidência:** Detail: '(asset.currentValue ?? asset.purchaseValue ?? 0)' e '(asset.purchaseValue \|\| 0) / (asset.lifespanMonths \|\| 36)'. Pai: 'residualVal = Math.max(0, purchaseVal - (monthlyDep * Math.max(0, diffMonths)))', só dentro de handleSaveAsset. CentralDiscoveryHub 239: 'currentValue: approvedData.purchaseValue'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-198 · [BAIXA] ApproveAssetModal chama hooks depois de um return condicional
- **Arquivo:** `src/components/assetManagement/ApproveAssetModal.tsx`
- **Localização:** Linha 47 (if (!asset) return null) antes dos useState das linhas 52-61
- **Categoria:** Estabilidade
- **Descrição:** O componente fica sempre montado no CentralDiscoveryHub e retorna antes dos hooks quando asset é null, o que viola as Rules of Hooks. Hoje funciona por acaso, porque o render com zero hooks reinicia o estado. Se o asset mudar direto de A para B sem passar por null, os valores iniciais (nome, categoria, colaborador, tombo) ficam os do ativo anterior. Mudanças em suggestedTag também não são refletidas.
- **Impacto:** Risco de aprovar um ativo com os dados do anterior e de erros de hooks em refatorações futuras.
- **Evidência:** 'if (!asset) return null;' seguido de 'const [assetTag, setAssetTag] = useState(suggestedTag \|\| ...)'; no pai: '<ApproveAssetModal asset={selectedApproveAsset} ...' sem renderização condicional.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-199 · [BAIXA] Histórico: 'Registrado por' vem vazio nos eventos do sistema e custo 0 aparece como '0'
- **Arquivo:** `src/components/assetManagement/AssetDetailModal.tsx`
- **Localização:** Linhas 565-570
- **Categoria:** Bug / código incompleto
- **Descrição:** A linha do tempo exibe item.user, mas os eventos gerados pelo pai (cadastro, transição, manutenção, termo) e pela aprovação gravam o executor em 'performedBy'. Além disso, '{item.cost && item.cost > 0 && ...}' renderiza o literal '0' quando cost === 0, o que acontece nos eventos de O.S. criados por handleSaveMaintenance com cost: record.cost.
- **Impacto:** A auditoria aparece sem autor nos eventos automáticos e com um '0' solto na interface.
- **Evidência:** Detail: 'Registrado por: <strong ...>{item.user}</strong>' e '{item.cost && item.cost > 0 && ('. Pai: "performedBy: 'Administrador de TI'" (linha 286), 'performedBy: technician \|\| ...' (319), 'performedBy: record.technician, cost: record.cost' (388-389).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-200 · [BAIXA] O.S. cancelada pode ser 'concluída'; KPIs incluem canceladas; validações ausentes no modal de manutenção
- **Arquivo:** `src/components/assetManagement/AssetMaintenanceView.tsx`
- **Localização:** Linhas 63-65 (totalCost), 229 (badge) e 254 (botão concluir); AssetMaintenanceModal.tsx linhas 24, 42, 53-55 e 189-213
- **Categoria:** Regra de negócio
- **Descrição:** O botão 'Concluir' aparece para qualquer status diferente de 'concluida', inclusive 'cancelada'. O 'Total Gasto' soma o custo de ordens canceladas, e o badge de cancelada aparece em âmbar, como uma ordem aberta. No modal não há validação de closeDate >= openDate nem de closeDate preenchido com status diferente de concluída. O estado 'notes' não tem campo, e supplierOrService (do tipo) não é usado. Com a lista de ativos vazia, o registro sai com assetId '' e assetTag 'PAT-TEMP' e é descartado sem aviso pelo pai.
- **Impacto:** Indicadores financeiros distorcidos e ordens com datas incoerentes.
- **Evidência:** View: '{m.status !== \'concluida\' && (<button onClick={() => onCompleteMaintenance(m)}'; 'allMaintenances.reduce((sum, m) => sum + (m.cost \|\| 0), 0)'. Modal: "assetTag: selectedAsset?.assetTag \|\| 'PAT-TEMP'"; 'const [notes, setNotes] = useState...' sem input.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-201 · [BAIXA] Indicadores de contratos não consideram vigência nem baixa; sem gestão real de contratos
- **Arquivo:** `src/components/assetManagement/AssetContractsView.tsx`
- **Localização:** Linhas 31-46, 59, 83 e 108-114
- **Categoria:** Regra de negócio
- **Descrição:** 'Contratos Ativos Registrados' conta qualquer ativo com contractNumber, mesmo com contractEndDate vencido. 'Custo Mensal Recorrente' soma contractMonthlyCost de todos os ativos, inclusive descartados e com contrato expirado. A tabela ('assetsWithContracts') lista todos os ativos, até os sem contrato. O tipo 'Outro' existe em AssetContractType, mas não está no filtro. O contrato é só um conjunto de campos do ativo: não há entidade, cadastro, alerta de vencimento nem relação 1:N contrato-ativos.
- **Impacto:** O custo recorrente fica superestimado e não há alertas de vencimento de contratos de leasing ou SLA.
- **Evidência:** 'assets.reduce((sum, a) => sum + (a.contractMonthlyCost \|\| 0), 0)'; '{assets.filter(a => a.contractNumber).length} de {assets.length} Ativos'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-202 · [BAIXA] Validações ausentes nos formulários de ativo
- **Arquivo:** `src/components/assetManagement/AssetEditModal.tsx`
- **Localização:** handleSubmit nas linhas 98-105; campos numéricos e de data nas linhas 381-417, 486-515 e 528-556; ApproveAssetModal.tsx 216-233
- **Categoria:** Bug / código incompleto
- **Descrição:** Só o nome é validado. Não há checagem de término de contrato anterior ao início, garantia anterior à aquisição, valores negativos (compra, custo mensal, vida útil), formato de CNPJ, IP ou MAC, nem unicidade de tombo ou S/N. Como as abas são renderizadas condicionalmente, os atributos 'required' só valem na aba visível.
- **Impacto:** Dados inconsistentes entram no patrimônio. Uma vida útil negativa, por exemplo, faz o valor residual crescer.
- **Evidência:** 'if (!formData.name?.trim()) { alert(...); return; } onSave(formData);' e inputs type=number sem min.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-203 · [BAIXA] Estado inicial do AssetEditModal recalculado a cada render
- **Arquivo:** `src/components/assetManagement/AssetEditModal.tsx`
- **Localização:** Linhas 55-94
- **Categoria:** Desempenho
- **Descrição:** useState recebe um objeto literal, não uma função inicializadora. Então generateNextTag() (regex sobre todos os ativos) e Math.random() rodam em cada render, ou seja, a cada tecla digitada, e o resultado é descartado.
- **Impacto:** Custo O(n) desnecessário por tecla em inventários grandes. É baixo, mas evitável.
- **Evidência:** 'const [formData, setFormData] = useState<Partial<ITAsset>>({ assetTag: asset.assetTag \|\| generateNextTag(), ... serialNumber: asset.serialNumber \|\| `SN-${Math.floor(Math.random() * ...)}`'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-204 · [BAIXA] Imports e props sem uso; campos redundantes no lifecycleConfig
- **Arquivo:** `src/components/assetManagement/ApproveAssetModal.tsx`
- **Localização:** ApproveAssetModal.tsx 2-12 (User, Building2, DollarSign, Calendar, ShieldCheck, Layers) e prop categories; AssetContractsView.tsx 2-14 (Building2, Calendar, Tag, AlertCircle, ExternalLink); AssetCustodyTermModal.tsx 2 (Tag, ShieldCheck, User); AssetDetailModal.tsx 2-25 (Calendar, User, AlertTriangle, ExternalLink); AssetEditModal.tsx 2-15 (Layers, Wrench, Tag); AssetMaintenanceModal.tsx 2 (Calendar, User, DollarSign, Tag, AlertTriangle, CheckCircle2); AssetMaintenanceView.tsx 2-15 (Clock, User, FileText, Calendar); AssetTransitionModal.tsx 2-12 (FileText, Building2); lifecycleConfig.tsx 15-34
- **Categoria:** Duplicado / obsoleto
- **Descrição:** Vários ícones importados não são usados nos arquivos da fatia, e algumas props declaradas são ignoradas. Em lifecycleConfig, cada etapa repete o mesmo valor em stage, id e key, e em stepNumber, step e order. Os modais consomem campos diferentes (AssetEditModal usa stage.key e stage.order; AssetTransitionModal usa st.stage).
- **Impacto:** Ruído de manutenção e risco de divergência entre campos redundantes.
- **Evidência:** Ex.: ApproveAssetModal importa 'User, Building2, DollarSign, Calendar, ShieldCheck, Layers' e usa só X, CheckCircle2 e Tag. lifecycleConfig: "stage: 'compra', id: 'compra', key: 'compra', ... stepNumber: 1, step: 1, order: 1".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

### 6.9 Gestão de ativos — descoberta e deduplicação

_Forma de exame: Agente (leitura integral) — 24 achados._

> **Estado do módulo:** A fatia S09 (Central de Descoberta de Ativos, deduplicação, matching e diff de inventário) é quase toda demonstrativa no frontend. A CentralDiscoveryHub mostra apenas os 7 ativos e 4 alertas fixos de src/data/initialDiscoveryAssets.ts, guardados em localStorage (workpulse_discovered_inventory_assets / workpulse_discovery_alerts). Não há nenhuma chamada a API, scanner ou agente. O botão "Executar Varredura Agora" é um setTimeout com mensagem fixa ("7 ativos checados"). O motor de matching (src/utils/assetMatchingEngine.ts), que implementa a hierarquia UUID > Serial > Service Tag > MAC > Hostname, é importado mas nunca chamado. As marcas de duplicidade (isDuplicateSuspect, duplicateTargetName, 94%) vêm só da massa de teste, e buildDuplicatePair e o tipo DuplicatePair não são usados. Mesmo como código, o algoritmo tem falhas: UUID nunca casa porque ITAsset não tem esse campo, a Service Tag usa comparação por substring, e o bônus de prefixo e a similaridade de hostname geram falsos positivos (PC-1/PC-10, PC-023/PC-024). As telas de duplicidade escolhem o ativo de destino de forma frágil: a comparação ([ANALISAR]) pega o primeiro ativo com o mesmo MAC (na massa de teste, o servidor PAT-2026-0001) e o [MESCLAR] direto cai em existingAssets[0]. Com isso a mesclagem pode sobrescrever IP, MAC e status de agente de um ativo sem relação. O modal de comparação exibe valores inventados (RAM, disco, SO, Service Tag, UUID) sempre marcados como "Idêntico". A aprovação cria ITAsset com serial aleatório, localização fixa, agente "online/agora mesmo" e tombo sugerido por length+1 sem checar unicidade. Também permite aprovar como novo um ativo marcado como duplicado, gerando duplicidade real no inventário. Aprovações e mesclagens só ficam em React state e localStorage: upsertAsset nunca é chamado, e assets.service/it_assets não têm colunas de MAC, IP e agente, então os dados mesclados se perdem quando o inventário é recarregado do Supabase. O InventoryDiffEngine é o único componente realmente usado em produção (POST /api/v1/agent/inventory no cmdbRouter). Mas os resultados dele não chegam à aba "Ativos Alterados" da Central, que mostra só changesDetected da massa de teste. O próprio diff filtra valores-placeholder apenas para o serial e não tem tolerância para RAM, o que gera alterações falsas. Principais riscos: corromper dados do inventário ao mesclar no ativo errado, criar duplicidades pela aprovação, perder silenciosamente os dados mesclados no banco, decisões do operador baseadas em evidências inventadas, e trilha de auditoria com operador fixo ("Administrador de TI"), sem identificar o usuário real.

#### A-205 · [CRÍTICA] [MESCLAR] direto pode mesclar no ativo errado (existingAssets[0]) e corromper dados
- **Arquivo:** `src/components/assetManagement/CentralDiscoveryHub.tsx`
- **Localização:** linhas 768 (targetName padrão 'PC-023') e 818-822 (onClick do botão [MESCLAR]); handleMergeDuplicate linhas 332-362
- **Categoria:** Bug / código incompleto
- **Descrição:** O botão [MESCLAR] da lista de duplicidades procura o destino só pelo nome (duplicateTargetName, ou 'PC-023' fixo quando vazio). Se não acha, usa o primeiro ativo da lista (existingAssets[0]) e chama handleMergeDuplicate sem confirmação nem verificação. matchedAssetId e as chaves (serial, MAC, UUID) não são usadas para achar o destino.
- **Impacto:** Basta o ativo-alvo ter sido renomeado, não existir na base ou vir com outro nome do Supabase para o IP, o MAC e o status de agente do ativo descoberto sobrescreverem os de um ativo sem relação (por exemplo o servidor PAT-2026-0001), que ainda ganha um registro de auditoria de mesclagem falso. É corrupção silenciosa do inventário patrimonial.
- **Evidência:** const target = existingAssets.find(a => a.name.toLowerCase() === targetName.toLowerCase()) \|\| existingAssets[0]; if (target) handleMergeDuplicate(item, target);  — e safeMergeAssets (assetMatchingEngine.ts 333-341) troca ipAddress/macAddress/agentStatus do alvo.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-206 · [ALTA] [ANALISAR] escolhe o alvo de comparação errado (OR por MAC/serial cru e fallback no primeiro ativo)
- **Arquivo:** `src/components/assetManagement/CentralDiscoveryHub.tsx`
- **Localização:** handleAnalyzeDuplicate, linhas 310-329
- **Categoria:** Bug / código incompleto
- **Descrição:** O alvo é o primeiro ativo da lista que bate em QUALQUER um dos critérios: nome igual (padrão fixo 'pc-023'), serial idêntico ou MAC idêntico. Não há prioridade nem normalização. Dois strings vazios contam como serial igual, e sem resultado cai em existingAssets[0]. Na massa de teste, o servidor ast-101 (índice 0) tem o mesmo MAC 00:1A:2B:3C:4D:5E que o PC-023 e o PC-023-NOVO, então é ele que aparece como alvo. O [MESCLAR ATIVO] do modal mescla nesse alvo, enquanto o [MESCLAR] direto da lista escolhe outro alvo (pelo nome).
- **Impacto:** O operador compara o PC-023-NOVO com o servidor de virtualização e, ao confirmar, mescla IP, MAC e agente no servidor. Os dois caminhos da mesma ação levam a destinos diferentes. Diferenças de formato de MAC (hífen ou maiúsculas) também impedem achar o alvo certo.
- **Evidência:** let target = existingAssets.find(a => a.name.toLowerCase() === (discovered.duplicateTargetName \|\| 'pc-023').toLowerCase() \|\| a.serialNumber === discovered.serialNumber \|\| a.macAddress === discovered.macAddress); if (!target && existingAssets.length > 0) { target = existingAssets[0]; }  — e initialAssets.ts linha 45 (ast-101) e linha 863 (ast-023) têm macAddress '00:1A:2B:3C:4D:5E'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-207 · [ALTA] Motor de matching nunca é executado; duplicidades vêm só da massa de teste
- **Arquivo:** `src/components/assetManagement/CentralDiscoveryHub.tsx`
- **Localização:** linha 47 (import matchDiscoveredAsset sem uso); assetMatchingEngine.ts matchDiscoveredAsset (82-223) e buildDuplicatePair (228-310) sem chamadas; tipo DuplicatePair (inventoryDiscovery.ts 105-122) sem uso
- **Categoria:** Desconectado
- **Descrição:** matchDiscoveredAsset é importado na Central e não é chamado em lugar nenhum do projeto (o grep acha só a definição e o import). buildDuplicatePair e DuplicatePair também não têm uso. Os campos isDuplicateSuspect, duplicateTargetName, duplicateSimilarityPct, matchingPriorityUsed e matchingConfidence só aparecem preenchidos à mão em initialDiscoveryAssets.ts.
- **Impacto:** A hierarquia UUID > Serial > Service Tag > MAC > Hostname, anunciada na interface (linhas 410 e 749) e no modal, não roda. Nenhum ativo novo seria marcado como duplicado: a tela 'Possíveis Duplicidades' é estática.
- **Evidência:** Grep 'matchDiscoveredAsset\|buildDuplicatePair' em src/ e server/: só o import em CentralDiscoveryHub.tsx:47 e as definições em assetMatchingEngine.ts:82/228. initialDiscoveryAssets.ts:31-36 traz isDuplicateSuspect: true, duplicateSimilarityPct: 94 fixos.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-208 · [ALTA] 'Executar Varredura Agora' é simulação com setTimeout e resultado fixo
- **Arquivo:** `src/components/assetManagement/CentralDiscoveryHub.tsx`
- **Localização:** handleTriggerScan, linhas 191-200; botão linhas 416-423
- **Categoria:** UI não implementada
- **Descrição:** O botão diz executar 'varredura ARP/SNMP nas subredes autorizadas e sincronizar agentes RMM', mas só liga um spinner por 1,8 s e mostra 'Varredura concluída com sucesso! 7 ativos checados'. Nenhuma API é chamada e a lista não muda. O servidor já tem POST /api/v1/cmdb/discovery/live-scan, usado pelo CMDB (LiveNetworkScannerTab), mas a Central não o usa.
- **Impacto:** O usuário acredita que a rede foi varrida e o inventário sincronizado, mas nada foi feito. Dispositivos novos nunca aparecem e o número '7' é fixo.
- **Evidência:** setTimeout(() => { setIsScanning(false); setScanMessage('Varredura concluída com sucesso! 7 ativos checados, telemetria sincronizada.'); ... }, 1800);
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-209 · [ALTA] Central de Descoberta isolada do pipeline real (scanner CMDB, inventário do agente e diff)
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** linhas 120-142 (estado discoveredAssets/discoveryAlerts vindo de INITIAL_* e localStorage); CentralDiscoveryHub.tsx inteiro (nenhum fetch); server/cmdbRouter.ts 2484-2510 (diff gravado em store.inventoryChangeHistory)
- **Categoria:** Falha de integração
- **Descrição:** A origem dos ativos descobertos e dos alertas é só INITIAL_DISCOVERED_ASSETS / INITIAL_DISCOVERY_ALERTS, persistidos no localStorage do navegador. O backend tem um pipeline real separado: /cmdb/discovery/devices, /match, /promote e /reject, mais /agent/inventory, que roda o InventoryDiffEngine e grava inventoryChangeHistory. Nada disso chega à Central. A aba 'Ativos Alterados' mostra só changesDetected da massa de teste, e os alertas nunca são criados por código.
- **Impacto:** Há dois sistemas de descoberta paralelos e incoerentes (CMDB e Gestão de Ativos). Mudanças de hardware detectadas pelo agente nunca viram alerta ou pendência na Gestão de Ativos. Os dados de descoberta ficam presos a um navegador e não são compartilhados entre operadores ou máquinas.
- **Evidência:** AssetManagement.tsx:121 localStorage.getItem('workpulse_discovered_inventory_assets') ... return INITIAL_DISCOVERED_ASSETS; — grep 'cmdb/discovery' em src/ só acha CmdbDiscoveryView.tsx e LiveNetworkScannerTab.tsx.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-210 · [ALTA] Aprovação e mesclagem não vão ao Supabase, e o schema descarta MAC/IP/agente
- **Arquivo:** `src/services/supabase/assets.service.ts`
- **Localização:** assetToRow linhas 40-64 e rowToAsset linhas 8-38; App.tsx 13 (upsertAsset/deleteAsset importados e nunca chamados), 219-226 e 266-268; supabase/MIGRATION_UNICA_COMPLETA.sql 157-185
- **Categoria:** Banco de dados
- **Descrição:** handleConfirmApproval e handleMergeDuplicate só chamam setExistingAssets. O App só salva em localStorage (wp_assets) e chama upsertAssets uma única vez, na carga inicial, quando o Supabase está vazio. upsertAsset não é chamado em lugar nenhum. Mesmo que fosse, assetToRow e rowToAsset não mapeiam macAddress, ipAddress, agentStatus, agentVersion, agentLastPing, operatingSystem nem hasAgent, e a tabela it_assets não tem essas colunas.
- **Impacto:** Ativos aprovados e mescla de evidências se perdem quando o inventário é recarregado do Supabase: App.tsx:221 troca o estado pelos dados do banco. Os campos que safeMergeAssets atualiza (IP, MAC, agente) nunca chegam ao banco, então o matching por MAC fica impossível para ativos vindos do Supabase.
- **Evidência:** assetToRow retorna id, asset_tag, name, category, brand_model, serial_number, status, ..., history, maintenance_records, custom_fields: {} — sem mac/ip/agent. Grep 'upsertAsset\(' em src: só a definição.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-211 · [ALTA] Modal de duplicidade mostra evidências inventadas, sempre marcadas como 'Idêntico'
- **Arquivo:** `src/components/assetManagement/DuplicateAnalysisModal.tsx`
- **Localização:** comparisonFields, linhas 54-109 (SO, RAM, Armazenamento, Service Tag, UUID)
- **Categoria:** UI não implementada
- **Descrição:** Para SO, RAM, Armazenamento, Service Tag e UUID, isEqual é sempre true. Como ITAsset não tem os campos ram, disk, serviceTag nem uuid (types.ts 279-386), a coluna do ativo existente sempre mostra os textos fixos '16 GB RAM', 'SSD 512 GB', '8XYZ123' e '4C4C4544-004A-5A10-8058-CAC04F543232'. A Service Tag descoberta também cai em '8XYZ123' quando ausente. As comparações de MAC (só lowercase) e de serial (=== cru) não usam normalizeMac/normalizeKey, ao contrário do motor.
- **Impacto:** O operador decide a mesclagem vendo 'Idêntico' em UUID e Service Tag (prioridades 1 e 3) mesmo quando os valores divergem ou nem existem. A decisão de dedup vira um falso positivo induzido pela tela.
- **Evidência:** { label: 'BIOS / Machine UUID', existing: (existingAsset as any).uuid \|\| '4C4C4544-004A-5A10-8058-CAC04F543232', discovered: discoveredAsset.uuid, isEqual: true, ... } { label: 'Memória RAM', existing: (existingAsset as any).ram \|\| '16 GB RAM', ..., isEqual: true }
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-212 · [ALTA] Aprovação permite cadastrar duplicata e ativo já existente como novo
- **Arquivo:** `src/components/assetManagement/CentralDiscoveryHub.tsx`
- **Localização:** newAssetsList linhas 115-117; botão [APROVAR] linhas 721-730; handleConfirmApproval linhas 208-292; DiscoveredAssetDetailModal.tsx 353-361
- **Categoria:** Regra de negócio
- **Descrição:** 'Novos Ativos' inclui itens com isDuplicateSuspect (o PC-023-NOVO aparece nas duas abas). handleConfirmApproval cria um ITAsset novo sem rodar matching nem checar se o serial, MAC ou UUID já estão no inventário. 'Ativos Alterados' também mostra [APROVAR] para um equipamento que, pelo alerta alt-02, já é patrimônio. A aprovação não resolve isDuplicateSuspect.
- **Impacto:** Aprovar o PC-023-NOVO cria um segundo tombo com o mesmo serial (SN-DELL-948201) e o mesmo MAC do PC-023, exatamente o que o módulo deveria evitar. Depois o item continua em 'Possíveis Duplicidades' e ainda pode ser mesclado, deixando dois registros para o mesmo hardware.
- **Evidência:** const newAssetsList = discoveredAssets.filter(a => !a.hasChanges && a.status !== 'MERGED'); ... setExistingAssets(prev => [newITAsset, ...prev]); — nenhuma verificação de serial/MAC existente antes.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-213 · [MÉDIA] safeMergeAssets perde dados e grava auditoria que não corresponde ao que foi mesclado
- **Arquivo:** `src/utils/assetMatchingEngine.ts`
- **Localização:** safeMergeAssets, linhas 317-342; CentralDiscoveryHub.tsx 339-351 (notes sobrescrito)
- **Categoria:** Regra de negócio
- **Descrição:** A mesclagem só copia ipAddress, macAddress, agentStatus, agentVersion e agentLastPing. A descrição da auditoria diz que 'especificações de hardware (RAM, disco)' foram mescladas, o que não acontece: SO, CPU, RAM, disco, serial, UUID, Service Tag, usuário, localização e changesDetected são descartados (ITAsset tem operatingSystem e hardwareChanges e eles não são preenchidos). O MAC registrado é substituído, não somado. Na Central, o campo notes do ativo descoberto é sobrescrito com o texto da mesclagem e as notas originais se perdem. A similaridade cai em 94 quando ausente.
- **Impacto:** O histórico patrimonial registra uma atualização que não houve, as evidências de hardware se perdem quando o descoberto fica MERGED, e o MAC antigo é perdido (por exemplo, se o primário descoberto for Wi-Fi ou dock).
- **Evidência:** description: `Telemetria, especificações de hardware (${discovered.ram}, ${discovered.disk}) ... mescladas ... Similaridade: ${discovered.duplicateSimilarityPct \|\| 94}%.` — return { ...existingAsset, ipAddress, macAddress, agentStatus, agentVersion, agentLastPing: 'agora mesmo', history }
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-214 · [MÉDIA] Agente marcado como 'online / agora mesmo' mesmo quando o descoberto está offline
- **Arquivo:** `src/components/assetManagement/CentralDiscoveryHub.tsx`
- **Localização:** handleConfirmApproval linhas 254-256; assetMatchingEngine.ts safeMergeAssets linhas 337-339
- **Categoria:** Regra de negócio
- **Descrição:** O status do agente vem de hasAgent, não de agentStatus, e agentLastPing é sempre 'agora mesmo'. Um ativo com hasAgent: true e agentStatus: 'offline' (NOTE-EXEC-05, sem heartbeat há 96 h) fica online ao ser aprovado ou mesclado.
- **Impacto:** O inventário mostra um agente ativo e um ping recente que não existem, mascara equipamentos sem comunicação (risco de perda ou extravio) e distorce os indicadores de agentes online.
- **Evidência:** agentStatus: selectedApproveAsset.hasAgent ? 'online' : undefined, ... agentLastPing: 'agora mesmo'  /  agentStatus: discovered.hasAgent ? 'online' : existingAsset.agentStatus, agentLastPing: 'agora mesmo'
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-215 · [MÉDIA] Aprovação inventa serial e localização e descarta dados descobertos
- **Arquivo:** `src/components/assetManagement/CentralDiscoveryHub.tsx`
- **Localização:** handleConfirmApproval, linhas 226-270
- **Categoria:** Regra de negócio
- **Descrição:** Sem serial, é gerado um 'SN-' + número aleatório. Prédio, andar e quadrante são fixos ('Sede Corporativa - Torre A', '3º Andar', 'Q4'), ignorando discovered.location (por exemplo 'Data Center - Rack R02'). SO (operatingSystem), hasAgent, UUID, Service Tag, CPU, RAM e disco do descoberto não vão para o ITAsset.
- **Impacto:** O serial falso entra como chave de matching de prioridade 2 e pode gerar falsos negativos ou positivos. A localização patrimonial fica errada (um servidor aparece no 3º andar). Sem UUID e Service Tag, o matching futuro desses ativos fica impossível, e o contador de 'sem agente' do dashboard (hasAgent === false) ignora esses ativos.
- **Evidência:** serialNumber: selectedApproveAsset.serialNumber \|\| `SN-${Math.floor(Math.random() * 900000 + 100000)}`, ... building: 'Sede Corporativa - Torre A', floor: '3º Andar', quadrantCode: 'Q4',
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-216 · [MÉDIA] Tombo sugerido por length+1 sem checar unicidade (it_assets.asset_tag é UNIQUE)
- **Arquivo:** `src/components/assetManagement/CentralDiscoveryHub.tsx`
- **Localização:** linha 957 (suggestedTag); handleConfirmApproval 226-228; ApproveAssetModal.tsx 52 e 63-81
- **Categoria:** Banco de dados
- **Descrição:** O tombo sugerido é PAT-2026-(quantidade de ativos + 1), e nem o modal nem a confirmação checam se a tag já existe. Com os 13 ativos da massa de teste, a 10ª aprovação sugere PAT-2026-0023, que já é o PC-023. Qualquer exclusão adianta a colisão. A 1ª sugestão (PAT-2026-0014) é a tag que o alerta alt-03 atribui ao NOTE-EXEC-05.
- **Impacto:** Dois patrimônios com o mesmo tombo, ambiguidade em etiquetas e termos de responsabilidade, e falha no upsert para o Supabase, que tem constraint UNIQUE em asset_tag.
- **Evidência:** suggestedTag={`PAT-2026-${String(existingAssets.length + 1).padStart(4, '0')}`} — MIGRATION_UNICA_COMPLETA.sql:159 asset_tag VARCHAR(64) NOT NULL UNIQUE
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-217 · [MÉDIA] Ciclo de status inconsistente e KPIs divergentes entre Central e Dashboard
- **Arquivo:** `src/components/assetManagement/CentralDiscoveryHub.tsx`
- **Localização:** listas linhas 115-133; KPI 'Aguardando aprovação' 451-456; botão [REJEITAR] 711-719; AssetDashboardView.tsx 373-389
- **Categoria:** Regra de negócio
- **Descrição:** 'Novos Ativos — Aguardando aprovação' conta também itens APPROVED e REJECTED (o filtro só exclui MERGED e hasChanges). 'Possíveis Duplicidades' mantém APPROVED e REJECTED. [REJEITAR] aparece para itens já APPROVED e marca REJECTED sem remover nem reverter o ITAsset criado. O Dashboard conta 'novos' só como DISCOVERED\|PENDING, força no mínimo 3 em 'alterados' (Math.max(..., 3)) e soma descobertos sem agente sem filtrar status.
- **Impacto:** Contadores diferentes para o mesmo conceito em telas vizinhas, uma fila de aprovação que nunca esvazia, e um ativo REJECTED na Central que continua ativo no inventário. O KPI 'alterados' nunca fica abaixo de 3.
- **Evidência:** newAssetsList = discoveredAssets.filter(a => !a.hasChanges && a.status !== 'MERGED'); vs AssetDashboardView.tsx:374 filter(d => d.status === 'DISCOVERED' \|\| d.status === 'PENDING'); e :381 return Math.max(fromInventory, fromDiscovery, 3);
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-218 · [MÉDIA] [MANTER SEPARADOS] não cadastra o ativo como promete, e alertas não acompanham as decisões
- **Arquivo:** `src/components/assetManagement/CentralDiscoveryHub.tsx`
- **Localização:** handleKeepSeparate linhas 365-378; tooltip linha 812; DuplicateAnalysisModal.tsx 252; handleMergeDuplicate 354-359; handleConfirmApproval/handleRejectAsset (sem atualizar alertas)
- **Categoria:** UI não implementada
- **Descrição:** Os tooltips dizem 'Cadastrar como ativo novo separado (com tombo próprio)', mas o handler só zera isDuplicateSuspect e sobrescreve notes. Nenhum tombo é criado e a decisão não fica registrada para futuras execuções do matching. Só a mesclagem resolve alertas (e só os DUPLICATE_FOUND). Manter separado, aprovar (por exemplo o alerta UNAPPROVED_NEW_DEVICE do SRV-APP-DOCKER-02) e rejeitar deixam os alertas OPEN. Nenhum código cria alertas novos.
- **Impacto:** O operador acha que o ativo foi cadastrado quando não foi. Alertas críticos continuam abertos depois de tratados, o que infla 'Ocorrências pendentes', e as notas originais do descoberto se perdem.
- **Evidência:** title="Cadastrar como ativo novo separado, preservando o existente" → handleKeepSeparate: return { ...a, isDuplicateSuspect: false, notes: 'Marcado para manter separado como ativo independente.' };
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-219 · [MÉDIA] Algoritmo de matching com falsos positivos e falsos negativos estruturais
- **Arquivo:** `src/utils/assetMatchingEngine.ts`
- **Localização:** UUID 93-98; Serial 112-116; Service Tag 130-134; MAC 148-152; Hostname 170-213
- **Categoria:** Regra de negócio
- **Descrição:** (1) A prioridade UUID nunca casa: lê (a as any).uuid/machineUuid, que não existem em ITAsset nem em it_assets. (2) Não há lista de valores inválidos para serial/UUID/MAC ('To be filled by O.E.M.', 'Default string', 'FFFFFFFF-...', '00:00:00:00:00:00', que o próprio cmdbRouter usa como fallback), então máquinas diferentes casam com 98-100% e isDuplicateSuspect false. (3) Service Tag casa por substring (assetTag.includes(tag)) com só 3 caracteres e usa serialNumber como fallback. (4) O bônus de prefixo dá 88% para 'PC1' vs 'PC10' ou 'SRV' vs 'SRV-APP-01', e para qualquer ativo com nome vazio (startsWith('') é true). (5) Pela soma ponderada, PC-023 e PC-024, do mesmo modelo, categoria e sub-rede, chegam a 0,4 + 0,25 + 0,08 + 0,10 = 83%, acima do limiar de 80. (6) Sub-rede comparada como /24 fixo. (7) Variável simPct calculada e não usada.
- **Impacto:** Quando o motor for ligado, máquinas irmãs serão marcadas como duplicadas, e equipamentos white-box com serial genérico serão dados como o mesmo ativo com confiança de 98%. Isso pode levar a mesclagens indevidas.
- **Evidência:** if (normDiscoveredHost.startsWith(normAssetName) \|\| normAssetName.startsWith(normDiscoveredHost)) { overallSim = Math.max(overallSim, 0.88); }  /  return assetTag && (assetTag === normDiscoveredServiceTag \|\| assetTag.includes(normDiscoveredServiceTag));
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-220 · [MÉDIA] Diff de inventário gera alterações falsas com placeholders e variações de RAM
- **Arquivo:** `src/utils/inventoryDiffEngine.ts`
- **Localização:** RAM 104-117 e formatRamCapacity 22-29; SO 277-311; hostname 380-393; filtro de placeholder só no serial 395-397
- **Categoria:** Bug / código incompleto
- **Descrição:** Só o serial ignora 'Não disponível'. Os valores-padrão que o cmdbRouter põe em payloads legados (osName 'Desconhecido', version 'Não disponível', hostname = agentId, RAM 16 GB e disco 512 GB fixos, GPU 'Default GPU') são comparados como dados reais. A RAM não tem tolerância: qualquer diferença em MB (TotalPhysicalMemory no Windows, MemTotal no Linux) gera HARDWARE_CHANGED, e como o texto é arredondado para GB o registro pode sair '16 GB → 16 GB'. Os registros vão para a auditoria imutável (logAuditEvent).
- **Impacto:** A trilha de auditoria é poluída com mudanças de hardware, SO e identidade que não aconteceram, o que reduz a confiança nos alertas de drift.
- **Evidência:** if (prevRamMb && currRamMb && prevRamMb !== currRamMb) { ... formatRamCapacity(prevRamMb), formatRamCapacity(currRamMb) ... }  /  cmdbRouter.ts:2395 ram: { totalMb: (body.hardwareSpecs.ramTotalGb \|\| 16) * 1024 }, :2412 version: body.osVersion \|\| "Não disponível", :2417 hostname: body.hostname \|\| agentId
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-221 · [MÉDIA] Operador da auditoria fixo e nenhuma verificação de permissão em aprovar/mesclar/rejeitar
- **Arquivo:** `src/components/assetManagement/CentralDiscoveryHub.tsx`
- **Localização:** linhas 266 (performedBy: 'Administrador de TI'), 333 ('Administrador de TI WorkPulse'); assetMatchingEngine.ts 320 (padrão 'Administrador de TI')
- **Categoria:** Segurança
- **Descrição:** Os registros de histórico de aprovação e mesclagem usam um nome de operador fixo. A Central (e o AssetManagement, onde não há currentUser nem accessLevel) não recebe o usuário logado nem checa papel antes de mudar o inventário patrimonial. Todo o estado de descoberta está em localStorage e pode ser editado pelo cliente.
- **Impacto:** Não dá para saber quem aprovou ou mesclou um ativo, o que viola a rastreabilidade de auditoria patrimonial. Qualquer usuário com acesso à aba altera o inventário.
- **Evidência:** performedBy: 'Administrador de TI'  /  safeMergeAssets(existing, discovered, 'Administrador de TI WorkPulse'); — Grep 'currentUser\|accessLevel' em AssetManagement.tsx: nenhum resultado.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-222 · [MÉDIA] Pré-seleção de colaborador na aprovação usa a substring invertida e escolhe o primeiro funcionário
- **Arquivo:** `src/components/assetManagement/ApproveAssetModal.tsx`
- **Localização:** linhas 55-57
- **Categoria:** Bug / código incompleto
- **Descrição:** O colaborador é procurado com e.name.includes(asset.assignedUser \|\| ''). Quando o descoberto não tem usuário (servidores, impressoras, APs), includes('') é true e o primeiro funcionário é pré-selecionado. Quando tem, o assignedUser descoberto traz um sufixo ('Lucas Ribeiro (Desenvolvimento)') que não está contido no nome cadastrado, e não acha ninguém.
- **Impacto:** Servidores e impressoras aprovados com Enter ficam sob responsabilidade de um funcionário aleatório (o primeiro da lista), com efeito em termos de responsabilidade e LGPD.
- **Evidência:** employees.find(e => e.name.toLowerCase().includes((asset.assignedUser \|\| '').toLowerCase()))?.id \|\| ''
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-223 · [BAIXA] Modal de detalhes exibe valores inventados quando faltam dados
- **Arquivo:** `src/components/assetManagement/DiscoveredAssetDetailModal.tsx`
- **Localização:** linhas 75 ('v4.2'), 107 (94%), 110 ('PC-023'), 136-137 (CPU 'Intel Core i5 / AMD Ryzen'), 212 (Service Tag '8XYZ123'), 262 (latência 2 ms), 324 (localização 'Torre A - Sede Corporativa')
- **Categoria:** UI não implementada
- **Descrição:** Campos ausentes aparecem com valores plausíveis em vez de 'N/A'. Por exemplo, AP-WIFI-FLOOR2 (sem serviceTag e sem CPU) mostra Service Tag '8XYZ123' e CPU 'Intel Core i5 / AMD Ryzen'.
- **Impacto:** Informação falsa no inventário de descoberta, inclusive em chaves de identificação (Service Tag, prioridade 3), o que induz o operador a erro.
- **Evidência:** {asset.serviceTag \|\| '8XYZ123'} / {asset.cpu \|\| 'Intel Core i5 / AMD Ryzen'} / {asset.location \|\| 'Torre A - Sede Corporativa'}
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-224 · [BAIXA] Cobertura incompleta do diff (MAC/UUID/Service Tag, else-if do SO, ordem de interfaces)
- **Arquivo:** `src/utils/inventoryDiffEngine.ts`
- **Localização:** SO 281-311 (cadeia else-if); rede 316-357; identidade 380-407
- **Categoria:** Bug / código incompleto
- **Descrição:** Troca de placa de rede (MAC), systemUuid, serviceTag e serial da placa-mãe não são comparados, embora sejam as chaves de matching de prioridade 1, 3 e 4. Na cadeia if/else-if do SO, se nome e versão mudam juntos só o nome é registrado. O IP primário é o da primeira interface com IP válido, então uma simples mudança de ordem (Wi-Fi/Ethernet) gera NETWORK_CHANGED falso. O gateway só é lido em network[0].
- **Impacto:** Troca de hardware de identidade passa sem registro, e mudanças de rede espúrias aparecem na auditoria.
- **Evidência:** const prevGateway = prevNet[0]?.gateway; ... getPrimaryIp: for (const iface of netArr) { ... if (valid) return valid; } — nenhum bloco compara hardware.systemUuid, hardware.serviceTag ou network[].macAddress.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-225 · [BAIXA] Código morto e props sem uso na fatia de descoberta
- **Arquivo:** `src/components/assetManagement/CentralDiscoveryHub.tsx`
- **Localização:** linha 47 (matchDiscoveredAsset), 59/80 (onNavigateToTopology recebido e não usado), ~20 ícones lucide importados sem uso (Filter, Plus, XCircle, Layers, Wifi, Cpu, HardDrive, Laptop, Server, Printer, HelpCircle, Clock, ChevronRight, Sliders, Tag, Info, Zap); DuplicateAnalysisModal.tsx 17 (DuplicatePair); initialDiscoveryAssets.ts 1 (DuplicatePair); assetMatchingEngine.ts 6 (DiscoveryStatus) e 197 (simPct)
- **Categoria:** Duplicado / obsoleto
- **Descrição:** Imports, tipos, funções (buildDuplicatePair) e props não usados, o que deixa duplicada a lógica de comparação (buildDuplicatePair x comparisonFields do modal, cada uma com normalização diferente).
- **Impacto:** Mais manutenção, e regras de comparação divergentes que confundem quem for evoluir o código.
- **Evidência:** import { matchDiscoveredAsset, safeMergeAssets } — só safeMergeAssets é chamado; onNavigateToTopology só aparece na desestruturação.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-226 · [BAIXA] Navegação do Dashboard ignora a seção pedida e filtro de método incompleto
- **Arquivo:** `src/components/AssetManagement.tsx`
- **Localização:** linhas 795-797 (onNavigateToDiscovery ignora tabKey); CentralDiscoveryHub.tsx 83 (sempre 'new_assets') e 598-601 (opções do filtro de método)
- **Categoria:** UI não implementada
- **Descrição:** Os cards do Dashboard chamam onNavigateToDiscovery('changed_assets' \| 'no_agent' \| 'alerts'), mas o handler ignora o tabKey e a Central não tem prop de seção inicial: sempre abre em 'Novos Ativos'. O filtro de método só oferece AGENT, NETWORK_SNMP e ARP_PING, embora o tipo também tenha WMI, SSH, DHCP e MANUAL.
- **Impacto:** O clique em 'Alterados' ou 'Alertas' no Dashboard leva à aba errada, e ativos descobertos por WMI, SSH, DHCP ou manualmente não podem ser filtrados.
- **Evidência:** onNavigateToDiscovery={(tabKey) => { setActiveSubTab('discovery_hub'); }}  /  useState<DiscoverySectionTab>('new_assets')
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-227 · [BAIXA] Massa de teste de descoberta inconsistente com o inventário base
- **Arquivo:** `src/data/initialDiscoveryAssets.ts`
- **Localização:** alertas alt-02 (assetTag 'PAT-2026-0008', linha 281) e alt-03 (assetTag 'PAT-2026-0014', linha 294); ativo disc-changed-01 (linhas 125-187); initialAssets.ts linhas 45 e 863
- **Categoria:** Banco de dados
- **Descrição:** O alt-02 diz que DESK-FIN-08 é o PAT-2026-0008, mas no inventário PAT-2026-0008 é o 'Notebook Executive Lenovo ThinkPad X1 Carbon'. O PAT-2026-0014 (NOTE-EXEC-05) não existe no inventário e é justamente o 1º tombo que a aprovação sugere. DESK-FIN-08, mostrado como 'ativo alterado', não existe na base e não tem matchedAssetId. ast-101 e ast-023 têm o mesmo MAC.
- **Impacto:** Alertas apontam para patrimônios errados, mudanças de hardware não têm ativo-alvo, e o MAC duplicado provoca o erro de alvo do [ANALISAR].
- **Evidência:** alt-02: assetName: 'DESK-FIN-08', assetTag: 'PAT-2026-0008' vs initialAssets.ts:535-536 assetTag 'PAT-2026-0008', name 'Notebook Executive Lenovo ThinkPad X1 Carbon'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-228 · [BAIXA] Estado 'offline' e 'última comunicação' estáticos e persistidos como texto relativo
- **Arquivo:** `src/components/assetManagement/CentralDiscoveryHub.tsx`
- **Localização:** offlineAssetsList linhas 123-125; initialDiscoveryAssets.ts lastSeen (ex.: 'há 1 min', linha 26); AssetManagement.tsx 128-130
- **Categoria:** Estabilidade
- **Descrição:** Offline vem só do campo agentStatus gravado, nunca de lastSeen ou heartbeat. lastSeen é guardado como texto relativo ('há 30 seg') e persistido indefinidamente em localStorage. Depois do primeiro carregamento, os dados de teste nunca são atualizados.
- **Impacto:** Dias depois, a interface ainda mostra 'há 1 min' e 'online' para equipamentos sem comunicação. A seção 'Ativos Offline — Sem heartbeat recente' não reflete a realidade.
- **Evidência:** const offlineAssetsList = useMemo(() => discoveredAssets.filter(a => a.agentStatus === 'offline' && a.hasAgent), ...); lastSeen: 'há 1 min'
- **Verificação:** Evidência do auditor (não reconferido individualmente)

### 6.10 Topologia de infraestrutura (linhas 1–4800)

_Forma de exame: Agente (leitura integral) — 23 achados._

> **Estado do módulo:** A fatia S10 (linhas 1 a 4800 de src/components/InfraTopology.tsx e src/data/topology_saved.json) contém os tipos, os dados semente (INITIAL_*), a geometria de portas, todo o estado do editor de topologia (cerca de 61 useState em um único componente), os handlers de layout, histórico, cabos, SNMP e boa parte do painel Inspetor. O que funciona de verdade: edição local de salas, nós e cabos, desfazer/refazer por snapshots e persistência via GET/POST /api/topology, que grava o JSON inteiro em src/data/topology_saved.json. A persistência é frágil. O POST não tem autenticação nem validação, o servidor escuta em 0.0.0.0 e a regra é "o último a gravar vence". O autosave envia o estado completo 2 s após cada montagem, mesmo sem alterações, e o localStorage, que o backupManager usa, só é atualizado em algumas ações e fica desatualizado. O Scanner SNMP é totalmente simulado (setTimeout com 6 dispositivos fixos). Ele ainda é disparado de novo a cada remontagem da aba, porque o snmpScanTrigger do App nunca é zerado. Há bugs de lógica de layout: arrastar uma sala "varre" nós de outras salas, o auto-sequenciamento usa uma closure desatualizada e não move a mobília junto, e a exclusão de sala deixa nós órfãos e pode ser disparada pela tecla Delete em qualquer modo de visualização. Muitas ações em grupo não gravam snapshot no histórico. O arquivo topology_saved.json persistido já mostra corrupção referencial: roomId, connectedTo e uplinkDevice apontam para entidades inexistentes, há IPs duplicados e coordenadas sobrepostas. Os IDs de sala usados pelo módulo de ativos (room_dc, room_office) não existem na topologia. Também há bastante código morto: exportação de diagrama só com toast, gerador de prompt, configuração de inclusão, setters de grade/snap nunca chamados, organizar quadrantes e auto-ajuste nunca invocados, e as props currentUser e onOpenKnowledgeBase ignoradas, o que significa que não há controle de permissão. Por fim, tabelas de tamanhos padrão estão duplicadas com valores divergentes. Os principais riscos são a perda ou sobrescrita silenciosa do layout (por concorrência, por acesso não autenticado na rede ou ao trocar de aba) e a integridade referencial já comprometida dos dados persistidos.

#### A-229 · [CRÍTICA] Endpoint /api/topology sem autenticação e sem validação grava arquivo inteiro em src/
- **Arquivo:** `server.ts`
- **Localização:** server.ts linhas 208-232 (GET/POST /api/topology), 33 (express.json 10mb), 266 (listen 0.0.0.0); consumido em src/components/InfraTopology.tsx 1319-1363 e 1575-1595
- **Categoria:** Segurança
- **Descrição:** O POST /api/topology aceita qualquer corpo JSON (até 10 MB) de qualquer cliente, sem autenticação, autorização, schema ou checagem de tipo, e sobrescreve integralmente src/data/topology_saved.json com writeFileSync não atômico. O GET também é público. Não há middleware de autenticação montado antes dessas rotas no server.ts.
- **Impacto:** Qualquer host que alcance a porta 3000 na rede pode apagar ou corromper toda a topologia (por exemplo, POST {} ou {rooms:[]}) ou ler o mapa de IPs, VLANs e MACs da infraestrutura. Uma escrita interrompida deixa um JSON inválido, e o GET passa a devolver null.
- **Evidência:** server.ts:222-226: `const topologyData = req.body; ... fs.writeFileSync(TOPOLOGY_FILE_PATH, JSON.stringify(topologyData, null, 2), "utf-8");` e linha 266 `app.listen(PORT, "0.0.0.0", ...)`. Nenhum middleware de autenticação entre as linhas 17-41.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-230 · [ALTA] Persistência 'último a gravar vence', com autosave do estado completo a cada montagem
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** linhas 1209-1316 (estado inicial vindo do localStorage), 1319-1351 (GET na montagem), 1354-1363 (autosave debounce 2s)
- **Categoria:** Estabilidade
- **Descrição:** O autosave envia {rooms, nodes, links, wings, stationStandards, accessories} inteiros ao servidor 2 s após qualquer mudança, inclusive logo após a montagem, mesmo sem edição do usuário. Não há versão, ETag nem merge, então duas abas ou dois usuários sobrescrevem o trabalho um do outro. O estado inicial vem do localStorage, que fica desatualizado (veja o achado sobre localStorage). Se o GET falhar ou demorar mais que 2 s, esse estado antigo é gravado sobre o servidor. O GET ignora arrays vazios (`data.rooms.length > 0`), então excluir todas as salas ou nós nunca é refletido no recarregamento: os dados antigos voltam e são regravados.
- **Impacto:** Perda silenciosa de alterações em uso concorrente e reversão para layouts antigos. Operações legítimas, como remover todas as salas, são desfeitas automaticamente.
- **Evidência:** 1354-1360: `const timer = setTimeout(() => { fetch('/api/topology', { method: 'POST', ... body: JSON.stringify({ rooms, nodes, links, wings, stationStandards, accessories }) }).catch(() => {}); }, 2000);` com deps [rooms, nodes, links, ...], que rodam também na montagem. 1324: `if (Array.isArray(data.rooms) && data.rooms.length > 0)`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-231 · [ALTA] localStorage não acompanha o autosave: backup do sistema fica desatualizado e restauração é anulada
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** InfraTopology.tsx 1319-1363 (autosave grava só no servidor), setItem apenas em 1326-1346, 1494-1561, 1576-1581, 1896, 3733; src/utils/backupManager.ts 91-96 e 451-470
- **Categoria:** Falha de integração
- **Descrição:** Edições comuns (arrastar, adicionar nó, criar cabo, editar inspetor) só vão para o servidor. O localStorage é atualizado apenas no GET inicial, em desfazer/refazer, no botão Salvar e em ajustes de tamanho de sala. O backupManager lê a topologia exclusivamente do localStorage e, na restauração, grava só no localStorage. Na próxima montagem, o GET /api/topology sobrescreve o que foi restaurado, e o autosave regrava os dados do servidor.
- **Impacto:** O backup corporativo exporta uma topologia antiga. A restauração de backup da topologia não tem efeito real enquanto o servidor responder, o que engana o administrador.
- **Evidência:** backupManager.ts:91 `const topoNodes = safeParse('applet_infra_topology_nodes', []);` e 454 `localStorage.setItem('applet_infra_topology_nodes', ...)`. InfraTopology.tsx:1328-1330 sobrescreve com os dados do servidor: `setNodes(data.nodes); localStorage.setItem(...)`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-232 · [ALTA] Varredura SNMP é redisparada e a visão é forçada a cada remontagem da aba
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** linhas 3073-3078; src/App.tsx 302, 793, 1038-1048
- **Categoria:** Bug / código incompleto
- **Descrição:** O App incrementa snmpScanTrigger quando o botão do cabeçalho é usado na aba e nunca o zera. Como o InfraTopology é remontado a cada troca de aba, o useEffect([snmpScanTrigger]) roda na montagem com valor > 0, muda a visão para 'discovery' e inicia uma nova varredura simulada.
- **Impacto:** Depois de usar o botão uma vez, toda volta à aba de Topologia abandona o Editor 2D, abre o Scanner e repete a varredura, o que quebra o fluxo do usuário.
- **Evidência:** 3073-3077: `useEffect(() => { if (snmpScanTrigger && snmpScanTrigger > 0) { setViewMode('discovery'); handleStartSnmpScan(); } }, [snmpScanTrigger]);`. App.tsx:793 `setSnmpScanTrigger(prev => prev + 1);`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-233 · [ALTA] Scanner SNMP/LLDP totalmente simulado (setTimeout e lista fixa)
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** INITIAL_DISCOVERED_DEVICES 586-689; estados 2984-2994; handleStartSnmpScan 3021-3070; setDiscoveredDevices nunca usado (2989)
- **Categoria:** UI não implementada
- **Descrição:** A 'Varredura SNMP' só emite logs fixos via quatro setTimeout e nunca contata a rede nem o backend. Subnet, community e versão são apenas interpolados no log. A lista de dispositivos descobertos é constante (setDiscoveredDevices nunca é chamado). Não existe rota de descoberta SNMP ligada à topologia, e os timers não são cancelados no unmount.
- **Impacto:** O usuário vê '6 dispositivos de infraestrutura identificados' e pode inserir na topologia equipamentos que não existem na rede (Cisco, FortiGate, ESXi fictícios), produzindo documentação de infraestrutura falsa.
- **Evidência:** 3030-3069: `setTimeout(() => { setScanProgress(35); setScanLogs(prev => [... 'Host respondeu em 192.168.10.1 (RTT: 2ms): Cisco Catalyst 9300...' ]) }, 600);` ... `showToast('Varredura SNMP finalizada! 6 dispositivos...')`. Grep: `setDiscoveredDevices` aparece só na declaração.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-234 · [ALTA] Integridade referencial quebrada no topology_saved.json, nos seeds e entre topologia e ativos
- **Arquivo:** `src/data/topology_saved.json`
- **Localização:** topology_saved.json: nodes bench_pc_*/supervisio_pc_*/island_pc_* (roomId 'room_operacoes'), dev_1787368861986 (roomId 'room_1787369529435_pc20'), connectedTo 'patch_panel', rooms[].uplinkDevice 'main_switch', stationStandards[].roomId 'room_office', accessories[].roomId 'room_dc'; InfraTopology.tsx 745-757 (INITIAL_TOPOLOGY_LINKS), 1366-1372 (seleção inicial 'rack_a'/'room_office'), 2139-2148, 2280, 2313, 2592, 1841; src/data/initialAssets.ts 39, 157, 290...
- **Categoria:** Banco de dados
- **Descrição:** No arquivo persistido nenhuma das salas tem id 'room_operacoes' ou 'room_1787369529435_pc20', e não existem nós 'patch_panel' ou 'main_switch'. Padrões e acessórios apontam para 'room_office' e 'room_dc', inexistentes. Os links semente referenciam core_router, main_switch, patch_panel, rack_a, rack_b, access_point e ws_1..6, que não existem em INITIAL_TOPOLOGY_NODES. Os nós persistidos têm coordenadas duplicadas (supervisio_pc_1/2 em 98,350; island_pc_1/2 em 127,350) e ficam fora de qualquer sala (as salas começam em x=420). Os ativos ITAM usam roomId 'room_dc'/'room_office', que também não existem na topologia.
- **Impacto:** Contagens por sala, filtros, heatmap e o vínculo ativo↔sala dão resultados errados. Cabos semente nunca aparecem. O relacionamento entre o módulo de ativos e a topologia está efetivamente desconectado.
- **Evidência:** topology_saved.json: `"id": "bench_pc_1" ... "roomId": "room_operacoes"`. Os ids das rooms são apenas room_1787368578526_757s, room_1787368614121_0dtb, room_1787368662780_hon4 e room_1787369809465_y1go. InfraTopology.tsx:2592 `connectedTo: 'patch_panel'` fixo. initialAssets.ts:39 `roomId: 'room_dc'`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-235 · [MÉDIA] Alterações feitas menos de 2 s antes de sair da aba são descartadas
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** linhas 1354-1363 (cleanup clearTimeout); src/App.tsx 1038-1049 (montagem condicional por aba)
- **Categoria:** Estabilidade
- **Descrição:** O componente é desmontado ao trocar de aba (`activeTab === 'infra_topology' && <InfraTopology/>`). O cleanup do efeito de autosave cancela o timer pendente sem fazer flush, e essas edições também não estão no localStorage.
- **Impacto:** Quem edita e troca de aba logo em seguida perde a última alteração sem aviso. Ao voltar, vê o layout anterior.
- **Evidência:** 1362: `return () => clearTimeout(timer);` sem envio final. App.tsx:1038 `{activeTab === 'infra_topology' && ( <InfraTopology ...`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-236 · [MÉDIA] Feedback de salvamento falso: sucesso exibido mesmo com erro HTTP; autosave falha em silêncio
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** handleSaveLayout linhas 1583-1594; autosave linha 1360
- **Categoria:** Bug / código incompleto
- **Descrição:** handleSaveLayout não verifica res.ok. Um 500 do servidor (por exemplo, erro de escrita) retorna JSON {error}, e o código exibe 'salvos e publicados com sucesso'. Em falha de rede, mostra 'Layout salvo localmente!'. O autosave descarta qualquer erro com `.catch(() => {})`, sem indicador de estado.
- **Impacto:** O usuário acredita que o layout foi publicado quando não foi, e falhas de persistência passam despercebidas.
- **Evidência:** 1588-1591: `.then(res => res.json()).then(() => { showToast('Layout, ambientes, alas e inventário salvos e publicados com sucesso no servidor!'); })`. server.ts:230 responde `res.status(500).json({ error })`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-237 · [MÉDIA] Possível ciclo de recarga em dev: POST grava arquivo importado pelo próprio componente
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** linha 87 (import savedTopologyData from '../data/topology_saved.json'); server.ts 208 e 226; vite.config.ts 17-19
- **Categoria:** Estabilidade
- **Descrição:** O servidor grava em src/data/topology_saved.json, que é importado estaticamente pelo InfraTopology.tsx. Em dev, o Vite roda em middleware com watch/HMR ativos (DISABLE_HMR não está definido no .env). Cada gravação invalida o módulo JSON e o componente, que exporta não-componentes e por isso não é uma fronteira de Fast Refresh. O resultado é uma atualização ou remontagem que reexecuta o efeito de autosave, gerando nova gravação 2 s depois.
- **Impacto:** Em desenvolvimento: recargas/HMR repetidas, perda de estado transitório (seleção, histórico de desfazer) e escrita contínua em disco.
- **Evidência:** server.ts:208 `path.join(process.cwd(), "src", "data", "topology_saved.json")`. vite.config.ts:19 `watch: process.env.DISABLE_HMR === 'true' ? null : {}`. O .env contém apenas NODE_ENV, PORT e chaves Supabase (sem DISABLE_HMR). Ciclo inferido pela mecânica do Vite/Fast Refresh, não observado em execução.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-238 · [MÉDIA] Arrastar sala 'varre' nós de outras salas e reatribui roomId
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** handleUpdateRoomPosition linhas 1858-1885 (chamado a cada mousemove em 7570); também nos inputs Posição X/Y 4620-4639
- **Categoria:** Bug / código incompleto
- **Descrição:** A cada passo do arraste, todo nó cujo x,y caia no retângulo atual da sala (com margem de 10px) é movido junto e recebe roomId da sala arrastada. Quando a sala passa por cima de nós de outra sala ou de salas aninhadas (por exemplo, Supervisão dentro de Operacional, ou Banheiro dentro de Recepção nos seeds), eles são capturados e arrastados. Digitar no input Posição X/Y (valor vazio vira 0) também move a sala e os nós capturados.
- **Impacto:** A mobília e os equipamentos de outros ambientes são deslocados e reassociados à sala errada, corrompendo o layout e a relação nó–sala persistida.
- **Evidência:** 1869-1881: `const isInside = ( node.roomId === id \|\| (node.x >= currentRoom.x - 10 && node.x <= currentRoom.x + currentRoom.width + 10 && ...)); if (isInside) { return { ...node, roomId: id, x: ..., y: ... } }`. Em topology_saved.json, a sala 'Supervisão' (420,380,90x190) está contida em 'Operacional' (420,270,250x410).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-239 · [MÉDIA] Auto-sequenciar alas: closure desatualizada na centralização e mobília não acompanha as salas
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** handleAutoSequenceWings 1598-1664; handleCenterLayout 1667-1752 (acionado via UI em 6744 e 6792)
- **Categoria:** Bug / código incompleto
- **Descrição:** handleAutoSequenceWings reposiciona só as salas (os nós ficam onde estavam) e, 60 ms depois, chama handleCenterLayout da closure do render anterior. Essa versão calcula o deslocamento com base nas posições antigas das salas e grava no histórico um snapshot também antigo. O deslocamento é então aplicado sobre as posições novas.
- **Impacto:** A centralização após o auto-sequenciamento fica errada, a mobília fica fora das salas reorganizadas e o snapshot de desfazer de 'Centralizou' não corresponde ao estado real.
- **Evidência:** 1654-1656: `setTimeout(() => { handleCenterLayout(); }, 60);` handleCenterLayout é useCallback com deps [rooms, nodes, ...] capturado antes do setRooms. 1635-1639 atualizam apenas rooms (x,y), sem setNodes.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-240 · [MÉDIA] Exclusão de sala deixa nós e inventário órfãos; Delete/Backspace global apaga sem confirmação
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** handleDeleteRoom 2191-2197; listener keydown 1755-1801 (Delete/Backspace 1787-1793); handleDeleteNode 2821-2828
- **Categoria:** Regra de negócio
- **Descrição:** handleDeleteRoom remove só a sala. Nós com roomId, padrões de estação e acessórios que apontam para ela ficam órfãos. O listener está em window e funciona em qualquer viewMode (tabelas, scanner). Ao clicar num nó, selectedRoomId recebe a sala dele e não é limpo ao excluir o nó, então um segundo Delete exclui a sala inteira sem confirmação. Com multisseleção, Delete apaga apenas o primeiro item. O efeito não lista handleDeleteNode/Room nas deps, então o snapshot de histórico gravado pode estar desatualizado.
- **Impacto:** Exclusão acidental de ambientes e referências quebradas persistidas pelo autosave em 2 s. O arquivo salvo já contém nó com roomId 'room_1787369529435_pc20', que não existe.
- **Evidência:** 1790-1792: `if (selectedNodeId) handleDeleteNode(selectedNodeId); else if (selectedRoomId) handleDeleteRoom(selectedRoomId);`. 2194: `setRooms(prev => prev.filter(r => r.id !== id));` sem tratar nodes/stationStandards/accessories. Grep: nenhum `confirm(` no arquivo.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-241 · [MÉDIA] Ações em grupo e várias edições não registram histórico (desfazer inconsistente)
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** Excluir grupo 3983-3996; mudar sala do grupo 3834-3841; alinhar 3928-3949; duplicar grupo 3953-3975; handleRotateGroupItemsInPlace 2810-2818; handleUpdateRoomSize 1887-1901; handleUpdateRoomDoor 1964-1966; handleSetRoomDoorOffsetPreset 1968-1983; handleUpdateLink 2235-2237; handleUpdateNodeData 2922-2929; handleResetNodeSize 2897-2919; handleSaveStation/Accessory 2259-2326
- **Categoria:** Bug / código incompleto
- **Descrição:** Essas operações alteram o estado sem chamar recordHistorySnapshot e, no caso da exclusão em grupo, sem confirmação. Como o desfazer restaura o último snapshot completo, um Ctrl+Z após uma dessas ações descarta, além delas, toda alteração não registrada desde o snapshot anterior.
- **Impacto:** A exclusão em massa não pode ser desfeita de forma confiável, e o desfazer pode apagar trabalho intermediário de forma inesperada.
- **Evidência:** 3985-3990: `setNodes(prev => prev.filter(n => !selectedNodeIds.includes(n.id))); setLinks(...); setSelectedNodeIds([]); showToast(...)`, sem recordHistorySnapshot. Em contraste, handleDeleteNode (2823) registra.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-242 · [MÉDIA] Alocação de IP gera duplicados/inválidos e atribui IP a mobília
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** handleAddEquipment 2458 e 2590-2599; handleDuplicateNode 2639; duplicar grupo 3962-3968; inspetor IP 4453-4458; seed central_printer 717 vs INITIAL_DISCOVERED_DEVICES 659
- **Categoria:** Regra de negócio
- **Descrição:** O IP padrão é `192.168.10.${100 + nodes.length}`, sem checar se já está em uso nem o limite de 255. Mesas, cadeiras e mesas de reunião recebem IP, VLAN, connectedTo e flags de monitor duplo/VoIP. A duplicação em grupo copia ip, assetTag e assetId, enquanto a duplicação individual limpa assetTag/assetId. O campo IP do inspetor aceita qualquer texto. O seed 'central_printer' usa 192.168.10.50, o mesmo IP do NAS descoberto: mapear o NAS é bloqueado como 'já mapeado' e seleciona a impressora.
- **Impacto:** Inventário de rede inconsistente, com IPs repetidos ou inválidos (por exemplo, 192.168.10.260 com mais de 155 nós), patrimônio vinculado em duplicidade e conflito na importação SNMP.
- **Evidência:** topology_saved.json: island_pc_2 e a 'Mesa 1' (type desk) com ip 192.168.10.112; island_pc_3 e 'Estação 1' com 192.168.10.113; 'Mesa de Reunião 1' (type table) com ip 192.168.10.115. Código 2458: `let defaultIp = `192.168.10.${100 + nodes.length}`;`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-243 · [MÉDIA] Vínculo de patrimônio quebra quando o nó não tem 'details' e é unidirecional
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** select 'Vínculo de Patrimônio (ITAM)' linhas 4147-4177
- **Categoria:** Bug / código incompleto
- **Descrição:** Ao vincular um ativo sem macAddress (opcional em ITAsset), o código lê `selectedNode.details.macAddress`. Os nós do arquivo persistido (bench_pc_*, island_pc_*) não têm 'details', então ocorre TypeError no onChange e o vínculo não é salvo. O vínculo também é gravado só no nó: ITAsset.roomId não é atualizado e o mesmo ativo pode ser vinculado a vários nós.
- **Impacto:** O usuário não consegue vincular ativos sem MAC a esses equipamentos (falha silenciosa no console), e a localização do ativo no módulo de Gestão de Ativos não reflete a topologia.
- **Evidência:** 4162: `macAddress: ast.macAddress \|\| selectedNode.details.macAddress`. types.ts:343 `macAddress?: string;`. topology_saved.json bench_pc_1 sem a chave "details". types.ts:327 `roomId?: string; // Vinculado a ambiente/sala` nunca atualizado aqui.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-244 · [MÉDIA] Sem controle de permissão: qualquer usuário edita ou apaga toda a topologia
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** props currentUser 561 e 1196 (nunca usada); handlers de exclusão 2191, 2821, 3983; App.tsx 1039-1048
- **Categoria:** Segurança
- **Descrição:** O App passa currentUser, mas o componente não o consulta. Todas as ações destrutivas (excluir salas, grupos, cabos, alas, salvar layout) ficam disponíveis a qualquer perfil, e o backend /api/topology também não verifica identidade.
- **Impacto:** Um perfil sem atribuição de TI pode alterar ou destruir a documentação de infraestrutura, sem trilha de auditoria de quem alterou.
- **Evidência:** Grep 'currentUser' no arquivo: apenas 561 (interface) e 1196 (desestruturação).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-245 · [MÉDIA] Componente monolítico com re-render total a cada mousemove e cópias profundas no histórico
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** componente InfraTopology 1195-…(9457 linhas, 61 useState); recordHistorySnapshot 1452-1464; handleUpdateRoomSize 1894-1898; listeners 1755-1801; InteractiveMovableCanvas (7147) sem React.memo
- **Categoria:** Desempenho
- **Descrição:** Cada mousemove de arraste chama setNodes ou setRooms no componente raiz, re-renderizando o inspetor, a barra de ferramentas e o canvas inteiro (não memoizado, com handlers recriados a cada render). Cada snapshot faz JSON.parse(JSON.stringify()) de rooms, nodes e links, guardando até 40 no histórico e 40 no refazer. O slider de tamanho de sala grava o JSON completo no localStorage a cada tick. Os listeners globais são removidos e recriados a cada mudança de seleção ou histórico.
- **Impacto:** Engasgos perceptíveis no arraste e no slider com plantas maiores, alto uso de memória com o histórico e manutenção difícil.
- **Evidência:** 1457-1459: `rooms: JSON.parse(JSON.stringify(rooms)), nodes: JSON.parse(JSON.stringify(nodes)), links: ...`. 1896: `localStorage.setItem('applet_infra_topology_rooms', JSON.stringify(updated));` dentro do updater. Grep 'React.memo' sem ocorrências; 61 ocorrências de useState<.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-246 · [BAIXA] Funções de geometria ignoram a escala 0.5 de renderização dos nós
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** findNonOverlappingPosition 2358-2450; handleCenterLayout 1683-1686; handleAutoFitNodesInQuadrants 2014, 2028, 2078; versus renderização 8671-8672 e 8711; handleCenterLayout 1669 (n.activeOnMap)
- **Categoria:** Bug / código incompleto
- **Descrição:** Os nós são desenhados com `scale(0.5)` (largura visual = width*0.5), e as rotações de grupo já usam 0.5. Já a busca de posição livre, a checagem de sobreposição, os limites da centralização e a centralização no auto-ajuste usam width/height cheios. handleCenterLayout ainda filtra por `n.activeOnMap`, propriedade que não existe em TopologyNode, então o filtro não tem efeito.
- **Impacto:** Espaçamento excessivo ao inserir itens (salas parecem 'cheias' antes da hora, caindo no fallback), equipamentos descentralizados e caixa de centralização calculada maior que o conteúdo real.
- **Evidência:** 8671: `const scaledW = origW * 0.5;`. 2379: `checkOverlap(candidate, { x: n.x, y: n.y, width: n.width \|\| 50, height: n.height \|\| 40 }, margin)`. 1669: `nodes.filter(n => n.activeOnMap !== false)`, sem activeOnMap na interface 193-218.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-247 · [BAIXA] Organizar quadrantes e auto-ajuste de nós nunca são invocados (e contêm bugs latentes)
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** handleAutoFitNodesInQuadrants 1984-2126; handleOrganizeQuadrantsAttached 2129-2166; props 3658-3659; MovableCanvasProps 7122-7123 e 7186-7187
- **Categoria:** Desconectado
- **Descrição:** Os handlers são passados como onAutoFitNodes/onOrganizeQuadrants, mas o canvas apenas os desestrutura e nunca os chama. Se forem religados, eles empilham na mesma posição todas as salas com o mesmo quadrantCode (os seeds têm 5 salas Q2 e 4 salas Q6), usam IDs legados (room_dc, room_office, room_technical, room_meeting), chamam o auto-ajuste por setTimeout com closure desatualizada de rooms e não gravam histórico.
- **Impacto:** Código morto que aumenta a manutenção. Reativá-lo sem correção destruiria o layout sem possibilidade de desfazer.
- **Evidência:** Grep 'onOrganizeQuadrants' só retorna 3659, 7123 e 7187 (nenhuma chamada). 2139: `if (room.quadrantCode === 'Q1' \|\| room.id === 'room_dc') { return { ...room, x: startX, y: startY, width: q1W, height: row1H }; }`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-248 · [BAIXA] Código morto: exportação de diagrama só com toast, gerador de prompt, configs e handlers sem uso
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** handleExportDiagram 3017-3019; promptText/handleCopyPrompt/copiedPrompt 2997-3015 e 1444; config/setConfig/isInclusionDrawerOpen 1427-1428; setShowQuadrantGuides 1206, setSnapToGrid/setGridSize 1422-1423; handleAddRoomInQuadrant 2168-2189; handleSelectAllNodesInRoom 2831-2848; props currentUser/onOpenKnowledgeBase 1196-1198; INITIAL_TOPOLOGY_LINKS 745-757
- **Categoria:** Desconectado
- **Descrição:** handleExportDiagram só exibe 'Exportando diagrama ... SVG' e não exporta nada (também não é referenciado). O gerador de prompt e a configuração de inclusão não são renderizados nem alterados. Os setters de guia de quadrante, snap e grade nunca são chamados, então esses valores são fixos. handleAddRoomInQuadrant, handleSelectAllNodesInRoom, currentUser e onOpenKnowledgeBase são declarados e nunca usados.
- **Impacto:** Funcionalidades aparentes (exportar SVG, prompt, ajuste de grade) inexistentes, e um arquivo de 9457 linhas com peso morto que dificulta a manutenção.
- **Evidência:** Contagem via grep: handleExportDiagram=1 (só a definição), handleCopyPrompt=1, copiedPrompt=1, isInclusionDrawerOpen=1, setSnapToGrid=1, setGridSize=1, setShowQuadrantGuides=1, handleAddRoomInQuadrant=1, handleSelectAllNodesInRoom=1, currentUser=2 (interface e desestruturação).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-249 · [BAIXA] Timers de toast não são cancelados: um toast novo é fechado pelo timer do anterior
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** showToast 1440-1443; handleStartSnmpScan 3030-3069; handleCopyPrompt 3014
- **Categoria:** Estabilidade
- **Descrição:** showToast agenda setTimeout(3000) sem guardar nem limpar o anterior. Se um toast surge 2 s após outro, o timer antigo o apaga após 1 s. Os timeouts da varredura também não são cancelados no unmount.
- **Impacto:** Mensagens de feedback somem antes do tempo, e há atualizações de estado após a desmontagem.
- **Evidência:** 1441-1442: `setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000);`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-250 · [BAIXA] Espelhamento horizontal e vertical aplicam a mesma troca de rotação
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** handleFlipGroupHorizontal 2750-2755; handleFlipGroupVertical 2791-2796
- **Categoria:** Bug / código incompleto
- **Descrição:** As duas funções trocam 0↔180 e 90↔270. Num espelhamento horizontal, a orientação vertical (0/180) deveria ser preservada e só 90↔270 invertida; no vertical, o contrário.
- **Impacto:** Cadeiras e itens orientados ficam virados para o lado errado depois de espelhar um grupo.
- **Evidência:** As duas funções contêm `if (curRot === 0) newRot = 180; else if (curRot === 180) newRot = 0; else if (curRot === 90) newRot = 270; else if (curRot === 270) newRot = 90;`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-251 · [BAIXA] Tabelas de tamanho padrão e lógica repetidas com valores divergentes; categoria inexistente
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** handleAddEquipment 2460-2538; handleScaleNode 2887-2888; handleResetNodeSize 2900-2915; troca de tipo 4023-4038; inspetor 4216-4250; canvas 7337-7338; mapeamento SNMP 3099-3116 e 3160-3166; nomes de parede 1936-1942 e 1954-1960; undo/redo/restore 1467-1565; 'server_room' 3090 e 3148
- **Categoria:** Duplicado / obsoleto
- **Descrição:** Os tamanhos padrão por tipo estão replicados em pelo menos 6 lugares com valores conflitantes: workstation é 104x70 ao inserir, mas 83x56 no reset, na troca de tipo e na escala, e o inspetor nem tem fallback para workstation. A lógica de tamanho SNMP, o dicionário de paredes e a montagem de snapshots estão duplicados. A busca da sala de destino do SNMP compara com a categoria 'server_room', que não existe em EnvironmentCategory, e usa o substring 'ti', que pode casar com qualquer nome. Os dados INITIAL_* também se repetem no topology_saved.json.
- **Impacto:** Comportamento inconsistente ('100%' não restaura o tamanho de inserção da estação) e correções que precisam ser feitas em vários lugares.
- **Evidência:** 2483-2484: `newWidth = 104; newHeight = 70;` (workstation) contra 2906 `else if (node.type === 'workstation') { defW = 83; defH = 56; }`. 3090: `r.category === 'server_room'`, sem esse valor no tipo da linha 124.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

### 6.11 Topologia de infraestrutura (linhas 4700–9457)

_Forma de exame: Agente (leitura integral) — 15 achados._

> **Estado do módulo:** A fatia S11 (linhas 4700 a 9457 de src/components/InfraTopology.tsx) cobre quatro blocos: o fim do painel Inspetor (rótulo da sala e cabos), o menu de contexto do botão direito, as abas Descoberta SNMP, Ambientes, Padrões de Estação e Acessórios, os modais de edição (sala, estação, acessório, gestão de alas e histórico) e o subcomponente InteractiveMovableCanvas (SVG com arrastar, redimensionar, portas, rótulos, cabos, mapa de calor e seleção por área). Toda a edição é feita em estado React local. A persistência depende do auto-save com debounce para POST /api/topology (que grava src/data/topology_saved.json) e de escritas avulsas em localStorage. Não há Supabase nem outro backend nesta fatia. Funcionam de verdade: arrastar e redimensionar salas e nós, editar portas e rótulos, CRUD local de salas, estações, acessórios e alas, e o desfazer/refazer de rooms/nodes/links. É simulado: a aba de Descoberta SNMP inteira. A varredura usa setTimeout com logs fixos, a lista de dispositivos é constante e as métricas são literais, embora o backend já tenha um scanner real em /api/v1/cmdb/discovery/live-scan. Defeitos mais graves: (1) os nós dos tipos 'pc', 'tv_display', 'server' e 'storage' não têm desenho no canvas e ficam invisíveis, o que inclui 11 PCs já persistidos e os servidores/storage adicionados pela Descoberta; (2) o menu de contexto usa coordenadas fixas (350,200), porque o SVG não tem o id '#topologySvgCanvas' que o handler procura; (3) os dados persistidos têm referências órfãs (uplinkDevice 'main_switch', roomId 'room_office', 'room_dc' e 'room_operacoes' inexistentes), mascaradas por textos de fallback na interface. Também foram encontrados: o histórico é poluído a cada clique de seleção; exclusões não pedem confirmação e várias não podem ser desfeitas; os catálogos de tipo de cabo divergem entre os selects; o mapa de calor tem indicadores incoerentes (cx=NaN em nós sem largura); toda a árvore SVG é renderizada de novo a cada pointermove; e há cerca de 26 props mortas além de definições SVG sem uso ou indefinidas.

#### A-252 · [ALTA] Tipos de nó 'pc', 'tv_display', 'server' e 'storage' não são desenhados no canvas (ficam invisíveis)
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** InteractiveMovableCanvas, renderização de nós linhas 8666-9451 (ramos por tipo 8713-9381); DeviceType linhas 102-121; handleMapDiscoveredDeviceToTopology 3080-3142 e handleMapAllDiscoveredDevices 3144+ (chamados em 5358 e 5571)
- **Categoria:** Bug / código incompleto
- **Descrição:** O bloco de renderização tem ramos só para desk, chair, table, simple_chair, router, ups, camera, voip, switch/patch_panel, rack, access_point, workstation, printer e firewall. Os tipos 'pc', 'tv_display', 'server' e 'storage', previstos em DeviceType, não têm ramo: só aparecem o hitbox transparente e o halo quando o nó está selecionado.
- **Impacto:** Os 11 PCs já salvos em src/data/topology_saved.json e os PCs e a TV de videoconferência do seed não aparecem na planta. Ao clicar 'Adicionar ao Mapa' ou 'Sincronizar Todos' na Descoberta, os dispositivos 'server' (Dell PowerEdge) e 'storage' (Synology) entram no estado, contam como 'Mapeados', mas ficam invisíveis. Os cabos ligados a eles terminam no vazio.
- **Evidência:** DeviceType inclui "\| 'server' ... \| 'storage' ... \| 'pc' \| 'tv_display'" (102-121). Grep por "=== 'pc'", "=== 'tv_display'", "=== 'server'" e "=== 'storage'" não encontra nenhum ramo de renderização, só filtros (2002) e a lista de descoberta (5510/5517). topology_saved.json: 11 ocorrências de "type": "pc" (ex.: linhas 98-100 bench_pc_1). INITIAL_DISCOVERED_DEVICES traz type 'server' (641) e 'storage' (658), e o mapeamento copia 'type: device.type' (3121).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-253 · [ALTA] Menu de contexto usa coordenadas fixas (350,200): SVG sem o id '#topologySvgCanvas'
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** handleContextMenu linha 2936 (consulta '#topologySvgCanvas'); <svg ref={svgRef}> linha 7833 sem id; usos no menu 4913, 4949, 4967-4968, 5302
- **Categoria:** Falha de integração
- **Descrição:** O handler de clique direito converte a posição do mouse para coordenadas SVG procurando document.querySelector('#topologySvgCanvas'). Nenhum elemento tem esse id: o <svg> do InteractiveMovableCanvas só tem ref. A conversão nunca acontece e svgX/svgY ficam nos valores padrão 350/200.
- **Impacto:** 'Adicionar no Ponto', '+ Criar Sala / Ambiente Aqui' e 'Adicionar Ponto de Curva Aqui' sempre inserem o item em (350,200), e não onde o usuário clicou. O cabeçalho do menu mostra '(350, 200)' em qualquer posição. Itens adicionados em sequência ficam empilhados.
- **Evidência:** 2936: "const svgEl = document.querySelector('#topologySvgCanvas') as SVGSVGElement \| null; let svgX = 350; let svgY = 200; if (svgEl) {...}". Grep 'topologySvgCanvas' encontra só a linha 2936. 7833-7840: "<svg ref={svgRef} viewBox=... className=... onPointerDown=...>" sem atributo id. 4949: "handleAddEquipment(item.type, contextMenu.svgX, contextMenu.svgY)".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-254 · [ALTA] Aba 'Descoberta SNMP' é simulada e não usa o scanner real do backend
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** Aba discovery 5332-5607 (botão 5406-5413, métricas 5460-5479, console 5586-5605); handleStartSnmpScan 3021-3070; estado discoveredDevices 2989
- **Categoria:** UI não implementada
- **Descrição:** 'Executar Varredura SNMP' só encadeia setTimeout com logs fixos (IPs e modelos literais) e uma barra de progresso. Subnet, community e versão SNMP aparecem apenas no texto do log. setDiscoveredDevices nunca é chamado, então a lista é sempre a constante INITIAL_DISCOVERED_DEVICES. Os cartões 'Endereços Verificados: 254 IPs' e 'Interfaces Físicas: 118 Portas' e os rótulos 'TIMEOUT: 1000ms' e 'PORTA 161/UDP ATIVA' são literais. O servidor já expõe POST /api/v1/cmdb/discovery/live-scan e /cmdb/discovery/devices, que esta tela não usa.
- **Impacto:** O usuário acredita ter varrido a rede e sincronizado ativos reais, mas recebe sempre os mesmos 6 dispositivos fictícios, inclusive para outra subnet (/16, por exemplo). Os ativos fictícios vão para a topologia e para o JSON persistido.
- **Evidência:** 3030-3069: "setTimeout(() => { setScanProgress(35); setScanLogs(prev => [...prev, `... Host respondeu em 192.168.10.1 (RTT: 2ms): Cisco Catalyst 9300...`]) }, 600)". 5463: "<span ...>254 IPs</span>". 5471: "118 Portas". Grep 'setDiscoveredDevices' acha só a declaração na linha 2989. server/cmdbRouter.ts:3124 "router.post(\"/cmdb/discovery/live-scan\"".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-255 · [MÉDIA] Referências órfãs persistidas (uplinkDevice, roomId) mascaradas por textos de fallback
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** Tabela de ambientes 5746-5751; modal de sala, select Target de Uplink 6139-6147; tabela de estações 5832/5855; tabela de acessórios 5944/5961; modais de estação 6427-6435 e acessório 6542-6550; handleDeleteRoom 2191-2197 (chamado em 5283 e 5768)
- **Categoria:** Banco de dados
- **Descrição:** Não há integridade referencial entre salas, nós, estações, acessórios e o dispositivo de uplink. O padrão uplinkDevice 'main_switch' não corresponde a nenhum nó. Excluir uma sala não atualiza nem bloqueia nós, estações e acessórios que apontam para ela. A interface esconde o problema com fallbacks ('Main Switch', 'Escritório', 'Geral'). Os selects controlados recebem um value que não existe entre as opções: mostram a primeira opção, mas o estado guarda o id inválido.
- **Impacto:** Os dados salvos já estão inconsistentes. Os relatórios de estações e acessórios atribuem itens à sala errada ('Escritório'/'Geral'). Ao editar, o usuário vê uma sala ou uplink diferente do valor real e, se não mexer no select, salva de novo a referência quebrada.
- **Evidência:** topology_saved.json: "uplinkDevice": "main_switch" (linhas 14, 37, 60, 82), mas nenhum nó tem id 'main_switch'. Nós com "roomId": "room_operacoes" (104-194) e "room_1787369529435_pc20" (207), salas inexistentes. Estações e acessórios com "roomId": "room_office"/"room_dc" (277-386), ids que não existem entre as salas salvas. 5748: "{nodes.find(n => n.id === room.uplinkDevice)?.name \|\| room.uplinkDevice \|\| 'Main Switch'}". 5855: "{roomObj?.name \|\| 'Escritório'}". 2194: "setRooms(prev => prev.filter(r => r.id !== id))" sem tratar dependentes.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-256 · [MÉDIA] Select 'Tipo de Cabo' não tem o valor padrão dos cabos; catálogos de cabo divergentes
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** Inspetor de link 4819-4828; modal de sala 6152-6160; CableType linha 125; handleAddLink 2200; seed de sala 850
- **Categoria:** Bug / código incompleto
- **Descrição:** Todo cabo novo nasce com cableType 'SFTP CAT6 (Azul - Blindado)', mas o select do inspetor só oferece 'SFTP CAT6 (Azul)', 'CAT6 UTP (Cinza)', 'Fibra OM4 Multimodo (Laranja)' e 'CAT6a Shielded (Vermelho)'. Como o value não existe nas opções, o navegador mostra a primeira opção. Escolher essa mesma opção não dispara onChange. O modal de sala usa um terceiro catálogo ('UTP CAT6A (Laranja)', 'Fibra Óptica OM4 LC-LC'), e o seed tem salas com 'SFTP CAT6 (Azul)', que não existe nesse modal. 'Fibra Monomodo (Amarelo)' está no tipo, mas em nenhum select.
- **Impacto:** O inspetor mostra o tipo de cabo errado. Inventário e cor do cabo (8460-8466) ficam inconsistentes entre telas, e não é possível manter o padrão blindado pelo select.
- **Evidência:** 2200: "cableType: CableType = 'SFTP CAT6 (Azul - Blindado)'". 4824-4827: as quatro opções sem '(Azul - Blindado)'. 6157-6159: "SFTP CAT6 (Azul - Blindado)", "UTP CAT6A (Laranja)", "Fibra Óptica OM4 LC-LC". 850: "uplinkCableType: 'SFTP CAT6 (Azul)'".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-257 · [MÉDIA] Clicar para selecionar grava etapa 'Moveu' no histórico e apaga a pilha de refazer
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** handlePointerDownNode 7313-7317; handlePointerDownRoom 7357-7359; handlePointerDownRoomLabel 7379-7381; handlePointerDownResizeRoom 7405-7407; handlePointerDownWaypoint 7421-7423; recordHistorySnapshot 1452-1464
- **Categoria:** Regra de negócio
- **Descrição:** O snapshot de desfazer é gravado no pointerdown, antes de qualquer movimento. Um simples clique para selecionar um nó, sala, rótulo ou waypoint cria a etapa 'Moveu ...' com cópia profunda de rooms/nodes/links. recordHistorySnapshot também zera layoutRedoStack.
- **Impacto:** O histórico (máximo de 40 etapas) se enche de etapas vazias, e Ctrl+Z passa a desfazer 'nada' várias vezes antes de chegar a uma alteração real. Selecionar qualquer objeto depois de um desfazer apaga o refazer, então o usuário perde a alteração desfeita.
- **Evidência:** 7315-7317: "if (onRecordHistorySnapshot) { onRecordHistorySnapshot(`Moveu '${primaryNode.name \|\| nodeId}'`); }", executado em todo pointerdown fora do modo multisseleção. 1462-1463: "setLayoutHistory(prev => [newStep, ...prev].slice(0, 40)); setLayoutRedoStack([]);".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-258 · [MÉDIA] Exclusões imediatas, sem confirmação (salas, nós, cabos, estações, acessórios, alas)
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** Menu de contexto: 5166-5175 (nó), 5281-5290 (sala), 5311-5320 (cabo); tabela de ambientes 5767-5773; estações 5878-5884; acessórios 5979-5985; modal de alas 6816-6845
- **Categoria:** Regra de negócio
- **Descrição:** Todos os botões de lixeira executam a exclusão direto, sem diálogo de confirmação. A exclusão de ala também desvincula todas as salas. Estações, acessórios e alas não entram no histórico de desfazer.
- **Impacto:** Um clique errado apaga um ambiente com todos os vínculos ou um registro de inventário com custo. O auto-save envia a exclusão para o servidor em cerca de 2 s, sem possibilidade de recuperar o dado.
- **Evidência:** 5767-5768: "<button onClick={() => handleDeleteRoom(room.id)} ...>". 5879: "onClick={() => handleDeleteStation(std.id)}". 6817-6830: setRooms(... wingId: undefined) seguido de setWings(prev.filter(...)), sem confirm().
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-259 · [MÉDIA] 'Auto-Organizar Equipamentos desta Sala' reorganiza todas as salas
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** Menu de contexto da sala 5235-5244; handleAutoFitNodesInQuadrants 1984-1993
- **Categoria:** UI não implementada
- **Descrição:** A opção do menu de uma sala específica chama handleAutoFitNodesInQuadrants(), que não recebe o id da sala e percorre todas as salas ativas, reposicionando os nós de cada uma.
- **Impacto:** O usuário quer organizar uma sala e o layout manual de todas as outras é refeito. Além disso, essa função não grava etapa de desfazer.
- **Evidência:** 5237: "handleAutoFitNodesInQuadrants();" com rótulo "Auto-Organizar Equipamentos desta Sala". 1984-1988: "const handleAutoFitNodesInQuadrants = () => { setNodes(prevNodes => { ... rooms.filter(r => r.activeOnMap).forEach(room => {".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-260 · [MÉDIA] Mapa de calor das alas: indicadores incoerentes e cx=NaN para nós sem largura
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** InteractiveMovableCanvas, cálculo por ala 8021-8046; pontos de calor 8075-8090; badge 8155
- **Categoria:** Regra de negócio
- **Descrição:** (a) totalAssets conta todos os nós da ala, inclusive cadeiras e mesas, então a métrica 'density' marca quase toda ala em vermelho. (b) healthPct conta como online só os nós com details.status === 'online', mas os pontos de calor tratam status ausente como online (verde): o badge pode mostrar '0% Online' com a ala toda verde. (c) cx/cy usam node.x + node.width/2 sem fallback; como width é opcional e a maioria dos nós do seed não tem width, o resultado é NaN. Mesmo com width, o centro ignora a escala de 0,5 usada na renderização.
- **Impacto:** O mapa de calor mostra saúde e densidade enganosas. Os pontos de calor de PCs e cadeiras não aparecem, e o React avisa sobre NaN em atributos.
- **Evidência:** 8023: "const onlineCount = wingNodes.filter(n => n.details?.status === 'online').length;" contra 8076: "const nodeStatus = node.details?.status \|\| 'online';". 8082-8083: "cx={node.x + node.width / 2} cy={node.y + node.height / 2}". TopologyNode: "width?: number; height?: number;" (199-200). Seed sem width, ex.: linha 694 conf_chair_1.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-261 · [MÉDIA] Canvas inteiro é renderizado de novo a cada movimento do mouse
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** handlePointerMove 7445-7447 (setCursorSvgPos); estado cursorSvgPos 7220 (usado só em 8548-8555); filtros de blur 7982-7987 usados em 8070 e 8087; cálculo por ala 7996-8026; auto-save 1354-1363
- **Categoria:** Desempenho
- **Descrição:** handlePointerMove chama setCursorSvgPos em todo pointermove, mesmo sem arraste e fora do modo de ligação (o único uso do estado). Cada movimento renderiza de novo todo o SVG: centenas de elementos por nó, laço por ala com nodes.filter + rooms.some (O(alas × nós × salas)) e retângulos com feGaussianBlur de stdDeviation 32. Durante o arraste, cada movimento também chama setNodes/setRooms no componente pai de cerca de 7 mil linhas, o que renderiza de novo todas as abas, recria recordHistorySnapshot e reinicia o debounce do auto-save. O canvas não usa React.memo.
- **Impacto:** Travamentos e queda de FPS ao mover o mouse ou arrastar em plantas com muitas salas e nós, sobretudo com o mapa de calor ligado.
- **Evidência:** 7445-7447: "const handlePointerMove = (e) => { const coords = getSvgCoordinates(...); setCursorSvgPos(coords);". 7983: "<feGaussianBlur stdDeviation=\"32\" .../>". 8021: "nodes.filter(n => (...) \|\| wingRooms.some(r => n.x >= r.x - 20 && ...))" dentro de visibleWings.map.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-262 · [MÉDIA] Clique esquerdo em cabo pode não selecionar o link (captura de ponteiro no SVG)
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** handleCanvasPointerDown 7770-7785; grupo do link 8473-8481 (onClick sem onPointerDown/stopPropagation)
- **Categoria:** Estabilidade
- **Descrição:** O <g> do link só tem onClick. Nós, salas e waypoints param a propagação no pointerdown; o link não. Por isso o pointerdown no cabo chega ao handler do SVG, que limpa a seleção, inicia a caixa de seleção e chama setPointerCapture no próprio <svg>. Pela especificação Pointer Events 3, implementada nos navegadores recentes, o click após uma captura vai para o elemento que capturou (o svg) e não para o <g> do link, então onSelectLink pode nunca ser chamado.
- **Impacto:** Pode ser impossível selecionar ou inspecionar cabos com clique esquerdo, embora a interface instrua 'Clique em qualquer ... Cabo'. Restaria só o menu do botão direito.
- **Evidência:** 7783: "(e.currentTarget as Element).setPointerCapture(e.pointerId);" no svg. 8476: "onClick={() => onSelectLink(link.id)}" sem onPointerDown. Precisa ser confirmado no navegador-alvo.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-263 · [BAIXA] Várias edições não geram ponto de desfazer, e o histórico não cobre alas, estações nem acessórios
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** handlePointerDownDoor 7429-7434 e handlePointerDownDoorAngle 7437-7442 (sem snapshot); handlePointerDownResizeNode 7328-7346 (sem snapshot); inspetor de rótulo 4715, 4736, 4748, 4771, 4787 (handleUpdateRoomDoor sem snapshot, linha 1964); inspetor de link 4821, 4836, 4858 (handleUpdateLink sem snapshot, linha 2235); tabela de ambientes 5703 e 5728; modal de alas 6703-6830; modal de histórico 6956-7074
- **Categoria:** Regra de negócio
- **Descrição:** Mover a porta, mudar o ângulo da porta, redimensionar um nó, recentralizar ou girar o rótulo, trocar tipo ou velocidade do cabo, resetar curvas e mudar o vínculo de ala ou a visibilidade da sala não chamam recordHistorySnapshot. As etapas guardam só rooms/nodes/links, então exclusão de ala, estação ou acessório não pode ser restaurada, embora o modal prometa 'Restaure qualquer estado anterior da planta'.
- **Impacto:** Ctrl+Z não reverte essas alterações, ou reverte junto com a etapa anterior. Uma exclusão acidental de ala, estação ou acessório é definitiva.
- **Evidência:** 1964-1966: "const handleUpdateRoomDoor = (...) => { setRooms(prev => prev.map(...)); }" sem snapshot. 2235-2237: handleUpdateLink idem. 1457-1459: o snapshot tem só "rooms", "nodes" e "links".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-264 · [BAIXA] Cerca de 26 props mortas, lógica morta e definições SVG sem uso ou indefinidas no InteractiveMovableCanvas
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** MovableCanvasProps 7083-7145 e desestruturação 7147-7209; isWingDimmed 8018; <defs> 7841-7988; fill url(#deskWoodGrad) 8847
- **Categoria:** Desconectado
- **Descrição:** O pai passa (3637-3683), o canvas declara e desestrutura, mas nunca usa: toolboxOpen, onToggleToolbox, activeToolboxTab, onSetActiveToolboxTab, onAddEquipment, onOpenAddRoom, onOpenDiscovery, onAutoAlign, onAutoFitNodes, onOrganizeQuadrants, onSaveLayout, onCycleDoorWall, onSetDoorOffsetPreset, onStartConnecting, onCancelConnecting, onAddLinkWaypoint, onRotateGroupItemsInPlace, onToggleHeatmap, onChangeHeatmapMetric, onChangeHeatmapIntensity, onOpenWingManager, onOpenWingHeatmapTab, onEditWing, onAutoSequenceWings, onSetHoveredHeatmapWingId, hoveredHeatmapWingId e showQuadrantGuides. isWingDimmed é sempre false, porque visibleWings já filtra pela ala selecionada. Os gradientes cableTrayPattern, globeGrad, routerWhiteGrad, printerDarkGrad (cópia de printerGrayGrad), deskSurfaceGrad e deskWhiteEdgeGrad não são usados. A mesa 'table' referencia url(#deskWoodGrad), que não existe.
- **Impacto:** Funções prometidas (toolbox, heatmap interativo, cancelar ligação) parecem existir mas não estão ligadas ao canvas. O código fica mais difícil de manter, e a borda da mesa de reunião é desenhada sem preenchimento.
- **Evidência:** Grep por esses nomes acha só a interface, a desestruturação e as props do pai, sem uso entre 7210 e 9457. 7232-7234: "visibleWings = wings.filter(w => selectedWingFilter === 'all' \|\| w.id === selectedWingFilter)" e 8018: "isWingDimmed = selectedWingFilter !== 'all' && selectedWingFilter !== wing.id". 8847: "fill=\"url(#deskWoodGrad)\"", sem id correspondente em <defs>.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-265 · [BAIXA] Código duplicado e persistência em localStorage feita de forma avulsa
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** Submenu de categorias duplicado 4917-4959 e 5187-5232; tamanhos padrão duplicados 7337-7338 e 7486-7487; localStorage dentro de updaters de setState 6706, 6722, 6821, 6828, 6886, 6917; mutações sem localStorage 5703 e 5728
- **Categoria:** Duplicado / obsoleto
- **Descrição:** As abas de categorias e a lista de itens do menu de contexto aparecem quase idênticas para canvas e sala. A tabela de largura e altura padrão por tipo de nó está repetida em ternários encadeados. O modal de alas grava localStorage dentro das funções updater do setState (efeito colateral), enquanto outras mutações equivalentes de rooms (toggle 'No Mapa' e select de ala na tabela) não gravam. Isso duplica e torna inconsistente o papel do auto-save via /api/topology.
- **Impacto:** Manutenção propensa a divergências. O cache local pode ficar defasado em relação ao estado se o servidor falhar no carregamento, e um efeito dentro de updater é executado duas vezes no StrictMode.
- **Evidência:** 6704-6707: "setWings(prev => { const updated = ...; localStorage.setItem('applet_infra_topology_wings', JSON.stringify(updated)); return updated; });". 5703: "setRooms(prev => prev.map(r => r.id === room.id ? { ...r, activeOnMap: !r.activeOnMap } : r))", sem localStorage. 7337 e 7486: a mesma cadeia "node.type === 'desk' ? 70 : node.type === 'chair' ? 68 : ...".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-266 · [BAIXA] Validação fraca: quantidades e custos negativos ou zero, código de ala duplicado, indicador 'dominante' fixo
- **Arquivo:** `src/components/InfraTopology.tsx`
- **Localização:** Modal de estação 6409-6423; modal de acessório 6524-6538; cadastro de ala 6697-6726; card 'Cabeamento Estruturado Dominante' 5676-5679
- **Categoria:** Regra de negócio
- **Descrição:** Os inputs de quantidade, custo unitário e preço não têm min e aceitam valores negativos. Na edição (handleSaveStation e handleSaveAccessory fazem merge direto), 0 ou valores negativos são salvos e geram totais negativos em R$. O código da ala não é validado quanto a unicidade: o padrão `ALA-${wings.length + 1}` e orderSequence = wings.length + 1 colidem depois de exclusões. O card 'Cabeamento Estruturado Dominante' mostra config.cableType, mas setConfig nunca é chamado, então é uma constante e não deriva dos cabos.
- **Impacto:** Inventário e custos podem ficar incorretos, as alas podem ficar ambíguas no filtro e na ordenação, e o indicador de cabeamento é enganoso.
- **Evidência:** 6409-6412: "<input type=\"number\" value={editingStation.quantity ?? 1} onChange={(e) => setEditingStation(prev => ({ ...prev!, quantity: Number(e.target.value) }))}", sem min. 6715 e 6718: "code: newWingForm.code \|\| `ALA-${wings.length + 1}`" e "orderSequence: wings.length + 1". Grep 'setConfig(' não encontra nenhuma chamada (só a declaração na linha 1427).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

### 6.12 CMDB — interface principal

_Forma de exame: Agente (leitura integral) — 25 achados._

> **Estado do módulo:** A fatia S12 cobre a UI principal do CMDB: o orquestrador CmdbModule e as views de visão geral, lista e detalhe de CI, relacionamentos, dependências, impacto, serviços, histórico, importação/exportação e relatórios. Também inclui os tipos em src/types/cmdb.ts. O CRUD de CIs e relacionamentos chama de fato /api/v1/cmdb/items e /api/v1/cmdb/relationships, e as rotas e métodos existem no cmdbRouter. Mas todas as mutações são otimistas, "dispare e esqueça": a resposta HTTP é ignorada e nunca reconciliada. Por isso, ao excluir um relacionamento recém-criado, o servidor responde 404, porque gera outro id. Uma importação em lote cria CIs com ids duplicados. Ao trocar de tenant, a tela continua mostrando os dados do tenant anterior. Serviços, contratos, histórico/auditoria, health score e análise de impacto rodam só no cliente, a partir de dados semente (cmdbInitialData). Os endpoints /cmdb/services, /cmdb/history, /cmdb/contracts, /cmdb/tickets, /cmdb/health e /cmdb/impact existem no servidor e nenhum deles é consumido. Serviços novos não são persistidos e recebem arbitrariamente os 3 primeiros CIs como base. O modal de detalhe (Raio-X) nunca abre: o CmdbModule passa props com nomes diferentes dos esperados. A falha passa despercebida porque o projeto não tem @types/react, então o tsc não valida props JSX. Isso torna enganosa a linha de base de "0 erros". A análise de impacto percorre só 2 níveis e segue a direção origem→destino. Isso inverte o resultado frente à convenção dos dados semente (estação→switch→firewall→internet), e o tipo de simulação é ignorado. Relatórios, telemetria do modal, árvore de dependências e "100% mapeados" são total ou parcialmente simulados ou fixos no código. A importação aceita só JSON, sem validação, e não restaura o backup que a própria tela exporta. A exportação CSV não escapa aspas nem '#' e permite injeção de fórmulas. O maior risco de segurança está no isolamento multi-tenant: ele depende só do header x-tenant-id enviado pelo cliente, e não há autenticação nas rotas /api/v1/cmdb/*. Qualquer um lê, altera e apaga CIs de qualquer tenant, e a própria UI oferece um seletor livre de tenant.

#### A-267 · [CRÍTICA] Isolamento multi-tenant baseado só em header do cliente, sem autenticação
- **Arquivo:** `src/components/cmdb/CmdbModule.tsx`
- **Localização:** CmdbModule.tsx linhas 45, 112-125, 202-236, 374-382 (seletor de tenant e header x-tenant-id); server/cmdbRouter.ts linhas 905-909 (getTenantId); server.ts linhas 20-41 (sem middleware de auth antes de /api/v1)
- **Categoria:** Segurança
- **Descrição:** O tenant efetivo de todas as rotas /api/v1/cmdb/* vem de `x-tenant-id` ou `?tenantId=`, enviados livremente pelo cliente, com 'tenant-demo' como padrão. Nenhuma sessão ou token é verificado. A própria UI expõe um <select> que troca de tenant sem nenhuma checagem de permissão.
- **Impacto:** Qualquer usuário, ou qualquer cliente HTTP na rede, lê, cria, altera e exclui CIs e relacionamentos de qualquer tenant (ex.: tenant-alfa) só trocando um header. Isso quebra o 'Multi-Tenant Isolado' anunciado na tela.
- **Evidência:** cmdbRouter.ts:905-908: `const headerTenant = req.headers["x-tenant-id"] ...; return headerTenant \|\| queryTenant \|\| "tenant-demo";`. server.ts:36: `app.use("/api/v1", cmdbRouter);` sem auth. CmdbModule.tsx:374-381: select com tenant-demo/tenant-filial-01/tenant-tech.
- **Verificação:** CONFIRMADO (conferido manualmente)

#### A-268 · [ALTA] Modal de detalhe do CI (Raio-X) nunca é exibido por divergência de props
- **Arquivo:** `src/components/cmdb/CmdbModule.tsx`
- **Localização:** CmdbModule.tsx linhas 668-680 (render de CmdbCiDetailModal); CmdbCiDetailModal.tsx linhas 51-71 (interface de props) e 250 (if (!ci) return null)
- **Categoria:** Bug / código incompleto
- **Descrição:** O CmdbModule renderiza <CmdbCiDetailModal item={selectedCi} relationships allItems onClose onOpenImpact>, mas o componente espera as props `ci`, `tickets`, `contracts`, `history` e `onOpenImpactAnalysis`. Como `ci` chega undefined, o componente retorna null. Se o nome de `ci` for corrigido isoladamente, o render quebra em `tickets.filter` (linha 299), pois tickets/contracts/history não são passados. O CmdbModule também nunca carrega tickets (INITIAL_CMDB_TICKETS nem /cmdb/tickets).
- **Impacto:** Todos os botões 'Raio-X', 'Abrir Raio-X', o clique em nós de dependência, impacto, serviços e relacionamentos e o onSelectCi da topologia não fazem nada. Ficam inacessíveis o histórico de alterações por CI, os contratos, os chamados e a telemetria do CI.
- **Evidência:** CmdbModule.tsx:669-679: `<CmdbCiDetailModal item={selectedCi} relationships={relationships} allItems={items} onClose=... onOpenImpact=... />`. CmdbCiDetailModal.tsx:52-58: `ci: ConfigurationItem \| null; ... tickets: CMDBTicketLink[]; contracts: ...; history: ...; onOpenImpactAnalysis`. Linha 250: `if (!ci) return null;`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-269 · [ALTA] Relacionamento criado tem id local diferente do servidor; exclusão falha e ele reaparece
- **Arquivo:** `src/components/cmdb/CmdbModule.tsx`
- **Localização:** CmdbModule.tsx handleCreateRelationship linhas 243-285 e handleDeleteRelationship linhas 287-297; server/cmdbRouter.ts linhas 1274-1275 e 1399-1406
- **Categoria:** Falha de integração
- **Descrição:** O cliente gera `id: rel-${Date.now()}` e envia o objeto no POST. O servidor ignora esse id, cria `rel-${Date.now()}-${random}` e devolve 201 com o objeto novo, mas o cliente não lê a resposta. Ao excluir, o cliente manda DELETE /cmdb/relationships/{idLocal}, o servidor responde 404 e o erro é engolido, porque fetch não lança exceção em 4xx.
- **Impacto:** Um relacionamento criado e excluído na mesma sessão continua persistido no servidor e volta no próximo recarregamento. O estado local diverge do banco sem nenhum aviso.
- **Evidência:** CmdbModule.tsx:246 `id: \`rel-${Date.now()}\``; 277-281: `await fetch('/api/v1/cmdb/relationships', {method:'POST', ... body: JSON.stringify(rel)})`, resposta descartada. cmdbRouter.ts:1275: `id: \`rel-${Date.now()}-${Math.floor(Math.random() * 1000)}\``; 1403-1405: `if (!rel) return res.status(404)`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-270 · [ALTA] Mutações otimistas sem tratamento de status HTTP nem reconciliação
- **Arquivo:** `src/components/cmdb/CmdbModule.tsx`
- **Localização:** handleCreateCi 201-209, handleUpdateCi 218-226, handleDeleteCi 233-240, handleCreateRelationship 276-284, handleDeleteRelationship 289-296
- **Categoria:** Falha de integração
- **Descrição:** Todas as chamadas de escrita usam `try { await fetch(...) } catch { console.warn }`. fetch só rejeita em erro de rede: respostas 400/403/404/500 são tratadas como sucesso. O estado local é alterado antes da chamada e nunca revertido nem atualizado com o objeto devolvido pelo servidor (code, timestamps, campos calculados).
- **Impacto:** Edições e exclusões recusadas pelo servidor (ex.: 403 de outro tenant, 404 de CI semente que não existe no store) aparecem como concluídas na tela e se perdem no recarregamento. O usuário não recebe nenhum feedback de erro.
- **Evidência:** CmdbModule.tsx:218-226: `try { await fetch(`/api/v1/cmdb/items/${id}`, { method: 'PUT', ... }); } catch (e) { console.warn('Backend sync failed:', e); }`, sem checar `res.ok`. Servidor retorna 403/404 em cmdbRouter.ts:1138-1144 e 1193-1199.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-271 · [ALTA] Troca de tenant mantém dados do tenant anterior (vazamento visual e operações no tenant errado)
- **Arquivo:** `src/components/cmdb/CmdbModule.tsx`
- **Localização:** fetchCmdbData linhas 109-138 (if (itemList.length > 0) / if (relList.length > 0)); estados iniciais linhas 49-53
- **Categoria:** Falha de integração
- **Descrição:** fetchCmdbData só substitui items e relationships quando o servidor devolve lista não vazia. Os tenants 'tenant-filial-01' e 'tenant-tech' do seletor não têm CIs no store semente: o servidor responde vazio e a tela continua exibindo os CIs do tenant anterior, ou os INITIAL_CMDB_ITEMS embutidos no bundle. Services, contracts e history nunca são recarregados por tenant. O mesmo vale para um tenant cujos CIs foram todos excluídos: os dados semente voltam.
- **Impacto:** O usuário vê e manipula CIs de outro tenant como se fossem do tenant selecionado. Os PUT/DELETE vão com o x-tenant-id novo e falham silenciosamente com 403. Relatórios e health score refletem dados que não pertencem ao tenant.
- **Evidência:** CmdbModule.tsx:117-120: `const itemList = Array.isArray(data) ? data : (data.items \|\| []); if (itemList.length > 0) { setItems(itemList); }`. Seed do servidor: INITIAL_CMDB_ITEMS em 'tenant-demo' e TENANT_B_ITEMS em 'tenant-alfa' (cmdbInitialData.ts:2192), nenhum em tenant-filial-01 ou tenant-tech.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-272 · [ALTA] Importação em lote gera CIs com id, código e evento de histórico duplicados
- **Arquivo:** `src/components/cmdb/CmdbModule.tsx`
- **Localização:** handleImportBulk linhas 336-340; handleCreateCi linhas 146-149 e 187; server/cmdbRouter.ts POST /cmdb/items linhas 1107-1124
- **Categoria:** Banco de dados
- **Descrição:** handleImportBulk chama handleCreateCi num forEach síncrono. Cada chamada gera `id: ci-${Date.now()}`, que se repete no mesmo milissegundo, e `code: CI-${items.length+1}`, com `items` capturado do closure e portanto igual para todas. O servidor aceita `body.id` sem checar unicidade e faz push. O código também colide após exclusões, porque usa items.length.
- **Impacto:** O arquivo cmdb_persisted.json fica com vários CIs de mesmo id e código. PUT altera só o primeiro, DELETE remove todos de uma vez, e as keys React duplicadas causam renderização incorreta. Isso corrompe a integridade referencial dos relacionamentos.
- **Evidência:** CmdbModule.tsx:337-339: `importedItems.forEach(item => { handleCreateCi(item); });`; 147: `id: \`ci-${Date.now()}\``; 149: `code: \`CI-${items.length + 1 < 10 ? '0' : ''}${items.length + 1}\``. cmdbRouter.ts:1107: `const newId = body.id \|\| \`ci-${Date.now()}\`;` e 1124: `store.items.push(newItem);` sem verificação.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-273 · [ALTA] Serviços de negócio não persistem e recebem CIs arbitrários como base
- **Arquivo:** `src/components/cmdb/CmdbModule.tsx`
- **Localização:** handleCreateService linhas 299-318; CmdbServicesView.tsx linhas 31-59 e 155-244
- **Categoria:** Regra de negócio
- **Descrição:** handleCreateService só faz setServices local e nunca chama POST /api/v1/cmdb/services, que existe no servidor. GET /cmdb/services também nunca é chamado. Os CIs de base são fixados em `items.slice(0, 3)`, ignorando o formulário, que nem tem campo para escolher CIs. O formulário tem affectedUsersCount 20, mas o padrão aplicado é 10 quando ausente. O form não é limpo após o cadastro, e não existe edição nem exclusão.
- **Impacto:** Serviços cadastrados somem ao recarregar a página. Enquanto existem, aparecem ligados aos três primeiros CIs da lista, o que contamina a análise de impacto ('Serviços Afetados'), a árvore de dependências e os relatórios de SLA com dados falsos.
- **Evidência:** CmdbModule.tsx:314: `underlyingCiIds: items.slice(0, 3).map(i => i.id),`; 317: `setServices(prev => [svc, ...prev]);`, sem fetch. Servidor tem `router.post("/cmdb/services", ...)` em cmdbRouter.ts:1685.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-274 · [ALTA] Análise de impacto percorre o grafo na direção oposta à convenção dos dados
- **Arquivo:** `src/components/cmdb/CmdbImpactAnalysisView.tsx`
- **Localização:** linhas 46-75 (travessia por r.sourceCiId === selectedCi.id); seed em src/data/cmdbInitialData.ts linhas 1340-1486; server/cmdbRouter.ts linhas 1474-1513 (mesma lógica)
- **Categoria:** Regra de negócio
- **Descrição:** Os dependentes são calculados seguindo só relações em que o CI selecionado é a origem (source→target). Os dados semente modelam os enlaces do cliente para o upstream: ci-pc-001→ci-sw-core, ci-ap-wifi→ci-sw-core, ci-sw-core→ci-fw, ci-fw→ci-router, ci-router→ci-inet, e um usuário UTILIZA um notebook. O tipo da relação (DEPENDE_DE, UTILIZA, HOSPEDA, EXECUTA) não é considerado na semântica de propagação. O formulário de relacionamentos rotula origem como 'Upstream', contradizendo o seed.
- **Impacto:** A queda do switch core lista firewall e roteador como 'Paralisado/Sem Acesso' e omite PCs, AP e impressora, que são os de fato afetados. A queda de um PC lista o switch core como paralisado. A queda do banco ci-db-sql não aponta o ERP que o usa. Decisões de incidente e de SLA são tomadas sobre um resultado invertido.
- **Evidência:** CmdbImpactAnalysisView.tsx:53: `const directRels = relationships.filter(r => r.sourceCiId === selectedCi.id);`. Seed: `sourceCiId: 'ci-pc-001' ... targetCiId: 'ci-sw-core' type: 'CONECTADO_A'` (1368-1374); `sourceCiId: 'ci-srv-erp' targetCiId: 'ci-db-sql' type: 'EXECUTA'` (1568-1574). RelationshipsView.tsx:219 rótulo 'CI de Origem (Upstream)'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-275 · [ALTA] Trilha de auditoria da UI é local e não reflete o servidor
- **Arquivo:** `src/components/cmdb/CmdbModule.tsx`
- **Localização:** CmdbModule.tsx linhas 53, 185-198 (evento local só em criação), 212-241 (update/delete sem evento); CmdbHistoryView.tsx linhas 50-63; server/cmdbRouter.ts linhas 986, 1166, 1716-1727
- **Categoria:** Falha de integração
- **Descrição:** O estado `history` nasce de INITIAL_CMDB_HISTORY e só ganha eventos de criação gerados no cliente. GET /api/v1/cmdb/history, que guarda alterações, status, exclusões, relacionamentos e eventos de agente, nunca é chamado. Os eventos locais e os do servidor atribuem a ação ao usuário fixo 'Carlos Amoroso (Admin)/(Administrador)'. O servidor ainda aceita `req.body.user` arbitrário no PUT. O filtro de ações não oferece MANUTENCAO nem CONFIGURACAO, que o servidor gera para CIs criados por agente.
- **Impacto:** A aba 'Auditoria & Histórico' mostra uma trilha incompleta e não vinculada ao usuário real, sem valor para compliance. Exclusões, mudanças de status e alterações de relacionamento não aparecem.
- **Evidência:** CmdbModule.tsx:194: `user: 'Carlos Amoroso (Admin)',`. Nenhuma ocorrência de 'cmdb/history' em src/ (grep). cmdbRouter.ts:986: `user: string = "Carlos Amoroso (Administrador)"`; 1166: `req.body.user \|\| "Carlos Amoroso (Administrador)"`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-276 · [MÉDIA] Simulador de impacto limitado a 2 níveis, com tipo de cenário ignorado e severidade fixa no código
- **Arquivo:** `src/components/cmdb/CmdbImpactAnalysisView.tsx`
- **Localização:** linhas 42 e 141-164 (simulationType), 62-74 (nível 2 apenas), 78-91 (serviços/contratos só diretos), 94-103 (impactLevel e 148 usuários), 366-379 (ações estáticas)
- **Categoria:** UI não implementada
- **Descrição:** Os botões 'Queda Total/Degradação/Manutenção' só mudam o estado `simulationType`, que não entra em nenhum cálculo. A cascata para no nível 2, sem recursão. Por causa do Set visited não há loop infinito, mas dependências mais profundas ficam fora. Serviços e contratos afetados consideram só o CI-alvo e os dependentes diretos, nunca os indiretos. A severidade depende de typeId ou do código literal 'CI-INET-01', e o número de usuários cai para o valor mágico 148 quando é CRÍTICO. 'Abrir chamado automático' é só texto.
- **Impacto:** O simulador mostra resultados iguais para cenários diferentes e subestima o impacto em topologias com mais de 2 saltos. A severidade é atribuída por heurística fixa e não pela criticidade cadastrada no CI.
- **Evidência:** Linha 42: `const [simulationType, setSimulationType] = useState(...)`, não usado no cálculo. Linhas 95-96: `if (selectedCi?.typeId === 'firewall' \|\| selectedCi?.typeId === 'switch' \|\| selectedCi?.code === 'CI-INET-01') { impactLevel = 'CRÍTICO';`. Linha 103: `\|\| (impactLevel === 'CRÍTICO' ? 148 : directDependents.length * 4)`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-277 · [MÉDIA] Projeto sem @types/react: tsc não valida props JSX (linha de base '0 erros' enganosa)
- **Arquivo:** `src/components/cmdb/CmdbModule.tsx`
- **Localização:** package.json (dependências), node_modules/@types (sem react/react-dom), tsconfig.json (sem strict/noImplicitAny)
- **Categoria:** Estabilidade
- **Descrição:** Não há @types/react nem @types/react-dom instalados nem declarados, e o React 19 não traz .d.ts. Sem noImplicitAny, o módulo 'react' vira any e React.FC<Props> não impõe contrato. Por isso props com nomes errados, como no CmdbCiDetailModal, e objetos que não batem com os tipos, como o healthScore do CmdbModule sem `counts` e com `severity` em vez de `priority`, compilam sem erro.
- **Impacto:** Quebras de integração entre componentes passam despercebidas na verificação de tipos e só aparecem em runtime. A garantia de 'tsc 0 erros' não cobre a camada de UI.
- **Evidência:** `Get-ChildItem node_modules/@types` lista express, node, d3-* etc., mas não react; `node_modules/react` não tem .d.ts. package.json:32-33 só tem 'react' e 'react-dom'. CmdbModule.tsx:65 e 89-104 montam CMDBHealthScore sem `counts` e com `severity`, contrariando types/cmdb.ts:421-447.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-278 · [MÉDIA] Importação JSON sem validação, sem CSV e incapaz de restaurar o backup exportado
- **Arquivo:** `src/components/cmdb/CmdbImportExportView.tsx`
- **Localização:** handleImportSubmit linhas 72-86; textos 95-98 e 158-159; handleExportJson linhas 27-43; CmdbModule.handleCreateCi 146-181
- **Categoria:** UI não implementada
- **Descrição:** A tela promete importar 'CSV / JSON' e 'planilhas do Excel', mas só faz JSON.parse do texto colado. Não há esquema, tipo nem campos obrigatórios. Entradas null lançam TypeError dentro de onImportBulk, que é capturado e exibido como 'Erro de sintaxe no JSON' depois de uma importação parcial. Números ou strings viram CIs 'Novo Item'. O handleCreateCi descarta id, code, tenantId, telemetry etc., e os relacionamentos do backup são ignorados. Reimportar o backup duplica tudo, sem deduplicação por serial, MAC ou hostname. A mensagem de sucesso aparece sem confirmação do backend. O export JSON grava tenantId fixo 'tenant-demo'.
- **Impacto:** O 'Exportar Backup (JSON)' não serve para restaurar. Uma importação com dados ruins grava lixo no store persistido, e não há como importar planilhas de verdade.
- **Evidência:** Linha 74-75: `const parsed = JSON.parse(importText); const itemsToImport = Array.isArray(parsed) ? parsed : (parsed.configurationItems \|\| []);`. Linha 81: mensagem de sucesso imediata. Linha 31: `tenantId: 'tenant-demo',`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-279 · [MÉDIA] Exportação CSV sem escape (aspas, '#') e sujeita a injeção de fórmulas
- **Arquivo:** `src/components/cmdb/CmdbImportExportView.tsx`
- **Localização:** CmdbImportExportView.tsx handleExportCsv linhas 45-70; CmdbCiListView.tsx handleExportCsv linhas 108-134
- **Categoria:** Segurança
- **Descrição:** Os valores são envolvidos em aspas sem duplicar aspas internas. O conteúdo vira data URI via encodeURI, que não codifica '#', e por isso o arquivo é truncado no primeiro '#' (ex.: 'Rack #3'). Valores que começam com =, +, -, @, vindos de nome/hostname/responsável, inclusive os preenchidos por agente ou descoberta, são executados como fórmula no Excel. O arquivo não tem BOM UTF-8, e a tela alega 'RFC-4180'.
- **Impacto:** Planilhas corrompidas ou truncadas e acentuação quebrada no Excel. Há risco de CSV/formula injection ao abrir exportações com dados controlados por terceiros (agentes, descoberta de rede).
- **Evidência:** `rows.map(e => e.map(val => `"${val}"`).join(','))` e `const encodedUri = encodeURI(csvContent);` (ImportExport 62-65; ListView 124-127). Texto 'UTF-8 RFC-4180' na linha 128.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-280 · [MÉDIA] Criação de CI injeta dados fictícios (contrato, responsável, SO) e infla o health score
- **Arquivo:** `src/components/cmdb/CmdbModule.tsx`
- **Localização:** handleCreateCi linhas 157-173; healthScore linhas 63-106
- **Categoria:** Regra de negócio
- **Descrição:** Todo CI novo recebe `linkedContractId: 'cont-01'` e 'Contrato Master Suporte 24x7', `responsible: 'Carlos Amoroso'`, `operatingSystem: 'Windows 11 Pro'` (mesmo para switch ou firewall), `manufacturer: 'Fabricante'`, `clientId: 'cli-01'` e `unit: 'Matriz'`, sem relação com o que o usuário informou. O health score usa exatamente linkedContractId e responsible.
- **Impacto:** As métricas 'Contratos Vinculados' e 'Responsáveis' sobem artificialmente e escondem lacunas reais de governança. Contratos e SLAs ficam atribuídos a equipamentos que não estão cobertos.
- **Evidência:** CmdbModule.tsx:164 `operatingSystem: newItem.operatingSystem \|\| 'Windows 11 Pro'`; 166 `responsible: newItem.responsible \|\| 'Carlos Amoroso'`; 172-173 `linkedContractId: 'cont-01', linkedContractName: 'Contrato Master Suporte 24x7'`; 69 `const withContract = items.filter(i => i.linkedContractId).length;`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-281 · [MÉDIA] Health score calculado no cliente diverge do endpoint /cmdb/health (não utilizado)
- **Arquivo:** `src/components/cmdb/CmdbModule.tsx`
- **Localização:** CmdbModule.tsx linhas 63-106; server/cmdbRouter.ts linhas 1563-1647; CmdbOverviewDashboard.tsx linhas 189, 204, 249, 325-337
- **Categoria:** Duplicado / obsoleto
- **Descrição:** O cliente recalcula o score com outros pesos (rel 35%, dono 25%, contrato 20%, monitoramento 20%) e outra escala de nota (A≥90, B≥75, C≥60, senão D, sem F). Conta como 'monitorado' qualquer CI com telemetry.isOnline definido, mesmo offline. As recomendações aparecem sempre, mesmo com 0 pendências. O endpoint /cmdb/health usa localização, outra escala e isOnline=true, e não é consumido. No dashboard, com 0 CIs as porcentagens viram NaN%; um CI 'operacional' com telemetria offline entra ao mesmo tempo em 'Operacionais' e 'Indisponíveis'; '100% mapeados' é texto fixo; e todo botão de recomendação navega para a topologia.
- **Impacto:** A nota de conformidade exibida, que também vai para o relatório executivo, é inconsistente com a API e pode ser contraditória (disponibilidade + indisponibilidade acima de 100%).
- **Evidência:** CmdbModule.tsx:70 `items.filter(i => i.telemetry && i.telemetry.isOnline !== undefined)`; 78 `overall >= 90 ? 'A' : overall >= 75 ? 'B' : overall >= 60 ? 'C' : 'D'`. Overview:189 `Math.round((online / total) * 100)`; 249 `100% mapeados`; 332 `onClick={() => onNavigateTab('topologia')}` para todas as recomendações.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-282 · [MÉDIA] Modal de detalhe exibe telemetria, histórico e QR simulados e grava coletas falsas na auditoria
- **Arquivo:** `src/components/cmdb/CmdbCiDetailModal.tsx`
- **Localização:** fetchItemChanges 81-104; handleSimulateChange 112-186 e 945-997; aba telemetria 757-822; QR 359-379
- **Categoria:** UI não implementada
- **Descrição:** (1) Se a API não retorna alterações, o modal mostra INITIAL_INVENTORY_CHANGES de outro CI (filtro inclui `c.ciCode === 'CI-NB-01'`) ou todo o conjunto semente. (2) O fetch de /cmdb/items/:id/changes não envia x-tenant-id, então sempre consulta 'tenant-demo'. (3) A aba de telemetria afirma 'Conectado em tempo real' fixo e usa valores inventados quando não há dado (CPU 24%, RAM 52%, disco 40%, uptime 120h, 'v2.5.0-lts'); por causa do `\|\|`, um valor real 0% é substituído. (4) '+ Simular Nova Coleta' faz POST /api/v1/agent/inventory sem token, aceito pelo caminho legado não autenticado, e grava alterações fictícias (RAM, Chrome, BitLocker) no histórico 'imutável' e na auditoria. (5) O 'QR Code' é só um ícone, e 'Imprimir Etiqueta' imprime a página inteira. O modal hoje não renderiza (ver achado de props), mas tudo isso volta a valer quando for corrigido.
- **Impacto:** Dados de inventário e auditoria apresentados como reais são fabricados. A simulação polui de forma permanente a trilha de auditoria de produção e pode criar snapshots e CIs a partir de um payload incompleto.
- **Evidência:** Linha 100: `c => c.assetId === ci.id \|\| ... \|\| c.ciCode === 'CI-NB-01'`; 102: `fallback.length > 0 ? fallback : INITIAL_INVENTORY_CHANGES`; 764: `Conectado em tempo real via REST API`; 778: `{ci.telemetry?.cpuUsagePct \|\| 24}%`; 160-166: POST '/api/v1/agent/inventory' só com headers X-Agent-ID/X-Tenant-ID. cmdbRouter.ts:971-975: sem token → `return next();`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-283 · [MÉDIA] Relacionamentos sem validação de duplicidade/ciclo e com referências a entidades inexistentes
- **Arquivo:** `src/components/cmdb/CmdbRelationshipsView.tsx`
- **Localização:** CmdbRelationshipsView.tsx handleCreate 54-79, filtro 99-111 e 240-246; src/data/cmdbInitialData.ts 1284, 1312, 1516-1762; server/cmdbRouter.ts 1267-1303
- **Categoria:** Banco de dados
- **Descrição:** A criação só impede origem = destino. Não verifica se o par e o tipo já existem nem se o vínculo fecha um ciclo, e o servidor também não verifica. O servidor aceita origem e destino que não existem no tenant e usa o próprio id como nome. O seed já contém relações cujas pontas não são CIs ('usr-juliana-01', 'sw-chrome-141', 'tkt-1042', 'mnt-fw-2026', 'war-dell-pro-nb'), com tipos fora de CIRelationshipType (EXECUTA, ASSOCIADO_A, REQUER_MANUTENCAO, COBERTO_POR). A UI oferece 'EXECUTA_EM', que não existe no union nem nos dados, e o filtro não lista os tipos usados no seed.
- **Impacto:** O grafo acumula arestas duplicadas, que multiplicam os resultados de impacto, e ciclos. CIs ligados só a uma garantia ou a um chamado contam como 'conectados' na métrica de topologia do health score. O filtro por tipo nunca encontra EXECUTA_EM.
- **Evidência:** RelationshipsView.tsx:56: `if (sourceCiId === targetCiId) { alert(...) }`, única validação. cmdbRouter.ts:1285: `sourceCiName: sourceItem?.name \|\| req.body.sourceCiName \|\| srcId` (aceita inexistente). Seed 1704-1710: `sourceCiId: 'ci-nb-01', targetCiId: 'war-dell-pro-nb', type: 'COBERTO_POR'`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-284 · [MÉDIA] Exclusão de CI deixa referências órfãs em serviços, contratos e chamados
- **Arquivo:** `src/components/cmdb/CmdbModule.tsx`
- **Localização:** CmdbModule.tsx handleDeleteCi 229-241; server/cmdbRouter.ts 1201-1203
- **Categoria:** Banco de dados
- **Descrição:** Cliente e servidor removem o CI e seus relacionamentos, mas não limpam `services.underlyingCiIds`, `contracts.linkedCiIds` nem `tickets.ciId`. O cliente também não registra evento de exclusão no histórico local.
- **Impacto:** Serviços e contratos continuam apontando para CIs inexistentes. Contagens de 'CIs associados' e cálculos de impacto e contratos usam ids mortos, e a exclusão não aparece na aba de auditoria.
- **Evidência:** cmdbRouter.ts:1202-1203: `store.items = store.items.filter(i => i.id !== id); store.relationships = store.relationships.filter(...)`, sem tratar services/contracts/tickets. CmdbModule.tsx:230-231 faz o mesmo localmente.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-285 · [MÉDIA] Importação de host descoberto classifica quase tudo como 'servidor' e confirma sucesso sem validar
- **Arquivo:** `src/components/cmdb/CmdbModule.tsx`
- **Localização:** handleImportDiscoveredHost linhas 320-334
- **Categoria:** Bug / código incompleto
- **Descrição:** typeId vira 'switch' ou 'firewall' por substring e 'servidor' para todo o resto. Os valores de DiscoveredDevice.detectedType são do union CIType ('workstation', 'printer', 'access_point', 'router', 'notebook'...), então estações, impressoras e APs viram 'servidor', enquanto typeName recebe o valor cru (ex.: 'workstation'). `host.detectedType.toLowerCase()` lança erro se o campo vier ausente. O alert de sucesso dispara antes e independentemente do resultado do POST.
- **Impacto:** O inventário fica com tipos errados, o que distorce ícones, contadores do dashboard e relatório e a severidade de impacto (todo 'servidor' é ALTO).
- **Evidência:** Linhas 327-328: `typeId: host.detectedType.toLowerCase().includes('switch') ? 'switch' : host.detectedType.toLowerCase().includes('firewall') ? 'firewall' : 'servidor'`; 333: `alert(`Dispositivo ... cadastrado como CI com sucesso!`)`. types/cmdb.ts:4-16 (CIType) e 285 (detectedType: CIType).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-286 · [MÉDIA] Edição de CI envia o objeto inteiro e sobrescreve campos atualizados pelo agente (lost update)
- **Arquivo:** `src/components/cmdb/CmdbCiListView.tsx`
- **Localização:** openEditModal 159-163; handleSaveCi 142-147; server/cmdbRouter.ts 1146-1153
- **Categoria:** Estabilidade
- **Descrição:** O formulário de edição é inicializado com `{ ...ci }`, que inclui telemetry, dynamicAttributes de inventário, code, createdAt e o estado do cliente no momento em que o modal foi aberto. Tudo isso é mandado no PUT. O servidor faz `{...oldItem, ...updates}`, e assim valores mais novos gravados pelo agente (heartbeat/inventário) entre a abertura e o salvamento são revertidos. A auditoria registra só 'Propriedades do CI atualizadas', sem os campos alterados.
- **Impacto:** Telemetria e inventário recentes são perdidos sem aviso a cada edição manual, e a auditoria não mostra o que mudou.
- **Evidência:** CmdbCiListView.tsx:161: `setFormData({ ...ci });`; 143-146: `onUpdateCi(editingCi.id, { ...formData, typeName: ... })`. cmdbRouter.ts:1147-1149: `const updatedItem = { ...oldItem, ...updates, id, tenantId, ... }`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-287 · [MÉDIA] Árvore de dependências não é hierárquica e ignora relacionamentos
- **Arquivo:** `src/components/cmdb/CmdbDependenciesView.tsx`
- **Localização:** linhas 27-37 (relationships recebido e não usado; ids fixos 'srv-01'..'srv-03'), 64-66 (texto prometido), 110-133 (lista plana)
- **Categoria:** UI não implementada
- **Descrição:** O texto anuncia 'Serviço de Negócio → Aplicações & Bancos → Servidores → Switches & Roteamento → Conectividade de Borda', mas a tela só lista em grade plana os `underlyingCiIds` de cada serviço. A prop `relationships` nunca é usada. O estado de expansão inicial usa ids de serviços semente fixos no código, e o status do serviço aparece sempre em verde.
- **Impacto:** Não existe de fato um mapa hierárquico de dependências. O usuário vê só a lista estática de CIs de cada serviço.
- **Evidência:** Linhas 33-37: `useState({'srv-01': true, 'srv-02': true, 'srv-03': false})`; 72: `const underlyingItems = items.filter(i => svc.underlyingCiIds.includes(i.id));`, sem nenhuma referência a `relationships` no corpo.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-288 · [MÉDIA] Relatório executivo com tenant fixo, sem medição real de SLA e impressão sem layout
- **Arquivo:** `src/components/cmdb/CmdbReportsView.tsx`
- **Localização:** linhas 28-30 (window.print), 63 (tenant fixo), 76 ('SLA garantido'), 92-94 (contagem de rede sem 'vpn'), 109-135 (seção 'Conformidade de SLAs')
- **Categoria:** UI não implementada
- **Descrição:** O cabeçalho sempre mostra 'Tenant: Empresa ABC (Matriz)', qualquer que seja o tenant selecionado. A seção 'Conformidade de SLAs' só repete metas cadastradas (slaHours/slaTargetPct), sem nenhuma medição de disponibilidade nem de chamados. 'Imprimir / Gerar PDF' chama window.print() sem estilos @media print no módulo, então imprime a aplicação inteira. A contagem 'Rede & Conectividade' exclui 'vpn', que o dashboard inclui.
- **Impacto:** Um relatório anunciado para auditorias ISO 20000/SOC2 traz dados simulados e identificação de cliente incorreta, com números que divergem do dashboard.
- **Evidência:** Linha 63: `Tenant: Empresa ABC (Matriz) • Emissão: ...`; 76: `serviços críticos de negócio com SLA garantido`; 29: `window.print();`. Grep por '@media print\|print:' em src só encontra AssetCustodyTermModal e WifiTechnicalReportView.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-289 · [BAIXA] Endpoints CMDB do servidor implementados mas desconectados da UI; lógica duplicada no cliente
- **Arquivo:** `src/components/cmdb/CmdbModule.tsx`
- **Localização:** server/cmdbRouter.ts: /cmdb/impact/:id (1458), /cmdb/health (1563), /cmdb/orphans (1650), /cmdb/services GET/POST (1679/1685), /cmdb/contracts (1699), /cmdb/tickets (1705), /cmdb/history (1716), /cmdb/topology (1431), /cmdb/changes (3040); CmdbModule.tsx 49-53 (estados semente), 52 (setContracts nunca usado)
- **Categoria:** Desconectado
- **Descrição:** Nenhum desses endpoints é chamado no src/ (grep). Impacto e health score são reimplementados no cliente com o mesmo algoritmo ou com um algoritmo divergente. Os tipos de simulação também divergem: ImpactAnalysisResult.simulationType é 'total_outage'\|'degraded_performance'\|'security_breach', e a UI usa 'degradation'\|'maintenance'. Contratos e serviços vêm só do seed embutido no bundle.
- **Impacto:** Há duas fontes de verdade para as mesmas regras, e a UI não mostra dados persistidos (serviços, contratos, chamados, histórico) que o backend mantém.
- **Evidência:** Grep `cmdb/(services\|history\|contracts\|tickets\|impact\|health\|orphans\|topology\|changes)` em src/: nenhum resultado. CmdbModule.tsx:52: `const [contracts, setContracts] = useState(INITIAL_CMDB_CONTRACTS);`, setContracts sem uso.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-290 · [BAIXA] Formulário de CI com opções fora do domínio e atributos dinâmicos não salvos
- **Arquivo:** `src/components/cmdb/CmdbCiListView.tsx`
- **Localização:** linhas 200-224 (filtros), 332-351 (badges de status), 503-514 (camada 'distribuicao'), 623-642 (atributos dinâmicos com defaultValue)
- **Categoria:** Bug / código incompleto
- **Descrição:** A camada 'distribuicao' é oferecida no formulário, mas não existe em CILayer nem no filtro de camadas, então esses CIs não podem ser filtrados. Status 'aposentado' e 'desconhecido' existem no tipo, mas não aparecem nos filtros nem nos selects, e a célula de status fica vazia para eles. Os atributos dinâmicos mostram `def.defaultValue` via defaultValue, mas o valor só entra em formData se o usuário digitar. Como são inputs não controlados, ao trocar de tipo um campo de mesmo key mantém o texto anterior.
- **Impacto:** Dados exibidos como preenchidos não são salvos, e alguns CIs ficam sem status visível ou não filtráveis.
- **Evidência:** Linha 510: `<option value="distribuicao">Distribuição</option>`; types/cmdb.ts:29-37 sem 'distribuicao'. Linha 630: `defaultValue={formData.dynamicAttributes?.[def.key] ?? def.defaultValue ?? ''}`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-291 · [BAIXA] Tipos CMDB com campos duplicados PT/EN e tipos/props não utilizados
- **Arquivo:** `src/types/cmdb.ts`
- **Localização:** ConfigurationItem 87-158 (name/nome, manufacturer/fabricante, model/modelo, serialNumber/serial, assetTag/asset, location/localizacao, responsible/usuarioResponsavel, department/departamento, tenantId/tenant); CIRelationship 160-205 (origem/sourceCiId, tipo/type, evidencia/evidence, confianca/confidence, criado_em/createdAt); InventoryChangeRecord 756-778; CMDBSubTab 470-482; CmdbModule.tsx 575 (topologyPosition)
- **Categoria:** Duplicado / obsoleto
- **Descrição:** Cada entidade carrega pares de campos com o mesmo significado, que precisam ser sincronizados à mão (o servidor faz migração em loadStore, o cliente não). CMDBSubTab não é usado: o CmdbModule usa ids 'visao-geral', 'itens' etc. onUpdateItemPosition grava `topologyPosition`, que não existe no tipo, e só altera o estado local.
- **Impacto:** Há risco de divergência entre os campos espelhados (ex.: editar `name` na UI não atualiza `nome`) e manutenção mais cara. A posição dos nós na topologia não é persistida por esse handler.
- **Evidência:** types/cmdb.ts:90-91 `name: string; nome?: string;`; 166 e 182 `origem` e `sourceCiId`. CmdbModule.tsx:575: `{ ...i, canvasPosition: pos, topologyPosition: pos }` sem fetch.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

### 6.13 CMDB — backend (cmdbRouter)

_Forma de exame: Agente (leitura integral) — 28 achados._

> **Estado do módulo:** server/cmdbRouter.ts (4086 linhas) concentra todo o backend de CMDB/RMM: CRUD de CIs e relacionamentos, topologia, análise de impacto, health score, identidade de agentes (enrollment, heartbeat, rotação de token, bloqueio), inventário com diff (InventoryDiffEngine), Network Discovery e um scanner de rede real (via NetworkScannerService). A persistência é um único objeto em memória serializado inteiro, de forma síncrona e não atômica, em src/data/cmdb_persisted.json a cada mutação. O arquivo já está versionado no git e hoje tem cerca de 156 KB. Em loadStore, um erro de parse cai em silêncio nos dados seed, e o save seguinte sobrescreve o arquivo. O módulo securityIntegrationBridge grava no mesmo arquivo sem coordenação. O que funciona de verdade: CRUD básico, enrollment com token aleatório de 192 bits, heartbeat e inventário autenticados por token, diff de inventário, live-scan TCP/NetBIOS/ARP e Wake-on-LAN. O que é simulado ou fabricado: o Discovery Job (POST /cmdb/discovery/jobs) devolve 5 equipamentos fixos com logs inventados. Relacionamentos automáticos recebem evidência "CONFIRMED" sem prova. Telemetria, contrato 'cont-01', IP e MAC padrão são inventados. A análise de impacto usa números fixos (148 usuários) e tem a direção do grafo invertida. Segurança: nenhum endpoint exige autenticação de usuário. O tenant vem de um header ou query string que o cliente controla. O middleware de agente aceita requisições sem token (fallback "legacy"). Há um enrollment token fixo no código-fonte e no bundle do front. Identidades migradas têm tokens previsíveis. O re-enrollment permite sequestrar a identidade de outro agente e anula bloqueios. O live-scan varre qualquer faixa de IP sem checar as sub-redes autorizadas. Integridade: excluir um CI não limpa tickets, contratos, serviços, identidades nem dispositivos descobertos. Relacionamentos automáticos ligam CIs de tenants diferentes. O loadStore recria dados demo e re-autoriza sub-redes a cada restart. Integração: o promote rápido do Live Scanner manda um deviceId que nunca existe no backend. O id de relacionamento criado no front difere do id do backend, então a exclusão falha. Serviços, contratos, histórico, health e impacto do backend não têm consumidor no front, que usa mocks. Não há colisão de rotas com o securityRouter: todas as rotas dele usam o prefixo /security/, e as do cmdbRouter usam /cmdb/ e /agent/. Também não há injeção de comando: o exec do scanner usa um comando fixo ('arp -a').

#### A-292 · [CRÍTICA] Endpoints administrativos sem autenticação e isolamento multi-tenant controlado pelo cliente
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** getTenantId (l.905-909); todas as rotas /cmdb/* e /agent/* administrativas (l.1016-1727, 1736-1810, 2208-2328, 3110-4058); server.ts l.33-41 (nenhum middleware de auth antes de app.use('/api/v1', cmdbRouter))
- **Categoria:** Segurança
- **Descrição:** Nenhuma rota do router exige sessão, JWT ou papel. O tenant é obtido de 'x-tenant-id' ou '?tenantId=' enviados pelo próprio cliente, com padrão 'tenant-demo'. Qualquer cliente HTTP pode, em qualquer tenant: criar, alterar e excluir CIs; gerar enrollment tokens; bloquear, desbloquear e revogar agentes; autorizar sub-redes; disparar varreduras; ler auditoria. O campo 'user' da auditoria também vem do corpo da requisição (PUT l.1166 'req.body.user \|\| "Carlos Amoroso (Administrador)"'), então dá para forjar o autor.
- **Impacto:** Comprometimento total da CMDB e do controle de agentes por qualquer pessoa com acesso à porta 3000. Vazamento entre tenants trocando um header. Trilha de auditoria falsificável.
- **Evidência:** l.905-909: 'const headerTenant = req.headers["x-tenant-id"]... return headerTenant \|\| queryTenant \|\| "tenant-demo";'. l.1748 POST /agent/enrollment-tokens e l.2261 POST /agent/devices/:agentId/block não têm middleware de auth. server.ts l.33-41 monta o router logo após express.json, sem auth.
- **Verificação:** CONFIRMADO (conferido manualmente)

#### A-293 · [CRÍTICA] authenticateAgent deixa passar requisições sem token (fallback 'legacy')
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** authenticateAgent l.971-975; consumidores: /agent/heartbeat l.2064-2173, /agent/inventory l.2333-2904, /agent/metrics l.2941-2960, /agent/events l.2963-2990
- **Categoria:** Segurança
- **Descrição:** Sem Authorization/x-agent-token, o middleware só seta headers de aviso e chama next(). Os handlers então usam o tenant do header e o agentId, hostname e ciId do corpo. Assim, qualquer cliente anônimo pode: sobrescrever a telemetria de qualquer CI (isOnline, CPU etc.); enviar inventário que cria CIs e relacionamentos automáticos; gravar eventos na auditoria 'imutável'. O próprio front (CmdbCiDetailModal l.160-173) usa esse caminho sem token para 'simular alteração', o que injeta mudanças falsas no histórico de auditoria.
- **Impacto:** Status e inventário de qualquer ativo podem ser falsificados (esconder um servidor offline, trocar serial/fabricante/responsável). A base cresce com CIs falsos e a auditoria vira fonte não confiável.
- **Evidência:** l.971-975: '// If legacy agent has not yet enrolled, permit request but add upgrade header\n res.setHeader("x-agent-auth", "legacy-unauthenticated"); ... return next();'. l.2087: 'const effectiveTenantId = identity ? identity.tenantId : getTenantId(req);'. l.2142-2145 localiza o CI por 'ciId' ou 'hostname' vindos do body.
- **Verificação:** CONFIRMADO (conferido manualmente)

#### A-294 · [CRÍTICA] Enrollment tokens fixos no código-fonte e expostos no bundle do front
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** l.496-497 (DEFAULT_LEGACY_TOKEN, DEMO_ENROLLMENT_TOKEN); seedInitialEnrollmentTokens l.499-528; fallback l.1850-1853
- **Categoria:** Segurança
- **Descrição:** O token 'wp-prod-token-***' (1000 usos, expira em 2027-12-31) e o 'enr_demo_sec_***' (50 usos) estão no código. O legacy também é aceito por comparação literal mesmo sem hash correspondente. O mesmo valor aparece em src/utils/installerScripts.ts:1, src/App.tsx:780, src/components/LgpdAndAgentInstaller.tsx:31 e src/components/cmdb/CmdbAgentApiModal.tsx:177, todos no bundle JavaScript servido ao navegador.
- **Impacto:** Qualquer pessoa que abra o front (ou leia o repositório) pode registrar dispositivos no tenant-demo, receber um deviceToken válido e combinar isso com o sequestro de identidade descrito em outro achado.
- **Evidência:** l.496: 'const DEFAULT_LEGACY_TOKEN = "wp-prod-token-***";' e l.1851: 'if (!matchedEnrollmentToken && suppliedToken === DEFAULT_LEGACY_TOKEN) { matchedEnrollmentToken = ... find(t => t.id === "enr-legacy-gpo"); }'. Grep encontrou o mesmo literal em 4 arquivos de src/.
- **Verificação:** CONFIRMADO (conferido manualmente)

#### A-295 · [CRÍTICA] Persistência não atômica com fallback silencioso que sobrescreve o banco com dados seed
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** loadStore l.736-842 (catch l.819-821); saveStore l.844-851
- **Categoria:** Estabilidade
- **Descrição:** saveStore usa fs.writeFileSync direto no arquivo final, sem arquivo temporário e rename. Um crash ou falta de energia no meio da escrita deixa JSON truncado. No restart, JSON.parse falha, o catch só faz console.error e devolve os dados iniciais. A primeira mutação seguinte (até um heartbeat ou falha de autenticação) grava o seed por cima do arquivo, e todo o histórico real se perde. Erros de escrita também são engolidos: a API responde sucesso mesmo sem persistir.
- **Impacto:** Perda total e silenciosa de CIs, relacionamentos, identidades de agentes, inventários e auditoria.
- **Evidência:** l.847: 'fs.writeFileSync(CMDB_PERSIST_FILE, JSON.stringify(store, null, 2), "utf-8");'. l.819-824: 'catch (err) { console.error(..."using initial data"...) } ... return { items: initialItems, ... }'. l.848-850: o catch de saveStore só registra no console.
- **Verificação:** CONFIRMADO (conferido manualmente)

#### A-296 · [ALTA] Re-enrollment permite sequestrar a identidade de outro agente e anula bloqueio
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** handleEnrollment l.1893-1903 (busca da identidade), l.1920-1923 (vínculo com ciId do cliente), l.1985-2000 (reset de status/token); unblock l.2279-2294
- **Categoria:** Segurança
- **Descrição:** A identidade existente é encontrada pelo deviceId enviado pelo cliente ('customDeviceId') ou por hostname+MAC, todos visíveis em GET /agent/devices, que não tem autenticação. Quem tem qualquer enrollment token válido (e o legacy é público) recebe um novo deviceToken para aquela identidade. O token do agente legítimo é invalidado e o status volta para 'active' mesmo que o administrador o tenha bloqueado. O 'ciId' do body também deixa vincular o equipamento a qualquer CI do tenant e sobrescrever hostname, MAC e IP dele (l.1972-1976). Além disso, /unblock seta 'active' também para agentes 'revoked', embora a revogação seja descrita como 'permanente'.
- **Impacto:** Um invasor assume a identidade de um servidor gerenciado, derruba o agente real e envia telemetria e inventário falsos. Bloqueios e revogações administrativas não têm efeito real.
- **Evidência:** l.1894: 'const deviceId = customDeviceId && customDeviceId.trim().length > 3 ? customDeviceId.trim() : ...'. l.1995-1997: 'identity.status = "active"; identity.tokenPrefix = tokenPrefix; identity.tokenHash = individualTokenHash;'. l.2289: 'device.status = "active";' sem checar se estava 'revoked'. l.2310: '...revogadas permanentemente.'
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-297 · [ALTA] Tokens de dispositivo previsíveis nas identidades migradas
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** migrateExistingCisToIdentities l.530-562; acionado em loadStore l.746-748 e l.833
- **Categoria:** Segurança
- **Descrição:** Na migração, o segredo do agente é montado de forma determinística a partir do id do CI e do MAC, ambos expostos sem autenticação em GET /cmdb/items. Qualquer pessoa pode recalcular o token e se autenticar como esse agente. A migração roda de novo sempre que agentIdentities estiver vazio.
- **Impacto:** Personificação de agentes sem precisar de enrollment token.
- **Evidência:** l.534: 'const rawSecret = `dev_tok_${item.id}_${item.macAddress ? item.macAddress.replace(/:/g, "") : "sec"}`;' e l.549: 'tokenHash: sha256(rawSecret)'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-298 · [ALTA] Dois escritores no mesmo cmdb_persisted.json causam perda de atualizações
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** store em memória l.854 + saveStore l.844-851; server/security/securityIntegrationBridge.ts l.22, l.64-79 (saveCmdbTickets)
- **Categoria:** Banco de dados
- **Descrição:** cmdbRouter carrega o arquivo uma vez no boot e depois grava o objeto inteiro da memória. securityIntegrationBridge lê o arquivo, troca 'tickets' e regrava. Os tickets gravados pela bridge não entram no cache do cmdbRouter: GET /cmdb/tickets não os mostra, e o próximo saveStore do CMDB os apaga. Se o arquivo não existir, a bridge grava só {items, tickets}. Nesse caso, no restart loadStore não preenche relationships, services, contracts e history (só faz migração quando Array.isArray), e store.relationships.filter ou store.history.unshift lançam TypeError.
- **Impacto:** Tickets gerados pelo módulo de segurança somem. Em ambiente novo, o módulo CMDB pode ficar inoperante depois de um restart.
- **Evidência:** securityIntegrationBridge.ts l.66-76: 'let store: any = { items: INITIAL_CMDB_ITEMS, tickets: INITIAL_CMDB_TICKETS }; ... store.tickets = [...]; fs.writeFileSync(CMDB_PERSIST_FILE, ...)'. cmdbRouter l.854: 'let store: CMDBStore = loadStore();' nunca é recarregado. l.798: 'if (Array.isArray(parsed.relationships))' não tem else com valor padrão.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-299 · [ALTA] Escrita síncrona do store inteiro várias vezes por requisição e crescimento sem limite
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** logAuditEvent l.1007-1008; logAgentAudit l.896-901; POST /cmdb/items l.1125-1126; heartbeat l.2161; inventory l.2495-2509, 2615, 2685, 2881; authenticateAgent l.929 (falha grava disco)
- **Categoria:** Desempenho
- **Descrição:** logAuditEvent e logAgentAudit chamam saveStore, e os handlers chamam saveStore de novo. No inventário, cada mudança detectada gera um logAuditEvent com escrita completa, além de outras 2 a 3 escritas. Cada heartbeat (pollInterval de 30 s por agente) serializa e grava o arquivo inteiro de forma síncrona, bloqueando o event loop. history, inventorySnapshots (snapshot completo com a lista de softwares a cada envio), inventoryChangeHistory, discoveryJobs, discoveredDevices e relationships não têm teto. Só heartbeats e agentAuditLogs são cortados em 500. GET /cmdb/history devolve tudo quando não há 'limit'.
- **Impacto:** Com dezenas ou centenas de agentes, a latência do servidor inteiro sobe (o Express é single-thread), o arquivo cresce sem parar e o risco de corrupção por escrita aumenta.
- **Evidência:** l.1007-1008: 'store.history.unshift(event); saveStore(store);'. l.2496-2509: 'detectedChanges.forEach(chg => { logAuditEvent(...) })'. l.2513: 'store.inventorySnapshots.unshift(finalSnapshot);' sem corte. Arquivo atual: cmdb_persisted.json com 156 KB.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-300 · [ALTA] Relacionamentos automáticos entre tenants e com evidência 'CONFIRMED' fabricada
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** POST /agent/inventory l.2748-2790 (defaultSwitch/defaultAp), l.2706-2746 (USER_TO_ASSET), l.2838-2876 (warranty); POST /cmdb/discovery/promote l.3987-4032 (switchCore)
- **Categoria:** Regra de negócio
- **Descrição:** Os switches e APs usados como destino são buscados em store.items sem filtrar pelo tenant, então um ativo do tenant B pode ser ligado ao switch do tenant A. Os relacionamentos recebem evidencia 'CONFIRMED' e textos de prova inventados ('Gateway ARP mapeado...', 'Porta ativa mapeada via LLDP...') sem nenhuma coleta real. O destino é apenas o primeiro switch da lista. Isso contraria a regra declarada no próprio código: 'Não criar relacionamentos sem evidência.' As checagens de duplicidade também não filtram tenant.
- **Impacto:** A topologia e a análise de impacto ficam falsas, e GET /cmdb/relationships de um tenant expõe nome e código de CIs de outro tenant.
- **Evidência:** l.2749: 'const defaultSwitch = store.items.find(i => i.tipo === "switch" \|\| i.typeId === "switch");' sem tenant. l.3988: 'const switchCore = store.items.find(i => (i.tipo === "switch" \|\| i.typeId === "switch") && i.id !== existingCi!.id);'. l.2784: "proof: `Gateway ARP mapeado na interface MAC ...`" com 'evidencia: "CONFIRMED"'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-301 · [ALTA] Discovery Job é simulado: devolve equipamentos fixos e logs inventados
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** POST /cmdb/discovery/jobs l.3339-3714 (logs l.3394-3429, sampleEquipments l.3432-3540, resultado l.3648-3665)
- **Categoria:** UI não implementada
- **Descrição:** O endpoint chamado pela tela CmdbDiscoveryView não faz nenhuma varredura. Ele gera logs fixos ('Resoluções ARP recebidas para 7 hosts', 'Community...'), sempre os mesmos 5 dispositivos (SWITCH-01, FIREWALL-01...) com MACs fixos, 'totalIpsScanned: 254', 'durationSeconds: 12' e evidência 'CONFIRMED'. O IP é feito com cidr.replace('.0/24', '.2'). Para qualquer CIDR que não seja /24 (ex.: 10.0.0.0/16), o IP gravado fica igual à string do CIDR. Os parâmetros rateLimit, timeout, concorrência e o campo 'adminToken' são lidos e nunca usados. O status é sempre 'COMPLETED'.
- **Impacto:** O operador acredita ter descoberto ativos reais, e dispositivos fictícios entram no pipeline e viram CIs ao serem promovidos. A varredura real existe em outro endpoint (live-scan), sem as regras de autorização.
- **Evidência:** l.3394: '// Simulação de varredura modular não-agressiva'. l.3432: 'const sampleEquipments: Array<Partial<DiscoveredDevice>> = [ { hostname: "SWITCH-01", ip: cidr.replace(".0/24", ".2"), mac: "00:27:E3:44:55:66" ...'. l.3349: 'adminToken' é desestruturado e não é usado.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-302 · [ALTA] Promoção em 1 clique do Live Scanner sempre falha: deviceId não existe no backend
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** POST /cmdb/discovery/live-scan l.3142 (geração do id); POST /cmdb/discovery/promote l.3865-3868; src/components/cmdb/LiveNetworkScannerTab.tsx l.212-227
- **Categoria:** Falha de integração
- **Descrição:** O live-scan grava os dispositivos com id aleatório 'dev-<base36>-<rand>' e devolve ao front o 'result' bruto do scanner, sem esses ids. O front então chama promote com 'deviceId: `dev-${device.ip.replace(/\./g, '-')}`', formato que nunca é gerado. O promote busca por id e responde 404.
- **Impacto:** O botão 'Promover para CMDB' do Live Scanner nunca funciona e o usuário sempre recebe erro.
- **Evidência:** cmdbRouter l.3142: 'id: existingIdx >= 0 ? ... : `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`'. LiveNetworkScannerTab l.219: 'deviceId: `dev-${device.ip.replace(/\./g, "-")}`'. cmdbRouter l.3866-3867: 'if (!device) return res.status(404).json({ error: "Dispositivo descoberto não encontrado neste tenant." })'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-303 · [ALTA] Id de relacionamento gerado no front é ignorado pelo backend e a exclusão falha
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** POST /cmdb/relationships l.1274-1275; DELETE /cmdb/relationships/:id l.1403-1406; src/components/cmdb/CmdbModule.tsx l.243-297
- **Categoria:** Falha de integração
- **Descrição:** O front cria o relacionamento com id local 'rel-${Date.now()}', mostra na tela e não lê a resposta. O backend descarta o id recebido e gera outro ('rel-${Date.now()}-${rand}'). Excluir esse relacionamento antes de recarregar envia o id local e recebe 404, mas o front já removeu da tela. Ele volta no próximo carregamento. O front também só trata exceção de rede, então respostas 400, 403 e 404 passam em silêncio.
- **Impacto:** Exclusões não persistem e a UI fica divergente do backend.
- **Evidência:** cmdbRouter l.1275: 'id: `rel-${Date.now()}-${Math.floor(Math.random() * 1000)}`' (não usa req.body.id). CmdbModule l.246: 'id: `rel-${Date.now()}`' e l.277-281: fetch POST sem ler a resposta. l.288-293: DELETE com o id local.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-304 · [ALTA] Exclusão de CI sem integridade referencial
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** DELETE /cmdb/items/:id l.1188-1209
- **Categoria:** Banco de dados
- **Descrição:** A exclusão remove só o item e os relacionamentos. Continuam apontando para o CI excluído: tickets (ciId), contracts.linkedCiIds, services.underlyingCiIds, agentIdentities.ciId (o agente segue autenticado ligado a um CI inexistente), discoveredDevices.linkedCiId/matchedCi e inventorySnapshots. Não há bloqueio para CIs críticos ou com dependentes, nem exclusão lógica. A ação é registrada como 'AUDITORIA', não como exclusão.
- **Impacto:** Referências órfãs, contagens erradas em serviços, contratos e análise de impacto, e um agente ativo apontando para o vazio.
- **Evidência:** l.1202-1203: 'store.items = store.items.filter(i => i.id !== id); store.relationships = store.relationships.filter(r => r.sourceCiId !== id && r.targetCiId !== id);' e nenhuma outra coleção é tratada.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-305 · [ALTA] Live-scan e Wake-on-LAN sem checar sub-rede autorizada (servidor vira scanner de rede)
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** POST /cmdb/discovery/live-scan l.3124-3187; POST /cmdb/discovery/wol l.3190-3223
- **Categoria:** Segurança
- **Descrição:** Os Discovery Jobs exigem sub-rede autorizada (l.3358-3368), mas o live-scan aceita qualquer 'targetRange'. São até 512 IPs por chamada, incluindo IPs públicos, com sondagem TCP e concorrência de até 50, e tudo sem autenticação. O WOL aceita broadcastAddress e porta arbitrários e envia UDP para qualquer destino. A regra 'executada somente em redes autorizadas' é contornada.
- **Impacto:** Qualquer cliente anônimo pode usar o servidor para mapear redes internas ou externas (SSRF/port scan) e gerar tráfego UDP para qualquer endereço.
- **Evidência:** l.3126-3135: 'const { targetRange, concurrency } = req.body; ... await NetworkScannerService.executeLiveScan(targetRange, {...})' sem consultar store.authorizedSubnets. networkScannerService.ts l.488-519 só limita o prefixo a /16-/32 e a 512 IPs.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-306 · [ALTA] loadStore recria dados demo e re-autoriza sub-redes a cada restart
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** loadStore l.743-772, l.791-794, l.810-814
- **Categoria:** Regra de negócio
- **Descrição:** A cada boot: os 7 dispositivos demo do 'prompt 7' que faltarem são reinseridos; 'ci-router' volta se tiver sido excluído; INITIAL_RELATIONSHIPS excluídos voltam; e quando alguma coleção fica vazia ela é recriada com seed. Isso vale para authorizedSubnets (sub-redes revogadas pelo admin voltam autorizadas), enrollmentTokens (volta o token legacy), inventoryChangeHistory (mudanças fictícias) e agentIdentities (tokens previsíveis).
- **Impacto:** Exclusões e revogações do usuário não persistem entre restarts. Autorização de varredura revogada volta a valer, o que é uma falha de compliance.
- **Evidência:** l.757-758: 'if (!parsed.authorizedSubnets \|\| parsed.authorizedSubnets.length === 0) { parsed.authorizedSubnets = seedInitialAuthorizedSubnets(); }'. l.791-793: "if (!parsed.items.some(i => i.id === 'ci-router')) { ... parsed.items.push(routerCi); }". l.810-813: INITIAL_RELATIONSHIPS reinseridos.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-307 · [MÉDIA] Análise de impacto com direção invertida, variável sem uso e números fabricados
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** GET /cmdb/impact/:id l.1458-1556
- **Categoria:** Regra de negócio
- **Descrição:** Os 'dependentes' são calculados só pelas arestas de saída (source=alvo). Os relacionamentos automáticos são gravados como ativo→switch (l.2763-2764, l.4002-4003). Assim, quando um switch cai, os ativos ligados a ele não aparecem como impactados. 'incomingRels' é calculado e nunca usado, e a cascata para no nível 2. O nível de impacto depende de typeId/código fixos ('CI-INET-01', 'servidor', sem considerar 'server') e usa '148' usuários fixos quando não há serviços. O endpoint não tem consumidor no front.
- **Impacto:** A análise de impacto subestima falhas de infraestrutura e mostra números inventados como se fossem cálculo.
- **Evidência:** l.1475-1476: 'const outgoingRels = ...sourceCiId === id...; const incomingRels = ...targetCiId === id...;' e incomingRels não é usado depois. l.1533: "\|\| (impactLevel === \"CRÍTICO\" ? 148 : directDependents.length * 4)". l.1525: 'targetCi.code === "CI-INET-01"'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-308 · [MÉDIA] Correspondência de CI por undefined===undefined e identificadores padrão compartilhados
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** inventory l.2341, l.2355-2357, l.2468-2471; heartbeat l.2142-2145; metrics l.2946-2949; events l.2968-2971
- **Categoria:** Bug / código incompleto
- **Descrição:** Sem identidade e sem network/MAC no corpo, 'i.macAddress === finalSnapshot.network?.[0]?.macAddress' compara undefined com undefined e casa com o primeiro CI do tenant sem MAC. Hoje são 5 CIs nesse caso, por exemplo ci-inet e ci-vpn. O inventário então sobrescreve fabricante, modelo, serial e responsável desse CI. O deviceId padrão 'dev_hw_unknown' é compartilhado por todos os envios sem identidade, então o 'snapshot anterior' pode ser de outro dispositivo e o inventário incremental mistura dados de máquinas diferentes. CIs criados com MAC padrão '00:00:00:00:00:00' (l.2435, l.2590) também se fundem entre si.
- **Impacto:** O inventário de um equipamento corrompe o registro de outro CI, e o diff gera mudanças falsas na auditoria.
- **Evidência:** l.2469: '... \|\| i.macAddress === finalSnapshot.network?.[0]?.macAddress) && i.tenantId === tenantId'. l.2341: 'const deviceId = identity?.deviceId \|\| body.deviceId \|\| "dev_hw_unknown";'. l.2356: '.filter(s => (s.agentId === agentId \|\| s.deviceId === deviceId) && ...)'. Dados atuais: noMac = ci-inet, ci-vpn, ci-isp, ci-db-sql (tenant-demo).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-309 · [MÉDIA] Falta validação de entrada no CRUD de CIs (crash na busca, id duplicado, spread irrestrito)
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** GET /cmdb/items l.1035-1047; POST /cmdb/items l.1103-1122; PUT /cmdb/items/:id l.1147-1153; GET /cmdb/history l.1723-1725; GET /cmdb/changes l.3074
- **Categoria:** Bug / código incompleto
- **Descrição:** O POST só exige name e typeId, mas a busca chama .toLowerCase() em hostname, ipAddress, serialNumber, assetTag, model e responsible sem checagem. Um único CI criado via API sem esses campos gera TypeError e HTTP 500 em toda busca do tenant. O POST aceita 'body.id' sem checar duplicidade (ids duplicados fazem o DELETE remover os dois) e espalha o body inteiro no registro. O PUT aceita qualquer campo, inclusive code e createdAt, sem validar enums de status e criticidade, e grava 'user' dentro do CI. 'limit' não numérico gera slice(0, NaN) e lista vazia.
- **Impacto:** A busca do CMDB pode cair, a integridade de ids e códigos não é garantida e há atribuição em massa de campos.
- **Evidência:** l.1040: 'i.hostname.toLowerCase().includes(q) \|\|' sem '?.'. l.1107: 'const newId = body.id \|\| `ci-${Date.now()}`;' sem checar existência. l.1148-1149: '...oldItem, ...updates,'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-310 · [MÉDIA] POST /cmdb/relationships aceita CIs inexistentes, autolaço e duplicatas
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** POST /cmdb/relationships l.1234-1315 (comparar com POST /cmdb/items/:id/relationships l.1339-1341)
- **Categoria:** Banco de dados
- **Descrição:** Ao contrário da rota irmã, essa rota (a usada pelo front) não valida se origem e destino existem no tenant. Ela aceita nomes e códigos vindos do body e não impede origem igual a destino nem relacionamento duplicado. Os relacionamentos também servem como modelo polimórfico, apontando para usuários, softwares, tickets e garantias que não são CIs. Hoje há 11 relacionamentos persistidos com destino ou origem fora de items (ex.: usr-juliana-01→ci-nb-01, ci-pc-005→tkt-1042).
- **Impacto:** Grafo com arestas pendentes. O health score conta esses ids como 'com relacionamento' e a topologia descarta silenciosamente essas arestas.
- **Evidência:** l.1267-1268: 'const sourceItem = ...find(...); const targetItem = ...find(...);' sem 'if (!sourceItem \|\| !targetItem) return 400'. l.1285: 'sourceCiName: sourceItem?.name \|\| req.body.sourceCiName \|\| srcId'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-311 · [MÉDIA] Pipeline de discovery: re-varredura reseta decisões, promote ignora REJECTED e grava auditoria errada
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** live-scan l.3153-3158; discovery job l.3633-3635; match l.3758-3782; promote l.3870-3877, 3889-3892, 3970-3972, 4043-4044
- **Categoria:** Regra de negócio
- **Descrição:** (a) Live-scan e jobs sobrescrevem dispositivos existentes com status 'DISCOVERED' e pipelineStage 'DISCOVERY', o que desfaz aprovações e rejeições anteriores. (b) O promote não verifica se o dispositivo foi REJECTED, e 'targetStage' não é validado. (c) O promote casa CI existente só por IP e força status 'operacional', sobrescrevendo 'manutencao' ou 'desativado'. (d) A auditoria do promote registra oldValue=device.discoveryStage depois de já ter atribuído nextStage (l.3875), então antigo e novo ficam iguais. (e) O match manual marca 'MATCHED_EXACT_MAC' mesmo sem comparar MAC e injeta telemetria inventada (isOnline true, uptime 720, latency 1).
- **Impacto:** Fluxo de homologação inconsistente, auditoria incorreta e CIs com status e telemetria falsos.
- **Evidência:** l.3875: 'device.discoveryStage = nextStage;' e depois l.4043-4044: 'device.discoveryStage, nextStage,'. l.3762: 'device.matchingStatus = "MATCHED_EXACT_MAC";'. l.3972: "existingCi.status = 'operacional';". l.3153: "status: 'DISCOVERED', pipelineStage: 'DISCOVERY'" no merge.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-312 · [MÉDIA] CIs criados automaticamente com dados fabricados (contrato, IP, telemetria, cliente, responsável)
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** enrollment l.1925-1969; inventory l.2584-2611; promote l.3924-3949; migração loadStore l.776-789
- **Categoria:** Regra de negócio
- **Descrição:** A criação automática preenche valores inventados como se fossem reais: linkedContractId 'cont-01' / 'Contrato Master Suporte 24x7' (que depois gera relacionamento de garantia 'CONFIRMED', l.2838-2876), IP '192.168.1.100', MAC '00:00:00:00:00:00', fabricante 'Dell / Lenovo', telemetria fixa (CPU 22%, uptime 840 h, isOnline true), clientId 'cli-demo-01' ou 'cli-01', e clientName dependente de 'tenant-filial-01' (que não existe, já que o tenant real é 'tenant-alfa'). A migração do loadStore grava 'Dell Inc.', 'SN-PADRAO' e 'Carlos Amoroso' em todo CI sem esses campos.
- **Impacto:** Os indicadores de health, contratos e SLA ficam artificialmente bons e a CMDB perde confiabilidade.
- **Evidência:** l.2602-2603: "linkedContractId: 'cont-01', linkedContractName: 'Contrato Master Suporte 24x7',". l.2589: "ipAddress: ... \|\| '192.168.1.100'". l.783-787: "fabricante: item.fabricante \|\| item.manufacturer \|\| 'Dell Inc.' ... usuarioResponsavel: ... \|\| 'Carlos Amoroso'".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-313 · [MÉDIA] Códigos de CI gerados sem garantia de unicidade
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** POST /cmdb/items l.1108; enrollment l.1927; inventory l.2560-2561; promote l.3898-3899
- **Categoria:** Banco de dados
- **Descrição:** Os códigos usam um aleatório de 3 dígitos (CI-GEN-xxx, CI-AGT-xxx) ou 'store.items.length + 1' (CI-XXX-NN), que se repete depois de exclusões. Não há checagem de unicidade. O código é usado como chave alternativa em /cmdb/items/:id/changes (l.3003, l.3009) e nos filtros de mudanças.
- **Impacto:** Dois CIs com o mesmo código misturam histórico de alterações e confundem os operadores.
- **Evidência:** l.2560-2561: 'const ciCount = store.items.length + 1; const ciCode = `CI-${...}-${ciCount < 10 ? "0" : ""}${ciCount}`;'. l.1927: 'CI-AGT-${Math.floor(100 + Math.random() * 900)}'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-314 · [MÉDIA] Taxonomia de tipos e campos duplicada e inconsistente (PT vs EN)
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** migrateExistingCisToIdentities l.532; loadStore l.776-808; impacto l.1525-1527; inventory l.2516-2553, 2571-2572; promote l.3907-3908
- **Categoria:** Banco de dados
- **Descrição:** Os seeds usam typeId em português ('servidor', 'computador', 'impressora'). Inventário e promote criam typeId em inglês ('server', 'workstation', 'printer'). A migração de identidades filtra 'servidor_fisico', 'servidor_virtual' e 'estacao_trabalho', que não existem nos seeds. A análise de impacto só reconhece 'servidor', então CIs 'server' não sobem para ALTO. Cada registro guarda pares redundantes (name/nome, manufacturer/fabricante, sourceCiId/origem, tenantId/tenant, eventType/event_type...) que podem divergir. A heurística resolveCiType usa substrings curtas ('sw', 'fw', 'tab', 'note') no hostname e classifica errado hosts como 'DESKTOP-SW1A2B3'.
- **Impacto:** Filtros por tipo, a regra de impacto e a migração de identidades falham conforme a origem do CI. Os dados ficam inconsistentes.
- **Evidência:** l.532: 'i.typeId === "servidor_fisico" \|\| ... "estacao_trabalho"'. Os seeds (cmdbInitialData.ts) têm só 'servidor' (3) e 'computador' (5). l.1527: 'targetCi.typeId === "servidor"'. l.2528: "if (host.includes('sw') \|\| ...) return 'switch';".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-315 · [MÉDIA] Rate limit contornável via X-Forwarded-For, mapa sem limpeza e falhas de auth gravando disco
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** checkRateLimit l.857-875; clientIp em l.922, 1781, 1816, 2065 etc.; authenticateAgent l.928-941
- **Categoria:** Segurança
- **Descrição:** O IP do cliente vem direto do header X-Forwarded-For, sem 'trust proxy', então o limite de enrollment (15/min por IP) é contornado trocando o header. O rateLimitMap nunca remove buckets expirados e cresce com IPs forjados. Cada token inválido em authenticateAgent gera logAgentAudit e saveStore síncrono antes de qualquer limite de taxa.
- **Impacto:** Brute force e flood não são contidos, com vazamento de memória e escrita intensiva em disco que permite DoS.
- **Evidência:** l.1816: 'const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() \|\| ...'. l.861: 'const rateLimitMap = new Map<...>()' sem delete. l.929-936: logAgentAudit (que chama saveStore, l.901) em cada falha.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-316 · [MÉDIA] Auditoria 'imutável' é truncada e allowedSubnets do enrollment token nunca é aplicado
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** logAgentAudit l.898-900; heartbeats l.2128-2130; POST /agent/enrollment-tokens l.1772; handleEnrollment l.1846-1887; rotas de imutabilidade l.4060-4084
- **Categoria:** Regra de negócio
- **Descrição:** O router declara que os registros de auditoria 'jamais podem ser apagados' (l.4066), mas agentAuditLogs é cortado em 500 e os registros mais antigos são descartados em silêncio. O token de enrollment aceita 'allowedSubnets', que é persistido e nunca checado contra o IP do cliente no enrollment.
- **Impacto:** Perda de trilha de auditoria de segurança (falhas de auth, bloqueios) e uma restrição de rede configurável que não tem efeito.
- **Evidência:** l.898-899: 'if (store.agentAuditLogs.length > 500) { store.agentAuditLogs = store.agentAuditLogs.slice(0, 500); }'. 'allowedSubnets' só aparece em l.1750 e l.1772.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-317 · [MÉDIA] Endpoints do backend sem consumidor; front usa mocks para serviços, contratos e histórico
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** GET /cmdb/topology l.1431; /cmdb/impact/:id l.1458; /cmdb/health l.1563; /cmdb/orphans l.1650; GET/POST /cmdb/services l.1679-1696; /cmdb/contracts l.1699; /cmdb/tickets l.1705; /cmdb/history l.1716; GET /cmdb/items/:id l.1058; /cmdb/items/:id/relationships l.1223 e l.1318; /cmdb/changes l.3040; /agent/devices/:agentId l.2234; /agent/devices/:agentId/inventory l.2907; /agent/inventory/snapshots l.2934; /agent/devices/:agentId/changes l.3082; /cmdb/discovery/jobs/:id/cancel l.3717; /agent/register l.2060
- **Categoria:** Desconectado
- **Descrição:** O grep em src/ não encontrou nenhuma chamada a esses endpoints. CmdbModule.tsx inicializa services, contracts e history com INITIAL_* (l.49-53), e serviços criados na UI (handleCreateService) ficam só no estado local. O health score e o impacto são recalculados no front. A auditoria real gravada pelo backend (eventos de agente, promoções) nunca aparece na tela do CMDB.
- **Impacto:** Funcionalidades parecem persistentes mas se perdem no reload. Há duas implementações divergentes de health e impacto e código morto para manter.
- **Evidência:** CmdbModule.tsx l.51-53: 'useState<ITBusinessService[]>(INITIAL_BUSINESS_SERVICES)', 'useState<CMDBContractLink[]>(INITIAL_CMDB_CONTRACTS)', 'useState<CIHistoryEvent[]>(INITIAL_CMDB_HISTORY)'. Grep por '/cmdb/(topology\|impact\|health\|orphans\|services\|contracts\|tickets\|history\|changes)' em src/ não trouxe nenhuma chamada fetch.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-318 · [BAIXA] Dados de runtime (cmdb_persisted.json) versionados no git, com community SNMP em logs
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** CMDB_PERSIST_FILE l.50-51; discovery job l.3417 e l.3684
- **Categoria:** Segurança
- **Descrição:** O arquivo de persistência fica em src/data e está rastreado pelo git ('git ls-files' lista src/data/cmdb_persisted.json). Ele contém hashes de tokens, IPs, hostnames e logs de auditoria. O job de discovery grava a community SNMP informada pelo usuário em texto puro nos logs e no scanConfig, e GET /cmdb/discovery/jobs os devolve sem autenticação.
- **Impacto:** Vazamento de dados operacionais e de credenciais SNMP pelo repositório ou pela API, além de conflitos de merge com dados de runtime.
- **Evidência:** l.3417: "message: `Interrogação SNMPv2c/v3 (Community: '${snmpCommunity \|\| \"public\"}') executada...`". l.3684: 'snmpCommunity: snmpCommunity \|\| "public"'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-319 · [BAIXA] Código duplicado, seeds no router e recursos anunciados que não existem
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** seeds l.75-734; sampleEquipments l.3432-3540 (duplica seedInitialPrompt7DiscoveredDevices l.167-494); extração de clientIp repetida em 8 rotas; duas rotas POST de relacionamento l.1234 e l.1318; featuresEnabled l.2048
- **Categoria:** Duplicado / obsoleto
- **Descrição:** Cerca de 660 linhas de dados demo estão embutidas no router. A lógica de criação de relacionamento está duplicada com regras diferentes (uma valida os CIs, a outra não). A extração do IP está copiada em vários handlers. A resposta do enrollment anuncia 'remote_exec' e 'process_monitoring', que não têm endpoint correspondente.
- **Impacto:** Manutenção difícil, comportamentos divergentes entre rotas equivalentes e expectativas falsas para clientes do agente.
- **Evidência:** l.2048: 'featuresEnabled: ["telemetry", "hardware_inventory", "process_monitoring", "remote_exec", "token_rotation"]'. Não há rota /agent/exec nem de processos no router.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

### 6.14 CMDB — scanner de rede e dados

_Forma de exame: Manual (verificação dirigida) — 3 achados._

#### A-320 · [ALTA] Live scan anônimo aceita faixas públicas: o servidor vira scanner de portas
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** POST /cmdb/discovery/live-scan L3124-3187; networkScannerService.ts generateIpList L488-561
- **Categoria:** Segurança
- **Descrição:** Qualquer CIDR de /16 a /32 ou intervalo é aceito, sem checar se é rede privada nem se pertence a alguma sub-rede cadastrada, e sem autenticação. Cada chamada sonda até 512 hosts em várias portas, e não há limite de chamadas.
- **Impacto:** Uso do servidor da empresa para varredura de terceiros (abuso e risco legal), além de carga de rede e CPU.
- **Evidência:** Nenhuma validação de RFC1918 em generateIpList; a rota só exige targetRange.
- **Verificação:** CONFIRMADO (manual)

#### A-321 · [MÉDIA] Varredura truncada em 512 IPs sem aviso (um /16 vira os primeiros 512 hosts)
- **Arquivo:** `server/networkScannerService.ts`
- **Localização:** generateIpList L488 (maxLimit = 512), L504, L549
- **Categoria:** Bug / código incompleto
- **Descrição:** /16 a /22 são aceitos, mas só os primeiros 512 endereços são gerados, e a resposta não indica o corte.
- **Impacto:** O operador acredita que a sub-rede inteira foi inventariada, e o inventário fica incompleto.
- **Evidência:** const count = Math.min(Math.pow(2, 32 - bits), maxLimit);
- **Verificação:** CONFIRMADO (manual)

#### A-322 · [BAIXA] Wake-on-LAN anônimo com endereço e porta de broadcast arbitrários
- **Arquivo:** `server/cmdbRouter.ts`
- **Localização:** POST /cmdb/discovery/wol L3190-3199
- **Categoria:** Segurança
- **Descrição:** broadcastAddress e port vêm do corpo da requisição sem validação. O servidor envia UDP para qualquer destino informado.
- **Impacto:** Uso do servidor para enviar pacotes a destinos arbitrários e para ligar máquinas sem autorização.
- **Evidência:** sendWakeOnLan(mac, broadcastAddress \|\| '255.255.255.255', port ? Number(port) : 9)
- **Verificação:** CONFIRMADO (manual)

### 6.15 Segurança/Pentest — router, orquestrador, validador

_Forma de exame: Manual (verificação dirigida) — 6 achados._

#### A-323 · [CRÍTICA] RBAC do módulo de segurança baseado em cabeçalhos enviados pelo cliente (x-user-role)
- **Arquivo:** `server/securityRouter.ts`
- **Localização:** getAuthContext L47-56; requireRoles L59-93
- **Categoria:** Segurança
- **Descrição:** Identidade, tenant e papel do usuário vêm de cabeçalhos HTTP livres (x-tenant-id, x-user-id, x-user-role). Sem eles, assume uma identidade fixa de técnico. Basta enviar x-user-role: ADMIN para passar em qualquer requireRoles. Só 6 das 70 rotas usam requireRoles.
- **Impacto:** Qualquer pessoa na rede aprova, lança e interrompe pentests, lê achados e relatórios de qualquer tenant e altera controles de compliance.
- **Evidência:** L48 const tenantId = req.headers['x-tenant-id'] \|\| 'tenant-demo'; L53 role: req.headers['x-user-role'] \|\| 'TECHNICIAN'; L65 ADMIN/CISO => next().
- **Verificação:** CONFIRMADO (manual)

#### A-324 · [ALTA] Aprovação de pentest pela interface sempre falha com 403
- **Arquivo:** `src/components/security/PentestApprovalModal.tsx`
- **Localização:** PentestApprovalModal.tsx L33-39; securityRouter.ts L381 (requireRoles SECURITY_MANAGER...), L70-74 (aliases)
- **Categoria:** Falha de integração
- **Descrição:** O modal não envia cabeçalho de papel. O servidor assume TECHNICIAN, e esse papel não está entre os autorizados a aprovar nem entre os aliases de SECURITY_MANAGER. A rota /approve responde 403 RBAC_FORBIDDEN, e o mesmo vale para /reject.
- **Impacto:** O fluxo criar, submeter, aprovar e executar pentest fica travado na interface. Só projetos já aprovados nos dados de seed podem ser executados.
- **Evidência:** headers: { 'Content-Type': 'application/json' }, sem x-user-role; aliases SECURITY_MANAGER: ['MANAGER','CISO','ADMIN','SECURITY_ADMIN'].
- **Verificação:** CONFIRMADO (manual)

#### A-325 · [ALTA] Validador de alvos aceita qualquer IP público e usa sub-redes autorizadas fixas no código
- **Arquivo:** `server/security/targetValidator.ts`
- **Localização:** validateTarget L43-163; chamadas com CIDRs fixos em pentestRunner.ts L104-107 e securityOrchestrator.ts L940-944
- **Categoria:** Segurança
- **Descrição:** Só IPs privados são checados contra a lista de sub-redes autorizadas. IPs públicos são sempre válidos, sem prova de propriedade nem escopo do tenant. As sub-redes autorizadas são literais (192.168.1.0/24, 10.0.0.0/24, 172.16.0.0/24), iguais para todos os tenants e independentes dos escopos cadastrados.
- **Impacto:** O servidor pode ser usado para varrer ou atacar hosts de terceiros na internet, o que gera risco jurídico. Escopos reais da empresa fora dessas faixas ficam bloqueados.
- **Evidência:** if (isPrivate) { checkSubnetAuthorization(...) } senão return isValid: true; ['192.168.1.0/24','10.0.0.0/24','172.16.0.0/24'] literal.
- **Verificação:** CONFIRMADO (manual)

#### A-326 · [ALTA] Suítes de teste executáveis por GET anônimo alteram dados de produção
- **Arquivo:** `server/securityRouter.ts`
- **Localização:** L112 GET /security/test-suite/run; L1029 GET /security/e2e/run; securityTestSuite.ts L236 (emergencyStop 'pnt-proj-01'); e2eIntegrationSuite.ts L134, L256, L284
- **Categoria:** Segurança
- **Descrição:** As suítes rodam sobre o store real (security_persisted.json): iniciam scans, executam retestes, criam relatórios e acionam o kill switch do projeto pnt-proj-01. O botão da tela de Observabilidade dispara a suíte. O mesmo acontece em npm test e no CI.
- **Impacto:** Qualquer pessoa ou crawler que chame um GET corrompe dados e interrompe pentests reais. Cada execução de testes suja arquivos versionados no git.
- **Evidência:** PentestControlPlane.emergencyStop('tenant-demo','pnt-proj-01',...); SecurityOrchestrator.startScan / executeRetest / createCustomReport.
- **Verificação:** CONFIRMADO (manual)

#### A-327 · [MÉDIA] Sem segregação de funções: quem solicita o pentest pode aprová-lo
- **Arquivo:** `server/security/pentestControlPlane.ts`
- **Localização:** approveProject ~L461-500
- **Categoria:** Regra de negócio
- **Descrição:** approveProject só confere o status PENDING_APPROVAL e a autorização formal. Não compara o aprovador com quem criou ou submeteu o projeto.
- **Impacto:** Anula o controle de dupla aprovação exigido para testes ofensivos.
- **Evidência:** Nenhuma comparação createdBy/requestedBy x user.id no corpo de approveProject.
- **Verificação:** CONFIRMADO (manual)

#### A-328 · [MÉDIA] Proteção anti-SSRF vulnerável a DNS rebinding (validação e conexão resolvem o DNS separadamente)
- **Arquivo:** `server/security/pentestRunner.ts`
- **Localização:** L104 (validateTarget resolve o DNS) x L534-540 (http.request usa parsed.hostname)
- **Categoria:** Segurança
- **Descrição:** O IP resolvido na validação não é reutilizado. A requisição HTTP resolve o hostname de novo e pode cair em 127.0.0.1 ou 169.254.169.254.
- **Impacto:** Contorna o bloqueio de loopback e metadata da nuvem.
- **Evidência:** client.request({ hostname: parsed.hostname, ... }).
- **Verificação:** CONFIRMADO (manual)

### 6.16 Segurança/Pentest — control plane, runner, compliance, remediação

_Forma de exame: Agente (leitura integral) — 22 achados._

> **Estado do módulo:** A fatia de backend de Segurança/Pentest (control plane, runner, compliance, hardening, remediação) tem partes reais e partes simuladas. O PentestRunner faz tráfego de rede de verdade: abre conexões TCP em 9 portas fixas e faz GETs HTTP/HTTPS para checar HSTS, CSP, banners, /actuator e flags de cookie. Ele roda no próprio processo Express (o rótulo "LOCAL_ISOLATED/IsolatedWorker" não corresponde a nenhum isolamento), sem fila, sem limite total de tempo e com um kill switch só cooperativo, que não interrompe requisições em andamento e pode ser sobrescrito pelo status COMPLETED. O control plane implementa o fluxo DRAFT -> PENDING_APPROVAL -> APPROVED -> RUNNING, mas não cumpre a autorização formal: alvos autorizados, data de início, escopo, janela e dias da RoE, testes proibidos e limites do plano são ignorados. As sub-redes permitidas estão fixas no código e qualquer IP público é aceito. O defeito mais grave é de persistência: dois módulos gravam o mesmo security_persisted.json (PentestControlPlane e SecurityOrchestrator, este com cache em memória). Logo depois de salvar os achados do pentest, a chamada recordAudit regrava o arquivo com a lista antiga e apaga esses achados. O arquivo atual confirma isso: há auditoria PENTEST_COMPLETED com 2 achados e nenhum finding com pentestId. O HardeningEngine é quase todo simulado: controles CONFIG_AUDIT sempre passam, os resultados de HTTP_PROBE e PORT_SCAN são textos fixos, e a interface envia uma telemetria de agente fixa no código. O ComplianceEngine calcula o score só a partir de status fixos no catálogo, sem tenantId e sem relação com os achados reais, e trata NOT_APPLICABLE como falha. O RemediationEngine tem uma máquina de estados e SLA coerentes no papel, mas os prazos das etapas ignoram o SLA, as dependências apontam para IDs que não existem, as políticas de escalonamento nunca são usadas e as métricas do dashboard têm valores inventados (MTTR fixo em 2,4 dias) e contagens erradas de atraso. Pelo código, a aprovação pela interface sempre recebe 403: o modal não envia papel e o padrão é TECHNICIAN. Ao mesmo tempo, qualquer cliente que mande o cabeçalho x-user-role consegue aprovar, e não há segregação de funções (o arquivo mostra o mesmo usuário criando e aprovando um projeto). Principais riscos: perda de dados de achados, escopo de varredura fora da autorização formal (risco legal e de SSRF por DNS rebinding), relatórios de conformidade que afirmam conformidade sem verificação, e falta de isolamento entre tenants nos estados de execução e nos controles de compliance.

#### A-329 · [CRÍTICA] Achados do pentest são apagados do disco pelo SecurityOrchestrator logo após serem gravados
- **Arquivo:** `server/security/pentestControlPlane.ts`
- **Localização:** launchPentest (IIFE assíncrona), linhas 727-784; server/security/securityOrchestrator.ts saveStore linhas 114-151 e recordAudit linhas 769-803
- **Categoria:** Banco de dados
- **Descrição:** Dois módulos gravam o mesmo security_persisted.json com estratégias incompatíveis. O PentestControlPlane lê o arquivo, acrescenta os achados e as evidências do runner em updatedStore.findings/evidence e grava (linha 773). Logo depois chama SecurityOrchestrator.recordAudit (linha 775), que faz this.store.auditLogs.unshift(log) e saveStore(). O saveStore regrava 'findings: this.store.findings' e 'evidence: this.store.evidence' a partir do cache em memória, carregado uma única vez na inicialização (linha 74, sem nenhum reload). Esse cache não contém os achados do pentest, que são sobrescritos. O cache do orquestrador também nunca recebe esses achados, então dashboards, remediação, compliance e relatórios não os veem.
- **Impacto:** Todo pentest executado perde os achados e as evidências: o projeto fica COMPLETED sem vulnerabilidades registradas, o que gera falso negativo de segurança e quebra a trilha de evidências para auditoria (ISO/SOC2).
- **Evidência:** pentestControlPlane.ts:773 'this.saveStoreData(updatedStore);' seguido de :775 'SecurityOrchestrator.recordAudit(...)'. securityOrchestrator.ts:128-129 'findings: this.store.findings, evidence: this.store.evidence,'. Em src/data/security_persisted.json há uma auditoria 'PENTEST_COMPLETED' de pnt-002 com 'findingsCount': 2 (linhas 6532-6540), mas a busca por '"pentestId"' e 'PentestRunner/' retorna 0 ocorrências.
- **Verificação:** CONFIRMADO (conferido manualmente)

#### A-330 · [ALTA] Runner ignora a autorização formal, o escopo e as RoE: alvos fora do autorizado e qualquer IP público são varridos
- **Arquivo:** `server/security/pentestRunner.ts`
- **Localização:** pentestRunner.ts linhas 82, 104-108, 129, 204, 325, 385; pentestControlPlane.ts launchPentest linhas 594-652 e approveProject linhas 476-525; server/security/securityOrchestrator.ts linhas 940-944
- **Categoria:** Segurança
- **Descrição:** launchPentest só verifica auth.status==='APPROVED' e authorizedUntil. Não confere se os targets do projeto estão em auth.authorizedTargets, se o scopeId da autorização é o mesmo do projeto, nem se authorizedFrom já começou. As RoE (allowedHoursWindow 20:00-06:00, allowedDays, forbiddenTestTypes, maxRequestsTotal, maxConcurrency, manualApprovalRequired), o profile.blockedTests/enabledTests e os campos executionWindow/limits do ExecutionPlan não são usados em lugar nenhum. O runner usa só roe.maxSpeedRps e profile.categories. As sub-redes privadas permitidas estão fixas no código ('192.168.1.0/24','10.0.0.0/24','172.16.0.0/24'), repetidas em 3 lugares, em vez de virem do escopo do tenant. Para IPs públicos o TargetValidator não aplica nenhuma restrição (isPrivate=false => válido).
- **Impacto:** Um projeto aprovado pode varrer hosts que não estão no termo de autorização, fora da janela contratada e sem limite total de requisições. Isso é risco legal (varredura não autorizada) e operacional, e torna enganosas as telas de RoE e Autorização.
- **Evidência:** pentestRunner.ts:107 "['192.168.1.0/24', '10.0.0.0/24', '172.16.0.0/24']"; pentestControlPlane.ts:616 'const targets = store.targets.filter((t) => (project.targetIds \|\| []).includes(t.id));' sem cruzar com auth.authorizedTargets; targetValidator.ts:136 'if (isPrivate) { ...checkSubnetAuthorization }' (públicos não são checados). Nenhuma referência a allowedHoursWindow/forbiddenTestTypes/maxRequestsTotal/blockedTests em server/security.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-331 · [ALTA] Validação anti-SSRF sujeita a DNS rebinding: o IP validado não é fixado na conexão
- **Arquivo:** `server/security/pentestRunner.ts`
- **Localização:** linha 115 (targetHost), probePortSafe linha 490, auditWebSecurity linhas 530-546, linhas 217-219/334-336/398-400; server/security/targetValidator.ts linhas 15-25 e 110
- **Categoria:** Segurança
- **Descrição:** O runner valida o alvo com TargetValidator (que resolve o DNS uma vez) mas conecta usando validation.hostname ou target.targetValue, o que dispara uma nova resolução DNS em net.connect/https.request. O resolvedIp validado nunca é usado na conexão. Além disso, o validador só resolve IPv4 (family: 4), enquanto o cliente HTTP pode conectar via AAAA. A lista de bloqueio também não cobre fd00::/8 (o prefixo 'fc00:' só pega endereços que começam literalmente por fc00), 100.64.0.0/10 nem IPv4 mapeado em IPv6.
- **Impacto:** Um domínio com TTL baixo pode resolver para um IP público na validação e para 127.0.0.1, 169.254.169.254 ou a rede interna na conexão, contornando o bloqueio anti-SSRF do próprio servidor.
- **Evidência:** pentestRunner.ts:115 'const targetHost = validation.hostname \|\| validation.resolvedIp \|\| target.targetValue;' (hostname sempre vem preenchido quando o alvo é válido); :490 'socket.connect(port, host, ...)'; targetValidator.ts:110 'dns.lookup(hostname, { family: 4 })'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-332 · [ALTA] Kill switch não interrompe testes em andamento e o status CANCELLED pode ser sobrescrito por COMPLETED
- **Arquivo:** `server/security/pentestRunner.ts`
- **Localização:** pentestRunner.ts linhas 91-99, 204-320, 385-445, 448-458; pentestControlPlane.ts linhas 726-741, 810-899
- **Categoria:** Estabilidade
- **Descrição:** isAborted() só é checado no início de cada alvo (linha 91) e dentro dos laços de portas e caminhos. Os blocos de teste 2 (WEB) e 4 (sessão) não checam o aborto e nenhuma conexão em andamento é destruída. Se a parada ocorrer durante o último alvo, os laços apenas dão break, o for termina e run() retorna status 'COMPLETED'. O IIFE de launchPentest então grava curProj.status = result.status ('COMPLETED') e curState.progressPct = 100, desfazendo o CANCELLED gravado por stopExecution/emergencyStop. A mensagem 'Todas as conexões foram finalizadas' é exibida sem que isso aconteça.
- **Impacto:** O operador aciona a parada de emergência, mas o runner continua mandando requisições até o fim do alvo e o projeto pode aparecer como 'Concluído'. Isso contradiz o controle SEC-POL-02 ('abortar em menos de 1 segundo'), que o ComplianceEngine marca como COMPLIANT.
- **Evidência:** pentestRunner.ts:446-458: depois do for, 'return { status: 'COMPLETED', ...}' sem checar ctx.isAborted(); bloco WEB (204-320) sem 'isAborted'. pentestControlPlane.ts:732 'curProj.status = result.status;'. complianceEngine.ts:264-277 'pol-kill-switch' ... status: 'COMPLIANT'. securityTestSuite.ts:236 testa emergencyStop num projeto inexistente ('pnt-proj-01') e considera aprovado.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-333 · [ALTA] Aprovação de pentest pela interface é sempre negada (403), e por API qualquer um aprova declarando o papel no cabeçalho
- **Arquivo:** `server/security/pentestControlPlane.ts`
- **Localização:** approveProject linhas 461-542; server/securityRouter.ts getAuthContext linhas 47-56, requireRoles 59-93, rota /approve linha 381; src/components/security/PentestApprovalModal.tsx linhas 33-39
- **Categoria:** Falha de integração
- **Descrição:** O PentestApprovalModal chama /approve sem os cabeçalhos x-user-role/x-user-id. getAuthContext usa 'TECHNICIAN' como papel padrão, e requireRoles(['SECURITY_MANAGER','SECURITY_ADMIN','CISO','ADMIN','MANAGER']) não aceita TECHNICIAN (os aliases de SECURITY_MANAGER são MANAGER/CISO/ADMIN/SECURITY_ADMIN), então a interface recebe 403. Já um cliente que envie 'x-user-role: CISO' aprova qualquer projeto. approveProject também não impede que o próprio criador aprove (sem segregação de funções) e não valida a cobertura de escopo e alvos da autorização.
- **Impacto:** O fluxo DRAFT -> APPROVED pela interface fica travado, enquanto o controle de aprovação pode ser burlado por cabeçalho. A governança de 'aprovação pelo CISO' é ilusória.
- **Evidência:** securityRouter.ts:53 "role: (req.headers['x-user-role'] as string) \|\| 'TECHNICIAN'"; PentestApprovalModal.tsx:35 "headers: { 'Content-Type': 'application/json' }". Em security_persisted.json:6630-6640, o projeto pnt-mtw3rszv tem createdBy.userId 'usr-tech-01' e approvedBy.userId 'usr-tech-01' (mesma pessoa).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-334 · [ALTA] Avaliação de hardening é simulada: resultados fixos e telemetria fixa enviada pela interface
- **Arquivo:** `server/security/hardeningEngine.ts`
- **Localização:** evaluateTargetAgainstBaseline linhas 357-471; src/components/security/HardeningBaselinesView.tsx linhas 93-103
- **Categoria:** UI não implementada
- **Descrição:** Nenhum controle consulta o alvo de verdade. Todos os CONFIG_AUDIT (OS-LIN-001/002/003, DB-002) passam sempre. HTTP_PROBE: WEB-001 só checa se a string começa com 'https' e devolve um cabeçalho HSTS inventado; WEB-002 é sempre WARNING com texto fixo; API-002 sempre PASS com 'X-RateLimit-Limit: 100' inventado; API-001, API-003, WEB-003 e WEB-004 sempre PASS. PORT_SCAN: NET-001 sempre PASS ('Portas 21 e 23 fechadas na borda'), NET-002 e DB-001 sempre PASS, e NET-003 só procura ':22'/':3389' no texto do alvo. OS-LIN-004 passa sem verificar o auditd, EP-002 não checa o ping menor que 15 min, e EP-003 aprova Ubuntu 20.04 apesar de o requisito pedir 22.04 ou superior. Avisos por falta de telemetria valem 50% no score. A interface sempre envia a mesma telemetria fixa (openssl 1.1.1k vulnerável) para qualquer alvo.
- **Impacto:** Os relatórios de conformidade afirmam controles atendidos com valores 'observados' que nunca foram coletados (por exemplo, Telnet e FTP 'fechadas' mesmo quando o runner os encontrou abertos). Isso cria falsa sensação de segurança e evidência falsa em auditoria.
- **Evidência:** hardeningEngine.ts:446-450 "if (control.controlId === 'NET-001') { status = 'PASS'; actualValue = 'Portas 21 e 23 fechadas na borda';"; :467-470 "// CONFIG_AUDIT status = 'PASS'; passedCount++;"; :416 '// Simulação / Probe de Headers'; HardeningBaselinesView.tsx:93 '// Envia dados de ativo simulando telemetria de agente já coletada'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-335 · [ALTA] Testes anunciados nos perfis não existem no runner e resultados de caminhos sensíveis (.env, swagger) são descartados
- **Arquivo:** `server/security/pentestRunner.ts`
- **Localização:** linhas 338-379 (sensitivePaths), 534-547 (rejectUnauthorized:false), 129-199; pentestControlPlane.ts perfis linhas 100, 114, 128, 142
- **Categoria:** Bug / código incompleto
- **Descrição:** Os perfis anunciam TLS_AUDIT, HTTP_METHODS, AUTH_HEADER_CHECK, REDIRECT_SECURITY e BANNER_INSPECT, mas o runner não tem nada disso. Não há verificação de certificado nem de versão TLS (rejectUnauthorized: false, nenhum dado TLS é lido), o banner de porta nunca é lido (probe.banner sempre undefined) e o redirect só gera log. Em TESTE 3 o runner requisita /.env, /swagger-ui.html e /api/docs, mas só cria achado para /actuator, então um /.env exposto com status 200 é ignorado. O teste de /actuator considera qualquer 200, o que gera falso positivo em SPAs que devolvem index.html para qualquer rota.
- **Impacto:** Vulnerabilidades críticas, como um arquivo .env público com segredos ou um certificado expirado ou inválido, não são relatadas, enquanto o perfil diz que foram testadas. O relatório fica com falso negativo.
- **Evidência:** pentestRunner.ts:338 "const sensitivePaths = ['/actuator', '/swagger-ui.html', '/.env', '/api/docs'];" e :352 "if (checkRes.statusCode === 200 && sPath === '/actuator')"; :546 'rejectUnauthorized: false'; pentestControlPlane.ts:100 "enabledTests: ['PORT_PROBE', 'TLS_AUDIT', 'HEADERS_SECURITY', 'BANNER_INSPECT']".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-336 · [MÉDIA] Status 'EMERGENCY_STOPPED' é gravado no projeto, mas não existe em PentestProjectStatus nem na interface
- **Arquivo:** `server/security/pentestControlPlane.ts`
- **Localização:** launchPentest linha 732; emergencyStop linhas 870-876; pentestRunner.ts linha 95
- **Categoria:** Bug / código incompleto
- **Descrição:** O runner devolve 'EMERGENCY_STOPPED' quando o motivo contém 'EMERGENCY', e o IIFE grava esse valor em curProj.status. PentestProjectStatus só tem DRAFT/PENDING_APPROVAL/APPROVED/SCHEDULED/RUNNING/PAUSED/COMPLETED/CANCELLED/FAILED. Além disso, emergencyStop grava 'CANCELLED' no projeto e 'EMERGENCY_STOPPED' no estado em memória, que divergem. O compilador não acusa porque getStoreData() retorna any.
- **Impacto:** Na listagem o projeto aparece com o texto cru 'EMERGENCY_STOPPED' (default do switch) e o botão 'Ver Execução' some, pois a interface só o mostra para RUNNING/COMPLETED/CANCELLED. Projetos em FAILED também ficam sem acesso ao monitor.
- **Evidência:** pentestRunner.ts:95 "status: reason.includes('EMERGENCY') ? 'EMERGENCY_STOPPED' : 'CANCELLED'"; src/types/security.ts:342-351 (sem EMERGENCY_STOPPED); PentestProjectsView.tsx:255 "(proj.status === 'RUNNING' \|\| proj.status === 'COMPLETED' \|\| proj.status === 'CANCELLED')".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-337 · [MÉDIA] Isolamento de tenant ausente no control plane: parada, estado ao vivo e referências cruzadas
- **Arquivo:** `server/security/pentestControlPlane.ts`
- **Localização:** stopExecution linhas 817-821; emergencyStop 864-868; getExecutionState 901-903; launchPentest 595, 604, 610, 616; getProjectById 310-316; createProject 350-397
- **Categoria:** Segurança
- **Descrição:** Os Maps liveExecutions e executionAbortSignals são indexados só por projectId. stopExecution e emergencyStop marcam o sinal de aborto antes de verificar se o projeto é do tenant, e getExecutionState ignora o tenantId recebido. Autorização, RoE, perfil e alvos são buscados só por id, sem filtrar o tenant, e createProject não valida se os IDs referenciados existem ou pertencem ao tenant. stop e emergencyStop também não checam o status atual e sempre retornam true: cancelam projetos DRAFT ou COMPLETED, ou projetos inexistentes, e ainda gravam auditoria.
- **Impacto:** Um tenant consegue abortar ou monitorar (logs ao vivo com hosts e banners) execuções de outro tenant e montar projetos apontando para alvos e autorizações alheias. A API sempre responde sucesso, mesmo para projetos inexistentes.
- **Evidência:** pentestControlPlane.ts:817-821 'const signal = this.executionAbortSignals.get(projectId); if (signal) { signal.isAborted = true; ...}' antes da busca filtrada por tenant (linha 824); :901-902 'getExecutionState(tenantId, projectId) { return this.liveExecutions.get(projectId) \|\| null; }'; :595 'store.authorizations.find((a) => a.id === project.authorizationId)'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-338 · [MÉDIA] Auditoria de cookies analisa todos os Set-Cookie como uma única string
- **Arquivo:** `server/security/pentestRunner.ts`
- **Localização:** auditWebSecurity linhas 560-563; TESTE 4 linhas 406-414
- **Categoria:** Bug / código incompleto
- **Descrição:** auditWebSecurity junta os cabeçalhos em formato de array com ', ', inclusive set-cookie. Por isso 'Array.isArray(setCookie)' nunca é verdadeiro e todos os cookies viram um único item. As flags são procuradas por substring ('secure', 'httponly', 'samesite') no texto concatenado: basta um cookie ter Secure/HttpOnly para os outros parecerem protegidos, e nome ou valor contendo 'secure' também gera falso negativo.
- **Impacto:** Um cookie de sessão sem HttpOnly ou Secure passa despercebido sempre que outro cookie da mesma resposta tem a flag.
- **Evidência:** pentestRunner.ts:562 "headers[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : (v \|\| '');"; :408 'const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];'; :411 "const isSecure = lower.includes('secure');".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-339 · [MÉDIA] Execução sem limite total de tempo nem de tamanho e estado ao vivo só em memória: projetos presos em RUNNING
- **Arquivo:** `server/security/pentestRunner.ts`
- **Localização:** auditWebSecurity linhas 534-589; pentestControlPlane.ts linhas 32-33, 684-685, 699-800
- **Categoria:** Estabilidade
- **Descrição:** A opção 'timeout' de http.request é só de inatividade do socket. Um servidor que mande bytes devagar mantém a requisição viva para sempre, e o corpo inteiro é baixado (só o texto guardado é truncado em 2048). Não há timeout global da execução. O estado (liveExecutions) e os sinais de aborto ficam em Maps de memória que nunca são limpos. Se o servidor reiniciar durante uma execução, o projeto fica gravado como RUNNING para sempre: launchPentest recusa reexecução, getExecutionState devolve null e não existe rotina de recuperação. O runner roda no próprio processo do Express, apesar de se identificar como 'LOCAL_ISOLATED'/'IsolatedWorker'.
- **Impacto:** Um alvo malicioso ou lento pode manter a execução pendurada sem fim, e reinícios deixam projetos órfãos em 'Em Execução'. Há crescimento de memória ao longo do tempo e impacto direto na API principal.
- **Evidência:** pentestRunner.ts:545 'timeout: timeoutMs,' e :552-557 "res.on('data', chunk => { bytes += chunk.length; if (body.length < 2048) {...} })" sem req.destroy por limite; pentestControlPlane.ts:32 'private static liveExecutions: Map<string, PentestExecutionState> = new Map();' sem delete; :513 "runner: 'LOCAL_ISOLATED'".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-340 · [MÉDIA] Score de compliance fixo no catálogo, sem tenant e penalizando NOT_APPLICABLE
- **Arquivo:** `server/security/complianceEngine.ts`
- **Localização:** getInitialControls linhas 16-280; calculateFrameworkCompliance linhas 340-406; buildEvidenceMatrix linhas 291-334
- **Categoria:** Regra de negócio
- **Descrição:** O status de cada controle está fixo no catálogo (por exemplo, 'COMPLIANT' para Kill Switch, MFA e Gestão de Vulnerabilidades) e calculateFrameworkCompliance usa só esse campo, sem considerar achados abertos, avaliações de hardening ou remediações vencidas. NOT_APPLICABLE e NOT_ASSESSED entram com peso total e pontuação 0 (só COMPLIANT e PARTIALLY contam), um framework sem controles vale 100%, e assessedAt recebe new Date() na carga inicial. Os controles não têm tenantId (o tipo ComplianceControl também não), então o orquestrador compartilha e altera os mesmos controles para todos os tenants. Na matriz, todo achado CRITICAL é ligado ao OWASP-A01, seja qual for a categoria; 'control.description.includes(f.cveId)' nunca casa; hasGap só considera achados OPEN/NEW (ignora TRIAGED, CONFIRMED, REOPENED, IN_REMEDIATION); e lastEvidenceDate pega o primeiro item da lista, não o mais recente.
- **Impacto:** O percentual de conformidade exibido não reflete o ambiente real e pode marcar como conforme algo que o próprio runner mostrou falho. Controles não aplicáveis rebaixam o score indevidamente, e um tenant altera a conformidade de todos.
- **Evidência:** complianceEngine.ts:376-384 "if (c.status === 'COMPLIANT') {...} else if (c.status === 'PARTIALLY_COMPLIANT') { fEarned += c.scoreWeight * 0.5; }" (fWeight soma todos); :296 "(f.severity === 'CRITICAL' && control.code === 'OWASP-A01')"; securityOrchestrator.ts:1906 'this.store.complianceControls.find(c => c.id === controlId)' sem tenant; :1936 getComplianceFrameworkSummary ignora tenantId.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-341 · [MÉDIA] Findings de hardening incompletos geram score de risco NaN, códigos aleatórios e IDs que não existem
- **Arquivo:** `server/security/hardeningEngine.ts`
- **Localização:** linhas 474-495; server/security/securityOrchestrator.ts linhas 1520-1525 e 826; server/security/findingProcessor.ts linha 185
- **Categoria:** Bug / código incompleto
- **Descrição:** generatedFindings são Partial<SecurityFinding> sem riskScoreContribution, createdBy, evidência e fingerprint, e o orquestrador os insere em store.findings com um cast. Como FindingProcessor.calculateInfrastructureRiskScore soma f.riskScoreContribution sem fallback, o score geral de risco vira NaN quando existe um desses achados. O código 'SEC-FND-' + Math.random (10000-99999) pode colidir com a sequência do FindingProcessor (SEC-FND-00101...). A deduplicação por título+CI faz com que IDs devolvidos à interface (findingIdGenerated) não sejam gravados.
- **Impacto:** O dashboard de risco mostra NaN ou quebra depois de uma avaliação de hardening com falhas, há códigos de achado duplicados e a interface aponta para achados inexistentes.
- **Evidência:** hardeningEngine.ts:480 'code: `SEC-FND-${Math.floor(10000 + Math.random() * 90000)}`' sem riskScoreContribution no objeto (477-494); findingProcessor.ts:185 'scoreSum += f.riskScoreContribution * layerWeight * critWeight;'; securityOrchestrator.ts:1523 'this.store.findings.unshift(rawFnd as SecurityFinding);'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-342 · [MÉDIA] Plano de remediação ignora o SLA e tem dependências entre etapas quebradas
- **Arquivo:** `server/security/remediationEngine.ts`
- **Localização:** buildDefaultPlanSteps linhas 127-188; calculatePriority linhas 43-118
- **Categoria:** Regra de negócio
- **Descrição:** As etapas têm prazos fixos de +1, +3, +4 e +5 dias para qualquer severidade, enquanto o SLA do mesmo engine é 24h para CRITICAL e 720h para LOW. Num achado crítico, a correção vence em 3 dias e o reteste em 5, muito depois do SLA de 24h. As dependências apontam para 'step-01', 'step-02' e 'step-03', mas os IDs gerados são 'step-<uuid8>-01', então o grafo de dependências nunca resolve. A etapa 1 já nasce IN_PROGRESS. calculatePriority pode somar até 105 pontos, mas a justificativa diz 'Score ponderado: X/100'. A recomendação sempre recebe '...' no final, mesmo sem ser truncada.
- **Impacto:** Planos de remediação contradizem o SLA contratual, que é marcado como violado pelo próprio sistema, e qualquer tela que use dependencies para bloquear etapas não funciona.
- **Evidência:** remediationEngine.ts:156 'dueDate: addDays(baseDueDate, 3)' e :158 'dependencies: [`step-01`]' versus :139 'id: `step-${crypto.randomUUID().slice(0, 8)}-01`'; :19 "{ severity: 'CRITICAL', maxResolutionHours: 24, ...}".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-343 · [MÉDIA] Métricas do dashboard de remediação com valor inventado e contagens incorretas
- **Arquivo:** `server/security/remediationEngine.ts`
- **Localização:** calculateDashboardMetrics linhas 239-320
- **Categoria:** Regra de negócio
- **Descrição:** Quando não há achados resolvidos, o MTTR é fixado em 2,4 dias. overdueRemediations exclui só COMPLETED e VERIFIED, então remediações ACCEPTED_RISK e REJECTED entram como atrasadas. acceptedRisksCount usa status 'ACTIVE' sem checar validUntil (riscos expirados continuam aceitos). criticalFindings conta ACCEPTED_RISK, RISK_ACCEPTED e NOT_REPRODUCIBLE. A 'evolução de risco' de 7 dias aplica o status atual a datas passadas: um achado resolvido hoje some do histórico inteiro, o que não é série histórica.
- **Impacto:** O dashboard mostra MTTR fictício, atrasos de SLA inflados e uma tendência de risco que não corresponde ao passado, levando a decisões gerenciais erradas.
- **Evidência:** remediationEngine.ts:283 '... : 2.4;'; :265 "if (r.status === 'COMPLETED' \|\| r.status === 'VERIFIED') return false;"; :247 "a.status === 'ACTIVE'"; :295 "!fixedStatuses.includes(f.status)" aplicado a activeAtDate de dias anteriores.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-344 · [MÉDIA] Máquina de estados com status duplicados, atalhos que pulam o reteste e validação contornada pelo orquestrador
- **Arquivo:** `server/security/remediationEngine.ts`
- **Localização:** validateLifecycleTransition linhas 202-234; server/security/securityOrchestrator.ts createTicketForFinding linha 1132; server/security/findingProcessor.ts linhas 81 e 182
- **Categoria:** Regra de negócio
- **Descrição:** Há pares de status sinônimos (ACCEPTED_RISK/RISK_ACCEPTED, REMEDIATION/IN_REMEDIATION, FIXED_PENDING_RETEST/WAITING_RETEST, OPEN/NEW, VERIFIED/RESOLVED), tratados de forma diferente em cada módulo: FindingProcessor deduplica excluindo só RESOLVED e FALSE_POSITIVE, e o score de infraestrutura exclui RISK_ACCEPTED mas não ACCEPTED_RISK nem VERIFIED. WAITING_RETEST -> VERIFIED/RESOLVED é permitido sem passar por RETEST. createTicketForFinding define finding.status = 'IN_REMEDIATION' direto, sem chamar validateLifecycleTransition, e reabre achados VERIFIED ou FALSE_POSITIVE sem registrar a transição.
- **Impacto:** Achados com risco aceito continuam pesando no score, achados verificados podem ser 'reabertos' por duplicação, e é possível fechar vulnerabilidades sem reteste, o que contraria o controle CIS-07.1 declarado como conforme.
- **Evidência:** remediationEngine.ts:214 "WAITING_RETEST: ['RETEST', 'VERIFIED', 'RESOLVED', ...]"; securityOrchestrator.ts:1132 "finding.status = 'IN_REMEDIATION';"; findingProcessor.ts:182 "f.status === 'RESOLVED' \|\| f.status === 'FALSE_POSITIVE' \|\| f.status === 'RISK_ACCEPTED'".
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-345 · [MÉDIA] Achado já existente detectado de novo não é vinculado ao novo projeto de pentest
- **Arquivo:** `server/security/pentestControlPlane.ts`
- **Localização:** launchPentest linhas 747-767; getProjectById linha 316
- **Categoria:** Banco de dados
- **Descrição:** Quando FindingProcessor marca o achado como duplicado, o control plane não grava processed.finding nem atualiza o existente (pentestId, updatedAt), mas grava a evidência apontando para o ID antigo. Como getProjectById filtra achados por f.pentestId === projectId, o novo projeto não mostra as vulnerabilidades que reencontrou. O contador da execução, porém, as inclui.
- **Impacto:** O detalhe do projeto mostra 0 achados apesar de a execução reportar N, e o relatório por projeto fica incompleto.
- **Evidência:** pentestControlPlane.ts:757-760 'if (!processed.isDuplicate) { updatedStore.findings.unshift(processed.finding); } updatedStore.evidence.unshift(processed.evidence);'; :316 '(store.findings \|\| []).filter((f) => f.pentestId === projectId)'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-346 · [MÉDIA] Dados de demonstração com autorização 'assinada' e projetos aprovados são recriados a cada listagem
- **Arquivo:** `server/security/pentestControlPlane.ts`
- **Localização:** initializeDefaults linhas 85-294; chamada em listProjects/getProjectById/listProfiles/listRoEs/listAuthorizations/createProject
- **Categoria:** Regra de negócio
- **Descrição:** initializeDefaults roda em toda consulta e, se as coleções estiverem vazias, recria para 'tenant-demo' (o tenant padrão do router): uma autorização APPROVED com hash de documento fictício e texto 'assinada juridicamente', contatos e CISO fictícios ('Dra. Helena Valente', @empresaabc.com.br) e projetos já APPROVED/COMPLETED. Não existe API para cadastrar autorizações, RoE ou perfis reais (o router só lista), então a única autorização disponível é a semente, válida até 2026-12-31 e cobrindo uma URL externa *.run.app.
- **Impacto:** O sistema apresenta evidência legal fabricada como real e permite lançar pentests sob uma autorização que ninguém assinou. Também não dá para registrar autorizações verdadeiras pela aplicação.
- **Evidência:** pentestControlPlane.ts:212 "notes: 'Autorização formal assinada juridicamente sob o termo de auditoria de conformidade ISO 27001.'"; :213 "documentEvidenceHash: '9e8d7c6b5a4f3e2d1c0b9a8f...'"; :299 'this.initializeDefaults();' em listProjects; securityRouter.ts expõe só GET /security/pentest/authorizations, /roe e /profiles.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-347 · [BAIXA] Código do projeto gerado por contagem global com ano fixo: códigos PNT duplicados
- **Arquivo:** `server/security/pentestControlPlane.ts`
- **Localização:** createProject linhas 369-371
- **Categoria:** Bug / código incompleto
- **Descrição:** O código é `PNT-2026-${count+1}`, com count = total de projetos de todos os tenants e ano fixo em 2026. Se o total não cresce (projeto perdido ou sobrescrito), o mesmo código é reemitido. O id usa Date.now() em base36 e pode colidir em chamadas no mesmo milissegundo.
- **Impacto:** Códigos de projeto duplicados prejudicam a rastreabilidade e a auditoria, e em 2027 os códigos continuarão saindo com 2026.
- **Evidência:** pentestControlPlane.ts:369-370 'const count = (store.pentestProjects \|\| []).length + 1; const code = `PNT-2026-${...}`'; a auditoria em security_persisted.json:6456-6520 registra 4 criações (pnt-mtw3pqv5, q5fq, qpl7, rszv) todas com 'PNT-2026-0003', e só pnt-mtw3rszv existe em pentestProjects.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-348 · [BAIXA] I/O síncrono do arquivo JSON inteiro em toda requisição do control plane, com gravação não atômica
- **Arquivo:** `server/security/pentestControlPlane.ts`
- **Localização:** getStoreData linhas 36-66; saveStoreData linhas 68-82; initializeDefaults linha 86
- **Categoria:** Desempenho
- **Descrição:** Cada listagem chama initializeDefaults (lê e parseia o arquivo) e depois getStoreData (lê e parseia de novo), com readFileSync num arquivo de cerca de 11 mil linhas. saveStoreData relê o arquivo e regrava tudo com writeFileSync direto no destino, sem arquivo temporário nem rename, e com dois módulos gravando o mesmo arquivo.
- **Impacto:** O event loop do Express bloqueia a cada consulta de segurança, e um travamento durante a gravação pode corromper o arquivo, que cai nos defaults vazios.
- **Evidência:** pentestControlPlane.ts:299-300 'this.initializeDefaults(); const store = this.getStoreData();'; :78 'fs.writeFileSync(PERSISTED_FILE, JSON.stringify(toSave, null, 2), 'utf-8');'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-349 · [BAIXA] Parâmetros de SLA e do plano de execução definidos mas nunca usados
- **Arquivo:** `server/security/remediationEngine.ts`
- **Localização:** defaultSlaPolicies linhas 17-24; pentestControlPlane.ts approveProject linhas 498-525
- **Categoria:** Desconectado
- **Descrição:** escalationRole e warningThresholdPct das políticas de SLA não são lidos em nenhum lugar do servidor (não há aviso nem escalonamento), e o comentário 'configurável por tenant' não tem implementação. O ExecutionPlan gerado em approveProject usa limites fixos (maxRps 5, maxTotalRequests 3000), enquanto o plano criado em launchPentest usa os da RoE. Nenhum dos dois é lido pelo runner (plan.limits, executionWindow e priorities não são usados).
- **Impacto:** As telas mostram limites, janelas e escalonamento que não têm efeito, e a configuração percebida diverge do comportamento real.
- **Evidência:** A busca por 'warningThresholdPct' em server/ só encontra remediationEngine.ts:19-23; pentestControlPlane.ts:515-520 'limits: { maxRps: 5, timeoutMs: 4000, maxConcurrency: 2, maxTotalRequests: 3000 }'; pentestRunner.ts não referencia ctx.plan.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-350 · [BAIXA] Métricas de progresso e tráfego da execução são estimativas falsas
- **Arquivo:** `server/security/pentestRunner.ts`
- **Localização:** linhas 84, 138-143; pentestControlPlane.ts linhas 671, 744-771
- **Categoria:** Bug / código incompleto
- **Descrição:** testsTotal é calculado como alvos × 4, mas testsExecuted soma cerca de 15 por alvo (9 portas + 1 web + 4 caminhos + 1 sessão), então executados passa do total. bytesTransferred soma 256 fixos por porta. findingsCount só é preenchido no fim, e durante a execução o monitor mostra zero achados apesar dos logs SECURITY.
- **Impacto:** O monitor em tempo real mostra contadores incoerentes (por exemplo 15/4 testes) e volume de tráfego inventado.
- **Evidência:** pentestRunner.ts:143 'bytesTransferred += 256;'; pentestControlPlane.ts:671 'testsTotal: targets.length * 4,'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

### 6.17 Segurança/Pentest — relatórios, ponte de integração, suítes

_Forma de exame: Manual (verificação dirigida) — 2 achados._

#### A-351 · [ALTA] Tickets criados pela ponte de segurança são sobrescritos pelo CMDB (dois gravadores no mesmo JSON)
- **Arquivo:** `server/security/securityIntegrationBridge.ts`
- **Localização:** saveCmdbTickets L64-80; server/cmdbRouter.ts saveStore L844-851 (store em memória)
- **Categoria:** Falha de integração
- **Descrição:** A ponte lê o cmdb_persisted.json do disco, acrescenta tickets e grava. O cmdbRouter mantém o store em memória, carregado uma vez, e o regrava inteiro em qualquer mutação (heartbeat, CI etc.), descartando esses tickets. GET /cmdb/tickets lê só a memória e nunca os mostra.
- **Impacto:** Tickets de remediação abertos a partir de achados de segurança somem, e a integração Segurança-CMDB não funciona de fato.
- **Evidência:** fs.writeFileSync(CMDB_PERSIST_FILE, ...) na ponte; cmdbRouter saveStore(store) grava o objeto em memória.
- **Verificação:** CONFIRMADO (manual)

#### A-352 · [BAIXA] Duas rotas diferentes para criar ticket a partir de um achado
- **Arquivo:** `server/securityRouter.ts`
- **Localização:** L264 POST /security/findings/:id/create-ticket x L985 POST /security/findings/:id/ticket
- **Categoria:** Duplicado / obsoleto
- **Descrição:** Duas implementações paralelas (orquestrador e ponte de integração) para a mesma operação. A UI usa só /create-ticket.
- **Impacto:** Comportamento divergente conforme o caminho e manutenção duplicada.
- **Evidência:** Rotas nas linhas 264 e 985.
- **Verificação:** CONFIRMADO (manual)

### 6.18 Segurança/Pentest — interface (dashboards, compliance, remediação)

_Forma de exame: Agente (leitura integral) — 21 achados._

> **Estado do módulo:** Fatia S19 (UI de Segurança/Pentest): SecurityModule orquestra 13 sub-abas e carrega, ao montar, 6 endpoints de /api/v1/security/*; as views Executiva, Compliance, Hardening, Remediação e Observabilidade fazem cada uma os próprios fetches para o securityRouter, que delega ao SecurityOrchestrator, com persistência em src/data/security_persisted.json (arquivo JSON versionado no git, sem Supabase). Os paths e métodos chamados pela UI existem todos no router. O contrato de dados, porém, diverge em pontos graves. O mais grave é a aba Compliance & GRC: /compliance/summary devolve um objeto {overallCompliancePct, frameworkScores}, mas a tela espera um array; e /compliance/matrix não traz linkedFindings, controlTitle nem hasRecentEvidence. Por isso a tela dispara TypeError no render e, como não existe ErrorBoundary em src/, a aplicação inteira é desmontada. Boa parte do que aparece como medição real é simulada ou fixa: a telemetria enviada na avaliação de hardening vem chumbada no front, e o HardeningEngine não faz probes reais. O health de observabilidade é composto de constantes HEALTHY, e a suíte de "16 checks" contém testes tautológicos. Além disso, um GET dessa suíte executa emergencyStop real no projeto pnt-proj-01. Nos dashboards, 'monitoredAssetsCount: 14', 'mttrDays: 4.8', 'fixRatePct 50' e a criticidade 'CRITICA' são valores fixos. Os contadores de status ignoram os sinônimos que o próprio backend grava (OPEN, FIXED_PENDING_RETEST, VERIFIED, REMEDIATION), o que dá números de vulnerabilidades ativas e de retestes pendentes incorretos. Em segurança, nenhuma chamada da UI envia identidade: o servidor assume tenant-demo, 'Carlos Amorim' e TECHNICIAN pelos headers x-user-*, que o cliente controla. Assim, aceite de risco, edição de controles de compliance e etapas de remediação não têm RBAC nem segregação de funções, e a trilha de auditoria fica com um ator fictício. Também não há tratamento de erro visível: falhas de fetch deixam os spinners infinitos ou são silenciosas. Há ainda muito código morto (estados e imports não usados, sub-abas declaradas e não renderizadas) e duplicação de regras (tabela de SLA fixa na UI, sinônimos de status nos tipos).

#### A-353 · [CRÍTICA] Aba Compliance & GRC quebra a aplicação: contrato de /compliance/summary e /compliance/matrix incompatível com a UI
- **Arquivo:** `src/components/security/ComplianceAssessmentView.tsx`
- **Localização:** loadComplianceData L58-66; render summaries.map L223; filteredMatrix L137-144; item.linkedFindings.length L333; item.hasRecentEvidence L358; item.controlTitle L142/L323
- **Categoria:** Falha de integração
- **Descrição:** A view trata a resposta de /api/v1/security/compliance/summary como ComplianceFrameworkSummary[], mas o servidor (SecurityOrchestrator.getComplianceFrameworkSummary -> ComplianceEngine.calculateFrameworkCompliance) devolve um objeto { overallCompliancePct, frameworkScores } cujos itens usam compliantPct/passed/total/code, e não compliancePct/totalControls/compliantCount/partiallyCompliantCount/nonCompliantCount. Os itens da matriz (ComplianceEngine.buildEvidenceMatrix) trazem title, findingsCount e isExpiredEvidence, mas não controlTitle, linkedFindings, hasRecentEvidence, gapDescription nem actionPlan, que a UI lê.
- **Impacto:** Depois do carregamento, 'summaries.map' lança 'summaries.map is not a function' e 'item.linkedFindings.length' lança TypeError. Não existe ErrorBoundary em src/ (o grep não encontrou nenhum), então o React desmonta a árvore inteira e o usuário fica com tela em branco ao abrir Compliance & GRC. A busca por título também lançaria erro, a evidência apareceria sempre como 'Desatualizada' e o gap como '⚠️ undefined'.
- **Evidência:** View: `if (sRes.success) setSummaries(sRes.data);` e depois `{summaries.map(sum => (`. Servidor complianceEngine.ts L402-405: `return { overallCompliancePct, frameworkScores };`. Matriz no servidor, L321-333: `return { controlId, controlCode, framework: control.frameworkCode, title: control.title, status, evidenceCount, findingsCount, openRemediationsCount, lastEvidenceDate, isExpiredEvidence, gapIdentified }` (sem linkedFindings/controlTitle). View L333: `{item.linkedFindings.length === 0 ? (`.
- **Verificação:** CONFIRMADO (conferido manualmente)

#### A-354 · [ALTA] Botão 'Executar Suíte de Testes' cancela um pentest real (emergencyStop) via GET e grava auditoria com ator fictício
- **Arquivo:** `src/components/security/SecurityObservabilityView.tsx`
- **Localização:** runSecurityTests L51-64 (GET /api/v1/security/test-suite/run); server/security/securityTestSuite.ts SEC-TEST-10 L231-247; pentestControlPlane.ts emergencyStop L857-897
- **Categoria:** Segurança
- **Descrição:** A UI chama um GET que roda SecurityTestSuite.runAllTests(). O caso SEC-TEST-10 chama PentestControlPlane.emergencyStop('tenant-demo','pnt-proj-01', ...) de verdade. Isso aborta o sinal de execução, muda o projeto para CANCELLED, persiste o store e registra auditoria PENTEST_EMERGENCY_STOP_TRIGGERED em nome de 'Helena Valente' (CISO fictícia). A rota não tem RBAC.
- **Impacto:** Um clique de 'teste' cancela e interrompe a execução do projeto pnt-proj-01, se ele existir ou estiver rodando, corrompendo seu estado. A trilha de auditoria recebe eventos críticos falsos atribuídos a um CISO inexistente. O efeito colateral vem de um GET sem autenticação.
- **Evidência:** securityTestSuite.ts L233-236: `const mockUser = { id: 'usr-ciso-01', name: 'Helena Valente', ... role: 'CISO' }; const stopped = PentestControlPlane.emergencyStop('tenant-demo', 'pnt-proj-01', 'Teste automatizado de Kill Switch', mockUser);`. pentestControlPlane.ts L873-876: `proj.status = 'CANCELLED'; ... this.saveStoreData(store);`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-355 · [ALTA] Painel de Observabilidade e suíte de testes exibem conformidade fabricada (status fixos e testes tautológicos)
- **Arquivo:** `src/components/security/SecurityObservabilityView.tsx`
- **Localização:** Cards L124-275 (textos fixos 'Anti-SSRF: ENFORCED', 'Dead Letter: 0', 'Rate Limiting: ENFORCED', 'Kill Switch ATIVO (< 1s)'); lista 'Proteções Ativas' L404-427; server/security/securityHealth.ts L54-127; securityTestSuite.ts SEC-TEST-01/02/09/11/15 e complianceDeclaration L353
- **Categoria:** UI não implementada
- **Descrição:** Todos os componentes de health são constantes ('HEALTHY', latencyMs 1/2). Vários testes da suíte comparam valores fixos no próprio código: RBAC usa `viewerAllowedToApprove = false`, rate limit usa `requestTimes.length < 20`, idempotência retorna `passed: true` e autenticação valida um mockUser. A declaração 'Aprovado conforme diretrizes CIS Controls v8, OWASP WSTG v4.2 e NIST CSF 2.0' é devolvida mesmo quando há falhas. A UI ainda afirma 'Rate Limiting: 60 req/min por rota', 'Headers: CSP', 'Multi-Tenancy: 100% de tabelas com tenant_id' e 'RBAC Check → Tenant Validation'. Na prática, apiRateLimit só é aplicado em /pentest/projects/:id/launch (10/min); a CSP do server.ts permite 'unsafe-inline' 'unsafe-eval' http: https: e frame-ancestors *; e não existe autenticação no /api/v1.
- **Impacto:** Gestores e auditores recebem evidência falsa de hardening, isolamento e RBAC, o que pode levar a decisões de compliance erradas e mascarar as falhas reais de autenticação e autorização.
- **Evidência:** securityHealth.ts L68: `status: runningProjects.length > 0 ? 'HEALTHY' : 'HEALTHY'`. securityTestSuite.ts L86-87: `const viewerAllowedToApprove = false; const managerAllowedToApprove = true;`, L318: `passed: true,`. securityRouter.ts: apiRateLimit aparece apenas na L411. server.ts L28: `default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: ... frame-ancestors *;`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-356 · [ALTA] UI não envia identidade nem tenant: todas as ações são atribuídas ao usuário padrão do servidor e o RBAC é contornável por header
- **Arquivo:** `src/components/security/RemediationDashboardView.tsx`
- **Localização:** Todos os fetch das views da fatia: RemediationDashboardView L71-76/L97/L123; ComplianceAssessmentView L58-61/L91; HardeningBaselinesView L56-59/L87; ExecutiveDashboardView L46/L65; SecurityObservabilityView L38/L54; SecurityModule L74-81; server/securityRouter.ts getAuthContext L47-56 e requireRoles L59-94
- **Categoria:** Segurança
- **Descrição:** Nenhuma chamada da fatia envia token ou headers de identidade. O servidor deriva tenant, usuário e papel apenas dos headers x-tenant-id/x-user-*, com default 'tenant-demo' / 'Carlos Amorim' / 'TECHNICIAN'. Qualquer cliente pode mandar 'x-user-role: ADMIN' e passar no requireRoles. Também não existe middleware de autenticação em /api/v1 (server.ts L41 monta o router sem nenhuma verificação).
- **Impacto:** Aceite de risco, alteração de controles de compliance, conclusão de etapas de remediação e geração de relatórios executivos ficam registrados na trilha 'HMAC' como 'Carlos Amorim', o que destrói a rastreabilidade. Qualquer pessoa com acesso à porta 3000 lê e altera dados de vulnerabilidades e escala privilégio trivialmente.
- **Evidência:** securityRouter.ts L48-53: `const tenantId = (req.headers['x-tenant-id'] as string) \|\| 'tenant-demo'; ... name: (req.headers['x-user-name'] as string) \|\| 'Carlos Amorim', ... role: (req.headers['x-user-role'] as string) \|\| 'TECHNICIAN'`. Views: `fetch('/api/v1/security/accepted-risks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, ...` sem identidade.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-357 · [ALTA] Risco aceito é autoaprovado pelo solicitante, sem RBAC e sem expiração, e a UI exibe 'Aprovado por CISO'
- **Arquivo:** `src/components/security/RemediationDashboardView.tsx`
- **Localização:** Badge L509-511; handleSaveAcceptedRisk L115-150; seletor de findings L742-748; server/securityRouter.ts POST /security/accepted-risks L569-586; securityOrchestrator.createAcceptedRisk L1363-1421
- **Categoria:** Regra de negócio
- **Descrição:** A rota POST /security/accepted-risks não tem requireRoles. O orquestrador preenche approvedBy com o próprio solicitante e usa como papel 'CISO / Comitê de Segurança' quando nada é enviado. A UI mostra o selo fixo 'Aprovado por CISO'. Não há validação de validUntil no futuro, e nenhum código muda o registro para EXPIRED: o grep por 'EXPIRED' no server não encontra transição para accepted risks. O seletor também deixa escolher findings que já estão em ACCEPTED_RISK ou FALSE_POSITIVE, o que permite registros duplicados.
- **Impacto:** Qualquer usuário (até anônimo) consegue tirar uma vulnerabilidade crítica do fluxo de remediação, que vira ACCEPTED_RISK e muda a remediação vinculada, sem aprovação independente. O aceite nunca vence, o que quebra a governança de risco e a segregação de funções.
- **Evidência:** securityOrchestrator.ts L1392-1397: `approvedBy: { userId: user.id, userName: user.name, ..., role: data.approvedByRole \|\| 'CISO / Comitê de Segurança', ...}` e L1409 `finding.status = 'ACCEPTED_RISK';`. UI L510: `<CheckCircle2 .../> Aprovado por CISO`. Filtro L743: `.filter(f => f.status !== 'RESOLVED' && f.status !== 'VERIFIED')`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-358 · [ALTA] Avaliação de Hardening usa telemetria fixa no front e motor sem probes reais
- **Arquivo:** `src/components/security/HardeningBaselinesView.tsx`
- **Localização:** handleRunEvaluation L87-105; texto do modal L343-347; server/security/hardeningEngine.ts evaluateTargetAgainstBaseline L363-471
- **Categoria:** UI não implementada
- **Descrição:** Para qualquer alvo, o front envia assetData fixo (Ubuntu 22.04, agente online v4.2.1, openssl 1.1.1k 'vulnerable'). No servidor, os controles HTTP_PROBE, PORT_SCAN e CONFIG_AUDIT não fazem nenhuma requisição: retornam PASS/WARNING fixos ou inspecionam a string do alvo (por exemplo, `target.value.includes(':22')`). Ainda assim, o modal promete 'Serão executados probes direcionados nas portas, cabeçalhos HTTP/TLS e dados de telemetria cadastrados'.
- **Impacto:** Toda avaliação de baseline com o controle EP-001 gera um finding falso de 'software vulnerável' (openssl) e um % de conformidade inventado, que é persistido e alimenta Security Score, findings e dashboards executivos.
- **Evidência:** View L93-102: `// Envia dados de ativo simulando telemetria de agente já coletada ... { name: 'openssl', version: '1.1.1k', status: 'vulnerable' }`. hardeningEngine.ts L430-435: `} else if (control.controlId === 'WEB-002') { status = 'WARNING'; actualValue = 'X-Frame-Options presente; Content-Security-Policy ausente';`, L446-450: `status = 'PASS'; actualValue = 'Portas 21 e 23 fechadas na borda';`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-359 · [ALTA] Métricas de status/severidade do dashboard ignoram os sinônimos de status gravados pelo próprio backend
- **Arquivo:** `src/components/security/SecurityDashboardView.tsx`
- **Localização:** Cards 'Achados por Severidade' L137-154 e 'Remediação & Tickets' L158-187; server/security/securityOrchestrator.ts getDashboardMetrics L811-824; src/types/security.ts FindingStatus L8-24
- **Categoria:** Regra de negócio
- **Descrição:** FindingStatus tem sinônimos (OPEN/NEW, REMEDIATION/IN_REMEDIATION, FIXED_PENDING_RETEST/WAITING_RETEST/RETEST, VERIFIED/RESOLVED, ACCEPTED_RISK/RISK_ACCEPTED), e o backend grava variantes diferentes: hardening grava 'OPEN', a remediação 'FIXED_PENDING_RETEST' e o reteste 'VERIFIED'/'REMEDIATION'/'REOPENED'. getDashboardMetrics só conta NEW\|CONFIRMED como abertos, IN_REMEDIATION como em correção, WAITING_RETEST como aguardando reteste e RESOLVED como resolvidos. Nas contagens de severidade, só RESOLVED é excluído, então VERIFIED, FALSE_POSITIVE e ACCEPTED_RISK aparecem como ativos.
- **Impacto:** Os cards 'Novas/Pendentes', 'Aguardando Reteste' e 'resolvidas' ficam subcontados (por exemplo, remediações concluídas nunca aparecem como aguardando reteste), e as vulnerabilidades críticas e altas ficam supercontadas. Também divergem do RemediationEngine, que considera todos os sinônimos.
- **Evidência:** securityOrchestrator.ts L812: `critical: findings.filter(f => f.severity === 'CRITICAL' && f.status !== 'RESOLVED').length`, L820-823: `open: ... f.status === 'NEW' \|\| f.status === 'CONFIRMED' ... waitingRetest: ... f.status === 'WAITING_RETEST' ... resolved: ... f.status === 'RESOLVED'`. L1314: `finding.status = 'FIXED_PENDING_RETEST';`. retestEngine.ts L146: `finding.status = 'VERIFIED';`. remediationEngine.ts L251: `retestStatuses = ['FIXED_PENDING_RETEST', 'WAITING_RETEST', 'RETEST']`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-360 · [MÉDIA] Dashboards exibem valores fixos e defaults inventados como métricas reais
- **Arquivo:** `src/components/security/ExecutiveDashboardView.tsx`
- **Localização:** Card MTTR L232-235; Fix Rate L222; fatores L250-298; SecurityDashboardView 'Superfície de Ataque' L197-201 e Top CIs L238-253; server securityOrchestrator.ts getDashboardMetrics L838-851, calculateSecurityScore L1973/L1987, getExecutiveDashboardData L2057/L2106/L2125/L2140
- **Categoria:** UI não implementada
- **Descrição:** No servidor: monitoredAssetsCount: 14 e criticalAssetsCount: 4 são fixos; criticality: 'CRITICA' é igual para todo CI; o nome de CI vem de mapa fixo ('Servidor de Aplicação ERP Totvs'); highestSeverity é a primeira severidade encontrada, não a maior; mttrDays: 4.8 é fixo; fixRatePct vale 50 quando não há remediações; remediationScore vale 80 e criticalAssetProtection 95 por padrão; slaStatus é 'ON_TRACK' e riskDelta 0 fixos. A UI exibe tudo como medição real.
- **Impacto:** O Security Score corporativo e os KPIs executivos não refletem o ambiente. Um tenant sem dados recebe score alto e nota boa, e o MTTR exibido nunca muda.
- **Evidência:** securityOrchestrator.ts L850-851: `monitoredAssetsCount: 14, criticalAssetsCount: 4,`; L842: `criticality: 'CRITICA',`; L2140: `mttrDays: 4.8,`; L2057: `: 50;`; L1973: `: 80;`; L1987: `: 95;`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-361 · [MÉDIA] Indicadores homônimos com cálculos diferentes entre abas (Risk Score, Fix Rate, MTTR)
- **Arquivo:** `src/components/security/ExecutiveDashboardView.tsx`
- **Localização:** ExecutiveDashboardView L196-199 (faixas <25/<50) vs SecurityDashboardView L49-53 (>=70/>=40); RemediationDashboardView KPIs L257-275; server getExecutiveDashboardData L2057/L2140 vs remediationEngine.calculateDashboardMetrics L271-283
- **Categoria:** Regra de negócio
- **Descrição:** 'Risk Score Global' é 100 - securityScore no executivo, mas FindingProcessor.calculateInfrastructureRiskScore(findings,'datacenter','alta',true) na Visão Geral, e cada tela usa faixas de rótulo diferentes. 'Fix Rate' no executivo é calculado sobre remediações (default 50); na aba Remediação, sobre findings (default 0). 'MTTR' é 4.8 fixo no executivo e calculado (default 2.4) na Remediação.
- **Impacto:** O mesmo indicador aparece com valores e classificações diferentes em abas vizinhas (por exemplo, 45 = 'CRÍTICO' no executivo e 'MODERADO' na visão geral), o que derruba a confiança nos relatórios.
- **Evidência:** Executive L199: `{data.overallRiskScore < 25 ? 'BAIXO' : data.overallRiskScore < 50 ? 'MODERADO' : 'CRÍTICO'}`. Dashboard L50-51: `if (score >= 70) ... 'CRÍTICO' ... if (score >= 40) ... 'MODERADO'`. securityOrchestrator.ts L826 vs L2012 `const overallRiskScore = Math.max(0, Math.min(100, 100 - score));`. remediationEngine.ts L283: `: 2.4;`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-362 · [MÉDIA] Controles de compliance são globais (sem tenant) e o PATCH aceita qualquer campo (mass assignment)
- **Arquivo:** `src/components/security/ComplianceAssessmentView.tsx`
- **Localização:** handleSaveControl L86-112; server/securityRouter.ts L867-875; securityOrchestrator.listComplianceControls L1893-1895, updateComplianceControl L1900-1918, getComplianceFrameworkSummary L1935-1938
- **Categoria:** Segurança
- **Descrição:** listComplianceControls e getComplianceFrameworkSummary ignoram tenantId, e ComplianceControl nem tem tenantId. updateComplianceControl faz Object.assign(control, req.body) sem whitelist e sem RBAC. Por isso qualquer chamada pode sobrescrever id, frameworkCode, scoreWeight ou status, afetando todos os tenants. Um controle inexistente gera 500 em vez de 404.
- **Impacto:** Um usuário de um tenant altera a conformidade de todos os outros. Mudar scoreWeight ou status manipula o Security Score executivo de todos, e não existe isolamento multi-tenant nessa entidade.
- **Evidência:** securityOrchestrator.ts L1894: `return this.store.complianceControls \|\| [];`, L1906: `this.store.complianceControls.find(c => c.id === controlId);`, L1910: `Object.assign(control, patch);`. Router L870: `updateComplianceControl(tenantId, req.params.id, req.body, user)`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-363 · [MÉDIA] Alternar etapa de remediação aceita body arbitrário e não reverte estados derivados (pode reabrir aceite de risco/verificado)
- **Arquivo:** `src/components/security/RemediationDashboardView.tsx`
- **Localização:** handleToggleStep L93-113; server securityOrchestrator.updateRemediationStep L1292-1322; rota PATCH /security/remediations/:id/steps/:stepId L521-530
- **Categoria:** Regra de negócio
- **Descrição:** O servidor aplica Object.assign(step, req.body) sem validação nem RBAC. Quando todas as etapas ficam COMPLETED, a remediação vai para WAITING_RETEST e o finding para FIXED_PENDING_RETEST, inclusive se a remediação estava ACCEPTED_RISK ou VERIFIED, já que só COMPLETED é verificado. Ao desmarcar uma etapa (COMPLETED -> IN_PROGRESS), nada volta atrás, e completedAt nunca é preenchido.
- **Impacto:** Marcar e desmarcar etapas leva findings com risco aceito ou já verificados de volta para 'aguardando reteste' enquanto o registro de risco aceito continua ACTIVE. Também é possível alterar campos como responsible ou dueDate por PATCH sem trilha adequada.
- **Evidência:** securityOrchestrator.ts L1305: `Object.assign(step, updates);` e L1309-1315: `if (allCompleted && rem.status !== 'COMPLETED') { rem.status = 'WAITING_RETEST'; ... finding.status = 'FIXED_PENDING_RETEST';`. UI L95: `const newStatus = step.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-364 · [MÉDIA] Falhas de API deixam spinner infinito ou são silenciosas (sem estado de erro)
- **Arquivo:** `src/components/security/ExecutiveDashboardView.tsx`
- **Localização:** ExecutiveDashboardView L43-56 e L88-96; SecurityDashboardView L37-44; SecurityModule loadData L71-94; ComplianceAssessmentView L55-72/L101-110; RemediationDashboardView L68-87/L103-107; SecurityObservabilityView L35-64
- **Categoria:** Estabilidade
- **Descrição:** Os fetches usam Promise.all com .then(r => r.json()) sem checar res.ok e só tratam `json.success`, sem ramo de erro. No Executivo e na Visão Geral, se o fetch falhar ou success for false, `data`/`metrics` continuam null e a condição `loading \|\| !data` mostra 'Carregando...' para sempre. Um único endpoint com erro (por exemplo, um 500 que devolve HTML) derruba o Promise.all inteiro do SecurityModule e da Remediação. As falhas ao salvar controle, etapa ou relatório não dão nenhum retorno ao usuário.
- **Impacto:** O usuário não sabe se o sistema está fora do ar ou carregando. Falhas parciais escondem todos os dados da aba, e saves que falham parecem não fazer nada.
- **Evidência:** Executive L48-50: `if (json.success) { setData(json.data); }` sem else; L88: `if (loading \|\| !data) { return (... 'Carregando Painel Executivo & Indicadores...'`. SecurityModule L74-81: `Promise.all([ fetch(...).then(r => r.json()), ...])`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-365 · [MÉDIA] Navegação 'Ver vulnerabilidades deste CI' descarta o ciId; abas 'Ver findings do scan' também não filtram
- **Arquivo:** `src/components/security/SecurityModule.tsx`
- **Localização:** handleSelectCIFromDashboard L106-108; onViewScanFindings L389-391; SecurityDashboardView botão L255-261
- **Categoria:** Bug / código incompleto
- **Descrição:** O botão de cada CI chama onSelectCI(ci.ciId), mas o handler só troca a aba para 'findings' e ignora o parâmetro. O mesmo ocorre com onViewScanFindings(scanId). O servidor aceita o filtro ciId em GET /security/findings (securityRouter L224, listFindings L884), só que a UI nunca o envia.
- **Impacto:** O usuário cai na lista completa de vulnerabilidades em vez das do CI ou scan clicado, e a função prometida no tooltip 'Ver vulnerabilidades deste CI' não funciona.
- **Evidência:** SecurityModule L106-108: `const handleSelectCIFromDashboard = (ciId: string) => { setCurrentTab('findings'); };` e L389-391: `onViewScanFindings={(scanId) => { setCurrentTab('findings'); }}`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-366 · [MÉDIA] Exportação CSV da Matriz de Compliance gera colunas vazias e usa encodeURI (truncamento com '#')
- **Arquivo:** `src/components/security/ComplianceAssessmentView.tsx`
- **Localização:** handleExportCSV L114-134; modal L413
- **Categoria:** Bug / código incompleto
- **Descrição:** O CSV usa c.framework e c.evidenceCount de ComplianceControl, mas os objetos do servidor têm frameworkCode e não têm evidenceCount, então as colunas 'Framework' e 'Evidências' saem 'undefined'. O conteúdo vai para uma data URI via encodeURI, que não codifica '#': qualquer '#' em gap ou plano de ação trunca o arquivo. O modal de edição também mostra editingControl.framework (vazio).
- **Impacto:** A matriz exportada para auditoria fica incompleta ou corrompida.
- **Evidência:** L116-121: `c.code, c.framework, ... c.evidenceCount,`; L125-126: `const csvContent = 'data:text/csv;charset=utf-8,' + ...; const encodedUri = encodeURI(csvContent);`. Seed complianceEngine.ts L21: `frameworkCode: 'OWASP_TOP10',` (sem framework/evidenceCount).
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-367 · [MÉDIA] Schema Supabase não cobre entidades usadas pelas telas e diverge dos tipos (status e colunas)
- **Arquivo:** `src/types/security.ts`
- **Localização:** SecurityRemediation L579-615; AcceptedRiskRecord L617-643; server/security/supabase_schema_rls.sql L195-231
- **Categoria:** Banco de dados
- **Descrição:** O SQL não tem tabelas para compliance_controls, compliance_evaluations, security_score_history, risk_exceptions, scheduled_reports nem alert_rules, todas usadas pelas views Compliance, Hardening e Executiva. security_remediations documenta status 'OPEN, IN_PROGRESS, READY_FOR_RETEST, VALIDATED, CANCELLED', enquanto o código usa WAITING_RETEST, VERIFIED, COMPLETED, ACCEPTED_RISK e BLOCKED. Faltam colunas como finding_code, recommendation, priority_justification, sla_hours, owner e created_by. accepted_risks não tem os campos responsible_*, finding_code nem accepted_at, e grava compensatory_controls como TEXT contra string[]. Hoje tudo persiste em src/data/security_persisted.json, mas a tela de Observabilidade afirma 'Supabase DDL: Script RLS pronto' e '100% de tabelas com tenant_id'.
- **Impacto:** Uma migração para o Supabase perderia dados ou falharia, e a afirmação de prontidão de produção exibida na UI é falsa.
- **Evidência:** supabase_schema_rls.sql L201: `status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, READY_FOR_RETEST, VALIDATED, CANCELLED`; o grep por 'compliance\|score_history\|risk_exception\|evaluation\|baseline' no SQL só encontra um comentário e o tipo de relatório. SecurityObservabilityView L421-423: 'Supabase DDL: Script RLS pronto', 'Multi-Tenancy: 100% de tabelas com tenant_id'.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-368 · [BAIXA] Tipos do front divergem do servidor e contêm campos de 'compatibilidade' nunca preenchidos; tipos mortos e duplicados
- **Arquivo:** `src/types/security.ts`
- **Localização:** FindingStatus L8-24; RetestResult L69-76; EvidenceMatrixItem campos de compatibilidade L1021-1031; ComplianceFrameworkSummary L978-986; SecurityVulnerability L78-91; SecurityPentest L176-195; AcceptedRiskRecord L617-643 vs RiskException L645-668
- **Categoria:** Duplicado / obsoleto
- **Descrição:** EvidenceMatrixItem declara controlTitle, linkedFindings, hasRecentEvidence, gapDescription e actionPlan como 'compatibilidade para UI', mas buildEvidenceMatrix nunca os preenche. ComplianceFrameworkSummary não corresponde a nenhuma resposta do servidor. FindingStatus e RetestResult misturam sinônimos que geram contagens inconsistentes. SecurityVulnerability e SecurityPentest não são referenciados em nenhum arquivo de src/ ou server/ (git grep = 0). AcceptedRiskRecord e RiskException modelam o mesmo conceito com formatos diferentes (compensatoryControls string[] vs string).
- **Impacto:** Os tipos opcionais dão falsa segurança de contrato: a UI compila e quebra em runtime (caso Compliance). Os sinônimos de status geram bugs de métrica, e o código morto aumenta a manutenção.
- **Evidência:** security.ts L1021: `// Campos de compatibilidade para renderização na UI` seguido de `controlTitle?: string; linkedFindings?: Array<...>`. FindingStatus: `'OPEN' \| 'NEW' \| ... 'REMEDIATION' \| 'IN_REMEDIATION' \| 'FIXED_PENDING_RETEST' \| 'WAITING_RETEST' \| 'RETEST' \| 'VERIFIED' \| 'RESOLVED' \| ... 'ACCEPTED_RISK' \| 'RISK_ACCEPTED'`. git grep -w SecurityVulnerability/SecurityPentest fora de security.ts: 0 arquivos.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-369 · [BAIXA] Dados carregados e estados declarados sem uso (sub-abas e histórico não implementados)
- **Arquivo:** `src/components/security/HardeningBaselinesView.tsx`
- **Localização:** HardeningBaselinesView evaluations L41/L67 (nunca renderizado); ComplianceAssessmentView activeTab L38 ('matrix'\|'controls'\|'gaps' sem UI); SecurityObservabilityView copiedSql L32; RemediationDashboardView prop onRequestRetest L39-44 nunca usada; ExecutiveDashboardView pentestMetrics/topCriticalRisks/topCriticalAssets/riskDelta não exibidos
- **Categoria:** Desconectado
- **Descrição:** Histórico de avaliações de hardening é buscado em /compliance/evaluations mas nunca mostrado. ComplianceAssessmentView declara sub-abas Matriz/Controles/Gaps sem renderizá-las. Observabilidade tem estado para copiar SQL e importa Copy/Check, mas o botão não existe. A prop onRequestRetest da Remediação é recebida e ignorada (no SecurityModule apenas abre o modal). O endpoint executivo calcula métricas que a UI descarta. Há também muitos imports de ícones sem uso (ex.: ShieldAlert/CheckCircle2/Plus no SecurityModule; Clock/Download/ExternalLink/Target no Executivo; XCircle/Shield/Calendar/Layers/ChevronRight na Compliance; Terminal/Search/ArrowRight/ExternalLink no Hardening; Sparkles/Layers/Activity/Plus na Remediação).
- **Impacto:** Requisições desnecessárias, funcionalidades prometidas (histórico de avaliações, visão de gaps, solicitar reteste) inexistentes e código morto que confunde a manutenção.
- **Evidência:** HardeningBaselinesView L41: `const [evaluations, setEvaluations] = useState<ComplianceEvaluationResult[]>([]);` (setado em L67, sem leitura). Compliance L38: `const [activeTab, setActiveTab] = useState<'matrix' \| 'controls' \| 'gaps'>('matrix');` (sem uso). Observability L32: `const [copiedSql, setCopiedSql] = useState(false);`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-370 · [BAIXA] Carregamento redundante: SecurityModule busca 6 endpoints a cada montagem, e as abas repetem as mesmas buscas
- **Arquivo:** `src/components/security/SecurityModule.tsx`
- **Localização:** loadData L71-98; RemediationDashboardView L75 (findings de novo); HardeningBaselinesView L58 (targets de novo); onUpdated do FindingDetailModal L453
- **Categoria:** Desempenho
- **Descrição:** A aba inicial é 'executive', que tem fetch próprio, mas o módulo já busca métricas, scans, findings completos, escopos, alvos e auditoria inteira. Remediação e Hardening refazem os fetches de findings e targets a cada montagem, e toda ação dispara um loadData completo. Não há paginação no /security/audit nem no /security/findings.
- **Impacto:** Com o crescimento do JSON (hoje cerca de 453 KB), cada troca de aba e cada ação transfere e reprocessa tudo, degradando o tempo de resposta.
- **Evidência:** SecurityModule L74-81: seis `fetch('/api/v1/security/...').then(r => r.json())` em Promise.all no useEffect de montagem; RemediationDashboardView L75: `fetch('/api/v1/security/findings')`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-371 · [BAIXA] Tabela de SLA fixa na UI duplica a política do servidor (e já diverge)
- **Arquivo:** `src/components/security/RemediationDashboardView.tsx`
- **Localização:** Aba 'Governança de SLA & Escalation' L568-623; server/security/remediationEngine.ts L19-23
- **Categoria:** Duplicado / obsoleto
- **Descrição:** A matriz de SLA é HTML fixo, sem leitura da política do RemediationEngine. Já há divergências: o papel de escalação HIGH é 'Security Officer / DevOps Lead' na UI e 'Security Officer' no servidor, e a linha INFO (1440h) não aparece. Os textos 'Ação Compulsória' não têm implementação.
- **Impacto:** Mudanças na política do servidor não aparecem na tela, e o usuário pode seguir prazos e escalações incorretos.
- **Evidência:** UI L601: `<td ...>Security Officer / DevOps Lead</td>`; remediationEngine.ts L20: `{ severity: 'HIGH', maxResolutionHours: 72, escalationRole: 'Security Officer', ...}` e L23 com INFO 1440h ausente na UI.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-372 · [BAIXA] Inconsistências visuais: nota sempre verde, rótulos de abas duplicados, ativos sem achados listados como 'maior risco'
- **Arquivo:** `src/components/security/ExecutiveDashboardView.tsx`
- **Localização:** Badge da nota L159-161; topVulnerableAssets L454-476 (servidor L2071-2082 sem filtro de findingsCount>0); SecurityModule abas L229 e L294; SecurityDashboardView recentScans L312-325
- **Categoria:** Bug / código incompleto
- **Descrição:** O badge 'Nota X' usa sempre a classe emerald, mesmo com nota F (getGradeColor existe e só é usado no histórico). O servidor devolve os 5 alvos com maior risco mesmo com 0 achados, então a mensagem de vazio nunca aparece e surgem itens com '0 achados'. Há duas abas com rótulo 'Hardening & ...' e o mesmo ícone (Hardening & Baselines e Hardening & Observabilidade). Os scans recentes mostram só as contagens High e Medium e omitem Critical.
- **Impacto:** A sinalização visual induz o leitor executivo ao erro (nota F em verde, críticos omitidos nos scans), além de navegação confusa.
- **Evidência:** L159: `<div className="... bg-emerald-50 text-emerald-700 ...">Nota {data.securityScoreGrade}</div>`; SecurityModule L229 'Hardening & Baselines' e L294 'Hardening & Observabilidade'; SecurityDashboardView L314-323 só exibe `findingsCountSummary.high` e `.medium`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

#### A-373 · [BAIXA] Front importa tipos diretamente de módulos do servidor
- **Arquivo:** `src/components/security/SecurityObservabilityView.tsx`
- **Localização:** L24-25
- **Categoria:** Desconectado
- **Descrição:** A view importa SecuritySystemHealth e SecurityTestSuiteReport de server/security/securityHealth.ts e securityTestSuite.ts, que importam SecurityOrchestrator, fs e crypto. Funciona hoje só porque o esbuild elimina imports usados apenas como tipo (não há `import type`). Qualquer mudança de configuração (verbatimModuleSyntax/preserveValueImports) ou um uso acidental como valor puxa código Node para o bundle do navegador.
- **Impacto:** Acoplamento front-back frágil, com risco de quebra de build ou de inclusão de código de servidor no bundle.
- **Evidência:** `import { SecuritySystemHealth } from '../../../server/security/securityHealth';` e `import { SecurityTestSuiteReport } from '../../../server/security/securityTestSuite';`.
- **Verificação:** Evidência do auditor (não reconferido individualmente)

### 6.19 WiFi Pulse

_Forma de exame: Manual (verificação dirigida) — 3 achados._

#### A-374 · [ALTA] Módulo WiFi Pulse inteiro é simulado: varredura, troca de rede/canal, ARP, teste de velocidade e coleta do agente
- **Arquivo:** `server/wifiRouter.ts`
- **Localização:** /scan L159-193 (RSSI ±1 aleatório); /switch-network L196-243; /switch-channel L246-268 (RSSI +4 fictício); /dual-test L271-291 (velocidades Math.random e provedor fixo 'Claro Fibra Empresas'); /arp-scan L294-312; /agent-collect L315-330
- **Categoria:** UI não implementada
- **Descrição:** Nenhuma rota lê o adaptador de rede. 'Varredura do espectro RF' só oscila o RSSI gravado no JSON. 'Migrar de rede' e 'Aplicar canal' só alteram o JSON, e o canal ainda 'melhora' o sinal em 4 dB por decreto. O teste de velocidade é aleatório. 'Coleta em nível de kernel/driver' não faz nada.
- **Impacto:** Diagnósticos, relatórios técnicos e recomendações exibidos ao usuário e anexados a chamados são fictícios.
- **Evidência:** const jitter = (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 2); store.currentConnection.rssi = Math.min(-42, rssi + 4); message: 'Agente Local executou coleta com sucesso em nível de kernel/driver.'
- **Verificação:** CONFIRMADO (manual)

#### A-375 · [MÉDIA] Histórico de diagnósticos WiFi cresce sem limite e usa valores padrão fictícios
- **Arquivo:** `server/wifiRouter.ts`
- **Localização:** POST /history L333-371
- **Categoria:** Regra de negócio
- **Descrição:** historicDiagnostics.unshift sem teto. Sem corpo na requisição, grava ticket 'CH-2026-0841', ativo 'CI-PC-023' e usuário 'usr-101' fixos, sem autenticação.
- **Impacto:** Histórico poluído com vínculos falsos a chamados e ativos, e arquivo crescendo indefinidamente.
- **Evidência:** ticketId: body.ticketId \|\| 'CH-2026-0841'; store.historicDiagnostics.unshift(newDiag)
- **Verificação:** CONFIRMADO (manual)

#### A-376 · [BAIXA] wifiRouter montado em dois prefixos
- **Arquivo:** `server.ts`
- **Localização:** L38-39
- **Categoria:** Duplicado / obsoleto
- **Descrição:** O mesmo router responde em /api/wifi e /api/v1/wifi. O front usa só /api/wifi.
- **Impacto:** Superfície de API duplicada e sem versionamento real.
- **Evidência:** app.use('/api/wifi', wifiRouter); app.use('/api/v1/wifi', wifiRouter);
- **Verificação:** CONFIRMADO (manual)

### 6.20 Velocímetro NetPulse e Agenda Pro

_Forma de exame: Manual (verificação dirigida) — 2 achados._

#### A-377 · [MÉDIA] Velocímetro envia o IP do usuário a serviços de terceiros sem consentimento (LGPD)
- **Arquivo:** `src/components/velocimetro/VelocimetroNetPulseView.tsx`
- **Localização:** L96 (ipwho.is), L111 (api4.ipify.org), L313/384/469 (speed.cloudflare.com), L580 (WhatsApp com número fixo)
- **Categoria:** Segurança
- **Descrição:** Ao abrir a tela, o IP público e a geolocalização são consultados em APIs externas. O compartilhamento de resultado abre o WhatsApp para um número de telefone fixo no código. O teste de velocidade em si é real (Cloudflare).
- **Impacto:** Dados pessoais (IP e localização) transferidos a terceiros sem base legal registrada. Resultados enviados a um número fixo.
- **Evidência:** fetch('https://ipwho.is/'); window.open(`https://wa.me/55***`)
- **Verificação:** CONFIRMADO (manual)

#### A-378 · [MÉDIA] Agenda Pro só em localStorage, com JSON.parse sem tratamento (dados corrompidos derrubam o app)
- **Arquivo:** `src/components/AgendaProModule.tsx`
- **Localização:** L461-479 (inicializadores useState); L497-511
- **Categoria:** Estabilidade
- **Descrição:** Eventos, contatos, tarefas e ocorrências existem só no navegador, sem backend nem Supabase e sem compartilhamento entre usuários. Os inicializadores fazem JSON.parse sem try/catch, e o projeto não tem ErrorBoundary.
- **Impacto:** Agenda corporativa não compartilhada e perdida ao limpar o navegador. Um valor corrompido derruba a aplicação inteira.
- **Evidência:** return saved ? JSON.parse(saved) : INITIAL_EVENTS;
- **Verificação:** CONFIRMADO (manual)

### 6.21 Central de conhecimento e RBAC

_Forma de exame: Manual (verificação dirigida) — 3 achados._

#### A-379 · [ALTA] Níveis de acesso (RBAC) só exibidos: nenhuma tela ou ação é restringida
- **Arquivo:** `src/App.tsx`
- **Localização:** accessLevel usado só para exibição em Sidebar.tsx L171/219/299 e filtro em UserRegistration.tsx L981; OperationalRbacMatrix.tsx órfão
- **Categoria:** Regra de negócio
- **Descrição:** Nenhum componente consulta accessLevel ou permissões para esconder abas ou bloquear ações. A matriz RBAC operacional é só documentação visual e não é renderizada.
- **Impacto:** Qualquer perfil cadastrado tem acesso total. A segregação de funções prometida não existe.
- **Evidência:** grep por accessLevel retorna apenas renderizações de texto e um filtro de lista.
- **Verificação:** CONFIRMADO (manual)

#### A-380 · [ALTA] Troca de usuário pela Sidebar sem senha
- **Arquivo:** `src/components/Sidebar.tsx`
- **Localização:** L268 setCurrentUser?.(user); L339
- **Categoria:** Segurança
- **Descrição:** A Sidebar lista os usuários disponíveis e troca o currentUser com um clique, sem reautenticação.
- **Impacto:** Personificação de qualquer usuário. Os registros de auditoria do front perdem valor.
- **Evidência:** onClick => setCurrentUser?.(user)
- **Verificação:** CONFIRMADO (manual)

#### A-381 · [MÉDIA] Assistente de IA da Central de Conhecimento é busca por palavra-chave com atraso simulado, e o componente está órfão
- **Arquivo:** `src/components/knowledge/AiKnowledgeAssistant.tsx`
- **Localização:** L49 (setTimeout + filtro em INITIAL_KB_ARTICLES)
- **Categoria:** UI não implementada
- **Descrição:** Não chama nenhuma IA (o /api/ai existe no servidor e não é usado). Faz um filtro includes() e simula 'pensando'. O componente não é importado em lugar nenhum.
- **Impacto:** Funcionalidade anunciada inexistente e código morto.
- **Evidência:** setTimeout(() => { const matchedArticles = INITIAL_KB_ARTICLES.filter(...
- **Verificação:** CONFIRMADO (manual)

### 6.22 Motor de backup

_Forma de exame: Manual (verificação dirigida) — 3 achados._

#### A-382 · [ALTA] Motor de backup (≈70 arquivos) desconectado do produto
- **Arquivo:** `src/backup-engine/`
- **Localização:** Imports externos só em scripts/runTests.ts, tests/* e src/backup-agent/domain/config.ts
- **Categoria:** Desconectado
- **Descrição:** Nenhuma rota do servidor, tela ou processo instancia o scheduler, o job-executor, as estratégias ou os storages. O BackupRestoreModal usa outro mecanismo (src/utils/backupManager.ts, localStorage).
- **Impacto:** Backup corporativo (S3/SFTP/SMB, criptografia, retenção) anunciado na documentação não está disponível ao usuário. Há dois sistemas de backup paralelos.
- **Evidência:** grep 'backup-engine' fora da pasta: apenas testes e o agente.
- **Verificação:** CONFIRMADO (manual)

#### A-383 · [MÉDIA] Armazenamento SMB carrega credenciais mas nunca as usa
- **Arquivo:** `src/backup-engine/storage/smb-storage.ts`
- **Localização:** L19, L63-65 (resolvedCredentials); L41 (caminho UNC); L96 (fs.access)
- **Categoria:** Bug / código incompleto
- **Descrição:** resolvedCredentials é preenchido e só zerado, nunca usado para autenticar no compartilhamento. O acesso depende da sessão do SO.
- **Impacto:** Destinos SMB que exigem usuário e senha falham, ou gravam com a identidade errada do processo.
- **Evidência:** 4 ocorrências de resolvedCredentials: declaração, 2 atribuições e reset.
- **Verificação:** CONFIRMADO (manual)

#### A-384 · [BAIXA] PBKDF2 com 100.000 iterações (abaixo da recomendação atual)
- **Arquivo:** `src/backup-engine/crypto/kdf-provider.ts`
- **Localização:** L98-99
- **Categoria:** Segurança
- **Descrição:** PBKDF2-SHA256 com 100k iterações. A recomendação OWASP atual é 600k. O Argon2id também está disponível.
- **Impacto:** Senhas de backup mais fáceis de quebrar por força bruta.
- **Evidência:** iterations: 100000, hashAlgorithm: 'sha256'
- **Verificação:** CONFIRMADO (manual)

### 6.23 Agente de backup

_Forma de exame: Manual (verificação dirigida) — 2 achados._

#### A-385 · [ALTA] Agente de backup sem control plane correspondente no servidor
- **Arquivo:** `src/backup-agent/`
- **Localização:** control-plane/websocket-client.ts; server.ts (nenhum servidor WebSocket)
- **Categoria:** Desconectado
- **Descrição:** O agente conecta por WebSocket a um control plane, mas server.ts não tem servidor WS, e o agente só é importado pelos testes.
- **Impacto:** Agente não implantável e sem comunicação com a plataforma.
- **Evidência:** grep 'backup-agent' fora da pasta: só tests/failure/failure-resilience.test.ts.
- **Verificação:** CONFIRMADO (manual)

#### A-386 · [MÉDIA] Comandos do agente não implementados no EngineController
- **Arquivo:** `src/backup-agent/engine-bridge/engine-controller.ts`
- **Localização:** L63
- **Categoria:** Bug / código incompleto
- **Descrição:** Tipos de comando fora da lista lançam 'Comando não implementado pelo EngineController'.
- **Impacto:** Comandos remotos previstos no contrato falham em tempo de execução.
- **Evidência:** throw new Error(`Comando não implementado pelo EngineController: ...`)
- **Verificação:** CONFIRMADO (manual)

### 6.24 Testes, runner e CI

_Forma de exame: Manual (verificação dirigida) — 5 achados._

#### A-387 · [ALTA] '0 erros de tipo' é enganoso: @types/react ausente, então o JSX não é verificado
- **Arquivo:** `package.json`
- **Localização:** devDependencies (sem @types/react e @types/react-dom)
- **Categoria:** Estabilidade
- **Descrição:** Sem as definições de tipo do React, todo elemento JSX é any. npm run lint (tsc) aprova componentes com props obrigatórias faltando, como AssetTransitionModal sem employees e rooms.
- **Impacto:** O lint do CI não detecta erros de integração entre componentes, e bugs que derrubam a tela chegam à produção.
- **Evidência:** node_modules/@types não contém react; AssetManagement.tsx L1352 omite props obrigatórias e tsc retorna 0.
- **Verificação:** CONFIRMADO (manual)

#### A-388 · [MÉDIA] npm test e o CI executam suítes que alteram os arquivos de dados versionados
- **Arquivo:** `scripts/runTests.ts`
- **Localização:** L27 (SecurityTestSuite.runAllTests), L35 (E2EIntegrationSuite)
- **Categoria:** Estabilidade
- **Descrição:** Os testes usam o mesmo store de produção em src/data/security_persisted.json, sem isolamento nem diretório temporário.
- **Impacto:** Rodar os testes altera dados reais e o estado do git, e os resultados dependem de dados anteriores.
- **Evidência:** await SecurityTestSuite.runAllTests(); E2EIntegrationSuite.runFullE2ETestSuite('tenant-demo')
- **Verificação:** CONFIRMADO (manual)

#### A-389 · [MÉDIA] Suíte do agente de backup (1000 linhas) nunca é executada
- **Arquivo:** `src/backup-agent/tests/agent.test.ts`
- **Localização:** não importada em scripts/runTests.ts
- **Categoria:** Desconectado
- **Descrição:** O runner importa 10 suítes, e agent.test.ts não está entre elas. Ele só roda se chamado manualmente.
- **Impacto:** Regressões do agente não são detectadas no CI.
- **Evidência:** runTests.ts L3-12 sem agent.test.
- **Verificação:** CONFIRMADO (manual)

#### A-390 · [MÉDIA] Sem nenhum teste para o front-end, as rotas Express de CMDB/WiFi e os serviços Supabase
- **Arquivo:** `scripts/runTests.ts`
- **Localização:** todo o runner
- **Categoria:** Estabilidade
- **Descrição:** Os testes cobrem o motor de backup e as suítes internas de segurança. Login, persistência Supabase, CMDB, WiFi e componentes React não têm teste.
- **Impacto:** Os bugs críticos deste relatório (perda de dados, crash da aba Compliance) passariam no CI.
- **Evidência:** Imports do runner.
- **Verificação:** CONFIRMADO (manual)

#### A-391 · [BAIXA] Variável SECURITY_HMAC_SECRET do CI não é lida por nenhum código
- **Arquivo:** `.github/workflows/ci.yml`
- **Localização:** L39
- **Categoria:** Desconectado
- **Descrição:** O CI define um segredo HMAC que nenhum arquivo .ts consulta.
- **Impacto:** Configuração enganosa: dá a impressão de que comandos são assinados com segredo configurável.
- **Evidência:** grep SECURITY_HMAC_SECRET em server/ e src/: 0 resultados.
- **Verificação:** CONFIRMADO (manual)

### 6.25 Documentação e tooling

_Forma de exame: Manual (verificação dirigida) — 2 achados._

#### A-392 · [ALTA] Não existe aplicação desktop: docs/desktop.md descreve Tauri inexistente
- **Arquivo:** `docs/desktop.md`
- **Localização:** documento inteiro
- **Categoria:** Duplicado / obsoleto
- **Descrição:** O documento descreve empacotamento Tauri (MSI, deb, AppImage), IPC por Named Pipe e tauri.conf.json. Não há src-tauri, tauri.conf.json, Electron nem dependências correspondentes. O produto é uma SPA web com servidor Express.
- **Impacto:** Expectativa de produto desktop não atendida, e planejamento e implantação baseados em documentação falsa.
- **Evidência:** ls src-tauri: inexistente; grep tauri\|electron em package.json: 0.
- **Verificação:** CONFIRMADO (manual)

#### A-393 · [MÉDIA] Integração Power BI aponta para uma URL de ambiente de desenvolvimento externo
- **Arquivo:** `src/components/AutomatedReportsAndExport.tsx`
- **Localização:** L20
- **Categoria:** Segurança
- **Descrição:** Endpoint fixo para um deploy de desenvolvimento do AI Studio (run.app), não para o servidor da própria instalação. O componente também está órfão.
- **Impacto:** Exposição de infraestrutura de terceiros e integração que nunca usaria os dados da empresa.
- **Evidência:** const powerBiEndpoint = 'https://ais-dev-***.run.app/api/export/powerbi-feed'
- **Verificação:** CONFIRMADO (manual)

### 6.26 Transversal — contrato de API

_Forma de exame: Manual (mapeamento completo de rotas) — 1 achados._

#### A-394 · [BAIXA] Contratos de rota front→servidor coincidem, mas há muitas rotas do servidor sem consumidor
- **Arquivo:** `server/securityRouter.ts`
- **Localização:** securityRouter: /score/*, /alerts/rules, /action-center, /search, /risk-exceptions, /tickets/:id/resolve, /retests/comparisons, /assets/:assetId/profile; cmdbRouter: /cmdb/topology, /impact/:id, /health, /orphans, /services, /contracts, /tickets, /history, /changes; server.ts: /api/ai/insights, /api/ai/classify-app
- **Categoria:** Desconectado
- **Descrição:** As 95 chamadas fetch do front apontam para rotas existentes (sem 404 de caminho). Porém cerca de 25 rotas não são usadas pela UI. Telas como Impacto, Serviços e Histórico do CMDB recalculam no cliente o que o servidor já oferece, e as rotas de IA (Gemini) nunca são chamadas.
- **Impacto:** Lógica duplicada cliente/servidor que diverge com o tempo, e funcionalidades de IA pagas sem uso.
- **Evidência:** grep de fetch em src/ x router.* nos três routers.
- **Verificação:** CONFIRMADO (manual)

### 6.27 Transversal — código morto e dependências

_Forma de exame: Manual (grafo de imports) — 2 achados._

#### A-395 · [MÉDIA] Seis componentes órfãos (~107 KB) nunca renderizados, incluindo a Navbar
- **Arquivo:** `src/components/Navbar.tsx`
- **Localização:** Navbar.tsx, ApiAndIntegrations.tsx, AutomatedReportsAndExport.tsx, CustomBIAndPersonas.tsx, knowledge/AiKnowledgeAssistant.tsx, knowledge/OperationalRbacMatrix.tsx
- **Categoria:** Desconectado
- **Descrição:** Nenhum desses arquivos é importado. A Central de Ajuda (knowledgeData.ts L36, L355, L476) ensina o usuário a usar filtros e seletores 'da Navbar', que não aparece na tela.
- **Impacto:** Código morto e documentação de ajuda que descreve uma interface inexistente.
- **Evidência:** grep pelos nomes em src/: somente as próprias definições e textos de ajuda.
- **Verificação:** CONFIRMADO (manual)

#### A-396 · [BAIXA] Dependências declaradas e não usadas (fflate, fzstd) e lockfiles duplicados
- **Arquivo:** `package.json`
- **Localização:** dependencies; bun.lock + package-lock.json
- **Categoria:** Duplicado / obsoleto
- **Descrição:** fflate e fzstd não são importados. Coexistem bun.lock e package-lock.json. vite aparece em dependencies e devDependencies. O nome do pacote é 'react-example'.
- **Impacto:** Instalações não reprodutíveis e peso desnecessário.
- **Evidência:** grep fflate\|fzstd em src/ e server/: 0.
- **Verificação:** CONFIRMADO (manual)

### 6.28 Transversal — desempenho e estabilidade

_Forma de exame: Manual (verificação dirigida) — 3 achados._

#### A-397 · [ALTA] Dados de runtime gravados em src/data (dentro do código-fonte); em dev a gravação da topologia recarrega a tela
- **Arquivo:** `server.ts`
- **Localização:** server.ts L208; cmdbRouter.ts L50; wifiRouter.ts L29; securityOrchestrator.ts L48; pentestControlPlane.ts L21; InfraTopology.tsx L87 (import topology_saved.json)
- **Categoria:** Estabilidade
- **Descrição:** Todo o estado do servidor (CMDB, segurança, WiFi, topologia) é gravado em arquivos versionados dentro de src/. A InfraTopology importa topology_saved.json no bundle, e em modo dev o Vite detecta a gravação e recarrega o módulo. Em produção (dist/server.cjs) os dados dependem de process.cwd()/src existir no host.
- **Impacto:** Mistura dados com código (vazamento por git, conflitos de merge), perda de estado de UI ao salvar e implantação frágil.
- **Evidência:** path.join(process.cwd(), 'src', 'data', ...) em 5 módulos.
- **Verificação:** CONFIRMADO (manual)

#### A-398 · [ALTA] Nenhum ErrorBoundary na aplicação React
- **Arquivo:** `src/App.tsx`
- **Localização:** projeto inteiro (grep ErrorBoundary\|componentDidCatch: 0)
- **Categoria:** Estabilidade
- **Descrição:** Qualquer exceção de renderização em qualquer módulo desmonta a aplicação inteira e deixa a tela em branco.
- **Impacto:** Bugs localizados (Compliance, TransitionModal, JSON corrompido) derrubam todo o sistema.
- **Evidência:** Grep sem resultados.
- **Verificação:** CONFIRMADO (manual)

#### A-399 · [MÉDIA] Servidor sem handlers de unhandledRejection/uncaughtException
- **Arquivo:** `server.ts`
- **Localização:** server.ts (ausente)
- **Categoria:** Estabilidade
- **Descrição:** Promises rejeitadas fora de try/catch (IIFE assíncrona do launchPentest, timers) derrubam o processo no Node 15 ou superior.
- **Impacto:** Queda do servidor inteiro por erro em uma tarefa de fundo.
- **Evidência:** grep unhandledRejection em server/ e server.ts: 0.
- **Verificação:** CONFIRMADO (manual)

## 7. Cobertura e limitações

- **Lidos integralmente por agentes (15 frentes):** núcleo/autenticação, servidor/deploy, Supabase, produtividade, LGPD/agente, cadastro de usuários, ativos (3 frentes), topologia (arquivo completo de 9.457 linhas), CMDB (UI principal e backend), backend de segurança (control plane, runner, compliance, hardening, remediação) e UI de segurança (dashboards, compliance, remediação, observabilidade).
- **Examinados diretamente, com verificação dirigida:** scanner de rede, router e validador de segurança, ponte de integração, suítes de teste, WiFi Pulse (backend e módulo), Velocímetro, Agenda Pro, Central de Conhecimento, motor e agente de backup, testes/CI, documentação, contrato completo de rotas front↔servidor (95 chamadas × 3 routers) e grafo de imports.
- **Examinados só parcialmente** (sem leitura linha a linha, apenas por busca dirigida):
  - views secundárias do WiFi: `WifiBestChannelView`, `WifiChannelMapView`, `WifiHistoryView` e semelhantes;
  - modais de pentest e relatórios de segurança: `NewPentestProjectModal`, `SecurityReportsView`, `FindingDetailModal`;
  - `CmdbTopologyView` e `CmdbDiscoveryView`;
  - os arquivos de dados `security_persisted.json` e `cmdb_persisted.json`, só quanto à estrutura.

  Os problemas sistêmicos se aplicam a essas telas (ausência de identidade e tenant nas chamadas, falta de ErrorBoundary, simulação do backend WiFi), mas defeitos locais de UI nelas podem não ter sido catalogados.
- **Verificação:** os achados críticos e os principais de alta gravidade foram conferidos manualmente, e nenhum foi refutado. Os demais achados das frentes de agentes têm evidência citada (arquivo, linha e trecho) e estão marcados como "Evidência do auditor".
- **Segredos:** valores de senhas e tokens estão mascarados (`***`) neste relatório. Os valores reais estão no código e no histórico do git e devem ser considerados comprometidos.
- Nenhum arquivo do projeto foi alterado durante a auditoria.

---

## 8. Status das correções (branch `auditoria/correcoes`, 20/11/2026)

| # (seção 3) | Problema | Status |
|---|---|---|
| 1, 2 | Login no cliente, senha mestre no código | **Corrigido**: Supabase Auth real, lista de e-mails autorizados, senhas fora do código/localStorage/backups. A senha antiga continua no histórico do git e deve ser trocada |
| 3, 4 | API sem autenticação; RBAC por cabeçalho | **Corrigido**: `server/authMiddleware.ts` (JWT Supabase) em toda `/api`; papel e tenant derivados do token |
| 5 | Agentes sem token, tokens fixos | **Corrigido**: sem acesso anônimo (exceto `AGENT_ALLOW_LEGACY_UNAUTHENTICATED=true`); tokens vazados revogados por hash |
| 6, 7, 8 | Persistência Supabase unidirecional, seed de mock, mapeamento de ativos | **Corrigido**: sincronização por diferença (`useSupabaseCollectionSync`), leitura com falha não sobrescreve nada, mapeamento completo via `custom_fields` |
| 9, 10 | Trigger ADMIN_GERAL, RLS permissiva | **Corrigido em migração** `20261120000000_auth_trigger_and_rls_hardening.sql` (precisa ser aplicada no Supabase) |
| 11, 12, 28 | Dois gravadores no mesmo JSON; gravação não atômica; dados em `src/` | **Corrigido**: dono único por chave, gravação atômica com `.bak` e quarentena, `WORKPULSE_DATA_DIR` configurável |
| 13 | Deploy Vercel sem API | **Pendente** (decisão de infraestrutura: servidor Node persistente) |
| 14, 15, 16, 17 | Tipos do React ausentes, contratos de props, Compliance, ErrorBoundary | **Corrigido**: `@types/react`, 86 → 0 erros de tipo, ErrorBoundary global e por módulo |
| 18 | Aprovação de pentest | **Parcial**: papel vem do token (aprovação funciona para ADMIN); segregação de funções ainda pendente |
| 19 | Escopo do pentest, IPs públicos, DNS rebinding | **Pendente** |
| 20 | Suítes de teste alterando dados | **Corrigido**: rotas desativadas por padrão (`SECURITY_ENABLE_SELF_TESTS`), `npm test` em diretório isolado |
| 21 | Live scan/WOL para faixas públicas | **Parcial**: exige sessão autenticada; restrição a sub-redes cadastradas pendente |
| 22 | RBAC só exibido; troca de usuário sem senha | **Parcial**: troca de usuário removida, identidade vem da sessão; RLS aplica níveis no banco; telas ainda não ocultam ações por nível |
| 23, 24, 26 | Funcionalidades simuladas | **Rotuladas**: aviso "Modo demonstração" em WiFi, SNMP, Discovery Jobs, Central de Descoberta, Frota de Agentes, Hardening, Dashboard, Sessões; respostas do WiFi marcadas `simulated: true`; [MESCLAR] não mescla mais em ativo arbitrário. Implementação real pendente |
| 25 | Instaladores do agente | **Corrigido**: PowerShell com tarefa agendada (SYSTEM), .BAT válido, rota `/api/v1/agent/install.ps1`, GPO sem MSI inexistente, systemd/launchd |
| 27 | Dados só no localStorage | **Parcial**: fornecedores, salas, categorias, status, travas de PC e Agenda Pro em `app_documents`; trilha de auditoria em `app_audit_logs` (somente inserção) — migração `20261120010000_app_documents_and_audit.sql`. Cadastro de usuários do sistema ainda local |
| 29 | Motor/agente de backup desconectados | **Mantido como biblioteca testada** (suíte do agente agora roda no CI); integração pendente de decisão |
| 30 | Desktop Tauri inexistente | **Corrigido na documentação** (`docs/desktop.md`, README) |
| 31 | LGPD | **Parcial**: senhas e dados de sessão saíram do navegador. Pendente: fluxo de consentimento; envio de IP a terceiros no Velocímetro (componente mantido sem alterações a pedido) |
| 32 | Código órfão e dependências | **Corrigido**: 6 componentes órfãos, `fflate`, `fzstd`, `bun.lock` e rota Power BI simulada removidos. Documentação duplicada raiz × `docs/` pendente |
| 33 | Testes | **Corrigido**: suíte de integridade (13 testes) + suíte do agente no runner; 14 suítes, 100% |
