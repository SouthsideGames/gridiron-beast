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

import { ENVIRONMENTS, STADIUM_VARIANTS } from '../data/stadiums.js';
import { designField } from '../data/stadium-designs.js';
/** The field a venue names: one a club plays on, or a design no club has yet. */
const fieldOf = (envId) => ENVIRONMENTS[envId] || designField(envId) || null;
import { crowdImages } from './stadium-crowd.js';
import { TEAM_META } from '../data/league.js';
import { regionOf, CLUB_NAMES } from '../data/club-identity.js';
import { teamLogoSymbol } from './team-logo.js';

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
  else if (ev.kind === 'try') { if (!ev.good) return null; kind = 'fg'; team = ev.tryTeam || ev.kicking || off; } // a good extra point or two-point try
  else if (r === 'sack') { kind = 'sack'; team = def; }
  else if (ev.sim?.stats?.fumbledBy) { kind = 'fumble'; team = def; } // loose ball the offense kept: the impact only
  if (!kind) return null;
  const side = team === 'home' ? 'home' : 'away';
  const ms = Math.round(REACTION_MS[kind] * (side === 'home' ? 1 : 0.7));
  // A score is cheered until the next play starts (owner 2026-11-24): the match screen stops it at its next event.
  return { kind, level: MAJOR.has(kind) ? 'major' : 'minor', side, ms, ...(kind === 'td' || kind === 'fg' ? { hold: true } : {}) };
}

// ---------------------------------------------------------------- reaction playback (DOM, one at a time)
let timer = null; let current = null; let playing = null; // playing: { kind, side, until } while a reaction runs
/** Clear whatever is playing (also on leaving the screen). */
export function stopStadiumReaction(wrap = current) {
  clearTimeout(timer); timer = null; playing = null;
  if (wrap?.dataset) { delete wrap.dataset.sfx; delete wrap.dataset.sfxSide; delete wrap.dataset.sfxHold; }
  current = null;
}
/** The screen was rebuilt while a reaction was playing: carry the reaction on to the new box for the time it has left. */
export function resumeStadiumReaction(wrap, now = Date.now()) {
  if (!wrap || !playing || wrap === current) return false;
  const left = playing.until - now; if (left < 120) return false;
  wrap.dataset.sfx = playing.kind; wrap.dataset.sfxSide = playing.side; if (playing.hold) wrap.dataset.sfxHold = '1'; current = wrap;
  clearTimeout(timer); timer = Number.isFinite(left) ? setTimeout(() => stopStadiumReaction(wrap), left) : null;
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
  // hold: the cheer goes on (the fans keep jumping) until the screen stops it at the next play; the flashes still play once
  if (reaction.hold && level !== 'reduced') { wrap.dataset.sfxHold = '1'; playing = { kind: reaction.kind, side: reaction.side, until: Infinity, hold: true }; timer = null; return true; }
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
  rock: { label: 'Rock', colors: ['#c9b79a', '#7d7264', '#f2ece0'], intro: 'The mountain does not move', edge: 'cairn', posts: 'rubble', reveal: 'boulder', crowd: 'Earth' },
  bug: { label: 'Bug', colors: ['#ffd24a', '#7fae1c', '#fff6c9'], intro: 'The hive is humming', edge: 'hive', posts: 'web', reveal: 'web', crowd: 'Nature' },
  specter: { label: 'Specter', colors: ['#8dffc8', '#2fae84', '#eafff5'], intro: 'They never left', edge: 'grave', posts: 'halo', reveal: 'fade', crowd: 'Dark', haunt: true },
  dome: { label: 'Alloy', colors: ['#6fd8ff', '#8f99ad', '#ffffff'], intro: 'The forge is lit', edge: 'pylon', posts: 'beacon', reveal: 'hatch' },
  clash: { label: 'Clash', colors: ['#ff5a4a', '#ffd24a', '#fff3e0'], intro: 'Seconds out', edge: 'ropes', posts: 'pads', reveal: 'belt', crowd: 'Earth' },
  corrupt: { label: 'Corrupt', colors: ['#9cff4a', '#b06cff', '#f0ffd6'], intro: 'Something is in the water', edge: 'cauldron', posts: 'drip', reveal: 'goo', crowd: 'Dark' },
  dragon: { label: 'Wyrm', colors: ['#ff6a3a', '#b04ad0', '#ffe9c4'], intro: 'The den is awake', edge: 'eggs', posts: 'flame', reveal: 'firebreath', crowd: 'Fire' },
  shadow: { label: 'Umbral', colors: ['#b9a6ff', '#6a4ad0', '#f4f0ff'], intro: 'The lights are going out', edge: 'lantern', posts: 'moon', reveal: 'eclipse' },
  radiant: { label: 'Radiant', colors: ['#ffd24a', '#ff9a2a', '#fff6d0'], intro: 'The sun is up', edge: 'sundial', posts: 'sunburst', reveal: 'sunrise' },
  forest: { label: 'Grass', colors: ['#6fe07a', '#c8f05a', '#f2ffd6'], intro: 'The grove is listening', edge: 'vine', posts: 'vine', reveal: 'bloom' },
  // The ordinary home field of the twenty clubs without a Gym Leader (owner, 2026-11-22): plain grass with the same white
  // paint, barrier, crowd, side stands and play reactions as every stadium, and none of a gym's markers, posts or kickoff reveal.
  grass: { label: 'Home', colors: ['#bfe8c6', '#7fc98d', '#ffffff'], intro: 'Home turf', edge: null, posts: null, reveal: null, plain: true },
});
export const lookFor = (envId) => (Object.hasOwn(LOOKS, envId) ? LOOKS[envId] : null);
/**
 * A venue's look with its home club (owner ruling 2026-11-23, second set): on the plain home field of a club without a Gym
 * Leader the colours are the club's own [primary, secondary, accent] and the region of its division dresses the ground around the
 * field (data/club-identity.js REGIONS). A Gym Leader's look is returned as it is: its design is approved and stays.
 */
const lookMemo = new Map();
export function venueLook(venue) {
  const L = lookFor(venue?.env); if (!L) return null; const m = TEAM_META[venue?.club]; if (!L.plain || !m) return L;
  const key = venue.club; if (!lookMemo.has(key)) lookMemo.set(key, Object.freeze({ ...L, colors: [m.color, m.secondary, m.accent], region: regionOf(venue.club), club: venue.club, banner: BANNERS[(CLUB_NAMES[venue.club]?.[0].length || 0) % BANNERS.length] }));
  return lookMemo.get(key);
}
const BANNERS = ['stripes', 'chevron', 'split', 'diamond'];

/**
 * The stadium scene for the game on screen: how far behind each end line the picture reaches (the stands) and the crowd that
 * sits there. Set by the match screen while a game in a stadium with a look is shown, cleared when it leaves. The field camera
 * and the field drawing read it, so every overlay that uses the camera agrees with the picture. Null: the field ends at the
 * end line, exactly as before.
 */
let scene = null;
export const FIELD_BORDER = 2; // yards of white paint around the whole field (sidelines and behind the end lines)
export const STANDS_GRASS = 5; // yards of green between the white behind each end zone and the barrier (owner 2026-11-25: was 2)
export const STANDS_BARRIER = 1; // the padded wall between the players and the fans
export const STANDS_GAP = FIELD_BORDER + STANDS_GRASS + STANDS_BARRIER; // from the end line to the first row of the stands
export const STANDS_ROWS = 6; // yards of stand: three rows of two yards
export const STANDS_DEPTH = STANDS_GAP + STANDS_ROWS; // how far behind the end line the picture reaches
export function setStadiumScene(venue, crowd = null) { scene = lookFor(venue?.env) ? { env: venue.env, club: venue.club || null, depth: STANDS_DEPTH, crowd } : null; return scene; }
export const stadiumScene = () => scene;
export const standsDepth = () => scene?.depth || 0;
/** How wide the white paint around the field is for the game on screen (0 without a stadium scene: the field as before). */
export const fieldBorder = () => (scene ? FIELD_BORDER : 0);
/** The football as the field draws it on the ground (field-view.js uses the same numbers), in yards. */
export const FOOTBALL = Object.freeze({ rx: 0.7, ry: 0.45, fill: '#d9924f', stroke: '#fff', strokeWidth: 0.18 });

