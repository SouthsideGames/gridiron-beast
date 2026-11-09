// Beast Clash t8 presentation: the shared information pieces (spec §13; never hidden by effects). The shared status badge (light-grey
// disc, dark neutral symbol, remaining-turn number, the shield pool; ice encases it while a Deep Winter freeze holds), the ability icon
// beside a monster (element glyph, cooldown number and recharge arc, ready glow, armed outline, Eye of the Storm cross, Circuit
// Breaker's broken circuit), charge pips, and the turn-order marker. Pure string builders in stage pixels (`hu` = one HUD unit).
import { f2, op, clamp01 } from '../../fx/prims.js';
import { STATUS_GLYPH } from '../../fx/overhead.js';

const BADGE = { shielded: '#93c5fd', guarded: '#cbd5e1', empowered: '#fbbf24', quickened: '#86efac' };
/** The shared status badge: light-grey disc, dark neutral symbol, remaining-turn number; ice encases it while a Deep Winter freeze holds. */
export function clashStatusBadge(x, y, hu, st, { pop = 1, o = 1, frozen = 0, t = 0 } = {}) {
  const r = 1.05 * hu; const g = STATUS_GLYPH[st.id] || '•'; const fill = BADGE[st.id] ? '#eef2ff' : '#e9e9ee';
  let s = `<g transform="translate(${f2(x)} ${f2(y)}) scale(${f2(pop)})" opacity="${op(o)}"><circle r="${f2(r)}" fill="${fill}" stroke="#23232a" stroke-width="${f2(0.14 * hu)}"/><text y="${f2(0.42 * hu)}" text-anchor="middle" font-size="${f2(1.3 * hu)}" font-weight="900" fill="#23232a">${g}</text>`;
  if (st.remaining != null && st.remaining > 0) s += `<circle cx="${f2(1.05 * hu)}" cy="${f2(0.6 * hu)}" r="${f2(0.55 * hu)}" fill="#23232a"/><text x="${f2(1.05 * hu)}" y="${f2(0.88 * hu)}" text-anchor="middle" font-size="${f2(0.8 * hu)}" font-weight="900" fill="#f4f4f8">${st.remaining}</text>`;
  if (st.pool != null && st.id === 'shielded') s += `<text y="${f2(-1.25 * hu)}" text-anchor="middle" font-size="${f2(0.75 * hu)}" font-weight="900" fill="#dbeafe" stroke="#0b1a14" stroke-width="${f2(0.16 * hu)}" paint-order="stroke">${st.pool}</text>`;
  if (frozen > 0) { // Deep Winter: ice encases the existing badge, the count stays readable
    const pts = [0, 1, 2, 3, 4, 5].map((j) => { const a = j * Math.PI / 3 - Math.PI / 6; const rr = r * (1.45 + 0.08 * ((j * 7) % 3)); return `${f2(Math.cos(a) * rr)},${f2(Math.sin(a) * rr)}`; }).join(' ');
    s += `<polygon points="${pts}" fill="#bfe8ff" fill-opacity="0.35" stroke="#e8f7ff" stroke-width="${f2(0.16 * hu)}"/><line x1="${f2(-r * 0.6)}" y1="${f2(-r * 0.9)}" x2="${f2(r * 0.2)}" y2="${f2(-r * 0.2)}" stroke="#ffffff" stroke-width="${f2(0.1 * hu)}" opacity="0.8"/>`; }
  return s + '</g>';
}
/** The ability icon beside a monster: the element glyph on a dark rounded square, a cooldown number (grey while cooling) and a thin recharge arc, a ready glow. */
export function abilityIcon(x, y, hu, L, { cd = 0, cdMax = 0, ready = true, restricted = false, broken = false, armed = false, o = 1 } = {}) {
  const r = 1.15 * hu; let s = `<g transform="translate(${f2(x)} ${f2(y)})" opacity="${op(o)}">`;
  s += `<rect x="${f2(-r)}" y="${f2(-r)}" width="${f2(2 * r)}" height="${f2(2 * r)}" rx="${f2(0.35 * hu)}" fill="#0b1a14" fill-opacity="0.85" stroke="${ready && !restricted ? L.a : '#6b7280'}" stroke-width="${f2((armed ? 0.26 : 0.16) * hu)}"/>`;
  s += `<text y="${f2(0.45 * hu)}" text-anchor="middle" font-size="${f2(1.35 * hu)}" fill="${ready && !restricted ? L.a : '#9ca3af'}" opacity="${cd > 0 ? 0.45 : 1}">${L.glyph}</text>`;
  if (cd > 0) { const frac = cdMax ? clamp01(1 - cd / cdMax) : 0; const R = r * 0.95; const a1 = -Math.PI / 2 + frac * 2 * Math.PI; s += `<path d="M 0 ${f2(-R)} A ${f2(R)} ${f2(R)} 0 ${frac > 0.5 ? 1 : 0} 1 ${f2(Math.cos(a1) * R)} ${f2(Math.sin(a1) * R)}" fill="none" stroke="${L.a}" stroke-width="${f2(0.16 * hu)}" opacity="0.7"/><text y="${f2(0.4 * hu)}" text-anchor="middle" font-size="${f2(1.15 * hu)}" font-weight="900" fill="#f4f4f8" stroke="#0b1a14" stroke-width="${f2(0.2 * hu)}" paint-order="stroke">${cd}</text>`; }
  if (restricted) s += `<line x1="${f2(-r)}" y1="${f2(-r)}" x2="${f2(r)}" y2="${f2(r)}" stroke="#f87171" stroke-width="${f2(0.22 * hu)}"/><line x1="${f2(r)}" y1="${f2(-r)}" x2="${f2(-r)}" y2="${f2(r)}" stroke="#f87171" stroke-width="${f2(0.22 * hu)}"/>`;
  if (broken) s += `<path d="M ${f2(-r * 1.3)} 0 L ${f2(-r * 0.4)} 0 L ${f2(-r * 0.15)} ${f2(-0.5 * hu)} M ${f2(r * 0.15)} ${f2(0.5 * hu)} L ${f2(r * 0.4)} 0 L ${f2(r * 1.3)} 0" fill="none" stroke="#fff36a" stroke-width="${f2(0.22 * hu)}" stroke-linecap="round"/>`;
  return s + '</g>';
}
/** Charge pips under the ability icon (n of max). */
export function pips(x, y, hu, n, max, colour, o = 1) { let s = ''; const w = 0.7 * hu, gap = 0.22 * hu; const x0 = x - (max * w + (max - 1) * gap) / 2; for (let i = 0; i < max; i++) s += `<rect x="${f2(x0 + i * (w + gap))}" y="${f2(y)}" width="${f2(w)}" height="${f2(0.45 * hu)}" rx="${f2(0.1 * hu)}" fill="${i < n ? colour : '#0b1a14'}" stroke="#e9e9ee" stroke-width="${f2(0.08 * hu)}" opacity="${op(o)}"/>`; return s; }
/** The turn-order marker (1 / 2) over an active monster. */
export function turnMarker(x, y, hu, n, o = 1) { return `<g transform="translate(${f2(x)} ${f2(y)})" opacity="${op(o)}"><polygon points="0,${f2(0.9 * hu)} ${f2(-0.75 * hu)},${f2(-0.2 * hu)} ${f2(0.75 * hu)},${f2(-0.2 * hu)}" fill="#facc15" stroke="#0b1a14" stroke-width="${f2(0.12 * hu)}"/><text y="${f2(0.1 * hu)}" text-anchor="middle" font-size="${f2(0.75 * hu)}" font-weight="900" fill="#0b1a14">${n}</text></g>`; }

