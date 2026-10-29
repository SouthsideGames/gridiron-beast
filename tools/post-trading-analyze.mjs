#!/usr/bin/env node
// Post-trading franchise benchmark analysis (Task 5.5, diagnostic only). Reads the JSON that tools/post-trading-benchmark.sh (and the
// harness, tools/ai-franchise-benchmark.mjs v3) wrote for two trees, and computes, for each sample and each tree:
//   - every Task 4 metric (tools/ai-benchmark-analyze.mjs `analyse`, unchanged), so Task 4, Task 5 and Task 5.5 read the same definitions;
//   - trading intelligence on measures that do NOT use the valuation that approved the deals: starter floors and group means at the
//     position before and after (harness snapshots), depth on both sides, cap room, picks by round, what became of every traded monster
//     season by season, whether a weak group the buyer had was resolved, activity by week around the Week 8 deadline;
//   - draft capital held by clubs over time, succession cover for ageing starters, draftee growth, incoming offers to the owner;
//   - integrity counts (problems, exceptions, protected monsters moved, deals or offers past the deadline, pick-ownership errors);
//   - matched-seed paired differences (new − base) per seed, with a bootstrap 95% interval over seeds (fixed generator, reproducible).
// Pure reading. Writes summary.json and CSVs into --out.
//   node tools/post-trading-analyze.mjs --dir=RUN --base=base --new=t55 --out=DIR
import fs from 'node:fs';
import path from 'node:path';
import { analyse, scenarioCompare } from './ai-benchmark-analyze.mjs';
import { GYM_CLUBS } from '../src/data/gyms.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || '1']; }));
const r1 = (x) => (x == null || Number.isNaN(x) ? null : Math.round(x * 10) / 10); const r2 = (x) => (x == null || Number.isNaN(x) ? null : Math.round(x * 100) / 100);
const mean = (a) => { const b = a.filter((x) => x != null && !Number.isNaN(x)); return b.length ? b.reduce((s, v) => s + v, 0) / b.length : null; };
const median = (a) => { const b = a.filter((x) => x != null).slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
const pct = (n, d) => (d ? r1(100 * n / d) : null);
const sd = (a) => { const m = mean(a); return a.length > 1 ? Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)) : null; };
const count = (a, k) => a.reduce((o, x) => { const v = typeof k === 'function' ? k(x) : x[k]; o[v] = (o[v] || 0) + 1; return o; }, {});
export const POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S'];
export const SLOTS = { QB: 1, RB: 1, WR: 3, TE: 1, OL: 3, DL: 3, LB: 2, CB: 2, S: 2, K: 1 };
const GYMS = new Set(GYM_CLUBS);
const FIRST_TRADE_WEEK = 2, TRADE_DEADLINE_WEEK = 8; // the calendar under test (src/franchise/trade-window.js); both trees already used weeks 2–8

// ---------------------------------------------------------------- loading
/** Which sample a run belongs to: Stage B by seed range (1–20 matched with Task 4, 21–40 the pre-registered main sample, 41–60 never run before Task 5.5), C, D:<scenario>, E. */
export function groupOf(stage, seed, scenario) {
  if (stage === 'B') return seed <= 20 ? 'B1' : seed <= 40 ? 'B21' : 'Bx';
  if (stage === 'D') return `D:${scenario}`;
  return stage;
}
export function loadDir(dir, trees) {
  const out = Object.fromEntries(trees.map((t) => [t, {}])); const meta = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const m = /^([A-Za-z0-9]+)-(B|C|D|E)-(.+)\.json$/.exec(f); if (!m || !out[m[1]]) continue;
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    meta.push({ file: f, tree: m[1], harnessV: j.harnessV, hash: j.hash, seeds: j.seeds, seasons: j.seasonsRequested, scenario: j.scenario, node: j.node, started: j.started });
    for (const r of j.runs) { const g = groupOf(m[2], r.seed, j.scenario); (out[m[1]][g] ||= []).push(r); }
  }
  for (const t of trees) for (const g of Object.keys(out[t])) out[t][g].sort((a, b) => a.seed - b.seed);
  return { runs: out, meta };
}

// ---------------------------------------------------------------- helpers over one tree's runs
const aiRows = (runs) => runs.filter((r) => !r.error).flatMap((r) => r.rows.filter((x) => !x.owner).map((x) => ({ ...x, seed: r.seed })));
const bySeedClub = (rows) => { const by = {}; for (const x of rows) (by[`${x.seed}|${x.club}`] ||= []).push(x); for (const l of Object.values(by)) l.sort((a, b) => a.year - b.year); return by; };
const effCap = (runs) => Math.max(...aiRows(runs).map((x) => x.payroll + x.capRoom)); // cap less the staff allowance: constant within a tier
const LINEUP_SLOTS = Object.values(SLOTS).reduce((a, b) => a + b, 0);
/** Task 4's weak group on a counterfactual line [floor, mean, players]: the group mean 6+ below the club's starter mean (lineup points / slots), or fewer players than slots. */
const cfWeak = (line, lineup, pos) => line[2] < SLOTS[pos] || (line[1] != null && line[1] <= lineup / LINEUP_SLOTS - 6);
const isWeak = (d, clubMean, pos) => d && (d.n < SLOTS[pos] || (d.mean != null && clubMean != null && d.mean <= clubMean - 6)); // Task 4's weak group, read on a snapshot

