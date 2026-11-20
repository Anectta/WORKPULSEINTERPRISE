import { useCallback, useEffect, useRef } from 'react';

/**
 * Calcula o que precisa ser gravado no banco: itens novos ou alterados em relação
 * à linha de base (última versão confirmada) e ids que deixaram de existir.
 */
export function computeCollectionDelta<T extends { id: string }>(
  baseline: Map<string, string>,
  items: T[]
): { changed: T[]; removedIds: string[] } {
  const currentIds = new Set(items.map(i => i.id));
  return {
    changed: items.filter(item => baseline.get(item.id) !== JSON.stringify(item)),
    removedIds: [...baseline.keys()].filter(id => !currentIds.has(id))
  };
}

interface SyncOptions<T> {
  /** Nome legível da coleção (mensagens de erro). */
  label: string;
  /** Sincroniza somente quando true (após carga inicial bem-sucedida e fora de simulação). */
  enabled: boolean;
  upsertMany: (items: T[]) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  onError?: (message: string) => void;
  /** Espera antes de gravar, para agrupar edições rápidas. */
  debounceMs?: number;
}

/**
 * Mantém uma coleção do estado React gravada no Supabase.
 *
 * Compara o estado atual com a última versão confirmada no banco (baseline) e grava
 * apenas o que mudou: itens novos/alterados via upsert, itens removidos via delete.
 * Funciona para qualquer origem de alteração (handlers, modais, restauração de backup).
 *
 * `resetBaseline` deve ser chamado com os dados que já estão no banco, para que a
 * carga inicial não seja regravada.
 */
export function useSupabaseCollectionSync<T extends { id: string }>(items: T[], options: SyncOptions<T>) {
  const { label, enabled, upsertMany, remove, onError, debounceMs = 600 } = options;
  const baselineRef = useRef<Map<string, string> | null>(null);
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const latestItemsRef = useRef(items);
  latestItemsRef.current = items;

  const resetBaseline = useCallback((synced: T[]) => {
    baselineRef.current = new Map(synced.map(item => [item.id, JSON.stringify(item)]));
  }, []);

  const flush = useCallback(async () => {
    const baseline = baselineRef.current;
    if (!baseline) return;
    if (inFlightRef.current) {
      pendingRef.current = true;
      return;
    }
    inFlightRef.current = true;

    try {
      const { changed, removedIds } = computeCollectionDelta(baseline, latestItemsRef.current);

      if (changed.length > 0) {
        const ok = await upsertMany(changed);
        if (ok) {
          changed.forEach(item => baseline.set(item.id, JSON.stringify(item)));
        } else {
          onError?.(`Não foi possível salvar ${label} no banco de dados. As alterações serão reenviadas na próxima edição.`);
        }
      }

      for (const id of removedIds) {
        const ok = await remove(id);
        if (ok) {
          baseline.delete(id);
        } else {
          onError?.(`Não foi possível excluir um registro de ${label} no banco de dados.`);
        }
      }
    } finally {
      inFlightRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        void flush();
      }
    }
  }, [label, upsertMany, remove, onError]);

  useEffect(() => {
    if (!enabled || !baselineRef.current) return;
    const timer = setTimeout(() => { void flush(); }, debounceMs);
    return () => clearTimeout(timer);
  }, [items, enabled, flush, debounceMs]);

  return { resetBaseline };
}
