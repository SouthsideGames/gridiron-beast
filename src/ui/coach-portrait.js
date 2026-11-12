// Coach portraits, version 2 (coach creation expansion, owner 2026-11-11). A layered 16×16 pixel bust drawn from a short spec
// string, so one renderer gives every combination and nothing is stored but the choices:
//   coach2|skin|face|eyes|brows|nose|hair|hairColor|facial|outfit|outfitColor|hat|glasses|extra|build
// Layers, back to front: hair behind the head, shoulders and outfit, neck, head, ears, face features, facial hair, hair in front,
// hat, glasses, extra. Older portraits ('custom|…' and seeded busts) keep their own renderer in pixel-monster.js; nothing saved
// before this version changes how it looks. No images, no dependencies: inline SVG rectangles like every other sprite in the game.
import { t as $t } from '../text/index.js';

export const SKINS = Object.freeze(['#fbe3d0', '#f5d0b0', '#eebd96', '#e0a77a', '#cf9462', '#b87d4e', '#9c653c', '#7d4e2d', '#5f3a21', '#452a18']);
export const HAIR_COLORS2 = Object.freeze(['#17171a', '#2c1c12', '#4a2f1b', '#6b4526', '#8f5f2e', '#c69248', '#e3c178', '#b3472f', '#d9662b', '#8d8f94', '#e9e6df', '#3d4fb0', '#2f8f6b', '#b0489a']);
export const FACES = Object.freeze(['oval', 'round', 'square', 'long', 'heart']);
export const EYES = Object.freeze(['dot', 'round', 'narrow', 'wide', 'tired', 'sharp']);
export const BROWS = Object.freeze(['thin', 'thick', 'arched', 'stern', 'flat', 'raised']);
export const NOSES = Object.freeze(['small', 'button', 'broad', 'long', 'pointed']);
export const HAIRS = Object.freeze(['bald', 'buzz', 'shortfade', 'hightop', 'flattop', 'afro', 'puffs', 'shortcurls', 'longcurls', 'braids', 'cornrows', 'locs', 'ponytail', 'longstraight', 'bob', 'wavy', 'bun', 'topknot', 'mohawk', 'slick', 'sidepart', 'pixie']);
export const FACIALS = Object.freeze(['none', 'stubble', 'mustache', 'handlebar', 'goatee', 'soulpatch', 'chinstrap', 'beard', 'longbeard', 'sideburns']);
export const OUTFITS = Object.freeze(['tee', 'polo', 'hoodie', 'jacket', 'windbreaker', 'quarterzip', 'sweater', 'turtleneck', 'jersey', 'vest', 'blazer', 'suit']);
/** Outfit colours: 'team' follows the club's colour; then black, grey, white; then hues. */
export const OUTFIT_COLORS = Object.freeze(['team', 'black', 'grey', 'white', 0, 20, 40, 55, 95, 140, 175, 205, 230, 265, 300, 335]);
export const HATS = Object.freeze(['none', 'cap', 'cap_back', 'visor', 'beanie', 'bucket', 'headband', 'bandana', 'fedora']);
export const GLASSES = Object.freeze(['none', 'round', 'square', 'shades', 'aviators', 'monocle']);
export const EXTRAS = Object.freeze(['none', 'headset', 'whistle', 'earring', 'chain', 'towel', 'lanyard', 'toothpick']);
export const BUILDS = Object.freeze(['slim', 'average', 'broad', 'stocky']);

export const LABELS = Object.freeze({
  oval: $t('shared.oval'), round: $t('shared.round'), square: $t('shared.square'), long: $t('shared.long'), heart: $t('shared.heart'), dot: $t('shared.simple'), narrow: $t('shared.narrow'), wide: $t('shared.wide'), tired: $t('shared.tired'), sharp: $t('shared.sharp'),
  thin: $t('shared.thin'), thick: $t('shared.thick'), arched: $t('shared.arched'), stern: $t('shared.stern'), flat: $t('shared.flat'), raised: $t('shared.raised'), small: $t('shared.small'), button: $t('shared.button'), broad: $t('shared.broad'), pointed: $t('shared.pointed'),
  bald: $t('shared.bald'), buzz: $t('shared.buzz_cut'), shortfade: $t('shared.short_fade'), hightop: $t('shared.high_top_fade'), flattop: $t('shared.flat_top'), afro: $t('shared.afro'), puffs: $t('shared.afro_puffs'), shortcurls: $t('shared.short_curls'), longcurls: $t('shared.long_curls'), braids: $t('shared.braids'), cornrows: $t('shared.cornrows'), locs: $t('shared.locs'),
  ponytail: $t('shared.ponytail'), longstraight: $t('shared.long_straight'), bob: $t('shared.bob'), wavy: $t('shared.wavy'), bun: $t('shared.bun'), topknot: $t('shared.top_knot'), mohawk: $t('shared.mohawk'), slick: $t('shared.slicked_back'), sidepart: $t('shared.side_part'), pixie: $t('shared.pixie'),
  none: $t('shared.none'), stubble: $t('shared.stubble'), mustache: $t('shared.mustache'), handlebar: $t('shared.handlebar'), goatee: $t('shared.goatee'), soulpatch: $t('shared.soul_patch'), chinstrap: $t('shared.chin_strap'), beard: $t('shared.full_beard'), longbeard: $t('shared.long_beard'), sideburns: $t('shared.sideburns'),
  tee: $t('shared.t_shirt'), polo: $t('shared.polo'), hoodie: $t('shared.hoodie'), jacket: $t('shared.track_jacket'), windbreaker: $t('shared.windbreaker'), quarterzip: $t('shared.quarter_zip'), sweater: $t('shared.sweater'), turtleneck: $t('shared.turtleneck'), jersey: $t('shared.jersey'), vest: $t('shared.puffer_vest'), blazer: $t('shared.blazer_and_tie'), suit: $t('shared.suit'),
  cap: $t('shared.cap'), cap_back: $t('shared.backwards_cap'), visor: $t('shared.visor'), beanie: $t('shared.beanie'), bucket: $t('shared.bucket_hat'), headband: $t('shared.headband'), bandana: $t('shared.bandana'), fedora: $t('shared.fedora'),
  shades: $t('shared.sunglasses'), aviators: $t('shared.aviators'), monocle: $t('shared.monocle'), headset: $t('shared.headset'), whistle: $t('shared.whistle'), earring: $t('shared.earring'), chain: $t('shared.chain'), towel: $t('shared.towel'), lanyard: $t('shared.lanyard'), toothpick: $t('shared.toothpick'),
  slim: $t('shared.slim'), average: $t('shared.average'), stocky: $t('shared.stocky'), team: $t('shared.team_colors'), black: $t('shared.black'), grey: $t('shared.gray'), white: $t('shared.white'),
});
export const labelOf = (v) => LABELS[v] || String(v);

