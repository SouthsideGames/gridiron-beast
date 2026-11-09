// Task 8 looks: Light and Metal (Dex "Visuals" rows LIG-01..06, MET-01..06). Look contract: src/ui/fx/t8-fx.js.
import { f2, h, op, clamp01, ease, easeOut, cos, sin, PI, ring, blob, disc, line, rect, poly, path, pathOf, star, text, hex, jag } from '../prims.js';

const GOLD = '#ffd84a', GOLD_L = '#fff6c8', STEEL = '#cfd5e2', STEEL_D = '#5a6070', STEEL_L = '#f4f4f8';
const note = (x, y, s, fill, o) => `<g opacity="${op(o)}" transform="translate(${f2(x)} ${f2(y)}) scale(${f2(s)})"><ellipse cx="-0.35" cy="0.5" rx="0.45" ry="0.32" fill="${fill}" transform="rotate(-20 -0.35 0.5)"/><line x1="0.05" y1="0.45" x2="0.05" y2="-1.1" stroke="${fill}" stroke-width="0.18"/><path d="M 0.05 -1.1 q 0.7 0.2 0.7 0.9" fill="none" stroke="${fill}" stroke-width="0.18"/></g>`;
const rays = (x, y, r, n, t, o, colour = GOLD, w = 0.4) => { let s = ''; for (let i = 0; i < n; i++) { const a = (i / n) * 2 * PI + t * 0.6; s += line(x + cos(a) * r * 0.35, y + sin(a) * r * 0.35, x + cos(a) * r, y + sin(a) * r, colour, w, o); } return s; };
const plate = (x, y, w, hh, o, lift = 0) => rect(x - w / 2, y - hh / 2 - lift, w, hh, STEEL, o, ` rx="0.2" stroke="${STEEL_D}" stroke-width="0.12"`) + rect(x - w / 2 + 0.15, y - hh / 2 - lift + 0.12, w - 0.3, 0.18, STEEL_L, o * 0.8);
const prismShape = (x, y, s, o) => poly([[x, y - 1.2 * s], [x + 1 * s, y + 0.6 * s], [x - 1 * s, y + 0.6 * s]], '#e6f7ff', o, ' stroke="#ffffff" stroke-width="0.12"');
const RAINBOW = ['#ff5a5a', '#ffb13d', '#fff36a', '#6ad66a', '#5ab8ff', '#a06aff'];

