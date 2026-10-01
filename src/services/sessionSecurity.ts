import { supabase } from '../lib/supabaseClient';

/**
 * Baseline timestamp (ms). Any session issued prior to this timestamp 
 * is considered globally revoked and immediately destroyed across all machines.
 */
export const GLOBAL_REVOCATION_BASELINE = 1790876400000; // 2026-10-01T14:40:00.000Z

const BROADCAST_CHANNEL_NAME = 'wp_auth_global_channel';
const LOCAL_REVOCATION_KEY = 'wp_global_revocation_epoch';

/**
 * Broadcast channel for multi-tab and multi-window live logout sync
 */
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

/**
 * Returns the highest revocation timestamp known locally
 */
export function getRevocationEpoch(): number {
  try {
    const saved = localStorage.getItem(LOCAL_REVOCATION_KEY);
    const parsed = saved ? Number(saved) : 0;
    return Math.max(GLOBAL_REVOCATION_BASELINE, parsed);
  } catch {
    return GLOBAL_REVOCATION_BASELINE;
  }
}

/**
 * Checks whether a given session is valid or has been revoked globally
 */
export function isSessionGloballyValid(session: any): boolean {
  if (!session || !session.user) return false;
  
  // Verify account is anectta@anectta.com.br
  if (session.user.email !== 'anectta@anectta.com.br') return false;

  const epoch = getRevocationEpoch();
  const sessionCreatedAt = Number(session.created_at_epoch || session.issued_at || 0);

  // If session has no timestamp or was created before the revocation cutoff, it is revoked!
  if (!sessionCreatedAt || sessionCreatedAt < epoch) {
    return false;
  }

  return true;
}

/**
 * Forces global sign out of ALL connected PCs and browsers.
 * 1. Updates local & remote revocation epoch
 * 2. Broadcasts logout to all tabs/windows
 * 3. Revokes all Supabase tokens worldwide
 * 4. Clears local storage on this workstation
 */
export async function forceGlobalSignOut(): Promise<void> {
  const newEpoch = Date.now();
  
  // 1. Update local revocation epoch
  try {
    localStorage.setItem(LOCAL_REVOCATION_KEY, String(newEpoch));
  } catch {}

  // 2. Broadcast to all open tabs and windows via BroadcastChannel
  try {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage({ type: 'FORCE_GLOBAL_LOGOUT', epoch: newEpoch });
      channel.close();
    }
  } catch {}

  // 3. Revoke all Supabase tokens globally across all devices
  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch (err) {
    console.warn('[sessionSecurity] Supabase global signOut error:', err);
  }

  // 4. Try updating remote database status if configured
  try {
    await supabase
      .from('system_users')
      .update({ status: 'Revoked', updated_at: new Date().toISOString() })
      .eq('email', 'anectta@anectta.com.br');
  } catch {}

  // 5. Purge local session storage
  try {
    localStorage.removeItem('wp_auth_local_session');
    localStorage.removeItem('wp_currentUser');
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    sessionStorage.clear();
  } catch {}
}

/**
 * Sets up a listener for remote global logout signals
 */
export function subscribeToGlobalLogout(onLogout: () => void): () => void {
  const channel = getBroadcastChannel();
  
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'FORCE_GLOBAL_LOGOUT') {
      try {
        localStorage.removeItem('wp_auth_local_session');
        localStorage.removeItem('wp_currentUser');
      } catch {}
      onLogout();
    }
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOCAL_REVOCATION_KEY || event.key === 'wp_auth_local_session') {
      const localSaved = localStorage.getItem('wp_auth_local_session');
      if (!localSaved) {
        onLogout();
      } else {
        try {
          const parsed = JSON.parse(localSaved);
          if (!isSessionGloballyValid(parsed)) {
            onLogout();
          }
        } catch {
          onLogout();
        }
      }
    }
  };

  if (channel) {
    channel.addEventListener('message', handleMessage);
  }
  window.addEventListener('storage', handleStorage);

  return () => {
    if (channel) {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    }
    window.removeEventListener('storage', handleStorage);
  };
}
