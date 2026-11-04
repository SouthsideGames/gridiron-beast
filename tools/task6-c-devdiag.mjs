#!/usr/bin/env node
// Task 6 Phase C closeout (owner 2026-11-02): why slot-eligible young reserves gain +2.6 rather than +3 in three seasons (planning tool).
// Needs a scratch tree where aiAfterGame calls globalThis.__dev(club, slots, played, xpScale, practiceEvents, roster) (one line, no draws).
//   node tools/task6-c-devdiag.mjs --root=TREE --seeds=1-6 --seasons=10 --json=out.json
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const ROOT = path.resolve(args.root);
const { runFranchise, invariants } = await import(path.join(ROOT, 'tools/franchise-soak.mjs'));
const { withBoardReset } = await import(path.join(ROOT, 'tools/league-soak.mjs'));
const { monsterOverall } = await import(path.join(ROOT, 'src/data/monsters.js'));
const { devIneligibility, DEV } = await import(path.join(ROOT, 'src/franchise/development.js'));
const [s0, s1] = String(args.seeds || '1-6').split('-').map(Number); const seasons = Number(args.seasons || 10);
const A = { clubGames: 0, eligible: 0, slotsFilled: 0, capacityShort: 0, scaled: 0, practiceRows: 0, practiceXp: 0, levelUps: 0, ovrPerLevel: [], injuredSkips: 0 };
const perMonster = new Map(); // id|year -> { slotted, games }
let year = 1;
globalThis.__dev = (club, slots, played, xpScale, pe, roster) => {
  A.clubGames++; const elig = roster.filter((m) => !devIneligibility(m, played)); A.eligible += elig.length; A.slotsFilled += slots.ids.length; if (elig.length > DEV.slots) A.capacityShort += elig.length - slots.ids.length;
  if (xpScale < 1) A.scaled++;
  for (const m of elig) { const k = `${m.id}|${year}`; const x = perMonster.get(k) || { slotted: 0, games: 0 }; x.games++; if (slots.ids.includes(m.id)) x.slotted++; perMonster.set(k, x); }
  for (const e of pe) { if (e.kind === 'practice') { A.practiceRows++; A.practiceXp += e.amount; } if (e.kind === 'levelup') { A.levelUps++; A.ovrPerLevel.push(e.to - e.from); } }
};
const snaps = [];
for (let seed = s0; seed <= s1; seed++) {
  const traj = new Map();
  runFranchise(seed, { seasons, check: withBoardReset(invariants), onSeason: (f) => { year = f.season.year + 1;
    for (const c of Object.keys(f.league?.clubs || {})) for (const id of f.league.clubs[c].roster || []) { const m = f.league.monsters[id]; if (!m) continue; if (!traj.has(m.id)) traj.set(m.id, []); traj.get(m.id).push({ y: f.season.year, age: m.age, ovr: monsterOverall(m), pot: m.potential, level: m.level }); } } });
  snaps.push(traj);
}
// 3-season gains of slot-eligible young reserves by the share of their games spent in a slot
const bands = { none: [], some: [], most: [] }; const levels = { none: [], some: [], most: [] };
for (const traj of snaps) for (const [id, t] of traj) for (let i = 0; i < t.length; i++) { const a = t[i]; if (a.age > 24 || (a.pot ?? 0) < a.ovr + 3) continue; const b = t.find((x) => x.y === a.y + 3); if (!b) continue;
  let sl = 0, g = 0; for (let k = 1; k <= 3; k++) { const x = perMonster.get(`${id}|${a.y + k}`); if (x) { sl += x.slotted; g += x.games; } }
  if (!g) continue; const share = sl / g; const band = share === 0 ? 'none' : share < 0.6 ? 'some' : 'most'; bands[band].push(b.ovr - a.ovr); levels[band].push(b.level - a.level); }
const mean = (a) => (a.length ? Math.round(100 * a.reduce((s, x) => s + x, 0) / a.length) / 100 : null);
const out = { seeds: [s0, s1], seasons, clubGames: A.clubGames, eligiblePerClubGame: mean([A.eligible / A.clubGames]), slotsFilledPerClubGame: mean([A.slotsFilled / A.clubGames]),
  eligibleWithoutSlotPerClubGame: mean([(A.eligible - A.slotsFilled) / A.clubGames]), slowedClubGamesPct: mean([100 * A.scaled / A.clubGames]),
  practiceXpPerRow: mean([A.practiceXp / A.practiceRows]), practiceLevelUps: A.levelUps, ovrPerPracticeLevel: mean(A.ovrPerLevel),
  gain3BySlotShare: Object.fromEntries(Object.entries(bands).map(([k, v]) => [k, { n: v.length, ovr: mean(v), levels: mean(levels[k]) }])) };
console.log(JSON.stringify(out, null, 1)); if (args.json) fs.writeFileSync(args.json, JSON.stringify(out, null, 1));
