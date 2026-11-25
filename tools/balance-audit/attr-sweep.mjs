#!/usr/bin/env node
// Balance audit 2026-11-25 (observation only): the Attribute Testing Lab's trials (src/lab/attr-trials.js, the same trials
// tools/attr-study.mjs runs at 50/75/95) at five levels, low to elite, so diminishing returns show. Every other attribute stays at
// the Lab's base (65); seeds are the trial's own, identical at every level. Wraps runTrial's levelList argument; nothing new.
//   node tools/balance-audit/attr-sweep.mjs [--n=200] [--levels=30,50,65,80,95] [--json=FILE]
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const ROOT = path.resolve(path.join(path.dirname(new URL(import.meta.url).pathname), '../..'));
const T = await import(path.join(ROOT, 'src/lab/attr-trials.js'));
const N = Number(args.n) || 200; const LV = String(args.levels || '30,50,65,80,95').split(',').map(Number);
const results = [];
for (const t of T.TRIALS) { const t0 = Date.now(); const r = T.runTrial(t, N, LV); results.push({ ...r, attr: t.attr, pos: t.pos, label: t.label }); console.error(`${t.id} ${((Date.now() - t0) / 1000).toFixed(1)}s`); }
const out = { tool: 'balance-audit/attr-sweep', n: N, base: T.BASE, levels: LV, results };
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(out, null, 1));
console.log(`trials ${results.length}`);
