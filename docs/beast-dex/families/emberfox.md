# Flaroo

**Fire · Common · RB · Clash: Balanced**

[Position comparison](../positions/RB.md) · [Beast Dex](../README.md)

Family ID: `emberfox`. Source labels are not runtime implementation proof.

**Approved build:** Dependable downhill runner.

## Flaroo

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 28–38 | 54–62 | — |
| Agility | 20–30 | 40–50 | — |
| Strength | 32–42 | 58–64 | — |
| Awareness | 25–35 | 50–60 | — |
| Catching | 12–22 | 30–40 | Yes |
| Arm | 5–15 | 15–29 | — |
| Accuracy | 5–15 | 15–29 | — |
| Blocking | 22–32 | 46–56 | — |
| Tackling | 15–25 | 30–44 | — |
| Coverage | 5–15 | 15–29 | — |
| Durability | 33–43 | 59–64 | — |
| Kicking | 5–10 | 10–24 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Blazynx

Stage 1; evolution level 10; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 33–43 | 59–67 | — |
| Agility | 25–35 | 45–55 | — |
| Strength | 37–47 | 63–69 | — |
| Awareness | 30–40 | 55–65 | — |
| Catching | 17–27 | 35–45 | Yes |
| Arm | 10–20 | 20–34 | — |
| Accuracy | 10–20 | 20–34 | — |
| Blocking | 27–37 | 51–61 | — |
| Tackling | 20–30 | 35–49 | — |
| Coverage | 10–20 | 20–34 | — |
| Durability | 38–48 | 64–69 | — |
| Kicking | 5–15 | 15–29 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Infernox

Stage 2; evolution level 20; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 38–48 | 64–72 | — |
| Agility | 30–40 | 50–60 | — |
| Strength | 42–52 | 68–74 | — |
| Awareness | 35–45 | 60–70 | — |
| Catching | 22–32 | 40–50 | — |
| Arm | 15–25 | 25–39 | — |
| Accuracy | 15–25 | 25–39 | — |
| Blocking | 32–42 | 56–66 | — |
| Tackling | 25–35 | 40–54 | — |
| Coverage | 15–25 | 25–39 | — |
| Durability | 43–53 | 69–74 | — |
| Kicking | 10–20 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Blazing Resolve

Ability ID: `FIR-01-F`. Category: Self enhancement.

Conditional charge

Rushing-earned charge; timed tackle-break immunity

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Completed official rushing attempts only. Three qualifying charges ignite for a future rushing carry. No receiving, returns or two-point charge/activation. Positive whole-yard thresholds are in Progression.

### Targets / placement

Self as ball carrier on a rushing attempt

### Core resolution

First eligible tackle starts one live second of automatic tackle breaks, including multiple defenders reaching runner within that window. Charge consumed; consuming carry earns no new charge. Normal strip/fumble rules remain.

### Recharge / frequency

No separate cooldown. No second bar or charging while ignited; resume following carry. Two-point attempts neither charge nor trigger ignition. Existing fields still apply during conversions.

### Lifetime / persistence

Unused ignition and partial charge persist across possessions, halftime and overtime; reset per game; save/reload preserves.

### Exceptions / counterplay

No receiving/return charge or activation. Stuns, fields, forced movement, out of bounds, strips and fumbles still apply.

### Visuals

Visible three-part charge bar above monster; full charge engulfs body in flame.

### Progression / notes

Guaranteed tackle-break window is explicitly approved. Not the legacy Eruption flatten/stun.

## Beast Clash: Stoke the Flame

Ability ID: `FIR-01-C`. Category: Retaliation.

Three incoming attacks survived

Survive three attacks; immediate single-target retaliation

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

One charge per enemy direct-damage attack survived, including HP or shield damage. Multi-hit counts once. Delayed direct attacks count; misses, fully prevented zero damage, damage over time, counters and reactions do not.

### Targets / placement

Triggering attacker; if invalid, current opposing active monster

### Core resolution

At three charges, immediate Fire counterburst outside normal turn; reset charge.

### Recharge / frequency

Three hits, no separate cooldown approved.

### Lifetime / persistence

Retain partial charge through rotations; reset each Clash.

### Exceptions / counterplay

At third charge must survive and be able to act immediately, otherwise consume charge with no queued retaliation. If Stunned blocks counter, consume Stoke charge but NOT Stunned duration. Only normal turns advance status. Invalid attacker redirects to opposing active monster. Counterburst is reaction damage; no reaction chain. Shared status system supersedes old Shock-skip consumption exception.

### Visuals

Three-charge heat indicator and fiery counterburst; detailed choreography pending.

### Progression / notes

Damage scales by form/mastery. No status or splash.
