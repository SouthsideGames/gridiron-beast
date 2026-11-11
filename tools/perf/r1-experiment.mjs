#!/usr/bin/env node
// The R1 disagreement experiment (docs/task8/PERF_SCENES.md section 3.1). Small and short; run it on a quiet machine.
//
//   node tools/perf/r1-experiment.mjs --cand=DIR [--scenes=A3-delayed-effects,A2-summons-constructs,A5-full-contracts] [--repeats=8]
//        [--warmup=3] [--idle=3000] [--json=FILE]
//
// Question: why did the old protocol R1 (abilities on in the ability worker / abilities off in the matched candidate worker) and the
// old same-process R1 (both in the ability worker) disagree? On the preserved runs of 2026-11-08 the abilities-off twin took 0.67 to
// 1.04 x as long in the ability worker as in the matched worker, so the two R1 figures differed by up to 0.49.
// Hypothesis: a run's cost depends on what the process did just before it. The first run after the worker has been idle (it waits
// while the other workers run) and the first run after a different variant carry extra CPU, mostly on V8's helper threads, sometimes
// 3-5 x; the old schedule gave the two processes different exposures to these transitions (the matched worker ran every measured job
// as the first run after a ~3 s wait; the ability worker's jobs followed other variants), so the twin's time differed by process.
//
// Part 1, transitions. One fresh process runs the abilities-off twin in three situations, repeated in rotation:
//   idle   the first run after --idle ms of idle;
//   switch the first run right after the abilities-on variant;
//   steady a run right after a run of the twin itself.
// For each: median process CPU (the approved metric), main-thread CPU (process.threadCpuUsage: no helper threads), wall time, the
// helper-thread share (process CPU - main-thread CPU) and the runs over 1.5 x the steady median ("spikes").
//
// Part 2, two processes with the two histories of the old schedule: M ran the ordinary scenes first (as the matched worker), A the
// scene's abilities-on variant and its sub-measurements (as the ability worker). Each measures the twin in rounds that alternate
// M and A; once with no settle run (every measured run is the first after the other process's turn, as in the old schedule) and once
// with one settle run of the twin before every measured run (the corrected schedule). Reported: A / M for each.
//
// Part 3, carry-over between the two arms. One fresh process runs off off on on ... (off = the twin, on = abilities on), so that
// off->off, off->on, on->on and on->off occur equally often; each variant's median by the variant before it, and on / off when each
// follows itself against when each follows the other. In a schedule where the arms follow each other (the old one), an unequal
// carry-over biases the ratio even with a balanced order; a settle run of the same variant before every measured run removes it.
import path from 'node:path';
import fs from 'node:fs';
import { fork } from 'node:child_process';
import { cpuWindow, processTree, loadReasons } from './machine.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const MANIFEST = JSON.parse(fs.readFileSync(path.join(HERE, 'scenes.json'), 'utf8'));
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`) || x === `--${k}`); return a ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) : d; };
const CAND = path.resolve(arg('cand', path.join(HERE, '..', '..')));
const SCENES = String(arg('scenes', 'A3-delayed-effects,A2-summons-constructs,A5-full-contracts')).split(',');
const N = Number(arg('repeats', 8)), WU = Number(arg('warmup', 3)), IDLE = Number(arg('idle', 3000));
const subVariants = (sc) => ['none', ...Object.keys(sc.abilities || {}), ...(sc.fields?.length ? ['fields'] : [])].map((k) => `only:${k}`);
const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const f = (x, d = 1) => (x == null ? '-' : x.toFixed(d));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function worker() {
  const p = fork(path.join(HERE, 'scene-worker.mjs'), [`--root=${CAND}`, '--gc-stats'], { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
  let seq = 0; const waiting = new Map(); let ready; const readyP = new Promise((r) => { ready = r; });
  p.on('message', (m) => { if (m.ready) return ready(m); const w = waiting.get(m.id); waiting.delete(m.id); if (m.ok) w.res(m.res); else w.rej(new Error(m.error)); });
  return { ready: readyP, run: (scene, variant) => new Promise((res, rej) => { const id = ++seq; waiting.set(id, { res, rej }); p.send({ cmd: 'run', id, scene, variant }); }), close: () => p.send({ cmd: 'exit' }) };
}
const summary = (runs, ref = null) => { const m = median(runs.map((r) => r.cpu)); const lim = 1.5 * (ref ?? m);
  return { n: runs.length, cpu: +m.toFixed(1), main: +median(runs.map((r) => r.main)).toFixed(1), wall: +median(runs.map((r) => r.ms)).toFixed(1), helper: +median(runs.map((r) => r.cpu - r.main)).toFixed(1),
    spikes: runs.filter((r) => r.cpu > lim).length, gcMs: median(runs.map((r) => r.gc.ms)), majors: runs.reduce((a, r) => a + r.gc.major, 0), cpuRuns: runs.map((r) => +r.cpu.toFixed(1)) }; };
const line = (k, v, ref) => `  ${k.padEnd(8)} CPU ${f(v.cpu).padStart(6)} ms (x${f(v.cpu / ref.cpu, 2)})  main thread ${f(v.main).padStart(6)} (x${f(v.main / ref.main, 2)})  helper threads ${f(v.helper).padStart(6)}  wall ${f(v.wall).padStart(6)} (x${f(v.wall / ref.wall, 2)})  spikes ${v.spikes}/${v.n}  [${v.cpuRuns.map((x) => x.toFixed(0)).join(' ')}]`;

const out = { tool: 'tools/perf/r1-experiment.mjs', cand: CAND, scenes: SCENES, repeats: N, warmup: WU, idleMs: IDLE, when: new Date().toISOString(), part1: {}, part2: {}, part3: {}, machine: {} };
const ordinary = MANIFEST.scenes.filter((s) => s.kind === 'ordinary').map((s) => s.id);
for (const id of SCENES) {
  const sc = MANIFEST.scenes.find((s) => s.id === id); const win = cpuWindow(() => processTree(), { reapedOf: process.pid }); // workers start and stop inside the window
  // ---------------------------------------------------------------- part 1
  {
    const W = worker(); await W.ready; for (let k = 0; k < WU; k++) { await W.run(id, 'inert'); await W.run(id, 'ability'); }
    const by = { idle: [], switch: [], steady: [] };
    for (let r = 0; r < N; r++) {
      await W.run(id, 'inert'); by.steady.push(await W.run(id, 'inert'));
      await W.run(id, 'ability'); by.switch.push(await W.run(id, 'inert'));
      await sleep(IDLE); by.idle.push(await W.run(id, 'inert'));
    }
    W.close();
    const steady = summary(by.steady); const s = { steady, switch: summary(by.switch, steady.cpu), idle: summary(by.idle, steady.cpu) };
    out.part1[id] = s;
    console.log(`part 1 ${id}: the abilities-off twin by what ran just before it (medians; x = against steady)`);
    for (const k of ['steady', 'switch', 'idle']) console.log(line(k, s[k], steady));
  }
  // ---------------------------------------------------------------- part 2
  for (const settle of [0, 1]) {
    const P = { M: worker(), A: worker() }; await Promise.all(Object.values(P).map((w) => w.ready));
    for (let k = 0; k < 2; k++) for (const o of ordinary) await P.M.run(o, 'plain');
    for (let k = 0; k < 2; k++) { await P.A.run(id, 'ability'); for (const v of subVariants(sc)) await P.A.run(id, v); }
    for (let k = 0; k < WU; k++) for (const w of ['M', 'A']) await P[w].run(id, 'inert');
    const runs = { M: [], A: [] };
    for (let r = 0; r < N; r++) for (const w of r % 2 ? ['A', 'M'] : ['M', 'A']) {
      for (let s = 0; s < settle; s++) await P[w].run(id, 'inert');
      runs[w].push(await P[w].run(id, 'inert'));
      if (w === 'A') { await P.A.run(id, 'ability'); for (const v of subVariants(sc).slice(0, 4)) await P.A.run(id, v); } // the ability worker's other jobs, as in a round
    }
    for (const w of Object.values(P)) w.close();
    const s = { M: summary(runs.M), A: summary(runs.A) };
    out.part2[`${id} settle=${settle}`] = { ...s, ratioCpu: s.A.cpu / s.M.cpu, ratioMain: s.A.main / s.M.main, ratioWall: s.A.wall / s.M.wall };
    console.log(`part 2 ${id}, ${settle ? 'one settle run before every measured run (corrected schedule)' : 'no settle run (old schedule)'}: the twin in A (ability history) / in M (ordinary history): CPU x${f(s.A.cpu / s.M.cpu, 3)}, main thread x${f(s.A.main / s.M.main, 3)}, wall x${f(s.A.wall / s.M.wall, 3)}`);
    for (const k of ['M', 'A']) console.log(line(k, s[k], s.M));
  }
  // ---------------------------------------------------------------- part 3
  {
    const W = worker(); await W.ready;
    for (let k = 0; k < WU; k++) { await W.run(id, 'inert'); await W.run(id, 'ability'); }
    const by = {}; let prev = 'ability';
    for (let r = 0; r < N; r++) for (const v of ['inert', 'inert', 'ability', 'ability']) { const res = await W.run(id, v); const k = `${v === 'inert' ? 'off' : 'on'} after ${prev === 'inert' ? 'off' : 'on'}`; (by[k] ||= []).push(res); prev = v; }
    W.close();
    const p = Object.fromEntries(['off after off', 'off after on', 'on after on', 'on after off'].map((k) => [k, summary(by[k])]));
    const self = p['on after on'].cpu / p['off after off'].cpu, other = p['on after off'].cpu / p['off after on'].cpu;
    out.part3[id] = { ...p, onOverOffSelf: self, onOverOffOther: other, onOverOffSelfMain: p['on after on'].main / p['off after off'].main, onOverOffOtherMain: p['on after off'].main / p['off after on'].main };
    console.log(`part 3 ${id}: carry-over in one process (medians)`);
    for (const k of Object.keys(p)) console.log(line(k, p[k], p['off after off']));
    console.log(`  on / off, each after itself: CPU ${f(self, 3)} (main thread ${f(out.part3[id].onOverOffSelfMain, 3)}); each after the other: CPU ${f(other, 3)} (main thread ${f(out.part3[id].onOverOffOtherMain, 3)})`);
  }
  const m = win.end(); out.machine[id] = m;
  console.log(`machine during ${id}: competing ${f(m.competingCpus, 3)} CPU, steal ${f(m.stealCpus, 3)} CPU${m.quiet ? ' (quiet)' : ` (NOT QUIET: ${loadReasons(m).join(', ')})`}`);
}
if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify(out, null, 1));
