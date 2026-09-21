import type { Artifact, ResultRow } from './types';

const genericName = /^(output|outputs|result|results|image|images|text|audio|video|file|artifact)([\s_-]*\d+)?$/i;
function meaningfulName(value?: string) {
  const name = value?.trim();
  return name && !genericName.test(name) ? name : undefined;
}

// Step IDs are scoped to this run. Never infer a picture's purpose from its position.
export function resultStepLabels(rows: ResultRow[]) {
  const labels = new Map<string, string>();
  const conflicts = new Set<string>();
  for (const row of rows) for (const step of [...(row.stepErrors || []), ...(row.artifacts || [])]) {
    const label = meaningfulName(step.stepLabel);
    if (!step.stepId || !label || conflicts.has(step.stepId)) continue;
    if (labels.has(step.stepId) && labels.get(step.stepId) !== label) {
      labels.delete(step.stepId); conflicts.add(step.stepId);
    } else labels.set(step.stepId, label);
  }
  return labels;
}

export function artifactKind(artifact: Artifact) {
  const mime = artifact.mimeType?.toLowerCase() || '';
  if (mime.startsWith('image/')) return { key: 'image', label: '图片', fallback: '生成图片', action: '查看原图' };
  if (mime.startsWith('video/')) return { key: 'video', label: '视频', fallback: '生成视频', action: '打开视频' };
  if (mime.startsWith('audio/')) return { key: 'audio', label: '音频', fallback: '生成音频', action: '打开音频' };
  if (mime === 'application/json') return { key: 'text', label: '数据', fallback: '结果数据', action: '查看结果文件' };
  if (mime.startsWith('text/') || artifact.inlineText) return { key: 'text', label: '文本', fallback: '生成文案', action: '查看完整文本' };
  return { key: 'file', label: '文件', fallback: '生成文件', action: '打开文件' };
}

export function titledArtifacts(artifacts: Artifact[], stepLabels: Map<string, string>) {
  const items = artifacts.map(artifact => {
    const kind = artifactKind(artifact);
    const name = meaningfulName(artifact.stepLabel) || (artifact.stepId && stepLabels.get(artifact.stepId)) || meaningfulName(artifact.portName);
    return { artifact, kind, base: name || kind.fallback, fallback: !name };
  });
  const totals = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const item of items) totals.set(item.base, (totals.get(item.base) || 0) + 1);
  return items.map(item => {
    const index = (counts.get(item.base) || 0) + 1; counts.set(item.base, index);
    return { ...item, title: item.fallback || totals.get(item.base)! > 1 ? `${item.base} ${index}` : item.base };
  });
}
