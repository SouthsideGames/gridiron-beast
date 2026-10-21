// Beast Clash AI: deterministic decisions from a closed list of named policies. No callbacks.
// Swap policies choose whether the front monster steps out; lineup selection builds a side for
// the Lab's Auto button and for AI opponents. Everything here is deterministic given the seeded
// generator the engine hands in, and the generator is only used to break an exact tie.
// Player-facing fatigue confirmations do NOT live here (they are Arena session / UI concerns for 2b).
import { CLASH_VALUES } from './values.js';
import { typeFactor } from './types.js';

export const POLICIES = Object.freeze(['none', 'defensive', 'type', 'balanced']);
export const POLICY_LABEL = Object.freeze({ none: 'Never swaps', defensive: 'Swaps out below 30% HP', type: 'Swaps for a type edge', balanced: 'Weighs HP, type and condition' });

/** Returns the bench monster to bring in, or null. `front`, `bench` and `foe` are live engine records. */
export function chooseSwap(policy, { front, bench, foe, rng }) {
  if (!front || !bench.length || !foe) return null;
  const V = CLASH_VALUES.swaps;
  const hpShare = (x) => x.hp / x.c.maxHp;
  const healthiest = () => bench.slice().sort((p, q) => hpShare(q) - hpShare(p) || p.c.id.localeCompare(q.c.id))[0];
  if (policy === 'defensive') return hpShare(front) < V.defensiveHp ? healthiest() : null;
  if (policy === 'type') {
    if (typeFactor(front.c.type, foe.c.type) >= 1) return null;
    const better = bench.filter((x) => typeFactor(x.c.type, foe.c.type) > 1 && hpShare(x) > 0.3);
    return better.sort((p, q) => hpShare(q) - hpShare(p) || p.c.id.localeCompare(q.c.id))[0] || null;
  }
  if (policy === 'balanced') {
    const score = (x) => hpShare(x) + (typeFactor(x.c.type, foe.c.type) > 1 ? 0.25 : typeFactor(x.c.type, foe.c.type) < 1 ? -0.25 : 0) + (x.cs.cond || x.cs.paused ? -0.2 : 0);
    const stay = score(front);
    const ranked = bench.map((x) => ({ x, s: score(x) })).sort((p, q) => q.s - p.s || p.x.c.id.localeCompare(q.x.c.id));
    const best = ranked[0];
    if (best.s > stay + 0.35) return best.x;
    if (best.s === stay + 0.35 && rng.chance(0.5)) return best.x; // exact tie: the one seeded draw a policy may make
    return null;
  }
  return null;
}

/**
 * Pick a lineup of `n` species for the Lab's Auto button or an AI opponent: one Tank first when
 * available, then the best remaining by overall with at most two of one archetype.
 * `pool` is [{ species, archetype, overall, type }]; returns the chosen entries in lineup order.
 */
export function chooseLineup(pool, n, rng) {
  const byOvr = pool.slice().sort((p, q) => q.overall - p.overall || p.species.localeCompare(q.species));
  const out = []; const count = {};
  const take = (x) => { out.push(x); count[x.archetype] = (count[x.archetype] || 0) + 1; };
  const tank = byOvr.find((x) => x.archetype === 'Tank'); if (tank && n >= 2) take(tank);
  for (const x of byOvr) { if (out.length >= n) break; if (out.includes(x)) continue; if ((count[x.archetype] || 0) >= 2 && byOvr.some((y) => !out.includes(y) && (count[y.archetype] || 0) < 2)) continue; take(x); }
  while (out.length < n && byOvr.length > out.length) take(byOvr.find((x) => !out.includes(x)));
  // Order: Tank in front, Supports and Disruptors toward the back; ties broken by the seeded draw.
  const rank = { Tank: 0, Balanced: 1, Striker: 2, Disruptor: 3, Support: 4 };
  return out.map((x) => ({ x, r: rank[x.archetype] + rng.next() * 0.01 })).sort((p, q) => p.r - q.r).map((p) => p.x);
}
