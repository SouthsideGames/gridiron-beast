#!/usr/bin/env node
// Task 8 performance scenes, baseline v candidate (docs/task8/PERF_SCENES.md; scene set approved, owner ruling N8e, spec §26).
//
// The full official run, in one command (every ordinary scene, every ability scene with its abilities-off twin, the additions and
// the ability sub-measurements; JSON with every run):
//   node tools/perf/run-scenes.mjs --base=<main extract> --cand=<Task 8 build> --json=out.json [--label=TEXT]
// Options: --scenes=O1-pass-T,A1-...  (default: all)   --no-sub (skip the only:KEY sub-measurements)   --sub-repeats=N (default: repeats)
//          --warmup=3 --repeats=15 (the approved protocol; the manifest's values are the defaults)   --metric=cpu|ms   --noise=0.10
//
// metric: cpu (default) is the worker process's CPU time over the timed section (process.cpuUsage, user + system), which other
// processes on the machine inflate far less than wall time; ms is wall time. Both are recorded for every run.
// DIR is a build root (a checkout or a `git archive` extract). One long-lived worker per build, plus a separate candidate worker for
// the abilities-on and sub-measurement variants (tools/perf/scene-worker.mjs, run with that build's sources and this manifest); the
// runner asks them in turn, never two at once. Per scene: `warmup` discarded runs per job, then `repeats` measured rounds (ABBA order:
// base, cand / cand, base alternating; abilities-on last). Every scene checks that both builds received identical inputs (rosters,
// plays, seeds, options) and that every run's fingerprint equals the first one's.
//
// Figures (spec §26, Method B):
//   R0 = cand / base on the same inputs: every ordinary scene and every abilities-off twin, individually, against budgets.engine (1.10).
//   R1 = cand abilities on / cand abilities off (same scene): against budgets.ability (1.25, provisional: over budget = investigate).
//   R2 = cand abilities on / base abilities off = R0 x R1 (reported, not gated).
//   sub-measurement only:KEY / cand abilities off: one ability (or the staged fields) alone, for the attribution.
// Variability: every job reports the IQR / median and the coefficient of variation; a job over --noise is flagged `noisy`, and a
// verdict whose paired-ratio interquartile range straddles its budget is flagged `borderline`. Machine load (os.loadavg) is sampled
// at the start, before every scene and at the end; a run whose 1-minute load ever exceeds 0.5 per CPU is marked PRELIMINARY (busy).
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fork } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const MANIFEST = JSON.parse(fs.readFileSync(path.join(HERE, 'scenes.json'), 'utf8'));
// the ability sub-measurements of a scene (scene-worker.mjs subVariants; repeated here so the runner never loads a build's engine)
const W = { subVariants: (sc) => [...Object.keys(sc.abilities || {}), ...(sc.fields?.length ? ['fields'] : [])].map((k) => `only:${k}`) };
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`) || x === `--${k}`); return a ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) : d; };
const BASE = arg('base'), CAND = arg('cand') || path.join(HERE, '..', '..');
if (!BASE) { console.error('usage: run-scenes.mjs --base=DIR --cand=DIR [--json=out.json] [--scenes=a,b] [--no-sub] [--label=TEXT]'); process.exit(2); }
const WARMUP = Number(arg('warmup', MANIFEST.protocol.warmup)), REPEATS = Number(arg('repeats', MANIFEST.protocol.repeats));
const SUB_REPEATS = Number(arg('sub-repeats', REPEATS)), SUB = !arg('no-sub');
const NOISE = Number(arg('noise', MANIFEST.protocol.noise ?? 0.10));
const ENGINE = MANIFEST.budgets?.engine ?? 1.10, ABILITY = MANIFEST.budgets?.ability ?? 1.25;
const METRIC = arg('metric', 'cpu'); if (!['cpu', 'ms'].includes(METRIC)) { console.error('--metric=cpu|ms'); process.exit(2); }
const ONLY = arg('scenes') ? new Set(String(arg('scenes')).split(',')) : null;
const scenes = MANIFEST.scenes.filter((s) => !ONLY || ONLY.has(s.id));

function worker(root, label) {
  const p = fork(path.join(HERE, 'scene-worker.mjs'), [`--root=${path.resolve(root)}`], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'], execArgv: process.execArgv });
  let seq = 0; const waiting = new Map(); let ready;
  const readyP = new Promise((r) => { ready = r; });
  p.on('message', (m) => { if (m.ready) return ready(m); const w = waiting.get(m.id); waiting.delete(m.id); if (m.ok) w.res(m.res); else w.rej(new Error(`${label}: ${m.error}`)); });
  return { label, ready: readyP, run: (scene, variant) => new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); p.send({ cmd: 'run', id, scene, variant }); }), close: () => p.send({ cmd: 'exit' }) };
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const q = (a, f) => { const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * f, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const cv = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1)) / m; };
const fx = (v, d = 2) => (v == null || !Number.isFinite(v) ? '-' : v.toFixed(d));
const load = () => ({ at: new Date().toISOString(), load1: os.loadavg()[0], load5: os.loadavg()[1], load15: os.loadavg()[2] });
const NCPU = os.cpus().length;

/** One job's statistics: median (primary), spread, variability and the noisy flag. */
function stats(runs, wallRuns, first) {
  const m = median(runs), iqr = q(runs, 0.75) - q(runs, 0.25), c = cv(runs);
  return { median: m, min: Math.min(...runs), max: Math.max(...runs), q1: q(runs, 0.25), q3: q(runs, 0.75), iqrOverMedian: iqr / m, cv: c, noisy: iqr / m > NOISE || c > NOISE,
    msPerPlay: m / first.plays, ticksPerPlay: first.ticks / first.plays, msPerTick: m / first.ticks, plays: first.plays, ticks: first.ticks, abilityEvents: first.abilityEvents, fields: first.fields,
    fp: first.fp, runs, wallMedian: median(wallRuns), wallRuns };
}
/** A ratio of medians with its paired-ratio spread, its verdict against `limit` and the variability flags. */
function ratio(num, den, numRuns, denRuns, limit) {
  const r = num.median / den.median; const paired = numRuns.map((x, i) => x / denRuns[i]);
  const pq1 = q(paired, 0.25), pq3 = q(paired, 0.75);
  return { ratio: r, wall: num.wallMedian / den.wallMedian, perTick: num.msPerTick / den.msPerTick, perPlay: num.msPerPlay / den.msPerPlay, pairedMedian: median(paired), pairedQ1: pq1, pairedQ3: pq3,
    limit, pass: limit == null ? null : r <= limit, borderline: limit == null ? false : pq1 <= limit && pq3 > limit, noisy: !!(num.noisy || den.noisy) };
}

// The candidate's abilities-on and sub-measurement variants run in their own process, so contract-carrying actors never shape the
// JIT state of the candidate process that runs the matched (plain / abilities-off) scenes.
const base = worker(BASE, 'base'), cand = worker(CAND, 'cand'), candA = worker(CAND, 'cand-ability');
const [bi, ci] = await Promise.all([base.ready, cand.ready, candA.ready]);
if (!ci.t8) { console.error('the candidate root is not a Task 8 build'); process.exit(2); }
const loads = [load()]; const t0 = Date.now();
const results = [];
for (const sc of scenes) {
  loads.push({ ...load(), scene: sc.id });
  const pairVariant = sc.kind === 'ordinary' ? 'plain' : 'inert';
  const subs = sc.kind === 'ability' && SUB ? W.subVariants(sc) : [];
  const jobs = { base: [base, pairVariant], cand: [cand, pairVariant], ...(sc.kind === 'ability' ? { abil: [candA, 'ability'] } : {}) };
  for (const v of subs) jobs[v] = [candA, v];
  const first = {};
  for (const [k, [w, v]] of Object.entries(jobs)) for (let i = 0; i < WARMUP; i++) { const r = await w.run(sc.id, v); if (i === 0) first[k] = r; else if (r.fp !== first[k].fp) throw new Error(`${sc.id} ${k}: not deterministic between runs`); }
  if (first.base.inputsHash !== first.cand.inputsHash) throw new Error(`${sc.id}: the builds received different inputs (${first.base.inputsHash} v ${first.cand.inputsHash})`);
  if (first.base.playsHash !== first.cand.playsHash) throw new Error(`${sc.id}: the called plays differ between builds`);
  const ms = Object.fromEntries(Object.keys(jobs).map((k) => [k, []])), wall = Object.fromEntries(Object.keys(jobs).map((k) => [k, []]));
  const rounds = Math.max(REPEATS, subs.length ? SUB_REPEATS : 0);
  for (let r = 0; r < rounds; r++) {
    const main = r < REPEATS ? (r % 2 ? ['cand', 'base', 'abil'] : ['base', 'cand', 'abil']) : [];
    const order = [...main, ...(r < SUB_REPEATS ? subs : [])];
    for (const k of order) if (jobs[k]) { const res = await jobs[k][0].run(sc.id, jobs[k][1]); if (res.fp !== first[k].fp) throw new Error(`${sc.id} ${k}: result changed between runs`); ms[k].push(res[METRIC]); wall[k].push(res.ms); }
  }
  const row = { scene: sc.id, kind: sc.kind, addition: !!sc.addition, tier: sc.tier, plays: first.base.plays, inputsHash: first.base.inputsHash };
  for (const k of Object.keys(jobs)) row[k] = stats(ms[k], wall[k], first[k]);
  row.R0 = ratio(row.cand, row.base, ms.cand, ms.base, ENGINE);
  if (jobs.abil) {
    row.R1 = ratio(row.abil, row.cand, ms.abil, ms.cand, ABILITY);
    row.R2 = ratio(row.abil, row.base, ms.abil, ms.base, null);
    row.sub = Object.fromEntries(subs.map((v) => [v, { ...ratio(row[v], row.cand, ms[v], ms.cand.slice(0, ms[v].length), null), median: row[v].median, abilityEvents: row[v].abilityEvents, noisyJob: row[v].noisy }]));
    for (const v of subs) delete row[v]; row.subRuns = Object.fromEntries(subs.map((v) => [v, { runs: ms[v], wallRuns: wall[v], fp: first[v].fp, ticksPerPlay: first[v].ticks / first[v].plays }]));
  }
  results.push(row);
  const flag = (x) => `${x.noisy ? ' NOISY' : ''}${x.borderline ? ' BORDERLINE' : ''}`;
  console.log(`${sc.id.padEnd(24)} base ${fx(row.base.median, 1).padStart(7)} ms (${fx(row.base.msPerPlay, 3)}/play, ${fx(row.base.ticksPerPlay, 1)} ticks)  cand ${fx(row.cand.median, 1).padStart(7)} ms (${fx(row.cand.msPerPlay, 3)}/play, ${fx(row.cand.ticksPerPlay, 1)} ticks)  R0 ${fx(row.R0.ratio, 3)} ${row.R0.pass ? 'pass' : 'FAIL'}${flag(row.R0)} (paired ${fx(row.R0.pairedMedian, 3)}, per tick ${fx(row.R0.perTick, 3)}, wall ${fx(row.R0.wall, 3)})`
    + (jobs.abil ? `\n${''.padEnd(24)} abilities on ${fx(row.abil.median, 1)} ms (${fx(row.abil.ticksPerPlay, 1)} ticks)  R1 ${fx(row.R1.ratio, 3)} ${row.R1.pass ? 'within' : 'OVER'} ${ABILITY}${flag(row.R1)}  R2 ${fx(row.R2.ratio, 3)}` : ''));
  for (const [v, s] of Object.entries(row.sub || {})) console.log(`${''.padEnd(26)}${v.padEnd(28)} x${fx(s.ratio, 3)} of abilities off${s.noisy ? ' NOISY' : ''} (${s.abilityEvents} ability events)`);
}
loads.push(load());
base.close(); cand.close(); candA.close();
const busy = loads.some((l) => l.load1 > 0.5 * NCPU);
const r0 = results.map((r) => ({ scene: r.scene, kind: r.kind === 'ordinary' ? 'ordinary' : 'abilities-off twin', addition: r.addition, ratio: r.R0.ratio, pass: r.R0.pass, noisy: r.R0.noisy, borderline: r.R0.borderline }));
const r1 = results.filter((r) => r.R1).map((r) => ({ scene: r.scene, addition: r.addition, ratio: r.R1.ratio, within: r.R1.pass, noisy: r.R1.noisy, borderline: r.R1.borderline, r2: r.R2.ratio }));
const summary = {
  status: busy ? 'PRELIMINARY: busy machine (1-minute load above 0.5 per CPU during the run)' : 'quiet machine (load stayed at or below 0.5 per CPU); official only when the owner accepts the conditions',
  engineLimit: ENGINE, abilityBudget: ABILITY, r0, r1,
  r0Failures: r0.filter((x) => !x.pass).map((x) => x.scene), r1OverBudget: r1.filter((x) => !x.within).map((x) => x.scene),
  noisy: [...r0.filter((x) => x.noisy).map((x) => `${x.scene} R0`), ...r1.filter((x) => x.noisy).map((x) => `${x.scene} R1`)],
  borderline: [...r0.filter((x) => x.borderline).map((x) => `${x.scene} R0`), ...r1.filter((x) => x.borderline).map((x) => `${x.scene} R1`)],
};
console.log(`\nR0 (engine, limit ${ENGINE}, every scene individually): ${summary.r0Failures.length ? `FAIL: ${summary.r0Failures.join(', ')}` : 'every scene passes'}`);
if (r1.length) console.log(`R1 (abilities, provisional budget ${ABILITY}): ${summary.r1OverBudget.length ? `over budget (investigate): ${summary.r1OverBudget.join(', ')}` : 'every scene within'}`);
if (summary.noisy.length) console.log(`noisy (IQR/median or CV over ${NOISE}): ${summary.noisy.join(', ')}`);
if (summary.borderline.length) console.log(`borderline (paired-ratio IQR straddles the limit): ${summary.borderline.join(', ')}`);
console.log(`${summary.status}. Load (1 min) ${fx(Math.min(...loads.map((l) => l.load1)))} to ${fx(Math.max(...loads.map((l) => l.load1)))} on ${NCPU} CPUs. Metric ${METRIC === 'cpu' ? 'process CPU time' : 'wall time'}, warm-up ${WARMUP}, repeats ${REPEATS}${SUB ? `, sub-measurements ${SUB_REPEATS}` : ''}; ${((Date.now() - t0) / 60000).toFixed(1)} min.`);
const machine = { cpus: NCPU, cpuModel: os.cpus()[0]?.model, totalMemGB: +(os.totalmem() / 2 ** 30).toFixed(1), platform: `${os.platform()} ${os.release()}`, node: process.version };
if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify({ manifest: MANIFEST.version, label: arg('label', null), metric: METRIC, warmup: WARMUP, repeats: REPEATS, subRepeats: SUB ? SUB_REPEATS : 0, noise: NOISE,
  base: bi.root, cand: ci.root, when: new Date().toISOString(), minutes: (Date.now() - t0) / 60000, machine, loads, summary, results }, null, 1));
