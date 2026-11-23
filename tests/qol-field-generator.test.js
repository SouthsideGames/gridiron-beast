// The field generator. Since 2026-11-22 (owner) the home club decides the field: a Gym Leader's field appears only when that Gym
// Leader hosts, every other club's home is grass, and nothing is drawn. (The earlier rules, a gym's field home or away and a
// 65% grass / 35% elemental draw, are superseded; drawField is still tested as the pure function it is.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRASS_SHARE, ELEMENTAL_FIELDS, FIELD_BY_TYPE, UNMAPPED_BOSS_TYPES, bossOf, drawField, fieldFor, generatedVenue } from '../src/data/field-generator.js';
import { ENVIRONMENTS, STADIUMS, WEATHER, stadiumFor, venueFor, fieldElement } from '../src/data/stadiums.js';
import { GYMS, isGymClub } from '../src/data/gyms.js';
import { ALL_TEAMS } from '../src/data/league.js';
import * as F from '../src/franchise/franchise.js';
import * as R from '../src/sim/rules.js';
import { newFranchise } from '../tools/franchise-soak.mjs';

const ORDINARY = ALL_TEAMS.filter((c) => !isGymClub(c));
const REQUIRED = { 'Harbor Anchors': 'tidal', 'Sunfire Solars': 'radiant', 'Eastport Phantoms': 'shadow', 'Palmetto Wyrms': 'dragon', 'Thunder Mesa Blitz': 'storm', 'Canyon Crushers': 'desert', 'Frostpeak Howlers': 'frozen', 'Ironpeak Colossi': 'dome',
  'Emberfall Infernos': 'volcanic', 'Westhaven Pirates': 'forest', 'Cliffhaven Chargers': 'sky', 'Aetheria Seers': 'oracle' };

test('every club without a Gym Leader plays every home game on grass: nothing is drawn, whoever visits', () => {
  assert.equal(ORDINARY.length, 20); for (const c of ORDINARY) assert.equal(STADIUMS[c].env, 'grass', c);
  for (let seed = 1; seed <= 6; seed++) for (let year = 1; year <= 3; year++) for (let week = 1; week <= 18; week++) for (const home of ORDINARY) for (const away of ALL_TEAMS.filter((c) => c !== home)) {
    const v = fieldFor(home, away, `${seed}|${year}|${week}`); assert.equal(v.env, 'grass', `${away} at ${home}`); assert.equal(v.by, 'home'); assert.equal(v.boss, null);
  }
  assert.equal(GRASS_SHARE, 0.65); assert.deepEqual(ELEMENTAL_FIELDS, ['frozen', 'volcanic', 'forest', 'storm', 'desert', 'dome', 'tidal', 'radiant', 'shadow', 'dragon', 'sky', 'oracle'], 'the twelve type fields');
});

test('the same key always gives the same field, and choosing a field uses no game dice', () => {
  for (let k = 0; k < 200; k++) assert.equal(drawField(`s|1|${k}`), drawField(`s|1|${k}`));
  const f = newFranchise(77); const rng = JSON.stringify(f.rngState); const a = F.gameVenue(f, ORDINARY[0], ORDINARY[1]); const b = F.gameVenue(f, ORDINARY[0], ORDINARY[1]);
  assert.deepEqual(a, b); assert.equal(JSON.stringify(f.rngState), rng, 'the franchise dice did not move');
  const g = newFranchise(77); assert.deepEqual(F.gameVenue(g, ORDINARY[0], ORDINARY[1]), a, 'the same seed gives the same field');
});

