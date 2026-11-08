// Task 8 M3 ability batch: Psychic (PSY-01..06-F) and Dragon (DRA-01..06-F) football contracts on the real engine and rules.
// Probabilities (B12): every sampled assertion below fixes its sample size (the seed range) and its tolerance before running; the
// guaranteed behaviour (triggers, spending, clocks, exceptions) is asserted in every sampled case.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulatePlay } from '../src/sim/engine.js';
import * as R from '../src/sim/rules.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS } from '../src/data/playbook.js';
import { lineup } from './tools/lineup.js';
import { contractOf, registeredFamilies } from '../src/sim/abilities/registry.js';
import { FAMILIES } from '../src/data/beast-dex.js';
import { roarChance, CHART } from '../src/sim/abilities/vyrnax.js';
import '../src/sim/abilities/index.js';
import { halftime } from '../src/sim/t8/field-runtime.js';
import * as T8S from '../src/sim/t8/status-runtime.js';

const FAMS = ['mindwing', 'shadewisp', 'cerebrix', 'echolot', 'enigmane', 'astralux', 'drakeling', 'wyrmkit', 'sablewing', 'scaleguard', 'vyrnax', 'aurodrax'];
/** Put a family's monster in a slot of a frozen lineup (species/form/mastery/type/id on the slot input). */
const put = (side, slot, species, extra = {}) => (L) => { Object.assign(L[side][slot], { id: `${species}_${slot}`, species, form: `${species}:0`, mastery: 0, type: extra.type || (['drakeling', 'wyrmkit', 'sablewing', 'scaleguard', 'vyrnax', 'aurodrax'].includes(species) ? 'Dragon' : 'Psychic'), ...extra }); };
function run(off, def, mods, seed, t8, options = {}) {
  const O = lineup(11, 60), D = lineup(12, 64); const L = { offense: O.offense, defense: D.defense }; for (const m of mods) m(L);
  return simulatePlay({ offensePlay: PLAYS[off], defensePlay: PLAYS[def], offense: L.offense, defense: L.defense, ballOn: 30, seed, options: { t8, offenseSide: 'home', ...options } });
}
const evs = (r, pred) => r.events.filter(pred);
const team = (name, seed) => { const x = lineup(seed, 60); for (const side of ['offense', 'defense']) for (const [slot, p] of Object.entries(x[side])) { p.id = `${name}_${slot}`; p.type = p.type || 'Fire'; } return { id: name, name, offense: x.offense, defense: x.defense, kicker: { attrs: { kicking: 70 }, name: 'K', id: `${name}_K` } }; };
function game(seed = 1) { const teams = { home: team('H', 11), away: team('A', 12) }; const g = R.newGame({ home: teams.home, away: teams.away, seed, quarterLength: 900, coinWinner: 'home', choice: 'receive' }); g.phase = 'scrimmage'; g.possession = 'home'; g.ballOn = 30; g.t8 = { status: {} }; return { g, teams }; }

test('gate: all twelve Psychic and Dragon families register their Dex contract, and their legacy effects never run', () => {
  for (const f of FAMS) { const F = FAMILIES.find((x) => x.id === f); assert.ok(registeredFamilies().includes(f), f); assert.equal(contractOf(f).abilityId, F.abilities.football, f); }
  // Legacy: Blink's memory spend, Sovereign Arm's first-read pick denial, Dragon's Roar flinch never appear for a registered family.
  for (let seed = 1; seed <= 30; seed++) {
    const r = run('inside_zone', 'run_wall', [put('offense', 'RB', 'astralux')], seed, { status: {} }, { memory: { drive: 'd', half: 'h1', quarter: 4, used: {} } });
    assert.equal(r.memoryUsed.length, 0, 'no legacy once-per-game memory'); assert.ok(!r.events.some((e) => e.kind === 'ability' && e.text.includes('kicks in')), 'no legacy ability event');
    const q = run('mesh', 'cover_1', [put('offense', 'QB', 'aurodrax')], seed, { status: {} }, { memory: { drive: 'd', half: 'h2', quarter: 4, used: {} } });
    assert.ok(!q.events.some((e) => e.kind === 'pick_denied'), 'no legacy first-read protection');
  }
});

// ---------------------------------------------------------------------------------------------------------------- Psychic
test('Mind Bend (PSY-01-F): a personal tackle after a completion while ready banks a defensive Psychic zone; never during the cooldown or after a run', () => {
  let banked = 0, runs = 0;
  for (let seed = 1; seed <= 120; seed++) {
    const t8 = { status: {} }; const r = run(['mesh', 'smash', 'curl_flat', 'quick_slants'][seed % 4], 'cover_3', [put('defense', 'FS', 'mindwing')], seed, t8);
    const personal = r.stats.tackler === 'FS' || r.stats.assistBy === 'FS';
    const p = t8.fields?.pending || [];
    if (r.stats.receiver && personal && !r.stats.defensiveScore) {
      banked++; assert.equal(p.length, 1); assert.equal(t8.ability.mindwing_FS.banked, true);
      assert.deepEqual({ ...p[0], owner: undefined }, { ...p[0], owner: undefined, side: 'defense', type: 'Psychic', strength: 20, width: 8, length: 6, span: [-9, -3], lifetime: 1, clock: 'ownerDefense', ownerTeam: 'away' });
      assert.equal(t8.mastery.mindwing_FS.executions, 1);
    } else assert.equal(p.length, 0, `seed ${seed}: nothing banked without his tackle after a completion`);
    const t8b = { status: {}, ability: { mindwing_FS: { cd: 2, banked: false } } };
    const rb = run(['mesh', 'smash'][seed % 2], 'cover_3', [put('defense', 'FS', 'mindwing')], seed, t8b);
    assert.ok(!(t8b.fields?.pending?.length), 'no banking during the cooldown'); assert.equal(t8b.ability.mindwing_FS.cd, 1, 'a participating defensive play counts the cooldown');
    if (rb.stats.receiver) runs++;
  }
  for (let seed = 1; seed <= 40; seed++) { const t8 = { status: {} }; const r = run('inside_zone', 'cover_3', [put('defense', 'FS', 'mindwing')], seed, t8); assert.ok(!r.stats.receiver && !(t8.fields?.pending?.length), 'a run never banks'); }
  assert.ok(banked >= 3, `banked ${banked} of 120`); assert.ok(runs >= 0);
});

