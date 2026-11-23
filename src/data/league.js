// League structure and the season schedule (32-team league, owner specification 2026-11-23).
//
// Thirty-two established clubs in two conferences (Veyra and Koruun), four divisions of four in each. A season is 14 games and
// one bye in 15 weeks: every club plays its three division rivals home and away (6), five clubs from the rest of its conference
// and three from the other conference. Those eight are drawn afresh each season from the franchise's seed, so the schedule is a
// football schedule first: nothing guarantees how many Gym Leader clubs a club meets. The 16-club league this replaces (nine
// games built around four gym games a season) is described in the GDD's history sections.
import { t as $t } from '../text/index.js';

export const CONFERENCES = Object.freeze({
  Veyra: Object.freeze(['Frostlands', 'Redrock', 'Golden Valley', 'Suncoast']),
  Koruun: Object.freeze(['Kingsport', 'Everwild', 'Greenheart', 'Azure Isles']),
});
export const CONFERENCE_NAMES = Object.freeze(Object.keys(CONFERENCES));
export const DIVISIONS = Object.freeze({
  Frostlands: ['Frostpeak Howlers', 'Glacier Guardians', 'Northstar Novas', 'Ironpeak Colossi'],
  Redrock: ['Stormport Bolts', 'Canyon Crushers', 'Sundown Drakes', 'Thunder Mesa Blitz'],
  'Golden Valley': ['Goldhaven Royals', 'Riverbend Rapids', 'Pinecrest Wardens', 'Skyvale Cyclones'],
  Suncoast: ['Emberfall Infernos', 'Coral Bay Tides', 'Cliffhaven Chargers', 'Palm Isle Mystics'],
  Kingsport: ['Stonehaven Bastions', 'Eastport Phantoms', 'Harbor Anchors', 'Ashford Cinders'],
  Everwild: ['Ember City Beasts', 'Bayou Stalkers', 'Sunfire Solars', 'Palmetto Wyrms'],
  Greenheart: ['Thornwood Wildroots', 'Silvergrove Arcanists', 'Mossvale Quakes', 'Fernhaven Wisps'],
  'Azure Isles': ['Aetheria Seers', 'Deepwater Chompers', 'Mistport Veils', 'Westhaven Pirates'],
});
/** The two starter divisions: no Gym Leader plays in either, and a new owner takes one of their eight rebuilding clubs. */
export const STARTER_DIVISIONS = Object.freeze(['Golden Valley', 'Greenheart']);
export const conferenceFor = (division) => CONFERENCE_NAMES.find((c) => CONFERENCES[c].includes(division)) || CONFERENCE_NAMES[0];
export const ALL_TEAMS = Object.values(DIVISIONS).flat();
const DIVISION_OF = Object.freeze(Object.fromEntries(Object.entries(DIVISIONS).flatMap(([d, ts]) => ts.map((t) => [t, d]))));
export const divisionOf = (team) => DIVISION_OF[team];
export const conferenceOf = (team) => conferenceFor(divisionOf(team));

