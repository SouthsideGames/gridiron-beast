// Seeded, serialisable random number generator (mulberry32).
// Every random decision in the game flows through one of these so any play,
// game or season can be reproduced from its seed.

function build(initialState) {
  let s = initialState >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** Float in [a, b). */
    range: (a, b) => a + (b - a) * next(),
    /** Integer in [0, n). */
    int: (n) => Math.floor(next() * n),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    /** Standard normal via Box-Muller. */
    normal: () => {
      const u = Math.max(1e-9, next());
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    /** Weighted pick from [[item, weight], ...]. */
    weighted: (entries) => {
      const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
      if (total <= 0) return entries[0]?.[0];
      let roll = next() * total;
      for (const [item, w] of entries) {
        roll -= Math.max(0, w);
        if (roll <= 0) return item;
      }
      return entries[entries.length - 1][0];
    },
    /** A fresh 32-bit seed derived from this stream (for child simulations). */
    seed: () => (Math.floor(next() * 4294967295) >>> 0) || 1,
    /** Serialisable generator state. */
    get state() { return s; },
  };
}

export function createRng(seed = 1) {
  const s = (Number(seed) >>> 0) || 0x9e3779b9;
  return build(s);
}

/** Restore an RNG from a saved `state` value. */
export function rngFromState(state) {
  return build(state);
}

/** Stable 32-bit hash of a string (FNV-1a) for deterministic per-entity seeds. */
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}
