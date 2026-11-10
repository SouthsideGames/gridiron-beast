# Prismara

**Light · Uncommon · S · Clash: Disruptor**

[Position comparison](../positions/S.md) · [Beast Dex](../README.md)

Family ID: `prism`. Source labels are not runtime implementation proof.

**Approved build:** Versatile safety.

## Prismara

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 44–54 | 72–82 | — |
| Agility | 44–54 | 72–82 | — |
| Strength | 37–47 | 65–75 | — |
| Awareness | 32–42 | 60–70 | — |
| Catching | 27–37 | 50–62 | Yes |
| Arm | 10–20 | 25–39 | — |
| Accuracy | 15–25 | 30–44 | — |
| Blocking | 20–30 | 40–54 | — |
| Tackling | 45–55 | 73–83 | — |
| Coverage | 45–55 | 73–83 | — |
| Durability | 40–50 | 68–78 | — |
| Kicking | 5–15 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Prism Break

Ability ID: `LIG-04-F`. Category: Special action.

Personal tackles and pass breakups grant one charge per participating play, maximum one total per play. Three charges arm Prism Break for the next eligible defensive pre-choice opportunity. Activation play cannot recharge.

Prism Break: Remove one selected base zone entirely. For a selected hybrid overlap, remove the hybrid and contributing parent effects within that overlap footprint only; no underlying parent effect returns there. Remaining parent portions stay intact.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Personal tackles and pass breakups grant one charge per participating play, maximum one total per play. Three charges arm Prism Break for the next eligible defensive pre-choice opportunity. Activation play cannot recharge.

### Targets / placement

**Approved Task 8 rule (N9d):** N9d: at the pre-choice boundary, with the source in the initial displayed defensive personnel, select the nearest existing enemy zone by exposed-footprint nearest edge, measured from the fixed point 12 yards beyond the upcoming LOS at ball lateral. Preserve creation-order ties and exact base/overlap removal. Pending fields and fields created at that same snap cannot be removed; no target keeps the bar. Save once per snap.

> Superseded v18 text: Choose nearest existing enemy-created environmental zone anywhere on field, distance to nearest edge, creation order breaks ties. Base, legendary-created and overlap zones eligible. No target preserves full bar.

### Core resolution

Remove one selected base zone entirely. For a selected hybrid overlap, remove the hybrid and contributing parent effects within that overlap footprint only; no underlying parent effect returns there. Remaining parent portions stay intact.

### Recharge / frequency

Spend all three charges only on legal removal; repeatable after three more qualifying plays. Maximum one full bar. No extra cooldown or once-possession limit.

### Lifetime / persistence

Partial/full charge survives possessions, halftime and overtime, clears at game end. Removal persists for the removed area; future newly created zones resolve normally.

### Exceptions / counterplay

Cannot remove physical obstacles, walls, clones, auras or statuses. Unable source preserves readiness. Do not reconstitute removed parent footprints when the overlap is recomputed.

### Visuals

Floating prism fires rainbow beam; selected field fractures into fading light before play choices.

### Progression / notes

Three charges at every mastery. No additional stat modifier or arbitrary timer. No invented mastery scaling. Implement zone provenance, polygon/rectangle subtraction, overlap selection and deterministic ties. No production code changed. Geometry and shared overlap details require implementation tests.

## Beast Clash: Refraction

Ability ID: `LIG-04-C`. Category: Signature action.

Prismara; uncommon; S; Clash archetype Disruptor → Disruptor. Every third performed normal attack becomes refracted.

Primary100% normal attack, then secondary30/40/50/60% by mastery against first living reserve only if primary connects. Independent secondary evasion. Normal shields/type/reduction, shared single Confused redirect to own side target set. No ordinary-only archetype bonus.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Prismara; uncommon; S; Clash archetype Disruptor → Disruptor. Every third performed normal attack becomes refracted.

### Targets / placement

Primary current active enemy and secondary first living enemy reserve, target IDs captured on launch. No secondary without living reserve. No replacement retarget after primary KO.

### Core resolution

Primary100% normal attack, then secondary30/40/50/60% by mastery against first living reserve only if primary connects. Independent secondary evasion. Normal shields/type/reduction, shared single Confused redirect to own side target set. No ordinary-only archetype bonus.

### Recharge / frequency

Three performed attacks; count pauses reserve, no charge on Stunned skip.

### Lifetime / persistence

One action; target set captured at launch, no replacement retarget after primary KO.

### Exceptions / counterplay

Shields can absorb each independently. Confused redirects entire target set to own side with self primary. No ordinary-only archetype boosts on special hits.

### Visuals

Prism beam splits only after first impact into a thinner side ray.

### Progression / notes

Secondary30/40/50/60%, primary100%. Owner closeout1 resolves obsolete second-active target to first living reserve. Single-active Clash model retained.
