#!/usr/bin/env node
// Beast Clash headless balance report. Usage: node tools/clash-balance.mjs [--quick] [--backRow=E] [--duration=F] [--O1] [--O2] [--out=tools/out]
// Writes tools/out/clash-report.{json,md}. Phase 1 engine results on synthetic monsters; no save is read.
import fs from 'node:fs';
import path from 'node:path';
import { runFamily, gateAFamilies, VALUES_VERSION } from '../src/clash/batch.js';
import { CLASH_VALUES, activeExperiments, battleConfig } from '../src/clash/values.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const quick = !!args.quick; const outDir = args.out || 'tools/out';
const config = battleConfig({ backRow: args.backRow, duration: args.duration, O1: !!args.O1, O2: !!args.O2 });
const scale = quick ? 0.2 : 1;
const t0 = Date.now();
const rows = gateAFamilies({ n3: Math.round(2000 * scale), n5: Math.round(1000 * scale), config }).map((f) => { const n = Math.max(20, Math.round(f.n * (quick ? 0.25 : 1))); const r = runFamily({ ...f, n, seed: 4242 }); process.stderr.write(`${f.label}: ${n} battles\n`); return { label: f.label, ...r }; });
const ms = Date.now() - t0;
const report = { values: VALUES_VERSION, engine: CLASH_VALUES.engineVersion, config, experiments: activeExperiments(config), ranAt: null, ms, rows };
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'clash-report.json'), JSON.stringify(report, null, 1));
const pct = (x) => `${x[0]}% (${x[1]}–${x[2]})`;
let md = `# Beast Clash balance report (Phase 1 engine result)\n\nValues ${VALUES_VERSION}, engine ${CLASH_VALUES.engineVersion}. Back row ${config.backRow}, duration ${config.duration}${report.experiments.length ? `, experiments: ${report.experiments.join(', ')}` : ''}. ${ms} ms.\n\n`;
md += `| Family | n | Side A wins | Tank | Balanced | Striker | Support | Disruptor | mean / median / p90 / p95 | capped | KO / HP / coin | bench acts, hits, blocked | forced swaps | heal + shield |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const r of rows) { const A = (k) => (r.archetypes[k] ? pct(r.archetypes[k].rate) : '–'); const L = r.length; const p = r.perBattle;
  md += `| ${r.label} | ${r.family.n} | ${pct(r.aWin)} | ${A('Tank')} | ${A('Balanced')} | ${A('Striker')} | ${A('Support')} | ${A('Disruptor')} | ${L.mean} / ${L.median} / ${L.p90} / ${L.p95} | ${r.capPct}% | ${r.by.knockout} / ${r.by.hp} / ${r.by.coin} | ${p.benchActs}, ${p.benchHits}, ${p.benchBlocked} | ${p.forcedSwaps} | ${p.heal} + ${p.shield} |\n`; }
fs.writeFileSync(path.join(outDir, 'clash-report.md'), md);
console.log(md);
