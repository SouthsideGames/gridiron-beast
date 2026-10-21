#!/usr/bin/env node
// Beast Clash Gate B balance run. Usage: node tools/clash-gateb.mjs [--quick] [--section=backrow|shock|struct|duration|sudden|swaps|matrix] [--out=tools/out/gateb]
// Runs the Gate B plan (src/clash/batch.js gateBFamilies) on the Phase 1 engine with synthetic monsters, in the same
// 50-battle seeded chunks the Clash Lab uses, and writes gateb.json plus a markdown digest. Nothing in the engine or its
// defaults is changed by this tool; every configuration is an existing Lab switch.
import fs from 'node:fs';
import path from 'node:path';
import { runFamilyChunked, gateBFamilies, VALUES_VERSION } from '../src/clash/batch.js';
import { CLASH_VALUES, activeExperiments, battleConfig } from '../src/clash/values.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const quick = !!args.quick; const outDir = args.out || 'tools/out/gateb'; const only = args.section ? String(args.section).split(',') : null;
const scale = quick ? 0.1 : 1;
const t0 = Date.now(); const rows = [];
const cfgLabel = (c) => { const x = activeExperiments(battleConfig(c)); const pol = c.policies ? ` policies ${c.policies.a}/${c.policies.b}` : ''; return (x.length ? x.join(' + ') : 'baseline') + pol; };
for (const fam of gateBFamilies()) {
  if (only && !only.includes(fam.section)) continue;
  for (const c of fam.configs) {
    const { configs, ...f } = fam; const n = Math.max(50, Math.round(f.n * scale));
    const t = Date.now(); const r = runFamilyChunked({ ...f, n, config: battleConfig(c) });
    rows.push({ section: fam.section, label: fam.label, config: c, configLabel: cfgLabel(c), ...r, ms: Date.now() - t });
    process.stderr.write(`${fam.section} | ${fam.label} | ${cfgLabel(c)} | n=${n} | A wins ${r.aWin[0]}% | ${Date.now() - t} ms\n`);
  }
}
const report = { values: VALUES_VERSION, engine: CLASH_VALUES.engineVersion, quick, ms: Date.now() - t0, battles: rows.reduce((s, r) => s + r.n, 0), rows };
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'gateb.json'), JSON.stringify(report));
const pct = (x) => `${x[0]}% (${x[1]}–${x[2]})`;
let md = `# Beast Clash Gate B run\n\nValues ${VALUES_VERSION}, engine ${CLASH_VALUES.engineVersion}. ${report.battles} battles in ${Math.round(report.ms / 1000)} s.\n\n| Section | Family | Config | n | Side A wins | Tank | Balanced | Striker | Support | Disruptor | mean / med / p90 / p95 | cap | KO / HP | KOs | bench acts / hits | forced | shock att / app / skips | heal + shield |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const r of rows) { const A = (k) => (r.archetypes[k] ? pct(r.archetypes[k].rate) : '–'); const L = r.length, p = r.perBattle;
  md += `| ${r.section} | ${r.label} | ${r.configLabel} | ${r.n} | ${pct(r.aWin)} | ${A('Tank')} | ${A('Balanced')} | ${A('Striker')} | ${A('Support')} | ${A('Disruptor')} | ${L.mean} / ${L.median} / ${L.p90} / ${L.p95} | ${r.capPct}% | ${r.by.knockout} / ${r.by.hp + r.by.coin} | ${p.kos} | ${p.benchActs} / ${p.benchHits} | ${p.forcedSwaps} | ${p.shockAttempts} / ${p.shockApplied} / ${p.shockSkips} | ${p.heal} + ${p.shield} |\n`; }
fs.writeFileSync(path.join(outDir, 'gateb.md'), md);
console.log(`${rows.length} rows, ${report.battles} battles, ${Math.round(report.ms / 1000)} s → ${outDir}/gateb.json`);
