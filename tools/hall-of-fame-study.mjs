#!/usr/bin/env node
// Monster Hall of Fame study. Reads finished franchise saves (tools/task9-history-study.mjs --dump), holds every annual election
// again from the retired monsters each save recorded, with the rules in src/franchise/monster-hof-voting.js, and measures who
// gets in: how many, how fast, at which positions, on what kind of career, and who was left out.
//   node tools/hall-of-fame-study.mjs save1.json save2.json ... [--json=out.json] [--snubs=5] [--quiet]
// Nothing is simulated here, so a rule change can be measured in seconds on the same franchises.
import { readFileSync, writeFileSync } from 'node:fs';
import { electMonsterHallOfFame, monsterHofInductees, productionStanding, productionRank, candidateCase, caseFacts, WAIT_SEASONS, MAX_INDUCTEES, MAX_NOMINEES, VOTE_THRESHOLD, HALL_CASE } from '../src/franchise/monster-hof-voting.js';

const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const SNUBS = Number(args.snubs || 5);
const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '—');
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const r1 = (n) => Math.round(n * 10) / 10;

/** One franchise: its candidates (with the detailed case read from the preserved records) and every election held again. */
export function study(f, { noTitles = false } = {}) {
  const stubs = f.league?.legends || {};
  const candidates = (f.monsterHallOfFame?.candidates || []).map((c) => ({ ...c, ...(stubs[c.id] ? caseFacts(stubs[c.id]) : {}), ...(noTitles ? { honours: { ...c.honours, titles: 0 } } : {}) }));
  const years = (f.history || []).map((h) => h.year).sort((a, b) => a - b);
  let history = []; const perYear = [];
  for (const year of years) {
    const known = candidates.filter((c) => c.retiredYear <= year); const inducted = new Set(monsterHofInductees(history).map((x) => x.id));
    const eligible = known.filter((c) => year - c.retiredYear >= WAIT_SEASONS && !inducted.has(String(c.id)));
    const r = electMonsterHallOfFame(known, year, history); history = r.history; const e = r.election;
    const qualified = e.ballot.filter((b) => b.qualified).length;
    perYear.push({ year, eligible: eligible.length, nominees: e.ballot.length, qualified, inducted: e.inductees.length, shutOut: Math.max(0, qualified - MAX_INDUCTEES), notNominated: Math.max(0, eligible.length - MAX_NOMINEES) });
  }
  const lastYear = years[years.length - 1]; const standing = productionStanding(candidates); const rank = productionRank(candidates);
  const inductees = monsterHofInductees(history); const inIds = new Map(inductees.map((x) => [String(x.id), x]));
  const rows = candidates.map((c) => { const st = standing.get(String(c.id)) ?? 0.5; const k = candidateCase(c, st, rank.get(String(c.id)) || 0); const stub = stubs[c.id] || {}; const ind = inIds.get(String(c.id));
    return { id: c.id, name: c.name, position: c.position, retiredYear: c.retiredYear, eligibleFrom: c.retiredYear + WAIT_SEASONS, eligible: c.retiredYear + WAIT_SEASONS <= lastYear, seasons: c.seasons, games: c.games,
      titles: c.honours?.titles || 0, awards: c.honours?.awards || 0, records: c.honours?.records || 0, awardsBy: c.awardsBy || {}, recordsBy: c.recordsBy || {}, prod: c.prod, standing: st, rank: rank.get(String(c.id)) || 0, case: k,
      inducted: ind ? ind.inductedYear : null, wait: ind ? ind.inductedYear - (c.retiredYear + WAIT_SEASONS) : null, votes: ind ? ind.votes : null, lastClub: stub.lastClub || null, career: stub.career || null }; });
  return { club: f.club, seasons: years.length, perYear, rows, history };
}

