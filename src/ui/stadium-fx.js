// Stadium Polish (v1): one shared system that makes every stadium feel alive and react to football.
//
// Three levels of presentation, all described by data (LOOKS), never by per-stadium code paths:
//   1. ambient  – always-on, subtle environment movement (CSS animations on a few fixed elements)
//   2. minor    – a short reaction (a sack, a loose ball)
//   3. major    – a celebration (touchdown, interception, a made field goal, a recovered turnover)
//
// Where things are drawn. The field is seen from straight above and fills the width of the screen, so a stadium has two places:
//   * the STAND behind the far end zone, with the crowd (stadium-crowd.js). It belongs to the field: it stays where it is and
//     comes into view as play nears that end zone (the camera may look a few yards past the end line while a scene is set).
//   * the FIELD EDGE: the stadium's own effect on the sideline markers and the goal posts (drawn with the turf, in stadium-art.js
//     and field-view.js), which do scroll with the field.
//
// Football stays separate from presentation: `stadiumReaction` only READS a finished play event and names a reaction; the engine,
// statistics, AI and abilities never see any of this. A reaction is a pair of data attributes on the field's box for a fixed
// time; the stylesheet does the rest (styles/stadium.css). No element is created per reaction, so nothing can accumulate, a new
// reaction replaces the one playing, and leaving the screen clears it. Reactions never delay a play: nothing waits for them.

import { ENVIRONMENTS } from '../data/stadiums.js';
import { designField } from '../data/stadium-designs.js';
/** The field a venue names: one a club plays on, or a design no club has yet. */
const fieldOf = (envId) => ENVIRONMENTS[envId] || designField(envId) || null;
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

/** Tell the stylesheet the field's scale (pixels per yard), so screen-space pieces such as the kickoff football match it. */
export function layoutSurround(wrap, svg, fieldAspect, fieldWidthYards = 54) {
  if (!wrap || !svg) return;
  const r = svg.getBoundingClientRect(); if (!r.width || !r.height) return;
  const drawn = Math.min(r.width, r.height * fieldAspect);
  wrap.style.setProperty('--sfx-yd', `${(drawn / fieldWidthYards).toFixed(3)}px`);
}

// ---------------------------------------------------------------- looks (data)
/**
 * Each stadium's look. `label`: the design name. `colors`: [primary, secondary, bright] (also given to the stylesheet as
 * --sfx-a/-b/-c). `intro`: the kickoff line. `edge`: what runs along the sidelines ('chain': current jumping from marker to
 * marker, cycling up the sideline). `posts`: what the goal posts do ('arc'). `reveal`: what brings the football to the captains at the opening kickoff ('bolt'). The stands above and below the field hold the
 * crowd in every look (stadium-crowd.js); the look only colours the rail in front of them. Environments without an entry keep
 * today's look and have no surround.
 */
export const LOOKS = Object.freeze({
  storm: { label: 'Electric', colors: ['#4cc9ff', '#a06bff', '#eaf6ff'], intro: 'The current is live', edge: 'chain', posts: 'arc', reveal: 'bolt' },
  volcanic: { label: 'Fire', colors: ['#ff7a2a', '#ffc04d', '#fff1c9'], intro: 'The mountain is awake', edge: 'magma', posts: 'flame', reveal: 'eruption' },
  tidal: { label: 'Water', colors: ['#3fd3e6', '#2a8cff', '#e8fdff'], intro: 'The tide is in', edge: 'ripple', posts: 'spray', reveal: 'drop' },
  frozen: { label: 'Ice', colors: ['#7fc4ff', '#4a9fd6', '#f2fbff'], intro: 'The frost has set', edge: 'frost', posts: 'icicle', reveal: 'cube' },
  desert: { label: 'Ground', colors: ['#e0a85a', '#8a5a2c', '#fff0cf'], intro: 'The ground is restless', edge: 'quake', posts: 'rubble', reveal: 'pit' },
  // Designs no club plays on yet (data/stadium-designs.js). `crowd`: the monster type its crowd leans to.
  sky: { label: 'Sky', colors: ['#8fd0ff', '#3f8fd6', '#ffffff'], intro: 'The wind is rising', edge: 'gust', posts: 'spray', reveal: 'float', crowd: 'Wind' },
  oracle: { label: 'Oracle', colors: ['#ff8ae0', '#b48cff', '#fff0fb'], intro: 'The stars have already seen it', edge: 'orbit', posts: 'halo', reveal: 'beam', crowd: 'Psychic' },
  forest: { label: 'Grass', colors: ['#6fe07a', '#c8f05a', '#f2ffd6'], intro: 'The grove is listening', edge: 'vine', posts: 'vine', reveal: 'bloom' },
});
export const lookFor = (envId) => (Object.hasOwn(LOOKS, envId) ? LOOKS[envId] : null);

/**
 * The stadium scene for the game on screen: how far behind each end line the picture reaches (the stands) and the crowd that
 * sits there. Set by the match screen while a game in a stadium with a look is shown, cleared when it leaves. The field camera
 * and the field drawing read it, so every overlay that uses the camera agrees with the picture. Null: the field ends at the
 * end line, exactly as before.
 */
