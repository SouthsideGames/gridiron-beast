// Stadium Polish (v1): one shared system that makes every stadium feel alive and react to football.
//
// Three levels of presentation, all described by data (LOOKS), never by per-stadium code paths:
//   1. ambient  – always-on, subtle environment movement (CSS animations on a few fixed elements)
//   2. minor    – a short reaction (a sack, a loose ball)
//   3. major    – a celebration (touchdown, interception, a made field goal, a recovered turnover)
//
// Where things are drawn. The field is seen from straight above and fills the width of the screen, so a stadium has two places:
//   * the SURROUND: the two bands above and below the field inside the field's box (free space on an upright phone). The
//     far-side and near-side structures live there. It is screen-fixed scenery: it does not scroll with the camera.
//   * the FIELD EDGE: energy channels and nodes along the sidelines and the goal posts (drawn with the turf, in stadium-art.js
//     and field-view.js), which do scroll with the field.
//
// Football stays separate from presentation: `stadiumReaction` only READS a finished play event and names a reaction; the engine,
// statistics, AI and abilities never see any of this. A reaction is a pair of data attributes on the field's box for a fixed
// time; the stylesheet does the rest (styles/stadium.css). No element is created per reaction, so nothing can accumulate, a new
// reaction replaces the one playing, and leaving the screen clears it. Reactions never delay a play: nothing waits for them.

import { ENVIRONMENTS } from '../data/stadiums.js';

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
// Shared drawing pieces for the surround bands. A band is a 120 x 40 picture whose field-side edge is y = 40 (far band) or y = 0
// (near band). Every moving piece carries a class the stylesheet animates; the pieces themselves never change.
const n2 = (v) => Number(v.toFixed(2));
/** A row of towers with a glowing head each (pylons, flame towers, crystals...). `head(x, y, i)` draws the stadium's own top. */
function towers(xs, { base = 40, top = 14, w = 2.2, body = '#1b2440', edge = '#2f3d68', head }) {
  return xs.map((x, i) => `<path d="M${x - w} ${base} L${x - w * 0.45} ${top} L${x + w * 0.45} ${top} L${x + w} ${base} Z" fill="${body}" stroke="${edge}" stroke-width=".3"/>${head(x, top, i)}`).join('');
}
/** A jagged arc between two points (a spark, a crack of light). */
function zig(x0, y0, x1, y1, amp, steps = 5) {
  let d = `M${n2(x0)} ${n2(y0)}`;
  for (let i = 1; i <= steps; i++) { const k = i / steps; const off = i === steps ? 0 : (i % 2 ? -amp : amp); d += ` L${n2(x0 + (x1 - x0) * k)} ${n2(y0 + (y1 - y0) * k + off)}`; }
  return d;
}
const stagger = (i, step = 0.55) => `style="animation-delay:-${n2(i * step)}s"`;

/**
 * Each stadium's look. `label`: the design name. `colors`: [primary, secondary, bright] (also given to the stylesheet as
 * --sfx-a/-b/-c). `intro`: the kickoff line. `far`/`near`: the two bands. `edge`: what runs along the sidelines ('channel').
 * `posts`: what the goal posts do ('arc'). Environments without an entry keep today's look and simply have no surround.
 */
