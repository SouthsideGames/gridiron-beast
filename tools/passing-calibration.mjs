#!/usr/bin/env node
// Passing calibration study (v42.8): matched full games between representative generated clubs, the same seeds and the same
// monsters in three variants: as the game plays them (species abilities and elemental types on), abilities off (species effects
// stripped), and abilities and types off. Reports completion per attempt (sacks are not attempts), sack rate per dropback,
// interceptions per attempt, yards per attempt, deep completion, and how many ability activations each game logged, so a
// calibration target (about 65% completion with abilities on) can be checked against what the engine actually does.
//   node tools/passing-calibration.mjs [--games=24] [--root=DIR] [--json=FILE]
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const ROOT = path.resolve(args.root || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const { playGame } = await import(path.join(ROOT, 'src/sim/game-runner.js'));
const { generatedTeam } = await import(path.join(ROOT, 'src/franchise/roster.js'));
const G = Number(args.games) || 24;

const VARIANTS = {
  enabled: (t) => t,
  noAbilities: (t) => strip(t, { species: null, ability: null }),
  noAbilitiesNoTypes: (t) => strip(t, { species: null, ability: null, type: null }),
};
function strip(team, patch) {
  const slots = (side) => Object.fromEntries(Object.entries(side).map(([k, m]) => [k, m && typeof m === 'object' ? { ...m, ...patch } : m]));
  return { ...team, offense: slots(team.offense), defense: slots(team.defense), kicker: team.kicker ? { ...team.kicker, ...patch } : team.kicker, returner: team.returner ? { ...team.returner, ...patch } : team.returner };
}
function study(variant) {
  const m = { games: 0, dropbacks: 0, attempts: 0, comp: 0, yds: 0, int: 0, sacks: 0, deepAtt: 0, deepComp: 0, abilityEvents: 0, abilityPlays: 0, plays: 0, runs: 0, runYds: 0, pts: 0, byAcc: {} };
  for (let i = 1; i <= G; i++) {
    const home = VARIANTS[variant](generatedTeam(500 + i, { id: 'h', name: 'H' })), away = VARIANTS[variant](generatedTeam(700 + i, { id: 'a', name: 'A' }));
    const acc = { h: home.offense.QB?.attrs?.accuracy, a: away.offense.QB?.attrs?.accuracy };
    const s = playGame({ home, away, seed: 900 + i, onStep: (ev) => {
      if (ev?.kind !== 'play' || !ev.sim) return; const sim = ev.sim; m.plays++;
      const ab = sim.events.filter((e) => e.kind === 'ability').length; m.abilityEvents += ab; if (ab) m.abilityPlays++;
      if (sim.qb || sim.stats.passer || sim.result === 'sack') {
        if (sim.result === 'sack') { m.dropbacks++; m.sacks++; return; }
        if (!sim.stats.target) return; m.dropbacks++; m.attempts++;
        const qa = acc[sim.names?.off?.QB === home.offense.QB?.name ? 'h' : 'a']; const band = qa >= 70 ? 'acc70+' : qa >= 60 ? 'acc60-69' : 'acc<60'; const b = (m.byAcc[band] ||= { att: 0, comp: 0 }); b.att++;
        if (sim.stats.receiver) { m.comp++; b.comp++; m.yds += sim.yards; } if (sim.result === 'interception') m.int++;
        if ((sim.stats.airYards || 0) >= 20) { m.deepAtt++; if (sim.stats.receiver) m.deepComp++; }
      } else if (sim.stats.carrier) { m.runs++; m.runYds += sim.yards; }
    } });
    m.games++; m.pts += (s.score?.home || 0) + (s.score?.away || 0);
  }
  const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : null);
  return { games: m.games, attempts: m.attempts, completionPct: pct(m.comp, m.attempts), yardsPerAttempt: +(m.yds / m.attempts).toFixed(2), intPct: pct(m.int, m.attempts), sackPctOfDropbacks: pct(m.sacks, m.dropbacks), deepAttempts: m.deepAtt, deepCompletionPct: pct(m.deepComp, m.deepAtt), yardsPerCarry: +(m.runYds / m.runs).toFixed(2), pointsPerTeamGame: +(m.pts / (2 * m.games)).toFixed(1), abilityEventsPerGame: +(m.abilityEvents / m.games).toFixed(1), playsWithAnAbilityPct: pct(m.abilityPlays, m.plays), completionByQbAccuracy: Object.fromEntries(Object.entries(m.byAcc).map(([k, v]) => [k, { attempts: v.att, completionPct: pct(v.comp, v.att) }])) };
}
const out = { root: ROOT, games: G, variants: Object.fromEntries(Object.keys(VARIANTS).map((v) => [v, study(v)])) };
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
