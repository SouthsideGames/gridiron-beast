#!/usr/bin/env node
// Difficulty and gym study (follow-up brief A-1 / M-2, recording only). Reads ai-franchise-benchmark JSON files and reports, per
// group, at the chosen seasons: AI club overall (mean, gym, ordinary), the gym–ordinary gap, owner win %, titles by gym clubs,
// replenishment quality (overall and potential of drafted, generated and pool arrivals at AI clubs) and development (the rows'
// season-over-season `grew`, and mean overall change of monsters present at an AI club in consecutive snapshots).
//
//   node tools/balance-audit/difficulty-study.mjs --group=rookie:a.json,b.json --group=pro:c.json,d.json [--years=1,5,10,15] [--out=x.json]
import fs from 'node:fs';

const argv = process.argv.slice(2);
const opt = Object.fromEntries(argv.filter((a) => !a.startsWith('--group=')).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const YEARS = (opt.years || '1,5,10,15').split(',').map(Number);
const groups = argv.filter((a) => a.startsWith('--group=')).map((a) => { const [label, files] = a.slice(8).split(':'); return { label, files: files.split(',') }; });
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

function study(files) {
  const by = {}; const titles = { total: 0, gym: 0 }; let ownW = 0, ownG = 0; const ownBlock = {};
  const arr = {}; const devAll = [];
  for (const file of files) {
    const o = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const r of o.runs) {
      const v4 = r.v4 || {}; const gym = (c) => !!v4.clubs?.[c]?.gym; const owner = r.ownerClub;
      for (const x of r.rows) {
        if (x.champion) { titles.total++; if (gym(x.club)) titles.gym++; }
        if (x.club === owner) { const g = x.w + x.l + (x.t || 0); ownW += x.w + (x.t || 0) / 2; ownG += g; const b = `${Math.floor((x.year - 1) / 5) * 5 + 1}-${Math.floor((x.year - 1) / 5) * 5 + 5}`; (ownBlock[b] ||= [0, 0]); ownBlock[b][0] += x.w + (x.t || 0) / 2; ownBlock[b][1] += g; continue; }
        const b = (by[x.year] ||= { all: [], gym: [], ord: [], grew: [] }); b.all.push(x.teamOvr); (gym(x.club) ? b.gym : b.ord).push(x.teamOvr); if (x.grew != null) b.grew.push(x.grew);
      }
      for (const a of r.decisions?.arrivals || []) {
        if (a.club === owner || a.origin === 'traded') continue; const k = a.origin; const e = (arr[k] ||= { n: 0, ovr: [], gymOvr: [], ordOvr: [] });
        e.n++; e.ovr.push(a.ovr); (gym(a.club) ? e.gymOvr : e.ordOvr).push(a.ovr);
      }
      // Monster development: overall change between consecutive season snapshots for monsters at the same AI club.
      const cols = v4.monsterColumns || []; const ci = Object.fromEntries(cols.map((c, i) => [c, i])); let prev = null;
      for (const s of v4.seasons || []) {
        const cur = new Map(); for (const m of s.monsters || []) { if (m[ci.club] && m[ci.club] !== owner) cur.set(m[ci.id], m); }
        if (prev) for (const [id, m] of cur) { const p = prev.get(id); if (p && p[ci.club] === m[ci.club]) devAll.push({ d: m[ci.ovr] - p[ci.ovr], age: p[ci.age], gym: gym(m[ci.club]) }); }
        prev = cur;
      }
    }
  }
  const dev = (f) => r1(mean(devAll.filter(f).map((x) => x.d)));
  return {
    byYear: Object.fromEntries(YEARS.filter((y) => by[y]).map((y) => [y, { ai: r1(mean(by[y].all)), gym: r1(mean(by[y].gym)), ord: r1(mean(by[y].ord)), gap: r1(mean(by[y].gym) - mean(by[y].ord)), grew: r1(mean(by[y].grew)) }])),
    ownerWinPct: r1((ownW / Math.max(1, ownG)) * 100), ownerByBlock: Object.fromEntries(Object.entries(ownBlock).map(([k, [w, g]]) => [k, r1((w / g) * 100)])),
    titles: { ...titles, gymShare: r1((titles.gym / Math.max(1, titles.total)) * 100) },
    replenishment: Object.fromEntries(Object.entries(arr).map(([k, e]) => [k, { n: e.n, ovr: r1(mean(e.ovr)), gym: r1(mean(e.gymOvr)), ord: r1(mean(e.ordOvr)) }])),
    development: { all: dev(() => true), age19to23: dev((x) => x.age <= 23), age24to27: dev((x) => x.age >= 24 && x.age <= 27), age28plus: dev((x) => x.age >= 28), gym: dev((x) => x.gym), ord: dev((x) => !x.gym) },
  };
}
const out = { groups: groups.map((g) => ({ label: g.label, files: g.files, ...study(g.files) })) };
if (opt.out) fs.writeFileSync(opt.out, JSON.stringify(out, null, 1));
for (const g of out.groups) { console.log(`\n== ${g.label}`); for (const k of ['byYear', 'ownerWinPct', 'ownerByBlock', 'titles', 'replenishment', 'development']) console.log(`${k.padEnd(14)} ${JSON.stringify(g[k])}`); }
