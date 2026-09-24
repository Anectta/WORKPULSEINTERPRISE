import { supabase } from '../../lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

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
  callback: (session: Session | null) => void
): { unsubscribe: () => void } {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return { unsubscribe: () => data.subscription.unsubscribe() };
}