// ---------------------------------------------------------------- the field edge (shared, data-driven)
// Every look uses the same frame: a marker halfway between the numbered lines on each sideline (the 5, 15, ... 45 of both halves,
// owner 2026-11-24), something that links one marker to the next, and
// a little drifting life beside it. `edge` picks the pieces; the stylesheet moves them. Jumps and pulses take turns (their delay
// follows the marker's place on the field), so the effect cycles up the sideline.
/** Sideline markers stand halfway between the numbered lines: the 5, 15, 25, 35 and 45 of both halves, never in an end zone. */
export const MARKER_GAP = 10;
export const markerYards = (cam) => { const out = []; for (let yard = Math.max(5, Math.ceil((cam.bottom - 5) / MARKER_GAP) * MARKER_GAP + 5); yard < cam.top && yard <= 95; yard += MARKER_GAP) out.push(yard); return out; };
const markerStep = (yard) => Math.round((yard - 5) / MARKER_GAP);
const turn = (yard, side, step, n = 7) => `animation-delay:-${((((n - ((markerStep(yard) + (side > 0 ? 3 : 0)) % n)) % n)) * step).toFixed(2)}s`;
const EDGES = {
  chain: { // Electric: current jumps from marker to marker
    track: (x, span, L) => `<line x1="${x}" y1="0" x2="${x}" y2="${span}" stroke="#0c1430" stroke-width="0.3" opacity="0.85"/><line x1="${x}" y1="0" x2="${x}" y2="${span}" stroke="${L.colors[0]}" stroke-width="0.1" opacity="0.7"/>`,
    marker: (x, y, k, side, yard, L) => `<circle cx="${x}" cy="${y}" r="0.62" fill="#0c1430" stroke="${L.colors[0]}" stroke-width="0.14"/><circle class="sfx-node sfx-anim" style="animation-delay:-${k * 0.8}s" cx="${x}" cy="${y}" r="0.34" fill="${L.colors[2]}"/>`,
    link: (x, y, k, side, yard) => { const j = side * 0.42, dy = -MARKER_GAP; return `<path class="sfx-chain sfx-anim" style="${turn(yard, side, 0.26)}" d="M${x} ${y - 0.5} l${-j} ${dy * 0.17} ${j * 1.7} ${dy * 0.16} ${-j * 1.9} ${dy * 0.17} ${j * 1.6} ${dy * 0.16} ${-j * 0.4} ${dy * 0.17}" fill="none" stroke="#1e9cff" stroke-width=".3" stroke-linecap="round" stroke-linejoin="round"/>`; },
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
    link: (x, y, k, side, yard, L) => { const j = side * 0.5; const d = `M${x} ${y - 0.9} q${-j} -2.2 0 -4.2 t0 -4.2`; return `<path d="${d}" fill="none" stroke="#14532d" stroke-width="0.2"/><path class="sfx-vine sfx-anim" style="${turn(yard, side, 0.3)}" d="${d}" fill="none" stroke="${L.colors[1]}" stroke-width="0.24" stroke-linecap="round"/><ellipse class="sfx-drift sfx-drift-leaf sfx-anim" style="animation-delay:-${(k * 1.4 + (side > 0 ? 1 : 0)).toFixed(1)}s" cx="${x - side * 1.1}" cy="${y - 2.2}" rx="0.26" ry="0.12" fill="${L.colors[0]}"/><circle class="sfx-firefly sfx-anim" style="animation-delay:-${(k * 1.9 + (side > 0 ? 0.7 : 0)).toFixed(1)}s" cx="${x - side * (0.9 + k * 0.3)}" cy="${y - 3.6}" r="0.11" fill="#fff6a8"/>`; },
  },
  frost: { // Ice: a row of snowmen along the sideline. Still: the cold does not need to move.
    track: () => '',
    marker: (x, y, k, side, yard, L) => `<g class="sfx-snowman"><ellipse cx="${x}" cy="${y + 0.95}" rx="0.62" ry="0.16" fill="#000" opacity="0.14"/><circle cx="${x}" cy="${y + 0.38}" r="0.6" fill="#fff" stroke="${L.colors[1]}" stroke-width="0.11"/><circle cx="${x}" cy="${y - 0.42}" r="0.42" fill="#fff" stroke="${L.colors[1]}" stroke-width="0.11"/><rect x="${x - 0.46}" y="${y - 0.84}" width="0.92" height="0.13" fill="#1d2a44"/><rect x="${x - 0.28}" y="${y - 1.3}" width="0.56" height="0.48" fill="#1d2a44"/><path d="M${x - 0.4} ${y - 0.06} h0.8" stroke="${k === 1 ? '#e2504a' : k === 2 ? '#3f9a5a' : '#f0a020'}" stroke-width="0.2" stroke-linecap="round"/><circle cx="${x - 0.15}" cy="${y - 0.5}" r="0.06" fill="#1d2a44"/><circle cx="${x + 0.15}" cy="${y - 0.5}" r="0.06" fill="#1d2a44"/><path d="M${x} ${y - 0.4} l${side * -0.3} 0.08 l${side * 0.3} 0.06 Z" fill="#f08a24"/><circle cx="${x}" cy="${y + 0.25}" r="0.06" fill="#1d2a44"/><circle cx="${x}" cy="${y + 0.52}" r="0.06" fill="#1d2a44"/></g>`,
    link: () => '',
  },
  quake: { // Ground: cacti along the sideline; a crack runs from one to the next in turn; dust rises
    track: (x, span, L) => `<line x1="${x}" y1="0" x2="${x}" y2="${span}" stroke="${L.colors[1]}" stroke-width="0.1" stroke-dasharray="0.6 0.5" opacity="0.6"/>`,
    marker: (x, y, k, side, yard, L) => `<g class="sfx-cactus" fill="none" stroke-linecap="round"><ellipse cx="${x}" cy="${y + 0.95}" rx="0.6" ry="0.15" fill="#000" stroke="none" opacity="0.16"/><path d="M${x} ${y + 0.9} V${y - 0.85} M${x - 0.55} ${y - 0.35} V${y + 0.2} H${x} M${x + 0.55} ${y - 0.6} V${y - 0.05} H${x}" stroke="#1f5a2c" stroke-width="0.5" stroke-linejoin="round"/><path d="M${x} ${y + 0.9} V${y - 0.85} M${x - 0.55} ${y - 0.35} V${y + 0.2} H${x} M${x + 0.55} ${y - 0.6} V${y - 0.05} H${x}" stroke="#4fa55a" stroke-width="0.3" stroke-linejoin="round"/><circle cx="${x + (k % 2 ? 0.55 : 0)}" cy="${y - (k % 2 ? 0.8 : 1.02)}" r="0.14" fill="${k === 2 ? '#ffd24a' : '#ff7fb0'}" stroke="none"/></g>`,
    link: (x, y, k, side, yard, L) => { const j = side * 0.3; return `<path class="sfx-vine sfx-anim" style="${turn(yard, side, 0.26)}" d="M${x} ${y - 1.1} l${-j} -1.8 ${j * 1.8} -2 ${-j * 1.6} -2 ${j * 0.8} -2" fill="none" stroke="#5e3d1e" stroke-width="0.18" stroke-linecap="round" stroke-linejoin="round"/><circle class="sfx-drift sfx-anim" style="animation-delay:-${(k * 1.1).toFixed(1)}s" cx="${x - side * 0.45}" cy="${y - 1.4}" r="0.2" fill="#c79a5c" opacity="0.8"/><circle class="sfx-drift sfx-anim" style="animation-delay:-${(k * 1.1 + 1.6).toFixed(1)}s" cx="${x + side * 0.3}" cy="${y - 3.4}" r="0.15" fill="#c79a5c" opacity="0.8"/>`; },
  },
  gust: { // Sky: flags on poles along the sideline wave in the wind (three strips, each a beat behind the last); a gust runs from one to the next; cloud puffs drift
    track: () => '',
    marker: (x, y, k, side, yard, L) => { const col = ['#ff6b5a', '#ffb13d', L.colors[1]][k % 3]; const px = x - side * 0.62; const strip = (i) => `<rect class="sfx-wave sfx-anim" style="--amp:${(0.07 + i * 0.07).toFixed(2)}px;animation-delay:-${(k * 0.21 + (2 - i) * 0.17).toFixed(2)}s" x="${Math.min(px + side * i * 0.44, px + side * (i + 1) * 0.44) - 0.02}" y="${y - 1.15}" width="0.48" height="${0.74 - i * 0.07}" fill="${col}"/>`; return `<ellipse cx="${px}" cy="${y + 0.95}" rx="0.36" ry="0.12" fill="#000" opacity="0.16"/>${strip(0)}${strip(1)}${strip(2)}<line x1="${px}" y1="${y + 0.95}" x2="${px}" y2="${y - 1.25}" stroke="#4a5666" stroke-width="0.15" stroke-linecap="round"/><circle cx="${px}" cy="${y - 1.3}" r="0.13" fill="#ffe08a"/>`; },
    link: (x, y, k, side, yard, L) => { const j = side * 0.5; return `<path class="sfx-vine sfx-anim" style="${turn(yard, side, 0.3)}" d="M${x} ${y - 1.5} q${-j} -2 0 -3.8 t0 -3.8" fill="none" stroke="${L.colors[1]}" stroke-width="0.2" stroke-linecap="round"/><ellipse class="sfx-drift sfx-anim" style="animation-delay:-${(k * 1.3 + (side > 0 ? 0.8 : 0)).toFixed(1)}s" cx="${x + side * 0.3}" cy="${y - 2.6}" rx="0.42" ry="0.18" fill="#9cc9ee"/>`; },
  },
  orbit: { // Oracle: orbs along the sideline, each with a star circling it; the constellation lights up link by link
    track: (x, span, L) => `<line x1="${x}" y1="0" x2="${x}" y2="${span}" stroke="${L.colors[1]}" stroke-width="0.1" stroke-dasharray="0.15 0.9" stroke-linecap="round"/>`,
    marker: (x, y, k, side, yard, L) => `<circle cx="${x}" cy="${y}" r="0.6" fill="#4a2382" stroke="${L.colors[0]}" stroke-width="0.12"/><circle class="sfx-node sfx-anim" style="animation-delay:-${k * 0.8}s" cx="${x - 0.12}" cy="${y - 0.14}" r="0.26" fill="${L.colors[0]}"/><circle class="sfx-orbit sfx-anim" style="animation-delay:-${k}s" cx="${x}" cy="${y}" r="0.13" fill="#7a3fd0"/>`,
    link: (x, y, k, side, yard, L) => `<path class="sfx-vine sfx-anim" style="${turn(yard, side, 0.3)}" d="M${x} ${y - 0.9} l${side * 0.4} -4.1 l${-side * 0.4} -4.1" fill="none" stroke="#b03fc0" stroke-width="0.2" stroke-linecap="round" stroke-linejoin="round"/><path class="sfx-firefly sfx-anim" style="animation-delay:-${(k * 1.7 + (side > 0 ? 0.9 : 0)).toFixed(1)}s" d="M${x + side * 0.4 - 0.26} ${y - 3} h0.52 m-0.26 -0.26 v0.52" fill="none" stroke="#7a3fd0" stroke-width="0.12" stroke-linecap="round"/>`,
  },
  cairn: { // Rock: stacked-stone towers along the sideline, still; now and then a pebble tumbles off one
    track: () => '',
    marker: (x, y, k, side, yard, L) => `<ellipse cx="${x}" cy="${y + 0.95}" rx="0.7" ry="0.16" fill="#000" opacity="0.18"/><ellipse cx="${x}" cy="${y + 0.6}" rx="0.72" ry="0.4" fill="${L.colors[1]}" stroke="#3c362e" stroke-width="0.1"/><ellipse cx="${x + 0.06}" cy="${y + 0.02}" rx="0.54" ry="0.32" fill="#968a79" stroke="#3c362e" stroke-width="0.1"/><ellipse cx="${x - 0.05}" cy="${y - 0.48}" rx="0.38" ry="0.25" fill="${L.colors[1]}" stroke="#3c362e" stroke-width="0.1"/><ellipse cx="${x + 0.03}" cy="${y - 0.86}" rx="0.22" ry="0.16" fill="${L.colors[0]}" stroke="#3c362e" stroke-width="0.09"/>`,
    link: (x, y, k, side, yard, L) => (k === 1 ? `<ellipse class="sfx-tumble sfx-anim" style="--dx:${-side * 0.7}px;animation-delay:-${(markerStep(yard) % 5 * 1.3).toFixed(1)}s" cx="${x}" cy="${y - 0.9}" rx="0.15" ry="0.11" fill="${L.colors[1]}" stroke="#3c362e" stroke-width="0.06"/>` : ''),
  },
  hive: { // Bug: beehive lanterns along the sideline light up in turn, each with a firefly circling it
    track: () => '',
    marker: (x, y, k, side, yard, L) => `<ellipse cx="${x}" cy="${y + 0.95}" rx="0.6" ry="0.14" fill="#000" opacity="0.16"/><path d="M${x} ${y - 0.95} C${x + 0.95} ${y - 0.85} ${x + 0.95} ${y + 0.9} ${x} ${y + 0.9} C${x - 0.95} ${y + 0.9} ${x - 0.95} ${y - 0.85} ${x} ${y - 0.95} Z" fill="#d99a1c" stroke="#6b4408" stroke-width="0.1"/><path d="M${x - 0.6} ${y - 0.45} h1.2 M${x - 0.7} ${y} h1.4 M${x - 0.62} ${y + 0.45} h1.24" stroke="#8a5a0c" stroke-width="0.1" fill="none"/><circle cx="${x}" cy="${y + 0.2}" r="0.2" fill="#2a1a04"/><path class="sfx-chain sfx-anim" style="${turn(yard, side, 0.26)}" d="M${x} ${y - 0.95} C${x + 0.95} ${y - 0.85} ${x + 0.95} ${y + 0.9} ${x} ${y + 0.9} C${x - 0.95} ${y + 0.9} ${x - 0.95} ${y - 0.85} ${x} ${y - 0.95} Z" fill="#fff3a8" opacity="0.85"/><circle class="sfx-orbit sfx-anim" style="animation-delay:-${k * 1.1}s" cx="${x}" cy="${y}" r="0.12" fill="#5d8a00"/>`,
    link: (x, y, k, side, yard, L) => `<circle class="sfx-firefly sfx-anim" style="animation-delay:-${(k * 1.7 + (side > 0 ? 0.9 : 0)).toFixed(1)}s" cx="${x + side * 0.35}" cy="${y - 3}" r="0.13" fill="#7a9a00"/>`,
  },
  grave: { // Specter: gravestones along the sideline; a pale wisp drifts from each stone toward the next, in turn
    track: () => '',
    marker: (x, y, k, side, yard, L) => `<ellipse cx="${x}" cy="${y + 0.95}" rx="0.7" ry="0.15" fill="#000" opacity="0.2"/><path d="M${x - 0.58} ${y + 0.9} V${y - 0.35} A0.58 0.58 0 0 1 ${x + 0.58} ${y - 0.35} V${y + 0.9} Z" fill="${k === 1 ? '#8f9aa0' : '#a4adb2'}" stroke="#39434a" stroke-width="0.11" stroke-linejoin="round"/>${k === 2 ? `<path d="M${x - 0.28} ${y - 0.15} h0.56 M${x - 0.28} ${y + 0.15} h0.56 M${x - 0.2} ${y + 0.45} h0.4" stroke="#39434a" stroke-width="0.08"/>` : `<path d="M${x} ${y - 0.5} v0.85 M${x - 0.28} ${y - 0.2} h0.56" stroke="#39434a" stroke-width="0.11" stroke-linecap="round"/>`}<path d="M${x - 0.58} ${y + 0.55} l0.3 -0.2 l0.25 0.25" stroke="#39434a" stroke-width="0.06" fill="none"/>`,
    link: (x, y, k, side, yard, L) => `<g class="sfx-wisp sfx-anim" style="${turn(yard, side, 0.4)}"><circle cx="${x}" cy="${y - 1.3}" r="0.3" fill="${L.colors[1]}" opacity="0.85"/><circle cx="${x}" cy="${y - 1.3}" r="0.14" fill="#eafff5"/><path d="M${x - 0.2} ${y - 1.05} q0.2 0.5 0 0.9 q0.3 -0.3 0.4 -0.9" fill="${L.colors[1]}" opacity="0.6"/></g>`,
  },
  pylon: { // Alloy: steel pylons along the sideline; their lights run up it in sequence, like a runway
    track: (x, span, L) => `<line x1="${x}" y1="0" x2="${x}" y2="${span}" stroke="#6b7486" stroke-width="0.16"/><line x1="${x}" y1="0" x2="${x}" y2="${span}" stroke="#dfe6f0" stroke-width="0.05"/>`,
    marker: (x, y, k, side, yard, L) => `<ellipse cx="${x}" cy="${y + 0.95}" rx="0.6" ry="0.14" fill="#000" opacity="0.18"/><rect x="${x - 0.62}" y="${y + 0.55}" width="1.24" height="0.36" rx="0.08" fill="#4a5262" stroke="#262c38" stroke-width="0.08"/><path d="M${x - 0.36} ${y + 0.55} L${x - 0.2} ${y - 0.75} H${x + 0.2} L${x + 0.36} ${y + 0.55} Z" fill="#aab3c4" stroke="#262c38" stroke-width="0.1" stroke-linejoin="round"/><path d="M${x - 0.3} ${y + 0.1} h0.6 M${x - 0.25} ${y - 0.3} h0.5" stroke="#f0b21c" stroke-width="0.14"/><circle cx="${x}" cy="${y - 0.95}" r="0.26" fill="#1c3a48" stroke="#262c38" stroke-width="0.08"/><circle class="sfx-chain sfx-anim" style="${turn(yard, side, 0.26)}" cx="${x}" cy="${y - 0.95}" r="0.36" fill="#19c2ff"/>`,
    link: () => '',
  },
  ropes: { // Clash: ring corner posts with padded tops, joined by ropes that twang in turn up the sideline
    track: () => '',
    marker: (x, y, k, side, yard, L) => `<ellipse cx="${x}" cy="${y + 0.95}" rx="0.55" ry="0.14" fill="#000" opacity="0.18"/><rect x="${x - 0.2}" y="${y - 0.5}" width="0.4" height="1.4" rx="0.1" fill="#3a3f4a" stroke="#1c1f26" stroke-width="0.08"/><rect x="${x - 0.42}" y="${y - 1.05}" width="0.84" height="0.7" rx="0.2" fill="${k === 1 ? '#3a6ad6' : L.colors[0]}" stroke="#1c1f26" stroke-width="0.09"/><rect x="${x - 0.28}" y="${y - 0.92}" width="0.56" height="0.16" rx="0.08" fill="#fff" opacity="0.5"/>`,
    link: (x, y, k, side, yard, L) => `<g class="sfx-twang sfx-anim" style="${turn(yard, side, 0.26)}"><path d="M${x - 0.26} ${y - 0.5} V${y - 9.5}" stroke="${L.colors[0]}" stroke-width="0.14" fill="none"/><path d="M${x} ${y - 0.5} V${y - 9.5}" stroke="#f4f4f4" stroke-width="0.14" fill="none"/><path d="M${x + 0.26} ${y - 0.5} V${y - 9.5}" stroke="#3a6ad6" stroke-width="0.14" fill="none"/></g>`,
  },
  cauldron: { // Corrupt: bubbling cauldrons along the sideline; a bubble rises and pops from each in turn
    track: () => '',
    marker: (x, y, k, side, yard, L) => `<ellipse cx="${x}" cy="${y + 0.95}" rx="0.7" ry="0.15" fill="#000" opacity="0.2"/><path d="M${x - 0.8} ${y - 0.1} Q${x - 0.85} ${y + 0.9} ${x} ${y + 0.9} Q${x + 0.85} ${y + 0.9} ${x + 0.8} ${y - 0.1} Z" fill="#23202b" stroke="#0e0c12" stroke-width="0.1"/><ellipse cx="${x}" cy="${y - 0.1}" rx="0.8" ry="0.3" fill="#3a3544" stroke="#0e0c12" stroke-width="0.1"/><ellipse cx="${x}" cy="${y - 0.1}" rx="0.62" ry="0.2" fill="#58c81e"/><circle class="sfx-node sfx-anim" style="animation-delay:-${k * 0.7}s" cx="${x - 0.2}" cy="${y - 0.12}" r="0.12" fill="#c8ff8a"/><circle class="sfx-shot sfx-anim" style="${turn(yard, side, 0.36)}" cx="${x + 0.1}" cy="${y - 0.3}" r="0.26" fill="#7fe03a" stroke="#2f7a10" stroke-width="0.08" fill-opacity="0.8"/>`,
    link: (x, y, k, side, yard, L) => `<circle class="sfx-drift sfx-anim" style="animation-delay:-${(k * 1.2 + (side > 0 ? 0.7 : 0)).toFixed(1)}s" cx="${x - side * 0.3}" cy="${y - 1.2}" r="0.12" fill="none" stroke="#3f9a16" stroke-width="0.07"/>`,
  },
  eggs: { // Wyrm: dragon eggs in nests along the sideline; each rocks in turn and lets off a puff of smoke
    track: () => '',
    marker: (x, y, k, side, yard, L) => { const spot = k === 1 ? L.colors[1] : '#c0394b'; return `<ellipse cx="${x}" cy="${y + 0.7}" rx="0.85" ry="0.34" fill="#6b4a2a" stroke="#3a2614" stroke-width="0.1"/><path d="M${x - 0.8} ${y + 0.62} l0.3 -0.22 l0.3 0.2 l0.3 -0.22 l0.3 0.2 l0.3 -0.2" stroke="#3a2614" stroke-width="0.07" fill="none"/><g class="sfx-rock sfx-anim" style="${turn(yard, side, 0.3)}"><path d="M${x} ${y - 0.95} C${x + 0.75} ${y - 0.7} ${x + 0.7} ${y + 0.6} ${x} ${y + 0.62} C${x - 0.7} ${y + 0.6} ${x - 0.75} ${y - 0.7} ${x} ${y - 0.95} Z" fill="#efe6d2" stroke="#3a2a22" stroke-width="0.1"/><circle cx="${x - 0.2}" cy="${y - 0.3}" r="0.15" fill="${spot}"/><circle cx="${x + 0.24}" cy="${y + 0.05}" r="0.12" fill="${spot}"/><circle cx="${x - 0.05}" cy="${y + 0.32}" r="0.09" fill="${spot}"/></g>`; },
    link: (x, y, k, side, yard, L) => `<circle class="sfx-drift sfx-anim" style="animation-delay:-${(k * 1.2 + (side > 0 ? 0.6 : 0)).toFixed(1)}s" cx="${x + side * 0.1}" cy="${y - 1.2}" r="0.2" fill="#8a8590" opacity="0.7"/>`,
  },
  lantern: { // Umbral: dim lanterns along the sideline go dark and relight in turn, so a patch of shadow travels up it
    track: () => '',
    marker: (x, y, k, side, yard, L) => `<ellipse cx="${x}" cy="${y + 0.95}" rx="0.5" ry="0.13" fill="#000" opacity="0.2"/><rect x="${x - 0.1}" y="${y - 0.2}" width="0.2" height="1.15" fill="#1c1626"/><rect x="${x - 0.42}" y="${y - 1}" width="0.84" height="0.84" rx="0.14" fill="#1c1626" stroke="#0c0912" stroke-width="0.08"/><rect x="${x - 0.28}" y="${y - 0.86}" width="0.56" height="0.56" rx="0.08" fill="#3a2f55"/><g class="sfx-dim sfx-anim" style="${turn(yard, side, 0.4)}"><circle cx="${x}" cy="${y - 0.58}" r="0.85" fill="${L.colors[0]}" opacity="0.35"/><rect x="${x - 0.28}" y="${y - 0.86}" width="0.56" height="0.56" rx="0.08" fill="${L.colors[2]}"/></g>`,
    link: () => '',
  },
  sundial: { // Radiant: golden sundials along the sideline; their shadows swing round together as the sun crosses; motes of light rise
    track: () => '',
    marker: (x, y, k, side, yard, L) => `<ellipse cx="${x}" cy="${y + 0.12}" rx="0.92" ry="0.92" fill="#000" opacity="0.14"/><circle cx="${x}" cy="${y}" r="0.86" fill="${L.colors[0]}" stroke="#8a5a0c" stroke-width="0.12"/><circle cx="${x}" cy="${y}" r="0.62" fill="#ffe89a" stroke="#c98a1c" stroke-width="0.06"/><path d="M${x} ${y - 0.62} v0.16 M${x} ${y + 0.46} v0.16 M${x - 0.62} ${y} h0.16 M${x + 0.46} ${y} h0.16 M${x - 0.44} ${y - 0.44} l0.1 0.1 M${x + 0.34} ${y - 0.34} l0.1 -0.1 M${x - 0.44} ${y + 0.44} l0.1 -0.1 M${x + 0.34} ${y + 0.34} l0.1 0.1" stroke="#8a5a0c" stroke-width="0.07" stroke-linecap="round"/><g class="sfx-dial sfx-anim"><circle cx="${x}" cy="${y}" r="0.86" fill="none"/><path d="M${x - 0.07} ${y} L${x} ${y - 0.6} L${x + 0.07} ${y} Z" fill="#5a3a08" opacity="0.75"/></g><circle cx="${x}" cy="${y}" r="0.13" fill="#8a5a0c"/><circle cx="${x - 0.03}" cy="${y - 0.03}" r="0.05" fill="#fff6d0"/>`,
    link: (x, y, k, side, yard, L) => `<circle class="sfx-drift sfx-anim" style="animation-delay:-${(k * 1.2 + (side > 0 ? 0.7 : 0)).toFixed(1)}s" cx="${x - side * 0.3}" cy="${y - 2.2}" r="0.14" fill="${L.colors[1]}"/><path class="sfx-firefly sfx-anim" style="animation-delay:-${(k * 1.7 + (side > 0 ? 0.9 : 0)).toFixed(1)}s" d="M${x + side * 0.35 - 0.24} ${y - 3.6} h0.48 m-0.24 -0.24 v0.48" fill="none" stroke="${L.colors[1]}" stroke-width="0.11" stroke-linecap="round"/>`,
  },
};
/** Everything a look puts along both sidelines for the visible stretch of field ('' for a stadium without a look). */
export function edgeSvg(envId, cam, HW, Y, span) {
  const L = lookFor(envId); const E = L && EDGES[L.edge]; if (!E) return '';
  const out = [];
  const b = fieldBorder(); // with the white paint around the field, the markers stand on the white, not on the grass
  for (const side of [-1, 1]) { const x = side * (b ? HW + b / 2 : HW - 0.45); out.push(E.track(x, span, L));
    for (const yard of markerYards(cam)) { // both sidelines at the same yard: halfway between the numbers
      const y = Y(yard); const k = (markerStep(yard) + (side > 0 ? 1 : 0)) % 3;
      if (yard + MARKER_GAP <= 95) out.push(E.link(x, y, k, side, yard, L));
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
  else if (L.posts === 'web') extra = `<g stroke="#f4f4ea" stroke-width="0.07" opacity="0.9"><path d="M-3 ${y} L3 ${tip} M3 ${y} L-3 ${tip} M0 ${y} V${tip} M-3 ${(y + tip) / 2} H3"/><path d="M-1 ${y - dir * 0.8} L0 ${y - dir * 0.6} L1 ${y - dir * 0.8} L1.2 ${y - dir * 1.2} L1 ${y - dir * 1.6} L0 ${y - dir * 1.8} L-1 ${y - dir * 1.6} L-1.2 ${y - dir * 1.2} Z M-2 ${y - dir * 0.4} L0 ${y - dir * 0.1} L2 ${y - dir * 0.4} L2.5 ${y - dir * 1.2} L2 ${y - dir * 2} L0 ${y - dir * 2.3} L-2 ${y - dir * 2} L-2.5 ${y - dir * 1.2} Z"/></g><circle class="sfx-node sfx-anim" cx="0" cy="${y - dir * 1.2}" r="0.2" fill="#fff6c9" stroke="none"/>`;
  else if (L.posts === 'beacon') extra = [-3, 3].map((px, i) => `<circle cx="${px}" cy="${tip}" r="0.3" fill="#1c3a48" stroke="#262c38" stroke-width="0.08"/><circle class="sfx-chain sfx-anim" style="animation-delay:-${i * 0.9}s" cx="${px}" cy="${tip}" r="0.42" fill="#ff5a4a" stroke="none"/>`).join('');
  else if (L.posts === 'pads') extra = [-3, 3].map((px, i) => `<rect x="${px - 0.42}" y="${Math.min(y, y - dir * 1.3)}" width="0.84" height="1.3" rx="0.3" fill="${i ? '#3a6ad6' : a}" stroke="#1c1f26" stroke-width="0.08"/><circle class="sfx-node sfx-anim" style="animation-delay:-${i * 0.9}s" cx="${px}" cy="${tip}" r="0.3" fill="${b}" stroke="none"/>`).join('');
  else if (L.posts === 'drip') extra = `${[-2.3, -1.2, 0.1, 1.1, 2.2].map((px, i) => `<path d="M${px - 0.18} ${y} q0.18 ${dir * (0.9 + (i % 3) * 0.3)} 0.36 0 Z" fill="#58c81e" stroke="none"/>`).join('')}${[-1.2, 1.1].map((px, i) => `<circle class="sfx-drift sfx-anim" style="animation-delay:-${i * 1.5}s" cx="${px}" cy="${y - dir * 0.6}" r="0.14" fill="none" stroke="#7fe03a" stroke-width="0.08"/>`).join('')}`;
  else if (L.posts === 'sunburst') { const cy = y - dir * 1.3; extra = `<g class="sfx-turn sfx-anim"><circle cx="0" cy="${cy}" r="1.25" fill="none" stroke="none"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((d, i) => `<path d="M0 ${cy - 0.62} L${i % 2 ? 0.1 : 0.14} ${cy - (i % 2 ? 0.95 : 1.22)} L${i % 2 ? -0.1 : -0.14} ${cy - (i % 2 ? 0.95 : 1.22)} Z" fill="${i % 2 ? b : a}" stroke="none" transform="rotate(${d} 0 ${cy})"/>`).join('')}</g><circle cx="0" cy="${cy}" r="0.52" fill="${a}" stroke="#8a5a0c" stroke-width="0.08"/><circle class="sfx-node sfx-anim" cx="-0.12" cy="${cy - 0.12}" r="0.2" fill="${c}" stroke="none"/>${[-3, 3].map((px, i) => `<path class="sfx-node sfx-anim" style="animation-delay:-${i * 0.9}s" d="M${px - 0.3} ${tip} h0.6 M${px} ${tip - 0.3} v0.6" stroke="${c}" stroke-width="0.12" stroke-linecap="round"/>`).join('')}`; }
  else if (L.posts === 'moon') extra = `<path class="sfx-node sfx-anim" d="M0.5 ${y - dir * 1.9} a0.8 0.8 0 1 0 0 1.4 a0.58 0.58 0 1 1 0 -1.4 Z" fill="${c}" stroke="none"/>`;
  const tips = L.posts === 'flame' || L.posts === 'icicle' || L.posts === 'beacon' || L.posts === 'pads' ? '' : `<circle cx="-3" cy="${tip}" r="0.3" fill="${c}" stroke="none"/><circle cx="3" cy="${tip}" r="0.3" fill="${c}" stroke="none"/>`;
  return `<g class="sfx-post" fill="none"><path class="sfx-post-glow sfx-anim" d="${shape}" stroke="${a}" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round"/><path d="${shape}" stroke="#ffd84a" stroke-width="0.45" stroke-linecap="round" stroke-linejoin="round"/>${extra}${tips}</g>`;
}

/**
 * The stand behind the far end zone, drawn with the field (it does not follow the camera: it comes into view as play nears the
 * end zone). Three rows of the generated crowd, the two "arms up" layers for celebrations, and the stadium's rail in front.
 * `y0` is the svg y of the back of the stand, `x0`/`w` its left edge and width, all in yards.
 */
export function standSvg(venue, x0, y0, w, stand = 'far') {
  const look = venueLook(venue); if (!look || !scene) return '';
  const d = STANDS_ROWS; const [a, b] = look.colors; const img = scene.crowd ? crowdImages({ ...scene.crowd, stand }) : null;
  if (stand === 'near') { // behind the near end zone (owner 2026-11-24: fans, not a bare wall): the fans seen from behind, the rail on the field side
    const pic = (cls, u) => (u ? `<image class="${cls}" href="${u}" x="${x0}" y="${y0 + 0.5}" width="${w}" height="${d - 0.5}" preserveAspectRatio="none" style="image-rendering:pixelated"/>` : '');
    return `<g class="sfx-stand sfx-stand-near"><rect x="${x0}" y="${y0}" width="${w}" height="${d}" fill="#10151d"/>${pic('sfx-crowd-img', img?.base)}${pic('sfx-cheer sfx-cheer-home', img?.home)}${pic('sfx-cheer sfx-cheer-away', img?.away)}<rect x="${x0}" y="${y0}" width="${w}" height="0.5" fill="#0c1430"/><line class="sfx-channel sfx-anim" x1="${x0}" y1="${y0 + 0.25}" x2="${x0 + w}" y2="${y0 + 0.25}" stroke="${a}" stroke-width="0.22" stroke-dasharray="2.5 2"/></g>`;
  }
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
  const look = venueLook(venue); if (!look || !scene) return '';
  const col = scene.crowd?.homeColor || look.colors[1]; let seams = '';
  for (let x = x0 + 3; x < x0 + w - 0.5; x += 3) seams += `M${x.toFixed(2)} ${y0} v${h}`;
  const cap = fans < 0 ? y0 : y0 + h - 0.16, foot = fans < 0 ? y0 + h - 0.14 : y0;
  return `<g class="sfx-barrier"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${col}"/><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#000" opacity="0.38"/><path d="${seams}" stroke="#000" stroke-width="0.1" opacity="0.45"/><rect x="${x0}" y="${cap}" width="${w}" height="0.16" fill="#fff" opacity="0.6"/><rect x="${x0}" y="${foot}" width="${w}" height="0.14" fill="#000" opacity="0.35"/></g>`;
}
/** Yards of green sideline between the white paint and the side stands (owner 2026-11-25: as in a real stadium, the team area). */
export const SIDE_GRASS = 6;
/** How far past the white the picture reaches on each side when zoomed right out: the green sideline, the barrier, then the side stand. */
export const SIDE_REACH = SIDE_GRASS + STANDS_BARRIER + STANDS_ROWS;
/**
 * The stands along both sidelines, seen only in the zoomed-out view. Grass, the barrier in the home colour, then three rows of
 * the generated crowd turned to face the field. Returns { svg, symbols } (the crowd pictures are drawn once into the field's
 * <defs> and placed with <use>, so the zooming camera does not carry them in every frame), or null when there is nothing to draw.
 */
export function sideStandsSvg(venue, cam, HW, Y) {
  const look = venueLook(venue); const env = fieldOf(venue?.env); if (!look || !env || !scene) return null;
  const b = FIELD_BORDER, top = 110 + STANDS_GAP, bot = -10 - STANDS_GAP; if (cam.top <= bot || cam.bottom >= top) return null; // a little past each end line, so the corners are closed
  const y0 = Y(top), len = top - bot, half = len / 2; const col = scene.crowd?.homeColor || look.colors[1];
  const symbols = []; let s = '';
  for (const side of [-1, 1]) {
    const edge = side * (HW + b); const x = (from, w) => (side > 0 ? edge + from : edge - from - w); // `from` yards out from the white
    // The sideline: the field's own green, a shade darker, all the way to the barrier (never the region's ground: owner 2026-11-25).
    s += `<rect x="${x(0, SIDE_GRASS)}" y="${y0}" width="${SIDE_GRASS}" height="${len}" fill="${env.palette.b || env.palette.a}"/><rect x="${x(0, SIDE_GRASS)}" y="${y0}" width="${SIDE_GRASS}" height="${len}" fill="#000" opacity="0.14"/>`;
    const bx = x(SIDE_GRASS, STANDS_BARRIER); let seams = ''; for (let yy = y0 + 3; yy < y0 + len - 0.5; yy += 3) seams += `M${bx} ${yy.toFixed(2)} h${STANDS_BARRIER}`;
    s += `<rect x="${bx}" y="${y0}" width="${STANDS_BARRIER}" height="${len}" fill="${col}"/><rect x="${bx}" y="${y0}" width="${STANDS_BARRIER}" height="${len}" fill="#000" opacity="0.38"/><path d="${seams}" stroke="#000" stroke-width="0.1" opacity="0.45"/>`;
    const sx = x(SIDE_GRASS + STANDS_BARRIER, STANDS_ROWS); s += `<rect x="${sx}" y="${y0}" width="${STANDS_ROWS}" height="${len}" fill="#10151d"/>`;
    for (const seg of [0, 1]) {
      // The fans stand upright in three columns, the front row nearest the field (stadium-crowd.js draws the picture that way).
      const img = scene.crowd ? crowdImages({ ...scene.crowd, stand: `${side < 0 ? 'left' : 'right'}${seg}`, side: side < 0 ? 'left' : 'right' }) : null; if (!img?.base) continue;
      for (const [k, cls] of [['base', 'sfx-crowd-img'], ['home', 'sfx-cheer sfx-cheer-home'], ['away', 'sfx-cheer sfx-cheer-away']]) {
        if (!img[k]) continue; const id = `sfx-cr-${scene.crowd.seed}-${side < 0 ? 'l' : 'r'}${seg}-${k}`.replace(/[^\w-]/g, '');
        symbols.push({ id, symbol: `<image id="${id}" href="${img[k]}" width="${STANDS_ROWS}" height="${half}" preserveAspectRatio="none" style="image-rendering:pixelated"/>` });
        s += `<use class="${cls}" href="#${id}" x="${sx}" y="${y0 + half * seg}"/>`;
      }
    }
  }
  return { svg: `<g class="sfx-stand sfx-stand-side">${s}</g>`, symbols };
}
/** The grass between an end line and the stand or wall behind it: the field's own green, a shade darker, like the sidelines (owner 2026-11-25). */
export function apronSvg(venue, x0, y0, w, h) {
  const env = fieldOf(venue?.env); if (!env || !scene) return '';
  return `<g class="sfx-apron"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${env.palette.b || env.palette.a}"/><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#000" opacity="0.14"/></g>`;
}
/** Behind the near end zone there is no stand in view: the stadium's wall and rail close the picture. */
export function wallSvg(venue, x0, y0, w) {
  const look = venueLook(venue); if (!look || !scene) return '';
  const d = STANDS_ROWS; const [a] = look.colors;
  if (look.club) return homeWallSvg(look, x0, y0, w, d);
  return `<g class="sfx-wall"><rect x="${x0}" y="${y0}" width="${w}" height="${d}" fill="#0d1320"/><rect x="${x0}" y="${y0}" width="${w}" height="0.5" fill="#0c1430"/><line class="sfx-channel sfx-anim" x1="${x0}" y1="${y0 + 0.25}" x2="${x0 + w}" y2="${y0 + 0.25}" stroke="${a}" stroke-width="0.22" stroke-dasharray="2.5 2"/>${[0.18, 0.5, 0.82].map((k) => `<rect x="${x0 + w * k - 3}" y="${y0 + 1.4}" width="6" height="${d - 2}" rx="0.4" fill="#141c30" stroke="#26335a" stroke-width="0.12"/>`).join('')}</g>`;
}
/**
 * The bowl (owner 2026-11-24): stadiums are built round the field, so wherever the field's picture leaves room in its box (beside the
 * side stands when zoomed out, above and below the ends) there are seats: the crowd repeated (empty seats where the game did not sell
 * out), drawn in yards under everything else so it zooms with the camera, with the same arms-up layers so it cheers with the stands.
 * The field's svg shows it past its viewBox (overflow visible). `VW` is the picture's half width, `top` the svg y of the far stand's
 * back (the rows line up with it). '' without a crowd.
 */
export const BOWL_W = 59, BOWL_H = STANDS_ROWS - 0.5; // one tile: the far stand's picture (37 seats, three rows) at its own size
/** The bowl's seat patterns, once per game: [{ id, symbol }] for the field's <defs> ([] without a crowd). */
export function bowlDefs() {
  const img = scene?.crowd ? crowdImages({ ...scene.crowd, stand: 'bowl' }) : null; if (!img?.base) return [];
  const pat = (k, u) => ({ id: `sfx-bowl-${k}-${scene.crowd.seed}`.replace(/[^\w-]/g, ''), symbol: `<pattern id="${`sfx-bowl-${k}-${scene.crowd.seed}`.replace(/[^\w-]/g, '')}" patternUnits="userSpaceOnUse" width="${BOWL_W}" height="${BOWL_H}"><image href="${u}" width="${BOWL_W}" height="${BOWL_H}" preserveAspectRatio="none" style="image-rendering:pixelated"/></pattern>` });
  return [pat('base', img.base), ...(img.home ? [pat('home', img.home)] : []), ...(img.away ? [pat('away', img.away)] : [])];
}
/** The bowl's seats for one camera (the patterns are bowlDefs): rows lined up with the far stand's back at svg y `top`. */
export function bowlSvg(VW, span, top) {
  const defs = bowlDefs(); if (!defs.length) return '';
  // Beside the picture only (owner 2026-11-24): fans above or below it stood in the middle of the field. The ends show their stands
  // when the camera reaches them, and the field fills the box top to bottom (field-view.js setFieldSpan).
  const shiftN = ((top % BOWL_H) + BOWL_H) % BOWL_H; const R = 90, x = -VW - R, y = -shiftN, w = (VW + R) * 2, h = span; const shift = shiftN.toFixed(2);
  const rect = (id, cls = '') => `<rect${cls ? ` class="${cls}"` : ''} x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="url(#${id})"/>`;
  const [base, home, away] = defs;
  return `<g class="sfx-stand sfx-bowl" transform="translate(0 ${shift})"><rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="#10151d"/>${rect(base.id)}${home ? rect(home.id, 'sfx-cheer sfx-cheer-home') : ''}${away ? rect(away.id, 'sfx-cheer sfx-cheer-away') : ''}<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="#060a10" opacity="0.36"/></g>`;
}
/**
 * The surround for a venue: the edge light that reactions use and the lap of energy for the biggest moments. '' for a stadium
 * without a look.
 */
export function surroundHtml(venue) {
  const look = venueLook(venue); if (!look) return '';
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
  const B = FOOTBALL;
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
    // Rock: a boulder drops between the captains, cracks and crumbles apart
    boulder: `<svg class="sfx-cube sfx-cube-l" viewBox="0 0 50 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M14 30 L34 8 L66 6 L90 28 L94 62 L76 90 L40 94 L10 72 Z" fill="${b}" stroke="#3c362e" stroke-width="3" stroke-linejoin="round"/><path d="M34 8 L66 6 L58 34 L30 40 Z" fill="${a}"/><path d="M58 34 L90 28 L94 62 L64 60 Z" fill="#968a79"/><path d="M30 40 L58 34 L64 60 L40 94 L10 72 Z" fill="none" stroke="#3c362e" stroke-width="1.5"/></svg><svg class="sfx-cube sfx-cube-r" viewBox="50 0 50 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M14 30 L34 8 L66 6 L90 28 L94 62 L76 90 L40 94 L10 72 Z" fill="${b}" stroke="#3c362e" stroke-width="3" stroke-linejoin="round"/><path d="M34 8 L66 6 L58 34 L30 40 Z" fill="${a}"/><path d="M58 34 L90 28 L94 62 L64 60 Z" fill="#968a79"/><path d="M30 40 L58 34 L64 60 L40 94 L10 72 Z" fill="none" stroke="#3c362e" stroke-width="1.5"/></svg><svg class="sfx-crack" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M50 4 L44 22 L56 38 L46 54 L57 70 L49 96 M56 38 L72 30 M46 54 L28 62" fill="none" stroke="#1c1814" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/></svg>`,
    // Bug: a web is spun above the field; a thread of silk lowers the football from it, sets it down, and winds back up
    web: `<svg class="sfx-web" viewBox="-60 0 120 70" aria-hidden="true" focusable="false"><g fill="none" stroke="#f4f4ea" stroke-width="1.3" stroke-linecap="round" opacity=".92"><path d="M0 0 L-58 22 M0 0 L-42 50 M0 0 L-16 66 M0 0 L16 66 M0 0 L42 50 M0 0 L58 22"/><path d="M-20 8 Q-14 16 -15 18 Q-8 22 -6 24 Q0 24 6 24 Q8 22 15 18 Q14 16 20 8 M-38 14 Q-30 30 -28 33 Q-16 42 -11 44 Q0 46 11 44 Q16 42 28 33 Q30 30 38 14 M-52 20 Q-44 44 -39 46 Q-22 58 -15 62 Q0 64 15 62 Q22 58 39 46 Q44 44 52 20"/></g></svg><div class="sfx-silk"><i></i><svg viewBox="0 0 60 30" aria-hidden="true" focusable="false"><ellipse class="sfx-carry" cx="30" cy="16" rx="${(B.rx * 8).toFixed(1)}" ry="${(B.ry * 8).toFixed(1)}" fill="${B.fill}" stroke="${B.stroke}" stroke-width="1.4"/><path class="sfx-carry" d="M30 0 V10 M22 12 Q30 6 38 12 M21 17 Q30 24 39 17 M26 11 L27 21 M34 11 L33 21" fill="none" stroke="#f4f4ea" stroke-width="1.1" stroke-linecap="round"/></svg></div>`,
    // Specter: nothing arrives; the football simply fades into being, flickering like a ghost
    fade: `<i class="sfx-mist"></i>`,
    // Alloy: a steel hatch slides open in the field, the football rises on a lift, and the hatch shuts
    hatch: `<div class="sfx-hatch"><i class="sfx-door sfx-door-l"></i><i class="sfx-door sfx-door-r"></i></div>`,
    // Clash: the bell rings and a championship belt drops in; it pops open and the football is where the buckle was
    belt: `<svg class="sfx-bell" viewBox="0 0 44 48" aria-hidden="true" focusable="false"><path d="M22 4 C10 4 8 18 6 32 H38 C36 18 34 4 22 4 Z" fill="${b}" stroke="#8a5a0c" stroke-width="2.4" stroke-linejoin="round"/><rect x="3" y="31" width="38" height="5" rx="2.5" fill="${b}" stroke="#8a5a0c" stroke-width="2"/><circle cx="22" cy="41" r="4" fill="#8a5a0c"/><path d="M12 12 q-2 8 -3 14" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/></svg><svg class="sfx-belt sfx-belt-l" viewBox="0 0 70 52" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect x="2" y="14" width="136" height="24" rx="6" fill="${a}" stroke="#5a1a14" stroke-width="2.5"/><path d="M12 20 h18 M12 32 h18 M110 20 h18 M110 32 h18" stroke="${b}" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="70" cy="26" rx="30" ry="24" fill="${b}" stroke="#8a5a0c" stroke-width="3"/><ellipse cx="70" cy="26" rx="21" ry="16" fill="none" stroke="#8a5a0c" stroke-width="2"/><circle cx="47" cy="26" r="3" fill="${a}"/><circle cx="93" cy="26" r="3" fill="${a}"/></svg><svg class="sfx-belt sfx-belt-r" viewBox="70 0 70 52" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect x="2" y="14" width="136" height="24" rx="6" fill="${a}" stroke="#5a1a14" stroke-width="2.5"/><path d="M12 20 h18 M12 32 h18 M110 20 h18 M110 32 h18" stroke="${b}" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="70" cy="26" rx="30" ry="24" fill="${b}" stroke="#8a5a0c" stroke-width="3"/><ellipse cx="70" cy="26" rx="21" ry="16" fill="none" stroke="#8a5a0c" stroke-width="2"/><circle cx="47" cy="26" r="3" fill="${a}"/><circle cx="93" cy="26" r="3" fill="${a}"/></svg>`,
    // Corrupt: a puddle of green goo spreads, the football bubbles up out of it, and the goo drains away
    goo: `<svg class="sfx-pit" viewBox="-60 -40 120 80" aria-hidden="true" focusable="false"><path d="M-54 2 C-58 -18 -34 -30 -18 -26 C-8 -38 16 -36 24 -26 C44 -32 60 -12 52 4 C60 20 40 32 24 26 C12 38 -14 36 -22 26 C-42 34 -58 20 -54 2 Z" fill="#2f7a10"/><path d="M-44 2 C-48 -14 -28 -22 -14 -19 C-6 -29 14 -27 20 -19 C36 -24 48 -9 42 3 C48 16 32 25 20 20 C10 29 -10 28 -17 20 C-33 26 -47 16 -44 2 Z" fill="${a}"/><circle cx="-22" cy="-6" r="5" fill="${c}" opacity=".7"/><circle cx="24" cy="8" r="3.5" fill="${c}" opacity=".7"/><circle cx="6" cy="-14" r="2.5" fill="${c}" opacity=".7"/></svg>`,
    // Wyrm: from somewhere above, a jet of dragon fire strikes midfield; when it clears the football is there, still glowing
    firebreath: `<i class="sfx-breath"></i>`,
    // Umbral: the field goes dark like an eclipse; one moonbeam lands on midfield with the football in it
    eclipse: `<i class="sfx-dark"></i><i class="sfx-moonbeam"></i>`,
    // Radiant: dawn breaks across the field from one sideline to the other, and the football is revealed as the light passes
    sunrise: `<i class="sfx-warm"></i><i class="sfx-dawn"></i>`,
    // Grass: leaves swirl up and open
    bloom: `<svg class="sfx-swirl" viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">${Array.from({ length: 10 }, (_, i) => `<ellipse cx="0" cy="-30" rx="6" ry="14" fill="${i % 2 ? a : b}" opacity=".9" transform="rotate(${i * 36})"/>`).join('')}<circle r="12" fill="none" stroke="${c}" stroke-width="2"/></svg>`,
  };
  const bolt = R[look.reveal] || R.bolt;
  // The game's own football: same shape, colour and outline as on the field, at the field's scale (--sfx-yd = pixels per yard).
  const ball = `<svg class="sfx-ball" viewBox="${-B.rx - 0.2} ${-B.ry - 0.2} ${(B.rx + 0.2) * 2} ${(B.ry + 0.2) * 2}" style="width:calc(var(--sfx-yd, 8px) * ${(B.rx + 0.2) * 2})" aria-hidden="true" focusable="false"><ellipse rx="${B.rx}" ry="${B.ry}" fill="${B.fill}" stroke="${B.stroke}" stroke-width="${B.strokeWidth}"/></svg>`;
  return `<div class="sfx-reveal sfx-reveal-${look.reveal} ${level === 'reduced' ? 'sfx-reveal-simple' : ''}" style="--sfx-a:${a};--sfx-b:${b};--sfx-c:${c}" role="button" aria-label="Skip">${level === 'reduced' ? '' : `<i class="sfx-whiteout"></i>${bolt}`}<i class="sfx-ring"></i>${ball}<span class="sfx-skip">Tap to skip</span></div>`;
}
/** The kickoff name plate: the stadium, its kind and its line. */
export function introPlateHtml(venue, esc = (s) => s) {
  const look = lookFor(venue?.env); const env = fieldOf(venue?.env); if (!look || !env) return '';
  return `<div class="sfx-plate"><b>${esc(venue.name || env.name)}</b><span>${esc(STADIUM_VARIANTS[venue?.variant]?.intro || look.intro)}</span></div>`;
}

// ---------------------------------------------------------------- the plain home fields of the twenty clubs without a Gym Leader
// Region and club, around the field only (the playing surface is grass for all twenty; the ground around it is green too): the
// markers along the sidelines, and the wall behind the near end zone with the club's banners and logo. Static
// shapes in the club's colours: no animation, so the Stadium Effects setting has nothing to slow down here, and all of it is
// drawn the same at Full, Reduced and Off.
/** The wall behind the near end zone of a plain home field: the club's colours, its logo in the middle and two banners. */
function homeWallSvg(L, x0, y0, w, d) {
  const [P, S, A] = L.colors; const logo = teamLogoSymbol(L.club); const cx = x0 + w / 2; const bw = 7, bh = d - 1.8; let banners = '';
  for (const k of [0.2, 0.8]) {
    const bx = x0 + w * k - bw / 2, by = y0 + 1.2; const pat = L.banner === 'stripes' ? `<path d="M${bx} ${by + bh * 0.35}h${bw}M${bx} ${by + bh * 0.65}h${bw}" stroke="${A}" stroke-width="0.35"/>`
      : L.banner === 'chevron' ? `<path d="M${bx} ${by + bh * 0.3} l${bw / 2} ${bh * 0.3} l${bw / 2} ${-bh * 0.3}" fill="none" stroke="${A}" stroke-width="0.45"/>`
      : L.banner === 'split' ? `<rect x="${bx + bw / 2}" y="${by}" width="${bw / 2}" height="${bh}" fill="${S}"/>` : `<path d="M${bx + bw / 2} ${by + 0.4} l${bw * 0.3} ${bh / 2 - 0.4} l${-bw * 0.3} ${bh / 2 - 0.4} l${-bw * 0.3} ${-(bh / 2 - 0.4)} Z" fill="${A}" opacity="0.85"/>`;
    banners += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="0.3" fill="${P}" stroke="${A}" stroke-width="0.14"/>${pat}`;
  }
  return `<g class="sfx-wall sfx-wall-home"><defs>${logo.symbol}</defs><rect x="${x0}" y="${y0}" width="${w}" height="${d}" fill="${S}"/><rect x="${x0}" y="${y0}" width="${w}" height="${d}" fill="#000" opacity="0.35"/><rect x="${x0}" y="${y0}" width="${w}" height="0.5" fill="${P}"/><rect x="${x0}" y="${y0 + 0.5}" width="${w}" height="0.16" fill="${A}"/>${banners}<use href="#${logo.id}" x="${cx - (d - 1.4) / 2}" y="${y0 + 0.9}" width="${d - 1.4}" height="${d - 1.4}"/></g>`;
}
