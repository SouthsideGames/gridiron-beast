// Pro drift investigation: identical seeds, seasons 1-8, paired by seed.
import fs from 'node:fs';
const { pairedDiff } = await import('/home/claude/gridiron-beast/tools/task6/stats.mjs');
const read = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).runs : []);
const src = {
  v42: ['/home/claude/t6work/base/v42170-drift-pro-1-6.json', '/home/claude/t6work/base/v42170-drift-pro-7-12.json'],
  pb: ['/home/claude/t6work/m1b/pb-drift-pro-1-6.json', '/home/claude/t6work/m1b/pb-drift-pro-7-12.json'],
  pb2: ['/home/claude/t6work/m2/pb2-drift-pro-1-6.json', '/home/claude/t6work/m2/pb2-drift-pro-7-12.json'],
  pb3: ['/home/claude/t6work/m3/pb3-drift-pro-1-6.json', '/home/claude/t6work/m3/pb3-drift-pro-7-12.json'],
};
const runs = {};
for (const [b, files] of Object.entries(src)) { runs[b] = [...files.flatMap(read), ...['13-18', '19-24', '25-30', '31-36'].flatMap((r) => read(`/home/claude/t6work/m3/inv-${b}-pro-${r}.json`))]; }
const win = (run, a, z) => { const rs = run.rows.filter((x) => x.year >= a && x.year <= z); const w = rs.reduce((s, x) => s + x.w, 0), l = rs.reduce((s, x) => s + x.l, 0); return w + l ? 100 * w / (w + l) : null; };
const bySeed = (b, a = 1, z = 8, seeds = null) => Object.fromEntries(runs[b].filter((r) => !seeds || seeds.includes(r.seed)).map((r) => [r.seed, win(r, a, z)]).filter(([, v]) => v != null));
const r1 = (x) => Math.round(x * 10) / 10;
const fmt = (d) => `${r1(d.diff)} [${r1(d.lo)}, ${r1(d.hi)}] n=${d.n} up/down ${d.up}/${d.down}`;
const out = { seeds: Object.fromEntries(Object.entries(runs).map(([b, r]) => [b, r.length])) };
console.log('seeds per build', out.seeds);
const S = (a, b) => [...Array(b - a + 1)].map((_, i) => a + i);
for (const b of ['pb', 'pb2', 'pb3']) { if (!runs[b].length) continue;
  console.log(`\n${b} vs v42.17.0, seasons 1-8:`);
  for (const [lab, seeds] of [['seeds 1-12', S(1, 12)], ['seeds 13-24', S(13, 24)], ['seeds 25-36', S(25, 36)], ['seeds 1-36', S(1, 36)]]) { const d = pairedDiff(bySeed('v42', 1, 8, seeds), bySeed(b, 1, 8, seeds)); if (d.n) console.log(`  ${lab}: ${fmt(d)}  gate ${d.lo > -5 && d.hi < 5 ? 'pass' : Math.abs(d.diff) <= 5 ? 'pass (interval reaches past the band)' : 'FAIL'}`); (out[b] ||= {})[lab] = d; }
}
for (const [x, y] of [['pb', 'pb2'], ['pb2', 'pb3'], ['pb', 'pb3']]) { if (!runs[x].length || !runs[y].length) continue; const d = pairedDiff(bySeed(x), bySeed(y)); console.log(`\n${y} vs ${x} (build against build, seasons 1-8, all common seeds): ${fmt(d)}`); out[`${y}_vs_${x}`] = d; }
console.log('\nseason by season, win % (all common seeds), and owner / AI team overall:');
const common = Object.keys(bySeed('v42')).map(Number).filter((s) => ['pb', 'pb2', 'pb3'].every((b) => !runs[b].length || runs[b].some((r) => r.seed === s)));
const per = {};
for (let y = 1; y <= 8; y++) { const row = [`S${y}`]; for (const b of ['v42', 'pb', 'pb2', 'pb3']) { if (!runs[b].length) continue; const rs = runs[b].filter((r) => common.includes(r.seed)).flatMap((r) => r.rows.filter((x) => x.year === y)); const w = rs.reduce((s, x) => s + x.w, 0), l = rs.reduce((s, x) => s + x.l, 0); const mine = rs.reduce((s, x) => s + x.mine, 0) / rs.length, ai = rs.reduce((s, x) => s + (x.aiEnd ?? 0), 0) / rs.length; row.push(`${b} ${r1(100 * w / (w + l))}% (${r1(mine)}/${r1(ai)})`); (per[b] ||= {})[y] = { win: 100 * w / (w + l), mine, ai }; } console.log('  ' + row.join(' | ')); }
out.seasons = per; out.commonSeeds = common.length;
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
