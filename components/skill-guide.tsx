'use client';
import { ArrowUpRight } from 'lucide-react';
import { useI18n } from './language-provider';
import { cellText, money } from '@/lib/domain';
import { listingModelLabel } from '@/lib/market';
import { featuredWorkflows } from '@/lib/featured';
import { skillPath } from '@/lib/skill-links';
import type { PublicSkill } from '@/lib/public-skills';
import type { Schema } from '@/lib/types';

export default function SkillGuide({ listing, schema }: { listing: PublicSkill; schema: Schema }) {
  const { t } = useI18n();
  const model = listingModelLabel(listing);
  const related = featuredWorkflows.filter(item => (item.officialTemplateId || item.listingId) !== listing.id).slice(0, 3);
  return <div className="skill-guide">
    <div className="skill-guide-columns">
      <section className="skill-guide-section"><h2>{t('需要准备什么')}</h2>
        {schema.input_summary && <p>{schema.input_summary}</p>}
        <dl className="public-fields">{schema.fields.map(field => <div key={field.key}><dt>{field.label}<small>{field.required ? t('必填') : t('选填')}</small></dt><dd>{field.description || field.presentation?.hint || t('按字段提示填写内容。')}{field.enum_values?.length ? <span className="public-options">{t('可选值')}：{field.enum_values.map(cellText).join(' / ')}</span> : null}</dd></div>)}</dl>
      </section>
      <section className="skill-guide-section"><h2>{t('生成说明')}</h2>
        {listing.scenarios?.length ? <p><strong>{t('适用场景')}：</strong>{listing.scenarios.join('；')}</p> : null}
        {model && <p>{model}</p>}
        {listing.outputType && <p>{t('输出类型')}：{t(({ image: '图片', text: '文本', video: '视频', json: '结构化数据' } as Record<string, string>)[listing.outputType] || listing.outputType)}</p>}
        <p>{t('每一行会作为一个独立任务提交。必填字段已用 * 标出。')}</p>
        {schema.instructions?.length ? <ul className="public-instructions">{schema.instructions.map((line, i) => <li key={i}>{line}</li>)}</ul> : null}
        <p>{listing.officialTemplateId ? t('无技能调用费，模型费用按实际用量结算，提交前会显示预估金额。') : t('创作者调用费：{0} / 任务，模型费用以提交前的预估为准。', t(money(listing.taskFixedFeeT, listing.currency)))}</p>
        {!listing.officialTemplateId && <p>{t('调用费由创作者设置，非平台收费')}</p>}
      </section>
    </div>
    <section className="skill-guide-section skill-guide-faq"><h2>{t('常见问题')}</h2>
      <details open><summary>{t('填写任务需要登录吗？')}</summary><p>{t('不需要。可以先填写、导入任务和选择附件，预估费用时再连接 API Key。草稿仅保留在当前页面，刷新后会清除。')}</p></details>
      <details><summary>{t('怎样收费？')}</summary><p>{t('创作者调用费与模型用量费分开计算。此页展示公开参考信息，实际金额以工作台提交前的预估和最终结算为准。')}</p></details>
      <details><summary>{t('点击使用会直接扣费吗？')}</summary><p>{t('不会。点击使用只会打开任务表，填写输入并确认预估费用后才执行。')}</p></details>
    </section>
    <section className="skill-guide-section"><div className="skill-guide-heading"><h2>{t('继续探索')}</h2><a href="/skills">{t('浏览全部 Skill')}<ArrowUpRight size={15} /></a></div>
      <div className="skill-guide-related">{related.map(item => <a key={item.officialTemplateId || item.listingId} href={skillPath(item.officialTemplateId || item.listingId!)}><h3>{item.title}<ArrowUpRight size={16} /></h3><p>{item.reason}</p></a>)}</div>
    </section>
  </div>;
}
