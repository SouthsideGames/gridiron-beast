# Nocturne

**Dark · Rare · QB · Clash: Disruptor**

[Position comparison](../positions/QB.md) · [Beast Dex](../README.md)

Family ID: `nocturne`. Source labels are not runtime implementation proof.

**Approved build:** Strong, elusive passer.

## Nocturne

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 44–54 | 73–85 | Yes |
| Agility | 50–60 | 80–91 | — |
| Strength | 52–62 | 82–93 | — |
| Awareness | 54–64 | 86–94 | — |
| Catching | 25–35 | 50–64 | — |
| Arm | 52–62 | 85–94 | — |
| Accuracy | 36–46 | 67–79 | Yes |
| Blocking | 25–35 | 50–64 | — |
| Tackling | 30–40 | 55–69 | — |
| Coverage | 25–35 | 50–64 | — |
| Durability | 48–58 | 77–89 | — |
| Kicking | 10–20 | 25–39 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Blackout Pocket

Ability ID: `DAR-05-F`. Category: Zone.

Nocturne; rare; QB; After own completed pass gains at least 15 net yards while ready, bank next offensive field.

DAR-05-F: Blackout Pocket; Both teams non-Dark -25% effective Awareness. Covers front pressure reads but also own blockers, no concealed essential UI.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Nocturne; rare; QB; After own completed pass gains at least 15 net yards while ready, bank next offensive field.

### Targets / placement

Next offensive pre-choice: 12-wide by 5-long Dark rectangle from LOS into defensive side, centered upcoming QB initial lateral alignment.

### Core resolution

Both teams non-Dark -25% effective Awareness. Covers front pressure reads but also own blockers, no concealed essential UI.

### Recharge / frequency

Cooldown 6 subsequent offensive plays after creation; one pending.

### Lifetime / persistence

Pending carries half; created nonlegendary clears half. No growth from YAC or full-field coverage.

### Exceptions / counterplay

No auto-completion, guaranteed escape or field-following. Formation/audible does not reposition after reveal.

### Visuals

QB spreads wings; dark rectangular canopy settles over front of pocket while player sprites stay legible.

### Progression / notes

Lifetime 1 / 2 / 2 / 3 offensive scrimmage plays including spawn. Nocturne approved WR-to-QB move needs later permanent stat profile; new next-snap offensive producer.

## Beast Clash: Eclipse Call

Ability ID: `DAR-05-C`. Category: Clash ability.

From reserve, an able Nocturne automatically attempts Eclipse Call at the first eligible start-of-round opportunity. Normal entry effects resolve before eligibility. Stunned source waits and preserves the use.

DAR-05-C: Eclipse Call; Application chance 60 / 70 / 80 / 90% by mastery. Confused has its approved separate 25% normal-attack self-side redirect chance. No damage or extra attack.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

From reserve, an able Nocturne automatically attempts Eclipse Call at the first eligible start-of-round opportunity. Normal entry effects resolve before eligibility. Stunned source waits and preserves the use.

### Targets / placement

Target the opposing single active fighter if its shared slot is empty, or it has Confused and can accept another application under the three-application cap. Otherwise wait.

### Core resolution

Application chance 60 / 70 / 80 / 90% by mastery. Confused has its approved separate 25% normal-attack self-side redirect chance. No damage or extra attack.

### Recharge / frequency

Once per Clash. An actual application roll consumes the use even when it fails. No eligible target or disabled source preserves the use. No cost to the allied active fighter normal action.

### Lifetime / persistence

Confused lasts 2 recipient normal turns. Same-status extension follows shared duration and three-application rules. Cross-mode conversion uses the existing Confused football Awareness penalty, not a new status.

### Exceptions / counterplay

No overwrite of another status. Incoming Shielded can prevent eligibility. Reserve activation gives no free normal attack and does not reset on rotation or revival.

### Visuals

A black crescent travels from the reserve source to the active opponent; show the standard Confused badge after successful application.

### Progression / notes

Application chance 60 / 70 / 80 / 90%; fixed duration 2 recipient normal turns at every mastery. Implement post-entry, pre-initiative round hook with one active fighter per side; maintain once-use and application provenance. Implementation and balance testing remain required.
