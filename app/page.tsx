import { PublicHome } from '@/components/public-site';
import { featuredWorkflows } from '@/lib/featured';
import { getPublicSkill, getPublicSkills } from '@/lib/public-skills';
import type { HomeSkill } from '@/components/home-showcase';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('AI 批量生图与 Skill 批处理平台 | LoomSkill', '用 LoomSkill 批量生成商品图、插画与营销文案。选择 AI Skill，在线填表或导入 Excel / CSV，确认预估费用后批量执行，统一查看和下载结果。', '/');
export default async function Page() {
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
