// League-wide careers (GDD §46, Phase 4): every monster the universe holds, read-only. The owner's roster, the 15 persistent
// clubs, the pools and waivers, and the legend stubs of decorated leavers. Career leaders over all of them, club directories,
// and the protected monsters (gym legendaries, the rival's signature) with their 20-season continuity. Nothing here writes.

import { monsterOverall, SPECIES_BY_ID } from '../data/monsters.js';
import { ALL_TEAMS, DIVISIONS, divisionOf } from '../data/league.js';
import { GYM_BY_CLUB } from '../data/gyms.js';
import { RECORD_CATEGORIES, withDerived, addInto, monsterLine } from './stats.js';
import { hasLeague, clubRoster, leagueClubs, isProtected } from './league-registry.js';

/** Every monster the universe holds: [{ m, club, where }] with where in roster | league | pool | waivers | legend. */
export function allMonsters(f, { legends = true } = {}) {
  const out = [];
  for (const m of f.roster || []) out.push({ m, club: f.club, where: 'roster' });
  if (hasLeague(f)) {
    for (const club of leagueClubs(f)) for (const m of clubRoster(f, club)) out.push({ m, club, where: 'league' });
    for (const m of f.league.waivers || []) out.push({ m, club: null, where: 'waivers' });
    if (legends) for (const s of Object.values(f.league.legends || {})) out.push({ m: s, club: s.lastClub || null, where: 'legend' });
  }
  for (const list of Object.values(f.pool || {})) for (const m of list) out.push({ m, club: null, where: 'pool' });
  return out;
}

/** Regular-season career totals of a monster or a legend stub (a stub keeps one combined career line). */
export function careerTotals(m) { return m.stats ? withDerived(monsterLine(m, 'career', 'reg')) : withDerived(m.career && !m.career.ev ? m.career : {}); }

/** Career leaders across the universe (regular season), top n per record category; `mine` keeps only the owner's roster. */
export function universeCareerLeaders(f, { n = 5, mine = false } = {}) {
  const everyone = mine ? allMonsters(f, { legends: false }).filter((x) => x.where === 'roster') : allMonsters(f);
  const rows = everyone.map((x) => ({ ...x, d: careerTotals(x.m) }));
  const out = {};
  for (const c of RECORD_CATEGORIES) {
    const top = rows.filter((x) => (x.d[c.key] || 0) > 0).sort((a, b) => b.d[c.key] - a.d[c.key] || (b.d.games || 0) - (a.d.games || 0)).slice(0, n);
    if (top.length) out[c.id] = top.map((x) => ({ value: x.d[c.key], id: x.m.id, name: x.m.name, position: x.m.position, species: x.m.species, type: x.m.type, club: x.club, where: x.where, games: x.d.games || 0 }));
  }
  return out;
}

/** The 16 clubs for the directory: record, division, overall, how many monsters, the protected ones. `overallOf(club)` is supplied by the caller (it builds teams). */
export function clubDirectory(f, { overallOf }) {
  return ALL_TEAMS.map((club) => {
    const rec = f.season?.records?.[club] || { w: 0, l: 0, t: 0 };
    const roster = club === f.club ? f.roster : (hasLeague(f) ? clubRoster(f, club) : []);
    const protectedOnes = roster.filter(isProtected).map((m) => ({ id: m.id, name: m.name, kind: m.legendary ? 'legendary' : 'signature' }));
    return { club, mine: club === f.club, rival: f.rivals?.[f.tier]?.team === club, gym: GYM_BY_CLUB[club] || null, division: divisionOf(club), record: rec, overall: overallOf(club), size: roster.length, protected: protectedOnes, persistent: club === f.club || (hasLeague(f) && roster.length > 0) };
  });
}

/** One club's roster for the hub, sorted by position group then overall, with tenure and contract read from the monster. */
export function clubRosterView(f, club, { year = f.season?.year || 1 } = {}) {
  const roster = club === f.club ? f.roster : clubRoster(f, club);
  const order = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];
  return roster.slice().sort((a, b) => order.indexOf(a.position) - order.indexOf(b.position) || monsterOverall(b) - monsterOverall(a)).map((m) => {
    const since = (m.history || []).filter((h) => h.club === club && h.to == null).map((h) => h.from).filter((y) => y != null)[0] ?? null;
    return { id: m.id, name: m.name, position: m.position, species: m.species, type: m.type, ovr: monsterOverall(m), age: m.age, level: m.level || 1, stage: m.stage || 0, injury: m.injury || null, since, ends: m.contract?.permanent ? null : (m.contract?.ends ?? null), permanent: !!m.contract?.permanent, protected: isProtected(m), kind: m.legendary ? 'legendary' : m.signature ? 'signature' : null, rookie: !!m.contract?.rookie, yearsPro: m.yearsPro ?? null, seasonsHere: since != null ? year - since + 1 : null };
  });
}

/** The protected monsters of the universe with their continuity: club, id, seasons there, career games, honours count. */
export function protectedMonsters(f) {
  const out = [];
  if (!hasLeague(f)) return out;
  for (const club of leagueClubs(f)) for (const m of clubRoster(f, club)) if (isProtected(m)) {
    const d = careerTotals(m); const honours = (m.career?.ev || []).filter((e) => ['award', 'champion', 'record'].includes(e.t)).length;
    out.push({ id: m.id, name: m.name, species: m.species, type: m.type, position: m.position, club, kind: m.legendary ? 'legendary' : 'signature', ovr: monsterOverall(m), age: m.age, stage: m.stage || 0, games: d.games || 0, honours, gym: GYM_BY_CLUB[club]?.badge || null, rival: f.rivals?.[f.tier]?.team === club });
  }
  return out.sort((a, b) => (b.kind === 'signature') - (a.kind === 'signature') || b.honours - a.honours);
}

/** The owner's games against one club this franchise, from the schedule history and the current season: W-L and the last result. */
export function headToHead(f, club) {
  const games = [];
  for (const h of f.history || []) for (const g of h.schedule || []) if (g.opponent === club && g.result) games.push({ year: h.year, week: g.week, won: !!g.result.won, score: `${g.result.playerScore}-${g.result.oppScore}` });
  if (!(f.history || []).some((h) => h.year === f.season?.year)) for (const g of f.season?.schedule || []) if (g.opponent === club && g.result) games.push({ year: f.season.year, week: g.week, won: !!g.result.won, score: `${g.result.playerScore}-${g.result.oppScore}` }); // a finished season is already in the history
  const w = games.filter((g) => g.won).length;
  return { w, l: games.length - w, games, last: games[games.length - 1] || null };
}

export { DIVISIONS, SPECIES_BY_ID, addInto };
