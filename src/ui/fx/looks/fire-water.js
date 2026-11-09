// Task 8 looks: Fire and Water (Dex "Visuals" rows FIR-01..06, WAT-01..06). See src/ui/fx/t8-fx.js for the look contract and the
// drawing context `c`. Every function returns SVG; `u` draws under the monsters, `o` over them, `b` around the ball in the air.
import { f2, h, op, clamp01, ease, easeOut, cos, sin, PI, ring, blob, disc, line, rect, poly, path, pathOf, star, text, jag, crescent, countFor } from '../prims.js';

const fwd = (c) => (c.team === 'off' ? -1 : 1);
/** Flame tongues around a point (the body engulfed in flame). */
function flames(x, y, r, t, sid, n, o, L) { let s = ''; for (let i = 0; i < n; i++) { const a = (i / n) * 2 * PI + sin(t * 7 + i) * 0.2; const fl = r * (0.8 + 0.5 * h(sid, i, Math.floor(t * 10))); const bx = x + cos(a) * r * 0.55, by = y + sin(a) * r * 0.45; s += `<path d="M ${f2(bx - 0.45)} ${f2(by)} Q ${f2(bx + cos(a) * fl * 0.4)} ${f2(by + sin(a) * fl - 0.3)} ${f2(bx + cos(a) * fl * 0.9)} ${f2(by + sin(a) * fl * 0.9 - 0.9)} Q ${f2(bx + 0.5)} ${f2(by - 0.2)} ${f2(bx + 0.45)} ${f2(by)} Z" fill="${i % 2 ? L.a : L.b}" opacity="${op(o)}"/>`; } return s; }
/** Droplets travelling from (x0,y0) to (x1,y1) over phase k. */
function droplets(x0, y0, x1, y1, k, n, sid, L, o = 1) { let s = ''; for (let i = 0; i < n; i++) { const kk = clamp01(k * 1.3 - i * 0.08); if (kk <= 0) continue; const j = (h(sid, i) - 0.5) * 1.2; const x = x0 + (x1 - x0) * kk + j, y = y0 + (y1 - y0) * kk - sin(kk * PI) * 1.2; s += disc(x, y, 0.28, 0.4, i % 2 ? L.a : L.c, (1 - kk * 0.4) * o); } return s; }

