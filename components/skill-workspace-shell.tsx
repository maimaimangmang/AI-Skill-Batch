'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CircleHelp, Menu, X } from 'lucide-react';
import { LanguageSwitcher, useI18n } from './language-provider';
import AccountMenu from './account-menu';

type NavigationProps = React.ComponentProps<typeof AccountMenu> & { activePage?: 'skills' | 'favorites' | 'tasks' };

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
    <a href="/skills" aria-current={activePage === 'skills' ? 'page' : undefined}>{t('探索 Skill')}</a>
    <a href="/favorites" aria-current={activePage === 'favorites' ? 'page' : undefined}>{t('我的收藏')}</a>
    <a href="/tasks" aria-current={activePage === 'tasks' ? 'page' : undefined}>{t('我的任务')}</a>
    <a href="https://www.shengsuanyun.com/zh/loomloom/?from=Zoey" target="_blank" rel="noopener noreferrer">{t('上传 Skill')}<ArrowUpRight size={13} aria-hidden="true" /></a>
    <LanguageSwitcher />
    </div>
  </nav>;
}

export function SkillWorkspaceHeader({ onBack, ...navigation }: NavigationProps & { onBack?: () => void }) {
  const { t } = useI18n();
  return <header className="skill-workspace-header"><div className="skill-workspace-header-inner">
    <div className="skill-workspace-location">
      <a className="skill-workspace-brand" href="/"><img src="/loomdesk-mark.svg" alt="" />LoomSkill</a>
      {onBack && <button type="button" className="skill-workspace-back" disabled={navigation.busy} onClick={onBack}><ArrowLeft size={15} aria-hidden="true" />{t('返回 Skill 列表')}</button>}
    </div>
    <WorkspaceNavigation {...navigation} />
  </div></header>;
}

export function SkillWorkspaceFooter() {
  const { t } = useI18n();

  return <footer className="skill-workspace-footer">
    <div className="skill-workspace-footer-inner">
      <div className="skill-workspace-footer-brand">
        <a className="skill-workspace-brand" href="/"><img src="/loomdesk-mark.svg" alt="" />LoomSkill</a>
        <p>{t('AI批量生成，从一张表开始')}</p>
      </div>
      <nav className="skill-workspace-resources" aria-label={t('使用文档')}>
        <a href="https://lean.shengsuanyun.com/apidocs/loomloom/guide/loomloom-guide" target="_blank" rel="noopener noreferrer"><CircleHelp size={15} aria-hidden="true" />{t('使用文档')}<ArrowUpRight size={13} aria-hidden="true" /></a>
        <a href="https://www.shengsuanyun.com/zh/loomloom/?from=Zoey" target="_blank" rel="noopener noreferrer">{t('上传 Skill')}<ArrowUpRight size={13} aria-hidden="true" /></a>
      </nav>
    </div>
  </footer>;
}
