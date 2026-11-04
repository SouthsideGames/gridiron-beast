#!/usr/bin/env node
// Balance comparison for persistent AI rosters (GDD §42.10, decision C): the same seeds played hands-off with the league
// registry and with today's generated rosters (`legacy`), on one difficulty. Reports, per season and overall: the owner's win
// rate, playoff rate and firings, the AI clubs' mean team overall at mid-season and at season end (live against today's
// generator), the rival's strength, and the title spread. The acceptance bands (test plan, Phase 3) are checked by
// tools/balance-report.mjs over the JSON files this writes.
//   node tools/balance-compare.mjs --mode=persistent|legacy [--difficulty=pro] [--seeds=1-8] [--seasons=8] [--owner=active] [--json=out.json]
// --owner=active (Task 6 A-1 drift diagnostic, owner decision 2026-10-31): the hands-off owner also signs the best affordable free agent at
// the position of each of his starters who retired this offseason (after the draft). A build without retirement never triggers it.
import { writeFileSync } from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import { runFranchise, invariants } from './franchise-soak.mjs';
import { withBoardReset } from './league-soak.mjs';
import { teamOverall } from '../src/franchise/roster.js';
import { monsterOverall, salaryFor, ROSTER_MAX } from '../src/data/monsters.js';
import { ALL_TEAMS } from '../src/data/league.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const ACTIVE = args.owner === 'active'; let activeSigned = 0, activeNone = 0;
/** The active-replacement owner: for each of his starters who retired this offseason, the best free agent at that position he can afford. */
const activeReplace = (f) => { const R = f.retirementsLast; if (!R || R.year !== f.season.year) return;
  for (const x of R.owner.filter((o) => o.starter)) { if (f.roster.length >= ROSTER_MAX) break; const room = F.salarySummary(f).remaining;
    const best = F.offseasonMarket(f).map((e) => e.monster).filter((m) => m.position === x.position && salaryFor(m) <= room).sort((a, b) => monsterOverall(b) - monsterOverall(a))[0];
    if (best && F.signFreeAgent(f, best.id).ok) activeSigned++; else activeNone++; } };
// --owner=manager (Task 6 Phase D supplementary diagnostic, owner decision 2026-11-02; never replaces the drift gate): an owner who keeps his
// roster up. After the draft each offseason he (1) releases reserves past their public decline onset while the roster is above 30, then
// (2) up to MANAGER.signings times signs the free agent who most improves a starting slot (at least MANAGER.minGain over the weakest
// starter at that position), first releasing his lowest value-per-salary reserves to make cap and roster room, never going over the cap.
const MANAGER = { signings: 4, minGain: 2, keep: 30 }; const MANAGE = args.owner === 'manager'; let manSigned = 0, manReleased = 0;
const CURVE_ON = { RB: 27, WR: 28, CB: 28, LB: 29, S: 29, DL: 29, TE: 29, OL: 30, QB: 30, K: 32 };
const SLOTS = { QB: 1, RB: 1, WR: 2, TE: 1, OL: 3, DL: 2, LB: 2, CB: 2, S: 2, K: 1 };
const onsetOf = (m) => (CURVE_ON[m.position] || 28) + ((m.attributes?.durability ?? 60) >= 75 ? 1 : (m.attributes?.durability ?? 60) <= 45 ? -1 : 0);
/** The managing owner's renewals: an expiring reserve past his onset, or below the roster median, walks; starters and the rest re-sign. */
function manageContract(f, item) {
  const m = f.roster.find((x) => x.id === (item.id ?? item.monster?.id)); if (!m) return 'sign';
  const st = new Set(); for (const [pos, n] of Object.entries(SLOTS)) for (const x of f.roster.filter((y) => y.position === pos).sort((a, b) => monsterOverall(b) - monsterOverall(a)).slice(0, n)) st.add(x.id);
  if (st.has(m.id)) return 'sign'; const ovrs = f.roster.map((x) => monsterOverall(x)).sort((a, b) => a - b); const med = ovrs[Math.floor(ovrs.length / 2)];
  return (m.age || 0) > onsetOf(m) || monsterOverall(m) < med ? (f.roster.length > MANAGER.keep ? 'walk' : 'sign') : 'sign';
}
function manage(f) {
  const startersOf = () => { const st = new Set(); for (const [pos, n] of Object.entries(SLOTS)) for (const m of f.roster.filter((x) => x.position === pos).sort((a, b) => monsterOverall(b) - monsterOverall(a)).slice(0, n)) st.add(m.id); return st; };
  let st = startersOf();
  for (const m of f.roster.filter((x) => !st.has(x.id) && (x.age || 0) > onsetOf(x)).sort((a, b) => monsterOverall(a) - monsterOverall(b))) { if (f.roster.length <= MANAGER.keep) break; if (F.releaseMonster(f, m.id).ok) manReleased++; }
  for (let k = 0; k < MANAGER.signings; k++) {
    st = startersOf(); const spare = () => f.roster.filter((x) => !st.has(x.id)).sort((a, b) => monsterOverall(a) / (a.salary || 1) - monsterOverall(b) / (b.salary || 1));
    const releasable = spare().reduce((s2, x) => s2 + (x.salary || 0), 0); const room = F.salarySummary(f).remaining;
    let best = null; for (const e of F.offseasonMarket(f)) { const m = e.monster; const at = f.roster.filter((x) => st.has(x.id) && x.position === m.position); if (!at.length) continue;
      const gain = monsterOverall(m) - Math.min(...at.map((x) => monsterOverall(x))); if (gain < MANAGER.minGain || salaryFor(m) > room + releasable) continue; if (!best || gain > best.gain) best = { m, gain }; }
    if (!best) break; const need = salaryFor(best.m);
    while ((F.salarySummary(f).remaining < need || f.roster.length >= ROSTER_MAX) && f.roster.length > 27) { const x = spare()[0]; if (!x || !F.releaseMonster(f, x.id).ok) break; manReleased++; st = startersOf(); }
    if (F.salarySummary(f).remaining < need || f.roster.length >= ROSTER_MAX) break;
    if (F.signFreeAgent(f, best.m.id).ok) manSigned++; else break;
  }
}
const mode = args.mode || 'persistent', difficulty = args.difficulty || 'pro', seasons = Number(args.seasons || 8), boardReset = args.boardReset === '1' || args.boardReset === 'true';
const [s0, s1] = String(args.seeds || '1-8').split('-').map(Number); const seeds = []; for (let s = s0; s <= (s1 || s0); s++) seeds.push(s);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

