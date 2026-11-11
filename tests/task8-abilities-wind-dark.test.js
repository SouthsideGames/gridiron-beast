// Task 8 M3 Wind and Dark batch: the twelve football ability contracts on the real engine (src/sim/abilities/<family>.js).
// Synthetic lineups (tests/tools/lineup.js) carry species / form / mastery / type / id on the slot inputs; zone abilities run through
// rules.js game states (the pre-snap producer pass, G3 creation, clocks, halftime). No probability is asserted as a rate: every check
// below is guaranteed behaviour that must hold in every sampled case; the "observed" counts only guard that a sample actually
// exercised the rule (sample sizes are fixed in each test before running).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { simulatePlay } from '../src/sim/engine.js';
import { PLAYS, OFFENSE_IDS } from '../src/data/playbook.js';
import { lineup } from './tools/lineup.js';
import * as R from '../src/sim/rules.js';
import { contractOf } from '../src/sim/abilities/registry.js';
import { pushSafely, BODY } from '../src/sim/abilities/common.js';
import { createFieldPlay } from '../src/sim/t8/field-effects.js';
import { afterPlay as statusAfterPlay } from '../src/sim/t8/status-runtime.js';
import '../src/sim/abilities/index.js';
import { SLOT_LATERAL } from '../src/sim/abilities/gustling.js';

const RUNS = Object.values(PLAYS).filter((p) => p.side === 'offense' && p.type === 'run' && !p.legendary && !p.reserve && p.onField.includes('RB')).map((p) => p.id);
const PASSES = Object.values(PLAYS).filter((p) => p.side === 'offense' && p.type === 'pass' && !p.legendary && !p.reserve).map((p) => p.id);
const HALF = 80 / 3;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const abilityEvents = (r, id, kind = 'ability') => r.events.filter((e) => e.kind === kind && e.ability === id);

/** A slot input carrying a contract. */
const mon = (base, { id, species, form = `${species}:0`, mastery = 0, type, name }) => ({ ...base, id, species, form, mastery, type, name: name || species });
function play({ seed, off = {}, def = {}, offensePlay, defensePlay = 'cover_2_man', t8 = { status: {} }, options = {}, defType = null, offType = null }) {
  const O = lineup(11, 60).offense, D = lineup(12, 64).defense;
  for (const [k, v] of Object.entries(O)) { v.id = `o_${k}`; if (offType) v.type = offType; }
  for (const [k, v] of Object.entries(D)) { v.id = `d_${k}`; if (defType) v.type = defType; }
  return simulatePlay({ offensePlay: PLAYS[offensePlay], defensePlay: PLAYS[defensePlay], offense: { ...O, ...off }, defense: { ...D, ...def }, ballOn: 30, seed, options: { t8, ...options } });
}

/** A rules.js game between two synthetic clubs (ids `${club}_${slot}`), kicked off; `type` for every monster unless overridden. */
function game(seed, { type = 'Fire', setup = () => {} } = {}) {
  const mk = (name, s) => { const x = lineup(s, 60); for (const side of ['offense', 'defense']) for (const [slot, p] of Object.entries(x[side])) { p.id = `${name}_${slot}`; p.type = type; } return { id: name, name, offense: x.offense, defense: x.defense, kicker: { attrs: { kicking: 70 }, name: 'K', id: `${name}_K` } }; };
  const teams = { home: mk('H', 11), away: mk('A', 12) };
  const g = R.newGame({ home: teams.home, away: teams.away, seed, quarterLength: 900, coinWinner: 'home', choice: 'receive' }); R.doKickoff(g, teams);
  setup(g, teams);
  return { g, teams };
}
const opp = (s) => (s === 'home' ? 'away' : 'home');
const fieldsOf = (g, ability) => (g.t8.fields?.list || []).filter((f) => f.ability === ability);

// ------------------------------------------------------------------------------------------------------------- shared helpers
test('collision-safe displacement: simultaneous, stops at bodies and bounds, no domino pushing', () => {
  const B = { left: -20, right: 20, ownEndLine: -30, endLine: 70 };
  const a = { x: 0, y: 0 }, b = { x: 1, y: 0 }, wall = { x: -1.5, y: 0 }, far = { x: 10, y: 19 };
  const res = pushSafely({ actors: [a, b, wall, far], movers: [a, b, far], ux: -1, uy: 0, distance: 2, bounds: B });
  assert.ok(Math.hypot(a.x - wall.x, a.y - wall.y) >= BODY - 1e-9 && a.x < 0, 'a stops at the body behind it');
  assert.ok(b.x < 1 && b.x >= a.x + BODY - 0.051, 'b moves with the same vector but stops at a (no overlap beyond one step), never pushes it');
  assert.ok(near(far.x, 8, 1e-9), 'a free mover travels the full distance');
  assert.equal(wall.x, -1.5, 'a non-mover never moves');
  const edge = { x: 0, y: 19.5 }; pushSafely({ actors: [edge], movers: [edge], ux: 0, uy: 1, distance: 3, bounds: B });
  assert.ok(edge.y <= B.right - 0.3 + 1e-9, 'stops inside the field bounds'); assert.equal(res.length, 3);
});

// ------------------------------------------------------------------------------------------------------------- WIN-01-F Runway
test('Runway: created before the snap while ready (any assignment), at the LOS, 6x10 on his slot lateral, form strength; cooldown from creation (creating play excluded); G2 clock', () => {
  const STR = [15, 20, 25];
  let checked = 0;
  for (let seed = 1; seed <= 30 && checked < 3; seed++) {
    const form = `gustling:${seed % 3}`, mastery = 2;
    const { g, teams } = game(seed, { setup: (g, t) => { Object.assign(t[g.possession].offense.WR1, { species: 'gustling', form, mastery, type: 'Wind' }); } });
    const side = g.possession, wr = teams[side].offense.WR1, ballOn = g.ballOn, ballLat = g.ballLat || 0;
    const { sim } = R.runScrimmagePlay(g, teams, OFFENSE_IDS[seed % OFFENSE_IDS.length], 'cover_3');
    const f = sim.fields?.find((x) => x.ability === 'WIN-01-F'); assert.ok(f, 'the field took part in its creation play');
    assert.equal(f.type, 'Wind'); assert.equal(f.strength, STR[seed % 3], 'strength by form');
    assert.ok(near(f.yard[0], 0, 1e-9) && near(f.yard[1], 10, 1e-9), 'from the LOS, 10 long into the defense');
    assert.ok(near(f.lat[1] - f.lat[0], 6, 1e-9) && near((f.lat[0] + f.lat[1]) / 2, SLOT_LATERAL.WR1, 1e-9), 'centred on his slot lateral (WR1), not the play');
    const st = g.t8.ability[wr.id]; assert.equal(st.cd, 4, 'Stratosoar-tier mastery 2: cooldown 4, the creating play excluded');
    assert.equal(g.t8.mastery[wr.id].executions, 1);
    if (g.possession !== side) continue; // a turnover: the next check needs his next offensive play
    const [made] = fieldsOf(g, 'WIN-01-F'); assert.ok(made, 'lifetime 2 at mastery 2: one participating play left'); assert.equal(made.remaining, 1);
    const abs = side === 'home' ? [ballOn, ballOn + 10] : [100 - ballOn - 10, 100 - ballOn];
    assert.ok(near(made.yard[0], abs[0], 1e-9) && near(made.yard[1], abs[1], 1e-9), 'absolute placement at the upcoming LOS');
    // G2: benched for a play, the clock pauses (the field stays active) and his cooldown does not run
    const keep = teams[side].offense.WR1; teams[side].offense.WR1 = { ...teams[side].offense.WR2, id: `${side}_sub`, name: 'Sub' };
    teams[side].bench = [];
    const { sim: s2 } = R.runScrimmagePlay(g, teams, OFFENSE_IDS[(seed + 1) % OFFENSE_IDS.length], 'cover_3');
    if (Object.values(s2.names.off).includes(keep.name)) { teams[side].offense.WR1 = keep; continue; }
    const after = fieldsOf(g, 'WIN-01-F');
    assert.equal(after.length, 1, 'paused, still active'); assert.equal(after[0].remaining, 1); assert.equal(st.cd, 4, 'cooldown counts only his participating plays');
    teams[side].offense.WR1 = keep; checked++;
  }
  assert.ok(checked >= 1, `observed ${checked}`);
});

