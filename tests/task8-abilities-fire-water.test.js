// Task 8 M3: the Fire and Water football ability contracts (docs/task8/M3_ABILITY_BRIEF.md) on the real engine and rules.js games.
// FIR-02..06-F (ashkit, firestorm, cinderclaw, pyrelynx, pyroclast) and WAT-01..06-F (tidepaw, mudcub, reefclaw, tidefin, wavehorn,
// tsunarok). Blazing Resolve (FIR-01-F) is covered by tests/task8-ability-pilots.test.js.
// Probabilities: no test estimates a rate. Probabilistic triggers are searched over a fixed, frozen range of seeds (each search's
// size is fixed before running), and the guaranteed parts of each contract are asserted in every case found (B12).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulatePlay, engagementAttrs } from '../src/sim/engine.js';
import { PLAYS } from '../src/data/playbook.js';
import { FIELD } from '../src/core/field.js';
import { lineup } from './tools/lineup.js';
import * as R from '../src/sim/rules.js';
import * as T8F from '../src/sim/t8/field-runtime.js';
import * as T8K from '../src/sim/t8/stamina-runtime.js';
import * as Fr from '../src/core/fraction.js';
import { registeredFamilies, contractOf, HOOKS } from '../src/sim/abilities/registry.js';
import { auraLayer } from '../src/sim/abilities/fw-util.js';
import { FAMILIES } from '../src/data/beast-dex.js';
import '../src/sim/abilities/index.js';

const FAMS = { ashkit: 'FIR-02-F', firestorm: 'FIR-03-F', cinderclaw: 'FIR-04-F', pyrelynx: 'FIR-05-F', pyroclast: 'FIR-06-F', tidepaw: 'WAT-01-F', mudcub: 'WAT-02-F', reefclaw: 'WAT-03-F', tidefin: 'WAT-04-F', wavehorn: 'WAT-05-F', tsunarok: 'WAT-06-F' };
const forced = (target, at) => ({ qb: { mode: 'human', at, action: 'throw', target } });
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
/** One play on the engine: lineup(11, 60) offense vs lineup(12, 64) defense; `off` / `def` put a family on a slot (id o_SLOT / d_SLOT). */
function play(offId, defId, seed, { off = {}, def = {}, options = {}, ballOn = 30 } = {}) {
  const L = lineup(11, 60), D = lineup(12, 64); const o = { ...L.offense }, d = { ...D.defense };
  const put = (side, slots, pre) => { for (const [k, v] of Object.entries(slots)) { if (v == null) continue; const spec = typeof v === 'string' ? { species: v } : v; side[k] = { ...side[k], id: `${pre}_${k}`, form: `${spec.species}:0`, mastery: 0, ...spec }; } };
  put(o, off, 'o'); put(d, def, 'd');
  for (const [k, x] of Object.entries(o)) if (!x.id) o[k] = { ...x, id: `o_${k}` };
  for (const [k, x] of Object.entries(d)) if (!x.id) d[k] = { ...x, id: `d_${k}` };
  return simulatePlay({ offensePlay: PLAYS[offId], defensePlay: PLAYS[defId], offense: o, defense: d, ballOn, seed, options });
}
const abilityEvents = (r, id) => r.events.filter((e) => e.ability === id);
// ---- rules.js games
const mk = (name, seed) => { const x = lineup(seed, 60); for (const side of ['offense', 'defense']) for (const [slot, p] of Object.entries(x[side])) p.id = `${name}_${slot}`; return { id: name, name, offense: x.offense, defense: x.defense, kicker: { attrs: { kicking: 70 }, name: 'K', id: `${name}_K` } }; };
function newG(seed = 5) { const teams = { home: mk('H', 11), away: mk('A', 12) }; const g = R.newGame({ home: teams.home, away: teams.away, seed, quarterLength: 3600, coinWinner: 'home', choice: 'receive' }); R.doKickoff(g, teams); g.t8 = { status: {} }; return { g, teams }; }
function ready(g, teams) { for (let n = 0; g.phase !== 'scrimmage' && !g.finished && n < 6; n++) { if (g.phase === 'try') R.attemptTryKick(g, teams); else R.doKickoff(g, teams); } }
/** One scrimmage snap; returns the sim and the pre-snap situation. */
function snap(g, teams, offId, defId, options = {}) { ready(g, teams); const pre = { possession: g.possession, ballOn: g.ballOn, ballLat: g.ballLat || 0, offId, defId }; const { sim } = R.runScrimmagePlay(g, teams, offId, defId, options); return { sim, pre }; }
const playField = (sim, ability) => (sim.fields || []).find((f) => f.ability === ability) || null;
const mid = (r) => (r[0] + r[1]) / 2, span = (r) => r[1] - r[0];

test('Fire and Water contracts: every family registered once with its Dex football ability; new hooks are named', () => {
  for (const [fam, id] of Object.entries(FAMS)) {
    assert.ok(registeredFamilies().includes(fam), fam); assert.equal(contractOf(fam).abilityId, id);
    assert.equal(FAMILIES.find((f) => f.id === fam).abilities.football, id);
  }
  assert.ok(HOOKS.includes('catchMade') && HOOKS.includes('dropped'));
});

test('no stacking: the legacy effects of these families never run (Eruption flatten, Heat Haze delay, Riptide drag, Pincer Hold, Undertow)', () => {
  const legacyKinds = new Set(['flattened', 'dragged', 'pinched']);
  for (let seed = 1; seed <= 12; seed++) {
    const a = play('power_right', 'run_wall', seed, { off: { TE: 'pyroclast', LG: 'wavehorn' }, def: { DL1: 'reefclaw', CB1: 'pyrelynx' }, options: { memory: { drive: 'd1', used: {} } } });
    const b = play('deep_post', 'cover_3', seed, { def: { FS: 'tsunarok', CB1: 'pyrelynx' }, options: forced('WR1', 1.9) });
    for (const r of [a, b]) { assert.ok(!r.events.some((e) => legacyKinds.has(e.kind)), `seed ${seed}`); assert.ok(!r.events.some((e) => e.kind === 'ability' && ['eruption', 'heatHaze', 'riptide', 'pincer', 'undertow'].includes(e.key)), `seed ${seed}`); }
  }
});

