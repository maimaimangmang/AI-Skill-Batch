import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCursorPager, createOffsetPager } from '../lib/pagination';
import { localDateBounds, matchesRun, parseRunFilters, readRunsPage, RUN_SCAN_LIMIT, RUNS_PAGE_SIZE } from '../lib/runs';
import type { Run } from '../lib/types';
const rows: Run[] = Array.from({ length: 180 }, (_, i) => ({ runId: `run-${i}`, templateKey: i % 2 ? 'text-v1' : 'text-image-v1', status: i % 3 ? 'completed' : 'failed', createdAtUnix: 1800 - i, totalTasks: 1 }));
function source(data = rows) {
  const calls: URLSearchParams[] = [];
  return { calls, fetch: async (params: URLSearchParams) => {
    assert.equal(params.get('orderBy'), 'created_at_desc', '任务接口排序必须使用枚举值，不能使用带空格的表达式');
    calls.push(params);
    const status = params.get('status'); const filtered = status ? data.filter(row => row.status === status) : data;
    const offset = Number(params.get('pageToken') || 0), size = Number(params.get('pageSize'));
    return { totalCount: filtered.length, items: filtered.slice(offset, offset + size), nextPageToken: offset + size < filtered.length ? String(offset + size) : '' };
  } };
}

test('任务首页只请求 12 条；下一页按游标加载且返回上一页命中缓存', async () => {
  const upstream = source();
  const pager = createCursorPager((token, signal) => readRunsPage(upstream.fetch, { keyword: '', status: '' }, token, signal));
  const signal = new AbortController().signal;
  const first = await pager.load(0, signal);
  assert.equal(upstream.calls.length, 1); assert.equal(first.items.length, RUNS_PAGE_SIZE);
  const second = await pager.load(1, signal);
  assert.equal(upstream.calls.length, 2); assert.equal(second.items[0].runId, 'run-12');
  await pager.load(0, signal); assert.equal(upstream.calls.length, 2);
});

test('组合搜索状态日期在后续源页面寻找匹配，不只筛选当前 12 条', async () => {
  const upstream = source();
  const filters = { keyword: '通用文生图', status: 'completed', from: 1740, until: 1790 };
  const page = await readRunsPage(upstream.fetch, filters);
  assert.ok(page.items.length > 0 && page.items.length <= 12);
  assert.ok(upstream.calls.length > 1);
  assert.ok(page.items.every(run => matchesRun(run, filters)));
  const second = await readRunsPage(upstream.fetch, filters, page.nextPageToken);
  assert.ok(second.items.every(run => matchesRun(run, filters)));
  assert.equal(new Set([...page.items, ...second.items].map(run => run.runId)).size, page.items.length + second.items.length);
  const all = [...page.items, ...second.items]; let token = second.nextPageToken;
  while (token) { const next = await readRunsPage(upstream.fetch, filters, token); all.push(...next.items); token = next.nextPageToken; }
  assert.deepEqual(all, rows.filter(run => matchesRun(run, filters)));
});

test('稀疏匹配有请求上限及继续游标，不伪装全局无结果；后续可找到匹配', async () => {
  const upstream = source();
  const filters = { keyword: 'run-100', status: '' };
  const page = await readRunsPage(upstream.fetch, filters);
  assert.equal(upstream.calls.length, RUN_SCAN_LIMIT);
  assert.equal(page.items.length, 0); assert.ok(page.searchIncomplete); assert.ok(page.nextPageToken);
  const second = await readRunsPage(upstream.fetch, filters, page.nextPageToken);
  assert.equal(second.items[0].runId, 'run-100');
  const none = await readRunsPage(source(rows.slice(0, 20)).fetch, filters);
  assert.equal(none.items.length, 0); assert.equal(none.nextPageToken, ''); assert.ok(!none.searchIncomplete);
});

test('失败状态传给上游，名称搜索兼容官方模板，编号搜索不区分大小写', async () => {
  const upstream = source();
  const page = await readRunsPage(upstream.fetch, { keyword: '', status: 'failed' });
  assert.equal(upstream.calls.length, 1); assert.equal(upstream.calls[0].get('status'), 'failed');
  assert.ok(page.items.every(run => run.status === 'failed'));
  assert.ok(matchesRun(rows[0], { keyword: 'RUN-0', status: 'failed' }));
  assert.ok(matchesRun({ ...rows[0], status: 'succeeded' }, { keyword: '通用文生图', status: 'completed' }));
  assert.ok(matchesRun({ ...rows[0], status: 'queued' }, { keyword: '', status: 'active' }));
});

test('日期范围包含结束日，缺少日期的任务不混入；拒绝非法筛选条件', () => {
  const { from, until } = localDateBounds('2026-09-21', '2026-09-21');
  assert.equal(new Date(from! * 1000).getHours(), 0);
  assert.equal(new Date(until! * 1000).getDate(), 22);
  const filters = { keyword: '', status: '', from, until };
  assert.ok(matchesRun({ ...rows[0], createdAtUnix: until! - 1 }, filters));
  assert.ok(!matchesRun({ ...rows[0], createdAtUnix: until }, filters));
  assert.ok(!matchesRun({ ...rows[0], createdAtUnix: undefined }, filters));
  assert.throws(() => localDateBounds('2026-02-30', ''), /有效日期/);
  assert.throws(() => localDateBounds('2026-09-22', '2026-09-21'), /开始日期/);
  for (const query of ['status=bogus', 'status=constructor', 'status=__proto__', 'from=abc', 'from=200&until=100', 'keyword=' + 'x'.repeat(201)]) assert.throws(() => parseRunFilters(new URLSearchParams(query)));
});

