// Task 8 M3 ability contracts, Light and Metal batch (docs/task8/M3_ABILITY_BRIEF.md): Dawn Signal, Guiding Halo, Prism Break,
// Radiant Pursuit, Daybreak (Light); Anchor Plate, Iron Lungs, Gear Grid, Ball Clamp, Bulwark Grid, Fortress Gate (Metal). Each on the
// real engine (synthetic lineups, tests/tools/lineup.js) or the real rules (game states). No probability is asserted by frequency:
// every assertion below is guaranteed behaviour and holds in every case it inspects (B12); minimum-observation counts only check that
// the scenario was exercised.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulatePlay } from '../src/sim/engine.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS } from '../src/data/playbook.js';
import { lineup } from './tools/lineup.js';
import * as R from '../src/sim/rules.js';
import * as F from '../src/core/fraction.js';
import { effectsAt } from '../src/sim/t8/fields.js';
import { contractOf } from '../src/sim/abilities/registry.js';
import { dawnSignalPct } from '../src/sim/abilities/sunwhistle.js';
import { prismBreak, rectDistance, subtract } from '../src/sim/abilities/prism.js';
import { daybreakCharges } from '../src/sim/abilities/aurelion.js';
import { gatePanels, panelRefusal } from '../src/sim/abilities/aegistron.js';
import '../src/sim/abilities/index.js';

const ids = (L, p) => { for (const [s, x] of Object.entries(L)) { x.id = `${p}_${s}`; x.type ||= 'Fire'; } return L; };
/** One engine play: offense lineup(11, 60) as o_<slot>, defense lineup(12, 64) as d_<slot>; mod(o, d) edits the inputs. */
function play(off, def, seed, mod, options = {}, ballOn = 30) {
  const L = ids(lineup(11, 60).offense, 'o'), D = ids(lineup(12, 64).defense, 'd'); mod?.(L, D);
  return simulatePlay({ offensePlay: PLAYS[off], defensePlay: PLAYS[def], offense: L, defense: D, ballOn, seed, options: { offenseSide: 'home', ...options } });
}
const mon = (x, species, extra = {}) => Object.assign(x, { species, form: `${species}:0`, mastery: 0, ...extra });
const ev = (r, ability) => r.events.filter((e) => e.ability === ability);
const RUNS = OFFENSE_IDS.filter((id) => PLAYS[id].type === 'run');
/** A club for the rules (ids <name>_<slot>, kicker <name>_K). */
function club(name, seed, kicking = 60) {
  const x = lineup(seed, 60); ids(x.offense, `${name}o`); ids(x.defense, `${name}d`);
  return { id: name, name, offense: x.offense, defense: x.defense, kicker: { attrs: { kicking }, name: `${name} K`, id: `${name}_K`, type: 'Fire' } };
}
function game(seed, { kicking = 60 } = {}) {
  const teams = { home: club('H', 11, kicking), away: club('A', 12, kicking) };
  const g = R.newGame({ home: teams.home, away: teams.away, seed, quarterLength: 900, coinWinner: 'home', choice: 'receive' });
  g.t8 = { status: {} }; return { g, teams };
}

// ------------------------------------------------------------------------------------------------ LIG-02-F Dawn Signal
test('Dawn Signal: banked only by a successful extra point (not a miss, a field goal or a two-point try), at most one pending', () => {
  let good = 0, miss = 0;
  for (let seed = 1; seed <= 40 && (good < 2 || miss < 1); seed++) {
    const { g, teams } = game(seed, { kicking: seed % 2 ? 99 : 1 }); mon(teams.home.kicker, 'sunwhistle');
    g.phase = 'try'; g.tryTeam = 'home'; g.possession = 'home';
    const res = R.attemptTryKick(g, teams); const st = g.t8.ability?.H_K;
    if (res.good) { good++; assert.equal(st.pending, true, 'banked'); } else { miss++; assert.ok(!st?.pending, 'a miss banks nothing'); }
  }
  assert.ok(good >= 2 && miss >= 1, `cases ${good}/${miss}`);
  const { g, teams } = game(3, { kicking: 99 }); mon(teams.home.kicker, 'sunwhistle'); g.phase = 'scrimmage'; g.possession = 'home'; g.ballOn = 80;
  R.doFieldGoal(g, teams); assert.ok(!g.t8.ability?.H_K?.pending, 'a field goal banks nothing');
  const { g: g2, teams: t2 } = game(4); mon(t2.home.kicker, 'sunwhistle'); g2.phase = 'try'; g2.tryTeam = 'home'; g2.possession = 'home';
  R.attemptTwoPoint(g2, t2, 'inside_zone', 'cover_3'); assert.ok(!g2.t8.ability?.H_K?.pending, 'a two-point try banks nothing');
  assert.equal(dawnSignalPct('sunwhistle:0', 0), 15); assert.equal(dawnSignalPct('sunwhistle:1', 0), 20); assert.equal(dawnSignalPct('sunwhistle:1', 3), 29, 'Heliark +20, mastery +9');
});

