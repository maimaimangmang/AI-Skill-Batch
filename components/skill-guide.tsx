'use client';
import { skillCategories, matchesSkillCategory } from '@/lib/skill-categories';
import { LocalizedAnchor } from './localized-link';
import { ArrowUpRight } from 'lucide-react';
import { useI18n } from './language-provider';
import { cellText } from '@/lib/domain';
import { listingModelLabel } from '@/lib/market';
import { featuredWorkflows } from '@/lib/featured';
import { skillPath } from '@/lib/skill-links';
import type { PublicSkill } from '@/lib/public-skills';
import type { Schema } from '@/lib/types';

export default function SkillGuide({ listing, schema }: { listing: PublicSkill; schema: Schema }) {
  const { t, skillText } = useI18n();
  const model = listingModelLabel(listing);
  const category = skillCategories.find(category => matchesSkillCategory(listing, category.id));
  const related = featuredWorkflows.filter(item => (item.officialTemplateId || item.listingId) !== listing.id).slice(0, 3);
  return <div className="skill-guide">
    {['01a0ccea-2449-7796-ba40-bfcded89b97d', '01a0d302-73cd-7702-a072-0358de4e9b86', '019fc6b4-8d10-7517-882d-fcb27bcbe42e'].includes(listing.id) && <div className="scenario-guide-link"><div><h2>{t('第一次做 AI 商品图？')}</h2><p>{t('先看真实案例和图片准备要求，再填写你的第一行任务。')}</p></div><LocalizedAnchor className="public-button" href="/ai-product-photography">{t('查看商品图完整教程')}<ArrowUpRight size={16} /></LocalizedAnchor></div>}
    {category && <section className="skill-guide-section use-case-boundary"><h2>{t('先试一行，再批量执行')}</h2><p>{t(category.batch)}</p><p><strong>{t('结果需要检查什么')}：</strong>{t(category.check)}</p><LocalizedAnchor href={`/use-cases/${category.id}`}>{t(category.title)} · {t('查看准备步骤与填写示例')}<ArrowUpRight size={15} /></LocalizedAnchor></section>}
    <div className="skill-guide-columns">
      <section className="skill-guide-section"><h2>{t('需要准备什么')}</h2>
        {schema.input_summary && <p>{skillText(schema.input_summary)}</p>}
        <dl className="public-fields">{schema.fields.map(field => <div key={field.key}><dt>{skillText(field.label)}<small>{field.required ? t('必填') : t('选填')}</small></dt><dd>{skillText(field.description || field.presentation?.hint || field.presentation?.placeholder || '') || t('按字段提示填写内容。')}{field.enum_values?.length ? <span className="public-options">{t('可选值')}：{field.enum_values.map(value => skillText(cellText(value))).join(' / ')}</span> : null}</dd></div>)}</dl>
      </section>
      <section className="skill-guide-section"><h2>{t('生成说明')}</h2>
        {listing.scenarios?.length ? <p><strong>{t('适用场景')}：</strong>{listing.scenarios.map(skillText).join(' / ')}</p> : null}
        {model && <p>{skillText(model)}</p>}
        {listing.outputType && <p>{t('输出类型')}：{t(({ image: '图片', text: '文本', video: '视频', json: '结构化数据' } as Record<string, string>)[listing.outputType] || listing.outputType)}</p>}
        <p>{t('每一行会作为一个独立任务提交。必填字段已用 * 标出。')}</p>
        {schema.instructions?.length ? <ul className="public-instructions">{schema.instructions.map((line, i) => <li key={i}>{skillText(line)}</li>)}</ul> : null}
        <p>{t('收费方式见上方说明，最终以本次运行前的报价和结算为准。')}</p>
        {!listing.officialTemplateId && <p>{t('调用费由创作者设置，非平台收费')}</p>}
      </section>
    </div>
    <section className="skill-guide-section skill-guide-faq"><h2>{t('常见问题')}</h2>
      <details open><summary>{t('填写任务需要登录吗？')}</summary><p>{t('不需要。可以先填写、导入任务和选择附件，预估费用时再连接 API Key。草稿仅保留在当前页面，刷新后会清除。')}</p></details>
      <details><summary>{t('怎样收费？')}</summary><p>{t('创作者调用费与模型用量费分开计算。此页展示公开参考信息，实际金额以工作台提交前的预估和最终结算为准。')}</p></details>
      <details><summary>{t('点击使用会直接扣费吗？')}</summary><p>{t('不会。点击使用只会打开任务表，填写输入并确认预估费用后才执行。')}</p></details>
    </section>
    <section className="skill-guide-section"><div className="skill-guide-heading"><h2>{t('继续探索')}</h2><LocalizedAnchor href="/skills">{t('浏览全部 Skill')}<ArrowUpRight size={15} /></LocalizedAnchor></div>
      <div className="skill-guide-related">{related.map(item => <LocalizedAnchor key={item.officialTemplateId || item.listingId} href={skillPath(item.officialTemplateId || item.listingId!)}><h3>{skillText(item.title)}<ArrowUpRight size={16} /></h3><p>{skillText(item.reason)}</p></LocalizedAnchor>)}</div>
    </section>
  </div>;
}