// ------------------------------------------------------------------------------------------------ FIR-02-F Impact Pyre (ashkit)
test('Impact Pyre charge: one charge per defensive scrimmage play with a credited tackle, assist or sack; none while full or queued; none on two-point tries', () => {
  let charged = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const t8 = { status: {}, ability: { d_LB1: { bar: 0, queued: false } } };
    const r = play('inside_zone', 'run_wall', seed, { def: { LB1: 'ashkit' }, options: { t8, offenseSide: 'home' } }); const s = r.stats;
    const cred = r.result === 'sack' ? s.tackler === 'LB1' : !s.defensiveScore && (s.tackler === 'LB1' || (s.assistBy === 'LB1' && s.assistBy !== s.tackler));
    assert.equal(t8.ability.d_LB1.bar, cred ? 1 : 0, `seed ${seed}`); if (cred) charged++;
    if (cred) { // the same play from a bar of 2 fills it and queues the zone for his next defensive snap
      const t8b = { status: {}, ability: { d_LB1: { bar: 2, queued: false } } };
      play('inside_zone', 'run_wall', seed, { def: { LB1: { species: 'ashkit', form: 'ashkit:1', mastery: 2 } }, options: { t8: t8b, offenseSide: 'home' } });
      assert.deepEqual(t8b.ability.d_LB1, { bar: 3, queued: true });
      const p = t8b.fields.pending; assert.equal(p.length, 1);
      assert.deepEqual({ ...p[0] }, { owner: 'd_LB1', ownerTeam: 'away', side: 'def', type: 'Fire', ability: 'FIR-02-F', strength: 20, lifetime: 3, clock: 'scrimmageAny', width: 6, length: 4, depth: 'creator', lateral: 'creator' });
      const t8c = { status: {}, ability: { d_LB1: { bar: 3, queued: true } } }; play('inside_zone', 'run_wall', seed, { def: { LB1: 'ashkit' }, options: { t8: t8c, offenseSide: 'home' } });
      assert.deepEqual(t8c.ability.d_LB1, { bar: 3, queued: true }, 'no charge while full'); assert.equal(t8c.fields, undefined);
      const t8d = { status: {}, ability: { d_LB1: { bar: 1, queued: false } } }; play('inside_zone', 'run_wall', seed, { def: { LB1: 'ashkit' }, options: { t8: t8d, twoPoint: true } });
      assert.equal(t8d.ability.d_LB1.bar, 1, 'two-point tries build nothing');
    }
  }
  assert.ok(charged >= 3, `credited plays found (${charged})`);
});

test('Impact Pyre zone: created at his next defensive snap on his alignment (6 wide x 4 long, 15% / 20%), bar emptied, spawn play earns nothing; lifetime 1 / 4 by mastery on every scrimmage play (G1); clears at halftime, bar kept', () => {
  for (const [form, mastery, slow, life] of [['ashkit:0', 0, 15, 1], ['ashkit:1', 3, 20, 4]]) {
    const { g, teams } = newG(5); const lb = teams.away.defense.LB1; Object.assign(lb, { species: 'ashkit', form, mastery });
    g.t8.ability = { [lb.id]: { bar: 2, queued: false } };
    let n = 0; while (!g.t8.ability[lb.id].queued && n++ < 200) snap(g, teams, 'inside_zone', 'run_wall');
    assert.ok(g.t8.ability[lb.id].queued, `${form}: the bar filled`); assert.equal(g.t8.fields.list.length, 0, 'nothing created on the earning play');
    let made = null, pre = null; n = 0;
    while (!made && n++ < 80) { const x = snap(g, teams, 'inside_zone', 'run_wall'); made = playField(x.sim, 'FIR-02-F'); pre = x.pre; if (!made) assert.equal(g.t8.fields.pending.length, 1, 'waits while his team is on offense'); }
    assert.ok(made, 'created'); assert.equal(pre.possession, 'home', 'at a snap where he defends');
    const [ax, ay] = PLAYS.run_wall.align.LB1; assert.equal(made.type, 'Fire'); assert.equal(made.strength, slow);
    assert.ok(near(span(made.lat), 6) && near(span(made.yard), 4)); assert.ok(near(mid(made.yard), ax) && near(mid(made.lat), ay), 'centred on his starting position');
    assert.deepEqual(g.t8.ability[lb.id], { bar: 0, queued: false }, 'the bar empties; the spawn play cannot earn');
    const live = () => g.t8.fields.list.filter((f) => f.ability === 'FIR-02-F');
    assert.equal(live().length, life > 1 ? 1 : 0, 'the spawn play counts as the first');
    if (life > 1) {
      assert.equal(live()[0].remaining, life - 1);
      const keep = JSON.parse(JSON.stringify(g.t8)); const h = { ...g, t8: keep }; T8F.halftime(h.t8); assert.equal(h.t8.fields.list.length, 0, 'clears at halftime'); assert.deepEqual(h.t8.ability[lb.id], { bar: 0, queued: false });
      for (let k = 1; k < life; k++) { assert.equal(live().length, 1, `alive before play ${k + 1}`); snap(g, teams, k % 2 ? 'quick_slants' : 'inside_zone', 'cover_3'); }
      assert.equal(live().length, 0, `gone after ${life} completed scrimmage plays`);
    }
  }
});