test('Runway: no creation during cooldown or on defense; the clipped width at a sideline; lifetime 1 at mastery 0 counts the spawn play', () => {
  const { g, teams } = game(3, { setup: (g, t) => { Object.assign(t[g.possession].offense.WR1, { species: 'gustling', form: 'gustling:0', mastery: 0, type: 'Wind' }); Object.assign(t[opp(g.possession)].defense.CB1, { species: 'gustling', form: 'gustling:0', mastery: 0, type: 'Wind' }); } });
  const side = g.possession, wr = teams[side].offense.WR1, cb = teams[opp(side)].defense.CB1;
  g.t8 = { status: {}, ability: { [wr.id]: { cd: 2 } } };
  const { sim } = R.runScrimmagePlay(g, teams, 'quick_slants', 'cover_3');
  assert.ok(!sim.fields?.some((f) => f.ability === 'WIN-01-F'), 'not ready: no field (and never on defense)');
  assert.ok(!g.t8.ability[cb.id] || g.t8.ability[cb.id].cd === 0, 'a defender never creates or spends it');
  if (g.possession === side) assert.equal(g.t8.ability[wr.id].cd, 1, 'his participating offensive play counted');
  // a ball near the sideline: the 6-yard width is clipped to the legal field, not shifted
  const { g: g2, teams: t2 } = game(4, { setup: (g, t) => { Object.assign(t[g.possession].offense.WR1, { species: 'gustling', form: 'gustling:0', mastery: 0, type: 'Wind' }); } });
  g2.ballLat = -10; const { sim: s2 } = R.runScrimmagePlay(g2, t2, 'quick_slants', 'cover_3');
  const f = s2.fields.find((x) => x.ability === 'WIN-01-F'); const w = f.lat[1] - f.lat[0];
  assert.ok(w < 6 && w > 0, `clipped width ${w}`);
  assert.equal(fieldsOf(g2, 'WIN-01-F').length, 0, 'lifetime 1 at mastery 0: the spawn play counted and it cleared');
});

// ------------------------------------------------------------------------------------------------------------- WIN-02-F Slipstream Step
test('Slipstream Step: armed at the snap, fires once on the first LOS crossing with the ball; everyone else is pushed opposite his heading, collision-safe; the bar empties and the play cannot recharge', () => {
  const PUSH = [1, 1.5, 2, 2.5];
  let fired = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const mastery = seed % 4;
    const t8 = { status: {}, ability: { rb: { charges: 3 } } };
    const r = play({ seed, offensePlay: RUNS[seed % RUNS.length], off: { RB: mon(lineup(11, 60).offense.RB, { id: 'rb', species: 'breezefang', mastery, type: 'Wind' }) }, t8 });
    const ev = abilityEvents(r, 'WIN-02-F');
    if (!ev.length) { if (r.stats.carrier === 'RB') assert.equal(t8.ability.rb.charges, 3, 'no activation: the full bar is kept'); continue; }
    fired++; assert.equal(ev.length, 1, 'one impulse');
    const e = ev[0]; assert.equal(e.moves.length, 13, 'every other monster on BOTH teams, nobody excluded');
    assert.ok(e.x > 0, 'beyond the LOS');
    for (const m of e.moves) {
      const dx = m.to[0] - m.from[0], dy = m.to[1] - m.from[1], d = Math.hypot(dx, dy);
      assert.ok(d <= PUSH[mastery] + 0.02, `${m.slot} moved ${d} <= ${PUSH[mastery]}`);
      if (d > 0.3) assert.ok((dx * e.dir[0] + dy * e.dir[1]) / d > 0.99, 'opposite his movement direction (logged to 0.01 yd)');
    }
    assert.equal(t8.ability.rb.charges, 0, 'emptied; the activation play earns no charge'); assert.equal(t8.mastery.rb.executions, 1);
  }
  assert.ok(fired >= 5, `activations observed (${fired})`);
});

test('Slipstream Step charging: one charge per personal broken tackle, capped at the form threshold (3 / 2), no activation on the filling play, none on two-point tries', () => {
  let filled = 0;
  for (let seed = 1; seed <= 80; seed++) {
    const form = `breezefang:${seed % 2}`, thr = [3, 2][seed % 2];
    const t8 = { status: {}, ability: { rb: { charges: thr - 1 } } };
    const r = play({ seed, offensePlay: RUNS[seed % RUNS.length], off: { RB: mon(lineup(11, 60).offense.RB, { id: 'rb', species: 'breezefang', form, type: 'Wind' }) }, t8 });
    const broke = r.events.filter((e) => (e.kind === 'broken_tackle') && e.by === 'RB').length;
    assert.equal(abilityEvents(r, 'WIN-02-F').length, 0, 'not armed at the snap: never fires on the play that fills it');
    assert.equal(t8.ability.rb.charges, Math.min(thr, thr - 1 + broke), 'capped, no overflow');
    if (broke) filled++;
  }
  assert.ok(filled >= 3, `filling plays observed (${filled})`);
  const t8 = { status: {}, ability: { rb: { charges: 0 } } };
  for (let seed = 1; seed <= 20; seed++) play({ seed, offensePlay: RUNS[seed % RUNS.length], off: { RB: mon(lineup(11, 60).offense.RB, { id: 'rb', species: 'breezefang', type: 'Wind' }) }, t8, options: { twoPoint: true } });
  assert.equal(t8.ability.rb.charges, 0, 'two-point tries never charge');
  const tk = { status: {}, ability: { rb: { charges: 3 } } };
  for (let seed = 1; seed <= 10; seed++) assert.equal(abilityEvents(play({ seed, offensePlay: RUNS[seed % RUNS.length], off: { RB: mon(lineup(11, 60).offense.RB, { id: 'rb', species: 'breezefang', type: 'Wind' }) }, t8: tk, options: { twoPoint: true } }), 'WIN-02-F').length, 0, 'no activation on a two-point try');
});

// ------------------------------------------------------------------------------------------------------------- WIN-03-F Air Brake
test('Air Brake: on a completed catch by the receiver he guards within 8 yards, the receiver is pushed 5 / 6.5 / 8 / 10 yards opposite his heading (ball with him); bar consumed; otherwise preserved', () => {
  const PUSH = [5, 6.5, 8, 10];
  let fired = 0, kept = 0;
  for (let seed = 1; seed <= 120; seed++) {
    const mastery = seed % 4; const t8 = { status: {}, ability: { cb: { charges: 3 } } };
    const r = play({ seed, offensePlay: PASSES[seed % PASSES.length], defensePlay: 'cover_2_man', def: { CB1: mon(lineup(12, 64).defense.CB1, { id: 'cb', species: 'skywarden', mastery, type: 'Wind' }) }, t8 });
    const ev = abilityEvents(r, 'WIN-03-F');
    if (!ev.length) { assert.equal(t8.ability.cb.charges, 3, 'no legal activation: bar preserved'); if (r.stats.receiver) kept++; continue; }
    fired++; const e = ev[0]; assert.equal(ev.length, 1);
    assert.equal(e.victim, r.stats.receiver, 'the receiver who caught it');
    const dx = e.to[0] - e.from[0], dy = e.to[1] - e.from[1], d = Math.hypot(dx, dy);
    assert.ok(d <= PUSH[mastery] + 0.02, `pushed ${d}`); if (d > 0.3) assert.ok((dx * e.dir[0] + dy * e.dir[1]) / d > 0.99, 'opposite his heading');
    assert.equal(t8.ability.cb.charges, 0); assert.equal(t8.mastery.cb.executions, 1);
    assert.notEqual(r.result, 'incomplete');
  }
  assert.ok(fired >= 3 && kept >= 3, `fired ${fired}, preserved ${kept}`);
});

