// Fast tests for the Task 5.5 diagnostic tools (tools/post-trading-analyze.mjs). Synthetic runs only: no simulation, no game state changed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupOf, dealTable, trading, weakResponse, franchiseExtra, callsSummary, integrity, paired, seedMetrics } from '../tools/post-trading-analyze.mjs';

const starters = { QB: [70], RB: [66], WR: [64, 63, 62], TE: [63], OL: [64, 63, 62], DL: [65, 64, 63], LB: [64, 63], CB: [64, 63], S: [64, 63], K: [60] };
const detail = (ages = 26) => Object.fromEntries(Object.entries(starters).map(([p, l]) => [p, l.map((o) => [o, ages, 0])]));
const row = (club, year, extra = {}) => ({ seed: 1, year, club, w: 5, l: 4, champion: false, playoffs: false, teamOvr: 65, target: 66, quality: 60, slowed: 0, boosted: 0, rosterSize: 36, payroll: 900000, capRoom: 150000, lineupProblems: 0, avgStarter: 64,
  weakGroups: [], starters, startersDetail: detail(), backupsDetail: Object.fromEntries(Object.keys(starters).map((p) => [p, []])), picksNext: [1, 1, 1], picksNext2: [1, 1, 1], provenanceStarters: { original: 19 }, meanAge: 25, starterAge: 26, ...extra });
const deal = (extra = {}) => ({ year: 2, week: 0, kind: 'swap', A: 'A', B: 'B', toA: 'm1', toAPos: 'OL', toAOvr: 66, toAAge: 25, toAStarter: true, toBAll: ['m2'], toBAllPos: ['DL'], picks: [], mvRatio: 1.05, ratio: 1,
  aDepthBefore: { n: 4, floor: 55, mean: 57, backup: 54 }, aDepthAfter: { n: 4, floor: 62, mean: 64, backup: 55 }, aMeanBefore: 63, aMeanAfter: 64, bMeanBefore: 64, bMeanAfter: 64, bDepthBefore: { n: 5, floor: 62, mean: 63, backup: 66 }, bDepthAfter: { n: 4, floor: 62, mean: 63, backup: 60 },
  toASalary: 30000, toBSalaries: [28000], aCapBefore: 150000, aCapAfter: 148000, toAProtected: false, toBProtected: false,
  cfALineup: [1230, 1220], cfAPos: [[62, 64, 4], [55, 57, 4]], cfBLineup: [1250, 1250], cfBPos: [[62, 63, 4], [62, 63, 5]], ...extra });
const run = (seed, { trades = [deal()], rows = null, calls = [] } = {}) => ({ seed, seasons: 2, problemCount: 0, problems: [],
  rows: rows || [row('A', 1, { seed, weakGroups: ['OL'] }), row('B', 1, { seed, champion: true, w: 8, l: 1 }), row('A', 2, { seed }), row('B', 2, { seed }), { seed, year: 1, club: 'O', owner: true, w: 4, l: 5 }],
  decisions: { trades, calls, draft: [], tradeFollow: [[0, 2, 'A', 'm1', 'A', 1, 1, 66, 25]] }, draftOutcome: [] });

test('samples: Stage B is split by seed range, D by scenario', () => {
  assert.equal(groupOf('B', 5), 'B1'); assert.equal(groupOf('B', 25), 'B21'); assert.equal(groupOf('B', 45), 'Bx'); assert.equal(groupOf('C', 106), 'C'); assert.equal(groupOf('D', 1, 'aging'), 'D:aging');
});

test('a deal is measured against its own undoing, without the valuation', () => {
  const [d] = dealTable([run(1)]);
  assert.equal(d.cfLineupGain, 10); assert.equal(d.cfPosFloorGain, 7); assert.equal(d.cfSellerLineupChange, 0);
  assert.equal(d.cfWeakWithout, true, 'OL mean 57 is 6+ below the club mean 1220/19 = 64.2'); assert.equal(d.cfWeakWith, false);
  assert.equal(d.weakAtSeasonEnd, false); assert.equal(d.withA0, true); assert.equal(d.startA0, true);
  const t = trading([run(1)]); assert.equal(t.needCf.resolvedByDealPct, 100); assert.equal(t.quality.all.cfNoLineupGainPct, 0); assert.equal(t.integrity.protectedMoved, 0);
});

test('weak groups: traded-for positions are compared with positions left alone', () => {
  const w = weakResponse([run(1)]);
  assert.equal(w.traded.n, 1, 'A was weak at OL after season 1 and bought an OL for season 2'); assert.equal(w.traded.resolvedPct, 100); assert.equal(w.notTraded.n, 0);
});

test('integrity flags a protected monster moved and a deal or an offer past the Week 8 deadline', () => {
  const r = run(1, { trades: [deal({ toAProtected: true }), deal({ week: 9 })], calls: [{ year: 2, week: 9, offseason: false, team: 'B', kind: 'sell', pos: 'S', sends: [{ pos: 'S', ovr: 60, age: 25 }], asks: [], give: ['3R2'], sendPicks: [], ownerFloorAtPos: 55, wouldStart: true }] });
  const i = integrity([r]); assert.equal(i.protectedMoved, 1); assert.equal(i.aiDealsAfterDeadline, 1); assert.equal(i.offersAfterDeadline, 1);
  assert.equal(callsSummary([r]).sendsWouldStartPct, 100);
});

test('franchise extras: draft capital and succession cover for ageing starters', () => {
  const old = detail(31); const rows = [row('A', 1, { picksNext: [0, 1, 2], startersDetail: old, backupsDetail: { ...Object.fromEntries(Object.keys(starters).map((p) => [p, []])), QB: [[66, 24, 75, 0]] } }), row('A', 2)];
  const x = franchiseExtra([run(1, { rows })]);
  assert.equal(x.capital.r1NoneNextPct, 50); assert.ok(x.succession.coveredPct > 0 && x.succession.coveredPct < 100, 'only the QB has a young backup within 8');
});

test('paired differences are deterministic and the interval brackets the mean difference', () => {
  const base = [run(1), run(2), run(3)]; const nw = [run(1, { trades: [deal(), deal()] }), run(2, { trades: [deal(), deal(), deal()] }), run(3, { trades: [deal(), deal()] })];
  const a = paired(base, nw), b = paired(base, nw);
  assert.deepEqual(a.metrics, b.metrics);
  const m = a.metrics.tradesPerSeason; assert.ok(m.diff > 0 && m.lo <= m.diff && m.diff <= m.hi); assert.equal(m.up, 3);
  assert.equal(seedMetrics(run(1)).distinctChampions, 1);
});
