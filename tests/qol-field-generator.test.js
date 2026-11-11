// Franchise QoL update: the field generator. 65% grass / 35% elemental for ordinary games; bosses always on their element's field.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRASS_SHARE, ELEMENTAL_FIELDS, FIELD_BY_TYPE, UNMAPPED_BOSS_TYPES, bossOf, drawField, fieldFor, generatedVenue } from '../src/data/field-generator.js';
import { ENVIRONMENTS, WEATHER, stadiumFor, venueFor } from '../src/data/stadiums.js';
import { GYMS, isGymClub } from '../src/data/gyms.js';
import { ALL_TEAMS } from '../src/data/league.js';
import * as F from '../src/franchise/franchise.js';
import * as R from '../src/sim/rules.js';
import { newFranchise } from '../tools/franchise-soak.mjs';

const ORDINARY = ALL_TEAMS.filter((c) => !isGymClub(c));

test('ordinary games: about 65% grass and 35% elemental over a large deterministic sample, spread across every field', () => {
  assert.equal(GRASS_SHARE, 0.65); assert.deepEqual(ELEMENTAL_FIELDS, ['frozen', 'volcanic', 'forest', 'storm', 'desert', 'dome']);
  const count = {}; let n = 0;
  for (let seed = 1; seed <= 40; seed++) for (let year = 1; year <= 5; year++) for (let week = 1; week <= 12; week++) for (let i = 0; i < ORDINARY.length; i += 2) {
    const v = fieldFor(ORDINARY[i], ORDINARY[i + 1], `${seed}|${year}|${week}`); assert.equal(v.by, 'draw'); count[v.env] = (count[v.env] || 0) + 1; n++;
  }
  const grass = count.grass / n; assert.ok(Math.abs(grass - 0.65) < 0.02, `grass share ${grass.toFixed(4)} of ${n}`);
  for (const e of ELEMENTAL_FIELDS) { const share = count[e] / n; assert.ok(Math.abs(share - 0.35 / 6) < 0.012, `${e} share ${share.toFixed(4)}`); }
  assert.deepEqual(Object.keys(count).sort(), ['grass', ...ELEMENTAL_FIELDS].sort(), 'only implemented fields are drawn');
});

test('the same key always gives the same field, a different week can differ, and drawing uses no game dice', () => {
  for (let k = 0; k < 200; k++) assert.equal(drawField(`s|1|${k}`), drawField(`s|1|${k}`));
  assert.ok(new Set(Array.from({ length: 60 }, (_, k) => drawField(`9|2|${k}|A|B`))).size >= 4, 'fields vary from week to week');
  const f = newFranchise(77); const rng = JSON.stringify(f.rngState); const a = F.gameVenue(f, ORDINARY[0], ORDINARY[1]); const b = F.gameVenue(f, ORDINARY[0], ORDINARY[1]);
  assert.deepEqual(a, b); assert.equal(JSON.stringify(f.rngState), rng, 'the franchise dice did not move');
  const g = newFranchise(77); assert.deepEqual(F.gameVenue(g, ORDINARY[0], ORDINARY[1]), a, 'the same seed gives the same field');
});

