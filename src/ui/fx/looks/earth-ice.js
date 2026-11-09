// Task 8 looks: Earth and Ice (Dex "Visuals" rows EAR-01..06, ICE-01..06). Look contract: src/ui/fx/t8-fx.js.
import { f2, h, op, clamp01, ease, easeOut, cos, sin, PI, ring, blob, disc, line, rect, poly, path, pathOf, star, text, jag, shard } from '../prims.js';

const STONE = '#a89070', STONE_D = '#5a4630', STONE_L = '#e0d2b4';
/** Stone fragments flying out of (x, y) over phase k. */
const fragments = (x, y, k, n, sid, o = 1, spread = 2.6) => { let s = ''; for (let i = 0; i < n; i++) { const a = (i / n) * 2 * PI + h(sid, i) * 0.7; const d = (0.6 + h(sid, i, 2) * spread) * easeOut(k); s += shard(x + cos(a) * d, y + sin(a) * d * 0.7 - sin(k * PI) * 1.2 * h(sid, i, 3), 0.35 + h(sid, i, 4) * 0.3, i % 2 ? STONE : STONE_L, sid + i, (1 - k) * o, ` stroke="${STONE_D}" stroke-width="0.08"`); } return s; };
/** A stone slab (wall segment) in svg coords with a ground seam. */
const slab = (x0, y0, x1, y1, o, rise = 1, cracked = 0) => { const w = x1 - x0, hh = y1 - y0; const lift = 1.6 * rise; let s = rect(x0, y0 - lift, w, hh + lift, STONE, o, ` stroke="${STONE_D}" stroke-width="0.14"`) + rect(x0, y0 - lift, w, Math.min(hh, 0.35), STONE_L, o * 0.9); if (cracked > 0) { s += line(x0 + w * 0.3, y0 - lift, x0 + w * 0.45, y1, STONE_D, 0.14, o * cracked) + line(x0 + w * 0.7, y0 - lift, x0 + w * 0.6, y1, STONE_D, 0.14, o * cracked); } return s; };
const snowball = (x, y, r, o = 1, shadow = true) => (shadow ? disc(x, y + r * 0.9, r * 1.1, r * 0.5, '#0b1a14', 0.3 * o) : '') + blob(x, y, r, '#f4fbff', o) + blob(x - r * 0.3, y - r * 0.3, r * 0.4, '#ffffff', o) + ring(x, y, r, '#9ec8ea', 0.1, o);
const frostRing = (x, y, r, t, o) => disc(x, y + 0.7, r, r * 0.45, 'none', o, ` stroke="#e6f7ff" stroke-width="0.3" stroke-dasharray="0.9 0.6" stroke-dashoffset="${f2(-t * 3)}"`) + disc(x, y + 0.7, r * 0.8, r * 0.36, '#bfe8ff', 0.18 * o);

