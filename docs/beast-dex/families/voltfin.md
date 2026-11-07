# Volcoil

**Electric · Common · RB · Clash: Balanced**

[Position comparison](../positions/RB.md) · [Beast Dex](../README.md)

Family ID: `voltfin`. Source labels are not runtime implementation proof.

**Approved build:** Receiving back.

## Volcoil

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 35–45 | 60–67 | — |
| Agility | 32–42 | 57–65 | — |
| Strength | 15–25 | 33–43 | Yes |
| Awareness | 25–35 | 50–60 | — |
| Catching | 37–47 | 62–67 | — |
| Arm | 10–20 | 23–37 | — |
| Accuracy | 10–20 | 23–37 | — |
| Blocking | 13–23 | 33–41 | Yes |
| Tackling | 10–20 | 23–37 | — |
| Coverage | 15–25 | 28–42 | — |
| Durability | 22–32 | 47–57 | — |
| Kicking | 8–18 | 18–32 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Eelectra

Stage 1; evolution level 12; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 42–52 | 67–74 | — |
| Agility | 39–49 | 64–72 | — |
| Strength | 22–32 | 40–50 | — |
| Awareness | 32–42 | 57–67 | — |
| Catching | 44–54 | 69–74 | — |
| Arm | 17–27 | 30–44 | — |
| Accuracy | 17–27 | 30–44 | — |
| Blocking | 20–30 | 40–48 | — |
| Tackling | 17–27 | 30–44 | — |
| Coverage | 22–32 | 35–49 | — |
| Durability | 29–39 | 54–64 | — |
| Kicking | 15–25 | 25–39 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Charge Strip

Ability ID: `ELE-02-F`. Category: Zone.

Rushing first down earns next-snap field

Rushing-first-down token creates LOS-to-LB Electric rectangle on next offensive snap

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Personally earn a rushing first down while ready; touchdowns, receptions, returns and two-point attempts do not qualify. Earn one pending token.

### Targets / placement

Next participating offensive scrimmage pre-play: eight yards sideline-to-sideline by five yards longitudinal, from LOS to the fixed five-yard LB reference. Lateral center uses Volcoil’s initial alignment; shift inward to preserve width and apply normal field boundaries.

### Core resolution

Electric zone: Volcoil 20%, Eelectra 30% chance to apply Stunned on each non-Electric monster’s first entry that play. Starting inside counts; one roll per monster, no re-entry reroll. Both teams affected, Electric immune, no total stun cap.

### Recharge / frequency

Cooldown 5 / 4 / 3 / 2 subsequent offensive plays, starts at spawn. Cannot earn another token during the spawn play.

### Lifetime / persistence

One completed play INCLUDING spawn. Accepted Stunned lasts the remainder of that play and clears at whistle. Pending max one carries possession and halftime; actual game end clears it. Nonlegendary field follows normal halftime clearing.

### Exceptions / counterplay

Normal shared status application gate. Field exposure is environmental; an accepted Stunned application is a shared status. No damage or additional attribute penalty.

### Visuals

Two electrical nodes at rectangle edges, readable ground arcs and boundary. Reveal before both teams select plays, then lock placement.

### Progression / notes

Rectangles and squares are legal zone shapes. Duration and stun chance do not scale with mastery; cooldown does.

## Beast Clash: Arc Rebound

Ability ID: `ELE-02-C`. Category: Miss redirection.

Ordinary normal attack evaded while ready

Evaded normal attack redirects once to first living reserve enemy

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

While ready, an ordinary normal attack is evaded by normal dodge, decoy or applicable miss effect. A shield absorbing a connected attack is not a miss.

### Targets / placement

Redirect once at the first living enemy reserve in stable lineup order. No eligible reserve: preserve readiness; do not store damage.

### Core resolution

Rebound deals 60% of normal attack damage for Volcoil, 75% for Eelectra. New target resolves its own normal type, damage reduction, shield and evasion checks. A second miss ends the sequence.

### Recharge / frequency

Cooldown 5 / 4 / 3 / 2 subsequent owner normal turns, starts at launch even if rebound misses. Stunned skipped normal turns count; reserve and reaction events pause.

### Lifetime / persistence

No stored rebound or recursive redirection. Ordinary original attack retains its normal resource accounting.

### Exceptions / counterplay

Rebound is reaction damage: no retaliation chain, extra normal turn, charge consumption, normal attack-counter progress or ordinary-only offensive archetype perks. Do not consume original attack resources twice.

### Visuals

Missed bolt curves sharply toward the reserve target.

### Progression / notes

Balanced archetype retained. Different trigger and target from knockout-earned Victory Surge and voluntary-exit Riptide Pursuit.
