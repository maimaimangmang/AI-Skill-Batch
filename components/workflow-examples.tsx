'use client';

import { useState } from 'react';
import { ArrowDownToLine, BookOpen, ChevronDown } from 'lucide-react';
import { cellText } from '@/lib/domain';
import type { InputRow, Listing, Schema } from '@/lib/types';

export default function WorkflowExamples({ listing, schema, demo, disabled, onUse }: {
  listing: Listing; schema: Schema; demo: boolean; disabled: boolean; onUse: (row: InputRow) => void;
}) {
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const samples = (schema.sample_rows || []).filter(row => row && typeof row === 'object' && !Array.isArray(row) && schema.fields.some(field => cellText(row[field.key]).trim())).slice(0, 10);
  const selectedIndex = selected < samples.length ? selected : 0;
  const row = samples[selectedIndex];
  // This hand-written copy is a labelled UI illustration for the demo fixture,
  // never evidence of a creator's run or output from a real market listing.
  const demoCopy = demo && listing.id === 'demo-copy' && selectedIndex === 0 && !!row;
  if (!row && !demoCopy) return null;
  const title = demoCopy ? '输入与输出示例' : '输入示例';
  return <section className={`workflow-examples${expanded ? ' examples-expanded' : ''}`} aria-labelledby="examples-title">
    <div className="examples-header"><div><BookOpen size={18} /><h2 id="examples-title">{title}</h2><span className="count">{demo ? '演示内容' : '公开示例'}</span></div>
      <div className="example-controls">{samples.length > 1 && <select aria-label="选择示例" value={selectedIndex} onChange={event => { setSelected(Number(event.target.value)); setExpanded(false); }}>{samples.map((_, index) => <option key={index} value={index}>示例 {index + 1}</option>)}</select>}<button className="example-expand" aria-expanded={expanded} aria-controls="example-preview" onClick={() => setExpanded(value => !value)}>{expanded ? '收起' : '展开示例'}<ChevronDown size={13} /></button></div>
    </div>
    <div className={`examples-grid${demoCopy ? '' : ' examples-single'}`} id="example-preview">
      <div className="example-input"><div className="example-label"><h3>输入示例</h3>{row && <button className="example-use" title="只填入表格，确认费用后才执行" disabled={disabled} onClick={() => onUse(row)}><ArrowDownToLine size={12} />填入</button>}</div>
        <dl>{schema.fields.filter(field => row[field.key] != null).slice(0, expanded ? undefined : 3).map(field => <div key={field.key}><dt>{field.label}</dt><dd>{cellText(row[field.key]) || '留空'}</dd></div>)}</dl>
      </div>
      {demoCopy && <div className="example-output"><div className="example-label"><h3>输出示例</h3>{demoCopy && <span className="example-source">演示 · 非真实结果</span>}</div>
        <div className="example-output-text"><strong>把热咖啡，带进忙碌的早晨</strong><p>出门前装上一杯咖啡，轻便随行，保温 6 小时。从通勤路上到办公桌前，让熟悉的温热陪你开始新一天。</p></div>
      </div>}
    </div>
  </section>;
}
