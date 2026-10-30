#!/usr/bin/env node
// Task 6 Group 1 — career model of the PROPOSED rules against today's (planning only; not game code). Takes real generated monsters
// (data/monsters.js generateMonster, the game's own overall and position weights), keeps each one a starter for his whole career (levels a
// season by age as measured in v42.17.0: docs/task6-plan/diagnostics-seeds106-107.txt), and plays three regimes:
//   current     today's offseason() and level-ups (speed, agility, durability −1/−2 a season from 30; level-ups uncapped by age)
//   proposal    the Group 1 rules (tools/task6/aging-proposal.mjs) with the AI's own point spending (cheapest useful point first)
//   gm-physical the Group 1 rules with an owner who puts every banked point into physical attributes, whatever they cost
// Prints the mean overall by age and the share of starters 33+ who still IMPROVE that season, per position and regime, and a few
// individual careers with their retirement chances. Deterministic (fixed seeds). Usage: node tools/aging-model.mjs [--n=200]
import { generateMonster, overall } from '../src/data/monsters.js';
import { POSITION_WEIGHTS } from '../src/data/personnel.js';
import { createRng } from '../src/core/rng.js';
import * as P from './task6/aging-proposal.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const N = Number(args.n || 200);
/** Levels gained in a season as a starter, by age (v42.17.0, per-monster tracking). */
export const levelsAt = (age) => (age <= 22 ? 2.0 : age <= 25 ? 1.7 : age <= 29 ? 1.6 : age <= 32 ? 1.2 : age <= 35 ? 1.0 : 0.8);

/** One career from age 21 to 39 under a regime. Returns overall by age and the improvement flags. */
export function careerRun(m0, regime, rng, { injuries = {} } = {}) {
  const m = JSON.parse(JSON.stringify(m0)); const w = Object.entries(POSITION_WEIGHTS[m.position]); const out = []; let lvlFrac = 0; let durAtPeak = null; let prev = overall(m.attributes, m.position);
  for (let age = m.age; age <= 39; age++) {
    if (age > m0.age) { // ---- offseason
      if (age <= 23) for (const k of ['awareness', 'strength']) if (m.attributes[k] < m.potential) m.attributes[k] += 1; // today's growth rule in every regime (growth rates are Group 4)
      if (regime === 'current') { if (age >= 30) for (const k of ['speed', 'agility', 'durability']) m.attributes[k] = Math.max(20, m.attributes[k] - 1 - (rng.next() < 0.5 ? 1 : 0)); }
      else {
        if (durAtPeak == null && age >= (P.CURVE[m.position].onset - 3)) durAtPeak = m.attributes.durability;
        const onset = P.trueOnset(m.position, m.id, durAtPeak ?? m.attributes.durability); const yP = age - onset, yT = age - (onset + P.CURVE[m.position].tech);
        for (const k of Object.keys(m.attributes)) {
          const loss = P.isPhysical(k) ? P.physLoss(yP, P.CURVE[m.position].rate) + (injuries[age - 1] && yP > 0 ? P.SEVERE_INJURY_PHYSICAL : 0) : P.techLoss(yT);
          m.attributes[k] = Math.max(20, m.attributes[k] - P.drawLoss(loss, rng));
        }
      }
    }
    // ---- the season: level-ups as a starter
    lvlFrac += levelsAt(age); const levels = Math.floor(lvlFrac); lvlFrac -= levels; let points = 0;
    const pub = P.publicOnset(m.position, durAtPeak ?? m.attributes.durability);
    for (let l = 0; l < levels; l++) {
      for (let i = 0; i < 3; i++) { // the level-up's own three picks: a physical (or late technical) pick succeeds with chance 1/cost
        let r = rng.next() * w.reduce((s, [, x]) => s + x, 0); let k = w[0][0]; for (const [kk, x] of w) { r -= x; if (r <= 0) { k = kk; break; } }
        const cost = regime === 'current' ? 1 : P.costOf(k, age, pub, m.position);
        if (m.attributes[k] < m.potential && rng.next() < 1 / cost) m.attributes[k] = Math.min(m.potential, m.attributes[k] + 1 + (rng.next() < 0.3 ? 1 : 0));
      }
      points += 2;
    }
    // ---- spending the banked points
    let guard = 40;
    while (points > 0 && guard-- > 0) {
      const opts = w.filter(([k]) => m.attributes[k] < m.potential).map(([k, x]) => ({ k, x, cost: regime === 'current' ? 1 : P.costOf(k, age, pub, m.position) })).filter((o) => o.cost <= points);
      if (!opts.length) break;
      let pick;
      if (regime === 'gm-physical' && opts.some((o) => P.isPhysical(o.k))) pick = opts.filter((o) => P.isPhysical(o.k)).sort((a, b) => b.x - a.x)[0];
      else { const tw = opts.reduce((s, o) => s + o.x / o.cost, 0); let r = rng.next() * tw; pick = opts[opts.length - 1]; for (const o of opts) { r -= o.x / o.cost; if (r <= 0) { pick = o; break; } } }
      m.attributes[pick.k] += 1; points -= pick.cost;
    }
    const ovr = overall(m.attributes, m.position); out.push({ age, ovr, improved: ovr > prev }); prev = ovr;
  }
  return out;
}

const POSITIONS = ['RB', 'WR', 'LB', 'OL', 'QB'];
if (import.meta.url === `file://${process.argv[1]}`) {
  const ages = [24, 27, 29, 31, 33, 35, 37, 39];
  console.log(`Mean overall by age for ${N} generated starters per position (quality 62 at 21), and the share of starters aged 33+ who still improve in a season`);
  console.log(`regime        pos  ${ages.map((a) => String(a).padStart(4)).join('')}   improving at 33+   peak→39`);
  for (const pos of POSITIONS) for (const regime of ['current', 'proposal', 'gm-physical']) {
    const rng = createRng(hashSeed(`${pos}|${regime}`)); const runs = [];
    for (let i = 0; i < N; i++) { const g = createRng(1000 + i * 7 + pos.charCodeAt(0)); runs.push(careerRun(generateMonster(g, { position: pos, quality: 62, age: 21 }), regime, rng)); }
    const at = (a) => runs.reduce((s, r) => s + r.find((x) => x.age === a).ovr, 0) / runs.length;
    const old = runs.flatMap((r) => r.filter((x) => x.age >= 33)); const peak = Math.max(...ages.map(at));
    console.log(`${regime.padEnd(13)} ${pos.padEnd(4)} ${ages.map((a) => at(a).toFixed(0).padStart(4)).join('')}   ${(100 * old.filter((x) => x.improved).length / old.length).toFixed(0).padStart(3)}%              ${peak.toFixed(0)}→${at(39).toFixed(0)}`);
  }
}
function hashSeed(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
