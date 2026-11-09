// Render-performance harness, in-page driver (docs/task8/RENDER_PERF.md). Loaded into the real game page (index.html) by run.mjs.
// It never simulates: every play and battle arrives precomputed (precompute.mjs). Football plays are handed to the match screen's
// own playback (src/ui/screens/match.js startAnim, through the inert harness hook globalThis.__gbRenderPerf), so the field is drawn
// by exactly the code a player's game uses; Clash battles are played by the arena the franchise battle screen mounts
// (src/ui/clash/arena.js createArena, with the clash-battle screen's options). The driver records requestAnimationFrame timestamps.
import * as F from '../../../src/franchise/franchise.js';
import * as Router from '../../../src/ui/router.js';
import { setAssist } from '../../../src/franchise/assist.js';
import { resolveSpecies } from '../../../src/data/monsters.js';
import { createArena } from '../../../src/ui/clash/arena.js';
import { typeEdge } from '../../../src/clash/types.js';
import { fieldSvg, cameraFor } from '../../../src/ui/field-view.js';
import { buildFx } from '../../../src/ui/ability-fx.js';
import { rulesSnaps, lightLine, unitMap } from './staging.js';

const RP = globalThis.__gbRenderPerf;
const app = () => globalThis.__gb;
const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------------------------------------ frame recorder
const rec = { on: false, t: [], draws: [], lastChild: null, longtasks: [] };
function loop(t) {
  if (!rec.on) return;
  rec.t.push(t);
  const c = document.querySelector('#field')?.firstChild || null; // a new first child = the field was redrawn (innerHTML) since the last frame
  if (c && c !== rec.lastChild) { rec.draws.push(t); rec.lastChild = c; }
  requestAnimationFrame(loop);
}
try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (rec.on) rec.longtasks.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: false }); } catch { /* no longtask API */ }
// performance marks rp:on / rp:off bracket every recorded window, so the trace is aggregated over exactly the recorded frames
// (trace.mjs), not over the gaps between plays (where combined mode simulates the snaps that are not played).
function startRec() { rec.on = true; rec.t = []; rec.draws = []; rec.longtasks = []; rec.lastChild = null; performance.mark('rp:on'); requestAnimationFrame(loop); }
function stopRec() { rec.on = false; performance.mark('rp:off'); return { t: rec.t, draws: rec.draws, longtasks: rec.longtasks }; }

// ------------------------------------------------------------------------------------------------ setup
/** A real franchise at its Sunday game, on the match screen (the final-whistle check's setup). Settings: no tips, no replays, no live clock. */
export async function setupFootball({ seed = 3, stopWeek = 3 } = {}) {
  const S = await import('../../franchise-soak.mjs');
  const { f } = S.runFranchise(seed, { difficulty: 'rookie', seasons: 1, stopWeek });
  Object.assign(f.settings, { devNotices: false, tutorial: false, reducedMotion: false, mode: 'key', speed: 1, replays: false, liveClock: false, screenShake: true, fieldMarkers: 'sprites' });
  f.scenes = []; f.achievementsBackfilled = true; setAssist(f, { mode: 'expert' }); // Expert: no first-ability tip sheets between plays
  F.autoRunToSunday(f); let guard = 0; while (F.isBye(f) && guard++ < 3) { F.takeBye(f); F.autoRunToSunday(f); }
  app().f = f;
  const M = await import('../../../src/ui/screens/match.js'); M.startSundayGame(f);
  for (let i = 0; i < 100 && !document.querySelector('#field'); i++) await sleep(50);
  if (!RP?.playMatch) throw new Error('the match screen did not install the render-perf hook (globalThis.__gbRenderPerf was not set before the app loaded)');
  return { club: f.club, week: f.season.week, field: !!document.querySelector('#field'), venue: f.game?.state?.venue?.name || null };
}

