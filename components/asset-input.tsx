'use client';
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
  field: Field; value: unknown; rowNumber: number; disabled: boolean;
  previews: Record<string, AssetPreview>;
  upload?: AssetUploadStatus; onCancelUpload?: () => void;
  onChange: (value: unknown) => void; onUpload: (file?: File) => void;
  onPaste: (event: React.ClipboardEvent) => void;
};
export default function AssetInput({ field, value, rowNumber, disabled, previews, upload, onCancelUpload, onChange, onUpload, onPaste }: Props) {
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
  const status = upload?.phase === 'preparing' ? '正在读取文件' : upload?.phase === 'processing' ? '正在保存图片 / 附件' : upload?.phase === 'succeeded' ? '上传完成' : upload?.phase === 'failed' ? '上传未完成，请重试' : '正在上传';
  const values = assetValues(value);
  const multiple = field.value_type.endsWith('[]');
  const image = field.accepted_mime_types?.length
    ? field.accepted_mime_types.every(type => type.startsWith('image/'))
    : /图片|图像|白底图|参考图|照片|image/i.test(field.label);
  const noun = image ? '图片' : '附件';
  const update = (next: string[]) => onChange(multiple ? (next.length ? next : '') : (next[0] || ''));
  const full = multiple && !!field.max_values && values.length >= field.max_values;
  return <div className="asset-input">
    {values.length > 0 && <div className="asset-previews">{values.map((ref, index) => {
      const preview = previews[ref];
      const name = preview?.name || (isAssetId(ref) ? `已上传${noun}${multiple ? ` ${index + 1}` : ''}` : ref);
      return <div className="asset-preview" key={`${ref}-${index}`}>
        {preview?.url ? <img src={preview.url} alt={name} /> : <span className="asset-file-icon">{isAssetId(ref) ? <File size={20} /> : <Link2 size={20} />}</span>}
        <span className="asset-filename" title={name}>{name}</span>
        <button type="button" className="asset-remove" aria-label={`第 ${rowNumber} 行移除${noun} ${index + 1}`} disabled={disabled} onClick={() => update(values.filter((_, i) => i !== index))}><X size={12} /></button>
      </div>;
    })}</div>}
    <button type="button" className={`asset-upload${values.length ? ' has-value' : ''}`} disabled={disabled || full} onClick={() => input.current?.click()}>
      {active ? <LoaderCircle className="spin" size={18} /> : image ? <ImagePlus size={18} /> : <Upload size={18} />}<span>{active ? status.replace('图片 / 附件', noun) : values.length ? (multiple ? `继续上传${noun}` : `替换${noun}`) : `上传${noun}`}</span>
      {!values.length && !active && <small>单个文件不超过 10 MB</small>}
    </button>
    {upload && <div className={`asset-transfer ${upload.phase}`} aria-busy={active}>
      <div className="asset-transfer-heading"><span title={upload.name}>{upload.name}</span>{active && <button type="button" onClick={onCancelUpload} aria-label={`取消第 ${rowNumber} 行${field.label}上传`}>取消</button>}</div>
      {upload.phase !== 'failed' && <progress max={100} value={upload.phase === 'succeeded' ? 100 : upload.phase === 'uploading' && upload.percent !== null ? upload.percent : undefined} aria-label={`第 ${rowNumber} 行${field.label}上传进度`} />}
      <div className="asset-transfer-status"><span role="status">{upload.phase === 'succeeded' && <Check size={12} />}{status.replace('图片 / 附件', noun)}</span><span>{upload.phase === 'uploading' && upload.percent !== null ? `${upload.percent}%` : active ? `${elapsed} 秒` : ''}</span></div>
      {upload.phase === 'processing' && <small>文件已传送，保存成功后即可使用。</small>}
      {active && elapsed >= 15 && <small>本次上传较慢，请稍候；也可以取消后重试。</small>}
    </div>}
    <input ref={input} type="file" className="sr-only" disabled={disabled || full} accept={field.accepted_mime_types?.join(',') || (image ? 'image/*' : undefined)} aria-label={`第 ${rowNumber} 行上传${field.label}`} onChange={e => { onUpload(e.target.files?.[0]); e.target.value = ''; }} />
    <button type="button" className="asset-link-toggle" disabled={disabled} aria-expanded={linkOpen} onClick={() => setLinkOpen(open => !open)}><Link2 size={12} />{linkOpen ? '收起链接输入' : `使用${noun}链接`}</button>
    {linkOpen && <div className="asset-link-editor">
      <textarea rows={2} aria-label={`第 ${rowNumber} 行 ${field.label}链接`} disabled={disabled} value={linkDraft} placeholder={multiple ? '粘贴 HTTPS 链接，每行一个' : '粘贴图片或文件的 HTTPS 直链'} onPaste={onPaste} onChange={e => { setLinkDraft(e.target.value); setLinkError(''); }} />
      <button type="button" className="asset-link-apply" disabled={disabled || !linkDraft.trim()} onClick={() => {
        try {
          update(mergeAssetLinks(value, linkDraft, multiple, field.max_values));
          setLinkDraft(''); setLinkError(''); setLinkOpen(false);
        } catch (error) { setLinkError((error as Error).message); }
      }}>{!multiple && values.length ? '替换为此链接' : '添加链接'}</button>
      {linkError && <small className="asset-link-error" role="alert">{linkError}</small>}
      <small>填写可直接访问的{noun}链接，不支持关键词搜索。</small>
    </div>}
  </div>;
}