export const LIGHT_METAL = {
  // LIG-01 Beacon Lane: the first-down catch banks it (a soft gold flash); the golden rectangle with clock particles is the next play's field.
  'LIG-01-F': { id: 'LIG-01-F', na: ['target'], name: 'Beacon Lane', element: 'Light', dur: 0.9, cue: () => 'Beacon Lane banked', charge: { cdMax: 6 },
    o: (c) => rays(c.cx, c.cy - 0.6, 2 + c.k * 2, c.n(8), c.t, (1 - c.k) * 0.8, GOLD, 0.3) + blob(c.cx, c.cy - 0.6, 1.2 * (1 - c.k), GOLD_L, (1 - c.k) * 0.6) },
  // LIG-02 Dawn Signal: song notes fly from the kicker to the chosen coverage teammate; the green boot badge if the status is accepted.
  'LIG-02-F': { id: 'LIG-02-F', at: { impact: 0.9 }, na: ['persistence'], name: 'Dawn Signal', element: 'Light', dur: 1.2, cue: (c) => (c.ev.accepted ? 'Dawn Signal' : 'Dawn Signal fades'),
    o: (c) => { const tp = c.pos(c.team, c.ev.target) || (c.ev.x != null ? c.S(c.ev.x, c.ev.y) : null); if (!tp) return ''; let s = ''; const n = c.n(4); for (let i = 0; i < n; i++) { const kk = clamp01(c.k * 1.4 - i * 0.12); if (kk <= 0 || kk >= 1) continue; const x = c.cx + (tp[0] - c.cx) * kk, y = c.cy - 1.5 + (tp[1] - 1.5 - (c.cy - 1.5)) * kk - sin(kk * PI) * 3 + (h(c.sid, i) - 0.5); s += note(x, y, 0.9, i % 2 ? GOLD : GOLD_L, 1); }
      if (c.k > 0.6 && c.ev.accepted) { const kk = (c.k - 0.6) / 0.4; s += `<g opacity="${op(1 - kk)}" transform="translate(${f2(tp[0])} ${f2(tp[1] - 4.6)})"><path d="M -0.9 -0.5 L 0.2 -0.5 L 0.2 0.3 L 0.9 0.5 L 0.9 0.8 L -0.9 0.8 Z" fill="#22c55e" stroke="#0b1a14" stroke-width="0.1"/></g>`; } return s; } },
  // LIG-03 Guiding Halo: a thin gold halo line connects the QB to the short-catch receiver, then the standard Shielded badge appears.
  'LIG-03-F': { id: 'LIG-03-F', at: { impact: 0.3 }, name: 'Guiding Halo', element: 'Light', dur: 1.0, cue: (c) => (c.ev.accepted ? 'Guiding Halo' : 'Halo cannot shield'),
    o: (c) => { const tp = c.pos(c.team, c.ev.target); if (!tp) return ''; const k = c.k; return line(c.cx, c.cy - 3, tp[0], tp[1] - 3, GOLD, 0.22, (1 - k) * 0.9) + disc(tp[0], tp[1] - 3.3, 1.1, 0.35, 'none', (1 - k) * 0.95, ` stroke="${GOLD}" stroke-width="0.28"`) + disc(c.cx, c.cy - 3.3, 1.1, 0.35, 'none', (1 - k) * 0.6, ` stroke="${GOLD}" stroke-width="0.2"`); } },
  // LIG-04 Prism Break: before the play choices a floating prism fires a rainbow beam and the selected field fractures (pre-snap item, host-supplied).
  'LIG-04-F': { id: 'LIG-04-F', at: { impact: 0.1 }, na: ['persistence'], name: 'Prism Break', element: 'Light', dur: 0.6, noCue: true, charge: { max: 3 }, o: () => '',
    pre: { lead: 1.2, dur: 0.6, cue: () => 'Prism Break', o: (c) => { const k = clamp01((c.age + 1.2) / 1.8); const px = c.cx, py = c.cy - 5 - sin(c.t * 2) * 0.2; const out = 1 - clamp01((c.age - 0.2) / 0.4); let s = prismShape(px, py, 1 + 0.2 * sin(c.t * 4), out);
      const R = c.ev.rect; const tgt = R ? (() => { const a = c.S(R.yard[0], R.lat[0]), b = c.S(R.yard[1], R.lat[1]); return { x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]) }; })() : null;
      const [tx, ty] = tgt ? [(tgt.x0 + tgt.x1) / 2, (tgt.y0 + tgt.y1) / 2] : [px, py + (c.team === 'off' ? -12 : 12)];
      if (k > 0.2 && k < 0.85) { const kb = clamp01((k - 0.2) / 0.3); for (let i = 0; i < 6; i++) { const off = (i - 2.5) * 0.35; s += line(px, py, px + (tx + off - px) * kb, py + (ty - py) * kb, RAINBOW[i], 0.32, 0.9); } } // the rainbow beam
      if (tgt && k > 0.45) { const kf = clamp01((k - 0.45) / 0.55); s += rect(tgt.x0, tgt.y0, tgt.x1 - tgt.x0, tgt.y1 - tgt.y0, '#ffffff', 0.35 * (1 - kf), ' stroke="#ffffff" stroke-width="0.25"'); // the field lights up, cracks and falls apart in light
        for (let i = 0; i < 5; i++) s += path(pathOf(jag(tgt.x0 + (tgt.x1 - tgt.x0) * h(c.sid, i), tgt.y0, PI / 2, tgt.y1 - tgt.y0, c.sid + i, 4, 0.8)), '#ffffff', 0.18, 1 - kf);
        for (let i = 0; i < c.n(10); i++) { const x = tgt.x0 + (tgt.x1 - tgt.x0) * h(c.sid, i, 3), y = tgt.y0 + (tgt.y1 - tgt.y0) * h(c.sid, i, 4); s += poly([[0, -0.5], [0.45, 0.2], [-0.45, 0.2]].map(([dx, dy]) => [x + dx * (1 - kf * 0.5), y + dy + kf * 1.5]), RAINBOW[i % 6], (1 - kf) * 0.9); } }
      return s; } } },
  // LIG-05 Radiant Pursuit: a radiant trail links the pursuer to the runner; allied bodies he passes through shimmer; it fades before the tackle.
  'LIG-05-F': { id: 'LIG-05-F', at: { target: 0.3, impact: 0.4 }, name: 'Radiant Pursuit', element: 'Light', until: ['ability_end'], tail: 0.5, path: true, cue: () => 'Radiant Pursuit',
    u: (c) => { const o = c.stopped ? 1 - c.stopK : 1; let s = c.path.length > 1 ? path(pathOf(c.path), GOLD, 1.6, 0.45 * o) + path(pathOf(c.path), GOLD_L, 0.35, 0.9 * o) : ''; const carrier = c.ball && !c.ball[2] ? c.ball : null; if (carrier) s += line(c.cx, c.cy, carrier[0], carrier[1] + 0.7, GOLD, 0.22, 0.7 * o, ' stroke-dasharray="0.7 0.5"');
      return s; },
    o: (c) => { const o = c.stopped ? 1 - c.stopK : 1; let s = disc(c.cx, c.cy - 3.4, 1, 0.32, 'none', 0.9 * o, ` stroke="${GOLD}" stroke-width="0.26"`); // the halo
      for (const [x, y, slot] of c.all(c.team)) { if (slot === c.slot || Math.hypot(x - c.cx, y - c.cy) > 1.6) continue; s += rays(x, y - 0.6, 1.8, c.n(6), c.t * 3, 0.8 * o, GOLD_L, 0.22) + ring(x, y - 0.6, 1.5 + sin(c.t * 10) * 0.2, GOLD_L, 0.18, 0.8 * o); } // an allied body he passes through shimmers; he stays visible
      return s; } },
  // LIG-06 Daybreak: the sun charge icon over the head (overhead, 2 charges); a golden flare on the catch; everyone else wanders while he runs.
  'LIG-06-F': { id: 'LIG-06-F', at: { impact: 0.2 }, name: 'Daybreak', element: 'Light', dur: 'play', shake: true, charge: { max: 2, icon: 'sun' },
    u: (c) => { const [x, y] = c.origin || [c.cx, c.cy]; const k = clamp01(c.age / 0.8); const soft = c.reducedFlash ? 0.45 : 1; let s = k < 1 ? blob(x, y, 1 + easeOut(k) * 14, GOLD_L, (1 - k) * 0.55 * soft) + rays(x, y, 3 + k * 12, c.n(10), c.t, (1 - k) * 0.8 * soft, GOLD, 0.5) : '';
      if (c.age > 0.3) for (const a of c.ev.affected || []) { const [side, slot] = a.split(':'); const p = c.pos(side, slot); if (!p) continue; const ph = c.t * 3 + slot.charCodeAt(0); s += `<path d="M ${f2(p[0])} ${f2(p[1] - 3.2)} m -0.8 0 a 0.8 0.45 0 1 1 1.6 0 a 0.5 0.3 0 1 1 -1 0" fill="none" stroke="${GOLD}" stroke-width="0.2" opacity="${op(0.8 * c.fade)}" transform="rotate(${f2((ph * 57) % 360)} ${f2(p[0])} ${f2(p[1] - 3.2)})"/>`; } return s; },
    o: (c) => `<circle cx="${f2(c.cx)}" cy="${f2(c.cy - 0.5)}" r="2.3" fill="none" stroke="${GOLD}" stroke-width="0.25" stroke-dasharray="0.9 0.5" stroke-dashoffset="${f2(-c.t * 5)}" opacity="${op(0.9 * c.fade)}"/>` },

  // MET-01 Anchor Plate: a steel paw plate drops under his feet at the first push; the absorbed yardage is ticked when it is spent.
  'MET-01-F': { id: 'MET-01-F', name: 'Anchor Plate', element: 'Metal', until: ['ability_end'], tail: 0.9, charge: { cdMax: 5 },
    u: (c) => { const k = ease(clamp01(c.age / 0.25)); const o = c.stopped ? 1 - c.stopK : 1; let s = plate(c.cx, c.cy + 0.8, 3.2, 1.1, o, (1 - k) * 3); for (let i = 0; i < 4; i++) s += blob(c.cx - 0.9 + i * 0.6, c.cy + 0.45, 0.17, STEEL_D, o * 0.9); // the paw's toes
      if (c.age < 0.5 && c.age > 0.2) s += ring(c.cx, c.cy + 0.8, 1 + (c.age - 0.2) * 6, STEEL_L, 0.2, 1 - (c.age - 0.2) / 0.3); return s; },
    o: (c) => (c.stopped && c.stopEv?.absorbed != null ? text(c.cx, c.cy - 5 - c.stopK, 1.6, STEEL_L, `${c.stopEv.absorbed.toFixed(2)} yd absorbed`, 1 - c.stopK) : '') },
  // MET-02 Iron Lungs: a metal breath plume at his feet at the snap; the saved drain is a stamina-inspect tick, never a head buff.
  'MET-02-F': { id: 'MET-02-F', at: { impact: 0.3 }, na: ['anticipation', 'persistence'], name: 'Iron Lungs', element: 'Metal', dur: 1.3, noCue: true,
    u: (c) => { let s = ''; for (let i = 0; i < c.n(5); i++) { const kk = clamp01(c.k * 1.3 - i * 0.1); if (kk <= 0) continue; const side = i % 2 ? 1 : -1; s += disc(c.cx + side * (1.2 + kk * 1.6), c.cy + 0.9 - kk * 0.3, 0.5 + kk * 0.5, 0.3 + kk * 0.25, STEEL, (1 - kk) * 0.7); } return s; } },
  // MET-03 Gear Grid: banked by a long punt (formula kick); the clockwork grid assembling under the LB band is the next play's field reveal.
  'MET-03-F': { id: 'MET-03-F', na: ['target'], name: 'Gear Grid', element: 'Metal', dur: 0.6, noCue: true, o: () => '' },
  // MET-04 Ball Clamp: iron jaws briefly snap around the ball at the tackle point; no body biting, no new status. The token lives over the head.
  'MET-04-F': { id: 'MET-04-F', at: { impact: 0.15 }, na: ['persistence'], name: 'Ball Clamp', element: 'Metal', dur: 0.8, shake: true, charge: { max: 1, icon: 'jaw' }, cue: (c) => (c.ev.fumble ? 'Jarred loose!' : 'Ball Clamp'),
    o: (c) => { const [x, y] = c.origin || c.victim || [c.cx, c.cy]; const k = clamp01(c.age / 0.18); const g = 1.3 * (1 - k) + 0.25; let s = `<g opacity="${op(1 - c.k * c.k)}" stroke="${STEEL_D}" stroke-width="0.1">`; for (let i = 0; i < 4; i++) { s += poly([[x - 1.3 + i * 0.75, y - 0.9 - g], [x - 0.95 + i * 0.75, y - 0.9 - g + 0.65], [x - 0.6 + i * 0.75, y - 0.9 - g]], STEEL, 1) + poly([[x - 1.3 + i * 0.75, y - 0.9 + g], [x - 0.95 + i * 0.75, y - 0.9 + g - 0.65], [x - 0.6 + i * 0.75, y - 0.9 + g]], STEEL, 1); } s += '</g>';
      if (k >= 1 && c.age < 0.5) s += star(x, y - 0.9, 0.9 * (1 - (c.age - 0.18) / 0.32), STEEL_L, 1, 4); return s; } },
  // MET-05 Bulwark Grid: banked by a first down or a pancake; the four corner posts and floor grid are the next play's field (fields-fx.js).
  'MET-05-F': { id: 'MET-05-F', na: ['target'], name: 'Bulwark Grid', element: 'Metal', dur: 0.9, cue: () => 'Bulwark Grid banked', charge: { cdMax: 6 },
    o: (c) => { let s = ''; for (let i = 0; i < 4; i++) { const a = (i / 4) * 2 * PI + PI / 4; s += plate(c.cx + cos(a) * (1.6 + c.k * 1.2), c.cy - 0.5 + sin(a) * (1.1 + c.k * 0.8), 0.8, 0.8, 1 - c.k); } return s; } },
  // MET-06 Fortress Gate: an ancient machine plants two glowing steel gates with an open gap, visible before the snap movement.
  'MET-06-F': { id: 'MET-06-F', at: { impact: 0.0 }, na: ['target'], name: 'Fortress Gate', element: 'Metal', dur: 'play', lead: 0.6, shake: true,
    u: (c) => { let s = ''; const rise = ease(clamp01((c.age + 0.6) / 0.6)); const glow = 0.6 + 0.4 * sin(c.t * 4); for (const [x0, x1, y0, y1] of c.ev.panels || []) { const a = c.S(x0, y0), b = c.S(x1, y1); const X0 = Math.min(a[0], b[0]), X1 = Math.max(a[0], b[0]), Y0 = Math.min(a[1], b[1]), Y1 = Math.max(a[1], b[1]); const hgt = (Y1 - Y0) + 1.2 * rise;
      s += rect(X0, Y1 - hgt, X1 - X0, hgt, STEEL, c.fade, ` stroke="${STEEL_D}" stroke-width="0.14"`) + rect(X0 - 0.15, Y1 - hgt - 0.15, X1 - X0 + 0.3, hgt + 0.3, 'none', glow * c.fade * rise, ` stroke="${STEEL_L}" stroke-width="0.18" rx="0.2"`); for (let i = 0; i < 3; i++) s += blob(X0 + (X1 - X0) * ((i + 0.5) / 3), Y1 - hgt / 2, 0.14, STEEL_D, c.fade); }
      if (c.age < 0) s += ring(c.cx, c.cy + 0.7, 1 + rise * 3, STEEL_L, 0.3, 1 - rise); return s; } },
};
