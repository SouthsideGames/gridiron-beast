// Task 8 M2 (WP5): the shared status slot in a football game (spec §10; R1 item 16; N7c B18). One slot per monster, kept in the
// game state across plays. Producers are abilities (M3) and pancakes (within-play only, see engine.js); this module is the shared
// gate and the clocks. Football clocks count completed plays the monster actually participates in; the application play does not
// consume duration; within-play statuses clear at the whistle; everything clears at the end of the game.
import { tryApply, atWhistle, endOfUnit, disablesPlay, transfer } from './status.js';

const book = (state) => (state.t8 ||= { status: {} }).status;
/** A monster's current status slot in this game, or null. */
export const statusOf = (state, mid) => book(state)[mid] || null;
/** Apply through the shared gate (football). Returns { accepted, reason, slot }. */
export function applyStatus(state, mid, attempt) {
  const r = tryApply(statusOf(state, mid), { ...attempt, mode: 'football' }); if (r.accepted) book(state)[mid] = r.slot; return r;
}
/** Is this monster disabled for the whole coming play by a counted Stunned carried over (B18)? */
export const sitsOutPlay = (state, mid) => disablesPlay(statusOf(state, mid));
/**
 * After a completed play: every participant's slot passes the whistle (within-play statuses clear) and then counts one unit
 * (the play it was applied in does not count). Monsters who did not take part are untouched.
 */
export function afterPlay(state, participantIds) {
  const b = book(state);
  for (const mid of new Set(participantIds)) { if (!(mid in b)) continue; const s = endOfUnit(atWhistle(b[mid])); if (s) b[mid] = s; else delete b[mid]; }
}
/** Opening/overtime Clash ↔ football transfer: supported statuses keep remaining duration and episode history 1:1. */
export function carryInto(state, slots, toMode = 'football') { for (const [mid, s] of Object.entries(slots || {})) { const t = transfer(s, toMode); if (t) book(state)[mid] = t; } }
export function carryOut(state, toMode = 'clash') { const out = {}; for (const [mid, s] of Object.entries(book(state))) { const t = transfer(s, toMode); if (t) out[mid] = t; } return out; }
/** The end of an actual football game clears every status. */
export function atGameEnd(state) { if (state.t8) state.t8.status = {}; }
