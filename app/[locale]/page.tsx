import { PublicHome } from '@/components/public-site';
import { skillCategories } from '@/lib/skill-categories';
import { getPublicSkill, getPublicSkills } from '@/lib/public-skills';
import type { HomeSkill } from '@/components/home-showcase';
import { pageMetadata } from '@/lib/seo';
export async function generateMetadata({params}:{params:Promise<{locale:'zh-CN'|'en'}>}) { return pageMetadata('AI Skills 发现与批量执行平台 | LoomSkill', '在 LoomSkill 发现图片、视频、文案与汇报工作流。查看输入示例，在线填表或导入 Excel / CSV，确认预估费用后批量执行，统一查看和下载结果。', '/', (await params).locale); }
export default async function Page() {
  const [featured, catalog] = await Promise.all([
    Promise.all(skillCategories.map(category => getPublicSkill(category.representative))),
    getPublicSkills().catch(() => []),
  ]);
  // Send only card fields to the browser, never full schemas or instructions.
  const card = (skill: HomeSkill): HomeSkill => ({ id: skill.id, displayName: skill.displayName, description: skill.description, officialTemplateId: skill.officialTemplateId, taskFixedFeeT: skill.taskFixedFeeT, currency: skill.currency, category: skill.category, pricing: skill.pricing, outputType: skill.outputType });
  const skills = featured.filter(skill => !!skill).map(card);
  const featuredIds = new Set(skills.map(skill => skill.id));
  const more = catalog.filter(skill => !featuredIds.has(skill.id));
  const discovery = (more.length >= 4 ? more : skills).slice(0, 16).map(card);
  return <PublicHome skills={skills} discovery={discovery} total={catalog.length} />;
}
