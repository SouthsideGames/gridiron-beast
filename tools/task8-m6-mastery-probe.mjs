// Preload (node --import) for a MEASUREMENT COPY: read-only recorder of ability execution exposure.
//  football: at the end of every game, each lineup monster's execution count (state.t8.mastery) and whether he was in the lineup;
//  Clash: at every reward settlement (applyBattleEffects), each lineup member's executions, turns taken, entries and skips.
import fs from 'node:fs';
const fb = {}; const cl = {}; const seenGame = new WeakSet(); let games = 0, battles = 0; const occ = {};
const add = (book, key, init) => (book[key] ||= init());
globalThis.__m6Probe = (ev, state, teams) => {
  if (!state.finished || seenGame.has(state)) return; seenGame.add(state); games++;
  const log = state.t8?.mastery || {};
  for (const side of ['home', 'away']) { const t = teams[side]; const seen = new Set();
    const line = [...Object.entries(t.offense || {}), ...Object.entries(t.defense || {}), ['K', t.kicker]];
    for (const [slot, m] of line) { if (!m?.id || seen.has(m.id)) continue; seen.add(m.id); const rec = log[m.id]; const n = rec?.executions || 0;
      const r = add(fb, m.species, () => ({ family: m.species, position: m.position, starts: 0, gamesWithUse: 0, executions: 0, passiveGames: 0, max: 0, hist: {} }));
      r.starts++; if (n) r.gamesWithUse++; r.executions += n; if (rec?.passiveCredited) r.passiveGames++; r.max = Math.max(r.max, n); const b = n >= 10 ? '10+' : String(n); r.hist[b] = (r.hist[b] || 0) + 1; }
    for (const [id, rec] of Object.entries(log)) if (!seen.has(id) && (t.bench || []).some((m) => m.id === id)) { const r = add(fb, rec.family, () => ({ family: rec.family, starts: 0, gamesWithUse: 0, executions: 0, passiveGames: 0, max: 0, hist: {} })); r.benchExecutions = (r.benchExecutions || 0) + rec.executions; }
  }
};
globalThis.__m6Clash = (result, side, occasion) => {
  battles++; occ[occasion] = (occ[occasion] || 0) + 1;
  for (const x of result.lines?.[side] || []) { const id = x.abilityId || `none:${x.combatant?.species || '?'}`;
    const r = add(cl, id, () => ({ abilityId: x.abilityId, family: x.combatant?.species || null, lineups: 0, acted: 0, battlesWithUse: 0, executions: 0, passive: 0, turns: 0, entries: 0, skips: 0, max: 0, neverEntered: 0, byOccasion: {} }));
    const n = x.executions || 0; r.lineups++; if ((x.turns || 0) > 0) r.acted++; if (!x.entries && !x.turns) r.neverEntered++; if (n) r.battlesWithUse++; r.executions += n; if (x.passiveCredited) r.passive++; r.turns += x.turns || 0; r.entries += x.entries || 0; r.skips += x.skips || 0; r.max = Math.max(r.max, n);
    const o = (r.byOccasion[occasion] ||= { lineups: 0, executions: 0, withUse: 0 }); o.lineups++; o.executions += n; if (n) o.withUse++; }
};
process.on('exit', () => { fs.writeFileSync(process.env.M6_MASTERY_OUT, JSON.stringify({ games, battles, occasions: occ, football: Object.values(fb), clash: Object.values(cl) })); });
