#!/usr/bin/env node
// Task 8 league-health study (franchise-health reports, N7f): runs hands-off franchises for N seasons and records, per season,
// how the AI clubs' strength, development, ageing and roster management move with no seasonal boosts. Read-only on the game:
// it drives the game's own public functions (tools/franchise-soak.mjs).
//   node tools/t8-league-health.mjs [seasons=10] [seeds=1,2,3] [out.json]
import fs from 'node:fs';
import { runFranchise } from './franchise-soak.mjs';
import { monsterOverall, resolveSpecies } from '../src/data/monsters.js';
import { buildDepthChart } from '../src/franchise/roster.js';
import { GYM_BY_CLUB } from '../src/data/gyms.js';
import * as FR from '../src/core/fraction.js';

const seasons = Number(process.argv[2] || 10); const seeds = (process.argv[3] || '1,2,3').split(',').map(Number); const out = process.argv[4] || null;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : null; };
const sum = (o) => Object.values(o || {}).reduce((a, b) => a + (b || 0), 0);

function snapshot(f, s) {
  const clubs = Object.keys(f.league.clubs); const rows = [];
  for (const c of clubs) {
    const roster = f.league.clubs[c].roster.map((id) => f.league.monsters[id]).filter(Boolean);
    const st = new Set(Object.values(buildDepthChart(roster, {}, {}))); const starters = roster.filter((m) => st.has(m.id));
    rows.push({ club: c, gym: !!GYM_BY_CLUB[c], mode: f.league.clubs[c].strategy?.mode || null, size: roster.length,
      starterOvr: mean(starters.map((m) => monsterOverall(m))), age: mean(roster.map((m) => m.age)), level: mean(roster.map((m) => m.dev?.level || m.level)),
      trained: mean(roster.map((m) => sum(m.dev?.trained))), decline: mean(roster.map((m) => sum(m.dev?.loss))), bank: mean(roster.map((m) => (m.dev ? FR.toNumber(m.dev.bank) : 0))),
      lvl50: roster.filter((m) => (m.dev?.level || 0) >= 50).length, basics: roster.filter((m) => resolveSpecies(m).rarity === 'basic').length, apex: roster.filter((m) => m.dev?.apex).length });
  }
  const own = (() => { const st = new Set(Object.values(buildDepthChart(f.roster, {}, {}))); return mean(f.roster.filter((m) => st.has(m.id)).map((m) => monsterOverall(m))); })();
  const g = rows.filter((r) => r.gym), o = rows.filter((r) => !r.gym && r.club !== f.club);
  const lo = f.leagueOffseason || {};
  return { season: s, gymOvr: mean(g.map((r) => r.starterOvr)), ordinaryOvr: mean(o.map((r) => r.starterOvr)), spread: [q(rows.map((r) => r.starterOvr), 0.1), q(rows.map((r) => r.starterOvr), 0.9)],
    ownerOvr: own, sizeMin: Math.min(...rows.map((r) => r.size)), sizeMax: Math.max(...rows.map((r) => r.size)), age: mean(rows.map((r) => r.age)), level: mean(rows.map((r) => r.level)),
    trained: mean(rows.map((r) => r.trained)), decline: mean(rows.map((r) => r.decline)), bank: mean(rows.map((r) => r.bank)), lvl50: sum(Object.fromEntries(rows.map((r) => [r.club, r.lvl50]))),
    basics: sum(Object.fromEntries(rows.map((r) => [r.club, r.basics]))), apex: sum(Object.fromEntries(rows.map((r) => [r.club, r.apex]))), legends: Object.keys(f.league.legends || {}).length,
    modes: rows.reduce((m, r) => { m[r.mode] = (m[r.mode] || 0) + 1; return m; }, {}), nudge: lo.nudge ? { boosted: lo.nudge.boosted?.length ?? lo.nudge.boosted, slowed: lo.nudge.slowed?.length ?? lo.nudge.slowed } : null,
    trades: lo.trades ?? null, upgrades: lo.upgrades ?? null };
}
const all = [];
for (const seed of seeds) {
  const t0 = Date.now(); const series = [];
  const { problems } = runFranchise(seed, { seasons, onSeason: (f, s) => { series.push(snapshot(f, s)); process.stderr.write(`seed ${seed} season ${s} ${((Date.now() - t0) / 1000).toFixed(0)}s\n`); } });
  all.push({ seed, problems: problems.slice(0, 10), problemCount: problems.length, series });
}
const text = JSON.stringify({ seasons, seeds, at: new Date().toISOString(), runs: all }, null, 1);
if (out) fs.writeFileSync(out, text); else console.log(text);
