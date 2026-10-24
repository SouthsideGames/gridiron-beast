// Franchise lifecycle (GDD §42.1, §42.4; Phase 2): the 20-season cap, when retirement is due, the checklist, the archive and
// its Legacy summary, the read-only guard on every mutating function, and the store refusing to overwrite an archive.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as L from '../src/franchise/lifecycle.js';
import { createStore, memoryBackend } from '../src/franchise/store.js';
import { runFranchise } from '../tools/franchise-soak.mjs';

/** One real season, settled (offseason done, draft held), ready for the next: the state retirement runs from. */
const settled = (seed = 11) => { const { f, problems } = runFranchise(seed, { seasons: 1, difficulty: 'rookie' }); assert.deepEqual(problems, []); assert.ok(f.season.finished); while (f.scenes?.length) F.dismissScene(f); /* the player dismisses the achievement scenes */ return f; };
/** Pad the history to `n` completed seasons for cap tests (copies of the real season under earlier years). */
const padHistory = (f, n) => { const h = f.history[f.history.length - 1]; while (f.history.length < n) { const y = f.history[0].year - 1; f.history.unshift({ ...h, year: y, leagueStats: undefined, playoffStats: undefined }); } return f; };

test('cap: a 20th completed season blocks the next one with the retirement reason; 19 does not', () => {
  const f = settled(); padHistory(f, 19);
  assert.equal(L.mayStartSeason(f).ok, true); assert.equal(L.seasonsLeft(f), 1);
  padHistory(f, 20);
  const r = L.mayStartSeason(f); assert.equal(r.ok, false); assert.equal(r.cap, true); assert.match(r.reason, /20 seasons/);
  const n = F.startNextSeason(f); assert.equal(n.ok, false); assert.equal(n.cap, true);
  assert.equal(f.season.finished, true, 'nothing started'); assert.equal(f.history.length, 20);
});

test('due: retirement is never due inside a season; it is due after Season 20, on a request, or when the board fired the owner', () => {
  const f = settled();
  assert.equal(L.retirementDue(f), null, 'one season done: not due');
  const mid = structuredClone(f); mid.season.finished = false; padHistory(mid, 20); assert.equal(L.retirementDue(mid), null, 'a season in progress is never interrupted');
  const cap = structuredClone(f); padHistory(cap, 20); assert.equal(L.retirementDue(cap), 'season-cap');
  const vol = structuredClone(f); L.requestRetirement(vol); assert.equal(L.retirementDue(vol), 'voluntary'); L.cancelRetirement(vol); assert.equal(L.retirementDue(vol), null);
  const fired = structuredClone(f); fired.board.fired = true; assert.equal(L.retirementDue(fired), 'fired');
  // grandfathered: already beyond the cap, the current season finishes first (decision M)
  const gf = structuredClone(f); padHistory(gf, 23); gf.season.finished = false; assert.equal(L.retirementDue(gf), null); gf.season.finished = true; assert.equal(L.retirementDue(gf), 'season-cap');
});

test('archive: a settled season passes the checklist; the archive keeps every record and drops only working state', () => {
  const f = settled(); padHistory(f, 20);
  const check = L.retirementChecklist(f); assert.equal(check.ready, true, check.missing.join('; '));
  const before = { history: structuredClone(f.history), roster: structuredClone(f.roster), records: structuredClone(f.records), awards: structuredClone(f.season.awards), club: f.club, uid: f.uid };
  const r = L.finalizeArchive(f, { reason: 'season-cap', now: 1_800_000_000_000 });
  assert.equal(r.ok, true); assert.equal(r.status, 'retired'); assert.equal(f.lifecycle.status, 'retired'); assert.equal(f.lifecycle.retiredAt, 1_800_000_000_000);
  assert.deepEqual(f.history, before.history, 'history untouched'); assert.deepEqual(f.roster, before.roster, 'roster untouched'); assert.deepEqual(f.records, before.records); assert.deepEqual(f.season.awards, before.awards);
  assert.equal(f.draft, undefined); assert.equal(f.offseason, undefined); assert.deepEqual(f.scenes, []);
  const lg = f.lifecycle.legacy; assert.equal(lg.seasonsCompleted, 20); assert.equal(lg.seasons.length, 20); assert.equal(lg.club, before.club);
  assert.equal(lg.record.w, f.history.reduce((a, h) => a + h.record.w, 0), 'career wins add up from the history');
  assert.equal(lg.bestMonsters.length, Math.min(5, f.roster.length)); assert.ok(lg.bestMonsters.every((m) => f.roster.some((x) => x.id === m.id)));
  assert.equal(lg.beastBowls.appearances, null, 'not recorded by the game: shown as unavailable, never invented');
  assert.equal(L.finalizeArchive(f).ok, false, 'an archive is not archived twice');
});

