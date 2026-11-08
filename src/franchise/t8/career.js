// Task 8 M1 (WP2-WP3): AI training allocation, age-related decline on the development record, and the simulated prior-career
// history used to generate veterans (N7c B7). Pure functions over the record from progression.js; not yet wired.
import * as F from '../../core/fraction.js';
import { ATTRIBUTES, RULES } from '../../data/beast-dex.js';
import { POSITION_WEIGHTS } from '../../data/personnel.js';
import { CURVE, trueOnset, technicalOffset, isPhysical, physLoss, techLoss, drawLoss, ATTRIBUTE_FLOOR, peakWindowAge } from '../../data/aging.js';
import { addLevelXp, addTrainingProgress, addBankedPoints, invest, trainingCost, evolve, effectiveCostNumber } from './progression.js';

/** Weight of an attribute for AI and auto allocation (spec §4; corrected per owner instruction 2026-11-07 10:39). */
export const ALLOCATION_TIER = Object.freeze({ approvedNonOvrUse: 0.5, apexUnusedAtPosition: 0.2 });
export function allocationWeight(d, position, a) {
  const ovr = (POSITION_WEIGHTS[position] || POSITION_WEIGHTS.WR)[a];
  if (ovr) return ovr;                                         // positional value first
  if (RULES.attributeRoles[position]?.[a]) return ALLOCATION_TIER.approvedNonOvrUse; // approved non-OVR use (Appendix C "Active")
  return d.apex ? ALLOCATION_TIER.apexUnusedAtPosition : 0;   // "Not used" at the position: Apex only, so all 12 can reach 99
}

/**
 * AI and auto allocation (spec §4): spend banked points one at a time (then the fractional remainder) on the attribute with the best
 * score = weight × min(1, headroom / 10) / sqrt(effective cost).
 * - Ordinary monsters: positional OVR attributes first, plus attributes with an approved non-OVR use at the position (Appendix C
 *   "Active": e.g. Durability's fatigue and injury resistance); attributes "Not used" at the position are not chosen.
 * - Apex: every attribute is eligible, including those excluded from OVR or unused at the position, so a legal path to all-99
 *   exists; positional value still comes first.
 * - Dividing by the square root of the cost keeps an important unfavored or age-expensive attribute in development.
 * This is ordinary AI policy. The equal-investment Apex benchmark policy is `allocateEqualBenchmark`, used only by benchmarks.
 * Returns the list of { attr, points } spent.
 */
/* Task 8 D7 (owner N8b): `first` (an AI club identity's attributes for this monster's position, identities.js trainingPriority) ranks
 * those attributes ahead of the rest. Only attributes that count toward the position's OVR (POSITION_WEIGHTS) can be ranked first, so
 * the identity never brings in an attribute the approved policy would not train; among them, and then among the rest, the score
 * above decides as before. The banked points spent are the same. */
export function allocateTraining(d, m, { first = null } = {}) {
  const spent = []; const pos = POSITION_WEIGHTS[m.position] || POSITION_WEIGHTS.WR;
  const firsts = first?.length ? new Set(first.filter((a) => pos[a] > 0)) : null;
  const weights = ATTRIBUTES.map((a) => allocationWeight(d, m.position, a)); // fixed for the call (position and Apex do not change)
  while (F.cmp(d.bank, F.ZERO) > 0) {
    let best = null, bestScore = 0, bestTier = 0;
    const probe = { ...m, attributes: d.current }; // as trainingCost builds it; rebuilt after every invest
    for (let i = 0; i < ATTRIBUTES.length; i++) {
      const a = ATTRIBUTES[i]; const w = weights[i];
      if (!w || d.current[a] >= d.potential[a]) continue;
      const gap = d.potential[a] - d.current[a];
      const score = (w * Math.min(1, gap / 10)) / Math.sqrt(effectiveCostNumber(d, probe, a));
      const tier = firsts?.has(a) ? 1 : 0;
      if (tier > bestTier || (tier === bestTier && score > bestScore + 1e-12)) { bestScore = score; best = a; bestTier = tier; }
    }
    if (!best) break;
    const pts = F.min(d.bank, F.ONE);
    invest(d, m, best, pts); spent.push({ attr: best, points: pts });
  }
  return spent;
}

