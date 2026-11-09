#!/usr/bin/env node
// Visual identity check for the field renderer (docs/task8/RENDER_OPT.md): screenshots of fixed frames of fixed plays, taken in
// headless Chromium at 390x844, DPR 3 (the render-perf harness's viewport), compared pixel by pixel between two runs.
//
//   node tools/perf/render/shots.mjs --out=DIR                 # capture: PNGs + shots.json (sha256 of every image)
//   node tools/perf/render/shots.mjs --out=DIR --compare=DIR0  # capture, then compare every image with DIR0's
//   node tools/perf/render/shots.mjs --compare-only=A,B        # compare two capture directories, no browser
//
// What is captured (every frame is drawn through the match screen's own playback, src/ui/screens/match.js startAnim):
//   - the live franchise game (seed 3, week 3): the match screen before the kickoff, then `--live-steps` steps played by hand
//     (kickoff, first play card, snap, continue...), each animated step held at fixed frames (engine frame 0, frame 2 + half-step,
//     the middle frame, the last frame, the end-of-play hold), and the screen after each step;
//   - precomputed plays of the F1 (ordinary) and F4 (legendary) scenes (precompute.mjs, the harness's own plays), the same frames.
// The playback clock is replaced through the inert harness hook (globalThis.__gbRenderPerf.clock), so a frame stays on screen while
// it is photographed; CSS animations and transitions are disabled (they depend on wall time). Both runs of a comparison must use
// the same settings, so differences are the renderer's alone.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { precomputeAll } from './precompute.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '..', '..', '..');
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`) || x === `--${k}`); return a ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) : d; };
const OUT = arg('out') ? path.resolve(arg('out')) : null;
const COMPARE = arg('compare') ? path.resolve(arg('compare')) : null;
const COMPARE_ONLY = arg('compare-only') ? String(arg('compare-only')).split(',').map((x) => path.resolve(x)) : null;
const LIVE_STEPS = Number(arg('live-steps', 4));
const PLAYS = Number(arg('plays', 3));
const SCENES = String(arg('scenes', 'F1-ordinary,F4-legendary-scene')).split(',');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

// ------------------------------------------------------------------------------------------------ PNG decode (8-bit RGBA / RGB)
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let off = 8; let w = 0, h = 0, bitDepth = 0, colorType = 0; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off); const type = buf.toString('latin1', off + 4, off + 8); const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; if (data[12] !== 0) throw new Error('interlaced PNG'); }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);
  const ch = { 2: 3, 6: 4, 0: 1, 4: 2 }[colorType]; if (!ch) throw new Error(`unsupported colour type ${colorType}`);
  const raw = zlib.inflateSync(Buffer.concat(idat)); const stride = w * ch; const out = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(stride); let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++]; const line = Buffer.from(raw.subarray(p, p + stride)); p += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? line[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0; let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      line[i] = v & 255;
    }
    for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; if (ch === 4) { out[o] = line[x * 4]; out[o + 1] = line[x * 4 + 1]; out[o + 2] = line[x * 4 + 2]; out[o + 3] = line[x * 4 + 3]; } else if (ch === 3) { out[o] = line[x * 3]; out[o + 1] = line[x * 3 + 1]; out[o + 2] = line[x * 3 + 2]; out[o + 3] = 255; } else { out[o] = out[o + 1] = out[o + 2] = line[x * ch]; out[o + 3] = ch === 2 ? line[x * 2 + 1] : 255; } }
    prev = line;
  }
  return { w, h, data: out };
}
/** Pixel comparison: identical, or the count of differing pixels, the largest channel delta and a bounding box of the differences. */
export function comparePng(a, b) {
  if (a.equals(b)) return { identical: true, bytesEqual: true };
  const A = decodePng(a), B = decodePng(b);
  if (A.w !== B.w || A.h !== B.h) return { identical: false, bytesEqual: false, sizeDiffers: true, a: [A.w, A.h], b: [B.w, B.h] };
  let n = 0, maxD = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1, bigN = 0;
  for (let i = 0; i < A.w * A.h; i++) {
    const o = i * 4; let d = 0; for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(A.data[o + k] - B.data[o + k]));
    if (d) { n++; if (d > maxD) maxD = d; if (d > 48) bigN++; const x = i % A.w, y = (i / A.w) | 0; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  }
  return { identical: n === 0, bytesEqual: false, pixels: A.w * A.h, differing: n, differingShare: +(n / (A.w * A.h)).toFixed(6), maxChannelDelta: maxD, strongDiffering: bigN, bbox: n ? [x0, y0, x1, y1] : null };
}

function compareDirs(dirA, dirB) {
  const ja = JSON.parse(fs.readFileSync(path.join(dirA, 'shots.json'), 'utf8')); const jb = JSON.parse(fs.readFileSync(path.join(dirB, 'shots.json'), 'utf8'));
  const names = [...new Set([...Object.keys(ja.shots), ...Object.keys(jb.shots)])].sort();
  const rows = [];
  for (const n of names) {
    if (!ja.shots[n] || !jb.shots[n]) { rows.push({ shot: n, missing: !ja.shots[n] ? 'A' : 'B' }); continue; }
    if (ja.shots[n].sha256 === jb.shots[n].sha256) { rows.push({ shot: n, identical: true, bytesEqual: true }); continue; }
    rows.push({ shot: n, ...comparePng(fs.readFileSync(path.join(dirA, `${n}.png`)), fs.readFileSync(path.join(dirB, `${n}.png`))) });
  }
  return rows;
}

// ------------------------------------------------------------------------------------------------ capture
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
async function waitHttp(url, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fetch(url); if (r.ok) return; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 150)); } throw new Error(`server not up: ${url}`); }

async function capture() {
  const req = createRequire(import.meta.url);
  let playwright; try { playwright = req('playwright'); } catch { playwright = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'))('playwright'); }
  fs.mkdirSync(OUT, { recursive: true });
  const git = (c) => { try { return execSync(`git -C ${ROOT} ${c}`).toString().trim(); } catch { return null; } };
  const scenes = await precomputeAll({ plays: 8, simPasses: 1, only: SCENES });
  const port = await freePort(); const URL = `http://127.0.0.1:${port}/`;
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const shots = {}; const errors = [];
  try {
    await waitHttp(URL);
    const browser = await playwright.chromium.launch({ headless: true, channel: 'chromium' });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
    await ctx.addInitScript(() => { globalThis.__gbRenderPerf = {}; });
    const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(URL); await page.waitForFunction(() => globalThis.__gb && globalThis.__gb.storage && globalThis.__gb.storage.mode !== 'starting', null, { timeout: 60000 });
    await page.evaluate(() => import('/tools/perf/render/driver.js').then((m) => { globalThis.__rpDriver = m; }));
    await page.evaluate(() => globalThis.__rpDriver.setupFootball({ seed: 3, stopWeek: 3 }));
    // Wall-time presentation off: CSS animations and transitions (callout pop, score bump, weather drift, shake) are not what is compared.
    await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }' });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const settle = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
    async function shot(name, { full = false } = {}) {
      await settle();
      const buf = full ? await page.screenshot({ fullPage: false, animations: 'disabled', caret: 'hide' }) : await page.locator('#fieldwrap').screenshot({ animations: 'disabled', caret: 'hide' });
      fs.writeFileSync(path.join(OUT, `${name}.png`), buf); shots[name] = { sha256: sha(buf), bytes: buf.length, full };
      process.stdout.write(`  ${name} ${shots[name].sha256.slice(0, 12)}\n`);
    }
    const RPset = (expr) => page.evaluate(expr);
    /** Hold the playback at fixed frames and photograph them; `prefix` names the images. The clock then runs out and the play ends. */
    async function holdFrames(prefix, extra = []) {
      const info = await page.evaluate(() => globalThis.__gbRenderPerf.animInfo()); if (!info) return false;
      const n = info.frames; const at = (idx, half) => info.start + idx * info.msPerFrame + (half ? 0.6 : 0.1) * info.msPerFrame;
      const want = new Map([[`${0}:0`, 'f0'], [`${Math.min(2, n - 1)}:1`, 'f2h'], [`${Math.floor((n - 1) / 2)}:0`, 'mid'], [`${n - 1}:0`, 'last']]);
      extra.forEach(([idx, half], i) => { const k = `${Math.max(0, Math.min(n - 1, idx))}:${half}`; if (!want.has(k)) want.set(k, `ab${i + 1}`); }); // frames while an ability effect plays
      // Every key in order (a camera-following play integrates its camera over the drawn keys, so the sequence must be the real one).
      for (let idx = 0; idx < n; idx++) for (const half of [0, 1]) {
        if (idx === n - 1 && half) break;
        await page.evaluate((t) => { globalThis.__gbRenderPerf.clock = () => t; }, at(idx, half)); await settle();
        const w = want.get(`${idx}:${half}`); if (w) await shot(`${prefix}-${w}`);
      }
      if (info.hasFx) { await page.evaluate((t) => { globalThis.__gbRenderPerf.clock = () => t; }, info.start + (n - 1 + 1.5) * info.msPerFrame); await settle(); if ((await page.evaluate(() => globalThis.__gbRenderPerf.animInfo()))?.hold > 0.15) await shot(`${prefix}-hold`); }
      await page.evaluate(() => { globalThis.__gbRenderPerf.clock = () => 1e12; });
      for (let i = 0; i < 200 && await page.evaluate(() => globalThis.__gbRenderPerf.matchBusy()); i++) await settle();
      await page.evaluate(() => { globalThis.__gbRenderPerf.clock = null; });
      return true;
    }
    // 1. the live game, by hand
    await RPset(() => { globalThis.__gbRenderPerf.clock = () => 0; });
    await shot('live-00-before-kickoff', { full: true });
    for (let step = 1; step <= LIVE_STEPS; step++) {
      await RPset(() => { globalThis.__gbRenderPerf.clock = () => 0; }); // frozen before the frame: the play holds at frame 0
      const did = await page.evaluate(() => {
        const q = (s) => document.querySelector(s); const click = (el) => { el.click(); return true; };
        const close = q('.sheet [data-action="sheet-close"]'); if (close) click(close);
        if (q('#controls [data-action="kickoff"]')) return click(q('#controls [data-action="kickoff"]')) && 'kickoff';
        if (q('#controls [data-action="continue"]')) return click(q('#controls [data-action="continue"]')) && 'continue';
        if (q('#controls [data-action="trykick"]')) return click(q('#controls [data-action="trykick"]')) && 'trykick';
        const snap = q('#controls [data-action="snap"]'); if (snap) { if (snap.disabled) { const card = q('#controls .card'); if (card) click(card); } const s2 = q('#controls [data-action="snap"]'); if (s2 && !s2.disabled) return click(s2) && 'snap'; }
        if (q('#controls [data-action="punt"]')) return click(q('#controls [data-action="punt"]')) && 'punt';
        return null;
      });
      await settle();
      const p = `live-${String(step).padStart(2, '0')}-${did || 'none'}`;
      if (await page.evaluate(() => globalThis.__gbRenderPerf.matchBusy())) { await shot(`${p}-start-screen`, { full: true }); await holdFrames(p); }
      await RPset(() => { globalThis.__gbRenderPerf.clock = null; });
      await shot(`${p}-end-screen`, { full: true });
    }
    // 2. precomputed plays through the match screen's playback (the harness's own plays)
    for (const sc of scenes.filter((s) => s.kind === 'football')) {
      for (let i = 0; i < Math.min(PLAYS, sc.plays.length); i++) {
        const p = sc.plays[i]; const name = `${sc.id.split('-')[0]}-p${i}`;
        await RPset(() => { globalThis.__gbRenderPerf.clock = () => 0; });
        const ok = await page.evaluate(([play]) => {
          const lookup = (team, slot) => { const m = (team === 'off' ? play.off : play.def)?.[slot]; if (!m) return null; return { element: m.type || null, name: m.name, species: m.species || null }; };
          return globalThis.__gbRenderPerf.playMatch({ kind: 'play', sim: play.sim, offenseSide: 'home', toGo: 10, text: `Shot play: ${play.sim.result} ${play.sim.yards}` }, { lookup: globalThis.__rpDriver.lookupFor ? globalThis.__rpDriver.lookupFor(play) : lookup });
        }, [{ sim: p.sim, off: p.off, def: p.def }]);
        if (!ok) continue;
        await settle(); await shot(`${name}-start-screen`, { full: true });
        // Two frames shortly after the first ability activations of the play (badge, effect, label on screen).
        const abil = (p.sim.events || []).filter((e) => e.kind === 'ability' && !e.trait).slice(0, 2).map((e) => [Math.floor((e.t ?? 0) * 10) + 2, 0]);
        await holdFrames(name, abil);
        await shot(`${name}-end-screen`, { full: true });
      }
    }
    await browser.close();
  } finally { server.kill(); }
  const meta = { tool: 'tools/perf/render/shots.mjs', commit: git('rev-parse --short HEAD'), dirty: !!git('status --porcelain'), at: new Date().toISOString(), viewport: '390x844 DPR 3', liveSteps: LIVE_STEPS, plays: PLAYS, scenes: SCENES, pageErrors: errors };
  fs.writeFileSync(path.join(OUT, 'shots.json'), JSON.stringify({ meta, shots }, null, 1));
  console.log(`[shots] ${Object.keys(shots).length} images in ${OUT}${errors.length ? `; PAGE ERRORS: ${errors.join(' | ')}` : ''}`);
}

function report(rows) {
  const id = rows.filter((r) => r.identical).length;
  for (const r of rows) console.log(`  ${r.shot.padEnd(28)} ${r.missing ? `MISSING in ${r.missing}` : r.identical ? 'identical' : r.sizeDiffers ? `SIZE DIFFERS ${r.a} vs ${r.b}` : `DIFFERS: ${r.differing} px (${(r.differingShare * 100).toFixed(4)}%), max channel delta ${r.maxChannelDelta}, ${r.strongDiffering} px over 48, bbox ${r.bbox}`}`);
  console.log(`[shots] ${id} of ${rows.length} identical`);
  return rows;
}

if (COMPARE_ONLY) { report(compareDirs(COMPARE_ONLY[0], COMPARE_ONLY[1])); }
else {
  if (!OUT) { console.error('usage: shots.mjs --out=DIR [--compare=DIR0]'); process.exit(2); }
  await capture();
  if (COMPARE) { const rows = report(compareDirs(COMPARE, OUT)); fs.writeFileSync(path.join(OUT, 'compare.json'), JSON.stringify({ against: COMPARE, rows }, null, 1)); }
}
