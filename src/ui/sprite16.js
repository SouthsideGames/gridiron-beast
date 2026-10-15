// 16×16 pixel monsters built from a design spec (see src/data/species.js):
// a BODY TEMPLATE (biped, quadruped, serpent, avian, blob, insectoid, shelled),
// a SIZE, a LOOK (cute / cool / fierce changes the silhouette), FEATURE
// overlays, an optional PATTERN (stripes, spots, mask, band, backstripe) and two colours. The builder paints shapes on a
// grid, then shades (light from above) and outlines automatically, so a new
// species only needs a spec line, not hand-drawn art.
//
// Grid cell codes: 0 empty, M main, B belly, A accent, G glow, W bone/white,
// E eye, H eye highlight, K dark detail. Shading turns M/A into light/shade
// variants; the outline pass rings everything in a dark tone of the main colour.

const W = 16, H = 16;
const SCALE = { small: 0.78, medium: 0.9, large: 1 };
const FRONT = new Set(['biped', 'blob', 'avian', 'insectoid']); // drawn facing the viewer, mirrored

// ---------------------------------------------------------------- colour helpers
function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [h, s * 100, l * 100];
}
const hsl = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(Math.max(0, Math.min(100, s)))}% ${Math.round(Math.max(0, Math.min(100, l)))}%)`;
const shift = (hex, dl, ds = 0, tint = 0) => { const [h, s, l] = hexToHsl(hex); return hsl(h, s + ds, l + dl + tint); };

export function palette(colors, tint = 0) {
  const [main, accent] = colors;
  const [, , lm] = hexToHsl(main);
  return {
    O: shift(main, -Math.min(lm - 8, 34), 5, tint * 0.5), // outline
    M: shift(main, 0, 0, tint), Ml: shift(main, 13, -4, tint), Md: shift(main, -14, 2, tint),
    B: shift(main, Math.max(18, (80 - lm) * 0.6), -18, tint),
    A: shift(accent, 0, 0, tint), Al: shift(accent, 14, -4, tint), Ad: shift(accent, -16, 0, tint),
    G: shift(accent, 22, 10), W: '#efe8d6', Wd: '#c9bfa8', E: '#10131a', H: '#ffffff', K: shift(main, -30),
  };
}

// ---------------------------------------------------------------- canvas
function makeCanvas(scale) {
  const g = Array.from({ length: H }, () => Array(W).fill(0));
  // Shapes are authored on a 16×16 large-size frame and scaled toward the
  // bottom-centre anchor (8, 15.5) for smaller monsters.
  const tx = (x) => 8 + (x - 8) * scale, ty = (y) => 15.5 + (y - 15.5) * scale;
  const set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
  const api = {
    g, scale, tx, ty, set,
    ellipse(cx, cy, rx, ry, c, { keep = false } = {}) {
      const X = tx(cx), Y = ty(cy), RX = Math.max(0.6, rx * scale), RY = Math.max(0.6, ry * scale);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const dx = (x + 0.5 - X) / RX, dy = (y + 0.5 - Y) / RY;
        if (dx * dx + dy * dy <= 1 && (!keep || !g[y][x])) g[y][x] = c;
      }
    },
    rect(x0, y0, x1, y1, c) { // inclusive authored coords
      const X0 = Math.round(tx(x0)), X1 = Math.round(tx(x1 + 1)) - 1, Y0 = Math.round(ty(y0)), Y1 = Math.round(ty(y1 + 1)) - 1;
      for (let y = Y0; y <= Math.max(Y0, Y1); y++) for (let x = X0; x <= Math.max(X0, X1); x++) set(x, y, c);
    },
    tri(x0, y0, x1, y1, x2, y2, c) { // filled triangle, authored coords
      const P = [[tx(x0), ty(y0)], [tx(x1), ty(y1)], [tx(x2), ty(y2)]];
      const sgn = (p, a, b) => (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const p = [x + 0.5, y + 0.5], d1 = sgn(p, P[0], P[1]), d2 = sgn(p, P[1], P[2]), d3 = sgn(p, P[2], P[0]);
        if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) g[y][x] = c;
      }
    },
    px(x, y, c) { set(Math.round(tx(x + 0.5) - 0.5), Math.round(ty(y + 0.5) - 0.5), c); },
  };
  return api;
}

// ---------------------------------------------------------------- body templates
// Each returns anchors used by features and eyes. Authored at large size.
const TEMPLATES = {
  biped(c, big = 1, look = 'cool') {
    const fierce = look === 'fierce';
    c.rect(5, 13, 6, 15, 'M'); c.rect(9, 13, 10, 15, 'M');
    if (fierce) { c.ellipse(8, 10.2, 4.6, 3.4, 'M'); c.ellipse(8, 8.6, 5.2, 1.4, 'M'); } else c.ellipse(8, 10.5, look === 'cute' ? 4.2 : 3.8, look === 'cute' ? 3.6 : 3.2, 'M');
    c.ellipse(8, 11, 2.2, 2.2, 'B');
    c.ellipse(fierce ? 2.8 : 3.6, 10.2, fierce ? 1.5 : 1.2, fierce ? 2.4 : 1.8, 'M'); c.ellipse(fierce ? 13.2 : 12.4, 10.2, fierce ? 1.5 : 1.2, fierce ? 2.4 : 1.8, 'M');
    c.ellipse(8, 5.6, 3.6 * big, 3.1 * big, 'M');
    return { head: [8, 5.6, 3.6 * big, 3.1 * big], eyeY: 5.4, eyeDx: 1.6, mouth: [8, 7.2], hands: fierce ? [[2.6, 12.4], [13.4, 12.4]] : [[3.4, 11.6], [12.4, 11.6]], feet: [[5, 15], [10, 15]], back: [8, 8], tail: [12.5, 13], belly: [8, 11] };
  },
  blob(c) {
    c.ellipse(8, 10.4, 5.6, 4.8, 'M'); c.ellipse(8, 12, 3, 2.4, 'B');
    c.rect(4, 14, 5, 15, 'M'); c.rect(10, 14, 11, 15, 'M');
    return { head: [8, 8, 5.2, 4.2], eyeY: 8.6, eyeDx: 2, mouth: [8, 10.6], hands: [[2.8, 11.5], [13.2, 11.5]], feet: [[4, 15], [11, 15]], back: [8, 6], tail: [13, 13], belly: [8, 12] };
  },
  avian(c) {
    c.rect(6, 14, 6, 15, 'A'); c.rect(9, 14, 9, 15, 'A');
    c.ellipse(8, 10.6, 3.9, 3.8, 'M'); c.ellipse(8, 11.4, 2.3, 2.5, 'B');
    c.ellipse(8, 5.4, 3.1, 2.8, 'M');
    return { head: [8, 5.4, 3.1, 2.8], eyeY: 5, eyeDx: 1.4, mouth: [8, 6.6], hands: [[4.2, 12], [11.8, 12]], feet: [[6, 15], [9, 15]], back: [8, 9], tail: [8, 15], belly: [8, 11.4], avian: true };
  },
  insectoid(c) {
    c.ellipse(8, 11.4, 2.6, 3.2, 'M'); c.ellipse(8, 12, 1.4, 1.8, 'B');
    c.rect(5, 14, 5, 15, 'K'); c.rect(10, 14, 10, 15, 'K');
    c.ellipse(8, 6.4, 3.2, 2.7, 'M');
    return { head: [8, 6.4, 3.2, 2.7], eyeY: 6.2, eyeDx: 1.5, mouth: [8, 8], hands: [[5, 11], [11, 11]], feet: [[5, 15], [10, 15]], back: [8, 10], tail: [8, 15], belly: [8, 12] };
  },
  quadruped(c, big = 1, look = 'cool') { // side view facing left
    const fierce = look === 'fierce', cute = look === 'cute';
    c.rect(5, 12, 6, 15, 'Md'); c.rect(11, 12, 12, 15, 'Md');
    if (fierce) { c.ellipse(9.4, 10.2, 4.8, 3.1, 'M'); c.ellipse(10.6, 8.4, 2.6, 1.6, 'M'); } else c.ellipse(9.2, 10.4, 4.6, 2.9, 'M');
    c.ellipse(9, 11.8, 3, 1.3, 'B');
    c.rect(4, 12, 5, 15, 'M'); c.rect(10, 12, 11, 15, 'M');
    const hx = fierce ? 4.2 : 4.6, hy = fierce ? 8 : cute ? 6.8 : 7.2, hrx = (fierce ? 3.6 : cute ? 3 : 3.2) * big, hry = (fierce ? 2.3 : cute ? 3 : 2.8) * big;
    c.ellipse(hx, hy, hrx, hry, 'M'); c.ellipse(hx - hrx * 0.7, hy + 1.2, 1.5, 1.1, 'B');
    return { head: [hx, hy, hrx, hry], side: true, eyeX: hx - 1, eyeY: hy - 0.4, mouth: [hx - hrx + 0.6, hy + 1.4], hands: [[4, 15], [10, 15]], feet: [[4, 15], [10, 15]], back: [10, fierce ? 7 : 7.6], tail: [13.6, 9.4], belly: [9, 11.8] };
  },
  serpent(c) { // coiled, head raised, facing left
    c.ellipse(9, 12.6, 5.6, 2.6, 'M'); c.ellipse(9, 13.4, 3.6, 1.3, 'B');
    c.ellipse(10.5, 10.6, 3.2, 1.8, 'M');
    c.ellipse(6.6, 8.6, 1.9, 3.4, 'M'); c.ellipse(6.2, 9.2, 0.9, 2.4, 'B');
    c.ellipse(5.4, 4.8, 3.3, 2.3, 'M');
    return { head: [5.4, 4.8, 3.3, 2.3], side: true, eyeX: 4.4, eyeY: 4.4, mouth: [2.4, 5.8], hands: [], feet: [], back: [7.6, 6.6], tail: [14, 12], belly: [9, 13.4] };
  },
  shelled(c) { // side view facing left, domed shell
    c.rect(5, 13, 6, 15, 'Md'); c.rect(11, 13, 12, 15, 'Md');
    c.ellipse(9.4, 10.4, 5.2, 4.2, 'A'); c.rect(4.8, 12, 14, 13, 'B');
    c.px(8, 8, 'Ad'); c.px(11, 9, 'Ad'); c.px(9, 11, 'Ad'); c.px(12, 11, 'Ad'); c.px(7, 10, 'Ad');
    c.ellipse(3.6, 10.2, 2.6, 2.3, 'M');
    return { head: [3.6, 10.2, 2.6, 2.3], side: true, eyeX: 2.8, eyeY: 9.6, mouth: [1.4, 11], hands: [[1.5, 12.2], [1.5, 12.2]], feet: [[5, 15], [11, 15]], back: [9.4, 6.4], tail: [14.4, 12], belly: [9, 12.5], shell: true };
  },
};

// ---------------------------------------------------------------- features
// "behind" features paint before the body; the rest paint after.
const BEHIND = new Set(['wings', 'mane', 'tail', 'flametail', 'halo', 'fins_back']);

function featureBehind(c, f, a, body) {
  const [hx, hy, hrx, hry] = a.head;
  if (f === 'wings') {
    if (a.side) { c.ellipse(a.back[0] + 1, a.back[1] - 1.6, 3.2, 2, 'A'); c.tri(a.back[0] - 1, a.back[1] - 1, a.back[0] + 5, a.back[1] - 5, a.back[0] + 3.5, a.back[1], 'A'); }
    else if (body === 'insectoid') { for (const s of [-1, 1]) { c.ellipse(8 + s * 4.6, 8.6, 2.6, 3.6, 'G'); c.ellipse(8 + s * 4.4, 12.4, 1.8, 1.8, 'G'); } }
    else { for (const s of [-1, 1]) { c.ellipse(8 + s * 5, 9.4, 2, 3.6, 'A'); c.tri(8 + s * 3, 7, 8 + s * 7.6, 5, 8 + s * 6.8, 11, 'A'); } }
  } else if (f === 'mane') {
    if (a.side) c.ellipse(hx + 1.6, hy, hrx + 0.6, hry + 1.2, 'A');
    else c.ellipse(hx, hy + 0.6, hrx + 1.4, hry + 1.3, 'A');
  } else if (f === 'tail' || f === 'flametail') {
    const [tx, ty] = a.tail; const col = f === 'flametail' ? 'G' : 'M';
    if (a.side) {
      c.ellipse(tx, ty, 1.8, 0.9, col); c.ellipse(tx + 1.3, ty - 1.3, 0.9, 1.3, col);
      if (f === 'flametail') { c.ellipse(tx + 1.4, ty - 2.4, 1.2, 1.6, 'G'); c.ellipse(tx + 1.4, ty - 2.2, 0.6, 0.9, 'A'); }
    }
    else { c.ellipse(13, 12.6, 1.4, 1.1, col); c.ellipse(14, 11, 0.9, 1.4, f === 'flametail' ? 'A' : col); }
  } else if (f === 'halo') {
    c.ellipse(hx + (a.side ? 0.6 : 0), hy - hry - 1.2, hrx * 0.8, 0.9, 'G');
  }
}

function featureFront(c, f, a, body) {
  const [hx, hy, hrx, hry] = a.head; const top = hy - hry;
  const sides = a.side ? [1] : [-1, 1];
  switch (f) {
    case 'ears':
      if (a.side) c.tri(hx + 0.4, top + 1.2, hx + 2.6, top - 2, hx + 2.6, top + 1.6, 'M');
      else for (const s of sides) { c.tri(hx + s * (hrx - 2.4), top + 1, hx + s * (hrx + 0.2), top - 2, hx + s * (hrx + 0.2), top + 1.6, 'M'); c.px(hx + s * (hrx - 0.4) - 0.5, top - 0.2, 'B'); }
      break;
    case 'horns':
      if (a.side) c.tri(hx, top + 0.6, hx + 3.6, top - 2.4, hx + 1.6, top + 1, 'W');
      else for (const s of sides) c.tri(hx + s * 1.2, top + 0.8, hx + s * 3.6, top - 2.4, hx + s * 2.6, top + 1.2, 'W');
      break;
    case 'horn':
      if (a.side) c.tri(hx - 1.6, top + 0.8, hx - 3.2, top - 2.4, hx - 0.4, top + 0.4, 'W');
      else c.tri(hx - 0.9, top + 0.8, hx, top - 2.8, hx + 0.9, top + 0.8, 'W');
      break;
    case 'crest':
      if (a.side) { c.tri(hx - 0.4, top + 0.6, hx + 1.4, top - 2.6, hx + 2.8, top + 0.8, 'A'); }
      else c.tri(hx - 1.2, top + 0.8, hx, top - 2.4, hx + 1.2, top + 0.8, 'A');
      break;
    case 'crown':
      for (const dx of a.side ? [-0.5, 1, 2.5] : [-1.6, 0, 1.6]) c.rect(hx + dx - 0.5, top - 1.2, hx + dx - 0.5, top, 'G');
      c.rect(hx - (a.side ? 1 : 2), top - 0.2, hx + (a.side ? 2.5 : 1.6), top, 'G');
      break;
    case 'antennae':
      for (const s of sides) { const x = hx + s * 1.4 + (a.side ? 1 : 0); c.rect(x, top - 2, x, top, 'K'); c.px(x + s * 0.8, top - 2.6, 'G'); }
      break;
    case 'spikes':
      if (a.side) for (let i = 0; i < 3; i++) { const x = a.back[0] - 2 + i * 2.2; c.tri(x - 0.9, a.back[1] + 1.4, x, a.back[1] - 1, x + 0.9, a.back[1] + 1.4, 'A'); }
      else for (const s of sides) { c.tri(8 + s * 3.2, 8.4, 8 + s * 5, 6.6, 8 + s * 4.6, 9.4, 'A'); }
      break;
    case 'fins':
      if (a.side) c.tri(a.back[0] - 1.6, a.back[1] + 1.6, a.back[0] + 0.6, a.back[1] - 2.4, a.back[0] + 2.2, a.back[1] + 1.8, 'A');
      else for (const s of sides) c.tri(hx + s * (hrx - 0.4), hy - 0.8, hx + s * (hrx + 2), hy - 2, hx + s * (hrx + 1), hy + 1.2, 'A');
      break;
    case 'claws':
      for (const [x, y] of a.hands.length ? a.hands : a.feet) { c.px(x - 0.5, y, 'W'); c.px(x + 0.5, y, 'W'); }
      break;
    case 'plates':
      if (a.shell) break;
      for (let i = -1; i <= 1; i++) c.rect(a.belly[0] - 1 + (a.side ? i * 2 : 0) + (a.side ? 0.5 : 0), a.belly[1] + (a.side ? 0 : i * 1.4) - 0.3, a.belly[0] + (a.side ? i * 2 + 0.5 : 0.6), a.belly[1] + (a.side ? 0 : i * 1.4) - 0.3, 'Ad');
      break;
    case 'glow':
      c.ellipse(a.belly[0], a.belly[1], 1.1, 1.1, 'G');
      break;
    case 'tusks':
      if (a.side) c.px(a.mouth[0], a.mouth[1] - 0.2, 'W');
      else { c.px(hx - 1.7, hy + 1.6, 'W'); c.px(hx + 1.2, hy + 1.6, 'W'); c.px(hx - 1.7, hy + 0.8, 'W'); c.px(hx + 1.2, hy + 0.8, 'W'); }
      break;
    case 'beak':
      if (a.side) c.tri(hx - hrx + 0.6, hy - 0.2, hx - hrx - 1.8, hy + 0.6, hx - hrx + 0.6, hy + 1.4, 'A');
      else c.tri(hx - 1, hy + 0.6, hx, hy + 2.2, hx + 1, hy + 0.6, 'A');
      break;
    case 'fangs':
      if (a.side) { c.px(a.mouth[0] + 0.4, a.mouth[1] + 0.4, 'W'); c.px(a.mouth[0] + 1.6, a.mouth[1] + 0.4, 'W'); }
      else { c.px(hx - 1.2, hy + hry - 0.6, 'W'); c.px(hx + 0.6, hy + hry - 0.6, 'W'); }
      break;
    case 'whiskers':
      if (a.side) { c.rect(hx - hrx - 2, hy + 0.4, hx - hrx, hy + 0.4, 'W'); c.rect(hx - hrx - 1.6, hy + 1.4, hx - hrx, hy + 1.4, 'W'); }
      else for (const s of sides) { c.rect(hx + s * (hrx + 0.4), hy + 0.6, hx + s * (hrx + 2), hy + 0.6, 'W'); c.rect(hx + s * (hrx + 0.4), hy + 1.6, hx + s * (hrx + 1.6), hy + 1.6, 'W'); }
      break;
    case 'ridge': // a row of accent bumps down the spine
      if (a.side) for (let i = 0; i < 4; i++) c.px(a.back[0] - 2.5 + i * 1.6, a.back[1] - 0.6 - (i === 1 || i === 2 ? 0.6 : 0), 'A');
      else for (let i = 0; i < 3; i++) c.px(hx - 0.5, top - 0.4 - i * 0.9 + 0.9, 'A');
      break;
    case 'collar': // fur or scale ruff at the neck
      if (a.side) c.ellipse(hx + hrx - 0.4, hy + hry - 0.4, 1.6, 2.2, 'B');
      else c.ellipse(hx, hy + hry + 0.4, hrx + 0.6, 1.3, 'B');
      break;
    case 'bulb': // glowing lure or bulb above the head
      c.rect(hx - 0.5 + (a.side ? -0.8 : 0), top - 2.2, hx - 0.5 + (a.side ? -0.8 : 0), top, 'K'); c.ellipse(hx + (a.side ? -0.8 : 0), top - 2.8, 1.1, 1.1, 'G');
      break;
    case 'shell':
      if (a.shell) break;
      c.ellipse(a.back[0] + (a.side ? 0 : 0), a.back[1] + 1.8, 3.4, 2.2, 'A');
      break;
    default: break;
  }
}

// ---------------------------------------------------------------- patterns
// Painted over the body's main-colour cells only, so overlays stay clean.
function pattern(c, kind, a) {
  const g = c.g; const onBody = (x, y) => g[y]?.[x] === 'M';
  const [hx, hy, hrx, hry] = a.head;
  if (kind === 'stripes') {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (onBody(x, y) && ((a.side ? x : y) + (a.side ? 0 : x > 7 ? 1 : 0)) % 3 === 0 && y > Math.round(c.ty(hy + hry) - 1)) g[y][x] = 'Ad';
  } else if (kind === 'spots') {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (onBody(x, y) && (x * 7 + y * 5) % 11 === 0) g[y][x] = 'Ad';
  } else if (kind === 'mask') {
    const X = c.tx(hx), Y = c.ty(a.eyeY ?? hy), RX = Math.max(1, hrx * c.scale * 0.9), RY = Math.max(1, hry * c.scale * 0.45);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = (x + 0.5 - X) / RX, dy = (y + 0.5 - Y) / RY; if (dx * dx + dy * dy <= 1 && (g[y][x] === 'M' || g[y][x] === 'B')) g[y][x] = 'K'; }
  } else if (kind === 'band') { // accent band across the middle of the body
    const Y = Math.round(c.ty(a.belly[1] - 1.2));
    for (let x = 0; x < W; x++) for (const y of [Y, Y + 1]) if (g[y]?.[x] === 'M' || g[y]?.[x] === 'B') g[y][x] = 'A';
  } else if (kind === 'backstripe') { // dark stripe along the spine (front: down the centre)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (onBody(x, y) && (a.side ? y === Math.round(c.ty(a.back[1]) + 1) : (x === 7 || x === 8))) g[y][x] = 'Md';
  }
}

// ---------------------------------------------------------------- eyes
function eyes(c, a, look) {
  if (a.side) {
    const x = a.eyeX, y = a.eyeY;
    if (look === 'cute') { c.rect(x - 0.5, y - 0.5, x + 0.5, y + 0.5, 'E'); c.px(x - 0.5, y - 0.5, 'H'); }
    else if (look === 'cool') { c.rect(x - 0.5, y, x + 0.5, y, 'E'); c.px(x - 0.5, y, 'H'); }
    else { c.px(x, y, 'E'); c.px(x - 0.6, y, 'G'); c.px(x - 1, y - 1, 'K'); c.px(x, y - 1, 'K'); }
    return;
  }
  // Left eye only; the mirror pass makes the right one.
  const x = 8 - a.eyeDx, y = a.eyeY;
  if (look === 'cute') { c.rect(x - 1, y - 1, x, y, 'E'); c.px(x - 1, y - 1, 'H'); }
  else if (look === 'cool') { c.rect(x - 1, y, x, y, 'E'); c.px(x - 1, y, 'H'); }
  else { c.px(x - 1, y, 'E'); c.px(x, y, 'G'); c.px(x, y - 1, 'K'); c.px(x - 1, y - 1, 'K'); c.px(x - 2, y - 1, 'K'); }
}

// ---------------------------------------------------------------- passes
function shadeAndOutline(g) {
  const out = g.map((r) => r.slice());
  const empty = (x, y) => x < 0 || y < 0 || x >= W || y >= H || !g[y][x];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = g[y][x]; if (v !== 'M' && v !== 'A') continue;
    if (empty(x, y - 1)) out[y][x] = v + 'l';
    else if (empty(x, y + 1) || empty(x + 1, y) && !empty(x - 1, y)) out[y][x] = v + 'd';
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x]) continue;
    if (!empty(x - 1, y) || !empty(x + 1, y) || !empty(x, y - 1) || !empty(x, y + 1)) out[y][x] = 'O';
  }
  return out;
}

/** Builds the 16×16 grid of colour codes for a species spec. */
export function spriteGrid(spec) {
  const body = TEMPLATES[spec.body] ? spec.body : 'biped';
  const c = makeCanvas(SCALE[spec.size] ?? 0.9);
  const feats = spec.features || [];
  // Dry run to get anchors (template is deterministic), then paint in layers.
  const big = spec.size === 'small' ? 1.15 : 1; // chibi heads on small monsters
  const look = spec.look || 'cool';
  const probe = makeCanvas(c.scale); const a = TEMPLATES[body](probe, big, look);
  const front = FRONT.has(body);
  const isTail = (f) => f === 'tail' || f === 'flametail';
  for (const f of feats) if (BEHIND.has(f) && !(front && isTail(f))) featureBehind(c, f, a, body);
  TEMPLATES[body](c, big, look);
  if (spec.pattern && spec.pattern !== 'none') pattern(c, spec.pattern, a);
  for (const f of feats) if (!BEHIND.has(f)) featureFront(c, f, a, body);
  eyes(c, a, spec.look || 'cool');
  if (front) {
    // Front-facing monsters are symmetric: mirror the left half, then add the
    // tail peeking out on one side (only into empty cells).
    for (let y = 0; y < H; y++) for (let x = 0; x < W / 2; x++) c.g[y][W - 1 - x] = c.g[y][x];
    const tails = feats.filter(isTail);
    if (tails.length) { const keep = c.g.map((r) => r.slice()); for (const f of tails) featureBehind(c, f, a, body); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (keep[y][x]) c.g[y][x] = keep[y][x]; }
  }
  return shadeAndOutline(c.g);
}

const cache = new Map();

/** Inline SVG for a species spec. `tint` (−6..6) nudges lightness per individual. */
export function sprite16(spec, size = 48, { tint = 0, flip = false, cls = 'sprite' } = {}) {
  const key = JSON.stringify([spec.id || spec.name, size, tint, flip, spec.body, spec.size, spec.look, spec.features, spec.colors, spec.pattern || '']);
  if (cache.has(key)) return cache.get(key);
  const pal = palette(spec.colors || ['#888888', '#cccccc'], tint);
  const grid = spriteGrid(spec);
  let rects = '';
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) { // merge horizontal runs to keep the SVG small
      const v = grid[y][x]; if (!v) { x++; continue; }
      let n = 1; while (x + n < W && grid[y][x + n] === v) n++;
      rects += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${pal[v] || pal.M}"/>`; x += n;
    }
  }
  const body = flip ? `<g transform="translate(16 0) scale(-1 1)">${rects}</g>` : rects;
  const svg = `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;
  cache.set(key, svg);
  return svg;
}
