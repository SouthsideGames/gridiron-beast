// Task 8 M3: Earth and Ice football ability contracts (docs/task8/M3_ABILITY_BRIEF.md), on the real engine and the real game rules.
// Probabilities (B12): no test asserts a rate. Guaranteed behaviour is asserted on every sampled play; sample sizes are fixed below
// (SEEDS) and a test that needs the triggering situation asserts a frozen minimum count of observed cases.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abilityPlay, evs } from './tools/ability-sim.js';
import { lineup } from './tools/lineup.js';
import * as R from '../src/sim/rules.js';
import { OFFENSE_IDS, DEFENSE_IDS } from '../src/data/playbook.js';
import { contractOf, registeredFamilies } from '../src/sim/abilities/registry.js';
import '../src/sim/abilities/index.js';

const SEEDS = 60; // frozen sample size per engine scenario
const EARTH_ICE = ['pebble', 'rockram', 'boulderox', 'stoneguard', 'terrabull', 'titanolith', 'snowmoth', 'hailfang', 'frostclaw', 'icehorn', 'glaciron', 'glacivern'];
const range = (n) => Array.from({ length: n }, (_, i) => i + 1);
const frameAt = (r, t) => r.frames.find((f) => f.t >= t - 1e-9 && !f.motion) || r.frames[r.frames.length - 1];
const posOf = (f, side, slot) => { const row = f[side].find((x) => x[0] === slot); return row ? { x: row[1], y: row[2] } : null; };
const stunnedSlot = () => ({ id: 'stunned', strength: 1, originalStrength: 1, remaining: 1, applications: 1, appliedThisUnit: false, restOfPlay: false, sourceId: null, abilityId: null });
const slowedSlot = () => ({ id: 'slowed', strength: 10, originalStrength: 10, remaining: 2, applications: 1, appliedThisUnit: false, restOfPlay: false, sourceId: null, abilityId: null });

test('Earth and Ice: all twelve families registered with their Dex football ability ids; legacy effects are not reachable', () => {
  const ids = { pebble: 'EAR-01-F', rockram: 'EAR-02-F', boulderox: 'EAR-03-F', stoneguard: 'EAR-04-F', terrabull: 'EAR-05-F', titanolith: 'EAR-06-F', snowmoth: 'ICE-01-F', hailfang: 'ICE-02-F', frostclaw: 'ICE-03-F', icehorn: 'ICE-04-F', glaciron: 'ICE-05-F', glacivern: 'ICE-06-F' };
  for (const f of EARTH_ICE) { assert.ok(registeredFamilies().includes(f), f); assert.equal(contractOf(f).abilityId, ids[f]); }
  // legacy Landslide (+2 yards), Permafrost (-1 yard), Glacier Wall (sack denial) never fire for the registered families
  for (const seed of range(20)) {
    const r = abilityPlay({ seed, off: 'inside_zone', place: { off: { LG: { species: 'titanolith' }, RG: { species: 'glaciron' } }, def: { DL1: { species: 'icehorn' }, LB1: { species: 'frostclaw' } } } });
    assert.ok(!r.events.some((e) => ['falls_forward', 'stuffed', 'sack_denied'].includes(e.kind)), `seed ${seed}`);
  }
});

// ------------------------------------------------------------------------------------------------ EAR-01-F Clean Sweep (pebble)
test('Clean Sweep: a banked guarantee makes his first engagement a guaranteed pancake (no rolls), spends the guarantee, and earns none', () => {
  let n = 0;
  for (const seed of range(SEEDS)) {
    const t8 = { status: {}, ability: { o_LG: { banked: true } } };
    const r = abilityPlay({ seed, off: ['inside_zone', 'quick_slants'][seed % 2], place: { off: { LG: { species: 'pebble', form: `pebble:${seed % 3}`, mastery: seed % 4 } } }, t8 });
    const pk = r.events.filter((e) => e.kind === 'pancake' && e.by === 'LG');
    if (!r.stats.blockers.LG) { assert.equal(t8.ability.o_LG.banked, true, 'no engagement: kept'); continue; }
    n++; assert.equal(pk.length, 1); assert.equal(pk[0].guaranteed, true); assert.equal(evs(r, 'EAR-01-F', 'ability').length, 1);
    assert.equal(t8.ability.o_LG.banked, false, 'spent; a guaranteed pancake never earns another'); assert.equal(t8.mastery.o_LG.executions, 1);
    assert.equal(r.stats.blockers.LG.pancakes, 1);
  }
  assert.ok(n >= 30, `engagements observed ${n}`);
});

test('Clean Sweep: a target whose status blocks Knocked Down is skipped and the guarantee kept; kickoffs and two-point tries neither use nor earn', () => {
  let skipped = 0;
  for (const seed of range(30)) {
    const status = Object.fromEntries(['DL1', 'DL2', 'DL3', 'LB1', 'LB2', 'CB1', 'CB2', 'FS', 'SS'].map((s) => [`d_${s}`, slowedSlot()]));
    const t8 = { status, ability: { o_LG: { banked: true } } };
    const r = abilityPlay({ seed, place: { off: { LG: { species: 'pebble' } } }, t8 });
    assert.equal(t8.ability.o_LG.banked, true); assert.ok(!r.events.some((e) => e.kind === 'pancake' && e.guaranteed));
    if (evs(r, 'EAR-01-F', 'ability_skip').length) skipped++;
  }
  assert.ok(skipped >= 10, `skips observed ${skipped}`);
  for (const seed of range(20)) {
    const t8 = { status: {}, ability: { o_LG: { banked: true } } };
    abilityPlay({ seed, place: { off: { LG: { species: 'pebble' } } }, t8, options: { twoPoint: true } });
    assert.equal(t8.ability.o_LG.banked, true, 'two-point: kept, unused');
  }
});

