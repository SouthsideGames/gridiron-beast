import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/sim/rules.js';
import * as ST from '../src/sim/special-teams.js';
import * as AI from '../src/sim/coach-ai.js';
import { playGame, step, aiController, newTendencies } from '../src/sim/game-runner.js';
import { generatedTeam } from '../src/franchise/roster.js';
import { createRng } from '../src/core/rng.js';

const home = generatedTeam(1, { id: 'h', name: 'Ember City Beasts', abbr: 'EMB' });
const away = generatedTeam(2, { id: 'a', name: 'Stonehaven Titans', abbr: 'STO' });
const teams = { home, away };
const fakeSim = (over) => ({ result: 'tackle', yards: 0, endYard: 0, elapsed: 4, events: [], stats: {}, names: {}, frames: [], seed: 1, ballOn: 0, touchdown: false, ...over });
function scrimmage(over = {}) {
  const s = R.newGame({ home, away, seed: 5, coinWinner: 'home', choice: 'receive' });
  s.phase = 'scrimmage'; s.possession = 'home'; s.ballOn = 25; s.down = 1; s.toGo = 10; s.clockRunning = false;
  return Object.assign(s, over);
}

test('downs, distance and first downs', () => {
  const s = scrimmage();
  R.applyScrimmageResult(s, fakeSim({ yards: 4, endYard: 29 }));
  assert.equal(s.down, 2); assert.equal(s.toGo, 6); assert.equal(s.ballOn, 29);
  R.applyScrimmageResult(s, fakeSim({ yards: 7, endYard: 36 }));
  assert.equal(s.down, 1); assert.equal(s.toGo, 10); assert.equal(s.ballOn, 36);
  assert.equal(s.stats.home.firstDowns, 1);
});

test('goal to go and touchdown with try then kickoff', () => {
  const s = scrimmage({ ballOn: 94, toGo: 6 });
  R.applyScrimmageResult(s, fakeSim({ yards: 2, endYard: 96 }));
  assert.equal(s.toGo, 4); assert.match(R.situationText(s), /Goal/);
  R.applyScrimmageResult(s, fakeSim({ result: 'touchdown', yards: 4, endYard: 100, touchdown: true, stats: { carrier: 'RB' } }));
  assert.equal(s.score.home, 6); assert.equal(s.phase, 'try'); assert.equal(s.tryTeam, 'home');
  const res = R.attemptTryKick(s, teams);
  assert.ok([6, 7].includes(s.score.home));
  assert.equal(s.phase, 'kickoff'); assert.equal(s.kickingTeam, 'home'); assert.equal(s.possession, 'away');
  R.doKickoff(s, teams);
  assert.equal(s.phase, 'scrimmage'); assert.equal(s.possession, 'away'); assert.ok(s.ballOn >= 5 && s.ballOn <= 100);
});

test('turnover on downs flips the field', () => {
  const s = scrimmage({ down: 4, toGo: 3, ballOn: 60 });
  R.applyScrimmageResult(s, fakeSim({ yards: 1, endYard: 61 }));
  assert.equal(s.possession, 'away'); assert.equal(s.ballOn, 39); assert.equal(s.down, 1);
});

test('interception and fumble spots, touchback on end-zone interception', () => {
  let s = scrimmage({ ballOn: 40 });
  R.applyScrimmageResult(s, fakeSim({ result: 'interception', yards: 10, endYard: 50, stats: { interceptor: 'FS', passer: 'QB' } }));
  assert.equal(s.possession, 'away'); assert.equal(s.ballOn, 50);
  s = scrimmage({ ballOn: 85 });
  R.applyScrimmageResult(s, fakeSim({ result: 'touchback_return', yards: 0, endYard: 100, stats: { interceptor: 'CB1', passer: 'QB' } }));
  assert.equal(s.possession, 'away'); assert.equal(s.ballOn, 20);
  s = scrimmage({ ballOn: 30 });
  R.applyScrimmageResult(s, fakeSim({ result: 'fumble', yards: 3, endYard: 33, stats: { forcedBy: 'LB1', carrier: 'RB' } }));
  assert.equal(s.possession, 'away'); assert.equal(s.ballOn, 67);
});