// ------------------------------------------------------------------------------------------------ FIR-03-F Meteor Impact (firestorm)
test('Meteor Impact: a ready pass aimed 15+ yards commits at release; a completed catch pushes every opponent within 3 yards outward by the mastery distance; resistance reduces it', () => {
  let shock = 0, committedMiss = 0;
  for (let seed = 1; seed <= 60; seed++) for (const mastery of [0, 3]) {
    const t8 = { status: {}, ability: { o_QB: { cd: 0 } } };
    const r = play('deep_post', 'cover_3', seed, { off: { QB: { species: 'firestorm', mastery } }, options: { t8, ...forced('WR1', 1.9) } });
    const rel = abilityEvents(r, 'FIR-03-F').filter((e) => e.phase === 'release'), sw = abilityEvents(r, 'FIR-03-F').filter((e) => e.phase === 'shockwave');
    const throwEv = r.events.find((e) => e.kind === 'throw'); if (!throwEv) { assert.equal(rel.length, 0); continue; }
    if (!rel.length) { assert.ok(r.stats.airYards < 20, `seed ${seed}: only a short aim does not commit`); continue; } // the aim, not the landing, decides
    assert.equal(rel.length, 1, `seed ${seed}: commits on release`); assert.equal(t8.ability.o_QB.cd, 3, 'cooldown spent at release (fires 1)');
    assert.equal(sw.length, r.stats.receiver ? 1 : 0, 'a shockwave only on a completed catch');
    if (!r.stats.receiver) committedMiss++;
    for (const e of sw) { shock++; for (const v of e.victims) { assert.ok(!['QB', 'RB', 'WR1', 'WR2', 'TE', 'LG', 'RG'].includes(v.slot), 'opponents only'); assert.ok(v.moved <= [1, 1.25, 1.5, 1.75][mastery] + 1e-9); } assert.ok(e.victims.some((v) => near(v.moved, [1, 1.25, 1.5, 1.75][mastery], 1e-3)) || !e.victims.length); }
  }
  assert.ok(shock >= 2 && committedMiss >= 1, `shockwaves ${shock}, committed misses ${committedMiss}`);
  // Earth resistance (an Earth field over the whole field, 50%): every displacement is halved.
  let seen = 0;
  for (let seed = 1; seed <= 60 && seen < 2; seed++) {
    const r = play('deep_post', 'cover_3', seed, { off: { QB: 'firestorm' }, options: { t8: { status: {} }, ...forced('WR1', 1.9), fields: [{ id: 'E', type: 'Earth', strength: 50, createdAt: 0, owner: 'x', ability: 'TEST', yard: [-20, 120], lat: [-40, 40] }] } });
    for (const e of abilityEvents(r, 'FIR-03-F').filter((x) => x.phase === 'shockwave')) for (const v of e.victims) { seen++; assert.ok(v.moved <= 0.5 + 1e-9, `resisted (${v.moved})`); }
  }
  assert.ok(seen >= 1, 'a resisted shockwave observed');
});

test('Meteor Impact: no commit while cooling down, on a short aim or on two-point tries; three offensive plays to recharge (ready on the fifth)', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const cool = { status: {}, ability: { o_QB: { cd: 2 } } }; const r = play('deep_post', 'cover_3', seed, { off: { QB: 'firestorm' }, options: { t8: cool, ...forced('WR1', 1.9) } });
    assert.equal(abilityEvents(r, 'FIR-03-F').length, 0); assert.equal(cool.ability.o_QB.cd, 1, 'a participating offensive play counts');
    const short = { status: {}, ability: { o_QB: { cd: 0 } } }; const s = play('quick_slants', 'cover_3', seed, { off: { QB: 'firestorm' }, options: { t8: short, ...forced('WR1', 0.9) } });
    if (s.stats.airYards < 10) { assert.equal(abilityEvents(s, 'FIR-03-F').length, 0, 'short aim'); assert.equal(short.ability.o_QB.cd, 0); }
    const two = { status: {}, ability: { o_QB: { cd: 2 } } }; const t = play('deep_post', 'cover_3', seed, { off: { QB: 'firestorm' }, options: { t8: two, twoPoint: true, ...forced('WR1', 1.9) } });
    assert.equal(abilityEvents(t, 'FIR-03-F').length, 0); assert.equal(two.ability.o_QB.cd, 2, 'two-point tries do not advance it');
  }
});

// ------------------------------------------------------------------------------------------------ FIR-04-F Scorch Mark (cinderclaw)
test('Scorch Mark: the first blocker engaged while ready is marked (one per activation, cooldown 3); not while cooling down; the mark scales only the pair versus this Scorchulk', () => {
  let marks = 0;
  for (let seed = 1; seed <= 20; seed++) for (const mastery of [0, 3]) {
    const t8 = { status: {}, ability: { d_DL1: { cd: 0 } } };
    const r = play(seed % 2 ? 'power_right' : 'curl_flat', seed % 2 ? 'run_wall' : 'cover_3', seed, { def: { DL1: { species: 'cinderclaw', mastery } }, options: { t8 } });
    const ev = abilityEvents(r, 'FIR-04-F'); assert.ok(ev.length <= 1, 'one marked blocker per activation');
    if (ev.length) { marks++; assert.equal(ev[0].victimSide, 'off'); assert.equal(ev[0].pct, [10, 12, 14, 16][mastery]); assert.equal(t8.ability.d_DL1.cd, 3); } else assert.equal(t8.ability.d_DL1.cd, 0);
    const cool = { status: {}, ability: { d_DL1: { cd: 3 } } }; const c = play('power_right', 'run_wall', seed, { def: { DL1: 'cinderclaw' }, options: { t8: cool } });
    assert.equal(abilityEvents(c, 'FIR-04-F').length, 0); assert.equal(cool.ability.d_DL1.cd, 2);
  }
  assert.ok(marks >= 10, `marks ${marks}`);
  // The pair-specific scaling (engine.js engagementAttrs): versus him only, Strength and Blocking both; stored ratings unchanged.
  const blocker = { attrs: { strength: 70, blocking: 80, agility: 50 }, pairMods: new Map([['scorch', { strength: 0.84, blocking: 0.84 }]]) };
  const vs = engagementAttrs(blocker, { mid: 'scorch' }), other = engagementAttrs(blocker, { mid: 'someone' });
  assert.ok(near(vs.strength, 58.8) && near(vs.blocking, 67.2) && vs.agility === 50);
  assert.equal(other, blocker.attrs, 'any other matchup: unchanged'); assert.deepEqual(blocker.attrs, { strength: 70, blocking: 80, agility: 50 }, 'stored ratings untouched');
});

