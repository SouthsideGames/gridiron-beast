// Task 7 — the free-agency state block and its migration (schema 9; specification "Persistence and integrity"; audit resolutions 2,
// 3 and 5; owner decisions D3 and D6).
//
// `f.freeAgency` holds everything Task 7 persists: the league year, the offseason step records, the market's negotiation state,
// offers (with their reserved first-year charge), transaction locks, the legacy legendary deadline and the lineup-repair record.
// It is additive: a save without it is a pre-Task-7 save (schema 8) and gets it, once, the first time this build reads it.
//
// When the new system begins (D3, resolution 3):
//   new franchise                 its first offseason is a Task 7 offseason (activeFrom = 1)
//   save opened during a season   the offseason that follows this season is the first Task 7 offseason (activeFrom = this year)
//   save opened in an offseason   that offseason finishes under the old flow, draft included, with nothing rewound; the next one is
//                                 the first Task 7 offseason (activeFrom = this year + 1)
// The legendary compliance deadline is the start of the season after the first complete Task 7 offseason (`complianceFrom`).
import { hasLeague, leagueClubs, clubRoster } from './league-registry.js';
import { positionOf } from '../data/personnel.js';
import { overLimit } from './fa-legendary.js';
import { t as $t } from '../text/index.js';

export const FA_VERSION = 1;

/** The state block for a franchise that has none yet. `fresh`: a franchise being created now. */
export function initFreeAgency(f, { fresh = false } = {}) {
  const year = f.season?.year ?? 1;
  const midOffseason = !fresh && !!f.season?.finished;
  const activeFrom = fresh ? year : midOffseason ? year + 1 : year;
  const fa = {
    v: FA_VERSION, activeFrom, complianceFrom: activeFrom + 1, // season `complianceFrom` may not start with an over-limit club
    leagueYear: year, steps: {}, period: null, market: {}, offers: {}, seq: 0,
    locks: { signed: {}, released: {}, traded: {} },
    log: [],
  };
  if (!fresh) fa.legacy = { at: { year, week: f.season?.week ?? null, offseason: midOffseason }, legends: legendCensus(f) };
  return fa;
}
/** Every club's legendary excess when the system began (a record for the compliance gate; nothing is removed). */
export function legendCensus(f) {
  const out = {}; const o = overLimit(f.roster); if (o.offense || o.defense) out[f.club] = o;
  if (hasLeague(f)) for (const c of leagueClubs(f)) { const x = overLimit(clubRoster(f, c)); if (x.offense || x.defense) out[c] = x; }
  return out;
}

/**
 * Give a save its Task 7 block (idempotent). Needs the league registry: a franchise still on the generated rosters (a registry
 * migration that was rolled back) keeps the old free agency until it has one. Returns { ok, created, repairs }.
 */
export function ensureFreeAgency(f, { fresh = false, schema = 10 } = {}) { // schema 10: Task 8 (franchise.SCHEMA_VERSION; not imported, to keep this module free of the cycle)
  if (!f || typeof f !== 'object' || !hasLeague(f)) return { ok: false, created: false };
  if (f.freeAgency?.v) { if (f.schemaVersion !== schema) f.schemaVersion = schema; return { ok: true, created: false }; }
  f.freeAgency = initFreeAgency(f, { fresh });
  const repairs = repairLineups(f); if (!fresh) f.freeAgency.repairs = repairs;
  f.schemaVersion = schema;
  return { ok: true, created: true, repairs };
}
export const hasFreeAgency = (f) => !!f?.freeAgency?.v;
/** Is the offseason that follows season `year` run by the Task 7 system? */
export const task7Offseason = (f, year = f?.season?.year) => hasFreeAgency(f) && year >= f.freeAgency.activeFrom && year !== f.freeAgency.lastSeason; // `lastSeason`: the 20th season closed, no offseason follows (lifecycle.js)
/** The league year in force: the season's year, until Free Agency Period 1 of the following offseason opens. */
export const leagueYear = (f) => f?.freeAgency?.leagueYear ?? f?.season?.year ?? 1;

/**
 * The single-position lineup repair (D6, resolution 2): manual depth-chart entries and position orders that put a monster in another
 * position's slot are removed (the coach's automatic chart then fills the slot from that position). No monster is released, moved
 * or changed. Idempotent. Returns { manual, depth, removed: [{ slot|group, id }] }.
 */
export function repairLineups(f) {
  const byId = new Map((f.roster || []).map((m) => [m.id, m])); const removed = [];
  for (const [slot, id] of Object.entries(f.lineupManual || {})) { const m = byId.get(id); if (m && positionOf(slot) !== m.position) { removed.push({ slot, id, name: m.name, position: m.position }); delete f.lineupManual[slot]; } }
  let depth = 0;
  for (const [group, ids] of Object.entries(f.depth || {})) {
    if (!Array.isArray(ids)) continue;
    const keep = ids.filter((id) => { const m = byId.get(id); const ok = !m || m.position === group; if (!ok) { removed.push({ group, id, name: m.name, position: m.position }); depth++; } return ok; });
    f.depth[group] = keep;
  }
  return { manual: removed.length - depth, depth, removed };
}

// ------------------------------------------------------------ transaction locks (audit resolution 6; owner and AI alike)
const L = (f) => f.freeAgency.locks;
/** A free agent signed in league year `ly` cannot be traded until the next offseason (the next league year). */
export function noteSigned(f, m) { if (hasFreeAgency(f)) L(f).signed[m.id] = leagueYear(f); }
export function noteReleased(f, m, club) { if (hasFreeAgency(f)) L(f).released[m.id] = { club, ly: leagueYear(f) }; }
export function noteTraded(f, m, from) { if (hasFreeAgency(f)) L(f).traded[m.id] = { from, ly: leagueYear(f) }; }
/** Why `m` cannot be traded now, or null. */
export function tradeLock(f, m) {
  if (!hasFreeAgency(f) || !m) return null; const s = L(f).signed[m.id];
  return s != null && !signingUnlocked(f, s) ? `${$t('franchise.signed_as_a_free_agent_and', { name: m.name })}` : null;
}
/** A signing in league year `ly` unlocks when the offseason after season `ly` opens (the season closes). */
const signingUnlocked = (f, ly) => { const y = f.season?.year ?? 0; return y > ly || (y === ly && !!f.season?.finished); };
/** Why `club` cannot take `m` now (release-and-re-sign, or a return to the club that traded him), or null. */
export function returnLock(f, m, club) {
  if (!hasFreeAgency(f) || !m) return null; const ly = leagueYear(f);
  const r = L(f).released[m.id]; if (r && r.club === club && r.ly === ly) return `${$t('franchise.released_this_league_year_and_cannot', { club, name: m.name })}`;
  const t = L(f).traded[m.id]; if (t && t.from === club && t.ly === ly) return `${$t('franchise.was_traded_away_by_this_league', { name: m.name, club })}`;
  return null;
}
/** Drop locks from finished league years (kept small; called when a league year turns over). */
export function pruneLocks(f) {
  if (!hasFreeAgency(f)) return; const ly = leagueYear(f); const k = L(f);
  for (const id of Object.keys(k.signed)) if (signingUnlocked(f, k.signed[id])) delete k.signed[id];
  for (const t of ['released', 'traded']) for (const id of Object.keys(k[t])) if (k[t][id].ly < ly) delete k[t][id];
}
