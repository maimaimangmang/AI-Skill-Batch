'use client';

import Link from 'next/link';
import { PublicShell } from './public-site';
import { useI18n } from './language-provider';

export function MissingPage() {
  const { t } = useI18n();
  return <PublicShell><main className="public-empty">
    <span className="public-eyebrow">404</span>
    <h1>{t('没有找到这个页面')}</h1>
    <p>{t('这个页面不存在、已移除，或链接有误。')}</p>
    <div className="public-actions" style={{ justifyContent: 'center' }}>
      <Link className="public-button" href="/">{t('返回首页')}</Link>
      <Link className="public-button primary" href="/skills">{t('浏览可用 Skill')}</Link>
    </div>
  </main></PublicShell>;
}
