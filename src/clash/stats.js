// Beast Clash: build a battle-ready combatant from a monster. Pure: the monster is never changed.
// Evolution and fatigue enter exactly once, through the monster's attributes:
//   1. stored attributes (evolution's +3/+1 is already in them, written once by tryEvolve)
//   2. effectiveAttributes(m, {}) once: nature x1.1/x0.9 and fatigue (speed, strength, agility up to -6%)
//   3. overall() on that same result (not a second effectiveAttributes call)
//   4. base HP, attack, speed from overall plus the durability and strength tilts
//   5. the archetype multiplier, last and once
//   6. O2 (experimental, off): Tanks +6% HP in 4-5 per side battles, applied here and nowhere else
// No evolution multiplier, no second fatigue term, no training bonus, no position penalty.
import { effectiveAttributes, overall, NATURES, clampAttr } from '../data/monsters.js';
import { SPECIES_DEX } from '../data/species.js';
import { CLASH_MOVES } from '../data/clash-moves.js';
import { CLASH_MOVES_V1_0_0 } from '../data/clash-moves-v1.0.0.js';
import { CLASH_VALUES, patchedMove } from './values.js';

const SPECIES = Object.fromEntries(SPECIES_DEX.map((s) => [s.id, s]));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round2 = (x) => Math.round(x * 100) / 100;

/** The move table a battle plays: the permanent table, or the frozen values 1.0.0 table for the historical ruleset. */
// Basic families have no unique move (approved, R1 item 37): they fight with ordinary attacks and their archetype's perks.
const BASIC_MOVES = Object.freeze(Object.fromEntries(SPECIES_DEX.filter((s) => s.rarity === 'basic').map((s) => [s.id, Object.freeze({ name: 'Strike', archetype: s.clashArchetype, text: 'Ordinary attacks; its archetype perks apply (Basic: no unique move)', kind: 'strike', trigger: Object.freeze({ kind: 'always' }), basic: true })])));
const TABLES = new Map();
export function moveTableFor(config) {
  const base = config?.ruleset === 'v1.0.0' ? CLASH_MOVES_V1_0_0 : CLASH_MOVES;
  if (!TABLES.has(base)) TABLES.set(base, Object.freeze({ ...base, ...BASIC_MOVES }));
  return TABLES.get(base);
}

export function archetypeOf(speciesId) { return CLASH_MOVES[speciesId]?.archetype || null; }

// Nature multipliers are retired from active play (spec §3; N7c B14). Historical rulesets that must replay byte for byte
// (values 1.0.0) re-apply the legacy ×1.1 / ×0.9 here and nowhere else.
function legacyNatureFor(e, m, config) {
  if (config?.legacyNature === false || !CLASH_VALUES.rulesets[config?.ruleset]?.legacyNature) return e;
  const n = NATURES[m.nature] || NATURES.balanced; // the pre-Task 8 effectiveAttributes, step for step (nature, then fatigue, then clamp)
  const fatiguePenalty = 1 - Math.min(0.06, (m.fatigue || 0) / 100 * 0.06); const out = {};
  for (const k of Object.keys(e)) { let v = m.attributes[k] || 1; if (n.up === k) v *= 1.1; if (n.down === k) v *= 0.9; if (['speed', 'strength', 'agility'].includes(k)) v *= fatiguePenalty; out[k] = clampAttr(v); }
  return out;
}
/**
 * Build a combatant. `perSide` is the lineup size (for O2); `config` is a battleConfig().
 * Returns a frozen combatant with a `breakdown` of every step, so the Lab displays the engine's own numbers.
 */
export function buildCombatant(m, { perSide = 3, config = null, slot = 0, side = 'a' } = {}) {
  const sp = SPECIES[m.species]; if (!sp) throw new Error(`Unknown species ${m.species}`);
  const move = patchedMove(sp.id, moveTableFor(config)[sp.id], config); if (!move) throw new Error(`No battle move for ${sp.id}`);
  const V = CLASH_VALUES; const arch = V.archetypes[move.archetype]; const S = V.stats;
  const e = legacyNatureFor(effectiveAttributes(m, {}), m, config); // fatigue once; Nature only when replaying a historical ruleset
  const ovr = overall(e, m.position);                          // from the same attributes
  const mean = (e.speed + e.agility + e.strength + e.awareness + e.durability) / 5;
  const tilt = (x) => clamp(1 + (x - mean) / S.tiltDiv, S.tiltMin, S.tiltMax);
  const hpBase = S.hpBase + S.hpPerOverall * ovr, atkBase = S.atkBase + S.atkPerOverall * ovr;
  const o2 = config?.O2 && move.archetype === 'Tank' && perSide >= V.experiments.O2.minPerSide ? V.experiments.O2.tankHp : 1;
  const hp = Math.round(hpBase * arch.hp * tilt(e.durability) * o2);
  const atk = round2(atkBase * arch.atk * tilt(e.strength));
  const spd = round2(S.spdBase + arch.spd + clamp((e.speed - mean) / S.spdTiltDiv, -S.spdTiltMax, S.spdTiltMax) + ovr * S.spdPerOverall);
  const c = {
    id: `${side}${slot}`, monsterId: m.id, name: m.name, species: sp.id, speciesName: sp.name, type: sp.element, rarity: sp.rarity, position: m.position,
    archetype: move.archetype, stage: m.stage || 0, level: m.level || 1, overall: ovr, fatigue: m.fatigue || 0, nature: m.nature || 'balanced',
    hp, maxHp: hp, atk, spd, guard: arch.guard, move,
    breakdown: Object.freeze({
      attributes: Object.freeze({ ...e }), overall: ovr, mean: round2(mean),
      durabilityTilt: tilt(e.durability), strengthTilt: tilt(e.strength),
      hpBase, atkBase, archetype: Object.freeze({ ...arch }), o2, hp, atk, spd,
    }),
  };
  return Object.freeze(c);
}

/** Lab convenience: a synthetic monster for a species at an overall, from a seeded generator (no save involved). */
export function speciesList() { return SPECIES_DEX.map((s) => ({ id: s.id, name: s.name, element: s.element, rarity: s.rarity, position: s.position, archetype: archetypeOf(s.id), move: (CLASH_MOVES[s.id] || BASIC_MOVES[s.id]).name })); } // Basics: the ordinary Strike (R1 item 37)
export function labMoveOf(id) { return CLASH_MOVES[id] || BASIC_MOVES[id] || null; }
