-- ============================================================================
-- WORKPULSE — HARDENING DE AUTENTICAÇÃO E RLS (auditoria 2026-11-20)
--
-- Corrige:
--   1. handle_new_user criava todo usuário novo como ADMIN_GERAL e aceitava o
--      nível de acesso enviado pelo próprio cliente (raw_user_meta_data).
--   2. Políticas RLS "USING (true)": qualquer autenticado tinha CRUD total em
--      todas as tabelas de negócio, inclusive system_users (autopromoção).
--   3. current_tenant_id() lia tenant de user_metadata (editável pelo usuário).
--
-- Idempotente: pode ser executada mais de uma vez.
-- Aplicar no SQL Editor do Supabase (ou via supabase db push).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Garante que a conta administradora continue com acesso após o hardening
-- ----------------------------------------------------------------------------
INSERT INTO public.system_users (auth_user_id, name, email, role, access_level, status, created_at, updated_at)
SELECT u.id, 'ANECTTA Soluções em Tecnologia', u.email, 'Administrador do Sistema', 'ADMIN_GERAL', 'Ativo', NOW(), NOW()
FROM auth.users u
WHERE lower(u.email) = 'anectta@anectta.com.br'
ON CONFLICT (email) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    access_level = 'ADMIN_GERAL',
    status = 'Ativo',
    updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 1. Trigger de novos usuários: nível mínimo, sem confiar em metadados do cliente
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.system_users (
        auth_user_id, name, email, role, access_level, status, created_at, updated_at
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        'Colaborador',      -- papel e nível NUNCA vêm de raw_user_meta_data
        'COLABORADOR',      -- promoção somente por um ADMIN_GERAL
        'Ativo',
        NOW(),
        NOW()
    )
    -- Só vincula um cadastro pré-existente que ainda não tenha conta de autenticação
    ON CONFLICT (email) DO UPDATE SET
        auth_user_id = EXCLUDED.auth_user_id,
        updated_at = NOW()
    WHERE public.system_users.auth_user_id IS NULL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. Funções auxiliares de autorização (leem system_users pelo auth.uid())
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wp_current_access_level()
RETURNS VARCHAR AS $$
    SELECT su.access_level
    FROM public.system_users su
    WHERE su.auth_user_id = auth.uid()
      AND su.status <> 'Inativo'
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.wp_is_member()
RETURNS BOOLEAN AS $$
    SELECT public.wp_current_access_level() IS NOT NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.wp_is_admin()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(public.wp_current_access_level() = 'ADMIN_GERAL', false);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Pode alterar dados operacionais (colaboradores, ativos, ponto)
CREATE OR REPLACE FUNCTION public.wp_can_manage()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(public.wp_current_access_level() IN ('ADMIN_GERAL', 'DIRETORIA', 'GESTORES', 'RH_PEOPLE'), false);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ----------------------------------------------------------------------------
-- 3. Substitui as políticas permissivas
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    pol TEXT;
BEGIN
    FOREACH pol IN ARRAY ARRAY[
        'authenticated_read_system_users:system_users', 'authenticated_write_system_users:system_users',
        'authenticated_read_employees:employees', 'authenticated_write_employees:employees',
        'authenticated_read_activity_logs:activity_logs', 'authenticated_write_activity_logs:activity_logs',
        'authenticated_read_app_rules:app_classification_rules', 'authenticated_write_app_rules:app_classification_rules',
        'authenticated_read_site_blocks:site_block_rules', 'authenticated_write_site_blocks:site_block_rules',
        'authenticated_read_pc_policies:pc_lock_policies', 'authenticated_write_pc_policies:pc_lock_policies',
        'authenticated_read_it_assets:it_assets', 'authenticated_write_it_assets:it_assets',
        'authenticated_read_suppliers:suppliers', 'authenticated_write_suppliers:suppliers',
        'authenticated_read_speed_tests:network_speed_tests', 'authenticated_write_speed_tests:network_speed_tests',
        'authenticated_read_timecard:timecard_records', 'authenticated_write_timecard:timecard_records',
        -- nomes das novas políticas (permite reexecutar a migração)
        'wp_select_system_users:system_users', 'wp_admin_write_system_users:system_users',
        'wp_select_employees:employees', 'wp_manage_employees:employees',
        'wp_select_activity_logs:activity_logs', 'wp_insert_activity_logs:activity_logs', 'wp_admin_change_activity_logs:activity_logs',
        'wp_select_app_rules:app_classification_rules', 'wp_admin_write_app_rules:app_classification_rules',
        'wp_select_site_blocks:site_block_rules', 'wp_admin_write_site_blocks:site_block_rules',
        'wp_select_pc_policies:pc_lock_policies', 'wp_admin_write_pc_policies:pc_lock_policies',
        'wp_select_it_assets:it_assets', 'wp_manage_it_assets:it_assets',
        'wp_select_suppliers:suppliers', 'wp_manage_suppliers:suppliers',
        'wp_select_speed_tests:network_speed_tests', 'wp_insert_speed_tests:network_speed_tests', 'wp_admin_change_speed_tests:network_speed_tests',
        'wp_select_timecard:timecard_records', 'wp_manage_timecard:timecard_records'
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', split_part(pol, ':', 1), split_part(pol, ':', 2));
    END LOOP;
END $$;

-- system_users: cada um lê o próprio registro; administradores e RH leem todos; só ADMIN_GERAL altera
CREATE POLICY wp_select_system_users ON public.system_users
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid() OR public.wp_current_access_level() IN ('ADMIN_GERAL', 'RH_PEOPLE'));
CREATE POLICY wp_admin_write_system_users ON public.system_users
    FOR ALL TO authenticated
    USING (public.wp_is_admin()) WITH CHECK (public.wp_is_admin());

