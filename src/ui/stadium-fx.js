// Stadium Polish (v1): one shared system that makes every stadium feel alive and react to football.
//
// Three levels of presentation, all described by data (LOOKS), never by per-stadium code paths:
//   1. ambient  – always-on, subtle environment movement (CSS animations on a few fixed elements)
//   2. minor    – a short reaction (a sack, a loose ball)
//   3. major    – a celebration (touchdown, interception, a made field goal, a recovered turnover)
//
// Where things are drawn. The field is seen from straight above and fills the width of the screen, so a stadium has two places:
//   * the SURROUND: the two bands above and below the field inside the field's box (free space on an upright phone). They
//     are the stands, and the crowd sits there (stadium-crowd.js). It is screen-fixed: it does not scroll with the camera.
//   * the FIELD EDGE: the stadium's own effect on the sideline markers and the goal posts (drawn with the turf, in stadium-art.js
//     and field-view.js), which do scroll with the field.
//
// Football stays separate from presentation: `stadiumReaction` only READS a finished play event and names a reaction; the engine,
// statistics, AI and abilities never see any of this. A reaction is a pair of data attributes on the field's box for a fixed
// time; the stylesheet does the rest (styles/stadium.css). No element is created per reaction, so nothing can accumulate, a new
// reaction replaces the one playing, and leaving the screen clears it. Reactions never delay a play: nothing waits for them.

import { ENVIRONMENTS } from '../data/stadiums.js';
import { crowdImages } from './stadium-crowd.js';

export const STADIUM_FX_LEVELS = Object.freeze(['full', 'reduced', 'off']);
/** The level in force: the player's Stadium Effects setting, lowered to Off by Reduce Motion (no environment movement at all). */
export function stadiumFxLevel(settings = null) {
  const v = settings?.stadiumEffects; const level = STADIUM_FX_LEVELS.includes(v) ? v : 'full';
  return settings?.reducedMotion ? 'off' : level;
}
let lifecycle = false;
/** Ambient movement stops while the app is in the background or the page is hidden (the stylesheet pauses it). */
function installLifecycle() {
  if (lifecycle || !globalThis.document?.addEventListener) return; lifecycle = true;
  const root = globalThis.document.documentElement; const set = (inactive) => { root.dataset.appInactive = inactive ? '1' : '0'; if (inactive) stopStadiumReaction(); };
  globalThis.document.addEventListener('visibilitychange', () => set(globalThis.document.hidden));
  globalThis.addEventListener?.('gb-app-state', (e) => set(e.detail?.isActive === false));
}
/** Mirror the level on the page root, where the stylesheet reads it (applies at once, no restart). */
export function applyStadiumFx(settings = null) {
  try { if (globalThis.document?.documentElement) { globalThis.document.documentElement.dataset.stadiumFx = stadiumFxLevel(settings); installLifecycle(); } } catch { /* no document */ }
}

// ---------------------------------------------------------------- football event -> reaction (pure)
/** How long each reaction lasts, in milliseconds (home, full strength). The approved targets: TD 2-3 s, INT 1-1.5 s, fumble 0.8-1.2 s (+ recovery), sack 0.4-0.7 s, FG 1-1.5 s. */
export const REACTION_MS = Object.freeze({ td: 2600, int: 1300, fumble: 1000, 'fumble-lost': 1900, sack: 600, fg: 1300, intro: 2600 });
const MAJOR = new Set(['td', 'int', 'fumble-lost', 'fg']);
/**
 * The stadium's reaction to one finished play, or null. `ev` is the event the match screen already has (ev.sim.result,
 * ev.sim.stats, ev.kind, ev.scored, ev.kicking, ev.offenseSide). `side` is 'home' when the HOME club benefits: the building
 * celebrates its own team fully and answers the visitors with a smaller, shorter reaction. Nothing here changes a result.
 */