// ------------------------------------------------------------------------------------------------ FIR-05-F Heat Haze (pyrelynx)
test('Heat Haze: opponents within 3 yards lose 10-16% effective Catching (strongest only, restored outside); opposing Fire types are immune; teammates untouched', () => {
  const o = { attrs: { catching: 80 } };
  assert.equal(auraLayer(o, 'catching', 'heatHaze', 'a', 0.10), 0.10); assert.ok(near(o.attrs.catching, 72));
  auraLayer(o, 'catching', 'heatHaze', 'b', 0.16); assert.ok(near(o.attrs.catching, 67.2), 'strongest only (16%, not 26%)');
  auraLayer(o, 'catching', 'heatHaze', 'b', 0.16); assert.ok(near(o.attrs.catching, 67.2), 'no compounding');
  auraLayer(o, 'catching', 'heatHaze', 'b', 0); assert.ok(near(o.attrs.catching, 72)); auraLayer(o, 'catching', 'heatHaze', 'a', 0); assert.ok(near(o.attrs.catching, 80), 'restored outside');
  let affected = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const r = play('three_verticals', 'cover_1', seed, { def: { CB1: 'pyrelynx' }, options: { t8: { status: {} }, ...forced('WR1', 2.4) } });
    const ev = abilityEvents(r, 'FIR-05-F'); affected += ev.length; for (const e of ev) assert.equal(e.victimSide, 'off', 'opponents only');
    // Every opponent a Fire type: the aura affects nobody, and the play is exactly the play without it (it draws nothing).
    const fire = { QB: { type: 'Fire' }, RB: { type: 'Fire' }, WR1: { type: 'Fire' }, WR2: { type: 'Fire' }, WR3: { type: 'Fire' }, LG: { type: 'Fire' }, RG: { type: 'Fire' } };
    const L = lineup(11, 60); for (const k of Object.keys(fire)) fire[k] = { ...L.offense[k], type: 'Fire' };
    const D = lineup(12, 64); const withIt = { ...D.defense, CB1: { ...D.defense.CB1, species: 'pyrelynx', id: 'cb' } }, without = { ...D.defense, CB1: { ...D.defense.CB1, id: 'cb' } };
    const a = simulatePlay({ offensePlay: PLAYS.three_verticals, defensePlay: PLAYS.cover_1, offense: { ...L.offense, ...fire }, defense: withIt, ballOn: 30, seed, options: forced('WR1', 2.4) });
    const b = simulatePlay({ offensePlay: PLAYS.three_verticals, defensePlay: PLAYS.cover_1, offense: { ...L.offense, ...fire }, defense: without, ballOn: 30, seed, options: forced('WR1', 2.4) });
    assert.equal(abilityEvents(a, 'FIR-05-F').length, 0); assert.deepEqual(a.frames, b.frames, 'Fire opponents immune');
  }
  assert.ok(affected >= 5, `opponents affected ${affected}`);
});

// ------------------------------------------------------------------------------------------------ FIR-06-F Burning Wake (pyroclast)
test('Burning Wake earning: a catch-and-run of 5+ YAC queues one pending zone (width = YAC, min 5, cap field width); one pending; once per possession; never on two-point tries', () => {
  let earned = 0;
  for (let seed = 1; seed <= 160 && earned < 4; seed++) {
    const t8 = { status: {}, ability: {} };
    const r = play('te_seam', 'cover_2_man', seed, { off: { TE: { species: 'pyroclast', mastery: 1 } }, options: { t8, offenseSide: 'home', memory: { drive: 'home@0', used: {} }, ...forced('TE', 1.6) } });
    const st = t8.ability.o_TE;
    if (r.stats.receiver !== 'TE' || r.stats.yac < 5) { assert.ok(!st?.pending, `seed ${seed}: nothing below 5 YAC`); continue; }
    earned++; assert.deepEqual({ ...st }, { pending: true, earnedOn: 'home@0' });
    const p = t8.fields.pending[0]; assert.equal(t8.fields.pending.length, 1);
    assert.equal(p.width, Math.min(FIELD.width, Math.max(5, r.stats.yac))); assert.equal(p.length, 5); assert.equal(p.lbDepth, 5); assert.equal(p.lateral, 'creator');
    assert.equal(p.strength, 28); assert.equal(p.lifetime, 2); assert.equal(p.clock, 'scrimmageAny'); assert.equal(p.clearsAtHalftime, false); assert.equal(p.type, 'Fire');
    // The same play again: a pending token blocks a second; after it spawns, the same possession still cannot earn again.
    play('te_seam', 'cover_2_man', seed, { off: { TE: 'pyroclast' }, options: { t8, offenseSide: 'home', memory: { drive: 'home@0', used: {} }, ...forced('TE', 1.6) } });
    assert.equal(t8.fields.pending.length, 1, 'one pending activation');
    st.pending = false; t8.fields.pending = [];
    play('te_seam', 'cover_2_man', seed, { off: { TE: 'pyroclast' }, options: { t8, offenseSide: 'home', memory: { drive: 'home@0', used: {} }, ...forced('TE', 1.6) } });
    assert.equal(t8.fields.pending.length, 0, 'once per offensive possession');
    play('te_seam', 'cover_2_man', seed, { off: { TE: 'pyroclast' }, options: { t8, offenseSide: 'home', memory: { drive: 'home@9', used: {} }, ...forced('TE', 1.6) } });
    assert.equal(t8.fields.pending.length, 1, 'a new possession may earn again');
    const two = { status: {}, ability: {} }; play('te_seam', 'cover_2_man', seed, { off: { TE: 'pyroclast' }, options: { t8: two, twoPoint: true, ...forced('TE', 1.6) } });
    assert.equal(two.fields, undefined, 'two-point tries cannot trigger');
  }
  assert.ok(earned >= 2, `earned ${earned}`);
});

