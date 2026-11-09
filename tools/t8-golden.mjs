// Record the t8 golden seeds (tests/clash/fixtures/golden-t8.json) from the same 20 battles as the S1 fixture (golden-t8-s1.json):
// the S1 lineups and seeds, replayed on the current t8 engine with its default configuration. Run only when an approved rule
// changes ordinary t8 battles, and record the reason in docs/task8/M4_STATUS.md.
//   node tools/t8-golden.mjs
import fs from 'node:fs';
import { simulateClashT8, t8LogHash } from '../src/clash/t8/index.js';

const dir = new URL('../tests/clash/fixtures/', import.meta.url);
const s1 = JSON.parse(fs.readFileSync(new URL('golden-t8-s1.json', dir), 'utf8'));
const out = {};
for (const seed of Object.keys(s1)) {
  const k = JSON.parse(s1[seed].key);
  const r = simulateClashT8({ a: k.a, b: k.b, seed: k.seed, config: { ruleset: 't8' } });
  out[seed] = { hash: t8LogHash(r), state: r.stateHash, key: r.replayKey };
}
fs.writeFileSync(new URL('golden-t8.json', dir), JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${Object.keys(out).length} golden t8 seeds`);
