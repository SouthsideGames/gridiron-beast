# Pyronix

**Fire · Uncommon · QB · Clash: Striker**

[Position comparison](../positions/QB.md) · [Beast Dex](../README.md)

Family ID: `firestorm`. Source labels are not runtime implementation proof.

**Approved build:** Strong-arm passer.

## Pyronix

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 30–40 | 54–64 | Yes |
| Agility | 34–44 | 58–68 | Yes |
| Strength | 40–50 | 65–77 | — |
| Awareness | 35–45 | 66–76 | — |
| Catching | 20–30 | 40–54 | — |
| Arm | 58–68 | 80–84 | — |
| Accuracy | 48–58 | 76–84 | — |
| Blocking | 15–25 | 35–49 | — |
| Tackling | 20–30 | 40–54 | — |
| Coverage | 12–22 | 30–44 | — |
| Durability | 46–56 | 72–84 | — |
| Kicking | 10–20 | 25–39 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Meteor Impact

Ability ID: `FIR-03-F`. Category: Special action.

Eligible powered pass release

Deep completed catch; opponent-only radial push

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Forward pass targeted at least 15 yards beyond line of scrimmage while ready; commit on release.

### Targets / placement

Opponents within 3 yards of teammate completed catch

### Core resolution

Completed teammate catch releases outward shockwave; no effect on tips, drops or interceptions.

### Recharge / frequency

Three completed offensive scrimmage plays: fires 1, unavailable 2–4, ready 5. Commit at powered release even on failure. Two-point attempts neither activate nor advance cooldown.

### Lifetime / persistence

Instant bounded displacement; no lingering zone.

### Exceptions / counterplay

No stun or knockdown. Resistance reduces displacement. No ball trajectory change or forced fumble. Teammates unaffected.

### Visuals

Flaming powered pass; visible expanding shockwave synchronized to catch.

### Progression / notes

Mastery increases max push 1/1.25/1.5/1.75 yards.

## Beast Clash: Falling Star

Ability ID: `FIR-03-C`. Category: Delayed attack.

Normal action replaced by launch

Delayed slot meteor; independent team-wide splash hits

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Launch meteor in place of normal attack, once per Clash.

### Targets / placement

Mark the normal target lineup position, not combatant identity; normally the opposing front. Current occupant takes main hit. Every OTHER living opponent, including reserves, takes splash. Empty main slot: splash still hits every living opponent.

### Core resolution

Impact at end of following exchange after rotations. Freeze target identities/order when impact begins: marked occupant first, then other living opponents front-to-back. Resolve each target’s eligible reactions immediately after its hit before next target. Remaining meteor hits persist if retaliation knocks Pyronix out.

### Recharge / frequency

Once per Clash; one meteor in flight per owner.

### Lifetime / persistence

**Approved Task 8 rule (N9d):** N9d: preserve the approved launch, charge and delayed-impact lifetime. Target the then-active position when impact starts. Due impacts resolve before the exchange-30 cap check. Not-yet-due impacts are discarded at the cap, without extending the battle. Preserve the named post-KO exception.

> Superseded v18 text: Once launched, persists through owner rotation/knockout while Clash ongoing. Recalculate offensive strength at impact; if owner is knocked out, use strength immediately before knockout, including for remaining hits. Targets use current defense/type/shield/evasion at their hit.

### Exceptions / counterplay

Delayed direct attack. Each hit independently respects normal evasion/decoys; one diversion cannot cancel other hits. Each damaged target may trigger eligible reactions once. No Burn/stun. No formation/grid adjacency requirement remains.

### Visuals

Meteor flies UP and out of battle view on launch. Persistent slot marker warns of impact. Meteor descends onto marked position, then fiery wave travels across opposing lineup; each hit and reaction follows authoritative order.

### Progression / notes

Main damage 150/160/170/180%; splash 50/55/60/65% to EVERY other living opponent, including reserves. Independent target defense/type calculations. No adjacency-based targeting.
