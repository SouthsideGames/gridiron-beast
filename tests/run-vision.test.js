// Phase C2 (owner-approved 2026-10-28): running-back vision (F7) and the Outside Zone redesign (F8). Plain-65 Lab plays with fixed
// seeds; every number here is a measured behaviour with margin, not a target the engine is steered to.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { play } from '../src/lab/attr-trials.js';
import { PLAYS, DEFENSE_IDS } from '../src/data/playbook.js';

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pos = (f, team, slot) => f[team].find((p) => p[0] === slot);

// ---- F7: vision
test('F7: a sharp back does not lose more on Inside Zone than an average one (26 calls, same seeds)', () => {
  const run = (aw) => { const ys = []; for (const def of DEFENSE_IDS) for (let i = 0; i < 12; i++) ys.push(play({ off: 'inside_zone', def, offSubjects: ['RB'], attr: 'awareness', value: aw, seed: 76000 + i }).yards); return ys; };
  const a50 = run(50), a95 = run(95); const neg = (ys) => ys.filter((y) => y < 0).length / ys.length;
  // v42.15.0 measured 26% -> 36% negative runs here (more cutbacks into the backside pursuit); Phase C2 measures them level.
  assert.ok(neg(a95) <= neg(a50) + 0.04, `negative runs ${(100 * neg(a50)).toFixed(1)}% -> ${(100 * neg(a95)).toFixed(1)}%`);
  assert.ok(mean(a95) >= mean(a50) - 0.1, `yards ${mean(a50).toFixed(2)} -> ${mean(a95).toFixed(2)}`);
});
test('F7: a cutback is a read, never a sure thing: some cutbacks lose yards, and a poor reader still cuts sometimes', () => {
  let cuts95 = 0, lost95 = 0, cuts50 = 0;
  for (const off of ['inside_zone', 'dive', 'power_right', 'counter']) for (const def of DEFENSE_IDS) for (let i = 0; i < 4; i++) {
    const s95 = play({ off, def, offSubjects: ['RB'], attr: 'awareness', value: 95, seed: 77000 + i });
    if (s95.events.some((e) => e.kind === 'cutback')) { cuts95++; if (s95.yards < 2) lost95++; }
    if (play({ off, def, offSubjects: ['RB'], attr: 'awareness', value: 50, seed: 77000 + i }).events.some((e) => e.kind === 'cutback')) cuts50++;
  }
  assert.ok(cuts95 > cuts50, `an aware back cuts more often (${cuts50} -> ${cuts95})`);
  assert.ok(cuts50 > 0, 'a poor reader cuts sometimes');
  assert.ok(lost95 > 0, `some of an aware back's cutbacks are stopped short (${lost95} of ${cuts95})`);
});

// ---- F8: Outside Zone
test('F8: Outside Zone meets at the mesh behind the line and attacks the edge', () => {
  let n = 0, early = 0, wide = 0;
  for (const def of DEFENSE_IDS) for (let i = 0; i < 4; i++) {
    const s = play({ off: 'outside_zone', def, attr: 'speed', value: 65, seed: 78000 + i });
    const h = s.events.find((e) => e.kind === 'handoff'); if (!h) continue; n++;
    assert.ok(h.reach <= 1.5, `${def}: handoff from ${h.reach} yd`);
    const fh = s.frames.find((f) => f.t >= h.t - 1e-6); if (fh && pos(fh, 'off', 'RB')[1] < -2 && h.t < 0.8) early++;
    const cross = s.frames.find((f) => f.t > h.t && pos(f, 'off', 'RB')[1] >= 0); if (cross && pos(cross, 'off', 'RB')[2] >= 4) wide++;
  }
  assert.ok(n >= 100, `handed off on ${n} of 104`);
  assert.ok(early / n > 0.95, `the handoff comes behind the line, early (${early} of ${n})`);
  assert.ok(wide / n > 0.6, `the back reaches the line outside the tackle box (${wide} of ${n})`);
});
test('F8: Edge Contain sets the edge against Outside Zone; inside runs are what beat it', () => {
  const ec = PLAYS.edge_contain; assert.deepEqual([ec.align.DL1[1], ec.align.DL2[1]], [-5, 5], 'the contain linemen line up outside');
  const ypc = (off, def) => mean(Array.from({ length: 16 }, (_, i) => play({ off, def, attr: 'speed', value: 65, seed: 79000 + i }).yards));
  const oz = DEFENSE_IDS.map((d) => [d, ypc('outside_zone', d)]).sort((a, b) => a[1] - b[1]); const rank = oz.findIndex(([d]) => d === 'edge_contain') + 1;
  assert.ok(rank <= 13, `Edge Contain is in the better half of the 26 calls against Outside Zone (rank ${rank}, ${oz[rank - 1][1].toFixed(2)} yd)`);
  assert.ok(ypc('power_right', 'edge_contain') > ypc('outside_zone', 'edge_contain'), 'Power gains more than Outside Zone against it');
  const some = new Set(Array.from({ length: 16 }, (_, i) => play({ off: 'outside_zone', def: 'edge_contain', attr: 'speed', value: 65, seed: 79000 + i }).yards >= 6));
  assert.ok(some.has(true), 'the edge is not a wall: Outside Zone still breaks some against it');
});

