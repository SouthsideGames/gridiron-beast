#!/usr/bin/env node
// Final calibration experiments (F-02 Rookie quality, F-13 weekly fatigue recovery; investigation only). Runs the unchanged
// tools/ai-franchise-benchmark.mjs with the experimental values loaded through calib-hooks.mjs in this process only, and tags the output.
//   node tools/balance-audit/calib-experiment.mjs [--rookieQuality=-7] [--recovery=24] [benchmark flags: --seeds --seasons --difficulty ...]
import path from 'node:path';
import fs from 'node:fs';
import { register } from 'node:module';
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '..', '..');
const take = (k) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); if (a) process.argv = process.argv.filter((x) => x !== a); return a ? a.split('=')[1] : null; };
const rq = take('rookieQuality'), rec = take('recovery');
if (rq != null) process.env.CAL_ROOKIE_Q = rq; if (rec != null) process.env.CAL_RECOVERY = rec;
if (rq != null || rec != null) register('./calib-hooks.mjs', import.meta.url);
const bench = path.join(root, 'tools/ai-franchise-benchmark.mjs');
process.argv = [process.argv[0], bench, ...process.argv.slice(2)];
await import(bench);
const j = process.argv.find((a) => a.startsWith('--json='));
if (j) { const file = j.split('=')[1]; const out = JSON.parse(fs.readFileSync(file, 'utf8')); out.calibration = { rookieQuality: rq != null ? Number(rq) : 'production (-4)', recovery: rec != null ? Number(rec) : 'production (28)' }; fs.writeFileSync(file, JSON.stringify(out)); }
