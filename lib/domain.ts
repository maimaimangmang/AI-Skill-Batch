import type { Field, InputRow, Listing, Schema } from './types';
export function schemaOf(listing: Listing): Schema {
  const raw = typeof listing.inputSchemaSnapshot === 'string' ? JSON.parse(listing.inputSchemaSnapshot) : listing.inputSchemaSnapshot;
  if (!raw || !Array.isArray(raw.fields) || !raw.fields.length) throw new Error('这个工作流暂未提供可填写的输入字段。');
  const fields = raw.fields.filter((f: Field) => typeof f.key === 'string' && f.key && !['__proto__', 'constructor', 'prototype'].includes(f.key));
  if (fields.length !== raw.fields.length || fields.length > 100) throw new Error('工作流输入字段无效。');
  return { ...raw, fields: [...fields].sort((a: Field, b: Field) => (a.order ?? 0) - (b.order ?? 0)) };
}
export function emptyRow(fields: Field[]): InputRow {
  return Object.fromEntries(fields.map(f => [f.key, '']));
}
export function cellText(value: unknown): string {
  return value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
}
// Defaults are applied only after a row has user input, so untouched editor
// rows do not become billable tasks merely because the schema has defaults.
export function isBlankRow(raw: unknown, fields: Field[]): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  return fields.every(field => {
    const value = (raw as InputRow)[field.key];
    return value == null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && value.length === 0);
  });
}
export function normalizeRows(input: unknown, fields: Field[]): { rows: InputRow[]; errors: string[] } {
  if (!Array.isArray(input)) return { rows: [], errors: ['任务表格式无效。'] };
  const errors: string[] = [];
  const rows = input.flatMap((raw, index) => {
    const row: InputRow = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { errors.push(`第 ${index + 1} 行格式无效`); return []; }
    if (isBlankRow(raw, fields)) return [];
    for (const field of fields) {
      let value = raw[field.key];
      if (typeof value === 'string') value = value.trim();
      if (value === '' || value == null) value = field.default_value ?? '';
      const missing = value === '' || value == null || (Array.isArray(value) && value.length === 0);
      if (missing) { if (field.required) errors.push(`第 ${index + 1} 行「${field.label}」必填`); continue; }
      if (field.enum_values?.length && !field.enum_values.some(option => cellText(option) === cellText(value))) errors.push(`第 ${index + 1} 行「${field.label}」请选择有效选项`);
      const type = field.value_type;
      if (['number', 'integer'].includes(type)) {
        if ((typeof value !== 'string' && typeof value !== 'number') || !Number.isFinite(Number(value)) || (type === 'integer' && !Number.isInteger(Number(value)))) errors.push(`第 ${index + 1} 行「${field.label}」需要${type === 'integer' ? '整数' : '数字'}`);
        else value = Number(value);
      } else if (type === 'boolean') {
        if (value === 'true') value = true;
        if (value === 'false') value = false;
        if (typeof value !== 'boolean') errors.push(`第 ${index + 1} 行「${field.label}」请选择是或否`);
      } else if (type.endsWith('[]') || type === 'array' || type === 'object' || type === 'json') {
        if (typeof value === 'string') { try { value = JSON.parse(value); } catch { errors.push(`第 ${index + 1} 行「${field.label}」需要有效 JSON`); } }
        if ((type.endsWith('[]') || type === 'array') && !Array.isArray(value)) errors.push(`第 ${index + 1} 行「${field.label}」需要数组`);
      } else if (type === 'string' && typeof value !== 'string') value = cellText(value);
      if (type.includes('asset_ref')) {
        const values = Array.isArray(value) ? value : [value];
        if (values.some(v => typeof v !== 'string' || !(/^ia_[\w-]+$/.test(v) || safeUrl(v)))) errors.push(`第 ${index + 1} 行「${field.label}」请上传附件或填写 HTTPS 链接`);
        if (field.max_values && values.length > field.max_values) errors.push(`第 ${index + 1} 行「${field.label}」最多 ${field.max_values} 个附件`);
      }
      if (cellText(value).length > 50000) errors.push(`第 ${index + 1} 行「${field.label}」内容过长`);
      row[field.key] = value;
    }
    return [row];
  });
  if (!rows.length && !errors.length) errors.push('请至少填写一行任务，空白行不会提交。');
  return { rows, errors };
}
export function safeUrl(value?: string): string | undefined {
  if (!value) return;
  try { const url = new URL(value); if (url.protocol === 'https:') return url.href; } catch {}
}
export function money(value: number | undefined, currency?: string): string {
  if (value == null || !Number.isFinite(value)) return '暂未返回';
  if (!currency) return `${value} T（币种未返回）`;
  try { return new Intl.NumberFormat('zh-CN', { style: 'currency', currency, maximumFractionDigits: 4 }).format(value / 1e7); }
  catch { return `${(value / 1e7).toFixed(4)} ${currency}`; }
}
const statuses: Record<string, string> = { queued: '排队中', pending: '等待中', accepted: '已提交', running: '运行中', processing: '运行中', completed: '已完成', succeeded: '已完成', failed: '失败', cancelled: '已取消', partially_failed: '部分失败', partially_cancelled: '部分取消' };
export const statusLabel = (s: string) => statuses[s?.toLowerCase()] ?? s ?? '等待中';
export const terminal = (s: string) => ['completed', 'succeeded', 'failed', 'cancelled', 'partially_failed', 'partially_cancelled'].includes(s?.toLowerCase());
export const failed = (s: string) => ['failed', 'cancelled', 'partially_failed', 'partially_cancelled'].includes(s?.toLowerCase());
