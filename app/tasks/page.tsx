import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Workbench from '@/components/workbench';
import { hasPageSession } from '@/lib/page-session';
import { taskConnectionPath } from '@/lib/skill-links';

export const metadata: Metadata = { title: '我的任务 · LoomSkill', robots: { index: false, follow: false } };

export default async function TasksPage() {
  if (!(await hasPageSession())) redirect(taskConnectionPath('/tasks'));
  return <Workbench initialView="runs" />;
}
