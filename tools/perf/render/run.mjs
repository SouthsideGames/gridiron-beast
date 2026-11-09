#!/usr/bin/env node
// Frame-time harness: the one command (docs/task8/RENDER_PERF.md).
//
//   node tools/perf/render/run.mjs [--modes=render,combined,live] [--repeats=3] [--warmup=1] [--plays=8] [--scenes=F1,F2,...]
//        [--configs=full,min-probe,simple] [--combined-configs=full] [--live-configs=full,simple] [--live-steps=14] [--live-warmup=2]
//        [--throttle=1,4] [--sim-passes=3] [--headless=new|shell] [--label=TEXT] [--out=FILE] [--no-profile] [--no-attribution]
//        [--attribution-scene=F2-multi-ability]
//
// Three measurements, reported separately (spec §26):
//   SIMULATION  the game logic per play: Node, before any timing (precompute.mjs), and in the page inside the combined and live runs.
//   RENDERING   (mode `render`) precomputed plays and battles played back in real time by the real match screen / Clash arena; the
//               page simulates nothing.
//   COMBINED    (mode `combined`) the same scenes, but every snap / battle is simulated in the page at the moment it is played, then
//               played by the same screen: simulation and rendering together on the main thread, as in a match. Checked to be the
//               same plays as render mode (light fingerprints).
//   LIVE        (mode `live`) the real franchise Sunday game on the real match screen in Auto: the screen's own act() -> step() ->
//               startAnim, Auto timer, saves and re-renders. Nothing staged; the same game every block (restored kickoff state).
//
// 1. Precompute (Node): every football play and Clash battle is simulated before any timing; Node simulation time per play.
// 2. Serve the repository (python3 -m http.server) and open the real game (index.html) in Playwright's Chromium at 390x844, DPR 3,
//    touch, with the inert render-perf hook enabled (globalThis.__gbRenderPerf).
// 3. For every repeat x mode x scene x CPU throttle x configuration: real-time playback, requestAnimationFrame timestamps per frame,
//    a Chrome trace over the recorded windows (main-thread self time by group, long tasks), CDP Performance.getMetrics, and the
//    machine load over the same block.
// 4. Draw profile (once per football scene and configuration) and script attribution (a sampling CPU profile of one block per mode,
//    bucketed by subsystem: simulation, save, field draw, screen render...), unthrottled, outside the timed blocks.
// 5. JSON to --out (default tools/out/render-perf/render-perf-<stamp>.json) and summary tables on stdout.
//
// Defaults are the fixed protocol for the official run. Any run on a busy machine is PRELIMINARY (the JSON records the load).
// Machine accounting (methodology correction 2026-11-08, docs/task8/PERF_SCENES.md section 1.1, tools/perf/machine.mjs): per block,
// competing CPU = process CPU from /proc/stat (user + nice + system) - the harness's own process tree (this process, the browser, the
// server); steal from /proc/stat. A block is quiet when competing <= 0.05 CPU and steal <= 0.05 CPU; the load averages and the
// older shares (busyShare, harnessShare, foreignShare: shares of all CPUs' time) are kept unchanged for compatibility. Every block
// and every summary row carries a quality label: GOOD, or PROVISIONAL with the reasons (not quiet, fewer than 3 repeats, or a
// repeat-to-repeat spread of the mean or p95 frame time over 10% of its median). The run's meta.status is computed from them.
// CPU throttle 4x is desktop emulation (an approximate indicator only), never a mobile measurement.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { precomputeAll } from './precompute.mjs';
import { aggregateTrace, TRACE_CATEGORIES } from './trace.mjs';
import { procStat, QUIET, loadReasons, CLK_TCK } from '../machine.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '..', '..', '..');
const req = createRequire(import.meta.url);
let playwright; try { playwright = req('playwright'); } catch { playwright = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'))('playwright'); }

const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`) || x === `--${k}`); return a ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) : d; };
const list = (v) => String(v).split(',').map((x) => x.trim()).filter(Boolean);
const OPT = {
  modes: list(arg('modes', 'render,combined,live')),
  repeats: Number(arg('repeats', 3)), warmup: Number(arg('warmup', 1)), plays: Number(arg('plays', 8)), simPasses: Number(arg('sim-passes', 3)),
  scenes: arg('scenes') ? list(arg('scenes')) : null, configs: list(arg('configs', 'full,min-probe,simple')), combinedConfigs: list(arg('combined-configs', 'full')),
  liveConfigs: list(arg('live-configs', 'full,simple')), liveSteps: Number(arg('live-steps', 14)), liveWarmup: Number(arg('live-warmup', 2)),
  throttle: list(arg('throttle', '1,4')).map(Number), headless: arg('headless', 'new'), label: arg('label', ''), profile: !arg('no-profile'), attribution: !arg('no-attribution'), attributionScene: arg('attribution-scene', 'F2-multi-ability'),
};
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = path.resolve(arg('out', path.join(ROOT, 'tools/out/render-perf', `render-perf-${stamp}.json`)));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

/** The probe configurations. Only `full` and `simple` are what a player can see; `min-probe` exists for attribution only. */
export const CONFIGS = {
  full: { football: { reducedMotion: false, markers: 'sprites' }, clash: { reducedMotion: false, quality: 'full' }, note: 'default settings: monster art, effects full (football fxQuality "full"); Clash as the franchise battle screen mounts it' },
  'min-probe': { football: { reducedMotion: true, markers: 'sprites' }, clash: { reducedMotion: true, quality: 'full' }, note: 'MEASUREMENT PROBE, not a player-visible mode: football plays animated with fxQuality "min" (badges and labels only, no particles, no signature looks, no status marks, no weather layer, no shake). A player with Reduce motion on sees no play animation at all. Clash: Reduce motion on (a player setting; the arena still plays)' },
  simple: { football: { reducedMotion: false, markers: 'simple' }, clash: { reducedMotion: false, quality: 'low' }, note: 'football: the player setting "Players on the field: Simple circles and squares" (no sprites, fxQuality "low": half the particles). Clash: effects quality "low" (a Clash Lab option only, not a franchise setting)' },
};
/** Platform labels (spec §14 / owner ruling): what a row may be called. */
const PLATFORM = (rate) => (rate === 1 ? 'verified desktop' : `desktop CPU-throttled ${rate}x (approximate indicator only)`);

// ------------------------------------------------------------------------------------------------ machine load
function procTicks() {
  const m = new Map();
  for (const d of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(d)) continue;
    try { const s = fs.readFileSync(`/proc/${d}/stat`, 'utf8'); const r = s.lastIndexOf(')'); const comm = s.slice(s.indexOf('(') + 1, r); const f = s.slice(r + 2).split(' ');
      m.set(Number(d), { comm, ppid: Number(f[1]), ticks: Number(f[11]) + Number(f[12]) }); } catch { /* gone */ }
  }
  return m;
}
function cpuStat() { const l = fs.readFileSync('/proc/stat', 'utf8').split('\n')[0].trim().split(/\s+/).slice(1).map(Number); const idle = l[3] + (l[4] || 0); return { total: l.reduce((a, b) => a + b, 0), idle }; }
function loadStart() { return { at: Date.now(), cpu: cpuStat(), stat: procStat(), procs: procTicks(), loadavg: os.loadavg() }; }
function loadEnd(s) {
  const cpu = cpuStat(); const procs = procTicks(); const dt = cpu.total - s.cpu.total;
  const mine = new Set([process.pid]); let grew = true; while (grew) { grew = false; for (const [pid, p] of procs) if (!mine.has(pid) && mine.has(p.ppid)) { mine.add(pid); grew = true; } }
  let own = 0, foreign = 0; const top = [];
  for (const [pid, p] of procs) { const b = s.procs.get(pid); const d = p.ticks - (b ? b.ticks : 0); if (d <= 0) continue; if (mine.has(pid)) own += d; else { foreign += d; top.push([p.comm, d]); } }
  const ncpu = os.cpus().length; const share = (x) => +(x / Math.max(1, dt)).toFixed(3); // share of all CPUs' time
  const agg = {}; for (const [c, d] of top) agg[c] = (agg[c] || 0) + d;
  // Corrected accounting (in CPUs; 1.0 = one whole CPU for the whole block): busy = user + nice + system (machine.mjs: interrupt
  // time is not charged to processes and is reported apart, irqCpus; idle, iowait and steal excluded); own = this
  // process tree; competing = busy - own (also counts processes this container cannot see, and the harness's children that exited
  // during the block, so it errs on the busy side).
  const sec = (Date.now() - s.at) / 1000; const st = procStat(); const per = (t) => t / CLK_TCK / Math.max(1e-9, sec);
  const acct = st && s.stat ? (() => { const busy = per(st.busy - s.stat.busy), ownC = per(own), steal = per(st.steal - s.stat.steal); const comp = Math.max(0, busy - ownC);
    const w = { available: true, busyCpus: +busy.toFixed(4), ownCpus: +ownC.toFixed(4), competingCpus: +comp.toFixed(4), competingRawCpus: +(busy - ownC).toFixed(4), stealCpus: +steal.toFixed(4), irqCpus: +per((st.irq + st.softirq) - (s.stat.irq + s.stat.softirq)).toFixed(4), userCpus: +per(st.user + st.nice - s.stat.user - s.stat.nice).toFixed(4), systemCpus: +per(st.system - s.stat.system).toFixed(4) };
    return { ...w, quiet: comp <= QUIET.competingCpus && steal <= QUIET.stealCpus }; })() : { available: false, quiet: false };
  return { seconds: +sec.toFixed(1), cpus: ncpu, busyShare: share(dt - (cpu.idle - s.cpu.idle)), harnessShare: share(own), foreignShare: share(foreign),
    foreignTop: Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, d]) => [c, share(d)]), loadavgStart: s.loadavg.map((x) => +x.toFixed(2)), loadavgEnd: os.loadavg().map((x) => +x.toFixed(2)),
    ...acct, notQuiet: loadReasons(acct) };
}
const NOISE = 0.10;

// ------------------------------------------------------------------------------------------------ mobile availability
/** Is there anything to verify mobile on? A Capacitor project in the repository, or a device attached. Recorded, never estimated. */
function mobileStatus() {
  const has = (p) => fs.existsSync(path.join(ROOT, p));
  let pkg = {}; try { pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')); } catch { /* none */ }
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const capacitor = { config: ['capacitor.config.json', 'capacitor.config.ts', 'capacitor.config.js'].filter(has), android: has('android'), ios: has('ios'), packages: Object.keys(deps).filter((d) => d.startsWith('@capacitor/')) };
  const tool = (c) => { try { return execSync(`command -v ${c}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null; } catch { return null; } };
  const adb = tool('adb'); let androidDevices = [];
  if (adb) { try { androidDevices = execSync('adb devices', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 }).toString().split('\n').slice(1).map((l) => l.trim()).filter((l) => /\tdevice$/.test(l)); } catch { /* none */ } }
  const iosTool = tool('xcrun') || tool('idevice_id');
  const project = capacitor.config.length > 0 || capacitor.packages.length > 0;
  const device = androidDevices.length > 0;
  return { capacitorProject: project, capacitor, adb: !!adb, androidDevices, iosTooling: !!iosTool,
    status: device && project ? 'actual mobile device (available; not measured by this harness)' : 'mobile NOT VERIFIED',
    reason: project ? (device ? null : 'a Capacitor project exists but no device is attached') : `no Capacitor project in the repository (no capacitor.config.*, no android/ or ios/, no @capacitor/* package)${device ? '' : ' and no mobile device attached (no adb devices, no iOS tooling)'}` };
}

