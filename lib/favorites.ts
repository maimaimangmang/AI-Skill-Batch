import { validSkillId } from './skill-links';

export const FAVORITES_LIMIT = 200;
export type FavoriteSkill = { id: string; displayName: string; description: string };
export type SavedFavorite = FavoriteSkill & { savedAt: number };
export function favoriteSkill(value: unknown): FavoriteSkill | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string' || !validSkillId(item.id) || typeof item.displayName !== 'string' || !item.displayName.trim() || item.displayName.length > 240 || typeof item.description !== 'string' || item.description.length > 6000) return null;
  // Never retain schema, task input, credentials, or an arbitrary destination URL.
  return { id: item.id, displayName: item.displayName, description: item.description };
}
