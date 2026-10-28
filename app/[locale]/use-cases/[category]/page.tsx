import { notFound } from 'next/navigation';
import SkillUseCase from '@/components/skill-use-case';
import { getSkillCategory, matchesSkillCategory } from '@/lib/skill-categories';
import { getPublicSkill, getPublicSkills, type PublicSkill } from '@/lib/public-skills';
import { pageMetadata } from '@/lib/seo';
import { translate } from '@/lib/i18n';
import { schemaOf } from '@/lib/domain';
type Props = { params: Promise<{ locale: 'zh-CN' | 'en'; category: string }> };
export async function generateMetadata({ params }: Props) {
  const { locale, category: id } = await params;
  const category = getSkillCategory(id);
  if (!category) return {};
  return pageMetadata(`${translate(locale, category.title)} · ${locale === 'en' ? 'AI Workflow Guide' : 'AI 工作流指南'} | LoomSkill`, category.description, `/use-cases/${id}`, locale);
}
export default async function Page({ params }: Props) {
  const { category: id } = await params;
  const category = getSkillCategory(id);
  if (!category) notFound();
  const [all, representative] = await Promise.all([getPublicSkills(), getPublicSkill(category.representative)]);
  const card = ({ id, displayName, description, creator, officialTemplateId, taskFixedFeeT, currency, category, pricing }: PublicSkill) => ({ id, displayName, description, creator, officialTemplateId, taskFixedFeeT, currency, category, pricing });
  let schema = null;
  try { if (representative) schema = schemaOf(representative); } catch { /* Keep the guide usable when a creator updates the schema. */ }
  const preferred: Record<string, string[]> = {
    images: ['text-image-v1', '01a0ccea-2449-7796-ba40-bfcded89b97d', '01a13853-daca-726f-9d74-cf0ea132eb37', '019f6634-19ef-7510-9f15-f57d6f4280cf'],
    video: ['01a06ef1-d7a0-7b12-9e46-09879a52b532', '01a03706-5a39-79e0-bc5e-9616cf9c6bfc', '01a040a7-0f0e-74c7-8485-f9bcfbdf327e', '019fd60d-5c26-78f7-bba0-5584f9ee7337'],
    writing: ['text-v1', '01a047be-5345-7c1d-bf4a-8b5287052d52', '01a066df-e851-7803-9a88-dce670c58c7d', '01a046f5-d6bb-7513-b002-88373b16b631'],
    presentations: ['01a05ce5-4c6b-7284-8fea-71ee02ef07df', '01a05dc3-b62d-7955-a99b-638bf723a112'],
  };
  const matching = all.filter(skill => matchesSkillCategory(skill, category.id));
  const rank = (id: string) => { const index = preferred[category.id].indexOf(id); return index < 0 ? 100 : index; };
  const skills = await Promise.all(matching.sort((a, b) => rank(a.id) - rank(b.id)).slice(0, 4).map(async skill => card(await getPublicSkill(skill.id) || skill)));
  return <SkillUseCase category={category} skills={skills} representative={representative ? card(representative) : null} schema={schema} />;
}
