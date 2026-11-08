// Sprite generator v2 (Beast Dex SPRITE_GENERATOR_BRIEF.md): 30 body structures × 5 static poses on the native 16×16 grid.
// Opt-in: a recipe with a `structure` field is drawn here; every legacy recipe (body = biped | quadruped | …) keeps the
// unchanged seven-template path in sprite16.js. Output uses the same colour codes, palette, shading and outline pass as the
// legacy builder, so preview, export and the game's renderers need no new contract.
//
// Codes painted here: M main, B belly/underside, A accent anatomy (wings, shell, fins…), K dark detail, W bone, G glow,
// E eye, H eye highlight. Shapes are authored for a 16×16 frame (x 0–15 left→right, y 0–15 top→bottom, ground on row 15).
// Side-view structures face left, as the legacy quadruped does; `flip` mirrors at render time as before.
//
// Checkpoint 1 scope: structures, poses, size and mirroring. Proportion controls and the 60-feature library build on the anchors
// each structure returns (head, eyes, back, tail, limbs, ground) and are added after the silhouette review.

export const GEN_VERSION = 1;
export const POSES = Object.freeze(['neutral', 'alert', 'braced', 'forward', 'expressive']);
export const SIZES = Object.freeze({ small: 0.78, medium: 0.9, large: 1 });

