import type { DraftAssets } from './draft-assets';
import type { InputRow } from './types';

// A one-use handoff for a language navigation, kept only in this tab's memory.
// Never retain keys, quotes or account data, or write draft files to storage.
type Draft = { skillId: string; version?: string; locale: string; rows: InputRow[]; assets: DraftAssets };
let pending: (Draft & { expires: number }) | undefined;
let expiry: ReturnType<typeof setTimeout> | undefined;
export function clearLanguageDraft() { pending = undefined; clearTimeout(expiry); }
export function stageLanguageDraft(draft: Draft) {
  clearLanguageDraft();
  pending = { ...draft, rows: structuredClone(draft.rows), assets: new Map(draft.assets), expires: Date.now() + 60000 };
  expiry = setTimeout(clearLanguageDraft, 60000);
}
export function takeLanguageDraft(skillId: string, version: string | undefined, locale: string) {
  const draft = pending;
  if (!draft || draft.skillId !== skillId || draft.version !== version || draft.locale !== locale) return;
  clearLanguageDraft();
  return draft.expires > Date.now() ? draft : undefined;
}
