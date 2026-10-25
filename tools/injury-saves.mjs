#!/usr/bin/env node
// A disposable played franchise for the Injury History checks (GDD §50): three seasons into the fourth, week 4.
//   node tools/injury-saves.mjs --out=FILE
import fs from 'node:fs';
import { runFranchise } from './franchise-soak.mjs';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const { f } = runFranchise(Number(args.seed || 9), { seasons: 3, difficulty: 'pro' }); F.startNextSeason(f);
let g = 0; while (f.season.week < 4 && g++ < 30) { let d = 0; while (f.season.day < 6 && d++ < 10) { if (!F.autoRunToSunday(f).ok) break; } if (F.isBye(f)) { F.takeBye(f); continue; } F.finishSunday(f, F.simulatePlayerGame(f)); }
fs.writeFileSync(args.out || 'tools/out/injury-save.json', Save.exportJson(f));
console.log(JSON.stringify({ year: f.season.year, week: f.season.week, records: Object.values(f.injuryHistory.log).flat().length, open: Object.keys(f.injuryHistory.open).length }));
