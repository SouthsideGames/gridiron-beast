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
function startRec() { rec.on = true; rec.t = []; rec.draws = []; rec.longtasks = []; rec.lastChild = null; requestAnimationFrame(loop); }
function stopRec() { rec.on = false; return { t: rec.t, draws: rec.draws, longtasks: rec.longtasks }; }

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
const lookupFor = (p) => (team, slot) => { const m = (team === 'off' ? p.off : p.def)?.[slot]; if (!m) return null; const sp = resolveSpecies(m); return { element: sp?.element || m.type || null, name: m.name, species: sp?.id || null }; };
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
