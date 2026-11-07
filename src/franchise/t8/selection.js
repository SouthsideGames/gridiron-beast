// Task 8 M1: club strength by candidate selection (owner ruling N7f; docs/task8/CLUB_STRENGTH_SELECTION.md). Pure; the integration
// switch calls it from every generation channel. Never alters an individual's ratings or ceilings.
import { generateIndividual, APEX_CHANCE } from './progression.js';
import { formById } from '../../data/beast-dex.js';
import { overall } from '../../data/monsters.js';
import { createRng, hashString } from '../../core/rng.js';

export const CANDIDATES = 9;
export const REFERENCE_SIZE = 400;
export const CALIBRATION = Object.freeze({ center: 56, spread: 5.3, min: 0.05, max: 0.95 });

/** Standard normal CDF (Abramowitz–Stegun 7.1.26), accurate to ~1e-7. */
export function phi(z) { const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2); return z >= 0 ? (1 + y) / 2 : (1 - y) / 2; }
/** Target percentile for a legacy quality value: Φ((q − 56) / 5.3), clamped to 5–95%. */
export const targetPercentile = (quality, c = CALIBRATION) => Math.max(c.min, Math.min(c.max, phi((quality - c.center) / c.spread)));

/** Selection metrics: computed from level-1 ratings or ceilings only, so Temper (training efficiency) cannot bias selection. */
export const METRICS = Object.freeze({
  current: (d, position) => overall(d.current, position),
  potential: (d, position) => overall(d.potential, position),
});

const REF = new Map();
/** Sorted reference values of a metric for a form: REFERENCE_SIZE ordinary individuals, seeded per form (deterministic). */
export function reference(formId, metric) {
  const key = `${formId}|${metric}`; if (REF.has(key)) return REF.get(key);
  const form = formById(formId); if (!form) throw new Error(`unknown form ${formId}`);
  const rng = createRng(hashString(`reference|${formId}`)); const vals = [];
  for (let i = 0; i < REFERENCE_SIZE; i++) vals.push(METRICS[metric](generateIndividual(rng, formId, { apex: false }), form.position));
  vals.sort((a, b) => a - b); REF.set(key, vals); return vals;
}
/** Mid-rank percentile of a value in the form's reference distribution (0..1). */
export function percentileOf(formId, metric, value) {
  const v = reference(formId, metric); let lo = 0, hi = 0;
  for (const x of v) { if (x < value) lo++; else if (x === value) hi++; }
  return (lo + hi / 2) / v.length;
}

/**
 * One generation event for an already chosen form.
 * @param opts.target   target percentile (0..1); use targetPercentile(quality)
 * @param opts.metric   'current' (starters, veterans, companions) or 'potential' (prospect classifications)
 * @param opts.affordable optional predicate on a candidate's dev record (for cap-fit channels); the nearest affordable candidate is
 *                      kept, else the one with the lowest metric (the cheapest). It never applies to Apex.
 * Returns { dev, apex, percentile }. An Apex result is final: it is never discarded or re-selected.
 */
export function selectIndividual(rng, formId, { target, metric = 'current', candidates = CANDIDATES, affordable = null, apexRoll = true } = {}) {
  const form = formById(formId); if (!form) throw new Error(`unknown form ${formId}`);
  if (!(target >= 0 && target <= 1)) throw new RangeError('target percentile must be in 0..1');
  // `apexRoll: false` only for a retry within the SAME event, whose Apex roll already happened (one roll per event, N7f)
  if (apexRoll && form.rarity !== 'legendary' && rng.next() < APEX_CHANCE) return { dev: generateIndividual(rng, formId, { apex: true }), apex: true, percentile: null };
  const pool = [];
  for (let i = 0; i < candidates; i++) { const d = generateIndividual(rng, formId, { apex: false }); const val = METRICS[metric](d, form.position); pool.push({ d, val, p: percentileOf(formId, metric, val), i }); }
  const ok = affordable ? pool.filter((c) => affordable(c.d)) : pool;
  const pick = ok.length ? ok.reduce((b, c) => (Math.abs(c.p - target) < Math.abs(b.p - target) ? c : b)) : pool.reduce((b, c) => (c.val < b.val ? c : b));
  return { dev: pick.d, apex: false, percentile: pick.p };
}
