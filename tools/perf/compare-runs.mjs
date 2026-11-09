#!/usr/bin/env node
// Independent runs side by side (docs/task8/PERF_SCENES.md section 3.1: the process-instance effect).
//   node tools/perf/compare-runs.mjs run1.json run2.json run3.json ...   (JSONs of the corrected run-scenes.mjs)
// Every scene and every figure individually, one column per run (never averaged). A figure is CONSISTENT only when every run labels
// it GOOD and every run puts it on the same side of its limit; otherwise PROVISIONAL, with the reason. The runs' per-round intervals
// do not contain the variation between process instances (two fresh workers of the same build can differ by 15-30% on this VM), so
// a verdict needs agreement between independent runs.
import fs from 'node:fs';

const files = process.argv.slice(2).filter((a) => !a.startsWith('--')); if (files.length < 1) { console.error('usage: compare-runs.mjs a.json b.json ...'); process.exit(2); }
const runs = files.map((f) => ({ f, j: JSON.parse(fs.readFileSync(f, 'utf8')) }));
const old = runs.filter((r) => !r.j.summary?.quietRule); if (old.length) { console.error(`not a corrected run-scenes JSON (no quiet rule): ${old.map((r) => r.f).join(', ')}`); process.exit(2); }
const fx = (v, d = 3) => (v == null || !Number.isFinite(v) ? '-' : v.toFixed(d));
const scenes = [...new Set(runs.flatMap((r) => r.j.results.map((x) => x.scene)))];
const rows = [];
for (const sc of scenes) for (const fig of ['R0', 'R1']) {
  const cells = runs.map((r) => r.j.results.find((x) => x.scene === sc)?.[fig] || null);
  if (cells.every((c) => !c)) continue;
  const have = cells.filter(Boolean); const limit = have[0].limit;
  const sides = new Set(have.map((c) => c.pass)); const good = have.every((c) => c.quality?.label === 'GOOD');
  const reasons = [];
  if (have.length < runs.length) reasons.push(`missing in ${runs.length - have.length} run(s)`);
  if (sides.size > 1) reasons.push(`runs disagree about the limit ${limit}`);
  if (!good) reasons.push('not GOOD in every run');
  rows.push({ scene: sc, figure: fig, limit, values: cells.map((c) => (c ? `${fx(c.ratio)} [${fx(c.ci95?.[0])}-${fx(c.ci95?.[1])}] ${c.quality?.label?.[0] || '?'}` : '-')),
    min: Math.min(...have.map((c) => c.ratio)), max: Math.max(...have.map((c) => c.ratio)), verdict: sides.size === 1 ? (have[0].pass ? 'within' : 'over') : 'split', label: reasons.length ? 'PROVISIONAL' : 'CONSISTENT', reasons });
}
console.log(`runs: ${runs.map((r, i) => `#${i + 1} ${r.j.label || r.f} (${r.j.summary.status.split(';')[0]})`).join(' | ')}`);
for (const r of rows) console.log(`${r.scene.padEnd(24)} ${r.figure} (limit ${r.limit})  ${r.values.join('  |  ')}  range ${fx(r.min)}-${fx(r.max)}  ${r.verdict}  ${r.label}${r.reasons.length ? ` [${r.reasons.join('; ')}]` : ''}`);
if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 1));