/** Probe configurations: the player-visible settings and the measurement-only probe (see RENDER_PERF.md). */
export function applyConfig(cfg) {
  const f = app().f; if (!f) return;
  f.settings.reducedMotion = !!cfg.reducedMotion; f.settings.fieldMarkers = cfg.markers || 'sprites';
  document.documentElement.dataset.reducedMotion = f.settings.reducedMotion ? '1' : '0';
  if (Router.currentScreen()?.name === 'match') Router.render();
}

// ------------------------------------------------------------------------------------------------ football
export const lookupFor = (p) => (team, slot) => { const m = (team === 'off' ? p.off : p.def)?.[slot]; if (!m) return null; const sp = resolveSpecies(m); return { element: sp?.element || m.type || null, name: m.name, species: sp?.id || null }; };
const evFor = (p) => ({ kind: 'play', sim: p.sim, offenseSide: 'home', toGo: 10, text: `Perf play: ${p.sim.result} ${p.sim.yards}` });

/**
 * Play `plays` through the match screen in real time. The first `warmup` plays are played but not returned. Between plays the
 * screen idles `gapMs` (not measured). Returns per-play frame timestamps and draw times (relative to each play's start).
 */
export async function playFootball(plays, { warmup = 1, gapMs = 400 } = {}) {
  if (Router.currentScreen()?.name !== 'match') throw new Error('not on the match screen');
  const order = [...plays.slice(0, warmup).map((p) => ({ p, w: true })), ...plays.map((p) => ({ p, w: false }))];
  const out = []; let marked = false;
  for (const { p, w } of order) {
    if (!w && !marked) { performance.mark('rp:begin'); marked = true; } // the trace window starts after the warm-up plays
    await nextFrame(); startRec(); await nextFrame(); // a baseline frame before the play starts
    const t0 = performance.now();
    if (!RP.playMatch(evFor(p), { lookup: lookupFor(p) })) { stopRec(); continue; }
    const startMs = performance.now() - t0; // the synchronous play start: startAnim (teams, effect list, screen render)
    while (RP.matchBusy()) await nextFrame();
    const t1 = performance.now(); await nextFrame(); const r = stopRec();
    if (!w) out.push({ t0, t1, startMs, frames: r.t, draws: r.draws, longtasks: r.longtasks, simFrames: p.sim.frames.length });
    await sleep(gapMs);
  }
  performance.mark('rp:end');
  return out;
}

// ------------------------------------------------------------------------------------------------ Clash
/** Play a battle with the arena the franchise battle screen mounts (clash-battle.js mountBattle options: simple, speed, names, edge). */
export async function playClash(battle, { reducedMotion = false, quality = 'full', speed = 2, warmup = 0 } = {}) {
  const main = document.querySelector('main.screen') || document.querySelector('#app');
  const out = [];
  for (let i = 0; i < warmup + 1; i++) {
    if (i === warmup) performance.mark('rp:begin'); // the trace window starts after the warm-up battle
    main.innerHTML = '<div class="row between" style="margin-bottom:4px"><span class="muted">perf · Beast Clash</span></div><div id="fb-arena"></div>';
    const host = main.querySelector('#fb-arena');
    let done = false; const arena = createArena(host, battle, { speed, reducedMotion, quality, names: { a: 'Home', b: 'Away' }, edge: typeEdge, simple: true, onEnd: () => { done = true; } });
    await sleep(300); await nextFrame(); startRec(); await nextFrame();
    const t0 = performance.now(); arena.play();
    while (!done) await nextFrame();
    const t1 = performance.now(); await nextFrame(); const r = stopRec();
    if (i >= warmup) out.push({ t0, t1, frames: r.t, draws: [], longtasks: r.longtasks, entries: battle.log.length, fxCount: arena.fxCount });
    arena.destroy(); await sleep(300);
  }
  performance.mark('rp:end');
  Router.render();
  return out;
}

