-- ============================================================================
-- WORKPULSE ENTERPRISE — CARGA DE DADOS INICIAIS (SEED) & TRIGGERS DE PRODUÇÃO
-- Executado de forma estritamente idempotente (ON CONFLICT DO NOTHING)
-- ============================================================================

-- 1. TRIGGER AUTOMÁTICO: Vincular novos cadastros do auth.users com public.system_users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.system_users (
        auth_user_id,
        name,
        email,
        role,
        access_level,
        status,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'Administrador do Sistema'),
        COALESCE(NEW.raw_user_meta_data->>'access_level', 'ADMIN_GERAL'),
        'Ativo',
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
        auth_user_id = EXCLUDED.auth_user_id,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Auto-confirmar e-mails existentes (para liberar login imediato em produção/desenvolvimento)
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

-- 2. SEED: EMPLOYEES (10 Colaboradores Monitorados)
INSERT INTO public.employees (
    id, name, email, avatar, role, department, work_model, status,
    computer_host, ip_address, current_app, current_domain, productivity_score,
    worked_hours_today, productive_hours_today, unproductive_hours_today,
    neutral_hours_today, idle_hours_today, schedule_start, schedule_end,
    punch_in_time, overtime_minutes, pc_lock_enabled, pc_lock_status, agent_version
) VALUES
    ('emp-101', 'Ana Beatris Silva', 'ana.silva@workpulse.com.br', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'Desenvolvedora Full Stack Sr.', 'Engenharia', 'Home Office', 'Ativo', 'DEV-WIN11-042', '189.122.45.102', 'Visual Studio Code', 'github.com', 92, 7.2, 6.6, 0.2, 0.4, 0.2, '08:00', '17:00', '07:55', 0, true, 'Desbloqueado', '4.2.1-lts'),
    ('emp-102', 'Carlos Eduardo Mendes', 'carlos.mendes@workpulse.com.br', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'Executivo de Vendas Enterprise', 'Vendas', 'Híbrido', 'Ativo', 'SALES-MAC-018', '177.89.210.14', 'Salesforce CRM', 'salesforce.com', 88, 6.8, 5.9, 0.5, 0.4, 0.3, '08:30', '17:30', '08:28', 15, true, 'Desbloqueado', '4.2.1-lts'),
    ('emp-103', 'Mariana Costa Oliveira', 'mariana.costa@workpulse.com.br', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'Especialista em DHO & People Analytics', 'RH & Pessoas', 'Presencial', 'Ativo', 'RH-WIN11-005', '10.0.4.15', 'TOTVS Carol HCM', 'totvs.com.br', 85, 7, 5.8, 0.4, 0.8, 0.2, '08:00', '17:00', '08:02', 0, false, 'Desbloqueado', '4.2.1-lts'),
    ('emp-104', 'Lucas Gabriel Rocha', 'lucas.rocha@workpulse.com.br', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'Analista de Suporte N2', 'Atendimento & Suporte', 'Home Office', 'Ocioso', 'SUP-WIN10-099', '201.55.12.88', 'Google Chrome', 'youtube.com', 54, 5.1, 2.8, 1.8, 0.5, 0.9, '09:00', '18:00', '09:15', 0, true, 'Bloqueado (Ociosidade)', '4.2.0'),
    ('emp-105', 'Juliana Fernandes Lima', 'juliana.lima@workpulse.com.br', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'Coordenadora de Marketing Digital', 'Marketing', 'Presencial', 'Ativo', 'MKT-MAC-003', '10.0.6.22', 'Canva Pro', 'canva.com', 91, 7.5, 6.8, 0.3, 0.4, 0.1, '08:30', '17:30', '08:25', 0, false, 'Desbloqueado', '4.2.1-lts'),
    ('emp-106', 'Fernando Henrique Souza', 'fernando.souza@workpulse.com.br', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'Engenheiro de DevOps & Cloud', 'Engenharia', 'Home Office', 'Ativo', 'DEV-LINUX-012', '179.184.22.41', 'Terminal / Docker CLI', 'aws.amazon.com', 95, 8, 7.6, 0.1, 0.3, 0.1, '08:00', '17:00', '07:50', 60, true, 'Desbloqueado', '4.2.1-lts'),
    ('emp-107', 'Beatriz Martins Castro', 'beatriz.castro@workpulse.com.br', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', 'Supervisora de Customer Success', 'Atendimento & Suporte', 'Presencial', 'Ativo', 'CS-WIN11-008', '10.0.4.55', 'Zendesk Support', 'zendesk.com', 87, 6.9, 6, 0.4, 0.5, 0.2, '08:00', '17:00', '08:00', 0, false, 'Desbloqueado', '4.2.1-lts'),
    ('emp-108', 'Rodrigo Silveira Dias', 'rodrigo.dias@workpulse.com.br', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', 'Analista Financeiro Pleno', 'Financeiro & Jurídico', 'Híbrido', 'Ativo', 'FIN-WIN11-002', '10.0.8.10', 'SAP S/4HANA', 'sap.corp', 93, 7.4, 6.9, 0.1, 0.4, 0.1, '09:00', '18:00', '08:58', 0, true, 'Desbloqueado', '4.2.1-lts'),
    ('emp-109', 'Camila Rossi Ferreira', 'camila.ferreira@workpulse.com.br', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150', 'Product Designer Lead', 'Engenharia', 'Home Office', 'Ausente', 'DES-MAC-004', '186.211.90.15', 'Figma', 'figma.com', 79, 4.8, 3.8, 0.4, 0.6, 0.8, '08:30', '17:30', '08:35', 0, true, 'Desbloqueado', '4.2.1-lts'),
    ('emp-110', 'Thiago Alves Peixoto', 'thiago.peixoto@workpulse.com.br', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', 'SDR - Prospecção Ativa', 'Vendas', 'Presencial', 'Estação Bloqueada', 'SDR-WIN10-019', '10.0.5.101', 'Bloqueio Corporativo', 'workpulse.local', 41, 3.2, 1.3, 1.5, 0.4, 0.8, '09:00', '18:00', '09:05', 0, true, 'Bloqueado (Horário de Almoço)', '4.1.9')
ON CONFLICT (id) DO NOTHING;

-- 3. SEED: APP CLASSIFICATION RULES
INSERT INTO public.app_classification_rules (
    id, app_name, process_name, domain_pattern, category, group_name, target_department, description, is_ai_suggested
) VALUES
    ('rule-01', 'Visual Studio Code', 'code.exe', 'github.com', 'Produtivo', 'IDE & Desenvolvimento', 'Engenharia', 'Ambiente de desenvolvimento oficial corporativo', false),
    ('rule-02', 'Salesforce CRM', 'chrome.exe', 'salesforce.com', 'Produtivo', 'CRM & Vendas', 'Vendas', 'Gestão de pipeline de clientes e oportunidades', false),
    ('rule-03', 'TOTVS Carol HCM', 'carol_agent.exe', 'totvs.com.br', 'Produtivo', 'Gestão de RH & Folha', 'RH & Pessoas', 'Sistema integrado de gestão de ponto e pessoas', false),
    ('rule-04', 'Zendesk Support', 'chrome.exe', 'zendesk.com', 'Produtivo', 'Atendimento & Chamados', 'Atendimento & Suporte', 'Central de atendimento a clientes externos', false),
    ('rule-05', 'Canva Pro', 'Canva.exe', 'canva.com', 'Produtivo', 'Design & Marketing', 'Marketing', 'Criação de peças de comunicação institucional', false),
    ('rule-06', 'Figma Desktop', 'Figma.exe', 'figma.com', 'Produtivo', 'UX/UI & Prototipagem', 'Engenharia', 'Plataforma colaborativa de design de produto', false),
    ('rule-07', 'SAP S/4HANA GUI', 'saplogon.exe', 'sap.corp', 'Produtivo', 'ERP Corporativo', 'Financeiro & Jurídico', 'Sistema de conciliação bancária e faturamento', false),
    ('rule-08', 'Google Chrome (YouTube Geral)', 'chrome.exe', 'youtube.com', 'Improdutivo', 'Streaming de Vídeo & Mídia', 'Geral', 'Consumo de vídeos externos não relacionados ao trabalho', true),
    ('rule-09', 'Spotify Desktop', 'spotify.exe', 'spotify.com', 'Neutro', 'Música de Fundo', 'Geral', 'Reprodutor de áudio permitido para foco individual', false),
    ('rule-10', 'Steam Client', 'steam.exe', 'steampowered.com', 'Improdutivo', 'Jogos & Lazer', 'Geral', 'Plataforma de jogos terminantemente vetada em PCs corporativos', false)
ON CONFLICT (id) DO NOTHING;

-- 4. SEED: SITE BLOCK RULES
INSERT INTO public.site_block_rules (
    id, title, category_group, domain_pattern, blocked_departments, work_models, action, active
) VALUES
    ('blk-01', 'Bloqueio de Sites de Apostas & Cassinos', 'Jogos & Apostas', '*bet365.com;*blaze.com;*sportingbet.com;*betano.com', ARRAY['Geral']::TEXT[], ARRAY['Presencial', 'Híbrido', 'Home Office']::TEXT[], 'Bloqueio Total', true),
    ('blk-02', 'Restrição de Redes Sociais em Horário Central', 'Redes Sociais', '*tiktok.com;*instagram.com;*facebook.com;*x.com', ARRAY['Atendimento & Suporte', 'Vendas', 'Financeiro & Jurídico']::TEXT[], ARRAY['Presencial', 'Híbrido']::TEXT[], 'Aviso com Justificativa', true),
    ('blk-03', 'Prevenção de Vazamento via Webtorrent & P2P', 'Segurança & Vazamento', '*torrent*;*thepiratebay.*;*1337x.*;*megaupload.*', ARRAY['Geral']::TEXT[], ARRAY['Presencial', 'Híbrido', 'Home Office']::TEXT[], 'Bloqueio Total', true),
    ('blk-04', 'Bloqueio de Streaming em Conexão Corporativa', 'Consumo de Banda', '*netflix.com;*primevideo.com;*disneyplus.com', ARRAY['Geral']::TEXT[], ARRAY['Presencial']::TEXT[], 'Alerta ao Gestor', false)
ON CONFLICT (id) DO NOTHING;

-- 5. SEED: PC LOCK POLICIES (Colunas oficiais da tabela)
INSERT INTO public.pc_lock_policies (
    id, name, target_department, work_model_target, cutoff_time, grace_period_minutes, auto_lock_after_cutoff, block_weekend_use, lock_message, active
) VALUES
    ('lock-pol-1', 'Bloqueio Rígido Pós-Expediente - Geral', 'Todas as Áreas', 'Todos', '18:15', 15, true, true, 'Atenção colaborador: Seu expediente encerrou às 18:00. O computador foi bloqueado automaticamente de acordo com as diretrizes de descanso da jornada e LGPD.', true),
    ('lock-pol-2', 'Restrição de Horas Extras sem Aprovação prévia no RH', 'Atendimento & Suporte', 'Home Office', '18:00', 10, true, true, 'Sua jornada no Home Office foi finalizada. Para continuar trabalhando, é necessária autorização prévia de Hora Extra pelo sistema de ponto.', true)
ON CONFLICT (id) DO NOTHING;

-- 6. SEED: IT ASSETS (Inventário de TI)
INSERT INTO public.it_assets (
    id, asset_tag, name, category, brand_model, serial_number, status, lifecycle_stage,
    supplier, invoice_number, purchase_date, warranty_expiry, assigned_to, assigned_employee_id,
    location, room_id, purchase_price, current_value, notes
) VALUES
    ('ast-101', 'PAT-2026-0001', 'Servidor Principal de Virtualização VMware', 'hardware_server', 'Dell PowerEdge R750 dual Intel Xeon', 'SN-DELL-8849201', 'em_uso', 'utilizacao', 'Dell Computers Brasil', 'NF-884920', '2024-02-15', '2028-02-15', 'Ana Beatris Silva (Engenharia)', 'emp-101', 'Rack R01 - Posição 42U', 'room_dc', 48500, 38800, 'Servidor crítico rodando ESXi 8.0 com 256GB RAM e 8TB NVMe em RAID-10.'),
    ('ast-102', 'PAT-2026-0002', 'Notebook Dell Latitude 5430 (Dev Sr.)', 'hardware_notebook', 'Dell Latitude 5430 Core i7 32GB', 'SN-LAT-5430-8812', 'em_uso', 'utilizacao', 'Dell Computers Brasil', 'NF-891024', '2024-04-10', '2027-04-10', 'Ana Beatris Silva', 'emp-101', 'Home Office - Estação DEV-WIN11-042', 'room_ho', 7800, 6240, 'Estação primária de desenvolvimento.'),
    ('ast-103', 'PAT-2026-0003', 'Apple MacBook Pro 16 M3 Max (Vendas)', 'hardware_notebook', 'Apple MacBook Pro 16 M3 Max 36GB', 'SN-APL-MBP16-9901', 'em_uso', 'utilizacao', 'Apple Corporate Brasil', 'NF-APL-12904', '2024-01-20', '2026-01-20', 'Carlos Eduardo Mendes', 'emp-102', 'Comercial - Estação SALES-MAC-018', 'room_sales', 24500, 20825, 'Equipamento corporativo executivo de vendas enterprise.'),
    ('ast-104', 'PAT-2026-0004', 'Workstation Lenovo ThinkStation P360 (RH)', 'hardware_desktop', 'Lenovo ThinkStation P360 i7 16GB', 'SN-LNV-P360-4491', 'em_uso', 'utilizacao', 'Lenovo Brasil Enterprise', 'NF-LNV-8821', '2023-11-05', '2026-11-05', 'Mariana Costa Oliveira', 'emp-103', 'RH & Pessoas - Sala 204', 'room_rh', 6400, 4800, 'Desktop corporativo dedicado a People Analytics e Folha.'),
    ('ast-105', 'PAT-2026-0005', 'Switch Core Cisco Catalyst 9300 48P PoE+', 'hardware_network', 'Cisco Catalyst C9300-48P-A', 'SN-CSCO-9300-0012', 'em_uso', 'utilizacao', 'Cisco Systems Brasil', 'NF-CSC-4412', '2023-08-15', '2028-08-15', 'Infraestrutura & Redes', NULL, 'Rack R01 - Switch Core 01', 'room_dc', 32000, 25600, 'Switch central de distribuição com stack de 480 Gbps e redundância de fonte.'),
    ('ast-106', 'PAT-2026-0006', 'Firewall NGFW Fortinet FortiGate 100F', 'hardware_network', 'Fortinet FortiGate FG-100F Dual Power', 'SN-FGT-100F-8871', 'em_uso', 'utilizacao', 'Fortinet Solutions Brasil', 'NF-FGT-9921', '2023-09-01', '2027-09-01', 'Segurança da Informação', NULL, 'Rack R01 - Borda Perimetral', 'room_dc', 28900, 23120, 'Appliance de borda com IPS, antivírus de fluxo e inspeção SSL ativa.'),
    ('ast-107', 'PAT-2026-0007', 'Storage NAS Synology RackStation RS3621xs+', 'hardware_storage', 'Synology RS3621xs+ 12-Bay 96TB', 'SN-SYN-RS36-5512', 'em_uso', 'utilizacao', 'Synology Enterprise Storage', 'NF-SYN-3301', '2024-01-10', '2029-01-10', 'WorkPulse Backup Engine', NULL, 'Rack R02 - Storage Local', 'room_dc', 38000, 34200, 'Destino de storage local DAS/SMB para snapshots do Backup Engine com ZFS.'),
    ('ast-108', 'PAT-2026-0008', 'Dell OptiPlex 7090 Micro (Estoque Reserva)', 'hardware_desktop', 'Dell OptiPlex 7090 Micro i5 16GB', 'SN-DELL-OPT7-0099', 'em_estoque', 'homologacao', 'Dell Computers Brasil', 'NF-899120', '2024-06-01', '2027-06-01', 'Almoxarifado TI', NULL, 'Armário A2 - Estoque Reserva TI', 'room_ti_stock', 4950, 4950, 'Micro desktop pronto com imagem corporativa para substituição imediata.')
ON CONFLICT (id) DO NOTHING;

-- 7. SEED: SUPPLIERS (Fornecedores)
INSERT INTO public.suppliers (
    id, name, cnpj, contact_name, email, phone, category, active
) VALUES
    ('sup-01', 'Dell Computers Brasil Ltda', '72.381.189/0001-10', 'Carlos Eduardo Mendes', 'enterprise_br@dell.com', '+55 11 4004-0100', 'Hardware & Servidores', true),
    ('sup-02', 'Apple Corporate Brasil', '00.623.904/0001-73', 'Juliana Paes', 'business_latam@apple.com', '+55 11 5503-0000', 'Notebooks & Mobile', true),
    ('sup-03', 'Lenovo Tecnologia Brasil', '03.776.438/0001-52', 'Roberto Fonseca', 'vendas_corp@lenovo.com', '+55 11 3889-8000', 'Desktops & Workstations', true),
    ('sup-04', 'Cisco do Brasil Ltda', '01.077.904/0001-40', 'Fernando Souza', 'enterprise_networking@cisco.com', '+55 11 5508-2000', 'Redes & Switches', true),
    ('sup-05', 'Fortinet do Brasil Informática', '07.391.248/0001-90', 'Mariana Costa', 'latam_security@fortinet.com', '+55 11 3524-8800', 'Firewall & Cibersegurança', true)
ON CONFLICT (id) DO NOTHING;

-- 8. SEED: BACKUP DESTINATIONS (Destinos de Backup Padrão)
INSERT INTO public.backup_destinations (
    id, tenant_id, name, type, endpoint, bucket_or_path, is_default, is_active
) VALUES
    ('dst-local-01', 'tenant-default', 'Storage Local Primário (NAS Synology RS3621)', 'LOCAL', '/mnt/workpulse_storage/primary', '/backups', true, true),
    ('dst-s3-01', 'tenant-default', 'Nuvem AWS S3 Seguro (Glacier Instant Retrieval)', 'S3', 'https://s3.sa-east-1.amazonaws.com', 'workpulse-enterprise-cold-vault', false, true)
ON CONFLICT (id) DO NOTHING;

// 9. SEED: BACKUP JOBS
INSERT INTO public.backup_jobs (
    id, tenant_id, name, source_paths, destination_id, schedule_cron, strategy, compression_algorithm, encryption_algorithm, retention_daily, retention_weekly, retention_monthly, is_active
) VALUES
    ('job-daily-01', 'tenant-default', 'Backup Diário Contínuo de Estações e Dados Críticos', ARRAY['/home', '/var/data', 'C:\\WorkPulse\\Data']::TEXT[], 'dst-local-01', '0 2 * * *', 'INCREMENTAL', 'ZSTD', 'AES-256-GCM', 7, 4, 12, true)
ON CONFLICT (id) DO NOTHING;
