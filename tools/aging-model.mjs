#!/usr/bin/env node
// Task 6 Group 1 proposal: an illustrative model of the PROPOSED ageing and retirement rules (not game code; nothing here is used by the
// game). It takes real generated monsters (data/monsters.js generateMonster, the game's own overall formula and position weights) and
// plays out a career under the proposal's expected values: growth to a physical peak, level-ups as a starter, physical then technical
// decline from a position onset shifted by longevity, durability and injuries, and the yearly retirement hazard. Prints, per age:
// overall, the retirement chance that offseason, and the chance he is still playing. Deterministic.
//   node tools/aging-model.mjs
import { generateMonster, overall } from '../src/data/monsters.js';
import { POSITION_WEIGHTS } from '../src/data/personnel.js';
import { createRng } from '../src/core/rng.js';

export const PHYSICAL = ['speed', 'agility', 'strength', 'durability'];
// Proposed position table: physical decline onset (normal longevity), technical onset offset, and the rate multiplier of physical decline.
export const CURVE = Object.freeze({
  RB: { onset: 27, tech: 2, rate: 1.3 }, WR: { onset: 28, tech: 2, rate: 1.15 }, CB: { onset: 28, tech: 2, rate: 1.15 },
  LB: { onset: 29, tech: 2, rate: 1.0 }, S: { onset: 29, tech: 2, rate: 1.0 }, DL: { onset: 29, tech: 2, rate: 1.0 }, TE: { onset: 29, tech: 2, rate: 1.0 },
  OL: { onset: 30, tech: 3, rate: 0.9 }, QB: { onset: 30, tech: 3, rate: 0.8 }, K: { onset: 32, tech: 3, rate: 0.6 },
});
export const ARM_LATE = true; // arm declines with the technical group (a QB's arm fades later than his legs)
/** Physical loss per attribute in the y-th season past onset (expected; the game would draw ±1 around it). */
export const physLoss = (y, rate) => (y <= 0 ? 0 : rate * (1.5 + 0.75 * (y - 1)));
/** Technical loss per attribute in the y-th season past the technical onset. */
export const techLoss = (y) => (y <= 0 ? 0 : 0.75 + 0.5 * (y - 1));
/** Yearly retirement hazard by seasons past the career age (onset + 6 + longevity shifts). No hard ceiling. */
export const HAZARD = [[-4, 0], [-3, 0.02], [-2, 0.05], [-1, 0.10], [0, 0.20], [1, 0.35], [2, 0.55], [3, 0.75], [4, 0.90]];
export const hazardAt = (y) => { let h = 0; for (const [k, v] of HAZARD) if (y >= k) h = v; return h; };
/** Odds multipliers (applied to h / (1 − h), then back to a probability, capped at 0.97). */
export function retireChance(y, { starterGood = false, declinedReserve = false, unsigned = false, weeksLost = 0, severeAfter30 = false, durability = 60 } = {}) {
  const h = hazardAt(y); if (h <= 0) return 0; let odds = h / (1 - h);
  if (starterGood) odds *= 0.5; if (declinedReserve) odds *= 1.8; if (unsigned) odds *= 2; if (weeksLost >= 6) odds *= 1.5; if (severeAfter30) odds *= 1.5;
  if (durability < 40) odds *= 1.3; else if (durability > 80) odds *= 0.8;
  return Math.min(0.97, odds / (1 + odds));
}

