// Task 8 looks: Nature and Electric (Dex "Visuals" rows NAT-01..06, ELE-01..06). Look contract: src/ui/fx/t8-fx.js.
import { f2, h, op, clamp01, ease, easeOut, cos, sin, PI, ring, blob, disc, line, rect, poly, path, pathOf, star, bolt, text, jag, hex } from '../prims.js';

const leaf = (x, y, rot, L, o = 1, s = 1) => `<ellipse cx="${f2(x)}" cy="${f2(y)}" rx="${f2(0.55 * s)}" ry="${f2(0.26 * s)}" fill="${L.a}" stroke="#2a4a1a" stroke-width="0.08" opacity="${op(o)}" transform="rotate(${f2(rot)} ${f2(x)} ${f2(y)})"/>`;
const leafBurst = (x, y, k, n, sid, L, o = 1) => { let s = ''; for (let i = 0; i < n; i++) { const a = (i / n) * 2 * PI + h(sid, i) * 0.5; const d = (0.8 + h(sid, i, 2) * 1.6) * easeOut(k); s += leaf(x + cos(a) * d, y + sin(a) * d * 0.7 - k * 0.8, a * 57 + k * 200, L, (1 - k) * o); } return s; };
/** A jagged bolt between two points (electrical connection). */
const arc = (x0, y0, x1, y1, seed, colour, w, o, steps = 6) => { const pts = [[x0, y0]]; for (let i = 1; i < steps; i++) { const k = i / steps; const nx = -(y1 - y0), ny = x1 - x0; const L = Math.hypot(nx, ny) || 1; const j = (h(seed, i) - 0.5) * 1.2; pts.push([x0 + (x1 - x0) * k + nx / L * j, y0 + (y1 - y0) * k + ny / L * j]); } pts.push([x1, y1]); return path(pathOf(pts), colour, w, o) + path(pathOf(pts), '#ffffff', w * 0.35, o * 0.9); };
/** An electrical silhouette: a dashed glowing outline the size of a sprite, with a few sparks. */
const silhouette = (x, y, L, t, sid, o, n, pulse = true, solid = false) => { const glow = pulse ? 0.7 + 0.3 * sin(t * 9) : 1; let s = solid
  ? `<g opacity="${op(o)}"><ellipse cx="${f2(x)}" cy="${f2(y + 0.75)}" rx="1.55" ry="0.7" fill="#0b1a14" opacity="0.5"/><path d="M ${f2(x - 1.4)} ${f2(y + 0.9)} L ${f2(x - 1.5)} ${f2(y - 0.9)} Q ${f2(x - 1.3)} ${f2(y - 1.5)} ${f2(x - 0.7)} ${f2(y - 1.6)} Q ${f2(x - 0.8)} ${f2(y - 2.9)} ${f2(x)} ${f2(y - 2.9)} Q ${f2(x + 0.8)} ${f2(y - 2.9)} ${f2(x + 0.7)} ${f2(y - 1.6)} Q ${f2(x + 1.3)} ${f2(y - 1.5)} ${f2(x + 1.5)} ${f2(y - 0.9)} L ${f2(x + 1.4)} ${f2(y + 0.9)} Z" fill="${L.b}" stroke="${L.a}" stroke-width="0.22"/><circle cx="${f2(x - 0.35)}" cy="${f2(y - 2.1)}" r="0.18" fill="#ffffff"/><circle cx="${f2(x + 0.35)}" cy="${f2(y - 2.1)}" r="0.18" fill="#ffffff"/><path d="M ${f2(x - 0.9)} ${f2(y - 0.6)} l 0.5 0.5 l -0.4 0.5 l 0.5 0.5 M ${f2(x + 0.9)} ${f2(y - 0.6)} l -0.5 0.5 l 0.4 0.5 l -0.5 0.5" fill="none" stroke="${L.a}" stroke-width="0.14" opacity="${f2(glow)}"/></g>`
  : `<rect x="${f2(x - 1.75)}" y="${f2(y - 2.6)}" width="3.5" height="3.6" rx="0.9" fill="${L.a}" fill-opacity="${f2(0.22 * o)}" stroke="${L.a}" stroke-width="0.26" stroke-dasharray="0.6 0.35" stroke-dashoffset="${f2(-t * 4)}" opacity="${op(glow * o)}"/>`; for (let i = 0; i < n; i++) { const ph = (t * 3 + h(sid, i)) % 1; if (ph > 0.35) continue; const a = h(sid, i, Math.floor(t * 3)) * 2 * PI; s += star(x + cos(a) * 2.1, y - 0.8 + sin(a) * 2.1, 0.28, L.a, (1 - ph / 0.35) * o, 4); } return s; };

