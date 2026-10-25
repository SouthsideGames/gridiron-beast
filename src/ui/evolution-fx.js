// Evolution effects (GDD §51.3): ONE canvas particle engine with a theme per monster type, rather than twelve engines.
// Particles are drawn as crisp pixel squares to match the 16×16 sprites. The engine runs in phases set by the scene:
//   gather  (stage A): sparks drift in from the edges toward the monster
//   build   (stage B): more, faster, spiralling; the theme's signature shapes appear
//   burst   (end of C): one radial burst from the monster
//   celebrate (stage D): the theme drifts upward around the evolved form
//   calm    (stage E): a few ambient sparks behind the results
// It adapts to the device: the particle cap halves when frames run slow, and it stops entirely when the scene closes.
// Nothing here touches the game: it only draws.

/** Type themes: colours (pixel palette), the signature shape and its motion. Unknown types use Light. */
export const FX_THEMES = Object.freeze({
  Fire: { colors: ['#ffd25a', '#ff9a2e', '#ff5a1f', '#c8321a'], shape: 'ember', motion: 'rise', glow: '#ff7a2f', label: 'embers and flame' },
  Water: { colors: ['#bfe9ff', '#6cc6ff', '#2f8fe0', '#1f5fb0'], shape: 'bubble', motion: 'float', glow: '#4ab0ff', label: 'bubbles and flowing water' },
  Electric: { colors: ['#fff7a8', '#ffe94a', '#ffd000', '#9fe8ff'], shape: 'bolt', motion: 'jitter', glow: '#ffe14a', label: 'lightning arcs' },
  Nature: { colors: ['#c9f27a', '#7ed957', '#3fae4a', '#2a7a3a'], shape: 'leaf', motion: 'flutter', glow: '#6ad65a', label: 'leaves' },
  Ice: { colors: ['#ffffff', '#d9f6ff', '#9fe3ff', '#6ab8e8'], shape: 'crystal', motion: 'fall', glow: '#9fe3ff', label: 'crystals and frost' },
  Dark: { colors: ['#b08cff', '#7a52d9', '#4a2f8f', '#24163f'], shape: 'shadow', motion: 'wisp', glow: '#8a5cff', label: 'shadow energy' },
  Light: { colors: ['#ffffff', '#fff3c4', '#ffe082', '#ffc94a'], shape: 'ray', motion: 'radiate', glow: '#ffe9a0', label: 'radiant light' },
  Metal: { colors: ['#ffffff', '#d7e0ea', '#9aa8b8', '#ffcf6a'], shape: 'spark', motion: 'sparks', glow: '#c9d6e6', label: 'metallic sparks' },
  Earth: { colors: ['#e6c48a', '#c4935a', '#8f6a3e', '#5e4426'], shape: 'stone', motion: 'tumble', glow: '#d9a35a', label: 'dust and stone' },
  Wind: { colors: ['#e8fff6', '#b4f5dc', '#7fe0c0', '#4fbfa0'], shape: 'swirl', motion: 'swirl', glow: '#8ff0cf', label: 'swirling air' },
  Psychic: { colors: ['#ffd1ff', '#ff9ef2', '#e05ad9', '#9a3fd1'], shape: 'ring', motion: 'orbit', glow: '#f07af0', label: 'floating energy rings' },
  Dragon: { colors: ['#ffe08a', '#ff7a5a', '#e0304a', '#7a2fd1'], shape: 'aura', motion: 'aura', glow: '#ff5a4a', label: 'a dragon aura' },
});
export const themeFor = (type) => FX_THEMES[type] || FX_THEMES.Light;

const PHASE = {
  gather: { rate: 22, speed: 1, inward: true },
  build: { rate: 60, speed: 1.9, inward: true },
  celebrate: { rate: 30, speed: 1.1, inward: false },
  calm: { rate: 5, speed: 0.6, inward: false },
  off: { rate: 0 },
};

/**
 * Mount the engine on `canvas`. `center()` returns the monster's centre and radius in CSS pixels (it moves as the layout
 * changes). Options: { type, reduced, quality: 'full' | 'low' }. Returns { phase(name), burst(), stop(), stats() }.
 */
