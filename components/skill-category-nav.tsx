'use client';
import Link from './localized-link';
import { ImageIcon, Video, FileText, Presentation, ArrowUpRight } from 'lucide-react';
import { skillCategories, type SkillCategoryId } from '@/lib/skill-categories';
import { useI18n } from './language-provider';
const icons = { images: ImageIcon, video: Video, writing: FileText, presentations: Presentation };
export default function SkillCategoryNav({ compact = false, active }: { compact?: boolean; active?: SkillCategoryId }) {
  const { t } = useI18n();
  return <nav className={`skill-category-nav${compact ? ' is-compact' : ''}`} aria-label={t('按用途探索 Skill')}>
    {compact && <Link href="/skills" aria-current={!active ? 'page' : undefined}>{t('全部工作流')}</Link>}
    {skillCategories.map(category => { const Icon = icons[category.id]; return <Link key={category.id} data-home-motion={!compact ? '' : undefined} href={compact ? `/skills?category=${category.id}` : `/use-cases/${category.id}`} aria-current={active === category.id ? 'page' : undefined}><Icon size={19} aria-hidden="true" /><span><strong>{t(category.title)}</strong>{!compact && <small>{t(category.description)}</small>}</span>{!compact && <ArrowUpRight size={16} aria-hidden="true" />}</Link>; })}
  </nav>;
}
