# Crustank

**Water · Uncommon · DL · Clash: Tank**

[Position comparison](../positions/DL.md) · [Beast Dex](../README.md)

Family ID: `reefclaw`. Source labels are not runtime implementation proof.

**Approved build:** Endurance run stopper.

## Crustank

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 15–25 | 35–47 | Yes |
| Agility | 20–30 | 40–52 | Yes |
| Strength | 50–60 | 78–84 | — |
| Awareness | 49–59 | 77–84 | — |
| Catching | 15–25 | 30–44 | — |
| Arm | 5–15 | 20–34 | — |
| Accuracy | 5–15 | 20–34 | — |
| Blocking | 25–35 | 45–59 | — |
| Tackling | 44–54 | 72–82 | — |
| Coverage | 15–25 | 30–44 | — |
| Durability | 52–62 | 80–84 | — |
| Kicking | 5–15 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Pressure Drain

Ability ID: `WAT-03-F`. Category: Targeted effect.

First block engagement when ready

Immediate current-stamina-point drain from blocker

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

First block engagement while ready; immediate trigger, not prolonged contact.

### Targets / placement

One engaged opposing blocker per activation.

### Core resolution

Subtract 5/10/15/20 CURRENT STAMINA POINTS by mastery, bounded at zero. Permanent Durability determines starting/MAX stamina 1:1: 90 Durability -> 90 points. Temporary Durability modifiers do not resize pool. Drain does not reduce Durability or get resisted by higher Durability.

### Recharge / frequency

Three subsequent defensive plays; one blocker per activation.

### Lifetime / persistence

Stamina loss lasts until approved halftime recovery; depletion can trigger game-long Exhaustion. No timed debuff or shared status.

### Exceptions / counterplay

Not Afflicted, not a percentage drain and not injury damage. See Rules for stamina capacity, halftime-only recovery, low-stamina indicator and 0-stamina penalty. Normal play cost remains provisional pending testing.

### Visuals

Drain feedback plus low-stamina battery indicator at or below 25% capacity; indicator alternates with shared status/recharge displays.

### Progression / notes

Standalone Uncommon; no evolution. Drain points Developing 5, Practiced 10, Expert 15, Mastered 20.

## Beast Clash: Shell Renewal

Ability ID: `WAT-03-C`. Category: Tank.

Automatic harmful status received or active entry

Once-per-Clash automatic harmful-status shedding attempt

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

While active: trigger after harmful status applies, or enter active already harmful, if unused. Automatic and can trigger while Stunned. No trigger for beneficial/no status.

### Targets / placement

Self only; entire active harmful shared status.

### Core resolution

Remove removable harmful status, including all stacked duration/applications. NO heal, shield or bonus attack. Uncleansable status remains but ATTEMPT SPENDS the sole use.

### Recharge / frequency

ONCE per separate Clash, all mastery levels. No action cost. No forced numerical mastery scaling.

### Lifetime / persistence

Immediate cleanse attempt; ready again in separate Clash. No reserve-time cleanse.

### Exceptions / counterplay

Uncleansable failure consumes use; independent damage/effects from incoming ability still resolve. Shared lifecycle otherwise unchanged.

### Visuals

On success, harmful-status badge cracks, breaks apart and disappears. On failure, badge remains. No protective shell barrier.

### Progression / notes

Tank retained. Simplicity exception: identical effect/use limit at all mastery levels.
