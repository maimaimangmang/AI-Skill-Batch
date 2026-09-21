// Keep references as values; presentation metadata and local preview URLs never
// enter the submitted task payload. Excel imports may store arrays as JSON.
export function assetValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value == null || value === '') return [];
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed.map(String); } catch {}
  }
  return [String(value)];
}
export const isAssetId = (value: string) => /^ia_[\w-]+$/.test(value);

export function mergeAssetLinks(value: unknown, text: string, multiple: boolean, max?: number): string[] {
  const links = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!links.length) throw new Error('请先填写链接。');
  if (!multiple && links.length > 1) throw new Error('此字段只能填写一个链接。');
  for (const link of links) {
    let valid = false;
    try { valid = new URL(link).protocol === 'https:'; } catch {}
    if (!valid) throw new Error('请填写以 https:// 开头的图片或文件直链。');
  }
  const result = [...new Set([...(multiple ? assetValues(value).filter(Boolean) : []), ...links])];
  if (max && result.length > max) throw new Error(`最多添加 ${max} 个附件。`);
  return result;
}
