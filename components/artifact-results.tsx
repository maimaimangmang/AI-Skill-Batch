'use client';
import { LocalizedAnchor } from './localized-link';
import { useI18n } from './language-provider';
import { useState } from 'react';
import { Download, ExternalLink, LoaderCircle, ZoomIn, ZoomOut } from 'lucide-react';
import type { Artifact } from '@/lib/types';
import { safeUrl } from '@/lib/domain';
import { titledArtifacts } from '@/lib/artifacts';
import { saveBlob } from '@/lib/client';
import Modal from './modal';

export default function ArtifactResults({ artifacts, stepLabels, visibleCount }: { artifacts: Artifact[]; stepLabels: Map<string, string>; visibleCount?: number }) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<{ url: string; title: string; actualSize: boolean; failed: boolean } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  function viewImage(url: string, title: string) { setDownloadError(''); setPreview({ url, title, actualSize: false, failed: false }); }
  async function downloadOriginal() {
    if (!preview || downloading) return;
    setDownloading(true); setDownloadError('');
    try {
      const response = await fetch(`/api/artifacts/download?url=${encodeURIComponent(preview.url)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Download failed');
      const filename = decodeURIComponent(new URL(preview.url).pathname).split('/').pop() || preview.title;
      saveBlob(await response.blob(), filename);
    } catch { setDownloadError(t('下载失败，请关闭预览后刷新任务结果再试。')); }
    finally { setDownloading(false); }
  }
  if (!artifacts.length) return null;
  const items = titledArtifacts(artifacts, stepLabels);
  const images = items.filter(item => item.kind.key === 'image').length;
  return <div className="artifact-results">
    <p className="artifact-summary">{t("已生成 ")}{artifacts.length} {t(" 项结果")}{images > 0 && t(" · {0} 张图片", images)}</p>
    <div className="artifact-grid">{items.slice(0, visibleCount).map(({ artifact, kind, title }, index) => {
      const url = safeUrl(artifact.accessUrl);
      const longText = (artifact.inlineText?.length || 0) > 280;
      return <article className={`artifact-card artifact-${kind.key}`} key={`${artifact.artifactId || index}-${index}`}>
        <header className="artifact-heading"><h3>{title}</h3><span>{t(kind.label)}</span></header>
        {url && kind.key === 'image' && <button type="button" className="artifact-image-link" onClick={() => viewImage(url, title)} aria-haspopup="dialog" aria-label={t("查看原图：{0}", title)}><img src={url} alt={title} loading="lazy" /></button>}
        {url && kind.key === 'video' && <video aria-label={title} controls preload="none" src={url} />}
        {url && kind.key === 'audio' && <audio aria-label={title} controls preload="none" src={url} />}
        {artifact.inlineText && (longText ? <div className="artifact-long-text"><p className="artifact-text-preview">{artifact.inlineText.slice(0, 180)}…</p><details className="artifact-text"><summary>{t("展开全文（")}{artifact.inlineText.length} {t(" 字符）")}</summary><pre>{artifact.inlineText}</pre></details></div> : <pre>{artifact.inlineText}</pre>)}
        {url && (kind.key === 'image' ? <button type="button" className="text-button artifact-open" onClick={() => viewImage(url, title)} aria-haspopup="dialog" aria-label={t("查看原图：{0}", title)}>{t(kind.action)}<ZoomIn size={13} /></button> : <LocalizedAnchor className="text-button artifact-open" href={url} target="_blank" rel="noopener noreferrer" aria-label={`${t(kind.action)}：${title}`}>{t(kind.action)}<ExternalLink size={13} /></LocalizedAnchor>)}
        {!url && !artifact.inlineText && <p className="muted">{t("暂时无法预览，请刷新结果或下载结果表格。")}</p>}
      </article>;
    })}</div>
    {preview && <Modal title={`${t('查看原图')} · ${preview.title}`} wide onClose={() => setPreview(null)}>
      {preview.failed ? <p className="modal-body error" role="alert">{t('无法加载原图，请关闭预览后刷新任务结果，重新获取图片链接。')}</p> : <>
        <div className={`artifact-image-viewer${preview.actualSize ? ' is-actual-size' : ''}`}><img src={preview.url} alt={preview.title} onError={() => setPreview(current => current && { ...current, failed: true })} /></div>
        {downloadError && <p className="modal-body error" role="alert">{downloadError}</p>}
        <div className="modal-foot"><button type="button" className="button small" aria-pressed={preview.actualSize} onClick={() => setPreview(current => current && { ...current, actualSize: !current.actualSize })}>{preview.actualSize ? <ZoomOut size={16} /> : <ZoomIn size={16} />}{t(preview.actualSize ? '适应窗口' : '实际大小')}</button><button type="button" className="button small primary" disabled={downloading} onClick={downloadOriginal}>{downloading ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />}{t(downloading ? '正在下载…' : '下载原图')}</button></div>
      </>}
    </Modal>}
  </div>;
}