export const DEFAULT_LOOK = Object.freeze({ skin: 3, face: 0, eyes: 1, brows: 1, nose: 0, hair: 'shortfade', hairColor: 1, facial: 'none', outfit: 'polo', outfitColor: 'team', hat: 'none', glasses: 'none', extra: 'headset', build: 1 });
/** A look object → the saved spec string. */
export function coachSpec(look = {}) { const l = { ...DEFAULT_LOOK, ...look }; return ['coach2', l.skin, l.face, l.eyes, l.brows, l.nose, l.hair, l.hairColor, l.facial, l.outfit, l.outfitColor, l.hat, l.glasses, l.extra, l.build].join('|'); }
const idx = (v, n, d = 0) => { const x = Number(v); return Number.isInteger(x) && x >= 0 ? x % n : d; };
const oneOf = (v, list, d) => (list.includes(v) ? v : d);
/** A spec string → a complete, valid look (unknown or missing parts fall back to the default, so a newer or damaged spec still draws). */
export function parseCoach(spec) {
  const p = String(spec || '').split('|'); if (p[0] !== 'coach2') return null; const D = DEFAULT_LOOK;
  const oc = p[10] === 'team' || p[10] === 'black' || p[10] === 'grey' || p[10] === 'white' ? p[10] : (Number.isFinite(+p[10]) && p[10] !== '' && p[10] != null ? ((+p[10] % 360) + 360) % 360 : D.outfitColor);
  return { skin: idx(p[1], SKINS.length, D.skin), face: idx(p[2], FACES.length), eyes: idx(p[3], EYES.length, D.eyes), brows: idx(p[4], BROWS.length, D.brows), nose: idx(p[5], NOSES.length),
    hair: oneOf(p[6], HAIRS, D.hair), hairColor: idx(p[7], HAIR_COLORS2.length, D.hairColor), facial: oneOf(p[8], FACIALS, 'none'), outfit: oneOf(p[9], OUTFITS, D.outfit), outfitColor: oc,
    hat: oneOf(p[11], HATS, 'none'), glasses: oneOf(p[12], GLASSES, 'none'), extra: oneOf(p[13], EXTRAS, 'none'), build: idx(p[14], BUILDS.length, D.build) };
}
export const isCoachSpec = (seed) => String(seed).startsWith('coach2|');

/** An older 'custom|skin|hair|style|accessory|hue' portrait as the nearest version-2 look (used when its owner opens the editor). */
export function lookFromLegacy(seed) {
  const p = String(seed || '').split('|'); if (p[0] !== 'custom') return { ...DEFAULT_LOOK };
  const skin = [1, 2, 4, 6, 7, 8][idx(p[1], 6)], hairColor = [0, 1, 2, 5, 7, 9, 10, 11][idx(p[2], 8)];
  const style = p[3] || 'short', acc = p[4] || 'none', hue = Number.isFinite(+p[5]) ? +p[5] : 210;
  const hair = { short: 'sidepart', long: 'longstraight', bald: 'bald', cap: 'buzz', mohawk: 'mohawk', curls: 'shortcurls', buzz: 'buzz', afro: 'afro', bun: 'bun', braids: 'braids', ponytail: 'ponytail', beanie: 'buzz' }[style] || 'sidepart';
  return { ...DEFAULT_LOOK, skin, hairColor, hair, outfitColor: ((hue % 360) + 360) % 360, outfit: 'tee', extra: acc === 'headset' ? 'headset' : acc === 'earring' ? 'earring' : 'none',
    hat: style === 'cap' ? 'cap' : style === 'beanie' ? 'beanie' : acc === 'visor' ? 'visor' : acc === 'headband' ? 'headband' : 'none', glasses: acc === 'glasses' ? 'round' : acc === 'sunglasses' ? 'shades' : 'none', facial: acc === 'beard' ? 'beard' : acc === 'mustache' ? 'mustache' : 'none' };
}

