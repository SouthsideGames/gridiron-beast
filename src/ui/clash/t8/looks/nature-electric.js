// Beast Clash t8 looks: Nature and Electric (Dex "Visuals" rows NAT-01-C..06-C, ELE-01-C..06-C). Contract: src/ui/clash/t8/fx-t8.js.
import { f2, h, op, clamp01, ease, easeOut, lerp, cos, sin, PI, ring, blob, disc, line, rect, poly, path, pathOf, star, rot, chest, head, feet, along, dirTo, dist, pixel, label, leaf, lightning, sparks, groundRing, groundDisc, bodyShot, burst, flash, jag, shard, spriteGhost } from './common.js';
import { pips } from '../badges.js';
import { t as $t } from '../../../../text/index.js';

/** Living allies of the owner's side in lineup order (ids). */
const allies = (c) => c.st.order[c.side].filter((id) => !c.st.S[id].ko);
/** A root (jagged thick line) from a to b, grown to k. */
const root = (a, b, k, L, o, sid, w = 3) => { const pts = []; const n = 6; for (let i = 0; i <= n; i++) { const kk = (i / n) * k; const p = along(a, b, kk); const nx = -(b[1] - a[1]), ny = b[0] - a[0]; const len = Math.hypot(nx, ny) || 1; const wob = (h(sid, i) - 0.5) * 8 * (i && i < n ? 1 : 0); pts.push([p[0] + (nx / len) * wob, p[1] + (ny / len) * wob]); } return path(pathOf(pts), '#3a2a12', w + 1.6, o) + path(pathOf(pts), L.b, w, o) + path(pathOf(pts), L.a, Math.max(0.8, w * 0.35), o * 0.9); };
/** A mushroom cap. */
const mushroom = (x, y, s, L, o) => rect(x - s * 0.15, y - s * 0.2, s * 0.3, s * 0.6, '#e4ffc2', o) + `<path d="M ${f2(x - s * 0.6)} ${f2(y - s * 0.15)} Q ${f2(x)} ${f2(y - s * 1.1)} ${f2(x + s * 0.6)} ${f2(y - s * 0.15)} Z" fill="${L.b}" stroke="${L.a}" stroke-width="0.8" opacity="${op(o)}"/>` + pixel(x - s * 0.2, y - s * 0.5, s * 0.18, '#e4ffc2', o) + pixel(x + s * 0.2, y - s * 0.45, s * 0.15, '#e4ffc2', o);


// Owner revision 2026-11-15 (all Electric Clash looks): real lightning. A bolt is a jagged, forking channel re-struck every few frames:
// a pale-blue haze, a yellow glow and a white-hot core, with side branches; strikes end in a starburst flash, and charged bodies crackle.
const HAZE = '#9ad8ff';
/** Jagged points from a to b (deterministic from seed). */
function boltPts(a, b, seed, jit = 0.14, segLen = 9) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; const n = Math.max(4, Math.round(L / segLen)); const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L; const pts = [a]; let off = 0;
  for (let i = 1; i < n; i++) { const k = i / n; off = off * 0.45 + (h(seed, i) - 0.5) * L * jit; const env = Math.sin(k * PI); pts.push([lerp(a[0], b[0], k) + nx * off * env, lerp(a[1], b[1], k) + ny * off * env]); } pts.push(b); return pts; }
/** A lightning bolt from a to b: haze, glow, core, plus `br` forks. w = core width. */
function bolt(a, b, seed, o = 1, w = 1.6, br = 2) { if (o <= 0) return ''; const pts = boltPts(a, b, seed); const fl = 0.75 + 0.25 * h(seed, 99); const d = pathOf(pts);
  let s = path(d, HAZE, w * 6, o * 0.22 * fl) + path(d, '#ffe14a', w * 2.6, o * 0.9 * fl) + path(d, '#ffffff', w, o * fl);
  for (let i = 0; i < br; i++) { const j = 1 + Math.floor(h(seed, 40 + i) * (pts.length - 2)); const from = pts[j]; const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + (h(seed, 50 + i) < 0.5 ? -1 : 1) * (0.5 + h(seed, 60 + i) * 0.6); const len = Math.hypot(b[0] - a[0], b[1] - a[1]) * (0.18 + h(seed, 70 + i) * 0.2);
    const bp = boltPts(from, [from[0] + cos(ang) * len, from[1] + sin(ang) * len], seed + 7 * i + 3, 0.22, 6); const bd = pathOf(bp); s += path(bd, '#ffe14a', w * 1.4, o * 0.7 * fl) + path(bd, '#ffffff', w * 0.55, o * 0.85 * fl); }
  return s; }
/** The impact of a strike at p: a white flash, a ring and short jagged rays. */
function zap(p, r, seed, o = 1, k = 0) { if (o <= 0) return ''; let s = `<circle cx="${f2(p[0])}" cy="${f2(p[1])}" r="${f2(r * (0.35 + 0.25 * k))}" fill="#ffffff" opacity="${op(o * (1 - k) * 0.9)}"/>` + `<circle cx="${f2(p[0])}" cy="${f2(p[1])}" r="${f2(r * (0.5 + k * 0.7))}" fill="none" stroke="#ffe14a" stroke-width="${f2(2.4 * (1 - k) + 0.6)}" opacity="${op(o * (1 - k))}"/>`;
  for (let i = 0; i < 7; i++) { const a = (i / 7) * 2 * PI + h(seed, i) * 0.6; const r0 = r * (0.3 + k * 0.3), r1 = r * (0.85 + h(seed, i, 1) * 0.5) * (0.6 + k * 0.6); const pts = boltPts([p[0] + cos(a) * r0, p[1] + sin(a) * r0], [p[0] + cos(a) * r1, p[1] + sin(a) * r1], seed + i * 5, 0.3, 4); s += path(pathOf(pts), '#ffe14a', 2, o * (1 - k)) + path(pathOf(pts), '#ffffff', 0.8, o * (1 - k)); }
  return s; }
