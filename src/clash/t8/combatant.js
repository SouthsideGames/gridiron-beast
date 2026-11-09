// Beast Clash t8: build a battle-ready combatant from a monster. Pure: the monster is never changed.
// The HP / ATK / SPD formula is the approved values 1.1.0 formula, step for step the same as the frozen legacy buildCombatant
// (src/clash/stats.js, current ruleset): effective attributes once (fatigue), overall from those, the durability and strength
// tilts, then the archetype multiplier last and once. The one difference is the archetype: t8 reads the Dex family's
// clashArchetype (spec §1 totals; M4_PLAN R11/R12), never the legacy move table. No contract is attached yet: until the
// Clash abilities land (S6-S11) every monster uses the no-contract action (the ordinary attack plus archetype perks).
// Form and Clash mastery tier (S5): the form is the Dex form of the monster's stage (`family:stage`, clamped to the family's forms);
// the tier is the snapshot's `clashMasteryTier` (0-3, Developing..Mastered), which S12's snapshot sets from tierIndex(credits). Both
// default to the first form and Developing. S12: `exhausted` (the football game's stamina book, spec §12) halves all 12 effective
// attributes once, the same rounding as the football engine (src/sim/engine.js), before the formula; the incoming status slot is
// the engine's `carryIn`.
import { effectiveAttributes, overall } from '../../data/monsters.js';
import { SPECIES_DEX } from '../../data/species.js';
import { archetypeOf, isBasic, abilitiesOf, formsOf, formId } from '../../data/beast-dex.js';
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
  if (m.exhausted) for (const k of Object.keys(e)) e[k] = Math.max(1, Math.round(e[k] / 2)); // §12: "halve all 12 effective attributes once ... including overtime/deciding Clash"
  const ovr = overall(e, m.position);
  const mean = (e.speed + e.agility + e.strength + e.awareness + e.durability) / 5;
  const tilt = (x) => clamp(1 + (x - mean) / S.tiltDiv, S.tiltMin, S.tiltMax);
  const hpBase = S.hpBase + S.hpPerOverall * ovr, atkBase = S.atkBase + S.atkPerOverall * ovr;
  const hp = Math.round(hpBase * arch.hp * tilt(e.durability));
  const atk = round2(atkBase * arch.atk * tilt(e.strength));
  const spd = round2(S.spdBase + arch.spd + clamp((e.speed - mean) / S.spdTiltDiv, -S.spdTiltMax, S.spdTiltMax) + ovr * S.spdPerOverall);
  const forms = formsOf(sp.id); const stage = Math.max(0, Math.min(forms.length - 1, m.stage || 0));
  const tier = m.clashMasteryTier ?? 0; if (!Number.isInteger(tier) || tier < 0 || tier > 3) throw new Error(`clashMasteryTier must be 0..3 (got ${m.clashMasteryTier})`);
  const clashAbility = abilitiesOf(sp.id)?.clash?.id || null;
  return Object.freeze({
    id: `${side}${slot}`, monsterId: m.id, name: m.name, species: sp.id, speciesName: sp.name, type: sp.element, rarity: sp.rarity,
    basic: isBasic(sp.id), position: m.position, archetype, exhausted: !!m.exhausted, stage, form: formId(sp.id, stage), tier, level: m.level || 1, overall: ovr, fatigue: m.fatigue || 0,
    hp, maxHp: hp, atk, spd, guard: arch.guard, perks: perksOf(archetype),
    contract: clashAbility, // the family's Clash ability id (null for Basics: the no-contract action); the module is resolved by the engine
    breakdown: Object.freeze({ attributes: Object.freeze({ ...e }), overall: ovr, mean: round2(mean), durabilityTilt: tilt(e.durability), strengthTilt: tilt(e.strength), hpBase, atkBase, archetype: Object.freeze({ ...arch }), hp, atk, spd }),
  });
}