/** Every AI–AI deal with the measures Task 5.5 adds (all from rosters, never from the valuation). */
export function dealTable(runs) {
  const rows = aiRows(runs); const bySC = bySeedClub(rows); const cap = effCap(runs);
  const out = [];
  for (const r of runs.filter((x) => !x.error)) {
    const follow = {}; for (const f of r.decisions.tradeFollow || []) (follow[f[0]] ||= []).push(f);
    r.decisions.trades.forEach((t, ti) => {
      const pos = t.toAPos; const k = pos === 'K';
      const pre = t.aDepthBefore, post = t.aDepthAfter;
      const weakPre = !k && pre ? isWeak(pre, t.aMeanBefore, pos) : null; const weakPost = !k && post ? isWeak(post, t.aMeanAfter, pos) : null;
      const endRow = (bySC[`${r.seed}|${t.A}`] || []).find((x) => x.year === t.year); // the end of the season the deal was made for
      const fA = (follow[ti] || []).filter((f) => f[2] === 'A'); const at = (h) => fA.find((f) => f[1] - t.year === h);
      const r1Given = (t.picks || []).filter((p) => /R1:/.test(p)).length;
      out.push({ seed: r.seed, ti, year: t.year, week: t.week, window: t.week === 0 ? 'offseason' : 'in-season', kind: t.kind, A: t.A, B: t.B, pos, ovr: t.toAOvr, age: t.toAAge,
        starter: t.toAStarter, picks: t.picks || [], r1Given, r2Given: (t.picks || []).filter((p) => /R2:/.test(p)).length, r3Given: (t.picks || []).filter((p) => /R3:/.test(p)).length, gavePos: t.toBAllPos || [], mvRatio: t.mvRatio, ratio: t.ratio,
        floorGain: pre?.floor != null && post?.floor != null ? post.floor - pre.floor : null, groupGain: pre?.mean != null && post?.mean != null ? r1(post.mean - pre.mean) : null,
        dealFloorGain: t.dealFloor ? t.dealFloor[1] - t.dealFloor[0] : null, aMeanGain: t.aMeanBefore != null && t.aMeanAfter != null ? r1(t.aMeanAfter - t.aMeanBefore) : null,
        bMeanChange: t.bMeanBefore != null && t.bMeanAfter != null ? r1(t.bMeanAfter - t.bMeanBefore) : null, bFloorChange: t.bDepthBefore?.floor != null && t.bDepthAfter?.floor != null ? t.bDepthAfter.floor - t.bDepthBefore.floor : null,
        bShortAfter: t.bDepthAfter ? t.bDepthAfter.n < SLOTS[pos] : null, aBackupBefore: pre?.backup ?? null, aBackupAfter: post?.backup ?? null, aNoBackupAfter: post ? post.n <= SLOTS[pos] : null,
        salaryIn: t.toASalary, salaryOut: (t.toBSalaries || []).reduce((s, v) => s + (v || 0), 0), aCapAfter: t.aCapAfter, aCapBefore: t.aCapBefore, capStrain: t.aCapAfter != null && t.aCapBefore != null && t.aCapAfter < 0.015 * cap && t.aCapBefore >= 0.015 * cap,
        weakPre, resolvedAtDeal: weakPre ? !weakPost : null, weakAtSeasonEnd: endRow && !k ? endRow.weakGroups.includes(pos) : null, resolvedSeasonEnd: weakPre && endRow ? !endRow.weakGroups.includes(pos) : null,
        withA0: at(0) ? at(0)[5] === 1 : null, startA0: at(0) ? at(0)[6] === 1 : null, withA1: at(1) ? at(1)[5] === 1 : null, startA1: at(1) ? at(1)[6] === 1 : null, withA2: at(2) ? at(2)[5] === 1 : null, startA2: at(2) ? at(2)[6] === 1 : null,
        ovrA1: at(1) ? at(1)[7] : null, protectedMoved: !!(t.toAProtected || t.toBProtected), contractEnds: t.toAContractEnds,
        // the deal against its own undoing at the same moment (harness v3 cf*): the primary, valuation-free measure of what a deal did
        cfLineupGain: t.cfALineup ? t.cfALineup[0] - t.cfALineup[1] : null, cfPosFloorGain: t.cfAPos?.[0]?.[0] != null && t.cfAPos?.[1]?.[0] != null ? t.cfAPos[0][0] - t.cfAPos[1][0] : null, cfPosMeanGain: t.cfAPos?.[0]?.[1] != null && t.cfAPos?.[1]?.[1] != null ? r1(t.cfAPos[0][1] - t.cfAPos[1][1]) : null,
        cfSellerLineupChange: t.cfBLineup ? t.cfBLineup[0] - t.cfBLineup[1] : null, cfSellerPosFloorChange: t.cfBPos?.[0]?.[0] != null && t.cfBPos?.[1]?.[0] != null ? t.cfBPos[0][0] - t.cfBPos[1][0] : null,
        cfWeakWithout: !k && t.cfAPos ? cfWeak(t.cfAPos[1], t.cfALineup[1], pos) : null, cfWeakWith: !k && t.cfAPos ? cfWeak(t.cfAPos[0], t.cfALineup[0], pos) : null });
    });
  }
  return out;
}

