# Mossmaw

**Nature · Common · DL · Clash: Balanced**

[Position comparison](../positions/DL.md) · [Beast Dex](../README.md)

Family ID: `mossclaw`. Source labels are not runtime implementation proof.

**Approved build:** Mobile pass rusher.

## Mossmaw

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 37–47 | 62–67 | — |
| Agility | 38–48 | 63–67 | — |
| Strength | 13–23 | 33–43 | Yes |
| Awareness | 22–32 | 47–57 | — |
| Catching | 18–28 | 33–47 | — |
| Arm | 8–18 | 18–32 | — |
| Accuracy | 3–13 | 13–27 | — |
| Blocking | 13–23 | 28–42 | — |
| Tackling | 30–40 | 55–65 | — |
| Coverage | 18–28 | 33–47 | — |
| Durability | 13–23 | 33–43 | Yes |
| Kicking | 3–13 | 13–27 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Fungorilla

Stage 1; evolution level 14; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 44–54 | 69–74 | — |
| Agility | 45–55 | 70–74 | — |
| Strength | 20–30 | 40–50 | — |
| Awareness | 29–39 | 54–64 | — |
| Catching | 25–35 | 40–54 | — |
| Arm | 15–25 | 25–39 | — |
| Accuracy | 10–20 | 20–34 | — |
| Blocking | 20–30 | 35–49 | — |
| Tackling | 37–47 | 62–72 | — |
| Coverage | 25–35 | 40–54 | — |
| Durability | 20–30 | 40–50 | — |
| Kicking | 10–20 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Vine Vault

Ability ID: `NAT-02-F`. Category: Special action.

First single-block pass-rush engagement

Contested vault to legal spot beyond engaged blocker

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

DL rushing quarterback on passing play only. First single-block engagement while ready; not run defense.

### Targets / placement

Engaged blocker; nearest clear landing immediately beyond blocker toward offensive backfield. If no clear legal landing, do not attempt/spend readiness.

### Core resolution

Normal intended DL Agility versus blocker Blocking shed contest. On success vault past blocker; resume ordinary pursuit. On failure stay engaged normally. No attribute boost, bonus speed, automatic sack/stumble/knockdown.

### Recharge / frequency

5/4/3/2 subsequent defensive-play cooldown by mastery; failed attempted vault spends activation. Same mechanic both forms.

### Lifetime / persistence

One live vault and landing, no lingering field/status. During airborne traversal IGNORE OTHER BLOCKING COLLISIONS until landing; applicable disabling effects can still interrupt. After landing resume normal pursuit and ordinary blocking/status interactions. This is not general damage/status invulnerability.

### Exceptions / counterplay

Can bypass Deep Roots; does NOT consume its first-ordinary-shed protection. Ignore blocking collisions while airborne, not disabling effects. No bonus Speed, guaranteed sack or universal invulnerability. Legal clear destination required before attempt; no destination -> preserve readiness.

### Visuals

Crouch, two short supporting vines, visible arc over blocker, leafy landing; vines retract. Larger Fungorilla visual, same rules.

### Progression / notes

Common DL -> Fungorilla level 14; Balanced Clash. Speed-boost option explicitly withdrawn by owner.

## Beast Clash: Spore Detonation

Ability ID: `NAT-02-C`. Category: Balanced.

Ready normal attack against removable harmful status

Consume enemy harmful status duration for immediate bonus damage

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Own normal attack when ready and opposing active has removable harmful status. Otherwise ordinary attack, preserve readiness; uncleansable status not consumed.

### Targets / placement

Opposing active monster and its entire harmful shared status, all stacked remaining duration.

### Core resolution

Snapshot existing harmful status and remaining turns before attack. Calculate connected attack damage WITH existing status: +10% per remaining turn Mossmaw or15% Fungorilla, max3 counted turns. After connected damage, remove entire harmful status BEFORE retaliation. Evasion prevents removal/damage and spends readiness. No new status or attribute change.

### Recharge / frequency

Cooldown 5/4/3/2 subsequent OWN NORMAL turns; exclude application turn; Stunned skips count, reserve pauses.

### Lifetime / persistence

Immediate single attack. At 3 counted turns total damage 130% Mossmaw, 145% Fungorilla. No lingering mark.

### Exceptions / counterplay

Only removable harmful status eligible. Uncleansable/no status -> ordinary attack, preserve readiness. Connected shield-absorbed hit eligible if such state legally exists; shared slot ordinarily prevents Shielded+harmful coexistence. Snapshot duration for bonus; calculate damage with old status, then remove before eligible retaliation.

### Visuals

Claw scatters mushrooms over target; spores swell/burst; harmful badge breaks apart. No field.

### Progression / notes

Balanced retained. Fixed per-form conversion; mastery cooldown only. Prior Spore Swipe retaliation-heal replaced.