export function stadiumReaction(ev) {
  if (!ev) return null;
  const r = ev.sim?.result || ev.outcome?.result || null; const off = ev.offenseSide; const def = off === 'home' ? 'away' : off === 'away' ? 'home' : null;
  let kind = null, team = null;
  if (r === 'touchdown' || (ev.kind === 'kickoff' && ev.scored)) { kind = 'td'; team = ev.scored?.team || off; }
  else if (r === 'interception' || r === 'touchback_return') { kind = 'int'; team = def; }
  else if (r === 'fumble') { kind = 'fumble-lost'; team = def; } // the ball came loose AND possession changed: impact, then the stronger pulse
  else if (ev.kind === 'field_goal') { if (!ev.scored) return null; kind = 'fg'; team = ev.kicking || off; } // a miss is never celebrated
  else if (r === 'sack') { kind = 'sack'; team = def; }
  else if (ev.sim?.stats?.fumbledBy) { kind = 'fumble'; team = def; } // loose ball the offense kept: the impact only
  if (!kind) return null;
  const side = team === 'home' ? 'home' : 'away';
  const ms = Math.round(REACTION_MS[kind] * (side === 'home' ? 1 : 0.7));
  return { kind, level: MAJOR.has(kind) ? 'major' : 'minor', side, ms };
}

// ---------------------------------------------------------------- reaction playback (DOM, one at a time)
let timer = null; let current = null; let playing = null; // playing: { kind, side, until } while a reaction runs
/** Clear whatever is playing (also on leaving the screen). */
export function stopStadiumReaction(wrap = current) {
  clearTimeout(timer); timer = null; playing = null;
  if (wrap?.dataset) { delete wrap.dataset.sfx; delete wrap.dataset.sfxSide; }
  current = null;
}
/** The screen was rebuilt while a reaction was playing: carry the reaction on to the new box for the time it has left. */
export function resumeStadiumReaction(wrap, now = Date.now()) {
  if (!wrap || !playing || wrap === current) return false;
  const left = playing.until - now; if (left < 120) return false;
  wrap.dataset.sfx = playing.kind; wrap.dataset.sfxSide = playing.side; current = wrap;
  clearTimeout(timer); timer = setTimeout(() => stopStadiumReaction(wrap), left);
  return true;
}
/**
 * Play a reaction on the field's box. A new one replaces the one playing; at Off nothing plays; at Reduced only the major
 * reactions play, in their simpler form (the stylesheet). Returns true when it started.
 */
export function playStadiumReaction(wrap, reaction, level = 'full') {
  if (!wrap || !reaction || level === 'off') return false;
  if (level === 'reduced' && reaction.level !== 'major' && reaction.kind !== 'intro') return false;
  stopStadiumReaction(current || wrap);
  void wrap.offsetWidth; // restart the keyframes even when the same reaction repeats
  wrap.dataset.sfx = reaction.kind; wrap.dataset.sfxSide = reaction.side; current = wrap;
  playing = { kind: reaction.kind, side: reaction.side, until: Date.now() + reaction.ms + 80 };
  timer = setTimeout(() => stopStadiumReaction(wrap), reaction.ms + 80);
  return true;
}
/** The kickoff introduction: the stadium's own flourish, once per game. */
export const introReaction = () => ({ kind: 'intro', level: 'major', side: 'home', ms: REACTION_MS.intro });

/** Fit the two surround bands to the free space above and below the drawn field (none in a wide layout: the bands hide). */
export function layoutSurround(wrap, svg, fieldAspect) {
  if (!wrap || !svg) return;
  const r = svg.getBoundingClientRect(), o = wrap.getBoundingClientRect(); const w = r.width, h = r.height; if (!w || !h) return;
  const band = Math.max(0, Math.floor((h - Math.min(h, w / fieldAspect)) / 2));
  wrap.style.setProperty('--sfx-band', `${band}px`); wrap.style.setProperty('--sfx-top', `${Math.max(0, Math.round(r.top - o.top - wrap.clientTop))}px`);
  wrap.classList.toggle('sfx-no-band', band < 26);
}

