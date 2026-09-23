import type { Run } from './types';
import { runName } from './run-name';
import type { CursorPage } from './pagination';

export const RUNS_PAGE_SIZE = 12;
export const RUN_SCAN_LIMIT = 5;
export const RUN_STATUS_OPTIONS = [
  ['', '全部状态'], ['running', '运行中'], ['queued', '排队中'], ['completed', '已完成'], ['failed', '失败'],
  ['partially_failed', '部分失败'], ['cancelled', '已取消'], ['partially_cancelled', '部分取消'],
] as const;
const statusGroups: Record<string, string[]> = {
  active: ['pending', 'accepted', 'queued', 'running', 'processing'], completed: ['completed', 'succeeded'],
  pending: ['pending'], accepted: ['accepted'], queued: ['queued'], running: ['running'], processing: ['processing'], succeeded: ['succeeded'],
  failed: ['failed'], partially_failed: ['partially_failed'], cancelled: ['cancelled'], partially_cancelled: ['partially_cancelled'],
};
export type RunFilters = { keyword: string; status: string; from?: number; until?: number };
export type RunsPage = CursorPage<Run> & { searchIncomplete?: boolean; scanned?: number };
export function parseRunFilters(params: URLSearchParams): RunFilters {
  const keyword = (params.get('keyword') || '').trim();
  const status = params.get('status') || '';
  if (keyword.length > 200) throw new Error('搜索内容最多 200 字。');
  if (status && !Object.hasOwn(statusGroups, status)) throw new Error('无效的任务状态。');
  const timestamp = (key: string) => {
    const value = params.get(key);
    if (!value) return undefined;
    const number = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number > 253402300799) throw new Error('无效的时间范围。');
    return number;
  };
  const from = timestamp('from'), until = timestamp('until');
  if (from != null && until != null && from >= until) throw new Error('开始日期不能晚于结束日期。');
  return { keyword, status, from, until };
}
export function matchesRun(run: Run, filters: RunFilters) {
  if (filters.status && !statusGroups[filters.status]?.includes(run.status?.toLowerCase())) return false;
  if ((filters.from != null || filters.until != null) && run.createdAtUnix == null) return false;
  if (filters.from != null && run.createdAtUnix! < filters.from) return false;
  if (filters.until != null && run.createdAtUnix! >= filters.until) return false;
  return !filters.keyword || `${runName(run)}\n${run.runId}`.toLocaleLowerCase().includes(filters.keyword.toLocaleLowerCase());
}
// Dates form a contiguous range in created_at_desc order. Probe its boundaries
// one row at a time, then fetch only the requested page inside that range.
async function readDatePage(fetchPage: (params: URLSearchParams) => Promise<CursorPage<Run>>, filters: RunFilters, token: string, signal?: AbortSignal): Promise<RunsPage> {
  if (token && !/^\d+$/.test(token)) throw new Error('无效的分页游标。');
  const offset = Number(token || 0);
  if (!Number.isSafeInteger(offset)) throw new Error('无效的分页游标。');
  const cache = new Map<number, Run | undefined>();
  async function read(start: number, size: number) {
    signal?.throwIfAborted();
    const params = new URLSearchParams({ pageSize: String(size), orderBy: 'created_at_desc' });
    if (start) params.set('pageToken', String(start));
    if (filters.status) params.set('status', filters.status);
    const result = await fetchPage(params);
    signal?.throwIfAborted();
    return result;
  }
  const first = await read(0, 1);
  if (!Number.isSafeInteger(first.totalCount) || first.totalCount! < 0) throw new Error('任务接口暂未返回总数，请刷新重试。');
  const total = first.totalCount!;
  cache.set(0, first.items[0]);
  const newest = first.items[0]?.createdAtUnix;
  if (!total || (filters.from != null && newest != null && newest < filters.from)) return { items: [], totalCount: 0 };
  async function firstOlderThan(timestamp: number) {
    let lo = 0, hi = total;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (!cache.has(mid)) cache.set(mid, (await read(mid, 1)).items[0]);
      const row = cache.get(mid);
      if (!row || row.createdAtUnix == null || !Number.isFinite(row.createdAtUnix)) throw new Error('任务日期信息已变化，请刷新重试。');
      if (row.createdAtUnix < timestamp) hi = mid; else lo = mid + 1;
    }
    return lo;
  }
  const start = filters.until == null || (newest != null && newest < filters.until) ? 0 : await firstOlderThan(filters.until);
  const end = filters.from == null ? total : await firstOlderThan(filters.from);
  const count = Math.max(0, end - start);
  if (offset >= count) return { items: [], totalCount: count };
  const result = await read(start + offset, Math.min(RUNS_PAGE_SIZE, count - offset));
  // A concurrent insertion must not leak rows outside the selected dates.
  if (!result.items.every(row => matchesRun(row, filters))) throw new Error('任务列表已更新，请刷新重试。');
  return { items: result.items, totalCount: count, nextPageToken: offset + RUNS_PAGE_SIZE < count ? String(offset + RUNS_PAGE_SIZE) : '' };
}

