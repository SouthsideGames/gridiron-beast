// Beast Clash effects (presentation Phase 3). One canvas over the stage draws every projectile, burst, beam,
// mote and puff in the same chunky-pixel language as the sprites: particles are squares snapped to a pixel
// grid, no anti-aliasing, a handful of colours per element taken from the football ability palette.
//
// The effects layer is presentation only. It is told what happened (element, from, to, tier) by the arena,
// which reads the record; it never decides anything. Every effect is seeded from the cue index, so the same
// battle draws the same particles every time, and reduced motion / low quality simply draw less.
import { ELEMENT_FX } from '../ability-fx.js'; // read-only palette; football effects are not touched

/** A tiny seeded generator for particle scatter (never used for outcomes). */
function rng(seed) { let s = (seed * 2654435761 + 1013904223) >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const lerp = (a, b, k) => a + (b - a) * k;
const look = (el) => ELEMENT_FX[el] || { a: '#ffe36c', b: '#c99a1a', style: 'flash' };
/** Third colour per element for highlights/cores. */
const CORE = { Fire: '#fff4c2', Water: '#ffffff', Nature: '#f1ffd0', Electric: '#ffffff', Ice: '#ffffff', Wind: '#ffffff', Earth: '#5a4430', Dark: '#d6c3ff', Light: '#ffffff', Metal: '#ffffff', Psychic: '#ffffff', Dragon: '#ffffff' };

/**
 * createFx(canvas, { speed: () => n, reduced: () => bool, quality: () => 'full'|'low' })
 * Positions are stage pixels. Durations are 1x milliseconds; speed divides them.
 */
export function createFx(canvas, opts) {
  const ctx = canvas.getContext('2d'); const P = []; const shapes = []; let raf = 0, last = 0; let W = 0, H = 0, dpr = 1;
  const speed = () => opts.speed?.() || 1; const reduced = () => !!opts.reduced?.(); const low = () => opts.quality?.() === 'low';
  const G = () => (low() ? 3 : 2); // pixel grid
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect(); dpr = low() ? 1 : Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height)); canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
  }
  function tick(t) {
    const dt = Math.min(50, t - (last || t)) * speed(); last = t; ctx.clearRect(0, 0, W, H);
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.age += dt; if (p.age >= p.life) { P.splice(i, 1); continue; } const k = p.age / p.life; p.vx += (p.ax || 0) * dt / 16; p.vy += (p.ay || 0) * dt / 16; p.x += p.vx * dt / 16; p.y += p.vy * dt / 16; if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; } drawP(p, k); }
    for (let i = shapes.length - 1; i >= 0; i--) { const s = shapes[i]; s.age += dt; if (s.age >= s.life) { shapes.splice(i, 1); continue; } s.draw(ctx, s.age / s.life, s.age); }
    if (P.length || shapes.length) raf = requestAnimationFrame(tick); else { raf = 0; last = 0; ctx.clearRect(0, 0, W, H); }
  }
  const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } };
  function drawP(p, k) {
    const g = G(); const a = p.fade === false ? 1 : k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3; const sz = Math.max(g, Math.round((p.size * (p.grow ? 1 + k * p.grow : p.shrink ? 1 - k * 0.8 : 1)) / g) * g);
    ctx.globalAlpha = Math.max(0, Math.min(1, a * (p.alpha ?? 1))); ctx.fillStyle = p.color2 && k > 0.5 ? p.color2 : p.color;
    const x = Math.round(p.x / g) * g, y = Math.round(p.y / g) * g;
    if (p.shape === 'line') { ctx.fillRect(x, y, sz, g); }
    else if (p.shape === 'tall') { ctx.fillRect(x, y, g, sz); }
    else if (p.shape === 'diamond') { ctx.fillRect(x - sz / 2, y - g / 2, sz, g); ctx.fillRect(x - g / 2, y - sz / 2, g, sz); }
    else ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    ctx.globalAlpha = 1;
  }
  const add = (p) => { if (P.length < (low() ? 160 : 420)) P.push(p); kick(); };
  const addShape = (life, draw) => { shapes.push({ age: 0, life, draw }); kick(); };
  const n = (full) => (reduced() ? Math.ceil(full * 0.3) : low() ? Math.ceil(full * 0.5) : full);

  // ---- element bursts at the point of impact (every element has its own silhouette)
  function burst(at, element, { tier = 'routine', seed = 1 } = {}) {
    const L = look(element), r = rng(seed), big = tier === 'major' ? 1.7 : tier === 'power' ? 1.3 : 1, count = n(Math.round(14 * big));
    const [x, y] = at;
    switch (element) {
      case 'Fire': for (let i = 0; i < count; i++) { const a = r() * Math.PI * 2, v = (1 + r() * 3) * big; add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, ay: -0.05, life: 400 + r() * 300, age: 0, size: 4 + r() * 4, color: i % 3 ? L.a : L.b, color2: '#6b2a1a', shrink: true }); } flash(at, L.a, 26 * big); break;
      case 'Water': for (let i = 0; i < count; i++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.2, v = (2 + r() * 3) * big; add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ay: 0.28, life: 450 + r() * 250, age: 0, size: 3 + r() * 3, color: i % 4 ? L.a : CORE.Water, color2: L.b }); } ring(at, L.a, 10, 30 * big, 420); break;
      case 'Nature': for (let i = 0; i < count; i++) { const a = r() * Math.PI * 2, v = (1 + r() * 2.5) * big; add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, ay: 0.06, drag: 0.97, life: 500 + r() * 350, age: 0, size: 4 + r() * 3, shape: i % 2 ? 'line' : 'tall', color: i % 3 ? L.a : L.b }); } break;
      case 'Electric': for (let i = 0; i < count; i++) { const a = r() * Math.PI * 2, v = (3 + r() * 4) * big; add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.9, life: 180 + r() * 160, age: 0, size: 3, shape: 'line', color: i % 2 ? L.a : CORE.Electric }); } flash(at, '#ffffff', 22 * big); zigzag(at, [x + (r() - 0.5) * 30, y - 40 * big], element, 160, seed + 9); break;
      case 'Earth': for (let i = 0; i < count; i++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.6, v = (1.5 + r() * 3) * big; add({ x, y: y + 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ay: 0.3, life: 450 + r() * 300, age: 0, size: 4 + r() * 5, color: i % 3 ? L.b : L.a }); } dust(at, 10 * big, seed); break;
      case 'Ice': for (let i = 0; i < count; i++) { const a = r() * Math.PI * 2, v = (2 + r() * 3) * big; add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.95, life: 420 + r() * 300, age: 0, size: 5 + r() * 5, shape: 'diamond', color: i % 3 ? L.a : L.b }); } flash(at, L.a, 24 * big); break;
      case 'Wind': for (let i = 0; i < count; i++) { const a = r() * Math.PI * 2; addShape(320 + r() * 200, (c, k) => { const rr = 6 + k * 34 * big; c.globalAlpha = 1 - k; c.strokeStyle = i % 2 ? L.a : L.b; c.lineWidth = G(); c.beginPath(); c.arc(x, y, rr, a + k * 2, a + k * 2 + 1.1); c.stroke(); c.globalAlpha = 1; }); } break;
      case 'Dark': for (let i = 0; i < count; i++) { const a = r() * Math.PI * 2, v = (0.6 + r() * 1.6) * big; add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.4, drag: 0.98, life: 550 + r() * 350, age: 0, size: 6 + r() * 6, grow: 0.8, color: i % 3 ? L.b : L.a, alpha: 0.85 }); } ring(at, L.a, 4, 36 * big, 380); break;
      case 'Light': flash(at, '#ffffff', 34 * big); for (let i = 0; i < count; i++) { const a = (i / count) * Math.PI * 2, v = (2 + r() * 2) * big; add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.94, life: 380 + r() * 260, age: 0, size: 3 + r() * 3, shape: 'diamond', color: i % 2 ? L.a : L.b }); } break;
      case 'Metal': flash(at, '#ffffff', 16 * big); slash(at, L.a, 26 * big, seed); for (let i = 0; i < n(10 * big); i++) { const a = r() * Math.PI * 2, v = (3 + r() * 4) * big; add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ay: 0.2, life: 250 + r() * 200, age: 0, size: 2 + r() * 2, color: i % 2 ? '#ffffff' : '#ffe08a' }); } break;
      case 'Psychic': for (let i = 0; i < 3; i++) ring(at, i % 2 ? L.a : L.b, 6, (40 + i * 10) * big, 460 + i * 120, i * 90); for (let i = 0; i < n(8); i++) { const a = r() * Math.PI * 2; add({ x: x + Math.cos(a) * 20, y: y + Math.sin(a) * 14, vx: -Math.cos(a) * 1.2, vy: -Math.sin(a) * 1.2, life: 400, age: 0, size: 4, shape: 'diamond', color: L.a }); } break;
      case 'Dragon': flash(at, '#ffffff', 30 * big); for (let i = 0; i < count * 1.4; i++) { const a = r() * Math.PI * 2, v = (1.5 + r() * 4) * big; add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, ay: -0.03, life: 500 + r() * 400, age: 0, size: 4 + r() * 6, color: i % 3 === 0 ? L.b : i % 3 === 1 ? L.a : '#ff7a3d', color2: '#5a1a3a', shrink: true }); } ring(at, L.a, 8, 50 * big, 500); break;
      default: flash(at, L.a, 20 * big); for (let i = 0; i < count; i++) { const a = r() * Math.PI * 2, v = 1 + r() * 2; add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 350, age: 0, size: 4, color: L.a }); }
    }
  }
  function flash(at, color, radius) { const [x, y] = at; addShape(160, (c, k) => { c.globalAlpha = 0.9 * (1 - k); c.fillStyle = color; const rr = radius * (0.6 + k * 0.6), g = G(); for (let yy = -rr; yy <= rr; yy += g) { const w = Math.sqrt(Math.max(0, rr * rr - yy * yy)); c.fillRect(Math.round((x - w) / g) * g, Math.round((y + yy) / g) * g, Math.round(w * 2 / g) * g, g); } c.globalAlpha = 1; }); }
  function ring(at, color, width, radius, life, delay = 0) { const [x, y] = at; addShape(life + delay, (c, k, age) => { if (age < delay) return; const kk = (age - delay) / life; c.globalAlpha = 1 - kk; c.strokeStyle = color; c.lineWidth = Math.max(G(), width * (1 - kk)); c.beginPath(); c.ellipse(x, y, radius * kk + 2, (radius * kk + 2) * 0.55, 0, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; }); }
  function dust(at, count, seed) { const r = rng(seed + 3); const [x, y] = at; for (let i = 0; i < n(count); i++) { const a = Math.PI + r() * Math.PI, v = 0.8 + r() * 1.6; add({ x: x + (r() - 0.5) * 20, y: y + 6, vx: Math.cos(a) * v * (r() > 0.5 ? 1 : -1), vy: -Math.abs(Math.sin(a)) * v * 0.6, drag: 0.96, life: 600 + r() * 300, age: 0, size: 8 + r() * 8, grow: 0.7, color: 'rgba(214,190,150,0.8)', alpha: 0.7 }); } }
  function slash(at, color, len, seed) { const r = rng(seed + 5); const [x, y] = at; const a = -0.6 + (r() - 0.5) * 0.5; addShape(200, (c, k) => { c.globalAlpha = 1 - k; c.strokeStyle = color; c.lineWidth = G() * 1.5; const L2 = len * (0.4 + k * 0.6); c.beginPath(); c.moveTo(x - Math.cos(a) * L2, y - Math.sin(a) * L2); c.lineTo(x + Math.cos(a) * L2, y + Math.sin(a) * L2); c.stroke(); c.beginPath(); c.moveTo(x - Math.cos(a + 1.4) * L2 * 0.7, y - Math.sin(a + 1.4) * L2 * 0.7); c.lineTo(x + Math.cos(a + 1.4) * L2 * 0.7, y + Math.sin(a + 1.4) * L2 * 0.7); c.stroke(); c.globalAlpha = 1; }); }
  function zigzag(from, to, element, life, seed) { const L = look(element); const r = rng(seed); const pts = []; const segs = 7; for (let i = 0; i <= segs; i++) { const k = i / segs; pts.push([lerp(from[0], to[0], k) + (i && i < segs ? (r() - 0.5) * 22 : 0), lerp(from[1], to[1], k) + (i && i < segs ? (r() - 0.5) * 22 : 0)]); } addShape(life, (c, k, age) => { if (Math.floor(age / 40) % 3 === 2) return; c.globalAlpha = 1 - k * 0.6; c.lineWidth = G() * 2; c.strokeStyle = L.b; c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.stroke(); c.lineWidth = G(); c.strokeStyle = '#ffffff'; c.stroke(); c.globalAlpha = 1; }); }
  function beam(from, to, element, life) { const L = look(element); addShape(life, (c, k) => { const w = k < 0.3 ? 2 + k * 30 : 11 - (k - 0.3) * 14; if (w <= 0) return; c.globalAlpha = Math.min(1, 1.4 - k); c.lineCap = 'butt'; c.strokeStyle = L.b; c.lineWidth = Math.max(G(), w + 4); c.beginPath(); c.moveTo(from[0], from[1]); c.lineTo(to[0], to[1]); c.stroke(); c.strokeStyle = L.a; c.lineWidth = Math.max(G(), w); c.stroke(); c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(G(), w * 0.35); c.stroke(); c.globalAlpha = 1; }); }

  // ---- travel: a projectile from the attacker to the target. Resolves when it arrives (the arena then shows the impact).
  function projectile(from, to, element, { ms = 300, tier = 'routine', seed = 1, lob = false } = {}) {
    const L = look(element); const r = rng(seed); const big = tier === 'major' ? 1.6 : tier === 'power' ? 1.25 : 1; const size = Math.round(16 * big);
    if (reduced()) return Promise.resolve();
    const life = ms / speed();
    return new Promise((res) => {
      let emitted = 0;
      addShape(life, (c, k, age) => {
        const x = lerp(from[0], to[0], k); const arc = lob ? -Math.sin(k * Math.PI) * 60 * big : element === 'Water' || element === 'Nature' ? Math.sin(k * 10) * 4 : 0; const y = lerp(from[1], to[1], k) + arc;
        const g = G(); const xs = Math.round(x / g) * g, ys = Math.round(y / g) * g;
        // body
        c.fillStyle = L.b; c.fillRect(xs - size / 2 - g, ys - size / 2 - g, size + g * 2, size + g * 2); c.fillStyle = L.a; c.fillRect(xs - size / 2, ys - size / 2, size, size); c.fillStyle = CORE[element] || '#fff'; c.fillRect(xs - g, ys - g, g * 2, g * 2);
        if (element === 'Ice' || element === 'Wind') { c.fillStyle = L.a; c.fillRect(xs - size, ys - g / 2, size * 2, g); }
        // trail
        while (emitted < age / 16) { emitted++; const t = r(); add({ x: x + (t - 0.5) * 6, y: y + (r() - 0.5) * 6, vx: -(to[0] - from[0]) / life * 6 * r(), vy: -(to[1] - from[1]) / life * 6 * r() + (element === 'Fire' ? -0.6 : element === 'Earth' ? 0.4 : 0), life: 260 + r() * 260, age: 0, size: 4 + r() * 5 * big, shrink: true, color: t > 0.5 ? L.a : L.b, shape: element === 'Nature' ? 'line' : element === 'Wind' ? 'line' : 'square' }); }
        if (k >= 0.999) res();
      });
      setTimeout(res, life + 40); // belt and braces for background tabs
    });
  }

  // ---- support and status
  function heal(at, { seed = 1, tier = 'routine' } = {}) { const r = rng(seed); const [x, y] = at; for (let i = 0; i < n(14); i++) { add({ x: x + (r() - 0.5) * 44, y: y + 10 + r() * 20, vx: (r() - 0.5) * 0.3, vy: -(0.8 + r() * 1.2), life: 650 + r() * 400, age: 0, size: 3 + r() * 4, shape: i % 3 ? 'square' : 'diamond', color: i % 2 ? '#4ade80' : '#c8ffd8' }); } ring(at, '#4ade80', 3, 30, 500); void tier; }
  function healBeam(from, to) { const r = rng(7); const dx = to[0] - from[0], dy = to[1] - from[1]; for (let i = 0; i < n(12); i++) { const k = r(); add({ x: from[0] + dx * k * 0.2, y: from[1] + dy * k * 0.2, vx: dx / 60, vy: dy / 60 - 0.5, life: 420, age: 0, size: 3 + r() * 3, color: i % 2 ? '#4ade80' : '#ffffff', shape: 'diamond' }); } }
  function shieldUp(at, { seed = 1 } = {}) { const r = rng(seed); const [x, y] = at; ring(at, '#93c5fd', 5, 40, 420); for (let i = 0; i < n(12); i++) { const a = (i / 12) * Math.PI * 2 + r() * 0.3; add({ x: x + Math.cos(a) * 34, y: y + Math.sin(a) * 18, vx: -Math.cos(a) * 1.4, vy: -Math.sin(a) * 0.8 - 0.3, life: 450, age: 0, size: 4, shape: 'diamond', color: i % 2 ? '#93c5fd' : '#ffffff' }); } }
  function shieldHit(at) { const [x, y] = at; addShape(220, (c, k) => { c.globalAlpha = 0.8 * (1 - k); c.strokeStyle = '#bfdbfe'; c.lineWidth = G() * 2; c.beginPath(); c.ellipse(x, y - 8, 30 + k * 6, 24 + k * 5, 0, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; }); flash(at, '#dbeafe', 14); }
  function shieldBreak(at, { seed = 1 } = {}) { const r = rng(seed); const [x, y] = at; for (let i = 0; i < n(16); i++) { const a = r() * Math.PI * 2, v = 2 + r() * 3; add({ x: x + Math.cos(a) * 20, y: y - 6 + Math.sin(a) * 14, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, ay: 0.25, life: 500 + r() * 300, age: 0, size: 4 + r() * 4, shape: 'diamond', color: i % 2 ? '#93c5fd' : '#ffffff' }); } flash(at, '#ffffff', 22); }
  const COND = { burn: ['#ff7a3d', '#ffd166'], chill: ['#8ac6ff', '#ffffff'], daze: ['#e9a3ff', '#ffe55a'], shock: ['#ffe55a', '#ffffff'] };
  function condition(at, cond, { seed = 1, strong = false } = {}) {
    const r = rng(seed); const [x, y] = at; const [c1, c2] = COND[cond] || ['#fff', '#fff']; const count = n(strong ? 16 : 10);
    if (cond === 'burn') for (let i = 0; i < count; i++) add({ x: x + (r() - 0.5) * 30, y: y + 10 - r() * 20, vx: (r() - 0.5) * 0.4, vy: -(1 + r() * 1.5), life: 450 + r() * 300, age: 0, size: 4 + r() * 4, shrink: true, color: i % 2 ? c1 : c2 });
    if (cond === 'chill') { for (let i = 0; i < count; i++) add({ x: x + (r() - 0.5) * 40, y: y - 30 - r() * 20, vx: (r() - 0.5) * 0.3, vy: 0.5 + r() * 0.6, life: 700 + r() * 400, age: 0, size: 4 + r() * 3, shape: 'diamond', color: i % 2 ? c1 : c2 }); flash(at, '#bfe8ff', 24); }
    if (cond === 'daze') for (let i = 0; i < count; i++) { const a = (i / count) * Math.PI * 2; addShape(900, (c, k) => { const ang = a + k * 6; const px = x + Math.cos(ang) * 22, py = y - 30 + Math.sin(ang) * 8; c.globalAlpha = 1 - k; c.fillStyle = i % 2 ? c1 : c2; const g = G(); c.fillRect(Math.round(px / g) * g - 2, Math.round(py / g) * g - 2, 4, 4); c.globalAlpha = 1; }); }
    if (cond === 'shock') { for (let i = 0; i < (strong ? 4 : 2); i++) zigzag([x + (r() - 0.5) * 40, y - 50], [x + (r() - 0.5) * 30, y + 6], 'Electric', 220 + i * 60, seed + i); for (let i = 0; i < count; i++) { const a = r() * Math.PI * 2, v = 2 + r() * 3; add({ x, y: y - 16, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.9, life: 220 + r() * 160, age: 0, size: 3, shape: 'line', color: i % 2 ? c1 : c2 }); } }
  }
  function skipShock(at, { seed = 1 } = {}) { condition(at, 'shock', { seed, strong: true }); }
  function koPuff(at, { seed = 1 } = {}) { const r = rng(seed); const [x, y] = at; for (let i = 0; i < n(18); i++) { const a = r() * Math.PI * 2, v = 0.8 + r() * 2; add({ x: x + (r() - 0.5) * 30, y: y - 10 + (r() - 0.5) * 30, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, drag: 0.96, life: 600 + r() * 400, age: 0, size: 6 + r() * 8, grow: 0.6, color: i % 3 ? '#e5e7eb' : '#9ca3af', alpha: 0.75 }); } ring(at, '#ffffff', 4, 40, 450); }
  function enterPuff(at, { seed = 1 } = {}) { dust(at, 8, seed); for (let i = 0; i < n(6); i++) add({ x: at[0] + (i - 3) * 8, y: at[1], vx: 0, vy: -1.2 - i * 0.1, life: 400, age: 0, size: 3, shape: 'diamond', color: '#facc15' }); }
  function victory(at, { seed = 1 } = {}) { const r = rng(seed); const [x, y] = at; for (let i = 0; i < n(50); i++) { add({ x: x + (r() - 0.5) * 120, y: y - 160 - r() * 60, vx: (r() - 0.5) * 1.2, vy: 1 + r() * 1.4, ay: 0.02, life: 1300 + r() * 600, age: 0, size: 4 + r() * 4, shape: i % 2 ? 'line' : 'tall', color: ['#facc15', '#4ade80', '#60a5fa', '#f472b6', '#ffffff'][i % 5], fade: true }); } }
  function windup(at, element, { seed = 1 } = {}) { const L = look(element); const r = rng(seed); const [x, y] = at; for (let i = 0; i < n(8); i++) { const a = r() * Math.PI * 2; add({ x: x + Math.cos(a) * 30, y: y - 20 + Math.sin(a) * 20, vx: -Math.cos(a) * 1.6, vy: -Math.sin(a) * 1.1, life: 260, age: 0, size: 3 + r() * 3, shape: 'diamond', color: i % 2 ? L.a : L.b }); } }

  function clear() { P.length = 0; shapes.length = 0; if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; ctx.clearRect(0, 0, W, H); }
  resize();
  return { resize, clear, burst, projectile, beam, zigzag, heal, healBeam, shieldUp, shieldHit, shieldBreak, condition, skipShock, koPuff, enterPuff, victory, windup, dust, ring, flash, get count() { return P.length + shapes.length; } };
}
