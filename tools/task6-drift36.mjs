// Owner drift, approved post-Phase C method (owner 2026-11-01): 36 matched seeds, seasons 1-8, hands-off owner, board reset.
// Seeds 1-12 (Rookie, Pro) / 1-24 (All-Star) come from the 20-season runs (seasons 1-8 identical to 8-season runs); the rest from 8-season runs.
import fs from 'node:fs';
const { pairedDiff } = await import('/home/claude/gridiron-beast/tools/task6/stats.mjs');
const read = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).runs : []);
const glob = (dir, re) => fs.readdirSync(dir).filter((f) => re.test(f)).map((f) => `${dir}/${f}`);
const SRC = {
  v42: (d) => [...glob('/home/claude/t6work/base', new RegExp(`^v42170-drift-${d}-\\d+-\\d+\\.json$`)), ...glob('/home/claude/t6work/m4', new RegExp(`^e8-v42-${d}-\\d+-\\d+\\.json$`)), ...(d === 'pro' ? glob('/home/claude/t6work/m3', /^inv-v42-pro-\d+-\d+\.json$/) : [])],
  pb3: (d) => [...glob('/home/claude/t6work/m3', new RegExp(`^pb3-drift-${d}-\\d+-\\d+\\.json$`)), ...(d === 'pro' ? glob('/home/claude/t6work/m3', /^inv-pb3-pro-\d+-\d+\.json$/) : [])],
  pc: (d) => [...glob('/home/claude/t6work/m4', new RegExp(`^pc-drift-${d}-\\d+-\\d+\\.json$`)), ...glob('/home/claude/t6work/m4', new RegExp(`^e8-pc-${d}-\\d+-\\d+\\.json$`))],
};
const r1 = (x) => Math.round(x * 10) / 10;
const win = (run, a, z) => { const rs = run.rows.filter((x) => x.year >= a && x.year <= z); const w = rs.reduce((s, x) => s + x.w, 0), l = rs.reduce((s, x) => s + x.l, 0); return w + l ? 100 * w / (w + l) : null; };
const out = {};
for (const d of ['rookie', 'pro', 'allstar']) {
  const runs = Object.fromEntries(Object.entries(SRC).map(([b, f]) => { const m = new Map(); for (const file of f(d)) for (const r of read(file)) if (r.seed <= 36) m.set(r.seed, r); return [b, m]; }));
  const by = (b, seeds) => Object.fromEntries(seeds.filter((s) => runs[b].has(s)).map((s) => [s, win(runs[b].get(s), 1, 8)]));
  const seeds = [...Array(36)].map((_, i) => i + 1);
  const dv = pairedDiff(by('v42', seeds), by('pc', seeds));
  const verdict = dv.n < 36 ? `incomplete (${dv.n} seeds)` : Math.abs(dv.diff) > 5 ? 'FAIL' : dv.lo >= -5 && dv.hi <= 5 ? 'pass' : 'within ±5, interval crosses the limit (not proof of passing)';
  const vsPb3 = pairedDiff(by('pb3', seeds), by('pc', seeds));
  const seasons = []; for (let y = 1; y <= 8; y++) { const row = { season: y }; for (const b of ['v42', 'pb3', 'pc']) { const rs = seeds.filter((s) => runs.v42.has(s) && runs.pc.has(s) && runs[b].has(s)).flatMap((s) => runs[b].get(s).rows.filter((x) => x.year === y)); if (!rs.length) continue; const w = rs.reduce((s, x) => s + x.w, 0), l = rs.reduce((s, x) => s + x.l, 0); row[b] = { win: r1(100 * w / (w + l)), mine: r1(rs.reduce((s, x) => s + x.mine, 0) / rs.length), ai: r1(rs.reduce((s, x) => s + (x.aiEnd ?? 0), 0) / rs.length), n: rs.length }; } seasons.push(row); }
  out[d] = { vsV42: { ...dv, verdict }, vsPb3, seasons };
  console.log(`${d}: Phase C vs v42.17.0 ${r1(dv.diff)} [${r1(dv.lo)}, ${r1(dv.hi)}] n=${dv.n} → ${verdict}; vs Phase B (pb3) ${r1(vsPb3.diff)} [${r1(vsPb3.lo)}, ${r1(vsPb3.hi)}] n=${vsPb3.n}`);
  for (const s of seasons) console.log(`   S${s.season} ` + ['v42', 'pb3', 'pc'].filter((b) => s[b]).map((b) => `${b} ${s[b].win}% (${s[b].mine}/${s[b].ai})`).join(' | '));
}
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
