// Task 8 M2 (WP4): reward amounts (spec §6 table; R1 items 9-12; N7c B5). Exact fractions; the reward ledger (reward-ledger.js) applies
// them once per activity and monster. Pure; not yet wired. Labs, reviewers, previews and replays never call these.
import * as F from '../../core/fraction.js';
import { ATTRIBUTES } from '../../data/beast-dex.js';
import { POSITION_WEIGHTS } from '../../data/personnel.js';

export const STANDARD_TRAINING_SHARE = F.frac(1, 4); // 25% (tunable 20-50% in 5-point steps, equal for both modes)
export const FOOTBALL_BASE_XP = 50, CLASH_BASE_XP = 25, RESERVE_XP = F.frac(25, 2); // reserve 12.5 (R1 item 9)
export const OFFSEASON_POINTS = 2;
// Owner-approved M6 Apex exception: ordinary awards and level XP are unchanged.
export const APEX_ACTIVITY_MULTIPLIER = 2;
export const APEX_OFFSEASON_POINTS = 42;
export const activityTraining = (d, training) => d.apex ? F.mul(training, APEX_ACTIVITY_MULTIPLIER) : training;
export const offseasonPoints = (d) => d.apex ? APEX_OFFSEASON_POINTS : OFFSEASON_POINTS;

/** Participation factor: non-kickers min(1, live snaps / 10); kickers 1 with at least one actual kick, else 0. Formula-only special-teams participation counts as snaps for the foundation (B5). */
export function participation({ position, liveSnaps = 0, kicks = 0 }) {
  if (position === 'K') return kicks > 0 ? F.ONE : (liveSnaps > 0 ? F.min(F.ONE, F.frac(liveSnaps, 10)) : F.ZERO);
  return F.min(F.ONE, F.frac(liveSnaps, 10));
}
/** Performance bonus in bar fractions: max(0, adj / 0.20) × 5 points, capped at 5 points (adj is the final grade, −0.20..+0.20). */
export function performanceBonus(adj) { const pts = Math.min(5, Math.max(0, adj / 0.2) * 5); return F.frac(Math.round(pts * 100), 10000); }

/**
 * Football game award for one monster (aggregated by monster, never by slot). The positional XP adjustment (grade) and the bonus scale
 * with the same participation factor (R1 item 12). Returns { xp (number, before the approved multiplier), training (fraction of a bar) }.
 */
export function footballAward({ position, liveSnaps, kicks, gradeAdj = 0 }) {
  const p = participation({ position, liveSnaps, kicks });
  const xp = F.mul(F.mul(FOOTBALL_BASE_XP, F.frac(Math.round((1 + gradeAdj) * 1000), 1000)), p);
  return { xp, training: F.mul(F.add(STANDARD_TRAINING_SHARE, performanceBonus(gradeAdj)), p), participation: p };
}
/** Clash award: every selected lineup member, including unused reserves; status skips and early KOs keep it. */
export function clashAward({ gradeAdj = 0, involved = true }) {
  const adj = involved ? gradeAdj : 0; // never-involved members get no performance adjustment
  return { xp: F.mul(CLASH_BASE_XP, F.frac(Math.round((1 + adj) * 1000), 1000)), training: F.add(STANDARD_TRAINING_SHARE, performanceBonus(adj)) };
}
/** Reserve development after football: 12.5 XP and 25% of the standard training award (6.25% of a bar); no double starter/reserve award. */
export const reserveAward = () => ({ xp: RESERVE_XP, training: F.mul(STANDARD_TRAINING_SHARE, F.frac(1, 4)) });
/** Reserve eligibility (R1 item 10): a position-relevant attribute at least 3 below its ceiling; at level 50, training only. Apex exempt from headroom/age limits. */
export function reserveEligible(d, position) {
  if (d.apex) return true;
  const w = POSITION_WEIGHTS[position] || POSITION_WEIGHTS.WR;
  return ATTRIBUTES.some((a) => w[a] && d.potential[a] - d.current[a] >= 3);
}
