#!/usr/bin/env node
// Task 6 Stage P: the performance gate's timing (planning tool; changes nothing). Plays the production franchise lifecycle alone — the
// game's own functions (tools/franchise-soak.mjs runFranchise, hands-off owner, the soak's invariants), no harness — on fixed seeds and
// reports wall seconds per season (median of repetitions). Run it ALONE on the machine (docs/TESTING_POLICY.md §1): a shared CPU makes
// the number meaningless. The gate: a phase's seconds per season within +10% of the v42.17.0 baseline measured the same way, same machine.
//   node tools/task6-stage-p.mjs [--root=TREE] [--seeds=1-3] [--seasons=6] [--reps=2] [--json=out.json]
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const ROOT = path.resolve(args.root || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const { runFranchise } = await import(path.join(ROOT, 'tools/franchise-soak.mjs'));
const [s0, s1] = String(args.seeds || '1-3').split('-').map(Number); const seeds = []; for (let s = s0; s <= (s1 || s0); s++) seeds.push(s);
const seasons = Number(args.seasons || 6), reps = Number(args.reps || 2);
const times = [];
for (let r = 0; r < reps; r++) { const t0 = process.hrtime.bigint(); let played = 0; for (const seed of seeds) played += runFranchise(seed, { seasons }).log.seasons.length; times.push(Number(process.hrtime.bigint() - t0) / 1e9 / played); }
times.sort((a, b) => a - b); const med = times[Math.floor(times.length / 2)];
const out = { root: ROOT, seeds, seasons, reps, secondsPerSeason: Math.round(med * 100) / 100, all: times.map((t) => Math.round(t * 100) / 100), node: process.version };
if (args.json) fs.writeFileSync(args.json, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