test('Air Brake: guarded means his man key or tracked zone receiver; range 8; never on a catch that ended the play; PBUs charge (cap 3), interceptions and two-point tries do not', () => {
  const { contractOf: c } = { contractOf }; const mod = c('skywarden');
  const mkCtx = (o = {}) => ({ state: () => o.st, statusOf: () => null, canStartSignature: () => true, canGainCharge: () => true, guards: (d, r) => o.guards, dist: () => o.dist, result: o.result ?? null, heading: () => [1, 0], actors: [], bounds: null, obstacles: () => [], ball: {}, executed: () => {}, log: () => {} });
  for (const [o, fires] of [[{ guards: true, dist: 8 }, true], [{ guards: true, dist: 8.01 }, false], [{ guards: false, dist: 3 }, false], [{ guards: true, dist: 3, result: 'touchdown' }, false]]) {
    const st = { charges: 3 }, self = { team: 'def', ab: { armed: true, fired: false }, mastery: 0, name: 'A' }, r = { x: 10, y: 0, vx: 1, vy: 0, name: 'R' };
    mod.hooks.catchMade(mkCtx({ ...o, st }), self, r); assert.equal(st.charges === 0, fires, JSON.stringify(o));
  }
  let pbus = 0;
  const t8 = { status: {}, ability: { cb: { charges: 0 } } };
  for (let seed = 1; seed <= 150 && t8.ability.cb.charges < 3; seed++) {
    const before = t8.ability.cb.charges;
    const r = play({ seed, offensePlay: PASSES[seed % PASSES.length], def: { CB1: mon(lineup(12, 64).defense.CB1, { id: 'cb', species: 'skywarden', type: 'Wind' }) }, t8 });
    const mine = r.stats.pbuBy === 'CB1' && !r.stats.interceptor; if (mine) pbus++;
    assert.equal(t8.ability.cb.charges, Math.min(3, before + (mine ? 1 : 0)), `seed ${seed}`);
  }
  assert.ok(pbus >= 1, `breakups observed ${pbus}`);
  const t2 = { status: {}, ability: { cb: { charges: 0 } } };
  for (let seed = 1; seed <= 40; seed++) play({ seed, offensePlay: PASSES[seed % PASSES.length], def: { CB1: mon(lineup(12, 64).defense.CB1, { id: 'cb', species: 'skywarden', type: 'Wind' }) }, t8: t2, options: { twoPoint: true } });
  assert.equal(t2.ability.cb.charges, 0, 'two-point breakups do not charge');
});

// ------------------------------------------------------------------------------------------------------------- WIN-04-F Crosswind Rescue
test('Crosswind Rescue: a full bar creates two 4x7 sideline lanes (LOS+5..+12, outer edges on the sidelines, +20%) at his next defensive snap; bar empties; held while own lanes remain; Stunned source preserves the bar', () => {
  let checked = 0;
  for (let seed = 1; seed <= 20 && checked < 2; seed++) {
    const { g, teams } = game(seed, { setup: (g, t) => { Object.assign(t[opp(g.possession)].defense.FS, { species: 'windlynx', form: 'windlynx:0', mastery: 3, type: 'Wind' }); } });
    const dside = opp(g.possession), fs = teams[dside].defense.FS, ballOn = g.ballOn, oside = g.possession;
    g.t8 = { status: {}, ability: { [fs.id]: { charges: 2 } } };
    const { sim } = R.runScrimmagePlay(g, teams, OFFENSE_IDS[seed % OFFENSE_IDS.length], 'cover_3');
    const lanes = sim.fields.filter((f) => f.ability === 'WIN-04-F'); assert.equal(lanes.length, 2, 'a pair');
    for (const f of lanes) { assert.equal(f.type, 'Wind'); assert.equal(f.strength, 20); assert.ok(near(f.yard[0], 5, 1e-9) && near(f.yard[1], 12, 1e-9)); assert.ok(near(f.lat[1] - f.lat[0], 4, 1e-9)); }
    const abs = fieldsOf(g, 'WIN-04-F');
    assert.equal(g.t8.ability[fs.id].charges, 0, 'the bar empties on creation');
    assert.equal(abs.length, 2, 'lifetime 3 at mastery 3 (the creation play counted, two left)');
    for (const f of abs) { assert.equal(f.remaining, 2); assert.ok(near(f.lat[0], -HALF, 1e-9) || near(f.lat[1], HALF, 1e-9), 'outer edge on a sideline'); }
    assert.ok(abs.some((f) => near(f.lat[0], -HALF, 1e-9)) && abs.some((f) => near(f.lat[1], HALF, 1e-9)), 'one lane on each sideline');
    const absYards = oside === 'home' ? [ballOn + 5, ballOn + 12] : [100 - ballOn - 12, 100 - ballOn - 5];
    assert.ok(near(abs[0].yard[0], absYards[0], 1e-9) && near(abs[0].yard[1], absYards[1], 1e-9));
    // held while his lanes remain: a full bar does not make a second pair
    g.t8.ability[fs.id].charges = 2;
    if (g.possession === oside) { R.runScrimmagePlay(g, teams, OFFENSE_IDS[(seed + 3) % OFFENSE_IDS.length], 'cover_3'); assert.ok(fieldsOf(g, 'WIN-04-F').length <= 2, 'at most one own pair'); assert.equal(g.t8.ability[fs.id].charges >= 2, true, 'full bar held'); }
    checked++;
  }
  assert.ok(checked >= 1);
  const { g, teams } = game(5, { setup: (g, t) => { Object.assign(t[opp(g.possession)].defense.FS, { species: 'windlynx', form: 'windlynx:0', mastery: 0, type: 'Wind' }); } });
  const fs = teams[opp(g.possession)].defense.FS;
  g.t8 = { status: { [fs.id]: { id: 'stunned', strength: 1, originalStrength: 1, remaining: 1, applications: 1, appliedThisUnit: false, restOfPlay: false } }, ability: { [fs.id]: { charges: 2 } } };
  const { sim } = R.runScrimmagePlay(g, teams, 'quick_slants', 'cover_3');
  assert.ok(!sim.fields?.some((f) => f.ability === 'WIN-04-F'), 'a Stunned source creates nothing'); assert.equal(g.t8.ability[fs.id].charges, 2, 'and keeps the bar');
});

