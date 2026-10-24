#!/usr/bin/env node
// Balance comparison for persistent AI rosters (GDD §42.10, decision C): the same seeds played hands-off with the league
// registry and with today's generated rosters (`legacy`), on one difficulty. Reports, per season and overall: the owner's win
// rate, playoff rate and firings, the AI clubs' mean team overall at mid-season and at season end (live against today's
// generator), the rival's strength, and the title spread. The acceptance bands (test plan, Phase 3) are checked by
// tools/balance-report.mjs over the JSON files this writes.
//   node tools/balance-compare.mjs --mode=persistent|legacy [--difficulty=pro] [--seeds=1-8] [--seasons=8] [--json=out.json]
import { writeFileSync } from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import { runFranchise, invariants } from './franchise-soak.mjs';
import { teamOverall } from '../src/franchise/roster.js';
import { ALL_TEAMS } from '../src/data/league.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const mode = args.mode || 'persistent', difficulty = args.difficulty || 'pro', seasons = Number(args.seasons || 8);
const [s0, s1] = String(args.seeds || '1-8').split('-').map(Number); const seeds = []; for (let s = s0; s <= (s1 || s0); s++) seeds.push(s);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

const out = { mode, difficulty, seasons, seeds, runs: [] };
for (const seed of seeds) {
  const t0 = Date.now(); const mid = {}; const rows = [];
  const clubsOf = (f) => ALL_TEAMS.filter((t) => t !== f.club);
  const check = (f, where) => { if (f.season?.week === 6 && !mid[f.season.year]) mid[f.season.year] = r1(mean(clubsOf(f).map((c) => teamOverall(F.aiTeam(f, c))))); return invariants(f, where); };
  const { f, problems, log } = runFranchise(seed, { seasons, difficulty, legacy: mode === 'legacy', check, onSeason: (f) => {
    const y = f.season.year; const clubs = clubsOf(f); const rec = f.season.records[f.club]; const rival = f.rivals[f.tier]?.team;
    rows.push({ year: y, w: rec.w, l: rec.l, playoffs: !!f.season.playoffs?.seeds && Object.values(f.season.playoffs.seeds).flat().includes(f.club), champion: f.season.champion, mine: teamOverall(F.playerTeam(f)), aiMid: mid[y] ?? null, aiEnd: r1(mean(clubs.map((c) => teamOverall(F.aiTeam(f, c, y))))), today: r1(mean(clubs.map((c) => teamOverall(F.legacyAiTeam(f, c, y))))), rivalEnd: teamOverall(F.aiTeam(f, rival, y)), rivalToday: teamOverall(F.legacyAiTeam(f, rival, y)), forecast: f.season.boardForecast ?? null });
  } });
  out.runs.push({ seed, club: f.club, fired: log.fired, seasonsPlayed: rows.length, rows, problems: problems.slice(0, 5), seconds: Math.round((Date.now() - t0) / 1000) });
  console.error(`${mode} ${difficulty} seed ${seed}: ${rows.map((r) => `${r.w}-${r.l}`).join(' ')}${log.fired ? ' FIRED' : ''} (${Math.round((Date.now() - t0) / 1000)}s)`);
}
const all = out.runs.flatMap((r) => r.rows);
out.summary = { seasons: all.length, winPct: r1(100 * mean(all.map((r) => r.w / (r.w + r.l)))), playoffPct: r1(100 * mean(all.map((r) => (r.playoffs ? 1 : 0)))), titles: all.filter((r) => r.champion === out.runs.find((x) => x.rows.includes(r))?.club).length, fired: out.runs.filter((r) => r.fired).length, aiMid: r1(mean(all.map((r) => r.aiMid).filter((x) => x != null))), aiEnd: r1(mean(all.map((r) => r.aiEnd))), today: r1(mean(all.map((r) => r.today))), rivalEnd: r1(mean(all.map((r) => r.rivalEnd))), rivalToday: r1(mean(all.map((r) => r.rivalToday))), distinctChampions: r1(mean(out.runs.map((r) => new Set(r.rows.map((x) => x.champion)).size))), byYear: Object.fromEntries(Array.from({ length: seasons }, (_, i) => i + 1).map((y) => { const ys = all.filter((r) => r.year === y); return [y, ys.length ? { n: ys.length, winPct: r1(100 * mean(ys.map((r) => r.w / (r.w + r.l)))), aiMid: r1(mean(ys.map((r) => r.aiMid).filter((x) => x != null))), aiEnd: r1(mean(ys.map((r) => r.aiEnd))), today: r1(mean(ys.map((r) => r.today))) } : null]; })) };
console.log(JSON.stringify(out.summary, null, 1));
if (args.json) writeFileSync(args.json, JSON.stringify(out, null, 1));
