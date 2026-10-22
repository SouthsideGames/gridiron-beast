#!/usr/bin/env node
// Legendary Plays balance (GDD §36.5): each pilot play with its real Legendary in the slot, against every defence (or every
// offence), on identical snaps, next to the standard plays of the same kind. Reports yards per play, success rate (gain of
// 4+ or a score), sacks and turnovers, the matchups where the play is strongest and weakest, and the same play with an
// ordinary monster of equal rating in the slot (what the play is worth without its Legendary).
//   node tools/legendary-balance.mjs [--n=240] [--q=62] [--only=lp_fault_line,...]
import { simulatePlay } from '../src/sim/engine.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS, LEGENDARY_IDS } from '../src/data/playbook.js';
import { generateMonster, effectiveAttributes, monsterOverall } from '../src/data/monsters.js';
import { OFFENSE_SLOTS, DEFENSE_SLOTS, positionOf } from '../src/data/personnel.js';
import { createRng } from '../src/core/rng.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const N = Number(args.n || 240), Q = Number(args.q || 62);
const input = (m) => ({ attrs: effectiveAttributes(m), name: m.name, id: m.id, type: m.type, species: m.species });
function lineups(seed) {
  const rng = createRng(seed); const o = {}, d = {};
  for (const s of OFFENSE_SLOTS) o[s] = input(generateMonster(rng, { position: positionOf(s), quality: Q }));
  for (const s of DEFENSE_SLOTS) d[s] = input(generateMonster(rng, { position: positionOf(s), quality: Q }));
  return { o, d, rng };
}
function withLegend(lu, play, legendOn) {
  const L = PLAYS[play].legendary; const side = PLAYS[play].side === 'offense' ? 'o' : 'd';
  const rng = createRng(4242); const pos = positionOf(L.slot);
  let m = generateMonster(rng, { position: pos, quality: Q, species: L.species });
  if (!legendOn) { // an ordinary monster of the same rating in the slot
    let g = 0; let alt = generateMonster(rng, { position: pos, quality: Q }); while (alt.species === L.species && g++ < 5) alt = generateMonster(rng, { position: pos, quality: Q });
    m = alt;
  }
  return { ...lu, [side]: { ...lu[side], [L.slot]: input(m) }, ovr: monsterOverall(m) };
}
function run(off, def, lu, seed) {
  const r = simulatePlay({ offensePlay: PLAYS[off], defensePlay: PLAYS[def], offense: lu.o, defense: lu.d, seed, ballOn: 35 });
  return { y: r.yards, ok: r.yards >= 4 || r.touchdown, sack: r.result === 'sack', to: r.turnover, td: r.touchdown };
}
const agg = (rows) => { const n = rows.length || 1; return { ypp: +(rows.reduce((s, r) => s + r.y, 0) / n).toFixed(2), succ: Math.round(rows.filter((r) => r.ok).length / n * 100), sack: +(rows.filter((r) => r.sack).length / n * 100).toFixed(1), to: +(rows.filter((r) => r.to).length / n * 100).toFixed(1) }; };
const base = lineups(77);
const out = {};
for (const id of LEGENDARY_IDS.filter((x) => !args.only || String(args.only).split(',').includes(x))) {
  const p = PLAYS[id]; const off = p.side === 'offense';
  const opp = off ? DEFENSE_IDS : OFFENSE_IDS;
  const per = {}; const all = [], allPlain = [];
  const lu = withLegend(base, id, true), luPlain = withLegend(base, id, false);
  for (const q of opp) { const rows = []; for (let k = 0; k < Math.ceil(N / 4); k++) { const seed = 9000 + k * 13 + q.length; const r = off ? run(id, q, lu, seed) : run(q, id, lu, seed); rows.push(r); all.push(r); allPlain.push(off ? run(id, q, luPlain, seed) : run(q, id, luPlain, seed)); } per[q] = agg(rows); }
  // standard plays of the same kind, same lineups and seeds
  const peers = (off ? OFFENSE_IDS.filter((x) => PLAYS[x].type === p.type && !PLAYS[x].tags.includes('desperation')) : DEFENSE_IDS.filter((x) => !PLAYS[x].tags.includes('desperation') && !PLAYS[x].tags.includes('prevent')));
  const peerRows = []; for (const x of peers) for (const q of opp) for (let k = 0; k < Math.ceil(N / 16); k++) { const seed = 9000 + k * 13 + q.length; peerRows.push(off ? run(x, q, lu, seed) : run(q, x, lu, seed)); }
  const ranked = Object.entries(per).sort((a, b) => (off ? b[1].ypp - a[1].ypp : a[1].ypp - b[1].ypp));
  out[p.name] = { legend: `${p.legendary.species} @ ${p.legendary.slot}`, play: agg(all), withoutLegend: agg(allPlain), standardPlays: agg(peerRows), best: ranked.slice(0, 3).map(([q, v]) => `${PLAYS[q].name} ${v.ypp}`).join(', '), worst: ranked.slice(-3).map(([q, v]) => `${PLAYS[q].name} ${v.ypp}`).join(', ') };
}
for (const [name, r] of Object.entries(out)) {
  console.log(`\n${name} (${r.legend})`);
  console.table({ 'this play, Legendary in the slot': r.play, 'this play, ordinary monster in the slot': r.withoutLegend, [`standard ${name.includes('') ? 'plays of the same kind' : ''}`]: r.standardPlays });
  console.log(`  ${'strongest against'}: ${r.best}\n  weakest against: ${r.worst}   (offence: yards gained; defence: yards allowed)`);
}