test('Clean Sweep: an ordinary pancake on an offensive scrimmage play banks one guarantee (maximum one); none on a two-point try', () => {
  let earned = 0;
  for (const seed of range(200)) {
    const t8 = { status: {}, ability: { o_LG: { banked: false } } };
    const r = abilityPlay({ seed, place: { off: { LG: { species: 'pebble', attrs: { strength: 99, blocking: 99 } } } }, t8 });
    const ordinary = (r.stats.blockers.LG?.pancakes || 0) > 0;
    assert.equal(t8.ability.o_LG.banked, ordinary, `seed ${seed}`); if (ordinary) earned++;
    const t2 = { status: {}, ability: { o_LG: { banked: false } } };
    const r2 = abilityPlay({ seed, place: { off: { LG: { species: 'pebble', attrs: { strength: 99, blocking: 99 } } } }, t8: t2, options: { twoPoint: true } });
    assert.equal(t2.ability.o_LG.banked, false, 'never on a two-point try'); void r2;
  }
  assert.ok(earned >= 3, `ordinary pancakes ${earned}`);
});

// ------------------------------------------------------------------------------------------------ EAR-02-F Stonewall Swat (rockram)
test('Stonewall Swat: armed, the first released forward pass is broken up (ordinary incompletion, no catch, PBU to him); the bar empties', () => {
  let n = 0;
  for (const seed of range(SEEDS)) {
    const t8 = { status: {}, ability: { d_LB1: { bar: 3 } } };
    const r = abilityPlay({ seed, off: ['quick_slants', 'deep_post', 'pa_post', 'smash'][seed % 4], place: { def: { LB1: { species: 'rockram', mastery: seed % 4 } } }, t8 });
    const thrown = r.events.some((e) => e.kind === 'throw');
    if (!thrown) { assert.equal(t8.ability.d_LB1.bar, 3, 'no release: ready'); continue; }
    n++; assert.equal(r.result, 'incomplete'); assert.equal(r.stats.pbuBy, 'LB1'); assert.equal(r.stats.receiver, null); assert.equal(r.turnover, false);
    assert.equal(t8.ability.d_LB1.bar, 0, 'launch empties; the activation play earns no charge'); assert.equal(evs(r, 'EAR-02-F', 'ability').length, 1);
  }
  assert.ok(n >= 40, `releases ${n}`);
  for (const seed of range(20)) { const t8 = { status: {}, ability: { d_LB1: { bar: 3 } } }; abilityPlay({ seed, off: 'inside_zone', place: { def: { LB1: { species: 'rockram' } } }, t8 }); assert.equal(t8.ability.d_LB1.bar, 3, 'runs keep readiness'); }
});

test('Stonewall Swat: Stunned at release prevents the launch and keeps the bar; with two armed users lineup order picks one, the other stays full', () => {
  for (const seed of range(20)) {
    const t8 = { status: { d_LB1: stunnedSlot() }, ability: { d_LB1: { bar: 3 } } };
    const r = abilityPlay({ seed, off: 'quick_slants', place: { def: { LB1: { species: 'rockram' } } }, t8 });
    assert.equal(t8.ability.d_LB1.bar, 3); assert.equal(evs(r, 'EAR-02-F', 'ability').length, 0);
  }
  let n = 0;
  for (const seed of range(30)) {
    const t8 = { status: {}, ability: { d_LB1: { bar: 3 }, d_SS: { bar: 3 } } };
    const r = abilityPlay({ seed, off: 'quick_slants', def: 'cover_3', place: { def: { LB1: { species: 'rockram' }, SS: { species: 'rockram' } } }, t8 });
    if (!r.events.some((e) => e.kind === 'throw')) continue; n++;
    assert.equal(t8.ability.d_LB1.bar, 0, 'LB1 is first in lineup order'); assert.equal(t8.ability.d_SS.bar, 3); assert.equal(r.stats.pbuBy, 'LB1');
  }
  assert.ok(n >= 15);
});

test('Stonewall Swat charging: a participating defensive play allowing <= 3/4/5/6 yards (by mastery) adds one; opponent TDs and two-point tries never', () => {
  const MAX = [3, 4, 5, 6];
  for (const m of [0, 3]) for (const seed of range(SEEDS)) {
    const t8 = { status: {}, ability: { d_LB1: { bar: 1 } } };
    const r = abilityPlay({ seed, off: ['inside_zone', 'quick_slants', 'deep_post'][seed % 3], place: { def: { LB1: { species: 'rockram', mastery: m } } }, t8 });
    const gain = r.stats.interceptor ? 0 : r.yards; const q = !(r.result === 'touchdown' && !r.stats.defensiveScore) && gain <= MAX[m];
    assert.equal(t8.ability.d_LB1.bar, q ? 2 : 1, `m${m} seed ${seed}: ${r.result} ${r.yards}`);
  }
  for (const seed of range(10)) { const t8 = { status: {}, ability: { d_LB1: { bar: 1 } } }; abilityPlay({ seed, place: { def: { LB1: { species: 'rockram' } } }, t8, options: { twoPoint: true } }); assert.equal(t8.ability.d_LB1.bar, 1); }
});

