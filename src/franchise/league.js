// League operations for the persistent AI clubs (GDD §42.6, Phase 3): how monsters join and leave AI rosters, the pools as the
// league's waiting room, and the exits (decision A: attrition first; decorated leavers keep a legend stub). The weekly and
// offseason passes (league-season.js) are built from these. No UI, no club-log lines: League News tells these stories (Phase 4).

import { honourEvents } from './career.js';
import { monsterOverall, salaryFor, ROSTER_MAX } from '../data/monsters.js';
import { ELEMENT_REGIONS } from '../data/species.js';
import { REGIONS } from '../data/staff.js';
import { newContract } from './contracts.js';
import { ROOKIE_SCALE } from './draft.js';
import { addToClub, removeFromClub, clubRoster, isProtected, legendStub, hasLeague, leagueEvent, moveIdentity } from './league-registry.js';
import { GROUP_SLOTS } from './roster.js';
import { noteReleased } from './fa-state.js';
import { t as $t } from '../text/index.js';

export const POOL_CAP = 12;            // monsters a regional pool holds (GDD §18.3), the oldest leaving first
export const POOL_WORTH = Object.freeze({ ovr: 52, age: 24, market: 60 }); // an AI club's castoff enters a pool only if someone might want him, and only at the owner's market grade (≤ 60): better ones go through the league's waivers
export const WAIVER_CAP = 40;
export const AI_POOL_SHARE = 3;           // AI castoffs a regional pool holds at most, so the owner's market stays about the size it is today

/** A monster's home region: where it was scouted, else its element's first region (as franchise.js homeRegion). */
export const homeRegionOf = (m) => m.origin || (ELEMENT_REGIONS[m.type] || [])[0] || Object.keys(REGIONS)[0];

/**
 * Has this monster honours worth remembering after he leaves the league: a league award, a record, a title run? Read from the
 * save's own records (award history, the records book, the champions and his season books), never from the Career Timeline,
 * which is a read-only presentation of the same facts (GDD §38) and must not change what the game does.
 */
export function isDecorated(f, m) {
  const R = f.records || {}; for (const book of [R.game, R.season]) for (const r of Object.values(book || {})) if (r && r.id === m.id) return true;
  for (const h of f.history || []) for (const w of Object.values(h.awards?.league || {})) if (w && w.id === m.id) return true;
  for (const w of Object.values(f.season?.awardsFinal?.winners || {})) if (w && w.id === m.id) return true;
  const books = [...(m.stats?.seasons || []), ...(m.stats?.season?.year != null ? [{ ...m.stats.season, team: null }] : [])];
  for (const h of f.history || []) if (h.champion) for (const b of books) if (b.year === h.year && (b.post?.games || 0) > 0 && (b.team ? b.team === h.champion : true) && (m.history || []).some((x) => x.club === h.champion && x.from <= h.year && (x.to == null || x.to >= h.year))) return true;
  return false;
}

/**
 * A monster leaves the league (he is on no club and will not enter a pool): a decorated one leaves a legend stub so awards,
 * records and News still resolve; the rest are simply gone (pruned, §42.6). Returns 'legend' | 'gone'.
 */
export function leaveLeague(f, m, { year, club = null }) {
  if (!hasLeague(f)) return 'gone';
  if (isDecorated(f, m)) {
    const last = club || m.history?.[m.history.length - 1]?.club || null;
    f.league.legends[m.id] = legendStub(m, { year, club: last });
    // A retirement (owner's rule, 2026-10-24): he leaves the active league for good and cannot return. Reported with his honours.
    leagueEvent(f, { kind: 'retire', club: last, honours: honoursData(f, m), ...moveIdentity(f, m) });
    return 'legend';
  }
  return 'gone';
}
/** "two-time MVP, a Beast Bowl champion, a league record" — from the save's own records. */
/** A monster's honours as data (Task 10: saved on the retirement event instead of a finished sentence, so the news follows the language). */
export function honoursData(f, m) {
  const ev = honourEvents(m); // Decision E: the honour ledger, merged with an older save's timeline
  const awards = {}; for (const e of ev) if (e.t === 'award') awards[e.x?.key] = (awards[e.x?.key] || 0) + 1;
  for (const h of f.history || []) for (const [k, w] of Object.entries(h.awards?.league || {})) if (w && w.id === m.id && !ev.some((e) => e.t === 'award' && e.y === h.year && e.x?.key === k)) awards[k] = (awards[k] || 0) + 1;
  const titles = ev.filter((e) => e.t === 'champion').length, records = ev.filter((e) => e.t === 'record').length;
  return Object.keys(awards).length || titles || records ? { awards, titles, records } : null;
}
/** The honours as words (read at display time). A string is an honours sentence saved before Task 10 and is shown as it was. */
export function honoursText(h) {
  if (!h) return ''; if (typeof h === 'string') return h;
  const parts = []; const label = { mvp: 'MVP', opoy: $t('franchise.offensive_monster_of_the_year'), dpoy: $t('franchise.defensive_monster_of_the_year'), smoy: $t('franchise.signature_monster_of_the_year'), oroy: $t('franchise.offensive_rookie_of_the_year'), droy: $t('franchise.defensive_rookie_of_the_year') };
  for (const [k, n] of Object.entries(h.awards || {})) if (label[k]) parts.push(`${n > 1 ? `${['', '', 'two', 'three', 'four', 'five'][n] || n}-time ` : ''}${label[k]}`);
  if (h.titles) parts.push(h.titles === 1 ? $t('franchise.a_beast_bowl_champion') : `${$t('franchise.time_beast_bowl_champion', { titles: h.titles })}`);
  if (h.records) parts.push(h.records === 1 ? $t('franchise.a_league_record') : `${h.records} league records`);
  return parts.join(', ');
}
export function honoursLine(f, m) { return honoursText(honoursData(f, m)); }

