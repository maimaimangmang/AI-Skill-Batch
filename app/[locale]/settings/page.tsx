import { localizedPath } from '@/lib/locale';
import { redirect } from 'next/navigation';
import { hasPageSession } from '@/lib/page-session';
import { taskConnectionPath } from '@/lib/skill-links';

export async function generateMetadata({params}:{params:Promise<{locale:string}>}) { return { title:(await params).locale === 'en' ? 'Connection Settings · LoomSkill' : '连接设置 · LoomSkill', robots:{index:false,follow:false} }; }

export default async function SettingsPage({params}:{params:Promise<{locale:'zh-CN'|'en'}>}) {
  const {locale} = await params;
  if (!(await hasPageSession())) redirect(taskConnectionPath('/settings',locale));
  redirect(localizedPath('/tasks?account=settings',locale));
}
