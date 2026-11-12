// Beast Clash, ruleset 't8' (Task 8 M4): the numbers the Task 8 engine reads, and the provisional defaults it uses where the
// approved sources give no value yet. Every approved number is READ from the frozen legacy values (src/clash/values.js, values
// 1.1.0); nothing here changes or copies an approved value. Provisional defaults are listed in T8_PROVISIONAL with the open owner
// decision each one waits on (docs/task8/M4_PLAN.md §5, docs/task8/M4_STATUS.md).
import { CLASH_VALUES as L } from '../values.js';

const deepFreeze = (o) => { for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v); return Object.freeze(o); };

export const T8_VALUES = deepFreeze({
  ruleset: 't8',
  engineVersion: 't8-s5',
  // Engine versions whose replay keys this build replays identically. S2 and S3 changed no battle without a status or a hook; S4
  // adds rotation (P8) with the approved AI policy as the default (D1, D2), which changes ordinary battles, so the list was reset at
  // S4 and the golden seeds were re-recorded (tests/clash/fixtures/golden-t8.json; the S1 file is kept as golden-t8-s1.json and
  // still replays exactly with both sides on policy 'none').
  keyCompatible: ['t8-s5'],
  // The approved values 1.1.0 numbers the t8 engine uses unchanged.
  archetypes: L.archetypes,   // approved: HP/ATK/SPD multipliers and the perks (Tank guard 0.88, Striker shieldBreak 2, Disruptor pierce)
  stats: L.stats,             // approved: the HP/ATK/SPD formula (economy recalibration #30 is M6)
  types: L.types,             // approved: 1.05 / 0.952
  damage: { spreadMin: L.damage.spreadMin, spreadMax: L.damage.spreadMax, initiativeTie: L.damage.initiativeTie }, // approved
  battle: { exchangeCap: L.battle.exchangeCap, maxPerSide: L.battle.maxPerSide, minPerSide: L.battle.minPerSide }, // approved
  tiebreak: L.tiebreak,       // approved: HP share at the cap, exact tie to the seeded coin
  swaps: { forcedEvery: L.swaps.forcedEvery, voluntaryEvery: L.swaps.voluntaryEvery }, // approved: forced pacing 3; voluntary cadence 4 (= ROTATION_CADENCE_EXCHANGES)
  suddenDeath: L.suddenDeath, // values 1.1.0 (tagged provisional there); its t8 scope waits on D8
  stalemate: L.duration.models.C6, // approved C6; its t8 scope waits on D8 (no heal or shield exists in S1, so it changes nothing yet)
});

/**
 * Provisional defaults of the t8 engine: a rule or value S1 needs that the approved sources do not fix. Each names the open owner
 * decision (M4_PLAN.md §5b) or the later build step that replaces it. Tests read this list so a default cannot be added silently.
 */
