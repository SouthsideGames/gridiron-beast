// Task 8 M6: Apex validation analysis under the owner's goal definition (docs/task8/m6/claude/APEX_GOAL_DEFINITION.md).
// Report only. Usage: node tools/task8-m6-apex-validation-analyze2.mjs --dir=DIR [--match=DIR2] [--out=FILE]
import fs from 'node:fs'; import path from 'node:path';
const arg = (k, d = null) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const load = (dir) => { const all = []; const meta = []; for (const f of fs.readdirSync(dir).filter((x) => /^cand-\d+\.json$/.test(x)).sort()) { const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); meta.push(j.meta); for (const r of j.individuals) { r.seed ??= Number(f.match(/\d+/)[0]); all.push(r); } } return { all, meta }; };
const NAME = { F: 'Football only', M: 'Mixed', X: 'Maximum' };
const wilson = (k, n) => { if (!n) return null; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [+(100 * (c - h) / d).toFixed(1), +(100 * (c + h) / d).toFixed(1)]; };
const pct = (k, n) => (n ? { k, n, pct: +(100 * k / n).toFixed(1), ci95: wilson(k, n) } : { k, n, pct: null, ci95: null });
const mean = (a) => (a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null);
const S = (r, k) => r.seasons[r.entry + k - 1]; // career season k
const span = (r) => Array.from({ length: 15 }, (_, i) => S(r, i + 1));
const isStarter = (s) => !!s && (s.st || 0) >= 7;
const starterSeasons = (r) => span(r).filter(isStarter).length;
const present = (s) => !!s && s.sum != null; // seen on a roster or in the pool at that season's start
const cause = (s) => (!present(s) ? 'out of the league' : s.club == null ? 'unsigned at the season start' : (s.to && (s.io || 0) / s.to >= 0.5) ? 'injured half the season or more' : 'benched or part-time');
const endOK = (r, k) => !!S(r, k)?.endAll99;
const firstEnd = (r) => { for (let k = 1; k <= 15; k++) if (endOK(r, k)) return k; return null; };
function entrantsOf(all) { const early = all.filter((r) => r.entry <= 5); return { entrants: early.filter((r) => (r.seasons[r.entry]?.level ?? 99) === 1), aboveLevel1: early.filter((r) => (r.seasons[r.entry]?.level ?? 99) !== 1).length, afterSeason5: all.filter((r) => r.entry > 5).length }; }
function block(list) {
  const n = list.length; const out = { n };
  out.all99ByEndOfSeason = Object.fromEntries([10, 12, 13, 14, 15].map((k) => [k, pct(list.filter((r) => endOK(r, k)).length, n)]));
  out.all99AtStartOfSeason16_looser = pct(list.filter((r) => r.seasons[r.entry + 15]?.all99).length, n);
  const dist = {}; for (const r of list) { const k = firstEnd(r); const key = k == null ? 'not by 15' : k <= 9 ? '9 or earlier' : String(k); dist[key] = (dist[key] || 0) + 1; }
  out.seasonOfAll99 = dist;
  out.participation = { startsPerSeason: mean(list.map((r) => mean(span(r).map((s) => s?.st || 0)))), clashesPerSeason: mean(list.map((r) => mean(span(r).map((s) => s?.cl || 0)))), starterSeasons: mean(list.map(starterSeasons)),
    seasonsMostlyInjured: mean(list.map((r) => span(r).filter((s) => s && s.to && (s.io || 0) / s.to >= 0.5).length)), clubs: mean(list.map((r) => new Set(span(r).map((s) => s?.club).filter(Boolean)).size)),
    outOfLeagueAtEnd15: list.filter((r) => S(r, 15)?.endSum == null).length, medianLevel50Season: (() => { const a = list.map((r) => { for (let k = 1; k <= 15; k++) if ((S(r, k)?.endLevel || 0) >= 50) return k; return 99; }).sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : null; })() };
  const short = list.filter((r) => !endOK(r, 15)).map((r) => 1188 - (S(r, 15)?.endSum ?? 0)).sort((a, b) => a - b); out.failures = { n: short.length, pointsShort: short };
  return out;
}
function analyse(all) {
  const { entrants, aboveLevel1, afterSeason5 } = entrantsOf(all); const res = { apexSeen: all.length, exclusions: { aboveLevel1AtFirstSight: aboveLevel1, enteredAfterSeason5: afterSeason5 }, entrants: entrants.length, schedules: {} };
  for (const c of 'FMX') { const list = entrants.filter((r) => r.cohort === c); const sus = list.filter((r) => starterSeasons(r) >= 12); const not = list.filter((r) => starterSeasons(r) < 12);
    const why = {}; for (const r of not) { const cs = {}; for (const s of span(r)) if (!isStarter(s)) { const k = cause(s); cs[k] = (cs[k] || 0) + 1; } const main = Object.entries(cs).sort((a, b) => b[1] - a[1])[0][0]; why[main] = (why[main] || 0) + 1; }
    res.schedules[c] = { name: NAME[c], sustainedStarters: block(sus), allEntrants: block(list), notSustained: { n: not.length, mainCause: why, starterSeasonsHistogram: not.reduce((h, r) => { const k = starterSeasons(r); h[k] = (h[k] || 0) + 1; return h; }, {}) },
      sensitivity: { atLeast10of15: block(list.filter((r) => starterSeasons(r) >= 10)).all99ByEndOfSeason[15], all15: block(list.filter((r) => starterSeasons(r) >= 15)).all99ByEndOfSeason[15], atLeast14of15: block(list.filter((r) => starterSeasons(r) >= 14)).all99ByEndOfSeason[15] } }; }
  res.allSchedules = { sustainedStarters: block(entrants.filter((r) => starterSeasons(r) >= 12)), allEntrants: block(entrants) };
  return res;
}
const A = load(arg('dir')); const out = { definition: 'docs/task8/m6/claude/APEX_GOAL_DEFINITION.md', dir: arg('dir'), meta: A.meta[0], games: A.meta.reduce((s, m) => s + m.games, 0), clashSettlements: A.meta.reduce((s, m) => s + m.clash, 0), franchises: A.meta.length, result: analyse(A.all) };
if (arg('match')) { // matched individuals: the same id in the same seed under another setting (looser metric only when the other run lacks end-of-season records)
  const B = load(arg('match')); const eA = entrantsOf(A.all).entrants, eB = entrantsOf(B.all).entrants; const key = (r) => `${r.seed}:${r.id}`; const mB = new Map(eB.map((r) => [key(r), r])); const allB = new Map(B.all.map((r) => [key(r), r]));
  const m = { entrantsHere: eA.length, entrantsThere: eB.length, matched: 0, apexHereNotApexThere: 0, bySchedule: {} };
  for (const r of eA) { const o = mB.get(key(r)); if (!o) { if (!allB.has(key(r))) m.apexHereNotApexThere++; continue; } m.matched++; const b = (m.bySchedule[r.cohort] ||= { n: 0, sameClubAtEntry: 0, sameEntryYear: 0, bothLoose: 0, onlyHereLoose: 0, onlyThereLoose: 0, neitherLoose: 0, starterSeasonsHere: [], starterSeasonsThere: [], sustainedBoth: 0, sustainedOnlyHere: 0, sustainedOnlyThere: 0 });
    b.n++; if (r.seasons[r.entry]?.club === o.seasons[o.entry]?.club) b.sameClubAtEntry++; if (r.entry === o.entry) b.sameEntryYear++;
    const x = !!r.seasons[r.entry + 15]?.all99, y = !!o.seasons[o.entry + 15]?.all99; b[x && y ? 'bothLoose' : x ? 'onlyHereLoose' : y ? 'onlyThereLoose' : 'neitherLoose']++;
    const sa = starterSeasons(r), sb = starterSeasons(o); b.starterSeasonsHere.push(sa); b.starterSeasonsThere.push(sb); b[sa >= 12 && sb >= 12 ? 'sustainedBoth' : sa >= 12 ? 'sustainedOnlyHere' : sb >= 12 ? 'sustainedOnlyThere' : 'neither'] = (b[sa >= 12 && sb >= 12 ? 'sustainedBoth' : sa >= 12 ? 'sustainedOnlyHere' : sb >= 12 ? 'sustainedOnlyThere' : 'neither'] || 0) + 1; }
  for (const b of Object.values(m.bySchedule)) { b.starterSeasonsHere = mean(b.starterSeasonsHere); b.starterSeasonsThere = mean(b.starterSeasonsThere); }
  out.matched = { against: arg('match'), ...m };
}
if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(out, null, 1));
const line = (b) => `n=${b.n}  end of 10: ${b.all99ByEndOfSeason[10].pct}%  12: ${b.all99ByEndOfSeason[12].pct}%  15: ${b.all99ByEndOfSeason[15].pct}% [${b.all99ByEndOfSeason[15].ci95}]  (start of 16: ${b.all99AtStartOfSeason16_looser.pct}%)  dist ${JSON.stringify(b.seasonOfAll99)}`;
console.log(`franchises ${out.franchises}, games ${out.games}, Apex seen ${out.result.apexSeen}, entrants ${out.result.entrants}, exclusions ${JSON.stringify(out.result.exclusions)}`);
for (const c of 'FMX') { const x = out.result.schedules[c]; console.log(`${x.name}\n  sustained: ${line(x.sustainedStarters)}\n  all:       ${line(x.allEntrants)}\n  not sustained ${x.notSustained.n}: ${JSON.stringify(x.notSustained.mainCause)}  sensitivity 10of15 ${JSON.stringify(x.sensitivity.atLeast10of15)} 14of15 ${JSON.stringify(x.sensitivity.atLeast14of15)}\n  participation sustained ${JSON.stringify(x.sustainedStarters.participation)}\n  participation all ${JSON.stringify(x.allEntrants.participation)}\n  failures sustained ${JSON.stringify(x.sustainedStarters.failures)}`); }
console.log('all schedules sustained:', line(out.result.allSchedules.sustainedStarters)); if (out.matched) console.log('matched', JSON.stringify(out.matched));