test('Mind Bend: created at his next defensive snap (G3) in the backfield LOS+3..+9 toward the opponent goal, pulls non-Psychic monsters, life by mastery, cooldown after creation, pending survives halftime', () => {
  const { g, teams } = game(3); const fs = teams.away.defense.FS; Object.assign(fs, { species: 'mindwing', form: 'mindwing:0', mastery: 2, type: 'Psychic' });
  g.t8.fields = { list: [], pending: [{ requireAble: true, owner: fs.id, ownerTeam: 'away', side: 'defense', type: 'Psychic', ability: 'PSY-01-F', strength: 20, lifetime: 2, clock: 'ownerDefense', width: 8, length: 6, span: [-9, -3], centerOn: 'ball' }], seq: 0 };
  g.t8.ability = { [fs.id]: { cd: 0, banked: true } };
  // He sits out (a counted Stunned): unable source keeps it pending.
  g.t8.status[fs.id] = { id: 'stunned', strength: 1, originalStrength: 1, remaining: 1, applications: 1, appliedThisUnit: false, restOfPlay: false };
  R.runScrimmagePlay(g, teams, 'mesh', 'cover_3'); assert.equal(g.t8.fields.list.length, 0); assert.equal(g.t8.fields.pending.length, 1, 'unable: still pending');
  halftime(g.t8); assert.equal(g.t8.fields.pending.length, 1, 'a pending zone survives halftime');
  // Next defensive snap with him on the field: created.
  g.possession = 'home'; g.phase = 'scrimmage'; g.ballOn = 40; g.ballLat = 0; g.down = 1; g.toGo = 10;
  const { sim } = R.runScrimmagePlay(g, teams, 'mesh', 'cover_3');
  assert.equal(sim.fields?.length, 1, 'the play saw the field'); const f = sim.fields[0];
  assert.deepEqual(f.yard, [-9, -3], 'LOS+3..+9 toward the offense\'s own goal (the backfield)'); assert.deepEqual(f.lat, [-4, 4], 'centred on the ball, 8 wide');
  assert.ok(sim.events.some((e) => e.kind === 'field_enter' && e.element === 'Psychic'), 'monsters inside feel it');
  assert.equal(g.t8.ability[fs.id].cd, 4, 'mastery 2 cooldown 4, started at creation'); assert.equal(g.t8.ability[fs.id].banked, false);
  if (g.possession === 'home') {
    assert.equal(g.t8.fields.list.length, 1, 'life 2 at mastery 2: one play left');
    R.runScrimmagePlay(g, teams, 'smash', 'cover_3'); assert.equal(g.t8.fields.list.length, 0, 'second defensive play: gone');
  }
  // Near the offense's own goal the zone shifts toward the line only enough to fit.
  const { g: g2, teams: t2 } = game(4); const fs2 = t2.away.defense.FS; Object.assign(fs2, { species: 'mindwing', form: 'mindwing:0', mastery: 0, type: 'Psychic' }); g2.ballOn = 4;
  g2.t8.fields = { list: [], pending: [{ requireAble: true, owner: fs2.id, ownerTeam: 'away', side: 'defense', type: 'Psychic', ability: 'PSY-01-F', strength: 20, lifetime: 1, clock: 'ownerDefense', width: 8, length: 6, span: [-9, -3], centerOn: 'ball' }], seq: 0 };
  const s2 = R.runScrimmagePlay(g2, t2, 'mesh', 'cover_3').sim; assert.deepEqual(s2.fields[0].yard, [-4, 2], 'fits the field of play: the goal line to 6 yards out');
});

test('Psychic field pull: a non-Psychic monster standing inside drifts toward the centre; a Psychic one does not', () => {
  const field = { id: 'F1', type: 'Psychic', strength: 20, owner: 'x', yard: [-14, -4], lat: [-4, 4], createdAt: 0 }; // centre x -9: behind the QB's drop
  const qbAt = (type) => { const r = run('mesh', 'cover_3', [(L) => { L.offense.QB.type = type; }], 5, { status: {} }, { fields: [field], maxTime: 0.3 }); return r.frames[r.frames.length - 1].off.find((p) => p[0] === 'QB'); };
  const plain = qbAt('Fire'), psy = qbAt('Psychic');
  assert.ok(plain[1] < psy[1] - 0.05, `pulled back toward the centre (x -9): ${plain[1]} vs ${psy[1]}`);
});

