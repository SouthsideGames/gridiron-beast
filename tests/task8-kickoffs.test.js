// Task 8 M2: live kickoffs (N7b P7), special-teams units (N7c B5) and kickoff classification (N7c B20).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/sim/rules.js';
import * as S from '../src/sim/t8/status-runtime.js';
import { playGame } from '../src/sim/game-runner.js';
import { generatedTeam } from '../src/franchise/roster.js';
import { kickFrames } from '../src/ui/kick-anim.js';

const home = generatedTeam(11, { id: 'h', name: 'Ember City Beasts', abbr: 'EMB' });
const away = generatedTeam(51, { id: 'a', name: 'Stonehaven Titans', abbr: 'STO' });
const teams = { home, away };
const kickoffState = (seed) => R.newGame({ home, away, seed, coinWinner: 'home', choice: 'receive' }); // away kicks, home receives
/** The first seed (from `from`) whose kickoff is returned live (not a touchback). */
function returnedKickoff(from = 1, pred = () => true) {
  for (let seed = from; seed < from + 400; seed++) { const s = kickoffState(seed); const out = R.doKickoff(s, teams); if (out.sim && pred(out)) return { seed, s, out }; }
  throw new Error('no returned kickoff found');
}
const touchbackKickoff = () => { for (let seed = 1; seed < 400; seed++) { const s = kickoffState(seed); const out = R.doKickoff(s, teams); if (!out.sim && out.res.touchback) return { seed, s, out }; } throw new Error('no touchback'); };

test('units come from the depth chart: the K and six coverage players, the returner and six blockers, package players first, nobody twice', () => {
  const u = R.kickoffUnits(away, home);
  assert.deepEqual(Object.keys(u.coverage), ['K', ...R.COVERAGE_ORDER.slice(0, R.KICKOFF_UNIT - 1)]);
  assert.equal(u.coverage.K, away.kicker);
  for (const s of Object.keys(u.coverage)) if (s !== 'K') assert.equal(u.coverage[s], away.defense[s]);
  assert.equal(u.ret[u.returnerSlot].id, home.returner.id, 'the club\'s returner');
  assert.equal(home.offense[u.returnerSlot]?.id ?? home.defense[u.returnerSlot]?.id, home.returner.id, 'credited at his own lineup slot');
  assert.equal(Object.keys(u.ret).length, R.KICKOFF_UNIT);
  const blockers = Object.keys(u.ret).filter((s) => s !== u.returnerSlot);
  assert.deepEqual(blockers, R.RETURN_BLOCK_ORDER.filter((s) => s !== u.returnerSlot).slice(0, 6));
  assert.deepEqual(blockers.slice(0, 2), ['WR3', 'C'], 'package (non-base) players first');
  const ids = [...Object.values(u.coverage), ...Object.values(u.ret)].map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'each monster once');
});

test('a kickoff that is not a touchback is a real return: caught live, then a tackle (or a touchdown) from the engine', () => {
  const { s, out } = returnedKickoff();
  const { sim, res } = out;
  assert.ok(['tackle', 'touchdown', 'out_of_bounds', 'fumble', 'touchback'].includes(sim.result), sim.result);
  assert.ok(sim.events.some((e) => e.kind === 'kick_catch'), 'the returner fields it');
  if (sim.result === 'tackle') { assert.ok(sim.stats.tackler, 'a real tackler'); assert.ok(sim.events.some((e) => e.kind === 'tackle' && e.by === sim.stats.tackler)); }
  const catchAt = (sim.ballOn + sim.kickoff.catchX);
  assert.equal(res.returnYards, Math.round(sim.endYard - catchAt), 'return yards are the engine\'s, from the catch to the end of the play');
  if (!res.touchdown && !res.touchback) assert.equal(s.ballOn, Math.round(sim.endYard), 'next snap at the spot the return ended');
  assert.equal(s.phase, 'scrimmage'); assert.equal(s.possession, 'home');
  // The flight: the ball in the air from the kick spot, nobody holding it; then the returner carries it.
  assert.equal(sim.frames[0].phase, 'kick'); assert.equal(sim.frames[0].ball[2], 1); assert.equal(sim.frames[0].holder, null);
  const carry = sim.frames.find((f) => f.holder);
  assert.equal(carry.holder, sim.kickoff.returner); assert.equal(carry.holderTeam, 'off'); assert.equal(carry.phase, 'carry');
  // Same frame format as a scrimmage play: [slot, x, y, engaged, status] per player, [x, y, inAir] for the ball, finite everywhere.
  for (const f of sim.frames) {
    for (const p of [...f.off, ...f.def]) { assert.equal(p.length, 5); assert.ok(Number.isFinite(p[1]) && Number.isFinite(p[2])); assert.ok(p[2] >= sim.bounds.left - 0.01 && p[2] <= sim.bounds.right + 0.01); }
    assert.equal(f.ball.length, 3); assert.ok(f.ball.every(Number.isFinite));
  }
  assert.equal(sim.frames[0].off.length, 7); assert.equal(sim.frames[0].def.length, 7);
});

