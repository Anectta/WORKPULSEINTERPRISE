import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials safely from Vite environment or window runtime config
const supabaseUrl: string = 
  (import.meta as any).env?.VITE_SUPABASE_URL || 
  (typeof process !== 'undefined' ? process.env?.SUPABASE_URL : '') || 
  '';

const supabaseAnonKey: string = 
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
  (typeof process !== 'undefined' ? process.env?.SUPABASE_ANON_KEY : '') || 
  '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseUrl.startsWith('https://') && 
    supabaseAnonKey && 
    supabaseAnonKey.length > 20
  );
};

// Initialize Supabase Client instance (or lazy/dummy when not configured yet)
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
);

/**
 * Health check helper to verify Supabase connection
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
}> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase não está configurado no arquivo .env (SUPABASE_URL e SUPABASE_ANON_KEY necessárias).'
    };
  }

  const start = performance.now();
  try {
    const { error } = await supabase.from('security_scopes').select('id').limit(1);
    const latencyMs = Math.round(performance.now() - start);

    if (error && error.code !== 'PGRST116') {
      // Even if table is empty or permission denied, reaching the server indicates connectivity
      if (error.message.includes('FetchError') || error.message.includes('Failed to fetch')) {
        return { success: false, message: `Falha na conexão: ${error.message}` };
      }
    }

    return {
      success: true,
      message: `Conectado ao Supabase com sucesso (${latencyMs}ms)!`,
      latencyMs
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao testar conexão com Supabase: ${err.message || err}`
    };
  }
}