/** Benchmark-only policy (Apex all-99 benchmark): one point at a time round-robin over every attribute with headroom. Never used by AI clubs. */
export function allocateEqualBenchmark(d, m) {
  const spent = []; let i = 0;
  while (F.cmp(d.bank, F.ZERO) > 0) {
    const open = ATTRIBUTES.filter((a) => d.current[a] < d.potential[a]); if (!open.length) break;
    const a = open[i++ % open.length]; const pts = F.min(d.bank, F.ONE); invest(d, m, a, pts); spent.push({ attr: a, points: pts });
  }
  return spent;
}

/**
 * Offseason age-related decline on the record (aging.js curves, unchanged). The decline floor never raises a rating (R1 item 34):
 * a rating already below the floor stays where it is. Losses go to the `loss` ledger. Apex (ageless) never declines.
 */
export function applyDecline(d, m, rng) {
  if (d.apex) return 0;
  if (m.durPeak == null && m.age >= peakWindowAge(m.position)) m.durPeak = d.current.durability;
  const probe = { ...m, attributes: d.current };
  const onset = trueOnset(probe); const yP = m.age - onset; const yT = m.age - onset - technicalOffset(m.position);
  if (yP <= 0 && yT <= 0) return 0;
  const rate = (CURVE[m.position] || CURVE.WR).rate; let lost = 0;
  for (const a of ATTRIBUTES) {
    const mean = isPhysical(a) ? (yP > 0 ? physLoss(yP, rate) : 0) : techLoss(yT);
    if (mean <= 0) continue;
    const before = d.current[a]; const after = Math.min(before, Math.max(ATTRIBUTE_FLOOR, before - drawLoss(mean, rng)));
    d.current[a] = after; d.loss[a] += before - after; lost += before - after;
  }
  return lost;
}

/** Default participation profiles per prior season (simulation inputs; the B7 benchmark validates them against played careers). */
export const HISTORY_PROFILES = Object.freeze({
  starter: { games: [9, 12], snapShare: [1, 1], clashes: [2, 5] },
  rotation: { games: [9, 12], snapShare: [0.4, 0.8], clashes: [1, 4] },
  depth: { games: [3, 9], snapShare: [0.1, 0.4], clashes: [0, 2] },
});

/**
 * Simulate `seasons` prior seasons for a freshly generated level-1 individual (N7c B7): football games (50 XP and a 25% bar,
 * scaled by min(1, snaps/10) via the snap share), Clash lineup selections (25 XP and 25%), evolution when eligible, the eligible
 * offseason award of 2 banked points, AI allocation, then ageing and decline. `m` carries age and position and is advanced in place.
 * `xpMultiplier` is the approved tunable multiplier (0.5-2.0).
 */
export function simulateHistory(rng, d, m, { seasons, profile = 'starter', xpMultiplier = 1 }) {
  const p = HISTORY_PROFILES[profile]; if (!p) throw new Error(`unknown profile ${profile}`);
  if (!(xpMultiplier >= 0.5 && xpMultiplier <= 2)) throw new RangeError('xp multiplier outside the approved 0.5-2.0');
  const span = ([lo, hi]) => lo + rng.int(hi - lo + 1);
  for (let s = 0; s < seasons; s++) {
    const games = span(p.games); const clashes = span(p.clashes);
    const share = p.snapShare[0] + (p.snapShare[1] - p.snapShare[0]) * rng.next();
    const part = F.frac(Math.round(share * 20), 20); // participation as an exact twentieth
    for (let g = 0; g < games; g++) {
      addLevelXp(d, Math.round(50 * xpMultiplier * F.toNumber(part)));
      addTrainingProgress(d, F.mul(F.frac(1, 4), part));
      evolve(d);
    }
    for (let c = 0; c < clashes; c++) { addLevelXp(d, Math.round(25 * xpMultiplier)); addTrainingProgress(d, F.frac(1, 4)); evolve(d); }
    allocateTraining(d, m);
    addBankedPoints(d, 2); allocateTraining(d, m);
    if (!d.apex) m.age += 1;
    m.yearsPro = (m.yearsPro || 0) + 1;
    applyDecline(d, m, rng);
  }
  return d;
}
