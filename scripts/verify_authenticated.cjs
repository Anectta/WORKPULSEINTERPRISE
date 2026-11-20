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

async function run() {
  console.log('Autenticando usuário de teste para validação de RLS...');
  const email = env.AUDIT_TEST_EMAIL;
  const password = env.AUDIT_TEST_PASSWORD;
  if (!email || !password) {
    console.error("Defina AUDIT_TEST_EMAIL e AUDIT_TEST_PASSWORD no .env (conta de teste já existente no Supabase Auth).");
    return;
  }

  let { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  
  if (authErr) {
    // Não cria contas automaticamente: o nível de acesso é definido apenas por um ADMIN_GERAL
    console.error("Falha na autenticação da conta de teste:", authErr.message);
    return;
  }

  console.log('Usuário autenticado com sucesso:', authData.user?.email || authData.session?.user?.email);

  const tables = [
    'employees',
    'app_classification_rules',
    'site_block_rules',
    'pc_lock_policies',
    'it_assets',
    'suppliers',
    'backup_destinations',
    'backup_jobs',
    'system_users'
  ];

  console.log('\n--- VERIFICANDO DADOS (COM RLS AUTHENTICATED) ---');
  for (const table of tables) {
    const { data, count, error } = await supabase.from(table).select('*', { count: 'exact' });
    if (error) {
      console.log(`❌ ${table.padEnd(28)} | Erro: ${error.message}`);
    } else {
      console.log(`✅ ${table.padEnd(28)} | Linhas: ${(count ?? data.length).toString().padStart(3)} | Amostra: ${data[0]?.name || data[0]?.title || data[0]?.app_name || data[0]?.id || 'Vazio'}`);
    }
  }
}

run().catch(console.error);
