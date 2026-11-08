#!/usr/bin/env node
// CPU profile of the perf scenes on one build (docs/task8/PERF_SCENES.md, "Profile").
//   node --cpu-prof --cpu-prof-dir=OUT tools/perf/profile-scenes.mjs --root=DIR [--scenes=a,b|ordinary|all] [--loops=10]
//   node tools/perf/profile-scenes.mjs --summarize=FILE.cpuprofile [--top=40] [--vs=OTHER.cpuprofile]
// Runs the scenes `loops` times after one warm-up pass. --summarize prints self time per function (file:line name) and per file;
// with --vs, the difference between two profiles keyed by file basename and function name (line numbers differ between builds).
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(a.indexOf('=') + 1) : d; };
const HERE = path.dirname(new URL(import.meta.url).pathname);

function selfTimes(file) {
  const p = JSON.parse(fs.readFileSync(file, 'utf8')); const byId = new Map(p.nodes.map((n) => [n.id, n]));
  const dt = new Map(); for (let i = 0; i < p.samples.length; i++) dt.set(p.samples[i], (dt.get(p.samples[i]) || 0) + (p.timeDeltas[i] || 0));
  const fn = new Map(), files = new Map(); let total = 0;
  for (const [id, us] of dt) {
    const n = byId.get(id); const cf = n.callFrame; const f = cf.url ? cf.url.replace(/^.*\/src\//, 'src/').replace(/^file:\/\/.*\/tools\//, 'tools/') : `(${cf.functionName || 'native'})`;
    const key = `${f.split('/').pop()} ${cf.functionName || '(anon)'}`; const e = fn.get(key) || { us: 0, lines: new Set(), file: f }; e.us += us; e.lines.add(cf.lineNumber + 1); fn.set(key, e);
    files.set(f, (files.get(f) || 0) + us); total += us;
  }
  return { fn, files, total };
}
if (arg('summarize')) {
  const a = selfTimes(arg('summarize')); const top = Number(arg('top', 40)); const ms = (us) => (us / 1000).toFixed(0).padStart(7);
  if (!arg('vs')) {
    console.log(`total ${ms(a.total)} ms\n-- files`); for (const [f, us] of [...a.files].sort((x, y) => y[1] - x[1]).slice(0, 20)) console.log(`${ms(us)}  ${f}`);
    console.log('-- functions (self)'); for (const [k, e] of [...a.fn].sort((x, y) => y[1].us - x[1].us).slice(0, top)) console.log(`${ms(e.us)}  ${k} @${[...e.lines].join(',')}`);
  } else {
    const b = selfTimes(arg('vs')); const keys = new Set([...a.fn.keys(), ...b.fn.keys()]);
    console.log(`total base ${ms(b.total)} ms, cand ${ms(a.total)} ms, diff ${ms(a.total - b.total)} ms\n-- files (cand - base)`);
    const fk = new Set([...a.files.keys(), ...b.files.keys()]);
    for (const f of [...fk].sort((x, y) => ((a.files.get(y) || 0) - (b.files.get(y) || 0)) - ((a.files.get(x) || 0) - (b.files.get(x) || 0))).slice(0, 25)) console.log(`${ms(b.files.get(f) || 0)} ${ms(a.files.get(f) || 0)} ${ms((a.files.get(f) || 0) - (b.files.get(f) || 0))}  ${f}`);
    console.log('-- functions (self): base, cand, diff');
    for (const k of [...keys].sort((x, y) => ((a.fn.get(y)?.us || 0) - (b.fn.get(y)?.us || 0)) - ((a.fn.get(x)?.us || 0) - (b.fn.get(x)?.us || 0))).slice(0, top)) console.log(`${ms(b.fn.get(k)?.us || 0)} ${ms(a.fn.get(k)?.us || 0)} ${ms((a.fn.get(k)?.us || 0) - (b.fn.get(k)?.us || 0))}  ${k} @${[...(a.fn.get(k)?.lines || b.fn.get(k)?.lines || [])].join(',')}`);
  }
  process.exit(0);
}
const W = await import(path.join(HERE, 'scene-worker.mjs'));
const M = JSON.parse(fs.readFileSync(path.join(HERE, 'scenes.json'), 'utf8'));
const sel = arg('scenes', 'ordinary');
const ids = sel === 'all' ? M.scenes.map((s) => s.id) : sel === 'ordinary' ? M.scenes.filter((s) => s.kind === 'ordinary').map((s) => s.id) : sel.split(',');
const loops = Number(arg('loops', 10)); const variant = arg('variant', null);
const runAll = () => { let ms = 0; for (const id of ids) { const sc = M.scenes.find((s) => s.id === id); ms += W.runScene(id, variant || (sc.kind === 'ordinary' ? 'plain' : 'inert')).ms; } return ms; };
runAll(); let ms = 0; for (let i = 0; i < loops; i++) ms += runAll();
console.log(`${ids.length} scenes x ${loops}: ${ms.toFixed(0)} ms timed`);
