// Signature looks (polish 2.0, GDD §23.12). The owner's rule: an ability's effect
// should explain itself without reading the card, and no two abilities should
// look alike just because they share an element. Each entry draws one ability:
//   u: ground layer, under the monsters (trails, streams, roots, cyclones, cracks)
//   o: top layer, over the monsters (eyes, hands, anchors, bolts, claws)
//   b: around the ball while it is in the air (fire, wind)
// Also here: monster status marks (stunned stars, frozen, flattened, confused,
// lost, slowed, spinning, charged...) drawn by the field for any monster.
// Pure drawing: every value comes from the engine's frames and events.

const f2 = (n) => (+n).toFixed(2);
const cos = Math.cos, sin = Math.sin, PI = Math.PI;
function h(a, b, c = 0) { let x = (a * 374761393 + b * 668265263 + c * 2246822519) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; }
const op = (v) => f2(Math.max(0, Math.min(1, v)));

/** Revisions of the signature looks: bump one to ask the owner to review that ability again. */
export const SIG_REV = Object.freeze({
  firestorm: 1, cinderclaw: 1, cerebrix: 1, duskrunner: 1, elderoot: 1, enigmane: 1, frostclaw: 1, glacivern: 1, icehorn: 1, joltrex: 1, mireclaw: 1, nocturne: 1,
  pyroclast: 1, stormcrown: 1, tempestra: 1, terrabull: 1, thornback: 1, tidefin: 1, tsunarok: 1, vyrnax: 1, wavehorn: 1, zephyr: 1, nyxshade: 1, lumen: 1,
  prism: 1, halofang: 1, aurelion: 1, ironjaw: 1, metalhorn: 1, aegistron: 1, astralux: 1, sablewing: 1, reefclaw: 1, rootram: 1, echolot: 1, scaleguard: 1,
});

