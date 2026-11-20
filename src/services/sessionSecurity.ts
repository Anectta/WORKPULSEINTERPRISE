import { supabase } from '../lib/supabaseClient';

const BROADCAST_CHANNEL_NAME = 'wp_auth_global_channel';
const LOCAL_REVOCATION_KEY = 'wp_global_revocation_epoch';
/** Chave da antiga sessão local forjável — removida em toda inicialização. */
const LEGACY_LOCAL_SESSION_KEY = 'wp_auth_local_session';

/**
 * Contas autorizadas a usar o sistema. Configurável via VITE_AUTH_ALLOWED_EMAILS
 * (lista separada por vírgula). A validação definitiva é feita no servidor.
 */
const ALLOWED_EMAILS: string[] = (
  ((import.meta as any).env?.VITE_AUTH_ALLOWED_EMAILS as string | undefined) || 'anectta@anectta.com.br'
)
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export function isAuthorizedEmail(email: string | null | undefined): boolean {
  return Boolean(email) && ALLOWED_EMAILS.includes(String(email).trim().toLowerCase());
}

/** Remove resquícios da autenticação local antiga (sessão forjável e usuário em cache). */
export function purgeLegacyLocalSession(): void {
  try {
    localStorage.removeItem(LEGACY_LOCAL_SESSION_KEY);
  } catch {}
}

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      return new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    } catch {
      return null;
    }
  }
  return null;
}

function purgeLocalAuthStorage(): void {
  try {
    localStorage.removeItem(LEGACY_LOCAL_SESSION_KEY);
    localStorage.removeItem('wp_currentUser');
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-') || key.includes('auth-token')) {
        localStorage.removeItem(key);
      }
    });
    sessionStorage.clear();
  } catch {}
}

/**
 * Encerra a sessão em todos os dispositivos:
 * revoga os refresh tokens no Supabase (scope global) e avisa as outras abas.
 * Tokens de acesso já emitidos expiram no prazo configurado no Supabase (padrão 1h)
 * e são recusados pelo servidor ao tentar renovar.
 */
export async function forceGlobalSignOut(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch (err) {
    console.warn('[sessionSecurity] Falha ao revogar sessões globalmente:', err);
  }

  try {
    localStorage.setItem(LOCAL_REVOCATION_KEY, String(Date.now()));
  } catch {}

  try {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage({ type: 'FORCE_GLOBAL_LOGOUT' });
      channel.close();
    }
  } catch {}

  purgeLocalAuthStorage();
}

/** Escuta pedidos de logout vindos de outras abas/janelas deste navegador. */
export function subscribeToGlobalLogout(onLogout: () => void): () => void {
  const channel = getBroadcastChannel();

  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'FORCE_GLOBAL_LOGOUT') onLogout();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOCAL_REVOCATION_KEY) onLogout();
  };

  if (channel) channel.addEventListener('message', handleMessage);
  window.addEventListener('storage', handleStorage);

  return () => {
    if (channel) {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    }
    window.removeEventListener('storage', handleStorage);
  };
}
