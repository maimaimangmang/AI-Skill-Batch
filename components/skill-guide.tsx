'use client';
import { useI18n } from './language-provider';
import { ChevronDown, Info } from 'lucide-react';
import { cellText } from '@/lib/domain';
import { listingModelLabel } from '@/lib/market';
import type { Listing, Schema } from '@/lib/types';

export function WorkflowInstructions({ listing, schema }: { listing: Listing; schema: Schema }) {
  const { t, skillText } = useI18n();
  const model = listingModelLabel(listing);
  return <details className="workflow-panel workflow-instructions">
    <summary className="workflow-panel-heading"><span className="workflow-panel-title"><Info size={18} aria-hidden="true" /><span>{t('填写说明与工作流信息')}</span></span><ChevronDown size={16} aria-hidden="true" /></summary>
    <div className="workflow-panel-body">
      <section><h3>{t('需要准备什么')}</h3>
        {listing.description && <p>{skillText(listing.description)}</p>}
        {schema.input_summary && schema.input_summary !== listing.description && <p>{skillText(schema.input_summary)}</p>}
        <dl className="workflow-field-guide">{schema.fields.map(field => <div key={field.key}><dt>{skillText(field.label)}<small>{t(field.required ? '必填' : '选填')}</small></dt><dd>{skillText(field.description || field.presentation?.hint || field.presentation?.placeholder || '') || t('按字段提示填写内容。')}{field.enum_values?.length ? <span>{t('可选值')}：{field.enum_values.map(value => skillText(cellText(value))).join(' / ')}</span> : null}</dd></div>)}</dl>
      </section>
      <section><h3>{t('生成说明')}</h3>
        {model && <p>{skillText(model)}</p>}
        <p>{t('每一行会作为一个独立任务提交。必填字段已用 * 标出。')}</p>
        {schema.instructions?.length ? <ul>{schema.instructions.map((line, index) => <li key={index}>{skillText(line)}</li>)}</ul> : null}
      </section>
    </div>
  </details>;
}

export function HomeFAQ() {
  const { t } = useI18n();
  return <section className="public-section home-faq" id="faq" aria-labelledby="home-faq-title">
    <h2 id="home-faq-title">{t('常见问题')}</h2>
    <div className="home-faq-list">
      <details open><summary>{t('填写任务需要登录吗？')}</summary><p>{t('不需要。可以先填写、导入任务和选择附件，预估费用时再连接 API Key。草稿仅保留在当前页面，刷新后会清除。')}</p></details>
      <details><summary>{t('怎样收费？')}</summary><p>{t('创作者调用费与模型用量费分开计算。此页展示公开参考信息，实际金额以工作台提交前的预估和最终结算为准。')}</p></details>
      <details><summary>{t('点击使用会直接扣费吗？')}</summary><p>{t('不会。点击使用只会打开任务表，填写输入并确认预估费用后才执行。')}</p></details>
    </div>
  </section>;
}