// ------------------------------------------------------------------------------------------------ EAR-03-F Stone Charge (boulderox)
test('Stone Charge: a designed carry with a defender within three yards ahead commits his heading; cooldown 5/4/3/2 spent at activation; no break granted', () => {
  let n = 0;
  for (const seed of range(SEEDS)) {
    const m = seed % 4; const t8 = { status: {}, ability: {} };
    const r = abilityPlay({ seed, off: ['inside_zone', 'dive', 'power_right', 'outside_zone'][seed % 4], place: { off: { RB: { species: 'boulderox', mastery: m } } }, t8 });
    assert.ok(!r.events.some((e) => e.kind === 'broken_tackle' && e.contract === 'boulderox'), 'no automatic tackle break');
    const act = evs(r, 'EAR-03-F', 'ability'); assert.ok(act.length <= 1);
    if (!act.length) { assert.equal(t8.ability.o_RB?.cd ?? 0, 0); continue; }
    n++; assert.equal(t8.ability.o_RB.cd, [5, 4, 3, 2][m], 'spent at activation; the activation play does not count');
    assert.ok(evs(r, 'EAR-03-F', 'stone_charge').length <= 1, 'one contact attempt');
    // the heading is held: the next frames move along one line from the activation spot
    const f0 = frameAt(r, act[0].t), f1 = frameAt(r, act[0].t + 0.2), f2 = frameAt(r, act[0].t + 0.3);
    const p0 = posOf(f0, 'off', 'RB'), p1 = posOf(f1, 'off', 'RB'), p2 = posOf(f2, 'off', 'RB');
    if (r.elapsed > act[0].t + 0.35 && Math.hypot(p2.x - act[0].x, p2.y - act[0].y) < 2.5 && !evs(r, 'EAR-03-F', 'stone_charge').some((e) => e.t <= act[0].t + 0.3)) {
      const a1 = Math.atan2(p1.y - p0.y, p1.x - p0.x), a2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      assert.ok(Math.abs(a1 - a2) < 0.35, `seed ${seed}: heading held (${a1.toFixed(2)} vs ${a2.toFixed(2)})`);
    }
  }
  assert.ok(n >= 30, `activations ${n}`);
});

test('Stone Charge: not while cooling down, not on passes, receptions or two-point tries; the cooldown counts subsequent offensive plays', () => {
  for (const seed of range(20)) {
    const t8 = { status: {}, ability: { o_RB: { cd: 3 } } };
    const r = abilityPlay({ seed, off: 'inside_zone', place: { off: { RB: { species: 'boulderox' } } }, t8 });
    assert.equal(evs(r, 'EAR-03-F', 'ability').length, 0); assert.equal(t8.ability.o_RB.cd, 2);
    const t2 = { status: {}, ability: {} };
    const r2 = abilityPlay({ seed, off: 'rb_screen', place: { off: { RB: { species: 'boulderox' } } }, t8: t2, options: { forcedTarget: 'RB' } });
    assert.equal(evs(r2, 'EAR-03-F', 'ability').length, 0, 'no receptions');
    const t3 = { status: {}, ability: {} };
    const r3 = abilityPlay({ seed, off: 'inside_zone', place: { off: { RB: { species: 'boulderox' } } }, t8: t3, options: { twoPoint: true } });
    assert.equal(evs(r3, 'EAR-03-F', 'ability').length, 0, 'no two-point tries');
  }
});

// ------------------------------------------------------------------------------------------------ EAR-05-F Stone Screen (terrabull)
test('Stone Screen: a reception five or more yards past the line raises a 3 x 0.5 yd wall one yard beside him on the nearest defender\'s side; cooldown 5/4/3/2', () => {
  let n = 0, shallow = 0;
  for (const seed of range(120)) {
    const m = seed % 4; const t8 = { status: {}, ability: {} };
    const r = abilityPlay({ seed, off: ['te_seam', 'y_cross', 'stick', 'flood'][seed % 4], place: { off: { TE: { species: 'terrabull', mastery: m } } }, t8, options: { forcedTarget: 'TE' } });
    const made = evs(r, 'EAR-05-F', 'ability');
    if (r.stats.receiver !== 'TE' || r.stats.catchX < 5) { assert.equal(made.length, 0); assert.equal(t8.ability.o_TE?.cd ?? 0, 0); if (r.stats.receiver === 'TE') shallow++; continue; }
    const caughtAt = r.events.find((e) => e.kind === 'catch').t;
    if (!made.length && r.elapsed <= caughtAt + 1e-9) continue; // the catch itself ended the play (touchdown, sideline): no live snap after it
    if (!made.length) { assert.equal(evs(r, 'EAR-05-F', 'ability_skip').length, 1, 'illegal placement keeps readiness'); assert.equal(t8.ability.o_TE?.cd ?? 0, 0); continue; }
    n++; const w = made[0].wall; assert.equal(t8.ability.o_TE.cd, [5, 4, 3, 2][m]);
    assert.ok(Math.abs(w.x1 - w.x0 - 3) < 1e-9 && Math.abs(w.y1 - w.y0 - 0.5) < 1e-9, 'three wide, half a yard thick');
    const f = frameAt(r, made[0].t), te = posOf(f, 'off', 'TE');
    const near = made[0].wallSide > 0 ? w.y0 : w.y1; assert.ok(Math.abs(Math.abs(near - te.y) - 1.35) < 0.5, 'one-yard gap beyond his body');
    assert.ok(r.obstacles?.some((o) => o.kind === 'rect' && o.ability === 'EAR-05-F'));
  }
  assert.ok(n >= 5 && shallow >= 1, `walls ${n}, shallow catches ${shallow}`);
});

