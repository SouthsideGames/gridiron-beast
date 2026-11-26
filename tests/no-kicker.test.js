// Follow-up A-3 (owner 2026-11-26): a team without an available kicker plays on. No field goals, punts, extra points or kickoffs: fourth
// down is a scrimmage down, the try is a two-point conversion, and a kickoff (or a free kick after a safety) is replaced by the receiver
// taking over at its own 20. No position covers K; a missing kicker alone is never a forfeit; K stays an unfilled roster need.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/sim/rules.js';
import * as AI from '../src/sim/coach-ai.js';
import { playGame, step, aiController, newTendencies } from '../src/sim/game-runner.js';
import { generatedTeam, lineupProblems, forfeitProblems, buildDepthChart } from '../src/franchise/roster.js';
import { EMERGENCY_POSITION } from '../src/data/personnel.js';
import { newFranchise } from '../tools/franchise-soak.mjs';
import * as F from '../src/franchise/franchise.js';

const noKicker = (t) => ({ ...t, kicker: { attrs: {}, name: 'K', id: null } });
const teamsFor = (seed, { home = true, away = true } = {}) => { const h = generatedTeam(seed, { id: 'h', name: 'Home' }), a = generatedTeam(seed + 1, { id: 'a', name: 'Away' }); return { home: home ? h : noKicker(h), away: away ? a : noKicker(a) }; };
const ctl = { home: aiController('home'), away: aiController('away') }; const tend = () => ({ home: newTendencies(), away: newTendencies() });
const kStats = (s, side) => Object.entries(s.stats[side].players).filter(([k]) => /K$/.test(k)).map(([, p]) => p);

test('no position covers K; the kicker-covering-QB mapping is unchanged', () => {
  assert.equal(Object.values(EMERGENCY_POSITION).includes('K'), false);
  assert.equal(EMERGENCY_POSITION.K, 'QB');
});

test('kickoffs: the opening, second-half and post-score kickoffs and a free kick after a safety are replaced by the receiver at its own 20, with no clock, dice or kicking stats', () => {
  for (const phase of ['kickoff', 'free_kick']) for (const [kick, ret] of [['home', 'away'], ['away', 'home']]) {
    const teams = teamsFor(7, { [kick]: false }); const s = R.newGame({ home: teams.home, away: teams.away, seed: 3, coinWinner: ret, choice: 'receive' });
    s.phase = phase; s.kickingTeam = kick; const clock = s.clock, rng = JSON.stringify(s.rngState ?? null), q = s.quarter;
    const out = R.doKickoff(s, teams);
    assert.equal(out.res.noKicker, true); assert.equal(out.sim, null);
    assert.equal(s.phase, 'scrimmage'); assert.equal(s.possession, ret); assert.equal(s.ballOn, 20); assert.equal(s.down, 1); assert.equal(s.toGo, 10);
    assert.equal(s.clock, clock, 'no time runs off'); assert.equal(s.quarter, q); assert.equal(JSON.stringify(s.rngState ?? null), rng, 'no random number drawn');
    assert.deepEqual(kStats(s, kick), [], 'no kicking statistics invented'); assert.ok(!Object.values(s.stats[ret].players).some((p) => p.krAtt), 'no return statistics invented');
    assert.match(s.log[s.log.length - 1].text, /no available kicker/i);
  }
  // an onside call is replaced the same way
  const teams = teamsFor(8, { home: false }); const s = R.newGame({ home: teams.home, away: teams.away, seed: 4, coinWinner: 'away', choice: 'receive' });
  s.phase = 'kickoff'; s.kickingTeam = 'home'; R.doKickoff(s, teams, { onside: true }); assert.equal(s.possession, 'away'); assert.equal(s.ballOn, 20);
  // with a kicker, kickoffs are untouched
  const t2 = teamsFor(9); const s2 = R.newGame({ home: t2.home, away: t2.away, seed: 5, coinWinner: 'away', choice: 'receive' }); s2.phase = 'kickoff'; s2.kickingTeam = 'home';
  assert.notEqual(R.doKickoff(s2, t2).res.noKicker, true);
});

test('the kick functions refuse to run without a kicker; the AI goes for it and goes for two', () => {
  const teams = teamsFor(10, { home: false }); const s = R.newGame({ home: teams.home, away: teams.away, seed: 6, coinWinner: 'home', choice: 'receive' });
  Object.assign(s, { phase: 'scrimmage', possession: 'home', ballOn: 80, down: 4, toGo: 3 });
  assert.throws(() => R.doFieldGoal(s, teams), /no kicker/); assert.throws(() => R.doPunt(s, teams), /no kicker/);
  assert.equal(AI.fourthDownDecision(s, teams.home), 'go', 'field-goal range'); s.ballOn = 50; assert.equal(AI.fourthDownDecision(s, teams.home), 'go', 'outside field-goal range');
  s.ballOn = 15; s.toGo = 12; assert.equal(AI.fourthDownDecision(s, teams.home), 'go', 'own territory, long');
  Object.assign(s, { phase: 'try', tryTeam: 'home' }); assert.throws(() => R.attemptTryKick(s, teams), /no kicker/); assert.equal(AI.tryDecision(s, 'home', teams.home), 'two');
});

