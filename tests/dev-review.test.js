// Developer review queue (GDD §23.7): new, approved, changed, waiting on dev, updated.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; } };
const D = await import('../src/ui/dev-review.js');
const S = await import('../src/franchise/review-store.js');
const fpA = (id) => D.abilityFingerprint(D.REVIEWABLE_ABILITIES.find((s) => s.id === id));

test('dev review: every signature ability and every play starts in the queue', () => {
  const q = D.reviewQueue();
  assert.equal(q.abilities.length, D.REVIEWABLE_ABILITIES.length);
  assert.equal(q.plays.length, D.REVIEWABLE_PLAYS.length);
  assert.ok(D.REVIEWABLE_ABILITIES.every((s) => s.ability), 'traits are not reviewed');
});

test('dev review: approve clears it, a change brings it back, needs work waits on the developer until changed', async () => {
  await S.setReview('ability', 'firestorm', { status: 'approved' }, fpA('firestorm'));
  assert.equal(D.reviewState('ability', 'firestorm'), 'approved');
  await S.setReview('ability', 'tidefin', { status: 'approved' }, 'an-older-version');
  assert.equal(D.reviewState('ability', 'tidefin'), 'changed');
  await S.setReview('ability', 'cinderclaw', { status: 'needs_work', note: 'bigger', gameplay: true }, fpA('cinderclaw'));
  assert.equal(D.reviewState('ability', 'cinderclaw'), 'needs_work');
  await S.setReview('ability', 'reefclaw', { status: 'needs_work' }, 'an-older-version');
  assert.equal(D.reviewState('ability', 'reefclaw'), 'updated');
  const q = D.reviewQueue();
  assert.ok(!q.abilities.includes('firestorm') && !q.abilities.includes('cinderclaw'));
  assert.ok(q.abilities.includes('tidefin') && q.abilities.includes('reefclaw'));
  assert.match(D.reviewsText(), /NEEDS WORK \+ GAMEPLAY: Scorchulk \(Ember Grip\): bigger/);
});

test('dev review: fingerprints are stable and differ between items', () => {
  assert.equal(fpA('firestorm'), fpA('firestorm'));
  assert.notEqual(fpA('firestorm'), fpA('cinderclaw'));
  assert.notEqual(D.playFingerprint('mesh'), D.playFingerprint('cover_3'));
});

test('dev review: a new batch is announced once, and not at all with notices off', () => {
  localStorage.removeItem('gridiron-beast-review-announced');
  assert.equal(D.freshAnnouncement({ devNotices: false }), null);
  assert.match(D.freshAnnouncement({}), /New to review in Developer/);
  assert.equal(D.freshAnnouncement({}), null);
});

test('dev review: old Playbook Audit notes carry over once', async () => {
  localStorage.setItem('gridiron-beast-audit-v6', JSON.stringify({ mesh: { status: 'approved', text: '', savedAt: '2026-01-01T00:00:00Z' }, dive: { status: 'rework', text: 'TE whiffs', savedAt: '2026-01-01T00:00:00Z' } }));
  localStorage.removeItem('gridiron-beast-play-reviews');
  const fresh = await import('../src/franchise/review-store.js?again');
  const r = fresh.reviews('play');
  assert.equal(r.mesh.status, 'approved'); assert.equal(r.dive.status, 'needs_work'); assert.equal(r.dive.note, 'TE whiffs');
});

test('dev review: reviewing items never re-announces; a changed item does', async () => {
  localStorage.removeItem('gridiron-beast-review-announced');
  assert.ok(D.freshAnnouncement({}));
  await S.setReview('play', 'mesh', { status: 'approved' }, D.playFingerprint('mesh'));
  assert.equal(D.freshAnnouncement({}), null, 'the queue shrank: nothing new');
  // A play edited after it was announced has a new fingerprint: simulate by forgetting the announcement of its current version.
  const told = JSON.parse(localStorage.getItem('gridiron-beast-review-announced')).filter((k) => !k.startsWith('play:dive:'));
  localStorage.setItem('gridiron-beast-review-announced', JSON.stringify(told));
  assert.match(D.freshAnnouncement({}) || '', /1 play/);
});

test('card check: listed abilities are mismatches, the owner can flag more, every entry names a real signature ability', async () => {
  const { CARD_CHECK } = await import('../src/data/card-check.js');
  for (const id of Object.keys(CARD_CHECK)) assert.ok(D.REVIEWABLE_ABILITIES.some((s) => s.id === id), `${id} has a signature ability`);
  assert.ok(!D.cardMismatches().includes('wavehorn'), 'Riptide now does what it says');
  assert.deepEqual(Object.keys(CARD_CHECK), [], 'every card matches the engine (v29.5)');
  assert.ok(!D.cardMismatches().includes('voltfang'));
  await S.setReview('ability', 'voltfang', { mismatch: true }, D.abilityFingerprint(D.REVIEWABLE_ABILITIES.find((s) => s.id === 'voltfang')));
  assert.ok(D.cardMismatches().includes('voltfang'));
  assert.equal(D.cardIssue('voltfang').by, 'owner');
  assert.match(D.reviewsText(), /CARD MISMATCH: Zappard/);
});

test('card proposals: every proposal is a real non-legendary signature ability, pending ones are in the queue, a decision clears it', async () => {
  const { CARD_PROPOSALS } = await import('../src/data/card-check.js');
  for (const id of Object.keys(CARD_PROPOSALS)) { const sp = D.REVIEWABLE_ABILITIES.find((s) => s.id === id); assert.ok(sp, id); assert.notEqual(sp.rarity, 'legendary', `${id} is not legendary`); assert.doesNotMatch(CARD_PROPOSALS[id], /\b(never|always|every time|guaranteed|can.t)\b/i, `${id} proposal has no absolutes`); }
  assert.deepEqual(D.proposalsPending(), Object.keys(CARD_PROPOSALS).filter((id) => !S.reviews('ability')[id]?.proposal));
  // The non-legendary cards that were rewritten carry no absolutes any more.
  for (const sp of D.REVIEWABLE_ABILITIES.filter((s) => s.rarity !== 'legendary' && ['reefclaw', 'rootram', 'thornback', 'duskrunner', 'gearwing', 'cerebrix', 'echolot', 'enigmane', 'scaleguard'].includes(s.id))) assert.doesNotMatch(sp.ability.text, /\b(never|always|every time|guaranteed|can.t)\b/i, sp.name);
});