// ------------------------------------------------------------------------------------------------ EAR-06-F Landslide (titanolith)
test('Landslide: at the first eligible snap of a possession every defender aligned within two yards is pushed 2/2.5/3/3.5 yards back, no contest; once per possession', () => {
  for (const seed of range(30)) {
    const m = seed % 4, push = [2, 2.5, 3, 3.5][m]; const t8 = { status: {}, ability: {} };
    const r = abilityPlay({ seed, off: ['quick_slants', 'inside_zone'][seed % 2], place: { off: { LG: { species: 'titanolith', mastery: m } } }, t8, options: { memory: { drive: 'home@0', used: {} } } });
    const e = evs(r, 'EAR-06-F', 'ability'); assert.equal(e.length, 1); assert.equal(e[0].push, push);
    const f0 = r.frames.find((f) => !f.motion); const fe = frameAt(r, push / 8 + 0.05);
    const front = f0.def.filter((d) => d[1] > 0 && d[1] <= 2).map((d) => d[0]); assert.deepEqual([...e[0].victims].sort(), front.sort());
    for (const s of front) { const a = posOf(f0, 'def', s), b = posOf(fe, 'def', s); assert.ok(b.x >= a.x + push - 0.6, `seed ${seed} ${s}: ${a.x} -> ${b.x}`); }
    assert.equal(t8.ability.o_LG.usedDrive, 'home@0');
    const r2 = abilityPlay({ seed: seed + 100, place: { off: { LG: { species: 'titanolith', mastery: m } } }, t8, options: { memory: { drive: 'home@0', used: {} } } });
    assert.equal(evs(r2, 'EAR-06-F', 'ability').length, 0, 'spent for this possession');
    const r3 = abilityPlay({ seed: seed + 200, place: { off: { LG: { species: 'titanolith', mastery: m } } }, t8, options: { memory: { drive: 'away@9', used: {} } } });
    assert.equal(evs(r3, 'EAR-06-F', 'ability').length, 1, 'a new possession');
  }
});

test('Landslide: Stunned prevents activation and keeps the use; two-point tries are excluded', () => {
  const t8 = { status: { o_LG: stunnedSlot() }, ability: {} };
  const r = abilityPlay({ seed: 3, place: { off: { LG: { species: 'titanolith' } } }, t8, options: { memory: { drive: 'home@0', used: {} } } });
  assert.equal(evs(r, 'EAR-06-F', 'ability').length, 0); assert.equal(t8.ability.o_LG.usedDrive, null);
  delete t8.status.o_LG;
  const r2 = abilityPlay({ seed: 4, place: { off: { LG: { species: 'titanolith' } } }, t8, options: { memory: { drive: 'home@0', used: {} } } });
  assert.equal(evs(r2, 'EAR-06-F', 'ability').length, 1, 'a later snap of the same possession');
  const t2 = { status: {}, ability: {} };
  const r3 = abilityPlay({ seed: 5, place: { off: { LG: { species: 'titanolith' } } }, t8: t2, options: { twoPoint: true, memory: { drive: 'home@0', used: {} } } });
  assert.equal(evs(r3, 'EAR-06-F', 'ability').length, 0);
});

// ------------------------------------------------------------------------------------------------ ICE-02-F Frost Nip (hailfang)
test('Frost Nip: a snowball at his tracked receiver (two to four yards away, before release) spends the cooldown; Slowed 15/20% only if still eligible at impact', () => {
  let fired = 0, slowed = 0;
  for (const seed of range(SEEDS)) {
    const st = seed % 2, m = seed % 4; const t8 = { status: {}, ability: {} };
    const r = abilityPlay({ seed, off: ['quick_slants', 'smash', 'mesh', 'levels', 'deep_post'][seed % 5], def: seed % 3 ? 'cover_1' : 'cover_3', place: { def: { CB1: { species: 'hailfang', form: `hailfang:${st}`, mastery: m } } }, t8 });
    const f = evs(r, 'ICE-02-F', 'ability'); assert.ok(f.length <= 1);
    if (!f.length) { assert.equal(t8.ability.d_CB1?.cd ?? 0, 0); continue; }
    fired++; assert.equal(t8.ability.d_CB1.cd, [5, 4, 3, 2][m], 'firing spends readiness');
    const sl = r.events.filter((e) => e.kind === 'status' && e.status === 'slowed' && e.by === 'CB1');
    const cancel = evs(r, 'ICE-02-F', 'ability_cancel');
    assert.equal(sl.length + cancel.length, 1, `seed ${seed}: exactly one outcome`);
    if (sl.length && sl[0].accepted) { slowed++; const s = t8.status[`o_${f[0].victim}`]; assert.equal(s.id, 'slowed'); assert.equal(s.strength, [15, 20][st]); assert.equal(s.restOfPlay, true); assert.equal(s.remaining, 0, 'current play only'); }
  }
  assert.ok(fired >= 20 && slowed >= 3, `fired ${fired}, slowed ${slowed}`);
});

