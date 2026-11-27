#!/usr/bin/env node
// Balance audit R-7 (2026-11-25): single-play yardage of chosen offensive plays on the production engine, between generated clubs
// (the AI's own rosters, quality 46-66), 1st and 10 at the 30, against a fixed panel of defences (base coverages, man, blitzes and run
// fronts) or `--defs=`. Every play sees the same clubs, defences and seeds, so plays compare like for like and a play's numbers move
// only when the play (or the engine) changes. Nothing in the game is changed.
//   node tools/balance-audit/play-probe.mjs --plays=wide_zone_rt,student_body [--n=12] [--clubs=30] [--defs=cover_3,...] [--json=FILE]
import fs from 'node:fs';
import { simulatePlay } from '../../src/sim/engine.js';
import { PLAYS } from '../../src/data/playbook.js';
import { generatedTeam } from '../../src/franchise/roster.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const N = Number(args.n) || 12, C = Number(args.clubs) || 30;
const DEFS = args.defs ? String(args.defs).split(',') : ['cover_3', 'cover_2_zone', 'cover_4', 'cover_1', 'cover_2_man', 'tampa_2', 'zone_blitz', 'cover_0', 'run_wall', 'bear_front', 'edge_contain', 'goal_line'];
const plays = String(args.plays || '').split(',').filter(Boolean);
const clubs = Array.from({ length: C }, (_, i) => [generatedTeam(31000 + i, { id: 'o', name: 'O', quality: 46 + (i * 7) % 21 }), generatedTeam(32000 + i, { id: 'd', name: 'D', quality: 46 + (i * 11) % 21 })]);
const out = { tool: 'balance-audit/play-probe', n: N, clubs: C, defs: DEFS, plays: {} };
for (const id of plays) {
  if (!PLAYS[id]) { console.error('no such play', id); continue; }
  const y = [], byDef = {}; let td = 0, stuffed = 0, ten = 0, blitzY = [];
  for (const [ci, [o, d]] of clubs.entries()) for (const def of DEFS) for (let s = 0; s < N; s++) {
    const sim = simulatePlay({ offensePlay: PLAYS[id], defensePlay: PLAYS[def], offense: o.offense, defense: d.defense, ballOn: 30, ballLat: 0, seed: 1 + ci * 1009 + s * 31 + def.length * 7, options: {} });
    const g = sim.yards || 0; y.push(g); (byDef[def] ||= []).push(g); if (sim.touchdown || sim.result === 'touchdown') td++; if (g <= 0) stuffed++; if (g >= 10) ten++;
    if ((PLAYS[def].tags || []).includes('blitz')) blitzY.push(g);
  }
  const avg = (a) => +(a.reduce((p, q) => p + q, 0) / Math.max(1, a.length)).toFixed(2);
  out.plays[id] = { type: PLAYS[id].type, snaps: y.length, mean: avg(y), stuffedPct: +(100 * stuffed / y.length).toFixed(1), tenPlusPct: +(100 * ten / y.length).toFixed(1), tdPct: +(100 * td / y.length).toFixed(1), vsBlitz: avg(blitzY), byDef: Object.fromEntries(Object.entries(byDef).map(([k, v]) => [k, avg(v)])) };
  console.log(id, JSON.stringify({ ...out.plays[id], byDef: undefined }));
}
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(out, null, 1));
