# Murklaw

**Dark · Uncommon · LB · Clash: Striker**

[Position comparison](../positions/LB.md) · [Beast Dex](../README.md)

Family ID: `mireclaw`. Source labels are not runtime implementation proof.

**Approved build:** Pass-rushing linebacker.

## Murklaw

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 50–60 | 78–84 | — |
| Agility | 51–61 | 79–84 | — |
| Strength | 50–60 | 78–84 | — |
| Awareness | 22–32 | 45–57 | Yes |
| Catching | 10–20 | 30–44 | Yes |
| Arm | 10–20 | 25–39 | — |
| Accuracy | 5–15 | 20–34 | — |
| Blocking | 25–35 | 45–59 | — |
| Tackling | 45–55 | 73–83 | — |
| Coverage | 15–25 | 35–49 | Yes |
| Durability | 37–47 | 65–75 | — |
| Kicking | 5–15 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Ambush Tag

Ability ID: `DAR-04-F`. Category: Targeted effect.

Three own participating defensive scrimmage plays allowing at most 4 net yards fill the bar, maximum one credit per play. Incompletions and losses qualify. Touchdowns, special teams and two-point plays do not.

DAR-04-F: Ambush Tag; At snap launch shadow claw attempting Weakened Strength reduction15 / 20 / 25 / 30% by mastery for CURRENT play on selected RB. No damage, movement pull or tackle guarantee.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Three own participating defensive scrimmage plays allowing at most 4 net yards fill the bar, maximum one credit per play. Incompletions and losses qualify. Touchdowns, special teams and two-point plays do not.

### Targets / placement

Next participating defensive pre-choice selects opposing RB by stable lineup. If no RB, hold full charge.

### Core resolution

At snap launch shadow claw attempting Weakened Strength reduction15 / 20 / 25 / 30% by mastery for CURRENT play on selected RB. No damage, movement pull or tackle guarantee.

### Recharge / frequency

Charge threshold 3 fixed, empties on launch even blocked. Activation play cannot recharge.

### Lifetime / persistence

Partial/full bar carries halves and possessions. Application ends whistle; no seconds duration.

### Exceptions / counterplay

Only if target participates, source able. Selection visible both sides; offense can pass. No QB-target fallback.

### Visuals

Three scratch marks fill bar; snap shadow claw grips target silhouette briefly then standard fist badge.

### Progression / notes

Strength reduction 15 / 20 / 25 / 30% by mastery. Needs team-gain charge rules and per-play target snapshot / shared status attempt.

## Beast Clash: Ambush

Ability ID: `DAR-04-C`. Category: Clash ability.

Murklaw; uncommon; LB; Clash archetype Striker → Striker. First ACTIVE entry per Clash including opening lineup arms one bonus on next performed normal attack.

DAR-04-C: Ambush; Attack at130 / 145 / 160 / 175% normal damage by mastery if HP still at least75% max; otherwise ordinary attack preserves armed state until eligible or Clash end.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Murklaw; uncommon; LB; Clash archetype Striker → Striker. First ACTIVE entry per Clash including opening lineup arms one bonus on next performed normal attack.

### Targets / placement

Current enemy active at that action, no entry damage.

### Core resolution

Attack at130 / 145 / 160 / 175% normal damage by mastery if HP still at least75% max; otherwise ordinary attack preserves armed state until eligible or Clash end.

### Recharge / frequency

One empowered attempt per Clash; once fired spent even evaded. Rotation/revival does not reset.

### Lifetime / persistence

Armed entry state pauses in reserve. No healing or shield automatically granted.

### Exceptions / counterplay

Opponent can chip source below threshold. Boost is special attack, no ordinary-only archetype stacking. Normal evasion / defense.

### Visuals

A crouched shadow marker remains on ability panel; attack emerges in one large claw.

### Progression / notes

Power 130 / 145 / 160 / 175% by mastery. Need first-entry ledger and high-HP evaluation at action commit.