// ---------------------------------------------------------------- canvas
// Painters tag what they draw with `c.part(name, ox, oy)` (head, neck, torso, leg, arm, tail, wing; anything else is `body`), and
// `c.head(...)` draws a head in the recipe's head shape. Proportion controls become per-part transforms of the authored coordinates
// and radii, applied before the frame scale. With every control at its default the transforms are the identity, so the approved
// structure renders are reproduced exactly (pinned by tests/fixtures/v2-structures-approved.json).
function canvas(scale = 1, { anchorY = 15.5, xf = null, view = 'front', skip = null } = {}) {
  const W = 16, H = 16; const g = Array.from({ length: H }, () => Array(W).fill(0));
  const tx = (x) => 8 + (x - 8) * scale, ty = (y) => anchorY + (y - anchorY) * scale, ts = (r) => Math.max(0.5, r * scale);
  const origins = {};
  const paint = (code, fn, { keep = false } = {}) => { if (skip && skip.has(part)) return; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((!keep || !g[y][x]) && fn(x + 0.5, y + 0.5)) g[y][x] = code; };
  const X = xf || IDENTITY; const used = new Set(); const feet = [];
  let part = 'body', origin = [8, 8], neckO = null, headO = null, torsoO = null;
  // authored point → transformed authored point, for the current part
  const P = (x, y) => {
    const lift = X.lift;
    if (part === 'abs') return [x, y];
    if (part === 'head') { const sh = neckO ? [(headO[0] - neckO[0]) * (X.neck - 1), (headO[1] - neckO[1]) * (X.neck - 1)] : [0, 0];
      return [headO[0] + (x - headO[0]) * X.head + sh[0], headO[1] + (y - headO[1]) * X.head + X.headDy + sh[1] + lift]; }
    if (part === 'neck') return [neckO[0] + (x - neckO[0]) * X.neck, neckO[1] + (y - neckO[1]) * X.neck + lift];
    if (part === 'torso') return [origin[0] + (x - origin[0]) * X.torsoX, origin[1] + (y - origin[1]) * X.torsoY + lift];
    if (part === 'leg') { if (y >= 14.5) { const cx = torsoO ? torsoO[0] : 8; return [x + Math.sign(x - cx) * X.stance, y]; } return [x, y + lift]; }
    if (part === 'wing') return [origin[0] + (x - origin[0]) * X.wing, y + lift];
    if (part === 'tail') return [origin[0] + (x - origin[0]) * X.tail, origin[1] + (y - origin[1]) * X.tail + lift];
    return [x, y + lift];
  };
  const RX = (r) => r * (part === 'head' ? X.head : part === 'torso' ? X.torsoX : part === 'wing' ? X.wing : 1);
  const RY = (r) => r * (part === 'head' ? X.head : part === 'torso' ? X.torsoY : 1);
  const RL = (r) => r * (part === 'leg' || part === 'arm' ? X.thick : part === 'head' ? X.head : part === 'tail' ? X.tailThick : 1);
  const note = (pts) => { used.add(part); if (part === 'leg') for (const [x, y] of pts) if (y >= 14.5) feet.push([x, y]); };
  const c = {
    g, scale, tx, ty, view, used, feet, xf: X,
    origins,
    part(name, ox = 8, oy = 8) { part = name; origin = [ox, oy]; if (!origins[name]) origins[name] = [ox, oy]; if (name === 'neck') neckO = [ox, oy]; if (name === 'head') headO = [ox, oy]; if (name === 'torso') torsoO = [ox, oy]; return this; },
    get current() { return part; },
    get torsoOrigin() { return torsoO; },
    /** Map an authored anchor point through a part's transform (anchors follow the anatomy they belong to). */
    map(name, x, y) { const keep = [part, origin]; if (name === 'head' && !headO) return [x, y + X.lift]; this.part(name, ...(name === 'torso' && torsoO ? torsoO : name === 'head' ? headO : origin)); const r = P(x, y); part = keep[0]; origin = keep[1]; return r; },
    ellipse(cx, cy, rx, ry, code, opt) { const [px, py] = P(cx, cy); note([[px, py + ry]]); const Xc = tx(px), Yc = ty(py), A = ts(RX(rx)), B = ts(RY(ry)); paint(code, (x, y) => ((x - Xc) / A) ** 2 + ((y - Yc) / B) ** 2 <= 1, opt); },
    /** Ellipse rotated by `deg` (clockwise). */
    oval(cx, cy, rx, ry, deg, code, opt) { const [px, py] = P(cx, cy); note([[px, py]]); const Xc = tx(px), Yc = ty(py), A = ts(RX(rx)), B = ts(RY(ry)), a = deg * Math.PI / 180, co = Math.cos(a), si = Math.sin(a);
      paint(code, (x, y) => { const dx = x - Xc, dy = y - Yc, u = dx * co + dy * si, v = -dx * si + dy * co; return (u / A) ** 2 + (v / B) ** 2 <= 1; }, opt); },
    rect(x0, y0, x1, y1, code, opt) {
      let [a0, b0] = P(x0, y0), [a1, b1] = P(x1, y1); note([[a0, b0], [a1, b1]]);
      if ((part === 'leg' || part === 'arm') && X.thick !== 1) { const w = (X.thick - 1) * 0.6; a0 -= w; a1 += w; }
      const X0 = tx(a0), X1 = tx(a1 + 1), Y0 = ty(b0), Y1 = ty(b1 + 1); paint(code, (x, y) => x >= Math.min(X0, X1) && x <= Math.max(X0, X1) && y >= Math.min(Y0, Y1) && y <= Math.max(Y0, Y1), opt); },
    /** A limb, neck or tail: every cell within `r` of the segment. */
    capsule(x0, y0, x1, y1, r, code, opt) { const p0 = P(x0, y0), p1 = P(x1, y1); note([p0, p1]); const A = [tx(p0[0]), ty(p0[1])], B = [tx(p1[0]), ty(p1[1])], R = ts(RL(r));
      paint(code, (x, y) => { const vx = B[0] - A[0], vy = B[1] - A[1], L = vx * vx + vy * vy || 1e-9; const t = Math.max(0, Math.min(1, ((x - A[0]) * vx + (y - A[1]) * vy) / L)); return (x - A[0] - t * vx) ** 2 + (y - A[1] - t * vy) ** 2 <= R * R; }, opt); },
    /** A chain of capsules through points [[x, y, r], …] (tapering bodies, tails, tentacles). */
    chain(points, code, opt) { for (let i = 0; i < points.length - 1; i++) { const [a, b] = [points[i], points[i + 1]]; for (let k = 0; k <= 4; k++) { const t = k / 4; this.capsule(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, code, opt); } this.capsule(a[0], a[1], b[0], b[1], Math.min(a[2], b[2]), code, opt); } },
    poly(pts, code, opt) { const Q = pts.map(([x, y]) => P(x, y)); note(Q); const T = Q.map(([x, y]) => [tx(x), ty(y)]);
      paint(code, (x, y) => { let inside = false; for (let i = 0, j = T.length - 1; i < T.length; j = i++) { const [xi, yi] = T[i], [xj, yj] = T[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; } return inside; }, opt); },
    px(x, y, code) { if (skip && skip.has(part)) return; const [a, b] = P(x, y); const Xp = Math.floor(tx(a + 0.5)), Yp = Math.floor(ty(b + 0.5)); if (Xp >= 0 && Xp < W && Yp >= 0 && Yp < H) g[Yp][Xp] = code; },
    clear(fn) { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (fn(x, y)) g[y][x] = 0; },
    /** A head in the recipe's head shape, facing `dir` (-1 left, +1 right, 0 front). The default 'rounded' is the authored ellipse. */
    head(x, y, rx, ry, { deg = 0, dir = view === 'side' ? -1 : 0 } = {}) {
      this.part('head', x, y); const shape = X.headShape, muz = X.muzzle;
      const base = () => (deg ? this.oval(x, y, rx, ry, deg, 'M') : this.ellipse(x, y, rx, ry, 'M'));
      if (shape === 'flattened') { this.ellipse(x, y + ry * 0.25, rx * 1.2, ry * 0.72, 'M'); }
      else if (shape === 'wedge') { if (dir) this.poly([[x + dir * rx * 1.25, y + ry * 0.55], [x - dir * rx * 0.2, y - ry], [x - dir * rx, y - ry * 0.3], [x - dir * rx * 0.8, y + ry * 0.9], [x + dir * rx * 0.3, y + ry * 0.9]], 'M');
        else { this.ellipse(x, y - ry * 0.15, rx, ry * 0.8, 'M'); this.poly([[x - rx * 0.85, y + ry * 0.1], [x + rx * 0.85, y + ry * 0.1], [x, y + ry * 1.35]], 'M'); } }
      else { base();
        if (shape === 'long_snouted') { if (dir) this.capsule(x + dir * rx * 0.4, y + ry * 0.35, x + dir * (rx + 1.8), y + ry * 0.45, Math.max(0.55, ry * 0.42), 'M'); else this.ellipse(x, y + ry * 0.85, rx * 0.42, ry * 0.6, 'M'); }
        if (shape === 'beaked') { if (dir) this.poly([[x + dir * rx * 0.6, y - ry * 0.25], [x + dir * (rx + 2), y + ry * 0.45], [x + dir * rx * 0.6, y + ry * 0.75]], 'W'); else this.poly([[x - 0.9, y + ry * 0.35], [x + 0.9, y + ry * 0.35], [x, y + ry + 1.3]], 'W'); }
        if (shape === 'broad_jawed') this.ellipse(x + dir * 0.3, y + ry * 0.6, rx * 1.22, ry * 0.5, 'M'); }
      if (muz !== 'none') { const L = muz === 'long' ? 2 : 1; if (dir) this.capsule(x + dir * rx * 0.6, y + ry * 0.3, x + dir * (rx + L * 0.8), y + ry * 0.35, Math.max(0.5, ry * 0.36), 'M'); else this.ellipse(x, y + ry * 0.6, rx * 0.4, ry * 0.22 * L + 0.3, 'B'); }
      this.part('body'); return this;
    },
  };
  return c;
}
const IDENTITY = Object.freeze({ lift: 0, head: 1, headDy: 0, neck: 1, torsoX: 1, torsoY: 1, stance: 0, thick: 1, wing: 1, tail: 1, tailThick: 1, headShape: 'rounded', muzzle: 'none' });

/** The shelled body's shell in the recipe's shell shape (smooth is the approved default). */
function shellBody(c, x, y, rx, ry) {
  const sh = c.xf.shell || 'smooth';
  if (sh === 'angular') c.poly([[x - rx, y + 1.8], [x - rx * 0.7, y - ry * 0.55], [x - rx * 0.15, y - ry], [x + rx * 0.5, y - ry * 0.85], [x + rx, y - 0.2], [x + rx, y + 1.8]], 'A');
  else c.ellipse(x, y, rx, ry, 'A');
  if (sh === 'ridged') { c.capsule(x - rx * 0.8, y - ry * 0.55, x + rx * 0.7, y - ry * 0.65, 0.35, 'Ad'); for (const k of [-0.5, 0, 0.5]) c.px(x + rx * k, y - ry - 0.6, 'A'); }
  for (const [px, py] of [[8, -2], [11, -1.4], [9.4, 0.4], [12.4, 0.6], [6.8, -0.2]]) c.px(px - 9.4 + x, y + py, 'Ad');
}

// ---------------------------------------------------------------- structures
// Each painter draws the whole anatomy for one pose and returns anchors. `v(n, a, b, f, e)` picks the pose's value.
const S = {};
const def = (id, name, anatomy, meta, paint) => { S[id] = Object.freeze({ id, name, anatomy, ...meta, paint }); };

def('compact_upright', 'Compact upright', 'Short limbs, compact torso, relatively large head', { view: 'front', grounded: true }, (c, v) => {
  const hy = v(5.6, 4.8, 6.4, 6, 5.2), lx = v(0, 0, 0.8, 0.4, 0);
  c.part('leg'); c.rect(5 - lx, 13, 6 - lx, 15, 'M'); c.rect(9 + lx, 13, 10 + lx, 15, 'M');
  c.part('torso', 8, v(11.2, 10.8, 11.8, 11.4, 11)); c.ellipse(8, v(11.2, 10.8, 11.8, 11.4, 11), 3.4, 2.8, 'M'); c.ellipse(8, v(11.8, 11.4, 12.4, 12, 11.6), 2, 1.8, 'B');
  c.part('arm'); if (v(0, 0, 0, 0, 1)) { c.capsule(4.6, 10.6, 2.6, 6.6, 0.9, 'M'); c.capsule(11.4, 10.6, 13.4, 6.6, 0.9, 'M'); }
  else { const ay = v(11.6, 10.6, 11.2, 12.4, 0), ax = v(3.4, 3.6, 2.8, 3.8, 0); c.ellipse(ax, ay, 1.1, 1.6, 'M'); c.ellipse(16 - ax, ay, 1.1, 1.6, 'M'); }
  c.head(8, hy, 4.4, 3.8);
  return { head: [8, hy, 4.4, 3.8], eyes: [[6.2, hy - 0.2], [9.8, hy - 0.2]], mouth: [8, hy + 1.6], back: [8, 9], tail: [12, 13], ground: 15 };
});
def('heavy_upright', 'Heavy upright', 'Broad torso, thick limbs, heavy lower-body mass', { view: 'front', grounded: true }, (c, v) => {
  const spread = v(0, 0, 0.8, 0.4, 0), drop = v(0, -0.4, 0.8, 0.4, 0);
  c.part('leg'); c.rect(3.4 - spread, 12.4, 6 - spread, 15, 'M'); c.rect(10 + spread, 12.4, 12.6 + spread, 15, 'M'); // two pillar legs with a clear gap
  c.part('torso', 8, 9.6 + drop); c.poly([[4.6, 6.4 + drop], [11.4, 6.4 + drop], [13, 12.6 + drop], [3, 12.6 + drop]], 'M'); c.ellipse(8, 11.4 + drop, 3, 1.6, 'B'); // pear-shaped mass, widest at the hips
  c.part('arm'); const arm = (s, mode) => { const x = 8 + s * 5.6; if (mode === 'up') c.capsule(x, 7.6 + drop, 8 + s * 6.2, 2.6, 1.3, 'M'); else if (mode === 'fwd') c.ellipse(8 + s * 3.2, 11.2 + drop, 1.6, 1.4, 'M'); else c.capsule(x, 7.8 + drop, 8 + s * 6.4, v(11.4, 10.2, 11.8, 0, 11.4) + drop, 1.3, 'M'); };
  arm(-1, v('d', 'd', 'd', 'fwd', 'up')); arm(1, v('d', 'd', 'd', 'fwd', 'd'));
  const hy = v(5, 4.4, 5.8, 5.6, 5) + drop; c.head(8, hy, 2.4, 2.1);
  return { head: [8, hy, 2.4, 2.1], eyes: [[7.1, hy], [8.9, hy]], mouth: [8, hy + 1.1], back: [8, 7], tail: [12, 13], ground: 15 };
});
def('long_limbed_upright', 'Long-limbed upright', 'Narrow torso, elongated arms and legs, taller outline', { view: 'front', grounded: true }, (c, v) => {
  // A spindly stick-like build: a thin torso on a neck, legs in a wide inverted V and arms held away from the body, so open space
  // shows between the legs and on both sides of the torso. A bird has a full egg-shaped body and no arms; this has neither.
  const p = v('n', 'a', 'b', 'f', 'e');
  const hip = p === 'b' ? 10.6 : p === 'a' ? 9.4 : 10, stance = p === 'b' ? 5.6 : p === 'f' ? 4.6 : 4;
  c.part('leg'); c.capsule(7.4, hip, 8 - stance, 15, 0.6, 'M'); c.capsule(8.6, hip, 8 + stance, 15, 0.6, 'M'); // legs: inverted V
  c.part('torso', 8, hip - 2.6); c.capsule(8, hip, 8, hip - 4.6, 1, 'M'); c.ellipse(8, hip - 2.6, 1.3, 2, 'M'); // narrow torso
  const sh = hip - 4.4; const hand = { n: [[3, 10.4], [13, 10.4]], a: [[3.4, 9], [12.6, 9]], b: [[1.8, sh + 1.4], [14.2, sh + 1.4]], f: [[2.6, 12.4], [13.4, 7.4]], e: [[2.6, 1.6], [13, 10.6]] }[p];
  c.part('arm'); for (const [i, s] of [[0, -1], [1, 1]]) { const [x, y] = hand[i]; const ex = 8 + s * 2.8, ey = (sh + y) / 2 - (p === 'e' && s < 0 ? 0.6 : -0.6); c.capsule(8 + s * 1, sh, ex, ey, 0.55, 'M'); c.capsule(ex, ey, x, y, 0.5, 'M'); }
  const hy = sh - 2.8; c.part('neck', 8, sh); c.capsule(8, sh, 8, hy + 1, 0.45, 'M'); c.head(8, hy, 1.8, 1.6); // thin neck, small head
  return { head: [8, hy, 1.8, 1.6], eyes: [[7.3, hy], [8.7, hy]], mouth: [8, hy + 0.9], back: [8, sh], tail: [8, hip], ground: 15 };
});
def('knuckle_walker', 'Hunched knuckle-walker', 'Forward torso, low head, long weight-bearing forearms', { view: 'side', grounded: true }, (c, v) => {
  const lift = v(0, -0.8, 0.6, 0.4, 0);
  c.part('leg'); c.capsule(12, 11, 12.6, 15, 0.9, 'M'); // short hind leg
  c.part('torso', 9, 8.4 + lift); c.oval(8.4, 7.8 + lift, 4.6, 2.8, -16, 'M'); c.ellipse(11.4, 9.4 + lift * 0.3, 2.2, 2, 'M'); c.ellipse(8.6, 9.2 + lift, 2.6, 1, 'B'); // torso slopes down to the hips
  c.part('leg'); if (v(0, 0, 0, 0, 1)) { c.part('arm'); c.capsule(5.4, 6.6, 3.2, 2, 1, 'M'); c.part('leg'); c.capsule(6.6, 8.4, 6, 15, 1, 'M'); } // one fist raised
  else { const fx = v(4.4, 4.6, 3.6, 2.8, 0); c.capsule(5.2, 7.6 + lift, fx, 15, 1.1, 'M'); c.ellipse(fx, 14.6, 1.3, 0.8, 'M'); } // long forearm planted on the knuckles
  const hx = v(3.4, 3.8, 3, 2.6, 3.6), hy = v(8.6, 6.6, 9.4, 9, 7.8); c.head(hx, hy, 2, 1.8);
  return { head: [hx, hy, 2, 1.8], eyes: [[hx - 0.8, hy - 0.4]], mouth: [hx - 1.6, hy + 0.8], back: [8.6, 5.2 + lift], tail: [13.4, 9.6], ground: 15, side: true };
});
def('compact_quadruped', 'Compact quadruped', 'Short body with a balanced feline/canine-like stance', { view: 'side', grounded: true }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  if (p === 'e') { // sitting upright
    c.part('torso', 9.4, 10.6); c.ellipse(10, 11.8, 2.8, 2.8, 'M'); c.oval(8.6, 9.4, 2.2, 3.2, 18, 'M'); c.part('leg'); c.capsule(6.8, 10.4, 6.6, 15, 0.7, 'M'); c.rect(9.2, 14, 12.4, 15, 'M'); c.part('torso', 9.4, 10.6); c.ellipse(8.6, 11, 1.1, 2, 'B');
    c.part('tail', 12.4, 13.4); c.capsule(12.4, 13.4, 14, 10.6, 0.55, 'M'); c.head(6.8, 5.6, 2.6, 2.3);
    return { head: [6.8, 5.6, 2.6, 2.3], eyes: [[5.6, 5.2]], mouth: [4.6, 6.6], back: [10, 8.8], tail: [14, 10.6], ground: 15, side: true };
  }
  const by = v(9.8, 9.6, 10.6, 10, 0), f = v(4.6, 4.6, 3.8, 3.2, 0), b = v(12, 12, 12.8, 13.4, 0);
  c.part('leg'); c.capsule(f + 1, by + 0.8, f, 15, 0.7, 'M'); c.capsule(f + 2, by + 0.8, f + 1.4, 15, 0.6, 'Md'); // front pair
  c.capsule(b - 1.6, by + 0.8, b - 1.2, 15, 0.6, 'Md'); c.capsule(b - 0.6, by + 0.8, b, 15, 0.7, 'M'); // hind pair: a clear underbody gap between
  c.part('torso', 8.6, by); c.ellipse(8.6, by, 4, 2.2, 'M'); c.ellipse(8.4, by + 1.2, 2.6, 0.9, 'B');
  c.part('tail', 12.4, by - 0.6); c.capsule(12.4, by - 0.6, 14, v(7.6, 6.6, 9, 8.4, 0), 0.55, 'M');
  const hx = v(4.4, 4.6, 3.8, 3.4, 0), hy = v(7, 5.8, 8.4, 7.6, 0); c.head(hx, hy, 2.6, 2.3);
  return { head: [hx, hy, 2.6, 2.3], eyes: [[hx - 1, hy - 0.4]], mouth: [hx - 2, hy + 1], back: [9, by - 2], tail: [14, 7.6], ground: 15, side: true };
});
def('long_legged_quadruped', 'Long-legged quadruped', 'Elevated torso, long legs, visible underbody clearance', { view: 'side', grounded: true }, (c, v) => {
  const by = v(7.6, 7.2, 8.4, 7.8, 7.4), spread = v(0, 0, 0.8, 1.6, 0);
  c.part('torso', 9, by); c.part('leg'); c.capsule(5.6, by + 0.8, 5 - spread, 15, 0.55, 'M'); c.capsule(7, by + 0.8, 6.8 - spread * 0.4, 15, 0.55, 'Md');
  if (v(0, 0, 0, 0, 1)) { c.capsule(10.6, by + 0.8, 11, 15, 0.55, 'Md'); c.capsule(12.2, by + 0.8, 13.4, 13.8, 0.55, 'M'); } // one hind hoof raised
  else { c.capsule(10.6, by + 0.8, 10.8 + spread * 0.4, 15, 0.55, 'Md'); c.capsule(12, by + 0.8, 12.6 + spread, 15, 0.55, 'M'); }
  c.part('torso', 9, by); c.ellipse(9, by, 4.2, 1.9, 'M'); c.ellipse(9, by + 1, 2.8, 0.8, 'B');
  c.part('tail', 12.8, by - 0.4); c.capsule(12.8, by - 0.4, 14.2, by + v(1, -1.6, 1.6, 0.6, -2.4), 0.5, 'M');
  const hx = v(3.6, 3.8, 3, 2.4, 3.4), hy = v(4.6, 3.2, 5.8, 5.4, 3.8); c.part('neck', 5.6, by - 0.6); c.capsule(5.6, by - 0.6, hx + 0.8, hy + 0.6, 0.9, 'M'); c.head(hx, hy, 2.1, 1.6);
  return { head: [hx, hy, 2.1, 1.6], eyes: [[hx - 0.6, hy - 0.4]], mouth: [hx - 1.8, hy + 0.6], back: [9, by - 1.8], tail: [14.2, by], ground: 15, side: true };
});
def('low_elongated_quadruped', 'Low elongated quadruped', 'Long body, short legs, low reptile/mustelid-like outline', { view: 'side', grounded: true }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  const pts = p === 'a' ? [[3.4, 9.2, 1.5], [6, 11.6, 1.6], [10, 12.6, 1.7], [13.6, 12.8, 0.9], [15, 12, 0.5]]
    : p === 'f' ? [[2.6, 12, 1.4], [6, 11.6, 1.7], [9.6, 12.8, 1.7], [12.6, 12, 1], [14.8, 10.6, 0.5]]
    : p === 'e' ? [[2.8, 11.4, 1.5], [6.4, 12.2, 1.7], [10.2, 12.4, 1.6], [12.8, 11, 1], [13.6, 8.6, 0.8], [12.4, 7.4, 0.5]]
    : p === 'b' ? [[2.6, 12.8, 1.4], [6.2, 12.8, 1.8], [10.2, 12.8, 1.8], [13.4, 13.2, 0.9], [15, 13.6, 0.5]]
    : [[2.8, 11.8, 1.4], [6.2, 12.2, 1.7], [10.2, 12.4, 1.7], [13.4, 12.8, 0.9], [15, 13, 0.5]];
  c.part('torso', 8, 12.4); c.part('leg'); for (const [x, ox] of [[5.2, p === 'f' ? -1 : 0], [6.4, 0], [9.6, 0], [10.8, p === 'f' ? 1 : 0]]) c.capsule(x, 12.6, x + ox, 15, 0.6, x === 6.4 || x === 9.6 ? 'Md' : 'M');
  c.part('torso', 8, 12.4); c.chain(pts, 'M'); c.capsule(4.6, 13.4, 10.6, 13.4, 0.7, 'B', { keep: false });
  const [hx, hy] = [pts[0][0] - 0.4, pts[0][1] - 0.6]; c.head(hx, hy, 2.2, 1.3, { deg: p === 'a' ? -25 : 0 });
  return { head: [hx, hy, 2.2, 1.3], eyes: [[hx - 0.4, hy - 0.5]], mouth: [hx - 1.8, hy + 0.4], back: [8, 10.6], tail: pts[pts.length - 1], ground: 15, side: true };
});
def('heavy_quadruped', 'Heavy quadruped', 'Deep body, thick limbs, substantial shoulders and back', { view: 'side', grounded: true }, (c, v) => {
  const drop = v(0, -0.4, 0.6, 0.4, 0), spread = v(0, 0, 0.6, 0.8, 0), stamp = v(0, 0, 0, 0, 1);
  c.part('torso', 8.8, 9.4 + drop); c.part('leg'); c.rect(3.8 - spread, 11.6, 6.4 - spread, stamp ? 13 : 15, 'M'); c.rect(11 + spread, 11.6, 13.6 + spread, 15, 'M'); // front and hind pillars, gap between
  c.part('torso', 8.8, 9.4 + drop); c.ellipse(8.8, 9.4 + drop, 5.4, 2.9, 'M'); c.ellipse(6.4, 7.2 + drop, 3.2, 2.4, 'M'); c.ellipse(9, 11.2 + drop, 3.2, 1, 'B'); // deep barrel with shoulder hump
  const hx = v(2.6, 2.8, 2.4, 2, 2.8), hy = v(10, 8.8, 10.8, 10.6, 9.4); c.part('neck', 5, 8 + drop); c.capsule(hx + 1, hy - 0.6, 5, 8 + drop, 1.2, 'M'); c.head(hx, hy, 2.2, 2); c.part('neck', 5, 8 + drop); c.capsule(hx + 1, hy - 0.6, 5, 8 + drop, 1.2, 'M'); c.part('body');
  return { head: [hx, hy, 2.2, 2], eyes: [[hx - 0.4, hy - 0.8]], mouth: [hx - 1.8, hy + 1], back: [6.6, 4.8 + drop], tail: [14.2, 8.4], ground: 15, side: true };
});
def('long_necked_quadruped', 'Long-necked quadruped', 'Extended visible neck and displaced head', { view: 'side', grounded: true }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  c.part('torso', 10.8, 10.4); c.part('leg'); c.capsule(8.4, 11.4, 8.2, 15, 0.7, 'M'); c.capsule(9.4, 11.4, 9.6, 15, 0.7, 'Md'); c.capsule(12, 11.4, 12.2, 15, 0.7, 'Md'); c.capsule(13, 11.4, 13.4, 15, 0.7, 'M');
  c.part('torso', 10.8, 10.4); c.ellipse(10.8, 10.4, 3.6, 2.2, 'M'); c.ellipse(10.8, 11.6, 2.4, 0.9, 'B'); c.part('tail', 14, 10); c.capsule(14, 10, 15, 12.4, 0.5, 'M');
  const head = p === 'a' ? [7.4, 1.8] : p === 'b' ? [4, 8.6] : p === 'f' ? [3, 5.4] : p === 'e' ? [10.8, 3] : [5, 3.4];
  const mid = p === 'e' ? [6.8, 4.6] : p === 'b' ? [6, 7.8] : [(8 + head[0]) / 2 - 0.4, (9.4 + head[1]) / 2];
  c.part('neck', 8.2, 9.4); c.chain([[8.2, 9.4, 1.1], [mid[0], mid[1], 0.8], [head[0] + 0.6, head[1] + 0.4, 0.7]], 'M');
  const face = p === 'e' ? 1 : -1; c.head(head[0], head[1], 1.9, 1.2, { deg: p === 'b' ? 30 : 0, dir: face });
  return { head: [head[0], head[1], 1.9, 1.2], eyes: [[head[0] + face * 0.4, head[1] - 0.5]], mouth: [head[0] + face * 1.6, head[1] + 0.4], back: [10.8, 8.4], tail: [15, 12.4], ground: 15, side: true, faceRight: p === 'e' };
});
def('perching_avian', 'Perching avian', 'Upright compact bird body with folded wings', { view: 'front', grounded: true }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  const by = p === 'b' ? 10.8 : 10.2; c.part('torso', 8, by);
  c.part('leg'); c.rect(6.2, 14, 6.8, 15, 'A'); c.rect(9.2, 14, 9.8, 15, 'A'); c.rect(5.6, 15, 7.2, 15, 'A'); c.rect(8.8, 15, 10.4, 15, 'A');
  c.part('torso', 8, by); c.ellipse(8, by, 3.2, 3.8, 'M'); c.ellipse(8, by + 0.8, 1.9, 2.6, 'B'); c.part('wing', 8, by);
  if (p === 'e') for (const s of [-1, 1]) c.poly([[8 + s * 2.6, 7.6], [8 + s * 7.4, 4.2], [8 + s * 7, 9.6], [8 + s * 5.4, 11.6], [8 + s * 2.8, 11]], 'A');
  else if (p === 'f') for (const s of [-1, 1]) c.poly([[8 + s * 2.4, 8], [8 + s * 6.2, 9.4], [8 + s * 5, 12.6], [8 + s * 2.8, 12.4]], 'A');
  else for (const s of [-1, 1]) c.oval(8 + s * 2.9, by + 0.6, 1.3, 3, s * (p === 'b' ? -12 : -6), 'A');
  const hy = p === 'a' ? 3.6 : p === 'b' ? 5.4 : 4.6; c.head(8, hy, 2.8, 2.4);
  const bk = c.xf.beak || 'short'; c.part('head', 8, hy); // the beak is part of the anatomy; the beak feature configures it
  if (bk === 'long') c.poly([[7.2, hy + 0.8], [8.8, hy + 0.8], [8, hy + 3.2]], 'W'); else if (bk === 'hooked') { c.poly([[7.2, hy + 0.8], [8.8, hy + 0.8], [8, hy + 2.2]], 'W'); c.px(8.6, hy + 2.2, 'W'); c.px(9, hy + 1.6, 'W'); } else c.poly([[7.2, hy + 0.8], [8.8, hy + 0.8], [8, hy + 2.2]], 'W');
  c.part('body');
  return { head: [8, hy, 2.8, 2.4], eyes: [[6.8, hy - 0.4], [9.2, hy - 0.4]], mouth: [8, hy + 1.4], back: [8, 7], tail: [8, 15], ground: 15, beak: true };
});
def('running_avian', 'Ground-running avian', 'Horizontal bird body, clear legs, forward head', { view: 'side', grounded: true }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  const legs = p === 'f' ? [[7, 3.6], [9.6, 12.6]] : p === 'b' ? [[8, 5.6], [10, 11.2]] : [[8.4, 7.6], [9.4, 9.8]];
  const by = p === 'b' ? 9.4 : p === 'a' ? 8.2 : 8.6; c.part('torso', 9.6, by);
  c.part('leg'); c.capsule(legs[0][0], 9.4, legs[0][1], 15, 0.45, 'A'); c.capsule(legs[1][0], 9.4, legs[1][1], 15, 0.45, 'A');
  c.part('torso', 9.6, by); c.oval(9.6, by, 3.8, 2.2, p === 'f' ? -10 : 4, 'M'); c.ellipse(9.4, by + 1, 2.4, 1, 'B');
  c.part('tail', 12.6, by); c.poly([[12.6, by - 1.2], [15.4, by - (p === 'e' ? 5 : 2.6)], [15, by + 0.6], [12.6, by + 1]], 'A'); // tail plume
  c.part('wing', 9.6, by); if (p === 'e') c.poly([[8, by - 1], [11.6, by - 4.8], [12, by - 0.6]], 'A');
  const head = p === 'a' ? [5.4, 3.4] : p === 'b' ? [5.2, 7.2] : p === 'f' ? [3.6, 6.4] : [5, 4.6];
  c.part('neck', 7.4, by - 0.8); c.capsule(7.4, by - 0.8, head[0] + 0.6, head[1] + 0.6, 0.75, 'M'); c.head(head[0], head[1], 1.8, 1.5);
  const bk = c.xf.beak || 'short'; c.part('head', head[0], head[1]);
  if (bk === 'long') c.poly([[head[0] - 1.4, head[1] - 0.2], [head[0] - 4.4, head[1] + 0.6], [head[0] - 1.4, head[1] + 0.9]], 'W'); else if (bk === 'hooked') { c.poly([[head[0] - 1.4, head[1] - 0.4], [head[0] - 3.2, head[1] + 0.2], [head[0] - 1.4, head[1] + 0.9]], 'W'); c.px(head[0] - 3.4, head[1] + 1, 'W'); } else c.poly([[head[0] - 1.4, head[1] - 0.2], [head[0] - 3.2, head[1] + 0.5], [head[0] - 1.4, head[1] + 0.9]], 'W');
  c.part('body');
  return { head: [head[0], head[1], 1.8, 1.5], eyes: [[head[0] - 0.4, head[1] - 0.4]], mouth: [head[0] - 2, head[1] + 0.4], back: [9.6, by - 2], tail: [15, by - 1.6], ground: 15, side: true, beak: true };
});
def('batlike', 'Batlike winged', 'Wing-supported anatomy with membrane spans, distinct from birds', { view: 'front', grounded: false }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  const tipY = p === 'a' ? 1.6 : p === 'b' ? 8.4 : p === 'f' ? 5 : p === 'e' ? 2.2 : 3.4, span = p === 'b' ? 5.6 : p === 'e' ? 7.6 : 7.2, low = p === 'b' ? 13.4 : 11.6;
  c.part('wing', 8, 9); for (const s of p === 'e' ? [-1] : [-1, 1]) {
    c.poly([[8 + s * 1.4, 6.8], [8 + s * span, tipY], [8 + s * (span - 0.4), low - 1.6], [8 + s * (span - 1.8), low - 0.6], [8 + s * (span - 3), low], [8 + s * 3.4, low - 1.2], [8 + s * 1.6, 10.6]], 'A');
    c.capsule(8 + s * 1.4, 6.8, 8 + s * span, tipY, 0.45, 'M');
  }
  if (p === 'e') c.poly([[9.4, 6.8], [11.6, 5.6], [12.6, 9], [10.6, 11.4], [9.6, 10.4]], 'A'); // one wing folded close
  c.part('torso', 8, 9.2); c.ellipse(8, 9.2, 2, 2.6, 'M'); c.ellipse(8, 9.8, 1.1, 1.6, 'B');
  const hy = p === 'a' ? 5.2 : 5.8; c.head(8, hy, 2.2, 1.9);
  c.part('arm'); c.capsule(7.2, 11.4, 7, 13, 0.4, 'M'); c.capsule(8.8, 11.4, 9, 13, 0.4, 'M'); c.part('body');
  return { head: [8, hy, 2.2, 1.9], eyes: [[7.2, hy], [8.8, hy]], mouth: [8, hy + 1], back: [8, 8], tail: [8, 12], ground: 15, floatGap: 2 };
});
def('coiled_serpent', 'Coiled serpent', 'Coiled lower body, raised head', { view: 'side', grounded: true }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  c.ellipse(8.4, 13.2, 5.6, 1.9, 'M'); c.ellipse(9.2, 11.2, 4.2, 1.7, 'M'); c.ellipse(8.4, 13.6, 3.4, 0.9, 'B');
  if (p !== 'b') c.ellipse(9.6, 9.4, 2.8, 1.4, 'M');
  const neck = p === 'a' ? [[7.6, 9, 1.3], [6.2, 5.6, 1.1], [6, 2.6, 1]] : p === 'b' ? [[7.2, 10.6, 1.3], [5, 9.6, 1.1], [3.4, 8.8, 1]]
    : p === 'f' ? [[7.6, 9.2, 1.3], [5.4, 7.6, 1.1], [3, 6.8, 1]] : p === 'e' ? [[8, 8.8, 1.3], [6.6, 5.4, 1.1], [8.6, 3, 1]] : [[7.6, 9.2, 1.3], [6.4, 6.6, 1.1], [5.4, 4.6, 1]];
  c.part('neck', neck[0][0], neck[0][1]); c.chain(neck, 'M'); const [hx, hy] = neck[2];
  c.head(hx - 0.6, hy, 2.3, 1.5, { deg: p === 'e' ? 20 : 0 }); c.part('tail', 13.8, 12.6); c.capsule(13.8, 12.6, 15, 10.6, 0.5, 'M'); c.part('body');
  return { head: [hx - 0.6, hy, 2.3, 1.5], eyes: [[hx - 1.2, hy - 0.4]], mouth: [hx - 2.6, hy + 0.6], back: [9.6, 8], tail: [15, 10.6], ground: 15, side: true };
});
def('elongated_serpent', 'Elongated serpent', 'Extended, curved body distinct from a coil', { view: 'side', grounded: true }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  const pts = p === 'a' ? [[3, 4.2, 1.2], [3.8, 8, 1.3], [6.6, 12.4, 1.4], [10, 13.6, 1.2], [13, 12.2, 0.9], [15, 13.8, 0.5]]
    : p === 'b' ? [[2.6, 9.6, 1.2], [5, 12.4, 1.4], [8.2, 13.4, 1.4], [11, 12, 1.2], [13.4, 13.6, 0.8], [15, 13.4, 0.5]]
    : p === 'f' ? [[2.2, 7.6, 1.2], [4.6, 9.6, 1.3], [7.6, 13, 1.4], [10.8, 11.4, 1.2], [13.4, 13.4, 0.8], [15, 12, 0.5]]
    : p === 'e' ? [[4.4, 3.4, 1.2], [2.8, 7, 1.3], [5.2, 10.6, 1.4], [9.4, 9.2, 1.3], [12.2, 12.6, 1], [14.6, 9.6, 0.6]]
    : [[2.8, 6.4, 1.2], [4.2, 10, 1.3], [7.2, 13, 1.4], [10.4, 12, 1.2], [13, 13.6, 0.8], [15, 12.6, 0.5]];
  c.chain(pts, 'M'); const [hx, hy] = pts[0]; c.head(hx - 0.4, hy, 2, 1.3);
  return { head: [hx - 0.4, hy, 2, 1.3], eyes: [[hx - 0.9, hy - 0.4]], mouth: [hx - 2.2, hy + 0.5], back: pts[2], tail: pts[pts.length - 1], ground: 15, side: true };
});
def('insectoid', 'Insectoid', 'Segmented body with readable insectlike appendages', { view: 'dorsal', grounded: true }, (c, v) => {
  // Dorsal (top-down) view, the usual pixel-art solution for insects: in a 16×16 side view the outline fills the waist pinches
  // and only three legs can show, so any insect reads as a four-legged mammal. Seen from above, the three body parts sit in a
  // column with visible waists, six legs splay out to the sides with open space between them, and two antennae point forward.
  const p = v('n', 'a', 'b', 'f', 'e');
  const yo = p === 'b' ? 0.6 : 0;
  if (p === 'e') for (const s of [-1, 1]) c.oval(8 + s * 3, 10.4, 1.7, 3.4, s * 26, 'A'); // wing cases opened (narrow, so the legs still show)
  const legs = p === 'b' ? [[[2, 4.4], [1.4, 7.6]], [[1.4, 9], [1, 10.4]], [[2, 13.4], [1.8, 15]]]
    : p === 'f' ? [[[3.4, 3.6], [2.8, 1.6]], [[1.6, 8], [1.2, 9.6]], [[2.8, 12], [3.2, 14.8]]]
    : p === 'a' ? [[[3.2, 3.2], [3.4, 1.2]], [[1.6, 7.6], [1.2, 9]], [[2.6, 12.4], [2.2, 14.6]]]
    : [[[2.8, 4], [2.2, 2.4]], [[1.6, 8], [1.2, 9.6]], [[2.6, 12.2], [2.2, 14.4]]];
  c.part('torso', 8, 9); c.part('leg'); if (p !== 'e') for (const s of [-1, 1]) legs.forEach(([[kx, ky], [fx, fy]], i) => { const ox = 8 + s * 1, oy = 6.8 + i * 0.9 + yo; const K = [8 + s * (8 - kx), ky + yo], F = [8 + s * (8 - fx), fy + yo]; c.capsule(ox, oy, K[0], K[1], 0.38, 'K'); c.capsule(K[0], K[1], F[0], Math.min(15, F[1]), 0.38, 'K'); });
  else for (const s of [-1, 1]) for (let i = 0; i < 3; i++) c.capsule(8 + s * 1, 6.8 + i * 0.9, 8 + s * (6.6 - i * 0.4), 4.4 + i * 4.2, 0.38, 'K');
  c.part('torso', 8, 9); const abY = p === 'b' ? 11.6 : 11.2; c.ellipse(8, abY, 2.6, 3.2, 'M'); for (const dy of [-1, 0.8, 2.4]) c.rect(6, abY + dy, 9.6, abY + dy, 'Md'); // banded abdomen
  c.rect(7.6, 8.4 + yo, 8, 8.4 + yo, 'M'); // waist
  c.ellipse(8, 7.2 + yo, 1.6, 1.3, 'M'); c.rect(7.6, 5.6 + yo, 8, 5.6 + yo, 'M'); // thorax and neck
  const hy = 4.4 + yo; c.head(8, hy, 1.7, 1.3, { dir: 0 }); c.part('head', 8, hy);
  const ant = p === 'a' ? [[5.4, 0.6], [10.6, 0.6]] : p === 'b' ? [[4.6, 2.6], [11.4, 2.6]] : p === 'f' ? [[6, 0.4], [10, 0.4]] : [[5, 1], [11, 1]];
  for (const [ax, ay] of ant) c.capsule(8 + (ax < 8 ? -0.6 : 0.6), hy - 1, ax, ay, 0.3, 'K');
  return { antennaTips: ant, head: [8, hy, 1.7, 1.3], eyes: [[7, hy - 0.2], [9, hy - 0.2]], mouth: [8, hy + 1], back: [8, 10], tail: [8, abY + 3], ground: 15, antennae: true, smallEyes: true, dorsal: true };
});
def('arachnid', 'Arachnidlike', 'Low central body with a spread-leg outline', { view: 'front', grounded: true }, (c, v) => {
  // At 16×16 the outline closes any gap under three pixels, so two separated legs a side cannot fit. The silhouette carries one
  // long arching leg a side (high knee, foot far out) with an open triangle under each arch; the inner legs are dark detail
  // under the low body.
  const p = v('n', 'a', 'b', 'f', 'e');
  const by = p === 'a' ? 12 : p === 'b' ? 13 : p === 'f' ? 12.8 : 12.4;
  const arch = { n: [[2.6, 5], [1.2]], a: [[3, 3.4], [1.6]], b: [[1.8, 7.4], [1]], f: [[2.2, 6.2], [1]], e: [[2.6, 5], [1.2]] }[p];
  c.part('torso', 8, by); c.part('leg'); for (const s of [-1, 1]) {
    const knee = [8 + s * (8 - arch[0][0]), arch[0][1] + (p === 'f' && s > 0 ? 1.4 : 0)], foot = [8 + s * (8 - arch[1][0]), 15];
    c.capsule(8 + s * 1.6, by - 0.6, knee[0], knee[1], 0.5, 'M');
    if (p === 'e' && s < 0) c.capsule(knee[0], knee[1], knee[0] + 1, 1.4, 0.5, 'M'); else c.capsule(knee[0], knee[1], foot[0], foot[1], 0.5, 'M');
    c.capsule(8 + s * 1.4, by + 0.4, 8 + s * 2.6, 15, 0.35, 'K'); // inner leg as dark detail tucked under the body
  }
  c.part('torso', 8, by); c.ellipse(8, by + 0.4, 2.1, 1.5, 'M'); c.head(8, by - 1, 1.4, 1); c.part('torso', 8, by); c.ellipse(8, by + 0.9, 1.1, 0.6, 'B');
  return { head: [8, by - 1, 1.4, 1], eyes: [[7.4, by - 1.2], [8.6, by - 1.2]], mouth: [8, by - 0.4], back: [8, by - 1.6], tail: [8, by + 2], ground: 15, smallEyes: true };
});
def('crustacean', 'Crustaceanlike', 'Broad body and prominent pincers, not a turtle with claws', { view: 'front', grounded: true }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  const by = p === 'b' ? 11.6 : 11;
  c.part('torso', 8, by); c.part('leg'); for (const s of [-1, 1]) for (let i = 0; i < 3; i++) c.capsule(8 + s * (2 + i), by + 0.6, 8 + s * (3.4 + i * 1.3), 15, 0.4, 'Md');
  c.part('torso', 8, by); c.ellipse(8, by, 4.6, 2.4, 'M'); c.ellipse(8, by + 0.9, 3, 1, 'B');
  const pk = c.xf.pincer || 'open', pr = pk === 'large' ? 1.3 : 1; // built-in pincers, configured by the pincers feature
  c.part('arm'); const claw = (s, x, y, up) => { c.capsule(8 + s * 3.4, by - 0.6, x, y + 1.2, 0.6, 'M'); c.ellipse(x, y, 1.9 * pr, 1.5 * pr, 'M'); if (pk !== 'closed') c.poly([[x - s * 0.2, y - 1.2 * pr], [x + s * 1.6 * pr, y - (up ? 3.2 : 2.4) * pr], [x + s * 1.2 * pr, y - 0.4]], 'M'); else c.ellipse(x + s * 0.6, y - 1.6, 1, 0.8, 'M'); };
  const L = p === 'e' ? [2.4, 3.2, 1] : p === 'a' ? [3, 5.6, 1] : p === 'b' ? [3.2, 9.4, 0] : p === 'f' ? [4.6, 7.6, 0] : [2.6, 7.6, 0];
  const R = p === 'e' ? [13, 7.6, 0] : p === 'a' ? [13, 5.6, 1] : p === 'b' ? [12.8, 9.4, 0] : p === 'f' ? [11.4, 7.6, 0] : [13.4, 7.6, 0];
  claw(-1, L[0], L[1], L[2]); claw(1, R[0], R[1], R[2]);
  for (const s of [-1, 1]) { c.capsule(8 + s * 1.2, by - 1.8, 8 + s * 1.6, by - 3.8, 0.35, 'M'); }
  return { head: [8, by - 1, 2.4, 1.4], eyes: [[6.4, by - 4], [9.6, by - 4]], mouth: [8, by - 0.2], back: [8, by - 2.2], tail: [8, by + 2.4], ground: 15, pincers: true, stalkEyes: true };
});
def('shelled', 'Shelled', 'Dominant shell profile with exposed head and limbs', { view: 'side', grounded: true }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  const shellY = p === 'b' ? 11.2 : 10.4;
  c.part('torso', 9.4, shellY); if (p !== 'b') { c.part('leg'); c.rect(5.4, 12.6, 6.6, 15, 'Md'); c.rect(11.4, 12.6, 12.6, 15, 'Md'); }
  c.part('torso', 9.4, shellY); shellBody(c, 9.4, shellY, 5.2, p === 'b' ? 3.6 : 4); c.rect(4.4, shellY + 1.8, 14.2, shellY + 2.6, 'B');
  if (p === 'b') return { head: [5.2, 12.6, 1, 0.8], eyes: [[4.8, 12.4]], mouth: [4.2, 13], back: [9.4, 6.4], tail: [14.4, 13], ground: 15, side: true, shell: true }; // withdrawn
  const head = p === 'a' ? [2.8, 7.4] : p === 'f' ? [2, 10.4] : p === 'e' ? [3.4, 8.4] : [3.4, 9.8];
  c.part('neck', 5.6, shellY + 1); c.capsule(5.6, shellY + 1, head[0] + 1, head[1] + 0.4, 1, 'M'); c.head(head[0], head[1], 2.2, 1.8);
  if (p === 'e') { c.part('arm'); c.capsule(13.6, shellY + 1, 15.2, shellY - 2.4, 0.6, 'M'); c.part('body'); }
  return { head: [head[0], head[1], 2.2, 1.8], eyes: [[head[0] - 0.6, head[1] - 0.4]], mouth: [head[0] - 1.8, head[1] + 0.6], back: [9.4, shellY - 4], tail: [14.4, 13], ground: 15, side: true, shell: true };
});
def('amorphous', 'Amorphous', 'Irregular soft outline; more than a single ellipse', { view: 'front', grounded: true }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  const lean = p === 'f' ? -1.2 : 0, rise = p === 'a' ? -1.6 : p === 'b' ? 1 : 0;
  c.ellipse(8.6 + lean * 0.4, 12.6, 5.2, 2.4, 'M'); // a spreading puddle base
  c.ellipse(6.4 + lean, 9 + rise, 3.2, 3.4, 'M'); c.ellipse(10.4 + lean * 0.5, 10.4 + rise * 0.6, 2.4, 2.2, 'M'); // lopsided upper lobes
  c.ellipse(3.4 + lean * 0.4, 14.4, 1.4, 0.9, 'M'); c.ellipse(13.6, 14.6, 1, 0.7, 'M'); c.capsule(12.6, 12.4, 13.8, 14.4, 0.5, 'M'); // drips
  if (p === 'e') { c.capsule(11.4, 10, 13.6, 5.4, 0.9, 'M'); c.ellipse(13.8, 4.6, 1.3, 1.2, 'M'); } // a pseudopod reaching up
  if (p === 'f') c.capsule(4, 12.4, 1.4, 11.6, 0.9, 'M');
  if (p === 'b') { c.ellipse(2.6, 13, 1.5, 1.4, 'M'); c.ellipse(13.6, 13, 1.5, 1.4, 'M'); }
  if (p === 'a') c.ellipse(6.2, 5.6 + rise * 0.5, 1.6, 1.6, 'M');
  c.ellipse(8.6 + lean * 0.4, 13, 3, 1.1, 'B');
  const ey = 8.8 + rise; return { head: [6.4 + lean, ey, 3.2, 3.4], eyes: [[5.4 + lean, ey], [7.6 + lean, ey + 0.6]], mouth: [6.6 + lean, ey + 2.2], back: [6.4, 5.6], tail: [13.6, 14.6], ground: 15, asymmetric: true };
});
def('floating', 'Floating', 'Suspended compact body without grounded legs', { view: 'front', grounded: false }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  const y = p === 'a' ? 6.6 : p === 'b' ? 8.6 : 7.6, tilt = p === 'f' ? -18 : 0;
  c.oval(8, y, 4, 3.8, tilt, 'M'); c.ellipse(8 + (p === 'f' ? -0.6 : 0), y + 1.2, 2.4, 1.8, 'B');
  const tail = p === 'f' ? [[9.4, y + 3, 1.6], [11.6, y + 5.2, 1], [14, y + 5.8, 0.5]] : p === 'e' ? [[8, y + 3, 1.6], [6.4, y + 5, 1], [8.4, y + 6.6, 0.6], [10, y + 5.6, 0.4]] : [[8, y + 3, 1.6], [8.6, y + 5, 1], [7.6, y + 6.6, 0.5]];
  c.part('tail', tail[0][0], tail[0][1]); c.chain(tail, 'M'); c.part('body'); // tapering wisp instead of legs
  if (p === 'b') for (const s of [-1, 1]) c.oval(8 + s * 4, y + 0.8, 1.2, 2.2, s * 20, 'M');
  if (p === 'e') for (const s of [-1, 1]) c.oval(8 + s * 4.4, y - 2.6, 1, 2, s * -30, 'M');
  return { head: [8, y, 4, 3.8], eyes: [[6.4, y - 0.4], [9.6, y - 0.4]], mouth: [8, y + 1.6], back: [8, y - 3.6], tail: tail[tail.length - 1], ground: 15, floating: true };
});
def('amphibian', 'Amphibian', 'Broad head, squat torso, folded jumping legs', { view: 'side', grounded: true }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  const rise = p === 'a' ? -1.4 : p === 'b' ? 0.6 : p === 'f' ? -0.4 : 0;
  c.part('torso', 8.6, 11.4); c.part('leg'); c.ellipse(11, 12.4, 2.8, 2.4, 'M'); c.capsule(10.4, 14.4, 14.6, 15, 0.6, 'M'); // folded haunch and long foot
  if (p === 'f') c.capsule(12.8, 13.2, 15.2, 11.4, 0.6, 'M');
  c.part('torso', 8.6, 11.4); c.oval(8.6, 11.4 + rise * 0.5, 3.8, 2.6, p === 'a' ? -14 : 0, 'M'); c.ellipse(8, 12.6, 2.8, 1.2, 'B');
  c.part('leg'); c.capsule(5.6, 12, 5 - (p === 'f' ? 1 : 0), 15, 0.6, 'M');
  const hx = 4.8, hy = 9.6 + rise; c.head(hx, hy, 3.6, 2.2);
  if (p === 'e') { c.part('head', hx, hy); c.ellipse(hx - 2, hy + 2.2, 2, 1.2, 'B'); c.part('body'); } // throat sac out
  return { head: [hx, hy, 3.6, 2.2], eyes: [[hx - 0.8, hy - 1.8]], mouth: [hx - 3, hy + 0.8], back: [9, 8.4 + rise], tail: [13.6, 12], ground: 15, side: true, bulgeEyes: true };
});
def('hopping', 'Hopping', 'Dominant hind legs, small forelimbs, upright balance', { view: 'side', grounded: true }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  const lean = p === 'f' ? 1.6 : p === 'b' ? 0.6 : 0, up = p === 'a' ? -1 : p === 'b' ? 1 : 0;
  c.part('torso', 8.4, 8.8 + up); c.part('leg'); c.ellipse(9.6, 12.2, 2.8, 2.4, 'M'); c.capsule(8, 14.8, 12.2, 15, 0.7, 'M'); // big haunch, long flat foot
  c.part('tail', 12, 11.6); c.chain([[12, 11.6, 1], [14, 12.8, 0.8], [15.2, 14.8, 0.5]], 'M'); // balancing tail
  c.part('torso', 8.4, 8.8 + up); c.oval(8.4 - lean * 0.4, 8.8 + up, 2.4, 3.6, 12 + lean * 10, 'M'); c.ellipse(7.6 - lean * 0.4, 9.6 + up, 1.2, 2.2, 'B');
  c.part('arm'); const arm = p === 'e' ? [[6.6, 8 + up], [4.4, 5 + up]] : [[6.8, 8.6 + up], [5 - lean, 10.4 + up]]; c.capsule(arm[0][0], arm[0][1], arm[1][0], arm[1][1], 0.45, 'M');
  const hx = 7.4 - lean, hy = 4.4 + up + lean * 0.6; c.head(hx, hy, 2.2, 1.8, { deg: -8 });
  return { head: [hx, hy, 2.2, 1.8], eyes: [[hx - 0.8, hy - 0.4]], mouth: [hx - 2, hy + 0.6], back: [9.4, 6 + up], tail: [15.2, 14.8], ground: 15, side: true };
});
def('burrowing', 'Burrowing', 'Compact head, low body, dominant digging forelimbs', { view: 'side', grounded: true }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  const by = p === 'a' ? 10.8 : p === 'b' ? 12.4 : 11.8;
  c.part('torso', 10.2, by); c.part('leg'); c.rect(11.4, 13.4, 12.6, 15, 'Md'); c.part('torso', 10.2, by); c.ellipse(10.2, by, 4, 2.6, 'M'); c.ellipse(10.2, by + 1.2, 2.8, 1, 'B'); c.part('tail', 13.8, by + 0.6); c.capsule(13.8, by + 0.6, 14.8, by + 1.6, 0.4, 'M');
  const hx = p === 'a' ? 6.2 : p === 'f' ? 5.6 : 6, hy = p === 'a' ? 8.6 : p === 'b' ? 11 : 10; c.head(hx, hy, 2.2, 1.5, { deg: -8 }); c.part('head', hx, hy); c.ellipse(hx - 2, hy + 0.4, 0.8, 0.6, 'K');
  const paw = p === 'e' ? [3.6, 4.4] : p === 'f' ? [2, 13.2] : p === 'b' ? [3, 14.4] : p === 'a' ? [2.6, 11.6] : [2.4, 13.6]; // big spade forepaw reaching out front
  c.part('arm'); c.capsule(7.4, by + 0.4, paw[0] + 0.8, paw[1], 1, 'M'); c.oval(paw[0], paw[1] + 0.2, 1.7, 1.1, -20, 'W'); c.part('body');
  return { head: [hx, hy, 2.2, 1.5], eyes: [[hx - 0.2, hy - 0.6]], mouth: [hx - 1.8, hy + 0.6], back: [10.2, by - 2.4], tail: [14.8, by + 1.6], ground: 15, side: true, smallEyes: true };
});
def('segmented_crawler', 'Armored segmented crawler', 'Low multi-segment body on repeated supporting appendages', { view: 'side', grounded: true }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  const segs = p === 'a' ? [[3, 6.6, 1.6], [4, 9.4, 1.8], [6, 11.2, 2], [8.6, 11.4, 2], [11.2, 11.6, 1.8], [13.4, 12.4, 1.4]]
    : p === 'b' ? [[2.6, 12.6, 1.6], [4.8, 11.8, 1.9], [7.4, 11.4, 2], [10, 11.4, 2], [12.4, 11.8, 1.8], [14.2, 12.6, 1.3]]
    : p === 'f' ? [[2.2, 11.8, 1.6], [4.4, 10.6, 1.9], [7, 10, 2], [9.6, 10.6, 2], [12, 10.8, 1.8], [14, 12, 1.3]]
    : p === 'e' ? [[5.2, 6.4, 1.6], [3.4, 8.6, 1.8], [3.6, 11.6, 2], [6.4, 12.6, 2], [9.4, 12.2, 1.8], [12, 11.2, 1.5], [13.6, 9.4, 1.2]]
    : [[2.6, 12, 1.6], [4.6, 10.6, 1.9], [7, 9.8, 2.1], [9.6, 9.8, 2.1], [12, 10.6, 1.9], [14, 12, 1.4]]; // arched back of overlapping plates
  c.part('leg'); for (const [x, y, r] of segs.slice(1)) if (y + r < 13.6) c.capsule(x, y + r - 0.4, x - 0.6, 15, 0.35, 'K'); // a leg under each plate
  c.part('body'); segs.forEach(([x, y, r], i) => c.ellipse(x, y, r * 0.9, r, i % 2 ? 'M' : 'A'));
  for (let i = 1; i < segs.length; i++) c.px(segs[i][0] - segs[i][2] * 0.8, segs[i][1] - segs[i][2] * 0.4, 'K'); // plate seams
  const [hx, hy, hr] = segs[0];
  return { head: [hx, hy, hr, hr], eyes: [[hx - 0.6, hy - 0.4]], mouth: [hx - 1.2, hy + 0.8], back: [8, 7.8], tail: segs[segs.length - 1], ground: 15, side: true, segmented: true };
});
def('flat_bodied', 'Flat-bodied', 'Broad thin raylike or flattened outline', { view: 'front', grounded: false }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  const y = p === 'a' ? 8.4 : p === 'b' ? 11.4 : 10, tip = p === 'a' ? -2.6 : p === 'e' ? 2.4 : p === 'b' ? 0.4 : -1.2, span = p === 'b' ? 6.4 : 7.4;
  const L = p === 'e' ? -1.6 : 0;
  c.poly([[8, y - 2.2], [8 - span, y + tip + L], [8 - span + 1.6, y + 1.4], [8, y + 2.2], [8 + span - 1.6, y + 1.4], [8 + span, y + (p === 'e' ? -2.4 : tip)]], 'M');
  c.ellipse(8, y + 0.6, 2.4, 1.2, 'B');
  const tail = p === 'f' ? [[8, y + 2, 0.5], [6.8, y + 4.4, 0.35], [5, y + 5.2, 0.3]] : [[8, y + 2, 0.5], [8.4, y + 4.4, 0.35], [8, y + 5.6, 0.3]];
  c.part('tail', 8, y + 2); c.chain(tail, 'M'); c.part('body');
  return { head: [8, y - 0.6, 2.6, 1.4], eyes: [[6.8, y - 0.8], [9.2, y - 0.8]], mouth: [8, y + 0.8], back: [8, y - 2], tail: tail[tail.length - 1], ground: 15, floating: true, flat: true };
});
def('tentacled', 'Tentacled', 'Central body with flexible surrounding limbs', { view: 'front', grounded: true }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  const y = p === 'a' ? 5 : p === 'b' ? 7.2 : 6.2;
  // four tentacles splayed wide so open space shows between them, ends curling
  const sets = {
    n: [[[6, 9], [3.6, 11.6], [1.8, 13.6], [2.6, 15]], [[7.4, 9.6], [6.6, 12.6], [7, 15]], [[8.6, 9.6], [9.8, 12.6], [10.6, 15]], [[10, 9], [12.4, 11.6], [14.2, 13.6], [13.4, 15]]],
    a: [[[6, 8], [3.6, 10.6], [2, 13.4], [2.8, 15]], [[7.4, 8.6], [6.8, 12], [7.2, 15]], [[8.6, 8.6], [9.6, 12], [10.4, 15]], [[10, 8], [12.4, 10.6], [14, 13.4], [13.2, 15]]],
    b: [[[6, 10], [2.8, 12.2], [1.4, 15]], [[7.4, 10.4], [5.8, 13], [5.2, 15]], [[8.6, 10.4], [10.2, 13], [10.8, 15]], [[10, 10], [13.2, 12.2], [14.6, 15]]],
    f: [[[6, 9], [4, 11], [1.6, 11.4]], [[7.2, 9.6], [5.4, 12.6], [4.6, 15]], [[8.6, 9.6], [9, 12.6], [8.4, 15]], [[10, 9], [12.4, 11.6], [13, 15]]],
    e: [[[6, 9], [3.6, 11.6], [1.8, 13.6], [2.6, 15]], [[7.4, 9.6], [6.6, 12.6], [7, 15]], [[8.6, 9.6], [9.8, 12.6], [10.6, 15]], [[10, 8.4], [12.6, 6.6], [13.6, 3.6], [12.4, 2.4]]],
  }[p];
  for (const t of sets) c.chain(t.map(([x, yy], i) => [x, yy + (y - 6.2), 0.75 - i * 0.12]), 'M');
  c.ellipse(8, y, 3.6, 3.4, 'M'); c.ellipse(8, y + 1.8, 2.2, 1.1, 'B');
  return { head: [8, y, 3.6, 3.4], eyes: [[6.6, y + 0.2], [9.4, y + 0.2]], mouth: [8, y + 1.8], back: [8, y - 3.4], tail: [8, 15], ground: 15, asymmetric: p === 'f' || p === 'e' };
});
def('jellyfish', 'Floating jellyfish', 'A distinct bell body and trailing tendrils', { view: 'front', grounded: false }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  const y = p === 'a' ? 4.6 : p === 'b' ? 6.4 : 5.4, w = p === 'b' ? 5.2 : p === 'a' ? 3.6 : 4.4, sway = p === 'f' ? 1.4 : 0, rim = y + 1;
  c.ellipse(8, y, w, p === 'a' ? 4 : 3.4, 'M'); c.clear((x, yy) => yy > Math.floor(c.ty(rim)));
  c.rect(8 - w + 0.6, rim, 8 + w - 0.6, rim, 'B'); // frilled rim
  const xs = p === 'e' ? [4, 8, 12] : [4.2, 8, 11.8];
  xs.forEach((x, i) => c.chain([[x, rim + 0.6, 0.45], [x + sway * 0.5 + (i - 1) * 0.6 + (p === 'e' ? (i - 1) * 1.2 : 0), rim + 4, 0.35], [x + sway + (i - 1) * (p === 'b' ? 1.4 : 0.4) + (p === 'e' ? (i - 1) * 2 : 0), rim + (p === 'a' ? 9 : 8), 0.3]], 'A'));
  return { head: [8, y, w, 3.4], eyes: [[6.6, y - 0.4], [9.4, y - 0.4]], mouth: [8, y + 0.4], back: [8, y - 3], tail: [8, rim + 8], ground: 15, floating: true };
});
def('plant_bodied', 'Plant-bodied', 'Stem, fronds, roots or branches form the actual anatomy', { view: 'front', grounded: true }, (c, v) => {
  const p = v('n', 'a', 'b', 'f', 'e');
  c.part('leg'); for (const [x, y] of [[4.6, 15], [6.4, 15], [9.6, 15], [11.4, 15]]) c.capsule(8 + (x < 8 ? -0.8 : 0.8), 12.6, x + (p === 'b' ? (x < 8 ? -1.2 : 1.2) : 0), y, 0.45, 'Md'); // root feet
  const top = p === 'a' ? 3.4 : p === 'b' ? 6 : 4.6; c.part('torso', 8, 9); c.capsule(8, 13, 8 + (p === 'f' ? -1 : 0), top + 2.6, 0.9, 'Md'); c.part('wing', 8, 9);
  const frond = (s, ang, len, ty) => c.oval(8 + s * (len * 0.6), ty, len * 0.62, 1, s * ang, 'A');
  if (p === 'e') { frond(-1, -40, 5.6, 7.2); frond(1, 40, 5.6, 7.2); frond(-1, -10, 4, 10.4); frond(1, 10, 4, 10.4); }
  else if (p === 'b') { frond(-1, 15, 5, 10.6); frond(1, -15, 5, 10.6); }
  else { frond(-1, p === 'a' ? -30 : -10, 5, 9); frond(1, p === 'a' ? 30 : 10, 5, 9.4); if (p === 'f') frond(-1, 0, 5.6, 11.6); }
  c.head(8 + (p === 'f' ? -1 : 0), top, 3.2, 2.8, { dir: 0 }); // bud head
  const hx = 8 + (p === 'f' ? -1 : 0);
  return { head: [hx, top, 3.2, 2.8], eyes: [[hx - 1.2, top], [hx + 1.2, top]], mouth: [hx, top + 1.4], back: [8, top + 3], tail: [8, 12.6], ground: 15, plant: true };
});
def('construct', 'Mineral/construct', 'Angular connected masses and nonanimal joints', { view: 'front', grounded: true }, (c, v) => {
  // Straight-edged blocks only: a faceted core, a separate head block on a peg, shoulder blocks hung from single-pixel pins and
  // two leg blocks under a pelvis plate. The pins leave notches in the silhouette, so the masses read as assembled, not grown.
  const p = v('n', 'a', 'b', 'f', 'e');
  const d = p === 'b' ? 1 : p === 'a' ? -0.6 : 0;
  const block = (x0, y0, x1, y1) => c.poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 'M');
  c.poly([[5.4, 6.6 + d], [10.6, 6.6 + d], [11.6, 9 + d], [9.6, 11.6 + d], [6.4, 11.6 + d], [4.4, 9 + d]], 'M'); // faceted core (hexagon)
  c.rect(7.4, 11.6 + d, 8.4, 12.2 + d, 'K'); // waist pin
  c.part('leg'); if (p === 'b') { block(4.2, 12.8, 7.4, 15.4); block(8.6, 12.8, 11.8, 15.4); } else { block(5, 12.8, 7.4, 15.4); block(8.6, 12.8, 11, 15.4); } c.part('body'); // leg blocks under the pin
  c.rect(5.4, 12.4 + d, 10.4, 12.6 + d, 'Md');
  const arm = (s, mode) => { const sx = 8 + s * 4.1; c.rect(sx - 0.4 + (s > 0 ? 0 : -0.2), 7.6 + d, sx + 0.4, 7.6 + d, 'K'); // shoulder pin
    const ax = 8 + s * 5.6;
    if (mode === 'up') block(ax - 1.2, 2.4, ax + 1.2, 6.8 + d);
    else if (mode === 'fwd') block(ax - 1.2 - s * 1, 8.4 + d, ax + 1.2 - s * 1, 11 + d);
    else if (mode === 'out') block(ax - 1.4 + s * 0.4, 6.4 + d, ax + 1.4 + s * 0.4, 8.8 + d);
    else block(ax - 1.2, 6.6 + d, ax + 1.2, 11.4 + d); };
  c.part('arm'); arm(-1, p === 'e' ? 'up' : p === 'f' ? 'fwd' : p === 'b' ? 'out' : 'down'); c.part('arm'); arm(1, p === 'f' ? 'fwd' : p === 'b' ? 'out' : 'down');
  c.part('body'); const hy = (p === 'a' ? 2.4 : 3) + d; c.rect(7.6, hy + 2.6, 8.4, hy + 3.2, 'K'); // neck peg
  c.poly([[6.2, hy + 2.6], [6.2, hy], [7.2, hy - 1], [9.8, hy - 1], [9.8, hy + 2.6]], 'M'); // chamfered head block
  return { head: [8, hy + 0.8, 1.8, 1.8], eyes: [[7.2, hy + 0.8], [8.8, hy + 0.8]], mouth: [8, hy + 2], back: [8, 6.6 + d], tail: [8, 12.4], ground: 15, construct: true, noMouth: true };
});
def('multi_bodied', 'Multi-bodied', 'Coherent connected or orbiting masses', { view: 'front', grounded: false }, (c, v) => {
  // One lead mass with eyes and two or three separate satellite masses spaced well apart, joined only by thin tethers, so open
  // space shows between every mass. Poses rearrange the orbit; the creature never merges into a single blob.
  const p = v('n', 'a', 'b', 'f', 'e');
  const sets = { // centres at least r1 + r2 + 3 px apart, so background shows between every pair of masses after outlining
    n: [[8, 10.4, 2.5], [2.8, 5, 1.7], [13.2, 5.8, 1.7]],
    a: [[8, 6.4, 2.4], [2.6, 12, 1.6], [13.4, 12, 1.6], [8, 1.6, 0.9]],
    b: [[8, 11.6, 2.6], [2.6, 8.4, 1.7], [13.4, 8.4, 1.7]],
    f: [[4.4, 9.4, 2.5], [10.2, 5.4, 1.6], [13.2, 11.8, 1.5]],
    e: [[8, 8.4, 2.4], [2.6, 3.2, 1.5], [13.4, 3.2, 1.5], [2.8, 13.2, 1.3], [13.2, 13.2, 1.3]],
  }[p];
  const [m, ...sat] = sets;
  sat.forEach(([x, y], i) => { const from = p === 'f' && i === 1 ? sat[0] : m; c.capsule(from[0], from[1], x, y, 0.32, 'K'); }); // tethers
  c.ellipse(m[0], m[1], m[2], m[2] * 0.95, 'M'); c.ellipse(m[0], m[1] + m[2] * 0.5, m[2] * 0.55, m[2] * 0.35, 'B');
  sat.forEach(([x, y, r]) => c.ellipse(x, y, r, r, 'A'));
  return { head: [m[0], m[1], m[2], m[2]], eyes: [[m[0] - 0.9, m[1] - 0.2], [m[0] + 0.9, m[1] - 0.2]], mouth: [m[0], m[1] + 1.2], back: [m[0], m[1] - m[2]], tail: sat[sat.length - 1], ground: 15, floating: true, multi: true, satellites: sat.length };
});
export const STRUCTURES = Object.freeze(S);
export const STRUCTURE_IDS = Object.freeze(Object.keys(S));

