// Task 6 A-1: breakdown of AI monster-seasons aged 33+ whose overall rose (owner decision 2026-10-31, item 4). Reads harness-v4 files.
import { loadRuns, unpack } from './task6-analyze.mjs';
import { trueOnset, technicalOffset, PHYSICAL } from '../src/data/aging.js';
const runs = loadRuns(process.argv.slice(2));
const cats = { kicker: 0, evolution: 0, beforeOnset: 0, techCompensation: 0, physGainPastOnset: 0, noDeclineApplied: 0 }; let n33 = 0, up = 0; const ex = [];
for (const r of runs) { const U = unpack(r); const S = U.seasons; const tech = U.attrKeys.filter((k) => !PHYSICAL.includes(k));
  for (let i = 1; i < S.length; i++) { const prev = new Map(S[i - 1].monsters.map((m) => [m.id, m]));
    for (const m of S[i].monsters) { const p = prev.get(m.id); if (!p || m.ageless || m.club === S[i].ownerClub || m.age < 33) continue; n33++;
      if (!(m.ovr > p.ovr)) continue; up++;
      const mm = { id: m.id, position: m.pos, age: m.age, attributes: { durability: m.attr.durability } }; const on = trueOnset(mm); const y = m.age - on;
      const dPhys = PHYSICAL.reduce((s, k) => s + (m.attr[k] - p.attr[k]), 0); const dTech = tech.reduce((s, k) => s + (m.attr[k] - p.attr[k]), 0);
      const anyPhysLoss = PHYSICAL.some((k) => m.attr[k] < p.attr[k]);
      let c;
      if (m.stage > p.stage) c = 'evolution';
      else if (m.pos === 'K') c = 'kicker';
      else if (y <= 0) c = 'beforeOnset';
      else if (!anyPhysLoss && p.attr.speed > 20) c = 'noDeclineApplied';
      else if (dPhys > 0) c = 'physGainPastOnset';
      else c = 'techCompensation';
      cats[c]++; if ((c === 'noDeclineApplied' || c === 'physGainPastOnset') && ex.length < 6) ex.push({ c, pos: m.pos, age: m.age, y, ovr: `${p.ovr}->${m.ovr}`, dPhys, dTech, lvl: `${p.level}->${m.level}` });
    } } }
const pct = (x) => (100 * x / n33).toFixed(2);
console.log(JSON.stringify({ files: process.argv.length - 2, monsterSeasons33: n33, improved: up, improvedPct: pct(up), byCategoryPctOfAll33: Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, `${pct(v)}% (${v})`])), examples: ex }, null, 1));