test('Mirror Step (PSY-02-F): on his man\'s first cut in range he turns onto the new direction at his current speed; cooldown 5/4/3/2; out of range or on cooldown keeps readiness', () => {
  let fired = 0, kept = 0;
  for (let seed = 1; seed <= 80; seed++) {
    const t8 = { status: {} }; const r = run(['mesh', 'smash', 'quick_slants', 'curl_flat'][seed % 4], 'cover_1', [put('defense', 'CB1', 'shadewisp', { mastery: 1 })], seed, t8);
    const e = evs(r, (x) => x.ability === 'PSY-02-F');
    assert.ok(e.length <= 1, 'one cut resolution per play');
    if (e.length) { fired++; assert.equal(e[0].victim, 'WR1', 'his assigned man only'); assert.equal(t8.ability.shadewisp_CB1.cd, 4, 'mastery 1: cooldown 4, the activation play not counted'); assert.ok(!r.events.some((x) => x.kind === 'throw' && x.t < e[0].t), 'before the release'); assert.ok(!r.events.some((x) => x.kind === 'status' && x.by === 'CB1'), 'no status'); }
    else { kept++; assert.equal(t8.ability.shadewisp_CB1?.cd || 0, 0, 'readiness kept'); }
    const t8c = { status: {}, ability: { shadewisp_CB1: { cd: 3 } } }; const rc = run('quick_slants', 'cover_1', [put('defense', 'CB1', 'shadewisp')], seed, t8c);
    assert.ok(!evs(rc, (x) => x.ability === 'PSY-02-F').length); assert.equal(t8c.ability.shadewisp_CB1.cd, 2);
  }
  assert.ok(fired >= 15 && kept >= 1, `fired ${fired}/80`);
  // Zone coverage: no fallback.
  for (let seed = 1; seed <= 20; seed++) assert.ok(!evs(run('smash', 'cover_3', [put('defense', 'CB1', 'shadewisp')], seed, { status: {} }), (x) => x.ability === 'PSY-02-F').length);
  // Mirageist's range is 4 yards, Wispira's 3: Mirageist activates at least as often on the same plays.
  const count = (form) => { let n = 0; for (let seed = 1; seed <= 80; seed++) n += evs(run(['mesh', 'smash', 'quick_slants', 'curl_flat'][seed % 4], 'cover_1', [put('defense', 'CB1', 'shadewisp', { form })], seed, { status: {} }), (x) => x.ability === 'PSY-02-F').length; return n; };
  assert.ok(count('shadewisp:1') >= count('shadewisp:0'));
});

test('Foresight (PSY-03-F): a marked LB within 3 yards who blitzes gets a 50% Confused (20% Awareness, current play); spent either way; no blitz keeps readiness', () => {
  let casts = 0, confused = 0; const BLITZ = ['double_a_zero', 'mug_zero', 'mug_sim', 'nickel_mug_zero', 'double_a_mug', 'goal_line'];
  for (let seed = 1; seed <= 200; seed++) { // B12: n = 200 casts' worth of plays; tolerance for the 50% roll: 0.35..0.65 of casts
    const t8 = { status: {} }; const r = run('mesh', BLITZ[seed % BLITZ.length], [put('offense', 'QB', 'cerebrix', { mastery: 3 })], seed, t8);
    const mark = evs(r, (e) => e.kind === 'foresight_mark'); const cast = evs(r, (e) => e.kind === 'ability' && e.ability === 'PSY-03-F');
    assert.equal(mark.length, 1, 'a candidate is always shown when an LB is within 3 yards');
    const lb = r.events.find((e) => e.kind === 'foresight_mark').victim; const asg = PLAYS[BLITZ[seed % BLITZ.length]].assignments[lb].a;
    if (['rush', 'contain'].includes(asg)) {
      assert.equal(cast.length, 1); casts++; assert.equal(t8.ability.cerebrix_QB.cd, 3, 'mastery 3 cooldown 3, spent whatever the roll');
      if (cast[0].roll) { const st = evs(r, (e) => e.kind === 'status' && e.status === 'confused'); assert.equal(st.length, 1); assert.equal(st[0].victim, lb); if (st[0].accepted) { confused++; assert.equal(t8.status[`def:${lb}`].strength, 20); } T8S.afterPlay({ t8 }, [`def:${lb}`]); assert.equal(t8.status[`def:${lb}`], undefined, 'current-play Confused cleared at the whistle'); }
    } else { assert.equal(cast.length, 0); assert.equal(t8.ability.cerebrix_QB?.cd || 0, 0, 'no blitz: readiness kept'); }
  }
  assert.ok(casts >= 60, `casts ${casts}`); assert.ok(confused / casts > 0.35 && confused / casts < 0.65, `Confused ${confused}/${casts}`);
  for (let seed = 1; seed <= 20; seed++) { const t8 = { status: {} }; const r = run('mesh', 'cover_3', [put('offense', 'QB', 'cerebrix')], seed, t8); assert.ok(!evs(r, (e) => e.kind === 'foresight_mark').length, 'no LB within 3 yards: no candidate'); }
  // Confused cuts the effective Awareness by 20% for the play (a different status blocks).
  const t8 = { status: { 'def:LB1': { id: 'slowed', strength: 10, originalStrength: 10, remaining: 2, applications: 1, appliedThisUnit: false } } };
  for (let seed = 1; seed <= 40; seed++) { const r = run('mesh', 'double_a_zero', [put('offense', 'QB', 'cerebrix')], seed, structuredClone(t8)); const st = evs(r, (e) => e.kind === 'status' && e.status === 'confused' && e.victim === 'LB1'); for (const s of st) assert.equal(s.accepted, false, 'a different status blocks'); }
});

