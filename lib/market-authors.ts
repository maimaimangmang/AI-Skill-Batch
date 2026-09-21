import type { Listing } from './types';

// The list API currently leaves nicknames empty; the detail API includes them.
// Enrich only visible cards, without holding up the initial page response.
export function createMarketAuthorLoader(api: (path: string, options?: RequestInit) => Promise<Listing>) {
  const cache = new Map<string, string>();
  return async (items: Listing[], signal: AbortSignal, onAuthor: (id: string, name: string | null) => void) => {
    const pending = [...new Map(items.map(item => [item.id, item])).values()];
    async function worker() {
      while (pending.length && !signal.aborted) {
        const item = pending.shift()!;
        const supplied = item.creator?.nickname?.trim();
        if (supplied) cache.set(item.id, supplied);
        if (cache.has(item.id)) { onAuthor(item.id, cache.get(item.id)!); continue; }
        try {
          const detail = await api(`/market/${encodeURIComponent(item.id)}`, { signal });
          if (signal.aborted) return;
          const name = detail.creator?.nickname?.trim() || '';
          cache.set(item.id, name);
          onAuthor(item.id, name);
        } catch {
          if (signal.aborted) return;
          // Transient errors are not cached, so returning to the page can retry.
          onAuthor(item.id, null);
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(3, pending.length) }, worker));
  };
}
