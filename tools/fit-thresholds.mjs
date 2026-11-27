#!/usr/bin/env node
// Follow-up A-4 (owner 2026-11-26): the scheme-fit threshold table in src/data/monsters.js (FIT_THRESHOLD_TABLE) against its derivation.
//   node tools/fit-thresholds.mjs           check: exit 0 when the table equals deriveFitThresholds() exactly, 1 otherwise
//   node tools/fit-thresholds.mjs --write   rewrite the table from the derivation (run after any change to generation, species or
//                                           headline attributes that the check or tests/fit-thresholds.test.js reports)
import fs from 'node:fs';
import path from 'node:path';
import { deriveFitThresholds, FIT_THRESHOLD_TABLE } from '../src/data/monsters.js';
const FILE = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'src/data/monsters.js');
const live = deriveFitThresholds();
const same = JSON.stringify(live) === JSON.stringify(FIT_THRESHOLD_TABLE);
if (!process.argv.includes('--write')) { console.log(same ? `fit thresholds: table matches the derivation (${Object.keys(live).length} entries)` : 'fit thresholds: TABLE IS OUT OF DATE (run node tools/fit-thresholds.mjs --write)'); process.exit(same ? 0 : 1); }
const src = fs.readFileSync(FILE, 'utf8');
const body = Object.entries(live).map(([k, v]) => `  '${k}': ${JSON.stringify(v)},`).join('\n');
const out = src.replace(/(\/\/ FIT_THRESHOLD_TABLE:BEGIN[^\n]*\n)[\s\S]*?(\n\/\/ FIT_THRESHOLD_TABLE:END)/, `$1export const FIT_THRESHOLD_TABLE = Object.freeze({\n${body}\n});$2`);
if (out === src && !same) { console.error('fit thresholds: markers not found'); process.exit(2); }
fs.writeFileSync(FILE, out); console.log(`fit thresholds: wrote ${Object.keys(live).length} entries`);
