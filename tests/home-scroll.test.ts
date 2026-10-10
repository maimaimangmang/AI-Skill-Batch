import test from 'node:test';
import assert from 'node:assert/strict';
import { skillStreamOffset } from '../lib/home-scroll';

test('scroll down moves the left column up and the right column down', () => {
  assert.ok(skillStreamOffset(300, 1600, 1) < skillStreamOffset(200, 1600, 1));
  assert.ok(skillStreamOffset(300, 1600, -1) > skillStreamOffset(200, 1600, -1));
});
test('complete cycles wrap seamlessly in both directions', () => {
  for (const direction of [1, -1] as const) {
    assert.equal(skillStreamOffset(200 + 1600, 1600, direction), skillStreamOffset(200, 1600, direction));
  }
});
test('negative scroll and empty track sizes stay in bounds', () => {
  for (const direction of [1, -1] as const) {
    const offset = skillStreamOffset(-200, 1600, direction);
    assert.ok(offset <= 0 && offset > -1600);
    assert.equal(skillStreamOffset(200, 0, direction), 0);
  }
});
