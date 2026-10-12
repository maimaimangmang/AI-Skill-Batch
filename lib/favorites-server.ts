import { ApiError, db, favoriteOwner, seal, unseal } from './server';
import { FAVORITES_LIMIT, favoriteSkill, type SavedFavorite } from './favorites';

export function readFavorites(apiKey: string) {
  const scope = favoriteOwner(apiKey);
  const rows = db().prepare('SELECT id, payload, saved_at FROM favorites WHERE owner = ? ORDER BY saved_at DESC, id').all(scope) as { id: string; payload: string; saved_at: number }[];
  return { scope, items: rows.map(row => ({ ...unseal<{ displayName: string; description: string }>(row.payload), id: row.id, savedAt: row.saved_at } as SavedFavorite)) };
}
export function changeFavorites(apiKey: string, body: unknown, remove = false) {
  const scope = favoriteOwner(apiKey);
  if (!body || typeof body !== 'object') throw new ApiError('收藏内容无效。');
  const input = body as { scope?: unknown; items?: unknown; id?: unknown };
  if (input.scope !== scope) throw new ApiError('连接已改变，请刷新收藏后重试。', 409);
  const d = db();
  if (remove) {
    if (typeof input.id !== 'string' || !/^[a-zA-Z0-9_-]{1,180}$/.test(input.id)) throw new ApiError('收藏内容无效。');
    d.prepare('DELETE FROM favorites WHERE owner = ? AND id = ?').run(scope, input.id);
    return readFavorites(apiKey);
  }
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > FAVORITES_LIMIT) throw new ApiError('收藏内容无效。');
  const items = input.items.map(favoriteSkill);
  if (items.some(item => !item)) throw new ApiError('收藏内容无效。');
  d.exec('BEGIN IMMEDIATE');
  try {
    const ids = new Set((d.prepare('SELECT id FROM favorites WHERE owner = ?').all(scope) as { id: string }[]).map(item => item.id));
    items.forEach(item => ids.add(item!.id));
    if (ids.size > FAVORITES_LIMIT) throw new ApiError('最多收藏 200 个 Skill，请先移除一些收藏。');
    const insert = d.prepare('INSERT INTO favorites(owner, id, payload, saved_at) VALUES (?, ?, ?, ?) ON CONFLICT(owner,id) DO UPDATE SET payload = excluded.payload');
    for (const item of items) insert.run(scope, item!.id, seal({ displayName: item!.displayName, description: item!.description }), Date.now());
    d.exec('COMMIT');
  } catch (error) { d.exec('ROLLBACK'); throw error; }
  return readFavorites(apiKey);
}
