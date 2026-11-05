import Papa from 'papaparse';
import type { Field } from './types';

export function fieldKind(field: Field) {
  if (field.value_type.includes('asset_ref')) return 'asset';
  if (field.enum_values?.length || field.value_type === 'boolean') return 'choice';
  if (['integer', 'number'].includes(field.value_type)) return 'number';
  if (['object', 'array', 'json'].includes(field.value_type) || field.value_type.endsWith('[]')) return 'structured';
  return 'text';
}

export function fieldRole(field: Field) {
  const kind = fieldKind(field);
  if (kind !== 'choice') return kind;
  if (field.value_type === 'boolean') return 'boolean';
  const metadata = `${field.key} ${field.label}`;
  if (field.enum_values?.some(value => /^\d+\s*:\s*\d+$/.test(String(value))) || /aspect.?ratio|宽高比/i.test(metadata)) return 'ratio';
  if (field.enum_values?.some(value => /^\d+\s*[x×]\s*\d+$/i.test(String(value))) || /resolution|output.?size|输出尺寸|分辨率/i.test(metadata)) return 'dimensions';
  if (/style|风格/i.test(metadata)) return 'style';
  return kind;
}

export function taskPaste(text: string, column: number, columns: number) {
  if (!text.includes('\t')) return null;
  // Pretty-printed JSON belongs to one field, even when indented with tabs.
  try { JSON.parse(text); return null; } catch { /* Parse spreadsheet cells below. */ }
  const parsed = Papa.parse<string[]>(text, { delimiter: '\t', skipEmptyLines: 'greedy' });
  if (parsed.errors.length || parsed.data.length > 2000 || parsed.data.some(row => column + row.length > columns)) {
    throw new Error('粘贴格式有误或超出现有字段列数，请调整后重试。');
  }
  return parsed.data;
}
