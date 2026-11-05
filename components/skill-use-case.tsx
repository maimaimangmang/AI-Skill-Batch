'use client';
import Link from './localized-link';
import { ArrowRight } from 'lucide-react';
import { PublicShell, SkillCards } from './public-site';
import { useI18n } from './language-provider';
import { localizePublicExample } from '@/lib/i18n';
import { cellText } from '@/lib/domain';
import { skillPath } from '@/lib/skill-links';
import type { SkillCategory } from '@/lib/skill-categories';
import type { PublicSkill } from '@/lib/public-skills';
import type { Schema } from '@/lib/types';
type Card = Pick<PublicSkill, 'id' | 'displayName' | 'description' | 'creator' | 'officialTemplateId' | 'taskFixedFeeT' | 'currency' | 'category' | 'pricing'>;
export default function SkillUseCase({ category, skills, representative, schema }: { category: SkillCategory; skills: Card[]; representative: Card | null; schema: Schema | null }) {
  const { t, skillText, locale } = useI18n();
  const raw = schema?.sample_rows?.[0];
  const row = raw && schema ? localizePublicExample(locale, raw, schema.fields) : null;
  return <PublicShell showHomeBack><main className="use-case-page">
    <nav className="public-breadcrumb" aria-label={t('当前位置')}><Link href="/">{t('网站首页')}</Link><span>/</span><Link href="/skills">{t('探索 Skill')}</Link><span>/</span><span>{t(category.title)}</span></nav>
    <header className="use-case-heading"><span className="public-eyebrow">SKILL GUIDE</span><h1>{t(category.title)}</h1><p>{t(category.description)}</p><div className="public-actions"><Link className="public-button primary" href="#workflows">{t('选择适合的工作流')}<ArrowRight size={17} /></Link>{representative && <Link className="public-button" href="#input-example">{t('先看填写示例')}</Link>}</div></header>
    <section className="use-case-steps" aria-label={t('开始前的准备')}>
      {[['需要准备什么', category.prepare], ['先试一行，再批量执行', category.batch], ['结果需要检查什么', category.check]].map(([title, body]) => <article key={title}><h2>{t(title)}</h2><p>{t(body)}</p></article>)}
    </section>
    {representative && schema && <section className="use-case-example" id="input-example"><span className="public-eyebrow">INPUT EXAMPLE</span><h2>{skillText(representative.displayName)}</h2><p>{skillText(schema.input_summary || representative.description)}</p><p className="use-case-source">{t('以下为工作流提供的公开输入示例，不是已执行的结果。')}</p>
      {row ? <dl className="public-fields">{schema.fields.filter(field => row[field.key] != null && cellText(row[field.key]).trim()).map(field => <div key={field.key}><dt>{skillText(field.label)}</dt><dd>{skillText(cellText(row[field.key]))}</dd></div>)}</dl> : <p>{t('打开工作流查看当前输入字段和要求。')}</p>}
      <Link className="public-button primary" href={skillPath(representative.id)}>{t('打开工作流，填写自己的任务')}<ArrowRight size={17} /></Link><p className="use-case-source">{t('可以先填写任务；连接胜算云 API Key 并确认预估费用后才执行。')}</p>
    </section>}
    <section className="public-section" id="workflows"><div className="public-section-heading"><h2>{t('选择适合的工作流')}</h2><Link href={`/skills?category=${category.id}`}>{t('查看这一类的全部 Skill')}<ArrowRight size={17} /></Link></div><SkillCards skills={skills} /></section>
    <section className="use-case-boundary"><h2>{t('选择前请确认')}</h2><p>{t(category.boundary)}</p>{category.id === 'images' && <p><Link href="/batch-image-generation">{t('了解批量生图')}</Link></p>}<Link href="/skills">{t('继续浏览其他用途')}<ArrowRight size={15} /></Link></section>
  </main></PublicShell>;
}
