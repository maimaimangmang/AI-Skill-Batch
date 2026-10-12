'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Search, Star, LoaderCircle } from 'lucide-react';
import { PublicShell } from './public-site';
import FavoriteButton from './favorite-button';
import { useFavorites } from './favorites-provider';
import { useI18n } from './language-provider';
import { translateSkillCardText } from '@/lib/i18n';
import { skillPath } from '@/lib/skill-links';
import type { FavoriteSkill } from '@/lib/favorites';

export default function FavoritesPage({ catalog }: { catalog: FavoriteSkill[] | null }) {
  const { items, mode, busy, connect } = useFavorites();
  const { locale, t } = useI18n();
  const [query, setQuery] = useState('');
  const text = (source: string) => translateSkillCardText(locale, source);
  const current = new Map(catalog?.map(item => [item.id, item]));
  const results = items.map(saved => ({ skill: current.get(saved.id) || saved, unavailable: catalog !== null && !current.has(saved.id) })).filter(({ skill }) => `${skill.displayName} ${skill.description} ${text(skill.displayName)} ${text(skill.description)}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <PublicShell><main className="favorites-page"><header className="favorites-heading"><div><span className="public-eyebrow">MY FAVORITES</span><h1>{t('我的收藏')}</h1><p>{t('常用的 Skill，随时回来继续用。')}</p></div><Link className="public-button" href="/skills">{t('探索 Skill')}<ArrowRight size={16} /></Link></header>
    <div className="favorites-storage">{mode === 'synced' ? <span>{t('已同步。同一个 API Key 可在其他设备查看收藏。')}</span> : null}</div>
    {mode === 'loading' ? <div className="favorites-empty" role="status"><LoaderCircle className="spin" size={26} /><p>{t('正在读取收藏…')}</p></div> : mode === 'error' ? null : mode === 'disconnected' ? <div className="favorites-empty"><Star size={32} /><h2>{t('连接后查看我的收藏')}</h2><p>{t('连接后收藏常用 Skill，并在手机和电脑之间同步。')}</p><button type="button" className="public-button primary" onClick={connect}>{t('连接并同步')}<ArrowRight size={16} /></button></div> : <>
      {!!items.length && <div className="favorites-toolbar"><span>{t('{0} 个收藏', items.length)}</span><label><Search size={17} /><input aria-label={t('搜索收藏')} placeholder={t('搜索收藏')} value={query} onChange={event => setQuery(event.target.value)} /></label></div>}
      {catalog === null && !!items.length && <p className="notice">{t('暂未获取最新 Skill 信息，正在显示收藏时的内容。')}</p>}
      {results.length ? <div className="favorites-grid">{results.map(({ skill, unavailable }) => <article className="favorite-card" key={skill.id}><div className="favorite-card-heading"><h2>{text(skill.displayName)}</h2><FavoriteButton skill={skill} /></div><p>{text(skill.description) || t('查看输入要求，开始你的下一批创作。')}</p>{unavailable ? <span className="favorite-unavailable">{t('此 Skill 已下架或暂不可用')}</span> : <Link href={skillPath(skill.id)} className="favorite-use">{t('使用')}<ArrowRight size={16} /></Link>}</article>)}</div> : <div className="favorites-empty"><Star size={32} /><h2>{t(items.length ? '没有找到匹配的收藏' : '还没有收藏 Skill')}</h2><p>{t(items.length ? '换个关键词试试。' : '点击 Skill 旁的五角星，就能在这里快速找到它。')}</p>{items.length ? <button className="public-button" type="button" onClick={() => setQuery('')}>{t('清除搜索')}</button> : <Link className="public-button primary" href="/skills">{t('去找喜欢的 Skill')}<ArrowRight size={16} /></Link>}</div>}
    </>}{busy && mode !== 'loading' && <span className="sr-only" role="status">{t('正在保存收藏…')}</span>}
  </main></PublicShell>;
}
