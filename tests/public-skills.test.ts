import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestedSkill, appPath, loginPath, connectionPath, requestedRunId, tasksPath, workspaceDestination, taskConnectionPath, skillId, skillPath, hiddenSkillIds } from '../lib/skill-links';
import { isPublicSkill, publicFields } from '../lib/public-skills';
import { jsonLd } from '../lib/seo';
test('Skill handoff carries only identifiers, never a redirect URL', () => {
  for (const value of ['https://evil.test', '//evil.test', '../login', 'abc&demo=1', ['abc'], '', ...hiddenSkillIds]) assert.equal(requestedSkill(value), undefined);
  assert.equal(appPath(), '/tasks');
  assert.equal(appPath('text-image-v1'), '/skills/text-to-image');
  assert.equal(appPath('another-public-skill'), '/skills/another-public-skill');
  assert.equal(loginPath('text-image-v1'), '/login?skill=text-image-v1');
  assert.equal(appPath(undefined, true), '/app?demo=1');
  assert.equal(appPath('demo-copy', true), '/app?demo=1&skill=demo-copy');
  assert.equal(appPath('//evil.test'), '/tasks');
  assert.equal(appPath('//evil.test', true), '/app?demo=1');
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

test('connection entry preserves only validated Skill destinations', () => {
  assert.equal(connectionPath(), '/?connect=1');
  assert.equal(connectionPath('text-image-v1'), '/skills/text-to-image');
  for (const value of ['https://evil.test', '//evil.test', 'abc&connect=1', ...hiddenSkillIds]) {
    assert.equal(connectionPath(value), '/?connect=1');
  }
});

test('task links accept opaque API identifiers without accepting paths or query strings', () => {
  for (const value of ['019fc6b4-8d10-7517-882d-fcb27bcbe42e', 'run_ABC-123', 'x', 'a'.repeat(180)]) {
    assert.equal(requestedRunId(value), value);
    assert.equal(tasksPath(value), `/tasks/${value}`);
  }
  for (const value of [undefined, null, 123, ['run-1'], '', 'a'.repeat(181), '../settings', 'run/1', 'run?demo=1', 'run#results', 'run%2F1', 'run\\1', 'run 1', 'run\n', '任务']) {
    assert.equal(requestedRunId(value), undefined);
  }
  for (const value of ['', 'a'.repeat(181), '../settings', 'run/1', 'run?demo=1', 'https://evil.test']) assert.equal(tasksPath(value), '/tasks');
  assert.equal(tasksPath(), '/tasks');
});

test('connection return destinations are restricted to task and settings pages', () => {
  for (const path of ['/tasks', '/tasks/run_ABC-123', '/settings']) assert.equal(workspaceDestination(path), path);
  for (const value of [undefined, null, ['/settings'], '/skills', '/', '/app', '/tasks/', '/tasks/one/two', '/tasks/../settings', '/tasks/%2F%2Fevil.test', '/tasks/run?next=https://evil.test', '/tasks/run#results', '/settings?next=/tasks', '/tasks/' + 'a'.repeat(181), '//evil.test', 'https://evil.test/tasks', 'javascript:alert(1)', '/\\evil.test', '/tasks/run\n']) {
    assert.equal(workspaceDestination(value), '/tasks');
  }
});

test('task connection entry preserves deep links without arbitrary redirect targets', () => {
  assert.equal(taskConnectionPath(), '/?connect=1');
  assert.equal(taskConnectionPath('/tasks'), '/?connect=1');
  assert.equal(taskConnectionPath('/tasks/run_ABC-123'), '/?connect=1&next=%2Ftasks%2Frun_ABC-123');
  assert.equal(taskConnectionPath('/settings'), '/?connect=1&next=%2Fsettings');
  for (const value of ['https://evil.test', '//evil.test', '/skills', '/tasks/../settings', '/tasks/run?connect=0']) assert.equal(taskConnectionPath(value), '/?connect=1');
});
