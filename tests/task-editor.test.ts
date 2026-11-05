import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fieldKind, fieldRole, taskPaste } from '../lib/task-editor';
import { normalizeRows } from '../lib/domain';

test('通用编辑控件适配附件、数字枚举、布尔、数字、JSON 和文本', () => {
  const kind = (value_type: string, extra = {}) => fieldKind({ key: 'value', label: '字段', value_type, ...extra });
  assert.deepEqual([kind('asset_ref[]'), kind('integer', { enum_values: [1, 2] }), kind('boolean'), kind('integer'), kind('number'), kind('object'), kind('string[]'), kind('string')], ['asset', 'choice', 'choice', 'number', 'number', 'structured', 'structured', 'text']);
  const fields = [{ key: 'count', label: '数量', value_type: 'integer' }, { key: 'enabled', label: '启用', value_type: 'boolean' }];
  assert.deepEqual(normalizeRows([{ count: '0', enabled: 'false' }], fields), { rows: [{ count: 0, enabled: false }], errors: [] });
});

test('Excel 粘贴支持多行多列及单元格换行；拒绝越界并保留单个 JSON', () => {
  assert.deepEqual(taskPaste('"第一行\n第二行"\t8\r\n另一个任务\t0', 1, 3), [['第一行\n第二行', '8'], ['另一个任务', '0']]);
  assert.throws(() => taskPaste('a\tb', 2, 3));
  assert.equal(taskPaste('{\n\t"items": [1, 2]\n}', 0, 3), null);
  assert.equal(taskPaste('普通长文本\n第二行', 0, 3), null);
});

test('比例、像素尺寸和风格由字段含义区分，其他枚举使用通用选择图标', () => {
  const role = (key: string, enum_values: string[]) => fieldRole({ key, label: key, value_type: 'string', enum_values });
  assert.equal(role('aspect_ratio', ['1:1', '16:9']), 'ratio');
  assert.equal(role('output_size', ['auto', '2048x2048']), 'dimensions');
  assert.equal(role('style', ['旅行手绘', '立体纸雕']), 'style');
  assert.equal(role('language', ['中文', 'English']), 'choice');
});
