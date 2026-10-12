'use client';
import { Star } from 'lucide-react';
import type { FavoriteSkill } from '@/lib/favorites';
import { useFavorites } from './favorites-provider';
import { useI18n } from './language-provider';
import { translateSkillCardText } from '@/lib/i18n';

export default function FavoriteButton({ skill, label = false, tabIndex }: { skill: FavoriteSkill; label?: boolean; tabIndex?: number }) {
  const { items, busy, mode, toggle } = useFavorites();
  const { locale, t } = useI18n();
  const saved = items.some(item => item.id === skill.id);
  const title = t(saved ? '取消收藏：{0}' : '收藏：{0}', translateSkillCardText(locale, skill.displayName));
  return <button type="button" className={`favorite-button${saved ? ' is-saved' : ''}${label ? ' with-label' : ''}`} aria-label={title} title={title} aria-pressed={saved} disabled={busy || mode === 'error'} tabIndex={tabIndex} onClick={() => void toggle(skill)}><Star size={18} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />{label && <span>{t(saved ? '已收藏' : '收藏')}</span>}</button>;
}

export function FavoritesNotice() {
  const { error, busy, reload } = useFavorites();
  const { t } = useI18n();
  return error ? <div className="favorites-notice" role="alert"><span>{t(error)}</span><button type="button" onClick={reload} disabled={busy}>{t('重试')}</button></div> : null;
}
