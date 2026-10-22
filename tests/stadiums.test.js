// Stadium environments (GDD §33): assignment, weather, the field bonus and its cap, the engine and saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENVIRONMENTS, STADIUMS, WEATHER, stadiumFor, venueFor, weatherFor } from '../src/data/stadiums.js';
import { ALL_TEAMS } from '../src/data/league.js';
import { GYMS } from '../src/data/gyms.js';
import { envMod, contestMod, typeMod, withTypeValues, FOOTBALL_TYPE_VALUES } from '../src/sim/type-matchups.js';
import { simulatePlay } from '../src/sim/engine.js';
import * as R from '../src/sim/rules.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS } from '../src/data/playbook.js';
import { fieldSvg } from '../src/ui/field-view.js';
import { lineup } from './tools/lineup.js';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { newFranchise } from '../tools/franchise-soak.mjs';

test('every club has one permanent stadium in a known environment; gym clubs sit in their element where one exists', () => {
  assert.deepEqual(Object.keys(STADIUMS).sort(), [...ALL_TEAMS].sort());
  const names = new Set();
  for (const club of ALL_TEAMS) { const s = stadiumFor(club); assert.ok(ENVIRONMENTS[s.env], club); assert.ok(!names.has(s.name), `unique name ${s.name}`); names.add(s.name); assert.equal(stadiumFor(club).env, s.env, 'permanent'); }
  for (const g of GYMS) { const env = Object.values(ENVIRONMENTS).find((e) => e.type === g.element); if (env) assert.equal(stadiumFor(g.club).type, g.element, `${g.club} plays in the ${env.name}`); }
  assert.deepEqual(Object.values(ENVIRONMENTS).map((e) => e.type), [null, 'Ice', 'Fire', 'Nature', 'Electric', 'Earth', 'Metal']);
  assert.equal(stadiumFor('Ember City Beasts').env, 'volcanic'); assert.equal(stadiumFor('Ironpeak Rams').indoor, true);
  assert.equal(stadiumFor('Ember City Beasts', { 'Ember City Beasts': { name: 'New Pit', env: 'dome' } }).env, 'dome', 'a future stadium-management override replaces the default');
});

test('weather: deterministic per game, drawn from the environment, never indoors under a dome, always a known kind', () => {
  for (const env of Object.keys(ENVIRONMENTS)) for (let k = 0; k < 60; k++) {
    const w = weatherFor(env, `g${k}`); assert.ok(WEATHER[w], w); assert.ok(ENVIRONMENTS[env].weather[w], `${env} draws ${w}`); assert.equal(weatherFor(env, `g${k}`), w);
    if (ENVIRONMENTS[env].indoor) assert.equal(w, 'indoor'); else assert.notEqual(w, 'indoor');
  }
  const seen = new Set(Array.from({ length: 80 }, (_, k) => weatherFor('frozen', k))); assert.ok(seen.size >= 3, 'weather varies from game to game');
});

test('field bonus: +2% for the field\'s type on either team, nothing on neutral grass, capped at +6% with a type edge; never negative help', () => {
  assert.equal(envMod('Fire', 'Fire'), 0.02); assert.equal(envMod('Water', 'Fire'), 0); assert.equal(envMod('Fire', null), 0);
  assert.equal(contestMod('Fire', 'Nature', 'Fire'), 0.06, '+4 type +2 field = the cap'); assert.equal(contestMod('Fire', 'Psychic', 'Fire'), 0.02);
  assert.equal(contestMod('Nature', 'Fire', 'Fire'), -0.04, 'the opponent is not penalised by the field'); assert.equal(contestMod('Fire', 'Water', 'Fire'), -0.02, 'field +2 against a type disadvantage −4');
  assert.equal(contestMod('Fire', 'Nature', null), typeMod('Fire', 'Nature'));
  withTypeValues({ positiveCap: 0.05 }, () => assert.equal(contestMod('Fire', 'Nature', 'Fire'), 0.05, 'the cap binds'));
  assert.equal(FOOTBALL_TYPE_VALUES.envMatch, 0.02); assert.equal(FOOTBALL_TYPE_VALUES.positiveCap, 0.06);
});

const typed = (lu, offT, defT) => ({ offense: Object.fromEntries(Object.entries(lu.offense).map(([s, p]) => [s, { ...p, type: offT }])), defense: Object.fromEntries(Object.entries(lu.defense).map(([s, p]) => [s, { ...p, type: defT }])) });

