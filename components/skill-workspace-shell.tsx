'use client';

import { ArrowLeft, ArrowUpRight, CircleHelp, KeyRound, LoaderCircle } from 'lucide-react';
import { LanguageSwitcher, useI18n } from './language-provider';
import SidebarCommunity from './sidebar-community';

type SkillWorkspaceHeaderProps = {
  connected: boolean;
  ready: boolean;
  busy: boolean;
  onConnect: () => void;
  onBack: () => void;
};

export function SkillWorkspaceHeader({ connected, ready, busy, onConnect, onBack }: SkillWorkspaceHeaderProps) {
  const { t } = useI18n();

  return <header className="skill-workspace-header">
    <div className="skill-workspace-header-inner">
      <div className="skill-workspace-location">
        <a className="skill-workspace-brand" href="/"><img src="/loomdesk-mark.svg" alt="" />LoomSkill</a>
        <button type="button" className="skill-workspace-back" disabled={busy} onClick={onBack}>
          <ArrowLeft size={15} aria-hidden="true" />{t('返回 Skill 列表')}
        </button>
      </div>
      <nav className="skill-workspace-nav" aria-label={t('网站导航')}>
        <a href="/favorites">{t('我的收藏')}</a>
        <a href="/tasks">{t('我的任务')}</a>
        <LanguageSwitcher />
        {connected ? <a className="skill-workspace-connection is-connected" href="/settings">
          <span className="skill-workspace-connection-dot" aria-hidden="true" />{t('API Key 已连接')}
        </a> : <button type="button" className="skill-workspace-connection" disabled={!ready || busy} aria-busy={!ready} onClick={onConnect}>
          {ready ? <KeyRound size={14} aria-hidden="true" /> : <LoaderCircle className="spin" size={14} aria-hidden="true" />}{t('连接 API Key')}
        </button>}
      </nav>
    </div>
  </header>;
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
