import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currentPath, localPagePath, newTabHref, preserveReturnNavigation, readReturnNavigation, rememberNavigation } from '../lib/navigation';

test('return navigation follows the actual entry, including nested visits, reload, language and new tabs', () => {
  const storage = new Map<string, string>();
  const entries: { url: URL; state: any }[] = [];
  let index = -1;
  const browser = {
    get location() { return entries[index].url; },
    sessionStorage: {
      getItem: (key: string) => storage.get(key) || null,
      setItem: (key: string, value: string) => { storage.set(key, value); },
      removeItem: (key: string) => { storage.delete(key); },
    },
    history: {
      get state() { return entries[index].state; },
      replaceState: (state: unknown) => { entries[index].state = state; },
    },
  };
  const visit = (path: string) => { entries.splice(++index); entries.push({ url: new URL(path, 'https://loomskill.test'), state: { nextRouter: true } }); };
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  try {
    for (const origin of ['/#skill-showcase', '/favorites', '/cases', '/skills?q=image&category=images&page=3#results', '/en/skills?billing=subscription&page=2', '/use-cases/images', '/batch-image-generation#spreadsheet-guide', '/tasks', '/tasks/run_failed']) {
      visit(origin);
      rememberNavigation('/skills/text-to-image'); visit('/skills/text-to-image');
      assert.deepEqual(readReturnNavigation(), { page: '/skills/text-to-image', href: origin, inHistory: true });
      assert.equal(browser.history.state.nextRouter, true, 'Next.js state survives');
      assert.equal(readReturnNavigation()?.href, origin, 'refresh retains the same source');
      rememberNavigation('/skills/text-generation'); visit('/skills/text-generation');
      assert.equal(readReturnNavigation()?.href, '/skills/text-to-image');
      index--;
      assert.equal(readReturnNavigation()?.href, origin, 'returning through related skills does not form a loop');
      index++;
      assert.equal(readReturnNavigation()?.href, '/skills/text-to-image', 'forward retains its own origin');
    }
    visit('/tasks'); rememberNavigation('/tasks/run_123'); visit('/tasks/run_123');
    assert.equal(readReturnNavigation()?.href, '/tasks');
    preserveReturnNavigation('/en/tasks/run_123');
    entries[index] = { url: new URL('https://loomskill.test/en/tasks/run_123'), state: {} };
    assert.equal(readReturnNavigation()?.href, '/tasks', 'language replacement preserves the real entry');
    visit('/skills/text-to-image');
    assert.equal(readReturnNavigation(), undefined, 'a directly opened page uses its fallback even with unrelated history');
    visit('/cases#example'); const target = newTabHref('/skills/text-to-image');
    visit(target);
    assert.equal(readReturnNavigation()?.href, '/cases#example');
    assert.equal(readReturnNavigation()?.inHistory, false, 'a new tab returns by URL instead of leaving the site');
    visit('/skills?category=images'); rememberNavigation('/skills?category=images#workflows');
    assert.equal(storage.size, 0, 'hash-only navigation does not overwrite the entry');
    assert.equal(newTabHref('/skills?category=images#workflows'), '/skills?category=images#workflows');
    rememberNavigation('/skills/text-to-image'); visit('/cases');
    assert.equal(readReturnNavigation(), undefined, 'an interrupted navigation cannot supply a different page with a stale source');
    for (const unsafe of ['https://evil.test', '//evil.test', '/\\evil.test', '/api/session', '/_next/data', '/share-image', '/examples/image.png', '/bad\npath']) {
      assert.equal(localPagePath(unsafe), undefined);
      visit('/skills/text-to-image?returnTo=' + encodeURIComponent(unsafe));
      assert.equal(readReturnNavigation(), undefined);
    }
    visit('/skills/text-to-image');
    storage.set('loomskill-navigation', '{broken');
    assert.equal(readReturnNavigation(), undefined);
    assert.equal(currentPath(), '/skills/text-to-image');
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