test('Burning Wake zone: waits for his next on-field offensive snap (G3), 5 long at the 5-yard LB reference, centred on his alignment; two plays including spawn (G1); survives halftime', () => {
  const { g, teams } = newG(7); const te = teams.home.offense.TE; Object.assign(te, { species: 'pyroclast', form: 'pyroclast:0', mastery: 3 });
  g.t8.ability = {}; g.t8.fields = { list: [], pending: [{ owner: te.id, ownerTeam: 'home', type: 'Fire', ability: 'FIR-06-F', strength: 34, lifetime: 2, clock: 'scrimmageAny', width: 12, length: 5, lbDepth: 5, lateral: 'creator', clearsAtHalftime: false }], seq: 0 };
  g.t8.ability[te.id] = { pending: true, earnedOn: 'x' };
  let made = null, pre = null, sawSpread = false;
  for (let n = 0; n < 60 && !made; n++) {
    ready(g, teams); const offId = g.possession === 'home' && !sawSpread ? 'three_verticals' : 'inside_zone'; const x = snap(g, teams, offId, 'cover_3');
    made = playField(x.sim, 'FIR-06-F'); pre = x.pre;
    if (offId === 'three_verticals' && x.pre.possession === 'home') { sawSpread = true; assert.equal(made, null, 'no TE on the field: it waits (G3)'); assert.equal(g.t8.fields.pending.length, 1); }
  }
  assert.ok(sawSpread && made, 'created'); assert.equal(pre.possession, 'home'); assert.equal(pre.offId, 'inside_zone');
  assert.ok(near(mid(made.yard), 5) && near(span(made.yard), 5) && near(span(made.lat), 12)); assert.ok(near(mid(made.lat), PLAYS.inside_zone.align.TE[1]), 'centred on his initial alignment');
  assert.equal(made.strength, 34); assert.equal(g.t8.ability[te.id].pending, false, 'spent at spawn');
  const live = () => g.t8.fields.list.filter((f) => f.ability === 'FIR-06-F');
  assert.equal(live().length, 1); assert.equal(live()[0].remaining, 1, 'the spawn play counted');
  const h = JSON.parse(JSON.stringify(g.t8)); T8F.halftime(h); assert.equal(h.fields.list.length, 1, 'legendary: survives halftime'); assert.equal(h.fields.list[0].remaining, 1, 'no refresh');
  snap(g, teams, 'inside_zone', 'cover_3'); assert.equal(live().length, 0, 'gone after two completed scrimmage plays');
});

// ------------------------------------------------------------------------------------------------ WAT-01-F Splashdown (tidepaw)
test('Splashdown: his credited pass breakup while ready queues the Water patch at the deflection spot (slip by form and mastery); never on interceptions or while cooling down', () => {
  let found = 0;
  for (let seed = 1; seed <= 150 && found < 3; seed++) {
    const t8 = { status: {}, ability: { d_CB1: { cd: 0, seen: null } } };
    const r = play('quick_slants', 'man_press', seed, { def: { CB1: { species: 'tidepaw', form: 'tidepaw:2', mastery: 1 } }, options: { t8, offenseSide: 'home', ...forced('WR1', 1.0) } });
    const ev = abilityEvents(r, 'WAT-01-F');
    if (r.stats.pbuBy !== 'CB1' || r.stats.interceptor) { assert.equal(ev.length, 0, `seed ${seed}`); continue; }
    found++; assert.equal(ev.length, 1); assert.equal(t8.ability.d_CB1.cd, 3);
    const p = t8.fields.pending[0];
    assert.ok(near(p.immediate.x, ev[0].x, 0.01) && near(p.immediate.y, ev[0].y, 0.01));
    assert.equal(p.strength, 32); assert.equal(p.width, 6); assert.equal(p.length, 4); assert.equal(p.lifetime, 2); assert.equal(p.offField, true); assert.equal(p.type, 'Water');
    const cool = { status: {}, ability: { d_CB1: { cd: 2, seen: 0 } }, teamPlays: { away: { off: 0, def: 0 } } };
    play('quick_slants', 'man_press', seed, { def: { CB1: 'tidepaw' }, options: { t8: cool, offenseSide: 'home', ...forced('WR1', 1.0) } });
    assert.equal(cool.fields, undefined, 'not while cooling down'); assert.equal(cool.ability.d_CB1.cd, 1, 'the team defensive play counted');
  }
  assert.ok(found >= 2, `breakups ${found}`);
});