let scene = null;
export const FIELD_BORDER = 2; // yards of white paint around the whole field (sidelines and behind the end lines)
export const STANDS_GRASS = 2; // yards of grass between the white and the barrier
export const STANDS_BARRIER = 1; // the padded wall between the players and the fans
export const STANDS_GAP = FIELD_BORDER + STANDS_GRASS + STANDS_BARRIER; // from the end line to the first row of the stands
export const STANDS_ROWS = 6; // yards of stand: three rows of two yards
export const STANDS_DEPTH = STANDS_GAP + STANDS_ROWS; // how far behind the end line the picture reaches
export function setStadiumScene(venue, crowd = null) { scene = lookFor(venue?.env) ? { env: venue.env, depth: STANDS_DEPTH, crowd } : null; return scene; }
export const stadiumScene = () => scene;
export const standsDepth = () => scene?.depth || 0;
/** How wide the white paint around the field is for the game on screen (0 without a stadium scene: the field as before). */
export const fieldBorder = () => (scene ? FIELD_BORDER : 0);
/** The football as the field draws it on the ground (field-view.js uses the same numbers), in yards. */
export const FOOTBALL = Object.freeze({ rx: 0.7, ry: 0.45, fill: '#d9924f', stroke: '#fff', strokeWidth: 0.18 });

