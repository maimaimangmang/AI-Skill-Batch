import type { Locale } from './i18n';

export const locales = ['zh-CN', 'en'] as const;
export function isLocale(value: string): value is Locale { return value === 'zh-CN' || value === 'en'; }
export function pathLocale(path: string): Locale { return /^\/en(?:[/?#]|$)/.test(path) ? 'en' : 'zh-CN'; }
export function unlocalizedPath(path: string) { return path.replace(/^\/(?:en|zh-CN)(?=\/|\?|#|$)/, '') || '/'; }
// Only local page URLs are localized; assets, API requests and external links stay intact.
export function localizedPath(path: string, locale: Locale): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  let base = unlocalizedPath(path);
  if (base.startsWith('?') || base.startsWith('#')) base = '/' + base;
  const pathname = base.split(/[?#]/)[0];
  if (/^\/(?:api|_next|examples)(?:\/|$)/.test(pathname) || /\.[a-z0-9]+$/i.test(pathname) || pathname === '/share-image') return base;
  return locale === 'en' ? '/en' + (base === '/' ? '' : base.startsWith('/?') || base.startsWith('/#') ? base.slice(1) : base) : base;
}
