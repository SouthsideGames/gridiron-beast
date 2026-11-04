#!/usr/bin/env node
// Task 6 Phase 0: writes the baseline record (docs/task6-phase0/) from the baseline run directory. Planning tool; reads JSON only.
//   - run-hashes.json   every file's hash and hashV3, the v3 reproduction check against docs/post-trading-benchmark/run-hashes.json,
//                       and the repeat-file determinism check
//   - baseline.json     task6-compare baseline report (every pre-registered measure on B, H, C, CH) with pooled distributions
//   - baseline.md       the same as tables
//   - per-seed.csv      every Task 6 measure per seed and set
//   - scenarios.json    the six stress scenarios' measures
//   - gates.json        §45.6 contract per difficulty, and the drift tool run baseline against itself (a zero-drift sanity check)
//                       with the baseline owner win rates per difficulty for seasons 1–8 and 9–20
//   node tools/task6-phase0-report.mjs --run=DIR [--label=v42170] [--out=docs/task6-phase0]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { report, toMarkdown, loadSet } from './task6-compare.mjs';
import { seedMeasures } from './task6-analyze.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || '1']; }));
const HERE = path.dirname(new URL(import.meta.url).pathname); const REPO = path.join(HERE, '..');
const RUN = args.run; const L = args.label || 'v42170'; const OUT = args.out || path.join(REPO, 'docs/task6-phase0'); fs.mkdirSync(OUT, { recursive: true });
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const files = fs.readdirSync(RUN).filter((f) => f.endsWith('.json')).sort();

// ---- hashes, v3 reproduction, repeat determinism
const v3 = read(path.join(REPO, 'docs/post-trading-benchmark/run-hashes.json')).files.filter((x) => x.tree === 't55');
const hashes = []; const repro = [];
for (const f of files.filter((x) => x.startsWith(`${L}-B-`) || x.startsWith(`${L}-C-`) || x.startsWith(`${L}-D-`))) {
  const j = read(path.join(RUN, f)); const seconds = j.runs.reduce((s, r) => s + (r.seconds || 0), 0);
  hashes.push({ file: f, harnessV: j.harnessV, seeds: `${j.seeds[0]}-${j.seeds[j.seeds.length - 1]}`, seasons: j.seasonsRequested, scenario: j.scenario, hash: j.hash, hashV3: j.hashV3, problems: j.runs.reduce((s, r) => s + (r.problemCount || 0), 0), errors: j.runs.filter((r) => r.error).length, seconds, node: j.node });
  const m = f.match(new RegExp(`^${L}-([BC])-(\\d+-\\d+)\\.json$`)); if (!m) continue;
  const ref = v3.find((x) => x.file === `t55-${m[1]}-${m[2]}.json`); if (ref) repro.push({ file: f, v3File: ref.file, v3Hash: ref.hash, v4HashV3: j.hashV3, identical: ref.hash === j.hashV3 });
}
const rep = files.find((f) => f === `${L}-B-51-60-repeat.json`); const orig = files.find((f) => f === `${L}-B-51-60.json`);
const repeat = rep && orig ? (() => { const a = read(path.join(RUN, orig)), b = read(path.join(RUN, rep)); return { original: a.hash, repeat: b.hash, identical: a.hash === b.hash && a.hashV3 === b.hashV3 }; })() : null;
fs.writeFileSync(path.join(OUT, 'run-hashes.json'), JSON.stringify({ label: L, files: hashes, v3Reproduction: { checked: repro.length, identical: repro.filter((x) => x.identical).length, detail: repro }, repeatDeterminism: repeat }, null, 1));

// ---- baseline report on the four sets
const th = read(path.join(REPO, 'docs/task6-phase0/thresholds.json'));
const sets = Object.fromEntries(['B', 'H', 'C', 'CH'].map((s) => [s, loadSet({ dir: RUN, label: L }, s)]).filter(([, v]) => v.length));
const base = report(sets, null, th);
fs.writeFileSync(path.join(OUT, 'baseline.json'), JSON.stringify(base, null, 1));
fs.writeFileSync(path.join(OUT, 'baseline.md'), `# v42.17.0 baseline (harness v4)\n\nSeeds: ${Object.entries(base.seeds).map(([k, v]) => `${k} ${v.length}`).join(', ')}. Integrity: ${base.gates.integrity} (${base.gates.baseIntegrityProblems} problems).\n\n` + toMarkdown(base));

// ---- per-seed CSV
const cols = new Set(); const lines = [];
for (const [s, runs] of Object.entries(sets)) for (const r of runs) { const m = seedMeasures(r); if (!m) continue; const { task5, ...x } = m; Object.keys(x).forEach((k) => cols.add(k)); lines.push({ set: s, seed: r.seed, ...x }); }
const C = ['set', 'seed', ...cols]; fs.writeFileSync(path.join(OUT, 'per-seed.csv'), [C.join(','), ...lines.map((l) => C.map((c) => (l[c] == null ? '' : l[c])).join(','))].join('\n') + '\n');

// ---- scenarios
const scen = {}; for (const f of files.filter((x) => x.startsWith(`${L}-D-`))) { const j = read(path.join(RUN, f)); const per = j.runs.map((r) => seedMeasures(r)).filter(Boolean); const keys = Object.keys(per[0] || {}).filter((k) => k !== 'task5'); scen[j.scenario] = Object.fromEntries(keys.map((k) => { const v = per.map((p) => p[k]).filter((x) => typeof x === 'number'); return [k, v.length ? Math.round(100 * v.reduce((a, b) => a + b, 0) / v.length) / 100 : null]; })); }
fs.writeFileSync(path.join(OUT, 'scenarios.json'), JSON.stringify(scen, null, 1));

// ---- owner gates
const gates = JSON.parse(execFileSync('node', [path.join(HERE, 'task6-balance-gates.mjs'), `--contract=${RUN}:${L}`, `--drift-base=${RUN}:${L}`, `--drift-cand=${RUN}:${L}`], { encoding: 'utf8', maxBuffer: 1 << 26 }));
fs.writeFileSync(path.join(OUT, 'gates.json'), JSON.stringify(gates, null, 1));
console.log(JSON.stringify({ files: hashes.length, v3Reproduction: `${repro.filter((x) => x.identical).length}/${repro.length}`, repeat, integrity: base.gates, contract: gates.contract && Object.fromEntries(Object.entries(gates.contract).map(([d, c]) => [d, c.pass])) }, null, 1));
