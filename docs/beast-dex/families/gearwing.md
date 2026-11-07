# Coglet

**Metal · Uncommon · K · Clash: Balanced**

[Position comparison](../positions/K.md) · [Beast Dex](../README.md)

Family ID: `gearwing`. Source labels are not runtime implementation proof.

**Approved build:** Reliable all-round kicker.

## Coglet

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 30–40 | 55–65 | — |
| Agility | 30–40 | 55–65 | — |
| Strength | 15–25 | 35–49 | — |
| Awareness | 37–47 | 65–75 | — |
| Catching | 20–30 | 40–54 | — |
| Arm | 10–20 | 25–39 | — |
| Accuracy | 15–25 | 30–44 | — |
| Blocking | 15–25 | 35–49 | — |
| Tackling | 15–25 | 35–49 | — |
| Coverage | 10–20 | 30–44 | — |
| Durability | 40–50 | 68–78 | — |
| Kicking | 52–62 | 80–84 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Gear Grid

Ability ID: `MET-03-F`. Category: Zone.

Coglet; uncommon; K; After own punt of at least35 net yards that is not touchback, bank next opponent scrimmage Metal field.

Non-Metal first changed automatic target/assignment/engagement decision inside Metal per play adopts after one normal AI decision update. Preserve prior valid action until then, otherwise hold stance. Never delay player inputs, normal physics or an already-started route.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Coglet; uncommon; K; After own punt of at least35 net yards that is not touchback, bank next opponent scrimmage Metal field.

### Targets / placement

10-wide by 6-long at upcoming opponent LOS plus5 LB depth, centered ball lateral position.

### Core resolution

Non-Metal first changed automatic target/assignment/engagement decision inside Metal per play adopts after one normal AI decision update. Preserve prior valid action until then, otherwise hold stance. Never delay player inputs, normal physics or an already-started route.

### Recharge / frequency

No extra cooldown; one pending token and max one own field.

### Lifetime / persistence

Punt return completes BEFORE next snap geometry. Pending carries halftime; created nonlegendary field clears half.

### Exceptions / counterplay

No bounce/roll simulation assumed. Net yards measured final opponent spot; legal source kicker role retained.

### Visuals

Clockwork lines assemble a flat iron grid under LB band; slow gear-turn particles.

### Progression / notes

Life 1 / 2 / 2 / 3 defensive scrimmage plays including spawn. Needs punt final-spot/net-distance event, current return sim sufficient without bounce physics.

## Beast Clash: Gear Shot

Ability ID: `MET-03-C`. Category: Signature action.

Coglet; uncommon; K; Clash archetype Balanced → Balanced. Every performed normal attack.

Gear Shot: Clamp random base-damage variance floor to0.95 / 1.00 / 1.05 / 1.10 by mastery, never above configured upper variance. Evasion, type, shield, Guarded/Tank and critical system if any remain ordinary.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Coglet; uncommon; K; Clash archetype Balanced → Balanced. Every performed normal attack.

### Targets / placement

Current active target.

### Core resolution

Clamp random base-damage variance floor to0.95 / 1.00 / 1.05 / 1.10 by mastery, never above configured upper variance. Evasion, type, shield, Guarded/Tank and critical system if any remain ordinary.

### Recharge / frequency

Passive no cooldown; no extra attack or status.

### Lifetime / persistence

No buildup or persistent buff. Variance evaluated per own normal attack, not reactions/special type move.

### Exceptions / counterplay

Does not guarantee hit, minimum HP damage or favorable type. Confused redirect still uses clamped variance.

### Visuals

Gears align before shot; stable damage number with small gear accent, no badge.

### Progression / notes

Floor 0.95 / 1.00 / 1.05 / 1.10 by mastery (supersedes 1.00 example); never exceeds configured upper variance. Need damage-variance stage exposed and clamp before type/DR; preserve seeded RNG consumption even when clamped.