// Colours, mascots and (in data/stadiums.js, RIVAL_GMS below, data/identities.js) stadium names, managers and playing styles of
// the sixteen clubs new to the game and the new nicknames of eight older ones are PROVISIONAL (marked `provisional: true`): the
// owner's specification names the clubs, and the approved identity sheet is not in the repository yet. Replace them here.
export const TEAM_META = Object.freeze({
  'Frostpeak Howlers': { abbr: 'FRO', color: '#7fb6ff', mascot: 'wolf' },
  'Glacier Guardians': { abbr: 'GLA', color: '#bfe8ff', mascot: 'bear' },
  'Northstar Novas': { abbr: 'NOR', color: '#8d9bff', mascot: 'nova', provisional: true },
  'Ironpeak Colossi': { abbr: 'IRO', color: '#c9c9c9', mascot: 'colossus', provisional: true },
  'Stormport Bolts': { abbr: 'STM', color: '#ffe36b', mascot: 'bolt' },
  'Canyon Crushers': { abbr: 'CAN', color: '#e09a5a', mascot: 'rock' },
  'Sundown Drakes': { abbr: 'SUN', color: '#ff8a5b', mascot: 'drake' },
  'Thunder Mesa Blitz': { abbr: 'THU', color: '#c288ff', mascot: 'blitz', provisional: true },
  'Goldhaven Royals': { abbr: 'GOL', color: '#e6b800', mascot: 'royal', provisional: true },
  'Riverbend Rapids': { abbr: 'RIV', color: '#4fb3d9', mascot: 'rapid', provisional: true },
  'Pinecrest Wardens': { abbr: 'PIN', color: '#5f9e6e', mascot: 'warden', provisional: true },
  'Skyvale Cyclones': { abbr: 'SKY', color: '#9ad4f5', mascot: 'cyclone', provisional: true },
  'Emberfall Infernos': { abbr: 'EMF', color: '#ff5533', mascot: 'inferno', provisional: true },
  'Coral Bay Tides': { abbr: 'COR', color: '#ff8fa3', mascot: 'tide', provisional: true },
  'Cliffhaven Chargers': { abbr: 'CLF', color: '#7fd8e8', mascot: 'charger', provisional: true },
  'Palm Isle Mystics': { abbr: 'PIS', color: '#c58cf0', mascot: 'mystic', provisional: true },
  'Stonehaven Bastions': { abbr: 'STO', color: '#9fd8c8', mascot: 'bastion', provisional: true },
  'Eastport Phantoms': { abbr: 'EAS', color: '#b9b5ff', mascot: 'ghost' },
  'Harbor Anchors': { abbr: 'HAR', color: '#6ec6ff', mascot: 'anchor', provisional: true },
  'Ashford Cinders': { abbr: 'ASH', color: '#d8c38a', mascot: 'cinder', provisional: true },
  'Ember City Beasts': { abbr: 'EMB', color: '#ff6b4a', mascot: 'beast' },
  'Bayou Stalkers': { abbr: 'BAY', color: '#8fd47a', mascot: 'gator' },
  'Sunfire Solars': { abbr: 'SNF', color: '#ffc14d', mascot: 'solar', provisional: true },
  'Palmetto Wyrms': { abbr: 'PAL', color: '#7be3b0', mascot: 'wyrm', provisional: true },
  'Thornwood Wildroots': { abbr: 'THO', color: '#7cba4a', mascot: 'root', provisional: true },
  'Silvergrove Arcanists': { abbr: 'SIL', color: '#c9cfe0', mascot: 'arcanist', provisional: true },
  'Mossvale Quakes': { abbr: 'MOS', color: '#a8a05a', mascot: 'quake', provisional: true },
  'Fernhaven Wisps': { abbr: 'FER', color: '#9fe6c0', mascot: 'wisp', provisional: true },
  'Aetheria Seers': { abbr: 'AET', color: '#ff8ae0', mascot: 'seer', provisional: true },
  'Deepwater Chompers': { abbr: 'DEE', color: '#3f7fd0', mascot: 'shark', provisional: true },
  'Mistport Veils': { abbr: 'MIS', color: '#b8c4d8', mascot: 'veil', provisional: true },
  'Westhaven Pirates': { abbr: 'WES', color: '#4fae7a', mascot: 'pirate', provisional: true },
});

/** A season: 14 games and one bye. The playoffs follow in the three weeks after. */
export const REG_GAMES = 14;
export const REG_WEEKS = 15;
export const PLAYOFF_ROUNDS = 4; // Wild Card, Divisional, Conference Championships, Beast Bowl (owner, 2026-11-23; three rounds before)
/** The round of the conference championships and of the Beast Bowl. */
export const CONFERENCE_ROUND = 3, FINAL_ROUND = 4;
/** Clubs of one conference in the playoffs: four division champions (seeds 1-4) and three wild cards (seeds 5-7). */
export const PLAYOFF_SEEDS = 7, WILD_CARDS = 3;
export const LAST_WEEK = REG_WEEKS + PLAYOFF_ROUNDS; // the Beast Bowl's week
/** The game mix of one season, per club: both games against each division rival, then the rest of the conference, then the other conference. */
export const SCHEDULE_MIX = Object.freeze({ division: 6, conference: 5, interconference: 3 });

