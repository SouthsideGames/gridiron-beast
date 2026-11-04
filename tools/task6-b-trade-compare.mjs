// Trading behaviour before and after the both-ways band fix: harness-v4 decision logs, same seeds.
import fs from 'node:fs';
const sets = process.argv.slice(2); // label=prefix
const sum = {};
for (const s of sets) { const [lab, pre] = s.split('=');
  const files = ['B-1-10', 'B-11-20', 'B-21-30', 'B-31-40', 'B-41-50', 'B-51-60', 'C-106-108', 'C-109-110', 'C-111-115'].map((x) => `${pre}-${x}.json`).filter((f) => fs.existsSync(f));
  let seasons = 0, t = [], seeds = 0;
  for (const f of files) for (const r of JSON.parse(fs.readFileSync(f, 'utf8')).runs) { seeds++; seasons += r.seasons; t.push(...(r.decisions.trades || [])); }
  const both = t.filter((x) => x.mvRatio != null); const out = (x) => x.mvRatio < 0.85 || x.mvRatio > 1.15 || 1 / x.mvRatio < 0.85 || 1 / x.mvRatio > 1.15;
  const k = {}; for (const x of t) k[x.kind] = (k[x.kind] || 0) + 1;
  sum[lab] = { seeds, seasons, trades: t.length, perSeason: +(t.length / seasons).toFixed(3), inSeasonShare: +(100 * t.filter((x) => x.inSeason).length / t.length).toFixed(1), kinds: k,
    mvRatioMin: Math.min(...both.map((x) => x.mvRatio)), mvRatioMax: Math.max(...both.map((x) => x.mvRatio)), outsideBothWays: both.filter(out).length, youngPaymentPct: +(100 * t.filter((x) => x.toBAge != null && x.toBAge <= 24).length / t.filter((x) => x.toBAge != null).length).toFixed(1), starterGainShare: +(100 * t.filter((x) => x.toAStarter).length / t.length).toFixed(1) };
}
console.log(JSON.stringify(sum, null, 1));
