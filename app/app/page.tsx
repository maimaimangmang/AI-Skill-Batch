import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import Workbench from '@/components/workbench';
import { LanguageSwitcher } from '@/components/language-provider';
import { appPath, requestedSkill } from '@/lib/skill-links';
export const metadata: Metadata = { title: '工作台 · LoomSkill', robots: { index: false, follow: false } };
export default async function AppPage({ searchParams }: { searchParams: Promise<{ demo?: string; skill?: string }> }) {
  const params = await searchParams;
  const skill = requestedSkill(params.skill);
  if (params.demo !== '1') permanentRedirect(appPath(skill));
  return <><LanguageSwitcher corner /><Workbench initialSkill={skill} /></>;
}
