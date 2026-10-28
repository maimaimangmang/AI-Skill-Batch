import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localizedPath, pathLocale } from '../lib/locale';
import { taskConnectionPath, workspaceDestination } from '../lib/skill-links';
import { stageLanguageDraft, takeLanguageDraft, clearLanguageDraft } from '../lib/language-draft';

test('language paths preserve page, query and hash, without localizing API or asset URLs', () => {
  for (const [source, english, chinese] of [
    ['/', '/en', '/'], ['/skills?q=image&page=2#results', '/en/skills?q=image&page=2#results', '/skills?q=image&page=2#results'],
    ['/en?connect=1', '/en?connect=1', '/?connect=1'], ['/zh-CN/skills', '/en/skills', '/skills'],
    ['/api/runs', '/api/runs', '/api/runs'], ['/examples/pic.png', '/examples/pic.png', '/examples/pic.png'],
    ['https://example.com/', 'https://example.com/', 'https://example.com/'], ['//example.com', '//example.com', '//example.com'], ['#tasks', '#tasks', '#tasks'],
  ]) {
    assert.equal(localizedPath(source, 'en'), english);
    assert.equal(localizedPath(source, 'zh-CN'), chinese);
    assert.equal(localizedPath(english, 'en'), english);
  }
  assert.equal(pathLocale('/english'), 'zh-CN');
  assert.equal(pathLocale('/en?connect=1'), 'en');
});

test('connection handoffs retain language and allow only workspace destinations', () => {
  assert.equal(taskConnectionPath('/en/tasks'), '/en?connect=1');
  assert.equal(taskConnectionPath('/tasks/run_123', 'en'), '/en?connect=1&next=%2Fen%2Ftasks%2Frun_123');
  assert.equal(taskConnectionPath('/settings', 'en'), '/en?connect=1&next=%2Fen%2Fsettings');
  assert.equal(workspaceDestination('/en/tasks/run_123'), '/en/tasks/run_123');
  for (const path of ['https://example.com', '//example.com', '/en/tasks?redirect=evil', '/en/tasks/../settings', '/en/tasks/run%2F123', '/en/settings/evil']) assert.equal(workspaceDestination(path), '/tasks');
});

test('language draft handoff preserves raw inputs and files, and is consumed once for the same version', () => {
  const rows = [{ prompt: '保留我输入的中文', language: '简体中文' }];
  const assets = new Map([['ia_local_demo', { file: new File(['test'], 'test.txt') }]]);
  stageLanguageDraft({ skillId: 'skill', version: 'v1', locale: 'en', rows, assets });
  assert.equal(takeLanguageDraft('skill', 'v2', 'en'), undefined);
  const restored = takeLanguageDraft('skill', 'v1', 'en');
  assert.deepEqual(restored?.rows, rows);
  assert.notEqual(restored?.rows, rows);
  assert.equal(restored?.assets.get('ia_local_demo')?.file, assets.get('ia_local_demo')?.file);
  assert.equal(takeLanguageDraft('skill', 'v1', 'en'), undefined);
  clearLanguageDraft();
});
