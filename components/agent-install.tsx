'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { agentInstallPrompt } from '@/lib/agent-install';
import type { Listing } from '@/lib/types';
import Modal from './modal';

export default function AgentInstall({ listing, demo }: { listing: Listing; demo: boolean }) {
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const prompt = demo ? null : agentInstallPrompt(listing);
  async function copy() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setManual(false);
    } catch {
      setCopied(false);
      setManual(true);
    }
  }
  return <div className="agent-install">
    <button className="button small" disabled={!prompt} onClick={copy}>
      {copied ? <Check size={15} /> : <Copy size={15} />}{copied ? '安装提示词已复制' : '复制安装提示词'}
    </button>
    <span role="status">{demo ? '演示 Skill 不支持安装' : !prompt ? '暂无可用安装链接' : copied ? '粘贴给你的 Agent 即可安装' : '粘贴到 Agent 中安装使用'}</span>
    {manual && <Modal title="复制安装提示词" onClose={() => setManual(false)}>
      <div className="modal-body"><p className="agent-copy-note">浏览器未允许自动复制，请选中下方内容手动复制，再粘贴给你的 Agent。</p>
        <textarea className="agent-prompt" aria-label="安装提示词" readOnly value={prompt || ''} onFocus={event => event.currentTarget.select()} />
        <p className="agent-copy-note">此提示词用于安装 Skill，不会提交工作流任务。</p>
      </div><div className="modal-foot"><button className="button" onClick={() => setManual(false)}>关闭</button><button className="button primary" onClick={copy}><Copy size={15} />重新复制</button></div>
    </Modal>}
  </div>;
}
