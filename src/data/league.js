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
export const STARTER_CLUBS = Object.freeze([
  { name: 'Ember City Beasts', record: '2–12' }, { name: 'Stonehaven Titans', record: '1–13' },
  { name: 'Frostpeak Howlers', record: '3–11' }, { name: 'Stormport Bolts', record: '2–12' },
]);

export const RIVAL_GMS = Object.freeze({ 'Glacier Guardians': 'Morgan Vale', 'Northstar Wolves': 'Cameron Frost', 'Ironpeak Rams': 'Jules Stone', 'Canyon Crushers': 'Alex Calder', 'Sundown Drakes': 'Riley Ash', 'Thunder Mesa': 'Blake Storm', 'Eastport Phantoms': 'Taylor Voss', 'Harbor Sentinels': 'Jordan Shore', 'Ashford Hawks': 'Casey Finch', 'Bayou Stalkers': 'Drew Marsh', 'Sunfire Lions': 'Avery Sol', 'Palmetto Vipers': 'Quinn Reed', 'Frostpeak Howlers': 'Sam Rime', 'Stormport Bolts': 'Devon Gale', 'Stonehaven Titans': 'Harper Flint', 'Ember City Beasts': 'Rowan Blaze' });

export const TIERS = Object.freeze([
  { id: 'challenger', name: 'Challenger League', rank: 3, cap: 1800000, badgeGoal: 4, next: 'vanguard' },
  { id: 'vanguard', name: 'Vanguard League', rank: 2, cap: 2600000, badgeGoal: 6, next: 'sovereign' },
  { id: 'sovereign', name: 'Sovereign League', rank: 1, cap: 3600000, badgeGoal: null, next: null },
]);
export const tierById = (id) => TIERS.find((t) => t.id === id) || TIERS[0];

// ------------------------------------------------------------ schedule
const divisionPairings = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
function conferenceOffsets(season) {
  const recent = [-100, -100, -100, -100];
  let selected = [0, 1];
  for (let y = 1; y <= season; y++) {
    const ranked = [0, 1, 2, 3].sort((a, b) => recent[a] - recent[b] || ((a - y + 4) % 4) - ((b - y + 4) % 4));
    selected = y >= 3 && y % 3 === 0 ? [ranked[0], ranked[2]] : ranked.slice(0, 2);
    for (const k of selected) recent[k] = y;
  }
  return selected;
}

/** All fixtures for a season: [{week, bye, games:[{home, away, category}]}]. */
export function leagueSeasonFixtures(season) {
  season = Math.max(1, Math.floor(Number(season) || 1));
  const rounds = Array.from({ length: 9 }, () => []);
  const add = (round, home, away, category) => rounds[round].push({ home, away, category });
  for (const teams of Object.values(DIVISIONS)) {
    for (let r = 0; r < 6; r++) for (const [i, j] of divisionPairings[r % 3]) { const home = r < 3 ? teams[i] : teams[j], away = r < 3 ? teams[j] : teams[i]; add(r, home, away, 'Division'); }
  }
  const offsets = conferenceOffsets(season);
  for (const [first, second] of [['North', 'West'], ['East', 'South']]) {
    const aa = DIVISIONS[first], bb = DIVISIONS[second];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) { const other = bb[(i + offsets[r]) % 4]; add(6 + r, r === 0 ? aa[i] : other, r === 0 ? other : aa[i], 'Conference'); }
  }
  const aurora = [...DIVISIONS.North, ...DIVISIONS.West], titan = [...DIVISIONS.East, ...DIVISIONS.South];
  for (let i = 0; i < 8; i++) { const a = aurora[i], b = titan[(i + season - 1) % 8]; add(8, season % 2 === 1 ? a : b, season % 2 === 1 ? b : a, 'Interconference'); }
  const bye = 4 + (season - 1) % 5;
  const shift = (season - 1) % 9;
  const weeks = [];
  for (let week = 1; week <= 10; week++) {
    if (week === bye) { weeks.push({ week, bye: true, games: [] }); continue; }
    const round = (week - (week > bye ? 2 : 1) + shift) % 9;
    weeks.push({ week, bye: false, games: rounds[round].map((g) => ({ ...g })) });
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