/** A live kickoff by home (Solchirp kicker) with t8 prepared by prep(g, teams); returns null on a touchback (no coverage played). */
function kickoff(seed, prep) {
  const { g, teams } = game(seed, { kicking: 20 }); mon(teams.home.kicker, 'sunwhistle');
  g.phase = 'kickoff'; g.kickingTeam = 'home'; g.possession = 'away'; prep?.(g, teams);
  const out = R.doKickoff(g, teams); return { ...out, g, teams };
}
test('Dawn Signal: on the live kickoff the nearest non-K coverage teammate (lineup tie) attempts Quickened for that play only; the token is consumed', () => {
  let cast = 0, tb = 0;
  for (let seed = 1; seed <= 30 && cast < 4; seed++) {
    const k = kickoff(seed, (g) => { g.t8.ability = { H_K: { pending: true } }; });
    if (!k.sim) { tb++; assert.equal(k.g.t8.ability.H_K.pending, true, 'a touchback plays no coverage: the token waits'); continue; }
    const e = ev(k.sim, 'LIG-02-F'); assert.equal(e.length, 1); cast++;
    const f0 = k.sim.frames.find((f) => f.t === 0) || k.sim.frames[0]; const K = f0.def.find((p) => p[0] === 'K');
    const others = f0.def.filter((p) => p[0] !== 'K'); const dmin = Math.min(...others.map((p) => Math.hypot(p[1] - K[1], p[2] - K[2])));
    const first = others.find((p) => Math.abs(Math.hypot(p[1] - K[1], p[2] - K[2]) - dmin) < 1e-6);
    assert.equal(e[0].target, first[0], 'nearest, first in lineup order on a tie'); assert.equal(e[0].accepted, true); assert.equal(e[0].pct, 15);
    assert.equal(k.g.t8.ability.H_K.pending, false, 'consumed');
    assert.equal(k.g.t8.status[k.teams.home.defense[e[0].target]?.id], undefined, 'Quickened clears at the whistle');
    assert.equal(k.g.t8.mastery.H_K.executions, 1);
    // the same kickoff without the token: identical physics until the quickened teammate outruns himself
    const base = kickoff(seed, () => {});
    const at = (sim, t) => sim.frames.find((f) => f.t >= t).def.find((p) => p[0] === e[0].target);
    assert.ok(at(k.sim, 1.5)[1] - at(base.sim, 1.5)[1] < -0.3, 'he has run farther downfield by 1.5 s (max speed and acceleration up)');
  }
  assert.ok(cast >= 2, `casts ${cast} (touchbacks ${tb})`);
});
test('Dawn Signal: an existing different status blocks yet spends the token; a Stunned kicker delays it', () => {
  let blocked = 0, delayed = 0;
  for (let seed = 1; seed <= 30 && (blocked < 1 || delayed < 1); seed++) {
    const all = (teams) => Object.values(teams.home.defense).map((x) => x.id);
    const k = kickoff(seed, (g, teams) => { g.t8.ability = { H_K: { pending: true } }; for (const id of all(teams)) g.t8.status[id] = { id: 'slowed', strength: 10, originalStrength: 10, remaining: 3, applications: 1, appliedThisUnit: false, restOfPlay: false }; });
    if (k.sim) { const e = ev(k.sim, 'LIG-02-F'); assert.equal(e.length, 1); assert.equal(e[0].accepted, false); assert.equal(k.g.t8.ability.H_K.pending, false, 'spent even though blocked'); blocked++; }
    const s = kickoff(seed, (g) => { g.t8.ability = { H_K: { pending: true } }; g.t8.status.H_K = { id: 'stunned', strength: 1, originalStrength: 1, remaining: 1, applications: 1, appliedThisUnit: false, restOfPlay: false }; });
    if (s.sim) { assert.equal(ev(s.sim, 'LIG-02-F').length, 0); assert.equal(s.g.t8.ability.H_K.pending, true, 'a Stunned source delays the token'); delayed++; }
  }
  assert.ok(blocked && delayed);
});

// ------------------------------------------------------------------------------------------------ LIG-03-F Guiding Halo
test('Guiding Halo: a reception inside the mastery radius of the able QB attempts Shielded (one fumble save, 2 plays); cooldown 5 from the next play', () => {
  let shielded = 0, outside = 0;
  for (const mastery of [0, 3]) for (let seed = 1; seed <= 30; seed++) {
    const t8 = { status: {} };
    const r = play('rb_screen', 'cover_3', seed, (o) => mon(o.QB, 'lumen', { mastery }), { t8, forcedTarget: 'RB' });
    if (r.stats.receiver !== 'RB') continue; const e = ev(r, 'LIG-03-F'); const R0 = [6, 8, 10, 12][mastery];
    if (e.length) {
      assert.ok(e[0].dist <= R0, 'inside the radius'); assert.equal(e[0].target, 'RB'); shielded++;
      if (e[0].accepted) { const s = t8.status.o_RB; assert.equal(s?.id, 'shielded'); assert.equal(s.remaining, 2); assert.equal(s.payload.fumbleSaves, 1); assert.equal(s.payload.clashPoolPct, 15); }
      assert.equal(t8.ability.o_QB.cd, 5, 'spent; the application play excluded');
      play('inside_zone', 'cover_3', seed, (o) => mon(o.QB, 'lumen', { mastery }), { t8 }); assert.equal(t8.ability.o_QB.cd, 4, 'one subsequent offensive play');
    } else { outside++; assert.equal(t8.ability.o_QB.cd, 0); }
  }
  assert.ok(shielded >= 4 && outside >= 1, `${shielded} shielded, ${outside} outside the 6-yard radius`);
});
test('Guiding Halo exceptions: cooldown, a Stunned QB, a blocked status (still spent), two-point tries', () => {
  let n = 0;
  for (let seed = 1; seed <= 30 && n < 3; seed++) {
    const base = play('rb_screen', 'cover_3', seed, (o) => mon(o.QB, 'lumen', { mastery: 3 }), { t8: { status: {} }, forcedTarget: 'RB' });
    if (!ev(base, 'LIG-03-F').length) continue; n++;
    const cd = { status: {}, ability: { o_QB: { cd: 2 } } };
    assert.equal(ev(play('rb_screen', 'cover_3', seed, (o) => mon(o.QB, 'lumen', { mastery: 3 }), { t8: cd, forcedTarget: 'RB' }), 'LIG-03-F').length, 0, 'not ready'); assert.equal(cd.ability.o_QB.cd, 1);
    const stun = { status: { o_QB: { id: 'stunned', strength: 1, originalStrength: 1, remaining: 0, applications: 1, appliedThisUnit: false, restOfPlay: true } } };
    assert.equal(ev(play('rb_screen', 'cover_3', seed, (o) => mon(o.QB, 'lumen', { mastery: 3 }), { t8: stun, forcedTarget: 'RB' }), 'LIG-03-F').length, 0, 'a Stunned QB prevents');
    const occ = { status: { o_RB: { id: 'slowed', strength: 5, originalStrength: 5, remaining: 3, applications: 1, appliedThisUnit: false, restOfPlay: false } } };
    const rb = play('rb_screen', 'cover_3', seed, (o) => mon(o.QB, 'lumen', { mastery: 3 }), { t8: occ, forcedTarget: 'RB' });
    if (rb.stats.receiver === 'RB' && ev(rb, 'LIG-03-F').length) { assert.equal(ev(rb, 'LIG-03-F')[0].accepted, false); assert.equal(occ.status.o_RB.id, 'slowed'); assert.equal(occ.ability.o_QB.cd, 5, 'spent even when blocked'); }
    const two = { status: {} }; play('rb_screen', 'cover_3', seed, (o) => mon(o.QB, 'lumen', { mastery: 3 }), { t8: two, forcedTarget: 'RB', twoPoint: true });
    assert.ok(!two.status.o_RB && !(two.ability?.o_QB?.cd > 0), 'two-point tries excluded');
  }
  assert.ok(n >= 2);
});

