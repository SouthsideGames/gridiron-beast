#!/usr/bin/env node
// Board study (GDD §17.4, §29): hands-off franchises (the staff runs every week, the trainer spends points, every contract is
// re-signed, the draft takes the best prospect) over several seasons on every difficulty.
//   --mode=live   the real Board decides; a fired owner's franchise ends (what a player would see).
//   --mode=facts  the Board is reset after every season so every franchise plays all seasons; the season facts (forecast, record,
//                 playoffs, badges, title, goal offers) are written out so different Board rules can be compared on identical
//                 seasons (tools/board-replay.mjs).
//   node tools/board-study.mjs [--n=8] [--seasons=5] [--seed=1] [--mode=live|facts] [--goal=safe|medium] [--out=file.json]
import fs from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import { ROSTER_MAX, ROSTER_MIN, monsterOverall } from '../src/data/monsters.js';
import { ALL_TEAMS } from '../src/data/league.js';
import { newFranchise } from './franchise-soak.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const N = Number(args.n || 8), SEASONS = Number(args.seasons || 5), SEED0 = Number(args.seed || 1), MODE = args.mode || 'live', GOAL = args.goal || 'safe';
const DIFFS = Object.keys(F.DIFFICULTY);

function bestProspect(f) { const d = f.draft; return (d?.class || []).filter((m) => (d.available || []).includes(m.id)).sort((a, b) => monsterOverall(b) - monsterOverall(a))[0] || null; }

export function playFranchise(seed, difficulty, { seasons = SEASONS, mode = MODE, goal = GOAL } = {}) {
  const f = newFranchise(seed, { difficulty }); const rows = [];
  for (let s = 1; s <= seasons; s++) {
    let offers = null;
    if (F.needsGoal(f)) { offers = F.commissionerGoals(f); const pick = offers.find((o) => o.tier === goal) || offers[0]; F.chooseGoal(f, pick.id); }
    const ex = f.season.expectations || {}; const mine = ex[f.club] || {};
    const talents = ALL_TEAMS.map((t) => ex[t]?.talent).filter(Number.isFinite); const exps = ALL_TEAMS.map((t) => ex[t]?.expectedWinPct).filter(Number.isFinite);
    const goal0 = f.board?.goal ? { ...f.board.goal } : null; const confBefore = f.board?.confidence ?? 0;
    let guard = 0;
    while (!f.season.finished && guard++ < 60) {
      if (F.inPlayoffs(f) && !F.playoffFixture(f)) { F.skipPlayoffs(f); continue; }
      if (f.week.commissioner) { F.commissionerRelease(f, f.week.commissioner.names[0]); continue; }
      F.autoRunToSunday(f);
      if (F.isBye(f)) { F.takeBye(f); continue; }
      const m = F.sundayMatchup(f); if (!m) break; if (m.forfeit) { F.forfeitSunday(f); continue; }
      F.finishSunday(f, F.simulatePlayerGame(f));
    }
    const rec = F.record(f); const v = f.season.boardVerdict || null;
    const seeds = f.season.playoffs?.seeds ? Object.values(f.season.playoffs.seeds).flat() : [];
    const rank = 1 + talents.filter((t) => t > (mine.talent ?? 0)).length;
    rows.push({ seed, difficulty, season: s, year: f.season.year, talent: mine.talent, leagueTalent: talents.reduce((a, b) => a + b, 0) / talents.length, talentRank: rank,
      expectedWinPct: mine.expectedWinPct, leagueExpected: exps.reduce((a, b) => a + b, 0) / exps.length, lastWinPct: mine.lastWinPct ?? null,
      offers, goal: goal0, w: rec.w, l: rec.l, playoffs: seeds.includes(f.club), champion: f.season.champion === f.club,
      badges: Object.values(f.campaign?.badges || {}).filter((b) => b.year === f.season.year).length, gyms: offers?.find((o) => o.id === 'badges') ? Number((offers.find((o) => o.id === 'badges').text.match(/(\d+) gym/) || [])[1] || 0) : null,
      met: v?.met ?? null, confBefore, confAfter: f.board?.confidence ?? 0, status: v?.status || null, fired: F.isFired(f) });
    if (F.isFired(f)) { if (mode === 'live') break; }
    if (mode === 'facts') { f.board = { confidence: 0, goal: null, history: [], scoutBonusYear: null, fired: false }; }
    if (s === seasons) break;
    if (f.postseason && !f.postseason.resolved) F.resolvePostseason(f, F.postseasonEvent(f).options[0].id);
    if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
    for (const it of F.offseasonPending(f)) { if (!F.resolveContract(f, it.id, 'sign').ok) F.resolveContract(f, it.id, 'walk'); }
    if (!F.beginDraft(f).ok) break;
    let dg = 0; while (!f.draft.done && dg++ < 80) { if (F.onTheClock(f) === f.club) { const b = bestProspect(f); const r = b && f.roster.length < ROSTER_MAX ? F.myDraftPick(f, b.id) : F.passDraftPick(f); if (!r.ok) F.passDraftPick(f); } else break; }
    let fa = 0; while (f.roster.length < ROSTER_MIN && fa++ < 20) { const mk = F.offseasonMarket(f).map((x) => x.monster).sort((a, b) => a.salary - b.salary); if (!mk[0] || !F.signFreeAgent(f, mk[0].id).ok) break; }
    if (!F.startNextSeason(f).ok) break;
  }
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const all = [];
  for (let i = 0; i < N; i++) for (const d of DIFFS) all.push(...playFranchise(SEED0 + i, d));
  if (args.out) fs.writeFileSync(args.out, JSON.stringify(all));
  const by = (k) => { const g = {}; for (const r of all) (g[r[k]] ||= []).push(r); return g; };
  const franchises = new Map(); for (const r of all) { const key = `${r.seed}|${r.difficulty}`; (franchises.get(key) || franchises.set(key, []).get(key)).push(r); }
  const fired = [...franchises.values()].filter((rs) => rs.some((r) => r.fired));
  const out = { mode: MODE, goal: GOAL, franchises: franchises.size, seasons: all.length, fired: fired.length,
    firedByDifficulty: Object.fromEntries(DIFFS.map((d) => [d, `${fired.filter((rs) => rs[0].difficulty === d).length}/${[...franchises.values()].filter((rs) => rs[0].difficulty === d).length}`])),
    goalMetPct: Math.round(all.filter((r) => r.met).length / all.filter((r) => r.met != null).length * 100), avgConfidence: +(all.reduce((a, r) => a + r.confAfter, 0) / all.length).toFixed(2),
    firedRecords: fired.map((rs) => `${rs[0].difficulty} s${rs[0].seed}: ${rs.map((r) => `${r.w}-${r.l}${r.goal ? `(${r.goal.label}${r.met ? ' ✓' : ' ✗'})` : ''}`).join(', ')}`),
    forecastVsActual: Object.fromEntries(DIFFS.map((d) => { const rs = by('difficulty')[d] || []; return [d, { forecastWins: +(rs.reduce((a, r) => a + r.expectedWinPct * 9, 0) / rs.length).toFixed(2), actualWins: +(rs.reduce((a, r) => a + r.w, 0) / rs.length).toFixed(2), leagueExpectedSum: +(rs.reduce((a, r) => a + r.leagueExpected, 0) / rs.length).toFixed(3), talent: +(rs.reduce((a, r) => a + r.talent, 0) / rs.length).toFixed(1), leagueTalent: +(rs.reduce((a, r) => a + r.leagueTalent, 0) / rs.length).toFixed(1) }]; })) };
  console.log(JSON.stringify(out, null, 1));
}