test('Frost Nip: Stunned prevents activation and keeps readiness; no firing while cooling down; the cooldown counts subsequent defensive plays', () => {
  for (const seed of range(20)) {
    const t8 = { status: { d_CB1: stunnedSlot() }, ability: {} };
    const r = abilityPlay({ seed, off: 'smash', def: 'cover_1', place: { def: { CB1: { species: 'hailfang' } } }, t8 });
    assert.equal(evs(r, 'ICE-02-F', 'ability').length, 0); assert.equal(t8.ability.d_CB1?.cd ?? 0, 0);
    const t2 = { status: {}, ability: { d_CB1: { cd: 2 } } };
    const r2 = abilityPlay({ seed, off: 'smash', def: 'cover_1', place: { def: { CB1: { species: 'hailfang' } } }, t8: t2 });
    assert.equal(evs(r2, 'ICE-02-F', 'ability').length, 0); assert.equal(t2.ability.d_CB1.cd, 1);
  }
});

// ------------------------------------------------------------------------------------------------ ICE-03-F Snowfall Slam (frostclaw)
test('Snowfall Slam: a full bar summons two non-overlapping two-yard snowballs in the five-yard backfield at the snap; he is held until they land', () => {
  const STUN = [20, 25, 30, 35]; const counts = { hit: 0, crumbled: 0, obstacle: 0 };
  for (const seed of range(SEEDS)) {
    const m = seed % 4; const t8 = { status: {}, ability: { d_LB1: { bar: 3 } } };
    const r = abilityPlay({ seed, off: ['quick_slants', 'inside_zone'][seed % 2], place: { def: { LB1: { species: 'frostclaw', mastery: m } } }, t8 });
    const s = evs(r, 'ICE-03-F', 'ability'); assert.equal(s.length, 1); assert.equal(t8.ability.d_LB1.bar, 0, 'the summon empties the bar; the activation play earns none');
    const [a, b] = s[0].markers; assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) >= 2 - 1e-9, 'non-overlapping');
    for (const p of s[0].markers) assert.ok(p[0] >= -5 + 1 - 1e-9 && p[0] <= -1 + 1e-9, 'whole footprint between the line and five yards back');
    const p0 = posOf(r.frames.find((f) => !f.motion), 'def', 'LB1'), pl = posOf(frameAt(r, 0.55), 'def', 'LB1');
    if (r.elapsed > 0.6) assert.ok(Math.hypot(pl.x - p0.x, pl.y - p0.y) < 0.3, 'held through the landing');
    const land = evs(r, 'ICE-03-F', 'snowball'); if (r.elapsed < 0.6) continue; assert.equal(land.length, 2);
    for (const l of land) {
      counts[l.result]++;
      if (l.result !== 'hit') assert.ok(!r.events.some((e) => e.kind === 'status' && e.by === 'LB1' && l.victims.includes(e.victim)));
      if (l.result === 'obstacle') {
        assert.ok(r.obstacles.some((o) => o.kind === 'circle' && Math.abs(o.x - l.x) < 0.01 && Math.abs(o.y - l.y) < 0.01));
        for (const f of r.frames.filter((f) => f.t > l.t + 0.05)) for (const side of ['off', 'def']) for (const row of f[side]) assert.ok(Math.hypot(row[1] - l.x, row[2] - l.y) >= 1 + 0.35 - 0.06, `seed ${seed}: ${row[0]} inside an obstacle`);
      }
    }
    for (const e of r.events.filter((e) => e.kind === 'status' && e.status === 'stunned' && e.by === 'LB1')) { if (e.accepted) { assert.equal(t8.status[`o_${e.victim}`].strength, STUN[m]); assert.equal(t8.status[`o_${e.victim}`].restOfPlay, true); } }
  }
  assert.ok(counts.obstacle >= 20, JSON.stringify(counts));
});

test('Snowfall Slam charging: plays allowing <= 3 yards add one (max one summon banked); touchdowns and two-point tries never', () => {
  for (const seed of range(SEEDS)) {
    const t8 = { status: {}, ability: { d_LB1: { bar: 2 } } };
    const r = abilityPlay({ seed, off: ['inside_zone', 'quick_slants', 'deep_post'][seed % 3], place: { def: { LB1: { species: 'frostclaw' } } }, t8 });
    const gain = r.stats.interceptor ? 0 : r.yards; const q = !(r.result === 'touchdown' && !r.stats.defensiveScore) && gain <= 3;
    assert.equal(t8.ability.d_LB1.bar, q ? 3 : 2, `seed ${seed}`);
    const t2 = { status: {}, ability: { d_LB1: { bar: 2 } } }; abilityPlay({ seed, place: { def: { LB1: { species: 'frostclaw' } } }, t8: t2, options: { twoPoint: true } }); assert.equal(t2.ability.d_LB1.bar, 2);
  }
});