// ------------------------------------------------------------------------------------------------ LIG-04-F Prism Break
const fld = (id, type, yard, lat, createdAt, ownerTeam = 'away') => ({ id, type, yard, lat, createdAt, ownerTeam, owner: `${ownerTeam}_x`, remaining: 2, clock: 'scrimmageAny' });
test('Prism Break geometry: the nearest enemy zone by edge distance (creation order ties); a base zone goes entirely; an overlap only within its footprint', () => {
  const t8 = { fields: { list: [fld('F1', 'Fire', [40, 46], [-5, 5], 1), fld('F2', 'Ice', [60, 66], [-5, 5], 2), fld('F3', 'Wind', [40, 46], [-5, 5], 3, 'home')] } };
  assert.equal(prismBreak(t8, { yard: 50, lat: 0 }, 'home').fields[0].id, 'F1', 'nearer edge (4 vs 10), own field F3 never eligible');
  assert.deepEqual(t8.fields.list.map((f) => f.id), ['F2', 'F3'], 'the base zone is removed entirely, nothing else');
  const tie = { fields: { list: [fld('A', 'Fire', [40, 44], [-2, 2], 5), fld('B', 'Ice', [56, 60], [-2, 2], 4)] } };
  assert.equal(prismBreak(tie, { yard: 50, lat: 0 }, 'home').fields[0].id, 'B', 'equal distance: the older zone');
  // Light + Dark = Eclipse overlap at [44,46] x [-5,5]: standing in it, it is the nearest zone (the parents' footprints exclude it)
  const mk = () => ({ fields: { list: [fld('L', 'Light', [36, 46], [-5, 5], 1), fld('D', 'Dark', [44, 54], [-5, 5], 2)] } });
  const o = mk(); const z = prismBreak(o, { yard: 45, lat: 0 }, 'home'); assert.equal(z.kind, 'overlap'); assert.deepEqual(z.rect, { yard: [44, 46], lat: [-5, 5] });
  assert.equal(o.fields.list.length, 2, 'both parents remain');
  const at = (fl, y) => effectsAt(fl, y, 0, 'Fire');
  assert.deepEqual(at(o.fields.list, 45), { base: [], hybrid: null }, 'no hybrid and no parent effect returns in the footprint');
  assert.deepEqual(at(o.fields.list, 40).base.map((b) => b.type), ['Light']); assert.deepEqual(at(o.fields.list, 50).base.map((b) => b.type), ['Dark'], 'remaining parent portions intact');
  assert.equal(prismBreak(o, { yard: 45, lat: 0 }, 'home').kind, 'base', 'a removed footprint is never selected again');
  const p2 = mk(); assert.equal(prismBreak(p2, { yard: 40, lat: 0 }, 'home').fields[0].id, 'L', 'standing in the Light part: the Light base zone');
  assert.deepEqual(p2.fields.list.map((f) => f.id), ['D']); assert.equal(at(p2.fields.list, 45).hybrid, null, 'its hybrid goes with it');
  assert.equal(prismBreak({ fields: { list: [fld('X', 'Fire', [0, 5], [0, 5], 1, 'home')] } }, { yard: 3, lat: 3 }, 'home'), null, 'no target');
  assert.equal(rectDistance({ yard: 50, lat: 0 }, { yard: [40, 46], lat: [-5, 5] }), 4); assert.equal(rectDistance({ yard: 42, lat: 0 }, { yard: [40, 46], lat: [-5, 5] }), 0);
  assert.deepEqual(subtract({ yard: [0, 10], lat: [0, 10] }, { yard: [2, 4], lat: [-1, 11] }), [{ yard: [0, 2], lat: [0, 10] }, { yard: [4, 10], lat: [0, 10] }]);
});
test('Prism Break in a game: three charges remove the selected zone at his defensive pre-choice point; no target or a Stunned source keeps the bar; the activation play cannot recharge', () => {
  const run = (prep) => { const { g, teams } = game(7); g.phase = 'scrimmage'; g.possession = 'home'; g.ballOn = 40; mon(teams.away.defense.FS, 'prism'); prep(g, teams); R.runScrimmagePlay(g, teams, 'inside_zone', 'cover_3'); return g; };
  const enemy = (g) => { g.t8.fields = { list: [{ ...fld('F9', 'Fire', [55, 61], [-4, 4], 0, 'home'), owner: 'Ho_RB' }], pending: [], seq: 9 }; };
  let g = run((g) => { enemy(g); g.t8.ability = { Ad_FS: { charges: 3 } }; });
  assert.equal(g.t8.fields.list.length, 0, 'removed'); assert.equal(g.t8.ability.Ad_FS.charges, 0, 'all three spent, none regained on the activation play');
  assert.ok(g.log.some((l) => l.ability === 'LIG-04-F'));
  g = run((g) => { g.t8.ability = { Ad_FS: { charges: 3 } }; }); assert.equal(g.t8.ability.Ad_FS.charges, 3, 'no target: full bar kept');
  g = run((g) => { enemy(g); g.t8.ability = { Ad_FS: { charges: 3 } }; g.t8.status.Ad_FS = { id: 'stunned', strength: 1, originalStrength: 1, remaining: 1, applications: 1, appliedThisUnit: false, restOfPlay: false }; });
  assert.equal(g.t8.fields.list.length, 1); assert.equal(g.t8.ability.Ad_FS.charges, 3, 'unable source keeps readiness');
  g = run((g) => { g.t8.fields = { list: [{ ...fld('F8', 'Fire', [55, 61], [-4, 4], 0, 'away'), owner: 'Ad_CB1' }], pending: [], seq: 8 }; g.t8.ability = { Ad_FS: { charges: 3 } }; });
  assert.equal(g.t8.fields.list.length, 1, 'own field never removed');
});
test('Prism Break charging: one charge per defensive play with his tackle or pass breakup, three at most; kickoffs excluded', () => {
  let earned = 0;
  for (let seed = 1; seed <= 50; seed++) {
    const t8 = { status: {}, ability: { d_SS: { charges: seed % 4 === 0 ? 3 : 1 } } }; const before = t8.ability.d_SS.charges;
    const r = play(seed % 2 ? RUNS[seed % RUNS.length] : 'curl_flat', 'cover_3', seed, (o, d) => mon(d.SS, 'prism'), { t8 });
    const credit = (r.stats.tackler === 'SS' && r.result !== 'sack' && r.result !== 'touchdown' && !r.stats.defensiveScore) || r.stats.pbuBy === 'SS';
    assert.equal(t8.ability.d_SS.charges, Math.min(3, before + (credit ? 1 : 0)), `seed ${seed}`); if (credit && before < 3) earned++;
  }
  assert.ok(earned >= 2, `earned ${earned}`);
});

