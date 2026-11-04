// Fast tests for the Task 6 Phase 0 benchmark tools (tools/task6-analyze.mjs, tools/task6/stats.mjs, tools/task6-balance-gates.mjs).
// Synthetic runs only: no simulation, no game state.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedMeasures, pooled, publicOnset } from '../tools/task6-analyze.mjs';
import { pairedDiff, classify, inBand } from '../tools/task6/stats.mjs';
import { contractCheck, driftCheck } from '../tools/task6-balance-gates.mjs';
import { V4_MONSTER } from '../tools/ai-franchise-benchmark.mjs';

const ATTRS = ['speed', 'agility', 'strength', 'awareness', 'durability'];
/** One monster row in the harness-v4 column order. */
function mon(o) {
  const d = { id: 'm', club: 'A', pos: 'RB', age: 25, ovr: 60, level: 3, xp: 0, potential: 70, starter: 1, protected: 0, ageless: 0, origin: 'original', draftedYear: null, draftedRound: null,
    contractEnds: 3, contractYears: 2, salary: 30000, stage: 0, injIncidents: 0, injMissed: 0, injOpp: 9, yearsPro: 3, attrs: [60, 60, 60, 60, 60], ...o };
  return V4_MONSTER.map((c) => d[c]);
}
const club = (c, y, extra = {}) => ({ seed: 1, year: y, club: c, w: 5, l: 4, champion: false, playoffs: false, teamOvr: 65, slowed: 0, boosted: 0, weakGroups: [], capRoom: 100000, provenanceStarters: { original: 20 }, devMean: 1, evolved: 0, ...extra });
function run({ seasons }) {
  const rows = []; const v4 = { monsterColumns: V4_MONSTER, attrKeys: ATTRS, clubs: { A: { gym: null }, G: { gym: 'early' }, O: { gym: null } }, seasons: [] };
  seasons.forEach((s, i) => { const y = i + 1; rows.push(club('A', y, s.A || {}), club('G', y, s.G || {}), { seed: 1, year: y, club: 'O', owner: true, w: 4, l: 5 });
    v4.seasons.push({ year: y, ownerClub: 'O', rival: null, games: s.games || [], strategy: { A: {}, G: {} }, monsters: s.monsters }); });
  return { seed: 1, seasons: seasons.length, problemCount: 0, problems: [], rows, decisions: { trades: [], calls: [], draft: [], departures: [], arrivals: [], tradeFollow: [] }, draftOutcome: [], v4 };
}

test('ageing measures: 33+ starters, improvement after 33, physical change past the public onset', () => {
  const r = run({ seasons: [
    { monsters: [mon({ id: 'a', age: 33, ovr: 70, attrs: [70, 70, 70, 60, 60] }), mon({ id: 'b', age: 26, ovr: 64 }), mon({ id: 'c', age: 24, ovr: 55, starter: 0 })] },
    { monsters: [mon({ id: 'a', age: 34, ovr: 72, attrs: [68, 68, 68, 62, 60] }), mon({ id: 'b', age: 27, ovr: 65 }), mon({ id: 'c', age: 25, ovr: 56, starter: 0 })] },
  ] });
  const m = seedMeasures(r);
  assert.equal(m.starters33PctFinal, 50, 'one of the two AI starters is 34');
  assert.equal(m.improvingAt33Pct, 100, 'the 34-year-old improved from 70 to 72');
  assert.equal(m.physChangePastOnset, -1.5, 'RB public onset 27: only a (34) is past it; physical mean 65 → 63.5');
  assert.equal(publicOnset('QB', 80), 31); assert.equal(publicOnset('RB', 40), 26);
});