// ---------------------------------------------------------------- the field edge (shared, data-driven)
// Every look uses the same frame: a marker every six yards on each sideline, something that links one marker to the next, and
// a little drifting life beside it. `edge` picks the pieces; the stylesheet moves them. Jumps and pulses take turns (their delay
// follows the marker's place on the field), so the effect cycles up the sideline.
const turn = (yard, side, step, n = 7) => `animation-delay:-${((((n - ((Math.round(yard / 6) + (side > 0 ? 3 : 0)) % n)) % n)) * step).toFixed(2)}s`;
const EDGES = {
  chain: { // Electric: current jumps from marker to marker
    track: (x, span, L) => `<line x1="${x}" y1="0" x2="${x}" y2="${span}" stroke="#0c1430" stroke-width="0.3" opacity="0.85"/><line x1="${x}" y1="0" x2="${x}" y2="${span}" stroke="${L.colors[0]}" stroke-width="0.1" opacity="0.7"/>`,
    marker: (x, y, k, side, yard, L) => `<circle cx="${x}" cy="${y}" r="0.62" fill="#0c1430" stroke="${L.colors[0]}" stroke-width="0.14"/><circle class="sfx-node sfx-anim" style="animation-delay:-${k * 0.8}s" cx="${x}" cy="${y}" r="0.34" fill="${L.colors[2]}"/>`,
    link: (x, y, k, side, yard) => { const j = side * 0.42, dy = -6; return `<path class="sfx-chain sfx-anim" style="${turn(yard, side, 0.26)}" d="M${x} ${y - 0.5} l${-j} ${dy * 0.17} ${j * 1.7} ${dy * 0.16} ${-j * 1.9} ${dy * 0.17} ${j * 1.6} ${dy * 0.16} ${-j * 0.4} ${dy * 0.17}" fill="none" stroke="#1e9cff" stroke-width=".3" stroke-linecap="round" stroke-linejoin="round"/>`; },
  },
  magma: { // Fire: magma flows along the sideline between flame towers; embers rise
    track: (x, span, L) => `<line x1="${x}" y1="0" x2="${x}" y2="${span}" stroke="#1c0c08" stroke-width="0.46" opacity="0.9"/><line class="sfx-channel sfx-anim" x1="${x}" y1="0" x2="${x}" y2="${span}" stroke="${L.colors[0]}" stroke-width="0.36" stroke-dasharray="2.5 2"/><line class="sfx-channel sfx-channel-b sfx-anim" x1="${x}" y1="0" x2="${x}" y2="${span}" stroke="${L.colors[1]}" stroke-width="0.16" stroke-dasharray="1 3.5"/>`,
    marker: (x, y, k, side, yard, L) => `<circle cx="${x}" cy="${y}" r="0.7" fill="#241410" stroke="#4a2a1e" stroke-width="0.14"/><path class="sfx-flame sfx-anim" style="animation-delay:-${k * 0.17}s" d="M${x - 0.42} ${y + 0.1} Q${x - 0.5} ${y - 0.7} ${x} ${y - 1.5} Q${x + 0.5} ${y - 0.7} ${x + 0.42} ${y + 0.1} Z" fill="${L.colors[0]}"/><path class="sfx-flame sfx-anim" style="animation-delay:-${k * 0.17 + 0.2}s" d="M${x - 0.2} ${y + 0.05} Q${x - 0.24} ${y - 0.4} ${x} ${y - 0.85} Q${x + 0.24} ${y - 0.4} ${x + 0.2} ${y + 0.05} Z" fill="${L.colors[1]}"/>`,
    link: (x, y, k, side, yard, L) => `<circle class="sfx-drift sfx-anim" style="animation-delay:-${(k * 1.1 + (side > 0 ? 0.6 : 0)).toFixed(1)}s" cx="${x - side * (0.5 + k * 0.25)}" cy="${y - 1.6}" r="0.13" fill="${L.colors[1]}"/>`,
  },
  ripple: { // Water: a canal along the sideline; each spout in turn shoots a ball of water up, with a ripple where it left
    track: (x, span, L) => `<line x1="${x}" y1="0" x2="${x}" y2="${span}" stroke="#082636" stroke-width="0.4" opacity="0.9"/><line class="sfx-channel sfx-anim" x1="${x}" y1="0" x2="${x}" y2="${span}" stroke="${L.colors[0]}" stroke-width="0.28" stroke-dasharray="2.5 2" opacity=".8"/>`,
    marker: (x, y, k, side, yard, L) => `<ellipse cx="${x}" cy="${y}" rx="0.7" ry="0.8" fill="#0c3346"/><ellipse cx="${x}" cy="${y}" rx="0.45" ry="0.55" fill="${L.colors[0]}" opacity="0.75"/><ellipse class="sfx-ripple sfx-anim" style="${turn(yard, side, 0.36)}" cx="${x}" cy="${y}" rx="0.9" ry="1.1" fill="none" stroke="${L.colors[1]}" stroke-width="0.14"/><circle class="sfx-shot sfx-anim" style="${turn(yard, side, 0.36)}" cx="${x}" cy="${y}" r="0.42" fill="${L.colors[0]}" stroke="${L.colors[1]}" stroke-width="0.12"/>`,
    link: (x, y, k, side, yard, L) => `<path class="sfx-drift sfx-drift-glint sfx-anim" style="animation-delay:-${(k * 1.3).toFixed(1)}s" d="M${x - side * 0.2 - 0.3} ${y - 3} q0.3 -0.25 0.6 0" fill="none" stroke="${L.colors[1]}" stroke-width="0.1"/>`,
  },
  vine: { // Grass: a vine links the trees; green energy travels along it in turn; leaves drift and fireflies glow
    track: () => '',
    marker: (x, y, k, side, yard, L) => `<circle cx="${x}" cy="${y}" r="${0.8 + k * 0.1}" fill="#174a2c"/><circle class="sfx-node sfx-anim" style="animation-delay:-${k * 0.9}s" cx="${x - side * 0.3}" cy="${y - 0.3}" r="${0.5 + k * 0.1}" fill="#2f9a4f"/>`,
    link: (x, y, k, side, yard, L) => { const j = side * 0.5; const d = `M${x} ${y - 0.9} q${-j} -1.2 0 -2.2 t0 -2.2`; return `<path d="${d}" fill="none" stroke="#14532d" stroke-width="0.2"/><path class="sfx-vine sfx-anim" style="${turn(yard, side, 0.3)}" d="${d}" fill="none" stroke="${L.colors[1]}" stroke-width="0.24" stroke-linecap="round"/><ellipse class="sfx-drift sfx-drift-leaf sfx-anim" style="animation-delay:-${(k * 1.4 + (side > 0 ? 1 : 0)).toFixed(1)}s" cx="${x - side * 1.1}" cy="${y - 2.2}" rx="0.26" ry="0.12" fill="${L.colors[0]}"/><circle class="sfx-firefly sfx-anim" style="animation-delay:-${(k * 1.9 + (side > 0 ? 0.7 : 0)).toFixed(1)}s" cx="${x - side * (0.9 + k * 0.3)}" cy="${y - 3.6}" r="0.11" fill="#fff6a8"/>`; },
  },
  frost: { // Ice: a row of snowmen along the sideline. Still: the cold does not need to move.
    track: () => '',
    marker: (x, y, k, side, yard, L) => `<g class="sfx-snowman"><ellipse cx="${x}" cy="${y + 0.95}" rx="0.62" ry="0.16" fill="#000" opacity="0.14"/><circle cx="${x}" cy="${y + 0.38}" r="0.6" fill="#fff" stroke="${L.colors[1]}" stroke-width="0.11"/><circle cx="${x}" cy="${y - 0.42}" r="0.42" fill="#fff" stroke="${L.colors[1]}" stroke-width="0.11"/><rect x="${x - 0.46}" y="${y - 0.84}" width="0.92" height="0.13" fill="#1d2a44"/><rect x="${x - 0.28}" y="${y - 1.3}" width="0.56" height="0.48" fill="#1d2a44"/><path d="M${x - 0.4} ${y - 0.06} h0.8" stroke="${k === 1 ? '#e2504a' : k === 2 ? '#3f9a5a' : '#f0a020'}" stroke-width="0.2" stroke-linecap="round"/><circle cx="${x - 0.15}" cy="${y - 0.5}" r="0.06" fill="#1d2a44"/><circle cx="${x + 0.15}" cy="${y - 0.5}" r="0.06" fill="#1d2a44"/><path d="M${x} ${y - 0.4} l${side * -0.3} 0.08 l${side * 0.3} 0.06 Z" fill="#f08a24"/><circle cx="${x}" cy="${y + 0.25}" r="0.06" fill="#1d2a44"/><circle cx="${x}" cy="${y + 0.52}" r="0.06" fill="#1d2a44"/></g>`,
    link: () => '',
  },
  quake: { // Ground: cacti along the sideline; a crack runs from one to the next in turn; dust rises
    track: (x, span, L) => `<line x1="${x}" y1="0" x2="${x}" y2="${span}" stroke="${L.colors[1]}" stroke-width="0.1" stroke-dasharray="0.6 0.5" opacity="0.6"/>`,
    marker: (x, y, k, side, yard, L) => `<g class="sfx-cactus" fill="none" stroke-linecap="round"><ellipse cx="${x}" cy="${y + 0.95}" rx="0.6" ry="0.15" fill="#000" stroke="none" opacity="0.16"/><path d="M${x} ${y + 0.9} V${y - 0.85} M${x - 0.55} ${y - 0.35} V${y + 0.2} H${x} M${x + 0.55} ${y - 0.6} V${y - 0.05} H${x}" stroke="#1f5a2c" stroke-width="0.5" stroke-linejoin="round"/><path d="M${x} ${y + 0.9} V${y - 0.85} M${x - 0.55} ${y - 0.35} V${y + 0.2} H${x} M${x + 0.55} ${y - 0.6} V${y - 0.05} H${x}" stroke="#4fa55a" stroke-width="0.3" stroke-linejoin="round"/><circle cx="${x + (k % 2 ? 0.55 : 0)}" cy="${y - (k % 2 ? 0.8 : 1.02)}" r="0.14" fill="${k === 2 ? '#ffd24a' : '#ff7fb0'}" stroke="none"/></g>`,
    link: (x, y, k, side, yard, L) => { const j = side * 0.3; return `<path class="sfx-vine sfx-anim" style="${turn(yard, side, 0.26)}" d="M${x} ${y - 1.1} l${-j} -0.9 ${j * 1.8} -1 ${-j * 1.6} -1 ${j * 0.8} -1" fill="none" stroke="#5e3d1e" stroke-width="0.18" stroke-linecap="round" stroke-linejoin="round"/><circle class="sfx-drift sfx-anim" style="animation-delay:-${(k * 1.1).toFixed(1)}s" cx="${x - side * 0.45}" cy="${y - 1.4}" r="0.2" fill="#c79a5c" opacity="0.8"/><circle class="sfx-drift sfx-anim" style="animation-delay:-${(k * 1.1 + 1.6).toFixed(1)}s" cx="${x + side * 0.3}" cy="${y - 3.4}" r="0.15" fill="#c79a5c" opacity="0.8"/>`; },
  },
  gust: { // Sky: pennants on poles along the sideline flutter; a gust runs from one to the next in turn; cloud puffs drift
    track: () => '',
    marker: (x, y, k, side, yard, L) => { const col = ['#ff6b5a', '#ffb13d', L.colors[1]][k % 3]; return `<ellipse cx="${x}" cy="${y + 0.95}" rx="0.4" ry="0.13" fill="#000" opacity="0.16"/><line x1="${x - side * 0.5}" y1="${y + 0.95}" x2="${x - side * 0.5}" y2="${y - 1.1}" stroke="#5a6676" stroke-width="0.14" stroke-linecap="round"/><path class="sfx-flutter sfx-anim" style="animation-delay:-${k * 0.33}s" d="M${x - side * 0.5} ${y - 1.1} L${x + side * 0.75} ${y - 0.72} L${x - side * 0.5} ${y - 0.3} Z" fill="${col}" stroke="#2a3a52" stroke-width="0.07" stroke-linejoin="round"/>`; },
    link: (x, y, k, side, yard, L) => { const j = side * 0.5; return `<path class="sfx-vine sfx-anim" style="${turn(yard, side, 0.3)}" d="M${x} ${y - 1.4} q${-j} -1 0 -1.9 t0 -1.9" fill="none" stroke="${L.colors[1]}" stroke-width="0.2" stroke-linecap="round"/><ellipse class="sfx-drift sfx-anim" style="animation-delay:-${(k * 1.3 + (side > 0 ? 0.8 : 0)).toFixed(1)}s" cx="${x + side * 0.3}" cy="${y - 2.6}" rx="0.42" ry="0.18" fill="#9cc9ee"/>`; },
  },
  orbit: { // Oracle: orbs along the sideline, each with a star circling it; the constellation lights up link by link
    track: (x, span, L) => `<line x1="${x}" y1="0" x2="${x}" y2="${span}" stroke="${L.colors[1]}" stroke-width="0.1" stroke-dasharray="0.15 0.9" stroke-linecap="round"/>`,
    marker: (x, y, k, side, yard, L) => `<circle cx="${x}" cy="${y}" r="0.6" fill="#4a2382" stroke="${L.colors[0]}" stroke-width="0.12"/><circle class="sfx-node sfx-anim" style="animation-delay:-${k * 0.8}s" cx="${x - 0.12}" cy="${y - 0.14}" r="0.26" fill="${L.colors[0]}"/><circle class="sfx-orbit sfx-anim" style="animation-delay:-${k}s" cx="${x}" cy="${y}" r="0.13" fill="#7a3fd0"/>`,
    link: (x, y, k, side, yard, L) => `<path class="sfx-vine sfx-anim" style="${turn(yard, side, 0.3)}" d="M${x} ${y - 0.9} l${side * 0.4} -2.1 l${-side * 0.4} -2.1" fill="none" stroke="#b03fc0" stroke-width="0.2" stroke-linecap="round" stroke-linejoin="round"/><path class="sfx-firefly sfx-anim" style="animation-delay:-${(k * 1.7 + (side > 0 ? 0.9 : 0)).toFixed(1)}s" d="M${x + side * 0.4 - 0.26} ${y - 3} h0.52 m-0.26 -0.26 v0.52" fill="none" stroke="#7a3fd0" stroke-width="0.12" stroke-linecap="round"/>`,
  },
};
/** Everything a look puts along both sidelines for the visible stretch of field ('' for a stadium without a look). */
export function edgeSvg(envId, cam, HW, Y, span) {
  const L = lookFor(envId); const E = L && EDGES[L.edge]; if (!E) return '';
  const out = [];
  const b = fieldBorder(); // with the white paint around the field, the markers stand on the white, not on the grass
  for (const side of [-1, 1]) { const x = side * (b ? HW + b / 2 : HW - 0.45); out.push(E.track(x, span, L));
    for (let yard = Math.ceil(cam.bottom / 6) * 6; yard < cam.top; yard += 6) {
      if (yard < 0 || yard > 100) continue; // the markers stand along the field of play, not behind the end lines
      const y = Y(yard + (side > 0 ? 3 : 0)); const k = Math.abs((yard / 6 + (side > 0 ? 1 : 0)) % 3);
      if (yard + 6 <= 100) out.push(E.link(x, y, k, side, yard, L));
      out.push(E.marker(x, y, k, side, yard, L));
    } }
  return out.join('');
}
/**
 * What a look's goal posts do. The posts stand on the end line with their uprights laid back over the grass behind it (in view
 * now that the picture reaches past the end line); the look adds a glow and what runs between or along them. Thin, translucent
 * pieces: a kicked ball stays visible. `y` is the crossbar, `dir` +1 for the far posts.
 */
