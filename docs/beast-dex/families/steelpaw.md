# Steelpaw

**Metal · Common · LB · Clash: Tank**

[Position comparison](../positions/LB.md) · [Beast Dex](../README.md)

Family ID: `steelpaw`. Source labels are not runtime implementation proof.

**Approved build:** Endurance specialist.

## Steelpaw

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 8–18 | 28–38 | Yes |
| Agility | 8–18 | 28–38 | Yes |
| Strength | 25–35 | 45–55 | — |
| Awareness | 28–38 | 53–63 | — |
| Catching | 18–28 | 38–48 | Yes |
| Arm | 3–13 | 13–27 | — |
| Accuracy | 3–13 | 13–27 | — |
| Blocking | 13–23 | 33–47 | — |
| Tackling | 33–43 | 58–66 | — |
| Coverage | 32–42 | 57–65 | — |
| Durability | 39–49 | 64–67 | — |
| Kicking | 3–13 | 13–27 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Chromane

Stage 1; evolution level 14; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 15–25 | 35–45 | Yes |
| Agility | 15–25 | 35–45 | Yes |
| Strength | 32–42 | 52–62 | — |
| Awareness | 35–45 | 60–70 | — |
| Catching | 25–35 | 45–55 | — |
| Arm | 10–20 | 20–34 | — |
| Accuracy | 10–20 | 20–34 | — |
| Blocking | 20–30 | 40–54 | — |
| Tackling | 40–50 | 65–73 | — |
| Coverage | 39–49 | 64–72 | — |
| Durability | 46–56 | 71–74 | — |
| Kicking | 10–20 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Iron Lungs

Ability ID: `MET-02-F`. Category: Aura.

Steelpaw; common; LB; While linebacker able, allied defenders within 3 yards at snap qualify this play.

Iron Lungs: Every SECOND qualifying participating play for each protected ally reduces that play's ordinary stamina drain by1 point, minimum0. Count per protected monster, not per source, and do not stack copies. Ability drain unchanged; no stamina restoration.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Steelpaw; common; LB; While linebacker able, allied defenders within 3 yards at snap qualify this play.

### Targets / placement

Self and nearest ONE living allied defender in radius; no constructs, tie lineup order.

### Core resolution

Every SECOND qualifying participating play for each protected ally reduces that play's ordinary stamina drain by1 point, minimum0. Count per protected monster, not per source, and do not stack copies. Ability drain unchanged; no stamina restoration.

### Recharge / frequency

Passive, once calculation per participating defensive play.

### Lifetime / persistence

Protection eligibility sampled at snap. Each monster retains0/1 qualified-play progress across bench/halftime; nonqualifying plays pause it. At second eligible play consume counter even baseline drain0; actual game end clears. No effect on Exhausted.

### Exceptions / counterplay

Zero-fatigue rest-game penalty remains. Baseline1 therefore drains1 on first qualifying play,0 on second, then repeats; useful without granting total baseline immunity. G03 must be reviewed with shared provisional stamina tuning.

### Visuals

Metal breath plume at feet, saved-drain tick on stamina inspect; no head buff.

### Progression / notes

Aura radius 3 / 4 / 5 / 6 yards by mastery. Need stamina drain provenance and shared provisional-drain tuning; proposed Tank because Clash protection.

## Beast Clash: Tempered Guard

Ability ID: `MET-02-C`. Category: Signature action.

Steelpaw; common; LB; Clash archetype Balanced → Tank. On own ready normal action when HP above50% and no status; replaces attack.

Tempered Guard: Attempt Guarded25 / 30 / 35 / 40% by mastery for next2 owner normal turns. While this OWN Guarded episode exists, enemy direct HP hit cannot exceed30% maxHP per individual hit. Cap is source payload, not another status.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Steelpaw; common; LB; Clash archetype Balanced → Tank. On own ready normal action when HP above50% and no status; replaces attack.

### Targets / placement

Self only.

### Core resolution

Attempt Guarded25 / 30 / 35 / 40% by mastery for next2 owner normal turns. While this OWN Guarded episode exists, enemy direct HP hit cannot exceed30% maxHP per individual hit. Cap is source payload, not another status.

### Recharge / frequency

Cooldown 6 owner turns, setup turn excluded; reserve pauses.

### Lifetime / persistence

Equal extension preserves payload without cap budget refill (per-hit cap has no pool); stronger OTHER-source Guarded replacement loses source cap.

### Exceptions / counterplay

Cannot set up below threshold or overwrite. DOT unaffected; multi-hit attacks each allowed30%, can KO. Football unsupported Guarded clears and cap ends.

### Visuals

Steel plates close over shoulders; ordinary Guarded breastplate badge.

### Progression / notes

Guarded reduction 25 / 30 / 35 / 40% by mastery; HP cap30 fixed. Need Guarded source payload owner and post-DR individual HP-loss clamp; not a separate passive stacking slot.
