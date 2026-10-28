import { marketCategory } from '@/lib/skill-commerce';
import { getSkillCategory, matchesSkillCategory } from '@/lib/skill-categories';
import { localizedPath } from '@/lib/locale';
import { translateSkillText } from '@/lib/i18n';
import { notFound, permanentRedirect } from 'next/navigation';
import { PublicCatalog } from '@/components/public-catalog';
import { featuredWorkflows } from '@/lib/featured';
import { listingModelLabel } from '@/lib/market';
import type { PublicSkill } from '@/lib/public-skills';
import { getPublicCardSkills, getPublicSkills, getSubscriptionSkillIds } from '@/lib/public-skills';
import { pageMetadata } from '@/lib/seo';
type Params = { params:Promise<{locale:'zh-CN'|'en'}>; searchParams: Promise<{ q?: string; page?: string; category?: string; billing?: string }> };
export async function generateMetadata({ searchParams, params }: Params) {
  const { locale } = await params;
  const { q, page, category, billing } = await searchParams;
  const n = Number(page || 1);
  const suffix = n > 1 && Number.isSafeInteger(n) ? (locale === 'en' ? ` · Page ${n}` : ` · 第 ${n} 页`) : '';
  return { ...pageMetadata(locale === 'en' ? `AI Skill Workflow Directory${suffix} · LoomSkill` : `AI Skill 工作流目录${suffix} · LoomSkill`, locale === 'en' ? `Explore AI Skills for images, videos, writing and presentation outlines. Preview inputs, examples and pricing without signing in${suffix}.` : `探索图片、视频、文案与汇报等用途的 AI Skill。免登录查看用途、输入要求、公开示例和费用说明，选择工作流开始批量处理${suffix}。`, '/skills' + (suffix ? `?page=${n}` : ''), locale), ...((q || category || billing) ? { robots: { index: false, follow: true } } : {}) };
}
export default async function SkillsPage({ searchParams, params:routeParams }: Params) {
  const {locale} = await routeParams;
  const params = await searchParams;
  if (typeof params.q !== 'undefined' && typeof params.q !== 'string') notFound();
  if (typeof params.category !== 'undefined' && (typeof params.category !== 'string' || !getSkillCategory(params.category) && !marketCategory(params.category))) notFound();
  const useCase = getSkillCategory(params.category);
  const category = marketCategory(params.category);
  if (params.billing !== undefined && params.billing !== 'subscription') notFound();
  const query = (params.q || '').trim().slice(0, 100);
  if (params.page && !/^[1-9]\d{0,5}$/.test(params.page)) notFound();
  const page = Number(params.page || 1);
  if (params.page === '1' && !query && !params.category && !params.billing) permanentRedirect(localizedPath('/skills',locale));
  const all = await getPublicSkills();
  const subscriptionIds = params.billing === 'subscription' ? await getSubscriptionSkillIds() : null;
  const billable = subscriptionIds ? all.filter(skill => subscriptionIds.has(skill.id)) : all;
  const categorized = category ? billable.filter(skill => skill.category === category.code) : useCase ? billable.filter(skill => matchesSkillCategory(skill, useCase.id)) : billable;
  const filtered = query ? categorized.filter(skill => `${skill.displayName} ${skill.description} ${translateSkillText('en', skill.displayName)} ${translateSkillText('en', skill.description)}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())) : categorized;
  const pages = Math.max(1, Math.ceil(filtered.length / 24));
  if (page > pages) notFound();
  function card(skill: PublicSkill) {
    const { id, displayName, description, creator, officialTemplateId, taskFixedFeeT, currency, category, pricing } = skill;
    return { id, displayName, description, creator, officialTemplateId, taskFixedFeeT, currency, category, pricing, model: listingModelLabel(skill) };
  }
  const visible = filtered.slice((page - 1) * 24, page * 24);
  const featuredIds = new Set(featuredWorkflows.map(entry => entry.listingId || entry.officialTemplateId));
  const enriched = await getPublicCardSkills([...visible, ...all.filter(skill => featuredIds.has(skill.id))]);
  const cards = new Map(enriched.map(skill => [skill.id, card(skill)]));
  const skills = visible.map(skill => cards.get(skill.id)!);
  const featured = featuredWorkflows.map(entry => ({ entry, skill: cards.get((entry.listingId || entry.officialTemplateId)!) || null }));
  return <PublicCatalog skills={skills} featured={featured} total={filtered.length} page={page} pages={pages} query={query} category={params.category} subscriptionsOnly={!!params.billing} />;
}
