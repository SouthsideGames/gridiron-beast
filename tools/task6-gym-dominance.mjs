#!/usr/bin/env node
// Task 6 Phase D (owner 2026-11-02): why gyms win about 99.5% of AI titles although their team-overall lead has shrunk (planning tool;
// changes nothing). Reads harness v4 files and separates the stages a title passes through:
//   strength       the team-overall lead, and how often the strongest AI club is a gym
//   games          regular-season results against the overall difference: a logistic fitted on games between clubs of the SAME kind
//                  (ordinary–ordinary and gym–gym) predicts gym–ordinary games; what is left is the gym-specific edge at equal overall
//                  (coaching IQ +0.2, the legendary's plays, the coach's scheme: everything a team overall does not show)
//   qualification  playoff berths by kind, and against regular-season wins
//   postseason     finalists and champions among playoff clubs, by kind, and at equal overall rank in the playoff field
//   matchups       how often each kind meets each kind in the regular season
//   node tools/task6-gym-dominance.mjs --files=a.json,b.json [--json=out.json]
import fs from 'node:fs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const runs = String(args.files || '').split(',').filter(Boolean).flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')).runs).filter((r) => !r.error && r.v4);
const r2 = (x) => (x == null || Number.isNaN(x) ? null : Math.round(x * 100) / 100); const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const pct = (a, b) => (b ? 100 * a / b : null);
const out = { seeds: runs.map((r) => r.seed), seasons: 0 };
const games = []; const seasons = []; // per club-season rows with kind
for (const run of runs) {
  const gym = (c) => !!run.v4.clubs[c]?.gym; const owner = run.rows.find((x) => x.owner)?.club;
  const byYear = {}; for (const x of run.rows) (byYear[x.year] ||= []).push(x);
  for (const s of run.v4.seasons) {
    const rows = (byYear[s.year] || []).filter((x) => !x.owner); const ovr = Object.fromEntries((byYear[s.year] || []).map((x) => [x.club, x.teamOvr]));
    seasons.push({ seed: run.seed, year: s.year, rows: rows.map((x) => ({ ...x, gym: gym(x.club) })) }); out.seasons++;
    for (const [wk, h, a, hs, as] of s.games || []) { if (h === owner || a === owner || hs == null || hs === as) continue; games.push({ year: s.year, h, a, gh: gym(h), ga: gym(a), d: (ovr[h] ?? 0) - (ovr[a] ?? 0), hw: hs > as ? 1 : 0 }); }
  }
}
// ---- strength
const lead = []; let topGym = 0, topN = 0; const topTitle = { gym: [0, 0], ord: [0, 0] };
for (const s of seasons) { const g = s.rows.filter((x) => x.gym), o = s.rows.filter((x) => !x.gym); if (!g.length || !o.length) continue;
  lead.push(mean(g.map((x) => x.teamOvr)) - mean(o.map((x) => x.teamOvr)));
  const top = s.rows.slice().sort((a, b) => b.teamOvr - a.teamOvr)[0]; topN++; if (top.gym) topGym++; const k = top.gym ? 'gym' : 'ord'; topTitle[k][1]++; if (top.champion) topTitle[k][0]++;
  const bestOrd = o.slice().sort((a, b) => b.teamOvr - a.teamOvr)[0]; (out._ordBestRank ||= []).push(s.rows.filter((x) => x.teamOvr > bestOrd.teamOvr).length + 1); }
