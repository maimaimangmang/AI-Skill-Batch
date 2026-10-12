import FavoritesPage from '@/components/favorites-page';
import { getPublicSkills } from '@/lib/public-skills';
export const metadata = { title: '我的收藏 · LoomSkill', robots: { index: false, follow: false } };
export default async function Page() {
  const skills = await getPublicSkills().catch(() => null);
  const catalog = skills?.map(({ id, displayName, description }) => ({ id, displayName, description })) ?? null;
  return <FavoritesPage catalog={catalog} />;
}
