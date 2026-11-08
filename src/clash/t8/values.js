// Beast Clash, ruleset 't8' (Task 8 M4): the numbers the Task 8 engine reads, and the provisional defaults it uses where the
// approved sources give no value yet. Every approved number is READ from the frozen legacy values (src/clash/values.js, values
// 1.1.0); nothing here changes or copies an approved value. Provisional defaults are listed in T8_PROVISIONAL with the open owner
// decision each one waits on (docs/task8/M4_PLAN.md §5, docs/task8/M4_STATUS.md).
import { CLASH_VALUES as L } from '../values.js';

const deepFreeze = (o) => { for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v); return Object.freeze(o); };

export const T8_VALUES = deepFreeze({
  ruleset: 't8',
  engineVersion: 't8-s2',
  // Engine versions whose replay keys this build replays identically: S2 changes no battle without a status (the 20 golden seeds are
  // byte-identical), so S1 keys stay valid. The list resets when a step changes ordinary battles.
  keyCompatible: ['t8-s1', 't8-s2'],
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
  { id: 'ko-clears-durations-keeps-cooldowns', waitsOn: 'S5 (ability ledgers)',
    rule: 'A knockout clears the status slot and episode (spec §10, approved) and every duration clock the monster holds, and keeps its cooldown clocks (Second Spring restores HP only, "no cooldown reset"). The cooldown half is the provisional part.' },
  { id: 'tank-bruise-not-implemented', waitsOn: 'D6 (open: explanation requested, §25 item 6)',
    rule: 'The legacy Tank bruise perk (heals x0.75) is not implemented in t8. It is neither a status nor a heal factor until D6 is ruled.' },
  // ---- S2: statuses in Clash
  { id: 'application-turn-in-clash', waitsOn: 'none (reading of spec §10, flagged)',
    rule: 'A status applied while its recipient is in its own normal turn does not count that turn; a status applied outside the recipient\'s turn (for example by the opponent\'s attack) is consumed by the recipient\'s next normal turn. Same reading as the S1 clock.' },
  { id: 'd4-protected-turn-hold', waitsOn: 'none (approved D4; the countdown handling is the documented reading, flagged)',
    rule: 'D4: never two consecutive Stunned skips. The skipped turn counts Stunned down as usual. On the protected next turn the monster acts and Stunned\'s remaining duration is held (that turn does not decrement it), so each Stunned unit costs exactly one skipped turn. The protection is spent by that next normal turn whatever happens on it, and is cleared by a knockout.' },
  { id: 'deep-winter-freeze-counts-protected-turn', waitsOn: 'S11 (Deep Winter); reading flagged',
    rule: 'The Deep Winter freeze counter is spent by every recipient normal turn, the D4 protected turn included; while it runs, the expiration countdown does not move (ICE-06-C). Only the freeze field exists in S2; no ability sets it.' },
  { id: 'afflicted-tick-payload', waitsOn: 'a Clash Afflicted producer (none of the 72 Clash contracts produces Afflicted); D10 is silent on its size',
    rule: 'The Afflicted end-of-turn tick is exactly its payload (tickHp, or tickPctMaxHp of max HP rounded half up). With no payload it deals 0. No default size is invented.' },
  { id: 'afflicted-tick-mitigation', waitsOn: 'owner (spec §10 / STA-05 do not say whether type, guards or shields apply to the tick)',
    rule: 'The Afflicted tick is direct HP loss: no type factor, Tank guard, Guarded or shield. B3\'s pre-KO hook (Last Root) applies to it from S3.' },
  { id: 'shield-depleted-ends-status', waitsOn: 'owner (spec §10 / STA-09 do not say whether an empty pool ends Shielded)',
    rule: 'A Shielded pool reduced to 0 HP ends the status and its episode (the shield breaks). A football-origin shield whose converted remaining pool rounds to 0 does not enter the Clash.' },
  { id: 'shield-strength-units', waitsOn: 'none (approved D11; unit reading flagged)',
    rule: 'In Clash a Shielded strength is its original pool in whole HP. Carried to football, its strength is that pool as a percentage of the recipient\'s max Clash HP, the same unit as the football Guiding Halo strength (15). Carried back, the pool is that percentage of max Clash HP and the remaining pool is the pool times its remaining fraction, rounded half up. A football-origin shield has original strength 15% of max Clash HP (D11). Nothing is refilled.' },
  { id: 'shield-break-rounding', waitsOn: 'none (D9 single rounding; reading flagged)',
    rule: 'The pool loss and the HP loss are each rounded once, half up: a hit the pool fully absorbs removes round(damage x break) pool HP; a hit that breaks it removes the whole pool and loses round(damage - pool / break) HP.' },
]);
