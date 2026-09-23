import type { Money, Run } from './types';
import { terminal } from './domain';

function amount(value: number | undefined, object?: Money, currency?: string) {
  // Money.amount is in currency units; legacy *T values are in 1/10,000,000 units.
  const decimal = object?.amount?.trim();
  const units = decimal && /^\d+(?:\.\d+)?$/.test(decimal) ? Number(decimal) :
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value / 1e7 : undefined;
  if (units == null || !Number.isFinite(units)) return undefined;
  const code = object?.currency || currency;
  if (!code) return `${units}（币种未返回）`;
  try { return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: code, maximumFractionDigits: 7 }).format(units); }
  catch { return `${units} ${code}`; }
}

export function runCost(run: Run, market = run.market): { amount: string; label: string } {
  if (market || run.sourceType === 'market_skillbot') {
    const final = amount(market?.finalBuyerPayableT, market?.finalBuyerPayable, market?.currency);
    if (final != null && (terminal(run.status) || market?.transactionStatus === 'succeeded')) return { amount: final, label: '实际费用' };
    const estimate = amount(market?.estimatedBuyerPayableT, market?.estimatedBuyerPayable, market?.currency);
    if (estimate != null) return { amount: estimate, label: terminal(run.status) ? '预估 · 待结算' : '预估费用' };
    // actualCost on market runs is execution cost only, not the buyer's total.
    return { amount: '待结算', label: '' };
  }
  const actual = amount(run.actualCostT, run.actualCost);
  if (actual != null) return { amount: actual, label: terminal(run.status) ? '实际费用' : '当前费用' };
  const estimate = amount(run.estimatedCostT, run.estimatedCost);
  if (estimate != null) return { amount: estimate, label: '预估费用' };
  return { amount: '暂未返回', label: '' };
}
