'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { request, post, RequestError } from '@/lib/client';
import { favoriteSkill, type FavoriteSkill, type SavedFavorite } from '@/lib/favorites';
import PublicConnectionDialog from './public-connection-dialog';

type Mode = 'loading' | 'disconnected' | 'synced' | 'error';
type FavoriteState = { items: SavedFavorite[]; mode: Mode; scope?: string };
type Favorites = FavoriteState & { busy: boolean; error: string; toggle: (skill: FavoriteSkill) => Promise<void>; reload: () => void; connect: () => void };
const Context = createContext<Favorites | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FavoriteState>({ items: [], mode: 'loading' });
  const current = useRef(state);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [connectionOpen, setConnectionOpen] = useState(false);
  const pending = useRef<FavoriteSkill | undefined>(undefined);
  const work = useRef<AbortController | null>(null);
  const apply = (next: FavoriteState) => { current.current = next; setState(next); };
  const reload = useCallback(async (saveAfterConnect?: FavoriteSkill) => {
    work.current?.abort();
    const controller = new AbortController(); work.current = controller;
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]);
    setBusy(true); setError(''); apply({ items: [], mode: 'loading' });
    try {
      let remote = await request<{ scope: string; items: SavedFavorite[] }>('/favorites', { signal });
      if (saveAfterConnect && !controller.signal.aborted) {
        try {
          remote = await request('/favorites', { ...post({ scope: remote.scope, items: [saveAfterConnect] }), signal });
          try { localStorage.setItem('loomskill-favorites-change', String(Date.now())); } catch { /* Other tabs recheck on focus. */ }
        }
        catch (e) {
          if (e instanceof RequestError && [401, 409].includes(e.status)) throw e;
          if (!controller.signal.aborted) setError('收藏保存失败，请再次点击五角星重试。');
        }
      }
      if (!controller.signal.aborted) apply({ ...remote, mode: 'synced' });
    } catch (e) {
      if (!controller.signal.aborted) {
        if (e instanceof RequestError && e.status === 401) apply({ items: [], mode: 'disconnected' });
        else { apply({ items: [], mode: 'error' }); setError('收藏读取失败，请重试。'); }
      }
    } finally { if (work.current === controller) { work.current = null; setBusy(false); } }
  }, []);
  useEffect(() => {
    void reload();
    const refresh = () => { void reload(); };
    const focus = () => { if (!work.current) void reload(); };
    const storage = (event: StorageEvent) => {
      if (event.key === 'loomskill-session-change') refresh();
      else if (event.key === 'loomskill-favorites-change') focus();
    };
    window.addEventListener('loomskill-session-change', refresh);
    window.addEventListener('focus', focus);
    window.addEventListener('storage', storage);
    return () => { work.current?.abort(); window.removeEventListener('loomskill-session-change', refresh); window.removeEventListener('focus', focus); window.removeEventListener('storage', storage); };
  }, [reload]);
  const toggle = async (value: FavoriteSkill) => {
    if (work.current || current.current.mode === 'error') return;
    const item = favoriteSkill(value);
    if (!item) { setError('收藏内容无效。'); return; }
    if (current.current.mode === 'disconnected') { pending.current = item; setConnectionOpen(true); return; }
    const previous = current.current;
    const controller = new AbortController(); work.current = controller;
    setBusy(true); setError('');
    try {
      const exists = previous.items.some(saved => saved.id === item.id);
      const remote = await request('/favorites', {
        method: exists ? 'DELETE' : 'POST',
        body: JSON.stringify({ scope: previous.scope, ...(exists ? { id: item.id } : { items: [item] }) }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      if (!controller.signal.aborted) apply({ ...remote, mode: 'synced' });
      try { localStorage.setItem('loomskill-favorites-change', String(Date.now())); } catch { /* Other tabs recheck on focus. */ }
    } catch (e) {
      if (!controller.signal.aborted) {
        if (e instanceof RequestError && e.status === 401) {
          apply({ items: [], mode: 'disconnected' });
          // Do not turn an expired-session removal into an addition after login.
          pending.current = previous.items.some(saved => saved.id === item.id) ? undefined : item;
          setConnectionOpen(true);
        } else if (e instanceof RequestError && e.status === 409) { apply({ items: [], mode: 'error' }); setError('连接已改变，请刷新收藏后重试。'); }
        else setError(e instanceof RequestError ? e.message : '收藏保存失败，请再次点击五角星重试。');
      }
    } finally { if (work.current === controller) { work.current = null; setBusy(false); } }
  };
  return <Context.Provider value={{ ...state, busy, error, toggle, reload: () => void reload(), connect: () => { pending.current = undefined; setConnectionOpen(true); } }}>{children}{connectionOpen && <PublicConnectionDialog onClose={() => { pending.current = undefined; setConnectionOpen(false); }} onConnected={() => { const item = pending.current; pending.current = undefined; setConnectionOpen(false); void reload(item); }} />}</Context.Provider>;
}
export function useFavorites() {
  const value = useContext(Context);
  if (!value) throw new Error('FavoritesProvider is required');
  return value;
}
