#!/usr/bin/env node
// Task 8 M6, finding M6-01: report-only alternatives for Apex progression. NOTHING here changes production: each alternative is
// applied inside this harness to the award an Apex receives, and the production functions (awards, level XP, natural growth,
// evolution, the offseason, investing) do the rest. The cohort is the benchmark's own: 100 forced Apex per position, the same
// generation seeds as tools/task8-m6-careers.mjs, equal attribute investment, neutral grades, no injuries, age fixed.
//   node tools/task8-m6-apex-alternatives.mjs [--seasons=60] [--out=docs/task8/m6/apex-alternatives.json]
import fs from 'node:fs';
import { createRng, hashString } from '../src/core/rng.js';
import { ATTRIBUTES, POSITIONS, FORMS } from '../src/data/beast-dex.js';
import { generateMonster, syncFromDev } from '../src/data/monsters.js';
import { generateIndividual, invest, addBankedPoints, devProblems } from '../src/franchise/t8/progression.js';
import { applyAward, offseason } from '../src/franchise/progression.js';
import { footballAward, clashAward, OFFSEASON_POINTS, STANDARD_TRAINING_SHARE } from '../src/franchise/t8/awards.js';
import * as F from '../src/core/fraction.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const SEASONS = Number(args.seasons || 60); const OUT = args.out || 'docs/task8/m6/apex-alternatives.json';
const SCHEDULES = { mixed: { football: 9, clash: 4 }, maximum: { football: 12, clash: 33 } }; // the benchmark manifest's two Apex schedules
// Each alternative: activity-training multiplier (Apex only), extra offseason points (Apex only), and the general training share
// (25% in production; 50% is the top of the authorized range and would apply to every monster).
const ALTS = [
  { id: 'current', label: 'Current rules', mult: 1, extra: 0, share: 0.25 },
  { id: 'share-50', label: 'Training share 50% for everyone (top of the authorized range)', mult: 1, extra: 0, share: 0.5, affectsOrdinary: true },
  ...[1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10, 12].map((k) => ({ id: `apex-x${k}`, label: `Apex-only activity training x${k}`, mult: k, extra: 0, share: 0.25 })),
  ...[10, 20, 30, 33, 35, 40].map((n) => ({ id: `apex-off+${n}`, label: `Apex-only offseason points ${OFFSEASON_POINTS} + ${n}`, mult: 1, extra: n, share: 0.25 })),
  ...[[2, 28], [3, 25], [4, 20], [6, 15]].map(([k, n]) => ({ id: `apex-x${k}+off${n}`, label: `Apex-only activity training x${k} and offseason points ${OFFSEASON_POINTS} + ${n}`, mult: k, extra: n, share: 0.25 })),
];
function cohort() {
  const out = [];
  for (const position of POSITIONS) for (let seed = 1; seed <= 100; seed++) {
    const base = generateMonster(createRng(hashString(`m6-cohort|${position}|${seed}`)), { position, quality: 56, age: 21, yearsPro: 0, apexRoll: false, id: `m6-${position}-${seed}` });
    const rng = createRng(hashString(`m6-apex|${position}|${seed}`)); const forms = FORMS.filter((f) => f.position === position && f.stage === 0 && f.rarity !== 'legendary');
    base.dev = generateIndividual(rng, rng.pick(forms).id, { apex: true }); base.species = base.dev.form.split(':')[0]; base.xp = 0; syncFromDev(base); out.push({ position, seed, m: base });
  }
  return out;
}
function evenInvest(m, spent) { // one point at a time to the open attribute with the least lifetime investment (the benchmark's "even" policy)
  const d = m.dev; let guard = 0;
  while (F.cmp(d.bank, F.ZERO) > 0 && guard++ < 20000) {
    const open = ATTRIBUTES.filter((a) => d.current[a] < d.potential[a]); if (!open.length) break;
    const a = open.reduce((best, x) => (spent[x] < spent[best] - 1e-12 ? x : best)); const pts = F.min(d.bank, F.ONE); const r = invest(d, m, a, pts); spent[a] += F.toNumber(pts) - F.toNumber(r.refunded);
  }
  syncFromDev(m);
}
function career(initial, position, schedule, alt) {
  const m = structuredClone(initial), d = m.dev, spent = Object.fromEntries(ATTRIBUTES.map((a) => [a, 0])); const cfg = SCHEDULES[schedule];
  const scale = (award) => { const base = F.toNumber(STANDARD_TRAINING_SHARE); const t = F.toNumber(award.training) - base + alt.share; return { ...award, training: F.frac(Math.round(t * alt.mult * 10000), 10000) }; };
  let all99 = null, hit50 = null, earned = 0; const startGap = ATTRIBUTES.reduce((n, a) => n + 99 - d.current[a], 0); const age0 = m.age;
  for (let year = 1; year <= SEASONS && all99 === null; year++) {
    for (let i = 0; i < cfg.football + cfg.clash; i++) {
      const award = scale(i < cfg.football ? footballAward({ position, liveSnaps: 10, kicks: position === 'K' ? 1 : 0, gradeAdj: 0 }) : clashAward({ gradeAdj: 0 }));
      earned += F.toNumber(award.training); applyAward(m, award, createRng(1), { autoSpend: false, autoEvolve: true }); if (m.level === 50 && hit50 === null) hit50 = year;
    }
    offseason([m], createRng(hashString(`decline|${position}|x|${year}`)), { autoAllocate: false }); earned += OFFSEASON_POINTS;
    if (alt.extra) { addBankedPoints(d, alt.extra); earned += alt.extra; }
    evenInvest(m, spent); if (ATTRIBUTES.every((a) => d.current[a] === 99)) all99 = year;
  }
  if (m.age !== age0) throw new Error('an Apex aged'); const pbs = devProblems(d); if (pbs.length) throw new Error('development record: ' + pbs[0]);
  const sum = (o) => Object.values(o).reduce((n, v) => n + v, 0);
  return { all99, hit50, earned, startGap, natural: sum(d.natural), trained: sum(d.trained), loss: sum(d.loss) };
}
const pct = (sorted, q) => { const v = sorted[Math.ceil(sorted.length * q) - 1]; return Number.isFinite(v) ? v : null; };
const C = cohort(); const results = [];
for (const alt of ALTS) for (const schedule of Object.keys(SCHEDULES)) {
  const rows = C.map(({ position, m }) => career(m, position, schedule, alt)); const t = rows.map((r) => r.all99 ?? Infinity).sort((a, b) => a - b);
  const perSeason = (SCHEDULES[schedule].football + SCHEDULES[schedule].clash) * alt.share * alt.mult + OFFSEASON_POINTS + alt.extra;
  const r = { alt: alt.id, label: alt.label, affectsOrdinary: !!alt.affectsOrdinary, schedule, n: rows.length, pointsPerSeason: Math.round(perSeason * 100) / 100,
    all99By15: rows.filter((x) => x.all99 !== null && x.all99 <= 15).length / rows.length, all99By20: rows.filter((x) => x.all99 !== null && x.all99 <= 20).length / rows.length,
    medianSeason: pct(t, 0.5), season90: pct(t, 0.9), lastSeason: pct(t, 1), neverWithin: rows.filter((x) => x.all99 === null).length, horizon: SEASONS,
    medianLevel50Season: pct(rows.map((x) => x.hit50 ?? Infinity).sort((a, b) => a - b), 0.5),
    meanNatural: rows.reduce((n, x) => n + x.natural, 0) / rows.length, meanTrained: rows.reduce((n, x) => n + x.trained, 0) / rows.length, meanStartGap: rows.reduce((n, x) => n + x.startGap, 0) / rows.length };
  results.push(r); console.error(`${alt.id.padEnd(12)} ${schedule.padEnd(8)} pts/season ${String(r.pointsPerSeason).padStart(7)}  by15 ${(r.all99By15 * 100).toFixed(1).padStart(5)}%  90% by season ${r.season90 ?? `>${SEASONS}`}`);
}
fs.writeFileSync(OUT, JSON.stringify({ source: 'f716b02c41c81211d80e7389dc0cefd4c16ae155', productionChanges: false, scope: 'Report-only alternatives applied inside this harness to the Apex cohort. Controlled careers: neutral grades, full participation in the scheduled activities, no injuries. Natural growth, level XP, evolution, the offseason, ceilings, starting ratings, Temper and age are production code, unchanged.', cohort: '100 forced Apex per position (1,000), generation seeds of tools/task8-m6-careers.mjs, equal attribute investment', schedules: SCHEDULES, target: 'at least 90% all 99s by season 15', results }, null, 1) + '\n');