// ------------------------------------------------------------------------------------------------ LIG-05-F Radiant Pursuit
test('Radiant Pursuit: an armed bar empties at his defensive snap; allied bodies stop obstructing him while he chases the carrier, until his first tackle attempt', () => {
  let lit = 0, overlapWith = 0, overlapWithout = 0;
  const minAllyGap = (r) => { let m = Infinity; for (const f of r.frames) { if (!f.holderTeam || f.holderTeam !== 'off' || f.phase !== 'carry') continue; const me = f.def.find((p) => p[0] === 'LB1'); for (const p of f.def) if (p[0] !== 'LB1') m = Math.min(m, Math.hypot(p[1] - me[1], p[2] - me[2])); } return m; };
  for (let seed = 1; seed <= 40; seed++) {
    const run = RUNS[seed % RUNS.length];
    const t8 = { status: {}, ability: { d_LB1: { tackles: 0, armed: true } } };
    const r = play(run, 'cover_3', seed, (o, d) => mon(d.LB1, 'halofang'), { t8 });
    assert.equal(ev(r, 'LIG-05-F').filter((e) => e.kind === 'ability').length, 1, 'activates at the snap'); assert.deepEqual(t8.ability.d_LB1, { tackles: 0, armed: false }, 'charge empties; the activation play cannot recharge'); lit++;
    const end = r.events.find((e) => e.kind === 'ability_end' && e.ability === 'LIG-05-F'); const tk = r.events.find((e) => (e.kind === 'tackle' && e.by === 'LB1') || (e.kind === 'broken_tackle' && e.victim === 'LB1'));
    if (tk) assert.ok(end && end.t <= tk.t, 'pursuit mode ends before (at) his first tackle attempt');
    if (minAllyGap(r) < 0.55) overlapWith++;
    if (minAllyGap(play(run, 'cover_3', seed, (o, d) => mon(d.LB1, 'halofang'), { t8: { status: {} } })) < 0.55) overlapWithout++;
  }
  assert.ok(lit >= 30 && overlapWith > overlapWithout, `allied overlaps with ${overlapWith} vs without ${overlapWithout}`);
  // a Stunned (sits out) or Knocked Down source keeps the bar
  const t8 = { status: { d_LB1: { id: 'stunned', strength: 1, originalStrength: 1, remaining: 1, applications: 1, appliedThisUnit: false, restOfPlay: false } }, ability: { d_LB1: { tackles: 0, armed: true } } };
  play('inside_zone', 'cover_3', 1, (o, d) => mon(d.LB1, 'halofang'), { t8 }); assert.equal(t8.ability.d_LB1.armed, true);
});
test('Radiant Pursuit charging: personal rushing tackles or assists, once per play, 3 / 3 / 2 / 2 by mastery; never on passes or kickoffs', () => {
  for (const mastery of [0, 2]) {
    let credited = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const t8 = { status: {}, ability: { d_LB1: { tackles: 1, armed: false } } };
      const r = play(seed % 3 ? RUNS[seed % RUNS.length] : 'curl_flat', 'cover_3', seed, (o, d) => mon(d.LB1, 'halofang', { mastery }), { t8 });
      const S = r.stats; const rush = S.carrier && !S.receiver && !S.passer && r.result !== 'sack' && r.result !== 'touchdown' && !S.defensiveScore;
      const q = rush && (S.tackler === 'LB1' || S.assistBy === 'LB1');
      assert.deepEqual(t8.ability.d_LB1, q ? (mastery === 2 ? { tackles: 2, armed: true } : { tackles: 2, armed: false }) : { tackles: 1, armed: false }, `m${mastery} seed ${seed}`);
      if (q) credited++;
    }
    assert.ok(credited >= 3, `credited ${credited}`);
  }
});

