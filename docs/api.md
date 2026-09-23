# Especificação da API do Control Plane — WorkPulse Enterprise

## 1. Princípios de Segurança da API

Todos os endpoints da API do Control Plane são auditados e aderem às seguintes regras:
1. **Autenticação**: Bearer Token JWT emitido pelo Supabase Auth (Usuários) ou Token HMAC assinado (Agentes).
2. **Autorização & Contexto**: Extração obrigatória de `tenant_id` e checagem de permissões RBAC (`ADMIN`, `OPERATOR`, `AUDITOR`).
3. **Correlation ID**: Cabeçalho `X-Correlation-ID` obrigatório para rastreabilidade de requisições ponta a ponta.
4. **Idempotência**: Requisições de mutação aceitam o cabeçalho `Idempotency-Key` para evitar execuções duplicadas.
5. **Rate Limiting**: Proteção em nível de rota para mitigar abusos de negação de serviço.

---

## 2. Catálogo de Endpoints

### 2.1 Gestão de Agentes
- `GET /api/v1/agents`: Lista os agentes registrados no tenant atual com status e capacidades.
- `POST /api/v1/agents/register`: Realiza o handshake inicial e provisionamento de novo agente com token de instalação.
- `POST /api/v1/agents/heartbeat`: Recebe o sinal de vida do agente e métricas vitais.
- `GET /api/v1/agents/:id`: Obtém detalhes, versão de engine e status de um agente específico.

### 2.2 Políticas & Jobs de Backup
- `GET /api/v1/jobs`: Lista todos os planos de backup do tenant.
- `POST /api/v1/jobs`: Cria uma nova definição de política de backup (Full, Incremental, Mirror, etc.).
- `GET /api/v1/jobs/:id`: Detalhes de um job específico.
- `PUT /api/v1/jobs/:id`: Atualiza configurações, agendamentos cron ou retenção.
- `DELETE /api/v1/jobs/:id`: Remove ou arquiva um job.

### 2.3 Orquestração & Comandos
- `POST /api/v1/commands/dispatch`: Envia comando assinado com HMAC (`RunBackup`, `RunRestore`, `CancelJob`) para a fila do Agente.
- `GET /api/v1/commands/:commandId`: Consulta o status de processamento e resultado retornado pelo agente.

### 2.4 Execuções & Snapshots
- `GET /api/v1/executions`: Histórico de execuções com métricas de taxa de transferência, arquivos e duração.
- `GET /api/v1/executions/:id`: Detalhes e manifesto da execução.
- `GET /api/v1/snapshots`: Catálogo de versões disponíveis para restauração.

### 2.5 Restauração & Retenção
- `POST /api/v1/restore`: Cria uma solicitação de restauração (Full, Pontual ou Arquivos Selecionados).
- `GET /api/v1/restore/:id`: Status do processo de restauração no agente.

### 2.6 Auditoria & Telemetria
- `GET /api/v1/audit`: Consulta a trilha imutável de auditoria com verificação de encadeamento HMAC.
- `GET /api/v1/telemetry`: Métricas consolidadas de desempenho (CPU, RAM, throughput).
- `GET /api/v1/alerts`: Alertas operacionais e incidentes de segurança.
