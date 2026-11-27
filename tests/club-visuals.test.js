// Club visual identity (owner ruling 2026-11-23, second set): logos, uniforms and home-field branding for all 32 clubs, checked on
// the game's own drawing code (team-logo.js, team-kit.js, sprite16.js, field-view.js, field-branding.js, stadium-fx.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_TEAMS, TEAM_META, DIVISIONS } from '../src/data/league.js';
import { CLUB_NAMES, endZoneNames, BADGES, REGIONS, regionOf, CLUBS_BY_DIVISION } from '../src/data/club-identity.js';
import { teamLogo, logoBody, logoColors, EMBLEMS, teamLogoSymbol } from '../src/ui/team-logo.js';
import { teamKits, gameKits, kitsApart, kitJersey } from '../src/ui/team-kit.js';
import { spriteGrid, kitGrid, sprite16Body } from '../src/ui/sprite16.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { fieldSvg } from '../src/ui/field-view.js';
import { fieldBrand, LOGO_YARDS } from '../src/ui/field-branding.js';
import { venueFor, STADIUMS, ENVIRONMENTS } from '../src/data/stadiums.js';
import { GYMS, isGymClub } from '../src/data/gyms.js';
import { setStadiumScene, venueLook, lookFor, LOOKS } from '../src/ui/stadium-fx.js';

const WORDS = {
  'Frostpeak Howlers': ['FROSTPEAK', 'HOWLERS'], 'Glacier Guardians': ['GLACIER', 'GUARDIANS'], 'Northstar Novas': ['NORTHSTAR', 'NOVAS'], 'Ironpeak Colossi': ['IRONPEAK', 'COLOSSI'],
  'Stormport Bolts': ['STORMPORT', 'BOLTS'], 'Canyon Crushers': ['CANYON', 'CRUSHERS'], 'Sundown Drakes': ['SUNDOWN', 'DRAKES'], 'Thunder Mesa Blitz': ['THUNDER MESA', 'BLITZ'],
  'Goldhaven Royals': ['GOLDHAVEN', 'ROYALS'], 'Riverbend Rapids': ['RIVERBEND', 'RAPIDS'], 'Pinecrest Wardens': ['PINECREST', 'WARDENS'], 'Skyvale Cyclones': ['SKYVALE', 'CYCLONES'],
  'Emberfall Infernos': ['EMBERFALL', 'INFERNOS'], 'Coral Bay Tides': ['CORAL BAY', 'TIDES'], 'Cliffhaven Chargers': ['CLIFFHAVEN', 'CHARGERS'], 'Palm Isle Mystics': ['PALM ISLE', 'MYSTICS'],
  'Stonehaven Bastions': ['STONEHAVEN', 'BASTIONS'], 'Eastport Phantoms': ['EASTPORT', 'PHANTOMS'], 'Harbor Anchors': ['HARBOR', 'ANCHORS'], 'Ashford Cinders': ['ASHFORD', 'CINDERS'],
  'Ember City Beasts': ['EMBER CITY', 'BEASTS'], 'Bayou Stalkers': ['BAYOU', 'STALKERS'], 'Sunfire Solars': ['SUNFIRE', 'SOLARS'], 'Palmetto Wyrms': ['PALMETTO', 'WYRMS'],
  'Thornwood Wildroots': ['THORNWOOD', 'WILDROOTS'], 'Silvergrove Arcanists': ['SILVERGROVE', 'ARCANISTS'], 'Mossvale Quakes': ['MOSSVALE', 'QUAKES'], 'Fernhaven Wisps': ['FERNHAVEN', 'WISPS'],
  'Aetheria Seers': ['AETHERIA', 'SEERS'], 'Deepwater Chompers': ['DEEPWATER', 'CHOMPERS'], 'Mistport Veils': ['MISTPORT', 'VEILS'], 'Westhaven Pirates': ['WESTHAVEN', 'PIRATES'],
};
const whole = (club, extra = {}) => { const venue = { ...venueFor(club, 'test'), weather: 'clear' }; return { venue, svg: fieldSvg({ venue, camera: { bottom: -12, top: 122 }, ballOn: 25, homeOnOffense: true, ...extra }) }; };