/** Trading intelligence for one tree and sample. */
export function trading(runs) {
  const deals = dealTable(runs); const seasons = runs.filter((r) => !r.error).reduce((s, r) => s + r.seasons, 0); const clubSeasons = aiRows(runs).length;
  const ins = deals.filter((d) => d.window === 'in-season'), off = deals.filter((d) => d.window === 'offseason'), nonK = deals.filter((d) => d.pos !== 'K');
  const has = (ds, k) => ds.filter((d) => d[k] != null);
  const block = (ds) => ({ n: ds.length, cfLineupGainMedian: median(ds.map((d) => d.cfLineupGain)), cfLineupGainMean: r1(mean(ds.map((d) => d.cfLineupGain))), cfNoLineupGainPct: pct(has(ds, 'cfLineupGain').filter((d) => d.cfLineupGain <= 0).length, has(ds, 'cfLineupGain').length), cfLineupGain4Pct: pct(has(ds, 'cfLineupGain').filter((d) => d.cfLineupGain >= 4).length, has(ds, 'cfLineupGain').length), cfPosFloorGainMedian: median(ds.map((d) => d.cfPosFloorGain)), cfPosMeanGainMean: r1(mean(ds.map((d) => d.cfPosMeanGain))), cfSellerLineupLossPct: pct(has(ds, 'cfSellerLineupChange').filter((d) => d.cfSellerLineupChange < 0).length, has(ds, 'cfSellerLineupChange').length), cfSellerLineupChangeMean: r1(mean(ds.map((d) => d.cfSellerLineupChange))), cfSellerLoss4Pct: pct(has(ds, 'cfSellerLineupChange').filter((d) => d.cfSellerLineupChange <= -4).length, has(ds, 'cfSellerLineupChange').length), acquiredStarterPct: pct(ds.filter((d) => d.starter).length, ds.length), floorGainMedian: median(ds.map((d) => d.floorGain)), floorGain2Pct: pct(ds.filter((d) => d.floorGain != null && d.floorGain >= 2).length, ds.filter((d) => d.floorGain != null).length), floorGain4Pct: pct(ds.filter((d) => d.floorGain != null && d.floorGain >= 4).length, ds.filter((d) => d.floorGain != null).length), groupGainMean: r1(mean(ds.map((d) => d.groupGain))), aMeanGainMean: r2(mean(ds.map((d) => d.aMeanGain))), dealFloorGainMedian: median(ds.map((d) => d.dealFloorGain)), sellerMeanFellPct: pct(ds.filter((d) => d.bMeanChange != null && d.bMeanChange <= -1).length, ds.filter((d) => d.bMeanChange != null).length), sellerShortPct: pct(ds.filter((d) => d.bShortAfter).length, ds.length), buyerNoBackupAfterPct: pct(ds.filter((d) => d.aNoBackupAfter).length, ds.length), ageMedian: median(ds.map((d) => d.age)), age31plusPct: pct(ds.filter((d) => d.age >= 31).length, ds.length) });
  const weakDeals = nonK.filter((d) => d.weakPre != null);
  const byWeek = count(ins, 'week');
  const picksBy = { r1: deals.reduce((s, d) => s + d.r1Given, 0), r2: deals.reduce((s, d) => s + d.r2Given, 0), r3: deals.reduce((s, d) => s + d.r3Given, 0) };
  const r1ByPos = {}; for (const d of deals) if (d.r1Given) r1ByPos[d.pos] = (r1ByPos[d.pos] || 0) + d.r1Given;
  const follow = (key, ds) => pct(ds.filter((d) => d[key] === true).length, ds.filter((d) => d[key] != null).length);
  // churn: the same monster moved twice within a season; a seller buying back; the same club pair dealing twice in a year
  let reTraded = 0;
  for (const r of runs.filter((x) => !x.error)) { const ids = {}; for (const t of r.decisions.trades) { for (const id of [t.toA, ...(t.toBAll || [])]) (ids[id] ||= []).push(t.year); } for (const ys of Object.values(ids)) { ys.sort((a, b) => a - b); for (let i = 1; i < ys.length; i++) if (ys[i] - ys[i - 1] <= 1) { reTraded++; break; } } }
  return {
    deals: deals.length, perSeason: r2(deals.length / seasons), perClubSeason: r2(deals.length / clubSeasons), seasons, clubSeasons,
    window: { offseason: off.length, inSeason: ins.length, inSeasonPerSeason: r2(ins.length / seasons), offseasonPerSeason: r2(off.length / seasons) },
    byWeek, week8Share: pct(byWeek[TRADE_DEADLINE_WEEK] || 0, ins.length), afterDeadline: ins.filter((d) => d.week > TRADE_DEADLINE_WEEK || d.week < FIRST_TRADE_WEEK).length,
    byKind: count(deals, 'kind'), byPos: count(deals, 'pos'), givenPos: count(deals.flatMap((d) => d.gavePos), (x) => x), kickerPct: pct(deals.filter((d) => d.pos === 'K').length, deals.length),
    picks: picksBy, r1PerTenClubSeasons: r2(10 * picksBy.r1 / clubSeasons), r1ByPos, r1ForKicker: r1ByPos.K || 0,
    quality: { all: block(deals), offseason: block(off), inSeason: block(ins), nonKicker: block(nonK) },
    needCf: { dealsAtWeakGroupPct: pct(nonK.filter((d) => d.cfWeakWithout).length, nonK.filter((d) => d.cfWeakWithout != null).length), resolvedByDealPct: pct(nonK.filter((d) => d.cfWeakWithout && !d.cfWeakWith).length, nonK.filter((d) => d.cfWeakWithout).length), stillWeakAtSeasonEndPct: pct(nonK.filter((d) => d.cfWeakWithout && d.weakAtSeasonEnd).length, nonK.filter((d) => d.cfWeakWithout && d.weakAtSeasonEnd != null).length) },
    need: { dealsAtWeakGroupPct: pct(weakDeals.filter((d) => d.weakPre).length, weakDeals.length), resolvedAtDealPct: pct(weakDeals.filter((d) => d.weakPre && d.resolvedAtDeal).length, weakDeals.filter((d) => d.weakPre).length), resolvedSeasonEndPct: pct(weakDeals.filter((d) => d.weakPre && d.resolvedSeasonEnd).length, weakDeals.filter((d) => d.weakPre && d.resolvedSeasonEnd != null).length), weakAtSeasonEndPct: pct(nonK.filter((d) => d.weakAtSeasonEnd).length, nonK.filter((d) => d.weakAtSeasonEnd != null).length) },
    cap: { salaryDeltaMedian: median(deals.map((d) => (d.salaryIn ?? 0) - d.salaryOut)), capStrainPct: pct(deals.filter((d) => d.capStrain).length, deals.length), buyerRoomAfterMedian: median(deals.map((d) => d.aCapAfter)) },
    outcomes: { withAcquirerSeasonEndPct: follow('withA0', deals), startingSeasonEndPct: follow('startA0', deals), withAcquirerNextSeasonPct: follow('withA1', deals), startingNextSeasonPct: follow('startA1', deals), withAcquirer2Pct: follow('withA2', deals), starting2Pct: follow('startA2', deals), reTradedWithinASeason: reTraded },
    integrity: { protectedMoved: deals.filter((d) => d.protectedMoved).length, afterDeadline: ins.filter((d) => d.week > TRADE_DEADLINE_WEEK || d.week < FIRST_TRADE_WEEK).length },
  };
}