test('safety awards two points and a free kick', () => {
  const s = scrimmage({ ballOn: 2 });
  R.applyScrimmageResult(s, fakeSim({ result: 'safety', yards: -2, endYard: 0, stats: { carrier: 'RB' } }));
  assert.equal(s.score.away, 2); assert.equal(s.phase, 'free_kick'); assert.equal(s.kickingTeam, 'home');
  R.doKickoff(s, teams);
  assert.equal(s.possession, 'away'); assert.equal(s.phase, 'scrimmage');
});

test('clock: runoff on a running clock, stops on incompletion, out of bounds only inside two minutes', () => {
  const s = scrimmage({ clock: 300 });
  R.applyScrimmageResult(s, fakeSim({ yards: 3, endYard: 28, elapsed: 5 }));
  assert.equal(s.clockRunning, true); assert.equal(s.clock, 295);
  R.preSnapRunoff(s, 'normal'); assert.equal(s.clock, 295 - R.RUNOFF.normal);
  R.applyScrimmageResult(s, fakeSim({ result: 'incomplete', elapsed: 4, stats: { passer: 'QB', target: 'WR1' } }));
  assert.equal(s.clockRunning, false);
  const before = s.clock; R.preSnapRunoff(s, 'normal'); assert.equal(s.clock, before, 'no runoff after an incompletion');
  s.quarter = 1; s.clock = 200;
  R.applyScrimmageResult(s, fakeSim({ result: 'out_of_bounds', yards: 5, endYard: 40, elapsed: 4, stats: { carrier: 'RB' } }));
  assert.equal(s.clockRunning, true, 'out of bounds keeps the clock running early');
  s.quarter = 4; s.clock = 100;
  R.applyScrimmageResult(s, fakeSim({ result: 'out_of_bounds', yards: 5, endYard: 45, elapsed: 4, stats: { carrier: 'RB' } }));
  assert.equal(s.clockRunning, false, 'out of bounds stops the clock inside two minutes');
});

test('a play snapped with time left finishes and then the quarter ends; halftime kickoff goes to the right team', () => {
  const s = scrimmage({ quarter: 2, clock: 2 });
  R.applyScrimmageResult(s, fakeSim({ yards: 12, endYard: 37, elapsed: 6 }));
  assert.equal(s.ballOn, 37, 'play completed');
  assert.equal(s.quarter, 3); assert.equal(s.phase, 'kickoff'); assert.equal(s.possession, 'away'); // home received to open
  assert.equal(s.kickingTeam, 'home');
  assert.deepEqual(s.timeouts, { home: 3, away: 3 });
});

test('a touchdown as time expires still gets its try', () => {
  const s = scrimmage({ quarter: 4, clock: 1, ballOn: 90, score: { home: 0, away: 6 } });
  R.applyScrimmageResult(s, fakeSim({ result: 'touchdown', yards: 10, endYard: 100, touchdown: true, elapsed: 4, stats: { carrier: 'RB' } }));
  assert.equal(s.phase, 'try'); assert.equal(s.finished, false);
  R.attemptTryKick(s, teams);
  assert.equal(s.finished, s.score.home !== s.score.away);
});

test('timeouts stop the clock and are limited', () => {
  const s = scrimmage({ clockRunning: true });
  assert.equal(R.timeout(s, 'away'), true); assert.equal(s.timeouts.away, 2); assert.equal(s.clockRunning, false);
  R.timeout(s, 'away'); R.timeout(s, 'away');
  assert.equal(R.timeout(s, 'away'), false);
});

test('field goals: make probability falls with distance; a miss gives the ball at the spot', () => {
  assert.ok(ST.fieldGoalChance(20, 70) > ST.fieldGoalChance(45, 70));
  assert.ok(ST.fieldGoalChance(45, 90) > ST.fieldGoalChance(45, 40));
  assert.ok(ST.fieldGoalChance(65, 50) < 0.1);
  const s = scrimmage({ ballOn: 60, down: 4, toGo: 8 });
  const { res } = R.doFieldGoal(s, teams);
  if (res.good) { assert.equal(s.score.home, 3); assert.equal(s.phase, 'kickoff'); }
  else { assert.equal(s.possession, 'away'); assert.equal(s.ballOn, 100 - 53); }
});

