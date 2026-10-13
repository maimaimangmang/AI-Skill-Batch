import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Workbench from '@/components/workbench';
import { LanguageSwitcher } from '@/components/language-provider';
import { hasPageSession } from '@/lib/page-session';
import { requestedRunId, taskConnectionPath, tasksPath } from '@/lib/skill-links';

export const metadata: Metadata = { title: '任务详情 · LoomSkill', robots: { index: false, follow: false } };

export default async function TaskDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const runId = requestedRunId((await params).runId);
  if (!runId) notFound();
  if (!(await hasPageSession())) redirect(taskConnectionPath(tasksPath(runId)));
  return <><LanguageSwitcher corner /><Workbench initialView="detail" initialRunId={runId} /></>;
}
