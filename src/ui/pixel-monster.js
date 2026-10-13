// Procedural 8×8 pixel monsters: a symmetric sprite seeded by the monster's
// id, tinted by elemental type. No external art needed; every monster looks
// like itself every time.

import { createRng, hashString } from '../core/rng.js';
import { TYPES } from '../data/monsters.js';

const cache = new Map();

function hsl(h, s, l) { return `hsl(${h} ${s}% ${l}%)`; }

/** Returns an inline SVG string. `size` is the CSS pixel size. */
export function monsterSprite(m, size = 48, { eyes = true } = {}) {
  const key = `${m.id || m.name}|${m.type}|${size}`;
  if (cache.has(key)) return cache.get(key);
  const rng = createRng(hashString(`${m.id || ''}|${m.species || m.name}`));
  const hue = (TYPES[m.type]?.hue ?? 120) + rng.int(16) - 8;
  const body = hsl(hue, 62, 46), shade = hsl(hue, 60, 32), light = hsl(hue, 70, 64), accent = hsl((hue + 150) % 360, 70, 60);
  const grid = [];
  for (let y = 0; y < 8; y++) {
    const row = [];
    for (let x = 0; x < 4; x++) {
      const centre = x >= 2, mid = y >= 2 && y <= 6;
      const p = (centre ? 0.72 : 0.4) + (mid ? 0.2 : -0.1);
      row.push(rng.chance(p) ? (rng.chance(0.18) ? 2 : 1) : 0);
    }
    grid.push([...row, ...row.slice().reverse()]);
  }
  // Guarantee a body core and a head row.
  for (let y = 2; y <= 6; y++) { grid[y][3] = grid[y][3] || 1; grid[y][4] = grid[y][4] || 1; }
  grid[1][3] = grid[1][3] || 1; grid[1][4] = grid[1][4] || 1;
  let rects = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const v = grid[y][x]; if (!v) continue;
    const below = y < 7 && grid[y + 1][x];
    rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${v === 2 ? accent : below ? body : shade}"/>`;
    if (v === 1 && y > 0 && !grid[y - 1][x]) rects += `<rect x="${x}" y="${y}" width="1" height="0.35" fill="${light}"/>`;
  }
  if (eyes) { const ey = 2 + rng.int(2); rects += `<rect x="2" y="${ey}" width="1" height="1" fill="#0b0f12"/><rect x="5" y="${ey}" width="1" height="1" fill="#0b0f12"/><rect x="2.15" y="${ey + 0.15}" width="0.4" height="0.4" fill="#fff"/><rect x="5.15" y="${ey + 0.15}" width="0.4" height="0.4" fill="#fff"/>`; }
  const svg = `<svg class="sprite" width="${size}" height="${size}" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  cache.set(key, svg);
  return svg;
}

/** Small type glyph (used in lists) as an inline SVG. */
export function typeGlyph(type, size = 14) {
  const hue = TYPES[type]?.hue ?? 120;
  return `<svg width="${size}" height="${size}" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-label="${type}" role="img"><rect x="1" y="1" width="6" height="6" fill="${hsl(hue, 65, 50)}"/><rect x="2" y="2" width="2" height="2" fill="${hsl(hue, 75, 72)}"/></svg>`;
}

/** Staff / owner portrait: a 6×8 pixel bust from a seed. */
export function portraitSprite(seed, size = 44, { hue = null } = {}) {
  const rng = createRng(hashString(String(seed)));
  const skin = ['#f1c9a5', '#d9a376', '#b07a4c', '#8a5a36', '#f5d6bd'][rng.int(5)];
  const hair = ['#2b1d12', '#5a3a1e', '#c99a4b', '#1b1b1b', '#8e8e8e', '#b5453a'][rng.int(6)];
  const shirtHue = hue ?? rng.int(360);
  const shirt = hsl(shirtHue, 55, 45);
  let r = '';
  const px = (x, y, w, h, c) => { r += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; };
  px(1, 0, 6, 2, hair); px(1, 2, 6, 4, skin); if (rng.chance(0.5)) px(1, 2, 1, 2, hair); if (rng.chance(0.5)) px(6, 2, 1, 2, hair);
  px(2, 3, 1, 1, '#111'); px(5, 3, 1, 1, '#111'); px(3, 5, 2, 0.5, '#8a4a3a');
  px(0, 6, 8, 2, shirt); px(3, 6, 2, 1, skin);
  return `<svg class="sprite" width="${size}" height="${size}" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
