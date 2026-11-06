# Wyrmlet

**Dragon · Common · TE · Clash: Support**

[Position comparison](../positions/TE.md) · [Beast Dex](../README.md)

Family ID: `wyrmkit`. Source labels are not runtime implementation proof.

**Approved build:** Dependable all-rounder.

## Wyrmlet

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 13–23 | 33–43 | Yes |
| Agility | 13–23 | 33–43 | Yes |
| Strength | 27–37 | 52–62 | — |
| Awareness | 35–45 | 60–67 | — |
| Catching | 35–45 | 60–67 | — |
| Arm | 8–18 | 18–32 | — |
| Accuracy | 8–18 | 18–32 | — |
| Blocking | 35–45 | 60–67 | — |
| Tackling | 18–28 | 33–47 | — |
| Coverage | 13–23 | 28–42 | — |
| Durability | 30–40 | 55–65 | — |
| Kicking | 5–13 | 13–27 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Ouroborn

Stage 1; evolution level 14; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 20–30 | 40–50 | — |
| Agility | 20–30 | 40–50 | — |
| Strength | 34–44 | 59–69 | — |
| Awareness | 42–52 | 67–74 | — |
| Catching | 42–52 | 67–74 | — |
| Arm | 15–25 | 25–39 | — |
| Accuracy | 15–25 | 25–39 | — |
| Blocking | 42–52 | 67–74 | — |
| Tackling | 25–35 | 40–54 | — |
| Coverage | 20–30 | 35–49 | — |
| Durability | 37–47 | 62–72 | — |
| Kicking | 12–20 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Dragon Call

Ability ID: `DRA-02-F`. Category: Aura.

Three participating offensive scrimmage plays fill bar. At next eligible offensive snap, automatically pulse. Activation play cannot recharge.

Dragon Call / Cleanse removable harmful shared statuses, retain beneficial and explicitly unremovable statuses, then grant protection against new harmful shared statuses for rest of current play. Protection follows snapshot recipients after leaving radius.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Three participating offensive scrimmage plays fill bar. At next eligible offensive snap, automatically pulse. Activation play cannot recharge.

### Targets / placement

Snapshot everyone within initial radius, source, allies and opponents included. Wyrmlet 3 yards, Ouroborn 5 yards.

### Core resolution

Cleanse removable harmful shared statuses, retain beneficial and explicitly unremovable statuses, then grant protection against new harmful shared statuses for rest of current play. Protection follows snapshot recipients after leaving radius.

### Recharge / frequency

Full bar spent on activation. Recharge from following participating play. Partial/full bar survives possessions, halftime and overtime, clears actual game end.

### Lifetime / persistence

Immunity ends whistle. Source can activate while Stunned and cleanse its removable harmful status. No second shared-status slot is created.

### Exceptions / counterplay

Environmental zone modifiers continue. Daybreak wandering and Sovereign Arm capture still apply because they are ability-specific effects. A retained unremovable harmful status remains even while new harmful applications are prevented.

### Visuals

Golden pulse expands from dragon. Removed badges crack and disappear. Protected recipients have subtle gold outline until whistle.

### Progression / notes

Radius 3/5 by evolution, fixed charge 3 plays. No unapproved mastery scaling. Aura with snap-time pulse. Owner replaced Coil Screen and unapproved Coil Guard.

### Ability story

Wyrmlet call steadies everyone nearby, clearing harmful effects from bodies and minds. Ouroborn stronger voice carries that protection farther across the field.

## Beast Clash: Coil Renewal

Ability ID: `DRA-02-C`. Category: Signature action.

Every third performed normal-action attack with positive direct enemy HP damage triggers ally healing. Reaction attacks do not progress. Shield-only/miss does not progress.

Coil Renewal / Heal target for 25% / 35% of actual HP damage dealt by Wyrmlet / Ouroborn triggering attack. Cap at 8/10/12/14% target maximum HP by mastery. Multihit counts whole attack once and sums actual HP lost. Exclude shield absorption and overkill.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Every third performed normal-action attack with positive direct enemy HP damage triggers ally healing. Reaction attacks do not progress. Shield-only/miss does not progress.

### Targets / placement

Other injured living ally with lowest HP percentage, including reserve, never self. Stable lineup ties.

### Core resolution

Heal target for 25% / 35% of actual HP damage dealt by Wyrmlet / Ouroborn triggering attack. Cap at 8/10/12/14% target maximum HP by mastery. Multihit counts whole attack once and sums actual HP lost. Exclude shield absorption and overkill.

### Recharge / frequency

One trigger every three qualifying attacks, no extra cooldown. Trigger resets count even if no injured teammate available.

### Lifetime / persistence

Count survives rotation, pauses reserve and clears actual Clash end. Immediate healing, ordinary healing penalties and HP maximum apply.

### Exceptions / counterplay

No revive or surplus shield. Trigger attack ordinary damage. Support archetype approved for both forms.

### Visuals

Three segments fill beside icon. Triggering impact sends green-gold energy into a coil around chosen ally.

### Progression / notes

Form healing transfer 25/35%, mastery cap 8/10/12/14%. Owner all twelve A. Balanced to Support.

### Ability story

Wyrmlet gathers the energy of its strikes into a glowing coil. The third qualifying strike sends that energy to a wounded teammate. Ouroborn channels more of the impact into recovery.
