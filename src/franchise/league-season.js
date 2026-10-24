// The league's season transition for the 15 persistent AI clubs (GDD §42.6, Phase 3), in the owner's order of play:
//   at season end     career season-end events · contracts (re-sign or walk) · the cap (trim the unprotected)
//   at the next start ageing (legendaries and the rival's signature never age) · free agency after the owner (decision F) ·
//                     roster validation · the balance nudge (decision C) · the books roll over (startSeason)
// Every decision draws from the franchise generator in a fixed club order, so one seed gives one league. The owner's rules
// are reused as they are: renewalAsk, newContract, salaryFor, offseason(), positionNeeds, buildDepthChart.

import { generateMonster, monsterOverall, salaryFor, regionSpecies, ROSTER_MAX, ROSTER_MIN, FULL_ROSTER, clampAttr, resolveSpecies } from '../data/monsters.js';
import { POSITION_WEIGHTS, OFFENSE_BASE, DEFENSE_BASE, positionOf } from '../data/personnel.js';
import { REGIONS } from '../data/staff.js';
import { newContract, contractEnds, renewalAsk } from './contracts.js';
import { offseason } from './progression.js';
import { playerValue } from './trades.js';
import { careerSeasonEnd } from './career.js';
import { buildDepthChart, lineupProblems, GROUP_SLOTS, teamOverall } from './roster.js';
import { hasLeague, leagueClubs, clubRoster, clubRecord, isProtected, isAgeless, addToClub, clubPayroll, clubCapRoom, claimMonster } from './league-registry.js';
import { releaseFromClub, takeFromPool, weakestSpare, homeRegionOf } from './league.js';

export const BAND = 4;                 // the nudge acts beyond ±4 of the club's target (decision C)
export const NUDGE_SIGNINGS = 3;       // arrivals a weak club gets in one offseason
export const SIGNATURE_GROWTH = 2;     // the rival's signature monster: attribute points per offseason (GDD §15.8, kept), within potential
export const RESIGN_AGE_LIMIT = 32;    // a reserve of this age or more is not re-signed (decision A: attrition through the pools)
export const MIN_QUALITY = 45;

const FULL = Object.fromEntries(FULL_ROSTER);
const BASE = [...OFFENSE_BASE, ...DEFENSE_BASE, 'K'];

/** The clubs in a fixed order (determinism, §42.6). */
const order = (f) => leagueClubs(f).slice().sort();
/** Starters: the ids on the club's depth chart (base and package slots). */
function starterIds(roster) { return new Set(Object.values(buildDepthChart(roster)).filter(Boolean)); }
const median = (xs) => { const a = xs.slice().sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : 0; };

// ------------------------------------------------------------ season end
/** Career season-end events for every persistent monster (awards, records, season marks, title runs): the owner's writer, per club. */
export function leagueSeasonEnd(f, { year, awards, records, champion }) {
  if (!hasLeague(f)) return 0; let n = 0;
  for (const club of order(f)) n += careerSeasonEnd(clubRoster(f, club), { year, club, awards, records, champion });
  return n;
}

/**
 * Contracts (decision D): expiring deals are re-signed for starters and good value, otherwise the monster walks to his
 * region's pool. Then the cap: a club over it releases its lowest value per salary among the unprotected reserves until under,
 * never below the roster minimum. Protected monsters have permanent deals and cost nothing against the cap.
 */
