'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ListChecks, LoaderCircle, Play, RefreshCw, Search } from 'lucide-react';
import { createCursorPager, createOffsetPager } from '@/lib/pagination';
import { marketPageNumbers } from '@/lib/market';
import { RUNS_PAGE_SIZE, RUN_STATUS_OPTIONS, localDateBounds, type RunsPage } from '@/lib/runs';
import { runName } from '@/lib/run-name';
import { statusLabel } from '@/lib/domain';

type Props = { active: boolean; api: (path: string, options?: RequestInit) => Promise<any>; refreshKey: number; onNew: () => void; onResult: (id: string) => void };
function dateString(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export default function RunsView({ active, api, refreshKey, onNew, onResult }: Props) {
  const [keyword, setKeyword] = useState(''), [status, setStatus] = useState(''), [range, setRange] = useState('all');
  const [start, setStart] = useState(''), [end, setEnd] = useState('');
  const [filterQuery, setFilterQuery] = useState(''), [revision, setRevision] = useState(0), [retry, setRetry] = useState(0);
  const [page, setPage] = useState(0), [pages, setPages] = useState<RunsPage[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [filterError, setFilterError] = useState('');
  const scrollAfterLoad = useRef(false);
  const directPaging = useMemo(() => {
    const params = new URLSearchParams(filterQuery);
    return !params.has('keyword') && !params.has('from') && !params.has('until');
  }, [filterQuery]);
  const pager = useMemo(() => {
    const fetchPage = (token: string, signal: AbortSignal): Promise<RunsPage> => {
      const params = new URLSearchParams(filterQuery); if (token) params.set('pageToken', token);
      return api(`/runs?${params}`, { signal });
    };
    return directPaging ? createOffsetPager(fetchPage, RUNS_PAGE_SIZE) : createCursorPager(fetchPage);
  }, [api, filterQuery, revision, refreshKey, directPaging]);
  const totalCount = directPaging ? (pages[page]?.totalCount ?? pages.find(p => p?.totalCount != null)?.totalCount) : undefined;
  const pageCount = totalCount != null ? Math.max(1, Math.ceil(totalCount / RUNS_PAGE_SIZE)) : Math.max(1, pages.length);
  const canJumpLast = totalCount != null || (pages.length > 0 && !!pages.at(-1) && !pages.at(-1)?.nextPageToken);
  const currentPager = useRef(pager);
  useEffect(() => {
    if (!active) return;
    if (currentPager.current !== pager) {
      currentPager.current = pager; setPages([]);
      if (page !== 0) { setPage(0); return; }
    }
    let alive = true; const controller = new AbortController(); setLoading(true); setError('');
    pager.load(page, controller.signal).then(() => { if (alive) setPages([...pager.pages]); })
      .catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; controller.abort(); };
  }, [active, pager, page, retry]);
  useEffect(() => {
    if (active && !loading && !error && scrollAfterLoad.current) {
      scrollAfterLoad.current = false; document.getElementById('runs-panel')?.scrollIntoView({ block: 'start' });
    }
  }, [active, loading, error, page, pages]);
  function apply(nextStatus = status, nextRange = range, nextStart = start, nextEnd = end, nextKeyword = keyword) {
    try {
      let from = nextStart, until = nextEnd;
      if (nextRange !== 'custom') {
        from = ''; until = '';
        if (nextRange !== 'all') {
          const now = new Date(); until = dateString(now);
          now.setDate(now.getDate() - Number(nextRange) + 1); from = dateString(now);
        }
      }
      const bounds = localDateBounds(from, until);
      const params = new URLSearchParams();
      if (nextKeyword.trim()) params.set('keyword', nextKeyword.trim());
      if (nextStatus) params.set('status', nextStatus);
      if (bounds.from != null) params.set('from', String(bounds.from));
      if (bounds.until != null) params.set('until', String(bounds.until));
      setFilterQuery(params.toString()); setPage(0); setPages([]); setRevision(v => v + 1); setFilterError('');
    } catch (e) { setFilterError((e as Error).message); }
  }
  function reset() { setKeyword(''); setStatus(''); setRange('all'); setStart(''); setEnd(''); apply('', 'all', '', '', ''); }
  function goTo(next: number) {
    if (loading || next === page || next < 0 || (totalCount != null ? next >= pageCount : !pages[next] && !(next === pages.length && pages.at(-1)?.nextPageToken))) return;
    scrollAfterLoad.current = true; setPage(next);
  }
  if (!active) return null;
  const current = pages[page], runs = current?.items || [];
  const filtered = !!filterQuery;
  return <>
    <div className="page-heading"><div><div className="eyebrow">MY RUNS</div><h1>我的任务<span className="heading-dot">.</span></h1><p>按提交时间从新到旧排列，最新任务在首页。</p></div><button className="button" disabled={loading} onClick={() => apply()}><RefreshCw size={16} />刷新任务</button></div>
    <section className="editor-card runs-panel" id="runs-panel">
      <div className="table-toolbar"><div><ListChecks size={20} /><strong>运行记录</strong></div><button className="button small primary" onClick={onNew}><Play size={14} />新建任务</button></div>
      <form className="runs-filters" onSubmit={e => { e.preventDefault(); apply(); }}>
        <label className="runs-search"><Search size={16} /><input aria-label="搜索任务名称或编号" maxLength={200} value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索工作流名称或任务编号…" /></label>
        <select aria-label="任务状态" value={status} onChange={e => { setStatus(e.target.value); apply(e.target.value); }}>{RUN_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select aria-label="提交时间范围" value={range} onChange={e => { setRange(e.target.value); apply(status, e.target.value); }}><option value="all">全部时间</option><option value="1">今天（{dateString(new Date())}）</option><option value="7">近 7 天</option><option value="30">近 30 天</option><option value="custom">自定义日期</option></select>
        <button className="button small primary" type="submit">搜索</button>
        {(keyword || status || range !== 'all') && <button className="text-button runs-reset" type="button" onClick={reset}>重置</button>}
        {range === 'custom' && <div className="runs-date-range"><label>开始日期<input type="date" aria-label="开始日期" value={start} max={end || undefined} onChange={e => { setStart(e.target.value); apply(status, range, e.target.value, end); }} /></label><span>至</span><label>结束日期<input type="date" aria-label="结束日期" value={end} min={start || undefined} onChange={e => { setEnd(e.target.value); apply(status, range, start, e.target.value); }} /></label><small>按本地时间，包含结束日期当天</small></div>}
      </form>
      {filterError && <p className="error runs-error" role="alert">{filterError}</p>}
      {error && <div className="error runs-error" role="alert">{error}<button className="text-button" onClick={() => setRetry(v => v + 1)}>重试当前页</button></div>}
      {loading ? <div className="loading" role="status"><LoaderCircle className="spin" />正在获取任务…</div> : runs.length ? <div className="table-scroll"><table className="runs-table"><thead><tr><th>工作流 / 任务</th><th>提交时间</th><th>状态</th><th>任务进度</th><th /></tr></thead><tbody>{runs.map(run => <tr key={run.runId}><td><strong>{runName(run)}</strong><small className="mono">{run.runId}</small></td><td>{run.createdAtUnix ? new Date(run.createdAtUnix * 1000).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td><td><span className={`status ${run.status}`}>{statusLabel(run.status)}</span></td><td>{run.completedTasks ?? 0} / {run.totalTasks ?? '—'} 成功</td><td><button className="text-button" onClick={() => onResult(run.runId)}>查看结果<ArrowRight size={15} /></button></td></tr>)}</tbody></table></div> : !error && <div className="empty"><ListChecks size={32} /><h2>{current?.nextPageToken ? '这批记录中暂无匹配任务' : filtered ? '没有找到匹配的任务' : '还没有运行任务'}</h2><p>{current?.nextPageToken ? '点击下一页，继续查找更早的任务。' : filtered ? '试试更换关键词、放宽时间范围或重置筛选。' : '到市场选择工作流，填写任务表后即可运行。'}</p>{filtered ? <button className="button" onClick={reset}>重置筛选</button> : <button className="button primary" onClick={onNew}>浏览工作流<ArrowRight size={15} /></button>}</div>}
      {!loading && current?.searchIncomplete && runs.length > 0 && <p className="runs-search-note">本次已检查 {current.scanned} 条记录；还有更早的任务，可点击下一页继续查找。</p>}
      <nav className="market-pagination runs-pagination" aria-label="我的任务分页">
        <span className="pagination-summary" aria-live="polite">{loading ? '正在读取任务…' : totalCount != null ? `第 ${page + 1} / ${pageCount} 页 · 共 ${totalCount} 项` : `第 ${page + 1} 页 · 本页 ${runs.length} 项`} · 每页 {RUNS_PAGE_SIZE} 项</span>
        <div className="pagination-buttons"><button className="button small" disabled={loading || page === 0} onClick={() => goTo(0)}>首页</button><button className="button small" disabled={loading || page === 0} onClick={() => goTo(page - 1)}>上一页</button>
          {!loading && marketPageNumbers(pageCount, page).map((number, index) => number == null ? <span className="pagination-ellipsis" key={`gap-${index}`}>…</span> : <button className={`button small page-number ${number === page ? 'primary' : ''}`} key={number} aria-label={`第 ${number + 1} 页`} aria-current={number === page ? 'page' : undefined} disabled={number === page} onClick={() => goTo(number)}>{number + 1}</button>)}
          <button className="button small" disabled={loading || !current?.nextPageToken} onClick={() => goTo(page + 1)}>下一页</button><button className="button small" disabled={loading || !canJumpLast || page === pageCount - 1} title={!canJumpLast ? '全历史筛选尚未确定总页数' : undefined} onClick={() => goTo(pageCount - 1)}>尾页</button></div>
      </nav>
    </section>
  </>;
}