test('punts and kickoffs land in sensible ranges', () => {
  const rng = createRng(3);
  for (let i = 0; i < 200; i++) {
    const p = ST.punt(rng, { ballOn: 30, kicker: home.kicker, returner: away.returner });
    assert.ok(p.ballOn >= 1 && p.ballOn <= 100, 'punt spot');
    const k = ST.kickoff(rng, { kicker: home.kicker, returner: away.returner });
    assert.ok(k.ballOn >= 5 && k.ballOn <= 100, 'kickoff spot');
    if (k.touchback) assert.equal(k.ballOn, 25);
  }
  const s = scrimmage({ ballOn: 30, down: 4, toGo: 9 });
  R.doPunt(s, teams);
  assert.equal(s.possession, 'away'); assert.ok(s.ballOn < 70);
});

test('coaching AI: fourth-down, extra point and clock decisions', () => {
  const s = scrimmage({ down: 4, toGo: 9, ballOn: 20 });
  assert.equal(AI.fourthDownDecision(s, home), 'punt', '4th and long deep in own territory');
  Object.assign(s, { ballOn: 70, toGo: 6 }); assert.equal(AI.fourthDownDecision(s, home), 'fg', 'in range: kick');
  Object.assign(s, { ballOn: 60, toGo: 1 }); assert.equal(AI.fourthDownDecision(s, home), 'go', '4th and 1 in plus territory');
  Object.assign(s, { ballOn: 55, toGo: 4, quarter: 4, clock: 90, score: { home: 10, away: 14 } }); assert.equal(AI.fourthDownDecision(s, home), 'go', 'trailing late: go');
  Object.assign(s, { ballOn: 30, toGo: 8, quarter: 4, clock: 200, score: { home: 20, away: 14 } }); assert.equal(AI.fourthDownDecision(s, home), 'punt', 'leading late: punt');
  const t = scrimmage({ phase: 'try', tryTeam: 'home', quarter: 4, clock: 100, score: { home: 20, away: 22 } });
  assert.equal(AI.tryDecision(t), 'two', 'down two late: go for two');
  t.score = { home: 13, away: 7 }; t.quarter = 1; assert.equal(AI.tryDecision(t), 'kick');
  const k = scrimmage({ phase: 'kickoff', kickingTeam: 'home', quarter: 4, clock: 60, score: { home: 14, away: 21 } });
  assert.equal(AI.kickoffDecision(k), 'onside');
  assert.equal(AI.tempoDecision(scrimmage({ quarter: 4, clock: 100, score: { home: 0, away: 7 } })), 'hurry');
  assert.equal(AI.tempoDecision(scrimmage({ quarter: 4, clock: 100, score: { home: 7, away: 0 } })), 'milk');
  assert.ok(AI.shouldKneel(scrimmage({ quarter: 4, clock: 20, score: { home: 7, away: 0 }, timeouts: { home: 3, away: 0 } })));
  assert.ok(!AI.shouldKneel(scrimmage({ quarter: 4, clock: 20, score: { home: 0, away: 7 } })));
});

test('coaching AI weighs plays by situation and never sees the hidden call', () => {
  const s = scrimmage({ down: 3, toGo: 12 });
  const ids = ['deep_post', 'inside_zone', 'power_right', 'three_verticals', 'quick_slants'];
  const w = Object.fromEntries(AI.weighOffense(s, home, ids));
  assert.ok(w.deep_post > w.inside_zone, 'third and long prefers passes');
  const g = scrimmage({ ballOn: 98, toGo: 2 });
  const wg = Object.fromEntries(AI.weighOffense(g, home, ids));
  assert.ok(wg.power_right > wg.three_verticals, 'goal line prefers short/power');
  const wd = Object.fromEntries(AI.weighDefense(s, away, ['cover_4', 'goal_line', 'cover_3']));
  assert.ok(wd.cover_4 > wd.goal_line, 'third and long defense expects pass');
});