export const FIRE_WATER = {
  // FIR-01 Blazing Resolve: the charge bar lives over the head (overhead.js); the ignition engulfs the runner in flame for the encounter.
  'FIR-01-F': { id: 'FIR-01-F', name: 'Blazing Resolve', element: 'Fire', dur: 1.5, shake: true, charge: { max: 3 }, cue: () => 'Ignites!',
    u: (c) => disc(c.cx, c.cy + 0.7, 2.4 + 0.3 * sin(c.t * 9), 1.1, c.L.b, 0.45 * c.fade) + (c.age < 0.35 ? ring(c.cx, c.cy, 1 + c.age * 9, c.L.a, 0.5 * (1 - c.age / 0.35) + 0.1, 1 - c.age / 0.35) : ''),
    o: (c) => flames(c.cx, c.cy - 0.6, 2.3, c.t, c.sid, c.n(7), 0.9 * c.fade, c.L) },
  // FIR-02 Impact Pyre: charges fill a three-part bar (ability_charge events bump it); the bloom is the field's reveal at the owner's spot.
  'FIR-02-F': { id: 'FIR-02-F', name: 'Impact Pyre', element: 'Fire', dur: 1.0, charge: { max: 3 },
    o: (c) => { const k = ease(c.k); const [x, y] = c.origin || [c.cx, c.cy]; return c.age < 0.9 ? flames(x, y + 0.3, 1.6 + k, c.t, c.sid, c.n(6), 1 - c.k, c.L) : ''; },
    sub: { ability_charge: { dur: 0.7, o: (c) => star(c.cx, c.cy - 3.2 - c.k, 0.55, c.L.a, 1 - c.k) } } },
  // FIR-03 Meteor Impact: a flaming powered pass; at the catch an expanding shockwave synchronized to the catch pushes opponents out.
  'FIR-03-F': { id: 'FIR-03-F', name: 'Meteor Impact', element: 'Fire', phase: {
    release: { main: true, dur: 'play', b: (c) => { if (!c.ball || !c.ball[2]) return ''; const [bx, by] = c.ball; const [px, py] = c.pball || [bx, by + 1]; const vx = bx - px, vy = by - py, vl = Math.hypot(vx, vy) || 1; let s = '';
      const n = c.n(7); for (let i = 1; i <= n; i++) { const d = i * 0.75; const j = (h(c.sid, i, Math.round(c.t * 10)) - 0.5) * 0.8; s += blob(bx - vx / vl * d - vy / vl * j, by - vy / vl * d + vx / vl * j, 1 - i * 0.1, i % 3 === 0 ? '#ffd25a' : i % 2 ? c.L.b : c.L.a, 0.95 - i * 0.1); }
      return s + blob(bx, by, 1.8, c.L.b, 0.5) + blob(bx, by, 1.25, c.L.a, 0.75); } },
    shockwave: { dur: 0.9, shake: true, u: (c) => { const [x, y] = c.origin || [c.cx, c.cy]; const R = (c.ev.radius || 3); const k = easeOut(c.age / 0.55); let s = ring(x, y, 0.4 + R * k, c.L.a, 0.6 * (1 - k) + 0.1, 1 - c.k) + disc(x, y, R * k, R * k * 0.6, c.L.b, 0.35 * (1 - k));
      const n = c.n(8); for (let i = 0; i < n; i++) { const a = (i / n) * 2 * PI; s += line(x + cos(a) * R * k * 0.6, y + sin(a) * R * k * 0.6, x + cos(a) * (R * k + 0.8), y + sin(a) * (R * k + 0.8), c.L.a, 0.3, (1 - k) * 0.9); }
      for (const v of c.victims) s += ring(v[0], v[1], 1.4 + k, '#ffffff', 0.25, (1 - k) * 0.8); return s; } } } },
  // FIR-04 Scorch Mark: three glowing claw marks branded on the blocker for the rest of the play.
  'FIR-04-F': { id: 'FIR-04-F', name: 'Scorch Mark', element: 'Fire', dur: 'play',
    o: (c) => { const v = c.victim; if (!v) return ''; const glow = 0.7 + 0.3 * sin(c.t * 6); const k = clamp01(c.age / 0.3); let s = ''; for (let i = -1; i <= 1; i++) s += line(v[0] - 1 + i * 0.65, v[1] - 1.4, v[0] - 1 + i * 0.65 + 0.8 * k, v[1] - 1.4 + 2.2 * k, c.L.a, 0.34, glow * c.fade) + line(v[0] - 1 + i * 0.65, v[1] - 1.4, v[0] - 1 + i * 0.65 + 0.8 * k, v[1] - 1.4 + 2.2 * k, '#ffffff', 0.12, glow * c.fade * 0.8);
      if (c.age < 0.5) s += flames(v[0], v[1], 1.5, c.t, c.sid, c.n(4), 1 - c.age / 0.5, c.L); return s; } },
  // FIR-05 Heat Haze: a moving shimmer around the source while the aura runs; an opponent caught in it shimmers too (ambient + event).
  'FIR-05-F': { id: 'FIR-05-F', name: 'Heat Haze', element: 'Fire', dur: 0.8, noCue: true,
    o: (c) => { const v = c.victim; if (!v) return ''; return haze(v[0], v[1] - 0.6, 1.6, c.t, c.sid, c.n(4), (1 - c.k) * 0.8, c.L); } },
  // FIR-06 Burning Wake: the earned width is announced at the whistle; the spawn is the field's symmetric reveal (fields-fx.js).
  'FIR-06-F': { id: 'FIR-06-F', name: 'Burning Wake', element: 'Fire', phase: { spawn: { main: true, dur: 0.8, cue: () => 'Burning Wake', o: (c) => flames(c.cx, c.cy - 0.4, 1.8, c.t, c.sid, c.n(5), 1 - c.k, c.L) } },
    sub: { ability_charge: { dur: 1.2, o: (c) => text(c.cx, c.cy - 5.2 - c.k * 1.2, 1.9, c.L.a, `+${(c.ev.width || 0).toFixed(0)} yd wake`, 1 - c.k * c.k) + flames(c.cx, c.cy - 0.4, 1.5, c.t, c.sid, c.n(4), 1 - c.k, c.L) } } },

  // WAT-01 Splashdown: the breakup soaks the spot (splash); the shallow wet rectangle appears next play (fields-fx.js). Recharge bar: overhead.
  'WAT-01-F': { id: 'WAT-01-F', name: 'Splashdown', element: 'Water', dur: 1.0, charge: { cdMax: 3 },
    u: (c) => { const [x, y] = c.origin || [c.cx, c.cy]; const k = easeOut(c.k); let s = disc(x, y + 0.5, 0.5 + 2.4 * k, 0.3 + 1.1 * k, c.L.c, 0.5 * (1 - c.k)) + disc(x, y + 0.5, 0.3 + 1.6 * k, 0.2 + 0.7 * k, 'none', 1 - c.k, ` stroke="${c.L.a}" stroke-width="0.25"`);
      const n = c.n(8); for (let i = 0; i < n; i++) { const a = (i / n) * 2 * PI; const d = (1 + h(c.sid, i) * 1.6) * k; s += disc(x + cos(a) * d * 1.3, y + 0.5 + sin(a) * d * 0.6 - sin(k * PI) * 1.8, 0.25, 0.38, i % 2 ? c.L.a : c.L.c, 1 - c.k); } return s; } },
  // WAT-02 Divided Guard: at the snap the body divides into two lobes; when the second rusher arrives each lobe braces against its man.
  'WAT-02-F': { id: 'WAT-02-F', name: 'Divided Guard', element: 'Water', phase: {
    snap: { main: true, dur: 'play', u: (c) => { const k = ease(clamp01(c.age / 0.4)); const sp = 1.3 * k; return disc(c.cx - sp, c.cy + 0.3, 1.5, 1.2, c.L.b, 0.45 * c.fade) + disc(c.cx + sp, c.cy + 0.3, 1.5, 1.2, c.L.b, 0.45 * c.fade) + disc(c.cx - sp, c.cy + 0.3, 1.5, 1.2, 'none', 0.9 * c.fade, ` stroke="${c.L.a}" stroke-width="0.22"`) + disc(c.cx + sp, c.cy + 0.3, 1.5, 1.2, 'none', 0.9 * c.fade, ` stroke="${c.L.a}" stroke-width="0.22"`); } },
    double: { dur: 'play', cue: () => 'Holds both', u: (c) => { let s = ''; c.victims.forEach((v, i) => { const sx = c.cx + (i ? 1.3 : -1.3); s += `<path d="M ${f2(sx)} ${f2(c.cy + 0.6)} Q ${f2((sx + v[0]) / 2)} ${f2((c.cy + v[1]) / 2 + 0.8)} ${f2(v[0])} ${f2(v[1] + 0.8)}" fill="none" stroke="${c.L.b}" stroke-width="1.1" stroke-linecap="round" opacity="${op(0.6 * c.fade)}"/>` + path(`M ${f2(sx)} ${f2(c.cy + 0.6)} Q ${f2((sx + v[0]) / 2)} ${f2((c.cy + v[1]) / 2 + 0.8)} ${f2(v[0])} ${f2(v[1] + 0.8)}`, c.L.c, 0.25, 0.9 * c.fade, ' stroke-dasharray="0.7 0.5"'); }); return s; } } } },
  // WAT-03 Pressure Drain: stamina points flow from the blocker to the crab; the blocker's battery shows when he is low (overhead).
  'WAT-03-F': { id: 'WAT-03-F', name: 'Pressure Drain', element: 'Water', dur: 1.1, charge: { cdMax: 3 },
    o: (c) => { const v = c.victim; if (!v) return ''; let s = droplets(v[0], v[1] - 0.5, c.cx, c.cy - 0.5, c.k, c.n(6), c.sid, c.L); if (c.age < 0.5) s += text(v[0], v[1] - 3.6 - c.age, 1.6, '#ff6a6a', `-${c.ev.points ?? ''}`, 1 - c.age / 0.5); if (c.ev.exhausted && c.age > 0.4) s += text(v[0], v[1] - 3.4, 1.4, '#ff4d4d', 'EXHAUSTED', c.fade); return s; } },
  // WAT-04 Second Touch: a physical bobble, the fin tap and the second reach; no status, field or label.
  'WAT-04-F': { id: 'WAT-04-F', name: 'Second Touch', element: 'Water', dur: 0.8, noCue: true,
    o: (c) => { const k = c.k; const bob = sin(k * PI) * 1.6; let s = disc(c.cx + 0.9 - k * 0.6, c.cy - 2 - bob, 0.75, 0.48, '#d9924f', 0.9 * (1 - k * 0.6), ' stroke="#fff" stroke-width="0.15"'); // the ball pops up and comes back down
      const fin = `M ${f2(c.cx - 1.5)} ${f2(c.cy - 0.4)} q 0.6 -2.2 1.6 -1.6 q -0.8 1 -1 1.9 Z`; s += `<path d="${fin}" fill="${c.L.b}" stroke="${c.L.c}" stroke-width="0.12" opacity="${op(1 - k)}" transform="rotate(${f2(-20 + 40 * sin(k * PI * 2))} ${f2(c.cx - 1.2)} ${f2(c.cy - 0.6)})"/>`;
      for (let i = 0; i < c.n(3); i++) s += disc(c.cx + 0.9 + (h(c.sid, i) - 0.5) * 1.2, c.cy - 2.4 - bob + i * 0.3, 0.16, 0.24, c.L.c, (1 - k) * 0.8); return s; } },
  // WAT-05 Breakwater: a water barrier appears only when the protection happens (between the blocker and the sapped opponent).
  'WAT-05-F': { id: 'WAT-05-F', name: 'Breakwater', element: 'Water', dur: 0.7, noCue: true,
    u: (c) => { const v = c.victim; if (!v) return ''; const mx = (c.cx + v[0]) / 2, my = (c.cy + v[1]) / 2; const ang = Math.atan2(v[1] - c.cy, v[0] - c.cx) * 180 / PI + 90; const k = c.k; const hgt = 1.4 * sin(Math.min(1, k * 1.2) * PI) + 0.2;
      return `<g transform="rotate(${f2(ang)} ${f2(mx)} ${f2(my)})" opacity="${op(1 - k * k)}"><path d="M ${f2(mx - 1.8)} ${f2(my + 0.4)} Q ${f2(mx - 1.2)} ${f2(my - hgt)} ${f2(mx - 0.4)} ${f2(my - hgt * 0.6)} Q ${f2(mx + 0.4)} ${f2(my - hgt * 1.3)} ${f2(mx + 1.1)} ${f2(my - hgt * 0.5)} Q ${f2(mx + 1.6)} ${f2(my - hgt * 0.9)} ${f2(mx + 1.8)} ${f2(my + 0.4)} Z" fill="${c.L.b}" stroke="${c.L.c}" stroke-width="0.2"/><ellipse cx="${f2(mx)}" cy="${f2(my + 0.4)}" rx="2" ry="0.35" fill="${c.L.c}" opacity="0.5"/></g>`; } },
  // WAT-06 Tsunami Line: the interception earns it (the safety raises his arms in a water swirl); the raindrop and strip are the next play's reveal.
  'WAT-06-F': { id: 'WAT-06-F', name: 'Tsunami Line', element: 'Water', phase: { earned: { main: true, dur: 1.2, charge: { cdMax: 5 }, cue: () => 'Tsunami Line earned',
    u: (c) => { let s = ''; for (let i = 0; i < 3; i++) { const r = 0.8 + i * 0.9 + c.k * 1.5; s += disc(c.cx, c.cy + 0.6, r, r * 0.45, 'none', (1 - c.k) * 0.8, ` stroke="${i % 2 ? c.L.b : c.L.a}" stroke-width="0.3" stroke-dasharray="${f2(r)} ${f2(r * 0.6)}" transform="rotate(${f2(c.t * 160 * (i % 2 ? -1 : 1))} ${f2(c.cx)} ${f2(c.cy + 0.6)})"`); } return s; } } } },
};
function haze(x, y, r, t, sid, n, o, L) { let s = ''; for (let i = 0; i < n; i++) { const ph = (t * 0.9 + i / n) % 1; const yy = y + 1.2 - ph * 3; const w = r * (1 - ph * 0.4); s += `<path d="M ${f2(x - w)} ${f2(yy)} q ${f2(w / 2)} ${f2(-0.35 + 0.3 * sin(t * 6 + i))} ${f2(w)} 0 q ${f2(w / 2)} ${f2(0.35 - 0.3 * sin(t * 6 + i))} ${f2(w)} 0" fill="none" stroke="${L.a}" stroke-width="0.22" opacity="${op((1 - ph) * o)}"/>`; } return s; }
/** The Heat Haze aura (ambient, while its owner is on the field): wavy shimmer rising around him; markers stay readable (thin, low alpha). */
export const HEAT_HAZE_AMBIENT = { id: 'FIR-05-F', name: 'Heat Haze', element: 'Fire', o: (c) => haze(c.cx, c.cy - 0.6, 2.0, c.t, c.sid, c.n(4), 0.6, c.L) };
