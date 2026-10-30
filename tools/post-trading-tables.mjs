#!/usr/bin/env node
// Markdown tables for POST_TRADING_FRANCHISE_BENCHMARK.md, printed straight from the summary that tools/post-trading-analyze.mjs wrote, so
// every figure in the report can be traced to (and regenerated from) the stored results. Pure reading.
//   node tools/post-trading-tables.mjs --summary=summary.json [--groups=B21,B1,Bx,Bpool,C] > tables.md
import fs from 'node:fs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || '1']; }));
const S = JSON.parse(fs.readFileSync(args.summary, 'utf8')); const BASE = S.base, NEW = S.new;
const groups = (args.groups || 'B21,B1,Bx,Bpool,C').split(',').filter((g) => S.groups[g]);
const NAME = { B21: 'B 21–40', B1: 'B 1–20', Bx: 'B 41–60', Bpool: 'B pooled', C: 'C 106–110 (20 seasons)', E: 'E no-nudge 1–8' };
const v = (x) => (x == null ? '–' : typeof x === 'number' ? String(Math.round(x * 100) / 100) : String(x));
const get = (o, p) => p == null ? undefined : p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
const out = [];
const table = (title, rows, gs = groups) => {
  out.push(`### ${title}`, '', `| Measure | ${gs.map((g) => `${NAME[g] || g} ${BASE} | ${NAME[g] || g} ${NEW}`).join(' | ')} |`, `|---|${gs.map(() => '---|---').join('|')}|`);
  for (const [label, path] of rows) out.push(`| ${label} | ${gs.map((g) => `${v(get(S.groups[g]?.[BASE], path))} | ${v(get(S.groups[g]?.[NEW], path))}`).join(' | ')} |`);
  out.push('');
};
table('Trading volume and timing', [
  ['AI–AI deals per season', 'trading.perSeason'], ['… offseason per season', 'trading.window.offseasonPerSeason'], ['… in season per season', 'trading.window.inSeasonPerSeason'], ['In-season deals in week 8 (%)', 'trading.week8Share'], ['Deals after the deadline', 'trading.afterDeadline'],
  ['Kicker share of deals (%)', 'trading.kickerPct'], ['First-round picks given per 10 club-seasons', 'trading.r1PerTenClubSeasons'], ['First-round picks given for kickers', 'trading.r1ForKicker'], ['Picks given (R1 / R2 / R3)', null],
]);
// fill the picks row by hand (three numbers)
{ const i = out.findIndex((l) => l.startsWith('| Picks given')); out[i] = `| Picks given (R1 / R2 / R3) | ${groups.map((g) => [BASE, NEW].map((t) => { const p = S.groups[g]?.[t]?.trading.picks; return p ? `${p.r1} / ${p.r2} / ${p.r3}` : '–'; }).join(' | ')).join(' | ')} |`; }
table('What a deal did, measured against its own undoing (plain ratings, no valuation)', [
  ['Acquired monster starts for the buyer (%)', 'trading.quality.all.acquiredStarterPct'], ['Buyer lineup points gained, median', 'trading.quality.all.cfLineupGainMedian'], ['… mean', 'trading.quality.all.cfLineupGainMean'], ['Deals with no lineup gain (%)', 'trading.quality.all.cfNoLineupGainPct'], ['Deals gaining 4+ lineup points (%)', 'trading.quality.all.cfLineupGain4Pct'],
  ['Position starter floor gained, median', 'trading.quality.all.cfPosFloorGainMedian'], ['Seller lineup falls (%)', 'trading.quality.all.cfSellerLineupLossPct'], ['Seller lineup falls by 4+ (%)', 'trading.quality.all.cfSellerLoss4Pct'],
  ['In season: buyer lineup gain, median', 'trading.quality.inSeason.cfLineupGainMedian'], ['In season: no lineup gain (%)', 'trading.quality.inSeason.cfNoLineupGainPct'], ['Offseason: buyer lineup gain, median', 'trading.quality.offseason.cfLineupGainMedian'], ['Offseason: no lineup gain (%)', 'trading.quality.offseason.cfNoLineupGainPct'],
  ['Deals at a weak group (%)', 'trading.needCf.dealsAtWeakGroupPct'], ['… weak group resolved by the deal (%)', 'trading.needCf.resolvedByDealPct'], ['… still weak at that season\'s end (%)', 'trading.needCf.stillWeakAtSeasonEndPct'],
  ['Buyer left with no backup at the position (%)', 'trading.quality.all.buyerNoBackupAfterPct'], ['Acquired monster aged 31+ (%)', 'trading.quality.all.age31plusPct'], ['Deal pushes buyer under 1.5% cap room (%)', 'trading.cap.capStrainPct'], ['Salary taken on, median (cr)', 'trading.cap.salaryDeltaMedian'],
  ['Still with the buyer at the season end (%)', 'trading.outcomes.withAcquirerSeasonEndPct'], ['Starting for the buyer a season later (%)', 'trading.outcomes.startingNextSeasonPct'], ['Still with the buyer two seasons later (%)', 'trading.outcomes.withAcquirer2Pct'], ['Monsters traded again in the same or the next season', 'trading.outcomes.reTradedWithinASeason'],
]);
table('Weak groups: traded for, or left alone (resolved by the next season end)', [
  ['Weak groups traded for (% of weak groups)', 'weakResponse.tradedShareOfWeak'], ['Resolved when traded for (%)', 'weakResponse.traded.resolvedPct'], ['… n', 'weakResponse.traded.n'], ['Resolved when not traded for (%)', 'weakResponse.notTraded.resolvedPct'], ['… n', 'weakResponse.notTraded.n'],
  ['OL: resolved when traded for (%)', 'weakResponse.byPos.OL.traded.resolvedPct'], ['OL: … n', 'weakResponse.byPos.OL.traded.n'], ['OL: resolved when not traded for (%)', 'weakResponse.byPos.OL.notTraded.resolvedPct'], ['OL: … n', 'weakResponse.byPos.OL.notTraded.n'],
]);
table('Task 4 franchise measures', [
  ['Persistent weak group (% of club-seasons)', 'task4.roster.persistentWeakPct'], ['… with 100k+ cap room (%)', 'task4.roster.persistentWeakWithCapRoomPct'], ['Weak group at season end (%)', 'task4.roster.weakGroupClubSeasonsPct'], ['Longest persistent streak (seasons)', 'task4.roster.persistentStreakMax'],
  ['Starter mean age', 'task4.roster.starterAge'], ['Round-1 picks starting 2 seasons on (%)', 'task4.draft.round1StarterAt2'], ['Misaligned picks (%)', 'task4.draft.misalignedPct'], ['Development of returning monsters (ovr/season)', 'task4.development.devMeanReturning'],
  ['Non-draft arrivals at a weak group (%)', 'task4.arrivals.atWeakGroupPct'], ['Non-draft arrivals who start (%)', 'task4.arrivals.nonDraftStartingPct'], ['Contract-time departures that were starters (%)', 'task4.departures.contractTimeStarterPct'],
  ['Recovery ≤2 → ≥5 wins, median seasons', 'task4.competition.recoveryMedian'], ['… never recovered in the run (%)', 'task4.competition.unrecoveredPct'], ['Persistent losers (%)', 'task4.competition.persistentLoserPct'], ['Distinct champions per seed (median)', 'task4.competition.distinctChampionsMedian'], ['Max title share, one club', 'task4.competition.maxTitleShareMax'],
  ['Gym clubs\' share of AI titles (%)', 'extra.gym.gymSharePct'], ['Team-overall SD (mean over seasons)', 'task4.balance.teamOvrSdMean'], ['Anchor ↔ wins correlation', 'task4.competition.rQualityWins'], ['Nudge signings', 'task4.balance.nudgeSignings'], ['Slowed club-seasons (%)', 'task4.balance.slowedClubSeasonsPct'], ['Owner (hands-off) win %', 'task4.competition.ownerWinPct'],
]);
table('Draft capital, succession and development', [
  ['First-round selections per club per draft', 'extra.capital.r1PerClubDraft'], ['Club-drafts with no first-round selection (%)', 'extra.capital.noR1Pct'], ['Club-drafts with 2+ first-round selections (%)', 'extra.capital.twoPlusR1Pct'], ['Most first-rounders one club made in one draft', 'extra.capital.maxR1OneClub'],
  ['Strugglers (≤3 wins) with no first-rounder (%)', 'extra.capital.strugglersNoR1Pct'], ['Contenders (6+ wins) with no first-rounder (%)', 'extra.capital.contendersNoR1Pct'], ['Clubs ever without a first-rounder two drafts running (%)', 'extra.capital.clubsNoR1TwoDraftsRunningPct'],
  ['Starter slots held by a 30+ starter (%)', 'extra.succession.starterSlots30plusPct'], ['… by a 33+ starter (%)', 'extra.succession.starterSlots33plusPct'], ['30+ starters with a young successor within 8 (%)', 'extra.succession.coveredPct'],
  ['Round-1 draftee who starts, gain after 3+ seasons', 'extra.draftee.1|starter.gain'], ['Round-1 draftee who stays a reserve, gain', 'extra.draftee.1|reserve.gain'], ['Round-3 draftee reserve, gain', 'extra.draftee.3|reserve.gain'],
  ['OL group minus club starter mean', 'extra.ol.groupMinusClubMeanByPos.OL'], ['OL weak club-seasons (Task 4 rule)', 'extra.ol.weakClubSeasons'], ['… of which OL at the league OL mean or better (%)', 'extra.ol.weakButAtLeagueOlMeanPct'], ['OL 6+ below the league OL mean (club-seasons)', 'extra.ol.leagueRelativeWeakClubSeasons'],
]);
table('Incoming offers to the owner (the benchmark owner never answers)', [
  ['Offers per season', 'calls.perSeason'], ['… in season', 'calls.inSeason'], ['… offseason', 'calls.offseason'], ['Offers alive after the deadline', 'calls.afterDeadline'], ['Offered monster would start for the owner (%)', 'calls.sendsWouldStartPct'], ['Offered monster overall, median', 'calls.sendsOvrMedian'], ['First-round picks asked', 'calls.r1Asked'],
]);
table('Integrity', [
  ['Exceptions', 'integrity.exceptions'], ['Invariant problems (weekly checks, season-start lineups and cap, ids, registry, save round trip)', 'integrity.problemCount'], ['Pick-ownership errors', 'integrity.pickOwnershipErrors'], ['Protected monsters moved', 'integrity.protectedMoved'], ['AI–AI deals after week 8', 'integrity.aiDealsAfterDeadline'], ['Offers alive after week 8', 'integrity.offersAfterDeadline'],
  ['Season-end lineup problems (club-seasons)', 'integrity.seasonEndLineupProblems'], ['Season-end over the cap (club-seasons)', 'integrity.seasonEndOverCap'], ['Roster min–max at season end', null],
]);
{ const i = out.findIndex((l) => l.startsWith('| Roster min–max')); out[i] = `| Roster min–max at season end | ${groups.map((g) => [BASE, NEW].map((t) => { const x = S.groups[g]?.[t]?.integrity; return x ? `${x.rosterMin}–${x.rosterMax}` : '–'; }).join(' | ')).join(' | ')} |`; }
// by position, for each sample
for (const g of groups) { const P = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K']; const b = S.groups[g][BASE], n = S.groups[g][NEW]; if (!b || !n) continue;
  out.push(`### By position, ${NAME[g] || g} (${BASE} → ${NEW})`, '', `| | ${P.join(' | ')} |`, `|---|${P.map(() => '---').join('|')}|`);
  const row = (label, f) => out.push(`| ${label} | ${P.map((p) => `${v(f(b, p))} → ${v(f(n, p))}`).join(' | ')} |`);
  row('Deals acquiring the position', (x, p) => x.trading.byPos[p] || 0); row('First-round picks given for it', (x, p) => x.trading.r1ByPos[p] || 0);
  row('Persistent weak club-seasons', (x, p) => (p === 'K' ? null : x.extra.persistentWeakByPos[p] || 0)); row('Starter mean overall', (x, p) => (p === 'K' ? null : x.task4.roster.starterMeanByPos[p]));
  row('Starter age, last season', (x, p) => (p === 'K' ? null : x.extra.starterAgeByPos[p]?.last)); out.push(''); }
