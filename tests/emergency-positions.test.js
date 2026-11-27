// Balance audit R-6 (owner decision 2026-11-25): emergency positions. A base slot with no healthy beast of its own position takes an
// emergency cover (EMERGENCY_POSITION), before the lineup, in-game and in the play check; forfeits only when no legal lineup exists,
// and a forfeit keeps the game played so far.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EMERGENCY_POSITION, canCoverEmergency, canPlay, emergencySources } from '../src/data/personnel.js';
import { generatedTeam, buildTeam, lineupProblems, emergencySlots } from '../src/franchise/roster.js';
import { effectiveAttributes, monsterOverall } from '../src/data/monsters.js';
import { emergencyFeasible } from '../src/sim/substitutions.js';
import { step, aiController, newTendencies } from '../src/sim/game-runner.js';
import * as R from '../src/sim/rules.js';
import { inGameForfeit } from '../src/franchise/franchise.js';

test('the approved table, base slots only, normal eligibility unchanged', () => {
  assert.deepEqual({ ...EMERGENCY_POSITION }, { QB: 'WR', RB: 'WR', WR: 'RB', TE: 'OL', OL: 'TE', DL: 'LB', LB: 'DL', CB: 'S', S: 'CB', K: 'QB' });
  assert.equal(canCoverEmergency('K', 'QB'), true); assert.equal(canCoverEmergency('CB', 'FS'), true); assert.equal(canCoverEmergency('OL', 'TE'), true);
  assert.equal(canCoverEmergency('CB', 'SS'), false, 'package slots never take an emergency cover');
  assert.equal(canCoverEmergency('OL', 'C'), false); assert.equal(canCoverEmergency('QB', 'K'), false, 'nobody covers K');
  assert.deepEqual(emergencySources('WR').sort(), ['QB', 'RB']); assert.deepEqual(emergencySources('K'), []);
  assert.equal(canPlay('S', 'CB2'), false, 'the depth chart rule is still one position per beast');
});

test('no out-of-position penalty: a beast keeps his own attributes at any slot', () => {
  const t = generatedTeam(5, { id: 'h', name: 'H' }); const m = t.roster.find((x) => x.position === 'CB');
  assert.deepEqual(effectiveAttributes(m, { slotPosition: 'S' }), effectiveAttributes(m));
});

const hurt = (roster, pos) => roster.map((m) => (m.position === pos ? { ...m, injury: { severity: 'Moderate', weeks: 2, type: 'knee' } } : m));

test('before the game: with every QB hurt the kicker covers QB, and the lineup is legal', () => {
  const t = generatedTeam(21, { id: 'h', name: 'H' }); const roster = hurt(t.roster, 'QB');
  const team = buildTeam({ id: 'h', name: 'H', roster });
  const k = roster.find((m) => m.id === team.chart.QB); assert.equal(k?.position, 'K');
  assert.deepEqual(lineupProblems(roster, team.chart), []);
  assert.deepEqual(emergencySlots(roster, team.chart).map((e) => e.slot), ['QB']);
  assert.equal(team.offense.QB.attrs.accuracy, effectiveAttributes(k).accuracy, 'he plays on his own attributes');
});

test('before the game: the cover is the best at the slot position, and never a beast his own group still needs', () => {
  const t = generatedTeam(22, { id: 'h', name: 'H' });
  const roster = hurt(t.roster, 'S');
  const team = buildTeam({ id: 'h', name: 'H', roster });
  const fs = roster.find((m) => m.id === team.chart.FS);
  const cbs = roster.filter((m) => m.position === 'CB' && !m.injury);
  if (cbs.length > 2) {
    assert.equal(fs?.position, 'CB');
    assert.ok(['CB1', 'CB2'].every((s) => roster.find((m) => m.id === team.chart[s])?.position === 'CB'), 'both CB slots keep corners');
    const spare = cbs.filter((m) => m.id !== team.chart.CB1 && m.id !== team.chart.CB2);
    assert.equal(Math.max(...spare.map((m) => monsterOverall(m, { slotPosition: 'S' }))), monsterOverall(fs, { slotPosition: 'S' }));
  } else assert.equal(team.chart.FS, null, 'no spare corner: the slot stays empty');
});