function career({ label, position, quality, seed, startAge = 21, longevity = 0, injuries = {}, durability = null, levelsPerSeason = [1.6, 1.2, 0.8], until = 41 }) {
  const rng = createRng(seed); const m = generateMonster(rng, { position, quality, age: startAge }); if (durability != null) m.attributes.durability = durability; const dur0 = m.attributes.durability;
  const c = CURVE[position]; const durShift = m.attributes.durability >= 75 ? 1 : m.attributes.durability <= 45 ? -1 : 0;
  const onset = c.onset + longevity + durShift; const tech = onset + c.tech; const careerAge = onset + 4; // onset already carries longevity and durability
  const w = POSITION_WEIGHTS[position]; const rows = []; let alive = 1; let peak = 0;
  for (let age = startAge; age <= until; age++) {
    // offseason: growth to the physical peak (to onset − 3), then decline past onset; technical decline past its onset
    if (age > startAge) {
      if (age <= onset - 3) for (const k of PHYSICAL) m.attributes[k] = Math.min(m.potential, m.attributes[k] + 1);
      const yP = age - onset, yT = age - tech; const injured = injuries[age] || 0;
      for (const k of PHYSICAL) m.attributes[k] = Math.max(20, m.attributes[k] - physLoss(yP, c.rate) - (injured >= 6 && age >= 30 ? 1 : 0));
      for (const k of Object.keys(m.attributes)) if (!PHYSICAL.includes(k)) { const late = k === 'arm' ? yT : yT; m.attributes[k] = Math.max(20, m.attributes[k] - techLoss(late)); }
    }
    // the season: level-ups as a starter; from the physical onset the points go only to technical and mental attributes (the approved principle)
    const lv = age < onset ? levelsPerSeason[0] : age < tech ? levelsPerSeason[1] : levelsPerSeason[2];
    const elig = Object.entries(w).filter(([k]) => (age < onset || !PHYSICAL.includes(k)) && m.attributes[k] < m.potential); const tw = elig.reduce((s, [, v]) => s + v, 0);
    if (tw) for (const [k, v] of elig) m.attributes[k] = Math.min(m.potential, m.attributes[k] + lv * 5.9 * v / tw);
    const ovr = overall(m.attributes, position); peak = Math.max(peak, ovr);
    const p = age >= 30 || injuries[age] ? retireChance(age - careerAge, { starterGood: ovr >= peak - 4, declinedReserve: ovr < peak - 10, weeksLost: injuries[age] || 0, severeAfter30: (injuries[age] || 0) >= 6 && age >= 30, durability: m.attributes.durability }) : 0;
    rows.push({ age, ovr, retire: p, playing: alive }); alive *= 1 - p;
  }
  return { label, position, onset, tech, careerAge, durability: Math.round(dur0), potential: m.potential, rows };
}

const CASES = [
  { label: 'QB, normal longevity', position: 'QB', quality: 62, seed: 11 },
  { label: 'QB, exceptional (+3)', position: 'QB', quality: 62, seed: 11, longevity: 3 },
  { label: 'RB, normal', position: 'RB', quality: 62, seed: 21 },
  { label: 'RB, early (−2), knee injury at 29', position: 'RB', quality: 62, seed: 21, longevity: -2, injuries: { 29: 8 } },
  { label: 'WR, normal', position: 'WR', quality: 62, seed: 31 },
  { label: 'WR, exceptional (+2)', position: 'WR', quality: 62, seed: 31, longevity: 2 },
  { label: 'OL, normal', position: 'OL', quality: 62, seed: 41 },
  { label: 'OL, early (−1), low durability (40)', position: 'OL', quality: 62, seed: 43, longevity: -1, durability: 40 },
  { label: 'LB, normal', position: 'LB', quality: 62, seed: 51 },
  { label: 'CB, exceptional (+3)', position: 'CB', quality: 62, seed: 61, longevity: 3 },
];
if (import.meta.url === `file://${process.argv[1]}`) {
  for (const k of CASES) {
    const c = career(k); const pick = c.rows.filter((r) => [21, 24, 26, 28, 30, 32, 34, 36, 38].includes(r.age));
    const exp = c.rows.reduce((s, r) => s + r.playing * r.retire * r.age, 0) / c.rows.reduce((s, r) => s + r.playing * r.retire, 0);
    console.log(`${c.label}: physical onset ${c.onset}, technical ${c.tech}, career age ${c.careerAge}, durability ${c.durability}, potential ${c.potential}; expected retirement age ${exp.toFixed(1)}`);
    console.log('   ' + pick.map((r) => `${r.age}: ${Math.round(r.ovr)} (${Math.round(100 * r.retire)}%, ${Math.round(100 * r.playing)}% playing)`).join(' · '));
  }
}
