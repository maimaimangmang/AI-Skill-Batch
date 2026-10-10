import { notFound, redirect } from 'next/navigation';
import { PublicCatalog } from '@/components/public-site';
import { getPublicSkills } from '@/lib/public-skills';
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
  const skills = filtered.slice((page - 1) * 24, page * 24).map(({ id, displayName, description, creator, officialTemplateId, taskFixedFeeT, currency }) => ({ id, displayName, description, creator, officialTemplateId, taskFixedFeeT, currency }));
  return <PublicCatalog skills={skills} total={filtered.length} page={page} pages={pages} query={query} />;
}
