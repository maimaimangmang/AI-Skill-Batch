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

export function marketSettlementPending(run: Run, market = run.market): boolean {
  return Boolean(market || run.sourceType === 'market_skillbot') &&
    !['succeeded', 'failed', 'cancelled'].includes(market?.transactionStatus || '');
}

export function shouldPollRun(run: Run, market = run.market): boolean {
  return !terminal(run.status) || marketSettlementPending(run, market);
}

export function runCost(run: Run, market = run.market): { amount: string; label: string } {
  if (market || run.sourceType === 'market_skillbot') {
    const final = amount(market?.finalBuyerPayableT, market?.finalBuyerPayable, market?.currency);
    // Run completion precedes settlement; finalBuyerPayable may still be a placeholder.
    if (final != null && market?.transactionStatus === 'succeeded') return { amount: final, label: '实际费用' };
    if (market?.transactionStatus === 'failed' || market?.transactionStatus === 'cancelled') {
      return { amount: final ?? '暂未返回', label: market.transactionStatus === 'failed' ? '交易失败' : '交易取消' };
    }
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
