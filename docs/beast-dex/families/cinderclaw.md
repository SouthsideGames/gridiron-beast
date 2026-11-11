# Scorchulk

**Fire · Uncommon · DL · Clash: Balanced**

[Position comparison](../positions/DL.md) · [Beast Dex](../README.md)

Family ID: `cinderclaw`. Source labels are not runtime implementation proof.

**Approved build:** Power pass rusher.

## Scorchulk

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 25–35 | 48–60 | Yes |
| Agility | 42–52 | 70–80 | — |
| Strength | 52–62 | 80–84 | — |
| Awareness | 27–37 | 50–62 | Yes |
| Catching | 15–25 | 30–44 | — |
| Arm | 10–20 | 25–39 | — |
| Accuracy | 5–15 | 20–34 | — |
| Blocking | 20–30 | 40–54 | — |
| Tackling | 50–60 | 78–84 | — |
| Coverage | 10–20 | 25–39 | — |
| Durability | 44–54 | 72–82 | — |
| Kicking | 5–15 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Ember Grip — Scorch Mark

Ability ID: `FIR-04-F`. Category: Targeted effect.

Immediate first blocking engagement while ready

Pair-specific effective Strength and Blocking debuff

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Marks first blocker engaged while ready.

### Targets / placement

That blocker, against this Scorchulk only

### Core resolution

Reduce marked blocker’s effective Strength and Blocking by mastery percentage only in engagements versus this Scorchulk. Never alter stored ratings or other matchups. No separate push-speed bonus.

### Recharge / frequency

Three defensive plays: fires 1, unavailable 2–4, ready 5; one marked blocker per activation.

### Lifetime / persistence

Rest of play, including disengage and re-engage; clear at whistle.

### Exceptions / counterplay

Does not weaken blocker against any other defender.

### Visuals

Visible glowing claw marks on affected blocker.

### Progression / notes

Strength and Blocking reductions both 10/12/14/16%. Shared engine change: displacement is Strength-based; holding uses Blocking versus defender Agility, with LB Strength-based shed exception. No guaranteed release/push.

## Beast Clash: Molten Brand

Ability ID: `FIR-04-C`. Category: Retaliation mark.

First successful direct attack while ready

Two-use attached damage-triggered reaction mark

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

First successful normal direct attack while ready brands target alongside normal damage. HP or shield damage qualifies; multi-hit once; no counters/reactions, misses or fully prevented zero-damage application.

### Targets / placement

Branded opponent

### Core resolution

Branded opponent dealing HP or shield direct-attack damage to Scorchulk triggers one Fire eruption, consuming one of two charges. Includes delayed direct attacks. Multi-hit counts once; no damage-over-time/counter/reaction trigger. Eruption is reaction damage and triggers no retaliation.

### Recharge / frequency

Once per Clash; cannot reapply.

### Lifetime / persistence

Molten Brand remains for FOUR subsequent marked TARGET NORMAL TURNS or until its two reaction charges consumed. Application turn excluded; Stunned skips count; reserve time pauses. Target rotation retains mark. Existing lethal-hit reaction and owner-KO cleanup remain as approved. Old four-full-exchange clock superseded.

### Exceptions / counterplay

No damage-over-time/counter/reaction trigger; eruption itself cannot trigger retaliation. Lethal hit still erupts, then remaining charge disappears; settle both knockouts before winner.

### Visuals

Visible two-charge brand and localized flame eruption.

### Progression / notes

20/25/30/35% normal attack damage per eruption.