/**
 * A monster enters his region's pool (released, walked, or spilled from a club). The pool keeps POOL_CAP; the oldest entry
 * leaves the league. An AI club's castoff nobody would want skips the pool and leaves at once, so the owner's market is not
 * flooded with reserves (Phase 3 rule). Returns where he went: 'pool' | 'legend' | 'gone'.
 */
export function enterPool(f, m, { year, club = null, from = 'ai' }) {
  f.pool ||= {}; const region = homeRegionOf(m); m.origin = region; m.contract = null;
  const ovr = monsterOverall(m);
  if (from === 'ai' && ovr > POOL_WORTH.market && hasLeague(f)) return enterWaivers(f, m, { year, club }); // too good for the owner's market as it is today: the league claims him
  const worth = from !== 'ai' || ovr >= POOL_WORTH.ovr || (m.age || 99) <= POOL_WORTH.age;
  if (!worth) return leaveLeague(f, m, { year, club });
  const list = (f.pool[region] ||= []);
  if (from === 'ai') { const fromAi = list.filter((x) => x.poolVia === 'ai'); while (fromAi.length >= AI_POOL_SHARE) { const old = fromAi.shift(); list.splice(list.indexOf(old), 1); leaveLeague(f, old, { year, club: old.history?.[old.history.length - 1]?.club || null }); } m.poolVia = 'ai'; }
  list.push(m);
  while (list.length > POOL_CAP) { const old = list.shift(); leaveLeague(f, old, { year, club: old.history?.[old.history.length - 1]?.club || null }); }
  return 'pool';
}

/** The league's waivers: AI castoffs other AI clubs claim (weekly and in the offseason, needs first). The oldest spill out of the league. */
export function enterWaivers(f, m, { year, club = null }) {
  const w = (f.league.waivers ||= []); m.contract = null; w.push(m);
  while (w.length > WAIVER_CAP) { const old = w.shift(); leaveLeague(f, old, { year, club: old.history?.[old.history.length - 1]?.club || null }); }
  return 'waivers';
}
export function takeFromWaivers(f, id) { const w = f.league?.waivers || []; const i = w.findIndex((m) => m.id === id); return i >= 0 ? w.splice(i, 1)[0] : null; }
/** Take a monster out of whichever pool holds him. Returns the monster or null. */
export function takeFromPool(f, id) {
  for (const list of Object.values(f.pool || {})) { const i = list.findIndex((m) => m.id === id); if (i >= 0) return list.splice(i, 1)[0]; }
  return null;
}

/**
 * An AI club releases a monster: off the roster and into the pools (or out of the league). Never a protected monster: the
 * registry refuses, and so does this. Returns { ok, where } or { ok: false, reason }.
 */
export function releaseFromClub(f, club, id, { year, reason = 'released', silent = false, why = null } = {}) {
  const m = f.league?.monsters?.[id]; if (!m) return { ok: false, reason: $t('franchise.not_on_a_league_roster') };
  if (isProtected(m)) return { ok: false, reason: `${$t('franchise.is_bound_to', { name: m.name, club })}`, code: 'protected' };
  removeFromClub(f, club, id, { year, reason, why, quiet: silent }); if (reason === 'released') noteReleased(f, m, club); // Task 7 resolution 6 (owner and AI alike)
  const where = silent ? leaveLeague(f, m, { year, club }) : enterPool(f, m, { year, club, from: 'ai' });
  return { ok: true, where, monster: m };
}

/** The weakest monster an AI club could spare at a position (or anywhere): never protected, starters last. */
export function weakestSpare(f, club, { position = null, exclude = new Set() } = {}) {
  const roster = clubRoster(f, club).filter((m) => !isProtected(m) && !exclude.has(m.id));
  const at = position ? roster.filter((m) => m.position === position) : roster;
  const pool = at.length ? at : roster;
  const slots = (p) => GROUP_SLOTS[p]?.length || 1;
  // Depth beyond the starters first (sorted weakest first); a starter only when the whole group is backups-free.
  const byPos = {}; for (const m of clubRoster(f, club)) (byPos[m.position] ||= []).push(m);
  for (const list of Object.values(byPos)) list.sort((a, b) => monsterOverall(b) - monsterOverall(a));
  const isStarter = (m) => (byPos[m.position] || []).indexOf(m) < slots(m.position);
  const sorted = pool.slice().sort((a, b) => (isStarter(a) - isStarter(b)) || (monsterOverall(a) - monsterOverall(b)));
  return sorted[0] || null;
}

/**
 * A drafted rookie joins his AI club on a rookie deal (70% of market, two seasons). A full club makes room by releasing its
 * weakest spare at the rookie's position (to the pools; at the creation draft the displaced monster simply never existed,
 * `silent`). Returns { ok, released }.
 */
export function joinAsDraftee(f, club, m, { year, silent = false } = {}) {
  let released = null;
  if (clubRoster(f, club).length >= ROSTER_MAX) {
    const out = weakestSpare(f, club, { position: m.position }); if (!out) return { ok: false, reason: `${$t('franchise.cannot_make_room', { club })}` };
    released = releaseFromClub(f, club, out.id, { year, reason: 'released', silent, why: 'room' });
  }
  const salary = Math.round(salaryFor(m) * ROOKIE_SCALE / 100) * 100;
  const contract = newContract(year, 2); contract.rookie = true;
  m.joined = year; m.yearsPro = 0;
  addToClub(f, club, m, { year, via: 'drafted', contract, salary });
  return { ok: true, released };
}