/** Little arcs crawling over a body at (x, y), radius r. */
function crackle(x, y, r, seed, o = 1, n = 4) { if (o <= 0) return ''; let s = ''; for (let i = 0; i < n; i++) { const a0 = h(seed, i) * 2 * PI, a1 = a0 + 0.6 + h(seed, i, 2) * 0.9; const rr = r * (0.75 + h(seed, i, 3) * 0.4); const pts = boltPts([x + cos(a0) * rr, y + sin(a0) * rr], [x + cos(a1) * rr, y + sin(a1) * rr], seed + i * 11, 0.45, 4); s += path(pathOf(pts), '#ffe14a', 1.8, o * 0.85) + path(pathOf(pts), '#ffffff', 0.7, o); } return s; }
/** A strike out of the sky onto (x, groundY), with a ground flash. */
const skyStrike = (x, gy, seed, o = 1, w = 2) => bolt([x + (h(seed, 1) - 0.5) * 30, -4], [x, gy], seed, o, w, 3) + `<ellipse cx="${f2(x)}" cy="${f2(gy + 1)}" rx="${f2(w * 9)}" ry="${f2(w * 3)}" fill="#fffbc8" opacity="${op(o * 0.7)}"/>`;
/** A plasma ball (the body as pure electricity) at p. */
const plasma = (p, r, seed, o = 1) => `<circle cx="${f2(p[0])}" cy="${f2(p[1])}" r="${f2(r * 1.5)}" fill="${HAZE}" opacity="${op(o * 0.18)}"/><circle cx="${f2(p[0])}" cy="${f2(p[1])}" r="${f2(r)}" fill="#ffe14a" opacity="${op(o * 0.55)}"/><circle cx="${f2(p[0])}" cy="${f2(p[1])}" r="${f2(r * 0.5)}" fill="#ffffff" opacity="${op(o * 0.95)}"/>` + crackle(p[0], p[1], r * 1.15, seed, o, 4);
const fs = (c, rate = 15) => c.sid + Math.floor(c.t * rate) * 13; // flicker seed: the bolt re-strikes ~15 times a second


// Owner revision 2026-11-15 (NAT-02-C, NAT-04-C, NAT-05-C): richer living plants. Leaves are real leaf shapes with a midrib, many leaves
// share one path; mushrooms have spotted domed caps and gills; spore clouds are soft layered puffs; vines are bark-and-moss braids
// with thorns. Within the 60-element budget per frame.
const BARK = '#5a3a1a', MOSS = '#3f9a3a', LEAF = '#7ad35a', LEAF_L = '#b6f06a', CAP = '#d9534f', SPORE = '#d8ff9a';
/** One leaf as path data (tip along ang, length s). */
const leafD = (x, y, s, ang) => { const c = cos(ang), n = sin(ang); const tip = [x + c * s, y + n * s]; const w = s * 0.38; const m = [x + c * s * 0.5, y + n * s * 0.5]; return `M ${f2(x)} ${f2(y)} Q ${f2(m[0] - n * w)} ${f2(m[1] + c * w)} ${f2(tip[0])} ${f2(tip[1])} Q ${f2(m[0] + n * w)} ${f2(m[1] - c * w)} ${f2(x)} ${f2(y)} Z `; };
/** Many leaves in two paths (fill + midribs). `ls`: [[x, y, s, ang], ...]. */
const leaves = (ls, o = 1, fill = LEAF) => { if (o <= 0 || !ls.length) return ''; let d = '', r = ''; for (const [x, y, s, a] of ls) { d += leafD(x, y, s, a); r += `M ${f2(x)} ${f2(y)} L ${f2(x + cos(a) * s * 0.85)} ${f2(y + sin(a) * s * 0.85)} `; } return `<path d="${d}" fill="${fill}" stroke="${MOSS}" stroke-width="0.8" opacity="${op(o)}"/><path d="${r}" stroke="${MOSS}" stroke-width="0.6" fill="none" opacity="${op(o * 0.8)}"/>`; };
/** A spotted mushroom (stem, domed cap with gills and spots) standing on (x, y), size s. */
const toadstool = (x, y, s, o = 1) => (o <= 0 || s <= 0 ? '' : `<path d="M ${f2(x - s * 0.18)} ${f2(y)} Q ${f2(x - s * 0.22)} ${f2(y - s * 0.45)} ${f2(x - s * 0.14)} ${f2(y - s * 0.6)} L ${f2(x + s * 0.14)} ${f2(y - s * 0.6)} Q ${f2(x + s * 0.22)} ${f2(y - s * 0.45)} ${f2(x + s * 0.18)} ${f2(y)} Z" fill="#f4ecd8" stroke="#8a7a5a" stroke-width="0.8" opacity="${op(o)}"/><path d="M ${f2(x - s * 0.62)} ${f2(y - s * 0.55)} Q ${f2(x - s * 0.6)} ${f2(y - s * 1.25)} ${f2(x)} ${f2(y - s * 1.28)} Q ${f2(x + s * 0.6)} ${f2(y - s * 1.25)} ${f2(x + s * 0.62)} ${f2(y - s * 0.55)} Q ${f2(x)} ${f2(y - s * 0.68)} ${f2(x - s * 0.62)} ${f2(y - s * 0.55)} Z" fill="${CAP}" stroke="#7a1f1c" stroke-width="1" opacity="${op(o)}"/><path d="M ${f2(x - s * 0.3)} ${f2(y - s * 0.95)} m -${f2(s * 0.1)} 0 a ${f2(s * 0.1)} ${f2(s * 0.1)} 0 1 0 ${f2(s * 0.2)} 0 a ${f2(s * 0.1)} ${f2(s * 0.1)} 0 1 0 -${f2(s * 0.2)} 0 M ${f2(x + s * 0.12)} ${f2(y - s * 1.1)} m -${f2(s * 0.12)} 0 a ${f2(s * 0.12)} ${f2(s * 0.12)} 0 1 0 ${f2(s * 0.24)} 0 a ${f2(s * 0.12)} ${f2(s * 0.12)} 0 1 0 -${f2(s * 0.24)} 0 M ${f2(x + s * 0.38)} ${f2(y - s * 0.8)} m -${f2(s * 0.07)} 0 a ${f2(s * 0.07)} ${f2(s * 0.07)} 0 1 0 ${f2(s * 0.14)} 0 a ${f2(s * 0.07)} ${f2(s * 0.07)} 0 1 0 -${f2(s * 0.14)} 0" fill="#fff6e8" opacity="${op(o)}"/>`);
/** A soft spore cloud: three layered puffs and a spray of spore dots (one path). */
function sporeCloud(p, r, k, sid, o = 1) { if (o <= 0) return ''; let s = ''; for (let i = 0; i < 3; i++) { const a = (i / 3) * 2 * PI + 0.4; s += `<circle cx="${f2(p[0] + cos(a) * r * 0.35)}" cy="${f2(p[1] + sin(a) * r * 0.25)}" r="${f2(r * (0.5 + k * 0.3))}" fill="${i ? '#a8e070' : SPORE}" opacity="${op(o * (0.35 - i * 0.08))}"/>`; }
  let d = ''; for (let i = 0; i < 14; i++) { const a = h(sid, i) * 2 * PI; const rr = r * (0.3 + k * (0.6 + h(sid, i, 1) * 0.6)); const q = [p[0] + cos(a) * rr, p[1] + sin(a) * rr * 0.8 - k * r * 0.3]; const z = 0.9 + h(sid, i, 2) * 1.3; d += `M ${f2(q[0] - z)} ${f2(q[1])} a ${f2(z)} ${f2(z)} 0 1 0 ${f2(z * 2)} 0 a ${f2(z)} ${f2(z)} 0 1 0 -${f2(z * 2)} 0 `; }
  return s + `<path d="${d}" fill="${SPORE}" opacity="${op(o)}"/>`; }

