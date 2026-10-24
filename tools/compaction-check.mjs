#!/usr/bin/env node
// Lossless-compaction proof (GDD §46, Phase 4; owner's decision: verified reconstruction before any removal). Plays a
// franchise hands-off and, at every season end, checks every award winner's slimmed row against the season's archived table
// row (the row it was copied from): `expandWinner` must restore every numeric key with the same value, and every kept field
// must be untouched. Reports the bytes the slimming saves. Exits 1 on any mismatch.
//   node tools/compaction-check.mjs [--seed=1] [--seasons=6] [--difficulty=pro]
import * as F from '../src/franchise/franchise.js';
import { runFranchise } from './franchise-soak.mjs';
import { expandWinner, KEEP } from '../src/franchise/history-compact.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const seed = Number(args.seed || 1), seasons = Number(args.seasons || 6), difficulty = args.difficulty || 'pro';
const problems = []; let winners = 0, slimmed = 0, savedBytes = 0, keysDropped = 0;

const { f } = runFranchise(seed, { seasons, difficulty, onSeason: (f) => {
  const h = f.history[f.history.length - 1]; const year = h.year; const monsterOf = (id) => f.roster.find((m) => m.id === id) || f.league?.monsters?.[id] || (f.league?.legends?.[id] ? { stats: { v: 2, career: { reg: {}, post: {} }, season: { year: null, reg: {}, post: {} }, seasons: f.league.legends[id].seasons || [] } } : null);
  for (const [k, w] of Object.entries(h.awards?.league || {})) {
    if (!w || typeof w !== 'object' || k === 'coy') continue; winners++;
    const row = h.leagueStats?.[w.team]?.[w.id]; if (!row) { problems.push(`${year} ${k}: no table row for ${w.name}`); continue; }
    const back = expandWinner(w, year, monsterOf);
    if (w.slim) { slimmed++; savedBytes += JSON.stringify(back).length - JSON.stringify(w).length; keysDropped += Object.keys(back).length - Object.keys(w).length + 1; }
    for (const [key, v] of Object.entries(row)) { if (typeof v !== 'number') continue; if (back[key] !== v) problems.push(`${year} ${k} ${w.name}: ${key} ${back[key]} after expansion, ${v} in the table`); }
    for (const key of ['id', 'name', 'team', 'position', 'score', 'why', 'record']) if (key in row || key === 'score' || key === 'why') { if (!(key in w)) problems.push(`${year} ${k} ${w.name}: ${key} dropped`); }
    for (const key of Object.keys(w)) if (!KEEP.has(key) && typeof w[key] === 'number' && row[key] !== w[key] && key in row) problems.push(`${year} ${k} ${w.name}: kept ${key} differs from the table`);
  }
} });
console.log(JSON.stringify({ seed, difficulty, seasons: f.history.length, winners, slimmed, keysDropped, savedBytesRaw: savedBytes, problems: problems.slice(0, 10) }, null, 1));
process.exit(problems.length ? 1 : 0);
