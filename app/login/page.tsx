import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { hasPageSession } from '@/lib/page-session';
import { appPath, connectionPath, requestedSkill } from '@/lib/skill-links';
export const metadata: Metadata = { title: '连接工作台 · LoomSkill', robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ skill?: string }> }) {
  const skill = requestedSkill((await searchParams).skill);
  if (await hasPageSession()) redirect(appPath(skill));
  redirect(connectionPath(skill));
}
