// Task 8 M2 (WP5): per-game stamina in a football game (spec §12; N7c B10). Kept in the game state's Task 8 block. Capacity and
// initial stamina equal the monster's permanent Durability (1:1). Every completed play a monster takes part in drains 1 (while
// Afflicted: permanent / max(1, effective Durability)); bench and other-unit time never drain. Only halftime restores 50% of capacity.
// At zero the monster is exhausted for the rest of the actual game: all 12 effective attributes halved once (engine.js).
import { startGame, drainPlay, halftime as restHalf } from './stamina.js';
import { statusOf } from './status-runtime.js';
import { effectiveAttr } from './status-effects.js';

const book = (state) => ((state.t8 ||= { status: {} }).stamina ||= {});
const perm = (x) => Math.max(1, Math.round(x?.permDurability ?? x?.attrs?.durability ?? 60));
/** A participant's stamina record, created at first participation from his permanent Durability. */
export function staminaOf(state, input) { const b = book(state); if (!input?.id) return null; return (b[input.id] ||= startGame(perm(input))); }
/** After a completed play: each participant drains (Afflicted drains faster, B10). */
export function afterPlay(state, inputs) {
  const seen = new Set();
  for (const x of inputs) { if (!x?.id || seen.has(x.id)) continue; seen.add(x.id); const s = staminaOf(state, x); const slot = statusOf(state, x.id); const af = slot?.id === 'afflicted';
    // Afflicted (STA-05) lowers effective Durability by its payload; the stored rating is unchanged (status-effects.js).
    book(state)[x.id] = drainPlay(s, { afflicted: af, effectiveDurability: af ? effectiveAttr(slot, 'durability', x.attrs?.durability ?? perm(x)) : x.attrs?.durability }); }
}
/** Halftime: every record restores 50% of capacity, capped at full; exhaustion stays. */
export function halftime(state) { const b = book(state); for (const k of Object.keys(b)) b[k] = restHalf(b[k]); }
/** The monsters exhausted in this game (their attributes are halved by the engine), or null when none. */
export function exhaustedSet(state) { const b = state.t8?.stamina; if (!b) return null; const ids = Object.keys(b).filter((k) => b[k].exhausted); return ids.length ? new Set(ids) : null; }