export const NATURE_ELECTRIC = {
  // NAT-01 Bloom Break: the designated cut earns the patches (leaves burst at the cut); the shoots are the next play's reveal.
  'NAT-01-F': { id: 'NAT-01-F', name: 'Bloom Break', element: 'Nature', dur: 0.9, cue: () => 'Bloom Break earned', charge: { cdMax: 3 },
    u: (c) => leafBurst(c.cx, c.cy + 0.3, c.k, c.n(7), c.sid, c.L) + disc(c.cx, c.cy + 0.7, 1.2 + c.k, 0.5, c.L.a, 0.3 * (1 - c.k)) },
  // NAT-02 Vine Vault: two supporting vines, the visible arc over the blocker, the leafy landing; the vines retract. Held: the vines snap.
  'NAT-02-F': { id: 'NAT-02-F', name: 'Vine Vault', element: 'Nature', until: ['vault_land', 'ability_end'], tail: 0.6, path: true, cue: (c) => (c.ev.success === false ? 'Vault held' : 'Vine Vault'),
    u: (c) => { const e = c.ev; const [sx, sy] = c.origin || [c.cx, c.cy]; const land = e.success && e.x != null ? c.S(e.x, e.y) : null; let s = ''; const k = c.stopped ? 1 : clamp01(c.age / 0.4);
      if (land && !e.success === false) { /* unreachable */ }
      if (e.success === false) { for (let i = -1; i <= 1; i += 2) s += path(pathOf(jag(sx + i * 0.8, sy + 0.8, PI / 2 + i * 0.4, 1.4 * (1 - clamp01(c.age / 0.5)), c.sid + i, 3)), '#3f9a3a', 0.35, 1 - clamp01(c.age / 0.6)); return s; }
      if (!land) return s;
      // two short vines planted at the take-off, retracting after the landing
      const vine = c.stopped ? 1 - c.stopK : 1; for (let i = -1; i <= 1; i += 2) s += path(pathOf(jag(sx + i * 0.7, sy + 0.8, -PI / 2 + i * 0.5, 1.8 * vine * k, c.sid + i, 3)), '#3f9a3a', 0.4, vine) + leaf(sx + i * 1.3, sy - 0.6 * vine, i * 40, c.L, vine);
      // the arc over the blocker, drawn as he travels
      const mx = (sx + land[0]) / 2, my = Math.min(sy, land[1]) - 3; s += `<path d="M ${f2(sx)} ${f2(sy)} Q ${f2(mx)} ${f2(my)} ${f2(land[0])} ${f2(land[1])}" fill="none" stroke="${c.L.a}" stroke-width="0.3" stroke-dasharray="0.7 0.5" opacity="${op(0.85 * (c.stopped ? 1 - c.stopK : 1))}"/>`;
      if (c.stopped) s += leafBurst(land[0], land[1] + 0.4, c.stopK, c.n(7), c.sid + 9, c.L); return s; } },
  // NAT-03 Deep Roots: thick roots from his feet into the turf for the play; taut when they hold a shed; they retract at the whistle.
  'NAT-03-F': { id: 'NAT-03-F', name: 'Deep Roots', element: 'Nature', dur: 'play', sub: { shed_prevented: { dur: 0.8, cue: () => 'Roots hold', o: (c) => { const v = c.victim; if (!v) return ''; return line(c.cx, c.cy + 0.6, v[0], v[1] + 0.6, '#6a4a22', 0.5 * (1 - c.k) + 0.1, 1 - c.k) + ring(c.cx, c.cy + 0.6, 1 + c.k * 2, '#a07a44', 0.3, 1 - c.k); } } },
    u: (c) => { const grow = c.stopped ? 1 - c.stopK : ease(clamp01(c.age / 0.5)); let s = ''; for (let i = 0; i < c.n(5); i++) s += path(pathOf(jag(c.cx, c.cy + 0.8, PI / 2 + (i - 2) * 0.55, 2.4 * grow, c.sid + i, 4)), '#6a4a22', 0.55, 0.95) + path(pathOf(jag(c.cx, c.cy + 0.8, PI / 2 + (i - 2) * 0.55, 2.4 * grow, c.sid + i, 4)), '#a07a44', 0.2, 0.9); return s + disc(c.cx, c.cy + 0.8, 1.6 * grow, 0.6 * grow, '#3a2a12', 0.35); } },
  // NAT-04 Surefoot Canopy: a leaf effect marks the protected teammate for the whole play and fades at the whistle. No patch.
  'NAT-04-F': { id: 'NAT-04-F', name: 'Surefoot Canopy', element: 'Nature', dur: 'play', noCue: true,
    o: (c) => { const tp = c.pos(c.team, c.ev.target); if (!tp) return ''; const [x, y] = tp; let s = ''; const n = c.n(5); for (let i = 0; i < n; i++) { const a = c.t * 1.6 + (i / n) * 2 * PI; s += leaf(x + cos(a) * 1.7, y - 3.3 + sin(a) * 0.5, a * 57, c.L, 0.9 * c.fade, 0.9); } return s + disc(x, y - 3.3, 1.9, 0.6, 'none', 0.5 * c.fade, ` stroke="${c.L.a}" stroke-width="0.14" stroke-dasharray="0.5 0.4"`); } },
  // NAT-05 Bramble Trap: the broken tackle earns it (thorns flash); the seed drop and bloom are the next play's reveal (fields-fx.js).
  'NAT-05-F': { id: 'NAT-05-F', name: 'Bramble Trap', element: 'Nature', dur: 0.9, cue: () => 'Bramble Trap earned', charge: { cdMax: 3 },
    u: (c) => { let s = ''; for (let i = 0; i < c.n(8); i++) { const a = i * PI / 4 + c.age * 1.5; const x = c.cx + cos(a) * (1.6 + c.k), y = c.cy + 0.3 + sin(a) * (1.1 + c.k * 0.7); s += poly([[x - sin(a) * 0.3, y + cos(a) * 0.3], [x + cos(a) * 1, y + sin(a) * 1], [x + sin(a) * 0.3, y - cos(a) * 0.3]], c.L.a, 1 - c.k, ' stroke="#2a4a1a" stroke-width="0.1"'); } return s; } },
  // NAT-06 Grove Guardian: a root at the snap grows into a leafy copy with a distinct outline (over the temporary actor); gone at the whistle.
  'NAT-06-F': { id: 'NAT-06-F', name: 'Grove Guardian', element: 'Nature', dur: 'play', cue: () => 'Grove Guardian rises',
    u: (c) => { const p = c.pos(c.team, c.ev.clone); const [x, y] = p ? [p[0], p[1]] : c.origin || [c.cx, c.cy]; const grow = ease(clamp01(c.age / 0.6)); let s = disc(x, y + 0.8, 1.8 * grow, 0.7 * grow, '#3a2a12', 0.4 * c.fade); for (let i = 0; i < c.n(4); i++) s += path(pathOf(jag(x, y + 0.8, PI / 2 + (i - 1.5) * 0.7, 1.8 * grow, c.sid + i, 3)), '#6a4a22', 0.45, 0.9 * c.fade); return s; },
    o: (c) => { const p = c.pos(c.team, c.ev.clone); if (!p) return ''; const [x, y] = p; const grow = ease(clamp01(c.age / 0.6)); let s = `<rect x="${f2(x - 1.85)}" y="${f2(y - 2.7)}" width="3.7" height="3.8" rx="1" fill="#3f9a3a" fill-opacity="${f2(0.28 * c.fade)}" stroke="${c.L.a}" stroke-width="0.3" stroke-dasharray="0.8 0.4" opacity="${op(c.fade)}" transform="translate(0 ${f2((1 - grow) * 2)}) scale(1 ${f2(0.2 + 0.8 * grow)})" transform-origin="${f2(x)} ${f2(y + 1)}"/>`;
      for (let i = 0; i < c.n(4); i++) { const a = (i / 4) * 2 * PI + c.t * 0.8; s += leaf(x + cos(a) * 2.1, y - 2.2 + sin(a) * 0.5, a * 57, c.L, 0.95 * c.fade * grow); } return s; } },

  // ELE-01 Crossed Wires: a brief electrical connection between the two receivers and their updated route art (both teams see it).
  'ELE-01-F': { id: 'ELE-01-F', name: 'Crossed Wires', element: 'Electric', dur: 1.6, cue: () => 'Crossed Wires',
    o: (c) => { const pp = c.pos(c.team, c.ev.partner); if (!pp || c.age > 0.7) return ''; return arc(c.cx, c.cy - 1, pp[0], pp[1] - 1, c.sid + Math.floor(c.t * 12), c.L.a, 0.3, 1 - c.age / 0.7, 7); },
    u: (c) => { let s = ''; const routes = c.ev.routes || {}; const k = easeOut(clamp01((c.age - 0.3) / 0.7)); for (const [slot, pts] of Object.entries(routes)) { const p0 = c.pos(c.team, slot); if (!p0 || !pts?.length) continue; const sv = pts.map(([x, y]) => c.S(x, y)); const all = [[p0[0], p0[1]], ...sv]; const n = Math.max(2, Math.ceil(all.length * k)); s += path(pathOf(all.slice(0, n)), c.L.a, 0.3, (1 - c.k) * 0.95, ' stroke-dasharray="0.8 0.5"'); if (k >= 1) { const e = sv[sv.length - 1]; s += poly([[e[0], e[1] - 0.6], [e[0] + 0.5, e[1] + 0.3], [e[0] - 0.5, e[1] + 0.3]], c.L.a, 1 - c.k); } } return s; } },
  // ELE-02 Charge Strip: the first down charges the strip (sparks at the runner); the nodes and arc are the next play's reveal (fields-fx.js).
  'ELE-02-F': { id: 'ELE-02-F', name: 'Charge Strip', element: 'Electric', dur: 0.9, cue: () => 'Charge Strip charged', charge: { cdMax: 4 },
    o: (c) => { let s = bolt(c.cx, c.cy - 4 - c.k, 1.1, c.L.a, 1 - c.k); for (let i = 0; i < c.n(5); i++) { const a = h(c.sid, i) * 2 * PI; const d = 1 + c.k * 2.5; s += star(c.cx + cos(a) * d, c.cy - 0.5 + sin(a) * d * 0.7, 0.3, c.L.a, 1 - c.k, 4); } return s; } },
  // ELE-03 Phase Release: a readable electrical silhouette while phased; he returns to solid form at the end point (a flash).
  'ELE-03-F': { id: 'ELE-03-F', name: 'Phase Release', element: 'Electric', until: ['ability_end'], tail: 0.4, cue: () => 'Phases out',
    o: (c) => { if (c.stopped) return ring(c.cx, c.cy - 0.6, 1.2 + c.stopK * 2.5, c.L.a, 0.3, 1 - c.stopK) + star(c.cx, c.cy - 3.2, 0.6 * (1 - c.stopK), c.L.a, 1 - c.stopK); return silhouette(c.cx, c.cy, c.L, c.t, c.sid, 1, c.n(4)); } },
  // ELE-04 Static Field: the field's ground lines, boundary and sparks (fields-fx.js); the entry stun is a status badge.
  'ELE-04-F': { id: 'ELE-04-F', name: 'Static Field', element: 'Electric', dur: 0.6, noCue: true, o: () => '' },
  // ELE-05 Chain Break: a spark as he tears free, a visible arc to the second blocker, skid marks under the stumbling feet.
  'ELE-05-F': { id: 'ELE-05-F', name: 'Chain Break', element: 'Electric', dur: 1.0, shake: true,
    o: (c) => { let s = ''; if (c.age < 0.3) s += star(c.cx, c.cy - 0.8, 1.2 * (1 - c.age / 0.3) + 0.3, c.L.a, 1, 4); const v = c.victim; if (v && c.age < 0.6) s += arc(c.cx, c.cy - 0.8, v[0], v[1] - 0.8, c.sid + Math.floor(c.t * 12), c.L.a, 0.34, 1 - c.age / 0.6, 7); return s; },
    u: (c) => { const v = c.victim; if (!v || c.age < 0.3) return ''; let s = ''; for (let i = -1; i <= 1; i += 2) s += line(v[0] + i * 0.5, v[1] + 0.9, v[0] + i * 0.5 - 1.6 * clamp01((c.age - 0.3) / 0.4), v[1] + 0.9, '#4a3a2a', 0.3, (1 - c.k) * 0.8); return s; } },
  // ELE-06 Stormguard: two lightning strikes left and right of the line spawn electrical blocker silhouettes with subtle sparks.
  'ELE-06-F': { id: 'ELE-06-F', name: 'Stormguard', element: 'Electric', dur: 'play', shake: true, cue: () => 'Stormguard',
    o: (c) => { let s = ''; for (const [slot] of c.ev.guards || []) { const p = c.pos(c.team, slot); if (!p) continue; const [x, y] = p; if (c.age < 0.4) { const k = c.age / 0.4; s += path(pathOf(jag(x, y - 18 * (1 - k * 0.2), PI / 2, 18 * (1 - k * 0.2) - 0.5, c.sid + slot.length + Math.floor(c.t * 10), 8, 1.1)), c.L.a, 0.5 * (1 - k) + 0.15, 1 - k) + blob(x, y, 2.5 * (1 - k) + 0.3, '#ffffff', (1 - k) * (c.reducedFlash ? 0.35 : 0.8)); }
      if (c.age > 0.15) s += silhouette(x, y, c.L, c.t, c.sid + slot.length, c.fade, c.n(3), true, true); } return s; } }, // solid: the temporary blocker is this silhouette
};
