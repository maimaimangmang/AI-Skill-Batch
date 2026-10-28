import test from 'node:test';
import assert from 'node:assert/strict';
import { getPublicCardSkills, type PublicSkill } from '../lib/public-skills';

test('catalog cards deduplicate summary requests and omit detail/bundle expansion', async t => {
  const paths: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const path = new URL(String(input)).pathname;
    paths.push(path);
    assert.match(path, /\/skillCatalog\/market\//);
    const id = path.split('/').at(-1)!;
    return Response.json({ resourceId: id, source: 'market', displayName: 'Latest title', description: 'Complete description', listingVersionId: 'v2', category: 'development_design', creator: { nickname: 'Author' }, pricing: {
      payPerUseEnabled: false, subscriptionOffersStatus: 'available', subscriptionOffers: [{ bundleId: 'bundle-a', bundleName: 'Plan', tiers: [{ enabled: true, tierType: 'monthly', durationDays: 30, price: { amount: '5', currency: 'CNY' } }] }],
    } });
  });
  const listing: PublicSkill = { id: 'card-test-a', displayName: 'Card', description: 'Description', inputSchemaSnapshot: '{}', category: 'development_design' };
  const official = { ...listing, id: 'text-v1', officialTemplateId: 'text-v1' };
  const cards = await getPublicCardSkills([listing, official, listing]);
  assert.equal(paths.length, 1);
  assert.equal(cards.length, 2);
  assert.equal(cards[0].creator?.nickname, 'Author');
  assert.equal(cards[0].description, 'Complete description');
  assert.equal(cards[0].listingVersionId, 'v2');
  assert.equal(cards[0].pricing?.subscriptionOffers?.[0].tiers[0].price?.amount, '5');
  assert.equal(cards[0].pricing?.subscriptionOffers?.[0].items, undefined);
  assert.equal(listing.pricing, undefined, 'Must not mutate the shared catalog');
});

test('a failed summary keeps the card browsable without assuming a free price', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unavailable'); });
  const cards = await getPublicCardSkills([{ id: 'card-test-failure', displayName: 'Card', description: 'Description', inputSchemaSnapshot: '{}', category: 'tool_efficiency', taskFixedFeeT: 0 }]);
  assert.equal(cards[0].category, 'tool_efficiency');
  assert.equal(cards[0].pricing, undefined);
});
