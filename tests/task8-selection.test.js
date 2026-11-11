import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import * as S from '../src/franchise/t8/selection.js';
import { TEMPER_IDS } from '../src/data/temper.js';
import { formById, ATTRIBUTES } from '../src/data/beast-dex.js';
import { HISTORY_REFERENCE } from '../src/data/t8-history-reference.generated.js';
import { createRoster, careerYears } from '../src/data/monsters.js';
import { devProblems } from '../src/franchise/t8/progression.js';

test('target mapping and reference percentiles', () => {
  assert.equal(+S.targetPercentile(56).toFixed(3), 0.5); assert.equal(+S.targetPercentile(66).toFixed(2), 0.95); assert.equal(+S.targetPercentile(40).toFixed(2), 0.05);
  assert.ok(Math.abs(S.targetPercentile(59) - 0.714) < 0.005);
  const v = S.reference('emberfox:0', 'current'); assert.equal(v.length, 400); assert.deepEqual(S.reference('emberfox:0', 'current'), v);
  assert.ok(S.percentileOf('emberfox:0', 'current', v[399]) > 0.95 && S.percentileOf('emberfox:0', 'current', v[0]) < 0.05);
});

test('selection: legal individuals, targets move strength, Apex once per event and never re-selected, Temper uniform', () => {
  const rng = createRng(17); const N = 3000; const tempers = {}; let apex = 0; const hi = [], lo = [];
  for (let i = 0; i < N; i++) {
    const t = i % 2 ? 0.9 : 0.1; const r = S.selectIndividual(rng, 'glimmer:0', { target: t });
    const f = formById('glimmer:0');
    if (r.apex) { apex++; assert.equal(r.dev.apex, true); continue; }
    for (const a of ATTRIBUTES) { assert.ok(r.dev.ref[a] >= f.starting[a][0] && r.dev.ref[a] <= f.starting[a][1]); assert.ok(r.dev.potential[a] >= f.potential[a][0] && r.dev.potential[a] <= f.potential[a][1]); }
    (t > 0.5 ? hi : lo).push(r.percentile); tempers[r.dev.temper] = (tempers[r.dev.temper] || 0) + 1;
  }
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  assert.ok(mean(hi) > 0.75 && mean(lo) < 0.25, `hi ${mean(hi)} lo ${mean(lo)}`);
  assert.ok(apex > 10 && apex < 60, `apex ${apex} of ${N}: one 1% roll per event`);
  // Temper uniform among kept ordinary individuals: chi-square over 25 categories (df 24; 99.9% critical ≈ 51.2)
  const kept = N - apex; const e = kept / 25; const chi = TEMPER_IDS.reduce((s, id) => s + ((tempers[id] || 0) - e) ** 2 / e, 0);
  assert.ok(chi < 51.2, `temper chi-square ${chi.toFixed(1)}`);
  // affordability: nearest affordable kept; none affordable → the lowest; Apex never discarded by it
  const cheap = S.selectIndividual(createRng(5), 'glimmer:0', { target: 0.9, affordable: () => false }); assert.ok(cheap.apex || cheap.percentile <= 0.5);
  const forcedApex = { next: () => 0, int: (n) => 0 }; const ax = S.selectIndividual(forcedApex, 'glimmer:0', { target: 0.5, affordable: () => false }); assert.equal(ax.apex, true);
  assert.equal(S.selectIndividual(createRng(1), 'stormcrown:0', { target: 0.95 }).apex, false); // legendaries never roll Apex
});