// ------------------------------------------------------------ small pixel-art pieces
const star = (x, y, r, fill, o = 1) => { let p = ''; for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, rr = i % 2 ? r * 0.45 : r; p += `${f2(x + cos(a) * rr)},${f2(y + sin(a) * rr)} `; } return `<polygon points="${p}" fill="${fill}" stroke="#3a2a00" stroke-width="0.08" opacity="${op(o)}"/>`; };
const bolt = (x, y, s, fill, o = 1) => `<polygon points="${[[0, -1.2], [0.55, -1.2], [0.15, -0.2], [0.6, -0.2], [-0.35, 1.3], [-0.05, 0.15], [-0.5, 0.15]].map(([a, b]) => `${f2(x + a * s)},${f2(y + b * s)}`).join(' ')}" fill="${fill}" stroke="#4a3a00" stroke-width="0.1" opacity="${op(o)}"/>`;
const eye = (x, y, s, iris, open, o = 1) => { const ry = 0.55 * s * open; return `<g opacity="${op(o)}"><ellipse cx="${f2(x)}" cy="${f2(y)}" rx="${f2(1.1 * s)}" ry="${f2(Math.max(0.05, ry))}" fill="#f8f4ff" stroke="${iris}" stroke-width="${f2(0.18 * s)}"/>${open > 0.3 ? `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(0.38 * s * open)}" fill="${iris}"/><circle cx="${f2(x + 0.12 * s)}" cy="${f2(y - 0.12 * s)}" r="${f2(0.1 * s)}" fill="#fff"/>` : ''}</g>`; };
const qmark = (x, y, s, fill, o = 1) => `<text x="${f2(x)}" y="${f2(y)}" text-anchor="middle" font-size="${f2(2.1 * s)}" font-weight="900" fill="${fill}" stroke="#1a1030" stroke-width="0.3" paint-order="stroke" opacity="${op(o)}">?</text>`;
const bang = (x, y, s, fill, o = 1) => `<text x="${f2(x)}" y="${f2(y)}" text-anchor="middle" font-size="${f2(2.1 * s)}" font-weight="900" fill="${fill}" stroke="#1a1030" stroke-width="0.3" paint-order="stroke" opacity="${op(o)}">!</text>`;
const anchor = (x, y, s, fill, o = 1) => `<g opacity="${op(o)}" stroke="${fill}" stroke-width="${f2(0.32 * s)}" fill="none" stroke-linecap="round"><circle cx="${f2(x)}" cy="${f2(y - 1.25 * s)}" r="${f2(0.32 * s)}"/><line x1="${f2(x)}" y1="${f2(y - 0.95 * s)}" x2="${f2(x)}" y2="${f2(y + 1.1 * s)}"/><line x1="${f2(x - 0.6 * s)}" y1="${f2(y - 0.5 * s)}" x2="${f2(x + 0.6 * s)}" y2="${f2(y - 0.5 * s)}"/><path d="M ${f2(x - 1.1 * s)} ${f2(y + 0.35 * s)} Q ${f2(x - 0.9 * s)} ${f2(y + 1.25 * s)} ${f2(x)} ${f2(y + 1.15 * s)} Q ${f2(x + 0.9 * s)} ${f2(y + 1.25 * s)} ${f2(x + 1.1 * s)} ${f2(y + 0.35 * s)}"/></g>`;
const hand = (x, y, s, fill, flip, o = 1) => { const d = flip ? -1 : 1; return `<g opacity="${op(o)}"><rect x="${f2(x - 0.45 * s)}" y="${f2(y - 0.7 * s)}" width="${f2(0.9 * s)}" height="${f2(1.4 * s)}" rx="${f2(0.35 * s)}" fill="${fill}" stroke="#5a4500" stroke-width="0.12"/><rect x="${f2(x + d * 0.35 * s - (d < 0 ? 0.5 * s : 0))}" y="${f2(y - 0.1 * s)}" width="${f2(0.5 * s)}" height="${f2(0.3 * s)}" rx="0.1" fill="${fill}" stroke="#5a4500" stroke-width="0.1"/></g>`; };
const ring = (x, y, r, stroke, w, o) => `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(r)}" fill="none" stroke="${stroke}" stroke-width="${f2(w)}" opacity="${op(o)}"/>`;
const blob = (x, y, r, fill, o) => `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(r)}" fill="${fill}" opacity="${op(o)}"/>`;
const pathOf = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${f2(x)} ${f2(y)}`).join(' ');
const jag = (x, y, ang, len, seed, steps = 4) => { const pts = [[x, y]]; let px = x, py = y; for (let i = 1; i <= steps; i++) { const a = ang + (h(seed, i) - 0.5) * 0.9; px += cos(a) * len / steps; py += sin(a) * len / steps; pts.push([px, py]); } return pts; };
const behind = (c) => { const sp = Math.hypot(c.dx, c.dy); return sp > 0.05 ? [-c.dx / sp, -c.dy / sp] : [0, c.team === 'off' ? 1 : -1]; };

// ------------------------------------------------------------ the signatures
// c: { cx, cy, dx, dy, age, k (0..1 through the effect), fade, L (element colours), t, team,
//      path: [[x,y]...] svg points the monster ran during the effect, victim: [x,y] | null,
//      target: [x,y] | null, ball: [x,y,air] | null, pball: [x,y] | null, origin: [x,y] | null, sid }
export const SIG = {
  // ---- Fire
  firestorm: { dur: 2.4, b: (c) => { // Meteor Pass: the ball is on fire, with an ember trail
    if (!c.ball || !c.ball[2]) return ''; const [bx, by] = c.ball; const [px, py] = c.pball || [bx, by]; let s = '';
    const vx = bx - px, vy = by - py, vl = Math.hypot(vx, vy) || 1;
    for (let i = 1; i <= 8; i++) { const d = i * 0.8; const j = (h(c.sid, i, Math.round(c.t * 10)) - 0.5) * 0.9; s += blob(bx - vx / vl * d - vy / vl * j, by - vy / vl * d + vx / vl * j, 1.05 - i * 0.1, i % 3 === 0 ? '#ffd25a' : i % 2 ? '#ff5a2a' : '#ffb13d', 0.95 - i * 0.1); }
    s += blob(bx, by, 1.9, '#ff5a2a', 0.55) + blob(bx, by, 1.35, '#ffb13d', 0.75); // the ball wrapped in fire
    for (let i = 0; i < 5; i++) { const a = Math.atan2(-vy, -vx) + (i - 2) * 0.45; const fl = 1.6 + h(c.sid, i, Math.round(c.t * 20)) * 0.9; s += `<path d="M ${f2(bx + cos(a + 1.3) * 0.8)} ${f2(by + sin(a + 1.3) * 0.8)} Q ${f2(bx + cos(a) * fl * 1.3)} ${f2(by + sin(a) * fl * 1.3)} ${f2(bx + cos(a - 1.3) * 0.8)} ${f2(by + sin(a - 1.3) * 0.8)} Z" fill="${i % 2 ? '#ff7a2a' : '#ffd25a'}" opacity="0.85"/>`; }
    return s; } },
  cinderclaw: { u: (c) => blob(c.cx, c.cy + 0.6, 2 + c.k, '#ff5a2a', 0.3 * c.fade), o: (c) => { // Ember Grip: three glowing claw slashes
    if (c.age > 0.7) return ''; const k = c.age / 0.7; let s = ''; const [vx, vy] = c.victim || [c.cx, c.cy - 1.5];
    for (let i = -1; i <= 1; i++) s += `<line x1="${f2(vx - 1.1 + i * 0.6)}" y1="${f2(vy - 1.3)}" x2="${f2(vx - 0.2 + i * 0.6)}" y2="${f2(vy + 0.9)}" stroke="#ffb13d" stroke-width="0.35" stroke-linecap="round" opacity="${op(1 - k)}"/>`;
    return s; } },
  pyroclast: { u: (c) => { // Eruption: a crater cracks open and lava bursts up
    const [x, y] = c.victim || [c.cx, c.cy]; let s = ''; const k = Math.min(1, c.age / 0.5);
    for (let i = 0; i < 6; i++) s += `<path d="${pathOf(jag(x, y + 0.6, i * PI / 3 + 0.3, 1.5 + 1.6 * k, c.sid + i, 3))}" stroke="#ff6a1a" stroke-width="0.3" fill="none" opacity="${op(c.fade)}"/>`;
    s += `<ellipse cx="${f2(x)}" cy="${f2(y + 0.6)}" rx="${f2(1.6 + k)}" ry="${f2(0.8 + k * 0.4)}" fill="#3a1205" opacity="${op(0.6 * c.fade)}"/>`;
    return s; }, o: (c) => { const [x, y] = c.victim || [c.cx, c.cy]; let s = ''; if (c.age > 0.9) return '';
    for (let i = 0; i < 7; i++) { const a = -PI / 2 + (h(c.sid, i) - 0.5) * 1.6; const d = c.age * (5 + h(c.sid, i, 2) * 3); s += blob(x + cos(a) * d * 0.6, y + sin(a) * d - (c.age > 0.4 ? -(c.age - 0.4) * 6 : 0), 0.45, i % 2 ? '#ff5a2a' : '#ffd25a', 1 - c.age / 0.9); }
    return s; } },
  // ---- Water
  tidefin: { dur: 1.2, u: (c) => c.path.length > 1 ? `<path d="${pathOf(c.path)}" stroke="#2f8fd6" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${op(0.55 * c.fade)}"/><path d="${pathOf(c.path)}" stroke="#bff2ff" stroke-width="0.5" fill="none" stroke-dasharray="0.9 0.7" stroke-dashoffset="${f2(-c.t * 6)}" stroke-linecap="round" opacity="${op(0.9 * c.fade)}"/>` : '' }, // Slipstream: a solid stream on the ground
  wavehorn: { u: (c) => { // Riptide: a current pulling his man toward the sideline
    const [x, y] = c.victim || [c.cx, c.cy]; const dir = x < 0 ? -1 : 1; let s = '';
    for (let i = 0; i < 3; i++) { const ph = ((c.t * 1.6 + i / 3) % 1); const ox = x + dir * (ph * 4 - 1); s += `<path d="M ${f2(ox - dir * 0.9)} ${f2(y - 1 + i * 0.9)} Q ${f2(ox)} ${f2(y - 0.6 + i * 0.9)} ${f2(ox + dir * 0.9)} ${f2(y - 1 + i * 0.9)}" stroke="#7fe0ff" stroke-width="0.35" fill="none" opacity="${op((1 - ph) * c.fade)}"/>`; }
    s += `<path d="M ${f2(x - dir * 1.5)} ${f2(y + 1.3)} L ${f2(x + dir * 2.5)} ${f2(y + 1.3)} L ${f2(x + dir * 1.8)} ${f2(y + 0.7)} M ${f2(x + dir * 2.5)} ${f2(y + 1.3)} L ${f2(x + dir * 1.8)} ${f2(y + 1.9)}" stroke="#2f8fd6" stroke-width="0.4" fill="none" opacity="${op(0.8 * c.fade)}"/>`;
    return s; } },
  tsunarok: { dur: 1.4, u: (c) => { // Undertow: a whirlpool opens under him
    let s = ''; for (let i = 0; i < 3; i++) { const r = 1 + i * 1.1; s += `<ellipse cx="${f2(c.cx)}" cy="${f2(c.cy + 0.7)}" rx="${f2(r)}" ry="${f2(r * 0.5)}" fill="none" stroke="${i % 2 ? '#2f8fd6' : '#7fe0ff'}" stroke-width="0.3" stroke-dasharray="${f2(r)} ${f2(r * 0.6)}" transform="rotate(${f2(c.t * 140 * (i % 2 ? -1 : 1))} ${f2(c.cx)} ${f2(c.cy + 0.7)})" opacity="${op(0.8 * c.fade)}"/>`; } return s; },
    o: (c) => { const drop = Math.min(1, c.age / 0.4); return anchor(c.cx, c.cy - 4.8 + drop * 0.8, 1.15, '#bfe8ff', c.fade); } }, // ...and an anchor drops over him
  reefclaw: { o: (c) => { const [x, y] = c.victim || [c.cx, c.cy]; const k = Math.min(1, c.age / 0.25); const g = 1.6 - 0.9 * k; // Pincer Hold: crab pincers clamp the blocker
    return `<g opacity="${op(c.fade)}" fill="#e2563a" stroke="#5a1408" stroke-width="0.12"><path d="M ${f2(x - g - 0.9)} ${f2(y - 0.2)} q 0.9 -1.6 1.8 -0.5 l -0.8 0.3 z"/><path d="M ${f2(x + g + 0.9)} ${f2(y - 0.2)} q -0.9 -1.6 -1.8 -0.5 l 0.8 0.3 z"/></g>`; } },
  // ---- Nature
  elderoot: { dur: 1.4, u: (c) => { // Ancient Grove: roots crawl out to every teammate within 5 yards
    let s = ''; const grow = Math.min(1, c.age / 0.8); const mates = c.mates || [];
    for (let i = 0; i < mates.length; i++) { const [mx, my] = mates[i]; const ang = Math.atan2(my - c.cy, mx - c.cx); const len = Math.hypot(mx - c.cx, my - c.cy) * grow; const pts = jag(c.cx, c.cy + 0.6, ang, len, c.sid + i * 7, 6);
      s += `<path d="${pathOf(pts)}" stroke="#4a2e12" stroke-width="0.9" fill="none" stroke-linecap="round" opacity="${op(0.95 * c.fade)}"/><path d="${pathOf(pts)}" stroke="#a07a44" stroke-width="0.3" fill="none" opacity="${op(c.fade)}"/>`;
      if (grow >= 1) s += blob(mx, my + 0.6, 0.5, '#a6d36b', 0.7 * c.fade); }
    for (let i = 0; i < 6; i++) { const pts = jag(c.cx, c.cy + 0.6, i * PI / 3 + 0.4, 3.4 * grow, c.sid + 90 + i, 4); s += `<path d="${pathOf(pts)}" stroke="#4a2e12" stroke-width="0.75" fill="none" stroke-linecap="round" opacity="${op(c.fade)}"/><path d="${pathOf(pts)}" stroke="#a07a44" stroke-width="0.25" fill="none" opacity="${op(c.fade)}"/>`; }
    return s; } },
  rootram: { u: (c) => { let s = ''; const grow = Math.min(1, c.age / 0.5); // Deep Roots: roots dig into the ground at his feet
    for (let i = 0; i < 5; i++) s += `<path d="${pathOf(jag(c.cx, c.cy + 0.8, PI / 2 + (i - 2) * 0.55, 2.2 * grow, c.sid + i, 4))}" stroke="#6a4a22" stroke-width="0.45" fill="none" stroke-linecap="round" opacity="${op(c.fade)}"/>`;
    return s; } },
  thornback: { u: (c) => { let s = ''; for (let i = 0; i < 10; i++) { const a = i * PI / 5 + c.age * 1.5; const x = c.cx + cos(a) * 1.9, y = c.cy + 0.3 + sin(a) * 1.3; s += `<polygon points="${f2(x - sin(a) * 0.3)},${f2(y + cos(a) * 0.3)} ${f2(x + cos(a) * 1.1)},${f2(y + sin(a) * 1.1)} ${f2(x + sin(a) * 0.3)},${f2(y - cos(a) * 0.3)}" fill="#b6f06a" stroke="#2a4a1a" stroke-width="0.12" opacity="${op(c.fade)}"/>`; } // Bramble Shell: a ring of thorns
    return `<ellipse cx="${f2(c.cx)}" cy="${f2(c.cy + 0.3)}" rx="1.9" ry="1.3" fill="none" stroke="#2a4a1a" stroke-width="0.8" opacity="${op(c.fade)}"/><ellipse cx="${f2(c.cx)}" cy="${f2(c.cy + 0.3)}" rx="1.9" ry="1.3" fill="none" stroke="#6aa23a" stroke-width="0.4" opacity="${op(c.fade)}"/>` + s; } },
  // ---- Electric
  joltrex: { o: (c) => c.age < 0.6 ? bolt(c.cx, c.cy - 4.2, 1.6, '#fff36a', 1 - c.age / 0.6) : '' }, // Overcharge: a big bolt on the sack (the small bolt stays while charged: status)
  stormcrown: { o: (c) => { // Thunderclap: two yellow hands clap over the passer
    if (c.age > 0.8) return ''; const k = Math.min(1, c.age / 0.22); const gap = 2.2 * (1 - k) + 0.4; let s = hand(c.cx - gap, c.cy - 4.6, 1.8, '#ffd84a', false) + hand(c.cx + gap, c.cy - 4.6, 1.8, '#ffd84a', true);
    if (k >= 1) { const kk = (c.age - 0.22) / 0.58; s += ring(c.cx, c.cy - 4.6, 0.8 + kk * 3, '#fff36a', 0.35 * (1 - kk) + 0.05, 1 - kk); for (let i = 0; i < 6; i++) { const a = i * PI / 3; s += `<line x1="${f2(c.cx + cos(a) * (1 + kk * 1.5))}" y1="${f2(c.cy - 4.6 + sin(a) * (1 + kk * 1.5))}" x2="${f2(c.cx + cos(a) * (1.6 + kk * 2.2))}" y2="${f2(c.cy - 4.6 + sin(a) * (1.6 + kk * 2.2))}" stroke="#fff36a" stroke-width="0.25" opacity="${op(1 - kk)}"/>`; } }
    return s; } },
  // ---- Ice
  frostclaw: { o: (c) => { const open = c.age < 0.9 ? Math.min(1, c.age / 0.15) : Math.max(0, 1 - (c.age - 0.9) / 0.2); return eye(c.cx, c.cy - 4.4, 1.5, '#5ab8ff', open, c.fade) + (c.age < 0.4 ? ring(c.cx, c.cy - 4.4, 1.3 + c.age * 4, '#e6f7ff', 0.2, 1 - c.age / 0.4) : ''); } }, // Cold Read: an icy eye
  glacivern: { u: (c) => { const [x, y] = c.victim || [c.cx, c.cy]; let s = ''; for (let i = 0; i < 9; i++) { const a = h(c.sid, i) * 2 * PI; const d = 1 + h(c.sid, i, 3) * 2.5; const fall = (c.t * 1.2 + h(c.sid, i, 5)) % 1; s += star(x + cos(a) * d, y - 2 + fall * 3.5, 0.28, '#ffffff', 0.9 * c.fade); } return s; } }, // Whiteout: snow over the frozen receiver (the ice block is his status)
  icehorn: { u: (c) => { const [x, y] = c.victim || [c.cx, c.cy]; const k = Math.min(1, c.age / 0.4); let s = `<ellipse cx="${f2(x)}" cy="${f2(y + 0.7)}" rx="${f2(1 + 1.6 * k)}" ry="${f2(0.6 + 0.8 * k)}" fill="#cfefff" opacity="${op(0.55 * c.fade)}"/>`; // Permafrost: frost spreads under the runner
    for (let i = 0; i < 6; i++) s += `<path d="${pathOf(jag(x, y + 0.7, i * PI / 3, 2.4 * k, c.sid + i, 3))}" stroke="#ffffff" stroke-width="0.2" fill="none" opacity="${op(c.fade)}"/>`; return s; } },
  // ---- Wind
  tempestra: { dur: 1.3, u: (c) => { const [x, y] = c.origin || [c.cx, c.cy]; let s = ''; // Cyclone: a funnel spins up where she breaks
    for (let i = 0; i < 6; i++) { const r = 0.6 + i * 0.45, yy = y + 0.9 - i * 0.65; s += `<ellipse cx="${f2(x + sin(c.t * 9 + i) * 0.25)}" cy="${f2(yy)}" rx="${f2(r)}" ry="${f2(r * 0.35)}" fill="none" stroke="${i % 2 ? '#7ad8c8' : '#dffdf6'}" stroke-width="0.28" stroke-dasharray="${f2(r * 1.2)} ${f2(r * 0.5)}" transform="rotate(${f2(c.t * 400 * (i % 2 ? 1 : -1))} ${f2(x)} ${f2(yy)})" opacity="${op(0.9 * c.fade)}"/>`; }
    return s; } },
  zephyr: { dur: 2.4, b: (c) => { if (!c.ball || !c.ball[2]) return ''; const [bx, by] = c.ball; const [px, py] = c.pball || [bx, by + 1]; const vx = bx - px, vy = by - py, vl = Math.hypot(vx, vy) || 1; let s = ''; // Tailwind: wind lines behind the ball
    for (let i = -1; i <= 1; i++) { const ox = -vy / vl * i * 0.6, oy = vx / vl * i * 0.6; const len = 3.5 - Math.abs(i) * 1.1; s += `<line x1="${f2(bx - vx / vl * 0.9 + ox)}" y1="${f2(by - vy / vl * 0.9 + oy)}" x2="${f2(bx - vx / vl * (0.9 + len) + ox)}" y2="${f2(by - vy / vl * (0.9 + len) + oy)}" stroke="#ffffff" stroke-width="0.28" stroke-linecap="round" opacity="0.85"/>`; }
    return s; } },
  // ---- Earth
  terrabull: { u: (c) => { const [x, y] = c.origin || [c.cx, c.cy]; const k = Math.min(1, c.age / 0.3); let s = ''; // Quake Step: the ground cracks where he cuts
    for (let i = 0; i < 7; i++) { const pts = jag(x, y + 0.7, i * 2 * PI / 7, 4.2 * k, c.sid + i, 5); s += `<path d="${pathOf(pts)}" stroke="#1e1408" stroke-width="0.75" fill="none" stroke-linejoin="bevel" opacity="${op(c.fade)}"/><path d="${pathOf(pts)}" stroke="#e8d8b0" stroke-width="0.18" fill="none" opacity="${op(0.8 * c.fade)}"/>`; }
    return s + `<ellipse cx="${f2(x)}" cy="${f2(y + 0.7)}" rx="${f2(1.2 + 2 * k)}" ry="${f2(0.6 + k)}" fill="#c8b89a" opacity="${op(0.35 * c.fade)}"/>`; } },
  // ---- Dark
  duskrunner: { u: (c) => { const [x, y] = c.origin || [c.cx, c.cy]; let s = ''; // Vanishing Cut: a smoke cloud where he was
    for (let i = 0; i < 12; i++) { const a = h(c.sid, i) * 2 * PI; const d = h(c.sid, i, 2) * 2.2 * (0.6 + c.age); s += blob(x + cos(a) * d, y + sin(a) * d * 0.7 - c.age * 0.8, 1.2 + h(c.sid, i, 3) * 0.9 + c.age * 1.1, i % 3 ? '#9a8aaa' : '#cfc4dc', 0.85 * c.fade); }
    return s; } },
  mireclaw: { u: (c) => c.path.length > 1 ? `<path d="${pathOf(c.path)}" stroke="#1a0f2a" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="${op(0.5 * c.fade)}"/><path d="${pathOf(c.path)}" stroke="#9a7ad6" stroke-width="0.25" fill="none" opacity="${op(0.7 * c.fade)}"/>` : '' }, // Ambush: a shadow streak through the line (the fooled blocker gets a "!")
  nocturne: { u: (c) => `<circle cx="${f2(c.cx)}" cy="${f2(c.cy)}" r="2.3" fill="#0a0612" opacity="${op(0.55 * c.fade)}"/>${ring(c.cx, c.cy, 2.4, '#ffd84a', 0.35, 0.8 * c.fade)}${ring(c.cx, c.cy, 2.9, '#ffe9a0', 0.15, 0.5 * c.fade)}` }, // Eclipse Route: an eclipse around him; his man looks lost
  nyxshade: { u: (c) => `<ellipse cx="${f2(c.cx)}" cy="${f2(c.cy + 0.2)}" rx="2.3" ry="1.9" fill="#120a20" opacity="${op(0.55 * c.fade)}"/><ellipse cx="${f2(c.cx)}" cy="${f2(c.cy + 0.2)}" rx="2.3" ry="1.9" fill="none" stroke="#6a4aa6" stroke-width="0.25" stroke-dasharray="0.6 0.5" opacity="${op(c.fade)}"/>` }, // Night Veil: a shadow cloak
  // ---- Light
  lumen: { o: (c) => { if (!c.target) return ''; const [x, y] = c.target; const k = Math.min(1, c.age / 0.3); const r = 2.6 - k; // Clear Sight: a reticle locks onto the open receiver
    return `<g opacity="${op(c.fade)}" stroke="#ffe36c" stroke-width="0.3" fill="none">${ring(x, y, r, '#ffe36c', 0.3, 1)}<line x1="${f2(x - r - 0.8)}" y1="${f2(y)}" x2="${f2(x - r + 0.6)}" y2="${f2(y)}"/><line x1="${f2(x + r - 0.6)}" y1="${f2(y)}" x2="${f2(x + r + 0.8)}" y2="${f2(y)}"/><line x1="${f2(x)}" y1="${f2(y - r - 0.8)}" x2="${f2(x)}" y2="${f2(y - r + 0.6)}"/><line x1="${f2(x)}" y1="${f2(y + r - 0.6)}" x2="${f2(x)}" y2="${f2(y + r + 0.8)}"/></g>`; } },
  prism: { u: (c) => { const cols = ['#ff5a5a', '#ffb13d', '#fff36a', '#6ad66a', '#5ab8ff', '#a06aff']; let s = ''; // Refraction: light splits into a rainbow around him
    for (let i = 0; i < 6; i++) { const a = -PI / 2 + (i - 2.5) * 0.32 + sin(c.t * 3) * 0.1; s += `<line x1="${f2(c.cx)}" y1="${f2(c.cy)}" x2="${f2(c.cx + cos(a) * 4.2)}" y2="${f2(c.cy + sin(a) * 4.2)}" stroke="${cols[i]}" stroke-width="0.4" opacity="${op(0.75 * c.fade)}"/>`; }
    return s + `<polygon points="${f2(c.cx)},${f2(c.cy - 1.3)} ${f2(c.cx + 1)},${f2(c.cy + 0.6)} ${f2(c.cx - 1)},${f2(c.cy + 0.6)}" fill="#e6f7ff" opacity="${op(0.5 * c.fade)}"/>`; } },
  halofang: { dur: 1.4, u: (c) => c.path.length > 1 ? `<path d="${pathOf(c.path)}" stroke="#ffd84a" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="${op(0.55 * c.fade)}"/><path d="${pathOf(c.path)}" stroke="#fff6c8" stroke-width="0.4" fill="none" opacity="${op(0.9 * c.fade)}"/>` : '', o: (c) => ring(c.cx, c.cy - 3.6, 0.9, '#ffe36c', 0.3, c.fade) }, // Radiant Pursuit: a light trail and a halo
  aurelion: { dur: 6, u: (c) => { let s = ''; const [bx, by] = behind(c); // Daybreak: a sunrise behind him for the rest of the play
    for (let i = 0; i < 7; i++) { const a = Math.atan2(by, bx) + (i - 3) * 0.28; s += `<line x1="${f2(c.cx)}" y1="${f2(c.cy)}" x2="${f2(c.cx + cos(a) * 5)}" y2="${f2(c.cy + sin(a) * 5)}" stroke="#ffd84a" stroke-width="0.5" opacity="${op(0.5 * c.fade)}"/>`; }
    return s + blob(c.cx, c.cy, 2.2, '#fff6c8', 0.35 * c.fade); }, o: (c) => star(c.cx, c.cy - 3.8, 0.9, '#ffd84a', c.fade) },
  // ---- Metal
  ironjaw: { o: (c) => { const [x, y] = c.victim || [c.cx, c.cy]; const k = Math.min(1, c.age / 0.2); const g = 1.4 * (1 - k) + 0.2; let s = ''; // Iron Bite: steel jaws snap shut on the ball
    for (let i = 0; i < 4; i++) { s += `<polygon points="${f2(x - 1.4 + i * 0.8)},${f2(y - g)} ${f2(x - 1 + i * 0.8)},${f2(y - g + 0.7)} ${f2(x - 0.6 + i * 0.8)},${f2(y - g)}" fill="#d8dce8"/>`; s += `<polygon points="${f2(x - 1.4 + i * 0.8)},${f2(y + g)} ${f2(x - 1 + i * 0.8)},${f2(y + g - 0.7)} ${f2(x - 0.6 + i * 0.8)},${f2(y + g)}" fill="#d8dce8"/>`; }
    return `<g opacity="${op(c.fade)}" stroke="#4a5060" stroke-width="0.1">${s}</g>`; } },
  metalhorn: { u: (c) => { let s = ''; for (const [mx, my] of c.mates || []) s += `<line x1="${f2(c.cx)}" y1="${f2(c.cy + 0.4)}" x2="${f2(mx)}" y2="${f2(my + 0.4)}" stroke="#9aa3b8" stroke-width="0.9" opacity="${op(0.6 * c.fade)}"/><rect x="${f2(mx - 0.8)}" y="${f2(my - 0.4)}" width="1.6" height="1.6" rx="0.2" fill="#c8cede" stroke="#5a6070" stroke-width="0.12" opacity="${op(0.7 * c.fade)}"/>`; return s; } }, // Bulwark: steel plates link his line
  aegistron: { o: (c) => { const [x, y] = c.victim || c.target || [c.cx, c.cy]; const k = Math.min(1, c.age / 0.3); // Fortress: walls rise around the receiver he covers
    let s = ''; for (let i = 0; i < 8; i++) { const a = i * PI / 4; const hgt = 1.2 * k; s += `<rect x="${f2(x + cos(a) * 2.2 - 0.45)}" y="${f2(y + sin(a) * 1.5 - hgt + 0.6)}" width="0.9" height="${f2(hgt)}" fill="#c8cede" stroke="#5a6070" stroke-width="0.1" opacity="${op(c.fade)}"/>`; }
    return s; } },
  // ---- Psychic
  cerebrix: { o: (c) => { const blink = (c.age * 2.2) % 1; const open = blink < 0.82 ? 1 : Math.abs(blink - 0.91) * 11; return eye(c.cx, c.cy - 4.4, 1.5, '#a04ad6', Math.min(1, open), c.fade); } }, // Foresight: a purple eye blinks over him
  echolot: { u: (c) => { let s = ''; for (let i = 0; i < 3; i++) { const ph = (c.age * 1.4 + i / 3) % 1; s += ring(c.cx, c.cy, 0.8 + ph * 4.5, '#ff9ae6', 0.25, (1 - ph) * c.fade); } return s; } }, // Echo Read: sonar rings
  enigmane: { u: (c) => { const [x, y] = c.victim || [c.cx, c.cy]; return `<path d="M ${f2(x)} ${f2(y)} m -1.8 0 a 1.8 1.8 0 1 1 3.6 0 a 1.2 1.2 0 1 1 -2.4 0 a 0.6 0.6 0 1 1 1.2 0" stroke="#ff9ae6" stroke-width="0.25" fill="none" transform="rotate(${f2(c.t * 300)} ${f2(x)} ${f2(y)})" opacity="${op(0.8 * c.fade)}"/>`; } }, // Mind Game: a hypnotic swirl at his man (who looks confused)
  astralux: { o: (c) => { if (!c.origin) return ''; let s = ''; for (const [x, y] of [c.origin, [c.cx, c.cy]]) for (let i = 0; i < 6; i++) { const a = i * PI / 3 + c.age * 4; const d = 1 + c.age * 2; s += star(x + cos(a) * d, y + sin(a) * d, 0.35, '#ff9ae6', 1 - c.age / 1.2); } return s; } }, // Blink: sparkles where he left and where he lands
  // ---- Dragon
  vyrnax: { u: (c) => { const [x, y] = c.victim || [c.cx, c.cy - 2]; const ang = Math.atan2(y - c.cy, x - c.cx); let s = ''; // Dragon's Roar: sound waves hit the blocker
    for (let i = 0; i < 3; i++) { const ph = (c.age * 2 + i / 3) % 1; const r = 1 + ph * 4; s += `<path d="M ${f2(c.cx + cos(ang - 0.6) * r)} ${f2(c.cy + sin(ang - 0.6) * r)} A ${f2(r)} ${f2(r)} 0 0 1 ${f2(c.cx + cos(ang + 0.6) * r)} ${f2(c.cy + sin(ang + 0.6) * r)}" stroke="${i % 2 ? '#ffd36a' : '#c03a6a'}" stroke-width="0.45" fill="none" opacity="${op((1 - ph) * c.fade)}"/>`; }
    return s; } },
  sablewing: { u: (c) => { const [x, y] = c.victim || c.target || [c.cx, c.cy]; const k = Math.min(1, c.age / 0.3); return `<g opacity="${op(0.55 * c.fade)}" fill="#1a0a20"><ellipse cx="${f2(x - 1.6 * k)}" cy="${f2(y)}" rx="${f2(2 * k)}" ry="${f2(0.9 * k)}" transform="rotate(-20 ${f2(x)} ${f2(y)})"/><ellipse cx="${f2(x + 1.6 * k)}" cy="${f2(y)}" rx="${f2(2 * k)}" ry="${f2(0.9 * k)}" transform="rotate(20 ${f2(x)} ${f2(y)})"/></g>`; } }, // Wing Shadow: wings spread over the catch
  scaleguard: { o: (c) => { if (c.age > 0.6) return ''; let s = ''; for (let i = 0; i < 6; i++) { const a = i * PI / 3; const x = c.cx + cos(a) * 1.2, y = c.cy - 0.4 + sin(a) * 1.2; s += `<polygon points="${[0, 1, 2, 3, 4, 5].map((j) => `${f2(x + cos(j * PI / 3) * 0.55)},${f2(y + sin(j * PI / 3) * 0.55)}`).join(' ')}" fill="#c03a6a" stroke="#ffd36a" stroke-width="0.1" opacity="${op(1 - c.age / 0.6)}"/>`; } return s; } }, // Dragonhide: scales flash as he gets back up
};

