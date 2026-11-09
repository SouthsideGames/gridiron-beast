// Task 8 football ability presentation: shared drawing primitives (docs/task8/FX_FOOTBALL_MATRIX.md). Pure string builders in field
// SVG units (1 unit = 1 yard); every value comes from the engine's frames and events, nothing here reads into the simulation.
// Determinism: `h` hashes integers to 0..1 so a frame redraws identically (no flicker). Cheap by design: a few shapes per effect,
// transforms and opacity over many elements.

export const f2 = (n) => (+n).toFixed(2);
export const cos = Math.cos, sin = Math.sin, PI = Math.PI;
export function h(a, b, c = 0) { let x = (a * 374761393 + b * 668265263 + c * 2246822519) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; }
export const op = (v) => f2(Math.max(0, Math.min(1, v)));
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = (k) => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k)); // smoothstep
export const easeOut = (k) => 1 - (1 - clamp01(k)) ** 2;
export const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Element palettes: bright (a), deep (b), pale (c). The field tint of field-view.js FIELD_TINT is the same hue family. */
export const ELEMENT = Object.freeze({
  Fire:     { a: '#ffb13d', b: '#ff5a2a', c: '#ffe2b0', glyph: '🔥' },
  Water:    { a: '#7fe0ff', b: '#2f8fd6', c: '#dff6ff', glyph: '💧' },
  Nature:   { a: '#b6f06a', b: '#3f9a3a', c: '#e4ffc2', glyph: '🍃' },
  Electric: { a: '#fff36a', b: '#ffd000', c: '#fffbc8', glyph: '⚡' },
  Ice:      { a: '#e6f7ff', b: '#8ac6ff', c: '#ffffff', glyph: '❄' },
  Wind:     { a: '#dffdf6', b: '#7ad8c8', c: '#f2fffc', glyph: '🌀' },
  Earth:    { a: '#d8c39a', b: '#8a6a44', c: '#efe3c8', glyph: '🪨' },
  Dark:     { a: '#9a7ad6', b: '#2a1a4a', c: '#cbb8ee', glyph: '🌑' },
  Light:    { a: '#fff6c8', b: '#ffd84a', c: '#fffdf0', glyph: '✦' },
  Metal:    { a: '#f4f4f8', b: '#9aa3b8', c: '#ffffff', glyph: '⚙' },
  Psychic:  { a: '#ff9ae6', b: '#a04ad6', c: '#ffd6f5', glyph: '◎' },
  Dragon:   { a: '#ffd36a', b: '#c03a6a', c: '#ffeec0', glyph: '🐉' },
});
export const elementOf = (el) => ELEMENT[el] || { a: '#ffe36c', b: '#c99a1a', c: '#fff6d0', glyph: '✦' };