test('32 logos: every club has one, in its approved colours, with its own emblem; no two share an emblem', () => {
  assert.equal(ALL_TEAMS.length, 32); assert.equal(EMBLEMS.length, 32);
  assert.equal(new Set(ALL_TEAMS.map((c) => TEAM_META[c].mascot)).size, 32, 'one mascot per club');
  for (const c of ALL_TEAMS) assert.ok(EMBLEMS.includes(TEAM_META[c].mascot), `${c}: emblem drawn`);
  const bodies = new Set();
  for (const c of ALL_TEAMS) {
    const m = TEAM_META[c]; const svg = teamLogo(c, 40); const body = logoBody(c); bodies.add(body);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 100 100"/); assert.ok(svg.includes(`aria-label="${c} logo"`));
    for (const hex of [m.color, m.secondary, m.accent]) assert.ok(body.includes(hex), `${c}: uses ${hex}`);
    const k = logoColors(c); for (const x of [k.P, k.A, k.S, k.R]) assert.ok([m.color, m.secondary, m.accent].includes(x), `${c}: only approved colours (${x})`);
    assert.ok(BADGES[c], `${c}: badge shape`); assert.equal(teamLogoSymbol(c).id, `tl-${m.abbr}`);
  }
  assert.equal(bodies.size, 32, 'no two logos are the same drawing');
  for (const { division, clubs } of CLUBS_BY_DIVISION) { const shapes = clubs.map((c) => BADGES[c]); assert.ok(new Set(shapes).size >= 3, `${division}: badge shapes vary (${shapes})`); }
});

test('64 end-zone words: place and nickname from the canonical table, multiword places kept whole', () => {
  assert.deepEqual(Object.keys(CLUB_NAMES).sort(), [...ALL_TEAMS].sort());
  for (const c of ALL_TEAMS) { const n = endZoneNames(c); assert.deepEqual([n.place, n.nickname], WORDS[c], c); assert.equal(`${CLUB_NAMES[c][0]} ${CLUB_NAMES[c][1]}`, c, `${c}: the two words are the club's name`); }
  assert.equal(new Set(ALL_TEAMS.flatMap((c) => WORDS[c])).size, 64, 'all 64 words distinct');
  assert.equal(endZoneNames('Somewhere Else'), null);
});

test('every home field: its logo at midfield, place and nickname in the end zones; Gym Leader fields keep their surface, the others are grass in club colours', () => {
  const gyms = new Set(GYMS.map((g) => g.club)); assert.equal(gyms.size, 12);
  for (const c of ALL_TEAMS) {
    const { venue, svg } = whole(c); const b = fieldBrand(venue);
    assert.equal(venue.club, c); assert.equal(b.club, c);
    assert.ok(svg.includes(`class="mid-brand" data-club="${c}"`), `${c}: logo at midfield`); assert.ok(svg.includes(`href="#tl-${TEAM_META[c].abbr}"`) && svg.includes(`<symbol id="tl-${TEAM_META[c].abbr}"`));
    const words = [...svg.matchAll(/data-ez="(\w+)" data-word="([^"]+)"/g)].map((m) => [m[1], m[2]]);
    assert.deepEqual(words, [['place', WORDS[c][0]], ['nickname', WORDS[c][1]]], `${c}: both end zones`);
    if (gyms.has(c)) {
      assert.notEqual(venue.env, 'grass', `${c}: elemental field`); assert.equal(STADIUMS[c].env, venue.env); assert.equal(b.gym, true); assert.equal(b.ends.place.fill, null, 'no paint over a Gym Leader\'s end zone');
      const env = ENVIRONMENTS[venue.env]; assert.ok(svg.includes(`fill="${env.palette.a}"`), `${c}: its own turf`); assert.ok(svg.includes(`fill="${env.palette.end}"`) || venue.variant, `${c}: its own end zones`);
      assert.ok(!svg.includes('class="home-edge"'), 'no grass-field dressing on a Gym Leader field');
    } else {
      assert.equal(venue.env, 'grass', `${c}: grass`); assert.equal(b.gym, false); assert.ok(svg.includes(`fill="${ENVIRONMENTS.grass.palette.a}"`), 'ordinary grass surface');
      assert.equal(b.ends.nickname.fill, TEAM_META[c].secondary); assert.ok(b.ends.place.fill, 'end zone in club colours');
      assert.ok(!svg.includes('class="home-edge"'), `${c}: no sideline markers on home grass (owner play test 2026-11-26)`);
    }
  }
});

