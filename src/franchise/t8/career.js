// Task 8 M1 (WP2-WP3): AI training allocation, age-related decline on the development record, and the simulated prior-career
// history used to generate veterans (N7c B7). Pure functions over the record from progression.js; not yet wired.
import * as F from '../../core/fraction.js';
import { ATTRIBUTES } from '../../data/beast-dex.js';
import { POSITION_WEIGHTS } from '../../data/personnel.js';
import { CURVE, trueOnset, technicalOffset, isPhysical, physLoss, techLoss, drawLoss, ATTRIBUTE_FLOOR, peakWindowAge } from '../../data/aging.js';
import { addLevelXp, addTrainingProgress, addBankedPoints, invest, trainingCost, evolve } from './progression.js';

/**
 * AI and auto allocation (spec §4): spend banked points one at a time (then the fractional remainder) on the attribute with the best
 * positional benefit, considering current rating, the individual ceiling, age cost and Temper efficiency. The score divides by the
 * square root of the effective cost rather than the cost itself, so an important unfavored or age-expensive attribute is still
 * developed instead of being ignored for cheap irrelevant ones. Attributes outside the position's OVR weights are never chosen.
 * Returns the list of { attr, points } spent.
 */
export function allocateTraining(d, m) {
  const w = POSITION_WEIGHTS[m.position] || POSITION_WEIGHTS.WR;
  const spent = [];
  while (F.cmp(d.bank, F.ZERO) > 0) {
    let best = null, bestScore = 0;
    for (const a of ATTRIBUTES) {
      if (!w[a] || d.current[a] >= d.potential[a]) continue;
      const gap = d.potential[a] - d.current[a];
      const score = (w[a] * Math.min(1, gap / 10)) / Math.sqrt(F.toNumber(trainingCost(d, m, a).effective));
      if (score > bestScore + 1e-12) { bestScore = score; best = a; }
    }
    if (!best) break;
    const pts = F.min(d.bank, F.ONE);
    invest(d, m, best, pts); spent.push({ attr: best, points: pts });
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
