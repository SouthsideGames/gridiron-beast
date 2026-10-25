#!/usr/bin/env node
// A disposable franchise for the evolution scene (GDD §51): a hands-off season played to week 4 (injury history, captains and
// chemistry all live), then — test fixture only — one evolvable monster of each type the roster has is raised to the level its
// next form needs (levels only go up; nothing else is touched), so the Evolve button shows for each. Never a real save.
//   node tools/evolution-saves.mjs --out=FILE [--seed=9]
import fs from 'node:fs';
import { runFranchise } from './franchise-soak.mjs';
import * as Save from '../src/franchise/save.js';
import { nextEvolution } from '../src/data/monsters.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const { f } = runFranchise(Number(args.seed || 9), { seasons: 1, stopWeek: 4 });
const ready = {};
for (const m of f.roster) { const n = nextEvolution(m); if (!n || ready[m.type]) continue; m.level = Math.max(m.level, n.level); ready[m.type] = { id: m.id, name: m.name, to: n.name, level: m.level }; }
fs.writeFileSync(args.out, Save.exportJson(f));
console.log(JSON.stringify({ out: args.out, year: f.season.year, week: f.season.week, ready }, null, 1));
