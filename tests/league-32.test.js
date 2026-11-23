// The 32-club league (owner specification, 2026-11-23): structure, starter divisions, the twelve Gym Leaders, the two Gym Leaders
// who changed clubs, the 14-game seeded schedule, the playoff field, badges that follow the coach, and saves from the old league.
import { test } from 'node:test';
import assert from 'node:assert/strict';
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
  assert.deepEqual([...FREE_LEGENDARIES].sort(), ['astralux', 'elderoot', 'pyroclast', 'tempestra'], 'the Legend Tracks rule is unchanged until the owner rules on it');
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
  assert.equal(REG_GAMES, 14); assert.equal(REG_WEEKS, 15); assert.equal(PLAYOFF_ROUNDS, 3); assert.equal(LAST_WEEK, 18); assert.deepEqual({ ...SCHEDULE_MIX }, { division: 6, conference: 5, interconference: 3 });
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

test('the playoffs: the four division winners of each conference, seeded by record, in the same eight-club, three-round bracket; weeks 16 to 18', () => {
  const records = Object.fromEntries(ALL_TEAMS.map((t) => [t, blankRecord()])); let k = 0;
  for (const w of leagueSeasonFixtures(1, 77)) for (const g of w.games) { const homeWins = (ALL_TEAMS.indexOf(g.home) * 7 + k++) % 3 !== 0; applyResult(records, { home: g.home, away: g.away, homeScore: homeWins ? 24 : 10, awayScore: homeWins ? 10 : 24 }); }
  const st = standings(records); assert.deepEqual(Object.keys(st.conferences), CONFERENCE_NAMES);
  for (const c of CONFERENCE_NAMES) { const C = st.conferences[c]; assert.equal(C.seeds.length, 4); assert.deepEqual(C.wildcards, [], 'no wild cards');
    assert.deepEqual(C.seeds.slice().sort(), CONFERENCES[c].map((d) => st.divisions[d][0]).sort(), 'the seeds are the division winners'); assert.equal(new Set(C.seeds.map(divisionOf)).size, 4);
    const pct = (t) => records[t].w / (records[t].w + records[t].l); assert.ok(C.seeds.every((t, i) => !i || pct(t) <= pct(C.seeds[i - 1])), 'seeded by record'); assert.equal(C.order.length, 16); }
  const seeds = Object.fromEntries(CONFERENCE_NAMES.map((c) => [c, st.conferences[c].seeds])); const r1 = playoffRound(1, [], seeds);
  assert.equal(r1.length, 4); for (const c of CONFERENCE_NAMES) { const mine = r1.filter((g) => g.conf === c); assert.deepEqual(mine.map((g) => [g.home, g.away]), [[seeds[c][0], seeds[c][3]], [seeds[c][1], seeds[c][2]]], '1 v 4 and 2 v 3, the better seed at home'); }
  const res1 = r1.map((g) => ({ ...g, round: 1, winner: g.home })); const r2 = playoffRound(2, res1, seeds); assert.equal(r2.length, 2); assert.deepEqual(r2.map((g) => g.tag), ['Veyra Championship', 'Koruun Championship']);
  const res2 = r2.map((g) => ({ ...g, round: 2, winner: g.home })); const r3 = playoffRound(3, [...res1, ...res2], seeds); assert.equal(r3.length, 1); assert.equal(r3[0].tag, 'Beast Bowl'); assert.notEqual(conferenceOf(r3[0].home), conferenceOf(r3[0].away));
  assert.equal(REG_WEEKS + 1, 16); assert.equal(LAST_WEEK, REG_WEEKS + PLAYOFF_ROUNDS); assert.ok(TRADE_DEADLINE_WEEK < REG_WEEKS && TRADE_DEADLINE_WEEK >= 8, 'the trade deadline sits in the second half of the longer season');
});