// ------------------------------------------------------------------------------------------------ LIG-06-F Daybreak
test('Daybreak ledger: every opposing touchdown counts (offense, defense, returns), two arm it, the flare spends both, touchdowns while armed add nothing', () => {
  const { g, teams } = game(5); g.phase = 'scrimmage'; g.possession = 'away';
  const fake = (result, extra = {}) => ({ result, yards: 10, endYard: 100, elapsed: 5, seed: 1, ballOn: 90, stats: { carrier: 'RB', ...extra }, events: [], names: { off: { RB: 'r' }, def: {} }, frames: [] });
  R.applyScrimmageResult(g, fake('touchdown')); assert.deepEqual(g.t8.touchdowns, { home: 0, away: 1 });
  g.phase = 'scrimmage'; g.possession = 'home'; R.applyScrimmageResult(g, fake('touchdown', { defensiveScore: true, interceptor: 'CB1' })); assert.deepEqual(g.t8.touchdowns, { home: 0, away: 2 }, 'a defensive (return) touchdown counts for the scoring club');
  assert.equal(daybreakCharges(g.t8, 'home', { mark: 0 }), 2); assert.equal(daybreakCharges(g.t8, 'away', { mark: 0 }), 0);
  assert.equal(daybreakCharges({ touchdowns: { away: 5 } }, 'home', { mark: 0 }), 2, 'the bar holds two'); assert.equal(daybreakCharges({ touchdowns: { away: 5 } }, 'home', { mark: 5 }), 0);
  assert.equal(daybreakCharges({ touchdowns: { away: 6 } }, 'home', { mark: 5 }), 1, 'recharges after the flare');
});
test('Daybreak flare: after an armed live reception every other monster wanders, starts no tackle and no block, until the whistle; unarmed or scoring catches keep it', () => {
  let flared = 0, quiet = 0, scored = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const t8 = { status: {}, touchdowns: { home: 0, away: seed % 5 === 0 ? 1 : 2 } };
    const r = play('quick_slants', 'cover_3', seed, (o) => mon(o.WR1, 'aurelion'), { t8, forcedTarget: 'WR1' });
    if (r.stats.receiver !== 'WR1') continue; const e = ev(r, 'LIG-06-F');
    if (seed % 5 === 0) { assert.equal(e.length, 0, 'one charge: not armed'); quiet++; continue; }
    if (r.result === 'touchdown' && r.stats.catchX >= r.bounds.goal) { assert.equal(e.length, 0); assert.ok(!(t8.ability?.o_WR1?.mark), 'a scoring catch keeps the readiness'); scored++; continue; }
    if (r.result === 'out_of_bounds' && !e.length) continue; // a dead catch
    assert.equal(e.length, 1); flared++;
    assert.equal(e[0].affected.length, 13, 'every other monster on the field, both teams'); assert.equal(t8.ability.o_WR1.mark, 2, 'both charges spent');
    const after = r.events.slice(r.events.indexOf(e[0]) + 1);
    assert.ok(!after.some((x) => ['tackle', 'broken_tackle', 'broken', 'shed', 'pancake'].includes(x.kind)), 'no tackle attempt or block after the flare');
    assert.ok(['touchdown', 'out_of_bounds', 'guard'].includes(r.result), r.result);
  }
  assert.ok(flared >= 3 && quiet >= 1, `flared ${flared}, quiet ${quiet}, scored ${scored}`);
  const t8 = { status: {}, touchdowns: { home: 0, away: 2 } };
  play('quick_slants', 'cover_3', 3, (o) => mon(o.WR1, 'aurelion'), { t8, forcedTarget: 'WR1', twoPoint: true }); assert.ok(!t8.ability?.o_WR1?.mark, 'not on a two-point try');
});