// ---------------------------------------------------------------- colour helpers
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const rgb = (r, g, b) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
function shade(hex, k) { const [r, g, b] = hexToRgb(hex); return k < 0 ? rgb(r * (1 + k), g * (1 + k), b * (1 + k)) : rgb(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k); }
const hsl = (h, s, l) => `hsl(${h} ${s}% ${l}%)`;
function outfitTones(color, teamColor) {
  if (color === 'team') { const base = /^#[0-9a-f]{6}$/i.test(teamColor || '') ? teamColor : '#2a6fb0'; return { base, dark: shade(base, -0.28), light: shade(base, 0.3), trim: shade(base, 0.62) }; }
  if (color === 'black') return { base: '#24262b', dark: '#15161a', light: '#3d4048', trim: '#c9ccd3' };
  if (color === 'grey') return { base: '#8a8f99', dark: '#6a6f79', light: '#a9aeb8', trim: '#f0f1f4' };
  if (color === 'white') return { base: '#e9ebef', dark: '#c4c8d0', light: '#ffffff', trim: '#5a6070' };
  return { base: hsl(color, 55, 44), dark: hsl(color, 58, 31), light: hsl(color, 60, 58), trim: hsl(color, 45, 86) };
}

// ---------------------------------------------------------------- geometry of the head by face shape: [left, right, top, chin]
const HEAD = { oval: [4.5, 11.5, 2.6, 10.6], round: [4, 12, 3, 10.4], square: [4.4, 11.6, 2.6, 10.6], long: [5, 11, 2.2, 11], heart: [4.4, 11.6, 2.6, 10.6] };

/** The portrait as SVG rectangles (no wrapper), for a 16×16 viewBox. */
export function coachRects(look, { teamColor = null } = {}) {
  const L = { ...DEFAULT_LOOK, ...look };
  const skin = SKINS[L.skin % SKINS.length], sk2 = shade(skin, -0.16), sk3 = shade(skin, -0.32), lip = shade(skin, -0.42);
  const hair = HAIR_COLORS2[L.hairColor % HAIR_COLORS2.length], hairHi = shade(hair, 0.22), hairLo = shade(hair, -0.3);
  const face = FACES[L.face % FACES.length]; const [x0, x1, top, chin] = HEAD[face]; const cx = 8;
  const build = BUILDS[L.build % BUILDS.length]; const half = { slim: 5, average: 6, broad: 7.2, stocky: 7.2 }[build]; const neckW = { slim: 1.9, average: 2.3, broad: 2.7, stocky: 3.2 }[build];
  const O = outfitTones(L.outfitColor, teamColor);
  let r = ''; const px = (x, y, w, h, c, o = null) => { if (x < 0) { w += x; x = 0; } if (y < 0) { h += y; y = 0; } w = Math.min(w, 16 - x); h = Math.min(h, 16 - y); if (w <= 0 || h <= 0) return; r += `<rect x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" width="${+w.toFixed(2)}" height="${+h.toFixed(2)}" fill="${c}"${o != null ? ` opacity="${o}"` : ''}/>`; };
  const hatOn = ['cap', 'cap_back', 'beanie', 'bucket', 'fedora', 'bandana'].includes(L.hat);
  // hair drawn above the hat line is hidden by a hat that covers the crown
  const hp = (x, y, w, h, c = hair, o = null) => { if (hatOn) { const cut = top + 0.9; if (y + h <= cut) return; if (y < cut) { h -= cut - y; y = cut; } } px(x, y, w, h, c, o); };
  const style = L.hair;

  // ---- hair behind the head
  if (style === 'longstraight') { hp(x0 - 1, top - 0.4, x1 - x0 + 2, 13.2 - top); }
  if (style === 'longcurls') { for (let i = 0; i < 6; i++) hp(x0 - 1.6 + (i % 2 ? 0.4 : 0), top + 0.4 + i * 1.6, x1 - x0 + 3.2 - (i % 2 ? 0.8 : 0), 1.7); }
  if (style === 'wavy') { for (let i = 0; i < 5; i++) hp(x0 - 1 + (i % 2 ? 0.35 : 0), top + 0.2 + i * 1.7, x1 - x0 + 2 - (i % 2 ? 0.7 : 0), 1.8); }
  if (style === 'bob') hp(x0 - 1, top - 0.4, x1 - x0 + 2, 9.6 - top);
  if (style === 'locs') { for (let x = x0 - 1; x < x1 + 0.6; x += 1.15) hp(x, top + 0.5, 0.85, 12.4 - top - ((Math.round(x * 3) % 2) ? 0.7 : 0), (Math.round(x * 3) % 2) ? hairLo : hair); }
  if (style === 'braids') { for (const x of [x0 - 0.9, x0 - 0.1, x1 - 0.6, x1 + 0.2]) { hp(x, top + 1, 0.7, 12 - top); px(x, 12.6, 0.7, 0.5, hairHi); } }
  if (style === 'ponytail') { hp(x1 - 0.4, top + 1.4, 1.9, 1.2); hp(x1 + 0.4, top + 2.4, 1.3, 5.6); px(x1 + 0.1, top + 2.1, 1, 0.5, O.trim); }
  if (style === 'afro') { hp(x0 - 1.6, top - 2.2, x1 - x0 + 3.2, 5.4); hp(x0 - 1, top - 2.8, x1 - x0 + 2, 1); hp(x0 - 2, top - 1.2, x1 - x0 + 4, 3.2); }
  if (L.outfit === 'hoodie') { px(cx - neckW / 2 - 1.5, 9.6, neckW + 3, 3, O.dark); }

  // ---- shoulders and outfit
  const sy = 11.6; const body = (c) => { px(cx - half, sy + 0.7, half * 2, 16 - sy - 0.7, c); px(cx - half + 0.8, sy, half * 2 - 1.6, 0.8, c); };
  const out = L.outfit;
  body(out === 'blazer' || out === 'suit' ? O.dark : O.base);
  if (build === 'stocky') px(cx - half + 0.4, sy - 0.3, half * 2 - 0.8, 0.5, out === 'blazer' || out === 'suit' ? O.dark : O.base);
  // neck
  px(cx - neckW / 2, 9.8, neckW, 2.4, sk2); px(cx - neckW / 2, 9.8, neckW, 0.7, sk3);
  if (out === 'tee') { px(cx - neckW / 2 - 0.3, sy, neckW + 0.6, 0.7, sk2); px(cx - neckW / 2 - 0.5, sy + 0.6, neckW + 1, 0.3, O.dark); }
  if (out === 'polo') { px(cx - neckW / 2 - 0.2, sy, neckW + 0.4, 1.1, sk2); px(cx - neckW / 2 - 1.3, sy - 0.2, 1.4, 1.3, O.light); px(cx + neckW / 2 - 0.1, sy - 0.2, 1.4, 1.3, O.light); px(cx - 0.2, sy + 1.1, 0.4, 2, O.dark); px(cx - 0.2, sy + 1.6, 0.4, 0.4, O.trim); }
  if (out === 'hoodie') { px(cx - neckW / 2 - 1.2, sy - 0.5, neckW + 2.4, 1, O.dark); px(cx - neckW / 2 - 0.2, sy - 0.1, neckW + 0.4, 0.8, sk2); px(cx - 1.1, sy + 0.8, 0.35, 2.4, O.trim); px(cx + 0.75, sy + 0.8, 0.35, 2.4, O.trim); px(cx - 2.4, sy + 3, 4.8, 0.3, O.dark); }
  if (out === 'jacket') { px(cx - neckW / 2 - 0.9, sy - 0.5, neckW + 1.8, 1, O.dark); px(cx - 0.2, sy + 0.4, 0.4, 4, O.trim); px(cx - half, sy + 1.2, half * 2, 0.45, O.trim); px(cx - half, sy + 1.9, half * 2, 0.3, O.light); }
  if (out === 'windbreaker') { px(cx - half, sy + 0.7, half * 2, 1.7, O.light); px(cx - half + 0.8, sy, half * 2 - 1.6, 0.8, O.light); px(cx - neckW / 2 - 0.8, sy - 0.4, neckW + 1.6, 0.9, O.dark); px(cx - 0.2, sy + 0.4, 0.4, 2.2, O.trim); px(cx - half, sy + 2.4, half * 2, 0.35, O.trim); }
  if (out === 'quarterzip') { px(cx - neckW / 2 - 0.8, sy - 0.6, neckW + 1.6, 1.2, O.light); px(cx - 0.2, sy + 0.2, 0.4, 2, O.trim); px(cx - 0.35, sy + 2.1, 0.7, 0.4, O.trim); px(cx - half, 15.2, half * 2, 0.4, O.dark); }
  if (out === 'sweater') { px(cx - neckW / 2 - 0.7, sy - 0.2, neckW + 1.4, 0.8, O.dark); px(cx - neckW / 2 - 0.2, sy - 0.2, neckW + 0.4, 0.5, sk2); px(cx - half, sy + 2, half * 2, 0.5, O.light); px(cx - half, sy + 2.9, half * 2, 0.3, O.trim); }
  if (out === 'turtleneck') { px(cx - neckW / 2 - 0.4, 10.3, neckW + 0.8, 1.8, O.base); px(cx - neckW / 2 - 0.4, 10.3, neckW + 0.8, 0.4, O.light); px(cx - neckW / 2 - 0.4, 11, neckW + 0.8, 0.25, O.dark); }
  if (out === 'jersey') { px(cx - neckW / 2 - 0.3, sy, neckW + 0.6, 0.8, sk2); px(cx - neckW / 2 - 0.6, sy + 0.7, neckW + 1.2, 0.35, O.trim); px(cx - half, sy + 0.7, 1.3, 1.6, O.trim); px(cx + half - 1.3, sy + 0.7, 1.3, 1.6, O.trim); px(cx - 1.5, sy + 1.8, 1.1, 2, O.trim); px(cx + 0.4, sy + 1.8, 1.1, 2, O.trim); px(cx + 0.4, sy + 2.5, 1.1, 0.4, O.base); }
  if (out === 'vest') { px(cx - half, sy + 0.7, 1.6, 4, O.trim); px(cx + half - 1.6, sy + 0.7, 1.6, 4, O.trim); px(cx - neckW / 2 - 0.9, sy - 0.5, neckW + 1.8, 1, O.dark); for (let y = sy + 1.4; y < 16; y += 1.1) px(cx - half + 1.6, y, half * 2 - 3.2, 0.25, O.dark); px(cx - 0.2, sy + 0.4, 0.4, 4, O.light); }
  if (out === 'blazer' || out === 'suit') {
    px(cx - 1.6, sy - 0.1, 3.2, 4.6, '#eef0f4'); // shirt
    px(cx - neckW / 2 - 0.2, sy - 0.1, neckW + 0.4, 0.6, sk2);
    for (let i = 0; i < 4; i++) { px(cx - 1.6 - 0.05, sy + 0.4 + i, 0.5 + i * 0.3, 1, O.dark); px(cx + 1.15 - i * 0.3, sy + 0.4 + i, 0.5 + i * 0.3, 1, O.dark); } // lapels closing to a V
    px(cx - 2.4, sy + 0.5, 0.9, 0.35, O.base); px(cx + 1.5, sy + 0.5, 0.9, 0.35, O.base);
    const tie = out === 'suit' ? '#22252b' : O.light; px(cx - 0.45, sy + 0.4, 0.9, 0.7, tie); px(cx - 0.3, sy + 1.1, 0.6, 2.6, tie);
    if (out === 'suit') px(cx + 2.2, sy + 1.6, 0.9, 0.35, '#eef0f4'); // pocket square
  }

  // ---- head
  if (face === 'oval') { px(x0, top, x1 - x0, chin - top - 0.8, skin); px(x0 + 0.5, chin - 0.8, x1 - x0 - 1, 0.5, skin); px(x0 + 1.2, chin - 0.3, x1 - x0 - 2.4, 0.3, skin); }
  if (face === 'round') { px(x0, top + 0.6, x1 - x0, chin - top - 1.6, skin); px(x0 + 0.6, top, x1 - x0 - 1.2, 0.6, skin); px(x0 + 0.6, chin - 1, x1 - x0 - 1.2, 0.6, skin); px(x0 + 1.6, chin - 0.4, x1 - x0 - 3.2, 0.4, skin); }
  if (face === 'square') { px(x0, top, x1 - x0, chin - top, skin); px(x0, chin - 0.5, x1 - x0, 0.5, sk2); }
  if (face === 'long') { px(x0, top, x1 - x0, chin - top - 0.6, skin); px(x0 + 0.7, chin - 0.6, x1 - x0 - 1.4, 0.6, skin); }
  if (face === 'heart') { px(x0, top, x1 - x0, 5.4, skin); px(x0 + 0.5, top + 5.4, x1 - x0 - 1, 1.2, skin); px(x0 + 1.1, top + 6.6, x1 - x0 - 2.2, 0.8, skin); px(x0 + 2, top + 7.4, x1 - x0 - 4, 0.6, skin); }
  px(x0, top, 0.5, chin - top - 2, sk2, 0.5); // a soft shadow down one side
  // ears
  px(x0 - 0.5, 6.1, 0.6, 1.5, skin); px(x1 - 0.1, 6.1, 0.6, 1.5, skin); px(x0 - 0.5, 6.9, 0.3, 0.5, sk2); px(x1 + 0.2, 6.9, 0.3, 0.5, sk2);

  // ---- eyes, brows, nose, mouth
  const ey = 5.9, exL = 5.7, exR = 9.2; const eye = EYES[L.eyes % EYES.length]; const dark = '#16161c';
  for (const ex of [exL, exR]) {
    if (eye === 'dot') px(ex + 0.1, ey, 0.9, 0.9, dark);
    if (eye === 'round') { px(ex - 0.15, ey - 0.25, 1.4, 1.3, '#f6f6f8'); px(ex + 0.25, ey + 0.05, 0.7, 0.75, dark); }
    if (eye === 'narrow') px(ex - 0.1, ey + 0.25, 1.3, 0.45, dark);
    if (eye === 'wide') { px(ex - 0.3, ey - 0.3, 1.7, 1.35, '#f6f6f8'); px(ex + 0.2, ey - 0.05, 0.75, 0.85, dark); px(ex - 0.3, ey - 0.45, 1.7, 0.2, sk3); }
    if (eye === 'tired') { px(ex + 0.1, ey + 0.1, 0.9, 0.7, dark); px(ex - 0.15, ey - 0.15, 1.4, 0.35, sk2); px(ex - 0.1, ey + 1, 1.3, 0.3, sk3, 0.7); }
    if (eye === 'sharp') { px(ex - 0.15, ey + 0.05, 1.4, 0.65, dark); px(ex === exL ? ex + 0.95 : ex - 0.15, ey - 0.2, 0.5, 0.3, dark); px(ex + 0.4, ey + 0.2, 0.35, 0.3, '#f6f6f8'); }
  }
  const by = 4.75, brow = BROWS[L.brows % BROWS.length]; const bc = hairLo;
  if (brow === 'thin') { px(exL - 0.1, by, 1.4, 0.3, bc); px(exR - 0.2, by, 1.4, 0.3, bc); }
  if (brow === 'thick') { px(exL - 0.3, by - 0.2, 1.8, 0.6, bc); px(exR - 0.4, by - 0.2, 1.8, 0.6, bc); }
  if (brow === 'arched') { px(exL - 0.2, by, 0.7, 0.35, bc); px(exL + 0.4, by - 0.3, 0.9, 0.35, bc); px(exR + 0.6, by, 0.7, 0.35, bc); px(exR - 0.2, by - 0.3, 0.9, 0.35, bc); }
  if (brow === 'stern') { px(exL - 0.2, by - 0.25, 0.9, 0.4, bc); px(exL + 0.6, by + 0.1, 0.8, 0.4, bc); px(exR + 0.4, by - 0.25, 0.9, 0.4, bc); px(exR - 0.3, by + 0.1, 0.8, 0.4, bc); }
  if (brow === 'flat') { px(exL - 0.4, by + 0.05, 2, 0.4, bc); px(exR - 0.5, by + 0.05, 2, 0.4, bc); }
  if (brow === 'raised') { px(exL - 0.1, by - 0.5, 1.5, 0.35, bc); px(exR - 0.2, by + 0.05, 1.5, 0.35, bc); }
  const nose = NOSES[L.nose % NOSES.length];
  if (nose === 'small') px(cx - 0.3, 7.2, 0.6, 0.7, sk2);
  if (nose === 'button') { px(cx - 0.5, 7.5, 1, 0.55, sk2); px(cx - 0.25, 7.2, 0.5, 0.3, sk2, 0.6); }
  if (nose === 'broad') { px(cx - 0.9, 7.5, 1.8, 0.6, sk2); px(cx - 0.3, 6.8, 0.6, 0.7, sk2, 0.6); px(cx - 0.9, 7.9, 0.4, 0.25, sk3); px(cx + 0.5, 7.9, 0.4, 0.25, sk3); }
  if (nose === 'long') { px(cx - 0.3, 6.3, 0.6, 1.9, sk2); px(cx - 0.5, 7.9, 1, 0.35, sk2); }
  if (nose === 'pointed') { px(cx - 0.3, 6.6, 0.6, 1.3, sk2); px(cx + 0.3, 7.5, 0.45, 0.4, sk2); }
  px(cx - 1, 9, 2, 0.4, lip); px(cx - 0.6, 9.4, 1.2, 0.2, lip, 0.5);

  // ---- facial hair
  const fh = L.facial, jawY = chin - 1.5;
  if (fh === 'stubble') { px(x0 + 0.4, jawY - 0.6, x1 - x0 - 0.8, chin - jawY + 0.4, hair, 0.22); px(cx - 1.4, 8.4, 2.8, 0.5, hair, 0.22); }
  if (fh === 'mustache') px(cx - 1.4, 8.35, 2.8, 0.55, hair);
  if (fh === 'handlebar') { px(cx - 1.5, 8.35, 3, 0.5, hair); px(cx - 2, 8.6, 0.6, 0.9, hair); px(cx + 1.4, 8.6, 0.6, 0.9, hair); px(cx - 2.3, 8.1, 0.5, 0.6, hair); px(cx + 1.8, 8.1, 0.5, 0.6, hair); }
  if (fh === 'goatee') { px(cx - 1.3, 8.35, 2.6, 0.45, hair); px(cx - 1.3, 8.7, 0.5, 1.2, hair); px(cx + 0.8, 8.7, 0.5, 1.2, hair); px(cx - 1.1, 9.6, 2.2, chin - 9.6 + 0.1, hair); }
  if (fh === 'soulpatch') px(cx - 0.4, 9.55, 0.8, 0.8, hair);
  if (fh === 'chinstrap') { px(x0, 7.6, 0.6, chin - 8, hair); px(x1 - 0.6, 7.6, 0.6, chin - 8, hair); px(x0 + 0.4, chin - 0.7, x1 - x0 - 0.8, 0.7, hair); }
  if (fh === 'beard' || fh === 'longbeard') { px(x0, 7.4, 0.9, chin - 7.4, hair); px(x1 - 0.9, 7.4, 0.9, chin - 7.4, hair); px(x0 + 0.5, 9.5, x1 - x0 - 1, chin - 9.5 + 0.2, hair); px(cx - 1.5, 8.35, 3, 0.5, hair); px(cx - 1, 9, 2, 0.4, lip); px(x0 + 1, chin, x1 - x0 - 2, 0.5, hairLo); }
  if (fh === 'longbeard') { px(x0 + 0.8, chin, x1 - x0 - 1.6, 1.6, hair); px(x0 + 1.6, chin + 1.6, x1 - x0 - 3.2, 1.2, hair); px(cx - 0.8, chin + 2.8, 1.6, 0.7, hairLo); }
  if (fh === 'sideburns') { px(x0, 5.6, 0.7, 3.4, hair); px(x1 - 0.7, 5.6, 0.7, 3.4, hair); }

  // ---- hair in front
  const w = x1 - x0, capH = 1.5;
  const cap = (h = capH) => { hp(x0 - 0.2, top - 0.7, w + 0.4, h + 0.7); hp(x0 + 0.6, top - 1.1, w - 1.2, 0.5); };
  if (style === 'buzz') { hp(x0, top - 0.3, w, 1.3, hair, 0.8); hp(x0 + 0.6, top - 0.6, w - 1.2, 0.4, hair, 0.8); }
  if (style === 'shortfade') { cap(1.2); hp(x0, top + 1.2, 0.6, 2, hair, 0.5); hp(x1 - 0.6, top + 1.2, 0.6, 2, hair, 0.5); hp(x0 + 1.2, top - 0.9, w - 2.4, 0.4, hairHi); }
  if (style === 'hightop') { hp(x0 + 0.3, top - 3, w - 0.6, 4.2); hp(x0 + 0.3, top - 3, w - 0.6, 0.4, hairHi); hp(x0, top + 1.2, 0.6, 2.2, hair, 0.45); hp(x1 - 0.6, top + 1.2, 0.6, 2.2, hair, 0.45); }
  if (style === 'flattop') { hp(x0, top - 1.8, w, 3); hp(x0, top - 1.8, w, 0.35, hairHi); hp(x0, top + 1.2, 0.6, 1.8, hair, 0.5); hp(x1 - 0.6, top + 1.2, 0.6, 1.8, hair, 0.5); }
  if (style === 'afro') { hp(x0 - 0.4, top - 0.6, w + 0.8, 1.9); hp(x0 - 1.2, top + 1, 1.3, 2.6); hp(x1 - 0.1, top + 1, 1.3, 2.6); hp(x0 + 0.5, top - 2, 1.4, 0.5, hairHi); }
  if (style === 'puffs') { cap(1.2); hp(x0 - 1.8, top - 2.4, 3, 3); hp(x1 - 1.2, top - 2.4, 3, 3); hp(x0 - 1.3, top - 2.9, 2, 0.6); hp(x1 - 0.7, top - 2.9, 2, 0.6); px(x0 + 0.9, top - 0.2, 0.5, 0.7, O.trim); px(x1 - 1.4, top - 0.2, 0.5, 0.7, O.trim); }
  if (style === 'shortcurls') { for (let i = 0; i < 8; i++) hp(x0 - 0.3 + i * ((w + 0.6) / 8), top - 1.3 + (i % 2 ? 0 : 0.45), (w + 0.6) / 8 + 0.05, 2.5 - (i % 2 ? 0 : 0.45)); hp(x0 - 0.4, top + 1, 0.7, 1.4); hp(x1 - 0.3, top + 1, 0.7, 1.4); }
  if (style === 'longcurls') { for (let i = 0; i < 8; i++) hp(x0 - 0.4 + i * ((w + 0.8) / 8), top - 1.2 + (i % 2 ? 0.4 : 0), (w + 0.8) / 8 + 0.05, 2.3); hp(x0 - 0.9, top + 1, 1.1, 5); hp(x1 - 0.2, top + 1, 1.1, 5); }
  if (style === 'braids') { cap(1.4); for (let x = x0 + 0.5; x < x1 - 0.4; x += 1.2) hp(x, top - 0.7, 0.25, 2, hairLo); hp(x0 - 0.3, top + 1, 0.8, 3); hp(x1 - 0.5, top + 1, 0.8, 3); }
  if (style === 'cornrows') { hp(x0, top - 0.5, w, 1.7); hp(x0 + 0.6, top - 0.9, w - 1.2, 0.5); for (let x = x0 + 0.7; x < x1 - 0.4; x += 1) hp(x, top - 0.9, 0.28, 2.1, sk3); }
  if (style === 'locs') { hp(x0 - 0.2, top - 0.9, w + 0.4, 1.7); for (let x = x0 - 0.2; x < x1; x += 1.15) hp(x, top + 0.6, 0.8, 1.2 + ((Math.round(x * 3) % 2) ? 0.9 : 0), (Math.round(x * 3) % 2) ? hairLo : hair); hp(x0 - 0.9, top + 1, 0.9, 6); hp(x1, top + 1, 0.9, 6); }
  if (style === 'ponytail') { cap(1.3); hp(x0 + 0.4, top + 0.6, 2.2, 0.6); }
  if (style === 'longstraight') { cap(1.3); hp(cx - 0.15, top - 1.1, 0.3, 1.6, hairLo); hp(x0 - 0.9, top + 0.6, 1.2, 12 - top); hp(x1 - 0.3, top + 0.6, 1.2, 12 - top); }
  if (style === 'bob') { cap(1.4); hp(x0 - 0.9, top + 0.6, 1.3, 9.2 - top); hp(x1 - 0.4, top + 0.6, 1.3, 9.2 - top); hp(x0 + 0.2, top + 0.6, w - 0.4, 0.9); }
  if (style === 'wavy') { cap(1.3); hp(x0 - 0.8, top + 0.6, 1.1, 5.2); hp(x1 - 0.3, top + 0.6, 1.1, 5.2); hp(x0 + 0.3, top + 0.7, 2.6, 0.7); hp(x0 + 2.4, top + 0.5, 2.4, 0.5, hairHi); }
  if (style === 'bun') { cap(1.2); hp(cx - 1.2, top - 2.6, 2.4, 1.9); hp(cx - 0.7, top - 3, 1.4, 0.5); px(cx - 1, top - 0.9, 2, 0.3, hairLo); }
  if (style === 'topknot') { hp(x0 + 1, top - 0.7, w - 2, 1.4); hp(cx - 0.9, top - 2.5, 1.8, 1.9); hp(x0, top + 0.4, 0.6, 2.4, hair, 0.4); hp(x1 - 0.6, top + 0.4, 0.6, 2.4, hair, 0.4); }
  if (style === 'mohawk') { hp(cx - 1.1, top - 2.8, 2.2, 4); hp(cx - 0.6, top - 3.2, 1.2, 0.5, hairHi); hp(x0, top + 0.4, 0.6, 2.2, hair, 0.35); hp(x1 - 0.6, top + 0.4, 0.6, 2.2, hair, 0.35); }
  if (style === 'slick') { cap(1.1); hp(x0 + 0.8, top - 0.9, w - 1.6, 0.35, hairHi); hp(x0 + 1.6, top - 0.2, w - 3.2, 0.3, hairHi); hp(x0, top + 0.8, 0.6, 1.6); hp(x1 - 0.6, top + 0.8, 0.6, 1.6); }
  if (style === 'sidepart') { cap(1.3); hp(x0, top + 0.8, 3.4, 0.9); hp(x0, top + 1.6, 1.6, 0.7); hp(x0 + 3.2, top - 1, 0.3, 1.6, hairLo); hp(x1 - 0.6, top + 0.8, 0.6, 1.5); }
  if (style === 'pixie') { cap(1.3); hp(x0 + 0.3, top + 0.8, 1.2, 1.1); hp(x0 + 2.2, top + 0.8, 1.6, 0.7); hp(x1 - 2.4, top + 0.8, 1.2, 0.9); hp(x1 - 0.7, top + 0.8, 0.7, 1.8); hp(x0, top + 0.8, 0.5, 1.8); }

  // ---- hat
  const hatC = O.dark, hatHi = O.base, hat = L.hat;
  if (hat === 'cap') { px(x0 - 0.4, top - 1.5, w + 0.8, 2.5, hatHi); px(x0 + 0.4, top - 2, w - 0.8, 0.6, hatHi); px(x0 - 1.4, top + 0.8, w + 2.4, 0.7, hatC); px(cx - 0.9, top - 1, 1.8, 1.1, O.trim); }
  if (hat === 'cap_back') { px(x0 - 0.4, top - 1.5, w + 0.8, 2.3, hatHi); px(x0 + 0.4, top - 2, w - 0.8, 0.6, hatHi); px(cx - 1.4, top - 0.2, 2.8, 0.9, skin); px(cx - 1.4, top - 0.45, 2.8, 0.3, hatC); px(x1 + 0.2, top + 0.2, 1.1, 0.6, hatC); }
  if (hat === 'visor') { px(x0 - 0.3, top + 0.2, w + 0.6, 0.9, hatHi); px(x0 - 1.3, top + 1, w + 2.6, 0.6, hatC); }
  if (hat === 'beanie') { px(x0 - 0.4, top - 1.6, w + 0.8, 2.6, hatHi); px(x0 + 0.5, top - 2.2, w - 1, 0.7, hatHi); px(x0 - 0.5, top + 0.6, w + 1, 1, hatC); for (let x = x0 - 0.2; x < x1; x += 1.1) px(x, top + 0.6, 0.3, 1, hatHi); px(cx - 0.6, top - 2.9, 1.2, 0.8, O.trim); }
  if (hat === 'bucket') { px(x0 - 0.2, top - 1.6, w + 0.4, 2.2, hatHi); px(x0 + 0.5, top - 2, w - 1, 0.5, hatHi); px(x0 - 1.6, top + 0.5, w + 3.2, 1.1, hatC); px(x0 - 1, top + 1.5, w + 2, 0.3, hatC); }
  if (hat === 'headband') { px(x0 - 0.2, top + 0.9, w + 0.4, 0.8, O.light); px(x0 - 0.2, top + 1.5, w + 0.4, 0.2, O.dark); }
  if (hat === 'bandana') { px(x0 - 0.3, top - 1, w + 0.6, 2.2, O.light); px(x0 + 0.5, top - 1.5, w - 1, 0.6, O.light); px(x1 + 0.1, top + 0.7, 1.2, 0.6, O.light); px(x1 + 0.5, top + 1.3, 0.7, 0.9, O.light); for (let x = x0 + 0.4; x < x1 - 0.4; x += 1.6) px(x, top - 0.2, 0.5, 0.5, O.trim); }
  if (hat === 'fedora') { px(x0 + 0.2, top - 2.3, w - 0.4, 3, '#4a3a2c'); px(x0 + 0.2, top - 0.4, w - 0.4, 0.6, hatHi); px(x0 - 1.7, top + 0.6, w + 3.4, 0.7, '#3a2d22'); px(cx - 1.5, top - 2.5, 3, 0.4, '#5a4836'); }

  // ---- glasses
  const g = L.glasses, gy = ey - 0.45;
  if (g === 'round' || g === 'square') { const fr = '#20222a'; for (const ex of [exL, exR]) { px(ex - 0.5, gy, 2, 0.28, fr); px(ex - 0.5, gy + 1.5, 2, 0.28, fr); px(ex - 0.5, gy, 0.28, 1.78, fr); px(ex + 1.22, gy, 0.28, 1.78, fr); px(ex - 0.22, gy + 0.28, 1.44, 1.22, '#bfe3ff', 0.22); if (g === 'round') { px(ex - 0.5, gy, 0.28, 0.28, skin); px(ex + 1.22, gy, 0.28, 0.28, skin); px(ex - 0.5, gy + 1.5, 0.28, 0.28, skin); px(ex + 1.22, gy + 1.5, 0.28, 0.28, skin); } } px(exL + 1.5, gy + 0.6, exR - exL - 2, 0.28, fr); px(x0 - 0.3, gy + 0.5, exL - 0.5 - x0 + 0.3, 0.25, fr); px(exR + 1.5, gy + 0.5, x1 + 0.3 - exR - 1.5, 0.25, fr); }
  if (g === 'shades') { for (const ex of [exL, exR]) { px(ex - 0.55, gy + 0.05, 2.1, 1.5, '#0e0f13'); px(ex - 0.2, gy + 0.3, 0.7, 0.3, '#5b6170'); } px(exL + 1.5, gy + 0.3, exR - exL - 2, 0.35, '#0e0f13'); px(x0 - 0.3, gy + 0.3, 1, 0.3, '#0e0f13'); px(x1 - 0.7, gy + 0.3, 1, 0.3, '#0e0f13'); }
  if (g === 'aviators') { for (const ex of [exL, exR]) { px(ex - 0.55, gy + 0.05, 2.1, 1.1, '#3a4a3c'); px(ex - 0.25, gy + 1.15, 1.5, 0.5, '#3a4a3c'); px(ex - 0.55, gy - 0.1, 2.1, 0.22, '#d9b65a'); px(ex - 0.1, gy + 0.3, 0.6, 0.25, '#8fae93'); } px(exL + 1.5, gy + 0.1, exR - exL - 2, 0.25, '#d9b65a'); px(x0 - 0.3, gy + 0.2, 1, 0.22, '#d9b65a'); px(x1 - 0.7, gy + 0.2, 1, 0.22, '#d9b65a'); }
  if (g === 'monocle') { const ex = exR; px(ex - 0.5, gy, 2, 0.25, '#d9b65a'); px(ex - 0.5, gy + 1.55, 2, 0.25, '#d9b65a'); px(ex - 0.5, gy, 0.25, 1.8, '#d9b65a'); px(ex + 1.25, gy, 0.25, 1.8, '#d9b65a'); px(ex - 0.25, gy + 0.25, 1.5, 1.3, '#bfe3ff', 0.25); px(ex + 1.3, gy + 1.8, 0.2, 3.2, '#d9b65a', 0.8); }

  // ---- extra
  const e = L.extra;
  if (e === 'headset') { px(x0 - 0.2, top - 1.3, w + 0.4, 0.45, '#1c1d22'); px(x0 - 1, 5.4, 1.1, 2.6, '#1c1d22'); px(x0 - 0.8, 5.8, 0.6, 1.8, '#4b4f5a'); px(x0 - 0.9, top - 1, 0.5, 5.6 - top + 1, '#1c1d22'); px(x0 - 0.7, 7.9, 0.4, 1.3, '#1c1d22'); px(x0 - 0.7, 9, 2.6, 0.4, '#1c1d22'); px(x0 + 1.6, 8.8, 0.9, 0.8, '#3a3d46'); }
  if (e === 'whistle') { px(cx - neckW / 2 - 0.6, 11.2, 0.3, 2.4, '#d8dbe2'); px(cx + neckW / 2 + 0.3, 11.2, 0.3, 2.4, '#d8dbe2'); px(cx - neckW / 2 - 0.5, 13.5, neckW + 1, 0.3, '#d8dbe2'); px(cx - 0.6, 13.8, 1.4, 0.9, '#f2c230'); px(cx + 0.7, 14, 0.5, 0.4, '#f2c230'); px(cx - 0.3, 14.05, 0.4, 0.35, '#8a6a10'); }
  if (e === 'earring') { px(x1 + 0.1, 7.6, 0.5, 0.8, '#f5d142'); px(x1 + 0.2, 8.3, 0.3, 0.3, '#fff3a8'); }
  if (e === 'chain') { for (let i = 0; i < 5; i++) px(cx - 2 + i * 0.85, 12.2 + (i === 0 || i === 4 ? 0 : i === 2 ? 0.9 : 0.5), 0.6, 0.45, '#f5d142'); px(cx - 0.35, 13.5, 0.7, 0.8, '#fff3a8'); }
  if (e === 'towel') { px(cx + half - 3.4, sy - 0.2, 2.6, 4.6, '#f3f4f7'); px(cx + half - 3.4, sy + 3.2, 2.6, 0.4, O.light); px(cx + half - 3.4, sy + 3.8, 2.6, 0.25, O.light); }
  if (e === 'lanyard') { px(cx - neckW / 2 - 0.5, 11.3, 0.35, 2.6, O.trim); px(cx + neckW / 2 + 0.15, 11.3, 0.35, 2.6, O.trim); px(cx - 0.9, 13.8, 1.8, 1.8, '#f6f7fa'); px(cx - 0.6, 14.2, 1.2, 0.3, '#5a6070'); px(cx - 0.6, 14.8, 0.8, 0.25, '#9aa0ae'); }
  if (e === 'toothpick') { px(cx + 0.7, 8.95, 2.3, 0.22, '#e8d9a8'); px(cx + 2.8, 8.75, 0.5, 0.22, '#e8d9a8'); }
  return r;
}

/** The portrait as an inline SVG. `spec` is a 'coach2|…' string or a look object. */
export function coachPortrait(spec, size = 44, { teamColor = null, cls = 'sprite coach-portrait' } = {}) {
  const look = typeof spec === 'string' ? (parseCoach(spec) || DEFAULT_LOOK) : spec;
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${coachRects(look, { teamColor })}</svg>`;
}

/** The editor's categories: each option is { key, label, values } (values are indexes for the numeric parts). */
export const COACH_CATEGORIES = Object.freeze([
  { id: 'face', label: $t('shared.face'), icon: '🙂', options: [{ key: 'skin', label: $t('shared.skin_tone'), values: SKINS.map((_, i) => i), swatch: (i) => SKINS[i] }, { key: 'face', label: $t('shared.face_shape'), values: FACES.map((_, i) => i), name: (i) => labelOf(FACES[i]) }, { key: 'eyes', label: $t('shared.eyes'), values: EYES.map((_, i) => i), name: (i) => labelOf(EYES[i]) }, { key: 'brows', label: $t('shared.eyebrows'), values: BROWS.map((_, i) => i), name: (i) => labelOf(BROWS[i]) }, { key: 'nose', label: $t('shared.nose'), values: NOSES.map((_, i) => i), name: (i) => labelOf(NOSES[i]) }] },
  { id: 'hair', label: $t('shared.hair'), icon: '💇', options: [{ key: 'hair', label: $t('shared.hairstyle'), values: HAIRS, name: labelOf }, { key: 'hairColor', label: $t('shared.hair_color'), values: HAIR_COLORS2.map((_, i) => i), swatch: (i) => HAIR_COLORS2[i] }, { key: 'facial', label: $t('shared.facial_hair'), values: FACIALS, name: labelOf }] },
  { id: 'outfit', label: $t('shared.outfit'), icon: '👕', options: [{ key: 'outfit', label: $t('shared.outfit'), values: OUTFITS, name: labelOf }, { key: 'outfitColor', label: $t('shared.color'), values: OUTFIT_COLORS, swatch: (v) => (v === 'team' ? null : v === 'black' ? '#24262b' : v === 'grey' ? '#8a8f99' : v === 'white' ? '#e9ebef' : `hsl(${v} 55% 44%)`), name: (v) => (v === 'team' ? $t('shared.team') : '') }] },
  { id: 'extras', label: $t('shared.extras'), icon: '🧢', options: [{ key: 'hat', label: $t('shared.hat'), values: HATS, name: labelOf }, { key: 'glasses', label: $t('shared.glasses'), values: GLASSES, name: labelOf }, { key: 'extra', label: $t('shared.accessory'), values: EXTRAS, name: labelOf }] },
  { id: 'build', label: $t('shared.build'), icon: '💪', options: [{ key: 'build', label: $t('shared.build'), values: BUILDS.map((_, i) => i), name: (i) => labelOf(BUILDS[i]) }] },
]);
/** A random look from a 32-bit seed (the Surprise me button). */
export function randomLook(seed) {
  let s = (seed >>> 0) || 1; const next = (n) => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s % n; };
  const of = (list) => list[next(list.length)];
  return { skin: next(SKINS.length), face: next(FACES.length), eyes: next(EYES.length), brows: next(BROWS.length), nose: next(NOSES.length), hair: of(HAIRS), hairColor: next(HAIR_COLORS2.length), facial: next(3) ? 'none' : of(FACIALS), outfit: of(OUTFITS), outfitColor: next(3) ? 'team' : of(OUTFIT_COLORS), hat: next(3) ? 'none' : of(HATS), glasses: next(3) ? 'none' : of(GLASSES), extra: next(2) ? 'none' : of(EXTRAS), build: next(BUILDS.length) };
}
