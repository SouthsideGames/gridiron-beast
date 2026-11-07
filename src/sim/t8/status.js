// Task 8 M2 (WP5): the shared status slot (spec §10, Appendix B; R1 item 16; N7c B18). Pure state functions; not yet wired.
// One shared status per monster, beneficial or harmful. Episodes accept at most three applications. Football clocks count completed
// plays the monster actually participates in; Clash clocks count recipient normal turns (Stunned skips included). The application
// play/turn does not consume duration. Transfer between Clash and football is 1:1 for supported statuses; unsupported ones clear.

export const STATUS = Object.freeze({
  stunned: { kind: 'harmful', football: true, clash: true },
  slowed: { kind: 'harmful', football: true, clash: true },
  stumbled: { kind: 'harmful', football: true, clash: false },
  knockedDown: { kind: 'harmful', football: true, clash: false },
  afflicted: { kind: 'harmful', football: true, clash: true },
  weakened: { kind: 'harmful', football: true, clash: true },
  confused: { kind: 'harmful', football: true, clash: true },
  healingReduced: { kind: 'harmful', football: false, clash: true },
  shielded: { kind: 'beneficial', football: true, clash: true },
  empowered: { kind: 'beneficial', football: true, clash: true },
  quickened: { kind: 'beneficial', football: true, clash: true },
  guarded: { kind: 'beneficial', football: false, clash: true },
});
export const MAX_APPLICATIONS = 3;

/**
 * Attempt to apply a status. `slot` is the monster's current slot (null when empty); returns { slot, accepted, reason }.
 * attempt: { id, strength, duration, mode, restOfPlay?, payload?, sourceId?, abilityId? }
 *  - duration: counted units (football plays or Clash turns) after the application play/turn.
 *  - restOfPlay: a football within-play disable that also clears at the whistle (pancake Knocked Down, Electric Stunned).
 * Rules: empty → new episode; same status equal → adds duration only; stronger → replaces strength and remaining duration,
 * counts an application, keeps the episode; weaker → ignored, consumes no application; three applications → blocked even if
 * stronger; a different status → blocked (explicit removal/replacement abilities clear the slot first).
 */
export function tryApply(slot, attempt) {
  const def = STATUS[attempt.id]; if (!def) throw new Error(`unknown status ${attempt.id}`);
  if (!def[attempt.mode]) return { slot, accepted: false, reason: 'unsupported in this mode' };
  if (!slot) return { slot: newEpisode(attempt), accepted: true, reason: 'new episode' };
  if (slot.id !== attempt.id) return { slot, accepted: false, reason: 'slot occupied by another status' };
  if (slot.applications >= MAX_APPLICATIONS) return { slot, accepted: false, reason: 'episode at three applications' };
  const cmp = Math.sign(attempt.strength - slot.originalStrength);
  if (cmp < 0) return { slot, accepted: false, reason: 'weaker application ignored' };
  const next = { ...slot, applications: slot.applications + 1, appliedThisUnit: true };
  if (cmp === 0) next.remaining = slot.remaining + attempt.duration; // equal: duration only (no strength, shield HP or saves)
  else { next.strength = attempt.strength; next.originalStrength = attempt.strength; next.remaining = attempt.duration; if (attempt.payload) next.payload = { ...attempt.payload }; }
  if (attempt.restOfPlay) next.restOfPlay = true;
  return { slot: next, accepted: true, reason: cmp === 0 ? 'equal: duration added' : 'stronger: replaced' };
}
function newEpisode(a) {
  return { id: a.id, strength: a.strength, originalStrength: a.strength, remaining: a.duration, applications: 1, appliedThisUnit: true,
    restOfPlay: !!a.restOfPlay, ...(a.payload ? { payload: { ...a.payload } } : {}), sourceId: a.sourceId ?? null, abilityId: a.abilityId ?? null };
}

/** Is the monster disabled for the whole current football play by a counted Stunned (carryover, B18)? */
export const disablesPlay = (slot) => !!slot && slot.id === 'stunned' && slot.remaining > 0 && !slot.restOfPlay;

/** Football whistle: within-play statuses (rest-of-play disables, Stumbled, Knocked Down) clear. */
export function atWhistle(slot) {
  if (!slot) return null;
  if (slot.id === 'stumbled' || slot.id === 'knockedDown') return null;
  if (slot.restOfPlay) return slot.remaining > 0 ? { ...slot, restOfPlay: false } : null;
  return slot;
}

/**
 * End of a counted unit: a completed football play the monster participated in, or the recipient's normal turn in Clash
 * (Stunned skips count). The unit in which the status was applied does not consume duration. Bench, other-unit plays, reserve
 * time, reactions and counters are not units and must not call this. Returns the slot, or null when it expires.
 */
export function endOfUnit(slot) {
  if (!slot) return null;
  if (slot.appliedThisUnit) return { ...slot, appliedThisUnit: false };
  const remaining = slot.remaining - 1;
  return remaining > 0 ? { ...slot, remaining } : null;
}

/** Mode transfer (opening/overtime Clash ↔ football): supported statuses keep remaining duration and episode history 1:1. */
export function transfer(slot, toMode) {
  if (!slot) return null;
  if (!STATUS[slot.id][toMode]) return null;
  if (slot.restOfPlay && slot.remaining <= 0) return null;
  return { ...slot, restOfPlay: false, appliedThisUnit: false };
}

/** Clash knockout clears status and episode immediately; actual football-game end clears everything. */
export const onKnockout = () => null;
export const atGameEnd = () => null;

/**
 * Shielded in football (B3): call after determining that a fumble would occur. The save prevents it and consumes the whole episode.
 * Returns { slot, prevented }.
 */
export function shieldedFumbleSave(slot) {
  if (slot?.id === 'shielded' && !slot.payload?.saveSpent) return { slot: null, prevented: true };
  return { slot, prevented: false };
}
