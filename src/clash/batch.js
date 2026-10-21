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
/** Species pool for one slot spec: 'random' | an archetype | 'mixedDefense' | 'species:<id>'. */
function poolFor(want) {
  if (want === 'random') return SPECIES_DEX; if (want === 'mixedDefense') return [...BY_ARCH.Tank, ...BY_ARCH.Support];
  if (typeof want === 'string' && want.startsWith('species:')) { const sp = SPECIES_DEX.find((s) => s.id === want.slice(8)); if (!sp) throw new Error(`Unknown species ${want}`); return [sp]; }
  if (!BY_ARCH[want]) throw new Error(`Unknown lineup spec ${want}`); return BY_ARCH[want];
}
function lineup(rng, spec, size, { overall, overallSpread = 0, durability = 0, shuffle = false }) {
  // spec: 'random' | an archetype | 'mixedDefense' | 'species:<id>' | an array of those, one per slot
  const out = [];
  for (let i = 0; i < size; i++) {
    const want = Array.isArray(spec) ? spec[i] : spec;
    const sp = pick(rng, poolFor(want)); const q = overall + (overallSpread ? rng.int(overallSpread + 1) : 0);
    out.push(syntheticMonster(sp.id, { seed: rng.seed(), overall: q, durability }));
  }
  if (shuffle || (Array.isArray(spec) && spec.shuffle)) for (let j = out.length - 1; j > 0; j--) { const q = rng.int(j + 1); [out[j], out[q]] = [out[q], out[j]]; }
  return out;
}

/**
 * Run one family of battles. family: { a, b, size, n, overall, overallSpread, durability, seed, config, sidesAlternate }
 * Returns rates by archetype (monsters of that archetype on the winning side), side A win rate, length distribution,
 * cap rate, resolution counts, back-row and heal tallies. `onProgress(done, n)` lets the Lab yield to the screen.
 */