// ------------------------------------------------------------------------------------------------ frame statistics
const q = (s, p) => (s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))] : null);
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const median = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
/** Frame times = deltas between consecutive rAF timestamps whose later frame falls inside the run (after t0). */
function frameStats(runs) {
  const d = []; let dur = 0, draws = 0, longTasks = 0, longMs = 0, startSpikes = 0, endSpikes = 0;
  for (const r of runs) {
    const ts = r.frames; for (let i = 1; i < ts.length; i++) if (ts[i] > r.t0) { const x = ts[i] - ts[i - 1]; d.push(x); if (x > 33.4 && ts[i] - r.t0 < 250) startSpikes++; if (x > 33.4 && ts[i] > r.t1 - 1) endSpikes++; }
    dur += r.t1 - r.t0; draws += r.draws.length; longTasks += r.longtasks.length; longMs += r.longtasks.reduce((a, x) => a + x[1], 0);
  }
  const s = [...d].sort((a, b) => a - b); const sum = d.reduce((a, b) => a + b, 0); const st = runs.map((r) => r.startMs).filter((x) => x != null).sort((a, b) => a - b);
  const sims = runs.map((r) => r.simMs).filter((x) => x != null).sort((a, b) => a - b);
  return { frames: d.length, seconds: r2(dur / 1000), meanMs: r2(sum / Math.max(1, d.length)), medianMs: r2(q(s, 0.5)), p95Ms: r2(q(s, 0.95)), p99Ms: r2(q(s, 0.99)), maxMs: r2(s[s.length - 1]),
    avgFps: r2(d.length / Math.max(1e-9, sum / 1000)), share20: r2(d.filter((x) => x <= 20).length / Math.max(1, d.length)), share40: r2(d.filter((x) => x <= 40).length / Math.max(1, d.length)),
    over33: d.filter((x) => x > 33.4).length, over50: d.filter((x) => x > 50).length, over33AtStart: startSpikes, over33AtEnd: endSpikes, fieldDrawsPerSec: r2(draws / Math.max(1e-9, dur / 1000)),
    playStartMedianMs: st.length ? r2(q(st, 0.5)) : null, playStartMaxMs: st.length ? r2(st[st.length - 1]) : null,
    pageSimMedianMs: sims.length ? r2(q(sims, 0.5)) : null, pageSimMaxMs: sims.length ? r2(sims[sims.length - 1]) : null, longTasksObserved: longTasks, longTaskMs: r2(longMs) };
}

