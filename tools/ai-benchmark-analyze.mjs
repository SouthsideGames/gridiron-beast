#!/usr/bin/env node
// AI Franchise Benchmark analysis (Task 4): reads the JSON written by tools/ai-franchise-benchmark.mjs and computes the
// pre-registered metrics of docs/AI_FRANCHISE_BENCHMARK_PLAN.md. Pure reading; writes a summary JSON and a club-season CSV.
//   node tools/ai-benchmark-analyze.mjs --B=b1.json,b2.json [--C=c1.json,c2.json] [--D=aging:d.json,...] [--E=no-nudge:e.json,...]
//        --out=summary.json [--csv=club-seasons.csv]
import fs from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || '1']; }));
const load = (list) => (list ? list.split(',').filter(Boolean).flatMap((p) => JSON.parse(fs.readFileSync(p, 'utf8')).runs) : []);
const loadTagged = (list) => Object.fromEntries((list || '').split(',').filter(Boolean).map((x) => { const [tag, p] = x.split(':'); return [tag, JSON.parse(fs.readFileSync(p, 'utf8')).runs]; }));
const r1 = (x) => (x == null || Number.isNaN(x) ? null : Math.round(x * 10) / 10); const r2 = (x) => (x == null || Number.isNaN(x) ? null : Math.round(x * 100) / 100);
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
const median = (a) => { const b = a.filter((x) => x != null).slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
const pct = (n, d) => (d ? r1(100 * n / d) : null);
const sd = (a) => { const m = mean(a); return a.length > 1 ? Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)) : null; };
const corr = (xs, ys) => { const n = xs.length; if (n < 3) return null; const mx = mean(xs), my = mean(ys); let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { a += (xs[i] - mx) * (ys[i] - my); b += (xs[i] - mx) ** 2; c += (ys[i] - my) ** 2; } return b && c ? a / Math.sqrt(b * c) : null; };
const count = (a, k) => a.reduce((o, x) => { const v = k == null ? x : typeof k === 'function' ? k(x) : x[k]; o[v] = (o[v] || 0) + 1; return o; }, {});
const POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S'];
const SLOTS = { QB: 1, RB: 1, WR: 3, TE: 1, OL: 3, DL: 3, LB: 2, CB: 2, S: 2, K: 1 };

