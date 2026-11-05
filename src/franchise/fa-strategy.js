// Task 7 remediation R1/R4 (owner approval 2026-11-05): how an AI club values a free agent, by its Task 6 strategy mode, instead of
// by overall alone. Pure functions; no state, no randomness.
//
//   value = overall
//         + potential weight (the AI draft's own Task 6 Phase D weights: Contend 0.10, Compete and Retool 0.20, Rebuild 0.35) × (potential − 70)
//         − age weight × the seasons he is inside the ageing horizon (Task 6 roster plan: within 2 seasons of his public onset, or past it)
//         − cost weight × his ask in tens of thousands of credits
//         + readiness bonus (Contend: the AI draft's READY_BONUS) when he would start now
//         + gym element bonus (R4) when he shares a gym's element, a tie-break that never outweighs a real difference
//
//   Rebuild  young monsters, potential, long-term value: the largest potential and age weights.
//   Retool   current play balanced with younger replacements: half the Rebuild age weight, some cost sense.
//   Compete  ability, affordability and needs: overall, a small age weight and the largest cost weight.
//   Contend  immediate help: readiness counts, age and cost do not.
import { monsterOverall } from '../data/monsters.js';
import { POTENTIAL_WEIGHT, READY_BONUS } from './draft.js';
import { horizonOf, PLAN } from './roster-plan.js';

export const FA_STRATEGY = Object.freeze({
  age: { rebuild: 2, retool: 1, compete: 0.5, contend: 0 },
  cost: { rebuild: 0.5, retool: 0.5, compete: 1, contend: 0 },
  element: 1.5, // R4: at most a point and a half, so a clearly better monster of another element is still preferred
});

/** Seasons inside the ageing horizon (0 for a monster with two or more seasons before his onset). */
export const ageingSeasons = (m) => { const h = horizonOf(m); return Number.isFinite(h) ? Math.max(0, PLAN.ageingHorizon - h) : 0; };

/**
 * The club's value of `m` as a signing. `mode`: the club's Task 6 mode. `ask`: his asking salary (credits). `weakestStarter`: the overall of the
 * club's weakest starter at his position (readiness), or null. `element`: a gym's element (R4), or null.
 */
export function strategyValue(m, { mode = 'compete', ask = 0, weakestStarter = null, element = null } = {}) {
  const ovr = monsterOverall(m); const pw = POTENTIAL_WEIGHT[mode] ?? POTENTIAL_WEIGHT.compete;
  let v = ovr + pw * ((m.potential ?? ovr) - 70);
  v -= (FA_STRATEGY.age[mode] ?? 0) * ageingSeasons(m);
  v -= (FA_STRATEGY.cost[mode] ?? 0) * (ask / 10000);
  if (mode === 'contend' && weakestStarter != null && ovr >= weakestStarter) v += READY_BONUS;
  if (element && m.type === element) v += FA_STRATEGY.element;
  return v;
}

/** Whether a club in `mode` should improve its terms to win `m` (R1 d): a rebuilder only for a monster outside the ageing horizon, a contender only for one who would start now. */
export function worthPursuing(m, { mode = 'compete', weakestStarter = null } = {}) {
  if (mode === 'rebuild') return ageingSeasons(m) === 0;
  if (mode === 'contend') return weakestStarter == null || monsterOverall(m) >= weakestStarter;
  return true;
}
