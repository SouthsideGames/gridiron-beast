// Beast Clash batch runner: the same code behind the Lab's Batch screen and tools/clash-balance.mjs,
// so a number seen on the phone is the number the report checks. Synthetic monsters only, built
// from species data at a chosen overall by a seeded generator; nothing is loaded from a save.
import { createRng } from '../core/rng.js';
import { generateMonster } from '../data/monsters.js';
import { SPECIES_DEX } from '../data/species.js';
import { CLASH_VALUES } from './values.js';
import { simulateClash } from './engine.js';
import { archetypeOf } from './stats.js';

export const ARCHETYPES = Object.freeze(['Tank', 'Balanced', 'Striker', 'Support', 'Disruptor']);
const BY_ARCH = Object.fromEntries(ARCHETYPES.map((a) => [a, SPECIES_DEX.filter((s) => archetypeOf(s.id) === a)]));

/** A synthetic monster for a species at an overall (quality) from a seeded generator. */
export function syntheticMonster(speciesId, { seed = 1, overall = 65, durability = 0 } = {}) {
  const sp = SPECIES_DEX.find((s) => s.id === speciesId); if (!sp) throw new Error(`Unknown species ${speciesId}`);
  const m = generateMonster(createRng(seed), { species: sp.id, position: sp.position, quality: overall, type: sp.element });
  if (durability) m.attributes.durability = Math.max(1, Math.min(99, m.attributes.durability + durability));
  return m;
}
/** 95% Wilson interval, in percent: [rate, low, high]. */
export function wilson(w, n) { if (!n) return [0, 0, 0]; const p = w / n, z = 1.96, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d; return [100 * p, 100 * (c - h), 100 * (c + h)].map((v) => Math.round(v * 10) / 10); }

const pick = (rng, pool) => pool[rng.int(pool.length)];
function lineup(rng, spec, size, { overall, overallSpread = 0, durability = 0 }) {
  // spec: 'random' | an archetype | an array of archetype names per slot | 'mixedDefense'
  const out = [];
  for (let i = 0; i < size; i++) {
    const want = Array.isArray(spec) ? spec[i] : spec;
    const pool = want === 'random' ? SPECIES_DEX : want === 'mixedDefense' ? [...BY_ARCH.Tank, ...BY_ARCH.Support] : BY_ARCH[want];
    const sp = pick(rng, pool); const q = overall + (overallSpread ? rng.int(overallSpread + 1) : 0);
    out.push(syntheticMonster(sp.id, { seed: rng.seed(), overall: q, durability }));
  }
  if (Array.isArray(spec) && spec.shuffle) for (let j = out.length - 1; j > 0; j--) { const q = rng.int(j + 1); [out[j], out[q]] = [out[q], out[j]]; }
  return out;
}

/**
 * Run one family of battles. family: { a, b, size, n, overall, overallSpread, durability, seed, config, sidesAlternate }
 * Returns rates by archetype (monsters of that archetype on the winning side), side A win rate, length distribution,
 * cap rate, resolution counts, back-row and heal tallies. `onProgress(done, n)` lets the Lab yield to the screen.
 */
