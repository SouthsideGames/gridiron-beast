#!/usr/bin/env node
// Tuesday encounter difficulty study (GDD §26.1, 3v3): for real franchise weeks, battle each scouted prospect group against a
// weak, an average, a strong and the automatic lineup from the roster, without changing the franchise (battles use snapshots).
// Reports win rates by lineup tier, by the OVR gap between the sides and by season.
//   node tools/tuesday-study.mjs [--n=24] [--seasons=2] [--reps=4]
import * as F from '../src/franchise/franchise.js';
import { runBattle, snapMonster, autoLineup, eligibleBattlers, CLASH_SIZE } from '../src/franchise/clash-link.js';
import { monsterOverall } from '../src/data/monsters.js';
import { newFranchise } from './franchise-soak.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const N = Number(args.n || 24), SEASONS = Number(args.seasons || 2), REPS = Number(args.reps || 4), SEED0 = Number(args.seed || 500), RULE = args.rule || 'new', GAP = args.gap != null ? Number(args.gap) : null;
import { REGIONS as REGION_MAP } from '../src/data/staff.js';
const REGIONS = Object.keys(REGION_MAP);
const avg = (xs) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
const rows = [];

function lineups(roster) {
  const pool = eligibleBattlers(roster).slice().sort((a, b) => monsterOverall(a) - monsterOverall(b)); const n = CLASH_SIZE.encounter; const mid = Math.max(0, Math.floor(pool.length / 2) - 1);
  return { weak: pool.slice(0, n), average: pool.slice(mid, mid + n), strong: pool.slice(-n), auto: autoLineup(roster, n, 1) };
}
// Variants measured on the same weeks: 'old' (the other scouted prospects as companions, before 2026-10-22), 'new' (the shipped
// COMPANION_RULE), and 'gap=N' tuning candidates. Every variant uses the same battle seeds.
const VARIANTS = RULE === 'both' ? ['old', 'new', ...(args.gaps ? String(args.gaps).split(',').map((g) => `gap=${g}`) : [])] : RULE === 'old' ? ['old'] : args.gaps ? String(args.gaps).split(',').map((g) => `gap=${g}`) : [GAP != null ? `gap=${GAP}` : 'new'];
function wildFor(f, ps, i, variant) {
  if (variant === 'old') return [ps[i], ...ps.filter((x, j) => j !== i)].slice(0, CLASH_SIZE.encounter).map((p) => p.monster);
  const rule = variant.startsWith('gap=') ? { gap: Number(variant.slice(4)) } : undefined;
  return [ps[i].monster, ...F.encounterCompanions(f, i, CLASH_SIZE.encounter - 1, rule)];
}
function measure(f, season) {
  const ps = f.week.prospects || []; const L = lineups(f.roster);
  for (let i = 0; i < ps.length; i++) for (const variant of VARIANTS) {
    const wild = wildFor(f, ps, i, variant); if (wild.length < CLASH_SIZE.encounter) continue;
    const wildOvr = avg(wild.map(monsterOverall)); const lead = monsterOverall(ps[i].monster);
    for (const [tier, mine] of Object.entries(L)) {
      if (mine.length < CLASH_SIZE.encounter) continue; const mineOvr = avg(mine.map(monsterOverall));
      for (let k = 0; k < REPS; k++) {
        const seed = (f.seed * 7919 + season * 104729 + f.season.week * 1299709 + i * 31 + k * 7) >>> 0;
        const res = runBattle({ a: mine.map(snapMonster), b: wild.slice(0, mine.length).map(snapMonster), seed, mode: 'auto', log: 'none' });
        rows.push({ variant, difficulty: f.settings.difficulty, season, week: f.season.week, tier, gap: Math.round(mineOvr - wildOvr), lead, wildOvr, mineOvr, win: res.winner === 'a' });
      }
    }
  }
}
for (let s0 = 0; s0 < N; s0++) {
  const f = newFranchise(SEED0 + s0, { difficulty: Object.keys(F.DIFFICULTY)[s0 % 3] });
  for (let season = 1; season <= SEASONS; season++) {
    let guard = 0;
    while (!f.season.finished && guard++ < 60) {
      if (F.inPlayoffs(f) && !F.playoffFixture(f)) { F.skipPlayoffs(f); continue; }
      if (f.week.commissioner) { F.commissionerRelease(f, f.week.commissioner.names[0]); continue; }
      if (f.season.day === 0 && !F.draftWindow(f) && !F.inPlayoffs(f)) { F.scoutRegion(f, REGIONS[(f.season.week + s0) % REGIONS.length]); if (f.season.day === 1) { measure(f, season); F.skipEncounter(f); } }
      F.autoRunToSunday(f);
      if (F.isBye(f)) { F.takeBye(f); continue; }
      const m = F.sundayMatchup(f); if (!m) break; if (m.forfeit) { F.forfeitSunday(f); continue; }
      const g = F.simulatePlayerGame(f); F.finishSunday(f, g);
    }
    if (season === SEASONS || F.isFired(f)) break;
    if (f.postseason && !f.postseason.resolved) F.resolvePostseason(f, F.postseasonEvent(f).options[0].id);
    if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
    for (const it of F.offseasonPending(f)) F.resolveContract(f, it.id, 'sign');
    if (!F.beginDraft(f).ok) break; let dg = 0; while (!f.draft.done && dg++ < 80) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; }
    let fa = 0; while (f.roster.length < F.ROSTER_MIN && fa++ < 20) { const mk = F.offseasonMarket(f).map((x) => x.monster).sort((a, b) => a.salary - b.salary); if (!mk[0] || !F.signFreeAgent(f, mk[0].id).ok) break; }
    if (!F.startNextSeason(f).ok) break;
  }
}
const pct = (xs) => xs.length ? `${Math.round(xs.filter((r) => r.win).length / xs.length * 100)}% (${xs.length})` : '-';
if (args.out) (await import('node:fs')).writeFileSync(args.out, JSON.stringify(rows));
const report = {};
for (const v of VARIANTS) {
  const R = rows.filter((r) => r.variant === v); const out = { battles: R.length, byTier: {}, bySeason: {}, byDifficulty: {}, ovr: {} };
  for (const t of ['auto', 'strong', 'average', 'weak']) { const xs = R.filter((r) => r.tier === t); out.byTier[t] = pct(xs); out.ovr[t] = `mine ${avg(xs.map((r) => r.mineOvr)).toFixed(1)} vs wild ${avg(xs.map((r) => r.wildOvr)).toFixed(1)}`; }
  for (let s = 1; s <= SEASONS; s++) out.bySeason[`S${s}`] = ['auto', 'strong', 'average', 'weak'].map((t) => `${t} ${pct(R.filter((r) => r.season === s && r.tier === t)).split(' ')[0]}`).join(' · ');
  for (const d of Object.keys(F.DIFFICULTY)) out.byDifficulty[d] = ['auto', 'strong', 'average', 'weak'].map((t) => `${t} ${pct(R.filter((r) => r.difficulty === d && r.tier === t)).split(' ')[0]}`).join(' · ');
  report[v] = out;
}
console.log(JSON.stringify(report, null, 1));
