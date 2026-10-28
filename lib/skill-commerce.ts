import type { Listing, Money, Quote, SkillPricing, SubscriptionOffer, SubscriptionTier } from './types';
// The public Skill Catalog taxonomy, independent of our editorial use-case guides.
export const marketCategories = [
  { code: 'content_creation', label: '内容创作' }, { code: 'development_design', label: '开发设计' },
  { code: 'business_operations', label: '商业运营' }, { code: 'industry_expertise', label: '行业专业' },
  { code: 'learning_lifestyle', label: '学习生活' }, { code: 'tool_efficiency', label: '工具效率' },
  { code: 'other', label: '其他' },
] as const;
export const marketCategory = (code?: string) => marketCategories.find(item => item.code === code);
export type CommerceSkill = Pick<Listing, 'officialTemplateId' | 'category' | 'pricing' | 'taskFixedFeeT' | 'currency'>;
export function validMoney(value: unknown): value is Money {
  if (!value || typeof value !== 'object') return false;
  const v = value as Money;
  return typeof v.amount === 'string' && /^\d+(\.\d{1,7})?$/.test(v.amount) && Number.isFinite(Number(v.amount)) && typeof v.currency === 'string' && /^[A-Z]{3}$/.test(v.currency);
}
export function moneyAmount(value: Money | undefined, locale: string) {
  if (!validMoney(value)) return null;
  return new Intl.NumberFormat(locale, { style: 'currency', currency: value.currency, maximumFractionDigits: 7 }).format(Number(value.amount));
}
// Explicit public allowlist: never forward private listing, wallet or creator earnings fields.
export function publicPricing(raw: unknown): SkillPricing | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const value = raw as SkillPricing;
  return {
    creatorFee: validMoney(value.creatorFee) ? { amount: value.creatorFee.amount, currency: value.creatorFee.currency, unit: value.creatorFee.unit === 'task' ? 'task' : undefined } : undefined,
    payPerUseEnabled: typeof value.payPerUseEnabled === 'boolean' ? value.payPerUseEnabled : undefined,
    subscriptionOffersStatus: typeof value.subscriptionOffersStatus === 'string' ? value.subscriptionOffersStatus : undefined,
    subscriptionOffers: Array.isArray(value.subscriptionOffers) ? value.subscriptionOffers.filter(offer => typeof offer.bundleId === 'string' && /^[\w-]{1,180}$/.test(offer.bundleId) && typeof offer.bundleName === 'string').map(offer => ({
      bundleId: offer.bundleId, bundleName: offer.bundleName, revision: offer.revision,
      tiers: Array.isArray(offer.tiers) ? offer.tiers.map(tier => ({ tierType: tier.tierType, enabled: tier.enabled === true,
        price: validMoney(tier.price) ? { amount: tier.price.amount, currency: tier.price.currency } : undefined,
        durationDays: Number.isSafeInteger(tier.durationDays) && tier.durationDays! > 0 ? tier.durationDays : undefined })) : [],
    })) : undefined,
    subscriptionPolicy: value.subscriptionPolicy ? {
      creatorFeeWaived: value.subscriptionPolicy.creatorFeeWaived === true,
      modelFeeIncluded: typeof value.subscriptionPolicy.modelFeeIncluded === 'boolean' ? value.subscriptionPolicy.modelFeeIncluded : undefined,
      paymentTiming: value.subscriptionPolicy.paymentTiming,
    } : undefined,
  };
}
export function subscriptionPlans(skill: CommerceSkill): { offer: SubscriptionOffer; tier: SubscriptionTier }[] {
  if (skill.pricing?.subscriptionOffersStatus !== 'available') return [];
  return (skill.pricing.subscriptionOffers || []).flatMap(offer => offer.tiers.filter(tier => tier.enabled).map(tier => ({ offer, tier })));
}
export function billingLabel(skill: CommerceSkill) {
  if (skill.officialTemplateId) return '按用量计费';
  const subscriptions = subscriptionPlans(skill).length > 0;
  if (skill.pricing?.payPerUseEnabled === true) return subscriptions ? '按次 / 订阅' : '按次收费';
  if (subscriptions) return skill.pricing?.payPerUseEnabled === false ? '订阅收费' : '支持订阅';
  return '收费信息待确认';
}
export function quoteCreatorFee(quote: Quote, locale: string) {
  const effective = moneyAmount(quote.effectiveCreatorFee, locale);
  if (effective) return effective;
  // A subscription quote must never fall back to the undiscounted per-task fee.
  if (quote.effectivePaymentMode && quote.effectivePaymentMode !== 'pay_per_use') return null;
  if (quote.taskCount == null || quote.taskFixedFeeT == null || !quote.currency) return null;
  const amount = quote.taskCount * quote.taskFixedFeeT;
  if (!Number.isSafeInteger(amount) || amount < 0) return null;
  return moneyAmount({ amount: (amount / 1e7).toFixed(7), currency: quote.currency }, locale);
}
