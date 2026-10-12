'use client';
import { useI18n } from './language-provider';
import { useEffect, useRef, useState } from 'react';
import { Check, File, ImagePlus, Link2, LoaderCircle, Upload, X } from 'lucide-react';
import type { Field } from '@/lib/types';
import { assetValues, isAssetId, mergeAssetLinks } from '@/lib/asset-input';

export type AssetPreview = { name: string; url?: string };
export type AssetUploadStatus = {
  name: string; startedAt: number;
  phase: 'preparing' | 'uploading' | 'processing' | 'succeeded' | 'failed';
  percent: number | null;
};
type Props = {
  localDraft?: boolean; field: Field; value: unknown; rowNumber: number; disabled: boolean;
  previews: Record<string, AssetPreview>;
  upload?: AssetUploadStatus; onCancelUpload?: () => void;
  onChange: (value: unknown) => void; onUpload: (file?: File) => void;
  onPaste: (event: React.ClipboardEvent) => void;
};
export default function AssetInput({ localDraft = false, field, value, rowNumber, disabled, previews, upload, onCancelUpload, onChange, onUpload, onPaste }: Props) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [linkError, setLinkError] = useState('');
  const active = !!upload && !['succeeded', 'failed'].includes(upload.phase);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active || !upload) return;
    const tick = () => setElapsed(Math.floor((Date.now() - upload.startedAt) / 1000));
    tick(); const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [active, upload?.startedAt]);
  const status = upload?.phase === 'preparing' ? t("正在读取文件") : upload?.phase === 'processing' ? t("正在保存图片 / 附件") : upload?.phase === 'succeeded' ? (localDraft ? t("已选择，连接后上传") : t("上传完成")) : upload?.phase === 'failed' ? t("上传未完成，请重试") : t("正在上传");
  const values = assetValues(value);
  const multiple = field.value_type.endsWith('[]');
  const image = field.accepted_mime_types?.length
    ? field.accepted_mime_types.every(type => type.startsWith('image/'))
    : /图片|图像|白底图|参考图|照片|image/i.test(field.label);
  const noun = image ? t("图片") : t("附件");
  const update = (next: string[]) => onChange(multiple ? (next.length ? next : '') : (next[0] || ''));
  const full = multiple && !!field.max_values && values.length >= field.max_values;
  return <div className="asset-input">
    {values.length > 0 && <div className="asset-previews">{values.map((ref, index) => {
      const preview = previews[ref];
      const name = preview?.name || (isAssetId(ref) ? t("已上传{0}{1}", noun, multiple ? ` ${index + 1}` : '') : ref);
      return <div className="asset-preview" key={`${ref}-${index}`}>
        {preview?.url ? <img src={preview.url} alt={name} /> : <span className="asset-file-icon">{isAssetId(ref) ? <File size={20} /> : <Link2 size={20} />}</span>}
        <span className="asset-filename" title={name}>{name}</span>
        <button type="button" className="asset-remove" aria-label={t("第 {0} 行移除{1} {2}", rowNumber, noun, index + 1)} disabled={disabled} onClick={() => update(values.filter((_, i) => i !== index))}><X size={12} /></button>
      </div>;
    })}</div>}
    <button type="button" className={`asset-upload${values.length ? ' has-value' : ''}`} disabled={disabled || full} onClick={() => input.current?.click()}>
      {active ? <LoaderCircle className="spin" size={18} /> : image ? <ImagePlus size={18} /> : <Upload size={18} />}<span>{active ? status.replace(t("图片 / 附件"), noun) : values.length ? (multiple ? (localDraft ? t("继续选择{0}", noun) : t("继续上传{0}", noun)) : t("替换{0}", noun)) : (localDraft ? t("选择{0}", noun) : t("上传{0}", noun))}</span>
      {!values.length && !active && <small>{t("单个文件不超过 10 MB")}</small>}
    </button>
    {upload && <div className={`asset-transfer ${upload.phase}`} aria-busy={active}>
      <div className="asset-transfer-heading"><span title={upload.name}>{upload.name}</span>{active && <button type="button" onClick={onCancelUpload} aria-label={t("取消第 {0} 行{1}上传", rowNumber, field.label)}>{t("取消")}</button>}</div>
      {upload.phase !== 'failed' && <progress max={100} value={upload.phase === 'succeeded' ? 100 : upload.phase === 'uploading' && upload.percent !== null ? upload.percent : undefined} aria-label={t("第 {0} 行{1}上传进度", rowNumber, field.label)} />}
      <div className="asset-transfer-status"><span role="status">{upload.phase === 'succeeded' && <Check size={12} />}{status.replace(t("图片 / 附件"), noun)}</span><span>{upload.phase === 'uploading' && upload.percent !== null ? `${upload.percent}%` : active ? t("{0} 秒", elapsed) : ''}</span></div>
      {upload.phase === 'processing' && <small>{t("文件已传送，保存成功后即可使用。")}</small>}
      {active && elapsed >= 15 && <small>{t("本次上传较慢，请稍候；也可以取消后重试。")}</small>}
    </div>}
    <input ref={input} type="file" className="sr-only" disabled={disabled || full} accept={field.accepted_mime_types?.join(',') || (image ? 'image/*' : undefined)} aria-label={t("第 {0} 行上传{1}", rowNumber, field.label)} onChange={e => { onUpload(e.target.files?.[0]); e.target.value = ''; }} />
    <button type="button" className="asset-link-toggle" disabled={disabled} aria-expanded={linkOpen} onClick={() => setLinkOpen(open => !open)}><Link2 size={12} />{linkOpen ? t("收起链接输入") : t("使用{0}链接", noun)}</button>
    {linkOpen && <div className="asset-link-editor">
      <textarea rows={2} aria-label={t("第 {0} 行 {1}链接", rowNumber, field.label)} disabled={disabled} value={linkDraft} placeholder={multiple ? t("粘贴 HTTPS 链接，每行一个") : t("粘贴图片或文件的 HTTPS 直链")} onPaste={onPaste} onChange={e => { setLinkDraft(e.target.value); setLinkError(''); }} />
      <button type="button" className="asset-link-apply" disabled={disabled || !linkDraft.trim()} onClick={() => {
        try {
          update(mergeAssetLinks(value, linkDraft, multiple, field.max_values));
          setLinkDraft(''); setLinkError(''); setLinkOpen(false);
        } catch (error) { setLinkError((error as Error).message); }
      }}>{!multiple && values.length ? t("替换为此链接") : t("添加链接")}</button>
      {linkError && <small className="asset-link-error" role="alert">{t(linkError)}</small>}
      <small>{t("填写可直接访问的")}{noun}{t("链接，不支持关键词搜索。")}</small>
    </div>}
  </div>;
}
