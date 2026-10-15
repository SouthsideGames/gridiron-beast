// Monster art. Every monster is drawn from its species' design spec by the
// 16×16 sprite builder (src/ui/sprite16.js), so every Flaroo is recognisably
// a Flaroo; a small per-individual tint keeps two of the same species apart.
// No external art needed.

import { createRng, hashString } from '../core/rng.js';
import { TYPES, formOf } from '../data/monsters.js';
import { sprite16 } from './sprite16.js';

function hsl(h, s, l) { return `hsl(${h} ${s}% ${l}%)`; }

/** Returns an inline SVG string. `size` is the CSS pixel size. */
export function monsterSprite(m, size = 48, { tint = null, flip = false } = {}) {
  const sp = formOf(m);
  const t = tint ?? (createRng(hashString(`ind|${m?.id || m?.name || sp.id}`)).int(7) - 3);
  return sprite16(sp, size, { tint: t, flip });
}

/** Small type glyph (used in lists) as an inline SVG. */
export function typeGlyph(type, size = 14) {
  const hue = TYPES[type]?.hue ?? 120;
  return `<svg width="${size}" height="${size}" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-label="${type}" role="img"><rect x="1" y="1" width="6" height="6" fill="${hsl(hue, 65, 50)}"/><rect x="2" y="2" width="2" height="2" fill="${hsl(hue, 75, 72)}"/></svg>`;
}

/** Staff / owner portrait: a 6×8 pixel bust from a seed. */
export const SKIN_TONES = ['#f5d6bd', '#f1c9a5', '#d9a376', '#b07a4c', '#8a5a36', '#5a3a24'];
export const HAIR_COLORS = ['#1b1b1b', '#2b1d12', '#5a3a1e', '#c99a4b', '#b5453a', '#8e8e8e', '#e8e0d0', '#4a3a8a'];
export const HAIR_STYLES = ['short', 'long', 'bald', 'cap', 'mohawk', 'curls'];
export const ACCESSORIES = ['none', 'glasses', 'headset', 'visor', 'beard'];
/** A portrait spec string: custom|skin|hair|style|accessory|shirtHue. Anything else is a seeded random bust. */
export function portraitSpec({ skin = 1, hair = 1, style = 'short', accessory = 'none', hue = 210 } = {}) { return `custom|${skin}|${hair}|${style}|${accessory}|${hue}`; }
export function parsePortrait(seed) {
  const p = String(seed).split('|'); if (p[0] !== 'custom') return null;
  return { skin: +p[1] || 0, hair: +p[2] || 0, style: p[3] || 'short', accessory: p[4] || 'none', hue: +p[5] || 210 };
}
export function portraitSprite(seed, size = 44, { hue = null } = {}) {
  const custom = parsePortrait(seed);
  const rng = createRng(hashString(String(seed)));
  const skin = custom ? SKIN_TONES[custom.skin % SKIN_TONES.length] : ['#f1c9a5', '#d9a376', '#b07a4c', '#8a5a36', '#f5d6bd'][rng.int(5)];
  const hair = custom ? HAIR_COLORS[custom.hair % HAIR_COLORS.length] : ['#2b1d12', '#5a3a1e', '#c99a4b', '#1b1b1b', '#8e8e8e', '#b5453a'][rng.int(6)];
  const style = custom ? custom.style : rng.pick(['short', 'short', 'long', 'cap']);
  const acc = custom ? custom.accessory : (rng.chance(0.2) ? 'glasses' : 'none');
  const shirtHue = hue ?? (custom ? custom.hue : rng.int(360));
  const shirt = hsl(shirtHue, 55, 45);
  let r = '';
  const px = (x, y, w, h, c) => { r += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; };
  // Hair behind the face, then face, then hair in front.
  if (style === 'long') px(1, 0, 6, 6, hair);
  if (style === 'curls') { px(0, 0, 8, 3, hair); px(0, 3, 1, 2, hair); px(7, 3, 1, 2, hair); }
  px(1, 2, 6, 4, skin);
  if (style === 'short') { px(1, 0, 6, 2, hair); px(1, 2, 1, 1, hair); px(6, 2, 1, 1, hair); }
  if (style === 'mohawk') { px(3, 0, 2, 2, hair); px(1, 1, 6, 1, skin); }
  if (style === 'cap') { px(1, 0, 6, 2, hsl(shirtHue, 60, 30)); px(0, 2, 8, 0.6, hsl(shirtHue, 60, 24)); }
  if (style === 'long') { px(1, 0, 6, 2, hair); }
  if (style === 'curls') px(1, 1, 6, 1, hair);
  px(2, 3, 1, 1, '#111'); px(5, 3, 1, 1, '#111'); px(3, 5, 2, 0.5, '#8a4a3a');
  if (acc === 'glasses') { px(1.6, 2.8, 1.8, 1.4, 'rgba(20,30,60,0.35)'); px(4.6, 2.8, 1.8, 1.4, 'rgba(20,30,60,0.35)'); px(3.4, 3.4, 1.2, 0.3, '#222'); }
  if (acc === 'visor') px(1, 2.6, 6, 1.4, 'rgba(40,40,60,0.75)');
  if (acc === 'beard') px(2, 5, 4, 1.2, hair);
  if (acc === 'headset') { px(0.4, 2.4, 0.8, 1.8, '#222'); px(6.8, 2.4, 0.8, 1.8, '#222'); px(1, 1.6, 6, 0.5, '#222'); px(1.2, 4.2, 1.4, 0.5, '#222'); }
  px(0, 6, 8, 2, shirt); px(3, 6, 2, 1, skin);
  return `<svg class="sprite" width="${size}" height="${size}" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