test('the game runner: fourth downs in field-goal range, outside it and in own territory are played as downs; a failed one is a turnover on downs; tries are two-point', () => {
  for (const ballOn of [82, 55, 18]) {
    const teams = teamsFor(20 + ballOn, { home: false }); const s = R.newGame({ home: teams.home, away: teams.away, seed: 11 + ballOn, coinWinner: 'home', choice: 'receive' });
    Object.assign(s, { phase: 'scrimmage', possession: 'home', ballOn, down: 4, toGo: 9, clock: 600, quarter: 2 }); R.firstDown && void 0;
    const ev = step(s, teams, ctl, tend());
    assert.ok(ev && ev.kind !== 'punt' && ev.kind !== 'field_goal', `ball on ${ballOn}: ${ev?.kind}`);
    if (s.possession === 'away' && s.phase === 'scrimmage' && !/touchdown/i.test(ev.text || '')) assert.ok(s.down === 1, 'a turnover on downs gives the defence a first down');
  }
  const teams = teamsFor(30, { home: false }); const s = R.newGame({ home: teams.home, away: teams.away, seed: 31, coinWinner: 'home', choice: 'receive' });
  Object.assign(s, { phase: 'try', tryTeam: 'home', possession: 'home', ballOn: 100 - 2, toGo: 2, clock: 600, quarter: 2 });
  const ev = step(s, teams, ctl, tend()); assert.equal(ev.kind, 'try'); assert.ok(ev.sim, 'a two-point play is run'); assert.notEqual(ev.kicking, 'home');
});

test('a whole game with one team kickerless: finishes without a forfeit; that team never kicks; its scores are touchdowns, two-point tries and safeties', () => {
  for (const seed of [41, 42, 43]) {
    const teams = teamsFor(seed, { away: false }); let awayKicks = 0;
    const s = playGame({ home: teams.home, away: teams.away, seed, quarterLength: 180, otPeriods: 1, onStep: (ev, st) => { if (ev && ['punt', 'field_goal'].includes(ev.kind) && ev.kicking === 'away') awayKicks++; if (ev?.kind === 'try' && ev.tryTeam === 'away') assert.ok(ev.sim, 'two-point'); } });
    assert.equal(s.finished, true); assert.ok(!s.forfeit, 'no forfeit'); assert.ok(!s.guard, 'no runner guard'); assert.equal(awayKicks, 0);
    assert.deepEqual(kStats(s, 'away').filter((p) => p.fga || p.xpa || p.punts || p.kickoffs), [], 'no kicking statistics for the kickerless team');
    assert.ok(s.log.some((l) => /no available kicker/i.test(l.text)), 'its kickoffs were replaced');
  }
});

test('the kicker covering QB: kicking stays available while he is healthy; hurt in the game it is lost; when he is back it is restored', () => {
  const teams = teamsFor(50); const s = R.newGame({ home: teams.home, away: teams.away, seed: 50, coinWinner: 'home', choice: 'receive' });
  const k = teams.home.kicker; assert.ok(R.kickerAvailable(s, teams.home));
  teams.home.offense.QB = { ...k }; assert.ok(R.kickerAvailable(s, teams.home), 'covering QB and healthy: still kicks');
  (s.rotation ||= { active: {}, manual: {}, injuries: {}, notices: [] }).injuries[k.id] = { severity: 'Minor', weeks: 1, inGame: true };
  assert.equal(R.kickerAvailable(s, teams.home), false, 'hurt in the game');
  Object.assign(s, { phase: 'scrimmage', possession: 'home', ballOn: 75, down: 4, toGo: 2 }); assert.throws(() => R.doFieldGoal(s, teams), /no kicker/);
  delete s.rotation.injuries[k.id]; assert.ok(R.kickerAvailable(s, teams.home), 'restored'); assert.doesNotThrow(() => R.doFieldGoal(s, teams));
});

test('franchise: no kicker on the roster is a roster need and a warning, not a forfeit', () => {
  const f = newFranchise(61); const k = f.roster.find((m) => m.position === 'K'); f.roster = f.roster.filter((m) => m.position !== 'K');
  const chart = buildDepthChart(f.roster, f.lineupManual, f.depth);
  assert.ok(k); assert.ok(lineupProblems(f.roster, chart).includes('K'), 'still an unfilled need'); assert.deepEqual(forfeitProblems(f.roster, chart).filter((x) => x === 'K'), []);
  const w = F.lineupWarnings(f).find((x) => x.slot === 'K'); assert.equal(w.kind, 'kicker'); assert.equal(w.severity, 'kicking unavailable');
  const team = F.playerTeam(f); assert.equal(team.forfeit, false, team.forfeitReason); assert.equal(team.kicker.id, null);
});
