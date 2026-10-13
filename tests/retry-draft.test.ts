import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRetryDraftStore, RETRY_DRAFT_TTL_MS } from '../lib/retry-draft';
import type { ResultRow } from '../lib/types';

const rows = (): ResultRow[] => [{ rowIndex: 2, inputJson: '{"prompt":"Retry me"}', status: 'failed', artifacts: [{ inlineText: 'Original result' }] }];

test('retry draft transfers once and does not share the original result objects', () => {
  const store = createRetryDraftStore();
  const original = rows();
  store.stage('skill-a', original);
  original[0].artifacts![0].inlineText = 'Changed after staging';
  const restored = store.take('skill-a');
  assert.deepEqual(restored, rows());
  restored![0].inputJson = '{}';
  assert.notEqual(restored![0].inputJson, original[0].inputJson);
  assert.equal(store.take('skill-a'), undefined);
});

test('visiting another Skill leaves the retry draft available for its intended Skill', () => {
  const store = createRetryDraftStore();
  store.stage('skill-a', rows());
  assert.equal(store.take('skill-b'), undefined);
  assert.deepEqual(store.take('skill-a'), rows());
});

test('retry drafts expire after five minutes even if the expiry timer is delayed', () => {
  let now = 1000;
  const store = createRetryDraftStore(() => now);
  store.stage('skill-a', rows());
  now += RETRY_DRAFT_TTL_MS;
  assert.equal(store.take('skill-a'), undefined);
  now = 1000;
  assert.equal(store.take('skill-a'), undefined);
});

test('retry drafts are available immediately before the expiry deadline', () => {
  let now = 1000;
  const store = createRetryDraftStore(() => now);
  store.stage('skill-a', rows());
  now += RETRY_DRAFT_TTL_MS - 1;
  assert.deepEqual(store.take('skill-a'), rows());
});

test('a new retry replaces the previous draft and clear discards the pending transfer', () => {
  const store = createRetryDraftStore();
  store.stage('skill-a', rows());
  store.stage('skill-b', rows());
  assert.equal(store.take('skill-a'), undefined);
  store.clear();
  assert.equal(store.take('skill-b'), undefined);
});

test('separate provider stores cannot access each other’s retry drafts', () => {
  const first = createRetryDraftStore();
  const second = createRetryDraftStore();
  first.stage('skill-a', rows());
  assert.equal(second.take('skill-a'), undefined);
  assert.deepEqual(first.take('skill-a'), rows());
});
