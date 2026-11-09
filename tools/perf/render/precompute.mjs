// Render-performance harness, step 1: precompute the simulation (docs/task8/RENDER_PERF.md).
// Everything the browser later draws is computed here first, in Node, so the timed browser run measures rendering only.
// The simulation time per play is measured here and reported beside the rendering frame statistics (spec §26: simulation and
// rendering are reported separately).
//
// Football scenes come from the approved scene set (tools/perf/scenes.json, docs/task8/PERF_SCENES.md). The rules-tier staging
// below reproduces tools/perf/scene-worker.mjs `runRules` (same teams, overlays, primes, staged fields, per-snap situation and
// re-seed); the light fingerprint of every pass is checked against scene-worker's own `runScene`, so a drift between the two is
// caught instead of silently rendering different plays. The legendary sequence also comes from the football reviewer's
// sequence runner (src/sim/abilities/review-sequence.js), and the Clash battles from the franchise battle runner
// (src/franchise/clash-link.js runBattle).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '..', '..', '..');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/perf/scenes.json'), 'utf8'));
const ST = await import('./staging.js');
const SW = await imp('tools/perf/scene-worker.mjs');

const clone = (x) => JSON.parse(JSON.stringify(x));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
/** JSON-safe copy (Sets and Maps become arrays) of what the page needs. */
export const plain = (x) => JSON.parse(JSON.stringify(x, (k, v) => (v instanceof Set ? [...v] : v instanceof Map ? [...v] : v)));

// ------------------------------------------------------------------------------------------------ the scene-worker rules staging
// (staging.js: shared with the page's combined mode, which simulates the same snaps in the browser while they are played)
/** One pass of a rules-tier scene: every snap's sim, its own wall time, and the teams it was played with. */
function rulesPass(sc, variant) {
  return ST.rulesSnaps(MANIFEST, sc.id, variant).map(({ gs, k, run }) => { const r = run(); return { gs, k, call: r.call, sim: r.sim, ms: r.ms, teams: r.teams }; });
}
const sceneById = (id) => ST.sceneById(MANIFEST, id);
export const lightFp = (sims) => sha(sims.map(ST.lightLine).join('\n'));

// ------------------------------------------------------------------------------------------------ play selection
const ABILITY_KINDS = new Set(['ability', 'status', 'ability_ready', 'field', 'spawn', 'dragon_swallow']);
const isAbilityEvent = (e) => !!(e.ability || ABILITY_KINDS.has(e.kind));
/** Most ability effects drawn at once: ability events (non-trait, non-passive look) whose 1.2 s windows overlap. */
function peakConcurrent(sim) {
  const ts = (sim.events || []).filter((e) => e.kind === 'ability' && !e.trait).map((e) => e.t ?? 0).sort((a, b) => a - b);
  let best = 0; for (let i = 0; i < ts.length; i++) { let n = 0; for (let j = i; j < ts.length && ts[j] - ts[i] < 1.2; j++) n++; best = Math.max(best, n); }
  return best;
}
const SELECT = {
  first: (plays) => plays,
  abilities: (plays) => [...plays].sort((a, b) => (peakConcurrent(b.sim) - peakConcurrent(a.sim)) || ((b.sim.events || []).filter(isAbilityEvent).length - (a.sim.events || []).filter(isAbilityEvent).length) || (a.idx - b.idx)),
  fields: (plays) => [...plays].sort((a, b) => ((b.sim.fields?.length || 0) - (a.sim.fields?.length || 0)) || ((b.sim.events || []).filter(isAbilityEvent).length - (a.sim.events || []).filter(isAbilityEvent).length) || (a.idx - b.idx)),
};

/** The football render scenes: id, source scene, variant, how plays are chosen. */
export const FOOTBALL_SCENES = [
  { id: 'F1-ordinary', source: 'O6-rules-mix', variant: 'plain', select: 'first', what: 'ordinary football: no abilities; runs and passes through rules.js (approved scene O6)' },
  { id: 'F2-multi-ability', source: 'A5-full-contracts', variant: 'ability', select: 'abilities', what: 'several abilities at once: every on-field slot carries a Dex contract (A5); the plays with the most overlapping activations' },
  { id: 'F3-overlapping-fields', source: 'A1-overlapping-fields', variant: 'ability', select: 'fields', what: 'overlapping field effects: three staged fields plus field creators (A1); the plays with the most fields on screen' },
  { id: 'F4-legendary-scene', source: 'A4-legendary-sequence', variant: 'ability', select: 'abilities', what: 'the Legendary Plays with their Legendaries (A4: Sovereign Arm, Cyclonic Release, Landslide, Night Veil, Grove Guardian); the plays with the most activations' },
];

