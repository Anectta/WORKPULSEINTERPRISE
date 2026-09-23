# ESPECIFICAÇÃO DE APIS REST — WORKPULSE ENTERPRISE

Todas as rotas da API exigem os headers:
- `Authorization: Bearer <JWT_TOKEN>` (ou `x-user-role` em testes locais)
- `x-tenant-id: <TENANT_ID>`

---

## 1. Endpoints de Health Check e Observabilidade

- `GET /api/health`: Status global da aplicação web (`UP` / `DOWN`).
- `GET /api/health/database`: Status e latência da conexão com o banco de dados.
- `GET /api/health/security-engine`: Status e capacidade da Engine de Varredura.
- `GET /api/health/queue`: Status e volume de jobs na fila de processamento assíncrono.
- `GET /api/health/runner`: Status dos runners isolados de pentest.
- `GET /api/v1/security/health`: Relatório detalhado consolidado de saúde do módulo de segurança.
- `GET /api/v1/security/observability/metrics`: Métricas de desempenho, latência e taxa de erros.

---

## 2. Endpoints do Módulo Security & Pentest

### Governança e Escopos
- `GET /api/v1/security/scopes`: Lista escopos autorizados para o tenant.
- `POST /api/v1/security/scopes`: Registra novo escopo com assinatura de termo e hash SHA-256.

### Varreduras (Scans)
- `GET /api/v1/security/scans`: Lista histórico de scans do tenant.
- `POST /api/v1/security/scans`: Enfileira novo scan com validação prévia de escopo e anti-SSRF.
- `POST /api/v1/security/scans/:id/abort`: Interrupção imediata de scan em execução.

### Vulnerabilidades (Findings)
- `GET /api/v1/security/findings`: Lista vulnerabilidades com filtros de status e severidade.
- `GET /api/v1/security/findings/:id`: Detalhes completos com evidências e histórico de status.
- `PATCH /api/v1/security/findings/:id/status`: Transição de ciclo de vida com justificativa obrigatória.
- `POST /api/v1/security/findings/:id/ticket`: Abertura e vinculação de chamado no CMDB.

### Pentests & Runners
- `GET /api/v1/security/pentest/projects`: Lista projetos de pentest.
- `POST /api/v1/security/pentest/projects`: Criação de novo projeto de pentest.
- `POST /api/v1/security/pentest/projects/:id/approve`: Homologação formal do teste.
- `POST /api/v1/security/pentest/projects/:id/execute`: Inicia execução assíncrona no Runner Isolado.
- `POST /api/v1/security/pentest/executions/:id/emergency-stop`: Acionamento do **Kill Switch** de emergência.

### Central de Ações & Perfil 360° do Ativo
- `GET /api/v1/security/action-center`: Itens urgentes, SLAs próximos e riscos pendentes.
- `GET /api/v1/security/assets/:assetId/profile`: Perfil consolidado de segurança do CI.
- `GET /api/v1/security/search`: Busca global e unificada no ecossistema de segurança.

### Testes Automatizados & QA
- `GET /api/v1/security/tests/run`: Executa a suíte de 16 testes de hardening de produção.
- `POST /api/v1/security/e2e/run`: Executa a suíte E2E de 19 etapas e auditoria de isolamento multi-tenant.