const out = { mode, difficulty, seasons, seeds, boardReset, runs: [] };
for (const seed of seeds) {
  const t0 = Date.now(); const mid = {}; const rows = [];
  const clubsOf = (f) => ALL_TEAMS.filter((t) => t !== f.club);
  const base = boardReset ? withBoardReset(invariants) : invariants; // simulation only: a dismissed owner is reinstated so 20 seasons can be compared
  const check = (f, where) => { if (f.season?.week === 6 && !mid[f.season.year]) mid[f.season.year] = r1(mean(clubsOf(f).map((c) => teamOverall(F.aiTeam(f, c))))); return base(f, where); };
  const { f, problems, log } = runFranchise(seed, { seasons, difficulty, legacy: mode === 'legacy', check, onOffseason: MANAGE ? manage : ACTIVE ? activeReplace : null, contractChoice: MANAGE ? manageContract : null, onSeason: (f) => {
    const y = f.season.year; const clubs = clubsOf(f); const rec = f.season.records[f.club]; const rival = f.rivals[f.tier]?.team;
    rows.push({ year: y, w: rec.w, l: rec.l, playoffs: !!f.season.playoffs?.seeds && Object.values(f.season.playoffs.seeds).flat().includes(f.club), champion: f.season.champion, mine: teamOverall(F.playerTeam(f)), aiMid: mid[y] ?? null, aiEnd: r1(mean(clubs.map((c) => teamOverall(F.aiTeam(f, c, y))))), today: r1(mean(clubs.map((c) => teamOverall(F.legacyAiTeam(f, c, y))))), rivalEnd: teamOverall(F.aiTeam(f, rival, y)), rivalToday: teamOverall(F.legacyAiTeam(f, rival, y)), forecast: f.season.boardForecast ?? null });
  } });
  out.runs.push({ seed, club: f.club, fired: log.fired, seasonsPlayed: rows.length, rows, problems: problems.slice(0, 5), seconds: Math.round((Date.now() - t0) / 1000) });
  console.error(`${mode} ${difficulty} seed ${seed}: ${rows.map((r) => `${r.w}-${r.l}`).join(' ')}${log.fired ? ' FIRED' : ''} (${Math.round((Date.now() - t0) / 1000)}s)`);
}
const all = out.runs.flatMap((r) => r.rows);
out.summary = { seasons: all.length, winPct: r1(100 * mean(all.map((r) => r.w / (r.w + r.l)))), playoffPct: r1(100 * mean(all.map((r) => (r.playoffs ? 1 : 0)))), titles: all.filter((r) => r.champion === out.runs.find((x) => x.rows.includes(r))?.club).length, fired: out.runs.filter((r) => r.fired).length, aiMid: r1(mean(all.map((r) => r.aiMid).filter((x) => x != null))), aiEnd: r1(mean(all.map((r) => r.aiEnd))), today: r1(mean(all.map((r) => r.today))), rivalEnd: r1(mean(all.map((r) => r.rivalEnd))), rivalToday: r1(mean(all.map((r) => r.rivalToday))), distinctChampions: r1(mean(out.runs.map((r) => new Set(r.rows.map((x) => x.champion)).size))), byYear: Object.fromEntries(Array.from({ length: seasons }, (_, i) => i + 1).map((y) => { const ys = all.filter((r) => r.year === y); return [y, ys.length ? { n: ys.length, winPct: r1(100 * mean(ys.map((r) => r.w / (r.w + r.l)))), aiMid: r1(mean(ys.map((r) => r.aiMid).filter((x) => x != null))), aiEnd: r1(mean(ys.map((r) => r.aiEnd))), today: r1(mean(ys.map((r) => r.today))) } : null]; })) };
out.summary.byBlock = Object.fromEntries([[1, 5], [6, 10], [11, 15], [16, 20]].filter(([a]) => a <= seasons).map(([a, b]) => { const ys = all.filter((r) => r.year >= a && r.year <= b); return [`${a}-${b}`, ys.length ? { n: ys.length, winPct: r1(100 * mean(ys.map((r) => r.w / (r.w + r.l)))), aiMid: r1(mean(ys.map((r) => r.aiMid).filter((x) => x != null))), aiEnd: r1(mean(ys.map((r) => r.aiEnd))), today: r1(mean(ys.map((r) => r.today))), rivalGap: r1(mean(ys.map((r) => r.rivalEnd - r.rivalToday))), champions: new Set(ys.map((r) => r.champion)).size } : null]; }));
if (ACTIVE) out.summary.activeOwner = { signed: activeSigned, noAffordableReplacement: activeNone };
if (MANAGE) out.summary.managerOwner = { signed: manSigned, released: manReleased, perSeason: Math.round(100 * manSigned / Math.max(1, all.length)) / 100 };
console.log(JSON.stringify(out.summary, null, 1));
if (args.json) writeFileSync(args.json, JSON.stringify(out, null, 1));
