import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Workbench from '@/components/workbench';
import { hasPageSession } from '@/lib/page-session';

export const metadata: Metadata = { title: '登录 · LoomSkill' };

export default async function LoginPage() {
  if (await hasPageSession()) redirect('/');
  return <Workbench />;
}