/** Does trading for a weak position fix it? Every AI club-season with a weak group at its end: was a monster at that position acquired by trade in the next window (the offseason or weeks 2–8), and was the group still weak a season later? Observational, both trees. */
export function weakResponse(runs) {
  const rows = aiRows(runs); const bySC = bySeedClub(rows); const tradesBy = {};
  for (const r of runs.filter((x) => !x.error)) for (const t of r.decisions.trades) (tradesBy[`${r.seed}|${t.A}|${t.year}`] ||= []).push(t);
  const cell = () => ({ n: 0, resolved: 0 }); const out = { traded: cell(), notTraded: cell(), byPos: {} };
  for (const l of Object.values(bySC)) for (let i = 0; i + 1 < l.length; i++) { const x = l[i], y = l[i + 1]; for (const p of x.weakGroups) { if (p === 'K') continue;
    const traded = (tradesBy[`${x.seed}|${x.club}|${y.year}`] || []).some((t) => t.toAPos === p); const c = traded ? out.traded : out.notTraded; c.n++; if (!y.weakGroups.includes(p)) c.resolved++;
    const b = (out.byPos[p] ||= { traded: cell(), notTraded: cell() }); const cc = traded ? b.traded : b.notTraded; cc.n++; if (!y.weakGroups.includes(p)) cc.resolved++; } }
  const rate = (c) => ({ n: c.n, resolvedPct: pct(c.resolved, c.n) });
  return { traded: rate(out.traded), notTraded: rate(out.notTraded), tradedShareOfWeak: pct(out.traded.n, out.traded.n + out.notTraded.n), byPos: Object.fromEntries(Object.entries(out.byPos).map(([p, v]) => [p, { traded: rate(v.traded), notTraded: rate(v.notTraded) }])) };
}

