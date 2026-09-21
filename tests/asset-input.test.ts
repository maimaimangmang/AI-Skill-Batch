import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assetValues, mergeAssetLinks } from '../lib/asset-input';

test('附件编辑兼容上传编号与表格导入的 JSON 数组', () => {
  assert.deepEqual(assetValues(''), []);
  assert.deepEqual(assetValues('ia_photo'), ['ia_photo']);
  assert.deepEqual(assetValues('["ia_photo","https://example.com/a.jpg"]'), ['ia_photo', 'https://example.com/a.jpg']);
});

test('添加链接保留多附件中的上传项，去重并检查数量；单附件明确替换', () => {
  assert.deepEqual(mergeAssetLinks(['ia_photo'], 'https://example.com/a.jpg\n\nhttps://example.com/a.jpg', true, 2), ['ia_photo', 'https://example.com/a.jpg']);
  assert.deepEqual(mergeAssetLinks('ia_photo', ' https://example.com/a.jpg ', false), ['https://example.com/a.jpg']);
  assert.throws(() => mergeAssetLinks(['ia_photo'], 'https://example.com/a.jpg', true, 1), /最多/);
  assert.throws(() => mergeAssetLinks('', 'https://example.com/a.jpg\nhttps://example.com/b.jpg', false), /一个链接/);
  for (const link of ['一张商品图', 'http://example.com/a.jpg', 'javascript:alert(1)']) {
    assert.throws(() => mergeAssetLinks('', link, false), /https/);
  }
});
