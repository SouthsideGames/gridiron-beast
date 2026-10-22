// Instant replays (GDD §34): which plays earn one, which frames it shows, and that it can never touch the game.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { replayReason, replayPlan, replayPosition, decisiveTime, REPLAY } from '../src/ui/replay.js';
import { simulatePlay } from '../src/sim/engine.js';
import { step, aiController, newTendencies } from '../src/sim/game-runner.js';
import * as R from '../src/sim/rules.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS } from '../src/data/playbook.js';
import { generatedTeam } from '../src/franchise/roster.js';
import { lineup } from './tools/lineup.js';

const lu = lineup(12, 64);
const sims = []; for (let k = 0; k < 300; k++) sims.push(simulatePlay({ offensePlay: PLAYS[OFFENSE_IDS[k % OFFENSE_IDS.length]], defensePlay: PLAYS[DEFENSE_IDS[(k * 7) % DEFENSE_IDS.length]], offense: lu.offense, defense: lu.defense, seed: 2000 + k, ballOn: 60 }));
const state = (o = {}) => ({ quarter: 2, clock: 400, score: { home: 7, away: 3 }, finished: false, ot: null, ...o });
const evOf = (sim, o = {}) => ({ kind: 'play', sim, toGo: 10, down: 1, offenseSide: 'home', ...o });

test('triggers: touchdowns, takeaways, safeties, game-winning kicks, real fourth-down conversions, clutch plays, ability plays; never routine plays', () => {
  const td = sims.find((s) => s.result === 'touchdown'); assert.ok(td); assert.equal(replayReason(evOf(td), state(), 'home').kind, 'touchdown');
  const pick = sims.find((s) => s.result === 'interception'); if (pick) assert.equal(replayReason(evOf(pick), state(), 'home').kind, 'interception');
  const routine = sims.filter((s) => s.result === 'tackle' && s.yards >= 0 && s.yards < 8 && !s.events.some((e) => e.ability === true && e.kind !== 'ability'));
  assert.ok(routine.length > 20); for (const s of routine) assert.equal(replayReason(evOf(s), state(), 'home'), null, 'a routine gain is never replayed');
  const big = sims.find((s) => s.result === 'tackle' && s.yards >= 20 && !s.events.some((e) => e.ability === true && e.kind !== 'ability'));
  if (big) { assert.equal(replayReason(evOf(big), state(), 'home'), null, 'a long gain in the second quarter is not replayed on its own'); assert.equal(replayReason(evOf(big), state({ quarter: 4, clock: 90, score: { home: 14, away: 10 } }), 'home').kind, 'clutch'); }
  const conv = sims.find((s) => s.result === 'tackle' && s.yards >= 4 && s.yards < 12);
  assert.equal(replayReason(evOf(conv, { down: 4, toGo: 3 }), state(), 'home').kind, 'fourth_down');
  assert.equal(replayReason(evOf(conv, { down: 4, toGo: 1 }), state(), 'home')?.kind ?? null, null, 'fourth and one in the first half is routine');
  assert.equal(replayReason(evOf(conv, { down: 3, toGo: 3 }), state(), 'home')?.kind ?? null, null);
  const kick = { kind: 'field_goal', scored: true, kicking: 'home', sim: { kick: true, frames: Array.from({ length: 30 }, (_, i) => ({ t: i / 10, ball: [0, 0, 0], off: [], def: [] })) } };
  assert.equal(replayReason(kick, state({ quarter: 4, clock: 0, finished: true, score: { home: 20, away: 17 } }), 'home').kind, 'winning_fg');
  assert.equal(replayReason(kick, state({ quarter: 2, clock: 10, score: { home: 20, away: 17 } }), 'home'), null, 'an ordinary field goal');
  assert.equal(replayReason({ kind: 'punt', sim: kick.sim }, state(), 'home'), null);
  assert.equal(replayReason({ kind: 'play', sim: null }, state(), 'home'), null, 'no recorded frames, no replay');
});

test('plan: a bounded window of the recorded frames around the decisive moment, slowed only near it', () => {
  for (const s of sims.filter((x) => x.frames.length > 4).slice(0, 120)) {
    const reason = replayReason(evOf(s), state({ quarter: 4, clock: 60 }), 'home') || { kind: 'clutch' };
    const p = replayPlan(s, reason); const tD = decisiveTime(s, reason);
    assert.ok(p.i0 >= 0 && p.i1 < s.frames.length && p.i0 <= p.i1);
    assert.ok((s.frames[p.i1].t - s.frames[p.i0].t) <= REPLAY.maxSpan + 0.11, 'never more than the max span');
    assert.ok(p.totalMs < (REPLAY.maxSpan + 1) * 1000 / 1 + (REPLAY.slowBefore + REPLAY.slowAfter) * 1000 * (1 / REPLAY.slow), 'bounded duration');
    for (const st of p.steps) { const t = s.frames[st.i].t; assert.equal(st.slow, t >= tD - REPLAY.slowBefore && t <= tD + REPLAY.slowAfter); }
    let last = -1; for (let ms = 0; ms <= p.totalMs + 50; ms += 37) { const pos = replayPosition(p, ms); if (pos.done) break; assert.ok(pos.i >= last); last = pos.i; }
    assert.ok(replayPosition(p, p.totalMs + 1).done);
  }
});

test('safety: replaying a play reads its frames and nothing else; the game state, the play and its stats are byte-for-byte unchanged', () => {
  const home = generatedTeam(5, { id: 'h', name: 'Ember City Beasts', abbr: 'EMB', color: '#f00', quality: 62 }), away = generatedTeam(6, { id: 'a', name: 'Bayou Stalkers', abbr: 'BAY', color: '#0f0', quality: 58 });
  const teams = { home, away }; const s = R.newGame({ home, away, seed: 77 }); const ctl = { home: aiController('home'), away: aiController('away') }; const tend = { home: newTendencies(), away: newTendencies() };
  let replays = 0, guard = 0;
  while (!s.finished && guard++ < 400) {
    const before = { down: s.down, toGo: s.toGo, side: s.possession };
    const ev = step(s, teams, ctl, tend); if (!ev) break; ev.down = before.down; ev.toGo = before.toGo; ev.offenseSide = before.side;
    const reason = replayReason(ev, s, 'home'); if (!reason) continue;
    const snapState = JSON.stringify(s), snapSim = JSON.stringify(ev.sim);
    const p = replayPlan(ev.sim, reason); for (let ms = 0; ms < p.totalMs + 100; ms += 16) { const pos = replayPosition(p, ms); void ev.sim.frames[pos.i]; }
    assert.equal(JSON.stringify(s), snapState, 'score, clock, possession, stats untouched'); assert.equal(JSON.stringify(ev.sim), snapSim, 'the play itself untouched'); replays++;
  }
  assert.ok(replays >= 2, `${replays} replays in one game`);
  // The replay module cannot reach the game: it imports nothing.
  const src = fs.readFileSync(new URL('../src/ui/replay.js', import.meta.url), 'utf8'); assert.ok(!/^import /m.test(src), 'replay.js imports nothing');
  const match = fs.readFileSync(new URL('../src/ui/screens/match.js', import.meta.url), 'utf8'); const body = match.slice(match.indexOf('function startReplay'), match.indexOf('function endReplay'));
  for (const bad of ['step(', 'act(', 'runScrimmagePlay', 'simulatePlay', 'app.save', 'finishSunday', 'afterStep']) assert.ok(!body.includes(bad), `startReplay never calls ${bad}`);
});
