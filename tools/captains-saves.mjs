#!/usr/bin/env node
// Disposable test saves for the Captain Partnerships checks (GDD §27.4B); never a real player's save.
//   node tools/captains-saves.mjs --out=DIR
// Writes three exports: pre.json (an existing franchise in week 3 that has no partnership data yet: the one-time initial
// selection), season.json (two played seasons and into the third: captains named and locked, chemistry earned) and
// offseason.json (a season just finished, the draft held: the offseason pick).
import fs from 'node:fs';
import path from 'node:path';
import { runFranchise } from './franchise-soak.mjs';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const out = args.out || 'tools/out/captains'; fs.mkdirSync(out, { recursive: true });
const pre = runFranchise(8, { seasons: 1, stopWeek: 3, difficulty: 'pro' }).f; delete pre.partnerships;
for (const m of [...pre.roster, ...Object.values(pre.league?.monsters || {})]) if (m.career?.ev) m.career.ev = m.career.ev.filter((e) => !['captain', 'chemistry'].includes(e.t));
fs.writeFileSync(path.join(out, 'pre.json'), Save.exportJson(pre));
const off = runFranchise(9, { seasons: 2, difficulty: 'pro' }).f; fs.writeFileSync(path.join(out, 'offseason.json'), Save.exportJson(off));
const season = JSON.parse(JSON.stringify(off)); const n = F.startNextSeason(season); if (!n.ok) throw new Error(n.reason);
let g = 0; while (season.season.week < 4 && g++ < 30) { let d = 0; while (season.season.day < 6 && d++ < 10) { if (!F.autoRunToSunday(season).ok) break; } if (F.isBye(season)) { F.takeBye(season); continue; } F.finishSunday(season, F.simulatePlayerGame(season)); }
fs.writeFileSync(path.join(out, 'season.json'), Save.exportJson(season));
console.log(JSON.stringify({ out, pre: !pre.partnerships, offseason: off.season.finished, season: { week: season.season.week, captains: !!season.partnerships?.captains?.[season.season.year] } }));
