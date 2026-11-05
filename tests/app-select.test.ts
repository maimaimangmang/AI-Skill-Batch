import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import AppSelect from '../components/app-select';

test('选择器服务端渲染保留 false、0 和原始枚举值，表单值与显示标签分离', () => {
  const options = [{ value: '', label: '请选择' }, { value: 'false', label: '否' }, { value: '0', label: '零' }, { value: 'style_original', label: '原创风格' }];
  for (const option of options.slice(1)) {
    const html = renderToString(createElement(AppSelect, { label: '工作流参数', name: 'parameter', value: option.value, options, onChange: () => {} }));
    assert.match(html, new RegExp(`value="${option.value}" selected=""`));
    const trigger = html.match(/<button\b[\s\S]*?<\/button>/)?.[0] || '';
    assert.equal(trigger.replace(/<[^>]*>/g, ''), option.label);
    assert.match(html, /name="parameter"/);
    assert.match(html, /aria-label="工作流参数"/);
  }
});