export function leagueContracts(f, { year, cap }) {
  if (!hasLeague(f)) return null;
  const out = { resigned: 0, walked: 0, released: 0, overCap: [] };
  for (const club of order(f)) {
    const roster = clubRoster(f, club); const starters = starterIds(roster);
    const med = median(roster.map(monsterOverall));
    for (const m of roster) {
      if (isProtected(m) || !contractEnds(m, year)) continue;
      const ovr = monsterOverall(m); const starter = starters.has(m.id);
      const value = ovr >= med || ((m.age || 30) <= 25 && (m.potential || 0) >= ovr + 5);
      const keep = (starter || value) && !((m.age || 0) >= RESIGN_AGE_LIMIT && !starter);
      if (keep) { m.salary = renewalAsk(m).ask; m.contract = newContract(year + 1, 2); out.resigned++; }
      else { releaseFromClub(f, club, m.id, { year, reason: 'walked' }); out.walked++; }
    }
    out.released += trimToCap(f, club, { year, cap, starters: starterIds(clubRoster(f, club)) });
    if (clubCapRoom(f, club, cap) < 0) out.overCap.push(club);
  }
  return out;
}
/** Release the cheapest-to-lose unprotected reserves until the club fits under the cap (or sits at the roster minimum). */
function trimToCap(f, club, { year, cap, starters }) {
  let n = 0;
  while (clubCapRoom(f, club, cap) < 0 && clubRoster(f, club).length > ROSTER_MIN) {
    const spare = clubRoster(f, club).filter((m) => !isProtected(m) && !starters.has(m.id)).sort((a, b) => playerValue(a) / (a.salary || 1) - playerValue(b) / (b.salary || 1))[0]
      || clubRoster(f, club).filter((m) => !isProtected(m)).sort((a, b) => playerValue(a) / (a.salary || 1) - playerValue(b) / (b.salary || 1))[0];
    if (!spare) break;
    releaseFromClub(f, club, spare.id, { year, reason: 'released' }); n++;
  }
  return n;
}

// ------------------------------------------------------------ the next season
/**
 * Ageing (the owner's `offseason()` rules): the unprotected age, decline past 30 or grow to 23, and every salary is refreshed.
 * Legendaries and the rival's signature monster never age (owner's rules, 2026-10-23); the signature still gains
 * SIGNATURE_GROWTH points a season on what his position uses, never past his potential. This offseason's draftees enter
 * their first season (as the owner's rookies do).
 */
export function leagueAgeing(f, r, { year }) {
  if (!hasLeague(f)) return 0; let n = 0;
  for (const club of order(f)) {
    const roster = clubRoster(f, club);
    offseason(roster, r); // skips the ageless itself (progression.js)
    for (const m of roster) { if (m.rookie === year) { m.yearsPro = 0; m.age -= 1; } if (m.signature) growSignature(m); n++; }
  }
  return n;
}
/** +SIGNATURE_GROWTH to the attributes his position weighs most that are still below his potential (the existing caps apply). */
export function growSignature(m, points = SIGNATURE_GROWTH) {
  const w = Object.entries(POSITION_WEIGHTS[m.position] || POSITION_WEIGHTS.WR).sort((a, b) => b[1] - a[1]); let left = points;
  for (let pass = 0; pass < 4 && left > 0; pass++) for (const [k] of w) { if (left <= 0) break; if ((m.attributes[k] || 0) < (m.potential || 99)) { m.attributes[k] = clampAttr(m.attributes[k] + 1); left--; } }
  return points - left;
}

/** What a club still needs to reach the full 38: [position, missing] with the base slots that nobody can cover first. */
export function clubNeeds(f, club) {
  const roster = clubRoster(f, club); const chart = buildDepthChart(roster); const problems = lineupProblems(roster, chart);
  const count = {}; for (const m of roster) count[m.position] = (count[m.position] || 0) + 1;
  const needs = [];
  for (const slot of problems) needs.push([positionOf(slot), 1, true]);
  for (const [pos, n] of FULL_ROSTER) { const missing = n - (count[pos] || 0); if (missing > 0) needs.push([pos, missing, false]); }
  return needs.sort((a, b) => (b[2] - a[2]) || (b[1] / FULL[b[0]]) - (a[1] / FULL[a[0]]));
}