/** Draft capital, succession cover, draftee growth, OL detail, gym titles: the franchise measures Task 4 did not record. */
export function franchiseExtra(runs) {
  const rows = aiRows(runs); const bySC = bySeedClub(rows); const years = [...new Set(rows.map((x) => x.year))].sort((a, b) => a - b);
  // draft capital (unused picks for the next class, by round)
  const withPicks = rows.filter((x) => x.picksNext);
  const r1s = withPicks.map((x) => x.picksNext[0]);
  const capital = { r1HeldMean: r2(mean(r1s)), r1NoneNextPct: pct(r1s.filter((v) => v === 0).length, r1s.length), r1TwoPlusPct: pct(r1s.filter((v) => v >= 2).length, r1s.length), allHeldMean: r2(mean(withPicks.map((x) => x.picksNext.reduce((a, b) => a + b, 0)))), r1NoneNext2Pct: pct(withPicks.filter((x) => x.picksNext2 && x.picksNext[0] === 0 && x.picksNext2[0] === 0).length, withPicks.length) };
  { const strug = withPicks.filter((x) => x.w <= 3), cont = withPicks.filter((x) => x.w >= 6); capital.strugglersR1Mean = r2(mean(strug.map((x) => x.picksNext[0]))); capital.contendersR1Mean = r2(mean(cont.map((x) => x.picksNext[0]))); capital.strugglersR1NonePct = pct(strug.filter((x) => x.picksNext[0] === 0).length, strug.length); capital.contendersR1NonePct = pct(cont.filter((x) => x.picksNext[0] === 0).length, cont.length); }
  capital.byYear = Object.fromEntries(years.map((y) => { const ys = withPicks.filter((x) => x.year === y); return [y, { r1Mean: r2(mean(ys.map((x) => x.picksNext[0]))), r1NonePct: pct(ys.filter((x) => x.picksNext[0] === 0).length, ys.length), r1Max: ys.length ? Math.max(...ys.map((x) => x.picksNext[0])) : null }]; }));
  // succession: starter slots held by a (non-protected) starter aged 30+, and whether a backup aged 26 or less within 8 overall is there to take over
  let old = 0, covered = 0, old33 = 0, slots = 0; const ageByPosYear = {}; const succByYear = {};
  for (const x of rows) { if (!x.startersDetail) continue; let o = 0, c = 0; for (const p of POS) { const st = x.startersDetail[p] || []; const bk = (x.backupsDetail?.[p] || []).filter((b) => !b[3]); for (const s of st) { if (s[2]) continue; slots++; (ageByPosYear[`${p}|${x.year}`] ||= []).push(s[1]); if (s[1] >= 30) { old++; o++; if (bk.some((b) => b[1] <= 26 && b[0] >= s[0] - 8)) { covered++; c++; } } if (s[1] >= 33) old33++; } }
    const sy = (succByYear[x.year] ||= { old: 0, covered: 0 }); sy.old += o; sy.covered += c; }
  const succession = { starterSlots30plusPct: pct(old, slots), starterSlots33plusPct: pct(old33, slots), coveredPct: pct(covered, old), byYear: Object.fromEntries(Object.entries(succByYear).map(([y, v]) => [y, { old30PerClub: r2(v.old / Math.max(1, rows.filter((x) => x.year === +y).length)), coveredPct: pct(v.covered, v.old) }])) };
  const starterAgeByPos = Object.fromEntries(POS.map((p) => { const last = years[years.length - 1]; const first = years[0]; return [p, { first: r1(mean(ageByPosYear[`${p}|${first}`] || [])), last: r1(mean(ageByPosYear[`${p}|${last}`] || [])) }]; }));
  // draftee growth: overall gained by AI draftees still with their club 3+ seasons on, by round and whether they start
  const growth = {}; for (const r of runs.filter((x) => !x.error)) { const byId = Object.fromEntries(r.decisions.draft.map((d) => [d.id, d])); for (const o of r.draftOutcome || []) { const d = byId[o.id]; if (!d || r.seasons - o.year < 3 || !o.sameClub || o.endOvr == null) continue; const k = `${o.round}|${o.endStarter ? 'starter' : 'reserve'}`; (growth[k] ||= []).push(o.endOvr - d.ovr); } }
  const draftee = Object.fromEntries(Object.entries(growth).sort().map(([k, v]) => [k, { n: v.length, gain: r1(mean(v)) }]));
  // OL detail: OL group mean against the club's own starter mean (Task 4 weak rule) and against the league's OL in the same season
  const olLeague = {}; for (const x of rows) { const s = x.starters?.OL || []; if (s.length) (olLeague[`${x.seed}|${x.year}`] ||= []).push(mean(s)); }
  let olWeak = 0, olWeakButLeagueAvg = 0, olBottom = 0; const posGap = {};
  for (const x of rows) { const s = x.starters?.OL || []; if (!s.length) continue; const lm = mean(olLeague[`${x.seed}|${x.year}`]); const gm = mean(s); if (x.weakGroups.includes('OL')) { olWeak++; if (gm >= lm - 2) olWeakButLeagueAvg++; } if (gm <= lm - 6) olBottom++;
    for (const p of POS) { const st = x.starters?.[p] || []; if (st.length) (posGap[p] ||= []).push(mean(st) - x.avgStarter); } }
  const ol = { weakClubSeasons: olWeak, weakButAtLeagueOlMeanPct: pct(olWeakButLeagueAvg, olWeak), leagueRelativeWeakClubSeasons: olBottom, groupMinusClubMeanByPos: Object.fromEntries(Object.entries(posGap).map(([p, v]) => [p, r2(mean(v))])) };
  // gym clubs' share of titles (the anchor design), per sample
  const champs = rows.filter((x) => x.champion); const gym = { aiTitles: champs.length, gymTitles: champs.filter((x) => GYMS.has(x.club)).length, gymSharePct: pct(champs.filter((x) => GYMS.has(x.club)).length, champs.length), gymClubSeasonPct: pct(rows.filter((x) => GYMS.has(x.club)).length, rows.length) };
  // persistent weak groups by position (counts) and with cap room
  const pw = {}; let pwRoom = 0, elig = 0; for (const l of Object.values(bySC)) for (let i = 1; i < l.length; i++) { elig++; const both = l[i].weakGroups.filter((p) => l[i - 1].weakGroups.includes(p)); for (const p of both) pw[p] = (pw[p] || 0) + 1; if (both.length && l[i - 1].capRoom >= 100000) pwRoom++; }
  return { capital, succession, starterAgeByPos, draftee, ol, gym, persistentWeakByPos: pw, persistentWeakWithRoomPct: pct(pwRoom, elig) };
}