// ------------------------------------------------------------ monster status marks
/**
 * Status marks for one monster (any monster, ability or not). `code` comes from the engine frame.
 * Returns { tf: sprite transform or '', over: SVG above the sprite, under: SVG below it }.
 */
export function statusMarks(code, cx, cy, t, seed = 0) {
  if (!code) return null;
  const top = cy - 3; let over = '', under = '', tf = '';
  switch (code) {
    case 'stun': for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2 * PI / 3; over += star(cx + cos(a) * 1.3, top + sin(a) * 0.45, 0.42, '#ffe36c'); } break; // spinning stars
    case 'flat': tf = `translate(0 ${f2(cy + 0.7)}) scale(1.35 0.32) translate(0 ${f2(-(cy + 0.7))})`; over += star(cx - 1, cy - 0.8, 0.3, '#ffe36c') + star(cx + 1.1, cy - 0.6, 0.3, '#ffe36c'); break; // squashed flat
    case 'frozen': over += `<rect x="${f2(cx - 1.9)}" y="${f2(cy - 2.8)}" width="3.8" height="3.9" rx="0.4" fill="#bfe8ff" opacity="0.55" stroke="#ffffff" stroke-width="0.2"/><line x1="${f2(cx - 1.3)}" y1="${f2(cy - 2.2)}" x2="${f2(cx - 0.4)}" y2="${f2(cy - 1.3)}" stroke="#ffffff" stroke-width="0.2" opacity="0.9"/>`; break; // in an ice block
    case 'spin': tf = `rotate(${f2((t * 900) % 360)} ${f2(cx)} ${f2(cy - 0.8)})`; under += ring(cx, cy + 0.6, 1.6, '#dffdf6', 0.2, 0.7); break; // spun around
    case 'stumble': tf = `rotate(${f2(sin(t * 18 + seed) * 14)} ${f2(cx)} ${f2(cy + 0.7)})`; break; // stumbling
    case 'lost': { const turn = sin(t * 7 + seed) > 0; tf = turn ? `translate(${f2(2 * cx)} 0) scale(-1 1)` : ''; over += qmark(cx + (turn ? 0.6 : -0.6), top - 0.3 + sin(t * 5) * 0.2, 0.9, '#ffd84a'); break; } // looking around, lost
    case 'confused': over += `<path d="M ${f2(cx)} ${f2(top)} m -0.9 0 a 0.9 0.5 0 1 1 1.8 0 a 0.6 0.35 0 1 1 -1.2 0" stroke="#ff9ae6" stroke-width="0.25" fill="none" transform="rotate(${f2(t * 360)} ${f2(cx)} ${f2(top)})"/>${qmark(cx + 1.2, top - 0.6, 0.6, '#ff9ae6')}`; tf = `rotate(${f2(sin(t * 10) * 6)} ${f2(cx)} ${f2(cy + 0.7)})`; break; // dizzy swirl
    case 'slow': over += `<text x="${f2(cx)}" y="${f2(top)}" text-anchor="middle" font-size="1.9">🐌</text>`; break; // slowed
    case 'charged': over += bolt(cx, top - 0.3, 0.75, '#fff36a', 0.75 + 0.25 * sin(t * 14)); break; // charged with speed
    case 'cower': tf = `translate(${f2(sin(t * 60) * 0.18)} 0)`; over += bang(cx, top, 0.8, '#ffd36a'); break; // flinching
    case 'fooled': over += bang(cx, top, 0.9, '#ff6a6a'); break;
    case 'pinched': over += `<g fill="#e2563a" stroke="#5a1408" stroke-width="0.1"><path d="M ${f2(cx - 1.5)} ${f2(cy - 0.6)} q 0.6 -1.2 1.3 -0.4 l -0.6 0.25 z"/><path d="M ${f2(cx + 1.5)} ${f2(cy - 0.6)} q -0.6 -1.2 -1.3 -0.4 l 0.6 0.25 z"/></g>`; break;
    default: return null;
  }
  return { tf, over, under };
}