// ------------------------------------------------------------------------------------------------ MET-01-F Anchor Plate
test('Anchor Plate: at his first engagement, while ready, the first 0.5 / 0.75 / 1 / 1.25 yd of backward push is absorbed once a play; cooldown 5 / 4 / 3 / 2 after the spending play', () => {
  const AL = [0.5, 0.75, 1, 1.25], CD = [5, 4, 3, 2]; let spent = 0, full = 0;
  for (const mastery of [0, 3]) for (let seed = 1; seed <= 25; seed++) {
    const t8 = { status: {} };
    const r = play(seed % 2 ? 'dagger' : 'smash', 'all_out', seed, (o, d) => { mon(o.LG, 'ironcub', { mastery }); Object.assign(o.LG.attrs, { blocking: 30, strength: 30 }); }, { t8 });
    const e = ev(r, 'MET-01-F'); if (!e.length) { assert.equal(t8.ability.o_LG.cd, 0, 'nothing absorbed: readiness persists'); continue; }
    spent++; const end = e.find((x) => x.kind === 'ability_end'); assert.ok(end.absorbed > 0 && end.absorbed <= AL[mastery] + 1e-9, `${end.absorbed}`);
    if (Math.abs(end.absorbed - AL[mastery]) < 1e-9) full++;
    assert.equal(t8.ability.o_LG.cd, CD[mastery], 'cooldown, the spending play excluded');
    const next = play('inside_zone', 'cover_3', seed + 100, (o) => mon(o.LG, 'ironcub', { mastery }), { t8 });
    assert.equal(ev(next, 'MET-01-F').length, 0, 'not ready during the cooldown'); assert.equal(t8.ability.o_LG.cd, CD[mastery] - 1);
  }
  assert.ok(spent >= 5 && full >= 2, `spent ${spent}, budget fully used ${full}`);
  const k = { status: {} }; const tp = play('dagger', 'all_out', 1, (o) => { mon(o.LG, 'ironcub'); Object.assign(o.LG.attrs, { blocking: 30, strength: 30 }); }, { t8: k, twoPoint: true });
  assert.equal(ev(tp, 'MET-01-F').length, 0); assert.ok(!(k.ability?.o_LG?.cd > 0), 'not on a two-point try');
});

// ------------------------------------------------------------------------------------------------ MET-02-F Iron Lungs
test('Iron Lungs: himself and the nearest ally within the radius at the snap; every second qualifying play drains 0 instead of 1; progress per monster, no stacking', () => {
  const { g, teams } = game(9); g.phase = 'scrimmage'; g.possession = 'home'; g.ballOn = 30;
  mon(teams.away.defense.LB1, 'steelpaw', { mastery: 3 });
  const sta = (id) => (g.t8.stamina?.[id] ? F.toNumber(g.t8.stamina[id].stamina) : null);
  const drains = []; let ally = null;
  for (let i = 0; i < 4; i++) {
    if (g.phase !== 'scrimmage' || g.possession !== 'home') { g.phase = 'scrimmage'; g.possession = 'home'; g.ballOn = 30; g.down = 1; g.toGo = 10; }
    const before = sta('Ad_LB1') ?? Math.round(teams.away.defense.LB1.attrs.durability); const { sim } = R.runScrimmagePlay(g, teams, 'inside_zone', 'cover_3');
    drains.push(before - sta('Ad_LB1')); const e = ev(sim, 'MET-02-F'); if (e.length) ally = e[0].targets.find((s) => s !== 'LB1') || ally;
  }
  assert.deepEqual(drains, [1, 0, 1, 0], 'baseline 1 drains 1, then 0, and repeats');
  assert.ok(ally, 'an ally was protected'); assert.equal(g.t8.ironLungs.progress[`Ad_${ally}`], 0);
  // two copies on one ally do not stack (the ledger counts once per monster per play)
  const t8 = { status: {} }; play('inside_zone', 'cover_3', 2, (o, d) => { mon(d.LB1, 'steelpaw', { mastery: 3 }); mon(d.LB2, 'steelpaw', { mastery: 3 }); }, { t8 });
  for (const v of Object.values(t8.ironLungs.progress)) assert.equal(v, 1);
  const k = { status: {} }; play('inside_zone', 'cover_3', 2, (o, d) => mon(d.LB1, 'steelpaw'), { t8: k, kickoff: null, twoPoint: true }); assert.ok(!k.ironLungs, 'two-point tries excluded');
});

// ------------------------------------------------------------------------------------------------ MET-03-F Gear Grid
test('Gear Grid: a punt of 35+ net yards (no touchback) banks one Metal field, created off the field at the opponent snap, 10x6 at LOS+5, life 1 / 2 / 2 / 3 on his club\'s defensive plays', () => {
  let banked = 0, short = 0;
  for (let seed = 1; seed <= 30 && (banked < 2 || short < 1); seed++) {
    const { g, teams } = game(seed, { kicking: seed % 3 ? 99 : 1 }); mon(teams.home.kicker, 'gearwing', { mastery: 3 }); g.phase = 'scrimmage'; g.possession = 'home'; g.ballOn = 20;
    const { res } = R.doPunt(g, teams); const net = res.blocked || res.touchback || res.touchdown ? null : (100 - res.ballOn) - 20;
    const pend = g.t8.fields?.pending || [];
    if (net == null || net < 35) { assert.equal(pend.length, 0, `net ${net}`); short++; continue; }
    assert.equal(pend.length, 1); banked++;
    const punt = () => { g.possession = 'home'; g.phase = 'scrimmage'; g.ballOn = 20; g.down = 4; g.toGo = 10; return R.doPunt(g, teams).res; };
    const snap = () => { g.possession = 'away'; g.phase = 'scrimmage'; g.ballOn = 40; g.ballLat = 0; g.down = 1; g.toGo = 10; R.runScrimmagePlay(g, teams, 'inside_zone', 'cover_3'); };
    punt(); assert.equal(g.t8.fields.pending.length, 1, 'one pending token at most');
    snap();
    const f = g.t8.fields.list.find((x) => x.ability === 'MET-03-F'); assert.ok(f, 'created at the opponent snap with the kicker off the field'); assert.equal(g.t8.fields.pending.length, 0);
    assert.equal(f.type, 'Metal'); assert.deepEqual(f.lat, [-5, 5]); assert.deepEqual(f.yard, [100 - 48, 100 - 42], '6 long centred on the opponent LOS + 5 (away frame)'); assert.equal(f.remaining, 2, 'life 3 at mastery 3, the spawn play counted');
    for (let i = 0; i < 6 && !g.t8.fields.pending.length; i++) punt();
    if (g.t8.fields.pending.length) { snap(); assert.equal(f.remaining, 1, "his club's defensive play counted"); assert.equal(g.t8.fields.pending.length, 1, 'a new token waits while his own field is active'); assert.equal(g.t8.fields.list.filter((x) => x.ability === 'MET-03-F').length, 1); }
  }
  assert.ok(banked >= 1 && short >= 1, `banked ${banked}, short ${short}`);
});