test('Crosswind Rescue: the lanes count only his team\'s defensive scrimmage plays (incompletions included) and clear at halftime; PBUs charge one per event, none on the creation play', () => {
  const { g, teams } = game(8, { setup: (g, t) => { Object.assign(t[opp(g.possession)].defense.FS, { species: 'windlynx', form: 'windlynx:0', mastery: 3, type: 'Wind' }); } });
  const dside = opp(g.possession), fs = teams[dside].defense.FS;
  g.t8 = { status: {}, ability: { [fs.id]: { charges: 2 } } };
  let guard = 0, counted = 0, paused = 0;
  while (guard++ < 60 && !g.finished) {
    if (g.phase === 'kickoff') { R.doKickoff(g, teams); continue; }
    if (g.phase !== 'scrimmage') break;
    const defending = g.possession !== dside; const before = fieldsOf(g, 'WIN-04-F')[0]?.remaining;
    R.runScrimmagePlay(g, teams, OFFENSE_IDS[guard % OFFENSE_IDS.length], 'cover_3');
    const now = fieldsOf(g, 'WIN-04-F');
    if (before == null) { if (now.length) assert.equal(now[0].remaining, 2, 'created: the creation play counted (3 - 1)'); continue; }
    const exp = defending ? before - 1 : before; if (defending) counted++; else paused++;
    if (exp > 0) { assert.equal(now.length, 2); assert.equal(now[0].remaining, exp, `play ${guard}: ${defending ? 'defensive' : 'offensive'}`); } else { assert.equal(now.length, 0, 'expired together'); break; }
  }
  assert.ok(counted >= 1, `defensive plays counted ${counted}, offensive plays ignored ${paused}`);
  const mod = contractOf('windlynx');
  const st = { charges: 0, fresh: true }; const ctx = { state: () => st, canGainCharge: () => true, kickoff: false, twoPoint: false, stats: { pbuBy: 'FS', interceptor: null } };
  mod.hooks.playEnd(ctx, { team: 'def', slot: 'FS' }); assert.equal(st.charges, 0, 'the creation play cannot recharge');
  mod.hooks.playEnd(ctx, { team: 'def', slot: 'FS' }); assert.equal(st.charges, 1, 'one credit per breakup');
  mod.hooks.playEnd({ ...ctx, stats: { pbuBy: 'FS', interceptor: 'FS' } }, { team: 'def', slot: 'FS' }); assert.equal(st.charges, 1, 'an interception is not a breakup');
  // halftime clears created lanes
  const t8 = { fields: { list: [{ id: 'F1', ability: 'WIN-04-F', clearsAtHalftime: true, yard: [0, 1], lat: [0, 1] }], pending: [], seq: 1 } };
  return import('../src/sim/t8/field-runtime.js').then((F) => { F.halftime(t8); assert.equal(t8.fields.list.length, 0); });
});

// ------------------------------------------------------------------------------------------------------------- WIN-05-F Tailwind Huddle
test('Tailwind Huddle: the nearest eligible non-Wind blocker with a running cooldown inside the mastery radius gets one extra unit after his ordinary decrement; Zephiro cooldown 4 only when a unit is removed', () => {
  const QB = (mastery, extra = {}) => mon(lineup(11, 60).offense.QB, { id: 'qb', species: 'zephyr', mastery, type: 'Wind', ...extra });
  const LG = (type = 'Light') => mon(lineup(11, 60).offense.LG, { id: 'lg', species: 'glimmer', type });
  const pp = 'quick_slants', a = PLAYS[pp].align; const dLG = Math.hypot(a.LG[0] - a.QB[0], a.LG[1] - a.QB[1]);
  for (let m = 0; m < 4; m++) {
    const R0 = [4, 5, 6, 7][m]; const t8 = { status: {}, ability: { lg: { cd: 3 } } };
    const r = play({ seed: 5, offensePlay: pp, off: { QB: QB(m), LG: LG() }, t8 });
    const inRadius = dLG <= R0; const applied = abilityEvents(r, 'WIN-05-F').length === 1;
    assert.equal(applied, inRadius, `mastery ${m}: radius ${R0}, LG at ${dLG.toFixed(2)}`);
    assert.equal(t8.ability.lg.cd, inRadius ? 1 : 2, 'ordinary decrement, then the extra unit');
    assert.equal(t8.ability.qb.cd, inRadius ? 4 : 0, 'his cooldown is spent only when a unit is removed');
  }
  const t8 = { status: {}, ability: { lg: { cd: 1 } } }; play({ seed: 5, offensePlay: pp, off: { QB: QB(3), LG: LG() }, t8 });
  assert.equal(t8.ability.lg.cd, 0, 'never below zero'); assert.equal(t8.ability.qb.cd, 0, 'ready after the ordinary decrement: nothing removed, nothing spent');
  const tw = { status: {}, ability: { lg: { cd: 3 } } }; play({ seed: 5, offensePlay: pp, off: { QB: QB(3), LG: LG('Wind') }, t8: tw });
  assert.equal(tw.ability.lg.cd, 2, 'a Wind blocker is not eligible');
  const tr = { status: {}, ability: { lg: { cd: 0 } } }; play({ seed: 5, offensePlay: pp, off: { QB: QB(3), LG: LG() }, t8: tr });
  assert.equal(tr.ability.lg.cd, 0, 'an already-ready ability is not accelerated'); assert.equal(tr.ability.qb.cd, 0);
  const tc = { status: {}, ability: { lg: { cd: 3 }, qb: { cd: 2 } } }; play({ seed: 5, offensePlay: pp, off: { QB: QB(3), LG: LG() }, t8: tc });
  assert.equal(tc.ability.lg.cd, 2, 'not ready: no bonus'); assert.equal(tc.ability.qb.cd, 1, 'his cooldown runs on offensive plays');
  const ts = { status: { qb: { id: 'stunned', strength: 1, originalStrength: 1, remaining: 1, applications: 1, appliedThisUnit: false, restOfPlay: false } }, ability: { lg: { cd: 3 } } };
  play({ seed: 5, offensePlay: pp, off: { QB: QB(3), LG: LG() }, t8: ts, options: { sitsOut: new Set(['qb']) } });
  assert.equal(ts.ability.lg.cd, 2, 'Stunned at the snap prevents');
  const tp = { status: {}, ability: { lg: { cd: 3 } } }; play({ seed: 5, offensePlay: pp, off: { QB: QB(3), LG: LG() }, t8: tp, options: { twoPoint: true } });
  assert.equal(tp.ability.lg.cd, 3, 'two-point tries: no ordinary decrement and no bonus');
  assert.equal(ts.mastery?.qb, undefined); const tm = { status: {}, ability: { lg: { cd: 3 } } };
  for (let s = 1; s <= 6; s++) { tm.ability.lg.cd = 3; tm.ability.qb = { cd: 0 }; play({ seed: s, offensePlay: pp, off: { QB: QB(3), LG: LG() }, t8: tm }); }
  assert.equal(tm.mastery.qb.executions, 1, 'aura: one passive mastery credit per game');
});

// ------------------------------------------------------------------------------------------------------------- WIN-06-F Cyclonic Release
test('Cyclonic Release: a charged reception spins a stationary tornado firing at up to 3 different non-Wind defenders within 5 yards; each hit attempts Stumbled once through the gate; bar consumed; whistle cancels', () => {
  let fired = 0, hits = 0;
  for (let seed = 1; seed <= 80; seed++) {
    const t8 = { status: {}, ability: { wr: { charges: 3 } } };
    const r = play({ seed, offensePlay: PASSES[seed % PASSES.length], off: { WR1: mon(lineup(11, 60).offense.WR1, { id: 'wr', species: 'tempestra', type: 'Wind' }) },
      def: { CB2: { ...lineup(12, 64).defense.CB2, id: 'd_CB2', type: 'Wind' } }, t8, options: { forcedTarget: 'WR1' } });
    const ev = abilityEvents(r, 'WIN-06-F');
    if (r.stats.receiver !== 'WR1') { assert.equal(ev.length, 0); assert.equal(t8.ability.wr.charges, 3, 'no reception: the bar waits'); continue; }
    fired++; assert.equal(ev.length, 1, 'one tornado');
    const shots = abilityEvents(r, 'WIN-06-F', 'ability_shot'); const victims = shots.map((s) => s.victim);
    assert.ok(shots.length <= 3 && new Set(victims).size === victims.length, 'at most three, all different');
    assert.ok(!victims.includes('CB2'), 'a Wind defender is never targeted');
    for (const s of shots) { assert.equal(s.x, ev[0].x); assert.equal(s.y, ev[0].y); } // stationary at the catch point
    const hit = abilityEvents(r, 'WIN-06-F', 'ability_hit'); hits += hit.length;
    for (const h of hit) assert.equal(r.events.filter((e) => e.kind === 'status' && e.status === 'stumbled' && e.victim === h.victim).length, 1, 'one Stumbled attempt per hit');
    const cancelled = abilityEvents(r, 'WIN-06-F', 'ability_cancel').length; assert.equal(hit.length + cancelled, shots.length, 'each shot hits or is cancelled by the whistle');
    assert.equal(t8.ability.wr.charges, 0, 'consumed; the activation reception does not recharge'); assert.equal(t8.mastery.wr.executions, 1);
  }
  assert.ok(fired >= 5 && hits >= 1, `tornadoes ${fired}, hits ${hits}`);
});

