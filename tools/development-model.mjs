#!/usr/bin/env node
// Task 6 Group 4 — prospect development model (planning only; not game code). Real generated draftees (data/monsters.js generateMonster,
// level 1, the game's own levelUp, autoSpendPoints, overall and xpForLevel) followed for three seasons from age 21 under:
//   starter      plays every game: 39 XP a game (base 24, half the win bonus, about 10 from stats), which reproduces the measured
//                gain of round-1 draftees who start (about +10 over three seasons; docs/task6-plan/draft-and-gym-seeds106-110.txt)
//   reserve-now  today's reserve: no game XP, only the offseason rule (+1 awareness and strength to age 23, toward potential)
//   practice-S   reserve in a development slot: S × 24 XP per game (the base XP, no win bonus, no stats), 11 games a season
//   +C2          the same with one extra position-weighted +1 per offseason to age 24 (maturation), toward potential
// Prints the mean overall gain after 1, 2 and 3 seasons by draft band, and the share who reach the starter line. Deterministic.
import { generateMonster, overall, levelUp, xpForLevel } from '../src/data/monsters.js';
import { POSITION_WEIGHTS } from '../src/data/personnel.js';
import { createRng } from '../src/core/rng.js';

const POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S'];
const BANDS = { gem: 64, solid: 57, project: 50 };
const GAMES = 11;
function offseason(m, rng, c2) {
  m.age += 1;
  if (m.age <= 23) for (const k of ['awareness', 'strength']) if (m.attributes[k] < m.potential) m.attributes[k] += 1;
  if (c2 && m.age <= 24) { const w = Object.entries(POSITION_WEIGHTS[m.position]).filter(([k]) => m.attributes[k] < m.potential); if (w.length) m.attributes[rng.weighted(w)] += 1; }
}
function run(m, regime, rng) {
  const share = regime.startsWith('practice') ? Number(regime.split('-')[1].replace('+C2', '')) : 0; const c2 = regime.endsWith('+C2');
  const start = overall(m.attributes, m.position); const out = []; let frac = 0;
  for (let season = 1; season <= 3; season++) {
    const perGame = regime === 'starter' ? 39 : 24 * share;
    if (perGame) for (let g = 0; g < GAMES; g++) { frac += perGame; const add = Math.floor(frac); frac -= add; m.xp += add; while (m.xp >= xpForLevel(m.level)) { m.xp -= xpForLevel(m.level); levelUp(m, rng, { autoSpend: true }); } }
    offseason(m, rng, c2);
    out.push(overall(m.attributes, m.position) - start);
  }
  return { gains: out, level: m.level };
}
const REGIMES = ['starter', 'reserve-now', 'practice-0.25', 'practice-0.35', 'practice-0.5', 'reserve-now+C2', 'practice-0.35+C2', 'practice-0.5+C2'];
console.log(`Mean overall gain of draftees aged 21 after 1 / 2 / 3 seasons (${POS.length} positions × 60 each per band; ${GAMES} games a season)`);
for (const [band, q] of Object.entries(BANDS)) {
  console.log(`\n${band} (class quality ${q})`);
  for (const regime of REGIMES) {
    const rng = createRng(4242); const res = [];
    for (const pos of POS) for (let i = 0; i < 60; i++) { const g = createRng(9000 + i * 13 + pos.charCodeAt(0) * 7 + q); res.push(run(generateMonster(g, { position: pos, quality: q, age: 21 }), regime.replace('reserve-now+C2', 'practice-0+C2'), rng)); }
    const mean = (i) => (res.reduce((s, r) => s + r.gains[i], 0) / res.length).toFixed(1);
    const lvl = (res.reduce((s, r) => s + r.level, 0) / res.length).toFixed(1);
    console.log(`  ${regime.padEnd(18)} +${mean(0).padStart(4)}  +${mean(1).padStart(4)}  +${mean(2).padStart(4)}   level after 3 seasons ${lvl}`);
  }
}