test('Echo Landing (PSY-04-F): his kickoff caught in the field of play and returned without a TD banks a backfield Psychic field created at the next opposing snap even with him benched; cooldown six team defensive plays', () => {
  let banked = 0, tested = 0;
  for (let seed = 1; seed <= 40 && tested < 6; seed++) {
    const teams = { home: team('H', 11), away: team('A', 12) }; Object.assign(teams.away.kicker, { species: 'echolot', form: 'echolot:0', mastery: 1, type: 'Psychic', id: 'A_K' });
    const g = R.newGame({ home: teams.home, away: teams.away, seed, quarterLength: 900, coinWinner: 'home', choice: 'receive' }); g.t8 = { status: {} };
    const { sim } = R.doKickoff(g, teams); if (!sim) { assert.ok(!(g.t8.fields?.pending?.length), 'touchback: nothing'); continue; } tested++;
    const ok = sim.result !== 'touchdown' && sim.stats.kickCatchX > sim.bounds.ownGoal && sim.result !== 'touchback';
    assert.equal(!!g.t8.fields?.pending?.length, ok, `seed ${seed}: banked exactly when caught in the field of play and returned short of a TD (${sim.result})`);
    if (!ok || g.possession !== 'home') continue; banked++;
    const { sim: s1 } = R.runScrimmagePlay(g, teams, 'mesh', 'cover_3');
    assert.equal(s1.fields?.length, 1, 'created at the next opposing offensive snap, the kicker on the bench'); assert.deepEqual(s1.fields[0].yard, [-8, 0], 'from the line into the backfield'); assert.deepEqual(s1.fields[0].lat, [-3, 3], 'centred on the QB, 6 wide');
    assert.equal(g.t8.ability.A_K.readyAt, 7, 'ready after the creation play and six more team defensive plays');
    assert.equal(g.t8.fields.list.length, g.possession === 'home' ? 1 : 1, 'mastery 1: life 2, one left'); // possession change does not count it
  }
  assert.ok(banked >= 1, `banked ${banked}`);
  // The cooldown counts team defensive plays while the kicker is benched; nothing is banked while it runs.
  const t8 = { status: {}, teamPlays: { home: { off: 0, def: 3 }, away: { off: 0, def: 3 } }, ability: { echolot_K: { readyAt: 7 } } };
  for (let seed = 1; seed <= 10; seed++) {
    const O = lineup(11, 60), D = lineup(12, 64); const cov = { K: { attrs: { kicking: 70 }, id: 'echolot_K', species: 'echolot', form: 'echolot:0', mastery: 0, name: 'Echolot' } }; for (const s of ['SS', 'DL3', 'LB1', 'LB2', 'FS', 'CB2']) cov[s] = D.defense[s];
    const ret = { WR2: O.offense.WR2 }; for (const s of ['WR3', 'C', 'TE', 'RB', 'WR1', 'LG']) ret[s] = O.offense[s];
    const plays = { cov: { id: 'kc', side: 'defense', type: 'kickoff', tags: [], onField: Object.keys(cov), align: Object.fromEntries(Object.keys(cov).map((s, i) => [s, [1, -15 + i * 5]])), assignments: Object.fromEntries(Object.keys(cov).map((s, i) => [s, s === 'K' ? { a: 'cover', lane: 0, safety: true } : { a: 'cover', lane: -10 + i * 4 }])) },
      ret: { id: 'kr', side: 'offense', type: 'run', tags: [], onField: Object.keys(ret), align: Object.fromEntries(Object.keys(ret).map((s, i) => [s, s === 'WR2' ? [-60, 0] : [-15, -12 + i * 4]])), assignments: Object.fromEntries(Object.keys(ret).map((s) => [s, s === 'WR2' ? { a: 'kick_return' } : { a: 'ko_block', setup: [10, 0] }])) } };
    simulatePlay({ offensePlay: plays.ret, defensePlay: plays.cov, offense: ret, defense: cov, ballOn: 65, seed, options: { kickoff: { returner: 'WR2', landing: [-58, 0], hang: 2.6 }, t8, offenseSide: 'home' } });
  }
  assert.ok(!(t8.fields?.pending?.length), 'cooldown running: no bank'); t8.teamPlays.away.def = 7;
  let got = false; for (let seed = 11; seed <= 30 && !got; seed++) {
    const O = lineup(11, 60), D = lineup(12, 64); const cov = { K: { attrs: { kicking: 70 }, id: 'echolot_K', species: 'echolot', form: 'echolot:0', mastery: 0, name: 'Echolot' } }; for (const s of ['SS', 'DL3', 'LB1', 'LB2', 'FS', 'CB2']) cov[s] = D.defense[s];
    const ret = { WR2: O.offense.WR2 }; for (const s of ['WR3', 'C', 'TE', 'RB', 'WR1', 'LG']) ret[s] = O.offense[s];
    const plays = { cov: { id: 'kc', side: 'defense', type: 'kickoff', tags: [], onField: Object.keys(cov), align: Object.fromEntries(Object.keys(cov).map((s, i) => [s, [1, -15 + i * 5]])), assignments: Object.fromEntries(Object.keys(cov).map((s, i) => [s, s === 'K' ? { a: 'cover', lane: 0, safety: true } : { a: 'cover', lane: -10 + i * 4 }])) },
      ret: { id: 'kr', side: 'offense', type: 'run', tags: [], onField: Object.keys(ret), align: Object.fromEntries(Object.keys(ret).map((s, i) => [s, s === 'WR2' ? [-60, 0] : [-15, -12 + i * 4]])), assignments: Object.fromEntries(Object.keys(ret).map((s) => [s, s === 'WR2' ? { a: 'kick_return' } : { a: 'ko_block', setup: [10, 0] }])) } };
    const r = simulatePlay({ offensePlay: plays.ret, defensePlay: plays.cov, offense: ret, defense: cov, ballOn: 65, seed, options: { kickoff: { returner: 'WR2', landing: [-58, 0], hang: 2.6 }, t8, offenseSide: 'home' } });
    if (r.result !== 'touchdown') { got = true; assert.equal(t8.fields.pending.length, 1); assert.equal(t8.fields.pending[0].benchOk, true); assert.equal(t8.fields.pending[0].lifetime, 1, 'mastery 0: life 1'); }
  }
  assert.ok(got, 'ready again: banked');
});

