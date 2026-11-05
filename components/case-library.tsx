'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Link from './localized-link';
import Modal from './modal';
import { PublicShell } from './public-site';
import { useI18n } from './language-provider';
import { skillPath } from '@/lib/skill-links';
import '@/app/case-library.css';
import { useHistorySnapshot } from './use-history-snapshot';

type CaseImage = { src: string; label: string; panel?: number };
type Example = {
  id: string; category: 'commerce' | 'photo'; title: string; description: string;
  input: CaseImage; output: CaseImage; reference?: CaseImage;
  workflow: string; setting: string; prompt: string;
};
const styleAtlas = '/examples/photo-styles/autumn-style-atlas.png';
const photoWorkflow = '01a18be3-8803-7aae-929b-d28d63c46136';
const commercePrompt = '保留参考图暖黄色灯光、床头木桌和温馨氛围，以产品原图中的陶瓷杯为主角，清理杂物，不加文案。杯子保持陶瓷质感，不要发光。';
const examples: Example[] = [
  {
    id: 'warm-light-gpt', category: 'commerce', title: '一只陶瓷杯，换一个暖光场景',
    description: '用产品原图保留主体，用参考图表达光线、构图和氛围。',
    input: { src: '/examples/ecommerce-image-remix/product.jpeg', label: '产品原图' },
    reference: { src: '/examples/ecommerce-image-remix/reference.png', label: '参考图' },
    output: { src: '/examples/ecommerce-image-remix/hero-result.webp', label: '生成结果' },
    workflow: '01a0ccea-2449-7796-ba40-bfcded89b97d', setting: 'GPT Image 2', prompt: commercePrompt,
  },
  {
    id: 'warm-light-seedream', category: 'commerce', title: '同一组输入，看看另一种模型表现',
    description: '沿用相同的产品、参考图和要求，对照材质与光影的变化。',
    input: { src: '/examples/ecommerce-image-remix/product.jpeg', label: '产品原图' },
    reference: { src: '/examples/ecommerce-image-remix/reference.png', label: '参考图' },
    output: { src: '/examples/ecommerce-image-remix/seedream-4.5-result.jpeg', label: '生成结果' },
    workflow: '01a0d302-73cd-7702-a072-0358de4e9b86', setting: '豆包4.5', prompt: commercePrompt,
  },
  ...[
    { id: 'travel-sketch', title: '把旅行风景，画进手绘日记', style: '旅行手绘', panel: 1, description: '用细线、透明水彩和纸面质感，表达旅行手绘的画面方向。' },
    { id: 'impasto-oil', title: '让秋日湖畔，留下厚涂笔触', style: '刮刀油画', panel: 2, description: '用厚涂肌理、刮刀笔触和丰富色层，表现油画的材质感。' },
    { id: 'layered-paper', title: '把一处风景，叠成纸上世界', style: '立体纸雕', panel: 3, description: '用层层纸片、柔和投影和色块，展示立体纸雕的空间感。' },
  ].map(item => ({
    id: item.id, category: 'photo' as const, title: item.title, description: item.description,
    input: { src: styleAtlas, panel: 0, label: '原始场景示意' },
    output: { src: styleAtlas, panel: item.panel, label: item.style },
    workflow: photoWorkflow, setting: item.style,
    prompt: '上传一张照片，选择对应转绘风格；同一照片想尝试多种风格，可复制为多行分别选择。',
  })),
];
const filters = [{ id: 'all', label: '全部案例' }, { id: 'commerce', label: '电商出图' }, { id: 'photo', label: '照片风格化' }] as const;

function ExampleImage({ image }: { image: CaseImage }) {
  const { t } = useI18n();
  return <figure className="case-figure">
    <div className="case-visual" data-panel={image.panel}>
      <Image src={image.src} alt={t(image.label)} width={1254} height={1254} loading="eager" unoptimized={image.src.endsWith('.webp')} sizes="(max-width:600px) 100vw, (max-width:1000px) 50vw, 33vw" />
    </div>
    <figcaption>{t(image.label)}</figcaption>
  </figure>;
}

