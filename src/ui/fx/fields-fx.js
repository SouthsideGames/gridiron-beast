// Task 8 fields on the field (spec §11, §13; Dex "Visuals" rows of the zone abilities). field-view.js draws every functional field
// as its tinted, outlined rectangle; this module adds the element's readable decoration (ground marks only, never a head badge) and
// the creation reveal of a field created at this snap (`fresh`), ability-specific where the Dex says so: Impact Pyre blooms from the
// owner's spot, Burning Wake expands symmetrically, Tsunami Line's giant raindrop, Frostmark's frost sweep, Permafrost's wave from the
// line, Bloom Break's shoots, Bramble Trap's seed, Charge Strip's nodes, Gear Grid's clockwork, Bulwark's corner posts, Blackout
// Pocket's canopy, Echo Landing's ripples. Everything stays inside the rectangle, the ball, routes and yard lines stay readable
// (low opacity, thin strokes), and every quality level keeps the primary marks (`countFor` thins the secondary particles).
import { f2, h, op, clamp01, ease, easeOut, cos, sin, PI, elementOf, countFor, ring, blob, disc, line, rect, poly, path, pathOf, star, hex, jag } from './prims.js';

/** Per-ability reveal timing: `lead` seconds drawn before the snap (the host may pre-roll), `dur` seconds of reveal after it. */
export const FIELD_REVEAL = Object.freeze({
  'WAT-06-F': { lead: 1.1, dur: 0.5 }, 'FIR-06-F': { lead: 0.6, dur: 0.6 }, 'FIR-02-F': { lead: 0.4, dur: 0.6 }, 'ICE-01-F': { lead: 0.5, dur: 0.8 }, 'ICE-04-F': { lead: 0.2, dur: 0.8 },
  'NAT-01-F': { lead: 0.5, dur: 0.8 }, 'NAT-05-F': { lead: 0.9, dur: 0.6 }, 'ELE-02-F': { lead: 0.5, dur: 0.6 }, 'ELE-04-F': { lead: 0.5, dur: 0.6 }, 'WIN-01-F': { lead: 0.5, dur: 0.7 }, 'WIN-04-F': { lead: 0.5, dur: 0.7 },
  'DAR-01-F': { lead: 0.4, dur: 0.7 }, 'DAR-05-F': { lead: 0.6, dur: 0.6 }, 'LIG-01-F': { lead: 0.4, dur: 0.7 }, 'MET-03-F': { lead: 0.7, dur: 0.8 }, 'MET-05-F': { lead: 0.6, dur: 0.6 }, 'PSY-01-F': { lead: 0.5, dur: 0.7 }, 'PSY-04-F': { lead: 0.7, dur: 0.7 }, 'WAT-01-F': { lead: 0.3, dur: 0.6 },
});

const mid = (r) => [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2];
const W = (r) => r.x1 - r.x0, H = (r) => r.y1 - r.y0;
const pt = (r, u, v) => [r.x0 + W(r) * u, r.y0 + H(r) * v];
const inHole = (r, x, y) => (r.holes || []).some((hh) => x >= hh.x0 && x <= hh.x1 && y >= hh.y0 && y <= hh.y1);

/** Decoration and reveal for one field. r = svg rect {x0, x1, y0, y1, holes?}; k = reveal progress 0..1 (1 when not fresh). */
export function fieldDecor(f, r, c) {
  const L = elementOf(f.type); const k = c.fresh ? c.k : 1; const q = c.quality; const sid = (String(f.id).charCodeAt(1) || 7) * 17 + c.seed;
  const draw = DECOR[f.type]; let under = '', over = '';
  if (k > 0 && draw) under += draw(f, r, { ...c, L, k, sid });
  const rev = REVEAL[f.ability]; if (c.fresh && rev && k < 1) { const x = rev(f, r, { ...c, L, k, sid }); under += x.under || ''; over += x.over || ''; }
  else if (c.fresh && !rev && k < 1) under += genericReveal(r, L, k);
  // Prism Break holes: the removed footprint, cracked and dark (the parent effect never returns there).
  for (const hh of r.holes || []) under += rect(hh.x0, hh.y0, hh.x1 - hh.x0, hh.y1 - hh.y0, '#0b1a14', 0.45) + rect(hh.x0, hh.y0, hh.x1 - hh.x0, hh.y1 - hh.y0, 'none', 0.8, ' stroke="#e9e9ee" stroke-width="0.14" stroke-dasharray="0.5 0.4"');
  return { under, over };
}
function genericReveal(r, L, k) { const [mx, my] = mid(r); const e = ease(k); return disc(mx, my, W(r) / 2 * e + 0.2, H(r) / 2 * e + 0.2, L.a, 0.35 * (1 - k)) + rect(r.x0, r.y0, W(r), H(r), 'none', 1 - k, ` stroke="${L.c}" stroke-width="${f2(0.6 * (1 - k) + 0.1)}"`); }

