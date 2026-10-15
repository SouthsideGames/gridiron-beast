// Monster art. Every monster is drawn from its species' design spec by the
// 16×16 sprite builder (src/ui/sprite16.js), so every Flaroo is recognisably
// a Flaroo; a small per-individual tint keeps two of the same species apart.
// No external art needed.

import { createRng, hashString } from '../core/rng.js';
import { TYPES, resolveSpecies } from '../data/monsters.js';
import { sprite16 } from './sprite16.js';

function hsl(h, s, l) { return `hsl(${h} ${s}% ${l}%)`; }

/** Returns an inline SVG string. `size` is the CSS pixel size. */
export function monsterSprite(m, size = 48, { tint = null, flip = false } = {}) {
  const sp = resolveSpecies(m);
  const t = tint ?? (createRng(hashString(`ind|${m?.id || m?.name || sp.id}`)).int(7) - 3);
  return sprite16(sp, size, { tint: t, flip });
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
