// The league's season transition for the 15 persistent AI clubs (GDD §42.6, Phase 3), in the owner's order of play:
//   at season end     career season-end events · contracts (re-sign or walk) · the cap (trim the unprotected)
//   at the next start ageing (legendaries and the rival's signature never age) · free agency after the owner (decision F) ·
//                     roster validation · the balance nudge (decision C) · the books roll over (startSeason)
// Every decision draws from the franchise generator in a fixed club order, so one seed gives one league. The owner's rules
// are reused as they are: renewalAsk, newContract, salaryFor, offseason(), positionNeeds, buildDepthChart.

import { isGymClub } from '../data/gyms.js';
import { generateMonster, monsterOverall, salaryFor, regionSpecies, ROSTER_MAX, ROSTER_MIN, FULL_ROSTER, clampAttr, resolveSpecies } from '../data/monsters.js';
import { POSITION_WEIGHTS, OFFENSE_BASE, DEFENSE_BASE, positionOf } from '../data/personnel.js';
import { REGIONS } from '../data/staff.js';
import { newContract, leagueContract, contractEnds, renewalAsk } from './contracts.js';
import { offseason } from './progression.js';
import { playerValue } from './trades.js';
import { careerSeasonEnd } from './career.js';
import { buildDepthChart, lineupProblems, GROUP_SLOTS, teamOverall } from './roster.js';
import { hasLeague, leagueClubs, clubRoster, clubRecord, isProtected, isAgeless, addToClub, clubPayroll, clubCapRoom, claimMonster } from './league-registry.js';
import { releaseFromClub, takeFromPool, takeFromWaivers, weakestSpare, homeRegionOf } from './league.js';
import { publicOnset } from '../data/aging.js';
import { rosterPlan, leagueBench, horizonOf, qualifiesAsSuccessor, PLAN } from './roster-plan.js';
import { modeOf } from './strategy.js';

export const BAND = 4;                 // the nudge acts beyond ±4 of the club's target (decision C)
/** Task 6 Phase A-2 (D10b, owner 2026-10-30): the ordinary clubs' slowdown band and runaway-veteran band, separate from the gyms'
 *  (BAND) and the rival's (RIVAL_BAND); the lift below target − BAND is unchanged. The A-2 matched-seed comparison of +4 / +6 / +8
 *  found no width best on every count (docs/TASK6_PHASE_A2_REPORT.md), so both stay at today's +4 until the owner chooses. */
export const ORDINARY_SLOW_BAND = 4;
export const ORDINARY_RUNAWAY_BAND = 4;
export const RIVAL_BAND = 2;           // the rival's club is held closer: his signature monster's growth is capped by his potential (decision V), so without this the club drifted 3–4 under today's rival from season 6 (measured 2026-10-24)
export const NUDGE_SIGNINGS = 3;       // arrivals a weak club gets in one offseason
export const SIGNATURE_GROWTH = 2;     // the rival's signature monster: attribute points per offseason (GDD §15.8, kept), within potential
export const RESIGN_AGE_LIMIT = 32;    // v42.17 and before: a reserve of this age or more was not re-signed. Task 6 Phase B (R3) replaces it with RESERVE_PAST_ONSET; kept for reference
/** Task 6 Phase B (R3, owner 2026-10-30): no new deal for a reserve more than this many seasons past his public decline onset (position-aware). */
export const RESERVE_PAST_ONSET = 2;
/** R3 contract length by the public onset: 3 seasons up to onset − 2, 2 near it, 1 past it; an exceptional veteran (this far above
 *  the league's starters at his position, at most 2 past his onset) gets 2. */
export const EXCEPTIONAL_VETERAN = 6;
export function contractLength(m, { bench = null } = {}) {
  const h = horizonOf(m); if (h >= 2) return 3; if (h >= 0) return 2;
  const b = bench?.[m.position]; return h >= -2 && b != null && monsterOverall(m) >= b + EXCEPTIONAL_VETERAN ? 2 : 1;
}
/** Phase D (R3 by strategy mode, owner 2026-11-02): the R3 length, then the mode. A contender signs a starter past his onset for one
 *  season at a time (readiness now, no lock-in); a rebuilder commits long only to youth: a monster within 2 seasons of his onset
 *  gets at most 1 season, and a young monster (25 or under) with upside always gets 3. Compete and Retool keep the R3 length. */