export function runFamily(family, onProgress = null) {
  const { a = 'random', b = 'random', size = 3, n = 500, overall = 65, overallSpread = 0, durability = 0, seed = 1, config = {}, sidesAlternate = true, shuffle = false } = family;
  const rng = createRng(seed); const arch = {}; const species = {}; const lengths = []; let capped = 0, aWins = 0; const by = { knockout: 0, hp: 0, coin: 0 };
  const tallies = { benchActs: 0, benchHits: 0, benchBlocked: 0, forcedSwaps: 0, swapRefused: 0, voluntarySwaps: 0, liftSwaps: 0, arrivalDamage: 0, entryShields: 0, heal: 0, shield: 0, shockAttempts: 0, shockApplied: 0, shockReplaced: 0, shockResisted: 0, shockMissed: 0, shockSkips: 0, kos: 0, kosAfterSd: 0, stalemate: 0 };
  let sdReached = 0, sdResolvedKo = 0, sdResolvedHp = 0; const hist = {};
  for (let i = 0; i < n; i++) {
    const A = lineup(rng, a, size, { overall, overallSpread, durability, shuffle }), B = lineup(rng, b, size, { overall, overallSpread, durability, shuffle });
    const swap = sidesAlternate && i % 2 === 1;
    const r = simulateClash({ a: swap ? B : A, b: swap ? A : B, seed: rng.seed(), config });
    const winA = swap ? r.winner === 'b' : r.winner === 'a';
    if (winA) aWins++; lengths.push(r.exchanges); if (r.capped) capped++; by[r.by]++; hist[r.exchanges] = (hist[r.exchanges] || 0) + 1;
    const sdFrom = CLASH_VALUES.suddenDeath[r.model]?.from ?? 12; const inSd = r.exchanges >= sdFrom; if (inSd) { sdReached++; if (r.by === 'knockout') sdResolvedKo++; else sdResolvedHp++; }
    for (const [side, L] of [['a', r.lines.a], ['b', r.lines.b]]) for (const x of L) { const o = (arch[x.archetype] ||= [0, 0]); o[1]++; if (r.winner === side) o[0]++; const sp = (species[x.species] ||= [0, 0, x.archetype]); sp[1]++; if (r.winner === side) sp[0]++; }
    let prevEnter = null;
    for (const e of r.log) {
      if (e.kind === 'shield' && e.actor === e.target && prevEnter === e.actor) tallies.entryShields++;
      prevEnter = e.kind === 'enter' ? e.actor : null;
      if (e.kind === 'condition' && e.condition === 'shock') { tallies.shockAttempts++; if (e.result === 'applied') tallies.shockApplied++; else if (e.result === 'replaced') tallies.shockReplaced++; else if (e.result === 'missed') tallies.shockMissed++; else if (/^resisted/.test(e.result)) tallies.shockResisted++; }
      if (e.kind === 'ko' && e.ex >= sdFrom) tallies.kosAfterSd++;
      if (e.kind === 'swap' && !e.forced) { if (/ policy: /.test(e.text)) tallies.voluntarySwaps++; else tallies.liftSwaps++; }
      if (e.kind === 'bench_miss' || e.kind === 'bench_blocked') { if (e.kind === 'bench_blocked') tallies.benchBlocked++; else tallies.benchActs++; }
      else if (e.kind === 'condition' && /from the bench/.test(e.text)) { tallies.benchActs++; if (e.result === 'applied' || e.result === 'replaced') tallies.benchHits++; }
      else if (e.kind === 'swap' && e.forced) tallies.forcedSwaps++;
      else if (e.kind === 'swap_refused') tallies.swapRefused++;
      else if (e.kind === 'damage' && /arrival hit/.test(e.text)) tallies.arrivalDamage += e.damage;
      else if (e.kind === 'heal') tallies.heal += e.amount || 0;
      else if (e.kind === 'shield') tallies.shield += e.amount || 0;
      else if (e.kind === 'skip' && /shocked/.test(e.text)) tallies.shockSkips++;
      else if (e.kind === 'ko') tallies.kos++;
      else if (e.kind === 'stalemate') tallies.stalemate++;
    }
    if (onProgress && (i % 50 === 49 || i === n - 1)) onProgress(i + 1, n);
  }
  lengths.sort((p, q) => p - q); const q = (p) => lengths[Math.min(n - 1, Math.floor(n * p))];
  const per = (k) => Math.round(tallies[k] / n * 100) / 100;
  return {
    family: { a, b, size, n, overall, overallSpread, durability, seed, config, shuffle },
    aWin: wilson(aWins, n), aWins, n, archetypes: Object.fromEntries(ARCHETYPES.filter((k) => arch[k]).map((k) => [k, { rate: wilson(arch[k][0], arch[k][1]), wins: arch[k][0], n: arch[k][1] }])),
    species: Object.fromEntries(Object.entries(species).map(([k, [w, m, ar]]) => [k, { wins: w, n: m, archetype: ar, rate: wilson(w, m) }])),
    length: { mean: Math.round(lengths.reduce((s, x) => s + x, 0) / n * 10) / 10, median: q(0.5), p90: q(0.9), p95: q(0.95), hist },
    capPct: Math.round(capped / n * 1000) / 10, by: { knockout: by.knockout, hp: by.hp, coin: by.coin },
    suddenDeath: { reachedPct: Math.round(sdReached / n * 1000) / 10, resolvedKo: sdResolvedKo, resolvedHp: sdResolvedHp },
    perBattle: Object.fromEntries(Object.keys(tallies).map((k) => [k, per(k)])), tallies: { ...tallies },
  };
}

