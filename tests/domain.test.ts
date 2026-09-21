import { test } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { normalizeRows, safeUrl, money, schemaOf, emptyRow, isBlankRow } from '../lib/domain';
import { parseWorkbook, checkWorkbookZip } from '../lib/workbook';
import type { Field, Listing } from '../lib/types';
const fields: Field[] = [{ key: 'subject', label: '主题', value_type: 'string', required: true }, { key: 'count', label: '数量', value_type: 'integer', default_value: 1 }, { key: 'enabled', label: '启用', value_type: 'boolean' }];
test('忽略空白行并支持超过十行的批次', () => {
  assert.ok(normalizeRows([], fields).errors.length);
  assert.equal(normalizeRows(Array.from({ length: 1000 }, () => ({ subject: '测试' })), fields).rows.length, 1000);
  const result = normalizeRows([emptyRow(fields), { subject: ' 测试 ' }, { subject: '  ', count: null }, {}], fields);
  assert.deepEqual(result, { rows: [{ subject: '测试', count: 1 }], errors: [] });
  assert.match(normalizeRows([{}, emptyRow(fields)], fields).errors.join(''), /至少填写一行/);
});
test('有内容但未填完整仍报原始行号；无效行不静默忽略', () => {
  const result = normalizeRows([{}, { subject: 'ok' }, { enabled: false }], fields);
  assert.match(result.errors.join(''), /第 3 行.*主题.*必填/);
  assert.match(normalizeRows([{}, null], fields).errors.join(''), /第 2 行格式无效/);
  assert.equal(isBlankRow({ hidden: '不是公开输入' }, fields), true);
});
test('默认值不激活空白任务，显式零和 false 仍保留', () => {
  assert.equal(isBlankRow(emptyRow(fields), fields), true);
  const defaults = [{ key: 'enabled', label: '启用', value_type: 'boolean', default_value: true }, { key: 'count', label: '数量', value_type: 'integer', default_value: 1 }];
  assert.equal(normalizeRows([emptyRow(defaults)], defaults).rows.length, 0);
  const result = normalizeRows([{ enabled: false, count: 0 }], defaults);
  assert.deepEqual(result, { rows: [{ enabled: false, count: 0 }], errors: [] });
  assert.deepEqual(normalizeRows(result.rows, defaults), result);
});
test('required、默认值、类型转换和字段白名单', () => {
  const result = normalizeRows([{ subject: ' 测试 ', enabled: 'false', privateStep: 'never submit' }], fields);
  assert.deepEqual(result.rows, [{ subject: '测试', count: 1, enabled: false }]);
  assert.match(normalizeRows([{ subject: ' ', count: '1.5' }], fields).errors.join(' '), /必填.*整数/);
});
test('危险原型字段拒绝，市场 schema 解析后按顺序展示', () => {
  assert.throws(() => schemaOf({ inputSchemaSnapshot: '{"fields":[{"key":"__proto__"}]}' } as Listing));
  assert.equal(schemaOf({ inputSchemaSnapshot: { fields: [{ ...fields[0], order: 20 }, { ...fields[1], order: 10 }] } } as Listing).fields[0].key, 'count');
});
test('附件字段和产物链接只接受 HTTPS 或资产引用', () => {
  assert.equal(safeUrl('javascript:alert(1)'), undefined);
  assert.equal(safeUrl('data:text/html,evil'), undefined);
  assert.equal(safeUrl('https://example.com/result'), 'https://example.com/result');
  assert.ok(normalizeRows([{ image: 'http://unsafe.test' }], [{ key: 'image', label: '图片', value_type: 'asset_ref' }]).errors.length);
  assert.equal(normalizeRows([{ image: 'ia_123' }], [{ key: 'image', label: '图片', value_type: 'asset_ref' }]).errors.length, 0);
});
test('金额不混淆 T 单位与元，不猜币种', () => {
  assert.match(money(10000000, 'CNY'), /1\.00/);
  assert.match(money(10000000), /10000000 T/);
  assert.equal(money(undefined, 'CNY'), '暂未返回');
});
test('CSV 保留所有行、引号和多行文本，不静默截断到十行', async () => {
  const csv = '主题,受众\n"第一行,含逗号","多行\n内容"\n' + Array.from({ length: 11 }, (_, i) => `测试${i},用户`).join('\n');
  const [sheet] = await parseWorkbook('example.csv', Buffer.from(csv));
  assert.equal(sheet.rows.length, 12);
  assert.deepEqual(sheet.rows[0], ['第一行,含逗号', '多行\n内容']);
});
test('XLSX 多工作表、中文表头和导出公式样式文本不会执行', async () => {
  const wb = new ExcelJS.Workbook(); wb.addWorksheet('说明').addRow(['填写说明']);
  const s = wb.addWorksheet('任务'); s.addRow(['主题', '受众']); s.addRow(['=HYPERLINK("https://example.com")', '用户']);
  const buffer = Buffer.from(await wb.xlsx.writeBuffer()); const sheets = await parseWorkbook('input.xlsx', buffer);
  assert.equal(sheets[1].name, '任务'); assert.equal(sheets[1].rows[0][0], '=HYPERLINK("https://example.com")');
  const central = buffer.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02])); buffer.writeUInt32LE(100 * 1024 * 1024, central + 24);
  assert.throws(() => checkWorkbookZip(buffer), /解压后过大/);
});
test('损坏和不受支持的文件给出清晰错误', async () => {
  await assert.rejects(parseWorkbook('legacy.xls', Buffer.from('not a file')), /xlsx/);
  await assert.rejects(parseWorkbook('broken.xlsx', Buffer.from('broken')), /有效/);
});
