import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { sameOrigin } from '../lib/server';

const previous = { appOrigin: process.env.APP_ORIGIN, nodeEnv: process.env.NODE_ENV };
delete process.env.APP_ORIGIN;
Object.assign(process.env, { NODE_ENV: 'development' });
after(() => {
  if (previous.appOrigin === undefined) delete process.env.APP_ORIGIN; else process.env.APP_ORIGIN = previous.appOrigin;
  if (previous.nodeEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV'); else Object.assign(process.env, { NODE_ENV: previous.nodeEnv });
});
function req(origin: string, host: string, extra: Record<string, string> = {}) {
  // Deliberately reproduce Next.js's localhost-normalized URL for a 127.0.0.1 request.
  return new Request('http://localhost:3410/api/session', { method: 'POST', headers: { Origin: origin, Host: host, ...extra } });
}
test('本地 127.0.0.1 在 Next.js URL 规范化后仍可同源登录', () => {
  assert.doesNotThrow(() => sameOrigin(req('http://127.0.0.1:3410', '127.0.0.1:3410', { 'Sec-Fetch-Site': 'same-origin' })));
});
test('localhost 和 IPv6 本地地址保留各自正确的来源', () => {
  assert.doesNotThrow(() => sameOrigin(req('http://localhost:3410', 'localhost:3410')));
  assert.doesNotThrow(() => sameOrigin(req('http://[::1]:3410', '[::1]:3410')));
});
test('不同端口、别名和恶意域名的来源仍然被拒绝', () => {
  for (const origin of ['http://127.0.0.1:3000', 'http://localhost:3410', 'https://evil.example', 'null']) {
    assert.throws(() => sameOrigin(req(origin, '127.0.0.1:3410')), /请求来源/);
  }
  assert.throws(() => sameOrigin(req('http://127.0.0.1:3410', '127.0.0.1:3410', { 'Sec-Fetch-Site': 'cross-site' })), /请求来源/);
});
test('本地回退不信任任意 Host 或伪造的转发头，缺失 Origin 也拒绝', () => {
  assert.throws(() => sameOrigin(req('https://evil.example', 'evil.example')), /本地访问/);
  assert.throws(() => sameOrigin(req('https://evil.example', '127.0.0.1:3410', { 'X-Forwarded-Host': 'evil.example', 'X-Forwarded-Proto': 'https' })), /请求来源/);
  assert.throws(() => sameOrigin(new Request('http://localhost:3410/api/session', { headers: { Host: '127.0.0.1:3410' } })), /请求来源/);
});
test('显式 APP_ORIGIN 优先，反向代理使用配置来源', () => {
  process.env.APP_ORIGIN = 'https://desk.example';
  try {
    assert.doesNotThrow(() => sameOrigin(req('https://desk.example', 'localhost:3410')));
    assert.throws(() => sameOrigin(req('http://127.0.0.1:3410', '127.0.0.1:3410')), /desk.example/);
  } finally { delete process.env.APP_ORIGIN; }
});
test('生产环境缺少 APP_ORIGIN 时不能使用 Host 回退', () => {
  Object.assign(process.env, { NODE_ENV: 'production' });
  try { assert.throws(() => sameOrigin(req('http://127.0.0.1:3410', '127.0.0.1:3410')), /配置服务端 APP_ORIGIN/); }
  finally { Object.assign(process.env, { NODE_ENV: 'development' }); }
});
