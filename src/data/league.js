// League structure and the deterministic 16-team rotating schedule
// (ported unchanged from the v5 prototype; verified against
// tests/schedule-vectors.json). Three tiers share the same 16-club shape.

export const DIVISIONS = Object.freeze({
  North: ['Frostpeak Howlers', 'Glacier Guardians', 'Northstar Wolves', 'Ironpeak Rams'],
  West: ['Stormport Bolts', 'Canyon Crushers', 'Sundown Drakes', 'Thunder Mesa'],
  East: ['Stonehaven Titans', 'Eastport Phantoms', 'Harbor Sentinels', 'Ashford Hawks'],
  South: ['Ember City Beasts', 'Bayou Stalkers', 'Sunfire Lions', 'Palmetto Vipers'],
});
export const conferenceFor = (division) => (['North', 'West'].includes(division) ? 'Aurora' : 'Titan');
export const ALL_TEAMS = Object.values(DIVISIONS).flat();
export const divisionOf = (team) => Object.keys(DIVISIONS).find((d) => DIVISIONS[d].includes(team));

export const TEAM_META = Object.freeze({
  'Frostpeak Howlers': { abbr: 'FRO', color: '#7fb6ff', mascot: 'wolf' },
  'Glacier Guardians': { abbr: 'GLA', color: '#bfe8ff', mascot: 'bear' },
  'Northstar Wolves': { abbr: 'NOR', color: '#8d9bff', mascot: 'wolf' },
  'Ironpeak Rams': { abbr: 'IRO', color: '#c9c9c9', mascot: 'ram' },
  'Stormport Bolts': { abbr: 'STM', color: '#ffe36b', mascot: 'bolt' },
  'Canyon Crushers': { abbr: 'CAN', color: '#e09a5a', mascot: 'rock' },
  'Sundown Drakes': { abbr: 'SUN', color: '#ff8a5b', mascot: 'drake' },
  'Thunder Mesa': { abbr: 'THU', color: '#c288ff', mascot: 'mesa' },
  'Stonehaven Titans': { abbr: 'STO', color: '#9fd8c8', mascot: 'titan' },
  'Eastport Phantoms': { abbr: 'EAS', color: '#b9b5ff', mascot: 'ghost' },
  'Harbor Sentinels': { abbr: 'HAR', color: '#6ec6ff', mascot: 'tower' },
  'Ashford Hawks': { abbr: 'ASH', color: '#d8c38a', mascot: 'hawk' },
  'Ember City Beasts': { abbr: 'EMB', color: '#ff6b4a', mascot: 'beast' },
  'Bayou Stalkers': { abbr: 'BAY', color: '#8fd47a', mascot: 'gator' },
  'Sunfire Lions': { abbr: 'SNF', color: '#ffc14d', mascot: 'lion' },
  'Palmetto Vipers': { abbr: 'PAL', color: '#7be3b0', mascot: 'viper' },
});

/** The four rebuilding clubs offered to a new owner (with fictional prior records). */
/** Clubs a new owner may take: ordinary clubs only, so every franchise meets the same eight gyms (GDD §15.3). */
export const STARTER_CLUBS = Object.freeze([
  { name: 'Ember City Beasts', record: '2–12' }, { name: 'Stonehaven Titans', record: '1–13' },
  { name: 'Glacier Guardians', record: '3–11' }, { name: 'Stormport Bolts', record: '2–12' },
]);

export const RIVAL_GMS = Object.freeze({ 'Glacier Guardians': 'Morgan Vale', 'Northstar Wolves': 'Cameron Frost', 'Ironpeak Rams': 'Jules Stone', 'Canyon Crushers': 'Alex Calder', 'Sundown Drakes': 'Riley Ash', 'Thunder Mesa': 'Blake Storm', 'Eastport Phantoms': 'Taylor Voss', 'Harbor Sentinels': 'Jordan Shore', 'Ashford Hawks': 'Casey Finch', 'Bayou Stalkers': 'Drew Marsh', 'Sunfire Lions': 'Avery Sol', 'Palmetto Vipers': 'Quinn Reed', 'Frostpeak Howlers': 'Sam Rime', 'Stormport Bolts': 'Devon Gale', 'Stonehaven Titans': 'Harper Flint', 'Ember City Beasts': 'Rowan Blaze' });

