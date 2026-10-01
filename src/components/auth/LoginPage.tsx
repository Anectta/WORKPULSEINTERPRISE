import React, { useState } from 'react';
import { signIn, signUp } from '../../services/supabase/auth.service';
import { Activity, Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, UserPlus, LogIn } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (session?: any) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Informe seu e-mail corporativo.');
      return;
    }
    if (!password) {
      setError('Informe sua senha de acesso.');
      return;
    }

    setIsLoading(true);

    try {
      // Validates master administrator account
      if (cleanEmail === 'anectta@anectta.com.br' && password === 'Ant102030!#') {
        // Attempt background Supabase auth if endpoint is available
        signIn(cleanEmail, password).catch(() => {});

        const now = Date.now();
        const masterSession: any = {
          access_token: 'wp-master-anectta-token-' + now,
          refresh_token: 'wp-master-anectta-refresh',
          expires_at: Math.floor(now / 1000) + 86400 * 30,
          created_at_epoch: now,
          issued_at: now,
          user: {
            id: 'usr-admin-anectta',
            email: 'anectta@anectta.com.br',
            user_metadata: {
              name: 'ANECTTA Soluções em Tecnologia',
              role: 'Administrador do Sistema',
              access_level: 'ADMIN_GERAL'
            },
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date(now).toISOString()
          }
        };

        localStorage.setItem('wp_auth_local_session', JSON.stringify(masterSession));
        localStorage.setItem('wp_currentUser', JSON.stringify({
          id: 'usr-admin-anectta',
          name: 'ANECTTA Soluções em Tecnologia',
          email: 'anectta@anectta.com.br',
          role: 'Administrador do Sistema',
          accessLevel: 'ADMIN_GERAL',
          avatar: '/anectta-logo.png',
          department: 'Diretoria & TI',
          loginTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          ipAddress: '192.168.1.100',
          computerHost: 'ADM-ANECTTA-MASTER',
          status: 'Ativo'
        }));

        onLoginSuccess(masterSession);
        return;
      }

      // Any other account has been eliminated
      setError('Credenciais inválidas. Usuário ou senha incorretos.');
    } catch (err) {
      setError('Erro de conexão ao validar credenciais.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center px-4">
      {/* Background decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8">
          {/* Logo + Brand */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-950/80 to-slate-900 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3 p-2">
              <img src="/anectta-logo.png" alt="ANECTTA Logo" className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">WorkPulse</h1>
            <p className="text-blue-300/80 text-sm mt-0.5">ANECTTA Soluções em Tecnologia</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                E-mail corporativo
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="anectta@anectta.com.br"
                  autoComplete="email"
                  autoFocus
                  disabled={isLoading}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition disabled:opacity-60"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Senha de acesso
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={isLoading}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando credenciais...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Entrar no Sistema</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-slate-500 text-xs">
              © 2026 Anectta · WorkPulse Enterprise
            </p>
            <p className="text-slate-600 text-xs mt-1">
              Plataforma corporativa protegida com criptografia de ponta a ponta
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
