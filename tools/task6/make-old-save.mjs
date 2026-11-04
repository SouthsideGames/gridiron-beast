#!/usr/bin/env node
// Task 6 Phase A-1 transition check, step 1: play a franchise under a given tree's rules (a pre-A-1 tree: the old ageing) and
// write its save as exported JSON, at a season's end (after the offseason's decisions, before the next season starts).
//   node tools/task6/make-old-save.mjs --root=OLD_TREE --seed=106 --seasons=15 --out=save.json
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const ROOT = path.resolve(args.root);
const { runFranchise } = await import(path.join(ROOT, 'tools/franchise-soak.mjs'));
const { leagueInvariants, withBoardReset } = await import(path.join(ROOT, 'tools/league-soak.mjs'));
const Save = await import(path.join(ROOT, 'src/franchise/save.js'));
const seasons = Number(args.seasons || 15); let json = null;
const { problems } = runFranchise(Number(args.seed), { seasons, check: withBoardReset(leagueInvariants), onSeason: (f, s) => { if (s === seasons) json = Save.exportJson(f); } });
fs.writeFileSync(args.out, json);
console.log(JSON.stringify({ root: ROOT, seed: Number(args.seed), seasons, bytes: json.length, problems: problems.length }));