test('succession: a 30+ starter is covered by a backup 26 or under within 8, ready within 4', () => {
  const r = run({ seasons: [{ monsters: [mon({ id: 's', age: 31, ovr: 70 }), mon({ id: 'y', age: 23, ovr: 64, starter: 0 }), mon({ id: 's2', club: 'G', age: 32, ovr: 70 }), mon({ id: 'y2', club: 'G', age: 27, ovr: 69, starter: 0 })] }] });
  const m = seedMeasures(r);
  assert.equal(m.successionCoverPct, 50, 'A covered (23-year-old within 8); G not (backup is 27)'); assert.equal(m.successionReadyPct, 0, '64 is 6 below 70: not ready');
});

test('head to head: gym against ordinary AI clubs, owner games excluded, ties half', () => {
  const r = run({ seasons: [{ monsters: [mon({ id: 'a' })], games: [[1, 'G', 'A', 10, 7], [2, 'A', 'G', 7, 7], [3, 'G', 'O', 0, 21], [4, 'A', 'G', 14, 3]] }] });
  assert.equal(seedMeasures(r).gymVsOrdinaryWinPct, 50, 'won 1, tied 1, lost 1 against A; the owner game does not count');
});

test('pooled retirements by position and career length', () => {
  const r = run({ seasons: [{ monsters: [mon({ id: 'r1', age: 31, yearsPro: 9 }), mon({ id: 'r2', age: 36, yearsPro: 14 })] }, { monsters: [] }] });
  r.decisions.departures = [{ year: 2, id: 'r1', pos: 'RB', age: 31, reason: 'retired' }, { year: 2, id: 'r2', pos: 'RB', age: 36, reason: 'retired' }];
  const p = pooled([r]);
  assert.equal(p.retirementByPos.RB.n, 2); assert.equal(p.retirementByPos.RB.meanAge, 33.5); assert.equal(p.retirementByPos.RB.exceptionalPct, 50, 'base 32: 36 is +4');
  assert.equal(p.careerSeasons.p50, 14);
  assert.equal(seedMeasures(r).retirementsPerSeason, 1);
});

test('statistics: deterministic bootstrap, outcome classes, bands', () => {
  const base = { 1: 10, 2: 12, 3: 11, 4: 9 }, cand = { 1: 14, 2: 15, 3: 15, 4: 13 };
  const a = pairedDiff(base, cand), b = pairedDiff(base, cand); assert.deepEqual(a, b); assert.equal(a.diff, 3.75); assert.ok(a.lo > 0 && a.hi <= 4);
  assert.equal(classify(a, null, 'up'), 'supported'); assert.equal(classify(a, null, 'down'), 'worse');
  assert.equal(classify(a, { n: 2, diff: -1 }, 'up'), 'inconclusive', 'held-out disagrees');
  assert.equal(classify(pairedDiff(base, { 1: 11, 2: 11, 3: 12, 4: 9 }), null, 'up'), 'inconclusive');
  assert.equal(inBand(28, { min: 27, max: 30 }), true); assert.equal(inBand(31, { max: 30 }), false); assert.equal(inBand(null, { max: 1 }), null);
});

test('owner gates: the §45.6 contract and the drift check', () => {
  const s = (winPct, aiMid) => ({ summary: { winPct, aiMid, seasons: 64, fired: 0 } });
  assert.equal(contractCheck(s(57, 67.2), s(54.8, 67.1)).pass, true); assert.equal(contractCheck(s(33, 69.9), s(38.1, 70.7)).pass, false, '−5.1 points');
  const runs = (wins) => wins.map((w, i) => ({ seed: i + 1, rows: Array.from({ length: 20 }, (_, y) => ({ year: y + 1, w, l: 9 - w })) }));
  const d = driftCheck(runs([5, 5, 4, 6]), runs([5, 5, 4, 6])); assert.equal(d.s1to8.diff, 0); assert.equal(d.s1to8.gate, 'pass'); assert.equal(d.s9to20.gate, 'report only');
  assert.equal(driftCheck(runs([5, 5, 4, 6]), runs([2, 2, 1, 3])).s1to8.gate, 'fail', '3 wins in 9 fewer is −33 points');
});
