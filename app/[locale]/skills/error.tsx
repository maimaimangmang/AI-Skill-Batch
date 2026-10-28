'use client';
import { PublicShell } from '@/components/public-site';
import { useI18n } from '@/components/language-provider';
export default function SkillError({ reset }: { reset: () => void }) {
  const { t } = useI18n();
  return <PublicShell><main className="public-empty"><h1>{t('Skill 信息暂时未能加载')}</h1><p>{t('请稍后重试，你的任务和账户不会受影响。')}</p><button className="public-button primary" onClick={reset}>{t('重新加载')}</button></main></PublicShell>;
}