test('archive: the checklist refuses an unsettled season and changes nothing', () => {
  const f = settled(); padHistory(f, 20); f.season.finished = false;
  const snap = JSON.stringify(f); const r = L.finalizeArchive(f, { reason: 'season-cap' });
  assert.equal(r.ok, false); assert.ok(r.missing.includes('The season is complete')); assert.equal(JSON.stringify(f), snap);
});

test('read-only: every mutating function refuses an archive with the read-only error; queries still answer', () => {
  const f = settled(); padHistory(f, 20); assert.ok(L.finalizeArchive(f, { reason: 'season-cap' }).ok);
  const snap = JSON.stringify(f); const failures = [];
  for (const name of F.MUTATORS) { try { F[name](f); failures.push(`${name}: did not refuse`); } catch (e) { if (e.code !== 'read-only') failures.push(`${name}: ${e.code || e.message}`); } }
  assert.deepEqual(failures, []);
  assert.equal(JSON.stringify(f), snap, 'nothing changed');
  assert.ok(F.leagueStandings(f).overall.length); assert.ok(F.summary(f).club); assert.ok(F.record(f));
  assert.ok(F.MUTATORS.length >= 80, `${F.MUTATORS.length} mutators guarded`);
});

test('fired: the board\'s dismissal archives the franchise as fired, with a Hall of Fame card only when the checklist is met', () => {
  const f = settled(); f.board.fired = true;
  const card = F.retire(f); assert.equal(card.ok, false, 'one season: not eligible for the Hall of Fame (decision L)');
  const r = L.finalizeArchive(f, { reason: L.retirementDue(f) }); assert.equal(r.ok, true); assert.equal(f.lifecycle.status, 'fired'); assert.equal(f.lifecycle.legacy.hallOfFame, null); assert.equal(f.lifecycle.legacy.reason, 'fired');
  assert.throws(() => F.startNextSeason(f), /read-only archive/);
});

test('store: the archive commits once; afterwards no different content of that franchise is ever written over it', async () => {
  const backend = memoryBackend(); const store = createStore({ backend, localStorage: null, debounce: 0 }); await store.open();
  const f = settled(); const r0 = await store.replace(f, null, {}); assert.ok(r0.ok);
  padHistory(f, 20); assert.ok(L.finalizeArchive(f, { reason: 'season-cap' }).ok);
  const r1 = await store.save(f, { immediate: true }); assert.equal(r1.ok, true, 'the archive itself is committed');
  assert.equal(r1.manifest.lifecycle.status, 'retired'); assert.ok(r1.manifest.lifecycle.legacyHeadline, 'the slot card gets the headline'); assert.equal(r1.manifest.lifecycle.legacy, undefined, 'the manifest stays slim');
  const r2 = await store.save(f, { immediate: true }); assert.equal(r2.ok, true); assert.equal(r2.unchanged, true, 'saving the same archive writes nothing');
  f.owner.first = 'Tampered'; // a missed guard somewhere: the store is the last line
  const r3 = await store.save(f, { immediate: true }); assert.equal(r3.ok, false); assert.equal(r3.error?.code, 'read-only');
  const back = await store.loadManifest(await store.readManifest()); assert.notEqual(back.owner.first, 'Tampered');
});