export const REBUILD_UPSIDE = 3;
export function modeLength(len, m, mode) {
  if (mode === 'contend') return horizonOf(m) < 0 ? 1 : len;
  if (mode === 'rebuild') { if (horizonOf(m) < PLAN.ageingHorizon) return 1; if ((m.age || 30) <= 25 && (m.potential || 0) >= monsterOverall(m) + REBUILD_UPSIDE) return 3; }
  return len;
}
export const RUNAWAY_VETERAN_AGE = 27; // a club above its band lets expiring veterans of this age or more go (attrition, not rating edits)
export const MIN_QUALITY = 45;
/**
 * Calibration (decision C, measured 2026-10-23 against today's generator): persistent monsters gain levels as they play, so a
 * club that starts a season at today's strength ends it about 4–5 points above it in its first season and 1–2 later, while
 * today's rosters never move within a season. Each club's own in-season growth is measured (`strategy.pre` → `grew`) and
 * LIFT_SHARE of it is taken off the club's preseason target, so over a season the club is as strong as today's would be.
 * A new universe's rosters start CREATION_LIFT below today's year-1 quality for the same reason.
 */
export const LIFT_SHARE = 0.75;
export const DEFAULT_GROW = 3;
export const CREATION_LIFT = 3;

const FULL = Object.fromEntries(FULL_ROSTER);
const BASE = [...OFFENSE_BASE, ...DEFENSE_BASE, 'K'];

/** The clubs in a fixed order (determinism, §42.6). */
const order = (f) => leagueClubs(f).slice().sort();
/** Starters: the ids on the club's depth chart (base and package slots). */
function starterIds(roster) { return new Set(Object.values(buildDepthChart(roster)).filter(Boolean)); }
const median = (xs) => { const a = xs.slice().sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : 0; };
/** The league benchmark for the roster plan (D15): every club's starters at each position, the owner's included (observable). */
export function leagueBenchOf(f) { return leagueBench([...order(f).map((c) => clubRoster(f, c)), ...(Array.isArray(f.roster) ? [f.roster] : [])]); }
/** The ids of a club's designated successors (R1), derived now. */
export function successorIds(f, club, bench = leagueBenchOf(f)) { const roster = clubRoster(f, club); return new Set(rosterPlan(roster, bench, { starters: starterIds(roster) }).successors.keys()); }

// ------------------------------------------------------------ season end
/** Career season-end events for every persistent monster (awards, records, season marks, title runs): the owner's writer, per club. */
export function leagueSeasonEnd(f, { year, awards, records, champion }) {
  if (!hasLeague(f)) return 0; let n = 0;
  for (const club of order(f)) n += careerSeasonEnd(clubRoster(f, club), { year, club, awards, records, champion });
  return n;
}

/**
 * Contracts (decision D; Task 6 Phase B R3): every expiring deal is judged against the club's roster plan (roster-plan.js).
 *   starters      re-signed; one past his public decline onset only when he has no ready successor (otherwise he walks)
 *   successors    the designated successor always counts as value and is re-signed (not forced through: the cap still applies)
 *   reserves      re-signed for value (at or above the roster median, or young with potential), never past public onset + 2
 *   length        3 / 2 / 1 seasons by the public onset (contractLength), so expiries stagger
 * The runaway rule is unchanged except that it never lets a designated successor walk. Then the cap: a club over it releases its
 * lowest value per salary among the unprotected reserves until under, successors last, never below the roster minimum.
 */
