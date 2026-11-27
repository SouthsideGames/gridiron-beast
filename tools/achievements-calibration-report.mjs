#!/usr/bin/env node
// Summarises achievements-calibration.mjs runs: per achievement, the runs that unlocked it, the earliest and median season of first
// unlock, and per rarity the share unlocked and when. Observation only.
//   node tools/achievements-calibration-report.mjs a.json b.json ... [--md=OUT.md] [--json=OUT.json]
import fs from 'node:fs';
const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const opt = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const runs = []; let catalogue = null;
for (const f of files) { const o = JSON.parse(fs.readFileSync(f, 'utf8')); catalogue ||= o.catalogue; for (const r of o.runs) runs.push(r); }
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const rows = catalogue.map((a) => {
  const hits = runs.map((r) => r.unlocked[a.id]).filter(Boolean); const seasons = hits.map((h) => h.season);
  return { ...a, runs: runs.length, unlocked: hits.length, pct: Math.round((100 * hits.length) / runs.length), earliest: seasons.length ? Math.min(...seasons) : null, median: med(seasons), byRun: runs.map((r) => (r.unlocked[a.id] ? r.unlocked[a.id].season : null)) };
});
const RAR = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
const rarity = RAR.map((k) => { const R = rows.filter((r) => r.rarity === k); const all = R.flatMap((r) => r.byRun.filter((x) => x != null));
  return { rarity: k, count: R.length, unlockedShare: R.length ? Math.round((100 * R.reduce((s, r) => s + r.unlocked, 0)) / (R.length * runs.length)) : 0, inSeason1: R.length ? Math.round((100 * R.reduce((s, r) => s + r.byRun.filter((x) => x === 1).length, 0)) / (R.length * runs.length)) : 0, medianSeason: med(all), never: R.filter((r) => !r.unlocked).length }; });
const perSeason = runs.map((r) => { const c = Array(16).fill(0); for (const v of Object.values(r.unlocked)) c[Math.min(15, v.season || 1)]++; return { seed: r.seed, difficulty: r.difficulty, seasons: r.seasons, titles: r.titles, total: Object.keys(r.unlocked).length, bySeason: c.slice(1) }; });
const out = { runs: runs.map((r) => `${r.difficulty}-${r.seed}`), rarity, perSeason, rows };
if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ rarity, perSeason }, null, 1));
