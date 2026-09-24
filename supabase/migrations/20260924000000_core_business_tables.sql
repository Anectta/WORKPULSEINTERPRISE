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
CREATE POLICY "authenticated_read_system_users" ON public.system_users
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_write_system_users" ON public.system_users
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_employees" ON public.employees
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_write_employees" ON public.employees
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_activity_logs" ON public.activity_logs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_write_activity_logs" ON public.activity_logs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_app_rules" ON public.app_classification_rules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_write_app_rules" ON public.app_classification_rules
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_site_blocks" ON public.site_block_rules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_write_site_blocks" ON public.site_block_rules
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_pc_policies" ON public.pc_lock_policies
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_write_pc_policies" ON public.pc_lock_policies
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_it_assets" ON public.it_assets
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_write_it_assets" ON public.it_assets
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_suppliers" ON public.suppliers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_write_suppliers" ON public.suppliers
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_speed_tests" ON public.network_speed_tests
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_write_speed_tests" ON public.network_speed_tests
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_timecard" ON public.timecard_records
    FOR SELECT TO authenticated USING (true);

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

CREATE TRIGGER trg_system_users_updated_at BEFORE UPDATE ON public.system_users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_app_rules_updated_at BEFORE UPDATE ON public.app_classification_rules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_site_blocks_updated_at BEFORE UPDATE ON public.site_block_rules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_pc_policies_updated_at BEFORE UPDATE ON public.pc_lock_policies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_it_assets_updated_at BEFORE UPDATE ON public.it_assets
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
