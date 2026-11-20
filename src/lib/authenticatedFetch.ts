import { supabase } from './supabaseClient';

/**
 * Anexa automaticamente o JWT da sessão Supabase às chamadas para a API do
 * próprio servidor (/api/...). O servidor recusa requisições sem sessão válida.
 * Requisições externas (outros domínios) não são alteradas.
 */
function isOwnApiRequest(input: RequestInfo | URL): boolean {
  try {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(rawUrl, window.location.origin);
    return url.origin === window.location.origin && url.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

let installed = false;

export function installAuthenticatedFetch(): void {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isOwnApiRequest(input)) return originalFetch(input, init);

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    // Não sobrescreve um Authorization explícito (ex.: testador de API de agentes)
    if (!headers.has('Authorization')) {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    return originalFetch(input, { ...init, headers });
  };
}
