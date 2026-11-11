# Solchirp

**Light · Common · K · Clash: Support**

[Position comparison](../positions/K.md) · [Beast Dex](../README.md)

Family ID: `sunwhistle`. Source labels are not runtime implementation proof.

**Approved build:** Mobile kickoff contributor.

## Solchirp

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 36–46 | 61–67 | — |
| Agility | 28–38 | 53–63 | — |
| Strength | 8–18 | 18–32 | — |
| Awareness | 23–33 | 43–53 | — |
| Catching | 18–28 | 33–47 | — |
| Arm | 3–13 | 13–27 | — |
| Accuracy | 8–18 | 18–32 | — |
| Blocking | 8–18 | 18–32 | — |
| Tackling | 30–40 | 55–65 | — |
| Coverage | 13–23 | 28–42 | — |
| Durability | 13–23 | 33–43 | — |
| Kicking | 32–42 | 57–65 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Heliark

Stage 1; evolution level 14; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 43–53 | 68–74 | — |
| Agility | 35–45 | 60–70 | — |
| Strength | 15–25 | 25–39 | — |
| Awareness | 30–40 | 50–60 | — |
| Catching | 25–35 | 40–54 | — |
| Arm | 10–20 | 20–34 | — |
| Accuracy | 15–25 | 25–39 | — |
| Blocking | 15–25 | 25–39 | — |
| Tackling | 37–47 | 62–72 | — |
| Coverage | 20–30 | 35–49 | — |
| Durability | 20–30 | 40–50 | — |
| Kicking | 39–49 | 64–72 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Dawn Signal

Ability ID: `LIG-02-F`. Category: Targeted effect.

Solchirp; common; K; After successful extra point ONLY, bank support for own next kickoff. Field goals excluded.

Dawn Signal: Attempt Quickened +15 / +20% Speed by Solchirp / Heliark for that kickoff play only; increases max speed AND acceleration. Does not affect kick distance or returner.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Solchirp; common; K; After successful extra point ONLY, bank support for own next kickoff. Field goals excluded.

### Targets / placement

One nearest eligible non-K teammate on kickoff coverage at snap, stable lineup tie.

### Core resolution

Attempt Quickened +15 / +20% Speed by Solchirp / Heliark for that kickoff play only; increases max speed AND acceleration. Does not affect kick distance or returner.

### Recharge / frequency

No extra cooldown; max one pending, consumed on eligible kickoff cast even status blocked.

### Lifetime / persistence

Pending persists halftime if kickoff delayed. Buff clears whistle; kickoff is one play. No eligible target retains token until next own kickoff.

### Exceptions / counterplay

No guaranteed tackle/touchback; existing different status blocks; Stunned source at cast delays pending.

### Visuals

Song notes fly to coverage teammate; green boot badge if accepted.

### Progression / notes

**Approved Task 8 rule (N7b P7):** Quickened strength +0 / +3 / +6 / +9 percentage points by mastery. Kickoffs are live plays using existing movement, blocking and tackling, so the Quickened coverage teammate's speed and acceleration take real effect; actual participants and return events are credited. Punts, field goals and extra points keep their approved scope.

> Superseded v18 text: Quickened strength +0 / +3 / +6 / +9 percentage points by mastery. Special teams may lack controllable coverage actors; needs real coverage simulation, not decorative stat bonus. Flag implementation prerequisite.

## Beast Clash: Dawn Song

Ability ID: `LIG-02-C`. Category: Signature action.

Solchirp; common; K; Clash archetype Support → Support. Ready own normal action replaces attack if active front ally is injured and has empty status slot.

Dawn Song: Heal5 / 6 / 7 / 8% maxHP by mastery immediately, then same amount at end of NEXT2 owner normal turns. This is ability-linked healing schedule, not new status; empty status slot gates initial cast only.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Solchirp; common; K; Clash archetype Support → Support. Ready own normal action replaces attack if active front ally is injured and has empty status slot.

### Targets / placement

Front ally, self only if actually front.

### Core resolution

Heal5 / 6 / 7 / 8% maxHP by mastery immediately, then same amount at end of NEXT2 owner normal turns. This is ability-linked healing schedule, not new status; empty status slot gates initial cast only.

### Recharge / frequency

Cooldown 6 owner turns fixed, cast turn excluded. Cannot stack own schedules on same target; eligible only if no Dawn Song schedule there.

### Lifetime / persistence

Reserve pauses future pulses; KO/actual Clash end cancels. Healing Reduced evaluated separately at each pulse.

### Exceptions / counterplay

Different later status does not erase schedule. No cross-mode healing: discard pending pulses on football transition. No cleanse/revive.

### Visuals

Small sunrise arc on target base ring, three light notes fade with pulses; no extra head badge.

### Progression / notes

Retain separately saved healing schedule outside shared status slot, with approved empty-slot requirement at cast. Heal immediately and at next2 owner-turn endpoints. Pause in reserve, clear knockout/football/actual Clash end. Keep approved5/6/7/8% healing by mastery.
