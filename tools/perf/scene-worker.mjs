#!/usr/bin/env node
// Perf scene worker (docs/task8/PERF_SCENES.md). One process per build root; it imports that build's engine and rules and runs the
// scenes of tools/perf/scenes.json (always the manifest next to this file, so both builds read the same definition). Forked by
// run-scenes.mjs (IPC) or run directly: node tools/perf/scene-worker.mjs --root=DIR --scene=ID [--variant=plain|inert|ability] [--dump]
//
// Variants: plain (an ordinary scene), inert (an ability scene with its overlays' types but no species, no primes, no staged fields:
// an ordinary scene both builds can run), ability (the full ability scene; Task 8 builds only), only:KEY (a sub-measurement, Task 8 only:
// the inert twin plus one overlay's species and primed state, e.g. only:home.offense.WR1, or only:fields for the staged fields alone;
// subVariants(scene) lists them).
// Each run returns { ms (wall), cpu (process CPU time), plays, ticks, fp, inputs, playsHash, abilityEvents, fields }: ms is the timed section only (scene inputs,
// teams and game states are built before the timer starts; fingerprints are computed after it stops).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const MANIFEST = JSON.parse(fs.readFileSync(path.join(HERE, 'scenes.json'), 'utf8'));
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`) || x === `--${k}`); return a ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) : d; };
const ROOT = path.resolve(arg('root', path.join(HERE, '..', '..')));
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const E = await imp('src/sim/engine.js');
const R = await imp('src/sim/rules.js');
const PB = await imp('src/data/playbook.js');
const RNG = await imp('src/core/rng.js');
const IS_T8 = fs.existsSync(path.join(ROOT, 'src/sim/abilities/registry.js'));
const FIELDS = IS_T8 ? await imp('src/sim/t8/fields.js') : null;

/** CPU time (user + system) of this process since `c0`, in ms: robust to other processes taking the CPU, unlike wall time. */
const cpuMs = (c0) => { const d = process.cpuUsage(c0); return (d.user + d.system) / 1000; };
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const clone = (x) => JSON.parse(JSON.stringify(x));
const sceneById = (id) => { const s = MANIFEST.scenes.find((x) => x.id === id); if (!s) throw new Error(`unknown scene ${id}`); return s; };
const callsOf = (sc) => (typeof sc.calls === 'string' ? MANIFEST.callSets[sc.calls] : sc.calls);
const range = ([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
/** The engine-relevant part of a compiled play (its prose and release flags differ between builds and are never read by the engine). */
const playKey = (p) => { const { desc, name, reserve, ...rest } = p; return JSON.stringify(rest); };

/** A roster player as both engines take it (manifest fields only). */
const player = (p) => ({ id: p.id, name: p.name, position: p.position, type: p.type ?? null, attrs: { ...p.attrs }, permDurability: p.permDurability });
/** Is overlay `key` (or 'fields', the staged fields) active in this variant? ability: all; only:KEY: that one; inert/plain: none. */
const active = (variant, key) => variant === 'ability' || variant === `only:${key}`;
/** Sub-measurement variants of an ability scene: each overlay alone, and the staged fields alone. */
export const subVariants = (sc) => [...Object.keys(sc.abilities || {}), ...(sc.fields?.length ? ['fields'] : [])].map((k) => `only:${k}`);
/** Apply a scene's ability overlays to a team ('home'/'away'). variant inert: the overlay's type only; ability (or only:KEY for that
 *  overlay): type + species + form + mastery. */
function overlay(team, side, sc, variant) {
  for (const [key, ov] of Object.entries(sc.abilities || {})) {
    const [club, unit, slot] = key.split('.'); if (club !== side) continue;
    const base = unit === 'kicker' ? team.kicker : team[unit][slot];
    const m = { ...base, type: ov.type ?? base.type };
    if (active(variant, key)) Object.assign(m, { species: ov.species, form: ov.form || `${ov.species}:0`, mastery: ov.mastery ?? 0 });
    if (unit === 'kicker') team.kicker = m; else team[unit][slot] = m;
  }
}
function team(key, side, sc, variant) {
  const r = MANIFEST.rosters[key]; if (!r) throw new Error(`unknown roster ${key}`);
  const t = { id: `${side}_${key}`, name: `Perf ${side}`, abbr: side === 'home' ? 'PFH' : 'PFA', color: '#888', bench: [], offensePlays: [], defensePlays: [],
    offense: Object.fromEntries(Object.entries(r.offense).map(([s, p]) => [s, player(p)])), defense: Object.fromEntries(Object.entries(r.defense).map(([s, p]) => [s, player(p)])), kicker: player(r.kicker) };
  if (variant !== 'plain') overlay(t, side, sc, variant);
  t.returner = t.offense.RB;
  return t;
}

// ------------------------------------------------------------------------------------------------ engine tier
function engineInputs(sc) {
  const calls = callsOf(sc); const off = MANIFEST.rosters[sc.offense], def = MANIFEST.rosters[sc.defense];
  const out = [];
  for (const seed of range(sc.seeds)) for (const [o, d, target] of calls) {
    const offensePlay = PB.getPlay(o), defensePlay = PB.getPlay(d);
    const offense = Object.fromEntries(offensePlay.onField.map((s) => [s, player(off.offense[s])]));
    const defense = Object.fromEntries(defensePlay.onField.map((s) => [s, player(def.defense[s])]));
    // One options object for both builds: the baseline reads memory, envType and forcedTarget; the Task 8 fields (t8, offenseSide, toGo,
    // sitsOut, exhausted, createdFields) are what rules.js passes at a fresh game's snap, and the baseline ignores them.
    const options = { memory: { drive: 'perf@0', half: 1, quarter: 1, used: {} }, envType: sc.envType ?? null, ...(target ? { forcedTarget: target } : {}),
      t8: { status: {} }, offenseSide: 'home', toGo: 10, sitsOut: new Set(), exhausted: new Set(), createdFields: [] };
    out.push({ offensePlay, defensePlay, offense, defense, ballOn: sc.ballOn ?? 35, ballLat: 0, seed: seed * 1000 + out.length % calls.length, options });
  }
  return out;
}
function runEngine(sc) {
  const inputs = engineInputs(sc);
  const inputsHash = sha(JSON.stringify(inputs.map((x) => ({ o: x.offensePlay.id, d: x.defensePlay.id, off: x.offense, def: x.defense, b: x.ballOn, s: x.seed, m: x.options.memory, e: x.options.envType, f: x.options.forcedTarget ?? null }))));
  const sims = new Array(inputs.length);
  const t0 = process.hrtime.bigint(), c0 = process.cpuUsage();
  for (let i = 0; i < inputs.length; i++) sims[i] = E.simulatePlay(inputs[i]);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6, cpu = cpuMs(c0);
  return { ms, cpu, sims, inputsHash, plays: inputs.length, playIds: [...new Set(inputs.flatMap((x) => [x.offensePlay.id, x.defensePlay.id]))] };
}

// ------------------------------------------------------------------------------------------------ rules tier
const addField = (state, f) => { const b = (state.t8.fields ||= { list: [], pending: [], seq: 0 }); const r = FIELDS.placeRect({ id: `PF${++b.seq}`, createdAt: 0, owner: f.owner ?? null, ...f });
  b.list.push({ ...r, lat: [...r.lat], yard: [...r.yard], ability: f.ability ?? 'perf', payload: f.payload ?? null, ownerTeam: f.ownerTeam ?? null, remaining: f.lifetime ?? 999, clock: f.clock ?? 'scrimmageAny', clearsAtHalftime: false, createdThisPlay: false }); };
function rulesGames(sc, variant) {
  const games = [];
  for (const gs of range(sc.sequences)) {
    const teams = { home: team(sc.home, 'home', sc, variant), away: team(sc.away, 'away', sc, variant) };
    const state = R.newGame({ home: teams.home, away: teams.away, seed: gs, quarterLength: 900, coinWinner: 'home', choice: 'receive', venue: { club: 'perf', name: 'Perf Field', env: 'neutral', type: sc.envType ?? null, indoor: true, weather: null } });
    const primes = [];
    if (variant === 'ability' || variant.startsWith('only:')) {
      state.t8 = { status: {}, ability: {} };
      for (const [key, ov] of Object.entries(sc.abilities || {})) {
        if (!ov.prime || !active(variant, key)) continue; const [club, unit, slot] = key.split('.'); const m = unit === 'kicker' ? teams[club].kicker : teams[club][unit][slot];
        state.t8.ability[m.id] = clone(ov.prime); if (ov.everySnap) primes.push([m.id, ov.prime]);
      }
      if (active(variant, 'fields')) for (const f of sc.fields || []) addField(state, f);
    }
    games.push({ gs, teams, state, primes });
  }
  return games;
}
function runRules(sc, variant) {
  const games = rulesGames(sc, variant); const calls = callsOf(sc); const want = sc.unit === 'defense' ? 'away' : 'home'; const ballOn = sc.ballOn ?? 35;
  const sims = []; let plays = 0;
  const t0 = process.hrtime.bigint(), c0 = process.cpuUsage();
  for (const g of games) {
    const { state, teams } = g;
    for (let k = 0; k < sc.snaps; k++) {
      // Staging (identical on both builds): the same situation every snap; possession kept by the scene's unit; the rules stream
      // re-seeded so every snap's play seed (rules.js runScrimmagePlay: the first draw) is the same on both builds.
      if (state.phase !== 'scrimmage' || state.possession !== want || sc.newDriveEachSnap) state.drive = { team: want, plays: 0, yards: 0, start: ballOn };
      Object.assign(state, { phase: 'scrimmage', possession: want, ballOn, ballLat: 0, down: 1, toGo: 10, clock: 900, quarter: 1, finished: false });
      state.rngState = RNG.createRng(g.gs * 1000 + k).state;
      for (const [mid, p] of g.primes) state.t8.ability[mid] = { ...(state.t8.ability[mid] || {}), ...clone(p) };
      const [o, d, target] = calls[k % calls.length];
      const { sim } = R.runScrimmagePlay(state, teams, o, d, target ? { forcedTarget: target } : {});
      sims.push(sim); plays += 1;
    }
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6, cpu = cpuMs(c0);
  const inputsHash = sha(JSON.stringify(games.map((g) => ({ gs: g.gs, teams: g.teams }))));
  const fields = games.reduce((n, g) => n + (g.state.t8?.fields?.seq || 0), 0);
  return { ms, cpu, sims, inputsHash, plays, playIds: [...new Set(calls.flat().filter((x) => PB.PLAYS[x]))], games, fields };
}

const ABILITY_KINDS = new Set(['ability', 'status', 'ability_ready', 'field', 'spawn', 'dragon_swallow']);
export function runScene(id, variant = 'plain', { dump = false } = {}) {
  const sc = sceneById(id);
  if ((variant === 'ability' || variant.startsWith('only:')) && !IS_T8) throw new Error(`${variant} variant needs a Task 8 build`);
  if (variant.startsWith('only:') && !subVariants(sc).includes(variant)) throw new Error(`${id}: no sub-measurement ${variant}`);
  if (sc.kind === 'ordinary' && variant !== 'plain') throw new Error(`${id}: an ordinary scene has only the plain variant`);
  if (sc.kind === 'ability' && variant === 'plain') variant = 'inert';
  const r = sc.tier === 'engine' ? runEngine(sc) : runRules(sc, variant);
  const TICK = E.TICK || 0.05;
  let ticks = 0, abilityEvents = 0, engagedFrames = 0, frames = 0; const light = [];
  for (const s of r.sims) { ticks += Math.round((s.elapsed || 0) / TICK); for (const f of s.frames || []) { frames += 1; for (const p of f.off || []) engagedFrames += p[3] ? 1 : 0; for (const p of f.def || []) engagedFrames += p[3] ? 1 : 0; } for (const e of s.events || []) if (e.ability || ABILITY_KINDS.has(e.kind)) abilityEvents += 1; light.push(`${s.result}|${s.yards}|${s.elapsed}|${s.frames?.length}|${s.events?.length}`); }
  const out = { scene: id, variant, ms: r.ms, cpu: r.cpu, plays: r.plays, ticks, engagedPerFrame: frames ? engagedFrames / frames : 0, abilityEvents, fields: r.fields || 0, inputsHash: r.inputsHash, playsHash: sha(r.playIds.sort().map((p) => playKey(PB.getPlay(p))).join('\n')), fp: sha(light.join('\n')) };
  if (dump) { // identity proof: every play's full output, and for the rules tier the game states afterwards
    const full = JSON.stringify(r.sims, (k, v) => (v instanceof Set ? [...v] : v instanceof Map ? [...v] : v));
    out.full = sha(full); if (r.games) out.state = sha(JSON.stringify(r.games.map((g) => g.state), (k, v) => (v instanceof Set ? [...v] : v instanceof Map ? [...v] : v)));
  }
  return out;
}

/** What an ability scene actually exercises: Task 8 event kinds and ability ids seen, contract executions per subject, fields created. */
export function runSceneDetail(id) {
  const sc = sceneById(id); const r = runRules(sc, 'ability'); const ev = {}; const exec = {};
  for (const s of r.sims) for (const e of s.events || []) if (e.ability || ABILITY_KINDS.has(e.kind)) { const k = `${e.kind}${typeof e.ability === 'string' ? ':' + e.ability : ''}${e.status ? ':' + e.status : ''}`; ev[k] = (ev[k] || 0) + 1; }
  for (const g of r.games) for (const [mid, v] of Object.entries(g.state.t8?.mastery || {})) exec[mid.replace(/^(home|away)_/, '')] = (exec[mid] || 0) + (v.executions || 0);
  const species = Object.fromEntries(Object.entries(sc.abilities || {}).map(([k, v]) => [k, v.species]));
  return { plays: r.plays, fields: r.fields, executions: exec, species, events: ev };
}

if (process.send) {
  process.on('message', (m) => {
    try { if (m.cmd === 'run') process.send({ id: m.id, ok: true, res: runScene(m.scene, m.variant, m) }); else if (m.cmd === 'exit') process.exit(0); }
    catch (e) { process.send({ id: m.id, ok: false, error: String(e?.stack || e) }); }
  });
  process.send({ ready: true, root: ROOT, t8: IS_T8 });
} else if (arg('scene')) {
  const ids = arg('scene') === 'all' ? MANIFEST.scenes.map((s) => s.id) : String(arg('scene')).split(',');
  for (const id of ids) { const sc = sceneById(id); const vs = arg('variant') ? [arg('variant')] : sc.kind === 'ordinary' ? ['plain'] : IS_T8 ? ['inert', 'ability'] : ['inert'];
    for (const v of vs) { const res = runScene(id, v, { dump: !!arg('dump') }); console.log(JSON.stringify(res)); } }
}