// ------------------------------------------------------------------------------------------------ ICE-05-F Cold Snap (glaciron)
test('Cold Snap: an engaged blocker suppresses the first enemy activation within three yards for the play; the enemy keeps its readiness; cooldown 5/4/3/2', () => {
  let n = 0;
  for (const seed of range(SEEDS)) {
    const m = seed % 4; const t8 = { status: {}, ability: { d_DL1: { bar: 3 }, d_DL2: { bar: 3 } } };
    const r = abilityPlay({ seed, off: 'quick_slants', place: { off: { LG: { species: 'glaciron', mastery: m }, RG: { species: 'glaciron' } }, def: { DL1: { species: 'rockram' }, DL2: { species: 'rockram' } } }, t8 });
    for (const e of evs(r, 'ICE-05-F', 'ability')) {
      n++; const g = `o_${e.by}`, v = `d_${e.victim}`; assert.equal(t8.ability[g].cd, [5, 4, 3, 2][e.by === 'LG' ? m : 0]);
      assert.equal(t8.ability[v].bar, 3, 'existing readiness intact, nothing spent'); assert.equal(evs(r, 'EAR-02-F', 'ability').filter((x) => x.by === e.victim).length, 0);
      const f = frameAt(r, e.t); assert.ok(Math.hypot(posOf(f, 'off', e.by).x - posOf(f, 'def', e.victim).x, posOf(f, 'off', e.by).y - posOf(f, 'def', e.victim).y) <= 3.5, 'within the aura');
    }
    assert.ok(evs(r, 'ICE-05-F', 'ability').length <= 2);
  }
  assert.ok(n >= 10, `suppressions ${n}`);
  for (const seed of range(20)) { // cooling down: no suppression, the enemy acts normally
    const t8 = { status: {}, ability: { o_LG: { cd: 2 }, d_DL1: { bar: 3 } } };
    const r = abilityPlay({ seed, off: 'quick_slants', place: { off: { LG: { species: 'glaciron' } }, def: { DL1: { species: 'rockram' } } }, t8 });
    assert.equal(evs(r, 'ICE-05-F', 'ability').length, 0); assert.equal(t8.ability.o_LG.cd, 1);
    if (r.events.some((e) => e.kind === 'throw')) assert.equal(r.stats.pbuBy, 'DL1');
  }
});

// ------------------------------------------------------------------------------------------------ ICE-04-F Permafrost (icehorn), engine side
test('Permafrost: a personal sack or tackle for loss while ready banks one backfield Ice zone; zero-yard stops and other plays do not', () => {
  let banked = 0; const weak = { species: 'weakling', attrs: { blocking: 1, strength: 1, agility: 1 } };
  for (const seed of range(150)) {
    const t8 = { status: {}, ability: {} };
    const r = abilityPlay({ seed, off: ['quick_slants', 'inside_zone', 'dive'][seed % 3], def: 'all_out', place: { off: { LG: weak, RG: weak, C: weak, TE: weak }, def: { DL3: { species: 'icehorn', attrs: { speed: 99, tackling: 99, agility: 99, strength: 99 } } } }, t8, options: { offenseSide: 'home' } });
    const S = r.stats, mine = S.tackler === 'DL3' || S.assistBy === 'DL3';
    const q = (r.result === 'sack' && S.tackler === 'DL3') || (['tackle', 'safety'].includes(r.result) && mine && Math.round(r.yards) < 0);
    const p = t8.fields?.pending || []; assert.equal(p.length, q ? 1 : 0, `seed ${seed}: ${r.result} ${r.yards} ${S.tackler}`);
    if (q) { banked++; assert.deepEqual({ type: p[0].type, strength: p[0].strength, lifetime: p[0].lifetime, width: p[0].width, length: p[0].length, place: p[0].place, side: p[0].side, ownerTeam: p[0].ownerTeam }, { type: 'Ice', strength: 30, lifetime: 2, width: 10, length: 6, place: 'backfield', side: 'def', ownerTeam: 'away' }); }
  }
  assert.ok(banked >= 10, `banked ${banked}`);
});

test('Permafrost: never earned while cooling down, while one is pending, or during its creation play', () => {
  const weak = { species: 'weakling', attrs: { blocking: 1, strength: 1, agility: 1 } }; let qualifying = 0;
  for (const seed of range(90)) {
    const place = { off: { LG: weak, RG: weak, C: weak, TE: weak }, def: { DL3: { species: 'icehorn', attrs: { speed: 99, tackling: 99, agility: 99, strength: 99 } } } };
    const cases = [
      { t8: { status: {}, ability: { d_DL3: { cd: 2, pending: false } } }, opt: {} },
      { t8: { status: {}, ability: { d_DL3: { cd: 0, pending: true } } }, opt: {} },
      { t8: { status: {}, ability: { d_DL3: { cd: 0, pending: true } } }, opt: { createdFields: [{ owner: 'd_DL3' }] } }, // the creation play
    ];
    for (const [i, c] of cases.entries()) {
      const r = abilityPlay({ seed, off: ['quick_slants', 'inside_zone', 'dive'][seed % 3], def: 'all_out', place, t8: c.t8, options: { offenseSide: 'home', ...c.opt } });
      if (i === 0 && ((r.result === 'sack' && r.stats.tackler === 'DL3') || (r.result === 'tackle' && r.stats.tackler === 'DL3' && r.yards < 0))) qualifying++;
      assert.equal(c.t8.fields?.pending?.length || 0, 0, `case ${i} seed ${seed}`);
    }
    assert.equal(cases[0].t8.ability.d_DL3.cd, 1, 'counts down on his defensive plays');
    assert.equal(cases[2].t8.ability.d_DL3.cd, 5, 'creation starts the cooldown (mastery 0: 5), not counted on the creation play');
  }
  assert.ok(qualifying >= 10, `qualifying stops while not ready ${qualifying}`);
});

