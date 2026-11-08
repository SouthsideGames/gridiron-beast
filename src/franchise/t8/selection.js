// Task 8 M1: club strength by candidate selection (owner ruling N7f; docs/task8/CLUB_STRENGTH_SELECTION.md). Pure; the integration
// switch calls it from every generation channel. Never alters an individual's ratings or ceilings.
import { generateIndividual, APEX_CHANCE } from './progression.js';
import { formById } from '../../data/beast-dex.js';
import { overall } from '../../data/monsters.js';
import { createRng, hashString } from '../../core/rng.js';
import { simulateHistory } from './career.js';
import { NEUTRAL_TEMPERS } from '../../data/temper.js';
import { HISTORY_REFERENCE } from '../../data/t8-history-reference.generated.js';

export const CANDIDATES = 9;
export const REFERENCE_SIZE = 400;
export const CALIBRATION = Object.freeze({ center: 56, spread: 5.3, min: 0.05, max: 0.95 });

/** Standard normal CDF (Abramowitz–Stegun 7.1.26), accurate to ~1e-7. */
export function phi(z) { const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2); return z >= 0 ? (1 + y) / 2 : (1 - y) / 2; }
/** Target percentile for a legacy quality value: Φ((q − 56) / 5.3), clamped to 5–95%. */
export const targetPercentile = (quality, c = CALIBRATION) => Math.max(c.min, Math.min(c.max, phi((quality - c.center) / c.spread)));

/** Selection metrics: computed from level-1 ratings or ceilings only, so Temper (training efficiency) cannot bias selection.
 *  Post-history selection (below) applies `current` after a career evaluated under a neutral Temper, for the same reason. */
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
const midRank = (v, value) => { let lo = 0, hi = 0; for (const x of v) { if (x < value) lo++; else if (x === value) hi++; } return (lo + hi / 2) / v.length; };
/** Mid-rank percentile of a value in the form's reference distribution (0..1). */
export function percentileOf(formId, metric, value) { return midRank(reference(formId, metric), value); }

// ---- Post-history selection for founding rosters (owner ruling N8b D1, option 2) --------------------------------------------
// Each of the nine candidates lives his prior career before one is kept, and the kept one is the candidate whose post-history
// current OVR sits nearest the target percentile of his form at the same career band (age he turned pro, prior seasons,
// participation profile): "a 50th-percentile starter is a typical starter at his age".
//
// Temper neutrality (N7f, spec §3). Temper changes training efficiency, so a candidate's real post-history rating depends on his
// Temper and selecting on it would favour Tempers that suit the position (measured: chi-square 370 at a 90% target, 125 at 10%,
// against a 99.9% critical value of 51; docs/task8/M1_STARTER_CALIBRATION.md, 2026-11-08). The selection value is therefore his
// post-history rating evaluated under a neutral Temper: the same level-1 ratings and ceilings, the same seeded career draws, every
// training cost at efficiency 1. The kept candidate then lives that career (same seed) with his own Temper, which is his career.
// Nothing about the individual is altered; only which candidate is kept depends on his simulated career.

/** Any neutral Temper: all three have efficiency 1 for every attribute, so they evaluate identically. */
export const EVALUATION_TEMPER = NEUTRAL_TEMPERS[0];
/** Prior career of a level-1 record from a seeded stream (N7c B7); returns his age record after it. */
export function runHistory(seed, d, { id, position, startAge, seasons, profile }) {
  const probe = { id, position, age: startAge, yearsPro: 0 };
  simulateHistory(createRng(seed), d, probe, { seasons, profile });
  return probe;
}
/** A copy of a level-1 record under the evaluation Temper (selection only; never kept). */
const neutralCopy = (d) => ({ ...JSON.parse(JSON.stringify(d)), temper: EVALUATION_TEMPER });

/** Prior seasons covered by one cached career band: founding ages are 20-28 and careers start at 21 or 22, so at most 7. */
export const BAND_SEASONS = 7;
/** A band is a form, the age he turned pro and the participation profile; one cached run covers every prior-season count. */
export const bandKey = (formId, startAge, profile) => `${formId}|${startAge}|${profile}`;
/** The form's approved ranges and the sample size, so a precomputed band is used only while its inputs are unchanged. */
export const formFingerprint = (formId) => { const f = formById(formId); return hashString(JSON.stringify([f.position, f.starting, f.potential, REFERENCE_SIZE, EVALUATION_TEMPER])).toString(36); };
/**
 * The post-history reference sample of a band: REFERENCE_SIZE ordinary level-1 individuals of the form, evaluated exactly as the
 * candidates are (evaluation Temper), each living `seasons` prior seasons one at a time (simulateHistory season by season is the
 * same simulation as one call); after season s his current positional OVR enters the sorted sample for s prior seasons. Seeded per
 * band, so deterministic and independent of game state. Each sample individual has his own synthetic id, so hidden longevity
 * varies across the sample as it does across the league. Returns an array: [s - 1] is the sorted sample after s seasons.
 */