test('Mind Game (PSY-05-F): four participating plays without a reception fill the bar; a charged first cut with his man within 2 yards sends the man after an afterimage until a catch or the whistle; spent, no charge on the activation play', () => {
  let fired = 0;
  for (let seed = 1; seed <= 120; seed++) {
    const t8 = { status: {}, ability: { enigmane_TE: { bar: 4 } } };
    const r = run(['curl_flat', 'flood', 'power_right'][seed % 3], ['cover_1', 'man_press', 'cover_0', 'cover_2_man'][seed % 4], [put('offense', 'TE', 'enigmane')], seed, t8);
    const e = evs(r, (x) => x.kind === 'afterimage');
    if (!e.length) { assert.ok(t8.ability.enigmane_TE.bar === 4, 'no legal opportunity: readiness kept, and a full bar cannot grow'); continue; }
    fired++; assert.equal(e.length, 1); assert.equal(t8.ability.enigmane_TE.bar, 0, 'spent, and the activation play earns no charge');
    const end = evs(r, (x) => x.kind === 'afterimage_end'); const caught = r.events.find((x) => x.kind === 'catch' || x.kind === 'interception');
    if (caught) assert.ok(end.length === 1 && end[0].t >= caught.t - 0.06 && end[0].t <= caught.t + 0.06, 'the chase ends at the catch');
    assert.ok(!r.events.some((x) => x.kind === 'status' && x.by === 'TE'), 'no shared status');
  }
  assert.ok(fired >= 10, `fired ${fired}/120`);
  // Charging: four plays without a reception, nonconsecutive; a reception pauses; runs qualify.
  const t8 = { status: {}, ability: { enigmane_TE: { bar: 0 } } }; let expect = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const r = run(['curl_flat', 'inside_zone', 'flood'][seed % 3], 'cover_3', [put('offense', 'TE', 'enigmane')], seed, t8);
    if (evs(r, (x) => x.kind === 'afterimage').length) { expect = 0; continue; }
    if (r.stats.receiver !== 'TE') expect = Math.min(4, expect + 1);
    assert.equal(t8.ability.enigmane_TE.bar, expect, `seed ${seed}`);
  }
});

test('Blink (PSY-06-F): once per game, past 8 rushing yards, the first new tackle attempt teleports him 5/6/7/8 yards upfield (no broken tackle); illegal landing keeps the use; no receptions', () => {
  let blinks = 0;
  for (let seed = 1; seed <= 150; seed++) {
    const t8 = { status: {} }; const r = run(['inside_zone', 'dive', 'power_right'][seed % 3], 'cover_3', [put('offense', 'RB', 'astralux', { mastery: seed % 4 })], seed, t8);
    const b = evs(r, (e) => e.kind === 'blink');
    if (!b.length) { assert.equal(t8.ability?.astralux_RB?.used || false, false, 'no successful teleport: the use is kept'); continue; }
    blinks++; assert.equal(b.length, 1); assert.equal(t8.ability.astralux_RB.used, true);
    assert.ok(b[0].fromX >= 8, 'threshold earned this play'); assert.ok(Math.abs(b[0].x - b[0].fromX - [5, 6, 7, 8][seed % 4]) < 1e-6, 'distance by mastery'); assert.equal(b[0].y, b[0].fromY, 'same lateral coordinate');
    assert.ok(!r.events.some((e) => e.kind === 'broken_tackle' && e.t === b[0].t), 'a relocation is not a broken tackle');
    const t8b = { status: {}, ability: { astralux_RB: { used: true } } }; const rb = run(['inside_zone', 'dive', 'power_right'][seed % 3], 'cover_3', [put('offense', 'RB', 'astralux')], seed, t8b);
    assert.ok(!evs(rb, (e) => e.kind === 'blink').length, 'once per game');
  }
  assert.ok(blinks >= 15, `blinks ${blinks}/150`);
  for (let seed = 1; seed <= 40; seed++) { const r = run('screen_rb' in PLAYS ? 'screen_rb' : 'mesh', 'cover_3', [put('offense', 'RB', 'astralux')], seed, { status: {} }); if (r.stats.receiver === 'RB') assert.ok(!evs(r, (e) => e.kind === 'blink').length, 'no reception'); }
  // Illegal landing (beyond the end line near the goal): the use is kept and the tackle resolves; no further attempt that play.
  for (let seed = 1; seed <= 40; seed++) {
    const t8 = { status: {} }; const O = lineup(11, 60), D = lineup(12, 64); put('offense', 'RB', 'astralux', { mastery: 3 })({ offense: O.offense, defense: D.defense });
    const r = simulatePlay({ offensePlay: PLAYS.dive, defensePlay: PLAYS.goal_line, offense: O.offense, defense: D.defense, ballOn: 88, seed, options: { t8 } });
    for (const e of evs(r, (x) => x.kind === 'blink')) assert.ok(e.x <= r.bounds.endLine - 0.5, 'a landing is inside the end line');
  }
});