// ------------------------------------------------------------------------------------------------ profile (not timed as frames)
/** Sprites as the match screen's spritesFor builds them (the franchise's own monsters on the field). */
function spritesLikeMatch(f, markers) {
  if (markers === 'simple') return null;
  const m = F.sundayMatchup(f); const T = { home: m.home, away: m.away };
  const pack = (team) => { const map = { ...team.offense, ...team.defense }; const pool = Object.values(map).filter((x) => x?.id); return { map, pool: team.kicker?.id ? [team.kicker, ...pool] : pool }; };
  const kickMap = (team, p) => ({ ...p.map, ...(team.kicker?.id ? { K: team.kicker } : {}) });
  const off = pack(T.home), def = pack(T.away);
  return { off: { map: { ...kickMap(T.home, off), ...T.home.offense }, pool: off.pool }, def: { map: { ...kickMap(T.away, def), ...T.away.defense }, pool: def.pool } };
}
const quantiles = (a) => { const s = [...a].sort((x, y) => x - y); const q = (p) => s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; return { mean: s.length ? s.reduce((x, y) => x + y, 0) / s.length : null, p50: q(0.5), p95: q(0.95), max: s.length ? s[s.length - 1] : null }; };
/**
 * Where a field draw's time goes: for every engine frame of the plays, build the SVG string exactly as the live playback does
 * (fieldSvg with the same options), time the string, then time the DOM parse (innerHTML into the live #field) and a forced
 * style + layout (getBBox), and count the elements. Also the same frames without effects (fx: null) to size what the effects add.
 */
export async function profileDraws(plays, cfg) {
  const f = app().f; const svg = document.querySelector('#field'); if (!svg) throw new Error('no #field');
  const s = f.game.state; const sprites = spritesLikeMatch(f, cfg.markers); const fxq = cfg.reducedMotion ? 'min' : cfg.markers === 'simple' ? 'low' : 'full';
  const build = [], parse = [], layout = [], len = [], els = [], lenNoFx = [], buildNoFx = [];
  for (const p of plays) {
    const sim = p.sim; const fx = buildFx(sim, lookupFor(p)); const cam = cameraFor(sim.ballOn);
    for (let i = 0; i < sim.frames.length; i++) {
      const o = { venue: s.venue, ballOn: sim.ballOn, ballLat: sim.ballLat, toGo: 10, colors: { off: s.home.color, def: s.away.color }, frame: sim.frames[i], prevFrame: sim.frames[i - 1] || null, fields: sim.fields || null, fx, fxQuality: fxq, qbRead: false, ownLabel: s.home.abbr, oppLabel: s.away.abbr, camera: cam, noLines: false, event: null, sprites };
      let t = performance.now(); const html = fieldSvg(o); build.push(performance.now() - t); len.push(html.length);
      t = performance.now(); const h2 = fieldSvg({ ...o, fx: null }); buildNoFx.push(performance.now() - t); lenNoFx.push(h2.length);
      t = performance.now(); svg.innerHTML = html; parse.push(performance.now() - t);
      t = performance.now(); svg.getBBox(); layout.push(performance.now() - t);
      els.push(svg.getElementsByTagName('*').length);
    }
    await nextFrame();
  }
  Router.render();
  return { frames: build.length, buildMs: quantiles(build), buildNoFxMs: quantiles(buildNoFx), parseMs: quantiles(parse), styleLayoutMs: quantiles(layout), chars: quantiles(len), charsNoFx: quantiles(lenNoFx), elements: quantiles(els) };
}