export function createEvolutionFx(canvas, center, { type = 'Light', reduced = false, quality = 'full' } = {}) {
  const th = themeFor(type); const ctx = canvas.getContext('2d');
  let cap = reduced ? 0 : quality === 'low' ? 45 : 110; let phase = 'off'; let raf = 0; let last = 0; let carry = 0; let running = true;
  const parts = []; const frameTimes = []; let slowFrames = 0, frames = 0, downgraded = false;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  function resize() { const r = canvas.getBoundingClientRect(); canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr)); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false; }
  resize(); const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null; ro?.observe(canvas);
  const pick = (a) => a[(Math.random() * a.length) | 0];
  function spawn(kind = 'phase') {
    if (parts.length >= cap) return; const c = center(); const W = canvas.clientWidth, H = canvas.clientHeight; const P = PHASE[phase] || PHASE.calm;
    const p = { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1.6 + Math.random() * 1.2, size: (Math.random() < 0.3 ? 4 : 3) * (W < 360 ? 0.85 : 1), color: pick(th.colors), shape: th.shape, rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 4, a: 0, r0: 0 };
    if (kind === 'burst') { const ang = Math.random() * 6.283; const sp = 120 + Math.random() * 260; p.x = c.x + Math.cos(ang) * c.r * 0.3; p.y = c.y + Math.sin(ang) * c.r * 0.3; p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp; p.max = 0.9 + Math.random() * 0.7; p.size += 1; p.burst = 1; }
    else if (P.inward) { // from a ring outside the monster toward it
      const ang = Math.random() * 6.283; const d = Math.max(W, H) * (0.35 + Math.random() * 0.25); p.x = c.x + Math.cos(ang) * d; p.y = c.y + Math.sin(ang) * d; p.ang = ang; p.dist = d; p.max = 1.2 + Math.random() * 0.8; }
    else { const ang = Math.random() * 6.283; const d = c.r * (0.6 + Math.random() * 0.9); p.x = c.x + Math.cos(ang) * d; p.y = c.y + Math.sin(ang) * d * 0.8; p.ang = ang; p.dist = d; }
    parts.push(p);
  }
  function step(p, dt, c) {
    const P = PHASE[phase] || PHASE.calm; p.life += dt; p.rot += p.spin * dt;
    if (p.burst) { p.vx *= 1 - 1.6 * dt; p.vy = p.vy * (1 - 1.6 * dt) + (th.motion === 'rise' || th.motion === 'radiate' ? -30 : 40) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    else if (P.inward && p.dist != null) { // spiral inward
      const sp = (90 + 60 * (p.life / p.max)) * (P.speed || 1); p.dist = Math.max(c.r * 0.25, p.dist - sp * dt); p.ang += (th.motion === 'swirl' || th.motion === 'orbit' ? 2.2 : 0.9) * dt * (P.speed || 1);
      p.x = c.x + Math.cos(p.ang) * p.dist + (th.motion === 'jitter' ? (Math.random() - 0.5) * 6 : 0); p.y = c.y + Math.sin(p.ang) * p.dist; if (p.dist <= c.r * 0.26) p.life = p.max; }
    else { // theme motion around the evolved form
      const s = P.speed || 1;
      switch (th.motion) {
        case 'rise': case 'aura': p.y -= (50 + p.size * 10) * s * dt; p.x += Math.sin(p.life * 6 + p.rot) * 14 * dt; break;
        case 'float': p.y -= 34 * s * dt; p.x += Math.sin(p.life * 3 + p.rot) * 20 * dt; break;
        case 'fall': p.y += 30 * s * dt; p.x += Math.sin(p.life * 2 + p.rot) * 10 * dt; break;
        case 'flutter': p.y += 22 * s * dt; p.x += Math.sin(p.life * 4 + p.rot) * 36 * dt; break;
        case 'sparks': p.vy = (p.vy || -80 - Math.random() * 60) + 260 * dt; p.vx = p.vx || (Math.random() - 0.5) * 140; p.x += p.vx * dt; p.y += p.vy * dt; break;
        case 'tumble': p.vy = (p.vy || -40 - Math.random() * 50) + 140 * dt; p.vx = p.vx || (Math.random() - 0.5) * 70; p.x += p.vx * dt; p.y += p.vy * dt; break;
        case 'swirl': case 'orbit': p.ang += (th.motion === 'orbit' ? 1.3 : 2.4) * s * dt; p.dist += (th.motion === 'swirl' ? 18 : 4) * dt; p.x = c.x + Math.cos(p.ang) * p.dist; p.y = c.y + Math.sin(p.ang) * p.dist * 0.75 - p.life * 10; break;
        case 'wisp': p.y -= 18 * s * dt; p.x += Math.sin(p.life * 2 + p.rot) * 24 * dt; break;
        case 'jitter': p.y -= 20 * s * dt; p.x += (Math.random() - 0.5) * 40 * dt; break;
        case 'radiate': default: { const ang = p.ang ?? 0; p.x += Math.cos(ang) * 40 * s * dt; p.y += Math.sin(ang) * 40 * s * dt; }
      }
    }
    const t = p.life / p.max; p.a = t < 0.15 ? t / 0.15 : t > 0.7 ? Math.max(0, (1 - t) / 0.3) : 1;
  }
  const snap = (v) => Math.round(v);
  function draw(p) {
    const s = p.size; const x = snap(p.x), y = snap(p.y); ctx.globalAlpha = p.a; ctx.fillStyle = p.color;
    switch (p.shape) {
      case 'bubble': ctx.fillRect(x - s, y - s - 1, s * 2, 1); ctx.fillRect(x - s, y + s, s * 2, 1); ctx.fillRect(x - s - 1, y - s, 1, s * 2); ctx.fillRect(x + s, y - s, 1, s * 2); ctx.fillRect(x - s + 1, y - s + 1, 1, 1); break;
      case 'leaf': ctx.fillRect(x - s, y, s * 2, s); ctx.fillRect(x - (s >> 1), y - (s >> 1), s, s * 2); break;
      case 'crystal': ctx.fillRect(x - 1, y - s - 1, 2, s * 2 + 2); ctx.fillRect(x - s, y - 1, s * 2, 2); break;
      case 'shadow': ctx.globalAlpha = p.a * 0.55; ctx.fillRect(x - s, y - s, s * 2 + 2, s * 2); break;
      case 'ray': ctx.fillRect(x - 1, y - s, 2, s * 2); ctx.fillRect(x - s, y - 1, s * 2, 2); break;
      case 'spark': ctx.fillRect(x, y, s + 3, 2); break;
      case 'stone': ctx.fillRect(x - (s >> 1), y - (s >> 1), s + 1, s); break;
      case 'ring': { const r = s + 2; ctx.fillRect(x - r, y - r, r * 2, 1); ctx.fillRect(x - r, y + r - 1, r * 2, 1); ctx.fillRect(x - r, y - r, 1, r * 2); ctx.fillRect(x + r - 1, y - r, 1, r * 2); break; }
      case 'bolt': ctx.fillRect(x, y, s, 2); ctx.fillRect(x + s - 2, y, 2, s); ctx.fillRect(x + s - 2, y + s - 2, s, 2); break;
      case 'swirl': ctx.fillRect(x, y, s + 2, 2); break;
      case 'aura': case 'ember': default: ctx.fillRect(x - (s >> 1), y - (s >> 1), s, s);
    }
  }
  function arcs(c) { // Electric: occasional lightning arcs between the edge of the glow and a random point
    if (th.shape !== 'bolt' || phase !== 'build' || Math.random() > 0.08) return;
    ctx.globalAlpha = 0.85; ctx.fillStyle = th.colors[1]; const ang = Math.random() * 6.283; let x = c.x + Math.cos(ang) * c.r * 0.5, y = c.y + Math.sin(ang) * c.r * 0.5;
    for (let i = 0; i < 9; i++) { const nx = x + Math.cos(ang) * 12 + (Math.random() - 0.5) * 14, ny = y + Math.sin(ang) * 12 + (Math.random() - 0.5) * 14; const steps = 6; for (let k = 0; k < steps; k++) ctx.fillRect(snap(x + (nx - x) * k / steps), snap(y + (ny - y) * k / steps), 2, 2); x = nx; y = ny; }
  }
  function loop(ts) {
    if (!running) return; raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016); last = ts; frames++;
    frameTimes.push(dt); if (frameTimes.length > 40) frameTimes.shift();
    if (!downgraded && frames > 40) { const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length; if (avg > 0.028) { slowFrames++; if (slowFrames > 20) { cap = Math.max(20, cap >> 1); downgraded = true; } } }
    const c = center(); const P = PHASE[phase] || PHASE.off;
    carry += (P.rate || 0) * dt * (cap / 110); while (carry >= 1) { spawn(); carry -= 1; }
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; step(p, dt, c); if (p.life >= p.max) { parts.splice(i, 1); continue; } draw(p); }
    arcs(c); ctx.globalAlpha = 1;
    if (phase === 'off' && !parts.length) { cancelAnimationFrame(raf); raf = 0; last = 0; }
  }
  const kick = () => { if (!raf && running && cap > 0) { last = 0; raf = requestAnimationFrame(loop); } };
  return {
    phase(name) { phase = name; kick(); },
    burst() { if (!cap) return; const n = Math.min(cap, cap > 60 ? 70 : 36); for (let i = 0; i < n; i++) { if (parts.length >= cap) parts.shift(); spawn('burst'); } kick(); },
    clear() { parts.length = 0; ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight); },
    stop() { running = false; cancelAnimationFrame(raf); ro?.disconnect(); parts.length = 0; },
    stats() { return { particles: parts.length, cap, downgraded, frames, avgMs: frameTimes.length ? Math.round(frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length * 10000) / 10 : null }; },
  };
}
