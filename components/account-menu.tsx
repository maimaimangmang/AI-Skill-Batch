'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, KeyRound, LoaderCircle, LogOut, RefreshCw, UserRound } from 'lucide-react';
import { request, RequestError, type ApiRequestOptions } from '@/lib/client';
import type { Balance } from '@/lib/types';
import { money } from '@/lib/domain';
import { taskConnectionPath } from '@/lib/skill-links';
import { useI18n } from './language-provider';
import PublicConnectionDialog from './public-connection-dialog';

type Props = {
  connected?: boolean;
  ready?: boolean;
  busy?: boolean;
  onConnect?: () => void;
  api?: (path: string, options?: ApiRequestOptions) => Promise<any>;
};

export default function AccountMenu({ connected, ready = true, busy = false, onConnect, api = request }: Props) {
  const { t } = useI18n();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState({ ready: false, connected: false });
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const controlled = connected !== undefined;
  const isConnected = controlled ? connected : session.connected;
  const isReady = controlled ? ready : session.ready;

  useEffect(() => {
    if (controlled) return;
    let controller: AbortController;
    const check = () => {
      controller?.abort(); controller = new AbortController();
      const { signal } = controller;
      setBalance(null);
      request('/session', { signal }).then(value => {
        if (!signal.aborted) setSession({ ready: true, connected: value.connected });
      }).catch(() => { if (!signal.aborted) setSession({ ready: true, connected: false }); });
    };
    const storage = (event: StorageEvent) => { if (event.key === 'loomskill-session-change') check(); };
    check();
    window.addEventListener('loomskill-session-change', check);
    window.addEventListener('storage', storage);
    window.addEventListener('focus', check);
    return () => { controller.abort(); window.removeEventListener('loomskill-session-change', check); window.removeEventListener('storage', storage); window.removeEventListener('focus', check); };
  }, [controlled]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('account') !== 'settings' || !isReady || !isConnected) return;
    setOpen(true); setSettings(true);
    url.searchParams.delete('account');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, [isReady, isConnected]);

  useEffect(() => {
    if (!open || !isConnected) { setBalance(null); return; }
    const controller = new AbortController();
    setBalance(null); setLoading(true); setError('');
    api('/balance', { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) setBalance(value);
    }).catch(e => {
      if (controller.signal.aborted) return;
      if (!controlled && e instanceof RequestError && e.status === 401) setSession({ ready: true, connected: false });
      setError(e.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, isConnected, api, controlled, refresh, session]);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const outside = (event: PointerEvent) => { if (!ending && !root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !ending) { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open, ending]);

  async function disconnect(reconnect: boolean) {
    if (ending || busy) return;
    setEnding(true); setError('');
    try {
      await request('/session', { method: 'DELETE' });
      // A full navigation discards the previous account's loaded task data and files.
      window.location.assign(reconnect ? taskConnectionPath('/tasks') : '/');
    } catch (e) { setError((e as Error).message); setEnding(false); }
  }
  function connect() {
    setOpen(false);
    if (onConnect) onConnect(); else setConnectionOpen(true);
  }

  return <div className="account-menu" ref={root} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node) && !ending) setOpen(false);
  }}>
    {isConnected ? <button ref={trigger} type="button" className={`account-trigger${open ? ' is-open' : ''}`} disabled={busy || ending} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <UserRound size={16} aria-hidden="true" />{t('账户')}<ChevronDown size={14} aria-hidden="true" />
    </button> : <button type="button" className="account-trigger" disabled={!isReady || busy || ending} onClick={connect}>
      {!isReady ? <LoaderCircle size={15} className="spin" /> : <KeyRound size={15} />}{t('连接 API Key')}
    </button>}
    {open && isConnected && <div ref={panel} id={id} className="account-panel" role="dialog" aria-label={t('账户')} tabIndex={-1}>
      <div className="account-panel-heading"><strong>{t('账户')}</strong><span><i />{t('API Key 已连接')}</span></div>
      <div className="account-panel-balance"><span>{t('可用余额')}</span><strong>{loading ? t('读取中…') : balance ? t(money(balance.availableBalanceT, balance.currency)) : '—'}</strong><small>{t('费用由')}<a href="https://www.shengsuanyun.com/?from=Zoey" target="_blank" rel="noopener noreferrer">{t('胜算云')}</a>{t('直接结算')}</small></div>
      {error && <div className="account-panel-error" role="alert"><p>{t(error)}</p>{!ending && <button type="button" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={13} />{t('重新读取余额')}</button>}</div>}
      <details className="account-settings" open={settings} onToggle={event => setSettings(event.currentTarget.open)}><summary>{t('连接设置')}</summary><dl><div><dt>{t('接入方式')}</dt><dd>{t('个人 API Key')}</dd></div><div><dt>{t('会话有效期')}</dt><dd>{t('12 小时')}</dd></div></dl><p>{t('Key 加密保存在服务器会话中，12 小时后过期；不会写入浏览器本地存储。')}</p></details>
      <div className="account-panel-actions"><button type="button" disabled={busy || ending} onClick={() => void disconnect(true)}><KeyRound size={15} />{t('更换 API Key')}</button><button type="button" disabled={busy || ending} onClick={() => void disconnect(false)}>{ending ? <LoaderCircle size={15} className="spin" /> : <LogOut size={15} />}{t('退出连接')}</button></div>
    </div>}
    {connectionOpen && <PublicConnectionDialog intro="连接后可查看余额，并管理你的任务与收藏。" submitLabel="连接并继续" onClose={() => setConnectionOpen(false)} onConnected={() => { setConnectionOpen(false); setOpen(true); }} />}
  </div>;
}
