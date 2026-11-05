'use client';
import { useI18n } from './language-provider';

export function HomeFAQ() {
  const { t } = useI18n();
  return <section className="public-section home-faq" id="faq" aria-labelledby="home-faq-title">
    <h2 id="home-faq-title">{t('常见问题')}</h2>
    <div className="home-faq-list">
      <details open><summary>{t('填写任务需要登录吗？')}</summary><p>{t('不需要。可以先填写、导入任务和选择附件，预估费用时再连接 API Key。草稿仅保留在当前页面，刷新后会清除。')}</p></details>
      <details><summary>{t('怎样收费？')}</summary><p>{t('创作者调用费与模型用量费分开计算。此页展示公开参考信息，实际金额以工作台提交前的预估和最终结算为准。')}</p></details>
      <details><summary>{t('点击使用会直接扣费吗？')}</summary><p>{t('不会。点击使用只会打开任务表，填写输入并确认预估费用后才执行。')}</p></details>
    </div>
  </section>;
}
