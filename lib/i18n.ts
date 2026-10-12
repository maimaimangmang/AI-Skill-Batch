import english from './translations/en.json';
import skillCardEnglish from './translations/skill-cards.en.json';

export type Locale = 'zh-CN' | 'en';
export const languagePreference = (value: string | null): Locale => value === 'en' ? 'en' : 'zh-CN';
const messages: Record<string, string> = english;
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = Object.entries(messages).filter(([key]) => /\{\d+\}/.test(key)).map(([key, value]) => {
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

// Reviewed public card copy only. Exact source matching avoids showing a stale
// translation when an author updates a listing, and never changes task content.
export function translateSkillCardText(locale: Locale, source: string): string {
  const cards: Record<string, string> = skillCardEnglish;
  return locale === 'en' && Object.hasOwn(cards, source) ? cards[source] : source;
}