export function postsSvg(envId, y, dir) {
  const L = lookFor(envId); if (!L?.posts) return '';
  const [a, b, c] = L.colors; const tip = y - dir * 2.4; const shape = `M-3 ${tip} V${y} H3 V${tip}`;
  const climb = (d, i) => `<path class="sfx-post-arc sfx-anim" style="--climb:${-dir * 2.05}px;animation-delay:-${i * 0.5}s" d="${d}" fill="none" stroke="${c}" stroke-width="0.16" stroke-linejoin="round" stroke-linecap="round"/>`;
  let extra = '';
  if (L.posts === 'arc') extra = [0, 1, 2].map((i) => climb(`M-3 ${y - dir * 0.2} l1 -0.28 1 0.5 1 -0.5 1 0.5 1 -0.5 1 0.28`, i)).join('');
  else if (L.posts === 'spray') extra = [0, 1, 2].map((i) => climb(`M-3 ${y - dir * 0.2} q0.75 -0.5 1.5 0 t1.5 0 t1.5 0 t1.5 0`, i)).join('');
  else if (L.posts === 'flame') extra = [-3, 3].map((px, i) => `<path class="sfx-flame sfx-anim" style="animation-delay:-${i * 0.23}s" d="M${px - 0.4} ${tip + 0.1} Q${px - 0.48} ${tip - 0.7} ${px} ${tip - 1.4} Q${px + 0.48} ${tip - 0.7} ${px + 0.4} ${tip + 0.1} Z" fill="${a}" stroke="none"/><path class="sfx-flame sfx-anim" style="animation-delay:-${i * 0.23 + 0.2}s" d="M${px - 0.2} ${tip + 0.05} Q${px - 0.22} ${tip - 0.35} ${px} ${tip - 0.8} Q${px + 0.22} ${tip - 0.35} ${px + 0.2} ${tip + 0.05} Z" fill="${b}" stroke="none"/>`).join('');
  else if (L.posts === 'vine') extra = `<path class="sfx-vine sfx-anim" d="${shape}" stroke="${b}" stroke-width="0.24" stroke-linecap="round"/>${[-3, 3].flatMap((px, s) => [0.6, 1.3, 2].map((t, i) => `<ellipse class="sfx-node sfx-anim" style="animation-delay:-${(i * 0.6 + s * 0.3).toFixed(1)}s" cx="${px + (i % 2 ? 0.35 : -0.35)}" cy="${y - dir * t}" rx="0.3" ry="0.15" fill="${a}" stroke="none"/>`)).join('')}`;
  else if (L.posts === 'icicle') extra = `${[-2.4, -1.5, -0.6, 0.3, 1.2, 2.1].map((px, i) => `<path d="M${px} ${y} h0.5 l-0.25 ${dir * (0.7 + (i % 3) * 0.3)} Z" fill="#dff3ff" stroke="${b}" stroke-width="0.06"/>`).join('')}${[-3, 3].map((px, i) => `<path class="sfx-node sfx-anim" style="animation-delay:-${i * 0.9}s" d="M${px} ${tip - 0.55} L${px + 0.3} ${tip} L${px} ${tip + 0.55} L${px - 0.3} ${tip} Z" fill="#fff" stroke="${b}" stroke-width="0.06"/>`).join('')}`;
  else if (L.posts === 'rubble') extra = [-3, 3].map((px, i) => `<path d="M${px - 0.7} ${y + 0.35} L${px - 0.35} ${y - 0.45} L${px + 0.4} ${y - 0.4} L${px + 0.7} ${y + 0.35} Z" fill="${b}" stroke="#5e3d1e" stroke-width="0.08"/><circle class="sfx-drift sfx-anim" style="animation-delay:-${i * 1.4}s" cx="${px + (i ? -0.5 : 0.5)}" cy="${y - 0.3}" r="0.2" fill="#c79a5c" stroke="none" opacity="0.8"/><circle class="sfx-drift sfx-anim" style="animation-delay:-${i * 1.4 + 1.7}s" cx="${px}" cy="${y - 1}" r="0.15" fill="#c79a5c" stroke="none" opacity="0.8"/>`).join('');
  else if (L.posts === 'halo') extra = `${[0, 1, 2].map((i) => climb(`M-3 ${y - dir * 0.2} q3 ${-dir * 0.9} 6 0`, i)).join('')}<circle class="sfx-node sfx-anim" cx="0" cy="${y - dir * 1.2}" r="0.34" fill="${a}" stroke="none"/>`;
  const tips = L.posts === 'flame' || L.posts === 'icicle' ? '' : `<circle cx="-3" cy="${tip}" r="0.3" fill="${c}" stroke="none"/><circle cx="3" cy="${tip}" r="0.3" fill="${c}" stroke="none"/>`;
  return `<g class="sfx-post" fill="none"><path class="sfx-post-glow sfx-anim" d="${shape}" stroke="${a}" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round"/><path d="${shape}" stroke="#ffd84a" stroke-width="0.45" stroke-linecap="round" stroke-linejoin="round"/>${extra}${tips}</g>`;
}