/** Every pre-registered metric for one set of runs (a stage). */
export function analyse(runs, { label = '' } = {}) {
  const ok = runs.filter((r) => !r.error); const errors = runs.filter((r) => r.error).map((r) => ({ seed: r.seed, error: r.error.split('\n')[0] }));
  const ai = ok.flatMap((r) => r.rows.filter((x) => !x.owner)); const owner = ok.flatMap((r) => r.rows.filter((x) => x.owner));
  const key = (x) => `${x.seed}|${x.club}`; const bySC = {}; for (const x of ai) (bySC[key(x)] ||= []).push(x); for (const l of Object.values(bySC)) l.sort((a, b) => a.year - b.year);
  const out = { label, seeds: ok.map((r) => r.seed), seasonsPerSeed: median(ok.map((r) => r.seasons)), clubSeasons: ai.length, errors };

  // ---- integrity
  out.integrity = { problems: ok.reduce((s, r) => s + (r.problemCount || 0), 0), problemSamples: [...new Set(ok.flatMap((r) => r.problems || []))].slice(0, 10), exceptions: errors.length, seconds: ok.reduce((s, r) => s + r.seconds, 0), secondsPerSeason: r1(ok.reduce((s, r) => s + r.seconds, 0) / ok.reduce((s, r) => s + r.seasons, 0)), peakHeapMB: Math.max(...ok.map((r) => r.peakHeapMB || 0)), lineupFailures: ai.filter((x) => x.lineupProblems > 0).length, overCapAtSeasonEnd: ai.filter((x) => x.capRoom < 0).length, rosterSize: { min: Math.min(...ai.map((x) => x.rosterSize)), median: median(ai.map((x) => x.rosterSize)), max: Math.max(...ai.map((x) => x.rosterSize)) } };

  // ---- roster construction
  const shortage = ai.filter((x) => POS.some((p) => (x.count[p] || 0) < SLOTS[p]));
  const weakRows = ai.filter((x) => x.weakGroups.length);
  let persist = 0, persistRes = 0, persistEligible = 0; const persistByPos = {}; const persistStreaks = [];
  for (const l of Object.values(bySC)) { let streak = {}; for (let i = 0; i < l.length; i++) { const x = l[i]; if (i > 0) { persistEligible++; const both = x.weakGroups.filter((p) => l[i - 1].weakGroups.includes(p)); if (both.length) { persist++; for (const p of both) persistByPos[p] = (persistByPos[p] || 0) + 1; if (l[i - 1].capRoom >= 100000) persistRes++; } }
    const nxt = {}; for (const p of x.weakGroups) nxt[p] = (streak[p] || 0) + 1; for (const [p, n] of Object.entries(streak)) if (!nxt[p] && n >= 2) persistStreaks.push(n); streak = nxt; } for (const n of Object.values(streak)) if (n >= 2) persistStreaks.push(n); }
  out.roster = {
    rosterSizeMedian: median(ai.map((x) => x.rosterSize)), lineupFailures: out.integrity.lineupFailures,
    shortageClubSeasons: shortage.length, shortagePct: pct(shortage.length, ai.length), shortageByPos: count(ai.flatMap((x) => POS.filter((p) => (x.count[p] || 0) < SLOTS[p]))),
    weakGroupClubSeasonsPct: pct(weakRows.length, ai.length), weakByPos: count(ai.flatMap((x) => x.weakGroups)),
    persistentWeakPct: pct(persist, persistEligible), persistentWeakWithCapRoomPct: pct(persistRes, persistEligible), persistentWeakByPos: persistByPos, persistentStreakMedian: median(persistStreaks), persistentStreakMax: persistStreaks.length ? Math.max(...persistStreaks) : 0,
    surplusPct: pct(ai.filter((x) => x.surplusGroups.length).length, ai.length), surplusByPos: count(ai.flatMap((x) => x.surplusGroups)),
    starterMeanByPos: Object.fromEntries(POS.map((p) => [p, r1(mean(ai.flatMap((x) => x.starters[p] || [])))])), backupMeanByPos: Object.fromEntries(POS.map((p) => [p, r1(mean(ai.map((x) => x.backupMean[p]).filter((v) => v != null)))])),
    backupGapByPos: Object.fromEntries(POS.map((p) => [p, r1(mean(ai.filter((x) => x.backupMean[p] != null && x.starters[p]?.length).map((x) => mean(x.starters[p]) - x.backupMean[p])))])),
    noBackupPctByPos: Object.fromEntries(POS.map((p) => [p, pct(ai.filter((x) => (x.backupCount[p] || 0) === 0).length, ai.length)])),
    meanAge: r1(mean(ai.map((x) => x.meanAge))), starterAge: r1(mean(ai.map((x) => x.starterAge).filter((v) => v != null))),
  };
  out.cap = { utilizationMedianPct: null, capRoomMedian: median(ai.map((x) => x.capRoom)), capRoomP10: (() => { const a = ai.map((x) => x.capRoom).sort((x, y) => x - y); return a[Math.floor(a.length * 0.1)]; })(), payrollMedian: median(ai.map((x) => x.payroll)), overCap: out.integrity.overCapAtSeasonEnd, capRoomOver200kPct: pct(ai.filter((x) => x.capRoom >= 200000).length, ai.length) };

  // ---- draft
  const picks = ok.flatMap((r) => r.decisions.draft.map((d) => ({ ...d, seed: r.seed })));
  const mis = picks.filter((d) => d.needAtPos === 0 && (d.topNeed ?? 0) >= 0.25 && d.bestAtNeedOvr != null && d.bestAtNeedOvr >= d.ovr - 3);
  const prevWeak = (d) => { const l = bySC[`${d.seed}|${d.club}`] || []; return l.find((x) => x.year === d.year)?.weakGroups || []; };
  const prevSurplus = (d) => { const l = bySC[`${d.seed}|${d.club}`] || []; return l.find((x) => x.year === d.year)?.surplusGroups || []; };
  const outcome = ok.flatMap((r) => (r.draftOutcome || []).map((o) => ({ ...o, seed: r.seed, lastYear: r.seasons })));
  const contrib = {}; for (const o of outcome) { const h = o.lastYear - o.year; if (h < 1) continue; const k = `${o.round}|${Math.min(h, 6)}`; (contrib[k] ||= { n: 0, starter: 0, sameClub: 0, inLeague: 0 }); contrib[k].n++; if (o.sameClub && o.endStarter) contrib[k].starter++; if (o.sameClub) contrib[k].sameClub++; if (o.inLeague) contrib[k].inLeague++; }
  out.draft = {
    aiPicks: picks.length, byRound: count(picks, 'round'), byPos: count(picks, 'pos'),
    ovrGapToBestMedian: median(picks.map((d) => d.bestAvailOvr - d.ovr)), ovrGapToBestMean: r1(mean(picks.map((d) => d.bestAvailOvr - d.ovr))), potGapToBestMedian: median(picks.map((d) => d.bestAvailPot - d.pot)),
    pickedNeedZeroPct: pct(picks.filter((d) => d.needAtPos === 0).length, picks.length), misalignedPct: pct(mis.length, picks.length), misalignedN: mis.length,
    wouldStartPct: pct(picks.filter((d) => d.wouldStart).length, picks.length), wouldStartByRound: Object.fromEntries([1, 2, 3].map((rd) => [rd, pct(picks.filter((d) => d.round === rd && d.wouldStart).length, picks.filter((d) => d.round === rd).length)])),
    atTopNeedPct: pct(picks.filter((d) => d.pos === d.topNeedPos).length, picks.length), atNeed025Pct: pct(picks.filter((d) => (d.needAtPos ?? 0) >= 0.25).length, picks.length), wouldNotStartAndNoNeedPct: pct(picks.filter((d) => !d.wouldStart && d.needAtPos === 0).length, picks.length),
    sameDraftDuplicatePct: pct(picks.filter((d) => d.sameDraftDup > 0).length, picks.length), kickerPct: pct(picks.filter((d) => d.pos === 'K').length, picks.length),
    contributionByRoundHorizon: Object.fromEntries(Object.entries(contrib).sort().map(([k, v]) => [k, { n: v.n, starterForDrafter: pct(v.starter, v.n), stillWithDrafter: pct(v.sameClub, v.n), stillInLeague: pct(v.inLeague, v.n) }])),
    round1StarterAt2: (() => { const v = contrib['1|2']; return v ? pct(v.starter, v.n) : null; })(),
  };

  // ---- arrivals (free agency, nudge, cover, trades, draft)
  const arr = ok.flatMap((r) => r.decisions.arrivals.map((a) => ({ ...a, seed: r.seed })));
  const nonDraft = arr.filter((a) => a.origin !== 'drafted');
  const surplusAt = (a) => { const l = bySC[`${a.seed}|${a.club}`] || []; const prevRow = l.find((x) => x.year === (a.phase === 'offseason' ? a.year - 1 : a.year)); return prevRow?.surplusGroups?.includes(a.pos) || false; };
  const weakAt = (a) => { const l = bySC[`${a.seed}|${a.club}`] || []; const prevRow = l.find((x) => x.year === (a.phase === 'offseason' ? a.year - 1 : a.year)); return prevRow?.weakGroups?.includes(a.pos) || false; };
  out.arrivals = {
    total: arr.length, perClubSeason: r2(arr.length / Math.max(1, ai.length)), byOrigin: count(arr, 'origin'), byPhase: count(arr, 'phase'), nonDraftByOrigin: count(nonDraft, 'origin'),
    nonDraftStartingPct: pct(nonDraft.filter((a) => a.starterNow).length, nonDraft.length), generatedStartingPct: pct(nonDraft.filter((a) => a.origin === 'signed:generated' && a.starterNow).length, nonDraft.filter((a) => a.origin === 'signed:generated').length),
    atSurplusPct: pct(nonDraft.filter(surplusAt).length, nonDraft.length), atWeakGroupPct: pct(nonDraft.filter(weakAt).length, nonDraft.length), meanAgeNonDraft: r1(mean(nonDraft.map((a) => a.age))), meanOvrByOrigin: Object.fromEntries(Object.entries(count(arr, 'origin')).map(([o]) => [o, r1(mean(arr.filter((a) => a.origin === o).map((a) => a.ovr)))])),
  };

  // ---- departures and contracts
  const dep = ok.flatMap((r) => r.decisions.departures.map((d) => ({ ...d, seed: r.seed })));
  const contractDeps = dep.filter((d) => d.phase === 'season-end');
  out.departures = { total: dep.length, byReason: count(dep, 'reason'), byPhase: count(dep, 'phase'), contractTimeStarterPct: pct(contractDeps.filter((d) => d.wasStarter).length, contractDeps.length), contractTimeStarters: contractDeps.filter((d) => d.wasStarter).length,
    walkedAgeMedian: median(dep.filter((d) => d.reason === 'walked').map((d) => d.age)), walkedOvrMedian: median(dep.filter((d) => d.reason === 'walked').map((d) => d.ovr)), walkedStarterOvrMedian: median(dep.filter((d) => d.reason === 'walked' && d.wasStarter).map((d) => d.ovr)), releasedAgeMedian: median(dep.filter((d) => d.reason === 'released').map((d) => d.age)), youngWalkedPct: pct(dep.filter((d) => d.reason === 'walked' && d.age <= 25 && (d.potential || 0) >= d.ovr + 8).length, dep.filter((d) => d.reason === 'walked').length) };
  // replacement: a group that lost a starter at a season end, its starter mean next season against before
  const repl = []; for (const l of Object.values(bySC)) for (let i = 0; i + 1 < l.length; i++) { const x = l[i], y = l[i + 1]; for (const p of POS) { const lost = dep.filter((d) => d.seed === x.seed && d.club === x.club && d.pos === p && d.wasStarter && ((d.phase === 'season-end' && d.year === x.year) || (d.phase === 'offseason' && d.year === y.year))).length; if (!lost) continue; const before = mean(x.starters[p] || []), after = mean(y.starters[p] || []); if (before != null && after != null) repl.push(after - before); } }
  out.departures.replacementDeltaMedian = median(repl); out.departures.replacementDeltaMean = r1(mean(repl)); out.departures.replacementN = repl.length; out.departures.replacementWorse3Pct = pct(repl.filter((v) => v <= -3).length, repl.length);
  out.aging = { meanAge: out.roster.meanAge, starterAgeMedian: median(ai.map((x) => x.starterAge).filter((v) => v != null)), age30plusMedian: median(ai.map((x) => x.age30plus)), age24minusMedian: median(ai.map((x) => x.age24minus)), byYear: {} };
  const years = [...new Set(ai.map((x) => x.year))].sort((a, b) => a - b);
  for (const y of years) { const ys = ai.filter((x) => x.year === y); out.aging.byYear[y] = { meanAge: r1(mean(ys.map((x) => x.meanAge))), starterAge: r1(mean(ys.map((x) => x.starterAge).filter((v) => v != null))), age30plus: r1(mean(ys.map((x) => x.age30plus))) }; }

  // ---- trades
  const trades = ok.flatMap((r) => r.decisions.trades.map((t) => ({ ...t, seed: r.seed })));
  const tradeTenure = trades.map((t) => { const left = dep.find((d) => d.seed === t.seed && d.id === t.toA && d.club === t.A); return left ? left.year - t.year : null; });
  out.trades = { total: trades.length, perSeason: r2(trades.length / ok.reduce((s, r) => s + r.seasons, 0)), byKind: count(trades, 'kind'), byWindow: count(trades, (t) => (t.week === 0 ? 'offseason' : 'in-season')), ratioMedian: median(trades.map((t) => t.ratio).filter((x) => x != null)), ratioMin: Math.min(...trades.map((t) => t.ratio).filter((x) => x != null)), ratioMax: Math.max(...trades.map((t) => t.ratio).filter((x) => x != null)), acquiredStarterPct: pct(trades.filter((t) => t.toAStarter).length, trades.length), acquiredAgeMedian: median(trades.map((t) => t.toAAge)), acquiredOvrMedian: median(trades.map((t) => t.toAOvr)), byPos: count(trades, 'toAPos'), departedWithin1SeasonPct: pct(tradeTenure.filter((x) => x != null && x <= 1).length, trades.length), picksGiven: trades.reduce((s, t) => s + t.picks.length, 0) };

  // ---- development and provenance
  const provShare = (rows, keys) => { const tot = rows.reduce((s, x) => s + Object.values(x.provenanceStarters).reduce((a, b) => a + b, 0), 0); const k = rows.reduce((s, x) => s + keys.reduce((a, kk) => a + (x.provenanceStarters[kk] || 0), 0), 0); return pct(k, tot); };
  out.development = { devMeanReturning: r1(mean(ai.map((x) => x.devMean).filter((v) => v != null))), evolutionsPerClubSeason: r2(mean(ai.map((x) => x.evolved))), meanLevel: r1(mean(ai.map((x) => x.meanLevel))), stage2PerClub: r1(mean(ai.map((x) => x.stage2))), byYear: {} };
  for (const y of years) { const ys = ai.filter((x) => x.year === y); out.development.byYear[y] = { dev: r1(mean(ys.map((x) => x.devMean).filter((v) => v != null))), evolved: r2(mean(ys.map((x) => x.evolved))), level: r1(mean(ys.map((x) => x.meanLevel))), stage2: r1(mean(ys.map((x) => x.stage2))), starters: { original: provShare(ys, ['original']), drafted: provShare(ys, ['drafted']), generated: provShare(ys, ['signed:generated']), pool: provShare(ys, ['signed:pool']), waivers: provShare(ys, ['signed:waivers']), traded: provShare(ys, ['traded']), own: provShare(ys, ['original', 'drafted']) } }; }

  // ---- competition and balance
  const comp = []; const recov = []; let persistentLosers = 0, clubsCounted = 0;
  for (const r of ok) { const champs = r.rows.filter((x) => x.champion).map((x) => x.club); const c = count(champs, (x) => x); comp.push({ seed: r.seed, seasons: r.seasons, distinct: new Set(champs).size, maxTitles: Math.max(0, ...Object.values(c)), ownerTitles: r.rows.filter((x) => x.owner && x.champion).length, repeat: champs.filter((x, i) => i > 0 && x === champs[i - 1]).length }); }
  for (const l of Object.values(bySC)) { clubsCounted++; let loser = false; for (let i = 0; i + 2 < l.length; i++) if (l[i].w <= 3 && l[i + 1].w <= 3 && l[i + 2].w <= 3) loser = true; if (loser) persistentLosers++; for (let i = 0; i < l.length; i++) if (l[i].w <= 2) { const j = l.findIndex((x, k) => k > i && x.w >= 5); recov.push(j < 0 ? null : j - i); } }
  const w = ai.map((x) => x.w); const ovr = ai.map((x) => x.teamOvr); const q = ai.map((x) => x.quality); const tgt = ai.filter((x) => x.target != null);
  out.competition = { winsSd: r2(sd(w)), winsMean: r2(mean(w)), playoffPct: pct(ai.filter((x) => x.playoffs).length, ai.length), titlesByAi: ai.filter((x) => x.champion).length, titlesByOwner: owner.filter((x) => x.champion).length, ownerWinPct: pct(owner.reduce((s, x) => s + x.w, 0), owner.reduce((s, x) => s + x.w + x.l, 0)), distinctChampionsMedian: median(comp.map((c) => c.distinct)), maxTitlesOneClubMax: Math.max(...comp.map((c) => c.maxTitles)), maxTitleShareMax: r2(Math.max(...comp.map((c) => c.maxTitles / c.seasons))), repeatChampions: comp.reduce((s, c) => s + c.repeat, 0), persistentLoserPct: pct(persistentLosers, clubsCounted), recoveryMedian: median(recov.filter((x) => x != null)), unrecoveredPct: pct(recov.filter((x) => x == null).length, recov.length), recoveryN: recov.length, perSeed: comp,
    rTeamOvrWins: r2(corr(ovr, w)), rQualityWins: r2(corr(q, w)), rQualityTeamOvr: r2(corr(q, ovr)), rTargetTeamOvr: r2(corr(tgt.map((x) => x.target), tgt.map((x) => x.teamOvr))), teamOvrMinusTargetMedian: median(tgt.map((x) => x.teamOvr - x.target)), teamOvrMinusTargetSd: r2(sd(tgt.map((x) => x.teamOvr - x.target))) };
  // residual: does a club's team overall beyond its fixed quality anchor predict wins? (decision signal vs anchor)
  { const resid = ai.map((x) => x.teamOvr - x.quality); out.competition.rResidualWins = r2(corr(resid, w)); }
  // year-over-year: is this season's record predicted by last season's (persistence) or by the anchor?
  { const pairs = []; for (const l of Object.values(bySC)) for (let i = 1; i < l.length; i++) pairs.push([l[i - 1].w, l[i].w, l[i].quality]); out.competition.rWinsYoY = r2(corr(pairs.map((p) => p[0]), pairs.map((p) => p[1]))); }
  const ovrSdByYear = {}; const lowStreak = []; for (const y of years) { const byS = {}; for (const x of ai.filter((x) => x.year === y)) (byS[x.seed] ||= []).push(x.teamOvr); ovrSdByYear[y] = r2(mean(Object.values(byS).map((a) => sd(a)))); }
  for (const l of Object.values(bySC)) { let s = 0, best = 0; for (const x of l) { const lm = mean(ai.filter((z) => z.seed === x.seed && z.year === x.year).map((z) => z.teamOvr)); if (x.teamOvr <= lm - 8) { s++; best = Math.max(best, s); } else s = 0; } lowStreak.push(best); }
  out.balance = { boostedClubSeasonsPct: pct(ai.filter((x) => x.boosted > 0).length, ai.length), nudgeSignings: ai.reduce((s, x) => s + x.boosted, 0), slowedClubSeasonsPct: pct(ai.filter((x) => x.slowed > 0).length, ai.length), runawayClubSeasons: ok.reduce((s, r) => s + r.decisions.nudge.reduce((a, n) => a + (n.contracts?.runaway?.length || 0), 0), 0), runawayPct: null, generatedArrivalPct: pct(arr.filter((a) => a.origin === 'signed:generated').length, nonDraft.length), teamOvrSdByYear: ovrSdByYear, teamOvrSdMean: r2(mean(Object.values(ovrSdByYear).filter((v) => v != null))), clubsLow8For3PlusPct: pct(lowStreak.filter((x) => x >= 3).length, lowStreak.length) };
  out.balance.runawayPct = pct(out.balance.runawayClubSeasons, ai.length);

  // ---- decision intelligence: does what the club does follow from what it can see?
  const contenders = ai.filter((x) => x.w >= 6), strugglers = ai.filter((x) => x.w <= 3);
  const actOf = (rows) => { const ks = new Set(rows.map((x) => `${x.seed}|${x.club}|${x.year}`)); const nd = nonDraft.filter((a) => ks.has(`${a.seed}|${a.club}|${a.phase === 'offseason' ? a.year - 1 : a.year}`)); const pk = picks.filter((d) => ks.has(`${d.seed}|${d.club}|${d.year}`)); return { clubSeasons: rows.length, arrivalsPerClubSeason: r2(nd.length / Math.max(1, rows.length)), arrivalMeanAge: r1(mean(nd.map((a) => a.age))), pickMeanAge: r1(mean(pk.map((d) => d.age))), pickMeanPot: r1(mean(pk.map((d) => d.pot))), pickOvrGap: r1(mean(pk.map((d) => d.bestAvailOvr - d.ovr))), boostedPct: pct(rows.filter((x) => x.boosted).length, rows.length), slowedPct: pct(rows.filter((x) => x.slowed).length, rows.length), meanAge: r1(mean(rows.map((x) => x.meanAge))) }; };
  out.decisions = { contenders6plus: actOf(contenders), strugglers3minus: actOf(strugglers),
    agingPlanning: { picksAtGroupsWithStarter29plusPct: null },
    weakGroupResponse: { arrivalsAtWeakGroupPct: out.arrivals.atWeakGroupPct, picksAtTopNeedPct: out.draft.atTopNeedPct } };
  return out;
}

