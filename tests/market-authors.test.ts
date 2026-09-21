import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMarketAuthorLoader } from '../lib/market-authors';
import type { Listing } from '../lib/types';

const item = (id: string, nickname = '') => ({ id, creator: { nickname } } as Listing);

test('作者补齐：仅查询传入页面、最多三个并发，缓存详情并优先采用列表昵称', async () => {
  const calls: string[] = []; let active = 0; let peak = 0;
  const load = createMarketAuthorLoader(async path => {
    calls.push(path); active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 5)); active--;
    return item(path.split('/').at(-1)!, '  real-author  ');
  });
  const values = new Map<string, string | null>();
  const save = (id: string, name: string | null) => { values.set(id, name); };
  const page = [item('a', 'known'), ...['b', 'c', 'd', 'e'].map(id => item(id))];
  await load(page, new AbortController().signal, save);
  assert.equal(peak, 3);
  assert.deepEqual(calls.sort(), ['/market/b', '/market/c', '/market/d', '/market/e']);
  assert.equal(values.get('a'), 'known'); assert.equal(values.get('e'), 'real-author');
  await load(page, new AbortController().signal, save);
  assert.equal(calls.length, 4);
  await load([item('b', 'updated')], new AbortController().signal, save);
  assert.equal(values.get('b'), 'updated');
});

test('作者补齐：取消旧页不写入、不继续请求；失败后允许重试', async () => {
  const controller = new AbortController(); const values: unknown[] = []; let calls = 0;
  const load = createMarketAuthorLoader(async () => {
    calls++;
    if (calls === 1) { controller.abort(); return item('a', 'stale'); }
    if (calls === 2) throw new Error('offline');
    return item('a', 'recovered');
  });
  const save = (_id: string, name: string | null) => { values.push(name); };
  await load([item('a'), item('b'), item('c'), item('d')], controller.signal, save);
  assert.equal(calls, 1); assert.deepEqual(values, []);
  await load([item('a')], new AbortController().signal, save);
  await load([item('a')], new AbortController().signal, save);
  assert.deepEqual(values, [null, 'recovered']);
});
