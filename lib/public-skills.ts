import { cache } from 'react';
import { officialListing, officialTemplateIds } from './official';
import type { Listing } from './types';

export const SITE_URL = 'https://loomskill.com';
import { validSkillId } from './skill-links';
export { skillPath, skillId, validSkillId } from './skill-links';
export function isPublicSkill(value: { id?: string; saleStatus?: string; status?: string }) {
  return !!value.id && validSkillId(value.id) && value.saleStatus === 'listed' && value.status === 'published';
}
export type PublicSkill = Listing & { updatedAt?: string; outputType?: string; scenarios?: string[] };
// Only the anonymous public API is used here. Never forward a session or API key.
async function publicGet(path: string) {
  const response = await fetch(`https://loomloom.shengsuanyun.com/loom/v1/${path}`, {
    next: { revalidate: 900 }, redirect: 'error', signal: AbortSignal.timeout(12000),
  });
  if (response.status === 404 || response.status === 410) return null;
  if (!response.ok) throw new Error('公开 Skill 信息暂时不可用，请稍后重试。');
  return response.json();
}
export function publicFields(value: PublicSkill & { value?: { scenarios?: string[] } }): PublicSkill {
  return { id: value.id, displayName: value.displayName, description: value.description,
    creator: { nickname: value.creator?.nickname }, currency: value.currency, taskFixedFeeT: value.taskFixedFeeT,
    inputSchemaSnapshot: value.inputSchemaSnapshot, listingVersionId: value.listingVersionId,
    saleStatus: value.saleStatus, executionAvailabilityStatus: value.executionAvailabilityStatus,
    updatedAt: value.updatedAt, outputType: value.outputType, scenarios: value.value?.scenarios?.filter(s => typeof s === 'string') };
}
export const getPublicSkill = cache(async (id: string): Promise<PublicSkill | null> => {
  if (!validSkillId(id)) return null;
  if ((officialTemplateIds as readonly string[]).includes(id)) {
    const schema = await publicGet(`officialTemplates/${id}/schema`);
    if (!schema || schema.templateId !== id) return null;
    return { ...officialListing(schema), outputType: schema.outputType, scenarios: schema.scenario ? [schema.scenario] : [] };
  }
  const value = await publicGet(`marketListings/${encodeURIComponent(id)}`);
  return value && value.id === id && isPublicSkill(value) ? publicFields(value) : null;
});
export const getPublicSkills = cache(async (): Promise<PublicSkill[]> => {
  const items: PublicSkill[] = [];
  let cursor = ''; const seen = new Set<string>();
  do {
    const query = new URLSearchParams({ pageSize: '100', ...(cursor ? { pageToken: cursor } : {}) });
    const page = await publicGet(`marketListings?${query}`);
    if (!page || !Array.isArray(page.items)) throw new Error('公开目录暂时不可用。');
    items.push(...page.items.filter(isPublicSkill).map(publicFields));
    cursor = page.nextPageToken || '';
    if (cursor && (seen.has(cursor) || seen.size >= 100)) throw new Error('公开目录分页异常。');
    seen.add(cursor);
  } while (cursor);
  const official = await Promise.all(officialTemplateIds.map(getPublicSkill));
  return [...official.filter((item): item is PublicSkill => !!item), ...new Map(items.map(item => [item.id, item])).values()];
});
