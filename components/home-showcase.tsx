'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ArrowRight, ArrowUpRight, FileText, ImageIcon, Layers } from 'lucide-react';
import { useI18n } from './language-provider';
import { skillPath } from '@/lib/skill-links';
import { money } from '@/lib/domain';
import { skillStreamOffset } from '@/lib/home-scroll';
import type { PublicSkill } from '@/lib/public-skills';

export type HomeSkill = Pick<PublicSkill, 'id' | 'displayName' | 'description' | 'officialTemplateId' | 'taskFixedFeeT' | 'currency' | 'outputType'>;

// Pointer updates stay outside React rendering and are disabled for touch/reduced motion.
export function useHomeMotion() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const preference = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let active: HTMLElement | null = null;
    let frame = 0;
    function reset() {
      cancelAnimationFrame(frame);
      if (active) {
        for (const property of ['--pointer-x', '--pointer-y', '--tilt-x', '--tilt-y']) active.style.removeProperty(property);
        active.removeAttribute('data-pointer-active');
      }
      active = null;
    }
    function move(event: PointerEvent) {
      if (!preference.matches || event.pointerType === 'touch') return;
      const target = (event.target as Element).closest<HTMLElement>('[data-home-motion]');
      if (target !== active) { reset(); active = target; }
      if (!active) return;
      const surface = active;
      const bounds = surface.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        surface.style.setProperty('--pointer-x', `${x * 100}%`);
        surface.style.setProperty('--pointer-y', `${y * 100}%`);
        surface.style.setProperty('--tilt-x', `${(0.5 - y) * 5}deg`);
        surface.style.setProperty('--tilt-y', `${(x - 0.5) * 5}deg`);
        surface.setAttribute('data-pointer-active', 'true');
      });
    }
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerleave', reset);
    preference.addEventListener('change', reset);
    window.addEventListener('blur', reset);
    return () => {
      reset();
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerleave', reset);
      preference.removeEventListener('change', reset);
      window.removeEventListener('blur', reset);
    };
  }, []);
  return ref;
}

// Follow normal page scrolling; never capture the wheel or animate while idle.
function useSkillScroll() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const stream = ref.current;
    if (!stream) return;
    const preference = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const tracks = [...stream.querySelectorAll<HTMLElement>('.home-stream-track')];
    let frame = 0;
    const paint = () => {
      frame = 0;
      if (!preference.matches) {
        tracks.forEach(track => track.style.removeProperty('transform'));
        return;
      }
      const bounds = stream.getBoundingClientRect();
      // Position is derived from the page, so reversing the wheel reverses exactly.
      const travel = (window.innerHeight - bounds.top) * 1.15;
      tracks.forEach((track, index) => {
        const cycle = track.firstElementChild?.getBoundingClientRect().height || 0;
        const offset = skillStreamOffset(travel + (index ? 240 : 0), cycle, index ? -1 : 1);
        track.style.transform = `translate3d(0, ${offset}px, 0)`;
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(stream);
    tracks.forEach(track => { if (track.firstElementChild) observer.observe(track.firstElementChild); });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    preference.addEventListener('change', schedule);
    paint();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      preference.removeEventListener('change', schedule);
    };
  }, []);
  return ref;
}

function SkillIcon({ skill }: { skill: HomeSkill }) {
  const Icon = skill.outputType === 'image' || skill.officialTemplateId === 'text-image-v1' ? ImageIcon : skill.outputType === 'text' ? FileText : Layers;
  return <Icon size={19} aria-hidden="true" />;
}

export function HomeShowcase({ skills, discovery, total }: { skills: HomeSkill[]; discovery: HomeSkill[]; total: number }) {
  const { t } = useI18n();
  const streamRef = useSkillScroll();
  const columns = [discovery.filter((_, i) => i % 2 === 0), discovery.filter((_, i) => i % 2 === 1)].filter(column => column.length);
  return <section className="public-section home-showcase">
    <div className="public-section-heading">
      <div><span className="public-eyebrow">START WITH A SKILL</span><h2>{t('从一个具体需求开始')}</h2><p>{t('选择 Skill → 填写任务 → 云端执行 → 得到结果')}</p></div>
      <Link href="/skills">{total > 0 ? t('浏览全部 {0} 个 Skill', total) : t('浏览全部 Skill')}<ArrowRight size={17} /></Link>
    </div>
    <div className="home-skill-layout">
      <div className="home-curated">
        <div className="home-curated-list">{skills.map((skill, index) => <article className="home-featured-card" data-home-motion key={skill.id}>
          <span className="home-skill-icon"><SkillIcon skill={skill} /></span>
          <div className="home-featured-content"><h3><Link href={skillPath(skill.id)} prefetch={false}>{skill.displayName}</Link></h3><p>{skill.description}</p>
            <div className="home-featured-footer"><span>{skill.officialTemplateId ? t('按模型用量计费') : skill.taskFixedFeeT === 0 ? t('无创作者调用费') : skill.taskFixedFeeT != null ? `${money(skill.taskFixedFeeT, skill.currency)} ${t('/ 次 · 模型费另计')}` : t('执行前查看预估费用')}</span><Link href={skillPath(skill.id)} prefetch={false} aria-label={t('查看详情：{0}', skill.displayName)}>{t('探索')}<ArrowUpRight size={14} /></Link></div>
          </div><span className="home-featured-number" aria-hidden="true">0{index + 1}</span>
        </article>)}</div>
      </div>
      <div className="home-discovery">
        <div className="home-skill-stream" ref={streamRef} role="region" aria-label={t('探索更多 Skill')} tabIndex={0}>
          {columns.map((column, index) => <div className="home-stream-column" key={index}><div className="home-stream-track">
            {[0, 1].map(copy => <div className="home-stream-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
              {column.map(skill => <Link className="home-stream-card" key={skill.id} href={skillPath(skill.id)} prefetch={false} tabIndex={copy ? -1 : undefined}>
                <h3>{skill.displayName}</h3><p>{skill.description || t('查看输入要求，开始你的下一批创作。')}</p>
              </Link>)}
            </div>)}
          </div></div>)}
        </div>
      </div>
    </div>
  </section>;
}
