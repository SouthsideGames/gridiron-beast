# Ferrhorn

**Metal · Rare · TE · Clash: Support**

[Position comparison](../positions/TE.md) · [Beast Dex](../README.md)

Family ID: `metalhorn`. Source labels are not runtime implementation proof.

**Approved build:** Blocking specialist.

## Ferrhorn

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 20–30 | 40–52 | Yes |
| Agility | 20–30 | 40–52 | Yes |
| Strength | 56–66 | 86–94 | — |
| Awareness | 58–68 | 88–94 | — |
| Catching | 32–42 | 60–72 | Yes |
| Arm | 10–20 | 25–39 | — |
| Accuracy | 15–25 | 30–44 | — |
| Blocking | 60–70 | 90–94 | — |
| Tackling | 35–45 | 60–74 | — |
| Coverage | 15–25 | 35–49 | — |
| Durability | 55–65 | 85–94 | — |
| Kicking | 5–15 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Bulwark Grid

Ability ID: `MET-05-F`. Category: Zone.

Ferrhorn; rare; TE; While ready, after own successful receiving first down OR own successful pancake on blocking play, earn one next offensive field.

Non-Metal first changed automatic target/assignment/engagement decision inside Metal per play adopts after one normal AI decision update. Preserve prior valid action until then, otherwise hold stance. Never delay player inputs, normal physics or an already-started route.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Ferrhorn; rare; TE; While ready, after own successful receiving first down OR own successful pancake on blocking play, earn one next offensive field.

### Targets / placement

8-wide by4-long Metal rectangle from upcoming LOS into offense backfield, centered initial QB lateral alignment.

### Core resolution

Non-Metal first changed automatic target/assignment/engagement decision inside Metal per play adopts after one normal AI decision update. Preserve prior valid action until then, otherwise hold stance. Never delay player inputs, normal physics or an already-started route.

### Recharge / frequency

Cooldown 6 / 5 / 4 / 3 offensive plays after creation. Max one pending.

### Lifetime / persistence

Pending carries halftime; created rare field clears half. No activation on failed catch or ordinary block hold.

### Exceptions / counterplay

Metal TE unaffected; own non-Metal QB/blockers risk delayed reactions. Does not delay player input or forced pass.

### Visuals

Four iron corner posts paint floor grid without physical obstruction.

### Progression / notes

Life 1 / 1 / 2 / 2 offensive scrimmage plays including spawn. Approved OL-to-TE reassignment requires permanent profile authoring later; reaction modifier needs snap-decision classification.

## Beast Clash: Shield Wall

Ability ID: `MET-05-C`. Category: Signature action.

Ferrhorn; rare; TE; Clash archetype Support → Support. Ready own normal action replaces attack when a living RESERVE ally has empty status slot.

Shield Wall: Attempt Shielded12 / 15 / 18 / 21% target maxHP by mastery for3 recipient normal turns. No healing, cleanse or active target option.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Ferrhorn; rare; TE; Clash archetype Support → Support. Ready own normal action replaces attack when a living RESERVE ally has empty status slot.

### Targets / placement

Reserve ally with lowest current HP percentage, stable lineup tie.

### Core resolution

Attempt Shielded12 / 15 / 18 / 21% target maxHP by mastery for3 recipient normal turns. No healing, cleanse or active target option.

### Recharge / frequency

Cooldown5 owner turns; app turn excluded.

### Lifetime / persistence

Reserve pauses status; on football transition one fumble save for remaining plays. Return to Clash cannot refill previously depleted pool (G09).

### Exceptions / counterplay

Existing other status blocks; at least one eligible target or ordinary attack preserve. Once cap rules apply, no refill equal strength.

### Visuals

Ferrhorn folds a steel panel into selected reserve pedestal; standard Shielded badge.

### Progression / notes

Shielded12/15/18/21% target maximum HP, three recipient turns. Preserve source pool, remaining fraction, episode application history and spent fumble-save state across mode changes. A football fumble save consumes whole episode. First football-created shield starts full fraction1, then source-defined Clash pool scales by saved fraction. Duration extension never refills. Legitimate stronger replacement follows existing stronger-status rule.
