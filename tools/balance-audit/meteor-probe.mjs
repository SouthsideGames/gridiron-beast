#!/usr/bin/env node
// Meteor Impact (FIR-03-F) probe (owner play test 2026-11-26): deep_post against cover_3 with a Pyronix (firestorm) QB, the pass
// forced to WR1 as in the ability's tests, many seeds; with and without the ability on the same seeds. Reports, for completed powered
// passes, the shockwave's victims and pushes and the receiver's yards after the catch (with against without).
//   node tools/balance-audit/meteor-probe.mjs [--seeds=400] [--mastery=0]
import { simulatePlay } from '../../src/sim/engine.js';
import { PLAYS } from '../../src/data/playbook.js';
import { lineup } from '../../tests/tools/lineup.js';
import '../../src/sim/abilities/index.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const N = Number(args.seeds || 400), M = Number(args.mastery || 0);
function play(seed, species) {
  const L = lineup(11, 60), D = lineup(12, 64); const o = { ...L.offense }, d = { ...D.defense };
  for (const [k, x] of Object.entries(o)) o[k] = { ...x, id: `o_${k}` }; for (const [k, x] of Object.entries(d)) d[k] = { ...x, id: `d_${k}` };
  if (species) o.QB = { ...o.QB, species, form: `${species}:0`, mastery: M };
  return simulatePlay({ offensePlay: PLAYS.deep_post, defensePlay: PLAYS.cover_3, offense: o, defense: d, ballOn: 30, seed, options: { t8: { status: {}, ability: { o_QB: { cd: 0 } } }, qb: { mode: 'human', at: 1.9, action: 'throw', target: 'WR1' } } });
}
const yac = (r) => (r.stats.receiver ? (r.yards ?? r.stats.yards ?? 0) - (r.stats.airYards ?? 0) : null);
let n = 0, victims = 0, moved = 0, withYac = 0, withoutYac = 0, gain = 0, gainOff = 0;
for (let seed = 1; seed <= N; seed++) {
  const on = play(seed, 'firestorm'); const sw = on.events.filter((e) => e.ability === 'FIR-03-F' && e.phase === 'shockwave'); if (!sw.length) continue;
  const off = play(seed, null); if (!off.stats.receiver) continue;
  n++; for (const v of sw[0].victims) { victims++; moved += v.moved; }
  withYac += yac(on); withoutYac += yac(off); gain += on.yards ?? 0; gainOff += off.yards ?? 0;
}
const f = (x) => (n ? +(x / n).toFixed(2) : null);
console.log(JSON.stringify({ mastery: M, shockwavePlays: n, victimsPerShockwave: f(victims), meanPush: victims ? +(moved / victims).toFixed(2) : null, yacWith: f(withYac), yacWithout: f(withoutYac), yacGain: f(withYac - withoutYac), yardsWith: f(gain), yardsWithout: f(gainOff) }));
