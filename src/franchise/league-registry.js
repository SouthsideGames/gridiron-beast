// The league registry (GDD §42.6, Phase 3): the 15 AI clubs' rosters as persistent monsters inside one franchise universe.
// Pure data functions over `f.league`; the game's own rules (development, contracts, the draft, the pools) act on these
// monsters exactly as they act on the owner's. Nothing here draws a random number except where an rng is passed in.
//
//   f.league = {
//     v, persistentFrom: { year, week },
//     ids: 'a1b2c3 d4e5f6 …'          every id ever issued in this universe (without the m_ prefix), so no id is ever reused
//     clubs: { [club]: { roster: [ids], protected: [ids], strategy: { slow, boost } } },
//     monsters: { [id]: monster },     the live AI monsters, one object each, never on two clubs
//     waivers: [monsters],             AI castoffs good enough that a club will claim them before the owner's market sees them
//     legends: { [id]: stub },         decorated monsters who left the league (§42.6 exits)
//     staffAllowance,                  the fixed staff cost an AI club carries against the cap (owner's decision, 2026-10-23)
//   }
//
// Protected monsters (owner's rules, 2026-10-23): a gym's legendary (`legendary: true`) and the rival GM's signature monster
// (`signature: true`) stay with their clubs for all 20 seasons. They are never traded, released, moved through free agency,
// aged or retired; their salary is exempt from the club's cap; everything else (games, XP, levels, evolution, injuries,
// statistics, career events) is the same as for any monster.

import { monsterOverall, resolveSpecies, salaryFor } from '../data/monsters.js';
import { hashString } from '../core/rng.js';
import { newContract } from './contracts.js';
import { rolloverMonster, addInto } from './stats.js';

export const LEAGUE_VERSION = 1;
export const PERMANENT_CONTRACT = Object.freeze({ permanent: true });

export const hasLeague = (f) => !!(f && f.league && f.league.clubs && f.league.monsters);
/** A gym legendary or the rival's signature monster: bound to its club for the life of the universe. */
export const isProtected = (m) => !!(m && (m.legendary || m.signature));
/** Any legendary monster, the owner's included: no ageing and no age-related decline (owner's rule, 2026-10-23). */
export function isLegendaryMonster(m) { if (!m) return false; if (m.legendary) return true; try { return resolveSpecies(m)?.rarity === 'legendary'; } catch { return false; } }
/** Exempt from the ageing pass: every legendary, and the rival's signature monster. */
export const isAgeless = (m) => isLegendaryMonster(m) || !!m?.signature;

// ------------------------------------------------------------ ids
const sets = new WeakMap(); // f.league → { len, set }: the parsed id set, rebuilt when the stored string changed under us
const bare = (id) => (typeof id === 'string' && id.startsWith('m_') ? id.slice(2) : String(id));
function idSet(L) {
  const str = L.ids || ''; const c = sets.get(L);
  if (c && c.len === str.length) return c.set;
  const set = new Set(str ? str.split(' ') : []); sets.set(L, { len: str.length, set }); return set;
}
/** Is this id already issued in the universe? */
export function idIssued(f, id) { return hasLeague(f) ? idSet(f.league).has(bare(id)) : false; }
/** Record an id as issued. Returns false when it already was. */
export function registerId(f, id) {
  if (!hasLeague(f)) return false; const L = f.league; const set = idSet(L); const b = bare(id);
  if (set.has(b)) return false;
  set.add(b); L.ids = L.ids ? `${L.ids} ${b}` : b; sets.set(L, { len: L.ids.length, set }); return true;
}
/** A fresh id from the generator that no monster in this universe has ever had. */
export function issueId(f, rng) {
  for (let i = 0; i < 64; i++) { const id = `m_${rng.seed().toString(36)}`; if (!idIssued(f, id)) { registerId(f, id); return id; } }
  for (let n = 0; ; n++) { const id = `m_${hashString(`${rng.seed()}|${n}`).toString(36)}`; if (!idIssued(f, id)) { registerId(f, id); return id; } }
}
/**
 * Claim a freshly generated monster's id. On a clash the monster is re-keyed deterministically (from its old id and the salt)
 * and the old id returned, so the caller can re-key anything already pointing at it. Returns null when nothing changed.
 */
