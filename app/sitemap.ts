import type { MetadataRoute } from 'next';
import { getPublicSkills, skillPath, SITE_URL } from '@/lib/public-skills';
export const revalidate = 900;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const skills = await getPublicSkills();
  return [{ url: SITE_URL + '/' }, { url: SITE_URL + '/skills' }, ...skills.map(skill => ({ url: SITE_URL + skillPath(skill.id), ...(skill.updatedAt && Number.isFinite(Date.parse(skill.updatedAt)) ? { lastModified: skill.updatedAt } : {}) }))];
}
