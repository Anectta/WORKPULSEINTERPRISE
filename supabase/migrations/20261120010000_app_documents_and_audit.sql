-- ============================================================================
-- WORKPULSE — PERSISTÊNCIA DE DADOS QUE SÓ EXISTIAM NO NAVEGADOR (auditoria 2026-11-20)
--
-- 1. app_documents: coleções de configuração e da Agenda Pro (salas, categorias,
--    status, fornecedores, travas de PC, eventos, contatos, tarefas, ocorrências).
-- 2. app_audit_logs: trilha de auditoria somente de inserção (sem UPDATE/DELETE).
--
-- Requer a migração 20261120000000_auth_trigger_and_rls_hardening.sql
-- (funções wp_is_member / wp_can_manage / wp_is_admin).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_documents (
    collection VARCHAR(64) NOT NULL,
    id VARCHAR(128) NOT NULL,
    data JSONB NOT NULL,
    updated_by UUID DEFAULT auth.uid(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS idx_app_documents_collection ON public.app_documents(collection);

ALTER TABLE public.app_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wp_select_app_documents ON public.app_documents;
CREATE POLICY wp_select_app_documents ON public.app_documents
    FOR SELECT TO authenticated USING (public.wp_is_member());

DROP POLICY IF EXISTS wp_manage_app_documents ON public.app_documents;
CREATE POLICY wp_manage_app_documents ON public.app_documents
    FOR ALL TO authenticated USING (public.wp_can_manage()) WITH CHECK (public.wp_can_manage());

-- Mantém updated_at/updated_by coerentes em toda alteração
CREATE OR REPLACE FUNCTION public.wp_touch_app_document()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_touch_app_document ON public.app_documents;
CREATE TRIGGER trg_touch_app_document
    BEFORE INSERT OR UPDATE ON public.app_documents
    FOR EACH ROW EXECUTE PROCEDURE public.wp_touch_app_document();

-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_audit_logs (
    id VARCHAR(128) PRIMARY KEY,
    data JSONB NOT NULL,
    actor_user_id UUID DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_audit_logs_created_at ON public.app_audit_logs(created_at DESC);

ALTER TABLE public.app_audit_logs ENABLE ROW LEVEL SECURITY;

-- Membros registram eventos; somente ADMIN_GERAL e RH leem; ninguém altera ou apaga
DROP POLICY IF EXISTS wp_insert_app_audit_logs ON public.app_audit_logs;
CREATE POLICY wp_insert_app_audit_logs ON public.app_audit_logs
    FOR INSERT TO authenticated WITH CHECK (public.wp_is_member());

DROP POLICY IF EXISTS wp_select_app_audit_logs ON public.app_audit_logs;
CREATE POLICY wp_select_app_audit_logs ON public.app_audit_logs
    FOR SELECT TO authenticated
    USING (public.wp_current_access_level() IN ('ADMIN_GERAL', 'RH_PEOPLE'));

-- O autor e a data do registro são definidos pelo banco, não pelo cliente
CREATE OR REPLACE FUNCTION public.wp_stamp_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actor_user_id = auth.uid();
    NEW.created_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_stamp_audit_log ON public.app_audit_logs;
CREATE TRIGGER trg_stamp_audit_log
    BEFORE INSERT ON public.app_audit_logs
    FOR EACH ROW EXECUTE PROCEDURE public.wp_stamp_audit_log();