// Owner ruling N8b D1 (option 2): founding rosters pick by the post-history rating percentile (CLUB_STRENGTH_SELECTION.md).
test('post-history selection: nine legal candidates, each lives the career first; targets move post-history strength; Temper uniform', () => {
  const form = formById('glimmer:0'); const band = { startAge: 21, seasons: 5, profile: 'starter' };
  const tempers = { 0.1: {}, 0.9: {} }; const pct = { 0.1: [], 0.9: [] }; let apex = 0; const N = 800;
  for (const t of [0.1, 0.9]) {
    const rng = createRng(t === 0.1 ? 41 : 43);
    for (let i = 0; i < N; i++) {
      const r = S.selectIndividual(rng, 'glimmer:0', { target: t, history: { id: `m_${i}`, ...band } });
      if (r.apex) { apex++; assert.equal(r.probe, null, 'an Apex result is returned before any candidate or career'); continue; }
      // legal: a legal record after a legal career (an evolution in it maps ceilings and the level-1 reference onto the next form)
      assert.deepEqual(devProblems(r.dev), []); const now = formById(r.dev.form); assert.ok(now.familyId === form.familyId);
      for (const a of ATTRIBUTES) { assert.ok(r.dev.potential[a] >= now.potential[a][0] && r.dev.potential[a] <= now.potential[a][1]); if (now === form) assert.ok(r.dev.ref[a] >= form.starting[a][0] && r.dev.ref[a] <= form.starting[a][1]); }
      assert.equal(r.probe.yearsPro, 5, 'the kept record has lived his five prior seasons'); assert.ok(r.dev.level > 1);
      pct[t].push(r.percentile); tempers[t][r.dev.temper] = (tempers[t][r.dev.temper] || 0) + 1;
    }
  }
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  assert.ok(mean(pct[0.9]) > 0.75 && mean(pct[0.1]) < 0.25, `hi ${mean(pct[0.9])} lo ${mean(pct[0.1])}`);
  assert.ok(apex < 40, `apex ${apex}: one 1% roll per event`);
  // Temper uniform at each extreme target, where an own-Temper evaluation was measured biased (chi-square 370 and 125)
  for (const t of [0.1, 0.9]) { const e = pct[t].length / 25; const chi = TEMPER_IDS.reduce((s, id) => s + ((tempers[t][id] || 0) - e) ** 2 / e, 0); assert.ok(chi < 51.2, `target ${t}: temper chi-square ${chi.toFixed(1)}`); }
  // deterministic; a zero-season band is ordinary level-1 selection; post-history selection is for the current metric only
  const run = (seasons) => S.selectIndividual(createRng(9), 'glimmer:0', { target: 0.5, history: { id: 'x', ...band, seasons } });
  assert.deepEqual(run(5).dev, run(5).dev);
  assert.deepEqual(run(0).dev, S.selectIndividual(createRng(9), 'glimmer:0', { target: 0.5 }).dev);
  assert.throws(() => S.selectIndividual(createRng(9), 'glimmer:0', { target: 0.5, metric: 'potential', history: { id: 'x', ...band } }));
});

test('post-history reference: the precomputed table is exactly the run-time computation; a stale band is recomputed', () => {
  const T = HISTORY_REFERENCE;
  assert.ok(T && T.size === S.REFERENCE_SIZE && T.seasons === S.BAND_SEASONS, 'the generated table is present (node tools/t8-history-reference.mjs)');
  for (const [f, age, p] of [['glimmer:0', 21, 'starter'], ['emberfox:0', 22, 'depth']]) {
    const row = T.bands[S.bandKey(f, age, p)]; assert.ok(row, `${f} band present`);
    const fresh = S.computeHistoryBand(f, age, p); assert.equal(row.f, S.formFingerprint(f));
    assert.deepEqual(S.decodeBand(row.v), fresh, `${f}|${age}|${p}: table equals computeHistoryBand (re-run tools/t8-history-reference.mjs if not)`);
    assert.equal(fresh.length, 7); for (const v of fresh) assert.equal(v.length, S.REFERENCE_SIZE);
    assert.ok(fresh[6][200] >= fresh[0][200], 'the median does not fall over seven prior seasons at these ages');
  }
  const key = S.bandKey('glimmer:0', 21, 'starter'); // a band whose fingerprint does not match is ignored and computed
  S.useHistoryTable({ ...T, bands: { [key]: { f: 'stale', v: Array(7).fill('1:400').join(';') } } });
  try { assert.deepEqual(S.historyReference('glimmer:0', { startAge: 21, seasons: 3, profile: 'starter' }), S.computeHistoryBand('glimmer:0', 21, 'starter')[2]); }
  finally { S.useHistoryTable(T); }
});

test('founding rosters use post-history selection: career shape fixed first, deterministic, careers consistent', () => {
  const a = createRoster(123, { quality: 56 }), b = createRoster(123, { quality: 56 });
  assert.deepEqual(a.map((m) => [m.id, m.age, m.yearsPro, m.dev]), b.map((m) => [m.id, m.age, m.yearsPro, m.dev]));
  const vets = a.filter((m) => !m.cornerstone && !m.star && !m.dev.apex && m.yearsPro > 0);
  assert.ok(vets.length > 10);
  for (const m of vets) { assert.equal(m.yearsPro, careerYears(m.id, m.age)); assert.ok(m.age - m.yearsPro === 21 || m.age - m.yearsPro === 22); assert.ok(m.level > 1, `${m.name} lived his prior seasons`); }
});
