import { supabase } from '../../lib/supabaseClient';

/**
 * Coleções genéricas persistidas em public.app_documents (JSONB).
 * Usadas por dados de configuração e da Agenda Pro que antes só existiam no localStorage.
 */
export type DocumentCollection =
  | 'aux_rooms'
  | 'aux_categories'
  | 'aux_statuses'
  | 'suppliers'
  | 'pc_lock_policies'
  | 'agenda_events'
  | 'agenda_contacts'
  | 'agenda_tasks'
  | 'agenda_occurrences';

/** null = falha de leitura (diferente de coleção vazia). */
export async function fetchDocuments<T extends { id: string }>(collection: DocumentCollection): Promise<T[] | null> {
  const { data, error } = await supabase
    .from('app_documents')
    .select('id, data')
    .eq('collection', collection);
  if (error) {
    console.error(`[documents.service] fetch ${collection}:`, error.message);
    return null;
  }
  return (data || []).map(row => ({ ...(row.data as T), id: row.id as string }));
}

export async function upsertDocuments<T extends { id: string }>(collection: DocumentCollection, items: T[]): Promise<boolean> {
  if (!items.length) return true;
  const { error } = await supabase
    .from('app_documents')
    .upsert(items.map(item => ({ collection, id: String(item.id), data: item })), { onConflict: 'collection,id' });
  if (error) {
    console.error(`[documents.service] upsert ${collection}:`, error.message);
    return false;
  }
  return true;
}

export async function deleteDocument(collection: DocumentCollection, id: string): Promise<boolean> {
  const { error } = await supabase.from('app_documents').delete().eq('collection', collection).eq('id', id);
  if (error) {
    console.error(`[documents.service] delete ${collection}/${id}:`, error.message);
    return false;
  }
  return true;
}

/** Trilha de auditoria: somente inserção (a tabela não permite alterar nem apagar). */
export async function appendAuditLogs<T extends { id: string }>(entries: T[]): Promise<boolean> {
  if (!entries.length) return true;
  const { error } = await supabase
    .from('app_audit_logs')
    .upsert(entries.map(e => ({ id: String(e.id), data: e })), { onConflict: 'id', ignoreDuplicates: true });
  if (error) {
    console.error('[documents.service] append audit logs:', error.message);
    return false;
  }
  return true;
}

export async function fetchAuditLogs<T extends { id: string }>(limit = 500): Promise<T[] | null> {
  const { data, error } = await supabase
    .from('app_audit_logs')
    .select('id, data')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[documents.service] fetch audit logs:', error.message);
    return null;
  }
  return (data || []).map(row => ({ ...(row.data as T), id: row.id as string }));
}
