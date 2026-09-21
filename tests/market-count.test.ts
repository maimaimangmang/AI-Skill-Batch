import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countMarketItems } from '../lib/market-count';
import type { Listing } from '../lib/types';

test('页数用单条查询定位边界，覆盖空结果与整页边界', async () => {
  for (const count of [0, 1, 6, 12, 13, 24, 25, 97, 444, 10000]) {
    const calls: { offset: number; size: number }[] = [];
    const result = await countMarketItems(async params => {
      assert.equal(params.get('keyword'), 'SKU');
      const offset = params.has('pageToken') ? JSON.parse(Buffer.from(params.get('pageToken')!, 'base64url').toString()).offset : 0;
      const size = Number(params.get('pageSize')); calls.push({ offset, size });
      return { items: Array.from({ length: Math.max(0, Math.min(size, count - offset)) }, (_, n) => ({ id: String(offset + n) } as Listing)), nextPageToken: offset + size < count ? 'more' : undefined };
    }, 'SKU', new AbortController().signal);
    assert.equal(result, count);
    assert.ok(calls.length <= 34);
    assert.ok(calls.every(c => c.size === 1));

  }
});

test('页数查询取消立即停止，永不结束的上游受探测次数限制', async () => {
  const controller = new AbortController(); let calls = 0;
  await assert.rejects(countMarketItems(async () => {
    calls++; controller.abort(); return { items: [] };
  }, '', controller.signal), { name: 'AbortError' });
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(countMarketItems(async () => { calls++; return { items: [{} as Listing], nextPageToken: 'more' }; }, '', new AbortController().signal), /无法获取总页数/);
  assert.equal(calls, 34);
});
