#!/usr/bin/env node
// Balance audit 2026-11-25: summarise franchise runs written by tools/ai-franchise-benchmark.mjs (harness v4). Read-only.
// Per run and per season: the owner's record, AI strength and parity, titles, the cap and rosters, contracts and salary by
// position, the free-agency market, the monster population (overall, age, level, evolution stage, ageless), departures by reason,
// football totals and award positions (when the run recorded them), save size. Snapshots at seasons 1, 5, 10, 15 and 20.
//   node tools/balance-audit/franchise-analyze.mjs FILE.json [FILE.json ...] [--out=summary.json]
import fs from 'node:fs';
const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const OUT = (process.argv.find((a) => a.startsWith('--out=')) || '').slice(6) || null;
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const sd = (a) => { const m = mean(a); return a.length ? Math.sqrt(mean(a.map((v) => (v - m) ** 2))) : null; };
const r1 = (x, d = 1) => (x == null || Number.isNaN(x) ? null : Math.round(x * 10 ** d) / 10 ** d);
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
const POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];
const out = { files, runs: [] };
for (const file of files) {
  const J = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const run of J.runs) {
    const v4 = run.v4 || {}; const cols = v4.monsterColumns || []; const ci = Object.fromEntries(cols.map((c, i) => [c, i]));
    const rows = run.rows || []; const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
    const gymOf = Object.fromEntries(Object.entries(v4.clubs || {}).map(([c, x]) => [c, x.gym]));
    const titles = {}; const seasons = [];
    for (const y of years) {
      const ys = rows.filter((r) => r.year === y); const ai = ys.filter((r) => !r.owner); const own = ys.find((r) => r.owner);
      const winp = ai.map((r) => r.w / Math.max(1, r.w + r.l)); const champ = ys.find((r) => r.champion)?.club || null; if (champ) titles[champ] = (titles[champ] || 0) + 1;
      const S = (v4.seasons || []).find((s) => s.year === y) || {};
      const mons = (S.monsters || []).map((m) => Object.fromEntries(cols.map((c) => [c, m[ci[c]]])));
      const lg = mons.filter((m) => m.club !== run.ownerClub);
      const byPosSalary = Object.fromEntries(POS.map((p) => { const xs = lg.filter((m) => m.pos === p && !m.protected && m.salary); const st = xs.filter((m) => m.starter); return [p, { n: xs.length, meanSalary: Math.round(mean(xs.map((m) => m.salary)) || 0), starterMeanSalary: Math.round(mean(st.map((m) => m.salary)) || 0), starterMeanOvr: r1(mean(st.map((m) => m.ovr))), salaryPerOvrStarter: r1(mean(st.map((m) => m.salary / Math.max(1, m.ovr))), 0) }]; }));
      const ownerGames = (S.games || []).filter((g) => g[1] === run.ownerClub || g[2] === run.ownerClub);
      const ownerForfeits = ownerGames.filter((g) => (g[1] === run.ownerClub && g[3] === 0 && g[4] === 21) || (g[2] === run.ownerClub && g[4] === 0 && g[3] === 21)).length;
      const allGames = S.games || []; const margins = allGames.map((g) => Math.abs((g[3] || 0) - (g[4] || 0)));
      const fa = S.fa || null; const aiSigns = fa ? fa.signs.filter((x) => !x.owner) : [];
      seasons.push({ year: y,
        owner: own ? { w: own.w, l: own.l, playoffs: own.playoffs, champion: own.champion, teamOvr: own.teamOvr, roster: own.rosterSize, forfeits0to21: ownerForfeits, games: ownerGames.length } : null,
        ai: { clubs: ai.length, teamOvrMean: r1(mean(ai.map((r) => r.teamOvr))), teamOvrSd: r1(sd(ai.map((r) => r.teamOvr))), teamOvrMin: Math.min(...ai.map((r) => r.teamOvr)), teamOvrMax: Math.max(...ai.map((r) => r.teamOvr)), winPctSd: r1(100 * sd(winp)), rivalOvr: ai.find((r) => r.isRival)?.teamOvr ?? null, gymOvr: r1(mean(ai.filter((r) => gymOf[r.club]).map((r) => r.teamOvr))), ordinaryOvr: r1(mean(ai.filter((r) => !gymOf[r.club]).map((r) => r.teamOvr))),
          capRoomMean: Math.round(mean(ai.map((r) => r.capRoom))), capRoomMin: Math.min(...ai.map((r) => r.capRoom)), negativeCap: ai.filter((r) => r.capRoom < 0).length, payrollMean: Math.round(mean(ai.map((r) => r.payroll))),
          rosterMin: Math.min(...ai.map((r) => r.rosterSize)), rosterMax: Math.max(...ai.map((r) => r.rosterSize)), lineupProblems: ai.reduce((n, r) => n + (r.lineupProblems || 0), 0), weakGroupClubs: ai.filter((r) => (r.weakGroups || []).length).length,
          meanAge: r1(mean(ai.map((r) => r.meanAge))), starterAge: r1(mean(ai.map((r) => r.starterAge))), devMean: r1(mean(ai.map((r) => r.devMean).filter((x) => x != null))), evolved: ai.reduce((n, r) => n + (r.evolved || 0), 0), meanLevel: r1(mean(ai.map((r) => r.meanLevel))), stage1: ai.reduce((n, r) => n + (r.stage1 || 0), 0), stage2: ai.reduce((n, r) => n + (r.stage2 || 0), 0), injured: ai.reduce((n, r) => n + (r.injured || 0), 0) },
        champion: champ, championGym: champ ? (gymOf[champ] || null) : null, championOwner: champ === run.ownerClub,
        games: { n: allGames.length, meanMargin: r1(mean(margins)), blowout21: allGames.filter((g) => Math.abs(g[3] - g[4]) >= 21).length, score0to21: allGames.filter((g) => (g[3] === 0 && g[4] === 21) || (g[3] === 21 && g[4] === 0)).length, pointsPerTeamGame: r1(mean(allGames.flatMap((g) => [g[3], g[4]]))) },
        monsters: { n: mons.length, ovrMean: r1(mean(mons.map((m) => m.ovr))), ovr80: mons.filter((m) => m.ovr >= 80).length, ovr90: mons.filter((m) => m.ovr >= 90).length, ovr95: mons.filter((m) => m.ovr >= 95).length, ageless: mons.filter((m) => m.ageless).length, agelessStarters: mons.filter((m) => m.ageless && m.starter).length, level50: mons.filter((m) => m.level >= 50).length, levelMean: r1(mean(mons.map((m) => m.level))), stage2: mons.filter((m) => m.stage >= 2).length, starterOvr: r1(mean(mons.filter((m) => m.starter).map((m) => m.ovr))), reserveOvr: r1(mean(mons.filter((m) => !m.starter).map((m) => m.ovr))), contract3y: mons.filter((m) => m.contractYears === 3).length, contractYearsMean: r1(mean(mons.map((m) => m.contractYears).filter((x) => x != null))) },
        salaryByPos: byPosSalary,
        fa: fa ? { aiSignings: aiSigns.length, ownerSignings: fa.signs.length - aiSigns.length, contested2plus: aiSigns.filter((x) => x.bidders >= 2).length, meanSalary: Math.round(mean(aiSigns.map((x) => x.salary)) || 0), meanYears: r1(mean(aiSigns.map((x) => x.years))), withBonus: aiSigns.filter((x) => x.bonus > 0).length, unsignedAtClose: fa.unsignedAtClose, extensions: fa.extensions, renewalsSigned: fa.renewalsSigned, renewalsDeclined: fa.renewalsDeclined, marketProblems: (fa.marketProblems || []).length } : null,
        football: S.football || null, awards: S.awards ? Object.fromEntries(Object.entries(S.awards).map(([k, v]) => [k, v?.pos || null])) : null,
        saveBytes: (v4.saveBytes || []).find((x) => x[0] === y)?.[1] ?? null });
    }
    const dep = run.decisions?.departures || []; const depBy = {}; for (const d of dep) depBy[d.reason] = (depBy[d.reason] || 0) + 1;
    const retired = dep.filter((d) => /retir/i.test(d.reason)); const arrivals = run.decisions?.arrivals || []; const arrBy = {}; for (const a of arrivals) arrBy[a.origin] = (arrBy[a.origin] || 0) + 1;
    const own = seasons.map((s) => s.owner).filter(Boolean); const ownW = own.reduce((n, o) => n + o.w, 0), ownL = own.reduce((n, o) => n + o.l, 0);
    const snap = (n) => seasons[n - 1] || null;
    out.runs.push({ file, seed: run.seed, difficulty: run.difficulty || J.difficulty, seasonsPlayed: run.seasons, ownerClub: run.ownerClub, problems: run.problems || [], problemCount: run.problemCount, error: run.error || null, seconds: run.seconds,
      owner: { winPct: r1(100 * ownW / Math.max(1, ownW + ownL)), playoffSeasons: own.filter((o) => o.playoffs).length, titles: own.filter((o) => o.champion).length, forfeits0to21: own.reduce((n, o) => n + o.forfeits0to21, 0), games: own.reduce((n, o) => n + o.games, 0), byBlock: Object.fromEntries([[1, 5], [6, 10], [11, 15], [16, 20]].map(([a, b]) => { const xs = seasons.filter((s) => s.year - seasons[0].year + 1 >= a && s.year - seasons[0].year + 1 <= b && s.owner); const w = xs.reduce((n, s) => n + s.owner.w, 0), l = xs.reduce((n, s) => n + s.owner.l, 0); return [`${a}-${b}`, xs.length ? r1(100 * w / Math.max(1, w + l)) : null]; })) },
      titles: { distinctChampions: Object.keys(titles).length, mostByOneClub: Math.max(0, ...Object.values(titles)), byClub: titles, gymTitles: seasons.filter((s) => s.championGym).length, ownerTitles: seasons.filter((s) => s.championOwner).length },
      departures: depBy, retirements: { n: retired.length, meanAge: r1(mean(retired.map((d) => d.age))), meanOvr: r1(mean(retired.map((d) => d.ovr))), starters: retired.filter((d) => d.wasStarter).length, byPos: Object.fromEntries(POS.map((p) => [p, r1(mean(retired.filter((d) => d.pos === p).map((d) => d.age)))])) }, arrivalsByOrigin: arrBy,
      snapshots: Object.fromEntries([1, 5, 10, 15, 20].map((n) => [n, snap(n)])), seasons });
  }
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
for (const r of out.runs) {
  console.log(`\n== ${r.difficulty} seed ${r.seed}: ${r.seasonsPlayed} seasons, problems ${r.problemCount}${r.error ? ' ERROR ' + r.error.slice(0, 200) : ''}, ${r.seconds}s`);
  console.log(' owner', JSON.stringify(r.owner)); console.log(' titles', JSON.stringify({ ...r.titles, byClub: undefined })); console.log(' retirements', JSON.stringify(r.retirements)); console.log(' departures', JSON.stringify(r.departures)); console.log(' arrivals', JSON.stringify(r.arrivalsByOrigin));
  for (const n of [1, 5, 10, 15, 20]) { const s = r.snapshots[n]; if (!s) continue; console.log(` S${n} y${s.year} owner ${s.owner?.w}-${s.owner?.l} ovr ${s.owner?.teamOvr} | AI ovr ${s.ai.teamOvrMean}±${s.ai.teamOvrSd} [${s.ai.teamOvrMin}-${s.ai.teamOvrMax}] gym ${s.ai.gymOvr} ord ${s.ai.ordinaryOvr} rival ${s.ai.rivalOvr} | cap room ${s.ai.capRoomMean} min ${s.ai.capRoomMin} neg ${s.ai.negativeCap} | roster ${s.ai.rosterMin}-${s.ai.rosterMax} | mons ${s.monsters.n} ovr ${s.monsters.ovrMean} 80+ ${s.monsters.ovr80} 90+ ${s.monsters.ovr90} ageless ${s.monsters.ageless} L50 ${s.monsters.level50} | ppg ${s.games.pointsPerTeamGame} | save ${s.saveBytes}`); }
}
