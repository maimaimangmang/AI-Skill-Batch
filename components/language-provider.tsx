'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translate, type Locale, languagePreference } from '@/lib/i18n';

const preferenceKey = 'loomskill-language';
type I18n = { locale: Locale; setLocale: (locale: Locale) => void; t: (source: string, ...values: unknown[]) => string };
const LanguageContext = createContext<I18n | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, updateLocale] = useState<Locale>('zh-CN');
  useEffect(() => {
    try { updateLocale(languagePreference(localStorage.getItem(preferenceKey))); } catch { /* Chinese remains the default when storage is unavailable. */ }
    const sync = (event: StorageEvent) => {
      if (event.key === preferenceKey || event.key === null) updateLocale(languagePreference(event.newValue));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const setLocale = useCallback((value: Locale) => {
    const next = languagePreference(value);
    updateLocale(next);
    try { localStorage.setItem(preferenceKey, next); } catch { /* Switching still works for this page. */ }
  }, []);
  const t = useCallback((source: string, ...values: unknown[]) => translate(locale, source, ...values), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
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