test('Splashdown recharge counts his team\'s defensive scrimmage plays even while he is benched (engine per-team counters)', () => {
  const t8 = { status: {}, ability: { d_CB1: { cd: 3, seen: 5 } }, teamPlays: { home: { off: 4, def: 8 }, away: { off: 8, def: 4 } } };
  // He has been benched for three of his team's defensive plays (5 -> 8): at his next snap the cooldown is done.
  const r = play('quick_slants', 'man_press', 3, { def: { CB1: 'tidepaw' }, options: { t8, offenseSide: 'away', ...forced('WR1', 1.0) } });
  assert.equal(t8.teamPlays.home.def, 9); assert.equal(t8.teamPlays.away.off, 9, 'the whistle counts the scrimmage play for both sides');
  if (abilityEvents(r, 'WAT-01-F').length) assert.equal(t8.ability.d_CB1.cd, 3, 'ready at the snap: a breakup fires it'); else assert.equal(t8.ability.d_CB1.cd, 0, 'ready at the snap');
  const two = { status: {}, teamPlays: { home: { off: 1, def: 1 } } }; play('quick_slants', 'man_press', 3, { options: { t8: two, offenseSide: 'home', twoPoint: true } });
  assert.deepEqual(two.teamPlays, { home: { off: 1, def: 1 } }, 'two-point tries are not counted');
});

test('Splashdown field: created at the whistle of the breakup (6 x 4 at the spot), excluded from its own lifetime, gone after two more scrimmage plays of either team', () => {
  const { g, teams } = newG(9); const cb = teams.away.defense.CB1; Object.assign(cb, { species: 'tidepaw', form: 'tidepaw:0', mastery: 0 });
  g.t8.ability = { [cb.id]: { cd: 0, seen: null } };
  let hit = null;
  for (let n = 0; n < 250 && !hit; n++) { ready(g, teams); const x = snap(g, teams, 'quick_slants', 'man_press', g.possession === 'home' ? forced('WR1', 1.0) : {}); if (abilityEvents(x.sim, 'WAT-01-F').length) hit = x; }
  assert.ok(hit, 'a breakup by him');
  const f = g.t8.fields.list.find((z) => z.ability === 'WAT-01-F'); assert.ok(f, 'created at the whistle'); assert.equal(f.remaining, 2, 'the creation play is excluded'); assert.equal(f.strength, 20);
  const ev = abilityEvents(hit.sim, 'WAT-01-F')[0]; const sgn = hit.pre.possession === 'home' ? 1 : -1;
  assert.ok(near(mid(f.yard), sgn > 0 ? hit.pre.ballOn + ev.x : 100 - (hit.pre.ballOn + ev.x), 0.02), 'at the deflection spot (length)');
  assert.ok(near(span(f.yard), 4) && near(span(f.lat), 6)); if (Math.abs(ev.y) < 20) assert.ok(near(mid(f.lat), sgn * (hit.pre.ballLat + ev.y), 0.02), 'at the deflection spot (width)');
  snap(g, teams, 'inside_zone', 'cover_3'); assert.equal(g.t8.fields.list.find((z) => z.ability === 'WAT-01-F')?.remaining, 1);
  snap(g, teams, 'inside_zone', 'cover_3'); assert.equal(g.t8.fields.list.find((z) => z.ability === 'WAT-01-F'), undefined, 'two subsequent completed plays');
});

// ------------------------------------------------------------------------------------------------ WAT-02-F Divided Guard (mudcub)
test('Divided Guard: spent at the snap when ready (cooldown 3), up to two defenders at once within reach, split 50% Strength and the form/mastery Blocking fraction; no pancake while doubled', () => {
  let doubles = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const t8 = { status: {}, ability: { o_LG: { cd: 0 } } };
    const r = play(seed % 2 ? 'curl_flat' : 'power_right', seed % 2 ? 'all_out' : 'run_wall', seed, { off: { LG: { species: 'mudcub', form: 'mudcub:1', mastery: 3 } }, options: { t8 } });
    const ev = abilityEvents(r, 'WAT-02-F'); assert.equal(ev.filter((e) => e.phase === 'snap').length, 1, 'activates at the snap'); assert.equal(t8.ability.o_LG.cd, 3);
    const dbl = ev.filter((e) => e.phase === 'double');
    for (const e of dbl) { doubles++; assert.equal(new Set(e.victims).size, 2); const pk = r.events.find((x) => x.kind === 'pancake' && x.by === 'LG'); assert.ok(!pk || pk.t <= e.t, 'no pancake while double-engaged'); }
    // Not ready: he blocks exactly like the same lineman without the contract (nothing is drawn, nothing changes).
    const L = lineup(11, 60), D = lineup(12, 64); const base = { offensePlay: PLAYS.power_right, defensePlay: PLAYS.run_wall, defense: D.defense, ballOn: 30, seed };
    const a = simulatePlay({ ...base, offense: { ...L.offense, LG: { ...L.offense.LG, id: 'lg', species: 'mudcub' } }, options: { t8: { status: {}, ability: { lg: { cd: 2 } } } } });
    const b = simulatePlay({ ...base, offense: { ...L.offense, LG: { ...L.offense.LG, id: 'lg' } }, options: { t8: { status: {} } } });
    assert.deepEqual(a.frames, b.frames, 'cooling down: no effect');
    const two = { status: {}, ability: { o_LG: { cd: 0 } } }; const t = play('power_right', 'run_wall', seed, { off: { LG: 'mudcub' }, options: { t8: two, twoPoint: true } });
    assert.equal(abilityEvents(t, 'WAT-02-F').length, 0); assert.equal(two.ability.o_LG.cd, 0);
  }
  assert.ok(doubles >= 2, `double engagements ${doubles}`);
  const blk = { attrs: { strength: 80, blocking: 70 }, engaged: {}, engaged2: {}, splitMods: { strength: 0.5, blocking: 0.89 } };
  const x = engagementAttrs(blk, { mid: 'd' }); assert.ok(near(x.strength, 40) && near(x.blocking, 62.3), 'two engagements: 50% Strength, 89% Blocking (Sludgeon, Mastered)');
  blk.engaged2 = null; assert.equal(engagementAttrs(blk, { mid: 'd' }), blk.attrs, 'one engagement: normal 100%');
});