export const EARTH_ICE = {
  // EAR-01 Clean Sweep: readiness = the stone-fist icon over the head (overhead, ready); the use is a forceful shoulder slam with fragments.
  'EAR-01-F': { id: 'EAR-01-F', at: { impact: 0.2 }, na: ['persistence'], name: 'Clean Sweep', element: 'Earth', dur: 0.9, shake: true, charge: { max: 1, icon: 'fist' },
    o: (c) => { const v = c.victim || [c.cx, c.cy - 2]; const k = clamp01(c.age / 0.25); const x = c.cx + (v[0] - c.cx) * k * 0.6, y = c.cy + (v[1] - c.cy) * k * 0.6; let s = ''; if (c.age < 0.45) s += poly([[x - 0.9, y - 0.5], [x + 0.9, y - 0.9], [x + 1.1, y + 0.5], [x - 0.7, y + 0.8]], STONE, 1 - c.age / 0.45, ` stroke="${STONE_D}" stroke-width="0.12"`); // the stone fist
      return s + fragments(v[0], v[1], clamp01((c.age - 0.1) / 0.8), c.n(7), c.sid, 1); } },
  // EAR-02 Stonewall Swat: the ready stone icon (overhead); at release the rock launches, strikes the football and crumbles.
  'EAR-02-F': { id: 'EAR-02-F', at: { impact: 0.45 }, na: ['persistence'], name: 'Stonewall Swat', element: 'Earth', dur: 1.1, lead: 0, shake: true, charge: { max: 3, icon: 'stone' },
    o: (c) => { const e = c.ev; const from = e.fromX != null ? c.S(e.fromX, e.fromY) : [c.cx, c.cy]; const to = c.victim || (e.x != null ? c.S(e.x, e.y) : from); const FL = 0.35; let s = '';
      if (c.age < FL) { const k = c.age / FL; const x = from[0] + (to[0] - from[0]) * k, y = from[1] + (to[1] - from[1]) * k - sin(k * PI) * 3; s += shard(x, y, 0.9, STONE, c.sid, 1, ` stroke="${STONE_D}" stroke-width="0.12" transform="rotate(${f2(k * 720)} ${f2(x)} ${f2(y)})"`); for (let i = 1; i <= c.n(3); i++) s += blob(from[0] + (to[0] - from[0]) * Math.max(0, k - i * 0.08), from[1] + (to[1] - from[1]) * Math.max(0, k - i * 0.08) - sin(Math.max(0, k - i * 0.08) * PI) * 3, 0.3, STONE_L, 0.6 - i * 0.15); }
      else { const k = clamp01((c.age - FL) / 0.7); s += ring(to[0], to[1] - 1.5, 0.3 + k * 3, '#ffffff', 0.4 * (1 - k) + 0.05, 1 - k) + fragments(to[0], to[1] - 1.5, k, c.n(6), c.sid + 3, 1, 2) + (k < 0.5 ? text(to[0], to[1] - 4.5 - k, 1.7, '#ffffff', 'KNOCKED DOWN', 1 - k * 2) : ''); }
      return s; } },
  // EAR-03 Stone Charge: a translucent boulder shell surrounds him during the charge (owner 10B); the contact shoulders his man aside.
  'EAR-03-F': { id: 'EAR-03-F', name: 'Stone Charge', element: 'Earth', until: ['stone_charge'], tail: 0.5, lead: 0.25,
    o: (c) => { const k = clamp01((c.age + 0.25) / 0.35); const o = (c.stopped ? 1 - c.stopK : 1) * (c.age < 0 ? k : 1); const r = 2.6 * ease(k); let s = `<g opacity="${op(o)}"><circle cx="${f2(c.cx)}" cy="${f2(c.cy - 0.5)}" r="${f2(r)}" fill="${STONE}" fill-opacity="0.35" stroke="${STONE_D}" stroke-width="0.22"/>`; for (let i = 0; i < 6; i++) { const a = (i / 6) * 2 * PI + c.t * 2.5; s += `<line x1="${f2(c.cx + cos(a) * r * 0.3)}" y1="${f2(c.cy - 0.5 + sin(a) * r * 0.3)}" x2="${f2(c.cx + cos(a) * r * 0.95)}" y2="${f2(c.cy - 0.5 + sin(a) * r * 0.95)}" stroke="${STONE_D}" stroke-width="0.12" opacity="0.6"/>`; } s += '</g>';
      if (c.stopped && c.stopEv) { const v = c.stopEv.victim ? c.vpos(c.stopEv.victim) : null; if (v) s += fragments(v[0], v[1], c.stopK, c.n(6), c.sid + 5, 1, 2.2) + (c.stopEv.won ? '' : text(v[0], v[1] - 4, 1.6, '#ffffff', 'HOLDS', 1 - c.stopK)); } return s; },
    u: (c) => disc(c.cx, c.cy + 0.8, 2.2, 0.9, '#c8b89a', 0.3 * (c.stopped ? 1 - c.stopK : 1)) },
  // EAR-04 Stone Cradle: at the catch stone cuffs form around both of the returner's legs (he is held at the catch spot), then crumble
  // after the whistle; no lingering obstacle or field. Formula punt: drawn on the kick animation (src/ui/fx/kick-fx.js).
  'EAR-04-F': { id: 'EAR-04-F', at: { impact: 0.2 }, na: ['anticipation'], name: 'Stone Cradle', element: 'Earth', dur: 'play', shake: true, cue: () => 'Stone Cradle',
    o: (c) => { const v = c.victim; if (!v) return ''; const form = ease(clamp01(c.age / 0.35)); const end = c.last - c.item.t0; const crumble = clamp01((c.age - end) / 0.6); let s = '';
      for (let i = -1; i <= 1; i += 2) { const x = v[0] + i * 0.55; const hgt = 1.1 * form; s += rect(x - 0.5, v[1] + 0.9 - hgt, 1, hgt, STONE, 1 - crumble, ` rx="0.2" stroke="${STONE_D}" stroke-width="0.1"`) + rect(x - 0.5, v[1] + 0.9 - hgt, 1, 0.22 * form, STONE_L, 1 - crumble); }
      if (c.age < 0.35) s += fragments(v[0], v[1] + 0.8, c.age / 0.35, c.n(4), c.sid, 0.8, 1.2) + ring(v[0], v[1] + 0.8, 0.5 + c.age * 5, STONE_L, 0.2, 1 - c.age / 0.35); // stone gathers from the turf
      if (crumble > 0) s += fragments(v[0], v[1] + 0.6, crumble, c.n(6), c.sid + 3, 1, 1.6); return s; } },
  // EAR-05 Stone Screen: a jagged slab rises beside him, travels with him over a ground seam, sets in place when met, cracks into rubble.
  'EAR-05-F': { id: 'EAR-05-F', at: { impact: 0.2 }, na: ['target'], name: 'Stone Screen', element: 'Earth', until: ['wall_stop', 'ability_end'], tail: 0.7, path: true, shake: true,
    o: (c) => { const w = c.ev.wall; if (!w) return ''; const o0 = c.origin || [c.cx, c.cy]; const base = c.S(w.x0, w.y0), base2 = c.S(w.x1, w.y1); // over the monsters; the wall's svg rect at activation, kept relative to him while it travels
      const ox = Math.min(base[0], base2[0]) - o0[0], oy = Math.min(base[1], base2[1]) - o0[1]; const W = Math.abs(base2[0] - base[0]), H = Math.abs(base2[1] - base[1]);
      const setAt = c.stopped && c.stopEv?.kind === 'wall_stop' ? c.path[c.path.length - 1] : null; const anchor = setAt || (c.stopped ? c.path[c.path.length - 1] : [c.cx, c.cy]); const ended = c.stopped && c.stopEv?.kind === 'ability_end';
      const x0 = anchor[0] + ox, y0 = anchor[1] + oy; const rise = ease(clamp01(c.age / 0.3)); const o = ended ? 1 - c.stopK : 1; let s = '';
      if (c.path.length > 1) s += path(pathOf(c.path.map(([x, y]) => [x + ox + W / 2, y + oy + H])), STONE_D, 0.35, 0.6 * o, ' stroke-dasharray="0.5 0.3"'); // the ground seam
      s += slab(x0, y0, x0 + W, y0 + H, o, rise, ended ? c.stopK : 0); if (ended) s += fragments(x0 + W / 2, y0 + H / 2, c.stopK, c.n(7), c.sid, 1, 2.5); if (c.age < 0.4) s += fragments(x0 + W / 2, y0 + H, clamp01(c.age / 0.4), c.n(5), c.sid + 2, 0.8, 1.6); return s; } },
  // EAR-06 Landslide: both fists strike the turf; a continuous stone wall erupts across the front, surges forward carrying the targets back, fractures.
  'EAR-06-F': { lead: 0.35, id: 'EAR-06-F', name: 'Landslide', element: 'Earth', until: ['ability_end'], tail: 0.8, shake: true,
    o: (c) => { const w = c.ev.wall; if (!w) return ''; const push = c.ev.push || 2; // over the monsters: the wall stands across the front and advances by the push
      const adv = c.stopped ? push : push * clamp01(c.age / 0.3); const [ax, ay] = c.S(0.5 + adv, w.y0), [bx, by] = c.S(0.5 + adv, w.y1); const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx); const y = ay; const o = c.stopped ? 1 - c.stopK : 1; let s = '';
      if (c.age < 0) { const k = clamp01((c.age + 0.35) / 0.35); for (let i = -1; i <= 1; i += 2) s += poly([[c.cx + i * 1.1 - 0.5, c.cy - 1.6 - 1.4 * k], [c.cx + i * 1.1 + 0.5, c.cy - 1.8 - 1.4 * k], [c.cx + i * 1.1 + 0.6, c.cy - 0.9 - 1.4 * k], [c.cx + i * 1.1 - 0.4, c.cy - 0.8 - 1.4 * k]], STONE, 1, ` stroke="${STONE_D}" stroke-width="0.12"`); return s; } // both fists rise before the slam
      if (c.age < 0.35) { const k = c.age / 0.35; for (let i = -1; i <= 1; i += 2) s += ring(c.cx + i * 0.9, c.cy + 0.6, 0.3 + k * 1.6, STONE_L, 0.3 * (1 - k) + 0.05, 1 - k) + fragments(c.cx + i * 0.9, c.cy + 0.6, k, c.n(3), c.sid + i, 0.9, 1.2); } // both fists strike the turf
      s += slab(x0, y - 0.35, x1, y + 0.35, o, ease(clamp01(c.age / 0.25)), c.stopped ? c.stopK : 0); for (let i = 0; i < c.n(5); i++) { const x = x0 + (x1 - x0) * ((i + 0.5) / 5); s += blob(x, y - 1.5 - (c.age % 0.5) * 2, 0.3, '#c8b89a', 0.5 * o); }
      if (c.stopped) s += fragments((x0 + x1) / 2, y, c.stopK, c.n(9), c.sid + 7, 1, (x1 - x0) / 2); for (const v of c.victims) if (!c.stopped || c.stopK < 0.5) s += ring(v[0], v[1], 1.5, '#ffffff', 0.2, 0.6 * o); return s; } },

  // ICE-01 Frostmark: banked by a made field goal (formula kick); the braking patch's frost sweep is the next play's reveal (fields-fx.js).
  'ICE-01-F': { id: 'ICE-01-F', na: ['target'], name: 'Frostmark', element: 'Ice', dur: 0.8, o: (c) => star(c.cx, c.cy - 3.6 - c.k, 0.7, '#ffffff', 1 - c.k, 4) },
  // ICE-02 Frost Nip: a snowball fired at the receiver (owner override); the standard Slowed badge only if it applies.
  'ICE-02-F': { id: 'ICE-02-F', at: { impact: 0.4 }, name: 'Frost Nip', element: 'Ice', dur: 1.0, cue: () => 'Snowball!',
    o: (c) => { const e = c.ev; const from = e.fromX != null ? c.S(e.fromX, e.fromY) : [c.cx, c.cy]; const to = c.victim || (e.x != null ? c.S(e.x, e.y) : from); const FL = 0.3; let s = '';
      if (c.age < FL) { const k = c.age / FL; const x = from[0] + (to[0] - from[0]) * k, y = from[1] + (to[1] - from[1]) * k - sin(k * PI) * 2.5 - 1; s += snowball(x, y, 0.55, 1, false); for (let i = 1; i <= c.n(3); i++) { const kk = Math.max(0, k - i * 0.07); s += blob(from[0] + (to[0] - from[0]) * kk, from[1] + (to[1] - from[1]) * kk - sin(kk * PI) * 2.5 - 1, 0.2, '#ffffff', 0.6 - i * 0.15); } }
      else { const k = clamp01((c.age - FL) / 0.6); for (let i = 0; i < c.n(6); i++) { const a = (i / 6) * 2 * PI + h(c.sid, i); const d = (0.5 + h(c.sid, i, 2)) * easeOut(k) * 2; s += blob(to[0] + cos(a) * d, to[1] - 1 + sin(a) * d * 0.7, 0.28 * (1 - k) + 0.05, '#ffffff', 1 - k); } s += ring(to[0], to[1] - 1, 0.4 + k * 1.6, '#bfe8ff', 0.25, 1 - k); }
      return s; } },
  // ICE-03 Snowfall Slam: a ground slam, two shadow markers, two snowballs fall; on offensive impact they burst, else they stay as solid obstacles.
  'ICE-03-F': { id: 'ICE-03-F', na: ['target'], name: 'Snowfall Slam', element: 'Ice', dur: 'play', shake: true,
    sub: { snowball: { dur: 'play', noCue: true, u: (c) => { const [x, y] = c.origin || [c.cx, c.cy]; const r = (c.ev.radius || 1) * 1.1; if (c.ev.result !== 'obstacle') { if (c.age > 0.8) return ''; const k = c.age / 0.8; let s = ring(x, y, 0.5 + k * 2.5, '#ffffff', 0.3 * (1 - k) + 0.05, 1 - k); for (let i = 0; i < c.n(7); i++) { const a = (i / 7) * 2 * PI + h(c.sid, i); const d = (0.5 + h(c.sid, i, 2) * 1.5) * easeOut(k) * 2; s += blob(x + cos(a) * d, y + sin(a) * d * 0.7 - sin(k * PI) * 1.5, 0.3 * (1 - k) + 0.05, '#ffffff', 1 - k); } return s; } // burst
      return (c.age < 0.3 ? ring(x, y + 0.3, 0.6 + c.age * 5, '#ffffff', 0.25, 1 - c.age / 0.3) : ''); }, o: (c) => { const [x, y] = c.origin || [c.cx, c.cy]; const r = (c.ev.radius || 1) * 1.1; return c.ev.result === 'obstacle' ? snowball(x, y - r * 0.5, r, c.fade) : ''; } } }, // a solid obstacle for the play, over the monsters
    u: (c) => { let s = ''; if (c.age < 0.5) s += ring(c.cx, c.cy + 0.7, 0.5 + c.age * 6, '#e6f7ff', 0.4 * (1 - c.age / 0.5) + 0.05, 1 - c.age / 0.5) + disc(c.cx, c.cy + 0.7, 1.8, 0.7, '#bfe8ff', 0.35 * (1 - c.age / 0.5)); // the slam
      const LAND = 0.6; for (const [mx, my] of c.ev.markers || []) { const [x, y] = c.S(mx, my); if (c.age < LAND) { const k = c.age / LAND; s += disc(x, y, 0.4 + k * 0.8, 0.2 + k * 0.4, '#0b1a14', 0.2 + 0.35 * k); } } return s; },
    o: (c) => { const LAND = 0.6; if (c.age >= LAND) return ''; let s = ''; const k = c.age / LAND; for (const [mx, my] of c.ev.markers || []) { const [x, y] = c.S(mx, my); const r = (c.ev.radius || 1) * 1.1; s += snowball(x, y - 16 * (1 - ease(k)) - r * 0.5, r * (0.6 + 0.4 * k), 1, false); } return s; } },
  // ICE-04 Permafrost: both front hooves stamp; the frost wave spreading across the backfield rectangle is the field's reveal (fields-fx.js).
  'ICE-04-F': { id: 'ICE-04-F', na: ['target'], name: 'Permafrost', element: 'Ice', dur: 0.9, shake: true, cue: () => 'Permafrost',
    u: (c) => { let s = ''; for (let i = -1; i <= 1; i += 2) { const k = clamp01((c.age - (i < 0 ? 0 : 0.12)) / 0.4); if (k <= 0) continue; s += disc(c.cx + i * 0.8, c.cy + 0.8, 0.3 + k * 1.4, 0.15 + k * 0.6, 'none', 1 - k, ' stroke="#ffffff" stroke-width="0.25"') + path(pathOf(jag(c.cx + i * 0.8, c.cy + 0.8, PI / 2 + i * 0.6, 2.2 * k, c.sid + i, 3)), '#ffffff', 0.18, 1 - k); } return s; },
    sub: { ability_ready: { dur: 0.9, cue: () => 'Permafrost banked', o: (c) => star(c.cx, c.cy - 3.6 - c.k, 0.7, '#ffffff', 1 - c.k, 4) } } },
  // ICE-05 Cold Snap: a low frost ring while the aura is on (ambient); the pulse briefly crystallizes the enemy's ability indicator.
  'ICE-05-F': { id: 'ICE-05-F', at: { impact: 0.2 }, name: 'Cold Snap', element: 'Ice', dur: 1.1, cue: () => 'Cold Snap',
    o: (c) => { const v = c.victim; if (!v) return ''; const k = c.k; let s = ring(c.cx, c.cy + 0.7, 2 + k * 4, '#e6f7ff', 0.35 * (1 - k) + 0.05, 1 - k); // the pulse
      const grow = ease(clamp01(c.age / 0.3)); s += `<g opacity="${op(1 - k * k)}" transform="translate(${f2(v[0])} ${f2(v[1] - 4.4)}) scale(${f2(grow)})"><polygon points="0,-1.1 0.8,0 0,1.1 -0.8,0" fill="#bfe8ff" stroke="#ffffff" stroke-width="0.14"/><polygon points="0,-0.6 0.4,0 0,0.6 -0.4,0" fill="#ffffff" opacity="0.8"/></g>`; return s; } },
  // ICE-06 Second Chance: before the miss is declared Glacivern launches an ice shard into the football and visibly redirects it toward
  // the uprights; the one final result follows (the drawn flight bends: src/ui/fx/kick-fx.js). Formula field goal.
  'ICE-06-F': { id: 'ICE-06-F', at: { impact: 0.1 }, na: ['target'], name: 'Second Chance', element: 'Ice', dur: 'play', shake: true, cue: (c) => (c.ev.good ? 'Second Chance!' : 'Second Chance: still wide'),
    lead: 0.3,
    o: (c) => { const to = c.ev.x != null ? c.S(c.ev.x, c.ev.y) : null; const from = c.ev.fromX != null ? c.S(c.ev.fromX, c.ev.fromY) : [c.cx, c.cy]; if (!to) return ''; let s = '';
      if (c.age < 0) { const k = clamp01((c.age + 0.3) / 0.3); const x = from[0] + (to[0] - from[0]) * k, y = from[1] + (to[1] - 1.4 - from[1]) * k; s += blob(x, y, 1.1, '#bfe8ff', 0.35) + poly([[x, y - 1.6], [x + 0.6, y], [x, y + 1.6], [x - 0.6, y]], '#e6f7ff', 1, ` stroke="#8ac6ff" stroke-width="0.12" transform="rotate(${f2(Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / PI + 90)} ${f2(x)} ${f2(y)})"`) + line(from[0], from[1] - 0.5, x, y, '#bfe8ff', 0.3, 0.8, ' stroke-dasharray="0.6 0.4"'); return s; } // the shard flies
      if (c.age < 0.6) { const k = c.age / 0.6; s += ring(to[0], to[1] - 1.4, 0.4 + k * 2.6, '#ffffff', 0.35 * (1 - k) + 0.05, 1 - k); for (let i = 0; i < c.n(7); i++) { const a = (i / 7) * 2 * PI; const d = easeOut(k) * 2; s += poly([[0, -0.4], [0.18, 0], [0, 0.4], [-0.18, 0]].map(([dx, dy]) => [to[0] + cos(a) * d + dx, to[1] - 1.4 + sin(a) * d + dy]), '#e6f7ff', 1 - k); } } // it shatters on the ball
      return s; },
    b: (c) => { if (c.age < 0 || !c.ball || !c.ball[2]) return ''; const [bx, by] = c.ball; const [px, py] = c.pball || [bx, by + 1]; const vx = bx - px, vy = by - py, vl = Math.hypot(vx, vy) || 1; let s = ''; for (let i = 1; i <= c.n(5); i++) s += star(bx - vx / vl * i * 0.7, by - vy / vl * i * 0.7, 0.32 - i * 0.04, '#e6f7ff', 0.9 - i * 0.15, 4); return s + ring(bx, by, 1.1, '#bfe8ff', 0.18, 0.8); } },
};
/** Cold Snap's aura ring (ambient while the owner is on the field; low on the ground so markers stay readable). */
export const COLD_SNAP_AMBIENT = { id: 'ICE-05-F', name: 'Cold Snap', element: 'Ice', u: (c) => frostRing(c.cx, c.cy, 3.3, c.t, 0.55) };