// ------------------------------------------------------------ element decoration (persistent, low cost)
const DECOR = {
  Fire(f, r, c) { // embers drift up inside, a warm inner border
    let s = rect(r.x0 + 0.3, r.y0 + 0.3, W(r) - 0.6, H(r) - 0.6, 'none', 0.5 * c.k, ` stroke="${c.L.b}" stroke-width="0.25" stroke-dasharray="1.2 0.8"`);
    const n = countFor(7, c.quality); for (let i = 0; i < n; i++) { const u = h(c.sid, i, 1), ph = (c.t * 0.45 + h(c.sid, i, 2)) % 1; const [x, y] = pt(r, u, 1 - ph); if (inHole(r, x, y)) continue; s += blob(x, y, 0.22 + 0.18 * (1 - ph), i % 2 ? c.L.a : c.L.b, (1 - ph) * 0.9 * c.k); }
    return s; },
  Water(f, r, c) { // a wet sheen with drifting ripples
    let s = rect(r.x0 + 0.25, r.y0 + 0.25, W(r) - 0.5, H(r) - 0.5, c.L.c, 0.12 * c.k, ' rx="0.4"');
    const n = countFor(4, c.quality); for (let i = 0; i < n; i++) { const ph = (c.t * 0.5 + i / n) % 1; const [x, y] = pt(r, 0.2 + 0.6 * h(c.sid, i, 1), 0.2 + 0.6 * h(c.sid, i, 2)); if (inHole(r, x, y)) continue; const rr = 0.4 + ph * Math.min(2.2, W(r) / 3); s += disc(x, y, rr, rr * 0.5, 'none', (1 - ph) * 0.7 * c.k, ` stroke="${c.L.c}" stroke-width="0.18"`); }
    return s; },
  Nature(f, r, c) { // shoots standing in clearly outlined vegetation
    let s = rect(r.x0 + 0.2, r.y0 + 0.2, W(r) - 0.4, H(r) - 0.4, 'none', 0.9 * c.k, ` stroke="#2a6a1a" stroke-width="0.3" stroke-dasharray="0.9 0.5" rx="0.3"`);
    const n = countFor(9, c.quality); const grow = c.k; for (let i = 0; i < n; i++) { const [x, y] = pt(r, 0.1 + 0.8 * h(c.sid, i, 1), 0.15 + 0.75 * h(c.sid, i, 2)); if (inHole(r, x, y)) continue; const len = (0.9 + h(c.sid, i, 3) * 0.7) * grow; const sway = sin(c.t * 2 + i) * 0.15;
      s += line(x, y, x + sway, y - len, '#3f9a3a', 0.22, 0.95) + disc(x + sway + 0.25, y - len + 0.1, 0.32, 0.18, c.L.a, 0.95, ` transform="rotate(-35 ${f2(x + sway + 0.25)} ${f2(y - len + 0.1)})"`); }
    return s; },
  Electric(f, r, c) { // ground arcs crossing, a clear boundary, small sparks
    let s = rect(r.x0, r.y0, W(r), H(r), 'none', 0.9 * c.k, ` stroke="${c.L.a}" stroke-width="0.22"`);
    const n = countFor(3, c.quality); for (let i = 0; i < n; i++) { const v = (i + 0.5) / n; const pts = jag(r.x0 + 0.3, r.y0 + H(r) * v, 0, W(r) - 0.6, c.sid + i + Math.floor(c.t * 6), 6, 0.5).map(([x, y]) => [x, Math.max(r.y0 + 0.2, Math.min(r.y1 - 0.2, y))]); s += path(pathOf(pts), i % 2 ? c.L.a : c.L.b, 0.16, 0.75 * c.k); }
    const m = countFor(4, c.quality); for (let i = 0; i < m; i++) { const ph = (c.t * 2 + h(c.sid, i, 5)) % 1; if (ph > 0.3) continue; const [x, y] = pt(r, h(c.sid, i + Math.floor(c.t * 2), 6), h(c.sid, i + Math.floor(c.t * 2), 7)); s += star(x, y, 0.3, c.L.a, (1 - ph / 0.3) * c.k, 4); }
    return s; },
  Ice(f, r, c) { // a translucent frosted sheet with crystals
    let s = rect(r.x0 + 0.2, r.y0 + 0.2, W(r) - 0.4, H(r) - 0.4, '#ffffff', 0.14 * c.k, ' rx="0.3"');
    const n = countFor(8, c.quality); for (let i = 0; i < n; i++) { const [x, y] = pt(r, 0.08 + 0.84 * h(c.sid, i, 1), 0.1 + 0.8 * h(c.sid, i, 2)); if (inHole(r, x, y)) continue; const appear = clamp01((c.k - h(c.sid, i, 3) * 0.6) / 0.4); if (appear <= 0) continue; s += star(x, y, (0.3 + h(c.sid, i, 4) * 0.25) * appear, '#ffffff', 0.85 * appear, 4); }
    return s; },
  Wind(f, r, c) { // parallel runway lines along the length, gusts drifting along them
    let s = ''; const lanes = Math.max(2, Math.min(5, Math.round(W(r) / 1.6))); const dirUp = f.ownerTeam !== 'def'; // offense attacks up
    for (let i = 0; i < lanes; i++) { const x = r.x0 + W(r) * ((i + 0.5) / lanes); const top = r.y0 + 0.3, bot = r.y1 - 0.3; const reach = top + (bot - top) * (1 - c.k); s += line(x, dirUp ? bot : top, x, dirUp ? reach : bot - (bot - top) * (1 - c.k), c.L.a, 0.18, 0.75) ; }
    const n = countFor(lanes, c.quality); for (let i = 0; i < n; i++) { const x = r.x0 + W(r) * ((i + 0.5) / lanes); const ph = (c.t * 0.8 + h(c.sid, i, 2)) % 1; const y = dirUp ? r.y1 - H(r) * ph : r.y0 + H(r) * ph; const len = Math.min(2.2, H(r) / 3); s += line(x, y, x, dirUp ? y + len : y - len, '#ffffff', 0.3, (1 - ph) * 0.9 * c.k); }
    return s; },
  Dark(f, r, c) { // a low violet shadow with a clear edge and faint wisps
    let s = rect(r.x0 + 0.15, r.y0 + 0.15, W(r) - 0.3, H(r) - 0.3, '#1a0f2a', 0.28 * c.k, ' rx="0.5"') + rect(r.x0, r.y0, W(r), H(r), 'none', 0.9 * c.k, ` stroke="${c.L.a}" stroke-width="0.2"`);
    const n = countFor(4, c.quality); for (let i = 0; i < n; i++) { const ph = (c.t * 0.3 + h(c.sid, i, 1)) % 1; const [x, y] = pt(r, 0.15 + 0.7 * h(c.sid, i, 2), 0.9 - 0.8 * ph); if (inHole(r, x, y)) continue; s += disc(x, y, 0.9 + ph * 0.8, 0.35, '#2a1a4a', (1 - ph) * 0.4 * c.k); }
    return s; },
  Light(f, r, c) { // a golden low rectangle; small clocks travel the perimeter
    let s = rect(r.x0 + 0.2, r.y0 + 0.2, W(r) - 0.4, H(r) - 0.4, '#ffd84a', 0.1 * c.k, ' rx="0.3"') + rect(r.x0, r.y0, W(r), H(r), 'none', 0.9 * c.k, ' stroke="#ffd84a" stroke-width="0.22"');
    const per = 2 * (W(r) + H(r)); const n = countFor(4, c.quality);
    for (let i = 0; i < n; i++) { let d = ((c.t * 1.4 + (i / n) * per) % per); let x, y; if (d < W(r)) { x = r.x0 + d; y = r.y0; } else if (d < W(r) + H(r)) { x = r.x1; y = r.y0 + (d - W(r)); } else if (d < 2 * W(r) + H(r)) { x = r.x1 - (d - W(r) - H(r)); y = r.y1; } else { x = r.x0; y = r.y1 - (d - 2 * W(r) - H(r)); }
      s += `<g opacity="${op(0.95 * c.k)}"><circle cx="${f2(x)}" cy="${f2(y)}" r="0.42" fill="#fff6c8" stroke="#8a6a1a" stroke-width="0.08"/><line x1="${f2(x)}" y1="${f2(y)}" x2="${f2(x + cos(c.t * 4 + i) * 0.28)}" y2="${f2(y + sin(c.t * 4 + i) * 0.28)}" stroke="#8a6a1a" stroke-width="0.09"/></g>`; }
    return s; },
  Metal(f, r, c) { // a flat iron grid assembling line by line; slow gears turning
    let s = ''; const cols = Math.max(2, Math.round(W(r) / 2)), rows = Math.max(1, Math.round(H(r) / 2)); const total = cols + rows + 2; let i = 0;
    for (let cx = 0; cx <= cols; cx++, i++) { const reach = clamp01(c.k * total - i); if (reach <= 0) continue; const x = r.x0 + W(r) * (cx / cols); s += line(x, r.y0, x, r.y0 + H(r) * reach, '#3e4452', 0.24, 0.75) + line(x, r.y0, x, r.y0 + H(r) * reach, '#e4e8f0', 0.08, 0.8); }
    for (let ry = 0; ry <= rows; ry++, i++) { const reach = clamp01(c.k * total - i); if (reach <= 0) continue; const y = r.y0 + H(r) * (ry / rows); s += line(r.x0, y, r.x0 + W(r) * reach, y, '#3e4452', 0.24, 0.75) + line(r.x0, y, r.x0 + W(r) * reach, y, '#e4e8f0', 0.08, 0.8); }
    const n = countFor(3, c.quality); for (let g = 0; g < n; g++) { const [x, y] = pt(r, 0.2 + 0.6 * h(c.sid, g, 1), 0.2 + 0.6 * h(c.sid, g, 2)); if (inHole(r, x, y)) continue; const ang = c.t * (g % 2 ? 40 : -40); let gear = ''; for (let tth = 0; tth < 6; tth++) { const a = (tth * PI) / 3; gear += `<rect x="${f2(x - 0.12)}" y="${f2(y - 0.62)}" width="0.24" height="0.36" fill="#cfd5e2" stroke="#3e4452" stroke-width="0.06" transform="rotate(${f2((a * 180) / PI)} ${f2(x)} ${f2(y)})"/>`; } s += `<g opacity="${op(0.85 * c.k)}" transform="rotate(${f2(ang)} ${f2(x)} ${f2(y)})"><circle cx="${f2(x)}" cy="${f2(y)}" r="0.55" fill="#cfd5e2" stroke="#3e4452" stroke-width="0.12"/><circle cx="${f2(x)}" cy="${f2(y)}" r="0.18" fill="#3e4452"/>${gear}</g>`; }
    return s; },
  Psychic(f, r, c) { // concentric rings and inward-flowing particles toward the centre
    const [mx, my] = mid(r); const rx = W(r) / 2, ry = H(r) / 2; let s = '';
    for (let i = 0; i < 3; i++) { const ph = (c.t * 0.35 + i / 3) % 1; s += disc(mx, my, Math.max(0.2, rx * (1 - ph)), Math.max(0.1, ry * (1 - ph)), 'none', (0.25 + 0.55 * ph) * c.k, ` stroke="${c.L.a}" stroke-width="0.16"`); }
    const n = countFor(8, c.quality); for (let i = 0; i < n; i++) { const a = h(c.sid, i, 1) * 2 * PI; const ph = (c.t * 0.7 + h(c.sid, i, 2)) % 1; const x = mx + cos(a) * rx * (1 - ph) * 0.95, y = my + sin(a) * ry * (1 - ph) * 0.95; if (inHole(r, x, y)) continue; s += blob(x, y, 0.2, c.L.c, (0.3 + 0.7 * ph) * c.k); }
    return s; },
  Dragon() { return ''; }, Steam() { return ''; },
};

