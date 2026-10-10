import { redirect } from 'next/navigation';
import { PublicHome } from '@/components/public-site';
import { featuredWorkflows } from '@/lib/featured';
import { getPublicSkill, getPublicSkills } from '@/lib/public-skills';
import type { HomeSkill } from '@/components/home-showcase';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('LoomSkill · AI 批量生成，从一张表开始', '浏览 AI Skill，批量生成商品图片、营销文案和视觉素材。查看真实案例，填写任务表，确认费用后执行，统一查看与下载结果。', '/');
export default async function Page({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  if ((await searchParams).demo === '1') redirect('/app?demo=1');
  const [featured, catalog] = await Promise.all([
    Promise.all(featuredWorkflows.map(item => getPublicSkill(item.officialTemplateId || item.listingId!))),
    getPublicSkills().catch(() => []),
  ]);
  // Send only card fields to the browser, never full schemas or instructions.
  const card = (skill: HomeSkill): HomeSkill => ({ id: skill.id, displayName: skill.displayName, description: skill.description, officialTemplateId: skill.officialTemplateId, taskFixedFeeT: skill.taskFixedFeeT, currency: skill.currency, outputType: skill.outputType });
  const skills = featured.filter(skill => !!skill).map(card);
  const featuredIds = new Set(skills.map(skill => skill.id));
  const more = catalog.filter(skill => !featuredIds.has(skill.id));
  const discovery = (more.length >= 4 ? more : skills).slice(0, 16).map(card);
  return <PublicHome skills={skills} discovery={discovery} total={catalog.length} />;
}
