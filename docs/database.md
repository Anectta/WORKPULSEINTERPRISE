# Estrutura de Banco de Dados e RLS — Supabase PostgreSQL

## 1. Visão Geral

O banco de dados relacional é hospedado no **Supabase (PostgreSQL 15+)**.
Todas as tabelas contam com:
- Chaves Primárias UUID ou Identificadores únicos (`VARCHAR(64)`).
- Chave de Segregação Multi-Tenant (`tenant_id VARCHAR(64) NOT NULL`).
- Row Level Security (**RLS**) ativado em 100% das tabelas.
- Índices de performance cobrindo filtros comuns por tenant e timestamps.
- Triggers automáticos para proteção contra modificação em logs de auditoria (WORM).

---

## 2. Matriz de Tabelas do Control Plane

| Tabela | Tenant Column | RLS Status | Índices Criados | Chaves Estrangeiras (FK) | Status |
| :--- | :---: | :---: | :---: | :--- | :---: |
| `backup_agents` | `tenant_id` | **ATIVO** | `idx_backup_agents_tenant` | N/A | Produção |
| `backup_destinations` | `tenant_id` | **ATIVO** | `idx_backup_destinations_tenant`| N/A | Produção |
| `backup_jobs` | `tenant_id` | **ATIVO** | `idx_backup_jobs_tenant` | `destination_id`, `assigned_agent_id` | Produção |
| `backup_executions` | `tenant_id` | **ATIVO** | `idx_backup_executions_tenant_job`| `job_id`, `agent_id` | Produção |
| `backup_snapshots` | `tenant_id` | **ATIVO** | `idx_backup_snapshots_execution` | `execution_id`, `job_id` | Produção |
| `backup_restore_requests` | `tenant_id`| **ATIVO** | `idx_backup_restore_req_tenant` | `job_id`, `agent_id` | Produção |
| `backup_restore_executions`| `tenant_id`| **ATIVO** | FK via request | `request_id`, `agent_id` | Produção |
| `agent_commands` | `tenant_id` | **ATIVO** | `idx_agent_commands_target` | `target_agent_id` | Produção |
| `agent_telemetry` | `tenant_id` | **ATIVO** | `idx_agent_telemetry_agent_time`| `agent_id` | Produção |
| `backup_alerts` | `tenant_id` | **ATIVO** | `idx_backup_alerts_tenant` | N/A | Produção |
| `backup_audit_logs` | `tenant_id` | **ATIVO** | `idx_backup_audit_tenant_time` | N/A (Trilha WORM) | Produção |
| `security_scopes` | `tenant_id` | **ATIVO** | `idx_security_scopes_tenant` | N/A | Produção |
| `security_targets` | `tenant_id` | **ATIVO** | `idx_security_targets_scope` | `scope_id` | Produção |
| `security_scans` | `tenant_id` | **ATIVO** | `idx_security_scans_tenant` | `scope_id`, `policy_id` | Produção |
| `security_audit_logs` | `tenant_id` | **ATIVO** | `idx_sec_audit_tenant` | N/A (Trilha WORM) | Produção |

---

## 3. Políticas de Row Level Security (RLS)

O isolamento é aplicado no nível do kernel do PostgreSQL utilizando o identificador `tenant_id` extraído do JWT criptográfico:

```sql
CREATE POLICY rls_backup_jobs_tenant ON public.backup_jobs
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');
```

Qualquer tentativa de consulta (`SELECT`), inserção (`INSERT`), atualização (`UPDATE`) ou exclusão (`DELETE`) em registros de outro tenant resulta em conjunto de dados vazio ou violação de permissão.

---

## 4. Trilha de Auditoria Imutável (WORM)

A tabela `backup_audit_logs` possui um trigger ativo que impede atualizações ou deleções:

```sql
CREATE TRIGGER trg_prevent_backup_audit_mod
BEFORE UPDATE OR DELETE ON public.backup_audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_backup_audit_modification();
```

Isso garante conformidade estrita com LGPD, ISO 27001 e SOC 2 Type II.
