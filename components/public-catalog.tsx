'use client';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, FileText, Flame, Image as ImageIcon, Images, Search, Sparkles, Table2 } from 'lucide-react';
import { PublicShell } from './public-site';
import WorkflowAuthor from './workflow-author';
import { useI18n } from './language-provider';
import { skillPath } from '@/lib/skill-links';
import { money } from '@/lib/domain';
import type { PublicSkill } from '@/lib/public-skills';
import type { FeaturedWorkflow } from '@/lib/featured';

type CatalogSkill = Pick<PublicSkill, 'id' | 'displayName' | 'description' | 'creator' | 'officialTemplateId' | 'taskFixedFeeT' | 'currency'> & { model: string; requiredFields: number | null };
type Recommendation = { entry: FeaturedWorkflow; skill: CatalogSkill | null };

export function PublicCatalog({ skills, featured, total, page, pages, query }: { skills: CatalogSkill[]; featured: Recommendation[]; total: number; page: number; pages: number; query: string }) {
  const { t } = useI18n();
  function pageHref(n: number) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (n > 1) params.set('page', String(n));
    return '/skills' + (params.size ? `?${params}` : '');
  }
  function price(skill: CatalogSkill) {
    return skill.officialTemplateId ? t('按模型用量计费') : skill.taskFixedFeeT != null ? money(skill.taskFixedFeeT, skill.currency) : t('执行前查看预估费用');
  }
  return <PublicShell><main className="public-catalog studio-market">
    <header className="market-heading">
      <h1>{t('找到工作流，')}{t('开始批量创作。')}</h1>
      <p>{t('选择 Skill → 填写批量任务 → 确认费用 → 下载结果')}</p>
    </header>
    <section className="featured" aria-labelledby="featured-title">
      <div className="featured-header"><h2 id="featured-title">{t('金牌推荐')}</h2></div>
      <div className="featured-grid">{featured.map(({ entry, skill }) => {
        const id = entry.listingId || entry.officialTemplateId!;
        const Icon = entry.cover === 'commerce' ? Images : ImageIcon;
        return <article className="featured-card" key={id}>
          <div className="featured-category-row"><span className="featured-category"><span className="featured-category-icon"><Icon size={18} /></span>{t(entry.category)}</span>{entry.hot && <span className="featured-hot-badge"><Flame size={17} fill="currentColor" aria-label={t('热门')} /></span>}</div>
          <h3>{skill ? <Link href={skillPath(id)}>{t(entry.title)}</Link> : t(entry.title)}</h3>
          <WorkflowAuthor name={skill?.creator?.nickname || entry.authorName} />
          {skill?.model && <span className="featured-model-label"><Sparkles size={11} />{skill.model}</span>}
          <p>{t(entry.reason)}</p>
          <div className="featured-card-footer"><div className="featured-price"><strong>{skill ? price(skill) : t('暂未提供')}</strong>{skill && !skill.officialTemplateId && skill.taskFixedFeeT != null && <span>{t('/ 次')}</span>}</div>{skill && <Link className="featured-action" href={skillPath(id)} aria-label={t('查看详情：{0}', entry.title)}>{t('查看详情')}<ArrowUpRight size={14} /></Link>}</div>
        </article>;
      })}</div>
      <p className="featured-price-note">{t('模型费用按实际用量另计，提交前会展示预估费用。')}</p>
    </section>
    <div className="market-toolbar">
      <h2>{t('全部工作流')}</h2>
      <form className="search" action="/skills" role="search">
        <button type="submit" aria-label={t('搜索')}><Search size={18} /></button>
        <input name="q" defaultValue={query} key={query} maxLength={100} placeholder={t('搜索名称或使用场景…')} aria-label={t('搜索 Skill')} />
      </form>
    </div>
    {query && <div className="public-catalog-count"><span>{t('“{0}”的搜索结果', query)} · {total}</span><Link href="/skills">{t('清除搜索')}</Link></div>}
    {skills.length ? <div className="workflow-grid">{skills.map(skill => <article className="workflow-card" key={skill.id}>
      <div className="card-top"><span className="workflow-icon"><FileText size={20} /></span><div className="card-title"><h2><Link href={skillPath(skill.id)}>{skill.displayName}</Link></h2><WorkflowAuthor name={skill.creator?.nickname} /></div></div>
      <p>{skill.description}</p>
      <div className="card-model-tags"><span className={`model-tag${skill.model ? ' disclosed' : ''}`}><Sparkles size={11} />{skill.model || t('暂无模型信息')}</span></div>
      <div className="card-meta">{skill.requiredFields != null && <span><Table2 size={12} />{skill.requiredFields}{t(' 个必填字段')}</span>}<span className="card-source">{skill.officialTemplateId ? t('官方模板') : t('LoomLoom 市场')}</span></div>
      <div className="card-bottom"><div><strong>{price(skill)}</strong>{!skill.officialTemplateId && skill.taskFixedFeeT != null && <span>{t('/ 任务调用费')}</span>}</div><Link className="card-use" href={skillPath(skill.id)} aria-label={t('查看详情：{0}', skill.displayName)}>{t('查看详情')}<ArrowRight size={15} /></Link></div>
    </article>)}</div> : <div className="public-empty"><h2>{t('暂未找到匹配的 Skill')}</h2><p>{t('试试更短的关键词，例如“图片”“文案”或“翻译”。')}</p><Link href="/skills">{t('浏览全部 Skill')}</Link></div>}
    <nav className="public-pagination" aria-label={t('分页')}>{page > 1 && <Link href={pageHref(page - 1)} rel="prev">{t('上一页')}</Link>}<span>{t('第 {0} / {1} 页', page, pages)}</span>{page < pages && <Link href={pageHref(page + 1)} rel="next">{t('下一页')}</Link>}</nav>
  </main></PublicShell>;
}
