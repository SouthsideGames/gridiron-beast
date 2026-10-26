#!/usr/bin/env node
// Attribute effectiveness study (GDD §8.2 audit, v42.6): the Attribute Testing Lab's trials (src/lab/attr-trials.js) run headless
// at 50 / 75 / 95, 300 seeds each, so a difference between levels is the attribute's alone. The report's numbers come from here.
//   node tools/attr-study.mjs [--n=300] [--only=speed,agility|trial_id] [--json=FILE]
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const ROOT = path.resolve(path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const T = await import(path.join(ROOT, 'src/lab/attr-trials.js'));
const N = Number(args.n) || T.N; const only = args.only ? String(args.only).split(',') : null;
const results = [];
for (const t of T.TRIALS) { if (only && !only.includes(t.attr) && !only.includes(t.id)) continue; const r = T.runTrial(t, N); results.push(r); console.error(`${r.id}: ${JSON.stringify(r.levels)}`); }
if (!only || only.includes('durability')) results.push(T.durabilityStudy(N));
if (!only || only.includes('kicking')) results.push(T.kickingStudy(N));
const out = { n: N, base: T.BASE, levels: T.LEVELS, results };
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
