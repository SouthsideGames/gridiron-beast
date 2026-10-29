// Trade valuation (Task 5, GDD §19.6c): one set of principles for every deal in the league: the owner's proposals, the offers
// AI clubs make the owner, and the deals AI clubs make with each other. Nothing here draws a random number and nothing reads a
// result the club could not see: only ratings, ages, contracts, injuries and the roster it already has.
//
//   market value   what a monster is worth to anyone: overall first (the same slope the picks were calibrated against), a
//                  little for youth and potential, less with age, adjusted for his contract (years left, paid below or above
//                  his rating) and for his POSITION (how much a point of overall there moves the score; see POSITION_LEVERAGE).
//   roster worth   what the monsters on one club are worth TO THAT CLUB: each is counted at his market value times the role he
//                  would play there (a starter in full, the first backup less, a body on the end of the bench almost nothing).
//                  The same player is therefore worth more to a club that needs him and less to one that is deep: team need,
//                  starter against backup, surplus depth and the replacement a club has ready all come out of this one rule.
//   a deal's net   the change in a club's roster worth plus the picks it takes in less the picks it sends. A club only does a
//                  deal that is fair in market value AND that makes it better off by its own measure.

import { monsterOverall, salaryFor, ROSTER_MAX, ROSTER_MIN } from '../data/monsters.js';
import { GROUP_SLOTS } from './roster.js';

// ---------------------------------------------------------------- positional leverage
/**
 * How much a point of overall at a position is worth in a deal, relative to the average starting slot (1 = average).
 *
 * Source: `tools/position-leverage.mjs`, 2,000 paired games (the same two generated teams and the same seed with and without a
 * +10 overall boost to the starters of ONE group; docs/trading-second-pass/position-leverage-study.json). Margin per overall
 * point per slot, relative to the slot-weighted mean, came out (raw): QB 1.72 · RB 3.38 · WR 0.89 · TE 1.91 · OL 0.34 · DL 0.65 ·
 * LB 0.91 · CB 1.30 · S 0.71 · K 0.51, with standard errors of 0.09–0.28. The weights below are those figures
 *   1. shrunk toward 1 by their own noise (empirical Bayes: weight = τ² / (τ² + se²); nearly 1 here, the effects are well
 *      above the noise),
 *   2. taken at HALF STRENGTH (square root), because a price ratio of 9 : 1 between two positions is a rigid multiplier an owner
 *      could trade against, and one boost size in one engine is not a law of football (a judgement call, flagged for the owner),
 *   3. clamped to 0.6 – 1.6 (RB sits on the cap) so no position is worthless (kickers are 0.79) and none is a currency,
 *   4. rescaled so the slot-weighted mean is exactly 1: average prices do not move, only the shares between positions.
 */
export const POSITION_LEVERAGE = Object.freeze({ QB: 1.37, RB: 1.6, WR: 1.01, TE: 1.45, OL: 0.63, DL: 0.86, LB: 1.02, CB: 1.21, S: 0.9, K: 0.79 });

export const VALUE_PER_POINT = 4.2;     // value points per overall point above 50: the slope pickValue and the old playerValue share
export const ROLE_SHARE = Object.freeze([1, 0.45, 0.15, 0.05]); // starter · first backup · second backup · the rest of the bench
export const DEAL_RULES = Object.freeze({
  band: [0.85, 1.15],   // market value received / given, both ways (the owner's rule for AI–AI trades, 2026-10-24)
  minGain: 8,           // a club that goes shopping must come out at least this far ahead (about two overall points at an average slot)
  sellerFloor: 2,       // a club that sells must not come out behind: it needs this much to its good
  friction: 0.05,       // every club asks a little more than it gives: buying and selling the same monster loses value
  longInjuryWeeks: 3,   // a monster out this long no longer counts as a starter
});

export const slotsOf = (pos) => GROUP_SLOTS[pos]?.length || 1;
// A monster's overall is worked out from his attributes every time it is asked, and a deal search asks thousands of times about the
// same few hundred monsters. Inside `scoped` (read-only work: nothing changes a rating) each is worked out once.
let ovrCache = null, fairCache = null;
export const scoped = (fn) => { if (ovrCache) return fn(); ovrCache = new Map(); fairCache = new Map(); try { return fn(); } finally { ovrCache = null; fairCache = null; } };
const fairSalary = (m) => { if (!fairCache) return salaryFor(m); let v = fairCache.get(m); if (v === undefined) { v = salaryFor(m); fairCache.set(m, v); } return v; };
export const ovr = (m) => { if (!ovrCache) return monsterOverall(m); let v = ovrCache.get(m); if (v === undefined) { v = monsterOverall(m); ovrCache.set(m, v); } return v; };
/** Out for three weeks or more: valued, and ranked, as a reserve until he is back. */
export const isUnavailable = (m) => !!m?.injury && (m.injury.weeks || 0) >= DEAL_RULES.longInjuryWeeks;
const rankKey = (m) => (isUnavailable(m) ? -1 : ovr(m));

