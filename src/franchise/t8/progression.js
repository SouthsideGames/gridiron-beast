// Task 8 M1 (WP2-WP3): individual generation, natural growth, training investment and evolution, as pure functions over a
// plain-JSON development record. Exact fractions throughout (src/core/fraction.js). Not yet wired into the franchise.
//
// Approved sources: SPECIFICATION_BASELINE.md §2, §4, §5, §6; PROGRESSION_DECISIONS.md; rules.json generation/evolution/apex;
// R1 items 1-2 (linear cumulative growth schedule; evolution scaling of reference and earned contribution); N7c B6 (75 XP/level).
//
// Development record `d` (stored on the monster as m.dev):
//   { v, form, temper, apex, level, xp, ref:{a:S}, potential:{a:P}, current:{a:int},
//     natural:{a:int}  whole natural-growth points actually applied,
//     entitled:{a:int} whole natural entitlement already granted (applied or skipped at the ceiling; never re-awarded),
//     trained:{a:int}  whole rating increases bought with training,
//     loss:{a:int}     age-related decline ledger,
//     invest:{a:frac}  training points invested toward the next +1 of that attribute,
//     bank: frac (spendable training points), bar: frac in [0,1) (partial point), mastery:{football,clash} }
import * as F from '../../core/fraction.js';
import { formById, formsOf, ATTRIBUTES } from '../../data/beast-dex.js';
import { TEMPER_IDS, NEUTRAL_TEMPERS, temperEfficiency } from '../../data/temper.js';
import { attributeCost } from '../../data/aging.js';

export const DEV_VERSION = 1;
export const MAX_LEVEL = 50;
export const XP_PER_LEVEL = 75; // N7c B6 starting curve; the approved multiplier is applied to awards, not to this constant
export const APEX_CHANCE = 0.01;
export const APEX_START = [10, 15];

const roundHalfUp = (fr) => { fr = F.frac(fr); return F.floor(F.add(fr, F.frac(1, 2))); };
const randInt = (rng, lo, hi) => lo + rng.int(hi - lo + 1);
const each = (fn) => { const o = {}; for (const a of ATTRIBUTES) o[a] = fn(a); return o; }; // same keys, same order as before

/** Generate a level-1 individual of a form. `apex` may be forced for tests; otherwise legendaries never roll Apex. */
export function generateIndividual(rng, formId, { apex = null } = {}) {
  const form = formById(formId); if (!form) throw new Error(`unknown form ${formId}`);
  const isApex = apex ?? (form.rarity !== 'legendary' && rng.next() < APEX_CHANCE);
  // Draw order is fixed (starting ranges, then potential ranges, then Temper) so seeds are reproducible.
  const ref = each((a) => (isApex ? randInt(rng, APEX_START[0], APEX_START[1]) : randInt(rng, ...form.starting[a])));
  const potential = each((a) => (isApex ? 99 : randInt(rng, ...form.potential[a])));
  for (const a of ATTRIBUTES) if (ref[a] > potential[a]) ref[a] = potential[a]; // approved ranges never overlap (rules.json); kept as a guard
  const temperPool = isApex ? NEUTRAL_TEMPERS : TEMPER_IDS;
  const temper = temperPool[rng.int(temperPool.length)];
  return {
    v: DEV_VERSION, form: formId, temper, apex: !!isApex, level: 1, xp: 0,
    ref, potential, current: { ...ref },
    natural: each(() => 0), entitled: each(() => 0), trained: each(() => 0), loss: each(() => 0),
    invest: each(() => F.ZERO), bank: F.ZERO, bar: F.ZERO, mastery: { football: 0, clash: 0 },
  };
}

/** Automatic-growth allowance for one attribute: floor((P - S) / 2), from the level-1 reference and the individual ceiling. */
export const allowance = (d, a) => Math.max(0, Math.floor((d.potential[a] - d.ref[a]) / 2));
/** Cumulative entitlement at a level (exact): allowance × (L - 1) / 49, linear over levels 2-50 (R1 item 1). */
export const entitlementAt = (d, a, level) => F.mul(allowance(d, a), F.frac(Math.max(0, Math.min(MAX_LEVEL, level) - 1), MAX_LEVEL - 1));
/** floor(entitlementAt(d, a, level)) in integers: the same value (an integer quotient of small integers is exact in floating point,
 *  and a non-integer quotient sits at least 1/49 from the next integer), without building fractions. Performance only. */