/**
 * The stand behind the far end zone, drawn with the field (it does not follow the camera: it comes into view as play nears the
 * end zone). Three rows of the generated crowd, the two "arms up" layers for celebrations, and the stadium's rail in front.
 * `y0` is the svg y of the back of the stand, `x0`/`w` its left edge and width, all in yards.
 */
export function standSvg(venue, x0, y0, w) {
  const look = lookFor(venue?.env); if (!look || !scene) return '';
  const d = STANDS_ROWS; const [a, b] = look.colors; const img = scene.crowd ? crowdImages({ ...scene.crowd, stand: 'far' }) : null;
  const pic = (cls, u) => (u ? `<image class="${cls}" href="${u}" x="${x0}" y="${y0}" width="${w}" height="${d - 0.5}" preserveAspectRatio="none" style="image-rendering:pixelated"/>` : '');
  return `<g class="sfx-stand"><rect x="${x0}" y="${y0}" width="${w}" height="${d}" fill="#10151d"/>${pic('sfx-crowd-img', img?.base)}${pic('sfx-cheer sfx-cheer-home', img?.home)}${pic('sfx-cheer sfx-cheer-away', img?.away)}<rect x="${x0}" y="${y0 + d - 0.5}" width="${w}" height="0.5" fill="#0c1430"/><line class="sfx-channel sfx-anim" x1="${x0}" y1="${y0 + d - 0.25}" x2="${x0 + w}" y2="${y0 + d - 0.25}" stroke="${a}" stroke-width="0.22" stroke-dasharray="2.5 2"/><line class="sfx-channel sfx-channel-b sfx-anim" x1="${x0}" y1="${y0 + d - 0.25}" x2="${x0 + w}" y2="${y0 + d - 0.25}" stroke="${b}" stroke-width="0.12" stroke-dasharray="1 3.5"/></g>`;
}
/**
 * The white paint around the whole field: a band outside each sideline and behind each end line. `HW` is the field's half width;
 * the picture is `fieldBorder()` yards wider on each side while a stadium scene is set. '' otherwise.
 */