/** Club-level comparison: the most and least successful AI clubs in a stage, with what they started with. */
export function clubTiers(runs) {
  const ai = runs.filter((r) => !r.error).flatMap((r) => r.rows.filter((x) => !x.owner)); const by = {};
  for (const x of ai) (by[`${x.seed}|${x.club}`] ||= []).push(x);
  const clubs = Object.entries(by).map(([k, l]) => { l.sort((a, b) => a.year - b.year); const first = l[0]; return { key: k, winPct: l.reduce((s, x) => s + x.w, 0) / l.reduce((s, x) => s + x.w + x.l, 0), titles: l.filter((x) => x.champion).length, playoffs: l.filter((x) => x.playoffs).length, quality0: first.quality, teamOvr0: first.teamOvr, meanOvr: mean(l.map((x) => x.teamOvr)), meanQuality: mean(l.map((x) => x.quality)), gap: mean(l.map((x) => x.teamOvr - (x.target ?? x.teamOvr))), boosted: l.reduce((s, x) => s + x.boosted, 0), slowed: l.filter((x) => x.slowed).length, persistentWeak: l.filter((x, i) => i > 0 && x.weakGroups.some((p) => l[i - 1].weakGroups.includes(p))).length, ownShare: mean(l.map((x) => { const t = Object.values(x.provenanceStarters).reduce((a, b) => a + b, 0); return t ? ((x.provenanceStarters.original || 0) + (x.provenanceStarters.drafted || 0)) / t : 0; })), age: mean(l.map((x) => x.meanAge)), dev: mean(l.map((x) => x.devMean).filter((v) => v != null)), rival: l.some((x) => x.isRival) }; });
  clubs.sort((a, b) => b.winPct - a.winPct); const n = Math.max(1, Math.floor(clubs.length / 4));
  const tier = (list) => ({ n: list.length, winPct: r1(100 * mean(list.map((c) => c.winPct))), titlesPerClub: r2(mean(list.map((c) => c.titles))), quality0: r1(mean(list.map((c) => c.quality0))), teamOvr0: r1(mean(list.map((c) => c.teamOvr0))), meanOvr: r1(mean(list.map((c) => c.meanOvr))), meanQuality: r1(mean(list.map((c) => c.meanQuality))), gapToTarget: r1(mean(list.map((c) => c.gap))), nudgeSignings: r2(mean(list.map((c) => c.boosted))), slowedSeasons: r2(mean(list.map((c) => c.slowed))), persistentWeakSeasons: r2(mean(list.map((c) => c.persistentWeak))), ownStarterShare: r1(100 * mean(list.map((c) => c.ownShare))), meanAge: r1(mean(list.map((c) => c.age))), dev: r2(mean(list.map((c) => c.dev))), rivalShare: r1(100 * mean(list.map((c) => (c.rival ? 1 : 0)))) });
  const all = clubs; const rQ = corr(all.map((c) => c.meanQuality), all.map((c) => c.winPct)); const rO = corr(all.map((c) => c.meanOvr), all.map((c) => c.winPct)); const rQ0 = corr(all.map((c) => c.quality0), all.map((c) => c.winPct));
  return { top: tier(clubs.slice(0, n)), bottom: tier(clubs.slice(-n)), middle: tier(clubs.slice(n, -n)), rMeanQualityWinPct: r2(rQ), rMeanOvrWinPct: r2(rO), rStartQualityWinPct: r2(rQ0), clubs: clubs.length };
}

