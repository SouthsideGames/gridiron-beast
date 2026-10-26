#!/usr/bin/env node
// Defensive fix comparison (v42.10): matched full games on one engine tree (run once on the old tree, once on the new, same
// seeds, same generated clubs), as the game plays them (abilities and types on) and with every species effect stripped. Reports
// the passing game (completion, interceptions, yards per attempt, sacks per dropback, explosive passes, separation when the ball
// arrives), the running game (yards per carry, explosive runs), scoring, defensive ability activations, and how the quarterback
// spreads the ball: the most-targeted receiver's share per team-game, how often a pass goes to the same receiver as the team's
// previous pass, the longest run of passes to one receiver, and how often he throws to his first read.
//   node tools/defense-fix-compare.mjs [--games=80] [--root=DIR] [--json=FILE]
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const ROOT = path.resolve(args.root || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const { playGame } = await import(path.join(ROOT, 'src/sim/game-runner.js'));
const { generatedTeam } = await import(path.join(ROOT, 'src/franchise/roster.js'));
const G = Number(args.games) || 80;
const strip = (team, patch) => { const slots = (s) => Object.fromEntries(Object.entries(s).map(([k, m]) => [k, m && typeof m === 'object' ? { ...m, ...patch } : m])); return { ...team, offense: slots(team.offense), defense: slots(team.defense) }; };
const VARIANTS = { abilitiesOn: (t) => t, abilitiesOff: (t) => strip(t, { species: null, ability: null }) };
const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : null); const mean = (xs) => (xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(3) : null);

function study(variant) {
  const m = { dropbacks: 0, att: 0, comp: 0, yds: 0, int: 0, sacks: 0, exp: 0, deepAtt: 0, deepComp: 0, sep: [], sepComp: [], runs: 0, ry: 0, expRun: 0, pts: 0, firstRead: 0, decided: 0, defAbility: {}, topShare: [], repeat: 0, pairs: 0, streak: [] };
  for (let i = 1; i <= G; i++) {
    const seq = {}; // per offense (keyed by its quarterback): the monsters targeted, in order (slots change with formations, monsters don't)
    const home = VARIANTS[variant](generatedTeam(500 + i, { id: 'h', name: 'H' })), away = VARIANTS[variant](generatedTeam(700 + i, { id: 'a', name: 'A' }));
    const s = playGame({ home, away, seed: 900 + i, onStep: (ev) => {
      const sim = ev?.sim; if (ev?.kind !== 'play' || !sim) return;
      for (const e of sim.events) if (e.kind === 'ability' && e.side === 'def') m.defAbility[e.key] = (m.defAbility[e.key] || 0) + 1;
      if (sim.result === 'sack') { m.sacks++; m.dropbacks++; return; }
      if (sim.qb && sim.stats.target) {
        m.dropbacks++; m.att++; if (sim.stats.receiver) { m.comp++; m.yds += sim.yards; if (sim.yards >= 20) m.exp++; } if (sim.stats.interceptor) m.int++;
        if ((sim.stats.airYards || 0) >= 20) { m.deepAtt++; if (sim.stats.receiver) m.deepComp++; }
        if (sim.stats.arriveSep != null) { m.sep.push(sim.stats.arriveSep); if (sim.stats.receiver) m.sepComp.push(sim.stats.arriveSep); }
        const d = sim.qb.decision; if (d) { m.decided++; if (d.read === 0) m.firstRead++; }
        const qbKey = sim.names?.off?.QB || '?'; (seq[qbKey] ||= []).push(sim.names?.off?.[sim.stats.target] || sim.stats.target);
      } else if (!sim.qb && sim.stats.carrier) { m.runs++; m.ry += sim.yards; if (sim.yards >= 10) m.expRun++; }
    } });
    m.pts += s.score.home + s.score.away;
    for (const list of Object.values(seq)) {
      if (list.length < 5) continue;
      const c = {}; for (const x of list) c[x] = (c[x] || 0) + 1; m.topShare.push(Math.max(...Object.values(c)) / list.length);
      let run = 1, best = 1; for (let k = 1; k < list.length; k++) { m.pairs++; if (list[k] === list[k - 1]) { m.repeat++; run++; best = Math.max(best, run); } else run = 1; } m.streak.push(best);
    }
  }
  return {
    attempts: m.att, completionPct: pct(m.comp, m.att), intPct: pct(m.int, m.att), yardsPerAttempt: +(m.yds / m.att).toFixed(2), sackPct: pct(m.sacks, m.dropbacks),
    explosivePassPct: pct(m.exp, m.att), deepCompletionPct: pct(m.deepComp, m.deepAtt), sepAtArrival: mean(m.sep), sepOnCompletions: mean(m.sepComp),
    yardsPerCarry: +(m.ry / m.runs).toFixed(2), explosiveRunPct: pct(m.expRun, m.runs), pointsPerTeamGame: +(m.pts / (2 * G)).toFixed(1),
    topReceiverShare: mean(m.topShare), sameReceiverAsLastPassPct: pct(m.repeat, m.pairs), longestSameReceiverRun: mean(m.streak), firstReadPct: pct(m.firstRead, m.decided),
    defAbilityPerGame: Object.fromEntries(Object.entries(m.defAbility).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(v / G).toFixed(1)])),
  };
}
const out = { root: ROOT, games: G, abilitiesOn: study('abilitiesOn'), abilitiesOff: study('abilitiesOff') };
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