// paired differences
out.push('### Matched-seed paired differences (new − base), mean over seeds, bootstrap 95% interval', '');
const pm = ['tradesPerSeason', 'inSeasonPerSeason', 'r1Traded', 'kickerDeals', 'persistentWeakPct', 'persistentWeakRoomPct', 'olPersistent', 'weakGroupsPerClubSeason', 'avgStarter', 'teamOvr', 'teamOvrSd', 'starterAgeLast', 'ownStarterShareLast', 'persistentLoserPct', 'distinctChampions', 'maxTitleShare', 'gymTitleShare', 'nudgeSigningsPerClubSeason', 'slowedPct', 'seasonEndLineupProblems', 'seasonEndOverCap', 'noR1DraftPct', 'successionCoveredPct', 'ownerWinPct'];
const pg = Object.keys(S.paired).filter((g) => S.paired[g].metrics);
out.push(`| Measure | ${pg.map((g) => `${NAME[g] || g} (n=${S.paired[g].seeds.length})`).join(' | ')} |`, `|---|${pg.map(() => '---').join('|')}|`);
for (const k of pm) out.push(`| ${k} | ${pg.map((g) => { const m = S.paired[g].metrics[k]; return m ? `${v(m.base)} → ${v(m.new)}: ${m.diff > 0 ? '+' : ''}${v(m.diff)} [${v(m.lo)}, ${v(m.hi)}] (${m.up}↑ ${m.down}↓)` : '–'; }).join(' | ')} |`);
out.push('');
if (S.attribution?.production) { out.push('### Attribution: the trading effect with the balance nudge (production) and without it (no-nudge variant), seeds 1–8', '', '| Measure | Production: new − base [95%] | No-nudge: new − base [95%] |', '|---|---|---|');
  for (const k of pm) { const a = S.attribution.production[k], b = S.attribution.noNudge[k]; if (!a || !b) continue; out.push(`| ${k} | ${v(a.base)} → ${v(a.new)}: ${a.diff > 0 ? '+' : ''}${v(a.diff)} [${v(a.lo)}, ${v(a.hi)}] | ${v(b.base)} → ${v(b.new)}: ${b.diff > 0 ? '+' : ''}${v(b.diff)} [${v(b.lo)}, ${v(b.hi)}] |`); } out.push(''); }
console.log(out.join('\n'));
