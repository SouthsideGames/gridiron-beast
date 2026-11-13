// Task 9: Hall of Fame Day. The annual election is held and sealed when a season closes (franchise.js); nobody outside the Hall
// Board knows the result until the owner attends the ceremony in the offseason. This module tells whether the ceremony is due,
// what it shows, and records that it was held. It reads the save and writes only two things: the year in the list of ceremonies
// held, and one League News item. It never touches a roster, a contract, training, health, the draft or the game's random numbers.
import { isArchived } from './lifecycle.js';
import { addLeagueNews } from './league-news.js';
import { productionStanding, candidateCase, VOTER_COUNT, MAX_NOMINEES } from './monster-hof-voting.js';
import { line as $L, lineParts as $P } from '../text/index.js';

const hall = (f) => f?.monsterHallOfFame || null;
const electionOf = (f, year) => (hall(f)?.elections || []).find((e) => e?.year === year) || null;
/** Was the ceremony of this election year held (or the season after it begun)? */
export const hallCeremonyHeld = (f, year) => (hall(f)?.ceremonySeenYears || []).includes(year);
/**
 * The election year whose result is still sealed: the season just finished, while its ceremony has not been held. Null once the
 * ceremony is held, once the next season starts (a season in play has no election of its own yet), or in an archived franchise.
 */
export function sealedElectionYear(f) {
  const s = f?.season; if (!s?.finished || isArchived(f)) return null;
  return electionOf(f, s.year) && !hallCeremonyHeld(f, s.year) ? s.year : null;
}
/** Hall of Fame Day is waiting: an offseason event the owner attends before the next season (or before retiring the franchise). */
export const hallCeremonyDue = (f) => sealedElectionYear(f) != null;
/** The elections the public knows about: every one except a sealed one. */
export const revealedElections = (f) => { const sealed = sealedElectionYear(f); return (hall(f)?.elections || []).filter((e) => e && e.year !== sealed); };

const facts = (f, row, standing) => {
  const c = (hall(f)?.candidates || []).find((x) => String(x.id) === String(row.id)) || null; const stub = f.league?.legends?.[row.id] || null;
  return { id: row.id, name: row.name, position: row.position, retiredYear: row.retiredYear,
    species: stub?.species || null, stage: stub?.stage || 0, type: stub?.type || null, lastClub: stub?.lastClub || null,
    clubs: (stub?.history || []).map((h) => ({ club: h.club, from: h.from, to: h.to })),
    seasons: c?.seasons ?? null, games: c?.games ?? null, titles: c?.honours?.titles ?? 0,
    awardsBy: { ...(c?.awardsBy || {}) }, awards: c?.honours?.awards ?? 0, recordsBy: { ...(c?.recordsBy || {}) }, records: c?.honours?.records ?? 0,
    career: stub?.career ? { ...stub.career } : null, standing: c ? standing.get(String(c.id)) ?? null : null,
    case: c ? candidateCase(c, standing.get(String(c.id)) ?? 0.5) : null };
};
/**
 * Everything the ceremony of one year shows, or null when that year held no election. The nominees are listed in name order, so
 * the list gives nothing away; votes appear only on the inductees.
 */
export function hallCeremony(f, year = f?.season?.year) {
  const election = electionOf(f, year); if (!election) return null;
  const standing = productionStanding((hall(f)?.candidates || []).filter((c) => c && c.retiredYear <= year));
  const nominees = (election.ballot || []).slice(0, MAX_NOMINEES).map((b) => facts(f, b, standing)).sort((a, b) => String(a.name).localeCompare(String(b.name)) || String(a.id).localeCompare(String(b.id)));
  const inductees = (election.inductees || []).map((x) => ({ ...facts(f, x, standing), votes: x.votes, voters: x.voters, inductedYear: x.inductedYear ?? year }));
  const before = (hall(f)?.elections || []).filter((e) => e.year < year).reduce((n, e) => n + (e.inductees || []).length, 0);
  return { year, seats: VOTER_COUNT, nominees, inductees, membersBefore: before, held: hallCeremonyHeld(f, year), sealed: sealedElectionYear(f) === year };
}

/** The League News item of a ceremony (one per year, whatever happens). */
export function hallNews(f, year) {
  const c = hallCeremony(f, year); if (!c) return [];
  const head = c.inductees.length ? $L('franchise.hall_of_fame_day_the_board_inducts', { n: c.inductees.length }) : c.nominees.length ? $L('franchise.hall_of_fame_day_no_nominee_reached') : $L('franchise.hall_of_fame_day_no_retired_monster');
  return [{ id: `${year}|hof`, year, week: 15, kind: 'hof', tier: 'major', icon: '🏛️', ...head,
    lines: c.inductees.map((x) => ({ mid: x.id, mname: x.name, ...$P(x.name, ' (', x.position || '', ') · ', $L('franchise.board_votes', { votes: x.votes, voters: x.voters })) })) }];
}
/**
 * Hold the ceremony: the result becomes public and the League News carries it. Safe to call again (a replay): the year is
 * recorded once and the news item is written once. Returns { ok, first } (`first` false on a replay).
 */
export function completeHallCeremony(f, year = f?.season?.year) {
  const h = hall(f); if (!h || !electionOf(f, year)) return { ok: false, first: false };
  if (!Array.isArray(h.ceremonySeenYears)) h.ceremonySeenYears = [];
  const first = !h.ceremonySeenYears.includes(year);
  if (first) { h.ceremonySeenYears.push(year); if (f.league) addLeagueNews(f, hallNews(f, year)); }
  return { ok: true, first };
}
