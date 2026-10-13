'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { createRetryDraftStore, RETRY_DRAFT_TTL_MS } from '@/lib/retry-draft';
import type { ResultRow } from '@/lib/types';

type RetryDraft = {
  stage: (listingId: string, rows: ResultRow[]) => void;
  take: (listingId: string) => ResultRow[] | undefined;
  clear: () => void;
};
const Context = createContext<RetryDraft | null>(null);

export function RetryDraftProvider({ children }: { children: React.ReactNode }) {
  const store = useRef<ReturnType<typeof createRetryDraftStore> | null>(null);
  if (!store.current) store.current = createRetryDraftStore();
  const expiry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clear = useCallback(() => {
    clearTimeout(expiry.current);
    expiry.current = undefined;
    store.current!.clear();
  }, []);
  const stage = useCallback((listingId: string, rows: ResultRow[]) => {
    clear();
    store.current!.stage(listingId, rows);
    expiry.current = setTimeout(clear, RETRY_DRAFT_TTL_MS);
  }, [clear]);
  const take = useCallback((listingId: string) => {
    const rows = store.current!.take(listingId);
    if (rows) clear();
    return rows;
  }, [clear]);

  useEffect(() => {
    const storage = (event: StorageEvent) => {
      if (event.key === 'loomskill-session-change') clear();
    };
    window.addEventListener('loomskill-session-change', clear);
    window.addEventListener('storage', storage);
    return () => {
      clear();
      window.removeEventListener('loomskill-session-change', clear);
      window.removeEventListener('storage', storage);
    };
  }, [clear]);

  const value = useMemo(() => ({ stage, take, clear }), [stage, take, clear]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useRetryDraft() {
  const value = useContext(Context);
  if (!value) throw new Error('useRetryDraft must be used within RetryDraftProvider');
  return value;
}
