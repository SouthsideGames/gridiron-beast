// Render-performance harness: the rules-tier scene staging, shared by Node (precompute.mjs) and the browser page (driver.js,
// combined mode). It reproduces tools/perf/scene-worker.mjs `runRules` (same teams, overlays, primes, staged fields, per-snap
// situation and re-seed) without any Node API, so the same snaps can be simulated either before the timed run (render-only mode)
// or inside the page at the moment they are played (combined mode). Both callers check the light fingerprint of what they
// simulated against scene-worker's own pass of the approved scene (docs/task8/PERF_SCENES.md), so a drift is caught.
import * as R from '../../../src/sim/rules.js';
import * as RNG from '../../../src/core/rng.js';
import * as FIELDS from '../../../src/sim/t8/fields.js';

const clone = (x) => JSON.parse(JSON.stringify(x));
const range = ([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const sceneById = (manifest, id) => { const s = manifest.scenes.find((x) => x.id === id); if (!s) throw new Error(`unknown scene ${id}`); return s; };
export const callsOf = (manifest, sc) => (typeof sc.calls === 'string' ? manifest.callSets[sc.calls] : sc.calls);
const player = (p) => ({ id: p.id, name: p.name, position: p.position, type: p.type ?? null, attrs: { ...p.attrs }, permDurability: p.permDurability });
function overlay(team, side, sc, variant) {
  for (const [key, ov] of Object.entries(sc.abilities || {})) {
    const [club, unit, slot] = key.split('.'); if (club !== side) continue;
    const base = unit === 'kicker' ? team.kicker : team[unit][slot];
    const m = { ...base, type: ov.type ?? base.type };
    if (variant === 'ability') Object.assign(m, { species: ov.species, form: ov.form || `${ov.species}:0`, mastery: ov.mastery ?? 0 });
    if (unit === 'kicker') team.kicker = m; else team[unit][slot] = m;
  }
}
function team(manifest, key, side, sc, variant) {
  const r = manifest.rosters[key];
  const t = { id: `${side}_${key}`, name: `Perf ${side}`, abbr: side === 'home' ? 'PFH' : 'PFA', color: '#888', bench: [], offensePlays: [], defensePlays: [],
    offense: Object.fromEntries(Object.entries(r.offense).map(([s, p]) => [s, player(p)])), defense: Object.fromEntries(Object.entries(r.defense).map(([s, p]) => [s, player(p)])), kicker: player(r.kicker) };
  if (variant !== 'plain') overlay(t, side, sc, variant);
  t.returner = t.offense.RB;
  return t;
}
const addField = (state, f) => { const b = (state.t8.fields ||= { list: [], pending: [], seq: 0 }); const r = FIELDS.placeRect({ id: `PF${++b.seq}`, createdAt: 0, owner: f.owner ?? null, ...f });
  b.list.push({ ...r, lat: [...r.lat], yard: [...r.yard], ability: f.ability ?? 'perf', payload: f.payload ?? null, ownerTeam: f.ownerTeam ?? null, remaining: f.lifetime ?? 999, clock: f.clock ?? 'scrimmageAny', clearsAtHalftime: false, createdThisPlay: false }); };
function rulesGames(manifest, sc, variant) {
  const games = [];
  for (const gs of range(sc.sequences)) {
    const teams = { home: team(manifest, sc.home, 'home', sc, variant), away: team(manifest, sc.away, 'away', sc, variant) };
    const state = R.newGame({ home: teams.home, away: teams.away, seed: gs, quarterLength: 900, coinWinner: 'home', choice: 'receive', venue: { club: 'perf', name: 'Perf Field', env: 'neutral', type: sc.envType ?? null, indoor: true, weather: null } });
    const primes = [];
    if (variant === 'ability') {
      state.t8 = { status: {}, ability: {} };
      for (const [key, ov] of Object.entries(sc.abilities || {})) {
        if (!ov.prime) continue; const [club, unit, slot] = key.split('.'); const m = unit === 'kicker' ? teams[club].kicker : teams[club][unit][slot];
        state.t8.ability[m.id] = clone(ov.prime); if (ov.everySnap) primes.push([m.id, ov.prime]);
      }
      for (const f of sc.fields || []) addField(state, f);
    }
    games.push({ gs, teams, state, primes });
  }
  return games;
}

/**
 * Every snap of a rules-tier scene, in order, as a list of { gs, k, run } where `run()` simulates that snap (it must be called in
 * list order: the game state carries from snap to snap) and returns { sim, ms, teams, call }.
 */
export function rulesSnaps(manifest, sceneId, variant) {
  const sc = sceneById(manifest, sceneId); const games = rulesGames(manifest, sc, variant); const calls = callsOf(manifest, sc);
  const want = sc.unit === 'defense' ? 'away' : 'home'; const ballOn = sc.ballOn ?? 35;
  const out = [];
  for (const g of games) {
    const { state, teams } = g;
    for (let k = 0; k < sc.snaps; k++) out.push({ gs: g.gs, k, run() {
      if (state.phase !== 'scrimmage' || state.possession !== want || sc.newDriveEachSnap) state.drive = { team: want, plays: 0, yards: 0, start: ballOn };
      Object.assign(state, { phase: 'scrimmage', possession: want, ballOn, ballLat: 0, down: 1, toGo: 10, clock: 900, quarter: 1, finished: false });
      state.rngState = RNG.createRng(g.gs * 1000 + k).state;
      for (const [mid, p] of g.primes) state.t8.ability[mid] = { ...(state.t8.ability[mid] || {}), ...clone(p) };
      const [o, d, target] = calls[k % calls.length];
      const t0 = performance.now();
      const { sim } = R.runScrimmagePlay(state, teams, o, d, target ? { forcedTarget: target } : {});
      const ms = performance.now() - t0;
      return { sim, ms, teams, call: [o, d] };
    } });
  }
  return out;
}

/** The light fingerprint line scene-worker hashes for every sim (result, yards, elapsed, frame and event counts). */
export const lightLine = (s) => `${s.result}|${s.yards}|${s.elapsed}|${s.frames?.length}|${s.events?.length}`;

/** Lookup material for the effect layer: slot -> { name, type, species, form } for both units. */
export const unitMap = (u) => Object.fromEntries(Object.entries(u || {}).map(([s, m]) => [s, m ? { id: m.id, name: m.name, type: m.type ?? null, species: m.species ?? null, form: m.form ?? null } : null]));
