// Beast Clash t8: build a battle-ready combatant from a monster. Pure: the monster is never changed.
// The HP / ATK / SPD formula is the approved values 1.1.0 formula, step for step the same as the frozen legacy buildCombatant
// (src/clash/stats.js, current ruleset): effective attributes once (fatigue), overall from those, the durability and strength
// tilts, then the archetype multiplier last and once. The one difference is the archetype: t8 reads the Dex family's
// clashArchetype (spec §1 totals; M4_PLAN R11/R12), never the legacy move table. No contract is attached yet: until the
// Clash abilities land (S6-S11) every monster uses the no-contract action (the ordinary attack plus archetype perks).
// Form, Clash mastery tier, exhaustion and the incoming status slot are S12 inputs.
import { effectiveAttributes, overall } from '../../data/monsters.js';
import { SPECIES_DEX } from '../../data/species.js';
import { archetypeOf, isBasic } from '../../data/beast-dex.js';
import { T8_VALUES } from './values.js';

const SPECIES = new Map(SPECIES_DEX.map((s) => [s.id, s]));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round2 = (x) => Math.round(x * 100) / 100;

/** The archetype perks the t8 ordinary attack reads (approved values 1.1.0 archetypes). */
export function perksOf(archetype) {
  const a = T8_VALUES.archetypes[archetype]; if (!a) throw new Error(`Unknown archetype ${archetype}`);
  return Object.freeze({ guard: a.guard, shieldBreak: a.shieldBreak || 1, pierce: !!a.pierce });
}

export function buildT8Combatant(m, { slot = 0, side = 'a' } = {}) {
  const sp = SPECIES.get(m.species); if (!sp) throw new Error(`Unknown species ${m.species}`);
  const archetype = archetypeOf(sp.id); if (!archetype) throw new Error(`No Dex Clash archetype for ${sp.id}`);
  const arch = T8_VALUES.archetypes[archetype]; const S = T8_VALUES.stats;
  const e = effectiveAttributes(m, {});
  const ovr = overall(e, m.position);
  const mean = (e.speed + e.agility + e.strength + e.awareness + e.durability) / 5;
  const tilt = (x) => clamp(1 + (x - mean) / S.tiltDiv, S.tiltMin, S.tiltMax);
  const hpBase = S.hpBase + S.hpPerOverall * ovr, atkBase = S.atkBase + S.atkPerOverall * ovr;
  const hp = Math.round(hpBase * arch.hp * tilt(e.durability));
  const atk = round2(atkBase * arch.atk * tilt(e.strength));
  const spd = round2(S.spdBase + arch.spd + clamp((e.speed - mean) / S.spdTiltDiv, -S.spdTiltMax, S.spdTiltMax) + ovr * S.spdPerOverall);
  return Object.freeze({
    id: `${side}${slot}`, monsterId: m.id, name: m.name, species: sp.id, speciesName: sp.name, type: sp.element, rarity: sp.rarity,
    basic: isBasic(sp.id), position: m.position, archetype, stage: m.stage || 0, level: m.level || 1, overall: ovr, fatigue: m.fatigue || 0,
    hp, maxHp: hp, atk, spd, guard: arch.guard, perks: perksOf(archetype),
    contract: null, // the no-contract action (S1); S6-S11 attach the family's Clash contract here
    breakdown: Object.freeze({ attributes: Object.freeze({ ...e }), overall: ovr, mean: round2(mean), durabilityTilt: tilt(e.durability), strengthTilt: tilt(e.strength), hpBase, atkBase, archetype: Object.freeze({ ...arch }), hp, atk, spd }),
  });
}
