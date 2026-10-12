import english from './translations/en.json';
import skillCardEnglish from './translations/skill-cards.en.json';
import skillContentEnglish from './translations/skill-content.en.json';

export type Locale = 'zh-CN' | 'en';
export const languagePreference = (value: string | null): Locale => value === 'en' ? 'en' : 'zh-CN';
const messages: Record<string, string> = english;
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = Object.entries(messages).filter(([key]) => /\{\d+\}/.test(key))
  // Prefer specific messages (e.g. example labels) over broad 'Enter {0}'.
  .sort(([a], [b]) => b.replace(/\{\d+\}/g, '').length - a.replace(/\{\d+\}/g, '').length)
  .map(([key, value]) => {
  const indices = [...key.matchAll(/\{(\d+)\}/g)].map(match => Number(match[1]));
  return { expression: new RegExp('^' + key.split(/\{\d+\}/).map(escape).join('([\\s\\S]*?)') + '$'), indices, value };
});
const format = (template: string, values: unknown[]) => template.replace(/\{(\d+)\}/g, (match, index) => Number(index) < values.length ? String(values[Number(index)] ?? '') : match);
export const sourceMessage = (source: string, ...values: unknown[]) => format(source, values);

// Only explicitly authored interface messages are translated. Unknown text,
// including creator descriptions, task inputs and generated outputs, is preserved.
export function translate(locale: Locale, source: string, ...values: unknown[]): string {
  if (locale === 'zh-CN') return format(source, values);
  if (Object.hasOwn(messages, source)) return format(messages[source], values);
  if (!values.length) for (const pattern of patterns) {
    const match = pattern.expression.exec(source);
    if (match) {
      const captures: string[] = [];
      pattern.indices.forEach((index, position) => { captures[index] = match[position + 1]; });
      return format(pattern.value, captures);
    }
  }
  return format(source, values);
}

// Public Skill metadata has its own dictionary. Call this only for presentation,
// never to rewrite field keys, option values, editable task rows, or API payloads.
// Exact matching keeps updated creator copy from inheriting a stale translation.
const skillMessages: Record<string, string> = { ...skillContentEnglish, ...skillCardEnglish };
export function translateSkillText(locale: Locale, source: string): string {
  if (locale !== 'en') return source;
  if (Object.hasOwn(skillMessages, source)) return skillMessages[source];
  if (Object.hasOwn(messages, source)) return messages[source];
  const sample = /^填写示例 (\d+)$/.exec(source);
  return sample ? translate(locale, '填写示例 {0}', sample[1]) : source;
}
export const translateSkillCardText = translateSkillText;

// Localize only a fresh public sample before the visitor explicitly inserts it.
// Never call this on an editable row. Enum values and attachment references are
// wire values, so their labels may translate but their actual values must not.
export function localizePublicExample(locale: Locale, row: import('./types').InputRow, fields: import('./types').Field[]) {
  const localized = { ...row };
  if (locale !== 'en') return localized;
  for (const field of fields) {
    const value = row[field.key];
    if (typeof value === 'string' && !field.enum_values?.length && field.value_type === 'string') {
      localized[field.key] = Object.hasOwn(skillMessages, value) ? skillMessages[value] : value;
    }
  }
  return localized;
}