test('Cyclonic Release charging: one per reception (cap 3), none on a kickoff catch or a two-point catch; an uncharged reception creates nothing', () => {
  const t8 = { status: {}, ability: { wr: { charges: 0 } } }; let catches = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const before = t8.ability.wr.charges;
    const r = play({ seed, offensePlay: PASSES[seed % PASSES.length], off: { WR1: mon(lineup(11, 60).offense.WR1, { id: 'wr', species: 'tempestra', type: 'Wind' }) }, t8, options: { forcedTarget: 'WR1' } });
    const got = r.stats.receiver === 'WR1'; if (got) catches++;
    if (before < 3) { assert.equal(abilityEvents(r, 'WIN-06-F').length, 0, 'not charged at the snap'); assert.equal(t8.ability.wr.charges, Math.min(3, before + (got ? 1 : 0))); }
    if (t8.ability.wr.charges === 3) break;
  }
  assert.ok(catches >= 3, `receptions ${catches}`);
  const t2 = { status: {}, ability: { wr: { charges: 0 } } };
  for (let seed = 1; seed <= 20; seed++) play({ seed, offensePlay: PASSES[seed % PASSES.length], off: { WR1: mon(lineup(11, 60).offense.WR1, { id: 'wr', species: 'tempestra', type: 'Wind' }) }, t8: t2, options: { forcedTarget: 'WR1', twoPoint: true } });
  assert.equal(t2.ability.wr.charges, 0, 'two-point catches are not receptions');
  const mod = contractOf('tempestra'); const st = { charges: 0 };
  mod.hooks.playEnd({ state: () => st, kickoff: true, twoPoint: false }, { team: 'off', slot: 'WR1', cy: {} }, { receiver: null, carrier: 'WR1' });
  assert.equal(st.charges, 0, 'a kickoff catch is not a reception');
});

// ------------------------------------------------------------------------------------------------------------- DAR-01-F Shadow Patch
test('Shadow Patch: his own breakup while ready banks a Dark field for his next defensive snap (6x6 at the LB reference, breakup lateral, -15/-20% by form); cooldown 5 after creation; not while banked or cooling', () => {
  let banked = 0;
  for (let seed = 1; seed <= 200 && banked < 3; seed++) {
    const form = `shadowkit:${seed % 2}`; const t8 = { status: {}, ability: { cb: { cd: 0, banked: false } } };
    const r = play({ seed, offensePlay: PASSES[seed % PASSES.length], def: { CB1: mon(lineup(12, 64).defense.CB1, { id: 'cb', species: 'shadowkit', form, type: 'Dark' }) }, t8, options: { offenseSide: 'away' } });
    const mine = r.stats.pbuBy === 'CB1' && !r.stats.interceptor;
    assert.equal(t8.ability.cb.banked, mine, `seed ${seed}`);
    if (!mine) { assert.equal(t8.fields?.pending?.length || 0, 0); continue; }
    banked++; const [p] = t8.fields.pending;
    assert.equal(p.side, 'def'); assert.equal(p.type, 'Dark'); assert.equal(p.strength, [15, 20][seed % 2]); assert.equal(p.clock, 'teamDefense'); assert.equal(p.ownerTeam, 'home');
    assert.equal(p.width, 6); assert.equal(p.length, 6); assert.equal(p.lbDepth, 5); assert.ok(near(p.latHome, -r.endLat, 0.051), 'breakup lateral, home frame (the away offense frame is mirrored)');
    // cooldown / banked: no second bank
    const t2 = { status: {}, ability: { cb: { cd: 2, banked: false } } };
    play({ seed, offensePlay: PASSES[seed % PASSES.length], def: { CB1: mon(lineup(12, 64).defense.CB1, { id: 'cb', species: 'shadowkit', form, type: 'Dark' }) }, t8: t2 });
    assert.equal(t2.ability.cb.banked, false, 'cannot bank during cooldown'); assert.equal(t2.ability.cb.cd, 1);
  }
  assert.ok(banked >= 1, `banks observed ${banked}`);
  // creation at his next defensive snap (G3), cooldown 5 from creation, lifetime by mastery on defensive plays
  const { g, teams } = game(6, { type: 'Fire', setup: (g, t) => { Object.assign(t[opp(g.possession)].defense.CB1, { species: 'shadowkit', form: 'shadowkit:1', mastery: 2, type: 'Dark' }); } });
  const dside = opp(g.possession), cb = teams[dside].defense.CB1, ballOn = g.ballOn, oside = g.possession;
  g.t8 = { status: {}, ability: { [cb.id]: { cd: 0, banked: true } }, fields: { list: [], pending: [{ owner: cb.id, ownerTeam: dside, side: 'def', type: 'Dark', ability: 'DAR-01-F', strength: 20, lifetime: 2, clock: 'teamDefense', width: 6, length: 6, lbDepth: 5, latHome: 4 }], seq: 0 } };
  const { sim } = R.runScrimmagePlay(g, teams, 'quick_slants', 'cover_3');
  const f = sim.fields.find((x) => x.ability === 'DAR-01-F'); assert.ok(f, 'created at his defensive snap');
  assert.equal(g.t8.ability[cb.id].cd, 5); assert.equal(g.t8.ability[cb.id].banked, false);
  const made = fieldsOf(g, 'DAR-01-F')[0]; assert.ok(made && made.remaining === 1, 'lifetime 2 at mastery 2, the spawn play counted');
  assert.ok(near((made.lat[0] + made.lat[1]) / 2, 4, 1e-9), 'the breakup lateral');
  const ref = oside === 'home' ? ballOn + 5 : 100 - ballOn - 5; assert.ok(near((made.yard[0] + made.yard[1]) / 2, ref, 1e-9) && near(made.yard[1] - made.yard[0], 6, 1e-9), 'centred on the LB reference');
  // G3: a pending patch waits while he is not on the field for a defensive snap
  const { g: g2, teams: t2 } = game(7, { setup: (g, t) => { Object.assign(t[g.possession].offense.WR1, { species: 'shadowkit', form: 'shadowkit:0', type: 'Dark' }); } });
  const wr = t2[g2.possession].offense.WR1;
  g2.t8 = { status: {}, ability: { [wr.id]: { cd: 0, banked: true } }, fields: { list: [], pending: [{ owner: wr.id, ownerTeam: g2.possession, side: 'def', type: 'Dark', ability: 'DAR-01-F', strength: 15, lifetime: 1, clock: 'teamDefense', width: 6, length: 6, lbDepth: 5 }], seq: 0 } };
  R.runScrimmagePlay(g2, t2, 'quick_slants', 'cover_3'); assert.equal(g2.t8.fields.pending.length, 1, 'on offense: still pending'); assert.equal(g2.t8.fields.list.length, 0);
});

