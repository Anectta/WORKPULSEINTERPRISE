-- ============================================================================
-- WORKPULSE ENTERPRISE — BACKUP PLATFORM CONTROL PLANE MIGRATION
-- Migration Version: 20260911000000_backup_platform_control_plane
-- Target: Supabase PostgreSQL (Production / Staging / Local)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABELA: backup_agents (Agentes Registrados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.backup_agents (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    machine_id VARCHAR(128) NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    platform VARCHAR(32) NOT NULL,
    architecture VARCHAR(32) NOT NULL,
    agent_version VARCHAR(32) NOT NULL,
    engine_version VARCHAR(32) NOT NULL,
    protocol_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    status VARCHAR(32) NOT NULL DEFAULT 'OFFLINE', -- ONLINE, OFFLINE, RUNNING, PAUSED, ERROR
    capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
    auth_token_hash VARCHAR(128),
    last_heartbeat_at TIMESTAMPTZ,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. TABELA: backup_destinations (Repositórios de Armazenamento)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.backup_destinations (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    provider_type VARCHAR(32) NOT NULL, -- LOCAL, SMB, SFTP, S3
    base_uri TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    secret_key_ref VARCHAR(128),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. TABELA: backup_jobs (Políticas e Definições de Tarefas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.backup_jobs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    job_type VARCHAR(32) NOT NULL, -- FULL, INCREMENTAL, DIFFERENTIAL, MIRROR, TWO_WAY_SYNC
    priority INT NOT NULL DEFAULT 3, -- 1 (Crítico) a 4 (Baixo)
    source_config JSONB NOT NULL,
    destination_id VARCHAR(64) NOT NULL REFERENCES public.backup_destinations(id) ON DELETE RESTRICT,
    policy_config JSONB NOT NULL,
    assigned_agent_id VARCHAR(64) REFERENCES public.backup_agents(id) ON DELETE SET NULL,
    schedule_cron VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    last_execution_id VARCHAR(64),
    next_scheduled_run TIMESTAMPTZ,
    is_paused BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. TABELA: backup_executions (Histórico e Execuções de Backup)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.backup_executions (
    execution_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    job_id VARCHAR(64) NOT NULL REFERENCES public.backup_jobs(id) ON DELETE CASCADE,
    agent_id VARCHAR(64) REFERENCES public.backup_agents(id) ON DELETE SET NULL,
    execution_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'RUNNING',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    duration_ms BIGINT NOT NULL DEFAULT 0,
    files_scanned INT NOT NULL DEFAULT 0,
    files_processed INT NOT NULL DEFAULT 0,
    files_failed INT NOT NULL DEFAULT 0,
    bytes_scanned BIGINT NOT NULL DEFAULT 0,
    bytes_processed BIGINT NOT NULL DEFAULT 0,
    bytes_transferred BIGINT NOT NULL DEFAULT 0,
    manifest_hash VARCHAR(64),
    error_summary TEXT,
    is_protected BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. TABELA: backup_snapshots (Catálogo e Snapshots Históricos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.backup_snapshots (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    execution_id VARCHAR(64) NOT NULL REFERENCES public.backup_executions(execution_id) ON DELETE CASCADE,
    job_id VARCHAR(64) NOT NULL REFERENCES public.backup_jobs(id) ON DELETE CASCADE,
    root_path TEXT NOT NULL,
    manifest_hash VARCHAR(64) NOT NULL,
    snapshot_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_files INT NOT NULL DEFAULT 0,
    total_bytes BIGINT NOT NULL DEFAULT 0,
    retention_until TIMESTAMPTZ,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. TABELA: backup_restore_requests (Solicitações de Restauração)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.backup_restore_requests (
    request_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    job_id VARCHAR(64) NOT NULL REFERENCES public.backup_jobs(id) ON DELETE RESTRICT,
    execution_id VARCHAR(64),
    agent_id VARCHAR(64) NOT NULL REFERENCES public.backup_agents(id) ON DELETE RESTRICT,
    target_directory TEXT NOT NULL,
    restore_mode VARCHAR(32) NOT NULL DEFAULT 'FULL',
    selected_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
    overwrite_policy VARCHAR(32) NOT NULL DEFAULT 'ALWAYS',
    conflict_policy VARCHAR(32) NOT NULL DEFAULT 'OVERWRITE',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    requested_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. TABELA: backup_restore_executions (Execuções de Restauração)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.backup_restore_executions (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    request_id VARCHAR(64) NOT NULL REFERENCES public.backup_restore_requests(request_id) ON DELETE CASCADE,
    agent_id VARCHAR(64) NOT NULL REFERENCES public.backup_agents(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'RUNNING',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    duration_ms BIGINT NOT NULL DEFAULT 0,
    files_restored INT NOT NULL DEFAULT 0,
    files_skipped INT NOT NULL DEFAULT 0,
    files_failed INT NOT NULL DEFAULT 0,
    bytes_restored BIGINT NOT NULL DEFAULT 0,
    integrity_passed BOOLEAN NOT NULL DEFAULT false,
    error_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. TABELA: agent_commands (Fila de Comandos Despachados aos Agentes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agent_commands (
    command_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    target_agent_id VARCHAR(64) NOT NULL REFERENCES public.backup_agents(id) ON DELETE CASCADE,
    command_type VARCHAR(64) NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    signature VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    result_payload JSONB,
    error_message TEXT
);

-- ============================================================================
-- 9. TABELA: agent_telemetry (Telemetria Contínua dos Nós)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.agent_telemetry (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    agent_id VARCHAR(64) NOT NULL REFERENCES public.backup_agents(id) ON DELETE CASCADE,
    cpu_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    memory_rss_bytes BIGINT NOT NULL DEFAULT 0,
    disk_free_bytes BIGINT NOT NULL DEFAULT 0,
    active_jobs_count INT NOT NULL DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 10. TABELA: backup_alerts (Alertas Operacionais & Incidentes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.backup_alerts (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL, -- CRITICAL, HIGH, MEDIUM, LOW, INFO
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    source VARCHAR(64) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 11. TABELA: backup_audit_logs (Trilha de Auditoria com HMAC)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.backup_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    actor_type VARCHAR(32) NOT NULL, -- USER, AGENT, SYSTEM, API
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45) NOT NULL,
    hmac_hash VARCHAR(64) NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 12. ÍNDICES DE PERFORMANCE & MULTI-TENANT
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_backup_agents_tenant ON public.backup_agents (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_backup_destinations_tenant ON public.backup_destinations (tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_tenant ON public.backup_jobs (tenant_id, status, is_paused);
CREATE INDEX IF NOT EXISTS idx_backup_executions_tenant_job ON public.backup_executions (tenant_id, job_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_snapshots_execution ON public.backup_snapshots (execution_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_backup_restore_req_tenant ON public.backup_restore_requests (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_commands_target ON public.agent_commands (target_agent_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_agent_telemetry_agent_time ON public.agent_telemetry (agent_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_backup_alerts_tenant ON public.backup_alerts (tenant_id, is_resolved, severity);
CREATE INDEX IF NOT EXISTS idx_backup_audit_tenant_time ON public.backup_audit_logs (tenant_id, created_at DESC);

-- ============================================================================
-- 13. FUNÇÃO & TRIGGER DE IMUTABILIDADE PARA AUDIT LOGS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_backup_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'A trilha de auditoria do Backup Control Plane é estritamente imutável (WORM). UPDATE e DELETE são terminantemente proibidos.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_backup_audit_mod ON public.backup_audit_logs;
CREATE TRIGGER trg_prevent_backup_audit_mod
BEFORE UPDATE OR DELETE ON public.backup_audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_backup_audit_modification();

-- ============================================================================
-- 14. ROW LEVEL SECURITY (RLS) — ISOLAMENTO CRÍTICO POR TENANT
-- ============================================================================
ALTER TABLE public.backup_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_restore_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_restore_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper macro para validação de tenant extraído do JWT do Supabase
-- auth.jwt() -> 'app_metadata' ->> 'tenant_id'
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claim.tenant_id', true),
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id'),
        (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'tenant_id')
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Políticas de RLS para backup_agents
CREATE POLICY rls_backup_agents_tenant ON public.backup_agents
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para backup_destinations
CREATE POLICY rls_backup_destinations_tenant ON public.backup_destinations
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para backup_jobs
CREATE POLICY rls_backup_jobs_tenant ON public.backup_jobs
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para backup_executions
CREATE POLICY rls_backup_executions_tenant ON public.backup_executions
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para backup_snapshots
CREATE POLICY rls_backup_snapshots_tenant ON public.backup_snapshots
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para backup_restore_requests
CREATE POLICY rls_backup_restore_requests_tenant ON public.backup_restore_requests
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para backup_restore_executions
CREATE POLICY rls_backup_restore_executions_tenant ON public.backup_restore_executions
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para agent_commands
CREATE POLICY rls_agent_commands_tenant ON public.agent_commands
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para agent_telemetry
CREATE POLICY rls_agent_telemetry_tenant ON public.agent_telemetry
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para backup_alerts
CREATE POLICY rls_backup_alerts_tenant ON public.backup_alerts
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para backup_audit_logs (Apenas SELECT e INSERT para usuários do tenant)
CREATE POLICY rls_backup_audit_select ON public.backup_audit_logs
    FOR SELECT
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

CREATE POLICY rls_backup_audit_insert ON public.backup_audit_logs
    FOR INSERT
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');