export const NATURE_ELECTRIC = {
  // NAT-01-C Second Spring: a seed drops beneath the fallen ally's place at the back of the lineup; the glowing bud closes, then blossoms open as the ally returns to reserve. No extra status.
  'NAT-01-C': { id: 'NAT-01-C', name: $t('fx.second_spring'), element: 'Nature', dur: 1.0, lead: 0.3, move: true, na: ['persistence'], cue: () => $t('fx.second_spring'),
    o: (c) => { const side = c.ev.target ? c.ev.target[0] : c.side; const n = c.st.order[side].filter((id) => !c.st.S[id].ko).length; const sl = c.slot(side, Math.max(0, n)); if (!sl) return ''; const a = chest(c); if (c.age < 0) { const kk = 1 + c.age / 0.3; return blob(a[0], a[1] - kk * 6, 2.2 * c.u * kk, c.L.a, kk) + ring(c.cx, c.cy - c.size * 0.5, c.size * 0.3 * kk, c.L.c, 1.2, 1 - kk); } const k = ease(clamp01(c.age / 0.5)); const p = along(a, [sl.x, sl.y], k, 30); let s = ''; if (k < 1) s += `<ellipse cx="${f2(p[0])}" cy="${f2(p[1])}" rx="${f2(2 * c.u)}" ry="${f2(2.8 * c.u)}" fill="#8a5a2a" stroke="${c.L.a}" stroke-width="1" transform="rotate(${f2(k * 200)} ${f2(p[0])} ${f2(p[1])})"/>`; else { const k2 = clamp01((c.age - 0.5) / 0.5); const bh = sl.size * 0.5 * k2; s += line(sl.x, sl.y, sl.x, sl.y - bh, c.L.b, 2.4) + `<ellipse cx="${f2(sl.x)}" cy="${f2(sl.y - bh)}" rx="${f2(3 * c.u * (0.5 + k2 * 0.5))}" ry="${f2(4 * c.u * (0.5 + k2 * 0.5))}" fill="#ff8fb1" stroke="${c.L.a}" stroke-width="1.2" opacity="${op(0.9)}"/>` + blob(sl.x, sl.y - bh, 1.2 * c.u * (0.6 + 0.4 * sin(c.t * 8)), '#fff3a3', 0.9); } return s; },
    sub: { revive: { dur: 1.1, impact: true, target: true, o: (c) => { const g = c.tgt; if (!g) return ''; const k = ease(c.k); let s = ''; for (let i = 0; i < 6; i++) { const a = (i / 6) * 2 * PI + 0.3; const d = (0.3 + k * 0.9) * g.size * 0.5; s += `<ellipse cx="${f2(g.x + cos(a) * d)}" cy="${f2(g.y - g.size * 0.45 + sin(a) * d * 0.8)}" rx="${f2(3 * c.u)}" ry="${f2(5 * c.u)}" fill="#ff8fb1" stroke="#fff3a3" stroke-width="0.8" transform="rotate(${f2((a * 180) / PI + 90)} ${f2(g.x + cos(a) * d)} ${f2(g.y - g.size * 0.45 + sin(a) * d * 0.8)})" opacity="${op(1 - c.k)}"/>`; } s += blob(g.x, g.y - g.size * 0.45, 2.5 * c.u * (1 - c.k), '#fff3a3', 1 - c.k) + label(g.x, g.y - g.size - 1.3 * c.hu, 1.15 * c.hu, c.L.a, `${$t('fx.returns_at_hp', { hp: c.ev.hp })}`, 1 - c.k * c.k); return s; } } } },
  // NAT-02-C Spore Detonation: the claw scatters mushrooms over the target; the spores swell and burst for the bonus damage; the harmful badge breaks apart. No field.
  'NAT-02-C': { id: 'NAT-02-C', name: $t('fx.spore_detonation'), element: 'Nature', dur: 1.1, lead: 0.25, move: true, cue: () => $t('fx.spore_detonation_2'),
    // The claw flings spotted toadstools that root on the target, swell, and burst into glowing spore clouds.
    o: (c) => { const g = c.tgt; if (!g) return ''; const a = chest(c);
      if (c.age < 0) { const kk = 1 + c.age / 0.25; return toadstool(c.cx + c.size * 0.3, c.cy - c.size * 0.6, c.size * 0.22 * kk, kk) + sporeCloud([c.cx + c.size * 0.3, c.cy - c.size * 0.8], c.size * 0.2, 0.2, c.sid, kk * 0.6); }
      let s = ''; const n = c.n(4); const pop = clamp01((c.age - 0.75) / 0.35);
      for (let i = 0; i < n; i++) { const kk = ease(clamp01(c.age / 0.45 - i * 0.06)); if (kk <= 0) continue; const spot = [g.x + (i - (n - 1) / 2) * g.size * 0.28, g.y - g.size * (0.15 + h(c.sid, i) * 0.55)]; const p = along(a, spot, kk, 22);
        const swell = kk >= 1 ? 1 + 0.45 * sin(Math.min(1, (c.age - 0.45) / 0.3) * PI * 0.5) : 0.8; s += toadstool(p[0], p[1], g.size * 0.2 * swell, 1 - pop); }
      if (pop > 0) s += sporeCloud([g.x, g.y - g.size * 0.45], g.size * 0.55, pop, c.sid, 1 - pop * 0.7);
      return s; },
    sub: { damage: { dur: 0.5, impact: true, o: (c) => (c.tgt ? burst(chest(c.tgt), c.tgt.size * 0.5, c.L, c.k, c.n(6), c.sid) : '') },
      status_end: { dur: 0.7, impact: true, o: (c) => { const g = c.tgt; if (!g) return ''; const x = g.x, y = g.y - g.size - 1.5 * c.hu; let s = ''; for (let i = 0; i < 5; i++) { const a = (i / 5) * 2 * PI - 1.2; const d = c.k * 3 * c.hu; s += shard(x + cos(a) * d, y + sin(a) * d + c.k * c.k * 2.5 * c.hu, 0.55 * c.hu, '#e9e9ee', c.sid + i, 1 - c.k, ' stroke="#23232a" stroke-width="0.6"'); } return s; } } } },
  // NAT-03-C Last Root: the impact bends the body, roots brace into the ground, bark cracks, one green leaf glows as HP stops at 1; the roots retract. No lingering badge.
  'NAT-03-C': { id: 'NAT-03-C', name: $t('fx.last_root'), element: 'Nature', kind: 'survive', stage: 'activation', dur: 1.3, lead: 0.15, na: ['movement', 'target', 'persistence'], cue: () => $t('fx.last_root_2'), shake: true,
    u: (c) => { const k = ease(clamp01(c.age / 0.3)) * (1 - clamp01((c.age - 0.9) / 0.4)); let s = ''; for (let i = 0; i < 5; i++) { const a = PI * 0.15 + (i / 4) * PI * 0.7; s += root([c.cx, c.cy], [c.cx + cos(a) * c.size * 0.6, c.cy + sin(a) * c.size * 0.28 + 3], k, c.L, 1, c.sid + i, 2.4); } return s; },
    o: (c) => { if (c.age < 0) return ''; let s = ''; const k = c.k; if (c.age < 0.5) for (let i = 0; i < 3; i++) s += path(pathOf(jag(c.cx + (i - 1) * c.size * 0.2, c.cy - c.size * 0.3, -PI / 2 + (i - 1) * 0.4, c.size * 0.35 * clamp01(c.age / 0.3), c.sid + i, 3)), '#3a2a12', 1.6, 1 - c.age / 0.5); const glow = 0.6 + 0.4 * sin(c.t * 7); s += leaf(c.cx + c.size * 0.3, c.cy - c.size * 1.0 - k * 4, 2.2 * c.u, c.L.a, -30, (1 - clamp01((c.age - 0.9) / 0.4)) * glow) + label(c.cx, c.top - 2.8 * c.hu, 1.2 * c.hu, c.L.a, '1 HP', 1 - k * k); return s; } },
  // NAT-04-C Canopy Assist: Florant's antlers form a leafy arch; the helper rushes through it from reserve, strikes and retreats; the arch dissolves.
  'NAT-04-C': { id: 'NAT-04-C', name: $t('fx.canopy_assist'), element: 'Nature', dur: 1.5, lead: 0.3, move: true, cue: () => $t('fx.canopy_assist'),
    init: () => ({ helper: null }), track: (ind, e) => { if (e.kind === 'trigger') ind.helper = e.target; },
    // Florant's antlers grow into a living arch of bark and leaves with blossoms; the helper rushes through it as a leaf-trailed green
    // echo of its own sprite, strikes and returns; the arch sheds its leaves.
    o: (c) => { const k0 = clamp01((c.age + 0.3) / 0.3); const ax = c.cx, ay = c.cy - c.size * 0.95; const W = c.size * 0.55 * k0, H = c.size * 0.6 * k0; const shed = c.fade;
      const arch = `M ${f2(ax - W)} ${f2(ay + c.size * 0.35)} Q ${f2(ax - W * 1.05)} ${f2(ay - H)} ${f2(ax)} ${f2(ay - H * 1.05)} Q ${f2(ax + W * 1.05)} ${f2(ay - H)} ${f2(ax + W)} ${f2(ay + c.size * 0.35)}`;
      let s = path(arch, BARK, 5, shed) + path(arch, '#8a5a2a', 2, shed) ; const ls = []; const n = c.n(12);
      for (let i = 0; i < n; i++) { const t = i / (n - 1); const px = ax + (t - 0.5) * 2 * W * 0.98, py = ay + c.size * 0.35 - sin(t * PI) * (H + c.size * 0.35) * 0.98; ls.push([px, py, c.size * (0.13 + 0.05 * h(c.sid, i)), -PI / 2 + (t - 0.5) * 2.4 + (h(c.sid, i, 1) - 0.5)]); }
      s += leaves(ls, shed * k0); for (const t of [0.25, 0.5, 0.75]) { const px = ax + (t - 0.5) * 2 * W, py = ay + c.size * 0.35 - sin(t * PI) * (H + c.size * 0.35); s += star(px, py, c.size * 0.07 * k0, '#ffd6f5', shed * k0, 5); }
      const helper = c.ind?.helper ? c.posOf(c.ind.helper) : null; const g = c.tgt;
      if (helper && g && c.age > 0) { const k = c.k; const run = k < 0.45 ? ease(k / 0.45) : k < 0.7 ? 1 : 1 - ease((k - 0.7) / 0.3); const p = along([helper.x, helper.y], [g.x - (g.x - helper.x) * 0.25, g.y], run, 24);
        if (run > 0.02) { s += spriteGhost(c, c.ind.helper, p[0], p[1], helper.size * 1.1, LEAF_L, MOSS, 0.95, LEAF) || `<ellipse cx="${f2(p[0])}" cy="${f2(p[1] - helper.size * 0.5)}" rx="${f2(helper.size * 0.3)}" ry="${f2(helper.size * 0.4)}" fill="${LEAF}" fill-opacity="0.35" stroke="${LEAF_L}" stroke-width="1.6"/>`;
          const tr = []; for (let i = 1; i <= 3; i++) { const q = along([helper.x, helper.y], [g.x, g.y], Math.max(0, run - i * 0.08), 24); tr.push([q[0], q[1] - helper.size * 0.5, helper.size * 0.16, c.t * 4 + i]); } s += leaves(tr, 0.8); } }
      if (c.stopped || c.k > 0.85) { const fall = c.stopped ? c.stopK : (c.k - 0.85) / 0.15; const fl = []; for (let i = 0; i < 5; i++) fl.push([ax + (h(c.sid, i, 4) - 0.5) * 2 * W, ay - H * 0.6 + fall * c.size * 0.9, c.size * 0.12, fall * 6 + i]); s += leaves(fl, 1 - fall); }
      return s; },
    sub: { damage: { dur: 0.6, impact: true, o: (c) => { const g = c.tgt; if (!g) return ''; const b = chest(g); const ls = []; for (let i = 0; i < 7; i++) { const a = (i / 7) * 2 * PI + 0.3; const d = ease(c.k) * g.size * 0.6; ls.push([b[0] + cos(a) * d, b[1] + sin(a) * d, g.size * 0.16 * (1 - c.k * 0.4), a]); } return leaves(ls, 1 - c.k) + flash(b, g.size * 0.3 * (1 - c.k), '#efffd8', (1 - c.k) * 0.7); } } } },
  // NAT-05-C Shell Harvest: a woven thorn shell around the body while its shield stands; on the voluntary exit the remaining branches bloom into leaves and dissolve into the body as healing.
  'NAT-05-C': { id: 'NAT-05-C', name: $t('fx.shell_harvest'), element: 'Nature', match: (e) => /shield \d+ HP/.test(e.text), until: ['status_end', 'ko', 'end'], untilMatch: (x, e) => x.kind === 'end' || (x.kind === 'ko' && x.target === e.actor) || (x.kind === 'status_end' && x.target === e.actor && x.status === 'shielded'), tail: 0.9, persist: true, na: ['movement', 'target'], cue: () => $t('fx.shell_harvest'),
    // A braided thorn shell (two twisting bark-and-moss vines, a crown of thorns, scattered leaves) grows around the body while the shield
    // stands; on the voluntary exit the vines blossom and the petals spiral into the body as healing.
    o: (c) => { const k = ease(clamp01(c.age / 0.5)); const cx = c.cx, cy = c.cy - c.size * 0.55; const rx = c.size * 0.55 * k, ry = c.size * 0.58 * k; const o = c.fade; if (rx < 1) return '';
      const vine = (ph, amp) => { let d = ''; for (let i = 0; i <= 28; i++) { const a = (i / 28) * 2 * PI; const w = 1 + amp * sin(a * 6 + ph + c.t * 0.6); d += `${i ? 'L' : 'M'} ${f2(cx + cos(a) * rx * w)} ${f2(cy + sin(a) * ry * w)} `; } return d; };
      let s = path(vine(0, 0.06), BARK, 4, o) + path(vine(PI, 0.06), MOSS, 3, o) + path(vine(PI, 0.06), LEAF_L, 1, o * 0.7);
      let th = ''; for (let i = 0; i < 12; i++) { const a = (i / 12) * 2 * PI + 0.2; const bx = cx + cos(a) * rx * 1.04, by = cy + sin(a) * ry * 1.04; const tx = cx + cos(a) * (rx * 1.04 + c.size * 0.1), ty = cy + sin(a) * (ry * 1.04 + c.size * 0.1); const nx = -sin(a) * 2.2, ny = cos(a) * 2.2; th += `M ${f2(bx - nx)} ${f2(by - ny)} L ${f2(tx)} ${f2(ty)} L ${f2(bx + nx)} ${f2(by + ny)} Z `; }
      s += `<path d="${th}" fill="#d8c08a" stroke="${BARK}" stroke-width="0.8" opacity="${op(o)}"/>`;
      const ls = []; for (let i = 0; i < c.n(6); i++) { const a = (i / 6) * 2 * PI + 0.7; ls.push([cx + cos(a) * rx, cy + sin(a) * ry, c.size * 0.13, a + 0.8]); } s += leaves(ls, o);
      if (c.stopped) { const kk = c.stopK; for (let i = 0; i < 5; i++) { const a = (i / 5) * 2 * PI + kk * 4; const d = (1 - kk) * rx; s += star(cx + cos(a) * d, cy + sin(a) * d * 1.05, c.size * 0.09 * (1 - kk * 0.5), i % 2 ? '#ffd6f5' : '#fff6a8', 1 - kk, 5); } }
      return s; },
    sub: { ability: { match: (e) => /cashes out/.test(e.text), dur: 1.0, impact: true, cue: () => $t('fx.harvest'), o: (c) => { let s = ''; const ls = []; for (let i = 0; i < c.n(8); i++) { const a = (i / 8) * 2 * PI + ease(c.k) * 3; const d = (1 - ease(c.k)) * c.size * 0.6; const x = c.cx + cos(a) * d, y = c.cy - c.size * 0.5 + sin(a) * d * 1.1; if (i % 2) ls.push([x, y, c.size * 0.14, a + PI / 2]); else s += star(x, y, c.size * 0.08, i % 4 ? '#ffd6f5' : '#fff6a8', 1 - c.k * 0.5, 5); } return s + leaves(ls, 1 - c.k * 0.5); } },
      heal: { dur: 0.6, impact: true, o: (c) => ring(c.cx, c.cy - c.size * 0.5, c.size * 0.2 + c.k * c.size * 0.3, c.L.a, 1.4, 1 - c.k) } } },
  // NAT-06-C Root Communion: glowing roots link the living team; light flows from the healthy to the injured; the HP bars settle, then the roots retract.
  'NAT-06-C': { id: 'NAT-06-C', name: $t('fx.root_communion'), element: 'Nature', dur: 1.8, lead: 0.3, na: ['target', 'persistence'], move: true, cue: () => $t('fx.root_communion'),
    u: (c) => { const k = c.age < 0 ? 0 : ease(clamp01(c.age / 0.5)) * (1 - clamp01((c.age - 1.3) / 0.5)); let s = ''; for (const id of allies(c)) { if (id === c.owner) continue; const g = c.posOf(id); if (!g) continue; s += root(feet(c), feet(g), k, c.L, 1, c.sid + id.charCodeAt(1), 2.8); } if (c.age < 0) s += groundRing(c.cx, c.cy + 2, c.size * 0.45 * (1 + c.age / 0.3), c.L.a, 1.4, 1 + c.age / 0.3); return s; },
    sub: { hp_set: { dur: 0.9, impact: true, target: true, o: (c) => { const g = c.tgt; if (!g) return ''; const out = (c.ev.delta || 0) < 0; const a = feet(c), b = feet(g); const k = ease(c.k); const p = c.owner === c.ev.target ? [g.x, g.y - g.size * 0.5 - k * 20] : along(out ? b : a, out ? a : b, k); return blob(p[0], p[1], 2.4 * c.u, out ? c.L.c : c.L.a, 1 - c.k * 0.3) + blob(p[0], p[1], 1.2 * c.u, '#ffffff', 1) + label(g.x, g.y - g.size - 1.2 * c.hu, 1.2 * c.hu, out ? '#f8d7a0' : c.L.a, `${out ? '' : '+'}${c.ev.delta}`, 1 - c.k * c.k); } } } },

  // ELE-01-C Lightning Rod: the harmful status energy jumps from the reserve ally to Zippit as a crackling arc; the shared badge moves with it and loses one turn.
  'ELE-01-C': { id: 'ELE-01-C', name: $t('fx.lightning_rod'), element: 'Electric', dur: 1.0, lead: 0.3, move: true, cue: () => $t('fx.lightning_rod'),
    o: (c) => { const g = c.tgt; if (!g) return ''; const a = [g.x, g.y - g.size * 0.6], b = [c.cx, c.cy - c.size * 0.95]; const w = Math.max(1.4, c.size * 0.03);
      if (c.age < 0) { const kk = 1 + c.age / 0.3; return crackle(g.x, g.y - g.size * 0.5, g.size * 0.45, fs(c), kk, c.n(4)) + crackle(c.cx, c.cy - c.size * 1.05, c.size * 0.25, fs(c) + 5, kk, 2) + bolt([c.cx, c.cy - c.size * 1.4], [c.cx, c.cy - c.size * 1.05], fs(c), kk, w * 0.6, 0); }
      const k = ease(clamp01(c.age / 0.3)); const p = along(a, b, k, 18); const o = 1 - clamp01((c.age - 0.45) / 0.45);
      let s = bolt(a, p, fs(c), o, w, 2) + plasma(p, w * 2.4, fs(c) + 1, o * (k < 1 ? 1 : 0.6));
      if (k >= 1) s += zap(b, c.size * 0.5, fs(c) + 2, o, clamp01((c.age - 0.3) / 0.5)) + crackle(c.cx, c.cy - c.size * 0.55, c.size * 0.5, fs(c) + 3, o, c.n(5));
      return s; },
    sub: { status_tick: { dur: 0.7, impact: true, o: (c) => label(c.cx, c.top - 3.4 * c.hu, 1.1 * c.hu, c.L.a, $t('fx.1_turn'), 1 - c.k * c.k) } } },
  // ELE-02-C Arc Rebound: the missed bolt curves sharply away from the dodged active and lands on the reserve target.
  'ELE-02-C': { id: 'ELE-02-C', name: $t('fx.arc_rebound'), element: 'Electric', dur: 0.9, lead: 0.2, move: true, cue: () => $t('fx.arc_rebound_2'),
    // The bolt strikes past the dodging active, cracks off the air beside it (a bounce flash) and forks down onto the reserve target.
    o: (c) => { const g = c.tgt; if (!g) return ''; const a = chest(c); const foe = c.st.active[c.side === 'a' ? 'b' : 'a']; const fg = foe ? c.posOf(foe) : null; const miss = fg ? [fg.x + (c.side === 'a' ? -1 : 1) * fg.size * 0.7, fg.y - fg.size * 0.7] : along(a, chest(g), 0.5); const b = chest(g); const w = Math.max(1.4, c.size * 0.03);
      if (c.age < 0) return crackle(a[0], a[1], c.size * 0.35, fs(c), 1 + c.age / 0.2, c.n(4));
      const k = clamp01(c.age / 0.4); const o = 1 - clamp01((c.age - 0.5) / 0.4); let s = '';
      const k1 = ease(clamp01(k * 2)), k2 = ease(clamp01(k * 2 - 1));
      s += bolt(a, along(a, miss, k1), fs(c), o, w, 1);
      if (k1 >= 1) s += zap(miss, c.size * 0.25, fs(c) + 4, o * 0.8, clamp01(k * 2 - 1)) + bolt(miss, along(miss, b, k2), fs(c) + 9, o, w, 2);
      if (k2 >= 1) s += zap(b, g.size * 0.55, fs(c) + 6, o, clamp01((c.age - 0.4) / 0.45));
      return s; },
    sub: { damage: { dur: 0.5, impact: true, o: (c) => (c.tgt ? sparks(c.tgt.x, c.tgt.y - c.tgt.size * 0.5, c.tgt.size * 0.5, c.n(6), c.sid, c.L, 1 - c.k, c.t) : '') } } },
  // ELE-03-C Phase Strike: the electrical body passes through the visible shield, strikes the target and returns; the shield ring stays intact.
  'ELE-03-C': { id: 'ELE-03-C', name: $t('fx.phase_strike'), element: 'Electric', dur: 1.1, lead: 0.2, move: true, na: ['persistence'], cue: () => $t('fx.phase_strike_2'),
    // The body turns into a ball of living lightning, passes through the shield (which stays whole), strikes and arcs back home.
    o: (c) => { const g = c.tgt; if (!g) return ''; const a = chest(c), b = chest(g); const w = Math.max(1.4, c.size * 0.03);
      if (c.age < 0) return crackle(a[0], a[1], c.size * 0.45, fs(c), 1 + c.age / 0.2, c.n(5));
      const k = c.k; const run = k < 0.4 ? ease(k / 0.4) : k < 0.55 ? 1 : 1 - ease((k - 0.55) / 0.45); const p = along(a, b, run, 6);
      let s = bolt(a, p, fs(c), 0.8 * (1 - clamp01((k - 0.6) / 0.4)), w * 0.8, 1) + plasma(p, c.size * 0.22, fs(c) + 1, 0.95);
      if (k > 0.35 && k < 0.65) s += `<ellipse cx="${f2(g.x)}" cy="${f2(g.y - 2)}" rx="${f2(g.size * 0.55)}" ry="${f2(g.size * 0.2)}" fill="none" stroke="#dbeafe" stroke-width="2" opacity="${op(0.9)}"/>` + label(g.x + (g.x < c.W / 2 ? 1 : -1) * g.size * 0.85, g.y - g.size * 0.15, 1.1 * c.hu, '#dbeafe', 'shield intact', 1) + zap(b, g.size * 0.45, fs(c) + 2, 0.9, (k - 0.35) / 0.3);
      return s; },
    sub: { damage: { dur: 0.5, impact: true, o: (c) => (c.tgt ? burst(chest(c.tgt), c.tgt.size * 0.45, c.L, c.k, c.n(6), c.sid) : '') } } },
  // ELE-04-C Circuit Breaker: a jagged bolt to the target, then a brief broken-circuit symbol over the enemy's ability icon as its cooldown grows by two.
  'ELE-04-C': { id: 'ELE-04-C', name: $t('fx.circuit_breaker'), element: 'Electric', dur: 0.8, lead: 0.2, move: true, cue: () => $t('fx.circuit_breaker_2'),
    o: (c) => { const g = c.tgt; if (!g) return ''; const a = chest(c), b = chest(g); const w = Math.max(1.6, c.size * 0.035);
      if (c.age < 0) return crackle(a[0], a[1], c.size * 0.35, fs(c), 1 + c.age / 0.2, c.n(4));
      const k = ease(clamp01(c.age / 0.15)); const o = 1 - clamp01((c.age - 0.35) / 0.45); const p = along(a, b, k);
      let s = bolt(a, p, fs(c, 20), o, w, 3); if (k >= 1) s += zap(b, g.size * 0.6, fs(c) + 2, o, clamp01((c.age - 0.15) / 0.5)) + crackle(g.x, g.y - g.size * 0.5, g.size * 0.5, fs(c) + 3, o, c.n(4));
      return s; },
    sub: { damage: { dur: 0.4, impact: true, o: (c) => (c.tgt ? flash(chest(c.tgt), c.tgt.size * 0.3 * (1 - c.k), '#ffffff', (1 - c.k) * 0.8) : '') },
      clock_adjust: { dur: 1.4, impact: true, target: true, o: (c) => { const g = c.tgt; if (!g) return ''; const x = g.x + g.size * 0.5 + 1.5 * c.hu, y = g.y + 2.2 * c.hu; return label(x, y - 2.3 * c.hu, 1.1 * c.hu, c.L.a, `${$t('fx.turns', { after: (c.ev.after ?? 0) - (c.ev.before ?? 0) })}`, 1 - c.k * c.k) + sparks(x, y, 2 * c.hu, c.n(3), c.sid, c.L, 1 - c.k, c.t); } } } },
  // ELE-05-C Victory Surge: the knockout releases electricity into the horns; once the replacement arrives Joltrex lunges as a lightning streak, strikes and returns.
  'ELE-05-C': { id: 'ELE-05-C', name: $t('fx.victory_surge'), element: 'Electric', dur: 1.0, lead: 0.5, move: true, na: ['persistence'], cue: () => $t('fx.victory_surge_2'),
    // The knockout's energy arcs into the horns (crackling between them); Joltrex lunges as a lightning streak, strikes and returns.
    o: (c) => { const g = c.tgt; const a = chest(c); const w = Math.max(1.6, c.size * 0.035); const hy = c.cy - c.size * 1.0;
      if (c.age < 0) { const kk = 1 + c.age / 0.5; return bolt([c.cx - c.size * 0.28, hy], [c.cx + c.size * 0.28, hy], fs(c), kk, w * 0.7, 1) + crackle(c.cx, c.cy - c.size * 0.55, c.size * 0.55, fs(c) + 3, kk, c.n(5)) + skyStrike(c.cx, hy, fs(c) + 7, kk * (c.age > -0.25 ? 1 : 0), w * 0.8); }
      if (!g) return ''; const b = chest(g); const k = c.k; const run = k < 0.4 ? ease(k / 0.4) : k < 0.55 ? 1 : 1 - ease((k - 0.55) / 0.45); const p = along(a, b, run);
      let s = bolt(a, p, fs(c, 20), 0.95, w * 1.2, 2) + plasma(p, c.size * 0.2, fs(c) + 1, 0.95);
      if (k > 0.4 && k < 0.7) s += zap(b, g.size * 0.6, fs(c) + 2, 1, (k - 0.4) / 0.3);
      return s; },
    sub: { damage: { dur: 0.5, impact: true, o: (c) => (c.tgt ? sparks(c.tgt.x, c.tgt.y - c.tgt.size * 0.5, c.tgt.size * 0.5, c.n(6), c.sid, c.L, 1 - c.k, c.t) : '') } } },
  // ELE-06-C Twin Thunder: two lightning strikes form stationary guards beside Voltarch; each guard fires one bolt after a qualifying hit and disappears with its launch.
  'ELE-06-C': { id: 'ELE-06-C', name: $t('fx.twin_thunder'), element: 'Electric', match: (e) => /guards summoned/.test(e.text), until: ['ability', 'ko', 'end'], untilMatch: (x, e) => x.kind === 'end' || (x.kind === 'ko' && x.target === e.actor) || (x.kind === 'ability' && x.abilityId === e.abilityId && /0 left/.test(x.text)), tail: 0.7, persist: true, na: ['target'], cue: () => $t('fx.twin_thunder_2'),
    init: () => ({ guards: 0 }), track: (ind, e) => { if (e.kind === 'ability' && /guards summoned/.test(e.text)) ind.guards = 2; if (e.kind === 'ability' && /bolts/.test(e.text)) { const m = /\((\d+) left\)/.exec(e.text); ind.guards = m ? +m[1] : Math.max(0, ind.guards - 1); } },
    indicator: (c, ind) => pips(c.x, c.y + 1.45 * c.hu, c.hu, ind.guards || 0, 2, c.L.a),
    // Two strikes out of the sky; each leaves a guard: a floating thunder orb tethered to the ground by small crackling arcs.
    o: (c) => { let s = ''; const n = c.ind?.guards ?? 2; const k = clamp01(c.age / 0.5); const w = Math.max(1.6, c.size * 0.035);
      for (let i = 0; i < 2; i++) { const sx = i ? 1 : -1; const gx = c.cx + sx * c.size * 0.75, gy = c.cy; const lit = i < n;
        if (c.age < 0.35) s += skyStrike(gx, gy, fs(c, 20) + i * 17, 1 - Math.max(0, c.age) / 0.35, w * 1.3);
        if (!lit && !c.stopped) continue; const o = lit ? 0.95 * c.fade : 0; if (o <= 0) continue; const oy = gy - c.size * 0.55 * ease(k); const r = c.size * 0.14 * (0.5 + 0.5 * ease(k)) * (1 + 0.08 * sin(c.t * 9 + i));
        s += `<ellipse cx="${f2(gx)}" cy="${f2(gy + 1)}" rx="${f2(c.size * 0.22)}" ry="${f2(c.size * 0.07)}" fill="#ffe14a" opacity="${op(o * 0.35)}"/>`;
        for (let j = 0; j < 2; j++) s += bolt([gx + (j ? 1 : -1) * r * 0.4, oy + r * 0.6], [gx + (j ? 1 : -1) * c.size * 0.12, gy], fs(c) + i * 7 + j, o * 0.75, w * 0.45, 0);
        s += plasma([gx, oy], r, fs(c) + i * 5, o); }
      return s; },
    sub: { ability: { match: (e) => /bolts/.test(e.text), dur: 0.8, impact: true, move: true, target: true, o: (c) => { const g = c.tgt; if (!g) return ''; const left = /\((\d+) left\)/.exec(c.ev.text); const i = left && +left[1] === 1 ? 0 : 1; const gx = c.cx + (i ? 1 : -1) * c.size * 0.75, gy = c.cy - c.size * 0.4; const k = ease(clamp01(c.age / 0.3)); const p = along([gx, gy], chest(g), k); const gy2 = c.cy - c.size * 0.55; return bolt([gx, gy2], along([gx, gy2], chest(g), k), fs(c, 20), 1 - c.k, Math.max(1.6, c.size * 0.035), 2) + (k >= 1 ? zap(chest(g), g.size * 0.55, fs(c) + 2, 1 - c.k, c.k) : '') + (c.age < 0.3 ? plasma([gx, gy2], c.size * 0.14 * (1 - c.age / 0.3), fs(c) + 1, 1) : ''); } } } },
};
