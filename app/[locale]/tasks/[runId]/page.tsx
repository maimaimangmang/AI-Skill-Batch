import { notFound, redirect } from 'next/navigation';
import Workbench from '@/components/workbench';
import { hasPageSession } from '@/lib/page-session';
import { requestedRunId, taskConnectionPath, tasksPath } from '@/lib/skill-links';

export async function generateMetadata({params}:{params:Promise<{locale:string}>}) { return { title:(await params).locale === 'en' ? 'Task Details · LoomSkill' : '任务详情 · LoomSkill', robots:{index:false,follow:false} }; }

export default async function TaskDetailPage({ params }: { params: Promise<{ runId: string; locale: 'zh-CN' | 'en' }> }) {
  const {locale} = await params;
  const runId = requestedRunId((await params).runId);
  if (!runId) notFound();
  if (!(await hasPageSession())) redirect(taskConnectionPath(tasksPath(runId),locale));
  return <Workbench initialView="detail" initialRunId={runId} />;
}