// ------------------------------------------------------------------------------------------------ combined: simulate while playing
// Combined mode (RENDER_PERF.md): nothing is precomputed. Each snap is simulated in this page, on the main thread, at the moment it
// is played, and its play is handed straight to the match screen's playback, as a real match does (match.js act(): step, then
// startAnim). The recorded window of a play starts before its simulation, so the simulation's frame is in the statistics.
// Snaps a scene does not play (render mode plays a chosen subset) are still simulated, in order, between the recorded windows,
// because the game state carries from snap to snap. What was simulated is returned as light fingerprint lines, which run.mjs
// checks against the precomputed scene: combined mode plays exactly the plays render mode plays.
let manifest = null;
const getManifest = async () => (manifest ||= await (await fetch('/tools/perf/scenes.json')).json());
const lightOf = (r) => (r.sim ? lightLine(r.sim) : `nosim|${r.kind}`);

/** Shared loop: `makeSnaps()` = [{ key, run() -> { sim, ms, lookup } }] in game order; `chosen(key)` = is this snap played. */
async function combinedLoop(makeSnaps, chosen, { warmup = 1, gapMs = 400 } = {}) {
  // Warm-up pass: simulate every snap (the simulation's JIT warm-up, as precompute does), playing the first `warmup` chosen plays.
  let played = 0;
  for (const sn of await makeSnaps()) {
    const r = sn.run();
    if (chosen(sn.key) && played < warmup && r.sim?.frames?.length > 1) { played++; RP.playMatch(evFor({ sim: r.sim }), { lookup: r.lookup }); while (RP.matchBusy()) await nextFrame(); await sleep(gapMs); }
  }
  const out = []; const light = []; let marked = false;
  for (const sn of await makeSnaps()) {
    if (!chosen(sn.key)) { light.push(lightOf(sn.run())); continue; }
    if (!marked) { performance.mark('rp:begin'); marked = true; }
    await nextFrame(); startRec(); await nextFrame();
    const t0 = performance.now();
    const r = sn.run(); light.push(lightOf(r));
    if (!(r.sim?.frames?.length > 1) || !RP.playMatch(evFor({ sim: r.sim }), { lookup: r.lookup })) { stopRec(); continue; }
    const startMs = performance.now() - t0; // simulation + the synchronous play start
    while (RP.matchBusy()) await nextFrame();
    const t1 = performance.now(); await nextFrame(); const rr = stopRec();
    out.push({ t0, t1, startMs, simMs: r.ms, frames: rr.t, draws: rr.draws, longtasks: rr.longtasks, simFrames: r.sim.frames.length });
    await sleep(gapMs);
  }
  performance.mark('rp:end');
  return { runs: out, light };
}

/** Combined, approved rules-tier scene: `source` scene, `variant`, `chosen` = [[gs, k]] (the plays render mode plays). */
export async function combinedFootball({ source, variant, chosen, warmup = 1 }) {
  if (Router.currentScreen()?.name !== 'match') throw new Error('not on the match screen');
  const M = await getManifest(); const want = new Set(chosen.map(([gs, k]) => `${gs}:${k}`));
  const make = async () => rulesSnaps(M, source, variant).map((sn) => ({ key: `${sn.gs}:${sn.k}`, run() { const r = sn.run(); return { sim: r.sim, ms: r.ms, lookup: lookupFor({ off: unitMap(r.teams.home.offense), def: unitMap(r.teams.away.defense) }) }; } }));
  return combinedLoop(make, (key) => want.has(key), { warmup });
}

/**
 * Combined, the football reviewer's staged Sovereign Arm sequence: its snaps replayed one by one through review.js stageScenario
 * (the steps review-sequence.js playSeed takes, for the demonstration seed the precompute found); every snap with frames is played.
 */