const line = (x) => `${x.name} (${x.position}, retired ${x.retiredYear}) · ${x.case.total} pts = awards ${x.case.awards} + records ${x.case.records} + production ${x.case.production} (${Math.round(x.standing * 100)}th pct) + longevity ${r1(x.case.longevity)} + titles ${x.case.titles} · ${x.seasons} seasons, ${x.games} games${Object.keys(x.awardsBy).length ? ` · ${Object.entries(x.awardsBy).map(([k, n]) => `${n}× ${k.toUpperCase()}`).join(', ')}` : ''}`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const saves = files.map((file) => [file, JSON.parse(readFileSync(file, 'utf8'))]);
  const all = saves.map(([file, f]) => ({ file, ...study(f) }));
  const bare = saves.map(([file, f]) => study(f, { noTitles: true }));   // the same elections with every title point removed
  const say = (...a) => { if (!args.quiet) console.log(...a); };
  const rows = all.flatMap((s) => s.rows.map((x) => ({ ...x, save: s.file.split('/').pop() }))); const years = all.flatMap((s) => s.perYear);
  const live = years.filter((y) => y.eligible > 0); const inducted = rows.filter((x) => x.inducted != null); const eligible = rows.filter((x) => x.eligible);
  say(`\n== Monster Hall of Fame: ${all.length} franchises, ${years.length} elections (${live.length} with an eligible candidate) ==`);
  say(`rules: wait ${WAIT_SEASONS}, ballot ${MAX_NOMINEES}, class ≤ ${MAX_INDUCTEES}, ${Math.round(VOTE_THRESHOLD * 100)}% of the Board; standards ${HALL_CASE.standardFrom}–${HALL_CASE.standardFrom + HALL_CASE.standardSpan - 1} points`);
  for (const s of all) say(`  ${s.file.split('/').pop()}: ${s.club}, ${s.seasons} seasons, ${s.rows.length} retired on record, ${s.rows.filter((x) => x.eligible).length} eligible by the end, ${s.rows.filter((x) => x.inducted != null).length} inducted [${s.perYear.map((y) => y.inducted).join('')}]`);
  say(`\ninductees per franchise: ${all.map((s) => s.rows.filter((x) => x.inducted != null).length).join(', ')} (mean ${r1(avg(all.map((s) => s.rows.filter((x) => x.inducted != null).length)))})`);
  say(`share of eligible retirees inducted: ${pct(inducted.length, eligible.length)} (${inducted.length} of ${eligible.length})`);
  const size = [0, 1, 2, 3].map((n) => live.filter((y) => y.inducted === n).length);
  say(`class size, elections with a candidate: none ${pct(size[0], live.length)} · one ${pct(size[1], live.length)} · two ${pct(size[2], live.length)} · three ${pct(size[3], live.length)}`);
  say(`per election (with a candidate): eligible ${r1(avg(live.map((y) => y.eligible)))} · nominees ${r1(avg(live.map((y) => y.nominees)))} · enough votes ${r1(avg(live.map((y) => y.qualified)))} · inducted ${r1(avg(live.map((y) => y.inducted)))} · enough votes but no room ${r1(avg(live.map((y) => y.shutOut)))} · eligible but not nominated ${r1(avg(live.map((y) => y.notNominated)))}`);
  say(`elections where the class limit kept somebody out: ${pct(live.filter((y) => y.shutOut > 0).length, live.length)}`);
  const waits = inducted.map((x) => x.wait); say(`wait from first eligible year to induction: mean ${r1(avg(waits))} seasons · first ballot ${pct(waits.filter((w) => w === 0).length, waits.length)} · 3+ seasons ${pct(waits.filter((w) => w >= 3).length, waits.length)} · longest ${Math.max(0, ...waits)}`);
  say('\nby position (eligible → inducted, rate, mean case of inductees):');
  const positions = [...new Set(rows.map((x) => x.position))].sort();
  const byPos = {}; for (const p of positions) { const e = eligible.filter((x) => x.position === p), i = inducted.filter((x) => x.position === p); byPos[p] = { eligible: e.length, inducted: i.length, rate: e.length ? i.length / e.length : 0 }; say(`  ${p.padEnd(3)} ${String(e.length).padStart(4)} → ${String(i.length).padStart(3)}  ${pct(i.length, e.length).padStart(4)}  ${i.length ? r1(avg(i.map((x) => x.case.total))) : '—'}`); }
  const bucket = (label, key, cuts) => { say(`\ninduction rate by ${label}:`); for (const [name, test] of cuts) { const e = eligible.filter((x) => test(key(x))), i = e.filter((x) => x.inducted != null); say(`  ${name.padEnd(10)} ${String(e.length).padStart(4)} eligible → ${String(i.length).padStart(3)} inducted  ${pct(i.length, e.length)}`); } };
  bucket('league awards', (x) => x.awards, [['none', (n) => n === 0], ['1', (n) => n === 1], ['2', (n) => n === 2], ['3 or more', (n) => n >= 3]]);
  bucket('titles', (x) => x.titles, [['none', (n) => n === 0], ['1–2', (n) => n >= 1 && n <= 2], ['3–5', (n) => n >= 3 && n <= 5], ['6 or more', (n) => n >= 6]]);
  bucket('seasons on record', (x) => x.seasons, [['1–4', (n) => n <= 4], ['5–8', (n) => n >= 5 && n <= 8], ['9–12', (n) => n >= 9 && n <= 12], ['13 or more', (n) => n >= 13]]);
  bucket('production among position peers', (x) => x.standing, [['bottom half', (n) => n < 0.5], ['50–75th', (n) => n >= 0.5 && n < 0.75], ['75–90th', (n) => n >= 0.75 && n < 0.9], ['top 10%', (n) => n >= 0.9]]);
  const parts = ['awards', 'records', 'production', 'longevity', 'titles']; say(`\nwhere an inductee's points come from: ${parts.map((p) => `${p} ${pct(inducted.reduce((n, x) => n + x.case[p], 0), inducted.reduce((n, x) => n + x.case.total, 0))}`).join(' · ')}`);
  const weakest = inducted.slice().sort((a, b) => a.case.total - b.case.total).slice(0, SNUBS); say(`\nweakest cases inducted:`); for (const x of weakest) say(`  [${x.save}] ${line(x)} · inducted ${x.inducted}, ${x.votes}/15`);
  const snubs = eligible.filter((x) => x.inducted == null).sort((a, b) => b.case.total - a.case.total); say(`\nbest eligible monsters NOT inducted (${snubs.length} left out in all):`); for (const x of snubs.slice(0, SNUBS * 2)) say(`  [${x.save}] ${line(x)} · eligible since ${x.eligibleFrom}`);
  const strong = snubs.filter((x) => x.awards >= 2 || x.rank === 1 || x.case.total >= HALL_CASE.standardFrom + HALL_CASE.standardSpan); say(`\nhighly accomplished and never inducted (2+ awards, or the most productive at the position, or a case above every Board standard): ${strong.length}`);
  for (const x of strong.slice(0, SNUBS * 2)) say(`  [${x.save}] ${line(x)}`);
  // titles against individual merit: of two eligible careers, does the one with more titles but the weaker individual case get in?
  const indiv = (x) => x.case.awards + x.case.records + x.case.production;
  const withT = new Set(all.flatMap((s, i) => s.rows.filter((x) => x.inducted != null).map((x) => `${i}:${x.id}`))); const noT = new Set(bare.flatMap((s, i) => s.rows.filter((x) => x.inducted != null).map((x) => `${i}:${x.id}`)));
  const onlyWith = [...withT].filter((k) => !noT.has(k)).length, onlyWithout = [...noT].filter((k) => !withT.has(k)).length;
  say(`\ntitles against individual merit: with every title point removed, ${withT.size - onlyWith} of ${withT.size} inductees are still inducted; ${onlyWith} owe their place to titles, and ${onlyWithout} others would take a place instead`);
  say(`inductees with no award, no record and production below the 80th percentile: ${inducted.filter((x) => !x.awards && !x.records && x.standing < 0.8).length}`);
  say(`mean individual points (awards + records + production): inducted ${r1(avg(inducted.map(indiv)))} · eligible, not inducted ${r1(avg(snubs.map(indiv)))}`);
  if (args.json) writeFileSync(String(args.json), JSON.stringify({ rules: { WAIT_SEASONS, MAX_NOMINEES, MAX_INDUCTEES, VOTE_THRESHOLD, HALL_CASE }, franchises: all.map((s) => ({ file: s.file, club: s.club, perYear: s.perYear })), byPos, rows }, null, 1));
}