// ------------------------------------------------------------------------------------------------ script attribution (CPU profile)
/** Which subsystem a sampled stack belongs to: the first source match walking from the leaf up (native leaves inherit). */
const BUCKETS = [
  ['harness', (u) => u.includes('/tools/perf/')],
  ['simulation', (u) => /\/src\/(sim|clash)\//.test(u)],
  ['save', (u) => /\/src\/franchise\/(store|pack|save|cloud-save)\.js/.test(u)],
  ['field draw (playback tick, field-view, effects, sprites)', (u, fn) => /\/src\/ui\/(field-view|ability-fx|sprite16|pixel-monster|kick-anim)\.js/.test(u) || (/\/src\/ui\/screens\/match\.js/.test(u) && fn === 'tick')],
  ['Clash arena (DOM, canvas fx)', (u) => u.includes('/src/ui/clash/')],
  ['screen render and other UI', (u) => u.includes('/src/ui/')],
  ['franchise and data (lineups, sprites lookups)', (u) => /\/src\/(franchise|data|core)\//.test(u)],
];
function profileBuckets(profile) {
  const byId = new Map(profile.nodes.map((n) => [n.id, n])); const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const memo = new Map();
  const bucketOf = (id) => {
    if (memo.has(id)) return memo.get(id);
    const n = byId.get(id); const fn = n.callFrame.functionName; const u = n.callFrame.url || '';
    let b = null;
    if (fn === '(idle)') b = 'idle'; else if (fn === '(program)') b = 'browser (program: style, layout, paint, parse not attributed to script)'; else if (fn === '(garbage collector)') b = 'garbage collector';
    else if (u) { const hit = BUCKETS.find(([, t]) => t(u, fn)); if (hit) b = hit[0]; }
    if (!b) { const p = parent.get(id); b = p != null ? bucketOf(p) : 'other'; }
    memo.set(id, b); return b;
  };
  const ms = {}; const dts = profile.timeDeltas;
  for (let i = 0; i < profile.samples.length; i++) { const b = bucketOf(profile.samples[i]); ms[b] = (ms[b] || 0) + (dts[i] || 0) / 1000; }
  const total = (profile.endTime - profile.startTime) / 1000;
  return { seconds: r2(total / 1000), msPerSec: Object.fromEntries(Object.entries(ms).sort((a, b) => b[1] - a[1]).map(([k, x]) => [k, r2(x / (total / 1000))])) };
}

// ------------------------------------------------------------------------------------------------ main
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
async function waitHttp(url, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fetch(url); if (r.ok) return; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 150)); } throw new Error(`server not up: ${url}`); }

