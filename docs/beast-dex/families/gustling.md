# Gustling

**Wind · Common · WR · Clash: Support**

[Position comparison](../positions/WR.md) · [Beast Dex](../README.md)

Family ID: `gustling`. Source labels are not runtime implementation proof.

**Approved build:** Straight-line deep threat.

## Gustling

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 35–45 | 60–64 | — |
| Agility | 18–28 | 38–48 | Yes |
| Strength | 15–25 | 35–45 | Yes |
| Awareness | 10–20 | 30–40 | Yes |
| Catching | 32–42 | 57–64 | — |
| Arm | 5–15 | 15–29 | — |
| Accuracy | 5–15 | 15–29 | — |
| Blocking | 10–20 | 30–40 | Yes |
| Tackling | 5–15 | 15–29 | — |
| Coverage | 15–25 | 25–39 | — |
| Durability | 24–34 | 44–54 | — |
| Kicking | 5–15 | 15–29 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Squallow

Stage 1; evolution level 10; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 40–50 | 65–69 | — |
| Agility | 23–33 | 43–53 | — |
| Strength | 20–30 | 40–50 | — |
| Awareness | 15–25 | 35–45 | Yes |
| Catching | 37–47 | 62–69 | — |
| Arm | 10–20 | 20–34 | — |
| Accuracy | 10–20 | 20–34 | — |
| Blocking | 15–25 | 35–45 | Yes |
| Tackling | 10–20 | 20–34 | — |
| Coverage | 20–30 | 30–44 | — |
| Durability | 29–39 | 49–59 | — |
| Kicking | 10–20 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Stratosoar

Stage 2; evolution level 20; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 45–55 | 70–74 | — |
| Agility | 28–38 | 48–58 | — |
| Strength | 25–35 | 45–55 | — |
| Awareness | 20–30 | 40–50 | — |
| Catching | 42–52 | 67–74 | — |
| Arm | 15–25 | 25–39 | — |
| Accuracy | 15–25 | 25–39 | — |
| Blocking | 20–30 | 40–50 | — |
| Tackling | 15–25 | 25–39 | — |
| Coverage | 25–35 | 35–49 | — |
| Durability | 34–44 | 54–64 | — |
| Kicking | 15–25 | 25–39 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Runway

Ability ID: `WIN-01-F`. Category: Zone.

Gustling; common; WR; Before BOTH play choices on next participating offensive scrimmage snap while ready. Activate regardless of later route-running or blocking assignment; never read future selected play.

Pre-choice receiver-aligned Wind speed corridor with evolution-scaled bonus

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Gustling; common; WR; Before BOTH play choices on next participating offensive scrimmage snap while ready. Activate regardless of later route-running or blocking assignment; never read future selected play.

### Targets / placement

Stationary Wind rectangle at upcoming LOS: 6 yards wide, 10 long into defense, centered on initial receiver lateral alignment. Clip to legal field; do not follow routes.

### Core resolution

Non-Wind monsters of BOTH teams gain +15 / +20 / +25% maximum movement speed by Gustling / Squallow / Stratosoar. Acceleration unchanged; entering/leaving adds/removes modifier.

### Recharge / frequency

Cooldown 6 / 5 / 4 / 3 subsequent participating offensive plays, starts creation; creating play excluded.

### Lifetime / persistence

Spawn play counts for field life. Pending readiness carries possessions/halftime; created common field clears halftime. No special-team activation.

### Exceptions / counterplay

Defenders can use runway too. Same-type immunity includes no speed bonus. No catch guarantee or altered route.

### Visuals

A pale teal gust paints parallel runway lines; readable boundary and yard marks, no head icon.

### Progression / notes

Lifetime 1 / 1 / 2 / 2 participating offensive scrimmage plays by mastery. Form changes strength only. Needs pre-choice field creation and seeded geometry snapshot; existing actor movement must aggregate max-speed modifiers.

## Beast Clash: Feather Relay

Ability ID: `WIN-01-C`. Category: Reserve rotation support.

Gustling family; Support. Once per Clash, while living/able in RESERVE, at own team normal action opportunity if current active ally below50% HP and legal rotation available. This SUPPORT ACTION replaces team attack; not another simultaneous active fighter.

Once reserve support sacrifices team attack to rotate and heal departing active ally

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Gustling family; Support. Once per Clash, while living/able in RESERVE, at own team normal action opportunity if current active ally below50% HP and legal rotation available. This SUPPORT ACTION replaces team attack; not another simultaneous active fighter.

### Targets / placement

Current injured active ally rotates with FIRST living reserve in stable lineup order. Gustling may become incoming if it is that reserve. Respect rotation locks and legal availability.

### Core resolution

Rotate, then heal DEPARTING ally8 /10 /12% of that ally maximum HP by Gustling /Squallow /Stratosoar form. Incoming receives NO normal attack that team turn. Healing Reduced/maxHP cap normal; no shield, cleanse or revive.

### Recharge / frequency

One successful legal rotation commits use even if heal prevented. Failed/blocked rotation preserves. Source Stunned prevents and preserves. No resetting on rotation/revival.

### Lifetime / persistence

Immediate rotation/heal only, no status or schedule. Team action consumed once, not a bonus reserve normal turn; normal supported status carry remains.

### Exceptions / counterplay

Cannot bypass active ally Stunned skipped turn: only replace a normal action it could legally perform. No arbitrary reserve recharge clock. KO cannot be revived and cannot be chosen as recipient.

### Visuals

Soft feather ring escorts departing fighter into reserve; green heal number, normal entry visuals on incoming. No new badge.

### Progression / notes

Heal8 /10 /12% by form, same at all mastery tiers. Once-per-Clash replaces old6/5/4/3 owner-turn cooldown. Owner selected11A. Requires reserve-origin support action, one team-action cost, rotation-first heal and incoming-action suppression. No transition to multi-active combat. Runtime ordering and balance still require tests.