// ------------------------------------------------------------------------------------------------ MET-04-F Ball Clamp
const rush = (o, d) => { for (const k of ['DL1', 'DL2', 'DL3']) if (d[k]) Object.assign(d[k].attrs, { speed: 95, tackling: 95, strength: 95 }); for (const k of ['LG', 'RG', 'C', 'TE']) if (o[k]) Object.assign(o[k].attrs, { blocking: 20, strength: 20 }); };
test('Ball Clamp: his own sack earns the token; a successful tackle spends it on one extra check at 0.25 / 0.40 / 0.55 / 0.70 of the normal fumble chance; a failed tackle keeps it', () => {
  let earned = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const t8 = { status: {} }; const r = play('dagger', 'all_out', seed, (o, d) => { mon(d.DL1, 'ironjaw'); rush(o, d); }, { t8 });
    const own = r.result === 'sack' && r.stats.tackler === 'DL1'; assert.equal(!!t8.ability.d_DL1.token, own, `seed ${seed}`); if (own) earned++;
  }
  assert.ok(earned >= 3);
  let spent = 0;
  for (let seed = 1; seed <= 60 && spent < 4; seed++) {
    const go = (mastery) => { const t8 = { status: {}, ability: { d_DL1: { token: true } } }; const r = play(RUNS[seed % RUNS.length], 'run_wall', seed, (o, d) => { mon(d.DL1, 'ironjaw', { mastery }); rush(o, d); }, { t8 }); return { r, t8 }; };
    const a = go(0), b = go(3); const e = ev(a.r, 'MET-04-F');
    const tackledByHim = ['tackle', 'fumble', 'safety'].includes(a.r.result) && a.r.stats.tackler === 'DL1' && !a.r.events.some((x) => x.offBlock && x.by === 'DL1');
    if (!e.length) { assert.equal(a.t8.ability.d_DL1.token, true, 'no successful normal tackle by him: token kept'); continue; }
    assert.ok(tackledByHim || a.r.result === 'fumble'); spent++;
    assert.equal(a.t8.ability.d_DL1.token, false, 'consumed'); assert.equal(a.t8.mastery.d_DL1.executions, 1);
    const eb = ev(b.r, 'MET-04-F')[0]; assert.ok(eb, 'same play at mastery 3'); assert.ok(Math.abs(eb.p / e[0].p - 0.70 / 0.25) < 1e-9, 'factor by mastery on the same normal probability');
    assert.ok(e[0].p > 0 && e[0].p <= 0.012 * 1.6 * 1.4 * 1.3 * 0.25 + 1e-12);
  }
  assert.ok(spent >= 2, `spent ${spent}`);
  const two = { status: {}, ability: { d_DL1: { token: true } } }; for (let s = 1; s <= 5; s++) play('inside_zone', 'run_wall', s, (o, d) => { mon(d.DL1, 'ironjaw'); rush(o, d); }, { t8: two, twoPoint: true });
  assert.equal(two.ability.d_DL1.token, true, 'defensive scrimmage only');
});

// ------------------------------------------------------------------------------------------------ MET-05-F Bulwark Grid
test('Bulwark Grid: a receiving first down while ready banks an 8x4 Metal field from the LOS into the backfield, created at his next offensive snap; cooldown 6 / 5 / 4 / 3 from creation; life 1 / 1 / 2 / 2', () => {
  let checked = 0;
  for (let seed = 1; seed <= 40 && checked < 2; seed++) {
    const { g, teams } = game(seed); g.phase = 'scrimmage'; g.possession = 'home'; g.ballOn = 30; g.toGo = 1;
    mon(teams.home.offense.TE, 'metalhorn', { mastery: 2, type: 'Metal' });
    const { sim } = R.runScrimmagePlay(g, teams, 'stick', 'cover_3', { forcedTarget: 'TE' });
    if (sim.stats.receiver !== 'TE' || g.possession !== 'home' || sim.yards < 1 || g.phase !== 'scrimmage') continue;
    const st = g.t8.ability.Ho_TE; assert.equal(st.banked, true); assert.equal(g.t8.fields.pending.length, 1); assert.equal(g.t8.fields.list.length, 0, 'not yet created');
    const los = g.ballOn; R.runScrimmagePlay(g, teams, 'inside_zone', 'cover_3');
    assert.equal(st.cd, 4, 'mastery 2 cooldown 4, started at creation'); assert.equal(st.banked, false);
    const f = g.t8.fields.list[0]; assert.ok(f); assert.equal(f.type, 'Metal'); assert.deepEqual(f.yard, [los - 4, los]); assert.deepEqual(f.lat, [-4, 4]); assert.equal(f.remaining, 1, 'life 2, the spawn play counted');
    checked++;
  }
  assert.ok(checked >= 1, `observed ${checked}`);
  // the pancake path: credited to him only from an OL slot
  let pancaked = 0;
  for (let seed = 1; seed <= 60 && !pancaked; seed++) {
    const t8 = { status: {} }; const r = play(RUNS[seed % RUNS.length], 'cover_3', seed, (o, d) => { mon(o.LG, 'metalhorn'); Object.assign(o.LG.attrs, { blocking: 99, strength: 99, tackling: 99 }); for (const x of Object.values(d)) Object.assign(x.attrs, { strength: 15, agility: 15 }); }, { t8 });
    if ((r.stats.blockers.LG?.pancakes || 0) > 0) { pancaked++; assert.equal(t8.ability.o_LG.banked, true); assert.equal(t8.fields.pending[0].ability, 'MET-05-F'); }
    else assert.ok(!t8.ability.o_LG.banked || r.stats.receiver === 'LG');
  }
  assert.ok(pancaked, 'a pancake banked it');
});