// ------------------------------------------------------------ ability-specific reveals (fresh field, k 0..1 over lead + dur)
const REVEAL = {
  'FIR-02-F'(f, r, c) { const [mx, my] = mid(r); const e = ease(c.k); return { under: disc(mx, my, W(r) / 2 * e + 0.3, H(r) / 2 * e + 0.3, c.L.a, 0.5 * (1 - c.k)) + ring(mx, my, 0.3 + e * Math.max(W(r), H(r)) * 0.6, c.L.b, 0.35 * (1 - c.k) + 0.05, 1 - c.k) }; }, // blooms at the owner's start spot
  'FIR-06-F'(f, r, c) { const [mx] = mid(r); const e = ease(c.k); const half = W(r) / 2 * e; return { under: rect(mx - half, r.y0, half * 2, H(r), c.L.b, 0.35 * (1 - c.k)) + line(mx - half, r.y0, mx - half, r.y1, c.L.a, 0.5, 1 - c.k) + line(mx + half, r.y0, mx + half, r.y1, c.L.a, 0.5, 1 - c.k) }; }, // symmetric lateral expansion of the earned width
  'WAT-06-F'(f, r, c) { // a giant raindrop falls from the sky onto the strip, then splashes full width
    const [mx, my] = mid(r); const lead = FIELD_REVEAL['WAT-06-F'].lead, dur = FIELD_REVEAL['WAT-06-F'].dur; const tt = c.k * (lead + dur); // 0..lead: fall; lead..: splash
    if (tt < lead) { const kf = ease(tt / lead); const y = my - 24 * (1 - kf) - 3; const sh = 0.3 + 0.7 * kf; return { over: `<g opacity="0.95"><path d="M ${f2(mx)} ${f2(y - 4.2 * sh)} Q ${f2(mx + 2.6 * sh)} ${f2(y - 0.6 * sh)} ${f2(mx)} ${f2(y + 1.6 * sh)} Q ${f2(mx - 2.6 * sh)} ${f2(y - 0.6 * sh)} ${f2(mx)} ${f2(y - 4.2 * sh)} Z" fill="${c.L.b}" stroke="${c.L.c}" stroke-width="0.25"/><circle cx="${f2(mx - 0.7 * sh)}" cy="${f2(y - 0.4 * sh)}" r="${f2(0.45 * sh)}" fill="#ffffff" opacity="0.7"/></g>`, under: disc(mx, my, 1 + 2.5 * kf, 0.6 + 1.2 * kf, '#0b1a14', 0.25 * kf) }; }
    const ks = clamp01((tt - lead) / dur); const half = W(r) / 2 * ease(ks); let s = rect(mx - half, r.y0 - 0.4, half * 2, H(r) + 0.8, c.L.a, 0.45 * (1 - ks)); const n = countFor(8, c.quality); for (let i = 0; i < n; i++) { const a = PI + (i / (n - 1)) * PI; const d = (2 + h(c.sid, i) * 3) * ks; s += blob(mx + cos(a) * d * 3, my + sin(a) * d - ks * 1.5, 0.35, c.L.c, 1 - ks); } return { under: s }; },
  'ICE-01-F'(f, r, c) { const e = ease(c.k); const x = r.x0 + W(r) * e; return { under: rect(r.x0, r.y0, Math.max(0.01, x - r.x0), H(r), '#ffffff', 0.3 * (1 - c.k)) + line(x, r.y0, x, r.y1, '#ffffff', 0.45, 1 - c.k * 0.5) }; }, // frost sweeps across
  'ICE-04-F'(f, r, c) { const e = ease(c.k); const y = r.y0 + H(r) * e; return { under: rect(r.x0, r.y0, W(r), Math.max(0.01, y - r.y0), '#ffffff', 0.3 * (1 - c.k)) + line(r.x0, y, r.x1, y, '#ffffff', 0.45, 1 - c.k * 0.5) }; }, // a frost wave from the line of scrimmage into the backfield
  'NAT-05-F'(f, r, c) { const [mx, my] = mid(r); const lead = FIELD_REVEAL['NAT-05-F'].lead, dur = FIELD_REVEAL['NAT-05-F'].dur; const tt = c.k * (lead + dur);
    if (tt < lead) { const kf = ease(tt / lead); const y = my - 10 * (1 - kf); return { over: disc(mx, y, 0.45, 0.6, '#6a4a22', 0.95, ' stroke="#2a4a1a" stroke-width="0.1"') + blob(mx + 0.15, y - 0.2, 0.12, '#e4ffc2', 0.9) }; } // the seed drops beneath the chosen defender
    const kb = clamp01((tt - lead) / dur); let s = ''; const n = countFor(8, c.quality); for (let i = 0; i < n; i++) { const a = (i / n) * 2 * PI; const d = (0.5 + Math.min(W(r), H(r)) / 2 * 0.8) * ease(kb); s += line(mx, my, mx + cos(a) * d, my + sin(a) * d * 0.7, '#2a4a1a', 0.3, 1 - kb * 0.5); } return { under: s }; }, // ...and blooms
  'ELE-02-F'(f, r, c) { const [mx] = mid(r); const e = ease(c.k); let s = blob(mx, r.y1 - 0.3, 0.6, c.L.a, 1) + blob(mx, r.y0 + 0.3, 0.6 * e, c.L.a, e); // two nodes at the rectangle's ends; the arc climbs between them
    if (e > 0) s += path(pathOf(jag(mx, r.y1 - 0.3, -PI / 2, (H(r) - 0.6) * e, c.sid + Math.floor(c.t * 8), 7, 0.9)), c.L.a, 0.3, 1); return { under: s }; },
  'DAR-05-F'(f, r, c) { const e = ease(c.k); const y = r.y0 - 6 * (1 - e); return { under: rect(r.x0, y, W(r), H(r), '#120a20', 0.45 * (1 - c.k) + 0.0, ' rx="0.6"') }; }, // the canopy settles from above
  'PSY-04-F'(f, r, c) { const [mx, my] = mid(r); let s = ''; for (let i = 0; i < 3; i++) { const ph = clamp01(c.k * 1.5 - i * 0.2); s += disc(mx, my, W(r) / 2 * ph, H(r) / 2 * ph, 'none', 1 - ph, ` stroke="${c.L.a}" stroke-width="0.2"`); } return { under: s }; }, // ripples reform into the rectangle
  'MET-05-F'(f, r, c) { const e = ease(c.k); let s = ''; for (const [x, y] of [[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1]]) s += rect(x - 0.45, y - 0.45 - 1.4 * e, 0.9, 0.9 + 1.4 * e, '#cfd5e2', 1, ' stroke="#5a6070" stroke-width="0.1"'); return { under: s }; }, // four iron corner posts rise
};
/** Persistent extras some abilities keep on their field after the reveal (corner posts, nodes). */
export const FIELD_EXTRA = {
  'MET-05-F'(f, r) { let s = ''; for (const [x, y] of [[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1]]) s += rect(x - 0.45, y - 1.85, 0.9, 2.3, '#cfd5e2', 1, ' stroke="#5a6070" stroke-width="0.1"') + rect(x - 0.3, y - 2.05, 0.6, 0.3, '#9aa3b8', 1); return s; },
  'ELE-02-F'(f, r, c) { const [mx] = mid(r); return blob(mx, r.y1 - 0.3, 0.55, c.L.a, 1) + blob(mx, r.y0 + 0.3, 0.55, c.L.a, 1) + path(pathOf(jag(mx, r.y1 - 0.3, -PI / 2, H(r) - 0.6, c.sid + Math.floor(c.t * 8), 7, 0.6)), c.L.a, 0.22, 0.8); },
};