export function claimMonster(f, m, salt = '') {
  if (!hasLeague(f) || !m?.id) return null;
  if (registerId(f, m.id)) return null;
  const from = m.id;
  for (let n = 0; ; n++) { const id = `m_${hashString(`${from}|${salt}|${n}`).toString(36)}`; if (registerId(f, id)) { m.id = id; return { from, to: id }; } }
}
/** Record ids that exist already (the owner's monsters, pools, classes): never re-keyed, only remembered. */
export function noteExistingIds(f, monsters) { let n = 0; for (const m of monsters || []) if (m?.id && registerId(f, m.id)) n++; return n; }

// ------------------------------------------------------------ clubs and rosters
export const clubRecord = (f, club) => (hasLeague(f) ? f.league.clubs[club] || null : null);
export function clubRoster(f, club) { const c = clubRecord(f, club); if (!c) return []; const M = f.league.monsters; return c.roster.map((id) => M[id]).filter(Boolean); }
export const leagueClubs = (f) => (hasLeague(f) ? Object.keys(f.league.clubs) : []);
export function findInLeague(f, id) {
  if (!hasLeague(f) || id == null) return null;
  const m = f.league.monsters[id]; if (m) { const club = Object.keys(f.league.clubs).find((c) => f.league.clubs[c].roster.includes(id)) || null; return { m, where: 'league', club }; }
  const w = (f.league.waivers || []).find((x) => x.id === id); if (w) return { m: w, where: 'waivers', club: null };
  const s = f.league.legends[id]; return s ? { m: s, where: 'legend', club: s.lastClub || null } : null;
}
/** The club a registry monster plays for, or null. */
export function clubOf(f, id) { if (!hasLeague(f)) return null; for (const [club, c] of Object.entries(f.league.clubs)) if (c.roster.includes(id)) return club; return null; }

/**
 * Put a monster on a club. `year` and `via` write the history line and the contract (a rookie deal, a free-agent deal or the
 * permanent one for protected monsters). The monster must not be on another club: callers remove it first.
 */
export function addToClub(f, club, m, { year, via = 'signed', contract = null, salary = null } = {}) {
  const c = clubRecord(f, club); if (!c) throw new Error(`No such league club: ${club}`);
  if (f.league.monsters[m.id] && f.league.monsters[m.id] !== m) throw new Error(`Monster id ${m.id} is already held by another object in the league.`);
  for (const [other, oc] of Object.entries(f.league.clubs)) if (other !== club && oc.roster.includes(m.id)) throw new Error(`${m.name} is on ${other} already.`);
  f.league.monsters[m.id] = m; registerId(f, m.id);
  if (!c.roster.includes(m.id)) c.roster.push(m.id);
  if (isProtected(m)) { if (!c.protected.includes(m.id)) c.protected.push(m.id); m.contract = { ...PERMANENT_CONTRACT }; }
  else m.contract = contract || newContract(year, 2);
  m.salary = salary ?? m.salary ?? salaryFor(m); delete m.poolVia;
  (m.history ||= []); const last = m.history[m.history.length - 1];
  if (!(last && last.club === club && last.to == null)) m.history.push({ club, from: year, to: null, reason: via });
  return m;
}
/** Take a monster off a club (it stays known to the universe: the caller sends it to the pools, the owner, or the legends). */
export function removeFromClub(f, club, id, { year, reason = 'released' } = {}) {
  const c = clubRecord(f, club); if (!c) return null;
  const m = f.league.monsters[id]; if (!m || !c.roster.includes(id)) return null;
  if (isProtected(m)) throw Object.assign(new Error(`${m.name} is bound to ${club} for the life of this franchise.`), { code: 'protected' });
  c.roster = c.roster.filter((x) => x !== id); delete f.league.monsters[id];
  const last = (m.history ||= [])[m.history.length - 1]; if (last && last.club === club && last.to == null) { last.to = year; last.reason = reason; } else m.history.push({ club, from: year, to: year, reason });
  m.contract = null;
  return m;
}

// ------------------------------------------------------------ the cap for an AI club (decision D, with the protected exemption)
/** What an AI club's monsters cost against the cap: protected monsters are exempt (owner's rule, 2026-10-23). */
export function clubPayroll(f, club) { return clubRoster(f, club).reduce((s, m) => s + (isProtected(m) ? 0 : (m.salary || salaryFor(m))), 0); }
/** The room an AI club has: the tier cap less the fixed staff allowance less its counted payroll. */
export function clubCapRoom(f, club, cap) { return cap - (f.league.staffAllowance || 0) - clubPayroll(f, club); }