// ------------------------------------------------------------------------------------------------ game rules: fields and formula kicks
const mkTeam = (name, seed, kicker = {}) => { const x = lineup(seed, 60); for (const side of ['offense', 'defense']) for (const [slot, p] of Object.entries(x[side])) { p.id = `${name}_${slot}`; p.type = p.type || 'Fire'; } return { id: name, name, offense: x.offense, defense: x.defense, kicker: { attrs: { kicking: 70 }, name: 'K', id: `${name}_K`, ...kicker }, returner: x.offense.WR2 }; };
function game(seed, homeKicker = {}) {
  const teams = { home: mkTeam('H', 11, homeKicker), away: mkTeam('A', 12) };
  const g = R.newGame({ home: teams.home, away: teams.away, seed, quarterLength: 600, coinWinner: 'home', choice: 'receive' }); R.doKickoff(g, teams);
  g.possession = 'home'; g.phase = 'scrimmage'; g.down = 1; g.toGo = 10; g.ballOn = 30; g.t8 ||= { status: {} };
  return { g, teams };
}
const snapFor = (g, side) => { g.possession = side; g.phase = 'scrimmage'; g.down = 1; g.toGo = 10; g.ballOn = 30; g.ballLat = 0; };

test('Frostmark: a made field goal (not a miss, not an extra point) banks one pending Ice field, created at the opponent\'s next snap with the kicker benched; locked 8 x 6 inside the 12-yard band', () => {
  let made = 0;
  for (const seed of range(30)) {
    const st = seed % 2, m = seed % 4; const { g, teams } = game(seed, { species: 'snowmoth', form: `snowmoth:${st}`, mastery: m, attrs: { kicking: 70 } });
    g.ballOn = 75; const { res } = R.doFieldGoal(g, teams);
    const pend = g.t8.fields?.pending || [];
    if (!res.good) { assert.equal(pend.length, 0, 'a miss cannot earn it'); continue; }
    made++; assert.equal(pend.length, 1); assert.equal(g.t8.mastery.H_K.executions, 1);
    // a second make while one is pending adds nothing
    snapFor(g, 'home'); g.ballOn = 85; const r2 = R.doFieldGoal(g, teams); if (r2.res.good) assert.equal(g.t8.fields.pending.length, 1, 'maximum one pending token');
    // a home offensive snap does not create it; the opponent's does
    snapFor(g, 'home'); R.runScrimmagePlay(g, teams, OFFENSE_IDS[0], DEFENSE_IDS[0]); assert.equal(g.t8.fields.pending.length, 1);
    snapFor(g, 'away'); const { sim } = R.runScrimmagePlay(g, teams, OFFENSE_IDS[1], DEFENSE_IDS[1]);
    const f = sim.fields?.find((x) => x.ability === 'ICE-01-F'); assert.ok(f, 'created at the opposing snap, kicker benched');
    assert.equal(f.type, 'Ice'); assert.equal(f.strength, [20, 25][st]);
    assert.ok(Math.abs(f.yard[1] - f.yard[0] - 6) < 1e-9 && Math.abs(f.lat[1] - f.lat[0] - 8) < 1e-9);
    assert.ok(f.yard[0] >= -1e-9 && f.yard[1] <= 12 + 1e-9, `inside the line-to-12 band: ${f.yard}`);
    const live = g.t8.fields.list.filter((x) => x.ability === 'ICE-01-F');
    assert.equal(live.length, m >= 1 ? 1 : 0, 'lifetime 1/2/3/4 opposing offensive plays including spawn');
    if (live.length) { assert.equal(live[0].remaining, [1, 2, 3, 4][m] - 1); snapFor(g, 'home'); R.runScrimmagePlay(g, teams, OFFENSE_IDS[0], DEFENSE_IDS[0]); assert.equal(g.t8.fields.list.find((x) => x.ability === 'ICE-01-F').remaining, [1, 2, 3, 4][m] - 1, 'the kicker team\'s own plays do not count'); }
  }
  assert.ok(made >= 10, `made ${made}`);
  // extra points are not field goals
  const { g, teams } = game(1, { species: 'snowmoth', attrs: { kicking: 99 } }); g.phase = 'try'; g.tryTeam = 'home';
  R.attemptTryKick(g, teams); assert.equal(g.t8.fields?.pending?.length || 0, 0);
});

