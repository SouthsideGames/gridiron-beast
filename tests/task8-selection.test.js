import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/core/rng.js';
import * as S from '../src/franchise/t8/selection.js';
import { TEMPER_IDS } from '../src/data/temper.js';
import { formById, ATTRIBUTES } from '../src/data/beast-dex.js';

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