// ------------------------------------------------------------ badges belong to the coach (Phase 7)
function closedSeason(club = 'Goldhaven Royals', seed = 37) {
  const f = F.createFranchise({ owner: { first: 'Test', last: 'GM' }, club, cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed }); F.hireDefaultStaff(f);
  f.draft = null; f.season.finished = true; f.season.awards = { league: {} }; f.season.playoffs = { champion: 'Glacier Guardians' };
  f.history = [{ year: 1, club: f.club, record: { w: 6, l: 8, t: 0 }, awards: f.season.awards, leagueStats: {}, champion: 'Glacier Guardians' }]; f.offseason = { year: 1, items: [] }; GM.ensureGmCareer(f); return f;
}
test('badges follow the coach to a new club, can still be lost there, and count toward the Hall of Fame wherever they were won', () => {
  const f = closedSeason(); f.campaign.badges = { 'Frostpeak Howlers': { year: 1, week: 4, score: '21-14' }, 'Harbor Anchors': { year: 1, week: 9, score: '17-10' } }; f.campaign.gymWins = { 'Frostpeak Howlers': 1, 'Harbor Anchors': 2 }; f.campaign.wins = 6;
  const before = F.hallOfFameProgress(f).rows.find((r) => r.key === 'badges').have; assert.equal(before, 2);
  const job = GM.jobMarket(f).find((o) => o.rebuilding && !isGymClub(o.club)); assert.ok(job, 'a vacancy exists'); assert.ok(GM.applyForJob(f, job.club).offered); const from = f.club;
  const r = F.acceptGmJob(f, job.club); assert.ok(r.ok, r.reason); assert.equal(f.club, job.club); assert.notEqual(f.club, from);
  assert.deepEqual(Object.keys(f.campaign.badges).sort(), ['Frostpeak Howlers', 'Harbor Anchors'], 'the badges came with the coach'); assert.deepEqual(f.campaign.gymWins, { 'Frostpeak Howlers': 1, 'Harbor Anchors': 2 });
  assert.equal(f.campaign.wins, 0, 'the new club\'s own campaign starts empty'); assert.equal(GM.careerTotals(f).wins, 6, 'career wins still count the old club');
  assert.equal(F.hallOfFameProgress(f).rows.find((x) => x.key === 'badges').have, 2); assert.ok(F.badgeOf(f, 'Frostpeak Howlers')); assert.ok(F.legendChoices(f).some((c) => c.id === GYM_BY_CLUB['Frostpeak Howlers'].legendary), 'a held badge still opens its Legend Track');
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
  for (const d of Object.values(F.DIFFICULTY)) assert.equal(d.hofGoals.badges, 8, 'the Hall of Fame still asks for 8 badges until the owner sets the new number');
});

// ------------------------------------------------------------ saves from the 16-club league (Phase 10)
test('a franchise saved in the 16-club league is refused with its own message and left unchanged; a 32-club franchise saves and loads', () => {
  const f = F.createFranchise({ owner: { first: 'S', last: 'T' }, club: 'Riverbend Rapids', seed: 11 }); assert.equal(f.leagueFormat, F.LEAGUE_FORMAT); assert.equal(F.LEAGUE_FORMAT, 32);
  const text = Save.exportJson(f); const back = Save.importJson(text); assert.equal(back.club, 'Riverbend Rapids'); assert.equal(back.leagueFormat, 32); assert.deepEqual(back.season.schedule, f.season.schedule); assert.deepEqual(back.preLeagueHistory, f.preLeagueHistory);
  const old = JSON.parse(text); delete old.franchise.leagueFormat; const frozen = JSON.stringify(old);
  assert.throws(() => Save.importJson(JSON.stringify(old)), (e) => e.code === 'incompatible' && e.reason === 'league-format' && e.message === Save.OLD_LEAGUE_MESSAGE && /16-club/.test(e.message) && /Start a new franchise/.test(e.message));
  assert.throws(() => Save.migrate(old.franchise), (e) => e.code === 'incompatible'); assert.equal(JSON.stringify(old), frozen, 'refusing reads the save and changes nothing in it');
});
