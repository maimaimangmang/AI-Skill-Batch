'use client';
import { LocalizedAnchor } from './localized-link';
import { localizePublicExample } from '@/lib/i18n';
import { useI18n } from './language-provider';
import { useId, useState } from 'react';
import Image from 'next/image';
import { ArrowDownToLine, BookOpen, ChevronDown } from 'lucide-react';
import { cellText } from '@/lib/domain';
import { workflowExamples, type ExampleImage } from '@/lib/workflow-examples';
import type { InputRow, Listing, Schema } from '@/lib/types';
import AppSelect from './app-select';

function ExamplePicture({ image, caption }: { image: ExampleImage; caption?: string }) {
  const { t, skillText } = useI18n();
  return <LocalizedAnchor className="example-picture" href={image.src} target="_blank" rel="noopener noreferrer" aria-label={t("{0}，查看原图", skillText(image.label))}>
    <span className="example-picture-frame"><Image src={image.src} alt={skillText(image.label)} fill sizes="(max-width: 760px) 45vw, 320px" style={{ objectFit: 'contain' }} /></span>
    <span className="example-picture-caption">{caption ? t(caption) : skillText(image.label)}</span>
  </LocalizedAnchor>;
}

export default function WorkflowExamples({ listing, schema, demo = false, disabled = false, onUse }: {
  listing: Listing; schema: Schema; demo?: boolean; disabled?: boolean; onUse?: (row: InputRow) => void;
}) {
  const { t, skillText, locale } = useI18n();
  const titleId = useId();
  const previewId = useId();
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const samples = workflowExamples(listing, schema);
  const selectedIndex = selected < samples.length ? selected : 0;
  const example = samples[selectedIndex];
  const row = example ? localizePublicExample(locale, example.input, schema.fields) : undefined;
  const trialOutput = example?.output;
  // This hand-written copy is a labelled UI illustration for the demo fixture,
  // never evidence of a creator's run or output from a real market listing.
  const demoCopy = demo && listing.id === 'demo-copy' && selectedIndex === 0 && !!row;
  if (!row && !demoCopy) return null;
  const title = demoCopy || trialOutput ? t("输入与输出示例") : t("输入示例");
  return <section className={`workflow-panel workflow-examples${expanded ? ' examples-expanded' : ''}`} aria-labelledby={titleId}>
    <div className="workflow-panel-heading examples-header"><div className="workflow-panel-title"><BookOpen size={18} aria-hidden="true" /><h2 id={titleId}>{title}</h2>{!trialOutput && <span className="count">{demo ? t("演示内容") : t("公开示例")}</span>}</div>
      <div className="example-controls">
        {samples.length > 1 && !trialOutput && <AppSelect label={t("选择示例")} value={String(selectedIndex)} onChange={value => { setSelected(Number(value)); setExpanded(true); }} options={samples.map((sample, index) => ({ value: String(index), label: skillText(sample.label) }))} />}
        {row && onUse && <button type="button" className="example-use" title={trialOutput ? t("填入语言与复刻要求；请自行上传参考图和产品图") : t("只填入表格，确认费用后才执行")} disabled={disabled} onClick={() => onUse(row)}><ArrowDownToLine size={14} aria-hidden="true" />{trialOutput ? t("填入文字") : t("填入示例")}</button>}
        <button type="button" className="example-expand" aria-expanded={expanded} aria-controls={previewId} onClick={() => setExpanded(value => !value)}>{expanded ? t("收起") : t("展开示例")}<ChevronDown size={14} aria-hidden="true" /></button>
      </div>
    </div>
    <div className={`workflow-panel-body examples-grid${demoCopy || trialOutput ? '' : ' examples-single'}`} id={previewId} hidden={!expanded}>
      <div className="example-input">{(demoCopy || trialOutput) && <div className="example-label"><h3>{t("输入示例")}</h3></div>}
        {example.inputImages && <div className="example-input-images">{example.inputImages.map(image => <ExamplePicture key={image.src} image={image} />)}</div>}
        <dl>{schema.fields.filter(field => row[field.key] != null).map(field => <div key={field.key}><dt>{skillText(field.label)}</dt><dd>{skillText(cellText(row[field.key])) || t("留空")}</dd></div>)}</dl>
      </div>
      {trialOutput && <div className="example-output"><div className="example-label"><h3>{t("输出示例")}</h3><span className="example-source">{t("真实试跑结果")}</span></div><ExamplePicture image={trialOutput} caption="成片" /></div>}
      {demoCopy && <div className="example-output"><div className="example-label"><h3>{t("输出示例")}</h3>{demoCopy && <span className="example-source">{t("演示 · 非真实结果")}</span>}</div>
        <div className="example-output-text"><strong>{t("把热咖啡，带进忙碌的早晨")}</strong><p>{t("出门前装上一杯咖啡，轻便随行，保温 6 小时。从通勤路上到办公桌前，让熟悉的温热陪你开始新一天。")}</p></div>
      </div>}
    </div>
  </section>;
}