// ---------------------------------------------------------------- proportion controls
// Bounded presets. Each control names the anatomy it needs; a structure that does not draw that part rejects it with a diagnostic.
// Values map to part transforms (see canvas) or to anatomy drawn after the structure (back, belly, feet). The first value listed
// is the default and reproduces the approved structure exactly.
export const CONTROLS = Object.freeze({
  headSize: { needs: 'head', values: { medium: 1, small: 0.85, large: 1.18 } },
  headShape: { needs: 'head', values: { rounded: 'rounded', wedge: 'wedge', long_snouted: 'long_snouted', beaked: 'beaked', broad_jawed: 'broad_jawed', flattened: 'flattened' } },
  headPlacement: { needs: 'head', values: { normal: 0, high: -1, low: 1 } },
  muzzleLength: { needs: 'head', values: { none: 'none', short: 'short', long: 'long' } },
  neckLength: { needs: 'neck', values: { normal: 1, short: 0.7, long: 1.3 } },
  torsoLength: { needs: 'torso', values: { normal: 1, short: 0.85, long: 1.15 } },
  torsoWidth: { needs: 'torso', values: { normal: 1, narrow: 0.85, wide: 1.15 } },
  backProfile: { needs: 'torso', values: { plain: 'plain', humped: 'humped', arched: 'arched' } },
  bellyProfile: { needs: 'torso', values: { plain: 'plain', round: 'round' } },
  limbLength: { needs: 'leg', values: { normal: 0, short: 1.2, long: -1.2 } },
  limbThickness: { needs: ['leg', 'arm'], values: { normal: 1, thin: 0.75, thick: 1.35 } },
  stanceWidth: { needs: 'leg', values: { normal: 0, narrow: -0.8, wide: 0.8 } },
  footShape: { needs: 'leg', values: { plain: 'plain', paw: 'paw', hoof: 'hoof', flat: 'flat' } },
  tailLength: { needs: 'tail', values: { normal: 1, short: 0.7, long: 1.3 } },
  tailThickness: { needs: 'tail', values: { normal: 1, thin: 0.75, thick: 1.35 } },
  tailCurve: { needs: 'tailFeature', values: { straight: 'straight', curled: 'curled', raised: 'raised' } },
  wingSpan: { needs: 'wing', values: { normal: 1, narrow: 0.85, wide: 1.15 } },
  wingFold: { needs: 'wingFeatureOnly', values: { open: 'open', folded: 'folded' } },
  shellShape: { needs: 'shell', values: { smooth: 'smooth', ridged: 'ridged', angular: 'angular' } },
});
export const HEAD_SHAPES = Object.freeze(Object.keys(CONTROLS.headShape.values));
/** The part transform for a proportions object (unknown names/values are rejected earlier by recipeProblems). */
function controlTransform(pr = {}, view = 'front') {
  const val = (k) => CONTROLS[k].values[pr[k] ?? Object.keys(CONTROLS[k].values)[0]];
  const side = view === 'side';
  return { lift: val('limbLength'), head: val('headSize'), headDy: val('headPlacement'), neck: val('neckLength'),
    torsoX: side ? val('torsoLength') : val('torsoWidth'), torsoY: side ? val('torsoWidth') : val('torsoLength'),
    stance: val('stanceWidth'), thick: val('limbThickness'), wing: val('wingSpan'), tail: val('tailLength'), tailThick: val('tailThickness'),
    headShape: val('headShape'), muzzle: val('muzzleLength'), shell: val('shellShape'), back: val('backProfile'), belly: val('bellyProfile'), foot: val('footShape'),
    tailCurve: pr.tailCurve, wingFold: pr.wingFold };
}
/** Anatomy a control adds after the structure is drawn: back profile, belly profile and feet. */
function drawAfterControls(c, a, st) {
  const X = c.xf; const dir = st.view === 'side' ? (a.faceRight ? 1 : -1) : 0;
  if (X.back !== 'plain' && a.back) { const [bx, by] = a.back; c.part('torso', bx, by + 2);
    if (X.back === 'humped') c.ellipse(bx - dir * 0.6, by + 0.6, 1.9, 1.5, 'M'); else c.capsule(bx - 2.2, by + 1, bx + 2.2, by + 1, 0.9, 'M'); c.part('body'); }
  if (X.belly === 'round' && a.belly) { const [ux, uy] = a.belly; c.ellipse(ux, uy, 2.2, 1.3, 'M'); c.ellipse(ux, uy + 0.1, 1.6, 0.8, 'B'); }
  if (X.foot !== 'plain') { const seen = []; for (const [fx] of c.feet) { if (seen.some((x) => Math.abs(x - fx) < 1)) continue; seen.push(fx);
    const out = dir || Math.sign(fx - 8) || 1;
    if (X.foot === 'paw') c.ellipse(fx, 14.9, 1, 0.65, 'M');
    else if (X.foot === 'hoof') c.rect(fx - 0.5, 15, fx + 0.5, 15, 'K');
    else c.capsule(fx, 15, fx + out * 1.3, 15, 0.45, 'M'); } }
}