test('bosses: every game involving a gym club uses the boss\'s element field where one exists, home or away, whatever the week', () => {
  assert.deepEqual(FIELD_BY_TYPE, { Ice: 'frozen', Fire: 'volcanic', Nature: 'forest', Electric: 'storm', Earth: 'desert', Metal: 'dome' });
  assert.deepEqual([...UNMAPPED_BOSS_TYPES].sort(), ['Dark', 'Dragon', 'Light', 'Water'], 'boss elements with no field: reported, not substituted');
  for (const g of GYMS) for (const other of ORDINARY) for (let week = 1; week <= 30; week++) for (const [home, away] of [[g.club, other], [other, g.club]]) {
    const v = generatedVenue(home, away, `5|1|${week}`);
    if (FIELD_BY_TYPE[g.element]) { assert.equal(v.type, g.element, `${g.club} (${g.element}) at ${home}`); assert.equal(v.env, FIELD_BY_TYPE[g.element]); assert.equal(v.fieldBy, 'boss'); }
    else { assert.equal(v.env, 'grass', `${g.club} (${g.element}) has no field: grass, never another element`); assert.equal(v.type, null); assert.equal(v.fieldBy, 'boss-unmapped'); }
    assert.equal(v.boss, g.club); assert.equal(v.name, stadiumFor(home).name, 'the stadium is still the home club\'s'); assert.ok(WEATHER[v.weather]); assert.ok(ENVIRONMENTS[v.env].weather[v.weather]);
  }
  assert.equal(bossOf('Thunder Mesa', 'Ironpeak Rams').club, 'Thunder Mesa', 'two bosses: the home boss\'s field'); assert.equal(generatedVenue('Thunder Mesa', 'Ironpeak Rams', 'k').env, 'storm');
  assert.equal(bossOf(ORDINARY[0], ORDINARY[1]), null);
});

test('overrides and the engine default are untouched: an owner override wins, and a game started without a venue still uses the home stadium', () => {
  const ov = { [ORDINARY[0]]: { name: 'New Yard', env: 'dome' } };
  for (let k = 0; k < 20; k++) { const v = generatedVenue(ORDINARY[0], ORDINARY[1], `o|${k}`, ov); assert.equal(v.env, 'dome'); assert.equal(v.fieldBy, 'override'); assert.equal(v.name, 'New Yard'); assert.equal(v.weather, 'indoor'); }
  assert.equal(venueFor('Ember City Beasts', 1).env, 'volcanic', 'stadiums.js venueFor is unchanged (direct engine games, tests, benchmarks)');
});

test('franchise: the preview field is the field the game is played on, field effects still apply, and a week still initialises and finishes', () => {
  let boss = 0, draw = 0, typed = 0;
  for (const seed of [11, 12, 13]) { const f = newFranchise(seed);
    for (let w = 0; w < 6 && !f.season.finished; w++) { F.autoRunToSunday(f); if (F.isBye(f)) { F.takeBye(f); continue; } const m = F.sundayMatchup(f); if (!m) break; if (m.forfeit) { F.forfeitSunday(f); continue; }
      const v = F.sundayVenue(f); const game = F.simulatePlayerGame(f); assert.ok(game.finished);
      assert.equal(game.venue.env, v.env); assert.equal(game.venue.type, v.type); assert.equal(game.venue.weather, v.weather); assert.equal(game.venue.fieldBy, v.fieldBy);
      const expectBoss = bossOf(v.home, v.away); if (expectBoss) { boss++; assert.equal(v.boss, expectBoss.club); if (FIELD_BY_TYPE[expectBoss.element]) assert.equal(v.type, expectBoss.element); } else { draw++; assert.equal(v.fieldBy, 'draw'); }
      if (v.type) typed++; F.finishSunday(f, game); } }
  assert.ok(boss > 0 && draw > 0, `boss games ${boss}, ordinary games ${draw}`); assert.ok(typed > 0, 'some games were on an elemental field');
  // a matching-type starter still gets the field bonus on a generated elemental field (the mechanic is unchanged)
  const lu = (type) => Object.fromEntries(['QB', 'RB', 'WR1', 'WR2', 'TE', 'OL1', 'OL2'].map((s) => [s, { type }]));
  const s = R.newGame({ home: { name: 'A', offense: lu('Fire'), defense: {} }, away: { name: 'B', offense: {}, defense: {} }, seed: 3, venue: generatedVenue(ORDINARY[0], ORDINARY[1], 'x', { [ORDINARY[0]]: { name: 'Pit', env: 'volcanic' } }) });
  assert.equal(s.venue.type, 'Fire', 'the engine reads the field type from the generated venue exactly as before');
});
