import { notFound, permanentRedirect } from 'next/navigation';
import { PublicSkillDetail } from '@/components/public-site';
import { getPublicSkill, skillId, skillPath, SITE_URL } from '@/lib/public-skills';
import { schemaOf } from '@/lib/domain';
import { listingModelLabel } from '@/lib/market';
import { workflowExamples } from '@/lib/workflow-examples';
import { featuredWorkflows } from '@/lib/featured';
import { pageMetadata, jsonLd } from '@/lib/seo';
import type { Schema } from '@/lib/types';
type Params = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Params) {
  const skill = await getPublicSkill(skillId((await params).slug));
  if (!skill) return { title: 'Skill 未找到 · LoomSkill', robots: { index: false, follow: true } };
  return pageMetadata(`${skill.displayName} · AI 批量工作流 | LoomSkill`, (skill.description?.trim() || `查看${skill.displayName}的输入要求、公开示例、批量使用步骤和费用说明。使用 LoomSkill 填写任务表，确认预估费用后执行。`).replace(/\s+/g, ' ').slice(0, 160), skillPath(skill.id));
}
export default async function SkillPage({ params }: Params) {
  const { slug } = await params;
  const skill = await getPublicSkill(skillId(slug));
  if (!skill) notFound();
  if (skillPath(skill.id) !== `/skills/${slug}`) permanentRedirect(skillPath(skill.id));
  let schema: Schema | null = null;
  try { schema = schemaOf(skill); } catch { /* Some public listings have no executable schema yet. */ }
  const related = featuredWorkflows.filter(item => (item.officialTemplateId || item.listingId) !== skill.id).slice(0, 3).map(item => ({ id: item.officialTemplateId || item.listingId!, displayName: item.title, description: item.reason, officialTemplateId: item.officialTemplateId }));
  const data = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'LoomSkill', item: SITE_URL + '/' },
    { '@type': 'ListItem', position: 2, name: 'Skill', item: SITE_URL + '/skills' },
    { '@type': 'ListItem', position: 3, name: skill.displayName, item: SITE_URL + skillPath(skill.id) },
  ] };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} /><PublicSkillDetail key={skill.id} skill={skill} schema={schema} model={listingModelLabel(skill)} examples={schema ? workflowExamples(skill, schema) : []} related={related} /></>;
}
