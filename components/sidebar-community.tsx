'use client';
import { useState } from 'react';
import { ArrowUpRight, CircleHelp, MessageCircle, Upload } from 'lucide-react';
import { authorQrImage } from '@/lib/community';
import Modal from './modal';

export default function SidebarCommunity() {
  const [open, setOpen] = useState(false);
  return <div className="sidebar-community">
    <section className="author-community" aria-label="作者与交流群">
      {authorQrImage ? <button className="author-qr-button" onClick={() => setOpen(true)} aria-label="放大作者二维码"><img src={authorQrImage} alt="作者联系与 AI 电商交流群二维码" /></button> : <div className="author-qr-placeholder"><MessageCircle size={24} /><span>二维码待添加</span></div>}
      <div className="author-community-copy"><h2>找作者吐槽</h2><p>加入 AI 电商交流群</p>{authorQrImage && <small>点击二维码放大</small>}</div>
    </section>
    <div className="sidebar-resource-links"><a className="creator-link" aria-label="免费上架我的自定义工作流" href="https://www.shengsuanyun.com/zh/loomloom" target="_blank" rel="noopener noreferrer"><Upload size={16} /><span>上架自定义工作流</span><small className="sidebar-free-tag">免费</small><ArrowUpRight size={13} /></a><a className="help-link" href="https://lean.shengsuanyun.com/apidocs/loomloom/guide/loomloom-guide" target="_blank" rel="noopener noreferrer"><CircleHelp size={16} /><span>使用文档</span><ArrowUpRight size={13} /></a></div>
    {open && <Modal title="找作者吐槽 · 加入 AI 电商交流群" onClose={() => setOpen(false)}><div className="author-qr-modal"><img src={authorQrImage} alt="作者联系与 AI 电商交流群二维码" /><p>扫码联系作者，交流 AI 电商批处理经验。</p></div></Modal>}
  </div>;
}
