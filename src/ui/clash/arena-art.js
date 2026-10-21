// Beast Clash arena art: pixel floors, arena themes, decals, ground pads and shadows, all as tiny inline SVG.
// Drawn in the same 16x16 pixel language as the monsters; no external images. Phase 3 adds themes with
// richer 32x32 tiles, scattered props and a team-half tint, chosen deterministically from the battle record.

const svgUrl = (w, h, body) => `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' shape-rendering='crispEdges'>${body}</svg>`)}")`;
const px = (x, y, c, w = 1, h = 1) => `<rect x='${x}' y='${y}' width='${w}' height='${h}' fill='${c}'/>`;

/** Arena themes. tile: 32x32 floor; props: pixel decals (16x16 viewBox) scattered by the arena; halves: team tints. */
export const THEMES = Object.freeze({
  meadow: {
    name: 'Meadow Ring', base: '#3b8a4e', line: 'rgba(255,255,255,.28)', halfA: 'rgba(255,240,180,.07)', halfB: 'rgba(40,20,80,.10)', pad: '#facc15',
    tile: svgUrl(32, 32, px(0, 0, '#3b8a4e', 32, 32) + px(2, 3, '#48a05c', 3, 1) + px(12, 6, '#48a05c', 2, 1) + px(22, 2, '#48a05c', 3, 1) + px(6, 14, '#2f7340', 2, 1) + px(26, 12, '#2f7340', 3, 1) + px(16, 20, '#48a05c', 3, 1) + px(3, 24, '#2f7340', 2, 1) + px(27, 26, '#48a05c', 2, 1) + px(10, 29, '#2f7340', 3, 1) + px(20, 9, '#56b068', 1, 2) + px(8, 19, '#56b068', 1, 2) + px(29, 20, '#56b068', 1, 2)),
    props: [
      px(6, 10, '#2f7340', 1, 4) + px(8, 9, '#2f7340', 1, 5) + px(10, 11, '#2f7340', 1, 3) + px(7, 12, '#56b068', 1, 2) + px(9, 12, '#56b068', 1, 2), // tuft
      px(7, 8, '#2f7340', 1, 6) + px(5, 6, '#ff8fb1', 3, 1) + px(6, 5, '#ff8fb1', 1, 3) + px(6, 6, '#fff3a3', 1, 1) + px(9, 10, '#2f7340', 2, 1), // flower
      px(4, 11, '#7d7f86', 7, 3) + px(5, 10, '#9a9ca6', 5, 1) + px(6, 9, '#9a9ca6', 3, 1) + px(4, 13, '#5c5e66', 7, 1), // rock
      px(3, 12, '#2f7340', 10, 1) + px(5, 11, '#48a05c', 2, 1) + px(9, 11, '#48a05c', 3, 1), // grass line
    ],
  },
  quarry: {
    name: 'Stone Quarry', base: '#6b6f7a', line: 'rgba(255,255,255,.22)', halfA: 'rgba(255,220,150,.08)', halfB: 'rgba(80,90,160,.12)', pad: '#fbbf24',
    tile: svgUrl(32, 32, px(0, 0, '#6b6f7a', 32, 32) + px(0, 15, '#595d68', 32, 1) + px(15, 0, '#595d68', 1, 15) + px(7, 16, '#595d68', 1, 16) + px(23, 16, '#595d68', 1, 16) + px(2, 3, '#7b7f8b', 5, 1) + px(18, 5, '#7b7f8b', 6, 1) + px(10, 20, '#7b7f8b', 4, 1) + px(26, 24, '#7b7f8b', 3, 1) + px(20, 10, '#4f535d', 2, 1) + px(4, 26, '#4f535d', 3, 1)),
    props: [
      px(3, 8, '#4f535d', 1, 1) + px(4, 9, '#4f535d', 1, 1) + px(5, 10, '#4f535d', 2, 1) + px(7, 11, '#4f535d', 1, 1) + px(8, 12, '#4f535d', 1, 2) + px(9, 14, '#4f535d', 2, 1), // crack
      px(5, 10, '#8a8e9a', 6, 3) + px(6, 9, '#a2a6b2', 4, 1) + px(5, 13, '#4f535d', 6, 1) + px(12, 12, '#8a8e9a', 2, 2), // boulder
      px(6, 12, '#8a8e9a', 2, 1) + px(10, 11, '#8a8e9a', 1, 1) + px(8, 13, '#a2a6b2', 1, 1), // pebbles
      px(2, 6, '#b7a27a', 3, 1) + px(3, 5, '#b7a27a', 1, 1) + px(4, 7, '#8a7a55', 2, 1), // dry weed
    ],
  },
  shore: {
    name: 'Tide Shore', base: '#cfae6e', line: 'rgba(90,60,20,.3)', halfA: 'rgba(255,255,255,.06)', halfB: 'rgba(40,110,170,.14)', pad: '#f59e0b',
    tile: svgUrl(32, 32, px(0, 0, '#cfae6e', 32, 32) + px(3, 4, '#dbbd80', 3, 1) + px(14, 2, '#dbbd80', 2, 1) + px(24, 7, '#dbbd80', 3, 1) + px(8, 12, '#bd9a5a', 3, 1) + px(20, 15, '#bd9a5a', 2, 1) + px(2, 20, '#dbbd80', 2, 1) + px(27, 22, '#bd9a5a', 1, 2) + px(12, 26, '#dbbd80', 3, 1) + px(22, 29, '#bd9a5a', 2, 1)),
    props: [
      px(6, 11, '#f4e8d2', 4, 2) + px(7, 10, '#f4e8d2', 2, 1) + px(8, 12, '#d9c2a0', 1, 1), // shell
      px(4, 12, '#3f8cbf', 8, 1) + px(6, 11, '#7fc3e8', 3, 1) + px(10, 13, '#3f8cbf', 3, 1), // puddle
      px(5, 9, '#5a8f4a', 1, 5) + px(4, 8, '#5a8f4a', 1, 2) + px(7, 7, '#5a8f4a', 1, 7) + px(8, 9, '#6fae5a', 1, 2), // reed
      px(4, 11, '#9a8560', 6, 2) + px(5, 10, '#b09a70', 4, 1), // driftwood
    ],
  },
  tundra: {
    name: 'Frost Flat', base: '#a9d8ee', line: 'rgba(30,80,120,.3)', halfA: 'rgba(255,255,255,.12)', halfB: 'rgba(40,60,140,.12)', pad: '#f59e0b',
    tile: svgUrl(32, 32, px(0, 0, '#a9d8ee', 32, 32) + px(3, 3, '#d4eefa', 5, 1) + px(14, 8, '#d4eefa', 6, 1) + px(6, 14, '#86bfdc', 1, 5) + px(22, 2, '#86bfdc', 1, 4) + px(10, 22, '#d4eefa', 3, 1) + px(24, 20, '#86bfdc', 4, 1) + px(2, 27, '#d4eefa', 4, 1) + px(18, 28, '#86bfdc', 2, 1)),
    props: [
      px(4, 10, '#eef9ff', 7, 3) + px(5, 9, '#ffffff', 5, 1) + px(4, 13, '#86bfdc', 7, 1), // snow drift
      px(6, 6, '#bfe8ff', 2, 7) + px(5, 8, '#e8f7ff', 1, 3) + px(8, 9, '#86bfdc', 1, 4), // ice spike
      px(3, 12, '#86bfdc', 1, 1) + px(5, 11, '#86bfdc', 2, 1) + px(8, 12, '#86bfdc', 1, 1) + px(10, 11, '#86bfdc', 1, 1), // crack
      px(5, 11, '#7d7f86', 5, 2) + px(6, 10, '#eef9ff', 3, 1), // snowy rock
    ],
  },
  dusk: {
    name: 'Dusk Hollow', base: '#3b3550', line: 'rgba(255,255,255,.2)', halfA: 'rgba(255,200,120,.08)', halfB: 'rgba(120,60,200,.12)', pad: '#facc15',
    tile: svgUrl(32, 32, px(0, 0, '#3b3550', 32, 32) + px(5, 3, '#4a4466', 3, 1) + px(18, 9, '#4a4466', 4, 1) + px(2, 14, '#2d2840', 3, 1) + px(26, 4, '#5a5478', 1, 1) + px(10, 24, '#5a5478', 1, 1) + px(22, 20, '#2d2840', 4, 1) + px(8, 29, '#4a4466', 5, 1) + px(29, 27, '#4a4466', 2, 1)),
    props: [
      px(7, 10, '#5a5478', 2, 4) + px(6, 9, '#7a74a0', 1, 1) + px(9, 8, '#7a74a0', 1, 1) + px(7, 7, '#c9b6ff', 2, 2), // glowing stalk
      px(4, 11, '#2d2840', 7, 3) + px(5, 10, '#4a4466', 5, 1), // dark rock
      px(5, 12, '#9a7ad6', 1, 1) + px(9, 10, '#9a7ad6', 1, 1) + px(7, 13, '#c9b6ff', 1, 1), // motes
      px(3, 12, '#2d2840', 10, 1) + px(6, 11, '#4a4466', 3, 1), // ridge
    ],
  },
});
const THEME_BY_ELEMENT = { Nature: 'meadow', Wind: 'meadow', Light: 'meadow', Earth: 'quarry', Metal: 'quarry', Electric: 'quarry', Fire: 'quarry', Water: 'shore', Ice: 'tundra', Dark: 'dusk', Psychic: 'dusk', Dragon: 'dusk' };
/** Theme for a battle: the two front elements vote, the seed breaks the tie, so the same record always gets the same arena. */
export function themeFor(result) {
  const a = THEME_BY_ELEMENT[result.lines.a[0]?.type], b = THEME_BY_ELEMENT[result.lines.b[0]?.type];
  const key = ((result.seed || 0) % 2 === 0 ? a : b) || b || a || 'meadow';
  return { key, ...THEMES[key] };
}
/** Legacy: a floor by element (kept for the earlier API). */
export function floorFor(element) { const t = THEMES[THEME_BY_ELEMENT[element] || 'meadow']; return { base: t.base, tile: t.tile, line: t.line }; }

