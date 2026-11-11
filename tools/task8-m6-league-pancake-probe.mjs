// Preload (node --import): read-only pancake recorder for every football game the process plays. Same definitions as
// tools/task8-m6-pancakes.mjs (ordinary pancakes only; Dragon Stomp attempts and knockdowns, and guaranteed pancakes, kept apart).
import fs from 'node:fs';
const rows = new Map(); const OL = ['LG', 'RG', 'C'];
globalThis.__m6Probe = (ev, state, teams) => {
  let row = rows.get(state); if (!row) { row = { home: teams.home.name, away: teams.away.name, scrimmagePlays: 0, attempts: 0, ordinarySuccess: 0, guaranteed: 0, abilityKnockdowns: 0, abilityAttempts: 0, lost: 0, ordinarySheds: 0, baseSuccess: 0, baseAttempts: 0, packageSuccess: 0, statsPancakes: 0, statsAttempts: 0, finished: false }; rows.set(state, row); }
  if (state.finished) row.finished = true;
  if (!ev?.sim || !['play', 'try'].includes(ev.kind)) return; const sim = ev.sim; row.scrimmagePlays++;
  for (const slot of OL) { const b = sim.stats?.blockers?.[slot]; row.attempts += b?.pancakeAttempts || 0; row.statsAttempts += b?.pancakeAttempts || 0; row.statsPancakes += b?.pancakes || 0; if (slot !== 'C') row.baseAttempts += b?.pancakeAttempts || 0; }
  for (const e of sim.events || []) {
    if (e.ability === 'DRA-04-F' && ['pancake', 'ability'].includes(e.kind) && typeof e.accepted === 'boolean' && OL.includes(e.by)) { row.abilityAttempts++; row.attempts--; if (e.by !== 'C') row.baseAttempts--; }
    if (e.kind === 'pancake' && OL.includes(e.by)) { if (e.ability) { row.abilityKnockdowns++; continue; } if (e.guaranteed) { row.guaranteed++; row.attempts--; if (e.by !== 'C') row.baseAttempts--; } else { row.ordinarySuccess++; if (e.by === 'C') row.packageSuccess++; else row.baseSuccess++; } }
    if (e.kind === 'stumble' && OL.includes(e.by) && !e.ability) row.lost++;
    if (e.kind === 'shed' && !e.ability) row.ordinarySheds++;
  }
};
process.on('exit', () => { fs.writeFileSync(process.env.M6_PK_OUT, JSON.stringify([...rows.values()])); });