/** Merge several runs of the same family (the Lab runs chunks; the Gate B tool runs the same chunks headless). */
export function mergeRuns(parts) {
  const n = parts.reduce((s, p) => s + p.n, 0); const aWins = parts.reduce((s, p) => s + p.aWins, 0);
  const arch = {}, species = {}, by = { knockout: 0, hp: 0, coin: 0 }, hist = {}, tallies = {}; let capped = 0, sdR = 0, sdK = 0, sdH = 0, sum = 0;
  for (const p of parts) {
    for (const [k, v] of Object.entries(p.archetypes)) { const o = (arch[k] ||= [0, 0]); o[0] += v.wins; o[1] += v.n; }
    for (const [k, v] of Object.entries(p.species)) { const o = (species[k] ||= [0, 0, v.archetype]); o[0] += v.wins; o[1] += v.n; }
    for (const k of Object.keys(by)) by[k] += p.by[k]; for (const [k, v] of Object.entries(p.length.hist)) hist[k] = (hist[k] || 0) + v;
    for (const [k, v] of Object.entries(p.tallies)) tallies[k] = (tallies[k] || 0) + v;
    capped += p.capPct * p.n / 100; sdR += p.suddenDeath.reachedPct * p.n / 100; sdK += p.suddenDeath.resolvedKo; sdH += p.suddenDeath.resolvedHp; sum += p.length.mean * p.n;
  }
  const lengths = []; for (const [k, v] of Object.entries(hist)) for (let i = 0; i < v; i++) lengths.push(Number(k)); lengths.sort((p, q) => p - q); const q = (x) => lengths[Math.min(n - 1, Math.floor(n * x))];
  return {
    family: { ...parts[0].family, n }, aWin: wilson(aWins, n), aWins, n,
    archetypes: Object.fromEntries(ARCHETYPES.filter((k) => arch[k]).map((k) => [k, { rate: wilson(arch[k][0], arch[k][1]), wins: arch[k][0], n: arch[k][1] }])),
    species: Object.fromEntries(Object.entries(species).map(([k, [w, m, ar]]) => [k, { wins: w, n: m, archetype: ar, rate: wilson(w, m) }])),
    length: { mean: Math.round(sum / n * 10) / 10, median: q(0.5), p90: q(0.9), p95: q(0.95), hist }, capPct: Math.round(capped / n * 1000) / 10, by,
    suddenDeath: { reachedPct: Math.round(sdR / n * 1000) / 10, resolvedKo: sdK, resolvedHp: sdH },
    perBattle: Object.fromEntries(Object.keys(tallies).map((k) => [k, Math.round(tallies[k] / n * 100) / 100])), tallies,
  };
}
/** Run a family in 50-battle chunks seeded 4242 + offset, exactly as the Lab's Batch screen does, so Lab numbers match. */
export function runFamilyChunked(family, chunk = 50, baseSeed = 4242) {
  const parts = []; for (let done = 0; done < family.n; done += chunk) parts.push(runFamily({ ...family, n: Math.min(chunk, family.n - done), seed: baseSeed + done }));
  return mergeRuns(parts);
}
/** Difference of two win rates in percentage points with a 95% Wald interval: [diff, low, high]. */
export function diffCI(w1, n1, w2, n2) { if (!n1 || !n2) return [0, 0, 0]; const p1 = w1 / n1, p2 = w2 / n2; const se = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2); const d = p1 - p2; return [d, d - 1.96 * se, d + 1.96 * se].map((v) => Math.round(v * 1000) / 10); }

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

/**
 * The Gate B comparison plan. Each entry is a family plus the configurations it is run under; the headless tool
 * (tools/clash-gateb.mjs) and the Lab's Batch screen both use runFamilyChunked, so any row here can be reproduced
 * on the phone with the same label, n and switches. Sizes are chosen so a 3-point win-rate difference is resolvable.
 */