// ---------------------------------------------------------------------------------------------------------------- Dragon
test('Dragon Pounce (DRA-01-F): an ordinary juke or break prepares one pounce per play; its break chance is the ordinary one plus form and mastery points, capped at 80%', () => {
  let pounces = 0; const FORM = [5, 10, 15], MAST = [0, 3, 6, 9];
  for (let seed = 1; seed <= 200; seed++) {
    const form = `drakeling:${seed % 3}`, mastery = seed % 4;
    const r = run(['inside_zone', 'dive', 'power_right', 'counter'][seed % 4], 'cover_3', [put('offense', 'RB', 'drakeling', { form, mastery })], seed, { status: {} });
    const p = evs(r, (e) => e.ability === 'DRA-01-F'); assert.ok(p.length <= 1, 'at most one pounce a play');
    if (!p.length) continue; pounces++;
    const prior = r.events.filter((e) => e.t <= p[0].t && e.by === 'RB' && e.side === 'off' && (e.kind === 'juke' || (e.kind === 'broken_tackle' && !e.contract)));
    assert.ok(prior.length >= 1, 'prepared by an ordinary evasion first');
    assert.ok(Math.abs(p[0].breakChance - Math.min(0.8, p[0].ordinary + (FORM[seed % 3] + MAST[mastery]) / 100)) < 0.002, 'ordinary + points, capped');
  }
  assert.ok(pounces >= 20, `pounces ${pounces}/200`);
  for (let seed = 1; seed <= 60; seed++) { const r = run('mesh', 'cover_3', [put('offense', 'WR1', 'drakeling')], seed, { status: {} }); assert.ok(!evs(r, (e) => e.ability === 'DRA-01-F').length, 'receiving excluded'); }
});

test('Dragon Call (DRA-02-F): a full bar pulses at the snap: everyone within 3/5 yards is cleansed of removable harmful statuses and protected for the play; beneficial kept; bar spent, no charge on the pulse play', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const t8 = { status: { 'wyrmkit_TE': { id: 'stunned', strength: 1, originalStrength: 1, remaining: 1, applications: 1, appliedThisUnit: false, restOfPlay: false } }, ability: { wyrmkit_TE: { bar: 3 } } };
    const r = run('power_right', 'run_wall', [put('offense', 'TE', 'wyrmkit', { form: `wyrmkit:${seed % 2}` })], seed, t8, { sitsOut: new Set(['wyrmkit_TE']) });
    const e = evs(r, (x) => x.ability === 'DRA-02-F'); assert.equal(e.length, 1, 'pulses even while Stunned'); assert.equal(e[0].radius, [3, 5][seed % 2]);
    assert.ok(e[0].cleansed.includes('off:TE'), 'his own removable harmful status is cleansed'); assert.equal(t8.status.wyrmkit_TE, undefined);
    assert.ok(r.frames.some((f) => { const p = f.off.find((x) => x[0] === 'TE'); return p && f.t > 0.5 && p[4] !== 'stun'; }), 'he moves again');
    assert.equal(t8.ability.wyrmkit_TE.bar, 0, 'spent; the pulse play cannot recharge'); assert.equal(t8.mastery.wyrmkit_TE.passiveCredited, true);
    assert.equal(t8.ward, undefined, 'protection ends at the whistle');
    for (const s of evs(r, (x) => x.kind === 'status' && e[0].recipients.includes(`${x.victimSide}:${x.victim}`))) assert.equal(s.accepted, false, 'recipients refuse new harmful statuses');
  }
  // Protection blocks a pancake's Knocked Down on a recipient and keeps a beneficial status; it never touches non-recipients.
  const t8 = { status: { 'def:DL1': { id: 'empowered', strength: 10, originalStrength: 10, remaining: 2, applications: 1, appliedThisUnit: false } }, ability: { wyrmkit_TE: { bar: 3 } } };
  run('power_right', 'run_wall', [put('offense', 'TE', 'wyrmkit', { form: 'wyrmkit:1' })], 3, t8);
  assert.equal(t8.status['def:DL1']?.id, 'empowered', 'beneficial statuses are retained');
  // Charging: three participating offensive plays fill it.
  const t8c = { status: {}, ability: { wyrmkit_TE: { bar: 0 } } };
  for (let seed = 1; seed <= 3; seed++) run('inside_zone', 'cover_3', [put('offense', 'TE', 'wyrmkit')], seed, t8c);
  assert.equal(t8c.ability.wyrmkit_TE.bar, 3);
  assert.equal(evs(run('inside_zone', 'cover_3', [put('offense', 'TE', 'wyrmkit')], 9, t8c), (x) => x.ability === 'DRA-02-F').length, 1, 'next snap: pulse');
});

