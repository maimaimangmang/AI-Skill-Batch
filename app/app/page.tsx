import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Workbench from '@/components/workbench';
import { LanguageSwitcher } from '@/components/language-provider';
import { getPublicSkill } from '@/lib/public-skills';
import { schemaOf } from '@/lib/domain';
import { hasPageSession } from '@/lib/page-session';
import { loginPath, requestedSkill } from '@/lib/skill-links';
export const metadata: Metadata = { title: '工作台 · LoomSkill', robots: { index: false, follow: false } };
export default async function AppPage({ searchParams }: { searchParams: Promise<{ demo?: string; skill?: string }> }) {
  const params = await searchParams;
  const skill = requestedSkill(params.skill);
  let draftListing;
  if (params.demo !== '1' && !(await hasPageSession())) {
    if (!skill) redirect(loginPath());
    draftListing = await getPublicSkill(skill);
    if (!draftListing) notFound();
    // Drafts use only public schemas; paid/private API routes still require a session.
    schemaOf(draftListing);
  }
  return <><LanguageSwitcher corner /><Workbench initialSkill={skill} draftListing={draftListing || undefined} /></>;
}
