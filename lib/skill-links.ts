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

// Shared between login, server routes and client navigation. Never accept a URL
// supplied as a redirect target; carry only a validated workflow identifier.
export function requestedSkill(value: unknown): string | undefined {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,180}$/.test(value) && value !== '01a12464-6c6a-70ed-ab08-56fd0478261b' ? value : undefined;
}
export function appPath(skill?: string, demo = false) {
  const params = new URLSearchParams();
  if (demo) params.set('demo', '1');
  const valid = requestedSkill(skill);
  if (valid) params.set('skill', valid);
  return '/app' + (params.size ? `?${params}` : '');
}
export function loginPath(skill?: string) {
  const valid = requestedSkill(skill);
  return '/login' + (valid ? `?skill=${encodeURIComponent(valid)}` : '');
}
