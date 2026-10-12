'use client';
import { useState } from 'react';
import { ArrowRight, LoaderCircle, ShieldCheck } from 'lucide-react';
import Modal from './modal';
import { useI18n } from './language-provider';
import { post, request } from '@/lib/client';

export default function PublicConnectionDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function connect(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !key.trim()) return;
    setBusy(true); setError('');
    try {
      await request('/session', { ...post({ apiKey: key }), signal: AbortSignal.timeout(20000) });
      setKey('');
      window.location.assign('/app');
    } catch (error) {
      setError((error as Error).name === 'TimeoutError' ? t('连接超时，请重试。') : (error as Error).message);
      setBusy(false);
    }
  }
  return <Modal title={t('连接你的工作空间')} onClose={onClose} locked={busy}>
    <form className="public-connection-form" onSubmit={connect}>
      <div className="modal-body">
        <p className="connection-intro">{t('连接胜算云 API Key 后进入工作台。')}</p>
        <label className="field-label">{t('胜算云 API Key')}<input required type="password" autoComplete="off" spellCheck={false} value={key} placeholder={t('输入你的 API Key')} disabled={busy} onChange={event => setKey(event.target.value)} /></label>
        <div className="login-help"><a href="https://www.shengsuanyun.com/?from=Zoey" target="_blank" rel="noopener noreferrer">{t('没有 Key？此链接注册领取 10 元 Token 额度')} ↗</a></div>
        {error && <p className="error" role="alert">{t(error)}</p>}
        <p className="privacy-note"><ShieldCheck size={16} />{t('Key 加密保存在服务器会话中，12 小时后过期；不会写入浏览器本地存储。')}</p>
      </div>
      <div className="modal-foot"><button type="button" className="button" disabled={busy} onClick={onClose}>{t('继续浏览')}</button><button type="submit" className="button primary" disabled={busy || !key.trim()}>{busy ? <LoaderCircle size={17} className="spin" /> : <ArrowRight size={17} />}{t('连接并进入工作台')}</button></div>
    </form>
  </Modal>;
}