// ---------------------------------------------------------------- eyes and finishing
function drawEyes(c, a, recipe) {
  const shape = recipe.eyes === 'none' ? 'none' : a.eyeShape || 'round'; if (shape === 'none') return;
  c.part('abs');
  for (const [x, y] of a.eyes || []) {
    if (shape === 'sleepy') { c.rect(x - 0.5, y, x + 0.5, y, 'K'); continue; }
    if (shape === 'narrow') { c.rect(x - 0.5, y, x + 0.5, y, 'E'); continue; }
    if (shape === 'large') { c.rect(x - 0.5, y - 0.5, x + 0.5, y + 0.5, 'E'); c.px(x - 0.5, y - 0.5, 'H'); continue; }
    if (a.smallEyes || a.eyes.length > 2) { c.px(x, y, 'E'); continue; }
    if (a.stalkEyes) { c.ellipse(x, y, 0.8, 0.8, 'W'); c.px(x, y, 'E'); continue; }
    if (a.bulgeEyes) { c.ellipse(x, y, 1, 0.9, 'W'); c.px(x - 0.4, y, 'E'); continue; }
    c.px(x, y, 'E'); c.px(x - 0.6, y - 0.6, 'H');
  }
  c.part('body');
}

/** Anchors follow the anatomy they belong to: head, eyes and mouth move with the head; back and belly with the torso. */
function mapAnchors(c, a) {
  const m = { ...a };
  if (a.head) { const [x, y] = c.map('head', a.head[0], a.head[1]); m.head = [x, y, a.head[2] * c.xf.head, a.head[3] * c.xf.head]; }
  if (a.eyes) m.eyes = a.eyes.map(([x, y]) => c.map('head', x, y)); if (a.mouth) m.mouth = c.map('head', ...a.mouth);
  if (a.back) m.back = c.map('torso', a.back[0], a.back[1]);
  if (c.origins.tail) m.tail = c.map('tail', ...c.origins.tail);
  m.belly = a.belly ? c.map('torso', ...a.belly) : c.torsoOrigin ? c.map('torso', c.torsoOrigin[0], c.torsoOrigin[1] + 1.8) : null; m.feet = c.feet.slice(); m.parts = [...c.used];
  return m;
}
/** Hook for features, face and markings (installed by sprite-features.js). */
let finishRecipe = () => {};
export function installFinisher(fn) { finishRecipe = fn; }
/** The game's shading/outline pass (installed by sprite16.js), so diagnostics judge visibility on the pixels the player sees. */
let finishPixels = (g) => g;
export function installPixelFinish(fn) { finishPixels = fn; }
/** Which anatomy a structure draws in a pose (head, neck, torso, leg, arm, tail, wing, plus built-in flags). */
const partCache = new Map();
export function structureParts(structure, pose = 'neutral') {
  const key = `${structure}/${pose}`; if (partCache.has(key)) return partCache.get(key);
  const st = S[structure]; const c = canvas(1, { view: st.view }); const a = st.paint(c, (...vals) => vals[POSES.indexOf(pose)]) || {};
  const parts = new Set(c.used); if (a.shell) parts.add('shell'); if (a.beak) parts.add('beak'); if (a.pincers) parts.add('pincers'); if (a.antennae) parts.add('antennae');
  const r = { parts, anchors: a, view: st.view }; partCache.set(key, r); return r;
}
let featureCompat = () => [];
let builtInConfig = () => ({});
export function installBuiltInConfig(fn) { builtInConfig = fn; }
export function installFeatureCompat(fn) { featureCompat = fn; }
function compatibilityProblems(recipe) {
  const out = []; const pose = recipe.pose || 'neutral'; const { parts } = structureParts(recipe.structure, pose); const name = S[recipe.structure].name;
  const feats = recipe.features || []; const has = (n) => parts.has(n);
  for (const [k, val] of Object.entries(recipe.proportions || {})) {
    if (val === Object.keys(CONTROLS[k].values)[0]) continue; // the default is always accepted
    const needs = [].concat(CONTROLS[k].needs);
    const ok = needs.some((n) => n === 'wingFeatureOnly' ? feats.some((f) => String(f.id || f).includes('wings')) : n === 'tailFeature' ? feats.some((f) => String(f.id || f).includes('tail')) : n === 'wingFeature' ? feats.some((f) => String(f.id || f).includes('wings')) || has('wing')
      : n === 'tail' ? has('tail') || feats.some((f) => String(f.id || f).includes('tail')) : n === 'wing' ? has('wing') || feats.some((f) => String(f.id || f).includes('wings')) : n === 'shell' ? has('shell') || feats.some((f) => (f.id || f) === 'shell') : has(n));
    if (!ok) out.push(`proportion ${k}=${val} is not supported by ${name} (${pose}): it needs ${needs.map((n) => ({ tailFeature: 'a tail feature', wingFeature: 'a wing feature or built-in wings', wingFeatureOnly: 'a wing feature', leg: 'legs', arm: 'arms' }[n] || `a ${n}`)).join(' or ')}`);
    if (k === 'headShape' && val === 'beaked' && has('beak')) out.push(`proportion headShape=beaked: ${name} already has a built-in beak; use the beak feature to configure it`);
  }
  out.push(...featureCompat(recipe, parts));
  return out;
}

