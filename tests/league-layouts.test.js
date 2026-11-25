// League layouts (owner 2026-11-24): one rebuilding club in every division for new franchises; a save keeps the layout it was
// created in, so an existing league never reshuffles.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { LEAGUE_LAYOUTS, CURRENT_LAYOUT, CONFERENCES, REG_GAMES, layoutOf, useLeagueLayout, useLayoutOf, divisionIn, teamSchedule } from '../src/data/league.js';
import * as L from '../src/data/league.js';
import { isGymClub } from '../src/data/gyms.js';
import { MAP_PINS, mapPins, mapRegionAt } from '../src/ui/screens/league-hub.js';

const gymsIn = (layout, d) => LEAGUE_LAYOUTS[layout].divisions[d].filter(isGymClub);

test('layout 2: one rebuilding club in every division, never a Gym Leader, with a losing 14-game record', () => {
  assert.equal(CURRENT_LAYOUT, 2);
  const lay = LEAGUE_LAYOUTS[2];
  for (const d of Object.keys(lay.divisions)) assert.equal(lay.starters.filter((c) => divisionIn(2, c.name) === d).length, 1, `${d} has one starter club`);
  for (const c of lay.starters) {
    assert.equal(isGymClub(c.name), false, `${c.name} is not a Gym Leader`);
    const [w, l] = c.record.split('-').map(Number); assert.equal(w + l, REG_GAMES); assert.ok(w < l, `${c.name} finished below .500`);
  }
  assert.deepEqual(lay.starters.map((c) => c.name).sort(), ['Ashford Cinders', 'Bayou Stalkers', 'Mistport Veils', 'Mossvale Quakes', 'Northstar Novas', 'Palm Isle Mystics', 'Riverbend Rapids', 'Sundown Drakes']);
});

test('layout 2: two swaps spread the Gym Leaders, every division has one or two, six in each conference', () => {
  const [a, b] = [LEAGUE_LAYOUTS[1].divisions, LEAGUE_LAYOUTS[2].divisions];
  const moved = Object.keys(a).flatMap((d) => a[d].filter((c) => !b[d].includes(c))).sort();
  assert.deepEqual(moved, ['Canyon Crushers', 'Fernhaven Wisps', 'Pinecrest Wardens', 'Sunfire Solars']);
  assert.equal(divisionIn(2, 'Canyon Crushers'), 'Golden Valley'); assert.equal(divisionIn(2, 'Pinecrest Wardens'), 'Redrock');
  assert.equal(divisionIn(2, 'Sunfire Solars'), 'Greenheart'); assert.equal(divisionIn(2, 'Fernhaven Wisps'), 'Everwild');
  const counts = Object.keys(b).map((d) => gymsIn(2, d).length);
  assert.ok(counts.every((n) => n === 1 || n === 2), counts.join(','));
  assert.equal(counts.filter((n) => n === 2).length, 4);
  for (const divs of Object.values(CONFERENCES)) assert.equal(divs.reduce((s, d) => s + gymsIn(2, d).length, 0), 6);
  for (const d of Object.keys(b)) assert.equal(b[d].length, 4);
});

test('layout 1 is the league as it was: two starter divisions without a Gym Leader', () => {
  const lay = LEAGUE_LAYOUTS[1];
  assert.deepEqual(lay.divisions['Golden Valley'], ['Goldhaven Royals', 'Riverbend Rapids', 'Pinecrest Wardens', 'Skyvale Cyclones']);
  assert.deepEqual(lay.divisions.Greenheart, ['Thornwood Wildroots', 'Silvergrove Arcanists', 'Mossvale Quakes', 'Fernhaven Wisps']);
  for (const d of Object.keys(lay.divisions)) assert.equal(gymsIn(1, d).length, ['Golden Valley', 'Greenheart'].includes(d) ? 0 : 2, d);
  assert.deepEqual(lay.starters.map((c) => divisionIn(1, c.name)).sort(), [...Array(4).fill('Golden Valley'), ...Array(4).fill('Greenheart')]);
});