export const positionFactor = (pos) => POSITION_LEVERAGE[pos] ?? 1;

export function ageFactor(age) {
  if (age == null) return 1;
  if (age <= 22) return 1.15; if (age <= 24) return 1.1; if (age <= 28) return 1; if (age === 29) return 0.95;
  if (age === 30) return 0.88; if (age === 31) return 0.8; if (age === 32) return 0.7; return 0.6;
}
/** Years left on his deal and whether he is paid under or over his rating: a monster on a bargain is worth up to 10% more, one overpaid up to 10% less. */
export function contractFactor(m, year = 1) {
  const left = m.contract?.ends != null ? Math.max(0, m.contract.ends - year + 1) : 2;
  const term = left <= 0 ? 0.7 : left === 1 ? 0.9 : 1;
  const fair = fairSalary(m), paid = m.salary || fair;
  const surplus = Math.max(-0.2, Math.min(0.2, (fair - paid) / fair));
  return term * (1 + surplus * 0.5);
}
/** What a monster is worth to anyone, on the pick scale (a first-round pick is 58–100). */
export function marketValue(m, { year = 1 } = {}) {
  const o = ovr(m);
  const base = Math.max(6, (o - 50) * VALUE_PER_POINT);
  const upside = Math.max(0, (m.potential || o) - o) * (m.age != null && m.age <= 26 ? 0.6 : 0.2);
  return (base * ageFactor(m.age) + upside) * positionFactor(m.position) * contractFactor(m, year);
}

// ---------------------------------------------------------------- what a monster is worth to the club that holds him
const byPosition = (roster) => { const by = {}; for (const m of roster) (by[m.position] ||= []).push(m); return by; };
const order = (list) => list.sort((a, b) => (rankKey(b) - rankKey(a)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
/** The role a monster plays on a roster: 0 starter, 1 first backup, 2 second, 3 the rest. */
export function roleIn(roster, m) {
  const at = order(roster.filter((x) => x.position === m.position && x.id !== m.id).concat(m)); const i = at.indexOf(m); const n = slotsOf(m.position);
  return i < n ? 0 : Math.min(i - n + 1, 3);
}
/** What a whole roster is worth to its club. */
export function rosterWorth(roster, year = 1) {
  let w = 0;
  for (const list of Object.values(byPosition(roster))) { const n = slotsOf(list[0].position); order(list).forEach((m, i) => { w += marketValue(m, { year }) * ROLE_SHARE[i < n ? 0 : Math.min(i - n + 1, 3)]; }); }
  return w;
}
/** The roster after a deal: `give` leave, `get` arrive. */
export function rosterAfter(roster, { give = [], get = [] }) { const out = new Set(give.map((m) => m.id)); return roster.filter((m) => !out.has(m.id)).concat(get); }
/** How much better (or worse) off the club is, in market-value points, from the monsters alone. */
export function rosterNet(roster, { give = [], get = [] }, year = 1) { return rosterWorth(rosterAfter(roster, { give, get }), year) - rosterWorth(roster, year); }

// ---------------------------------------------------------------- legality
export const countsAt = (roster) => { const c = {}; for (const m of roster) c[m.position] = (c[m.position] || 0) + 1; return c; };
/**
 * Can this roster stand after the deal? At most ROSTER_MAX; not under ROSTER_MIN unless it already was and the deal does not
 * make it smaller; every position keeps its starters if it had them (the lineup stays legal). Returns problem codes.
 */
export function rosterProblems(before, after) {
  const p = [];
  if (after.length > ROSTER_MAX) p.push('rosterFull');
  if (after.length < ROSTER_MIN && after.length < before.length) p.push('rosterShort');
  const b = countsAt(before), a = countsAt(after);
  for (const pos of Object.keys(GROUP_SLOTS)) if ((a[pos] || 0) < Math.min(b[pos] || 0, slotsOf(pos))) { p.push(`short:${pos}`); break; }
  return p;
}
export const payrollOf = (roster) => roster.reduce((s, m) => s + (m.salary || salaryFor(m)), 0);