export function runFamily(family, onProgress = null) {
  const { a = 'random', b = 'random', size = 3, n = 500, overall = 65, overallSpread = 0, durability = 0, seed = 1, config = {}, sidesAlternate = true } = family;
  const rng = createRng(seed); const arch = {}; const lengths = []; let capped = 0, aWins = 0; const by = { knockout: 0, hp: 0, coin: 0 };
  const tallies = { benchActs: 0, benchHits: 0, benchBlocked: 0, forcedSwaps: 0, swapRefused: 0, arrivalDamage: 0, heal: 0, shield: 0, shockApplied: 0, shockSkips: 0, kos: 0, stalemate: 0 };
  for (let i = 0; i < n; i++) {
    const A = lineup(rng, a, size, { overall, overallSpread, durability }), B = lineup(rng, b, size, { overall, overallSpread, durability });
    const swap = sidesAlternate && i % 2 === 1;
    const r = simulateClash({ a: swap ? B : A, b: swap ? A : B, seed: rng.seed(), config });
    const winA = swap ? r.winner === 'b' : r.winner === 'a';
    if (winA) aWins++; lengths.push(r.exchanges); if (r.capped) capped++; by[r.by]++;
    for (const [side, L] of [['a', r.lines.a], ['b', r.lines.b]]) for (const x of L) { const o = (arch[x.archetype] ||= [0, 0]); o[1]++; if (r.winner === side) o[0]++; }
    for (const e of r.log) {
      if (e.kind === 'bench_miss' || e.kind === 'bench_blocked') { if (e.kind === 'bench_blocked') tallies.benchBlocked++; else tallies.benchActs++; }
      else if (e.kind === 'condition' && /from the bench/.test(e.text)) { tallies.benchActs++; if (e.result === 'applied' || e.result === 'replaced') tallies.benchHits++; }
      else if (e.kind === 'swap' && e.forced) tallies.forcedSwaps++;
      else if (e.kind === 'swap_refused') tallies.swapRefused++;
      else if (e.kind === 'damage' && /arrival hit/.test(e.text)) tallies.arrivalDamage += e.damage;
      else if (e.kind === 'heal') tallies.heal += e.amount || 0;
      else if (e.kind === 'shield') tallies.shield += e.amount || 0;
      else if (e.kind === 'condition' && e.condition === 'shock' && (e.result === 'applied' || e.result === 'replaced')) tallies.shockApplied++;
      else if (e.kind === 'skip' && /shocked/.test(e.text)) tallies.shockSkips++;
      else if (e.kind === 'ko') tallies.kos++;
      else if (e.kind === 'stalemate') tallies.stalemate++;
    }
    if (onProgress && (i % 50 === 49 || i === n - 1)) onProgress(i + 1, n);
  }
  lengths.sort((p, q) => p - q); const q = (p) => lengths[Math.min(n - 1, Math.floor(n * p))];
  const per = (k) => Math.round(tallies[k] / n * 100) / 100;
  return {
    family: { a, b, size, n, overall, overallSpread, durability, seed, config },
    aWin: wilson(aWins, n), archetypes: Object.fromEntries(ARCHETYPES.filter((k) => arch[k]).map((k) => [k, { rate: wilson(arch[k][0], arch[k][1]), n: arch[k][1] }])),
    length: { mean: Math.round(lengths.reduce((s, x) => s + x, 0) / n * 10) / 10, median: q(0.5), p90: q(0.9), p95: q(0.95) },
    capPct: Math.round(capped / n * 1000) / 10, by: { knockout: by.knockout, hp: by.hp, coin: by.coin },
    perBattle: Object.fromEntries(Object.keys(tallies).map((k) => [k, per(k)])),
  };
}

/** The Gate A report families: random mixed 3v3/5v5 plus the defensive and back-row scenarios. */
export function gateAFamilies({ n3 = 1000, n5 = 600, config = {} } = {}) {
  const T5 = Array(5).fill('Tank'), S5 = Array(5).fill('Support'), TS = ['Tank', 'Tank', 'Tank', 'Support', 'Support'];
  return [
    { label: 'Random mixed 3v3', a: 'random', b: 'random', size: 3, n: n3, overall: 62, overallSpread: 7, config },
    { label: 'Random mixed 5v5', a: 'random', b: 'random', size: 5, n: n5, overall: 62, overallSpread: 7, config },
    { label: '5 Supports v 5 Supports', a: S5, b: S5, size: 5, n: 200, config },
    { label: '5 Tanks v 5 Tanks', a: T5, b: T5, size: 5, n: 200, config },
    { label: '5 Tanks v 5 Supports', a: T5, b: S5, size: 5, n: 200, config },
    { label: '3 Tanks + 2 Supports mirror', a: TS, b: TS, size: 5, n: 200, config },
    { label: 'Mixed defense v 5 Strikers', a: 'mixedDefense', b: 'Striker', size: 5, n: 200, config },
    { label: 'Mixed defense v 5 Disruptors', a: 'mixedDefense', b: 'Disruptor', size: 5, n: 200, config },
    { label: '5 Disruptors v 5 Tanks', a: 'Disruptor', b: 'Tank', size: 5, n: 200, config },
    { label: '5 Supports v 5 Tanks', a: 'Support', b: 'Tank', size: 5, n: 200, config },
    { label: 'Strikers v Supports 3v3', a: 'Striker', b: 'Support', size: 3, n: 300, config },
  ];
}
export const VALUES_VERSION = CLASH_VALUES.version;
