import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMarketPager } from '../lib/market';
import type { Listing } from '../lib/types';

const item = (id: string) => ({ id, displayName: id } as Listing);
const signal = () => new AbortController().signal;

test('市场按需请求一页，返回已浏览页不发请求，搜索独立缓存', async () => {
  const urls: string[] = [];
  const api = async (url: string) => {
    urls.push(url);
    const token = new URL(url, 'http://localhost').searchParams.get('pageToken');
    return token ? { items: [item('second')] } : { items: [item('first')], nextPageToken: 'cursor+/=' };
  };
  const pager = createMarketPager(api, '电商 & 图片');
  assert.equal((await pager.load(0, signal())).items[0].id, 'first');
  assert.equal(urls.length, 1, '首页不能自动遍历游标');
  assert.equal(pager.pages.length, 1);
  assert.equal((await pager.load(1, signal())).items[0].id, 'second');
  assert.equal(new URL(urls[1], 'http://localhost').searchParams.get('pageToken'), 'cursor+/=');
  assert.equal(new URL(urls[1], 'http://localhost').searchParams.get('keyword'), '电商 & 图片');
  await pager.load(0, signal());
  assert.equal(urls.length, 2);
  await assert.rejects(pager.load(2, signal()), /按顺序/);
  const search = createMarketPager(api, '视频');
  await search.load(0, signal());
  assert.equal(urls.length, 3);
  assert.equal(new URL(urls[2], 'http://localhost').searchParams.get('pageToken'), '');
});

test('翻页失败可重试；取消后的结果不进入缓存', async () => {
  let fail = true;
  const pager = createMarketPager(async () => {
    if (fail) throw new Error('暂时断网');
    return { items: [item('retry')] };
  }, '');
  await assert.rejects(pager.load(0, signal()), /断网/);
  assert.equal(pager.pages.length, 0);
  fail = false;
  await pager.load(0, signal());
  assert.equal(pager.pages.length, 1);
  const controller = new AbortController();
  const aborted = createMarketPager(async () => {
    controller.abort();
    return { items: [item('stale')] };
  }, '');
  await assert.rejects(aborted.load(0, controller.signal), { name: 'AbortError' });
  assert.equal(aborted.pages.length, 0);
});

test('重复游标不导致无限翻页', async () => {
  const pager = createMarketPager(async () => ({ items: [item('same')], nextPageToken: 'repeated' }), '');
  await pager.load(0, signal());
  await assert.rejects(pager.load(1, signal()), /分页信息异常/);
  assert.equal(pager.pages.length, 1);
});
