import { test } from 'node:test';
import assert from 'node:assert/strict';
import { languagePreference, sourceMessage, translate, translateSkillCardText, translateSkillText, localizePublicExample } from '../lib/i18n';
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

test('reviewed card translations switch language without changing task or updated creator content', () => {
  const source = '根据提示词批量生成高质量图片，适合插画、概念图、场景图和通用视觉素材生成。';
  assert.equal(translateSkillCardText('en', '电商爆款图复刻'), 'Product Image Style Remix');
  assert.match(translateSkillCardText('en', source), /^Generate high-quality images/);
  assert.equal(translateSkillCardText('zh-CN', source), source);
  assert.equal(translateSkillCardText('en', source + '新版说明。'), source + '新版说明。');
  assert.equal(translateSkillCardText('en', ''), '');
  assert.equal(translateSkillCardText('en', 'toString'), 'toString');
  assert.equal(translate('en', source), source);
});


test('public Skill metadata includes titles, instructions, labels, options and model disclosures', () => {
  for (const source of [
    '归藏网页 PPT', '庭审准备演练工作流', '任务描述', '图片提示词',
    '风格要求', '复刻要求（选填）', '输出语言', '简体中文',
    '每行填写一段图片提示词，可补充风格要求并指定图片比例；每行生成一个图片任务。',
    '系统依次执行提示词整理和图片生成，最终交付图片。',
    'openai/gpt-image-2 · 图生图',
  ]) {
    assert.doesNotMatch(translateSkillText('en', source), /[\u3400-\u9fff]/u, source);
    assert.equal(translateSkillText('zh-CN', source), source);
  }
  assert.equal(translateSkillText('en', '填写示例 2'), 'Input example 2');
  assert.equal(translateSkillText('en', '简体中文'), 'Simplified Chinese');
  assert.equal(translateSkillText('en', 'openai/gpt-image-2 · 图生图'), 'openai/gpt-image-2 · Image to image');
});

test('Skill translations retain limits and identifiers without translating arbitrary input', () => {
  assert.match(translateSkillText('en', '最多 160 字；请简要填写需要修改的背景、布局或文案。'), /160 characters/);
  assert.match(translateSkillText('en', '论文文档（5000字以内）'), /5000 characters/);
  for (const original of ['bytedance/doubao-seedream-4.5', '2048x2048', '1:1', 'toString', '我刚写好的新任务', '填写创作者刚更新的说明']) {
    assert.equal(translateSkillText('en', original), original);
  }
});


test('English public samples keep wire keys, enum values, assets and unknown content intact', () => {
  const fields = [
    { key: '提示词', label: '图片提示词', value_type: 'string' },
    { key: 'language', label: '输出语言', value_type: 'string', enum_values: ['简体中文', '英语'] },
    { key: 'image', label: '参考图', value_type: 'asset_ref' },
    { key: 'other', label: '备注', value_type: 'string' },
  ];
  const source = Object.freeze({ 提示词: '极简', language: '简体中文', image: 'asset-id-123', other: '未收录的新示例内容' });
  const localized = localizePublicExample('en', source, fields);
  assert.equal(localized.提示词, 'minimalist');
  assert.equal(localized.language, '简体中文');
  assert.equal(localized.image, 'asset-id-123');
  assert.equal(localized.other, source.other);
  assert.deepEqual(Object.keys(localized), Object.keys(source));
  assert.equal(source.提示词, '极简');
  assert.deepEqual(localizePublicExample('zh-CN', source, fields), source);
});
