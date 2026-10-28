import { skillCategories } from '@/lib/skill-categories';
import type { MetadataRoute } from 'next';
import { getPublicSkills, skillPath, SITE_URL } from '@/lib/public-skills';
import { localizedPath } from '@/lib/locale';
export const revalidate = 900;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const skills = await getPublicSkills();
  const entries = [{ url: SITE_URL + '/' }, { url: SITE_URL + '/skills' }, { url: SITE_URL + '/batch-image-generation' }, { url: SITE_URL + '/ai-product-photography' }, ...skillCategories.map(category => ({ url: SITE_URL + `/use-cases/${category.id}` })), ...skills.map(skill => ({ url: SITE_URL + skillPath(skill.id), ...(skill.updatedAt && Number.isFinite(Date.parse(skill.updatedAt)) ? { lastModified: skill.updatedAt } : {}) }))];
  return entries.flatMap(entry => (['zh-CN','en'] as const).map(locale => ({...entry,url:SITE_URL+localizedPath(entry.url.slice(SITE_URL.length),locale),alternates:{languages:{'zh-CN':entry.url,en:SITE_URL+localizedPath(entry.url.slice(SITE_URL.length),'en')}}})));
}
