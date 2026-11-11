// Task 7 remediation R1/R4 (owner approval 2026-11-05): how an AI club values a free agent, by its Task 6 strategy mode, instead of
// by overall alone. Pure functions; no state, no randomness.
//
//   value = overall
//         + potential weight (the AI draft's own Task 6 Phase D weights: Contend 0.10, Compete and Retool 0.20, Rebuild 0.35) × (potential − 70)
//         − age weight × the seasons he is inside the ageing horizon (Task 6 roster plan: within 2 seasons of his public onset, or past it)
//         − cost weight × his ask in tens of thousands of credits
//         + readiness bonus (Contend: the AI draft's READY_BONUS) when he would start now
//         + gym element bonus (R4) when he shares a gym's element, a tie-break that never outweighs a real difference
//         + identity tilt (Task 8 D7, identities.js IDENTITY_TILT, PROVISIONAL): an identity position and a scheme fit, at most 1.5
//
//   Rebuild  young monsters, potential, long-term value: the largest potential and age weights.
//   Retool   current play balanced with younger replacements: half the Rebuild age weight, some cost sense.
//   Compete  ability, affordability and needs: overall, a small age weight and the largest cost weight.
//   Contend  immediate help: readiness counts, age and cost do not.
//
// Non-essential depth (owner 2026-11-05 §6): when the place to fill is depth (the starting group is complete and no lineup hole), Rebuild
// and Retool prefer younger monsters: depthAge points per year past depthPrime. Never for a starter, a hole or a contender.
import { monsterOverall } from '../data/monsters.js';
import { POTENTIAL_WEIGHT, READY_BONUS } from './draft.js';
import { horizonOf, PLAN } from './roster-plan.js';
import { identityTilt } from '../data/identities.js';

export const FA_STRATEGY = Object.freeze({
  age: { rebuild: 2, retool: 1, compete: 0.5, contend: 0 },
  cost: { rebuild: 0.5, retool: 0.5, compete: 1, contend: 0 },
  element: 1.5, // R4: at most a point and a half, so a clearly better monster of another element is still preferred
  depthAge: { rebuild: 0.75, retool: 0.4, compete: 0, contend: 0 }, // owner 2026-11-05 §6: non-essential depth, a point per year past DEPTH_PRIME (Rebuild 0.75, Retool 0.4)
  depthPrime: 26,
});

/** Seasons inside the ageing horizon (0 for a monster with two or more seasons before his onset). */
export const ageingSeasons = (m) => { const h = horizonOf(m); return Number.isFinite(h) ? Math.max(0, PLAN.ageingHorizon - h) : 0; };

/**
 * The club's value of `m` as a signing. `mode`: the club's Task 6 mode. `ask`: his asking salary (credits). `weakestStarter`: the overall of the
 * club's weakest starter at his position (readiness), or null. `element`: a gym's element (R4), or null. `identity`: the AI club's
 * identity (identities.js clubIdentity), or null.
 */
export function strategyValue(m, { mode = 'compete', ask = 0, weakestStarter = null, element = null, depth = false, identity = null } = {}) {
  const ovr = monsterOverall(m); const pw = POTENTIAL_WEIGHT[mode] ?? POTENTIAL_WEIGHT.compete;
  let v = ovr + pw * ((m.potential ?? ovr) - 70);
  v -= (FA_STRATEGY.age[mode] ?? 0) * ageingSeasons(m);
  v -= (FA_STRATEGY.cost[mode] ?? 0) * (ask / 10000);
  if (mode === 'contend' && weakestStarter != null && ovr >= weakestStarter) v += READY_BONUS;
  if (element && m.type === element) v += FA_STRATEGY.element;
  if (identity) v += identityTilt(identity, m); // Task 8 D7: the club's identity, a tie-break on the same scale
  if (depth) v -= (FA_STRATEGY.depthAge[mode] ?? 0) * Math.max(0, (m.age ?? FA_STRATEGY.depthPrime) - FA_STRATEGY.depthPrime); // a younger developmental monster for a depth place; a clearly better or cheaper veteran still wins
  return v;
}

/** Whether a club in `mode` should improve its terms to win `m` (R1 d): a rebuilder only for a monster outside the ageing horizon, a contender only for one who would start now. */
export function worthPursuing(m, { mode = 'compete', weakestStarter = null } = {}) {
  if (mode === 'rebuild') return ageingSeasons(m) === 0;
  if (mode === 'contend') return weakestStarter == null || monsterOverall(m) >= weakestStarter;
  return true;
}