export function gateBFamilies() {
  const R = (k) => Array(k).fill('random'); const P = (arch, k) => Array(k).fill(arch);
  const mix = (arch, k, size) => [...P(arch, k), ...R(size - k)];
  const BR = ['A', 'B', 'C', 'D', 'E'].map((backRow) => ({ backRow })), STRUCT = [{}, { O1: true }, { O2: true }, { O1: true, O2: true }], DUR = ['F', 'R2', 'C6'].map((duration) => ({ duration }));
  const base = [{}];
  return [
    // A. back-row Disruptors (Test E baseline vs A-D)
    { section: 'backrow', label: 'Random mixed 3v3', a: 'random', b: 'random', size: 3, n: 3000, overall: 62, overallSpread: 7, shuffle: true, configs: BR },
    { section: 'backrow', label: 'Random mixed 5v5', a: 'random', b: 'random', size: 5, n: 2000, overall: 62, overallSpread: 7, shuffle: true, configs: BR },
    { section: 'backrow', label: '3 Disruptors v random 3v3', a: 'Disruptor', b: 'random', size: 3, n: 2000, configs: BR },
    { section: 'backrow', label: '5 Disruptors v random 5v5', a: 'Disruptor', b: 'random', size: 5, n: 1500, configs: BR },
    { section: 'backrow', label: '1 Disruptor + 2 random v random 3v3', a: mix('Disruptor', 1, 3), b: 'random', size: 3, n: 2000, shuffle: true, configs: BR },
    { section: 'backrow', label: '2 Disruptors + 1 random v random 3v3', a: mix('Disruptor', 2, 3), b: 'random', size: 3, n: 2000, shuffle: true, configs: BR },
    { section: 'backrow', label: '1 Disruptor + 4 random v random 5v5', a: mix('Disruptor', 1, 5), b: 'random', size: 5, n: 1500, shuffle: true, configs: BR },
    { section: 'backrow', label: '2 Disruptors + 3 random v random 5v5', a: mix('Disruptor', 2, 5), b: 'random', size: 5, n: 1500, shuffle: true, configs: BR },
    { section: 'backrow', label: '5 Disruptors v 5 Tanks', a: 'Disruptor', b: 'Tank', size: 5, n: 1000, configs: BR },
    { section: 'backrow', label: '3 Disruptors v 3 Tanks', a: 'Disruptor', b: 'Tank', size: 3, n: 1000, configs: BR },
    { section: 'backrow', label: '3 Disruptors v 3 Supports', a: 'Disruptor', b: 'Support', size: 3, n: 1000, configs: BR },
    { section: 'backrow', label: '3 Disruptors v 3 Strikers', a: 'Disruptor', b: 'Striker', size: 3, n: 1000, configs: BR },
    { section: 'backrow', label: '3 Disruptors v 3 Balanced', a: 'Disruptor', b: 'Balanced', size: 3, n: 1000, configs: BR },
    // B. Shock (baseline values; compositions, ratings, sizes, Stormlynx)
    { section: 'shock', label: 'Random 3v3 at 55', a: 'random', b: 'random', size: 3, n: 2000, overall: 55, shuffle: true, configs: base },
    { section: 'shock', label: 'Random 3v3 at 65', a: 'random', b: 'random', size: 3, n: 2000, overall: 65, shuffle: true, configs: base },
    { section: 'shock', label: 'Random 3v3 at 75', a: 'random', b: 'random', size: 3, n: 2000, overall: 75, shuffle: true, configs: base },
    { section: 'shock', label: 'Random 5v5 at 55', a: 'random', b: 'random', size: 5, n: 1500, overall: 55, shuffle: true, configs: base },
    { section: 'shock', label: 'Random 5v5 at 65', a: 'random', b: 'random', size: 5, n: 1500, overall: 65, shuffle: true, configs: base },
    { section: 'shock', label: 'Random 5v5 at 75', a: 'random', b: 'random', size: 5, n: 1500, overall: 75, shuffle: true, configs: base },
    { section: 'shock', label: 'Stormlynx + 2 random v random 3v3', a: ['species:stormlynx', 'random', 'random'], b: 'random', size: 3, n: 2000, shuffle: true, configs: base },
    { section: 'shock', label: 'Stormlynx + 4 random v random 5v5', a: ['species:stormlynx', 'random', 'random', 'random', 'random'], b: 'random', size: 5, n: 1500, shuffle: true, configs: base },
    { section: 'shock', label: 'Stormlynx front + 2 random v random 3v3', a: ['species:stormlynx', 'random', 'random'], b: 'random', size: 3, n: 2000, configs: base },
    { section: 'shock', label: 'Stormlynx v Tank 1v1', a: 'species:stormlynx', b: 'Tank', size: 1, n: 1000, configs: base },
    { section: 'shock', label: 'Stormlynx v Striker 1v1', a: 'species:stormlynx', b: 'Striker', size: 1, n: 1000, configs: base },
    { section: 'shock', label: 'Stormlynx v Support 1v1', a: 'species:stormlynx', b: 'Support', size: 1, n: 1000, configs: base },
    { section: 'shock', label: 'Stormlynx v Balanced 1v1', a: 'species:stormlynx', b: 'Balanced', size: 1, n: 1000, configs: base },
    { section: 'shock', label: 'Stormlynx v Disruptor 1v1', a: 'species:stormlynx', b: 'Disruptor', size: 1, n: 1000, configs: base },
    { section: 'shock', label: 'Stormlynx v random 1v1', a: 'species:stormlynx', b: 'random', size: 1, n: 2000, configs: base },
    { section: 'shock', label: '3 Disruptors v random 3v3 (shock view)', a: 'Disruptor', b: 'random', size: 3, n: 2000, configs: base },
    // C. structural 5v5 (baseline, O1, O2, O3)
    { section: 'struct', label: 'Random mixed 5v5', a: 'random', b: 'random', size: 5, n: 2000, overall: 62, overallSpread: 7, shuffle: true, configs: STRUCT },
    { section: 'struct', label: 'Random mixed 5v5 at 55', a: 'random', b: 'random', size: 5, n: 1500, overall: 55, shuffle: true, configs: STRUCT },
    { section: 'struct', label: 'Random mixed 5v5 at 75', a: 'random', b: 'random', size: 5, n: 1500, overall: 75, shuffle: true, configs: STRUCT },
    { section: 'struct', label: 'Random mixed 5v5, fixed order', a: 'random', b: 'random', size: 5, n: 1500, overall: 62, overallSpread: 7, shuffle: false, configs: STRUCT },
    { section: 'struct', label: '5 Tanks v random', a: 'Tank', b: 'random', size: 5, n: 1000, configs: STRUCT },
    { section: 'struct', label: '5 Supports v random', a: 'Support', b: 'random', size: 5, n: 1000, configs: STRUCT },
    { section: 'struct', label: '5 Strikers v random', a: 'Striker', b: 'random', size: 5, n: 1000, configs: STRUCT },
    { section: 'struct', label: '5 Balanced v random', a: 'Balanced', b: 'random', size: 5, n: 1000, configs: STRUCT },
    { section: 'struct', label: '5 Disruptors v random', a: 'Disruptor', b: 'random', size: 5, n: 1000, configs: STRUCT },
    { section: 'struct', label: '1 Support + 4 random v random', a: mix('Support', 1, 5), b: 'random', size: 5, n: 1500, shuffle: true, configs: STRUCT },
    { section: 'struct', label: '2 Supports + 3 random v random', a: mix('Support', 2, 5), b: 'random', size: 5, n: 1500, shuffle: true, configs: STRUCT },
    { section: 'struct', label: '1 Tank + 4 random v random', a: mix('Tank', 1, 5), b: 'random', size: 5, n: 1500, shuffle: true, configs: STRUCT },
    { section: 'struct', label: '2 Tanks + 3 random v random', a: mix('Tank', 2, 5), b: 'random', size: 5, n: 1500, shuffle: true, configs: STRUCT },
    { section: 'struct', label: '5 Supports v 5 Tanks', a: 'Support', b: 'Tank', size: 5, n: 1000, configs: STRUCT },
    { section: 'struct', label: '5 Disruptors v 5 Tanks', a: 'Disruptor', b: 'Tank', size: 5, n: 1000, configs: STRUCT },
    { section: 'struct', label: '5 Strikers v 5 Tanks', a: 'Striker', b: 'Tank', size: 5, n: 1000, configs: STRUCT },
    { section: 'struct', label: '5 Tanks mirror', a: 'Tank', b: 'Tank', size: 5, n: 600, configs: STRUCT },
    { section: 'struct', label: '5 Supports mirror', a: 'Support', b: 'Support', size: 5, n: 600, configs: STRUCT },
    { section: 'struct', label: '3 Tanks + 2 Supports mirror', a: [...P('Tank', 3), ...P('Support', 2)], b: [...P('Tank', 3), ...P('Support', 2)], size: 5, n: 600, configs: STRUCT },
    { section: 'struct', label: 'Mixed defense v 5 Strikers', a: 'mixedDefense', b: 'Striker', size: 5, n: 1000, configs: STRUCT },
    { section: 'struct', label: 'Mixed defense v 5 Disruptors', a: 'mixedDefense', b: 'Disruptor', size: 5, n: 1000, configs: STRUCT },
    // D. defensive duration (F, R2, C6)
    { section: 'duration', label: '5 Tanks mirror', a: 'Tank', b: 'Tank', size: 5, n: 1000, configs: DUR },
    { section: 'duration', label: '5 Supports mirror', a: 'Support', b: 'Support', size: 5, n: 1000, configs: DUR },
    { section: 'duration', label: '3 Tanks + 2 Supports mirror', a: [...P('Tank', 3), ...P('Support', 2)], b: [...P('Tank', 3), ...P('Support', 2)], size: 5, n: 1000, configs: DUR },
    { section: 'duration', label: '5 Tanks v 5 Supports', a: 'Tank', b: 'Support', size: 5, n: 1000, configs: DUR },
    { section: 'duration', label: 'Mixed defense v 5 Strikers', a: 'mixedDefense', b: 'Striker', size: 5, n: 1000, configs: DUR },
    { section: 'duration', label: 'Mixed defense v 5 Disruptors', a: 'mixedDefense', b: 'Disruptor', size: 5, n: 1000, configs: DUR },
    { section: 'duration', label: 'Mixed defense v 5 Balanced', a: 'mixedDefense', b: 'Balanced', size: 5, n: 1000, configs: DUR },
    { section: 'duration', label: 'Random mixed 5v5', a: 'random', b: 'random', size: 5, n: 2000, overall: 62, overallSpread: 7, shuffle: true, configs: DUR },
    { section: 'duration', label: 'Random mixed 3v3', a: 'random', b: 'random', size: 3, n: 2000, overall: 62, overallSpread: 7, shuffle: true, configs: DUR },
    { section: 'duration', label: '3 Tanks mirror 3v3', a: 'Tank', b: 'Tank', size: 3, n: 1000, configs: DUR },
    { section: 'duration', label: '3 Supports mirror 3v3', a: 'Support', b: 'Support', size: 3, n: 1000, configs: DUR },
    { section: 'duration', label: 'Mixed defense v 3 Strikers 3v3', a: 'mixedDefense', b: 'Striker', size: 3, n: 1000, configs: DUR },
    // E. sudden death by lineup size, and swap policies
    { section: 'sudden', label: 'Random 1v1', a: 'random', b: 'random', size: 1, n: 2000, shuffle: true, configs: base },
    { section: 'sudden', label: 'Random 2v2', a: 'random', b: 'random', size: 2, n: 2000, shuffle: true, configs: base },
    { section: 'sudden', label: 'Random 3v3', a: 'random', b: 'random', size: 3, n: 2000, shuffle: true, configs: base },
    { section: 'sudden', label: 'Random 4v4', a: 'random', b: 'random', size: 4, n: 1500, shuffle: true, configs: base },
    { section: 'sudden', label: 'Random 5v5', a: 'random', b: 'random', size: 5, n: 1500, shuffle: true, configs: base },
    { section: 'sudden', label: '3 Tanks mirror 3v3 (E)', a: 'Tank', b: 'Tank', size: 3, n: 1000, configs: base },
    { section: 'sudden', label: '5 Tanks mirror 5v5 (F)', a: 'Tank', b: 'Tank', size: 5, n: 1000, configs: base },
    { section: 'swaps', label: 'Random 3v3, no swaps', a: 'random', b: 'random', size: 3, n: 1500, shuffle: true, configs: [{}] },
    { section: 'swaps', label: 'Random 3v3, defensive policy both', a: 'random', b: 'random', size: 3, n: 1500, shuffle: true, configs: [{ policies: { a: 'defensive', b: 'defensive' } }] },
    { section: 'swaps', label: 'Random 3v3, balanced policy both', a: 'random', b: 'random', size: 3, n: 1500, shuffle: true, configs: [{ policies: { a: 'balanced', b: 'balanced' } }] },
    { section: 'swaps', label: 'Random 3v3, type policy both', a: 'random', b: 'random', size: 3, n: 1500, shuffle: true, configs: [{ policies: { a: 'type', b: 'type' } }] },
    { section: 'swaps', label: 'Random 3v3, balanced v none', a: 'random', b: 'random', size: 3, n: 1500, shuffle: true, sidesAlternate: false, configs: [{ policies: { a: 'balanced', b: 'none' } }] },
    { section: 'swaps', label: 'Random 5v5, no swaps', a: 'random', b: 'random', size: 5, n: 1000, shuffle: true, configs: [{}] },
    { section: 'swaps', label: 'Random 5v5, balanced policy both', a: 'random', b: 'random', size: 5, n: 1000, shuffle: true, configs: [{ policies: { a: 'balanced', b: 'balanced' } }] },
    { section: 'swaps', label: 'Random 5v5, balanced v none', a: 'random', b: 'random', size: 5, n: 1000, shuffle: true, sidesAlternate: false, configs: [{ policies: { a: 'balanced', b: 'none' } }] },
    { section: 'swaps', label: '5 Disruptors v 5 Tanks, defensive Tanks', a: 'Disruptor', b: 'Tank', size: 5, n: 1000, configs: [{ policies: { a: 'none', b: 'defensive' } }] },
    // F. archetype matchup matrix (75/25 benchmark), baseline
    ...[['Tank', 'Striker'], ['Tank', 'Support'], ['Tank', 'Disruptor'], ['Tank', 'Balanced'], ['Striker', 'Support'], ['Striker', 'Disruptor'], ['Striker', 'Balanced'], ['Support', 'Disruptor'], ['Support', 'Balanced'], ['Disruptor', 'Balanced']].flatMap(([x, y]) => [
      { section: 'matrix', label: `${x} v ${y} 3v3`, a: x, b: y, size: 3, n: 1000, configs: base }, { section: 'matrix', label: `${x} v ${y} 5v5`, a: x, b: y, size: 5, n: 800, configs: base }]),
  ];
}
