import fs from 'node:fs';
const files = process.argv.slice(2); const all = []; const meta = [];
for (const f of files) { const j = JSON.parse(fs.readFileSync(f, 'utf8')); meta.push(j.meta); for (const r of j.individuals) all.push(r); }
const NAME = { F: 'football-only (never in a Clash lineup)', M: 'mixed (first 4 Clashes a season)', X: 'maximum (every Clash his club fights)' };
const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const out = { files: files.length, apexSeen: all.length, meta: meta[0], cohorts: {} };
const rookies = all.filter((r) => r.entry <= 5 && (r.seasons[r.entry]?.level ?? 99) <= 5);
out.rookiesEnteringBySeason5 = rookies.length; out.excludedPreDeveloped = all.filter((r) => r.entry <= 5).length - rookies.length;
function row(list) {
  const res = { n: list.length }; if (!list.length) return res;
  const by = (k) => list.filter((r) => r.seasons[r.entry + k]?.all99).length / list.length;
  res.all99By = Object.fromEntries([10, 12, 13, 14, 15].filter((k) => list.every((r) => r.entry + k <= 20)).map((k) => [k, +(100 * by(k)).toFixed(1)]));
  const first = list.map((r) => { for (let k = 1; r.entry + k <= 20; k++) if (r.seasons[r.entry + k]?.all99) return k; return null; });
  res.medianSeasonAll99 = med(first.map((x) => x ?? 99)); if (res.medianSeasonAll99 === 99) res.medianSeasonAll99 = 'not reached';
  const span = (r) => Array.from({ length: 15 }, (_, i) => r.seasons[r.entry + i] || { st: 0, cl: 0 });
  res.startsPerSeason = +mean(list.map((r) => mean(span(r).map((s) => s.st || 0)))).toFixed(1);
  res.clashesPerSeason = +mean(list.map((r) => mean(span(r).map((s) => s.cl || 0)))).toFixed(1);
  res.starterSeasonsOf15 = +mean(list.map((r) => span(r).filter((s) => (s.st || 0) >= 7).length)).toFixed(1);
  res.idleSeasonsOf15 = +mean(list.map((r) => span(r).filter((s) => !(s.st || 0) && !(s.cl || 0)).length)).toFixed(1);
  res.unsignedAtSomeStart = list.filter((r) => span(r).some((s) => s.club === null)).length;
  res.clubs = +mean(list.map((r) => new Set(span(r).map((s) => s.club).filter(Boolean)).size)).toFixed(2);
  res.sumAtSeason15 = { p10: null, median: med(list.map((r) => r.seasons[r.entry + 15]?.sum ?? 0)) };
  const s15 = list.map((r) => r.seasons[r.entry + 15]?.sum ?? 0).sort((a, b) => a - b); res.sumAtSeason15.p10 = s15[Math.floor(s15.length * 0.1)];
  res.medianLevel50Season = med(list.map((r) => { for (let k = 1; r.entry + k <= 20; k++) if ((r.seasons[r.entry + k]?.level || 0) >= 50) return k; return 99; }));
  return res;
}
for (const c of 'FMX') { const list = rookies.filter((r) => r.cohort === c);
  const starters = list.filter((r) => Array.from({ length: 15 }, (_, i) => r.seasons[r.entry + i]?.st || 0).filter((s) => s >= 7).length >= 12);
  const some = list.filter((r) => Array.from({ length: 15 }, (_, i) => r.seasons[r.entry + i]?.st || 0).filter((s) => s >= 7).length >= 6);
  out.cohorts[c] = { name: NAME[c], all: row(list), starterIn12of15: row(starters), starterIn6of15: row(some) }; }
out.overall = row(rookies);
fs.writeFileSync(process.env.OUT || '/dev/stdout', JSON.stringify(out, null, 1));
for (const c of 'FMX') { const x = out.cohorts[c]; console.log(`${c} ${x.name}`); for (const k of ['all', 'starterIn6of15', 'starterIn12of15']) console.log('   ', k, JSON.stringify(x[k])); }
console.log('overall', JSON.stringify(out.overall)); console.log('rookies', out.rookiesEnteringBySeason5, 'excluded pre-developed', out.excludedPreDeveloped, 'apex seen', out.apexSeen);
