import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCost } from '../lib/run-cost';
import type { Run } from '../lib/types';
const run: Run = { runId: 'test', status: 'completed' };
test('市场显示买家总额，不漏作者调用费，支持当前金额对象及旧 T 单位', () => {
  assert.deepEqual(runCost({ ...run, actualCost: { amount: '0.0085498', currency: 'CNY' }, market: { finalBuyerPayable: { amount: '1.0085498', currency: 'CNY' } } }), { amount: '¥1.0085498', label: '实际费用' });
  assert.equal(runCost({ ...run, market: { currency: 'CNY', finalBuyerPayableT: 12500000 } }).amount, '¥1.25');
});
test('未结算市场费用明确标为预估，不能用模型费用替代总额', () => {
  assert.deepEqual(runCost({ ...run, actualCostT: 500000, market: { currency: 'CNY', estimatedBuyerPayableT: 15000000 } }), { amount: '¥1.50', label: '预估 · 待结算' });
  assert.equal(runCost({ ...run, sourceType: 'market_skillbot', actualCost: { amount: '0.05', currency: 'CNY' } }).amount, '待结算');
});
test('运行中的费用不是最终费用；市场预估优先于未结算的零值', () => {
  assert.equal(runCost({ ...run, status: 'running', actualCost: { amount: '0.03', currency: 'CNY' } }).label, '当前费用');
  assert.deepEqual(runCost({ ...run, status: 'running', market: { currency: 'CNY', finalBuyerPayableT: 0, estimatedBuyerPayableT: 10000000 } }), { amount: '¥1.00', label: '预估费用' });
});
test('区分零费用、缺失费用和无效金额，不将微小费用四舍五入为零', () => {
  assert.equal(runCost({ ...run, actualCost: { amount: '0', currency: 'CNY' } }).amount, '¥0.00');
  assert.equal(runCost(run).amount, '暂未返回');
  for (const amount of ['', 'NaN', '-1']) assert.equal(runCost({ ...run, actualCost: { amount, currency: 'CNY' } }).amount, '暂未返回');
  assert.equal(runCost({ ...run, actualCostT: 1, actualCost: { amount: '0.0000001', currency: 'CNY' } }).amount, '¥0.0000001');
});