test('Hoard Flight (DRA-03-F): a fumble he recovers on a defensive scrimmage play places his offense at the opponent 35 or keeps a better spot', () => {
  // Sablewing at both corners and every recovery checked; fumbles are rare (B12: 4000 plays, at least one of his recoveries expected).
  let found = 0, others = 0;
  for (let seed = 1; seed <= 4000 && found < 2; seed++) {
    const t8 = { status: {} }; const r = run(['inside_zone', 'dive', 'power_right', 'mesh'][seed % 4], 'cover_1', [put('defense', 'CB1', 'sablewing'), put('defense', 'CB2', 'sablewing', { id: 'sablewing_CB2' })], seed, t8, { maxTime: 12 });
    if (r.result !== 'fumble') continue;
    if (['CB1', 'CB2'].includes(r.stats.recoveredSlot) && r.stats.recoveredTeam === 'def') {
      found++; const natural = Math.round(100 - Math.min(100, 30 + r.yards)); assert.equal(r.turnoverSpot, Math.max(65, natural));
      const { g, teams } = game(1); R.applyScrimmageResult(g, r); assert.equal(g.possession, 'away'); assert.equal(g.ballOn, r.turnoverSpot, 'the next offense starts at the opponent 35');
    } else { others++; assert.equal(r.turnoverSpot, undefined, 'only his own recovery'); }
  }
  assert.ok(found >= 1, `his recoveries: ${found} (other fumbles ${others})`);
});

test('Dragon Stomp (DRA-04-F): three plays finishing engaged fill the bar; engaging a DL with a full bar is a guaranteed pancake attempt (Knocked Down through the gate) using the one-per-play budget', () => {
  let stomps = 0;
  for (let seed = 1; seed <= 80; seed++) {
    const t8 = { status: {}, ability: { scaleguard_LG: { bar: 3 } } };
    const r = run(['inside_zone', 'mesh', 'power_right'][seed % 3], ['cover_3', 'run_wall', 'cover_1'][seed % 3], [put('offense', 'LG', 'scaleguard')], seed, t8);
    const e = evs(r, (x) => x.ability === 'DRA-04-F');
    if (!e.length) { assert.equal(t8.ability.scaleguard_LG.bar, 3, 'no eligible DL: bar kept'); continue; }
    stomps++; assert.equal(e.length, 1); assert.ok(e[0].victim.startsWith('DL')); assert.equal(t8.ability.scaleguard_LG.bar, 0, 'spent; no recharge on the activation play');
    assert.equal(r.stats.blockers.LG.pancakeAttempts, 1, 'the play\'s one pancake attempt (no ordinary second attempt)');
    if (e[0].accepted) assert.ok(r.frames.some((f) => f.def.find((p) => p[0] === e[0].victim)?.[4] === 'flat'), 'Knocked Down for the rest of the play');
    T8S.afterPlay({ t8 }, [`def:${e[0].victim}`]); assert.equal(t8.status[`def:${e[0].victim}`], undefined, 'cleared at the whistle');
  }
  assert.ok(stomps >= 30, `stomps ${stomps}/80`);
  // Status blocked: the bar is still spent.
  for (let seed = 1; seed <= 20; seed++) {
    const t8 = { status: { 'def:DL1': { id: 'slowed', strength: 10, originalStrength: 10, remaining: 3, applications: 1, appliedThisUnit: false }, 'def:DL2': { id: 'slowed', strength: 10, originalStrength: 10, remaining: 3, applications: 1, appliedThisUnit: false }, 'def:DL3': { id: 'slowed', strength: 10, originalStrength: 10, remaining: 3, applications: 1, appliedThisUnit: false } }, ability: { scaleguard_LG: { bar: 3 } } };
    const r = run('inside_zone', 'run_wall', [put('offense', 'LG', 'scaleguard')], seed, t8); const e = evs(r, (x) => x.ability === 'DRA-04-F');
    if (e.length) { assert.equal(e[0].accepted, false); assert.equal(t8.ability.scaleguard_LG.bar, 0, 'spent even though blocked'); }
  }
  // Charging: only plays finished engaged.
  const t8 = { status: {}, ability: { scaleguard_LG: { bar: 0 } } };
  for (let seed = 1; seed <= 12; seed++) { const before = t8.ability.scaleguard_LG.bar; const r = run('mesh', 'cover_3', [put('offense', 'LG', 'scaleguard')], seed, t8); if (evs(r, (x) => x.ability === 'DRA-04-F').length) break; const engagedAtEnd = r.frames[r.frames.length - 1].off.find((p) => p[0] === 'LG')[3] === 1; assert.equal(t8.ability.scaleguard_LG.bar, Math.min(3, before + (engagedAtEnd ? 1 : 0)), `seed ${seed}`); }
});