out.strength = { gymLeadMean: r2(mean(lead)), strongestClubIsGymPct: r2(pct(topGym, topN)), strongestGymClubWinsTitlePct: r2(pct(...topTitle.gym)), strongestOrdinaryClubWinsTitlePct: r2(pct(...topTitle.ord)), bestOrdinaryRankMean: r2(mean(out._ordBestRank || [])) };
delete out._ordBestRank;
// ---- games: logistic P(home win) = 1 / (1 + exp(-(a + b d))) fitted on same-kind games by Newton's method
function fit(rows) { let a = 0, b = 0; for (let it = 0; it < 50; it++) { let ga = 0, gb = 0, haa = 0, hab = 0, hbb = 0; for (const x of rows) { const p = 1 / (1 + Math.exp(-(a + b * x.d))); const w = p * (1 - p); ga += x.hw - p; gb += (x.hw - p) * x.d; haa += w; hab += w * x.d; hbb += w * x.d * x.d; } const det = haa * hbb - hab * hab; if (!det) break; const da = (hbb * ga - hab * gb) / det, db = (haa * gb - hab * ga) / det; a += da; b += db; if (Math.abs(da) + Math.abs(db) < 1e-9) break; } return { a, b }; }
const same = games.filter((x) => x.gh === x.ga); const mixed = games.filter((x) => x.gh !== x.ga); const M = fit(same);
const P = (d) => 1 / (1 + Math.exp(-(M.a + M.b * d)));
let gymWins = 0, gymExp = 0; const bins = {};
for (const x of mixed) { const gymHome = x.gh; const dg = gymHome ? x.d : -x.d; const won = gymHome ? x.hw : 1 - x.hw; const exp = gymHome ? P(x.d) : 1 - P(x.d); gymWins += won; gymExp += exp;
  const bin = dg <= -4 ? '≤ −4' : dg <= -1 ? '−3…−1' : dg < 1 ? '0' : dg < 4 ? '+1…+3' : '≥ +4'; (bins[bin] ||= { n: 0, won: 0, exp: 0 }); bins[bin].n++; bins[bin].won += won; bins[bin].exp += exp; }
const fit2 = fit(mixed.map((x) => ({ d: x.gh ? x.d : -x.d, hw: x.gh ? x.hw : 1 - x.hw }))); // gym's view: the intercept is the gym edge at equal overall (home field mixed out)
out.games = { sameKindGames: same.length, mixedGames: mixed.length, logistic: { intercept: r2(M.a), perOverallPoint: r2(M.b) },
  gymVsOrdinaryWinPct: r2(pct(gymWins, mixed.length)), expectedFromOverallPct: r2(pct(gymExp, mixed.length)), gymEdgePctPoints: r2(pct(gymWins - gymExp, mixed.length)),
  gymEdgeInOverallPoints: r2((fit2.a - 0) / (M.b || 1)), byOverallGap: Object.fromEntries(Object.entries(bins).map(([k, v]) => [k, { games: v.n, gymWinPct: r2(pct(v.won, v.n)), expectedPct: r2(pct(v.exp, v.n)) }])) };
// ---- qualification and postseason
const all = seasons.flatMap((s) => s.rows.map((x) => ({ ...x, rankInField: null })));
const kinds = { gym: all.filter((x) => x.gym), ord: all.filter((x) => !x.gym) };
const q = (rows) => ({ clubSeasons: rows.length, playoffPct: r2(pct(rows.filter((x) => x.playoffs).length, rows.length)), meanWins: r2(mean(rows.map((x) => x.w))), meanOvr: r2(mean(rows.map((x) => x.teamOvr))) });
const byWins = {}; for (const x of all) { const w = x.w >= 7 ? '7+' : x.w >= 5 ? '5–6' : '≤ 4'; (byWins[w] ||= { gym: [0, 0], ord: [0, 0] }); const k = x.gym ? 'gym' : 'ord'; byWins[w][k][1]++; if (x.playoffs) byWins[w][k][0]++; }
out.qualification = { gym: q(kinds.gym), ordinary: q(kinds.ord), berthSharePct: { gym: r2(pct(kinds.gym.filter((x) => x.playoffs).length, all.filter((x) => x.playoffs).length)) },
  playoffPctByWins: Object.fromEntries(Object.entries(byWins).map(([k, v]) => [k, { gym: r2(pct(...v.gym)), ordinary: r2(pct(...v.ord)), n: v.gym[1] + v.ord[1] }])) };