test('中途取消停止扫描，重复游标报错，失败后同一页可重试', async () => {
  const controller = new AbortController(); let calls = 0;
  await assert.rejects(readRunsPage(async () => { calls++; controller.abort(); return { items: [], nextPageToken: 'next' }; }, { keyword: 'none', status: '' }, '', controller.signal), { name: 'AbortError' });
  assert.equal(calls, 1);
  await assert.rejects(readRunsPage(async () => ({ items: [], nextPageToken: 'repeat' }), { keyword: 'search', status: '' }), /分页信息异常/);
  let failed = true;
  const pager = createCursorPager(async () => { if (failed) throw new Error('断网'); return { items: rows.slice(0, 12) }; });
  await assert.rejects(pager.load(0, new AbortController().signal), /断网/); assert.equal(pager.pages.length, 0);
  failed = false; assert.equal((await pager.load(0, new AbortController().signal)).items.length, 12);
});


test('首尾随机跳页每次只请求目标页，尾页不足 12 条不漏项，缓存与取消隔离', async () => {
  const data = Array.from({ length: 446 }, (_, i) => ({ ...rows[0], runId: `r-${i}` }));
  const upstream = source(data);
  const pager = createOffsetPager((token, signal) => readRunsPage(upstream.fetch, { keyword: '', status: '' }, token, signal), RUNS_PAGE_SIZE);
  const signal = new AbortController().signal;
  await pager.load(0, signal);
  assert.equal(pager.totalCount, 446);
  const last = await pager.load(37, signal);
  assert.equal(upstream.calls.length, 2);
  assert.equal(upstream.calls[1].get('pageToken'), '444');
  assert.equal(upstream.calls[1].get('pageSize'), '12');
  assert.equal(upstream.calls[1].get('orderBy'), 'created_at_desc');
  assert.deepEqual(last.items.map(r => r.runId), ['r-444', 'r-445']);
  await pager.load(36, signal);
  assert.equal(upstream.calls.length, 3);
  await pager.load(0, signal); await pager.load(37, signal);
  assert.equal(upstream.calls.length, 3);
  await assert.rejects(pager.load(38, signal), /页码/);
  const controller = new AbortController();
  const cancelled = createOffsetPager(async () => { controller.abort(); return { items: data.slice(0, 12), totalCount: 446 }; }, 12);
  await assert.rejects(cancelled.load(0, controller.signal), { name: 'AbortError' });
  assert.equal(cancelled.pages.length, 0);
});

test('日期范围支持准确总数、数字跳页及尾页，仅读取边界单条和目标页', async () => {
  const upstream = source(); const filters = { keyword: '', status: '', from: 1700, until: 1740 };
  const pager = createOffsetPager((token, signal) => readRunsPage(upstream.fetch, filters, token, signal), 12);
  const signal = new AbortController().signal;
  const first = await pager.load(0, signal);
  assert.equal(first.totalCount, 40); assert.equal(first.items.length, 12);
  const last = await pager.load(3, signal);
  assert.equal(last.items.length, 4); assert.equal(last.nextPageToken, '');
  assert.deepEqual(last.items, rows.filter(r => matchesRun(r, filters)).slice(36));
  assert.ok(upstream.calls.filter(p => Number(p.get('pageSize')) > 1).length === 2);
  assert.ok(upstream.calls.length < 36);
});

test('日期没有结果时为零条且无下一页，状态日期组合与边界重复时间正确', async () => {
  const emptySource = source();
  const none = await readRunsPage(emptySource.fetch, { keyword: '', status: '', from: 2000, until: 2100 });
  assert.equal(emptySource.calls.length, 1, '最新任务早于开始日期时不再扫描历史');
  assert.equal(none.totalCount, 0); assert.deepEqual(none.items, []); assert.ok(!none.nextPageToken);
  const data = rows.map((r, i) => ({ ...r, createdAtUnix: i < 15 ? 1800 : 1700 }));
  const filters = { keyword: '', status: 'failed', from: 1800, until: 1801 };
  const page = await readRunsPage(source(data).fetch, filters);
  assert.equal(page.totalCount, 5); assert.deepEqual(page.items, data.filter(r => matchesRun(r, filters)));
  assert.ok(!page.nextPageToken);
});

test('相对日期跨天更新查询，不保留两天前的今天；自定义日期保持不变', async () => {
  const { relativeRunQuery } = await import('../lib/runs');
  const old = 'from=1&until=2&keyword=test';
  for (const day of ['2026-09-21', '2026-09-23']) {
    const q = new URLSearchParams(relativeRunQuery(old, '1', day));
    const expected = localDateBounds(day, day);
    assert.equal(Number(q.get('from')), expected.from); assert.equal(Number(q.get('until')), expected.until);
    assert.equal(q.get('keyword'), 'test');
  }
  const week = new URLSearchParams(relativeRunQuery(old, '7', '2026-09-23'));
  assert.equal(Number(week.get('from')), localDateBounds('2026-09-17', '2026-09-23').from);
  assert.equal(relativeRunQuery(old, 'custom', '2026-09-23'), old);
});
