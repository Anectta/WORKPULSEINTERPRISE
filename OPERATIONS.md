# OPERAÇÕES E MONITORAMENTO DE PRODUÇÃO — WORKPULSE ENTERPRISE

## 1. Monitoramento de Saúde dos Componentes

O sistema expõe rotas dedicadas para monitoramento contínuo via Prometheus / Datadog / Uptime Robot:

- `/api/health`: Status geral do gateway e frontend.
- `/api/health/database`: Conectividade do PostgreSQL / Supabase.
- `/api/health/security-engine`: Disponibilidade do motor de análise de segurança.
- `/api/health/queue`: Tamanho da fila e tempo médio de espera dos jobs.
- `/api/health/runner`: Quantidade de runners ativos e taxa de ocupação.

---

## 2. Alertas Críticos (SOC / SecOps)

| Evento | Severidade | Ação Esperada |
| :--- | :--- | :--- |
| **Tentativa de Violação de Escopo / SSRF** | `CRITICAL` | Bloqueio imediato do IP e alerta no canal SOC |
| **Falha de Integridade de Auditoria HMAC** | `CRITICAL` | Notificação imediata ao Encarregado de Dados (DPO) |
| **Runner sem Heartbeat (>60s)** | `HIGH` | Cancelamento preventivo do job e isolamento do container |
| **SLA de Remediação Crítica Expirado** | `HIGH` | Escalação automática de chamado para a diretoria |