test('the home club owns the field whoever has the ball, in regular-season and playoff games; the visitors never repaint it', () => {
  const club = 'Ember City Beasts';
  const a = whole(club, { homeOnOffense: true }).svg, b = whole(club, { homeOnOffense: false }).svg, p = whole(club, { event: 'playoff' }).svg;
  const near = (svg) => [...svg.matchAll(/data-word="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(near(a), ['EMBER CITY', 'BEASTS']); assert.deepEqual(near(b), ['BEASTS', 'EMBER CITY'], 'the home club defends the same end zone: it is near when it has the ball');
  for (const s of [a, b, p]) { assert.ok(s.includes('data-club="Ember City Beasts"')); assert.ok(!s.includes('tl-HAR'), 'no visitor logo'); }
  assert.ok(p.includes('stroke="#f5c542"'), 'a playoff game rings the logo in gold');
});

test('branding sits under the yard lines and needs no stadium scene, so it shows at every Stadium Effects level', () => {
  const venue = { ...venueFor('Glacier Guardians', 't'), weather: 'clear' };
  setStadiumScene(null); const plain = fieldSvg({ venue, camera: { bottom: 40, top: 86 }, ballOn: 50 });
  setStadiumScene(venue, null); const scene = fieldSvg({ venue, camera: { bottom: 40, top: 86 }, ballOn: 50 }); setStadiumScene(null);
  for (const s of [plain, scene]) { const logo = s.indexOf('class="mid-brand"'), line = s.indexOf('stroke="#eaf3e6"'); /* the yard lines */ assert.ok(logo > 0 && line > logo, 'logo drawn before the yard lines'); }
  assert.equal(LOGO_YARDS, 14);
});

test('uniforms: home, away and alternate kits in approved colours; every one of the 992 pairings is told apart', () => {
  let alts = 0;
  for (const c of ALL_TEAMS) { const K = teamKits(c); const m = TEAM_META[c]; const ok = [m.color, m.secondary, m.accent];
    for (const k of [K.home, K.away, K.alt]) { assert.ok(ok.includes(k.jersey) && ok.includes(k.trim) && ok.includes(k.base), `${c} ${k.kind}`); assert.notEqual(k.jersey, k.trim); }
    assert.equal(K.home.jersey, m.color); assert.equal(K.away.jersey, m.accent); assert.notEqual(K.home.jersey, K.away.jersey, 'home and away differ');
    assert.ok(kitJersey(K.home).includes(`data-club="${c}"`) || kitJersey(K.home).includes(logoBody(c).slice(0, 40)), 'the crest is on the shirt'); }
  for (const a of ALL_TEAMS) for (const b of ALL_TEAMS) { if (a === b) continue; const k = gameKits(a, b); assert.equal(k.home.kind, 'home'); assert.ok(kitsApart(k.home, k.away), `${a} v ${b}`); if (k.away.kind !== 'away') alts++; }
  assert.ok(alts > 0 && alts < 200, `${alts} pairings change the visitors' kit`);
});

test('a uniform never changes a monster\'s silhouette, outline or face: only body pixels in one band change colour', () => {
  const kit = teamKits('Stormport Bolts').home;
  for (const sp of SPECIES_DEX.filter((_, i) => i % 7 === 0)) {
    const g = spriteGrid(sp), k = kitGrid(g, kit); let changed = 0;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const a = g[y][x], b = k[y][x];
      assert.equal(!!a, !!b, `${sp.id}: same filled pixels`);
      if (a !== b) { changed++; assert.ok(['M', 'Ml', 'Md', 'B', 'A', 'Al', 'Ad', 'G'].includes(a), `${sp.id}: only body pixels recoloured (${a})`); assert.match(b, /^[JT][ld]?$/); }
      else if (['O', 'E', 'H', 'K', 'W', 'Wd'].includes(a)) assert.equal(b, a); }
    assert.ok(changed > 0, `${sp.id}: the kit shows`);
    assert.notEqual(sprite16Body(sp, { kit }), sprite16Body(sp), 'kit and plain sprites are different drawings'); assert.equal(sprite16Body(sp, { kit }), sprite16Body(sp, { kit }), 'and cached');
  }
});

test('the twenty grass stadiums are dressed by region and club; the twelve Gym Leader looks are unchanged', () => {
  assert.equal(Object.keys(REGIONS).length, 8); assert.deepEqual(Object.keys(REGIONS).sort(), Object.keys(DIVISIONS).sort());
  const grass = ALL_TEAMS.filter((c) => !isGymClub(c)); assert.equal(grass.length, 20);
  for (const c of grass) { const L = venueLook({ club: c, env: 'grass' }); assert.deepEqual(L.colors, [TEAM_META[c].color, TEAM_META[c].secondary, TEAM_META[c].accent]); assert.equal(L.region, regionOf(c)); assert.ok(L.banner); }
  for (const c of ALL_TEAMS.filter(isGymClub)) { const env = STADIUMS[c].env; assert.equal(venueLook({ club: c, env }), lookFor(env), `${c}: approved look untouched`); }
  // within a division, clubs on grass are told apart by more than colour: logo, badge and banner pattern
  for (const [d, clubs] of Object.entries(DIVISIONS)) { const g = clubs.filter((c) => !isGymClub(c)); if (g.length < 2) continue; assert.ok(new Set(g.map((c) => BADGES[c])).size === g.length || new Set(g.map((c) => venueLook({ club: c, env: 'grass' }).banner)).size > 1, d); }
  assert.ok(LOOKS.grass.plain);
});