/**
 * Clubs a new owner may take: the eight rebuilding clubs of the two starter divisions. They are established clubs on hard times,
 * not expansion teams. `record` is last season's (14 games): the club picker shows it, and the league's history
 * (franchise/preleague-history.js) gives these clubs exactly these records in the season before year 1.
 */
export const STARTER_CLUBS = Object.freeze([
  { name: 'Goldhaven Royals', record: '4-10' }, { name: 'Riverbend Rapids', record: '3-11' }, { name: 'Pinecrest Wardens', record: '5-9' }, { name: 'Skyvale Cyclones', record: '4-10' },
  { name: 'Thornwood Wildroots', record: '4-10' }, { name: 'Silvergrove Arcanists', record: '5-9' }, { name: 'Mossvale Quakes', record: '3-11' }, { name: 'Fernhaven Wisps', record: '4-10' },
]);

export const RIVAL_GMS = Object.freeze({ 'Glacier Guardians': 'Morgan Vale', 'Northstar Novas': 'Cameron Frost', 'Ironpeak Colossi': 'Jules Stone', 'Canyon Crushers': 'Alex Calder', 'Sundown Drakes': 'Riley Ash', 'Thunder Mesa Blitz': 'Blake Storm', 'Eastport Phantoms': 'Taylor Voss', 'Harbor Anchors': 'Jordan Shore', 'Ashford Cinders': 'Casey Finch', 'Bayou Stalkers': 'Drew Marsh', 'Sunfire Solars': 'Avery Sol', 'Palmetto Wyrms': 'Quinn Reed', 'Frostpeak Howlers': 'Sam Rime', 'Stormport Bolts': 'Devon Gale', 'Stonehaven Bastions': 'Harper Flint', 'Ember City Beasts': 'Rowan Blaze',
  // New clubs. Rook Tanner (Cliffhaven) is the owner's; the rest are provisional.
  'Cliffhaven Chargers': 'Rook Tanner', 'Goldhaven Royals': 'Harper Lane', 'Riverbend Rapids': 'Jesse Ford', 'Pinecrest Wardens': 'Rowan Pike', 'Skyvale Cyclones': 'Emery Vance', 'Emberfall Infernos': 'Dana Cole', 'Coral Bay Tides': 'Marin Shaw', 'Palm Isle Mystics': 'Indigo Hart', 'Thornwood Wildroots': 'Sage Alder', 'Silvergrove Arcanists': 'Lennox Wren', 'Mossvale Quakes': 'Hollis Grange', 'Fernhaven Wisps': 'Wren Calloway', 'Aetheria Seers': 'Noor Celeste', 'Deepwater Chompers': 'Finn Corrigan', 'Mistport Veils': 'Ellis Gray', 'Westhaven Pirates': 'Kit Teague' });

export const TIERS = Object.freeze([
  { id: 'challenger', name: $t('data.challenger_league'), rank: 3, cap: 1800000, badgeGoal: 4, next: 'vanguard' },
  { id: 'vanguard', name: $t('data.vanguard_league'), rank: 2, cap: 2600000, badgeGoal: 6, next: 'sovereign' },
  { id: 'sovereign', name: $t('data.sovereign_league'), rank: 1, cap: 3600000, badgeGoal: null, next: null },
]);
export const tierById = (id) => TIERS.find((t) => t.id === id) || TIERS[0];

