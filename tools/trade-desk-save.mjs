#!/usr/bin/env node
// Writes a played franchise (first offseason, draft and free agency done, trades open) for the trade desk browser check.
//   node tools/trade-desk-save.mjs --seed=51 --out=EXPORT.json
import fs from 'node:fs';
import { runFranchise } from './franchise-soak.mjs';
import * as Save from '../src/franchise/save.js';
import { withBoardReset, leagueInvariants } from './league-soak.mjs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
let text = null; const seed = Number(args.seed || 51);
runFranchise(seed, { seasons: 1, check: withBoardReset(leagueInvariants), onSeason: (f) => { text = Save.exportJson(f); } });
fs.writeFileSync(args.out || `trade-desk-save-${seed}.json`, text); console.log(`wrote ${args.out || `trade-desk-save-${seed}.json`} (${text.length} bytes)`);
