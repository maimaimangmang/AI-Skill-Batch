import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Workbench from '@/components/workbench';
import { LanguageSwitcher } from '@/components/language-provider';
import { hasPageSession } from '@/lib/page-session';
import { appPath, requestedSkill } from '@/lib/skill-links';
export const metadata: Metadata = { title: '登录 · LoomSkill', robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ skill?: string }> }) {
  const skill = requestedSkill((await searchParams).skill);
  if (await hasPageSession()) redirect(appPath(skill));
  return <><LanguageSwitcher corner /><Workbench initialSkill={skill} /></>;
}