// ------------------------------------------------------------------------------------------------------------- DAR-02-F Night Watch
test('Night Watch: allied non-Dark defenders inside the moving radius ignore only the Dark base field\'s Awareness term while the source is able, on defense', () => {
  const mod = contractOf('nightowl'); const self = { team: 'def', mid: 'n', mastery: 1, x: 0, y: 0, name: 'N', slot: 'FS' };
  const ally = { team: 'def', mid: 'a', type: 'Fire', x: 4.9, y: 0 }, far = { team: 'def', mid: 'f', type: 'Fire', x: 5.1, y: 0 }, dark = { team: 'def', mid: 'k', type: 'Dark', x: 1, y: 0 }, foe = { team: 'off', mid: 'o', type: 'Fire', x: 1, y: 0 };
  let status = null; let credits = 0;
  const ctx = { kickoff: false, actors: [self, ally, far, dark, foe], dist: (p, q) => Math.hypot(p.x - q.x, p.y - q.y), statusOf: () => status, executed: () => { credits++; }, log: () => {} };
  mod.hooks.tick(ctx, self);
  assert.equal(ally.ignoreFieldAwareness, true, 'inside radius 5 (mastery 1)'); assert.equal(far.ignoreFieldAwareness, false, 'outside');
  assert.equal(dark.ignoreFieldAwareness, undefined, 'Dark allies: already immune, nothing'); assert.equal(foe.ignoreFieldAwareness, undefined, 'opponents never');
  ally.x = 6; mod.hooks.tick(ctx, self); assert.equal(ally.ignoreFieldAwareness, false, 'moving radius'); ally.x = 1;
  status = { id: 'stunned', restOfPlay: true }; mod.hooks.tick(ctx, self); assert.equal(ally.ignoreFieldAwareness, false, 'a Stunned source disables it'); status = null;
  mod.hooks.tick({ ...ctx, kickoff: true }, { ...self }); // kickoff coverage: nothing changes
  self.team = 'off'; ally.team = 'off'; ally.ignoreFieldAwareness = false; mod.hooks.tick(ctx, self); assert.equal(ally.ignoreFieldAwareness, false, 'offensive plays: no aura');
  // the field effect itself: only the Dark base Awareness term is filtered
  const mk = (ign) => ({ team: 'def', slot: 'LB1', mid: 'x', name: 'X', type: 'Fire', x: 1, y: 0, vx: 0, vy: 0, attrs: { awareness: 80, catching: 60, blocking: 60 }, ignoreFieldAwareness: ign });
  const fields = [{ id: 'F1', type: 'Dark', strength: 25, createdAt: 0, yard: [0, 5], lat: [-3, 3] }];
  for (const [ign, exp] of [[false, 60], [true, 80]]) { const a = mk(ign); createFieldPlay({ fields, actors: [a] }).tick(0.05); assert.ok(near(a.attrs.awareness, exp, 1e-9), `ignore ${ign}: ${a.attrs.awareness}`); }
  // on the real engine: the aura credits its passive mastery once a protected ally stands in a Dark field
  const t8 = { status: {} }; const darkField = [{ id: 'F9', type: 'Dark', strength: 25, createdAt: 0, owner: 'x', yard: [-2, 30], lat: [-30, 30] }];
  for (let seed = 1; seed <= 3; seed++) play({ seed, offensePlay: 'quick_slants', def: { FS: mon(lineup(12, 64).defense.FS, { id: 'nw', species: 'nightowl', type: 'Dark', mastery: 3 }) }, t8, options: { fields: darkField }, defType: 'Fire' });
  assert.equal(t8.mastery.nw.executions, 1, 'passive: one credit per game');
});

// ------------------------------------------------------------------------------------------------------------- DAR-03-F Vanishing Cut
test('Vanishing Cut: the first successful juke after the mastery yardage on his own rush, while ready: that defender cannot initiate his next tackle attempt; cooldown 5 subsequent offensive plays', () => {
  const Y = [5, 4, 3, 2]; let fired = 0;
  for (let seed = 1; seed <= 150 && fired < 8; seed++) {
    const mastery = seed % 4; const t8 = { status: {}, ability: { rb: { cd: 0 } } };
    const r = play({ seed, offensePlay: RUNS[seed % RUNS.length], off: { RB: mon(lineup(11, 60).offense.RB, { id: 'rb', species: 'duskrunner', mastery, type: 'Dark' }) }, t8 });
    const ev = abilityEvents(r, 'DAR-03-F');
    if (!ev.length) { assert.equal(t8.ability.rb.cd, 0); continue; }
    fired++; assert.equal(ev.length, 1, 'once a play');
    assert.ok(ev[0].x >= Y[mastery], `after ${Y[mastery]} yards (${ev[0].x})`);
    const jk = r.events.find((e) => e.kind === 'juke' && e.by === 'RB' && e.t === ev[0].t); assert.ok(jk && jk.victim === ev[0].victim, 'on a successful ordinary juke of that defender');
    const firstJukeAfter = r.events.find((e) => e.kind === 'juke' && e.by === 'RB' && e.t <= ev[0].t); assert.equal(firstJukeAfter.t <= ev[0].t, true);
    assert.equal(t8.ability.rb.cd, 5, 'spent; the activation play is not one of the 5');
    for (const e of r.events) if ((e.kind === 'broken_tackle' || e.kind === 'broken') && e.victim === ev[0].victim) assert.ok(!abilityEvents(r, 'DAR-03-F', 'ability_hit').some((h) => h.t === e.t), 'an excluded attempt is no attempt (no broken tackle)');
  }
  assert.ok(fired >= 2, `observed ${fired}`);
  const mod = contractOf('duskrunner'); const d = { mid: 'd', x: 1, y: 0, stun: 0, engaged: null, name: 'D' }, o = { mid: 'o', name: 'O' }, self = { x: 0, y: 0, vc: { token: { d, live: false } }, slot: 'RB', team: 'off', name: 'S' };
  const ctx = { dist: (p, q) => Math.hypot(p.x - q.x, p.y - q.y), ball: { holder: self }, log: () => {} };
  assert.deepEqual(mod.hooks.tackleAttempt(ctx, self, d), { skip: true }, 'the juked defender cannot initiate'); assert.equal(mod.hooks.tackleAttempt(ctx, self, o), undefined, 'others tackle normally');
  mod.hooks.tick(ctx, self); assert.deepEqual(mod.hooks.tackleAttempt(ctx, self, d), { skip: true }, 'still the same attempt while in reach');
  d.x = 2; mod.hooks.tick(ctx, self); assert.equal(mod.hooks.tackleAttempt(ctx, self, d), undefined, 'his next attempt after leaving reach is normal');
  // cooldown: not while running; counts his offensive plays
  const t8 = { status: {}, ability: { rb: { cd: 2 } } };
  const r = play({ seed: 3, offensePlay: RUNS[0], off: { RB: mon(lineup(11, 60).offense.RB, { id: 'rb', species: 'duskrunner', mastery: 3, type: 'Dark' }) }, t8 });
  assert.equal(abilityEvents(r, 'DAR-03-F').length, 0); assert.equal(t8.ability.rb.cd, 1);
  const tp = { status: {}, ability: { rb: { cd: 0 } } };
  for (let seed = 1; seed <= 30; seed++) assert.equal(abilityEvents(play({ seed, offensePlay: RUNS[seed % RUNS.length], off: { RB: mon(lineup(11, 60).offense.RB, { id: 'rb', species: 'duskrunner', mastery: 3, type: 'Dark' }) }, t8: tp, options: { twoPoint: true } }), 'DAR-03-F').length, 0, 'not on a two-point try');
});