// ---------------------------------------------------------------- looks (data)
/**
 * Each stadium's look. `label`: the design name. `colors`: [primary, secondary, bright] (also given to the stylesheet as
 * --sfx-a/-b/-c). `intro`: the kickoff line. `edge`: what runs along the sidelines ('chain': current jumping from marker to
 * marker, cycling up the sideline). `posts`: what the goal posts do ('arc'). The stands above and below the field hold the
 * crowd in every look (stadium-crowd.js); the look only colours the rail in front of them. Environments without an entry keep
 * today's look and have no surround.
 */
export const LOOKS = Object.freeze({
  storm: { label: 'Electric', colors: ['#4cc9ff', '#a06bff', '#eaf6ff'], intro: 'The current is live', edge: 'chain', posts: 'arc' },
});
export const lookFor = (envId) => (Object.hasOwn(LOOKS, envId) ? LOOKS[envId] : null);

/** A few camera flashes in a stand (fixed spots, each on its own slow timer). */
const flashes = (n, off) => Array.from({ length: n }, (_, i) => `<i class="sfx-flash sfx-anim" style="left:${(7 + ((i * 37 + off) % 86))}%;top:${12 + ((i * 53 + off * 3) % 70)}%;animation-delay:-${((i * 1.7 + off) % 9).toFixed(1)}s"></i>`).join('');
/** One stand: the crowd picture, the two "arms up" layers for celebrations, flashes, and the stadium's rail on the field side. */
function standHtml(cls, stand, crowd, look) {
  const img = crowd ? crowdImages({ ...crowd, stand }) : null; const [a, b] = look.colors;
  const bg = (u) => (u ? ` style="background-image:url(${u})"` : '');
  const rail = `<svg class="sfx-rail" viewBox="0 0 120 3" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect width="120" height="3" fill="#0c1430"/><line class="sfx-channel sfx-anim" x1="0" y1="1.5" x2="120" y2="1.5" stroke="${a}" stroke-width="1.1" stroke-dasharray="5 4"/><line class="sfx-channel sfx-channel-b sfx-anim" x1="0" y1="1.5" x2="120" y2="1.5" stroke="${b}" stroke-width=".6" stroke-dasharray="2 7"/></svg>`;
  return `<div class="sfx-band ${cls} sfx-crowd"${bg(img?.base)}><i class="sfx-cheer sfx-cheer-home"${bg(img?.home)}></i><i class="sfx-cheer sfx-cheer-away"${bg(img?.away)}></i>${flashes(5, stand === 'far' ? 0 : 4)}${rail}</div>`;
}
/**
 * The surround for a venue: the two stands with their crowd, the edge light that reactions use, and the lap of energy for the
 * biggest moments. `crowd` comes from crowdFor (stadium-crowd.js). '' for a stadium without a look. The pictures are the same
 * at every level; the level only decides what moves (stylesheet).
 */
export function surroundHtml(venue, crowd = null) {
  const look = lookFor(venue?.env); if (!look) return '';
  const [a, b, c] = look.colors;
  return `<div class="stadium-surround sfx-${venue.env}" style="--sfx-a:${a};--sfx-b:${b};--sfx-c:${c}" aria-hidden="true">${standHtml('sfx-far', 'far', crowd, look)}${standHtml('sfx-near', 'near', crowd, look)}<i class="sfx-edge"></i><i class="sfx-lap"></i></div>`;
}
/** The kickoff name plate: the stadium, its kind and its line. */
export function introPlateHtml(venue, esc = (s) => s) {
  const look = lookFor(venue?.env); const env = ENVIRONMENTS[venue?.env]; if (!look || !env) return '';
  return `<div class="sfx-plate"><b>${esc(venue.name || env.name)}</b><span>${esc(look.intro)}</span></div>`;
}
