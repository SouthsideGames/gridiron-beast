#!/usr/bin/env node
// Trading second pass: before/after comparison (Task 5, docs/TRADING_SECOND_PASS_PLAN.md). Reads the JSON that
// tools/post-trading-benchmark.sh wrote for two trees and evaluates the pre-registered thresholds T1–T12 (T13 performance comes
// from the Stage P timings, T14 from tools/owner-trading-scenarios.mjs, T15 from a diff). Pure reading; writes JSON and Markdown.
//   node tools/trade-benchmark-compare.mjs --dir=RUN --base=base --new=t5 [--json=out.json] [--md=out.md]
// The same file is used for the Task 5.5 checkpoint (`--base=t5 --new=t55`): the thresholds are the ones fixed in the plan unless
// a later plan says otherwise.
import fs from 'node:fs';
import path from 'node:path';
import { analyse } from './ai-benchmark-analyze.mjs';
import { pickValue } from '../src/franchise/trades.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const DIR = args.dir; const BASE = args.base || 'base'; const NEW = args.new || 't5';
const r1 = (x) => (x == null || Number.isNaN(x) ? null : Math.round(x * 10) / 10); const r2 = (x) => (x == null || Number.isNaN(x) ? null : Math.round(x * 100) / 100);
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const median = (a) => { const b = a.filter((x) => x != null).slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
const sd = (a) => { const m = mean(a); return a.length > 1 ? Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)) : null; };
const pct = (n, d) => (d ? r1(100 * n / d) : null);

