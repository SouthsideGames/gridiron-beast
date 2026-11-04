// Draft picks and re-signings by the picking club's strategy mode (mode in force: set at the end of the previous season).
import fs from 'node:fs';
const files = process.argv.slice(2); const D = {}; const C = {}; const U = {}; let seasons = 0;
for (const f of files) for (const run of JSON.parse(fs.readFileSync(f, 'utf8')).runs) {
  const S = run.v4.seasons; seasons += S.length; const modeAt = (y, club) => S.find((s) => s.year === y - 1)?.strategy?.[club]?.mode || 'compete';
  for (const p of run.decisions.draft || []) { if (p.year < 2 || p.club === run.ownerClub) continue; const m = modeAt(p.year, p.club); const x = (D[m] ||= { n: 0, ovr: 0, pot: 0, upside: 0, start: 0, vsBest: 0 }); x.n++; x.ovr += p.ovr; x.pot += p.pot; x.upside += p.pot - p.ovr; x.start += p.wouldStart ? 1 : 0; x.vsBest += p.bestAvailOvr - p.ovr; }
  for (const s of S) { for (const [k, v] of Object.entries(s.modeContracts || {})) C[k] = (C[k] || 0) + v; for (const [k, v] of Object.entries(s.modeUpgrades || {})) U[k] = (U[k] || 0) + v; }
}
const r = (x) => Math.round(x * 100) / 100;
console.log(JSON.stringify({ draft: Object.fromEntries(Object.entries(D).map(([k, x]) => [k, { picks: x.n, ovr: r(x.ovr / x.n), pot: r(x.pot / x.n), upside: r(x.upside / x.n), wouldStartPct: r(100 * x.start / x.n), belowBestAvailOvr: r(x.vsBest / x.n) }])), resignedPerSeason: Object.fromEntries(Object.entries(C).map(([k, v]) => [k, r(v / seasons)])), upgradesPerSeason: Object.fromEntries(Object.entries(U).map(([k, v]) => [k, r(v / seasons)])) }, null, 1));