export const TIERS = Object.freeze([
  { id: 'challenger', name: 'Challenger League', rank: 3, cap: 1800000, badgeGoal: 4, next: 'vanguard' },
  { id: 'vanguard', name: 'Vanguard League', rank: 2, cap: 2600000, badgeGoal: 6, next: 'sovereign' },
  { id: 'sovereign', name: 'Sovereign League', rank: 1, cap: 3600000, badgeGoal: null, next: null },
]);
export const tierById = (id) => TIERS.find((t) => t.id === id) || TIERS[0];

// ------------------------------------------------------------ schedule
// Campaign schedule (GDD §15.3, revised): the eight gym clubs and the eight
// ordinary clubs form two groups. Each season an ordinary club meets FOUR of
// the gyms (the other four the season after, so all eight take two seasons on
// any difficulty), alternating with games inside its own group, and never in
// week 1. Nine games and a bye in ten weeks. Within a group the five games
// come from a seven-round round robin that rotates by season.
import { GYM_CLUBS } from './gyms.js';

const GYM_ORDER = ['Harbor Sentinels', 'Sunfire Lions', 'Thunder Mesa', 'Canyon Crushers', 'Eastport Phantoms', 'Frostpeak Howlers', 'Ironpeak Rams', 'Palmetto Vipers']; // early → late
const ORDINARY_ORDER = ['Ember City Beasts', 'Stonehaven Titans', 'Glacier Guardians', 'Stormport Bolts', 'Northstar Wolves', 'Sundown Drakes', 'Ashford Hawks', 'Bayou Stalkers']; // starters first
const LATIN = [[0, 1, 2, 3], [1, 0, 3, 2], [2, 3, 0, 1], [3, 2, 1, 0]];
/** The gym an ordinary club meets in gym round r (0–3) of a season: starters take the easier half in odd seasons, the harder half in even ones. */
function gymFor(ordinaryIndex, round, season) {
  const half = ordinaryIndex < 4 ? 0 : 1, flip = (season - 1) % 2;
  const gymBlock = (half + flip) % 2;
  return GYM_ORDER[gymBlock * 4 + LATIN[ordinaryIndex % 4][round % 4]];
}
/** Circle-method round robin for eight clubs: 7 rounds of 4 pairings. */
function roundRobin(teams) {
  const t = teams.slice(); const rounds = [];
  for (let r = 0; r < 7; r++) { const pairs = []; for (let i = 0; i < 4; i++) pairs.push([t[i], t[7 - i]]); rounds.push(pairs); t.splice(1, 0, t.pop()); }
  return rounds;
}
const categoryOf = (a, b) => (divisionOf(a) === divisionOf(b) ? 'Division' : conferenceFor(divisionOf(a)) === conferenceFor(divisionOf(b)) ? 'Conference' : 'Interconference');

/** All fixtures for a season: [{week, bye, games:[{home, away, category}]}]. */
export function leagueSeasonFixtures(season) {
  season = Math.max(1, Math.floor(Number(season) || 1));
  const add = (list, home, away) => list.push({ home, away, category: categoryOf(home, away) });
  // Four gym rounds.
  const gymRounds = [];
  for (let r = 0; r < 4; r++) { const games = []; for (let i = 0; i < 8; i++) { const o = ORDINARY_ORDER[i], g = gymFor(i, r, season); const gymHome = (r + i + season) % 2 === 0; add(games, gymHome ? g : o, gymHome ? o : g); } gymRounds.push(games); }
  // Five in-group rounds (ordinary v ordinary and gym v gym), rotating through the seven-round robin by season.
  const rrO = roundRobin(ORDINARY_ORDER), rrG = roundRobin(GYM_ORDER);
  const groupRounds = [];
  for (let k = 0; k < 5; k++) { const idx = ((season - 1) * 5 + k) % 7; const games = []; for (const [[a, b], [c, d]] of rrO[idx].map((p, i) => [p, rrG[idx][i]])) { const flip = (season + k) % 2; add(games, flip ? a : b, flip ? b : a); add(games, flip ? c : d, flip ? d : c); } groupRounds.push(games); }
  // Game weeks alternate group / gym / group / gym …, so week 1 is never a badge game; the bye slots in as before.
  const order = [groupRounds[0], gymRounds[0], groupRounds[1], gymRounds[1], groupRounds[2], gymRounds[2], groupRounds[3], gymRounds[3], groupRounds[4]];
  const bye = 4 + (season - 1) % 5;
  const weeks = []; let gi = 0;
  for (let week = 1; week <= 10; week++) {
    if (week === bye) { weeks.push({ week, bye: true, games: [] }); continue; }
    weeks.push({ week, bye: false, games: order[gi++].map((g) => ({ ...g })) });
  }
  return weeks;
}

