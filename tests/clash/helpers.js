// Shared helpers for the Beast Clash tests: synthetic monsters only, from species data and fixed seeds.
import { createRng } from '../../src/core/rng.js';
import { generateMonster } from '../../src/data/monsters.js';
import { SPECIES_DEX } from '../../src/data/species.js';
import { archetypeOf } from '../../src/clash/stats.js';

export const SP = Object.fromEntries(SPECIES_DEX.map((s) => [s.id, s]));
export function mon(id, seed = 1, { overall = 65, fatigue = 0, stage = 0, nature = null } = {}) {
  const s = SP[id]; const m = generateMonster(createRng(seed), { species: id, position: s.position, quality: overall, type: s.element, nature });
  m.fatigue = fatigue; if (stage) m.stage = stage; return m;
}
export const byArch = (a) => SPECIES_DEX.filter((s) => archetypeOf(s.id) === a).map((s) => s.id);
export function randomLineup(rng, n, pool = SPECIES_DEX.map((s) => s.id)) { return Array.from({ length: n }, (_, i) => mon(pool[rng.int(pool.length)], rng.seed(), { overall: 60 + rng.int(10) })); }
/** Run `fn` with Math.random and Date.now replaced by throwing stubs, so any engine use of them fails the test. */
export function withoutRandomness(fn) {
  const R = Math.random, D = Date.now, P = globalThis.performance?.now;
  Math.random = () => { throw new Error('Math.random called inside the Clash engine'); };
  Date.now = () => { throw new Error('Date.now called inside the Clash engine'); };
  if (globalThis.performance) globalThis.performance.now = () => { throw new Error('performance.now called inside the Clash engine'); };
  try { return fn(); } finally { Math.random = R; Date.now = D; if (globalThis.performance) globalThis.performance.now = P; }
}
export const deepFrozen = (o) => Object.isFrozen(o) && Object.values(o).every((v) => !v || typeof v !== 'object' || deepFrozen(v));