async function main() {
  const git = (c) => { try { return execSync(`git -C ${ROOT} ${c}`).toString().trim(); } catch { return null; } };
  const L00 = loadStart(); await new Promise((r) => setTimeout(r, 3000)); const idleLoad = loadEnd(L00); // the machine before the harness does anything
  const meta = { harness: 'tools/perf/render/run.mjs', doc: 'docs/task8/RENDER_PERF.md', label: OPT.label, startedAt: new Date().toISOString(), commit: git('rev-parse --short HEAD'), branch: git('rev-parse --abbrev-ref HEAD'), dirty: !!git('status --porcelain'),
    options: OPT, host: { cpus: os.cpus().length, model: os.cpus()[0]?.model, memGB: +(os.totalmem() / 2 ** 30).toFixed(1), platform: `${os.platform()} ${os.release()}`, node: process.version }, idleLoad,
    mobile: mobileStatus(),
    status: 'PRELIMINARY unless run on a quiet machine (see load per block). Headless desktop Chromium; not a phone; 4x CPU throttle is desktop emulation (an approximate indicator only), not mobile verification.' };
  console.log(`[render-perf] machine before start: competing ${idleLoad.competingCpus ?? '-'} CPU, steal ${idleLoad.stealCpus ?? '-'} CPU${idleLoad.quiet ? ' (quiet)' : ' (NOT QUIET)'}; busy ${idleLoad.busyShare} (foreign ${idleLoad.foreignShare}), loadavg ${idleLoad.loadavgEnd.join(' ')}; mobile: ${meta.mobile.status}${meta.mobile.reason ? ` (${meta.mobile.reason})` : ''}`);
  console.log(`[render-perf] precompute (sim passes ${OPT.simPasses}, plays per scene ${OPT.plays})`);
  const pre0 = loadStart(); const scenes = await precomputeAll({ plays: OPT.plays, simPasses: OPT.simPasses, only: OPT.scenes }); meta.precomputeLoad = loadEnd(pre0);
  for (const s of scenes) console.log(`  ${s.id}: sim ${s.kind === 'clash' ? `${s.sim.msPerBattle} ms/battle` : `${s.sim.medianMsPerPlay} ms/play median (chosen ${s.sim.chosenMedianMsPerPlay})`}${s.plays ? `, ${s.plays.length} plays, ${s.plays.reduce((a, p) => a + p.info.frames, 0)} engine frames` : ''}`);
  const wantLive = OPT.modes.includes('live') && (!OPT.scenes || OPT.scenes.some((p) => 'L1-franchise-auto'.startsWith(p)));

  const port = await freePort(); const URL = `http://127.0.0.1:${port}/`;
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const results = []; const profiles = []; const checks = []; const attribution = [];
  try {
    await waitHttp(URL);
    const launch = OPT.headless === 'shell' ? { headless: true } : { headless: true, channel: 'chromium' }; // 'chromium' channel = the full browser in new headless mode
    const browser = await playwright.chromium.launch(launch);
    meta.browser = { version: browser.version(), mode: OPT.headless === 'shell' ? 'chromium-headless-shell' : 'chromium new headless' };
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => { globalThis.__gbRenderPerf = {}; });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Performance.enable', { timeDomain: 'timeTicks' });
    await page.goto(URL); await page.waitForFunction(() => globalThis.__gb && globalThis.__gb.storage && globalThis.__gb.storage.mode !== 'starting', null, { timeout: 60000 });
    await page.evaluate(() => import('/tools/perf/render/driver.js').then((m) => { globalThis.__rpDriver = m; }));
    console.log('[render-perf] franchise setup');
    meta.setup = await page.evaluate(() => globalThis.__rpDriver.setupFootball({ seed: 3, stopWeek: 3 }));
    meta.liveStart = await page.evaluate(() => globalThis.__rpDriver.liveSnapshotTake());
    meta.screen = await page.evaluate(() => ({ dpr: devicePixelRatio, w: innerWidth, h: innerHeight, field: (() => { const r = document.querySelector('#field')?.getBoundingClientRect(); return r ? [Math.round(r.width), Math.round(r.height)] : null; })(), ua: navigator.userAgent }));

    const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
    async function trace(fn) {
      const chunks = []; const onData = (d) => { for (const e of d.value) chunks.push(e); }; cdp.on('Tracing.dataCollected', onData);
      await cdp.send('Tracing.start', { categories: TRACE_CATEGORIES, transferMode: 'ReportEvents' });
      let value, err = null; try { value = await fn(); } catch (e) { err = e; }
      const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r)); await cdp.send('Tracing.end'); await done; cdp.off('Tracing.dataCollected', onData);
      if (err) throw err; return { value, events: chunks };
    }
    const playsOf = (sc) => sc.plays.map((p) => ({ sim: p.sim, off: p.off, def: p.def }));
    /** One measured block. Returns the row. */
    async function block(mode, sc, cfgName, rate, rep) {
      const cfg = CONFIGS[cfgName]; await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      if (sc.kind === 'football' || sc.kind === 'live') await page.evaluate((c) => globalThis.__rpDriver.applyConfig(c), cfg.football);
      await page.waitForTimeout(500);
      const m0 = await metrics(); const L = loadStart();
      const run = () => {
        if (mode === 'render') return sc.kind === 'football'
          ? page.evaluate(([plays, o]) => globalThis.__rpDriver.playFootball(plays, o), [playsOf(sc), { warmup: OPT.warmup }]).then((runs) => ({ runs }))
          : page.evaluate(([b, o]) => globalThis.__rpDriver.playClash(b, o), [sc.battle, { ...cfg.clash, warmup: OPT.warmup }]).then((runs) => ({ runs }));
        if (mode === 'combined') {
          if (sc.kind === 'clash') return page.evaluate((o) => globalThis.__rpDriver.combinedClash(o), { inputs: sc.inputs, seed: sc.def.seed, ...cfg.clash, warmup: OPT.warmup });
          if (sc.review) return page.evaluate((o) => globalThis.__rpDriver.combinedSovereign(o), { ...sc.review, warmup: OPT.warmup });
          return page.evaluate((o) => globalThis.__rpDriver.combinedFootball(o), { source: sc.source, variant: sc.variant, chosen: sc.plays.map((p) => [p.info.gs, p.info.k]), warmup: OPT.warmup });
        }
        return page.evaluate((o) => globalThis.__rpDriver.liveFranchise(o), { steps: OPT.liveSteps, warmup: OPT.liveWarmup, cfg: cfg.football });
      };
      const { value, events } = await trace(run);
      const load = loadEnd(L); const m1 = await metrics();
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const tr = aggregateTrace(events);
      const dm = (k) => r2(((m1[k] || 0) - (m0[k] || 0)) * 1000);
      // Identity: combined mode must have simulated exactly the plays render mode plays; live blocks must all play the same game.
      let identity = null;
      if (mode === 'combined') {
        const got = sc.kind === 'clash' ? value.light[0] : sc.review ? value.light.join('\n') : sha(value.light.join('\n'));
        const want = sc.kind === 'clash' ? sc.fingerprint : sc.review ? sc.review.light.join('\n') : sc.fingerprint;
        identity = { ok: got === want, got: sc.review ? sha(got) : got, want: sc.review ? sha(want) : want };
        checks.push({ mode, scene: sc.id, config: cfgName, throttle: rate, repeat: rep, ...identity });
        if (!identity.ok) console.log(`  !! ${sc.id} combined: simulated plays differ from the precomputed scene (${identity.got} vs ${identity.want})`);
      }
      if (mode === 'live') {
        const fp = sha(value.light.join('\n')); const first = checks.find((c) => c.mode === 'live');
        identity = { ok: !first || first.got === fp, got: fp, want: first ? first.got : fp };
        checks.push({ mode, scene: sc.id, config: cfgName, throttle: rate, repeat: rep, ...identity });
        if (!identity.ok) console.log(`  !! live game differs from the first live block (${fp} vs ${first.got})`);
      }
      const runs = mode === 'live' ? value.inPlay : value.runs;
      const row = { mode, scene: sc.id, config: cfgName, throttle: rate, platform: PLATFORM(rate), repeat: rep, frames: frameStats(runs), trace: tr,
        cdpMetricsMs: { script: dm('ScriptDuration'), layout: dm('LayoutDuration'), recalcStyle: dm('RecalcStyleDuration'), task: dm('TaskDuration') }, load, identity,
        quality: { label: load.notQuiet.length ? 'PROVISIONAL' : 'GOOD', reasons: load.notQuiet } };
      if (mode === 'live') { row.sessionFrames = frameStats(value.session); row.liveSteps = value.steps; row.liveSituation = value.situation; }
      results.push(row);
      const f = row.frames, t = tr.mainMs || {};
      console.log(`  ${mode.padEnd(8)} ${sc.id.padEnd(22)} ${cfgName.padEnd(9)} x${rate} r${rep}: avg ${f.meanMs} med ${f.medianMs} p95 ${f.p95Ms} ms (${f.avgFps} fps, <=20ms ${f.share20}) >33:${f.over33} >50:${f.over50}${f.pageSimMedianMs != null ? ` sim ${f.pageSimMedianMs}/${f.pageSimMaxMs}` : ''} | script ${t.script ?? '-'} gc ${t.gc ?? '-'} style ${t.style ?? '-'} layout ${t.layout ?? '-'} paint ${t.paint ?? '-'} ms, long ${tr.longTasks?.count ?? '-'} | load busy ${load.busyShare} foreign ${load.foreignShare} | competing ${load.competingCpus ?? '-'} steal ${load.stealCpus ?? '-'} CPU ${row.quality.label}`);
    }
    const LIVE = { id: 'L1-franchise-auto', kind: 'live', what: `the real franchise Sunday game (seed 3, week ${meta.setup.week}, ${meta.setup.club}) on the real match screen in Auto 1x: ${OPT.liveSteps} measured steps after ${OPT.liveWarmup} warm-up steps` };
    for (let rep = 1; rep <= OPT.repeats; rep++) {
      console.log(`[render-perf] repeat ${rep}/${OPT.repeats}`);
      for (const mode of OPT.modes) {
        if (mode === 'live') { if (wantLive) for (const rate of OPT.throttle) for (const cfgName of OPT.liveConfigs) await block('live', LIVE, cfgName, rate, rep); continue; }
        const cfgs = mode === 'combined' ? OPT.combinedConfigs : OPT.configs;
        for (const sc of scenes) for (const rate of OPT.throttle) for (const cfgName of cfgs) await block(mode, sc, cfgName, rate, rep);
      }
    }
    if (OPT.profile && OPT.modes.includes('render')) {
      console.log('[render-perf] draw profile (unthrottled, outside the timed blocks)');
      for (const sc of scenes.filter((s) => s.kind === 'football')) for (const cfgName of OPT.configs) {
        const cfg = CONFIGS[cfgName]; await page.evaluate((c) => globalThis.__rpDriver.applyConfig(c), cfg.football);
        const p = await page.evaluate(([plays, c]) => globalThis.__rpDriver.profileDraws(plays, c), [playsOf(sc), cfg.football]);
        profiles.push({ scene: sc.id, config: cfgName, ...p });
        console.log(`  ${sc.id.padEnd(22)} ${cfgName.padEnd(9)}: build ${r2(p.buildMs.mean)} (no fx ${r2(p.buildNoFxMs.mean)}) parse ${r2(p.parseMs.mean)} style+layout ${r2(p.styleLayoutMs.mean)} ms/draw; ${Math.round(p.chars.mean)} chars (no fx ${Math.round(p.charsNoFx.mean)}), ${Math.round(p.elements.mean)} elements (max ${p.elements.max})`);
      }
    }
    if (OPT.attribution) {
      // Script attribution: a sampling CPU profile (outside the timed blocks: the profiler adds overhead) of one block per mode at the
      // default configuration, unthrottled, bucketed by subsystem. It answers what the "script" share of the trace is made of.
      console.log('[render-perf] script attribution (CPU profile, unthrottled, outside the timed blocks)');
      const pick = scenes.find((s) => s.id === OPT.attributionScene) || scenes.find((s) => s.kind === 'football');
      const cfg = CONFIGS.full;
      const prof = async (label, fn) => { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 250 }); await cdp.send('Profiler.start'); await fn(); const { profile } = await cdp.send('Profiler.stop'); await cdp.send('Profiler.disable'); const b = profileBuckets(profile); attribution.push({ label, ...b }); console.log(`  ${label}: ${Object.entries(b.msPerSec).filter(([k]) => k !== 'idle').map(([k, x]) => `${k.split(' (')[0]} ${x}`).join(', ')} ms/s`); };
      if (pick) {
        await page.evaluate((c) => globalThis.__rpDriver.applyConfig(c), cfg.football);
        if (OPT.modes.includes('render')) await prof(`render ${pick.id} full`, () => page.evaluate(([plays, o]) => globalThis.__rpDriver.playFootball(plays, o), [playsOf(pick), { warmup: 0 }]));
        if (OPT.modes.includes('combined')) await prof(`combined ${pick.id} full`, () => page.evaluate((o) => globalThis.__rpDriver.combinedFootball(o), { source: pick.source, variant: pick.variant, chosen: pick.plays.map((p) => [p.info.gs, p.info.k]), warmup: 0 }));
      }
      if (wantLive) await prof('live L1-franchise-auto full', () => page.evaluate((o) => globalThis.__rpDriver.liveFranchise(o), { steps: OPT.liveSteps, warmup: OPT.liveWarmup, cfg: cfg.football }));
    }
    meta.pageErrors = errors;
    await browser.close();
    if (wantLive) scenes.push({ ...LIVE, sim: null });
  } finally { server.kill(); }

  // Summary: median over repeats of each block's statistics.
  const summary = [];
  const keys = [...new Set(results.map((r) => `${r.mode}|${r.scene}|${r.throttle}|${r.config}`))];
  for (const key of keys) {
    const [mode, sceneId, rateS, cfgName] = key.split('|'); const rate = Number(rateS); const sc = scenes.find((s) => s.id === sceneId);
    const rows = results.filter((r) => `${r.mode}|${r.scene}|${r.throttle}|${r.config}` === key);
    const F = (k, src = 'frames') => r2(median(rows.map((r) => r[src]?.[k]))); const T = (k) => r2(median(rows.map((r) => r.trace.mainMs?.[k] ?? 0)));
    const win = median(rows.map((r) => r.trace.windowMs));
    const nodeSim = sc?.kind === 'clash' ? sc.sim.msPerBattle : sc?.sim?.chosenMedianMsPerPlay ?? null;
    const liveSim = mode === 'live' ? (() => { const st = rows.flatMap((r) => r.liveSteps || []); const ms = st.map((x) => x.ms).sort((a, b) => a - b); return { steps: st.length / rows.length, medianMs: r2(q(ms, 0.5)), p95Ms: r2(q(ms, 0.95)), maxMs: r2(ms[ms.length - 1]), abilityEventsPerBlock: r2(st.reduce((a, x) => a + x.abilityEvents, 0) / rows.length), animatedSteps: r2(st.filter((x) => x.frames > 1).length / rows.length) }; })() : null;
    summary.push({ mode, scene: sceneId, config: cfgName, throttle: rate, platform: PLATFORM(rate), repeats: rows.length,
      simNodeMs: nodeSim, simPageMedianMs: mode === 'live' ? liveSim.medianMs : F('pageSimMedianMs'), simPageMaxMs: mode === 'live' ? liveSim.maxMs : F('pageSimMaxMs'), liveSim,
      meanMs: F('meanMs'), medianMs: F('medianMs'), p95Ms: F('p95Ms'), p99Ms: F('p99Ms'), maxMs: F('maxMs'), avgFps: F('avgFps'), share20: F('share20'), share40: F('share40'), over33: F('over33'), over50: F('over50'), over33AtStart: F('over33AtStart'), over33AtEnd: F('over33AtEnd'), frames: F('frames'), fieldDrawsPerSec: F('fieldDrawsPerSec'), playStartMedianMs: F('playStartMedianMs'), playStartMaxMs: F('playStartMaxMs'),
      session: mode === 'live' ? { meanMs: F('meanMs', 'sessionFrames'), medianMs: F('medianMs', 'sessionFrames'), p95Ms: F('p95Ms', 'sessionFrames'), over33: F('over33', 'sessionFrames'), over50: F('over50', 'sessionFrames'), seconds: F('seconds', 'sessionFrames') } : null,
      longTasks: median(rows.map((r) => r.trace.longTasks?.count ?? 0)), longTaskMaxMs: r2(median(rows.map((r) => r.trace.longTasks?.maxMs ?? 0))),
      mainMsPerSec: { script: r2(T('script') / (win / 1000)), gc: r2(T('gc') / (win / 1000)), style: r2(T('style') / (win / 1000)), layout: r2(T('layout') / (win / 1000)), paint: r2(T('paint') / (win / 1000)), parse: r2(T('parse') / (win / 1000)), other: r2(T('other') / (win / 1000)) },
      mainBusyShare: r2(median(rows.map((r) => r.trace.mainBusyShare))), foreignLoad: r2(median(rows.map((r) => r.load.foreignShare))), busyLoad: r2(median(rows.map((r) => r.load.busyShare))),
      competingCpus: r2(median(rows.map((r) => r.load.competingCpus))), competingCpusMax: r2(Math.max(...rows.map((r) => r.load.competingCpus ?? Infinity))), stealCpus: r2(median(rows.map((r) => r.load.stealCpus))), stealCpusMax: r2(Math.max(...rows.map((r) => r.load.stealCpus ?? Infinity))),
      quality: (() => { const why = []; const nq = rows.filter((r) => r.load.notQuiet.length); if (nq.length) why.push(`${nq.length} of ${rows.length} blocks not quiet (${[...new Set(nq.flatMap((r) => r.load.notQuiet.map((x) => x.split(' ')[0])))].join(', ')})`);
        if (rows.length < 3) why.push(`${rows.length} repeat${rows.length === 1 ? '' : 's'} (fewer than 3)`);
        for (const k of ['meanMs', 'p95Ms']) { const a = rows.map((r) => r.frames[k]).filter((x) => x != null); const m = median(a); if (a.length > 1 && m > 0 && (Math.max(...a) - Math.min(...a)) / m > NOISE) why.push(`noisy (${k} spread over repeats ${r2((Math.max(...a) - Math.min(...a)) / m)} of the median)`); }
        return { label: why.length ? 'PROVISIONAL' : 'GOOD', reasons: why }; })(),
      identityOk: rows.every((r) => r.identity == null || r.identity.ok) });
  }
  const nq = results.filter((r) => r.load.notQuiet.length);
  meta.quietRule = QUIET; meta.statusNote = meta.status;
  meta.status = `${nq.length ? `PRELIMINARY: ${nq.length} of ${results.length} blocks not quiet (competing CPU over ${QUIET.competingCpus} or steal over ${QUIET.stealCpus} CPU)` : `quiet machine (competing CPU <= ${QUIET.competingCpus} and steal <= ${QUIET.stealCpus} CPU in every block)`}; ${summary.filter((s) => s.quality.label !== 'GOOD').length} of ${summary.length} summary rows PROVISIONAL. ${meta.statusNote.replace(/^PRELIMINARY unless run on a quiet machine \(see load per block\)\. /, '')}`;
  console.log(`[render-perf] ${meta.status}`);
  const out = { meta: { ...meta, finishedAt: new Date().toISOString() }, configs: CONFIGS, scenes: scenes.map((s) => ({ id: s.id, kind: s.kind, source: s.source, variant: s.variant, what: s.what, fingerprint: s.fingerprint, sim: s.sim, plays: s.plays?.map((p) => p.info) })), summary, checks, profiles, attribution, blocks: results };
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log(`[render-perf] wrote ${path.relative(process.cwd(), OUT)}`);
  console.table(summary.map((s) => ({ mode: s.mode, scene: s.scene, cfg: s.config, cpu: `${s.throttle}x`, simNode: s.simNodeMs, simPage: s.simPageMedianMs, avg: s.meanMs, med: s.medianMs, p95: s.p95Ms, fps: s.avgFps, '<=20': s.share20, '>33': s.over33, '>50': s.over50, long: s.longTasks, 'script/s': s.mainMsPerSec.script, 'style+layout/s': r2(s.mainMsPerSec.style + s.mainMsPerSec.layout), 'paint/s': s.mainMsPerSec.paint, load: s.foreignLoad, competing: s.competingCpus, steal: s.stealCpus, quality: s.quality.label, id: s.identityOk ? 'ok' : 'DIFF' })));
}
main().catch((e) => { console.error(e); process.exit(1); });
