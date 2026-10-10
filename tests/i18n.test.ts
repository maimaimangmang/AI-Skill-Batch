import { test } from 'node:test';
import assert from 'node:assert/strict';
import { languagePreference, sourceMessage, translate } from '../lib/i18n';
import english from '../lib/translations/en.json';

test('language defaults to Chinese, including missing or invalid saved preferences', () => {
  for (const value of [null, '', 'fr', 'EN', 'zh-CN']) assert.equal(languagePreference(value), 'zh-CN');
  assert.equal(languagePreference('en'), 'en');
});
test('switching language preserves substitutions and unknown content', () => {
  assert.equal(translate('zh-CN', '作者：{0}', 'Alice'), '作者：Alice');
  assert.equal(translate('en', '作者：{0}', 'Alice'), 'Author: Alice');
  assert.equal(translate('en', '连接你的工作空间'), 'Connect your workspace');
  assert.equal(translate('en', '我填写的商品介绍'), '我填写的商品介绍');
  assert.equal(translate('en', '默认：{0}', '<b>{1}</b>'), 'Default: <b>{1}</b>');
});
test('stored validation errors translate at render time without changing their source', () => {
  const source = sourceMessage('最多上传 {0} 个附件。', 4);
  assert.equal(translate('en', source), 'You can upload up to 4 attachments.');
  assert.equal(translate('zh-CN', source), '最多上传 4 个附件。');
  assert.equal(translate('en', '第 2 行「商品名称」必填'), 'Row 2: 商品名称 is required');
  assert.equal(translate('en', 'API Key 无效或已过期，请重新连接。'), 'Your API key is invalid or expired. Please reconnect.');
});
test('all translated templates preserve their interpolation parameters', () => {
  const parameters = (text: string) => [...new Set(text.match(/\{\d+\}/g) || [])].sort();
  for (const [source, translated] of Object.entries(english)) assert.deepEqual(parameters(translated), parameters(source), source);
});
