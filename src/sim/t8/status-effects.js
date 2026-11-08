// Task 8 M3: the football effects of the shared statuses (spec §10, §11; Appendix B STA-01..STA-11). Pure; the engine (engine.js,
// "shared statuses in play") applies them to an actor at the snap and the moment a status is accepted mid-play.
//
// Magnitudes come from the applying ability: `slot.payload.pct` when the producer gives one, else `slot.strength`, read as a
// percentage of the affected property. Appendix B fixes no number for Slowed, Afflicted, Weakened, Confused, Empowered or Quickened;
// those come from the producing ability's approved data (for example Frost Nip Slowed 15/20%, Cerebrix Confused 20%, Ambush Tag
// Weakened 15-30%, Dawn Signal Quickened +15/+20%). Stumbled's 40% current-speed loss is fixed (§9, STA-03).
import { combineMaxSpeed } from './fields.js';

/** Percentage magnitude of a slot's effect (always positive; the status decides the sign). */
export const statusPct = (slot) => Math.abs(Number(slot?.payload?.pct ?? slot?.strength ?? 0)) || 0;

/** STA-02 Slowed lowers, STA-11 Quickened raises the maximum movement speed: a signed percentage for the shared aggregation. */
export function maxSpeedPct(slot) {
  if (slot?.id === 'slowed') return -statusPct(slot);
  if (slot?.id === 'quickened') return statusPct(slot);
  return 0;
}
/** STA-11 Quickened also improves acceleration (by the same effective-Speed percentage). */
export const accelFactor = (slot) => (slot?.id === 'quickened' ? 1 + statusPct(slot) / 100 : 1);

/** Effective-attribute statuses: STA-06 Weakened / STA-10 Empowered (Strength), STA-07 Confused (Awareness), STA-05 Afflicted (Durability). */
export const ATTR_EFFECT = Object.freeze({ weakened: ['strength', -1], empowered: ['strength', 1], confused: ['awareness', -1], afflicted: ['durability', -1] });
/** A monster's effective value of `attr` under its slot (exact; stored ratings are never changed). */
export function effectiveAttr(slot, attr, base) {
  const e = slot && ATTR_EFFECT[slot.id]; if (!e || e[0] !== attr) return base;
  return Math.max(0, base * (1 + (e[1] * statusPct(slot)) / 100));
}

/** STA-03 Stumbled: 40% of current movement speed is lost; maximum speed and acceleration are unchanged (§9). */
export const STUMBLE_KEEP = 0.6;

/**
 * The single maximum-speed aggregation (§11): same-property modifiers add (status -15% + field -10% = -25%), bounded at -75% / +50%.
 * `mods` maps a source (status, field, ...) to its signed percentage. Current-speed loss and hard immobilisation are separate layers.
 */
export function effectiveMaxSpeed(base, mods) { return base * (1 + combineMaxSpeed(Object.values(mods || {}).map(Number).filter(Number.isFinite)) / 100); }

/** Statuses that disable the actor for the rest of the play once accepted mid-play (cannot move, block or tackle). */
export const disablesRestOfPlay = (slot) => slot?.id === 'knockedDown' || (slot?.id === 'stunned' && slot.restOfPlay);

/**
 * Football-applied Stunned (R1 item 16; N7a; N7c B18; `football-stunned-scope`): only rest-of-play sources are approved. A play-applied
 * Stunned must be rest-of-play with no counted duration; multi-play Stunned exists only by Clash carryover. Returns a reason or null.
 */
export function footballApplyRefusal(attempt) {
  if (attempt?.id === 'stunned' && (!attempt.restOfPlay || (attempt.duration || 0) > 0)) return 'football Stunned: only rest-of-play sources are approved';
  return null;
}
