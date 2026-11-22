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
});
export const lookFor = (envId) => (Object.hasOwn(LOOKS, envId) ? LOOKS[envId] : null);

/**
 * The stadium scene for the game on screen: how far behind each end line the picture reaches (the stands) and the crowd that
 * sits there. Set by the match screen while a game in a stadium with a look is shown, cleared when it leaves. The field camera
 * and the field drawing read it, so every overlay that uses the camera agrees with the picture. Null: the field ends at the
 * end line, exactly as before.
 */
let scene = null;
export const STANDS_DEPTH = 6; // yards behind the end line: three rows of two yards
export function setStadiumScene(venue, crowd = null) { scene = lookFor(venue?.env) ? { env: venue.env, depth: STANDS_DEPTH, crowd } : null; return scene; }
export const stadiumScene = () => scene;
export const standsDepth = () => scene?.depth || 0;
/** The football as the field draws it on the ground (field-view.js uses the same numbers), in yards. */
export const FOOTBALL = Object.freeze({ rx: 0.7, ry: 0.45, fill: '#d9924f', stroke: '#fff', strokeWidth: 0.18 });

/**
 * The stand behind the far end zone, drawn with the field (it does not follow the camera: it comes into view as play nears the
 * end zone). Three rows of the generated crowd, the two "arms up" layers for celebrations, and the stadium's rail in front.
 * `y0` is the svg y of the back of the stand, `x0`/`w` its left edge and width, all in yards.
 */
export function standSvg(venue, x0, y0, w) {
  const look = lookFor(venue?.env); if (!look || !scene) return '';
  const d = scene.depth; const [a, b] = look.colors; const img = scene.crowd ? crowdImages({ ...scene.crowd, stand: 'far' }) : null;
  const pic = (cls, u) => (u ? `<image class="${cls}" href="${u}" x="${x0}" y="${y0}" width="${w}" height="${d - 0.5}" preserveAspectRatio="none" style="image-rendering:pixelated"/>` : '');
  return `<g class="sfx-stand"><rect x="${x0}" y="${y0}" width="${w}" height="${d}" fill="#10151d"/>${pic('sfx-crowd-img', img?.base)}${pic('sfx-cheer sfx-cheer-home', img?.home)}${pic('sfx-cheer sfx-cheer-away', img?.away)}<rect x="${x0}" y="${y0 + d - 0.5}" width="${w}" height="0.5" fill="#0c1430"/><line class="sfx-channel sfx-anim" x1="${x0}" y1="${y0 + d - 0.25}" x2="${x0 + w}" y2="${y0 + d - 0.25}" stroke="${a}" stroke-width="0.22" stroke-dasharray="2.5 2"/><line class="sfx-channel sfx-channel-b sfx-anim" x1="${x0}" y1="${y0 + d - 0.25}" x2="${x0 + w}" y2="${y0 + d - 0.25}" stroke="${b}" stroke-width="0.12" stroke-dasharray="1 3.5"/></g>`;
}
/** Behind the near end zone there is no stand in view: the stadium's wall and rail close the picture. */
export function wallSvg(venue, x0, y0, w) {
  const look = lookFor(venue?.env); if (!look || !scene) return '';
  const d = scene.depth; const [a] = look.colors;
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
  const bolt = `<svg class="sfx-strike" viewBox="0 0 60 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M33 0 L24 26 L33 26 L21 52 L31 52 L27 100" fill="none" stroke="${a}" stroke-width="7" stroke-linejoin="round" opacity=".55"/><path d="M33 0 L24 26 L33 26 L21 52 L31 52 L27 100" fill="none" stroke="${c}" stroke-width="2.6" stroke-linejoin="round"/><path d="M24 26 L12 40 M31 52 L44 63" fill="none" stroke="${b}" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  // The game's own football: same shape, colour and outline as on the field, at the field's scale (--sfx-yd = pixels per yard).
  const B = FOOTBALL; const ball = `<svg class="sfx-ball" viewBox="${-B.rx - 0.2} ${-B.ry - 0.2} ${(B.rx + 0.2) * 2} ${(B.ry + 0.2) * 2}" style="width:calc(var(--sfx-yd, 8px) * ${(B.rx + 0.2) * 2})" aria-hidden="true" focusable="false"><ellipse rx="${B.rx}" ry="${B.ry}" fill="${B.fill}" stroke="${B.stroke}" stroke-width="${B.strokeWidth}"/></svg>`;
  return `<div class="sfx-reveal sfx-reveal-${look.reveal} ${level === 'reduced' ? 'sfx-reveal-simple' : ''}" style="--sfx-a:${a};--sfx-b:${b};--sfx-c:${c}" role="button" aria-label="Skip">${level === 'reduced' ? '' : `<i class="sfx-whiteout"></i>${bolt}`}<i class="sfx-ring"></i>${ball}<span class="sfx-skip">Tap to skip</span></div>`;
}
/** The kickoff name plate: the stadium, its kind and its line. */
export function introPlateHtml(venue, esc = (s) => s) {
  const look = lookFor(venue?.env); const env = ENVIRONMENTS[venue?.env]; if (!look || !env) return '';
  return `<div class="sfx-plate"><b>${esc(venue.name || env.name)}</b><span>${esc(look.intro)}</span></div>`;
}
