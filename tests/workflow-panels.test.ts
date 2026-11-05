import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { LanguageProvider } from '../components/language-provider';
import { WorkflowInstructions } from '../components/skill-guide';
import WorkflowExamples from '../components/workflow-examples';
import type { Listing, Schema } from '../lib/types';

function render(content: ReactNode) {
  const router = { bfcacheId: 'review', back() {}, forward() {}, push() {}, replace() {}, prefetch: async () => {}, refresh() {}, hmrRefresh() {} };
  return renderToString(h(AppRouterContext.Provider, { value: router }, h(LanguageProvider, { children: content })));
}
const schema: Schema = {
  fields: [{ key: 'language', label: '输出语言', value_type: 'string', required: true, description: '保留指定输出语言。' }],
  input_summary: '准备参考图与产品图。',
  instructions: ['每行生成一张图片，请核对商品细节。'],
  sample_rows: [{ language: '简体中文' }],
};
const listing: Listing = {
  id: '01a0d302-73cd-7702-a072-0358de4e9b86', displayName: '电商图复刻',
  description: '模型：bytedance/doubao-seedream-4.5', inputSchemaSnapshot: schema,
};

test('真实工作流保留可展开的作者说明、输入准备及字段要求，无须进入演示模式', () => {
  const html = render(h(WorkflowInstructions, { listing, schema }));
  assert.match(html, /<details\b/);
  for (const text of ['填写说明与工作流信息', '需要准备什么', schema.input_summary!, schema.instructions![0], '保留指定输出语言。', 'bytedance/doubao-seedream-4.5']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /常见问题/);
});

test('默认作者试跑案例保留输入输出图片，同时可选择其他公开填写示例', () => {
  const html = render(h(WorkflowExamples, { listing, schema }));
  assert.ok(html.includes('seedream-4.5-result.jpeg'));
  assert.ok(html.includes('reference.png'));
  assert.ok(html.includes('选择示例'));
  assert.ok(html.includes('填写示例 1'));
});