/**
 * Free agency after the owner (decision F): each club fills its needs from the pools first (the best fit it can afford), then
 * with generated regional veterans whose quality tracks the club's target (how the curve of difficulty is carried, decision C),
 * up to the full 38 and never over the cap. A club short of a legal lineup signs at the minimum quality regardless.
 */
export function leagueFreeAgency(f, r, { year, cap, targetOf }) {
  if (!hasLeague(f)) return null;
  const out = { fromPools: 0, generated: 0 };
  for (const club of order(f)) {
    let guard = 0;
    while (clubRoster(f, club).length < ROSTER_MAX && guard++ < 40) {
      const needs = clubNeeds(f, club); if (!needs.length) break;
      const [pos, , urgent] = needs[0]; const room = clubCapRoom(f, club, cap);
      // the pools first: the best monster at the position the club can afford
      const pooled = Object.values(f.pool || {}).flat().filter((m) => m.position === pos && salaryFor(m) <= room).sort((a, b) => monsterOverall(b) - monsterOverall(a))[0];
      if (pooled) { takeFromPool(f, pooled.id); pooled.salary = salaryFor(pooled); addToClub(f, club, pooled, { year, via: 'signed', contract: newContract(year, 2) }); out.fromPools++; continue; }
      const starterSlot = clubRoster(f, club).filter((m) => m.position === pos).length < (GROUP_SLOTS[pos]?.length || 1);
      const quality = targetOf(club) + (starterSlot ? 1 : -4) + r.int(5) - 2;
      const m = generateArrival(f, r, { club, position: pos, quality, room, floor: urgent });
      if (!m) break; // nothing affordable and nothing urgent: the club plays short of 38
      addToClub(f, club, m, { year, via: 'signed', contract: newContract(year, 2) }); out.generated++;
    }
  }
  return out;
}
/** A regional veteran at about `quality`, cheaper if the room does not allow it; null when nothing affordable and the need is not urgent. */
export function generateArrival(f, r, { club, position, quality, room, floor = false }) {
  const regions = Object.keys(REGIONS).sort(() => r.next() - 0.5); let regionName = regions[0], pool = [];
  for (const rn of regions) { const p = regionSpecies(rn, REGIONS[rn].types, 10).filter((s) => (s.position === position || s.secondary === position) && s.rarity !== 'legendary'); if (p.length) { regionName = rn; pool = p; break; } }
  if (!pool.length) return null;
  const sp = r.pick(pool);
  let q = Math.max(MIN_QUALITY, Math.round(quality)); let m = null;
  for (let i = 0; i < 12; i++) { m = generateMonster(r, { position, quality: q, species: sp.id, age: 24 + r.int(7) }); if (salaryFor(m) <= room || (floor && q <= MIN_QUALITY)) break; m = null; q = Math.max(MIN_QUALITY, q - 3); if (q === MIN_QUALITY && !floor && i > 6) break; }
  if (!m) return null;
  m.origin = regionName; m.salary = salaryFor(m); claimMonster(f, m, `${club}|arrival`);
  clubUniqueName(f, club, m);
  return m;
}
/** No two names on one club: the roster rule of createRoster, applied to an arrival. */
export function clubUniqueName(f, club, m) {
  const taken = new Set(clubRoster(f, club).filter((x) => x !== m).map((x) => x.name)); if (!taken.has(m.name)) return m;
  const base = resolveSpecies(m).name; for (const sfx of ['II', 'III', 'IV', 'V', 'VI', '7', '8', '9']) { const c = `${base} ${sfx}`; if (!taken.has(c)) { m.name = c; return m; } }
  return m;
}

/**
 * The balance nudge (decision C): a club more than BAND below its `clubQuality` target signs up to NUDGE_SIGNINGS generated
 * regional free agents at the target at its weakest starting positions (making room among its unprotected spares); a club more
 * than BAND above it develops at SLOW_XP for the coming season. No rating of an existing monster is ever edited.
 */
