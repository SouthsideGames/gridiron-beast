// Task 8 M2 (WP5): ordinary block shed (N7c B2) and the pancake contest (R1 item 7; N7b P5; N7c B1). Constants come from the approved
// overrides (task8-overrides.json) so tuning stays inside the approved bounds. Pure functions; the engine supplies effective ratings
// and the type scaling it already applies to the block contest.
import { approvedRule } from '../../data/beast-dex.js';

const PK = approvedRule('pancake-structure').values;
const SHED = approvedRule('shed-formula').values;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/** Constants in force; `override` (benchmarks only) must stay inside the approved bounds, and a0 is never below 0. */
export function pancakeConstants(override = DEFAULTS) {
  if (override === DEFAULTS) return DEFAULT_C; // perf: the approved values are frozen, so the no-override result is computed once
  const c = { ...PK, ...override }; delete c.bounds;
  for (const [k, [lo, hi]] of Object.entries(PK.bounds)) if (!(c[k] >= lo && c[k] <= hi)) throw new RangeError(`pancake ${k}=${c[k]} outside approved bounds ${lo}-${hi}`);
  return c;
}
const DEFAULTS = Object.freeze({}); const DEFAULT_C = Object.freeze(pancakeConstants({}));
export const blockScore = (ol) => 0.6 * ol.blocking + 0.4 * ol.strength;
/** Ordinary shed score by defender position (B2 initial weights). */
// perf: the weights (frozen approved values) as [attribute, weight] lists, built once; the sum runs in the same order from 0 as the
// Object.entries reduce it replaces, so every score is bit-identical
const SHED_W = new Map(Object.entries(SHED).map(([p, w]) => [w, Object.entries(w)]));
export function shedScore(d, position) { const w = SHED[position === 'S' || position === 'FS' || position === 'SS' ? 'S' : position] || SHED.LB; const e = SHED_W.get(w) || Object.entries(w); let s = 0; for (let i = 0; i < e.length; i++) s = s + e[i][1] * d[e[i][0]]; return s; }
/** OL advantage A = (B - shed) / 100 with the engine's type scaling factors for the engaged pair. */
export const advantage = (ol, d, dPos, { blockScale = 1, shedScale = 1 } = {}) => (blockScore(ol) * blockScale - shedScore(d, dPos) * shedScale) / 100;
/** Chance that the one opportunity roll of this OL's play opens an attempt. Zero without a positive advantage beyond a0. */
export const opportunityChance = (A, c = pancakeConstants()) => (A <= c.a0 ? 0 : c.qmax * clamp((A - c.a0) / c.w, 0, 1));
export const successChance = (ol, d, c = pancakeConstants()) => clamp(c.b + (c.s * ((0.4 * ol.strength + 0.4 * ol.blocking + 0.2 * ol.tackling) - (0.6 * d.strength + 0.4 * d.agility))) / 100, c.lo, c.hi);
export const recoveryChance = (ol, c = pancakeConstants()) => clamp(c.c + (c.k * ol.awareness) / 99, c.c, c.rmax);

/**
 * Resolve the single opportunity of one OL in one play, at its first engagement (not per tick). `rng.next()` is drawn in a fixed
 * order: opportunity, then success, then recovery. Returns { outcome: 'none' | 'pancake' | 'recovered' | 'lostBlock', A, q, p, r }.
 * 'pancake' → apply Knocked Down (rest of play) through the shared gate; 'lostBlock' → end the engagement and attempt Stumbled.
 */
export function resolvePancakeOpportunity(rng, ol, d, dPos, scales, c = pancakeConstants()) {
  const A = advantage(ol, d, dPos, scales); const q = opportunityChance(A, c);
  if (!q || rng.next() >= q) return { outcome: 'none', A, q };
  const p = successChance(ol, d, c); if (rng.next() < p) return { outcome: 'pancake', A, q, p };
  const r = recoveryChance(ol, c); return { outcome: rng.next() < r ? 'recovered' : 'lostBlock', A, q, p, r };
}