// ------------------------------------------------------------------------------------------------------------- DAR-04-F Ambush Tag
test('Ambush Tag: a full bar at his defensive snap tags the opposing RB with Weakened (-15/-20/-25/-30%) for the current play; empties even when blocked; holds without an RB; plays allowing <= 4 net yards charge', () => {
  for (let m = 0; m < 4; m++) {
    const t8 = { status: {}, ability: { lb: { charges: 3 } } };
    const r = play({ seed: 4 + m, offensePlay: RUNS[m], def: { LB1: mon(lineup(12, 64).defense.LB1, { id: 'lb', species: 'mireclaw', mastery: m, type: 'Dark' }) }, t8 });
    const st = r.events.find((e) => e.kind === 'status' && e.status === 'weakened'); assert.ok(st && st.accepted && st.victim === 'RB', 'the RB, through the shared gate');
    assert.equal(t8.status.o_RB.strength, [15, 20, 25, 30][m]); assert.equal(t8.status.o_RB.restOfPlay, true);
    statusAfterPlay({ t8 }, ['o_RB']); assert.equal(t8.status.o_RB, undefined, 'ends at the whistle');
    assert.equal(t8.ability.lb.charges, 0, 'emptied; the activation play cannot recharge');
  }
  const tb = { status: { o_RB: { id: 'slowed', strength: 10, originalStrength: 10, remaining: 2, applications: 1, appliedThisUnit: false, restOfPlay: false } }, ability: { lb: { charges: 3 } } };
  const rb = play({ seed: 2, offensePlay: RUNS[0], def: { LB1: mon(lineup(12, 64).defense.LB1, { id: 'lb', species: 'mireclaw', type: 'Dark' }) }, t8: tb });
  assert.equal(rb.events.find((e) => e.kind === 'status' && e.status === 'weakened').accepted, false, 'blocked by the occupied slot'); assert.equal(tb.ability.lb.charges, 0, 'spent anyway');
  const noRb = Object.values(PLAYS).find((p) => p.side === 'offense' && !p.onField.includes('RB'));
  if (noRb) { const tn = { status: {}, ability: { lb: { charges: 3 } } }; play({ seed: 2, offensePlay: noRb.id, def: { LB1: mon(lineup(12, 64).defense.LB1, { id: 'lb', species: 'mireclaw', type: 'Dark' }) }, t8: tn }); assert.equal(tn.ability.lb.charges, 3, 'no RB: the full charge is held'); }
  let credited = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const t8 = { status: {}, ability: { lb: { charges: 0 } } };
    const r = play({ seed, offensePlay: seed % 2 ? RUNS[seed % RUNS.length] : PASSES[seed % PASSES.length], def: { LB1: mon(lineup(12, 64).defense.LB1, { id: 'lb', species: 'mireclaw', type: 'Dark' }) }, t8 });
    const exp = r.result === 'touchdown' ? 0 : (r.stats.interceptor ? 0 : r.yards) <= 4 ? 1 : 0; credited += exp;
    assert.equal(t8.ability.lb.charges, exp, `seed ${seed}: ${r.result} ${r.yards}`);
  }
  assert.ok(credited >= 5);
  const tt = { status: {}, ability: { lb: { charges: 0 } } };
  for (let seed = 1; seed <= 10; seed++) play({ seed, offensePlay: RUNS[seed % RUNS.length], def: { LB1: mon(lineup(12, 64).defense.LB1, { id: 'lb', species: 'mireclaw', type: 'Dark' }) }, t8: tt, options: { twoPoint: true } });
  assert.equal(tt.ability.lb.charges, 0, 'two-point plays do not charge');
});

// ------------------------------------------------------------------------------------------------------------- DAR-05-F Blackout Pocket
test('Blackout Pocket: his completion of 15+ net yards while ready banks the next offensive Dark field (12x5 from the LOS, ball lateral, -25%); one pending; cooldown 6 after creation; lifetime by mastery on offensive plays', () => {
  let banked = 0;
  for (let seed = 1; seed <= 80 && banked < 3; seed++) {
    const t8 = { status: {}, ability: { qb: { cd: 0, banked: false } } };
    const r = play({ seed, offensePlay: PASSES[seed % PASSES.length], off: { QB: mon(lineup(11, 60).offense.QB, { id: 'qb', species: 'nocturne', type: 'Dark', mastery: 1 }) }, t8, options: { offenseSide: 'home' } });
    const ok = !!r.stats.receiver && !r.stats.interceptor && Math.round(r.yards) >= 15 && r.stats.passer === 'QB';
    assert.equal(t8.ability.qb.banked, ok, `seed ${seed}: ${r.result} ${r.yards}`);
    if (!ok) continue; banked++;
    const [p] = t8.fields.pending; assert.equal(p.side, 'off'); assert.equal(p.type, 'Dark'); assert.equal(p.strength, 25); assert.equal(p.width, 12); assert.deepEqual(p.los, [0, 5]); assert.equal(p.lifetime, 2); assert.equal(p.clock, 'teamOffense'); assert.equal(p.ownerTeam, 'home');
    const t2 = { status: {}, ability: { qb: { cd: 0, banked: true } } }; play({ seed, offensePlay: PASSES[seed % PASSES.length], off: { QB: mon(lineup(11, 60).offense.QB, { id: 'qb', species: 'nocturne', type: 'Dark' }) }, t8: t2 });
    assert.equal(t2.fields?.pending?.length || 0, 0, 'one pending at most');
    const t3 = { status: {}, ability: { qb: { cd: 1, banked: false } } }; play({ seed, offensePlay: PASSES[seed % PASSES.length], off: { QB: mon(lineup(11, 60).offense.QB, { id: 'qb', species: 'nocturne', type: 'Dark' }) }, t8: t3 });
    assert.equal(t3.ability.qb.banked, false, 'not while cooling down (even on the play it reaches zero)'); assert.equal(t3.ability.qb.cd, 0);
  }
  assert.ok(banked >= 1, `observed ${banked}`);
  const { g, teams } = game(9, { setup: (g, t) => { Object.assign(t[g.possession].offense.QB, { species: 'nocturne', form: 'nocturne:0', mastery: 3, type: 'Dark' }); } });
  const side = g.possession, qb = teams[side].offense.QB, ballOn = g.ballOn;
  g.ballLat = 3;
  g.t8 = { status: {}, ability: { [qb.id]: { cd: 0, banked: true } }, fields: { list: [], pending: [{ owner: qb.id, ownerTeam: side, side: 'off', type: 'Dark', ability: 'DAR-05-F', strength: 25, lifetime: 3, clock: 'teamOffense', width: 12, los: [0, 5], latFromBall: 0 }], seq: 0 } };
  const { sim } = R.runScrimmagePlay(g, teams, 'quick_slants', 'cover_3');
  const f = sim.fields.find((x) => x.ability === 'DAR-05-F'); assert.ok(f); assert.ok(near(f.yard[0], 0, 1e-9) && near(f.yard[1], 5, 1e-9) && near(f.lat[0], -6, 1e-9) && near(f.lat[1], 6, 1e-9), 'from the LOS into the defense, centred on the QB');
  assert.equal(g.t8.ability[qb.id].cd, 6); assert.equal(g.t8.ability[qb.id].banked, false);
  const made = fieldsOf(g, 'DAR-05-F'); assert.equal(made.length, 1); assert.equal(made[0].remaining, 2, 'lifetime 3 at mastery 3, spawn counted');
  const abs = side === 'home' ? [ballOn, ballOn + 5] : [100 - ballOn - 5, 100 - ballOn]; assert.ok(near(made[0].yard[0], abs[0], 1e-9) && near(made[0].yard[1], abs[1], 1e-9));
});

