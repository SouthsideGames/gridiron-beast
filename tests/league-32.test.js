// The 32-club league (owner specification, 2026-11-23): structure, starter divisions, the twelve Gym Leaders, the two Gym Leaders
// who changed clubs, the 14-game seeded schedule, the playoff field, badges that follow the coach, and saves from the old league.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAYOFF_SEEDS, WILD_CARDS, CONFERENCE_ROUND, FINAL_ROUND, playoffByes, legacyPlayoffRound, contrastOnPanel } from '../src/data/league.js';
import { runFranchise, newFranchise } from '../tools/franchise-soak.mjs';
import { CONFERENCES, CONFERENCE_NAMES, DIVISIONS, STARTER_DIVISIONS, STARTER_CLUBS, ALL_TEAMS, TEAM_META, RIVAL_GMS, REG_GAMES, REG_WEEKS, PLAYOFF_ROUNDS, LAST_WEEK, SCHEDULE_MIX,
  divisionOf, conferenceOf, conferenceFor, leagueSeasonFixtures, teamSchedule, blankRecord, applyResult, standings, playoffRound } from '../src/data/league.js';
import { GYMS, GYM_BY_CLUB, isGymClub, FREE_LEGENDARIES } from '../src/data/gyms.js';
import { STADIUMS, stadiumFor, fieldElement } from '../src/data/stadiums.js';
import { GYM_LINES } from '../src/data/dialogue.js';
import { IDENTITIES } from '../src/data/identities.js';
import { SPECIES_BY_ID } from '../src/data/monsters.js';
import { headCoachName } from '../src/franchise/awards.js';
import * as F from '../src/franchise/franchise.js';
import * as GM from '../src/franchise/gm-career.js';
import * as Save from '../src/franchise/save.js';
import { TRADE_DEADLINE_WEEK } from '../src/franchise/trade-window.js';

const SPEC = {
  Veyra: { Frostlands: ['Frostpeak Howlers', 'Glacier Guardians', 'Northstar Novas', 'Ironpeak Colossi'], Redrock: ['Stormport Bolts', 'Canyon Crushers', 'Sundown Drakes', 'Thunder Mesa Blitz'],
    'Golden Valley': ['Goldhaven Royals', 'Riverbend Rapids', 'Pinecrest Wardens', 'Skyvale Cyclones'], Suncoast: ['Emberfall Infernos', 'Coral Bay Tides', 'Cliffhaven Chargers', 'Palm Isle Mystics'] },
  Koruun: { Kingsport: ['Stonehaven Bastions', 'Eastport Phantoms', 'Harbor Anchors', 'Ashford Cinders'], Everwild: ['Ember City Beasts', 'Bayou Stalkers', 'Sunfire Solars', 'Palmetto Wyrms'],
    Greenheart: ['Thornwood Wildroots', 'Silvergrove Arcanists', 'Mossvale Quakes', 'Fernhaven Wisps'], 'Azure Isles': ['Aetheria Seers', 'Deepwater Chompers', 'Mistport Veils', 'Westhaven Pirates'] },
};
// club: [leader, type, badge, legendary as the game shows it]
const LEADERS = { 'Frostpeak Howlers': ['Sigrid Hale', 'Ice', 'Frost Badge', 'Glacivern'], 'Ironpeak Colossi': ['Brock Ferris', 'Metal', 'Forge Badge', 'Aegistron'], 'Canyon Crushers': ['Dolores Crag', 'Earth', 'Quake Badge', 'Titanolith'], 'Thunder Mesa Blitz': ['Lena Volkov', 'Electric', 'Storm Badge', 'Voltarch'],
  'Emberfall Infernos': ['Kael Ember', 'Fire', 'Blaze Badge', 'Pyroclast'], 'Cliffhaven Chargers': ['Aria Gale', 'Wind', 'Gale Badge', 'Tempestra'], 'Eastport Phantoms': ['Silas Mourne', 'Dark', 'Dusk Badge', 'Nyxshade'], 'Harbor Anchors': ['Nadia Reyes', 'Water', 'Tide Badge', 'Tsunarok'],
  'Sunfire Solars': ['Elias Dawn', 'Light', 'Dawn Badge', 'Aurelion'], 'Palmetto Wyrms': ['Marcus Vane', 'Dragon', 'Wyrm Badge', 'Aurodrax'], 'Aetheria Seers': ['Lyra Vesper', 'Psychic', 'Mind Badge', 'Astralux'], 'Westhaven Pirates': ['Rowan Thorne', 'Nature', 'Grove Badge', 'Elderoot'] };