/** Every reason a recipe cannot be drawn by this path (empty when it can). Unknown fields are reported, never ignored. */
export const RECIPE_FIELDS = Object.freeze(['structure', 'pose', 'size', 'colors', 'mirror', 'eyes', 'id', 'name', 'gen', 'proportions', 'features', 'face', 'markings']);
export function recipeProblems(recipe) {
  const p = [];
  if (!recipe || typeof recipe !== 'object') return ['recipe must be an object'];
  if (!S[recipe.structure]) p.push(`unknown structure "${recipe.structure}" (known: ${STRUCTURE_IDS.join(', ')})`);
  if (recipe.pose != null && !POSES.includes(recipe.pose)) p.push(`unknown pose "${recipe.pose}" (known: ${POSES.join(', ')})`);
  if (recipe.size != null && !(recipe.size in SIZES)) p.push(`unknown size "${recipe.size}" (known: ${Object.keys(SIZES).join(', ')})`);
  if (recipe.colors != null && !(Array.isArray(recipe.colors) && recipe.colors.length === 2 && recipe.colors.every((x) => /^#[0-9a-f]{6}$/i.test(x)))) p.push('colors must be two #rrggbb values');
  if (recipe.eyes != null && !['default', 'none'].includes(recipe.eyes)) p.push(`unknown eyes "${recipe.eyes}"`);
  for (const k of Object.keys(recipe)) if (!RECIPE_FIELDS.includes(k)) p.push(`unknown recipe field "${k}" (this generator version accepts: ${RECIPE_FIELDS.join(', ')})`);
  if (recipe.proportions != null) {
    if (typeof recipe.proportions !== 'object') p.push('proportions must be an object');
    else for (const [k, val] of Object.entries(recipe.proportions)) {
      if (!CONTROLS[k]) { p.push(`unknown proportion control "${k}" (known: ${Object.keys(CONTROLS).join(', ')})`); continue; }
      if (!(val in CONTROLS[k].values)) p.push(`proportion ${k}: unknown value "${val}" (known: ${Object.keys(CONTROLS[k].values).join(', ')})`);
    }
  }
  if (!p.length && S[recipe.structure]) p.push(...compatibilityProblems(recipe));
  return p;
}

/** The 16×16 code grid for a v2 recipe, before shading. Throws with the diagnostics when the recipe is invalid. */
export function structureGrid(recipe) {
  const problems = recipeProblems(recipe); if (problems.length) throw Object.assign(new Error(`sprite recipe: ${problems.join('; ')}`), { problems });
  const st = S[recipe.structure]; const pose = POSES.indexOf(recipe.pose || 'neutral');
  const v = (...vals) => vals[pose];
  // Fit: the largest base scale (≤ 1, in 0.04 steps) whose drawing keeps a free column on each side and a free top row, so the
  // outline survives on every edge; the size control then shrinks from that. Deterministic: the same recipe always fits the same way.
  const xf = { ...controlTransform(recipe.proportions, st.view), ...builtInConfig(recipe) };
  const feats = (recipe.features || []).map((f) => (typeof f === 'string' ? f : f.id));
  const skip = new Set([...(feats.some((f) => /_tail$/.test(f)) ? ['tail'] : []), ...(feats.some((f) => /_wings$/.test(f)) && recipe.structure !== 'batlike' ? ['wing'] : [])]); // a tail or wing feature replaces the built-in one
  const draw = (scale) => { const c = canvas(scale, { xf, view: st.view, skip }); const raw = st.paint(c, v) || {}; const a = mapAnchors(c, raw); drawAfterControls(c, a, st); finishRecipe(c, a, recipe, st); drawEyes(c, a, recipe); return { c, a }; };
  const clipped = (g) => g[0].some(Boolean) || g.some((r) => r[0] || r[15]);
  let base = 1; while (base > 0.7 && clipped(draw(base).c.g)) base = Math.round((base - 0.04) * 100) / 100;
  const { c, a } = draw(base * SIZES[recipe.size || 'large']); a.fit = base;
  if (recipe.mirror) for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) c.g[y][15 - x] = c.g[y][x];
  return { grid: c.g, anchors: a };
}

/**
 * Full diagnostics for a recipe: the static problems, then a render check that every non-default control and every feature
 * actually changes the pixels (an occluded or nominal choice is reported, never credited as visible diversity).
 */
export function recipeDiagnostics(recipe, { render } = {}) {
  const problems = recipeProblems(recipe); if (problems.length) return { ok: false, problems, invisible: [] };
  // Removing a feature can strand a control that shapes it (tailCurve, wingFold); the comparison render then drops those too.
  const draw = render || ((x) => finishPixels(structureGrid(x).grid));
  const grid = (r) => { if (recipeProblems(r).length && r.proportions) { const pr = { ...r.proportions }; delete pr.tailCurve; delete pr.wingFold; r = { ...r, proportions: pr }; } return JSON.stringify(draw(r)); };
  const full = grid(recipe); const invisible = [];
  for (const [k, val] of Object.entries(recipe.proportions || {})) {
    if (val === Object.keys(CONTROLS[k].values)[0]) continue;
    const pr = { ...recipe.proportions }; delete pr[k];
    if (grid({ ...recipe, proportions: pr }) === full) invisible.push(`proportion ${k}=${val} changes no pixel on ${S[recipe.structure].name} (${recipe.pose || 'neutral'})`);
  }
  (recipe.features || []).forEach((f, i) => { const rest = recipe.features.filter((_, j) => j !== i);
    if (grid({ ...recipe, features: rest }) === full) invisible.push(`feature ${f.id || f}${f.variant ? `/${f.variant}` : ''} changes no pixel on ${S[recipe.structure].name} (${recipe.pose || 'neutral'}): it is hidden or occluded`); });
  for (const k of ['face', 'markings']) if (recipe[k] && Object.keys(recipe[k]).length) { const r = { ...recipe }; delete r[k]; if (grid(r) === full) invisible.push(`${k} ${JSON.stringify(recipe[k])} changes no pixel`); }
  const fit = structureGrid(recipe).anchors.fit; const warnings = fit < 0.88 ? [`design fits the frame only at ${Math.round(fit * 100)}% scale: a feature or control reaches past the frame, so the whole sprite shrinks`] : [];
  return { ok: !invisible.length && !warnings.length, problems: [], invisible, warnings, fit };
}
