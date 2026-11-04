#!/usr/bin/env node
// Task 6 planning: summary of tools/task6-diagnostics.mjs outputs (per-monster ageing, draftees, reserves, starter ages, protected monsters). Read only.
//   node tools/task6-diagnostics-report.mjs d106.json d107.json
import fs from 'node:fs'; const mean = (a) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null; const r1 = (x) => x == null ? null : Math.round(x * 100) / 100;
const D = process.argv.slice(2).map((f) => JSON.parse(fs.readFileSync(f)));
const band = (a) => a <= 22 ? '≤22' : a <= 25 ? '23-25' : a <= 29 ? '26-29' : a <= 32 ? '30-32' : a <= 35 ? '33-35' : '36+';
const dv = {}, dvPos = {}, lvl = {}; const oldRepl = { n: 0, stillStart: 0, gone: 0, benched: 0 }; let nOld = 0;
const draftees = [];
for (const d of D) {
  for (let i = 0; i + 1 < d.snaps.length; i++) {
    const a = d.snaps[i], b = d.snaps[i + 1]; const nextById = {}; for (const [c, cl] of Object.entries(b.clubs)) for (const m of cl.monsters) nextById[m.id] = { ...m, club: c };
    for (const [c, cl] of Object.entries(a.clubs)) for (const m of cl.monsters) { if (m.prot) continue; const n = nextById[m.id];
      if (m.st && m.age >= 33) { oldRepl.n++; if (!n) oldRepl.gone++; else if (n.st) oldRepl.stillStart++; else oldRepl.benched++; }
      if (!n) continue; const k = `${band(m.age)}|${m.st ? 'starter' : 'reserve'}`; (dv[k] ||= []).push(n.ovr - m.ovr); (lvl[k] ||= []).push(n.lvl - m.lvl);
      if (m.age >= 30) (dvPos[m.pos] ||= []).push(n.ovr - m.ovr); }
  }
  // draftees: first season seen on drafting club, track to the end
  const seen = {}; d.snaps.forEach((s) => { for (const [c, cl] of Object.entries(s.clubs)) for (const m of cl.monsters) if (m.drafted != null && m.drafted === m.drafted) { (seen[m.id] ||= { round: m.round, dy: m.drafted, club: c, path: [] }).path.push({ y: s.year, club: c, ovr: m.ovr, st: m.st, age: m.age }); } });
  for (const x of Object.values(seen)) draftees.push(x);
}
console.log('Δoverall per season (same monster, next season end), by age band and role: mean [n]; level gain');
for (const k of Object.keys(dv).sort()) console.log(' ', k.padEnd(16), r1(mean(dv[k])), `[${dv[k].length}]`, 'lvl', r1(mean(lvl[k])));
console.log('Δoverall per season for monsters 30+ by position:', Object.entries(dvPos).map(([p, v]) => `${p} ${r1(mean(v))}`).join(' · '));
console.log('starters aged 33+ at a season end, next season: still starting', oldRepl.stillStart, 'benched', oldRepl.benched, 'gone', oldRepl.gone, 'of', oldRepl.n);
const r1d = draftees.filter((x) => x.round === 1); const startedBy = (h) => r1d.filter((x) => x.path.some((p) => p.club === x.club && p.st && p.y - x.dy <= h)).length;
console.log('round-1 draftees', r1d.length, 'started for drafter within 1/2/3/5 seasons:', [1, 2, 3, 5].map((h) => Math.round(100 * startedBy(h) / r1d.length) + '%').join(' '));
const early = r1d.filter((x) => x.dy <= 5), late = r1d.filter((x) => x.dy >= 12); const sb = (l, h) => Math.round(100 * l.filter((x) => x.path.some((p) => p.club === x.club && p.st && p.y - x.dy <= h)).length / Math.max(1, l.length));
console.log('  drafted years 1-5:', early.length, 'start within 2:', sb(early, 2) + '%', '| years 12+:', late.length, 'start within 2:', sb(late, 2) + '%');
// reserve growth: young reserves (≤24) overall gain over the next 3 seasons if they stay reserves
let g3 = []; for (const d of D) { const by = {}; d.snaps.forEach((s) => { for (const [c, cl] of Object.entries(s.clubs)) for (const m of cl.monsters) (by[m.id] ||= []).push({ y: s.year, ovr: m.ovr, st: m.st, age: m.age, prot: m.prot }); });
  for (const l of Object.values(by)) for (let i = 0; i + 3 < l.length; i++) { const a = l[i], b = l[i + 3]; if (b.y - a.y !== 3 || a.age > 24 || a.prot) continue; if (l.slice(i, i + 4).every((x) => !x.st)) g3.push(b.ovr - a.ovr); } }
console.log('young reserves (≤24) who stay reserves 3 seasons: overall gain', r1(mean(g3)), `[${g3.length}]`);
// starter age by season, and share of starters 33+
for (const y of [1, 5, 10, 15, 20]) { const ms = D.flatMap((d) => Object.values(d.snaps.find((s) => s.year === y).clubs).flatMap((c) => c.monsters.filter((m) => m.st && !m.prot))); console.log(' season', y, 'starter age', r1(mean(ms.map((m) => m.age))), '33+ share', Math.round(100 * ms.filter((m) => m.age >= 33).length / ms.length) + '%', 'max age', Math.max(...ms.map((m) => m.age))); }
// gym legendaries
const leg = D.flatMap((d) => Object.entries(d.snaps[d.snaps.length - 1].clubs).flatMap(([c, cl]) => cl.monsters.filter((m) => m.prot).map((m) => ({ c, gym: cl.gym, ovr: m.ovr, pos: m.pos, st: m.st }))));
console.log('protected monsters at season 20:', leg.length, 'on gyms', leg.filter((x) => x.gym).length, 'mean ovr', r1(mean(leg.map((x) => x.ovr))), 'starting', leg.filter((x) => x.st).length);