export function leagueNudge(f, r, { year, cap, targetOf, teamOf }) {
  if (!hasLeague(f)) return null;
  const out = { boosted: [], slowed: [], unchanged: 0 };
  for (const club of order(f)) {
    const c = clubRecord(f, club); const target = targetOf(club); let ovr = teamOverall(teamOf(club));
    c.strategy.slow = Math.max(0, ovr - (target + BAND)); if (c.strategy.slow) out.slowed.push(club); // how far above the band: the brake's strength
    let signed = 0;
    while (ovr < target - BAND && signed < NUDGE_SIGNINGS) {
      const pos = weakestStartingGroup(f, club); if (!pos) break;
      if (clubRoster(f, club).length >= ROSTER_MAX) { const spare = weakestSpare(f, club, { position: pos }); if (!spare) break; releaseFromClub(f, club, spare.id, { year, reason: 'released' }); }
      const m = generateArrival(f, r, { club, position: pos, quality: target + 2, room: clubCapRoom(f, club, cap), floor: false });
      if (!m) { // make cap room: the lowest value per salary among the spares goes
        const spare = weakestSpare(f, club, { position: null }); if (!spare || spare.position === pos) break; releaseFromClub(f, club, spare.id, { year, reason: 'released' });
        const again = generateArrival(f, r, { club, position: pos, quality: target + 2, room: clubCapRoom(f, club, cap), floor: false }); if (!again) break;
        addToClub(f, club, again, { year, via: 'signed', contract: newContract(year, 2) });
      } else addToClub(f, club, m, { year, via: 'signed', contract: newContract(year, 2) });
      signed++; ovr = teamOverall(teamOf(club));
    }
    c.strategy.boost = signed; if (signed) out.boosted.push(club); else if (!c.strategy.slow) out.unchanged++;
  }
  return out;
}
/** The position group whose starters are furthest below the club's own average: where one arrival lifts the team most. */
function weakestStartingGroup(f, club) {
  const roster = clubRoster(f, club); const avg = roster.reduce((s, m) => s + monsterOverall(m), 0) / (roster.length || 1);
  let worst = null;
  for (const [pos, slots] of Object.entries(GROUP_SLOTS)) {
    if (pos === 'K') continue;
    const at = roster.filter((m) => m.position === pos).sort((a, b) => monsterOverall(b) - monsterOverall(a)).slice(0, slots.length);
    const q = at.length ? at.reduce((s, m) => s + monsterOverall(m), 0) / at.length : avg - 10;
    const gap = avg - q + (slots.length - at.length) * 5;
    if (!worst || gap > worst.gap) worst = { pos, gap };
  }
  return worst?.pos || null;
}

/** Every club must be able to play: 26–38 monsters, a legal lineup, under the cap, protected monsters in place. Problem strings. */
export function validateClubs(f, { cap, clubs = null } = {}) {
  const p = []; if (!hasLeague(f)) return p;
  for (const club of clubs || order(f)) {
    const roster = clubRoster(f, club); const c = clubRecord(f, club);
    if (roster.length < ROSTER_MIN || roster.length > ROSTER_MAX) p.push(`${club}: ${roster.length} monsters`);
    const problems = lineupProblems(roster, buildDepthChart(roster)); if (problems.length) p.push(`${club}: no legal monster for ${problems.join(', ')}`);
    if (cap != null && clubCapRoom(f, club, cap) < 0) p.push(`${club}: ${clubPayroll(f, club)} payroll over the cap`);
    for (const id of c.protected) if (!roster.some((m) => m.id === id)) p.push(`${club}: protected ${id} missing`);
    for (const m of roster) { if (isProtected(m) && !m.contract?.permanent) p.push(`${club}: ${m.name} lost the permanent deal`); if (!isProtected(m) && !(m.contract?.ends >= 1)) p.push(`${club}: ${m.name} has no contract`); }
  }
  return p;
}
export const baseSlots = BASE;
export { isAgeless };