test('engine: a neutral field changes nothing; a matching field helps whichever side has the type, recorded per contest; inputs never change', () => {
  const lu = lineup(9, 62); const T = typed(lu, 'Psychic', 'Psychic'); const before = JSON.stringify(T);
  for (let k = 0; k < 30; k++) {
    const op = PLAYS[OFFENSE_IDS[k % OFFENSE_IDS.length]], dp = PLAYS[DEFENSE_IDS[(k * 5) % DEFENSE_IDS.length]];
    const a = simulatePlay({ offensePlay: op, defensePlay: dp, offense: T.offense, defense: T.defense, seed: 600 + k, ballOn: 30 });
    const b = simulatePlay({ offensePlay: op, defensePlay: dp, offense: T.offense, defense: T.defense, seed: 600 + k, ballOn: 30, options: { envType: null } });
    const c = simulatePlay({ offensePlay: op, defensePlay: dp, offense: T.offense, defense: T.defense, seed: 600 + k, ballOn: 30, options: { envType: 'Fire' } });
    assert.equal(a.yards, b.yards); assert.equal(a.yards, c.yards, 'a field nobody matches is neutral'); assert.equal(c.typeContests.length, 0);
  }
  const both = typed(lu, 'Fire', 'Fire'); let offEnv = 0, defEnv = 0;
  for (let k = 0; k < 60; k++) {
    const r = simulatePlay({ offensePlay: PLAYS[OFFENSE_IDS[k % OFFENSE_IDS.length]], defensePlay: PLAYS[DEFENSE_IDS[k % DEFENSE_IDS.length]], offense: both.offense, defense: both.defense, seed: 700 + k, ballOn: 30, options: { envType: 'Fire' } });
    for (const e of r.typeContests) { assert.equal(e.env, 'Fire'); assert.equal(e.mod, 0.02); assert.equal(e.opp, 0.02); if (e.team === 'off') offEnv++; else defEnv++; }
  }
  assert.ok(offEnv > 0 && defEnv > 0, 'both teams get the field bonus');
  assert.equal(JSON.stringify(T), before);
});

test('games carry their venue: newGame records it, older saved games without one still play, the preview matches the game, saves keep it', () => {
  const lu = lineup(4, 60); const team = (name) => ({ name, abbr: name.slice(0, 3).toUpperCase(), color: '#fff', offense: lu.offense, defense: lu.defense, offensePlays: OFFENSE_IDS.slice(0, 6), defensePlays: DEFENSE_IDS.slice(0, 6), kicker: { attrs: { kicking: 70 } } });
  const s = R.newGame({ home: team('Ember City Beasts'), away: team('Bayou Stalkers'), seed: 5 });
  assert.equal(s.venue.env, 'volcanic'); assert.equal(s.venue.type, 'Fire'); assert.ok(WEATHER[s.venue.weather]);
  const old = R.newGame({ home: team('Ember City Beasts'), away: team('Bayou Stalkers'), seed: 5 }); delete old.venue;
  old.phase = 'scrimmage'; assert.doesNotThrow(() => R.runScrimmagePlay(old, { home: team('Ember City Beasts'), away: team('Bayou Stalkers') }, OFFENSE_IDS[0], DEFENSE_IDS[0]), 'a game saved before venues still plays (no field bonus)');
  const f = newFranchise(31); F.autoRunToSunday(f); if (F.isBye(f)) { F.takeBye(f); F.autoRunToSunday(f); }
  const v = F.sundayVenue(f); const m = F.sundayMatchup(f); assert.equal(v.home, m.home.name);
  const g = F.simulatePlayerGame(f); assert.deepEqual({ ...g.venue }, { club: v.club, name: v.name, env: v.env, type: v.type, indoor: v.indoor, weather: v.weather }, 'the game is played where and in the weather the preview said');
  const back = Save.importJson(Save.exportJson(f)); assert.ok(back); assert.equal(stadiumFor(back.club).env, stadiumFor(f.club).env);
});

test('presentation: grass without a venue draws exactly as before; every environment draws its own turf and keeps the yard lines', () => {
  const plain = fieldSvg({ ballOn: 30 }); assert.equal(plain, fieldSvg({ ballOn: 30, venue: { env: 'grass', weather: 'clear' } }));
  for (const env of Object.keys(ENVIRONMENTS)) {
    const svg = fieldSvg({ ballOn: 95, venue: { env, weather: 'clear' } });
    assert.ok(svg.includes(ENVIRONMENTS[env].palette.a), env); assert.ok(svg.includes('stroke="#eaf3e6"'), `${env} keeps white yard lines`);
  }
});
