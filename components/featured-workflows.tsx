'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Flame, LoaderCircle, Images, Image as ImageIcon, Type, Clapperboard } from 'lucide-react';
import { featuredWorkflows } from '@/lib/featured';
import type { Listing } from '@/lib/types';
import WorkflowAuthor from './workflow-author';
import { money } from '@/lib/domain';

type Props = {
  demo: boolean;
  busy: boolean;
  api: (path: string, options?: RequestInit) => Promise<Listing>;
  onChoose: (listing: Listing) => void;
};

export default function FeaturedWorkflows({ demo, busy, api, onChoose }: Props) {
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
      <h2 id="featured-title">金牌推荐</h2>
    </div>
    <div className="featured-grid">{featuredWorkflows.map((entry) => {
      const external = demo && !entry.officialTemplateId;
      const listing = resolved[entry.officialTemplateId || entry.listingId!];
      const fee = demo ? entry.referenceFee?.amountT : listing?.taskFixedFeeT;
      const currency = demo ? entry.referenceFee?.currency : listing?.currency;
      const price = !entry.listingId ? '按用量计费' : fee != null ? money(fee, currency) : !demo && listing === undefined ? '读取价格中…' : '价格暂未提供';
      const unavailable = listing?.executionAvailabilityStatus && listing.executionAvailabilityStatus !== 'available';
      const CategoryIcon = { commerce: Images, image: ImageIcon, text: Type, video: Clapperboard }[entry.cover];
      return <article className={`featured-card${entry.hot ? ' featured-hot' : ''}`} key={entry.url}>
        <div className="featured-category-row"><span className="featured-category"><span className="featured-category-icon"><CategoryIcon size={17} strokeWidth={1.8} aria-hidden="true" /></span>{entry.category}</span>{entry.hot && <span className="featured-hot-badge" role="img" aria-label="热门推荐" title="热门推荐"><Flame size={16} fill="currentColor" aria-hidden="true" /></span>}</div>
        <h3>{entry.title}</h3>
        <WorkflowAuthor name={listing?.creator?.nickname?.trim() || entry.authorName} />
        <p>{entry.reason}</p>
        <div className="featured-card-footer"><div className="featured-price"><strong>{price}</strong><span>{entry.listingId ? '/ 任务调用费' : '无技能调用费'}</span></div>
        {external ? <a className="featured-action" href={entry.url} target="_blank" rel="noopener noreferrer" title="在胜算云打开（新窗口）" aria-label={`${demo ? '查看' : '使用'}${entry.title}（在胜算云新窗口打开）`}>{demo ? '查看 Skill' : '使用 Skill'}<ArrowUpRight size={15} /></a>
          : listing === null ? <button className="featured-action" disabled={busy} onClick={() => setRefresh(value => value + 1)}>加载失败，重试</button>
          : <button className="featured-action" disabled={busy || !listing || !!unavailable} aria-label={`使用推荐：${entry.title}`} onClick={() => listing && onChoose(listing)}>
            {!listing ? <><LoaderCircle className="spin" size={14} />读取中</> : unavailable ? '暂不可用' : <>使用 Skill<ArrowUpRight size={15} /></>}
          </button>}</div>
      </article>;
    })}</div>
    <p className="featured-price-note">{demo && '当前展示公开参考价。'}模型费用按实际用量另计，提交前会展示预估费用。</p>
  </section>;
}
