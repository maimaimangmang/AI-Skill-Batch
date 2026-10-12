'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, MousePointer2, Pause, Play } from 'lucide-react';
import { useI18n } from './language-provider';

const companions = [
  { id: 'bobo', name: '啵啵', role: '自动执行', line: '重复的工作，交给我。', scene: 'automation' },
  { id: 'taotao', name: '桃桃', role: '灵感创作', line: '让一个灵感，长出更多可能。', scene: 'creative' },
  { id: 'yaya', name: '芽芽', role: '研究整理', line: '把纷繁的信息，整理得井井有条。', scene: 'research' },
];

function useSceneDepth(paused: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scene = ref.current;
    if (!scene) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      if (paused || reduce.matches) {
        scene.style.removeProperty('--mx');
        scene.style.removeProperty('--my');
        scene.style.removeProperty('--sy');
        return;
      }
      const bounds = scene.getBoundingClientRect();
      const scroll = Math.max(-80, Math.min(100, (window.innerHeight * 0.45 - bounds.top - bounds.height * 0.5) * 0.22));
      scene.style.setProperty('--mx', String(x));
      scene.style.setProperty('--my', String(y));
      scene.style.setProperty('--sy', `${scroll}px`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const move = (event: PointerEvent) => {
      if (!fine.matches || event.pointerType === 'touch') return;
      const bounds = scene.getBoundingClientRect();
      x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
      y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
      schedule();
    };
    const reset = () => { x = 0; y = 0; schedule(); };
    scene.addEventListener('pointermove', move, { passive: true });
    scene.addEventListener('pointerleave', reset);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    reduce.addEventListener('change', reset);
    fine.addEventListener('change', reset);
    paint();
    return () => {
      cancelAnimationFrame(frame);
      scene.removeEventListener('pointermove', move);
      scene.removeEventListener('pointerleave', reset);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      reduce.removeEventListener('change', reset);
      fine.removeEventListener('change', reset);
    };
  }, [paused]);
  return ref;
}

export function PlushHero() {
  const { t } = useI18n();
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const [revision, setRevision] = useState(0);
  const sceneRef = useSceneDepth(paused);
  const buddy = companions[selected];
  const choose = (index: number) => { setSelected(index); setRevision(value => value + 1); };

  return <>
    <section className="plush-hero">
      <div className="plush-copy">
        <span className="plush-eyebrow"><span />AI BATCH STUDIO</span>
        <h1>{t('AI批量生成，')}<br /><em>{t('从一张表开始')}</em></h1>
        <p>{t('主图、详情图、营销文案。找到合适的 Skill，填好一张表，把重复工作交给 AI。')}</p>
        <div className="public-actions"><Link className="public-button primary" href="/skills">{t('探索 Skill')}<ArrowRight size={18} /></Link><Link className="public-button" href="/app?demo=1">{t('先体验演示')}</Link></div>
        <div className="public-benefits"><span><Check size={14} />{t('免登录浏览')}</span><span><Check size={14} />{t('执行前确认费用')}</span><span><Check size={14} />{t('结果统一下载')}</span></div>
        <div className="plush-companion-note"><span className="plush-note-line" /><span>{t('一点灵感，一群得力的小帮手。')}</span></div>
      </div>
      <div className="plush-studio">
        <div className="plush-scene" ref={sceneRef} data-paused={paused} data-companion={buddy.id}>
          <div className="plush-room" aria-hidden="true"><Image src="/plush/workspace.webp" alt="" fill sizes="(max-width: 760px) 100vw, 600px" unoptimized priority /></div>
          <div className="plush-light" aria-hidden="true" />
          <span className="plush-scene-label">{t('灵感工作间')}</span>
          <button className="plush-motion-control" type="button" aria-label={paused ? t('开启动效') : t('暂停动效')} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>
          <div className="plush-postcard" aria-hidden="true"><div className="plush-tape" /><Image src={`/plush/${buddy.scene}.webp`} width={160} height={120} alt="" unoptimized /><span>{t(buddy.role)}</span></div>
          <div className="plush-ground-shadow" aria-hidden="true" />
          <button className="plush-buddy" type="button" onClick={() => choose((selected + 1) % companions.length)} aria-label={t('当前搭档：{0}，点击切换下一位', t(buddy.name))}>
            <span className="plush-breathe"><span className="plush-swap" key={revision}>{companions.map((item, index) => <Image key={item.id} className={selected === index ? 'is-selected' : ''} src={`/plush/${item.id}.webp`} width={720} height={800} alt="" unoptimized priority />)}</span></span>
          </button>
          <div className="plush-prop plush-prop-tray" aria-hidden="true"><Image src="/plush/tray.webp" width={420} height={420} alt="" unoptimized /></div>
          <div className="plush-prop plush-prop-glass" aria-hidden="true"><Image src="/plush/magnifier.webp" width={420} height={420} alt="" unoptimized /></div>
          <div className="plush-click-hint"><MousePointer2 size={13} />{t('点点我，换个搭档')}</div>
        </div>
        <div className="plush-buddy-caption" aria-live="polite"><strong>{t(buddy.name)}<span> · {t(buddy.role)}</span></strong><p>{t(buddy.line)}</p></div>
        <div className="plush-choices" role="group" aria-label={t('选择你的搭档')}>{companions.map((item, index) => <button key={item.id} type="button" aria-pressed={selected === index} onClick={() => choose(index)}><Image src={`/plush/${item.id}.webp`} width={36} height={38} alt="" unoptimized /><span>{t(item.name)}</span><small>{t(item.role)}</small></button>)}</div>
      </div>
    </section>
    <div className="plush-proof">
      <div className="plush-proof-copy"><span className="public-eyebrow">MADE WITH LOOMSKILL</span><strong>{t('从一个想法，到一张真实作品。')}</strong><p>{t('电商图复刻 · 作者真实试跑')}</p></div>
      <div className="plush-proof-images"><Image src="/examples/ecommerce-image-remix/reference.png" width={100} height={100} alt={t('参考图')} /><span>+</span><Image src="/examples/ecommerce-image-remix/product.jpeg" width={100} height={100} alt={t('产品原图')} /><ArrowRight size={20} /><Link href="/skills/ecommerce-image-remix" aria-label={t('查看电商图复刻案例')}><Image src="/examples/ecommerce-image-remix/result.png" width={220} height={120} alt={t('AI 生成案例：暖光床头场景中的陶瓷杯')} /><span>{t('查看案例')} ↗</span></Link></div>
    </div>
  </>;
}