test('the league: 32 clubs in two conferences of four divisions of four, with the names of the specification', () => {
  assert.deepEqual(CONFERENCE_NAMES, ['Veyra', 'Koruun']);
  for (const [conf, divs] of Object.entries(SPEC)) { assert.deepEqual(CONFERENCES[conf], Object.keys(divs)); for (const [d, clubs] of Object.entries(divs)) { assert.deepEqual(DIVISIONS[d], clubs, d); assert.equal(conferenceFor(d), conf); for (const c of clubs) { assert.equal(divisionOf(c), d); assert.equal(conferenceOf(c), conf); } } }
  assert.equal(ALL_TEAMS.length, 32); assert.equal(new Set(ALL_TEAMS).size, 32); assert.equal(Object.keys(DIVISIONS).length, 8);
  for (const c of ALL_TEAMS) { const m = TEAM_META[c]; assert.ok(m, c); assert.match(m.abbr, /^[A-Z]{3}$/); assert.match(m.color, /^#[0-9a-f]{6}$/i); assert.ok(STADIUMS[c], `${c} stadium`); assert.ok(IDENTITIES[c], `${c} identity`); assert.ok(RIVAL_GMS[c], `${c} general manager`); }
  assert.equal(new Set(ALL_TEAMS.map((c) => TEAM_META[c].abbr)).size, 32, 'every abbreviation is its own'); assert.equal(new Set(Object.values(RIVAL_GMS)).size, 32, 'no general manager runs two clubs');
  assert.equal(new Set(ALL_TEAMS.map((c) => stadiumFor(c).name)).size, 32, 'every stadium name is its own');
});

test('the starter divisions: Golden Valley and Greenheart, eight clubs to choose from, no Gym Leader in either, rebuilding but not handicapped', () => {
  assert.deepEqual(STARTER_DIVISIONS, ['Golden Valley', 'Greenheart']);
  assert.deepEqual(STARTER_CLUBS.map((c) => c.name).sort(), [...DIVISIONS['Golden Valley'], ...DIVISIONS.Greenheart].sort());
  for (const c of STARTER_CLUBS) { assert.equal(isGymClub(c.name), false, `${c.name} has no Gym Leader`); const [w, l] = c.record.split('-').map(Number); assert.equal(w + l, REG_GAMES); assert.ok(w < l, `${c.name} is rebuilding`); assert.equal(stadiumFor(c.name).env, 'grass'); }
  for (const c of STARTER_CLUBS) { const f = F.createFranchise({ owner: { first: 'S', last: 'T' }, club: c.name, seed: 5 }); assert.equal(f.club, c.name); assert.equal(f.leagueFormat, 32); assert.equal(f.season.schedule.filter((g) => !g.bye).length, REG_GAMES);
    assert.ok(DIVISIONS[divisionOf(c.name)].includes(f.rivals[f.tier].team), 'the rival is a division rival'); assert.equal(isGymClub(f.rivals[f.tier].team), false); }
  // No permanent artificial disadvantage: a starter club's level is set like any ordinary club's, by the same function, with no penalty of its own.
  const f = F.createFranchise({ owner: { first: 'S', last: 'T' }, club: 'Goldhaven Royals', seed: 5 }); const q = (c) => F.clubQuality(f, c, 1);
  const startersQ = STARTER_CLUBS.map((c) => c.name).filter((c) => c !== f.club).map(q); const ordinaryQ = ALL_TEAMS.filter((c) => !isGymClub(c) && !STARTER_CLUBS.some((s) => s.name === c)).map(q); const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  assert.ok(Math.abs(avg(startersQ) - avg(ordinaryQ)) < 4, `starter clubs ${avg(startersQ).toFixed(1)} against other ordinary clubs ${avg(ordinaryQ).toFixed(1)}`);
});

test('twelve Gym Leaders, one per monster type, two in each of the six competitive divisions, each with its badge, legendary, field and lines', () => {
  assert.equal(GYMS.length, 12); assert.deepEqual(GYMS.map((g) => g.club).sort(), Object.keys(LEADERS).sort());
  assert.deepEqual(GYMS.map((g) => g.element).sort(), ['Dark', 'Dragon', 'Earth', 'Electric', 'Fire', 'Ice', 'Light', 'Metal', 'Nature', 'Psychic', 'Water', 'Wind']);
  for (const g of GYMS) { const [leader, type, badge, legendary] = LEADERS[g.club]; assert.equal(g.coach.name, leader); assert.equal(g.element, type); assert.equal(g.badge, badge); assert.equal(SPECIES_BY_ID[g.legendary].name, legendary, `${g.club}'s legendary`); assert.equal(SPECIES_BY_ID[g.legendary].element, type);
    assert.equal(fieldElement(stadiumFor(g.club).env), type); assert.equal(headCoachName(g.club), leader); assert.notEqual(RIVAL_GMS[g.club], leader, 'the general manager is another person');
    const lines = GYM_LINES[g.club]; assert.ok(lines, `${g.club} has its lines`); for (const k of ['first', 'theyWon', 'youWon', 'badgeHeld', 'beaten']) assert.ok(lines[k]?.length >= 1 && lines[k].every((x) => typeof x === 'string' && x.length > 8), `${g.club} ${k}`); }
  assert.equal(new Set(GYMS.map((g) => g.badge)).size, 12); assert.equal(new Set(GYMS.map((g) => g.legendary)).size, 12); assert.equal(new Set(GYMS.map((g) => g.coach.name)).size, 12);
  for (const [d, clubs] of Object.entries(DIVISIONS)) assert.equal(clubs.filter(isGymClub).length, STARTER_DIVISIONS.includes(d) ? 0 : 2, `${d}`);
  for (const c of CONFERENCE_NAMES) assert.equal(GYMS.filter((g) => conferenceOf(g.club) === c).length, 6, `${c}: six badges`);
  // the original eight keep their identities
  for (const [club, leader] of [['Frostpeak Howlers', 'Sigrid Hale'], ['Ironpeak Colossi', 'Brock Ferris'], ['Canyon Crushers', 'Dolores Crag'], ['Thunder Mesa Blitz', 'Lena Volkov'], ['Eastport Phantoms', 'Silas Mourne'], ['Harbor Anchors', 'Nadia Reyes'], ['Sunfire Solars', 'Elias Dawn'], ['Palmetto Wyrms', 'Marcus Vane']]) assert.equal(GYM_BY_CLUB[club].coach.name, leader);
  assert.deepEqual([...FREE_LEGENDARIES], [], 'no legendary is free to track: all twelve need their badge (owner, 2026-11-23)');
});

test('Aria Gale and Rowan Thorne changed clubs: one head coach per club, Rook Tanner is still Cliffhaven\'s general manager, the old clubs keep their stadiums', () => {
  const aria = GYM_BY_CLUB['Cliffhaven Chargers'], rowan = GYM_BY_CLUB['Westhaven Pirates'];
  assert.equal(aria.coach.name, 'Aria Gale'); assert.equal(aria.coach.formerClub, 'Skyvale Cyclones'); assert.equal(aria.element, 'Wind'); assert.equal(aria.badge, 'Gale Badge'); assert.equal(aria.legendary, 'tempestra');
  assert.equal(rowan.coach.name, 'Rowan Thorne'); assert.equal(rowan.coach.formerClub, 'Thornwood Wildroots'); assert.equal(rowan.element, 'Nature'); assert.equal(rowan.badge, 'Grove Badge'); assert.equal(rowan.legendary, 'elderoot');
  assert.equal(GYMS.filter((g) => g.coach.name === 'Aria Gale').length, 1); assert.equal(GYMS.filter((g) => g.coach.name === 'Rowan Thorne').length, 1);
  assert.equal(isGymClub('Skyvale Cyclones'), false); assert.equal(isGymClub('Thornwood Wildroots'), false);
  assert.equal(RIVAL_GMS['Cliffhaven Chargers'], 'Rook Tanner', 'the established manager is kept, as general manager'); assert.equal(headCoachName('Cliffhaven Chargers'), 'Aria Gale', 'and the club has one head coach');
  for (const seed of [0, 3, 99]) { assert.notEqual(headCoachName('Skyvale Cyclones', { seed }), 'Aria Gale'); assert.notEqual(headCoachName('Thornwood Wildroots', { seed }), 'Rowan Thorne'); }
  assert.equal(stadiumFor('Cliffhaven Chargers').name, 'Cliffside Arena'); assert.equal(stadiumFor('Cliffhaven Chargers').env, 'sky'); assert.equal(stadiumFor('Skyvale Cyclones').name, 'Skyvale Summit'); assert.equal(stadiumFor('Skyvale Cyclones').env, 'grass');
  assert.equal(stadiumFor('Westhaven Pirates').name, 'Corsair Harbor Stadium'); assert.equal(stadiumFor('Westhaven Pirates').env, 'forest'); assert.equal(stadiumFor('Westhaven Pirates').variant, 'coastal'); assert.equal(stadiumFor('Thornwood Wildroots').name, 'Elderroot Stadium'); assert.equal(stadiumFor('Thornwood Wildroots').env, 'grass');
});

// ------------------------------------------------------------ the schedule (Phase 6 validation)
const SEEDS = [0, 1, 7, 99, 312, 123456, 20261107, 4294967295];
test('the schedule: every club plays 14 games in 15 weeks: 6 in its division home and away, 5 more in its conference, 3 in the other, 7 at home, one bye', () => {
  assert.equal(REG_GAMES, 14); assert.equal(REG_WEEKS, 15); assert.equal(PLAYOFF_ROUNDS, 4); assert.equal(LAST_WEEK, 19); assert.deepEqual({ ...SCHEDULE_MIX }, { division: 6, conference: 5, interconference: 3 });
  for (const seed of SEEDS) for (let season = 1; season <= 6; season++) {
    const weeks = leagueSeasonFixtures(season, seed); const where = `seed ${seed} season ${season}`;
    assert.equal(weeks.length, REG_WEEKS); assert.deepEqual(weeks.map((w) => w.week), Array.from({ length: REG_WEEKS }, (_, i) => i + 1));
    const byes = weeks.filter((w) => w.bye); assert.equal(byes.length, 1, `${where}: one bye week`); assert.ok(byes[0].week >= 6 && byes[0].week <= 10, 'the bye is in the middle of the season'); assert.equal(byes[0].games.length, 0);
    for (const w of weeks.filter((x) => !x.bye)) { assert.equal(w.games.length, 16, `${where} week ${w.week}: sixteen games`); const playing = w.games.flatMap((g) => [g.home, g.away]); assert.equal(new Set(playing).size, 32, `${where} week ${w.week}: every club plays once`); for (const g of w.games) assert.notEqual(g.home, g.away, 'no club plays itself'); }
    assert.equal(weeks[REG_WEEKS - 1].games.every((g) => g.category === 'Division'), true, `${where}: the season ends on division games`);
    for (const club of ALL_TEAMS) {
      const mine = weeks.flatMap((w) => w.games).filter((g) => g.home === club || g.away === club); assert.equal(mine.length, REG_GAMES, `${where} ${club}`);
      assert.equal(mine.filter((g) => g.home === club).length, 7, `${where} ${club}: seven home games`);
      const opp = (g) => (g.home === club ? g.away : g.home); const rivals = DIVISIONS[divisionOf(club)].filter((c) => c !== club);
      for (const r of rivals) { const two = mine.filter((g) => opp(g) === r); assert.equal(two.length, 2, `${where} ${club} v ${r}`); assert.equal(two.filter((g) => g.home === club).length, 1, 'one at home and one away'); assert.ok(two.every((g) => g.category === 'Division')); }
      const conf = mine.filter((g) => g.category === 'Conference'), inter = mine.filter((g) => g.category === 'Interconference');
      assert.equal(conf.length, 5, `${where} ${club}: conference games`); assert.equal(inter.length, 3, `${where} ${club}: interconference games`);
      for (const g of conf) { assert.equal(conferenceOf(opp(g)), conferenceOf(club)); assert.notEqual(divisionOf(opp(g)), divisionOf(club)); } for (const g of inter) assert.notEqual(conferenceOf(opp(g)), conferenceOf(club));
      assert.equal(new Set([...conf, ...inter].map(opp)).size, 8, `${where} ${club}: no club outside the division is met twice`);
      const sched = teamSchedule(season, club, seed); assert.equal(sched.length, REG_WEEKS); assert.equal(sched.filter((g) => g.bye).length, 1);
      for (const g of sched.filter((x) => !x.bye)) { const fx = weeks[g.week - 1].games.find((x) => x.home === club || x.away === club); assert.equal(g.opponent, opp(fx)); assert.equal(g.home, fx.home === club); assert.equal(g.category, fx.category); }
    }
  }
});

test('the schedule is drawn from the franchise seed: the same seed and season repeat, other seeds and other seasons differ, and it is not a fixed rotation', () => {
  const sig = (season, seed) => JSON.stringify(leagueSeasonFixtures(season, seed));
  for (const seed of SEEDS.slice(0, 4)) { assert.equal(sig(1, seed), sig(1, seed)); assert.notEqual(sig(1, seed), sig(2, seed), 'next season is another schedule'); }
  assert.equal(new Set(SEEDS.map((s) => sig(1, s))).size, SEEDS.length, 'every franchise has its own schedule');
  // the eight games outside the division change from season to season and from save to save
  const outside = (season, seed, club) => teamSchedule(season, club, seed).filter((g) => !g.bye && g.category !== 'Division').map((g) => g.opponent).sort().join('|');
  for (const club of ['Goldhaven Royals', 'Thornwood Wildroots', 'Harbor Anchors']) { const seen = new Set(); for (const seed of SEEDS) for (let season = 1; season <= 6; season++) seen.add(outside(season, seed, club)); assert.ok(seen.size >= 40, `${club}: ${seen.size} different sets of opponents in 48 seasons`); }
  const f = F.createFranchise({ owner: { first: 'S', last: 'T' }, club: 'Mossvale Quakes', seed: 4242 }); assert.deepEqual(f.season.schedule.map((g) => [g.week, g.bye ? null : g.opponent, g.bye ? null : g.home]), teamSchedule(1, f.club, f.seed).map((g) => [g.week, g.bye ? null : g.opponent, g.bye ? null : g.home]), 'a franchise plays the schedule of its own seed');
});

test('Gym Leader games are never forced: a starter club meets a different number of them from season to season, sometimes few and sometimes many', () => {
  const counts = []; const metAll = new Set();
  for (const seed of SEEDS) for (let season = 1; season <= 12; season++) for (const club of ['Goldhaven Royals', 'Fernhaven Wisps']) { const gyms = teamSchedule(season, club, seed).filter((g) => !g.bye && isGymClub(g.opponent)); counts.push(gyms.length); for (const g of gyms) metAll.add(g.opponent);
    assert.ok(gyms.every((g) => g.category !== 'Division'), 'no Gym Leader is a division rival of a starter club'); assert.ok(gyms.length <= 8); }
  const distinct = new Set(counts); assert.ok(distinct.size >= 4, `badge opportunities in a season vary: ${[...distinct].sort((a, b) => a - b).join(', ')}`);
  assert.ok(Math.min(...counts) <= 2, 'some seasons offer very few'); assert.ok(Math.max(...counts) >= 5, 'and some offer many');
  assert.equal(metAll.size, 12, 'over the seasons every Gym Leader comes up');
  // a competitive-division club always has its two division Gym Leader games twice... unless it is one of them
  for (const club of ['Glacier Guardians', 'Coral Bay Tides']) { const g = teamSchedule(1, club, 9).filter((x) => !x.bye && x.category === 'Division' && isGymClub(x.opponent)); assert.equal(g.length, 4, `${club} plays its division's two Gym Leaders home and away`); }
});

// ------------------------------------------------------------ the 14-club playoffs (owner, 2026-11-23)
function seasonRecords(seed, flip = 3) { const records = Object.fromEntries(ALL_TEAMS.map((t) => [t, blankRecord()])); let k = 0;
  for (const w of leagueSeasonFixtures(1, seed)) for (const g of w.games) { const homeWins = (ALL_TEAMS.indexOf(g.home) * 7 + k++ * seed) % flip !== 0; applyResult(records, { home: g.home, away: g.away, homeScore: homeWins ? 24 : 10, awayScore: homeWins ? 10 : 24 }); } return records; }
test('the playoff field: seven clubs a conference; the four division champions are seeds 1-4 and three wild cards seeds 5-7, each by the standings', () => {
  assert.equal(PLAYOFF_ROUNDS, 4); assert.equal(PLAYOFF_SEEDS, 7); assert.equal(WILD_CARDS, 3); assert.equal(CONFERENCE_ROUND, 3); assert.equal(FINAL_ROUND, 4); assert.equal(REG_WEEKS + 1, 16); assert.equal(LAST_WEEK, 19);
  for (const seed of [3, 7, 11, 77, 312]) { const records = seasonRecords(seed); const st = standings(records); assert.deepEqual(Object.keys(st.conferences), CONFERENCE_NAMES);
    for (const c of CONFERENCE_NAMES) { const C = st.conferences[c]; assert.equal(C.seeds.length, 7); assert.equal(new Set(C.seeds).size, 7); assert.equal(C.order.length, 16);
      assert.deepEqual(C.seeds.slice(0, 4).slice().sort(), CONFERENCES[c].map((d) => st.divisions[d][0]).sort(), 'seeds 1-4 are the division champions'); assert.equal(new Set(C.seeds.slice(0, 4).map(divisionOf)).size, 4); assert.deepEqual(C.seeds.slice(0, 4), C.champions); assert.deepEqual(C.seeds.slice(4), C.wildcards);
      const rest = C.order.filter((t) => !C.champions.includes(t)); assert.deepEqual(C.wildcards, rest.slice(0, 3), 'the wild cards are the three best of the rest, in the standings\' own order');
      for (const group of [C.champions, C.wildcards]) for (let i = 1; i < group.length; i++) assert.ok(C.order.indexOf(group[i - 1]) < C.order.indexOf(group[i]), 'each group is ranked by the standings and their tiebreakers');
      for (const t of C.seeds) assert.equal(conferenceOf(t), c); }
    assert.equal(Object.values(st.conferences).flatMap((C) => C.seeds).length, 14); }
  // a champion with a worse record than a wild card is still seeded above him
  const records = Object.fromEntries(ALL_TEAMS.map((t) => [t, blankRecord()])); const win = (a, b) => applyResult(records, { home: a, away: b, homeScore: 20, awayScore: 10 });
  for (const w of leagueSeasonFixtures(1, 5)) for (const g of w.games) { const strong = (t) => (divisionOf(t) === 'Frostlands' ? 2 : divisionOf(t) === 'Golden Valley' ? 0 : 1) * 100 - ALL_TEAMS.indexOf(t); if (strong(g.home) >= strong(g.away)) win(g.home, g.away); else win(g.away, g.home); }
  const V = standings(records).conferences.Veyra; const gv = V.champions.find((t) => divisionOf(t) === 'Golden Valley'); assert.ok(V.seeds.indexOf(gv) <= 3); const pct = (t) => records[t].w / (records[t].w + records[t].l);
  assert.ok(V.wildcards.some((t) => pct(t) > pct(gv)), 'here a wild card has the better record'); assert.ok(V.wildcards.every((t) => V.seeds.indexOf(t) > V.seeds.indexOf(gv)));
  // Gym Leaders qualify like anyone else: nothing in the seeding reads the gym table
  assert.ok(!/GYM|gym/.test(standings.toString()) && !/GYM|gym/.test(playoffRound.toString()));
});

test('the bracket: Wild Card 2v7 3v6 4v5 with seed 1 resting, a reseeded Divisional round, Conference Championships at the higher seed, the Beast Bowl; 13 games', () => {
  const S = { Veyra: ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7'], Koruun: ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7'] };
  const r1 = playoffRound(1, [], S); assert.equal(r1.length, 6);
  for (const [c, p] of [['Veyra', 'V'], ['Koruun', 'K']]) { assert.deepEqual(r1.filter((g) => g.conf === c).map((g) => [g.home, g.away]).sort(), [[`${p}2`, `${p}7`], [`${p}3`, `${p}6`], [`${p}4`, `${p}5`]], 'the better seed hosts'); assert.ok(r1.filter((g) => g.conf === c).every((g) => g.tag === `${c} Wild Card`)); assert.ok(!r1.some((g) => g.home === `${p}1` || g.away === `${p}1`), 'seed 1 has the week off'); }
  assert.deepEqual(playoffByes(1, S), ['V1', 'K1']); assert.deepEqual(playoffByes(2, S), []);
  const play = (fixtures, round, pick) => fixtures.map((g) => ({ ...g, round, winner: pick(g) }));
  // every way the Wild Card round can go: seed 1 always hosts the lowest seed left, and the other two meet at the higher seed's
  for (let mask = 0; mask < 8; mask++) { const res1 = play(r1, 1, (g) => (((mask >> ['2', '3', '4'].indexOf(g.home[1])) & 1) ? g.away : g.home)); const r2 = playoffRound(2, res1, S); assert.equal(r2.length, 4);
    for (const [c, p] of [['Veyra', 'V'], ['Koruun', 'K']]) { const alive = [`${p}1`, ...res1.filter((x) => x.conf === c).map((x) => x.winner)].sort(); const mine = r2.filter((g) => g.conf === c); assert.equal(mine.length, 2);
      const top = mine.find((g) => g.home === `${p}1`); assert.ok(top, 'seed 1 is at home'); assert.equal(top.away, alive[3], `mask ${mask}: seed 1 meets the lowest seed left`); const other = mine.find((g) => g !== top); assert.deepEqual([other.home, other.away], [alive[1], alive[2]]); assert.ok(mine.every((g) => g.tag === `${c} Divisional`)); } }
  const res1 = play(r1, 1, (g) => (g.home.endsWith('2') ? g.away : g.home)); const r2 = playoffRound(2, res1, S); assert.deepEqual(r2.filter((g) => g.conf === 'Veyra').map((g) => [g.home, g.away]), [['V1', 'V7'], ['V3', 'V4']]);
  const res2 = play(r2, 2, (g) => g.away); const r3 = playoffRound(3, [...res1, ...res2], S); assert.deepEqual(r3.map((g) => [g.conf, g.home, g.away, g.tag]), [['Veyra', 'V4', 'V7', 'Veyra Championship'], ['Koruun', 'K4', 'K7', 'Koruun Championship']], 'the higher seed hosts');
  const res3 = play(r3, 3, (g) => g.away); const r4 = playoffRound(4, [...res1, ...res2, ...res3], S); assert.deepEqual(r4, [{ conf: 'League', home: 'V7', away: 'K7', tag: 'Beast Bowl' }], 'the Veyra champion against the Koruun champion');
  assert.equal(r1.length + r2.length + r3.length + r4.length, 13);
  assert.equal(TRADE_DEADLINE_WEEK, 7, 'the trade deadline is week 7 (owner, confirmed 2026-11-23)');
});

test('a franchise season: 14 qualifiers, four rounds in weeks 16-19, 13 games, a champion; and the top seed rests, watches the Wild Card round, then hosts the lowest seed left', () => {
  const f0 = newFranchise(91, { club: 'Goldhaven Royals' }); const { f, problems } = runFranchise(91, { from: f0, seasons: 1, stopWeek: 16 }); assert.deepEqual(problems, []);
  let p = f.season.playoffs; assert.ok(p, 'the bracket is drawn when week 16 begins'); assert.equal(f.season.week, 16); for (const c of CONFERENCE_NAMES) assert.equal(p.seeds[c].length, 7); assert.equal(p.fixtures.length, 6); assert.ok(p.fixtures.every((g) => g.week === 16 && g.round === 1));
  // put the owner's club in seed 1 of its conference and redraw the first round, as the standings would have
  const conf = conferenceOf(f.club); p.seeds[conf] = [f.club, ...p.seeds[conf].filter((t) => t !== f.club)].slice(0, 7); p.fixtures = playoffRound(1, [], p.seeds).map((g) => ({ ...g, round: 1, week: 16, result: null }));
  assert.equal(F.playoffFixture(f), null); assert.equal(F.playoffBye(f), true, 'seed 1 is resting, not eliminated'); assert.equal(F.playerAlive(f), true); assert.equal(F.playoffAlive(f), true); assert.equal(F.sundayMatchup(f), null);
  const back = Save.importJson(Save.exportJson(f)); assert.equal(F.playoffBye(back), true, 'the bye survives a save and load'); assert.deepEqual(back.season.playoffs, f.season.playoffs);
  const r = F.advancePlayoffs(f); assert.ok(r.ok); assert.equal(r.round, 1); assert.equal(r.results.length, 6); assert.equal(f.season.week, 17); assert.equal(F.playoffBye(f), false);
  const fx = F.playoffFixture(f); assert.ok(fx, 'the owner plays the Divisional round'); assert.equal(fx.round, 2); assert.equal(fx.home, f.club, 'at home'); assert.equal(fx.week, 17); assert.match(fx.tag, /Divisional/);
  const alive = [f.club, ...p.results.filter((x) => x.round === 1 && x.conf === conf).map((x) => x.winner)]; assert.equal(fx.away, alive.sort((a, b) => p.seeds[conf].indexOf(b) - p.seeds[conf].indexOf(a))[0], 'against the lowest seed left');
  assert.equal(F.advancePlayoffs(f).ok, false, 'a club with a game to play cannot skip it by advancing');
  // play it out
  const done = runFranchise(91, { from: f, seasons: 1 }); assert.deepEqual(done.problems, []); p = done.f.season.playoffs || done.f.history.at(-1); const g = done.f; assert.ok(g.season.finished);
  const P = g.season.playoffs; assert.equal(P.results.length, 13, 'thirteen games'); assert.deepEqual([1, 2, 3, 4].map((n) => P.results.filter((x) => x.round === n).length), [6, 4, 2, 1]); assert.deepEqual([1, 2, 3, 4].map((n) => new Set(P.fixtures.filter((x) => x.round === n).map((x) => x.week))), [new Set([16]), new Set([17]), new Set([18]), new Set([19])]);
  assert.equal(P.champion, P.results.find((x) => x.round === 4).winner); assert.equal(g.season.champion, P.champion); assert.equal(g.history.at(-1).champion, P.champion); assert.equal(g.history.at(-1).playoffs, true);
  const fin = P.fixtures.find((x) => x.round === 4); assert.notEqual(conferenceOf(fin.home), conferenceOf(fin.away)); for (const x of P.fixtures.filter((y) => y.round === 3)) assert.ok(P.seeds[x.conf].indexOf(x.home) < P.seeds[x.conf].indexOf(x.away));
  assert.deepEqual(Object.keys(F.ROUND_NAMES), ['1', '2', '3', '4']);
});

// ------------------------------------------------------------ badges belong to the coach (Phase 7)
function closedSeason(club = 'Goldhaven Royals', seed = 37) {
  const f = F.createFranchise({ owner: { first: 'Test', last: 'GM' }, club, cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed }); F.hireDefaultStaff(f);
  f.draft = null; f.season.finished = true; f.season.awards = { league: {} }; f.season.playoffs = { champion: 'Glacier Guardians' };
  f.history = [{ year: 1, club: f.club, record: { w: 6, l: 8, t: 0 }, awards: f.season.awards, leagueStats: {}, champion: 'Glacier Guardians' }]; f.offseason = { year: 1, items: [] }; GM.ensureGmCareer(f); return f;
}
test('badges follow the coach to a new club, can still be lost there, and count toward the Hall of Fame wherever they were won', () => {
  const f = closedSeason(); f.campaign.badges = { 'Frostpeak Howlers': { year: 1, week: 4, score: '21-14' }, 'Harbor Anchors': { year: 1, week: 9, score: '17-10' } }; f.campaign.gymWins = { 'Frostpeak Howlers': 1, 'Harbor Anchors': 2 }; f.campaign.wins = 6; f.campaign.tracks = { tsunarok: 2, glacivern: 3 }; f.campaign.unlocked = { glacivern: true };
  const before = F.hallOfFameProgress(f).rows.find((r) => r.key === 'badges').have; assert.equal(before, 2);
  const job = GM.jobMarket(f).find((o) => o.rebuilding && !isGymClub(o.club)); assert.ok(job, 'a vacancy exists'); assert.ok(GM.applyForJob(f, job.club).offered); const from = f.club;
  const r = F.acceptGmJob(f, job.club); assert.ok(r.ok, r.reason); assert.equal(f.club, job.club); assert.notEqual(f.club, from);
  assert.deepEqual(Object.keys(f.campaign.badges).sort(), ['Frostpeak Howlers', 'Harbor Anchors'], 'the badges came with the coach'); assert.deepEqual(f.campaign.gymWins, { 'Frostpeak Howlers': 1, 'Harbor Anchors': 2 });
  assert.equal(f.campaign.wins, 0, 'the new club\'s own campaign starts empty'); assert.equal(GM.careerTotals(f).wins, 6, 'career wins still count the old club');
  assert.equal(F.hallOfFameProgress(f).rows.find((x) => x.key === 'badges').have, 2); assert.ok(F.badgeOf(f, 'Frostpeak Howlers')); assert.ok(F.legendChoices(f).some((c) => c.id === GYM_BY_CLUB['Harbor Anchors'].legendary), 'a held badge still opens its Legend Track');
  assert.deepEqual(f.campaign.tracks, { tsunarok: 2, glacivern: 3 }, 'Legend Track progress came too'); assert.deepEqual(f.campaign.unlocked, { glacivern: true });
  // losing to the Gym Leader with the new club hands the badge back, and the career count follows
  delete f.campaign.badges['Harbor Anchors']; assert.deepEqual(Object.keys(GM.careerTotals(f).badges), ['Frostpeak Howlers'], 'a badge lost after the move is not counted from an old stint');
  assert.equal(F.hallOfFameProgress(f).rows.find((x) => x.key === 'badges').have, 1);
  const back = Save.importJson(Save.exportJson(f)); assert.deepEqual(back.campaign.badges, f.campaign.badges, 'and they survive a save and load');
});

test('badge counts: twelve to collect; the half-way and full-set achievements are at six and twelve; an unbeaten season is 14-0', async () => {
  const { ACHIEVEMENTS } = await import('../src/data/achievements.js'); const by = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
  const f = { campaign: { badges: {} }, history: [], season: { year: 1 } }; const ctx = { won: true, newBadge: true }; const hold = (n) => { f.campaign.badges = Object.fromEntries(GYMS.slice(0, n).map((g) => [g.club, { year: 1 }])); };
  for (let n = 1; n <= 12; n++) { hold(n); assert.equal(!!by.first_badge.when(f, ctx), n === 1, `first badge at ${n}`); assert.equal(!!by.half_badges.when(f, ctx), n === 6, `half at ${n}`); assert.equal(!!by.all_badges.when(f, ctx), n === 12, `all at ${n}`); }
  assert.equal(!!by.undefeated.when(f, { wins: 14, losses: 0 }), true); assert.equal(!!by.undefeated.when(f, { wins: 13, losses: 0 }), false); assert.equal(!!by.undefeated.when(f, { wins: 14, losses: 1 }), false);
  // Hall of Fame badges, held now (owner, 2026-11-23): Easy 8, Normal 8, Hard 12. The other requirements are untouched.
  assert.deepEqual(Object.fromEntries(Object.entries(F.DIFFICULTY).map(([k, d]) => [k, d.hofGoals])), { rookie: { badges: 8, titles: 1, wins: 30, awards: 2 }, pro: { badges: 8, titles: 2, wins: 50, awards: 3 }, allstar: { badges: 12, titles: 4, wins: 80, awards: 5 } });
});

// ------------------------------------------------------------ saves from the 16-club league (Phase 10)
test('a franchise saved in the 16-club league is refused with its own message and left unchanged; a 32-club franchise saves and loads', () => {
  const f = F.createFranchise({ owner: { first: 'S', last: 'T' }, club: 'Riverbend Rapids', seed: 11 }); assert.equal(f.leagueFormat, F.LEAGUE_FORMAT); assert.equal(F.LEAGUE_FORMAT, 32);
  const text = Save.exportJson(f); const back = Save.importJson(text); assert.equal(back.club, 'Riverbend Rapids'); assert.equal(back.leagueFormat, 32); assert.deepEqual(back.season.schedule, f.season.schedule); assert.deepEqual(back.preLeagueHistory, f.preLeagueHistory);
  const old = JSON.parse(text); delete old.franchise.leagueFormat; const frozen = JSON.stringify(old);
  assert.throws(() => Save.importJson(JSON.stringify(old)), (e) => e.code === 'incompatible' && e.reason === 'league-format' && e.message === Save.OLD_LEAGUE_MESSAGE && /16-club/.test(e.message) && /Start a new franchise/.test(e.message));
  assert.throws(() => Save.migrate(old.franchise), (e) => e.code === 'incompatible'); assert.equal(JSON.stringify(old), frozen, 'refusing reads the save and changes nothing in it');
});

// ------------------------------------------------------------ Legend Tracks need a held badge (owner, 2026-11-23)
test('all twelve Legend Tracks: locked without the badge, active with it, paused when it is lost with progress kept, resumed when it is won back', () => {
  const f = F.createFranchise({ owner: { first: 'L', last: 'T' }, club: 'Fernhaven Wisps', seed: 19 }); const state = (id) => F.legendTracks(f).find((t) => t.id === id);
  assert.equal(F.legendTracks(f).length, 12); assert.deepEqual(F.legendTracks(f).map((t) => t.id).sort(), GYMS.map((g) => g.legendary).sort()); assert.ok(F.legendTracks(f).every((t) => t.state === 'locked' && t.needed === 3)); assert.deepEqual(F.legendChoices(f), []);
  for (const g of GYMS) { const id = g.legendary; const where = `${g.club} (${id})`;
    // no badge: nothing to choose, and a champion's pick cannot go to it
    f.legendPick = { year: 1, resolved: false }; assert.equal(F.legendTrackActive(f, id), false); assert.equal(F.chooseLegendTrack(f, id).ok, false, `${where}: no track without the badge`); assert.equal(f.campaign.tracks?.[id] || 0, 0);
    // win the badge: the track runs
    f.campaign.badges[g.club] = { year: 1, week: 3, score: '20-10' }; assert.equal(state(id).state, 'active'); assert.equal(state(id).held, true); assert.ok(F.legendChoices(f).some((c) => c.id === id));
    assert.equal(F.chooseLegendTrack(f, id).tracks, 1); f.legendPick = { year: 2, resolved: false }; assert.equal(F.chooseLegendTrack(f, id).tracks, 2); assert.equal(state(id).tracks, 2);
    // lose the badge: paused at once, progress kept, nothing advances
    delete f.campaign.badges[g.club]; assert.equal(state(id).state, 'paused', `${where}: paused`); assert.equal(state(id).tracks, 2, 'progress is kept'); assert.ok(!F.legendChoices(f).some((c) => c.id === id));
    f.legendPick = { year: 3, resolved: false }; assert.equal(F.chooseLegendTrack(f, id).ok, false, `${where}: a paused track does not advance`); assert.equal(f.campaign.tracks[id], 2); assert.equal(f.legendPick.resolved, false, 'and the champion\'s pick is not spent');
    // win it back: it resumes where it stood and completes
    f.campaign.badges[g.club] = { year: 3, week: 5, score: '17-14' }; assert.equal(state(id).state, 'active'); const r = F.chooseLegendTrack(f, id); assert.equal(r.tracks, 3); assert.equal(r.unlocked, true); assert.equal(state(id).unlocked, true);
    // a completed track stays completed when the badge goes again; it is paused, not undone
    delete f.campaign.badges[g.club]; assert.equal(state(id).state, 'paused'); assert.equal(state(id).unlocked, true, `${where}: a completed milestone stays completed`); assert.equal(f.campaign.unlocked[id], true); assert.equal(f.campaign.tracks[id], 3);
  }
  assert.ok(F.legendTracks(f).every((t) => t.state === 'paused' && t.unlocked && t.tracks === 3));
  const back = Save.importJson(Save.exportJson(f)); assert.deepEqual(F.legendTracks(back).map((t) => [t.id, t.state, t.tracks, t.unlocked]), F.legendTracks(f).map((t) => [t.id, t.state, t.tracks, t.unlocked]), 'the states survive a save and load');
});

test('a paused track\'s legendary does not turn up in scouting until the badge is back; a legendary already recruited is never taken away', () => {
  const f = F.createFranchise({ owner: { first: 'L', last: 'T' }, club: 'Fernhaven Wisps', seed: 23 }); F.hireDefaultStaff(f); const g = GYM_BY_CLUB['Emberfall Infernos']; const id = g.legendary; const home = SPECIES_BY_ID[id].regions[0];
  f.campaign.unlocked = { [id]: true }; f.campaign.tracks = { [id]: 3 };
  const found = () => { f.campaign.legendSeen = {}; f.season.day = 0; f.week = { ...f.week, scouted: null, prospects: null, region: null }; const r = F.scoutRegion(f, home); return (r.prospects || f.week.prospects || []).some((p) => p.monster.species === id); };
  assert.equal(found(), false, 'no badge: the unlocked legendary stays away'); f.campaign.badges[g.club] = { year: 1, week: 2, score: '14-7' }; assert.equal(found(), true, 'badge held: he turns up in his home region');
  delete f.campaign.badges[g.club]; assert.equal(found(), false, 'badge lost: paused again');
  // recruited: on the roster, and he stays there whatever happens to the badge
  const legend = { ...f.roster[0], id: 'legend-test', species: id, name: 'Kept' }; f.roster.push(legend); const t = () => F.legendTracks(f).find((x) => x.id === id);
  assert.equal(t().state, 'recruited'); assert.equal(t().recruited, true); f.campaign.badges[g.club] = { year: 2, week: 2, score: '14-7' }; assert.equal(t().state, 'recruited'); delete f.campaign.badges[g.club]; assert.equal(t().state, 'recruited');
  assert.ok(f.roster.some((m) => m.id === 'legend-test'), 'never removed'); assert.ok(!F.legendChoices(f).some((c) => c.id === id), 'and he cannot be tracked twice (one of each legendary)');
});

test('Hall of Fame: the badge requirement counts badges held now, 8 on Easy and Normal and 12 on Hard', () => {
  for (const [difficulty, need] of [['rookie', 8], ['pro', 8], ['allstar', 12]]) { const f = F.createFranchise({ owner: { first: 'H', last: 'F' }, club: 'Mossvale Quakes', seed: 3, settings: { difficulty } }); const row = () => F.hallOfFameProgress(f).rows.find((r) => r.key === 'badges');
    assert.equal(row().goal, need); for (let n = 0; n <= 12; n++) { f.campaign.badges = Object.fromEntries(GYMS.slice(0, n).map((g) => [g.club, { year: 1 }])); assert.equal(row().have, n); assert.equal(row().done, n >= need, `${difficulty}: ${n} badges`); }
    f.campaign.badges = Object.fromEntries(GYMS.slice(0, need).map((g) => [g.club, { year: 1 }])); assert.equal(row().done, true); delete f.campaign.badges[GYMS[0].club]; assert.equal(row().done, false, 'a badge lost no longer counts'); }
});

// ------------------------------------------------------------ approved identities (owner, 2026-11-23)
const COLORS = { 'Frostpeak Howlers': ['#73C8F5', '#142B52', '#F4FAFF'], 'Glacier Guardians': ['#E0F2F1', '#3B6370', '#A3CDD4'], 'Northstar Novas': ['#6565D8', '#161638', '#F3C7FF'], 'Ironpeak Colossi': ['#777F89', '#252A31', '#D59A52'], 'Stormport Bolts': ['#F5D400', '#172C50', '#FFFFFF'], 'Canyon Crushers': ['#B56A3D', '#483126', '#F2C79C'], 'Sundown Drakes': ['#E86A45', '#50203D', '#FFCC8B'], 'Thunder Mesa Blitz': ['#9A4DDB', '#291B4A', '#F4D64E'],
  'Goldhaven Royals': ['#C8A039', '#442857', '#FFF2C6'], 'Riverbend Rapids': ['#188EAB', '#133B56', '#D6F6FF'], 'Pinecrest Wardens': ['#527C46', '#263E2C', '#D8DFB2'], 'Skyvale Cyclones': ['#A5D9ED', '#325A85', '#FFFFFF'], 'Emberfall Infernos': ['#E53D25', '#44151D', '#FFB35C'], 'Coral Bay Tides': ['#F18BA2', '#176E79', '#FFF0E3'], 'Cliffhaven Chargers': ['#36B7C9', '#254D7B', '#FFFFFF'], 'Palm Isle Mystics': ['#C28AE3', '#355B61', '#F6E0FF'],
  'Stonehaven Bastions': ['#4C8D80', '#293D45', '#D9E5D9'], 'Eastport Phantoms': ['#8477B8', '#242139', '#D9D2F0'], 'Harbor Anchors': ['#205A96', '#142B48', '#D3E9F7'], 'Ashford Cinders': ['#A17B53', '#4C3832', '#EAD5B1'], 'Ember City Beasts': ['#A82932', '#35262C', '#F3A76D'], 'Bayou Stalkers': ['#8A9E35', '#283D2C', '#E5DE91'], 'Sunfire Solars': ['#F4A62A', '#713B30', '#FFF0B0'], 'Palmetto Wyrms': ['#247D60', '#24433E', '#D7B2A1'],
  'Thornwood Wildroots': ['#75A52C', '#34452A', '#E2D8A5'], 'Silvergrove Arcanists': ['#AAB5C5', '#49466D', '#F1E8FA'], 'Mossvale Quakes': ['#777044', '#4C3F30', '#D5C79B'], 'Fernhaven Wisps': ['#62D5A9', '#2C6660', '#E7FFF3'], 'Aetheria Seers': ['#DB65BA', '#432B66', '#FFE2F6'], 'Deepwater Chompers': ['#183E72', '#10243F', '#7ED0E5'], 'Mistport Veils': ['#7D929D', '#384A5B', '#E4EAF0'], 'Westhaven Pirates': ['#167C79', '#183E48', '#D6B775'] };
test('every club has the approved primary, secondary and accent colour, exactly; a club\'s name is written in one of its own colours that can be read', () => {
  assert.deepEqual(Object.keys(COLORS).sort(), [...ALL_TEAMS].sort());
  for (const [club, [primary, secondary, accent]] of Object.entries(COLORS)) { const m = TEAM_META[club]; assert.equal(m.color, primary, `${club} primary`); assert.equal(m.secondary, secondary, `${club} secondary`); assert.equal(m.accent, accent, `${club} accent`);
    assert.ok([primary, accent].includes(m.ink), `${club}: the text colour is the primary or the accent, never an invented one`); assert.ok(contrastOnPanel(m.ink) >= 3, `${club}: readable on a dark panel (${contrastOnPanel(m.ink).toFixed(1)})`); if (contrastOnPanel(primary) >= 3) assert.equal(m.ink, primary, `${club}: the primary where it can be read`); }
  const f = F.createFranchise({ owner: { first: 'C', last: 'L' }, club: 'Harbor Anchors', seed: 2 }); assert.equal((F.playerTeam(f).team || F.playerTeam(f)).color, '#205A96', 'the club takes the field in its primary'); assert.equal(F.aiTeam(f, 'Stormport Bolts').color, '#F5D400');
});

test('the corrected stadium names and managers; no person holds two jobs; fields are unchanged by the names', () => {
  const NAMES = { 'Goldhaven Royals': 'Crownfield Stadium', 'Riverbend Rapids': 'Riverbend Stadium', 'Pinecrest Wardens': 'Pinecrest Bowl', 'Emberfall Infernos': 'Inferno Crater', 'Silvergrove Arcanists': 'Silvergrove Park', 'Mossvale Quakes': 'Mossvale Grounds', 'Fernhaven Wisps': 'Fernhaven Falls Field', 'Aetheria Seers': 'Oracle Spire',
    'Cliffhaven Chargers': 'Cliffside Arena', 'Skyvale Cyclones': 'Skyvale Summit', 'Thornwood Wildroots': 'Elderroot Stadium', 'Westhaven Pirates': 'Corsair Harbor Stadium', 'Frostpeak Howlers': 'Howling Glacier Bowl', 'Harbor Anchors': 'Sentinel Pier Field', 'Sunfire Solars': 'Sunfire Coliseum' };
  for (const [club, name] of Object.entries(NAMES)) assert.equal(stadiumFor(club).name, name, club);
  for (const club of ALL_TEAMS) assert.equal(stadiumFor(club).env === 'grass', !isGymClub(club), `${club}: only a Gym Leader's club has an elemental field`);
  const GMS = { 'Goldhaven Royals': 'Victor Hale', 'Riverbend Rapids': 'Maya Rivers', 'Pinecrest Wardens': 'Grant Mercer', 'Coral Bay Tides': 'Marina Cole', 'Palm Isle Mystics': 'Jalen Tide', 'Cliffhaven Chargers': 'Rook Tanner' };
  for (const [club, gm] of Object.entries(GMS)) assert.equal(RIVAL_GMS[club], gm, club);
  const people = [...Object.values(RIVAL_GMS), ...GYMS.map((g) => g.coach.name)]; assert.equal(people.length, 44); assert.equal(new Set(people).size, 44, 'no general manager is also a Gym Leader, and no name is used twice');
  for (const seed of [1, 7, 312, 99999]) { const coaches = ALL_TEAMS.map((c) => headCoachName(c, { seed })); assert.equal(new Set(coaches).size, 32, `seed ${seed}: 32 different head coaches`); for (const c of ALL_TEAMS) if (!isGymClub(c)) assert.ok(!people.includes(headCoachName(c, { seed })), `seed ${seed}: ${c}'s head coach is nobody's general manager or Gym Leader`); }
  for (const c of ALL_TEAMS) assert.ok(IDENTITIES[c].offense && IDENTITIES[c].defense, `${c} keeps its playing style`);
});

test('the league archive keeps its eight seasons and champions in the old eight-club bracket', () => {
  const a = F.createFranchise({ owner: { first: 'A', last: 'R' }, club: 'Silvergrove Arcanists', seed: 8 }).preLeagueHistory;
  assert.deepEqual(a.seasons.map((s) => [s.year, s.champion]), [[-7, 'Skyvale Cyclones'], [-6, 'Thornwood Wildroots'], [-5, 'Skyvale Cyclones'], [-4, 'Stormport Bolts'], [-3, 'Stormport Bolts'], [-2, 'Aetheria Seers'], [-1, 'Harbor Anchors'], [0, 'Frostpeak Howlers']]);
  for (const s of a.seasons) { for (const c of CONFERENCE_NAMES) assert.equal(s.seeds[c].length, 4); assert.equal(s.playoffs.length, 7); assert.deepEqual([1, 2, 3].map((r) => s.playoffs.filter((g) => g.round === r).length), [4, 2, 1]); assert.equal(s.playoffs.find((g) => g.round === 3).winner, s.champion);
    assert.deepEqual(legacyPlayoffRound(1, [], s.seeds).map((g) => [g.home, g.away]), s.playoffs.filter((g) => g.round === 1).map((g) => [g.home, g.away])); }
});
