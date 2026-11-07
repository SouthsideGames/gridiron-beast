# Umbrikit

**Dark · Common · CB · Clash: Balanced**

[Position comparison](../positions/CB.md) · [Beast Dex](../README.md)

Family ID: `shadowkit`. Source labels are not runtime implementation proof.

**Approved build:** Interception specialist.

## Umbrikit

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 18–28 | 38–48 | Yes |
| Agility | 28–38 | 48–58 | — |
| Strength | 8–18 | 23–33 | Yes |
| Awareness | 38–48 | 63–67 | — |
| Catching | 38–48 | 63–67 | — |
| Arm | 8–18 | 18–32 | — |
| Accuracy | 13–23 | 23–37 | — |
| Blocking | 8–18 | 23–37 | — |
| Tackling | 8–18 | 23–33 | Yes |
| Coverage | 33–43 | 58–66 | — |
| Durability | 23–33 | 43–53 | — |
| Kicking | 3–13 | 13–27 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Obscurat

Stage 1; evolution level 12; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 25–35 | 45–55 | — |
| Agility | 35–45 | 55–65 | — |
| Strength | 15–25 | 30–40 | Yes |
| Awareness | 45–55 | 70–74 | — |
| Catching | 45–55 | 70–74 | — |
| Arm | 15–25 | 25–39 | — |
| Accuracy | 20–30 | 30–44 | — |
| Blocking | 15–25 | 30–44 | — |
| Tackling | 15–25 | 30–40 | Yes |
| Coverage | 40–50 | 65–73 | — |
| Durability | 30–40 | 50–60 | — |
| Kicking | 10–20 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Shadow Patch

Ability ID: `DAR-01-F`. Category: Zone.

Umbrikit; common; CB; After own pass breakup while ready, bank field for next defensive scrimmage pre-choice. Interceptions excluded.

DAR-01-F: Shadow Patch; Non-Dark on both teams -15 / -20% effective Awareness by Umbrikit / Obscurat while inside. Essential ball/controls truthful.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Umbrikit; common; CB; After own pass breakup while ready, bank field for next defensive scrimmage pre-choice. Interceptions excluded.

### Targets / placement

6-wide by 6-long Dark rectangle centered at upcoming LOS plus 5-yard LB reference, lateral at breakup location projected into new snap.

### Core resolution

Non-Dark on both teams -15 / -20% effective Awareness by Umbrikit / Obscurat while inside. Essential ball/controls truthful.

### Recharge / frequency

Cooldown 5 defensive plays fixed after creation; cannot bank during cooldown.

### Lifetime / persistence

Pending carries halves/possessions; created field clears halftime; no reanchor after creation.

### Exceptions / counterplay

No Confused status or auto-route error; ordinary Awareness formulas operate. Dark monsters receive no effect.

### Visuals

Low translucent violet shadow with clear edge; ball and routes remain readable.

### Progression / notes

Lifetime 1 / 1 / 2 / 2 defensive scrimmage plays including spawn. Requires Dark modifier consumers in reads/reactions with stored stats unchanged.

## Beast Clash: Shadow Pounce

Ability ID: `DAR-01-C`. Category: Clash ability.

First enemy normal-action attack, including an enhanced normal attack, whose entire attack misses the active, able source triggers a counter after the whole attack. Counters and reactions never qualify.

DAR-01-C: Shadow Pounce; Counter at 70 / 80% normal damage by Umbrikit / Obscurat, standard evasion/type/shields; not ordinary attack for archetype perks.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

First enemy normal-action attack, including an enhanced normal attack, whose entire attack misses the active, able source triggers a counter after the whole attack. Counters and reactions never qualify.

### Targets / placement

Same attacker if still active and alive; no target replacement.

### Core resolution

Counter at 70 / 80% normal damage by Umbrikit / Obscurat, standard evasion/type/shields; not ordinary attack for archetype perks.

### Recharge / frequency

One counter per Clash, committed at eligible miss; no passive guaranteed dodge is granted.

### Lifetime / persistence

If unable at reaction point, preserve use; no queue. No carry from actual Clash to another Clash.

### Exceptions / counterplay

Multi-hit move qualifies only if EVERY hit misses; shield absorption is not miss. No reaction to counters or own Confused self-hit.

### Visuals

Shadow crouches then lunges back along attack trail.

### Progression / notes

Counter power +0 / +5 / +10 / +15 percentage points by mastery. Needs completed-attack all-miss event, counter recursion guard and one-use state.