test('the play check: a shortfall is coverable only in base slots and only from spare beasts', () => {
  const pool = (o) => Object.entries(o).flatMap(([pos, n]) => Array.from({ length: n }, () => ({ position: pos })));
  assert.equal(emergencyFeasible(pool({ K: 1, WR: 2 }), { QB: 1, WR: 2 }, { QB: 1, WR: 2 }), true, 'K covers QB');
  assert.equal(emergencyFeasible(pool({ QB: 1, WR: 2, RB: 2 }), { QB: 1, WR: 3, RB: 1 }, { QB: 1, WR: 2, RB: 1 }), false, 'a spare RB never opens a three-WR (package) call');
  assert.equal(emergencyFeasible(pool({ QB: 1, RB: 2, WR: 1 }), { QB: 1, RB: 1, WR: 2 }, { QB: 1, RB: 1, WR: 2 }), true, 'a spare RB covers WR');
  assert.equal(emergencyFeasible(pool({ QB: 1, RB: 1, WR: 1 }), { QB: 1, RB: 1, WR: 2 }, { QB: 1, RB: 1, WR: 2 }), false, 'the only RB is needed at RB');
});

function playOut(seed, injurePositions) {
  const home = generatedTeam(seed, { id: 'h', name: 'Home' }), away = generatedTeam(seed + 1, { id: 'a', name: 'Away' });
  const teams = { home, away }; const state = R.newGame({ home, away, seed, quarterLength: 180, otPeriods: 1 });
  const ctl = { home: aiController('home'), away: aiController('away') }, tend = { home: newTendencies(), away: newTendencies() };
  const pool = [...Object.values(home.offense), ...Object.values(home.defense), ...(home.bench || []), home.kicker].filter((p) => p?.id);
  let before = null, n = 0; const emergency = new Set();
  while (!state.finished && n++ < 3000) {
    if (!before && state.quarter === 3 && state.phase === 'scrimmage') {
      before = { ...state.score }; state.rotation ||= { active: {}, manual: {}, injuries: {}, notices: [] };
      for (const p of pool) if (injurePositions.includes(p.position)) state.rotation.injuries[p.id] = { severity: 'Minor', weeks: 1, type: 'ankle', inGame: true };
    }
    if (!step(state, teams, ctl, tend)) break;
    for (const x of state.rotation?.notices || []) if (x.reason === 'emergency') emergency.add(`${x.side}:${x.slot}`);
  }
  return { state, before, home, emergency };
}

test('in the game: every QB hurt in the third quarter, the kicker covers QB and the game is played out, his stats his own', () => {
  const { state, home, emergency } = playOut(11, ['QB']);
  assert.ok(emergency.has('home:QB'), 'the cover is announced');
  assert.ok(state.finished); assert.equal(state.forfeit, undefined);
  const k = home.kicker; const line = state.stats.home.players[k.id];
  assert.ok(line?.att > 0, 'his passes are on his own line'); assert.ok(line.kickoffs > 0, 'and he still kicks');
});

test('in the game: with QB and K both gone the game is forfeited, the score played is kept beside the official 0-21', () => {
  const { state, before } = playOut(11, ['QB', 'K']);
  assert.ok(state.finished); assert.ok(state.forfeit, 'forfeited');
  assert.equal(state.forfeit.side, 'home'); assert.deepEqual(state.score, { home: 0, away: 21 });
  assert.ok(state.forfeit.played.home >= before.home && state.forfeit.played.away >= before.away, 'the played score is kept');
  const tag = inGameForfeit(state, { home: 'Home', away: 'Away' });
  assert.equal(tag.forfeit, true); assert.equal(tag.forfeitBy, 'Home'); assert.deepEqual(tag.playedScore, state.forfeit.played);
  assert.deepEqual(inGameForfeit({ score: {} }, { home: 'Home', away: 'Away' }), {}, 'other games are unchanged');
});
