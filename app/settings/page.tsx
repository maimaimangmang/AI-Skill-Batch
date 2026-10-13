import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { hasPageSession } from '@/lib/page-session';
import { taskConnectionPath } from '@/lib/skill-links';

export const metadata: Metadata = { title: '连接设置 · LoomSkill', robots: { index: false, follow: false } };

export default async function SettingsPage() {
  if (!(await hasPageSession())) redirect(taskConnectionPath('/settings'));
  redirect('/tasks?account=settings');
}
