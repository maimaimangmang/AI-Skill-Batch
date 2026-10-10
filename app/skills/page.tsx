import { notFound, redirect } from 'next/navigation';
import { PublicCatalog } from '@/components/public-catalog';
import { featuredWorkflows } from '@/lib/featured';
import { schemaOf } from '@/lib/domain';
import { listingModelLabel } from '@/lib/market';
import type { PublicSkill } from '@/lib/public-skills';
import { getPublicSkill, getPublicSkills } from '@/lib/public-skills';
import { pageMetadata } from '@/lib/seo';
type Params = { searchParams: Promise<{ q?: string; page?: string }> };
export async function generateMetadata({ searchParams }: Params) {
  const { q, page } = await searchParams;
  const n = Number(page || 1);
  const suffix = n > 1 && Number.isSafeInteger(n) ? ` · 第 ${n} 页` : '';
  return { ...pageMetadata(`AI Skill 工作流目录${suffix} · LoomSkill`, `探索图片生成、文案创作等 AI 工作流。免登录查看每个 Skill 的用途、输入要求、示例和费用说明${suffix}。`, '/skills' + (suffix ? `?page=${n}` : '')), ...(q ? { robots: { index: false, follow: true } } : {}) };
}
export default async function SkillsPage({ searchParams }: Params) {
  const params = await searchParams;
  if (typeof params.q !== 'undefined' && typeof params.q !== 'string') notFound();
  const query = (params.q || '').trim().slice(0, 100);
  if (params.page && !/^[1-9]\d{0,5}$/.test(params.page)) notFound();
  const page = Number(params.page || 1);
  if (params.page === '1' && !query) redirect('/skills');
  const all = await getPublicSkills();
  const filtered = query ? all.filter(skill => `${skill.displayName} ${skill.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())) : all;
  const pages = Math.max(1, Math.ceil(filtered.length / 24));
  if (page > pages) notFound();
  function card(skill: PublicSkill) {
    const { id, displayName, description, creator, officialTemplateId, taskFixedFeeT, currency } = skill;
    let requiredFields: number | null = null;
    try { requiredFields = schemaOf(skill).fields.filter(field => field.required).length; } catch { /* Keep unknown field counts distinct from zero. */ }
    return { id, displayName, description, creator, officialTemplateId, taskFixedFeeT, currency, requiredFields, model: listingModelLabel(skill) };
  }
  const visible = filtered.slice((page - 1) * 24, page * 24);
  // The list response omits creator names. Read only public details for the author row.
  const skills = visible.map(card);
  for (let start = 0; start < skills.length; start += 6) {
    await Promise.all(skills.slice(start, start + 6).map(async skill => {
      if (skill.creator?.nickname) return;
      try {
        const detail = await getPublicSkill(skill.id);
        if (detail?.creator?.nickname) skill.creator = detail.creator;
      } catch { /* A missing author must not prevent browsing the catalog. */ }
    }));
  }
  const featured = featuredWorkflows.map(entry => {
    const skill = all.find(item => item.id === (entry.listingId || entry.officialTemplateId));
    return { entry, skill: skill ? card(skill) : null };
  });
  return <PublicCatalog skills={skills} featured={featured} total={filtered.length} page={page} pages={pages} query={query} />;
}