// A bounded scan fills at most one visible page. The upstream API supports
// status/order/cursor only. Never pretend an unsearched history has no matches.
export async function readRunsPage(
  fetchPage: (params: URLSearchParams) => Promise<CursorPage<Run>>,
  filters: RunFilters, token = '', signal?: AbortSignal,
): Promise<RunsPage> {
  if (!filters.keyword && filters.status !== 'active' && (filters.from != null || filters.until != null)) {
    return readDatePage(fetchPage, filters, token, signal);
  }
  const directPage = !filters.keyword && filters.from == null && filters.until == null && filters.status !== 'active';
  if (directPage) {
    signal?.throwIfAborted();
    const params = new URLSearchParams({ pageSize: String(RUNS_PAGE_SIZE), orderBy: 'created_at_desc' });
    if (token) params.set('pageToken', token);
    if (filters.status) params.set('status', filters.status);
    const result = await fetchPage(params);
    signal?.throwIfAborted();
    return result;
  }
  const items: Run[] = []; const seen = new Set<string>(); const ids = new Set<string>();
  let scanned = 0;
  for (let attempt = 0; attempt < RUN_SCAN_LIMIT; attempt++) {
    signal?.throwIfAborted();
    if (seen.has(token)) throw new Error('任务分页信息异常，请刷新重试。');
    seen.add(token);
    const params = new URLSearchParams({ pageSize: String(RUNS_PAGE_SIZE - items.length), orderBy: 'created_at_desc' });
    if (token) params.set('pageToken', token);
    const statuses = statusGroups[filters.status];
    if (statuses?.length === 1) params.set('status', statuses[0]);
    const page = await fetchPage(params);
    signal?.throwIfAborted();
    if (!Array.isArray(page.items) || page.items.length > RUNS_PAGE_SIZE - items.length) throw new Error('任务分页返回数量异常，请刷新重试。');
    scanned += page.items.length;
    for (const run of page.items) {
      if (!ids.has(run.runId) && matchesRun(run, filters)) { items.push(run); ids.add(run.runId); }
    }
    token = page.nextPageToken || '';
    if (token && seen.has(token)) throw new Error('任务分页信息异常，请刷新重试。');
    if (!token || items.length === RUNS_PAGE_SIZE) return { items, nextPageToken: token, scanned };
  }
  return { items, nextPageToken: token, scanned, searchIncomplete: !!token };
}

// Date fields use the user's local timezone and include the entire end date.
export function localDateBounds(start: string, end: string) {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('请选择有效日期。');
    const [y, m, d] = value.split('-').map(Number); const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) throw new Error('请选择有效日期。');
    return date;
  };
  const from = start ? parse(start) : undefined, until = end ? parse(end) : undefined;
  if (until) until.setDate(until.getDate() + 1);
  if (from && until && from >= until) throw new Error('开始日期不能晚于结束日期。');
  return { from: from ? Math.floor(from.getTime() / 1000) : undefined, until: until ? Math.floor(until.getTime() / 1000) : undefined };
}

export function localDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Resolve relative dates from the current local day, not from an old submission.
export function relativeRunQuery(query: string, range: string, day: string) {
  if (!['1', '7', '30'].includes(range)) return query;
  const start = new Date(`${day}T12:00:00`);
  start.setDate(start.getDate() - Number(range) + 1);
  const bounds = localDateBounds(localDateString(start), day);
  const params = new URLSearchParams(query);
  params.set('from', String(bounds.from)); params.set('until', String(bounds.until));
  return params.toString();
}
