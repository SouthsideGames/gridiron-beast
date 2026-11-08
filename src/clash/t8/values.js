// Beast Clash, ruleset 't8' (Task 8 M4): the numbers the Task 8 engine reads, and the provisional defaults it uses where the
// approved sources give no value yet. Every approved number is READ from the frozen legacy values (src/clash/values.js, values
// 1.1.0); nothing here changes or copies an approved value. Provisional defaults are listed in T8_PROVISIONAL with the open owner
// decision each one waits on (docs/task8/M4_PLAN.md §5, docs/task8/M4_STATUS.md).
import { CLASH_VALUES as L } from '../values.js';

const deepFreeze = (o) => { for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v); return Object.freeze(o); };

export const T8_VALUES = deepFreeze({
  ruleset: 't8',
  engineVersion: 't8-s1',
  // The approved values 1.1.0 numbers the t8 engine uses unchanged.
  archetypes: L.archetypes,   // approved: HP/ATK/SPD multipliers and the perks (Tank guard 0.88, Striker shieldBreak 2, Disruptor pierce)
  stats: L.stats,             // approved: the HP/ATK/SPD formula (economy recalibration #30 is M6)
  types: L.types,             // approved: 1.05 / 0.952
  damage: { spreadMin: L.damage.spreadMin, spreadMax: L.damage.spreadMax, initiativeTie: L.damage.initiativeTie }, // approved
  battle: { exchangeCap: L.battle.exchangeCap, maxPerSide: L.battle.maxPerSide, minPerSide: L.battle.minPerSide }, // approved
  tiebreak: L.tiebreak,       // approved: HP share at the cap, exact tie to the seeded coin
  suddenDeath: L.suddenDeath, // values 1.1.0 (tagged provisional there); its t8 scope waits on D8
  stalemate: L.duration.models.C6, // approved C6; its t8 scope waits on D8 (no heal or shield exists in S1, so it changes nothing yet)
});

/**
 * Provisional defaults of the t8 engine: a rule or value S1 needs that the approved sources do not fix. Each names the open owner
 * decision (M4_PLAN.md §5b) or the later build step that replaces it. Tests read this list so a default cannot be added silently.
 */
export const T8_PROVISIONAL = deepFreeze([
  { id: 'ko-replacement-line-order', waitsOn: 'D2',
    rule: 'A knocked-out active monster is replaced by the first living reserve in lineup order (the legacy behaviour, M4_PLAN §5c). The replacement enters right after the hit (B3 rule 4) and does not take the knocked-out monster\'s cancelled turn this exchange (B3 rule 2).' },
  { id: 'sudden-death-scope', waitsOn: 'D8',
    rule: 'The values 1.1.0 sudden-death ramp (Model E for 1-3 per side, Model F for 4-5, from exchange 12) multiplies the raw damage of every ordinary attack. In S1 the ordinary attack is the only damage path.' },
  { id: 'stalemate-c6-scope', waitsOn: 'D8',
    rule: 'The C6 multiplier is computed each exchange exactly as values 1.1.0 defines it. No heal or shield exists in S1, so nothing reads it yet.' },
  { id: 'exchange-cap', waitsOn: 'D8',
    rule: 'The cap (30), the HP-share tiebreak and the exact-tie coin are the approved values, applied as in values 1.1.0: the battle ends after the 30th exchange. What happens to pending delayed impacts at the cap waits on D8; none exist in S1.' },
  { id: 'single-rounding', waitsOn: 'D9 (and S3 for the Shared Burden raw budget)',
    rule: 'An ordinary attack rounds once, half up, at the final HP-loss conversion: round(ATK x ramp x spread x type x Tank guard). No minimum damage.' },
  { id: 'initiative-tie-band', waitsOn: 'none (approved value; reading flagged)',
    rule: 'P6 "seeded tie-break" is read with the approved values 1.1.0 band: speeds closer than 2 are a tie and go to one seeded coin draw.' },
  { id: 'ko-clears-durations-keeps-cooldowns', waitsOn: 'S2 (statuses) and S5 (ability ledgers)',
    rule: 'A knockout clears every duration clock the knocked-out monster holds (spec §10 KO clears status; B3 rule 2) and keeps its cooldown clocks (Second Spring restores HP only, "no cooldown reset").' },
  { id: 'striker-shield-break-inert', waitsOn: 'D5 and S2 (Shielded pool)',
    rule: 'The Striker shieldBreak perk is carried on the combatant but has nothing to act on until shields exist (S2).' },
  { id: 'tank-bruise-not-implemented', waitsOn: 'D6',
    rule: 'The legacy Tank bruise perk (heals x0.75) is not implemented in t8: no heal exists in S1 and its form is an open decision.' },
]);