/** Scattered props for a theme as one SVG layer: seeded, kept off the slot lanes, a dozen elements at most. */
export function decorSvg(theme, seed, landscape) {
  let s = (seed * 9301 + 49297) % 233280; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const spots = []; let tries = 0;
  while (spots.length < 11 && tries++ < 80) {
    const x = 3 + r() * 94, y = 4 + r() * 92;
    // keep clear of the central lanes where monsters stand (slots live near x 14-86 in rows; props hug the rim and the midline gaps)
    const nearSlot = landscape ? (x > 10 && x < 90 && y > 20 && y < 92) : ((y > 4 && y < 50) || (y > 56 && y < 97)) && x > 6 && x < 94;
    if (nearSlot && r() < 0.8) continue;
    if (spots.some((p) => Math.abs(p[0] - x) < 9 && Math.abs(p[1] - y) < 9)) continue;
    spots.push([x, y, Math.floor(r() * theme.props.length)]);
  }
  const defs = theme.props.map((p, i) => `<g id="p${i}">${p}</g>`).join('');
  return `<svg class="cl-decor" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs>${defs}</defs>${spots.map(([x, y, i]) => `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="9" height="9" viewBox="0 0 16 16" preserveAspectRatio="xMidYMax meet" shape-rendering="crispEdges"><use href="#p${i}"/></svg>`).join('')}</svg>`;
}

