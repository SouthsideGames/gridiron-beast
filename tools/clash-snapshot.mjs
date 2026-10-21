#!/usr/bin/env node
// Beast Clash pre-implementation snapshot (2026-10-21). Run once, before values 1.1.0, to record seeded battles under the old
// defaults and every historical gate configuration plus the owner-approved candidate. tests/clash/implementation.test.js then
// proves (a) the historical ruleset still replays them byte for byte and (b) the permanent 1.1.0 defaults play exactly like the
// approved candidate. Usage: node tools/clash-snapshot.mjs [--out=tests/clash/fixtures/pre-1.1.0-snapshot.json]
import fs from 'node:fs';
import { simulateClash, logHash } from '../src/clash/engine.js';
import { CLASH_VALUES } from '../src/clash/values.js';
import { syntheticMonster } from '../src/clash/batch.js';
import { gateConfig } from '../src/clash/balance-manifest.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { createRng } from '../src/core/rng.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const out = String(args.out || 'tests/clash/fixtures/pre-1.1.0-snapshot.json');
if (CLASH_VALUES.version !== '1.0.0') { console.error(`This snapshot must be taken under values 1.0.0 (this build is ${CLASH_VALUES.version}).`); process.exit(1); }
const hashOf = (log) => { let h = 2166136261; const s = log.map((e) => `${e.ex}|${e.kind}|${e.actor}|${e.target}|${e.text}`).join('\n'); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const CONFIGS = { defaults: {}, 'Gate B': gateConfig('Gate B'), 'B.5': gateConfig('B.5'), Final: gateConfig('Final'), Approved: gateConfig('Approved') };
const rng = createRng(20261021); const records = [];
for (const [name, cfg] of Object.entries(CONFIGS)) for (let i = 0; i < 40; i++) {
  const size = i % 2 ? 5 : 3; const smart = i % 4 >= 2;
  const pick = () => ({ species: SPECIES_DEX[rng.int(SPECIES_DEX.length)].id, seed: rng.seed(), overall: 60 + rng.int(10) });
  const a = Array.from({ length: size }, pick), b = Array.from({ length: size }, pick); const seed = rng.seed();
  const config = { ...cfg, ...(smart ? { policies: { a: 'smart', b: 'smart' } } : {}) };
  const mk = (L) => L.map((x) => syntheticMonster(x.species, { seed: x.seed, overall: x.overall }));
  const r = simulateClash({ a: mk(a), b: mk(b), seed, config });
  records.push({ name, i, seed, a, b, config: JSON.parse(JSON.stringify(r.config)), hash: logHash(r), bodyHash: hashOf(r.log.slice(1)), winner: r.winner, by: r.by, exchanges: r.exchanges });
}
fs.writeFileSync(out, JSON.stringify({ values: CLASH_VALUES.version, engine: CLASH_VALUES.engineVersion, takenAt: '2026-10-21', note: 'Seeded battles under values 1.0.0 before the owner-approved 1.1.0 implementation. Do not regenerate.', records }, null, 1));
console.log(`wrote ${out}: ${records.length} battles (${Object.keys(CONFIGS).join(', ')})`);