/** Per-play summary the report keeps (no frames). */
const playInfo = (p) => ({ gs: p.gs, k: p.k, call: p.call, result: p.sim.result, yards: p.sim.yards, frames: p.sim.frames?.length || 0, seconds: +((p.sim.frames?.length || 0) * 0.1).toFixed(1),
  abilityEvents: (p.sim.events || []).filter(isAbilityEvent).length, peakConcurrent: peakConcurrent(p.sim), fields: p.sim.fields?.length || 0, simMs: p.simMs });

const unitMap = ST.unitMap;

export function footballScene(def, { plays: nPlays = 8, simPasses = 3 } = {}) {
  const sc = sceneById(def.source);
  // Simulation timing: one warm-up pass, then `simPasses` timed passes; each play's sim time is the median over the passes.
  const passes = []; rulesPass(sc, def.variant); // warm-up (discarded)
  for (let i = 0; i < simPasses; i++) passes.push(rulesPass(sc, def.variant));
  const ref = SW.runScene(def.source, def.variant); // scene-worker's own pass of the approved scene
  const fps = passes.map((ps) => lightFp(ps.map((p) => p.sim)));
  if (fps.some((x) => x !== ref.fp)) throw new Error(`${def.id}: precompute fingerprint ${fps.join(',')} differs from scene-worker ${ref.fp} (staging drift)`);
  const all = passes[0].map((p, idx) => ({ ...p, idx, simMs: median(passes.map((ps) => ps[idx].ms)) }));
  const chosen = SELECT[def.select](all).slice(0, nPlays).sort((a, b) => a.idx - b.idx);
  const simMsAll = all.map((p) => p.simMs);
  return {
    id: def.id, kind: 'football', source: def.source, variant: def.variant, what: def.what, fingerprint: ref.fp,
    sim: { passes: simPasses, plays: all.length, medianMsPerPlay: +median(simMsAll).toFixed(3), meanMsPerPlay: +(simMsAll.reduce((a, b) => a + b, 0) / simMsAll.length).toFixed(3),
      chosenMedianMsPerPlay: +median(chosen.map((p) => p.simMs)).toFixed(3), chosenMeanMsPerPlay: +(chosen.reduce((a, p) => a + p.simMs, 0) / chosen.length).toFixed(3) },
    plays: chosen.map((p) => ({ info: playInfo(p), sim: plain(p.sim), off: unitMap(p.teams.home.offense), def: unitMap(p.teams.away.defense) })),
  };
}

/** The football reviewer's staged Sovereign Arm sequence (aurodrax): every play of the shown run, in order (formula plays without frames are skipped). */
export async function sovereignScene({ simPasses = 3 } = {}) {
  const RS = await imp('src/sim/abilities/review-sequence.js');
  const run = () => { const t0 = process.hrtime.bigint(); const r = RS.reviewSequence({ family: 'aurodrax', form: 'aurodrax:0', mastery: 0, variant: 'main' }); return { r, ms: Number(process.hrtime.bigint() - t0) / 1e6 }; };
  run(); const runs = []; for (let i = 0; i < simPasses; i++) runs.push(run());
  const r = runs[0].r; const digest = sha(RS.sequenceDigest(r));
  if (runs.some((x) => sha(RS.sequenceDigest(x.r)) !== digest)) throw new Error('F5: the reviewer sequence is not deterministic');
  const withFrames = r.plays.filter((p) => p.sim?.frames?.length > 1);
  const msPerPlay = median(runs.map((x) => x.ms)) / Math.max(1, r.plays.length);
  return {
    id: 'F5-sovereign-sequence', kind: 'football', source: 'review-sequence aurodrax main', variant: 'reviewer',
    review: { family: 'aurodrax', form: 'aurodrax:0', mastery: 0, variant: 'main', seed: r.seed, snaps: r.plays.length, light: r.plays.map((p) => (p.sim ? ST.lightLine(p.sim) : `nosim|${p.kind}`)) }, what: `the football reviewer's staged Sovereign Arm sequence (aurodrax, DRA-06-F): ${r.plays.length} plays, ok=${r.ok}, activation on play ${r.activation != null ? r.activation + 1 : '-'}`, fingerprint: digest,
    sim: { passes: simPasses, plays: r.plays.length, medianMsPerPlay: +msPerPlay.toFixed(3), meanMsPerPlay: +msPerPlay.toFixed(3), chosenMedianMsPerPlay: +msPerPlay.toFixed(3), chosenMeanMsPerPlay: +msPerPlay.toFixed(3), note: 'whole sequence time (staging, snaps and phase evaluation) divided by its plays; per-play times are not separated by the runner' },
    plays: withFrames.map((p) => ({ info: { n: p.n, kind: p.kind, result: p.sim.result, yards: p.sim.yards, frames: p.sim.frames.length, seconds: +(p.sim.frames.length * 0.1).toFixed(1), abilityEvents: (p.sim.events || []).filter(isAbilityEvent).length, peakConcurrent: peakConcurrent(p.sim), fields: p.sim.fields?.length || 0, executed: !!p.executed, simMs: +msPerPlay.toFixed(3) },
      sim: plain(p.sim), off: unitMap(p.sprites?.off), def: unitMap(p.sprites?.def) })),
  };
}

