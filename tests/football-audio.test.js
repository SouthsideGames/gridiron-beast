import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FOOTBALL_CLIPS, footballCues, periodWhistle, stadiumBed, stadiumOutcome } from '../src/audio/football.js';

test('all mapped football cues have bundled audio', () => {
  for (const path of Object.values(FOOTBALL_CLIPS)) {
    const bytes = readFileSync(new URL('../' + path, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', path);
    assert.equal(bytes.toString('ascii', 8, 12), 'WAVE', path);
  }
});

test('throw clips follow target depth, with screens always using bullet', () => {
  const cues = (targetDepth, tags = []) => footballCues({ kind: 'play', sim: { events: [
    { kind: 'throw', targetDepth, t: .8 }, { kind: 'catch', t: 1.5 },
  ] } }, { align: { QB: [-5, 0] }, tags });
  assert.deepEqual(cues(9.9), [
    { id: 'shotgun_snap_01', time: 0 }, { id: 'throw_bullet', time: .8 }, { id: 'catch_hands_02', time: 1.5 },
  ]);
  assert.equal(cues(10)[1].id, 'throw_touch');
  assert.equal(cues(19.9)[1].id, 'throw_touch');
  assert.equal(cues(20)[1].id, 'throw_lob');
  assert.equal(cues(22, ['screen'])[1].id, 'throw_bullet');
  assert.equal(footballCues({ kind: 'play' }, { align: { QB: [-1.6, 0] } })[0].id, 'snap_exchange_01');
  for (const [kind, id] of [['kickoff', 'kick_off'], ['punt', 'kick_punt'], ['field_goal', 'kick_field'], ['try', 'kick_field']]) {
    assert.deepEqual(footballCues({ kind, kicking: 'home', sim: { frames: [{ t: .5, ball: [1, 0, 1] }] } }), [{ id, time: .5 }]);
  }
});

test('quarter and final whistles only cue on their transitions', () => {
  assert.equal(periodWhistle(undefined, { quarter: 1, phase: 'kickoff', playCount: 0 }), 'whistle_short_01');
  assert.equal(periodWhistle({ quarter: 1 }, { quarter: 2 }), 'whistle_short_01');
  assert.equal(periodWhistle({ quarter: 2 }, { quarter: 2 }), null);
  assert.equal(periodWhistle({ quarter: 4 }, { finished: true, needsTiebreak: true }), null);
  assert.equal(periodWhistle({ quarter: 4 }, { finished: true, needsTiebreak: true, winner: 'home' }), 'whistle_dead_01');
  assert.equal(periodWhistle({ final: true }, { finished: true }), null);
  assert.equal(periodWhistle(undefined, { finished: true }), null);
});

test('stadium cues follow the venue home and away teams', () => {
  const state = { phase: 'scrimmage', down: 3, possession: 'away' };
  assert.equal(stadiumBed(state), 'stadium_third_down_loop');
  assert.equal(stadiumBed({ ...state, possession: 'home' }), 'stadium_quiet_loop');
  assert.equal(stadiumBed({ ...state, finished: true }), null);
  const event = { kind: 'play', down: 3, firstDown: true };
  assert.equal(stadiumOutcome({ ...event, offenseSide: 'home' }), 'stadium_roar');
  assert.equal(stadiumOutcome({ ...event, offenseSide: 'away' }), 'stadium_stir');
  assert.equal(stadiumOutcome({ ...event, sim: { result: 'touchdown' } }), 'touchdown');
});