/** Ground pad under a front monster (lit, in the theme's pad colour) or a bench monster (dim). */
export function padSvg(lit, color = '#facc15') {
  const a = lit ? color : 'rgba(0,0,0,.26)', b = lit ? color : 'rgba(0,0,0,.12)';
  return `<svg class="cl-pad" viewBox="0 0 40 14" aria-hidden="true" shape-rendering="crispEdges"><ellipse cx="20" cy="7" rx="19" ry="6.5" fill="${b}" opacity="${lit ? 0.28 : 1}"/><ellipse cx="20" cy="7" rx="14" ry="4.5" fill="${a}" opacity="${lit ? 0.6 : 1}"/>${lit ? `<ellipse cx="20" cy="7" rx="19" ry="6.5" fill="none" stroke="${color}" stroke-width="1.2" opacity=".9"/>` : ''}</svg>`;
}
/** Contact shadow: a flat dark ellipse that the sprite's jump scales. */
export const SHADOW_SVG = `<svg class="cl-shadow" viewBox="0 0 40 12" aria-hidden="true"><ellipse cx="20" cy="6" rx="16" ry="4.5" fill="rgba(0,0,0,.42)"/></svg>`;
/** Shield ring drawn around a sprite's feet; `k` is the shield as a share of max HP (0-1). */
export function shieldRingSvg(k) { const op = 0.45 + Math.min(0.5, k * 1.5); return `<svg class="cl-ring" viewBox="0 0 48 20" aria-hidden="true"><ellipse cx="24" cy="10" rx="21" ry="8" fill="none" stroke="rgba(147,197,253,${op})" stroke-width="2.5" stroke-dasharray="6 3"/><ellipse cx="24" cy="10" rx="17" ry="6" fill="rgba(147,197,253,${op * 0.25})"/></svg>`; }
export const COND_ICON = Object.freeze({ burn: '🔥', chill: '❄️', daze: '💫', shock: '⚡' });
export const COND_COLOR = Object.freeze({ burn: '#ff7a3d', chill: '#8ac6ff', daze: '#e9a3ff', shock: '#ffe55a' });
export const TYPE_COLOR = Object.freeze({ Fire: '#ff7a3d', Water: '#5fb6ff', Nature: '#7ad35a', Electric: '#ffe55a', Ice: '#bfe8ff', Wind: '#9ef0dc', Earth: '#d2a86a', Dark: '#9a7ad6', Light: '#fff0a8', Metal: '#cfd5e2', Psychic: '#ff9ae6', Dragon: '#ffbb55' });
