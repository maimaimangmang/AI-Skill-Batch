import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stageDraftAsset, resolveDraftAssets, type DraftAssets } from '../lib/draft-assets';
import type { Field } from '../lib/types';
const fields: Field[] = [{ key: 'images', label: 'Images', value_type: 'asset_ref[]' }, { key: 'prompt', label: 'Prompt', value_type: 'string' }];
test('draft attachments upload only when resolving and only if still referenced', async () => {
  const assets: DraftAssets = new Map();
  const id = stageDraftAsset(assets, new File(['image'], 'image.png'));
  stageDraftAsset(assets, new File(['removed'], 'removed.png'));
  const rows = [{ images: [id, id, 'https://example.com/a.png'], prompt: id }];
  let calls = 0;
  const result = await resolveDraftAssets(rows, fields, assets, async file => { calls++; assert.equal(file.name, 'image.png'); return { inputAssetId: 'ia_remote' }; });
  assert.equal(calls, 1);
  assert.deepEqual(result, [{ images: ['ia_remote', 'ia_remote', 'https://example.com/a.png'], prompt: id }]);
  assert.equal(rows[0].images[0], id);
  await resolveDraftAssets(rows, fields, assets, async () => { throw new Error('must reuse successful upload'); });
});
test('retry retains successful uploads and retries a failed file without losing draft values', async () => {
  const assets: DraftAssets = new Map();
  const a = stageDraftAsset(assets, new File(['a'], 'a.png')); const b = stageDraftAsset(assets, new File(['b'], 'b.png'));
  const rows = [{ images: [a, b] }];
  await assert.rejects(resolveDraftAssets(rows, fields, assets, async file => { if (file.name === 'b.png') throw new Error('offline'); return { inputAssetId: 'ia_a' }; }), /offline/);
  const seen: string[] = [];
  assert.deepEqual(await resolveDraftAssets(rows, fields, assets, async file => { seen.push(file.name); return { inputAssetId: 'ia_b' }; }), [{ images: ['ia_a', 'ia_b'] }]);
  assert.deepEqual(seen, ['b.png']); assert.deepEqual(rows, [{ images: [a, b] }]);
});
test('missing local assets and invalid upload responses cannot reach a quote', async () => {
  await assert.rejects(resolveDraftAssets([{ images: ['ia_local_missing'] }], fields, new Map(), async () => ({ inputAssetId: 'ia_x' })), /重新选择/);
  const assets: DraftAssets = new Map(); const id = stageDraftAsset(assets, new File(['x'], 'x'));
  await assert.rejects(resolveDraftAssets([{ images: [id] }], fields, assets, async () => ({ inputAssetId: id })), /有效附件/);
});
