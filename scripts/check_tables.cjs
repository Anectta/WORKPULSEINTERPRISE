const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

const tables = [
  'system_users',
  'employees',
  'activity_logs',
  'app_classification_rules',
  'site_block_rules',
  'pc_lock_policies',
  'it_assets',
  'suppliers',
  'network_speed_tests',
  'timecard_records',
  'security_scopes',
  'security_policies',
  'security_targets',
  'pentest_projects',
  'security_audit_logs',
  'backup_agents',
  'backup_destinations',
  'backup_jobs',
  'backup_executions',
  'backup_snapshots',
  'backup_audit_logs'
];

async function deepCheck() {
  console.log(`\n================================================================`);
  console.log(` AUDITORIA DE DADOS E TABELAS SUPABASE (${url})`);
  console.log(`================================================================\n`);

  for (const table of tables) {
    try {
      const { data, count, error } = await supabase.from(table).select('*', { count: 'exact' });
      if (error) {
        console.log(`❌ ${table.padEnd(28)} | Erro: ${error.message} (${error.code})`);
      } else {
        const rows = data ? data.length : 0;
        console.log(`✅ ${table.padEnd(28)} | Registros: ${String(count ?? rows).padStart(4)} | Amostra: ${rows > 0 ? JSON.stringify(Object.keys(data[0])).slice(0, 50) + '...' : 'Vazio'}`);
      }
    } catch (e) {
      console.log(`❌ ${table.padEnd(28)} | Exceção: ${e.message}`);
    }
  }

  // Check auth user login capabilities
  console.log(`\n----------------------------------------------------------------`);
  console.log(` TESTANDO CONSULTA DE USUÁRIOS DO SISTEMA (system_users)`);
  console.log(`----------------------------------------------------------------`);
  const { data: users, error: userErr } = await supabase.from('system_users').select('id, name, email, role, access_level, status');
  if (userErr) {
    console.log('Erro ao consultar system_users:', userErr.message);
  } else {
    console.log(`Total de Usuários Cadastrados: ${users?.length || 0}`);
    users?.forEach(u => console.log(`  👤 ${u.name.padEnd(25)} | Email: ${u.email.padEnd(30)} | Role: ${u.role.padEnd(15)} | Status: ${u.status}`));
  }
}

deepCheck();
