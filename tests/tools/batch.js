// Dev tool: run a batch of seeded plays and print outcome statistics.
// usage: node tests/tools/batch.js [count] [offensePlayId] [defensePlayId]
import { simulatePlay } from '../../src/sim/engine.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS } from '../../src/data/playbook.js';
import { lineup } from './lineup.js';
const L = lineup(7, Number(process.env.Q || 60));

const count = Number(process.argv[2] || 2000);
const onlyOff = process.argv[3], onlyDef = process.argv[4];
const results = {}; let yards = { run: [], pass: [] }; let guard = 0; let elapsed = [];
const perPlay = {};
for (let s = 1; s <= count; s++) {
  const o = PLAYS[onlyOff || OFFENSE_IDS[s % OFFENSE_IDS.length]], d = PLAYS[onlyDef || DEFENSE_IDS[(s * 7) % DEFENSE_IDS.length]];
  const ballOn = 5 + (s * 13) % 90;
  const r = simulatePlay({ offensePlay: o, defensePlay: d, ballOn, seed: s, offense: L.offense, defense: L.defense });
  results[r.result] = (results[r.result] || 0) + 1;
  if (r.result === 'guard') guard++;
  yards[o.type].push(r.yards); elapsed.push(r.elapsed);
  const pp = perPlay[o.name] ||= { n: 0, y: 0, td: 0, to: 0 };
  pp.n++; pp.y += r.yards; pp.td += r.touchdown ? 1 : 0; pp.to += r.turnover ? 1 : 0;
  const dp = perPlay['D:' + d.name] ||= { n: 0, y: 0, td: 0, to: 0 };
  dp.n++; dp.y += r.yards; dp.td += r.touchdown ? 1 : 0; dp.to += r.turnover ? 1 : 0;
}
const avg = (a) => (a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(2);
console.log(results);
console.log('avg run', avg(yards.run), 'avg pass', avg(yards.pass), 'avg elapsed', avg(elapsed), 'guard', guard);
const passes = count - yards.run.length;
console.log('completion-ish', ((passes - (results.incomplete || 0) - (results.throwaway || 0) - (results.sack || 0) - (results.interception || 0)) / passes * 100).toFixed(1) + '%', 'sack%', ((results.sack || 0) / passes * 100).toFixed(1), 'int%', ((results.interception || 0) / passes * 100).toFixed(1));
for (const [k, v] of Object.entries(perPlay).sort()) console.log(k.padEnd(22), 'n', v.n, 'avg', (v.y / v.n).toFixed(1), 'td', v.td, 'to', v.to);
