// Beast Clash t8: the rounding and modifier arithmetic (R1 item 18; D9, N8d 2026-11-08). Pure.
//
// R1 item 18 (approved): round half up by default, no minimum damage; the explicit §9 floor rules (Shared Burden source share,
// Mind Mend donation and gain, Root Communion apportionment) and the Dragon Pounce cost rounded up are exceptions.
// D9 (approved, §25 item 9): "Applicable rotation, healing-cut and ramp modifiers multiply, and the result is rounded once. Explicit
// floor and round-up exceptions and approved bounds are preserved."
//
// So every amount the engine converts to whole HP is: base x (the product of every applicable factor), rounded ONCE, with the rounding
// mode the rule names ('halfUp' by default; 'floor' or 'ceil' only where an approved rule says so), then clamped to its bounds.

/** Round half up (approved default). Inputs here are never negative. */
export const roundHalfUp = (x) => Math.floor(x + 0.5);
export const ROUNDING = Object.freeze({ halfUp: roundHalfUp, floor: Math.floor, ceil: Math.ceil });

/**
 * One whole-HP amount: base x every factor, rounded once.
 * @param {number} base
 * @param {Array<{id:string, factor:number}>} factors  every applicable modifier, each named (logged for the reviewer)
 * @param {{rounding?: 'halfUp'|'floor'|'ceil', min?: number, max?: number}} opts
 * @returns {{amount:number, exact:number, factors:Array<{id:string,factor:number}>, rounding:string}}
 */
export function resolveAmount(base, factors = [], { rounding = 'halfUp', min = 0, max = Infinity } = {}) {
  const round = ROUNDING[rounding]; if (!round) throw new Error(`Unknown rounding ${rounding}`);
  if (!Number.isFinite(base) || base < 0) throw new Error(`Amount base must be a finite non-negative number (got ${base})`);
  let exact = base;
  for (const f of factors) { if (!Number.isFinite(f.factor) || f.factor < 0) throw new Error(`Bad factor ${f.id}: ${f.factor}`); exact *= f.factor; }
  const amount = Math.max(min, Math.min(max, round(exact)));
  return { amount, exact, factors: factors.map((f) => ({ id: f.id, factor: f.factor })), rounding };
}

/**
 * §9 Shared Burden raw split (an explicit floor exception): the raw budget is whole, the source share is floored and the original
 * target gets the remainder, conserving the budget. Example from §9: 101 at 30% gives 30 and 71.
 */
export function splitRaw(rawWhole, sourcePct) {
  if (!Number.isInteger(rawWhole) || rawWhole < 0) throw new Error('The raw split budget is a whole number');
  const source = Math.floor((rawWhole * sourcePct) / 100);
  return { source, target: rawWhole - source };
}
