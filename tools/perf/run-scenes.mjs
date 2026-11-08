#!/usr/bin/env node
// Matched perf scenes, baseline v candidate (docs/task8/PERF_SCENES.md; scene set PROPOSED, pending owner approval).
//   node tools/perf/run-scenes.mjs --base=DIR --cand=DIR [--scenes=O1-pass-T,A1-...] [--warmup=3] [--repeats=15] [--json=out.json]
// DIR is a build root (a checkout or a `git archive` extract). One long-lived worker process per build (tools/perf/scene-worker.mjs,
// run with that build's sources and this manifest); the runner asks them in turn, never both at once, so each measurement has the
// machine to itself. Per scene: `warmup` discarded runs per worker and variant, then `repeats` measured rounds in ABBA order
// (base, cand / cand, base alternating). Reports the median ms per scene and per play, the spread (min-max and IQR), the ratio of
// medians and the median of the per-round paired ratios, and ticks per play (play length differs between builds: same inputs,
// different mechanics). Every scene checks that both builds received identical inputs (rosters, plays, seeds, options).
import path from 'node:path';
import fs from 'node:fs';
import { fork } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const MANIFEST = JSON.parse(fs.readFileSync(path.join(HERE, 'scenes.json'), 'utf8'));
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(a.indexOf('=') + 1) : d; };
const BASE = arg('base'), CAND = arg('cand') || path.join(HERE, '..', '..');
if (!BASE) { console.error('usage: run-scenes.mjs --base=DIR --cand=DIR [--scenes=a,b] [--warmup=3] [--repeats=15] [--json=out.json]'); process.exit(2); }
const WARMUP = Number(arg('warmup', MANIFEST.protocol.warmup)), REPEATS = Number(arg('repeats', MANIFEST.protocol.repeats));
const ONLY = arg('scenes') ? new Set(arg('scenes').split(',')) : null;
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
const fx = (v, d = 2) => (v == null ? '-' : v.toFixed(d));

const base = worker(BASE, 'base'), cand = worker(CAND, 'cand');
const [bi, ci] = await Promise.all([base.ready, cand.ready]);
if (!ci.t8) { console.error('the candidate root is not a Task 8 build'); process.exit(2); }
const results = [];
for (const sc of scenes) {
  // jobs: [worker, variant]; ordinary: plain on both; ability: inert on both (the matched pair) and ability on the candidate
  const pairVariant = sc.kind === 'ordinary' ? 'plain' : 'inert';
  const jobs = { base: [base, pairVariant], cand: [cand, pairVariant], ...(sc.kind === 'ability' ? { abil: [cand, 'ability'] } : {}) };
  const first = {};
  for (const [k, [w, v]] of Object.entries(jobs)) for (let i = 0; i < WARMUP; i++) { const r = await w.run(sc.id, v); if (i === 0) first[k] = r; else if (r.fp !== first[k].fp) throw new Error(`${sc.id} ${k}: not deterministic between runs`); }
  if (first.base.inputsHash !== first.cand.inputsHash) throw new Error(`${sc.id}: the builds received different inputs (${first.base.inputsHash} v ${first.cand.inputsHash})`);
  if (first.base.playsHash !== first.cand.playsHash) throw new Error(`${sc.id}: the called plays differ between builds`);
  const ms = { base: [], cand: [], abil: [] };
  for (let r = 0; r < REPEATS; r++) {
    const order = r % 2 ? ['cand', 'base', 'abil'] : ['base', 'cand', 'abil'];
    for (const k of order) if (jobs[k]) { const res = await jobs[k][0].run(sc.id, jobs[k][1]); if (res.fp !== first[k].fp) throw new Error(`${sc.id} ${k}: result changed between runs`); ms[k].push(res.ms); }
  }
  const row = { scene: sc.id, kind: sc.kind, tier: sc.tier, plays: first.base.plays, inputsHash: first.base.inputsHash };
  for (const k of Object.keys(jobs)) row[k] = { median: median(ms[k]), min: Math.min(...ms[k]), max: Math.max(...ms[k]), q1: q(ms[k], 0.25), q3: q(ms[k], 0.75), msPerPlay: median(ms[k]) / first[k].plays, ticksPerPlay: first[k].ticks / first[k].plays, abilityEvents: first[k].abilityEvents, fp: first[k].fp, runs: ms[k] };
  row.ratio = row.cand.median / row.base.median;
  row.pairedRatio = median(ms.cand.map((c, i) => c / ms.base[i]));
  row.perTickRatio = (row.cand.median / first.cand.ticks) / (row.base.median / first.base.ticks);
  if (jobs.abil) { row.abilityOverInert = row.abil.median / row.cand.median; row.abilityOverBase = row.abil.median / row.base.median; }
  results.push(row);
  console.log(`${sc.id.padEnd(24)} base ${fx(row.base.median, 1).padStart(7)} ms (${fx(row.base.msPerPlay, 3)}/play, ${fx(row.base.ticksPerPlay, 1)} ticks)  cand ${fx(row.cand.median, 1).padStart(7)} ms (${fx(row.cand.msPerPlay, 3)}/play, ${fx(row.cand.ticksPerPlay, 1)} ticks)  ratio ${fx(row.ratio, 3)} paired ${fx(row.pairedRatio, 3)} per-tick ${fx(row.perTickRatio, 3)}`
    + (jobs.abil ? `  | ability ${fx(row.abil.median, 1)} ms: x${fx(row.abilityOverInert, 3)} inert, x${fx(row.abilityOverBase, 3)} base` : ''));
}
base.close(); cand.close();
const ord = results.filter((r) => r.kind === 'ordinary');
const sum = (rows, k) => rows.reduce((s, r) => s + r[k].median, 0);
const summary = {
  ordinary: { base: sum(ord, 'base'), cand: sum(ord, 'cand'), ratio: sum(ord, 'cand') / sum(ord, 'base'), worst: ord.reduce((w, r) => (r.ratio > (w?.ratio ?? 0) ? r : w), null)?.scene },
  inertTwins: results.filter((r) => r.kind === 'ability').length ? { ratio: sum(results.filter((r) => r.kind === 'ability'), 'cand') / sum(results.filter((r) => r.kind === 'ability'), 'base') } : null,
  ability: results.filter((r) => r.kind === 'ability').length ? { overInert: sum(results.filter((r) => r.kind === 'ability'), 'abil') / sum(results.filter((r) => r.kind === 'ability'), 'cand'), overBase: sum(results.filter((r) => r.kind === 'ability'), 'abil') / sum(results.filter((r) => r.kind === 'ability'), 'base') } : null,
};
console.log(`\nordinary scenes (sum of medians): base ${fx(summary.ordinary.base, 1)} ms, cand ${fx(summary.ordinary.cand, 1)} ms, ratio ${fx(summary.ordinary.ratio, 3)} (gate <= 1.100); worst scene ${summary.ordinary.worst}`);
if (summary.inertTwins) console.log(`ability scenes' inert twins (matched): ratio ${fx(summary.inertTwins.ratio, 3)}; ability on: x${fx(summary.ability.overInert, 3)} over inert, x${fx(summary.ability.overBase, 3)} over the baseline's inert twin`);
console.log(`warm-up ${WARMUP}, repeats ${REPEATS}, base ${bi.root}, cand ${ci.root}. Noisy if other work shares the machine: re-run on a quiet machine for official numbers.`);
if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify({ manifest: MANIFEST.version, status: MANIFEST.status, warmup: WARMUP, repeats: REPEATS, base: bi.root, cand: ci.root, when: new Date().toISOString(), results, summary }, null, 1));