export function borderSvg(cam, HW, Y) {
  const b = fieldBorder(); if (!b) return '';
  const top = Math.min(cam.top, 110 + b), bot = Math.max(cam.bottom, -10 - b); if (top <= bot) return '';
  const y = Y(top), h = top - bot; const W = '#eef2ea'; let s = '';
  for (const side of [-1, 1]) { const x = side > 0 ? HW : -HW - b; s += `<rect x="${x}" y="${y}" width="${b}" height="${h}" fill="${W}"/><line x1="${side * (HW + b) - side * 0.06}" y1="${y}" x2="${side * (HW + b) - side * 0.06}" y2="${y + h}" stroke="#9aa39a" stroke-width="0.12"/>`; }
  if (cam.top > 110) s += `<rect x="${-HW}" y="${Y(110 + b)}" width="${HW * 2}" height="${b}" fill="${W}"/>`;
  if (cam.bottom < -10) s += `<rect x="${-HW}" y="${Y(-10)}" width="${HW * 2}" height="${b}" fill="${W}"/>`;
  return `<g class="sfx-border">${s}</g>`;
}
/**
 * The padded wall between the players and the fans, in the home club's colour: `y0` is its top edge in the picture, `fans` is
 * which side the crowd is on (-1: above it, as behind the far end zone; 1: below it).
 */
