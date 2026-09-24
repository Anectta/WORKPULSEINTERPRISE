const fs = require('fs');
const path = require('path');

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (Array.isArray(val) || typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

// 1. Employees Seed Data
const employees = [
  {
    id: 'emp-101', name: 'Ana Beatris Silva', email: 'ana.silva@workpulse.com.br',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    role: 'Desenvolvedora Full Stack Sr.', department: 'Engenharia', work_model: 'Home Office', status: 'Ativo',
    computer_host: 'DEV-WIN11-042', ip_address: '189.122.45.102', current_app: 'Visual Studio Code', current_domain: 'github.com',
    productivity_score: 92, worked_hours_today: 7.2, productive_hours_today: 6.6, unproductive_hours_today: 0.2,
    neutral_hours_today: 0.4, idle_hours_today: 0.2, schedule_start: '08:00', schedule_end: '17:00',
    punch_in_time: '07:55', punch_out_time: null, overtime_minutes: 0, pc_lock_enabled: true, pc_lock_status: 'Desbloqueado', agent_version: '4.2.1-lts'
  },
  {
    id: 'emp-102', name: 'Carlos Eduardo Mendes', email: 'carlos.mendes@workpulse.com.br',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    role: 'Executivo de Vendas Enterprise', department: 'Vendas', work_model: 'Híbrido', status: 'Ativo',
    computer_host: 'SALES-MAC-018', ip_address: '177.89.210.14', current_app: 'Salesforce CRM', current_domain: 'salesforce.com',
    productivity_score: 88, worked_hours_today: 6.8, productive_hours_today: 5.9, unproductive_hours_today: 0.5,
    neutral_hours_today: 0.4, idle_hours_today: 0.3, schedule_start: '08:30', schedule_end: '17:30',
    punch_in_time: '08:28', punch_out_time: null, overtime_minutes: 15, pc_lock_enabled: true, pc_lock_status: 'Desbloqueado', agent_version: '4.2.1-lts'
  },
  {
    id: 'emp-103', name: 'Mariana Costa Oliveira', email: 'mariana.costa@workpulse.com.br',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    role: 'Especialista em DHO & People Analytics', department: 'RH & Pessoas', work_model: 'Presencial', status: 'Ativo',
    computer_host: 'RH-WIN11-005', ip_address: '10.0.4.15', current_app: 'TOTVS Carol HCM', current_domain: 'totvs.com.br',
    productivity_score: 85, worked_hours_today: 7.0, productive_hours_today: 5.8, unproductive_hours_today: 0.4,
    neutral_hours_today: 0.8, idle_hours_today: 0.2, schedule_start: '08:00', schedule_end: '17:00',
    punch_in_time: '08:02', punch_out_time: null, overtime_minutes: 0, pc_lock_enabled: false, pc_lock_status: 'Desbloqueado', agent_version: '4.2.1-lts'
  },
  {
    id: 'emp-104', name: 'Lucas Gabriel Rocha', email: 'lucas.rocha@workpulse.com.br',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    role: 'Analista de Suporte N2', department: 'Atendimento & Suporte', work_model: 'Home Office', status: 'Ocioso',
    computer_host: 'SUP-WIN10-099', ip_address: '201.55.12.88', current_app: 'Google Chrome', current_domain: 'youtube.com',
    productivity_score: 54, worked_hours_today: 5.1, productive_hours_today: 2.8, unproductive_hours_today: 1.8,
    neutral_hours_today: 0.5, idle_hours_today: 0.9, schedule_start: '09:00', schedule_end: '18:00',
    punch_in_time: '09:15', punch_out_time: null, overtime_minutes: 0, pc_lock_enabled: true, pc_lock_status: 'Bloqueado (Ociosidade)', agent_version: '4.2.0'
  },
  {
    id: 'emp-105', name: 'Juliana Fernandes Lima', email: 'juliana.lima@workpulse.com.br',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    role: 'Coordenadora de Marketing Digital', department: 'Marketing', work_model: 'Presencial', status: 'Ativo',
    computer_host: 'MKT-MAC-003', ip_address: '10.0.6.22', current_app: 'Canva Pro', current_domain: 'canva.com',
    productivity_score: 91, worked_hours_today: 7.5, productive_hours_today: 6.8, unproductive_hours_today: 0.3,
    neutral_hours_today: 0.4, idle_hours_today: 0.1, schedule_start: '08:30', schedule_end: '17:30',
    punch_in_time: '08:25', punch_out_time: null, overtime_minutes: 0, pc_lock_enabled: false, pc_lock_status: 'Desbloqueado', agent_version: '4.2.1-lts'
  },
  {
    id: 'emp-106', name: 'Fernando Henrique Souza', email: 'fernando.souza@workpulse.com.br',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    role: 'Engenheiro de DevOps & Cloud', department: 'Engenharia', work_model: 'Home Office', status: 'Ativo',
    computer_host: 'DEV-LINUX-012', ip_address: '179.184.22.41', current_app: 'Terminal / Docker CLI', current_domain: 'aws.amazon.com',
    productivity_score: 95, worked_hours_today: 8.0, productive_hours_today: 7.6, unproductive_hours_today: 0.1,
    neutral_hours_today: 0.3, idle_hours_today: 0.1, schedule_start: '08:00', schedule_end: '17:00',
    punch_in_time: '07:50', punch_out_time: null, overtime_minutes: 60, pc_lock_enabled: true, pc_lock_status: 'Desbloqueado', agent_version: '4.2.1-lts'
  },
  {
    id: 'emp-107', name: 'Beatriz Martins Castro', email: 'beatriz.castro@workpulse.com.br',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    role: 'Supervisora de Customer Success', department: 'Atendimento & Suporte', work_model: 'Presencial', status: 'Ativo',
    computer_host: 'CS-WIN11-008', ip_address: '10.0.4.55', current_app: 'Zendesk Support', current_domain: 'zendesk.com',
    productivity_score: 87, worked_hours_today: 6.9, productive_hours_today: 6.0, unproductive_hours_today: 0.4,
    neutral_hours_today: 0.5, idle_hours_today: 0.2, schedule_start: '08:00', schedule_end: '17:00',
    punch_in_time: '08:00', punch_out_time: null, overtime_minutes: 0, pc_lock_enabled: false, pc_lock_status: 'Desbloqueado', agent_version: '4.2.1-lts'
  },
  {
    id: 'emp-108', name: 'Rodrigo Silveira Dias', email: 'rodrigo.dias@workpulse.com.br',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    role: 'Analista Financeiro Pleno', department: 'Financeiro & Jurídico', work_model: 'Híbrido', status: 'Ativo',
    computer_host: 'FIN-WIN11-002', ip_address: '10.0.8.10', current_app: 'SAP S/4HANA', current_domain: 'sap.corp',
    productivity_score: 93, worked_hours_today: 7.4, productive_hours_today: 6.9, unproductive_hours_today: 0.1,
    neutral_hours_today: 0.4, idle_hours_today: 0.1, schedule_start: '09:00', schedule_end: '18:00',
    punch_in_time: '08:58', punch_out_time: null, overtime_minutes: 0, pc_lock_enabled: true, pc_lock_status: 'Desbloqueado', agent_version: '4.2.1-lts'
  },
  {
    id: 'emp-109', name: 'Camila Rossi Ferreira', email: 'camila.ferreira@workpulse.com.br',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150',
    role: 'Product Designer Lead', department: 'Engenharia', work_model: 'Home Office', status: 'Ausente',
    computer_host: 'DES-MAC-004', ip_address: '186.211.90.15', current_app: 'Figma', current_domain: 'figma.com',
    productivity_score: 79, worked_hours_today: 4.8, productive_hours_today: 3.8, unproductive_hours_today: 0.4,
    neutral_hours_today: 0.6, idle_hours_today: 0.8, schedule_start: '08:30', schedule_end: '17:30',
    punch_in_time: '08:35', punch_out_time: null, overtime_minutes: 0, pc_lock_enabled: true, pc_lock_status: 'Desbloqueado', agent_version: '4.2.1-lts'
  },
  {
    id: 'emp-110', name: 'Thiago Alves Peixoto', email: 'thiago.peixoto@workpulse.com.br',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    role: 'SDR - Prospecção Ativa', department: 'Vendas', work_model: 'Presencial', status: 'Estação Bloqueada',
    computer_host: 'SDR-WIN10-019', ip_address: '10.0.5.101', current_app: 'Bloqueio Corporativo', current_domain: 'workpulse.local',
    productivity_score: 41, worked_hours_today: 3.2, productive_hours_today: 1.3, unproductive_hours_today: 1.5,
    neutral_hours_today: 0.4, idle_hours_today: 0.8, schedule_start: '09:00', schedule_end: '18:00',
    punch_in_time: '09:05', punch_out_time: null, overtime_minutes: 0, pc_lock_enabled: true, pc_lock_status: 'Bloqueado (Horário de Almoço)', agent_version: '4.1.9'
  }
];

// 2. App Rules
const appRules = [
  { id: 'rule-01', app_name: 'Visual Studio Code', process_name: 'code.exe', domain_pattern: 'github.com', category: 'Produtivo', group_name: 'IDE & Desenvolvimento', target_department: 'Engenharia', description: 'Ambiente de desenvolvimento oficial corporativo', is_ai_suggested: false },
  { id: 'rule-02', app_name: 'Salesforce CRM', process_name: 'chrome.exe', domain_pattern: 'salesforce.com', category: 'Produtivo', group_name: 'CRM & Vendas', target_department: 'Vendas', description: 'Gestão de pipeline de clientes e oportunidades', is_ai_suggested: false },
  { id: 'rule-03', app_name: 'TOTVS Carol HCM', process_name: 'carol_agent.exe', domain_pattern: 'totvs.com.br', category: 'Produtivo', group_name: 'Gestão de RH & Folha', target_department: 'RH & Pessoas', description: 'Sistema integrado de gestão de ponto e pessoas', is_ai_suggested: false },
  { id: 'rule-04', app_name: 'Zendesk Support', process_name: 'chrome.exe', domain_pattern: 'zendesk.com', category: 'Produtivo', group_name: 'Atendimento & Chamados', target_department: 'Atendimento & Suporte', description: 'Central de atendimento a clientes externos', is_ai_suggested: false },
  { id: 'rule-05', app_name: 'Canva Pro', process_name: 'Canva.exe', domain_pattern: 'canva.com', category: 'Produtivo', group_name: 'Design & Marketing', target_department: 'Marketing', description: 'Criação de peças de comunicação institucional', is_ai_suggested: false },
  { id: 'rule-06', app_name: 'Figma Desktop', process_name: 'Figma.exe', domain_pattern: 'figma.com', category: 'Produtivo', group_name: 'UX/UI & Prototipagem', target_department: 'Engenharia', description: 'Plataforma colaborativa de design de produto', is_ai_suggested: false },
  { id: 'rule-07', app_name: 'SAP S/4HANA GUI', process_name: 'saplogon.exe', domain_pattern: 'sap.corp', category: 'Produtivo', group_name: 'ERP Corporativo', target_department: 'Financeiro & Jurídico', description: 'Sistema de conciliação bancária e faturamento', is_ai_suggested: false },
  { id: 'rule-08', app_name: 'Google Chrome (YouTube Geral)', process_name: 'chrome.exe', domain_pattern: 'youtube.com', category: 'Improdutivo', group_name: 'Streaming de Vídeo & Mídia', target_department: 'Geral', description: 'Consumo de vídeos externos não relacionados ao trabalho', is_ai_suggested: true },
  { id: 'rule-09', app_name: 'Spotify Desktop', process_name: 'spotify.exe', domain_pattern: 'spotify.com', category: 'Neutro', group_name: 'Música de Fundo', target_department: 'Geral', description: 'Reprodutor de áudio permitido para foco individual', is_ai_suggested: false },
  { id: 'rule-10', app_name: 'Steam Client', process_name: 'steam.exe', domain_pattern: 'steampowered.com', category: 'Improdutivo', group_name: 'Jogos & Lazer', target_department: 'Geral', description: 'Plataforma de jogos terminantemente vetada em PCs corporativos', is_ai_suggested: false }
];

// 3. Site Blocks (blocked_departments e work_models são JSONB no PostgreSQL)
const siteBlocks = [
  { id: 'blk-01', title: 'Bloqueio de Sites de Apostas & Cassinos', category_group: 'Jogos & Apostas', domain_pattern: '*bet365.com;*blaze.com;*sportingbet.com;*betano.com', blocked_departments: ['Geral'], work_models: ['Presencial', 'Híbrido', 'Home Office'], action: 'Bloqueio Total', active: true },
  { id: 'blk-02', title: 'Restrição de Redes Sociais em Horário Central', category_group: 'Redes Sociais', domain_pattern: '*tiktok.com;*instagram.com;*facebook.com;*x.com', blocked_departments: ['Atendimento & Suporte', 'Vendas', 'Financeiro & Jurídico'], work_models: ['Presencial', 'Híbrido'], action: 'Aviso com Justificativa', active: true },
  { id: 'blk-03', title: 'Prevenção de Vazamento via Webtorrent & P2P', category_group: 'Segurança & Vazamento', domain_pattern: '*torrent*;*thepiratebay.*;*1337x.*;*megaupload.*', blocked_departments: ['Geral'], work_models: ['Presencial', 'Híbrido', 'Home Office'], action: 'Bloqueio Total', active: true },
  { id: 'blk-04', title: 'Bloqueio de Streaming em Conexão Corporativa', category_group: 'Consumo de Banda', domain_pattern: '*netflix.com;*primevideo.com;*disneyplus.com', blocked_departments: ['Geral'], work_models: ['Presencial'], action: 'Alerta ao Gestor', active: false }
];

// 4. PC Lock Policies
const pcLockPolicies = [
  {
    id: 'lock-pol-1',
    name: 'Bloqueio Rígido Pós-Expediente - Geral',
    target_department: 'Todas as Áreas',
    work_model_target: 'Todos',
    cutoff_time: '18:15',
    grace_period_minutes: 15,
    auto_lock_after_cutoff: true,
    block_weekend_use: true,
    lock_message: 'Atenção colaborador: Seu expediente encerrou às 18:00. O computador foi bloqueado automaticamente de acordo com as diretrizes de descanso da jornada e LGPD.',
    active: true
  },
  {
    id: 'lock-pol-2',
    name: 'Restrição de Horas Extras sem Aprovação prévia no RH',
    target_department: 'Atendimento & Suporte',
    work_model_target: 'Home Office',
    cutoff_time: '18:00',
    grace_period_minutes: 10,
    auto_lock_after_cutoff: true,
    block_weekend_use: true,
    lock_message: 'Sua jornada no Home Office foi finalizada. Para continuar trabalhando, é necessária autorização prévia de Hora Extra pelo sistema de ponto.',
    active: true
  }
];

// 5. IT Assets
const itAssets = [
  {
    id: 'ast-101', asset_tag: 'PAT-2026-0001', name: 'Servidor Principal de Virtualização VMware', category: 'hardware_server',
    brand_model: 'Dell PowerEdge R750 dual Intel Xeon', serial_number: 'SN-DELL-8849201', status: 'em_uso', lifecycle_stage: 'utilizacao',
    supplier: 'Dell Computers Brasil', invoice_number: 'NF-884920', purchase_date: '2024-02-15', warranty_expiry: '2028-02-15',
    assigned_to: 'Ana Beatris Silva (Engenharia)', assigned_employee_id: 'emp-101', location: 'Rack R01 - Posição 42U', room_id: 'room_dc',
    purchase_price: 48500.00, current_value: 38800.00, notes: 'Servidor crítico rodando ESXi 8.0 com 256GB RAM e 8TB NVMe em RAID-10.'
  },
  {
    id: 'ast-102', asset_tag: 'PAT-2026-0002', name: 'Notebook Dell Latitude 5430 (Dev Sr.)', category: 'hardware_notebook',
    brand_model: 'Dell Latitude 5430 Core i7 32GB', serial_number: 'SN-LAT-5430-8812', status: 'em_uso', lifecycle_stage: 'utilizacao',
    supplier: 'Dell Computers Brasil', invoice_number: 'NF-891024', purchase_date: '2024-04-10', warranty_expiry: '2027-04-10',
    assigned_to: 'Ana Beatris Silva', assigned_employee_id: 'emp-101', location: 'Home Office - Estação DEV-WIN11-042', room_id: 'room_ho',
    purchase_price: 7800.00, current_value: 6240.00, notes: 'Estação primária de desenvolvimento.'
  },
  {
    id: 'ast-103', asset_tag: 'PAT-2026-0003', name: 'Apple MacBook Pro 16 M3 Max (Vendas)', category: 'hardware_notebook',
    brand_model: 'Apple MacBook Pro 16 M3 Max 36GB', serial_number: 'SN-APL-MBP16-9901', status: 'em_uso', lifecycle_stage: 'utilizacao',
    supplier: 'Apple Corporate Brasil', invoice_number: 'NF-APL-12904', purchase_date: '2024-01-20', warranty_expiry: '2026-01-20',
    assigned_to: 'Carlos Eduardo Mendes', assigned_employee_id: 'emp-102', location: 'Comercial - Estação SALES-MAC-018', room_id: 'room_sales',
    purchase_price: 24500.00, current_value: 20825.00, notes: 'Equipamento corporativo executivo de vendas enterprise.'
  },
  {
    id: 'ast-104', asset_tag: 'PAT-2026-0004', name: 'Workstation Lenovo ThinkStation P360 (RH)', category: 'hardware_desktop',
    brand_model: 'Lenovo ThinkStation P360 i7 16GB', serial_number: 'SN-LNV-P360-4491', status: 'em_uso', lifecycle_stage: 'utilizacao',
    supplier: 'Lenovo Brasil Enterprise', invoice_number: 'NF-LNV-8821', purchase_date: '2023-11-05', warranty_expiry: '2026-11-05',
    assigned_to: 'Mariana Costa Oliveira', assigned_employee_id: 'emp-103', location: 'RH & Pessoas - Sala 204', room_id: 'room_rh',
    purchase_price: 6400.00, current_value: 4800.00, notes: 'Desktop corporativo dedicado a People Analytics e Folha.'
  },
  {
    id: 'ast-105', asset_tag: 'PAT-2026-0005', name: 'Switch Core Cisco Catalyst 9300 48P PoE+', category: 'hardware_network',
    brand_model: 'Cisco Catalyst C9300-48P-A', serial_number: 'SN-CSCO-9300-0012', status: 'em_uso', lifecycle_stage: 'utilizacao',
    supplier: 'Cisco Systems Brasil', invoice_number: 'NF-CSC-4412', purchase_date: '2023-08-15', warranty_expiry: '2028-08-15',
    assigned_to: 'Infraestrutura & Redes', location: 'Rack R01 - Switch Core 01', room_id: 'room_dc',
    purchase_price: 32000.00, current_value: 25600.00, notes: 'Switch central de distribuição com stack de 480 Gbps e redundância de fonte.'
  },
  {
    id: 'ast-106', asset_tag: 'PAT-2026-0006', name: 'Firewall NGFW Fortinet FortiGate 100F', category: 'hardware_network',
    brand_model: 'Fortinet FortiGate FG-100F Dual Power', serial_number: 'SN-FGT-100F-8871', status: 'em_uso', lifecycle_stage: 'utilizacao',
    supplier: 'Fortinet Solutions Brasil', invoice_number: 'NF-FGT-9921', purchase_date: '2023-09-01', warranty_expiry: '2027-09-01',
    assigned_to: 'Segurança da Informação', location: 'Rack R01 - Borda Perimetral', room_id: 'room_dc',
    purchase_price: 28900.00, current_value: 23120.00, notes: 'Appliance de borda com IPS, antivírus de fluxo e inspeção SSL ativa.'
  },
  {
    id: 'ast-107', asset_tag: 'PAT-2026-0007', name: 'Storage NAS Synology RackStation RS3621xs+', category: 'hardware_storage',
    brand_model: 'Synology RS3621xs+ 12-Bay 96TB', serial_number: 'SN-SYN-RS36-5512', status: 'em_uso', lifecycle_stage: 'utilizacao',
    supplier: 'Synology Enterprise Storage', invoice_number: 'NF-SYN-3301', purchase_date: '2024-01-10', warranty_expiry: '2029-01-10',
    assigned_to: 'WorkPulse Backup Engine', location: 'Rack R02 - Storage Local', room_id: 'room_dc',
    purchase_price: 38000.00, current_value: 34200.00, notes: 'Destino de storage local DAS/SMB para snapshots do Backup Engine com ZFS.'
  },
  {
    id: 'ast-108', asset_tag: 'PAT-2026-0008', name: 'Dell OptiPlex 7090 Micro (Estoque Reserva)', category: 'hardware_desktop',
    brand_model: 'Dell OptiPlex 7090 Micro i5 16GB', serial_number: 'SN-DELL-OPT7-0099', status: 'em_estoque', lifecycle_stage: 'homologacao',
    supplier: 'Dell Computers Brasil', invoice_number: 'NF-899120', purchase_date: '2024-06-01', warranty_expiry: '2027-06-01',
    assigned_to: 'Almoxarifado TI', location: 'Armário A2 - Estoque Reserva TI', room_id: 'room_ti_stock',
    purchase_price: 4950.00, current_value: 4950.00, notes: 'Micro desktop pronto com imagem corporativa para substituição imediata.'
  }
];

// 6. Suppliers
const suppliers = [
  { id: 'sup-01', name: 'Dell Computers Brasil Ltda', cnpj: '72.381.189/0001-10', contact_name: 'Carlos Eduardo Mendes', email: 'enterprise_br@dell.com', phone: '+55 11 4004-0100', category: 'Hardware & Servidores', rating: 5 },
  { id: 'sup-02', name: 'Apple Corporate Brasil', cnpj: '00.623.904/0001-73', contact_name: 'Juliana Paes', email: 'business_latam@apple.com', phone: '+55 11 5503-0000', category: 'Notebooks & Mobile', rating: 5 },
  { id: 'sup-03', name: 'Lenovo Tecnologia Brasil', cnpj: '03.776.438/0001-52', contact_name: 'Roberto Fonseca', email: 'vendas_corp@lenovo.com', phone: '+55 11 3889-8000', category: 'Desktops & Workstations', rating: 4 },
  { id: 'sup-04', name: 'Cisco do Brasil Ltda', cnpj: '01.077.904/0001-40', contact_name: 'Fernando Souza', email: 'enterprise_networking@cisco.com', phone: '+55 11 5508-2000', category: 'Redes & Switches', rating: 5 },
  { id: 'sup-05', name: 'Fortinet do Brasil Informática', cnpj: '07.391.248/0001-90', contact_name: 'Mariana Costa', email: 'latam_security@fortinet.com', phone: '+55 11 3524-8800', category: 'Firewall & Cibersegurança', rating: 5 }
];

// Generate SQL
let sql = `-- ============================================================================
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
    punch_in_time, punch_out_time, overtime_minutes, pc_lock_enabled, pc_lock_status, agent_version
) VALUES
`;

sql += employees.map(e => `    (${escapeSql(e.id)}, ${escapeSql(e.name)}, ${escapeSql(e.email)}, ${escapeSql(e.avatar)}, ${escapeSql(e.role)}, ${escapeSql(e.department)}, ${escapeSql(e.work_model)}, ${escapeSql(e.status)}, ${escapeSql(e.computer_host)}, ${escapeSql(e.ip_address)}, ${escapeSql(e.current_app)}, ${escapeSql(e.current_domain)}, ${escapeSql(e.productivity_score)}, ${escapeSql(e.worked_hours_today)}, ${escapeSql(e.productive_hours_today)}, ${escapeSql(e.unproductive_hours_today)}, ${escapeSql(e.neutral_hours_today)}, ${escapeSql(e.idle_hours_today)}, ${escapeSql(e.schedule_start)}, ${escapeSql(e.schedule_end)}, ${escapeSql(e.punch_in_time)}, ${escapeSql(e.punch_out_time)}, ${escapeSql(e.overtime_minutes)}, ${escapeSql(e.pc_lock_enabled)}, ${escapeSql(e.pc_lock_status)}, ${escapeSql(e.agent_version)})`).join(',\n');

sql += `\nON CONFLICT (id) DO NOTHING;\n\n`;

// 3. SEED: APP RULES
sql += `-- 3. SEED: APP CLASSIFICATION RULES
INSERT INTO public.app_classification_rules (
    id, app_name, process_name, domain_pattern, category, group_name, target_department, description, is_ai_suggested
) VALUES
`;
sql += appRules.map(r => `    (${escapeSql(r.id)}, ${escapeSql(r.app_name)}, ${escapeSql(r.process_name)}, ${escapeSql(r.domain_pattern)}, ${escapeSql(r.category)}, ${escapeSql(r.group_name)}, ${escapeSql(r.target_department)}, ${escapeSql(r.description)}, ${escapeSql(r.is_ai_suggested)})`).join(',\n');
sql += `\nON CONFLICT (id) DO NOTHING;\n\n`;

// 4. SEED: SITE BLOCKS (JSONB)
sql += `-- 4. SEED: SITE BLOCK RULES (Colunas JSONB)
INSERT INTO public.site_block_rules (
    id, title, category_group, domain_pattern, blocked_departments, work_models, action, active
) VALUES
`;
sql += siteBlocks.map(b => `    (${escapeSql(b.id)}, ${escapeSql(b.title)}, ${escapeSql(b.category_group)}, ${escapeSql(b.domain_pattern)}, ${escapeSql(b.blocked_departments)}, ${escapeSql(b.work_models)}, ${escapeSql(b.action)}, ${escapeSql(b.active)})`).join(',\n');
sql += `\nON CONFLICT (id) DO NOTHING;\n\n`;

// 5. SEED: PC LOCK POLICIES
sql += `-- 5. SEED: PC LOCK POLICIES (Colunas oficiais da tabela)
INSERT INTO public.pc_lock_policies (
    id, name, target_department, work_model_target, cutoff_time, grace_period_minutes, auto_lock_after_cutoff, block_weekend_use, lock_message, active
) VALUES
`;
sql += pcLockPolicies.map(p => `    (${escapeSql(p.id)}, ${escapeSql(p.name)}, ${escapeSql(p.target_department)}, ${escapeSql(p.work_model_target)}, ${escapeSql(p.cutoff_time)}, ${escapeSql(p.grace_period_minutes)}, ${escapeSql(p.auto_lock_after_cutoff)}, ${escapeSql(p.block_weekend_use)}, ${escapeSql(p.lock_message)}, ${escapeSql(p.active)})`).join(',\n');
sql += `\nON CONFLICT (id) DO NOTHING;\n\n`;

// 6. SEED: IT ASSETS
sql += `-- 6. SEED: IT ASSETS (Inventário de TI)
INSERT INTO public.it_assets (
    id, asset_tag, name, category, brand_model, serial_number, status, lifecycle_stage,
    supplier, invoice_number, purchase_date, warranty_expiry, assigned_to, assigned_employee_id,
    location, room_id, purchase_price, current_value, notes
) VALUES
`;
sql += itAssets.map(a => `    (${escapeSql(a.id)}, ${escapeSql(a.asset_tag)}, ${escapeSql(a.name)}, ${escapeSql(a.category)}, ${escapeSql(a.brand_model)}, ${escapeSql(a.serial_number)}, ${escapeSql(a.status)}, ${escapeSql(a.lifecycle_stage)}, ${escapeSql(a.supplier)}, ${escapeSql(a.invoice_number)}, ${escapeSql(a.purchase_date)}, ${escapeSql(a.warranty_expiry)}, ${escapeSql(a.assigned_to)}, ${escapeSql(a.assigned_employee_id)}, ${escapeSql(a.location)}, ${escapeSql(a.room_id)}, ${escapeSql(a.purchase_price)}, ${escapeSql(a.current_value)}, ${escapeSql(a.notes)})`).join(',\n');
sql += `\nON CONFLICT (id) DO NOTHING;\n\n`;

// 7. SEED: SUPPLIERS
sql += `-- 7. SEED: SUPPLIERS (Fornecedores)
INSERT INTO public.suppliers (
    id, name, cnpj, contact_name, email, phone, category, rating
) VALUES
`;
sql += suppliers.map(s => `    (${escapeSql(s.id)}, ${escapeSql(s.name)}, ${escapeSql(s.cnpj)}, ${escapeSql(s.contact_name)}, ${escapeSql(s.email)}, ${escapeSql(s.phone)}, ${escapeSql(s.category)}, ${s.rating})`).join(',\n');
sql += `\nON CONFLICT (id) DO NOTHING;\n\n`;

// 8. SEED: BACKUP DESTINATIONS (compatível com provider_type e base_uri)
sql += `-- 8. SEED: BACKUP DESTINATIONS (Destinos de Backup)
INSERT INTO public.backup_destinations (
    id, tenant_id, name, provider_type, base_uri, config, is_active
) VALUES
    ('dst-local-01', 'tenant-default', 'Storage Local Primário (NAS Synology RS3621)', 'LOCAL', '/mnt/workpulse_storage/primary/backups', '{}'::jsonb, true),
    ('dst-s3-01', 'tenant-default', 'Nuvem AWS S3 Seguro (Glacier Instant Retrieval)', 'S3', 's3://workpulse-enterprise-cold-vault', '{"region": "sa-east-1"}'::jsonb, true)
ON CONFLICT (id) DO NOTHING;

-- 9. SEED: BACKUP JOBS (compatível com source_config e policy_config)
INSERT INTO public.backup_jobs (
    id, tenant_id, name, job_type, priority, source_config, destination_id, policy_config, schedule_cron, status, is_paused
) VALUES
    ('job-daily-01', 'tenant-default', 'Backup Diário Contínuo de Estações e Dados Críticos', 'INCREMENTAL', 1, '{"paths": ["/home", "/var/data", "C:\\\\WorkPulse\\\\Data"]}'::jsonb, 'dst-local-01', '{"retentionDaily": 7, "retentionWeekly": 4, "retentionMonthly": 12}'::jsonb, '0 2 * * *', 'PENDING', false)
ON CONFLICT (id) DO NOTHING;
`;

const outputPath = path.join(__dirname, '..', 'supabase', 'SEED_E_TRIGGERS_PRODUCAO.sql');
fs.writeFileSync(outputPath, sql, 'utf8');
console.log('Seed SQL gerado com sucesso em:', outputPath);
