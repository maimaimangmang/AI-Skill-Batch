'use client';
import { marketCategory, moneyAmount, subscriptionPlans, type CommerceSkill } from '@/lib/skill-commerce';
import { skillPath } from '@/lib/skill-links';
import Link from './localized-link';
import { useI18n } from './language-provider';

export function SkillTags({ skill }: { skill: CommerceSkill }) {
  const { t } = useI18n(); const category = marketCategory(skill.category);
  if (!category) return null;
  return <div className="skill-tags"><Link className="skill-category-tag" href={`/skills?category=${category.code}`}>{t(category.label)}</Link></div>;
}

export function SkillPrice({ skill }: { skill: CommerceSkill }) {
  const { t, locale } = useI18n();
  if (skill.officialTemplateId) return <div className="skill-price"><strong>{t('按模型用量计费')}</strong></div>;
  const perUse = skill.pricing?.payPerUseEnabled === true;
  const amount = moneyAmount(skill.pricing?.creatorFee, locale);
  const plan = subscriptionPlans(skill)[0];
  const subscriptionAmount = plan && moneyAmount(plan.tier.price, locale);
  return <div className="skill-price">
    {perUse && <div><strong>{amount || t('价格待确认')}</strong>{amount && <span>{t('/ 次调用')}</span>}</div>}
    {plan && <div className={perUse ? 'skill-price-alternative' : ''}><span>{perUse ? t('或订阅') + ' ' : ''}</span><strong>{subscriptionAmount || t('订阅价格待确认')}</strong><span>{plan.tier.durationDays ? t('/ {0} 天', plan.tier.durationDays) : t(' · 周期待确认')}</span></div>}
    {!perUse && !plan && <strong>{t('查看收费详情')}</strong>}
  </div>;
}

export function SkillBilling({ skill }: { skill: CommerceSkill }) {
  const { t, locale, skillText } = useI18n();
  const plans = subscriptionPlans(skill);
  const offers = [...new Map(plans.map(plan => [plan.offer.bundleId, plan.offer])).values()];
  return <section className="skill-billing-panel" aria-label={t('收费方式')}>
    <div className="skill-billing-heading"><h2>{t('收费方式')}</h2></div>
    {skill.officialTemplateId ? <p>{t('无技能调用费，模型费用按实际用量结算，提交前会显示预估金额。')}</p> : <>
      {skill.pricing?.payPerUseEnabled === true && <div className="skill-pay-per-use"><strong>{t('按次使用')}</strong><span>{moneyAmount(skill.pricing.creatorFee, locale) || t('价格待确认')} {t('/ 次调用')}</span></div>}
      {offers.map(offer => <details className="skill-subscription-offer" key={offer.bundleId} open>
        <summary><span>{t('订阅方案')} · {skillText(offer.bundleName)}</span></summary>
        <div className="subscription-tiers">{offer.tiers.filter(tier => tier.enabled).map((tier, i) => <div key={i}><span>{t(tier.tierType === 'monthly' ? '月度订阅' : tier.tierType === 'yearly' ? '年度订阅' : '订阅方案')}</span><strong>{moneyAmount(tier.price, locale) || t('价格待确认')}<small>{tier.durationDays ? t('/ {0} 天', tier.durationDays) : t(' · 周期待确认')}</small></strong></div>)}</div>
        {offer.items ? <p className="subscription-coverage"><strong>{t('包含 {0} 个 Skill', offer.items.length)}</strong><span>{offer.items.map((item, i) => <span key={item.listingId}>{i > 0 && ' · '}<Link href={skillPath(item.listingId)}>{skillText(item.listingName)}</Link></span>)}</span></p> : <p>{t('覆盖范围以胜算云购买页面为准。')}</p>}
      </details>)}
      {plans.length > 0 ? <p className="skill-billing-note">{t('有效订阅免除适用的创作者调用费，模型费用仍另计。订阅从购买成功时开始计时，查看方案不代表已订阅。')}</p> : skill.pricing?.payPerUseEnabled === true ? <p className="skill-billing-note">{t('这里显示的是创作者调用费，模型费用另计，执行前查看完整预估。')}</p> : <p>{t('收费信息暂不可用，请重新加载后查看；不会默认按免费执行。')}</p>}
      {(plans.length > 0 || skill.pricing?.payPerUseEnabled === false) && <p className="subscription-help">{t('购买与续订由胜算云处理；已购权益以运行前的报价为准。')} <a href="https://lean.shengsuanyun.com/apidocs/loomloom/guide/loomloom-users-billing" target="_blank" rel="noopener noreferrer">{t('查看订阅说明')} ↗</a></p>}
    </>}
  </section>;
}
