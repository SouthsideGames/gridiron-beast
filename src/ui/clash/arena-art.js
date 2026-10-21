// Beast Clash arena art: pixel floors, the midline band, ground pads and shadows, all as tiny inline SVG.
// Drawn in the same 16x16 pixel language as the monsters; no external images.

const svgUrl = (w, h, body) => `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' shape-rendering='crispEdges'>${body}</svg>`)}")`;
const px = (x, y, c, w = 1, h = 1) => `<rect x='${x}' y='${y}' width='${w}' height='${h}' fill='${c}'/>`;

/** Floors keyed by the front monster's element (deterministic from the record). Each is a 16x16 tile. */
export const FLOORS = Object.freeze({
  grass:  { base: '#2f7a46', tile: svgUrl(16, 16, px(0, 0, '#2f7a46', 16, 16) + px(2, 3, '#3a8c52', 2, 1) + px(9, 6, '#3a8c52', 3, 1) + px(5, 11, '#3a8c52', 2, 1) + px(12, 13, '#276a3c', 2, 1) + px(1, 9, '#276a3c', 1, 2) + px(7, 1, '#4a9c60', 1, 2) + px(14, 4, '#4a9c60', 1, 2)), line: 'rgba(255,255,255,.22)' },
  stone:  { base: '#6b6f7a', tile: svgUrl(16, 16, px(0, 0, '#6b6f7a', 16, 16) + px(0, 7, '#5a5e68', 16, 1) + px(7, 0, '#5a5e68', 1, 7) + px(3, 8, '#5a5e68', 1, 8) + px(11, 9, '#5a5e68', 1, 7) + px(2, 2, '#787c88', 3, 1) + px(10, 11, '#787c88', 2, 1)), line: 'rgba(255,255,255,.18)' },
  sand:   { base: '#c9a86a', tile: svgUrl(16, 16, px(0, 0, '#c9a86a', 16, 16) + px(3, 4, '#d6b77a', 2, 1) + px(10, 2, '#d6b77a', 2, 1) + px(6, 12, '#b8965a', 3, 1) + px(13, 9, '#b8965a', 1, 2) + px(1, 14, '#d6b77a', 2, 1)), line: 'rgba(90,60,20,.25)' },
  ice:    { base: '#9fd3ee', tile: svgUrl(16, 16, px(0, 0, '#9fd3ee', 16, 16) + px(2, 2, '#c6e7f7', 4, 1) + px(9, 7, '#c6e7f7', 5, 1) + px(4, 11, '#7fb9db', 1, 4) + px(12, 1, '#7fb9db', 1, 3) + px(7, 14, '#c6e7f7', 2, 1)), line: 'rgba(30,80,120,.25)' },
  dusk:   { base: '#3b3550', tile: svgUrl(16, 16, px(0, 0, '#3b3550', 16, 16) + px(5, 3, '#4a4466', 2, 1) + px(11, 9, '#4a4466', 3, 1) + px(2, 12, '#2d2840', 2, 1) + px(13, 2, '#5a5478', 1, 1) + px(8, 14, '#5a5478', 1, 1)), line: 'rgba(255,255,255,.16)' },
  water:  { base: '#2f78a8', tile: svgUrl(16, 16, px(0, 0, '#2f78a8', 16, 16) + px(1, 3, '#3f8cbf', 5, 1) + px(9, 8, '#3f8cbf', 5, 1) + px(4, 12, '#3f8cbf', 4, 1) + px(12, 2, '#5aa6d6', 2, 1) + px(6, 7, '#276a96', 3, 1)), line: 'rgba(255,255,255,.22)' },
});
const FLOOR_BY_ELEMENT = { Nature: 'grass', Earth: 'sand', Fire: 'sand', Ice: 'ice', Water: 'water', Wind: 'grass', Electric: 'stone', Metal: 'stone', Dark: 'dusk', Psychic: 'dusk', Light: 'grass', Dragon: 'stone' };
export function floorFor(element) { return FLOORS[FLOOR_BY_ELEMENT[element] || 'grass']; }

/** Ground pad under a front monster (lit) or a bench monster (dim): an ellipse in two pixel-ish steps. */
export function padSvg(lit) {
  const a = lit ? 'rgba(250,204,21,.55)' : 'rgba(0,0,0,.28)', b = lit ? 'rgba(250,204,21,.22)' : 'rgba(0,0,0,.14)';
  return `<svg class="cl-pad" viewBox="0 0 40 14" aria-hidden="true"><ellipse cx="20" cy="7" rx="19" ry="6.5" fill="${b}"/><ellipse cx="20" cy="7" rx="14" ry="4.5" fill="${a}"/></svg>`;
}
/** Contact shadow: a flat dark ellipse that the sprite's jump scales. */
export const SHADOW_SVG = `<svg class="cl-shadow" viewBox="0 0 40 12" aria-hidden="true"><ellipse cx="20" cy="6" rx="16" ry="4.5" fill="rgba(0,0,0,.42)"/></svg>`;
/** Shield ring drawn around a sprite's feet; `k` is the shield as a share of max HP (0-1). */
export function shieldRingSvg(k) { const op = 0.35 + Math.min(0.5, k * 1.5); return `<svg class="cl-ring" viewBox="0 0 48 20" aria-hidden="true"><ellipse cx="24" cy="10" rx="21" ry="8" fill="none" stroke="rgba(147,197,253,${op})" stroke-width="2.5" stroke-dasharray="6 3"/></svg>`; }
export const COND_ICON = Object.freeze({ burn: '🔥', chill: '❄️', daze: '💫', shock: '⚡' });
export const COND_COLOR = Object.freeze({ burn: '#ff7a3d', chill: '#8ac6ff', daze: '#e9a3ff', shock: '#ffe55a' });
export const TYPE_COLOR = Object.freeze({ Fire: '#ff7a3d', Water: '#5fb6ff', Nature: '#7ad35a', Electric: '#ffe55a', Ice: '#bfe8ff', Wind: '#9ef0dc', Earth: '#d2a86a', Dark: '#9a7ad6', Light: '#fff0a8', Metal: '#cfd5e2', Psychic: '#ff9ae6', Dragon: '#ffbb55' });
