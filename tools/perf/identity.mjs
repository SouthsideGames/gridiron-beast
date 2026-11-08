#!/usr/bin/env node
// Outcome-identity check for performance work (docs/task8/PERF_SCENES.md, "Optimisations"). Hashes, on one build root:
//  1. every perf scene in every variant the build supports: each play's complete output (result, frames, events, stats, everything
//     JSON can hold) and, for the rules tier, the game states afterwards;
//  2. `--games` full AI games (game-runner playGame) between generated clubs with their Dex abilities on: every step's event and
//     play output, and the final state (score, log, stats, Task 8 block).
//   node tools/perf/identity.mjs --root=DIR [--games=12] [--out=hashes.json] [--compare=other.json]
// --compare exits 1 on any difference and lists it.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(a.indexOf('=') + 1) : d; };
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(arg('root', path.join(HERE, '..', '..')));
if (!process.argv.some((x) => x.startsWith('--root='))) process.argv.push(`--root=${ROOT}`);
const W = await import(path.join(HERE, 'scene-worker.mjs'));
const M = JSON.parse(fs.readFileSync(path.join(HERE, 'scenes.json'), 'utf8'));
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const GR = await imp('src/sim/game-runner.js');
const { generatedTeam } = await imp('src/franchise/roster.js');
const IS_T8 = fs.existsSync(path.join(ROOT, 'src/sim/abilities/registry.js'));
const rep = (k, v) => (v instanceof Set ? [...v] : v instanceof Map ? [...v] : v);
const sha = (x) => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x, rep)).digest('hex').slice(0, 20);

const out = { root: ROOT, scenes: {}, games: {} };
for (const s of M.scenes) for (const v of s.kind === 'ordinary' ? ['plain'] : IS_T8 ? ['inert', 'ability'] : ['inert']) {
  const r = W.runScene(s.id, v, { dump: true }); out.scenes[`${s.id}/${v}`] = { full: r.full, state: r.state || null, fp: r.fp };
}
const games = Number(arg('games', 12));
for (let g = 0; g < games; g++) {
  const seed = 7001 + g * 13;
  const home = generatedTeam(seed, { id: 'IH', name: 'Identity Home', abbr: 'IDH', quality: 62 }), away = generatedTeam(seed + 1, { id: 'IA', name: 'Identity Away', abbr: 'IDA', quality: 62 });
  const steps = crypto.createHash('sha256'); let n = 0;
  const st = GR.playGame({ home, away, seed, quarterLength: 300, onStep: (ev) => { steps.update(JSON.stringify(ev, rep) || 'null'); n += 1; } });
  out.games[seed] = { steps: steps.digest('hex').slice(0, 20), n, final: sha({ score: st.score, log: st.log, stats: st.stats, t8: st.t8 || null, winner: st.winner }) };
}
const file = arg('out'); if (file) fs.writeFileSync(file, JSON.stringify(out, null, 1));
const cmp = arg('compare');
if (cmp) {
  const o = JSON.parse(fs.readFileSync(cmp, 'utf8')); const diffs = [];
  for (const sect of ['scenes', 'games']) for (const k of new Set([...Object.keys(o[sect]), ...Object.keys(out[sect])])) if (JSON.stringify(o[sect][k]) !== JSON.stringify(out[sect][k])) diffs.push(`${sect} ${k}: ${JSON.stringify(o[sect][k])} -> ${JSON.stringify(out[sect][k])}`);
  console.log(diffs.length ? `DIFFERENT (${diffs.length}):\n${diffs.join('\n')}` : `IDENTICAL: ${Object.keys(out.scenes).length} scene variants (${M.scenes.length} scenes), ${games} full games`);
  process.exit(diffs.length ? 1 : 0);
}
console.log(`hashed ${Object.keys(out.scenes).length} scene variants and ${games} games${file ? ` -> ${file}` : ''}`);
