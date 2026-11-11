// Franchise QoL update: the field generator. Gym leaders always on their element's field; then overrides; then permanent
// elemental homes; the 65% grass / 35% elemental draw for what is left.
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
const GRASS_HOME = ORDINARY.filter((c) => STADIUMS[c].env === 'grass'); // the only homes that draw
const FIXED_HOME = ORDINARY.filter((c) => STADIUMS[c].env !== 'grass');
const REQUIRED = { 'Harbor Sentinels': 'tidal', 'Sunfire Lions': 'radiant', 'Eastport Phantoms': 'shadow', 'Palmetto Vipers': 'dragon', 'Thunder Mesa': 'storm', 'Canyon Crushers': 'desert', 'Frostpeak Howlers': 'frozen', 'Ironpeak Rams': 'dome' };

test('the draw (grass-stadium homes, no gym leader): about 65% grass and 35% elemental, spread across every elemental field', () => {
  assert.equal(GRASS_SHARE, 0.65); assert.deepEqual(ELEMENTAL_FIELDS, ['frozen', 'volcanic', 'forest', 'storm', 'desert', 'dome', 'tidal', 'radiant', 'shadow', 'dragon']);
  assert.ok(GRASS_HOME.length >= 2, 'some clubs have an ordinary grass stadium');
  const count = {}; let n = 0;
  for (let seed = 1; seed <= 60; seed++) for (let year = 1; year <= 5; year++) for (let week = 1; week <= 12; week++) for (const home of GRASS_HOME) for (const away of ORDINARY.filter((c) => c !== home).slice(0, 4)) {
    const v = fieldFor(home, away, `${seed}|${year}|${week}`); assert.equal(v.by, 'draw'); count[v.env] = (count[v.env] || 0) + 1; n++;
  }
  const grass = count.grass / n; assert.ok(Math.abs(grass - 0.65) < 0.02, `grass share ${grass.toFixed(4)} of ${n}`);
  for (const e of ELEMENTAL_FIELDS) { const share = count[e] / n; assert.ok(Math.abs(share - 0.035) < 0.008, `${e} share ${share.toFixed(4)}`); }
  assert.deepEqual(Object.keys(count).sort(), ['grass', ...ELEMENTAL_FIELDS].sort(), 'only implemented fields are drawn');
});

test('the same key always gives the same field, a different week can differ, and drawing uses no game dice', () => {
  for (let k = 0; k < 200; k++) assert.equal(drawField(`s|1|${k}`), drawField(`s|1|${k}`));
  assert.ok(new Set(Array.from({ length: 60 }, (_, k) => drawField(`9|2|${k}|A|B`))).size >= 4, 'fields vary from week to week');
  const f = newFranchise(77); const rng = JSON.stringify(f.rngState); const a = F.gameVenue(f, GRASS_HOME[0], ORDINARY[1]); const b = F.gameVenue(f, GRASS_HOME[0], ORDINARY[1]);
  assert.deepEqual(a, b); assert.equal(JSON.stringify(f.rngState), rng, 'the franchise dice did not move');
  const g = newFranchise(77); assert.deepEqual(F.gameVenue(g, GRASS_HOME[0], ORDINARY[1]), a, 'the same seed gives the same field');
});

test('gym leaders: all eight have their own field; every game against one uses it, home or away, over stadium settings and overrides', () => {
  assert.deepEqual(Object.fromEntries(GYMS.map((g) => [g.club, FIELD_BY_TYPE[g.element]])), REQUIRED);
  assert.deepEqual([...UNMAPPED_BOSS_TYPES], [], 'no gym is without a field');
  assert.deepEqual(Object.fromEntries(GYMS.map((g) => [g.club, ENVIRONMENTS[REQUIRED[g.club]].name])), { 'Harbor Sentinels': 'Tidal Arena', 'Sunfire Lions': 'Radiant Coliseum', 'Eastport Phantoms': 'Shadow Grounds', 'Palmetto Vipers': 'Dragon\'s Den', 'Thunder Mesa': 'Storm Stadium', 'Canyon Crushers': 'Desert Stadium', 'Frostpeak Howlers': 'Frozen Stadium', 'Ironpeak Rams': 'Metallic Dome' });
  for (const g of GYMS) { assert.equal(stadiumFor(g.club).env, REQUIRED[g.club], `${g.club}'s own stadium is its element's field`);
    for (const other of ORDINARY) for (let week = 1; week <= 12; week++) for (const [home, away] of [[g.club, other], [other, g.club]]) {
      const overrides = week % 3 === 0 ? { [home]: { name: 'Somewhere Else', env: 'volcanic' }, [away]: { name: 'Elsewhere', env: 'frozen' } } : null; // a saved override never beats a gym leader
      const v = generatedVenue(home, away, `5|1|${week}`, overrides);
      assert.equal(v.env, REQUIRED[g.club], `${g.club} at ${home}`); assert.equal(v.fieldBy, 'boss'); assert.equal(v.boss, g.club); assert.equal(fieldElement(v.env), g.element, 'never an unrelated element');
      assert.equal(v.name, stadiumFor(home, overrides).name, 'the stadium keeps the home club\'s name'); assert.ok(WEATHER[v.weather]); assert.ok(ENVIRONMENTS[v.env].weather[v.weather]);
    } }
  for (const a of GYMS) for (const b of GYMS) if (a !== b) { assert.equal(bossOf(a.club, b.club).club, a.club); assert.equal(generatedVenue(a.club, b.club, 'k').env, REQUIRED[a.club], 'two gym leaders: the home gym\'s field'); }
  assert.equal(bossOf(ORDINARY[0], ORDINARY[1]), null);
});

