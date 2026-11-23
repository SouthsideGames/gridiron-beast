// The region map (owner 2026-11-23): every club on it once, on its own region's land, the owner's club and this week's games marked.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import { ALL_TEAMS, DIVISIONS, divisionOf } from '../src/data/league.js';
import { GYM_BY_CLUB } from '../src/data/gyms.js';
import { MAP_PINS, regionMapSvg, mapWeekGames, mapLit } from '../src/ui/screens/league-hub.js';

const fresh = () => { const f = F.createFranchise({ owner: { first: 'Map', last: 'Test' }, club: 'Riverbend Rapids', seed: 612 }); F.hireDefaultStaff(f); return f; };

test('all 32 clubs have a place on the map, none crowding another', () => {
  assert.deepEqual(Object.keys(MAP_PINS).sort(), [...ALL_TEAMS].sort());
  const e = Object.entries(MAP_PINS);
  for (let i = 0; i < e.length; i++) for (let j = i + 1; j < e.length; j++) {
    const d = Math.hypot(e[i][1][0] - e[j][1][0], e[i][1][1] - e[j][1][1]);
    assert.ok(d >= 40, `${e[i][0]} and ${e[j][0]} are ${d.toFixed(0)} apart`);
  }
});
test('each division sits in its own band: Veyra west, Koruun east, north to south in league order', () => {
  const west = ['Frostlands', 'Redrock', 'Golden Valley', 'Suncoast'], east = ['Kingsport', 'Greenheart', 'Everwild', 'Azure Isles'];
  for (const [side, divs] of [[(x) => x < 200, west], [(x) => x > 200, east]]) {
    let prevMax = -Infinity;
    for (const d of divs) { const ys = DIVISIONS[d].map((c) => MAP_PINS[c][1]); for (const c of DIVISIONS[d]) assert.ok(side(MAP_PINS[c][0]), `${c} on the wrong landmass`);
      assert.ok(Math.min(...ys) > prevMax, `${d} overlaps the region north of it`); prevMax = Math.max(...ys); }
  }
});
test('the map marks the owner, the Gym Leaders, held badges and this week\'s games', () => {
  const f = fresh(); (f.campaign.badges ||= {})['Harbor Anchors'] = { year: f.season.year, week: 1 };
  const svg = regionMapSvg(f, { mode: 'week' });
  assert.equal((svg.match(/class="map-pin/g) || []).length, 32);
  assert.match(svg, /class="map-pin me[^"]*" data-action="mapclub" data-club="Riverbend Rapids"/);
  const games = mapWeekGames(f); assert.equal(games.length, 16);
  assert.equal((svg.match(/class="map-route[ "]/g) || []).length, 16); assert.equal((svg.match(/class="map-route mine"/g) || []).length, 1);
  assert.equal((svg.match(/fill="#ffd34d"/g) || []).length, 1, 'one gold badge star');
  const gyms = mapLit(f, 'gyms'); assert.equal(gyms.size, Object.keys(GYM_BY_CLUB).length + 1);
  assert.deepEqual([...mapLit(f, 'division')].sort(), [...DIVISIONS[divisionOf(f.club)]].sort());
});
test('no games are drawn in the offseason', () => {
  const f = fresh(); f.season.finished = true; assert.deepEqual(mapWeekGames(f), []);
  assert.doesNotMatch(regionMapSvg(f, { mode: 'week' }), /class="map-route[ "]/);
});
