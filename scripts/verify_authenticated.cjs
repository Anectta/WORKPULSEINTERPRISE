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
  const email = 'audit.tester@workpulse.com.br';
  const password = 'Password@123456';

  let { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  
  if (authErr) {
    console.log('Tentando cadastrar novo usuário de auditoria:', authErr.message);
    const signUpRes = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: 'Auditor do Sistema',
          role: 'Auditor Geral',
          access_level: 'ADMIN_GERAL'
        }
      }
    });
    if (signUpRes.error) {
      console.error('Erro no cadastro:', signUpRes.error.message);
      return;
    }
    authData = signUpRes.data;
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
