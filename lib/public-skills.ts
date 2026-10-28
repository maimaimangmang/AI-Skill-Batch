import { cache } from 'react';
import { officialListing, officialTemplateIds } from './official';
import type { Listing } from './types';
import { publicPricing } from './skill-commerce';

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
    category: typeof value.category === 'string' ? value.category : undefined,
    creator: { nickname: value.creator?.nickname }, currency: value.currency, taskFixedFeeT: value.taskFixedFeeT,
    inputSchemaSnapshot: value.inputSchemaSnapshot, listingVersionId: value.listingVersionId,
    saleStatus: value.saleStatus, executionAvailabilityStatus: value.executionAvailabilityStatus,
    updatedAt: value.updatedAt, outputType: value.outputType, scenarios: value.value?.scenarios?.filter(s => typeof s === 'string') };
}
export const getSkillCommerce = cache(async (id: string, includeItems = false) => {
  if (!validSkillId(id)) return {};
  const source = (officialTemplateIds as readonly string[]).includes(id) ? 'official' : 'market';
  try {
    const detail = await publicGet(`skillCatalog/${source}/${encodeURIComponent(id)}`);
    if (!detail || detail.resourceId !== id || detail.source !== source) return {};
    const pricing = publicPricing(detail.pricing);
    if (includeItems && pricing?.subscriptionOffersStatus === 'available') {
      await Promise.all((pricing.subscriptionOffers || []).map(async offer => {
        try {
          const items = []; let token = ''; const seen = new Set<string>();
          do {
            const page = await publicGet(`subscriptionBundles/${encodeURIComponent(offer.bundleId)}/items${token ? `?pageToken=${encodeURIComponent(token)}` : ''}`);
            if (!Array.isArray(page?.items)) return;
            items.push(...page.items.filter((item: { listingId?: string; listingName?: string }) => validSkillId(item.listingId || '') && typeof item.listingName === 'string').map((item: { listingId: string; listingName: string }) => ({ listingId: item.listingId, listingName: item.listingName })));
            token = page.nextPageToken || '';
            if (token && (seen.has(token) || seen.size >= 100)) return;
            seen.add(token);
          } while (token);
          offer.items = items;
        } catch { /* Keep pricing usable even when the coverage list is temporarily unavailable. */ }
      }));
    }
    return { category: typeof detail.category === 'string' ? detail.category : undefined, pricing,
      ...(typeof detail.displayName === 'string' ? { displayName: detail.displayName } : {}),
      ...(typeof detail.description === 'string' ? { description: detail.description } : {}),
      ...(typeof detail.listingVersionId === 'string' ? { listingVersionId: detail.listingVersionId } : {}),
      ...(typeof detail.creator?.nickname === 'string' ? { creator: { nickname: detail.creator.nickname } } : {}) };
  } catch { return {}; } // Unknown is never presented as free or pay-per-use.
});
// Cards only need the public catalog summary, not input schemas or bundle membership.
// Keep workers busy without waiting for the slowest request in each batch.
export async function getPublicCardSkills(skills: PublicSkill[]): Promise<PublicSkill[]> {
  const cards = [...new Map(skills.map(skill => [skill.id, { ...skill }])).values()];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(6, cards.length) }, async () => {
    while (next < cards.length) {
      const skill = cards[next++];
      if (!skill.officialTemplateId) Object.assign(skill, await getSkillCommerce(skill.id));
    }
  }));
  return cards;
}
export const getSubscriptionSkillIds = cache(async (): Promise<Set<string>> => {
  const ids = new Set<string>(); let token = ''; const seen = new Set<string>();
  do {
    const page = await publicGet(`subscriptionBundles${token ? `?pageToken=${encodeURIComponent(token)}` : ''}`);
    if (!Array.isArray(page?.items)) throw new Error('公开订阅信息暂时不可用。');
    for (const bundle of page.items) {
      if (bundle.status !== 'published' || !/^[\w-]{1,180}$/.test(bundle.id) || !bundle.tiers?.some((tier: { enabled?: boolean }) => tier.enabled === true)) continue;
      let cursor = ''; const itemTokens = new Set<string>();
      do {
        const members = await publicGet(`subscriptionBundles/${encodeURIComponent(bundle.id)}/items${cursor ? `?pageToken=${encodeURIComponent(cursor)}` : ''}`);
        if (!Array.isArray(members?.items)) throw new Error('公开订阅信息暂时不可用。');
        for (const item of members.items) if (validSkillId(item.listingId || '') && item.saleStatus === 'listed') ids.add(item.listingId);
        cursor = members.nextPageToken || '';
        if (cursor && (itemTokens.has(cursor) || itemTokens.size >= 100)) throw new Error('公开订阅分页异常。');
        itemTokens.add(cursor);
      } while (cursor);
    }
    token = page.nextPageToken || '';
    if (token && (seen.has(token) || seen.size >= 100)) throw new Error('公开订阅分页异常。');
    seen.add(token);
  } while (token);
  return ids;
});
export const getPublicSkill = cache(async (id: string): Promise<PublicSkill | null> => {
  if (!validSkillId(id)) return null;
  if ((officialTemplateIds as readonly string[]).includes(id)) {
    const schema = await publicGet(`officialTemplates/${id}/schema`);
    if (!schema || schema.templateId !== id) return null;
    return { ...officialListing(schema), outputType: schema.outputType, scenarios: schema.scenario ? [schema.scenario] : [] };
  }
  const value = await publicGet(`marketListings/${encodeURIComponent(id)}`);
  return value && value.id === id && isPublicSkill(value) ? { ...publicFields(value), ...await getSkillCommerce(id, true) } : null;
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
