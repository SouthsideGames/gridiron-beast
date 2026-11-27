#!/usr/bin/env node
// Pairs clash-legendary-options.mjs runs on the same seeds (follow-up brief I-3, analysis only). For each family present in both files,
// reports the paired difference in the focus side's win % with abilities on: (variant run) − (base run), with a paired standard error.
// With base = the shipped run and variant = --variant=X (own ability disabled), the NEGATED difference is the ability's own
// contribution with every other ability still on; with variant = B or C it is that option's consequence.
//   node tools/balance-audit/clash-pair.mjs BASE.json VARIANT.json [VARIANT2.json ...]
import fs from 'node:fs';
const [baseF, ...vs] = process.argv.slice(2);
const base = JSON.parse(fs.readFileSync(baseF, 'utf8'));
for (const vf of vs) {
  const v = JSON.parse(fs.readFileSync(vf, 'utf8'));
  for (const [id, row] of Object.entries(v.families)) {
    const b = base.families[id]; if (!b || !b.bits || !row.bits || b.bits.length !== row.bits.length) continue;
    const d = [...row.bits].map((x, i) => Number(x) - Number(b.bits[i])); const n = d.length; const m = d.reduce((s, x) => s + x, 0) / n;
    const sd = Math.sqrt(d.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, n - 1));
    console.log(JSON.stringify({ family: id, ability: row.ability, variant: v.variant, battles: n, winOnBase: b.winOnPct, winOnVariant: row.winOnPct, diffPts: +(100 * m).toFixed(2), se: +(100 * sd / Math.sqrt(n)).toFixed(2), changedBattles: d.filter((x) => x).length }));
  }
}