export default function CaseLibrary() {
  const { t } = useI18n();
  const [category, setCategory] = useState<(typeof filters)[number]['id']>('all');
  const [selected, setSelected] = useState<Example | null>(null);
  useHistorySnapshot('loomskillCases', { category, selected: selected?.id }, saved => {
    setCategory(saved.category); setSelected(examples.find(item => item.id === saved.selected) || null);
  });
  const visible = examples.filter(item => category === 'all' || item.category === category);
  return <PublicShell activePage="cases"><main className="case-library-page">
    <header className="case-library-heading">
      <h1>{t('创作案例库')}</h1>
    </header>
    <div className="case-filters" role="group" aria-label={t('筛选案例分类')}>
      {filters.map(filter => <button type="button" key={filter.id} aria-pressed={category === filter.id} aria-controls="case-results" onClick={() => setCategory(filter.id)}>{t(filter.label)}<span>{filter.id === 'all' ? examples.length : examples.filter(item => item.category === filter.id).length}</span></button>)}
    </div>
    <p className="sr-only" role="status">{t('当前显示 {0} 个案例', visible.length)}</p>
    <div className="case-grid" id="case-results">
      {visible.map(item => <article className="case-card" key={item.id}>
        <div className="case-preview">
          <ExampleImage image={item.input} /><ExampleImage image={item.output} />
          <button type="button" className="case-preview-open" onClick={() => setSelected(item)} aria-label={t('查看案例：{0}', t(item.title))}><span className="case-preview-arrow" aria-hidden="true"><ArrowUpRight size={18} /></span></button>
        </div>
        <div className="case-card-copy">
          <div className="case-meta"><span>{t(item.category === 'commerce' ? '作者真实试跑' : 'AI 风格示意')}</span><span>{t(item.setting)}</span></div>
          <h2>{t(item.title)}</h2><p>{t(item.description)}</p>
          <div className="case-card-actions"><button type="button" onClick={() => setSelected(item)}>{t('查看案例')}<ArrowRight size={15} aria-hidden="true" /></button><Link href={skillPath(item.workflow)} prefetch={false}>{t('使用工作流')}<ArrowUpRight size={15} aria-hidden="true" /></Link></div>
        </div>
      </article>)}
    </div>
    <p className="case-source-note">{t('电商案例为作者真实试跑；照片风格化图片为 AI 原创风格示意，非该工作流的实测结果。')}</p>
    {selected && <Modal wide title={t(selected.title)} onClose={() => setSelected(null)}>
      <div className="case-detail">
        <p className="case-detail-source">{t(selected.category === 'commerce' ? '作者真实试跑，实际输出会随输入和模型变化。' : '本组为 AI 原创风格示意，用于说明画面方向，不代表照片转绘工作流的实测结果。')}</p>
        <div className={`case-detail-images${selected.reference ? ' has-reference' : ''}`}><ExampleImage image={selected.input} />{selected.reference && <ExampleImage image={selected.reference} />}<ExampleImage image={selected.output} /></div>
        <div className="case-recipe"><h3>{t(selected.category === 'commerce' ? '这次试跑的画面要求' : '如何尝试这种风格')}</h3><p>{t(selected.prompt)}</p><dl><div><dt>{t(selected.category === 'commerce' ? '模型' : '转绘风格')}</dt><dd>{t(selected.setting)}</dd></div>{selected.category === 'photo' && <div><dt>{t('画面宽高比')}</dt><dd>{t('与原片一致')}</dd></div>}</dl></div>
        <Link className="public-button primary" href={skillPath(selected.workflow)} prefetch={false}>{t(selected.category === 'commerce' ? '用我的产品试一张' : '用我的照片试试')}<ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
    </Modal>}
  </main></PublicShell>;
}