test('the coverage tackles and the returner\'s yards are the events credited; long returns and touchdowns stay possible', () => {
  let tackles = 0, returns = 0, yards = []; const seen = new Set();
  for (let seed = 1; seed <= 80; seed++) {
    const s = kickoffState(seed); const { sim, res } = R.doKickoff(s, teams); if (!sim) continue; returns++;
    const P = s.stats.home.players, K = s.stats.away.players;
    assert.equal(P[sim.kickoff.returner].krAtt, 1); assert.equal(P[sim.kickoff.returner].krYds ?? 0, res.returnYards || 0);
    if (res.touchdown) assert.equal(P[sim.kickoff.returner].krTd, 1);
    if (sim.result === 'tackle' && sim.stats.tackler) { tackles++; assert.equal(K[sim.stats.tackler].stTackles, 1); seen.add(sim.stats.tackler); }
    yards.push(res.returnYards);
  }
  assert.ok(returns >= 20 && tackles >= returns * 0.8, `${tackles} tackles in ${returns} returns`);
  assert.ok(seen.size >= 3, `several coverage players make tackles (${[...seen]})`);
  assert.ok(Math.max(...yards) > Math.min(...yards) + 10, 'returns vary with the play');
});

test('participants are credited: a special-teams snap for every monster on both units, a kickoff for the kicker', () => {
  const { s, out } = returnedKickoff();
  const names = out.sim.names;
  for (const slot of Object.keys(names.off)) assert.equal(s.stats.home.players[slot].stSnaps, 1, `return ${slot}`);
  for (const slot of Object.keys(names.def)) assert.equal(s.stats.away.players[slot].stSnaps, 1, `coverage ${slot}`);
  assert.equal(Object.keys(names.off).length, 7); assert.equal(Object.keys(names.def).length, 7);
  assert.equal(s.stats.away.players.K.kickoffs, 1);
  // a touchback is still a kickoff both units played: snaps and the kick, no return
  const tb = touchbackKickoff();
  assert.equal(tb.s.stats.away.players.K.kickoffs, 1); assert.equal(tb.s.stats.away.players.K.koTouchbacks, 1);
  const u = R.kickoffUnits(away, home);
  for (const slot of Object.keys(u.coverage)) assert.equal(tb.s.stats.away.players[slot].stSnaps, 1);
  for (const slot of Object.keys(u.ret)) assert.equal(tb.s.stats.home.players[slot].stSnaps, 1);
  assert.equal(Object.values(tb.s.stats.home.players).some((p) => p.krAtt), false, 'no return on a touchback');
});

test('B20: a kickoff catch is not a reception and a kickoff is not a defensive (or offensive) snap', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const s = kickoffState(seed); const { sim } = R.doKickoff(s, teams);
    for (const side of ['home', 'away']) for (const [slot, p] of Object.entries(s.stats[side].players)) {
      for (const k of ['rec', 'recYds', 'targets', 'snapsDef', 'snapsOff', 'tackles', 'rush', 'rushYds']) assert.equal(p[k], undefined, `${side} ${slot} ${k}`);
    }
    if (!sim) continue;
    assert.equal(sim.stats.receiver, null, 'no receiver on a kickoff'); assert.ok(!sim.events.some((e) => e.kind === 'catch'), 'the catch is a kick catch');
    assert.equal(s.stats.home.passComp, 0); assert.equal(s.stats.home.rushYards, 0); assert.equal(s.stats.home.yards, 0); assert.equal(s.stats.home.plays, 0); assert.equal(s.playCount, 0, "a kickoff is not a scrimmage play");
  }
});

test('the shared status clocks count the kickoff for its participants only', () => {
  const s = kickoffState(returnedKickoff().seed);
  const cov = R.kickoffUnits(away, home).coverage; const onUnit = Object.values(cov).find((p) => p.id && p !== cov.K).id; const off = away.offense.QB.id;
  for (const id of [onUnit, off]) { S.applyStatus(s, id, { id: 'slowed', strength: 1, duration: 2 }); S.afterPlay(s, [id]); }
  R.doKickoff(s, teams);
  assert.equal(S.statusOf(s, onUnit).remaining, 1, 'a coverage player played the kickoff');
  assert.equal(S.statusOf(s, off).remaining, 2, 'the kicking club\'s quarterback was not on the field');
});