export const LOOKS = Object.freeze({
  storm: {
    label: 'Electric', colors: ['#4cc9ff', '#a06bff', '#eaf6ff'], intro: 'The current is live', edge: 'channel', posts: 'arc',
    far() {
      const xs = [12, 36, 60, 84, 108]; const [a, b, c] = this.colors;
      const blocks = [[2, 20, 14, 20], [20, 15, 10, 25], [44, 22, 12, 18], [66, 17, 11, 23], [90, 21, 13, 19], [106, 14, 12, 26]]
        .map(([x, y, w, h], i) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#141b33"/>${[0.3, 0.55, 0.8].map((k, j) => `<rect class="sfx-lit sfx-anim" ${stagger(i + j, 0.9)} x="${x + 1}" y="${n2(y + h * k)}" width="${w - 2}" height=".5" fill="${j % 2 ? b : a}"/>`).join('')}`).join('');
      const pylons = towers(xs, { head: (x, y, i) => `${[0.25, 0.5, 0.75].map((k) => `<ellipse cx="${x}" cy="${n2(y + (40 - y) * k)}" rx="${n2(1.2 + k * 1.3)}" ry=".45" fill="none" stroke="${a}" stroke-width=".28" opacity=".55"/>`).join('')}<circle class="sfx-node sfx-anim" ${stagger(i)} cx="${x}" cy="${y - 1.4}" r="2" fill="${c}" stroke="${a}" stroke-width=".7"/>` });
      const sparks = xs.slice(0, -1).map((x, i) => `<path class="sfx-spark sfx-anim" ${stagger(i, 1.7)} d="${zig(x + 2, 12.6, xs[i + 1] - 2, 12.6, 1.6, 7)}" fill="none" stroke="${i % 2 ? b : a}" stroke-width=".5" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
      const burst = `<path class="sfx-burst" d="M60 0 L56 9 L61 9 L54 20 L60 20 L52 34" fill="none" stroke="${c}" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"/><path class="sfx-burst" d="M24 2 L21 10 L25 10 L20 22" fill="none" stroke="${a}" stroke-width=".7" stroke-linejoin="round"/><path class="sfx-burst" d="M97 1 L100 9 L96 9 L101 21" fill="none" stroke="${b}" stroke-width=".7" stroke-linejoin="round"/>`;
      return `<rect width="120" height="40" fill="#0a1022"/><ellipse class="sfx-glow sfx-anim" cx="60" cy="40" rx="62" ry="20" fill="${a}"/>${blocks}${pylons}${sparks}${burst}<rect x="0" y="37.4" width="120" height="2.6" fill="#0c1430"/><line class="sfx-channel sfx-anim" x1="0" y1="38.7" x2="120" y2="38.7" stroke="${a}" stroke-width="1" stroke-dasharray="5 4"/><line class="sfx-channel sfx-channel-b sfx-anim" x1="0" y1="38.7" x2="120" y2="38.7" stroke="${b}" stroke-width=".5" stroke-dasharray="2 7"/>`;
    },
    near() {
      const xs = [20, 46, 74, 100]; const [a, b, c] = this.colors;
      const pads = xs.map((x, i) => `<rect x="${x - 7}" y="6" width="14" height="30" rx="1.2" fill="#131a31" stroke="#2a3760" stroke-width=".3"/><rect class="sfx-lit sfx-anim" ${stagger(i, 0.8)} x="${x - 5}" y="9" width="10" height=".7" fill="${a}"/><rect class="sfx-lit sfx-anim" ${stagger(i + 2, 0.8)} x="${x - 5}" y="12" width="10" height=".7" fill="${b}"/><circle class="sfx-node sfx-anim" ${stagger(i)} cx="${x}" cy="20" r="2.4" fill="${c}" stroke="${a}" stroke-width=".7"/>`).join('');
      const sparks = xs.slice(0, -1).map((x, i) => `<path class="sfx-spark sfx-anim" ${stagger(i + 1, 1.9)} d="${zig(x + 2.6, 20, xs[i + 1] - 2.6, 20, 1.5, 7)}" fill="none" stroke="${i % 2 ? a : b}" stroke-width=".5" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
      return `<rect width="120" height="40" fill="#0a1022"/><ellipse class="sfx-glow sfx-anim" cx="60" cy="0" rx="62" ry="18" fill="${b}"/>${pads}${sparks}<rect x="0" y="0" width="120" height="2.6" fill="#0c1430"/><line class="sfx-channel sfx-anim" x1="0" y1="1.3" x2="120" y2="1.3" stroke="${a}" stroke-width="1" stroke-dasharray="5 4"/><line class="sfx-channel sfx-channel-b sfx-anim" x1="0" y1="1.3" x2="120" y2="1.3" stroke="${b}" stroke-width=".5" stroke-dasharray="2 7"/>`;
    },
  },
});
export const lookFor = (envId) => (Object.hasOwn(LOOKS, envId) ? LOOKS[envId] : null);

/**
 * The surround for a venue: the two bands, the edge light that reactions use, and the lap of energy for the biggest moments.
 * '' for a stadium without a look. The art is the same at every level; the level only decides what moves (stylesheet).
 */
export function surroundHtml(venue) {
  const look = lookFor(venue?.env); if (!look) return '';
  const [a, b, c] = look.colors; const band = (cls, art, anchor) => `<svg class="sfx-band ${cls}" viewBox="0 0 120 40" preserveAspectRatio="${anchor}" aria-hidden="true" focusable="false">${art}</svg>`;
  return `<div class="stadium-surround sfx-${venue.env}" style="--sfx-a:${a};--sfx-b:${b};--sfx-c:${c}" aria-hidden="true">${band('sfx-far', look.far(), 'xMidYMax slice')}${band('sfx-near', look.near(), 'xMidYMin slice')}<i class="sfx-edge"></i><i class="sfx-lap"></i></div>`;
}
/** The kickoff name plate: the stadium, its kind and its line. */
export function introPlateHtml(venue, esc = (s) => s) {
  const look = lookFor(venue?.env); const env = ENVIRONMENTS[venue?.env]; if (!look || !env) return '';
  return `<div class="sfx-plate"><b>${esc(venue.name || env.name)}</b><span>${esc(look.intro)}</span></div>`;
}