export const T8_PROVISIONAL = deepFreeze([
  { id: 'ko-replacement-line-order', waitsOn: 'owner (D1/D2 rule on rotation and the AI; neither names the KO replacement choice)',
    rule: 'A knocked-out active monster is replaced by the first living reserve in stable lineup order (the legacy behavior, M4_PLAN §5c), for both the AI and the player. The replacement enters right after the hit (B3 rule 4) and does not take the knocked-out monster\'s canceled turn this exchange (B3 rule 2).' },
  { id: 'sudden-death-scope', waitsOn: 'none (N9d approved)',
    rule: 'The values 1.1.0 sudden-death ramp (Model E for 1-3 per side, Model F for 4-5, from exchange 12) multiplies the 8a raw damage of every direct strike (ordinary, special, reaction, counter, follow-up). It does not touch the Afflicted tick, heals or shields.' },
  { id: 'stalemate-c6-scope', waitsOn: 'none (N9d approved)',
    rule: 'The C6 multiplier is computed each exchange exactly as values 1.1.0 defines it and multiplies every heal and every shield pool granted (S3 heal/shield paths). Not damage.' },
  { id: 'exchange-cap', waitsOn: 'none (N9d approved)',
    rule: 'The cap (30), the HP-share tiebreak and the exact-tie coin are the approved values, applied as in values 1.1.0: the battle ends after the 30th exchange. N9d: due impacts resolve first; not-yet-due impacts are discarded at the cap.' },
  { id: 'shared-burden-budget-rounding', waitsOn: 'none (reading of §9 + D9, flagged; Shared Burden itself is S5)',
    rule: 'D9 is approved: every factor multiplies and the HP loss is rounded once, half up. When a Shared Burden split applies, the raw budget is made whole first (rounded half up once at 8c), because §9 floors the source share of a whole budget (101 at 30% gives 30 and 71); each share is then mitigated and rounded once again at its HP loss.' },
  { id: 'initiative-tie-band', waitsOn: 'none (approved value; reading flagged)',
    rule: 'P6 "seeded tie-break" is read with the approved values 1.1.0 band: speeds closer than 2 are a tie and go to one seeded coin draw.' },
  { id: 'ko-clears-durations-keeps-cooldowns', waitsOn: 'S5 (ability ledgers)',
    rule: 'A knockout clears the status slot and episode (spec §10, approved) and every duration clock the monster holds, and keeps its cooldown clocks (Second Spring restores HP only, "no cooldown reset"). The cooldown half is the provisional part.' },
  { id: 'tank-bruise-not-implemented', waitsOn: 'none (N9d approved)',
    rule: 'N9d: connected Tank hits reduce healing x0.75 for two recipient normal turns, outside the status slot; refresh only, pauses in reserve, clears on KO.' },
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
  // ---- S3: the damage pipeline
  { id: 'multi-hit-target-ko', waitsOn: 'the multi-hit contracts (S6-S11)',
    rule: 'B3 rule 2 cancels the remaining hits of a monster that is knocked out. When the TARGET of a multi-hit strike is knocked out, the remaining hits are canceled too (nothing retargets) unless a contract says otherwise.' },
  { id: 'reaction-order', waitsOn: 'none (reading of §9 "established event order ... stable sourceID", flagged)',
    rule: 'Reactions, after-whole-hit effects and follow-ups to one hit run by owner: the hit\'s recipients first in recipient order, then every other monster by stable ID.' },
  { id: 'reaction-chains', waitsOn: 'none (B3 / P6 "no chains"; reading flagged)',
    rule: 'A reaction or counter strike runs its own attached effects but never triggers reactions, after-whole-hit effects or follow-ups.' },
  // ---- S4: rotation
  { id: 'lineup-order-stable', waitsOn: 'none (reading of the contracts\' "stable lineup order", flagged)',
    rule: 'A voluntary or forced rotation does not reorder the lineup: "first living reserve" (KO replacement, Downdraft, Feather Relay) always means the first living non-active monster in the original lineup order. (The legacy engine swapped line positions.) Second Spring\'s "back of the lineup" (D18) is S5.' },
  { id: 'p8-pending-cleared-on-departure', waitsOn: 'none (reading of P8 "first normal turn after a voluntary rotation", flagged)',
    rule: 'An entry penalty not yet spent (the entrant left again, by a forced rotation, before its first normal turn) ends with that entry; it does not follow the monster to a later entry.' },
  { id: 'rotation-hook-order', waitsOn: 'S10 (the rotation contracts)',
    rule: 'Within one side\'s rotation, hooks are asked of every monster in stable ID order: rotationDelay (Cinder Clamp), pursuit (Riptide Pursuit), cashOut (Shell Harvest), then departure, the entrant\'s onEntry, then arrival (Cold Welcome / Downdraft), as P8 orders them. A delayed rotation does not spend the cadence.' },
  { id: 'ai-visible-information', waitsOn: 'none (approved D2 "approved information restrictions"; reading flagged)',
    rule: 'The adapted AI policy reads only what both players see: types, HP, status badges, its own side\'s attack, and hits already dealt. The legacy smart policy\'s "about to fall" test read the opposing active\'s ATK; it now uses the largest single hit that opponent has dealt in this battle.' },
  { id: 'feather-relay-voluntary', waitsOn: 'none (N9c C approved)',
    rule: 'Feather Relay is built (team action at the normal action opportunity; cadence, locks and legality kept; no entry penalty). N9c C: Cinder Clamp, Riptide Pursuit, Cold Welcome and Shell Harvest treat the relay as voluntary in normal gameplay.' },
  // ---- S5: the contract primitives
  { id: 'delayed-slot-active-position', waitsOn: 'none (reading of FIR-03-C / FIR-06-C "lineup position ... current occupant", flagged; T8_FLAGS.delayedSlot)',
    rule: 'A delayed impact marks the target side\'s ACTIVE position: the occupant at impact is whoever is active then. Under lineup-order-stable a lineup index never changes hands, so the active position is the only reading in which "current occupant" can differ from the launch target.' },
  { id: 'retaliation-suppression-scope', waitsOn: 'none (reading of LIG-06-C "suppress only ATTACK retaliation" and the no-chain tags, flagged)',
    rule: 'While a strike suppresses retaliation (Daybreak Lance) or is itself a reaction, counter or commanded strike, any OTHER monster\'s strike from a reaction context is refused and reported unmet; non-attack responses (heals, status attempts, cleanses) and the attacker\'s own follow-ups still resolve.' },
  { id: 'performed-attack-at-launch', waitsOn: 'none (reading of "performed normal attack" across WAT-05-C, WIN-02-C, LIG-04-C, MET-01-C, DRA-02-C, DAR-02-C, flagged)',
    rule: 'A normal-action attack counts as performed when it launches (before explicit misses), so a missed or launch-failed attack is still performed; Stunned skips and support actions are not.' },
  { id: 'healed-hook-kinds', waitsOn: 'owner (EAR-02-C "actual HP restoration, from self, ally or healing effect" against its exclusion of "HP redistribution")',
    rule: 'Heals and Mind Mend donations raise the healed hook (Rubble Reprisal reacts); Root Communion redistribution, revival and HP costs do not.' },
  { id: 'p8-status-chances-none', waitsOn: 'none (finding: no Clash contract has a status-application chance on the entrant\'s normal turn)',
    rule: 'P8 halves "status-application chances" on the entrant\'s first normal turn. Every Clash application is a guaranteed gate attempt; the only chances (Eclipse Call from reserve, Heat Mirage diversion, Snowbank launch accuracy, the P10 dodges) are not normal-turn application chances, so the factor applies to none. It is exposed to hooks (view.combatant().entryPenalty) should a ruling add one.' },
  { id: 'post-ko-exceptions-n7c', waitsOn: 'none (RULINGS_2026-11-07b: Riptide Pursuit removed from the B3 list)',
    rule: 'The post-KO exception whitelist is the N7c-verified list of eight: Falling Star, Faultline, Molten Brand, Shared Burden, Mountain Shelter, Astral Strike, Cinder Clamp, Second Spring.' },
  // ---- S6-S11: ability readings with no "off" state (each is the contract's literal text where one exists; see M4_DECISIONS_PENDING.md B)
  { id: 'riptide-replacement-choice', waitsOn: 'D1/D2 follow-up (the player prompt for an opponent-chosen replacement is battle-screen work, S13/S14)',
    rule: 'Riptide Charge\'s "opposing team chooses living replacement" uses the first living reserve in lineup order for every side (the same default as the KO replacement).' },
  { id: 'heat-mirage-roll-tags', waitsOn: 'none (literal reading of FIR-05-C "Normal direct attacks and delayed offensive attacks", flagged)',
    rule: 'The decoy rolls against normal-action attacks (ordinary / special) and delayed attacks; follow-ups, commanded and assist strikes neither roll nor consume it; counters, reactions and DOT are excluded by the text.' },
  { id: 'second-wind-vs-interrupt', waitsOn: 'none (reading of WIN-04-C "resolve simultaneous priority with ordinary stable initiative / ties", flagged)',
    rule: 'Second Wind advances its ally past a priority tier or ordinary speed, but not past an explicit interrupt tier.' },
  { id: 'hit-cap-floor', waitsOn: 'none (MET-02-C "cannot exceed 30% maxHP" is a bound)',
    rule: 'Tempered Guard\'s per-hit cap is floor(30% of max HP), so a capped loss never exceeds 30%.' },
  { id: 'transfers-no-p8-c6', waitsOn: 'none (spec §9 gives the complete Mind Mend arithmetic)',
    rule: 'Mind Mend\'s donation and Root Communion\'s apportionment are HP transfers: no P8 entry penalty and no C6 factor apply (the §9 formulas are complete).' },
  { id: 'molten-brand-vs-suppression', waitsOn: 'owner (LIG-06-C suppresses "ATTACK retaliation" but lets "passive damage auras ... still resolve"; a Molten Brand eruption is mark-triggered)',
    rule: 'A Molten Brand eruption on a Daybreak Lance strike is treated as attack retaliation and is suppressed.' },
  { id: 'relay-turn-counts', waitsOn: 'none (reading of WIN-01-C "only replace a normal action it could legally perform")',
    rule: 'The active ally\'s turn in which Feather Relay takes the team action counts as that ally\'s normal turn (its status and clocks count down at its end).' },
  { id: 'shield-break-rounding', waitsOn: 'none (D9 single rounding; reading flagged)',
    rule: 'The pool loss and the HP loss are each rounded once, half up: a hit the pool fully absorbs removes round(damage x break) pool HP; a hit that breaks it removes the whole pool and loses round(damage - pool / break) HP.' },
]);