export function barrierSvg(venue, x0, y0, w, fans = -1, h = STANDS_BARRIER) {
  const look = lookFor(venue?.env); if (!look || !scene) return '';
  const col = scene.crowd?.homeColor || look.colors[1]; let seams = '';
  for (let x = x0 + 3; x < x0 + w - 0.5; x += 3) seams += `M${x.toFixed(2)} ${y0} v${h}`;
  const cap = fans < 0 ? y0 : y0 + h - 0.16, foot = fans < 0 ? y0 + h - 0.14 : y0;
  return `<g class="sfx-barrier"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${col}"/><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#000" opacity="0.38"/><path d="${seams}" stroke="#000" stroke-width="0.1" opacity="0.45"/><rect x="${x0}" y="${cap}" width="${w}" height="0.16" fill="#fff" opacity="0.6"/><rect x="${x0}" y="${foot}" width="${w}" height="0.14" fill="#000" opacity="0.35"/></g>`;
}
/** The grass between an end line and the stand or wall behind it: the stadium's own turf, a shade darker, with a boundary line. */
export function apronSvg(venue, x0, y0, w, h) {
  const env = fieldOf(venue?.env); if (!env || !scene) return '';
  return `<g class="sfx-apron"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${env.palette.c}"/><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#000" opacity="0.18"/></g>`;
}
/** Behind the near end zone there is no stand in view: the stadium's wall and rail close the picture. */
export function wallSvg(venue, x0, y0, w) {
  const look = lookFor(venue?.env); if (!look || !scene) return '';
  const d = STANDS_ROWS; const [a] = look.colors;
  return `<g class="sfx-wall"><rect x="${x0}" y="${y0}" width="${w}" height="${d}" fill="#0d1320"/><rect x="${x0}" y="${y0}" width="${w}" height="0.5" fill="#0c1430"/><line class="sfx-channel sfx-anim" x1="${x0}" y1="${y0 + 0.25}" x2="${x0 + w}" y2="${y0 + 0.25}" stroke="${a}" stroke-width="0.22" stroke-dasharray="2.5 2"/>${[0.18, 0.5, 0.82].map((k) => `<rect x="${x0 + w * k - 3}" y="${y0 + 1.4}" width="6" height="${d - 2}" rx="0.4" fill="#141c30" stroke="#26335a" stroke-width="0.12"/>`).join('')}</g>`;
}
/**
 * The surround for a venue: the edge light that reactions use and the lap of energy for the biggest moments. '' for a stadium
 * without a look.
 */
export function surroundHtml(venue) {
  const look = lookFor(venue?.env); if (!look) return '';
  const [a, b, c] = look.colors;
  return `<div class="stadium-surround sfx-${venue.env}" style="--sfx-a:${a};--sfx-b:${b};--sfx-c:${c}" aria-hidden="true"><i class="sfx-edge"></i><i class="sfx-lap"></i></div>`;
}
/** How long the kickoff reveal runs before the kick, by level (it can always be skipped). */
export const REVEAL_MS = Object.freeze({ full: 1900, reduced: 900 });
/**
 * The kickoff reveal: after the player presses the kickoff button on the opening kickoff, the stadium's own strike lands between
 * the captains and leaves the football there; then the kick goes ahead. '' for a stadium without one, and at Off. A tap skips it.
 */