export function leagueContracts(f, { year, cap, excessOf = null }) {
  if (!hasLeague(f)) return null;
  const out = { resigned: 0, walked: 0, released: 0, overCap: [], runaway: [], lengths: { 1: 0, 2: 0, 3: 0 }, byMode: {} };
  const bench = leagueBenchOf(f);
  for (const club of order(f)) {
    const roster = clubRoster(f, club); const starters = starterIds(roster);
    const plan = rosterPlan(roster, bench, { starters });
    const med = median(roster.map(monsterOverall));
    const runaway = (excessOf?.(club) || 0) > (isGymClub(club) ? BAND : ORDINARY_RUNAWAY_BAND); if (runaway) out.runaway.push(club); let letGo = 0;
    const mode = modeOf(f, club); const succOf = new Map(); for (const g of Object.values(plan.groups)) for (const r of g.rows) if (r.successor) succOf.set(r.starter.id, { m: r.successor, ready: r.ready });
    for (const m of roster.slice()) {
      if (isProtected(m) || !contractEnds(m, year)) continue;
      const ovr = monsterOverall(m); const starter = starters.has(m.id); const successor = plan.successors.has(m.id);
      const pastOnset = (m.age || 0) > publicOnset(m);
      const value = successor || ovr >= med || ((m.age || 30) <= 25 && (m.potential || 0) >= ovr + (mode === 'rebuild' ? REBUILD_UPSIDE : 5));
      let keep = starter ? !(pastOnset && plan.readyFor.has(m.id)) : value && (successor || (m.age || 0) <= publicOnset(m) + RESERVE_PAST_ONSET);
      // R3 by mode (Phase D; F2/F3 owner-approved 2026-11-03): a contender lets a veteran past onset go only to a ready successor at least as
      // good; a rebuilder lets him go to a ready successor, or to any successor once he is 2+ seasons past onset, and gives no new deal to a
      // reserve past onset who is not a designated successor
      { const pastBy = (m.age || 0) - publicOnset(m); const succ = succOf.get(m.id);
        if (starter && mode === 'contend') keep = !(pastOnset && succ?.ready && monsterOverall(succ.m) >= ovr);
        if (mode === 'rebuild' && pastOnset) keep = starter ? !(succ?.ready || (succ && pastBy >= 2)) : (successor ? keep : false); }
      // a club far above today's strength lets its expiring veterans walk (they are claimed within the league): attrition, decision A
      if (keep && runaway && !successor && (m.age || 0) >= RUNAWAY_VETERAN_AGE && clubRoster(f, club).length - letGo > ROSTER_MIN + 2) { keep = false; letGo++; }
      if (keep) { const len = modeLength(contractLength(m, { bench }), m, mode); m.salary = renewalAsk(m).ask; m.contract = leagueContract(year + 1, len); out.resigned++; out.lengths[len]++; out.byMode[mode] = (out.byMode[mode] || 0) + 1; }
      else { releaseFromClub(f, club, m.id, { year, reason: 'walked' }); out.walked++; }
    }
    out.released += trimToCap(f, club, { year, cap, starters: starterIds(clubRoster(f, club)), bench });
    if (clubCapRoom(f, club, cap) < 0) out.overCap.push(club);
  }
  return out;
}
/** Every club trimmed to the cap (after the ageing pass refreshed salaries, and after the nudge). Returns the clubs still over it at the roster floor. */
export function leagueTrim(f, { year, cap }) {
  if (!hasLeague(f)) return []; const over = []; let bench = null;
  for (const club of order(f)) { if (clubCapRoom(f, club, cap) < 0) trimToCap(f, club, { year, cap, starters: starterIds(clubRoster(f, club)), bench: (bench ||= leagueBenchOf(f)) }); if (clubCapRoom(f, club, cap) < 0) over.push(club); }
  return over;
}
/** Release the cheapest-to-lose unprotected reserves until the club fits under the cap (or sits at the roster minimum). Phase B:
 *  designated successors go only when no other reserve is left (successor protection in cap trims, where legal). */
function trimToCap(f, club, { year, cap, starters, bench = null }) {
  let n = 0; let succ = null;
  const perSalary = (a, b) => playerValue(a) / (a.salary || 1) - playerValue(b) / (b.salary || 1);
  while (clubCapRoom(f, club, cap) < 0 && clubRoster(f, club).length > ROSTER_MIN) {
    succ ||= successorIds(f, club, bench || (bench = leagueBenchOf(f)));
    const roster = clubRoster(f, club);
    const spare = roster.filter((m) => !isProtected(m) && !starters.has(m.id) && !succ.has(m.id)).sort(perSalary)[0]
      || roster.filter((m) => !isProtected(m) && !starters.has(m.id)).sort(perSalary)[0]
      || roster.filter((m) => !isProtected(m)).sort(perSalary)[0];
    if (!spare) break;
    releaseFromClub(f, club, spare.id, { year, reason: 'released', why: 'cap' }); n++;
  }
  return n;
}
/** A spare to release for cap room (the nudge, injury cover): weakestSpare, never a designated successor while another spare will do. */
function capSpare(f, club, { position = null, exclude = new Set() } = {}) {
  const succ = successorIds(f, club); const a = weakestSpare(f, club, { position, exclude: new Set([...exclude, ...succ]) }), b = weakestSpare(f, club, { position, exclude });
  if (!a || !b || a === b) return a || b;
  const roster = clubRoster(f, club); const topN = (m) => roster.filter((x) => x.position === m.position && monsterOverall(x) > monsterOverall(m)).length < (GROUP_SLOTS[m.position]?.length || 1);
  return topN(a) && !topN(b) ? b : a; // a successor goes before a starter
}