// ------------------------------------------------------------ schedule
const categoryOf = (a, b) => (divisionOf(a) === divisionOf(b) ? 'Division' : conferenceOf(a) === conferenceOf(b) ? 'Conference' : 'Interconference');
/** A small deterministic generator (mulberry32) from a string. */
function seeded(key) {
  let h = 2166136261 >>> 0; for (const ch of String(key)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const next = () => { h |= 0; h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const shuffle = (list) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  return { next, shuffle, int: (n) => Math.floor(next() * n) };
}
const ROUND_ROBIN_4 = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
/** The three ways to split four divisions into two pairs. */
const DIVISION_PAIRINGS = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
/**
 * Give every game of a set of rounds a home side so that each club is at home in exactly half of them. The rounds are perfect
 * matchings, so every club has an even number of games here: walking each closed trail of the games and pointing it one way
 * round gives every club as many home games as away games (an Euler orientation).
 */
function balanceHomes(rounds) {
  const edges = rounds.flatMap((games, r) => games.map((g) => ({ r, a: g[0], b: g[1], used: false, home: null })));
  const at = new Map(); for (const e of edges) for (const t of [e.a, e.b]) { if (!at.has(t)) at.set(t, []); at.get(t).push(e); }
  const ptr = new Map([...at.keys()].map((t) => [t, 0]));
  for (const start of at.keys()) {
    let cur = start;
    for (;;) { const list = at.get(cur); let i = ptr.get(cur); while (i < list.length && list[i].used) i++; ptr.set(cur, i); if (i >= list.length) break; const e = list[i]; e.used = true; e.home = cur; cur = e.a === cur ? e.b : e.a; }
  }
  const out = rounds.map(() => []); for (const e of edges) out[e.r].push({ home: e.home, away: e.home === e.a ? e.b : e.a });
  return out;
}
const fixtureCache = new Map();
/**
 * All fixtures of a season: [{week, bye, games:[{home, away, category}]}], 15 weeks. `seed` is the franchise's seed: the same
 * seed and season always give the same schedule, and each season of a franchise is drawn afresh.
 *   6 division rounds   each division's round robin, played twice with the home side swapped
 *   5 conference rounds each pairs the conference's divisions two and two and matches their clubs one to one; a pairing used
 *                       twice in a season uses a different matching, so no club meets another twice
 *   3 other-conference rounds  each matches every division with one of the other conference, a different one each round
 * One week in the middle of the season is the league's bye.
 */
export function leagueSeasonFixtures(season, seed = 0) {
  season = Math.max(1, Math.floor(Number(season) || 1));
  const key = `${seed}|${season}`; if (fixtureCache.has(key)) return fixtureCache.get(key);
  const R = seeded(`gb-schedule|${key}`);
  const order = Object.fromEntries(Object.entries(DIVISIONS).map(([d, ts]) => [d, R.shuffle(ts)])); // each division's clubs in this season's order
  // Division rounds: three pairings, first leg then second leg with the home side swapped.
  const legs = R.shuffle([0, 1, 2]); const flip = R.int(2);
  const divisionRounds = [0, 1].flatMap((leg) => legs.map((k) => Object.values(order).flatMap((ts) => ROUND_ROBIN_4[k].map(([a, b], i) => ((k + i + leg + flip) % 2 ? { home: ts[a], away: ts[b] } : { home: ts[b], away: ts[a] })))));
  // Conference rounds: five of the six (pairing, shift) choices that never repeat a meeting. Each pairing appears once or twice.
  const pairingOrder = R.shuffle([0, 1, 2]); const confPlan = [...pairingOrder, ...pairingOrder.slice(0, 2)]; const shiftBase = [R.int(4), R.int(4), R.int(4)];
  const used = [0, 0, 0];
  const conferenceRounds = confPlan.map((pairing) => { const shift = (shiftBase[pairing] + 1 + used[pairing]++ * (1 + R.int(2))) % 4;
    return CONFERENCE_NAMES.flatMap((c) => { const divs = CONFERENCES[c]; return DIVISION_PAIRINGS[pairing].flatMap(([x, y]) => order[divs[x]].map((t, i) => [t, order[divs[y]][(i + shift) % 4]])); }); });
  // Second use of a pairing must not repeat the first use's shift: make them differ.
  { const seen = new Map(); confPlan.forEach((pairing, r) => { const sig = (g) => g.slice().sort().join('|'); const mine = new Set(conferenceRounds[r].map(sig)); const prev = seen.get(pairing);
      if (prev && [...mine].some((x) => prev.has(x))) { // same matching again: move one step along
        const divs0 = CONFERENCES[CONFERENCE_NAMES[0]]; const [x0, y0] = DIVISION_PAIRINGS[pairing][0]; const a0 = order[divs0[x0]][0]; const first = conferenceRounds[r].find((g) => g[0] === a0); const cur = order[divs0[y0]].indexOf(first[1]);
        conferenceRounds[r] = CONFERENCE_NAMES.flatMap((c) => { const divs = CONFERENCES[c]; return DIVISION_PAIRINGS[pairing].flatMap(([x, y]) => order[divs[x]].map((t, i) => [t, order[divs[y]][(i + cur + 1) % 4]])); }); }
      seen.set(pairing, new Set(conferenceRounds[r].map(sig))); }); }
  // Other-conference rounds: three different rotations of the four divisions, each with its own matching.
  const [A, B] = CONFERENCE_NAMES.map((c) => R.shuffle(CONFERENCES[c])); const rotations = R.shuffle([0, 1, 2, 3]).slice(0, 3);
  const interRounds = rotations.map((rot) => { const shift = R.int(4); return A.flatMap((d, i) => order[d].map((t, k) => [t, order[B[(i + rot) % 4]][(k + shift) % 4]])); });
  const crossRounds = balanceHomes([...conferenceRounds, ...interRounds]);
  const rounds = [...divisionRounds.map((games) => ({ games })), ...crossRounds.map((games) => ({ games }))];
  // Week order: shuffled, with a division round in the final week (the season ends on a rivalry game); the bye falls in weeks 6-10.
  let seq = R.shuffle(rounds.map((_, i) => i)); const lastDiv = seq.filter((i) => i < 6).pop(); seq = [...seq.filter((i) => i !== lastDiv), lastDiv];
  const bye = 6 + R.int(5); const weeks = []; let gi = 0;
  for (let week = 1; week <= REG_WEEKS; week++) {
    if (week === bye) { weeks.push({ week, bye: true, games: [] }); continue; }
    weeks.push({ week, bye: false, games: rounds[seq[gi++]].games.map((g) => ({ home: g.home, away: g.away, category: categoryOf(g.home, g.away) })) });
  }
  if (fixtureCache.size > 24) fixtureCache.clear();
  fixtureCache.set(key, weeks); return weeks;
}

/** One team's view of the season. */
export function teamSchedule(season, team, seed = 0) {
  return leagueSeasonFixtures(season, seed).map(({ week, bye, games }) => {
    if (bye) return { week, bye: true };
    const f = games.find((g) => g.home === team || g.away === team);
    return { week, bye: false, opponent: f.home === team ? f.away : f.home, home: f.home === team, category: f.category };
  });
}

// ------------------------------------------------------------ standings
export function blankRecord() { return { w: 0, l: 0, t: 0, pf: 0, pa: 0, divW: 0, divL: 0, confW: 0, confL: 0, h2h: {} }; }
/** Standings update. `winner` (a club name) settles a game whose football score is tied: the overtime Beast Clash decided it (GDD §26.3). Points for and against are always the football score. */
export function applyResult(records, { home, away, homeScore, awayScore, winner = null }) {
  const h = records[home], a = records[away];
  const sameDiv = divisionOf(home) === divisionOf(away), sameConf = conferenceFor(divisionOf(home)) === conferenceFor(divisionOf(away));
  h.pf += homeScore; h.pa += awayScore; a.pf += awayScore; a.pa += homeScore;
  const win = (x, y) => { x.w++; y.l++; if (sameDiv) { x.divW++; y.divL++; } if (sameConf) { x.confW++; y.confL++; } };
  const w = homeScore > awayScore ? home : awayScore > homeScore ? away : winner;
  if (w === home) { win(h, a); h.h2h[away] = (h.h2h[away] || 0) + 1; }
  else if (w === away) { win(a, h); a.h2h[home] = (a.h2h[home] || 0) + 1; }
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
  // The playoff field (owner, 2026-11-23): seven clubs a conference. The four division champions are seeds 1 to 4 and the three best
  // of the rest are the wild cards, seeds 5 to 7, each group ranked by the standings' own order and tiebreakers.
  for (const conf of CONFERENCE_NAMES) {
    const divs = CONFERENCES[conf];
    const champions = divs.map((d) => divisions[d][0]).sort(cmp);
    const order = [...divs.flatMap((d) => DIVISIONS[d])].sort(cmp);
    const wildcards = order.filter((t) => !champions.includes(t)).slice(0, WILD_CARDS);
    conferences[conf] = { divisions: [...divs], champions, wildcards, seeds: [...champions, ...wildcards], order };
  }
  return { divisions, conferences, overall: [...ALL_TEAMS].sort(cmp) };
}

/** Is this playoff game the Beast Bowl (the title game)? Conference semifinals and championships are not. */
export const isBeastBowlTag = (tag) => tag === 'Beast Bowl';
/**
 * The playoff bracket (owner, 2026-11-23): fourteen clubs, four rounds, thirteen games.
 *   1 Wild Card: in each conference 2 v 7, 3 v 6, 4 v 5; seed 1 rests.
 *   2 Divisional: the four survivors are reseeded; seed 1 hosts the lowest seed left, the other two meet at the higher seed's.
 *   3 Conference Championships: the higher seed hosts.
 *   4 Beast Bowl: the Veyra champion against the Koruun champion.
 * `results` are the rounds already played ({ round, conf, winner }); `seedsByConf[conf]` is the seven seeds in order.
 */
export function playoffRound(round, results, seedsByConf) {
  const bySeed = (conf) => (a, b) => seedsByConf[conf].indexOf(a) - seedsByConf[conf].indexOf(b);
  const winners = (r, conf) => results.filter((x) => x.round === r && x.conf === conf).map((x) => x.winner);
  if (round === 1) return CONFERENCE_NAMES.flatMap((conf) => { const s = seedsByConf[conf]; return [[1, 6], [2, 5], [3, 4]].map(([h, a]) => ({ conf, home: s[h], away: s[a], tag: `${conf} Wild Card` })); });
  if (round === 2) return CONFERENCE_NAMES.flatMap((conf) => { const alive = [seedsByConf[conf][0], ...winners(1, conf)].sort(bySeed(conf)); return [{ conf, home: alive[0], away: alive[3], tag: `${conf} Divisional` }, { conf, home: alive[1], away: alive[2], tag: `${conf} Divisional` }]; });
  if (round === 3) return CONFERENCE_NAMES.map((conf) => { const alive = winners(2, conf).sort(bySeed(conf)); return { conf, home: alive[0], away: alive[1], tag: `${conf} Championship` }; });
  const champs = CONFERENCE_NAMES.map((conf) => winners(3, conf)[0]);
  return [{ conf: 'League', home: champs[0], away: champs[1], tag: 'Beast Bowl' }];
}
/** The clubs with a bye in a round: seed 1 of each conference in the Wild Card round, nobody after. */
export const playoffByes = (round, seedsByConf) => (round === 1 ? CONFERENCE_NAMES.map((c) => seedsByConf[c][0]) : []);
/**
 * THE OLD BRACKET, kept for the league archive: the eight seasons before the owner arrives were played in it and stay as they
 * were (their champions are canon). Eight clubs, the four division champions of each conference. Semifinals (1v4, 2v3 per conference), then the
 * conference finals, then the Beast Bowl: three rounds.
 */
export function legacyPlayoffRound(round, results, seedsByConf) {
  if (round === 1) return Object.entries(seedsByConf).flatMap(([conf, seeds]) => [{ conf, home: seeds[0], away: seeds[3], tag: `${conf} Semifinal` }, { conf, home: seeds[1], away: seeds[2], tag: `${conf} Semifinal` }]);
  if (round === 2) return CONFERENCE_NAMES.map((conf) => { const winners = results.filter((r) => r.round === 1 && r.conf === conf).map((r) => r.winner); const seeds = seedsByConf[conf]; const ordered = winners.sort((a, b) => seeds.indexOf(a) - seeds.indexOf(b)); return { conf, home: ordered[0], away: ordered[1], tag: `${conf} Championship` }; });
  const finalists = results.filter((r) => r.round === 2).map((r) => r.winner);
  return [{ conf: 'League', home: finalists[0], away: finalists[1], tag: 'Beast Bowl' }];
}
