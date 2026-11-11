import fs from 'node:fs';
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function summarize(file) {
  const all = JSON.parse(fs.readFileSync(file, 'utf8')); const g = all.filter((r) => r.finished); const T = (k, rows = g) => rows.reduce((a, x) => a + x[k], 0);
  const m = (rows) => ({ frequency: T('baseSuccess', rows) / (rows.length * 4), success: T('ordinarySuccess', rows) / T('attempts', rows), lost: T('lost', rows) / T('attempts', rows) });
  const r = rng(88041); const B = { frequency: [], success: [], lost: [] };
  for (let b = 0; b < 2000; b++) { const rows = Array.from({ length: g.length }, () => g[Math.floor(r() * g.length)]); const x = m(rows); for (const k in B) B[k].push(x[k]); }
  const ci = (a) => { a.sort((p, q) => p - q); return [a[Math.floor(a.length * 0.025)], a[Math.ceil(a.length * 0.975) - 1]]; };
  return { games: g.length, unfinished: all.length - g.length, totals: Object.fromEntries(['scrimmagePlays', 'attempts', 'ordinarySuccess', 'baseSuccess', 'packageSuccess', 'lost', 'guaranteed', 'abilityKnockdowns', 'abilityAttempts', 'ordinarySheds'].map((k) => [k, T(k)])), reconciled: T('statsPancakes') === T('ordinarySuccess') + T('guaranteed') + T('abilityKnockdowns'), point: m(g), ci95: Object.fromEntries(Object.entries(B).map(([k, a]) => [k, ci(a)])) };
}
if (process.argv[2]) for (const f of process.argv.slice(2)) console.log(f.split('/').pop(), JSON.stringify(summarize(f), (k, v) => typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 10000) / 10000 : v));