// ------------------------------------------------------------ small pixel-art pieces
export const ring = (x, y, r, stroke, w, o = 1, extra = '') => `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(Math.max(0.01, r))}" fill="none" stroke="${stroke}" stroke-width="${f2(w)}" opacity="${op(o)}"${extra}/>`;
export const blob = (x, y, r, fill, o = 1) => `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(Math.max(0.01, r))}" fill="${fill}" opacity="${op(o)}"/>`;
export const disc = (x, y, rx, ry, fill, o = 1, extra = '') => `<ellipse cx="${f2(x)}" cy="${f2(y)}" rx="${f2(Math.max(0.01, rx))}" ry="${f2(Math.max(0.01, ry))}" fill="${fill}" opacity="${op(o)}"${extra}/>`;
export const line = (x1, y1, x2, y2, stroke, w, o = 1, extra = '') => `<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="${stroke}" stroke-width="${f2(w)}" opacity="${op(o)}" stroke-linecap="round"${extra}/>`;
export const rect = (x, y, w, hh, fill, o = 1, extra = '') => `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(Math.max(0.01, w))}" height="${f2(Math.max(0.01, hh))}" fill="${fill}" opacity="${op(o)}"${extra}/>`;
export const poly = (pts, fill, o = 1, extra = '') => `<polygon points="${pts.map(([x, y]) => `${f2(x)},${f2(y)}`).join(' ')}" fill="${fill}" opacity="${op(o)}"${extra}/>`;
export const path = (d, stroke, w, o = 1, extra = '') => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${f2(w)}" opacity="${op(o)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
export const pathOf = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${f2(x)} ${f2(y)}`).join(' ');
export const text = (x, y, size, fill, str, o = 1, extra = '') => `<text x="${f2(x)}" y="${f2(y)}" text-anchor="middle" font-size="${f2(size)}" font-weight="900" fill="${fill}" opacity="${op(o)}" stroke="#0b1a14" stroke-width="${f2(size * 0.16)}" paint-order="stroke"${extra}>${esc(str)}</text>`;
export const star = (x, y, r, fill, o = 1, n = 5) => { let p = []; for (let i = 0; i < n * 2; i++) { const a = -PI / 2 + i * PI / n, rr = i % 2 ? r * 0.45 : r; p.push([x + cos(a) * rr, y + sin(a) * rr]); } return poly(p, fill, o, ' stroke="#3a2a00" stroke-width="0.08"'); };
export const bolt = (x, y, s, fill, o = 1) => poly([[0, -1.2], [0.55, -1.2], [0.15, -0.2], [0.6, -0.2], [-0.35, 1.3], [-0.05, 0.15], [-0.5, 0.15]].map(([a, b]) => [x + a * s, y + b * s]), fill, o, ' stroke="#4a3a00" stroke-width="0.1"');
export const eye = (x, y, s, iris, open, o = 1) => { const ry = 0.55 * s * open; return `<g opacity="${op(o)}"><ellipse cx="${f2(x)}" cy="${f2(y)}" rx="${f2(1.1 * s)}" ry="${f2(Math.max(0.05, ry))}" fill="#f8f4ff" stroke="${iris}" stroke-width="${f2(0.18 * s)}"/>${open > 0.3 ? `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(0.38 * s * open)}" fill="${iris}"/><circle cx="${f2(x + 0.12 * s)}" cy="${f2(y - 0.12 * s)}" r="${f2(0.1 * s)}" fill="#fff"/>` : ''}</g>`; };
/** A jagged polyline from (x, y) along `ang` for `len`, `steps` segments (cracks, roots, arcs). */
export const jag = (x, y, ang, len, seed, steps = 4, wobble = 0.9) => { const pts = [[x, y]]; let px = x, py = y; for (let i = 1; i <= steps; i++) { const a = ang + (h(seed, i) - 0.5) * wobble; px += cos(a) * len / steps; py += sin(a) * len / steps; pts.push([px, py]); } return pts; };
/** A crescent (two arcs) centred at (x, y), opening toward `ang`, radius r. */
export const crescent = (x, y, r, ang, fill, o = 1, thick = 0.45) => { const a0 = ang - 1.1, a1 = ang + 1.1; const p1 = [x + cos(a0) * r, y + sin(a0) * r], p2 = [x + cos(a1) * r, y + sin(a1) * r]; const r2 = r * (1 - thick); return `<path d="M ${f2(p1[0])} ${f2(p1[1])} A ${f2(r)} ${f2(r)} 0 0 1 ${f2(p2[0])} ${f2(p2[1])} A ${f2(r2)} ${f2(r2)} 0 0 0 ${f2(p1[0])} ${f2(p1[1])} Z" fill="${fill}" opacity="${op(o)}"/>`; };
/** A hexagon (scales, plates, grid cells). */
export const hex = (x, y, r, fill, o = 1, extra = '') => poly([0, 1, 2, 3, 4, 5].map((j) => [x + cos(j * PI / 3) * r, y + sin(j * PI / 3) * r]), fill, o, extra);
/** A stone / crystal shard polygon at (x, y), size s, seeded shape. */
export const shard = (x, y, s, fill, seed, o = 1, extra = '') => poly([[0, -1], [0.7, -0.3], [0.5, 0.9], [-0.5, 0.9], [-0.8, -0.2]].map(([a, b], i) => [x + a * s * (0.8 + h(seed, i) * 0.4), y + b * s * (0.8 + h(seed, i, 1) * 0.4)]), fill, o, extra);
/** The unit vector behind a mover (its motion since the previous frame), default toward its own end zone. */
export const behind = (dx, dy, team) => { const sp = Math.hypot(dx, dy); return sp > 0.05 ? [-dx / sp, -dy / sp] : [0, team === 'off' ? 1 : -1]; };
/** A rotated group wrapper. */
export const rot = (deg, x, y, inner) => `<g transform="rotate(${f2(deg)} ${f2(x)} ${f2(y)})">${inner}</g>`;
export const group = (inner, extra = '') => `<g${extra}>${inner}</g>`;

/** Particle counts by quality: full keeps `n`, low about half, min at most two (the primary shapes stay at every quality). */
export function countFor(n, quality) { if (quality === 'min') return Math.min(2, n); if (quality === 'low') return Math.max(1, Math.ceil(n / 2)); return n; }
