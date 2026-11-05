'use client';
import Link, { LocalizedAnchor } from './localized-link';

import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CircleHelp, Menu, X } from 'lucide-react';
import { LanguageSwitcher, useI18n } from './language-provider';
import AccountMenu from './account-menu';
import BackLink from './back-link';

type NavigationProps = React.ComponentProps<typeof AccountMenu> & { activePage?: 'skills' | 'cases' | 'favorites' | 'tasks' };

export function WorkspaceNavigation({ activePage, ...account }: NavigationProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !toggle.current?.contains(target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); }
    };
    const desktop = window.matchMedia('(min-width: 1051px)');
    const resize = () => { if (desktop.matches) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    desktop.addEventListener('change', resize);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      desktop.removeEventListener('change', resize);
    };
  }, [open]);
  return <nav className="skill-workspace-nav" aria-label={t('网站导航')} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
  }}>
    <AccountMenu {...account} />
    <button ref={toggle} type="button" className="workspace-menu-toggle" aria-label={t(open ? '关闭导航菜单' : '打开导航菜单')} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
    </button>
    <div ref={panel} id={id} className={`workspace-nav-links${open ? ' is-open' : ''}`} onClick={event => {
      if ((event.target as HTMLElement).closest('a')) setOpen(false);
    }}>
    <div className="workspace-nav-primary">
    <LocalizedAnchor href="/skills" aria-current={activePage === 'skills' ? 'page' : undefined}>{t('探索 Skill')}</LocalizedAnchor>
    <LocalizedAnchor href="/cases" aria-current={activePage === 'cases' ? 'page' : undefined}>{t('案例库')}</LocalizedAnchor>
    <LocalizedAnchor href="/favorites" aria-current={activePage === 'favorites' ? 'page' : undefined}>{t('我的收藏')}</LocalizedAnchor>
    <LocalizedAnchor href="/tasks" aria-current={activePage === 'tasks' ? 'page' : undefined}>{t('我的任务')}</LocalizedAnchor>
    <LocalizedAnchor href="https://www.shengsuanyun.com/zh/loomloom/?from=Zoey" target="_blank" rel="noopener noreferrer">{t('上传 Skill')}<ArrowUpRight size={13} aria-hidden="true" /></LocalizedAnchor>
    </div>
    <LanguageSwitcher />
    </div>
  </nav>;
}

export function SiteHeader({ showHomeBack = false, ...navigation }: NavigationProps & { showHomeBack?: boolean }) {
  const { t } = useI18n();
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const update = () => setCompact(window.scrollY > 64);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return <header className={`public-header public-resizable-header${compact ? ' is-compact' : ''}${showHomeBack ? ' has-home-back' : ''}`}>
    {showHomeBack && <BackLink className="public-home-back" aria-label={t('返回上一页')} title={t('返回上一页')}><ArrowLeft size={18} aria-hidden="true" /><span>{t('返回上一页')}</span></BackLink>}
    <Link className="public-brand" href="/"><img src="/loomdesk-mark.svg" alt="" />LoomSkill</Link>
    <WorkspaceNavigation {...navigation} />
  </header>;
}

export function SkillWorkspaceFooter() {
  const { t } = useI18n();

  return <footer className="skill-workspace-footer">
    <div className="skill-workspace-footer-inner">
      <div className="skill-workspace-footer-brand">
        <LocalizedAnchor className="skill-workspace-brand" href="/"><img src="/loomdesk-mark.svg" alt="" />LoomSkill</LocalizedAnchor>
        <p>{t('AI批量生成，从一张表开始')}</p>
      </div>
      <nav className="skill-workspace-resources" aria-label={t('使用文档')}>
        <LocalizedAnchor href="https://lean.shengsuanyun.com/apidocs/loomloom/guide/loomloom-guide" target="_blank" rel="noopener noreferrer"><CircleHelp size={15} aria-hidden="true" />{t('使用文档')}<ArrowUpRight size={13} aria-hidden="true" /></LocalizedAnchor>
        <LocalizedAnchor href="https://www.shengsuanyun.com/zh/loomloom/?from=Zoey" target="_blank" rel="noopener noreferrer">{t('上传 Skill')}<ArrowUpRight size={13} aria-hidden="true" /></LocalizedAnchor>
      </nav>
    </div>
  </footer>;
}
