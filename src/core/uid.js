// Franchise ids (GDD §43.4): a random UUID from the platform, never from the game's seeded RNG, so giving a franchise an id
// cannot change a single game outcome.
export function newUid() {
  try { if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID(); } catch { /* fall through */ }
  const h = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${h(8)}-${h(4)}-4${h(3)}-${['8', '9', 'a', 'b'][Math.floor(Math.random() * 4)]}${h(3)}-${h(12)}`;
}

/**
 * The id a franchise from before ids existed (a v39.0/v39.1 localStorage save) gets when it is migrated (GDD §47.4): derived
 * from what never changes in that franchise — its creation stamp and its seed — so every device that migrates its own copy
 * of the same franchise gives it the same id, and the copies are recognised as one franchise (cloud sync, achievements).
 * A string hash, never the seeded RNG. Falls back to a random id when either input is missing.
 */
export function legacyUid({ createdAt, seed } = {}) {
  if (!createdAt || seed == null) return newUid();
  const s = `gridiron-beast-legacy|${createdAt}|${seed}`;
  const lane = (k) => { let h = (0x811c9dc5 ^ k) >>> 0; for (let i = 0; i < s.length; i++) h = Math.imul((h ^ s.charCodeAt(i)) >>> 0, 0x01000193) >>> 0; h = (h ^ (h >>> 15)) >>> 0; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h = (h ^ (h >>> 12)) >>> 0; return h.toString(16).padStart(8, '0'); };
  const x = lane(0x1b873593) + lane(0xcc9e2d51) + lane(0x85ebca6b) + lane(0xc2b2ae35);
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-4${x.slice(13, 16)}-${'89ab'[parseInt(x[16], 16) & 3]}${x.slice(17, 20)}-${x.slice(20, 32)}`;
}
