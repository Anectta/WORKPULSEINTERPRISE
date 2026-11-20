import type { CurrentUser } from '../types';

/**
 * Remove campos de senha de registros de usuário antes de gravá-los no
 * navegador ou em backups. A autenticação é feita exclusivamente pelo Supabase Auth.
 */
export function stripPassword<T extends Partial<CurrentUser>>(user: T): Omit<T, 'password'> {
  if (!user || typeof user !== 'object') return user;
  const { password: _omit, ...rest } = user as T & { password?: string };
  return rest;
}

export function stripPasswords<T extends Partial<CurrentUser>>(users: T[] | unknown): Omit<T, 'password'>[] {
  return Array.isArray(users) ? (users as T[]).map(stripPassword) : [];
}
