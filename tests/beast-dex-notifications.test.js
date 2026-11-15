import test from 'node:test';
import assert from 'node:assert/strict';
import { REVIEW_COMPONENTS, saveDexReview, dexReviews, dexReviewStatus, reviewFingerprint, syncDexReviews } from '../src/dex/reviews.js';
import { reviewQueue, freshAnnouncement, focusReviewer, takeReviewerFocus } from '../src/ui/dev-review.js';
const data = new Map();
globalThis.localStorage = { getItem: key => data.get(key) || null, setItem: (key,value) => data.set(key,value), removeItem: key => data.delete(key) };
test('Dex notification count is per form, uses all components and includes revisions', () => {
  const initial = reviewQueue();
  assert.equal(initial.beastdex.total, 222);
  for (const component of REVIEW_COMPONENTS) saveDexReview('emberfox:0', component, 'approved', 'Reviewed');
  let q = reviewQueue();
  assert.equal(q.beastdex.outstanding, initial.beastdex.outstanding - 1);
  assert.equal(q.total, q.plays.length + q.football.outstanding + q.clash.outstanding + q.beastdex.outstanding);
  saveDexReview('emberfox:0', 'lore', 'revision', 'Please revise this');
  q = reviewQueue();
  assert.equal(q.beastdex.outstanding, initial.beastdex.outstanding);
  assert.ok(q.beastdex.revision.some(x => x.id === 'emberfox:0'));
  assert.ok(q.beastdex.revision.find(x => x.id === 'emberfox:0').components.some(x => x.component === 'visuals' && x.status === 'approved'));
});
test('Dex uses one-time review announcements and can be targeted from a notification', () => {
  data.delete('gridiron-beast-review-announced');
  assert.match(freshAnnouncement({}), /Beast Dex Reviewer/);
  assert.equal(freshAnnouncement({}), null);
  assert.equal(freshAnnouncement({ devNotices: false }), null);
  focusReviewer('beastdex', { status: 'revision', id: 'emberfox:0' });
  assert.deepEqual(takeReviewerFocus('beastdex'), { status: 'revision', id: 'emberfox:0', anchor: null });
});
test('cloud merge keeps local legacy notes, accepts newer remote components and uploads local reviews', async () => {
  saveDexReview('thornkit:0', 'audio', 'approved', 'Local cry note');
  const before = dexReviews()['thornkit:0'].audio;
  const remote = { 'thornkit:0~lore': { id: 'thornkit:0', component: 'lore', status: 'revision', notes: 'Remote lore note', fingerprint: reviewFingerprint('thornkit:0', 'lore'), updatedAt: Date.now() + 1000 } };
  const uploaded = [];
  assert.equal(await syncDexReviews({ load: async name => { assert.equal(name, 'beast_dex_reviews'); return remote; }, save: async (name,id,row) => { uploaded.push({ name,id,row }); return true; } }), true);
  assert.equal(dexReviews()['thornkit:0'].audio.notes, before.notes);
  assert.equal(dexReviews()['thornkit:0'].lore.notes, 'Remote lore note');
  assert.equal(dexReviewStatus('thornkit:0', 'lore'), 'revision');
  assert.ok(uploaded.some(x => x.id === 'thornkit:0~audio' && x.row.notes === 'Local cry note'));
  assert.equal(await syncDexReviews({ load: async () => null }), false);
});
