import { ExternalLink } from 'lucide-react';
import type { Artifact } from '@/lib/types';
import { safeUrl } from '@/lib/domain';
import { titledArtifacts } from '@/lib/artifacts';

export default function ArtifactResults({ artifacts, stepLabels, visibleCount }: { artifacts: Artifact[]; stepLabels: Map<string, string>; visibleCount?: number }) {
  if (!artifacts.length) return null;
  const items = titledArtifacts(artifacts, stepLabels);
  const images = items.filter(item => item.kind.key === 'image').length;
  return <div className="artifact-results">
    <p className="artifact-summary">已生成 {artifacts.length} 项结果{images > 0 && ` · ${images} 张图片`}</p>
    <div className="artifact-grid">{items.slice(0, visibleCount).map(({ artifact, kind, title }, index) => {
      const url = safeUrl(artifact.accessUrl);
      const longText = (artifact.inlineText?.length || 0) > 280;
      return <article className={`artifact-card artifact-${kind.key}`} key={`${artifact.artifactId || index}-${index}`}>
        <header className="artifact-heading"><h3>{title}</h3><span>{kind.label}</span></header>
        {url && kind.key === 'image' && <a className="artifact-image-link" href={url} target="_blank" rel="noopener noreferrer" aria-label={`查看原图：${title}`}><img src={url} alt={title} loading="lazy" /></a>}
        {url && kind.key === 'video' && <video aria-label={title} controls preload="none" src={url} />}
        {url && kind.key === 'audio' && <audio aria-label={title} controls preload="none" src={url} />}
        {artifact.inlineText && (longText ? <div className="artifact-long-text"><p className="artifact-text-preview">{artifact.inlineText.slice(0, 180)}…</p><details className="artifact-text"><summary>展开全文（{artifact.inlineText.length} 字符）</summary><pre>{artifact.inlineText}</pre></details></div> : <pre>{artifact.inlineText}</pre>)}
        {url && <a className="text-button artifact-open" href={url} target="_blank" rel="noopener noreferrer" aria-label={`${kind.action}：${title}`}>{kind.action}<ExternalLink size={13} /></a>}
        {!url && !artifact.inlineText && <p className="muted">暂时无法预览，请刷新结果或下载结果表格。</p>}
      </article>;
    })}</div>
  </div>;
}
