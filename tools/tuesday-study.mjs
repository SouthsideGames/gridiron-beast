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
const N = Number(args.n || 24), SEASONS = Number(args.seasons || 2), REPS = Number(args.reps || 4);
import { REGIONS as REGION_MAP } from '../src/data/staff.js';
const REGIONS = Object.keys(REGION_MAP);
const avg = (xs) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
const rows = [];

function lineups(roster) {
  const pool = eligibleBattlers(roster).slice().sort((a, b) => monsterOverall(a) - monsterOverall(b)); const n = CLASH_SIZE.encounter; const mid = Math.max(0, Math.floor(pool.length / 2) - 1);
  return { weak: pool.slice(0, n), average: pool.slice(mid, mid + n), strong: pool.slice(-n), auto: autoLineup(roster, n, 1) };
}
function measure(f, season) {
  const ps = f.week.prospects || []; const L = lineups(f.roster);
  for (let i = 0; i < ps.length; i++) {
    const wild = [ps[i], ...ps.filter((x, j) => j !== i)].slice(0, CLASH_SIZE.encounter).map((p) => p.monster);
    const wildOvr = avg(wild.map(monsterOverall)); const lead = monsterOverall(ps[i].monster);
    for (const [tier, mine] of Object.entries(L)) {
      if (mine.length < CLASH_SIZE.encounter) continue; const mineOvr = avg(mine.map(monsterOverall));
      for (let k = 0; k < REPS; k++) {
        const seed = (f.seed * 7919 + season * 104729 + f.season.week * 1299709 + i * 31 + k * 7) >>> 0;
        const res = runBattle({ a: mine.map(snapMonster), b: wild.slice(0, mine.length).map(snapMonster), seed, mode: 'auto', log: 'none' });
        rows.push({ season, week: f.season.week, tier, gap: Math.round(mineOvr - wildOvr), lead, wildOvr, mineOvr, win: res.winner === 'a' });
      }
    }
  }
}
for (let s0 = 0; s0 < N; s0++) {
  const f = newFranchise(500 + s0, { difficulty: ['rookie', 'pro', 'allstar', 'legend'][s0 % 4] });
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
const out = { battles: rows.length, byTier: {}, bySeasonTier: {}, byGap: {}, byLead: {}, ovr: {} };
for (const t of ['weak', 'average', 'strong', 'auto']) { const xs = rows.filter((r) => r.tier === t); out.byTier[t] = pct(xs); out.ovr[t] = `mine ${avg(xs.map((r) => r.mineOvr)).toFixed(1)} vs wild ${avg(xs.map((r) => r.wildOvr)).toFixed(1)}`; for (let s = 1; s <= SEASONS; s++) out.bySeasonTier[`S${s} ${t}`] = pct(xs.filter((r) => r.season === s)); }
for (const [lo, hi] of [[-99, -10], [-10, -5], [-5, 0], [0, 5], [5, 10], [10, 99]]) out.byGap[`${lo}..${hi}`] = pct(rows.filter((r) => r.gap >= lo && r.gap < hi));
for (const [lo, hi] of [[0, 55], [55, 60], [60, 65], [65, 70], [70, 99]]) out.byLead[`prospect ${lo}-${hi}`] = pct(rows.filter((r) => r.tier === 'auto' && r.lead >= lo && r.lead < hi));
console.log(JSON.stringify(out, null, 1));
