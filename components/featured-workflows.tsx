'use client';
import { useI18n } from './language-provider';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Flame, LoaderCircle, Images, Image as ImageIcon, Type, Clapperboard, Sparkles } from 'lucide-react';
import { featuredWorkflows } from '@/lib/featured';
import { featuredModelDisclosure, listingModelLabel } from '@/lib/market';
import type { Listing } from '@/lib/types';
import WorkflowAuthor from './workflow-author';
import { money } from '@/lib/domain';
import { skillPath } from '@/lib/skill-links';

type Props = {
  demo: boolean;
  busy: boolean;
  api: (path: string, options?: RequestInit) => Promise<Listing>;
  onChoose: (listing: Listing) => void;
};

export default function FeaturedWorkflows({ demo, busy, api, onChoose }: Props) {
  const { t } = useI18n();
  const [resolved, setResolved] = useState<Record<string, Listing | null>>({});
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setResolved({});
    for (const entry of featuredWorkflows) {
      if (demo && !entry.officialTemplateId) continue;
      const listingId = entry.officialTemplateId || entry.listingId!;
      api(`/${entry.officialTemplateId ? 'official' : 'market'}/${encodeURIComponent(listingId)}`, { signal: controller.signal })
        .then(listing => { if (active) setResolved(items => ({ ...items, [listingId]: listing || null })); })
        .catch(() => { if (active) setResolved(items => ({ ...items, [listingId]: null })); });
    }
    return () => { active = false; controller.abort(); };
  }, [api, demo, refresh]);

  return <section className="featured" aria-labelledby="featured-title">
    <div className="featured-header">
      <h2 id="featured-title">{t("金牌推荐")}</h2>
    </div>
    <div className="featured-grid">{featuredWorkflows.map((entry) => {
      const external = demo && !entry.officialTemplateId;
      const listing = resolved[entry.officialTemplateId || entry.listingId!];
      const modelLabel = listing ? listingModelLabel(listing) : demo && entry.listingId ? featuredModelDisclosure(entry.listingId) : '';
      const fee = demo ? entry.referenceFee?.amountT : listing?.taskFixedFeeT;
      const currency = demo ? entry.referenceFee?.currency : listing?.currency;
      const price = !entry.listingId ? t("按用量计费") : fee != null ? t(money(fee, currency)) : !demo && listing === undefined ? t("读取价格中…") : t("价格暂未提供");
      const unavailable = listing?.executionAvailabilityStatus && listing.executionAvailabilityStatus !== 'available';
      const CategoryIcon = { commerce: Images, image: ImageIcon, text: Type, video: Clapperboard }[entry.cover];
      return <article className={`featured-card${entry.hot ? ' featured-hot' : ''}`} key={entry.url}>
        <div className="featured-category-row"><span className="featured-category"><span className="featured-category-icon"><CategoryIcon size={17} strokeWidth={1.8} aria-hidden="true" /></span>{t(entry.category)}</span>{entry.hot && <span className="featured-hot-badge" role="img" aria-label={t("热门推荐")} title={t("热门推荐")}><Flame size={16} fill="currentColor" aria-hidden="true" /></span>}</div>
        <h3><a href={skillPath(entry.officialTemplateId || entry.listingId!)} target="_blank" rel="noopener noreferrer">{entry.title}</a></h3>
        <WorkflowAuthor name={listing?.creator?.nickname?.trim() || entry.authorName} />
        {modelLabel && <span className="featured-model-label" title={t("模型（作者说明）：{0}", modelLabel)}><Sparkles size={10} aria-hidden="true" />{modelLabel}</span>}
        <p>{t(entry.reason)}</p>
        <div className="featured-card-footer"><div className="featured-price"><strong>{price}</strong><span>{entry.listingId ? t("/ 次") : t("无技能调用费")}</span></div>
        {external ? <a className="featured-action" href={skillPath(entry.officialTemplateId || entry.listingId!)} target="_blank" rel="noopener noreferrer" title={t("查看详情（新窗口）")} aria-label={t("{0}{1}（在新窗口打开）", demo ? t("查看") : t("使用"), entry.title)}>{demo ? t("查看 Skill") : t("使用 Skill")}<ArrowUpRight size={15} /></a>
          : listing === null ? <button className="featured-action" disabled={busy} onClick={() => setRefresh(value => value + 1)}>{t("加载失败，重试")}</button>
          : <button className="featured-action" disabled={busy || !listing || !!unavailable} aria-label={t("使用推荐：{0}", entry.title)} onClick={() => listing && onChoose(listing)}>
            {!listing ? <><LoaderCircle className="spin" size={14} />{t("读取中")}</> : unavailable ? t("暂不可用") : <>{t("使用 Skill")}<ArrowUpRight size={15} /></>}
          </button>}</div>
      </article>;
    })}</div>
    <p className="featured-price-note">{demo && t("当前展示公开参考价。")}{t("模型费用按实际用量另计，提交前会展示预估费用。")}</p>
  </section>;
}
