import type { Field, InputRow } from './types';

type DraftAsset = { file: File; uploadedId?: string };
export type DraftAssets = Map<string, DraftAsset>;
const prefix = 'ia_local_';

export function stageDraftAsset(assets: DraftAssets, file: File): string {
  if (file.size > 10 * 1024 * 1024) throw new Error('每个附件最大 10 MB。');
  const total = [...assets.values()].reduce((sum, asset) => sum + asset.file.size, 0);
  if (total + file.size > 100 * 1024 * 1024) throw new Error('待上传附件合计不能超过 100 MB。');
  const id = prefix + crypto.randomUUID();
  assets.set(id, { file });
  return id;
}

// Resolve only asset fields, and only files still referenced in the current rows.
// Cache successful uploads so a quote/upload retry does not transfer them twice.
export async function resolveDraftAssets(rows: InputRow[], fields: Field[], assets: DraftAssets, upload: (file: File) => Promise<{ inputAssetId: string }>): Promise<InputRow[]> {
  const resolve = async (value: unknown): Promise<unknown> => {
    if (Array.isArray(value)) {
      const values: unknown[] = [];
      for (const item of value) values.push(await resolve(item));
      return values;
    }
    if (typeof value !== 'string' || !value.startsWith(prefix)) return value;
    const asset = assets.get(value);
    if (!asset) throw new Error('本地附件已失效，请重新选择文件。');
    if (!asset.uploadedId) {
      const result = await upload(asset.file);
      if (!/^ia_[\w-]+$/.test(result.inputAssetId || '') || result.inputAssetId.startsWith(prefix)) throw new Error('上传未返回有效附件，请重试。');
      asset.uploadedId = result.inputAssetId;
    }
    return asset.uploadedId;
  };
  const resolved: InputRow[] = [];
  for (const row of rows) {
    const next = { ...row };
    for (const field of fields) if (field.value_type.includes('asset_ref')) {
      next[field.key] = await resolve(row[field.key]);
    }
    resolved.push(next);
  }
  return resolved;
}