// ------------------------------------------------------------------------------------------------ WAT-03-F Pressure Drain (reefclaw)
test('Pressure Drain: his first engagement while ready drains 5 / 20 current stamina points from that one blocker, bounded at 0 (exhaustion); capacity and Durability untouched; cooldown 3', () => {
  let drained = 0, exh = 0;
  for (let seed = 1; seed <= 12; seed++) for (const mastery of [0, 3]) {
    const t8 = { status: {}, ability: { d_DL2: { cd: 0 } } };
    const r = play('power_right', 'run_wall', seed, { def: { DL2: { species: 'reefclaw', mastery } }, options: { t8 } });
    const ev = abilityEvents(r, 'WAT-03-F'); assert.ok(ev.length <= 1); if (!ev.length) continue; drained++;
    const L = lineup(11, 60); const victimId = `o_${ev[0].victim}`; const cap = Math.round(L.offense[ev[0].victim].attrs.durability);
    const rec = t8.stamina[victimId]; assert.equal(rec.capacity, cap, 'capacity is permanent Durability'); assert.equal(Fr.toNumber(rec.stamina), cap - [5, 20][mastery / 3]);
    assert.equal(t8.ability.d_DL2.cd, 3); assert.equal(Object.keys(t8.stamina).length, 1, 'one blocker per activation');
    const low = { status: {}, ability: { d_DL2: { cd: 0 } }, stamina: { [victimId]: { capacity: cap, stamina: Fr.frac(3), exhausted: false } } };
    const r2 = play('power_right', 'run_wall', seed, { def: { DL2: { species: 'reefclaw', mastery } }, options: { t8: low } });
    if (abilityEvents(r2, 'WAT-03-F')[0]?.victim === ev[0].victim) { exh++; assert.deepEqual(low.stamina[victimId], { capacity: cap, stamina: Fr.ZERO, exhausted: true }, 'bounded at zero; exhaustion begins'); assert.ok(T8K.exhaustedSet({ t8: low }).has(victimId)); }
    const cool = { status: {}, ability: { d_DL2: { cd: 1 } } }; const c = play('power_right', 'run_wall', seed, { def: { DL2: 'reefclaw' }, options: { t8: cool } });
    assert.equal(abilityEvents(c, 'WAT-03-F').length, 0); assert.equal(cool.stamina, undefined); assert.equal(cool.ability.d_DL2.cd, 0);
  }
  assert.ok(drained >= 6 && exh >= 1, `drains ${drained}, to zero ${exh}`);
});

// ------------------------------------------------------------------------------------------------ WAT-04-F Second Touch (tidefin)
test('Second Touch: a reached, dropped pass while ready gets exactly one more ordinary attempt (no guarantee); cooldown 5 / 2 spent either way; nothing while cooling down or on two-point tries', () => {
  const outcomes = new Set(); let fired = 0;
  for (let seed = 1; seed <= 200 && fired < 12; seed++) for (const mastery of [0, 3]) {
    const t8 = { status: {}, ability: { o_WR1: { cd: 0 } } };
    const r = play('curl_flat', 'cover_3', seed, { off: { WR1: { species: 'tidefin', mastery } }, options: { t8, ...forced('WR1', 1.6) } });
    const ev = abilityEvents(r, 'WAT-04-F'); assert.ok(ev.length <= 1, 'one extra attempt at most'); if (!ev.length) { assert.equal(t8.ability.o_WR1.cd, 0); continue; }
    fired++; outcomes.add(r.stats.receiver === 'WR1' ? 'caught' : r.stats.interceptor ? 'intercepted' : 'incomplete');
    assert.equal(t8.ability.o_WR1.cd, [5, 2][mastery / 3], 'spent even if the retry fails');
    const before = r.events.slice(0, r.events.indexOf(ev[0])); assert.ok(!before.some((e) => e.kind === 'interception' || e.kind === 'incomplete'), 'no interception or breakup before it');
    const cool = { status: {}, ability: { o_WR1: { cd: 1 } } }; const L = lineup(11, 60), D = lineup(12, 64);
    const base = { offensePlay: PLAYS.curl_flat, defensePlay: PLAYS.cover_3, defense: D.defense, ballOn: 30, seed };
    const a = simulatePlay({ ...base, offense: { ...L.offense, WR1: { ...L.offense.WR1, id: 'o_WR1', species: 'tidefin' } }, options: { t8: cool, ...forced('WR1', 1.6) } });
    const b = simulatePlay({ ...base, offense: { ...L.offense, WR1: { ...L.offense.WR1, id: 'o_WR1' } }, options: forced('WR1', 1.6) });
    assert.deepEqual(a.frames, b.frames, 'cooling down: the drop stands'); assert.equal(cool.ability.o_WR1.cd, 0);
    const two = { status: {}, ability: { o_WR1: { cd: 0 } } }; const t = play('curl_flat', 'cover_3', seed, { off: { WR1: 'tidefin' }, options: { t8: two, twoPoint: true, ...forced('WR1', 1.6) } });
    assert.equal(abilityEvents(t, 'WAT-04-F').length, 0);
  }
  assert.ok(fired >= 6, `retries ${fired}`); assert.ok(outcomes.has('caught'), 'a retry can succeed'); assert.ok(outcomes.size >= 1);
});

