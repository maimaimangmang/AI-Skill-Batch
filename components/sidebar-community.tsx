'use client';
import { useI18n } from './language-provider';
import { useState } from 'react';
import { ArrowUpRight, CircleHelp, MessageCircle, Upload } from 'lucide-react';
import { authorQrImage } from '@/lib/community';
import Modal from './modal';

export default function SidebarCommunity() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return <div className="sidebar-community">
    <section className="author-community" aria-label={t("作者与交流群")}>
      {authorQrImage ? <button className="author-qr-button" onClick={() => setOpen(true)} aria-label={t("放大作者二维码")}><img src={authorQrImage} alt={t("作者联系与 AI 电商交流群二维码")} /></button> : <div className="author-qr-placeholder"><MessageCircle size={24} /><span>{t("二维码待添加")}</span></div>}
      <div className="author-community-copy"><h2>{t("找作者吐槽")}</h2><p>{t("加入 AI 电商交流群")}</p>{authorQrImage && <small>{t("点击二维码放大")}</small>}</div>
    </section>

    {open && <Modal title={t("找作者吐槽 · 加入 AI 电商交流群")} onClose={() => setOpen(false)}><div className="author-qr-modal"><img src={authorQrImage} alt={t("作者联系与 AI 电商交流群二维码")} /><p>{t("扫码联系作者，交流 AI 电商批处理经验。")}</p></div></Modal>}
  </div>;
}

export function SidebarResources() {
  const { t } = useI18n();
  return <div className="sidebar-resource-links"><a className="creator-link" aria-label={t("免费上架我的自定义工作流")} href="https://www.shengsuanyun.com/zh/loomloom" target="_blank" rel="noopener noreferrer"><Upload size={16} /><span>{t("上架自定义工作流")}</span><small className="sidebar-free-tag">{t("免费")}</small><ArrowUpRight size={13} /></a><a className="help-link" href="https://lean.shengsuanyun.com/apidocs/loomloom/guide/loomloom-guide" target="_blank" rel="noopener noreferrer"><CircleHelp size={16} /><span>{t("使用文档")}</span><ArrowUpRight size={13} /></a></div>;
}

export function HomeCommunity() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return <section className="home-community" aria-labelledby="home-community-title">
    <div className="home-community-copy"><span className="public-eyebrow">LET’S TALK</span><h2 id="home-community-title">{t('联系作者')}</h2><p>{t('遇到问题、有想用的 Skill，或者想交流 AI 电商经验，都可以来聊聊。')}</p><span>{t('扫码联系作者，加入 AI 电商交流群')}</span></div>
    <button type="button" className="home-community-qr" onClick={() => setOpen(true)} aria-label={t('放大作者二维码')}><img src={authorQrImage} alt={t('作者联系与 AI 电商交流群二维码')} width={144} height={144} /><span>{t('点击二维码放大')}</span></button>
    {open && <Modal title={t('联系作者')} onClose={() => setOpen(false)}><div className="author-qr-modal"><img src={authorQrImage} alt={t('作者联系与 AI 电商交流群二维码')} /><p>{t('扫码联系作者，交流 AI 电商批处理经验。')}</p></div></Modal>}
  </section>;
}
