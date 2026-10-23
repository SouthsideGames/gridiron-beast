// Franchise ids (GDD §43.4): a random UUID from the platform, never from the game's seeded RNG, so giving a franchise an id
// cannot change a single game outcome.
export function newUid() {
  try { if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID(); } catch { /* fall through */ }
  const h = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${h(8)}-${h(4)}-4${h(3)}-${['8', '9', 'a', 'b'][Math.floor(Math.random() * 4)]}${h(3)}-${h(12)}`;
}
