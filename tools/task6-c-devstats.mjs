import fs from 'node:fs';
import { loadRuns, unpack, seedMeasures } from '/home/claude/gridiron-beast/tools/task6-analyze.mjs';
const sets = { v42170: '/home/claude/t6work/base/v42170', pb3: '/home/claude/t6work/m3/pb3', pc: '/home/claude/t6work/m4/pc' };
const B = ['1-10', '11-20', '21-30', '31-40', '41-50', '51-60'];
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null); const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const out = {};
for (const [lab, pre] of Object.entries(sets)) {
  const runs = loadRuns(B.map((r) => `${pre}-B-${r}.json`));
  const g = { slotEligible: [], lowHeadroom: [], starters: [] }; let evo = 0, evoProspects = 0, prospects = 0, potGain = [];
  for (const run of runs) { const U = unpack(run); const S = U.seasons; const traj = new Map();
    for (const s of S) for (const m of s.monsters) { if (m.club === s.ownerClub) continue; if (!traj.has(m.id)) traj.set(m.id, []); traj.get(m.id).push({ y: s.year, ...m }); }
    for (const t of traj.values()) for (let i = 0; i < t.length; i++) { const a = t[i]; if (a.age > 24) continue; const mid = [0, 1, 2].map((k) => t.find((x) => x.y === a.y + k)); const b = t.find((x) => x.y === a.y + 3); if (!b || mid.some((x) => !x)) continue;
      if (mid.every((x) => !x.starter)) ((a.potential ?? 0) >= a.ovr + 3 ? g.slotEligible : g.lowHeadroom).push(b.ovr - a.ovr); else if (mid[1].starter && mid[2].starter) g.starters.push(b.ovr - a.ovr); }
    for (const t of traj.values()) { const a = t[0]; if (a.age > 22) continue; prospects++; const last = t[t.length - 1]; if (a.potential != null && last.potential != null) potGain.push(last.potential - a.potential); }
  }
  const per = runs.map(seedMeasures);
  out[lab] = { reserveSlotEligibleGain3: r2(mean(g.slotEligible)), n: g.slotEligible.length, reserveLowHeadroomGain3: r2(mean(g.lowHeadroom)), starterGain3: r2(mean(g.starters)), prospectPotentialGainOverCareer: r2(mean(potGain)), evolutionsPerClubSeason: r2(mean(per.map((p) => p.evolutionsPerClubSeason))), highPotGain3: r2(mean(per.map((p) => p.highPotentialGain3))), lowPotGain3: r2(mean(per.map((p) => p.lowPotentialGain3))), r1Ovr: r2(mean(per.map((p) => p.r1Ovr))), successionReady: r2(mean(per.map((p) => p.successionReadyPct))) };
}
console.log(JSON.stringify(out, null, 1)); if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