test('Gym Leaders: all twelve have their own field; it is used at every home game and only there, over stadium overrides', () => {
  assert.deepEqual(Object.fromEntries(GYMS.map((g) => [g.club, FIELD_BY_TYPE[g.element]])), REQUIRED);
  assert.deepEqual([...UNMAPPED_BOSS_TYPES], [], 'no gym is without a field');
  assert.deepEqual(Object.fromEntries(GYMS.map((g) => [g.club, ENVIRONMENTS[REQUIRED[g.club]].name])), { 'Harbor Anchors': 'Tidal Arena', 'Sunfire Solars': 'Radiant Coliseum', 'Eastport Phantoms': 'Shadow Grounds', 'Palmetto Wyrms': 'Dragon\'s Den', 'Thunder Mesa Blitz': 'Storm Stadium', 'Canyon Crushers': 'Desert Stadium', 'Frostpeak Howlers': 'Frozen Stadium', 'Ironpeak Colossi': 'Metallic Dome',
    'Emberfall Infernos': 'Volcanic Stadium', 'Westhaven Pirates': 'Forest Stadium', 'Cliffhaven Chargers': 'Sky Stadium', 'Aetheria Seers': 'Oracle Stadium' });
  for (const g of GYMS) { assert.equal(stadiumFor(g.club).env, REQUIRED[g.club], `${g.club}'s own stadium is its element's field`);
    for (const other of ALL_TEAMS.filter((c) => c !== g.club)) for (let week = 1; week <= 18; week++) {
      const overrides = week % 3 === 0 ? { [g.club]: { name: 'Somewhere Else', env: 'volcanic' }, [other]: { name: 'Elsewhere', env: 'frozen' } } : null; // a saved override never beats a Gym Leader at home
      const v = generatedVenue(g.club, other, `5|1|${week}`, overrides);
      assert.equal(v.env, REQUIRED[g.club], `${other} at ${g.club}`); assert.equal(v.fieldBy, 'home'); assert.equal(v.boss, g.club); assert.equal(fieldElement(v.env), g.element, 'never an unrelated element');
      assert.equal(v.name, stadiumFor(g.club).name, 'the stadium keeps the Gym Leader\'s own name, whatever was saved over it'); assert.ok(WEATHER[v.weather]); assert.ok(ENVIRONMENTS[v.env].weather[v.weather]);
      if (!isGymClub(other)) { const away = generatedVenue(other, g.club, `5|1|${week}`); assert.equal(away.env, 'grass', `${g.club} away at ${other} plays on grass`); assert.equal(away.boss, undefined); assert.equal(away.type, null, 'no field bonus for anyone'); }
    } }
  for (const a of GYMS) for (const b of GYMS) if (a !== b) { assert.equal(bossOf(a.club, b.club).club, a.club); const v = generatedVenue(a.club, b.club, 'k'); assert.equal(v.env, REQUIRED[a.club], 'two Gym Leaders: the home gym\'s field'); assert.equal(v.boss, a.club); }
  assert.equal(bossOf(ORDINARY[0], ORDINARY[1]), null);
  // the playoffs follow the same rule: the venue depends only on the home club
  for (const key of ['7|2|16', '7|2|17', '7|2|18']) { assert.equal(generatedVenue('Frostpeak Howlers', 'Harbor Anchors', key).env, 'frozen'); assert.equal(generatedVenue('Goldhaven Royals', 'Harbor Anchors', key).env, 'grass'); }
});

test('the moved Gym Leaders: Cliffhaven has the Wind field and Westhaven the coastal Nature field; Skyvale and Thornwood are grass', () => {
  const c = generatedVenue('Cliffhaven Chargers', 'Skyvale Cyclones', 'k'); assert.equal(c.env, 'sky'); assert.equal(c.name, 'Cliffside Arena'); assert.equal(fieldElement(c.env), 'Wind'); assert.equal(c.type, null, 'Wind has no field bonus yet');
  const w = generatedVenue('Westhaven Pirates', 'Thornwood Wildroots', 'k'); assert.equal(w.env, 'forest'); assert.equal(w.name, 'Corsair Harbor Stadium'); assert.equal(w.variant, 'coastal'); assert.equal(w.type, 'Nature');
  const s = generatedVenue('Skyvale Cyclones', 'Cliffhaven Chargers', 'k'); assert.equal(s.env, 'grass'); assert.equal(s.name, 'Skyvale Summit'); assert.equal(s.variant, undefined);
  const t = generatedVenue('Thornwood Wildroots', 'Westhaven Pirates', 'k'); assert.equal(t.env, 'grass'); assert.equal(t.name, 'Elderroot Stadium');
  assert.equal(generatedVenue('Westhaven Pirates', 'Thornwood Wildroots', 'k', { 'Westhaven Pirates': { name: 'X', env: 'dome' } }).variant, 'coastal', 'the Gym Leader keeps its field');
});

