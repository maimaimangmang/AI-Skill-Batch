// Run with: node --import tsx scripts/check-translations.ts [public-catalog.json]
// Anonymous reads only. Reports newly published/changed public copy for review;
// never translates user input or sends content to a paid model service.
import { readFileSync } from 'node:fs';
import { translateSkillText } from '../lib/i18n';
import { schemaOf, cellText } from '../lib/domain';
import { isPublicSkill } from '../lib/public-skills';
import { officialListing, officialTemplateIds } from '../lib/official';
import { listingModelLabel } from '../lib/market';
import { workflowExamples } from '../lib/workflow-examples';
import type { PublicSkill } from '../lib/public-skills';

async function get(path: string) {
  const response = await fetch(`https://loomloom.shengsuanyun.com/loom/v1/${path}`, { redirect: 'error', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Public catalog returned ${response.status}`);
  return response.json();
}
async function catalog(): Promise<PublicSkill[]> {
  const items: PublicSkill[] = [];
  const seen = new Set<string>();
  let cursor = '';
  do {
    const page = await get(`marketListings?${new URLSearchParams({ pageSize: '100', ...(cursor ? { pageToken: cursor } : {}) })}`);
    if (!Array.isArray(page.items)) throw new Error('Invalid public catalog');
    items.push(...page.items.filter(isPublicSkill));
    cursor = page.nextPageToken || '';
    if (cursor && (seen.has(cursor) || seen.size > 100)) throw new Error('Invalid catalog pagination');
    seen.add(cursor);
  } while (cursor);
  for (const id of officialTemplateIds) items.push(officialListing(await get(`officialTemplates/${id}/schema`)));
  return items;
}
async function main() {
  const items: PublicSkill[] = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], 'utf8')).filter((item: PublicSkill) => item.officialTemplateId || isPublicSkill(item)) : await catalog();
  const missing = new Map<string, Set<string>>();
  let checked = 0;
  function check(source: unknown, id: string) {
    if (typeof source !== 'string' || !/[\u3400-\u9fff]/u.test(source)) return;
    checked++;
    if (/[\u3400-\u9fff]/u.test(translateSkillText('en', source))) {
      if (!missing.has(source)) missing.set(source, new Set());
      missing.get(source)!.add(id);
    }
  }
  for (const skill of items) {
    for (const source of [skill.displayName, skill.description, listingModelLabel(skill), ...(skill.scenarios || []), ...((skill as any).value?.scenarios || [])]) check(source, skill.id);
    if (!skill.inputSchemaSnapshot) continue;
    const schema = schemaOf(skill);
    for (const source of [schema.input_summary, ...(schema.instructions || [])]) check(source, skill.id);
    for (const field of schema.fields) {
      for (const source of [field.label, field.description, field.presentation?.hint, field.presentation?.placeholder, ...field.enum_values || [], field.default_value]) check(source, skill.id);
    }
    for (const example of workflowExamples(skill, schema)) {
      check(example.label, skill.id);
      for (const field of schema.fields) check(cellText(example.input[field.key]), skill.id);
      for (const image of [...example.inputImages || [], ...example.output ? [example.output] : []]) check(image.label, skill.id);
    }
  }
  console.log(`Checked ${items.length} public Skills and ${checked} Chinese display strings; ${missing.size} missing English translations.`);
  if (missing.size) {
    console.log(JSON.stringify(Object.fromEntries([...missing].map(([source, ids]) => [source, [...ids]])), null, 2));
    process.exitCode = 1;
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
