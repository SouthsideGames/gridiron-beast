import fs from 'node:fs';
for (const [lab, dir, re] of [['pc', 'm4', /^pc-C-1(0[6-9]|1[0-5])-.*json$/], ['pd', 'm5', /^pd-C-1(0[6-9]|1[0-5])-.*json$/], ['m3A', 'm6', /^m3A-C-.*json$/]]) {
  let cs = 0, wk = 0, gymW = 0, gymCS = 0, ordW = 0, ordCS = 0, pers = 0, el = 0; const byPos = {};
  for (const f of fs.readdirSync(dir).filter((f) => re.test(f))) { if (fs.lstatSync(`${dir}/${f}`).isSymbolicLink()) continue; for (const run of JSON.parse(fs.readFileSync(`${dir}/${f}`)).runs) { const gym = (c) => !!run.v4.clubs[c]?.gym; const rows = run.rows.filter((x) => !x.owner && x.seed >= 106 && x.seed <= 115); const by = {}; for (const x of rows) (by[x.club] ||= {})[x.year] = x;
    for (const x of rows) { cs++; wk += x.weakGroups.length; if (gym(x.club)) { gymCS++; gymW += x.weakGroups.length; } else { ordCS++; ordW += x.weakGroups.length; } for (const p of x.weakGroups) byPos[p] = (byPos[p] || 0) + 1; const p = by[x.club][x.year - 1]; if (p) { el++; if (x.weakGroups.some((g) => p.weakGroups.includes(g))) pers++; } } } }
  console.log(lab, { weakPerClubSeason: (wk / cs).toFixed(3), gym: (gymW / gymCS).toFixed(3), ordinary: (ordW / ordCS).toFixed(3), persistentPct: (100 * pers / el).toFixed(1), byPos: Object.fromEntries(Object.entries(byPos).map(([k, v]) => [k, (v / cs).toFixed(3)])) });
}
