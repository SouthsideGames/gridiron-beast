// Task 8 M2 (WP5): per-game stamina (spec §12; N7c B10). Exact fractions. Pure; not yet wired.
import * as F from '../../core/fraction.js';

/** Start of a game: capacity and initial stamina equal permanent Durability (1:1); temporary modifiers never resize it. */
export const startGame = (permanentDurability) => ({ capacity: permanentDurability, stamina: F.frac(permanentDurability), exhausted: false });
/**
 * End of a completed played football play (participants only; bench and other-unit time never drain): drain 1, or while Afflicted
 * permanent Durability / max(1, effective Durability). Exhaustion is set the moment stamina reaches 0 and lasts the actual game.
 */
export function drainPlay(s, { afflicted = false, effectiveDurability = null } = {}) {
  const drain = afflicted ? F.frac(s.capacity, Math.max(1, Math.round(effectiveDurability ?? s.capacity))) : F.ONE;
  const left = F.max(F.ZERO, F.sub(s.stamina, drain));
  return { ...s, stamina: left, exhausted: s.exhausted || F.cmp(left, F.ZERO) === 0 };
}
/** Halftime: restore 50% of capacity, capped at full. The exhaustion flag stays. No other rest exists. */
export const halftime = (s) => ({ ...s, stamina: F.min(F.frac(s.capacity), F.add(s.stamina, F.frac(s.capacity, 2))) });
/** Exhausted monsters have all 12 effective attributes halved once (no compounding) for the rest of the actual game, deciding Clash included. */
export const exhaustionFactor = (s) => (s.exhausted ? 0.5 : 1);
/** Low-stamina battery: informational, at 25% of capacity or below. */
export const showBattery = (s) => F.cmp(s.stamina, F.frac(s.capacity, 4)) <= 0;
/** Task 8 M3: subtract whole current-stamina points (an ability drain, not a play cost), bounded at zero; capacity is unchanged. */
export function drainBy(s, points) { const left = F.max(F.ZERO, F.sub(s.stamina, F.frac(Math.max(0, points)))); return { ...s, stamina: left, exhausted: s.exhausted || F.cmp(left, F.ZERO) === 0 }; }