export function computeHistoryBand(formId, startAge, profile, seasons = BAND_SEASONS) {
  const form = formById(formId); if (!form) throw new Error(`unknown form ${formId}`);
  const key = bandKey(formId, startAge, profile); const rng = createRng(hashString(`reference|history|${key}|${seasons}`));
  const out = Array.from({ length: seasons }, () => []);
  for (let i = 0; i < REFERENCE_SIZE; i++) {
    const d = { ...generateIndividual(rng, formId, { apex: false }), temper: EVALUATION_TEMPER };
    const probe = { id: `ref|${key}|${i}`, position: form.position, age: startAge, yearsPro: 0 };
    for (let s = 0; s < seasons; s++) { simulateHistory(rng, d, probe, { seasons: 1, profile }); out[s].push(METRICS.current(d, form.position)); }
  }
  for (const v of out) v.sort((a, b) => a - b);
  return out;
}
/** Encode a band as `min:c,c,…` per season (count of each OVR from the lowest upward), `;`-separated. Exact for mid-rank use. */
export function encodeBand(band) {
  return band.map((v) => { const lo = v[0], hi = v[v.length - 1]; const c = new Array(hi - lo + 1).fill(0); for (const x of v) c[x - lo]++; return `${lo}:${c.join(',')}`; }).join(';');
}
export function decodeBand(str) {
  return str.split(';').map((part) => { const [lo, cs] = part.split(':'); const v = []; cs.split(',').forEach((n, i) => { for (let k = 0; k < +n; k++) v.push(+lo + i); }); return v; });
}
const validTable = (t) => (t && t.size === REFERENCE_SIZE && t.seasons === BAND_SEASONS ? t : null);
let TABLE = validTable(HISTORY_REFERENCE); // precomputed bands (tools/t8-history-reference.mjs); a missing or stale band is computed on demand
const HREF = new Map();
/** Replace the precomputed reference table { size, seasons, bands: { [bandKey]: { f, v } } } (null: compute every band; tests). */
export function useHistoryTable(table) { TABLE = validTable(table); HREF.clear(); }
/** The band's samples: from the precomputed table when it matches the form's current data, else computed now; cached either way. */
export function historyBand(formId, startAge, profile, seasons = BAND_SEASONS) {
  const len = Math.max(BAND_SEASONS, seasons); const key = `${bandKey(formId, startAge, profile)}|${len}`; if (HREF.has(key)) return HREF.get(key);
  const row = len === BAND_SEASONS ? TABLE?.bands?.[bandKey(formId, startAge, profile)] : null;
  const band = row && row.f === formFingerprint(formId) ? decodeBand(row.v) : computeHistoryBand(formId, startAge, profile, len);
  HREF.set(key, band); return band;
}
/** Sorted post-history values for a form and career band { startAge, seasons, profile }. */
export function historyReference(formId, { startAge, seasons, profile }) {
  if (!(seasons >= 1)) throw new RangeError('a post-history reference needs at least one prior season');
  return historyBand(formId, startAge, profile, seasons)[seasons - 1];
}
/** Mid-rank percentile of a post-history value in its form-and-band reference (0..1). */
export const historyPercentileOf = (formId, band, value) => midRank(historyReference(formId, band), value);

/**
 * One generation event for an already chosen form.
 * @param opts.target   target percentile (0..1); use targetPercentile(quality)
 * @param opts.metric   'current' (starters, veterans, companions) or 'potential' (prospect classifications)
 * @param opts.affordable optional predicate on a candidate's dev record (for cap-fit channels); the nearest affordable candidate is
 *                      kept, else the one with the lowest metric (the cheapest). It never applies to Apex.
 * @param opts.history  optional { id, startAge, seasons, profile } (founding rosters, N8b D1): post-history selection as described
 *                      above. The returned record has already lived his prior career; `probe` is his age record after it. An Apex
 *                      result returns before any candidate or career is drawn (his career is simulated by the caller, as before).
 * Returns { dev, apex, percentile, probe }. An Apex result is final: it is never discarded or re-selected.
 */
export function selectIndividual(rng, formId, { target, metric = 'current', candidates = CANDIDATES, affordable = null, apexRoll = true, history = null } = {}) {
  const form = formById(formId); if (!form) throw new Error(`unknown form ${formId}`);
  if (!(target >= 0 && target <= 1)) throw new RangeError('target percentile must be in 0..1');
  // `apexRoll: false` only for a retry within the SAME event, whose Apex roll already happened (one roll per event, N7f)
  if (apexRoll && form.rarity !== 'legendary' && rng.next() < APEX_CHANCE) return { dev: generateIndividual(rng, formId, { apex: true }), apex: true, percentile: null, probe: null };
  const pool = []; const post = !!(history && history.seasons > 0);
  if (post && metric !== 'current') throw new Error('post-history selection uses the current metric');
  // The nine legal candidates are drawn first, in the approved order (each uniform and independent inside the form's ranges).
  for (let i = 0; i < candidates; i++) pool.push({ d: generateIndividual(rng, formId, { apex: false }), i });
  for (const c of pool) {
    if (post) {
      c.seed = rng.seed(); const e = neutralCopy(c.d); runHistory(c.seed, e, { ...history, position: form.position });
      c.val = METRICS.current(e, form.position); c.p = historyPercentileOf(formId, history, c.val);
    } else { c.val = METRICS[metric](c.d, form.position); c.p = percentileOf(formId, metric, c.val); }
  }
  const ok = affordable ? pool.filter((c) => affordable(c.d)) : pool;
  const pick = ok.length ? ok.reduce((b, c) => (Math.abs(c.p - target) < Math.abs(b.p - target) ? c : b)) : pool.reduce((b, c) => (c.val < b.val ? c : b));
  const probe = post ? runHistory(pick.seed, pick.d, { ...history, position: form.position }) : null; // his career, his own Temper
  return { dev: pick.d, apex: false, percentile: pick.p, probe };
}
