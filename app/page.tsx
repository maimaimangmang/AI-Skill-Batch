import { redirect } from 'next/navigation';
import { PublicHome } from '@/components/public-site';
import { featuredWorkflows } from '@/lib/featured';
import { getPublicSkill } from '@/lib/public-skills';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('LoomSkill · AI 批量生成，从一张表开始', '浏览 AI Skill，批量生成商品图片、营销文案和视觉素材。查看真实案例，填写任务表，确认费用后执行，统一查看与下载结果。', '/');
export default async function Page({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  if ((await searchParams).demo === '1') redirect('/app?demo=1');
  const skills = await Promise.all(featuredWorkflows.map(item => getPublicSkill(item.officialTemplateId || item.listingId!)));
  return <PublicHome skills={skills.filter(skill => !!skill)} />;
}