// ------------------------------------------------------------ the next season
/**
 * Ageing (the owner's `offseason()` rules, GDD §55): the unprotected age, decline by position past their onset or grow to 23, and every salary is refreshed.
 * Legendaries and the rival's signature monster never age (owner's rules, 2026-10-23); the signature still gains
 * SIGNATURE_GROWTH points a season on what his position uses, never past his potential. This offseason's draftees enter
 * their first season (as the owner's rookies do).
 */
export function leagueAgeing(f, r, { year, ctx = {} }) {
  if (!hasLeague(f)) return 0; let n = 0;
  for (const club of order(f)) {
    const roster = clubRoster(f, club);
    offseason(roster, r, ctx); // skips the ageless itself (progression.js); ctx: the old-save transition and last season's injuries (GDD §55)
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
  const out = { fromPools: 0, fromWaivers: 0, generated: 0 };
  for (const club of order(f)) {
    let guard = 0;
    while (clubRoster(f, club).length < ROSTER_MAX && guard++ < 40) {
      const needs = clubNeeds(f, club); if (!needs.length) break;
      const [pos, , urgent] = needs[0]; const room = clubCapRoom(f, club, cap);
      // the league's waivers, then the pools: the best monster at the position the club can afford
      const waived = (f.league.waivers || []).filter((m) => m.position === pos && salaryFor(m) <= room).sort((a, b) => monsterOverall(b) - monsterOverall(a))[0];
      if (waived) { takeFromWaivers(f, waived.id); waived.salary = salaryFor(waived); addToClub(f, club, waived, { year, via: 'signed', contract: newContract(year, 2), source: 'waivers' }); out.fromWaivers = (out.fromWaivers || 0) + 1; continue; }
      const pooled = Object.values(f.pool || {}).flat().filter((m) => m.position === pos && salaryFor(m) <= room).sort((a, b) => monsterOverall(b) - monsterOverall(a))[0];
      if (pooled) { takeFromPool(f, pooled.id); pooled.salary = salaryFor(pooled); addToClub(f, club, pooled, { year, via: 'signed', contract: newContract(year, 2), source: 'pool' }); out.fromPools++; continue; }
      const starterSlot = clubRoster(f, club).filter((m) => m.position === pos).length < (GROUP_SLOTS[pos]?.length || 1);
      const quality = targetOf(club) + (starterSlot ? 1 : -4) + r.int(5) - 2;
      const m = generateArrival(f, r, { club, position: pos, quality, room, floor: urgent });
      if (!m) break; // nothing affordable and nothing urgent: the club plays short of 38
      addToClub(f, club, m, { year, via: 'signed', contract: newContract(year, 2), source: 'generated' }); out.generated++;
    }
  }
  return out;
}
/**
 * R5 free-agency upgrades (Task 6 Phase C; owner's Group 3 decision D14, 2026-10-30), after the owner's free agency (decision F) and
 * the needs fill. A club whose starting group is weak (gap ≤ −4 against the league) or has a succession need, and that can afford
 * it, signs a pool monster who is at least UPGRADE_MIN better than the starter he replaces (weak group), or who qualifies as the
 * ageing starter's successor (succession need). Weak groups are served first. To make room it may release its weakest expendable
 * reserve: never a protected monster, a designated successor, the cover for an injured starter, or one whose release leaves the
 * position without its starters. Pools only: generated arrivals keep the anchor rule. UPGRADES_PER_OFFSEASON per club, and
 * CONTEND_UPGRADES for a club in Contend mode (Phase D, R5; the owner's free agency always comes first).
 */
export const UPGRADE_MIN = 3, UPGRADES_PER_OFFSEASON = 1, CONTEND_UPGRADES = 2;
export const upgradesAllowed = (mode) => (mode === 'contend' ? CONTEND_UPGRADES : UPGRADES_PER_OFFSEASON);
export function leagueUpgrades(f, { year, cap }) {
  if (!hasLeague(f)) return null; const out = { signed: [], released: 0 };
  const bench = leagueBenchOf(f);
  for (const club of order(f)) {
    let done = 0; const allowed = upgradesAllowed(modeOf(f, club));
    while (done < allowed) {
      const pick = bestUpgrade(f, club, bench, cap); if (!pick) break;
      if (pick.release) { releaseFromClub(f, club, pick.release.id, { year, reason: 'released', why: 'upgrade' }); out.released++; }
      const m = takeFromPool(f, pick.m.id); if (!m) break;
      m.salary = salaryFor(m); addToClub(f, club, m, { year, via: 'signed', contract: leagueContract(year, contractLength(m, { bench })), source: 'pool' });
      out.signed.push({ club, mode: modeOf(f, club), id: m.id, pos: m.position, ovr: monsterOverall(m), replaces: pick.starterOvr, kind: pick.kind, released: pick.release?.id || null }); done++;
    }
  }
  return out;
}
function bestUpgrade(f, club, bench, cap) {
  const roster = clubRoster(f, club); const starters = starterIds(roster); const plan = rosterPlan(roster, bench, { starters });
  const pool = Object.values(f.pool || {}).flat().filter((m) => !isProtected(m) && !m.injury);
  const room = clubCapRoom(f, club, cap); const full = roster.length >= ROSTER_MAX;
  const cover = new Set(); for (const [pos, slots] of Object.entries(GROUP_SLOTS)) { const at = roster.filter((m) => m.position === pos).sort((a, b) => monsterOverall(b) - monsterOverall(a)); if (at.slice(0, slots.length).some((m) => m.injury)) { const next = at.slice(slots.length).find((m) => !m.injury); if (next) cover.add(next.id); } }
  const expendable = (pos) => roster.filter((m) => !isProtected(m) && !starters.has(m.id) && !plan.successors.has(m.id) && !cover.has(m.id) && roster.filter((x) => x.position === m.position).length > (GROUP_SLOTS[m.position]?.length || 1))
    .sort((a, b) => playerValue(a) / (a.salary || 1) - playerValue(b) / (b.salary || 1))[0] || null;
  const afford = (m, pos) => { const sal = salaryFor(m); if (!full && sal <= room) return { release: null }; const rel = expendable(pos); if (!rel) return null; return sal <= room + (rel.salary || 0) ? { release: rel } : null; };
  const options = [];
  for (const [pos, g] of Object.entries(plan.groups)) {
    if (pos === 'K' || !g.rows.length) continue;
    if (g.weak) { const st = g.rows.map((r) => r.starter).sort((a, b) => monsterOverall(a) - monsterOverall(b))[0]; const so = monsterOverall(st);
      for (const m of pool) if (m.position === pos && monsterOverall(m) >= so + UPGRADE_MIN) { const a = afford(m, pos); if (a) options.push({ kind: 'weak', m, starterOvr: so, gain: monsterOverall(m) - so, ...a }); } }
    for (const r of g.rows) { if (!(r.horizon <= PLAN.ageingHorizon && !r.successor)) continue;
      for (const m of pool) if (m.position === pos && qualifiesAsSuccessor(m, r.starter)) { const a = afford(m, pos); if (a) options.push({ kind: 'succession', m, starterOvr: monsterOverall(r.starter), gain: monsterOverall(m) - monsterOverall(r.starter), ...a }); } }
  }
  options.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'weak' ? -1 : 1) || (b.gain - a.gain) || (a.m.id < b.m.id ? -1 : 1));
  return options[0] || null;
}
/** A regional veteran at about `quality`, cheaper if the room does not allow it; null when nothing affordable and the need is not urgent. */
export function generateArrival(f, r, { club, position, quality, room, floor = false }) {
  const regions = Object.keys(REGIONS).sort(() => r.next() - 0.5); let regionName = regions[0], pool = [];
  for (const rn of regions) { const p = regionSpecies(rn, REGIONS[rn].types, 10).filter((s) => s.position === position && s.rarity !== 'legendary'); if (p.length) { regionName = rn; pool = p; break; } }
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
export function leagueNudge(f, r, { year, cap, targetOf, teamOf, rival = null }) {
  if (!hasLeague(f)) return null;
  const out = { boosted: [], slowed: [], unchanged: 0 };
  for (const club of order(f)) {
    const c = clubRecord(f, club); const target = targetOf(club); let ovr = teamOverall(teamOf(club)); const band = club === rival ? RIVAL_BAND : BAND; const slowBand = club === rival ? RIVAL_BAND : isGymClub(club) ? BAND : ORDINARY_SLOW_BAND; // D10b: ordinary clubs are slowed only above the wider band
    c.strategy.slow = Math.max(0, ovr - (target + slowBand)); if (c.strategy.slow) out.slowed.push(club); // how far above the band: the brake's strength
    let signed = 0;
    while (ovr < target - band && signed < NUDGE_SIGNINGS) {
      const pos = weakestStartingGroup(f, club); if (!pos) break;
      if (clubRoster(f, club).length >= ROSTER_MAX) { const spare = weakestSpare(f, club, { position: pos }); if (!spare) break; releaseFromClub(f, club, spare.id, { year, reason: 'released' }); }
      const m = generateArrival(f, r, { club, position: pos, quality: target + 2, room: clubCapRoom(f, club, cap), floor: false });
      if (!m) { // make cap room: the lowest value per salary among the spares goes
        const spare = capSpare(f, club, { position: null }); if (!spare || spare.position === pos) break; releaseFromClub(f, club, spare.id, { year, reason: 'released' });
        const again = generateArrival(f, r, { club, position: pos, quality: target + 2, room: clubCapRoom(f, club, cap), floor: false }); if (!again) break;
        addToClub(f, club, again, { year, via: 'signed', contract: newContract(year, 2), source: 'generated' });
      } else addToClub(f, club, m, { year, via: 'signed', contract: newContract(year, 2), source: 'generated' });
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

/**
 * In-season cover (weekly): a club that cannot field a legal lineup after injuries signs cover at the position from the waivers
 * or the pools, else a replacement-level regional veteran, making room by releasing its weakest unprotected spare when full.
 * The owner faces the same rule through the forfeit (GDD §17.2); an AI club simply signs, as a real club would.
 */
export function leagueInjuryCover(f, r, { year, cap, targetOf }) {
  if (!hasLeague(f)) return 0; let signed = 0;
  for (const club of order(f)) {
    let guard = 0;
    while (guard++ < 6) {
      const roster = clubRoster(f, club); const problems = lineupProblems(roster, buildDepthChart(roster)); if (!problems.length) break;
      const pos = positionOf(problems[0]);
      if (roster.length >= ROSTER_MAX) { const spare = weakestSpare(f, club, { position: null, exclude: new Set(roster.filter((m) => m.position === pos).map((m) => m.id)) }); if (!spare) break; releaseFromClub(f, club, spare.id, { year, reason: 'released' }); }
      // cap room for at least a replacement-level deal: spares go first (never a starter at another short position, never the protected)
      const minDeal = 18000 + 280 * MIN_QUALITY + 2000; let trims = 0;
      while (clubCapRoom(f, club, cap) < minDeal && clubRoster(f, club).length > ROSTER_MIN && trims++ < 6) { const spare = capSpare(f, club, { position: null, exclude: new Set(clubRoster(f, club).filter((m) => m.position === pos).map((m) => m.id)) }); if (!spare) break; releaseFromClub(f, club, spare.id, { year, reason: 'released' }); }
      const room = clubCapRoom(f, club, cap);
      const fit = (m) => m.position === pos && !m.injury && salaryFor(m) <= room;
      const waived = (f.league.waivers || []).filter(fit).sort((a, b) => monsterOverall(b) - monsterOverall(a))[0];
      const pooled = waived ? null : Object.values(f.pool || {}).flat().filter(fit).sort((a, b) => monsterOverall(b) - monsterOverall(a))[0];
      let m = waived || pooled;
      if (m) { if (waived) takeFromWaivers(f, m.id); else takeFromPool(f, m.id); m.salary = salaryFor(m); }
      else m = generateArrival(f, r, { club, position: pos, quality: targetOf(club) - 8, room, floor: true });
      if (!m) break;
      addToClub(f, club, m, { year, via: 'signed', contract: newContract(year, 1), source: waived ? 'waivers' : pooled ? 'pool' : 'generated' }); signed++;
    }
  }
  return signed;
}

/** At a season's start: remember each club's strength, so its in-season growth can be measured at the end (calibration above). */
export function notePreseason(f, teamOf) { if (!hasLeague(f)) return; for (const club of order(f)) { const c = clubRecord(f, club); c.strategy.pre = teamOverall(teamOf(club)); } }
/** At a season's end: how much each club grew by playing. */
export function noteGrowth(f, teamOf) { if (!hasLeague(f)) return; for (const club of order(f)) { const c = clubRecord(f, club); if (c.strategy.pre != null) c.strategy.grew = teamOverall(teamOf(club)) - c.strategy.pre; } }
/** The preseason strength a club should open the coming season at: today's generated team for that season, less a share of what the club will gain by playing it. */
export function preseasonTarget(f, club, todayOverall) { const g = clubRecord(f, club)?.strategy?.grew; return todayOverall - LIFT_SHARE * (g == null ? DEFAULT_GROW : Math.max(0, g)); }

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
