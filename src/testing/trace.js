// Ephemeral observers only: never stored in game/save state, never draw random numbers.
const listeners = new WeakMap();
let current = null;
export function withTrace(t8, listener, run) {
  const previous = t8 && listeners.get(t8), outer = current; current = listener;
  if (t8) listeners.set(t8, listener);
  try { return run(); } finally { current = outer; if (t8) { if (previous) listeners.set(t8, previous); else listeners.delete(t8); } }
}
export function trace(t8, kind, data) {
  const listener = (t8 && listeners.get(t8)) || current; if (!listener) return;
  try { listener(kind, data); } catch { /* diagnostics must never change a play */ }
}
export const tracing = (t8) => !!current || (!!t8 && listeners.has(t8));
