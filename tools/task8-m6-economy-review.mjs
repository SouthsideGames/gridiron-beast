#!/usr/bin/env node
// Task 8 M6: economy review from the recorded twenty-season franchise runs (seeds 1-3; simulation f716b02). Read-only: it only
// summarises docs/task8/m6/ai-20-season-*.json. Usage: node tools/task8-m6-economy-review.mjs [--out=docs/task8/m6/claude/economy-review.json]
import fs from 'node:fs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const runs = ['docs/task8/m6/ai-20-season-seed-1.json', 'docs/task8/m6/ai-20-season-seeds-2-3.json'].flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')).runs);
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null); const r1 = (x, d = 1) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
const CAP = 1800000;
const seasons = runs.flatMap((r) => r.v4.seasons.map((s) => ({ seed: r.seed, ...s }))); const rows = runs.flatMap((r) => r.rows.filter((x) => !x.owner));
const fa = seasons.map((s) => s.fa).filter(Boolean); const signs = fa.flatMap((f) => f.signs.filter((x) => !x.owner));
const sumA = (k) => fa.reduce((n, f) => n + (f.ambition?.ext?.[k] || 0), 0); const sumM = (k) => fa.reduce((n, f) => n + (f.ambition?.midExt?.[k] || 0), 0);
const sales = runs.flatMap((r) => r.v4.sales || []);
// cap room by strategy mode (the mode in force for that club-season) and by result
const modeOf = {}; for (const s of seasons) for (const [club, st] of Object.entries(s.strategy || {})) modeOf[`${s.seed}|${s.year}|${club}`] = st.mode;
const byMode = {}; for (const x of rows) { const m = modeOf[`${x.seed}|${x.year}|${x.club}`] || 'unknown'; (byMode[m] ||= []).push(x); }
const third = (pred) => rows.filter(pred);
const winPct = (x) => x.w / Math.max(1, x.w + x.l);
// rebuilding: clubs in the bottom quarter by team OVR in a season: where are they three and five seasons later?
const key = (x) => `${x.seed}|${x.club}`; const byClub = {}; for (const x of rows) (byClub[key(x)] ||= {})[x.year] = x;
const rebuild = { n: 0, improved3: 0, playoffs5: 0, gain3: [] };
for (const s of [...new Set(rows.map((x) => `${x.seed}|${x.year}`))]) { const [seed, year] = s.split('|').map(Number); if (year > 15) continue; const yr = rows.filter((x) => x.seed === seed && x.year === year).sort((a, b) => a.teamOvr - b.teamOvr); for (const x of yr.slice(0, 4)) { const c = byClub[key(x)]; const l3 = c[year + 3]; if (!l3) continue; rebuild.n++; rebuild.gain3.push(l3.teamOvr - x.teamOvr); if (l3.teamOvr > x.teamOvr) rebuild.improved3++; if ([1, 2, 3, 4, 5].some((d) => c[year + d]?.playoffs)) rebuild.playoffs5++; } }
// dynasties: the longest run of playoff seasons by one club; champions
const champs = {}; for (const x of rows) if (x.champion) champs[key(x)] = (champs[key(x)] || 0) + 1;
const out = {
  source: 'docs/task8/m6/ai-20-season-seed-1.json and ai-20-season-seeds-2-3.json (simulation f716b02; hands-off owner; AI clubs only below)', cap: CAP, staffAllowanceNote: 'cap room = cap - roster payroll - staff allowance',
  clubSeasons: rows.length, seasons: seasons.length,
  capRoom: { mean: Math.round(mean(rows.map((x) => x.capRoom))), p10: q(rows.map((x) => x.capRoom), 0.1), median: q(rows.map((x) => x.capRoom), 0.5), p90: q(rows.map((x) => x.capRoom), 0.9), min: Math.min(...rows.map((x) => x.capRoom)), shareOfCap: r1(mean(rows.map((x) => x.capRoom)) / CAP * 100) },
  rosterSize: { mean: r1(mean(rows.map((x) => x.rosterSize))), full38: r1(rows.filter((x) => x.rosterSize >= 38).length / rows.length * 100), under36: r1(rows.filter((x) => x.rosterSize < 36).length / rows.length * 100) },
  capRoomByMode: Object.fromEntries(Object.entries(byMode).map(([m, a]) => [m, { clubSeasons: a.length, meanRoom: Math.round(mean(a.map((x) => x.capRoom))), meanTeamOvr: r1(mean(a.map((x) => x.teamOvr))), meanWinPct: r1(mean(a.map(winPct)) * 100), meanWeakGroups: r1(mean(a.map((x) => (x.weakGroups || []).length)), 2) }])),
  capRoomByResult: { playoffClubs: Math.round(mean(third((x) => x.playoffs).map((x) => x.capRoom))), nonPlayoffClubs: Math.round(mean(third((x) => !x.playoffs).map((x) => x.capRoom))), champions: Math.round(mean(third((x) => x.champion).map((x) => x.capRoom))) },
  weakGroupsWithRoom: { clubSeasonsWithAWeakGroup: rows.filter((x) => (x.weakGroups || []).length).length, ofThoseWithAtLeast100kRoom: rows.filter((x) => (x.weakGroups || []).length && x.capRoom >= 100000).length },
  freeAgency: { marketsRecorded: fa.length, aiSigningsPerMarket: r1(signs.length / fa.length), contested2plus: r1(signs.filter((x) => x.bidders >= 2).length / signs.length * 100), contested3plus: r1(signs.filter((x) => x.bidders >= 3).length / signs.length * 100), meanBidders: r1(mean(signs.map((x) => x.bidders)), 2), salary: { median: q(signs.map((x) => x.salary), 0.5), p90: q(signs.map((x) => x.salary), 0.9), max: Math.max(...signs.map((x) => x.salary)) }, salaryByBidders: Object.fromEntries([1, 2, 3, 4].map((b) => [b === 4 ? '4+' : b, Math.round(mean(signs.filter((x) => (b === 4 ? x.bidders >= 4 : x.bidders === b)).map((x) => x.salary)) || 0)])), offersPerMarket: r1(mean(fa.map((f) => f.offers))), revisionsPerMarket: r1(mean(fa.map((f) => f.revisions))), unsignedAtClosePerMarket: r1(mean(fa.map((f) => f.unsignedAtClose))), marketProblems: fa.reduce((n, f) => n + (f.marketProblems?.length || 0), 0) },
  extensions: { offered: sumA('offered'), signed: sumA('signed'), declined: sumA('declined'), declinedStarters: sumA('declinedStarters'), acceptedAsOffered: sumA('accepted'), compromised: sumA('compromised'), signedShare: r1(sumA('signed') / sumA('offered') * 100), midSeason: { offered: sumM('offered'), signed: sumM('signed'), declined: sumM('declined') } },
  starterSales: { note: "sales of a starter by a rebuilding or retooling club (v4.sales); the three runs recorded 182 trades in all", total: sales.length, perSeason: r1(sales.length / seasons.length), withPicks: sales.filter((x) => x.picks).length, byBuyerMode: sales.reduce((o, x) => { o[x.buyerMode] = (o[x.buyerMode] || 0) + 1; return o; }, {}), inSeason: sales.filter((x) => x.week > 0).length },
  rebuilding: { definition: 'the four weakest AI clubs by team OVR in a season (seasons 1-15), three seasons later', n: rebuild.n, improvedShare: r1(rebuild.improved3 / rebuild.n * 100), meanOvrGain: r1(mean(rebuild.gain3)), reachedPlayoffsWithin5: r1(rebuild.playoffs5 / rebuild.n * 100) },
  parity: { distinctChampions: Object.keys(champs).length, mostTitlesByOneClub: Math.max(...Object.values(champs)), championSeasons: Object.values(champs).reduce((a, b) => a + b, 0), teamOvrSpread: { p10: q(rows.map((x) => x.teamOvr), 0.1), median: q(rows.map((x) => x.teamOvr), 0.5), p90: q(rows.map((x) => x.teamOvr), 0.9) } },
};
const OUT = args.out || 'docs/task8/m6/claude/economy-review.json'; fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n'); console.log(JSON.stringify(out, null, 1));