test('determinism: the same state and teams give the same kickoff, frames and game state', () => {
  const { seed } = returnedKickoff();
  const a = kickoffState(seed), b = kickoffState(seed);
  const ra = R.doKickoff(a, teams), rb = R.doKickoff(b, teams);
  assert.deepEqual(ra.sim, rb.sim); assert.deepEqual(ra.res, rb.res); assert.deepEqual(a, b);
  // The kickoff consumes the game's dice like any play: the next scrimmage play from the same state is identical too.
  const pa = R.runScrimmagePlay(a, teams, home.offensePlays[0], away.defensePlays[0]), pb = R.runScrimmagePlay(b, teams, home.offensePlays[0], away.defensePlays[0]);
  assert.deepEqual(pa.sim.frames, pb.sim.frames); assert.deepEqual(a, b);
});

test('onside kicks and free kicks stay on their formula paths', () => {
  let recovered = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const s = kickoffState(seed); const out = R.doKickoff(s, teams, { onside: true });
    assert.equal(out.res.onside, true); assert.equal(out.sim, null); assert.equal(s.phase, 'scrimmage');
    if (out.res.recovered) { recovered++; assert.equal(s.possession, 'away'); } else assert.equal(s.possession, 'home');
    assert.equal(s.stats.away.players.K.kickoffs, 1, 'the kick is credited');
  }
  assert.ok(recovered > 0 && recovered < 40);
  const fk = kickoffState(3); fk.phase = 'free_kick'; fk.kickingTeam = 'home'; fk.possession = 'home';
  const out = R.doKickoff(fk, teams);
  assert.match(out.text, /^Free kick/); assert.equal(out.sim, null); assert.equal(fk.possession, 'away'); assert.equal(fk.phase, 'scrimmage');
});

test('a full game with live kickoffs finishes; kickoffs are credited; every kick event still draws', () => {
  let live = 0, kicks = 0;
  const g = playGame({ home, away, seed: 21, quarterLength: 150, onStep: (ev) => {
    if (ev?.kind !== 'kickoff') return; kicks++; if (ev.sim) { live++; assert.ok(ev.sim.frames.length > 10); }
    const fr = kickFrames(ev); assert.ok(fr && fr.length > 5, 'the formula animation still draws every kickoff');
  } });
  assert.equal(g.finished, true); assert.ok(!g.guard, 'no runner guard');
  assert.ok(kicks >= 2 && live >= 1, `${live} live of ${kicks} kickoffs`);
  const koByK = ['home', 'away'].reduce((n, side) => n + (g.stats[side].players.K?.kickoffs || 0), 0);
  assert.equal(koByK, kicks, 'one kickoff credited per kick');
  for (const side of ['home', 'away']) assert.ok(Object.values(g.stats[side].players).some((p) => p.stSnaps > 0), `${side} special-teams snaps`);
});

test('B5: punts, field goals and extra points credit their units with a special-teams snap and the K with the kick, without fabricated events', async () => {
  const R = await import('../src/sim/rules.js');
  const L = (await import('./tools/lineup.js')).lineup;
  const mk = (name, seed) => { const x = L(seed, 60); for (const side of ['offense', 'defense']) for (const [slot, p] of Object.entries(x[side])) p.id = `${name}_${slot}`; return { id: name, name, offense: x.offense, defense: x.defense, kicker: { attrs: { kicking: 80 }, name: 'K', id: `${name}_K` } }; };
  const teams = { home: mk('H', 11), away: mk('A', 12) };
  const g = R.newGame({ home: teams.home, away: teams.away, seed: 3, quarterLength: 120 }); R.doKickoff(g, teams);
  const k = g.possession; g.ballOn = 70; R.doFieldGoal(g, teams);
  const P = g.stats[k].players; assert.equal(P.K.fga, 1); assert.equal(P.K.stSnaps, 1);
  assert.equal(Object.keys(P).filter((s) => P[s].stSnaps).length >= 7, true, 'the kicking unit of 7');
  const other = k === 'home' ? 'away' : 'home'; assert.ok(Object.values(g.stats[other].players).filter((p) => p.stSnaps).length >= 7, 'the block unit of 7');
  assert.ok(!Object.values(g.stats[k].players).some((p) => (p.snapsOff || 0) > 0 && p.stSnaps && p.rec), 'no fabricated receptions');
  const g2 = R.newGame({ home: teams.home, away: teams.away, seed: 4, quarterLength: 120 }); R.doKickoff(g2, teams); const kk = g2.possession; g2.ballOn = 30; R.doPunt(g2, teams);
  assert.equal(g2.stats[kk].players.K.punts, 1, 'the K is credited with the punt');
});
