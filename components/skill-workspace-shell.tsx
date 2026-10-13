'use client';

import { ArrowLeft, ArrowUpRight, CircleHelp } from 'lucide-react';
import { LanguageSwitcher, useI18n } from './language-provider';
import SidebarCommunity from './sidebar-community';
import AccountMenu from './account-menu';

type NavigationProps = React.ComponentProps<typeof AccountMenu> & { activePage?: 'skills' | 'favorites' | 'tasks' };

export function WorkspaceNavigation({ activePage, ...account }: NavigationProps) {
  const { t } = useI18n();
  return <nav className="skill-workspace-nav" aria-label={t('网站导航')}>
    <a href="/skills" aria-current={activePage === 'skills' ? 'page' : undefined}>{t('探索 Skill')}</a>
    <a href="/favorites" aria-current={activePage === 'favorites' ? 'page' : undefined}>{t('我的收藏')}</a>
    <a href="/tasks" aria-current={activePage === 'tasks' ? 'page' : undefined}>{t('我的任务')}</a>
    <a href="https://www.shengsuanyun.com/zh/loomloom/?from=Zoey" target="_blank" rel="noopener noreferrer">{t('上传 Skill')}<ArrowUpRight size={13} aria-hidden="true" /></a>
    <LanguageSwitcher />
    <AccountMenu {...account} />
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
      <SidebarCommunity />
    </div>
  </footer>;
}
