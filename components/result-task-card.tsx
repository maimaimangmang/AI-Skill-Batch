'use client';
import { useState } from 'react';
import type { Field, ResultRow } from '@/lib/types';
import { cellText, statusLabel, terminal } from '@/lib/domain';
import ArtifactResults from './artifact-results';

function inputEntries(inputJson: string, fields: Field[]) {
  let input: unknown;
  try { input = JSON.parse(inputJson); } catch { return [{ label: '输入内容', value: inputJson }]; }
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const raw = input as Record<string, unknown>;
    const values = raw.values && typeof raw.values === 'object' && !Array.isArray(raw.values) ? raw.values : raw;
    const labels = new Map(fields.map(field => [field.key, field.label || field.key]));
    return Object.entries(values).map(([key, value]) => ({ label: labels.get(key) || key, value: cellText(value) }));
  }
  return [{ label: '输入内容', value: cellText(input) }];
}

export default function ResultTaskCard({ row, number, fields, stepLabels }: { row: ResultRow; number: number; fields: Field[]; stepLabels: Map<string, string> }) {
  const [expandedInput, setExpandedInput] = useState(false);
  const [expandedOutput, setExpandedOutput] = useState(false);
  const inputs = inputEntries(row.inputJson, fields);
  const moreInput = inputs.length > 4 || inputs.some(input => input.value.length > 100 || input.value.includes('\n'));
  const artifacts = row.artifacts || [];
  const errors = [row.errorMessage, ...(row.stepErrors || []).map(error => [error.stepLabel, error.errorMessage].filter(Boolean).join('：'))].filter(Boolean);
  return <article className="result-task-card" aria-label={`任务 ${number}`}>
    <header className="result-task-heading"><h2><span className="result-task-number">{String(number).padStart(2, '0')}</span>任务 {number}</h2><span className={`status ${row.status}`}>{statusLabel(row.status)}</span></header>
    <section className="result-task-input" aria-label="输入">
      <div className="result-section-heading"><h3>输入</h3>{moreInput && <button className="text-button" aria-expanded={expandedInput} onClick={() => setExpandedInput(value => !value)}>{expandedInput ? '收起输入' : '展开完整输入'}</button>}</div>
      <dl className={`result-input-fields${expandedInput ? ' expanded' : ''}`}>{(expandedInput ? inputs : inputs.slice(0, 4)).map((input, index) => <div key={index}><dt>{input.label}</dt><dd>{input.value ? (expandedInput || input.value.length <= 100 ? input.value : `${input.value.slice(0, 100)}…`) : '未填写'}</dd></div>)}</dl>
      {!inputs.length && <p className="muted">暂无输入信息</p>}
    </section>
    <section className="result-task-output" aria-label="输出">
      <div className="result-section-heading"><h3>输出</h3>{artifacts.length > 4 && <button className="text-button" aria-expanded={expandedOutput} onClick={() => setExpandedOutput(value => !value)}>{expandedOutput ? '收起结果' : `查看全部 ${artifacts.length} 项结果`}</button>}</div>
      {errors.length > 0 && <details className="result-errors"><summary>{artifacts.length ? '部分内容未生成，查看失败原因' : '任务未完成，查看失败原因'}</summary>{errors.map((message, index) => <p key={index}>{message}</p>)}</details>}
      <ArtifactResults artifacts={artifacts} stepLabels={stepLabels} visibleCount={expandedOutput ? undefined : 4} />
      {!artifacts.length && <p className="result-output-empty">{terminal(row.status) ? '暂无输出结果' : '正在等待生成结果…'}</p>}
    </section>
  </article>;
}
