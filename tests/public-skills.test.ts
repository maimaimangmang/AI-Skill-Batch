import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestedSkill, appPath, loginPath, skillId, skillPath, hiddenSkillIds } from '../lib/skill-links';
import { isPublicSkill, publicFields } from '../lib/public-skills';
import { jsonLd } from '../lib/seo';
test('Skill handoff carries only identifiers, never a redirect URL', () => {
  for (const value of ['https://evil.test', '//evil.test', '../login', 'abc&demo=1', ['abc'], '', ...hiddenSkillIds]) assert.equal(requestedSkill(value), undefined);
  assert.equal(appPath('text-image-v1'), '/app?skill=text-image-v1');
  assert.equal(loginPath('text-image-v1'), '/login?skill=text-image-v1');
  assert.equal(appPath('demo-copy', true), '/app?demo=1&skill=demo-copy');
  assert.equal(loginPath('//evil.test'), '/login');
});
test('Stable canonical detail links support aliases and arbitrary published IDs', () => {
  for (const id of ['text-image-v1', 'text-v1', '01a0ccea-2449-7796-ba40-bfcded89b97d', 'another-public-skill']) assert.equal(skillId(skillPath(id).split('/').at(-1)!), id);
});
test('Hidden, unpublished and delisted Skill records cannot be public', () => {
  const skill = { id: 'example', status: 'published', saleStatus: 'listed' };
  assert.equal(isPublicSkill(skill), true);
  for (const change of [{ status: 'draft' }, { saleStatus: 'unlisted' }, { id: [...hiddenSkillIds][0] }, { id: '../../api/session' }]) assert.equal(isPublicSkill({ ...skill, ...change }), false);
});
test('Public view data is an explicit allowlist', () => {
  const raw = { id: 'example', displayName: 'Test', description: 'Public', inputSchemaSnapshot: { fields: [] }, apiKey: 'never-include', trust: { runCount: 1 }, skillPackage: { internal: true } };
  const value = publicFields(raw);
  assert.equal(value.displayName, 'Test');
  for (const key of ['apiKey', 'trust', 'skillPackage']) assert.equal(Object.hasOwn(value, key), false);
});
test('Structured data cannot close its script element', () => {
  const text = '</script><script>alert(1)</script>';
  assert.ok(!jsonLd({ text }).includes('<'));
  assert.equal(JSON.parse(jsonLd({ text })).text, text);
});
test('Public reads are anonymous and do not confuse outage with missing Skill', async () => {
  const native = globalThis.fetch;
  const { getPublicSkill } = await import('../lib/public-skills');
  try {
    globalThis.fetch = async (input, options) => {
      assert.ok(String(input).startsWith('https://loomloom.shengsuanyun.com/loom/v1/marketListings/'));
      assert.equal(new Headers(options?.headers).has('authorization'), false);
      assert.equal(new Headers(options?.headers).has('cookie'), false);
      assert.equal(options?.redirect, 'error');
      return new Response('', { status: String(input).endsWith('/missing') ? 404 : 503 });
    };
    assert.equal(await getPublicSkill('missing'), null);
    await assert.rejects(getPublicSkill('outage'), /暂时不可用/);
    assert.equal(await getPublicSkill([...hiddenSkillIds][0]), null);
  } finally { globalThis.fetch = native; }
});
