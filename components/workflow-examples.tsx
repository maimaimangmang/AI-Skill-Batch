'use client';
import { localizePublicExample } from '@/lib/i18n';
import { useI18n } from './language-provider';
import { useState } from 'react';
import Image from 'next/image';
import { ArrowDownToLine, BookOpen, ChevronDown } from 'lucide-react';
import { cellText } from '@/lib/domain';
import { workflowExamples, type ExampleImage } from '@/lib/workflow-examples';
import type { InputRow, Listing, Schema } from '@/lib/types';

function ExamplePicture({ image }: { image: ExampleImage }) {
  const { t, skillText, locale } = useI18n();
  return <a className="example-picture" href={image.src} target="_blank" rel="noopener noreferrer" aria-label={t("{0}，查看原图", skillText(image.label))}>
    <span className="example-picture-frame"><Image src={image.src} alt={skillText(image.label)} fill sizes="(max-width: 760px) 45vw, 320px" style={{ objectFit: 'contain' }} /></span>
    <span className="example-picture-caption">{skillText(image.label)}<span>{t("查看原图 ↗")}</span></span>
  </a>;
}

export default function WorkflowExamples({ listing, schema, demo, disabled, onUse }: {
  listing: Listing; schema: Schema; demo: boolean; disabled: boolean; onUse: (row: InputRow) => void;
}) {
  const { t, skillText, locale } = useI18n();
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
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
  return <section className={`workflow-examples${expanded ? ' examples-expanded' : ''}`} aria-labelledby="examples-title">
    <div className="examples-header"><div><BookOpen size={18} /><h2 id="examples-title">{title}</h2><span className="count">{demo ? t("演示内容") : trialOutput ? t("作者试跑案例") : t("公开示例")}</span></div>
      <div className="example-controls">{samples.length > 1 && <select aria-label={t("选择示例")} value={selectedIndex} onChange={event => { setSelected(Number(event.target.value)); setExpanded(false); }}>{samples.map((sample, index) => <option key={index} value={index}>{skillText(sample.label)}</option>)}</select>}<button className="example-expand" aria-expanded={expanded} aria-controls="example-preview" onClick={() => setExpanded(value => !value)}>{expanded ? t("收起") : t("展开示例")}<ChevronDown size={13} /></button></div>
    </div>
    <div className={`examples-grid${demoCopy || trialOutput ? '' : ' examples-single'}`} id="example-preview">
      <div className="example-input"><div className="example-label"><h3>{t("输入示例")}</h3>{row && <button className="example-use" title={trialOutput ? t("填入语言与复刻要求；请自行上传参考图和产品图") : t("只填入表格，确认费用后才执行")} disabled={disabled} onClick={() => onUse(row)}><ArrowDownToLine size={12} />{trialOutput ? t("填入文字") : t("填入")}</button>}</div>
        {example.inputImages && <div className="example-input-images">{example.inputImages.map(image => <ExamplePicture key={image.src} image={image} />)}</div>}
        <dl>{schema.fields.filter(field => row[field.key] != null).slice(0, expanded ? undefined : 3).map(field => <div key={field.key}><dt>{skillText(field.label)}</dt><dd>{skillText(cellText(row[field.key])) || t("留空")}</dd></div>)}</dl>
        {trialOutput && <p className="example-input-note">{t("填入文字后，请上传你自己的参考图和产品图。")}</p>}
      </div>
      {trialOutput && <div className="example-output"><div className="example-label"><h3>{t("输出示例")}</h3><span className="example-source">{t("真实试跑结果")}</span></div><ExamplePicture image={trialOutput} /></div>}
      {demoCopy && <div className="example-output"><div className="example-label"><h3>{t("输出示例")}</h3>{demoCopy && <span className="example-source">{t("演示 · 非真实结果")}</span>}</div>
        <div className="example-output-text"><strong>{t("把热咖啡，带进忙碌的早晨")}</strong><p>{t("出门前装上一杯咖啡，轻便随行，保温 6 小时。从通勤路上到办公桌前，让熟悉的温热陪你开始新一天。")}</p></div>
      </div>}
    </div>
  </section>;
}