// ------------------------------------------------------------------------------------------------------------- DAR-06-F Shadow Exchange
test('Shadow Exchange: at a charged pass release, he swaps positions with the closest able unengaged allied defender within 3 yards of the catch point (closer than he is, within the mastery range); bar spent only on a swap', () => {
  const MAX = [8, 10, 12, 14]; let fired = 0, kept = 0;
  for (let seed = 1; seed <= 240; seed++) { // sample fixed before running: 240 releases (the swap is rare at the release moment)
    const mastery = seed % 4; const t8 = { status: {}, ability: { nx: { charges: 2 } } };
    const r = play({ seed, offensePlay: PASSES[seed % PASSES.length], defensePlay: 'cover_2_man', def: { LB1: mon(lineup(12, 64).defense.LB1, { id: 'nx', species: 'nyxshade', type: 'Dark', mastery }) }, t8 });
    const ev = abilityEvents(r, 'DAR-06-F');
    if (!ev.length) { if (r.stats.passer) kept++; assert.equal(t8.ability.nx.charges, 2, 'invalid opportunity: bar kept'); continue; }
    fired++; const e = ev[0]; assert.equal(ev.length, 1);
    const d = Math.hypot(e.to[0] - e.from[0], e.to[1] - e.from[1]); assert.ok(d <= MAX[mastery] + 1e-6, `swap distance ${d} <= ${MAX[mastery]}`);
    const th = r.events.find((x) => x.kind === 'throw'); assert.ok(th && e.t === th.t, 'at the release');
    assert.equal(t8.ability.nx.charges, 0); assert.equal(t8.mastery.nx.executions, 1);
  }
  assert.ok(fired >= 2 && kept >= 2, `swaps ${fired}, kept ${kept}`);
  // the selection rules, on the hook itself
  const mod = contractOf('nyxshade');
  const mk = (slot, x, y, extra = {}) => ({ slot, team: 'def', x, y, vx: 1, vy: 2, ...extra });
  const run = (others, mastery = 0, selfAt = [0, 0]) => {
    const self = mk('FS', ...selfAt, { mastery, sx: { armed: true, fired: false }, name: 'N' }); const st = { charges: 2 };
    const ctx = { state: () => st, statusOf: (a) => a.st || null, canStartSignature: () => true, canGainCharge: () => true, actors: [self, ...others], dist: (p, q) => Math.hypot(p.x - q.x, p.y - q.y), bounds: { left: -20, right: 20, ownEndLine: -30, endLine: 70 }, executed: () => {}, log: () => {} };
    mod.hooks.passRelease(ctx, self, { ball: { landing: { x: 6, y: 0 } } }); return { self, st };
  };
  { const a = mk('CB1', 5, 0), b = mk('CB2', 7.5, 0); const { self, st } = run([a, b]); assert.deepEqual([self.x, self.y], [5, 0], 'closest to the catch point (stable ties by lineup)'); assert.deepEqual([a.x, a.y], [0, 0]); assert.equal(st.charges, 0); assert.deepEqual([self.vx, self.vy, a.vx, a.vy], [1, 2, 1, 2], 'velocities kept'); }
  { const a = mk('CB1', 9.5, 0); const { st } = run([a]); assert.equal(st.charges, 2, 'beyond 3 yards of the catch point'); }
  { const a = mk('CB1', 5, 0); const { st } = run([a], 0, [6.5, 0]); assert.equal(st.charges, 2, 'not closer than Nyxshade'); }
  { const a = mk('CB1', 5, 0); const { st } = run([a], 0, [-4, 0]); assert.equal(st.charges, 2, '9 yards apart > 8 at mastery 0'); const b = mk('CB1', 5, 0); assert.equal(run([b], 1, [-4, 0]).st.charges, 0, 'within 10 at mastery 1'); }
  { const a = mk('CB1', 5, 0, { engaged: {} }); assert.equal(run([a]).st.charges, 2, 'an engaged partner is invalid'); }
  { const a = mk('CB1', 5, 0, { st: { id: 'knockedDown' } }); assert.equal(run([a]).st.charges, 2, 'a Knocked Down partner is invalid'); }
  { const a = mk('CB1', 5, 0, { team: 'off' }); assert.equal(run([a]).st.charges, 2, 'allies only'); }
  // charging: two PBUs; not on the activation play; not on two-point tries
  const pm = { charges: 0 }; const pctx = (o) => ({ state: () => pm, canGainCharge: () => true, twoPoint: false, stats: { pbuBy: 'FS', interceptor: null }, ...o });
  mod.hooks.playEnd(pctx({}), { team: 'def', slot: 'FS', sx: { fired: true } }); assert.equal(pm.charges, 0, 'the activation play cannot earn charge');
  mod.hooks.playEnd(pctx({ twoPoint: true }), { team: 'def', slot: 'FS', sx: {} }); assert.equal(pm.charges, 0);
  mod.hooks.playEnd(pctx({}), { team: 'def', slot: 'FS', sx: {} }); mod.hooks.playEnd(pctx({}), { team: 'def', slot: 'FS', sx: {} }); mod.hooks.playEnd(pctx({}), { team: 'def', slot: 'FS', sx: {} });
  assert.equal(pm.charges, 2, 'capped at two');
});

test('Wind / Dark contracts: registered once, no legacy effect stacking, game-scope state survives a save (JSON round trip)', () => {
  for (const fam of ['gustling', 'breezefang', 'skywarden', 'windlynx', 'zephyr', 'tempestra', 'shadowkit', 'nightowl', 'duskrunner', 'mireclaw', 'nocturne', 'nyxshade']) assert.ok(contractOf(fam), fam);
  const t8 = JSON.parse(JSON.stringify({ status: {}, ability: { rb: { charges: 2 } } }));
  const r = play({ seed: 1, offensePlay: RUNS[0], off: { RB: mon(lineup(11, 60).offense.RB, { id: 'rb', species: 'breezefang', type: 'Wind' }) }, t8 });
  assert.ok(t8.ability.rb.charges >= 2, 'partial charge persists across plays'); assert.ok(!r.events.some((e) => e.kind === 'ability' && e.trait), 'no legacy trait fires');
});

test('Shadow Exchange (owner N8b): the partner is judged at his predicted position at the ball\'s arrival (position + velocity x remaining flight), from current information only', () => {
  const mod = contractOf('nyxshade');
  const run = (partner, flightTime) => {
    const self = { slot: 'FS', team: 'def', x: 0, y: -8, vx: 0, vy: 0, mastery: 0, sx: { armed: true, fired: false }, name: 'N' }; const st = { charges: 2 };
    const ctx = { state: () => st, statusOf: () => null, canStartSignature: () => true, canGainCharge: () => true, actors: [self, partner], dist: (p, q) => Math.hypot(p.x - q.x, p.y - q.y), bounds: { left: -26, right: 26, ownEndLine: -30, endLine: 70 }, executed: () => {}, log: () => {} };
    mod.hooks.passRelease(ctx, self, { ball: { landing: { x: 2, y: 0 }, flightTime, flight: 0 } }); return { self, st };
  };
  // LB 5 yd from the catch point now, running at it at 8 yd/s: predicted 1.8 yd away after a 0.4 s flight -> qualifies; swap now
  const mk = () => ({ slot: 'LB1', team: 'def', x: 2, y: -5, vx: 0, vy: 8 });
  { const p = mk(); const { self, st } = run(p, 0.4); assert.equal(st.charges, 0, 'swapped'); assert.deepEqual([self.x, self.y], [2, -5], 'Nyxshade takes the partner\'s CURRENT spot (the swap is at the release)'); assert.deepEqual([p.x, p.y], [0, -8]); }
  { const p = mk(); const { st } = run(p, 0); assert.equal(st.charges, 2, 'no flight time left: judged where he stands (5 yd): no swap'); }
  { const p = { ...mk(), vy: -8 }; const { st } = run(p, 0.4); assert.equal(st.charges, 2, 'running away from the catch point: no swap'); }
  const src = readFileSync(new URL('../src/sim/abilities/nyxshade.js', import.meta.url), 'utf8'); assert.ok(!/rng|simulate/.test(src.slice(src.indexOf('passRelease'), src.indexOf('playEnd'))), 'no random draw or simulation in the prediction');
});
