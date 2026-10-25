#!/usr/bin/env node
// Injury History denominator verification (GDD §50.3), on disposable franchises. The rate is games missed (or injuries) over
// games of OPPORTUNITY = game-day lineup appearances (the players injuries are rolled for) + games missed to injury, so:
//   1. Appearances agree with the game's own box scores: for every monster on one club all season (tracked from week 1), his
//      box-score games (a game with a non-zero stat line) <= appearances <= his club's games. Appearances are exposure to the
//      injury roll, which progression.afterGame makes for every lineup slot (K aside) whether or not he records a stat, so a
//      lineup player with an empty stat line is an appearance without a box-score game (reported, never the other way).
//   2. Bench monsters (no appearances) gain no opportunity and stay "Not enough history yet", never "Low" by default.
//   3. Starters and backups are classified by the same per-opportunity rates; the summary's numbers recompute by hand.
//   4. Tracking that begins mid-career (stripped, then resumed at week 5 of season 3) counts only games since it began:
//      no fabricated injuries or appearances, the note shows, and the rates use the tracked span only.
//   node tools/injury-verify.mjs [--seed=41] [--seasons=3]
import { runFranchise } from './franchise-soak.mjs';
import * as F from '../src/franchise/franchise.js';
import * as IH from '../src/franchise/injury-history.js';
import { careerInjuryHtml } from '../src/ui/injury-ui.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const SEED = Number(args.seed || 41), SEASONS = Number(args.seasons || 3);
const problems = []; const check = (c, m) => { if (!c && problems.length < 40) problems.push(m); return !!c; };
const clubsOf = (g) => [[g.club, g.roster], ...Object.keys(g.league?.clubs || {}).map((c) => [c, g.league.clubs[c].roster.map((id) => g.league.monsters[id]).filter(Boolean)])];
const gamesIn = (m, y) => { const b = m.stats?.season?.year === y ? m.stats.season : (m.stats?.seasons || []).find((s) => s.year === y); return { reg: b?.reg?.games || 0, post: b?.post?.games || 0 }; };
const clubGamesIn = (g, club, y) => { const rec = (g.history?.find?.((h) => h.year === y)?.standings || null); const reg = (g.season.schedule || []).filter((x) => !x.bye).length || 9; return reg + 4; }; // regular season + at most the playoff rounds
const groups = { starter: { n: 0, early: 0, low: 0, moderate: 0, high: 0 }, backup: { n: 0, early: 0, low: 0, moderate: 0, high: 0 }, bench: { n: 0, early: 0, low: 0, moderate: 0, high: 0 } };
let prevOpp = {}; let compared = 0, matched = 0, emptyLine = 0; const mism = [];
function recompute(g, id) { // by hand, from the raw record
  const recs = IH.recordsOf(g, id); const inc = recs.filter((r) => r.src !== 'before').length; const missed = recs.reduce((a, r) => a + (r.missed || 0), 0);
  const opp = (g.injuryHistory.opp[id] || 0) + missed; if (opp < 9) return { opp, ind: 'early' };
  const mr = missed / opp, ps = inc / opp * 9; return { opp, ind: mr >= 0.10 || ps >= 1.0 ? 'high' : mr >= 0.05 || ps >= 0.6 ? 'moderate' : 'low' };
}
const { f } = runFranchise(SEED, { seasons: SEASONS, difficulty: 'pro', onSeason: (g) => {
  const H = g.injuryHistory; if (!H) return; const y = g.season.year; const fromWk1 = H.since.y < y || H.since.w === 1;
  for (const [club, roster] of clubsOf(g)) for (const m of roster) {
    const gain = (H.opp[m.id] || 0) - (prevOpp[m.id] || 0);
    const allSeason = (m.history || []).every((h) => !(h.to === y || h.from === y) || h.club === club) && m.joined !== y;
    if (fromWk1 && allSeason && m.position !== 'K') { const gi = gamesIn(m, y); const box = gi.reg + gi.post; const clubGames = clubGamesIn(g, club, y); compared++; if (gain === box) matched++; else if (gain > box && gain <= clubGames) emptyLine++; else if (mism.length < 8) mism.push(`${y} ${club} ${m.name} ${m.position}: appearances ${gain} vs box-score games ${box}, club games ${clubGames}`); }
  }
  prevOpp = { ...H.opp };
} });
check(compared > 500 && matched + emptyLine === compared, `box-score games <= appearances <= club games: ${mism.join('; ')}`);
// Classification by role, at the end of the run (cumulative since week 1 of season 1).
const H = f.injuryHistory; const seasonsGames = SEASONS * 9;
for (const [, roster] of clubsOf(f)) for (const m of roster) {
  if (m.position === 'K') continue; const s = IH.injurySummary(f, m.id); const app = H.opp[m.id] || 0; const by = recompute(f, m.id);
  check(s.indicator === by.ind && s.opp === by.opp, `${m.name}: summary ${s.indicator}/${s.opp} vs by hand ${by.ind}/${by.opp}`);
  const role = app === 0 ? 'bench' : app >= 0.6 * seasonsGames ? 'starter' : 'backup'; groups[role].n++; groups[role][s.indicator]++;
  if (role === 'bench') check(s.indicator === 'early' || s.missed >= 9, `bench ${m.name} classified ${s.indicator} without exposure`);
  if (s.opp < IH.MIN_OPPORTUNITY) check(s.indicator === 'early', `${m.name} with ${s.opp} opportunity classified ${s.indicator}`);
}
check(groups.bench.low === 0, `no bench monster reads Low (${groups.bench.low})`);
// Mid-career: strip the record (as a pre-v42.3.0 save would have none), resume at week 5 of the next season.
const { f: g } = runFranchise(SEED + 1, { seasons: 2, difficulty: 'pro' });
const strip = (x) => { delete x.injuryHistory; for (const [, r] of clubsOf(x)) for (const m of r) { if (m.injury) delete m.injury.rec; if (m.career?.events) m.career.events = m.career.events.filter((e) => !/^inj/.test(e.k)); } };
strip(g); F.startNextSeason(g); const wk = (x) => { let n = 0; while (x.season.day < 6 && n++ < 10) { if (!F.autoRunToSunday(x).ok) break; } if (F.isBye(x)) F.takeBye(x); else F.finishSunday(x, F.simulatePlayerGame(x)); };
while (g.season.week < 5) wk(g); strip(g); const startY = g.season.year, startW = g.season.week;
const gamesBefore = {}; for (const [, r] of clubsOf(g)) for (const m of r) { const gi = gamesIn(m, startY); gamesBefore[m.id] = gi.reg + gi.post; }
let guard = 0; while (g.season.year === startY && !g.season.finished && guard++ < 30) { if (F.inPlayoffs(g) && !F.playoffFixture(g)) { F.skipPlayoffs(g); continue; } wk(g); }
const G = g.injuryHistory; check(G.since.y === startY && G.since.w === startW, `mid-career tracking begins at season ${startY} week ${startW}: ${JSON.stringify(G.since)}`);
let vets = 0, notes = 0, midCompared = 0, midMatched = 0, midEmpty = 0;
for (const [club, r] of clubsOf(g)) for (const m of r) {
  const recs = IH.recordsOf(g, m.id); check(recs.every((x) => x.y > startY || (x.y === startY && x.w >= startW)), `${m.name}: a record dated before tracking`);
  const gi = gamesIn(m, startY); const since = gi.reg + gi.post - (gamesBefore[m.id] ?? 0); const app = G.opp[m.id] || 0;
  if (m.position !== 'K' && gamesBefore[m.id] != null && (m.history || []).every((h) => !(h.to === startY || h.from === startY) || h.club === club)) { midCompared++; if (app === since) midMatched++; else if (app > since) midEmpty++; else check(false, `${m.name}: ${app} appearances since tracking < ${since} box-score games`); }
  check(app <= 9 - startW + 1 + 4, `${m.name}: ${app} appearances in the tracked span`);
  if (gamesBefore[m.id] > 0) { vets++; if (careerInjuryHtml(g, m.id, { firstSeason: 1 }).includes('tracking began in')) notes++; }
}
check(midCompared > 300 && midMatched + midEmpty === midCompared, 'mid-career: appearances since tracking never below box-score games since tracking');
check(vets > 0 && notes === vets, `every veteran shows the tracking note (${notes}/${vets})`);
check(IH.injuryProblems(f).length === 0 && IH.injuryProblems(g).length === 0, 'valid records');
console.log(JSON.stringify({ seed: SEED, seasons: SEASONS, appearancesVsBoxScores: { compared, equal: matched, lineupWithEmptyStatLine: emptyLine }, byRole: groups, midCareer: { since: G.since, appearancesVsBoxScores: { compared: midCompared, equal: midMatched, lineupWithEmptyStatLine: midEmpty }, veteransWithNote: `${notes}/${vets}` }, problems }, null, 1));
console.log(problems.length ? 'INJURY VERIFY FAILED' : 'INJURY VERIFY PASSED'); process.exit(problems.length ? 1 : 0);