/** A stress scenario's target clubs against the same clubs in the matched baseline seeds (same seeds, same seasons). */
export function scenarioCompare(scRuns, baseRuns) {
  const out = { clubs: 0, seasons: {}, base: {}, stressed: {} }; const rowsOf = (runs, pick) => runs.filter((r) => !r.error).flatMap((r) => r.rows.filter((x) => !x.owner && pick(r, x)));
  const targets = Object.fromEntries(scRuns.filter((r) => !r.error).map((r) => [r.seed, Object.keys(r.scenarioSetup || {})]));
  const maxY = Math.max(...scRuns.filter((r) => !r.error).map((r) => r.seasons));
  const S = rowsOf(scRuns, (r, x) => targets[r.seed]?.includes(x.club)); const B = rowsOf(baseRuns, (r, x) => targets[r.seed]?.includes(x.club) && x.year <= maxY);
  out.clubs = S.filter((x) => x.year === 1).length;
  const sum = (rows) => { const byY = {}; for (const x of rows) (byY[x.year] ||= []).push(x); return Object.fromEntries(Object.entries(byY).map(([y, l]) => [y, { w: r2(mean(l.map((x) => x.w))), teamOvr: r1(mean(l.map((x) => x.teamOvr))), lineupFail: l.filter((x) => x.lineupProblems).length, shortage: l.filter((x) => POS.some((p) => (x.count[p] || 0) < SLOTS[p])).length, weak: r2(mean(l.map((x) => x.weakGroups.length))), boosted: l.reduce((s, x) => s + x.boosted, 0), age: r1(mean(l.map((x) => x.meanAge))), starterAge: r1(mean(l.map((x) => x.starterAge).filter((v) => v != null))), roster: r1(mean(l.map((x) => x.rosterSize))), capRoom: Math.round(mean(l.map((x) => x.capRoom))), drafted: r1(mean(l.map((x) => x.draftedOnRoster))), backups: r1(mean(l.map((x) => ['QB', 'OL', 'CB', 'S'].reduce((s, p) => s + (x.backupCount[p] || 0), 0)))) }])); };
  out.stressed = sum(S); out.base = sum(B);
  const arrOf = (runs, yrs) => runs.filter((r) => !r.error).flatMap((r) => r.decisions.arrivals.filter((a) => targets[r.seed]?.includes(a.club) && a.year <= yrs));
  out.arrivals = { stressed: count(arrOf(scRuns, maxY), 'origin'), base: count(arrOf(baseRuns, maxY), 'origin') };
  const depOf = (runs, yrs) => runs.filter((r) => !r.error).flatMap((r) => r.decisions.departures.filter((a) => targets[r.seed]?.includes(a.club) && a.year <= yrs));
  out.departures = { stressed: count(depOf(scRuns, maxY), 'reason'), base: count(depOf(baseRuns, maxY), 'reason') };
  const pk = (runs) => runs.filter((r) => !r.error).flatMap((r) => r.decisions.draft.filter((d) => targets[r.seed]?.includes(d.club) && d.year <= maxY));
  out.draft = { stressed: { n: pk(scRuns).length, round1: pk(scRuns).filter((d) => d.round === 1).length, misaligned: pk(scRuns).filter((d) => d.needAtPos === 0 && (d.topNeed ?? 0) >= 0.25 && d.bestAtNeedOvr >= d.ovr - 3).length }, base: { n: pk(baseRuns).length, round1: pk(baseRuns).filter((d) => d.round === 1).length } };
  const tr = (runs) => runs.filter((r) => !r.error).flatMap((r) => r.decisions.trades.filter((t) => (targets[r.seed]?.includes(t.A) || targets[r.seed]?.includes(t.B)) && t.year <= maxY));
  out.trades = { stressed: tr(scRuns).length, base: tr(baseRuns).length, stressedPicksGiven: tr(scRuns).filter((t) => targets[0] || true).reduce((s, t) => s + t.picks.length, 0) };
  out.integrity = { problems: scRuns.reduce((s, r) => s + (r.problemCount || 0), 0), errors: scRuns.filter((r) => r.error).length };
  return out;
}