/** Incoming offers to the (hands-off) owner: how often, what kind, whether the monster offered would start, and the calendar. */
export function callsSummary(runs) {
  const calls = runs.filter((r) => !r.error).flatMap((r) => (r.decisions.calls || []).map((c) => ({ ...c, seed: r.seed }))); const seasons = runs.filter((r) => !r.error).reduce((s, r) => s + r.seasons, 0);
  const ins = calls.filter((c) => !c.offseason);
  return { n: calls.length, perSeason: r2(calls.length / seasons), byKind: count(calls, 'kind'), inSeason: ins.length, offseason: calls.length - ins.length, byWeek: count(ins, 'week'), afterDeadline: ins.filter((c) => c.week > TRADE_DEADLINE_WEEK || c.week < FIRST_TRADE_WEEK).length, byPos: count(calls, 'pos'),
    sendsWouldStartPct: pct(calls.filter((c) => c.wouldStart === true).length, calls.filter((c) => c.wouldStart != null).length), sendsOvrMedian: median(calls.flatMap((c) => c.sends.map((m) => m.ovr))), sendsAgeMedian: median(calls.flatMap((c) => c.sends.map((m) => m.age))),
    asksOwnerStarterPct: pct(calls.filter((c) => c.asks.length && c.asks[0].ovr >= c.ownerFloorAtPos).length, calls.filter((c) => c.asks.length).length), r1Asked: calls.reduce((s, c) => s + c.give.filter((g) => /R1$/.test(g)).length, 0), picksAskedPerCall: r2(mean(calls.map((c) => c.give.length))) };
}

/** Integrity for one tree and sample: the harness's own checks plus trade-level ones. */
export function integrity(runs) {
  const ok = runs.filter((r) => !r.error); const probs = ok.flatMap((r) => r.problems || []); const rows = aiRows(runs); const t = trading(runs); const c = callsSummary(runs);
  return { runs: runs.length, exceptions: runs.filter((r) => r.error).length, problemCount: ok.reduce((s, r) => s + (r.problemCount || 0), 0), harnessProblems: probs.length, problemSamples: [...new Set(probs)].slice(0, 5), pickOwnershipErrors: probs.filter((p) => /owned by unknown club/.test(p)).length, saveRoundTripErrors: probs.filter((p) => /save/.test(p)).length,
    seasonEndLineupProblems: rows.filter((x) => x.lineupProblems > 0).length, seasonEndOverCap: rows.filter((x) => x.capRoom < 0).length, rosterMin: Math.min(...rows.map((x) => x.rosterSize)), rosterMax: Math.max(...rows.map((x) => x.rosterSize)), protectedMoved: t.integrity.protectedMoved, aiDealsAfterDeadline: t.integrity.afterDeadline, offersAfterDeadline: c.afterDeadline };
}

