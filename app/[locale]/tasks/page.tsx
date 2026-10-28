import { redirect } from 'next/navigation';
import Workbench from '@/components/workbench';
import { hasPageSession } from '@/lib/page-session';
import { taskConnectionPath } from '@/lib/skill-links';

export async function generateMetadata({params}:{params:Promise<{locale:string}>}) { return { title:(await params).locale === 'en' ? 'My Tasks · LoomSkill' : '我的任务 · LoomSkill', robots:{index:false,follow:false} }; }

export default async function TasksPage({params}:{params:Promise<{locale:'zh-CN'|'en'}>}) {
  const {locale} = await params;
  if (!(await hasPageSession())) redirect(taskConnectionPath('/tasks',locale));
  return <Workbench initialView="runs" />;
}
