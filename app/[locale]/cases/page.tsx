import CaseLibrary from '@/components/case-library';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: 'zh-CN' | 'en' }> }) {
  return pageMetadata('创作案例库 | LoomSkill', '浏览电商出图案例与照片风格化示意，对照输入与结果，选择适合自己的 AI 工作流。', '/cases', (await params).locale);
}

export default function Page() {
  return <CaseLibrary />;
}
