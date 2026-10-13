export const hiddenSkillIds = new Set(['01a12464-6c6a-70ed-ab08-56fd0478261b']);
export const skillSlugs: Record<string, string> = {
  '01a0ccea-2449-7796-ba40-bfcded89b97d': 'ecommerce-image-remix',
  '019fc6b4-8d10-7517-882d-fcb27bcbe42e': 'amazon-product-images',
  '01a0d302-73cd-7702-a072-0358de4e9b86': 'ecommerce-image-remix-seedream',
  'text-image-v1': 'text-to-image',
  'text-v1': 'text-generation',
};
export function skillPath(id: string) { return `/skills/${skillSlugs[id] || encodeURIComponent(id)}`; }
export function skillId(slug: string) { return Object.keys(skillSlugs).find(id => skillSlugs[id] === slug) || slug; }
export function validSkillId(id: string) { return /^[a-zA-Z0-9_-]{1,180}$/.test(id) && !hiddenSkillIds.has(id); }

export function requestedRunId(value: unknown): string | undefined {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,180}$/.test(value) ? value : undefined;
}

export function tasksPath(runId?: string) {
  const valid = requestedRunId(runId);
  return valid ? `/tasks/${valid}` : '/tasks';
}

// Keep connection return targets restricted to authenticated workspace pages.
export function workspaceDestination(value: unknown): string {
  if (value === '/tasks' || value === '/settings') return value;
  if (typeof value === 'string' && value.startsWith('/tasks/')) {
    const runId = requestedRunId(value.slice('/tasks/'.length));
    if (runId) return tasksPath(runId);
  }
  return '/tasks';
}

export function taskConnectionPath(destination?: string) {
  const next = workspaceDestination(destination);
  return next === '/tasks' ? '/?connect=1' : `/?connect=1&next=${encodeURIComponent(next)}`;
}