/** CSV of every AI club-season (the machine-readable season-by-season, club-by-club table). */
export function csv(runs, stage) {
  const cols = ['stage', 'seed', 'year', 'club', 'owner', 'isRival', 'w', 'l', 'playoffs', 'finalist', 'champion', 'teamOvr', 'midOvr', 'target', 'quality', 'grew', 'slowed', 'boosted', 'rosterSize', 'payroll', 'capRoom', 'lineupProblems', 'avgStarter', 'weakGroups', 'surplusGroups', 'meanAge', 'starterAge', 'age30plus', 'devMean', 'evolved', 'meanLevel', 'stage2', 'protected', 'injured', 'draftedOnRoster', 'draftedStarters', ...POS.map((p) => `starters_${p}`), ...POS.map((p) => `backups_${p}`), 'prov_original', 'prov_drafted', 'prov_generated', 'prov_pool', 'prov_waivers', 'prov_traded'];
  const lines = [cols.join(',')];
  for (const r of runs.filter((x) => !x.error)) for (const x of r.rows) {
    const p = x.provenanceStarters || {};
    const vals = { stage, ...x, owner: !!x.owner, weakGroups: (x.weakGroups || []).join(' '), surplusGroups: (x.surplusGroups || []).join(' '), ...Object.fromEntries(POS.map((q) => [`starters_${q}`, x.starters ? (x.starters[q] || []).join(' ') : ''])), ...Object.fromEntries(POS.map((q) => [`backups_${q}`, x.backupCount ? x.backupCount[q] : ''])), prov_original: p.original || 0, prov_drafted: p.drafted || 0, prov_generated: p['signed:generated'] || 0, prov_pool: p['signed:pool'] || 0, prov_waivers: p['signed:waivers'] || 0, prov_traded: p.traded || 0 };
    lines.push(cols.map((c) => { const v = vals[c]; return v == null ? '' : /[,"\s]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v; }).join(','));
  }
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const B = load(args.B), C = load(args.C), D = loadTagged(args.D), E = loadTagged(args.E);
  const out = { generated: new Date().toISOString(), B: B.length ? { ...analyse(B, { label: 'B' }), tiers: clubTiers(B) } : null, C: C.length ? { ...analyse(C, { label: 'C' }), tiers: clubTiers(C) } : null, D: {}, E: {} };
  for (const [tag, runs] of Object.entries(D)) out.D[tag] = scenarioCompare(runs, B);
  for (const [tag, runs] of Object.entries(E)) { const seeds = new Set(runs.map((r) => r.seed)); const base = B.filter((r) => seeds.has(r.seed)); out.E[tag] = { variant: analyse(runs, { label: tag }), matchedBaseline: analyse(base, { label: 'B-matched' }), variantTiers: clubTiers(runs), baselineTiers: clubTiers(base) }; }
  fs.writeFileSync(args.out, JSON.stringify(out, null, 1));
  if (args.csv) fs.writeFileSync(args.csv, [csv(B, 'B'), ...(C.length ? [csv(C, 'C').split('\n').slice(1).join('\n')] : [])].join('\n'));
  console.log(`wrote ${args.out}${args.csv ? ` and ${args.csv}` : ''}`);
}
