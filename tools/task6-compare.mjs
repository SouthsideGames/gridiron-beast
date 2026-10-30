#!/usr/bin/env node
// Task 6 Phase 0: the phase comparison report (docs/TASK6_PHASE0_METHODOLOGY.md §4, §6). Planning tool; reads harness-v4 JSON only.
//
// For every pre-registered measure (docs/task6-phase0/thresholds.json) on the seed set it is judged on, reports the baseline and the
// candidate, the matched-seed difference with its 95% bootstrap interval and effect size, the held-out set's direction, whether the
// candidate is inside its target band, and the outcome class: supported improvement / worse / inconclusive (and the hard gates as
// functional pass or fail). Without --cand it reports the baseline alone (the Phase 0 baseline tables).
//
//   node tools/task6-compare.mjs --base=DIR:LABEL [--cand=DIR:LABEL] [--thresholds=docs/task6-phase0/thresholds.json] [--json=out.json] [--md=out.md]
// Files: <DIR>/<LABEL>-B-<seeds>.json (B = 1–60, H = 61–80) and <LABEL>-C-<seeds>.json (C = 106–115, CH = 116–125).
import fs from 'node:fs';
import path from 'node:path';
import { seedMeasures, pooled } from './task6-analyze.mjs';
import { pairedDiff, classify, inBand } from './task6/stats.mjs';

const SETS = { B: [1, 60, 'B'], H: [61, 80, 'B'], C: [106, 115, 'C'], CH: [116, 125, 'C'] };
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const parse = (s) => { const i = s.lastIndexOf(':'); return { dir: s.slice(0, i), label: s.slice(i + 1) }; };
/** Runs of one seed set: every <label>-<stage>-<a>-<b>.json whose seeds fall in the set (repeat files excluded). */
export function loadSet({ dir, label }, set) {
  const [lo, hi, stage] = SETS[set]; const re = new RegExp(`^${label}-${stage}-(\\d+)-(\\d+)\\.json$`); const runs = [];
  for (const f of fs.readdirSync(dir).sort()) { const m = f.match(re); if (!m || +m[1] < lo || +m[2] > hi) continue; const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); if (j.harnessV < 4) throw new Error(`${f} is harness v${j.harnessV}`); runs.push(...j.runs); }
  return runs;
}
const get = (o, k) => k.split('.').reduce((x, p) => (x == null ? null : x[p]), o);
const bySeed = (per, k) => Object.fromEntries(per.filter((p) => p).map((p) => [p.seed, get(p, k)]).filter(([, v]) => typeof v === 'number'));
const avg = (o) => { const v = Object.values(o); return v.length ? r2(v.reduce((s, x) => s + x, 0) / v.length) : null; };

export function report(baseSets, candSets, thresholds) {
  const per = (runs) => runs.map((r) => { const m = seedMeasures(r); return m ? { seed: r.seed, ...m } : null; });
  const B = Object.fromEntries(Object.entries(baseSets).map(([k, v]) => [k, per(v)])); const C = candSets ? Object.fromEntries(Object.entries(candSets).map(([k, v]) => [k, per(v)])) : null;
  const rows = [];
  for (const [k, t] of Object.entries(thresholds.measures)) {
    if (k.startsWith('pooled.') || !SETS[t.sample]) continue; const held = t.sample === 'B' ? 'H' : t.sample === 'C' ? 'CH' : null;
    const b = bySeed(B[t.sample] || [], k); const row = { measure: k, class: t.class, phase: t.phase, sample: t.sample, band: t.band || null, better: t.better ?? null, base: avg(b), baseSeeds: Object.keys(b).length, baseInBand: inBand(avg(b), t.band), baseHeldOut: held ? avg(bySeed(B[held] || [], k)) : null };
    if (C) { const c = bySeed(C[t.sample] || [], k); const dev = pairedDiff(b, c); const ho = held ? pairedDiff(bySeed(B[held] || [], k), bySeed(C[held] || [], k)) : null;
      Object.assign(row, { cand: avg(c), candInBand: inBand(avg(c), t.band), dev, heldOut: ho, heldOutAgrees: ho && ho.n && dev.n ? Math.sign(ho.diff) === Math.sign(dev.diff) : null, outcome: dev.n ? classify(dev, ho, t.better) : 'no data' }); }
    rows.push(row);
  }
  const problems = (sets) => Object.values(sets).flat().reduce((s, r) => s + (r.problemCount || 0) + (r.error ? 1 : 0), 0);
  const gates = { baseIntegrityProblems: problems(baseSets), candIntegrityProblems: candSets ? problems(candSets) : null };
  gates.integrity = candSets ? (gates.candIntegrityProblems === 0 ? 'functional pass' : 'functional FAIL') : (gates.baseIntegrityProblems === 0 ? 'baseline clean' : 'baseline has problems');
  const pool = { base: Object.fromEntries(Object.entries(baseSets).map(([k, v]) => [k, pooled(v)])), cand: candSets ? Object.fromEntries(Object.entries(candSets).map(([k, v]) => [k, pooled(v)])) : null };
  return { seeds: Object.fromEntries(Object.entries(baseSets).map(([k, v]) => [k, v.map((r) => r.seed)])), gates, rows, pooled: pool };
}

export function toMarkdown(rep) {
  const L = ['| Measure | Class | Phase | Set | Band | Baseline | Held-out baseline' + (rep.rows[0]?.cand !== undefined ? ' | Candidate | Difference [95% interval] | Held-out agrees | In band | Outcome |' : ' | Baseline in band |'), '|' + '---|'.repeat(rep.rows[0]?.cand !== undefined ? 12 : 8)];
  const band = (b) => (!b ? '—' : b.min != null && b.max != null ? `${b.min}–${b.max}` : b.min != null ? `≥ ${b.min}` : `≤ ${b.max}`);
  for (const r of rep.rows) L.push(`| ${r.measure} | ${r.class} | ${r.phase || ''} | ${r.sample} | ${band(r.band)} | ${r.base ?? '—'} | ${r.baseHeldOut ?? '—'}` + (r.cand !== undefined ? ` | ${r.cand ?? '—'} | ${r.dev?.n ? `${r.dev.diff} [${r.dev.lo}, ${r.dev.hi}]` : '—'} | ${r.heldOutAgrees == null ? '—' : r.heldOutAgrees ? 'yes' : 'no'} | ${r.candInBand == null ? '—' : r.candInBand ? 'yes' : 'no'} | ${r.outcome} |` : ` | ${r.baseInBand == null ? '—' : r.baseInBand ? 'yes' : 'no'} |`));
  return L.join('\n') + '\n';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || '1']; }));
  const th = JSON.parse(fs.readFileSync(args.thresholds || path.join(path.dirname(new URL(import.meta.url).pathname), '../docs/task6-phase0/thresholds.json'), 'utf8'));
  const sets = (spec) => Object.fromEntries(Object.keys(SETS).map((s) => [s, loadSet(parse(spec), s)]).filter(([, v]) => v.length));
  const rep = report(sets(args.base), args.cand ? sets(args.cand) : null, th);
  if (args.json) fs.writeFileSync(args.json, JSON.stringify(rep, null, 1));
  if (args.md) fs.writeFileSync(args.md, toMarkdown(rep));
  console.log(toMarkdown(rep));
}
