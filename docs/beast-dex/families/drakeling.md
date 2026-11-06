# Drakling

**Dragon · Common · RB · Clash: Striker**

[Position comparison](../positions/RB.md) · [Beast Dex](../README.md)

Family ID: `drakeling`. Source labels are not runtime implementation proof.

**Approved build:** Physical escape specialist.

## Drakling

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 24–34 | 49–59 | — |
| Agility | 30–40 | 55–64 | — |
| Strength | 34–44 | 59–64 | — |
| Awareness | 10–20 | 30–40 | Yes |
| Catching | 10–20 | 30–40 | Yes |
| Arm | 10–20 | 20–34 | — |
| Accuracy | 5–15 | 15–29 | — |
| Blocking | 15–25 | 35–45 | Yes |
| Tackling | 20–30 | 35–49 | — |
| Coverage | 5–15 | 15–29 | — |
| Durability | 15–25 | 35–45 | Yes |
| Kicking | 5–10 | 10–24 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Drakyra

Stage 1; evolution level 10; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 29–39 | 54–64 | — |
| Agility | 35–45 | 60–69 | — |
| Strength | 39–49 | 64–69 | — |
| Awareness | 15–25 | 35–45 | Yes |
| Catching | 15–25 | 35–45 | Yes |
| Arm | 15–25 | 25–39 | — |
| Accuracy | 10–20 | 20–34 | — |
| Blocking | 20–30 | 40–50 | — |
| Tackling | 25–35 | 40–54 | — |
| Coverage | 10–20 | 20–34 | — |
| Durability | 20–30 | 40–50 | — |
| Kicking | 5–15 | 15–29 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Dracolossus

Stage 2; evolution level 20; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 34–44 | 59–69 | — |
| Agility | 40–50 | 65–74 | — |
| Strength | 44–54 | 69–74 | — |
| Awareness | 20–30 | 40–50 | — |
| Catching | 20–30 | 40–50 | — |
| Arm | 20–30 | 30–44 | — |
| Accuracy | 15–25 | 25–39 | — |
| Blocking | 25–35 | 45–55 | — |
| Tackling | 30–40 | 45–59 | — |
| Coverage | 15–25 | 25–39 | — |
| Durability | 25–35 | 45–55 | — |
| Kicking | 10–20 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Dragon Pounce

Ability ID: `DRA-01-F`. Category: Self enhancement.

One successful ordinary juke or ordinary tackle break on current rushing attempt prepares pounce against next tackle attempt in same play. Exclude ability-guaranteed escapes from qualifying ordinary evasion.

Dragon Pounce / Replace that tackle-break contest with the ordinary contest plus 5 / 10 / 15 percentage points by Drakling / Drakyra / Dracolossus, plus mastery 0 / 3 / 6 / 9 points. Final success chance capped at 80%. Success breaks tackle. Failure continues normal successful-tackle resolution without a second ability reroll.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

One successful ordinary juke or ordinary tackle break on current rushing attempt prepares pounce against next tackle attempt in same play. Exclude ability-guaranteed escapes from qualifying ordinary evasion.

### Targets / placement

Source and next tackler. Handoffs and pitches qualify. Receiving and returns excluded.

### Core resolution

Replace that tackle-break contest with the ordinary contest plus 5 / 10 / 15 percentage points by Drakling / Drakyra / Dracolossus, plus mastery 0 / 3 / 6 / 9 points. Final success chance capped at 80%. Success breaks tackle. Failure continues normal successful-tackle resolution without a second ability reroll.

### Recharge / frequency

At most one pounce attempt per play, no inter-play cooldown. Pounce cannot charge itself.

### Lifetime / persistence

All per-play evasion/prepared state clears whistle. No carryover bar.

### Exceptions / counterplay

Existing movement restrictions prevent activation. No immunity window, teleport or added yards. Ordinary movement resumes after contest.

### Visuals

Crest glows after qualifying evasion. Short dragon-shaped burst accompanies next tackle contest within ordinary movement geometry.

### Progression / notes

Owner chose one evasion at all mastery, evolution bonuses 5/10/15 points and mastery bonus 0/3/6/9. Rarity Common at all forms.

### Ability story

Drakling gets more confident whenever a defender misses. It plants its claws and springs into the next challenge. Evolution turns that small burst of confidence into a dragon charge.

## Beast Clash: Dragon Pounce

Ability ID: `DRA-01-C`. Category: Signature action.

Ready own normal action may perform HP-cost enhanced attack if source able and can pay full cost while retaining at least 1 HP. Otherwise ordinary attack preserves readiness.

Dragon Pounce / Damage by form and mastery: Drakling 140/145/150/155%, Drakyra 155/160/165/170%, Dracolossus 170/175/180/185% of normal attack. Ordinary evasion/type/shields/reduction apply. Exclude ordinary-only Striker bonuses.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Ready own normal action may perform HP-cost enhanced attack if source able and can pay full cost while retaining at least 1 HP. Otherwise ordinary attack preserves readiness.

### Targets / placement

Current active enemy. Source pays 10% own maximum HP on launch.

### Core resolution

Damage by form and mastery: Drakling 140/145/150/155%, Drakyra 155/160/165/170%, Dracolossus 170/175/180/185% of normal attack. Ordinary evasion/type/shields/reduction apply. Exclude ordinary-only Striker bonuses.

### Recharge / frequency

Three subsequent owner normal turns cooldown, paused reserve. Full HP cost spent on launch even evaded or shield-absorbed. Source skipped action preserves HP/readiness.

### Lifetime / persistence

Immediate attack and payment. Cooldown state survives rotation under shared persistence rules. No extra attack.

### Exceptions / counterplay

Own Shielded and Guarded cannot reduce payment. Cost is resource debit, not enemy attack damage. Full cost required, source must retain 1 HP. Shared rounding must be reconciled before implementation.

### Visuals

Claws plant, bright outline gathers, then heavy dragon leap. HP cost appears at launch.

### Progression / notes

10% maximum-HP cost fixed all forms/mastery. Damage evolves and improves by mastery. Owner rejected original every-third-attack mechanic. Striker retained.

### Ability story

Drakling throws its whole body into the fight before learning to control its power. The effort wears it down. As it evolves, the same sacrifice produces a heavier strike.
