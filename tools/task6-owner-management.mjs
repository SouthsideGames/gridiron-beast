import fs from 'node:fs'; const { pairedDiff } = await import('/home/claude/gridiron-beast/tools/task6/stats.mjs');
const load = (re) => { const m = new Map(); for (const f of fs.readdirSync('/home/claude/t6work/m5').filter((f) => re.test(f))) { const j = JSON.parse(fs.readFileSync('/home/claude/t6work/m5/' + f)); for (const r of j.runs) m.set(r.seed, r); } return m; };
const loadDrift = (dir, re) => { const m = new Map(); for (const f of fs.readdirSync(dir).filter((f) => re.test(f))) for (const r of JSON.parse(fs.readFileSync(dir + '/' + f)).runs) m.set(r.seed, r); return m; };
const win = (r, a = 1, z = 8) => { const rs = r.rows.filter((x) => x.year >= a && x.year <= z); const w = rs.reduce((s, x) => s + x.w, 0), l = rs.reduce((s, x) => s + x.l, 0); return 100 * w / (w + l); };
const r1 = (x) => Math.round(x * 10) / 10; const P = (b, c, seeds, a, z) => { const o = (m) => Object.fromEntries(seeds.filter((s) => m.has(s)).map((s) => [s, win(m.get(s), a, z)])); const x = pairedDiff(o(b), o(c)); return `${r1(x.diff)} [${r1(x.lo)}, ${r1(x.hi)}] n=${x.n}`; };
const out = {};
for (const [d, n] of [['rookie', 24], ['pro', 12]]) {
  const seeds = [...Array(n)].map((_, i) => i + 1);
  const manPD = load(new RegExp(`^man-pdtree-${d}-\\d+-\\d+\\.json$`)), manV = load(new RegExp(`^man-v42man-${d}-\\d+-\\d+\\.json$`));
  const hoPD = loadDrift('/home/claude/t6work/m5', new RegExp(`^pd-drift-${d}-\\d+-\\d+\\.json$`));
  const hoV = new Map([...loadDrift('/home/claude/t6work/base', new RegExp(`^v42170-drift-${d}-\\d+-\\d+\\.json$`)), ...loadDrift('/home/claude/t6work/m4', new RegExp(`^e8-v42-${d}-\\d+-\\d+\\.json$`)), ...(d === 'pro' ? loadDrift('/home/claude/t6work/m3', /^inv-v42-pro-\d+-\d+\.json$/) : new Map())]);
  const mean = (m) => r1(seeds.filter((s) => m.has(s)).reduce((t, s) => t + win(m.get(s)), 0) / seeds.filter((s) => m.has(s)).length);
  const bySeason = (m) => [1, 2, 3, 4, 5, 6, 7, 8].map((y) => { const rs = seeds.filter((s) => m.has(s)).map((s) => m.get(s).rows.find((x) => x.year === y)).filter(Boolean); const w = rs.reduce((t, x) => t + x.w, 0), l = rs.reduce((t, x) => t + x.l, 0); return r1(100 * w / (w + l)); });
  const sig = (m) => { let s = 0, rel = 0; return null; };
  out[d] = { seeds: n, handsOff: { v42: mean(hoV), phaseD: mean(hoPD) }, manager: { v42: mean(manV), phaseD: mean(manPD) },
    driftHandsOff: P(hoV, hoPD, seeds), driftManager: P(manV, manPD, seeds), managementGainPhaseD: P(hoPD, manPD, seeds), managementGainV42: P(hoV, manV, seeds),
    managementGainPhaseDSeasons6to8: P(hoPD, manPD, seeds, 6, 8), bySeason: { handsOffV42: bySeason(hoV), handsOffPD: bySeason(hoPD), managerV42: bySeason(manV), managerPD: bySeason(manPD) } };
}
console.log(JSON.stringify(out, null, 1)); fs.writeFileSync('/home/claude/t6work/pd/manager.json', JSON.stringify(out, null, 1));
