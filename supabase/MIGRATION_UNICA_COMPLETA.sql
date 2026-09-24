-- ============================================================================
-- WORKPULSE ENTERPRISE — SCRIPT COMPLETO DE BANCO DE DADOS (SUPABASE)
-- EXECUTE APENAS ESTE ARQUIVO UMA VEZ NO SQL EDITOR DO SUPABASE
-- ============================================================================

-- ============================================================================
-- WORKPULSE ENTERPRISE — CORE BUSINESS TABLES MIGRATION
-- Migration Version: 20260924000000_core_business_tables
-- Target: Supabase PostgreSQL (Production Environment)
-- ============================================================================

-- Extensões obrigatórias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. SYSTEM_USERS — Usuários do painel WorkPulse (ligados ao Supabase Auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.system_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(255) NOT NULL DEFAULT 'Colaborador',
    access_level VARCHAR(64) NOT NULL DEFAULT 'COLABORADOR',
    -- ADMIN_GERAL | DIRETORIA | GESTORES | RH_PEOPLE | COLABORADOR
    avatar TEXT,
    department VARCHAR(255) NOT NULL DEFAULT 'Geral',
    ip_address VARCHAR(45),
    computer_host VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'Ativo',
    -- Ativo | Ausente | Ocioso | Inativo
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. EMPLOYEES — Colaboradores monitorados
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.employees (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    avatar TEXT,
    role VARCHAR(255) NOT NULL,
    department VARCHAR(128) NOT NULL,
    -- Engenharia | Vendas | RH & Pessoas | Atendimento & Suporte | Marketing | Financeiro & Jurídico
    work_model VARCHAR(32) NOT NULL DEFAULT 'Presencial',
    -- Presencial | Home Office | Híbrido
    status VARCHAR(64) NOT NULL DEFAULT 'Ativo',
    -- Ativo | Ocioso | Ausente | Fora do Expediente | Estação Bloqueada
    computer_host VARCHAR(128),
    ip_address VARCHAR(45),
    current_app VARCHAR(255) DEFAULT '',
    current_domain VARCHAR(255),
    productivity_score INT NOT NULL DEFAULT 0,
    worked_hours_today NUMERIC(5,2) NOT NULL DEFAULT 0,
    productive_hours_today NUMERIC(5,2) NOT NULL DEFAULT 0,
    unproductive_hours_today NUMERIC(5,2) NOT NULL DEFAULT 0,
    neutral_hours_today NUMERIC(5,2) NOT NULL DEFAULT 0,
    idle_hours_today NUMERIC(5,2) NOT NULL DEFAULT 0,
    schedule_start VARCHAR(5) NOT NULL DEFAULT '08:00',
    schedule_end VARCHAR(5) NOT NULL DEFAULT '17:00',
    punch_in_time VARCHAR(5),
    punch_out_time VARCHAR(5),
    overtime_minutes INT NOT NULL DEFAULT 0,
    pc_lock_enabled BOOLEAN NOT NULL DEFAULT false,
    pc_lock_status VARCHAR(64) NOT NULL DEFAULT 'Desbloqueado',
    agent_version VARCHAR(32) DEFAULT '1.0.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. ACTIVITY_LOGS — Logs de uso de aplicativos por colaborador
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,
    department VARCHAR(128) NOT NULL,
    work_model VARCHAR(32) NOT NULL DEFAULT 'Presencial',
    app_name VARCHAR(255) NOT NULL,
    window_title TEXT,
    domain VARCHAR(255),
    category VARCHAR(32) NOT NULL DEFAULT 'Neutro',
    -- Produtivo | Improdutivo | Neutro
    duration_minutes INT NOT NULL DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pc_host VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_employee_id ON public.activity_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);

-- ============================================================================
-- 4. APP_CLASSIFICATION_RULES — Motor de Classificação de Aplicativos
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.app_classification_rules (
    id VARCHAR(64) PRIMARY KEY,
    app_name VARCHAR(255) NOT NULL,
    process_name VARCHAR(255),
    domain_pattern VARCHAR(512),
    category VARCHAR(32) NOT NULL DEFAULT 'Neutro',
    -- Produtivo | Improdutivo | Neutro
    group_name VARCHAR(128) NOT NULL DEFAULT 'Geral',
    target_department VARCHAR(128) NOT NULL DEFAULT 'Todas as Áreas',
    description TEXT,
    is_ai_suggested BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. SITE_BLOCK_RULES — Regras de Bloqueio de Sites e Estações
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.site_block_rules (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category_group VARCHAR(128) NOT NULL DEFAULT 'Geral',
    domain_pattern VARCHAR(512) NOT NULL,
    blocked_departments JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Array de Department strings
    work_models JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Array de WorkModel strings
    action VARCHAR(64) NOT NULL DEFAULT 'Bloqueio Total',
    -- Bloqueio Total | Aviso com Justificativa | Alerta ao Gestor
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. PC_LOCK_POLICIES — Políticas de Bloqueio de Estação
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pc_lock_policies (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    target_department VARCHAR(128) NOT NULL DEFAULT 'Todas as Áreas',
    work_model_target VARCHAR(32) NOT NULL DEFAULT 'Todos',
    -- Todos | Home Office | Presencial
    cutoff_time VARCHAR(5) NOT NULL DEFAULT '18:00',
    grace_period_minutes INT NOT NULL DEFAULT 15,
    auto_lock_after_cutoff BOOLEAN NOT NULL DEFAULT true,
    block_weekend_use BOOLEAN NOT NULL DEFAULT false,
    lock_message TEXT DEFAULT 'Expediente encerrado. Estação bloqueada automaticamente.',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. IT_ASSETS — Inventário ITAM (simplificado; campos principais)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.it_assets (
    id VARCHAR(64) PRIMARY KEY,
    asset_tag VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL,
    brand_model VARCHAR(255),
    serial_number VARCHAR(255),
    status VARCHAR(64) NOT NULL DEFAULT 'em_estoque',
    -- em_uso | em_estoque | em_manutencao | descartado | reservado
    lifecycle_stage VARCHAR(64),
    supplier VARCHAR(255),
    invoice_number VARCHAR(128),
    purchase_date DATE,
    warranty_expiry DATE,
    assigned_to VARCHAR(255),
    assigned_employee_id VARCHAR(64),
    location VARCHAR(255),
    room_id VARCHAR(64),
    notes TEXT,
    purchase_price NUMERIC(12,2),
    current_value NUMERIC(12,2),
    depreciation_method VARCHAR(64),
    depreciation_rate NUMERIC(5,2),
    history JSONB NOT NULL DEFAULT '[]'::jsonb,
    maintenance_records JSONB NOT NULL DEFAULT '[]'::jsonb,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_it_assets_status ON public.it_assets(status);
CREATE INDEX IF NOT EXISTS idx_it_assets_category ON public.it_assets(category);

-- ============================================================================
-- 8. SUPPLIERS — Fornecedores
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18),
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(32),
    category VARCHAR(128),
    rating INT CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9. NETWORK_SPEED_TESTS — Resultados do Velocímetro NetPulse
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.network_speed_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    download_mbps NUMERIC(10,2),
    upload_mbps NUMERIC(10,2),
    ping_ms NUMERIC(8,2),
    jitter_ms NUMERIC(8,2),
    packet_loss_pct NUMERIC(5,2),
    server_location VARCHAR(255),
    isp VARCHAR(255),
    connection_type VARCHAR(64),
    -- Fibra | Cable | DSL | Wi-Fi | 4G | 5G
    signal_strength_dbm INT,
    -- Wi-Fi only
    channel INT,
    -- Wi-Fi only
    frequency_band VARCHAR(16),
    -- 2.4GHz | 5GHz | 6GHz
    test_duration_seconds INT,
    raw_results JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_speed_tests_user_id ON public.network_speed_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_network_speed_tests_created_at ON public.network_speed_tests(created_at DESC);

-- ============================================================================
-- 10. TIMECARD_RECORDS — Registros de Ponto
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.timecard_records (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,
    department VARCHAR(128) NOT NULL,
    date DATE NOT NULL,
    ponto_punch_in VARCHAR(16),
    ponto_punch_out VARCHAR(16),
    ponto_total_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
    agent_active_worked_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
    agent_productive_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
    agent_idle_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
    correlation_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
    system_source VARCHAR(64) NOT NULL DEFAULT 'Manual',
    -- Ahgora | TOTVS Carol | Ponto Secullum | Senior X | Manual
    has_anomaly BOOLEAN NOT NULL DEFAULT false,
    anomaly_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timecard_records_employee_id ON public.timecard_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_timecard_records_date ON public.timecard_records(date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) — Todas as tabelas requerem autenticação
-- ============================================================================

-- Habilitar RLS
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_classification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_block_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_lock_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_speed_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timecard_records ENABLE ROW LEVEL SECURITY;

-- Políticas: usuários autenticados podem ler e escrever (multi-tenant futuro: adicionar tenant_id)
DROP POLICY IF EXISTS "authenticated_read_system_users" ON public.system_users;
CREATE POLICY "authenticated_read_system_users" ON public.system_users
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_write_system_users" ON public.system_users;
CREATE POLICY "authenticated_write_system_users" ON public.system_users
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_employees" ON public.employees;
CREATE POLICY "authenticated_read_employees" ON public.employees
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_write_employees" ON public.employees;
CREATE POLICY "authenticated_write_employees" ON public.employees
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_activity_logs" ON public.activity_logs;
CREATE POLICY "authenticated_read_activity_logs" ON public.activity_logs
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_write_activity_logs" ON public.activity_logs;
CREATE POLICY "authenticated_write_activity_logs" ON public.activity_logs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_app_rules" ON public.app_classification_rules;
CREATE POLICY "authenticated_read_app_rules" ON public.app_classification_rules
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_write_app_rules" ON public.app_classification_rules;
CREATE POLICY "authenticated_write_app_rules" ON public.app_classification_rules
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_site_blocks" ON public.site_block_rules;
CREATE POLICY "authenticated_read_site_blocks" ON public.site_block_rules
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_write_site_blocks" ON public.site_block_rules;
CREATE POLICY "authenticated_write_site_blocks" ON public.site_block_rules
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_pc_policies" ON public.pc_lock_policies;
CREATE POLICY "authenticated_read_pc_policies" ON public.pc_lock_policies
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_write_pc_policies" ON public.pc_lock_policies;
CREATE POLICY "authenticated_write_pc_policies" ON public.pc_lock_policies
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_it_assets" ON public.it_assets;
CREATE POLICY "authenticated_read_it_assets" ON public.it_assets
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_write_it_assets" ON public.it_assets;
CREATE POLICY "authenticated_write_it_assets" ON public.it_assets
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_suppliers" ON public.suppliers;
CREATE POLICY "authenticated_read_suppliers" ON public.suppliers
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_write_suppliers" ON public.suppliers;
CREATE POLICY "authenticated_write_suppliers" ON public.suppliers
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_speed_tests" ON public.network_speed_tests;
CREATE POLICY "authenticated_read_speed_tests" ON public.network_speed_tests
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_write_speed_tests" ON public.network_speed_tests;
CREATE POLICY "authenticated_write_speed_tests" ON public.network_speed_tests
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_timecard" ON public.timecard_records;
CREATE POLICY "authenticated_read_timecard" ON public.timecard_records
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_write_timecard" ON public.timecard_records;
CREATE POLICY "authenticated_write_timecard" ON public.timecard_records
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- TRIGGERS — updated_at automático
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_system_users_updated_at ON public.system_users;
CREATE TRIGGER trg_system_users_updated_at BEFORE UPDATE ON public.system_users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_employees_updated_at ON public.employees;
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_app_rules_updated_at ON public.app_classification_rules;
CREATE TRIGGER trg_app_rules_updated_at BEFORE UPDATE ON public.app_classification_rules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_site_blocks_updated_at ON public.site_block_rules;
CREATE TRIGGER trg_site_blocks_updated_at BEFORE UPDATE ON public.site_block_rules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_pc_policies_updated_at ON public.pc_lock_policies;
CREATE TRIGGER trg_pc_policies_updated_at BEFORE UPDATE ON public.pc_lock_policies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_it_assets_updated_at ON public.it_assets;
CREATE TRIGGER trg_it_assets_updated_at BEFORE UPDATE ON public.it_assets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================


-- ============================================================================
-- WORKPULSE ENTERPRISE — SECURITY & PENTEST PRODUCTION MIGRATION
-- Migration Version: 20260910000000_security_pentest_production
-- Target: Supabase PostgreSQL (Production Environment)
-- ============================================================================

-- Extensões obrigatórias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABELAS DE GOVERNANÇA, ESCOPO E AUTORIZAÇÃO
-- ============================================================================

-- Tabela: security_scopes
CREATE TABLE IF NOT EXISTS public.security_scopes (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    authorized_by_user_id VARCHAR(64) NOT NULL,
    authorized_by_name VARCHAR(255) NOT NULL,
    authorized_by_email VARCHAR(255) NOT NULL,
    authorized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    authorization_terms_version VARCHAR(32) NOT NULL,
    authorization_document_hash VARCHAR(64) NOT NULL, -- SHA-256
    authorized_ip_origin VARCHAR(45) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, REVOKED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64) NOT NULL
);

-- Tabela: security_policies
CREATE TABLE IF NOT EXISTS public.security_policies (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    max_requests_per_second INT NOT NULL DEFAULT 5,
    max_concurrent_targets INT NOT NULL DEFAULT 2,
    allowed_time_windows JSONB NOT NULL DEFAULT '{"weekdays": ["20:00-06:00"], "weekends": ["all"]}'::jsonb,
    connection_timeout_ms INT NOT NULL DEFAULT 4000,
    safe_mode_only BOOLEAN NOT NULL DEFAULT true,
    user_agent_override VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: security_targets
CREATE TABLE IF NOT EXISTS public.security_targets (
    id VARCHAR(64) PRIMARY KEY,
    scope_id VARCHAR(64) NOT NULL REFERENCES public.security_scopes(id) ON DELETE RESTRICT,
    tenant_id VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL, -- ASSET_CI, DOMAIN_FQDN, IP_ADDRESS, CIDR_RANGE, WEB_URL, API_ENDPOINT
    target_value VARCHAR(512) NOT NULL,
    is_in_scope BOOLEAN NOT NULL DEFAULT true,
    linked_ci_id VARCHAR(64),
    linked_asset_id VARCHAR(64),
    criticality VARCHAR(32) NOT NULL DEFAULT 'MEDIA', -- CRITICA, ALTA, MEDIA, BAIXA
    validation_status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, VALIDATED_DNS, REJECTED_SSRF
    resolved_ips TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. TABELAS DE PENTEST CONTROL PLANE & EXECUÇÃO
-- ============================================================================

-- Tabela: pentest_projects
CREATE TABLE IF NOT EXISTS public.pentest_projects (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    objective TEXT,
    methodology VARCHAR(32) NOT NULL, -- OWASP_WSTG, PTES, NIST_800_115, etc.
    scope_id VARCHAR(64) NOT NULL REFERENCES public.security_scopes(id) ON DELETE RESTRICT,
    authorization_id VARCHAR(64),
    roe_id VARCHAR(64),
    test_profile_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING_APPROVAL, APPROVED, RUNNING, COMPLETED, CANCELLED
    created_by_user_id VARCHAR(64) NOT NULL,
    created_by_name VARCHAR(255) NOT NULL,
    approved_by_user_id VARCHAR(64),
    approved_by_name VARCHAR(255),
    approved_at TIMESTAMPTZ,
    approval_justification TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: pentest_executions
CREATE TABLE IF NOT EXISTS public.pentest_executions (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(64) NOT NULL REFERENCES public.pentest_projects(id) ON DELETE CASCADE,
    execution_plan JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'RUNNING', -- RUNNING, COMPLETED, CANCELLED, EMERGENCY_STOPPED, FAILED
    progress_pct INT NOT NULL DEFAULT 0,
    current_step VARCHAR(255),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    duration_seconds INT DEFAULT 0,
    executed_by_user_id VARCHAR(64) NOT NULL,
    executed_by_name VARCHAR(255) NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{"requestsSent": 0, "bytesTransferred": 0, "testsExecuted": 0}'::jsonb
);

-- Tabela: pentest_execution_logs
CREATE TABLE IF NOT EXISTS public.pentest_execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id VARCHAR(64) NOT NULL REFERENCES public.pentest_executions(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level VARCHAR(16) NOT NULL, -- INFO, WARN, ERROR, SECURITY
    category VARCHAR(64),
    target VARCHAR(512),
    message TEXT NOT NULL
);

-- ============================================================================
-- 3. SCANS, VULNERABILIDADES (FINDINGS) E EVIDÊNCIAS
-- ============================================================================

-- Tabela: security_scans
CREATE TABLE IF NOT EXISTS public.security_scans (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    code VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    scan_type VARCHAR(32) NOT NULL,
    scope_id VARCHAR(64) NOT NULL REFERENCES public.security_scopes(id) ON DELETE RESTRICT,
    policy_id VARCHAR(64) NOT NULL REFERENCES public.security_policies(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
    triggered_by_user_id VARCHAR(64) NOT NULL,
    triggered_by_name VARCHAR(255) NOT NULL,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: security_findings
CREATE TABLE IF NOT EXISTS public.security_findings (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    code VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(16) NOT NULL, -- CRITICAL, HIGH, MEDIUM, LOW, INFO
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- OPEN, CONFIRMED, REMEDIATION, WAITING_RETEST, RESOLVED, ACCEPTED_RISK, FALSE_POSITIVE
    cvss_score NUMERIC(3,1) NOT NULL DEFAULT 0.0,
    cwe_id VARCHAR(32),
    category VARCHAR(64) NOT NULL,
    risk_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    confidence VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED', -- CONFIRMED, SUSPECTED, TENTATIVE
    target_id VARCHAR(64) REFERENCES public.security_targets(id) ON DELETE SET NULL,
    target_value VARCHAR(512) NOT NULL,
    linked_ci_id VARCHAR(64),
    linked_asset_id VARCHAR(64),
    impact TEXT,
    recommendation TEXT,
    justification TEXT,
    status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    sla_due_date TIMESTAMPTZ,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: security_evidences
CREATE TABLE IF NOT EXISTS public.security_evidences (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    finding_id VARCHAR(64) NOT NULL REFERENCES public.security_findings(id) ON DELETE CASCADE,
    scan_id VARCHAR(64),
    execution_id VARCHAR(64),
    type VARCHAR(32) NOT NULL, -- HTTP_REQUEST_RESPONSE, PORT_BANNER, SSL_CERTIFICATE, LOG_ENTRY, CONFIG_SNIPPET
    payload TEXT NOT NULL,
    sanitized_payload TEXT,
    sha256_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. REMEDIAÇÃO, HARDENING, RISCOS E RETESTE
-- ============================================================================

-- Tabela: security_remediations
CREATE TABLE IF NOT EXISTS public.security_remediations (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    finding_id VARCHAR(64) NOT NULL REFERENCES public.security_findings(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, READY_FOR_RETEST, VALIDATED, CANCELLED
    priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM', -- CRITICAL, HIGH, MEDIUM, LOW
    assigned_to_user_id VARCHAR(64),
    assigned_to_name VARCHAR(255),
    assigned_to_email VARCHAR(255),
    due_date TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    sla_breached BOOLEAN NOT NULL DEFAULT false,
    ticket_id VARCHAR(64),
    ticket_code VARCHAR(64),
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: accepted_risks
CREATE TABLE IF NOT EXISTS public.accepted_risks (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    finding_id VARCHAR(64) NOT NULL REFERENCES public.security_findings(id) ON DELETE CASCADE,
    justification TEXT NOT NULL,
    business_impact_justification TEXT,
    compensatory_controls TEXT,
    approved_by_user_id VARCHAR(64) NOT NULL,
    approved_by_name VARCHAR(255) NOT NULL,
    approved_by_role VARCHAR(64) NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    review_date TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: retest_comparisons
CREATE TABLE IF NOT EXISTS public.retest_comparisons (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    finding_id VARCHAR(64) NOT NULL REFERENCES public.security_findings(id) ON DELETE CASCADE,
    retest_id VARCHAR(64) NOT NULL,
    tested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tested_by_user_id VARCHAR(64) NOT NULL,
    tested_by_name VARCHAR(255) NOT NULL,
    outcome VARCHAR(32) NOT NULL, -- RESOLVED_FIXED, STILL_VULNERABLE, REGRESSED, INCONCLUSIVE
    previous_severity VARCHAR(16) NOT NULL,
    new_severity VARCHAR(16),
    previous_cvss NUMERIC(3,1) NOT NULL,
    new_cvss NUMERIC(3,1) NOT NULL,
    technical_notes TEXT NOT NULL,
    before_evidence_summary TEXT,
    after_evidence_summary TEXT
);

-- ============================================================================
-- 5. RELATÓRIOS, COMPLIANCE E TRILHA DE AUDITORIA
-- ============================================================================

-- Tabela: security_reports
CREATE TABLE IF NOT EXISTS public.security_reports (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    type VARCHAR(32) NOT NULL, -- PENTEST, EXECUTIVE, VULNERABILITY, REMEDIATION, COMPLIANCE
    title VARCHAR(255) NOT NULL,
    description TEXT,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'GENERATED',
    confidentiality_level VARCHAR(32) NOT NULL DEFAULT 'CONFIDENTIAL',
    generated_by JSONB NOT NULL,
    content_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: report_share_tokens
CREATE TABLE IF NOT EXISTS public.report_share_tokens (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    report_id VARCHAR(64) NOT NULL REFERENCES public.security_reports(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    access_count INT NOT NULL DEFAULT 0,
    revoked BOOLEAN NOT NULL DEFAULT false,
    allowed_permissions TEXT[] NOT NULL DEFAULT '{"VIEW", "DOWNLOAD"}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: security_audit_logs (Imutável, Append-Only)
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(64) NOT NULL,
    actor_user_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_email VARCHAR(255) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    ip_origin VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
    previous_state JSONB,
    new_state JSONB,
    audit_hmac_sha256 VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. ÍNDICES DE ALTA PERFORMANCE (B-TREE & COMPOSITE)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sec_targets_tenant_scope ON public.security_targets(tenant_id, scope_id);
CREATE INDEX IF NOT EXISTS idx_sec_findings_tenant_status ON public.security_findings(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_sec_findings_tenant_severity ON public.security_findings(tenant_id, severity);
CREATE INDEX IF NOT EXISTS idx_sec_findings_target ON public.security_findings(target_id);
CREATE INDEX IF NOT EXISTS idx_sec_findings_ci ON public.security_findings(linked_ci_id);
CREATE INDEX IF NOT EXISTS idx_sec_evidences_finding ON public.security_evidences(finding_id);
CREATE INDEX IF NOT EXISTS idx_sec_remediations_tenant_status ON public.security_remediations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_sec_reports_tenant_type ON public.security_reports(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_sec_share_tokens_token ON public.report_share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_sec_audit_tenant_created ON public.security_audit_logs(tenant_id, created_at DESC);

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) & POLÍTICAS DE ISOLAMENTO MULTI-TENANT
-- ============================================================================

-- Habilita RLS em todas as tabelas
ALTER TABLE public.security_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pentest_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pentest_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pentest_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_remediations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accepted_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retest_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_share_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function para obter tenant_id a partir do JWT do Supabase Auth
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS VARCHAR AS $$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id',
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id')
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper function para obter o papel (role) do usuário
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS VARCHAR AS $$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::jsonb ->> 'user_role',
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
        'SECURITY_VIEWER'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Políticas de Isolamento Multi-Tenant
DROP POLICY IF EXISTS tenant_isolation_scopes ON public.security_scopes;
CREATE POLICY tenant_isolation_scopes ON public.security_scopes
    FOR ALL USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_targets ON public.security_targets;
CREATE POLICY tenant_isolation_targets ON public.security_targets
    FOR ALL USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_projects ON public.pentest_projects;
CREATE POLICY tenant_isolation_projects ON public.pentest_projects
    FOR ALL USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_findings ON public.security_findings;
CREATE POLICY tenant_isolation_findings ON public.security_findings
    FOR ALL USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_evidences ON public.security_evidences;
CREATE POLICY tenant_isolation_evidences ON public.security_evidences
    FOR ALL USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_remediations ON public.security_remediations;
CREATE POLICY tenant_isolation_remediations ON public.security_remediations
    FOR ALL USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_reports ON public.security_reports;
CREATE POLICY tenant_isolation_reports ON public.security_reports
    FOR ALL USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Audit Logs: READ-ONLY e APPEND-ONLY (Proibido UPDATE ou DELETE)
DROP POLICY IF EXISTS audit_logs_select_tenant ON public.security_audit_logs;
CREATE POLICY audit_logs_select_tenant ON public.security_audit_logs
    FOR SELECT USING (tenant_id = public.get_current_tenant_id());

DROP POLICY IF EXISTS audit_logs_insert_tenant ON public.security_audit_logs;
CREATE POLICY audit_logs_insert_tenant ON public.security_audit_logs
    FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());

REVOKE UPDATE, DELETE ON public.security_audit_logs FROM authenticated, anon, public;

-- ============================================================================
-- 8. TRIGGER DE IMUTABILIDADE E INTEGRIDADE DE AUDITORIA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'VIOLAÇÃO DE SEGURANÇA: Registros de auditoria são estritamente imutáveis (append-only). Proibida exclusão ou alteração.'
        USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_update_delete ON public.security_audit_logs;
DROP TRIGGER IF EXISTS trg_prevent_audit_update_delete ON public.security_audit_logs;
CREATE TRIGGER trg_prevent_audit_update_delete
BEFORE UPDATE OR DELETE ON public.security_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_audit_tampering();


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
DROP POLICY IF EXISTS rls_backup_agents_tenant ON public.backup_agents;
CREATE POLICY rls_backup_agents_tenant ON public.backup_agents
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para backup_destinations
DROP POLICY IF EXISTS rls_backup_destinations_tenant ON public.backup_destinations;
CREATE POLICY rls_backup_destinations_tenant ON public.backup_destinations
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para backup_jobs
DROP POLICY IF EXISTS rls_backup_jobs_tenant ON public.backup_jobs;
CREATE POLICY rls_backup_jobs_tenant ON public.backup_jobs
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para backup_executions
DROP POLICY IF EXISTS rls_backup_executions_tenant ON public.backup_executions;
CREATE POLICY rls_backup_executions_tenant ON public.backup_executions
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para backup_snapshots
DROP POLICY IF EXISTS rls_backup_snapshots_tenant ON public.backup_snapshots;
CREATE POLICY rls_backup_snapshots_tenant ON public.backup_snapshots
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para backup_restore_requests
DROP POLICY IF EXISTS rls_backup_restore_requests_tenant ON public.backup_restore_requests;
CREATE POLICY rls_backup_restore_requests_tenant ON public.backup_restore_requests
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para backup_restore_executions
DROP POLICY IF EXISTS rls_backup_restore_executions_tenant ON public.backup_restore_executions;
CREATE POLICY rls_backup_restore_executions_tenant ON public.backup_restore_executions
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para agent_commands
DROP POLICY IF EXISTS rls_agent_commands_tenant ON public.agent_commands;
CREATE POLICY rls_agent_commands_tenant ON public.agent_commands
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para agent_telemetry
DROP POLICY IF EXISTS rls_agent_telemetry_tenant ON public.agent_telemetry;
CREATE POLICY rls_agent_telemetry_tenant ON public.agent_telemetry
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para backup_alerts
DROP POLICY IF EXISTS rls_backup_alerts_tenant ON public.backup_alerts;
CREATE POLICY rls_backup_alerts_tenant ON public.backup_alerts
    FOR ALL
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role')
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

-- Políticas de RLS para backup_audit_logs (Apenas SELECT e INSERT para usuários do tenant)
DROP POLICY IF EXISTS rls_backup_audit_select ON public.backup_audit_logs;
CREATE POLICY rls_backup_audit_select ON public.backup_audit_logs
    FOR SELECT
    USING (tenant_id = public.current_tenant_id() OR current_user = 'service_role');

DROP POLICY IF EXISTS rls_backup_audit_insert ON public.backup_audit_logs;
CREATE POLICY rls_backup_audit_insert ON public.backup_audit_logs
    FOR INSERT
    WITH CHECK (tenant_id = public.current_tenant_id() OR current_user = 'service_role');
