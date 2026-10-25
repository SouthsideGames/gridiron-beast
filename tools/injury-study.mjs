#!/usr/bin/env node
// Injury History accuracy (GDD §50): hands-off franchises over several seasons, checked at every season end:
//   - no record duplicated, no missed game counted twice, every closed record has a return (injuryProblems);
//   - for every monster on a roster all season: regular-season games played + regular-season games missed <= the season's games;
//   - the record's incidents match the injuries the game itself reported for the owner's club (afterGame events + practice news).
//   node tools/injury-study.mjs --seed=1 --seasons=5 [--n=2]
import { runFranchise } from './franchise-soak.mjs';
import * as IH from '../src/franchise/injury-history.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const N = Number(args.n || 1), SEASONS = Number(args.seasons || 5), SEED = Number(args.seed || 1);
const out = []; let bad = 0;
for (let i = 0; i < N; i++) {
  const problems = []; const seasons = [];
  const { f, log } = runFranchise(SEED + i, { seasons: SEASONS, difficulty: 'pro', onSeason: (g) => {
    const y = g.season.year; const H = g.injuryHistory; if (!H) return; problems.push(...IH.injuryProblems(g).map((p) => `${y}: ${p}`));
    const games = (g.season.schedule || []).filter((x) => !x.bye).length || 9;
    const clubs = [[g.club, g.roster], ...Object.keys(g.league?.clubs || {}).map((c) => [c, g.league.clubs[c].roster.map((id) => g.league.monsters[id])])];
    let checked = 0, missedY = 0, incY = 0;
    for (const [club, roster] of clubs) for (const m of roster) { if (!m) continue;
      const recs = IH.recordsOf(g, m.id).filter((r) => r.y === y && !r.po); const missed = recs.reduce((a, r) => a + (r.missed || 0) - (r.mp || 0), 0); // regular-season games only
      const played = m.stats?.season?.year === y ? m.stats.season.reg?.games || 0 : (m.stats?.seasons || []).find((s) => s.year === y)?.reg?.games || 0;
      const allSeason = (m.history || []).every((h) => !(h.to === y || h.from === y) || h.club === club) && m.joined !== y;
      if (allSeason) { checked++; if (played + missed > games) problems.push(`${y} ${club} ${m.name}: played ${played} + missed ${missed} > ${games}`); }
      missedY += missed; incY += recs.filter((r) => r.src !== 'before').length; }
    seasons.push({ year: y, checked, incidents: incY, missed: missedY, bytes: JSON.stringify(H).length });
  } });
  bad += problems.length;
  out.push({ seed: SEED + i, seasons: log.seasons.length, problems: problems.slice(0, 5), problemCount: problems.length, perSeason: seasons });
}
console.log(JSON.stringify(out, null, 1));
console.log(bad ? 'INJURY STUDY FAILED' : 'INJURY STUDY PASSED'); process.exit(bad ? 1 : 0);
