import { test } from 'node:test';
import assert from 'node:assert/strict';
import { billingLabel, marketCategory, moneyAmount, publicPricing, quoteCreatorFee, subscriptionPlans } from '../lib/skill-commerce';
const offer = { bundleId: 'bundle-a', bundleName: 'Bundle', tiers: [{ tierType: 'monthly', enabled: true, price: { amount: '1.0000000', currency: 'CNY' }, durationDays: 30 }] };
test('official categories are independent of editorial use cases and never guessed', () => {
  assert.equal(marketCategory('content_creation')?.label, '内容创作');
  assert.equal(marketCategory('industry_expertise')?.label, '行业专业');
  assert.equal(marketCategory('images'), undefined);
  assert.equal(marketCategory(''), undefined);
});
test('subscription-only listings never inherit the obsolete zero per-task fee', () => {
  const skill = { taskFixedFeeT: 0, pricing: { payPerUseEnabled: false, subscriptionOffersStatus: 'available', subscriptionOffers: [offer] } };
  assert.equal(billingLabel(skill), '订阅收费');
  assert.equal(subscriptionPlans(skill)[0].tier.durationDays, 30);
  assert.equal(billingLabel({ ...skill, pricing: { ...skill.pricing, payPerUseEnabled: true } }), '按次 / 订阅');
  assert.equal(billingLabel({ taskFixedFeeT: 0 }), '收费信息待确认');
  assert.equal(billingLabel({ officialTemplateId: 'text-v1' }), '按用量计费');
});
test('unavailable or disabled offers do not advertise an active subscription', () => {
  assert.equal(subscriptionPlans({ pricing: { subscriptionOffersStatus: 'unavailable', subscriptionOffers: [offer] } }).length, 0);
  assert.equal(subscriptionPlans({ pricing: { subscriptionOffersStatus: 'available', subscriptionOffers: [{ ...offer, tiers: [{ ...offer.tiers[0], enabled: false }] }] } }).length, 0);
});
test('subscription money uses decimal units and its actual currency; missing values are not zero', () => {
  assert.equal(moneyAmount({ amount: '1.0000000', currency: 'USD' }, 'en'), '$1.00');
  assert.equal(moneyAmount({ amount: '1.0000000', currency: 'CNY' }, 'en'), 'CN¥1.00');
  assert.equal(moneyAmount({ amount: '0', currency: 'CNY' }, 'en'), 'CN¥0.00');
  for (const money of [undefined, { amount: 'NaN', currency: 'CNY' }, { amount: '-1', currency: 'CNY' }, { amount: '10', currency: '' }]) assert.equal(moneyAmount(money, 'en'), null);
});
test('public pricing strips private fields, disabled flags and malformed money', () => {
  const result = publicPricing({ creatorUserId: 123, secret: 'hidden', creatorFee: { amount: '1', currency: 'CNY', commission: 99 }, payPerUseEnabled: false, subscriptionOffers: [{ ...offer, creatorEarnings: 100, items: [{ secret: true }] }] });
  assert.equal(result?.payPerUseEnabled, false);
  assert.equal(JSON.stringify(result).includes('hidden'), false);
  assert.equal(JSON.stringify(result).includes('commission'), false);
  assert.equal(JSON.stringify(result).includes('creatorEarnings'), false);
  assert.equal(result?.subscriptionOffers?.[0].items, undefined);
});
test('effective creator fee takes precedence over undiscounted task fees in quotes', () => {
  const quote = { currency: 'CNY', taskCount: 4, taskFixedFeeT: 1000000 };
  assert.equal(quoteCreatorFee(quote, 'en'), 'CN¥0.40');
  assert.equal(quoteCreatorFee({ ...quote, effectivePaymentMode: 'subscription', effectiveCreatorFee: { amount: '0', currency: 'CNY' } }, 'en'), 'CN¥0.00');
  assert.equal(quoteCreatorFee({ ...quote, effectivePaymentMode: 'subscription' }, 'en'), null);
});