export async function combinedSovereign({ family, form, mastery, variant, seed, snaps, warmup = 1 }) {
  if (Router.currentScreen()?.name !== 'match') throw new Error('not on the match screen');
  if (variant !== 'main') throw new Error('combinedSovereign: only the main demonstration is staged');
  const [RV, SCN, DEX, REG] = await Promise.all([import('../../../src/sim/abilities/review.js'), import('../../../src/sim/abilities/review-scenarios.js'), import('../../../src/data/beast-dex.js'), import('../../../src/sim/abilities/registry.js')]);
  const fam = DEX.FAMILIES.find((x) => x.id === family); const contract = REG.contractOf(family); const sc = SCN.SCENARIOS[family];
  const follow = sc.after ? { ...sc, ...sc.after } : sc;
  const make = async () => {
    const G = RV.stageScenario({ sc, fam, contract, form, mastery, seed }); let act = -1; let n = 0;
    return Array.from({ length: snaps }, (_, k) => ({ key: k, run() {
      const isFollow = act >= 0; G.api.followUp = isFollow ? n - act - 1 : null;
      const t0 = performance.now(); const rec = G.snap(k, isFollow ? follow : sc); const ms = performance.now() - t0;
      if (act < 0 && rec.executed) act = n; n++;
      return { sim: rec.sim, kind: rec.kind, ms, lookup: lookupFor({ off: unitMap(rec.sprites?.off), def: unitMap(rec.sprites?.def) }) };
    } }));
  };
  return combinedLoop(make, () => true, { warmup });
}

/**
 * Combined Beast Clash: the battle is simulated in the page when the battle screen mounts, then the arena plays it (clash-battle.js
 * mountBattle: battle, createArena, play after 300 ms). The recorded window starts before the simulation.
 */
export async function combinedClash({ inputs, seed, reducedMotion = false, quality = 'full', speed = 2, warmup = 0 }) {
  const [CL, CE] = await Promise.all([import('../../../src/franchise/clash-link.js'), import('../../../src/clash/engine.js')]);
  const main = document.querySelector('main.screen') || document.querySelector('#app');
  const out = []; let hash = null;
  for (let i = 0; i < warmup + 1; i++) {
    const measured = i >= warmup; if (measured) performance.mark('rp:begin');
    main.innerHTML = '<div class="row between" style="margin-bottom:4px"><span class="muted">perf · Beast Clash</span></div><div id="fb-arena"></div>';
    const host = main.querySelector('#fb-arena');
    await nextFrame(); if (measured) { startRec(); await nextFrame(); }
    const t0 = performance.now();
    const res = CL.runBattle({ a: structuredClone(inputs.a), b: structuredClone(inputs.b), seed }); const simMs = performance.now() - t0; hash = String(CE.logHash(res));
    let done = false; const arena = createArena(host, res, { speed, reducedMotion, quality, names: { a: 'Home', b: 'Away' }, edge: typeEdge, simple: true, onEnd: () => { done = true; } });
    const startMs = performance.now() - t0;
    await sleep(300); arena.play();
    while (!done) await nextFrame();
    const t1 = performance.now();
    if (measured) { await nextFrame(); const r = stopRec(); out.push({ t0, t1, startMs, simMs, frames: r.t, draws: [], longtasks: r.longtasks, entries: res.log.length, fxCount: arena.fxCount }); }
    arena.destroy(); await sleep(300);
  }
  performance.mark('rp:end');
  Router.render();
  return { runs: out, light: [hash] };
}