// ------------------------------------------------------------ building and checking the registry
/**
 * Build the registry from the AI rosters the game would field today (GDD §42.6 migration, `persistentFrom`). `teamOf(club)`
 * returns today's team for a club (its roster is taken as is: ids, names, levels, evolutions, the legendary and the signature);
 * `existing` lists every monster already in the save whose id must stay (the owner's roster, pools, market, classes, past
 * draftees); `tables` is the current season's league table, whose rows open each monster's season book (decision J: earlier
 * seasons stay in the tables). Contracts are staggered so renewals spread over two offseasons. Returns re-keyed ids.
 */
export function captureLeague(f, { clubs, teamOf, year, week, existing = [], tableRows = null, staffAllowance = 0 }) {
  f.league = { v: LEAGUE_VERSION, persistentFrom: { year, week }, ids: '', clubs: {}, monsters: {}, waivers: [], legends: {}, staffAllowance };
  noteExistingIds(f, existing);
  const rekeyed = [];
  for (const club of clubs) {
    f.league.clubs[club] = { roster: [], protected: [], strategy: { slow: 0, boost: 0, pre: null, grew: null } };
    const roster = teamOf(club).roster;
    roster.forEach((m, i) => {
      const r = claimMonster(f, m, `${club}|${year}|${i}`); if (r) rekeyed.push({ ...r, club });
      delete m.star; // a generated "face of the club" marker: meaningless once monsters are real
      m.fatigue ||= 0; m.injury ||= null; m.yearsPro ??= Math.max(0, (m.age || 22) - 22);
      const s = rolloverMonster(m, { year, team: club }); s.log = [];
      const row = tableRows?.(club, r ? r.from : m.id); if (row) { const { id: _i, name: _n, type: _t, species: _s, position: _p, age: _a, yearsPro: _y, team: _tm, ...nums } = row; addInto(s.season.reg, nums); }
      const contract = isProtected(m) ? null : newContract(year - (i % 2), 2); // half the deals end this season, half next
      addToClub(f, club, m, { year, via: 'persistent', contract, salary: m.salary || salaryFor(m) }); // tenure before the registry is table-only (decision J)
    });
  }
  return { rekeyed };
}

/** Everything that must hold for a registry, as problem strings (empty when sound). */
export function verifyLeague(f, { clubs = null, rosterMin = 26, rosterMax = 38 } = {}) {
  const p = []; if (!hasLeague(f)) return ['no league registry'];
  const L = f.league; const seen = new Map();
  const names = clubs || Object.keys(L.clubs);
  for (const club of names) {
    const c = L.clubs[club]; if (!c) { p.push(`${club}: no club record`); continue; }
    if (c.roster.length < rosterMin || c.roster.length > rosterMax) p.push(`${club}: ${c.roster.length} monsters`);
    for (const id of c.roster) {
      const m = L.monsters[id]; if (!m) { p.push(`${club}: roster id ${id} resolves to nothing`); continue; }
      if (m.id !== id) p.push(`${club}: ${id} holds a monster whose id is ${m.id}`);
      if (seen.has(id)) p.push(`${id} is on ${seen.get(id)} and ${club}`); seen.set(id, club);
      if (!idIssued(f, id)) p.push(`${club}: ${id} was never issued`);
      if (isProtected(m) && !c.protected.includes(id)) p.push(`${club}: ${m.name} is protected but not listed`);
      if (isProtected(m) && !m.contract?.permanent) p.push(`${club}: ${m.name} is protected without the permanent contract`);
      if (!isProtected(m) && !(m.contract?.ends >= 1)) p.push(`${club}: ${m.name} has no contract`);
      if (!(m.salary > 0)) p.push(`${club}: ${m.name} salary ${m.salary}`);
    }
    for (const id of c.protected) if (!c.roster.includes(id)) p.push(`${club}: protected ${id} is not on the roster`);
  }
  for (const id of Object.keys(L.monsters)) if (!seen.has(id)) p.push(`${id} is in the registry but on no club`);
  for (const w of L.waivers || []) { if (seen.has(w.id)) p.push(`${w.id} is on waivers and on ${seen.get(w.id)}`); if (!idIssued(f, w.id)) p.push(`waived ${w.id} was never issued`); }
  return p;
}

/** The compact record a decorated monster leaves behind when he leaves the league (§42.6 exits). */
export function legendStub(m, { year, club, honours = [] }) {
  const s = m.stats || {}; const career = addInto(addInto({}, s.career?.reg), s.career?.post);
  return { id: m.id, name: m.name, species: m.species, position: m.position, type: m.type, stage: m.stage || 0, ovr: monsterOverall(m), age: m.age, left: year, lastClub: club, honours, career, ev: (m.career?.ev || []).filter((e) => ['award', 'champion', 'record', 'hof'].includes(e.t)) };
}
