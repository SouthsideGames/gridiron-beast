// Task 8 M1 measurement: founding starters' overall under the Dex generator (3 seeds × 16 clubs). Read-only; prints a summary.
//   node tools/t8-starter-calibration.mjs
import * as F from '../src/franchise/franchise.js';
import { monsterOverall, SPECIES_BY_ID } from '../src/data/monsters.js';
import { buildDepthChart } from '../src/franchise/roster.js';
const all = []; const basic = { s: 0, n: 0 }; const lvl = [];
for (const seed of [1, 2, 3]) {
  const f = F.createFranchise({ owner: { first: 'A', last: 'B' }, club: 'Ember City Beasts', seed });
  const clubs = Object.keys(f.league?.clubs || {});
  for (const c of clubs) {
    const roster = f.league.clubs[c].roster.map((id) => f.league.monsters?.[id] || id).filter((m) => m && m.attributes);
    const chart = buildDepthChart(roster, {}, {}); const st = new Set(Object.values(chart));
    for (const m of roster) if (st.has(m.id)) { const o = monsterOverall(m); all.push(o); lvl.push(m.level); basic.n++; if (SPECIES_BY_ID[m.species]?.rarity === 'basic') basic.s++; }
  }
}
all.sort((a, b) => a - b); const q = (p) => all[Math.floor(p * (all.length - 1))];
console.log('starters', all.length, 'mean', (all.reduce((a, b) => a + b, 0) / all.length).toFixed(1), 'p10', q(0.1), 'p50', q(0.5), 'p90', q(0.9), 'min', all[0], 'basic share', (basic.s / basic.n).toFixed(2), 'mean level', (lvl.reduce((a,b)=>a+b,0)/lvl.length).toFixed(1));
{
  const by = {}; const own = [];
  for (const seed of [1, 2, 3]) {
    const f = F.createFranchise({ owner: { first: 'A', last: 'B' }, club: 'Ember City Beasts', seed });
    for (const c of Object.keys(f.league.clubs)) {
      const roster = f.league.clubs[c].roster.map((id) => f.league.monsters[id]).filter(Boolean);
      const st = new Set(Object.values(buildDepthChart(roster, {}, {})));
      for (const m of roster) if (st.has(m.id)) (by[m.position] ||= []).push([monsterOverall(m), m.level, m.age, m.yearsPro]);
    }
    const st = new Set(Object.values(buildDepthChart(f.roster, {}, {})));
    for (const m of f.roster) if (st.has(m.id)) own.push(monsterOverall(m));
  }
  for (const [p, v] of Object.entries(by)) { const o = v.map((x) => x[0]).sort((a, b) => a - b); console.log(p, v.length, 'ovr mean', (o.reduce((a, b) => a + b, 0) / o.length).toFixed(1), 'p10', o[Math.floor(o.length * 0.1)], 'p90', o[Math.floor(o.length * 0.9)], 'lvl', (v.reduce((a, x) => a + x[1], 0) / v.length).toFixed(1), 'yearsPro0 share', (v.filter((x) => x[3] === 0).length / v.length).toFixed(2)); }
  own.sort((a, b) => a - b); console.log('owner starters', own.length, 'mean', (own.reduce((a, b) => a + b, 0) / own.length).toFixed(1), 'p10', own[Math.floor(own.length * 0.1)]);
}
