import { supabase } from '../../lib/supabaseClient';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

export async function signIn(email: string, password: string): Promise<{
  success: boolean;
  error?: string;
  session?: Session | null;
  user?: User | null;
}> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('[auth.service] signIn error:', error.message);
    let friendlyMessage = 'Erro ao fazer login. Tente novamente.';
    if (error.message.includes('Invalid login credentials')) {
      friendlyMessage = 'E-mail ou senha incorretos.';
    } else if (error.message.includes('Email not confirmed')) {
      friendlyMessage = 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
    } else if (error.message.includes('Too many requests')) {
      friendlyMessage = 'Muitas tentativas. Aguarde alguns minutos.';
    }
    return { success: false, error: friendlyMessage };
  }
  return { success: true, session: data.session, user: data.user };
}

export async function signUp(email: string, password: string, name?: string): Promise<{
  success: boolean;
  error?: string;
  session?: Session | null;
  user?: User | null;
}> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || email.split('@')[0],
      }
    }
  });
  if (error) {
    console.error('[auth.service] signUp error:', error.message);
    let friendlyMessage = 'Erro ao cadastrar usuário.';
    if (error.message.includes('already registered')) {
      friendlyMessage = 'Este e-mail já está cadastrado. Alterne para Entrar.';
    } else if (error.message.includes('Password should be')) {
      friendlyMessage = 'A senha deve ter no mínimo 6 caracteres.';
    }
    return { success: false, error: friendlyMessage };
  }
  return { success: true, session: data.session, user: data.user };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

export function onAuthStateChange(
  callback: (session: Session | null, event: AuthChangeEvent) => void
): { unsubscribe: () => void } {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session, event);
  });
  return { unsubscribe: () => data.subscription.unsubscribe() };
}

/** Envia o e-mail de recuperação; o link volta para esta mesma origem (precisa estar em Redirect URLs no Supabase). */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
  });
  if (error) {
    console.error('[auth.service] resetPasswordForEmail error:', error.message);
    return {
      success: false,
      error: error.message.includes('rate limit') || error.message.includes('seconds')
        ? 'Muitas solicitações. Aguarde alguns minutos e tente de novo.'
        : 'Não foi possível enviar o e-mail de recuperação.',
    };
  }
  return { success: true };
}

/** Define a nova senha do usuário da sessão atual (aberta pelo link de recuperação). */
export async function updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    console.error('[auth.service] updatePassword error:', error.message);
    let friendlyMessage = 'Não foi possível salvar a nova senha.';
    if (error.message.includes('different from the old')) {
      friendlyMessage = 'A nova senha precisa ser diferente da atual.';
    } else if (error.message.includes('Password should') || error.message.includes('weak')) {
      friendlyMessage = 'Senha fraca. Use pelo menos 8 caracteres, com letras e números.';
    } else if (error.message.includes('session') || error.message.includes('JWT')) {
      friendlyMessage = 'O link de recuperação expirou. Solicite um novo e-mail.';
    }
    return { success: false, error: friendlyMessage };
  }
  return { success: true };
}
