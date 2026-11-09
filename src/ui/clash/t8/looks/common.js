// Beast Clash t8 looks: shared drawing pieces in stage pixels (one sprite pixel = c.u). Pure string builders, deterministic (`h`).
// Every piece is a few elements: transforms and opacity do the work, never per-frame allocation storms.
import { f2, h, op, clamp01, ease, easeOut, lerp, cos, sin, PI, ring, blob, disc, line, rect, poly, path, pathOf, text, star, bolt, eye, jag, crescent, hex, shard, rot, group } from '../../../fx/prims.js';

export { f2, h, op, clamp01, ease, easeOut, lerp, cos, sin, PI, ring, blob, disc, line, rect, poly, path, pathOf, text, star, bolt, eye, jag, crescent, hex, shard, rot, group };

/** Chest point of a geometry (feet x,y + size). */
/** Chest / head / feet points of a geometry ({ x, y, size }) or of the drawing context itself (the owner: { cx, cy, size }). */
const G = (g) => (g && g.cx != null ? { x: g.cx, y: g.cy, size: g.size } : g);
export const chest = (g0) => { const g = G(g0); return g ? [g.x, g.y - g.size * 0.55] : null; };
export const head = (g0) => { const g = G(g0); return g ? [g.x, g.y - g.size * 0.95] : null; };
export const feet = (g0) => { const g = G(g0); return g ? [g.x, g.y] : null; };
/** A point along the way from a to b at k, lifted by an arc (negative = up). */
export const along = (a, b, k, arc = 0) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k) - sin(clamp01(k) * PI) * arc];
export const angleTo = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
export const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
/** Owner -> target direction unit, default straight up. */
export function dirTo(c) { const a = chest(c), b = c.tgt ? chest(c.tgt) : null; if (!a || !b) return [0, -1]; const d = dist(a, b) || 1; return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]; }
export const pixel = (x, y, s, fill, o = 1) => `<rect x="${f2(Math.round(x - s / 2))}" y="${f2(Math.round(y - s / 2))}" width="${f2(Math.max(1, Math.round(s)))}" height="${f2(Math.max(1, Math.round(s)))}" fill="${fill}" opacity="${op(o)}"/>`;
/** A cue label at (x, y) (small, outlined). */
export const label = (x, y, size, fill, str, o = 1) => `<text x="${f2(x)}" y="${f2(y)}" text-anchor="middle" font-size="${f2(size)}" font-weight="900" fill="${fill}" stroke="#0b1a14" stroke-width="${f2(size * 0.22)}" paint-order="stroke" opacity="${op(o)}">${String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;
/** A number that floats up: green for heals, red for losses. */
export const floatNum = (x, y, u, str, fill, k, o = 1) => label(x, y - k * 2.5 * u, 1.6 * u, fill, str, o * (1 - k * k));

/** Flame tongues around (x, y), radius r: the body engulfed. */
export function flames(x, y, r, t, sid, n, o, L) { let s = ''; for (let i = 0; i < n; i++) { const a = (i / n) * 2 * PI + sin(t * 7 + i) * 0.2; const fl = r * (0.8 + 0.5 * h(sid, i, Math.floor(t * 10))); const bx = x + cos(a) * r * 0.55, by = y + sin(a) * r * 0.35; s += `<path d="M ${f2(bx - r * 0.2)} ${f2(by)} Q ${f2(bx + cos(a) * fl * 0.4)} ${f2(by - fl * 0.5)} ${f2(bx + cos(a) * fl * 0.5)} ${f2(by - fl)} Q ${f2(bx + r * 0.22)} ${f2(by - fl * 0.3)} ${f2(bx + r * 0.2)} ${f2(by)} Z" fill="${i % 2 ? L.a : L.b}" opacity="${op(o)}"/>`; } return s; }
/** Droplets from a to b over phase k. */
export function droplets(a, b, k, n, sid, L, o = 1, arc = 0) { let s = ''; for (let i = 0; i < n; i++) { const kk = clamp01(k * 1.3 - i * 0.08); if (kk <= 0) continue; const j = (h(sid, i) - 0.5) * 8; const p = along(a, b, kk, arc); s += disc(p[0] + j, p[1], 2.2, 3.2, i % 2 ? L.a : L.c, (1 - kk * 0.4) * o); } return s; }
/** A pixel leaf (diamond) at angle. */
export const leaf = (x, y, s, fill, ang, o = 1) => rot(ang, x, y, poly([[x, y - s], [x + s * 0.6, y], [x, y + s], [x - s * 0.6, y]], fill, o));
/** A jagged lightning path from a to b. */
export function lightning(a, b, seed, w, L, o = 1, segs = 6) { const pts = [a]; for (let i = 1; i < segs; i++) { const k = i / segs; const sp = (h(seed, i) - 0.5) * 14; pts.push([lerp(a[0], b[0], k) + sp, lerp(a[1], b[1], k) + (h(seed, i, 2) - 0.5) * 14]); } pts.push(b); const d = pathOf(pts); return path(d, L.b, w * 2.2, o * 0.85) + path(d, '#ffffff', w, o); }
/** A few sparks around (x, y). */
export function sparks(x, y, r, n, sid, L, o = 1, t = 0) { let s = ''; for (let i = 0; i < n; i++) { const a = h(sid, i) * 2 * PI + t * 2; const d = r * (0.5 + h(sid, i, 1) * 0.6); s += pixel(x + cos(a) * d, y + sin(a) * d, 2 + h(sid, i, 2) * 2, i % 2 ? L.a : L.c, o); } return s; }
/** Stone chunks scattered around (x, y). */
export function chunks(x, y, r, n, sid, L, o = 1, k = 1) { let s = ''; for (let i = 0; i < n; i++) { const a = h(sid, i) * 2 * PI; const d = r * k * (0.4 + h(sid, i, 1) * 0.8); s += shard(x + cos(a) * d, y + sin(a) * d * 0.5 - sin(k * PI) * r * 0.4, 2.5 + h(sid, i, 2) * 2.5, i % 2 ? L.a : L.b, sid + i, o); } return s; }
/** Snowflake (six arms). */
export function flake(x, y, r, fill, o = 1, t = 0) { let s = ''; for (let i = 0; i < 3; i++) { const a = i * PI / 3 + t; s += line(x - cos(a) * r, y - sin(a) * r, x + cos(a) * r, y + sin(a) * r, fill, Math.max(1, r * 0.22), o); } return s; }
/** A feather. */
export const feather = (x, y, s, fill, ang, o = 1) => rot(ang, x, y, `<path d="M ${f2(x)} ${f2(y - s)} Q ${f2(x + s * 0.55)} ${f2(y - s * 0.3)} ${f2(x)} ${f2(y + s)} Q ${f2(x - s * 0.55)} ${f2(y - s * 0.3)} ${f2(x)} ${f2(y - s)} Z" fill="${fill}" opacity="${op(o)}"/>` + line(x, y - s * 0.9, x, y + s * 0.9, '#ffffff', Math.max(0.6, s * 0.08), o * 0.7));
/** A wind arc (part of a circle) around (x, y). */
export const windArc = (x, y, r, a0, a1, stroke, w, o = 1) => `<path d="M ${f2(x + cos(a0) * r)} ${f2(y + sin(a0) * r)} A ${f2(r)} ${f2(r)} 0 ${a1 - a0 > PI ? 1 : 0} 1 ${f2(x + cos(a1) * r)} ${f2(y + sin(a1) * r)}" fill="none" stroke="${stroke}" stroke-width="${f2(w)}" stroke-linecap="round" opacity="${op(o)}"/>`;
/** A shadow silhouette (a dark blob with a pointed top) at (x, y) of size s. */
export const shadow = (x, y, s, fill, o = 1, lean = 0) => `<path d="M ${f2(x - s * 0.5)} ${f2(y)} Q ${f2(x - s * 0.55)} ${f2(y - s * 0.6)} ${f2(x - s * 0.2 + lean * s)} ${f2(y - s * 0.95)} L ${f2(x + s * 0.05 + lean * s)} ${f2(y - s * 0.7)} L ${f2(x + s * 0.3 + lean * s)} ${f2(y - s)} Q ${f2(x + s * 0.55)} ${f2(y - s * 0.5)} ${f2(x + s * 0.5)} ${f2(y)} Z" fill="${fill}" opacity="${op(o)}"/>`;
/** Light rays from (x, y). */
export function rays(x, y, r, n, t, fill, o = 1, w = 1.4) { let s = ''; for (let i = 0; i < n; i++) { const a = (i / n) * 2 * PI + t * 0.6; s += line(x + cos(a) * r * 0.3, y + sin(a) * r * 0.3, x + cos(a) * r, y + sin(a) * r, fill, w, o); } return s; }
/** A gear at (x, y). */
export function gear(x, y, r, fill, rotDeg, o = 1, teeth = 8) { let s = `<g transform="rotate(${f2(rotDeg)} ${f2(x)} ${f2(y)})" opacity="${op(o)}"><circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(r * 0.72)}" fill="${fill}"/><circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(r * 0.28)}" fill="#0b1a14"/>`; for (let i = 0; i < teeth; i++) { const a = (i / teeth) * 2 * PI; s += `<rect x="${f2(x + cos(a) * r * 0.75 - r * 0.14)}" y="${f2(y + sin(a) * r * 0.75 - r * 0.14)}" width="${f2(r * 0.28)}" height="${f2(r * 0.28)}" fill="${fill}" transform="rotate(${f2((a * 180) / PI)} ${f2(x + cos(a) * r * 0.75)} ${f2(y + sin(a) * r * 0.75)})"/>`; } return s + '</g>'; }
/** A metal plate (rounded rect with a rivet line). */
export const plate = (x, y, w, hh, fill, o = 1, extra = '') => rect(x - w / 2, y - hh / 2, w, hh, fill, o, ` rx="${f2(Math.min(w, hh) * 0.15)}" stroke="#f4f4f8" stroke-width="0.8"${extra}`) + line(x - w * 0.35, y, x + w * 0.35, y, '#0b1a14', 0.8, o * 0.5);
/** Psychic ring (dashed, rotating). */
export const psyRing = (x, y, r, L, t, o = 1, w = 1.4) => `<ellipse cx="${f2(x)}" cy="${f2(y)}" rx="${f2(r)}" ry="${f2(r * 0.45)}" fill="none" stroke="${L.a}" stroke-width="${f2(w)}" stroke-dasharray="${f2(r * 0.5)} ${f2(r * 0.3)}" transform="rotate(${f2(t * 90)} ${f2(x)} ${f2(y)})" opacity="${op(o)}"/>`;
/** A dragon crest / silhouette head pointing along dir. */
export function dragonHead(x, y, s, fill, ang, o = 1) { return rot(ang, x, y, poly([[x - s, y - s * 0.35], [x + s * 0.2, y - s * 0.55], [x + s, y - s * 0.1], [x + s * 0.75, y], [x + s, y + s * 0.15], [x + s * 0.2, y + s * 0.5], [x - s, y + s * 0.3], [x - s * 0.6, y]], fill, o, ' stroke="#3a1020" stroke-width="0.8"')); }
/** The arena ground ellipse under a point. */
export const groundRing = (x, y, r, stroke, w, o = 1, extra = '') => `<ellipse cx="${f2(x)}" cy="${f2(y)}" rx="${f2(r)}" ry="${f2(r * 0.4)}" fill="none" stroke="${stroke}" stroke-width="${f2(w)}" opacity="${op(o)}"${extra}/>`;
export const groundDisc = (x, y, r, fill, o = 1) => disc(x, y, r, r * 0.4, fill, o);
/** A projectile body: an outlined square with a bright core, trail squares behind along dir. */
export function bodyShot(p, dir, size, L, n, sid, o = 1, core = '#ffffff') { let s = `<rect x="${f2(p[0] - size / 2 - 1)}" y="${f2(p[1] - size / 2 - 1)}" width="${f2(size + 2)}" height="${f2(size + 2)}" fill="${L.b}" opacity="${op(o)}"/><rect x="${f2(p[0] - size / 2)}" y="${f2(p[1] - size / 2)}" width="${f2(size)}" height="${f2(size)}" fill="${L.a}" opacity="${op(o)}"/><rect x="${f2(p[0] - size * 0.2)}" y="${f2(p[1] - size * 0.2)}" width="${f2(size * 0.4)}" height="${f2(size * 0.4)}" fill="${core}" opacity="${op(o)}"/>`; for (let i = 1; i <= n; i++) { const d = i * size * 0.7; s += pixel(p[0] - dir[0] * d + (h(sid, i) - 0.5) * 3, p[1] - dir[1] * d + (h(sid, i, 1) - 0.5) * 3, size * (0.6 - i * 0.08), i % 2 ? L.a : L.b, o * (1 - i / (n + 1))); } return s; }
/** A soft impact flash at p. */
export const flash = (p, r, fill, o = 1) => blob(p[0], p[1], r, fill, o);
/** A hit burst ring + rays at p (the primary impact shape). */
export function burst(p, r, L, k, n, sid, o = 1) { let s = ring(p[0], p[1], r * (0.3 + k), L.a, Math.max(1, r * 0.12 * (1 - k)), (1 - k) * o); for (let i = 0; i < n; i++) { const a = h(sid, i) * 2 * PI; const d = r * (0.4 + k * 0.9); s += pixel(p[0] + cos(a) * d, p[1] + sin(a) * d, 3 - k * 1.5, i % 2 ? L.a : L.c, (1 - k) * o); } return s; }