// Harness v1 (every run before 2026-10-29 12:30) valued the picks of an offseason deal one class year too late (it read the class year at the first check
// after the deal, after the season had rolled over). Deals made by the Task 5 tree carry the clubs' own values (`mv`), which were never affected; the old
// yardstick and the baseline's position-aware figure are repaired here from the pick strings, exactly (pickValue is a pure function of year and round).
const parsePick = (s) => { const m = /^(\d+)R(\d+):/.exec(s); return m ? { year: +m[1], round: +m[2] } : null; };
function repair(run) {
  if (run.harnessV >= 2 || !run.decisions) return run;
  for (const t of run.decisions.trades) {
    if (t.week !== 0 || !(t.picks || []).length) continue;
    const delta = t.picks.map(parsePick).filter(Boolean).reduce((s, p) => s + pickValue(p, { yearsAhead: Math.max(0, p.year - t.year) }) - pickValue(p, { yearsAhead: Math.max(0, p.year - (t.year + 1)) }), 0);
    if (t.valueToB != null) { t.valueToB = r1(t.valueToB + delta); t.ratio = t.valueToA && t.valueToB ? r2(t.valueToA / t.valueToB) : t.ratio; }
    if (t.mvToB != null && !t.dealFloor) { t.mvToB = r1(t.mvToB + delta); t.mvRatio = t.mvToA && t.mvToB ? r2(t.mvToA / t.mvToB) : t.mvRatio; } // deals with a dealFloor come from the Task 5 tree: their mv is the clubs' own record, never repaired
  }
  return run;
}
const load = (tree, stage) => fs.readdirSync(DIR).filter((f) => f.startsWith(`${tree}-${stage}`) && f.endsWith('.json') && !['jobs'].includes(f)).sort().flatMap((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')).runs.map(repair));
const scenarios = ['aging', 'expiring', 'thin', 'injuries', 'rebuild', 'picks'];

/** Trading metrics for one tree's runs of one stage. */
function tradeMetrics(runs) {
  const ok = runs.filter((r) => !r.error); const seasons = ok.reduce((s, r) => s + r.seasons, 0);
  const t = ok.flatMap((r) => r.decisions.trades.map((x) => ({ ...x, seed: r.seed })));
  const r1picks = (x) => (x.picks || []).filter((p) => /R1:/.test(p)).length; const kick = t.filter((x) => x.toAPos === 'K');
  const mvr = t.map((x) => x.mvRatio).filter((x) => x != null); const dm = t.filter((x) => x.dealMeans); const df = t.filter((x) => x.dealFloor);
  const byPos = {}; for (const x of t) byPos[x.toAPos] = (byPos[x.toAPos] || 0) + 1;
  const r1ByPos = {}; for (const x of t) if (r1picks(x)) r1ByPos[x.toAPos] = (r1ByPos[x.toAPos] || 0) + r1picks(x);
  return {
    total: t.length, perSeason: r2(t.length / Math.max(1, seasons)), inSeason: t.filter((x) => x.inSeason).length, byKind: t.reduce((o, x) => ((o[x.kind] = (o[x.kind] || 0) + 1), o), {}),
    byPos, r1ByPos, r1Total: t.reduce((s, x) => s + r1picks(x), 0), kickerDeals: kick.length, kickerSharePct: pct(kick.length, t.length), r1ForKickers: kick.reduce((s, x) => s + r1picks(x), 0),
    kickerShareOfR1Pct: pct(kick.reduce((s, x) => s + r1picks(x), 0), t.reduce((s, x) => s + r1picks(x), 0)),
    mvRatioN: mvr.length, mvRatioMedian: r2(median(mvr)), mvRatioMin: r2(Math.min(...mvr)), mvRatioMax: r2(Math.max(...mvr)), mvInBandPct: pct(mvr.filter((v) => v >= 0.85 && v <= 1.18).length, mvr.length),
    oldRatioMedian: r2(median(t.map((x) => x.ratio).filter((x) => x != null))),
    acquiredStarterPct: pct(t.filter((x) => x.toAStarter).length, t.length), acquiredAgeMedian: median(t.map((x) => x.toAAge)),
    dealFloorN: df.length, floorChangeMedian: median(df.map((x) => x.dealFloor[1] - x.dealFloor[0])), floorGainAtLeast2Pct: pct(df.filter((x) => x.dealFloor[1] - x.dealFloor[0] >= 2).length, df.length),
    shopperMeanNeverFallsPct: pct(dm.filter((x) => x.dealMeans[1] >= x.dealMeans[0] - 0.05).length, dm.length), sellerMeanUnchangedPct: pct(dm.filter((x) => Math.abs(x.dealMeans[3] - x.dealMeans[2]) <= 0.05).length, dm.length), sellerMeanNeverFallsPct: pct(dm.filter((x) => x.dealMeans[3] >= x.dealMeans[2] - 0.05).length, dm.length),
    picksGiven: t.reduce((s, x) => s + (x.picks || []).length, 0),
  };
}
/** Competition and integrity figures straight from the rows. */
function leagueMetrics(runs) {
  const ok = runs.filter((r) => !r.error); const a = analyse(runs); const ai = ok.flatMap((r) => r.rows.filter((x) => !x.owner));
  const ovrSd = []; for (const r of ok) for (const y of new Set(r.rows.map((x) => x.year))) ovrSd.push(sd(r.rows.filter((x) => !x.owner && x.year === y).map((x) => x.teamOvr)));
  return { seeds: ok.length, seasonsPerSeed: a.seasonsPerSeed, clubSeasons: ai.length, problems: a.integrity.problems, exceptions: a.integrity.exceptions, lineupFailures: a.integrity.lineupFailures, overCap: a.integrity.overCapAtSeasonEnd, rosterMin: a.integrity.rosterSize.min, rosterMax: a.integrity.rosterSize.max, secondsPerSeason: a.integrity.secondsPerSeason, peakHeapMB: a.integrity.peakHeapMB,
    distinctChampionsMedian: a.competition.distinctChampionsMedian, maxTitleShareMax: a.competition.maxTitleShareMax, persistentLoserPct: a.competition.persistentLoserPct, teamOvrSd: r2(mean(ovrSd.filter((x) => x != null))), winsSd: a.competition.winsSd,
    persistentWeakPct: a.roster.persistentWeakPct, persistentWeakWithCapRoomPct: a.roster.persistentWeakWithCapRoomPct, weakGroupPct: a.roster.weakGroupClubSeasonsPct, shortagePct: a.roster.shortagePct, persistentWeakByPos: a.roster.persistentWeakByPos, starterMeanByPos: a.roster.starterMeanByPos,
    teamOvrMinusTargetMedian: a.competition.teamOvrMinusTargetMedian, departedWithin1SeasonPct: a.trades.departedWithin1SeasonPct };
}

const out = { generated: new Date().toISOString(), dir: DIR, base: BASE, new: NEW, stages: {}, thresholds: [] };
for (const stage of ['B', 'C']) { const b = load(BASE, `${stage}-`), n = load(NEW, `${stage}-`); if (!b.length && !n.length) continue; out.stages[stage] = { [BASE]: { league: b.length ? leagueMetrics(b) : null, trades: b.length ? tradeMetrics(b) : null }, [NEW]: { league: n.length ? leagueMetrics(n) : null, trades: n.length ? tradeMetrics(n) : null } }; }
out.stages.D = {}; for (const s of scenarios) { const b = load(BASE, `D-${s}`), n = load(NEW, `D-${s}`); if (!b.length && !n.length) continue; out.stages.D[s] = { [BASE]: b.length ? { ...leagueMetrics(b), trades: tradeMetrics(b).total } : null, [NEW]: n.length ? { ...leagueMetrics(n), trades: tradeMetrics(n).total } : null }; }

// ---- thresholds
const B = out.stages.B || out.stages.C; const rows = out.thresholds; const add = (id, area, base, now, rule, pass) => rows.push({ id, area, base, new: now, rule, pass: pass == null ? null : !!pass });
if (B) {
  const b = B[BASE], n = B[NEW]; const nl = n.league, bl = b.league, nt = n.trades, bt = b.trades;
  const everyStage = Object.values(out.stages).flatMap((s) => (s.league !== undefined ? [s] : Object.values(s)));
  const bad = []; for (const [st, v] of Object.entries(out.stages)) for (const m of (st === 'D' ? Object.values(v).map((x) => x[NEW]) : [v[NEW]?.league])) if (m && (m.problems || m.exceptions)) bad.push(st);
  add('T1', 'Integrity', `${bl.problems} problems, ${bl.exceptions} exceptions`, `${nl.problems} problems, ${nl.exceptions} exceptions (stages with any: ${bad.join(',') || 'none'})`, 'zero violations and exceptions in every stage', bad.length === 0);
  add('T2', 'Lineups, cap, rosters', `lineup ${bl.lineupFailures}, over cap ${bl.overCap}, roster ${bl.rosterMin}–${bl.rosterMax}`, `lineup ${nl.lineupFailures}, over cap ${nl.overCap}, roster ${nl.rosterMin}–${nl.rosterMax}`, 'zero cap violations, rosters 26–38, season-end lineup problems not worse than baseline (season-start lineups are in T1)', nl.lineupFailures <= bl.lineupFailures && nl.overCap === 0 && nl.rosterMin >= 26 && nl.rosterMax <= 38);
  add('T3', 'Kickers', `${bt.kickerSharePct}% of deals; ${bt.r1ForKickers} first-round picks for kickers (${bt.kickerShareOfR1Pct}% of ${bt.r1Total})`, `${nt.kickerSharePct}% of deals; ${nt.r1ForKickers} first-round picks for kickers (${nt.kickerShareOfR1Pct}% of ${nt.r1Total})`, 'share ≤ 8%; ≤ 3 first-round picks for kickers per 20 seeds; ≤ 10% of first-round picks spent', nt.total > 0 && nt.kickerSharePct <= 8 && nt.r1ForKickers <= 3 * (nl.seeds / 20) && (nt.kickerShareOfR1Pct ?? 0) <= 10);
  add('T4', 'Fairness (market value)', `median ${bt.mvRatioMedian}, ${bt.mvInBandPct}% in band (n=${bt.mvRatioN})`, `median ${nt.mvRatioMedian}, ${nt.mvInBandPct}% in band (n=${nt.mvRatioN})`, '≥ 95% within 0.85–1.18; median 0.95–1.15', nt.mvInBandPct >= 95 && nt.mvRatioMedian >= 0.95 && nt.mvRatioMedian <= 1.15);
  add('T5', 'Shoppers improve', `acquired starter ${bt.acquiredStarterPct}%`, `acquired starter ${nt.acquiredStarterPct}%; floor change median ${nt.floorChangeMedian} (${nt.floorGainAtLeast2Pct}% ≥ +2); starter mean never falls ${nt.shopperMeanNeverFallsPct}%`, 'acquired starter ≥ 85%; floor change median ≥ +2; shopper starter mean never falls in ≥ 95%', nt.acquiredStarterPct >= 85 && nt.floorChangeMedian >= 2 && nt.shopperMeanNeverFallsPct >= 95);
  add('T6', 'Sellers do not lose', 'not recorded at deal time', `seller starter mean never falls in ${nt.sellerMeanNeverFallsPct}% (unchanged in ${nt.sellerMeanUnchangedPct}%)`, 'never falls in ≥ 95% (Addendum 2 wording)', nt.sellerMeanNeverFallsPct >= 95);
  add('T7', 'In-season (informational, no minimum)', `${bt.inSeason} deals`, `${nt.inSeason} deals`, '≥ baseline, or the funnel names an approved rule as the limiter', nt.inSeason >= bt.inSeason ? true : null);
  add('T8', 'Volume', `${bt.perSeason} per season`, `${nt.perSeason} per season`, 'not above 1.5× baseline (a fall is fine if T3–T6 hold)', nt.perSeason <= 1.5 * bt.perSeason);
  add('T9', 'Consequences', `age median ${bt.acquiredAgeMedian}; leave within a season ${bl.departedWithin1SeasonPct}%`, `age median ${nt.acquiredAgeMedian}; leave within a season ${nl.departedWithin1SeasonPct}%`, 'age median ≤ 27; leaving within a season ≤ 15%', nt.acquiredAgeMedian <= 27 && (nl.departedWithin1SeasonPct ?? 0) <= 15);
  add('T10', 'Unaddressed weakness', `${bl.persistentWeakWithCapRoomPct}% persistent weak group with cap room`, `${nl.persistentWeakWithCapRoomPct}%`, 'not higher than baseline + 2 points', nl.persistentWeakWithCapRoomPct <= bl.persistentWeakWithCapRoomPct + 2);
  add('T11', 'Competition', `distinct champions ${bl.distinctChampionsMedian}, max title share ${bl.maxTitleShareMax}, team-overall sd ${bl.teamOvrSd}, persistent losers ${bl.persistentLoserPct}%`, `distinct champions ${nl.distinctChampionsMedian}, max title share ${nl.maxTitleShareMax}, team-overall sd ${nl.teamOvrSd}, persistent losers ${nl.persistentLoserPct}%`, 'distinct champions ≥ base − 0.5; max title share not above baseline (Addendum 2); sd within ±15%; persistent losers ≤ base + 2', nl.distinctChampionsMedian >= bl.distinctChampionsMedian - 0.5 && nl.maxTitleShareMax <= bl.maxTitleShareMax && Math.abs(nl.teamOvrSd / bl.teamOvrSd - 1) <= 0.15 && nl.persistentLoserPct <= bl.persistentLoserPct + 2);
  add('T13', 'Performance (Stage B wall time; the dedicated Stage P timing decides)', `${bl.secondsPerSeason} s/season`, `${nl.secondsPerSeason} s/season`, 'within +10% (indicative only: lanes shared the machine)', nl.secondsPerSeason <= bl.secondsPerSeason * 1.1 ? true : null);
}
out.remaining = B ? { persistentWeakByPos: { [BASE]: B[BASE].league.persistentWeakByPos, [NEW]: B[NEW].league.persistentWeakByPos }, starterMeanByPos: { [BASE]: B[BASE].league.starterMeanByPos, [NEW]: B[NEW].league.starterMeanByPos }, tradesByPos: { [BASE]: B[BASE].trades.byPos, [NEW]: B[NEW].trades.byPos }, firstRoundPicksByPosition: { [BASE]: B[BASE].trades.r1ByPos, [NEW]: B[NEW].trades.r1ByPos } } : null;

if (args.json) fs.writeFileSync(args.json, JSON.stringify(out, null, 1));
const md = ['| # | Area | ' + BASE + ' | ' + NEW + ' | Rule | Result |', '|---|---|---|---|---|---|', ...rows.map((r) => `| ${r.id} | ${r.area} | ${r.base} | ${r.new} | ${r.rule} | ${r.pass == null ? 'info' : r.pass ? 'pass' : '**FAIL**'} |`)].join('\n');
if (args.md) fs.writeFileSync(args.md, md + '\n');
console.log(md);
