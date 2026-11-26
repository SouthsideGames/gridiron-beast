// Play test 2026-11-26 (owner): on a two-point try the play the coach calls is the play that runs. The runner's short-yardage filter only
// narrows the AI's own pick; a called play from the plan that can be fielded is never swapped for another.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/sim/rules.js';
import { step, aiController, newTendencies } from '../src/sim/game-runner.js';
import { generatedTeam } from '../src/franchise/roster.js';
import { PLAYS } from '../src/data/playbook.js';

const SHORT = ['short', 'goalline', 'redzone'];
const ctl = { home: aiController('home'), away: aiController('away') }; const tend = () => ({ home: newTendencies(), away: newTendencies() });

test('a called play without a short-yardage tag runs on the two-point try (it was replaced by the AI pick before)', () => {
  let checked = 0;
  for (let seed = 1; seed <= 40 && checked < 6; seed++) {
    const teams = { home: generatedTeam(seed, { id: 'h', name: 'Home' }), away: generatedTeam(seed + 500, { id: 'a', name: 'Away' }) };
    const called = teams.home.offensePlays.find((id) => !PLAYS[id].tags.some((t) => SHORT.includes(t)));
    if (!called || !teams.home.offensePlays.some((id) => PLAYS[id].tags.some((t) => SHORT.includes(t)))) continue; // the filter must have had something to narrow to
    const s = R.newGame({ home: teams.home, away: teams.away, seed, coinWinner: 'home', choice: 'receive' });
    Object.assign(s, { phase: 'try', tryTeam: 'home', possession: 'home', ballOn: 98, toGo: 2, clock: 600, quarter: 2 });
    const ev = step(s, teams, ctl, tend(), { tryChoice: 'two', offensePlayId: called });
    assert.equal(ev.kind, 'try'); assert.equal(ev.offensePlayId, called, `seed ${seed}: called ${called}, ran ${ev.offensePlayId}`);
    checked++;
  }
  assert.ok(checked >= 3, `only ${checked} clubs had a non-short play to call`);
});

test('without a called play the AI still picks from the short-yardage plays', () => {
  const teams = { home: generatedTeam(3, { id: 'h', name: 'Home' }), away: generatedTeam(503, { id: 'a', name: 'Away' }) };
  const s = R.newGame({ home: teams.home, away: teams.away, seed: 3, coinWinner: 'home', choice: 'receive' });
  Object.assign(s, { phase: 'try', tryTeam: 'home', possession: 'home', ballOn: 98, toGo: 2, clock: 600, quarter: 2 });
  const ev = step(s, teams, ctl, tend(), { tryChoice: 'two' });
  const hasShort = teams.home.offensePlays.some((id) => PLAYS[id].tags.some((t) => SHORT.includes(t)));
  if (hasShort) assert.ok(PLAYS[ev.offensePlayId].tags.some((t) => SHORT.includes(t)), `AI ran ${ev.offensePlayId}`);
});