// ------------------------------------------------------------------------------------------------ WAT-05-F Breakwater (wavehorn)
test('Breakwater: only on a blocking snap assignment; opponents within 3 yards lose 25-40% of all effective Strength; overlapping Breakwaters add a yard each (cap 5); route plays unaffected', () => {
  let hits = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const r = play('power_right', 'run_wall', seed, { off: { TE: { species: 'wavehorn', mastery: 2 } }, options: { t8: { status: {} } } });
    for (const e of abilityEvents(r, 'WAT-05-F')) { hits++; assert.equal(e.victimSide, 'def'); assert.equal(e.radius, 3); }
    const two = play('power_right', 'run_wall', seed, { off: { TE: 'wavehorn', RG: 'wavehorn' }, options: { t8: { status: {} } } }); // RG and TE line up 1.5 yd apart
    const rad = abilityEvents(two, 'WAT-05-F').map((e) => e.radius); assert.ok(rad.includes(4) && rad.every((x) => x === 3 || x === 4), `one overlapping Breakwater: radius 4 (${rad})`);
    // A route assignment: no aura, and the play is exactly the play without it.
    const L = lineup(11, 60), D = lineup(12, 64); const base = { offensePlay: PLAYS.te_seam, defensePlay: PLAYS.cover_3, defense: D.defense, ballOn: 30, seed, options: forced('TE', 1.6) };
    const a = simulatePlay({ ...base, offense: { ...L.offense, TE: { ...L.offense.TE, id: 'te', species: 'wavehorn' } } }), b = simulatePlay({ ...base, offense: { ...L.offense, TE: { ...L.offense.TE, id: 'te' } } });
    assert.equal(abilityEvents(a, 'WAT-05-F').length, 0); assert.deepEqual(a.frames, b.frames, 'route assignment: inactive');
  }
  assert.ok(hits >= 6, `opponents affected ${hits}`);
  const o = { attrs: { strength: 80 } }; auraLayer(o, 'strength', 'breakwater', 'a', 0.25, { rewrite: true }); auraLayer(o, 'strength', 'breakwater', 'b', 0.4, { rewrite: true });
  assert.ok(near(o.attrs.strength, 48), 'strongest Breakwater only (40%)');
  o.attrs.strength = 60; auraLayer(o, 'strength', 'breakwater', 'b', 0.4, { rewrite: true }); assert.ok(near(o.attrs.strength, 36), 'a status rewriting Strength (Weakened) is its own layer');
  auraLayer(o, 'strength', 'breakwater', 'a', 0, { rewrite: true }); auraLayer(o, 'strength', 'breakwater', 'b', 0, { rewrite: true }); assert.ok(near(o.attrs.strength, 60), 'leaving the range restores it');
});

// ------------------------------------------------------------------------------------------------ WAT-06-F Tsunami Line (tsunarok)
test('Tsunami Line: his secured interception while ready queues a full-width Water band (safety reference 12, 5 long, 30-36% slip, survives halftime); cooldown 5 with the interception play excluded', () => {
  let found = 0;
  for (let seed = 1; seed <= 300 && found < 2; seed++) {
    const t8 = { status: {}, ability: { d_FS: { cd: 0 } } };
    const r = play('deep_post', 'cover_3', seed, { def: { FS: { species: 'tsunarok', mastery: 2 } }, options: { t8, offenseSide: 'home', ...forced('WR1', 1.9) } });
    if (r.stats.interceptor !== 'FS') { assert.equal(t8.fields, undefined, `seed ${seed}`); continue; }
    found++; assert.equal(t8.ability.d_FS.cd, 5, 'the interception play is excluded');
    assert.deepEqual({ ...t8.fields.pending[0] }, { owner: 'd_FS', ownerTeam: 'away', offField: true, type: 'Water', ability: 'WAT-06-F', strength: 34, lifetime: 2, clock: 'scrimmageAny', width: FIELD.width, length: 5, lbDepth: 12, clearsAtHalftime: false });
    const next = { status: {}, ability: { d_FS: { cd: 5 } } }; play('inside_zone', 'cover_3', seed, { def: { FS: 'tsunarok' }, options: { t8: next, offenseSide: 'home' } }); assert.equal(next.ability.d_FS.cd, 4, 'then his defensive plays count');
    const cool = { status: {}, ability: { d_FS: { cd: 2 } } }; play('deep_post', 'cover_3', seed, { def: { FS: 'tsunarok' }, options: { t8: cool, offenseSide: 'home', ...forced('WR1', 1.9) } }); assert.equal(cool.fields, undefined, 'not while cooling down');
  }
  assert.ok(found >= 1, `interceptions ${found}`);
  // Creation: his team's next offensive scrimmage snap, with him off the field; full width; two plays including spawn (G1).
  const { g, teams } = newG(3); const fs = teams.away.defense.FS; Object.assign(fs, { species: 'tsunarok', form: 'tsunarok:0', mastery: 0 });
  g.t8.fields = { list: [], pending: [{ owner: fs.id, ownerTeam: 'away', offField: true, type: 'Water', ability: 'WAT-06-F', strength: 30, lifetime: 2, clock: 'scrimmageAny', width: FIELD.width, length: 5, lbDepth: 12, clearsAtHalftime: false }], seq: 0 };
  let made = null, pre = null;
  for (let n = 0; n < 80 && !made; n++) { const x = snap(g, teams, 'inside_zone', 'cover_3'); made = playField(x.sim, 'WAT-06-F'); pre = x.pre; if (!made) assert.equal(x.pre.possession, 'home', 'only at his team\'s offensive snap'); }
  assert.ok(made); assert.equal(pre.possession, 'away'); assert.ok(near(mid(made.yard), 12) && near(span(made.yard), 5) && near(span(made.lat), FIELD.width, 1e-6), 'full width at the 12-yard safety reference');
  assert.equal(made.strength, 30); const live = () => g.t8.fields.list.filter((f) => f.ability === 'WAT-06-F'); assert.equal(live()[0].remaining, 1);
  const h = JSON.parse(JSON.stringify(g.t8)); T8F.halftime(h); assert.equal(h.fields.list.length, 1, 'legendary: kept over halftime without refresh');
  snap(g, teams, 'inside_zone', 'cover_3'); assert.equal(live().length, 0);
});
