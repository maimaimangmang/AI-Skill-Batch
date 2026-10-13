import type { ResultRow } from './types';

export const RETRY_DRAFT_TTL_MS = 5 * 60 * 1000;

export function createRetryDraftStore(now: () => number = Date.now) {
  let draft: { listingId: string; rows: ResultRow[]; expiresAt: number } | undefined;
  return {
    stage(listingId: string, rows: ResultRow[]) {
      draft = { listingId, rows: structuredClone(rows), expiresAt: now() + RETRY_DRAFT_TTL_MS };
    },
    take(listingId: string): ResultRow[] | undefined {
      if (draft && now() >= draft.expiresAt) draft = undefined;
      if (!draft || draft.listingId !== listingId) return undefined;
      const rows = draft.rows;
      draft = undefined;
      return rows;
    },
    clear() { draft = undefined; },
  };
}