/** One team's view of the season. */
export function teamSchedule(season, team) {
  return leagueSeasonFixtures(season).map(({ week, bye, games }) => {
    if (bye) return { week, bye: true };
    const f = games.find((g) => g.home === team || g.away === team);
    return { week, bye: false, opponent: f.home === team ? f.away : f.home, home: f.home === team, category: f.category };
  });
}

// ------------------------------------------------------------ standings
export function blankRecord() { return { w: 0, l: 0, t: 0, pf: 0, pa: 0, divW: 0, divL: 0, confW: 0, confL: 0, h2h: {} }; }
export function applyResult(records, { home, away, homeScore, awayScore }) {
  const h = records[home], a = records[away];
  const sameDiv = divisionOf(home) === divisionOf(away), sameConf = conferenceFor(divisionOf(home)) === conferenceFor(divisionOf(away));
  h.pf += homeScore; h.pa += awayScore; a.pf += awayScore; a.pa += homeScore;
  const win = (x, y) => { x.w++; y.l++; if (sameDiv) { x.divW++; y.divL++; } if (sameConf) { x.confW++; y.confL++; } };
  if (homeScore > awayScore) { win(h, a); h.h2h[away] = (h.h2h[away] || 0) + 1; }
  else if (awayScore > homeScore) { win(a, h); a.h2h[home] = (a.h2h[home] || 0) + 1; }
  else { h.t++; a.t++; }
}
const pct = (r) => (r.w + r.l + r.t) ? (r.w + r.t * 0.5) / (r.w + r.l + r.t) : 0;
function compareTeams(records) {
  return (x, y) => {
    const a = records[x], b = records[y];
    if (pct(b) !== pct(a)) return pct(b) - pct(a);
    const h2h = (a.h2h[y] || 0) - (b.h2h[x] || 0); if (h2h) return -h2h;
    const divPct = (r) => (r.divW + r.divL) ? r.divW / (r.divW + r.divL) : 0; if (divPct(b) !== divPct(a)) return divPct(b) - divPct(a);
    const confPct = (r) => (r.confW + r.confL) ? r.confW / (r.confW + r.confL) : 0; if (confPct(b) !== confPct(a)) return confPct(b) - confPct(a);
    return (b.pf - b.pa) - (a.pf - a.pa) || x.localeCompare(y);
  };
}
export function standings(records) {
  const cmp = compareTeams(records);
  const divisions = Object.fromEntries(Object.entries(DIVISIONS).map(([d, teams]) => [d, [...teams].sort(cmp)]));
  const conferences = {};
  for (const conf of ['Aurora', 'Titan']) {
    const divs = Object.keys(DIVISIONS).filter((d) => conferenceFor(d) === conf);
    const champions = divs.map((d) => divisions[d][0]).sort(cmp);
    const others = divs.flatMap((d) => divisions[d].slice(1)).sort(cmp);
    conferences[conf] = { divisions: divs, champions, wildcards: others.slice(0, 2), seeds: [...champions, ...others.slice(0, 2)], order: [...divs.flatMap((d) => DIVISIONS[d])].sort(cmp) };
  }
  return { divisions, conferences, overall: [...ALL_TEAMS].sort(cmp) };
}

/** Playoff bracket: 8 teams. Week 11 semis (1v4, 2v3 per conference), week 12 conference finals, week 13 Beast Bowl. */
export function playoffRound(round, results, seedsByConf) {
  if (round === 1) return Object.entries(seedsByConf).flatMap(([conf, seeds]) => [{ conf, home: seeds[0], away: seeds[3], tag: `${conf} Semifinal` }, { conf, home: seeds[1], away: seeds[2], tag: `${conf} Semifinal` }]);
  if (round === 2) return ['Aurora', 'Titan'].map((conf) => { const winners = results.filter((r) => r.round === 1 && r.conf === conf).map((r) => r.winner); const seeds = seedsByConf[conf]; const ordered = winners.sort((a, b) => seeds.indexOf(a) - seeds.indexOf(b)); return { conf, home: ordered[0], away: ordered[1], tag: `${conf} Championship` }; });
  const finalists = results.filter((r) => r.round === 2).map((r) => r.winner);
  return [{ conf: 'League', home: finalists[0], away: finalists[1], tag: 'Beast Bowl' }];
}
