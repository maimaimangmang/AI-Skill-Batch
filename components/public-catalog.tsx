'use client';
import Link from './localized-link';
import MarketCategoryFilter from './market-category-filter';
import { SkillPrice, SkillTags } from './skill-pricing';
import { marketCategory } from '@/lib/skill-commerce';
import { getSkillCategory } from '@/lib/skill-categories';
import FavoriteButton from './favorite-button';
import { ArrowRight, ArrowUpRight, FileText, Flame, Image as ImageIcon, Images, Search, Sparkles, RefreshCw } from 'lucide-react';
import { PublicShell } from './public-site';
import WorkflowAuthor from './workflow-author';
import { useI18n } from './language-provider';
import { useEffect, useOptimistic, useRef, useState, useTransition, type PointerEvent } from 'react';
import { useRouter } from 'next/navigation';
import { refreshPublicCatalog } from '@/app/[locale]/skills/actions';
import { marketPageNumbers } from '@/lib/market';
import { skillPath } from '@/lib/skill-links';
import type { PublicSkill } from '@/lib/public-skills';
import type { FeaturedWorkflow } from '@/lib/featured';

type CatalogSkill = Pick<PublicSkill, 'id' | 'displayName' | 'description' | 'creator' | 'officialTemplateId' | 'taskFixedFeeT' | 'currency' | 'category' | 'pricing'> & { model: string };
type Recommendation = { entry: FeaturedWorkflow; skill: CatalogSkill | null };

