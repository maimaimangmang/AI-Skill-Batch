import type { Metadata } from 'next';
import { MissingPage } from '@/components/missing-page';

export const metadata: Metadata = {
  title: '页面未找到 · LoomSkill',
  description: '这个页面不存在、已移除，或链接有误。返回 LoomSkill 首页，或浏览可用的 AI Skill。',
  robots: { index: false, follow: true },
};

export default function NotFound() { return <MissingPage />; }
