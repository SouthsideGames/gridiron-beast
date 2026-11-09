#!/usr/bin/env node
// Task 8 performance scenes, baseline v candidate (docs/task8/PERF_SCENES.md; scene set approved, owner ruling N8e, spec §26;
// methodology corrected 2026-11-08 under the owner's instructions of 19:17, PERF_SCENES.md section 1.1).
//
// The full official run, in one command (every ordinary scene, every ability scene with its abilities-off twin, the additions and
// the ability sub-measurements; JSON with every run):
//   node tools/perf/run-scenes.mjs --base=<main extract> --cand=<Task 8 build> --json=out.json [--label=TEXT]
// Options: --scenes=O1-pass-T,A1-...  (default: all)   --no-sub (skip the only:KEY sub-measurements)   --sub-repeats=N (default: repeats)
//          --warmup=3 --repeats=15 (the approved protocol; the manifest's values are the defaults)   --metric=cpu|ms|main   --noise=0.10
//          --settle=1 (discarded runs before every measured run, see below)   --bootstrap=2000 (resamples for the 95% intervals)
//
// metric: cpu (default, the approved metric) is the worker process's CPU time over the timed section (process.cpuUsage, user +
// system, every thread); ms is wall time; main is the main thread's CPU time alone (process.threadCpuUsage: without V8's helper
// threads). All three are recorded for every run; the wall and main-thread figures are reported beside the gate figure.
// DIR is a build root (a checkout or an archive extract). One long-lived worker per build, plus a separate candidate worker (the ability worker) for the abilities-on, the same-process abilities-off and the sub-measurement
// variants; the runner asks them in turn, never two at once. Every scene checks that both builds received identical inputs and that
// every run's fingerprint equals the first one's.
//
// Schedule (corrected 2026-11-08): `warmup` rounds then `repeats` rounds, the warm-up rounds identical to the measured ones (so both
// arms of every comparison get the same warm-up). Every measured run is preceded by `settle` discarded runs of the SAME variant in
// the same worker, so that no measured run is the first one after the worker was idle (a worker waits while the others run) or the
// first one after a different variant: both carry a cost from the previous state (more helper-thread CPU, sometimes a 3-5 x run;
// section 3.1) that otherwise lands on whichever arm comes first or second. Counterbalanced ABBA order: rounds 0 and 3 of every four
// run A then B, rounds 1 and 2 B then A, for the matched pair (A base, B cand) and for the same-process pair in the ability worker
// (A abilities off, B abilities on); the sub-measurements follow in an order that rotates every round.
//
// Figures (spec §26, Method B; every scene and every sub-measurement reported individually, never averaged):
//   R0 = cand / base on the same inputs, ratio of medians (unchanged gate figure): every ordinary scene and every abilities-off twin
//        against budgets.engine (1.10). Its uncertainty: the per-round paired ratios (median, IQR, bootstrap 95% interval).
//   R1 = abilities on / abilities off, both in the ability worker, paired per round: the median of the paired ratios is the figure
//        against budgets.ability (1.25, provisional), with IQR and bootstrap 95% interval; also the ratio of medians and the paired
//        median split by order (on first / off first).
//   Reported, not gated: R1cross (the old protocol R1: abilities on in the ability worker / abilities off in the matched worker),
//        processState (the twin in the ability worker / the twin in the matched worker), R2 = abilities on / base twin.
//   Decomposition (owner 19:17 item 3): R = per-step x volume, volume = actor-ticks(num) / actor-ticks(den) (ticks x mean actors on
//        the field; temporaries included), per-step = R / volume, i.e. the extra processing per actor-tick, and volume the extra work
//        from longer plays (ticks) and added actors. Also per tick (R / ticks ratio). Ticks and actors are deterministic, so the
//        interval of the per-step part is the interval of R divided by the volume.
// Machine (corrected 2026-11-08, tools/perf/machine.mjs): per scene, the process CPU from /proc/stat (user + nice + system; interrupt
// time recorded apart) minus the CPU of the runner and its three workers (/proc/<pid>/stat) = competing CPU; /proc/stat steal = steal. A scene is quiet when competing <= 0.05 CPU and
// steal <= 0.05 CPU. Load averages are still recorded (they include the benchmark's own processes, so they are not the rule).
// Quality label per result: GOOD only when the scene was quiet, neither job was noisy (IQR / median over --noise; the CV and the
// spikes are recorded), the paired ratios' IQR / median is within --noise and the 95% interval of the figure does not straddle the
// limit (nor do the paired median and the ratio of medians fall on different sides of it); otherwise PROVISIONAL with the reasons.
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fork } from 'node:child_process';
import { cpuWindow, loadReasons, QUIET, CLK_TCK } from './machine.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const MANIFEST = JSON.parse(fs.readFileSync(path.join(HERE, 'scenes.json'), 'utf8'));
// the ability sub-measurements of a scene (scene-worker.mjs subVariants; repeated here so the runner never loads a build's engine)
const W = { subVariants: (sc) => ['none', ...Object.keys(sc.abilities || {}), ...(sc.fields?.length ? ['fields'] : [])].map((k) => `only:${k}`) };
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`) || x === `--${k}`); return a ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) : d; };
const BASE = arg('base'), CAND = arg('cand') || path.join(HERE, '..', '..');
if (!BASE) { console.error('usage: run-scenes.mjs --base=DIR --cand=DIR [--json=out.json] [--scenes=a,b] [--no-sub] [--label=TEXT]'); process.exit(2); }
const WARMUP = Number(arg('warmup', MANIFEST.protocol.warmup)), REPEATS = Number(arg('repeats', MANIFEST.protocol.repeats));
const SUB_REPEATS = Number(arg('sub-repeats', REPEATS)), SUB = !arg('no-sub');
const NOISE = Number(arg('noise', MANIFEST.protocol.noise ?? 0.10)), SETTLE = Number(arg('settle', 1)), BOOT = Number(arg('bootstrap', 2000));
const ENGINE = MANIFEST.budgets?.engine ?? 1.10, ABILITY = MANIFEST.budgets?.ability ?? 1.25;
const METRIC = arg('metric', 'cpu'); if (!['cpu', 'ms', 'main'].includes(METRIC)) { console.error('--metric=cpu|ms|main'); process.exit(2); }
const ONLY = arg('scenes') ? new Set(String(arg('scenes')).split(',')) : null;
const scenes = MANIFEST.scenes.filter((s) => !ONLY || ONLY.has(s.id));

function worker(root, label) {
  const p = fork(path.join(HERE, 'scene-worker.mjs'), [`--root=${path.resolve(root)}`], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'], execArgv: process.execArgv });
  let seq = 0; const waiting = new Map(); let ready;
  const readyP = new Promise((r) => { ready = r; });
  p.on('message', (m) => { if (m.ready) return ready(m); const w = waiting.get(m.id); waiting.delete(m.id); if (m.ok) w.res(m.res); else w.rej(new Error(`${label}: ${m.error}`)); });
  return { label, pid: p.pid, ready: readyP, run: (scene, variant) => new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); p.send({ cmd: 'run', id, scene, variant }); }), close: () => p.send({ cmd: 'exit' }) };
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const q = (a, f) => { const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * f, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const cv = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1)) / m; };
const fx = (v, d = 2) => (v == null || !Number.isFinite(v) ? '-' : v.toFixed(d));
const load = () => ({ at: new Date().toISOString(), load1: os.loadavg()[0], load5: os.loadavg()[1], load15: os.loadavg()[2] });
const NCPU = os.cpus().length;
/** Seeded generator for the bootstrap (mulberry32), so a JSON's intervals can be reproduced from its runs. */
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
/** Percentile bootstrap 95% interval of the median of `x`. */
function bootMedian(x, seed = 1) { if (x.length < 2) return [x[0], x[0]]; const r = rng(seed); const m = []; for (let b = 0; b < BOOT; b++) { const s = Array.from(x, () => x[Math.floor(r() * x.length)]); m.push(median(s)); } return [q(m, 0.025), q(m, 0.975)]; }

/** One job's statistics: median (primary), spread, variability, the noisy flag and the work volume. */
function stats(runs, wallRuns, first, machineRuns, mainRuns = []) {
  const m = median(runs), iqr = q(runs, 0.75) - q(runs, 0.25), c = cv(runs);
  // per-run competing CPU (coarse: busy clock ticks over the timed section minus this run's own CPU; the other processes are idle)
  const comp = machineRuns.map((x, i) => (x ? Math.max(0, x.busyTicks * 1000 / CLK_TCK - x.cpu) / wallRuns[i] : null)).filter((x) => x != null);
  // noisy (corrected 2026-11-08): the robust spread of the statistic actually used (the median): IQR / median over --noise. The
  // coefficient of variation is recorded (cvOver: the old rule's second test) with the spikes (runs over 1.5 x the median), but no
  // longer flags a job by itself: one 3-5 x run in 15 pushes the CV over 0.10 without moving the median.
  return { median: m, min: Math.min(...runs), max: Math.max(...runs), q1: q(runs, 0.25), q3: q(runs, 0.75), iqrOverMedian: iqr / m, cv: c, cvOver: c > NOISE, spikes: runs.filter((x) => x > 1.5 * m).length, noisy: iqr / m > NOISE,
    msPerPlay: m / first.plays, ticksPerPlay: first.ticks / first.plays, msPerTick: m / first.ticks, msPerActorTick: m / first.actorTicks, actorsPerTick: first.actorTicks / first.ticks,
    plays: first.plays, ticks: first.ticks, actorTicks: first.actorTicks, pairTicks: first.pairTicks, abilityEvents: first.abilityEvents, fields: first.fields,
    fp: first.fp, runs, wallMedian: median(wallRuns), wallRuns, mainMedian: mainRuns.length && mainRuns.every((x) => x != null) ? median(mainRuns) : null, mainRuns, machineRuns, runCompetingCpusMedian: comp.length ? median(comp) : null };
}
/** A comparison num / den with its paired ratios, its verdict against `limit`, its quality label and its per-step / volume split. */
function ratio(num, den, numRuns, denRuns, limit, { gate = 'ratioOfMedians', order = null, seed = 1 } = {}) {
  const rom = num.median / den.median; const paired = numRuns.map((x, i) => x / denRuns[i]);
  const pm = median(paired), pq1 = q(paired, 0.25), pq3 = q(paired, 0.75), ci = bootMedian(paired, seed);
  const figure = gate === 'pairedMedian' ? pm : rom;
  const noisy = !!(num.noisy || den.noisy) || (pq3 - pq1) / pm > NOISE;
  const borderline = limit == null ? false : (ci[0] <= limit && ci[1] > limit) || (rom <= limit) !== (pm <= limit);
  const volTicks = num.ticks / den.ticks, volActor = num.actorTicks / den.actorTicks;
  const mainP = num.mainMedian != null && den.mainMedian != null ? num.mainRuns.map((x, i) => x / den.mainRuns[i]) : null;
  const wallP = num.wallRuns.map((x, i) => x / den.wallRuns[i]);
  const out = { ratio: figure, gate, ratioOfMedians: rom, wall: num.wallMedian / den.wallMedian, wallPairedMedian: median(wallP),
    main: mainP ? num.mainMedian / den.mainMedian : null, mainPairedMedian: mainP ? median(mainP) : null, perTick: num.msPerTick / den.msPerTick, perPlay: num.msPerPlay / den.msPerPlay,
    pairedMedian: pm, pairedQ1: pq1, pairedQ3: pq3, pairedIqrOverMedian: (pq3 - pq1) / pm, ci95: ci, pairedGeoMean: Math.exp(mean(paired.map(Math.log))), paired,
    limit, pass: limit == null ? null : figure <= limit, borderline, noisy,
    decomposition: { ticks: [num.ticks, den.ticks], actorTicks: [num.actorTicks, den.actorTicks], pairTicks: [num.pairTicks, den.pairTicks],
      volumeTicks: volTicks, actorsPerTickRatio: volActor / volTicks, volume: volActor, perStep: figure / volActor, perTickPart: figure / volTicks,
      perStepCi95: ci.map((x) => x / volActor), // the interval of the paired median, divided by the (exact) volume
      volumeShareOfLog: Math.log(figure) !== 0 ? Math.log(volActor) / Math.log(figure) : null, // share of the overhead (log scale) from the volume
      pairVolume: num.pairTicks / den.pairTicks, perPairStep: figure / (num.pairTicks / den.pairTicks), // the same split for the pairwise (separation) volume, which grows with actors squared
      arithmetic: `${fx(figure, 3)} = per-step ${fx(figure / volActor, 3)} x volume ${fx(volActor, 3)} (ticks ${num.ticks}/${den.ticks} = ${fx(volTicks, 3)} x actors per tick ${fx(num.actorsPerTick, 2)}/${fx(den.actorsPerTick, 2)} = ${fx(volActor / volTicks, 3)})` } };
  if (order) { const a = paired.filter((_, i) => order[i]), b = paired.filter((_, i) => !order[i]); out.byOrder = { numFirst: a.length ? median(a) : null, denFirst: b.length ? median(b) : null, nNumFirst: a.length, nDenFirst: b.length }; }
  return out;
}
/** The quality label of one result: GOOD, or PROVISIONAL with every reason. */
function quality(x, win) {
  const reasons = [...loadReasons(win)];
  if (x.noisy) reasons.push(`noisy (IQR/median over ${NOISE})`);
  if (x.borderline) reasons.push('borderline (95% interval straddles the limit)');
  return { label: reasons.length ? 'PROVISIONAL' : 'GOOD', reasons };
}

// The candidate's abilities-on, its same-process abilities-off and the sub-measurement variants run in their own process, so
// contract-carrying actors never shape the JIT state of the candidate process that runs the matched (plain / abilities-off) scenes.
const base = worker(BASE, 'base'), cand = worker(CAND, 'cand'), candA = worker(CAND, 'cand-ability');
const [bi, ci] = await Promise.all([base.ready, cand.ready, candA.ready]);
if (!ci.t8) { console.error('the candidate root is not a Task 8 build'); process.exit(2); }
const OWN = () => [process.pid, base.pid, cand.pid, candA.pid];
const loads = [load()]; const t0 = Date.now(); const runWin = cpuWindow(OWN);
const results = [];
for (const sc of scenes) {
  loads.push({ ...load(), scene: sc.id }); const win = cpuWindow(OWN);
  const pairVariant = sc.kind === 'ordinary' ? 'plain' : 'inert';
  const subs = sc.kind === 'ability' && SUB ? W.subVariants(sc) : [];
  const jobs = { base: [base, pairVariant], cand: [cand, pairVariant], ...(sc.kind === 'ability' ? { offA: [candA, 'inert'], abil: [candA, 'ability'] } : {}) };
  for (const v of subs) jobs[v] = [candA, v];
  const first = {}; const mainT = Object.fromEntries(Object.keys(jobs).map((k) => [k, []])); const ms = Object.fromEntries(Object.keys(jobs).map((k) => [k, []])), wall = Object.fromEntries(Object.keys(jobs).map((k) => [k, []])), mach = Object.fromEntries(Object.keys(jobs).map((k) => [k, []]));
  const order = { R0: [], R1: [] }; // per measured round: did the numerator (cand / abilities on) run first?
  const exec = async (k, keep) => { const res = await jobs[k][0].run(sc.id, jobs[k][1]); if (!first[k]) first[k] = res; else if (res.fp !== first[k].fp) throw new Error(`${sc.id} ${k}: result changed between runs`); if (keep) { ms[k].push(res[METRIC]); wall[k].push(res.ms); mainT[k].push(res.main ?? null); mach[k].push(res.machine ? { ...res.machine, cpu: res.cpu } : null); } };
  const total = Math.max(REPEATS, subs.length ? SUB_REPEATS : 0);
  for (let r = -WARMUP; r < total; r++) {
    const keep = r >= 0, rr = r + WARMUP * 4; const flip = rr % 4 === 1 || rr % 4 === 2; // ABBA: rounds 0, 3 A first; 1, 2 B first
    const main = r < REPEATS;
    // the matched workers (base, cand): one measured run each, each after its settle runs
    const measure = async (k) => { for (let s = 0; s < SETTLE; s++) await exec(k, false); await exec(k, keep); }; // settle runs, then the measured one
    if (main) for (const k of flip ? ['cand', 'base'] : ['base', 'cand']) await measure(k);
    // the ability worker: the pair in ABBA order, then the sub-measurements rotating
    const pair = jobs.abil && main ? (flip ? ['abil', 'offA'] : ['offA', 'abil']) : [];
    const rot = subs.length ? ((r % subs.length) + subs.length) % subs.length : 0;
    const tail = r < SUB_REPEATS ? [...subs.slice(rot), ...subs.slice(0, rot)] : [];
    for (const k of [...pair, ...tail]) await measure(k);
    if (keep && main) { order.R0.push(flip); if (jobs.abil) order.R1.push(flip); }
  }
  if (first.base.inputsHash !== first.cand.inputsHash) throw new Error(`${sc.id}: the builds received different inputs (${first.base.inputsHash} v ${first.cand.inputsHash})`);
  if (first.base.playsHash !== first.cand.playsHash) throw new Error(`${sc.id}: the called plays differ between builds`);
  const machine = win.end(); loads.at(-1).machine = machine;
  const row = { scene: sc.id, kind: sc.kind, addition: !!sc.addition, tier: sc.tier, plays: first.base.plays, inputsHash: first.base.inputsHash, machine };
  for (const k of Object.keys(jobs)) row[k] = stats(ms[k], wall[k], first[k], mach[k], mainT[k]);
  const seed = [...sc.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
  row.R0 = ratio(row.cand, row.base, ms.cand, ms.base, ENGINE, { order: order.R0, seed }); row.R0.quality = quality(row.R0, machine);
  if (jobs.abil) {
    row.R1 = ratio(row.abil, row.offA, ms.abil, ms.offA, ABILITY, { gate: 'pairedMedian', order: order.R1, seed: seed + 1 }); row.R1.quality = quality(row.R1, machine);
    row.R1same = { ratio: row.R1.ratioOfMedians, note: 'old same-process figure: ratio of the medians, both in the ability worker (now with the balanced schedule)' };
    row.R1cross = ratio(row.abil, row.cand, ms.abil, ms.cand, ABILITY, { seed: seed + 2 }); row.R1cross.quality = quality(row.R1cross, machine); row.R1cross.note = 'old protocol R1: abilities on (ability worker) / abilities off (matched worker); two processes; reported, not the figure';
    row.processState = { ratio: row.offA.median / row.cand.median, main: row.offA.mainMedian != null ? row.offA.mainMedian / row.cand.mainMedian : null, wall: row.offA.wallMedian / row.cand.wallMedian, note: 'the twin in the ability worker / the twin in the matched worker (same build, same scene): the difference between the two processes' };
    row.R2 = ratio(row.abil, row.base, ms.abil, ms.base, null, { seed: seed + 3 });
    const ctl = 'only:none';
    row.sub = Object.fromEntries(subs.filter((v) => v !== ctl).map((v, i) => { const x = ratio(row[v], row[ctl], ms[v], ms[ctl], null, { gate: 'pairedMedian', seed: seed + 10 + i }); return [v, { ...x, quality: quality(x, machine), median: row[v].median, abilityEvents: row[v].abilityEvents, noisyJob: row[v].noisy }]; }));
    row.subControl = { median: row[ctl].median, overOff: row[ctl].median / row.offA.median, noisy: row[ctl].noisy };
    for (const v of subs) delete row[v]; row.subRuns = Object.fromEntries(subs.map((v) => [v, { runs: ms[v], wallRuns: wall[v], fp: first[v].fp, ticksPerPlay: first[v].ticks / first[v].plays, actorTicks: first[v].actorTicks }]));
  }
  results.push(row);
  const ql = (x) => `${x.quality.label}${x.quality.reasons.length ? ` [${x.quality.reasons.join('; ')}]` : ''}`;
  const iv = (x) => `paired median ${fx(x.pairedMedian, 3)}, IQR ${fx(x.pairedQ1, 3)}-${fx(x.pairedQ3, 3)}, 95% CI ${fx(x.ci95[0], 3)}-${fx(x.ci95[1], 3)}`;
  console.log(`${sc.id}  machine: competing ${fx(machine.competingCpus, 3)} CPU, steal ${fx(machine.stealCpus, 3)} CPU, own ${fx(machine.ownCpus, 2)} CPU${machine.quiet ? ' (quiet)' : ' (NOT QUIET)'}, load ${machine.loadavgStart?.[0]} -> ${machine.loadavgEnd?.[0]}`);
  console.log(`  R0 ${fx(row.R0.ratio, 3)} ${row.R0.pass ? 'pass' : 'FAIL'} at ${ENGINE}  ${ql(row.R0)}  (base ${fx(row.base.median, 1)} ms, cand ${fx(row.cand.median, 1)} ms; ${iv(row.R0)}; wall ${fx(row.R0.wall, 3)}, main thread ${fx(row.R0.main, 3)})`);
  console.log(`     ${row.R0.decomposition.arithmetic}`);
  if (jobs.abil) {
    console.log(`  R1 ${fx(row.R1.ratio, 3)} ${row.R1.pass ? 'within' : 'OVER'} ${ABILITY}  ${ql(row.R1)}  (off ${fx(row.offA.median, 1)} ms, on ${fx(row.abil.median, 1)} ms, same process; ${iv(row.R1)}; ratio of medians ${fx(row.R1.ratioOfMedians, 3)}; on first ${fx(row.R1.byOrder.numFirst, 3)} / off first ${fx(row.R1.byOrder.denFirst, 3)})`);
    console.log(`     ${row.R1.decomposition.arithmetic}; per-step 95% CI ${fx(row.R1.decomposition.perStepCi95[0], 3)}-${fx(row.R1.decomposition.perStepCi95[1], 3)}`);
    console.log(`     other metrics (paired medians): wall ${fx(row.R1.wallPairedMedian, 3)}, main thread ${fx(row.R1.mainPairedMedian, 3)}`);
    console.log(`     reported, not the figure: old protocol R1 (cross-process) ${fx(row.R1cross.ratio, 3)}, process state (twin ability worker / matched worker) ${fx(row.processState.ratio, 3)} (main thread ${fx(row.processState.main, 3)}, wall ${fx(row.processState.wall, 3)}), R2 ${fx(row.R2.ratio, 3)}`);
  }
  for (const [v, s] of Object.entries(row.sub || {})) console.log(`     ${v.padEnd(28)} x${fx(s.ratio, 3)} of the control only:none (CI ${fx(s.ci95[0], 3)}-${fx(s.ci95[1], 3)}) ${s.quality.label} (${s.abilityEvents} ability events)`);
}
loads.push(load()); const runMachine = runWin.end();
base.close(); cand.close(); candA.close();
const notQuiet = results.filter((r) => !r.machine.quiet).map((r) => `${r.scene} (${loadReasons(r.machine).join(', ')})`);
const r0 = results.map((r) => ({ scene: r.scene, kind: r.kind === 'ordinary' ? 'ordinary' : 'abilities-off twin', addition: r.addition, ratio: r.R0.ratio, ci95: r.R0.ci95, pass: r.R0.pass, quality: r.R0.quality.label, reasons: r.R0.quality.reasons, noisy: r.R0.noisy, borderline: r.R0.borderline, perStep: r.R0.decomposition.perStep, volume: r.R0.decomposition.volume }));
const r1 = results.filter((r) => r.R1).map((r) => ({ scene: r.scene, addition: r.addition, ratio: r.R1.ratio, ci95: r.R1.ci95, within: r.R1.pass, quality: r.R1.quality.label, reasons: r.R1.quality.reasons, noisy: r.R1.noisy, borderline: r.R1.borderline,
  perStep: r.R1.decomposition.perStep, volume: r.R1.decomposition.volume, ratioOfMedians: r.R1.ratioOfMedians, crossProcess: r.R1cross.ratio, sameProcess: r.R1.ratioOfMedians, processState: r.processState.ratio, r2: r.R2.ratio }));
const summary = {
  status: notQuiet.length ? `PRELIMINARY: not quiet (competing CPU over ${QUIET.competingCpus} or steal over ${QUIET.stealCpus} CPU) in ${notQuiet.join('; ')}` : `quiet machine (competing CPU <= ${QUIET.competingCpus} and steal <= ${QUIET.stealCpus} CPU in every scene); official only when the owner accepts the conditions; results labelled PROVISIONAL stay provisional`,
  quietRule: QUIET, engineLimit: ENGINE, abilityBudget: ABILITY, r0, r1,
  r0Failures: r0.filter((x) => !x.pass).map((x) => x.scene), r1OverBudget: r1.filter((x) => !x.within).map((x) => x.scene),
  provisional: [...r0.filter((x) => x.quality !== 'GOOD').map((x) => `${x.scene} R0`), ...r1.filter((x) => x.quality !== 'GOOD').map((x) => `${x.scene} R1`)],
  noisy: [...r0.filter((x) => x.noisy).map((x) => `${x.scene} R0`), ...r1.filter((x) => x.noisy).map((x) => `${x.scene} R1`)],
  borderline: [...r0.filter((x) => x.borderline).map((x) => `${x.scene} R0`), ...r1.filter((x) => x.borderline).map((x) => `${x.scene} R1`)],
};
console.log(`\nR0 (engine, limit ${ENGINE}, every scene individually):`);
for (const x of r0) console.log(`  ${x.scene.padEnd(24)} ${fx(x.ratio, 3)} ${x.pass ? 'pass' : 'FAIL'}  CI ${fx(x.ci95[0], 3)}-${fx(x.ci95[1], 3)}  per-step ${fx(x.perStep, 3)} x volume ${fx(x.volume, 3)}  ${x.quality}${x.reasons.length ? ` [${x.reasons.join('; ')}]` : ''}`);
if (r1.length) { console.log(`R1 (abilities, provisional budget ${ABILITY}, same-process paired median, every scene individually):`);
  for (const x of r1) console.log(`  ${x.scene.padEnd(24)} ${fx(x.ratio, 3)} ${x.within ? 'within' : 'OVER'}  CI ${fx(x.ci95[0], 3)}-${fx(x.ci95[1], 3)}  per-step ${fx(x.perStep, 3)} x volume ${fx(x.volume, 3)}  ${x.quality}${x.reasons.length ? ` [${x.reasons.join('; ')}]` : ''}  (old cross-process ${fx(x.crossProcess, 3)})`); }
console.log(`${summary.status}.`);
console.log(`Whole run: competing ${fx(runMachine.competingCpus, 3)} CPU, steal ${fx(runMachine.stealCpus, 3)} CPU, own ${fx(runMachine.ownCpus, 2)} CPU. Load (1 min, includes the benchmark itself; recorded, not the rule) ${fx(Math.min(...loads.map((l) => l.load1)))} to ${fx(Math.max(...loads.map((l) => l.load1)))} on ${NCPU} CPUs. Metric ${METRIC === 'cpu' ? 'process CPU time' : 'wall time'}, warm-up ${WARMUP}, repeats ${REPEATS}, settle ${SETTLE}${SUB ? `, sub-measurements ${SUB_REPEATS}` : ''}; ${((Date.now() - t0) / 60000).toFixed(1)} min.`);
const machineInfo = { cpus: NCPU, cpuModel: os.cpus()[0]?.model, totalMemGB: +(os.totalmem() / 2 ** 30).toFixed(1), platform: `${os.platform()} ${os.release()}`, node: process.version };
if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify({ manifest: MANIFEST.version, runner: 'run-scenes.mjs (methodology 2026-11-08 correction)', label: arg('label', null), metric: METRIC, warmup: WARMUP, repeats: REPEATS, settle: SETTLE, bootstrap: BOOT, subRepeats: SUB ? SUB_REPEATS : 0, noise: NOISE,
  schedule: 'warm-up rounds identical to measured rounds; every measured run preceded by `settle` discarded runs of the same variant in the same worker; ABBA counterbalanced (rounds 0,3 of 4: A first; 1,2: B first) for base/cand and offA/abil; subs rotate',
  base: bi.root, cand: ci.root, when: new Date().toISOString(), minutes: (Date.now() - t0) / 60000, machine: machineInfo, runMachine, loads, summary, results }, null, 1));