export const entitledWholeAt = (d, a, level) => Math.floor((allowance(d, a) * Math.max(0, Math.min(MAX_LEVEL, level) - 1)) / (MAX_LEVEL - 1));

/** Add level XP; applies each level-up's natural growth. XP stops at level 50 and excess is not converted. Returns levels gained. */
export function addLevelXp(d, xp) {
  if (!(xp >= 0)) throw new RangeError('xp must be non-negative');
  let gained = 0;
  if (d.level >= MAX_LEVEL) return 0;
  d.xp += xp;
  while (d.level < MAX_LEVEL && d.xp >= XP_PER_LEVEL) { d.xp -= XP_PER_LEVEL; d.level += 1; gained += 1; applyNaturalGrowth(d); }
  if (d.level >= MAX_LEVEL) d.xp = 0;
  return gained;
}

/** Grant the newly earned whole natural entitlement up to the current level; points that don't fit under the ceiling are skipped. */
export function applyNaturalGrowth(d) {
  for (const a of ATTRIBUTES) {
    const due = entitledWholeAt(d, a, d.level) - d.entitled[a];
    if (due <= 0) continue;
    d.entitled[a] += due;
    const fit = Math.max(0, Math.min(due, d.potential[a] - d.current[a]));
    d.current[a] += fit; d.natural[a] += fit;
  }
}

// ---------------------------------------------------------------- training
/** Neutral cost C (1-4) at the monster's current age and E (2, 1, 0.5) from Temper. `m` supplies age/position for aging.js. */
/** The effective cost C / E as a number, for allocation scores: the same value as toNumber(trainingCost().effective) (C is 1-4 and
 *  E is 2, 1 or 0.5, so the quotient is exact). `probe` is { ...m, attributes: d.current }, built once by the caller. */
export function effectiveCostNumber(d, probe, a) { const C = d.apex ? 1 : attributeCost(probe, a); return C / temperEfficiency(d.temper, a); }
export function trainingCost(d, m, a) {
  const C = d.apex ? 1 : attributeCost({ ...m, attributes: d.current }, a);
  const E = temperEfficiency(d.temper, a);
  return { C, E, effective: F.div(C, F.frac(E)) };
}
/** Add training progress (fractions of one point). Each full bar becomes one banked point; the excess carries over. */
export function addTrainingProgress(d, amount) {
  let bar = F.add(d.bar, amount); const whole = F.floor(bar);
  if (whole > 0) { d.bank = F.add(d.bank, whole); bar = F.sub(bar, whole); }
  d.bar = bar; return whole;
}
/** Add whole banked points directly (eligible offseason award: 2). */
export const addBankedPoints = (d, n) => { d.bank = F.add(d.bank, n); };

/**
 * Invest `points` (a fraction, at most the bank) in attribute `a`. Progress per invested point is E/C. Every completed +1
 * applies immediately; excess carries. At the ceiling the unused investment is refunded to the bank.
 * Returns { increases, refunded }.
 */
export function invest(d, m, a, points) {
  points = F.frac(points);
  if (F.cmp(points, F.ZERO) <= 0) throw new RangeError('invest a positive amount');
  if (F.cmp(points, d.bank) > 0) throw new RangeError('not enough banked training points');
  d.bank = F.sub(d.bank, points);
  d.invest[a] = F.add(d.invest[a], points);
  let increases = 0;
  for (;;) {
    if (d.current[a] >= d.potential[a]) { const refunded = d.invest[a]; d.bank = F.add(d.bank, refunded); d.invest[a] = F.ZERO; return { increases, refunded }; }
    const { effective } = trainingCost(d, m, a);
    if (F.cmp(d.invest[a], effective) < 0) return { increases, refunded: F.ZERO };
    d.invest[a] = F.sub(d.invest[a], effective); d.current[a] += 1; d.trained[a] += 1; increases += 1;
  }
}
/** Exact cost to finish the next +1 of `a` from the current investment (for the exact-cost purchase). */
export function costToNext(d, m, a) { if (d.current[a] >= d.potential[a]) return null; return F.max(F.ZERO, F.sub(trainingCost(d, m, a).effective, d.invest[a])); }
/** Bar shown for an attribute: invested / effective cost at the current age (age changes recompute it; no free investment). */
export const attributeBar = (d, m, a) => F.min(F.ONE, F.div(d.invest[a], trainingCost(d, m, a).effective));

