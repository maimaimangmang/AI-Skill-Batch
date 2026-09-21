import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../app/api/[...path]/route';
import { db, digest, seal, unseal } from '../lib/server';

const dir = mkdtempSync(path.join(tmpdir(), 'loomdesk-test-'));
process.env.DATA_DIR = dir;
process.env.SESSION_ENCRYPTION_KEY = 'a'.repeat(64);
process.env.APP_ORIGIN = 'http://localhost:3000';
process.env.LOOMLOOM_BASE_URL = 'https://loomloom.test';
const nativeFetch = globalThis.fetch;
const attempts: { key: string; body: any }[] = [];
const completed = new Map<string, { runId: string }>();
let price = 2500000; let dropNext = false; let noCurrency = false; let quoteCount = 0;
let officialValid = true; let officialRevision = 'official-price-1'; let officialVersion = 'v3';
const officialAttempts: any[] = [];
const listing = { id: 'test-listing', displayName: '测试工作流', currency: 'CNY', listingVersionId: 'v1', executionAvailabilityStatus: 'available', inputSchemaSnapshot: JSON.stringify({ fields: [{ key: 'subject', label: '主题', value_type: 'string', required: true }] }) };
globalThis.fetch = async (input, options) => {
  const url = String(input); assert.ok(url.startsWith('https://loomloom.test/loom/v1/'), '测试不可访问真实服务');
  assert.equal(options?.redirect, 'error'); assert.equal(options?.cache, 'no-store');
  const headers = new Headers(options?.headers); const key = headers.get('Authorization') || '';
  if (key === 'Bearer invalid-key') return Response.json({ message: 'Unauthorized' }, { status: 401 });
  if (url.endsWith('/balance')) return Response.json({ currency: 'CNY', availableBalanceT: 1000000000 });
  if (url.includes('/officialTemplates/')) {
    const body = options?.body ? JSON.parse(String(options.body)) : undefined;
    if (url.endsWith('/schema')) return Response.json({ templateId: 'text-image-v1', version: officialVersion, name: '通用文生图', description: '测试',
      fields: [{ key: 'prompt', label: '图片提示词', required: true, type: 'string' }, { key: 'ratio', label: '图片比例', required: true, type: 'enum', enumValues: ['1:1', '4:5'] }],
      columns: [{ fieldKey: 'prompt', headerLabel: '图片提示词', order: 1 }, { fieldKey: 'ratio', headerLabel: '图片比例', order: 2 }], sampleRows: [{ values: { '图片提示词': '杯子', '图片比例': '1:1' } }] });
    if (url.endsWith(':validateRows')) return Response.json({ valid: officialValid, rowErrors: officialValid ? [] : [{ rowIndex: 2, fieldKey: '图片提示词', error: '输入无效' }] });
    if (url.endsWith(':precheckRows')) return Response.json({ estimatedTotalCostT: price * body.rows.length, pricingRevision: officialRevision, balanceCheck: { currency: noCurrency ? undefined : 'CNY', availableBalance: 1000000000, isSufficient: true } });
    if (url.endsWith(':runRows')) {
      officialAttempts.push(body); const stable = key + body.clientRequestId;
      if (!completed.has(stable)) completed.set(stable, { runId: `official-run-${completed.size + 1}` });
      if (dropNext) { dropNext = false; throw new Error('Lost official run response'); }
      return Response.json(completed.get(stable));
    }
  }
  if (url.endsWith('/marketListings/test-listing')) return Response.json(listing);
  if (url.includes('/marketListings?')) return Response.json({ items: [listing] });
  if (url.endsWith(':quote')) {
    quoteCount++; const body = JSON.parse(String(options?.body));
    return Response.json({ taskCount: body.inputRows.length, taskFixedFeeT: 1000000, estimatedBuyerPayableT: price * body.inputRows.length, currency: noCurrency ? undefined : 'CNY', listingVersionId: 'v1', pricingRuleVersion: 'p1' });
  }
  if (url.endsWith(':execute')) {
    const body = JSON.parse(String(options?.body)); attempts.push({ key, body });
    const stable = key + body.clientRequestId;
    if (!completed.has(stable)) completed.set(stable, { runId: `run-${completed.size + 1}` });
    if (dropNext) { dropNext = false; throw new Error('Simulated connection drop AFTER order accepted'); }
    return Response.json(completed.get(stable), { status: 201 });
  }
  if (url.includes('/users/me/runs')) return Response.json({ items: [...completed.entries()].filter(([k]) => k.startsWith(key)).map(([, v]) => v) });
  throw new Error(`Unexpected test endpoint: ${url}`);
};
async function call(route: string, body?: unknown, cookie?: string, origin = 'http://localhost:3000', method = body === undefined ? 'GET' : 'POST') {
  const request = new NextRequest(`http://localhost:3000/api/${route}`, { method, headers: { Origin: origin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const handler = method === 'GET' ? GET : method === 'DELETE' ? DELETE : POST;
  const response = await handler(request, { params: Promise.resolve({ path: route.split('/') }) });
  return { response, body: await response.json() };
}
async function login(key: string) {
  const result = await call('session', { apiKey: key }); assert.equal(result.response.status, 200);
  return result.response.headers.get('set-cookie')!.split(';')[0];
}
after(() => { globalThis.fetch = nativeFetch; db().close(); rmSync(dir, { recursive: true, force: true }); });

test('API：匿名不能读取市场、任务或提交', async () => {
  for (const route of ['market', 'runs', 'pending']) assert.equal((await call(route)).response.status, 401);
  assert.equal((await call('execute', { ticket: 'guessed', confirm: true })).response.status, 401);
  assert.equal((await call('session')).body.connected, false);
});
test('API：无效 Key 不创建会话；跨源请求在登录前被拒绝', async () => {
  assert.equal((await call('session', { apiKey: 'invalid-key' })).response.status, 401);
  assert.equal((await call('session', { apiKey: 'test-a' }, undefined, 'https://evil.example')).response.status, 403);
});
test('API：Key AES-GCM 加密落库、随机 cookie、退出销毁', async () => {
  const cookie = await login('test-key-encryption');
  assert.ok(!cookie.includes('test-key-encryption'));
  const row = db().prepare('SELECT secret FROM sessions WHERE id = ?').get(digest(cookie.split('=')[1])) as { secret: string };
  assert.ok(!row.secret.includes('test-key-encryption')); assert.equal(unseal(row.secret), 'test-key-encryption');
  const encrypted = seal({ hello: 'private' }); const tampered = Buffer.from(encrypted, 'base64url'); tampered[29] ^= 1;
  assert.throws(() => unseal(tampered.toString('base64url')));
  assert.equal((await call('session', undefined, cookie, undefined, 'DELETE')).response.status, 200);
  assert.equal((await call('runs', undefined, cookie)).response.status, 401);
});
test('API：空行不计入报价和执行，超过十行不被截断', async () => {
  const cookie = await login('test-key-row-count'); const before = quoteCount;
  assert.equal((await call('quote', { listingId: listing.id, rows: [{ subject: '  ' }, {}] }, cookie)).response.status, 400);
  assert.equal(quoteCount, before);
  const one = await call('quote', { listingId: listing.id, rows: [{}, { subject: '唯一任务' }, { subject: '  ' }] }, cookie);
  assert.equal(one.response.status, 200); assert.equal(one.body.quote.taskCount, 1);
  assert.equal((await call('execute', { ticket: one.body.ticket, confirm: true }, cookie)).response.status, 200);
  assert.deepEqual(attempts.at(-1)!.body.inputRows, [{ subject: '唯一任务' }]);
  const rows = Array.from({ length: 12 }, (_, i) => ({ subject: `任务${i}` }));
  const many = await call('quote', { listingId: listing.id, rows }, cookie);
  assert.equal(many.response.status, 200); assert.equal(many.body.quote.taskCount, 12);
  assert.equal((await call('execute', { ticket: many.body.ticket, confirm: true }, cookie)).response.status, 200);
  assert.deepEqual(attempts.at(-1)!.body.inputRows, rows);
});
test('API：缺失币种拒绝确认，报价本身不执行', async () => {
  const cookie = await login('test-key-quote'); const before = attempts.length; noCurrency = true;
  assert.equal((await call('quote', { listingId: listing.id, rows: [{ subject: 'x' }] }, cookie)).response.status, 502);
  noCurrency = false;
  const q = await call('quote', { listingId: listing.id, rows: [{ subject: 'x' }] }, cookie);
  assert.equal(q.response.status, 200); assert.equal(attempts.length, before);
  assert.equal((await call('execute', { ticket: q.body.ticket, confirm: false }, cookie)).response.status, 400);
});
test('API：报价和执行都绑定当前会话；篡改输入不起作用', async () => {
  const a = await login('test-key-a'); const b = await login('test-key-b');
  const { body: quote } = await call('quote', { listingId: listing.id, rows: [{ subject: '原始输入', hidden: 'omit' }] }, a);
  assert.equal((await call('execute', { ticket: quote.ticket, confirm: true }, b)).response.status, 409);
  const first = await call('execute', { ticket: quote.ticket, confirm: true, rows: [{ subject: '篡改' }] }, a);
  assert.equal(first.response.status, 200);
  assert.deepEqual(attempts.at(-1)!.body.inputRows, [{ subject: '原始输入' }]);
  assert.equal(attempts.at(-1)!.key, 'Bearer test-key-a');
  const before = attempts.length;
  assert.deepEqual((await call('execute', { ticket: quote.ticket, confirm: true }, a)).body, first.body);
  assert.equal(attempts.length, before, '成功后的重复点击从本地返回同一结果');
  assert.equal((await call('runs', undefined, b)).body.items.length, 0);
});
test('API：价格变化、报价过期都要求重新确认', async () => {
  const cookie = await login('test-key-price');
  const q = (await call('quote', { listingId: listing.id, rows: [{ subject: 'x' }] }, cookie)).body;
  const before = attempts.length; price *= 2;
  assert.equal((await call('execute', { ticket: q.ticket, confirm: true }, cookie)).response.status, 409);
  price /= 2; assert.equal(attempts.length, before);
  db().prepare('UPDATE quotes SET expires = 0 WHERE id = ?').run(q.ticket);
  assert.equal((await call('execute', { ticket: q.ticket, confirm: true }, cookie)).response.status, 409);
});
test('API：下单成功但响应丢失，恢复后沿用原请求避免重复计费', async () => {
  const cookie = await login('test-key-timeout');
  const q = (await call('quote', { listingId: listing.id, rows: [{ subject: 'x' }] }, cookie)).body;
  dropNext = true;
  assert.equal((await call('execute', { ticket: q.ticket, confirm: true }, cookie)).response.status, 502);
  const first = attempts.at(-1)!; const orders = completed.size;
  const pending = (await call('pending', undefined, cookie)).body;
  assert.equal(pending.items[0].ticket, q.ticket);
  db().prepare('UPDATE quotes SET expires = 0 WHERE id = ?').run(q.ticket);
  const retried = await call('execute', { ticket: q.ticket, confirm: true }, cookie);
  assert.equal(retried.response.status, 200); assert.deepEqual(attempts.at(-1), first); assert.equal(completed.size, orders);
  assert.equal((await call('pending', undefined, cookie)).body.items.length, 0);
});
test('API：导入 CSV 保留超过十行的数据供用户选择，不自动执行', async () => {
  const cookie = await login('test-key-import'); const before = attempts.length;
  const content = Buffer.from('主题\n' + Array.from({ length: 12 }, (_, i) => `第${i}行`).join('\n')).toString('base64');
  const result = await call('import', { filename: 'input.csv', content }, cookie);
  assert.equal(result.response.status, 200); assert.equal(result.body.sheets[0].rows.length, 12); assert.equal(attempts.length, before);
});

const officialInput = { officialTemplateId: 'text-image-v1', rows: [{ '图片提示词': '电商咖啡杯', '图片比例': '1:1' }, {}, {}] };
test('官方模板：读取动态字段、选项和示例；入口需要身份且只允许支持的模板', async () => {
  assert.equal((await call('official/text-image-v1')).response.status, 401);
  const cookie = await login('official-schema');
  const data = (await call('official/text-image-v1', undefined, cookie)).body;
  assert.equal(data.officialTemplateId, 'text-image-v1');
  assert.equal(data.inputSchemaSnapshot.fields[0].key, '图片提示词');
  assert.deepEqual(data.inputSchemaSnapshot.fields[1].enum_values, ['1:1', '4:5']);
  assert.equal(data.inputSchemaSnapshot.sample_rows[0]['图片提示词'], '杯子');
  assert.equal((await call('official/unknown', undefined, cookie)).response.status, 404);
});
test('官方模板：报价不执行，空行忽略，确认后提交表头字符串和费用保护字段', async () => {
  const cookie = await login('official-submit'); const before = officialAttempts.length;
  const q = await call('quote', officialInput, cookie);
  assert.equal(q.response.status, 200); assert.equal(q.body.quote.source, 'official');
  assert.equal(q.body.quote.taskCount, 1); assert.equal(q.body.quote.taskFixedFeeT, 0);
  assert.equal(q.body.quote.estimatedBuyerPayableT, price); assert.equal(officialAttempts.length, before);
  assert.equal((await call('execute', { ticket: q.body.ticket }, cookie)).response.status, 400);
  assert.equal((await call('execute', { ticket: q.body.ticket, confirm: true, rows: [{ hacked: true }] }, cookie)).response.status, 200);
  const body = officialAttempts.at(-1);
  assert.deepEqual(body.rows, [officialInput.rows[0]]); assert.equal(body.expectedEstimatedCostT, price);
  assert.equal(body.expectedPricingRevision, officialRevision); assert.ok(body.clientRequestId); assert.equal(body.inputRows, undefined);
});
test('官方模板：无效比例、远端校验失败和缺少币种阻止确认；兼容未返回价格版本的服务', async () => {
  const cookie = await login('official-validation');
  assert.equal((await call('quote', { ...officialInput, rows: [{ '图片提示词': 'x', '图片比例': 'invalid' }] }, cookie)).response.status, 400);
  officialValid = false;
  assert.equal((await call('quote', officialInput, cookie)).response.status, 400); officialValid = true;
  noCurrency = true;
  assert.equal((await call('quote', officialInput, cookie)).response.status, 502); noCurrency = false;
  officialRevision = '';
  assert.equal((await call('quote', officialInput, cookie)).response.status, 200); officialRevision = 'official-price-1';
});
test('官方模板：不同会话、价格变更、模板版本变更阻止执行', async () => {
  const cookie = await login('official-change'); const other = await login('official-other');
  const q = (await call('quote', officialInput, cookie)).body; const before = officialAttempts.length;
  assert.equal((await call('execute', { ticket: q.ticket, confirm: true }, other)).response.status, 409);
  officialRevision = 'official-price-2';
  assert.equal((await call('execute', { ticket: q.ticket, confirm: true }, cookie)).response.status, 409); officialRevision = 'official-price-1';
  officialVersion = 'v4';
  assert.equal((await call('execute', { ticket: q.ticket, confirm: true }, cookie)).response.status, 409); officialVersion = 'v3';
  assert.equal(officialAttempts.length, before);
});
test('官方模板：响应丢失后原请求重试，恢复报价保留官方计费类型', async () => {
  const cookie = await login('official-retry'); const q = (await call('quote', officialInput, cookie)).body;
  dropNext = true;
  assert.equal((await call('execute', { ticket: q.ticket, confirm: true }, cookie)).response.status, 502);
  const original = officialAttempts.at(-1); const count = completed.size;
  const pending = (await call('pending', undefined, cookie)).body;
  assert.equal(pending.items[0].quote.source, 'official');
  db().prepare('UPDATE quotes SET expires = 0 WHERE id = ?').run(q.ticket);
  assert.equal((await call('execute', { ticket: q.ticket, confirm: true }, cookie)).response.status, 200);
  assert.deepEqual(officialAttempts.at(-1), original); assert.equal(completed.size, count);
  const attempts = officialAttempts.length;
  await call('execute', { ticket: q.ticket, confirm: true }, cookie);
  assert.equal(officialAttempts.length, attempts);
});

test('官方模板：没有价格版本时仍重查金额，金额变化须重新确认', async () => {
  const cookie = await login('official-legacy-price'); officialRevision = '';
  const q = (await call('quote', officialInput, cookie)).body; const before = officialAttempts.length;
  price += 1;
  assert.equal((await call('execute', { ticket: q.ticket, confirm: true }, cookie)).response.status, 409);
  assert.equal(officialAttempts.length, before); price -= 1;
  assert.equal((await call('execute', { ticket: q.ticket, confirm: true }, cookie)).response.status, 200);
  assert.equal(officialAttempts.at(-1).expectedEstimatedCostT, price);
  assert.equal(officialAttempts.at(-1).expectedPricingRevision, undefined); officialRevision = 'official-price-1';
});
