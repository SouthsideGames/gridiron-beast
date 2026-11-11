# Spriglet

**Nature · Common · WR · Clash: Support**

[Position comparison](../positions/WR.md) · [Beast Dex](../README.md)

Family ID: `thornkit`. Source labels are not runtime implementation proof.

**Approved build:** Technical route runner.

## Spriglet

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 22–32 | 42–52 | — |
| Agility | 34–44 | 59–64 | — |
| Strength | 10–20 | 30–40 | Yes |
| Awareness | 34–44 | 59–64 | — |
| Catching | 30–40 | 55–63 | — |
| Arm | 5–15 | 15–29 | — |
| Accuracy | 10–20 | 20–34 | — |
| Blocking | 18–28 | 38–50 | Yes |
| Tackling | 15–25 | 25–39 | — |
| Coverage | 20–30 | 30–44 | — |
| Durability | 25–35 | 50–60 | — |
| Kicking | 5–10 | 10–24 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Floracat

Stage 1; evolution level 10; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 27–37 | 47–57 | — |
| Agility | 39–49 | 64–69 | — |
| Strength | 15–25 | 35–45 | Yes |
| Awareness | 39–49 | 64–69 | — |
| Catching | 35–45 | 60–68 | — |
| Arm | 10–20 | 20–34 | — |
| Accuracy | 15–25 | 25–39 | — |
| Blocking | 23–33 | 43–55 | — |
| Tackling | 20–30 | 30–44 | — |
| Coverage | 25–35 | 35–49 | — |
| Durability | 30–40 | 55–65 | — |
| Kicking | 5–15 | 15–29 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Sylvanyx

Stage 2; evolution level 20; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 32–42 | 52–62 | — |
| Agility | 44–54 | 69–74 | — |
| Strength | 20–30 | 40–50 | — |
| Awareness | 44–54 | 69–74 | — |
| Catching | 40–50 | 65–73 | — |
| Arm | 15–25 | 25–39 | — |
| Accuracy | 20–30 | 30–44 | — |
| Blocking | 28–38 | 48–60 | — |
| Tackling | 25–35 | 35–49 | — |
| Coverage | 30–40 | 40–54 | — |
| Durability | 35–45 | 60–70 | — |
| Kicking | 10–20 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Bloom Break

Ability ID: `NAT-01-F`. Category: Zone.

Designed route cut earns next-play patches

Two seeded random Nature patches earned by designated route cut

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

First designated route cut of at least 45 degrees while ready; incidental steering does not qualify. Route-running passing plays; no returns/two-point/block assignments.

### Targets / placement

Before play selection use initial pre-play formation snapshot. Create TWO recorded random, non-overlapping 6-yard-wide x 4-yard-long rectangles between initial defensive line and FIXED safety-reference depth 12 yards beyond upcoming LOS. Use that reference even if actual safeties differ or none exist. Both teams see patches before choosing plays; later changes never move/reroll them. Near goal line extend eligible band toward end line just enough to fit, within playable bounds.

### Core resolution

Nature environmental modifier: maximum turning rate reduction Spriglet 15%, Floracat 20%, Sylvanyx 25%. Straight speed/acceleration and other Agility uses unchanged. Both teams affected except Nature types. No physical vine obstacles/shared status.

### Recharge / frequency

Cooldown 5/4/3/2 subsequent OFFENSIVE plays by mastery, starts on spawn. Spawn play cannot earn new activation. One pending activation; wait through punts/possession changes.

### Lifetime / persistence

Pending activation: at most ONE; wait through punts, possession changes and halftime. Spawned patches last ONE completed play INCLUDING spawn play, all outcomes, then clear whistle. No bonus attempt after incompletion. No new token earned on spawn play or while cooldown/pending activation prevents eligibility.

### Exceptions / counterplay

Show recorded placement to BOTH teams before choosing plays. Fixed pre-play formation snapshot and safety reference12yards; later defensive changes cannot reroll/move patches. Two patches must not overlap each other. Nature immunity and normal field overlap rules apply.

### Visuals

Shoots emerge directly from ground into clearly outlined vegetation; no falling seeds. Both offense and defense see patches.

### Progression / notes

Common WR family, Support Clash. Form turning 15/20/25%; mastery cooldown 5/4/3/2. Does not use old immediate cut-centered patch.

## Beast Clash: Second Spring

Ability ID: `NAT-01-C`. Category: Support.

Next eligible normal turn revives first knocked-out ally

Once-per-Clash ally revival to back reserve without refreshing uses

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Unused ability, own normal turn able to act, at least one knocked-out ally. Automatically revive earliest knocked-out ally still down; otherwise ordinary attack and preserve use.

### Targets / placement

One ally, not self. Return at BACK OF RESERVE, no immediate action. Cannot activate after Clash ended.

### Core resolution

Replace attack; restore max-HP percentage by form/mastery. Distinct revival NOT ordinary healing; Healing Reduced does not block. KO cleared target status already. Restore HP only; no shield/charges/cooldown reset/ability-use refresh.

### Recharge / frequency

ONCE per separate Clash, across all entries. Stunned skip cannot activate and does not spend use.

### Lifetime / persistence

Instant revival; resumed monster may later KO normally. Retain spent once-use flags and existing progression; revive runtime KO state, not roster duplication.

### Exceptions / counterplay

No self-revival after final KO. Preserve source/target uses through revival. Exact prior KO ordering/stable tie rule and turn scheduling require deterministic engine hooks.

### Visuals

Seed beneath fallen monster; glowing flower bud closes, blossoms open, ally returns reserve. No extra status.

### Progression / notes

Spriglet HP 10/12/14/16%; Floracat 15/17/19/21%; Sylvanyx 20/22/24/26%. Keep Support.
