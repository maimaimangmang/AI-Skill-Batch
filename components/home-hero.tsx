'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, Table2, Sparkles } from 'lucide-react';
import Link from './localized-link';
import { PlushMascot } from './plush-hero';
import { useI18n } from './language-provider';
import HeroWarpTitle from './hero-warp-title';

// A small, local canvas swarm. It sleeps when idle and never handles touch input.
function HeroSwarm() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const root = canvas?.parentElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !root || !context) return;
    const preference = window.matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const particles = Array.from({ length: 48 }, (_, i) => ({ x: 0, y: 0, vx: 0, vy: 0, phase: i * 2.4, radius: 1 + (i % 4) * .45 }));
    let bounds = root.getBoundingClientRect();
    let x = 0, y = 0, frame = 0, until = 0, previous = 0, initialized = false;
    let obstacle: { left: number; right: number; top: number; bottom: number } | null = null;
    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      initialized = false;
      context!.clearRect(0, 0, bounds.width, bounds.height);
      root!.removeAttribute('data-swarm-active');
    }
    function resize() {
      stop();
      bounds = root!.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas!.width = Math.round(bounds.width * ratio);
      canvas!.height = Math.round(bounds.height * ratio);
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    function paint(now: number) {
      frame = 0;
      if (now > until || !preference.matches || document.hidden) { stop(); return; }
      const dt = Math.min((now - previous) / 16.67 || 1, 2);
      previous = now;
      context!.clearRect(0, 0, bounds.width, bounds.height);
      context!.globalAlpha = Math.min(1, (until - now) / 300);
      particles.forEach((particle, i) => {
        const oldX = particle.x, oldY = particle.y;
        const angle = particle.phase + now * .0014;
        const radius = 9 + (i % 8) * 5;
        let targetX = x + Math.cos(angle) * radius;
        let targetY = y + Math.sin(angle) * radius * .65;
        if (obstacle && targetX > obstacle.left && targetX < obstacle.right && targetY > obstacle.top && targetY < obstacle.bottom) {
          const distances = [targetX - obstacle.left, obstacle.right - targetX, targetY - obstacle.top, obstacle.bottom - targetY];
          const edge = distances.indexOf(Math.min(...distances));
          if (edge === 0) targetX = obstacle.left;
          else if (edge === 1) targetX = obstacle.right;
          else if (edge === 2) targetY = obstacle.top;
          else targetY = obstacle.bottom;
        }
        particle.vx = (particle.vx + (targetX - particle.x) * .025 * dt) * Math.pow(.83, dt);
        particle.vy = (particle.vy + (targetY - particle.y) * .025 * dt) * Math.pow(.83, dt);
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        context!.strokeStyle = i % 3 ? '#79c8b299' : '#7158d966';
        context!.lineWidth = particle.radius;
        context!.lineCap = 'round';
        context!.beginPath();
        context!.moveTo(oldX, oldY);
        context!.lineTo(particle.x, particle.y);
        context!.stroke();
      });
      frame = requestAnimationFrame(paint);
    }
    function move(event: PointerEvent) {
      if (!preference.matches || event.pointerType === 'touch') return;
      bounds = root!.getBoundingClientRect();
      x = event.clientX - bounds.left;
      y = event.clientY - bounds.top;
      const control = (event.target as Element).closest('a, button')?.getBoundingClientRect();
      obstacle = control ? { left: control.left - bounds.left - 8, right: control.right - bounds.left + 8, top: control.top - bounds.top - 8, bottom: control.bottom - bounds.top + 8 } : null;
      if (!initialized) {
        particles.forEach(particle => { particle.x = x + Math.cos(particle.phase) * 20; particle.y = y + Math.sin(particle.phase) * 20; particle.vx = particle.vy = 0; });
        initialized = true;
      }
      until = performance.now() + 900;
      root!.setAttribute('data-swarm-active', 'true');
      if (!frame) { previous = performance.now(); frame = requestAnimationFrame(paint); }
    }
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    root.addEventListener('pointermove', move, { passive: true });
    root.addEventListener('pointerleave', stop);
    window.addEventListener('scroll', stop, { passive: true });
    document.addEventListener('visibilitychange', stop);
    preference.addEventListener('change', stop);
    resize();
    return () => {
      stop();
      observer.disconnect();
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerleave', stop);
      window.removeEventListener('scroll', stop);
      document.removeEventListener('visibilitychange', stop);
      preference.removeEventListener('change', stop);
    };
  }, []);
  return <canvas ref={ref} className="hero-swarm" aria-hidden="true" />;
}

export function HomeHero() {
  const { t } = useI18n();
  return <section className="public-hero hero-hub">
    <HeroSwarm />
    <div className="public-hero-copy">
      <HeroWarpTitle lead={t('发现 AI Skills，')} accent={t('批量完成重复任务')} />
      <div className="public-actions">
        <Link className="public-button primary star-border" href="/skills">{t('探索 Skill')}<ArrowUpRight size={18} /></Link>
        <Link className="public-button star-border" href="/cases">{t('查看创作案例')}<ArrowRight size={17} /></Link>
      </div>
    </div>
    <div className="hero-workflow" id="hero-example">
      <svg className="hero-connections" viewBox="0 0 1100 360" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path d="M280 180H390C450 180 460 90 550 90" />
        <path d="M550 90C640 90 650 180 710 180H820" />
        <path className="hero-beam" d="M280 180H390C450 180 460 90 550 90C640 90 650 180 710 180H820" />
        <circle cx="280" cy="180" r="4" /><circle cx="820" cy="180" r="4" />
      </svg>
      <div className="hero-input-panel" data-home-motion>
        <div className="hero-panel-heading"><span><Table2 size={18} />{t('填写任务表')}</span><small>Excel / CSV</small></div>
        <div className="hero-table-wrap"><table className="hero-table" aria-label={t('输入示例')}>
          <thead><tr><th>#</th><th>{t('参考图')}</th><th>{t('产品原图')}</th><th>{t('画面要求')}</th></tr></thead>
          <tbody>{[1, 2, 3].map(row => <tr key={row}><th scope="row">{row.toString().padStart(2, '0')}</th>
            <td>{row === 1 ? <Image src="/examples/ecommerce-image-remix/reference.png" width={40} height={40} alt={t('参考图')} /> : <span className="hero-empty-cell" />}</td>
            <td>{row === 1 ? <Image src="/examples/ecommerce-image-remix/product.jpeg" width={40} height={40} alt={t('产品原图')} /> : <span className="hero-empty-cell" />}</td>
            <td>{row === 1 ? t('暖光床头场景') : <span className="hero-empty-line" />}</td>
          </tr>)}</tbody>
        </table></div>
        <p className="hero-input-note"><span />{t('每行对应一项任务')}</p>
      </div>
      <div className="hero-skill-hub">
        <div className="hero-hub-core"><img src="/loomdesk-mark.svg" width={62} height={62} alt="" /></div>
        <span>{t('云端运行 Skill')}</span>
      </div>
      <div className="public-hero-preview" data-home-motion>
        <PlushMascot />
        <div className="preview-label"><Sparkles size={14} /><span>{t('电商图复刻 · 作者真实试跑')}</span></div>
        <div className="preview-result"><Image src="/examples/ecommerce-image-remix/hero-result.webp" width={900} height={1200} alt={t('AI 生成案例：暖光床头场景中的陶瓷杯')} loading="eager" unoptimized /></div>
        <Link className="hero-result-caption" href="/skills/ecommerce-image-remix"><span>{t('一行输入，一张商品图')}</span><ArrowUpRight size={17} /></Link>
      </div>
    </div>
  </section>;
}