/** Beast Clash battles through the franchise battle runner (fixed order, franchise config), 3v3 (Tuesday / pregame) and 5v5 (playoff overtime). */
export const CLASH_SCENES = [
  { id: 'C1-clash-3v3', a: ['emberfox', 'tidepaw', 'stormlynx'], b: ['pebble', 'ironjaw', 'glimmer'], seed: 11, what: 'a 3v3 Beast Clash (the Tuesday encounter / pregame size), franchise battle runner' },
  { id: 'C2-clash-5v5', a: ['emberfox', 'tidepaw', 'stormlynx', 'voltfin', 'thornkit'], b: ['pebble', 'ironjaw', 'glimmer', 'icehorn', 'shadowkit'], seed: 12, what: 'a 5v5 Beast Clash (the playoff overtime size), franchise battle runner' },
];
export async function clashScene(def, { simPasses = 3 } = {}) {
  const CL = await imp('src/franchise/clash-link.js'); const B = await imp('src/clash/batch.js'); const C = await imp('src/clash/index.js');
  const known = new Set(C.speciesList().map((s) => s.id ?? s));
  const pick = (ids, side) => ids.filter((id) => known.has(id)).map((id, i) => B.syntheticMonster(id, { seed: def.seed * 97 + (side === 'a' ? 0 : 50) + i, overall: 65 }));
  const a = pick(def.a, 'a'), b = pick(def.b, 'b');
  const run = () => { const t0 = process.hrtime.bigint(); const res = CL.runBattle({ a: clone(a), b: clone(b), seed: def.seed }); return { res, ms: Number(process.hrtime.bigint() - t0) / 1e6 }; };
  run(); const runs = []; for (let i = 0; i < simPasses; i++) runs.push(run());
  const res = runs[0].res; const h = C.logHash(res);
  if (runs.some((x) => C.logHash(x.res) !== h)) throw new Error(`${def.id}: battle not deterministic`);
  const ms = median(runs.map((x) => x.ms));
  return { id: def.id, kind: 'clash', def: { a: def.a, b: def.b, seed: def.seed }, inputs: plain({ a, b }), what: `${def.what}: ${a.length}v${b.length}, ${res.log.length} log entries, winner ${res.winner}`, fingerprint: String(h),
    sim: { passes: simPasses, battles: 1, logEntries: res.log.length, msPerBattle: +ms.toFixed(3), medianMsPerPlay: null }, battle: plain(res) };
}

/** Every scene, in report order. `only` filters by id prefix (e.g. ['F1', 'C1']). */
export async function precomputeAll({ plays = 8, simPasses = 3, only = null } = {}) {
  const want = (id) => !only || only.some((p) => id.startsWith(p));
  const out = [];
  for (const def of FOOTBALL_SCENES) if (want(def.id)) out.push(footballScene(def, { plays, simPasses }));
  if (want('F5-sovereign-sequence')) out.push(await sovereignScene({ simPasses }));
  for (const def of CLASH_SCENES) if (want(def.id)) out.push(await clashScene(def, { simPasses }));
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const t0 = Date.now(); const scenes = await precomputeAll({ plays: 8, simPasses: 1 });
  for (const s of scenes) console.log(s.id, JSON.stringify(s.sim), s.plays ? s.plays.map((p) => `${p.info.frames}f/${p.info.abilityEvents}a/${p.info.peakConcurrent}c/${p.info.fields}fl`).join(' ') : s.what);
  console.log('precompute', Date.now() - t0, 'ms');
}