// ------------------------------------------------------------------------------------------------ MET-06-F Fortress Gate
test('Fortress Gate: an armed snap plants two stationary panels beside him (width by mastery, 0.5 thick, 1-yard gaps) that no body enters; once per possession; illegal placement keeps everything', () => {
  for (const mastery of [0, 1]) for (let seed = 1; seed <= 10; seed++) {
    const t8 = { status: {}, ability: { d_DL1: { count: 0, armed: true, usedDrive: null } } };
    const r = play(seed % 2 ? 'inside_zone' : 'power_left', 'cover_3', seed, (o, d) => mon(d.DL1, 'aegistron', { mastery }), { t8, memory: { drive: 'home@0', used: {} } });
    assert.equal(ev(r, 'MET-06-F').length, 1); assert.equal(r.obstacles.length, 2);
    const w = [1.5, 2, 2.5, 3][mastery]; const [L, Rr] = r.obstacles; const [x, y] = PLAYS.cover_3.align.DL1;
    assert.deepEqual([L.y1 - L.y0, Rr.y1 - Rr.y0, L.x1 - L.x0].map((v) => +v.toFixed(6)), [w, w, 0.5]); assert.ok(Math.abs(y - L.y1 - 1) < 1e-9 && Math.abs(Rr.y0 - y - 1) < 1e-9, '1-yard gaps around his spot');
    // every body, every live frame (the dead-ball frame may show a tackled carrier's forward progress: the ball, which panels never stop)
    for (const f of r.frames.slice(0, -1)) for (const p of [...f.off, ...f.def]) for (const o of r.obstacles) assert.ok(!(p[1] > o.x0 && p[1] < o.x1 && p[2] > o.y0 && p[2] < o.y1), `${p[0]} inside a panel at ${f.t}`);
    assert.deepEqual(t8.ability.d_DL1, { count: 0, armed: false, usedDrive: 'home@0' }, 'spent; the activation play cannot charge');
    t8.ability.d_DL1.armed = true; const again = play('inside_zone', 'cover_3', seed, (o, d) => mon(d.DL1, 'aegistron'), { t8, memory: { drive: 'home@0', used: {} } });
    assert.equal(ev(again, 'MET-06-F').length, 0, 'once per defensive possession'); assert.equal(t8.ability.d_DL1.armed, true);
    play('inside_zone', 'cover_3', seed, (o, d) => mon(d.DL1, 'aegistron'), { t8, memory: { drive: 'home@9', used: {} } }); assert.equal(t8.ability.d_DL1.armed, false, 'a new opposing possession resets the use');
  }
  const t8 = { status: {}, ability: { d_DL3: { count: 0, armed: true, usedDrive: null } } };
  const r = play('inside_zone', 'run_wall', 1, (o, d) => mon(d.DL3, 'aegistron'), { t8 });
  assert.equal(ev(r, 'MET-06-F')[0].kind, 'ability_blocked'); assert.ok(!r.obstacles); assert.equal(t8.ability.d_DL3.armed, true, 'bar and use kept');
  const B = { left: -26, right: 26, goal: 70, ownGoal: -30 };
  assert.equal(panelRefusal(gatePanels(1, -24, 3)[0], B, []), 'sideline'); assert.equal(panelRefusal(gatePanels(70, 0, 0)[0], B, []), 'end zone');
});
test('Fortress Gate charging: three participating defensive plays of at most 3 yards arm it (not necessarily consecutive); a full bar takes no more', () => {
  const t8 = { status: {}, ability: { d_DL1: { count: 0, armed: false, usedDrive: null } } }; let short = 0, long = 0;
  for (let seed = 1; seed <= 30 && !t8.ability.d_DL1.armed; seed++) {
    const before = t8.ability.d_DL1.count; const r = play(RUNS[seed % RUNS.length], 'run_wall', seed, (o, d) => mon(d.DL1, 'aegistron'), { t8 });
    const n = t8.ability.d_DL1.count - before; assert.ok(n === 0 || n === 1, 'at most one a play');
    if (r.yards <= 2) { assert.equal(n, 1, `${r.yards} yards`); short++; } if (r.yards >= 5) { assert.equal(n, 0, `${r.yards} yards`); long++; }
  }
  assert.equal(t8.ability.d_DL1.armed, true); assert.equal(t8.ability.d_DL1.count, 3);
});

test('no stacking: every family of this batch is registered and its legacy effect never also runs', () => {
  for (const fam of ['sunwhistle', 'lumen', 'prism', 'halofang', 'aurelion', 'ironcub', 'steelpaw', 'gearwing', 'ironjaw', 'metalhorn', 'aegistron']) assert.ok(contractOf(fam), fam);
  const r = play('curl_flat', 'cover_3', 5, (o, d) => { mon(o.WR1, 'aurelion'); mon(d.LB1, 'halofang'); mon(o.LG, 'metalhorn'); }, { t8: { status: {} }, forcedTarget: 'WR1' });
  assert.ok(!r.events.some((e) => e.kind === 'ability' && e.key), 'no legacy ability effect fired');
});
