// Task 6 Phase 0: the statistics of docs/TASK6_PHASE0_METHODOLOGY.md §4 (planning tools only).
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
/** A fixed-seed generator (mulberry32), so every interval is reproducible. */
export function rng(seed = 6) { let st = seed >>> 0; return () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/**
 * Matched-seed comparison of one measure: `base` and `cand` map seed → value. Returns the mean paired difference (cand − base), its
 * 95% bootstrap percentile interval over seeds (2,000 resamples, fixed generator), a standardised effect size (mean difference ÷ the
 * standard deviation of the differences), and how many seeds moved each way. Seeds missing a value on either side are left out.
 */
export function pairedDiff(base, cand, { reps = 2000, seed = 6 } = {}) {
  const seeds = Object.keys(base).filter((s) => base[s] != null && cand[s] != null);
  const d = seeds.map((s) => cand[s] - base[s]); if (!d.length) return { n: 0 };
  const rnd = rng(seed); const boots = [];
  for (let i = 0; i < reps; i++) { let t = 0; for (let j = 0; j < d.length; j++) t += d[Math.floor(rnd() * d.length)]; boots.push(t / d.length); }
  boots.sort((a, b) => a - b); const m = mean(d); const sd = Math.sqrt(mean(d.map((x) => (x - m) ** 2)));
  return { n: d.length, base: r2(mean(seeds.map((s) => base[s]))), cand: r2(mean(seeds.map((s) => cand[s]))), diff: r2(m), lo: r2(boots[Math.floor(reps * 0.025)]), hi: r2(boots[Math.min(reps - 1, Math.floor(reps * 0.975))]), effect: sd > 0 ? r2(m / sd) : null, up: d.filter((x) => x > 0).length, down: d.filter((x) => x < 0).length };
}
/**
 * The four outcome classes of the approved standard, for one target measure:
 *   'functional-fail' a hard gate failed (decided by the caller), else
 *   'supported'       the interval excludes 0 in the better direction AND the held-out set agrees in direction (when given), else
 *   'worse'           the interval excludes 0 in the worse direction (held-out agreeing), else
 *   'inconclusive'.
 * Target achievement (the candidate inside its band) is reported separately: a measure can reach its target without a supported
 * improvement, or improve without reaching it.
 */
export function classify(dev, heldOut, better) {
  if (!dev || !dev.n || !better) return 'inconclusive';
  const sign = better === 'up' ? 1 : -1; const agree = (h) => !h || !h.n || Math.sign(h.diff) === Math.sign(dev.diff);
  if (dev.lo * sign > 0 && dev.hi * sign > 0 && agree(heldOut)) return 'supported';
  if (dev.lo * sign < 0 && dev.hi * sign < 0 && agree(heldOut)) return 'worse';
  return 'inconclusive';
}
export const inBand = (v, band) => (v == null || !band ? null : (band.min == null || v >= band.min) && (band.max == null || v <= band.max));
