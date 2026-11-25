#!/usr/bin/env node
// Balance audit 2026-11-25 (observation only): why does Foresight (cerebrix, PSY-03-F) never execute? The home QB is given the
// cerebrix species (in the slot and in the rotation pool, same id) and every snap's engine events are counted: marks made before the
// snap (rules.preparePreChoice), marks validated at the snap (the ability's playStart log), executions, and the marked LB's assignment.
//   node tools/balance-audit/foresight-probe.mjs [--games=30]
import { playGame } from '../../src/sim/game-runner.js';
import { generatedTeam } from '../../src/franchise/roster.js';
import { PLAYS } from '../../src/data/playbook.js';
const G = Number((process.argv.find((a) => a.startsWith('--games=')) || '--games=30').split('=')[1]);
const c = { games: 0, homeOffSnaps: 0, preMarks: 0, snapMarks: 0, executions: 0, defCalls: {} };
for (let i = 0; i < G; i++) {
  const home = generatedTeam(8000 + i, { id: 'h', name: 'Home' }), away = generatedTeam(9000 + i, { id: 'a', name: 'Away' });
  const qb = home.offense.QB; const patch = { species: 'cerebrix', form: 'cerebrix:0', mastery: 0 };
  Object.assign(qb, patch); for (const p of home.rotationInputs || []) if (p.id === qb.id) Object.assign(p, patch);
  const s = playGame({ home, away, seed: 7000 + i, quarterLength: 180, otPeriods: 1, onStep: (ev, st) => {
    if (ev?.kind !== 'play' || !ev.sim) return; if (st.possession === undefined) return;
    const ev2 = ev.sim.events || []; const off = ev.sim.names?.off?.QB === qb.name;
    if (!off) return; c.homeOffSnaps++; c.defCalls[ev.defensePlayId] = (c.defCalls[ev.defensePlayId] || 0) + 1;
    if (ev2.some((e) => e.kind === 'foresight_mark')) c.snapMarks++;
    if (ev2.some((e) => e.kind === 'ability' && e.ability === 'PSY-03-F')) c.executions++;
  } });
  c.preMarks += (s.log || []).filter((l) => l.kind === 'ability' && /foresees/.test(l.text || '')).length; c.games++;
}
const blitzShare = Object.entries(c.defCalls).reduce((n, [id, k]) => n + ((PLAYS[id]?.tags || []).includes('blitz') ? k : 0), 0);
console.log(JSON.stringify({ ...c, defCalls: undefined, blitzCallsFaced: blitzShare }, null, 1));
