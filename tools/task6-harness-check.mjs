#!/usr/bin/env node
// Task 6 Phase 0: proves the benchmark harness is observational and reproducible (planning tool; changes nothing in the game).
//   1. Non-interference: the same seed played by the game alone (tools/franchise-soak.mjs runFranchise with the soak's own
//      invariants, no harness hooks) and under harness v4 ends in the identical franchise (sha-256 of the whole franchise object
//      less `uid` and `createdAt`, the two wall-clock identity fields that differ on every run of the game itself).
//   2. Determinism: harness v4 run twice on the same seed gives the same `hash` (all fields) and `hashV3`.
//   3. v3 reproduction (optional, --v3=FILE): a stored harness-v3 file's hash equals the v4 run's `hashV3` for the same seeds.
//   node tools/task6-harness-check.mjs [--seeds=1-2] [--seasons=2] [--v3=path/to/v3.json] [--json=out.json]
import fs from 'node:fs';
import { benchmarkSeed, hashOf, hashV3Of, finalStateHash } from './ai-franchise-benchmark.mjs';
import { runFranchise } from './franchise-soak.mjs';
import { leagueInvariants, withBoardReset } from './league-soak.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const [s0, s1] = String(args.seeds || '1-2').split('-').map(Number); const seeds = []; for (let s = s0; s <= (s1 || s0); s++) seeds.push(s);
const seasons = Number(args.seasons || 2);
const out = { seeds, seasons, nonInterference: [], determinism: null, v3: null, pass: true };

for (const seed of seeds) {
  const plain = runFranchise(seed, { seasons, check: withBoardReset(leagueInvariants) });
  const r = await benchmarkSeed(seed, { seasons });
  const same = finalStateHash(plain.f) === r.v4.finalState;
  out.nonInterference.push({ seed, plain: finalStateHash(plain.f), harness: r.v4.finalState, identical: same });
  if (!same) out.pass = false;
}
const a = []; const b = [];
for (const seed of seeds) { a.push(await benchmarkSeed(seed, { seasons })); b.push(await benchmarkSeed(seed, { seasons })); }
out.determinism = { hashA: hashOf(a), hashB: hashOf(b), hashV3A: hashV3Of(a), hashV3B: hashV3Of(b) };
out.determinism.identical = out.determinism.hashA === out.determinism.hashB && out.determinism.hashV3A === out.determinism.hashV3B;
if (!out.determinism.identical) out.pass = false;
if (args.v3) {
  const v3 = JSON.parse(fs.readFileSync(args.v3, 'utf8'));
  const okSeeds = JSON.stringify(v3.seeds) === JSON.stringify(seeds) && v3.seasonsRequested === seasons;
  out.v3 = { file: args.v3, v3Hash: v3.hash, v4HashV3: out.determinism.hashV3A, sameSeedsAndSeasons: okSeeds, identical: okSeeds && v3.hash === out.determinism.hashV3A };
  if (!out.v3.identical) out.pass = false;
}
if (args.json) fs.writeFileSync(args.json, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
process.exitCode = out.pass ? 0 : 1;
