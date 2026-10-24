// Hall of Fame cards and achievements belong to a franchise by its permanent uid (GDD §42.3, §42.5 item 5): two franchises
// with the same club name never share history; older records written by seed are linked to their franchise, never to another.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoryLocalStorage } from './helpers/cloud-sim.js';

globalThis.localStorage = memoryLocalStorage();
const H = await import('../src/franchise/hall-of-fame.js');
const A = await import('../src/franchise/achievement-store.js');
const F = await import('../src/franchise/franchise.js');
const { runFranchise } = await import('../tools/franchise-soak.mjs');

const eligible = (f) => { // make the Hall of Fame checklist hold without inventing history: the campaign counters are the checklist's inputs
  const goals = F.hallOfFameProgress(f).rows; f.campaign ||= { badges: {}, gymWins: {}, titles: 0, wins: 0, awards: 0 };
  for (const r of goals) { if (r.key === 'badges') { for (let i = 0; i < r.goal; i++) f.campaign.badges[`club-${i}`] = { year: 1 }; } else f.campaign[r.key] = r.goal; }
  assert.ok(F.hallOfFameProgress(f).eligible); return f;
};

test('two franchises with the same club name keep separate Hall of Fame cards and achievements', () => {
  H.resetHof(); A.resetAchievements();
  const a = eligible(runFranchise(21, { seasons: 1, difficulty: 'rookie' }).f); const b = eligible(runFranchise(22, { seasons: 1, difficulty: 'rookie' }).f);
  const [ua, ub] = [a.uid, b.uid]; assert.ok(ua && ub && ua !== ub, 'a franchise gets its uid at creation'); b.club = a.club; // same club name, different franchises
  const ca = F.retire(a); const cb = F.retire(b); assert.ok(ca.ok && cb.ok);
  H.addHofCard(ca.card); H.addHofCard(cb.card);
  assert.equal(ca.card.uid, ua); assert.equal(cb.card.uid, ub); assert.ok(ca.card.id.startsWith(`hof_${ua}_`));
  assert.deepEqual(H.hofCardsFor(ua).map((c) => c.id), [ca.card.id]); assert.deepEqual(H.hofCardsFor(ub).map((c) => c.id), [cb.card.id]);
  assert.deepEqual(H.hofCardsFor('uid-C'), [], 'a new franchise with the same club name inherits nothing');
  F.syncAchievementsToGlobal(a); F.syncAchievementsToGlobal(b);
  const forA = A.achievementsFor(ua), forB = A.achievementsFor(ub); assert.ok(forA.length && forB.length);
  for (const [id, e] of Object.entries(A.achievementsData().earned)) assert.ok((e.franchises || []).every((x) => x === ua || x === ub), `${id} names a franchise by uid`);
  assert.deepEqual(A.achievementsFor('uid-C'), []);
});

test('older records written by seed are linked to their own franchise only', () => {
  H.resetHof(); A.resetAchievements();
  // a card and achievements from before franchises had a uid (Phase 1 and earlier): identified by the seed
  H.addHofCard({ id: 'hof_777_abc', club: 'Old Club', retiredAt: 1 }); H.addHofCard({ id: 'hof_888_def', club: 'Other Club', retiredAt: 2 });
  A.recordAchievementGlobal('first_win', { club: 'Old Club', franchise: 777, scene: {} }); A.recordAchievementGlobal('first_win', { club: 'Other Club', franchise: 888, scene: {} });
  assert.equal(H.linkHofCards({ uid: 'uid-777', seed: 777 }), 1); assert.equal(A.linkAchievements({ uid: 'uid-777', seed: 777 }), 1);
  assert.deepEqual(H.hofCardsFor('uid-777').map((c) => c.id), ['hof_777_abc']); assert.equal(H.hallOfFame().find((c) => c.id === 'hof_888_def').uid, undefined, 'the other franchise\'s card is untouched');
  assert.deepEqual(A.achievementsData().earned.first_win.franchises.sort(), ['uid-777', 888].sort()); assert.equal(A.achievementsData().earned.first_win.count, 2, 'counts unchanged');
  assert.equal(H.linkHofCards({ uid: 'uid-777', seed: 777 }), 0, 'linking is idempotent');
  assert.equal(H.linkHofCards({ uid: 'uid-999', seed: 777 }), 0, 'an already linked card is never re-linked to another franchise');
});
