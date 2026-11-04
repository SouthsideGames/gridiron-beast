import fs from 'node:fs';
const { pairedDiff } = await import('/home/claude/gridiron-beast/tools/task6/stats.mjs');
const read = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).runs : []);
const glob = (dir, re) => fs.readdirSync(dir).filter((f) => re.test(f)).map((f) => `${dir}/${f}`);
const SRC = {
  v42: (d) => [...glob('/home/claude/t6work/base', new RegExp(`^v42170-drift-${d}-\\d+-\\d+\\.json$`)), ...glob('/home/claude/t6work/m4', new RegExp(`^e8-v42-${d}-\\d+-\\d+\\.json$`)), ...(d === 'pro' ? glob('/home/claude/t6work/m3', /^inv-v42-pro-\d+-\d+\.json$/) : [])],
  pc: (d) => [...glob('/home/claude/t6work/m4', new RegExp(`^pc-drift-${d}-\\d+-\\d+\\.json$`)), ...glob('/home/claude/t6work/m4', new RegExp(`^e8-pc-${d}-\\d+-\\d+\\.json$`))],
  pd: (d) => glob('/home/claude/t6work/m5', new RegExp(`^pd-drift-${d}-\\d+-\\d+\\.json$`)),
};
const r1 = (x) => Math.round(x * 10) / 10;
const win = (run, a, z) => { const rs = run.rows.filter((x) => x.year >= a && x.year <= z); const w = rs.reduce((s, x) => s + x.w, 0), l = rs.reduce((s, x) => s + x.l, 0); return w + l ? 100 * w / (w + l) : null; };
const out = {}; const seeds = [...Array(36)].map((_, i) => i + 1);
for (const d of ['rookie', 'pro', 'allstar']) {
  const runs = Object.fromEntries(Object.entries(SRC).map(([b, f]) => { const m = new Map(); for (const file of f(d)) for (const r of read(file)) if (r.seed <= 36) m.set(r.seed, r); return [b, m]; }));
  const by = (b) => Object.fromEntries(seeds.filter((s) => runs[b].has(s)).map((s) => [s, win(runs[b].get(s), 1, 8)]));
  const dv = pairedDiff(by('v42'), by('pd')); const dc = pairedDiff(by('pc'), by('pd'));
  const verdict = dv.n < 36 ? `incomplete (${dv.n} seeds)` : Math.abs(dv.diff) > 5 ? 'FAIL' : dv.lo >= -5 && dv.hi <= 5 ? 'pass' : 'within ±5, interval crosses the limit (not proof of passing)';
  const seasons = []; for (let y = 1; y <= 8; y++) { const row = { season: y }; for (const b of ['v42', 'pc', 'pd']) { const rs = seeds.filter((s) => runs.v42.has(s) && runs.pd.has(s) && runs[b].has(s)).map((s) => runs[b].get(s).rows.find((x) => x.year === y)).filter(Boolean); const w = rs.reduce((t, x) => t + x.w, 0), l = rs.reduce((t, x) => t + x.l, 0); const mn = (k) => r1(rs.reduce((t, x) => t + (x[k] || 0), 0) / (rs.length || 1)); row[b] = { win: r1(100 * w / (w + l || 1)), mine: mn('mine'), ai: mn('aiEnd'), n: rs.length }; } seasons.push(row); }
  out[d] = { vsV42: { ...dv, diff: r1(dv.diff), lo: r1(dv.lo), hi: r1(dv.hi), verdict }, vsPhaseC: { diff: r1(dc.diff), lo: r1(dc.lo), hi: r1(dc.hi), n: dc.n }, seasons };
  console.log(`${d}: PD vs v42 ${r1(dv.diff)} [${r1(dv.lo)}, ${r1(dv.hi)}] n=${dv.n} ${verdict}; vs PC ${r1(dc.diff)} [${r1(dc.lo)}, ${r1(dc.hi)}]`);
  for (const s of seasons) console.log(`  S${s.season} ` + ['v42', 'pc', 'pd'].map((b) => `${b} ${s[b].win}% (${s[b].mine}/${s[b].ai})`).join(' | '));
}
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
