import type { Run } from './types';

const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const officialNames = new Map([
  ['text-image-v1', '通用文生图'],
  ['text-v1', '通用文本生成'],
]);

// Some history records use the run ID as displayName. It is metadata, not a title.
export function runName(run?: Run, market = run?.market): string {
  if (!run) return '任务结果';
  const name = [market?.skillName, run.displayName, run.templateName].find(value => {
    const text = value?.trim();
    return text && text !== run.runId && text !== run.templateKey && !uuid.test(text);
  });
  return name?.trim() || officialNames.get(run.templateKey || '') || '工作流名称未提供';
}
