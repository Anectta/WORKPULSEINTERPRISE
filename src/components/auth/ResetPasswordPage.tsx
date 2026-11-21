import React, { useState } from 'react';
import { updatePassword } from '../../services/supabase/auth.service';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, KeyRound } from 'lucide-react';

interface ResetPasswordPageProps {
  email?: string | null;
  /** Senha salva: segue para o sistema. */
  onDone: () => void;
  /** Usuário desistiu: encerra a sessão aberta pelo link. */
  onCancel: () => void;
}

const MIN_LENGTH = 8;

/**
 * Tela exibida quando o usuário chega pelo link "Redefinir senha" do e-mail do Supabase.
 * O link abre uma sessão temporária; aqui a nova senha é gravada com auth.updateUser.
 */
export function ResetPasswordPage({ email, onDone, onCancel }: ResetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`A senha precisa ter pelo menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Use letras e números na senha.');
      return;
    }
    if (password !== confirm) {
      setError('As duas senhas não são iguais.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await updatePassword(password);
      if (!result.success) {
        setError(result.error || 'Não foi possível salvar a nova senha.');
        return;
      }
      setSaved(true);
      setTimeout(onDone, 1500);
    } catch {
      setError('Erro de conexão ao salvar a nova senha.');
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition disabled:opacity-60';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center px-4">
      <div className="relative w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-3">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Criar nova senha</h1>
            {email && <p className="text-blue-300/80 text-sm mt-1">{email}</p>}
          </div>

          {saved ? (
            <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-emerald-300 text-sm">Senha alterada com sucesso. Entrando no sistema...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Nova senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={`Mínimo de ${MIN_LENGTH} caracteres`}
                      autoComplete="new-password"
                      autoFocus
                      disabled={isSaving}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Repita a nova senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      disabled={isSaving}
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  <span>{isSaving ? 'Salvando...' : 'Salvar nova senha'}</span>
                </button>

                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSaving}
                  className="w-full text-slate-400 hover:text-slate-200 text-sm py-2 transition cursor-pointer"
                >
                  Cancelar e voltar ao login
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