test('Dragon\'s Den, Sky and Oracle are looks only: no type bonus anywhere in the engine path; the other nine use the matching-type bonus', async () => {
  const { envMod, contestMod } = await import('../src/sim/type-matchups.js');
  for (const [env, element, club] of [['dragon', 'Dragon', 'Palmetto Wyrms'], ['sky', 'Wind', 'Cliffhaven Chargers'], ['oracle', 'Psychic', 'Aetheria Seers']]) {
    assert.equal(ENVIRONMENTS[env].type, null); assert.equal(fieldElement(env), element);
    const v = generatedVenue(club, ORDINARY[0], 'k'); assert.equal(v.env, env); assert.equal(v.type, null, 'the engine reads venue.type: nothing is favoured');
    assert.equal(envMod(element, v.type), 0); assert.equal(contestMod(element, 'Fire', v.type), contestMod(element, 'Fire', null));
  }
  for (const [env, type] of [['tidal', 'Water'], ['radiant', 'Light'], ['shadow', 'Dark']]) { assert.equal(ENVIRONMENTS[env].type, type); assert.equal(envMod(type, type), envMod('Fire', 'Fire'), 'the same bonus as the older fields, not a new one'); }
  assert.equal(Object.values(ENVIRONMENTS).filter((e) => e.type).length, 9);
  for (const e of Object.values(ENVIRONMENTS)) assert.deepEqual(Object.keys(e).filter((k) => !['id', 'name', 'short', 'type', 'element', 'indoor', 'icon', 'texture', 'palette', 'blurb', 'weather'].includes(k)), [], `${e.id}: no hazard, status or ability field`);
});

test('below the Gym Leader rule: a saved override for an ordinary home club, else its own grass; the engine default is untouched', () => {
  for (const home of ORDINARY) for (let k = 0; k < 10; k++) { const v = generatedVenue(home, ORDINARY.find((c) => c !== home), `p|${k}`); assert.equal(v.env, 'grass', `${home} keeps its stadium`); assert.equal(v.fieldBy, 'home'); }
  for (const club of ['Ember City Beasts', 'Glacier Guardians', 'Stormport Bolts', 'Sundown Drakes', 'Bayou Stalkers']) assert.equal(generatedVenue(club, ORDINARY[0], 'x').env, 'grass', `${club} had an elemental stadium in the 16-club league; it is grass now`);
  { const home = ORDINARY[0]; const ov = { [home]: { name: 'New Yard', env: 'dome' } };
    for (let k = 0; k < 20; k++) { const v = generatedVenue(home, ORDINARY[1], `o|${k}`, ov); assert.equal(v.env, 'dome'); assert.equal(v.fieldBy, 'override'); assert.equal(v.name, 'New Yard'); assert.equal(v.weather, 'indoor'); } }
  assert.equal(generatedVenue(ORDINARY[0], 'Emberfall Infernos', 'x').env, 'grass', 'a visiting club\'s stadium does not travel');
  assert.equal(venueFor('Emberfall Infernos', 1).env, 'volcanic', 'stadiums.js venueFor follows the same stadium table (direct engine games, tests, benchmarks)');
});

test('franchise: the preview field is the field the game is played on, field effects still apply, and a week still initialises and finishes', () => {
  let gymHome = 0, plain = 0, typed = 0;
  for (const seed of [11, 12, 13]) { const f = newFranchise(seed);
    for (let w = 0; w < 8 && !f.season.finished; w++) { F.autoRunToSunday(f); if (F.isBye(f)) { F.takeBye(f); continue; } const m = F.sundayMatchup(f); if (!m) break; if (m.forfeit) { F.forfeitSunday(f); continue; }
      const v = F.sundayVenue(f); const game = F.simulatePlayerGame(f); assert.ok(game.finished);
      assert.equal(game.venue.env, v.env); assert.equal(game.venue.type, v.type); assert.equal(game.venue.weather, v.weather); assert.equal(game.venue.fieldBy, v.fieldBy);
      assert.equal(v.env, STADIUMS[v.home].env, 'the home club decides the field'); assert.equal(v.fieldBy, 'home');
      if (isGymClub(v.home)) { gymHome++; assert.equal(v.boss, v.home); } else { plain++; assert.equal(v.env, 'grass'); assert.equal(v.boss, undefined); }
      if (v.type) typed++; F.finishSunday(f, game); } }
  assert.ok(plain > 0, `ordinary home games ${plain}, Gym Leader home games ${gymHome}`);
  // a matching-type starter still gets the field bonus on an elemental field (the mechanic is unchanged)
  const lu = (type) => Object.fromEntries(['QB', 'RB', 'WR1', 'WR2', 'TE', 'OL1', 'OL2'].map((s) => [s, { type }]));
  const s = R.newGame({ home: { name: 'A', offense: lu('Fire'), defense: {} }, away: { name: 'B', offense: {}, defense: {} }, seed: 3, venue: generatedVenue('Emberfall Infernos', ORDINARY[1], 'x') });
  assert.equal(s.venue.type, 'Fire', 'the engine reads the field type from the generated venue exactly as before');
});