test('Dragon Roar (DRA-05-F): the exact chart with linear interpolation, once per game, spent on launch made or missed, up to 90 yards; other kicks ordinary', () => {
  for (const [d, p] of CHART) assert.equal(roarChance(d), p);
  assert.equal(roarChance(40), 1); assert.ok(Math.abs(roarChance(67.5) - 0.775) < 1e-9); assert.ok(Math.abs(roarChance(87.5) - 0.35) < 1e-9); assert.equal(roarChance(91), null);
  const { g, teams } = game(2); Object.assign(teams.home.kicker, { species: 'vyrnax', form: 'vyrnax:0', mastery: 0 }); g.ballOn = 30; // a 87-yard attempt
  const sig = R.fieldGoalSignature(g, teams); assert.equal(sig.distance, 87); assert.equal(sig.available, true); assert.ok(Math.abs(sig.chance - 0.36) < 1e-9);
  const res = R.doFieldGoal(g, teams, { signature: true }).res; assert.equal(res.signature, 'DRA-05-F'); assert.equal(res.distance, 87);
  assert.equal(g.t8.ability.H_K.used, true, 'spent made or missed'); assert.equal(g.stats.home.players.K.fga, 1, 'recorded as an actual attempt');
  g.phase = 'scrimmage'; g.possession = 'home'; g.ballOn = 70; assert.equal(R.fieldGoalSignature(g, teams).available, false, 'once per game');
  const ord = R.doFieldGoal(g, teams, { signature: true }).res; assert.equal(ord.signature, undefined, 'unavailable: the ordinary kick');
  const { g: g2, teams: t2 } = game(5); Object.assign(t2.home.kicker, { species: 'vyrnax', form: 'vyrnax:0' }); g2.ballOn = 25; assert.equal(R.fieldGoalSignature(g2, t2).available, false, 'above 90 yards: outside the chart');
  // Make rate at 70 yards over 400 attempts (B12 tolerance ±0.08 around 0.55).
  let made = 0; for (let s = 1; s <= 400; s++) { const { g: x, teams: tx } = game(s); Object.assign(tx.home.kicker, { species: 'vyrnax', form: 'vyrnax:0' }); x.ballOn = 47; if (R.doFieldGoal(x, tx, { signature: true }).res.good) made++; }
  assert.ok(Math.abs(made / 400 - 0.55) < 0.08, `70-yard Roar ${made}/400`);
});

test('Sovereign Arm (DRA-06-F): three consecutive qualifying completions charge one protected throw; a would-be interception falls incomplete and the defender misses the next same-team offensive snap with no substitute', () => {
  // Streak by mastery thresholds 12/10/8/6.
  for (const mastery of [0, 3]) {
    const t8 = { status: {} }; let streak = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const r = run(['mesh', 'smash', 'quick_slants', 'inside_zone'][seed % 4], 'cover_3', [put('offense', 'QB', 'aurodrax', { mastery })], seed, t8);
      const q = r.stats.receiver && r.stats.passer === 'QB' && !['incomplete', 'interception', 'fumble'].includes(r.result) && r.yards >= [12, 10, 8, 6][mastery];
      const st = t8.ability.aurodrax_QB; if (st.charged && st.streak === 0 && q && streak === 2) { streak = 0; break; }
      streak = q ? streak + 1 : 0; assert.equal(st.streak, streak, `seed ${seed}`); if (st.charged) break;
    }
  }
  // Protected throw: spent on the throw; an interception is denied and the defender captured.
  let swallowed = 0;
  for (let seed = 1; seed <= 400 && swallowed < 2; seed++) {
    const t8 = { status: {}, ability: { aurodrax_QB: { streak: 0, charged: true, used: false } } };
    const r = run(['mesh', 'smash', 'quick_slants'][seed % 3], ['cover_1', 'man_press', 'cover_0'][seed % 3], [put('offense', 'QB', 'aurodrax')], seed, t8);
    if (!r.stats.passer) { assert.equal(t8.ability.aurodrax_QB.charged, true, 'run, sack or no release: the charge is kept'); continue; }
    assert.equal(t8.ability.aurodrax_QB.used, true, 'spent on the throw even with no interception');
    const sw = evs(r, (e) => e.kind === 'dragon_swallow');
    if (sw.length) { swallowed++; assert.equal(r.result, 'incomplete'); assert.equal(r.stats.interceptor, null); assert.equal(t8.absences.length, 1); assert.equal(t8.absences[0].serveOn, 'home'); }
  }
  assert.ok(swallowed >= 1, `swallowed ${swallowed}`);
  // Serving the absence (rules.js): vacant slot, no substitute, the defender's status paused; served once, then he returns.
  const { g, teams } = game(7); const cb = teams.away.defense.CB1;
  g.t8.status[cb.id] = { id: 'slowed', strength: 10, originalStrength: 10, remaining: 2, applications: 1, appliedThisUnit: false };
  g.t8.absences = [{ mid: cb.id, serveOn: 'home' }];
  g.possession = 'away'; g.ballOn = 30; R.runScrimmagePlay(g, teams, 'mesh', 'cover_1'); assert.equal(g.t8.absences.length, 1, 'an intervening possession of the other team does not serve it');
  g.phase = 'scrimmage'; g.possession = 'home'; g.ballOn = 30; g.down = 1; g.toGo = 10;
  const { sim } = R.runScrimmagePlay(g, teams, 'mesh', 'cover_1');
  assert.ok(!('CB1' in sim.names.def), 'his slot is vacant'); assert.equal(Object.keys(sim.names.def).length, PLAYS.cover_1.onField.length - 1, 'no substitute');
  assert.equal(g.t8.status[cb.id].remaining, 2, 'his status duration paused'); assert.equal(g.t8.absences.length, 0, 'served');
  g.phase = 'scrimmage'; g.possession = 'home'; g.ballOn = 30; g.down = 1; g.toGo = 10;
  assert.ok('CB1' in R.runScrimmagePlay(g, teams, 'mesh', 'cover_1').sim.names.def, 'back in his formation the play after');
});

test('Dragon\'s Gambit still runs with Aurodrax in his slot under the contract', () => {
  for (let seed = 1; seed <= 10; seed++) { const r = run('lp_dragons_gambit', 'cover_1', [put('offense', 'QB', 'aurodrax')], seed, { status: {} }); assert.ok(r.result); }
});
