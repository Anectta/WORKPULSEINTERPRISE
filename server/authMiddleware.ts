import type { Request, Response, NextFunction } from "express";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Autenticação do servidor via Supabase Auth.
 *
 * - O front envia o JWT da sessão Supabase em "Authorization: Bearer <jwt>".
 * - O token é validado no Supabase (auth.getUser) e o e-mail precisa constar em
 *   AUTH_ALLOWED_EMAILS (lista separada por vírgula).
 * - Rotas de ingestão de agentes usam token próprio de agente (authenticateAgent
 *   no cmdbRouter) e por isso não exigem sessão de usuário aqui.
 */

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

const CACHE_TTL_MS = 60_000;
const tokenCache = new Map<string, { user: AuthenticatedUser; expiresAt: number }>();
let supabaseClient: SupabaseClient | null = null;

// Lidos sob demanda: dotenv é carregado depois dos imports no server.ts
function getAllowedEmails(): string[] {
  return (process.env.AUTH_ALLOWED_EMAILS || "anectta@anectta.com.br")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  supabaseClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  return supabaseClient;
}

function extractBearer(req: Request): string | null {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.substring(7).trim();
  return token || null;
}

/** JWTs têm três segmentos base64url; tokens de agente são opacos. */
function looksLikeJwt(token: string): boolean {
  return /^eyJ[\w-]*\.[\w-]+\.[\w-]+$/.test(token);
}

function toAuthenticatedUser(user: User): AuthenticatedUser {
  const meta = (user.user_metadata || {}) as Record<string, any>;
  const appMeta = (user.app_metadata || {}) as Record<string, any>;
  return {
    id: user.id,
    email: (user.email || "").toLowerCase(),
    name: meta.name || user.email || "Usuário",
    // Papel vem de app_metadata (definido só pelo servidor/admin), nunca de cabeçalho do cliente
    role: String(appMeta.workpulse_role || "ADMIN").toUpperCase(),
    tenantId: appMeta.tenant_id ? String(appMeta.tenant_id) : null
  };
}

async function resolveUser(token: string): Promise<AuthenticatedUser | null> {
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached.user;

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  const authUser = toAuthenticatedUser(data.user);
  if (!getAllowedEmails().includes(authUser.email)) return null;

  tokenCache.set(token, { user: authUser, expiresAt: Date.now() + CACHE_TTL_MS });
  if (tokenCache.size > 1000) {
    const now = Date.now();
    for (const [key, value] of tokenCache) if (value.expiresAt <= now) tokenCache.delete(key);
  }
  return authUser;
}

/** Rotas acessíveis sem sessão de usuário (caminho relativo a /api). */
const PUBLIC_ROUTES: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/health$/ },
  // Link de compartilhamento de relatório protegido por token próprio
  { method: "GET", pattern: /^\/v1\/security\/reports\/share\/[^/]+$/ },
  // Ingestão de agentes: autenticada pelo token do agente (authenticateAgent / enrollment)
  { method: "POST", pattern: /^\/v1\/agent\/(enroll|register|heartbeat|rotate-token|inventory|metrics|events)$/ },
  // Instalador PowerShell baixado pelo .BAT (a rota valida o enrollment token)
  { method: "GET", pattern: /^\/v1\/agent\/install\.ps1$/ }
];

function isPublicRoute(req: Request): boolean {
  const routePath = req.path;
  return PUBLIC_ROUTES.some(r => r.method === req.method && r.pattern.test(routePath));
}

/**
 * Middleware montado em /api: identifica o usuário quando há JWT válido e
 * exige autenticação em todas as rotas que não são públicas.
 */
export async function apiAuthentication(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractBearer(req);
    if (token && looksLikeJwt(token)) {
      const user = await resolveUser(token);
      if (user) req.authUser = user;
    }

    if (req.authUser || isPublicRoute(req)) return next();

    if (!getSupabase()) {
      return res.status(503).json({
        error: "AUTH_NOT_CONFIGURED",
        message: "Autenticação indisponível: defina SUPABASE_URL e SUPABASE_ANON_KEY no servidor."
      });
    }

    return res.status(401).json({
      error: "UNAUTHENTICATED",
      message: "Sessão ausente, expirada ou sem autorização para acessar o WorkPulse."
    });
  } catch (err: any) {
    console.error("[auth] Falha ao validar sessão:", err?.message || err);
    return res.status(401).json({ error: "UNAUTHENTICATED", message: "Não foi possível validar a sessão." });
  }
}
