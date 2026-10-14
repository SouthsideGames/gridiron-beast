// Replay one play from a repro code "offensePlay|defensePlay|ballOn|seed"
// (printed in the in-game play log) and print its event trace.
// usage: node tests/tools/replay.js quick_slants|cover_3|30|12345 [lineupSeed]
// Note: the roster attributes are regenerated from `lineupSeed` (default 7);
// to reproduce a franchise play exactly, export the save and pass it with --save file.json.
import fs from 'node:fs';
import { simulatePlay } from '../../src/sim/engine.js';
import { PLAYS } from '../../src/data/playbook.js';
import { lineup } from './lineup.js';

const code = process.argv[2];
if (!code) { console.error('usage: node tests/tools/replay.js offense|defense|ballOn|seed'); process.exit(2); }
const [o, d, ballOn, seed] = code.split('|');
let L;
const saveIdx = process.argv.indexOf('--save');
if (saveIdx > 0) {
  const { playerTeam } = await import('../../src/franchise/franchise.js');
  const raw = JSON.parse(fs.readFileSync(process.argv[saveIdx + 1], 'utf8'));
  const f = raw.franchise || raw; const t = playerTeam(f);
  L = { offense: t.offense, defense: t.defense };
} else L = lineup(Number(process.argv[3] || 7), 60);
const r = simulatePlay({ offensePlay: PLAYS[o], defensePlay: PLAYS[d], ballOn: Number(ballOn), seed: Number(seed), offense: L.offense, defense: L.defense });
console.log(`${PLAYS[o].name} vs ${PLAYS[d].name} from the ${ballOn}, seed ${seed}: ${r.result}, ${r.yards} yards, ${r.elapsed}s`);
for (const e of r.events) console.log(`  ${e.t.toFixed(2)}s  ${e.text}`);
console.log(JSON.stringify(r.stats));