// ---------------------------------------------------------------- per-seed metrics and paired differences
export function seedMetrics(r) {
  const rows = r.rows.filter((x) => !x.owner); const bySC = bySeedClub(rows.map((x) => ({ ...x, seed: r.seed }))); const last = Math.max(...rows.map((x) => x.year));
  let persist = 0, room = 0, elig = 0, olP = 0; for (const l of Object.values(bySC)) for (let i = 1; i < l.length; i++) { elig++; const both = l[i].weakGroups.filter((p) => l[i - 1].weakGroups.includes(p)); if (both.length) { persist++; if (l[i - 1].capRoom >= 100000) room++; } if (both.includes('OL')) olP++; }
  let losers = 0; for (const l of Object.values(bySC)) { for (let i = 0; i + 2 < l.length; i++) if (l[i].w <= 3 && l[i + 1].w <= 3 && l[i + 2].w <= 3) { losers++; break; } }
  const champs = rows.filter((x) => x.champion).map((x) => x.club); const cc = count(champs, (x) => x);
  const trades = r.decisions.trades; const lastRows = rows.filter((x) => x.year === last);
  const own = (x) => { const p = x.provenanceStarters || {}; const tot = Object.values(p).reduce((a, b) => a + b, 0); return tot ? ((p.original || 0) + (p.drafted || 0)) / tot : null; };
  const sdYear = mean([...new Set(rows.map((x) => x.year))].map((y) => sd(rows.filter((x) => x.year === y).map((x) => x.teamOvr))));
  let old = 0, cov = 0; for (const x of rows) for (const p of POS) { const bk = (x.backupsDetail?.[p] || []).filter((b) => !b[3]); for (const s of x.startersDetail?.[p] || []) if (!s[2] && s[1] >= 30) { old++; if (bk.some((b) => b[1] <= 26 && b[0] >= s[0] - 8)) cov++; } }
  return {
    tradesPerSeason: trades.length / r.seasons, inSeasonPerSeason: trades.filter((t) => t.week > 0).length / r.seasons, r1Traded: trades.reduce((s, t) => s + (t.picks || []).filter((p) => /R1:/.test(p)).length, 0), kickerDeals: trades.filter((t) => t.toAPos === 'K').length,
    persistentWeakPct: 100 * persist / Math.max(1, elig), persistentWeakRoomPct: 100 * room / Math.max(1, elig), olPersistent: olP, weakGroupsPerClubSeason: mean(rows.map((x) => x.weakGroups.length)),
    avgStarter: mean(rows.map((x) => x.avgStarter)), teamOvr: mean(rows.map((x) => x.teamOvr)), teamOvrSd: sdYear, starterAgeLast: mean(lastRows.map((x) => x.starterAge)), ownStarterShareLast: 100 * mean(lastRows.map(own)),
    persistentLoserPct: 100 * losers / Math.max(1, Object.keys(bySC).length), distinctChampions: new Set(champs).size, maxTitleShare: champs.length ? Math.max(...Object.values(cc)) / r.seasons : 0, gymTitleShare: champs.length ? 100 * champs.filter((c) => GYMS.has(c)).length / champs.length : null,
    nudgeSigningsPerClubSeason: mean(rows.map((x) => x.boosted || 0)), slowedPct: 100 * rows.filter((x) => x.slowed > 0).length / rows.length, seasonEndLineupProblems: rows.filter((x) => x.lineupProblems > 0).length, seasonEndOverCap: rows.filter((x) => x.capRoom < 0).length,
    r1HeldMean: mean(rows.filter((x) => x.picksNext).map((x) => x.picksNext[0])), r1NonePct: 100 * rows.filter((x) => x.picksNext && x.picksNext[0] === 0).length / Math.max(1, rows.filter((x) => x.picksNext).length), successionCoveredPct: old ? 100 * cov / old : null,
    ownerWinPct: (() => { const o = r.rows.filter((x) => x.owner); const w = o.reduce((s, x) => s + x.w, 0), l = o.reduce((s, x) => s + x.l, 0); return w + l ? 100 * w / (w + l) : null; })(),
  };
}
/** Deterministic bootstrap over seeds: mean paired difference and its 95% percentile interval; n seeds, and how many go each way. */
export function paired(baseRuns, newRuns, { reps = 2000, rngSeed = 55 } = {}) {
  const B = Object.fromEntries(baseRuns.filter((r) => !r.error).map((r) => [r.seed, seedMetrics(r)])); const N = Object.fromEntries(newRuns.filter((r) => !r.error).map((r) => [r.seed, seedMetrics(r)]));
  const seeds = Object.keys(B).filter((s) => N[s]).map(Number).sort((a, b) => a - b); if (!seeds.length) return { seeds: [] };
  let st = rngSeed >>> 0; const rnd = () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = { seeds, metrics: {} };
  for (const k of Object.keys(B[seeds[0]])) {
    const d = seeds.map((s) => (N[s][k] == null || B[s][k] == null ? null : N[s][k] - B[s][k])).filter((v) => v != null); if (!d.length) continue;
    const boots = []; for (let i = 0; i < reps; i++) { let s = 0; for (let j = 0; j < d.length; j++) s += d[Math.floor(rnd() * d.length)]; boots.push(s / d.length); } boots.sort((a, b) => a - b);
    out.metrics[k] = { base: r2(mean(seeds.map((s) => B[s][k]))), new: r2(mean(seeds.map((s) => N[s][k]))), diff: r2(mean(d)), lo: r2(boots[Math.floor(reps * 0.025)]), hi: r2(boots[Math.floor(reps * 0.975)]), up: d.filter((v) => v > 0).length, down: d.filter((v) => v < 0).length, n: d.length };
  }
  out.perSeed = seeds.map((s) => ({ seed: s, base: B[s], new: N[s] }));
  return out;
}

// ---------------------------------------------------------------- CSV writers
const esc = (v) => (v == null ? '' : /[,"\s]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);
function toCsv(rows, cols) { return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(Array.isArray(r[c]) ? r[c].join(' ') : r[c])).join(','))].join('\n') + '\n'; }

