'use client';
import { SkillPrice } from './skill-pricing';

import Link from './localized-link';
import FavoriteButton from './favorite-button';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, FileText, ImageIcon, Layers, RefreshCw } from 'lucide-react';
import { useI18n } from './language-provider';
import { skillPath } from '@/lib/skill-links';
import { translateSkillCardText } from '@/lib/i18n';
import type { PublicSkill } from '@/lib/public-skills';
import { useHistorySnapshot } from './use-history-snapshot';

export type HomeSkill = Pick<PublicSkill, 'id' | 'displayName' | 'description' | 'officialTemplateId' | 'taskFixedFeeT' | 'currency' | 'outputType' | 'category' | 'pricing'>;

// Pointer updates stay outside React rendering and are disabled for touch/reduced motion.
export function useHomeMotion() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const preference = window.matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let active: HTMLElement | null = null;
    let bounds: DOMRect | null = null;
    let frame = 0;
    function reset() {
      cancelAnimationFrame(frame);
      if (active) {
        for (const property of ['--pointer-x', '--pointer-y', '--tilt-x', '--tilt-y']) active.style.removeProperty(property);
        active.removeAttribute('data-pointer-active');
      }
      active = null;
      bounds = null;
    }
    function move(event: PointerEvent) {
      if (!preference.matches || event.pointerType === 'touch') return;
      const target = (event.target as Element).closest<HTMLElement>('[data-home-motion], .public-card, .workflow-card, .featured-card, .favorite-card');
      if (target !== active) { reset(); active = target; bounds = target?.getBoundingClientRect() || null; }
      if (!active || !bounds) return;
      const surface = active;
      const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        surface.style.setProperty('--pointer-x', `${x * 100}%`);
        surface.style.setProperty('--pointer-y', `${y * 100}%`);
        surface.style.setProperty('--tilt-x', `${(0.5 - y) * 16}deg`);
        surface.style.setProperty('--tilt-y', `${(x - 0.5) * 16}deg`);
        surface.setAttribute('data-pointer-active', 'true');
      });
    }
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerleave', reset);
    preference.addEventListener('change', reset);
    window.addEventListener('blur', reset);
    window.addEventListener('scroll', reset, { passive: true });
    return () => {
      reset();
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerleave', reset);
      preference.removeEventListener('change', reset);
      window.removeEventListener('blur', reset);
      window.removeEventListener('scroll', reset);
    };
  }, []);
  return ref;
}

function SkillIcon({ skill }: { skill: HomeSkill }) {
  const Icon = skill.outputType === 'image' || skill.officialTemplateId === 'text-image-v1' ? ImageIcon : skill.outputType === 'text' ? FileText : Layers;
  return <Icon size={19} aria-hidden="true" />;
}

export function HomeShowcase({ skills, discovery, total }: { skills: HomeSkill[]; discovery: HomeSkill[]; total: number }) {
  const { locale, t } = useI18n();
  const cardText = (source: string) => translateSkillCardText(locale, source);
  const [batch, setBatch] = useState(0);
  useHistorySnapshot('loomskillShowcase', batch, setBatch);
  const pool = [...new Map([...skills, ...discovery].map(skill => [skill.id, skill])).values()];
  const batches = Math.max(1, Math.ceil(pool.length / 12));
  const currentBatch = batch % batches;
  const visible = pool.slice(currentBatch * 12, currentBatch * 12 + 12);
  return <section className="public-section home-showcase" id="skill-showcase">
    <div className="public-section-heading">
      <h2>{t('精选工作流')}</h2>
      <div className="home-showcase-actions">
        <button type="button" onClick={() => setBatch(value => value + 1)} disabled={batches === 1} aria-controls="featured-workflows"><RefreshCw key={batch} size={15} aria-hidden="true" />{t('换一批')}</button>
        <Link href="/skills" aria-label={total > 0 ? t('查看全部 {0} 个 Skill', total) : t('查看全部')}>{t('查看全部')}<ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </div>
    <span className="sr-only" role="status">{batch > 0 ? t('已切换第 {0} 批工作流', currentBatch + 1) : ''}</span>
    <div className="home-workflow-batch home-curated-list" id="featured-workflows" key={currentBatch}>
        {visible.map(skill => <article className="home-featured-card" data-home-motion key={skill.id}>
          <span className="home-skill-icon"><SkillIcon skill={skill} /></span>
          <div className="home-featured-content"><h3><Link className="workflow-card-link" href={skillPath(skill.id)} prefetch={false}>{cardText(skill.displayName)}</Link></h3><p>{cardText(skill.description)}</p>
            <div className="home-featured-footer"><SkillPrice skill={skill} /><Link href={skillPath(skill.id)} prefetch={false} aria-label={t('查看详情：{0}', cardText(skill.displayName))}>{t('探索')}<ArrowUpRight size={14} /></Link></div>
          </div><div className="home-featured-save"><FavoriteButton skill={skill} /></div>
        </article>)}
    </div>
  </section>;
}