export function kickoffRevealHtml(venue, level = 'full') {
  const look = lookFor(venue?.env); if (!look?.reveal || level === 'off') return '';
  const [a, b, c] = look.colors;
  const R = {
    // Electric: a thunderbolt from above
    bolt: `<svg class="sfx-strike" viewBox="0 0 60 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M33 0 L24 26 L33 26 L21 52 L31 52 L27 100" fill="none" stroke="${a}" stroke-width="7" stroke-linejoin="round" opacity=".55"/><path d="M33 0 L24 26 L33 26 L21 52 L31 52 L27 100" fill="none" stroke="${c}" stroke-width="2.6" stroke-linejoin="round"/><path d="M24 26 L12 40 M31 52 L44 63" fill="none" stroke="${b}" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    // Fire: a column of flame erupts from the ground
    eruption: `<svg class="sfx-rise" viewBox="0 0 60 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M30 100 Q4 78 16 52 Q20 66 26 56 Q18 30 30 0 Q42 30 34 56 Q40 66 44 52 Q56 78 30 100 Z" fill="${a}" opacity=".85"/><path d="M30 100 Q16 82 24 60 Q28 70 30 40 Q32 70 36 60 Q44 82 30 100 Z" fill="${b}"/><path d="M30 100 Q24 88 30 66 Q36 88 30 100 Z" fill="${c}"/></svg>`,
    // Water: one giant drop falls from the sky and bursts between the captains
    drop: `<svg class="sfx-drop" viewBox="0 0 60 90" aria-hidden="true" focusable="false"><path d="M30 0 C30 0 4 44 4 60 A26 26 0 0 0 56 60 C56 44 30 0 30 0 Z" fill="${a}" stroke="${b}" stroke-width="2" opacity=".92"/><path d="M17 56 q-2 14 10 22" fill="none" stroke="${c}" stroke-width="3.4" stroke-linecap="round" opacity=".9"/></svg><i class="sfx-splash"></i>`,
    geyser: `<svg class="sfx-rise" viewBox="0 0 60 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M30 100 Q14 70 22 30 Q26 8 30 0 Q34 8 38 30 Q46 70 30 100 Z" fill="${a}" opacity=".8"/><path d="M30 100 Q22 70 27 34 Q30 14 33 34 Q38 70 30 100 Z" fill="${c}" opacity=".9"/><circle cx="12" cy="24" r="3" fill="${c}"/><circle cx="48" cy="18" r="2.4" fill="${c}"/><circle cx="8" cy="46" r="2" fill="${a}"/><circle cx="52" cy="42" r="2.6" fill="${a}"/><circle cx="20" cy="8" r="2" fill="${b}"/><circle cx="42" cy="4" r="1.8" fill="${b}"/></svg>`,
    // Ice: the football sits frozen in a big ice cube; the cube cracks and splits open
    cube: `<svg class="sfx-cube sfx-cube-l" viewBox="0 0 50 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect x="4" y="4" width="92" height="92" rx="10" fill="${a}" opacity=".5"/><rect x="4" y="4" width="92" height="92" rx="10" fill="none" stroke="${c}" stroke-width="4"/><path d="M14 22 L30 12 M14 40 L22 34 M70 88 L88 74" stroke="${c}" stroke-width="4" stroke-linecap="round" opacity=".9"/><rect x="12" y="12" width="76" height="76" rx="6" fill="none" stroke="${b}" stroke-width="2" opacity=".55"/></svg><svg class="sfx-cube sfx-cube-r" viewBox="50 0 50 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect x="4" y="4" width="92" height="92" rx="10" fill="${a}" opacity=".5"/><rect x="4" y="4" width="92" height="92" rx="10" fill="none" stroke="${c}" stroke-width="4"/><path d="M14 22 L30 12 M14 40 L22 34 M70 88 L88 74" stroke="${c}" stroke-width="4" stroke-linecap="round" opacity=".9"/><rect x="12" y="12" width="76" height="76" rx="6" fill="none" stroke="${b}" stroke-width="2" opacity=".55"/></svg><svg class="sfx-crack" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M50 2 L44 22 L56 38 L46 54 L57 70 L49 98 M56 38 L72 30 M46 54 L28 62 M57 70 L74 80" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg>`,
    // Ground: the ground opens, the football comes up out of it, and the ground closes
    pit: `<svg class="sfx-pit" viewBox="-60 -40 120 80" aria-hidden="true" focusable="false"><path d="M-56 0 L-40 -16 L-30 -10 L-16 -30 L-4 -22 L10 -34 L22 -18 L38 -22 L56 0 L40 14 L30 10 L14 32 L2 22 L-12 34 L-24 16 L-40 20 Z" fill="${b}"/><path d="M-46 0 L-34 -10 L-26 -6 L-14 -22 L-4 -15 L8 -25 L18 -12 L32 -15 L46 0 L34 9 L26 6 L12 23 L2 15 L-10 25 L-20 11 L-34 13 Z" fill="#170d06"/></svg>`,
    // Sky: the football floats down out of the sky, with its shadow growing under it
    float: `<i class="sfx-shadow"></i>`,
    // Oracle: a saucer arrives, shines its beam on the field, and when the beam goes out the football is there
    beam: `<i class="sfx-beam"></i><svg class="sfx-ufo" viewBox="0 0 120 60" aria-hidden="true" focusable="false"><ellipse cx="60" cy="24" rx="26" ry="20" fill="${b}" opacity=".85"/><ellipse cx="52" cy="16" rx="8" ry="5" fill="${c}" opacity=".8"/><ellipse cx="60" cy="36" rx="56" ry="15" fill="#2a1a4a" stroke="${a}" stroke-width="3"/><ellipse cx="60" cy="31" rx="50" ry="9" fill="#6a4aa8"/>${[14, 37, 60, 83, 106].map((x, i) => `<circle class="sfx-ufo-light" style="animation-delay:-${i * 0.12}s" cx="${x}" cy="${38 + (i === 2 ? 6 : i === 1 || i === 3 ? 4 : 0)}" r="4" fill="${c}"/>`).join('')}</svg>`,
    // Grass: leaves swirl up and open
    bloom: `<svg class="sfx-swirl" viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">${Array.from({ length: 10 }, (_, i) => `<ellipse cx="0" cy="-30" rx="6" ry="14" fill="${i % 2 ? a : b}" opacity=".9" transform="rotate(${i * 36})"/>`).join('')}<circle r="12" fill="none" stroke="${c}" stroke-width="2"/></svg>`,
  };
  const bolt = R[look.reveal] || R.bolt;
  // The game's own football: same shape, colour and outline as on the field, at the field's scale (--sfx-yd = pixels per yard).
  const B = FOOTBALL; const ball = `<svg class="sfx-ball" viewBox="${-B.rx - 0.2} ${-B.ry - 0.2} ${(B.rx + 0.2) * 2} ${(B.ry + 0.2) * 2}" style="width:calc(var(--sfx-yd, 8px) * ${(B.rx + 0.2) * 2})" aria-hidden="true" focusable="false"><ellipse rx="${B.rx}" ry="${B.ry}" fill="${B.fill}" stroke="${B.stroke}" stroke-width="${B.strokeWidth}"/></svg>`;
  return `<div class="sfx-reveal sfx-reveal-${look.reveal} ${level === 'reduced' ? 'sfx-reveal-simple' : ''}" style="--sfx-a:${a};--sfx-b:${b};--sfx-c:${c}" role="button" aria-label="Skip">${level === 'reduced' ? '' : `<i class="sfx-whiteout"></i>${bolt}`}<i class="sfx-ring"></i>${ball}<span class="sfx-skip">Tap to skip</span></div>`;
}
/** The kickoff name plate: the stadium, its kind and its line. */
export function introPlateHtml(venue, esc = (s) => s) {
  const look = lookFor(venue?.env); const env = fieldOf(venue?.env); if (!look || !env) return '';
  return `<div class="sfx-plate"><b>${esc(venue.name || env.name)}</b><span>${esc(look.intro)}</span></div>`;
}