const field = seasons.map((s) => s.rows.filter((x) => x.playoffs).sort((a, b) => b.teamOvr - a.teamOvr).map((x, i) => ({ ...x, rank: i + 1 })));
const pf = field.flat(); const fin = (rows) => ({ playoffClubs: rows.length, finalistPct: r2(pct(rows.filter((x) => x.finalist).length, rows.length)), championPct: r2(pct(rows.filter((x) => x.champion).length, rows.length)), titleIfFinalistPct: r2(pct(rows.filter((x) => x.champion).length, rows.filter((x) => x.finalist).length)) });
const byRank = {}; for (const x of pf) { const k = x.rank <= 2 ? '1–2' : x.rank <= 4 ? '3–4' : '5+'; (byRank[k] ||= { gym: [], ord: [] })[x.gym ? 'gym' : 'ord'].push(x); }
out.postseason = { gym: fin(pf.filter((x) => x.gym)), ordinary: fin(pf.filter((x) => !x.gym)), playoffFieldSize: r2(mean(field.map((f2) => f2.length))),
  byOverallRankInField: Object.fromEntries(Object.entries(byRank).map(([k, v]) => [k, { gym: fin(v.gym), ordinary: fin(v.ord) }])),
  titleSharePct: { gym: r2(pct(pf.filter((x) => x.gym && x.champion).length, pf.filter((x) => x.champion).length)) } };
// ---- what strength alone predicts for the postseason: each playoff club's title chance from the same-kind logistic, playing every other
// playoff club once per round as a neutral-site game, normalised (a strength-only yardstick, not the bracket)
let expGymTitles = 0, nT = 0; for (const f2 of field) { if (f2.length < 2) continue; const rounds = Math.ceil(Math.log2(f2.length));
  const p = f2.map((x) => { const avgWin = mean(f2.filter((y) => y !== x).map((y) => 1 / (1 + Math.exp(-(M.b * (x.teamOvr - y.teamOvr)))))); return avgWin ** rounds; });
  const tot = p.reduce((s, x) => s + x, 0); f2.forEach((x, i) => { if (x.gym) expGymTitles += p[i] / tot; }); nT++; }
out.postseason.strengthOnlyGymTitleSharePct = r2(pct(expGymTitles, nT));
// how far ordinary playoff clubs' overall would have to rise for the strength-only yardstick to give them 5% of titles (the field kept as it was)
out.postseason.ordinaryShareIfOrdinaryRaised = {}; for (const k of [0, 2, 4, 6, 8]) { let g = 0, n = 0; for (const f2 of field) { if (f2.length < 2) continue; const rounds = Math.ceil(Math.log2(f2.length)); const o = f2.map((x) => x.teamOvr + (x.gym ? 0 : k));
  const p = o.map((v, i) => mean(o.filter((_, j) => j !== i).map((w) => 1 / (1 + Math.exp(-(M.b * (v - w)))))) ** rounds); const tot = p.reduce((s2, x) => s2 + x, 0); f2.forEach((x, i) => { if (!x.gym) g += p[i] / tot; }); n++; }
  out.postseason.ordinaryShareIfOrdinaryRaised[`+${k}`] = r2(pct(g, n)); }
// ---- matchups
const mk = { 'gym–gym': 0, 'gym–ordinary': 0, 'ordinary–ordinary': 0 }; for (const x of games) mk[x.gh && x.ga ? 'gym–gym' : x.gh || x.ga ? 'gym–ordinary' : 'ordinary–ordinary']++;
out.matchups = Object.fromEntries(Object.entries(mk).map(([k, v]) => [k, r2(pct(v, games.length))]));
console.log(JSON.stringify(out, null, 1)); if (args.json) fs.writeFileSync(args.json, JSON.stringify(out, null, 1));