// ---------------------------------------------------------------- evolution
/** The evolved ceiling: original relative placement in the old form's range, carried into the new form's range (exact, halves up). */
export function evolvedPotential(d, a, fromForm, toForm) {
  if (d.apex) return 99;
  const [lo, hi] = fromForm.potential[a], [lo2, hi2] = toForm.potential[a];
  const t = F.frac(d.potential[a] - lo, hi - lo);
  return roundHalfUp(F.add(lo2, F.mul(t, hi2 - lo2)));
}
/**
 * Evolve to the next form when eligible (level ≥ its evolution level). Current permanent ratings keep their percentage of potential
 * (roundHalfUp(old × newP / oldP), capped at newP). The level-1 reference, natural, trained and loss ledgers scale by newP/oldP; the
 * natural entitlement keeps the earned fraction of the (new) allowance on the same level schedule, so nothing is replayed. Rounding
 * residue between the ledgers and the authoritative current rating is absorbed by the natural record. Training bars, banked points,
 * investments, Temper, level and mastery are untouched. Returns the new form id, or null if not eligible.
 */
const NEXT_FORM = new Map(); // form id -> its next form (or null); dex data is fixed, so this only saves the repeated lookup
const nextFormOf = (from) => { if (!NEXT_FORM.has(from.id)) NEXT_FORM.set(from.id, formsOf(from.familyId).find((f) => f.stage === from.stage + 1) || null); return NEXT_FORM.get(from.id); };
export function evolve(d) {
  const from = formById(d.form); const next = nextFormOf(from);
  if (!next || d.level < next.evolutionLevel) return null;
  for (const a of ATTRIBUTES) {
    const P = d.potential[a], P2 = evolvedPotential(d, a, from, next), k = F.frac(P2, P);
    const cur2 = Math.min(P2, roundHalfUp(F.mul(d.current[a], k)));
    d.ref[a] = Math.min(P2, roundHalfUp(F.mul(d.ref[a], k)));
    d.trained[a] = roundHalfUp(F.mul(d.trained[a], k));
    d.loss[a] = roundHalfUp(F.mul(d.loss[a], k));
    d.potential[a] = P2; d.current[a] = cur2;
    d.natural[a] = Math.max(0, cur2 - d.ref[a] - d.trained[a] + d.loss[a]);
    d.entitled[a] = entitledWholeAt(d, a, d.level);
  }
  d.form = next.id; return next.id;
}

/** Invariants used by tests and save validation. */
export function devProblems(d) {
  const p = [];
  for (const a of ATTRIBUTES) {
    if (!(d.current[a] >= 1 && d.current[a] <= d.potential[a] && d.potential[a] <= 99)) p.push(`${a}: current ${d.current[a]} outside 1..${d.potential[a]}`);
    if (d.entitled[a] > allowance(d, a)) p.push(`${a}: entitlement above allowance`);
    if (!F.isFraction(d.invest[a]) || F.cmp(d.invest[a], F.ZERO) < 0) p.push(`${a}: bad investment`);
  }
  if (!F.isFraction(d.bank) || F.cmp(d.bank, F.ZERO) < 0) p.push('bad bank');
  if (!F.isFraction(d.bar) || F.cmp(d.bar, F.ZERO) < 0 || F.cmp(d.bar, F.ONE) >= 0) p.push('bad bar');
  if (d.level < 1 || d.level > MAX_LEVEL) p.push('bad level');
  return p;
}
