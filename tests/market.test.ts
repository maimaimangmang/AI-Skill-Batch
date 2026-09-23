import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMarketPager, marketPageNumbers, declaredModels, listingModelLabel } from '../lib/market';
import type { Listing } from '../lib/types';

const item = (id: string) => ({ id, displayName: id } as Listing);
const signal = () => new AbortController().signal;

test('模型标签识别明确的模型 ID 声明，不从普通描述推断模型', () => {
  assert.equal(declaredModels('**模型 ID：** `openai/gpt-image-2`\n**模式：**图生图 image-to-image'), 'openai/gpt-image-2');
  assert.equal(declaredModels('- Model ID: openai/gpt-image-2'), 'openai/gpt-image-2');
  assert.equal(declaredModels('使用 OpenAI 生成商品图'), '');
  assert.equal(declaredModels('模型：未公开'), '');
});

test('作者提供的模型信息仅应用于确认过的 Skill 版本，公开声明优先', () => {
  const listing = { ...item('01a0ccea-2449-7796-ba40-bfcded89b97d'), listingVersionId: '01a0ccf2-f42f-7486-8198-69922ca9c15c' };
  assert.equal(listingModelLabel(listing), 'openai/gpt-image-2 · 图生图');
  assert.equal(listingModelLabel({ ...listing, listingVersionId: 'new-version' }), '');
  assert.equal(listingModelLabel({ ...listing, id: 'different-skill' }), '');
  assert.equal(listingModelLabel({ ...listing, description: '模型 ID：another/model' }), 'another/model');
});

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
  await assert.rejects(pager.load(2, signal()), /页码超出范围/);
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

test('市场数字分页独立获取页数，跳页只读取目标页，返回首页使用缓存', async () => {
  const urls: string[] = [];
  const pager = createMarketPager(async url => {
    urls.push(url);
    if (url.startsWith('/market-count?')) return { items: [], totalCount: 97 };
    return { items: [item('page')], nextPageToken: 'next' };
  }, '图片 & SKU');
  await pager.load(0, signal());
  assert.equal(urls.length, 1);
  assert.equal(pager.totalCount, undefined);
  assert.equal(await pager.discoverTotal(signal()), 97);
  assert.equal(urls.length, 2);
  assert.equal(pager.pages.length, 1, '获取页数不能预加载页面');
  await pager.load(8, signal());
  await pager.load(4, signal());
  assert.equal(new URL(urls[2], 'http://localhost').searchParams.get('page'), '8');
  assert.equal(new URL(urls[3], 'http://localhost').searchParams.get('page'), '4');
  assert.equal(new URL(urls[1], 'http://localhost').searchParams.get('keyword'), '图片 & SKU');
  await pager.load(0, signal()); await pager.discoverTotal(signal());
  assert.equal(urls.length, 4);
});

test('数字分页保留开头三页、末尾三页以及当前页', () => {
  assert.deepEqual(marketPageNumbers(12, 0), [0, 1, 2, null, 9, 10, 11]);
  assert.deepEqual(marketPageNumbers(12, 6), [0, 1, 2, null, 6, null, 9, 10, 11]);
  assert.deepEqual(marketPageNumbers(4, 2), [0, 1, 2, 3]);
});