test('switching the layout moves every view of the league with it', () => {
  try {
    useLeagueLayout(1);
    assert.deepEqual(L.STARTER_DIVISIONS, ['Golden Valley', 'Greenheart']); assert.equal(L.divisionOf('Canyon Crushers'), 'Redrock');
    assert.equal(L.STARTER_CLUBS.length, 8); assert.equal(L.ALL_TEAMS.length, 32);
    const s1 = teamSchedule(1, 'Goldhaven Royals', 9).filter((g) => !g.bye && g.category === 'Division').map((g) => g.opponent);
    assert.ok(s1.includes('Pinecrest Wardens') && !s1.includes('Canyon Crushers'));
    useLeagueLayout(2);
    assert.equal(L.STARTER_DIVISIONS.length, 8); assert.equal(L.divisionOf('Canyon Crushers'), 'Golden Valley');
    const s2 = teamSchedule(1, 'Goldhaven Royals', 9).filter((g) => !g.bye && g.category === 'Division').map((g) => g.opponent);
    assert.ok(s2.includes('Canyon Crushers') && !s2.includes('Pinecrest Wardens'), 'the schedule is not served from the other layout');
  } finally { useLeagueLayout(CURRENT_LAYOUT); }
});

test('a new franchise is created in layout 2 and keeps it through a save and a load', () => {
  const f = F.createFranchise({ owner: { first: 'L', last: 'Two' }, club: 'Mistport Veils', seed: 41 });
  assert.equal(f.leagueLayout, 2); assert.equal(layoutOf(f), 2);
  assert.ok(['Aetheria Seers', 'Deepwater Chompers', 'Westhaven Pirates'].includes(f.rivals.challenger.team), 'the rival is a division club');
  const back = Save.importJson(Save.exportJson(f)); assert.equal(back.leagueLayout, 2);
  assert.deepEqual(back.season.schedule, f.season.schedule);
});

test('an existing save keeps its own league: no layout means layout 1, and reading it does not move the league in play', () => {
  useLeagueLayout(CURRENT_LAYOUT);
  const old = Save.importJson(readFileSync(new URL('./fixtures/save-v10-season2.json', import.meta.url), 'utf8'));
  assert.equal(old.leagueLayout, undefined); assert.equal(layoutOf(old), 1);
  assert.equal(L.ACTIVE_LAYOUT, CURRENT_LAYOUT, 'reading a save puts the active layout back');
  try {
    useLayoutOf(old);
    assert.deepEqual(L.DIVISIONS['Golden Valley'], LEAGUE_LAYOUTS[1].divisions['Golden Valley']);
    const div = old.season.schedule.filter((g) => !g.bye && g.category === 'Division').map((g) => g.opponent);
    for (const c of div) assert.ok(LEAGUE_LAYOUTS[1].divisions['Golden Valley'].includes(c), `${c} is a layout-1 division rival`);
    assert.ok(Object.values(old.season.records).length === 32);
    assert.ok(F.leagueStandings(old).divisions['Golden Valley'].includes('Pinecrest Wardens'));
  } finally { useLeagueLayout(CURRENT_LAYOUT); }
});

test('the map: in either layout every club stands inside its own region', () => {
  for (const layout of [1, 2]) {
    const pins = mapPins(layout);
    assert.deepEqual(Object.keys(pins).sort(), Object.keys(MAP_PINS).sort());
    for (const [club, [x, y]] of Object.entries(pins)) assert.equal(mapRegionAt(x, y), divisionIn(layout, club), `layout ${layout}: ${club}`);
  }
});

test('the past is the same in every layout: the archive is played in layout 1, and a layout-2 franchise\'s starters carry their picker records', async () => {
  const H = await import('../src/franchise/preleague-history.js');
  const canon = ['Skyvale Cyclones', 'Thornwood Wildroots', 'Skyvale Cyclones', 'Stormport Bolts', 'Stormport Bolts', 'Aetheria Seers', 'Harbor Anchors', 'Frostpeak Howlers'];
  try { useLeagueLayout(1); assert.deepEqual(H.generateLeagueArchive({ seed: 8, club: 'Riverbend Rapids' }).seasons.map((s) => s.champion), canon); } finally { useLeagueLayout(CURRENT_LAYOUT); }
  const f = F.createFranchise({ owner: { first: 'A', last: 'R' }, club: 'Sundown Drakes', seed: 8 }); const a = f.preLeagueHistory;
  assert.deepEqual(a.seasons.map((s) => s.champion), canon); assert.deepEqual(H.validateLeagueArchive(a), []);
  assert.deepEqual(a.seasons[0].divisions['Golden Valley'].slice().sort(), [...LEAGUE_LAYOUTS[1].divisions['Golden Valley']].sort(), 'the archive keeps the old divisions');
  const y0 = a.seasons[a.seasons.length - 1].standings;
  for (const c of LEAGUE_LAYOUTS[2].starters) { const r = y0.find((x) => x.club === c.name); assert.equal(`${r.w}-${r.l}`, c.record, c.name); }
  assert.equal(L.ACTIVE_LAYOUT, CURRENT_LAYOUT, 'generating the archive puts the layout back');
});