// ------------------------------------------------------------------------------------------------ live: the real match, in Auto
// Live mode (RENDER_PERF.md): the real franchise Sunday game on the real match screen, driven by its own Auto button. Every snap
// goes through the screen's own act() -> game-runner step() (the simulation, in this page) -> afterStep -> startAnim; between plays
// run the screen's own Auto timer, save and re-render. Nothing is staged or precomputed. The inert hook's onStep reports each
// step's start and simulation time. The game is restored to the same kickoff state before every block, so every block plays the
// same game (same seed, same calls), which run.mjs checks through the per-step fingerprint.
let liveSnapshot = null;
export function liveSnapshotTake() { liveSnapshot = structuredClone(app().f.game); return { phase: liveSnapshot.state.phase, quarter: liveSnapshot.state.quarter, clock: liveSnapshot.state.clock }; }
export async function liveFranchise({ steps = 14, warmup = 2, cfg = null } = {}) {
  if (!liveSnapshot) throw new Error('liveSnapshotTake first');
  const f = app().f; f.game = structuredClone(liveSnapshot); f.game.auto = false; f.game.autoSpeed = 1;
  if (cfg) applyConfig(cfg);
  if (Router.currentScreen()?.name !== 'match') throw new Error('not on the match screen');
  Router.render(); await sleep(400);
  const log = []; const ends = [];
  RP.onStep = (t, ms, ev) => {
    const sim = ev?.sim; log.push({ t, ms, kind: ev?.kind || null, frames: sim?.frames?.length || 0, abilityEvents: (sim?.events || []).filter((e) => e.kind === 'ability' || e.ability).length, fields: sim?.fields?.length || 0, light: sim ? lightLine(sim) : `${ev?.kind}|${ev?.text || ''}` });
    if (log.length === warmup + 1) performance.mark('rp:begin');
  };
  const all = []; const lt = []; let on = true;
  const rafLoop = (t) => { if (!on) return; all.push(t); requestAnimationFrame(rafLoop); };
  let obs = null; try { obs = new PerformanceObserver((l) => { for (const e of l.getEntries()) lt.push([e.startTime, e.duration]); }); obs.observe({ type: 'longtask', buffered: false }); } catch { /* none */ }
  requestAnimationFrame(rafLoop); performance.mark('rp:on');
  const tStart = performance.now(); let wasBusy = false;
  while (log.length < warmup + steps + 1 && performance.now() - tStart < 600000) {
    const close = document.querySelector('.sheet [data-action="sheet-close"]'); if (close) close.click(); // halftime / two-minute sheets, as a player closes them
    // Start as a player does: the Auto button is offered at the snap, not on the opening kickoff, so the kickoff is taken by hand first.
    if (!f.game.auto && !RP.matchBusy()) { const b = document.querySelector('#controls [data-action="auto"]') || document.querySelector('#controls [data-action="kickoff"]') || document.querySelector('#controls [data-action="continue"]'); b?.click(); }
    const busy = RP.matchBusy(); if (wasBusy && !busy) ends.push(performance.now()); wasBusy = busy;
    if (f.game.state.finished) break;
    await nextFrame();
  }
  performance.mark('rp:end'); performance.mark('rp:off');
  if (f.game.auto) document.querySelector('[data-action="auto"]')?.click(); // stop Auto as a player would
  while (RP.matchBusy()) await nextFrame();
  on = false; obs?.disconnect(); RP.onStep = null;
  const measured = log.slice(warmup, warmup + steps); const tEnd = log[warmup + steps]?.t ?? performance.now();
  const slice = (a, b) => { const i0 = Math.max(0, all.findIndex((x) => x > a) - 1); const fr = []; for (let i = i0; i < all.length && all[i] <= b + 17; i++) fr.push(all[i]); return fr; };
  const lts = (a, b) => lt.filter(([s0]) => s0 >= a && s0 <= b);
  // Session: the continuous window from the first measured step to the step after the last (plays, gaps, saves, re-renders).
  const session = measured.length ? [{ t0: measured[0].t, t1: tEnd, startMs: null, frames: slice(measured[0].t, tEnd), draws: [], longtasks: lts(measured[0].t, tEnd) }] : [];
  // In play: from each animated step's start (its simulation) to the end of its playback.
  const inPlay = [];
  for (const st of measured) { if (st.frames < 2) continue; const e = ends.find((x) => x > st.t); if (!e) continue; inPlay.push({ t0: st.t, t1: e, startMs: null, simMs: st.ms, frames: slice(st.t, e), draws: [], longtasks: lts(st.t, e) }); }
  const score = f.game.state.score;
  return { session, inPlay, steps: measured.map(({ light, ...x }) => x), light: measured.map((x) => x.light), situation: { quarter: f.game.state.quarter, clock: f.game.state.clock, score: `${score.away}-${score.home}` } };
}
