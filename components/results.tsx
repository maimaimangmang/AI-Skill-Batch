'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, LoaderCircle, RefreshCw, RotateCcw } from 'lucide-react';
import type { Field, ResultRow, RunDetail } from '@/lib/types';
import { failed, schemaOf, statusLabel, terminal } from '@/lib/domain';
import { download, exportSheet } from '@/lib/client';
import { isOfficialTemplate } from '@/lib/official';
import { runCost } from '@/lib/run-cost';
import { runName } from '@/lib/run-name';
import ResultTaskCard from './result-task-card';
import { resultStepLabels } from '@/lib/artifacts';
export default function Results({ runId, demo, api, onBack, onRetry }: { runId: string; demo: boolean; api: (path: string, options?: RequestInit) => Promise<any>; onBack: () => void; onRetry: (listingId: string, rows: ResultRow[], officialTemplateId?: string) => void }) {
  const [detail, setDetail] = useState<RunDetail | null>(null); const [rows, setRows] = useState<ResultRow[]>([]);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [tick, setTick] = useState(0); const [pageToken, setPageToken] = useState(''); const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    let active = true; let timeout: ReturnType<typeof setTimeout>;
    async function update() {
      try {
        const [d, r] = await Promise.all([api(`/runs/${runId}`), api(`/runs/${runId}/results`)]);
        if (!active) return;
        setDetail(d); setRows(r.items || []); setPageToken(r.nextPageToken || ''); setError('');
        if (!terminal(d.run.status)) timeout = setTimeout(update, 8000);
      } catch (e) { if (active) { setError((e as Error).message); timeout = setTimeout(update, 15000); } }
      finally { if (active) setLoading(false); }
    }
    update(); return () => { active = false; clearTimeout(timeout); };
  }, [api, runId, tick]);
  const run = detail?.run; const market = detail?.market || run?.market;
  const cost = run ? runCost(run, market) : undefined;
  const officialId = !market?.listingId && run?.templateKey && isOfficialTemplate(run.templateKey) ? run.templateKey : undefined;
  const [fields, setFields] = useState<Field[]>([]);
  useEffect(() => {
    let active = true;
    setFields([]);
    if (market?.listingId || officialId) api(officialId ? `/official/${officialId}` : `/market/${encodeURIComponent(market!.listingId!)}`).then(listing => {
      if (active) setFields(schemaOf(listing).fields);
    }).catch(() => { /* Results remain readable even when the listing is no longer available. */ });
    return () => { active = false; };
  }, [api, market?.listingId, officialId]);
  const done = (run?.completedTasks || 0) + (run?.failedTasks || 0) + (run?.cancelledTasks || 0);
  const percent = run?.totalTasks ? Math.round(done / run.totalTasks * 100) : 0;
  const failedRows = rows.filter(r => failed(r.status));
  const stepLabels = resultStepLabels(rows);
  async function getDownload() {
    setDownloading(true); setError('');
    try {
      if (demo) await exportSheet(['任务行', '输入', '状态', '结果', '错误'], rows.map(r => [r.rowIndex, r.inputJson, statusLabel(r.status), r.artifacts?.map(a => a.inlineText || a.accessUrl).join('\n'), r.errorMessage || '']), 'loomdesk-demo-results.xlsx');
      else await download(`/runs/${runId}/workbook`, 'loomdesk-results.xlsx');
    } catch (e) { setError((e as Error).message); } finally { setDownloading(false); }
  }
  return <>
    <button className="back-button" onClick={onBack}><ArrowLeft size={16} />返回我的任务</button>
    <div className="page-heading"><div><div className="eyebrow">RUN RESULTS</div><h1>{runName(run, market)}</h1><p className="mono">{runId}</p></div><div className="toolbar-actions"><button className="button" onClick={() => setTick(t => t + 1)}><RefreshCw size={16} />刷新</button><button className="button primary" disabled={!rows.length || downloading} onClick={getDownload}>{downloading ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />}下载结果表格</button></div></div>
    {error && <p className="error" role="alert">{error}</p>}
    {loading ? <div className="loading"><LoaderCircle className="spin" />正在获取任务结果…</div> : run && <>
      <div className="run-summary"><div><span className={`status ${run.status}`}>{statusLabel(run.status)}</span><h2>{done} <small>/ {run.totalTasks ?? '—'} 项任务已结束</small></h2><div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="任务进度"><i style={{ width: `${percent}%` }} /></div><p>{terminal(run.status) ? '结果已更新。产物链接过期时，请点击刷新重新获取。' : '任务在云端继续运行，关闭本页后也可从我的任务查看。'}</p></div><div className="run-numbers"><div><strong>{run.completedTasks ?? 0}</strong><span>成功</span></div><div><strong>{(run.failedTasks || 0) + (run.cancelledTasks || 0)}</strong><span>失败 / 取消</span></div><div><strong>{cost?.amount}</strong><span>{cost?.label || '费用'}</span></div></div></div>
      {run.firstErrorMessage && <details className="result-errors run-errors"><summary>本次运行遇到问题，查看详情</summary><p>{run.firstErrorMessage}</p></details>}
      {failedRows.length > 0 && <div className="notice between"><span>{failedRows.length} 行未成功。重试会创建新任务，并重新预估费用。</span>{(market?.listingId || officialId) && <button className="button small" onClick={() => onRetry(market?.listingId || officialId!, failedRows, officialId)}><RotateCcw size={15} />重新填写失败行</button>}</div>}
      <section className="result-list"><div className="table-toolbar"><div><CheckCircle2 size={19} /><strong>任务结果</strong><span className="count">{rows.length} 项</span></div><span className="muted result-list-hint">每张卡片对应一行任务</span></div><div className="result-task-list">{rows.map((row, i) => <ResultTaskCard key={`${row.rowIndex}-${i}`} row={row} number={i + 1} fields={fields} stepLabels={stepLabels} />)}</div>{!rows.length && <div className="empty">任务已提交，正在等待首批结果。</div>}{pageToken && <button className="button load-more" onClick={async () => { try { const data = await api(`/runs/${runId}/results?pageToken=${encodeURIComponent(pageToken)}`); setRows([...rows, ...data.items]); setPageToken(data.nextPageToken || ''); } catch (e) { setError((e as Error).message); } }}>加载更多结果</button>}</section>
    </>}
  </>;
}