export function PublicCatalog({ skills, featured, total, page, pages, query, category, subscriptionsOnly }: { skills: CatalogSkill[]; featured: Recommendation[]; total: number; page: number; pages: number; query: string; category?: string; subscriptionsOnly: boolean }) {
  const { t, skillText, href } = useI18n();
  const router = useRouter();
  const [filterPending, startFilterTransition] = useTransition();
  const [selectedFilters, selectFilters] = useOptimistic({ category, subscriptionsOnly });
  function changeFilter(target: string, nextCategory: string, nextSubscriptionsOnly: boolean) {
    startFilterTransition(() => {
      selectFilters({ category: nextCategory, subscriptionsOnly: nextSubscriptionsOnly });
      router.push(href(target), { scroll: false });
    });
  }
  const [refreshing, startRefresh] = useTransition();
  const [refreshError, setRefreshError] = useState(false);
  const [slide, setSlide] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const swipeStart = useRef<{ x:number; y:number; id:number } | null>(null);
  const suppressClickUntil = useRef(0);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const carouselRef = useRef<HTMLElement>(null);
  const activeSlide = slide % Math.max(1, featured.length);
  const autoplay = !paused && !reducedMotion && !dragging;
  useEffect(() => {
    const phone = window.matchMedia('(max-width:760px)');
    const motion = window.matchMedia('(prefers-reduced-motion:reduce)');
    const update = () => { setMobile(phone.matches); setReducedMotion(motion.matches); };
    update();
    phone.addEventListener('change', update); motion.addEventListener('change', update);
    return () => { phone.removeEventListener('change', update); motion.removeEventListener('change', update); };
  }, []);
  useEffect(() => {
    const element = carouselRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold:0.2 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [featured.length]);
  useEffect(() => {
    if (!mobile || !autoplay || hovered || !visible || featured.length < 2) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setSlide(current => (current + 1) % featured.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [mobile, autoplay, hovered, visible, featured.length, slide]);
  function startSwipe(event: PointerEvent<HTMLDivElement>) {
    if (!mobile || !event.isPrimary || featured.length < 2) return;
    swipeStart.current = { x:event.clientX, y:event.clientY, id:event.pointerId };
    suppressClickUntil.current = 0;
    setDragging(true);
  }
  function finishSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStart.current;
    if (!start || start.id !== event.pointerId) return;
    swipeStart.current = null;
    setDragging(false);
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    suppressClickUntil.current = Date.now() + 500;
    if (event.currentTarget.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
    setPaused(false);
    setSlide(current => (current + (dx < 0 ? 1 : -1) + featured.length) % featured.length);
  }
  function cancelSwipe() { swipeStart.current = null; setDragging(false); }
  function refresh() {
    setRefreshError(false);
    startRefresh(async () => {
      try { await refreshPublicCatalog(); } catch { setRefreshError(true); }
    });
  }
  function pageHref(n: number) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    if (subscriptionsOnly) params.set('billing', 'subscription');
    if (n > 1) params.set('page', String(n));
    return '/skills' + (params.size ? `?${params}` : '');
  }
  const useCase = getSkillCategory(category);
  return <PublicShell catalog><main className="public-catalog studio-market">
    <header className="market-heading">
      <h1 id="market-title">{t('热门工作流')}</h1>
    </header>
    <form className="catalog-mobile-search search" action={href('/skills')} role="search">
      {category && <input type="hidden" name="category" value={category} />}{subscriptionsOnly && <input type="hidden" name="billing" value="subscription" />}
      <Search size={18} aria-hidden="true" />
      <input name="q" defaultValue={query} key={query} maxLength={100} placeholder={t('搜索名称或使用场景…')} aria-label={t('搜索 Skill')} />
      <button type="submit">{t('搜索')}</button>
    </form>
    {featured.length > 0 && <section className="featured" aria-labelledby="market-title" ref={carouselRef}
      onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => { setHovered(false); cancelSwipe(); }}>
      <div className="featured-grid" id="featured-slides"
        onPointerDown={startSwipe} onPointerUp={finishSwipe} onPointerCancel={cancelSwipe}
        onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
        onClickCapture={event => { if (Date.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); } }}>{featured.map(({ entry, skill }, index) => {
        const id = entry.listingId || entry.officialTemplateId!;
        const Icon = entry.cover === 'commerce' ? Images : ImageIcon;
        return <article className={`featured-card${index === activeSlide ? ' is-active' : ''}`} key={id} aria-hidden={mobile && index !== activeSlide ? true : undefined} inert={mobile && index !== activeSlide}>
          <div className="featured-category-row">{skill && <FavoriteButton skill={skill} />}<span className="featured-category"><span className="featured-category-icon"><Icon size={18} /></span>{t(entry.category)}</span>{entry.hot && <span className="featured-hot-badge"><Flame size={17} fill="currentColor" aria-label={t('热门')} /></span>}</div>
          <h3>{skill ? <Link className="workflow-card-link" href={skillPath(id)}>{skillText(entry.title)}</Link> : skillText(entry.title)}</h3>
          <WorkflowAuthor name={skill?.creator?.nickname || entry.authorName} />{skill && <SkillTags skill={skill} /> }
          {skill?.model && <span className="featured-model-label"><Sparkles size={11} />{skillText(skill.model)}</span>}
          <p>{t(entry.reason)}</p>
          <div className="featured-card-footer"><div className="featured-price">{skill ? <SkillPrice skill={skill} /> : t('暂未提供')}</div>{skill && <Link className="featured-action" href={skillPath(id)} aria-label={t('使用 {0}', skillText(entry.title))}>{t('使用')}<ArrowUpRight size={14} /></Link>}</div>
        </article>;
      })}</div>
      {featured.length > 1 && <div className="featured-carousel-controls">
        <div className="featured-carousel-dots" role="group" aria-label={t('切换推荐')}>
          {featured.map(({ entry }, index) => <button type="button" key={entry.listingId || entry.officialTemplateId} aria-label={t('查看推荐：{0}', skillText(entry.title))} aria-current={index === activeSlide ? 'true' : undefined} aria-controls="featured-slides" onClick={() => setSlide(index)}><span /></button>)}
        </div>
      </div>}
    </section>}
    <MarketCategoryFilter active={marketCategory(selectedFilters.category)?.code} query={query} subscriptionsOnly={selectedFilters.subscriptionsOnly} onChange={changeFilter} />
    {useCase && <p className="category-guide-link"><Link href={`/use-cases/${category}`}>{t(useCase!.title)} · {t('先看填写示例')}<ArrowRight size={14} /></Link></p>}
    {filterPending && <p className="catalog-filter-status" role="status"><RefreshCw size={15} className="spin" aria-hidden="true" />{t('正在获取工作流…')}</p>}
    <div className="catalog-results" aria-busy={filterPending} inert={filterPending}>
    <div className="market-toolbar">
      <h2>{t(marketCategory(category)?.label || useCase?.title || '全部工作流')}<small className="catalog-result-count">{total}</small></h2>
      <div className="catalog-search-actions"><form className="search" action={href('/skills')} role="search">
      {category && <input type="hidden" name="category" value={category} />}{subscriptionsOnly && <input type="hidden" name="billing" value="subscription" />}
        <button type="submit" aria-label={t('搜索')}><Search size={18} /></button>
        <input name="q" defaultValue={query} key={query} maxLength={100} placeholder={t('搜索名称或使用场景…')} aria-label={t('搜索 Skill')} />
      </form><button className="icon-button refresh-button" type="button" disabled={refreshing} onClick={refresh} aria-label={t('刷新市场')} title={t('刷新市场')}><RefreshCw size={18} className={refreshing ? 'spin' : undefined} /></button></div>
    </div>
    <span className="sr-only" role="status">{refreshing ? t('正在读取市场…') : ''}</span>
    {refreshError && <p role="alert" className="error">{t('刷新失败，请重试。')}</p>}
    {query && <div className="public-catalog-count"><span>{t('“{0}”的搜索结果', query)} · {total}</span><Link href={'/skills' + ((category || subscriptionsOnly) ? '?' + new URLSearchParams({ ...(category ? { category } : {}), ...(subscriptionsOnly ? { billing: 'subscription' } : {}) }) : '')}>{t('清除搜索')}</Link></div>}
    {skills.length ? <div className="workflow-grid">{skills.map(skill => <article className="workflow-card" key={skill.id}>
      <div className="card-top"><span className="workflow-icon"><FileText size={20} /></span><div className="card-title"><h3><Link className="workflow-card-link" href={skillPath(skill.id)}>{skillText(skill.displayName)}</Link></h3><WorkflowAuthor name={skill.creator?.nickname} /></div><FavoriteButton skill={skill} /></div>
      <SkillTags skill={skill} /><p>{skillText(skill.description)}</p>
      <div className="card-model-tags"><span className={`model-tag${skill.model ? ' disclosed' : ''}`}><Sparkles size={11} />{skillText(skill.model) || t('暂无模型信息')}</span></div>
      <div className="card-bottom"><SkillPrice skill={skill} /><Link className="card-use" href={skillPath(skill.id)} aria-label={t('使用 {0}', skillText(skill.displayName))}>{t('使用')}<ArrowRight size={15} /></Link></div>
    </article>)}</div> : <div className="public-empty"><h2>{t('暂未找到匹配的 Skill')}</h2><p>{t('试试更短的关键词，例如“图片”“文案”或“翻译”。')}</p><Link href="/skills">{t('浏览全部 Skill')}</Link></div>}
    <nav className="market-pagination" aria-label={t('工作流市场分页')}>
      <div className="pagination-buttons">
        {page > 1 ? <Link className="button small" href={pageHref(page - 1)} rel="prev">{t('上一页')}</Link> : <button className="button small" disabled>{t('上一页')}</button>}
        {marketPageNumbers(pages, page - 1).map((n, index) => n === null ? <span className="pagination-ellipsis" key={`gap-${index}`} aria-hidden="true">…</span> : n + 1 === page ? <span key={n} className="button small page-number primary" aria-label={t('第 {0} 页', n + 1)} aria-current="page">{n + 1}</span> : <Link key={n} className="button small page-number" href={pageHref(n + 1)} aria-label={t('第 {0} 页', n + 1)}>{n + 1}</Link>)}
        {page < pages ? <Link className="button small" href={pageHref(page + 1)} rel="next">{t('下一页')}</Link> : <button className="button small" disabled>{t('下一页')}</button>}
      </div>
    </nav>
    </div>
  </main></PublicShell>;
}
