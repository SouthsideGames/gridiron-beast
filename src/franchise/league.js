// League operations for the persistent AI clubs (GDD §42.6, Phase 3): how monsters join and leave AI rosters, the pools as the
// league's waiting room, and the exits (decision A: attrition first; decorated leavers keep a legend stub). The weekly and
// offseason passes (league-season.js) are built from these. No UI, no club-log lines: League News tells these stories (Phase 4).

import { monsterOverall, salaryFor, ROSTER_MAX } from '../data/monsters.js';
import { ELEMENT_REGIONS } from '../data/species.js';
import { REGIONS } from '../data/staff.js';
import { newContract } from './contracts.js';
import { ROOKIE_SCALE } from './draft.js';
import { addToClub, removeFromClub, clubRoster, isProtected, legendStub, hasLeague } from './league-registry.js';
import { GROUP_SLOTS } from './roster.js';

export const POOL_CAP = 12;            // monsters a regional pool holds (GDD §18.3), the oldest leaving first
export const POOL_WORTH = Object.freeze({ ovr: 52, age: 24 }); // an AI club's castoff enters a pool only if someone might want him

/** A monster's home region: where it was scouted, else its element's first region (as franchise.js homeRegion). */
export const homeRegionOf = (m) => m.origin || (ELEMENT_REGIONS[m.type] || [])[0] || Object.keys(REGIONS)[0];

/** Has this monster honours worth remembering after he leaves the league: an award, a title run, a record, a Hall of Fame line? */
export function isDecorated(f, m) {
  if ((m.career?.ev || []).some((e) => ['award', 'champion', 'record', 'hof'].includes(e.t))) return true;
  const R = f.records || {}; for (const book of [R.game, R.season]) for (const r of Object.values(book || {})) if (r && r.id === m.id) return true;
  for (const h of f.history || []) for (const w of Object.values(h.awards?.league || {})) if (w && w.id === m.id) return true;
  return false;
}

/**
 * A monster leaves the league (he is on no club and will not enter a pool): a decorated one leaves a legend stub so awards,
 * records and News still resolve; the rest are simply gone (pruned, §42.6). Returns 'legend' | 'gone'.
 */
export function leaveLeague(f, m, { year, club = null }) {
  if (!hasLeague(f)) return 'gone';
  if (isDecorated(f, m)) { f.league.legends[m.id] = legendStub(m, { year, club: club || m.history?.[m.history.length - 1]?.club || null }); return 'legend'; }
  return 'gone';
}

/**
 * A monster enters his region's pool (released, walked, or spilled from a club). The pool keeps POOL_CAP; the oldest entry
 * leaves the league. An AI club's castoff nobody would want skips the pool and leaves at once, so the owner's market is not
 * flooded with reserves (Phase 3 rule). Returns where he went: 'pool' | 'legend' | 'gone'.
 */
export function enterPool(f, m, { year, club = null, from = 'ai' }) {
  f.pool ||= {}; const region = homeRegionOf(m); m.origin = region; m.contract = null;
  const worth = from !== 'ai' || monsterOverall(m) >= POOL_WORTH.ovr || (m.age || 99) <= POOL_WORTH.age;
  if (!worth) return leaveLeague(f, m, { year, club });
  const list = (f.pool[region] ||= []); list.push(m);
  while (list.length > POOL_CAP) { const old = list.shift(); leaveLeague(f, old, { year, club: old.history?.[old.history.length - 1]?.club || null }); }
  return 'pool';
}

/** Take a monster out of whichever pool holds him. Returns the monster or null. */
export function takeFromPool(f, id) {
  for (const list of Object.values(f.pool || {})) { const i = list.findIndex((m) => m.id === id); if (i >= 0) return list.splice(i, 1)[0]; }
  return null;
}

/**
 * An AI club releases a monster: off the roster and into the pools (or out of the league). Never a protected monster: the
 * registry refuses, and so does this. Returns { ok, where } or { ok: false, reason }.
 */
export function releaseFromClub(f, club, id, { year, reason = 'released', silent = false } = {}) {
  const m = f.league?.monsters?.[id]; if (!m) return { ok: false, reason: 'Not on a league roster.' };
  if (isProtected(m)) return { ok: false, reason: `${m.name} is bound to ${club}.`, code: 'protected' };
  removeFromClub(f, club, id, { year, reason });
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
    const out = weakestSpare(f, club, { position: m.position }); if (!out) return { ok: false, reason: `${club} cannot make room.` };
    released = releaseFromClub(f, club, out.id, { year, reason: 'released', silent });
  }
  const salary = Math.round(salaryFor(m) * ROOKIE_SCALE / 100) * 100;
  const contract = newContract(year, 2); contract.rookie = true;
  m.joined = year; m.yearsPro = 0;
  addToClub(f, club, m, { year, via: 'drafted', contract, salary });
  return { ok: true, released };
}
