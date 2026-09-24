import { test } from 'node:test';
import assert from 'node:assert/strict';
import { post, request, RequestError } from '../lib/client';

class FakeXHR {
  static last: FakeXHR;
  upload: any = {};
  status = 200; responseText = ''; timeout = 0;
  onload?: () => void; onerror?: () => void; ontimeout?: () => void; onabort?: () => void;
  headers: Record<string, string> = {}; url = ''; body: unknown;
  constructor() { FakeXHR.last = this; }
  open(_method: string, url: string) { this.url = url; }
  setRequestHeader(key: string, value: string) { this.headers[key] = value; }
  send(body: unknown) { this.body = body; }
  abort() { this.onabort?.(); }
  respond(status: number, body: string) { this.status = status; this.responseText = body; this.onload?.(); }
}

test('upload reports transfer progress but waits for storage response before resolving', async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'XMLHttpRequest');
  Object.defineProperty(globalThis, 'XMLHttpRequest', { value: FakeXHR, configurable: true });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'XMLHttpRequest', original); else Reflect.deleteProperty(globalThis, 'XMLHttpRequest'); });
  const progress: (number | null)[] = [];
  let finished = false;
  const promise = request('/assets', { ...post({ content: 'abc' }), onUploadProgress: p => progress.push(p) }).then(value => { finished = true; return value; });
  const xhr = FakeXHR.last;
  assert.equal(xhr.url, '/api/assets');
  assert.equal(xhr.headers['content-type'], 'application/json');
  xhr.upload.onprogress({ lengthComputable: true, loaded: 40, total: 100 });
  xhr.upload.onprogress({ lengthComputable: false, loaded: 50, total: 0 });
  xhr.upload.onprogress({ lengthComputable: true, loaded: 100, total: 100 });
  xhr.upload.onload();
  await Promise.resolve();
  assert.deepEqual(progress, [40, null, 99, 100]);
  assert.equal(finished, false, 'browser upload completion is not storage completion');
  xhr.respond(200, '{"inputAssetId":"ia_test"}');
  assert.deepEqual(await promise, { inputAssetId: 'ia_test' });
});

test('upload keeps authentication errors and rejects network, timeout, and malformed responses', async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'XMLHttpRequest');
  Object.defineProperty(globalThis, 'XMLHttpRequest', { value: FakeXHR, configurable: true });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'XMLHttpRequest', original); else Reflect.deleteProperty(globalThis, 'XMLHttpRequest'); });
  for (const failure of ['auth', 'network', 'timeout', 'invalid']) {
    const promise = request('/assets', { ...post({}), onUploadProgress() {} });
    const rejection = assert.rejects(promise, error => {
      assert.ok(error instanceof Error);
      if (failure === 'auth') { assert.ok(error instanceof RequestError); assert.equal(error.status, 401); assert.equal(error.message, '会话已过期'); }
      else assert.match(error.message, failure === 'network' ? /连接中断/ : failure === 'timeout' ? /超时/ : /返回异常/);
      return true;
    });
    const xhr = FakeXHR.last;
    if (failure === 'auth') xhr.respond(401, '{"error":"会话已过期"}');
    if (failure === 'network') xhr.onerror?.();
    if (failure === 'timeout') xhr.ontimeout?.();
    if (failure === 'invalid') xhr.respond(502, '<html>Bad Gateway</html>');
    await rejection;
  }
});

test('upload cancellation rejects without success, including an already cancelled request', async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'XMLHttpRequest');
  Object.defineProperty(globalThis, 'XMLHttpRequest', { value: FakeXHR, configurable: true });
  t.after(() => { if (original) Object.defineProperty(globalThis, 'XMLHttpRequest', original); else Reflect.deleteProperty(globalThis, 'XMLHttpRequest'); });
  const controller = new AbortController();
  const promise = request('/assets', { ...post({}), signal: controller.signal, onUploadProgress() {} });
  const rejection = assert.rejects(promise, { name: 'AbortError' });
  controller.abort();
  await rejection;
  await assert.rejects(request('/assets', { ...post({}), signal: controller.signal, onUploadProgress() {} }), { name: 'AbortError' });
});