// ---- Phase C final refinements (owner-approved 2026-10-28)
const AGGRESSIVE = ['all_out', 'double_a_mug', 'cover_0', 'zone_blitz'];
test('F7 final: well short of the hole a sharp back keeps pressing Trap against pressure instead of cutting away early', () => {
  const run = (aw) => { let neg = 0, early = 0, n = 0; for (const def of AGGRESSIVE) for (let i = 0; i < 12; i++) { const s = play({ off: 'trap', def, offSubjects: ['RB'], attr: 'awareness', value: aw, seed: 86000 + i }); n++; if (s.yards < 0) neg++; if (s.events.some((e) => e.kind === 'cutback' && e.at > 3)) early++; } return { neg: neg / n, early, n }; };
  const a50 = run(50), a95 = run(95);
  // Phase C before this fix: 13 of 48 plays at Awareness 95 cut 4.5 yd short of the hole (mostly into a lane an unseen penetrator
  // was beside), and negative runs on Trap rose 7% -> 11% with Awareness.
  assert.ok(a95.early <= 3, `premature cuts at 95: ${a95.early} of ${a95.n}`);
  assert.ok(a95.neg <= a50.neg + 0.05, `negative runs ${(100 * a50.neg).toFixed(1)}% -> ${(100 * a95.neg).toFixed(1)}%`);
});
test('F7 final: an early cut is still possible, but only with a free defender across the line near the back\'s track', () => {
  let early = 0;
  for (const off of ['inside_zone', 'power_right', 'power_left', 'dive', 'counter', 'trap', 'outside_zone', 'stretch_left', 'toss_sweep']) for (const def of DEFENSE_IDS) for (let i = 0; i < 4; i++) {
    const s = play({ off, def, offSubjects: ['RB'], attr: 'awareness', value: 95, seed: 86000 + i }); const c = s.events.find((e) => e.kind === 'cutback' && e.at > 3); if (!c) continue; early++;
    const f = s.frames.filter((x) => x.t <= c.t + 1e-6).at(-1); const rb = pos(f, 'off', 'RB');
    assert.ok(f.def.some((d) => !d[3] && d[1] < 0 && d[1] > rb[1] - 1.5 && Math.abs(d[2] - rb[2]) < 6), `${off} vs ${def} seed ${86000 + i}: an early cut with nobody across the line near him`);
  }
  assert.ok(early >= 1, 'early cuts are not prohibited');
});
test('Lead block read (final): every back usually follows his engaged puller; any back may stay on the design when he sees the lane beside the block closing', () => {
  for (const aw of [50, 65, 80, 95]) { let follow = 0, stay = 0;
    for (const off of ['power_right', 'power_left', 'counter', 'trap', 'toss_sweep']) for (const def of DEFENSE_IDS) for (let i = 0; i < 4; i++) {
      const s = play({ off, def, offSubjects: ['RB'], attr: 'awareness', value: aw, seed: 86000 + i }); if (s.events.some((e) => e.kind === 'lead_read')) follow++; if (s.events.some((e) => e.kind === 'lead_pass')) stay++; }
    assert.ok(follow / (follow + stay) >= 0.8, `Awareness ${aw}: follows on ${follow} of ${follow + stay} reads`);
    assert.ok(follow + stay > 100, `Awareness ${aw}: the lead block is read (${follow + stay})`);
  }
  let stays = 0; for (const aw of [50, 95]) for (const def of DEFENSE_IDS) for (let i = 0; i < 12; i++) if (play({ off: 'power_right', def, offSubjects: ['RB'], attr: 'awareness', value: aw, seed: 87000 + i }).events.some((e) => e.kind === 'lead_pass')) stays++;
  assert.ok(stays > 0, 'staying on the design is a real choice');
});
