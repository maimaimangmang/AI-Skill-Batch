'use client';
import { marketCategories } from '@/lib/skill-commerce';
import Link from './localized-link';
import { useI18n } from './language-provider';
import { useRouter } from 'next/navigation';

export default function MarketCategoryFilter({ active, query, subscriptionsOnly, onChange }: { active?: string; query: string; subscriptionsOnly: boolean; onChange: (target: string, category: string, subscription: boolean) => void }) {
  const { t, href } = useI18n(); const router = useRouter();
  function target(category: string, subscription = subscriptionsOnly) {
    const params = new URLSearchParams(); if (category) params.set('category', category); if (subscription) params.set('billing', 'subscription'); if (query) params.set('q', query);
    return `/skills${params.size ? '?' + params : ''}`;
  }
  return <div className="market-category-filter">
    <nav className="market-category-chips" aria-label={t('Skill 分类')}>
      {[{ code: '', label: '全部分类' }, ...marketCategories].map(category => <Link key={category.code} href={target(category.code)} scroll={false} prefetch={false}
        onMouseEnter={() => router.prefetch(href(target(category.code)))} onFocus={() => router.prefetch(href(target(category.code)))}
        onNavigate={event => { event.preventDefault(); onChange(target(category.code), category.code, subscriptionsOnly); }}
        aria-current={(active || '') === category.code ? 'page' : undefined}>{t(category.label)}</Link>)}
    </nav>
    <label className="market-category-select">{t('Skill 分类')}<select value={active || ''} onChange={event => onChange(target(event.target.value), event.target.value, subscriptionsOnly)}>{[{ code: '', label: '全部分类' }, ...marketCategories].map(category => <option key={category.code} value={category.code}>{t(category.label)}</option>)}</select></label>
    <Link className="subscription-filter" href={target(active || '', !subscriptionsOnly)} scroll={false} prefetch={false}
      onMouseEnter={() => router.prefetch(href(target(active || '', !subscriptionsOnly)))} onFocus={() => router.prefetch(href(target(active || '', !subscriptionsOnly)))}
      onNavigate={event => { event.preventDefault(); onChange(target(active || '', !subscriptionsOnly), active || '', !subscriptionsOnly); }}
      aria-current={subscriptionsOnly ? 'page' : undefined}><span aria-hidden="true">{subscriptionsOnly ? '✓' : '+'}</span>{t('有订阅方案')}</Link>
  </div>;
}
