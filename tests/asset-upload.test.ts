import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readAssetUpload } from '../lib/asset-upload';
import { ApiError } from '../lib/server';
const filename = '商品 图%原件.png';
function binary(body: BodyInit, headers: Record<string, string> = {}) {
  return new Request('https://desk.test/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-Upload-Filename': encodeURIComponent(filename), 'X-Upload-Type': 'image/png', ...headers }, body, duplex: 'half' } as RequestInit);
}
test('binary upload preserves every byte and Chinese filename; legacy JSON remains compatible', async () => {
  const bytes = Uint8Array.from({ length: 4096 }, (_, i) => i % 256);
  const expected = { filename, contentType: 'image/png', content: Buffer.from(bytes).toString('base64') };
  assert.deepEqual(await readAssetUpload(binary(bytes)), expected);
  assert.deepEqual(await readAssetUpload(new Request('https://desk.test/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(expected) })), expected);
});
test('binary upload checks the actual streaming size even with absent or incorrect Content-Length', async () => {
  for (const length of [undefined, '1']) {
    let cancelled = false;
    const stream = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(6 * 1024 * 1024)); }, cancel() { cancelled = true; } });
    await assert.rejects(readAssetUpload(binary(stream, length ? { 'Content-Length': length } : {})), e => e instanceof ApiError && e.status === 413);
    assert.equal(cancelled, true);
  }
  await assert.rejects(readAssetUpload(binary('tiny', { 'Content-Length': String(11 * 1024 * 1024) })), e => e instanceof ApiError && e.status === 413);
});
test('empty data, malformed metadata and unsupported encodings are rejected', async () => {
  await assert.rejects(readAssetUpload(binary('')), /文件为空/);
  const invalidHeaders: Record<string, string>[] = [{ 'X-Upload-Filename': '%ZZ' }, { 'X-Upload-Filename': '' }, { 'X-Upload-Filename': 'a'.repeat(256) }, { 'X-Upload-Filename': '%00test.png' }, { 'X-Upload-Type': 'invalid' }];
  for (const headers of invalidHeaders) {
    await assert.rejects(readAssetUpload(binary('test', headers)));
  }
  await assert.rejects(readAssetUpload(binary('test', { 'Content-Type': 'text/plain' })), e => e instanceof ApiError && e.status === 415);
});