test('200 headless games complete with legal scores and a winner', () => {
  let ot = 0;
  for (let i = 1; i <= 200; i++) {
    const h = generatedTeam(1000 + i, { id: 'h', name: 'H' }), a = generatedTeam(2000 + i, { id: 'a', name: 'A' });
    const g = playGame({ home: h, away: a, seed: i });
    assert.equal(g.finished, true); assert.ok(!g.guard, `game ${i} hit the runner guard`);
    assert.ok(g.winner === 'home' || g.winner === 'away', `game ${i} has a winner`);
    assert.ok(g.score.home !== 1 && g.score.away !== 1, 'no impossible one-point totals');
    assert.ok(g.playCount >= 40 && g.playCount <= 160, `play count ${g.playCount}`);
    if (g.ot) ot++;
  }
  assert.ok(ot >= 1, 'overtime occurs occasionally');
});

test('the runner honours the human side\'s choices', () => {
  const s = R.newGame({ home, away, seed: 9, coinWinner: 'home', choice: 'receive' });
  const controllers = { home: aiController('home'), away: aiController('away') };
  const tend = { home: newTendencies(), away: newTendencies() };
  step(s, teams, controllers, tend); // kickoff
  assert.equal(s.phase, 'scrimmage'); assert.equal(s.possession, 'home');
  const ev = step(s, teams, controllers, tend, { offensePlayId: 'quick_slants', tempo: 'hurry' });
  assert.equal(ev.kind, 'play'); assert.equal(ev.offensePlayId, 'quick_slants');
  Object.assign(s, { possession: 'home', phase: 'scrimmage', down: 4, toGo: 8, ballOn: 30 });
  const ev2 = step(s, teams, controllers, tend, { fourthDown: 'punt' });
  assert.equal(ev2.kind, 'punt'); assert.equal(s.possession, 'away');
});

test('QA regressions: forward progress across the goal line scores; OT punt ends the possession; no free-kick blocks; no OT spikes', async () => {
  const { simulatePlay } = await import('../src/sim/engine.js');
  const { PLAYS } = await import('../src/data/playbook.js');
  const { lineup } = await import('./tools/lineup.js');
  const L = lineup(7, 60);
  let crossed = 0;
  for (let s = 1; s <= 600; s++) {
    const r = simulatePlay({ offensePlay: PLAYS.trap, defensePlay: PLAYS.tampa_2, ballOn: 93, seed: s, offense: L.offense, defense: L.defense });
    const last = r.frames[r.frames.length - 1];
    if (last.ball[0] >= r.bounds.goal - 0.001) { crossed++; assert.equal(r.result, 'touchdown', `seed ${s}: ball at ${last.ball[0]} past goal ${r.bounds.goal} must be a touchdown, got ${r.result}`); }
    for (const [slot, x] of [...r.frames[0].off, ...r.frames[0].def]) assert.ok(x <= r.bounds.endLine, `${slot} starts inside the end line`);
  }
  assert.ok(crossed > 0);
  const s = scrimmage({ quarter: 4, clock: 0, score: { home: 10, away: 10 } });
  R.endOfPeriod(s);
  assert.ok(s.ot, 'overtime started');
  const first = s.possession; s.down = 4; s.toGo = 9;
  R.doPunt(s, teams);
  assert.equal(s.possession, R.opponent(first)); assert.equal(s.ballOn, 75, 'second OT possession starts at the 25');
  assert.equal(AI.shouldSpike(Object.assign(scrimmage({ quarter: 5, clock: 0, clockRunning: true, score: { home: 7, away: 10 }, timeouts: { home: 0, away: 1 } }), { ot: { period: 1 } })), false);
  const fk = scrimmage({ phase: 'free_kick', kickingTeam: 'home' });
  for (let i = 0; i < 60; i++) { const c = structuredClone(fk); c.rngState = (c.rngState + i * 7919) >>> 0; const { text } = R.doKickoff(c, teams); assert.ok(!/BLOCKED/.test(text), 'free kicks are never blocked'); }
});