if (import.meta.url === `file://${process.argv[1]}`) {
  const BASE = args.base || 'base', NEW = args.new || 't55'; const OUT = args.out; fs.mkdirSync(OUT, { recursive: true });
  const { runs, meta } = loadDir(args.dir, [BASE, NEW]);
  const groups = [...new Set([...Object.keys(runs[BASE]), ...Object.keys(runs[NEW])])].sort();
  const summary = { generated: new Date().toISOString(), base: BASE, new: NEW, files: meta, groups: {}, paired: {}, stress: {}, attribution: {} };
  const tradeRows = [], callRows = [], clubRows = [], seedRows = [];
  for (const g of groups) {
    if (g.startsWith('D:')) continue;
    summary.groups[g] = {};
    for (const t of [BASE, NEW]) { const rs = runs[t][g]; if (!rs?.length) continue;
      summary.groups[g][t] = { task4: analyse(rs, { label: `${t}-${g}` }), trading: trading(rs), weakResponse: weakResponse(rs), extra: franchiseExtra(rs), calls: callsSummary(rs), integrity: integrity(rs) };
      for (const d of dealTable(rs)) tradeRows.push({ tree: t, group: g, ...d });
      for (const r of rs.filter((x) => !x.error)) for (const c of r.decisions.calls || []) callRows.push({ tree: t, group: g, seed: r.seed, year: c.year, week: c.week, offseason: c.offseason, team: c.team, kind: c.kind, pos: c.pos, sendsOvr: c.sends.map((m) => m.ovr), sendsAge: c.sends.map((m) => m.age), asksOvr: c.asks.map((m) => m.ovr), give: c.give, sendPicks: c.sendPicks, ownerFloorAtPos: c.ownerFloorAtPos, wouldStart: c.wouldStart });
      for (const x of aiRows(rs)) clubRows.push({ tree: t, group: g, seed: x.seed, year: x.year, club: x.club, gym: GYMS.has(x.club), w: x.w, l: x.l, playoffs: x.playoffs, champion: x.champion, teamOvr: x.teamOvr, target: x.target, quality: x.quality, boosted: x.boosted, slowed: x.slowed, rosterSize: x.rosterSize, payroll: x.payroll, capRoom: x.capRoom, lineupProblems: x.lineupProblems, avgStarter: x.avgStarter, weakGroups: x.weakGroups, meanAge: x.meanAge, starterAge: x.starterAge, devMean: x.devMean, r1Next: x.picksNext?.[0], r2Next: x.picksNext?.[1], r3Next: x.picksNext?.[2], r1Next2: x.picksNext2?.[0], ...Object.fromEntries(POS.map((p) => [`st_${p}`, x.starters?.[p] || []])) });
    }
    if (runs[BASE][g] && runs[NEW][g]) { const p = paired(runs[BASE][g], runs[NEW][g]); summary.paired[g] = { seeds: p.seeds, metrics: p.metrics }; for (const ps of p.perSeed || []) for (const t of ['base', 'new']) seedRows.push({ group: g, tree: t === 'base' ? BASE : NEW, seed: ps.seed, ...Object.fromEntries(Object.entries(ps[t]).map(([k, v]) => [k, r2(v)])) }); }
  }
  // pooled Stage B (every B seed both trees ran)
  { const pool = (t) => ['B1', 'B21', 'Bx'].flatMap((g) => runs[t][g] || []); const bp = pool(BASE), np = pool(NEW); if (bp.length && np.length) { summary.groups.Bpool = { [BASE]: { task4: analyse(bp), trading: trading(bp), weakResponse: weakResponse(bp), extra: franchiseExtra(bp), calls: callsSummary(bp), integrity: integrity(bp) }, [NEW]: { task4: analyse(np), trading: trading(np), weakResponse: weakResponse(np), extra: franchiseExtra(np), calls: callsSummary(np), integrity: integrity(np) } }; const p = paired(bp, np); summary.paired.Bpool = { seeds: p.seeds, metrics: p.metrics }; } }
  // stress scenarios: each tree's stressed clubs against the same clubs in that tree's Stage B seeds 1–5
  for (const g of groups.filter((x) => x.startsWith('D:'))) { summary.stress[g.slice(2)] = {}; for (const t of [BASE, NEW]) { const sc = runs[t][g]; const b = runs[t].B1 || []; if (sc?.length) summary.stress[g.slice(2)][t] = { compare: scenarioCompare(sc, b), integrity: integrity(sc), trading: { deals: trading(sc).deals, inSeason: trading(sc).window.inSeason } }; } }
  // attribution: the trading effect with and without the balance nudge (difference in differences on seeds 1–8)
  if (runs[BASE].E && runs[NEW].E && runs[BASE].B1 && runs[NEW].B1) { const seeds = new Set(runs[BASE].E.map((r) => r.seed)); const prodB = runs[BASE].B1.filter((r) => seeds.has(r.seed)), prodN = runs[NEW].B1.filter((r) => seeds.has(r.seed));
    summary.attribution = { production: paired(prodB, prodN).metrics, noNudge: paired(runs[BASE].E, runs[NEW].E).metrics, seeds: [...seeds] }; }
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
  const dealCols = ['tree', 'group', 'seed', 'year', 'week', 'window', 'kind', 'A', 'B', 'pos', 'ovr', 'age', 'starter', 'picks', 'r1Given', 'gavePos', 'mvRatio', 'ratio', 'floorGain', 'groupGain', 'dealFloorGain', 'aMeanGain', 'bMeanChange', 'bFloorChange', 'bShortAfter', 'aBackupBefore', 'aBackupAfter', 'aNoBackupAfter', 'salaryIn', 'salaryOut', 'aCapBefore', 'aCapAfter', 'capStrain', 'weakPre', 'resolvedAtDeal', 'weakAtSeasonEnd', 'resolvedSeasonEnd', 'withA0', 'startA0', 'withA1', 'startA1', 'withA2', 'startA2', 'ovrA1', 'protectedMoved', 'contractEnds', 'cfLineupGain', 'cfPosFloorGain', 'cfPosMeanGain', 'cfSellerLineupChange', 'cfSellerPosFloorChange', 'cfWeakWithout', 'cfWeakWith'];
  fs.writeFileSync(path.join(OUT, 'trades.csv'), toCsv(tradeRows, dealCols));
  fs.writeFileSync(path.join(OUT, 'calls.csv'), toCsv(callRows, ['tree', 'group', 'seed', 'year', 'week', 'offseason', 'team', 'kind', 'pos', 'sendsOvr', 'sendsAge', 'asksOvr', 'give', 'sendPicks', 'ownerFloorAtPos', 'wouldStart']));
  fs.writeFileSync(path.join(OUT, 'club-seasons.csv'), toCsv(clubRows, Object.keys(clubRows[0] || {})));
  fs.writeFileSync(path.join(OUT, 'paired-seeds.csv'), toCsv(seedRows, Object.keys(seedRows[0] || {})));
  console.log(`wrote ${OUT}: summary.json, trades.csv (${tradeRows.length}), calls.csv (${callRows.length}), club-seasons.csv (${clubRows.length}), paired-seeds.csv (${seedRows.length})`);
}
