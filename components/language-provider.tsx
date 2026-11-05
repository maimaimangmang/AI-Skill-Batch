'use client';

import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { translate, translateSkillText, type Locale } from '@/lib/i18n';
import { localizedPath } from '@/lib/locale';
import { preserveReturnNavigation } from '@/lib/navigation';

type I18n = { locale: Locale; setLocale: (locale: Locale) => void; t: (source: string, ...values: unknown[]) => string; skillText: (source: string) => string; href: (path:string) => string };
const LanguageContext = createContext<I18n | null>(null);

export function LanguageProvider({ children, initialLocale = 'zh-CN' }: { children: React.ReactNode; initialLocale?:Locale }) {
  const router = useRouter();
  const locale = initialLocale;
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const setLocale = useCallback((next: Locale) => {
    if (next === locale) return;
    const event = new CustomEvent('loomskill-language-change', { cancelable: true, detail: next });
    if (!window.dispatchEvent(event)) return;
    // The URL is authoritative, including when a link is shared or opened in a new tab.
    const destination = localizedPath(window.location.pathname + window.location.search + window.location.hash, next);
    preserveReturnNavigation(destination);
    router.replace(destination, { scroll:false });
  }, [router, locale]);
  const t = useCallback((source: string, ...values: unknown[]) => translate(locale, source, ...values), [locale]);
  const skillText = useCallback((source: string) => translateSkillText(locale, source), [locale]);
  const href = useCallback((path:string) => localizedPath(path, locale), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t, skillText, href }), [locale, setLocale, t, skillText, href]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('LanguageProvider is required');
  return value;
}

export function LanguageSwitcher({ corner = false }: { corner?: boolean }) {
  const { locale, setLocale } = useI18n();
  return <div className={`language-switcher${corner ? ' language-switcher-corner' : ''}`} role="group" aria-label={locale === 'en' ? 'Website language' : '网页语言'}>
    <button type="button" lang="zh-CN" aria-label="切换为中文" aria-pressed={locale === 'zh-CN'} onClick={() => setLocale('zh-CN')}>中</button>
    <span aria-hidden="true">/</span>
    <button type="button" lang="en" aria-label="Switch to English" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>EN</button>
  </div>;
}