-- Dados operacionais: leitura para membros ativos; escrita para gestão
CREATE POLICY wp_select_employees ON public.employees
    FOR SELECT TO authenticated USING (public.wp_is_member());
CREATE POLICY wp_manage_employees ON public.employees
    FOR ALL TO authenticated USING (public.wp_can_manage()) WITH CHECK (public.wp_can_manage());

CREATE POLICY wp_select_it_assets ON public.it_assets
    FOR SELECT TO authenticated USING (public.wp_is_member());
CREATE POLICY wp_manage_it_assets ON public.it_assets
    FOR ALL TO authenticated USING (public.wp_can_manage()) WITH CHECK (public.wp_can_manage());

CREATE POLICY wp_select_suppliers ON public.suppliers
    FOR SELECT TO authenticated USING (public.wp_is_member());
CREATE POLICY wp_manage_suppliers ON public.suppliers
    FOR ALL TO authenticated USING (public.wp_can_manage()) WITH CHECK (public.wp_can_manage());

CREATE POLICY wp_select_timecard ON public.timecard_records
    FOR SELECT TO authenticated USING (public.wp_is_member());
CREATE POLICY wp_manage_timecard ON public.timecard_records
    FOR ALL TO authenticated USING (public.wp_can_manage()) WITH CHECK (public.wp_can_manage());

-- Políticas de configuração (regras, bloqueios, travas): só ADMIN_GERAL altera
CREATE POLICY wp_select_app_rules ON public.app_classification_rules
    FOR SELECT TO authenticated USING (public.wp_is_member());
CREATE POLICY wp_admin_write_app_rules ON public.app_classification_rules
    FOR ALL TO authenticated USING (public.wp_is_admin()) WITH CHECK (public.wp_is_admin());

CREATE POLICY wp_select_site_blocks ON public.site_block_rules
    FOR SELECT TO authenticated USING (public.wp_is_member());
CREATE POLICY wp_admin_write_site_blocks ON public.site_block_rules
    FOR ALL TO authenticated USING (public.wp_is_admin()) WITH CHECK (public.wp_is_admin());

CREATE POLICY wp_select_pc_policies ON public.pc_lock_policies
    FOR SELECT TO authenticated USING (public.wp_is_member());
CREATE POLICY wp_admin_write_pc_policies ON public.pc_lock_policies
    FOR ALL TO authenticated USING (public.wp_is_admin()) WITH CHECK (public.wp_is_admin());

-- Registros de telemetria: membros inserem; só ADMIN_GERAL altera ou apaga
CREATE POLICY wp_select_activity_logs ON public.activity_logs
    FOR SELECT TO authenticated USING (public.wp_is_member());
CREATE POLICY wp_insert_activity_logs ON public.activity_logs
    FOR INSERT TO authenticated WITH CHECK (public.wp_is_member());
CREATE POLICY wp_admin_change_activity_logs ON public.activity_logs
    FOR UPDATE TO authenticated USING (public.wp_is_admin()) WITH CHECK (public.wp_is_admin());

CREATE POLICY wp_select_speed_tests ON public.network_speed_tests
    FOR SELECT TO authenticated USING (public.wp_is_member());
CREATE POLICY wp_insert_speed_tests ON public.network_speed_tests
    FOR INSERT TO authenticated WITH CHECK (public.wp_is_member());
CREATE POLICY wp_admin_change_speed_tests ON public.network_speed_tests
    FOR UPDATE TO authenticated USING (public.wp_is_admin()) WITH CHECK (public.wp_is_admin());

-- DELETE em telemetria somente para administradores
DROP POLICY IF EXISTS wp_admin_delete_activity_logs ON public.activity_logs;
CREATE POLICY wp_admin_delete_activity_logs ON public.activity_logs
    FOR DELETE TO authenticated USING (public.wp_is_admin());
DROP POLICY IF EXISTS wp_admin_delete_speed_tests ON public.network_speed_tests;
CREATE POLICY wp_admin_delete_speed_tests ON public.network_speed_tests
    FOR DELETE TO authenticated USING (public.wp_is_admin());

-- ----------------------------------------------------------------------------
-- 4. Tenant só a partir de app_metadata (definido pelo servidor, não pelo usuário)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claim.tenant_id', true),
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id')
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
