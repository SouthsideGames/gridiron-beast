// Task 8 M3: small helpers shared by the Fire and Water football contracts (src/sim/abilities/<family>.js). Pure over their inputs.

/** Form stage index from a form id ('family:stage'). */
export const stageOf = (form) => Number(String(form).split(':')[1] || 0);
/** An ordinary scrimmage play: not a live kickoff and not a two-point try. */
export const scrimmage = (ctx) => !ctx.kickoff && !ctx.twoPoint;
/** A value from a per-mastery table (index 0..3), the first entry when the index is out of range. */
export const byMastery = (table, m) => table[m] ?? table[0];

/**
 * A moving aura's effective-attribute layer on one monster (Heat Haze: Catching; Breakwater: Strength). Several sources of the same
 * layer keep the strongest only. The layer replaces its own previous delta each tick, so it never compounds and leaving the aura
 * restores the value. `rewrite`: when another system has rewritten the attribute outright since the last tick (a shared status
 * taking effect: Weakened / Empowered write Strength absolutely), the layer starts again from the current value.
 * Returns the fraction now applied.
 */
export function auraLayer(a, key, layer, sourceMid, frac, { rewrite = false } = {}) {
  const L = ((a.m3Aura ||= {})[layer] ||= { src: new Map(), delta: 0, set: null });
  if (frac > 0) L.src.set(sourceMid, frac); else L.src.delete(sourceMid);
  const r = L.src.size ? Math.max(...L.src.values()) : 0;
  if (!r && !L.delta) return 0;
  const without = rewrite && L.set != null && a.attrs[key] !== L.set ? a.attrs[key] : a.attrs[key] - L.delta;
  const d = -without * r; a.attrs[key] = without + d; L.delta = d; L.set = a.attrs[key];
  return r;
}

/**
 * The per-play cooldown step used by every contract here (the pilots' convention): `cd` counts the owner's qualifying plays still to
 * wait; the activation play itself never counts (`firedThisPlay`). "Fires 1, unavailable 2-4, ready 5" is cd 3.
 * `cd` is the repeatable-signature cooldown the Light field's extra unit reduces (registry.js extraCooldownUnit).
 */
export function cooldownStep(st, firedThisPlay) { if (st.cd > 0 && !firedThisPlay) st.cd -= 1; }