test('Permafrost: the pending zone is created at his next defensive snap on the field: 10 x 6 from the line into the backfield, centred on the QB; cooldown from creation; lifetime two defensive plays', () => {
  const { g, teams } = game(7); const dl = teams.away.defense.DL1; Object.assign(dl, { species: 'icehorn', form: 'icehorn:0', mastery: 1, type: 'Ice' });
  g.t8.fields = { list: [], pending: [{ owner: dl.id, ownerTeam: 'away', side: 'def', type: 'Ice', ability: 'ICE-04-F', strength: 30, lifetime: 2, clock: 'ownerDefense', place: 'backfield', width: 10, length: 6 }], seq: 0 };
  g.t8.ability = { [dl.id]: { cd: 0, pending: true } };
  snapFor(g, 'away'); R.runScrimmagePlay(g, teams, OFFENSE_IDS[0], DEFENSE_IDS[0]); assert.equal(g.t8.fields.pending.length, 1, 'not on his own offense');
  snapFor(g, 'home'); const { sim } = R.runScrimmagePlay(g, teams, 'quick_slants', 'cover_3');
  const f = sim.fields.find((x) => x.ability === 'ICE-04-F'); assert.ok(f);
  assert.ok(Math.abs(f.yard[0] + 6) < 1e-9 && Math.abs(f.yard[1]) < 1e-9, `from the line six yards back: ${f.yard}`);
  assert.ok(Math.abs((f.lat[0] + f.lat[1]) / 2) < 1e-9 && Math.abs(f.lat[1] - f.lat[0] - 10) < 1e-9, 'centred on the QB alignment');
  assert.equal(g.t8.ability[dl.id].cd, 4, 'cooldown 4 at mastery 1, started at creation'); assert.equal(g.t8.ability[dl.id].pending, false);
  assert.equal(g.t8.fields.list.find((x) => x.ability === 'ICE-04-F').remaining, 1);
  snapFor(g, 'home'); R.runScrimmagePlay(g, teams, 'inside_zone', 'cover_3');
  assert.equal(g.t8.fields.list.filter((x) => x.ability === 'ICE-04-F').length, 0, 'two defensive plays including creation');
  assert.equal(g.t8.ability[dl.id].cd, 3);
});

test('Ice fields: pending creations survive halftime, created ones clear (non-legendary)', async () => {
  const T8F = await import('../src/sim/t8/field-runtime.js');
  const t8 = { fields: { list: [{ id: 'F1', ability: 'ICE-01-F', clearsAtHalftime: true, remaining: 2 }], pending: [{ ability: 'ICE-04-F' }], seq: 1 } };
  T8F.halftime(t8); assert.equal(t8.fields.list.length, 0); assert.equal(t8.fields.pending.length, 1);
});

test('Stone Cradle: the first returned punt of the game ends at the catch spot with zero return yards; fair catches and touchbacks keep the use; once per game', () => {
  let cradled = 0, kept = 0;
  for (const seed of range(40)) {
    const { g, teams } = game(seed, { species: 'stoneguard', form: 'stoneguard:0', attrs: { kicking: 60 } });
    let first = true;
    for (let k = 0; k < 6; k++) {
      snapFor(g, 'home'); g.ballOn = 35; const before = JSON.stringify(g.t8.ability?.H_K || {});
      const { res } = R.doPunt(g, teams);
      if (res.catchAt == null) { if (first) { assert.equal(before, JSON.stringify(g.t8.ability?.H_K || {}), 'no caught return: the use is kept'); kept++; } continue; }
      if (first) { first = false; cradled++; assert.equal(res.cradled, true); assert.equal(res.returnYards, 0); assert.equal(res.touchdown, false); assert.equal(g.ballOn, Math.max(1, Math.min(99, res.catchAt))); assert.equal(g.t8.mastery.H_K.executions, 1); }
      else assert.ok(!res.cradled, 'once per game');
    }
  }
  assert.ok(cradled >= 20 && kept >= 5, `cradled ${cradled}, kept ${kept}`);
});

test('Second Chance: the first missed field goal gets one fresh ordinary check at the same distance; two attempts recorded; once per game; a good kick keeps it', () => {
  let rescued = 0, doubleMiss = 0, keptOnGood = 0;
  for (const seed of range(80)) {
    const { g, teams } = game(seed, { species: 'glacivern', form: 'glacivern:0', attrs: { kicking: 55 } });
    g.ballOn = 62; const score0 = g.score.home; const p0 = { ...(g.stats.home.players.K || {}) };
    const { res } = R.doFieldGoal(g, teams); const K = g.stats.home.players.K;
    if (!res.secondChance) { assert.equal(res.good, true, 'only a miss triggers it'); assert.equal(g.t8.ability?.H_K?.used ?? false, false); keptOnGood++; continue; }
    assert.equal(res.checks.length, 2); assert.equal(res.checks[0].good, false); assert.equal(res.distance, 100 - 62 + 17);
    assert.equal((K.fga || 0) - (p0.fga || 0), 2, 'two attempts'); assert.equal((K.fgm || 0) - (p0.fgm || 0), res.good ? 1 : 0);
    assert.equal(g.score.home - score0, res.good ? 3 : 0); assert.equal(g.t8.ability.H_K.used, true);
    if (res.good) rescued++; else doubleMiss++;
    // later misses: no second chance
    for (let k = 0; k < 5; k++) { snapFor(g, 'home'); g.ballOn = 50; const x = R.doFieldGoal(g, teams); assert.ok(!x.res.secondChance); }
  }
  assert.ok(rescued >= 3 && doubleMiss >= 3 && keptOnGood >= 3, `rescued ${rescued}, double miss ${doubleMiss}, good first ${keptOnGood}`);
});