test('Dragon\'s Den is a look only: no type bonus anywhere in the engine path; Water, Light and Dark use the existing matching-type bonus', async () => {
  const { envMod, contestMod } = await import('../src/sim/type-matchups.js');
  assert.equal(ENVIRONMENTS.dragon.type, null); assert.equal(fieldElement('dragon'), 'Dragon');
  const v = generatedVenue('Palmetto Vipers', ORDINARY[0], 'k'); assert.equal(v.env, 'dragon'); assert.equal(v.type, null, 'the engine reads venue.type: nothing is favoured');
  assert.equal(envMod('Dragon', v.type), 0); assert.equal(contestMod('Dragon', 'Fire', v.type), contestMod('Dragon', 'Fire', null));
  for (const [env, type] of [['tidal', 'Water'], ['radiant', 'Light'], ['shadow', 'Dark']]) { assert.equal(ENVIRONMENTS[env].type, type); assert.equal(envMod(type, type), envMod('Fire', 'Fire'), 'the same bonus as the older fields, not a new one'); }
  for (const e of Object.values(ENVIRONMENTS)) assert.deepEqual(Object.keys(e).filter((k) => !['id', 'name', 'short', 'type', 'element', 'indoor', 'icon', 'texture', 'palette', 'blurb', 'weather'].includes(k)), [], `${e.id}: no hazard, status or ability field`);
});

test('priority below the gym rule: a saved override, then the permanent elemental home, then the draw; the engine default is untouched', () => {
  assert.ok(FIXED_HOME.includes('Ember City Beasts'));
  for (const home of FIXED_HOME) for (let k = 0; k < 30; k++) { const v = generatedVenue(home, GRASS_HOME[0], `p|${k}`); assert.equal(v.env, STADIUMS[home].env, `${home} keeps its stadium`); assert.equal(v.fieldBy, 'home'); }
  assert.equal(generatedVenue('Ember City Beasts', GRASS_HOME[0], 'x').env, 'volcanic'); assert.equal(generatedVenue('Glacier Guardians', GRASS_HOME[0], 'x').env, 'frozen'); assert.equal(generatedVenue('Stormport Bolts', GRASS_HOME[0], 'x').env, 'storm');
  for (const home of [FIXED_HOME[0], GRASS_HOME[0]]) { const ov = { [home]: { name: 'New Yard', env: 'dome' } };
    for (let k = 0; k < 20; k++) { const v = generatedVenue(home, GRASS_HOME[1], `o|${k}`, ov); assert.equal(v.env, 'dome'); assert.equal(v.fieldBy, 'override'); assert.equal(v.name, 'New Yard'); assert.equal(v.weather, 'indoor'); } }
  assert.equal(generatedVenue(GRASS_HOME[0], FIXED_HOME[0], 'x').fieldBy, 'draw', 'a visiting club\'s stadium does not travel');
  assert.equal(venueFor('Ember City Beasts', 1).env, 'volcanic', 'stadiums.js venueFor is unchanged (direct engine games, tests, benchmarks)');
});

test('franchise: the preview field is the field the game is played on, field effects still apply, and a week still initialises and finishes', () => {
  let boss = 0, draw = 0, typed = 0;
  for (const seed of [11, 12, 13]) { const f = newFranchise(seed);
    for (let w = 0; w < 6 && !f.season.finished; w++) { F.autoRunToSunday(f); if (F.isBye(f)) { F.takeBye(f); continue; } const m = F.sundayMatchup(f); if (!m) break; if (m.forfeit) { F.forfeitSunday(f); continue; }
      const v = F.sundayVenue(f); const game = F.simulatePlayerGame(f); assert.ok(game.finished);
      assert.equal(game.venue.env, v.env); assert.equal(game.venue.type, v.type); assert.equal(game.venue.weather, v.weather); assert.equal(game.venue.fieldBy, v.fieldBy);
      const expectBoss = bossOf(v.home, v.away); if (expectBoss) { boss++; assert.equal(v.boss, expectBoss.club); if (FIELD_BY_TYPE[expectBoss.element]) assert.equal(v.type, expectBoss.element); } else { draw++; assert.ok(['draw', 'home'].includes(v.fieldBy)); if (v.fieldBy === 'home') assert.equal(v.env, STADIUMS[v.home].env); }
      if (v.type) typed++; F.finishSunday(f, game); } }
  assert.ok(boss > 0 && draw > 0, `boss games ${boss}, ordinary games ${draw}`); assert.ok(typed > 0, 'some games were on an elemental field');
  // a matching-type starter still gets the field bonus on a generated elemental field (the mechanic is unchanged)
  const lu = (type) => Object.fromEntries(['QB', 'RB', 'WR1', 'WR2', 'TE', 'OL1', 'OL2'].map((s) => [s, { type }]));
  const s = R.newGame({ home: { name: 'A', offense: lu('Fire'), defense: {} }, away: { name: 'B', offense: {}, defense: {} }, seed: 3, venue: generatedVenue(ORDINARY[0], ORDINARY[1], 'x', { [ORDINARY[0]]: { name: 'Pit', env: 'volcanic' } }) });
  assert.equal(s.venue.type, 'Fire', 'the engine reads the field type from the generated venue exactly as before');
});
